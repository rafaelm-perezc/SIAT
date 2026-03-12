document.addEventListener('DOMContentLoaded', () => {
    
    const tablaTurnos = document.getElementById('tablaTurnos');
    const btnNuevoTurno = document.getElementById('btnNuevoTurno');

    // Paleta de colores estándar para modales
    const estilosSwal = {
        confirmButtonColor: '#FACC15',
        background: '#1F2937',
        color: '#E2E8F0'
    };

    let turnosCache = [];

    // ==========================================
    // 1. CARGAR TABLA Y RENDERIZAR
    // ==========================================
    const cargarTabla = async () => {
        try {
            const respuesta = await window.api.getAllTurnos();
            
            if (!respuesta.success) {
                Swal.fire({ icon: 'error', title: 'Error', text: respuesta.message, ...estilosSwal });
                return;
            }

            turnosCache = respuesta.data;
            if(!tablaTurnos) return;

            tablaTurnos.innerHTML = '';

            if (turnosCache.length === 0) {
                tablaTurnos.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-gray-500 italic">No hay turnos registrados.</td></tr>';
                return;
            }

            turnosCache.forEach(turno => {
                // Formateo visual del turno
                const fila = `
                    <tr class="hover:bg-gray-800 transition-colors">
                        <td class="p-4 text-center font-bold text-terminal-yellow text-lg">${turno.codigo}</td>
                        <td class="p-4 text-center font-mono text-white bg-gray-900/50">${turno.hora_inicio}</td>
                        <td class="p-4 text-center font-mono text-white bg-gray-900/50">${turno.hora_fin}</td>
                        <td class="p-4 text-center">
                            <span class="px-3 py-1 bg-green-900/50 border border-green-700 rounded-full text-green-400 font-bold">
                                ⏱️ ${turno.horas_totales} h
                            </span>
                        </td>
                        <td class="p-4 text-center">
                            <div class="flex justify-center gap-2">
                                <button class="btnEditar px-3 py-1 rounded bg-blue-700 hover:bg-blue-600 text-white text-xs font-semibold" data-id="${turno.id}">Editar</button>
                                <button class="btnEliminar px-3 py-1 rounded bg-red-700 hover:bg-red-600 text-white text-xs font-semibold" data-id="${turno.id}" data-codigo="${turno.codigo}">X</button>
                            </div>
                        </td>
                    </tr>
                `;
                tablaTurnos.insertAdjacentHTML('beforeend', fila);
            });

            // Asignar eventos de clic a los botones generados
            document.querySelectorAll('.btnEditar').forEach(btn => {
                btn.addEventListener('click', () => {
                    const turno = turnosCache.find(t => t.id === Number(btn.dataset.id));
                    if (turno) abrirModalTurno(turno);
                });
            });

            document.querySelectorAll('.btnEliminar').forEach(btn => {
                btn.addEventListener('click', () => eliminarTurno(Number(btn.dataset.id), btn.dataset.codigo));
            });

        } catch (error) {
            console.error("Error al cargar turnos:", error);
            Swal.fire({ icon: 'error', title: 'Fallo de Conexión', text: 'No se pudo cargar la tabla de turnos.', ...estilosSwal });
        }
    };

    // ==========================================
    // 2. MODAL CREAR / EDITAR TURNO
    // ==========================================
    const abrirModalTurno = async (turno = null) => {
        const resultado = await Swal.fire({
            title: turno ? 'Editar Turno' : 'Registrar Nuevo Turno',
            html: `
                <div class="text-left space-y-4 mt-4">
                    <div>
                        <label class="block text-xs font-bold text-terminal-yellow mb-1 uppercase tracking-wider">Código del Turno (Ej. M, T, N) <span class="text-red-500">*</span></label>
                        <input id="turnoCodigo" class="w-full px-3 py-2 bg-black border border-gray-700 rounded text-white focus:border-terminal-yellow outline-none uppercase font-bold text-center" placeholder="M" value="${turno ? turno.codigo : ''}" maxlength="5">
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-terminal-yellow mb-1 uppercase tracking-wider">Hora Inicio <span class="text-red-500">*</span></label>
                            <input type="time" id="turnoInicio" class="w-full px-3 py-2 bg-black border border-gray-700 rounded text-white focus:border-terminal-yellow outline-none style="color-scheme: dark;"" value="${turno ? turno.hora_inicio : '06:00'}">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-terminal-yellow mb-1 uppercase tracking-wider">Hora Fin <span class="text-red-500">*</span></label>
                            <input type="time" id="turnoFin" class="w-full px-3 py-2 bg-black border border-gray-700 rounded text-white focus:border-terminal-yellow outline-none style="color-scheme: dark;"" value="${turno ? turno.hora_fin : '14:00'}">
                        </div>
                    </div>
                    <p class="text-xs text-gray-500 mt-2 text-center">Las horas totales se calcularán automáticamente.</p>
                </div>
            `,
            showCancelButton: true,
            cancelButtonText: 'Cancelar',
            confirmButtonText: turno ? 'Guardar Cambios' : 'Registrar Turno',
            focusConfirm: false,
            ...estilosSwal,
            preConfirm: () => {
                const codigo = document.getElementById('turnoCodigo').value.trim();
                const hora_inicio = document.getElementById('turnoInicio').value;
                const hora_fin = document.getElementById('turnoFin').value;

                if (!codigo) {
                    Swal.showValidationMessage('El código del turno es obligatorio');
                    return false;
                }
                if (!hora_inicio || !hora_fin) {
                    Swal.showValidationMessage('Debes seleccionar las horas de inicio y fin');
                    return false;
                }
                if (hora_inicio === hora_fin) {
                    Swal.showValidationMessage('La hora de inicio y fin no pueden ser iguales');
                    return false;
                }

                return { codigo, hora_inicio, hora_fin };
            }
        });

        if (resultado.isConfirmed) {
            const datos = resultado.value;
            Swal.fire({ title: 'Procesando...', allowOutsideClick: false, didOpen: () => Swal.showLoading(), ...estilosSwal });

            try {
                let respuesta = turno 
                    ? await window.api.actualizarTurno({ id: turno.id, ...datos }) 
                    : await window.api.crearTurno(datos);

                if (respuesta.success) {
                    Swal.fire({ icon: 'success', title: 'Operación Exitosa', text: respuesta.message, ...estilosSwal });
                    cargarTabla();
                } else {
                    Swal.fire({ icon: 'error', title: 'Atención', text: respuesta.message, ...estilosSwal });
                }
            } catch (error) {
                console.error(error);
                Swal.fire({ icon: 'error', title: 'Error', text: 'Ocurrió un error inesperado de comunicación.', ...estilosSwal });
            }
        }
    };

    // ==========================================
    // 3. ELIMINAR TURNO
    // ==========================================
    const eliminarTurno = async (id, codigo) => {
        const confirmacion = await Swal.fire({
            title: '¿Eliminar Turno?',
            text: `Vas a eliminar permanentemente el turno "${codigo}".`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444', 
            cancelButtonColor: '#374151',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            ...estilosSwal
        });

        if (confirmacion.isConfirmed) {
            Swal.fire({ title: 'Eliminando...', allowOutsideClick: false, didOpen: () => Swal.showLoading(), ...estilosSwal });
            
            try {
                const respuesta = await window.api.eliminarTurno(id);
                
                if (respuesta.success) {
                    Swal.fire({ icon: 'success', title: 'Eliminado', text: respuesta.message, ...estilosSwal });
                    cargarTabla();
                } else {
                    Swal.fire({ icon: 'error', title: 'Atención', text: respuesta.message, ...estilosSwal });
                }
            } catch (error) {
                console.error(error);
                Swal.fire({ icon: 'error', title: 'Error', text: 'Error al contactar con la base de datos.', ...estilosSwal });
            }
        }
    };

    // Escuchador del botón principal
    if(btnNuevoTurno) btnNuevoTurno.addEventListener('click', () => abrirModalTurno());
    
    // Carga inicial
    cargarTabla();
});