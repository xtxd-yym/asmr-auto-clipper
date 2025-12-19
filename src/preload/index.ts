import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    selectFile: () => ipcRenderer.invoke('select-file'),
    startProcessing: (config: any) => ipcRenderer.invoke('start-processing', config),
    getProgress: () => ipcRenderer.invoke('get-progress'),
    convertFormat: (config: any) => ipcRenderer.invoke('convert-format', config),
    getConverterProgress: () => ipcRenderer.invoke('get-converter-progress'),
    trimMedia: (config: any) => ipcRenderer.invoke('trim-media', config),
    concatMedia: (config: any) => ipcRenderer.invoke('concat-media', config),
    getMediaDuration: (filePath: string) => ipcRenderer.invoke('get-media-duration', filePath),
});

export type ElectronAPI = {
    selectFile: () => Promise<string | undefined>;
    startProcessing: (config: any) => Promise<void>;
    getProgress: () => Promise<number>;
    convertFormat: (config: any) => Promise<void>;
    getConverterProgress: () => Promise<number>;
    trimMedia: (config: any) => Promise<void>;
    concatMedia: (config: any) => Promise<void>;
    getMediaDuration: (filePath: string) => Promise<number>;
};
