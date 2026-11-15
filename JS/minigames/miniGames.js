
/* =====================================================
   ORBIT ARCHITECT - MINI-GAME MANAGER
   Connects Mercury, Venus, Earth, and Mars challenges.
===================================================== */

"use strict";

window.OrbitMiniGames = (() => {

    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas?.getContext("2d");

    const challenges = {};
    let active = null;
    let activeName = null;
    let finished = false;
    let lastTime = 0;
    let animationId = null;

    const helpers = {
        drawChallengeBase(api, title, subtitle) {
            const { ctx } = api;

            ctx.fillStyle = "#061321";
            ctx.fillRect(0, 0, 1000, 600);

            ctx.fillStyle = "#42eaff";
            ctx.font = "bold 28px monospace";
            ctx.textAlign = "center";
            ctx.fillText(title, 500, 65);

            ctx.fillStyle = "#ffffff";
            ctx.font = "16px monospace";
            ctx.fillText(subtitle, 500, 105);
        }
    };

    function register(name, challenge) {
        challenges[name] = challenge;
    }

    function stop() {
        if (animationId !== null) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
    }

    function complete(result = {}) {
        if (finished) return;

        finished = true;

        console.log("Challenge completed:", activeName, result);

        if (typeof result.onComplete === "function") {
            result.onComplete();
        }

        if (result.nextPlanet) {
            const next = result.nextPlanet.toLowerCase();

            setTimeout(() => {
                start(next);
            }, 1000);
        } else {
            showMessage(
                result.message || "CHALLENGE COMPLETE!"
            );
        }
    }

    function showMessage(message) {
        if (!ctx) return;

        ctx.fillStyle = "rgba(0,0,0,0.85)";
        ctx.fillRect(0, 0, 1000, 600);

        ctx.textAlign = "center";
        ctx.fillStyle = "#28d879";
        ctx.font = "bold 28px monospace";
        ctx.fillText(message, 500, 280);

        ctx.fillStyle = "#ffffff";
        ctx.font = "18px monospace";
        ctx.fillText("CHALLENGE COMPLETE", 500, 330);
    }

    function makeAPI() {
        return {
            ctx,
            canvas,
            ship: window.ship || {},

            complete,

            fail(message) {
                if (finished) return;

                finished = true;
                showMessage(message || "CHALLENGE FAILED");
            }
        };
    }

    function loop(timestamp) {
        if (!active || finished) return;

        const dt = lastTime ? timestamp - lastTime : 16.67;
        lastTime = timestamp;

        const api = makeAPI();

        if (active.update) {
            active.update(dt, api);
        }

        if (active.draw) {
            active.draw(api);
        }

        animationId = requestAnimationFrame(loop);
    }

    function start(name) {
        const key = name.toLowerCase();

        const challenge = challenges[key];

        if (!challenge) {
            console.error("Mini-game not registered:", key);
            return;
        }

        if (!ctx) {
            console.error("Game canvas not found.");
            return;
        }

        stop();

        active = challenge;
        activeName = key;
        finished = false;
        lastTime = 0;

        active.start(makeAPI());

        animationId = requestAnimationFrame(loop);

        console.log("Starting mini-game:", key);
    }

    function handleClick(event) {
        if (!active || finished || !active.onClick) return;

        const rect = canvas.getBoundingClientRect();

        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const point = {
            x: (event.clientX - rect.left) * scaleX,
            y: (event.clientY - rect.top) * scaleY
        };

        active.onClick(point, makeAPI());
    }

    if (canvas) {
        canvas.addEventListener("click", handleClick);
    }

    return {
        helpers,
        register,
        start,
        stop,

        getActive() {
            return activeName;
        }
    };

})();

console.log("ORBIT MINI-GAME MANAGER READY");
