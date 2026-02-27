
import os
import sys
import pickle
import argparse
import gspread
from pathlib import Path
from datetime import datetime
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow

# =========================================================================
# CONFIG
# =========================================================================

BASE_DIR = Path(__file__).parent.parent
EXECUTIONS_DIR = BASE_DIR / "Executions"
EXECUTIONS_DIR.mkdir(exist_ok=True)
GOOGLE_TOKEN_FILE = BASE_DIR / "google_token.pickle"
GOOGLE_CREDS_FILE = BASE_DIR / "google_credentials.json"

# =========================================================================
# UTILS
# =========================================================================

def get_google_creds():
    creds = None
    if os.path.exists(GOOGLE_TOKEN_FILE):
        with open(GOOGLE_TOKEN_FILE, 'rb') as token:
            creds = pickle.load(token)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
    return creds

def parse_int(val):
    try:
        if isinstance(val, str):
            return int(float(val.replace(',', '')))
        return int(val)
    except:
        return 0

# =========================================================================
# LOGIC
# =========================================================================

def analyze_sheet(sheet_url: str):
    print(f"\n📊 Analyzing data from Sheet: {sheet_url}")
    
    creds = get_google_creds()
    if not creds:
        print("❌ Auth failed")
        return

    client = gspread.authorize(creds)
    sheet = client.open_by_url(sheet_url).sheet1
    
    # Get all records
    records = sheet.get_all_records()
    print(f"   → Loaded {len(records)} rows")
    
    if not records:
        print("❌ No data found")
        return

    # Process Data
    reels = []
    transcribed_count = 0
    
    for r in records:
        views = parse_int(r.get("Views", 0))
        likes = parse_int(r.get("Likes", 0))
        comments = parse_int(r.get("Comments", 0))
        transcription = r.get("Transcription", "")
        
        reel = {
            "username": r.get("Username"),
            "views": views,
            "likes": likes,
            "comments": comments,
            "transcription": transcription,
            "hook": r.get("Hook", ""),
            "url": r.get("Reel URL", "")
        }
        reels.append(reel)
        if transcription and len(transcription) > 10:
            transcribed_count += 1
            
    # Sort
    sorted_reels = sorted(reels, key=lambda x: x['views'], reverse=True)
    top_10 = sorted_reels[:10]
    bottom_10 = sorted_reels[-10:]
    avg_views = sum(r['views'] for r in reels) / len(reels) if reels else 0
    
    print("\n   ✅ Analysis complete")
    print(f"   📈 Top performer: {top_10[0]['views']:,} views")
    print(f"   📉 Bottom performer: {bottom_10[-1]['views']:,} views")
    print(f"   📊 Average: {int(avg_views):,} views")
    print(f"   🎙️ Transcribed: {transcribed_count}/{len(reels)}")
    
    # Generate Report
    report_path = EXECUTIONS_DIR / f"2026-01-09_reels_sheet_analysis.md"
    
    content = f"""# 🎬 Reels Analysis Report
**Source:** [Google Sheets]({sheet_url})
**Date:** {datetime.now().strftime('%Y-%m-%d %H:%M')}
**Total Analyzed:** {len(reels)}
**Transcribed:** {transcribed_count}

## 📊 Performance
- **Average Views:** {int(avg_views):,}
- **Top Performer:** {top_10[0]['views']:,}
- **Bottom Performer:** {bottom_10[-1]['views']:,}

## 🏆 Top Content Patterns (from Top 10)
"""
    for i, reel in enumerate(top_10):
        hook = reel['hook'] or "No hook detected"
        transcription_snippet = (reel['transcription'] or "")[:200].replace("\n", " ")
        if not reel['transcription']:
            transcription_snippet = "(No transcription available)"
            
        content += f"### {i+1}. @{reel['username']} ({reel['views']:,} views)\n"
        content += f"**Hook:** \"{hook}\"\n"
        content += f"**Content:** {transcription_snippet}...\n"
        content += f"**Link:** {reel['url']}\n\n"

    content += """
## 📉 Underperforming Content (Bottom 5)
Patterns to avoid:
"""
    for i, reel in enumerate(bottom_10[-5:]):
         content += f"- **@{reel['username']}** ({reel['views']:,} views): {reel['hook'] or 'No hook'}\n"

    content += """
## 💡 Recommendations based on Analysis
1. **Analyze Hooks**: Look at the hooks of the top performers above. Common patterns often include direct address ("You need to stop..."), huge promises ("How I made $10k..."), or contrarian takes.
2. **Audio/Visual**: If transcription is missing for top reels, they might be relying on visual trends or music-sync.
3. **Length**: Check the source links to see if short (<10s) or long (>30s) content works better.
"""
    
    with open(report_path, 'w') as f:
        f.write(content)
        
    print(f"\n   📝 Report saved to: {report_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("url", help="Google Sheets URL")
    args = parser.parse_args()
    
    analyze_sheet(args.url)
