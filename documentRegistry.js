const fs = require("fs");
const path = require("path");

const processedFolder = path.join(
    __dirname,
    "processed"
);

const registryPath = path.join(
    processedFolder,
    "documentRegistry.json"
);


// ==========================================
// CREATE PROCESSED FOLDER
// ==========================================

if (!fs.existsSync(processedFolder)) {

    fs.mkdirSync(
        processedFolder,
        {
            recursive: true
        }
    );

}


// ==========================================
// ENSURE REGISTRY EXISTS
// ==========================================

function ensureRegistry() {

    if (!fs.existsSync(registryPath)) {

        const initialRegistry = {

            version: "1.0",

            documents: []

        };

        fs.writeFileSync(

            registryPath,

            JSON.stringify(
                initialRegistry,
                null,
                2
            ),

            "utf8"

        );

    }

}


// ==========================================
// READ REGISTRY
// ==========================================

function readRegistry() {

    ensureRegistry();

    try {

        const raw = fs.readFileSync(
            registryPath,
            "utf8"
        );

        const registry =
            JSON.parse(raw);

        if (
            !registry ||
            !Array.isArray(
                registry.documents
            )
        ) {

            return {

                version: "1.0",

                documents: []

            };

        }

        return registry;

    }

    catch (error) {

        console.error(
            "Unable to read document registry:",
            error.message
        );

        return {

            version: "1.0",

            documents: []

        };

    }

}


// ==========================================
// WRITE REGISTRY
// ==========================================

function writeRegistry(registry) {

    fs.writeFileSync(

        registryPath,

        JSON.stringify(
            registry,
            null,
            2
        ),

        "utf8"

    );

}


// ==========================================
// REGISTER DOCUMENT
// ==========================================

function registerDocument(
    documentData
) {

    const registry =
        readRegistry();

    const now =
        new Date().toISOString();


    const existingIndex =
        registry.documents.findIndex(

            function (doc) {

                return (
                    doc.documentId ===
                    documentData.documentId
                );

            }

        );


    const document = {

        documentId:
            documentData.documentId,

        filename:
            documentData.filename ||
            documentData.originalFilename ||
            "Unknown document",

        storedFilename:
            documentData.storedFilename ||
            "",

        pages:
            Number(
                documentData.pages || 0
            ),

        words:
            Number(
                documentData.words || 0
            ),

        chunks:
            Number(
                documentData.chunks || 0
            ),

        vectors:
            Number(
                documentData.vectors || 0
            ),

        status:
            documentData.status ||
            "ready",

        createdAt:
            documentData.createdAt ||
            now,

        updatedAt:
            now

    };


    // ======================================
    // UPDATE EXISTING DOCUMENT
    // ======================================

    if (existingIndex >= 0) {

        registry.documents[
            existingIndex
        ] = {

            ...registry.documents[
                existingIndex
            ],

            ...document

        };

    }


    // ======================================
    // ADD NEW DOCUMENT
    // ======================================

    else {

        registry.documents.push(
            document
        );

    }


    writeRegistry(
        registry
    );


    console.log(
        "DOCUMENT REGISTERED:",
        document.documentId
    );


    return document;

}


// ==========================================
// GET ALL DOCUMENTS
// ==========================================

function getAllDocuments() {

    const registry =
        readRegistry();

    return registry.documents;

}


// ==========================================
// GET SINGLE DOCUMENT
// ==========================================

function getDocumentById(
    documentId
) {

    if (!documentId) {

        return null;

    }


    const registry =
        readRegistry();


    return registry.documents.find(

        function (doc) {

            return (
                doc.documentId ===
                documentId
            );

        }

    ) || null;

}


// ==========================================
// DELETE FROM REGISTRY
// ==========================================

function deleteDocumentFromRegistry(
    documentId
) {

    const registry =
        readRegistry();


    const originalLength =
        registry.documents.length;


    registry.documents =
        registry.documents.filter(

            function (doc) {

                return (
                    doc.documentId !==
                    documentId
                );

            }

        );


    if (
        registry.documents.length ===
        originalLength
    ) {

        return false;

    }


    writeRegistry(
        registry
    );


    console.log(
        "DOCUMENT REMOVED FROM REGISTRY:",
        documentId
    );


    return true;

}


// ==========================================
// EXPORT
// ==========================================

module.exports = {

    registerDocument,

    getAllDocuments,

    getDocumentById,

    deleteDocumentFromRegistry

};