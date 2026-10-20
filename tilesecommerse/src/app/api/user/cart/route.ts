import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

// In-memory storage for cart (in production, use a database)
// Updated to use async/await with cookies() for Next.js 15+
const cartStorage = new Map<string, any[]>();

// CORS headers helper
function setCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  return response;
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return setCorsHeaders(new NextResponse(null, { status: 200 }));
}

async function getUserId(request: NextRequest): Promise<string> {
  // Get user ID from session or create a guest session
  const cookieStore = await cookies();
  let userId = cookieStore.get('cart_session_id')?.value;

  if (!userId) {
    userId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  return userId;
}

export async function GET(request: NextRequest) {
  const userId = await getUserId(request);
  const items = cartStorage.get(userId) || [];

  const response = NextResponse.json({ items });
  response.cookies.set('cart_session_id', userId, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return setCorsHeaders(response);
}

export async function POST(request: NextRequest) {
  const userId = await getUserId(request);
  const body = await request.json();

  const items = cartStorage.get(userId) || [];

  // Ensure we have required fields
  const itemData: any = {
    variantId: body.variantId || body.productId,
    size: body.size || "default",
    stripeId: body.stripeId || `product_${body.productId}`,
    productId: body.productId,
    quantity: body.quantity || 1,
  };
  if (body.sqft !== undefined) itemData.sqft = body.sqft;
  if (body.coveragePerBox !== undefined) itemData.coveragePerBox = body.coveragePerBox;

  // Check if item already exists
  const existingItemIndex = items.findIndex(
    item => item.productId === itemData.productId && item.size === itemData.size
  );

  if (existingItemIndex >= 0) {
    // Update quantity
    items[existingItemIndex].quantity += itemData.quantity;
  } else {
    // Add new item
    const newItem = {
      id: Date.now(),
      userId,
      ...itemData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    items.push(newItem);
  }

  cartStorage.set(userId, items);

  const response = NextResponse.json({ success: true, items, item: items[items.length - 1] });
  response.cookies.set('cart_session_id', userId, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
  });

  return setCorsHeaders(response);
}

export async function DELETE(request: NextRequest) {
  const userId = await getUserId(request);
  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get('id');

  if (!itemId) {
    const errorResponse = NextResponse.json({ error: 'Item ID required' }, { status: 400 });
    return setCorsHeaders(errorResponse);
  }

  const items = cartStorage.get(userId) || [];
  const filteredItems = items.filter(item => item.id !== parseInt(itemId));

  cartStorage.set(userId, filteredItems);

  return setCorsHeaders(NextResponse.json({ success: true, items: filteredItems }));
}

export async function PATCH(request: NextRequest) {
  const userId = await getUserId(request);
  const body = await request.json();
  const { itemId, quantity } = body;

  const items = cartStorage.get(userId) || [];
  const itemIndex = items.findIndex(item => item.id === itemId);

  if (itemIndex >= 0) {
    items[itemIndex].quantity = quantity;
    cartStorage.set(userId, items);
  }

  return setCorsHeaders(NextResponse.json({ success: true, items }));
}
