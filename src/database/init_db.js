const db = require('./db');
const bcrypt = require('bcryptjs');
const { app } = require('electron');

function inicializarBaseDeDatos() {
    console.log("=== Sincronizando Base de Datos (Evolución: Malla y Reglas 42h) ===");

    db.exec(`
        CREATE TABLE IF NOT EXISTS cargos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL UNIQUE,
            descripcion TEXT,
            tipo TEXT NOT NULL DEFAULT 'OPERATIVO'
        );

        CREATE TABLE IF NOT EXISTS empleados (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            documento TEXT UNIQUE NOT NULL,
            primer_nombre TEXT NOT NULL,
            segundo_nombre TEXT,
            primer_apellido TEXT NOT NULL,
            segundo_apellido TEXT,
            celular TEXT NOT NULL,
            contacto_emergencia_nombre TEXT NOT NULL,
            contacto_emergencia_celular TEXT NOT NULL,
            eps TEXT NOT NULL,
            tipo_sangre TEXT NOT NULL,
            cargo_id INTEGER NOT NULL,
            fecha_inicio_contrato DATE NOT NULL, 
            fecha_inicio_labores DATE NOT NULL,  
            fecha_fin_contrato DATE,             
            activo INTEGER DEFAULT 1,
            FOREIGN KEY (cargo_id) REFERENCES cargos (id) ON DELETE RESTRICT
        );

        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            empleado_id INTEGER NOT NULL UNIQUE, 
            usuario TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            rol TEXT NOT NULL, 
            firma_path TEXT, 
            debe_cambiar_password INTEGER DEFAULT 1, 
            activo INTEGER DEFAULT 1,
            FOREIGN KEY (empleado_id) REFERENCES empleados (id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS zonas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            abreviatura TEXT NOT NULL UNIQUE,
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

        CREATE TABLE IF NOT EXISTS reglas_jornada (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fecha_inicio DATE NOT NULL,
            fecha_fin DATE, 
            horas_semanales INTEGER NOT NULL,
            descripcion TEXT
        );

        CREATE TABLE IF NOT EXISTS programacion_turnos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            empleado_id INTEGER NOT NULL,
            zona_id INTEGER NOT NULL,
            turno_id INTEGER NOT NULL,
            fecha DATE NOT NULL,
            UNIQUE(empleado_id, fecha),
            FOREIGN KEY (empleado_id) REFERENCES empleados (id) ON DELETE CASCADE,
            FOREIGN KEY (zona_id) REFERENCES zonas (id) ON DELETE RESTRICT,
            FOREIGN KEY (turno_id) REFERENCES turnos (id) ON DELETE RESTRICT
        );
    `);

    const stmtCheckCargos = db.prepare('SELECT count(*) as count FROM cargos');
    if (stmtCheckCargos.get().count === 0) {
        db.prepare('INSERT INTO cargos (nombre, tipo) VALUES (?, ?)').run('ADMINISTRADOR DEL SISTEMA', 'ADMINISTRATIVO');
    }

    const adminDocUserPass = 'ADMIN';
    const stmtCheckUser = db.prepare('SELECT count(*) as count FROM usuarios WHERE usuario = ?');

    if (stmtCheckUser.get(adminDocUserPass).count === 0) {
        const cargoAdmin = db.prepare("SELECT id FROM cargos WHERE nombre = 'ADMINISTRADOR DEL SISTEMA'").get();

        const insertEmpleado = db.prepare(`
            INSERT INTO empleados (
                documento, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, 
                celular, contacto_emergencia_nombre, contacto_emergencia_celular, 
                eps, tipo_sangre, cargo_id, fecha_inicio_contrato, fecha_inicio_labores, fecha_fin_contrato
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const infoEmpleado = insertEmpleado.run(
            adminDocUserPass, 'SUPER', '', 'USUARIO', '', '0000000000', 'N/A', '0000000000', 
            'N/A', 'O+', cargoAdmin.id, '2024-01-01', '2024-01-01', null
        );

        const salt = bcrypt.genSaltSync(10);
        const hashPassword = bcrypt.hashSync(adminDocUserPass, salt);
        
        db.prepare('INSERT INTO usuarios (empleado_id, usuario, password, rol, debe_cambiar_password) VALUES (?, ?, ?, ?, ?)').run(
            infoEmpleado.lastInsertRowid, adminDocUserPass, hashPassword, 'SUPER USUARIO', 1
        );
    }

    const superUser = db.prepare("SELECT id, empleado_id FROM usuarios WHERE rol = 'SUPER USUARIO' LIMIT 1").get();
    if (superUser) {
        db.prepare('UPDATE usuarios SET usuario = ?, activo = 1 WHERE id = ?').run(adminDocUserPass, superUser.id);
        db.prepare('UPDATE empleados SET documento = ? WHERE id = ?').run(adminDocUserPass, superUser.empleado_id);
        const salt = bcrypt.genSaltSync(10);
        db.prepare('UPDATE usuarios SET password = ?, debe_cambiar_password = 0 WHERE id = ?').run(bcrypt.hashSync(adminDocUserPass, salt), superUser.id);
    }

    // [BLOQUE EVOLUCIONADO]: Aquí es donde el sistema sabe que el 15 de julio de 2026 cambia a 42h
    const stmtCheckReglas = db.prepare('SELECT count(*) as count FROM reglas_jornada');
    if (stmtCheckReglas.get().count === 0) {
        const stmtInsertRegla = db.prepare('INSERT INTO reglas_jornada (fecha_inicio, fecha_fin, horas_semanales, descripcion) VALUES (?, ?, ?, ?)');
        stmtInsertRegla.run('2024-07-16', '2026-07-14', 44, 'JORNADA LEY 2101 - 44H');
        stmtInsertRegla.run('2026-07-15', null, 42, 'JORNADA LEY 2101 - 42H'); // <--- Aplicación de la regla exigida
    }

    // [NUEVO BLOQUE]: Crear Zona y Turno de "Descanso" por defecto para la Malla
    const checkZonaDes = db.prepare("SELECT count(*) as count FROM zonas WHERE abreviatura = '---'").get();
    if (checkZonaDes.count === 0) db.prepare("INSERT INTO zonas (abreviatura, nombre, personal_requerido) VALUES ('---', 'DESCANSO / LIBRE', 0)").run();

    const checkTurnoDes = db.prepare("SELECT count(*) as count FROM turnos WHERE codigo = 'DES'").get();
    if (checkTurnoDes.count === 0) db.prepare("INSERT INTO turnos (codigo, hora_inicio, hora_fin, horas_totales) VALUES ('DES', '00:00', '00:00', 0)").run();

    console.log("=== SIAT: Base de datos lista para operar ===");
}

module.exports = inicializarBaseDeDatos;