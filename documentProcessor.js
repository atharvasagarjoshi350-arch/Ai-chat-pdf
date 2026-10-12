const fs = require("fs");
const path = require("path");

/**
 * PHASE 3A
 * Safe Document Processor
 *
 * IMPORTANT:
 * This processor does NOT remove meaningful content.
 *
 * Raw extracted PDF text remains the source of truth.
 * We only make a processing copy with very limited
 * non-destructive normalization.
 */

/**
 * Create processed directory if it doesn't exist
 */
function ensureProcessedDirectory() {
  const processedDir = path.join(__dirname, "processed");

  if (!fs.existsSync(processedDir)) {
    fs.mkdirSync(processedDir, { recursive: true });
  }

  return processedDir;
}

/**
 * Create a SAFE processing copy of extracted pages.
 *
 * We intentionally preserve:
 * - headings
 * - paragraphs
 * - numbers
 * - dates
 * - currency
 * - section numbers
 * - tables
 * - formulas
 * - page boundaries
 * - line breaks
 * - repeated headers/footers
 *
 * The only operation currently performed is trimming
 * whitespace from the beginning/end of each page.
 */
function createProcessingCopy(extractedData) {
  if (!extractedData || !Array.isArray(extractedData.pages)) {
    throw new Error("Invalid extracted PDF data.");
  }

  const processedPages = extractedData.pages.map((page) => {
    const originalText = typeof page.text === "string"
      ? page.text
      : "";

    // VERY conservative processing.
    // No content removal.
    const processedText = originalText.trim();

    return {
    pageNumber: page.pageNumber,

    text: processedText,

    // Preserve PDF layout information
    // for Phase 3B and future processing.

    textItems:
        page.textItems || [],

    lines:
        page.lines || [],

    originalCharacterCount:
        originalText.length,

    processedCharacterCount:
        processedText.length
};
  });

  return {
    totalPages: extractedData.totalPages,
    pages: processedPages
  };
}

/**
 * Generate basic document statistics.
 *
 * This does NOT modify the document.
 * It only analyzes it.
 */
function analyzeDocument(processedData) {
  const pages = processedData.pages;

  const pageStats = pages.map((page) => {
    const text = page.text || "";

    const characters = text.length;

    const words = text
      .split(/\s+/)
      .filter(Boolean).length;

    const lines = text
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0);

    return {
      pageNumber: page.pageNumber,
      characters,
      words,
      lines: lines.length,
      empty: text.trim().length === 0
    };
  });

  const totalCharacters = pageStats.reduce(
    (sum, page) => sum + page.characters,
    0
  );

  const totalWords = pageStats.reduce(
    (sum, page) => sum + page.words,
    0
  );

  const emptyPages = pageStats.filter(
    (page) => page.empty
  ).length;

  return {
    totalPages: pages.length,
    totalCharacters,
    totalWords,
    emptyPages,
    pages: pageStats
  };
}

/**
 * Save processed document as JSON.
 */
function saveProcessedDocument(filename, processedData, analysis) {
  const processedDir = ensureProcessedDirectory();

  const baseName = path.basename(
    filename,
    path.extname(filename)
  );

  const safeName = baseName
    .replace(/[^a-zA-Z0-9-_]/g, "_");

  const outputPath = path.join(
    processedDir,
    `${safeName}.json`
  );

  const outputData = {
    document: {
      originalFilename: filename,
      processedAt: new Date().toISOString()
    },

    // The actual processed pages
    data: processedData,

    // Analysis only — does not alter the text
    analysis
  };

  fs.writeFileSync(
    outputPath,
    JSON.stringify(outputData, null, 2),
    "utf8"
  );

  return outputPath;
}

/**
 * Main Phase 3A processor.
 */
function processDocument(filename, extractedData) {
  console.log("\n================================");
  console.log("PHASE 3A - SAFE DOCUMENT PROCESSOR");
  console.log("================================");

  console.log(`Document: ${filename}`);

  // Step 1
  console.log("\nCreating safe processing copy...");

  const processedData = createProcessingCopy(
    extractedData
  );

  console.log(
    `Pages copied: ${processedData.pages.length}`
  );

  // Step 2
  console.log("\nAnalyzing document structure...");

  const analysis = analyzeDocument(
    processedData
  );

  console.log(
    `Total pages: ${analysis.totalPages}`
  );

  console.log(
    `Total characters: ${analysis.totalCharacters}`
  );

  console.log(
    `Total words: ${analysis.totalWords}`
  );

  console.log(
    `Empty pages: ${analysis.emptyPages}`
  );

  // Step 3
  console.log("\nSaving processed document...");

  const outputPath = saveProcessedDocument(
    filename,
    processedData,
    analysis
  );

  console.log(`Saved: ${outputPath}`);

  console.log("\nPHASE 3A COMPLETE");

  return {
    processedData,
    analysis,
    outputPath
  };
}

module.exports = {
  processDocument,
  createProcessingCopy,
  analyzeDocument,
  saveProcessedDocument
};