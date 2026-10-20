# Server-Side Pagination Implementation Plan

## ✅ Completed

1. **Added `getProductsWithPagination` server action** in `/src/app/actions.ts`
   - Accepts `page`, `limit`, `keyword`, `category`, `subcategory`, `minPrice`, `maxPrice`
   - Returns: `{ products, totalProducts, totalPages, currentPage, productsPerPage }`
   - Fetches from backend `/products` endpoint with query params

## 🔄 Next Steps

### 1. Update Search Page (`/src/app/(store)/search/page.tsx`)

**Current Problem:**
- Fetches ALL products with `getAllProducts()`
- Does client-side filtering
- Slow with 1000+ products

**Solution:**
- Use `getProductsWithPagination()` instead
- Pass `page` and `limit` from URL params
- Remove client-side filtering (backend handles it)

**Changes Needed:**
```typescript
// Add to searchParams interface
interface SearchProps {
  searchParams: Promise<{
    // ... existing params
    page?: string;
    limit?: string;
  }>;
}

// In Search component
const params = await searchParams;
const page = parseInt(params.page || '1');
const limit = parseInt(params.limit || '12');

// Replace getAllProducts() with:
const paginationData = await getProductsWithPagination({
  page,
  limit,
  keyword: q,
  category: categories[0], // If single category
  minPrice,
  maxPrice
});

// Pass to ProductGrid:
<ProductGrid 
  products={paginationData.products}
  totalProducts={paginationData.totalProducts}
  totalPages={paginationData.totalPages}
  currentPage={paginationData.currentPage}
  searchQuery={q}
/>
```

### 2. Update ProductGrid Component

**Current:**
- Client-side pagination (slicing array)
- State-based page management

**New:**
- Server-side pagination (URL-based)
- Use `useRouter` and `useSearchParams` to update URL
- Remove client-side slicing

**Changes:**
```typescript
interface ProductGridProps {
  products: ProductWithVariants[];
  totalProducts: number;
  totalPages: number;
  currentPage: number;
  searchQuery?: string;
}

// Remove:
- const [currentPage, setCurrentPage] = useState(1);
- const currentProducts = sortedProducts.slice(startIndex, endIndex);
- const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);

// Add:
- const router = useRouter();
- const searchParams = useSearchParams();
- const pathname = usePathname();

// Update page:
const handlePageChange = (newPage: number) => {
  const params = new URLSearchParams(searchParams);
  params.set('page', newPage.toString());
  router.push(`${pathname}?${params.toString()}`);
};

// Update items per page:
const handleItemsPerPageChange = (value: number) => {
  const params = new URLSearchParams(searchParams);
  params.set('limit', value.toString());
  params.set('page', '1'); // Reset to page 1
  router.push(`${pathname}?${params.toString()}`);
};
```

### 3. Benefits

✅ **Performance:**
- Only loads 12 products instead of 1000
- Faster page load
- Less memory usage

✅ **Scalability:**
- Works with unlimited products
- Backend handles pagination logic

✅ **SEO:**
- Each page has unique URL
- Can be bookmarked/shared
- Better for search engines

✅ **User Experience:**
- Faster navigation
- URL reflects current state
- Back button works correctly

## Implementation Order

1. ✅ Add `getProductsWithPagination` to actions.ts (DONE)
2. ⏳ Update search page to use server-side pagination
3. ⏳ Update ProductGrid to use URL-based pagination
4. ⏳ Test with large dataset (1000+ products)
5. ⏳ Verify caching and performance

## Notes

- Backend already supports pagination (`page` and `limit` query params)
- SearchFeatures class handles pagination logic
- Default `resultPerPage` is 12 (can be overridden with `limit` param)
- Backend returns `filteredProductsCount` for total count
