require("dotenv").config();

const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");


// ==========================================
// PROJECT SERVICES
// ==========================================

const {
    processDocument
} = require("./documentProcessor");

const {
    analyzeDocumentStructure,
    saveStructureReport
} = require("./documentAnalyzer");

const {
    chunkDocument,
    saveChunks
} = require("./chunker");

const {
    generateChunkEmbeddings,
    saveEmbeddings
} = require("./embeddingService");

const {
    storeEmbeddings
} = require("./chromaStore");

const {
    retrieveRelevantChunks
} = require("./retrievalService");

const {
    generateRAGAnswer
} = require("./ragService");

const {
    registerDocument,
    getAllDocuments,
    getDocumentById
} = require("./documentRegistry");


// ==========================================
// APP
// ==========================================

const app =
    express();

const PORT =
    5000;


// ==========================================
// MIDDLEWARE
// ==========================================

app.use(
    cors()
);

app.use(
    express.json()
);


// ==========================================
// FOLDERS
// ==========================================

const uploadFolder =
    path.join(
        __dirname,
        "uploads"
    );

const extractedFolder =
    path.join(
        __dirname,
        "extracted"
    );


if (
    !fs.existsSync(
        uploadFolder
    )
) {

    fs.mkdirSync(
        uploadFolder,
        {
            recursive: true
        }
    );

}


if (
    !fs.existsSync(
        extractedFolder
    )
) {

    fs.mkdirSync(
        extractedFolder,
        {
            recursive: true
        }
    );

}


// ==========================================
// SERVE FRONTEND
// ==========================================

app.use(
    express.static(
        __dirname
    )
);


// ==========================================
// MULTER
// ==========================================

const storage =
    multer.diskStorage({

        destination:
            function (
                req,
                file,
                cb
            ) {

                cb(
                    null,
                    uploadFolder
                );

            },

        filename:
            function (
                req,
                file,
                cb
            ) {

                const uniqueName =
                    Date.now() +
                    "-" +
                    file.originalname;

                cb(
                    null,
                    uniqueName
                );

            }

    });


const upload =
    multer({

        storage,

        limits: {

            fileSize:
                50 * 1024 * 1024

        },

        fileFilter:
            function (
                req,
                file,
                cb
            ) {

                if (
                    file.mimetype !==
                    "application/pdf"
                ) {

                    return cb(
                        new Error(
                            "Only PDF files are allowed"
                        )
                    );

                }

                cb(
                    null,
                    true
                );

            }

    });


// ==========================================
// CREATE DOCUMENT ID
// ==========================================

function createDocumentId(
    filename
) {

    return path
        .basename(
            filename,
            path.extname(
                filename
            )
        )

        .toLowerCase()

        .replace(
            /[^a-z0-9]+/g,
            "_"
        )

        .replace(
            /^_+|_+$/g,
            ""
        );

}


// ==========================================
// PDF TEXT EXTRACTION
// ==========================================

async function extractPdfText(
    filePath
) {

    console.log("");

    console.log(
        "========================================"
    );

    console.log(
        "STARTING PDF TEXT EXTRACTION"
    );

    console.log(
        "========================================"
    );

    console.log(
        "File:",
        filePath
    );


    const pdfjsLib =
        await import(
            "pdfjs-dist/legacy/build/pdf.mjs"
        );


    const data =
        new Uint8Array(

            fs.readFileSync(
                filePath
            )

        );


    const pdf =
        await pdfjsLib
            .getDocument({
                data
            })
            .promise;


    console.log(
        "Total Pages:",
        pdf.numPages
    );


    const pages = [];


    for (
        let pageNumber = 1;
        pageNumber <= pdf.numPages;
        pageNumber++
    ) {

        console.log(
            `Extracting page ${pageNumber}/${pdf.numPages}`
        );


        const page =
            await pdf.getPage(
                pageNumber
            );


        const textContent =
            await page.getTextContent();


        const textItems =
            textContent.items

                .filter(
                    function (item) {

                        return (
                            item.str &&
                            item.str.trim()
                                .length > 0
                        );

                    }
                )

                .map(
                    function (item) {

                        return {

                            text:
                                item.str,

                            x:
                                item.transform[4],

                            y:
                                item.transform[5],

                            width:
                                item.width || 0,

                            height:
                                item.height || 0

                        };

                    }
                );


        // ==================================
        // SORT ITEMS
        // ==================================

        textItems.sort(

            function (
                a,
                b
            ) {

                const yDifference =
                    b.y - a.y;


                if (
                    Math.abs(
                        yDifference
                    ) < 3
                ) {

                    return (
                        a.x - b.x
                    );

                }


                return yDifference;

            }

        );


        // ==================================
        // RECONSTRUCT LINES
        // ==================================

        const lines = [];

        const Y_TOLERANCE =
            3;


        for (
            const item
            of textItems
        ) {

            let matchingLine =
                null;


            for (
                const line
                of lines
            ) {

                if (
                    Math.abs(
                        line.y -
                        item.y
                    ) <=
                    Y_TOLERANCE
                ) {

                    matchingLine =
                        line;

                    break;

                }

            }


            if (
                matchingLine
            ) {

                matchingLine
                    .items
                    .push(item);

            }

            else {

                lines.push({

                    y:
                        item.y,

                    items:
                        [item]

                });

            }

        }


        // ==================================
        // SORT EACH LINE
        // ==================================

        for (
            const line
            of lines
        ) {

            line.items.sort(

                function (
                    a,
                    b
                ) {

                    return (
                        a.x - b.x
                    );

                }

            );

        }


        // ==================================
        // CONVERT TO TEXT
        // ==================================

        const reconstructedLines =
            lines

                .map(
                    function (line) {

                        return line.items

                            .map(
                                function (item) {

                                    return item.text;

                                }
                            )

                            .join(" ")

                            .trim();

                    }
                )

                .filter(
                    Boolean
                );


        const pageText =
            reconstructedLines.join(
                "\n"
            );


        pages.push({

            pageNumber,

            text:
                pageText,

            textItems,

            lines:
                reconstructedLines

        });

    }


    console.log("");

    console.log(
        "========================================"
    );

    console.log(
        "PDF TEXT EXTRACTION COMPLETE"
    );

    console.log(
        "Pages extracted:",
        pages.length
    );

    console.log(
        "========================================"
    );

    console.log("");


    return {

        totalPages:
            pdf.numPages,

        pages

    };

}


// ==========================================
// SAVE MARKDOWN
// ==========================================

function saveExtractionAsMarkdown(

    originalFilename,

    extractedData

) {

    let markdown = "";


    markdown +=
        `# ${originalFilename}\n\n`;

    markdown +=
        `**Total Pages:** ${extractedData.totalPages}\n\n`;

    markdown +=
        "---\n\n";


    for (
        const page
        of extractedData.pages
    ) {

        markdown +=
            `# Page ${page.pageNumber}\n\n`;


        if (
            page.text &&
            page.text.trim()
        ) {

            markdown +=
                page.text.trim();

        }

        else {

            markdown +=
                "_No text was extracted from this page._";

        }


        markdown +=
            "\n\n---\n\n";

    }


    const baseName =
        path.basename(

            originalFilename,

            path.extname(
                originalFilename
            )

        );


    const markdownPath =
        path.join(

            extractedFolder,

            `${baseName}.md`

        );


    fs.writeFileSync(

        markdownPath,

        markdown,

        "utf8"

    );


    return markdownPath;

}


// ==========================================
// UPLOAD PDF
// ==========================================

app.post(

    "/api/pdf/upload",

    upload.single("pdf"),

    async function (
        req,
        res
    ) {

        try {

            if (!req.file) {

                return res
                    .status(400)
                    .json({

                        success:
                            false,

                        error:
                            "No PDF file uploaded."

                    });

            }


            console.log("");

            console.log(
                "========================================"
            );

            console.log(
                "NEW PDF RECEIVED"
            );

            console.log(
                "File:",
                req.file.originalname
            );

            console.log(
                "========================================"
            );


            // ==================================
            // EXTRACTION
            // ==================================

            const extractedData =
                await extractPdfText(
                    req.file.path
                );


            // ==================================
            // DOCUMENT ID
            // ==================================

            const documentId =
                createDocumentId(
                    req.file.originalname
                );


            // ==================================
            // PHASE 3A
            // ==================================

            const processedResult =
                processDocument(

                    req.file.originalname,

                    extractedData

                );


            // ==================================
            // PHASE 3B
            // ==================================

            const structureReport =
                analyzeDocumentStructure(
                    extractedData
                );


            const structureReportPath =
                saveStructureReport(

                    req.file.originalname,

                    structureReport

                );


            // ==================================
            // SAVE MARKDOWN
            // ==================================

            const markdownPath =
                saveExtractionAsMarkdown(

                    req.file.originalname,

                    extractedData

                );


            // ==================================
            // PHASE 3C
            // CHUNKING
            // ==================================

            const chunkResult =
                chunkDocument(

                    req.file.originalname,

                    extractedData

                );


            const chunksPath =
                saveChunks(

                    req.file.originalname,

                    chunkResult

                );


            // ==================================
            // PHASE 3D
            // EMBEDDINGS
            // ==================================

            const embeddingResult =
                await generateChunkEmbeddings(

                    chunkResult.documentId,

                    chunkResult.chunks

                );


            const embeddingsPath =
                saveEmbeddings(

                    req.file.originalname,

                    embeddingResult

                );


            // ==================================
            // PHASE 3E
            // CHROMADB
            // ==================================

            const chromaResult =
                await storeEmbeddings(

                    embeddingResult

                );


            // ==================================
            // WORD COUNT
            // ==================================

            const wordCount =
                extractedData.pages.reduce(

                    function (
                        total,
                        page
                    ) {

                        const words =
                            page.text

                                ? page.text
                                    .trim()
                                    .split(/\s+/)
                                    .filter(Boolean)
                                    .length

                                : 0;


                        return (
                            total +
                            words
                        );

                    },

                    0

                );


            // ==================================
            // REGISTER DOCUMENT
            // ==================================

            const registeredDocument =
                registerDocument({

                    documentId,

                    filename:
                        req.file.originalname,

                    storedFilename:
                        req.file.filename,

                    pages:
                        extractedData.totalPages,

                    words:
                        wordCount,

                    chunks:
                        chunkResult.totalChunks,

                    vectors:
                        chromaResult.inserted,

                    status:
                        "ready"

                });


            console.log("");

            console.log(
                "========================================"
            );

            console.log(
                "DOCUMENT READY"
            );

            console.log(
                "Document ID:",
                registeredDocument.documentId
            );

            console.log(
                "Pages:",
                registeredDocument.pages
            );

            console.log(
                "Chunks:",
                registeredDocument.chunks
            );

            console.log(
                "Vectors:",
                registeredDocument.vectors
            );

            console.log(
                "========================================"
            );

            console.log("");


            // ==================================
            // RESPONSE
            // ==================================

            res.json({

                success:
                    true,

                message:
                    "PDF uploaded and processed successfully.",

                file: {

                    originalName:
                        req.file.originalname,

                    filename:
                        req.file.filename,

                    size:
                        req.file.size

                },

                document:
                    registeredDocument,

                extraction: {

                    totalPages:
                        extractedData.totalPages,

                    markdown:
                        markdownPath

                },

                processing: {

                    outputPath:
                        processedResult.outputPath

                },

                structureAnalysis: {

                    outputPath:
                        structureReportPath,

                    report:
                        structureReport

                },

                chunking: {

                    outputPath:
                        chunksPath,

                    totalChunks:
                        chunkResult.totalChunks

                },

                embedding: {

                    outputPath:
                        embeddingsPath,

                    totalChunks:
                        embeddingResult.totalChunks,

                    model:
                        embeddingResult.embeddingModel

                },

                vectorDatabase: {

                    database:
                        "ChromaDB",

                    collection:
                        process.env.CHROMA_COLLECTION ||
                        "ai_pdf_documents_v2",

                    vectorsStored:
                        chromaResult.inserted,

                    totalRecords:
                        chromaResult.total

                }

            });

        }

        catch (error) {

            console.error("");

            console.error(
                "========================================"
            );

            console.error(
                "PDF PROCESSING ERROR"
            );

            console.error(
                error
            );

            console.error(
                "========================================"
            );


            res
                .status(500)
                .json({

                    success:
                        false,

                    error:
                        error.message

                });

        }

    }

);


// ==========================================
// GET ALL DOCUMENTS
// ==========================================

app.get(

    "/api/documents",

    function (
        req,
        res
    ) {

        try {

            const documents =
                getAllDocuments();


            res.json({

                success:
                    true,

                count:
                    documents.length,

                documents

            });

        }

        catch (error) {

            console.error(
                "DOCUMENT LIST ERROR:",
                error
            );


            res
                .status(500)
                .json({

                    success:
                        false,

                    error:
                        error.message

                });

        }

    }

);


// ==========================================
// GET ONE DOCUMENT
// ==========================================

app.get(

    "/api/documents/:documentId",

    function (
        req,
        res
    ) {

        try {

            const document =
                getDocumentById(
                    req.params.documentId
                );


            if (!document) {

                return res
                    .status(404)
                    .json({

                        success:
                            false,

                        error:
                            "Document not found."

                    });

            }


            res.json({

                success:
                    true,

                document

            });

        }

        catch (error) {

            console.error(
                "DOCUMENT LOOKUP ERROR:",
                error
            );


            res
                .status(500)
                .json({

                    success:
                        false,

                    error:
                        error.message

                });

        }

    }

);


// ==========================================
// SEMANTIC SEARCH
// ==========================================

app.post(

    "/api/search",

    async function (
        req,
        res
    ) {

        try {

            const {
                query,
                topK,
                documentId
            } = req.body;


            if (
                !query ||
                !query.trim()
            ) {

                return res
                    .status(400)
                    .json({

                        success:
                            false,

                        error:
                            "Query is required."

                    });

            }


            const result =
                await retrieveRelevantChunks(

                    query,

                    {

                        topK:
                            topK || 5,

                        documentId:
                            documentId || null

                    }

                );


            res.json({

                success:
                    true,

                ...result

            });

        }

        catch (error) {

            console.error(
                "SEARCH ERROR:",
                error
            );


            res
                .status(500)
                .json({

                    success:
                        false,

                    error:
                        error.message

                });

        }

    }

);


// ==========================================
// ASK AI
// ==========================================

app.post(

    "/api/ask",

    async function (
        req,
        res
    ) {

        try {

            const {
                query,
                topK,
                documentId
            } = req.body;


            if (
                !query ||
                !query.trim()
            ) {

                return res
                    .status(400)
                    .json({

                        success:
                            false,

                        error:
                            "Question is required."

                    });

            }


            if (
                !documentId
            ) {

                return res
                    .status(400)
                    .json({

                        success:
                            false,

                        error:
                            "Please select a PDF before asking a question."

                    });

            }


            const selectedDocument =
                getDocumentById(
                    documentId
                );


            if (!selectedDocument) {

                return res
                    .status(404)
                    .json({

                        success:
                            false,

                        error:
                            "Selected document was not found."

                    });

            }


            const result =
                await generateRAGAnswer(

                    query,

                    {

                        topK:
                            topK || 5,

                        documentId

                    }

                );


            res.json({

                success:
                    true,

                query:
                    result.query,

                documentId:
                    result.documentId,

                document:
                    selectedDocument,

                answer:
                    result.answer,

                sources:
                    result.sources

            });

        }

        catch (error) {

            console.error(
                "RAG ERROR:",
                error
            );


            res
                .status(500)
                .json({

                    success:
                        false,

                    error:
                        error.message

                });

        }

    }

);


// ==========================================
// ERROR HANDLER
// ==========================================

app.use(

    function (
        error,
        req,
        res,
        next
    ) {

        console.error(
            "SERVER ERROR:",
            error.message
        );


        res
            .status(400)
            .json({

                success:
                    false,

                error:
                    error.message

            });

    }

);


// ==========================================
// START SERVER
// ==========================================

app.listen(

    PORT,

    function () {

        console.log("");

        console.log(
            "========================================"
        );

        console.log(
            "       AI PDF READER SERVER"
        );

        console.log(
            "========================================"
        );

        console.log(
            `Server running at http://localhost:${PORT}`
        );

        console.log(
            "========================================"
        );

        console.log("");

    }

);