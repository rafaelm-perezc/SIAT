// assets/js/app.js

document.addEventListener('DOMContentLoaded', () => {
    
    // =========================================================
    // 0. CAPTURA GLOBAL DE ERRORES FRONTEND
    // =========================================================
    window.addEventListener('error', (event) => {
        console.error("⛔ [SIAT FRONTEND ERROR]:", event.error || event.message);
    });

    window.addEventListener('unhandledrejection', (event) => {
        // Ignorar el falso positivo de Autofill nativo de Chrome/Electron
        if (event.reason && event.reason.message && event.reason.message.includes('Autofill')) return;
        
        console.error("⛔ [SIAT PROMESA RECHAZADA FRONTEND]:", event.reason);
    });

    // =========================================================
    // 1. MANEJO DEL HEADER: Fecha actual dinámica
    // =========================================================
    const dateElement = document.getElementById('currentDate');
    if (dateElement) {
        const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        let fechaActual = new Date().toLocaleDateString('es-CO', opciones);
        fechaActual = fechaActual.charAt(0).toUpperCase() + fechaActual.slice(1);
        
        dateElement.textContent = fechaActual;
    }

    // =========================================================
    // 2. MANEJO DEL SIDEBAR: Cierre de sesión seguro
    // =========================================================
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', (e) => {
            e.preventDefault();

            Swal.fire({
                title: '¿Deseas cerrar sesión?',
                text: "Saldrás de tu cuenta y volverás a la pantalla de acceso.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#FACC15', 
                cancelButtonColor: '#374151',  
                confirmButtonText: '<span style="color: black; font-weight: bold;">Sí, cerrar sesión</span>',
                cancelButtonText: 'Cancelar',
                background: '#1F2937', 
                color: '#E2E8F0'       
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = '../auth/login.ejs';
                }
            });
        });
    }

});