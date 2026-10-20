// Placeholder shown while a home section streams in. Matches the real
// sections' spacing so the page doesn't jump when content arrives.
export const SectionSkeleton = () => (
  <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto bg-white">
    <div className="mb-12 animate-pulse">
      <div className="h-9 w-72 max-w-full bg-slate-200 rounded mb-3" />
      <div className="h-5 w-96 max-w-full bg-slate-100 rounded" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-square bg-slate-200 rounded-xl mb-3" />
          <div className="h-4 w-3/4 bg-slate-200 rounded mb-2" />
          <div className="h-4 w-1/3 bg-slate-100 rounded" />
        </div>
      ))}
    </div>
  </section>
);
