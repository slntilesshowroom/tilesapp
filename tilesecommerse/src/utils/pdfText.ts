// Client-side PDF text extraction for the "Upload from PDF" bulk product
// import feature. Text is pulled out in the browser (not sent as a raw file)
// so large catalog PDFs (which can be 10MB+ due to embedded images) never
// hit the backend's serverless request-size limit — only the much smaller
// extracted text is sent over the network.
//
// Rows are reconstructed from each text item's actual (x, y) position on the
// page rather than the order items appear in the PDF's content stream.
// Some PDF generators (Tally invoices, in particular) write table content
// column-by-column internally — reading items in stream order interleaves
// unrelated columns and scrambles names away from their prices. Grouping by
// y-coordinate (row) and sorting by x-coordinate (left-to-right) within each
// row reconstructs the table the way it actually looks on the page.

export interface PdfPageText {
  pageNumber: number;
  text: string;
}

export interface PdfTextChunk {
  text: string;
  pageRangeLabel: string;
}

export class EmptyPdfTextError extends Error {
  constructor() {
    super(
      "No readable text was found in this PDF. It may be a scanned/image-only document. " +
      "Try the \"Paste JSON\" import instead, or use a text-based export of this catalog."
    );
    this.name = "EmptyPdfTextError";
  }
}

let workerConfigured = false;

// Exported so pdfImages.ts (page-to-image rendering, used for the AI-vision
// fallback on scanned/image-only PDFs) can reuse the same worker setup.
export async function loadPdfjs() {
  const pdfjsLib = await import("pdfjs-dist");
  if (!workerConfigured) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
    workerConfigured = true;
  }
  return pdfjsLib;
}

// Minimum total extracted characters below which we treat the PDF as
// effectively textless (scanned images, no text layer).
const MIN_MEANINGFUL_TEXT_LENGTH = 40;

interface PositionedItem {
  str: string;
  x: number;
  y: number;
}

// Groups text items into visual rows by y-coordinate, then orders each row
// left-to-right by x-coordinate — a lightweight version of poppler's
// `-layout` reconstruction, done with the coordinates pdf.js already gives us.
export function reconstructVisualLines(items: PositionedItem[], yTolerance = 3): string[] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: PositionedItem[][] = [];

  for (const item of sorted) {
    const currentRow = rows[rows.length - 1];
    if (currentRow && Math.abs(currentRow[0].y - item.y) <= yTolerance) {
      currentRow.push(item);
    } else {
      rows.push([item]);
    }
  }

  return rows
    .map(row =>
      row
        .sort((a, b) => a.x - b.x)
        .map(i => i.str)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(line => line.length > 0);
}

export async function extractPdfPageTexts(
  file: File,
  onProgress?: (pageNumber: number, totalPages: number) => void
): Promise<PdfPageText[]> {
  const pdfjsLib = await loadPdfjs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pages: PdfPageText[] = [];
  let totalLength = 0;

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();

    const items: PositionedItem[] = [];
    for (const item of content.items as Array<{ str?: string; transform?: number[] }>) {
      if (typeof item.str !== "string" || !item.str.trim()) continue;
      const transform = item.transform;
      items.push({
        str: item.str,
        x: Array.isArray(transform) ? transform[4] ?? 0 : 0,
        y: Array.isArray(transform) ? transform[5] ?? 0 : 0,
      });
    }

    const text = reconstructVisualLines(items).join("\n");
    pages.push({ pageNumber, text });
    totalLength += text.length;
    onProgress?.(pageNumber, pdf.numPages);
  }

  if (totalLength < MIN_MEANINGFUL_TEXT_LENGTH) {
    throw new EmptyPdfTextError();
  }

  return pages;
}

// Groups extracted pages into chunks bounded by a character budget, so each
// chunk stays a fast, cheap single call to the extraction endpoint instead of
// one huge prompt (which risks slow/failed AI calls on large catalogs).
export function chunkPagesByCharBudget(
  pages: PdfPageText[],
  charBudget = 6000
): PdfTextChunk[] {
  const nonEmptyPages = pages.filter(p => p.text.length > 0);
  const chunks: PdfTextChunk[] = [];

  let current: PdfPageText[] = [];
  let currentLength = 0;

  const flush = () => {
    if (current.length === 0) return;
    const first = current[0].pageNumber;
    const last = current[current.length - 1].pageNumber;
    const label = first === last ? `page ${first}` : `pages ${first}-${last}`;
    const text = current
      .map(p => `--- Page ${p.pageNumber} ---\n${p.text}`)
      .join("\n\n");
    chunks.push({ text, pageRangeLabel: label });
    current = [];
    currentLength = 0;
  };

  for (const page of nonEmptyPages) {
    if (current.length > 0 && currentLength + page.text.length > charBudget) {
      flush();
    }
    current.push(page);
    currentLength += page.text.length;
  }
  flush();

  return chunks;
}
