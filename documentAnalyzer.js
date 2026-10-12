const fs = require("fs");
const path = require("path");


// ==========================================
// PHASE 3B
// IMPROVED DOCUMENT STRUCTURE ANALYZER
// ==========================================
//
// IMPORTANT:
//
// This module does NOT delete or rewrite
// document content.
//
// It analyzes the extracted text and tries
// to understand its structure.
//
// The original extracted Markdown remains
// the source of truth.
// ==========================================



// ==========================================
// BASIC TEXT HELPERS
// ==========================================

function countWords(text) {

    return (text || "")
        .split(/\s+/)
        .filter(Boolean)
        .length;

}


function isLikelyListItem(line) {

    return (
        /^[-•*]\s+/.test(line) ||
        /^\d+[.)]\s+/.test(line) ||
        /^[a-zA-Z][.)]\s+/.test(line)
    );

}


function looksLikeHeading(line) {

    const text = line.trim();

    if (!text) {
        return false;
    }


    const words = text
        .split(/\s+/)
        .filter(Boolean);


    // Too long to normally be a heading
    if (text.length > 150) {
        return false;
    }


    if (words.length > 18) {
        return false;
    }


    // Very short lines are often headings
    if (words.length <= 10) {

        if (
            text.endsWith(":") ||
            /^[A-Z0-9][A-Za-z0-9\s&(),.'/-]*$/.test(text)
        ) {

            return true;

        }

    }


    return false;

}


// ==========================================
// DETECT PARAGRAPHS
// ==========================================

function detectParagraphs(lines) {

    const paragraphs = [];

    let currentParagraph = [];


    function flushParagraph() {

        if (currentParagraph.length === 0) {
            return;
        }


        const text =
            currentParagraph.join(" ").trim();


        if (text) {

            paragraphs.push({

                text: text,

                lines:
                    currentParagraph.length

            });

        }


        currentParagraph = [];

    }


    for (const line of lines) {

        const trimmed =
            line.trim();


        if (!trimmed) {

            flushParagraph();

            continue;

        }


        // A likely heading starts a new block
        if (
            looksLikeHeading(trimmed) &&
            currentParagraph.length > 0
        ) {

            flushParagraph();

        }


        currentParagraph.push(trimmed);


        // Lists should normally be their own block
        if (isLikelyListItem(trimmed)) {

            flushParagraph();

        }

    }


    flushParagraph();


    return paragraphs;

}



// ==========================================
// DETECT POSSIBLE TABLES
// ==========================================

function detectPossibleTables(lines) {

    const candidates = [];


    for (const line of lines) {

        const trimmed =
            line.trim();


        if (!trimmed) {
            continue;
        }


        const tabCount =
            (trimmed.match(/\t/g) || []).length;


        const pipeCount =
            (trimmed.match(/\|/g) || []).length;


        const largeSpaceGroups =
            (trimmed.match(/\s{3,}/g) || []).length;


        // We only mark as a candidate.
        // We do NOT claim it is definitely a table.

        if (
            tabCount >= 1 ||
            pipeCount >= 2 ||
            largeSpaceGroups >= 2
        ) {

            candidates.push({

                text: trimmed,

                reasons: {

                    tabs:
                        tabCount,

                    pipes:
                        pipeCount,

                    largeSpaceGroups:
                        largeSpaceGroups

                }

            });

        }

    }


    return candidates;

}



// ==========================================
// DETECT LISTS
// ==========================================

function detectLists(lines) {

    return lines
        .filter(line => isLikelyListItem(line.trim()))
        .map(line => line.trim());

}



// ==========================================
// HEADING ANALYSIS
// ==========================================

function detectHeadings(lines) {

    const headings = [];


    for (
        let index = 0;
        index < lines.length;
        index++
    ) {

        const line =
            lines[index].trim();


        if (
            looksLikeHeading(line) &&
            !isLikelyListItem(line)
        ) {

            headings.push({

                text: line,

                lineIndex: index,

                wordCount:
                    countWords(line),

                length:
                    line.length

            });

        }

    }


    return headings;

}



// ==========================================
// PAGE STRUCTURE
// ==========================================

function analyzePage(page) {

    const text =
        page.text || "";


    // --------------------------------------
    // IMPORTANT
    // --------------------------------------
    //
    // Current PDF extraction may provide
    // one long line per page.
    //
    // We preserve that line rather than
    // deleting or changing its content.
    //

    const rawLines =
        text
            .split(/\r?\n/);


    const nonEmptyLines =
        rawLines
            .map(line => line.trim())
            .filter(Boolean);


    const headings =
        detectHeadings(
            nonEmptyLines
        );


    const lists =
        detectLists(
            nonEmptyLines
        );


    const tables =
        detectPossibleTables(
            nonEmptyLines
        );


    const paragraphs =
        detectParagraphs(
            nonEmptyLines
        );


    let pageType = "text";


    if (
        nonEmptyLines.length === 0
    ) {

        pageType = "empty";

    }

    else if (
        tables.length >= 3
    ) {

        pageType = "possible-table";

    }

    else if (
        lists.length >= 3
    ) {

        pageType = "possible-list";

    }

    else if (
        headings.length >= 1
    ) {

        pageType = "text-with-heading";

    }


    const lineLengths =
        nonEmptyLines
            .map(line => line.length);


    const averageLineLength =
        lineLengths.length > 0

            ? Math.round(
                lineLengths.reduce(
                    (sum, value) =>
                        sum + value,
                    0
                ) /
                lineLengths.length
            )

            : 0;


    return {

        pageNumber:
            page.pageNumber,

        characters:
            text.length,

        words:
            countWords(text),

        rawLineCount:
            rawLines.length,

        nonEmptyLineCount:
            nonEmptyLines.length,

        pageType:
            pageType,

        firstLines:
            nonEmptyLines.slice(0, 10),

        lastLines:
            nonEmptyLines.slice(-10),

        headings:
            headings,

        lists:
            lists,

        possibleTables:
            tables,

        paragraphs:
            paragraphs,

        lineStatistics: {

            shortest:
                lineLengths.length
                    ? Math.min(...lineLengths)
                    : 0,

            longest:
                lineLengths.length
                    ? Math.max(...lineLengths)
                    : 0,

            average:
                averageLineLength

        }

    };

}



// ==========================================
// REPEATED CONTENT DETECTION
// ==========================================
//
// We look for repeated text across pages.
//
// This is useful for finding possible:
//
// - headers
// - footers
// - page titles
// - watermarks
//
// NOTHING is removed.
// ==========================================

function findRepeatedContent(pages) {

    const lineMap =
        new Map();


    for (const page of pages) {

        const lines =
            (page.text || "")
                .split(/\r?\n/)
                .map(line => line.trim())
                .filter(Boolean);


        for (const line of lines) {

            if (line.length < 5) {
                continue;
            }


            if (!lineMap.has(line)) {

                lineMap.set(
                    line,
                    []
                );

            }


            lineMap
                .get(line)
                .push(
                    page.pageNumber
                );

        }

    }


    const repeated =
        [];


    for (
        const [text, pageNumbers]
        of lineMap.entries()
    ) {

        if (
            pageNumbers.length >= 2
        ) {

            repeated.push({

                text,

                occurrences:
                    pageNumbers.length,

                pages:
                    pageNumbers

            });

        }

    }


    repeated.sort(
        (a, b) =>
            b.occurrences -
            a.occurrences
    );


    return repeated;

}



// ==========================================
// DOCUMENT STRUCTURE ANALYSIS
// ==========================================

function analyzeDocumentStructure(
    extractedData
) {

    if (
        !extractedData ||
        !Array.isArray(
            extractedData.pages
        )
    ) {

        throw new Error(
            "Invalid extracted document data."
        );

    }


    console.log("");
    console.log("========================================");
    console.log(
        "PHASE 3B - IMPROVED STRUCTURE ANALYSIS"
    );
    console.log("========================================");


    console.log(
        "Pages:",
        extractedData.pages.length
    );


    // --------------------------------------
    // Analyze pages
    // --------------------------------------

    const pages =
        extractedData.pages.map(
            page => {

                console.log(
                    `Analyzing page ${page.pageNumber}/${extractedData.pages.length}`
                );


                return analyzePage(page);

            }
        );


    // --------------------------------------
    // Repeated content
    // --------------------------------------

    console.log("");
    console.log(
        "Detecting repeated content..."
    );


    const repeatedContent =
        findRepeatedContent(
            extractedData.pages
        );


    // --------------------------------------
    // Overall statistics
    // --------------------------------------

    const totalCharacters =
        pages.reduce(
            (sum, page) =>
                sum + page.characters,
            0
        );


    const totalWords =
        pages.reduce(
            (sum, page) =>
                sum + page.words,
            0
        );


    const totalParagraphs =
        pages.reduce(
            (sum, page) =>
                sum + page.paragraphs.length,
            0
        );


    const totalHeadings =
        pages.reduce(
            (sum, page) =>
                sum + page.headings.length,
            0
        );


    const totalLists =
        pages.reduce(
            (sum, page) =>
                sum + page.lists.length,
            0
        );


    const totalPossibleTables =
        pages.reduce(
            (sum, page) =>
                sum +
                page.possibleTables.length,
            0
        );


    const pageTypes = {};


    for (const page of pages) {

        pageTypes[page.pageType] =
            (pageTypes[page.pageType] || 0) + 1;

    }


    // --------------------------------------
    // Final report
    // --------------------------------------

    const report = {

        analysisVersion:
            "3B.2",

        analyzedAt:
            new Date().toISOString(),

        totalPages:
            extractedData.pages.length,

        totalCharacters:
            totalCharacters,

        totalWords:
            totalWords,

        structureSummary: {

            paragraphs:
                totalParagraphs,

            possibleHeadings:
                totalHeadings,

            possibleLists:
                totalLists,

            possibleTableLines:
                totalPossibleTables

        },

        pageTypes:
            pageTypes,

        repeatedContent:
            repeatedContent,

        pages:
            pages

    };


    console.log("");
    console.log("========================================");
    console.log(
        "PHASE 3B ANALYSIS COMPLETE"
    );
    console.log("========================================");

    console.log(
        "Pages:",
        report.totalPages
    );

    console.log(
        "Characters:",
        report.totalCharacters
    );

    console.log(
        "Words:",
        report.totalWords
    );

    console.log(
        "Possible headings:",
        totalHeadings
    );

    console.log(
        "Possible paragraphs:",
        totalParagraphs
    );

    console.log(
        "Possible lists:",
        totalLists
    );

    console.log(
        "Possible table lines:",
        totalPossibleTables
    );

    console.log(
        "Repeated content:",
        repeatedContent.length
    );

    console.log(
        "Page types:",
        report.pageTypes
    );

    console.log("========================================");
    console.log("");


    return report;

}



// ==========================================
// SAVE STRUCTURE REPORT
// ==========================================

function saveStructureReport(
    originalFilename,
    report
) {

    const processedFolder =
        path.join(
            __dirname,
            "processed"
        );


    if (
        !fs.existsSync(
            processedFolder
        )
    ) {

        fs.mkdirSync(
            processedFolder,
            {
                recursive: true
            }
        );

    }


    const baseName =
        path.basename(
            originalFilename,
            path.extname(originalFilename)
        );


    const safeName =
        baseName
            .replace(
                /[^a-zA-Z0-9-_]/g,
                "_"
            );


    const outputPath =
        path.join(
            processedFolder,
            `${safeName}_structure.json`
        );


    fs.writeFileSync(

        outputPath,

        JSON.stringify(
            report,
            null,
            2
        ),

        "utf8"

    );


    console.log(
        "Structure report saved:",
        outputPath
    );


    return outputPath;

}



// ==========================================
// EXPORTS
// ==========================================

module.exports = {

    analyzeDocumentStructure,

    saveStructureReport

};