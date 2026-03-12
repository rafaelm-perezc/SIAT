const db = require('../database/db');

const upper = (str) => str ? String(str).toUpperCase().trim() : '';

const zonaController = {
    getAll: () => {
        try {
            const stmt = db.prepare('SELECT * FROM zonas ORDER BY nombre ASC');
            return { success: true, data: stmt.all() };
        } catch (error) {
            console.error('Error en getAll zonas:', error);
            return { success: false, message: 'ERROR AL CONSULTAR LAS ZONAS' };
        }
    },

    crear: (datos) => {
        try {
            const abreviatura = upper(datos.abreviatura);
            const nombre = upper(datos.nombre);
            const personalRequerido = Number(datos.personal_requerido) || 1;

            if (!abreviatura || !nombre) return { success: false, message: 'LA ABREVIATURA Y EL NOMBRE SON OBLIGATORIOS' };
            if (personalRequerido < 1) return { success: false, message: 'EL PERSONAL REQUERIDO DEBE SER AL MENOS 1' };

            const stmt = db.prepare('INSERT INTO zonas (abreviatura, nombre, personal_requerido) VALUES (?, ?, ?)');
            stmt.run(abreviatura, nombre, personalRequerido);
            
            return { success: true, message: 'ZONA REGISTRADA EXITOSAMENTE' };
        } catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                return { success: false, message: 'YA EXISTE UNA ZONA CON ESTE NOMBRE O ABREVIATURA' };
            }
            console.error('Error al crear zona:', error);
            return { success: false, message: 'ERROR INTERNO AL GUARDAR LA ZONA' };
        }
    },

    actualizar: (datos) => {
        try {
            const id = Number(datos.id);
            const abreviatura = upper(datos.abreviatura);
            const nombre = upper(datos.nombre);
            const personalRequerido = Number(datos.personal_requerido) || 1;

            if (!abreviatura || !nombre) return { success: false, message: 'LA ABREVIATURA Y EL NOMBRE SON OBLIGATORIOS' };
            if (personalRequerido < 1) return { success: false, message: 'EL PERSONAL REQUERIDO DEBE SER AL MENOS 1' };

            const stmt = db.prepare('UPDATE zonas SET abreviatura = ?, nombre = ?, personal_requerido = ? WHERE id = ?');
            const result = stmt.run(abreviatura, nombre, personalRequerido, id);

            if (result.changes === 0) return { success: false, message: 'ZONA NO ENCONTRADA' };
            return { success: true, message: 'ZONA ACTUALIZADA EXITOSAMENTE' };
        } catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                return { success: false, message: 'YA EXISTE OTRA ZONA CON ESTE NOMBRE O ABREVIATURA' };
            }
            console.error('Error al actualizar zona:', error);
            return { success: false, message: 'ERROR INTERNO AL ACTUALIZAR LA ZONA' };
        }
    },

    eliminar: (id) => {
        try {
            const stmt = db.prepare('DELETE FROM zonas WHERE id = ?');
            const result = stmt.run(id);

            if (result.changes === 0) return { success: false, message: 'ZONA NO ENCONTRADA' };
            return { success: true, message: 'ZONA ELIMINADA EXITOSAMENTE' };
        } catch (error) {
            console.error('Error al eliminar zona:', error);
            return { success: false, message: 'ERROR INTERNO AL ELIMINAR LA ZONA' };
        }
    }
};

module.exports = zonaController;