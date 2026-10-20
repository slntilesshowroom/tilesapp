import { Suspense } from "react";
import {
  HeroSlider,
  CollectionGrid,
  PopularProducts,
  TrendingProducts,
  NewProducts,
  PremiumProducts,
  ExclusiveProducts,
  ClassicProducts,
  BestSeller,
  LimitedEdition,
  BlogSection,
  SectionSkeleton,
  // Testimonials, // Temporarily disabled - will add back later
} from "@/components/home";

// Statically rendered and refreshed in the background. Previously
// 'force-dynamic', which rebuilt the whole page — and re-ran every section's
// data fetch — on every single visit. Admin product edits call
// revalidateProducts(), so publishing is still immediate.
export const revalidate = 300;

// Each section streams in on its own rather than the page waiting for the
// slowest query before sending any HTML.
const Section = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<SectionSkeleton />}>{children}</Suspense>
);

const Home = async () => {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero Slider */}
      <HeroSlider />

      {/* Collection Grid - Shop by Room */}
      <Section><CollectionGrid /></Section>

      {/* Popular Products */}
      <Section><PopularProducts /></Section>

      {/* Trending Products */}
      <Section><TrendingProducts /></Section>

      {/* New Products */}
      <Section><NewProducts /></Section>

      {/* Premium Products */}
      <Section><PremiumProducts /></Section>

      {/* Exclusive Products */}
      <Section><ExclusiveProducts /></Section>

      {/* Classic Products */}
      <Section><ClassicProducts /></Section>

      {/* Best Seller Products */}
      <Section><BestSeller /></Section>

      {/* Limited Edition Products */}
      <Section><LimitedEdition /></Section>

      {/* Blog Section */}
      <BlogSection />

      {/* Testimonials - Temporarily disabled */}
      {/* <Testimonials /> */}
    </main>
  );
};

export default Home;
