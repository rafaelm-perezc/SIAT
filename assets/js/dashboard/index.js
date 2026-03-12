document.addEventListener('DOMContentLoaded', async () => {
    
    // Referencias a los números en la pantalla (Agregaremos estos IDs en el index.ejs)
    const elPersonalOperativo = document.getElementById('statOperativos');
    const elZonasActivas = document.getElementById('statZonas');
    const elLimiteJornada = document.getElementById('statJornada');

    const cargarEstadisticas = async () => {
        try {
            // Llamamos al canal IPC que crearemos en main.js
            const respuesta = await window.api.getDashboardStats();
            
            if (respuesta.success) {
                const stats = respuesta.data;
                
                // Inyectamos los números dinámicos en las tarjetas
                if (elPersonalOperativo) elPersonalOperativo.textContent = stats.personalOperativo;
                if (elZonasActivas) elZonasActivas.textContent = stats.zonasActivas;
                if (elLimiteJornada) elLimiteJornada.textContent = stats.limiteJornada + 'h';
            } else {
                console.error("No se pudieron cargar las estadísticas:", respuesta.message);
            }
        } catch (error) {
            console.error("Error de comunicación al cargar estadísticas del Dashboard:", error);
        }
    };

    // Ejecutar la carga de datos
    cargarEstadisticas();
});