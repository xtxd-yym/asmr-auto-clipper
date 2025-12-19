import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    selectFile: () => ipcRenderer.invoke('select-file'),
    selectVideoFile: () => ipcRenderer.invoke('select-video-file'),
    startProcessing: (config: any) => ipcRenderer.invoke('start-processing', config),
    getProgress: () => ipcRenderer.invoke('get-progress'),
    convertFormat: (config: any) => ipcRenderer.invoke('convert-format', config),
    getConverterProgress: () => ipcRenderer.invoke('get-converter-progress'),
    trimMedia: (config: any) => ipcRenderer.invoke('trim-media', config),
    concatMedia: (config: any) => ipcRenderer.invoke('concat-media', config),
    getMediaDuration: (filePath: string) => ipcRenderer.invoke('get-media-duration', filePath),
    saveFrame: (frameData: ArrayBuffer, outputPath: string) => ipcRenderer.invoke('save-frame', frameData, outputPath),
    selectSavePath: (suggestedName: string) => ipcRenderer.invoke('select-save-path', suggestedName),
    selectAudioFile: () => ipcRenderer.invoke('select-audio-file'),
    selectImageFile: () => ipcRenderer.invoke('select-image-file'),
    readMetadata: (filePath: string) => ipcRenderer.invoke('read-metadata', filePath),
    writeMetadata: (filePath: string, metadata: any) => ipcRenderer.invoke('write-metadata', filePath, metadata),
    readImageAsBase64: (imagePath: string) => ipcRenderer.invoke('read-image-as-base64', imagePath),
});

export type ElectronAPI = {
    selectFile: () => Promise<string | undefined>;
    selectVideoFile: () => Promise<string | undefined>;
    startProcessing: (config: any) => Promise<void>;
    getProgress: () => Promise<number>;
    convertFormat: (config: any) => Promise<void>;
    getConverterProgress: () => Promise<number>;
    trimMedia: (config: any) => Promise<void>;
    concatMedia: (config: any) => Promise<void>;
    getMediaDuration: (filePath: string) => Promise<number>;
};
