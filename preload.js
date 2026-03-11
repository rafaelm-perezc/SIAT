const { contextBridge, ipcRenderer } = require('electron');

// Exponemos la API "window.api" al frontend (EJS)
contextBridge.exposeInMainWorld('api', {
    // Canal de prueba para validar que el puente funciona
    ping: () => ipcRenderer.invoke('ping'),
    
    // Aquí agregaremos más adelante:
    // login: (credenciales) => ipcRenderer.invoke('auth:login', credenciales),
    // getEmpleados: () => ipcRenderer.invoke('db:empleados')
});