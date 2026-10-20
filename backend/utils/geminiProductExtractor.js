const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');
const ErrorHandler = require('./errorHandler');

// Response shape mirrors the flat JSON the "paste JSON" importer on the
// create-product form already understands (see normalizeJsonInput in
// SimpleProductForm.tsx), so extracted rows can flow through the same
// review/edit UI without a second translation layer.
const productSchema = {
    type: SchemaType.OBJECT,
    properties: {
        products: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    name: { type: SchemaType.STRING },
                    description: { type: SchemaType.STRING },
                    shortDescription: { type: SchemaType.STRING },
                    productId: { type: SchemaType.STRING },
                    material: { type: SchemaType.STRING },
                    finish: { type: SchemaType.STRING },
                    color: { type: SchemaType.STRING },
                    size: { type: SchemaType.STRING },
                    unit: { type: SchemaType.STRING },
                    price: { type: SchemaType.NUMBER },
                    cuttedPrice: { type: SchemaType.NUMBER },
                    stock: { type: SchemaType.NUMBER },
                    category: { type: SchemaType.STRING },
                    brand: { type: SchemaType.STRING },
                    tags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                    specifications: {
                        type: SchemaType.ARRAY,
                        items: {
                            type: SchemaType.OBJECT,
                            properties: {
                                title: { type: SchemaType.STRING },
                                description: { type: SchemaType.STRING },
                            },
                        },
                    },
                },
                required: ['name'],
            },
        },
    },
    required: ['products'],
};

const TEXT_SYSTEM_PROMPT = `You are extracting sellable tile/ceramic product rows from a vendor PDF (invoice, price list, or catalog) so they can be imported into an e-commerce admin panel.

Rules:
- Return one object per DISTINCT sellable product/design/variant found in the text. A row like "Muralis Beige Decore 2 Pcs" under a group heading like "2x4 Digital Vitrified Tiles" is its own product — use the design name as part of "name" and the group heading as context (material/category), not as a separate product.
- "name" is required and must always be filled — if there's no explicit product name, build a short descriptive one from whatever is available (series + design + size, e.g. "I'ROK Nova Nero 600x600mm").
- "description" and "shortDescription": write a short, factual one-liner synthesized ONLY from details actually present in the text (size, material, finish, series, collection). Never invent marketing claims or specs that aren't in the source text.
- "price", "cuttedPrice", "stock": only include these keys when an explicit number for that product is present in the text. Do NOT guess, average, or invent a price/stock. Omit the key entirely if not stated.
- "category"/"brand": only fill if the text clearly states a category or brand/series name near that product; otherwise omit.
- Do not fabricate a productId — only use one if explicitly printed in the text (e.g. an SKU/code column).
- Ignore anything that is not a sellable product row: company/GST/invoice header info, addresses, taglines, mission/vision/about-us text, page numbers, totals rows.
- If the text contains no extractable product rows at all, return an empty "products" array — do not invent placeholder products.
Return ONLY the structured data matching the given schema.`;

const IMAGE_SYSTEM_PROMPT = `You are extracting sellable tile/ceramic product listings from scanned/photographed pages of a vendor catalog or price list (these pages have no text layer, so you are reading the page images directly).

Rules:
- Read all visible text carefully: product names, series/collection names, SKU or design codes, sizes, materials, finishes, colors, and any prices or quantities printed on the page — including text overlaid on photos, small captions, and stylized logos/headings.
- Return one object per DISTINCT sellable product/design found across the provided pages.
- "name" is required and must always be filled — build a descriptive one from whatever is visibly printed (series + design + size) if there's no single explicit product name.
- "description" and "shortDescription": a short, factual one-liner synthesized ONLY from details actually visible on the page. Never invent marketing claims or specs you can't actually see.
- "price", "cuttedPrice", "stock": only include these keys when an explicit number for that product is visibly printed. Do NOT guess or invent a price/stock. Omit the key entirely if not shown.
- "category"/"brand": only fill if clearly visible near that product; otherwise omit.
- Do not fabricate a productId — only use one if an SKU/code is actually visible.
- Ignore anything that is not a sellable product: pure branding/mission pages, addresses, contact info, page numbers, decorative-only pages with no product info.
- If a page has no identifiable products at all, contribute nothing from it — do not invent placeholder products.
Return ONLY the structured data matching the given schema.`;

let genAI = null;
function getClient() {
    if (!process.env.GEMINI_API_KEY) {
        throw new ErrorHandler(
            'PDF import is not configured yet. Add a free GEMINI_API_KEY to the backend .env (get one at https://aistudio.google.com/apikey) and restart the server.',
            503
        );
    }
    if (!genAI) {
        genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
    return genAI;
}

async function callGemini(systemInstruction, parts) {
    const client = getClient();
    const model = client.getGenerativeModel({
        model: 'gemini-3.6-flash',
        systemInstruction,
        generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: productSchema,
            temperature: 0.1,
        },
    });

    let result;
    try {
        result = await model.generateContent(parts);
    } catch (err) {
        if (err?.status === 429 || /quota|rate limit/i.test(err?.message || '')) {
            throw new ErrorHandler('AI extraction rate limit reached. Please wait a minute and try again.', 429);
        }
        throw new ErrorHandler(`AI extraction failed: ${err.message || 'unknown error'}`, 502);
    }

    const raw = result?.response?.text?.();
    if (!raw) {
        throw new ErrorHandler('AI extraction returned an empty response. Please try again.', 502);
    }

    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch {
        throw new ErrorHandler('AI extraction returned an unreadable response. Please try again.', 502);
    }

    const products = Array.isArray(parsed?.products) ? parsed.products : [];
    return { products };
}

/**
 * Extracts product rows from a chunk of PDF text using Gemini's structured output mode.
 * @param {string} text - Raw text extracted client-side from a range of PDF pages.
 * @param {{ pageRangeLabel?: string }} [meta]
 * @returns {Promise<{ products: any[] }>}
 */
async function extractProductsFromText(text, meta = {}) {
    const label = meta.pageRangeLabel ? ` (source: ${meta.pageRangeLabel})` : '';
    return callGemini(TEXT_SYSTEM_PROMPT, `Extract product rows from this PDF text${label}:\n\n${text}`);
}

/**
 * Extracts product rows from rendered page images (data URLs) using Gemini's
 * vision + structured output mode. Used when a PDF has no extractable text
 * layer (scans, or pages where text was flattened into images).
 * @param {string[]} dataUrls - Array of "data:image/jpeg;base64,...." strings.
 * @param {{ pageRangeLabel?: string }} [meta]
 * @returns {Promise<{ products: any[] }>}
 */
async function extractProductsFromImages(dataUrls, meta = {}) {
    if (!Array.isArray(dataUrls) || dataUrls.length === 0) {
        throw new ErrorHandler('No page images were provided to extract products from.', 400);
    }

    const label = meta.pageRangeLabel ? ` (source: ${meta.pageRangeLabel})` : '';
    const parts = [{ text: `Extract product listings from these catalog page images${label}:` }];

    for (const dataUrl of dataUrls) {
        const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl || '');
        if (!match) {
            throw new ErrorHandler('One of the page images was not a valid image data URL.', 400);
        }
        const [, mimeType, base64Data] = match;
        parts.push({ inlineData: { mimeType, data: base64Data } });
    }

    return callGemini(IMAGE_SYSTEM_PROMPT, parts);
}

module.exports = { extractProductsFromText, extractProductsFromImages };
