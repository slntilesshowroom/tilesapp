// Shared types/helpers for the PDF bulk-import flow (upload modal + review
// card grid + per-product editor). Kept in one place so all three pieces
// agree on the exact same ProductDraft shape.

import { generateUUID } from "@/utils/imageUtils";

export interface DraftImage {
  id: string;
  file: File;
  preview: string;
}

export interface DraftCareItem {
  id: string;
  title: string;
  description: string;
}

export interface DraftSpec {
  title: string;
  description: string;
}

export interface DraftVariant {
  id: string;
  productId: string;
  color: string;
  size: string;
  finish: string;
  material: string;
  unit: string;
  price: string;
  cuttedPrice: string;
  stock: string;
  images: DraftImage[];
  featuredImageIndex: number;
}

export interface ProductDraft {
  id: string;
  include: boolean;
  name: string;
  description: string;
  shortDescription: string;
  productId: string;
  material: string;
  finish: string;
  color: string;
  size: string;
  unit: string;
  coverage: string;
  tilesPerBox: string;
  pricePerSqft: string;
  price: string;
  cuttedPrice: string;
  stock: string;
  categoryId: string;
  subcategoryId: string;
  subSubcategoryId: string;
  highlights: string[];
  specifications: DraftSpec[];
  careInstructions: DraftCareItem[];
  tags: string[];
  images: DraftImage[];
  featuredImageIndex: number;
  hasVariants: boolean;
  variants: DraftVariant[];
  sourcePageLabel?: string;
}

// Common shape produced by either extraction path (Gemini or the offline
// rule-based parser) — every field is optional since neither path can
// guarantee full data, and this covers only what extraction can plausibly
// know (everything else — category, images, variants — is filled in later
// by the admin in the per-product editor).
export interface ExtractedProduct {
  name?: string;
  description?: string;
  shortDescription?: string;
  productId?: string;
  material?: string;
  finish?: string;
  color?: string;
  size?: string;
  unit?: string;
  price?: number;
  cuttedPrice?: number;
  stock?: number;
  tags?: string[];
  specifications?: Array<{ title?: string; description?: string }>;
}

export function draftFromExtracted(raw: ExtractedProduct, sourcePageLabel?: string): ProductDraft {
  return {
    id: generateUUID(),
    include: !!raw?.name,
    name: raw?.name || "",
    description: raw?.description || "",
    shortDescription: raw?.shortDescription || "",
    productId: raw?.productId || "",
    material: raw?.material || "",
    finish: raw?.finish || "",
    color: raw?.color || "",
    size: raw?.size || "",
    unit: raw?.unit || "",
    coverage: "",
    tilesPerBox: "",
    pricePerSqft: "",
    price: raw?.price !== undefined && raw?.price !== null ? String(raw.price) : "",
    cuttedPrice: raw?.cuttedPrice !== undefined && raw?.cuttedPrice !== null ? String(raw.cuttedPrice) : "",
    stock: raw?.stock !== undefined && raw?.stock !== null ? String(raw.stock) : "",
    categoryId: "",
    subcategoryId: "",
    subSubcategoryId: "",
    highlights: ["", "", "", "", "", ""],
    specifications: Array.isArray(raw?.specifications)
      ? raw.specifications.map((s) => ({ title: s?.title || "", description: s?.description || "" }))
      : [],
    careInstructions: [],
    tags: Array.isArray(raw?.tags) ? raw.tags.map(String) : [],
    images: [],
    featuredImageIndex: 0,
    hasVariants: false,
    variants: [],
    sourcePageLabel,
  };
}

export function draftIssues(draft: ProductDraft): string[] {
  const issues: string[] = [];
  if (!draft.name.trim()) issues.push("Name is required");
  if (!draft.price.trim() || Number.isNaN(Number(draft.price)) || Number(draft.price) < 0) {
    issues.push("Price is required");
  }
  if (!draft.categoryId) issues.push("Category is required");
  if (draft.hasVariants) {
    draft.variants.forEach((v, i) => {
      if (!v.color && !v.size) issues.push(`Variant ${i + 1} needs a color or size`);
    });
  }
  return issues;
}

export function createEmptyVariant(seed?: Partial<DraftVariant>): DraftVariant {
  return {
    id: generateUUID(),
    productId: seed?.productId || "",
    color: seed?.color || "",
    size: seed?.size || "",
    finish: seed?.finish || "",
    material: seed?.material || "",
    unit: seed?.unit || "",
    price: seed?.price || "",
    cuttedPrice: seed?.cuttedPrice || "",
    stock: seed?.stock || "",
    images: [],
    featuredImageIndex: 0,
  };
}

export function createEmptyCareItem(): DraftCareItem {
  return { id: generateUUID(), title: "", description: "" };
}
