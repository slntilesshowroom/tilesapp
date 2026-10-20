"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FiUpload, FiCheck, FiX, FiArrowLeft, FiStar, FiTrash2, FiPlus, FiCopy, FiAlertTriangle, FiInfo } from "react-icons/fi";
import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useCategories } from "@/hooks/category/queries/useCategories";
import { colorMapping } from "@/constants/colors";
import { revalidateProducts } from "@/app/actions";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1';

// Finish types for tiles and products
const FINISH_TYPES = [
  'Glossy', 'High Gloss', 'Super Gloss', 'Matte', 'Satin', 'Polished',
  'Semi-Polished', 'Lappato', 'Mirror Finish', 'Brushed Finish',
  'Chrome Finish', 'Powder Coated', 'Painted', 'Enamel Coated',
  'Textured', 'Structured', 'Rustic', 'Anti-Skid', 'Sugar Finish',
  'Carving', '3D Finish', 'Wooden Finish', 'Marble Finish',
  'Granite Finish', 'Stone Finish', 'Cement Finish', 'Concrete Finish',
  'Metallic Finish', 'Digital Printed', 'Frosted', 'Transparent',
  'Opaque', 'White Finish', 'Black Finish', 'Silver Finish',
  'Gold Finish', 'Rose Gold Finish'
];

// Material types for tiles and products
const MATERIAL_TYPES = [
  'Ceramic', 'Glazed Ceramic', 'Porcelain', 'Vitrified', 'Double Charge Vitrified',
  'Full Body Vitrified', 'GVT (Glazed Vitrified Tiles)', 'PGVT (Polished Glazed Vitrified Tiles)',
  'Marble', 'Marble Look', 'Granite', 'Granite Look', 'Stone', 'Slate', 'Travertine',
  'Quartz', 'Wood Look', 'Cement Finish', 'Concrete Look', 'Mosaic', '3D Tiles',
  'Digital Wall Tiles', 'Elevation Tiles', 'Glass Tiles', 'Metallic Finish',
  'Outdoor Tiles', 'Parking Tiles', 'Anti-Skid Tiles', 'Paver Tiles',
  'Vitreous China', 'Stainless Steel', 'Mild Steel', 'Cast Iron', 'Brass',
  'Copper', 'Aluminium', 'Galvanized Iron (GI)', 'PVC', 'CPVC', 'UPVC',
  'HDPE', 'Plastic', 'ABS Plastic', 'FRP (Fibre Reinforced Plastic)',
  'Glass', 'Toughened Glass', 'Acrylic', 'Cement', 'Concrete', 'Wood',
  'Engineered Wood', 'Plywood', 'MDF', 'HDF', 'Laminated Board',
  'Solar Glass', 'Silicon (Solar Grade)', 'Rubber'
];

// Unit types for tiles and products
const Unit = [
  'Box', 'Pcs', 'Sq.ft', 'Sq.m', 'Cartoon', 'MM', 'CM', 'Inches', 'Feet', 'Meters', 'Kg',
  'Gram', 'Set', 'Pair', 'ML', 'Litre', 'Bag', 'Bucket', 'Unit'
];

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export default function EditProductPage({ params }: EditProductPageProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [jsonInput, setJsonInput] = useState('');
  const [showJsonWarning, setShowJsonWarning] = useState(false);
  const [showJsonFormat, setShowJsonFormat] = useState(false);
  const [formatCopied, setFormatCopied] = useState(false);
  const [productId, setProductId] = useState<string>(''); // FIX: Added missing state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadProgress, setUploadProgress] = useState('');
  const [product, setProduct] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [selectedSubSubcategory, setSelectedSubSubcategory] = useState('');
  const [imagePreviews, setImagePreviews] = useState<Array<{ file?: File; preview: string; id: string; isExisting?: boolean }>>([]);
  const [featuredImageIndex, setFeaturedImageIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [specCount, setSpecCount] = useState(2);
  const [selectedUnit, setSelectedUnit] = useState('');
  const [careItems, setCareItems] = useState<Array<{ id: string; title: string; description: string }>>([
    { id: crypto.randomUUID?.() || Math.random().toString(36), title: '', description: '' },
  ]);

  // Variants state
  const [hasVariants, setHasVariants] = useState(false);
  const [variants, setVariants] = useState<Array<{
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
    images: Array<{ preview: string; id: string; isExisting?: boolean }>;
    featuredImageIndex: number;
  }>>([]);

  const { categories, isLoading: categoriesLoading } = useCategories();

  // Get selected category object
  const selectedCategoryObj = categories.find((cat: any) => cat._id === selectedCategory);

  // Get subcategories based on selected parent
  const subcategories = selectedCategoryObj?.children || [];

  // Get selected subcategory object
  const selectedSubcategoryObj = subcategories.find((sub: any) => sub._id === selectedSubcategory);

  // Get sub-subcategories based on selected subcategory
  const subSubcategories = selectedSubcategoryObj?.children || [];

  useEffect(() => {
    params.then(({ id }) => {
      setProductId(id);
      fetchProduct(id);
    });
  }, [params]);

  // Initialize category dropdowns once BOTH product and categories are loaded
  useEffect(() => {
    if (!product || categories.length === 0) return;

    const productCategoryId = product.category?._id || product.category || '';
    const productSubcategoryId = product.subcategory?._id || product.subcategory || '';

    // Check if productCategoryId is a top-level category
    const topLevel = categories.find((cat: any) => cat._id === productCategoryId);
    if (topLevel) {
      setSelectedCategory(topLevel._id);

      if (productSubcategoryId) {
        // Check if it's a direct child (Brand level)
        const brand = topLevel.children?.find((c: any) => c._id === productSubcategoryId);
        if (brand) {
          setSelectedSubcategory(brand._id);
        } else {
          // Check if it's a grandchild (Sub-category level)
          for (const child of (topLevel.children || [])) {
            const subSub = child.children?.find((c: any) => c._id === productSubcategoryId);
            if (subSub) {
              setSelectedSubcategory(child._id);
              setSelectedSubSubcategory(subSub._id);
              break;
            }
          }
        }
      }
    } else {
      // Legacy: product.category was saved as a deeper level — walk the tree to restore all levels
      for (const parent of categories) {
        if (parent._id === productCategoryId) {
          setSelectedCategory(parent._id);
          break;
        }
        if (parent.children) {
          for (const child of parent.children) {
            if (child._id === productCategoryId) {
              setSelectedCategory(parent._id);
              setSelectedSubcategory(child._id);
              break;
            }
            if (child.children) {
              for (const subChild of child.children) {
                if (subChild._id === productCategoryId) {
                  setSelectedCategory(parent._id);
                  setSelectedSubcategory(child._id);
                  setSelectedSubSubcategory(subChild._id);
                  break;
                }
              }
            }
          }
        }
      }
    }
  }, [product, categories]);

  const fetchProduct = async (id: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/product/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      const result = await response.json();

      if (result.success) {
        setProduct(result.product);
        setSelectedUnit(result.product.unit || '');

        // Set existing images
        if (result.product.images && result.product.images.length > 0) {
          const existingImages = result.product.images.map((img: any, index: number) => ({
            preview: img.url,
            id: `existing-${index}`,
            isExisting: true
          }));
          setImagePreviews(existingImages);

          // Find featured image
          const featuredIndex = result.product.images.findIndex((img: any) => img.isFeatured);
          if (featuredIndex !== -1) {
            setFeaturedImageIndex(featuredIndex);
          }
        }

        // Set spec count based on existing specs
        if (result.product.specifications && result.product.specifications.length > 0) {
          setSpecCount(Math.max(2, result.product.specifications.length));
        }

        // Set care instructions
        if (result.product.careInstructions && result.product.careInstructions.length > 0) {
          setCareItems(result.product.careInstructions.map((c: any) => ({
            id: crypto.randomUUID?.() || Math.random().toString(36),
            title: c.title || '',
            description: c.description || '',
          })));
        }

        // FIX: Load existing variants with all fields including images
        if (result.product.hasVariants && result.product.variants && result.product.variants.length > 0) {
          setHasVariants(true);
          const loadedVariants = result.product.variants.map((v: any, index: number) => {
            // Load variant images
            const variantImages = v.images && Array.isArray(v.images)
              ? v.images.map((img: any, imgIndex: number) => ({
                preview: img.url,
                id: `existing-variant-${index}-img-${imgIndex}`,
                isExisting: true
              }))
              : [];

            // Find featured image index
            const featuredIndex = v.images?.findIndex((img: any) => img.isFeatured) || 0;

            return {
              id: `variant-${index}`,
              color: v.color || '',
              size: v.size || '',
              productId: v.productId || '',
              finish: v.finish || '',
              material: v.material || '',
              unit: v.unit || '',
              price: v.price?.toString() || '',
              cuttedPrice: v.cuttedPrice?.toString() || '',
              stock: v.stock?.toString() || '',
              images: variantImages,
              featuredImageIndex: featuredIndex >= 0 ? featuredIndex : 0
            };
          });
          setVariants(loadedVariants);
        }
      } else {
        setError(result.message || 'Failed to fetch product');
      }
    } catch (err) {
      console.error('Error fetching product:', err);
      setError('Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  // Variant management functions
  const addVariant = () => {
    setVariants([...variants, {
      id: Math.random().toString(36).substr(2, 9),
      color: '',
      size: '',
      productId: '',
      finish: '',
      material: '',
      unit: '',
      price: '',
      cuttedPrice: '',
      stock: '',
      images: [],
      featuredImageIndex: 0
    }]);
  };

  const updateVariant = (id: string, field: string, value: string) => {
    setVariants(variants.map(v =>
      v.id === id ? { ...v, [field]: value } : v
    ));
  };

  const removeVariant = (id: string) => {
    setVariants(variants.filter(v => v.id !== id));
  };

  const handleVariantImageSelect = (variantId: string, files: FileList | null) => {
    if (!files) return;

    const newImages = Array.from(files).map(file => ({
      file,
      preview: URL.createObjectURL(file),
      id: Math.random().toString(36).substr(2, 9),
      isExisting: false
    }));

    setVariants(variants.map(v =>
      v.id === variantId
        ? { ...v, images: [...v.images, ...newImages] }
        : v
    ));
  };

  const removeVariantImage = (variantId: string, imageId: string) => {
    setVariants(variants.map(v => {
      if (v.id === variantId) {
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
    setVariants(variants.map(v =>
      v.id === variantId ? { ...v, featuredImageIndex: index } : v
    ));
  };

  const handleImageSelect = (files: FileList | null) => {
    if (!files) return;

    const newImages = Array.from(files).map(file => ({
      file,
      preview: URL.createObjectURL(file),
      id: Math.random().toString(36).substr(2, 9),
      isExisting: false
    }));

    setImagePreviews(prev => [...prev, ...newImages]);
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
    setImagePreviews(prev => {
      const newPreviews = prev.filter(img => img.id !== id);
      if (featuredImageIndex >= newPreviews.length) {
        setFeaturedImageIndex(Math.max(0, newPreviews.length - 1));
      }
      return newPreviews;
    });
  };

  const setFeaturedImage = (index: number) => {
    setFeaturedImageIndex(index);
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

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData(e.currentTarget);
      setUploadProgress('Preparing product data...');

      // Collect highlights
      const highlights = [];
      for (let i = 1; i <= 6; i++) {
        const highlight = formData.get(`highlight${i}`) as string;
        if (highlight && highlight.trim()) {
          highlights.push(highlight.trim());
        }
      }

      // Collect care instructions from controlled state
      const careInstructions = careItems
        .filter(c => c.title.trim() || c.description.trim())
        .map(c => JSON.stringify({ title: c.title.trim(), description: c.description.trim() }));

      // Collect specifications
      const specifications = [];
      for (let i = 1; i <= specCount; i++) {
        const title = formData.get(`specTitle${i}`) as string;
        const description = formData.get(`specDesc${i}`) as string;
        if (title && description) {
          specifications.push(JSON.stringify({ title, description }));
        }
      }

      // Collect tags
      const tags = formData.getAll('tags') as string[];

      // Get form values
      const categoryValue = formData.get('category') as string;
      const subcategoryValue = formData.get('subcategory') as string;
      const subSubcategoryValue = formData.get('subSubcategory') as string;

      const requestBody: any = {
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        shortDescription: formData.get('shortDescription') as string,
        price: Number(formData.get('price')),
        cuttedPrice: Number(formData.get('cuttedPrice')),
        category: categoryValue,
        subcategory: subSubcategoryValue || subcategoryValue || undefined,
        brandname: formData.get('brandname') as string,
        stock: Number(formData.get('stock')),
        warranty: Number(formData.get('warranty')),
        highlights,
        careInstructions,
        specifications,
        material: formData.get('material') as string || undefined,
        finish: formData.get('finish') as string || undefined,
        color: formData.get('color') as string || undefined,
        productId: formData.get('productId') as string || undefined,
        size: formData.get('size') as string || undefined,
        unit: selectedUnit || undefined,
        coverage: formData.get('coverage') ? Number(formData.get('coverage')) : undefined,
        tilesPerBox: formData.get('tilesPerBox') ? Number(formData.get('tilesPerBox')) : undefined,
        pricePerSqft: formData.get('pricePerSqft') ? Number(formData.get('pricePerSqft')) : undefined,
      };

      // Add tags if selected
      if (tags.length > 0) {
        requestBody.tags = JSON.stringify(tags);
      }

      // FIX: Handle variants properly with image uploads
      requestBody.hasVariants = hasVariants;
      if (hasVariants && variants.length > 0) {
        setUploadProgress('Processing variant images...');

        const variantsToSend = [];
        for (const variant of variants) {
          const variantData: any = {
            productId: variant.productId,
            color: variant.color,
            size: variant.size,
            finish: variant.finish,
            material: variant.material,
            unit: variant.unit,
            price: variant.price,
            cuttedPrice: variant.cuttedPrice,
            stock: variant.stock,
            featuredImageIndex: variant.featuredImageIndex
          };

          // Process variant images - upload new ones, keep existing ones
          if (variant.images && variant.images.length > 0) {
            const variantImages = [];
            for (let i = 0; i < variant.images.length; i++) {
              const img = variant.images[i];
              if (img.isExisting) {
                // Keep existing image URL
                variantImages.push(img.preview);
              } else if ((img as any).file) {
                // Upload new image
                setUploadProgress(`Processing variant ${variants.indexOf(variant) + 1} image ${i + 1}...`);
                const base64 = await fileToBase64((img as any).file);
                variantImages.push(base64);
              }
            }
            variantData.images = variantImages;
          }

          variantsToSend.push(variantData);
        }

        requestBody.variants = JSON.stringify(variantsToSend);
      }

      // Handle new images if uploaded
      const newImageFiles = imagePreviews.filter(img => !img.isExisting && img.file);
      if (newImageFiles.length > 0) {
        setUploadProgress('Processing images...');
        const images = [];
        for (let i = 0; i < newImageFiles.length; i++) {
          if (newImageFiles[i].file) {
            setUploadProgress(`Processing image ${i + 1} of ${newImageFiles.length}...`);
            const base64 = await fileToBase64(newImageFiles[i].file!);
            images.push(base64);
          }
        }
        requestBody.images = images;
      }

      // FIX: Send featured image index to update which image is featured
      requestBody.featuredImageIndex = featuredImageIndex;

      // Handle new logo if uploaded
      const logoFile = formData.get('logo') as File;
      if (logoFile && logoFile.size > 0) {
        setUploadProgress('Processing brand logo...');
        requestBody.logo = await fileToBase64(logoFile);
      }

      setUploadProgress('Updating product...');
      const token = localStorage.getItem('auth_token');

      console.log('=== FRONTEND: SENDING UPDATE ===');
      console.log('Product ID:', productId);
      console.log('Request Body:', requestBody);

      const response = await fetch(`${API_BASE_URL}/admin/product/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      console.log('=== FRONTEND: RECEIVED RESPONSE ===');
      console.log('Response Status:', response.status);
      console.log('Response OK:', response.ok);
      console.log('Result:', result);

      if (!response.ok || !result.success) {
        console.error('=== UPDATE FAILED ===');
        console.error('Error:', result.message);
        setError(result.message || 'Error updating product');
        setUploadProgress('');
        return;
      }

      setSuccess('Product updated successfully!');
      setUploadProgress('');
      await revalidateProducts(productId);
      setTimeout(() => {
        router.push('/admin/products');
      }, 1500);

    } catch (err: any) {
      console.error('Error:', err);
      if (err?.message?.toLowerCase().includes('network') || err?.message?.toLowerCase().includes('fetch')) {
        setError('Network error — please check your internet connection and try again.');
      } else if (err?.message) {
        setError(err.message);
      } else {
        setError('Failed to update product. Please try again or contact support if the issue persists.');
      }
      setUploadProgress('');
    } finally {
      setSaving(false);
    }
  };

  // JSON import handler — fills form fields from pasted JSON (with warning)
  const handleJsonImport = () => {
    if (!jsonInput.trim()) return;
    let data: any;
    try {
      data = JSON.parse(jsonInput.trim());
    } catch {
      setError('Invalid JSON format. Please check and try again.');
      return;
    }
    setError('');
    setShowJsonWarning(false);

    const form = formRef.current;
    if (!form) return;

    // Helper to set uncontrolled input/textarea value
    const setField = (name: string, value: string) => {
      const el = form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | null;
      if (el && value !== undefined && value !== null) {
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
    if (data.brandname) setField('brandname', data.brandname);

    // Controlled field
    if (data.unit !== undefined) setSelectedUnit(String(data.unit));

    // Uncontrolled fields
    if (data.coverage !== undefined) setField('coverage', String(data.coverage));
    if (data.price !== undefined) setField('price', String(data.price));
    if (data.pricePerSqft !== undefined) setField('pricePerSqft', String(data.pricePerSqft));
    if (data.productId !== undefined) setField('productId', String(data.productId));
    if (data.material !== undefined) setField('material', String(data.material));
    if (data.finish !== undefined) setField('finish', String(data.finish));
    if (data.color !== undefined) setField('color', String(data.color));
    if (data.size !== undefined) setField('size', String(data.size));
    if (data.cuttedPrice !== undefined) setField('cuttedPrice', String(data.cuttedPrice));
    if (data.stock !== undefined) setField('stock', String(data.stock));
    if (data.tilesPerBox !== undefined) setField('tilesPerBox', String(data.tilesPerBox));

    // Highlights (uncontrolled)
    if (Array.isArray(data.highlights)) {
      data.highlights.forEach((h: string, i: number) => {
        if (i < 6) setField(`highlight${i + 1}`, h);
      });
    }

    // Specifications list (uncontrolled)
    if (Array.isArray(data.specifications) && data.specifications.length > 0) {
      setSpecCount(Math.max(2, data.specifications.length));
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

    // Tags (checkboxes)
    if (Array.isArray(data.tags)) {
      const checkboxes = form.querySelectorAll<HTMLInputElement>('input[name="tags"]');
      checkboxes.forEach(cb => {
        cb.checked = data.tags.includes(cb.value);
      });
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
              if (matchedSub) setSelectedSubSubcategory(matchedSub._id);
            }
          }
        }
      }
    }

    setJsonInput('');
    setSuccess('JSON imported successfully! Review the changes before saving.');
    setTimeout(() => setSuccess(''), 3000);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading product...</p>
        </div>
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-2 text-orange-500 hover:text-orange-600"
        >
          <FiArrowLeft />
          Back to Products
        </Link>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <form ref={formRef} onSubmit={handleSubmit} className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin/products"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4"
          >
            <FiArrowLeft />
            Back to Products
          </Link>
          <h1 className="text-4xl font-light text-slate-900 mb-3 tracking-tight">Edit Product</h1>
          <p className="text-slate-500 text-lg font-light">Update product information</p>
        </div>

        {/* Status Messages */}
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
                onClick={() => { if (jsonInput.trim()) setShowJsonWarning(true); }}
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

        {/* JSON Import Warning Modal */}
        {showJsonWarning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-amber-100 rounded-full">
                  <FiAlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Overwrite Warning</h3>
              </div>
              <p className="text-sm text-slate-600 mb-6">
                This will overwrite the current form values with data from the JSON. Any unsaved changes will be lost. Are you sure you want to continue?
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowJsonWarning(false)}
                  className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleJsonImport}
                  className="px-5 py-2.5 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-all text-sm font-medium"
                >
                  Yes, Overwrite
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FIX: Open all sections by default so FormData includes all inputs */}
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
                    defaultValue={product.name}
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
                    defaultValue={product.description}
                    placeholder="Elegant marble tiles with luxurious finish..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all resize-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Short Description</label>
                  <input
                    name="shortDescription"
                    required
                    defaultValue={product.shortDescription}
                    placeholder="Short description of the product"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                  />
                </div>

                {/* Category (Level 0) */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Category *</label>
                  <select
                    name="category"
                    required
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setSelectedSubcategory('');
                      setSelectedSubSubcategory('');
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

                {/* Subcategory / Brand (Level 1) */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Brand</label>
                  <select
                    name="subcategory"
                    value={selectedSubcategory}
                    onChange={(e) => {
                      setSelectedSubcategory(e.target.value);
                      setSelectedSubSubcategory('');
                    }}
                    disabled={!selectedCategory || subcategories.length === 0}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">{!selectedCategory ? 'Select category first' : 'Select brand'}</option>
                    {subcategories.map((subcat: any) => (
                      <option key={subcat._id} value={subcat._id}>
                        {subcat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sub-subcategory (Level 2) */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Sub-category</label>
                  <select
                    name="subSubcategory"
                    value={selectedSubSubcategory}
                    onChange={(e) => setSelectedSubSubcategory(e.target.value)}
                    disabled={!selectedSubcategory || subSubcategories.length === 0}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">{!selectedSubcategory ? 'Select brand first' : (subSubcategories.length > 0 ? 'Select sub-category' : 'No sub-categories')}</option>
                    {subSubcategories.map((subSubcat: any) => (
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
                {/* FIX: Product ID moved to top like Create form */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Product ID</label>
                  <input name="productId" defaultValue={product.productId} placeholder="SKU-001" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all" />
                </div>

                {/* Material */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Material</label>
                  <select name="material" defaultValue={product.material} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all">
                    <option value="">Select material</option>
                    {MATERIAL_TYPES.map((material) => (
                      <option key={material} value={material}>
                        {material}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Finish */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Finish</label>
                  <select name="finish" defaultValue={product.finish} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all">
                    <option value="">Select finish</option>
                    {FINISH_TYPES.map((finish) => (
                      <option key={finish} value={finish}>
                        {finish}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Color */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Color</label>
                  <select name="color" defaultValue={product.color} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all">
                    <option value="">Select color</option>
                    {Object.keys(colorMapping).map((color) => (
                      <option key={color} value={color}>
                        {color.charAt(0).toUpperCase() + color.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Size */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Size</label>
                  <input name="size" defaultValue={product.size} placeholder="24x24, 1200x600mm, etc." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all" />
                </div>

                {/* Unit */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Unit</label>
                  <select
                    name="unit"
                    value={selectedUnit}
                    onChange={(e) => setSelectedUnit(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                  >
                    <option value="">Select unit</option>
                    {Unit.map((unit) => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>

                {selectedUnit === 'Sq.ft' && (
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
                        defaultValue={product.coverage || ''}
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
                        defaultValue={product.tilesPerBox || ''}
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
                        defaultValue={product.pricePerSqft || ''}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                      />
                    </div>
                  </>
                )}

                {/* Price */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Price (₹) {selectedUnit === 'Sq.ft' ? '— per Box' : ''}</label>
                  <input
                    name="price"
                    type="number"
                    step="0.01"
                    defaultValue={product.price}
                    placeholder="999"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                  />
                </div>

                {/* MRP */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">MRP (₹)</label>
                  <input
                    name="cuttedPrice"
                    type="number"
                    step="0.01"
                    defaultValue={product.cuttedPrice}
                    placeholder="1499"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                  />
                </div>

                {/* Stock */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Stock</label>
                  <input
                    name="stock"
                    type="number"
                    defaultValue={product.stock}
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
                  </div>
                </div>

              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 3. Product Variants - moved to separate accordion like Create form */}
          <AccordionItem value="variants" className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <AccordionTrigger className="px-8 py-6 hover:no-underline hover:bg-slate-50 transition-colors">
              <h2 className="text-xl font-medium text-slate-900">3. Product Variants (Optional)</h2>
            </AccordionTrigger>
            <AccordionContent className="px-8 pb-8">
              <div className="space-y-6 pt-4">
                {/* Enable Variants Toggle */}
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
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${hasVariants ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {/* Variants List */}
                {hasVariants && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-slate-700">Variant Combinations</label>
                      <span className="text-xs text-slate-500">{variants.length} variant{variants.length !== 1 ? 's' : ''}</span>
                    </div>

                    {variants.length === 0 ? (
                      <div className="text-center py-8 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                        <p className="text-sm text-slate-500 mb-3">No variants added yet</p>
                        <button type="button" onClick={addVariant} className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium">
                          Add First Variant
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {variants.map((variant, index) => (
                          <div key={variant.id} className="p-6 bg-white rounded-xl border-2 border-slate-200 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <span className="text-base font-semibold text-slate-900">Variant {index + 1}</span>
                                {variant.color && (
                                  <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-md">
                                    {variant.color}
                                  </span>
                                )}
                                {variant.size && (
                                  <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-md">
                                    {variant.size}
                                  </span>
                                )}
                              </div>
                              <button type="button" onClick={() => removeVariant(variant.id)} className="text-red-600 hover:text-red-700 text-sm font-medium">Remove</button>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                              <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Product ID</label>
                                <input type="text" value={variant.productId || ''} onChange={(e) => updateVariant(variant.id, 'productId', e.target.value)} placeholder="SKU-001" className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all" />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Color</label>
                                <select value={variant.color} onChange={(e) => updateVariant(variant.id, 'color', e.target.value)} className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all">
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
                                <input type="text" value={variant.size} onChange={(e) => updateVariant(variant.id, 'size', e.target.value)} placeholder="24x24, 12x12..." className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all" />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Finish</label>
                                <select value={variant.finish} onChange={(e) => updateVariant(variant.id, 'finish', e.target.value)} className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all">
                                  <option value="">Select finish</option>
                                  {FINISH_TYPES.map((finish) => (
                                    <option key={finish} value={finish}>{finish}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Material</label>
                                <select value={variant.material} onChange={(e) => updateVariant(variant.id, 'material', e.target.value)} className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all">
                                  <option value="">Select material</option>
                                  {MATERIAL_TYPES.map((material) => (
                                    <option key={material} value={material}>{material}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Unit</label>
                                <select value={variant.unit} onChange={(e) => updateVariant(variant.id, 'unit', e.target.value)} className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all">
                                  <option value="">Select unit</option>
                                  {Unit.map((unit) => (
                                    <option key={unit} value={unit}>{unit}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Price (₹)</label>
                                <input type="number" value={variant.price} onChange={(e) => updateVariant(variant.id, 'price', e.target.value)} placeholder="999" className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all" />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">MRP (₹)</label>
                                <input type="number" value={variant.cuttedPrice} onChange={(e) => updateVariant(variant.id, 'cuttedPrice', e.target.value)} placeholder="1499" className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all" />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Stock</label>
                                <input type="number" value={variant.stock} onChange={(e) => updateVariant(variant.id, 'stock', e.target.value)} placeholder="100" className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all" />
                              </div>
                            </div>

                            {/* Variant Images */}
                            <div className="mt-4 pt-4 border-t border-slate-200">
                              <label className="block text-xs font-medium text-slate-600 mb-2">
                                Variant Images {variant.images.length > 0 && `(${variant.images.length})`}
                              </label>

                              {/* Upload Area */}
                              <div className="relative border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 hover:bg-slate-100 transition-all mb-3">
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  onChange={(e) => handleVariantImageSelect(variant.id, e.target.files)}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className="py-6 px-4 text-center pointer-events-none">
                                  <FiUpload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                                  <p className="text-xs text-slate-600">Click or drag images for this variant</p>
                                </div>
                              </div>

                              {/* Image Previews */}
                              {variant.images.length > 0 && (
                                <div className="grid grid-cols-4 gap-2">
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
                                        <div className="absolute top-1 left-1 bg-orange-500 text-white px-1 py-0.5 rounded text-xs font-medium flex items-center gap-1">
                                          <FiStar className="w-2 h-2 fill-current" />
                                        </div>
                                      )}

                                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                                        <button
                                          type="button"
                                          onClick={() => setVariantFeaturedImage(variant.id, imgIndex)}
                                          className="p-1.5 bg-white rounded hover:bg-orange-500 hover:text-white transition-colors"
                                          title="Set as featured"
                                        >
                                          <FiStar className={`w-3 h-3 ${imgIndex === variant.featuredImageIndex ? 'fill-current' : ''}`} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => removeVariantImage(variant.id, image.id)}
                                          className="p-1.5 bg-white text-red-600 rounded hover:bg-red-600 hover:text-white transition-colors"
                                          title="Remove"
                                        >
                                          <FiTrash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        <button type="button" onClick={addVariant} className="w-full py-3 px-4 border-2 border-dashed border-slate-300 text-slate-600 rounded-xl hover:border-slate-400 hover:bg-slate-50 transition-all flex items-center justify-center gap-2 group">
                          <FiPlus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                          <span className="text-sm font-medium">Add Another Variant</span>
                        </button>

                        {/* Helpful Note */}
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-xs text-blue-800 leading-relaxed">
                            <strong>💡 Tip:</strong> Each variant should have at least one unique attribute (Color, Size, or Finish).
                            For example: If you have different colors, fill in the Color field for each variant.
                            If you have different sizes, fill in the Size field. You can leave other fields empty if not applicable.
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
                  <input name="highlight1" defaultValue={product.highlights?.[0]} placeholder="Highlight 1" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all" />
                  <input name="highlight2" defaultValue={product.highlights?.[1]} placeholder="Highlight 2" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all" />
                  <input name="highlight3" defaultValue={product.highlights?.[2]} placeholder="Highlight 3" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all" />
                  <input name="highlight4" defaultValue={product.highlights?.[3]} placeholder="Highlight 4" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all" />
                  <input name="highlight5" defaultValue={product.highlights?.[4]} placeholder="Highlight 5" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all" />
                  <input name="highlight6" defaultValue={product.highlights?.[5]} placeholder="Highlight 6" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all" />
                </div>
              </div>

              <div className="md:col-span-2 pt-4">
                <label className="block text-sm font-medium text-slate-700 mb-3">Technical Specifications</label>
                <div className="space-y-3">
                  {Array.from({ length: specCount }, (_, index) => (
                    <div key={index} className="grid grid-cols-2 gap-4">
                      <input
                        name={`specTitle${index + 1}`}
                        defaultValue={product.specifications?.[index]?.title}
                        placeholder={`Specification Title ${index + 1}`}
                        className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                      />
                      <input
                        name={`specDesc${index + 1}`}
                        defaultValue={product.specifications?.[index]?.description}
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
                {careItems.map((item) => (
                  <div key={item.id} className="flex gap-2 items-start">
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <input
                        value={item.title}
                        onChange={e => setCareItems(prev => prev.map(c => c.id === item.id ? { ...c, title: e.target.value } : c))}
                        placeholder="Title (e.g. Daily Cleaning)"
                        className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all font-medium"
                      />
                      <input
                        value={item.description}
                        onChange={e => setCareItems(prev => prev.map(c => c.id === item.id ? { ...c, description: e.target.value } : c))}
                        placeholder="Description (e.g. Sweep or vacuum regularly)"
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
                  onClick={() => setCareItems(prev => [...prev, { id: crypto.randomUUID?.() || Math.random().toString(36), title: '', description: '' }])}
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
                  {/* Popular */}
                  <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 hover:bg-blue-50 hover:border-blue-300 transition-all cursor-pointer group">
                    <input type="checkbox" name="tags" value="popular" defaultChecked={product.tags?.includes('popular')} className="w-4 h-4 text-blue-600 bg-white border-slate-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer" />
                    <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700">⭐ Popular</span>
                  </label>

                  {/* Trending */}
                  <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 hover:bg-yellow-50 hover:border-yellow-300 transition-all cursor-pointer group">
                    <input type="checkbox" name="tags" value="trending" defaultChecked={product.tags?.includes('trending')} className="w-4 h-4 text-yellow-600 bg-white border-slate-300 rounded focus:ring-2 focus:ring-yellow-500 cursor-pointer" />
                    <span className="text-sm font-medium text-slate-700 group-hover:text-yellow-700">🔥 Trending</span>
                  </label>

                  {/* New */}
                  <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 hover:bg-green-50 hover:border-green-300 transition-all cursor-pointer group">
                    <input type="checkbox" name="tags" value="new" defaultChecked={product.tags?.includes('new')} className="w-4 h-4 text-green-600 bg-white border-slate-300 rounded focus:ring-2 focus:ring-green-500 cursor-pointer" />
                    <span className="text-sm font-medium text-slate-700 group-hover:text-green-700">✨ New</span>
                  </label>

                  {/* Premium */}
                  <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 hover:bg-purple-50 hover:border-purple-300 transition-all cursor-pointer group">
                    <input type="checkbox" name="tags" value="premium" defaultChecked={product.tags?.includes('premium')} className="w-4 h-4 text-purple-600 bg-white border-slate-300 rounded focus:ring-2 focus:ring-purple-500 cursor-pointer" />
                    <span className="text-sm font-medium text-slate-700 group-hover:text-purple-700">💎 Premium</span>
                  </label>

                  {/* Exclusive */}
                  <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 hover:bg-pink-50 hover:border-pink-300 transition-all cursor-pointer group">
                    <input type="checkbox" name="tags" value="exclusive" defaultChecked={product.tags?.includes('exclusive')} className="w-4 h-4 text-pink-600 bg-white border-slate-300 rounded focus:ring-2 focus:ring-pink-500 cursor-pointer" />
                    <span className="text-sm font-medium text-slate-700 group-hover:text-pink-700">👑 Exclusive</span>
                  </label>

                  {/* Classic */}
                  <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 hover:bg-slate-100 hover:border-slate-400 transition-all cursor-pointer group">
                    <input type="checkbox" name="tags" value="classic" defaultChecked={product.tags?.includes('classic')} className="w-4 h-4 text-slate-600 bg-white border-slate-300 rounded focus:ring-2 focus:ring-slate-500 cursor-pointer" />
                    <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">🏛️ Classic</span>
                  </label>

                  {/* Best Seller */}
                  <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 hover:bg-orange-50 hover:border-orange-300 transition-all cursor-pointer group">
                    <input type="checkbox" name="tags" value="bestseller" defaultChecked={product.tags?.includes('bestseller')} className="w-4 h-4 text-orange-600 bg-white border-slate-300 rounded focus:ring-2 focus:ring-orange-500 cursor-pointer" />
                    <span className="text-sm font-medium text-slate-700 group-hover:text-orange-700">🏆 Best Seller</span>
                  </label>

                  {/* Limited Edition */}
                  <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 hover:bg-red-50 hover:border-red-300 transition-all cursor-pointer group">
                    <input type="checkbox" name="tags" value="limited" defaultChecked={product.tags?.includes('limited')} className="w-4 h-4 text-red-600 bg-white border-slate-300 rounded focus:ring-2 focus:ring-red-500 cursor-pointer" />
                    <span className="text-sm font-medium text-slate-700 group-hover:text-red-700">⏰ Limited Edition</span>
                  </label>
                </div>

                <p className="text-xs text-slate-500 mt-4">
                  Selected tags will appear as badges on the product card for better visibility
                </p>

                {/* Applications Section */}
                <div className="mt-8 pt-8 border-t border-slate-200">
                  <label className="block text-sm font-medium text-slate-700 mb-4">
                    Applications (Room Types)
                  </label>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {/* Kitchen */}
                    <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 hover:bg-amber-50 hover:border-amber-300 transition-all cursor-pointer group">
                      <input type="checkbox" name="tags" value="kitchen" defaultChecked={product.tags?.includes('kitchen')} className="w-4 h-4 text-amber-600 bg-white border-slate-300 rounded focus:ring-2 focus:ring-amber-500 cursor-pointer" />
                      <span className="text-sm font-medium text-slate-700 group-hover:text-amber-700">🍳 Kitchen</span>
                    </label>

                    {/* Bathroom */}
                    <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 hover:bg-cyan-50 hover:border-cyan-300 transition-all cursor-pointer group">
                      <input type="checkbox" name="tags" value="bathroom" defaultChecked={product.tags?.includes('bathroom')} className="w-4 h-4 text-cyan-600 bg-white border-slate-300 rounded focus:ring-2 focus:ring-cyan-500 cursor-pointer" />
                      <span className="text-sm font-medium text-slate-700 group-hover:text-cyan-700">🚿 Bathroom</span>
                    </label>

                    {/* Living Room */}
                    <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 hover:bg-indigo-50 hover:border-indigo-300 transition-all cursor-pointer group">
                      <input type="checkbox" name="tags" value="living-room" defaultChecked={product.tags?.includes('living-room')} className="w-4 h-4 text-indigo-600 bg-white border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 cursor-pointer" />
                      <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-700">🛋️ Living Room</span>
                    </label>

                    {/* Bedroom */}
                    <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 hover:bg-violet-50 hover:border-violet-300 transition-all cursor-pointer group">
                      <input type="checkbox" name="tags" value="bedroom" defaultChecked={product.tags?.includes('bedroom')} className="w-4 h-4 text-violet-600 bg-white border-slate-300 rounded focus:ring-2 focus:ring-violet-500 cursor-pointer" />
                      <span className="text-sm font-medium text-slate-700 group-hover:text-violet-700">🛏️ Bedroom</span>
                    </label>

                    {/* Outdoor */}
                    <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 transition-all cursor-pointer group">
                      <input type="checkbox" name="tags" value="outdoor" defaultChecked={product.tags?.includes('outdoor')} className="w-4 h-4 text-emerald-600 bg-white border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 cursor-pointer" />
                      <span className="text-sm font-medium text-slate-700 group-hover:text-emerald-700">🌳 Outdoor</span>
                    </label>

                    {/* Commercial */}
                    <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 hover:bg-gray-50 hover:border-gray-400 transition-all cursor-pointer group">
                      <input type="checkbox" name="tags" value="commercial" defaultChecked={product.tags?.includes('commercial')} className="w-4 h-4 text-gray-600 bg-white border-slate-300 rounded focus:ring-2 focus:ring-gray-500 cursor-pointer" />
                      <span className="text-sm font-medium text-slate-700 group-hover:text-gray-900">🏢 Commercial</span>
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

        {/* Submit Button */}
        <div className="flex gap-4 pt-8">
          <Link
            href="/admin/products"
            className="flex-1 py-4 px-6 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl hover:bg-slate-50 transition-all duration-200 font-medium text-center"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-4 px-6 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Updating...</span>
              </>
            ) : (
              <>
                <FiCheck className="w-5 h-5" />
                <span>Update Product</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}