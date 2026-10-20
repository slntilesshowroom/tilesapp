// Mock database repositories for frontend-only app
import { dummyTileProducts } from "@/lib/data/dummy-tiles";

export const productsRepository = {
  findAll: async () => dummyTileProducts,
  findById: async (id: number) => dummyTileProducts.find((p: any) => p.id === id),
  findByCategory: async (category: string) =>
    dummyTileProducts.filter((p: any) => p.category === category),
  create: async (product: any) => product,
  update: async (id: number, product: any) => product,
  delete: async (id: number) => true,
};

export const cartRepository = {
  findByUserId: async () => [],
  addItem: async () => ({ id: 1 }),
  removeItem: async () => true,
  updateItem: async () => ({ id: 1 }),
  clear: async () => true,
};

export const wishlistRepository = {
  findByUserId: async () => [],
  addItem: async () => ({ id: 1 }),
  removeItem: async () => true,
};

export const ordersRepository = {
  findAll: async () => [
    {
      id: "1",
      orderNumber: "ORD-1",
      userId: "mock-user-id",
      status: "pending",
      totalAmount: 17800,
      createdAt: new Date(),
      customer: {
        name: "Demo User",
        email: "demo@example.com",
      },
      customerInfo: {
        name: "Demo User",
        email: "demo@example.com",
        totalPrice: 17800,
      },
      deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      orderProducts: [],
    },
  ],
  findByUserId: async (userId: string) => [],
  findById: async (id: string | number) => ({
    id: String(id),
    userId: "mock-user-id",
    orderNumber: `ORD-${id}`,
    status: "pending",
    totalAmount: 0,
    products: [],
    orderProducts: [
      {
        id: 1,
        quantity: 2,
        price: 89.0,
        size: "24x24",
        color: "White Carrara",
        variant: {
          id: "1-1",
          color: "White Carrara",
          size: "24x24",
          product: {
            id: 1,
            name: "Premium Marble Look Vitrified Tiles",
            img: "https://images.unsplash.com/photo-1615873968403-89e068629265?w=800",
            price: 89.0,
          },
        },
      },
    ],
    customerInfo: {
      name: "Demo User",
      email: "demo@example.com",
      address: {
        line1: "123 Demo St",
        line2: "Apt 4B",
        city: "Demo City",
        state: "Demo State",
        postal_code: "12345",
        country: "Demo Country",
      },
      phone: "555-0123",
      totalPrice: 17800, // Price in cents (₹178.00)
    },
    createdAt: new Date(),
    deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    paymentMethod: "Credit Card",
  }),
  create: async (order: any) => ({ id: 1 }),
  update: async (id: string, order: any) => ({}),
  addCustomerInfo: async (orderId: string | number, customerInfo: any) => ({
    id: 1,
    orderId,
    ...customerInfo,
  }),
  addOrderItems: async (orderId: string | number, items: any[]) => items.map((item, i) => ({ id: i + 1, ...item })),
  addProducts: async (orderId: string | number, products: any[]) => products.map((p, i) => ({ id: i + 1, ...p })),
};
