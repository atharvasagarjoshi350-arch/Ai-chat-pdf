require("dotenv").config();

const {
    GoogleGenAI
} = require("@google/genai");

const {
    ChromaClient
} = require("chromadb");


// ==========================================
// CONFIGURATION
// ==========================================

const GEMINI_API_KEY =
    process.env.GEMINI_API_KEY;

const CHROMA_HOST =
    process.env.CHROMA_HOST ||
    "localhost";

const CHROMA_PORT =
    Number(
        process.env.CHROMA_PORT ||
        8000
    );

const COLLECTION_NAME =
    process.env.CHROMA_COLLECTION ||
    "ai_pdf_documents_v2";

const EMBEDDING_MODEL =
    "gemini-embedding-001";


// ==========================================
// GEMINI
// ==========================================

const ai =
    new GoogleGenAI({

        apiKey:
            GEMINI_API_KEY

    });


// ==========================================
// CHROMA
// ==========================================

const chromaClient =
    new ChromaClient({

        host:
            CHROMA_HOST,

        port:
            CHROMA_PORT

    });


// ==========================================
// GET COLLECTION
// ==========================================

async function getCollection() {

    return await chromaClient.getCollection({

        name:
            COLLECTION_NAME,

        embeddingFunction:
            null

    });

}


// ==========================================
// CREATE QUERY EMBEDDING
// ==========================================

async function createQueryEmbedding(
    query
) {

    if (!GEMINI_API_KEY) {

        throw new Error(
            "GEMINI_API_KEY is missing in .env"
        );

    }


    const result =
        await ai.models.embedContent({

            model:
                EMBEDDING_MODEL,

            contents:
                query,

            config: {

                taskType:
                    "RETRIEVAL_QUERY",

                outputDimensionality:
                    768

            }

        });


    if (
        !result ||
        !result.embeddings ||
        !result.embeddings.length
    ) {

        throw new Error(
            "Gemini returned no query embedding."
        );

    }


    return result
        .embeddings[0]
        .values;

}


// ==========================================
// RETRIEVE RELEVANT CHUNKS
// ==========================================

async function retrieveRelevantChunks(

    query,

    options = {}

) {

    if (
        !query ||
        !query.trim()
    ) {

        throw new Error(
            "Query is required."
        );

    }


    const topK =
        Math.max(
            1,
            Math.min(
                Number(
                    options.topK || 5
                ),
                20
            )
        );


    const documentId =
        options.documentId ||
        null;


    console.log("");

    console.log(
        "========================================"
    );

    console.log(
        "SEMANTIC RETRIEVAL"
    );

    console.log(
        "========================================"
    );

    console.log(
        "Query:",
        query
    );

    console.log(
        "Document ID:",
        documentId ||
        "ALL DOCUMENTS"
    );

    console.log(
        "Top K:",
        topK
    );

    console.log(
        "========================================"
    );


    // ======================================
    // CREATE QUERY EMBEDDING
    // ======================================

    const queryEmbedding =
        await createQueryEmbedding(
            query
        );


    // ======================================
    // GET CHROMA COLLECTION
    // ======================================

    const collection =
        await getCollection();


    // ======================================
    // BUILD QUERY OPTIONS
    // ======================================

    const queryOptions = {

        queryEmbeddings: [
            queryEmbedding
        ],

        nResults:
            topK,

        include: [

            "documents",

            "metadatas",

            "distances"

        ]

    };


    // ======================================
    // DOCUMENT FILTER
    // ======================================

    if (documentId) {

        queryOptions.where = {

            documentId:
                documentId

        };

    }


    console.log(
        "Chroma filter:",
        queryOptions.where ||
        "NONE"
    );


    // ======================================
    // QUERY CHROMA
    // ======================================

    const results =
        await collection.query(
            queryOptions
        );


    const documents =
        results.documents?.[0] ||
        [];

    const metadatas =
        results.metadatas?.[0] ||
        [];

    const distances =
        results.distances?.[0] ||
        [];


    // ======================================
    // FORMAT RESULTS
    // ======================================

    const chunks =
        documents.map(

            function (
                text,
                index
            ) {

                const metadata =
                    metadatas[index] ||
                    {};

                return {

                    chunkId:
                        metadata.chunkId ||
                        null,

                    documentId:
                        metadata.documentId ||
                        documentId ||
                        null,

                    pageStart:
                        metadata.pageStart ??
                        null,

                    pageEnd:
                        metadata.pageEnd ??
                        null,

                    section:
                        metadata.section ||
                        "",

                    wordCount:
                        metadata.wordCount ??
                        null,

                    distance:
                        distances[index] ??
                        null,

                    text:
                        text || ""

                };

            }

        );


    console.log(
        "Retrieved chunks:",
        chunks.length
    );


    if (chunks.length) {

        console.log(
            "Top result:",
            chunks[0].chunkId,
            "Distance:",
            chunks[0].distance
        );

    }


    console.log(
        "========================================"
    );

    console.log("");


    return {

        query,

        documentId,

        topK,

        chunks

    };

}


// ==========================================
// EXPORT
// ==========================================

module.exports = {

    retrieveRelevantChunks

};