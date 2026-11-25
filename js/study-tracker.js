
(() => {
    "use strict";

    const STORAGE_KEY = "studymate_study_tracker_v1";
    const DEFAULT_GOAL = 60;

    let timerInterval = null;
    let isRunning = false;
    let sessionSeconds = 0;
    let lastPersistedAt = null;

    const todayKey = (date = new Date()) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    function loadData() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

            if (saved && typeof saved === "object") {
                return {
                    goal: Number(saved.goal) || DEFAULT_GOAL,
                    days: saved.days && typeof saved.days === "object"
                        ? saved.days
                        : {}
                };
            }
        } catch (error) {
            console.error("Study tracker read error:", error);
        }

        return { goal: DEFAULT_GOAL, days: {} };
    }

    let data = loadData();

    function saveData() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (error) {
            console.error("Study tracker save error:", error);
        }
    }

    function formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        return [
            String(hours).padStart(2, "0"),
            String(minutes).padStart(2, "0"),
            String(secs).padStart(2, "0")
        ].join(":");
    }

    function totalStudySeconds() {
        return Object.values(data.days).reduce(
            (total, value) => total + (Number(value) || 0),
            0
        );
    }

    function getCurrentStreak() {
        const activeDays = new Set(
            Object.entries(data.days)
                .filter(([, seconds]) => Number(seconds) > 0)
                .map(([date]) => date)
        );

        const cursor = new Date();
        const today = todayKey();
        const yesterday = new Date(cursor);
        yesterday.setDate(yesterday.getDate() - 1);

        if (!activeDays.has(today) && !activeDays.has(todayKey(yesterday))) {
            return 0;
        }

        if (!activeDays.has(today)) {
            cursor.setDate(cursor.getDate() - 1);
        }

        let streak = 0;

        while (activeDays.has(todayKey(cursor))) {
            streak++;
            cursor.setDate(cursor.getDate() - 1);
        }

        return streak;
    }

    function getLongestStreak() {
        const dates = Object.keys(data.days)
            .filter(date => Number(data.days[date]) > 0)
            .sort();

        let longest = 0;
        let current = 0;
        let previous = null;

        dates.forEach(date => {
            const currentDate = new Date(`${date}T12:00:00`);

            if (previous) {
                const previousDate = new Date(`${previous}T12:00:00`);
                const difference = Math.round(
                    (currentDate - previousDate) / 86400000
                );

                current = difference === 1 ? current + 1 : 1;
            } else {
                current = 1;
            }

            longest = Math.max(longest, current);
            previous = date;
        });

        return longest;
    }

    function addStudyTime(start, end) {
        let cursor = start;

        while (cursor < end) {
            const currentDate = new Date(cursor);
            const nextDay = new Date(currentDate);
            nextDay.setHours(24, 0, 0, 0);

            const segmentEnd = Math.min(end, nextDay.getTime());
            const seconds = Math.floor((segmentEnd - cursor) / 1000);

            if (seconds > 0) {
                const key = todayKey(currentDate);
                data.days[key] = (Number(data.days[key]) || 0) + seconds;
            }

            cursor = segmentEnd;
        }

        saveData();
    }

    function flushSession() {
        if (!isRunning || !lastPersistedAt) return;

        const now = Date.now();
        addStudyTime(lastPersistedAt, now);
        lastPersistedAt = now;
    }

    function getTodaySeconds() {
        return Number(data.days[todayKey()]) || 0;
    }

    function getWeekData() {
        const result = [];
        const today = new Date();

        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);

            const key = todayKey(date);

            result.push({
                key,
                label: date.toLocaleDateString("en", {
                    weekday: "short"
                }),
                seconds: Number(data.days[key]) || 0
            });
        }

        return result;
    }

    function createPage() {
        const navigation = document.querySelector(".navigation");
        const pageContent = document.querySelector("#pageContent");

        if (!navigation || !pageContent) return false;

        if (!document.querySelector('[data-page="goals"]')) {
            const navButton = document.createElement("button");
            navButton.className = "nav-link";
            navButton.dataset.page = "goals";
            navButton.innerHTML = `
                <i data-lucide="target"></i>
                <span>Study Goals</span>
            `;

            navigation.appendChild(navButton);
        }

        if (!document.getElementById("goals")) {
            const section = document.createElement("section");
            section.className = "page";
            section.id = "goals";

            section.innerHTML = `
                <div class="page-intro">
                    <h1>Study Goals</h1>
                    <p>Build consistency, track your study time and achieve your daily goals.</p>
                </div>

                <div class="tracker-stats">
                    <div class="tracker-stat-card">
                        <span>Today's Study Time</span>
                        <strong id="goalTodayTime">00:00:00</strong>
                    </div>

                    <div class="tracker-stat-card">
                        <span>Current Streak</span>
                        <strong id="goalCurrentStreak">0 days</strong>
                    </div>

                    <div class="tracker-stat-card">
                        <span>Longest Streak</span>
                        <strong id="goalLongestStreak">0 days</strong>
                    </div>
                </div>

                <div class="tracker-grid">
                    <div class="panel tracker-timer-panel">
                        <div class="panel-heading">
                            <div>
                                <h3>Study Timer</h3>
                                <p>Track your focused study sessions</p>
                            </div>
                            <i data-lucide="timer"></i>
                        </div>

                        <div class="timer-display" id="studyTimerDisplay">
                            00:00:00
                        </div>

                        <div class="timer-status" id="studyTimerStatus">
                            Ready when you are!
                        </div>

                        <div class="timer-actions">
                            <button class="primary-button" id="timerStart">
                                <i data-lucide="play"></i>
                                Start
                            </button>

                            <button class="timer-secondary" id="timerPause" disabled>
                                <i data-lucide="pause"></i>
                                Pause
                            </button>

                            <button class="timer-secondary" id="timerReset">
                                <i data-lucide="rotate-ccw"></i>
                                Reset
                            </button>
                        </div>
                    </div>

                    <div class="panel daily-goal-panel">
                        <div class="panel-heading">
                            <div>
                                <h3>Daily Study Goal</h3>
                                <p>Choose your daily target</p>
                            </div>
                            <i data-lucide="target"></i>
                        </div>

                        <label for="dailyGoalInput">Daily target (minutes)</label>

                        <div class="goal-input-row">
                            <input
                                type="number"
                                id="dailyGoalInput"
                                min="5"
                                max="720"
                                step="5"
                                value="60"
                            >
                            <button class="primary-button" id="saveDailyGoal">
                                Save Goal
                            </button>
                        </div>

                        <div class="goal-progress-info">
                            <strong id="goalProgressText">0 / 60 minutes</strong>
                            <span id="goalProgressPercent">0%</span>
                        </div>

                        <div class="goal-progress-track">
                            <div id="goalProgressBar"></div>
                        </div>

                        <p id="goalMessage">
                            Start a study session to make progress.
                        </p>
                    </div>
                </div>

                <div class="panel weekly-activity-panel">
                    <div class="panel-heading">
                        <div>
                            <h3>Weekly Study Activity</h3>
                            <p>Your study activity over the last 7 days</p>
                        </div>
                        <i data-lucide="chart-column"></i>
                    </div>

                    <div class="weekly-chart" id="weeklyStudyChart"></div>
                </div>

                <div class="panel total-study-panel">
                    <div class="panel-heading">
                        <div>
                            <h3>Total Study Time</h3>
                            <p>Your accumulated tracked study time</p>
                        </div>
                        <i data-lucide="clock"></i>
                    </div>

                    <strong id="totalStudyTime">0 hours</strong>
                </div>
            `;

            const pdfPage = document.getElementById("pdf");

            if (pdfPage) {
                pdfPage.insertAdjacentElement("afterend", section);
            } else {
                pageContent.appendChild(section);
            }
        }

        return true;
    }

    function navigateToGoals() {
        document.querySelectorAll(".page").forEach(page => {
            page.classList.remove("active");
        });

        document.querySelectorAll(".nav-link[data-page]").forEach(button => {
            button.classList.remove("active");
        });

        document.getElementById("goals").classList.add("active");

        document.querySelector('[data-page="goals"]')
            ?.classList.add("active");

        const title = document.getElementById("pageTitle");

        if (title) title.textContent = "Study Goals";

        document.getElementById("sidebar")?.classList.remove("open");

        renderAll();
    }

    function renderChart() {
        const chart = document.getElementById("weeklyStudyChart");
        if (!chart) return;

        const week = getWeekData();
        const maxSeconds = Math.max(
            3600,
            ...week.map(day => day.seconds)
        );

        chart.innerHTML = week.map(day => {
            const percentage = Math.min(
                100,
                (day.seconds / maxSeconds) * 100
            );

            const minutes = Math.floor(day.seconds / 60);

            return `
                <div class="chart-day">
                    <div class="chart-value">${minutes} min</div>
                    <div class="chart-bar-track">
                        <div class="chart-bar"
                             style="height:${Math.max(percentage, day.seconds ? 5 : 0)}%">
                        </div>
                    </div>
                    <span>${day.label}</span>
                </div>
            `;
        }).join("");
    }

    function renderDashboardStats() {
        document.querySelectorAll(".stat-card").forEach(card => {
            const label = card.querySelector(".stat-label");
            const heading = card.querySelector("h2");

            if (!label || !heading) return;

            const text = label.textContent.toLowerCase();

            if (text.includes("study time")) {
                const minutes = Math.floor(totalStudySeconds() / 60);
                const hours = Math.floor(minutes / 60);
                const remaining = minutes % 60;

                heading.innerHTML =
                    `${hours}<small>h ${remaining}m</small>`;
            }

            if (text.includes("streak")) {
                heading.innerHTML =
                    `${getCurrentStreak()}<small> days</small>`;
            }
        });
    }

    function renderAll() {
        const todaySeconds = getTodaySeconds();
        const totalSeconds = totalStudySeconds();
        const currentStreak = getCurrentStreak();
        const longestStreak = getLongestStreak();

        const todayTime = document.getElementById("goalTodayTime");
        const current = document.getElementById("goalCurrentStreak");
        const longest = document.getElementById("goalLongestStreak");
        const total = document.getElementById("totalStudyTime");
        const timer = document.getElementById("studyTimerDisplay");

        if (todayTime) todayTime.textContent = formatTime(todaySeconds);
        if (current) current.textContent = `${currentStreak} days`;
        if (longest) longest.textContent = `${longestStreak} days`;

        if (total) {
            total.textContent =
                `${(totalSeconds / 3600).toFixed(1)} hours`;
        }

        if (timer) timer.textContent = formatTime(sessionSeconds);

        const goalInput = document.getElementById("dailyGoalInput");

        if (goalInput && document.activeElement !== goalInput) {
            goalInput.value = data.goal;
        }

        const targetSeconds = data.goal * 60;
        const progress = Math.min(
            100,
            (todaySeconds / targetSeconds) * 100
        );

        const progressBar = document.getElementById("goalProgressBar");
        const progressText = document.getElementById("goalProgressText");
        const progressPercent = document.getElementById("goalProgressPercent");
        const goalMessage = document.getElementById("goalMessage");

        if (progressBar) progressBar.style.width = `${progress}%`;

        if (progressText) {
            progressText.textContent =
                `${Math.floor(todaySeconds / 60)} / ${data.goal} minutes`;
        }

        if (progressPercent) {
            progressPercent.textContent = `${Math.round(progress)}%`;
        }

        if (goalMessage) {
            goalMessage.textContent = progress >= 100
                ? "Daily goal completed! Great work!"
                : "Keep going. Every focused minute counts.";
        }

        const start = document.getElementById("timerStart");
        const pause = document.getElementById("timerPause");

        if (start) start.disabled = isRunning;
        if (pause) pause.disabled = !isRunning;

        const status = document.getElementById("studyTimerStatus");

        if (status) {
            status.textContent = isRunning
                ? "Study session is running..."
                : "Ready when you are!";
        }

        renderChart();
        renderDashboardStats();
    }

    function startTimer() {
        if (isRunning) return;

        isRunning = true;
        lastPersistedAt = Date.now();

        timerInterval = setInterval(() => {
            const now = Date.now();

            sessionSeconds = Math.floor(
                (now - sessionStartTime) / 1000
            );

            if (now - lastPersistedAt >= 10000) {
                flushSession();
            }

            renderAll();
        }, 1000);

        sessionStartTime = Date.now();
        renderAll();
    }

    function pauseTimer() {
        if (!isRunning) return;

        flushSession();
        clearInterval(timerInterval);

        timerInterval = null;
        isRunning = false;
        lastPersistedAt = null;

        renderAll();
    }

    function resetTimer() {
        if (isRunning) pauseTimer();

        sessionSeconds = 0;
        renderAll();
    }

    let sessionStartTime = null;

    function saveGoal() {
        const input = document.getElementById("dailyGoalInput");
        const value = Number(input?.value);

        if (!Number.isInteger(value) || value < 5 || value > 720) {
            alert("Please enter a daily target between 5 and 720 minutes.");
            return;
        }

        data.goal = value;
        saveData();
        renderAll();
    }

    function attachEvents() {
        document.querySelector('[data-page="goals"]')
            ?.addEventListener("click", navigateToGoals);

        document.getElementById("timerStart")
            ?.addEventListener("click", startTimer);

        document.getElementById("timerPause")
            ?.addEventListener("click", pauseTimer);

        document.getElementById("timerReset")
            ?.addEventListener("click", resetTimer);

        document.getElementById("saveDailyGoal")
            ?.addEventListener("click", saveGoal);

        window.addEventListener("pagehide", flushSession);
        window.addEventListener("beforeunload", flushSession);
    }

    function initialize() {
        if (!createPage()) return;

        attachEvents();
        renderAll();

        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    document.addEventListener("DOMContentLoaded", initialize);
})();
