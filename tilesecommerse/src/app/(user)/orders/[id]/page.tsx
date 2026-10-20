"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { HiArrowLeft, HiOutlineCube } from "react-icons/hi";
import { SVGLoadingIcon } from "@/components/ui/loader";
import OrderStatusTracker from "@/components/orders/OrderStatusTracker";

interface Order {
  _id: string;
  shippingInfo: {
    address: string;
    city: string;
    state: string;
    country: string;
    pincode: number;
    phoneNo: number;
  };
  orderItems: Array<{
    name: string;
    price: number;
    quantity: number;
    image: string;
    product: string;
  }>;
  user: {
    _id: string;
    name: string;
    email: string;
  };
  paymentInfo: {
    id: string;
    status: string;
  };
  totalPrice: number;
  couponCode?: string;
  discountAmount?: number;
  orderStatus: string;
  statusHistory?: Array<{
    status: string;
    timestamp: string;
    note?: string;
  }>;
  deliveredAt?: string;
  shippedAt?: string;
  packedAt?: string;
  createdAt: string;
  paidAt: string;
}

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      setError(false);

      const token = localStorage.getItem('auth_token');

      if (!token) {
        console.error('No auth token found');
        setError(true);
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1'}/order/${orderId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch order');
      }

      const data = await response.json();

      if (data.success && data.order) {
        setOrder(data.order);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error('Error fetching order:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <SVGLoadingIcon height={40} width={40} />
          <p className="mt-4 text-slate-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <div className="p-6 rounded-full bg-red-500/10">
          <HiOutlineCube className="w-16 h-16 text-red-500" />
        </div>
        <h2 className="text-3xl font-bold text-slate-900">Order Not Found</h2>
        <p className="text-center text-slate-600 max-w-md">
          The order you're looking for doesn't exist or you don't have access to it.
        </p>
        <Link
          href="/orders"
          className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
        >
          <HiArrowLeft className="w-4 h-4" />
          Back to Orders
        </Link>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Delivered':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Shipped':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Packed':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Processing':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Confirmed':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'Cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Link
            href="/orders"
            className="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <HiArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
              Order #{order._id.slice(-8).toUpperCase()}
            </h1>
            <p className="text-slate-600 mt-1">
              Placed on {new Date(order.createdAt).toLocaleDateString("en-IN", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <div className={`px-4 py-2 rounded-xl border-2 font-semibold ${getStatusColor(order.orderStatus)}`}>
            {order.orderStatus}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Order Items & Status Tracker */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Status Tracker */}
            <OrderStatusTracker
              currentStatus={order.orderStatus}
              statusHistory={order.statusHistory}
              createdAt={order.createdAt}
              deliveredAt={order.deliveredAt}
              shippedAt={order.shippedAt}
              packedAt={order.packedAt}
            />

            {/* Order Items */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Order Items</h2>
              <div className="space-y-4">
                {order.orderItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex gap-4 p-4 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
                  >
                    <div className="w-20 h-20 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <HiOutlineCube className="w-8 h-8 text-slate-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">{item.name}</h3>
                      <p className="text-sm text-slate-600 mt-1">
                        Quantity: <span className="font-medium">{item.quantity}</span>
                      </p>
                      <p className="text-sm text-slate-600">
                        Price: <span className="font-medium">₹{item.price.toLocaleString("en-IN")}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">
                        ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">Subtotal</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Order Info */}
          <div className="space-y-6">
            {/* Payment Info */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Payment Information</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Payment ID</span>
                  <span className="font-mono text-xs text-slate-900 bg-slate-100 px-2 py-1 rounded">
                    {order.paymentInfo.id.slice(0, 20)}...
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Method</span>
                  <span className="font-medium text-slate-900">
                    {order.paymentInfo.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Paid At</span>
                  <span className="font-medium text-slate-900">
                    {new Date(order.paidAt).toLocaleDateString("en-IN")}
                  </span>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Shipping Address</h2>
              <div className="text-sm text-slate-700 leading-relaxed space-y-1">
                <p className="font-semibold text-slate-900">{order.user.name}</p>
                <p>{order.shippingInfo.address}</p>
                <p>{order.shippingInfo.city}, {order.shippingInfo.state}</p>
                <p>{order.shippingInfo.pincode}</p>
                <p className="font-medium">{order.shippingInfo.country}</p>
                <p className="pt-2 border-t border-slate-200 mt-2">
                  Phone: {order.shippingInfo.phoneNo}
                </p>
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Order Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Items</span>
                  <span className="font-medium text-slate-900">
                    {order.orderItems.length}
                  </span>
                </div>

                {order.couponCode && order.discountAmount && order.discountAmount > 0 && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Subtotal</span>
                      <span className="font-medium text-slate-900">
                        ₹{(order.totalPrice + order.discountAmount).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Coupon ({order.couponCode})</span>
                      <span className="font-medium">
                        -₹{order.discountAmount.toFixed(2)}
                      </span>
                    </div>
                  </>
                )}

                <div className="border-t border-slate-200 pt-3 mt-3">
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-900">Total Amount</span>
                    <span className="text-xl font-bold text-orange-500">
                      ₹{order.totalPrice.toLocaleString("en-IN", {
                        minimumFractionDigits: 2
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
