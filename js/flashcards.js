// ==========================================
// STUDYMATE AI - ADVANCED FLASHCARDS STUDIO
// ==========================================

(function () {
    "use strict";

    const STORAGE_KEY = "studymate_flashcards";

    const $ = (id) => document.getElementById(id);

    const form = $("flashcardForm");
    if (!form) return;

    const subjectInput = $("fcSubject");
    const questionInput = $("fcQuestion");
    const answerInput = $("fcAnswer");

    const saveButton = $("fcSaveBtn");
    const cancelButton = $("fcCancelEdit");

    const filterInput = $("fcFilter");

    const flipButton = $("fcFlipCard");
    const previousButton = $("fcPrevious");
    const nextButton = $("fcNext");

    const practiceButton = $("fcPractice");
    const masterButton = $("fcMaster");

    let cards = loadCards();
    let currentIndex = 0;
    let isFlipped = false;
    let editingId = null;

    // Load saved flashcards

    function loadCards() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
            return Array.isArray(saved) ? saved : [];
        } catch (error) {
            console.error("Could not load flashcards:", error);
            return [];
        }
    }

    // Save flashcards

    function saveCards() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
        } catch (error) {
            alert("Could not save flashcards. Your browser storage may be full.");
            console.error(error);
        }
    }

    // Prevent HTML injection in card content

    function escapeHTML(value) {
        return String(value).replace(/[&<>"']/g, function (char) {
            const entities = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            };

            return entities[char];
        });
    }

    // Get cards according to selected subject

    function getFilteredCards() {
        const selectedSubject = filterInput.value;

        if (selectedSubject === "all") {
            return cards;
        }

        return cards.filter(card => card.subject === selectedSubject);
    }

    // Get currently selected card

    function getCurrentCard() {
        const filtered = getFilteredCards();
        return filtered[currentIndex] || null;
    }

    // Update statistics

    function updateStats() {
        const mastered = cards.filter(card => card.mastered).length;
        const remaining = cards.length - mastered;

        $("fcTotalCount").textContent = cards.length;
        $("fcMasteredCount").textContent = mastered;
        $("fcRemainingCount").textContent = remaining;
        $("fcFilteredCount").textContent =
            getFilteredCards().length + " cards available";
    }

    // Render study card

    function renderStudyCard() {
        const filtered = getFilteredCards();
        const card = getCurrentCard();

        if (!card) {
            $("fcStudySubject").textContent = "No Subject";
            $("fcPosition").textContent = "0 / 0";
            $("fcProgressBar").style.width = "0%";

            $("fcSideLabel").textContent = "QUESTION";
            $("fcCardContent").textContent =
                cards.length === 0
                    ? "Create your first flashcard to begin!"
                    : "No cards found for this subject.";

            $("fcStudyMessage").textContent = "";

            flipButton.classList.remove("flipped");

            previousButton.disabled = true;
            nextButton.disabled = true;
            flipButton.disabled = true;
            practiceButton.disabled = true;
            masterButton.disabled = true;

            return;
        }

        flipButton.disabled = false;
        practiceButton.disabled = false;
        masterButton.disabled = false;

        previousButton.disabled = currentIndex === 0;
        nextButton.disabled = currentIndex >= filtered.length - 1;

        $("fcStudySubject").textContent = card.subject;

        $("fcPosition").textContent =
            (currentIndex + 1) + " / " + filtered.length;

        $("fcProgressBar").style.width =
            ((currentIndex + 1) / filtered.length * 100) + "%";

        $("fcSideLabel").textContent =
            isFlipped ? "ANSWER" : "QUESTION";

        $("fcCardContent").textContent =
            isFlipped ? card.answer : card.question;

        flipButton.classList.toggle("flipped", isFlipped);

        $("fcStudyMessage").textContent =
            card.mastered
                ? "✓ You have marked this card as mastered."
                : "Keep practising this card.";

        masterButton.innerHTML = card.mastered
            ? '<i data-lucide="check-circle"></i> Mastered'
            : '<i data-lucide="check-circle"></i> Got It!';

        practiceButton.innerHTML =
            '<i data-lucide="refresh-cw"></i> Need Practice';

        if (window.lucide) {
            lucide.createIcons();
        }
    }

    // Render saved card collection

    function renderCollection() {
        const container = $("fcCollection");
        const filtered = getFilteredCards();

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="fc-empty-state">
                    <i data-lucide="layers"></i>
                    <h3>No flashcards found</h3>
                    <p>Create a card or choose another subject.</p>
                </div>
            `;

            if (window.lucide) lucide.createIcons();
            return;
        }

        container.innerHTML = filtered.map(card => `
            <div class="fc-collection-item" data-id="${escapeHTML(card.id)}">

                <div class="fc-item-top">
                    <span class="fc-item-subject">
                        ${escapeHTML(card.subject)}
                    </span>

                    <span class="fc-item-status ${card.mastered ? "mastered" : ""}">
                        ${card.mastered ? "Mastered" : "Practice"}
                    </span>
                </div>

                <h4>${escapeHTML(card.question)}</h4>

                <p>${escapeHTML(card.answer)}</p>

                <div class="fc-item-actions">

                    <button type="button" class="fc-edit-btn" data-action="edit"
                        data-id="${escapeHTML(card.id)}">
                        <i data-lucide="pencil"></i>
                        Edit
                    </button>

                    <button type="button" class="fc-delete-btn" data-action="delete"
                        data-id="${escapeHTML(card.id)}">
                        <i data-lucide="trash-2"></i>
                        Delete
                    </button>

                </div>

            </div>
        `).join("");

        if (window.lucide) lucide.createIcons();
    }

    // Render everything

    function renderAll() {
        updateStats();
        renderStudyCard();
        renderCollection();
    }

    // Reset form

    function resetForm() {
        form.reset();
        editingId = null;

        $("fcFormHeading").textContent = "Create New Flashcard";

        saveButton.innerHTML =
            '<i data-lucide="plus"></i> Add Flashcard';

        cancelButton.hidden = true;

        if (window.lucide) lucide.createIcons();
    }

    // Add or update flashcard

    form.addEventListener("submit", function (event) {
        event.preventDefault();

        const subject = subjectInput.value;
        const question = questionInput.value.trim();
        const answer = answerInput.value.trim();

        if (!question || !answer) {
            alert("Please enter both question and answer.");
            return;
        }

        if (editingId !== null) {
            const card = cards.find(item => item.id === editingId);

            if (card) {
                card.subject = subject;
                card.question = question;
                card.answer = answer;
            }

        } else {
            cards.unshift({
                id: Date.now().toString() + Math.random().toString(16).slice(2),
                subject,
                question,
                answer,
                mastered: false,
                createdAt: new Date().toISOString()
            });
        }

        saveCards();

        filterInput.value = "all";
        currentIndex = 0;
        isFlipped = false;

        resetForm();
        renderAll();
    });

    // Cancel editing

    cancelButton.addEventListener("click", resetForm);

    // Flip flashcard

    flipButton.addEventListener("click", function () {
        if (!getCurrentCard()) return;

        isFlipped = !isFlipped;
        renderStudyCard();
    });

    // Previous card

    previousButton.addEventListener("click", function () {
        if (currentIndex > 0) {
            currentIndex--;
            isFlipped = false;
            renderStudyCard();
        }
    });

    // Next card

    nextButton.addEventListener("click", function () {
        const filtered = getFilteredCards();

        if (currentIndex < filtered.length - 1) {
            currentIndex++;
            isFlipped = false;
            renderStudyCard();
        }
    });

    // Mark as mastered

    masterButton.addEventListener("click", function () {
        const card = getCurrentCard();
        if (!card) return;

        card.mastered = true;

        saveCards();
        renderAll();
    });

    // Mark as needing practice

    practiceButton.addEventListener("click", function () {
        const card = getCurrentCard();
        if (!card) return;

        card.mastered = false;

        saveCards();
        renderAll();
    });

    // Subject filter

    filterInput.addEventListener("change", function () {
        currentIndex = 0;
        isFlipped = false;
        renderAll();
    });

    // Edit and delete collection cards

    $("fcCollection").addEventListener("click", function (event) {
        const button = event.target.closest("button[data-action]");

        if (!button) return;

        const id = button.dataset.id;
        const action = button.dataset.action;

        const card = cards.find(item => item.id === id);

        if (!card) return;

        if (action === "edit") {
            editingId = id;

            subjectInput.value = card.subject;
            questionInput.value = card.question;
            answerInput.value = card.answer;

            $("fcFormHeading").textContent = "Edit Flashcard";

            saveButton.innerHTML =
                '<i data-lucide="save"></i> Update Flashcard';

            cancelButton.hidden = false;

            $("flashcards").scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

            if (window.lucide) lucide.createIcons();
        }

        if (action === "delete") {
            const confirmed = confirm(
                "Are you sure you want to delete this flashcard?"
            );

            if (!confirmed) return;

            cards = cards.filter(item => item.id !== id);

            if (editingId === id) {
                resetForm();
            }

            saveCards();

            currentIndex = 0;
            isFlipped = false;

            renderAll();
        }
    });

    // Initial setup

    renderAll();

})();