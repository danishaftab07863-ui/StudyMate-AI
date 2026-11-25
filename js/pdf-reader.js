
document.addEventListener("DOMContentLoaded", () => {
    const $ = (selector) => document.querySelector(selector);

    // Check PDF.js library
    if (!window.pdfjsLib) {
        console.error("PDF.js library could not be loaded.");
        return;
    }

    pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

    // HTML elements
    const pdfFile = $("#pdfFile");
    const uploadStatus = $("#pdfUploadStatus");
    const fileName = $("#pdfFileName");
    const pageInfo = $("#pdfPageInfo");
    const pageNumber = $("#pdfPageNumber");
    const totalPages = $("#pdfTotalPages");
    const canvas = $("#pdfCanvas");
    const canvasContainer = $("#pdfCanvasContainer");
    const emptyState = $("#pdfEmptyState");
    const libraryList = $("#pdfLibraryList");
    const libraryCount = $("#pdfLibraryCount");

    const prevBtn = $("#pdfPrev");
    const nextBtn = $("#pdfNext");
    const zoomInBtn = $("#pdfZoomIn");
    const zoomOutBtn = $("#pdfZoomOut");
    const zoomValue = $("#pdfZoomValue");

    let currentPdf = null;
    let currentPdfId = null;
    let currentPage = 1;
    let totalPageCount = 0;
    let zoom = 1;
    let renderTask = null;
    let renderSequence = 0;

    const DB_NAME = "StudyMatePDFDatabase";
    const STORE_NAME = "pdfFiles";
    const DB_VERSION = 1;

    // IndexedDB setup
    function openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, {
                        keyPath: "id"
                    });
                }
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async function savePdf(record) {
        const db = await openDatabase();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, "readwrite");
            transaction.objectStore(STORE_NAME).put(record);

            transaction.oncomplete = () => {
                db.close();
                resolve();
            };

            transaction.onerror = () => {
                db.close();
                reject(transaction.error);
            };
        });
    }

    async function getPdf(id) {
        const db = await openDatabase();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, "readonly");
            const request = transaction.objectStore(STORE_NAME).get(id);

            request.onsuccess = () => {
                const result = request.result || null;
                db.close();
                resolve(result);
            };

            request.onerror = () => {
                db.close();
                reject(request.error);
            };
        });
    }

    async function getAllPdfs() {
        const db = await openDatabase();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, "readonly");
            const request = transaction.objectStore(STORE_NAME).getAll();

            request.onsuccess = () => {
                const result = request.result || [];
                db.close();

                result.sort((a, b) => b.createdAt - a.createdAt);
                resolve(result);
            };

            request.onerror = () => {
                db.close();
                reject(request.error);
            };
        });
    }

    async function deletePdf(id) {
        const db = await openDatabase();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, "readwrite");
            transaction.objectStore(STORE_NAME).delete(id);

            transaction.oncomplete = () => {
                db.close();
                resolve();
            };

            transaction.onerror = () => {
                db.close();
                reject(transaction.error);
            };
        });
    }

    // Status message
    function showStatus(message, type = "") {
        uploadStatus.textContent = message;
        uploadStatus.className = "pdf-status " + type;
    }

    // Enable / disable controls
    function updateControls() {
        const hasPdf = Boolean(currentPdf);

        prevBtn.disabled = !hasPdf || currentPage <= 1;
        nextBtn.disabled = !hasPdf || currentPage >= totalPageCount;

        pageNumber.disabled = !hasPdf;
        pageNumber.max = totalPageCount || 1;

        zoomInBtn.disabled = !hasPdf;
        zoomOutBtn.disabled = !hasPdf;
    }

    // Cancel previous rendering safely
    function cancelCurrentRender() {
        renderSequence++;

        if (renderTask) {
            renderTask.cancel();
            renderTask = null;
        }
    }

    // Render PDF page
    async function renderPage() {
        if (!currentPdf) return;

        cancelCurrentRender();
        const sequence = renderSequence;

        try {
            const page = await currentPdf.getPage(currentPage);

            if (sequence !== renderSequence) return;

            const viewport = page.getViewport({
                scale: zoom
            });

            const context = canvas.getContext("2d");

            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);

            canvas.hidden = false;
            emptyState.hidden = true;

            renderTask = page.render({
                canvasContext: context,
                viewport: viewport
            });

            await renderTask.promise;

            if (sequence !== renderSequence) return;

            renderTask = null;

            pageNumber.value = currentPage;
            pageInfo.textContent =
                `Page ${currentPage} of ${totalPageCount}`;

            totalPages.textContent = `/ ${totalPageCount}`;
            zoomValue.textContent = `${Math.round(zoom * 100)}%`;

            updateControls();

        } catch (error) {
            if (error.name !== "RenderingCancelledException") {
                console.error("PDF rendering error:", error);
                showStatus("Unable to render this PDF page.", "error");
            }
        }
    }

    // Open PDF using a Blob
    async function openPdf(record) {
        try {
            showStatus("Opening PDF...", "");

            cancelCurrentRender();

            if (currentPdf && currentPdf.destroy) {
                await currentPdf.destroy();
            }

            currentPdf = null;

            const buffer = await record.blob.arrayBuffer();

            const loadingTask = pdfjsLib.getDocument({
                data: new Uint8Array(buffer)
            });

            const loadedPdf = await loadingTask.promise;

            currentPdf = loadedPdf;
            currentPdfId = record.id;
            currentPage = 1;
            totalPageCount = loadedPdf.numPages;
            zoom = 1;

            fileName.textContent = record.name;
            totalPages.textContent = `/ ${totalPageCount}`;
            pageNumber.value = 1;
            zoomValue.textContent = "100%";

            updateControls();

            await renderPage();

            showStatus("PDF opened successfully.", "success");

        } catch (error) {
            console.error("PDF open error:", error);
            currentPdf = null;
            currentPdfId = null;
            totalPageCount = 0;

            updateControls();
            showStatus("This PDF could not be opened.", "error");
        }
    }

    // Upload PDF
    pdfFile.addEventListener("change", async (event) => {
        const file = event.target.files[0];

        if (!file) return;

        if (
            file.type !== "application/pdf" &&
            !file.name.toLowerCase().endsWith(".pdf")
        ) {
            showStatus("Please select a valid PDF file.", "error");
            pdfFile.value = "";
            return;
        }

        // Keep uploads reasonably sized
        const maxSize = 50 * 1024 * 1024;

        if (file.size > maxSize) {
            showStatus("PDF size must be 50 MB or less.", "error");
            pdfFile.value = "";
            return;
        }

        try {
            showStatus("Saving your PDF...", "");

            const record = {
                id: crypto.randomUUID(),
                name: file.name,
                size: file.size,
                createdAt: Date.now(),
                blob: file
            };

            await savePdf(record);
            await renderLibrary();
            await openPdf(record);

        } catch (error) {
            console.error("PDF save error:", error);
            showStatus(
                "Could not save PDF. Check your browser storage space.",
                "error"
            );
        }

        pdfFile.value = "";
    });

    // Previous page
    prevBtn.addEventListener("click", () => {
        if (!currentPdf || currentPage <= 1) return;

        currentPage--;
        renderPage();
    });

    // Next page
    nextBtn.addEventListener("click", () => {
        if (!currentPdf || currentPage >= totalPageCount) return;

        currentPage++;
        renderPage();
    });

    // Direct page navigation
    pageNumber.addEventListener("change", () => {
        if (!currentPdf) return;

        const requestedPage = Number(pageNumber.value);

        if (
            !Number.isInteger(requestedPage) ||
            requestedPage < 1 ||
            requestedPage > totalPageCount
        ) {
            pageNumber.value = currentPage;
            return;
        }

        currentPage = requestedPage;
        renderPage();
    });

    // Zoom in
    zoomInBtn.addEventListener("click", () => {
        if (!currentPdf || zoom >= 2.5) return;

        zoom = Math.min(2.5, zoom + 0.15);
        renderPage();
    });

    // Zoom out
    zoomOutBtn.addEventListener("click", () => {
        if (!currentPdf || zoom <= 0.5) return;

        zoom = Math.max(0.5, zoom - 0.15);
        renderPage();
    });

    // Format file size
    function formatFileSize(bytes) {
        if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(1)} KB`;
        }

        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }

    // Render saved PDF library
    async function renderLibrary() {
        try {
            const files = await getAllPdfs();

            libraryCount.textContent =
                `${files.length} PDF${files.length === 1 ? "" : "s"}`;

            libraryList.replaceChildren();

            if (files.length === 0) {
                const empty = document.createElement("p");
                empty.className = "pdf-empty-library";
                empty.textContent = "No saved PDFs yet.";
                libraryList.appendChild(empty);
                return;
            }

            files.forEach((file) => {
                const item = document.createElement("div");
                item.className = "pdf-library-item";

                const info = document.createElement("div");
                info.className = "pdf-library-info";

                const icon = document.createElement("div");
                icon.className = "pdf-file-icon";
                icon.innerHTML = '<i data-lucide="file-text"></i>';

                const details = document.createElement("div");

                const title = document.createElement("h4");
                title.textContent = file.name;

                const meta = document.createElement("p");
                meta.textContent =
                    `${formatFileSize(file.size)} • ${new Date(file.createdAt).toLocaleDateString()}`;

                details.append(title, meta);
                info.append(icon, details);

                const actions = document.createElement("div");
                actions.className = "pdf-library-actions";

                const openButton = document.createElement("button");
                openButton.type = "button";
                openButton.textContent = "Open";

                openButton.addEventListener("click", () => {
                    openPdf(file);
                });

                const deleteButton = document.createElement("button");
                deleteButton.type = "button";
                deleteButton.className = "pdf-delete-btn";
                deleteButton.textContent = "Delete";

                deleteButton.addEventListener("click", async () => {
                    const confirmed = confirm(
                        `Delete "${file.name}" from your PDF library?`
                    );

                    if (!confirmed) return;

                    try {
                        await deletePdf(file.id);

                        if (currentPdfId === file.id) {
                            cancelCurrentRender();

                            if (currentPdf && currentPdf.destroy) {
                                await currentPdf.destroy();
                            }

                            currentPdf = null;
                            currentPdfId = null;
                            totalPageCount = 0;
                            currentPage = 1;

                            canvas.hidden = true;
                            emptyState.hidden = false;

                            fileName.textContent = "No PDF selected";
                            pageInfo.textContent =
                                "Upload a PDF to start reading.";

                            totalPages.textContent = "/ 0";
                            pageNumber.value = 1;
                            zoomValue.textContent = "100%";

                            updateControls();
                        }

                        await renderLibrary();
                        showStatus("PDF deleted successfully.", "success");

                    } catch (error) {
                        console.error("PDF delete error:", error);
                        showStatus("Could not delete this PDF.", "error");
                    }
                });

                actions.append(openButton, deleteButton);
                item.append(info, actions);
                libraryList.appendChild(item);
            });

            if (window.lucide) {
                lucide.createIcons();
            }

        } catch (error) {
            console.error("PDF library error:", error);
            showStatus("Could not load your PDF library.", "error");
        }
    }

    // Initial setup
    updateControls();
    renderLibrary();
});
