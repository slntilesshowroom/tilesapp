// Pure, offline product extraction — no AI, no network call. Runs entirely
// in the browser against the position-reconstructed text from pdfText.ts.
//
// Two independent heuristics run over the same text, since admin PDFs come
// in two very different shapes:
//
// 1. Tabular pass — tuned to invoices/price lists: a "product row" is any
//    line containing a price-like number (₹1,234.56 or ₹999 style), with the
//    product name being whatever text precedes the first price/HSN/quantity
//    marker. Indented lines that follow a matched row but carry no price of
//    their own are treated as sub-item design names (e.g. "Pixipetals 4 Pcs")
//    and folded into that product's name/description, since no genuine
//    per-design price exists in that data.
//
// 2. Size-anchored pass — tuned to catalog/brochure pages with no price
//    table at all: a line containing a "WWWxHHH(mm/cm/in)" size token
//    anchors a product, and the nearest non-boilerplate lines above/below
//    it (skipping URLs, page numbers, addresses, etc.) supply the design
//    name and material/series context.
//
// Neither pass can read text that isn't actually in the PDF's text layer —
// scanned/image-only pages still need AI vision extraction instead.

import type { PdfPageText } from "./pdfText";

export interface ExtractedProductRaw {
  name?: string;
  description?: string;
  material?: string;
  size?: string;
  price?: number;
  stock?: number;
  unit?: string;
  specifications?: Array<{ title?: string; description?: string }>;
}

const CURRENCY_DECIMAL_RE = /\d{1,3}(?:,\d{2,3})*\.\d{1,2}\b/g;
const CURRENCY_SYMBOL_RE = /(?:₹|Rs\.?|INR)\s*([\d,]+(?:\.\d{1,2})?)/gi;
const HSN_RE = /\b\d{6,8}\b/;
const QTY_UNIT_RE = /(\d+(?:[-.]\d+)?)\s*[- ]?\s*(box(?:es)?|pcs?|pieces?|sq\.?\s?ft|sqft|nos?|units?|kgs?|bags?|ctns?|cartons?)\b/i;
const SUBITEM_RE = /^([^\d]{2,}?)\s+(\d+)\s*Pcs\b/i;
const SIZE_RE = /\b(\d{2,4})\s*[xX×]\s*(\d{2,4})\s*(mm|cm|in(?:ch(?:es)?)?)?\b/;
const BOILERPLATE_RE = /^(www\.|https?:\/\/|copyright|all rights reserved|page\s?\d+|subject to|continued|tel[:.]?|email|e-?mail|gstin|state name|invoice|corporate office|plant\b|phone|fax)/i;

function parseCurrency(raw: string): number {
  return Number(raw.replace(/,/g, ""));
}

function normalizeUnit(raw: string): string {
  const u = raw.toLowerCase().replace(/\s+/g, "");
  if (u.startsWith("box")) return "Box";
  if (u.startsWith("pc")) return "Pcs";
  if (u.startsWith("piece")) return "Pcs";
  if (u.startsWith("sq")) return "Sq.ft";
  if (u.startsWith("nos") || u === "no") return "Unit";
  if (u.startsWith("kg")) return "Kg";
  if (u.startsWith("bag")) return "Bag";
  if (u.startsWith("ctn") || u.startsWith("carton")) return "Cartoon";
  return raw;
}

// ── Pass 1: tabular (invoice / price-list) rows ─────────────────────────

interface MatchedRow {
  name: string;
  price: number;
  unit?: string;
  stock?: number;
  hsn?: string;
  qtyRaw?: string;
  amount?: number;
}

function tryParseProductRow(line: string): MatchedRow | null {
  let currencyMatches: RegExpMatchArray[] = Array.from(line.matchAll(CURRENCY_DECIMAL_RE));
  let usingSymbolPrice = false;

  if (currencyMatches.length === 0) {
    // Fall back to explicit currency-symbol prices (₹999, Rs. 1499, INR 2500)
    // for simpler price lists that don't use decimal-formatted amounts.
    const symbolMatches = Array.from(line.matchAll(CURRENCY_SYMBOL_RE));
    if (symbolMatches.length === 0) return null;
    currencyMatches = symbolMatches.map((m) => {
      const found = m[1];
      const idx = m.index !== undefined ? m.index + m[0].indexOf(found) : m.index;
      return Object.assign([found], { index: idx, input: line }) as RegExpMatchArray;
    });
    usingSymbolPrice = true;
  }

  const amountMatch = currencyMatches[currencyMatches.length - 1];
  const rateMatch = !usingSymbolPrice && currencyMatches.length >= 2
    ? currencyMatches[currencyMatches.length - 2]
    : amountMatch;

  const hsnMatch = line.match(HSN_RE);
  const qtyMatch = line.match(QTY_UNIT_RE);

  const cutCandidates = [hsnMatch?.index, qtyMatch?.index, rateMatch.index].filter(
    (n): n is number => n !== undefined
  );
  if (cutCandidates.length === 0) return null;

  const name = line
    .slice(0, Math.min(...cutCandidates))
    .trim()
    .replace(/(?:-|:|\|)+$/, "")
    .trim();
  // Require genuine word text (not just a stray unit fragment like "(15mm) 2")
  // so isolated numbers/specs elsewhere on the page aren't mistaken for a product row.
  if (name.length < 3 || !/[a-zA-Z]{3,}/.test(name)) return null;

  const row: MatchedRow = {
    name,
    price: parseCurrency(rateMatch[0]),
    amount: !usingSymbolPrice && currencyMatches.length >= 2 ? parseCurrency(amountMatch[0]) : undefined,
    hsn: hsnMatch?.[0],
    qtyRaw: qtyMatch?.[0],
    unit: qtyMatch?.[2] ? normalizeUnit(qtyMatch[2]) : undefined,
  };

  if (qtyMatch) {
    const leading = qtyMatch[1].match(/^\d+/);
    if (leading) row.stock = Number(leading[0]);
  }

  return row;
}

function tryParseSubItem(line: string): { designName: string } | null {
  if (/\d{1,3}(?:,\d{2,3})*\.\d{1,2}/.test(line)) return null; // has its own price -> a product row, not a sub-item
  const m = line.match(SUBITEM_RE);
  if (!m) return null;
  return { designName: m[1].trim() };
}

interface WorkingProduct {
  baseName: string;
  price: number;
  stock?: number;
  unit?: string;
  specifications: Array<{ title: string; description: string }>;
  designs: string[];
}

function finalizeTabularProduct(p: WorkingProduct): ExtractedProductRaw {
  const name =
    p.designs.length > 0
      ? `${p.baseName} - ${p.designs[0]}${p.designs.length > 1 ? ` + ${p.designs.length - 1} more design${p.designs.length > 2 ? "s" : ""}` : ""}`
      : p.baseName;
  const description =
    p.designs.length > 0 ? `${p.baseName} — includes: ${p.designs.join(", ")}.` : undefined;

  return {
    name,
    description,
    price: p.price,
    stock: p.stock,
    unit: p.unit,
    specifications: p.specifications,
  };
}

function extractTabularProducts(pages: PdfPageText[]): ExtractedProductRaw[] {
  const products: ExtractedProductRaw[] = [];
  let current: WorkingProduct | null = null;

  for (const page of pages) {
    for (const line of page.text.split("\n")) {
      const row = tryParseProductRow(line);
      if (row) {
        if (current) products.push(finalizeTabularProduct(current));

        const specifications: Array<{ title: string; description: string }> = [];
        if (row.hsn) specifications.push({ title: "HSN/SAC", description: row.hsn });
        if (row.qtyRaw) specifications.push({ title: "Quantity", description: row.qtyRaw });
        if (row.amount !== undefined) {
          specifications.push({ title: "Line Amount", description: row.amount.toFixed(2) });
        }

        current = {
          baseName: row.name,
          price: row.price,
          stock: row.stock,
          unit: row.unit,
          specifications,
          designs: [],
        };
        continue;
      }

      if (current) {
        const subItem = tryParseSubItem(line);
        if (subItem) current.designs.push(subItem.designName);
      }
    }
  }
  if (current) products.push(finalizeTabularProduct(current));

  return products;
}

// ── Pass 2: size-anchored catalog pages (no price table) ────────────────

function isBoilerplateLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;
  if (/^\d+$/.test(trimmed)) return true;
  return BOILERPLATE_RE.test(trimmed);
}

function nearestMeaningfulLine(
  lines: string[],
  index: number,
  direction: 1 | -1,
  used: Set<number>,
  maxDistance = 2
): { line: string; idx: number } | null {
  for (let d = 1; d <= maxDistance; d++) {
    const idx = index + d * direction;
    if (idx < 0 || idx >= lines.length) break;
    if (used.has(idx)) continue;
    const candidate = lines[idx];
    if (!isBoilerplateLine(candidate) && !SIZE_RE.test(candidate)) {
      return { line: candidate.trim(), idx };
    }
  }
  return null;
}

function extractSizeAnchoredProducts(pages: PdfPageText[]): ExtractedProductRaw[] {
  const products: ExtractedProductRaw[] = [];

  for (const page of pages) {
    const lines = page.text.split("\n");
    const used = new Set<number>();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (isBoilerplateLine(line)) continue;

      const sizeMatch = line.match(SIZE_RE);
      if (!sizeMatch) continue;
      // Lines with their own priced-table data are handled by the tabular pass.
      if (/\d{1,3}(?:,\d{2,3})*\.\d{1,2}/.test(line)) continue;

      const sizeText = `${sizeMatch[1]}x${sizeMatch[2]}${sizeMatch[3] ? sizeMatch[3].toLowerCase() : ""}`;
      const after = nearestMeaningfulLine(lines, i, 1, used);
      const before = nearestMeaningfulLine(lines, i, -1, used);
      const designName = after?.line || before?.line;
      if (!designName) continue;

      const leftover = line.replace(SIZE_RE, "").trim();
      const namePrefix = leftover && !isBoilerplateLine(leftover) ? leftover : "";
      const name = [designName, namePrefix, sizeText].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();

      if (after) used.add(after.idx);
      if (before && before.line !== designName) used.add(before.idx);

      const material = before && before.line !== designName ? before.line : undefined;

      const specifications: Array<{ title: string; description: string }> = [];
      specifications.push({ title: "Size", description: sizeText });
      if (material) specifications.push({ title: "Material / Series", description: material });

      products.push({ name, size: sizeText, material, specifications });
    }
  }

  return products;
}

// ── Combined public API ──────────────────────────────────────────────────

export function extractProductsWithRules(pages: PdfPageText[]): ExtractedProductRaw[] {
  const tabular = extractTabularProducts(pages);
  const sizeAnchored = extractSizeAnchoredProducts(pages);

  const seen = new Set(tabular.map((p) => (p.name || "").toLowerCase().trim()));
  const merged = [...tabular];
  for (const p of sizeAnchored) {
    const key = (p.name || "").toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(p);
  }

  return merged;
}
