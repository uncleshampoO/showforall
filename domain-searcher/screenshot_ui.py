import asyncio
import os
from playwright.async_api import async_playwright

async def screenshot_popup():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        
        # Устанавливаем размер окна, чтобы имитировать размер popup расширения (в css задано 780x580)
        await page.set_viewport_size({"width": 800, "height": 600})
        
        path = "file:///" + os.path.abspath("extension/popup.html").replace('\\', '/')
        await page.goto(path)
        
        # Ждем рендера
        await page.wait_for_timeout(1000)
        
        # Делаем скриншот
        output = "extension_ui_preview.png"
        await page.screenshot(path=output, full_page=True)
        print(f"Скриншот сохранен: {output}")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(screenshot_popup())
