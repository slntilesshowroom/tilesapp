"use server";

import { getProductsByTag } from "@/app/actions";

import Link from "next/link";
import { HomeProductCard } from "./HomeProductCard";


async function getPopularProducts() {
    try {
        // Mongo applies the tag filter, the limit and the random pick.
        // This previously downloaded the entire catalog on every render and
        // filtered + shuffled it in JS to show eight cards.
        const selected = await getProductsByTag('popular', 8);

        return selected.map((product: any) => ({
            _id: product._id,
            name: product.name,
            category: product.category?.name || 'Tiles',
            image: product.images?.[0]?.url || '/placeholder.jpg',
            price: product.price,
            cuttedPrice: product.cuttedPrice,
            slug: product.slug || product._id,
            unit: product.unit,
            coverage: product.coverage,
            tilesPerBox: product.tilesPerBox,
            pricePerSqft: product.pricePerSqft,
            hasVariants: product.variants && product.variants.length > 1,
            variantId: product.variants?.[0]?.id || product.id,
            stripeId: product.stripeId || product.variants?.[0]?.stripeId,
            size: product.size || 'default',
            variants: product.variants || [],
        }));
    } catch (error) {
        console.error('Error fetching popular products:', error);
        return [];
    }
}

export const PopularProducts = async () => {
    const products = await getPopularProducts();

    if (products.length === 0) {
        return (
            <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto bg-white">
                <div className="mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-3">
                        Popular Products
                    </h2>
                    <p className="text-slate-600 text-lg">
                        Customer favorites and best-selling tiles
                    </p>
                </div>
                <div className="text-center py-12 bg-slate-50 rounded-2xl">
                    <p className="text-slate-600">No popular products available yet. Add products with the 'popular' tag to see them here.</p>
                </div>
            </section>
        );
    }

    return (
        <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto bg-white">
            {/* Header */}
            <div className="flex justify-between items-end mb-12">
                <div>
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-3">
                        Popular Products
                    </h2>
                    <p className="text-slate-600 text-lg">
                        Customer favorites and best-selling tiles
                    </p>
                </div>
                <Link
                    href="/search?tags=popular"
                    className="hidden md:block text-yellow-500 hover:text-yellow-600 font-semibold transition-colors"
                >
                    View All →
                </Link>
            </div>

            {/* Products Grid - 4 columns × 2 rows */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {products.map((product: any) => (
                    <HomeProductCard key={product._id} product={product} />
                ))}
            </div>

            {/* View All Mobile */}
            <div className="mt-8 text-center md:hidden">
                <Link
                    href="/search?tags=popular"
                    className="inline-block px-8 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                >
                    View All Popular Products
                </Link>
            </div>
        </section>
    );
};
