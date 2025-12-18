import { contextBridge, ipcRenderer } from 'electron';

const api = {
    selectFile: () => ipcRenderer.invoke('select-file'),
    startProcessing: (config: any) => ipcRenderer.invoke('start-processing', config),
    getProgress: () => ipcRenderer.invoke('get-progress'),
};

contextBridge.exposeInMainWorld('electronAPI', api);

export type ElectronAPI = typeof api;
