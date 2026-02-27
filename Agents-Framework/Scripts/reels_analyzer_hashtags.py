
import os
import sys
import json
import csv
import time
import argparse
import subprocess
import tempfile
import pickle
import gspread
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
from apify_client import ApifyClient
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from typing import Optional

# =========================================================================
# CONFIGURATION
# =========================================================================

load_dotenv("Credentials.env")

# API Keys
APIFY_TOKEN = os.getenv("APIFY_API_TOKEN")
APIFY_TOKEN_BACKUP = os.getenv("APIFY_API_TOKEN_BACKUP")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Paths
BASE_DIR = Path(__file__).parent.parent
EXECUTIONS_DIR = BASE_DIR / "Executions"
EXECUTIONS_DIR.mkdir(exist_ok=True)

# Google Creds (OAuth)
GOOGLE_CREDS_FILE = BASE_DIR / "google_credentials.json"
GOOGLE_TOKEN_FILE = BASE_DIR / "google_token.pickle"
GOOGLE_SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive'
]

# Tool Paths
WHISPER_PATH = "whisper" # Assumes in path or handled by verification
YTDLP_PATH = BASE_DIR / "venv" / "bin" / "yt-dlp"

# =========================================================================
# UTILS
# =========================================================================

def get_apify_client():
    """Get Apify client, trying backup token if main fails."""
    for token in [APIFY_TOKEN, APIFY_TOKEN_BACKUP]:
        if token:
            try:
                client = ApifyClient(token)
                client.user().get() # Test
                return client
            except Exception:
                continue
    return ApifyClient(APIFY_TOKEN or APIFY_TOKEN_BACKUP)

def get_google_creds(email: str = None):
    """Get Google OAuth credentials."""
    creds = None
    
    # Load existing token
    if os.path.exists(GOOGLE_TOKEN_FILE):
        with open(GOOGLE_TOKEN_FILE, 'rb') as token:
            try:
                creds = pickle.load(token)
            except Exception:
                pass
    
    # Refresh or create new
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
            except Exception:
                creds = None
        
        if not creds:
            if not os.path.exists(GOOGLE_CREDS_FILE):
                print(f"❌ '{GOOGLE_CREDS_FILE}' not found!")
                return None
            
            print("\n🔐 Google OAuth: Opening browser for authorization...")
            print("   Please authorize the app in your browser.\n")
            
            flow = InstalledAppFlow.from_client_secrets_file(
                str(GOOGLE_CREDS_FILE), 
                GOOGLE_SCOPES
            )
            creds = flow.run_local_server(port=8080)
        
        # Save credentials
        with open(GOOGLE_TOKEN_FILE, 'wb') as token:
            pickle.dump(creds, token)
        print("   ✅ Google authorization successful!")
    
    return creds


class ReelsHashtagAnalyzer:
    """Reels analysis by hashtags/keywords with MANDATORY transcription."""
    
    def __init__(
        self,
        hashtags: list[str],
        results_limit: int = 100,
        whisper_model: str = "base",
        skip_transcription: bool = False
    ):
        self.hashtags = hashtags
        self.results_limit = results_limit
        self.whisper_model = whisper_model
        self.skip_transcription = skip_transcription
        
        self.reels_data = []
        self.spreadsheet_url = None
        self.report_path = None
        self.transcription_count = 0
        
        # Initialize clients
        self.apify_client = get_apify_client()
        self.sheets_client = self._init_google_sheets()
        
        # Verify critical tools
        self._verify_tools()
        
        # Incremental save state
        self.sheet1 = None
    
    def _verify_tools(self):
        """Verify all required tools are available."""
        print("\n🔧 Verifying required tools...")
        
        # Check yt-dlp
        ytdlp_found = False
        for path in [str(YTDLP_PATH), "yt-dlp", "/opt/homebrew/bin/yt-dlp"]:
            try:
                result = subprocess.run([path, "--version"], capture_output=True, timeout=5)
                if result.returncode == 0:
                    self.ytdlp_cmd = path
                    ytdlp_found = True
                    print(f"   ✅ yt-dlp: {path}")
                    break
            except:
                continue
        
        if not ytdlp_found:
            print("   ❌ yt-dlp NOT FOUND!")
            print("      Installing yt-dlp...")
            subprocess.run([sys.executable, "-m", "pip", "install", "yt-dlp"], 
                         capture_output=True)
            self.ytdlp_cmd = "yt-dlp"
        
        # Check Whisper
        whisper_found = False
        for path in [WHISPER_PATH, "whisper", "/opt/homebrew/bin/whisper", "/usr/local/bin/whisper"]:
            try:
                result = subprocess.run([path, "--help"], capture_output=True, timeout=5)
                if result.returncode == 0:
                    self.whisper_cmd = path
                    whisper_found = True
                    print(f"   ✅ Whisper: {path}")
                    break
            except:
                continue
        
        if not whisper_found:
            print("   ⚠️ Whisper NOT FOUND!")
            print("      Transcription will be skipped.")
            self.whisper_cmd = None
    
    def _init_google_sheets(self) -> Optional[gspread.Client]:
        """Initialize Google Sheets client via OAuth."""
        try:
            creds = get_google_creds()
            if creds:
                return gspread.authorize(creds)
        except Exception as e:
            print(f"⚠️ Google Sheets init failed: {e}")
            print("   Will save results to CSV instead")
        return None
    
    # =========================================================================
    # STAGE 1: Search Reels by Hashtags via Apify
    # =========================================================================
    
    def stage1_search_reels(self) -> list[dict]:
        """Search reels by hashtags using Apify Instagram Hashtag Scraper."""
        print("\n" + "="*70)
        print("📡 STAGE 1: PARSING REELS VIA APIFY")
        print("="*70)
        print(f"   Hashtags: {', '.join(self.hashtags)}")
        print(f"   Limit: {self.results_limit} reels")
        
        all_reels = []
        
        run_input = {
            "hashtags": self.hashtags,
            "resultsLimit": self.results_limit,
            "resultsType": "reels",
            "searchType": "hashtag",
            # Add random parameter to avoid stale cache with broken links
            "customMapFunction": f"// Run timestamp: {time.time()}" 
        }
        
        try:
            print("   → Starting Apify actor...")
            
            run = self.apify_client.actor("apify/instagram-hashtag-scraper").call(
                run_input=run_input,
                timeout_secs=900,
                memory_mbytes=4096 # Force fresh run usually
            )
            
            items = list(self.apify_client.dataset(run["defaultDatasetId"]).iterate_items())
            print(f"   → Retrieved {len(items)} items from Apify")
            
            for item in items:
                # Basic validation
                if not item.get("videoUrl") and not item.get("video_url"):
                    continue
                    
                reel = {
                    "reel_url": item.get("url", "") or item.get("shortCode", ""),
                    "username": item.get("ownerUsername", "") or item.get("owner", {}).get("username", ""),
                    "caption": (item.get("caption", "") or "")[:500],
                    "views": item.get("videoViewCount", 0) or item.get("playCount", 0) or item.get("videoPlayCount", 0),
                    "likes": item.get("likesCount", 0) or item.get("likeCount", 0),
                    "comments": item.get("commentsCount", 0) or item.get("commentCount", 0),
                    "duration": item.get("videoDuration", 0) or 0,
                    "hashtags": ", ".join(item.get("hashtags", []) if isinstance(item.get("hashtags"), list) else []),
                    "timestamp": item.get("timestamp", "") or item.get("takenAtTimestamp", ""),
                    "video_url": item.get("videoUrl", "") or item.get("video_url", ""),
                    "transcription": "",
                    "hook": ""
                }
                
                # Filter useful content
                if reel["views"] > 0 or reel["video_url"]:
                    all_reels.append(reel)
            
            print(f"   ✅ Filtered to {len(all_reels)} reels with video content")
            self.reels_data = all_reels
            return all_reels
            
        except Exception as e:
            print(f"   ❌ Apify error: {e}")
            return []

    # =========================================================================
    # STAGE 2: Transcribe via Whisper (ОБЯЗАТЕЛЬНО!) & INCREMENTAL SAVE
    # =========================================================================
    
    def stage2_transcribe(self) -> None:
        """
        ⚠️ ОБЯЗАТЕЛЬНАЯ ТРАНСКРИБАЦИЯ + МГНОВЕННОЕ СОХРАНЕНИЕ!
        Download -> Transcribe -> Save to Sheet immediately.
        """
        print("\n" + "="*70)
        print("🎙️ STAGE 2: ТРАНСКРИБАЦИЯ + СОХРАНЕНИЕ В ТАБЛИЦУ")
        print("="*70)
        
        # 1. Подготовка таблицы
        self._prepare_sheet_for_incremental_save()
        
        if self.skip_transcription:
            print("   ⚠️ WARNING: Transcription skipped by user flag!")
            return
        
        if not self.whisper_cmd:
            print("   ❌ CRITICAL: Whisper not available!")
            return
        
        print(f"   Model: {self.whisper_model}")
        print(f"   Total reels to process: {len(self.reels_data)}")
        if self.spreadsheet_url:
            print(f"   💾 Saving to: {self.spreadsheet_url}")
        else:
            print(f"   💾 Saving to: CSV (fallback)")
        print()
        
        total = len(self.reels_data)
        success_count = 0
        failed_count = 0
        
        for i, reel in enumerate(self.reels_data):
            video_url = reel.get("video_url")
            if not video_url:
                continue
            
            progress = f"[{i+1}/{total}]"
            username = reel['username'][:12].ljust(12)
            print(f"   {progress} @{username} ", end="", flush=True)
            
            try:
                # Create temp file
                with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
                    tmp_path = tmp.name
                
                # Download video
                download_success = self._download_video(video_url, tmp_path)
                
                if download_success and os.path.exists(tmp_path) and os.path.getsize(tmp_path) > 1000:
                    # Transcribe
                    transcription = self._transcribe_video(tmp_path)
                    
                    if transcription:
                        reel["transcription"] = transcription
                        reel["hook"] = transcription[:100].split(".")[0]
                        success_count += 1
                        print(f"✅ ({len(transcription)} chars)", end=" ")
                    else:
                        print(f"⚠️ Empty", end=" ")
                        failed_count += 1
                else:
                    print(f"❌ Download failed", end=" ")
                    failed_count += 1
                
                # Cleanup
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)

            except Exception as e:
                print(f"❌ Error: {str(e)[:20]}", end=" ")
                failed_count += 1
                
            # --- ВАЖНО: СОХРАНЯЕМ СТРОКУ СРАЗУ ---
            self._save_row_to_sheet(i, reel)
            print("💾 Saved")
        
        self.transcription_count = success_count
        
        print()
        print(f"   📊 РЕЗУЛЬТАТ ТРАНСКРИБАЦИИ:")
        print(f"      ✅ Успешно: {success_count}/{total}")
        print(f"      ❌ Ошибки: {failed_count}/{total}")
    
    def _prepare_sheet_for_incremental_save(self):
        """Create/Upload headers to sheet before processing."""
        if not self.sheets_client:
            return
            
        try:
            title = f"AI Reels Analysis {datetime.now().strftime('%Y-%m-%d %H:%M')}"
            print(f"   Creating spreadsheet: {title}")
            
            spreadsheet = self.sheets_client.create(title)
            spreadsheet.share('', perm_type='anyone', role='reader')
            
            self.sheet1 = spreadsheet.sheet1
            self.sheet1.update_title("Raw Data")
            
            headers = [
                "Reel URL", "Username", "Caption", "Views", "Likes", 
                "Comments", "Duration", "Hashtags", "Timestamp", 
                "Video URL", "Transcription", "Hook"
            ]
            self.sheet1.update(range_name="A1", values=[headers])
            
            self.spreadsheet_url = spreadsheet.url
            print(f"   🔗 LINK: {spreadsheet.url}")
            
        except Exception as e:
            print(f"   ❌ Sheet init error: {e}")
            self.sheet1 = None

    def _save_row_to_sheet(self, index: int, reel: dict):
        """Append/Update a single row in the sheet."""
        if not hasattr(self, 'sheet1') or not self.sheet1:
            return
            
        try:
            row_num = index + 2  # 1-based + 1 for header
            row_data = [
                reel["reel_url"],
                reel["username"],
                reel["caption"][:200],
                reel["views"],
                reel["likes"],
                reel["comments"],
                reel["duration"],
                reel["hashtags"][:100],
                str(reel["timestamp"])[:20],
                reel["video_url"],
                reel.get("transcription", "")[:5000], # Max limit
                reel.get("hook", "")[:200]
            ]
            # Пишем конкретную строку
            self.sheet1.update(range_name=f"A{row_num}", values=[row_data])
        except Exception:
            pass
    
    def _download_video(self, url: str, output_path: str) -> bool:
        """Video download with requests and fallback."""
        try:
            import requests
            
            headers = {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                "Accept": "video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5",
                "Referer": "https://www.instagram.com/",
                "Origin": "https://www.instagram.com",
            }
            
            # 1. Requests
            try:
                response = requests.get(url, headers=headers, timeout=60, stream=True)
                if response.status_code == 200:
                    with open(output_path, 'wb') as f:
                        for chunk in response.iter_content(chunk_size=8192):
                            f.write(chunk)
                    if os.path.exists(output_path) and os.path.getsize(output_path) > 1000:
                        return True
                else:
                    print(f"[HTTP {response.status_code}]", end=" ")
            except Exception as e:
                print(f"[ReqErr: {str(e)[:10]}]", end=" ")
            
            # 2. Curl
            curl_cmd = [
                "curl", "-sL",
                "-H", "User-Agent: Mozilla/5.0",
                "-o", output_path,
                url
            ]
            subprocess.run(curl_cmd, capture_output=True, timeout=60)
            
            if os.path.exists(output_path) and os.path.getsize(output_path) > 1000:
                return True
            
            return False
            
        except Exception:
            return False
    
    def _transcribe_video(self, video_path: str) -> str:
        """Transcribe video using Whisper."""
        try:
            with tempfile.TemporaryDirectory() as tmp_dir:
                cmd = [
                    self.whisper_cmd,
                    video_path,
                    "--model", self.whisper_model,
                    "--output_format", "txt",
                    "--output_dir", tmp_dir,
                    "--task", "transcribe"
                ]
                
                subprocess.run(cmd, capture_output=True, timeout=180)
                
                txt_file = Path(tmp_dir) / (Path(video_path).stem + ".txt")
                if txt_file.exists():
                    return txt_file.read_text().strip()
        except Exception:
            pass
        return ""
    
    # =========================================================================
    # STAGE 3: Finalize (Ranking tab)
    # =========================================================================
    
    def stage3_export_to_sheets(self) -> str:
        """Add ranking tab."""
        print("\n" + "="*70)
        print("📊 STAGE 3: FINALIZE SHEETS (Ranking)")
        print("="*70)
        
        if not self.sheets_client or not self.spreadsheet_url:
            return self._export_to_csv()
        
        try:
            spreadsheet = self.sheets_client.open_by_url(self.spreadsheet_url)
            try:
                sheet2 = spreadsheet.add_worksheet(title="Ranking", rows=200, cols=10)
            except:
                sheet2 = spreadsheet.worksheet("Ranking")
                
            ranking_data = self._create_ranking_sheet()
            sheet2.update(range_name="A1", values=ranking_data)
            
            print(f"   ✅ Ranking tab added!")
            return self.spreadsheet_url
        except Exception as e:
            print(f"   ❌ Final sheet update error: {e}")
            return self._export_to_csv()
            
    def _export_to_csv(self) -> str:
        """Fallback export."""
        filename = f"reels_data_{datetime.now().strftime('%Y%m%d_%H%M')}.csv"
        path = EXECUTIONS_DIR / filename
        
        try:
            with open(path, 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=self.reels_data[0].keys())
                writer.writeheader()
                writer.writerows(self.reels_data)
            print(f"   📁 Saved to CSV: {path}")
            return str(path)
        except Exception as e:
            print(f"   ❌ CSV export failed: {e}")
            return ""

    # =========================================================================
    # STAGE 4: Pattern Analysis
    # =========================================================================
    
    def stage4_analyze_patterns(self) -> dict:
        """Analyze content patterns."""
        print("\n" + "="*70)
        print("🔍 STAGE 4: PATTERN ANALYSIS")
        print("="*70)
        
        if not self.reels_data:
            return {}
            
        # Sort by views
        sorted_reels = sorted(self.reels_data, key=lambda x: x['views'], reverse=True)
        top_10 = sorted_reels[:10]
        bottom_10 = sorted_reels[-10:]
        
        avg_views = sum(r['views'] for r in self.reels_data) / len(self.reels_data)
        
        print(f"   ✅ Analysis complete")
        print(f"   📈 Top performer: {top_10[0]['views']:,} views")
        print(f"   📉 Bottom performer: {bottom_10[-1]['views']:,} views")
        print(f"   📊 Average: {int(avg_views):,} views")
        print(f"   🎙️ Transcribed: {self.transcription_count}/{len(self.reels_data)}")
        
        return {
            "top_10": top_10,
            "bottom_10": bottom_10,
            "avg_views": avg_views,
            "transcription_count": self.transcription_count
        }

    def _create_ranking_sheet(self) -> list:
        """Create ranking data for sheet."""
        sorted_reels = sorted(self.reels_data, key=lambda x: x['views'], reverse=True)
        
        data = [["Rank", "Username", "Views", "Likes", "Hook", "Link"]]
        for i, reel in enumerate(sorted_reels[:50]):
            data.append([
                i+1,
                reel["username"],
                reel["views"],
                reel["likes"],
                reel.get("hook", ""),
                reel["reel_url"]
            ])
        return data

    def stage5_generate_report(self, analysis: dict) -> str:
        """Generate Markdown report (Russian)."""
        print("\n" + "="*70)
        print("📝 STAGE 5: ГЕНЕРАЦИЯ ОТЧЕТА")
        print("="*70)
        
        filename = f"{datetime.now().strftime('%Y-%m-%d')}_reels_analysis_{'_'.join(self.hashtags[:3])}_RU.md"
        path = EXECUTIONS_DIR / filename
        
        content = f"""# 🎬 Анализ Reels: {', '.join(self.hashtags)}
**Дата:** {datetime.now().strftime('%Y-%m-%d %H:%M')}
**Всего видео:** {len(self.reels_data)}
**Транскрибировано:** {self.transcription_count}

## 📊 Общая статистика
- **Средние просмотры:** {int(analysis.get('avg_views', 0)):,}
- **Топ-1:** {analysis.get('top_10', [{}])[0].get('views', 0):,}
- **Аутсайдер:** {analysis.get('bottom_10', [{}])[-1].get('views', 0):,}

## 🏆 Топ-5 Успешных Хуков
"""
        for i, reel in enumerate(analysis.get('top_10', [])[:5]):
            hook = reel.get('hook') or "Нет хука"
            content += f"{i+1}. **{hook}**\n"
            content += f"   - Просмотры: {reel['views']:,}\n"
            content += f"   - Ссылка: {reel['reel_url']}\n\n"
            
        content += """
## 💡 Рекомендации
1. **Хуки:** Используйте структуры из топа выше (прямое обращение, вопрос "А что если", обещание результата).
2. **Тренды:** Обратите внимание на хэштеги лидеров.
3. **Длительность:** Проверьте длительность топовых видео.

## 🔗 Данные
"""
        if self.spreadsheet_url:
            content += f"[Google Таблица]({self.spreadsheet_url})"
        else:
            content += "Данные сохранены в CSV."
            
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
            
        print(f"   ✅ Отчет сохранен: {path}")
        return str(path)
    
    def run_full_pipeline(self) -> dict:
        """Run complete analysis pipeline."""
        print("\n" + "="*70)
        print("🎬 REELS HASHTAG ANALYZER v3")
        print("   AI/Automation Content (US Market)")
        print("="*70)
        
        # Stage 1: Search
        self.stage1_search_reels()
        
        if not self.reels_data:
            print("\n❌ No reels found. Aborting.")
            return {"success": False, "error": "No reels found"}
        
        # Stage 2: Transcribe (MANDATORY!)
        self.stage2_transcribe()
        
        # Stage 3: Export to Sheets
        self.stage3_export_to_sheets()
        
        # Stage 4: Analyze
        analysis = self.stage4_analyze_patterns()
        
        # Stage 5: Generate Report
        report_path = self.stage5_generate_report(analysis)
        
        print("\n" + "="*70)
        print("✅ PIPELINE COMPLETE")
        print("="*70)
        print(f"\n📊 Google Sheets: {self.spreadsheet_url or 'CSV exported'}")
        print(f"📝 Report: {report_path}")
        print(f"🎙️ Transcribed: {self.transcription_count}/{len(self.reels_data)}")
        print("\n⏳ Ожидаю ваш выбор направления для сценария...")
        
        return {
            "success": True,
            "reels_count": len(self.reels_data),
            "transcribed_count": self.transcription_count,
            "spreadsheet_url": self.spreadsheet_url,
            "report_path": report_path,
            "analysis": analysis
        }


def main():
    parser = argparse.ArgumentParser(description="Instagram Reels Hashtag Analyzer v3")
    parser.add_argument("--hashtags", "-t", required=True, help="Comma-separated hashtags (without #)")
    parser.add_argument("--limit", "-l", type=int, default=100, help="Max reels to fetch (default: 100)")
    parser.add_argument("--whisper-model", "-w", default="base", choices=["tiny", "base", "small", "medium", "large"], help="Whisper model size (default: base)")
    parser.add_argument("--skip-transcription", action="store_true", help="Skip Whisper transcription")
    
    args = parser.parse_args()
    hashtags = [h.strip().replace("#", "") for h in args.hashtags.split(",")]
    
    analyzer = ReelsHashtagAnalyzer(
        hashtags=hashtags,
        results_limit=args.limit,
        whisper_model=args.whisper_model,
        skip_transcription=args.skip_transcription
    )
    
    result = analyzer.run_full_pipeline()
    
    if result["success"]:
        print("\n✅ Done! Check the report and Google Sheets.")
    else:
        print(f"\n❌ Failed: {result.get('error', 'Unknown error')}")
        sys.exit(1)


if __name__ == "__main__":
    main()
