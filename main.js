const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const ejsElectron = require('ejs-electron');

const inicializarBD = require('./src/database/init_db');
const authController = require('./src/controllers/authController');

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

// --- CANALES IPC ---
ipcMain.handle('ping', () => '¡Conexión segura establecida!');

ipcMain.handle('auth:login', async (event, { user, pass }) => {
    const result = authController.login(user, pass);
    
    if (result.success) {
        ejsElectron.data('currentUser', result.user);
        console.log(`Sesión iniciada: ${result.user.usuario} | Rol: ${result.user.rol}`);
    }
    
    return result;
});