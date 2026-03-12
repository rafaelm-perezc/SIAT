const db = require('../database/db');

// Función de limpieza y forzado de mayúsculas
const upper = (str) => str ? String(str).toUpperCase().trim() : '';

const cargoController = {
    // 1. Obtener todos los cargos OCULTANDO EL ADMIN
    getAll: () => {
        try {
            // Filtramos para que el Administrador del Sistema no viaje a la interfaz gráfica
            const stmt = db.prepare("SELECT * FROM cargos WHERE nombre != 'ADMINISTRADOR DEL SISTEMA' ORDER BY nombre ASC");
            return { success: true, data: stmt.all() };
        } catch (error) {
            console.error('Error en getAll cargos:', error);
            return { success: false, message: 'ERROR AL CONSULTAR LOS CARGOS' };
        }
    },

    // 2. Crear un nuevo cargo
    crear: (cargoData) => {
        try {
            const nombre = upper(cargoData.nombre);
            const descripcion = cargoData.descripcion ? cargoData.descripcion.trim() : '';

            if (!nombre) {
                return { success: false, message: 'EL NOMBRE DEL CARGO ES OBLIGATORIO' };
            }

            const stmt = db.prepare('INSERT INTO cargos (nombre, descripcion) VALUES (?, ?)');
            stmt.run(nombre, descripcion);
            
            return { success: true, message: 'CARGO CREADO EXITOSAMENTE' };
        } catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                return { success: false, message: 'ESTE CARGO YA EXISTE EN EL SISTEMA' };
            }
            console.error('Error al crear cargo:', error);
            return { success: false, message: 'ERROR INTERNO AL GUARDAR EL CARGO' };
        }
    },

    // 3. Actualizar un cargo existente
    actualizar: (cargoData) => {
        try {
            const id = Number(cargoData.id);
            const nombre = upper(cargoData.nombre);
            const descripcion = cargoData.descripcion ? cargoData.descripcion.trim() : '';

            const cargoActual = db.prepare('SELECT nombre FROM cargos WHERE id = ?').get(id);
            if (!cargoActual) return { success: false, message: 'CARGO NO ENCONTRADO' };
            
            if (cargoActual.nombre === 'ADMINISTRADOR DEL SISTEMA') {
                return { success: false, message: 'SEGURIDAD: NO SE PUEDE MODIFICAR EL CARGO RAÍZ DEL SISTEMA' };
            }

            const stmt = db.prepare('UPDATE cargos SET nombre = ?, descripcion = ? WHERE id = ?');
            stmt.run(nombre, descripcion, id);

            return { success: true, message: 'CARGO ACTUALIZADO EXITOSAMENTE' };
        } catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                return { success: false, message: 'YA EXISTE OTRO CARGO CON ESTE NOMBRE' };
            }
            console.error('Error al actualizar cargo:', error);
            return { success: false, message: 'ERROR INTERNO AL ACTUALIZAR EL CARGO' };
        }
    },

    // 4. Eliminar un cargo
    eliminar: (id) => {
        try {
            const cargoActual = db.prepare('SELECT nombre FROM cargos WHERE id = ?').get(id);
            if (!cargoActual) return { success: false, message: 'CARGO NO ENCONTRADO' };
            
            if (cargoActual.nombre === 'ADMINISTRADOR DEL SISTEMA') {
                return { success: false, message: 'SEGURIDAD: NO SE PUEDE ELIMINAR EL CARGO RAÍZ DEL SISTEMA' };
            }

            const checkEmpleados = db.prepare('SELECT count(*) as count FROM empleados WHERE cargo_id = ?').get(id);
            if (checkEmpleados.count > 0) {
                return { 
                    success: false, 
                    message: `ACCIÓN DENEGADA: HAY ${checkEmpleados.count} EMPLEADO(S) ASIGNADO(S) A ESTE CARGO.` 
                };
            }

            const stmt = db.prepare('DELETE FROM cargos WHERE id = ?');
            stmt.run(id);

            return { success: true, message: 'CARGO ELIMINADO EXITOSAMENTE' };
        } catch (error) {
            console.error('Error al eliminar cargo:', error);
            return { success: false, message: 'ERROR INTERNO AL ELIMINAR EL CARGO' };
        }
    }
};

module.exports = cargoController;