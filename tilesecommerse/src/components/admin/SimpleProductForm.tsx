"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FiUpload, FiCheck, FiX, FiStar, FiTrash2, FiImage, FiPlus, FiCopy, FiInfo } from "react-icons/fi";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useCategories } from "@/hooks/category/queries/useCategories";
import { revalidateProducts } from "@/app/actions";
import { PdfBulkImportModal } from "./PdfBulkImportModal";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1';

import { colorMapping } from "@/constants/colors";
import {
  FINISH_TYPES, MATERIAL_TYPES, Unit,
  MAX_FILE_SIZE, VALID_IMAGE_TYPES,
} from "@/constants/productFormOptions";
import { generateUUID, fileToBase64 } from "@/utils/imageUtils";

interface VariantImage {
  file: File;
  preview: string;
  id: string;
}

interface Variant {
  id: string;
  color: string;
  size: string;
  productId: string;
  finish: string;
  material: string;
  unit: string;
  price: string;
  cuttedPrice: string;
  stock: string;
  images: VariantImage[];
  featuredImageIndex: number;
}

export function SimpleProductForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [jsonInput, setJsonInput] = useState('');
  const [showJsonFormat, setShowJsonFormat] = useState(false);
  const [showPdfImport, setShowPdfImport] = useState(false);
  const [formatCopied, setFormatCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadProgress, setUploadProgress] = useState('');
  const [imagePreviews, setImagePreviews] = useState<Array<{ file: File; preview: string; id: string }>>([]);
  const [featuredImageIndex, setFeaturedImageIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [specCount, setSpecCount] = useState(2);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [selectedSubSubcategory, setSelectedSubSubcategory] = useState('');

  const { categories, isLoading: categoriesLoading } = useCategories();

  // Get selected category object for subcategory dropdown
  const selectedCategoryObj = categories.find((cat: any) => cat._id === selectedCategory);

  // Get selected subcategory object for sub-subcategory dropdown
  const selectedSubcategoryObj = selectedCategoryObj?.children?.find((subcat: any) => subcat._id === selectedSubcategory);



  const [careItems, setCareItems] = useState<Array<{ id: string; title: string; description: string }>>([
    { id: generateUUID(), title: '', description: '' },
  ]);

  const [hasVariants, setHasVariants] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);

  const [mainFormValues, setMainFormValues] = useState({
    productId: '',
    material: '',
    finish: '',
    color: '',
    size: '',
    unit: 'inches',
    coverage: '',
    tilesPerBox: '',
    pricePerSqft: '',
    price: '',
    cuttedPrice: '',
    stock: '100'
  });

  // Cleanup blob URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      // Cleanup main product images
      imagePreviews.forEach(img => {
        if (img.preview.startsWith('blob:')) {
          URL.revokeObjectURL(img.preview);
        }
      });

      // Cleanup variant images
      variants.forEach(variant => {
        variant.images.forEach(img => {
          if (img.preview.startsWith('blob:')) {
            URL.revokeObjectURL(img.preview);
          }
        });
      });
    };
  }, [imagePreviews, variants]);

  const handleImageSelect = (files: FileList | null) => {
    if (!files) return;

    const newImages: Array<{ file: File; preview: string; id: string }> = [];
    for (const file of Array.from(files)) {
      // Validate file type
      if (!VALID_IMAGE_TYPES.includes(file.type)) {
        setError(`Invalid file type: ${file.name}. Only JPG, PNG, GIF, and WebP are allowed.`);
        continue;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        setError(`File too large: ${file.name}. Maximum 10MB per image.`);
        continue;
      }

      newImages.push({
        file,
        preview: URL.createObjectURL(file),
        id: generateUUID()
      });
    }

    if (newImages.length > 0) {
      setImagePreviews(prev => [...prev, ...newImages]);
      setError(''); // Clear any previous errors
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleImageSelect(e.dataTransfer.files);
  };

  const removeImage = (id: string) => {
    const removedIndex = imagePreviews.findIndex(img => img.id === id);

    // Revoke blob URL to prevent memory leak
    const imageToRemove = imagePreviews.find(img => img.id === id);
    if (imageToRemove && imageToRemove.preview.startsWith('blob:')) {
      URL.revokeObjectURL(imageToRemove.preview);
    }

    // Remove the image
    setImagePreviews(prev => prev.filter(img => img.id !== id));

    // Adjust featured index if needed
    if (removedIndex !== -1) {
      if (removedIndex === featuredImageIndex) {
        // Featured image was removed, set to first image
        setFeaturedImageIndex(0);
      } else if (removedIndex < featuredImageIndex) {
        // Image removed before featured, shift index down
        setFeaturedImageIndex(prev => prev - 1);
      }
      // If removed after featured, no change needed
    }
  };

  const setFeaturedImage = (index: number) => {
    setFeaturedImageIndex(index);
  };

  // All variant mutations use the updater form — see the note in the edit page:
  // reading `variants` from the closure loses writes when two handlers fire
  // inside one render window, which is what dropped variants on large products.
  const handleVariantImageSelect = (variantId: string, files: FileList | null) => {
    if (!files) return;

    const newImages = Array.from(files).map(file => ({
      file,
      preview: URL.createObjectURL(file),
      id: generateUUID()
    }));

    setVariants(prev => prev.map(v =>
      v.id === variantId
        ? { ...v, images: [...v.images, ...newImages] }
        : v
    ));
  };

  const removeVariantImage = (variantId: string, imageId: string) => {
    setVariants(prev => prev.map(v => {
      if (v.id === variantId) {
        // Revoke blob URL to prevent memory leak
        const imageToRemove = v.images.find(img => img.id === imageId);
        if (imageToRemove && imageToRemove.preview.startsWith('blob:')) {
          URL.revokeObjectURL(imageToRemove.preview);
        }

        const newImages = v.images.filter(img => img.id !== imageId);
        return {
          ...v,
          images: newImages,
          featuredImageIndex: v.featuredImageIndex >= newImages.length
            ? Math.max(0, newImages.length - 1)
            : v.featuredImageIndex
        };
      }
      return v;
    }));
  };

  const setVariantFeaturedImage = (variantId: string, index: number) => {
    setVariants(prev => prev.map(v =>
      v.id === variantId ? { ...v, featuredImageIndex: index } : v
    ));
  };

  const addVariant = () => {
    const newVariant: Variant = {
      id: generateUUID(),
      color: mainFormValues.color,
      size: mainFormValues.size,
      productId: mainFormValues.productId,
      finish: mainFormValues.finish,
      material: mainFormValues.material,
      unit: mainFormValues.unit,
      price: mainFormValues.price,
      cuttedPrice: mainFormValues.cuttedPrice,
      stock: mainFormValues.stock,
      images: [],
      featuredImageIndex: 0
    };
    setVariants(prev => [...prev, newVariant]);
  };

  const updateVariant = (id: string, field: string, value: string) => {
    setVariants(prev => prev.map(v =>
      v.id === id ? { ...v, [field]: value } : v
    ));
  };

  const removeVariant = (id: string) => {
    setVariants(prev => prev.filter(v => v.id !== id));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // ── Client-side validation ──────────────────────────────────────────────
    const formData_check = new FormData(e.currentTarget);
    const name_check = (formData_check.get('name') as string || '').trim();
    const description_check = (formData_check.get('description') as string || '').trim();
    const category_check = (formData_check.get('category') as string || '').trim();
    const price_check = Number(formData_check.get('price'));
    const cuttedPrice_check = Number(formData_check.get('cuttedPrice'));
    const stock_check = Number(formData_check.get('stock'));

    if (!name_check) {
      setError('Product name is required.');
      return;
    }
    if (name_check.length < 3) {
      setError('Product name must be at least 3 characters long.');
      return;
    }
    if (!description_check) {
      setError('Product description is required.');
      return;
    }
    if (!category_check) {
      setError('Please select a category for this product.');
      return;
    }
    if (imagePreviews.length === 0) {
      setError('Please upload at least one product image before saving.');
      return;
    }
    if (price_check < 0) {
      setError('Price cannot be negative. Enter 0 if the price is shown on request.');
      return;
    }
    if (cuttedPrice_check > 0 && price_check > 0 && cuttedPrice_check <= price_check) {
      setError('MRP must be higher than the selling price.');
      return;
    }
    if (stock_check < 0) {
      setError('Stock quantity cannot be negative.');
      return;
    }
    if (hasVariants && variants.length === 0) {
      setError('Variants are enabled but none have been added. Please add at least one variant or disable the variants toggle.');
      return;
    }
    if (hasVariants && variants.length > 0) {
      for (let i = 0; i < variants.length; i++) {
        if (!variants[i].color) {
          setError(`Variant ${i + 1} is missing a color. Please select a color for it.`);
          return;
        }
      }
    }
    // Validate specification pairs
    for (let i = 1; i <= specCount; i++) {
      const title = (formData_check.get(`specTitle${i}`) as string || '').trim();
      const desc = (formData_check.get(`specDesc${i}`) as string || '').trim();
      if ((title && !desc) || (!title && desc)) {
        setError(`Specification ${i}: both the title and description must be filled, or leave both empty.`);
        return;
      }
    }
    // ── End validation ──────────────────────────────────────────────────────

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData(e.currentTarget);
      setUploadProgress('Preparing product data...');

      const name = formData.get('name') as string;
      const description = formData.get('description') as string;
      const shortDescription = formData.get('shortDescription') as string;
      const productId = formData.get('productId') as string;
      const price = formData.get('price') as string;
      const cuttedPrice = formData.get('cuttedPrice') as string;
      const category = formData.get('category') as string;
      const subcategory = formData.get('subcategory') as string;
      const subSubcategory = formData.get('subSubcategory') as string;
      const stock = formData.get('stock') as string;
      const material = formData.get('material') as string;
      const finish = formData.get('finish') as string;
      const color = formData.get('color') as string;
      const size = formData.get('size') as string;
      const unit = formData.get('unit') as string;

      const roomType = formData.getAll('roomType') as string[];
      const highlight1 = formData.get('highlight1') as string;
      const highlight2 = formData.get('highlight2') as string;
      const highlight3 = formData.get('highlight3') as string;
      const highlight4 = formData.get('highlight4') as string;
      const highlight5 = formData.get('highlight5') as string;
      const highlight6 = formData.get('highlight6') as string;
      const highlights = [highlight1, highlight2, highlight3, highlight4, highlight5, highlight6].filter(h => h);

      const careInstructions = careItems
        .filter(c => c.title.trim() || c.description.trim())
        .map(c => JSON.stringify({ title: c.title.trim(), description: c.description.trim() }));

      const tags = formData.getAll('tags') as string[];

      const specifications = [];
      for (let i = 1; i <= specCount; i++) {
        const specTitle = formData.get(`specTitle${i}`) as string;
        const specDesc = formData.get(`specDesc${i}`) as string;
        if (specTitle && specDesc) {
          specifications.push(JSON.stringify({ title: specTitle, description: specDesc }));
        }
      }

      setUploadProgress('Processing images...');
      const images = [];
      for (let i = 0; i < imagePreviews.length; i++) {
        setUploadProgress(`Processing image ${i + 1} of ${imagePreviews.length}...`);
        try {
          const base64 = await fileToBase64(imagePreviews[i].file);
          images.push(base64);
        } catch {
          setError(`Failed to process image ${i + 1}. Please remove it and try uploading a different file.`);
          setLoading(false);
          setUploadProgress('');
          return;
        }
      }

      const requestBody: any = {
        name,
        description,
        shortDescription,
        productId: productId || undefined,
        price: Number(price),
        cuttedPrice: Number(cuttedPrice),
        category: category,
        subcategory: subSubcategory || subcategory || undefined,
        images,
        featuredImageIndex,
        highlights,
        careInstructions,
        specifications,
        stock: Number(stock),
      };

      if (material) requestBody.material = material;
      if (finish) requestBody.finish = finish;
      if (color) requestBody.color = color;
      if (size) requestBody.size = size;
      if (mainFormValues.unit) requestBody.unit = mainFormValues.unit;
      if (mainFormValues.coverage) requestBody.coverage = Number(mainFormValues.coverage);
      if (mainFormValues.tilesPerBox) requestBody.tilesPerBox = Number(mainFormValues.tilesPerBox);
      if (mainFormValues.pricePerSqft) requestBody.pricePerSqft = Number(mainFormValues.pricePerSqft);


      requestBody.hasVariants = hasVariants;
      if (hasVariants && variants.length > 0) {
        setUploadProgress('Processing variant images...');

        const variantsToSend = [];
        for (const variant of variants) {
          const variantImages = [];
          for (let i = 0; i < variant.images.length; i++) {
            setUploadProgress(`Processing variant images ${i + 1}...`);
            const base64 = await fileToBase64(variant.images[i].file);
            variantImages.push(base64);
          }

          variantsToSend.push({
            productId: variant.productId,
            color: variant.color,
            size: variant.size,
            finish: variant.finish,
            material: variant.material,
            unit: variant.unit,
            price: variant.price,
            cuttedPrice: variant.cuttedPrice,
            stock: variant.stock,
            images: variantImages,
            featuredImageIndex: variant.featuredImageIndex
          });
        }

        requestBody.variants = JSON.stringify(variantsToSend);
      }

      if (tags.length > 0) {
        requestBody.tags = JSON.stringify(tags);
      }

      setUploadProgress('Uploading to server...');
      const token = localStorage.getItem('auth_token');

      const response = await fetch(`${API_BASE_URL}/admin/product/new`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        if (response.status === 401) {
          setError('Your session has expired. Please log in again and retry.');
        } else if (response.status === 413) {
          setError('Images are too large. Please compress them (under 2MB each) and try again.');
        } else if (response.status === 429) {
          setError('Too many requests. Please wait a moment and try again.');
        } else if (response.status >= 500) {
          setError('Server error occurred. Please try again. If this keeps happening, contact support.');
        } else {
          setError(result.message || 'Failed to create product. Please check all fields and try again.');
        }
        setUploadProgress('');
        return;
      }

      setSuccess('Product created successfully!');
      setUploadProgress('');
      await revalidateProducts();
      (e.target as HTMLFormElement).reset();
      setImagePreviews([]);
      setVariants([]);
      setSelectedCategory('');
      setSelectedSubcategory('');
      setSelectedSubSubcategory('');
      setMainFormValues({
        productId: '',
        material: '',
        finish: '',
        color: '',
        size: '',
        unit: 'inches',
        coverage: '',
        tilesPerBox: '',
        pricePerSqft: '',
        price: '',
        cuttedPrice: '',
        stock: '100'
      });

    } catch (err: any) {
      console.error('Error:', err);
      if (err?.message?.toLowerCase().includes('network') || err?.message?.toLowerCase().includes('fetch')) {
        setError('Network error — please check your internet connection and try again.');
      } else if (err?.message) {
        setError(err.message);
      } else {
        setError('Failed to save product. Please try again or contact support if the issue persists.');
      }
      setUploadProgress('');

      // Cleanup blob URLs on error to prevent memory leaks
      imagePreviews.forEach(img => {
        if (img.preview.startsWith('blob:')) {
          URL.revokeObjectURL(img.preview);
        }
      });
      variants.forEach(v => {
        v.images.forEach(img => {
          if (img.preview.startsWith('blob:')) {
            URL.revokeObjectURL(img.preview);
          }
        });
      });
    } finally {
      setLoading(false);
    }
  };

  // Normalize nested JSON structures (e.g. from Gemini) into the flat format the form expects
  const normalizeJsonInput = (raw: any): any => {
    // If it already has flat keys like "name", "price", return as-is
    if (raw.name || raw.price !== undefined || raw.productId) return raw;

    const out: any = {};
    const bi = raw.basic_information || raw.basicInformation || {};
    if (bi.product_name || bi.productName) out.name = bi.product_name || bi.productName;
    if (bi.description) out.description = bi.description;
    if (bi.short_description || bi.shortDescription) out.shortDescription = bi.short_description || bi.shortDescription;
    if (bi.category) out.category = bi.category;
    if (bi.brand) out.brand = bi.brand;
    if (bi.sub_category || bi.subCategory || bi.subcategory) out.subSubcategory = bi.sub_category || bi.subCategory || bi.subcategory;

    const spec = raw.specifications || {};
    if (spec.product_id || spec.productId) out.productId = spec.product_id || spec.productId;
    if (spec.material) out.material = spec.material;
    if (spec.finish) out.finish = spec.finish;
    if (spec.color) out.color = spec.color;
    if (spec.size) out.size = spec.size;
    if (spec.unit) out.unit = spec.unit;
    if (spec.coverage) out.coverage = spec.coverage;
    if (spec.tiles_per_box || spec.tilesPerBox) out.tilesPerBox = spec.tiles_per_box || spec.tilesPerBox;
    if (spec.price_per_sqft || spec.pricePerSqft) out.pricePerSqft = spec.price_per_sqft || spec.pricePerSqft;
    const price = spec.price_inr ?? spec.price ?? spec.priceInr;
    if (price !== undefined) out.price = price;
    const mrp = spec.mrp_inr ?? spec.mrp ?? spec.cuttedPrice ?? spec.cutted_price ?? spec.mrpInr;
    if (mrp !== undefined) out.cuttedPrice = mrp;
    const stock = spec.stock;
    if (stock !== undefined) out.stock = stock;

    // Highlights
    const hl = raw.highlights || {};
    const highlights = hl.product_highlights || hl.productHighlights || (Array.isArray(hl) ? hl : null);
    if (Array.isArray(highlights)) out.highlights = highlights;

    // Technical specifications as specifications list
    const techSpecs = hl.technical_specifications || hl.technicalSpecifications || raw.technical_specifications;
    if (Array.isArray(techSpecs)) {
      // Already in { title, description } shape
      out.specifications = techSpecs.map((s: any) => ({
        title: s.title ?? s.name ?? '',
        description: s.description ?? s.value ?? String(s),
      }));
    } else if (techSpecs && typeof techSpecs === 'object') {
      out.specifications = Object.entries(techSpecs).map(([key, val]) => ({
        title: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        description: String(val),
      }));
    }
    // If specifications is already an array under a dedicated key, use it directly
    if (Array.isArray(raw.specifications_list || raw.specificationsList)) {
      out.specifications = raw.specifications_list || raw.specificationsList;
    }

    // Care instructions
    const care = raw.care_instructions || raw.careInstructions;
    if (Array.isArray(care)) out.careInstructions = care;

    // Tags
    const tags = raw.product_tags || raw.productTags || raw.tags;
    if (Array.isArray(tags)) out.tags = tags;

    // Applications / room types as additional tags
    const applications = raw.applications || raw.applications_room_types || raw.applicationsRoomTypes
      || raw.room_types || raw.roomTypes;
    if (Array.isArray(applications)) {
      out.tags = [...(out.tags || []), ...applications];
    }

    // Variants
    const pv = raw.product_variants || raw.productVariants || {};
    if (pv.enabled && Array.isArray(pv.variants)) {
      out.variants = pv.variants;
    } else if (Array.isArray(raw.variants)) {
      out.variants = raw.variants;
    }

    return out;
  };

  // JSON import handler — fills form fields from pasted JSON
  const handleJsonImport = () => {
    if (!jsonInput.trim()) return;
    let data: any;
    try {
      const rawData = JSON.parse(jsonInput.trim());
      data = normalizeJsonInput(rawData);
    } catch {
      setError('Invalid JSON format. Please check and try again.');
      return;
    }
    setError('');

    const form = formRef.current;
    if (!form) return;

    // Helper to set uncontrolled input/textarea value
    const setField = (name: string, value: string) => {
      const el = form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | null;
      if (el && value !== undefined && value !== null) {
        // Trigger React's value setter to work with uncontrolled inputs
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          el instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype,
          'value'
        )?.set;
        nativeInputValueSetter?.call(el, String(value));
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    };

    // Basic info (uncontrolled)
    if (data.name) setField('name', data.name);
    if (data.description) setField('description', data.description);
    if (data.shortDescription) setField('shortDescription', data.shortDescription);

    // Specifications (controlled via mainFormValues)
    setMainFormValues(prev => ({
      ...prev,
      ...(data.productId !== undefined && { productId: String(data.productId) }),
      ...(data.material !== undefined && { material: String(data.material) }),
      ...(data.finish !== undefined && { finish: String(data.finish) }),
      ...(data.color !== undefined && { color: String(data.color) }),
      ...(data.size !== undefined && { size: String(data.size) }),
      ...(data.unit !== undefined && { unit: String(data.unit) }),
      ...(data.coverage !== undefined && { coverage: String(data.coverage) }),
      ...(data.tilesPerBox !== undefined && { tilesPerBox: String(data.tilesPerBox) }),
      ...(data.pricePerSqft !== undefined && { pricePerSqft: String(data.pricePerSqft) }),
      ...(data.price !== undefined && { price: String(data.price) }),
      ...(data.cuttedPrice !== undefined && { cuttedPrice: String(data.cuttedPrice) }),
      ...(data.stock !== undefined && { stock: String(data.stock) }),
    }));

    // Highlights (uncontrolled)
    if (Array.isArray(data.highlights)) {
      data.highlights.forEach((h: string, i: number) => {
        if (i < 6) setField(`highlight${i + 1}`, h);
      });
    }

    // Specifications list (uncontrolled)
    if (Array.isArray(data.specifications) && data.specifications.length > 0) {
      setSpecCount(Math.max(2, data.specifications.length));
      // Use setTimeout to let React render the new spec rows first
      setTimeout(() => {
        data.specifications.forEach((spec: any, i: number) => {
          setField(`specTitle${i + 1}`, spec.title || '');
          setField(`specDesc${i + 1}`, spec.description || '');
        });
      }, 100);
    }

    // Care instructions (controlled)
    if (Array.isArray(data.careInstructions) && data.careInstructions.length > 0) {
      setCareItems(data.careInstructions.map((c: any) => ({
        id: generateUUID(),
        title: c.title || '',
        description: c.description || '',
      })));
    }

    // Tags (checkboxes) — normalized comparison so case/spacing differences
    // ("Best Seller" vs "bestseller", "Living Room" vs "living-room") still match.
    const normalizeTag = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    let unmatchedTags: string[] = [];
    if (Array.isArray(data.tags)) {
      const normalizedInputTags = data.tags.map((t: string) => normalizeTag(String(t)));
      const checkboxes = form.querySelectorAll<HTMLInputElement>('input[name="tags"]');
      const matched = new Set<string>();
      checkboxes.forEach(cb => {
        const isMatch = normalizedInputTags.includes(normalizeTag(cb.value));
        cb.checked = isMatch;
        if (isMatch) matched.add(normalizeTag(cb.value));
      });
      unmatchedTags = data.tags.filter((t: string) => !matched.has(normalizeTag(String(t))));
    }

    // Variants
    if (Array.isArray(data.variants) && data.variants.length > 0) {
      setHasVariants(true);
      setVariants(data.variants.map((v: any) => ({
        id: generateUUID(),
        color: v.color || '',
        size: v.size || '',
        productId: v.productId || '',
        finish: v.finish || '',
        material: v.material || '',
        unit: v.unit || '',
        price: v.price?.toString() || '',
        cuttedPrice: v.cuttedPrice?.toString() || '',
        stock: v.stock?.toString() || '',
        images: [],
        featuredImageIndex: 0,
      })));
    }

    // Category matching by name
    const categoryWarnings: string[] = [];
    if (data.category && categories.length > 0) {
      const matchedCat = categories.find((cat: any) =>
        cat.name.toLowerCase() === data.category.toLowerCase()
      );
      if (matchedCat) {
        setSelectedCategory(matchedCat._id);
        if (data.brand || data.subcategory) {
          const brandName = (data.brand || data.subcategory || '').toLowerCase();
          const matchedBrand = matchedCat.children?.find((sub: any) =>
            sub.name.toLowerCase() === brandName
          );
          if (matchedBrand) {
            setSelectedSubcategory(matchedBrand._id);
            if (data.subSubcategory) {
              const matchedSub = matchedBrand.children?.find((s: any) =>
                s.name.toLowerCase() === data.subSubcategory.toLowerCase()
              );
              if (matchedSub) {
                setSelectedSubSubcategory(matchedSub._id);
              } else {
                categoryWarnings.push(`Sub-category "${data.subSubcategory}" not found under "${matchedBrand.name}" — select manually.`);
              }
            }
          } else {
            categoryWarnings.push(`Brand/sub-category "${data.brand || data.subcategory}" not found under "${matchedCat.name}" — select manually.`);
          }
        }
      } else {
        categoryWarnings.push(`Category "${data.category}" not found — select manually.`);
      }
    }

    setJsonInput('');

    const warnings = [...categoryWarnings];
    if (unmatchedTags.length > 0) {
      warnings.push(`Tags not recognized: ${unmatchedTags.join(', ')} — select manually if needed.`);
    }

    setSuccess(
      warnings.length > 0
        ? `JSON imported with warnings: ${warnings.join(' ')}`
        : 'JSON imported successfully! Review the fields and upload images.'
    );
    setTimeout(() => setSuccess(''), warnings.length > 0 ? 10000 : 3000);
  };

  const handleJsonFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setJsonInput(text);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const jsonFormatTemplate = `{
  "name": "Product Name Here",
  "description": "Full detailed product description",
  "shortDescription": "One line short description",
  "productId": "SKU-001",
  "material": "Vitrified",
  "finish": "Glossy",
  "color": "white",
  "size": "600x1200mm",
  "unit": "Sq.ft",
  "coverage": 15.5,
  "tilesPerBox": 2,
  "pricePerSqft": 145,
  "price": 2247,
  "cuttedPrice": 3410,
  "stock": 100,
  "category": "Tiles",
  "brand": "Brand Name",
  "subSubcategory": "Sub-category Name",
  "highlights": [
    "Highlight point 1",
    "Highlight point 2",
    "Highlight point 3"
  ],
  "specifications": [
    { "title": "Material", "description": "Vitrified Porcelain" },
    { "title": "Thickness", "description": "9mm" }
  ],
  "careInstructions": [
    { "title": "Daily Cleaning", "description": "Sweep or vacuum regularly" },
    { "title": "Stain Removal", "description": "Use mild soap and water" }
  ],
  "tags": ["premium", "new", "bathroom", "kitchen"],
  "variants": [
    {
      "color": "white",
      "size": "600x1200mm",
      "productId": "SKU-001-WHT",
      "finish": "Glossy",
      "material": "Vitrified",
      "price": "2247",
      "cuttedPrice": "3410",
      "stock": "50"
    }
  ]
}`;

  const handleCopyFormat = () => {
    navigator.clipboard.writeText(jsonFormatTemplate);
    setFormatCopied(true);
    setTimeout(() => setFormatCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <form ref={formRef} onSubmit={handleSubmit} className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-light text-slate-900 mb-3 tracking-tight">Create New Product</h1>
          <p className="text-slate-500 text-lg font-light">Add a premium tile to your collection</p>
          <button
            type="button"
            onClick={() => setShowPdfImport(true)}
            className="mt-6 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all text-sm font-medium inline-flex items-center gap-2 shadow-sm"
          >
            <FiUpload className="w-4 h-4" />
            Upload Products from PDF
          </button>
        </div>

        <PdfBulkImportModal
          open={showPdfImport}
          onClose={() => {
            setShowPdfImport(false);
            void revalidateProducts();
          }}
        />

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3">
            <FiX className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-8 p-4 bg-green-50 border border-green-100 rounded-2xl flex items-center gap-3">
            <FiCheck className="w-5 h-5 text-green-500 flex-shrink-0" />
            <p className="text-green-700 text-sm">{success}</p>
          </div>
        )}

        {uploadProgress && (
          <div className="mb-8 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
            <p className="text-blue-700 text-sm text-center">{uploadProgress}</p>
          </div>
        )}

        {/* JSON Import Section */}
        <div className="mb-8 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-3">
            <FiCopy className="w-5 h-5 text-slate-600" />
            <div>
              <h2 className="text-lg font-medium text-slate-900">Quick Import from JSON</h2>
              <p className="text-xs text-slate-500 mt-0.5">Paste JSON from Gemini or upload a .json file to auto-fill the form</p>
            </div>
          </div>
          <div className="px-8 py-6">
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              rows={4}
              placeholder='Paste your JSON here... e.g. {"name": "Premium Tiles", "price": 999, ...}'
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all resize-none font-mono text-sm"
            />
            <div className="flex items-center gap-3 mt-3">
              <button
                type="button"
                onClick={handleJsonImport}
                disabled={!jsonInput.trim()}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Import JSON
              </button>
              <span className="text-xs text-slate-400">or</span>
              <label className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all text-sm font-medium cursor-pointer">
                Upload .json file
                <input type="file" accept=".json" onChange={handleJsonFileUpload} className="hidden" />
              </label>
              <button
                type="button"
                onClick={() => setShowJsonFormat(true)}
                className="ml-auto px-4 py-2.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl hover:bg-blue-100 transition-all text-sm font-medium flex items-center gap-2"
              >
                <FiInfo className="w-4 h-4" />
                View JSON Format
              </button>
            </div>
          </div>
        </div>

        {/* JSON Format Modal */}
        {showJsonFormat && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">JSON Format Template</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Copy this and share with Gemini to generate product data</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowJsonFormat(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <FiX className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <pre className="bg-slate-900 text-slate-100 rounded-xl p-4 text-sm font-mono overflow-x-auto whitespace-pre">
                  {jsonFormatTemplate}
                </pre>
                <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                  <strong>Note:</strong> All fields are optional. Only include the fields you have data for.
                  The form will fill in whatever is present and leave the rest empty.
                  For tags use: popular, trending, new, premium, exclusive, classic, bestseller, limited, kitchen, bathroom, living-room, bedroom, outdoor, commercial.
                </p>
              </div>
              <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowJsonFormat(false)}
                  className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all text-sm font-medium"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleCopyFormat}
                  className="px-5 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all text-sm font-medium flex items-center gap-2"
                >
                  <FiCopy className="w-4 h-4" />
                  {formatCopied ? 'Copied!' : 'Copy to Clipboard'}
                </button>
              </div>
            </div>
          </div>
        )}

        <Accordion type="multiple" defaultValue={["basic", "images", "highlights", "specs", "variants", "tags", "care"]} className="space-y-4">
          {/* 1. Basic Information */}
          <AccordionItem value="basic" className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <AccordionTrigger className="px-8 py-6 hover:no-underline hover:bg-slate-50 transition-colors">
              <h2 className="text-xl font-medium text-slate-900">1. Basic Information</h2>
            </AccordionTrigger>
            <AccordionContent className="px-8 pb-8">
              <div className="grid md:grid-cols-2 gap-6 pt-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Product Name</label>
                  <input
                    name="name"
                    required
                    placeholder="Premium Marble Floor Tiles"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                  <textarea
                    name="description"
                    required
                    rows={4}
                    placeholder="Elegant marble tiles with luxurious finish..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all resize-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Short Description</label>
                  <input
                    name="shortDescription"
                    required
                    placeholder="Short description of the product"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Category *</label>
                  <select
                    name="category"
                    required
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setSelectedSubcategory(''); // Reset subcategory when category changes
                      setSelectedSubSubcategory(''); // Reset sub-subcategory as well
                    }}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                  >
                    <option value="">Select category</option>
                    {categoriesLoading ? (
                      <option disabled>Loading categories...</option>
                    ) : Array.isArray(categories) && categories.length > 0 ? (
                      categories.map((cat: any) => (
                        <option key={cat._id} value={cat._id}>
                          {cat.name}
                        </option>
                      ))
                    ) : (
                      <option disabled>No categories available</option>
                    )}
                  </select>
                </div>

                {/* Subcategory (Brand) */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Brand</label>
                  <select
                    name="subcategory"
                    value={selectedSubcategory}
                    onChange={(e) => {
                      setSelectedSubcategory(e.target.value);
                      setSelectedSubSubcategory(''); // Reset sub-subcategory when subcategory changes
                    }}
                    disabled={!selectedCategory}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">{selectedCategory ? 'Select brand' : 'Select category first'}</option>
                    {selectedCategoryObj?.children?.map((subcat: any) => (
                      <option key={subcat._id} value={subcat._id}>
                        {subcat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sub-subcategory */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Sub-category</label>
                  <select
                    name="subSubcategory"
                    value={selectedSubSubcategory}
                    onChange={(e) => setSelectedSubSubcategory(e.target.value)}
                    disabled={!selectedSubcategory || !selectedSubcategoryObj?.children || selectedSubcategoryObj.children.length === 0}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">{!selectedSubcategory ? 'Select brand first' : (selectedSubcategoryObj?.children?.length > 0 ? 'Select sub-category' : 'No sub-categories')}</option>
                    {selectedSubcategoryObj?.children?.map((subSubcat: any) => (
                      <option key={subSubcat._id} value={subSubcat._id}>
                        {subSubcat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 2. Specifications */}
          <AccordionItem value="specs" className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <AccordionTrigger className="px-8 py-6 hover:no-underline hover:bg-slate-50 transition-colors">
              <h2 className="text-xl font-medium text-slate-900">2. Specifications</h2>
            </AccordionTrigger>
            <AccordionContent className="px-8 pb-8">
              <div className="grid md:grid-cols-2 gap-6 pt-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Product ID</label>
                  <input
                    name="productId"
                    type="text"
                    placeholder="SKU-12345 or any unique ID"
                    value={mainFormValues.productId}
                    onChange={(e) => setMainFormValues({ ...mainFormValues, productId: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Material</label>
                  <select
                    name="material"
                    value={mainFormValues.material}
                    onChange={(e) => setMainFormValues({ ...mainFormValues, material: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                  >
                    <option value="">Select material</option>
                    {MATERIAL_TYPES.map((material) => (
                      <option key={material} value={material}>
                        {material}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Finish</label>
                  <select
                    name="finish"
                    value={mainFormValues.finish}
                    onChange={(e) => setMainFormValues({ ...mainFormValues, finish: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                  >
                    <option value="">Select finish</option>
                    {FINISH_TYPES.map((finish) => (
                      <option key={finish} value={finish}>
                        {finish}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Color</label>
                  <select
                    name="color"
                    value={mainFormValues.color}
                    onChange={(e) => setMainFormValues({ ...mainFormValues, color: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                  >
                    <option value="">Select color</option>
                    {Object.keys(colorMapping).map((color) => (
                      <option key={color} value={color}>
                        {color.charAt(0).toUpperCase() + color.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Size</label>
                  <input
                    name="size"
                    type="text"
                    placeholder="24x24, 1200x600mm, etc."
                    value={mainFormValues.size}
                    onChange={(e) => setMainFormValues({ ...mainFormValues, size: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Unit</label>
                  <select
                    name="unit"
                    value={mainFormValues.unit}
                    onChange={(e) => setMainFormValues({ ...mainFormValues, unit: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                  >
                    <option value="">Select unit</option>
                    {Unit.map((unit) => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>

                {mainFormValues.unit === 'Sq.ft' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Coverage per Box (Sq.ft)
                        <span className="ml-1 text-xs text-slate-500">— How many sq.ft does 1 box cover?</span>
                      </label>
                      <input
                        name="coverage"
                        type="number"
                        step="0.01"
                        placeholder="e.g. 8.61"
                        value={mainFormValues.coverage}
                        onChange={(e) => setMainFormValues({ ...mainFormValues, coverage: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Tiles per Box
                        <span className="ml-1 text-xs text-slate-500">— Number of tiles in 1 box</span>
                      </label>
                      <input
                        name="tilesPerBox"
                        type="number"
                        placeholder="e.g. 4"
                        value={mainFormValues.tilesPerBox}
                        onChange={(e) => setMainFormValues({ ...mainFormValues, tilesPerBox: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Price per Sq.ft (₹)
                        <span className="ml-1 text-xs text-slate-500">— Display price shown on cards</span>
                      </label>
                      <input
                        name="pricePerSqft"
                        type="number"
                        step="0.01"
                        placeholder="e.g. 145"
                        value={mainFormValues.pricePerSqft}
                        onChange={(e) => setMainFormValues({ ...mainFormValues, pricePerSqft: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Price (₹) {mainFormValues.unit === 'Sq.ft' ? '— per Box' : ''}</label>
                  <input
                    name="price"
                    type="number"
                    step="0.01"
                    placeholder="999"
                    value={mainFormValues.price}
                    onChange={(e) => setMainFormValues({ ...mainFormValues, price: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">MRP (₹)</label>
                  <input
                    name="cuttedPrice"
                    type="number"
                    step="0.01"
                    placeholder="1499"
                    value={mainFormValues.cuttedPrice}
                    onChange={(e) => setMainFormValues({ ...mainFormValues, cuttedPrice: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Stock</label>
                  <input
                    name="stock"
                    type="number"
                    value={mainFormValues.stock}
                    onChange={(e) => setMainFormValues({ ...mainFormValues, stock: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                  />
                </div>

                <div className="space-y-6 pt-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">
                      Product Images {imagePreviews.length > 0 && `(${imagePreviews.length})`}
                    </label>

                    {/* Upload Area */}
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`relative border-2 border-dashed rounded-xl transition-all ${isDragging
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-slate-300 bg-slate-50'
                        }`}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleImageSelect(e.target.files)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="py-12 px-4 text-center pointer-events-none">
                        <FiUpload className={`w-12 h-12 mx-auto mb-3 ${isDragging ? 'text-orange-500' : 'text-slate-400'}`} />
                        <p className="text-sm font-medium text-slate-700 mb-1">
                          {isDragging ? 'Drop images here' : 'Click to upload or drag and drop'}
                        </p>
                        <p className="text-xs text-slate-500">
                          PNG, JPG, GIF up to 10MB each
                        </p>
                      </div>
                    </div>

                    {/* Image Previews */}
                    {imagePreviews.length > 0 && (
                      <div className="mt-6">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-medium text-slate-700">
                            Selected Images
                          </p>
                          <p className="text-xs text-slate-500">
                            Click <FiStar className="inline w-3 h-3" /> to set as featured image
                          </p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {imagePreviews.map((image, index) => (
                            <div
                              key={image.id}
                              className={`relative group rounded-lg overflow-hidden border-2 transition-all ${index === featuredImageIndex
                                ? 'border-orange-500 ring-2 ring-orange-200'
                                : 'border-slate-200 hover:border-slate-300'
                                }`}
                            >
                              <div className="aspect-square bg-slate-100">
                                <img
                                  src={image.preview}
                                  alt={`Preview ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>

                              {index === featuredImageIndex && (
                                <div className="absolute top-2 left-2 bg-orange-500 text-white px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1">
                                  <FiStar className="w-3 h-3 fill-current" />
                                  Featured
                                </div>
                              )}

                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                                <button
                                  type="button"
                                  onClick={() => setFeaturedImage(index)}
                                  className="p-2 bg-white rounded-lg hover:bg-orange-500 hover:text-white transition-colors"
                                  title="Set as featured"
                                >
                                  <FiStar className={index === featuredImageIndex ? 'fill-current' : ''} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeImage(image.id)}
                                  className="p-2 bg-white text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-colors"
                                  title="Remove image"
                                >
                                  <FiTrash2 />
                                </button>
                              </div>

                              <div className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-xs font-medium">
                                {index + 1}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {imagePreviews.length === 0 && (
                      <p className="text-xs text-red-500 mt-2">* At least one product image is required</p>
                    )}
                  </div>
                </div>

              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 3. Product Variants */}
          <AccordionItem value="variants" className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <AccordionTrigger className="px-8 py-6 hover:no-underline hover:bg-slate-50 transition-colors">
              <h2 className="text-xl font-medium text-slate-900">3. Product Variants (Optional)</h2>
            </AccordionTrigger>
            <AccordionContent className="px-8 pb-8">
              <div className="space-y-6 pt-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div>
                    <h3 className="text-sm font-medium text-slate-900">Enable Product Variants</h3>
                    <p className="text-xs text-slate-500 mt-1">Add variations like different colors, sizes, or finishes</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setHasVariants(!hasVariants);
                      if (!hasVariants && variants.length === 0) {
                        addVariant();
                      }
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${hasVariants ? 'bg-slate-900' : 'bg-slate-300'}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${hasVariants ? 'translate-x-6' : 'translate-x-1'}`}
                    />
                  </button>
                </div>

                {hasVariants && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-slate-700">
                        Variant Combinations
                      </label>
                      <span className="text-xs text-slate-500">
                        {variants.length} variant{variants.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {variants.length === 0 ? (
                      <div className="text-center py-8 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                        <p className="text-sm text-slate-500 mb-3">No variants added yet</p>
                        <button
                          type="button"
                          onClick={addVariant}
                          className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium"
                        >
                          Add First Variant
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {variants.map((variant, index) => (
                          <div key={variant.id} className="p-6 bg-slate-50 rounded-xl border border-slate-200">
                            <div className="flex items-center justify-between mb-4">
                              <span className="text-sm font-medium text-slate-700">Variant {index + 1}</span>
                              <button
                                type="button"
                                onClick={() => removeVariant(variant.id)}
                                className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center gap-1"
                              >
                                <FiTrash2 className="w-4 h-4" />
                                Remove
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Product ID</label>
                                <input
                                  type="text"
                                  value={variant.productId}
                                  onChange={(e) => updateVariant(variant.id, 'productId', e.target.value)}
                                  placeholder="SKU-001"
                                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Material</label>
                                <select
                                  value={variant.material}
                                  onChange={(e) => updateVariant(variant.id, 'material', e.target.value)}
                                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                                >
                                  <option value="">Select material</option>
                                  {MATERIAL_TYPES.map((material) => (
                                    <option key={material} value={material}>
                                      {material}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Finish</label>
                                <select
                                  value={variant.finish}
                                  onChange={(e) => updateVariant(variant.id, 'finish', e.target.value)}
                                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                                >
                                  <option value="">Select finish</option>
                                  {FINISH_TYPES.map((finish) => (
                                    <option key={finish} value={finish}>
                                      {finish}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Color</label>
                                <select
                                  value={variant.color}
                                  onChange={(e) => updateVariant(variant.id, 'color', e.target.value)}
                                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                                >
                                  <option value="">Select color</option>
                                  {Object.keys(colorMapping).map((color) => (
                                    <option key={color} value={color}>
                                      {color.charAt(0).toUpperCase() + color.slice(1)}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Size</label>
                                <input
                                  type="text"
                                  value={variant.size}
                                  onChange={(e) => updateVariant(variant.id, 'size', e.target.value)}
                                  placeholder="24x24, 12x12..."
                                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Unit</label>
                                <select
                                  value={variant.unit}
                                  onChange={(e) => updateVariant(variant.id, 'unit', e.target.value)}
                                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                                >
                                  <option value="">Select unit</option>
                                  {Unit.map((unit) => (
                                    <option key={unit} value={unit}>{unit}</option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Price (₹)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={variant.price}
                                  onChange={(e) => updateVariant(variant.id, 'price', e.target.value)}
                                  placeholder="999"
                                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">MRP (₹)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={variant.cuttedPrice}
                                  onChange={(e) => updateVariant(variant.id, 'cuttedPrice', e.target.value)}
                                  placeholder="1499"
                                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Stock</label>
                                <input
                                  type="number"
                                  value={variant.stock}
                                  onChange={(e) => updateVariant(variant.id, 'stock', e.target.value)}
                                  placeholder="100"
                                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                                />
                              </div>
                            </div>

                            {/* Variant Images */}
                            <div className="mt-6 pt-6 border-t border-slate-200">
                              <label className="block text-sm font-medium text-slate-700 mb-3">
                                Variant Images {variant.images.length > 0 && `(${variant.images.length})`}
                              </label>

                              <div className="relative border-2 border-dashed border-slate-300 bg-white rounded-xl hover:border-slate-400 transition-all">
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  onChange={(e) => handleVariantImageSelect(variant.id, e.target.files)}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className="py-8 px-4 text-center pointer-events-none">
                                  <FiUpload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                                  <p className="text-xs font-medium text-slate-600 mb-1">
                                    Click to upload variant images
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    PNG, JPG, GIF up to 10MB
                                  </p>
                                </div>
                              </div>

                              {variant.images.length > 0 && (
                                <div className="mt-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-medium text-slate-600">
                                      Selected Images
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      Click <FiStar className="inline w-3 h-3" /> for featured
                                    </p>
                                  </div>
                                  <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                                    {variant.images.map((image, imgIndex) => (
                                      <div
                                        key={image.id}
                                        className={`relative group rounded-lg overflow-hidden border-2 transition-all ${imgIndex === variant.featuredImageIndex
                                          ? 'border-orange-500 ring-2 ring-orange-200'
                                          : 'border-slate-200 hover:border-slate-300'
                                          }`}
                                      >
                                        <div className="aspect-square bg-slate-100">
                                          <img
                                            src={image.preview}
                                            alt={`Variant ${index + 1} Image ${imgIndex + 1}`}
                                            className="w-full h-full object-cover"
                                          />
                                        </div>

                                        {imgIndex === variant.featuredImageIndex && (
                                          <div className="absolute top-1 left-1 bg-orange-500 text-white px-1.5 py-0.5 rounded text-xs font-medium flex items-center gap-0.5">
                                            <FiStar className="w-2.5 h-2.5 fill-current" />
                                            Featured
                                          </div>
                                        )}

                                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                                          <button
                                            type="button"
                                            onClick={() => setVariantFeaturedImage(variant.id, imgIndex)}
                                            className="p-1.5 bg-white rounded-md hover:bg-orange-500 hover:text-white transition-colors"
                                            title="Set as featured"
                                          >
                                            <FiStar className={`w-3 h-3 ${imgIndex === variant.featuredImageIndex ? 'fill-current' : ''}`} />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => removeVariantImage(variant.id, image.id)}
                                            className="p-1.5 bg-white text-red-600 rounded-md hover:bg-red-600 hover:text-white transition-colors"
                                            title="Remove image"
                                          >
                                            <FiTrash2 className="w-3 h-3" />
                                          </button>
                                        </div>

                                        <div className="absolute bottom-1 right-1 bg-black bg-opacity-60 text-white px-1.5 py-0.5 rounded text-xs font-medium">
                                          {imgIndex + 1}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={addVariant}
                          className="w-full py-3 px-4 border-2 border-dashed border-slate-300 text-slate-600 rounded-xl hover:border-slate-400 hover:bg-slate-50 transition-all flex items-center justify-center gap-2 group"
                        >
                          <FiPlus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                          <span className="text-sm font-medium">Add Another Variant</span>
                        </button>

                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-xs text-blue-800 leading-relaxed">
                            <strong>💡 Tip:</strong> Each variant is pre-filled with values from the main specifications form above.
                            You can modify any field for each variant. Each variant can have its own set of images - upload them in the variant's image section.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 4. Highlights */}
          <AccordionItem value="highlights" className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <AccordionTrigger className="px-8 py-6 hover:no-underline hover:bg-slate-50 transition-colors">
              <h2 className="text-xl font-medium text-slate-900">4. Highlights</h2>
            </AccordionTrigger>
            <AccordionContent className="px-8 pb-8">
              <div className="space-y-6 pt-4">
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-700">Product Highlights</label>
                  <input name="highlight1" placeholder="Highlight 1" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all" />
                  <input name="highlight2" placeholder="Highlight 2" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all" />
                  <input name="highlight3" placeholder="Highlight 3" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all" />
                  <input name="highlight4" placeholder="Highlight 4" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all" />
                  <input name="highlight5" placeholder="Highlight 5" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all" />
                  <input name="highlight6" placeholder="Highlight 6" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all" />
                </div>
              </div>

              <div className="md:col-span-2 pt-4">
                <label className="block text-sm font-medium text-slate-700 mb-3">Technical Specifications</label>
                <div className="space-y-3">
                  {Array.from({ length: specCount }, (_, index) => (
                    <div key={index} className="grid grid-cols-2 gap-4">
                      <input
                        name={`specTitle${index + 1}`}
                        placeholder={`Specification Title ${index + 1}`}
                        className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                      />
                      <input
                        name={`specDesc${index + 1}`}
                        placeholder={`Specification Description ${index + 1}`}
                        className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                      />
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => setSpecCount(specCount + 1)}
                    className="w-full py-3 px-4 border-2 border-dashed border-slate-300 text-slate-600 rounded-xl hover:border-slate-400 hover:bg-slate-50 transition-all flex items-center justify-center gap-2 group"
                  >
                    <FiPlus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium">Add Specification</span>
                  </button>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 5. Care Instructions */}
          <AccordionItem value="care" className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <AccordionTrigger className="px-8 py-6 hover:no-underline hover:bg-slate-50 transition-colors">
              <h2 className="text-xl font-medium text-slate-900">5. Care Instructions</h2>
            </AccordionTrigger>
            <AccordionContent className="px-8 pb-8">
              <div className="space-y-3 pt-4">
                <label className="block text-sm font-medium text-slate-700">Care Instructions <span className="text-slate-400 font-normal">(optional)</span></label>
                <p className="text-xs text-slate-500">Each instruction has a bold title and a description — e.g. Title: "Daily Cleaning", Description: "Sweep or vacuum regularly."</p>
                {careItems.map((item, index) => (
                  <div key={item.id} className="flex gap-2 items-start">
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <input
                        value={item.title}
                        onChange={e => setCareItems(prev => prev.map(c => c.id === item.id ? { ...c, title: e.target.value } : c))}
                        placeholder={`Title (e.g. Daily Cleaning)`}
                        className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all font-medium"
                      />
                      <input
                        value={item.description}
                        onChange={e => setCareItems(prev => prev.map(c => c.id === item.id ? { ...c, description: e.target.value } : c))}
                        placeholder={`Description (e.g. Sweep or vacuum regularly)`}
                        className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                      />
                    </div>
                    {careItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setCareItems(prev => prev.filter(c => c.id !== item.id))}
                        className="mt-1 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove instruction"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setCareItems(prev => [...prev, { id: generateUUID(), title: '', description: '' }])}
                  className="w-full py-3 px-4 border-2 border-dashed border-slate-300 text-slate-600 rounded-xl hover:border-slate-400 hover:bg-slate-50 transition-all flex items-center justify-center gap-2 group"
                >
                  <FiPlus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium">Add Care Instruction</span>
                </button>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 6. Product Tags */}
          <AccordionItem value="tags" className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <AccordionTrigger className="px-8 py-6 hover:no-underline hover:bg-slate-50 transition-colors">
              <h2 className="text-xl font-medium text-slate-900">6. Product Tags</h2>
            </AccordionTrigger>
            <AccordionContent className="px-8 pb-8">
              <div className="pt-4">
                <label className="block text-sm font-medium text-slate-700 mb-4">
                  Select tags to display on product cards
                </label>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 hover:bg-blue-50 hover:border-blue-300 transition-all cursor-pointer group">
                    <input
                      type="checkbox"
                      name="tags"
                      value="popular"
                      className="w-4 h-4 text-blue-600 bg-white border-slate-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700">
                      ⭐ Popular
                    </span>
                  </label>

                  <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 hover:bg-yellow-50 hover:border-yellow-300 transition-all cursor-pointer group">
                    <input
                      type="checkbox"
                      name="tags"
                      value="trending"
                      className="w-4 h-4 text-yellow-600 bg-white border-slate-300 rounded focus:ring-2 focus:ring-yellow-500 cursor-pointer"
                    />
                    <span className="text-sm font-medium text-slate-700 group-hover:text-yellow-700">
                      🔥 Trending
                    </span>
                  </label>

                  <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 hover:bg-green-50 hover:border-green-300 transition-all cursor-pointer group">
                    <input
                      type="checkbox"
                      name="tags"
                      value="new"
                      className="w-4 h-4 text-green-600 bg-white border-slate-300 rounded focus:ring-2 focus:ring-green-500 cursor-pointer"
                    />
                    <span className="text-sm font-medium text-slate-700 group-hover:text-green-700">
                      ✨ New
                    </span>
                  </label>

                  <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 hover:bg-purple-50 hover:border-purple-300 transition-all cursor-pointer group">
                    <input
                      type="checkbox"
                      name="tags"
                      value="premium"
                      className="w-4 h-4 text-purple-600 bg-white border-slate-300 rounded focus:ring-2 focus:ring-purple-500 cursor-pointer"
                    />
                    <span className="text-sm font-medium text-slate-700 group-hover:text-purple-700">
                      💎 Premium
                    </span>
                  </label>

                  <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 hover:bg-pink-50 hover:border-pink-300 transition-all cursor-pointer group">
                    <input
                      type="checkbox"
                      name="tags"
                      value="exclusive"
                      className="w-4 h-4 text-pink-600 bg-white border-slate-300 rounded focus:ring-2 focus:ring-pink-500 cursor-pointer"
                    />
                    <span className="text-sm font-medium text-slate-700 group-hover:text-pink-700">
                      👑 Exclusive
                    </span>
                  </label>

                  <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 hover:bg-slate-100 hover:border-slate-400 transition-all cursor-pointer group">
                    <input
                      type="checkbox"
                      name="tags"
                      value="classic"
                      className="w-4 h-4 text-slate-600 bg-white border-slate-300 rounded focus:ring-2 focus:ring-slate-500 cursor-pointer"
                    />
                    <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">
                      🏛️ Classic
                    </span>
                  </label>

                  <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 hover:bg-orange-50 hover:border-orange-300 transition-all cursor-pointer group">
                    <input
                      type="checkbox"
                      name="tags"
                      value="bestseller"
                      className="w-4 h-4 text-orange-600 bg-white border-slate-300 rounded focus:ring-2 focus:ring-orange-500 cursor-pointer"
                    />
                    <span className="text-sm font-medium text-slate-700 group-hover:text-orange-700">
                      🏆 Best Seller
                    </span>
                  </label>

                  <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 hover:bg-red-50 hover:border-red-300 transition-all cursor-pointer group">
                    <input
                      type="checkbox"
                      name="tags"
                      value="limited"
                      className="w-4 h-4 text-red-600 bg-white border-slate-300 rounded focus:ring-2 focus:ring-red-500 cursor-pointer"
                    />
                    <span className="text-sm font-medium text-slate-700 group-hover:text-red-700">
                      ⏰ Limited Edition
                    </span>
                  </label>
                </div>

                <p className="text-xs text-slate-500 mt-4">
                  Selected tags will appear as badges on the product card for better visibility
                </p>

                <div className="mt-8 pt-8 border-t border-slate-200">
                  <label className="block text-sm font-medium text-slate-700 mb-4">
                    Applications (Room Types)
                  </label>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 hover:bg-amber-50 hover:border-amber-300 transition-all cursor-pointer group">
                      <input
                        type="checkbox"
                        name="tags"
                        value="kitchen"
                        className="w-4 h-4 text-amber-600 bg-white border-slate-300 rounded focus:ring-2 focus:ring-amber-500 cursor-pointer"
                      />
                      <span className="text-sm font-medium text-slate-700 group-hover:text-amber-700">
                        🍳 Kitchen
                      </span>
                    </label>

                    <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 hover:bg-cyan-50 hover:border-cyan-300 transition-all cursor-pointer group">
                      <input
                        type="checkbox"
                        name="tags"
                        value="bathroom"
                        className="w-4 h-4 text-cyan-600 bg-white border-slate-300 rounded focus:ring-2 focus:ring-cyan-500 cursor-pointer"
                      />
                      <span className="text-sm font-medium text-slate-700 group-hover:text-cyan-700">
                        🚿 Bathroom
                      </span>
                    </label>

                    <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 hover:bg-indigo-50 hover:border-indigo-300 transition-all cursor-pointer group">
                      <input
                        type="checkbox"
                        name="tags"
                        value="living-room"
                        className="w-4 h-4 text-indigo-600 bg-white border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-700">
                        🛋️ Living Room
                      </span>
                    </label>

                    <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 hover:bg-violet-50 hover:border-violet-300 transition-all cursor-pointer group">
                      <input
                        type="checkbox"
                        name="tags"
                        value="bedroom"
                        className="w-4 h-4 text-violet-600 bg-white border-slate-300 rounded focus:ring-2 focus:ring-violet-500 cursor-pointer"
                      />
                      <span className="text-sm font-medium text-slate-700 group-hover:text-violet-700">
                        🛏️ Bedroom
                      </span>
                    </label>

                    <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 transition-all cursor-pointer group">
                      <input
                        type="checkbox"
                        name="tags"
                        value="outdoor"
                        className="w-4 h-4 text-emerald-600 bg-white border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="text-sm font-medium text-slate-700 group-hover:text-emerald-700">
                        🌳 Outdoor
                      </span>
                    </label>

                    <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 hover:bg-gray-50 hover:border-gray-400 transition-all cursor-pointer group">
                      <input
                        type="checkbox"
                        name="tags"
                        value="commercial"
                        className="w-4 h-4 text-gray-600 bg-white border-slate-300 rounded focus:ring-2 focus:ring-gray-500 cursor-pointer"
                      />
                      <span className="text-sm font-medium text-slate-700 group-hover:text-gray-900">
                        🏢 Commercial
                      </span>
                    </label>
                  </div>

                  <p className="text-xs text-slate-500 mt-4">
                    Select room types where this product can be used
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={() => router.push('/admin/products')}
            className="flex-1 py-4 px-6 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl hover:bg-slate-50 transition-all duration-200 font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-4 px-6 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Creating...</span>
              </>
            ) : (
              <>
                <FiCheck className="w-5 h-5" />
                <span>Create Product</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}