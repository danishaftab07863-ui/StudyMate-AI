
document.addEventListener("DOMContentLoaded", () => {
    const $ = (selector) => document.querySelector(selector);

    const quizForm = $("#quizForm");
    const categorySelect = $("#quizCategory");
    const questionCountSelect = $("#quizQuestionCount");

    const setup = $("#quizSetup");
    const game = $("#quizGame");
    const result = $("#quizResult");

    const setupMessage = $("#quizSetupMessage");
    const questionText = $("#quizQuestion");
    const optionsContainer = $("#quizOptions");
    const feedback = $("#quizFeedback");

    const progressText = $("#quizProgressText");
    const progressBar = $("#quizProgressBar");
    const scoreLive = $("#quizScoreLive");
    const subjectBadge = $("#quizSubjectBadge");

    const nextButton = $("#quizNext");
    const exitButton = $("#quizExit");
    const restartButton = $("#quizRestart");

    const DB_KEY = "studymate_quiz_history";

    let questions = [];
    let currentIndex = 0;
    let score = 0;
    let answered = false;

    // ==========================================
    // SUBJECT-BASED QUESTION BANK
    // ==========================================

    const questionBank = [

        // PROGRAMMING
        {
            category: "Programming",
            question: "Which language is commonly used to add interactivity to web pages?",
            answer: "JavaScript",
            options: ["HTML", "CSS", "JavaScript", "SQL"]
        },
        {
            category: "Programming",
            question: "Which keyword declares a variable in JavaScript?",
            answer: "let",
            options: ["define", "let", "integer", "variable"]
        },
        {
            category: "Programming",
            question: "Which symbol is used for a single-line comment in JavaScript?",
            answer: "//",
            options: ["<!--", "//", "##", "**"]
        },
        {
            category: "Programming",
            question: "Which data type stores true or false values?",
            answer: "Boolean",
            options: ["String", "Integer", "Boolean", "Array"]
        },
        {
            category: "Programming",
            question: "Which loop executes its code while a condition is true?",
            answer: "while loop",
            options: ["while loop", "switch statement", "class", "import"]
        },

        // COMPUTER SCIENCE
        {
            category: "Computer Science",
            question: "Which component is known as the brain of a computer?",
            answer: "CPU",
            options: ["RAM", "Monitor", "CPU", "Keyboard"]
        },
        {
            category: "Computer Science",
            question: "Which memory is volatile?",
            answer: "RAM",
            options: ["ROM", "RAM", "Hard Disk", "SSD"]
        },
        {
            category: "Computer Science",
            question: "Which data structure follows Last In, First Out?",
            answer: "Stack",
            options: ["Queue", "Stack", "Tree", "Graph"]
        },
        {
            category: "Computer Science",
            question: "What does URL stand for?",
            answer: "Uniform Resource Locator",
            options: [
                "Universal Record Link",
                "Uniform Resource Locator",
                "Unified Reference Language",
                "User Resource Location"
            ]
        },
        {
            category: "Computer Science",
            question: "Which protocol is commonly used for secure web browsing?",
            answer: "HTTPS",
            options: ["HTTP", "FTP", "SMTP", "HTTPS"]
        },

        // MATHEMATICS
        {
            category: "Mathematics",
            question: "What is the square root of 144?",
            answer: "12",
            options: ["10", "11", "12", "14"]
        },
        {
            category: "Mathematics",
            question: "What is 15 multiplied by 4?",
            answer: "60",
            options: ["45", "50", "60", "65"]
        },
        {
            category: "Mathematics",
            question: "What is the value of 2³?",
            answer: "8",
            options: ["4", "6", "8", "9"]
        },
        {
            category: "Mathematics",
            question: "How many degrees are there in a right angle?",
            answer: "90 degrees",
            options: ["45 degrees", "60 degrees", "90 degrees", "180 degrees"]
        },
        {
            category: "Mathematics",
            question: "What is the value of 25% of 200?",
            answer: "50",
            options: ["25", "40", "50", "75"]
        },

        // SCIENCE
        {
            category: "Science",
            question: "Which planet is known as the Red Planet?",
            answer: "Mars",
            options: ["Venus", "Mars", "Jupiter", "Saturn"]
        },
        {
            category: "Science",
            question: "What is the chemical formula of water?",
            answer: "H2O",
            options: ["CO2", "O2", "H2O", "NaCl"]
        },
        {
            category: "Science",
            question: "Which gas do plants absorb during photosynthesis?",
            answer: "Carbon dioxide",
            options: ["Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen"]
        },
        {
            category: "Science",
            question: "What is the SI unit of force?",
            answer: "Newton",
            options: ["Joule", "Watt", "Newton", "Pascal"]
        },
        {
            category: "Science",
            question: "Which organ pumps blood throughout the human body?",
            answer: "Heart",
            options: ["Lungs", "Brain", "Heart", "Kidney"]
        },

        // ENGLISH
        {
            category: "English",
            question: "Which word is a noun?",
            answer: "Book",
            options: ["Quickly", "Beautiful", "Book", "Run"]
        },
        {
            category: "English",
            question: "What is the plural form of 'Child'?",
            answer: "Children",
            options: ["Childs", "Childes", "Children", "Childrens"]
        },
        {
            category: "English",
            question: "Which word is a synonym of 'Happy'?",
            answer: "Joyful",
            options: ["Angry", "Joyful", "Sad", "Tired"]
        },
        {
            category: "English",
            question: "Choose the correct sentence.",
            answer: "She goes to school.",
            options: [
                "She go to school.",
                "She going to school.",
                "She goes to school.",
                "She gone to school."
            ]
        },
        {
            category: "English",
            question: "What is the past tense of 'Write'?",
            answer: "Wrote",
            options: ["Written", "Writing", "Wrote", "Writes"]
        },

        // OTHER
        {
            category: "Other",
            question: "Which habit can improve learning?",
            answer: "Regular revision",
            options: [
                "Skipping practice",
                "Regular revision",
                "Avoiding questions",
                "Ignoring mistakes"
            ]
        },
        {
            category: "Other",
            question: "Which method helps organize daily study activities?",
            answer: "Study timetable",
            options: [
                "Random studying",
                "Study timetable",
                "Avoiding schedules",
                "Skipping tasks"
            ]
        },
        {
            category: "Other",
            question: "What should you do after making a mistake in a practice test?",
            answer: "Review the mistake",
            options: [
                "Ignore the mistake",
                "Stop learning",
                "Review the mistake",
                "Delete your notes"
            ]
        },
        {
            category: "Other",
            question: "Which activity helps improve memory?",
            answer: "Active recall",
            options: [
                "Active recall",
                "Multitasking",
                "Skipping revision",
                "Avoiding practice"
            ]
        },
        {
            category: "Other",
            question: "What is a useful way to prepare for an exam?",
            answer: "Consistent practice",
            options: [
                "Last-minute guessing",
                "Ignoring difficult topics",
                "Consistent practice",
                "Skipping revision"
            ]
        }
    ];

    // ==========================================
    // STORAGE
    // ==========================================

    function getHistory() {
        try {
            const history = JSON.parse(
                localStorage.getItem(DB_KEY) || "[]"
            );

            return Array.isArray(history) ? history : [];
        } catch {
            return [];
        }
    }

    function saveHistory(history) {
        localStorage.setItem(
            DB_KEY,
            JSON.stringify(history)
        );
    }

    // ==========================================
    // HELPER FUNCTIONS
    // ==========================================

    function showSetupMessage(message, type = "") {
        if (!setupMessage) return;

        setupMessage.textContent = message;
        setupMessage.className = `quiz-message ${type}`;
    }

    function shuffle(array) {
        const copy = [...array];

        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));

            [copy[i], copy[j]] = [copy[j], copy[i]];
        }

        return copy;
    }

    // ==========================================
    // GENERATE SUBJECT-BASED QUIZ
    // ==========================================

    function generateQuestions() {
        const selectedCategory = categorySelect.value;

        const requestedCount = Number(
            questionCountSelect.value
        );

        let availableQuestions;

        if (
            selectedCategory.toLowerCase() === "all"
        ) {
            availableQuestions = [...questionBank];
        } else {
            availableQuestions = questionBank.filter(
                question =>
                    question.category.toLowerCase() ===
                    selectedCategory.toLowerCase()
            );
        }

        if (!availableQuestions.length) {
            showSetupMessage(
                "No questions available for this subject yet.",
                "error"
            );

            return [];
        }

        const selectedQuestions = shuffle(
            availableQuestions
        ).slice(
            0,
            Math.min(requestedCount, availableQuestions.length)
        );

        if (selectedQuestions.length < requestedCount) {
            showSetupMessage(
                `Only ${selectedQuestions.length} questions are currently available for this subject.`,
                "success"
            );
        } else {
            showSetupMessage(
                "Your quiz is ready. Good luck!",
                "success"
            );
        }

        return selectedQuestions.map(question => ({
            ...question,
            options: shuffle(question.options)
        }));
    }

    // ==========================================
    // START QUIZ
    // ==========================================

    quizForm.addEventListener("submit", (event) => {
        event.preventDefault();

        questions = generateQuestions();

        if (!questions.length) return;

        currentIndex = 0;
        score = 0;
        answered = false;

        setup.hidden = true;
        result.hidden = true;
        game.hidden = false;

        showQuestion();
    });

    // ==========================================
    // DISPLAY QUESTION
    // ==========================================

    function showQuestion() {
        const question = questions[currentIndex];

        answered = false;

        feedback.textContent = "";
        feedback.className = "quiz-feedback";

        questionText.textContent = question.question;

        subjectBadge.textContent = question.category;

        progressText.textContent =
            `Question ${currentIndex + 1} of ${questions.length}`;

        scoreLive.textContent = `Score: ${score}`;

        progressBar.style.width =
            `${(currentIndex / questions.length) * 100}%`;

        optionsContainer.replaceChildren();

        question.options.forEach((option, index) => {
            const button = document.createElement("button");

            button.type = "button";
            button.className = "quiz-option";

            const letter = document.createElement("span");

            letter.className = "option-letter";
            letter.textContent = String.fromCharCode(65 + index);

            const text = document.createElement("span");

            text.textContent = option;

            button.append(letter, text);

            button.addEventListener("click", () => {
                checkAnswer(button, option, question);
            });

            optionsContainer.appendChild(button);
        });

        nextButton.disabled = true;

        nextButton.innerHTML =
            currentIndex === questions.length - 1
                ? 'Finish Quiz <i data-lucide="check"></i>'
                : 'Next Question <i data-lucide="arrow-right"></i>';

        refreshIcons();
    }

    // ==========================================
    // CHECK ANSWER
    // ==========================================

    function checkAnswer(
        selectedButton,
        selectedAnswer,
        question
    ) {
        if (answered) return;

        answered = true;

        const buttons = optionsContainer.querySelectorAll(
            ".quiz-option"
        );

        buttons.forEach(button => {
            button.disabled = true;

            const optionText =
                button.querySelector("span:last-child").textContent;

            if (optionText === question.answer) {
                button.classList.add("correct");
            }
        });

        if (selectedAnswer === question.answer) {
            score++;

            feedback.textContent =
                "Correct! Well done.";

            feedback.classList.add("correct");
        } else {
            selectedButton.classList.add("incorrect");

            feedback.textContent =
                `Not quite. Correct answer: ${question.answer}`;

            feedback.classList.add("incorrect");
        }

        scoreLive.textContent = `Score: ${score}`;

        nextButton.disabled = false;
    }

    // ==========================================
    // NEXT QUESTION
    // ==========================================

    nextButton.addEventListener("click", () => {
        if (!answered) return;

        if (currentIndex < questions.length - 1) {
            currentIndex++;

            showQuestion();
        } else {
            finishQuiz();
        }
    });

    // ==========================================
    // FINISH QUIZ
    // ==========================================

    function finishQuiz() {
        game.hidden = true;
        result.hidden = false;

        const total = questions.length;

        const percentage = Math.round(
            (score / total) * 100
        );

        $("#quizFinalScore").textContent =
            `${score}/${total}`;

        $("#quizPercentage").textContent =
            `${percentage}%`;

        $("#quizCorrectAnswers").textContent =
            score;

        let message = "Keep practicing. You will improve!";

        if (percentage === 100) {
            message = "Perfect score! Excellent work!";
        } else if (percentage >= 70) {
            message = "Great work! You are doing well.";
        } else if (percentage >= 40) {
            message = "Good effort! Keep learning and practicing.";
        }

        $("#quizResultMessage").textContent = message;

        progressBar.style.width = "100%";

        const history = getHistory();

        history.unshift({
            id: Date.now(),
            score,
            total,
            percentage,
            category: categorySelect.value,
            date: new Date().toISOString()
        });

        saveHistory(history.slice(0, 30));

        renderHistory();
    }

    // ==========================================
    // EXIT QUIZ
    // ==========================================

    exitButton.addEventListener("click", () => {
        const confirmed = confirm(
            "Are you sure you want to exit this quiz?"
        );

        if (!confirmed) return;

        game.hidden = true;
        setup.hidden = false;
    });

    // ==========================================
    // RESTART QUIZ
    // ==========================================

    restartButton.addEventListener("click", () => {
        result.hidden = true;
        setup.hidden = false;

        showSetupMessage(
            "Choose your settings to create another quiz.",
            "success"
        );
    });

    // ==========================================
    // QUIZ HISTORY
    // ==========================================

    function renderHistory() {
        const history = getHistory();

        const container = $("#quizHistoryList");

        if (!container) return;

        container.replaceChildren();

        if (!history.length) {
            const empty = document.createElement("p");

            empty.className = "quiz-history-empty";

            empty.textContent = "No quiz attempts yet.";

            container.appendChild(empty);

            return;
        }

        history.forEach(item => {
            const row = document.createElement("div");

            row.className = "quiz-history-item";

            const info = document.createElement("div");

            const title = document.createElement("h4");

            title.textContent =
                item.category.toLowerCase() === "all"
                    ? "All Subjects"
                    : item.category;

            const date = document.createElement("p");

            date.textContent = new Date(
                item.date
            ).toLocaleString();

            info.append(title, date);

            const scoreText = document.createElement("span");

            scoreText.className = "quiz-history-score";

            scoreText.textContent =
                `${item.score}/${item.total} (${item.percentage}%)`;

            row.append(info, scoreText);

            container.appendChild(row);
        });
    }

    // ==========================================
    // LUCIDE ICONS
    // ==========================================

    function refreshIcons() {
        if (window.lucide) {
            lucide.createIcons();
        }
    }

    // ==========================================
    // INITIAL LOAD
    // ==========================================

    renderHistory();
    refreshIcons();
});
