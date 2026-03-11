const db = require('./db');
const bcrypt = require('bcryptjs');

function inicializarBaseDeDatos() {
    console.log("Iniciando la construcción de la base de datos SIAT...");

    // 1. Crear las tablas principales
    db.exec(`
        -- Tabla de Usuarios del Sistema (Solo nacerá con el Super Usuario)
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre_completo TEXT NOT NULL,
            usuario TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            rol TEXT CHECK(rol IN ('Super Usuario', 'Gerente', 'Jefe Operativo')) NOT NULL,
            firma_path TEXT, 
            activo INTEGER DEFAULT 1
        );

        -- Tabla del Personal Operativo (Actualizada con fecha de contrato)
        CREATE TABLE IF NOT EXISTS empleados (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            documento TEXT UNIQUE NOT NULL,
            nombres TEXT NOT NULL,
            apellidos TEXT NOT NULL,
            fecha_fin_contrato DATE NOT NULL, -- NUEVO: Vital para el motor de turnos
            activo INTEGER DEFAULT 1
        );

        -- Tabla de Zonas de la Terminal
        CREATE TABLE IF NOT EXISTS zonas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL UNIQUE,
            personal_requerido INTEGER DEFAULT 1
        );

        -- Catálogo de Turnos 
        CREATE TABLE IF NOT EXISTS turnos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            codigo TEXT UNIQUE NOT NULL,
            hora_inicio TEXT NOT NULL,
            hora_fin TEXT NOT NULL,
            horas_totales REAL NOT NULL
        );

        -- Tabla Paramétrica de la Ley 2101 (Reglas de Jornada)
        CREATE TABLE IF NOT EXISTS reglas_jornada (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fecha_inicio DATE NOT NULL,
            fecha_fin DATE, 
            horas_semanales INTEGER NOT NULL,
            descripcion TEXT
        );
    `);

    console.log("Tablas creadas correctamente.");

    // 2. Insertar ÚNICAMENTE el Super Usuario inicial
    const stmtCheckUser = db.prepare('SELECT count(*) as count FROM usuarios WHERE usuario = ?');
    const userExists = stmtCheckUser.get('admin').count > 0;

    if (!userExists) {
        const salt = bcrypt.genSaltSync(10);
        const hashPassword = bcrypt.hashSync('Siat2026*', salt);

        const stmtInsertUser = db.prepare(`
            INSERT INTO usuarios (nombre_completo, usuario, password, rol) 
            VALUES (?, ?, ?, ?)
        `);
        stmtInsertUser.run('Administrador del Sistema', 'admin', hashPassword, 'Super Usuario');
        console.log("Super Usuario 'admin' creado con éxito (Contraseña: Siat2026*).");
    }

    // 3. Insertar las reglas de la Ley 2101
    const stmtCheckReglas = db.prepare('SELECT count(*) as count FROM reglas_jornada');
    if (stmtCheckReglas.get().count === 0) {
        const stmtInsertRegla = db.prepare(`
            INSERT INTO reglas_jornada (fecha_inicio, fecha_fin, horas_semanales, descripcion) 
            VALUES (?, ?, ?, ?)
        `);
        stmtInsertRegla.run('2024-07-16', '2026-07-14', 44, 'Jornada 44h - Fase 2 Ley 2101');
        stmtInsertRegla.run('2026-07-15', null, 42, 'Jornada 42h - Fase 3 Ley 2101');
        console.log("Reglas paramétricas de la Ley 2101 insertadas.");
    }

    // 4. Insertar zonas operativas base
    const stmtCheckZonas = db.prepare('SELECT count(*) as count FROM zonas');
    if (stmtCheckZonas.get().count === 0) {
        const insertZona = db.prepare('INSERT INTO zonas (nombre, personal_requerido) VALUES (?, ?)');
        insertZona.run('Plataforma de Abordaje', 3);
        insertZona.run('Caseta de Control', 2);
        insertZona.run('Validación Externa', 1);
        console.log("Zonas operativas base creadas.");
    }

    console.log("=== Base de datos SIAT inicializada con éxito ===");
}

inicializarBaseDeDatos();