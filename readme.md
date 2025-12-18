# 🎧 ASMR Auto-Clipper

An AI-powered desktop application for automatically clipping ASMR audio segments from videos using the YAMNet model.

## ✨ Features

- **Intelligent Audio Classification**: Uses Google's YAMNet model to identify specific sound types (licking, talking, sleep sounds)
- **Desktop Application**: Built with Electron for cross-platform desktop support
- **Modern UI**: Beautiful gradient interface with real-time progress tracking
- **Flexible Configuration**: Adjustable sensitivity thresholds and multiple detection modes
- **Automated Processing**: Automatically splits, analyzes, and merges audio segments

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- pnpm (recommended) or npm

### Installation

```bash
# Install dependencies
pnpm install

# Build Electron components
pnpm run build:preload
pnpm run build:main
```

### Development

```bash
# Terminal 1: Start Vite dev server
pnpm run dev

# Terminal 2: Launch Electron app
VITE_DEV_SERVER_URL=http://localhost:5173 npx electron dist-electron/index.js
```

## 🎨 Usage

1. **Select Video**: Click "Browse File" to choose a video file (.mp4, .avi, .mkv, .mov)
2. **Configure**: 
   - Select mode (Licking/Wet Sounds, Talking/Whispering, Sleep Sounds)
   - Adjust threshold (lower = more sensitive, may include noise)
3. **Process**: Click "Start Processing" and wait for completion
4. **Review Results**: 
   - Kept segments: `ai_tool/kept/`
   - Discarded segments: `ai_tool/discarded/`
   - Final output: `output_[mode].mp3`

## 🛠️ Tech Stack

- **Frontend**: React 18 + Vite
- **Desktop**: Electron 39
- **AI Model**: YAMNet (TensorFlow.js)
- **Audio Processing**: FFmpeg + fluent-ffmpeg
- **Browser Automation**: Puppeteer
- **Build**: esbuild (main/preload), Vite (renderer)

## 📁 Project Structure

```
├── src/
│   ├── main/              # Electron main process
│   │   ├── index.ts       # App initialization & IPC
│   │   └── ai/
│   │       └── processor.ts  # AI processing logic
│   ├── preload/           # IPC bridge
│   │   └── index.ts
│   └── renderer/          # React UI
│       ├── App.tsx
│       ├── App.css
│       └── main.tsx
├── ai_tool/               # YAMNet model & processing
│   ├── runner_yamnet.html # Model runner
│   ├── model.json         # Model architecture
│   └── weights.bin        # Model weights (5.7MB)
└── dist-electron/         # Build output
```

## 🔧 Build Scripts

```json
{
  "dev": "npm run build:preload && vite",
  "build:main": "esbuild src/main/...",
  "build:preload": "esbuild src/preload/...",
  "build:win": "npm run build -- --win"
}
```

## 🎯 Detection Modes

### Licking/Wet Sounds
Targets: Kiss, Lip smack, Chewing, Drinking, Water, Liquid, Gurgling, Slurp, etc.

### Talking/Whispering
Targets: Speech, Whispering, Conversation, Narration

### Sleep Sounds
Targets: Rain, Water, Wind, Silence, White noise

## 📝 Configuration

- **Threshold Range**: 0.00001 - 0.01
- **Recommended**: 
  - High precision: 0.001 - 0.01
  - Balanced: 0.0001 - 0.001
  - High recall: 0.00001 - 0.0001

## 🚧 Known Limitations

- Development mode requires two terminal windows
- Production paths need configuration before packaging (use `app.getPath()`)
- Model accuracy depends on audio quality and threshold tuning

## 📦 Building for Production

```bash
# Build Windows executable
pnpm run build:win

# Output: release/ASMR Clipper Setup.exe
```

> ⚠️ Note: Before building for production, update path handling in `processor.ts` to use Electron's `app.getPath()` API for proper resource resolution.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- [YAMNet](https://github.com/tensorflow/models/tree/master/research/audioset/yamnet) - Audio event classification model by Google
- [Electron](https://www.electronjs.org/) - Cross-platform desktop apps
- [FFmpeg](https://ffmpeg.org/) - Audio/video processing

---

**Status**: ✅ Functional (Development) | ⏳ Production packaging pending
