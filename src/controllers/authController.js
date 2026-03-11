const db = require('../database/db');
const bcrypt = require('bcryptjs');

const authController = {
    login: (username, password) => {
        try {
            const stmt = db.prepare('SELECT * FROM usuarios WHERE usuario = ? AND activo = 1');
            const user = stmt.get(username);

            if (!user) return { success: false, message: 'Usuario no encontrado' };

            const match = bcrypt.compareSync(password, user.password);
            
            if (match) {
                const { password, ...userSession } = user;
                return { success: true, user: userSession };
            } else {
                return { success: false, message: 'Contraseña incorrecta' };
            }
        } catch (error) {
            console.error('Error en login:', error);
            return { success: false, message: 'Error interno del sistema' };
        }
    }
};

module.exports = authController;