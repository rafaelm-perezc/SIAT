const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

let dbPath;

// Detectamos el entorno automáticamente
if (app.isPackaged) {
    // Entorno de Producción (Software instalado)
    // Se guarda en la ruta segura de datos de la aplicación del OS (ej. %APPDATA%)
    dbPath = path.join(app.getPath('userData'), 'siat_database.sqlite');
} else {
    // Entorno de Desarrollo (npm start)
    // Se guarda exactamente en src/database/ para fácil acceso
    dbPath = path.join(__dirname, 'siat_database.sqlite');
}

// Instanciamos la base de datos
// Condicionamos el "verbose" para que no llene la consola en producción, solo en desarrollo
const db = new Database(dbPath, { 
    verbose: !app.isPackaged ? console.log : null 
});

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

module.exports = db;