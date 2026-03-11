const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

let dbPath;

// Gestión de rutas inteligente
if (app.isPackaged) {
    // En Producción: Carpeta segura del Sistema Operativo
    dbPath = path.join(app.getPath('userData'), 'siat_database.sqlite');
} else {
    // En Desarrollo: Carpeta del proyecto para fácil acceso y auditoría
    dbPath = path.join(__dirname, 'siat_database.sqlite');
}

// Instancia de la base de datos
const db = new Database(dbPath, { 
    // Solo muestra el SQL en consola si estamos en desarrollo
    verbose: !app.isPackaged ? console.log : null 
});

// Optimizaciones de rendimiento y seguridad
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

module.exports = db;