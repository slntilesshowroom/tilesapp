"use client";

import { useState, useEffect, useMemo } from "react";
import { useCartMutation } from "@/hooks/cart";
import { useWishlistMutation } from "@/hooks/wishlist";
import { useSession } from "@/lib/auth/client";
import { toast } from "sonner";
import type { ProductWithVariants } from "@/schemas";
import { EnquiryModal } from "./EnquiryModal";

interface ProductInfoProps {
  product: ProductWithVariants;
  onVariantChange?: (variant: any) => void;
}

export const ProductInfo = ({ product, onVariantChange }: ProductInfoProps) => {
  // FIXED: Initialize with main product values if they exist, otherwise use first variant
  // This ensures the UI shows the correct variant that matches the main product specs
  const [selectedColor, setSelectedColor] = useState(
    product.color || product.variants[0]?.color || ""
  );
  const [selectedSize, setSelectedSize] = useState(
    // @ts-ignore - dummy data uses 'size', real schema uses 'sizes'
    product.size || (product.variants[0]?.sizes?.[0] || product.variants[0]?.size) as string || ""
  );
  const [selectedFinish, setSelectedFinish] = useState(
    product.finish || product.variants[0]?.finish || ""
  );
  const [quantity, setQuantity] = useState(1);
  const [sqftInput, setSqftInput] = useState('');
  const [boxesInput, setBoxesInput] = useState('');
  const [lastEdited, setLastEdited] = useState<'sqft' | 'boxes'>('sqft');

  const { data: session } = useSession();
  const { add: addToCart, isAdding } = useCartMutation();
  const { add: addToWishlist, isAddingToWishlist } = useWishlistMutation();
  const [isEnquiryModalOpen, setIsEnquiryModalOpen] = useState(false);

  // FIXED: Include main product as the first "variant" option
  const allVariantOptions = useMemo(() => {

    return [
      // Main product as default variant
      {
        color: product.color,
        size: product.size,
        finish: product.finish,
        price: product.price,
        cuttedPrice: product.cuttedPrice,
        stock: product.stock,
        images: product.images,
        productId: product.productId,
        isMainProduct: true
      },
      // Then all other variants
      ...product.variants
    ];
  }, [product]);

  // All unique colors across all variants
  const uniqueColors = useMemo(() =>
    Array.from(new Set(allVariantOptions.map((v: any) => v.color))).filter(Boolean),
    [allVariantOptions]
  );

  // All unique sizes across all variants
  const uniqueSizes = useMemo(() =>
    Array.from(new Set(
      allVariantOptions.flatMap((v: any) =>
        (v.sizes && v.sizes.length > 0) ? v.sizes : [v.size]
      ).filter(Boolean)
    )),
    [allVariantOptions]
  );

  // Sizes available for the currently selected color
  const sizesForSelectedColor = useMemo(() => {
    if (!selectedColor) return uniqueSizes as string[];
    const matching = allVariantOptions.filter((v: any) => v.color === selectedColor);
    return Array.from(new Set(
      matching.flatMap((v: any) =>
        (v.sizes && v.sizes.length > 0) ? v.sizes : [v.size]
      ).filter(Boolean)
    )) as string[];
  }, [allVariantOptions, selectedColor, uniqueSizes]);

  // Colors available for the currently selected size
  const colorsForSelectedSize = useMemo(() => {
    if (!selectedSize) return uniqueColors as string[];
    return (allVariantOptions.filter((v: any) => {
      const variantSizes = (v.sizes && v.sizes.length > 0) ? v.sizes : [v.size];
      return variantSizes.includes(selectedSize);
    }).map((v: any) => v.color).filter(Boolean)) as string[];
  }, [allVariantOptions, selectedSize, uniqueColors]);

  const uniqueFinishes = useMemo(() =>
    Array.from(new Set(allVariantOptions.map((v: any) => v.finish))).filter(Boolean),
    [allVariantOptions]
  );

  // Get current selected variant based on color, size, and finish
  const selectedVariant = useMemo(() => {
    // Search in ALL options (main product + variants)
    const foundVariant = allVariantOptions.find((v: any) =>
      v.color === selectedColor &&
      (v.size === selectedSize || v.sizes?.includes(selectedSize)) &&
      (!selectedFinish || v.finish === selectedFinish)
    );

    return foundVariant || allVariantOptions[0]; // Default to main product
  }, [allVariantOptions, selectedColor, selectedSize, selectedFinish]);

  // Notify parent component when variant changes
  useEffect(() => {


    if (onVariantChange) {
      onVariantChange(selectedVariant);
    }
  }, [selectedColor, selectedSize, selectedFinish, selectedVariant, onVariantChange]);


  // Get variant-specific price and stock
  const currentPrice = selectedVariant?.price || product.price;
  const currentStock = selectedVariant?.stock || product.stock;
  const currentMRP = selectedVariant?.cuttedPrice || product.cuttedPrice;

  // Sq.ft calculator logic — only active when unit is Sq.ft and coverage is set
  const coveragePerBox: number = product.coverage || 0;
  const isSqftProduct = product.unit === 'Sq.ft' && coveragePerBox > 0;

  // Dual-mode calculator:
  // 'sqft' mode — user typed sq.ft, waste is applied, boxes are calculated
  // 'boxes' mode — user typed boxes directly, no waste re-applied
  const sqftNum = parseFloat(sqftInput) || 0;
  const boxesNum = parseInt(boxesInput) || 0;
  const hasInput = (lastEdited === 'sqft' && sqftNum > 0) || (lastEdited === 'boxes' && boxesNum > 0);

  let boxesNeeded: number;
  let actualCoverage: number;

  if (lastEdited === 'sqft' && sqftNum > 0) {
    boxesNeeded = Math.max(1, Math.ceil(sqftNum / coveragePerBox));
    actualCoverage = boxesNeeded * coveragePerBox;
  } else if (lastEdited === 'boxes' && boxesNum > 0) {
    boxesNeeded = Math.max(1, boxesNum);
    actualCoverage = boxesNeeded * coveragePerBox;
  } else {
    boxesNeeded = 1;
    actualCoverage = coveragePerBox;
  }

  // Price per sqft for display
  const pricePerSqft = coveragePerBox > 0 ? currentPrice / coveragePerBox : 0;

  const handleAddToCart = () => {
    if (isSqftProduct && !hasInput) {
      toast.error("Please enter the Sq.ft or Boxes you need before adding to cart");
      return;
    }
    addToCart({
      size: selectedSize || "default",
      variantId: selectedVariant?.id || product.id,
      stripeId: selectedVariant?.stripeId || `product_${product.id}`,
      productId: product.id,
      quantity: isSqftProduct ? boxesNeeded : quantity,
      ...(isSqftProduct && hasInput && {
        sqft: lastEdited === 'sqft' ? sqftNum : actualCoverage,
        coveragePerBox,
      }),
    });

    toast.success("Added to cart!");
  };

  const handleAddToWishlist = () => {
    if (!session?.user) {
      toast.info("Login first to add to wishlist");
      return;
    }
    addToWishlist(product.id);
    toast.success("Added to wishlist!");
  };


  return (
    <div className="space-y-6">
      {/* Product Tags - Colorful Badges */}
      {product.tags && product.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {product.tags.map((tag: string) => {
            const tagStyles: Record<string, string> = {
              popular: 'bg-blue-100 text-blue-700 border-blue-300',
              trending: 'bg-yellow-100 text-yellow-700 border-yellow-300',
              new: 'bg-green-100 text-green-700 border-green-300',
              premium: 'bg-purple-100 text-purple-700 border-purple-300',
              exclusive: 'bg-pink-100 text-pink-700 border-pink-300',
              classic: 'bg-slate-100 text-slate-700 border-slate-300',
              bestseller: 'bg-orange-100 text-orange-700 border-orange-300',
              limited: 'bg-red-100 text-red-700 border-red-300',
            };

            const tagIcons: Record<string, string> = {
              popular: '⭐',
              trending: '🔥',
              new: '✨',
              premium: '💎',
              exclusive: '👑',
              classic: '🏛️',
              bestseller: '🏆',
              limited: '⏰',
            };

            return (
              <span
                key={tag}
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${tagStyles[tag] || 'bg-gray-100 text-gray-700 border-gray-300'
                  }`}
              >
                {tagIcons[tag]} {tag.charAt(0).toUpperCase() + tag.slice(1)}
              </span>
            );
          })}
        </div>
      )}

      {/* Product Title */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 mb-2">
          {product.name}
        </h1>
        <p className="text-slate-600">{product.shortDescription || product.description}</p>

        {/* Product ID - Display variant ID if available, otherwise main product ID, fallback to _id */}
        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-lg">
          <span className="text-xs font-medium text-slate-600">Product ID:</span>
          <span className="text-sm font-semibold text-slate-900">
            {selectedVariant?.productId || product.productId || product._id}
          </span>
        </div>
      </div>

      {/* Price with MRP and Discount */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <div className="flex items-baseline flex-wrap gap-3 mb-1">
          <span className="text-sm text-slate-600">Price:</span>
          {currentPrice > 0 ? (
            <>
              {isSqftProduct && product.pricePerSqft && product.pricePerSqft > 0 ? (
                <>
                  <span className="text-3xl font-bold text-orange-500">₹{product.pricePerSqft.toFixed(0)}</span>
                  <span className="text-sm text-slate-600">/sq.ft</span>
                  <span className="text-sm text-slate-400">or</span>
                  <span className="text-xl font-semibold text-slate-600">₹{currentPrice.toFixed(0)}</span>
                  <span className="text-sm text-slate-600">/box</span>
                  {currentMRP && currentMRP > currentPrice && (
                    <>
                      <span className="text-lg text-slate-400 line-through">₹{currentMRP.toFixed(0)}</span>
                      <span className="text-sm font-semibold text-green-600 bg-green-100 px-2 py-1 rounded">
                        {Math.round(((currentMRP - currentPrice) / currentMRP) * 100)}% OFF
                      </span>
                    </>
                  )}
                </>
              ) : (
                <>
                  <span className="text-3xl font-bold text-orange-500">₹{currentPrice.toFixed(0)}</span>
                  {currentMRP && currentMRP > currentPrice && (
                    <>
                      <span className="text-lg text-slate-400 line-through">₹{currentMRP.toFixed(0)}</span>
                      <span className="text-sm font-semibold text-green-600 bg-green-100 px-2 py-1 rounded">
                        {Math.round(((currentMRP - currentPrice) / currentMRP) * 100)}% OFF
                      </span>
                    </>
                  )}
                  <span className="text-sm text-slate-600">/ {product.unit === 'Sq.ft' ? 'box' : 'unit'}</span>
                </>
              )}
            </>
          ) : (
            <>
              <span className="text-2xl font-bold text-blue-600">Get Price</span>
              <span className="text-sm text-slate-600">Contact us for pricing</span>
            </>
          )}
        </div>
        {/* Stock Count */}
        {currentStock !== undefined && currentStock > 0 && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-slate-600">Stock:</span>
            <span className={`text-xs font-semibold ${currentStock > 50 ? 'text-green-600' :
              currentStock > 10 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
              {currentStock} {product.unit === 'Sq.ft' ? 'boxes' : 'units'} available
            </span>
          </div>
        )}
        {currentStock === 0 && (
          <div className="mt-3 pt-3 border-t border-orange-200">
            <button
              onClick={() => setIsEnquiryModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              Enquire Now
            </button>
          </div>
        )}
      </div>


      {/* Available Colors - Image-based variant selection */}
      {uniqueColors.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-800 mb-3">Available Colors</h3>
          <div className="flex flex-wrap gap-3">
            {uniqueColors.map((color: any) => {
              // Find the variant for this color to get its featured image
              const variantForColor = allVariantOptions.find((v: any) => v.color === color);

              // Get the featured image from variant
              let variantImage = null;

              if (variantForColor?.images && Array.isArray(variantForColor.images) && variantForColor.images.length > 0) {
                const featuredImage = variantForColor.images.find((img: any) => img.isFeatured === true);
                variantImage = featuredImage?.url || variantForColor.images[0]?.url;
              }

              // Fallback to main product image if variant has no images
              if (!variantImage) {
                if (product.images && Array.isArray(product.images) && product.images.length > 0) {
                  const productFeaturedImage = product.images.find((img: any) => img.isFeatured === true);
                  variantImage = productFeaturedImage?.url || product.images[0]?.url;
                } else {
                  variantImage = product.img || '/placeholder-image.jpg';
                }
              }

              // Is this color available for the currently selected size?
              const isColorAvailable = colorsForSelectedSize.includes(color);

              return (
                <button
                  key={color}
                  onClick={() => {
                    setSelectedColor(color);
                    // If selected size is not available for this color, reset size
                    const sizesForThisColor = allVariantOptions
                      .filter((v: any) => v.color === color)
                      .flatMap((v: any) => (v.sizes && v.sizes.length > 0) ? v.sizes : [v.size])
                      .filter(Boolean);
                    if (selectedSize && !sizesForThisColor.includes(selectedSize)) {
                      setSelectedSize(sizesForThisColor[0] || "");
                    }
                  }}
                  title={!isColorAvailable ? `${color} - Not available in selected size` : color}
                  className={`relative group transition-all rounded-lg ${selectedColor === color
                      ? "ring-3 ring-orange-500 ring-offset-2"
                      : isColorAvailable
                        ? "hover:ring-2 hover:ring-orange-300 hover:ring-offset-2"
                        : "opacity-50 cursor-pointer"
                    }`}
                  style={{ width: '100px', height: '100px' }}
                >
                  {/* Variant Image */}
                  <div className={`w-full h-full rounded-lg overflow-hidden border-2 ${!isColorAvailable ? 'border-gray-300 grayscale' : 'border-gray-200'
                    }`}>
                    <img
                      src={variantImage}
                      alt={`${color} variant`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder-image.jpg';
                      }}
                    />
                  </div>

                  {/* Color Label */}
                  <div className={`absolute bottom-0 left-0 right-0 text-white text-xs py-1 px-2 text-center rounded-b-lg ${!isColorAvailable ? 'bg-red-700/80' : 'bg-black/70'
                    }`}>
                    {!isColorAvailable ? (
                      <span className="text-red-200 text-[10px] leading-tight block">Unavailable<br /><span className="text-white">{color}</span></span>
                    ) : color}
                  </div>

                  {/* Selected Checkmark */}
                  {selectedColor === color && (
                    <div className="absolute top-1 right-1 bg-orange-500 rounded-full p-1 shadow-lg">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}



      {/* Available Sizes */}
      {uniqueSizes.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-800 mb-3">Available Sizes</h3>
          <div className="flex flex-wrap gap-2">
            {uniqueSizes.map((size: any) => {
              const isSizeAvailable = sizesForSelectedColor.includes(size);
              return (
                <button
                  key={size}
                  onClick={() => {
                    setSelectedSize(size);
                    // If selected color doesn't have this size, switch to first color that does
                    if (!isSizeAvailable) {
                      const firstColorWithSize = allVariantOptions.find((v: any) => {
                        const vs = (v.sizes && v.sizes.length > 0) ? v.sizes : [v.size];
                        return vs.includes(size);
                      });
                      if (firstColorWithSize?.color) {
                        setSelectedColor(firstColorWithSize.color);
                      }
                    }
                  }}
                  disabled={!isSizeAvailable && false} // still clickable but styled differently
                  className={`relative px-6 py-3 rounded-lg border-2 font-medium transition-all ${selectedSize === size
                      ? "border-orange-500 bg-orange-50 text-orange-600"
                      : isSizeAvailable
                        ? "border-gray-300 text-slate-700 hover:border-orange-300"
                        : "border-gray-200 text-gray-400 bg-gray-50 cursor-pointer"
                    }`}
                  title={!isSizeAvailable ? `${size} - Not available in ${selectedColor}` : size}
                >
                  {/* Diagonal strikethrough line for unavailable sizes */}
                  {!isSizeAvailable && (
                    <span className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none">
                      <span className="absolute top-1/2 left-0 w-full h-[1.5px] bg-gray-400 transform -rotate-[20deg] origin-center" />
                    </span>
                  )}
                  {size}&quot;
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Finish selector — always full row when sq.ft product, else side-by-side with quantity */}
      {isSqftProduct ? (
        <>
          {/* Finish — full width for sq.ft products */}
          {uniqueFinishes.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Select Finish</h3>
              <select
                value={selectedFinish}
                onChange={(e) => setSelectedFinish(e.target.value)}
                className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all font-medium text-slate-700"
              >
                <option value="">Choose finish...</option>
                {uniqueFinishes.map((finish: any) => (
                  <option key={finish} value={finish}>
                    {finish.charAt(0).toUpperCase() + finish.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* ── Sq.ft Tile Calculator ── */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-800">Select Quantity</h3>
              <a
                href="/calculator"
                className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 font-medium"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                How much do I need? Calculate Now
              </a>
            </div>

            {/* Size Guide thumbnail */}
            {product.images && product.images.length > 0 && (
              <div className="px-4 pt-3 flex items-center gap-3">
                <div className="w-14 h-14 rounded-lg overflow-hidden border border-slate-200 flex-shrink-0">
                  <img
                    src={(product.images.find((i: any) => i.isFeatured) || product.images[0])?.url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-xs text-slate-500">
                  <div className="font-medium text-slate-700">{product.size || 'Size Guide'}</div>
                  {product.tilesPerBox && <div>{product.tilesPerBox} tiles/box · {coveragePerBox} Sq.ft/box</div>}
                  {pricePerSqft > 0 && <div className="text-orange-600 font-medium">₹{pricePerSqft.toFixed(2)} per Sq.ft</div>}
                </div>
              </div>
            )}


            {/* Sq.ft row */}
            <div className="px-4 pt-4">
              <div className="flex items-center gap-3">
                <span className="w-20 text-sm font-semibold text-slate-700 flex-shrink-0">Sq. ft.</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Enter Sq.ft"
                  value={lastEdited === 'boxes' ? (boxesNum > 0 ? (boxesNum * coveragePerBox).toFixed(2) : '') : sqftInput}
                  onChange={(e) => {
                    setSqftInput(e.target.value);
                    setLastEdited('sqft');
                  }}
                  className="flex-1 px-4 py-3 border-2 border-orange-400 rounded-lg text-center text-xl font-bold text-slate-800 focus:outline-none focus:border-orange-500 bg-orange-50"
                />
              </div>
            </div>

            {/* OR divider */}
            <div className="flex items-center px-4 py-2 gap-3">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs font-bold text-slate-400">OR</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* Boxes row */}
            <div className="px-4 pb-4">
              <div className="flex items-center gap-3">
                <span className="w-20 text-sm font-semibold text-slate-700 flex-shrink-0">Boxes</span>
                <input
                  type="number"
                  min="1"
                  placeholder="1"
                  value={lastEdited === 'sqft' ? (sqftNum > 0 ? String(boxesNeeded) : '') : boxesInput}
                  onChange={(e) => {
                    setBoxesInput(e.target.value);
                    setLastEdited('boxes');
                  }}
                  className="flex-1 px-4 py-3 border-2 border-slate-300 rounded-lg text-center text-xl font-bold text-slate-800 focus:outline-none focus:border-orange-400 bg-white"
                />
              </div>
            </div>

            {/* Helper message */}
            <div className={`mx-4 mb-4 px-3 py-2.5 rounded-lg text-xs border ${
              hasInput && lastEdited === 'sqft' && sqftNum !== actualCoverage
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : hasInput
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
              {hasInput ? (
                lastEdited === 'sqft' ? (
                  // Only show rounding warning if the entered value isn't already a perfect box multiple
                  sqftNum !== actualCoverage ? (
                    <>Quantity to be ordered in full boxes. So please enter <strong>{actualCoverage.toFixed(2)} Sq.ft</strong> for exactly {boxesNeeded} {boxesNeeded === 1 ? 'box' : 'boxes'}.</>
                  ) : (
                    // Perfect match — no rounding needed
                    <>✓ {boxesNeeded} {boxesNeeded === 1 ? 'box' : 'boxes'} selected, covering exactly <strong>{actualCoverage.toFixed(2)} Sq.ft</strong>.</>
                  )
                ) : (
                  <>✓ {boxesNeeded} {boxesNeeded === 1 ? 'box' : 'boxes'} selected, covering {actualCoverage.toFixed(2)} Sq.ft total.</>
                )
              ) : (
                <>Enter Sq.ft needed above. We&apos;ll calculate full boxes automatically (1 box = {coveragePerBox} Sq.ft).</>
              )}
            </div>

            {/* Total Coverage Area */}
            {hasInput && (
              <div className="mx-4 mb-3 flex justify-between items-center py-2.5 px-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-sm text-slate-600">Total Coverage Area</span>
                <span className="text-sm font-bold text-slate-800">{actualCoverage.toFixed(2)} Sq.ft</span>
              </div>
            )}

            {/* Total Amount */}
            <div className="mx-4 mb-4 flex justify-between items-center py-3 px-4 bg-slate-900 text-white rounded-lg">
              <div>
                <div className="text-xs text-slate-400">Total Amount</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {hasInput ? boxesNeeded : 1} {(hasInput ? boxesNeeded : 1) === 1 ? 'box' : 'boxes'} × ₹{currentPrice}
                </div>
              </div>
              <span className="text-2xl font-bold">
                ₹{(currentPrice * (hasInput ? boxesNeeded : 1)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Non-sq.ft: Finish + Quantity side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {uniqueFinishes.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-3">Select Finish</h3>
                <select
                  value={selectedFinish}
                  onChange={(e) => setSelectedFinish(e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all font-medium text-slate-700"
                >
                  <option value="">Choose finish...</option>
                  {uniqueFinishes.map((finish: any) => (
                    <option key={finish} value={finish}>
                      {finish.charAt(0).toUpperCase() + finish.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Select Quantity</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center border-2 border-gray-300 rounded-lg">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-4 py-2 text-xl font-semibold text-slate-700 hover:bg-gray-100 transition-colors"
                  >−</button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 text-center py-2 font-semibold text-slate-800 focus:outline-none bg-white"
                    min="1"
                  />
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-4 py-2 text-xl font-semibold text-slate-700 hover:bg-gray-100 transition-colors"
                  >+</button>
                </div>
              </div>
            </div>
          </div>

          {/* Total Price for non-sq.ft */}
          <div className="bg-slate-900 text-white rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Total Price:</span>
              <span className="text-2xl font-bold">₹{(currentPrice * quantity).toFixed(0)}</span>
            </div>
          </div>
        </>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        {/* Wishlist - 10% width - Heart Icon Only */}
        <button
          onClick={handleAddToWishlist}
          disabled={isAddingToWishlist}
          className="w-[10%] bg-slate-900 text-white py-4 rounded-lg hover:bg-slate-800 transition-colors font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          title="Add to Wishlist"
        >
          {isAddingToWishlist ? (
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg>
          )}
        </button>

        {/* Enquire Now - 40% width (or 90% if no price or no stock) */}
        <button
          onClick={() => setIsEnquiryModalOpen(true)}
          className={`${!product.price || product.price === 0 || currentStock === 0 ? 'w-[90%] bg-orange-500 hover:bg-orange-600' : 'w-[40%] bg-blue-600 hover:bg-blue-700'} text-white py-4 rounded-lg transition-colors font-semibold text-lg flex items-center justify-center gap-2`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          {!product.price || product.price === 0 ? 'Enquire for Price' : currentStock === 0 ? 'Enquire Now' : 'Enquire Now'}
        </button>

        {/* Add to Cart - 50% width - Only shown if price is available and stock > 0 */}
        {product.price && product.price > 0 && currentStock !== 0 ? (
          <button
            onClick={handleAddToCart}
            disabled={isAdding}
            className="w-[50%] bg-orange-500 text-white py-4 rounded-lg hover:bg-orange-600 transition-colors font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isAdding ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Adding...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Add to Cart
              </>
            )}
          </button>
        ) : null}
      </div>

      {/* Price on Request Message - Only shown if no price */}
      {(!product.price || product.price === 0) && (
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800 text-center">
            💡 <strong>Price on Request</strong> - Contact us for the best quote!
          </p>
        </div>
      )}

      {/* Contact Buttons - WhatsApp & Call */}
      <div className="mt-4 flex gap-3">
        {/* WhatsApp Button */}
        <a
          href={`https://wa.me/919738522119?text=Hi, I'm interested in *${encodeURIComponent(product.name)}*%0A%0AProduct Link: ${encodeURIComponent(window.location.href)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 py-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold text-lg"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
          </svg>
          WhatsApp
        </a>

        {/* Phone Call Button */}
        <a
          href="tel:+919738522119"
          className="flex-1 flex items-center justify-center gap-2 py-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold text-lg"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          Call Us
        </a>
      </div>

      {/* Enquiry Modal — pass pre-filled quantity so user doesn't have to re-enter */}
      <EnquiryModal
        isOpen={isEnquiryModalOpen}
        onClose={() => setIsEnquiryModalOpen(false)}
        product={product}
        prefillSqft={isSqftProduct && hasInput && lastEdited === 'sqft' ? sqftNum : undefined}
        prefillBoxes={isSqftProduct && hasInput ? boxesNeeded : undefined}
      />
    </div>
  );
};