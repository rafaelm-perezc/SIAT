document.addEventListener('DOMContentLoaded', () => {
    
    // Referencias a los elementos del DOM
    const loginForm = document.getElementById('loginForm');
    const changePasswordForm = document.getElementById('changePasswordForm');
    const formSubtitle = document.getElementById('formSubtitle');
    const btnCancelChange = document.getElementById('btnCancelChange');

    // Variables temporales para el proceso de cambio de clave
    let tempUserId = null;
    let tempOldPassword = null;

    // ==========================================
    // 1. EVENTO DE INICIO DE SESIÓN
    // ==========================================
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const user = document.getElementById('usuario').value;
        const pass = document.getElementById('password').value;

        const payload = { user, pass };

        try {
            const resultado = await window.api.authLogin(payload);

            if (resultado.success) {
                
                // INTERCEPTOR DE SEGURIDAD: ¿Debe cambiar la contraseña?
                if (resultado.requirePasswordChange) {
                    
                    // Guardamos los datos temporalmente
                    tempUserId = resultado.user.id;
                    tempOldPassword = pass;

                    // Cambiamos la interfaz
                    loginForm.classList.add('hidden');
                    loginForm.classList.remove('block');
                    
                    changePasswordForm.classList.remove('hidden');
                    changePasswordForm.classList.add('block');
                    
                    formSubtitle.innerText = 'Actualización de Seguridad Requerida';
                    formSubtitle.classList.replace('text-gray-400', 'text-terminal-yellow');

                    Swal.fire({
                        icon: 'info',
                        title: 'Cambio de Clave Requerido',
                        text: 'Por normativas de seguridad, debes establecer una contraseña personal antes de ingresar al sistema.',
                        confirmButtonColor: '#FACC15',
                        background: '#1F2937', color: '#E2E8F0'
                    });

                } else {
                    // Acceso Normal Permitido
                    Swal.fire({
                        icon: 'success',
                        title: '¡Bienvenido!',
                        text: `Hola, ${resultado.user.nombre_completo}`,
                        timer: 1500,
                        showConfirmButton: false,
                        background: '#1F2937', color: '#E2E8F0'
                    }).then(() => {
                        window.location.href = '../dashboard/index.ejs'; 
                    });
                }
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Acceso Denegado',
                    text: resultado.message,
                    confirmButtonColor: '#FACC15',
                    background: '#1F2937', color: '#E2E8F0'
                });
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error de Comunicación',
                text: 'No se pudo contactar con el motor del SIAT.',
                background: '#1F2937', color: '#E2E8F0'
            });
            console.error(error);
        }
    });

    // ==========================================
    // 2. EVENTO DE CAMBIO DE CONTRASEÑA
    // ==========================================
    changePasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const newPass = document.getElementById('newPassword').value;
        const confirmPass = document.getElementById('confirmPassword').value;

        // Validación en frontend de contraseñas iguales
        if (newPass !== confirmPass) {
            return Swal.fire({
                icon: 'warning',
                title: 'Atención',
                text: 'Las contraseñas no coinciden. Por favor, verifica.',
                confirmButtonColor: '#FACC15',
                background: '#1F2937', color: '#E2E8F0'
            });
        }

        try {
            // Llamamos al canal seguro de cambio de contraseña
            const result = await window.api.cambiarPassword({ 
                userId: tempUserId, 
                oldPassword: tempOldPassword, 
                newPassword: newPass 
            });

            if (result.success) {
                Swal.fire({
                    icon: 'success',
                    title: '¡Actualización Exitosa!',
                    text: 'Tu contraseña ha sido guardada. Por favor, inicia sesión con tus nuevas credenciales.',
                    confirmButtonColor: '#FACC15',
                    background: '#1F2937', color: '#E2E8F0'
                }).then(() => {
                    // Refrescamos la página para volver al login normal
                    window.location.reload(); 
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error de Seguridad',
                    text: result.message,
                    confirmButtonColor: '#FACC15',
                    background: '#1F2937', color: '#E2E8F0'
                });
            }
        } catch (error) {
            console.error(error);
        }
    });

    // ==========================================
    // 3. EVENTO CANCELAR CAMBIO
    // ==========================================
    btnCancelChange.addEventListener('click', () => {
        // Al cancelar, simplemente recargamos la vista
        window.location.reload();
    });

});