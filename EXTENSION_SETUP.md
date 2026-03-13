# BrainForge Meet Assistant - Quick Setup Guide

## Step 1: Load Extension in Chrome

1. **Open Extensions Page**
   - Go to `chrome://extensions/` in your Chrome browser
   - Or: Menu → More Tools → Extensions

2. **Enable Developer Mode**
   - Toggle "Developer mode" in the top-right corner

3. **Load Unpacked**
   - Click "Load unpacked"
   - Navigate to `/home/rapidtest/project/BrainForge/apps/extension`
   - Click "Select Folder"

4. **Verify Installation**
   - You should see "BrainForge Meet Assistant" in your extensions list
   - Look for the 🧠 icon in your Chrome toolbar

## Step 2: Configure Extension

1. **Get Your Credentials**
   - Make sure BrainForge is running (`npm run dev` in apps/web)
   - Log in at `http://localhost:3000`
   - Go to Settings → Account
   - Copy your **Team ID** (you may need to create a team first)
   - To get your **Auth Token**:
     - Open Developer Tools (F12)
     - Go to Console
     - Type: `localStorage.getItem('auth_token')` or look in Application → Local Storage

2. **Configure the Extension**
   - Click the 🧠 BrainForge icon in your Chrome toolbar
   - Fill in the following:
     - **API URL**: `http://localhost:4000/api` (or your API URL)
     - **Team ID**: Paste your Team ID
     - **Auth Token**: Paste your Auth Token
     - **AI Provider**: Select one (default: Copilot)
     - **Model**: Enter model ID (e.g., `gpt-4o` for OpenAI)
     - **Language**: Select your preferred language for transcription
   - Click "💾 Save Settings"

## Step 3: Use on Google Meet

1. **Open a Google Meet**
   - Go to `meet.google.com`
   - Join or start a meeting

2. **Open BrainForge Assistant**
   - Look for the 🧠 button in the call controls (bottom toolbar)
   - Click it to open the Assistant panel
   - You may need to refresh the Meet page if you don't see it

3. **Record Meeting**
   - Click "🎤 Start Recording"
   - The extension will begin transcribing speech in real-time
   - Live transcript appears in the panel

4. **Summarize Meeting**
   - After recording, click "✨ Summarize"
   - AI will analyze the transcript and generate a summary
   - Summary appears in the panel below

5. **Save to BrainForge**
   - Click "💾 Save to BrainForge"
   - The meeting will be saved to your Meetings page
   - Opens BrainForge → Meetings automatically

## Troubleshooting

### Extension Not Appearing in Chrome Toolbar
- Make sure you're on `https://meet.google.com`
- Refresh the page (Ctrl+R or Cmd+R)
- Check if extension is enabled in `chrome://extensions/`

### No Microphone Permission
- Chrome will prompt you when needed
- If you accidentally denied it, click the lock icon in the address bar
- Reset "Microphone" permission and refresh

### Transcription Not Working
- Check microphone is working on your system
- Try speaking clearly
- Make sure browser has microphone permission
- Try a different language in settings

### "No transcript to summarize" Error
- Make sure you recorded something (check the transcript box)
- Make sure Web Speech API returned results

### Can't Connect to API
- Verify BrainForge backend is running:
  ```bash
  cd /home/rapidtest/project/BrainForge/apps/api
  npx tsx src/server.ts
  ```
- Check API URL is correct in settings (default: `http://localhost:4000/api`)
- Check Team ID and Auth Token are valid

### Settings Won't Save
- Make sure all required fields are filled in
- Check browser allows extensions to use storage (Settings → Privacy)
- Try clearing extension data and reconfiguring

## Features Overview

| Feature | What It Does |
|---------|-------------|
| **Record** | Starts capturing audio and transcribing to text |
| **Live Transcript** | Shows real-time text as people speak |
| **Summarize** | Uses AI to create a concise summary |
| **Save** | Stores meeting to BrainForge Meetings page |
| **Multi-language** | Supports many languages for transcription |
| **Multi-AI** | Works with any configured AI provider |

## Example Workflow

1. Join a Google Meet call
2. Click 🧠 BrainForge button in call controls
3. Click "🎤 Start Recording"
4. Let the meeting run...
5. Click "⏹️ Stop Recording"
6. Click "✨ Summarize" to generate AI summary
7. Review the summary in the panel
8. Click "💾 Save to BrainForge"
9. Meeting automatically saved to your account!

## Advanced: Local Testing

If you want to test the extension locally without real Google Meet:

1. Create a simple test page:
```html
<!DOCTYPE html>
<html>
<head>
    <title>Test Page</title>
</head>
<body>
    <h1>BrainForge Extension Test</h1>
    <p>If you see the 🧠 panel here, the extension is working!</p>
</body>
</html>
```

2. Host it locally and test

## Next Steps

- ✅ Extension installed and configured
- ✅ Ready to use on Google Meet
- 📊 Check your meetings at `http://localhost:3000/meetings`
- 🔧 Configure AI providers in BrainForge settings for better summaries

## Need Help?

Check the [Extension README](README.md) for more detailed information.
