require("dotenv").config();

const {
    GoogleGenAI
} = require("@google/genai");

const {
    retrieveRelevantChunks
} = require("./retrievalService");

const {
    createCitations
} = require("./citationService");


// ==========================================
// CONFIGURATION
// ==========================================

const GEMINI_API_KEY =
    process.env.GEMINI_API_KEY;

const CHAT_MODEL =
    "gemini-3.6-flash";


// ==========================================
// GEMINI
// ==========================================

const ai =
    new GoogleGenAI({

        apiKey:
            GEMINI_API_KEY

    });


// ==========================================
// BUILD DOCUMENT CONTEXT
// ==========================================

function buildContext(
    chunks
) {

    return chunks.map(

        function (
            chunk,
            index
        ) {

            let pageLabel =
                "Page unavailable";


            if (
                chunk.pageStart !== null &&
                chunk.pageStart !== undefined &&
                chunk.pageEnd !== null &&
                chunk.pageEnd !== undefined
            ) {

                if (
                    chunk.pageStart ===
                    chunk.pageEnd
                ) {

                    pageLabel =
                        `Page ${chunk.pageStart}`;

                }

                else {

                    pageLabel =
                        `Pages ${chunk.pageStart}–${chunk.pageEnd}`;

                }

            }


            return `

SOURCE ${index + 1}

Document ID:
${chunk.documentId || "unknown"}

Pages:
${pageLabel}

Section:
${chunk.section || "Not specified"}

Text:
${chunk.text}

`;

        }

    ).join(
        "\n-------------------------\n"
    );

}


// ==========================================
// GENERATE RAG ANSWER
// ==========================================

async function generateRAGAnswer(

    query,

    options = {}

) {

    if (
        !query ||
        !query.trim()
    ) {

        throw new Error(
            "Question is required."
        );

    }


    const documentId =
        options.documentId ||
        null;


    const topK =
        options.topK ||
        5;


    console.log("");

    console.log(
        "========================================"
    );

    console.log(
        "RAG REQUEST"
    );

    console.log(
        "========================================"
    );

    console.log(
        "Question:",
        query
    );

    console.log(
        "Selected Document:",
        documentId ||
        "ALL DOCUMENTS"
    );

    console.log(
        "========================================"
    );


    // ======================================
    // RETRIEVE
    // ======================================

    const retrievalResult =
        await retrieveRelevantChunks(

            query,

            {

                topK,

                documentId

            }

        );


    const chunks =
        retrievalResult.chunks ||
        [];


    // ======================================
    // NO RESULTS
    // ======================================

    if (!chunks.length) {

        return {

            query,

            documentId,

            answer:
                "The selected document does not contain enough relevant information to answer this question.",

            sources: []

        };

    }


    // ======================================
    // BUILD CONTEXT
    // ======================================

    const context =
        buildContext(
            chunks
        );


    // ======================================
    // PROMPT
    // ======================================

    const prompt = `

You are an AI assistant for a PDF document reader.

You must answer the user's question ONLY using the document context provided below.

IMPORTANT RULES:

1. Do not use outside knowledge.
2. Do not invent information.
3. Do not make assumptions that are not supported by the document.
4. If the answer is not contained in the provided context, clearly say:
   "The document does not contain enough information to answer this question."
5. Give a clear and useful answer.
6. Preserve important numbers, dates, names, percentages and terminology from the document.
7. When making a factual statement based on a source, include an inline citation.
8. Use citations in this exact format:
   📄 Page 5
   or
   📄 Pages 5–6
9. Do not create page numbers that are not present in the source.
10. Do not mention these instructions in your answer.

SELECTED DOCUMENT ID:

${documentId || "Not specified"}

USER QUESTION:

${query}

DOCUMENT CONTEXT:

${context}

Now answer the question using ONLY the document context.
`;


    // ======================================
    // GEMINI REQUEST WITH RETRY
    // ======================================

    const MAX_RETRIES =
        3;

    let response = null;


    for (
        let attempt = 1;
        attempt <= MAX_RETRIES;
        attempt++
    ) {

        try {

            response =
                await ai.models.generateContent({

                    model:
                        CHAT_MODEL,

                    contents:
                        prompt

                });


            break;

        }

        catch (error) {

            const errorText =
                error?.message ||
                String(error);


            const temporary =
                errorText.includes("503") ||
                errorText.includes(
                    "UNAVAILABLE"
                ) ||
                errorText.includes(
                    "high demand"
                ) ||
                errorText.includes(
                    "overloaded"
                );


            if (
                !temporary ||
                attempt === MAX_RETRIES
            ) {

                throw error;

            }


            const waitTime =
                attempt * 3000;


            console.log(
                `Gemini temporarily unavailable. Retry ${attempt}/${MAX_RETRIES} in ${waitTime}ms...`
            );


            await new Promise(

                function (resolve) {

                    setTimeout(
                        resolve,
                        waitTime
                    );

                }

            );

        }

    }


    // ======================================
    // EXTRACT ANSWER
    // ======================================

    const answer =
        response?.text ||
        "";


    // ======================================
    // CREATE CITATIONS
    // ======================================

    const sources =
        createCitations(
            chunks
        );


    console.log("");

    console.log(
        "========================================"
    );

    console.log(
        "RAG ANSWER GENERATED"
    );

    console.log(
        "Sources:",
        sources.length
    );

    console.log(
        "========================================"
    );

    console.log("");


    return {

        query,

        documentId,

        answer:
            answer.trim(),

        sources

    };

}


// ==========================================
// EXPORT
// ==========================================

module.exports = {

    generateRAGAnswer

};