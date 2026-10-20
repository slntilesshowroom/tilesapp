/** FUNCTIONALITY */
import { redirect } from "next/navigation";
import { getProduct } from "@/app/actions";
import { dummyTileProducts } from "@/lib/data/dummy-tiles";
/** COMPONENTS */
import { ProductDetailClient } from "@/components/product-detail";
/** TYPES */
import type { ProductVariant } from "@/schemas";

interface SingleProductProps {
  id: string;
  selectedVariantColor?: ProductVariant["color"];
}

export const SingleProduct = async ({
  id,
  selectedVariantColor,
}: SingleProductProps) => {
  // Try to get real product, fallback to dummy data
  let productPlainObject;
  try {
    productPlainObject = await getProduct(id);

    if (!productPlainObject) {
      // Fallback to dummy data
      // @ts-ignore - dummy data uses string IDs
      productPlainObject = dummyTileProducts.find(p => p.id === id) || dummyTileProducts[0];
    }
  } catch (error) {
    // Fallback to dummy data
    // @ts-ignore - dummy data uses string IDs
    productPlainObject = dummyTileProducts.find(p => p.id === id) || dummyTileProducts[0];
  }

  if (!productPlainObject) {
    return <div className="text-center py-20">Product not found</div>;
  }

  const selectedVariantObject = productPlainObject.variants.find(
    (v: any) => v.color === selectedVariantColor
  );

  if (!selectedVariantObject) {
    return redirect(
      `/${productPlainObject.category}/${id}?variant=${productPlainObject.variants[0].color}`
    );
  }

  // Use actual product images from database
  const productImages = (productPlainObject as any).images && (productPlainObject as any).images.length > 0
    ? (productPlainObject as any).images.map((img: any) => img.url || img)
    : [productPlainObject.img]; // Fallback to main image if no images array

  return (
    <ProductDetailClient
      // @ts-ignore - dummy data uses tile categories
      product={productPlainObject}
      productImages={productImages}
    />
  );
};
