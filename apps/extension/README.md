# BrainForge Meet Assistant - Chrome Extension

AI-powered meeting assistant for Google Meet. Record, transcribe, and summarize meetings directly in Meet with BrainForge.

## Features

- 🎤 **Real-time Voice Recording** - Automatically transcribe voice from all participants using Web Speech API
- ✨ **AI Summarization** - Generate automatic summaries of your meetings with AI
- 💾 **Save to BrainForge** - Seamlessly save meeting transcripts and summaries to your BrainForge account
- 🔄 **Multi-language Support** - Support for Indonesian, English, Spanish, French, German, Japanese, and more
- 🎯 **Multi-provider AI** - Works with Copilot, OpenAI, Claude, Gemini, OpenRouter, and Groq

## Installation

### From Source (Development)

1. Clone the repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right)
4. Click "Load unpacked"
5. Select the `apps/extension` folder in the BrainForge project

### Configuration

1. **Get your credentials from BrainForge:**
   - Log in to BrainForge at `http://localhost:3000`
   - Go to Settings → Account
   - Find your Team ID and Auth Token

2. **Configure the extension:**
   - Click the BrainForge extension icon in Chrome
   - Fill in your API URL (e.g., `http://localhost:4000/api`)
   - Paste your Team ID and Auth Token
   - Select your preferred AI provider and model
   - Choose your preferred language for transcription
   - Click "Save Settings"

3. **Start using it:**
   - Open a Google Meet
   - Look for the 🧠 button in the call controls
   - Click it to open the BrainForge Assistant panel
   - Click "Start Recording" to begin recording the meeting
   - During or after the meeting, click "Summarize" to generate an AI summary
   - Click "Save to BrainForge" to save the meeting to your account

## How It Works

### Recording & Transcription
- Uses the **Web Speech API** (browser's built-in speech recognition)
- Records audio in real-time from all Meet participants
- Transcribes speech to text automatically
- Language can be configured in settings (default: Indonesian)

### Summarization
- Sends transcript to BrainForge API
- Uses your configured AI provider (Copilot, OpenAI, Claude, etc.)
- Generates a summary with key points and action items
- Results are shown in the panel and saved to your BrainForge account

### Integration with BrainForge
- Saves meetings as Meeting entries in BrainForge
- Syncs with your Projects and Team
- View all meetings in the Meetings page at `http://localhost:3000/meetings`

## File Structure

```
apps/extension/
├── manifest.json           # Extension configuration
├── src/
│   ├── content-script.js   # Injected into Google Meet pages
│   ├── background.js       # Service worker for background tasks
│   ├── popup.html          # Settings UI
│   ├── popup.js            # Settings logic
│   ├── popup.css           # Settings styles
│   └── styles.css          # Panel styles in Meet
└── icons/                  # Extension icons (16x16, 48x48, 128x128)
```

## Permissions Required

- `tabs` - To detect when user is on Google Meet
- `activeTab` - To access current tab
- `scripting` - To inject content script
- `storage` - To save settings
- `contextMenus` - For context menu options
- `https://meet.google.com/*` - To run on Google Meet pages
- `http://localhost:4000/*` - To communicate with BrainForge API
- `http://localhost:3000/*` - To open BrainForge pages

## Troubleshooting

### Extension doesn't appear on Google Meet
- Refresh the Meet page after installing
- Check that you're on `meet.google.com` (not a corporate subdomain)
- Check Chrome's Developer Tools (F12) → Console for errors

### Microphone/Speech Recognition not working
- Grant microphone permission when prompted
- Check browser supports Web Speech API (Chrome, Edge, Safari)
- Try a different language
- Make sure microphone is working in other apps

### Transcription is empty
- Ensure you granted microphone permissions
- Try clicking "Start Recording" again
- Check internet connection (needed for AI providers)

### Can't save to BrainForge
- Verify Team ID and Auth Token are correct
- Check API URL is correct (default: `http://localhost:4000/api`)
- Make sure BrainForge backend is running
- Check browser console for error messages

### Extension no longer works after update
- Go to `chrome://extensions/`
- Click the refresh icon on BrainForge Meet Assistant
- Close and reopen Google Meet

## Future Enhancements

- [ ] Real-time participant detection and speaker identification
- [ ] Custom prompts for summarization
- [ ] Export transcripts (PDF, Word, TXT)
- [ ] Meeting statistics and insights
- [ ] Multi-language summaries
- [ ] Meeting action item tracking
- [ ] Integration with Google Calendar
- [ ] Screen sharing content extraction

## Support & Contributing

For issues or feature requests, please visit the BrainForge GitHub repository.

## License

Licensed under the same license as BrainForge.
