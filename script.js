document.getElementById("hospitalButton").addEventListener("click", function() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                // Abre Google Maps já com rota até o hospital mais próximo
                const url = `https://www.google.com/maps/dir/?api=1&origin=${lat},${lng}&destination=hospital&travelmode=driving`;
                window.open(url, "_blank");
            },
            function() {
                alert("Não foi possível acessar sua localização. Por favor, permita o uso do GPS.");
            }
        );
    } else {
        alert("Seu navegador não suporta Geolocalização.");
    }
});
