const db = require('../database/db');

const dashboardController = {
    getStats: () => {
        try {
            // [NUEVO BLOQUE]: Generación de fechas dinámicas para las consultas
            const hoy = new Date();
            const fechaHoy = hoy.toISOString().split('T')[0]; // Ej: "2026-03-12"
            
            const anio = hoy.getFullYear();
            const mes = String(hoy.getMonth() + 1).padStart(2, '0');
            const fechaInicioMes = `${anio}-${mes}-01`;
            const fechaFinMes = `${anio}-${mes}-31`; // SQLite procesa bien el límite de 31

            // 1. Contar Zonas Activas registradas (Excluimos la zona comodín '---')
            const stmtZonas = db.prepare("SELECT count(*) as total FROM zonas WHERE abreviatura != '---'");
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

            // [NUEVO BLOQUE] 4. Turnos programados para HOY
            // (Excluimos los descansos y permisos para saber cuánta gente REALMENTE está en la terminal)
            const stmtTurnosHoy = db.prepare(`
                SELECT count(*) as total
                FROM programacion_turnos p
                INNER JOIN turnos t ON p.turno_id = t.id
                WHERE p.fecha = ? AND t.codigo NOT IN ('DES', 'PER', 'INC', 'VAC')
            `);
            const totalTurnosHoy = stmtTurnosHoy.get(fechaHoy).total;

            // [NUEVO BLOQUE] 5. Sumatoria de Horas Extras en el MES ACTUAL
            const stmtHorasExtras = db.prepare(`
                SELECT SUM(t.horas_extras) as total_extras
                FROM programacion_turnos p
                INNER JOIN turnos t ON p.turno_id = t.id
                WHERE p.fecha >= ? AND p.fecha <= ?
            `);
            const totalHorasExtras = stmtHorasExtras.get(fechaInicioMes, fechaFinMes).total_extras || 0;

            return {
                success: true,
                data: {
                    zonasActivas: totalZonas,
                    personalOperativo: totalOperativos,
                    limiteJornada: limiteJornada,
                    turnosHoy: totalTurnosHoy,
                    horasExtrasMes: totalHorasExtras
                }
            };
        } catch (error) {
            console.error('Error en getDashboardStats:', error);
            return { success: false, message: 'ERROR AL OBTENER LAS ESTADÍSTICAS DEL DASHBOARD' };
        }
    }
};

module.exports = dashboardController;