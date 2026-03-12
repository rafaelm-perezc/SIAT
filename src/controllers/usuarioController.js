const db = require('../database/db');
const bcrypt = require('bcryptjs');

const usuarioController = {
    // 1. Obtener todos los usuarios con sus datos de empleado
    getAll: () => {
        try {
            const stmt = db.prepare(`
                SELECT u.id, u.usuario, u.rol, u.activo, u.debe_cambiar_password,
                       e.documento, e.primer_nombre, e.primer_apellido, c.nombre as cargo_nombre
                FROM usuarios u
                INNER JOIN empleados e ON u.empleado_id = e.id
                INNER JOIN cargos c ON e.cargo_id = c.id
                ORDER BY u.rol ASC, e.primer_nombre ASC
            `);
            return { success: true, data: stmt.all() };
        } catch (error) {
            console.error('Error en getAll usuarios:', error);
            return { success: false, message: 'ERROR AL CONSULTAR LOS USUARIOS' };
        }
    },

    // 2. Obtener lista de empleados que AÚN NO tienen cuenta de usuario
    getEmpleadosSinUsuario: () => {
        try {
            const stmt = db.prepare(`
                SELECT e.id, e.documento, e.primer_nombre, e.primer_apellido, c.nombre as cargo_nombre
                FROM empleados e
                INNER JOIN cargos c ON e.cargo_id = c.id
                WHERE e.id NOT IN (SELECT empleado_id FROM usuarios)
                ORDER BY e.primer_nombre ASC
            `);
            return { success: true, data: stmt.all() };
        } catch (error) {
            console.error('Error en getEmpleadosSinUsuario:', error);
            return { success: false, message: 'ERROR AL OBTENER EMPLEADOS DISPONIBLES' };
        }
    },

    // 3. Crear nuevo usuario (La clave por defecto es el documento)
    crear: (datos) => {
        try {
            // Verificar que el empleado exista
            const empleado = db.prepare('SELECT documento FROM empleados WHERE id = ?').get(datos.empleado_id);
            if (!empleado) return { success: false, message: 'EMPLEADO NO ENCONTRADO' };

            const usuarioDoc = empleado.documento; // El usuario de login será su número de documento
            
            // Encriptar la contraseña por defecto (su mismo documento)
            const salt = bcrypt.genSaltSync(10);
            const hashPassword = bcrypt.hashSync(usuarioDoc, salt); 

            const stmt = db.prepare(`
                INSERT INTO usuarios (empleado_id, usuario, password, rol, debe_cambiar_password, activo)
                VALUES (?, ?, ?, ?, 1, 1)
            `);
            // Se inserta forzando el rol en mayúsculas y obligando a cambiar la clave en el primer inicio (1)
            stmt.run(datos.empleado_id, usuarioDoc, hashPassword, String(datos.rol).toUpperCase());

            return { success: true, message: `USUARIO CREADO. CREDENCIAL POR DEFECTO: ${usuarioDoc}` };
        } catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return { success: false, message: 'ESTE EMPLEADO YA TIENE UNA CUENTA ASIGNADA' };
            console.error('Error al crear usuario:', error);
            return { success: false, message: 'ERROR INTERNO AL CREAR EL USUARIO' };
        }
    },

    // 4. Activar o Desactivar un usuario (Bloqueo de acceso)
    toggleActivo: (id) => {
        try {
            const usuario = db.prepare('SELECT usuario, activo FROM usuarios WHERE id = ?').get(id);
            if (!usuario) return { success: false, message: 'USUARIO NO ENCONTRADO' };

            // BLOQUEO DE SEGURIDAD: No permitir desactivar al super usuario raíz
            if (usuario.usuario === 'ADMIN') {
                return { success: false, message: 'SEGURIDAD: NO SE PUEDE DESACTIVAR AL ADMINISTRADOR RAÍZ' };
            }

            const nuevoEstado = usuario.activo === 1 ? 0 : 1;
            db.prepare('UPDATE usuarios SET activo = ? WHERE id = ?').run(nuevoEstado, id);
            
            return { success: true, message: nuevoEstado === 1 ? 'ACCESO HABILITADO' : 'ACCESO BLOQUEADO' };
        } catch (error) {
            console.error('Error en toggleActivo usuario:', error);
            return { success: false, message: 'ERROR AL CAMBIAR EL ESTADO DEL USUARIO' };
        }
    },

    // 5. Resetear Contraseña (Forzar a que vuelva a ser su documento)
    resetPassword: (id) => {
        try {
            const usuario = db.prepare('SELECT usuario FROM usuarios WHERE id = ?').get(id);
            if (!usuario) return { success: false, message: 'USUARIO NO ENCONTRADO' };

            // Encriptamos su mismo documento (usuario) como nueva clave
            const salt = bcrypt.genSaltSync(10);
            const hashPassword = bcrypt.hashSync(usuario.usuario, salt);

            // Actualizamos la clave y forzamos a que deba cambiarla en el próximo inicio (1)
            db.prepare('UPDATE usuarios SET password = ?, debe_cambiar_password = 1 WHERE id = ?').run(hashPassword, id);
            
            return { success: true, message: `CLAVE RESTABLECIDA EXITOSAMENTE A SU NÚMERO DE DOCUMENTO: ${usuario.usuario}` };
        } catch (error) {
            console.error('Error en resetPassword usuario:', error);
            return { success: false, message: 'ERROR AL RESTABLECER LA CONTRASEÑA' };
        }
    }
};

module.exports = usuarioController;