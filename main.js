const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const ejsElectron = require('ejs-electron');

// --- SILENCIAR LOGS MOLESTOS NATIVOS DE CHROMIUM (Autofill, etc.) ---
app.commandLine.appendSwitch('log-level', '3');

// --- ATRAPADORES DE ERRORES GLOBALES EN TERMINAL NODE ---
process.on('uncaughtException', (error) => {
    console.error('\n⛔ [SIAT ERROR CRÍTICO NODE]:', error);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('\n⛔ [SIAT PROMESA RECHAZADA NODE]:', reason);
});

// Controladores y Base de Datos
const inicializarBD = require('./src/database/init_db');
const authController = require('./src/controllers/authController');
const empleadoController = require('./src/controllers/empleadoController'); 
const cargoController = require('./src/controllers/cargoController'); 
const usuarioController = require('./src/controllers/usuarioController');
const zonaController = require('./src/controllers/zonaController'); 
const dashboardController = require('./src/controllers/dashboardController'); 
const turnoController = require('./src/controllers/turnoController'); 
const programacionController = require('./src/controllers/programacionController'); 

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 1024,
        minHeight: 768,
        show: false,
        icon: path.join(__dirname, 'assets', 'img', 'logoTerminal.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
        if (message.includes('Autofill.enable') || message.includes('Autofill.setAddresses')) {
            event.preventDefault(); 
        }
    });

    if (app.isPackaged) {
        mainWindow.removeMenu();
        mainWindow.setMenuBarVisibility(false);
        mainWindow.autoHideMenuBar = true;
    } else {
        mainWindow.setMenuBarVisibility(true);
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }

    ejsElectron.data('appVersion', app.getVersion());
    ejsElectron.data('currentUser', null); 

    mainWindow.loadFile(path.join(__dirname, 'src', 'views', 'auth', 'login.ejs'));

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.maximize();
    });
}

app.whenReady().then(() => {
    try {
        inicializarBD();
        console.log("SIAT: Base de datos sincronizada.");
    } catch (err) {
        console.error("SIAT ERROR (DB):", err);
    }

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// ==========================================
// --- CANALES DE COMUNICACIÓN IPC ---
// ==========================================

ipcMain.handle('ping', () => '¡Conexión segura establecida!');

// --- AUTENTICACIÓN Y SEGURIDAD ---
ipcMain.handle('auth:login', async (event, { user, pass }) => {
    const result = authController.login(user, pass);
    if (result.success && !result.requirePasswordChange) {
        ejsElectron.data('currentUser', result.user);
        console.log(`Sesión iniciada: ${result.user.usuario} | Rol: ${result.user.rol}`);
    }
    return result;
});
ipcMain.handle('auth:cambiarPassword', async (event, { userId, oldPassword, newPassword }) => authController.cambiarPassword(userId, oldPassword, newPassword));
ipcMain.handle('auth:resetPassword', async (event, documento) => authController.resetPassword(documento));

// --- DASHBOARD ---
ipcMain.handle('dashboard:getStats', async () => dashboardController.getStats());

// --- PERSONAL OPERATIVO ---
ipcMain.handle('empleados:get', async () => empleadoController.getAll());
ipcMain.handle('empleados:crear', async (event, datos) => empleadoController.crear(datos));
ipcMain.handle('empleados:actualizar', async (event, datos) => empleadoController.actualizar(datos));
ipcMain.handle('cargos:get', async () => empleadoController.getCargos());

// [NUEVO BLOQUE]: Ruta IPC para abrir el explorador de archivos nativo y obtener la ruta segura
ipcMain.handle('empleados:seleccionarExcel', async () => {
    const resultadoDialogo = await dialog.showOpenDialog(mainWindow, {
        title: 'Seleccionar Archivo de Empleados',
        filters: [{ name: 'Archivos Excel', extensions: ['xlsx', 'xls'] }],
        properties: ['openFile'] // Solo permite seleccionar archivos, no carpetas
    });

    if (resultadoDialogo.canceled || resultadoDialogo.filePaths.length === 0) {
        return null; // El usuario cerró la ventana sin seleccionar nada
    }
    
    return resultadoDialogo.filePaths[0]; // Retorna la ruta física real y segura
});

ipcMain.handle('empleados:descargarPlantilla', async () => {
    const resultadoDialogo = await dialog.showSaveDialog(mainWindow, {
        title: 'Guardar plantilla de personal',
        defaultPath: 'Plantilla_Personal_SIAT.xlsx',
        filters: [{ name: 'Archivo Excel', extensions: ['xlsx'] }]
    });

    if (resultadoDialogo.canceled || !resultadoDialogo.filePath) {
        return { canceled: true };
    }
    
    return empleadoController.generarPlantilla(resultadoDialogo.filePath);
});
ipcMain.handle('empleados:importarExcel', async (event, filePath) => empleadoController.cargarExcel(filePath));

// --- ZONAS E INFRAESTRUCTURA ---
ipcMain.handle('zonas:getAll', async () => zonaController.getAll());
ipcMain.handle('zonas:crear', async (event, datos) => zonaController.crear(datos));
ipcMain.handle('zonas:actualizar', async (event, datos) => zonaController.actualizar(datos));
ipcMain.handle('zonas:eliminar', async (event, id) => zonaController.eliminar(id));

// --- MOTOR DE TURNOS ---
ipcMain.handle('turnos:getAll', async () => turnoController.getAll());
ipcMain.handle('turnos:crear', async (event, datos) => turnoController.crear(datos));
ipcMain.handle('turnos:actualizar', async (event, datos) => turnoController.actualizar(datos));
ipcMain.handle('turnos:eliminar', async (event, id) => turnoController.eliminar(id));

// --- PROGRAMACIÓN Y MALLA DE TURNOS ---
ipcMain.handle('programacion:getFiltros', async () => programacionController.getFiltros());
ipcMain.handle('programacion:getMatriz', async (event, { anio, mes }) => programacionController.getMatrizMensual(anio, mes));
ipcMain.handle('programacion:guardar', async (event, datos) => programacionController.guardar(datos));
ipcMain.handle('programacion:eliminar', async (event, id) => programacionController.eliminar(id));
ipcMain.handle('programacion:autoGenerar', async (event, { anio, mes }) => programacionController.generarMesAutomatico(anio, mes));

// --- CONFIGURACIÓN: CARGOS ---
ipcMain.handle('cargos:getAll', async () => cargoController.getAll());
ipcMain.handle('cargos:crear', async (event, datos) => cargoController.crear(datos));
ipcMain.handle('cargos:actualizar', async (event, datos) => cargoController.actualizar(datos));
ipcMain.handle('cargos:eliminar', async (event, id) => cargoController.eliminar(id));

// --- CONFIGURACIÓN: USUARIOS ---
ipcMain.handle('usuarios:getAll', async () => usuarioController.getAll());
ipcMain.handle('usuarios:getSinUsuario', async () => usuarioController.getEmpleadosSinUsuario());
ipcMain.handle('usuarios:crear', async (event, datos) => usuarioController.crear(datos));
ipcMain.handle('usuarios:toggleActivo', async (event, id) => usuarioController.toggleActivo(id));
ipcMain.handle('usuarios:resetPassword', async (event, id) => usuarioController.resetPassword(id));