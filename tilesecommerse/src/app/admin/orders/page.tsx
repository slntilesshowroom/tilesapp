"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  HiEye,
  HiClipboardList,
  HiCalendar,
  HiUser,
  HiMail,
  HiCurrencyRupee,
} from "react-icons/hi";
import { FiChevronLeft, FiChevronRight, FiSearch, FiX } from "react-icons/fi";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search and Pagination state
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchOrders();
  }, [searchQuery, currentPage, itemsPerPage]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(''); // Clear previous errors
      const token = localStorage.getItem('auth_token');

      // Fetch ALL orders (backend doesn't support pagination)
      const response = await fetch(`${API_BASE_URL}/admin/orders`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        cache: 'no-store',
      });

      const result = await response.json();
      console.log('Orders API response:', result); // Debug log

      if (result.success) {
        let allOrders = result.orders || [];
        console.log('Total orders fetched:', allOrders.length); // Debug log

        // Client-side filtering by search query
        if (searchQuery) {
          const searchLower = searchQuery.toLowerCase();
          console.log('Searching for:', searchQuery); // Debug log

          allOrders = allOrders.filter((order: any) => {
            try {
              // Search by Order ID (case-insensitive, partial match)
              if (order._id?.toLowerCase().includes(searchLower)) return true;

              // Search by customer name
              if (order.user?.name?.toLowerCase().includes(searchLower)) return true;

              // Search by customer email
              if (order.user?.email?.toLowerCase().includes(searchLower)) return true;

              // Search by phone number (exact match, no case conversion)
              if (order.shippingInfo?.phoneNo?.includes(searchQuery)) return true;

              // Search by order status
              if (order.orderStatus?.toLowerCase().includes(searchLower)) return true;

              // Search by date (format: YYYY-MM-DD or DD/MM/YYYY or any partial date)
              if (order.createdAt) {
                const orderDate = new Date(order.createdAt);
                const dateStr = orderDate.toLocaleDateString('en-IN'); // DD/MM/YYYY
                const isoDateStr = orderDate.toISOString().split('T')[0]; // YYYY-MM-DD
                const readableDateStr = orderDate.toLocaleDateString('en-IN', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                }); // e.g., "22 Feb 2026"

                if (dateStr.includes(searchQuery) ||
                    isoDateStr.includes(searchQuery) ||
                    readableDateStr.toLowerCase().includes(searchLower)) {
                  return true;
                }
              }

              return false;
            } catch (filterError) {
              console.error('Error filtering order:', order._id, filterError);
              return false;
            }
          });

          console.log('Filtered orders count:', allOrders.length); // Debug log
        }

        // Client-side pagination
        const totalCount = allOrders.length;
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedOrders = allOrders.slice(startIndex, endIndex);

        setOrders(paginatedOrders);
        setTotalOrders(totalCount);
        setTotalPages(Math.ceil(totalCount / itemsPerPage));
      } else {
        console.error('API returned error:', result.message);
        setError(result.message || 'Failed to fetch orders');
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to load orders. Please check console for details.');
    } finally {
      setLoading(false);
    }
  };

  // Search handlers
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput.trim());
    setCurrentPage(1);
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setSearchQuery("");
    setCurrentPage(1);
  };

  // Pagination handlers
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  // Generate page numbers
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const itemsPerPageOptions = [6, 12, 18, 24, 30];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Orders Management</h1>
          <p className="text-slate-600 mt-1">
            View and manage all customer orders
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-slate-200">
          <HiClipboardList className="w-5 h-5 text-slate-600" />
          <span className="font-semibold text-slate-900">{totalOrders}</span>
          <span className="text-slate-600 text-sm">Total Orders</span>
        </div>
      </div>

      {/* Search Box */}
      <div className="bg-white rounded-xl shadow-md border border-slate-200 p-4">
        <form onSubmit={handleSearchSubmit} className="relative">
          <div className="relative">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by order ID, customer name, phone, date, or status..."
              className="w-full pl-12 pr-24 py-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
            />
            {searchInput && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="mr-3 absolute right-20 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full transition-colors"
                title="Clear search"
              >
                <FiX className="w-5 h-5 text-slate-400 hover:text-slate-600" />
              </button>
            )}
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors text-sm font-medium"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Items Per Page Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-600 font-medium whitespace-nowrap">Show:</span>
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
          {itemsPerPageOptions.map((option) => (
            <button
              key={option}
              onClick={() => handleItemsPerPageChange(option)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                itemsPerPage === option
                  ? "bg-orange-500 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
        <span className="text-sm text-slate-600 whitespace-nowrap">per page</span>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-white rounded-xl shadow-md border border-slate-200">
        {orders.length === 0 ? (
          <div className="text-center py-20">
            <HiClipboardList className="w-20 h-20 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              No Orders Yet
            </h3>
            <p className="text-slate-600">
              Customer orders will appear here when they make purchases
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">
                    Order ID
                  </th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">
                    Customer
                  </th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">
                    Order Date
                  </th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">
                    Status
                  </th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">
                    Items
                  </th>
                  <th className="text-right py-4 px-6 text-sm font-semibold text-slate-700">
                    Amount
                  </th>
                  <th className="text-center py-4 px-6 text-sm font-semibold text-slate-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order: any) => {
                  const statusColors: Record<string, string> = {
                    'Processing': 'bg-yellow-100 text-yellow-800',
                    'Shipped': 'bg-blue-100 text-blue-800',
                    'Delivered': 'bg-green-100 text-green-800',
                  };

                  return (
                    <tr
                      key={order._id}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="font-mono text-sm text-slate-900">
                            {order._id.slice(-8)}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <HiUser className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-900">
                              {order.user?.name || "Guest User"}
                            </span>
                          </div>
                          {order.shippingInfo?.phoneNo && (
                            <span className="text-xs text-slate-500 ml-6">
                              {order.shippingInfo.phoneNo}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <HiCalendar className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-600 text-sm">
                            {new Date(order.createdAt).toLocaleDateString("en-IN", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[order.orderStatus] || 'bg-gray-100 text-gray-800'}`}>
                          {order.orderStatus}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {order.orderItems?.length || 0} items
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <HiCurrencyRupee className="w-4 h-4 text-slate-600" />
                          <span className="font-semibold text-slate-900">
                            {Number(order.totalPrice || 0).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <Link
                          href={`/admin/orders/${order._id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
                        >
                          <HiEye className="w-4 h-4" />
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalOrders > 0 && totalPages > 1 && (
        <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6">
          {/* Page Navigation */}
          <div className="flex items-center justify-center gap-2">
            {/* Previous Button */}
            <button
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
            >
              <FiChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Previous</span>
            </button>

            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {getPageNumbers().map((page, index) => (
                page === '...' ? (
                  <span key={`ellipsis-${index}`} className="px-2 text-slate-400">
                    ...
                  </span>
                ) : (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page as number)}
                    className={`min-w-[40px] h-10 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                      currentPage === page
                        ? "bg-orange-500 text-white shadow-sm"
                        : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {page}
                  </button>
                )
              ))}
            </div>

            {/* Next Button */}
            <button
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
            >
              <span className="hidden sm:inline">Next</span>
              <FiChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Page Info */}
          <div className="text-center text-sm text-slate-500 mt-4">
            Page {currentPage} of {totalPages}
          </div>
        </div>
      )}
    </div>
  );
}
