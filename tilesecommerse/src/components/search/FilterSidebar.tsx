"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FaChevronDown, FaChevronUp, FaChevronRight, FaTimes, FaFilter } from "react-icons/fa";
import { useCategories } from "@/hooks/category";

// Category node type mirroring the API shape
interface CategoryNode {
  _id: string;
  name: string;
  slug: string;
  children?: CategoryNode[];
}

type FacetCount = { value: string; count: number };

/**
 * Counts for each filter option, aggregated by Mongo in a single query.
 * This component used to derive them in the browser by iterating the entire
 * product catalog — which meant the whole catalog had to be serialised into
 * the RSC payload and downloaded on every search page view.
 */
export interface ProductFacets {
  categories: FacetCount[];
  tags: FacetCount[];
  finishes: FacetCount[];
  colors: FacetCount[];
  sizes: FacetCount[];
  priceRange: { min: number; max: number };
  total: number;
}

interface FilterSidebarProps {
  facets: ProductFacets | null;
  selectedCategories: string[];
  selectedTags: string[];
  selectedFinishes: string[];
  selectedColors: string[];
  selectedRoomTypes: string[];
  selectedSizes: string[];
  minPrice?: number;
  maxPrice?: number;
}

// ── Recursive category tree node ────────────────────────────────────────────
interface CategoryTreeNodeProps {
  node: CategoryNode;
  depth: number;
  productCounts: Map<string, number>;
  searchParams: URLSearchParams;
  onToggle: (slug: string, depth: number, checked: boolean) => void;
}

const CategoryTreeNode = ({
  node,
  depth,
  productCounts,
  searchParams,
  onToggle,
}: CategoryTreeNodeProps) => {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = node.children && node.children.length > 0;

  // Figure out which URL param this depth maps to
  const paramName = depth === 0 ? 'category' : depth === 1 ? 'subcategory' : 'subsubcategory';
  const isChecked = searchParams.getAll(paramName).includes(node.slug);

  const count = productCounts.get(node.slug) ?? 0;

  return (
    <div style={{ marginLeft: depth > 0 ? `${depth * 12}px` : 0 }}>
      <div className="flex items-center justify-between py-1 group">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {/* Expand/collapse chevron — only when there are children */}
          {hasChildren ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-slate-400 hover:text-orange-500 transition-colors flex-shrink-0"
              aria-label={expanded ? 'Collapse' : 'Expand'}
            >
              {expanded
                ? <FaChevronDown className="w-2.5 h-2.5" />
                : <FaChevronRight className="w-2.5 h-2.5" />}
            </button>
          ) : (
            // Spacer so checkboxes align when siblings have/don't have children
            <span className="w-2.5 h-2.5 flex-shrink-0" />
          )}

          <label className="flex items-center gap-2 cursor-pointer min-w-0">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => onToggle(node.slug, depth, e.target.checked)}
              className="w-3.5 h-3.5 text-orange-500 border-gray-300 rounded focus:ring-orange-500 cursor-pointer flex-shrink-0"
            />
            <span className={`text-slate-700 group-hover:text-orange-500 truncate ${depth === 0 ? 'text-sm font-medium' : 'text-xs'
              }`}>
              {node.name}
            </span>
          </label>
        </div>
        <span className="text-xs text-gray-400 ml-1 flex-shrink-0">({count})</span>
      </div>

      {/* Children — rendered when expanded */}
      {hasChildren && expanded && (
        <div className="mt-0.5">
          {node.children!.map((child) => (
            <CategoryTreeNode
              key={child._id}
              node={child}
              depth={depth + 1}
              productCounts={productCounts}
              searchParams={searchParams}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
};
// ─────────────────────────────────────────────────────────────────────────────


export const FilterSidebar = ({
  facets,
  selectedCategories,
  selectedTags,
  selectedFinishes,
  selectedColors,
  selectedRoomTypes,
  selectedSizes,
  minPrice: initialMinPrice,
  maxPrice: initialMaxPrice,
}: FilterSidebarProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Fetch main categories from API (same as navbar)
  const { categories: dbCategories } = useCategories(false); // Only active categories

  const [isLoading, setIsLoading] = useState(false);
  const prevSearchParams = useRef(searchParams.toString());

  // Reset loading when navigation completes (searchParams change)
  useEffect(() => {
    const current = searchParams.toString();
    if (current !== prevSearchParams.current) {
      prevSearchParams.current = current;
      setIsLoading(false);
    }
  }, [searchParams]);

  const [openSections, setOpenSections] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState({
    min: initialMinPrice?.toString() || "",
    max: initialMaxPrice?.toString() || "",
  });

  // Count for every node in the category tree, including its descendants.
  // Built once per facet/category change — this used to be rebuilt inline
  // inside the render for each top-level category, scanning the full catalog
  // every time.
  const categoryCountMap = useMemo(() => {
    const own = new Map((facets?.categories ?? []).map(c => [c.value, c.count]));
    const totals = new Map<string, number>();

    const walk = (node: CategoryNode): number => {
      const total =
        (own.get(node.slug) ?? 0) +
        (node.children ?? []).reduce((sum, child) => sum + walk(child), 0);
      totals.set(node.slug, total);
      return total;
    };

    (dbCategories as unknown as CategoryNode[]).forEach(walk);
    return totals;
  }, [facets, dbCategories]);

  // Shape the server-computed facet counts into the lists this UI renders.
  const filterOptions = useMemo(() => {
    const PREDEFINED_TAGS = ['popular', 'trending', 'new', 'premium', 'exclusive', 'classic', 'bestseller', 'limited'];
    const ROOM_TYPE_TAGS = ['kitchen', 'bathroom', 'living-room', 'bedroom', 'outdoor', 'commercial'];

    const titleCase = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);
    const humanize = (v: string) => v.split('-').map(titleCase).join(' ');

    const countOf = (rows: FacetCount[] | undefined, value: string) =>
      rows?.find(r => r.value.toLowerCase() === value.toLowerCase())?.count ?? 0;

    const asOptions = (rows: FacetCount[] | undefined, label: (v: string) => string = titleCase) =>
      (rows ?? []).map(({ value, count }) => ({ label: label(value), value, count }));

    return {
      categories: (dbCategories as unknown as CategoryNode[]).map(category => ({
        label: category.name,
        value: category.slug,
        count: categoryCountMap.get(category.slug) ?? 0,
      })),
      // Always list the predefined tags, including the ones at zero, so the
      // filter set doesn't shift around as the catalog changes.
      tags: PREDEFINED_TAGS.map(value => ({
        label: titleCase(value),
        value,
        count: countOf(facets?.tags, value),
      })),
      roomTypes: ROOM_TYPE_TAGS.map(value => ({
        label: humanize(value),
        value,
        count: countOf(facets?.tags, value),
      })),
      finishes: asOptions(facets?.finishes),
      colors: asOptions(facets?.colors),
      sizes: asOptions(facets?.sizes, v => v),
    };
  }, [facets, dbCategories, categoryCountMap]);

  const toggleSection = (title: string) => {
    setOpenSections((prev) =>
      prev.includes(title)
        ? prev.filter((section) => section !== title)
        : [...prev, title]
    );
  };

  // Maps a category slug at a given depth to the correct URL param name
  const depthToParam = (depth: number) =>
    depth === 0 ? 'category' : depth === 1 ? 'subcategory' : 'subsubcategory';

  const updateFilters = (filterType: string, value: string, checked: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    const currentValues = params.getAll(filterType);

    if (checked) {
      params.append(filterType, value);
    } else {
      params.delete(filterType);
      currentValues
        .filter(v => v !== value)
        .forEach(v => params.append(filterType, v));
    }

    setIsLoading(true);
    router.push(`/search?${params.toString()}`);
  };

  // Handler for category tree node toggles — uses depth-based param name
  const handleCategoryToggle = (slug: string, depth: number, checked: boolean) => {
    updateFilters(depthToParam(depth), slug, checked); // setIsLoading is called inside updateFilters
  };

  const applyPriceFilter = () => {
    const params = new URLSearchParams(searchParams.toString());

    if (priceRange.min) {
      params.set('minPrice', priceRange.min);
    } else {
      params.delete('minPrice');
    }

    if (priceRange.max) {
      params.set('maxPrice', priceRange.max);
    } else {
      params.delete('maxPrice');
    }

    setIsLoading(true);
    router.push(`/search?${params.toString()}`);
  };

  const clearAllFilters = () => {
    setPriceRange({ min: "", max: "" });
    setIsLoading(true);
    router.push('/search');
  };

  // Mobile drawer
  const [mobileOpen, setMobileOpen] = useState(false);

  // Count active filters for the mobile button badge
  const activeFilterCount = [
    ...selectedCategories,
    ...(searchParams.getAll('subcategory')),
    ...(searchParams.getAll('subsubcategory')),
    ...selectedTags,
    ...selectedFinishes,
    ...selectedColors,
    ...selectedRoomTypes,
    ...selectedSizes,
    ...(initialMinPrice !== undefined ? ['minPrice'] : []),
    ...(initialMaxPrice !== undefined ? ['maxPrice'] : []),
  ].length;

  // ── The actual filter panels (shared between sidebar & drawer) ──────────────
  const FilterContent = () => (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-800">Filters</h2>
        <button
          onClick={clearAllFilters}
          className="text-sm text-orange-500 hover:text-orange-600 font-medium"
        >
          Clear All
        </button>
      </div>

      {/* Price Range */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <button
          onClick={() => toggleSection("Price Range")}
          className="flex items-center justify-between w-full mb-3"
        >
          <h3 className="font-semibold text-slate-800">Price Range</h3>
          {openSections.includes("Price Range") ? (
            <FaChevronUp className="text-slate-600 text-sm" />
          ) : (
            <FaChevronDown className="text-slate-600 text-sm" />
          )}
        </button>
        {openSections.includes("Price Range") && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min"
                value={priceRange.min}
                onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <input
                type="number"
                placeholder="Max"
                value={priceRange.max}
                onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <button
              onClick={applyPriceFilter}
              className="w-full bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
            >
              Apply
            </button>
          </div>
        )}
      </div>

      {/* Categories Filter — recursive tree */}
      {dbCategories.length > 0 && (
        <div className="mb-6 pb-6 border-b border-gray-200">
          <button
            onClick={() => toggleSection("Categories")}
            className="flex items-center justify-between w-full mb-3"
          >
            <h3 className="font-semibold text-slate-800">Categories</h3>
            {openSections.includes("Categories") ? (
              <FaChevronUp className="text-slate-600 text-sm" />
            ) : (
              <FaChevronDown className="text-slate-600 text-sm" />
            )}
          </button>
          {openSections.includes("Categories") && (
            <div className="space-y-0.5 max-h-80 overflow-y-auto pr-1">
              {dbCategories.map((cat) => (
                <CategoryTreeNode
                  key={(cat as unknown as CategoryNode)._id}
                  node={cat as unknown as CategoryNode}
                  depth={0}
                  productCounts={categoryCountMap}
                  searchParams={new URLSearchParams(searchParams.toString())}
                  onToggle={handleCategoryToggle}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tags Filter */}
      {filterOptions.tags.length > 0 && (
        <div className="mb-6 pb-6 border-b border-gray-200">
          <button
            onClick={() => toggleSection("Tags")}
            className="flex items-center justify-between w-full mb-3"
          >
            <h3 className="font-semibold text-slate-800">Tags</h3>
            {openSections.includes("Tags") ? (
              <FaChevronUp className="text-slate-600 text-sm" />
            ) : (
              <FaChevronDown className="text-slate-600 text-sm" />
            )}
          </button>
          {openSections.includes("Tags") && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filterOptions.tags.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedTags.includes(option.value)}
                      onChange={(e) => updateFilters('tags', option.value, e.target.checked)}
                      className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500 cursor-pointer"
                    />
                    <span className="text-sm text-slate-700 group-hover:text-orange-500">
                      {option.label}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">({option.count})</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Shop by Room Filter */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <button
          onClick={() => toggleSection("Shop by Room")}
          className="flex items-center justify-between w-full mb-3"
        >
          <h3 className="font-semibold text-slate-800">Shop by Room</h3>
          {openSections.includes("Shop by Room") ? (
            <FaChevronUp className="text-slate-600 text-sm" />
          ) : (
            <FaChevronDown className="text-slate-600 text-sm" />
          )}
        </button>
        {openSections.includes("Shop by Room") && (
          <div className="grid grid-cols-2 gap-3">
            {/* Kitchen */}
            <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-amber-50 hover:border-amber-300 transition-all cursor-pointer group">
              <input
                type="checkbox"
                checked={selectedRoomTypes.includes("kitchen")}
                onChange={(e) => updateFilters('roomType', 'kitchen', e.target.checked)}
                className="w-4 h-4 text-amber-600 bg-white border-slate-300 rounded focus:ring-2 focus:ring-amber-500 cursor-pointer"
              />
              <span className="text-sm font-medium text-slate-700 group-hover:text-amber-700">
                Kitchen
              </span>
            </label>

            {/* Bathroom */}
            <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-cyan-50 hover:border-cyan-300 transition-all cursor-pointer group">
              <input
                type="checkbox"
                checked={selectedRoomTypes.includes("bathroom")}
                onChange={(e) => updateFilters('roomType', 'bathroom', e.target.checked)}
                className="w-4 h-4 text-cyan-600 bg-white border-slate-300 rounded focus:ring-2 focus:ring-cyan-500 cursor-pointer"
              />
              <span className="text-sm font-medium text-slate-700 group-hover:text-cyan-700">
                Bathroom
              </span>
            </label>

            {/* Living Room */}
            <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-indigo-50 hover:border-indigo-300 transition-all cursor-pointer group">
              <input
                type="checkbox"
                checked={selectedRoomTypes.includes("living-room")}
                onChange={(e) => updateFilters('roomType', 'living-room', e.target.checked)}
                className="w-4 h-4 text-indigo-600 bg-white border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-700">
                Living Room
              </span>
            </label>

            {/* Bedroom */}
            <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-violet-50 hover:border-violet-300 transition-all cursor-pointer group">
              <input
                type="checkbox"
                checked={selectedRoomTypes.includes("bedroom")}
                onChange={(e) => updateFilters('roomType', 'bedroom', e.target.checked)}
                className="w-4 h-4 text-violet-600 bg-white border-slate-300 rounded focus:ring-2 focus:ring-violet-500 cursor-pointer"
              />
              <span className="text-sm font-medium text-slate-700 group-hover:text-violet-700">
                Bedroom
              </span>
            </label>

            {/* Outdoor */}
            <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 transition-all cursor-pointer group">
              <input
                type="checkbox"
                checked={selectedRoomTypes.includes("outdoor")}
                onChange={(e) => updateFilters('roomType', 'outdoor', e.target.checked)}
                className="w-4 h-4 text-emerald-600 bg-white border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              />
              <span className="text-sm font-medium text-slate-700 group-hover:text-emerald-700">
                Outdoor
              </span>
            </label>

            {/* Commercial */}
            <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-gray-50 hover:border-gray-400 transition-all cursor-pointer group">
              <input
                type="checkbox"
                checked={selectedRoomTypes.includes("commercial")}
                onChange={(e) => updateFilters('roomType', 'commercial', e.target.checked)}
                className="w-4 h-4 text-gray-600 bg-white border-slate-300 rounded focus:ring-2 focus:ring-gray-500 cursor-pointer"
              />
              <span className="text-sm font-medium text-slate-700 group-hover:text-gray-900">
                Commercial
              </span>
            </label>
          </div>
        )}
      </div>

      {/* Finish Filter */}
      {filterOptions.finishes.length > 0 && (
        <div className="mb-6 pb-6 border-b border-gray-200">
          <button
            onClick={() => toggleSection("Finish Type")}
            className="flex items-center justify-between w-full mb-3"
          >
            <h3 className="font-semibold text-slate-800">Finish Type</h3>
            {openSections.includes("Finish Type") ? (
              <FaChevronUp className="text-slate-600 text-sm" />
            ) : (
              <FaChevronDown className="text-slate-600 text-sm" />
            )}
          </button>
          {openSections.includes("Finish Type") && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filterOptions.finishes.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedFinishes.includes(option.value)}
                      onChange={(e) => updateFilters('finish', option.value, e.target.checked)}
                      className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500 cursor-pointer"
                    />
                    <span className="text-sm text-slate-700 group-hover:text-orange-500">
                      {option.label}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">({option.count})</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Color Filter */}
      {filterOptions.colors.length > 0 && (
        <div className="mb-6 pb-6 border-b border-gray-200">
          <button
            onClick={() => toggleSection("Color")}
            className="flex items-center justify-between w-full mb-3"
          >
            <h3 className="font-semibold text-slate-800">Color</h3>
            {openSections.includes("Color") ? (
              <FaChevronUp className="text-slate-600 text-sm" />
            ) : (
              <FaChevronDown className="text-slate-600 text-sm" />
            )}
          </button>
          {openSections.includes("Color") && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filterOptions.colors.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedColors.includes(option.value)}
                      onChange={(e) => updateFilters('color', option.value, e.target.checked)}
                      className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500 cursor-pointer"
                    />
                    <span className="text-sm text-slate-700 group-hover:text-orange-500">
                      {option.label}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">({option.count})</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Room Type Filter */}
      {filterOptions.roomTypes.length > 0 && (
        <div className="mb-6 pb-6 border-b border-gray-200">
          <button
            onClick={() => toggleSection("Room Type")}
            className="flex items-center justify-between w-full mb-3"
          >
            <h3 className="font-semibold text-slate-800">Room Type</h3>
            {openSections.includes("Room Type") ? (
              <FaChevronUp className="text-slate-600 text-sm" />
            ) : (
              <FaChevronDown className="text-slate-600 text-sm" />
            )}
          </button>
          {openSections.includes("Room Type") && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filterOptions.roomTypes.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedRoomTypes.includes(option.value)}
                      onChange={(e) => updateFilters('roomType', option.value, e.target.checked)}
                      className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500 cursor-pointer"
                    />
                    <span className="text-sm text-slate-700 group-hover:text-orange-500">
                      {option.label}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">({option.count})</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Size Filter */}
      {filterOptions.sizes.length > 0 && (
        <div className="mb-6">
          <button
            onClick={() => toggleSection("Size")}
            className="flex items-center justify-between w-full mb-3"
          >
            <h3 className="font-semibold text-slate-800">Size</h3>
            {openSections.includes("Size") ? (
              <FaChevronUp className="text-slate-600 text-sm" />
            ) : (
              <FaChevronDown className="text-slate-600 text-sm" />
            )}
          </button>
          {openSections.includes("Size") && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filterOptions.sizes.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedSizes.includes(option.value)}
                      onChange={(e) => updateFilters('size', option.value, e.target.checked)}
                      className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500 cursor-pointer"
                    />
                    <span className="text-sm text-slate-700 group-hover:text-orange-500">
                      {option.label}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">({option.count})</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
  // ────────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── LOADING OVERLAY ── */}
      {isLoading && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          {/* Covers only the right/content area visually */}
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 bg-white rounded-xl shadow-lg px-8 py-6 pointer-events-auto">
              <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium text-slate-700">Applying filters…</span>
            </div>
          </div>
        </div>
      )}

      {/* ── DESKTOP SIDEBAR (lg+) ── */}
      <aside className="hidden lg:block w-64 flex-shrink-0 bg-white border-r border-gray-200 self-start sticky top-4">
        <div className="overflow-y-auto max-h-[calc(100vh-6rem)]">
          <FilterContent />
        </div>
      </aside>

      {/* ── MOBILE FILTER BUTTON BAR (< lg) ── */}
      <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium active:bg-slate-700 transition-colors"
          >
            <FaFilter className="text-xs" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="ml-1 bg-orange-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
          {activeFilterCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="text-sm text-orange-500 hover:text-orange-600 font-medium"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* ── MOBILE OVERLAY ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── MOBILE DRAWER ── */}
      <div
        className={`fixed top-0 left-0 h-full w-[300px] max-w-[85vw] bg-white z-50 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out lg:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-slate-800 to-slate-900 flex-shrink-0">
          <span className="text-white font-bold text-lg flex items-center gap-2">
            <FaFilter className="text-orange-400" />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </span>
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Close filters"
            className="text-white p-1.5 rounded-lg hover:bg-white/20 transition-colors"
          >
            <FaTimes size={18} />
          </button>
        </div>

        {/* Scrollable filter content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <FilterContent />
        </div>

        {/* Drawer footer — apply/close */}
        <div className="flex-shrink-0 px-5 py-4 border-t border-gray-200 bg-slate-50">
          <button
            onClick={() => setMobileOpen(false)}
            className="w-full bg-slate-900 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-slate-800 transition-colors"
          >
            View Results
          </button>
        </div>
      </div>
    </>
  );
};
