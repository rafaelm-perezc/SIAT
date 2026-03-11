// Esperamos a que el DOM cargue completamente (buena práctica)
document.addEventListener('DOMContentLoaded', () => {
    
    const loginForm = document.getElementById('loginForm');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Evitamos que la página se recargue
        
        // Capturamos los datos
        const usuarioInput = document.getElementById('usuario').value;
        const passwordInput = document.getElementById('password').value;

        // AQUÍ ESTABA EL ERROR: Enviamos un único OBJETO con propiedades
        const payload = {
            user: usuarioInput,
            pass: passwordInput
        };

        try {
            // Llamamos al puente seguro
            const resultado = await window.api.authLogin(payload);

            if (resultado.success) {
                Swal.fire({
                    icon: 'success',
                    title: '¡Bienvenido!',
                    text: `Hola, ${resultado.user.nombre_completo}`,
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => {
                    // Redirigimos al Dashboard (Lo crearemos a continuación)
                    window.location.href = '../dashboard/index.ejs'; 
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Acceso Denegado',
                    text: resultado.message
                });
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error de Comunicación',
                text: 'No se pudo contactar con el motor del SIAT.'
            });
            console.error(error);
        }
    });

});