import { useQuery } from "@tanstack/react-query";
import { getProductsByIds } from "@/app/actions";
import type { ProductWithVariants } from "@/schemas";

/**
 * Fetch just the products in a given id set.
 *
 * Cart, wishlist and checkout each need a handful of known products. They used
 * to receive the entire catalog as a prop — serialised into the RSC payload and
 * downloaded by the browser — and run Array.find over it.
 */
export const useProductsByIds = (ids: string[]) => {
  // Sort so the key is stable regardless of cart ordering, which keeps
  // reordering or re-adding an item from refetching.
  const key = Array.from(new Set(ids.filter(Boolean))).sort();

  const query = useQuery({
    queryKey: ["products", "by-ids", key],
    queryFn: () => getProductsByIds(key) as Promise<ProductWithVariants[]>,
    enabled: key.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const products = query.data ?? [];

  return {
    ...query,
    products,
    // Empty id set resolves instantly — the query is disabled, so react-query
    // would otherwise report isLoading forever.
    isLoading: key.length > 0 && query.isLoading,
    getProductById: (id: string) => products.find((p) => p.id === id),
  };
};
