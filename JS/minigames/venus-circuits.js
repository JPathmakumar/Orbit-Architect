/* =====================================================
   VENUS - POWER REPAIR (mouse)
   Click the four circuit tiles in order: 1, 2, 3, 4.
===================================================== */
(function () {
    "use strict";
    const { drawChallengeBase } = OrbitMiniGames.helpers;
    const TILES = [350, 450, 550, 650].map(x => ({ x, y: 240 }));
    const SIZE = 65;
    let clicks = 0;

    OrbitMiniGames.venusCircuits = {
        planet: "VENUS", title: "POWER REPAIR",
        timeLimit: 45000, timeoutMessage: "Time ran out. Try the challenge again.",

        start() { clicks = 0; },

        onClick(p, api) {
            const t = TILES[clicks];
            if (!t) return;
            if (p.x >= t.x && p.x <= t.x + SIZE && p.y >= t.y && p.y <= t.y + SIZE) {
                clicks++;
                if (clicks >= TILES.length) {
                    api.ship.power = 100;
                    api.complete({ message: "Power systems restored to 100%." });
                }
            }
        },

        draw(api) {
            const { ctx } = api;
            drawChallengeBase(api, "VENUS // POWER REPAIR", "CLICK THE CIRCUIT TILES IN ORDER: 1 → 2 → 3 → 4");
            TILES.forEach((t, i) => {
                ctx.fillStyle = i < clicks ? "#176c65" : "#132e48"; ctx.fillRect(t.x, t.y, SIZE, SIZE);
                ctx.strokeStyle = i < clicks ? "#52ffba" : "#42eaff"; ctx.lineWidth = 3; ctx.strokeRect(t.x, t.y, SIZE, SIZE);
                ctx.fillStyle = "#fff"; ctx.font = "bold 28px monospace"; ctx.fillText(String(i + 1), t.x + 32, t.y + 42);
                if (i < TILES.length - 1) {
                    ctx.strokeStyle = "#42eaff"; ctx.lineWidth = 4;
                    ctx.beginPath(); ctx.moveTo(t.x + SIZE, t.y + 32); ctx.lineTo(t.x + 100, t.y + 32); ctx.stroke();
                }
            });
            ctx.fillStyle = "#fff"; ctx.font = "20px monospace";
            ctx.fillText("CONNECTED CIRCUITS: " + clicks + "/" + TILES.length, 500, 390);
        }
    };
})();
