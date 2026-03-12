const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    ping: () => ipcRenderer.invoke('ping'),
    authLogin: (credentials) => ipcRenderer.invoke('auth:login', credentials),
    cambiarPassword: (datos) => ipcRenderer.invoke('auth:cambiarPassword', datos),
    resetPassword: (documento) => ipcRenderer.invoke('auth:resetPassword', documento),
    
    getDashboardStats: () => ipcRenderer.invoke('dashboard:getStats'),
    
    // --- PERSONAL OPERATIVO ---
    getEmpleados: () => ipcRenderer.invoke('empleados:get'),
    crearEmpleado: (datos) => ipcRenderer.invoke('empleados:crear', datos),
    actualizarEmpleado: (datos) => ipcRenderer.invoke('empleados:actualizar', datos),
    getCargos: () => ipcRenderer.invoke('cargos:get'),
    descargarPlantilla: () => ipcRenderer.invoke('empleados:descargarPlantilla'),
    // [NUEVO BLOQUE]: Exposición del método para llamar al explorador de archivos nativo
    seleccionarArchivoExcel: () => ipcRenderer.invoke('empleados:seleccionarExcel'),
    importarEmpleadosExcel: (filePath) => ipcRenderer.invoke('empleados:importarExcel', filePath),

    getAllZonas: () => ipcRenderer.invoke('zonas:getAll'),
    crearZona: (datos) => ipcRenderer.invoke('zonas:crear', datos),
    actualizarZona: (datos) => ipcRenderer.invoke('zonas:actualizar', datos),
    eliminarZona: (id) => ipcRenderer.invoke('zonas:eliminar', id),

    getAllTurnos: () => ipcRenderer.invoke('turnos:getAll'),
    crearTurno: (datos) => ipcRenderer.invoke('turnos:crear', datos),
    actualizarTurno: (datos) => ipcRenderer.invoke('turnos:actualizar', datos),
    eliminarTurno: (id) => ipcRenderer.invoke('turnos:eliminar', id),

    getProgramacionFiltros: () => ipcRenderer.invoke('programacion:getFiltros'),
    getProgramacionMatriz: (anio, mes) => ipcRenderer.invoke('programacion:getMatriz', { anio, mes }),
    guardarProgramacion: (datos) => ipcRenderer.invoke('programacion:guardar', datos),
    eliminarProgramacion: (id) => ipcRenderer.invoke('programacion:eliminar', id),
    autoGenerarProgramacion: (anio, mes) => ipcRenderer.invoke('programacion:autoGenerar', { anio, mes }),

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