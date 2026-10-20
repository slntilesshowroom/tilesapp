"use client";

const tileColors = [
  { name: "White", color: "#FFFFFF", border: true },
  { name: "Beige", color: "#F5F5DC" },
  { name: "Cream", color: "#FFFDD0" },
  { name: "Gray", color: "#808080" },
  { name: "Black", color: "#1A1A1A" },
  { name: "Brown", color: "#8B4513" },
  { name: "Terracotta", color: "#E2725B" },
  { name: "Blue", color: "#4A90E2" },
  { name: "Green", color: "#7CB342" },
  { name: "Navy", color: "#1E3A5F" },
  { name: "Charcoal", color: "#36454F" },
  { name: "Ivory", color: "#FFFFF0" },
];

export const BrowseByColor = () => {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto bg-white">
      <div className="mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-3">
          Browse by Color
        </h2>
        <p className="text-slate-600 text-lg">
          Choose from our wide range of tile colors
        </p>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-8">
        {tileColors.map((tile, index) => (
          <button
            key={index}
            className="flex flex-col items-center gap-3 group"
            aria-label={`Browse ${tile.name} tiles`}
          >
            <div className="relative">
              {/* Ring animation on hover */}
              <div className="absolute inset-0 rounded-full border-4 border-yellow-500 scale-0 group-hover:scale-110 opacity-0 group-hover:opacity-100 transition-all duration-300" />

              <div
                className={`w-20 h-20 md:w-24 md:h-24 rounded-full shadow-lg hover:shadow-2xl transform hover:scale-110 transition-all duration-300 cursor-pointer ${tile.border ? "border-2 border-gray-300" : ""
                  }`}
                style={{ backgroundColor: tile.color }}
              />
            </div>
            <span className="text-xs md:text-sm font-medium text-gray-700 group-hover:text-yellow-500 transition-colors">
              {tile.name}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};
