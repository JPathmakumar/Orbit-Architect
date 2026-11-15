/* =====================================================
   EUROPA - LANDING CINEMATIC (autopilot, 9 seconds)
===================================================== */
(function () {
    "use strict";
    const DURATION = 9000;

    function drawScene(api, progress) {
        const { ctx, WIDTH, HEIGHT } = api;
        const t = Math.min(progress / DURATION, 1);
        const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
        sky.addColorStop(0, "#020817"); sky.addColorStop(.65, "#102747"); sky.addColorStop(1, "#294b70");
        ctx.fillStyle = sky; ctx.fillRect(0, 0, WIDTH, HEIGHT);
        for (let i = 0; i < 100; i++) { ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.fillRect((i * 137.5) % WIDTH, (i * 83.7) % 350, 2, 2); }
        const jx = 790, jy = 170, jr = 180;
        ctx.beginPath(); ctx.arc(jx, jy, jr, 0, Math.PI * 2);
        const jg = ctx.createRadialGradient(730, 110, 15, jx, jy, jr);
        jg.addColorStop(0, "#f3d0a0"); jg.addColorStop(.5, "#c28a69"); jg.addColorStop(1, "#633e43");
        ctx.fillStyle = jg; ctx.fill();
        ctx.save(); ctx.beginPath(); ctx.arc(jx, jy, jr, 0, Math.PI * 2); ctx.clip();
        for (let i = -150; i <= 150; i += 28) { ctx.fillStyle = i % 2 === 0 ? "#a96f59" : "#e3b18a"; ctx.fillRect(jx - 190, jy + i, 380, 12); }
        ctx.restore();
        const hy = 390 - Math.min(t, .8) * 70;
        ctx.fillStyle = "#91b8d0"; ctx.beginPath();
        ctx.moveTo(0, hy + 45); ctx.lineTo(150, hy - 5); ctx.lineTo(300, hy + 30); ctx.lineTo(490, hy - 45);
        ctx.lineTo(700, hy + 10); ctx.lineTo(850, hy - 25); ctx.lineTo(1000, hy + 35); ctx.lineTo(1000, 600); ctx.lineTo(0, 600); ctx.fill();
        const ground = ctx.createLinearGradient(0, hy, 0, 600);
        ground.addColorStop(0, "#b8e6f4"); ground.addColorStop(.4, "#6d9fba"); ground.addColorStop(1, "#263f62");
        ctx.fillStyle = ground; ctx.fillRect(0, hy + 25, WIDTH, HEIGHT);
        ctx.fillStyle = "#24394e"; ctx.fillRect(345, 460, 310, 15);
        ctx.strokeStyle = "#35eaff"; ctx.lineWidth = 3; ctx.strokeRect(345, 460, 310, 15);
        for (let i = 0; i < 7; i++) { ctx.fillStyle = Math.floor(Date.now() / 250) % 2 === 0 ? "#35eaff" : "#fff"; ctx.fillRect(360 + i * 45, 463, 9, 8); }
        const descent = Math.min(t / .65, 1);
        ctx.save(); ctx.translate(500, 65 + descent * 325); ctx.scale(1 + descent * .45, 1 + descent * .45);
        if (t < .78) { ctx.fillStyle = "#ffad35"; ctx.beginPath(); ctx.moveTo(-15, 15); ctx.lineTo(0, 45 + Math.random() * 18); ctx.lineTo(15, 15); ctx.fill(); }
        ctx.fillStyle = "#35eaff"; ctx.beginPath(); ctx.moveTo(0, -35); ctx.lineTo(25, 15); ctx.lineTo(13, 30); ctx.lineTo(-13, 30); ctx.lineTo(-25, 15); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.fillRect(-7, -12, 14, 20); ctx.restore();
        if (t > .84) {
            ctx.fillStyle = "rgba(1,9,22,.8)"; ctx.fillRect(170, 170, 660, 100);
            ctx.strokeStyle = "#35eaff"; ctx.strokeRect(170, 170, 660, 100);
            ctx.textAlign = "center"; ctx.fillStyle = "#35eaff"; ctx.font = "bold 30px monospace"; ctx.fillText("EUROPA LANDING", 500, 215);
            ctx.fillStyle = "#fff"; ctx.font = "16px monospace"; ctx.fillText("TOUCHDOWN CONFIRMED", 500, 245);
        }
    }

    OrbitMiniGames.europaLanding = {
        planet: "EUROPA", title: "LANDING",

        start(api) {
            api.setStatus("EUROPA LANDING APPROACH");
            api.setObjective("AUTOPILOT ENGAGED: PREPARING FOR LANDING");
        },

        update(dt, api) {
            if (api.elapsed >= DURATION) {
                drawScene(api, DURATION);
                api.complete({
                    title: "WELCOME TO YOUR DESTINATION!",
                    message: "Your spacecraft has landed safely at Europa. Prepare to explore Europa's icy surface.",
                    button: "START EUROPA EXPLORATION →",
                    status: "LANDED ON EUROPA",
                    objective: "NEW OBJECTIVE: EXPLORE EUROPA"
                });
            }
        },

        draw(api) { drawScene(api, api.elapsed); }
    };
})();
