
/* =====================================================
   ORBIT ARCHITECT
   MERCURY - FUEL REFILL CHALLENGE

   Collect 8 floating fuel cells.
   Refill spacecraft fuel to 100%.
   Automatically continue to Venus.

   File: JS/minigames/mercuryFuel.js
===================================================== */

(function () {
    "use strict";

    if (!window.OrbitMiniGames) {
        console.error(
            "Mercury Fuel: OrbitMiniGames manager not loaded!"
        );
        return;
    }

    const { drawChallengeBase } = OrbitMiniGames.helpers;

    const GOAL = 8;
    const CELL_COUNT = 4;

    let collected = 0;
    let cells = [];
    let done = false;
    let elapsed = 0;

    /* ================================================
       CREATE FUEL CELL
    ================================================ */

    function spawnCell() {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.4 + Math.random() * 1.6;

        return {
            x: 100 + Math.random() * 800,
            y: 170 + Math.random() * 280,

            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,

            r: 24,
            pulse: Math.random() * 6
        };
    }

    /* ================================================
       DRAW FUEL CELL
    ================================================ */

    function drawFuelCell(ctx, cell) {
        const glow = 1 + Math.sin(cell.pulse) * 0.12;

        ctx.save();

        ctx.translate(cell.x, cell.y);
        ctx.scale(glow, glow);

        // Glow
        ctx.shadowColor = "#28d879";
        ctx.shadowBlur = 22;

        // Main tank
        ctx.fillStyle = "#103d2c";
        ctx.strokeStyle = "#28d879";
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.roundRect(-14, -22, 28, 44, 8);
        ctx.fill();
        ctx.stroke();

        // Fuel inside
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#28d879";
        ctx.fillRect(-9, -4, 18, 20);

        // Tank cap
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(-5, -28, 10, 7);

        // Shine
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.fillRect(-9, -16, 4, 12);

        ctx.restore();
    }

    /* ================================================
       COMPLETE CHALLENGE
    ================================================ */

    function finish(api) {
        if (done) return;

        done = true;

        // Refill spacecraft fuel
        if (api.ship) {
            api.ship.fuel = 100;
        }

        // Notify manager and request Venus
        api.complete({
            message: "MERCURY COMPLETE! FUEL REFILLED TO 100%.",
            nextPlanet: "VENUS"
        });
    }

    /* ================================================
       REGISTER MERCURY
    ================================================ */

    OrbitMiniGames.register("mercury", {

        planet: "MERCURY",
        title: "FUEL REFILL",

        timeLimit: 45000,

        timeoutMessage:
            "TIME RAN OUT! TRY THE FUEL REFILL AGAIN.",

        /* START */
        start(api) {
            collected = 0;
            elapsed = 0;
            done = false;

            cells = [];

            for (let i = 0; i < CELL_COUNT; i++) {
                cells.push(spawnCell());
            }

            console.log("Mercury Fuel Challenge Started");
        },

        /* UPDATE */
        update(dt, api) {
            if (done) return;

            elapsed += dt;

            // Move cells
            const step = Math.min(dt / 16.67, 3);

            cells.forEach(cell => {

                cell.x += cell.vx * step;
                cell.y += cell.vy * step;

                cell.pulse += dt / 200;

                // Bounce horizontally
                if (cell.x < 70 || cell.x > 930) {
                    cell.vx *= -1;
                    cell.x = Math.max(70, Math.min(930, cell.x));
                }

                // Bounce vertically
                if (cell.y < 150 || cell.y > 460) {
                    cell.vy *= -1;
                    cell.y = Math.max(150, Math.min(460, cell.y));
                }
            });

            // Time limit
            if (elapsed >= 45000) {
                done = true;

                if (api.fail) {
                    api.fail(
                        "TIME RAN OUT! MERCURY FUEL REFILL FAILED."
                    );
                }
            }
        },

        /* CLICK */
        onClick(point, api) {
            if (done) return;

            for (let i = cells.length - 1; i >= 0; i--) {

                const cell = cells[i];

                const distance = Math.hypot(
                    cell.x - point.x,
                    cell.y - point.y
                );

                if (distance <= cell.r + 10) {

                    collected++;

                    // Replace collected cell
                    cells[i] = spawnCell();

                    // Eight cells collected
                    if (collected >= GOAL) {
                        finish(api);
                    }

                    return;
                }
            }
        },

        /* DRAW */
        draw(api) {
            const ctx = api.ctx;

            if (!ctx) return;

            // Background
            drawChallengeBase(
                api,
                "MERCURY // FUEL REFILL",
                "CLICK THE FLOATING FUEL CELLS"
            );

            // Fuel cells
            cells.forEach(cell => {
                drawFuelCell(ctx, cell);
            });

            // Counter
            ctx.textAlign = "center";
            ctx.fillStyle = "#42eaff";
            ctx.font = "bold 23px monospace";

            ctx.fillText(
                "FUEL CELLS: " + collected + "/" + GOAL,
                500,
                500
            );

            // Progress background
            ctx.fillStyle = "#102d42";
            ctx.fillRect(300, 525, 400, 15);

            // Progress fill
            ctx.fillStyle = "#28d879";
            ctx.fillRect(
                300,
                525,
                400 * (collected / GOAL),
                15
            );

            // Border
            ctx.strokeStyle = "#42eaff";
            ctx.lineWidth = 2;
            ctx.strokeRect(300, 525, 400, 15);

            // Timer
            const secondsLeft = Math.max(
                0,
                Math.ceil((45000 - elapsed) / 1000)
            );

            ctx.fillStyle = secondsLeft <= 10
                ? "#ff4545"
                : "#ffffff";

            ctx.font = "bold 18px monospace";

            ctx.fillText(
                "TIME: " + secondsLeft + "s",
                500,
                565
            );
        }

    });

    console.log("MERCURY FUEL REFILL REGISTERED");

})();
