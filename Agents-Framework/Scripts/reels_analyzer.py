#!/usr/bin/env python3
"""
Reels Analyzer — Full pipeline for Instagram Reels analysis
Part of DO Framework: /Scripts/reels_analyzer.py

Pipeline:
1. Parse reels via Apify
2. Download videos & transcribe via Whisper
3. Export to Google Sheets
4. Rank by views
5. Analyze patterns
6. Generate report
"""

import os
import sys
import json
import argparse
import subprocess
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Optional

# Third-party imports
try:
    from apify_client import ApifyClient
    import gspread
    from google.oauth2.service_account import Credentials
except ImportError as e:
    print(f"Missing dependency: {e}")
    print("Run: pip install apify-client gspread google-auth yt-dlp")
    sys.exit(1)

# Load environment variables
from dotenv import load_dotenv

# Constants
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
EXECUTIONS_DIR = PROJECT_ROOT / "Executions"
CREDENTIALS_FILE = PROJECT_ROOT / "Credentials.env"
GOOGLE_CREDS_FILE = PROJECT_ROOT / "google_credentials.json"

# Load credentials
load_dotenv(CREDENTIALS_FILE)

APIFY_TOKEN = os.getenv("APIFY_API_TOKEN")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")


class ReelsAnalyzer:
    """Main class for Reels analysis pipeline."""
    
    def __init__(
        self,
        usernames: list[str],
        results_limit: int = 20,
        share_email: str = None,
        whisper_model: str = "base",
        analyze_with_gpt: bool = True
    ):
        self.usernames = usernames
        self.results_limit = results_limit
        self.share_email = share_email
        self.whisper_model = whisper_model
        self.analyze_with_gpt = analyze_with_gpt
        
        self.reels_data = []
        self.spreadsheet_url = None
        self.report_path = None
        
        # Initialize clients
        self.apify_client = ApifyClient(APIFY_TOKEN)
        self.sheets_client = self._init_google_sheets()
    
    def _init_google_sheets(self) -> Optional[gspread.Client]:
        """Initialize Google Sheets client."""
        try:
            scopes = [
                "https://www.googleapis.com/auth/spreadsheets",
                "https://www.googleapis.com/auth/drive"
            ]
            creds = Credentials.from_service_account_file(
                GOOGLE_CREDS_FILE, 
                scopes=scopes
            )
            return gspread.authorize(creds)
        except Exception as e:
            print(f"⚠️ Google Sheets init failed: {e}")
            return None
    
    # =========================================================================
    # STAGE 1: Parse Reels via Apify
    # =========================================================================
    
    def stage1_parse_reels(self) -> list[dict]:
        """Fetch reels data from Instagram via Apify."""
        print("\n📡 STAGE 1: Parsing Instagram Reels via Apify...")
        
        all_reels = []
        
        for username in self.usernames:
            print(f"  → Parsing @{username}...")
            
            run_input = {
                "username": [username],
                "resultsLimit": self.results_limit
            }
            
            try:
                run = self.apify_client.actor("apify/instagram-reel-scraper").call(
                    run_input=run_input,
                    timeout_secs=300
                )
                
                # Fetch results
                items = list(self.apify_client.dataset(run["defaultDatasetId"]).iterate_items())
                
                for item in items:
                    reel = {
                        "reel_url": item.get("url", ""),
                        "username": item.get("ownerUsername", username),
                        "caption": item.get("caption", "")[:500],  # Limit length
                        "views": item.get("videoViewCount", 0) or item.get("playCount", 0),
                        "likes": item.get("likesCount", 0),
                        "comments": item.get("commentsCount", 0),
                        "duration": item.get("videoDuration", 0),
                        "hashtags": ", ".join(item.get("hashtags", [])),
                        "timestamp": item.get("timestamp", ""),
                        "video_url": item.get("videoUrl", ""),
                        "transcription": "",  # Will be filled in Stage 2
                        "hook": ""  # First words
                    }
                    all_reels.append(reel)
                
                print(f"    ✅ Found {len(items)} reels")
                
            except Exception as e:
                print(f"    ❌ Error parsing @{username}: {e}")
        
        self.reels_data = all_reels
        print(f"\n📊 Total reels collected: {len(all_reels)}")
        return all_reels
    
    # =========================================================================
    # STAGE 2: Transcribe via Whisper
    # =========================================================================
    
    def stage2_transcribe(self) -> None:
        """Download videos and transcribe via local Whisper."""
        print("\n🎙️ STAGE 2: Transcribing with Whisper...")
        
        # Check Whisper availability
        if not self._check_whisper():
            print("  ❌ Whisper not found. Install with: pip install openai-whisper")
            return
        
        total = len(self.reels_data)
        
        for i, reel in enumerate(self.reels_data):
            print(f"  → [{i+1}/{total}] Processing {reel['reel_url'][:50]}...")
            
            video_url = reel.get("video_url")
            if not video_url:
                print("    ⚠️ No video URL, skipping")
                continue
            
            try:
                # Download video to temp file
                with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
                    tmp_path = tmp.name
                
                # Use yt-dlp for reliable downloading
                download_cmd = [
                    "yt-dlp",
                    "-f", "worst",  # Smallest file for faster processing
                    "-o", tmp_path,
                    "--quiet",
                    video_url
                ]
                
                subprocess.run(download_cmd, check=True, capture_output=True)
                
                # Transcribe with Whisper
                transcription = self._transcribe_with_whisper(tmp_path)
                reel["transcription"] = transcription
                
                # Extract hook (first ~50 chars)
                if transcription:
                    reel["hook"] = transcription[:100].split(".")[0]
                
                # Cleanup
                os.unlink(tmp_path)
                
                print(f"    ✅ Transcribed: {transcription[:50]}...")
                
            except Exception as e:
                print(f"    ❌ Transcription error: {e}")
    
    def _check_whisper(self) -> bool:
        """Check if Whisper is installed."""
        try:
            result = subprocess.run(
                ["whisper", "--help"],
                capture_output=True,
                text=True
            )
            return result.returncode == 0
        except FileNotFoundError:
            return False
    
    def _transcribe_with_whisper(self, audio_path: str) -> str:
        """Transcribe audio file using Whisper CLI."""
        try:
            with tempfile.TemporaryDirectory() as tmp_dir:
                cmd = [
                    "whisper",
                    audio_path,
                    "--model", self.whisper_model,
                    "--output_format", "txt",
                    "--output_dir", tmp_dir,
                    "--language", "ru",  # Can be auto-detected
                    "--task", "transcribe"
                ]
                
                subprocess.run(cmd, check=True, capture_output=True)
                
                # Read output file
                txt_file = Path(tmp_dir) / (Path(audio_path).stem + ".txt")
                if txt_file.exists():
                    return txt_file.read_text().strip()
                
        except Exception as e:
            print(f"      Whisper error: {e}")
        
        return ""
    
    # =========================================================================
    # STAGE 3: Export to Google Sheets
    # =========================================================================
    
    def stage3_export_to_sheets(self) -> str:
        """Export data to Google Sheets."""
        print("\n📊 STAGE 3: Exporting to Google Sheets...")
        
        if not self.sheets_client:
            print("  ❌ Google Sheets not initialized")
            return ""
        
        try:
            # Create spreadsheet
            title = f"Reels Analysis {datetime.now().strftime('%Y-%m-%d %H:%M')}"
            spreadsheet = self.sheets_client.create(title)
            
            # Share with user
            if self.share_email:
                spreadsheet.share(self.share_email, perm_type="user", role="writer")
            
            # Prepare Sheet 1: Raw Data
            sheet1 = spreadsheet.sheet1
            sheet1.update_title("Raw Data")
            
            headers = [
                "Reel URL", "Username", "Caption", "Views", "Likes", 
                "Comments", "Duration", "Hashtags", "Timestamp", 
                "Video URL", "Transcription", "Hook"
            ]
            
            rows = [headers]
            for reel in self.reels_data:
                rows.append([
                    reel["reel_url"],
                    reel["username"],
                    reel["caption"],
                    reel["views"],
                    reel["likes"],
                    reel["comments"],
                    reel["duration"],
                    reel["hashtags"],
                    reel["timestamp"],
                    reel["video_url"],
                    reel["transcription"],
                    reel["hook"]
                ])
            
            sheet1.update(range_name="A1", values=rows)
            
            # Create Sheet 2: Ranking
            sheet2 = spreadsheet.add_worksheet(title="Ranking", rows=100, cols=10)
            ranking_data = self._create_ranking_sheet()
            sheet2.update(range_name="A1", values=ranking_data)
            
            self.spreadsheet_url = spreadsheet.url
            print(f"  ✅ Spreadsheet created: {spreadsheet.url}")
            
            return spreadsheet.url
            
        except Exception as e:
            print(f"  ❌ Google Sheets error: {e}")
            return ""
    
    def _create_ranking_sheet(self) -> list[list]:
        """Create ranking data sorted by views."""
        headers = ["Rank", "Reel URL", "Views", "Performance", "Hook", "Key Topics"]
        
        # Sort by views
        sorted_reels = sorted(self.reels_data, key=lambda x: x["views"], reverse=True)
        
        total = len(sorted_reels)
        top_threshold = int(total * 0.2)
        bottom_threshold = int(total * 0.8)
        
        rows = [headers]
        for i, reel in enumerate(sorted_reels):
            if i < top_threshold:
                performance = "🏆 TOP"
            elif i >= bottom_threshold:
                performance = "❌ BOTTOM"
            else:
                performance = "➖ MIDDLE"
            
            rows.append([
                i + 1,
                reel["reel_url"],
                reel["views"],
                performance,
                reel["hook"][:50] if reel["hook"] else "",
                self._extract_topics(reel["transcription"])
            ])
        
        return rows
    
    def _extract_topics(self, text: str) -> str:
        """Extract key topics from transcription (simple version)."""
        if not text:
            return ""
        # Simple keyword extraction - can be enhanced with NLP
        words = text.lower().split()
        # Filter common words and return top keywords
        stopwords = {"и", "в", "на", "с", "что", "это", "как", "для", "не", "но", "а", "то"}
        keywords = [w for w in words if len(w) > 4 and w not in stopwords]
        return ", ".join(set(keywords[:5]))
    
    # =========================================================================
    # STAGE 4: Analyze Patterns
    # =========================================================================
    
    def stage4_analyze_patterns(self) -> dict:
        """Analyze patterns in top and bottom performing reels."""
        print("\n🔍 STAGE 4: Analyzing patterns...")
        
        sorted_reels = sorted(self.reels_data, key=lambda x: x["views"], reverse=True)
        
        total = len(sorted_reels)
        top_count = max(5, int(total * 0.2))
        bottom_count = max(5, int(total * 0.2))
        
        top_reels = sorted_reels[:top_count]
        bottom_reels = sorted_reels[-bottom_count:]
        
        analysis = {
            "total_reels": total,
            "total_views": sum(r["views"] for r in self.reels_data),
            "avg_views": sum(r["views"] for r in self.reels_data) // total if total else 0,
            "top_reels": top_reels,
            "bottom_reels": bottom_reels,
            "top_patterns": self._analyze_group(top_reels, "top"),
            "bottom_patterns": self._analyze_group(bottom_reels, "bottom"),
            "recommendations": []
        }
        
        # Generate recommendations based on patterns
        analysis["recommendations"] = self._generate_recommendations(analysis)
        
        print(f"  ✅ Analysis complete")
        return analysis
    
    def _analyze_group(self, reels: list[dict], group_type: str) -> dict:
        """Analyze a group of reels for common patterns."""
        patterns = {
            "avg_duration": 0,
            "common_hooks": [],
            "common_topics": [],
            "avg_engagement_rate": 0,
            "hashtag_patterns": []
        }
        
        if not reels:
            return patterns
        
        # Average duration
        durations = [r["duration"] for r in reels if r["duration"]]
        patterns["avg_duration"] = sum(durations) / len(durations) if durations else 0
        
        # Collect hooks
        patterns["common_hooks"] = [r["hook"] for r in reels if r["hook"]][:5]
        
        # Common hashtags
        all_hashtags = []
        for r in reels:
            if r["hashtags"]:
                all_hashtags.extend(r["hashtags"].split(", "))
        patterns["hashtag_patterns"] = list(set(all_hashtags))[:10]
        
        # Engagement rate (likes/views)
        engagement_rates = []
        for r in reels:
            if r["views"] > 0:
                rate = (r["likes"] / r["views"]) * 100
                engagement_rates.append(rate)
        patterns["avg_engagement_rate"] = (
            sum(engagement_rates) / len(engagement_rates) if engagement_rates else 0
        )
        
        return patterns
    
    def _generate_recommendations(self, analysis: dict) -> list[str]:
        """Generate content recommendations based on analysis."""
        recommendations = []
        
        top_patterns = analysis["top_patterns"]
        bottom_patterns = analysis["bottom_patterns"]
        
        # Duration recommendation
        if top_patterns["avg_duration"]:
            dur = int(top_patterns["avg_duration"])
            recommendations.append(
                f"Оптимальная длительность: {dur} секунд (среднее у ТОП reels)"
            )
        
        # Hooks recommendation
        if top_patterns["common_hooks"]:
            recommendations.append(
                f"Эффективные hooks: начинать с вопроса или интриги"
            )
        
        # Engagement recommendation
        if top_patterns["avg_engagement_rate"] > bottom_patterns["avg_engagement_rate"]:
            diff = top_patterns["avg_engagement_rate"] - bottom_patterns["avg_engagement_rate"]
            recommendations.append(
                f"ТОП reels имеют engagement rate выше на {diff:.1f}%"
            )
        
        return recommendations
    
    # =========================================================================
    # STAGE 5: Generate Report
    # =========================================================================
    
    def stage5_generate_report(self, analysis: dict) -> str:
        """Generate markdown report."""
        print("\n📝 STAGE 5: Generating report...")
        
        date_str = datetime.now().strftime("%Y-%m-%d")
        time_str = datetime.now().strftime("%H:%M")
        username_str = "_".join(self.usernames)
        
        report_filename = f"{date_str}_reels_analysis_{username_str}.md"
        report_path = EXECUTIONS_DIR / report_filename
        
        # Ensure Executions directory exists
        EXECUTIONS_DIR.mkdir(exist_ok=True)
        
        report = f"""# 📊 Анализ Instagram Reels: @{', @'.join(self.usernames)}

**Дата:** {date_str} {time_str}  
**Проанализировано:** {analysis['total_reels']} reels  
**Google Sheets:** {self.spreadsheet_url or 'Не создан'}

---

## 📈 Общая статистика

| Метрика | Значение |
|---------|----------|
| Всего reels | {analysis['total_reels']} |
| Суммарные просмотры | {analysis['total_views']:,} |
| Средние просмотры | {analysis['avg_views']:,} |

---

## 🏆 ТОП-5 Reels (что работает)

"""
        
        for i, reel in enumerate(analysis["top_reels"][:5], 1):
            report += f"""### {i}. {reel['views']:,} views
- **Hook:** "{reel['hook'][:100]}"
- **Длительность:** {reel['duration']} сек
- **Ссылка:** {reel['reel_url']}

"""
        
        report += """---

## ❌ BOTTOM-5 Reels (что НЕ работает)

"""
        
        for i, reel in enumerate(analysis["bottom_reels"][:5], 1):
            report += f"""### {i}. {reel['views']:,} views
- **Hook:** "{reel['hook'][:100]}"
- **Проблемы:** Низкая вовлечённость
- **Ссылка:** {reel['reel_url']}

"""
        
        report += f"""---

## 🎯 Паттерны успеха

### Hooks, которые работают:
"""
        for hook in analysis["top_patterns"]["common_hooks"][:3]:
            report += f'- "{hook}"\n'
        
        report += f"""
### Оптимальные параметры:
- Длительность: ~{int(analysis['top_patterns']['avg_duration'])} секунд
- Engagement rate: {analysis['top_patterns']['avg_engagement_rate']:.1f}%

---

## 💡 Рекомендации по контенту

"""
        for rec in analysis["recommendations"]:
            report += f"- {rec}\n"
        
        report += """
---

## 🗳️ Выберите направление

Основываясь на анализе, предлагаю направления:

1. **Повторить успешный формат** — создать контент по паттернам ТОП reels
2. **Эксперимент с длительностью** — попробовать другую длину
3. **Новая тема** — протестировать другое направление

**Какое направление вас интересует для сценария? (1/2/3/свой вариант)**
"""
        
        # Write report
        report_path.write_text(report, encoding="utf-8")
        self.report_path = report_path
        
        print(f"  ✅ Report saved: {report_path}")
        return str(report_path)
    
    # =========================================================================
    # STAGE 6 & 7: Interactive (handled by agent externally)
    # =========================================================================
    
    def run_full_pipeline(self) -> dict:
        """Run complete analysis pipeline."""
        print("=" * 60)
        print("🎬 REELS ANALYZER — Starting Full Pipeline")
        print("=" * 60)
        
        # Stage 1: Parse
        self.stage1_parse_reels()
        
        if not self.reels_data:
            print("\n❌ No reels found. Aborting.")
            return {"success": False, "error": "No reels found"}
        
        # Stage 2: Transcribe
        self.stage2_transcribe()
        
        # Stage 3: Export to Sheets
        self.stage3_export_to_sheets()
        
        # Stage 4: Analyze
        analysis = self.stage4_analyze_patterns()
        
        # Stage 5: Generate Report
        report_path = self.stage5_generate_report(analysis)
        
        print("\n" + "=" * 60)
        print("✅ PIPELINE COMPLETE")
        print("=" * 60)
        print(f"\n📊 Google Sheets: {self.spreadsheet_url}")
        print(f"📝 Report: {report_path}")
        print("\n⏳ Stage 6-7 (feedback & script) handled by agent interactively")
        
        return {
            "success": True,
            "reels_count": len(self.reels_data),
            "spreadsheet_url": self.spreadsheet_url,
            "report_path": str(report_path),
            "analysis": analysis
        }


def main():
    parser = argparse.ArgumentParser(description="Instagram Reels Analyzer")
    parser.add_argument(
        "--usernames", "-u",
        required=True,
        help="Comma-separated Instagram usernames"
    )
    parser.add_argument(
        "--limit", "-l",
        type=int,
        default=20,
        help="Max reels per profile (default: 20)"
    )
    parser.add_argument(
        "--email", "-e",
        required=True,
        help="Email for Google Sheets access"
    )
    parser.add_argument(
        "--whisper-model", "-w",
        default="base",
        choices=["tiny", "base", "small", "medium", "large"],
        help="Whisper model size (default: base)"
    )
    parser.add_argument(
        "--no-gpt",
        action="store_true",
        help="Disable GPT-based analysis"
    )
    
    args = parser.parse_args()
    
    usernames = [u.strip() for u in args.usernames.split(",")]
    
    analyzer = ReelsAnalyzer(
        usernames=usernames,
        results_limit=args.limit,
        share_email=args.email,
        whisper_model=args.whisper_model,
        analyze_with_gpt=not args.no_gpt
    )
    
    result = analyzer.run_full_pipeline()
    
    if result["success"]:
        print("\n✅ Done! Check your Google Sheets and report file.")
    else:
        print(f"\n❌ Failed: {result.get('error', 'Unknown error')}")
        sys.exit(1)


if __name__ == "__main__":
    main()
