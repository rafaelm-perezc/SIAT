document.addEventListener('DOMContentLoaded', () => {
    
    const tablaZonas = document.getElementById('tablaZonas');
    const btnNuevaZona = document.getElementById('btnNuevaZona');

    const estilosSwal = {
        confirmButtonColor: '#FACC15',
        background: '#1F2937',
        color: '#E2E8F0'
    };

    let zonasCache = [];

    // ==========================================
    // 1. CARGAR TABLA
    // ==========================================
    const cargarTabla = async () => {
        try {
            const respuesta = await window.api.getAllZonas();
            
            if (!respuesta.success) {
                Swal.fire({ icon: 'error', title: 'Error', text: respuesta.message, ...estilosSwal });
                return;
            }

            zonasCache = respuesta.data;
            if(!tablaZonas) return;

            tablaZonas.innerHTML = '';

            if (zonasCache.length === 0) {
                tablaZonas.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-gray-500 italic">No hay zonas registradas en la infraestructura.</td></tr>';
                return;
            }

            zonasCache.forEach(zona => {
                const fila = `
                    <tr class="hover:bg-gray-800 transition-colors">
                        <td class="p-4 text-center text-gray-500 font-mono text-xs">#${zona.id}</td>
                        <td class="p-4 font-bold text-terminal-yellow">${zona.abreviatura}</td>
                        <td class="p-4 font-bold text-white">${zona.nombre}</td>
                        <td class="p-4 text-center">
                            <span class="px-4 py-1 bg-gray-900 border border-gray-700 rounded-full text-blue-300 font-bold">
                                👨‍🔧 ${zona.personal_requerido} operario(s)
                            </span>
                        </td>
                        <td class="p-4 text-center">
                            <div class="flex justify-center gap-2">
                                <button class="btnEditar px-3 py-1 rounded bg-blue-700 hover:bg-blue-600 text-white text-xs font-semibold" data-id="${zona.id}">Editar</button>
                                <button class="btnEliminar px-3 py-1 rounded bg-red-700 hover:bg-red-600 text-white text-xs font-semibold" data-id="${zona.id}" data-nombre="${zona.nombre}">X</button>
                            </div>
                        </td>
                    </tr>
                `;
                tablaZonas.insertAdjacentHTML('beforeend', fila);
            });

            document.querySelectorAll('.btnEditar').forEach(btn => {
                btn.addEventListener('click', () => {
                    const zona = zonasCache.find(z => z.id === Number(btn.dataset.id));
                    if (zona) abrirModalZona(zona);
                });
            });

            document.querySelectorAll('.btnEliminar').forEach(btn => {
                btn.addEventListener('click', () => eliminarZona(Number(btn.dataset.id), btn.dataset.nombre));
            });

        } catch (error) {
            console.error("Error al cargar zonas:", error);
            Swal.fire({ icon: 'error', title: 'Fallo de Conexión', text: 'No se pudo cargar la tabla de zonas.', ...estilosSwal });
        }
    };

    // ==========================================
    // 2. MODAL CREAR / EDITAR ZONA
    // ==========================================
    const abrirModalZona = async (zona = null) => {
        const resultado = await Swal.fire({
            title: zona ? 'Editar Zona' : 'Registrar Nueva Zona',
            html: `
                <div class="text-left space-y-4 mt-4">
                    <div class="grid grid-cols-3 gap-4">
                        <div class="col-span-1">
                            <label class="block text-xs font-bold text-terminal-yellow mb-1 uppercase tracking-wider">Abrev. <span class="text-red-500">*</span></label>
                            <input id="zonaAbrev" class="w-full px-3 py-2 bg-black border border-gray-700 rounded text-white focus:border-terminal-yellow outline-none uppercase" placeholder="Ej. PTN" value="${zona ? zona.abreviatura : ''}" maxlength="5">
                        </div>
                        <div class="col-span-2">
                            <label class="block text-xs font-bold text-terminal-yellow mb-1 uppercase tracking-wider">Nombre de la Zona <span class="text-red-500">*</span></label>
                            <input id="zonaNombre" class="w-full px-3 py-2 bg-black border border-gray-700 rounded text-white focus:border-terminal-yellow outline-none uppercase" placeholder="Ej. PLATAFORMA NORTE" value="${zona ? zona.nombre : ''}">
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-terminal-yellow mb-1 uppercase tracking-wider">Personal Requerido por Turno <span class="text-red-500">*</span></label>
                        <input type="number" id="zonaPersonal" min="1" class="w-full px-3 py-2 bg-black border border-gray-700 rounded text-white focus:border-terminal-yellow outline-none" placeholder="1" value="${zona ? zona.personal_requerido : '1'}">
                        <p class="text-xs text-gray-500 mt-1">¿Cuántos empleados operativos se necesitan en esta área al mismo tiempo?</p>
                    </div>
                </div>
            `,
            showCancelButton: true,
            cancelButtonText: 'Cancelar',
            confirmButtonText: zona ? 'Guardar Cambios' : 'Registrar Zona',
            focusConfirm: false,
            ...estilosSwal,
            preConfirm: () => {
                const abreviatura = document.getElementById('zonaAbrev').value.trim();
                const nombre = document.getElementById('zonaNombre').value.trim();
                const personal_requerido = document.getElementById('zonaPersonal').value;

                if (!abreviatura || !nombre) {
                    Swal.showValidationMessage('La abreviatura y el nombre son obligatorios');
                    return false;
                }
                if (personal_requerido < 1) {
                    Swal.showValidationMessage('El personal requerido debe ser al menos 1');
                    return false;
                }

                return { abreviatura, nombre, personal_requerido: Number(personal_requerido) };
            }
        });

        if (resultado.isConfirmed) {
            const datos = resultado.value;
            Swal.fire({ title: 'Procesando...', allowOutsideClick: false, didOpen: () => Swal.showLoading(), ...estilosSwal });

            try {
                let respuesta = zona 
                    ? await window.api.actualizarZona({ id: zona.id, ...datos }) 
                    : await window.api.crearZona(datos);

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
    // 3. ELIMINAR ZONA
    // ==========================================
    const eliminarZona = async (id, nombre) => {
        const confirmacion = await Swal.fire({
            title: '¿Eliminar zona?',
            text: `Vas a eliminar permanentemente la zona "${nombre}".`,
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
                const respuesta = await window.api.eliminarZona(id);
                
                if (respuesta.success) {
                    Swal.fire({ icon: 'success', title: 'Eliminada', text: respuesta.message, ...estilosSwal });
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

    if(btnNuevaZona) btnNuevaZona.addEventListener('click', () => abrirModalZona());
    
    // Carga inicial
    cargarTabla();
});