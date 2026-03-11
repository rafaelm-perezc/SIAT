const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // --- MÓDULOS BASE ---
    ping: () => ipcRenderer.invoke('ping'),
    
    // --- AUTENTICACIÓN Y SEGURIDAD ---
    // Recibe estrictamente un objeto con las credenciales { user, pass }
    authLogin: (credentials) => ipcRenderer.invoke('auth:login', credentials),
    // Recibe un objeto { userId, oldPassword, newPassword }
    cambiarPassword: (datos) => ipcRenderer.invoke('auth:cambiarPassword', datos),
    // Recibe el número de documento como string
    resetPasswordAdmin: (documento) => ipcRenderer.invoke('auth:resetPasswordAdmin', documento),
    
    // --- MÓDULO 4: Personal Operativo ---
    getEmpleados: () => ipcRenderer.invoke('empleados:get'),
    crearEmpleado: (datos) => ipcRenderer.invoke('empleados:crear', datos),
    importarEmpleadosExcel: (filePath) => ipcRenderer.invoke('empleados:importarExcel', filePath)
});