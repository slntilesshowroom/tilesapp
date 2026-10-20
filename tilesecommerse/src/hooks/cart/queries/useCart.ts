import { useQuery } from "@tanstack/react-query";
import { CART_QUERY_KEYS } from "../keys";
import { CartItemSchema, type CartItem } from "@/schemas";
import { useSession } from "@/lib/auth/client";

type CartResponse = { items: CartItem[] };

export const useCart = () => {
  const { data: session } = useSession();

  // Use session user ID if logged in, otherwise use "guest" as fallback
  const userId = session?.user?.id || "guest";

  const query = useQuery({
    queryKey: CART_QUERY_KEYS.cartList(userId),
    queryFn: async () => {
      const response = await fetch("/api/user/cart", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch cart");
      }

      const data = await response.json();
      return {
        items: CartItemSchema.array().parse(data.items),
      } as CartResponse;
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const items = query.data?.items ?? [];

  const getCartItemById = (id: CartItem["id"]): CartItem | undefined => {
    return items.find((item) => item.id === id);
  };

  return {
    ...query,
    items,
    getCartItemById,
  };
};
