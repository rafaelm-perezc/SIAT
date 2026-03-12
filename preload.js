const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // --- MÓDULOS BASE ---
    ping: () => ipcRenderer.invoke('ping'),
    
    // --- AUTENTICACIÓN Y SEGURIDAD ---
    authLogin: (credentials) => ipcRenderer.invoke('auth:login', credentials),
    cambiarPassword: (datos) => ipcRenderer.invoke('auth:cambiarPassword', datos),
    resetPassword: (documento) => ipcRenderer.invoke('auth:resetPassword', documento),
    
    // --- MÓDULO 4: Personal Operativo ---
    getEmpleados: () => ipcRenderer.invoke('empleados:get'),
    crearEmpleado: (datos) => ipcRenderer.invoke('empleados:crear', datos),
    actualizarEmpleado: (datos) => ipcRenderer.invoke('empleados:actualizar', datos),
    getCargos: () => ipcRenderer.invoke('cargos:get'),
    descargarPlantilla: () => ipcRenderer.invoke('empleados:descargarPlantilla'),
    importarEmpleadosExcel: (filePath) => ipcRenderer.invoke('empleados:importarExcel', filePath),

    // --- MÓDULO 5: Configuración (CRUD Cargos) ---
    getAllCargos: () => ipcRenderer.invoke('cargos:getAll'),
    crearCargo: (datos) => ipcRenderer.invoke('cargos:crear', datos),
    actualizarCargo: (datos) => ipcRenderer.invoke('cargos:actualizar', datos),
    eliminarCargo: (id) => ipcRenderer.invoke('cargos:eliminar', id),

    // --- MÓDULO 5: Configuración (CRUD Usuarios) ---
    getAllUsuarios: () => ipcRenderer.invoke('usuarios:getAll'),
    getEmpleadosSinUsuario: () => ipcRenderer.invoke('usuarios:getSinUsuario'),
    crearUsuario: (datos) => ipcRenderer.invoke('usuarios:crear', datos),
    toggleUsuarioActivo: (id) => ipcRenderer.invoke('usuarios:toggleActivo', id),
    resetPasswordUsuario: (id) => ipcRenderer.invoke('usuarios:resetPassword', id)
});