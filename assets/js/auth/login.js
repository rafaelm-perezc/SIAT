document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const btnForgotPassword = document.getElementById('btnForgotPassword');

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

    const estilosSwal = {
        confirmButtonColor: '#FACC15',
        background: '#1F2937',
        color: '#E2E8F0'
    };

    const solicitarCambioPasswordObligatorio = async (userId, oldPassword) => {
        const result = await Swal.fire({
            title: 'Cambio de Clave Requerido',
            html: `
                <div style="text-align:left; font-size:12px; margin-bottom:12px; border-left:4px solid #FACC15; padding-left:10px;">
                    <strong style="display:block; margin-bottom:6px;">Reglas de seguridad:</strong>
                    <ul style="padding-left:16px; margin:0; line-height:1.5;">
                        <li>Mínimo 8 caracteres.</li>
                        <li>Al menos 1 mayúscula y 1 minúscula.</li>
                        <li>Al menos 1 número.</li>
                        <li>Al menos 1 carácter especial (ej. @, *, #, _).</li>
                    </ul>
                </div>
                <input type="password" id="swalNewPassword" class="swal2-input" placeholder="Nueva contraseña" autocomplete="new-password">
                <input type="password" id="swalConfirmPassword" class="swal2-input" placeholder="Confirmar contraseña" autocomplete="new-password">
            `,
            focusConfirm: false,
            showCancelButton: true,
            cancelButtonText: 'Cancelar',
            confirmButtonText: 'Actualizar y entrar',
            ...estilosSwal,
            preConfirm: async () => {
                const newPass = document.getElementById('swalNewPassword').value;
                const confirmPass = document.getElementById('swalConfirmPassword').value;

                if (!newPass || !confirmPass) {
                    Swal.showValidationMessage('Debes completar ambos campos de contraseña.');
                    return false;
                }

                if (newPass !== confirmPass) {
                    Swal.showValidationMessage('Las contraseñas no coinciden.');
                    return false;
                }

                if (!passwordRegex.test(newPass)) {
                    Swal.showValidationMessage('La nueva contraseña no cumple las reglas de seguridad.');
                    return false;
                }

                const cambio = await window.api.cambiarPassword({
                    userId,
                    oldPassword,
                    newPassword: newPass
                });

                if (!cambio.success) {
                    Swal.showValidationMessage(cambio.message || 'No se pudo actualizar la contraseña.');
                    return false;
                }

                return true;
            }
        });

        if (result.isConfirmed) {
            await Swal.fire({
                icon: 'success',
                title: '¡Actualización Exitosa!',
                text: 'Tu contraseña ha sido guardada. Inicia sesión nuevamente con tu nueva clave.',
                ...estilosSwal
            });
            window.location.reload();
        }
    };

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const user = document.getElementById('usuario').value;
        const pass = document.getElementById('password').value;

        try {
            const resultado = await window.api.authLogin({ user, pass });

            if (!resultado.success) {
                return Swal.fire({
                    icon: 'error',
                    title: 'Acceso Denegado',
                    text: resultado.message,
                    ...estilosSwal
                });
            }

            if (resultado.requirePasswordChange) {
                await solicitarCambioPasswordObligatorio(resultado.user.id, pass);
                return;
            }

            Swal.fire({
                icon: 'success',
                title: '¡Bienvenido!',
                text: `Hola, ${resultado.user.nombre_completo}`,
                timer: 1500,
                showConfirmButton: false,
                ...estilosSwal
            }).then(() => {
                window.location.href = '../dashboard/index.ejs';
            });

        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error de Comunicación',
                text: 'No se pudo contactar con el motor del SIAT.',
                ...estilosSwal
            });
            console.error(error);
        }
    });

    btnForgotPassword.addEventListener('click', async () => {
        const { value: documento } = await Swal.fire({
            title: 'Restablecer contraseña',
            input: 'text',
            inputLabel: 'Número de documento',
            inputPlaceholder: 'Ingresa tu documento de identidad',
            showCancelButton: true,
            cancelButtonText: 'Cancelar',
            confirmButtonText: 'Restablecer',
            ...estilosSwal,
            inputValidator: (value) => {
                if (!value || !value.trim()) return 'Debes ingresar un número de documento.';
                return null;
            }
        });

        if (!documento) return;

        try {
            const reset = await window.api.resetPassword(documento.trim());

            if (!reset.success) {
                return Swal.fire({
                    icon: 'error',
                    title: 'No se pudo restablecer',
                    text: reset.message,
                    ...estilosSwal
                });
            }

            Swal.fire({
                icon: 'success',
                title: 'Contraseña restablecida',
                text: 'Tu contraseña temporal ahora es tu número de documento. Debes cambiarla al iniciar sesión.',
                ...estilosSwal
            });
        } catch (error) {
            console.error(error);
            Swal.fire({
                icon: 'error',
                title: 'Error de Comunicación',
                text: 'No se pudo procesar el restablecimiento de contraseña.',
                ...estilosSwal
            });
        }
    });
});