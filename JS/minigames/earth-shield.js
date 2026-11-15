/* =====================================================
   EARTH - SHIELD CALIBRATION (keyboard)
   Press the key shown on screen. Complete 5 signals.
===================================================== */
(function () {
    "use strict";
    const { drawChallengeBase } = OrbitMiniGames.helpers;
    const OPTIONS = ["w", "a", "s", "d"];
    const LENGTH = 5;
    let sequence = [], step = 0;

    OrbitMiniGames.earthShield = {
        planet: "EARTH", title: "SHIELD CALIBRATION",
        timeLimit: 45000, timeoutMessage: "Time ran out. Try the challenge again.",

        start() {
            step = 0;
            sequence = Array.from({ length: LENGTH }, () => OPTIONS[Math.floor(Math.random() * OPTIONS.length)]);
        },

        onKey(key, api) {
            if (key === sequence[step]) {
                step++;
                if (step >= LENGTH) {
                    api.ship.hull = Math.min(100, api.ship.hull + 40);
                    api.complete({ message: "Shield calibration complete. Hull integrity restored." });
                }
            } else if (OPTIONS.includes(key)) {
                step = 0;
            }
        },

        draw(api) {
            const { ctx } = api;
            drawChallengeBase(api, "EARTH // SHIELD CALIBRATION", "MATCH THE KEY DISPLAYED BELOW");
            ctx.fillStyle = "#103d59"; ctx.beginPath(); ctx.arc(500, 280, 85, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = "#42eaff"; ctx.lineWidth = 5; ctx.stroke();
            ctx.fillStyle = "#fff"; ctx.font = "bold 60px monospace";
            ctx.fillText((sequence[step] || "").toUpperCase(), 500, 302);
            ctx.font = "22px monospace"; ctx.fillText("CALIBRATION: " + step + "/" + LENGTH, 500, 420);
        }
    };
})();
