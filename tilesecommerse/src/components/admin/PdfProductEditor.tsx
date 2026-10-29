"use client";

import { useState } from "react";
import {
  FiArrowLeft, FiUpload, FiStar, FiTrash2, FiPlus, FiX,
} from "react-icons/fi";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { colorMapping } from "@/constants/colors";
import {
  FINISH_TYPES, MATERIAL_TYPES, Unit, TAG_OPTIONS, ROOM_TYPE_OPTIONS,
  MAX_FILE_SIZE, VALID_IMAGE_TYPES,
} from "@/constants/productFormOptions";
import { generateUUID } from "@/utils/imageUtils";
import {
  ProductDraft, DraftVariant, DraftImage, createEmptyVariant, createEmptyCareItem, draftIssues,
} from "./pdfImportTypes";

interface CategoryOption {
  _id: string;
  name: string;
  children?: CategoryOption[];
}

interface PdfProductEditorProps {
  draft: ProductDraft;
  categories: CategoryOption[];
  onUpdate: (patch: Partial<ProductDraft>) => void;
  onBack: () => void;
}

function ImageGrid({
  images,
  featuredIndex,
  onSetFeatured,
  onRemove,
  size = "normal",
}: {
  images: DraftImage[];
  featuredIndex: number;
  onSetFeatured: (index: number) => void;
  onRemove: (id: string) => void;
  size?: "normal" | "small";
}) {
  if (images.length === 0) return null;
  const gridCls = size === "small" ? "grid-cols-3 md:grid-cols-4 gap-3" : "grid-cols-2 md:grid-cols-4 gap-4";
  const starBtn = size === "small" ? "p-1.5" : "p-2";
  const starIcon = size === "small" ? "w-3 h-3" : "";
  return (
    <div className={`grid ${gridCls} mt-4`}>
      {images.map((image, index) => (
        <div
          key={image.id}
          className={`relative group rounded-lg overflow-hidden border-2 transition-all ${
            index === featuredIndex ? "border-orange-500 ring-2 ring-orange-200" : "border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="aspect-square bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
          </div>
          {index === featuredIndex && (
            <div className="absolute top-1 left-1 bg-orange-500 text-white px-1.5 py-0.5 rounded text-xs font-medium flex items-center gap-1">
              <FiStar className="w-3 h-3 fill-current" /> Featured
            </div>
          )}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
            <button type="button" onClick={() => onSetFeatured(index)} className={`${starBtn} bg-white rounded-md hover:bg-orange-500 hover:text-white transition-colors`} title="Set as featured">
              <FiStar className={`${starIcon} ${index === featuredIndex ? "fill-current" : ""}`} />
            </button>
            <button type="button" onClick={() => onRemove(image.id)} className={`${starBtn} bg-white text-red-600 rounded-md hover:bg-red-600 hover:text-white transition-colors`} title="Remove image">
              <FiTrash2 className={starIcon} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PdfProductEditor({ draft, categories, onUpdate, onBack }: PdfProductEditorProps) {
  const [imageError, setImageError] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const selectedCategoryObj = categories.find((c) => c._id === draft.categoryId);
  const selectedSubcategoryObj = selectedCategoryObj?.children?.find((c) => c._id === draft.subcategoryId);
  const issues = draftIssues(draft);

  // ── Main product images ──
  const handleImageSelect = (files: FileList | null) => {
    if (!files) return;
    const newImages: DraftImage[] = [];
    for (const file of Array.from(files)) {
      if (!VALID_IMAGE_TYPES.includes(file.type)) {
        setImageError(`Invalid file type: ${file.name}.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        setImageError(`File too large: ${file.name}. Max 10MB.`);
        continue;
      }
      newImages.push({ id: generateUUID(), file, preview: URL.createObjectURL(file) });
    }
    if (newImages.length > 0) {
      setImageError("");
      onUpdate({ images: [...draft.images, ...newImages] });
    }
  };

  const removeImage = (imageId: string) => {
    const idx = draft.images.findIndex((i) => i.id === imageId);
    const img = draft.images.find((i) => i.id === imageId);
    if (img) URL.revokeObjectURL(img.preview);
    const newImages = draft.images.filter((i) => i.id !== imageId);
    let newFeatured = draft.featuredImageIndex;
    if (idx === draft.featuredImageIndex) newFeatured = 0;
    else if (idx < draft.featuredImageIndex) newFeatured = Math.max(0, newFeatured - 1);
    onUpdate({ images: newImages, featuredImageIndex: newFeatured });
  };

  // ── Highlights ──
  const updateHighlight = (index: number, value: string) => {
    const next = [...draft.highlights];
    next[index] = value;
    onUpdate({ highlights: next });
  };

  // ── Specifications list ──
  const updateSpec = (index: number, field: "title" | "description", value: string) => {
    onUpdate({ specifications: draft.specifications.map((s, i) => (i === index ? { ...s, [field]: value } : s)) });
  };
  const addSpec = () => onUpdate({ specifications: [...draft.specifications, { title: "", description: "" }] });
  const removeSpec = (index: number) => onUpdate({ specifications: draft.specifications.filter((_, i) => i !== index) });

  // ── Care instructions ──
  const updateCareItem = (id: string, field: "title" | "description", value: string) => {
    onUpdate({ careInstructions: draft.careInstructions.map((c) => (c.id === id ? { ...c, [field]: value } : c)) });
  };
  const addCareItem = () => onUpdate({ careInstructions: [...draft.careInstructions, createEmptyCareItem()] });
  const removeCareItem = (id: string) => onUpdate({ careInstructions: draft.careInstructions.filter((c) => c.id !== id) });

  // ── Tags ──
  const toggleTag = (value: string) => {
    const has = draft.tags.includes(value);
    onUpdate({ tags: has ? draft.tags.filter((t) => t !== value) : [...draft.tags, value] });
  };
  const knownTagValues = new Set([...TAG_OPTIONS, ...ROOM_TYPE_OPTIONS].map((o) => o.value));
  const extraTags = draft.tags.filter((t) => !knownTagValues.has(t.toLowerCase()));

  // ── Variants ──
  const updateVariant = (variantId: string, patch: Partial<DraftVariant>) => {
    onUpdate({ variants: draft.variants.map((v) => (v.id === variantId ? { ...v, ...patch } : v)) });
  };
  const addVariant = () => {
    onUpdate({
      variants: [
        ...draft.variants,
        createEmptyVariant({
          color: draft.color, size: draft.size, productId: draft.productId, finish: draft.finish,
          material: draft.material, unit: draft.unit, price: draft.price, cuttedPrice: draft.cuttedPrice, stock: draft.stock,
        }),
      ],
    });
  };
  const removeVariant = (variantId: string) => onUpdate({ variants: draft.variants.filter((v) => v.id !== variantId) });

  const handleVariantImageSelect = (variantId: string, files: FileList | null) => {
    if (!files) return;
    const variant = draft.variants.find((v) => v.id === variantId);
    if (!variant) return;
    const newImages = Array.from(files).map((file) => ({ id: generateUUID(), file, preview: URL.createObjectURL(file) }));
    updateVariant(variantId, { images: [...variant.images, ...newImages] });
  };
  const removeVariantImage = (variantId: string, imageId: string) => {
    const variant = draft.variants.find((v) => v.id === variantId);
    if (!variant) return;
    const idx = variant.images.findIndex((i) => i.id === imageId);
    const img = variant.images.find((i) => i.id === imageId);
    if (img) URL.revokeObjectURL(img.preview);
    const newImages = variant.images.filter((i) => i.id !== imageId);
    let newFeatured = variant.featuredImageIndex;
    if (idx === variant.featuredImageIndex) newFeatured = 0;
    else if (idx < variant.featuredImageIndex) newFeatured = Math.max(0, newFeatured - 1);
    updateVariant(variantId, { images: newImages, featuredImageIndex: newFeatured });
  };

  const inputCls = "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all";
  const labelCls = "block text-sm font-medium text-slate-700 mb-2";

  return (
    <div>
      <div className="flex items-center justify-between mb-6 sticky top-0 bg-white z-10 pb-3 border-b border-slate-100">
        <button type="button" onClick={onBack} className="flex items-center gap-2 text-slate-700 hover:text-slate-900 font-medium text-sm">
          <FiArrowLeft className="w-4 h-4" /> Back to products
        </button>
        {issues.length > 0 && (
          <p className="text-xs text-red-600">{issues.join(" · ")}</p>
        )}
      </div>

      <Accordion type="multiple" defaultValue={["basic", "images", "variants", "highlights", "care", "tags"]} className="space-y-4">
        {/* Basic Info */}
        <AccordionItem value="basic" className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-slate-50">
            <h3 className="text-base font-medium text-slate-900">Basic Information</h3>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <div className="grid md:grid-cols-2 gap-4 pt-2">
              <div className="md:col-span-2">
                <label className={labelCls}>Product Name *</label>
                <input value={draft.name} onChange={(e) => onUpdate({ name: e.target.value })} className={inputCls} />
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>Description</label>
                <textarea value={draft.description} onChange={(e) => onUpdate({ description: e.target.value })} rows={3} className={`${inputCls} resize-none`} />
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>Short Description</label>
                <input value={draft.shortDescription} onChange={(e) => onUpdate({ shortDescription: e.target.value })} className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Category *</label>
                <select
                  value={draft.categoryId}
                  onChange={(e) => onUpdate({ categoryId: e.target.value, subcategoryId: "", subSubcategoryId: "" })}
                  className={inputCls}
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Brand</label>
                <select
                  value={draft.subcategoryId}
                  onChange={(e) => onUpdate({ subcategoryId: e.target.value, subSubcategoryId: "" })}
                  disabled={!draft.categoryId}
                  className={`${inputCls} disabled:opacity-50`}
                >
                  <option value="">{draft.categoryId ? "Select brand" : "Select category first"}</option>
                  {selectedCategoryObj?.children?.map((s) => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Sub-category</label>
                <select
                  value={draft.subSubcategoryId}
                  onChange={(e) => onUpdate({ subSubcategoryId: e.target.value })}
                  disabled={!draft.subcategoryId || !selectedSubcategoryObj?.children?.length}
                  className={`${inputCls} disabled:opacity-50`}
                >
                  <option value="">{!draft.subcategoryId ? "Select brand first" : (selectedSubcategoryObj?.children?.length ? "Select sub-category" : "None available")}</option>
                  {selectedSubcategoryObj?.children?.map((s) => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Specifications */}
        <AccordionItem value="specs" className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-slate-50">
            <h3 className="text-base font-medium text-slate-900">Specifications</h3>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <div className="grid md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className={labelCls}>Product ID</label>
                <input value={draft.productId} onChange={(e) => onUpdate({ productId: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Material</label>
                <select value={draft.material} onChange={(e) => onUpdate({ material: e.target.value })} className={inputCls}>
                  <option value="">Select material</option>
                  {MATERIAL_TYPES.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Finish</label>
                <select value={draft.finish} onChange={(e) => onUpdate({ finish: e.target.value })} className={inputCls}>
                  <option value="">Select finish</option>
                  {FINISH_TYPES.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Color</label>
                <select value={draft.color} onChange={(e) => onUpdate({ color: e.target.value })} className={inputCls}>
                  <option value="">Select color</option>
                  {Object.keys(colorMapping).map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Size</label>
                <input value={draft.size} onChange={(e) => onUpdate({ size: e.target.value })} placeholder="24x24, 1200x600mm..." className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Unit</label>
                <select value={draft.unit} onChange={(e) => onUpdate({ unit: e.target.value })} className={inputCls}>
                  <option value="">Select unit</option>
                  {Unit.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>

              {draft.unit === "Sq.ft" && (
                <>
                  <div>
                    <label className={labelCls}>Coverage per Box (Sq.ft)</label>
                    <input type="number" step="0.01" value={draft.coverage} onChange={(e) => onUpdate({ coverage: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Tiles per Box</label>
                    <input type="number" value={draft.tilesPerBox} onChange={(e) => onUpdate({ tilesPerBox: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Price per Sq.ft (₹)</label>
                    <input type="number" step="0.01" value={draft.pricePerSqft} onChange={(e) => onUpdate({ pricePerSqft: e.target.value })} className={inputCls} />
                  </div>
                </>
              )}

              <div>
                <label className={labelCls}>Price (₹) *</label>
                <input type="number" step="0.01" value={draft.price} onChange={(e) => onUpdate({ price: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>MRP (₹)</label>
                <input type="number" step="0.01" value={draft.cuttedPrice} onChange={(e) => onUpdate({ cuttedPrice: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Stock</label>
                <input type="number" value={draft.stock} onChange={(e) => onUpdate({ stock: e.target.value })} className={inputCls} />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Images */}
        <AccordionItem value="images" className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-slate-50">
            <h3 className="text-base font-medium text-slate-900">Product Images {draft.images.length > 0 && `(${draft.images.length})`}</h3>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleImageSelect(e.dataTransfer.files); }}
              className={`relative border-2 border-dashed rounded-xl transition-all ${isDragging ? "border-orange-500 bg-orange-50" : "border-slate-300 bg-slate-50"}`}
            >
              <input type="file" accept="image/*" multiple onChange={(e) => handleImageSelect(e.target.files)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
              <div className="py-10 px-4 text-center pointer-events-none">
                <FiUpload className={`w-10 h-10 mx-auto mb-2 ${isDragging ? "text-orange-500" : "text-slate-400"}`} />
                <p className="text-sm font-medium text-slate-700">Click to upload or drag and drop</p>
                <p className="text-xs text-slate-500">PNG, JPG, GIF up to 10MB each</p>
              </div>
            </div>
            {imageError && <p className="text-xs text-red-500 mt-2">{imageError}</p>}
            <ImageGrid images={draft.images} featuredIndex={draft.featuredImageIndex} onSetFeatured={(i) => onUpdate({ featuredImageIndex: i })} onRemove={removeImage} />
          </AccordionContent>
        </AccordionItem>

        {/* Variants */}
        <AccordionItem value="variants" className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-slate-50">
            <h3 className="text-base font-medium text-slate-900">Product Variants (Optional)</h3>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl mb-4">
              <p className="text-sm font-medium text-slate-900">Enable Product Variants</p>
              <button
                type="button"
                onClick={() => {
                  const next = !draft.hasVariants;
                  onUpdate({ hasVariants: next, variants: next && draft.variants.length === 0 ? [createEmptyVariant({ color: draft.color, size: draft.size, price: draft.price })] : draft.variants });
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${draft.hasVariants ? "bg-slate-900" : "bg-slate-300"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${draft.hasVariants ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>

            {draft.hasVariants && (
              <div className="space-y-4">
                {draft.variants.map((variant, index) => (
                  <div key={variant.id} className="p-5 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-medium text-slate-700">Variant {index + 1}</span>
                      <button type="button" onClick={() => removeVariant(variant.id)} className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center gap-1">
                        <FiTrash2 className="w-4 h-4" /> Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Product ID</label>
                        <input value={variant.productId} onChange={(e) => updateVariant(variant.id, { productId: e.target.value })} className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Material</label>
                        <select value={variant.material} onChange={(e) => updateVariant(variant.id, { material: e.target.value })} className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg">
                          <option value="">Select material</option>
                          {MATERIAL_TYPES.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Finish</label>
                        <select value={variant.finish} onChange={(e) => updateVariant(variant.id, { finish: e.target.value })} className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg">
                          <option value="">Select finish</option>
                          {FINISH_TYPES.map((f) => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Color</label>
                        <select value={variant.color} onChange={(e) => updateVariant(variant.id, { color: e.target.value })} className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg">
                          <option value="">Select color</option>
                          {Object.keys(colorMapping).map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Size</label>
                        <input value={variant.size} onChange={(e) => updateVariant(variant.id, { size: e.target.value })} className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Unit</label>
                        <select value={variant.unit} onChange={(e) => updateVariant(variant.id, { unit: e.target.value })} className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg">
                          <option value="">Select unit</option>
                          {Unit.map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Price (₹)</label>
                        <input type="number" step="0.01" value={variant.price} onChange={(e) => updateVariant(variant.id, { price: e.target.value })} className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">MRP (₹)</label>
                        <input type="number" step="0.01" value={variant.cuttedPrice} onChange={(e) => updateVariant(variant.id, { cuttedPrice: e.target.value })} className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Stock</label>
                        <input type="number" value={variant.stock} onChange={(e) => updateVariant(variant.id, { stock: e.target.value })} className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg" />
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <label className="block text-xs font-medium text-slate-600 mb-2">Variant Images {variant.images.length > 0 && `(${variant.images.length})`}</label>
                      <div className="relative border-2 border-dashed border-slate-300 bg-white rounded-xl hover:border-slate-400 transition-all">
                        <input type="file" accept="image/*" multiple onChange={(e) => handleVariantImageSelect(variant.id, e.target.files)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                        <div className="py-6 px-4 text-center pointer-events-none">
                          <FiUpload className="w-6 h-6 mx-auto mb-1 text-slate-400" />
                          <p className="text-xs font-medium text-slate-600">Click to upload variant images</p>
                        </div>
                      </div>
                      <ImageGrid
                        images={variant.images}
                        featuredIndex={variant.featuredImageIndex}
                        onSetFeatured={(i) => updateVariant(variant.id, { featuredImageIndex: i })}
                        onRemove={(imgId) => removeVariantImage(variant.id, imgId)}
                        size="small"
                      />
                    </div>
                  </div>
                ))}

                <button type="button" onClick={addVariant} className="w-full py-3 px-4 border-2 border-dashed border-slate-300 text-slate-600 rounded-xl hover:border-slate-400 hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                  <FiPlus className="w-4 h-4" /> <span className="text-sm font-medium">Add Another Variant</span>
                </button>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Highlights & Specifications list */}
        <AccordionItem value="highlights" className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-slate-50">
            <h3 className="text-base font-medium text-slate-900">Highlights &amp; Technical Specifications</h3>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Product Highlights</label>
            <div className="space-y-2 mb-6">
              {draft.highlights.map((h, i) => (
                <input key={i} value={h} onChange={(e) => updateHighlight(i, e.target.value)} placeholder={`Highlight ${i + 1}`} className={inputCls} />
              ))}
            </div>

            <label className="block text-sm font-medium text-slate-700 mb-2">Technical Specifications</label>
            <div className="space-y-2">
              {draft.specifications.map((spec, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <input value={spec.title} onChange={(e) => updateSpec(i, "title", e.target.value)} placeholder="Title" className={inputCls} />
                    <input value={spec.description} onChange={(e) => updateSpec(i, "description", e.target.value)} placeholder="Description" className={inputCls} />
                  </div>
                  <button type="button" onClick={() => removeSpec(i)} className="mt-1 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button type="button" onClick={addSpec} className="w-full py-3 px-4 border-2 border-dashed border-slate-300 text-slate-600 rounded-xl hover:border-slate-400 hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                <FiPlus className="w-4 h-4" /> <span className="text-sm font-medium">Add Specification</span>
              </button>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Care Instructions */}
        <AccordionItem value="care" className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-slate-50">
            <h3 className="text-base font-medium text-slate-900">Care Instructions</h3>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <div className="space-y-2">
              {draft.careInstructions.map((item) => (
                <div key={item.id} className="flex gap-2 items-start">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <input value={item.title} onChange={(e) => updateCareItem(item.id, "title", e.target.value)} placeholder="Title" className={`${inputCls} font-medium`} />
                    <input value={item.description} onChange={(e) => updateCareItem(item.id, "description", e.target.value)} placeholder="Description" className={inputCls} />
                  </div>
                  <button type="button" onClick={() => removeCareItem(item.id)} className="mt-1 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button type="button" onClick={addCareItem} className="w-full py-3 px-4 border-2 border-dashed border-slate-300 text-slate-600 rounded-xl hover:border-slate-400 hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                <FiPlus className="w-4 h-4" /> <span className="text-sm font-medium">Add Care Instruction</span>
              </button>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Tags */}
        <AccordionItem value="tags" className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-slate-50">
            <h3 className="text-base font-medium text-slate-900">Tags</h3>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <p className="text-sm font-medium text-slate-700 mb-3">Product Tags</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {TAG_OPTIONS.map((tag) => (
                <label key={tag.value} className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${draft.tags.includes(tag.value) ? "bg-slate-900 border-slate-900 text-white" : "bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300"}`}>
                  <input type="checkbox" checked={draft.tags.includes(tag.value)} onChange={() => toggleTag(tag.value)} className="hidden" />
                  <span className="text-sm font-medium">{tag.emoji} {tag.label}</span>
                </label>
              ))}
            </div>

            <p className="text-sm font-medium text-slate-700 mb-3">Applications (Room Types)</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {ROOM_TYPE_OPTIONS.map((tag) => (
                <label key={tag.value} className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${draft.tags.includes(tag.value) ? "bg-slate-900 border-slate-900 text-white" : "bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300"}`}>
                  <input type="checkbox" checked={draft.tags.includes(tag.value)} onChange={() => toggleTag(tag.value)} className="hidden" />
                  <span className="text-sm font-medium">{tag.emoji} {tag.label}</span>
                </label>
              ))}
            </div>

            {extraTags.length > 0 && (
              <div className="mt-6 pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-500 mb-2">Other tags found while extracting (click to remove):</p>
                <div className="flex flex-wrap gap-2">
                  {extraTags.map((t) => (
                    <button key={t} type="button" onClick={() => onUpdate({ tags: draft.tags.filter((x) => x !== t) })} className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-full text-xs hover:bg-red-50 hover:text-red-600">
                      {t} <FiX className="w-3 h-3" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <button type="button" onClick={onBack} className="mt-6 w-full py-3 px-4 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all text-sm font-medium flex items-center justify-center gap-2">
        <FiArrowLeft className="w-4 h-4" /> Back to products
      </button>
    </div>
  );
}
