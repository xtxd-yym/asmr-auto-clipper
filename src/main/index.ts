import { app, BrowserWindow, ipcMain, dialog, protocol } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { startAIProcessing, getAIProgress } from './ai/processor';
import { convertFormat, getConverterProgress, trimMedia, concatMedia, getMediaDuration } from './converter/format-converter';
import { readMetadata, writeMetadata } from './metadata/metadata-editor';

let mainWindow: BrowserWindow | null = null;

// Register custom protocol BEFORE app is ready
protocol.registerSchemesAsPrivileged([
    {
        scheme: 'media',
        privileges: {
            secure: true,
            supportFetchAPI: true,
            bypassCSP: true,
            stream: true  // Critical for video/audio streaming
        }
    }
]);

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false, // Allow loading local files
        },
    });

    // Load React app
    if (process.env.VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(async () => {
    // Register protocol handler for media:// URLs using newer handle API
    protocol.handle('media', async (request) => {
        try {
            const url = request.url.substring(8); // Remove 'media://' prefix
            const decodedPath = decodeURI(url);

            console.log('[Protocol] Loading media file:', decodedPath);

            // Check if file exists
            if (!fs.existsSync(decodedPath)) {
                console.error('[Protocol] File not found:', decodedPath);
                return new Response('File not found', { status: 404 });
            }

            // Read the file
            const buffer = fs.readFileSync(decodedPath);

            // Determine MIME type based on file extension
            const ext = path.extname(decodedPath).toLowerCase();
            const mimeTypes: Record<string, string> = {
                '.mp4': 'video/mp4',
                '.webm': 'video/webm',
                '.ogv': 'video/ogg',
                '.avi': 'video/x-msvideo',
                '.mov': 'video/quicktime',
                '.mkv': 'video/x-matroska',
                '.mp3': 'audio/mpeg',
                '.wav': 'audio/wav',
                '.ogg': 'audio/ogg',
                '.aac': 'audio/aac',
                '.flac': 'audio/flac'
            };

            const mimeType = mimeTypes[ext] || 'application/octet-stream';

            console.log(`[Protocol] Serving file: ${decodedPath} (${mimeType})`);

            return new Response(buffer, {
                status: 200,
                headers: {
                    'Content-Type': mimeType,
                    'Content-Length': buffer.length.toString(),
                    'Accept-Ranges': 'bytes',
                }
            });
        } catch (error) {
            console.error('[Protocol] Error loading media:', error);
            return new Response('Internal Server Error', { status: 500 });
        }
    });

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// File selection dialog
ipcMain.handle('select-file', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
            { name: 'Media Files', extensions: ['mp4', 'avi', 'mkv', 'mov', 'mp3', 'wav', 'aac', 'flac'] },
            { name: 'All Files', extensions: ['*'] }
        ],
    });
    return result.filePaths[0] || null;
});

// Video-only file selection (for Frame Capture)
ipcMain.handle('select-video-file', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
            { name: 'Video Files', extensions: ['mp4', 'avi', 'mkv', 'mov', 'webm', 'flv', 'wmv', 'mpeg', 'mpg'] },
            { name: 'All Files', extensions: ['*'] }
        ],
    });
    return result.filePaths[0] || null;
});

// AI Processing (legacy)
ipcMain.handle('start-processing', async (_event, config) => {
    try {
        const result = await startAIProcessing(config);
        return { success: true, data: result };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-progress', async () => {
    return getAIProgress();
});

// Format Converter
ipcMain.handle('convert-format', async (_event, config) => {
    try {
        const result = await convertFormat(config);
        return { success: true, data: result };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-converter-progress', async () => {
    return getConverterProgress();
});

// Media Editing
ipcMain.handle('trim-media', async (_event, config) => {
    try {
        const result = await trimMedia(config);
        return { success: true, data: result };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('concat-media', async (_event, config) => {
    try {
        const result = await concatMedia(config);
        return { success: true, data: result };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

// Get Media Duration
ipcMain.handle('get-media-duration', async (_event, filePath: string) => {
    try {
        const duration = await getMediaDuration(filePath);
        return duration;
    } catch (error: any) {
        console.error('[IPC] Failed to get media duration:', error);
        return 0; // Return 0 on error
    }
});

// Frame Capture - Save Frame
ipcMain.handle('save-frame', async (_event, frameData: any, outputPath: string) => {
    try {
        const buffer = Buffer.from(frameData);
        fs.writeFileSync(outputPath, buffer);
        return true;
    } catch (error: any) {
        console.error('[IPC] Failed to save frame:', error);
        return false;
    }
});

// Frame Capture - Select Save Path
ipcMain.handle('select-save-path', async (_event, suggestedName: string) => {
    const result = await dialog.showSaveDialog({
        defaultPath: suggestedName,
        filters: [
            { name: 'Images', extensions: ['png', 'jpg', 'jpeg'] },
            { name: 'PNG', extensions: ['png'] },
            { name: 'JPEG', extensions: ['jpg', 'jpeg'] },
        ],
    });
    return result.filePath || null;
});

// Metadata Editor - Select Audio File
ipcMain.handle('select-audio-file', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
            { name: 'Audio Files', extensions: ['mp3', 'flac', 'wav', 'aac', 'm4a', 'ogg', 'wma'] },
            { name: 'All Files', extensions: ['*'] }
        ],
    });
    return result.filePaths[0] || null;
});

// Metadata Editor - Select Image File
ipcMain.handle('select-image-file', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
            { name: 'Images', extensions: ['jpg', 'jpeg', 'png'] },
            { name: 'All Files', extensions: ['*'] }
        ],
    });
    return result.filePaths[0] || null;
});

// Metadata Editor - Read Metadata
ipcMain.handle('read-metadata', async (_event, filePath: string) => {
    try {
        const metadata = await readMetadata(filePath);
        return metadata;
    } catch (error: any) {
        console.error('[IPC] Failed to read metadata:', error);
        throw error;
    }
});

// Metadata Editor - Write Metadata
ipcMain.handle('write-metadata', async (_event, filePath: string, metadata: any) => {
    try {
        await writeMetadata(filePath, metadata);
    } catch (error: any) {
        console.error('[IPC] Failed to write metadata:', error);

        // Provide user-friendly error messages
        if (error.code === 'EPERM' || error.message?.includes('EPERM') || error.message?.includes('operation not permitted')) {
            const fileName = path.basename(filePath);
            throw new Error(
                `Failed to save metadata: File access denied.\n\n` +
                `The file "${fileName}" may be:\n` +
                `• Marked as read-only (right-click → Properties → uncheck "Read-only")\n` +
                `• Currently opened in another program (close it and try again)\n` +
                `• Protected by system permissions\n\n` +
                `Please check the file and try again.`
            );
        }

        throw error;
    }
});

// Metadata Editor - Read Image as Base64
ipcMain.handle('read-image-as-base64', async (_event, imagePath: string) => {
    try {
        const imageBuffer = fs.readFileSync(imagePath);
        const ext = path.extname(imagePath).toLowerCase();
        const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
        return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
    } catch (error: any) {
        console.error('[IPC] Failed to read image:', error);
        throw error;
    }
});


