// ==========================================
// AI PDF READER - FRONTEND
// MULTIPLE PDF VERSION
// ==========================================


// ==========================================
// API
// ==========================================

const API_BASE_URL =
    window.location.origin;


// ==========================================
// DOM
// ==========================================

const pdfInput =
    document.getElementById(
        "pdfInput"
    );

const browseBtn =
    document.getElementById(
        "browseBtn"
    );

const uploadBtn =
    document.getElementById(
        "uploadBtn"
    );

const uploadBox =
    document.getElementById(
        "uploadBox"
    );

const selectedFile =
    document.getElementById(
        "selectedFile"
    );

const selectedFileName =
    document.getElementById(
        "selectedFileName"
    );

const uploadProgressContainer =
    document.getElementById(
        "uploadProgressContainer"
    );

const uploadProgress =
    document.getElementById(
        "uploadProgress"
    );

const uploadStatus =
    document.getElementById(
        "uploadStatus"
    );

const documentsList =
    document.getElementById(
        "documentsList"
    );

const documentsLoading =
    document.getElementById(
        "documentsLoading"
    );

const noDocuments =
    document.getElementById(
        "noDocuments"
    );

const refreshDocumentsBtn =
    document.getElementById(
        "refreshDocumentsBtn"
    );

const documentCard =
    document.getElementById(
        "documentCard"
    );

const documentName =
    document.getElementById(
        "documentName"
    );

const documentPages =
    document.getElementById(
        "documentPages"
    );

const documentChunks =
    document.getElementById(
        "documentChunks"
    );

const documentVectors =
    document.getElementById(
        "documentVectors"
    );

const questionInput =
    document.getElementById(
        "questionInput"
    );

const askBtn =
    document.getElementById(
        "askBtn"
    );

const questionHint =
    document.getElementById(
        "questionHint"
    );

const aiLoading =
    document.getElementById(
        "aiLoading"
    );

const answerCard =
    document.getElementById(
        "answerCard"
    );

const answerContent =
    document.getElementById(
        "answerContent"
    );

const sourcesList =
    document.getElementById(
        "sourcesList"
    );

const copyBtn =
    document.getElementById(
        "copyBtn"
    );

const clearBtn =
    document.getElementById(
        "clearBtn"
    );

const errorBox =
    document.getElementById(
        "errorBox"
    );

const errorMessage =
    document.getElementById(
        "errorMessage"
    );


// ==========================================
// STATE
// ==========================================

let selectedFiles = [];

let documents = [];

let activeDocument = null;

let lastAnswer = "";


// ==========================================
// INITIAL LOAD
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        loadDocuments();

    }
);


// ==========================================
// BROWSE
// ==========================================

browseBtn.addEventListener(
    "click",
    function (event) {

        event.stopPropagation();

        pdfInput.click();

    }
);


// ==========================================
// UPLOAD BOX CLICK
// ==========================================

uploadBox.addEventListener(
    "click",
    function (event) {

        if (
            event.target.closest("button") ||
            event.target.closest("input")
        ) {

            return;

        }

        pdfInput.click();

    }
);


// ==========================================
// FILE SELECTED
// ==========================================

pdfInput.addEventListener(
    "change",
    function () {

        if (
            !pdfInput.files ||
            !pdfInput.files.length
        ) {

            return;

        }


        const files =
            Array.from(
                pdfInput.files
            );


        handleSelectedFiles(
            files
        );

    }
);


// ==========================================
// HANDLE SELECTED FILES
// ==========================================

function handleSelectedFiles(
    files
) {

    hideError();


    const validFiles =
        files.filter(

            function (file) {

                return (
                    file.type ===
                    "application/pdf"
                );

            }

        );


    if (
        validFiles.length !==
        files.length
    ) {

        showError(
            "Only PDF files are allowed."
        );

    }


    const maxSize =
        50 * 1024 * 1024;


    const oversizedFiles =
        validFiles.filter(

            function (file) {

                return (
                    file.size >
                    maxSize
                );

            }

        );


    if (
        oversizedFiles.length
    ) {

        showError(
            "Each PDF must be 50 MB or smaller."
        );

        return;

    }


    if (
        !validFiles.length
    ) {

        return;

    }


    selectedFiles =
        validFiles;


    // ======================================
    // SHOW SELECTION
    // ======================================

    if (
        selectedFiles.length === 1
    ) {

        selectedFileName.textContent =
            selectedFiles[0].name;

    }

    else {

        selectedFileName.textContent =
            `${selectedFiles.length} PDF files selected`;

    }


    selectedFile.style.display =
        "flex";


    uploadBtn.disabled =
        false;


    uploadStatus.textContent =
        `${selectedFiles.length} PDF${selectedFiles.length > 1 ? "s" : ""} ready to upload.`;

}


// ==========================================
// DRAG OVER
// ==========================================

uploadBox.addEventListener(
    "dragover",
    function (event) {

        event.preventDefault();

        uploadBox.classList.add(
            "dragging"
        );

    }
);


// ==========================================
// DRAG LEAVE
// ==========================================

uploadBox.addEventListener(
    "dragleave",
    function () {

        uploadBox.classList.remove(
            "dragging"
        );

    }
);


// ==========================================
// DROP
// ==========================================

uploadBox.addEventListener(
    "drop",
    function (event) {

        event.preventDefault();

        uploadBox.classList.remove(
            "dragging"
        );


        const files =
            Array.from(
                event.dataTransfer.files
            );


        if (!files.length) {

            return;

        }


        handleSelectedFiles(
            files
        );

    }
);


// ==========================================
// UPLOAD BUTTON
// ==========================================

uploadBtn.addEventListener(
    "click",
    uploadSelectedFiles
);


// ==========================================
// UPLOAD MULTIPLE FILES
// ==========================================

async function uploadSelectedFiles() {

    if (
        !selectedFiles.length
    ) {

        showError(
            "Please select at least one PDF."
        );

        return;

    }


    hideError();


    uploadBtn.disabled =
        true;

    browseBtn.disabled =
        true;


    uploadProgressContainer.style.display =
        "block";


    let successfulUploads = 0;


    try {

        for (
            let i = 0;
            i < selectedFiles.length;
            i++
        ) {

            const file =
                selectedFiles[i];


            const percentageStart =
                Math.round(
                    (i /
                        selectedFiles.length) *
                    100
                );


            uploadProgress.style.width =
                `${percentageStart}%`;


            uploadStatus.textContent =
                `Uploading ${i + 1} of ${selectedFiles.length}: ${file.name}`;


            const formData =
                new FormData();


            formData.append(
                "pdf",
                file
            );


            const response =
                await fetch(

                    `${API_BASE_URL}/api/pdf/upload`,

                    {

                        method:
                            "POST",

                        body:
                            formData

                    }

                );


            const data =
                await response.json();


            if (
                !response.ok ||
                !data.success
            ) {

                throw new Error(

                    data.error ||
                    data.message ||
                    `Failed to upload ${file.name}`

                );

            }


            successfulUploads++;


            // ==================================
            // IMPORTANT:
            // RELOAD LIBRARY AFTER EVERY PDF
            // ==================================

            await loadDocuments();

        }


        uploadProgress.style.width =
            "100%";


        uploadStatus.textContent =
            `${successfulUploads} PDF${successfulUploads > 1 ? "s" : ""} uploaded successfully.`;


        // ======================================
        // CLEAR FILE SELECTION
        // ======================================

        selectedFiles =
            [];


        pdfInput.value =
            "";


        selectedFile.style.display =
            "none";


        uploadBtn.disabled =
            true;


        // ======================================
        // SELECT LAST UPLOADED DOCUMENT
        // ======================================

        await loadDocuments();


        if (
            documents.length
        ) {

            const newestDocument =
                documents[
                    documents.length - 1
                ];


            selectDocument(
                newestDocument
            );

        }

    }

    catch (error) {

        console.error(
            "Upload error:",
            error
        );


        showError(
            error.message
        );


        uploadStatus.textContent =
            "Upload failed.";

    }

    finally {

        uploadBtn.disabled =
            selectedFiles.length === 0;

        browseBtn.disabled =
            false;

    }

}


// ==========================================
// LOAD ALL DOCUMENTS
// ==========================================

async function loadDocuments() {

    documentsLoading.style.display =
        "flex";


    try {

        const response =
            await fetch(

                `${API_BASE_URL}/api/documents`

            );


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(

                data.error ||
                "Unable to load documents."

            );

        }


        documents =
            data.documents ||
            [];


        renderDocuments();

    }

    catch (error) {

        console.error(
            "Document loading error:",
            error
        );


        showError(
            error.message
        );

    }

    finally {

        documentsLoading.style.display =
            "none";

    }

}


// ==========================================
// RENDER DOCUMENTS
// ==========================================

function renderDocuments() {

    documentsList.innerHTML =
        "";


    if (
        !documents.length
    ) {

        noDocuments.style.display =
            "block";

        return;

    }


    noDocuments.style.display =
        "none";


    documents.forEach(

        function (doc) {

            const card =
                createDocumentCard(
                    doc
                );


            documentsList.appendChild(
                card
            );

        }

    );

}


// ==========================================
// CREATE DOCUMENT CARD
// ==========================================

function createDocumentCard(
    doc
) {

    const card =
        document.createElement(
            "div"
        );


    card.className =
        "document-library-card";


    if (
        activeDocument &&
        activeDocument.documentId ===
        doc.documentId
    ) {

        card.classList.add(
            "active"
        );

    }


    // ======================================
    // TOP
    // ======================================

    const top =
        document.createElement(
            "div"
        );


    top.className =
        "document-card-top";


    const icon =
        document.createElement(
            "div"
        );


    icon.className =
        "document-pdf-icon";


    icon.innerHTML =
        `<i class="fa-solid fa-file-pdf"></i>`;


    const info =
        document.createElement(
            "div"
        );


    info.className =
        "document-card-info";


    const title =
        document.createElement(
            "div"
        );


    title.className =
        "document-card-title";


    title.textContent =
        doc.filename ||
        "Untitled PDF";


    const status =
        document.createElement(
            "div"
        );


    status.className =
        "document-status";


    status.innerHTML =
        `

        <span class="document-status-dot"></span>

        ${escapeHtml(
            doc.status ||
            "ready"
        )}

        `;


    info.appendChild(
        title
    );

    info.appendChild(
        status
    );


    top.appendChild(
        icon
    );

    top.appendChild(
        info
    );


    card.appendChild(
        top
    );


    // ======================================
    // STATS
    // ======================================

    const stats =
        document.createElement(
            "div"
        );


    stats.className =
        "document-stats";


    stats.innerHTML = `

        <span class="document-stat">

            <i class="fa-regular fa-file"></i>

            ${Number(doc.pages || 0)}

            pages

        </span>


        <span class="document-stat">

            <i class="fa-solid fa-layer-group"></i>

            ${Number(doc.chunks || 0)}

            chunks

        </span>


        <span class="document-stat">

            <i class="fa-solid fa-database"></i>

            ${Number(doc.vectors || 0)}

            vectors

        </span>

    `;


    card.appendChild(
        stats
    );


    // ======================================
    // DATE
    // ======================================

    const date =
        document.createElement(
            "div"
        );


    date.className =
        "document-date";


    date.textContent =
        formatDate(
            doc.updatedAt ||
            doc.createdAt
        );


    card.appendChild(
        date
    );


    // ======================================
    // BUTTON
    // ======================================

    const actions =
        document.createElement(
            "div"
        );


    actions.className =
        "document-actions";


    const chatButton =
        document.createElement(
            "button"
        );


    chatButton.type =
        "button";


    chatButton.className =
        "document-chat-btn";


    if (
        activeDocument &&
        activeDocument.documentId ===
        doc.documentId
    ) {

        chatButton.innerHTML =
            `

            <i class="fa-solid fa-check"></i>

            Currently Selected

            `;

    }

    else {

        chatButton.innerHTML =
            `

            <i class="fa-solid fa-comments"></i>

            Chat with PDF

            `;

    }


    chatButton.addEventListener(

        "click",

        function () {

            selectDocument(
                doc
            );

        }

    );


    actions.appendChild(
        chatButton
    );


    card.appendChild(
        actions
    );


    return card;

}


// ==========================================
// SELECT DOCUMENT
// ==========================================

function selectDocument(
    doc
) {

    if (!doc) {

        return;

    }


    activeDocument =
        doc;


    // ======================================
    // UPDATE ACTIVE CARD
    // ======================================

    documentCard.style.display =
        "flex";


    documentName.textContent =
        doc.filename ||
        "Selected PDF";


    documentPages.textContent =
        doc.pages ||
        0;


    documentChunks.textContent =
        doc.chunks ||
        0;


    documentVectors.textContent =
        doc.vectors ||
        0;


    // ======================================
    // ENABLE QUESTION
    // ======================================

    questionInput.disabled =
        false;


    askBtn.disabled =
        false;


    questionHint.textContent =
        `You are chatting with "${doc.filename}".`;


    // ======================================
    // CLEAR OLD ANSWER
    // ======================================

    answerCard.style.display =
        "none";


    answerContent.innerHTML =
        "";

    sourcesList.innerHTML =
        "";


    lastAnswer =
        "";


    // ======================================
    // RERENDER LIBRARY
    // ======================================

    renderDocuments();


    // ======================================
    // SCROLL TO QUESTION
    // ======================================

    setTimeout(

        function () {

            documentCard.scrollIntoView({

                behavior:
                    "smooth",

                block:
                    "center"

            });

        },

        150

    );

}


// ==========================================
// ASK BUTTON
// ==========================================

askBtn.addEventListener(
    "click",
    askQuestion
);


// ==========================================
// CTRL + ENTER
// ==========================================

questionInput.addEventListener(

    "keydown",

    function (event) {

        if (

            event.key ===
            "Enter" &&

            (
                event.ctrlKey ||
                event.metaKey
            )

        ) {

            event.preventDefault();

            askQuestion();

        }

    }

);


// ==========================================
// ASK QUESTION
// ==========================================

async function askQuestion() {

    const query =
        questionInput.value.trim();


    if (!query) {

        showError(
            "Please enter a question."
        );

        return;

    }


    if (!activeDocument) {

        showError(
            "Please select a PDF first."
        );

        return;

    }


    hideError();


    askBtn.disabled =
        true;


    questionInput.disabled =
        true;


    aiLoading.style.display =
        "flex";


    answerCard.style.display =
        "none";


    try {

        console.log(
            "ASKING DOCUMENT:",
            activeDocument.documentId
        );


        const response =
            await fetch(

                `${API_BASE_URL}/api/ask`,

                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            query,

                            documentId:
                                activeDocument.documentId,

                            topK:
                                5

                        })

                }

            );


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(

                data.error ||
                "Unable to generate answer."

            );

        }


        lastAnswer =
            data.answer ||
            "";


        renderAnswer(

            data.answer,

            data.sources ||
            []

        );

    }

    catch (error) {

        console.error(
            "Ask error:",
            error
        );


        showError(
            error.message
        );

    }

    finally {

        aiLoading.style.display =
            "none";


        askBtn.disabled =
            false;


        questionInput.disabled =
            false;

    }

}


// ==========================================
// RENDER ANSWER
// ==========================================

function renderAnswer(
    answer,
    sources
) {

    answerCard.style.display =
        "block";


    answerContent.innerHTML =
        formatAnswer(
            answer
        );


    renderSources(
        sources
    );


    setTimeout(

        function () {

            answerCard.scrollIntoView({

                behavior:
                    "smooth",

                block:
                    "start"

            });

        },

        100

    );

}


// ==========================================
// FORMAT ANSWER
// ==========================================

function formatAnswer(
    text
) {

    if (!text) {

        return `

            <p class="text-muted">

                No answer was returned.

            </p>

        `;

    }


    let safeText =
        escapeHtml(
            text
        );


    // ======================================
    // PAGE CITATIONS
    // ======================================

    safeText =
        safeText.replace(

            /📄\s*(Pages?\s*\d+(?:\s*[–-]\s*\d+)?)/g,

            function (
                match,
                pageLabel
            ) {

                return `

                    <span class="citation-chip">

                        ${pageLabel}

                    </span>

                `;

            }

        );


    // ======================================
    // NEWLINES
    // ======================================

    safeText =
        safeText.replace(
            /\n\n/g,
            "<br><br>"
        );


    safeText =
        safeText.replace(
            /\n/g,
            "<br>"
        );


    return safeText;

}


// ==========================================
// RENDER SOURCES
// ==========================================

function renderSources(
    sources
) {

    sourcesList.innerHTML =
        "";


    if (
        !sources.length
    ) {

        sourcesList.innerHTML = `

            <span class="text-muted">

                No source information available.

            </span>

        `;

        return;

    }


    sources.forEach(

        function (source) {

            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.className =
                "source";


            button.textContent =
                `📄 ${source.pageLabel || "Page unavailable"}`;


            button.addEventListener(

                "click",

                function () {

                    console.log(
                        "Source clicked:",
                        source
                    );

                }

            );


            sourcesList.appendChild(
                button
            );

        }

    );

}


// ==========================================
// COPY
// ==========================================

copyBtn.addEventListener(

    "click",

    async function () {

        if (!lastAnswer) {

            return;

        }


        try {

            await navigator.clipboard.writeText(
                lastAnswer
            );


            const originalText =
                copyBtn.innerHTML;


            copyBtn.innerHTML =
                `

                <i class="fa-solid fa-check"></i>

                Copied

                `;


            setTimeout(

                function () {

                    copyBtn.innerHTML =
                        originalText;

                },

                1500

            );

        }

        catch (error) {

            console.error(
                "Copy failed:",
                error
            );

        }

    }

);


// ==========================================
// CLEAR
// ==========================================

clearBtn.addEventListener(

    "click",

    function () {

        questionInput.value =
            "";

        answerCard.style.display =
            "none";

        answerContent.innerHTML =
            "";

        sourcesList.innerHTML =
            "";

        lastAnswer =
            "";

    }

);


// ==========================================
// REFRESH
// ==========================================

refreshDocumentsBtn.addEventListener(

    "click",

    function () {

        loadDocuments();

    }

);


// ==========================================
// ERROR
// ==========================================

function showError(
    message
) {

    errorMessage.textContent =
        message;


    errorBox.style.display =
        "block";


    errorBox.scrollIntoView({

        behavior:
            "smooth",

        block:
            "center"

    });

}


// ==========================================
// HIDE ERROR
// ==========================================

function hideError() {

    errorBox.style.display =
        "none";

    errorMessage.textContent =
        "";

}


// ==========================================
// ESCAPE HTML
// ==========================================

function escapeHtml(
    value
) {

    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}


// ==========================================
// DATE FORMAT
// ==========================================

function formatDate(
    value
) {

    if (!value) {

        return "";

    }


    try {

        const date =
            new Date(
                value
            );


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return "";

        }


        return (
            "Updated " +
            date.toLocaleString(
                undefined,
                {

                    day:
                        "2-digit",

                    month:
                        "short",

                    year:
                        "numeric"

                }
            )
        );

    }

    catch (error) {

        return "";

    }

}