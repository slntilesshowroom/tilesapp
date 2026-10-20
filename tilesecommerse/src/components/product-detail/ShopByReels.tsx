"use client";

import Image from "next/image";

export const ShopByReels = () => {
  const reels = [
    {
      id: "1",
      image: "https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?w=400",
      title: "Modern Bathroom Design",
    },
    {
      id: "2",
      image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400",
      title: "Kitchen Backsplash Ideas",
    },
    {
      id: "3",
      image: "https://images.unsplash.com/photo-1615875221248-3e9d5b90e593?w=400",
      title: "Wooden Floor Tiles",
    },
    {
      id: "4",
      image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=400",
      title: "Living Room Flooring",
    },
    {
      id: "5",
      image: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=400",
      title: "Outdoor Tiles",
    },
    {
      id: "6",
      image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400",
      title: "Wall Tile Designs",
    },
    {
      id: "7",
      image: "https://images.unsplash.com/photo-1615971677499-5467cbab01c0?w=400",
      title: "Contemporary Flooring",
    },
  ];

  return (
    <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-6">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Shop by Reels</h2>
      <div className="flex gap-4 overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {reels.map((reel) => (
          <div
            key={reel.id}
            className="flex-shrink-0 w-48 group cursor-pointer"
          >
            <div className="relative aspect-[9/16] rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-shadow">
              <Image
                src={reel.image}
                alt={reel.title}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="text-white font-semibold text-sm">{reel.title}</h3>
              </div>
              {/* Play button overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-orange-500 ml-1" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
