document.addEventListener('DOMContentLoaded', () => {
    
    const tablaUsuarios = document.getElementById('tablaUsuarios');
    const btnNuevoUsuario = document.getElementById('btnNuevoUsuario');

    const estilosSwal = {
        confirmButtonColor: '#FACC15',
        background: '#1F2937',
        color: '#E2E8F0'
    };

    let usuariosCache = [];

    // ==========================================
    // 1. CARGAR TABLA DE USUARIOS
    // ==========================================
    const cargarTabla = async () => {
        try {
            const respuesta = await window.api.getAllUsuarios();
            
            if (!respuesta.success) {
                Swal.fire({ icon: 'error', title: 'Error', text: respuesta.message, ...estilosSwal });
                return;
            }

            usuariosCache = respuesta.data;
            if(!tablaUsuarios) return; // Por si el DOM no ha cargado esta sección

            tablaUsuarios.innerHTML = '';

            if (usuariosCache.length === 0) {
                tablaUsuarios.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-gray-500 italic">No hay usuarios registrados.</td></tr>';
                return;
            }

            usuariosCache.forEach(u => {
                const esAdminRaiz = u.usuario === 'ADMIN';
                const nombreCompleto = `${u.primer_nombre} ${u.primer_apellido}`;
                const badgeActivo = u.activo === 1
                    ? '<span class="px-2 py-1 bg-green-900 text-green-300 rounded text-xs font-bold border border-green-700">ACTIVO</span>'
                    : '<span class="px-2 py-1 bg-red-900 text-red-300 rounded text-xs font-bold border border-red-700">INACTIVO</span>';
                
                const textoCambioClave = u.debe_cambiar_password === 1 
                    ? '<span class="text-xs text-terminal-yellow block mt-1">⚠️ Requiere cambio clave</span>' 
                    : '';

                let botonesHTML = '';
                if (esAdminRaiz) {
                    botonesHTML = `<span class="text-xs text-gray-500 italic px-2 py-1 bg-gray-800 rounded">Intocable</span>`;
                } else {
                    const textoBloqueo = u.activo === 1 ? 'Bloquear' : 'Desbloquear';
                    const colorBloqueo = u.activo === 1 ? 'bg-red-700 hover:bg-red-600' : 'bg-green-700 hover:bg-green-600';
                    
                    botonesHTML = `
                        <div class="flex justify-center gap-2">
                            <button class="btnReset px-2 py-1 rounded bg-blue-700 hover:bg-blue-600 text-white text-xs font-semibold" data-id="${u.id}" title="Restablecer Clave">Reset</button>
                            <button class="btnToggle px-2 py-1 rounded ${colorBloqueo} text-white text-xs font-semibold" data-id="${u.id}">${textoBloqueo}</button>
                        </div>
                    `;
                }

                const fila = `
                    <tr class="hover:bg-gray-800 transition-colors">
                        <td class="p-3 font-medium text-white">${u.documento}<br><span class="text-xs text-gray-400">${nombreCompleto}</span></td>
                        <td class="p-3 text-xs text-terminal-yellow font-bold">${u.rol}</td>
                        <td class="p-3 text-xs text-gray-400">${u.cargo_nombre}</td>
                        <td class="p-3 text-center align-middle">${badgeActivo} ${textoCambioClave}</td>
                        <td class="p-3 text-center align-middle">${botonesHTML}</td>
                    </tr>
                `;
                tablaUsuarios.insertAdjacentHTML('beforeend', fila);
            });

            // Asignar eventos dinámicos
            document.querySelectorAll('.btnReset').forEach(btn => {
                btn.addEventListener('click', () => resetearClave(Number(btn.dataset.id)));
            });

            document.querySelectorAll('.btnToggle').forEach(btn => {
                btn.addEventListener('click', () => cambiarEstado(Number(btn.dataset.id)));
            });

        } catch (error) {
            console.error("Error al cargar usuarios:", error);
            Swal.fire({ icon: 'error', title: 'Fallo de Conexión', text: 'No se pudo cargar la tabla de usuarios.', ...estilosSwal });
        }
    };

    // ==========================================
    // 2. MODAL CREAR USUARIO
    // ==========================================
    const abrirModalUsuario = async () => {
        // Obtenemos los empleados que NO tienen usuario asignado
        const empleadosDisp = await window.api.getEmpleadosSinUsuario();
        
        if (!empleadosDisp.success) {
            Swal.fire({ icon: 'error', title: 'Error', text: empleadosDisp.message, ...estilosSwal });
            return;
        }

        if (empleadosDisp.data.length === 0) {
            Swal.fire({ icon: 'info', title: 'Sin candidatos', text: 'Todos los empleados registrados ya tienen una cuenta de usuario asignada, o no hay empleados creados en el sistema.', ...estilosSwal });
            return;
        }

        const opcionesEmpleados = empleadosDisp.data.map(e => 
            `<option value="${e.id}" style="background-color: #1F2937; color: white;">${e.documento} - ${e.primer_nombre} ${e.primer_apellido} (${e.cargo_nombre})</option>`
        ).join('');

        const resultado = await Swal.fire({
            title: 'Asignar Acceso al Sistema',
            html: `
                <div class="text-left space-y-4 mt-4">
                    <p class="text-xs text-gray-400 mb-2">Selecciona un empleado de la lista para crearle una cuenta digital. Su contraseña por defecto será su número de documento.</p>
                    <div>
                        <label class="block text-xs font-bold text-terminal-yellow mb-1 uppercase tracking-wider">Empleado <span class="text-red-500">*</span></label>
                        <select id="userEmpleadoId" class="w-full px-3 py-2 bg-black border border-gray-700 rounded text-white focus:border-terminal-yellow outline-none" style="background-color: #1F2937; color: white;">
                            <option value="" disabled selected style="background-color: #1F2937; color: gray;">Seleccione un empleado...</option>
                            ${opcionesEmpleados}
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-terminal-yellow mb-1 uppercase tracking-wider">Rol de Acceso <span class="text-red-500">*</span></label>
                        <select id="userRol" class="w-full px-3 py-2 bg-black border border-gray-700 rounded text-white focus:border-terminal-yellow outline-none" style="background-color: #1F2937; color: white;">
                            <option value="" disabled selected style="background-color: #1F2937; color: gray;">Seleccione el nivel de permisos...</option>
                            <option value="SUPER USUARIO" style="background-color: #1F2937; color: white;">SUPER USUARIO (Acceso Total)</option>
                            <option value="ADMINISTRATIVO" style="background-color: #1F2937; color: white;">ADMINISTRATIVO (Gestión e Informes)</option>
                            <option value="OPERATIVO" style="background-color: #1F2937; color: white;">OPERATIVO (Solo lectura de turnos)</option>
                        </select>
                    </div>
                </div>
            `,
            showCancelButton: true,
            cancelButtonText: 'Cancelar',
            confirmButtonText: 'Crear Usuario',
            focusConfirm: false,
            width: 600,
            ...estilosSwal,
            preConfirm: () => {
                const empleado_id = document.getElementById('userEmpleadoId').value;
                const rol = document.getElementById('userRol').value;

                if (!empleado_id || !rol) {
                    Swal.showValidationMessage('Debes seleccionar el empleado y el rol.');
                    return false;
                }

                return { empleado_id: Number(empleado_id), rol };
            }
        });

        if (resultado.isConfirmed) {
            Swal.fire({ title: 'Procesando...', allowOutsideClick: false, didOpen: () => Swal.showLoading(), ...estilosSwal });
            try {
                const respuesta = await window.api.crearUsuario(resultado.value);
                if (respuesta.success) {
                    Swal.fire({ icon: 'success', title: 'Cuenta Creada', text: respuesta.message, ...estilosSwal });
                    cargarTabla();
                } else {
                    Swal.fire({ icon: 'error', title: 'Atención', text: respuesta.message, ...estilosSwal });
                }
            } catch (error) {
                console.error(error);
                Swal.fire({ icon: 'error', title: 'Error', text: 'Ocurrió un error inesperado al crear el usuario.', ...estilosSwal });
            }
        }
    };

    // ==========================================
    // 3. CAMBIAR ESTADO (BLOQUEAR/DESBLOQUEAR)
    // ==========================================
    const cambiarEstado = async (id) => {
        try {
            const respuesta = await window.api.toggleUsuarioActivo(id);
            if (respuesta.success) {
                // Toast notification (no interrumpe al usuario)
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: respuesta.message, showConfirmButton: false, timer: 2000, background: '#1F2937', color: '#E2E8F0' });
                cargarTabla();
            } else {
                Swal.fire({ icon: 'error', title: 'Acción Denegada', text: respuesta.message, ...estilosSwal });
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Fallo al cambiar el estado del usuario.', ...estilosSwal });
        }
    };

    // ==========================================
    // 4. RESETEAR CLAVE
    // ==========================================
    const resetearClave = async (id) => {
        const confirmacion = await Swal.fire({
            title: '¿Resetear Contraseña?',
            text: `La clave volverá a ser el número de documento y el sistema obligará al usuario a cambiarla en su próximo inicio de sesión.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444', 
            cancelButtonColor: '#374151',
            confirmButtonText: 'Sí, resetear clave',
            cancelButtonText: 'Cancelar',
            ...estilosSwal
        });

        if (confirmacion.isConfirmed) {
            Swal.fire({ title: 'Procesando...', allowOutsideClick: false, didOpen: () => Swal.showLoading(), ...estilosSwal });
            try {
                const respuesta = await window.api.resetPasswordUsuario(id);
                if (respuesta.success) {
                    Swal.fire({ icon: 'success', title: 'Clave Restablecida', text: respuesta.message, ...estilosSwal });
                    cargarTabla();
                } else {
                    Swal.fire({ icon: 'error', title: 'Atención', text: respuesta.message, ...estilosSwal });
                }
            } catch (error) {
                Swal.fire({ icon: 'error', title: 'Error', text: 'Error al contactar con la base de datos.', ...estilosSwal });
            }
        }
    };

    // INICIALIZACIÓN
    if(btnNuevoUsuario) btnNuevoUsuario.addEventListener('click', abrirModalUsuario);
    
    // Si la tabla existe en la vista, la cargamos
    if(tablaUsuarios) cargarTabla();
});