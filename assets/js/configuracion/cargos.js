document.addEventListener('DOMContentLoaded', () => {
    
    const tablaCargos = document.getElementById('tablaCargos');
    const btnNuevoCargo = document.getElementById('btnNuevoCargo');

    // Paleta de colores estándar para alertas
    const estilosSwal = {
        confirmButtonColor: '#FACC15', // Amarillo Terminal
        background: '#1F2937',         // Gris Oscuro
        color: '#E2E8F0'               // Texto claro
    };

    let cargosCache = [];

    // ==========================================
    // 1. CARGAR TABLA
    // ==========================================
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
                tablaCargos.innerHTML = '<tr><td colspan="3" class="p-8 text-center text-gray-500 italic">No hay cargos registrados en el sistema.</td></tr>';
                return;
            }

            cargosCache.forEach(cargo => {
                const esAdmin = cargo.nombre === 'ADMINISTRADOR DEL SISTEMA';
                
                // Lógica de botones: El Administrador no se puede tocar
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

                const fila = `
                    <tr class="hover:bg-gray-800 transition-colors">
                        <td class="p-3 font-bold text-white">${cargo.nombre}</td>
                        <td class="p-3 text-gray-400 text-xs">${cargo.descripcion || '<span class="italic text-gray-600">Sin descripción...</span>'}</td>
                        <td class="p-3 text-center align-middle">${botonesHTML}</td>
                    </tr>
                `;
                tablaCargos.insertAdjacentHTML('beforeend', fila);
            });

            // Reasignar eventos dinámicos a los botones nuevos
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

    // ==========================================
    // 2. MODAL CREAR / EDITAR CARGO
    // ==========================================
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
                const descripcion = document.getElementById('cargoDesc').value.trim();

                if (!nombre) {
                    Swal.showValidationMessage('El nombre del cargo es obligatorio');
                    return false;
                }

                return { nombre, descripcion };
            }
        });

        // Procesar la respuesta del modal
        if (resultado.isConfirmed) {
            const datos = resultado.value;
            
            // Mostrar estado de carga
            Swal.fire({ title: 'Procesando...', allowOutsideClick: false, didOpen: () => Swal.showLoading(), ...estilosSwal });

            try {
                let respuesta;
                if (cargo) {
                    // Editar
                    respuesta = await window.api.actualizarCargo({ id: cargo.id, ...datos });
                } else {
                    // Crear
                    respuesta = await window.api.crearCargo(datos);
                }

                if (respuesta.success) {
                    Swal.fire({ icon: 'success', title: 'Operación Exitosa', text: respuesta.message, ...estilosSwal });
                    cargarTabla(); // Recargar los datos
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
    // 3. ELIMINAR CARGO
    // ==========================================
    const eliminarCargo = async (id, nombre) => {
        const confirmacion = await Swal.fire({
            title: '¿Eliminar cargo?',
            text: `Vas a eliminar permanentemente "${nombre}".`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444', // Rojo para acción destructiva
            cancelButtonColor: '#374151',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            background: '#1F2937', color: '#E2E8F0'
        });

        if (confirmacion.isConfirmed) {
            Swal.fire({ title: 'Eliminando...', allowOutsideClick: false, didOpen: () => Swal.showLoading(), ...estilosSwal });
            
            try {
                const respuesta = await window.api.eliminarCargo(id);
                
                if (respuesta.success) {
                    Swal.fire({ icon: 'success', title: 'Eliminado', text: respuesta.message, ...estilosSwal });
                    cargarTabla();
                } else {
                    // Aquí se mostrará si el cargo tiene empleados asignados
                    Swal.fire({ icon: 'error', title: 'No se puede eliminar', text: respuesta.message, ...estilosSwal });
                }
            } catch (error) {
                console.error(error);
                Swal.fire({ icon: 'error', title: 'Error', text: 'Error al contactar con la base de datos.', ...estilosSwal });
            }
        }
    };

    // ==========================================
    // 4. INICIALIZAR EVENTOS
    // ==========================================
    btnNuevoCargo.addEventListener('click', () => abrirModalCargo());
    
    // Ejecutar la carga inicial
    cargarTabla();
});