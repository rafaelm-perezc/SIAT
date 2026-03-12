const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const ejsElectron = require('ejs-electron');

// Controladores y Base de Datos
const inicializarBD = require('./src/database/init_db');
const authController = require('./src/controllers/authController');
const empleadoController = require('./src/controllers/empleadoController'); 

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 1024,
        minHeight: 768,
        show: false,
        icon: path.join(__dirname, 'assets', 'img', 'logo.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
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
    
    // Si el login es exitoso y NO requiere cambio de contraseña, inyectamos el usuario global
    if (result.success && !result.requirePasswordChange) {
        ejsElectron.data('currentUser', result.user);
        console.log(`Sesión iniciada: ${result.user.usuario} | Rol: ${result.user.rol}`);
    }
    
    return result;
});

ipcMain.handle('auth:cambiarPassword', async (event, { userId, oldPassword, newPassword }) => {
    return authController.cambiarPassword(userId, oldPassword, newPassword);
});

ipcMain.handle('auth:resetPassword', async (event, documento) => {
    return authController.resetPassword(documento);
});

// --- PERSONAL OPERATIVO ---
ipcMain.handle('empleados:get', async () => {
    return empleadoController.getAll();
});

ipcMain.handle('empleados:crear', async (event, datos) => {
    return empleadoController.crear(datos);
});

ipcMain.handle('empleados:actualizar', async (event, datos) => {
    return empleadoController.actualizar(datos);
});

ipcMain.handle('cargos:get', async () => {
    return empleadoController.getCargos();
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

ipcMain.handle('empleados:importarExcel', async (event, filePath) => {
    return empleadoController.cargarExcel(filePath);
});