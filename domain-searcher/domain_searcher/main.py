import sys
import asyncio

# CRITICAL: Fix for Windows asyncio NotImplementedError (needed for subprocesses/Playwright)
# This MUST happen before any non-stdlib imports and before uvicorn starts the loop.
if sys.platform == 'win32':
    try:
        # Check if policy is already Proactor, if not, set it.
        # We use a broader check to ensure we catch any uvicorn-forced loops.
        policy = asyncio.WindowsProactorEventLoopPolicy()
        asyncio.set_event_loop_policy(policy)
    except Exception:
        pass

import csv
import io
import json
import os
import random
import string
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, HTTPException
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from pydantic import BaseModel
from typing import Dict, Any, List

from core.scraper import DomainScraper, apply_stealth
from core.verifier import verify_domains
from core.logger import setup_logger
from core.models import init_db, SearchTask, DomainResult, engine, Account
from sqlmodel import Session, select

# Load environment
load_dotenv()
logger = setup_logger("main")

# Initialize database
logger.info("📦 Initializing database...")
init_db()
logger.info("✅ Database initialized.")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Re-verify and set policy on startup
    if sys.platform == 'win32':
        import asyncio
        try:
            loop = asyncio.get_running_loop()
            logger.info("🔧 Lifespan: Current loop type: %s", type(loop).__name__)
            if not isinstance(loop, asyncio.WindowsProactorEventLoopPolicy):
                 # We can't change the running loop easily, but we can verify policy
                 pass
            asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
            logger.info("🔧 Lifespan: WindowsProactorEventLoopPolicy enforced.")
        except Exception as e:
            logger.warning("🔧 Lifespan: Could not set policy or get loop: %s", e)
    yield

app = FastAPI(title="Domain Searcher", version="1.0.0", lifespan=lifespan)

# Serve static files (frontend)
STATIC_DIR = Path(__file__).resolve().parent / "static"
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# In-memory results store (per session)
_last_results: list[dict] = []


@app.get("/", response_class=HTMLResponse)
async def index():
    """Serve the main dashboard page."""
    html_path = STATIC_DIR / "index.html"
    return HTMLResponse(content=html_path.read_text(encoding="utf-8"))

# Pydantic schemas for the extension
class SessionUpload(BaseModel):
    username: str
    storage_state: Dict[str, Any]

@app.post("/api/session")
async def upload_session(data: SessionUpload):
    """Receive storage_state (Cookies) from Chrome Extension."""
    username = data.username.strip()
    if not username:
        raise HTTPException(status_code=400, detail="Username is required")
        
    storage_state = data.storage_state
    
    with Session(engine) as session:
        # Check if account exists, otherwise create it
        statement = select(Account).where(Account.username == username)
        acc = session.exec(statement).first()
        
        if not acc:
            logger.info("🆕 Creating new account for session: %s", username)
            acc = Account(username=username, password="", email="", status="active")
            session.add(acc)
            session.commit()
            session.refresh(acc)
            
        acc.storage_state = storage_state
        acc.status = "active"
        session.add(acc)
        session.commit()
    
    logger.info("✅ Session successfully uploaded for %s", username)
    return {"message": f"Session for {username} updated successfully"}

@app.websocket("/ws/search")
async def websocket_search(ws: WebSocket):
    """
    WebSocket endpoint for domain search with real-time progress.
    Client sends: {"target_count": 10, "username": "manager_1"}
    """
    global _last_results
    await ws.accept()
    logger.info("🔌 WebSocket connected")

    try:
        # Wait for search parameters
        data = await ws.receive_json()
        target_count = data.get("target_count", 10)
        username = data.get("username", "").strip()
        
        if not username:
             await ws.send_json({"type": "error", "message": "❌ Укажите ID сотрудника (username)"})
             return
             
        logger.info("🎯 Search started: target=%d domains, user=%s", target_count, username)

        # Get credentials
        ed_username = os.getenv("ED_USERNAME", "")
        ed_password = os.getenv("ED_PASSWORD", "")

        # Phase 1: Account Availability Check
        with Session(engine) as session:
            statement = select(Account).where(Account.username == username, Account.status == "active")
            user_account = session.exec(statement).first()
            
            task = SearchTask(target_count=target_count)
            session.add(task)
            session.commit()
            session.refresh(task)
            task_id = task.id

        if not user_account or not user_account.storage_state_json or user_account.storage_state_json == "{}":
            await ws.send_json({
                "type": "error", 
                "message": f"❌ Нет активной сессии для пользователя '{username}'. Пожалуйста, подключите сессию через расширение."
            })
            return

        await ws.send_json({
            "type": "status",
            "message": "🕵️ Запуск скрапера с вашей сессией...",
            "progress": 25,
            "task_id": task_id
        })

        scraper = DomainScraper(headless=True)
        # Inject the user's storage state into the scraper
        scraper.storage_state = user_account.storage_state
        scraper.proxy = os.getenv("PROXY_URL")
        
        # Register stealth callback to relay to UI
        async def stealth_callback(msg):
            try:
                await ws.send_json({"type": "status", "message": f"🕵️ {msg}"})
            except: pass
            
        scraper.on_stealth_action = lambda m: asyncio.create_task(stealth_callback(m))
        
        start_ok = await scraper.start()
        if not start_ok:
            await ws.send_json({"type": "error", "message": "❌ Критическая ошибка при запуске скрапера."})
            return

        login_ok = await scraper.login()
        if not login_ok:
            rotated = await scraper.check_ban_and_rotate()
            if not rotated:
                await ws.send_json({"type": "error", "message": "❌ Все аккаунты в пуле невалидны или забанены."})
                await scraper.close()
                return

        await ws.send_json({"type": "status", "message": "📝 Начинаем сбор доменов...", "progress": 30})

        # Phase 2: Scrape candidates with persistent logging
        scrape_target = target_count * 3
        candidates = []
        
        try:
            async for candidate in scraper.fetch_candidates(target_count=scrape_target):
                # Save candidate to DB immediately
                with Session(engine) as session:
                    db_res = DomainResult(
                        name=candidate["name"],
                        bl=candidate["bl"],
                        age_years=candidate["age_years"],
                        source_page=candidate["source_page"],
                        task_id=task_id
                    )
                    session.add(db_res)
                    session.commit()

                candidates.append(candidate)
                progress = 30 + int(len(candidates) * (40 / scrape_target))
                await ws.send_json({
                    "type": "candidate",
                    "domain": candidate,
                    "progress": min(progress, 70),
                    "message": f"📦 Собрано: {len(candidates)}/{scrape_target}",
                })
        except Exception as e:
            logger.error("❌ Scrape phase failed: %s", e)
            await ws.send_json({"type": "status", "message": f"⚠️ Скрапинг прерван: {str(e)}. Проверяем то, что успели найти..."})

        await scraper.close()

        if not candidates:
            await ws.send_json({"type": "error", "message": "❌ Кандидаты не найдены. Возможно, аккаунты забанены или капча."})
            return

        # Phase 3: Verify
        await ws.send_json({"type": "status", "message": "🔎 Проверка доступности...", "progress": 70})

        async def on_verify_progress(domain_dict, current, total):
            # Update DB status
            with Session(engine) as session:
                from sqlmodel import select
                statement = select(DomainResult).where(
                    DomainResult.name == domain_dict["name"], 
                    DomainResult.task_id == task_id
                )
                res = session.exec(statement).first()
                if res:
                    res.status = domain_dict["status"]
                    session.add(res)
                    session.commit()

            progress = 70 + int((current / total) * 25)
            await ws.send_json({
                "type": "result" if domain_dict["status"] == "available" else "status",
                "domain": domain_dict,
                "progress": min(progress, 99),
            })

        verified = await verify_domains(candidates, on_progress=on_verify_progress)
        
        # Finish Task
        with Session(engine) as session:
            db_task = session.get(SearchTask, task_id)
            if db_task:
                db_task.status = "completed"
                db_task.found_count = len([d for d in verified if d["status"] == "available"])
                session.add(db_task)
                session.commit()

        await ws.send_json({
            "type": "done",
            "message": "✅ Поиск завершен. История сохранена.",
            "progress": 100
        })

        logger.info("🏁 Search complete. %d domains delivered.", len(verified))

    except WebSocketDisconnect:
        logger.info("🔌 WebSocket disconnected")
    except Exception as e:
        error_type = type(e).__name__
        error_msg = str(e) or error_type
        logger.error("💥 Search error (%s): %s", error_type, error_msg, exc_info=True)
        try:
            await ws.send_json({"type": "error", "message": f"💥 {error_type}: {error_msg}"})
        except Exception:
            pass


@app.get("/api/history")
async def get_history(limit: int = 50):
    """Get recent search history from DB."""
    with Session(engine) as session:
        statement = select(DomainResult).order_by(DomainResult.found_at.desc()).limit(limit)
        results = session.exec(statement).all()
        return results

@app.get("/api/tasks")
async def get_tasks():
    """Get recent search tasks."""
    with Session(engine) as session:
        statement = select(SearchTask).order_by(SearchTask.created_at.desc()).limit(10)
        tasks = session.exec(statement).all()
        return tasks

@app.get("/export/csv")
async def export_csv():
    """Export last search results as CSV file."""
    if not _last_results:
        return HTMLResponse("<p>Нет данных для экспорта. Сначала запустите поиск.</p>", status_code=404)

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=["name", "bl", "age_years", "status"])
    writer.writeheader()
    for domain in _last_results:
        writer.writerow({
            "name": domain["name"],
            "bl": domain["bl"],
            "age_years": domain["age_years"],
            "status": domain["status"],
        })

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=domains.csv"},
    )


if __name__ == "__main__":
    import uvicorn
    
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8000"))
    
    logger.info("🚀 Starting Domain Searcher on %s:%d", host, port)
    
    # Reloading on Windows + Python 3.14 + Proactor can be unstable.
    # If it hangs, manual restart is recommended.    # CRITICAL: reload=True on Windows can force SelectorEventLoop. 
    # For stability with Playwright, we use reload=False and loop="asyncio".
    uvicorn.run(app, host=host, port=port, reload=False, loop="asyncio")
