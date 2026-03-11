const db = require('./db');
const bcrypt = require('bcryptjs');
const { app } = require('electron');

function inicializarBaseDeDatos() {
    console.log("=== Sincronizando Base de Datos de SIAT ===");

    // 1. Creación de tablas limpias (Sin restricciones de cargos específicas)
    db.exec(`
        -- Usuarios del Sistema: Flexibilidad total de roles
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre_completo TEXT NOT NULL,
            usuario TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            rol TEXT NOT NULL, -- Eliminado el CHECK para permitir cualquier cargo
            firma_path TEXT, 
            activo INTEGER DEFAULT 1
        );

        -- Personal Operativo: Con control de fin de contrato
        CREATE TABLE IF NOT EXISTS empleados (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            documento TEXT UNIQUE NOT NULL,
            nombres TEXT NOT NULL,
            apellidos TEXT NOT NULL,
            fecha_fin_contrato DATE NOT NULL,
            activo INTEGER DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS zonas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL UNIQUE,
            personal_requerido INTEGER DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS turnos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            codigo TEXT UNIQUE NOT NULL,
            hora_inicio TEXT NOT NULL,
            hora_fin TEXT NOT NULL,
            horas_totales REAL NOT NULL
        );

        -- El núcleo legal: 44h vs 42h (Ley 2101)
        CREATE TABLE IF NOT EXISTS reglas_jornada (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fecha_inicio DATE NOT NULL,
            fecha_fin DATE, 
            horas_semanales INTEGER NOT NULL,
            descripcion TEXT
        );
    `);

    // 2. Gestión del Super Usuario Inicial
    const adminUser = 'admin';
    const adminPass = 'Siat2026*';

    const stmtCheckUser = db.prepare('SELECT count(*) as count FROM usuarios WHERE usuario = ?');
    if (stmtCheckUser.get(adminUser).count === 0) {
        const salt = bcrypt.genSaltSync(10);
        const hashPassword = bcrypt.hashSync(adminPass, salt);

        const stmtInsertUser = db.prepare(`
            INSERT INTO usuarios (nombre_completo, usuario, password, rol) 
            VALUES (?, ?, ?, ?)
        `);
        stmtInsertUser.run('Administrador del Sistema', adminUser, hashPassword, 'Super Usuario');

        // Muestra credenciales en consola SOLO si estamos en modo desarrollo
        if (!app.isPackaged) {
            console.log("\x1b[33m%s\x1b[0m", "------------------------------------------------");
            console.log("\x1b[33m%s\x1b[0m", "SIAT - ACCESO INICIAL DE DESARROLLO");
            console.log("\x1b[32m%s\x1b[0m", `USUARIO: ${adminUser}`);
            console.log("\x1b[32m%s\x1b[0m", `CLAVE:   ${adminPass}`);
            console.log("\x1b[33m%s\x1b[0m", "------------------------------------------------");
        }
    }

    // 3. Reglas de la Ley 2101 (Se mantienen por ser el corazón del motor de turnos)
    const stmtCheckReglas = db.prepare('SELECT count(*) as count FROM reglas_jornada');
    if (stmtCheckReglas.get().count === 0) {
        const stmtInsertRegla = db.prepare('INSERT INTO reglas_jornada (fecha_inicio, fecha_fin, horas_semanales, descripcion) VALUES (?, ?, ?, ?)');
        stmtInsertRegla.run('2024-07-16', '2026-07-14', 44, 'Jornada 44h');
        stmtInsertRegla.run('2026-07-15', null, 42, 'Jornada 42h');
    }

    console.log("=== SIAT: Base de datos lista para operar ===");
}

// Exportamos el módulo para que main.js lo ejecute cuando Electron esté listo
module.exports = inicializarBaseDeDatos;