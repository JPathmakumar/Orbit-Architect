
/* =====================================
   ORBIT ARCHITECT - MAIN GAME SCRIPT
===================================== */


/* =========================
   GET HTML ELEMENTS
========================= */

const startButton = document.getElementById("startButton");

const mainMenu = document.getElementById("mainMenu");

const briefingScreen = document.getElementById("briefingScreen");

const backButton = document.getElementById("backButton");

const acceptMissionButton = document.getElementById(
    "acceptMissionButton"
);


/* =========================
   SCREEN TRANSITION SYSTEM
========================= */

function showScreen(screenToShow, screenToHide) {

    screenToHide.classList.add("hidden");

    screenToShow.classList.remove("hidden");

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


/* =========================
   START MISSION
========================= */

startButton.addEventListener("click", () => {

    showScreen(briefingScreen, mainMenu);

});


/* =========================
   BACK TO MAIN MENU
========================= */

backButton.addEventListener("click", () => {

    showScreen(mainMenu, briefingScreen);

});


/* =========================
   ACCEPT MISSION
========================= */

acceptMissionButton.addEventListener("click", () => {

    alert(
        "MISSION ACCEPTED!\n\n" +
        "WELCOME, CHIEF MISSION ENGINEER.\n\n" +
        "Your assignment:\n" +
        "Design a spacecraft capable of investigating Europa.\n\n" +
        "NEXT DESTINATION: SPACECRAFT WORKSHOP"
    );

});


/* =========================
   CONSOLE INFORMATION
========================= */

console.log("ORBIT ARCHITECT INITIALIZED");

console.log("MISSION CONTROL SYSTEM ONLINE");

console.log("EUROPA EXPLORATION INITIATIVE READY");
