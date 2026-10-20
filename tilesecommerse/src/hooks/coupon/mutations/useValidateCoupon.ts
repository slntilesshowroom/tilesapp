import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ValidateCoupon } from "@/schemas";
import { getApiUrl } from "@/lib/utils/api";

type ValidateCouponResponse = {
  success: boolean;
  valid: boolean;
  coupon: {
    code: string;
    description?: string;
    discountType: "percentage" | "fixed";
    discountValue: number;
    discount: number;
    finalAmount: number;
  };
};

export const useValidateCoupon = () => {
  const mutation = useMutation({
    mutationFn: async (data: ValidateCoupon) => {
      const response = await fetch(`${getApiUrl()}/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || "Invalid coupon code";
        throw new Error(errorMessage);
      }

      return (await response.json()) as ValidateCouponResponse;
    },
    onError: (error: Error) => {
      console.error("Error validating coupon:", error);
      toast.error(error.message || "Invalid coupon code");
    },
  });

  return {
    validate: mutation.mutate,
    validateAsync: mutation.mutateAsync,
    isValidating: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
  };
};
