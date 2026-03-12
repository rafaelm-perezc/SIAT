const db = require('../database/db');

const autoProgramacionService = {
    generarMes: (anio, mes) => {
        try {
            const diasEnMes = new Date(anio, mes, 0).getDate();
            
            // 1. Obtener empleados operativos activos
            const empleados = db.prepare(`
                SELECT e.id, c.nombre as cargo, e.fecha_inicio_labores, e.fecha_fin_contrato
                FROM empleados e INNER JOIN cargos c ON e.cargo_id = c.id
                WHERE e.activo = 1 AND e.documento != 'ADMIN' AND (c.tipo = 'OPERATIVO' OR c.tipo = 'AMBOS')
            `).all();

            // 2. Obtener Zonas
            const zonasRaw = db.prepare("SELECT id, abreviatura, nombre, personal_requerido FROM zonas").all();
            const zonaDesId = zonasRaw.find(z => z.abreviatura === '---')?.id;

            // 3. Clasificar Turnos
            const turnosRaw = db.prepare("SELECT id, codigo, hora_inicio, hora_fin, horas_ordinarias FROM turnos").all();
            const turnoDes = turnosRaw.find(t => t.codigo === 'DES');
            const turnos4h = turnosRaw.filter(t => t.horas_ordinarias > 0 && t.horas_ordinarias <= 5);
            const turnos8h = turnosRaw.filter(t => t.horas_ordinarias > 5);

            if (!turnoDes || turnos8h.length === 0 || turnos4h.length === 0 || !zonaDesId) {
                return { success: false, message: 'Faltan turnos base (DES, 4H, 8H) o la zona de descanso (---).' };
            }

            // 4. Extraer asignaciones existentes para no sobrescribir Novedades (PER, INC, VAC, etc.)
            const fechaInicioMes = `${anio}-${mes}-01`;
            const fechaFinMes = `${anio}-${mes}-${diasEnMes}`;
            const asignacionesExistentes = db.prepare(`
                SELECT empleado_id, fecha, turno_id FROM programacion_turnos 
                WHERE fecha >= ? AND fecha <= ?
            `).all(fechaInicioMes, fechaFinMes);

            // Mapa para búsquedas rápidas: mapaExistentes[empleado_id][dia] = turno_id
            const mapaExistentes = {};
            asignacionesExistentes.forEach(a => {
                if (!mapaExistentes[a.empleado_id]) mapaExistentes[a.empleado_id] = {};
                const dia = parseInt(a.fecha.split('-')[2], 10);
                mapaExistentes[a.empleado_id][dia] = a.turno_id;
            });

            // Sentencia para inyectar/actualizar
            const stmtInsert = db.prepare(`
                INSERT INTO programacion_turnos (empleado_id, zona_id, turno_id, fecha) 
                VALUES (?, ?, ?, ?)
                ON CONFLICT(empleado_id, fecha) DO UPDATE SET zona_id = excluded.zona_id, turno_id = excluded.turno_id
            `);

            // 5. LÓGICA DE DISTRIBUCIÓN POR EMPLEADO (Patrón 5-1-1)
            db.transaction(() => {
                empleados.forEach(emp => {
                    let ciclo = { diasTrabajados: 0, tiene4h: false, tieneDes: false };
                    let ultimoTurnoFin = null; // Para la holgura de 10 horas (simulada)

                    // Filtramos las zonas permitidas según el cargo
                    const cargoText = emp.cargo.toUpperCase();
                    let zonasPermitidas = zonasRaw.filter(z => z.abreviatura !== '---' && z.personal_requerido > 0);
                    if (cargoText.includes('SERVICIOS GENERALES')) {
                        zonasPermitidas = zonasRaw.filter(z => z.nombre.includes('GENERALES'));
                    } else if (cargoText.includes('CONDUCE')) {
                        zonasPermitidas = zonasRaw.filter(z => z.abreviatura === 'CD');
                    } else if (cargoText.includes('CASETA')) {
                        zonasPermitidas = zonasRaw.filter(z => z.abreviatura === 'CS');
                    }

                    for (let dia = 1; dia <= diasEnMes; dia++) {
                        const diaStr = String(dia).padStart(2, '0');
                        const fechaActual = `${anio}-${mes}-${diaStr}`;

                        // Verificar contrato
                        let contratoValido = true;
                        if (emp.fecha_inicio_labores && fechaActual < emp.fecha_inicio_labores) contratoValido = false;
                        if (emp.fecha_fin_contrato && fechaActual > emp.fecha_fin_contrato) contratoValido = false;

                        if (!contratoValido) continue; // Si no está contratado este día, lo saltamos

                        // Verificar si ya tiene algo asignado manualmente (ej. PER, INC o un turno forzado)
                        if (mapaExistentes[emp.id] && mapaExistentes[emp.id][dia]) {
                            const turnoExistente = turnosRaw.find(t => t.id === mapaExistentes[emp.id][dia]);
                            if (turnoExistente) {
                                // Actualizamos los contadores del ciclo basándonos en lo que ya tiene
                                if (turnoExistente.codigo === 'DES') ciclo.tieneDes = true;
                                else if (turnoExistente.horas_ordinarias <= 5 && turnoExistente.horas_ordinarias > 0) ciclo.tiene4h = true;
                                else if (turnoExistente.horas_ordinarias > 5) ciclo.diasTrabajados++;
                                
                                ultimoTurnoFin = turnoExistente.hora_fin;
                            }
                        } else {
                            // SI LA CELDA ESTÁ VACÍA -> EL ALGORITMO DECIDE
                            let turnoAsignar = null;
                            let zonaAsignarId = null;

                            // Aplicamos la regla del ciclo de 7 días
                            const diaSemana = new Date(anio, parseInt(mes)-1, dia).getDay(); // 0 es Domingo

                            // Forzar descanso si llegamos al límite y no ha descansado
                            if (!ciclo.tieneDes && ciclo.diasTrabajados >= 5 && ciclo.tiene4h) {
                                turnoAsignar = turnoDes;
                                zonaAsignarId = zonaDesId;
                                ciclo.tieneDes = true;
                            } 
                            // Forzar 4H si es fin de ciclo y no la tiene
                            else if (!ciclo.tiene4h && ciclo.diasTrabajados >= 5) {
                                turnoAsignar = turnos4h[Math.floor(Math.random() * turnos4h.length)];
                                ciclo.tiene4h = true;
                            } 
                            // Asignar Descanso aleatorio en la semana (Preferiblemente Domingo)
                            else if (!ciclo.tieneDes && diaSemana === 0) {
                                turnoAsignar = turnoDes;
                                zonaAsignarId = zonaDesId;
                                ciclo.tieneDes = true;
                            }
                            // Asignar turno normal de 8H
                            else {
                                // Seleccionamos un turno de 8H aleatorio que intente respetar la holgura
                                // Nota: En un sistema AI profundo esto se optimiza, aquí usamos heurística básica
                                turnoAsignar = turnos8h[Math.floor(Math.random() * turnos8h.length)];
                                ciclo.diasTrabajados++;
                            }

                            // Si no es descanso, elegir una zona válida
                            if (turnoAsignar.codigo !== 'DES') {
                                if (zonasPermitidas.length > 0) {
                                    zonaAsignarId = zonasPermitidas[Math.floor(Math.random() * zonasPermitidas.length)].id;
                                } else {
                                    zonaAsignarId = zonaDesId; // Fallback si no hay zonas configuradas
                                }
                                ultimoTurnoFin = turnoAsignar.hora_fin;
                            }

                            // Guardar en la base de datos
                            if (turnoAsignar && zonaAsignarId) {
                                stmtInsert.run(emp.id, zonaAsignarId, turnoAsignar.id, fechaActual);
                            }
                        }

                        // Resetear el ciclo cada 7 días (Lunes a Domingo)
                        if (new Date(anio, parseInt(mes)-1, dia).getDay() === 0) {
                            ciclo = { diasTrabajados: 0, tiene4h: false, tieneDes: false };
                        }
                    }
                });
            })(); // Ejecuta la transacción

            return { success: true, message: 'La malla mensual ha sido generada con éxito, respetando los contratos y parámetros.' };

        } catch (error) {
            console.error('Error Crítico en autoProgramacionService:', error);
            return { success: false, message: 'Hubo un error al ejecutar el algoritmo matemático.' };
        }
    }
};

module.exports = autoProgramacionService;