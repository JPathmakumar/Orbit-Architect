/* =====================================================
   ORBIT ARCHITECT - SPACECRAFT DESIGN SCREEN
   Needs JS/spacecraftData.js (window.OrbitDesign).
   Does not touch mission.js, OrbitScoring or OrbitSave.
===================================================== */
"use strict";

(function () {

    const Design = window.OrbitDesign;
    if (!Design) {
        console.error("Orbit Architect: spacecraftData.js must load before spacecraftDesign.js");
        return;
    }

    // Where the Launch button sends the player. Change to match your flow.
    const NEXT_PAGE = "workshop.html";

    const $ = id => document.getElementById(id);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let selection = Design.load() || { ...Design.DEFAULT_SELECTION };

    const RATING_ROWS = [
        { key: "speed", label: "Speed" },
        { key: "range", label: "Range" },
        { key: "detection", label: "Detection" },
        { key: "protection", label: "Protection" },
        { key: "power", label: "Power stability" }
    ];

    /* ---------- helpers ---------- */

    function el(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    function fmtPower(watts) {
        if (watts === 0) return "None";
        return (watts > 0 ? "+" : "\u2212") + Math.abs(watts) + " W";
    }

    function tween(node, to) {
        const from = Number(node.dataset.value || 0);
        node.dataset.value = to;

        if (reduceMotion || from === to) {
            node.textContent = to.toLocaleString();
            return;
        }

        const start = performance.now();
        const duration = 350;

        function frame(now) {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            node.textContent = Math.round(from + (to - from) * eased).toLocaleString();
            if (t < 1 && Number(node.dataset.value) === to) requestAnimationFrame(frame);
        }

        requestAnimationFrame(frame);
    }

    /* ---------- build the component cards ---------- */

    function buildSystems() {
        const root = $("sdSystems");
        root.replaceChildren();

        Design.SYSTEMS.forEach((system, index) => {
            const section = el("section", "sd-system");
            section.dataset.system = system.id;

            const head = el("div", "sd-system-head");
            head.appendChild(el("span", "sd-system-num", String(index + 1).padStart(2, "0")));
            head.appendChild(el("h2", "", system.label.toUpperCase()));
            section.appendChild(head);

            const group = el("div", "sd-options");
            group.setAttribute("role", "radiogroup");
            group.setAttribute("aria-label", system.label);

            system.options.forEach(option => {
                group.appendChild(buildCard(system, option));
            });

            section.appendChild(group);
            root.appendChild(section);

            section.addEventListener("mouseenter", () => focusZone(system.id));
            section.addEventListener("focusin", () => focusZone(system.id));
            section.addEventListener("mouseleave", () => focusZone(null));
            section.addEventListener("focusout", () => focusZone(null));
        });
    }

    function buildCard(system, option) {
        const card = el("button", "sd-card");
        card.type = "button";
        card.setAttribute("role", "radio");
        card.dataset.system = system.id;
        card.dataset.option = option.id;

        const top = el("div", "sd-card-top");
        top.appendChild(el("h3", "", option.name));
        top.appendChild(el("span", "sd-check", "SELECTED"));
        card.appendChild(top);

        card.appendChild(el("p", "sd-card-desc", option.description));

        const specs = el("dl", "sd-specs");
        [
            ["MASS", option.mass.toLocaleString() + " kg"],
            ["COST", option.cost.toLocaleString() + " cr"],
            [option.power > 0 ? "GENERATES" : option.power < 0 ? "USES" : "POWER", fmtPower(option.power)]
        ].forEach(([label, value]) => {
            const row = el("div", "sd-spec");
            row.appendChild(el("dt", "", label));
            const dd = el("dd", option.power > 0 ? "sd-pos" : "", value);
            row.appendChild(dd);
            specs.appendChild(row);
        });
        card.appendChild(specs);

        const rating = el("div", "sd-rating");
        const ratingHead = el("div", "sd-rating-head");
        ratingHead.appendChild(el("span", "", system.perfLabel.toUpperCase() + " RATING"));
        ratingHead.appendChild(el("b", "", option.rating + "/100"));
        rating.appendChild(ratingHead);
        const bar = el("div", "sd-bar");
        const fill = el("div", "sd-bar-fill");
        fill.style.width = option.rating + "%";
        bar.appendChild(fill);
        rating.appendChild(bar);
        card.appendChild(rating);

        const lists = el("div", "sd-lists");

        const pros = el("ul", "sd-list sd-pros");
        pros.appendChild(el("li", "sd-list-title", "ADVANTAGES"));
        option.pros.forEach(text => pros.appendChild(el("li", "", text)));

        const cons = el("ul", "sd-list sd-cons");
        cons.appendChild(el("li", "sd-list-title", "DISADVANTAGES"));
        option.cons.forEach(text => cons.appendChild(el("li", "", text)));

        lists.appendChild(pros);
        lists.appendChild(cons);
        card.appendChild(lists);

        card.addEventListener("click", () => choose(system.id, option.id));
        card.addEventListener("keydown", event => {
            if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(event.key)) return;
            event.preventDefault();
            const siblings = [...card.parentElement.querySelectorAll(".sd-card")];
            const step = (event.key === "ArrowRight" || event.key === "ArrowDown") ? 1 : -1;
            const next = siblings[(siblings.indexOf(card) + step + siblings.length) % siblings.length];
            next.focus();
            choose(system.id, next.dataset.option);
        });

        return card;
    }

    /* ---------- state changes ---------- */

    function choose(systemId, optionId) {
        if (selection[systemId] === optionId) return;
        selection = Design.sanitize({ ...selection, [systemId]: optionId });
        Design.save(selection);
        render(systemId);
    }

    function resetDesign() {
        selection = { ...Design.DEFAULT_SELECTION };
        Design.save(selection);
        render();
    }

    function focusZone(systemId) {
        const ship = $("sdShip");
        if (systemId) ship.dataset.focus = systemId;
        else delete ship.dataset.focus;
    }

    /* ---------- render ---------- */

    function render(changedSystem) {
        const result = Design.evaluate(selection);

        // cards
        document.querySelectorAll(".sd-card").forEach(card => {
            const active = selection[card.dataset.system] === card.dataset.option;
            card.classList.toggle("is-selected", active);
            card.setAttribute("aria-checked", String(active));
            card.tabIndex = active ? 0 : -1;
        });

        // blueprint variants
        document.querySelectorAll(".sd-variant").forEach(variant => {
            variant.classList.toggle(
                "is-active",
                selection[variant.dataset.system] === variant.dataset.option
            );
        });

        if (changedSystem) pulseZone(changedSystem);

        $("sdLblEngine").textContent = result.chosen.engine.name.replace(" Engine", "").toUpperCase();
        $("sdLblFuel").textContent = result.chosen.fuel.name.replace(" Fuel Tank", "").toUpperCase();
        $("sdLblPower").textContent = result.chosen.power.name.replace(" Power", "").toUpperCase();
        $("sdLblShield").textContent = result.chosen.shield.name.replace(" Shield", "").toUpperCase();

        $("sdShipTag").textContent = "MK-" + Design.SYSTEMS
            .map(s => selection[s.id][0].toUpperCase()).join("");

        // numbers
        tween($("sdMass"), result.mass);
        tween($("sdCost"), result.cost);
        tween($("sdGen"), result.generation);
        tween($("sdCon"), result.consumption);

        // budget
        const budgetPct = Math.min(100, (result.cost / Design.BUDGET) * 100);
        const budgetBar = $("sdBudgetBar");
        budgetBar.style.width = budgetPct + "%";
        budgetBar.className = "sd-bar-fill " + (
            !result.budgetOk ? "is-bad" : budgetPct > 85 ? "is-warn" : ""
        );
        $("sdBudgetText").textContent =
            result.cost.toLocaleString() + " / " + Design.BUDGET.toLocaleString() + " cr";

        // power
        const total = Math.max(result.generation, result.consumption, 1);
        const powerBar = $("sdPowerBar");
        powerBar.style.width = Math.min(100, (result.consumption / total) * 100) + "%";
        powerBar.className = "sd-bar-fill " + (
            !result.powerOk ? "is-bad" : result.consumption / total > 0.85 ? "is-warn" : ""
        );
        $("sdPowerText").textContent =
            (result.margin >= 0 ? "+" : "\u2212") + Math.abs(result.margin) + " W margin";

        // ratings
        const ratings = $("sdRatings");
        if (!ratings.children.length) {
            RATING_ROWS.forEach(row => {
                const wrap = el("div", "sd-rate");
                wrap.dataset.key = row.key;
                const head = el("div", "sd-rate-head");
                head.appendChild(el("span", "", row.label));
                head.appendChild(el("b", ""));
                wrap.appendChild(head);
                const bar = el("div", "sd-bar");
                bar.appendChild(el("div", "sd-bar-fill"));
                wrap.appendChild(bar);
                ratings.appendChild(wrap);
            });
        }

        RATING_ROWS.forEach(row => {
            const wrap = ratings.querySelector('[data-key="' + row.key + '"]');
            const value = result.ratings[row.key];
            wrap.querySelector("b").textContent = value;
            wrap.querySelector(".sd-bar-fill").style.width = value + "%";
        });

        // warnings
        const list = $("sdWarnings");
        list.replaceChildren();
        if (!result.warnings.length) {
            list.appendChild(el("li", "sd-ok", "All systems nominal."));
        } else {
            result.warnings.forEach(w => list.appendChild(el("li", "sd-" + w.level, w.text)));
        }

        // launch
        const launch = $("sdLaunch");
        launch.disabled = !result.valid;
        launch.title = result.valid ? "" : "Reduce your total cost to launch.";
    }

    function pulseZone(systemId) {
        if (reduceMotion) return;
        const zone = document.querySelector('.sd-zone[data-zone="' + systemId + '"]');
        if (!zone) return;
        zone.classList.remove("is-pulse");
        void zone.getBoundingClientRect(); // restart animation
        zone.classList.add("is-pulse");
    }

    function launch() {
        const result = Design.evaluate(selection);
        if (!result.valid) return;
        Design.save(selection);
        window.location.href = NEXT_PAGE;
    }

    /* ---------- start ---------- */

    buildSystems();
    render();

    $("sdReset").addEventListener("click", resetDesign);
    $("sdLaunch").addEventListener("click", launch);

})();