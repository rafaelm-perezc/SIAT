const db = require('../database/db');
const xlsx = require('xlsx');
const ExcelJS = require('exceljs');

const upper = (str) => str ? String(str).toUpperCase().trim() : '';

const empleadoController = {
    getCargos: () => {
        try {
            const stmt = db.prepare('SELECT id, nombre FROM cargos ORDER BY nombre ASC');
            return { success: true, data: stmt.all() };
        } catch (error) {
            console.error('Error en getCargos:', error);
            return { success: false, message: 'ERROR AL CONSULTAR CARGOS' };
        }
    },

    getAll: () => {
        try {
            const stmt = db.prepare(`
                SELECT e.*, c.nombre as cargo_nombre 
                FROM empleados e
                INNER JOIN cargos c ON e.cargo_id = c.id
                WHERE e.documento <> 'ADMIN'
                ORDER BY e.primer_nombre ASC
            `);
            return { success: true, data: stmt.all() };
        } catch (error) {
            console.error('Error en getAll empleados:', error);
            return { success: false, message: 'ERROR AL CONSULTAR EMPLEADOS' };
        }
    },

    crear: (empleadoData) => {
        try {
            const stmt = db.prepare(`
                INSERT INTO empleados (
                    documento, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
                    celular, contacto_emergencia_nombre, contacto_emergencia_celular,
                    eps, tipo_sangre, cargo_id, fecha_inicio_contrato, fecha_inicio_labores, fecha_fin_contrato
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            const fechaLabores = empleadoData.fecha_inicio_labores || empleadoData.fecha_inicio_contrato;
            const fechaFin = empleadoData.fecha_fin_contrato ? empleadoData.fecha_fin_contrato : null;

            stmt.run(
                upper(empleadoData.documento), upper(empleadoData.primer_nombre), upper(empleadoData.segundo_nombre),
                upper(empleadoData.primer_apellido), upper(empleadoData.segundo_apellido), upper(empleadoData.celular),
                upper(empleadoData.contacto_emergencia_nombre), upper(empleadoData.contacto_emergencia_celular),
                upper(empleadoData.eps), upper(empleadoData.tipo_sangre), empleadoData.cargo_id, 
                empleadoData.fecha_inicio_contrato, fechaLabores, fechaFin
            );
            
            return { success: true, message: 'EMPLEADO REGISTRADO EXITOSAMENTE' };
        } catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return { success: false, message: 'EL DOCUMENTO YA ESTÁ REGISTRADO' };
            return { success: false, message: 'ERROR INTERNO AL GUARDAR LOS DATOS' };
        }
    },

    actualizar: (empleadoData) => {
        try {
            const fechaLabores = empleadoData.fecha_inicio_labores || empleadoData.fecha_inicio_contrato;
            const fechaFin = empleadoData.fecha_fin_contrato ? empleadoData.fecha_fin_contrato : null;

            const stmt = db.prepare(`
                UPDATE empleados
                SET documento = ?,
                    primer_nombre = ?,
                    segundo_nombre = ?,
                    primer_apellido = ?,
                    segundo_apellido = ?,
                    celular = ?,
                    contacto_emergencia_nombre = ?,
                    contacto_emergencia_celular = ?,
                    eps = ?,
                    tipo_sangre = ?,
                    cargo_id = ?,
                    fecha_inicio_contrato = ?,
                    fecha_inicio_labores = ?,
                    fecha_fin_contrato = ?,
                    activo = ?
                WHERE id = ?
            `);

            const result = stmt.run(
                upper(empleadoData.documento), upper(empleadoData.primer_nombre), upper(empleadoData.segundo_nombre),
                upper(empleadoData.primer_apellido), upper(empleadoData.segundo_apellido), upper(empleadoData.celular),
                upper(empleadoData.contacto_emergencia_nombre), upper(empleadoData.contacto_emergencia_celular),
                upper(empleadoData.eps), upper(empleadoData.tipo_sangre), Number(empleadoData.cargo_id),
                empleadoData.fecha_inicio_contrato, fechaLabores, fechaFin, Number(empleadoData.activo), Number(empleadoData.id)
            );

            if (result.changes === 0) {
                return { success: false, message: 'EMPLEADO NO ENCONTRADO' };
            }

            return { success: true, message: 'EMPLEADO ACTUALIZADO EXITOSAMENTE' };
        } catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return { success: false, message: 'EL DOCUMENTO YA ESTÁ REGISTRADO' };
            console.error('Error en actualizar empleado:', error);
            return { success: false, message: 'ERROR INTERNO AL ACTUALIZAR EL EMPLEADO' };
        }
    },

    generarPlantilla: async (filePath) => {
        try {
            const cargos = db.prepare('SELECT nombre FROM cargos ORDER BY nombre ASC').all();

            const workbook = new ExcelJS.Workbook();
            const ws = workbook.addWorksheet('Plantilla_Empleados');
            const hiddenWs = workbook.addWorksheet('DataOculta', { state: 'hidden' });

            const nombresCargos = cargos.length > 0 ? cargos.map(c => c.nombre) : ['AUXILIAR OPERATIVO'];
            const tiposSangre = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

            hiddenWs.getColumn('A').values = nombresCargos;
            hiddenWs.getColumn('B').values = tiposSangre;

            ws.columns = [
                { header: 'Documento', key: 'doc', width: 20 },
                { header: 'Primer_Nombre', key: 'pn', width: 20 },
                { header: 'Segundo_Nombre', key: 'sn', width: 20 },
                { header: 'Primer_Apellido', key: 'pa', width: 20 },
                { header: 'Segundo_Apellido', key: 'sa', width: 20 },
                { header: 'Celular', key: 'cel', width: 20 },
                { header: 'Contacto_Emergencia', key: 'ce', width: 25 },
                { header: 'Celular_Emergencia', key: 'cel_e', width: 20 },
                { header: 'EPS', key: 'eps', width: 20 },
                { header: 'Tipo_Sangre', key: 'ts', width: 15 },
                { header: 'Cargo', key: 'cargo', width: 25 },
                { header: 'Fecha_Inicio_Contrato', key: 'fic', width: 22 },
                { header: 'Fecha_Inicio_Labores', key: 'fil', width: 22 },
                { header: 'Fecha_Fin_Contrato', key: 'ffc', width: 22 }
            ];

            ws.getRow(1).font = { bold: true };
            ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

            for (let i = 2; i <= 1000; i++) {
                ws.getCell(`J${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: [`DataOculta!$B$1:$B$${tiposSangre.length}`] };
                ws.getCell(`K${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: [`DataOculta!$A$1:$A$${nombresCargos.length}`] };
            }

            await workbook.xlsx.writeFile(filePath);
            return { success: true, message: 'PLANTILLA CREADA CORRECTAMENTE.' };
        } catch (error) {
            console.error(error);
            return { success: false, message: 'ERROR AL GENERAR LA PLANTILLA EXCEL.' };
        }
    },

    cargarExcel: (filePath) => {
        try {
            const workbook = xlsx.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

            if (data.length === 0) return { success: false, message: 'EL ARCHIVO EXCEL ESTÁ VACÍO.' };

            const stmtInsertEmpleado = db.prepare(`
                INSERT INTO empleados (
                    documento, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
                    celular, contacto_emergencia_nombre, contacto_emergencia_celular,
                    eps, tipo_sangre, cargo_id, fecha_inicio_contrato, fecha_inicio_labores, fecha_fin_contrato
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            const stmtGetCargo = db.prepare('SELECT id FROM cargos WHERE nombre = ?');

            const insertMany = db.transaction((empleados) => {
                let creados = 0;
                let filaActual = 1; 
                const reporteErrores = []; 
                const cargosCache = {}; 

                for (const emp of empleados) {
                    filaActual++;
                    try {
                        if (!emp.Documento || !emp.Fecha_Inicio_Contrato) {
                            reporteErrores.push({ fila: filaActual, documento: emp.Documento || 'Vacío', motivo: 'Falta Documento o Fecha de Inicio de Contrato.' });
                            continue;
                        }

                        const nombreCargo = upper(emp.Cargo);
                        let cargoId;
                        if (cargosCache[nombreCargo]) {
                            cargoId = cargosCache[nombreCargo];
                        } else {
                            const cargoRow = stmtGetCargo.get(nombreCargo);
                            if (cargoRow) {
                                cargoId = cargoRow.id;
                                cargosCache[nombreCargo] = cargoId;
                            } else {
                                reporteErrores.push({ fila: filaActual, documento: emp.Documento, motivo: `El cargo '${nombreCargo}' no existe en el sistema.` });
                                continue;
                            }
                        }

                        const fechaInicioContrato = String(emp.Fecha_Inicio_Contrato);
                        const fechaInicioLabores = emp.Fecha_Inicio_Labores ? String(emp.Fecha_Inicio_Labores) : fechaInicioContrato;
                        const fechaFinContrato = emp.Fecha_Fin_Contrato ? String(emp.Fecha_Fin_Contrato) : null;

                        stmtInsertEmpleado.run(
                            upper(emp.Documento), upper(emp.Primer_Nombre), upper(emp.Segundo_Nombre),
                            upper(emp.Primer_Apellido), upper(emp.Segundo_Apellido), upper(emp.Celular),
                            upper(emp.Contacto_Emergencia), upper(emp.Celular_Emergencia),
                            upper(emp.EPS), upper(emp.Tipo_Sangre), cargoId, 
                            fechaInicioContrato, fechaInicioLabores, fechaFinContrato
                        );
                        creados++;
                    } catch (e) {
                        if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                            reporteErrores.push({ fila: filaActual, documento: emp.Documento, motivo: 'El documento ya está registrado.' });
                        } else {
                            reporteErrores.push({ fila: filaActual, documento: emp.Documento, motivo: 'Error de formato en las celdas.' });
                        }
                    }
                }
                return { creados, reporteErrores };
            });

            const resultado = insertMany(data);
            return { success: true, creados: resultado.creados, errores: resultado.reporteErrores };
        } catch (error) {
            console.error(error);
            return { success: false, message: 'ERROR AL LEER EL ARCHIVO EXCEL. VERIFICA EL FORMATO.' };
        }
    }
};

module.exports = empleadoController;