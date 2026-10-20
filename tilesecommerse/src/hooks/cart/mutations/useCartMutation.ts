import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CartItemSchema, type CartItem, type ProductSize } from "@/schemas";
import { useSession } from "@/lib/auth/client";
import { toast } from "sonner";
import { CART_QUERY_KEYS } from "../keys";

type CartResponse = { items: CartItem[] };

export const useCartMutation = () => {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const add = useMutation({
    mutationFn: async (params: {
      variantId: number;
      size: ProductSize;
      stripeId: string;
      productId: number;
      quantity?: number;
      sqft?: number;
      coveragePerBox?: number;
    }) => {
      const { variantId, size, stripeId, productId, quantity = 1, sqft, coveragePerBox } = params;

      const response = await fetch("/api/user/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId, size, stripeId, productId, quantity, sqft, coveragePerBox }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || "Error adding to cart";
        throw new Error(errorMessage);
      }

      const { items } = await response.json();
      // Return the newly added/updated item
      return CartItemSchema.parse(items[items.length - 1]);
    },
    onMutate: async (params: {
      variantId: number;
      size: ProductSize;
      stripeId: string;
      productId: number;
      quantity?: number;
      sqft?: number;
      coveragePerBox?: number;
    }) => {
      const { variantId, size, stripeId, productId, quantity = 1 } = params;

      // Use guest session ID if not logged in
      const userId = session?.user?.id || "guest";

      await queryClient.cancelQueries({
        queryKey: CART_QUERY_KEYS.cartList(userId),
      });

      const previousData = queryClient.getQueryData<CartResponse>(
        CART_QUERY_KEYS.cartList(userId)
      );

      const tempItem = CartItemSchema.parse({
        id: -Math.floor(Math.random() * 1e9),
        userId: "temp",
        variantId,
        size,
        quantity,
        stripeId,
        productId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      queryClient.setQueryData<CartResponse>(
        CART_QUERY_KEYS.cartList(userId),
        (old = { items: [] }) => {
          const idx = old.items.findIndex(
            (i) => i.variantId === variantId && i.size === size
          );
          if (idx >= 0) {
            const next = [...old.items];
            next[idx] = {
              ...next[idx],
              quantity: next[idx].quantity + quantity,
              updatedAt: new Date().toISOString(),
            };
            return { items: next };
          }
          return { items: [tempItem, ...old.items] };
        }
      );

      return { previousData, tempItem, userId };
    },
    onSuccess: (data, params, context) => {
      const { tempItem, userId } = context as {
        previousData?: CartResponse;
        tempItem: CartItem;
        userId: string;
      };

      queryClient.setQueryData<CartResponse>(
        CART_QUERY_KEYS.cartList(userId),
        (old = { items: [] }) => {
          const filtered = old.items.filter((i) => i.id !== tempItem.id);
          const idx = filtered.findIndex(
            (i) => i.variantId === data.variantId && i.size === data.size
          );
          if (idx >= 0) {
            filtered[idx] = data;
            return { items: filtered };
          }
          return { items: [data, ...filtered] };
        }
      );

      // Invalidate queries to refetch cart data
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEYS.cartList(userId) });
    },
    onError: (error, _, context) => {
      const { previousData, userId } = context as {
        previousData?: CartResponse;
        tempItem: CartItem;
        userId: string;
      };

      if (previousData) {
        queryClient.setQueryData<CartResponse>(
          CART_QUERY_KEYS.cartList(userId),
          previousData
        );
      }

      console.error("Error adding to cart:", error);
      toast.error((error as any)?.message || "Could not add item to cart. Please try again.");
    },
  });

  const update = useMutation({
    mutationFn: async (params: { itemId: number; quantity: number }) => {
      const { itemId, quantity } = params;

      const response = await fetch("/api/user/cart", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, quantity }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || "Error updating cart";
        throw new Error(errorMessage);
      }

      const { items } = await response.json();
      return { success: true, items };
    },
    onMutate: async (params: { itemId: number; quantity: number }) => {
      // Use guest session if not logged in
      const userId = session?.user?.id || "guest";

      const { itemId, quantity } = params;

      await queryClient.cancelQueries({
        queryKey: CART_QUERY_KEYS.cartList(userId),
      });

      const previousData = queryClient.getQueryData<CartResponse>(
        CART_QUERY_KEYS.cartList(userId)
      );

      queryClient.setQueryData<CartResponse>(
        CART_QUERY_KEYS.cartList(userId),
        (current = { items: [] }) => {
          const next = [...current.items];
          const idx = next.findIndex((i) => i.id === itemId);
          if (idx >= 0) {
            next[idx] = {
              ...next[idx],
              quantity,
              updatedAt: new Date().toISOString(),
            };
          }
          return { items: next };
        }
      );

      return { previousData, userId };
    },
    onSuccess: (data, _, context) => {
      const { userId } = context as { previousData?: CartResponse; userId: string };

      // Invalidate to refetch fresh data
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEYS.cartList(userId) });
    },
    onError: (error, _, context) => {
      const { previousData, userId } = context as { previousData?: CartResponse; userId: string };

      if (previousData) {
        queryClient.setQueryData<CartResponse>(
          CART_QUERY_KEYS.cartList(userId),
          previousData
        );
      }

      console.error("Error updating cart:", error);
      toast.error((error as any)?.message || "Could not update cart quantity. Please try again.");
    },
  });

  const remove = useMutation({
    mutationFn: async (params: { itemId: number }) => {
      const { itemId } = params;

      const qs = new URLSearchParams();
      qs.set("id", String(itemId));

      const response = await fetch(`/api/user/cart?${qs.toString()}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || "Error removing from cart";
        throw new Error(errorMessage);
      }

      return true;
    },
    onMutate: async (params: { itemId: number }) => {
      // Use guest session if not logged in
      const userId = session?.user?.id || "guest";

      const { itemId } = params;

      await queryClient.cancelQueries({
        queryKey: CART_QUERY_KEYS.cartList(userId),
      });

      const previousData = queryClient.getQueryData<CartResponse>(
        CART_QUERY_KEYS.cartList(userId)
      );

      queryClient.setQueryData<CartResponse>(
        CART_QUERY_KEYS.cartList(userId),
        (current = { items: [] }) => ({
          items: current.items.filter((i) => i.id !== itemId),
        })
      );

      return { previousData, userId };
    },
    onSuccess: (data, _, context) => {
      const { userId } = context as { previousData?: CartResponse; userId: string };

      toast.success("Removed from cart");
      // Invalidate to refetch fresh data
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEYS.cartList(userId) });
    },
    onError: (error, _, context) => {
      const { previousData, userId } = context as { previousData?: CartResponse; userId: string };

      if (previousData) {
        queryClient.setQueryData<CartResponse>(
          CART_QUERY_KEYS.cartList(userId),
          previousData
        );
      }

      console.error("Error removing from cart:", error);
      toast.error((error as any)?.message || "Could not remove item from cart. Please try again.");
    },
  });

  const clear = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/user/cart", {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || "Error clearing cart";
        throw new Error(errorMessage);
      }

      return true;
    },
    onMutate: async () => {
      // Use guest session if not logged in
      const userId = session?.user?.id || "guest";

      await queryClient.cancelQueries({
        queryKey: CART_QUERY_KEYS.cartList(userId),
      });

      const previousData = queryClient.getQueryData<CartResponse>(
        CART_QUERY_KEYS.cartList(userId)
      );

      queryClient.setQueryData<CartResponse>(
        CART_QUERY_KEYS.cartList(userId),
        { items: [] }
      );

      return { previousData, userId };
    },
    onError: (error, _, context) => {
      const { previousData, userId } = context as { previousData?: CartResponse; userId: string };

      if (previousData) {
        queryClient.setQueryData<CartResponse>(
          CART_QUERY_KEYS.cartList(userId),
          previousData
        );
      }

      console.error("Error clearing cart:", error);
      toast.error((error as any)?.message || "Could not clear cart. Please try again.");
    },
  });

  return {
    add: add.mutate,
    update: update.mutate,
    remove: remove.mutate,
    clear: clear.mutate,
    isAdding: add.isPending,
    isUpdating: update.isPending,
    isRemoving: remove.isPending,
    isClearing: clear.isPending,
    addError: add.error,
    updateError: update.error,
    removeError: remove.error,
    clearError: clear.error,
  };
};
