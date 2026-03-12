document.addEventListener('DOMContentLoaded', async () => {
    
    // Referencias a los números en la pantalla HTML
    const elPersonalOperativo = document.getElementById('statOperativos');
    const elZonasActivas = document.getElementById('statZonas');
    const elTurnosHoy = document.getElementById('statTurnosHoy'); // [NUEVO]
    const elHorasExtras = document.getElementById('statHorasExtras'); // [NUEVO]
    const elLimiteJornada = document.getElementById('statJornada');

    const cargarEstadisticas = async () => {
        try {
            // Llamamos al canal IPC a través de la API expuesta
            const respuesta = await window.api.getDashboardStats();
            
            if (respuesta.success) {
                const stats = respuesta.data;
                
                // Inyectamos los números dinámicos que calculó el backend en las tarjetas
                if (elPersonalOperativo) elPersonalOperativo.textContent = stats.personalOperativo;
                if (elZonasActivas) elZonasActivas.textContent = stats.zonasActivas;
                
                // [NUEVO BLOQUE]: Llenamos las nuevas métricas críticas
                if (elTurnosHoy) elTurnosHoy.textContent = stats.turnosHoy;
                if (elHorasExtras) elHorasExtras.textContent = stats.horasExtrasMes + ' h';
                
                if (elLimiteJornada) elLimiteJornada.textContent = stats.limiteJornada + ' h';
            } else {
                console.error("No se pudieron cargar las estadísticas:", respuesta.message);
            }
        } catch (error) {
            console.error("Error de comunicación al cargar estadísticas del Dashboard:", error);
        }
    };

    // Ejecutar la carga de datos de forma automática al renderizar la vista
    cargarEstadisticas();
});