/* =====================================================
   EUROPA - SURFACE EXPLORATION (keyboard)
   WASD / arrows to move, E to collect ice samples,
   avoid the cracks, then return to the lander.
===================================================== */
(function () {
    "use strict";
    const DURATION = 90;       // seconds of oxygen
    const SAMPLE_GOAL = 5;
    const player = { x: 120, y: 430, speed: 3.2, health: 3, invulnerable: 0 };
    let samples = [], cracks = [], particles = [];
    let collected = 0, returnHold = 0, message = "", messageTimer = 0;

    function setMessage(text, duration = 1600) { message = text; messageTimer = duration; }

    function drawBackground(ctx, W, H) {
        const sky = ctx.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, "#07172d"); sky.addColorStop(.55, "#183c5b"); sky.addColorStop(1, "#8dc7df");
        ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
        const jx = 820, jy = 115, jr = 95, jg = ctx.createRadialGradient(jx - 25, jy - 25, 5, jx, jy, jr);
        jg.addColorStop(0, "#f3d5b0"); jg.addColorStop(1, "#9a5c52");
        ctx.fillStyle = jg; ctx.beginPath(); ctx.arc(jx, jy, jr, 0, Math.PI * 2); ctx.fill();
        ctx.save(); ctx.beginPath(); ctx.arc(jx, jy, jr, 0, Math.PI * 2); ctx.clip();
        for (let i = -75; i <= 75; i += 18) { ctx.fillStyle = i % 2 ? "#c48d73" : "#e8c3a0"; ctx.fillRect(jx - jr, jy + i, jr * 2, 8); }
        ctx.restore();
        ctx.fillStyle = "#477d9a"; ctx.beginPath();
        ctx.moveTo(0, 345); ctx.lineTo(120, 270); ctx.lineTo(230, 340); ctx.lineTo(360, 255); ctx.lineTo(510, 340);
        ctx.lineTo(660, 260); ctx.lineTo(810, 335); ctx.lineTo(930, 265); ctx.lineTo(1000, 310); ctx.lineTo(1000, 600); ctx.lineTo(0, 600); ctx.fill();
        const ice = ctx.createLinearGradient(0, 330, 0, 600);
        ice.addColorStop(0, "#c7f0fa"); ice.addColorStop(.45, "#78b5d0"); ice.addColorStop(1, "#315d7d");
        ctx.fillStyle = ice; ctx.fillRect(0, 350, W, 250);
        ctx.strokeStyle = "rgba(240,255,255,.45)"; ctx.lineWidth = 2;
        for (let i = 0; i < 14; i++) {
            const x = (i * 91 + 30) % W;
            ctx.beginPath(); ctx.moveTo(x, 370 + (i % 3) * 45); ctx.lineTo(x + 35, 390 + (i % 3) * 45); ctx.lineTo(x + 65, 380 + (i % 3) * 45); ctx.stroke();
        }
    }

    function collectNearbySample(api) {
        for (const s of samples) {
            if (s.collected) continue;
            if (Math.hypot(s.x - player.x, s.y - player.y) < 55) {
                s.collected = true; collected++;
                if (api.stats) api.stats.samplesCollected = collected;
                try { window.OrbitScoring?.collectSample?.(); }
                catch (e) { console.warn("OrbitScoring.collectSample failed:", e); }
                setMessage("ICE SAMPLE SECURED!");
                if (collected >= SAMPLE_GOAL) {
                    setMessage("ALL SAMPLES FOUND! RETURN TO THE LANDER!", 3500);
                    api.setObjective("RETURN TO THE LANDING ZONE");
                }
                return;
            }
        }
        setMessage("MOVE CLOSER TO AN ICE SAMPLE");
    }

    function failMission(api, reason) {
        api.fail({
            title: "EUROPA EXPLORATION FAILED",
            message: `${reason}. You collected ${collected}/${SAMPLE_GOAL} ice samples. Try again.`,
            button: "RETRY EUROPA EXPLORATION →",
            status: "EXPLORATION FAILED"
        });
    }

    OrbitMiniGames.europaSurface = {
        planet: "EUROPA", title: "SURFACE EXPLORATION",

        start(api) {
            Object.assign(player, { x: 120, y: 430, health: 3, invulnerable: 0 });
            collected = 0; returnHold = 0;
            if (api.stats) api.stats.samplesCollected = 0;
            setMessage("COLLECT 5 ICE SAMPLES", 2200);
            samples = [{ x: 260, y: 160 }, { x: 450, y: 420 }, { x: 650, y: 190 }, { x: 790, y: 410 }, { x: 900, y: 250 }]
                .map(p => ({ ...p, collected: false }));
            cracks = [
                { x: 330, y: 300, w: 150, h: 28, phase: 0 }, { x: 570, y: 300, w: 190, h: 32, phase: 1.4 },
                { x: 820, y: 115, w: 110, h: 25, phase: 2.3 }, { x: 130, y: 220, w: 120, h: 25, phase: .7 }
            ];
            particles = Array.from({ length: 65 }, () => ({
                x: Math.random() * api.WIDTH, y: Math.random() * api.HEIGHT, size: 1 + Math.random() * 3, speed: .3 + Math.random() * 1.2
            }));
            api.setStatus("EUROPA SURFACE EXPLORATION");
            api.setObjective("COLLECT 5 ICE SAMPLES");
        },

        onKey(key, api) { if (key === "e") collectNearbySample(api); },

        update(dt, api) {
            const { keys, WIDTH, HEIGHT } = api;
            messageTimer = Math.max(0, messageTimer - dt);
            player.invulnerable = Math.max(0, player.invulnerable - dt);
            particles.forEach(p => { p.x -= p.speed * dt / 16.67; if (p.x < -5) { p.x = WIDTH + 5; p.y = Math.random() * HEIGHT; } });

            let dx = 0, dy = 0;
            if (keys.a || keys.arrowleft) dx--; if (keys.d || keys.arrowright) dx++;
            if (keys.w || keys.arrowup) dy--; if (keys.s || keys.arrowdown) dy++;
            if (dx || dy) {
                const len = Math.hypot(dx, dy);
                player.x += dx / len * player.speed * dt / 16.67;
                player.y += dy / len * player.speed * dt / 16.67;
            }
            player.x = Math.max(25, Math.min(WIDTH - 25, player.x));
            player.y = Math.max(145, Math.min(HEIGHT - 45, player.y));

            for (const c of cracks) {
                const cx = Math.max(c.x, Math.min(player.x, c.x + c.w)), cy = Math.max(c.y - 8, Math.min(player.y, c.y + c.h + 8));
                if (Math.hypot(player.x - cx, player.y - cy) < 13 && player.invulnerable <= 0) {
                    player.health--; player.invulnerable = 1300; setMessage("WARNING: SUIT DAMAGED!");
                    if (player.health <= 0) { failMission(api, "SUIT FAILURE"); return; }
                    break;
                }
            }

            const nearLander = player.x < 85 && player.y > 370;
            if (collected >= SAMPLE_GOAL && nearLander) {
                returnHold += dt; setMessage("HOLD POSITION TO BOARD THE SPACECRAFT", 100);
                if (returnHold >= 900) {
                    api.complete({
                        title: "EUROPA SAMPLES COLLECTED!",
                        message: "Excellent work! All 5 ice samples are secured. Return to orbit and prepare for the asteroid storm.",
                        button: "RETURN TO SPACE FLIGHT →",
                        status: "EUROPA EXPLORATION COMPLETE",
                        objective: "BOARD THE SPACECRAFT"
                    });
                    return;
                }
            } else returnHold = 0;

            if (api.elapsed >= DURATION * 1000) failMission(api, "OXYGEN DEPLETED");
        },

        draw(api) {
            const { ctx, WIDTH, HEIGHT } = api;
            drawBackground(ctx, WIDTH, HEIGHT);
            particles.forEach(p => { ctx.fillStyle = "rgba(235,250,255,.55)"; ctx.fillRect(p.x, p.y, p.size, p.size); });

            cracks.forEach(c => {
                const pulse = .65 + Math.sin(api.elapsed / 220 + c.phase) * .2;
                ctx.fillStyle = `rgba(5,28,55,${pulse})`; ctx.beginPath();
                ctx.moveTo(c.x, c.y + c.h / 2); ctx.lineTo(c.x + c.w * .18, c.y); ctx.lineTo(c.x + c.w * .34, c.y + c.h * .65);
                ctx.lineTo(c.x + c.w * .52, c.y - c.h * .2); ctx.lineTo(c.x + c.w * .68, c.y + c.h * .7); ctx.lineTo(c.x + c.w, c.y + c.h / 2);
                ctx.lineTo(c.x + c.w * .7, c.y + c.h + 12); ctx.lineTo(c.x + c.w * .45, c.y + c.h * .8); ctx.lineTo(c.x + c.w * .2, c.y + c.h + 10);
                ctx.closePath(); ctx.fill(); ctx.strokeStyle = "#3beaff"; ctx.stroke();
            });

            samples.forEach(s => {
                if (s.collected) return;
                const pulse = 1 + Math.sin(api.elapsed / 180 + s.x) * .12;
                ctx.save(); ctx.translate(s.x, s.y); ctx.scale(pulse, pulse);
                ctx.shadowColor = "#55eaff"; ctx.shadowBlur = 20; ctx.fillStyle = "#bdf8ff"; ctx.beginPath();
                ctx.moveTo(0, -16); ctx.lineTo(12, -5); ctx.lineTo(8, 13); ctx.lineTo(-8, 13); ctx.lineTo(-12, -5); ctx.closePath(); ctx.fill();
                ctx.restore();
            });

            if (!(player.invulnerable > 0 && Math.floor(Date.now() / 100) % 2 === 0)) {
                ctx.save(); ctx.translate(player.x, player.y);
                ctx.fillStyle = "rgba(0,20,40,.3)"; ctx.beginPath(); ctx.ellipse(0, 22, 22, 7, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = "#1d5574"; ctx.fillRect(-15, -8, 9, 25);
                ctx.fillStyle = "#f0f7ff"; ctx.beginPath(); ctx.roundRect(-12, -17, 24, 38, 7); ctx.fill();
                ctx.fillStyle = "#d9faff"; ctx.beginPath(); ctx.arc(0, -20, 13, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = "#1785a8"; ctx.beginPath(); ctx.ellipse(1, -21, 8, 7, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = "#254c66"; ctx.fillRect(-12, 17, 9, 7); ctx.fillRect(3, 17, 9, 7);
                ctx.restore();
            }

            ctx.fillStyle = "rgba(1,10,25,.82)"; ctx.fillRect(18, 18, 340, 92);
            ctx.strokeStyle = "#42eaff"; ctx.lineWidth = 1; ctx.strokeRect(18, 18, 340, 92);
            ctx.textAlign = "left"; ctx.fillStyle = "#48eaff"; ctx.font = "bold 18px monospace"; ctx.fillText("EUROPA FIELD EXPLORATION", 34, 45);
            ctx.fillStyle = "#fff"; ctx.font = "15px monospace";
            ctx.fillText(`ICE SAMPLES: ${collected}/${SAMPLE_GOAL}`, 34, 72);
            ctx.fillText(`SUIT INTEGRITY: ${player.health}/3`, 34, 95);
            const secs = Math.max(0, Math.ceil(DURATION - api.elapsed / 1000));
            ctx.textAlign = "right"; ctx.fillStyle = secs <= 15 ? "#ff6868" : "#fff"; ctx.fillText(`OXYGEN: ${secs}s`, WIDTH - 28, 42);
            if (messageTimer > 0 && message) {
                ctx.fillStyle = "rgba(0,15,30,.8)"; ctx.fillRect(285, 125, 430, 42);
                ctx.strokeStyle = "#42eaff"; ctx.strokeRect(285, 125, 430, 42);
                ctx.fillStyle = "#fff"; ctx.font = "bold 17px monospace"; ctx.textAlign = "center"; ctx.fillText(message, 500, 152);
            }
        }
    };
})();
