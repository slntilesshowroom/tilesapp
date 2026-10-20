"use client";

import { useState, useCallback, useRef } from "react";
import {
  FiUpload, FiX, FiCheck, FiAlertTriangle, FiTrash2,
  FiRefreshCw, FiLoader, FiImage, FiLayers, FiEdit2, FiEye,
} from "react-icons/fi";
import { useCategories } from "@/hooks/category/queries/useCategories";
import { extractPdfPageTexts, chunkPagesByCharBudget, EmptyPdfTextError } from "@/utils/pdfText";
import { renderPdfPagesToImages, chunkImagesByByteBudget } from "@/utils/pdfImages";
import { extractProductsWithRules } from "@/utils/pdfRuleBasedExtractor";
import { fileToBase64 } from "@/utils/imageUtils";
import {
  ProductDraft, ExtractedProduct, draftFromExtracted, draftIssues,
} from "./pdfImportTypes";
import { PdfProductEditor } from "./PdfProductEditor";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000/api/v1";

// Images make each product create request slower (Cloudinary round-trips),
// so batches are kept small — fast, cheap requests with a real progress bar
// instead of one huge slow one.
const UPLOAD_BATCH_SIZE = 5;

interface CategoryOption {
  _id: string;
  name: string;
  children?: CategoryOption[];
}

interface BulkCreateResult {
  index: number;
  success: boolean;
  id?: string;
  name?: string;
  error?: string;
}

type Stage = "upload" | "reading" | "extracting" | "review" | "editing" | "uploading" | "done";
type ExtractionMethod = "ai" | "rules";

interface RowResult {
  name: string;
  success: boolean;
  error?: string;
}

export function PdfBulkImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [stage, setStage] = useState<Stage>("upload");
  const [extractionMethod, setExtractionMethod] = useState<ExtractionMethod>("ai");
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const [progressLabel, setProgressLabel] = useState("");
  const [drafts, setDrafts] = useState<ProductDraft[]>([]);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [batchCategory, setBatchCategory] = useState("");
  const [batchSubcategory, setBatchSubcategory] = useState("");
  const [batchSubSubcategory, setBatchSubSubcategory] = useState("");
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<RowResult[]>([]);
  const [pendingVisionFile, setPendingVisionFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { categories: categoriesRaw } = useCategories();
  const categories = categoriesRaw as CategoryOption[];
  const batchCategoryObj = categories.find((c) => c._id === batchCategory);
  const batchSubcategoryObj = batchCategoryObj?.children?.find((c) => c._id === batchSubcategory);

  const resetAll = () => {
    setStage("upload");
    setError("");
    setProgressLabel("");
    setDrafts([]);
    setEditingDraftId(null);
    setBatchCategory("");
    setBatchSubcategory("");
    setBatchSubSubcategory("");
    setUploadProgress({ done: 0, total: 0 });
    setResults([]);
    setPendingVisionFile(null);
  };

  const handleClose = () => {
    resetAll();
    onClose();
  };

  // The only way this modal closes: the header X (or a footer Close/Cancel
  // button that calls this same function) — never a backdrop click. If
  // there's extracted/entered data, confirm first so it isn't lost by accident.
  const requestClose = () => {
    if (stage === "uploading") return;
    if (drafts.length > 0) {
      const confirmed = window.confirm(
        "Are you sure? Your data won't be saved if you close this window."
      );
      if (!confirmed) return;
    }
    handleClose();
  };

  const authHeaders = () => {
    const token = localStorage.getItem("auth_token");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  const processFile = useCallback(async (file: File) => {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please select a PDF file.");
      return;
    }
    if (file.size > 40 * 1024 * 1024) {
      setError("This PDF is too large (max 40MB).");
      return;
    }

    setError("");
    setPendingVisionFile(null);
    setStage("reading");
    setProgressLabel("Reading PDF...");

    try {
      const pages = await extractPdfPageTexts(file, (pageNumber, totalPages) => {
        setProgressLabel(`Reading page ${pageNumber} of ${totalPages}...`);
      });

      if (extractionMethod === "rules") {
        setStage("extracting");
        setProgressLabel("Scanning for product rows (no AI)...");
        const extracted = extractProductsWithRules(pages);

        if (extracted.length === 0) {
          setError(
            "No product rows could be found without AI. This works best on simple tabular invoices/price " +
            "lists — for catalogs, brochures, or anything less structured, switch to \"Extract with Gemini AI\" instead."
          );
          setStage("upload");
          return;
        }

        setDrafts(extracted.map((p) => draftFromExtracted(p)));
        setStage("review");
        return;
      }

      const chunks = chunkPagesByCharBudget(pages);
      if (chunks.length === 0) {
        setError("No product text could be found in this PDF.");
        setStage("upload");
        return;
      }

      setStage("extracting");
      const allProducts: ProductDraft[] = [];

      for (let i = 0; i < chunks.length; i++) {
        setProgressLabel(`Analyzing ${chunks[i].pageRangeLabel} (${i + 1} of ${chunks.length})...`);
        const response = await fetch(`${API_BASE_URL}/admin/products/extract-pdf-text`, {
          method: "POST",
          headers: authHeaders(),
          credentials: "include",
          body: JSON.stringify({ text: chunks[i].text, pageRangeLabel: chunks[i].pageRangeLabel }),
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
          if (response.status === 401) {
            throw new Error("Your session has expired. Please log in again and retry.");
          }
          if (response.status === 503) {
            throw new Error(result.message || "PDF import isn't configured yet. Ask your developer to add a GEMINI_API_KEY.");
          }
          throw new Error(result.message || `Failed to analyze ${chunks[i].pageRangeLabel}.`);
        }
        for (const p of (result.products || []) as ExtractedProduct[]) {
          allProducts.push(draftFromExtracted(p, chunks[i].pageRangeLabel));
        }
      }

      if (allProducts.length === 0) {
        setError("No products could be identified in this PDF. Try the \"Paste JSON\" import instead.");
        setStage("upload");
        return;
      }

      setDrafts(allProducts);
      setStage("review");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "";
      if (err instanceof EmptyPdfTextError) {
        setError(err.message);
        // No text layer at all — offer the vision fallback instead of a dead end.
        setPendingVisionFile(file);
      } else if (message.toLowerCase().includes("fetch") || message.toLowerCase().includes("network")) {
        setError("Network error while analyzing the PDF. Please check your connection and try again.");
      } else {
        setError(message || "Something went wrong while reading this PDF.");
      }
      setStage("upload");
    }
  }, [extractionMethod]);

  const processFileWithVision = useCallback(async (file: File) => {
    setError("");
    setPendingVisionFile(null);
    setStage("reading");
    setProgressLabel("Rendering pages as images...");

    try {
      const images = await renderPdfPagesToImages(file, (pageNumber, totalPages) => {
        setProgressLabel(`Rendering page ${pageNumber} of ${totalPages} as an image...`);
      });

      const chunks = chunkImagesByByteBudget(images);
      if (chunks.length === 0) {
        setError("Could not render any pages from this PDF.");
        setStage("upload");
        return;
      }

      setStage("extracting");
      const allProducts: ProductDraft[] = [];

      for (let i = 0; i < chunks.length; i++) {
        setProgressLabel(
          `Scanning ${chunks[i].pageRangeLabel} with AI vision (${i + 1} of ${chunks.length})... this takes longer than text extraction.`
        );
        const response = await fetch(`${API_BASE_URL}/admin/products/extract-pdf-images`, {
          method: "POST",
          headers: authHeaders(),
          credentials: "include",
          body: JSON.stringify({
            images: chunks[i].images.map((img) => img.dataUrl),
            pageRangeLabel: chunks[i].pageRangeLabel,
          }),
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
          if (response.status === 401) {
            throw new Error("Your session has expired. Please log in again and retry.");
          }
          if (response.status === 503) {
            throw new Error(result.message || "PDF import isn't configured yet. Ask your developer to add a GEMINI_API_KEY.");
          }
          throw new Error(result.message || `Failed to scan ${chunks[i].pageRangeLabel}.`);
        }
        for (const p of (result.products || []) as ExtractedProduct[]) {
          allProducts.push(draftFromExtracted(p, chunks[i].pageRangeLabel));
        }
      }

      if (allProducts.length === 0) {
        setError("AI vision couldn't identify any products on these pages. Try the \"Paste JSON\" import instead.");
        setStage("upload");
        return;
      }

      setDrafts(allProducts);
      setStage("review");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "";
      if (message.toLowerCase().includes("fetch") || message.toLowerCase().includes("network")) {
        setError("Network error while scanning the PDF. Please check your connection and try again.");
      } else {
        setError(message || "Something went wrong while scanning this PDF.");
      }
      setStage("upload");
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const updateDraft = (id: string, patch: Partial<ProductDraft>) => {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  };

  const removeDraft = (id: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  };

  const applyBatchCategoryToAll = () => {
    setDrafts((prev) => prev.map((d) => ({
      ...d, categoryId: batchCategory, subcategoryId: batchSubcategory, subSubcategoryId: batchSubSubcategory,
    })));
  };

  const includedDrafts = drafts.filter((d) => d.include);
  const draftsWithIssues = includedDrafts.filter((d) => draftIssues(d).length > 0);
  const readyCount = includedDrafts.length - draftsWithIssues.length;
  const editingDraft = editingDraftId ? drafts.find((d) => d.id === editingDraftId) || null : null;

  const buildPayload = async (row: ProductDraft): Promise<Record<string, unknown>> => {
    const specifications = row.specifications.filter((s) => s.title.trim() && s.description.trim());
    const highlights = row.highlights.filter((h) => h.trim());
    const careInstructions = row.careInstructions
      .filter((c) => c.title.trim() && c.description.trim())
      .map((c) => ({ title: c.title.trim(), description: c.description.trim() }));

    const images: string[] = [];
    for (const img of row.images) images.push(await fileToBase64(img.file));

    const payload: Record<string, unknown> = {
      name: row.name.trim(),
      description: row.description.trim() || row.shortDescription.trim() || row.name.trim(),
      shortDescription: row.shortDescription.trim() || undefined,
      productId: row.productId.trim() || undefined,
      material: row.material.trim() || undefined,
      finish: row.finish.trim() || undefined,
      color: row.color.trim() || undefined,
      size: row.size.trim() || undefined,
      unit: row.unit.trim() || undefined,
      price: Number(row.price),
      category: row.categoryId,
      subcategory: row.subSubcategoryId || row.subcategoryId || undefined,
      tags: row.tags.length > 0 ? row.tags : undefined,
      specifications,
      highlights: highlights.length > 0 ? highlights : undefined,
      careInstructions: careInstructions.length > 0 ? careInstructions : undefined,
      images,
      featuredImageIndex: row.featuredImageIndex,
      hasVariants: row.hasVariants,
    };
    if (row.cuttedPrice.trim()) payload.cuttedPrice = Number(row.cuttedPrice);
    if (row.stock.trim()) payload.stock = Number(row.stock);
    if (row.coverage.trim()) payload.coverage = Number(row.coverage);
    if (row.tilesPerBox.trim()) payload.tilesPerBox = Number(row.tilesPerBox);
    if (row.pricePerSqft.trim()) payload.pricePerSqft = Number(row.pricePerSqft);

    if (row.hasVariants && row.variants.length > 0) {
      const variantsPayload = [];
      for (const v of row.variants) {
        const variantImages: string[] = [];
        for (const img of v.images) variantImages.push(await fileToBase64(img.file));
        variantsPayload.push({
          productId: v.productId || undefined,
          color: v.color || undefined,
          size: v.size || undefined,
          finish: v.finish || undefined,
          material: v.material || undefined,
          unit: v.unit || undefined,
          price: v.price ? Number(v.price) : undefined,
          cuttedPrice: v.cuttedPrice ? Number(v.cuttedPrice) : undefined,
          stock: v.stock ? Number(v.stock) : undefined,
          images: variantImages,
          featuredImageIndex: v.featuredImageIndex,
        });
      }
      payload.variants = variantsPayload;
    }

    return payload;
  };

  const startBulkUpload = async () => {
    const toUpload = includedDrafts.filter((d) => draftIssues(d).length === 0);
    if (toUpload.length === 0) return;

    setStage("uploading");
    setUploadProgress({ done: 0, total: toUpload.length });
    const allResults: RowResult[] = [];

    for (let i = 0; i < toUpload.length; i += UPLOAD_BATCH_SIZE) {
      const batch = toUpload.slice(i, i + UPLOAD_BATCH_SIZE);
      try {
        const payloads = await Promise.all(batch.map(buildPayload));
        const response = await fetch(`${API_BASE_URL}/admin/products/bulk`, {
          method: "POST",
          headers: authHeaders(),
          credentials: "include",
          body: JSON.stringify({ products: payloads }),
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message || "Bulk upload failed.");
        }
        const bulkResults: BulkCreateResult[] = result.results || [];
        for (let j = 0; j < batch.length; j++) {
          const r = bulkResults.find((res) => res.index === j);
          allResults.push({ name: batch[j].name, success: !!r?.success, error: r?.error });
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Upload failed.";
        for (const row of batch) allResults.push({ name: row.name, success: false, error: message });
      }
      setUploadProgress({ done: Math.min(i + batch.length, toUpload.length), total: toUpload.length });
    }

    setResults(allResults);
    setStage("done");
  };

  if (!open) return null;

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.length - successCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Upload Products from PDF</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {stage === "upload" && "Select a PDF containing multiple products"}
              {(stage === "reading" || stage === "extracting") && "Please wait while we analyze the PDF"}
              {stage === "review" && "Click a product to fill in more details, then upload when ready"}
              {stage === "editing" && "Edit this product's details"}
              {stage === "uploading" && "Uploading products..."}
              {stage === "done" && "Upload complete"}
            </p>
          </div>
          <button
            type="button"
            onClick={requestClose}
            disabled={stage === "uploading"}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title={stage === "uploading" ? "Please wait for the upload to finish" : "Close"}
          >
            <FiX className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
              <FiAlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-700 text-sm">{error}</p>
                {pendingVisionFile && (
                  <button
                    type="button"
                    onClick={() => processFileWithVision(pendingVisionFile)}
                    className="mt-3 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-all inline-flex items-center gap-2"
                  >
                    <FiEye className="w-4 h-4" />
                    Try AI Vision (reads the page images directly)
                  </button>
                )}
              </div>
            </div>
          )}

          {stage === "upload" && (
            <div>
              <div className="mb-4">
                <p className="text-xs font-medium text-slate-700 mb-2">Extraction method</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setExtractionMethod("ai")}
                    className={`text-left p-3 rounded-xl border transition-colors ${
                      extractionMethod === "ai" ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <p className="text-sm font-medium text-slate-900">Extract with Gemini AI</p>
                    <p className="text-xs text-slate-500 mt-0.5">Recommended. Understands any layout — invoices, price lists, or catalogs.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExtractionMethod("rules")}
                    className={`text-left p-3 rounded-xl border transition-colors ${
                      extractionMethod === "rules" ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <p className="text-sm font-medium text-slate-900">Extract without AI</p>
                    <p className="text-xs text-slate-500 mt-0.5">Free, code-only, no data leaves your browser. Works best on simple tabular PDFs.</p>
                  </button>
                </div>
              </div>

              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-16 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors ${
                  isDragging ? "border-slate-900 bg-slate-50" : "border-slate-300 hover:border-slate-400"
                }`}
              >
                <FiUpload className="w-10 h-10 text-slate-400" />
                <p className="text-slate-700 font-medium">Click to select or drag and drop a PDF</p>
                <p className="text-xs text-slate-400">Invoices, price lists, or catalog PDFs up to 40MB</p>
                <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" onChange={handleFileInput} className="hidden" />
              </div>
            </div>
          )}

          {(stage === "reading" || stage === "extracting") && (
            <div className="flex flex-col items-center justify-center gap-4 py-20">
              <FiLoader className="w-10 h-10 text-slate-400 animate-spin" />
              <p className="text-slate-700 font-medium">{progressLabel}</p>
              <p className="text-xs text-slate-400">Large catalogs can take a minute or two.</p>
            </div>
          )}

          {stage === "editing" && editingDraft && (
            <PdfProductEditor
              draft={editingDraft}
              categories={categories}
              onUpdate={(patch) => updateDraft(editingDraft.id, patch)}
              onBack={() => { setEditingDraftId(null); setStage("review"); }}
            />
          )}

          {stage === "review" && (
            <div>
              <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-end gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Category (applies to whole batch)</label>
                  <select
                    value={batchCategory}
                    onChange={(e) => { setBatchCategory(e.target.value); setBatchSubcategory(""); setBatchSubSubcategory(""); }}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm min-w-[160px]"
                  >
                    <option value="">Select category</option>
                    {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Brand</label>
                  <select
                    value={batchSubcategory}
                    onChange={(e) => { setBatchSubcategory(e.target.value); setBatchSubSubcategory(""); }}
                    disabled={!batchCategory}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm min-w-[140px] disabled:opacity-50"
                  >
                    <option value="">None</option>
                    {batchCategoryObj?.children?.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Sub-category</label>
                  <select
                    value={batchSubSubcategory}
                    onChange={(e) => setBatchSubSubcategory(e.target.value)}
                    disabled={!batchSubcategory}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm min-w-[140px] disabled:opacity-50"
                  >
                    <option value="">None</option>
                    {batchSubcategoryObj?.children?.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={applyBatchCategoryToAll}
                  disabled={!batchCategory}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium disabled:opacity-40"
                >
                  Apply to all
                </button>
                <p className="text-xs text-slate-500 ml-auto">
                  {drafts.length} extracted &middot; {readyCount} ready to upload
                  {draftsWithIssues.length > 0 && <span className="text-red-600"> &middot; {draftsWithIssues.length} need attention</span>}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {drafts.map((row) => {
                  const issues = row.include ? draftIssues(row) : [];
                  const thumb = row.images[row.featuredImageIndex]?.preview;
                  return (
                    <div
                      key={row.id}
                      className={`relative rounded-2xl border overflow-hidden cursor-pointer transition-all hover:shadow-md ${
                        issues.length > 0 ? "border-red-200 bg-red-50/40" : "border-slate-200 bg-white"
                      } ${!row.include ? "opacity-50" : ""}`}
                      onClick={() => { setEditingDraftId(row.id); setStage("editing"); }}
                    >
                      <div className="absolute top-2 left-2 z-10" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={row.include}
                          onChange={(e) => updateDraft(row.id, { include: e.target.checked })}
                          className="w-4 h-4"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeDraft(row.id); }}
                        className="absolute top-2 right-2 z-10 p-1.5 bg-white/90 rounded-lg text-red-500 hover:bg-red-600 hover:text-white transition-colors"
                        title="Remove"
                      >
                        <FiTrash2 className="w-3.5 h-3.5" />
                      </button>

                      <div className="h-32 bg-slate-100 flex items-center justify-center">
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumb} alt={row.name} className="w-full h-full object-cover" />
                        ) : (
                          <FiImage className="w-8 h-8 text-slate-300" />
                        )}
                      </div>

                      <div className="p-3">
                        <p className="text-sm font-medium text-slate-900 line-clamp-1">{row.name || "Untitled product"}</p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-sm font-semibold text-slate-900">{row.price ? `₹${row.price}` : <span className="text-red-500 text-xs font-normal">No price</span>}</p>
                          {row.hasVariants && row.variants.length > 0 && (
                            <span className="flex items-center gap-1 text-xs text-slate-500"><FiLayers className="w-3 h-3" />{row.variants.length}</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-slate-500">{row.images.length} image{row.images.length !== 1 ? "s" : ""}</span>
                          <span className="flex items-center gap-1 text-xs text-slate-400"><FiEdit2 className="w-3 h-3" /> Edit</span>
                        </div>
                        {issues.length > 0 && (
                          <p className="text-xs text-red-600 mt-2">{issues.join(" · ")}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {stage === "uploading" && (
            <div className="flex flex-col items-center justify-center gap-4 py-20">
              <FiLoader className="w-10 h-10 text-slate-400 animate-spin" />
              <p className="text-slate-700 font-medium">
                Uploading {uploadProgress.done} of {uploadProgress.total} products...
              </p>
              <div className="w-full max-w-md bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-slate-900 h-2 transition-all"
                  style={{ width: `${uploadProgress.total ? (uploadProgress.done / uploadProgress.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {stage === "done" && (
            <div className="py-6">
              <div className="flex items-center gap-3 mb-6">
                <FiCheck className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-lg font-medium text-slate-900">{successCount} product{successCount !== 1 ? "s" : ""} uploaded successfully</p>
                  {failCount > 0 && <p className="text-sm text-red-600">{failCount} failed — see details below</p>}
                </div>
              </div>
              {failCount > 0 && (
                <div className="border border-red-100 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-red-50 text-red-700 text-xs uppercase">
                      <tr>
                        <th className="px-3 py-2 text-left">Product</th>
                        <th className="px-3 py-2 text-left">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.filter((r) => !r.success).map((r, i) => (
                        <tr key={i} className="border-t border-red-100">
                          <td className="px-3 py-2">{r.name || "(unnamed)"}</td>
                          <td className="px-3 py-2 text-red-600">{r.error}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {stage !== "editing" && (
          <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
            {stage === "review" && (
              <>
                <button type="button" onClick={requestClose} className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all text-sm font-medium">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={startBulkUpload}
                  disabled={readyCount === 0}
                  className="px-5 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all text-sm font-medium disabled:opacity-40 flex items-center gap-2"
                >
                  <FiUpload className="w-4 h-4" />
                  Upload {readyCount} product{readyCount !== 1 ? "s" : ""}
                </button>
              </>
            )}
            {stage === "done" && (
              <>
                {failCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const failedNames = new Set(results.filter((r) => !r.success).map((r) => r.name));
                      setDrafts((prev) => prev.filter((d) => failedNames.has(d.name)));
                      setResults([]);
                      setStage("review");
                    }}
                    className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all text-sm font-medium flex items-center gap-2"
                  >
                    <FiRefreshCw className="w-4 h-4" />
                    Fix &amp; retry failed
                  </button>
                )}
                <button type="button" onClick={requestClose} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all text-sm font-medium">
                  Done
                </button>
              </>
            )}
            {(stage === "upload" || stage === "reading" || stage === "extracting") && (
              <button type="button" onClick={requestClose} className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all text-sm font-medium">
                Close
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
