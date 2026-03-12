const db = require('../database/db');

const upper = (str) => str ? String(str).toUpperCase().trim() : '';

// =========================================================
// MOTOR DE CÁLCULO DE HORAS (EVOLUCIONADO)
// =========================================================
const calcularHorasTotales = (horaInicio, horaFin) => {
    const [hInicio, mInicio] = horaInicio.split(':').map(Number);
    const [hFin, mFin] = horaFin.split(':').map(Number);

    let inicioDecimal = hInicio + (mInicio / 60);
    let finDecimal = hFin + (mFin / 60);

    if (finDecimal < inicioDecimal) {
        finDecimal += 24; 
    }

    const totales = parseFloat((finDecimal - inicioDecimal).toFixed(2));
    
    // Separamos las horas (Máximo 8 ordinarias, el resto son extras)
    const ordinarias = totales > 8 ? 8 : totales;
    const extras = totales > 8 ? parseFloat((totales - 8).toFixed(2)) : 0;

    return { totales, ordinarias, extras };
};

const turnoController = {
    getAll: () => {
        try {
            const stmt = db.prepare('SELECT * FROM turnos ORDER BY hora_inicio ASC');
            return { success: true, data: stmt.all() };
        } catch (error) {
            console.error('Error en getAll turnos:', error);
            return { success: false, message: 'ERROR AL CONSULTAR LOS TURNOS' };
        }
    },

    crear: (datos) => {
        try {
            const codigo = upper(datos.codigo);
            const hora_inicio = datos.hora_inicio;
            const hora_fin = datos.hora_fin;

            if (!codigo || !hora_inicio || !hora_fin) {
                return { success: false, message: 'TODOS LOS CAMPOS SON OBLIGATORIOS' };
            }
            if (hora_inicio === hora_fin) {
                return { success: false, message: 'LA HORA DE INICIO Y FIN NO PUEDEN SER IGUALES' };
            }

            // Obtenemos los 3 valores de la nueva fórmula
            const { totales, ordinarias, extras } = calcularHorasTotales(hora_inicio, hora_fin);

            const stmt = db.prepare('INSERT INTO turnos (codigo, hora_inicio, hora_fin, horas_totales, horas_ordinarias, horas_extras) VALUES (?, ?, ?, ?, ?, ?)');
            stmt.run(codigo, hora_inicio, hora_fin, totales, ordinarias, extras);
            
            return { success: true, message: 'TURNO REGISTRADO EXITOSAMENTE' };
        } catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                return { success: false, message: 'YA EXISTE UN TURNO CON ESTE CÓDIGO' };
            }
            console.error('Error al crear turno:', error);
            return { success: false, message: 'ERROR INTERNO AL GUARDAR EL TURNO' };
        }
    },

    actualizar: (datos) => {
        try {
            const id = Number(datos.id);
            const codigo = upper(datos.codigo);
            const hora_inicio = datos.hora_inicio;
            const hora_fin = datos.hora_fin;

            if (!codigo || !hora_inicio || !hora_fin) {
                return { success: false, message: 'TODOS LOS CAMPOS SON OBLIGATORIOS' };
            }
            if (hora_inicio === hora_fin) {
                return { success: false, message: 'LA HORA DE INICIO Y FIN NO PUEDEN SER IGUALES' };
            }

            const { totales, ordinarias, extras } = calcularHorasTotales(hora_inicio, hora_fin);

            const stmt = db.prepare('UPDATE turnos SET codigo = ?, hora_inicio = ?, hora_fin = ?, horas_totales = ?, horas_ordinarias = ?, horas_extras = ? WHERE id = ?');
            const result = stmt.run(codigo, hora_inicio, hora_fin, totales, ordinarias, extras, id);

            if (result.changes === 0) return { success: false, message: 'TURNO NO ENCONTRADO' };
            return { success: true, message: 'TURNO ACTUALIZADO EXITOSAMENTE' };
        } catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                return { success: false, message: 'YA EXISTE OTRO TURNO CON ESTE CÓDIGO' };
            }
            console.error('Error al actualizar turno:', error);
            return { success: false, message: 'ERROR INTERNO AL ACTUALIZAR EL TURNO' };
        }
    },

    eliminar: (id) => {
        try {
            const stmt = db.prepare('DELETE FROM turnos WHERE id = ?');
            const result = stmt.run(id);

            if (result.changes === 0) return { success: false, message: 'TURNO NO ENCONTRADO' };
            return { success: true, message: 'TURNO ELIMINADO EXITOSAMENTE' };
        } catch (error) {
            console.error('Error al eliminar turno:', error);
            return { success: false, message: 'ERROR INTERNO AL ELIMINAR EL TURNO' };
        }
    }
};

module.exports = turnoController;