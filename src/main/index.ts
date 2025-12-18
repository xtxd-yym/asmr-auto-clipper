import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { startAIProcessing, getAIProgress } from './ai/processor';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
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

// IPC Handlers
ipcMain.handle('start-processing', async (event, config) => {
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

ipcMain.handle('select-file', async () => {
    const { dialog } = require('electron');
    const result = await dialog.showOpenDialog(mainWindow!, {
        properties: ['openFile'],
        filters: [
            { name: 'Videos', extensions: ['mp4', 'avi', 'mkv', 'mov'] },
        ],
    });
    return result.filePaths[0] || null;
});
