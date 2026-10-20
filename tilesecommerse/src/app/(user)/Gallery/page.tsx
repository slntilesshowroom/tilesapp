import Image from 'next/image';
import Link from 'next/link';

// Statically rendered, refreshed in the background. Was 'force-dynamic' with
// cache: 'no-store', so every visit re-downloaded the whole catalog uncached.
export const revalidate = 300;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1';

// Paginated rather than capped: the gallery still reaches the whole catalog,
// it just does not download all of it at once.
const GALLERY_PAGE_SIZE = 60;

async function getGalleryProducts(page: number) {
  const empty = { products: [] as any[], totalPages: 0, totalProducts: 0 };
  try {
    const response = await fetch(
      `${API_BASE_URL}/products?page=${page}&limit=${GALLERY_PAGE_SIZE}`,
      { next: { revalidate: 300 } }
    );

    if (!response.ok) {
      console.error('Failed to fetch products');
      return empty;
    }

    const data = await response.json();
    if (!data.success) return empty;

    return {
      products: data.products,
      totalPages: data.totalPages ?? 0,
      totalProducts: data.filteredProductsCount ?? 0,
    };
  } catch (error) {
    console.error('Error fetching products:', error);
    return empty;
  }
}

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam || '1') || 1);
  const { products, totalPages, totalProducts } = await getGalleryProducts(page);

  return (
    <div className="min-h-screen bg-gray-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4">
            Product Gallery
          </h1>
          <p className="text-lg text-slate-600">
            Browse our complete collection of premium tiles
          </p>
          {totalProducts > 0 && (
            <p className="text-sm text-slate-500 mt-2">
              Showing {(page - 1) * GALLERY_PAGE_SIZE + 1}–
              {Math.min(page * GALLERY_PAGE_SIZE, totalProducts)} of {totalProducts}
            </p>
          )}
        </div>

        {/* Image Grid */}
        {products.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm">
            <p className="text-slate-600 text-lg">No products available yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product: any) => {
              const featuredImage = product.images?.find((img: any) => img.isFeatured);
              const imageUrl = featuredImage?.url || product.images?.[0]?.url || '/placeholder.jpg';

              return (
                <Link
                  key={product._id}
                  href={`/${product.category?.slug || 'tiles'}/${product._id}`}
                  className="group relative aspect-square overflow-hidden rounded-lg bg-gray-100 hover:shadow-xl transition-all duration-300"
                >
                  <Image
                    src={imageUrl}
                    alt={product.name || 'Product'}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />

                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />

                  {/* Optional: Show product name on hover */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <p className="text-white font-medium text-sm line-clamp-2">
                      {product.name}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <nav className="flex items-center justify-center gap-3 mt-12" aria-label="Gallery pages">
            {page > 1 ? (
              <Link
                href={`/Gallery?page=${page - 1}`}
                className="px-5 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
              >
                ← Previous
              </Link>
            ) : (
              <span className="px-5 py-2.5 border border-slate-100 rounded-lg text-slate-300">
                ← Previous
              </span>
            )}

            <span className="text-sm text-slate-600">
              Page {page} of {totalPages}
            </span>

            {page < totalPages ? (
              <Link
                href={`/Gallery?page=${page + 1}`}
                className="px-5 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Next →
              </Link>
            ) : (
              <span className="px-5 py-2.5 border border-slate-100 rounded-lg text-slate-300">
                Next →
              </span>
            )}
          </nav>
        )}
      </div>
    </div>
  );
}
