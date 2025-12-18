import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import { startAIProcessing, getAIProgress } from './ai/processor';
import { convertFormat, getConverterProgress } from './converter/format-converter';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
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

app.whenReady().then(() => {
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
