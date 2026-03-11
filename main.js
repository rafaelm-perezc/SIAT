const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const ejsElectron = require('ejs-electron');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 1024,
        minHeight: 768,
        show: false, // Ocultamos hasta que cargue para evitar parpadeos blancos
        webPreferences: {
            nodeIntegration: false, // Seguridad estricta
            contextIsolation: true, // Aislamiento del frontend
            preload: path.join(__dirname, 'preload.js') // El puente IPC
        }
    });

    // Podemos pasar variables globales desde Node.js a EJS así:
    ejsElectron.data('appVersion', app.getVersion());

    // Cargamos la vista inicial (crearemos este index.ejs en el paso 4)
    mainWindow.loadFile(path.join(__dirname, 'src', 'views', 'index.ejs'));

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.maximize();
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// --- Canales IPC (Backend) ---
ipcMain.handle('ping', () => '¡Conexión segura con Node.js y EJS establecida exitosamente!');