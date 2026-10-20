import { z } from "zod";

// Mock schemas for frontend-only app
export const ProductWithVariantsSchema = z.any();
export const CartItemSchema = z.any();
export const OrderWithDetailsSchema = z.any();
export const InsertOrderItemSchema = z.any();
export const InsertCustomerInfoSchema = z.any();
export const InsertOrderProductSchema = z.any();
export const ProductSizeEnum = z.enum(["12x12", "12x24", "16x16", "18x18", "24x24", "32x32"]);
export const WishlistItemSchema = z.any();

// Coupon schemas
export const CouponSchema = z.object({
  _id: z.string(),
  code: z.string(),
  description: z.string().optional(),
  discountType: z.enum(["percentage", "fixed"]),
  discountValue: z.number(),
  minPurchaseAmount: z.number().default(0),
  maxDiscountAmount: z.number().nullable().optional(),
  usageLimit: z.number().nullable().optional(),
  usageCount: z.number().default(0),
  perUserLimit: z.number().default(1),
  expiryDate: z.string(),
  isActive: z.boolean().default(true),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateCouponSchema = z.object({
  code: z.string().min(3, "Code must be at least 3 characters").max(20, "Code cannot exceed 20 characters"),
  description: z.string().max(200, "Description cannot exceed 200 characters").optional(),
  discountType: z.enum(["percentage", "fixed"]),
  discountValue: z.number().positive("Discount value must be positive"),
  minPurchaseAmount: z.number().min(0).default(0),
  maxDiscountAmount: z.number().positive().nullable().optional(),
  usageLimit: z.number().positive().nullable().optional(),
  perUserLimit: z.number().positive().default(1),
  expiryDate: z.string(),
  isActive: z.boolean().default(true),
});

export const ValidateCouponSchema = z.object({
  code: z.string(),
  orderAmount: z.number(),
});

// Category schemas - Define base schema first
const CategoryBaseSchema = z.object({
  _id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  parent: z.string().nullable().optional(),
  level: z.number().default(0),
  order: z.number().default(0),
  productCount: z.number().default(0),
  isActive: z.boolean().default(true),
  createdBy: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Define with recursive children for 3-level hierarchy
export const CategorySchema: z.ZodType<any> = CategoryBaseSchema.extend({
  children: z.lazy(() => z.array(CategorySchema)).optional(),
});

export const CreateCategorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name cannot exceed 100 characters"),
  description: z.string().max(500, "Description cannot exceed 500 characters").optional(),
  parent: z.string().nullable().optional(),
  order: z.number().min(0).default(0),
  isActive: z.boolean().default(true),
});

export type ProductWithVariants = any;
export type ProductVariant = any;
export type Product = any;
export type CartItem = any;
export type ProductSize = string;
export type ProductCategory = string;
export type OrderItem = any;
export type CustomerInfo = any;
export type OrderProduct = any;
export type ProductFormData = any;
export type WishlistItem = any;
export type OrderProductWithDetails = any;
export type OrderWithDetails = any;
export type Address = any;

export type Coupon = z.infer<typeof CouponSchema>;
export type CreateCoupon = z.infer<typeof CreateCouponSchema>;
export type ValidateCoupon = z.infer<typeof ValidateCouponSchema>;

export type Category = z.infer<typeof CategorySchema>;
export type CreateCategory = z.infer<typeof CreateCategorySchema>;
