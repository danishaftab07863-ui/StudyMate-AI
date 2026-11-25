
(() => {
    "use strict";

    const readData = (key, fallback) => {
        try {
            const value = JSON.parse(localStorage.getItem(key));
            return value ?? fallback;
        } catch {
            return fallback;
        }
    };

    const achievements = [
        {
            id: "first-focus",
            icon: "timer",
            title: "First Focus",
            description: "Complete your first Pomodoro focus session.",
            target: 1,
            getProgress: stats => stats.sessions
        },
        {
            id: "focus-10",
            icon: "zap",
            title: "Focus Champion",
            description: "Complete 10 focus sessions.",
            target: 10,
            getProgress: stats => stats.sessions
        },
        {
            id: "focus-25",
            icon: "trophy",
            title: "Deep Work Master",
            description: "Complete 25 focus sessions.",
            target: 25,
            getProgress: stats => stats.sessions
        },
        {
            id: "notes-5",
            icon: "notebook-pen",
            title: "Note Taker",
            description: "Create 5 study notes.",
            target: 5,
            getProgress: stats => stats.notes
        },
        {
            id: "notes-10",
            icon: "book-open",
            title: "Knowledge Builder",
            description: "Create 10 study notes.",
            target: 10,
            getProgress: stats => stats.notes
        },
        {
            id: "tasks-5",
            icon: "calendar-check",
            title: "Goal Getter",
            description: "Complete 5 study planner tasks.",
            target: 5,
            getProgress: stats => stats.tasks
        },
        {
            id: "tasks-10",
            icon: "medal",
            title: "Consistency Star",
            description: "Complete 10 study planner tasks.",
            target: 10,
            getProgress: stats => stats.tasks
        },
        {
            id: "focus-60",
            icon: "clock",
            title: "Hour of Focus",
            description: "Complete 60 minutes of Pomodoro focus.",
            target: 60,
            getProgress: stats => stats.minutes
        }
    ];

    function getStats() {
        const notes = readData("studymate_notes", []);
        const tasks = readData("studymate_tasks", []);
        const pomodoro = readData("studymate_pomodoro_v1", {
            sessions: []
        });

        const sessions = Array.isArray(pomodoro.sessions)
            ? pomodoro.sessions
            : [];

        const completedTasks = Array.isArray(tasks)
            ? tasks.filter(task => task.completed).length
            : 0;

        const totalMinutes = sessions.reduce((total, session) => {
            return total + (Number(session.minutes) || 0);
        }, 0);

        return {
            notes: Array.isArray(notes) ? notes.length : 0,
            tasks: completedTasks,
            sessions: sessions.length,
            minutes: totalMinutes
        };
    }

    function createPage() {
        const navigation = document.querySelector(".navigation");
        const pageContent = document.getElementById("pageContent");

        if (!navigation || !pageContent) return false;

        if (!document.querySelector('[data-page="achievements"]')) {
            navigation.insertAdjacentHTML("beforeend", `
                <button class="nav-link" data-page="achievements">
                    <i data-lucide="award"></i>
                    <span>Achievements</span>
                </button>
            `);
        }

        if (!document.getElementById("achievements")) {
            pageContent.insertAdjacentHTML("beforeend", `
                <section class="page" id="achievements">

                    <div class="page-intro">
                        <span class="eyebrow">YOUR LEARNING MILESTONES</span>
                        <h1>Achievements & Badges</h1>
                        <p>Every small step counts. Keep learning and unlock rewards!</p>
                    </div>

                    <div class="achievement-summary">
                        <div class="panel achievement-summary-card">
                            <div class="achievement-summary-icon">
                                <i data-lucide="award"></i>
                            </div>
                            <div>
                                <span>Badges Unlocked</span>
                                <h2 id="unlockedBadges">0 / 8</h2>
                            </div>
                        </div>

                        <div class="panel achievement-summary-card">
                            <div class="achievement-summary-icon">
                                <i data-lucide="flame"></i>
                            </div>
                            <div>
                                <span>Focus Sessions</span>
                                <h2 id="achievementSessions">0</h2>
                            </div>
                        </div>

                        <div class="panel achievement-summary-card">
                            <div class="achievement-summary-icon">
                                <i data-lucide="book-open"></i>
                            </div>
                            <div>
                                <span>Study Notes</span>
                                <h2 id="achievementNotes">0</h2>
                            </div>
                        </div>
                    </div>

                    <div class="achievement-section-heading">
                        <div>
                            <h2>Your Badges</h2>
                            <p>Complete milestones to unlock each achievement.</p>
                        </div>
                    </div>

                    <div class="achievement-grid" id="achievementGrid"></div>

                </section>
            `);
        }

        return true;
    }

    function renderAchievements() {
        const stats = getStats();
        const grid = document.getElementById("achievementGrid");

        if (!grid) return;

        let unlockedCount = 0;

        grid.innerHTML = achievements.map(item => {
            const progress = Math.min(
                item.target,
                Math.max(0, Number(item.getProgress(stats)) || 0)
            );

            const unlocked = progress >= item.target;

            if (unlocked) unlockedCount++;

            const percentage = Math.min(
                100,
                Math.round((progress / item.target) * 100)
            );

            return `
                <article class="achievement-card ${unlocked ? "unlocked" : "locked"}">

                    <div class="achievement-card-top">
                        <div class="achievement-icon">
                            <i data-lucide="${item.icon}"></i>
                        </div>

                        <span class="achievement-status">
                            ${unlocked ? "Unlocked" : "Locked"}
                        </span>
                    </div>

                    <h3>${item.title}</h3>
                    <p>${item.description}</p>

                    <div class="achievement-progress-info">
                        <span>Progress</span>
                        <strong>${progress} / ${item.target}</strong>
                    </div>

                    <div class="achievement-progress-track">
                        <div class="achievement-progress-fill"
                             style="width: ${percentage}%"></div>
                    </div>

                    <div class="achievement-bottom">
                        ${unlocked
                    ? '<i data-lucide="check-circle"></i> Achievement earned'
                    : `${percentage}% completed`
                }
                    </div>

                </article>
            `;
        }).join("");

        document.getElementById("unlockedBadges").textContent =
            `${unlockedCount} / ${achievements.length}`;

        document.getElementById("achievementSessions").textContent =
            stats.sessions;

        document.getElementById("achievementNotes").textContent =
            stats.notes;

        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    function openAchievements() {
        document.querySelectorAll(".page").forEach(page => {
            page.classList.remove("active");
        });

        document.querySelectorAll(".nav-link[data-page]").forEach(link => {
            link.classList.remove("active");
        });

        document.getElementById("achievements").classList.add("active");

        document.querySelector('[data-page="achievements"]')
            .classList.add("active");

        const title = document.getElementById("pageTitle");
        if (title) title.textContent = "Achievements";

        const sidebar = document.getElementById("sidebar");

        if (window.innerWidth <= 900 && sidebar) {
            sidebar.classList.remove("open");
        }

        renderAchievements();
    }

    function initialize() {
        if (!createPage()) return;

        document.querySelector('[data-page="achievements"]')
            .addEventListener("click", openAchievements);

        renderAchievements();

        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize);
    } else {
        initialize();
    }
})();
