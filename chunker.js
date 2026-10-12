const fs = require("fs");
const path = require("path");

const PROCESSED_DIR = path.join(__dirname, "processed");
const CHUNKS_DIR = path.join(__dirname, "processed", "chunks");

if (!fs.existsSync(CHUNKS_DIR)) {
    fs.mkdirSync(CHUNKS_DIR, { recursive: true });
}


// --------------------------------------------------
// Helpers
// --------------------------------------------------

function safeFileName(name) {
    return name
        .replace(/\.pdf$/i, "")
        .replace(/[^a-z0-9_-]/gi, "_")
        .replace(/_+/g, "_")
        .toLowerCase();
}


function countWords(text) {
    if (!text || !text.trim()) return 0;

    return text
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .length;
}


function splitIntoSentences(text) {
    if (!text) return [];

    return text
        .split(/(?<=[.!?])\s+/)
        .map(sentence => sentence.trim())
        .filter(Boolean);
}


// --------------------------------------------------
// Build paragraph-like blocks from page text
// --------------------------------------------------

function buildTextBlocks(pageText) {

    const lines = pageText
        .split("\n")
        .map(line => line.trim())
        .filter(Boolean);

    const blocks = [];

    let currentBlock = [];

    for (const line of lines) {

        // Possible heading
        const isHeading =
            line.length < 100 &&
            (
                line.endsWith(":") ||
                /^[A-Z][A-Za-z\s]{2,70}$/.test(line)
            );

        if (isHeading) {

            if (currentBlock.length > 0) {
                blocks.push({
                    type: "paragraph",
                    text: currentBlock.join(" ")
                });

                currentBlock = [];
            }

            blocks.push({
                type: "heading",
                text: line
            });

            continue;
        }

        currentBlock.push(line);
    }


    if (currentBlock.length > 0) {
        blocks.push({
            type: "paragraph",
            text: currentBlock.join(" ")
        });
    }

    return blocks;
}


// --------------------------------------------------
// Split large text while preserving sentences
// --------------------------------------------------

function splitLargeText(text, maxWords = 250) {

    const sentences = splitIntoSentences(text);

    const chunks = [];

    let current = [];
    let currentWords = 0;

    for (const sentence of sentences) {

        const sentenceWords = countWords(sentence);

        if (
            currentWords + sentenceWords > maxWords &&
            current.length > 0
        ) {
            chunks.push(current.join(" "));

            current = [];
            currentWords = 0;
        }

        current.push(sentence);
        currentWords += sentenceWords;
    }


    if (current.length > 0) {
        chunks.push(current.join(" "));
    }

    return chunks;
}


// --------------------------------------------------
// Add overlap
// --------------------------------------------------

function addOverlap(chunks, overlapWords = 40) {

    if (chunks.length <= 1) {
        return chunks;
    }

    const result = [];

    for (let i = 0; i < chunks.length; i++) {

        let text = chunks[i];

        if (i > 0) {

            const previousWords =
                chunks[i - 1]
                    .split(/\s+/)
                    .slice(-overlapWords)
                    .join(" ");

            text = previousWords + " " + text;
        }

        result.push(text.trim());
    }

    return result;
}


// --------------------------------------------------
// Main chunking function
// --------------------------------------------------

function chunkDocument(documentName, processedDocument) {

    const documentId = safeFileName(documentName);

    const chunks = [];

    let chunkCounter = 1;

    let currentText = [];
    let currentWords = 0;

    let currentPageStart = null;
    let currentPageEnd = null;
    let currentSection = null;


    function flushChunk() {

        if (currentText.length === 0) {
            return;
        }

        const text = currentText.join("\n").trim();

        if (!text) {
            return;
        }

        chunks.push({
            documentId,

            chunkId:
                `chunk_${String(chunkCounter).padStart(4, "0")}`,

            pageStart: currentPageStart,

            pageEnd: currentPageEnd,

            section: currentSection,

            text,

            wordCount: countWords(text)
        });

        chunkCounter++;

        currentText = [];
        currentWords = 0;
    }


    // ----------------------------------------------
    // Process pages
    // ----------------------------------------------

    for (const page of processedDocument.pages) {

        const pageNumber = page.pageNumber;

        const blocks =
            buildTextBlocks(page.text);


        for (const block of blocks) {

            // Heading
            if (block.type === "heading") {

                // Finish previous chunk
                flushChunk();

                currentSection = block.text;

                currentPageStart = pageNumber;
                currentPageEnd = pageNumber;

                currentText.push(block.text);

                continue;
            }


            // Paragraph
            const paragraphWords =
                countWords(block.text);


            if (
                currentWords + paragraphWords > 220 &&
                currentText.length > 0
            ) {
                flushChunk();

                currentPageStart = pageNumber;
                currentPageEnd = pageNumber;
            }


            if (currentPageStart === null) {
                currentPageStart = pageNumber;
            }

            currentPageEnd = pageNumber;

            currentText.push(block.text);

            currentWords += paragraphWords;
        }
    }


    flushChunk();


    // ----------------------------------------------
    // Add overlap
    // ----------------------------------------------

    const finalChunks =
        addOverlapToChunkObjects(chunks, 40);


    return {
        documentId,
        totalChunks: finalChunks.length,
        chunks: finalChunks
    };
}


// --------------------------------------------------
// Overlap for chunk objects
// --------------------------------------------------

function addOverlapToChunkObjects(chunks, overlapWords = 40) {

    if (chunks.length <= 1) {
        return chunks;
    }

    return chunks.map((chunk, index) => {

        if (index === 0) {
            return chunk;
        }

        const previous =
            chunks[index - 1].text
                .split(/\s+/)
                .slice(-overlapWords)
                .join(" ");


        return {
            ...chunk,

            text:
                previous +
                "\n" +
                chunk.text,

            wordCount:
                countWords(previous + " " + chunk.text)
        };
    });
}


// --------------------------------------------------
// Save chunks
// --------------------------------------------------

function saveChunks(documentName, result) {

    const fileName =
        safeFileName(documentName) + "_chunks.json";

    const outputPath =
        path.join(CHUNKS_DIR, fileName);

    fs.writeFileSync(
        outputPath,
        JSON.stringify(result, null, 2),
        "utf8"
    );

    return outputPath;
}


module.exports = {
    chunkDocument,
    saveChunks
};