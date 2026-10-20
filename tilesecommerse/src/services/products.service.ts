// Mock product service for frontend-only app
import { dummyTileProducts } from "@/lib/data/dummy-tiles";

export async function getProductById(id: string | number) {
  const numId = typeof id === "string" ? parseInt(id) : id;
  return dummyTileProducts.find((p: any) => p.id === numId) || null;
}

export async function getAllProducts() {
  return dummyTileProducts;
}

export async function getProductsByCategory(category: string) {
  return dummyTileProducts.filter((p: any) => p.category === category);
}
