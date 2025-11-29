const button = document.getElementById("hospitalButton");
const statusText = document.getElementById("statusText");

function setStatus(msg, show = true) {
    statusText.textContent = msg;
    statusText.style.opacity = show ? "1" : "0";
}

function disableButton(state) {
    button.disabled = state;
    button.classList.toggle("pulsing", state);
    button.textContent = state ? "BUSCANDO…" : "EMERGÊNCIA";
}

function fallbackSearch() {
    setStatus("buscando alternativa…");
    window.open("https://www.google.com/maps/search/hospital+perto+de+mim/", "_blank");
}

button.addEventListener("click", function () {
    disableButton(true);
    setStatus("Obtendo localização…");

    if (!navigator.geolocation) {
        setStatus("GPS indisponível");
        fallbackSearch();
        disableButton(false);
        return;
    }

    navigator.geolocation.getCurrentPosition(
        function (position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            setStatus("Localização obtida");

            // Agora abre a ROTA exata
            const url =
                `https://www.google.com/maps/dir/?api=1&origin=${lat},${lng}&destination=hospital&travelmode=driving`;

            window.open(url, "_blank");
            disableButton(false);
        },

        function (error) {
            if (error.code === error.PERMISSION_DENIED) {
                setStatus("sem permissão");
            } else if (error.code === error.TIMEOUT) {
                setStatus("GPS lento");
            } else {
                setStatus("erro no GPS");
            }

            fallbackSearch();
            disableButton(false);
        },

        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        }
    );
});