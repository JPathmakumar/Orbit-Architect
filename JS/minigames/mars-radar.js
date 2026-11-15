/* =====================================================
   MARS - RADAR SCAN (mouse)
   Click all 5 hidden signal blips on the radar.
===================================================== */
(function () {
    "use strict";
    const { drawChallengeBase } = OrbitMiniGames.helpers;
    const COUNT = 5;
    let targets = [], found = 0;

    OrbitMiniGames.marsRadar = {
        planet: "MARS", title: "RADAR SCAN",
        timeLimit: 45000, timeoutMessage: "Time ran out. Try the challenge again.",

        start() {
            found = 0;
            targets = Array.from({ length: COUNT }, (_, i) => ({
                x: 230 + (i * 137) % 570, y: 180 + (i * 83) % 270, found: false
            }));
        },

        onClick(p, api) {
            targets.forEach(t => {
                if (!t.found && Math.hypot(t.x - p.x, t.y - p.y) < 27) {
                    t.found = true; found++;
                    if (found >= COUNT) {
                        api.ship.power = Math.min(100, api.ship.power + 20);
                        api.complete({ message: "All five radar signals identified." });
                    }
                }
            });
        },

        draw(api) {
            const { ctx } = api;
            drawChallengeBase(api, "MARS // RADAR SCAN", "CLICK THE FIVE HIDDEN SIGNALS");
            ctx.strokeStyle = "#35eaff"; ctx.lineWidth = 2;
            [190, 125, 60].forEach(r => { ctx.beginPath(); ctx.arc(500, 320, r, 0, Math.PI * 2); ctx.stroke(); });
            ctx.beginPath(); ctx.moveTo(310, 320); ctx.lineTo(690, 320); ctx.moveTo(500, 130); ctx.lineTo(500, 510); ctx.stroke();
            targets.forEach(t => {
                ctx.beginPath(); ctx.arc(t.x, t.y, t.found ? 12 : 7, 0, Math.PI * 2);
                ctx.fillStyle = t.found ? "#39ff88" : "#ffdc58";
                ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = t.found ? 0 : 18; ctx.fill(); ctx.shadowBlur = 0;
            });
            ctx.fillStyle = "#fff"; ctx.font = "20px monospace";
            ctx.fillText("SIGNALS FOUND: " + found + "/" + COUNT, 500, 470);
        }
    };
})();
