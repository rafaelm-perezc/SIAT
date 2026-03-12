const db = require('../database/db');
const bcrypt = require('bcryptjs');

// Regex: Mín. 8 chars, 1 mayúscula, 1 minúscula, 1 número, 1 carácter especial
const validarPasswordSegura = (password) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    return regex.test(password);
};

const authController = {
    // 1. Proceso de Inicio de Sesión
    login: (username, password) => {
        try {
            // Buscamos al usuario y cruzamos con empleados para obtener su nombre real
            const stmt = db.prepare(`
                SELECT u.*, e.primer_nombre, e.primer_apellido
                FROM usuarios u
                INNER JOIN empleados e ON u.empleado_id = e.id
                WHERE u.usuario = ? AND u.activo = 1
            `);
            const user = stmt.get(String(username).trim().toUpperCase());

            if (!user) return { success: false, message: 'Usuario no encontrado' };

            // Verificamos la contraseña encriptada
            const match = bcrypt.compareSync(password, user.password);
            
            if (match) {
                // Separamos la contraseña del resto de datos por seguridad
                const { password, ...userSession } = user;
                // Reconstruimos el nombre completo para la interfaz
                userSession.nombre_completo = `${userSession.primer_nombre} ${userSession.primer_apellido}`;
                
                // Verificamos si es su primer ingreso o si requiere cambio de clave
                if (user.debe_cambiar_password === 1) {
                    return { success: true, requirePasswordChange: true, user: userSession };
                }

                // Acceso normal permitido
                return { success: true, requirePasswordChange: false, user: userSession };
            } else {
                return { success: false, message: 'Contraseña incorrecta' };
            }
        } catch (error) {
            console.error('Error en login:', error);
            return { success: false, message: 'Error interno del sistema' };
        }
    },

    // 2. Cambio de Contraseña (Obligatorio o Voluntario)
    cambiarPassword: (userId, oldPassword, newPassword) => {
        try {
            const user = db.prepare('SELECT password FROM usuarios WHERE id = ?').get(userId);
            if (!user) return { success: false, message: 'Usuario no válido' };

            // 1. Validar que el usuario conoce su contraseña actual
            if (!bcrypt.compareSync(oldPassword, user.password)) {
                return { success: false, message: 'La contraseña actual no es correcta' };
            }

            // 2. Validar reglas de seguridad corporativas
            if (!validarPasswordSegura(newPassword)) {
                return { 
                    success: false, 
                    message: 'La nueva contraseña debe tener mínimo 8 caracteres, incluir mayúsculas, minúsculas, números y caracteres especiales.' 
                };
            }

            // 3. Encriptar y aplicar el cambio
            const salt = bcrypt.genSaltSync(10);
            const hashPassword = bcrypt.hashSync(newPassword, salt);

            // Actualizamos la clave y marcamos que ya no necesita cambiarla
            db.prepare('UPDATE usuarios SET password = ?, debe_cambiar_password = 0 WHERE id = ?')
              .run(hashPassword, userId);

            return { success: true, message: 'Contraseña actualizada exitosamente' };
        } catch (error) {
            console.error('Error al cambiar password:', error);
            return { success: false, message: 'Error al cambiar la contraseña' };
        }
    },

    // 3. Restablecimiento por documento desde el login
    resetPassword: (empleadoDocumento) => {
        try {
            const documento = String(empleadoDocumento || '').trim();
            if (!documento) {
                return { success: false, message: 'Documento inválido' };
            }

            const salt = bcrypt.genSaltSync(10);
            // La contraseña se restablece temporalmente al número de documento
            const hashPassword = bcrypt.hashSync(documento, salt);

            // Actualizamos la clave y forzamos el cambio para el próximo inicio
            const result = db.prepare(`
                UPDATE usuarios 
                SET password = ?, debe_cambiar_password = 1 
                WHERE usuario = ? AND activo = 1
            `).run(hashPassword, documento);

            if (result.changes === 0) return { success: false, message: 'Usuario no encontrado' };
            return { success: true, message: 'Contraseña restablecida al número de documento del empleado.' };
        } catch (error) {
            console.error('Error en resetPassword:', error);
            return { success: false, message: 'Error al restablecer la contraseña' };
        }
    }
};

module.exports = authController;