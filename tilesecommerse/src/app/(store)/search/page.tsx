import { getProductsWithPagination, getProductFacets } from "@/app/actions";
import { pickFirst } from "@/utils";
import { FilterSidebar, ProductGrid, Breadcrumb } from "@/components/search";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "All Products - SLN TILES SHOWROOM",
  description: "Browse our complete collection of premium tiles, sanitary ware, and home improvement products.",
};

interface SearchProps {
  searchParams: Promise<{
    q?: string;
    category?: string | string[];
    subcategory?: string | string[];
    subsubcategory?: string | string[];
    tags?: string | string[];
    finish?: string | string[];
    color?: string | string[];
    size?: string | string[];
    minPrice?: string;
    maxPrice?: string;
    roomType?: string | string[];
    page?: string;
    limit?: string;
    sort?: string;
  }>;
}

const asArray = (v: string | string[] | undefined): string[] =>
  v === undefined ? [] : Array.isArray(v) ? v : [v];

type CategoryNode = { slug: string; name: string; children?: CategoryNode[] };

const findCategoryName = (cats: CategoryNode[], slug: string): string | null => {
  for (const cat of cats) {
    if (cat.slug === slug) return cat.name;
    const found = cat.children ? findCategoryName(cat.children, slug) : null;
    if (found) return found;
  }
  return null;
};

const Search = async ({ searchParams }: SearchProps) => {
  const params = await searchParams;
  const q = pickFirst(params, "q");

  const page = Math.max(1, parseInt(params.page || "1") || 1);
  const limit = Math.min(60, Math.max(1, parseInt(params.limit || "12") || 12));

  const categories = asArray(params.category);
  const subcategories = asArray(params.subcategory);
  const subsubcategories = asArray(params.subsubcategory);
  const tags = asArray(params.tags);
  const finishes = asArray(params.finish);
  const colors = asArray(params.color);
  const roomTypes = asArray(params.roomType);
  const sizes = asArray(params.size);
  const minPrice = params.minPrice ? parseFloat(params.minPrice) : undefined;
  const maxPrice = params.maxPrice ? parseFloat(params.maxPrice) : undefined;

  // Every filter below is applied by Mongo against an index, and only the 12
  // rows being rendered come back. This page used to download the entire
  // catalog, run eight Array.filter passes over it, slice out a page — and then
  // still hand the full catalog to the client components below.
  const [{ products, totalProducts, totalPages }, facets, dbCategories] = await Promise.all([
    getProductsWithPagination({
      page,
      limit,
      keyword: q,
      category: categories,
      subcategory: subcategories,
      subsubcategory: subsubcategories,
      tags,
      finish: finishes,
      color: colors,
      size: sizes,
      roomType: roomTypes,
      minPrice,
      maxPrice,
      sort: params.sort,
    }),
    getProductFacets(),
    fetchCategories(),
  ]);

  // Title comes from the most specific category slug the user clicked.
  const activeSlugs = [...subsubcategories, ...subcategories, ...categories];
  let pageTitle = "All Products";
  if (activeSlugs.length > 0) {
    const slug = activeSlugs[0];
    pageTitle =
      findCategoryName(dbCategories, slug) ??
      slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }

  const breadcrumbItems = [
    { label: "Products", href: "/search" },
    ...(q ? [{ label: q, href: `/search?q=${encodeURIComponent(q)}` }] : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb items={breadcrumbItems} />

        <div className="flex flex-col lg:flex-row gap-8">
          <FilterSidebar
            facets={facets}
            selectedCategories={categories}
            selectedTags={tags}
            selectedFinishes={finishes}
            selectedColors={colors}
            selectedRoomTypes={roomTypes}
            selectedSizes={sizes}
            minPrice={minPrice}
            maxPrice={maxPrice}
          />

          <ProductGrid
            products={products}
            totalProducts={totalProducts}
            totalPages={totalPages}
            currentPage={page}
            searchQuery={q}
            pageTitle={pageTitle}
          />
        </div>
      </div>
    </div>
  );
};

async function fetchCategories(): Promise<CategoryNode[]> {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000/api/v1";
  try {
    const res = await fetch(`${base}/categories`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.categories || [];
  } catch {
    return [];
  }
}

export default Search;
