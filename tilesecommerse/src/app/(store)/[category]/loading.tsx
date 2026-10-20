import { ProductsSkeleton } from "@/components/products";

export default function CategoryLoading() {
  return (
    <section className="pt-14">
      <ProductsSkeleton items={12} />
    </section>
  );
}
