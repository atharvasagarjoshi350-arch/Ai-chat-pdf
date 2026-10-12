/**
 * Phase 3H
 * Citation Engine
 *
 * IMPORTANT:
 * Page numbers come only from retrieved chunk metadata.
 * The LLM never creates or guesses page numbers.
 */

function createCitation(chunk) {
    if (!chunk) return null;

    const pageStart = chunk.pageStart ?? null;
    const pageEnd = chunk.pageEnd ?? null;

    let pageLabel = "Page unavailable";

    if (pageStart !== null && pageEnd !== null) {
        if (pageStart === pageEnd) {
            pageLabel = `Page ${pageStart}`;
        } else {
            pageLabel = `Pages ${pageStart}–${pageEnd}`;
        }
    }

    return {
        chunkId: chunk.chunkId || null,
        documentId: chunk.documentId || null,
        pageStart,
        pageEnd,
        pageLabel,
        section: chunk.section || "",
        distance: chunk.distance ?? null
    };
}

function createCitations(chunks) {
    if (!Array.isArray(chunks)) return [];

    return chunks
        .map(createCitation)
        .filter(Boolean);
}

/**
 * Convert citation metadata into the UI citation text.
 */
function formatCitation(citation) {
    if (!citation) return "";

    return `📄 ${citation.pageLabel}`;
}

/**
 * Create a lookup map:
 *
 * chunk_0011 -> 📄 Page 4
 * chunk_0012 -> 📄 Page 5
 */
function createCitationMap(chunks) {
    const map = {};

    if (!Array.isArray(chunks)) {
        return map;
    }

    for (const chunk of chunks) {
        if (!chunk?.chunkId) continue;

        const citation = createCitation(chunk);

        if (citation) {
            map[chunk.chunkId] = citation;
        }
    }

    return map;
}

module.exports = {
    createCitation,
    createCitations,
    formatCitation,
    createCitationMap
};