/* =====================================================
   ORBIT ARCHITECT - MINIGAME REGISTRY  (load this FIRST)
   Shared helpers + the contract every minigame follows.

   A minigame is an object registered on window.OrbitMiniGames:
   {
     planet, title,               // labels used by the HUD / overlays
     timeLimit, timeoutMessage,   // optional (milliseconds)
     start(api),                  // reset state when the game begins
     update(dt, api),             // optional, runs every frame
     draw(api),                   // runs every frame
     onKey(key, api),             // optional, a key was pressed
     onClick(point, api)          // optional, the canvas was clicked
   }
   Finish with api.complete({...}) or api.fail({...}).
   The api (built in mission.js) gives you:
     ctx, WIDTH, HEIGHT, keys, ship, upgrades,
     elapsed, timeLimit, setStatus(text), setObjective(text)
===================================================== */
"use strict";

window.OrbitMiniGames = window.OrbitMiniGames || {};

OrbitMiniGames.helpers = {
    /* Shared background, title, subtitle and timer used by the planet challenges. */
    drawChallengeBase(api, title, subtitle) {
        const { ctx, WIDTH, HEIGHT } = api;
        const g = ctx.createLinearGradient(0, 0, 0, HEIGHT);
        g.addColorStop(0, "#06152a"); g.addColorStop(1, "#102f4c");
        ctx.fillStyle = g; ctx.fillRect(0, 0, WIDTH, HEIGHT);
        for (let i = 0; i < 65; i++) {
            ctx.fillStyle = "rgba(180,230,255,.35)";
            ctx.fillRect((i * 173) % WIDTH, (i * 97) % HEIGHT, 2, 2);
        }
        ctx.textAlign = "center";
        ctx.fillStyle = "#42eaff"; ctx.font = "bold 30px monospace"; ctx.fillText(title, WIDTH / 2, 75);
        ctx.fillStyle = "#fff"; ctx.font = "17px monospace"; ctx.fillText(subtitle, WIDTH / 2, 112);
        if (api.timeLimit) {
            ctx.fillStyle = "rgba(0,8,20,.75)"; ctx.fillRect(250, 510, 500, 48);
            ctx.strokeStyle = "#35eaff"; ctx.lineWidth = 1; ctx.strokeRect(250, 510, 500, 48);
            ctx.fillStyle = "#fff"; ctx.font = "15px monospace";
            ctx.fillText("MISSION TIME: " + Math.max(0, Math.ceil((api.timeLimit - api.elapsed) / 1000)) + "s", WIDTH / 2, 540);
        }
    }
};
