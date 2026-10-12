const fs = require("fs");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");

const EMBEDDINGS_DIR = path.join(
    __dirname,
    "processed",
    "embeddings"
);

if (!fs.existsSync(EMBEDDINGS_DIR)) {
    fs.mkdirSync(EMBEDDINGS_DIR, {
        recursive: true
    });
}


// ==========================================
// GOOGLE AI CLIENT
// ==========================================

function getAIClient() {

    if (!process.env.GEMINI_API_KEY) {
        throw new Error(
            "GEMINI_API_KEY is missing from .env"
        );
    }

    return new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY
    });
}


// ==========================================
// GENERATE ONE DOCUMENT EMBEDDING
// ==========================================

async function generateEmbedding(text, title = "") {

    if (!text || !text.trim()) {
        throw new Error(
            "Cannot generate embedding for empty text."
        );
    }

    const ai = getAIClient();

    const response =
        await ai.models.embedContent({

            model: "gemini-embedding-001",

            contents: text,

            config: {

                taskType:
                    "RETRIEVAL_DOCUMENT",

                outputDimensionality:
                    768,

                title:
                    title || undefined
            }
        });


    if (
        !response.embeddings ||
        !response.embeddings[0] ||
        !response.embeddings[0].values
    ) {

        throw new Error(
            "Gemini returned an invalid embedding response."
        );
    }


    return response.embeddings[0].values;
}


// ==========================================
// GENERATE EMBEDDINGS FOR ALL CHUNKS
// ==========================================

async function generateChunkEmbeddings(
    documentId,
    chunks
) {

    if (
        !Array.isArray(chunks) ||
        chunks.length === 0
    ) {

        throw new Error(
            "No chunks available for embedding."
        );
    }


    console.log("");

    console.log(
        `Generating embeddings for ${chunks.length} chunks...`
    );


    const embeddedChunks = [];


    for (
        let i = 0;
        i < chunks.length;
        i++
    ) {

        const chunk = chunks[i];


        console.log(
            `Embedding chunk ${i + 1}/${chunks.length} - ${chunk.chunkId}`
        );


        const vector =
            await generateEmbedding(
                chunk.text,
                chunk.section || ""
            );


        embeddedChunks.push({

            documentId,

            chunkId:
                chunk.chunkId,

            pageStart:
                chunk.pageStart,

            pageEnd:
                chunk.pageEnd,

            section:
                chunk.section,

            text:
                chunk.text,

            wordCount:
                chunk.wordCount,

            embedding:
                vector,

            embeddingDimensions:
                vector.length

        });
    }


    return {

        documentId,

        totalChunks:
            embeddedChunks.length,

        embeddingModel:
            "gemini-embedding-001",

        embeddingDimensions:
            embeddedChunks[0]
                .embedding.length,

        chunks:
            embeddedChunks
    };
}


// ==========================================
// SAVE EMBEDDINGS
// ==========================================

function saveEmbeddings(
    documentName,
    embeddingResult
) {

    const safeName =
        documentName
            .replace(/\.pdf$/i, "")
            .replace(/[^a-z0-9_-]/gi, "_")
            .replace(/_+/g, "_")
            .toLowerCase();


    const outputPath =
        path.join(
            EMBEDDINGS_DIR,
            `${safeName}_embeddings.json`
        );


    fs.writeFileSync(

        outputPath,

        JSON.stringify(
            embeddingResult,
            null,
            2
        ),

        "utf8"
    );


    console.log("");

    console.log(
        "Embeddings saved to:",
        outputPath
    );


    return outputPath;
}


module.exports = {

    generateEmbedding,

    generateChunkEmbeddings,

    saveEmbeddings

};