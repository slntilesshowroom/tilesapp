import Link from "next/link";
import Image from "next/image";

export const HeroBanner = () => {
  return (
    <section className="relative h-[500px] md:h-[600px] w-full overflow-hidden bg-slate-900">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="https://images.unsplash.com/photo-1615971677499-5467cbab01c0?q=80&w=2000"
          alt="Premium Tiles Collection"
          fill
          className="object-cover opacity-50"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 to-slate-900/50" />
      </div>

      {/* Content */}
      <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center">
        <div className="max-w-2xl">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Complete Tiles & Sanitary Solutions Showroom
          </h1>
          <p className="text-lg md:text-xl text-gray-200 mb-8">
            From vitrified tiles to designer bathware, discover quality, durability, and style in every product.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/ceramic"
              className="px-8 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-lg transition-colors duration-200"
            >
              Explore Collection
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
