document.addEventListener('DOMContentLoaded', () => {
    const tablaEmpleados = document.getElementById('tablaEmpleados');
    const btnModalExcel = document.getElementById('btnModalExcel');
    const btnRegistroManual = document.getElementById('btnRegistroManual');

    const estilosSwal = {
        confirmButtonColor: '#FACC15',
        background: '#1F2937',
        color: '#E2E8F0'
    };

    let empleadosCache = [];

    const tipoContratoTexto = (fechaFin) => fechaFin || '<span class="italic text-gray-500">Indefinido</span>';

    const construirFormularioEmpleado = (cargos, empleado = {}) => {
        // Corrección de Contraste para el Select:
        const cargoOptions = cargos
            .map(cargo => `<option value="${cargo.id}" style="background-color: #1F2937; color: white;" ${Number(empleado.cargo_id) === Number(cargo.id) ? 'selected' : ''}>${cargo.nombre}</option>`)
            .join('');

        return `
            <div class="grid grid-cols-2 gap-3 text-left">
                <input id="doc" class="swal2-input" placeholder="Documento" value="${empleado.documento || ''}">
                <select id="cargo" class="swal2-select" style="background-color: #1F2937; color: white;">
                    <option value="" style="background-color: #1F2937; color: gray;">Cargo</option>
                    ${cargoOptions}
                </select>
                <input id="pn" class="swal2-input" placeholder="Primer nombre" value="${empleado.primer_nombre || ''}">
                <input id="sn" class="swal2-input" placeholder="Segundo nombre" value="${empleado.segundo_nombre || ''}">
                <input id="pa" class="swal2-input" placeholder="Primer apellido" value="${empleado.primer_apellido || ''}">
                <input id="sa" class="swal2-input" placeholder="Segundo apellido" value="${empleado.segundo_apellido || ''}">
                <input id="cel" class="swal2-input" placeholder="Celular" value="${empleado.celular || ''}">
                <input id="eps" class="swal2-input" placeholder="EPS" value="${empleado.eps || ''}">
                <input id="cen" class="swal2-input" placeholder="Contacto emergencia" value="${empleado.contacto_emergencia_nombre || ''}">
                <input id="cec" class="swal2-input" placeholder="Celular emergencia" value="${empleado.contacto_emergencia_celular || ''}">
                <input id="ts" class="swal2-input" placeholder="Tipo sangre (ej. O+)" value="${empleado.tipo_sangre || ''}">
                <select id="activo" class="swal2-select" style="background-color: #1F2937; color: white;">
                    <option value="1" style="background-color: #1F2937; color: white;" ${(empleado.activo ?? 1) === 1 ? 'selected' : ''}>Activo</option>
                    <option value="0" style="background-color: #1F2937; color: white;" ${empleado.activo === 0 ? 'selected' : ''}>Inactivo</option>
                </select>
                <label class="text-xs text-gray-300 col-span-1 mt-2">Inicio contrato</label>
                <label class="text-xs text-gray-300 col-span-1 mt-2">Inicio labores</label>
                <input type="date" id="fic" class="swal2-input" value="${empleado.fecha_inicio_contrato || ''}">
                <input type="date" id="fil" class="swal2-input" value="${empleado.fecha_inicio_labores || ''}">
                <label class="text-xs text-gray-300 col-span-2 mt-2">Fin contrato (vacío = indefinido)</label>
                <input type="date" id="ffc" class="swal2-input col-span-2" value="${empleado.fecha_fin_contrato || ''}">
            </div>
        `;
    };

    const leerDatosFormulario = () => ({
        documento: document.getElementById('doc').value,
        cargo_id: Number(document.getElementById('cargo').value),
        primer_nombre: document.getElementById('pn').value,
        segundo_nombre: document.getElementById('sn').value,
        primer_apellido: document.getElementById('pa').value,
        segundo_apellido: document.getElementById('sa').value,
        celular: document.getElementById('cel').value,
        eps: document.getElementById('eps').value,
        contacto_emergencia_nombre: document.getElementById('cen').value,
        contacto_emergencia_celular: document.getElementById('cec').value,
        tipo_sangre: document.getElementById('ts').value,
        activo: Number(document.getElementById('activo').value),
        fecha_inicio_contrato: document.getElementById('fic').value,
        fecha_inicio_labores: document.getElementById('fil').value,
        fecha_fin_contrato: document.getElementById('ffc').value
    });

    const validarDatos = (datos) => {
        if (!datos.documento || !datos.primer_nombre || !datos.primer_apellido || !datos.cargo_id || !datos.fecha_inicio_contrato) {
            return 'Documento, nombres principales, primer apellido, cargo y fecha inicio contrato son obligatorios.';
        }
        return null;
    };

    const abrirModalRegistro = async (empleado = null) => {
        const cargos = await window.api.getCargos();
        
        // Se permite el ingreso para probar si aún no se crean cargos:
        const datosCargos = cargos.success ? cargos.data : [];

        const resultado = await Swal.fire({
            title: empleado ? 'Actualizar empleado' : 'Registro manual de empleado',
            html: construirFormularioEmpleado(datosCargos, empleado || {}),
            width: '900px',
            showCancelButton: true,
            cancelButtonText: 'Cancelar',
            confirmButtonText: empleado ? 'Guardar cambios' : 'Registrar',
            focusConfirm: false,
            ...estilosSwal,
            preConfirm: async () => {
                const datos = leerDatosFormulario();
                const error = validarDatos(datos);
                if (error) {
                    Swal.showValidationMessage(error);
                    return false;
                }

                const respuesta = empleado
                    ? await window.api.actualizarEmpleado({ ...datos, id: empleado.id })
                    : await window.api.crearEmpleado(datos);

                if (!respuesta.success) {
                    Swal.showValidationMessage(respuesta.message || 'No se pudo guardar la información.');
                    return false;
                }

                return respuesta;
            }
        });

        if (resultado.isConfirmed) {
            Swal.fire({ icon: 'success', title: 'Proceso exitoso', text: resultado.value.message, ...estilosSwal });
            cargarTabla();
        }
    };

    const abrirModalCargaMasiva = async () => {
        const contenido = `
            <div class="text-left">
                <p class="text-xs text-gray-300 mb-4">Usa la plantilla oficial para garantizar que los cargos y tipos de sangre sean válidos. Fecha de fin de contrato puede ir vacía si es indefinido.</p>
                <button id="btnDescargarPlantillaSwal" class="text-sm text-blue-300 underline mb-4">⬇️ Descargar Plantilla Oficial</button>
                <input type="file" id="archivoExcelSwal" class="swal2-file" accept=".xlsx,.xls">
            </div>
        `;

        const resultado = await Swal.fire({
            title: 'Importar personal',
            html: contenido,
            width: 700,
            showCancelButton: true,
            cancelButtonText: 'Cancelar',
            confirmButtonText: 'Procesar archivo',
            ...estilosSwal,
            didOpen: () => {
                const botonDescarga = document.getElementById('btnDescargarPlantillaSwal');
                botonDescarga.addEventListener('click', async () => {
                    const descarga = await window.api.descargarPlantilla();
                    if (descarga?.canceled) return;
                    if (!descarga.success) {
                        Swal.fire({ icon: 'warning', title: 'Atención', text: descarga.message, ...estilosSwal });
                        return;
                    }
                    Swal.fire({ icon: 'success', title: 'Plantilla guardada', text: 'Completa el archivo y vuelve a importarlo.', ...estilosSwal });
                });
            },
            preConfirm: () => {
                const input = document.getElementById('archivoExcelSwal');
                if (!input.files || input.files.length === 0) {
                    Swal.showValidationMessage('Selecciona un archivo de Excel.');
                    return false;
                }
                return input.files[0].path;
            }
        });

        if (!resultado.isConfirmed) return;

        Swal.fire({ title: 'Procesando...', allowOutsideClick: false, didOpen: () => Swal.showLoading(), ...estilosSwal });
        const importacion = await window.api.importarEmpleadosExcel(resultado.value);
        Swal.close();

        if (!importacion.success) {
            Swal.fire({ icon: 'error', title: 'Error de importación', text: importacion.message, ...estilosSwal });
            return;
        }

        await cargarTabla();

        if (importacion.errores?.length > 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Importación con observaciones',
                html: `Se importaron <b>${importacion.creados}</b> empleados. Filas omitidas: <b>${importacion.errores.length}</b>.`,
                ...estilosSwal
            });
            return;
        }

        Swal.fire({ icon: 'success', title: 'Importación completa', text: `Se importaron ${importacion.creados} empleados.`, ...estilosSwal });
    };

    const cargarTabla = async () => {
        try {
            const respuesta = await window.api.getEmpleados();
            if (!respuesta.success) {
                Swal.fire({ icon: 'error', title: 'Error', text: respuesta.message, ...estilosSwal });
                return;
            }

            empleadosCache = respuesta.data;
            tablaEmpleados.innerHTML = '';

            if (empleadosCache.length === 0) {
                tablaEmpleados.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-gray-500 italic">No hay personal registrado.</td></tr>';
                return;
            }

            empleadosCache.forEach(emp => {
                const nombreCompleto = `${emp.primer_apellido} ${emp.segundo_apellido} ${emp.primer_nombre} ${emp.segundo_nombre}`.replace(/\s+/g, ' ').trim();
                const badgeActivo = emp.activo === 1
                    ? '<span class="px-2 py-1 bg-green-900 text-green-300 rounded text-xs font-bold border border-green-700">ACTIVO</span>'
                    : '<span class="px-2 py-1 bg-red-900 text-red-300 rounded text-xs font-bold border border-red-700">INACTIVO</span>';

                const fila = `
                    <tr class="hover:bg-gray-800 transition-colors">
                        <td class="p-4 font-medium text-white">${emp.documento}</td>
                        <td class="p-4">${nombreCompleto}</td>
                        <td class="p-4 text-terminal-yellow font-medium text-xs">${emp.cargo_nombre}</td>
                        <td class="p-4 text-center">${tipoContratoTexto(emp.fecha_fin_contrato)}</td>
                        <td class="p-4 text-center">${badgeActivo}</td>
                        <td class="p-4 text-center">
                            <button class="btnEditar px-3 py-1 rounded bg-blue-700 hover:bg-blue-600 text-white text-xs font-semibold" data-id="${emp.id}">Editar</button>
                        </td>
                    </tr>
                `;
                tablaEmpleados.insertAdjacentHTML('beforeend', fila);
            });

            document.querySelectorAll('.btnEditar').forEach(btn => {
                btn.addEventListener('click', () => {
                    const empleado = empleadosCache.find(item => item.id === Number(btn.dataset.id));
                    if (empleado) abrirModalRegistro(empleado);
                });
            });
        } catch (error) {
            console.error(error);
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar la información de empleados.', ...estilosSwal });
        }
    };

    btnModalExcel.addEventListener('click', abrirModalCargaMasiva);
    
    if(btnRegistroManual) {
        btnRegistroManual.addEventListener('click', () => abrirModalRegistro());
    }

    cargarTabla();
});