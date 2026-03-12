const db = require('../database/db');

// Función auxiliar para convertir todo a mayúsculas
const upper = (str) => str ? String(str).toUpperCase().trim() : '';

// =========================================================
// MOTOR DE CÁLCULO DE HORAS
// =========================================================
// Calcula la diferencia en horas entre dos cadenas "HH:MM"
// Soporta turnos nocturnos que cruzan la medianoche (ej. 22:00 a 06:00)
const calcularHorasTotales = (horaInicio, horaFin) => {
    const [hInicio, mInicio] = horaInicio.split(':').map(Number);
    const [hFin, mFin] = horaFin.split(':').map(Number);

    let inicioDecimal = hInicio + (mInicio / 60);
    let finDecimal = hFin + (mFin / 60);

    // Si la hora de fin es numéricamente menor a la de inicio, significa que pasa al día siguiente
    if (finDecimal < inicioDecimal) {
        finDecimal += 24; // Sumamos 24 horas para hacer el cálculo lineal
    }

    // Retorna la diferencia redondeada a 2 decimales (ej. 8.5 horas)
    return parseFloat((finDecimal - inicioDecimal).toFixed(2));
};

const turnoController = {
    // 1. Obtener todos los turnos registrados
    getAll: () => {
        try {
            const stmt = db.prepare('SELECT * FROM turnos ORDER BY hora_inicio ASC');
            return { success: true, data: stmt.all() };
        } catch (error) {
            console.error('Error en getAll turnos:', error);
            return { success: false, message: 'ERROR AL CONSULTAR LOS TURNOS' };
        }
    },

    // 2. Crear un nuevo turno
    crear: (datos) => {
        try {
            const codigo = upper(datos.codigo);
            const hora_inicio = datos.hora_inicio;
            const hora_fin = datos.hora_fin;

            // Validaciones de seguridad
            if (!codigo || !hora_inicio || !hora_fin) {
                return { success: false, message: 'TODOS LOS CAMPOS SON OBLIGATORIOS' };
            }
            if (hora_inicio === hora_fin) {
                return { success: false, message: 'LA HORA DE INICIO Y FIN NO PUEDEN SER IGUALES' };
            }

            // Calculamos automáticamente la duración
            const horas_totales = calcularHorasTotales(hora_inicio, hora_fin);

            const stmt = db.prepare('INSERT INTO turnos (codigo, hora_inicio, hora_fin, horas_totales) VALUES (?, ?, ?, ?)');
            stmt.run(codigo, hora_inicio, hora_fin, horas_totales);
            
            return { success: true, message: 'TURNO REGISTRADO EXITOSAMENTE' };
        } catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                return { success: false, message: 'YA EXISTE UN TURNO CON ESTE CÓDIGO' };
            }
            console.error('Error al crear turno:', error);
            return { success: false, message: 'ERROR INTERNO AL GUARDAR EL TURNO' };
        }
    },

    // 3. Actualizar un turno existente
    actualizar: (datos) => {
        try {
            const id = Number(datos.id);
            const codigo = upper(datos.codigo);
            const hora_inicio = datos.hora_inicio;
            const hora_fin = datos.hora_fin;

            // Validaciones
            if (!codigo || !hora_inicio || !hora_fin) {
                return { success: false, message: 'TODOS LOS CAMPOS SON OBLIGATORIOS' };
            }
            if (hora_inicio === hora_fin) {
                return { success: false, message: 'LA HORA DE INICIO Y FIN NO PUEDEN SER IGUALES' };
            }

            // Recalculamos las horas por si modificaron el horario
            const horas_totales = calcularHorasTotales(hora_inicio, hora_fin);

            const stmt = db.prepare('UPDATE turnos SET codigo = ?, hora_inicio = ?, hora_fin = ?, horas_totales = ? WHERE id = ?');
            const result = stmt.run(codigo, hora_inicio, hora_fin, horas_totales, id);

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

    // 4. Eliminar un turno
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