
document.addEventListener("DOMContentLoaded", () => {

    const $ = selector => document.querySelector(selector);
    const $$ = selector => document.querySelectorAll(selector);

    // APPLICATION DATA
    let notes = Storage.get("studymate_notes", []);
    let tasks = Storage.get("studymate_tasks", []);
    let editingNoteId = null;

    // SAFE STORAGE
    function saveData() {
        const notesSaved = Storage.set("studymate_notes", notes);
        const tasksSaved = Storage.set("studymate_tasks", tasks);

        if (!notesSaved || !tasksSaved) {
            alert("Storage is full or unavailable. Please remove some data.");
            return false;
        }

        return true;
    }

    // NAVIGATION
    function navigate(page) {
        const target = document.getElementById(page);
        if (!target) return;

        $$(".page").forEach(item => item.classList.remove("active"));
        target.classList.add("active");

        $$(".nav-link[data-page]").forEach(item => {
            item.classList.toggle("active", item.dataset.page === page);
        });

        $("#pageTitle").textContent =
            page === "quiz" ? "Quiz Generator" :
                page === "flashcards" ? "Flashcards" :
                    page === "planner" ? "Study Planner" :
                        page === "notes" ? "My Notes" : "Dashboard";

        $("#sidebar").classList.remove("open");
    }

    $$(".nav-link[data-page]").forEach(button => {
        button.addEventListener("click", () => {
            navigate(button.dataset.page);
        });
    });

    $$("[data-go]").forEach(button => {
        button.addEventListener("click", () => {
            navigate(button.dataset.go);
        });
    });

    // MOBILE MENU
    $("#menuToggle").addEventListener("click", () => {
        $("#sidebar").classList.toggle("open");
    });

    // THEME
    function toggleTheme() {
        document.body.classList.toggle("light");

        const theme = document.body.classList.contains("light")
            ? "light" : "dark";

        Storage.set("studymate_theme", theme);

        refreshIcons();
    }

    if (Storage.get("studymate_theme", "dark") === "light") {
        document.body.classList.add("light");
    }

    $("#themeToggle").addEventListener("click", toggleTheme);
    $("#quickTheme").addEventListener("click", toggleTheme);

    // ICON REFRESH
    function refreshIcons() {
        if (window.lucide) {
            lucide.createIcons();
        }
    }

    // NOTE FORM RESET
    function resetNoteForm() {
        editingNoteId = null;
        $("#noteForm").reset();
        $("#noteFormHeading").textContent = "Create New Note";
        $("#saveNoteBtn").innerHTML =
            '<i data-lucide="save"></i> Save Note';
        $("#cancelEditBtn").hidden = true;
        refreshIcons();
    }

    // SAVE NOTES
    function saveNotes() {
        if (!Storage.set("studymate_notes", notes)) {
            alert("Could not save notes. Browser storage may be full.");
            return false;
        }

        renderNotes();
        renderDashboard();
        return true;
    }

    // CREATE AND UPDATE NOTES
    $("#noteForm").addEventListener("submit", event => {
        event.preventDefault();

        const title = $("#noteTitle").value.trim();
        const content = $("#noteContent").value.trim();
        const category = $("#noteCategory").value;

        if (!title || !content) {
            alert("Please enter a title and note content.");
            return;
        }

        if (editingNoteId) {
            const note = notes.find(
                item => item.id === editingNoteId
            );

            if (note) {
                note.title = title;
                note.content = content;
                note.category = category;
                note.updatedAt = new Date().toISOString();
            }
        } else {
            notes.unshift({
                id: crypto.randomUUID(),
                title,
                content,
                category,
                pinned: false,
                createdAt: new Date().toISOString()
            });
        }

        if (saveNotes()) {
            resetNoteForm();
        }
    });

    // CANCEL EDIT
    $("#cancelEditBtn").addEventListener("click", resetNoteForm);

    // EDIT NOTE
    function editNote(id) {
        const note = notes.find(item => item.id === id);
        if (!note) return;

        editingNoteId = id;

        $("#noteTitle").value = note.title;
        $("#noteContent").value = note.content;
        $("#noteCategory").value = note.category || "Other";

        $("#noteFormHeading").textContent = "Edit Your Note";
        $("#saveNoteBtn").innerHTML =
            '<i data-lucide="save"></i> Update Note';

        $("#cancelEditBtn").hidden = false;

        $("#noteForm").scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

        refreshIcons();
    }

    // DELETE NOTE
    function deleteNote(id) {
        const confirmed = confirm(
            "Are you sure you want to delete this note?"
        );

        if (!confirmed) return;

        notes = notes.filter(item => item.id !== id);

        if (editingNoteId === id) {
            resetNoteForm();
        }

        saveNotes();
    }

    // PIN / UNPIN
    function togglePin(id) {
        const note = notes.find(item => item.id === id);
        if (!note) return;

        note.pinned = !note.pinned;
        saveNotes();
    }

    // RENDER NOTES
    function renderNotes() {
        const container = $("#notesList");
        const search = $("#noteSearch").value.trim().toLowerCase();
        const category = $("#categoryFilter").value;
        const sort = $("#noteSort").value;

        container.replaceChildren();

        // BACKWARD COMPATIBILITY WITH OLD NOTES
        notes.forEach(note => {
            if (typeof note.pinned !== "boolean") {
                note.pinned = false;
            }

            if (!note.category) {
                note.category = "Other";
            }
        });

        let filtered = notes.filter(note => {
            const matchesSearch =
                note.title.toLowerCase().includes(search) ||
                note.content.toLowerCase().includes(search);

            const matchesCategory =
                category === "all" || note.category === category;

            return matchesSearch && matchesCategory;
        });

        // SORTING
        filtered.sort((a, b) => {
            if (Boolean(a.pinned) !== Boolean(b.pinned)) {
                return Number(Boolean(b.pinned)) -
                    Number(Boolean(a.pinned));
            }

            if (sort === "newest") {
                return new Date(b.createdAt || 0) -
                    new Date(a.createdAt || 0);
            }

            if (sort === "oldest") {
                return new Date(a.createdAt || 0) -
                    new Date(b.createdAt || 0);
            }

            if (sort === "az") {
                return a.title.localeCompare(b.title);
            }

            if (sort === "za") {
                return b.title.localeCompare(a.title);
            }

            return 0;
        });

        $("#notesCount").textContent = notes.length;
        $("#filteredNotesCount").textContent =
            `${filtered.length} ${filtered.length === 1 ? "note" : "notes"}`;

        if (!filtered.length) {
            const empty = document.createElement("div");
            empty.className = "notes-empty";

            const heading = document.createElement("h3");
            heading.textContent = notes.length
                ? "No matching notes found"
                : "Your notes collection is empty";

            const message = document.createElement("p");
            message.textContent = notes.length
                ? "Try another search or category."
                : "Create your first note using the editor above.";

            empty.append(heading, message);
            container.appendChild(empty);
            return;
        }

        filtered.forEach(note => {
            const card = document.createElement("article");
            card.className = "note-card";

            if (note.pinned) {
                card.classList.add("pinned");
            }

            // CARD HEADER
            const top = document.createElement("div");
            top.className = "note-card-top";

            const categoryTag = document.createElement("span");
            categoryTag.className = "note-category";
            categoryTag.textContent = note.category;

            const pinLabel = document.createElement("span");
            pinLabel.className = "pin-indicator";
            pinLabel.textContent = note.pinned ? "★ Pinned" : "";

            top.append(categoryTag, pinLabel);

            // TITLE
            const title = document.createElement("h3");
            title.textContent = note.title;

            // CONTENT
            const content = document.createElement("p");
            content.textContent = note.content.length > 250
                ? note.content.slice(0, 250) + "..."
                : note.content;

            // DATE
            const meta = document.createElement("div");
            meta.className = "note-meta";

            const date = new Date(note.updatedAt || note.createdAt);

            meta.textContent = Number.isNaN(date.getTime())
                ? "Date unavailable"
                : "Created: " + date.toLocaleDateString() +
                (note.updatedAt ? " • Updated" : "");

            // ACTION BUTTONS
            const actions = document.createElement("div");
            actions.className = "note-actions";

            const pinButton = document.createElement("button");
            pinButton.className = "note-action";
            pinButton.textContent = note.pinned ? "Unpin" : "Pin";
            pinButton.addEventListener("click", () => {
                togglePin(note.id);
            });

            const editButton = document.createElement("button");
            editButton.className = "note-action";
            editButton.textContent = "Edit";
            editButton.addEventListener("click", () => {
                editNote(note.id);
            });

            const deleteButton = document.createElement("button");
            deleteButton.className = "note-action delete";
            deleteButton.textContent = "Delete";
            deleteButton.addEventListener("click", () => {
                deleteNote(note.id);
            });

            actions.append(pinButton, editButton, deleteButton);

            card.append(top, title, content, meta, actions);
            container.appendChild(card);
        });
    }

    // SEARCH AND FILTER EVENTS
    $("#noteSearch").addEventListener("input", renderNotes);
    $("#categoryFilter").addEventListener("change", renderNotes);
    $("#noteSort").addEventListener("change", renderNotes);

    // STUDY TASKS
    function renderTasks() {
        const container = $("#taskList");
        container.replaceChildren();

        tasks.forEach(task => {
            const item = document.createElement("div");
            item.className = "task-item";

            if (task.completed) {
                item.classList.add("completed");
            }

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.checked = task.completed;
            checkbox.setAttribute("aria-label", "Complete task");

            checkbox.addEventListener("change", () => {
                task.completed = checkbox.checked;
                saveTasks();
            });

            const title = document.createElement("span");
            title.textContent = task.title;

            const date = document.createElement("span");
            date.className = "task-date";
            date.textContent = task.date;

            const remove = document.createElement("button");
            remove.className = "delete-button";
            remove.textContent = "Delete";

            remove.addEventListener("click", () => {
                tasks = tasks.filter(item => item.id !== task.id);
                saveTasks();
            });

            item.append(checkbox, title, date, remove);
            container.appendChild(item);
        });

        if (!tasks.length) {
            const empty = document.createElement("p");
            empty.className = "empty-state";
            empty.textContent =
                "No study tasks yet. Add your first task!";
            container.appendChild(empty);
        }
    }

    function saveTasks() {
        if (!Storage.set("studymate_tasks", tasks)) {
            alert("Could not save tasks. Browser storage may be full.");
            return;
        }

        renderTasks();
        renderDashboard();
    }

    $("#taskForm").addEventListener("submit", event => {
        event.preventDefault();

        const title = $("#taskInput").value.trim();
        const date = $("#taskDate").value;

        if (!title || !date) return;

        tasks.push({
            id: crypto.randomUUID(),
            title,
            date,
            completed: false
        });

        saveTasks();
        event.target.reset();
    });

    // DASHBOARD
    function renderDashboard() {
        $("#totalNotes").textContent = notes.length;

        const completed = tasks.filter(
            task => task.completed
        ).length;

        $("#completedTasks").textContent = completed;

        const recent = $("#recentNotes");
        recent.replaceChildren();

        if (!notes.length) {
            const message = document.createElement("p");
            message.className = "empty-state";
            message.textContent =
                "No notes yet. Create your first study note!";
            recent.appendChild(message);
            return;
        }

        notes.slice(0, 3).forEach(note => {
            const item = document.createElement("div");
            item.className = "note-card";

            const heading = document.createElement("h4");
            heading.textContent = note.title;

            const preview = document.createElement("p");
            preview.textContent = note.content.slice(0, 100);

            item.append(heading, preview);
            recent.appendChild(item);
        });
    }

    // INITIALIZE APPLICATION
    renderNotes();
    renderTasks();
    renderDashboard();
    refreshIcons();

});
