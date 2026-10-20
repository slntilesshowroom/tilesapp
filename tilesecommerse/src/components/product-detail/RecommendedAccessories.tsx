import Image from "next/image";
import Link from "next/link";

export const RecommendedAccessories = () => {
  const accessories = [
    {
      id: "1",
      name: "Tile Adhesive (White)",
      price: 450,
      image: "https://images.unsplash.com/photo-1581783898377-1c85bf937427?w=400",
    },
    {
      id: "2",
      name: "Advanced Floor Adhesive & Grout",
      price: 550,
      image: "https://images.unsplash.com/photo-1581783898377-1c85bf937427?w=400",
    },
    {
      id: "3",
      name: "Economical & Non-Shrink Tile Adhesive",
      price: 380,
      image: "https://images.unsplash.com/photo-1581783898377-1c85bf937427?w=400",
    },
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Recommended Accessories</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {accessories.map((accessory) => (
          <div key={accessory.id} className="group border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
            <div className="relative aspect-square bg-gray-100">
              <Image
                src={accessory.image}
                alt={accessory.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-slate-800 mb-2 line-clamp-2 min-h-[3rem]">
                {accessory.name}
              </h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xl font-bold text-orange-500">₹{accessory.price}</p>
                  <p className="text-xs text-gray-500">per bag</p>
                </div>
                <Link href={`/product/${accessory.id}`}>
                  <button className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-orange-500 transition-colors text-sm font-medium">
                    View Item
                  </button>
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
