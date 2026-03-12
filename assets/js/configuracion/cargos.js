document.addEventListener('DOMContentLoaded', () => {
    
    const tablaCargos = document.getElementById('tablaCargos');
    const btnNuevoCargo = document.getElementById('btnNuevoCargo');

    const estilosSwal = {
        confirmButtonColor: '#FACC15', 
        background: '#1F2937',        
        color: '#E2E8F0'              
    };

    let cargosCache = [];

    const cargarTabla = async () => {
        try {
            const respuesta = await window.api.getAllCargos();
            
            if (!respuesta.success) {
                Swal.fire({ icon: 'error', title: 'Error', text: respuesta.message, ...estilosSwal });
                return;
            }

            cargosCache = respuesta.data;
            tablaCargos.innerHTML = '';

            if (cargosCache.length === 0) {
                tablaCargos.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-gray-500 italic">No hay cargos registrados en el sistema.</td></tr>';
                return;
            }

            cargosCache.forEach(cargo => {
                const esAdmin = cargo.nombre === 'ADMINISTRADOR DEL SISTEMA';
                
                let botonesHTML = '';
                if (esAdmin) {
                    botonesHTML = `<span class="text-xs text-gray-500 italic px-2 py-1 bg-gray-800 rounded">Protegido</span>`;
                } else {
                    botonesHTML = `
                        <div class="flex justify-center gap-2">
                            <button class="btnEditar px-2 py-1 rounded bg-blue-700 hover:bg-blue-600 text-white text-xs font-semibold" data-id="${cargo.id}">Editar</button>
                            <button class="btnEliminar px-2 py-1 rounded bg-red-700 hover:bg-red-600 text-white text-xs font-semibold" data-id="${cargo.id}" data-nombre="${cargo.nombre}">X</button>
                        </div>
                    `;
                }

                // Colores para el tipo de cargo
                let colorBadge = 'bg-gray-700 text-gray-300 border-gray-600';
                if(cargo.tipo === 'OPERATIVO') colorBadge = 'bg-green-900/50 text-green-400 border-green-700';
                if(cargo.tipo === 'ADMINISTRATIVO') colorBadge = 'bg-blue-900/50 text-blue-400 border-blue-700';
                if(cargo.tipo === 'AMBOS') colorBadge = 'bg-yellow-900/50 text-yellow-500 border-yellow-700';

                const fila = `
                    <tr class="hover:bg-gray-800 transition-colors">
                        <td class="p-3 font-bold text-white">${cargo.nombre}</td>
                        <td class="p-3">
                            <span class="px-2 py-1 rounded text-xs border ${colorBadge} font-semibold">
                                ${cargo.tipo}
                            </span>
                        </td>
                        <td class="p-3 text-gray-400 text-xs">${cargo.descripcion || '<span class="italic text-gray-600">Sin descripción...</span>'}</td>
                        <td class="p-3 text-center align-middle">${botonesHTML}</td>
                    </tr>
                `;
                tablaCargos.insertAdjacentHTML('beforeend', fila);
            });

            document.querySelectorAll('.btnEditar').forEach(btn => {
                btn.addEventListener('click', () => {
                    const cargo = cargosCache.find(c => c.id === Number(btn.dataset.id));
                    if (cargo) abrirModalCargo(cargo);
                });
            });

            document.querySelectorAll('.btnEliminar').forEach(btn => {
                btn.addEventListener('click', () => {
                    eliminarCargo(Number(btn.dataset.id), btn.dataset.nombre);
                });
            });

        } catch (error) {
            console.error("Error al cargar cargos:", error);
            Swal.fire({ icon: 'error', title: 'Fallo de Conexión', text: 'No se pudo cargar el catálogo de cargos.', ...estilosSwal });
        }
    };

    const abrirModalCargo = async (cargo = null) => {
        const resultado = await Swal.fire({
            title: cargo ? 'Editar Cargo' : 'Registrar Nuevo Cargo',
            html: `
                <div class="text-left space-y-4 mt-4">
                    <div>
                        <label class="block text-xs font-bold text-terminal-yellow mb-1 uppercase tracking-wider">Nombre del Cargo <span class="text-red-500">*</span></label>
                        <input id="cargoNombre" class="w-full px-3 py-2 bg-black border border-gray-700 rounded text-white focus:border-terminal-yellow outline-none uppercase" placeholder="Ej. CONDUCTOR" value="${cargo ? cargo.nombre : ''}">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-terminal-yellow mb-1 uppercase tracking-wider">Clasificación <span class="text-red-500">*</span></label>
                        <select id="cargoTipo" class="w-full px-3 py-2 bg-black border border-gray-700 rounded text-white focus:border-terminal-yellow outline-none" style="background-color: #1F2937;">
                            <option value="OPERATIVO" ${cargo && cargo.tipo === 'OPERATIVO' ? 'selected' : ''}>SOLO OPERATIVO (Cubre Turnos)</option>
                            <option value="ADMINISTRATIVO" ${cargo && cargo.tipo === 'ADMINISTRATIVO' ? 'selected' : ''}>SOLO ADMINISTRATIVO (Oficina)</option>
                            <option value="AMBOS" ${cargo && cargo.tipo === 'AMBOS' ? 'selected' : ''}>AMBOS (Oficina y Cubre Turnos)</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-terminal-yellow mb-1 uppercase tracking-wider">Descripción (Opcional)</label>
                        <textarea id="cargoDesc" class="w-full px-3 py-2 bg-black border border-gray-700 rounded text-white focus:border-terminal-yellow outline-none" rows="3" placeholder="Responsabilidades o detalles...">${cargo ? (cargo.descripcion || '') : ''}</textarea>
                    </div>
                </div>
            `,
            showCancelButton: true,
            cancelButtonText: 'Cancelar',
            confirmButtonText: cargo ? 'Guardar Cambios' : 'Crear Cargo',
            focusConfirm: false,
            ...estilosSwal,
            preConfirm: () => {
                const nombre = document.getElementById('cargoNombre').value.trim();
                const tipo = document.getElementById('cargoTipo').value;
                const descripcion = document.getElementById('cargoDesc').value.trim();

                if (!nombre) {
                    Swal.showValidationMessage('El nombre del cargo es obligatorio');
                    return false;
                }

                return { nombre, tipo, descripcion };
            }
        });

        if (resultado.isConfirmed) {
            const datos = resultado.value;
            Swal.fire({ title: 'Procesando...', allowOutsideClick: false, didOpen: () => Swal.showLoading(), ...estilosSwal });

            try {
                let respuesta;
                if (cargo) {
                    respuesta = await window.api.actualizarCargo({ id: cargo.id, ...datos });
                } else {
                    respuesta = await window.api.crearCargo(datos);
                }

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

    const eliminarCargo = async (id, nombre) => {
        const confirmacion = await Swal.fire({
            title: '¿Eliminar cargo?',
            text: `Vas a eliminar permanentemente "${nombre}".`,
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
                const respuesta = await window.api.eliminarCargo(id);
                if (respuesta.success) {
                    Swal.fire({ icon: 'success', title: 'Eliminado', text: respuesta.message, ...estilosSwal });
                    cargarTabla();
                } else {
                    Swal.fire({ icon: 'error', title: 'No se puede eliminar', text: respuesta.message, ...estilosSwal });
                }
            } catch (error) {
                console.error(error);
                Swal.fire({ icon: 'error', title: 'Error', text: 'Error al contactar con la base de datos.', ...estilosSwal });
            }
        }
    };

    btnNuevoCargo.addEventListener('click', () => abrirModalCargo());
    cargarTabla();
});