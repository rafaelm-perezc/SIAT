document.addEventListener('DOMContentLoaded', () => {
    
    const tablaCabecera = document.getElementById('tablaCabeceraDias');
    const tablaMatriz = document.getElementById('tablaMatriz');
    const btnCargar = document.getElementById('btnCargarMatriz');
    const inputMes = document.getElementById('filtroMes');

    const estilosSwal = { confirmButtonColor: '#FACC15', background: '#1F2937', color: '#E2E8F0' };

    const fechaActual = new Date();
    const mesActualFormato = `${fechaActual.getFullYear()}-${String(fechaActual.getMonth() + 1).padStart(2, '0')}`;
    inputMes.value = mesActualFormato;

    let filtros = { empleados: [], zonas: [], turnos: [] };
    let anioSeleccionado = '';
    let mesSeleccionado = '';

    const cargarFiltrosBase = async () => {
        const res = await window.api.getProgramacionFiltros();
        if (res.success) filtros = res.data;
    };

    const cargarMatriz = async () => {
        if (!inputMes.value) return;
        
        [anioSeleccionado, mesSeleccionado] = inputMes.value.split('-');
        const diasEnMes = new Date(anioSeleccionado, mesSeleccionado, 0).getDate();

        tablaMatriz.innerHTML = '<tr><td class="p-8 text-center text-terminal-yellow">Dibujando matriz...</td></tr>';

        try {
            const res = await window.api.getProgramacionMatriz(anioSeleccionado, mesSeleccionado);
            if (!res.success) return;

            const data = res.data;
            
            let trCabecera = `
                <tr class="text-terminal-yellow border-b border-gray-700 text-xs">
                    <th class="p-3 font-bold sticky left-0 z-30 bg-black border-r border-gray-700 w-48 shadow-[2px_0_5px_rgba(0,0,0,0.5)]">EMPLEADO</th>
                    <th class="p-3 font-bold sticky left-48 z-30 bg-black border-r border-gray-700 w-32 shadow-[2px_0_5px_rgba(0,0,0,0.5)]">CARGO</th>
            `;
            for (let d = 1; d <= diasEnMes; d++) {
                trCabecera += `<th class="p-2 font-bold text-center border-r border-gray-800 w-16">${d}</th>`;
            }
            trCabecera += `<th class="p-3 font-bold text-center">TOTAL HORAS</th></tr>`;
            tablaCabecera.innerHTML = trCabecera;

            tablaMatriz.innerHTML = '';
            if (data.empleados.length === 0) {
                tablaMatriz.innerHTML = '<tr><td colspan="10" class="p-4 text-center">No hay personal operativo activo para este mes.</td></tr>';
                return;
            }

            data.empleados.forEach(emp => {
                let totalHorasMes = 0;
                let asigEmp = data.asignaciones[emp.id] || {};

                let trFila = `
                    <tr class="hover:bg-gray-800 transition-colors group">
                        <td class="p-2 sticky left-0 z-20 bg-terminal-darkgray border-r border-gray-700 font-bold text-white whitespace-nowrap group-hover:bg-gray-800">
                            ${emp.primer_nombre} ${emp.primer_apellido}
                        </td>
                        <td class="p-2 sticky left-48 z-20 bg-terminal-darkgray border-r border-gray-700 text-gray-400 text-[10px] whitespace-nowrap group-hover:bg-gray-800">
                            ${emp.cargo}
                        </td>
                `;

                for (let d = 1; d <= diasEnMes; d++) {
                    const diaStr = String(d).padStart(2, '0');
                    const fechaCelda = `${anioSeleccionado}-${mesSeleccionado}-${diaStr}`;
                    
                    // [EVOLUCIÓN]: Validamos si la celda cae dentro del contrato del empleado
                    let contratoValido = true;
                    if (emp.fecha_inicio_labores && fechaCelda < emp.fecha_inicio_labores) contratoValido = false;
                    if (emp.fecha_fin_contrato && fechaCelda > emp.fecha_fin_contrato) contratoValido = false;

                    if (!contratoValido) {
                        // Celda bloqueada (Fuera de contrato)
                        trFila += `
                            <td class="border-r border-gray-800 bg-black/40 p-1 align-middle text-center cursor-not-allowed" title="Fuera de vigencia de contrato">
                                <span class="text-gray-700 text-[10px] font-bold">N/A</span>
                            </td>
                        `;
                    } else {
                        // Celda clickeable
                        let celdaHtml = `<td class="border-r border-gray-800 cursor-pointer hover:bg-gray-700 transition-all p-1 align-middle celda-dia" data-empid="${emp.id}" data-dia="${d}">`;
                        
                        if (asigEmp[d]) {
                            totalHorasMes += asigEmp[d].horas;
                            let colorTurno = asigEmp[d].turno === 'DES' ? 'text-red-400' : 'text-terminal-yellow';
                            celdaHtml += `
                                <div class="flex flex-col items-center justify-center bg-gray-900 border border-gray-700 rounded py-1 px-0.5 shadow-sm" data-asigid="${asigEmp[d].id}">
                                    <span class="font-bold ${colorTurno} text-[11px] leading-none">${asigEmp[d].turno}</span>
                                    <span class="text-blue-300 font-mono text-[9px] mt-0.5 leading-none">${asigEmp[d].zona}</span>
                                </div>
                            `;
                        } else {
                            celdaHtml += `<div class="h-full w-full min-h-[30px] flex items-center justify-center text-gray-600 opacity-0 group-hover:opacity-100">+</div>`;
                        }
                        celdaHtml += `</td>`;
                        trFila += celdaHtml;
                    }
                }

                trFila += `<td class="p-2 font-bold text-green-400 text-center">${totalHorasMes}h</td></tr>`;
                tablaMatriz.insertAdjacentHTML('beforeend', trFila);
            });

            document.querySelectorAll('.celda-dia').forEach(celda => {
                celda.addEventListener('click', (e) => {
                    const asigId = celda.querySelector('[data-asigid]')?.dataset.asigid;
                    abrirModalAsignacion(celda.dataset.empid, celda.dataset.dia, asigId);
                });
            });

        } catch (error) {
            console.error(error);
        }
    };

    const abrirModalAsignacion = async (empId, dia, asigExistenteId) => {
        const diaStr = String(dia).padStart(2, '0');
        const fechaExacta = `${anioSeleccionado}-${mesSeleccionado}-${diaStr}`;
        const empleado = filtros.empleados.find(e => e.id == empId);

        let zonasFiltradas = filtros.zonas;
        const cargoText = empleado.cargo.toUpperCase();
        
        if (cargoText.includes('SERVICIOS GENERALES')) {
            zonasFiltradas = filtros.zonas.filter(z => z.nombre.includes('GENERALES') || z.abreviatura === '---');
        } else if (cargoText.includes('CONDUCE')) {
            zonasFiltradas = filtros.zonas.filter(z => z.abreviatura === 'CD' || z.abreviatura === '---');
        } else if (cargoText.includes('CASETA')) {
            zonasFiltradas = filtros.zonas.filter(z => z.abreviatura === 'CS' || z.abreviatura === '---');
        }

        const optsZonas = zonasFiltradas.map(z => `<option value="${z.id}">${z.abreviatura} - ${z.nombre}</option>`).join('');
        const optsTurnos = filtros.turnos.map(t => `<option value="${t.id}">${t.codigo} (${t.hora_inicio} a ${t.hora_fin})</option>`).join('');

        const result = await Swal.fire({
            title: `Turno del ${diaStr}/${mesSeleccionado}`,
            html: `
                <div class="text-left space-y-3 mt-2">
                    <p class="text-xs text-gray-400">Asignando a: <strong class="text-white">${empleado.primer_nombre} (${empleado.cargo})</strong></p>
                    <div>
                        <label class="block text-xs font-bold text-terminal-yellow mb-1">Zona</label>
                        <select id="asigZona" class="w-full px-3 py-2 bg-black border border-gray-700 rounded text-white outline-none" style="background:#1F2937;">${optsZonas}</select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-terminal-yellow mb-1">Turno</label>
                        <select id="asigTurno" class="w-full px-3 py-2 bg-black border border-gray-700 rounded text-white outline-none" style="background:#1F2937;">${optsTurnos}</select>
                    </div>
                </div>
            `,
            showCancelButton: true,
            showDenyButton: !!asigExistenteId,
            denyButtonText: 'Borrar Turno',
            denyButtonColor: '#EF4444',
            confirmButtonText: 'Guardar',
            ...estilosSwal,
            preConfirm: () => {
                return {
                    empleado_id: empId,
                    fecha: fechaExacta,
                    zona_id: document.getElementById('asigZona').value,
                    turno_id: document.getElementById('asigTurno').value
                };
            }
        });

        if (result.isConfirmed) {
            Swal.fire({ title: 'Guardando...', allowOutsideClick: false, didOpen: () => Swal.showLoading(), ...estilosSwal });
            const res = await window.api.guardarProgramacion(result.value);
            if (res.success) cargarMatriz();
        } else if (result.isDenied) {
            const res = await window.api.eliminarProgramacion(asigExistenteId);
            if (res.success) cargarMatriz();
        }
    };

    btnCargar.addEventListener('click', cargarMatriz);
    cargarFiltrosBase().then(() => cargarMatriz());
});