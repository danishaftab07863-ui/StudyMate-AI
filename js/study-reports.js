(() => {
    "use strict";

    const NOTES_KEY = "studymate_notes";
    const TASKS_KEY = "studymate_tasks";
    const POMODORO_KEY = "studymate_pomodoro_v1";

    const readStorage = (key, fallback) => {
        try {
            const value = JSON.parse(localStorage.getItem(key));
            return value ?? fallback;
        } catch (error) {
            console.error(`Study Reports: Could not read ${key}`, error);
            return fallback;
        }
    };

    const getData = () => {
        const notes = readStorage(NOTES_KEY, []);
        const tasks = readStorage(TASKS_KEY, []);
        const pomodoro = readStorage(POMODORO_KEY, { sessions: [] });

        const safeNotes = Array.isArray(notes) ? notes : [];
        const safeTasks = Array.isArray(tasks) ? tasks : [];
        const sessions = Array.isArray(pomodoro.sessions)
            ? pomodoro.sessions
            : [];

        const completedTasks = safeTasks.filter(task =>
            task && (
                task.completed === true ||
                task.completed === "true"
            )
        );

        const totalMinutes = sessions.reduce((total, session) => {
            const minutes = Number(session?.minutes);
            return total + (Number.isFinite(minutes) ? minutes : 0);
        }, 0);

        return {
            notes: safeNotes,
            tasks: safeTasks,
            sessions,
            completedTasks,
            totalMinutes
        };
    };

    const escapeHTML = value => String(value ?? "").replace(
        /[&<>"']/g,
        character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[character]
    );

    const getDateKey = value => {
        if (!value) return "";

        const text = String(value);

        // Pomodoro stores the date as YYYY-MM-DD.
        if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
            return text.slice(0, 10);
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return "";

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    };

    const getLastSevenDays = () => {
        const days = [];

        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setHours(12, 0, 0, 0);
            date.setDate(date.getDate() - i);

            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");

            days.push({
                key: `${year}-${month}-${day}`,
                label: date.toLocaleDateString("en-IN", {
                    weekday: "short"
                }),
                minutes: 0
            });
        }

        return days;
    };

    const getWeeklyData = sessions => {
        const days = getLastSevenDays();

        sessions.forEach(session => {
            const dateKey = getDateKey(
                session?.date || session?.completedAt
            );

            const day = days.find(item => item.key === dateKey);

            if (day) {
                const minutes = Number(session?.minutes);
                if (Number.isFinite(minutes)) {
                    day.minutes += minutes;
                }
            }
        });

        return days;
    };

    const formatTime = minutes => {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;

        if (hours === 0) return `${remainingMinutes} min`;
        if (remainingMinutes === 0) return `${hours} hr`;

        return `${hours} hr ${remainingMinutes} min`;
    };

    const getPageHTML = () => `
        <section class="sr-page">
            <div class="sr-header">
                <div>
                    <p class="sr-eyebrow">YOUR LEARNING JOURNEY</p>
                    <h2>Study Reports</h2>
                    <p class="sr-subtitle">
                        Track your learning activity and celebrate your progress.
                    </p>
                </div>

                <button class="sr-export-btn" id="srExportBtn" type="button">
                    <span aria-hidden="true">↓</span>
                    Export CSV
                </button>
            </div>

            <div class="sr-stats">
                <article class="sr-stat-card">
                    <div class="sr-stat-icon">📝</div>
                    <p>Total Notes</p>
                    <h3 id="srTotalNotes">0</h3>
                    <span>Your saved study notes</span>
                </article>

                <article class="sr-stat-card">
                    <div class="sr-stat-icon">✅</div>
                    <p>Completed Tasks</p>
                    <h3 id="srCompletedTasks">0</h3>
                    <span id="srTaskSubtitle">0 total tasks</span>
                </article>

                <article class="sr-stat-card">
                    <div class="sr-stat-icon">🎯</div>
                    <p>Focus Sessions</p>
                    <h3 id="srFocusSessions">0</h3>
                    <span>Completed Pomodoro sessions</span>
                </article>

                <article class="sr-stat-card">
                    <div class="sr-stat-icon">⏱️</div>
                    <p>Total Focus Time</p>
                    <h3 id="srFocusTime">0 min</h3>
                    <span>Your recorded focus time</span>
                </article>
            </div>

            <div class="sr-content-grid">
                <article class="sr-panel sr-chart-panel">
                    <div class="sr-panel-heading">
                        <div>
                            <h3>Weekly Focus Activity</h3>
                            <p>Your recorded focus time over the last 7 days</p>
                        </div>
                        <span class="sr-panel-icon">📊</span>
                    </div>

                    <div class="sr-chart" id="srWeeklyChart"></div>
                    <div class="sr-chart-legend">
                        <span></span> Focus minutes
                    </div>
                </article>

                <article class="sr-panel sr-summary-panel">
                    <div class="sr-panel-heading">
                        <div>
                            <h3>Study Summary</h3>
                            <p>Your overall learning activity</p>
                        </div>
                        <span class="sr-panel-icon">📚</span>
                    </div>

                    <div class="sr-summary-row">
                        <span>Notes created</span>
                        <strong id="srSummaryNotes">0</strong>
                    </div>

                    <div class="sr-summary-row">
                        <span>Tasks completed</span>
                        <strong id="srSummaryTasks">0</strong>
                    </div>

                    <div class="sr-summary-row">
                        <span>Tasks remaining</span>
                        <strong id="srRemainingTasks">0</strong>
                    </div>

                    <div class="sr-summary-row">
                        <span>Focus sessions</span>
                        <strong id="srSummarySessions">0</strong>
                    </div>

                    <div class="sr-summary-row">
                        <span>Total focus time</span>
                        <strong id="srSummaryTime">0 min</strong>
                    </div>
                </article>
            </div>

            <div class="sr-panel sr-report-info">
                <div class="sr-report-info-icon">💡</div>
                <div>
                    <h3>Keep making progress!</h3>
                    <p>
                        Your report updates from your saved notes, tasks and
                        completed Pomodoro focus sessions. Keep studying to
                        build your learning history.
                    </p>
                </div>
            </div>

            <p class="sr-updated" id="srUpdated">
                Report generated from your saved study data.
            </p>
        </section>
    `;

    const renderChart = weeklyData => {
        const chart = document.getElementById("srWeeklyChart");
        if (!chart) return;

        const maxMinutes = Math.max(
            ...weeklyData.map(day => day.minutes),
            60
        );

        chart.innerHTML = weeklyData.map(day => {
            const height = day.minutes > 0
                ? Math.max((day.minutes / maxMinutes) * 100, 5)
                : 0;

            return `
                <div class="sr-chart-column">
                    <div class="sr-bar-area">
                        <span class="sr-bar-value">
                            ${day.minutes > 0 ? escapeHTML(day.minutes) : ""}
                        </span>
                        <div
                            class="sr-bar ${day.minutes > 0 ? "has-data" : ""}"
                            style="height: ${height}%"
                            title="${escapeHTML(day.minutes)} focus minutes"
                        ></div>
                    </div>
                    <span class="sr-day-label">${escapeHTML(day.label)}</span>
                </div>
            `;
        }).join("");
    };

    const renderReport = () => {
        const data = getData();

        const totalNotes = data.notes.length;
        const totalTasks = data.tasks.length;
        const completedTasks = data.completedTasks.length;
        const remainingTasks = Math.max(totalTasks - completedTasks, 0);
        const totalSessions = data.sessions.length;
        const totalMinutes = data.totalMinutes;

        const setText = (id, value) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        };

        setText("srTotalNotes", totalNotes);
        setText("srCompletedTasks", completedTasks);
        setText("srTaskSubtitle", `${totalTasks} total tasks`);
        setText("srFocusSessions", totalSessions);
        setText("srFocusTime", formatTime(totalMinutes));

        setText("srSummaryNotes", totalNotes);
        setText("srSummaryTasks", completedTasks);
        setText("srRemainingTasks", remainingTasks);
        setText("srSummarySessions", totalSessions);
        setText("srSummaryTime", formatTime(totalMinutes));

        renderChart(getWeeklyData(data.sessions));

        setText(
            "srUpdated",
            `Report generated: ${new Date().toLocaleString("en-IN")}`
        );
    };

    const downloadCSV = () => {
        const data = getData();
        const weeklyData = getWeeklyData(data.sessions);

        const rows = [
            ["StudyMate AI - Study Progress Report"],
            ["Generated On", new Date().toLocaleString("en-IN")],
            [],
            ["Study Statistic", "Value"],
            ["Total Notes", data.notes.length],
            ["Total Tasks", data.tasks.length],
            ["Completed Tasks", data.completedTasks.length],
            [
                "Remaining Tasks",
                Math.max(data.tasks.length - data.completedTasks.length, 0)
            ],
            ["Completed Focus Sessions", data.sessions.length],
            ["Total Focus Minutes", data.totalMinutes],
            [],
            ["Weekly Focus Activity"],
            ["Date", "Day", "Focus Minutes"]
        ];

        weeklyData.forEach(day => {
            rows.push([day.key, day.label, day.minutes]);
        });

        const csv = rows.map(row =>
            row.map(value => {
                const safeValue = String(value ?? "").replace(/"/g, '""');
                return `"${safeValue}"`;
            }).join(",")
        ).join("\r\n");

        const blob = new Blob(
            ["\uFEFF" + csv],
            { type: "text/csv;charset=utf-8;" }
        );

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = `StudyMate-Study-Report-${getDateKey(new Date())}.csv`;

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);
    };

    const openReportsPage = () => {
        const page = document.getElementById("study-reports");
        if (!page) return;

        document.querySelectorAll(".page").forEach(item => {
            item.style.display = "none";
            item.classList.remove("active");
        });

        page.style.display = "block";
        page.classList.add("active");

        document.querySelectorAll(".nav-link").forEach(link => {
            link.classList.remove("active");
        });

        const navLink = document.querySelector(
            '[data-page="study-reports"]'
        );

        if (navLink) navLink.classList.add("active");

        const pageTitle = document.getElementById("pageTitle");
        if (pageTitle) pageTitle.textContent = "Study Reports";

        const sidebar = document.getElementById("sidebar");
        if (sidebar && window.innerWidth <= 768) {
            sidebar.classList.remove("open");
        }

        renderReport();
    };

    const initialize = () => {
        if (document.getElementById("study-reports")) return;

        const pageContent = document.getElementById("pageContent");

        if (!pageContent) {
            console.error(
                "Study Reports: #pageContent was not found. Check index.html."
            );
            return;
        }

        const navContainer = document.querySelector(
            ".navigation, .sidebar-nav, .nav-menu"
        );

        if (!navContainer) {
            console.error(
                "Study Reports: Navigation container was not found."
            );
            return;
        }

        const navItem = document.createElement("a");
        navItem.href = "#study-reports";
        navItem.className = "nav-link";
        navItem.dataset.page = "study-reports";
        navItem.innerHTML = `
            <span class="nav-icon">📈</span>
            <span>Study Reports</span>
        `;

        navContainer.appendChild(navItem);

        const page = document.createElement("div");
        page.id = "study-reports";
        page.className = "page";
        page.style.display = "none";
        page.innerHTML = getPageHTML();

        pageContent.appendChild(page);

        navItem.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            openReportsPage();
        });

        page.addEventListener("click", event => {
            if (event.target.closest("#srExportBtn")) {
                downloadCSV();
            }
        });

        // Refresh report if another feature changes saved data.
        window.addEventListener("storage", () => {
            if (page.classList.contains("active")) {
                renderReport();
            }
        });

        console.log("Study Reports feature initialized successfully.");
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize);
    } else {
        initialize();
    }
})();