"use server";

import Link from "next/link";
import Image from "next/image";
import { getProductsByTag as fetchProductsByTag } from "@/app/actions";

// Application tags we want to show
const applicationTags = [
  { tag: 'kitchen', title: 'Kitchen', description: 'Heat-resistant & easy to clean', icon: '🍳' },
  { tag: 'bathroom', title: 'Bathroom', description: 'Water-resistant & elegant designs', icon: '🚿' },
  { tag: 'living-room', title: 'Living Room', description: 'Modern & stylish floor tiles', icon: '🛋️' },
  { tag: 'bedroom', title: 'Bedroom', description: 'Comfortable & cozy designs', icon: '🛏️' },
  { tag: 'outdoor', title: 'Outdoor', description: 'Weather-resistant & durable', icon: '🌳' },
  { tag: 'commercial', title: 'Commercial', description: 'Heavy-duty & professional', icon: '🏢' },
];

async function getRoomCollections() {
  try {
    // One random product per room tag, picked by Mongo's $sample. These six
    // requests hit the Data Cache and run in parallel — cheaper than the single
    // full-catalog download this replaces, which pulled every product just to
    // read six names and image URLs off it.
    const picks = await Promise.all(
      applicationTags.map(({ tag }) => fetchProductsByTag(tag, 1))
    );

    return applicationTags
      .map(({ tag, title, description, icon }, i) => {
        const product = picks[i][0];
        if (!product) return null;

        return {
          tag,
          title,
          description,
          icon,
          product: {
            id: product._id,
            name: product.name,
            image: product.images?.[0]?.url || '/placeholder.jpg',
            price: product.price,
          },
        };
      })
      .filter(Boolean);
  } catch (error) {
    console.error('Error fetching room collections:', error);
    return [];
  }
}

export const CollectionGrid = async () => {
  const collections = await getRoomCollections();

  if (collections.length === 0) {
    return (
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto bg-white">
        <div className="mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-3">
            Shop by Room
          </h2>
          <p className="text-slate-600 text-lg">
            Find the perfect tiles for every space in your home
          </p>
        </div>
        <div className="text-center py-12 bg-slate-50 rounded-2xl">
          <p className="text-slate-600">No products available yet. Add products with room tags to see them here.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto bg-white">
      <div className="mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-3">
          Shop by Room
        </h2>
        <p className="text-slate-600 text-lg">
          Find the perfect tiles for every space in your home
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {collections.map((collection: any, index: number) => (
          <Link
            key={index}
            href={`/search?roomType=${collection.tag}`}
            className="group relative overflow-hidden rounded-2xl bg-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
          >
            <div className="relative h-64 overflow-hidden">
              <Image
                src={collection.product.image}
                alt={collection.title}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

              {/* Icon badge */}
              <div className="absolute top-4 right-4 w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/50">
                <span className="text-2xl">{collection.icon}</span>
              </div>

              {/* Icon overlay on hover */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/50">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
              <h3 className="text-2xl font-bold mb-2 group-hover:text-yellow-400 transition-colors">{collection.title}</h3>
              <p className="text-gray-200 text-sm">{collection.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};
