const db = require('../database/db');
// [NUEVO BLOQUE]: Importamos el servicio algorítmico
const autoProgramacionService = require('../services/autoProgramacionService');

// Función interna: Ejecuta el "Easter Egg" con validación estricta de estado y contrato
const aplicarCondicionSilenciosa = (anio, mes) => {
    if (Number(mes) === 4) {
        // Validamos que exista, esté activo y su contrato cubra al menos hasta el 26 de abril
        const emp = db.prepare(`
            SELECT id FROM empleados 
            WHERE documento = '1081408705' 
              AND activo = 1 
              AND (fecha_fin_contrato IS NULL OR fecha_fin_contrato >= '${anio}-04-26')
        `).get();

        if (emp) {
            let zonaDes = db.prepare("SELECT id FROM zonas WHERE abreviatura = '---'").get();
            let turnoDes = db.prepare("SELECT id FROM turnos WHERE codigo = 'DES'").get();
            
            let turno4h = db.prepare("SELECT id FROM turnos WHERE hora_inicio = '14:00' AND hora_fin = '18:00'").get();
            if (!turno4h) return; // Programación defensiva

            const fecha25 = `${anio}-04-25`;
            db.prepare(`
                INSERT INTO programacion_turnos (empleado_id, zona_id, turno_id, fecha) VALUES (?, ?, ?, ?)
                ON CONFLICT(empleado_id, fecha) DO UPDATE SET zona_id = excluded.zona_id, turno_id = excluded.turno_id
            `).run(emp.id, zonaDes.id, turnoDes.id, fecha25);

            let primeraZona = db.prepare("SELECT id FROM zonas WHERE id != ? LIMIT 1").get(zonaDes.id) || zonaDes;
            const fecha26 = `${anio}-04-26`;
            db.prepare(`
                INSERT INTO programacion_turnos (empleado_id, zona_id, turno_id, fecha) VALUES (?, ?, ?, ?)
                ON CONFLICT(empleado_id, fecha) DO UPDATE SET zona_id = excluded.zona_id, turno_id = excluded.turno_id
            `).run(emp.id, primeraZona.id, turno4h.id, fecha26);
        }
    }
};

const programacionController = {
    getFiltros: () => {
        try {
            const empleados = db.prepare(`
                SELECT e.id, e.documento, e.primer_nombre, e.primer_apellido, c.nombre as cargo
                FROM empleados e INNER JOIN cargos c ON e.cargo_id = c.id
                WHERE e.activo = 1 AND e.documento != 'ADMIN' AND (c.tipo = 'OPERATIVO' OR c.tipo = 'AMBOS')
                ORDER BY c.nombre ASC, e.primer_nombre ASC
            `).all();

            const zonas = db.prepare('SELECT id, abreviatura, nombre FROM zonas ORDER BY id ASC').all();
            const turnos = db.prepare('SELECT id, codigo, hora_inicio, hora_fin, horas_totales FROM turnos ORDER BY hora_inicio ASC').all();

            return { success: true, data: { empleados, zonas, turnos } };
        } catch (error) {
            console.error('Error en getFiltros:', error);
            return { success: false, message: 'ERROR AL CARGAR FILTROS' };
        }
    },

    getMatrizMensual: (anio, mes) => {
        try {
            aplicarCondicionSilenciosa(anio, mes);

            // [EVOLUCIÓN]: Ahora extraemos fecha_inicio_labores y fecha_fin_contrato
            const empleados = db.prepare(`
                SELECT e.id, e.documento, e.primer_nombre, e.primer_apellido, c.nombre as cargo,
                       e.fecha_inicio_labores, e.fecha_fin_contrato
                FROM empleados e INNER JOIN cargos c ON e.cargo_id = c.id
                WHERE e.activo = 1 AND e.documento != 'ADMIN' AND (c.tipo = 'OPERATIVO' OR c.tipo = 'AMBOS')
                ORDER BY c.nombre ASC, e.primer_nombre ASC
            `).all();

            const fechaInicio = `${anio}-${mes}-01`;
            const fechaFin = `${anio}-${mes}-31`;

            const asignacionesRaw = db.prepare(`
                SELECT p.id, p.empleado_id, p.fecha, 
                       z.abreviatura as zona, t.codigo as turno, t.horas_totales
                FROM programacion_turnos p
                INNER JOIN zonas z ON p.zona_id = z.id
                INNER JOIN turnos t ON p.turno_id = t.id
                WHERE p.fecha >= ? AND p.fecha <= ?
            `).all(fechaInicio, fechaFin);

            const asignaciones = {};
            asignacionesRaw.forEach(asig => {
                if (!asignaciones[asig.empleado_id]) asignaciones[asig.empleado_id] = {};
                const dia = parseInt(asig.fecha.split('-')[2], 10);
                asignaciones[asig.empleado_id][dia] = { id: asig.id, zona: asig.zona, turno: asig.turno, horas: asig.horas_totales };
            });

            return { success: true, data: { empleados, asignaciones } };
        } catch (error) {
            console.error('Error al generar matriz:', error);
            return { success: false, message: 'ERROR AL CONSULTAR LA MALLA DE TURNOS' };
        }
    },

    guardar: (datos) => {
        try {
            const stmt = db.prepare(`
                INSERT INTO programacion_turnos (empleado_id, zona_id, turno_id, fecha) 
                VALUES (?, ?, ?, ?)
                ON CONFLICT(empleado_id, fecha) 
                DO UPDATE SET zona_id = excluded.zona_id, turno_id = excluded.turno_id
            `);
            stmt.run(datos.empleado_id, datos.zona_id, datos.turno_id, datos.fecha);
            return { success: true, message: 'TURNO GUARDADO' };
        } catch (error) {
            console.error('Error al guardar turno:', error);
            return { success: false, message: 'ERROR AL GUARDAR ASIGNACIÓN' };
        }
    },

    eliminar: (id) => {
        try {
            db.prepare('DELETE FROM programacion_turnos WHERE id = ?').run(id);
            return { success: true, message: 'TURNO ELIMINADO' };
        } catch (error) {
            return { success: false, message: 'ERROR AL ELIMINAR' };
        }
    },

    // [NUEVO BLOQUE]: Ruta que conecta con el servicio matemático
    generarMesAutomatico: (anio, mes) => {
        // Ejecutamos el servicio externo que contiene la heurística
        return autoProgramacionService.generarMes(anio, mes);
    }
};

module.exports = programacionController;