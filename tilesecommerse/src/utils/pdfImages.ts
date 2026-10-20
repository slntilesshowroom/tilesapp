// Renders PDF pages to compressed JPEG images, client-side — the fallback
// path for PDFs with no extractable text layer (scans, or pages where all
// text was flattened into images). These get sent to Gemini as inline image
// parts so its vision can read them directly, instead of a text prompt.
//
// Images are far bigger than text, so this keeps resolution/quality modest
// and chunks aggressively (by estimated byte size, not page count) to stay
// well under the backend's request-size limit.

import { loadPdfjs } from "./pdfText";

export interface PdfPageImage {
  pageNumber: number;
  dataUrl: string; // data:image/jpeg;base64,...
}

export interface PdfImageChunk {
  images: PdfPageImage[];
  pageRangeLabel: string;
}

const RENDER_SCALE = 1.4;
const JPEG_QUALITY = 0.6;

export async function renderPdfPagesToImages(
  file: File,
  onProgress?: (pageNumber: number, totalPages: number) => void
): Promise<PdfPageImage[]> {
  const pdfjsLib = await loadPdfjs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported in this browser.");

  const images: PdfPageImage[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: RENDER_SCALE });
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport }).promise;
    const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    images.push({ pageNumber, dataUrl });
    onProgress?.(pageNumber, pdf.numPages);
  }

  return images;
}

// Rough byte size of a data URL's base64 payload.
function estimateDataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.split(",")[1] || "";
  return Math.floor((base64.length * 3) / 4);
}

// Groups page images into small chunks bounded by an estimated byte budget,
// so each request to the backend stays comfortably under its body-size
// limit regardless of how image-heavy individual pages are.
export function chunkImagesByByteBudget(
  images: PdfPageImage[],
  byteBudget = 900_000,
  maxPagesPerChunk = 3
): PdfImageChunk[] {
  const chunks: PdfImageChunk[] = [];
  let current: PdfPageImage[] = [];
  let currentBytes = 0;

  const flush = () => {
    if (current.length === 0) return;
    const first = current[0].pageNumber;
    const last = current[current.length - 1].pageNumber;
    const label = first === last ? `page ${first}` : `pages ${first}-${last}`;
    chunks.push({ images: current, pageRangeLabel: label });
    current = [];
    currentBytes = 0;
  };

  for (const image of images) {
    const size = estimateDataUrlBytes(image.dataUrl);
    if (current.length > 0 && (currentBytes + size > byteBudget || current.length >= maxPagesPerChunk)) {
      flush();
    }
    current.push(image);
    currentBytes += size;
  }
  flush();

  return chunks;
}
