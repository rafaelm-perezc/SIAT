const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    ping: () => ipcRenderer.invoke('ping'),
    
    authLogin: (credentials) => ipcRenderer.invoke('auth:login', credentials),
    cambiarPassword: (datos) => ipcRenderer.invoke('auth:cambiarPassword', datos),
    resetPassword: (documento) => ipcRenderer.invoke('auth:resetPassword', documento),
    
    // --- DASHBOARD ---
    getDashboardStats: () => ipcRenderer.invoke('dashboard:getStats'),
    
    getEmpleados: () => ipcRenderer.invoke('empleados:get'),
    crearEmpleado: (datos) => ipcRenderer.invoke('empleados:crear', datos),
    actualizarEmpleado: (datos) => ipcRenderer.invoke('empleados:actualizar', datos),
    getCargos: () => ipcRenderer.invoke('cargos:get'),
    descargarPlantilla: () => ipcRenderer.invoke('empleados:descargarPlantilla'),
    importarEmpleadosExcel: (filePath) => ipcRenderer.invoke('empleados:importarExcel', filePath),

    getAllZonas: () => ipcRenderer.invoke('zonas:getAll'),
    crearZona: (datos) => ipcRenderer.invoke('zonas:crear', datos),
    actualizarZona: (datos) => ipcRenderer.invoke('zonas:actualizar', datos),
    eliminarZona: (id) => ipcRenderer.invoke('zonas:eliminar', id),

    // [NUEVO BLOQUE]: --- MOTOR DE TURNOS ---
    // Funciones inyectadas de forma segura a la ventana del navegador
    getAllTurnos: () => ipcRenderer.invoke('turnos:getAll'),
    crearTurno: (datos) => ipcRenderer.invoke('turnos:crear', datos),
    actualizarTurno: (datos) => ipcRenderer.invoke('turnos:actualizar', datos),
    eliminarTurno: (id) => ipcRenderer.invoke('turnos:eliminar', id),

    getAllCargos: () => ipcRenderer.invoke('cargos:getAll'),
    crearCargo: (datos) => ipcRenderer.invoke('cargos:crear', datos),
    actualizarCargo: (datos) => ipcRenderer.invoke('cargos:actualizar', datos),
    eliminarCargo: (id) => ipcRenderer.invoke('cargos:eliminar', id),

    getAllUsuarios: () => ipcRenderer.invoke('usuarios:getAll'),
    getEmpleadosSinUsuario: () => ipcRenderer.invoke('usuarios:getSinUsuario'),
    crearUsuario: (datos) => ipcRenderer.invoke('usuarios:crear', datos),
    toggleUsuarioActivo: (id) => ipcRenderer.invoke('usuarios:toggleActivo', id),
    resetPasswordUsuario: (id) => ipcRenderer.invoke('usuarios:resetPassword', id)
});