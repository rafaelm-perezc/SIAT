const db = require('../database/db');

const dashboardController = {
    getStats: () => {
        try {
            // 1. Contar Zonas Activas registradas
            const stmtZonas = db.prepare('SELECT count(*) as total FROM zonas');
            const totalZonas = stmtZonas.get().total;

            // 2. Contar Personal Operativo 
            // (Empleados activos cuyo cargo sea OPERATIVO o AMBOS, excluyendo al ADMIN)
            const stmtOperativos = db.prepare(`
                SELECT count(e.id) as total 
                FROM empleados e
                INNER JOIN cargos c ON e.cargo_id = c.id
                WHERE e.activo = 1 
                  AND e.documento != 'ADMIN'
                  AND (c.tipo = 'OPERATIVO' OR c.tipo = 'AMBOS')
            `);
            const totalOperativos = stmtOperativos.get().total;

            // 3. Obtener el límite de jornada actual (el más reciente activo según Ley 2101)
            const stmtJornada = db.prepare(`
                SELECT horas_semanales 
                FROM reglas_jornada 
                WHERE fecha_inicio <= date('now') 
                  AND (fecha_fin IS NULL OR fecha_fin >= date('now'))
                ORDER BY fecha_inicio DESC LIMIT 1
            `);
            const limiteJornada = stmtJornada.get()?.horas_semanales || 47; // 47h por defecto si falla

            return {
                success: true,
                data: {
                    zonasActivas: totalZonas,
                    personalOperativo: totalOperativos,
                    limiteJornada: limiteJornada
                }
            };
        } catch (error) {
            console.error('Error en getDashboardStats:', error);
            return { success: false, message: 'ERROR AL OBTENER LAS ESTADÍSTICAS DEL DASHBOARD' };
        }
    }
};

module.exports = dashboardController;