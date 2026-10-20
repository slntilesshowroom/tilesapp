"use server";

import { revalidatePath } from "next/cache";
import type { ProductCategory } from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1';

// Helper function to transform backend product to frontend format
function transformProduct(backendProduct: any) {
  // Get the featured image or first image
  const featuredImage = backendProduct.images?.find((img: any) => img.isFeatured);
  const mainImage = featuredImage || backendProduct.images?.[0];

  // Transform variants - use real variants if available, otherwise create default
  // NOTE: The DB schema uses a simple `size` string field (e.g. "24x24"), not a `dimensions` object.
  let variants = [];
  if (backendProduct.hasVariants && backendProduct.variants && backendProduct.variants.length > 0) {
    variants = backendProduct.variants.map((variant: any) => {
      // Prefer the variant's own size, then fall back to the product-level size string
      const variantSize = variant.size || backendProduct.size || '';
      return {
        productId: variant.productId || backendProduct.productId,
        color: variant.color || backendProduct.color || 'Default',
        size: variantSize,
        sizes: variantSize ? [variantSize] : [],
        finish: variant.finish || backendProduct.finish,
        price: variant.price || backendProduct.price,
        stock: variant.stock !== undefined ? variant.stock : backendProduct.stock,
        // Use variant's own images; fallback to product images if variant has none
        images: variant.images && variant.images.length > 0 ? variant.images : backendProduct.images || []
      };
    });
  } else {
    // Create default variant from product-level data
    const productSize = backendProduct.size || '';
    variants = [{
      productId: backendProduct.productId,
      color: backendProduct.color || 'Default',
      size: productSize,
      sizes: productSize ? [productSize] : [],
      finish: backendProduct.finish,
      price: backendProduct.price,
      stock: backendProduct.stock,
      images: backendProduct.images || []
    }];
  }

  return {
    id: backendProduct._id,
    name: backendProduct.name,
    description: backendProduct.description,
    shortDescription: backendProduct.shortDescription,
    price: backendProduct.price,
    cuttedPrice: backendProduct.cuttedPrice,
    category: backendProduct.category?.slug || backendProduct.category,
    categoryName: backendProduct.category?.name || backendProduct.category,
    subcategory: backendProduct.subcategory?.slug || backendProduct.subcategory,
    subcategoryName: backendProduct.subcategory?.name,
    img: mainImage?.url || '/placeholder.jpg',
    images: backendProduct.images || [],
    brand: backendProduct.brand,
    stock: backendProduct.stock,
    warranty: backendProduct.warranty,
    ratings: backendProduct.ratings || 0,
    numOfReviews: backendProduct.numOfReviews || 0,
    // Tiles-specific fields
    productId: backendProduct.productId,
    size: backendProduct.size,
    unit: backendProduct.unit,
    material: backendProduct.material,
    finish: backendProduct.finish,
    color: backendProduct.color,
    dimensions: backendProduct.dimensions,
    roomType: backendProduct.roomType,
    thickness: backendProduct.thickness,
    coverage: backendProduct.coverage,
    tilesPerBox: backendProduct.tilesPerBox,
    pricePerSqft: backendProduct.pricePerSqft,
    weight: backendProduct.weight,
    waterAbsorption: backendProduct.waterAbsorption,
    slipResistance: backendProduct.slipResistance,
    highlights: backendProduct.highlights || [],
    careInstructions: backendProduct.careInstructions || [],
    specifications: backendProduct.specifications || [],
    tags: backendProduct.tags || [],
    hasVariants: backendProduct.hasVariants || false,
    variants: variants
  };
}

// Fetch products from backend API

// How long product data may be served from Next's Data Cache. List responses
// now exclude reviews/description, so they fit under the cache's 2MB per-entry
// limit and `revalidate` actually takes effect (it silently did nothing while
// the endpoints returned the whole catalog). Admin writes call
// revalidateProducts() to purge immediately, so this is a staleness floor, not
// a delay on publishing.
const PRODUCT_REVALIDATE = 300;

async function fetchJson(url: string, revalidate: number = PRODUCT_REVALIDATE) {
  const response = await fetch(url, { next: { revalidate } });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${url}`);
  }

  return response.json();
}

/**
 * Products carrying a given tag (popular, trending, kitchen, …).
 * Replaces the old pattern of downloading every product and filtering in JS —
 * the tag filter, the limit and the random pick all happen in Mongo now.
 *
 * Returns raw backend documents, not transformProduct output: the home sections
 * each do their own field mapping off the raw shape.
 */
export async function getProductsByTag(
  tag: string,
  limit: number = 8,
  random: boolean = true
) {
  try {
    const params = new URLSearchParams({ tags: tag, limit: String(limit) });
    if (random) params.set('random', 'true');

    const data = await fetchJson(`${API_BASE_URL}/products/all?${params}`);
    return data.success ? data.products : [];
  } catch (error) {
    console.error(`Error fetching products for tag "${tag}":`, error);
    return [];
  }
}

/**
 * Look up a known set of products by id — what cart, wishlist and checkout
 * actually need. Each of those pages used to pull the entire catalog and run
 * .find() over it in memory.
 */
export async function getProductsByIds(ids: string[]) {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return [];

  try {
    // POST so a large cart can't blow the URL length limit. Cart contents are
    // per-user and change on every mutation, so there is nothing to cache.
    const response = await fetch(`${API_BASE_URL}/products/by-ids`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: unique }),
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('Failed to fetch products by id:', response.statusText);
      return [];
    }

    const data = await response.json();
    return (data.success ? data.products : []).map(transformProduct);
  } catch (error) {
    console.error('Error fetching products by id:', error);
    return [];
  }
}

/** Filter counts for the search sidebar, aggregated by Mongo in one query. */
export async function getProductFacets() {
  try {
    const data = await fetchJson(`${API_BASE_URL}/products/facets`);
    return data.success ? data.facets : null;
  } catch (error) {
    console.error('Error fetching product facets:', error);
    return null;
  }
}

/**
 * Full catalog. Nothing on a user-facing page should call this — it exists for
 * the admin CSV export, which genuinely needs every row.
 */
export async function getAllProducts() {
  try {
    const data = await fetchJson(`${API_BASE_URL}/products/all?limit=100`);
    return (data.success ? data.products : []).map(transformProduct);
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

export type ProductQuery = {
  page?: number;
  limit?: number;
  keyword?: string;
  category?: string[];
  subcategory?: string[];
  subsubcategory?: string[];
  tags?: string[];
  finish?: string[];
  color?: string[];
  size?: string[];
  roomType?: string[];
  material?: string[];
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
};

/**
 * One page of products matching a filter. Every filter below is applied by
 * Mongo against an index — the search page previously fetched the whole catalog
 * and did all of this with Array.filter on each request.
 */
export async function getProductsWithPagination(params: ProductQuery) {
  const { page = 1, limit = 12 } = params;

  const empty = {
    products: [] as any[],
    totalProducts: 0,
    totalPages: 0,
    currentPage: page,
    productsPerPage: limit,
  };

  try {
    const queryParams = new URLSearchParams();
    queryParams.set('page', String(page));
    queryParams.set('limit', String(limit));

    if (params.keyword) queryParams.set('keyword', params.keyword);
    if (params.sort) queryParams.set('sort', params.sort);
    if (params.minPrice !== undefined) queryParams.set('price[gte]', String(params.minPrice));
    if (params.maxPrice !== undefined) queryParams.set('price[lte]', String(params.maxPrice));

    // The backend splits these on commas; sending them as one param keeps the
    // URL (and therefore the cache key) stable regardless of selection order.
    const multi = ['category', 'subcategory', 'subsubcategory', 'tags', 'finish', 'color', 'size', 'roomType', 'material'] as const;
    for (const key of multi) {
      const values = params[key];
      if (values && values.length > 0) queryParams.set(key, [...values].sort().join(','));
    }

    const data = await fetchJson(`${API_BASE_URL}/products?${queryParams}`, 60);
    if (!data.success) return empty;

    const totalProducts = data.filteredProductsCount ?? data.productsCount ?? 0;

    return {
      products: data.products.map(transformProduct),
      totalProducts,
      totalPages: data.totalPages ?? Math.ceil(totalProducts / limit),
      currentPage: page,
      productsPerPage: limit,
    };
  } catch (error) {
    console.error('Error fetching products with pagination:', error);
    return empty;
  }
}

export async function getCategoryProducts(category: ProductCategory, limit: number = 24) {
  try {
    const data = await fetchJson(
      `${API_BASE_URL}/products?category=${encodeURIComponent(category)}&limit=${limit}`,
      60
    );
    return (data.success ? data.products : []).map(transformProduct);
  } catch (error) {
    console.error('Error fetching category products:', error);
    return [];
  }
}

export async function getProduct(productId: string) {
  try {
    // The detail page is the one place that needs the full document
    // (description, specifications, reviews), so no list projection here.
    const data = await fetchJson(`${API_BASE_URL}/product/${productId}`, 60);
    return data.success ? transformProduct(data.product) : null;
  } catch (error) {
    console.error('Error fetching product:', error);
    return null;
  }
}

export async function getRandomProducts(limit: number = 4) {
  try {
    // Previously hit /products/random, which does not exist — every call 404'd
    // and fell through to downloading the catalog and shuffling it in JS.
    const data = await fetchJson(`${API_BASE_URL}/products/all?random=true&limit=${limit}`, 60);
    return (data.success ? data.products : []).map(transformProduct);
  } catch (error) {
    console.error('Error fetching random products:', error);
    return [];
  }
}

export async function searchProducts(query: string, limit: number = 24) {
  try {
    const data = await fetchJson(
      `${API_BASE_URL}/products?keyword=${encodeURIComponent(query)}&limit=${limit}`,
      30
    );
    return (data.success ? data.products : []).map(transformProduct);
  } catch (error) {
    console.error('Error searching products:', error);
    return [];
  }
}

export async function revalidateProducts(productId?: string) {
  // Only revalidate pages that actually show product data
  // DO NOT use revalidatePath('/', 'layout') — that nukes every page in the app
  revalidatePath('/');          // home page
  revalidatePath('/search');    // search/browse page
  revalidatePath('/Gallery');   // gallery grid
  // Must be the route pattern, not an interpolated id: revalidatePath builds a
  // cache tag from the string it is given, so `/[category]/<id>` would match
  // nothing and silently fail to purge anything.
  revalidatePath('/[category]/[id]', 'page');
  return { success: true };
}
