// Imported directly rather than through the barrel: the barrel also pulls in
// every home section (and their server actions) for one skeleton.
import { SectionSkeleton } from "@/components/home/SectionSkeleton";

// Shown while the home page's first paint is being produced. The sections
// below the hero each stream in behind their own Suspense boundary.
export default function HomeLoading() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="w-full aspect-[21/9] max-h-[600px] bg-slate-200 animate-pulse" />
      <SectionSkeleton />
      <SectionSkeleton />
    </main>
  );
}
