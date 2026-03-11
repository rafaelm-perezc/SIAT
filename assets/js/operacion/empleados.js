document.addEventListener('DOMContentLoaded', () => {
    
    const tablaEmpleados = document.getElementById('tablaEmpleados');
    const modalExcel = document.getElementById('modalExcel');
    const btnModalExcel = document.getElementById('btnModalExcel');
    const btnCerrarExcel = document.getElementById('btnCerrarExcel');
    const formExcel = document.getElementById('formExcel');
    const btnDescargarPlantilla = document.getElementById('btnDescargarPlantilla');

    // 1. CARGAR DATOS EN LA TABLA
    const cargarTabla = async () => {
        try {
            const respuesta = await window.api.getEmpleados();
            
            if (respuesta.success) {
                const empleados = respuesta.data;
                tablaEmpleados.innerHTML = ''; 

                if (empleados.length === 0) {
                    tablaEmpleados.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-gray-500 italic">No hay personal registrado.</td></tr>`;
                    return;
                }

                empleados.forEach(emp => {
                    const nombreCompleto = `${emp.primer_apellido} ${emp.segundo_apellido} ${emp.primer_nombre} ${emp.segundo_nombre}`.trim();
                    const badgeActivo = emp.activo === 1 
                        ? `<span class="px-2 py-1 bg-green-900 text-green-300 rounded text-xs font-bold border border-green-700">ACTIVO</span>`
                        : `<span class="px-2 py-1 bg-red-900 text-red-300 rounded text-xs font-bold border border-red-700">INACTIVO</span>`;
                    
                    // Mostrar si es indefinido o tiene fecha
                    const tipoContrato = emp.fecha_fin_contrato ? emp.fecha_fin_contrato : '<span class="italic text-gray-500">Indefinido</span>';

                    const fila = `
                        <tr class="hover:bg-gray-800 transition-colors">
                            <td class="p-4 font-medium text-white">${emp.documento}</td>
                            <td class="p-4">${nombreCompleto}</td>
                            <td class="p-4 text-terminal-yellow font-medium text-xs">${emp.cargo_nombre}</td>
                            <td class="p-4 text-center">${tipoContrato}</td>
                            <td class="p-4 text-center">${badgeActivo}</td>
                        </tr>
                    `;
                    tablaEmpleados.insertAdjacentHTML('beforeend', fila);
                });
            } else {
                Swal.fire('Error', respuesta.message, 'error');
            }
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudo conectar con la base de datos', 'error');
        }
    };

    // 2. MODAL EXCEL
    btnModalExcel.addEventListener('click', () => {
        modalExcel.classList.remove('hidden');
        modalExcel.classList.add('flex');
    });

    btnCerrarExcel.addEventListener('click', () => {
        modalExcel.classList.add('hidden');
        modalExcel.classList.remove('flex');
        formExcel.reset();
    });

    // 3. DESCARGAR PLANTILLA
    if (btnDescargarPlantilla) {
        btnDescargarPlantilla.addEventListener('click', async () => {
            try {
                Swal.fire({
                    title: 'Generando...',
                    text: 'Preparando la plantilla con los cargos actuales.',
                    allowOutsideClick: false,
                    didOpen: () => { Swal.showLoading(); }
                });

                const resultado = await window.api.descargarPlantilla();
                
                if (resultado.canceled) return Swal.close();

                if (resultado.success) {
                    Swal.fire({
                        icon: 'success', title: '¡Plantilla Guardada!',
                        text: 'Ahora puedes llenarla e importarla al sistema.',
                        confirmButtonColor: '#FACC15', background: '#1F2937', color: '#E2E8F0'
                    });
                } else {
                    Swal.fire('Atención', resultado.message, 'warning');
                }
            } catch (error) {
                console.error(error);
                Swal.fire('Error', 'Fallo al intentar descargar la plantilla.', 'error');
            }
        });
    }

    // 4. PROCESAR EXCEL
    formExcel.addEventListener('submit', async (e) => {
        e.preventDefault();
        const inputArchivo = document.getElementById('archivoExcel');
        if (inputArchivo.files.length === 0) return;

        const filePath = inputArchivo.files[0].path;

        Swal.fire({
            title: 'Procesando...',
            text: 'Analizando e importando datos...',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        try {
            const resultado = await window.api.importarEmpleadosExcel(filePath);
            
            if (resultado.success) {
                btnCerrarExcel.click();
                cargarTabla(); 

                if (resultado.errores && resultado.errores.length > 0) {
                    let tablaHTML = `
                        <div class="max-h-60 overflow-y-auto mt-4 text-left text-sm">
                            <table class="w-full border-collapse">
                                <thead>
                                    <tr class="bg-gray-800 text-white">
                                        <th class="p-2 border border-gray-600">Fila</th>
                                        <th class="p-2 border border-gray-600">Documento</th>
                                        <th class="p-2 border border-gray-600">Motivo</th>
                                    </tr>
                                </thead>
                                <tbody>
                    `;
                    
                    resultado.errores.forEach(err => {
                        tablaHTML += `
                            <tr class="border-b border-gray-700">
                                <td class="p-2 border border-gray-600 font-bold">${err.fila}</td>
                                <td class="p-2 border border-gray-600">${err.documento}</td>
                                <td class="p-2 border border-gray-600 text-red-400">${err.motivo}</td>
                            </tr>
                        `;
                    });
                    tablaHTML += `</tbody></table></div>`;

                    Swal.fire({
                        icon: 'warning',
                        title: `Proceso Finalizado con Observaciones`,
                        html: `<p>Se importaron <b>${resultado.creados}</b> empleados correctamente.</p>
                               <p class="mt-2 text-red-400 font-bold">Se omitieron ${resultado.errores.length} filas:</p>
                               ${tablaHTML}`,
                        width: '600px',
                        confirmButtonColor: '#FACC15', background: '#1F2937', color: '#E2E8F0'
                    });
                } else {
                    Swal.fire({
                        icon: 'success',
                        title: '¡Importación Perfecta!',
                        text: `Se importaron ${resultado.creados} empleados exitosamente sin ningún error.`,
                        confirmButtonColor: '#FACC15', background: '#1F2937', color: '#E2E8F0'
                    });
                }
            } else {
                Swal.fire({ icon: 'error', title: 'Error de Importación', text: resultado.message, background: '#1F2937', color: '#E2E8F0' });
            }
        } catch (error) {
            Swal.fire('Error', 'Fallo crítico al leer el archivo Excel', 'error');
        }
    });

    cargarTabla();
});