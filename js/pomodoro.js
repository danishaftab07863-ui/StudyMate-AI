
(() => {
    "use strict";

    const STORAGE_KEY = "studymate_pomodoro_v1";

    const MODES = {
        focus: { label: "Focus Time", minutes: 25 },
        short: { label: "Short Break", minutes: 5 },
        long: { label: "Long Break", minutes: 15 }
    };

    let currentMode = "focus";
    let remainingSeconds = MODES.focus.minutes * 60;
    let timerInterval = null;
    let endTime = null;
    let isRunning = false;

    const loadData = () => {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
                sessions: [],
                completedToday: 0
            };
        } catch {
            return { sessions: [], completedToday: 0 };
        }
    };

    let data = loadData();

    function saveData() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    function todayKey() {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    function getTodaySessions() {
        return data.sessions.filter(session => session.date === todayKey()).length;
    }

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;

        return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }

    function createPomodoroUI() {
        const navigation = document.querySelector(".navigation");
        const pageContent = document.querySelector("#pageContent");

        if (!navigation || !pageContent) {
            console.error("Pomodoro: Navigation or page container not found.");
            return false;
        }

        if (!document.querySelector('[data-page="pomodoro"]')) {
            navigation.insertAdjacentHTML("beforeend", `
                <button class="nav-link" data-page="pomodoro">
                    <i data-lucide="timer"></i>
                    <span>Pomodoro Focus</span>
                </button>
            `);
        }

        if (!document.getElementById("pomodoro")) {
            pageContent.insertAdjacentHTML("beforeend", `
                <section class="page" id="pomodoro">

                    <div class="page-intro">
                        <span class="eyebrow">FOCUS • LEARN • REPEAT</span>
                        <h1>Pomodoro Focus</h1>
                        <p>Work in focused sessions and take regular breaks.</p>
                    </div>

                    <div class="pomodoro-layout">

                        <div class="panel pomodoro-main">

                            <div class="pomodoro-mode-buttons">
                                <button class="pomodoro-mode active" data-mode="focus">
                                    Focus
                                </button>
                                <button class="pomodoro-mode" data-mode="short">
                                    Short Break
                                </button>
                                <button class="pomodoro-mode" data-mode="long">
                                    Long Break
                                </button>
                            </div>

                            <div class="pomodoro-clock">
                                <div class="pomodoro-ring">
                                    <div class="pomodoro-time" id="pomodoroTime">
                                        25:00
                                    </div>
                                    <p id="pomodoroModeLabel">Focus Time</p>
                                </div>
                            </div>

                            <div class="pomodoro-controls">
                                <button class="primary-button" id="pomodoroStart">
                                    <i data-lucide="play"></i>
                                    Start
                                </button>

                                <button class="secondary-button" id="pomodoroReset">
                                    <i data-lucide="rotate-ccw"></i>
                                    Reset
                                </button>
                            </div>

                            <p class="pomodoro-status" id="pomodoroStatus">
                                Ready when you are. Start your focus session!
                            </p>

                        </div>

                        <div class="pomodoro-side">

                            <div class="panel pomodoro-stat">
                                <div class="pomodoro-stat-icon">
                                    <i data-lucide="target"></i>
                                </div>
                                <div>
                                    <span>Today's Focus Sessions</span>
                                    <h2 id="pomodoroTodayCount">0</h2>
                                </div>
                            </div>

                            <div class="panel pomodoro-stat">
                                <div class="pomodoro-stat-icon">
                                    <i data-lucide="clock"></i>
                                </div>
                                <div>
                                    <span>Today's Focus Minutes</span>
                                    <h2 id="pomodoroTodayMinutes">0 min</h2>
                                </div>
                            </div>

                            <div class="panel pomodoro-tips">
                                <h3><i data-lucide="lightbulb"></i> Focus Tips</h3>
                                <ul>
                                    <li>Choose one clear study task.</li>
                                    <li>Keep distractions away.</li>
                                    <li>Take a break between sessions.</li>
                                    <li>Stay consistent, not perfect.</li>
                                </ul>
                            </div>

                        </div>
                    </div>
                </section>
            `);
        }

        return true;
    }

    function updateDisplay() {
        const time = document.getElementById("pomodoroTime");
        const label = document.getElementById("pomodoroModeLabel");
        const startButton = document.getElementById("pomodoroStart");
        const count = document.getElementById("pomodoroTodayCount");
        const minutes = document.getElementById("pomodoroTodayMinutes");
        const modeButtons = document.querySelectorAll(".pomodoro-mode");

        if (!time) return;

        time.textContent = formatTime(remainingSeconds);
        label.textContent = MODES[currentMode].label;

        startButton.innerHTML = isRunning
            ? '<i data-lucide="pause"></i> Pause'
            : '<i data-lucide="play"></i> Start';

        modeButtons.forEach(button => {
            button.classList.toggle(
                "active",
                button.dataset.mode === currentMode
            );
        });

        const todaySessions = data.sessions.filter(
            session => session.date === todayKey()
        );

        count.textContent = todaySessions.length;

        const totalMinutes = todaySessions.reduce(
            (total, session) => total + session.minutes,
            0
        );

        minutes.textContent = `${totalMinutes} min`;

        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    function setStatus(message) {
        const status = document.getElementById("pomodoroStatus");
        if (status) status.textContent = message;
    }

    function stopTimer() {
        clearInterval(timerInterval);
        timerInterval = null;
        isRunning = false;
        endTime = null;
    }

    function selectMode(mode) {
        if (!MODES[mode]) return;

        stopTimer();
        currentMode = mode;
        remainingSeconds = MODES[mode].minutes * 60;

        setStatus(`${MODES[mode].label} selected. Ready to begin!`);
        updateDisplay();
    }

    function completeSession() {
        stopTimer();
        remainingSeconds = 0;

        if (currentMode === "focus") {
            data.sessions.push({
                date: todayKey(),
                minutes: MODES.focus.minutes,
                completedAt: new Date().toISOString()
            });

            saveData();
            setStatus("Great work! Focus session completed. Take a break.");
        } else {
            setStatus("Break completed! You can start another focus session.");
        }

        updateDisplay();

        if ("Notification" in window && Notification.permission === "granted") {
            new Notification("StudyMate AI", {
                body: currentMode === "focus"
                    ? "Focus session completed. Time for a break!"
                    : "Your break is over. Ready to study?"
            });
        }
    }

    function startTimer() {
        if (isRunning) {
            const now = Date.now();
            remainingSeconds = Math.max(
                0,
                Math.ceil((endTime - now) / 1000)
            );

            stopTimer();
            setStatus("Timer paused. Resume whenever you're ready.");
            updateDisplay();
            return;
        }

        if (remainingSeconds <= 0) {
            remainingSeconds = MODES[currentMode].minutes * 60;
        }

        isRunning = true;
        endTime = Date.now() + remainingSeconds * 1000;

        setStatus(`${MODES[currentMode].label} is running. Stay focused!`);

        timerInterval = setInterval(() => {
            remainingSeconds = Math.max(
                0,
                Math.ceil((endTime - Date.now()) / 1000)
            );

            if (remainingSeconds <= 0) {
                completeSession();
                return;
            }

            updateDisplay();
        }, 250);

        updateDisplay();
    }

    function resetTimer() {
        stopTimer();
        remainingSeconds = MODES[currentMode].minutes * 60;
        setStatus("Timer reset. Ready for a fresh session!");
        updateDisplay();
    }

    function openPomodoroPage() {
        document.querySelectorAll(".page").forEach(page => {
            page.classList.remove("active");
        });

        document.querySelectorAll(".nav-link[data-page]").forEach(link => {
            link.classList.remove("active");
        });

        document.getElementById("pomodoro").classList.add("active");

        document.querySelector('[data-page="pomodoro"]').classList.add("active");

        const pageTitle = document.getElementById("pageTitle");
        if (pageTitle) pageTitle.textContent = "Pomodoro Focus";

        const sidebar = document.getElementById("sidebar");
        if (window.innerWidth <= 900 && sidebar) {
            sidebar.classList.remove("open");
        }

        updateDisplay();
    }

    function initialize() {
        if (!createPomodoroUI()) return;

        document.querySelector('[data-page="pomodoro"]')
            .addEventListener("click", openPomodoroPage);

        document.querySelectorAll(".pomodoro-mode").forEach(button => {
            button.addEventListener("click", () => {
                selectMode(button.dataset.mode);
            });
        });

        document.getElementById("pomodoroStart")
            .addEventListener("click", startTimer);

        document.getElementById("pomodoroReset")
            .addEventListener("click", resetTimer);

        updateDisplay();

        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    document.addEventListener("visibilitychange", () => {
        if (isRunning && !document.hidden) {
            remainingSeconds = Math.max(
                0,
                Math.ceil((endTime - Date.now()) / 1000)
            );
            updateDisplay();
        }
    });

    window.addEventListener("beforeunload", stopTimer);

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize);
    } else {
        initialize();
    }
})();
