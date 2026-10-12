const { ChromaClient } = require("chromadb");


// ==========================================
// CONFIGURATION
// ==========================================

const CHROMA_HOST =
    process.env.CHROMA_HOST || "localhost";

const CHROMA_PORT =
    process.env.CHROMA_PORT || "8000";

const COLLECTION_NAME =
    process.env.CHROMA_COLLECTION || "ai_pdf_documents_v2";


// ==========================================
// CHROMA CLIENT
// ==========================================

const client =
    new ChromaClient({
        host: CHROMA_HOST,
        port: Number(CHROMA_PORT)
    });


// ==========================================
// GET COLLECTION
// ==========================================

async function getCollection() {

    const collection = await client.getOrCreateCollection({
    name: COLLECTION_NAME,
    metadata: {
        description: "AI PDF Reader document chunks"
    },
    embeddingFunction: null
});

    return collection;
}


// ==========================================
// TEST CONNECTION
// ==========================================

async function testChromaConnection() {

    const collection =
        await getCollection();

    const count =
        await collection.count();

    console.log("");
    console.log("========================================");
    console.log("CHROMADB CONNECTION SUCCESSFUL");
    console.log("========================================");
    console.log("Collection:", COLLECTION_NAME);
    console.log("Existing records:", count);
    console.log("========================================");
    console.log("");

    return {
        collection: COLLECTION_NAME,
        count
    };
}


// ==========================================
// STORE EMBEDDINGS
// ==========================================

async function storeEmbeddings(
    embeddingResult
) {

    if (
        !embeddingResult ||
        !Array.isArray(
            embeddingResult.chunks
        )
    ) {

        throw new Error(
            "Invalid embedding result."
        );
    }


    const collection =
        await getCollection();


    const ids = [];
    const embeddings = [];
    const documents = [];
    const metadatas = [];


    for (
        const chunk
        of embeddingResult.chunks
    ) {

        ids.push(
            `${chunk.documentId}_${chunk.chunkId}`
        );


        embeddings.push(
            chunk.embedding
        );


        documents.push(
            chunk.text
        );


        metadatas.push({

            documentId:
                chunk.documentId,

            chunkId:
                chunk.chunkId,

            pageStart:
                chunk.pageStart,

            pageEnd:
                chunk.pageEnd,

            section:
                chunk.section || "",

            wordCount:
                chunk.wordCount || 0

        });
    }


    await collection.upsert({

        ids,

        embeddings,

        documents,

        metadatas

    });


    const totalRecords =
        await collection.count();


    console.log("");
    console.log("========================================");
    console.log("CHROMADB STORAGE COMPLETE");
    console.log("========================================");
    console.log("Vectors inserted:", ids.length);
    console.log("Collection:", COLLECTION_NAME);
    console.log("Total records:", totalRecords);
    console.log("========================================");
    console.log("");


    return {

        inserted:
            ids.length,

        total:
            totalRecords

    };
}


module.exports = {

    getCollection,

    testChromaConnection,

    storeEmbeddings,

    COLLECTION_NAME

};