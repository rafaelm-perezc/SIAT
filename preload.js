const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    ping: () => ipcRenderer.invoke('ping'),
    
    // Recibe estrictamente un objeto con las credenciales
    authLogin: (credentials) => ipcRenderer.invoke('auth:login', credentials),
});