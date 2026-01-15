# 🎬 MediaForge (formerly ASMR-Toolkit)

![Electron](https://img.shields.io/badge/Electron-39.0-blue?logo=electron)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)
![FFmpeg](https://img.shields.io/badge/FFmpeg-Powered-green?logo=ffmpeg)
![TensorFlow.js](https://img.shields.io/badge/AI-TensorFlow.js-orange?logo=tensorflow)

> **A High-Performance, Local-First Desktop Media Studio built with Web Technologies.**

MediaForge is a comprehensive desktop application designed to simplify complex media processing tasks. By leveraging the power of **Electron** and **FFmpeg**, coupled with **TensorFlow.js** for on-device AI analysis, it offers a secure, offline-capable environment for content creators.

<img width="2758" height="1676" alt="image" src="https://github.com/user-attachments/assets/5c943e81-ee86-4b03-b7a9-eeb076e3c12d" />


## ✨ Key Features

### 🛠️ Professional Media Processing
* **Smart Format Converter**: Intelligent transcoding for **14+ formats** (MP4, MKV, FLAC, OPUS, etc.) with auto-bitrate optimization using `fluent-ffmpeg`.
* **Lossless Trimming**: Edit video/audio clips without re-encoding quality loss using stream copying technology.
* **Precision Frame Capture**: Extract high-quality PNG/JPG snapshots with **frame-level accuracy (~30ms)** using HTML5 Canvas + Video API.

### 🤖 AI-Powered Audio Analysis (Experimental)
* **Local Inference**: Integrated **Google's YAMNet model** via a headless Puppeteer runner to perform audio classification purely on-device.
* **Event Detection**: Automatically detects and isolates specific audio events (e.g., Speech, Silence, Environmental Sounds) for automated clipping.
* *Note: This feature ensures 100% data privacy as no audio leaves your device.*

### 🏷️ Metadata & Management
* **ID3 Tag Editor**: Full support for editing metadata (Artist, Album, Genre) and embedding Cover Art for MP3/FLAC/WAV files.
* **File System Integration**: Native drag-and-drop support and OS-level file association.

## 🏗️ Architecture Highlights

This project demonstrates a production-grade **Modular Monorepo** architecture:

* **Decoupled Design**: Separates the **Renderer** (React UI), **Main Process** (Node.js/FFmpeg), and **AI Service** (Headless Runner).
* **Non-Blocking IPC**: Implements an asynchronous event-driven communication layer to handle heavy encoding tasks (1GB+ files) without freezing the UI.
* **Stream Management**: Solves Node.js stream backpressure issues during large file transformations to optimize memory usage.

## 🚀 Tech Stack

* **Core**: Electron 39, React 18, TypeScript, Vite
* **Media Engine**: fluent-ffmpeg, @ffmpeg-installer, node-id3
* **AI Engine**: TensorFlow.js, Puppeteer (Headless Mode)
* **State & UI**: Custom Hooks, CSS Modules, Canvas API

## 📦 Getting Started

### Prerequisites
* Node.js >= 18
* pnpm (recommended)

### Installation

```bash
# 1. Clone the repository
git clone [https://github.com/your-username/media-forge.git](https://github.com/your-username/media-forge.git)

# 2. Install dependencies
pnpm install

# 3. Run in development mode (Concurrent)
pnpm run dev

# Build for Windows (Generates .exe installer)
pnpm run build:win
