import { ProductsSkeleton } from "@/components/products";

// Without this file, clicking a category left the previous page frozen on
// screen until the new one's data resolved — the reason the navbar carries a
// hand-rolled "Loading…" overlay.
export default function SearchLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="h-5 w-48 bg-slate-200 rounded animate-pulse mb-6" />

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filter sidebar placeholder */}
          <aside className="hidden lg:block w-64 shrink-0 space-y-4">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-5 w-32 bg-slate-200 rounded mb-3" />
                <div className="space-y-2">
                  <div className="h-4 w-full bg-slate-100 rounded" />
                  <div className="h-4 w-5/6 bg-slate-100 rounded" />
                  <div className="h-4 w-4/6 bg-slate-100 rounded" />
                </div>
              </div>
            ))}
          </aside>

          <div className="flex-1">
            <div className="h-9 w-64 bg-slate-200 rounded animate-pulse mb-8" />
            <ProductsSkeleton items={12} />
          </div>
        </div>
      </div>
    </div>
  );
}
