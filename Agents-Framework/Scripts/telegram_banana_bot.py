import os
import logging
import base64
import asyncio
import re
from io import BytesIO
from dotenv import load_dotenv
from telegram import Update
from telegram.ext import ApplicationBuilder, ContextTypes, CommandHandler, MessageHandler, filters
from openai import AsyncOpenAI

# 1. Setup Logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# 2. Load Credentials
load_dotenv('Credentials.env')
TELEGRAM_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY')
TARGET_MODEL = "google/gemini-2.0-pro-exp-02-05:free"
# User preference override:
TARGET_MODEL = "google/gemini-3-pro-image-preview"

if not TELEGRAM_TOKEN or not OPENROUTER_API_KEY:
    logger.error("Error: TELEGRAM_BOT_TOKEN or OPENROUTER_API_KEY not found in Credentials.env")
    exit(1)

# 3. Setup OpenRouter Client (Async)
client = AsyncOpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=OPENROUTER_API_KEY,
)

# 4. In-Memory State Storage (Note: Reset on restart)
# Structure: { user_id: { "state": "WAITING_PROMPT", "image_data": bytes } }
user_sessions = {}

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "🍌 Привет! Я Nano Banana Editor.\n\n"
        "1. Отправь мне картинку.\n"
        "2. Я спрошу, что изменить.\n"
        "3. Напиши запрос, и я это сделаю!"
    )

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("Сначала пришли фото, потом напиши, что изменить.")

def encode_image(image_bytes):
    return base64.b64encode(image_bytes).decode('utf-8')

import json
import httpx

async def process_edit(image_bytes, edit_instruction):
    try:
        base64_image = encode_image(image_bytes)
        
        prompt = (f"Edit this image according to the following instruction: {edit_instruction}.")
        
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "HTTP-Referer": "https://github.com/AntigravityAgent",
            "X-Title": "BananaBot",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": TARGET_MODEL,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            "modalities": ["text", "image"],
        }

        async with httpx.AsyncClient() as http_client:
            response = await http_client.post(url, headers=headers, json=payload, timeout=60.0)
            
        response_data = response.json()
        
        # Save detailed debug
        with open("debug_response.json", "w") as f:
            json.dump(response_data, f, indent=2, ensure_ascii=False)
            
        logger.info(f"DEBUG: Status {response.status_code}")
        
        if response.status_code != 200:
            return {"type": "text", "content": f"Banana Fail! API returned error {response.status_code}: {response.text}"}

        choices = response_data.get("choices", [])
        if not choices:
            return {"type": "text", "content": "Empty choices in response."}
            
        message = choices[0].get("message", {})
        content = message.get("content", "")
        
        # Check for 'images' field (Gemini via OpenRouter)
        images = message.get("images", [])
        image_url = None
        
        if images:
            # Structure observed: [{'type': 'image_url', 'image_url': {'url': 'data:...'}}]
            first_image = images[0]
            if isinstance(first_image, dict):
                if "image_url" in first_image and "url" in first_image["image_url"]:
                    image_url = first_image["image_url"]["url"]
                elif "url" in first_image:
                    image_url = first_image["url"]
            elif isinstance(first_image, str):
                image_url = first_image

        # If data URI, decode and return bytes
        if image_url and image_url.startswith("data:"):
            try:
                # Extract base64 part
                header, encoded = image_url.split(",", 1)
                image_data = base64.b64decode(encoded)
                return {"type": "image", "data": image_data}
            except Exception as e:
                logger.error(f"Failed to decode base64 image: {e}")
                return {"type": "text", "content": "Failed to decode image from model response."}
        elif image_url:
             return {"type": "text", "content": f"![Edited Image]({image_url})"} # Markdown link if http url

        # If content has text (and no inputs found above), return text
        if content:
            return {"type": "text", "content": content}
            
        return {"type": "text", "content": "Модель вернула 200 OK, но ни текста, ни картинок не найдено."}

    except Exception as e:
        logger.error(f"API Request Error: {e}")
        return {"type": "text", "content": f"🍌 Упс! Ошибка запроса: {str(e)}"}

async def handle_photo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    logger.info(f"Received photo from {user_id}")
    
    # Clean up previous session if exists
    user_sessions[user_id] = {}

    try:
        # Download photo
        photo_file = await update.message.photo[-1].get_file()
        image_buffer = BytesIO()
        await photo_file.download_to_memory(out=image_buffer)
        image_data = image_buffer.getvalue()

        # Save to session
        user_sessions[user_id] = {
            "state": "WAITING_PROMPT",
            "image_data": image_data
        }
        
        await update.message.reply_text(
            "🍌 Картинка получена! Что нужно изменить/отредактировать?\n"
            "Напиши свой запрос в чат."
        )
        
    except Exception as e:
        logger.error(f"Error downloading photo: {e}")
        await update.message.reply_text("❌ Не удалось скачать фото. Попробуй еще раз.")

async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    text = update.message.text
    
    session = user_sessions.get(user_id)
    
    if not session or session.get("state") != "WAITING_PROMPT":
        if text.startswith("/"): return
        await update.message.reply_text("Сначала отправь мне картинку! 🍌")
        return

    await update.message.reply_text(f"🍌 Понял: \"{text}\". Начинаю магию...")
    
    try:
        image_data = session.get("image_data")
        result = await process_edit(image_data, text)
        
        if result["type"] == "image":
            # Send photo from bytes
            await update.message.reply_photo(photo=result["data"], caption="🍌 Готово!")
        else:
            # Text response (or url link fallback)
            result_content = result["content"]
            # Check for markdown url just in case
            markdown_url_match = re.search(r'!\[.*\]\((.*?)\)', result_content)
            if markdown_url_match:
                 await update.message.reply_photo(markdown_url_match.group(1), caption="🍌 Готово!")
            else:
                 await update.message.reply_text(f"🍌 Ответ модели:\n\n{result_content}")
            
    except Exception as e:
        logger.error(f"Error processing edit: {e}")
        await update.message.reply_text(f"❌ Произошла ошибка: {e}")
    finally:
        if user_id in user_sessions:
            del user_sessions[user_id]

def main():
    application = ApplicationBuilder().token(TELEGRAM_TOKEN).build()

    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(MessageHandler(filters.PHOTO, handle_photo))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text))

    print("🍌 Banana Editor Bot is running locally...")
    application.run_polling()

if __name__ == '__main__':
    main()
