"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
    HiMail,
    HiCalendar,
    HiUser,
    HiPhone,
    HiLocationMarker,
    HiShoppingBag,
    HiCurrencyRupee,
    HiCheckCircle,
    HiXCircle,
} from "react-icons/hi";
import { toast } from "sonner";

interface Enquiry {
    _id: string;
    product: {
        _id: string;
        name: string;
        price: number;
        images?: { url: string }[];
    };
    productName: string;
    quantity: number;
    totalPrice: number;
    customerName: string;
    customerPhone: string;
    customerCity: string;
    message?: string;
    status: 'pending' | 'contacted' | 'quoted' | 'converted' | 'rejected';
    createdAt: string;
}

export default function AdminEnquiryPage() {
    const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, todayCount: 0 });
    const [filter, setFilter] = useState<string>('all');

    useEffect(() => {
        fetchEnquiries();
        fetchStats();
    }, [filter]);

    const fetchEnquiries = async () => {
        try {
            const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1';
            const url = filter === 'all'
                ? `${API_BASE_URL}/enquiries`
                : `${API_BASE_URL}/enquiries?status=${filter}`;

            const response = await fetch(url, {
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Failed to fetch enquiries');
            }

            const data = await response.json();
            setEnquiries(data.data.enquiries || []);
        } catch (error) {
            console.error('Error fetching enquiries:', error);
            toast.error('Failed to load enquiries');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1';
            const response = await fetch(`${API_BASE_URL}/enquiries/stats`, {
                credentials: 'include',
            });

            if (response.ok) {
                const data = await response.json();
                setStats(data.data);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const updateStatus = async (id: string, newStatus: string) => {
        try {
            const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1';
            const response = await fetch(`${API_BASE_URL}/enquiries/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ status: newStatus }),
            });

            if (!response.ok) {
                throw new Error('Failed to update status');
            }

            toast.success('Status updated successfully');
            fetchEnquiries();
            fetchStats();
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error('Failed to update status');
        }
    };

    const statusColors: Record<string, string> = {
        pending: 'bg-yellow-100 text-yellow-800',
        contacted: 'bg-blue-100 text-blue-800',
        quoted: 'bg-purple-100 text-purple-800',
        converted: 'bg-green-100 text-green-800',
        rejected: 'bg-red-100 text-red-800',
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Enquiries Management</h1>
                    <p className="text-slate-600 mt-1">
                        View and manage customer product enquiries
                    </p>
                </div>
                <div className="flex gap-4">
                    <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-slate-200">
                        <HiMail className="w-5 h-5 text-slate-600" />
                        <span className="font-semibold text-slate-900">{stats.total}</span>
                        <span className="text-slate-600 text-sm">Total</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 rounded-lg border border-orange-200">
                        <HiCalendar className="w-5 h-5 text-orange-600" />
                        <span className="font-semibold text-orange-900">{stats.todayCount}</span>
                        <span className="text-orange-700 text-sm">Today</span>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
                {['all', 'pending', 'contacted', 'quoted', 'converted', 'rejected'].map((status) => (
                    <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors capitalize ${filter === status
                            ? 'bg-orange-500 text-white'
                            : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                            }`}
                    >
                        {status}
                    </button>
                ))}
            </div>

            {/* Enquiries Table */}
            <div className="bg-white rounded-xl shadow-md border border-slate-200">
                {enquiries.length === 0 ? (
                    <div className="text-center py-20">
                        <HiMail className="w-20 h-20 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-slate-900 mb-2">
                            No Enquiries Yet
                        </h3>
                        <p className="text-slate-600">
                            Customer enquiries will appear here
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">
                                        Product
                                    </th>
                                    <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">
                                        Customer
                                    </th>
                                    <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">
                                        Quantity
                                    </th>
                                    <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">
                                        Date
                                    </th>
                                    <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">
                                        Status
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
                                {enquiries.map((enquiry) => (
                                    <tr
                                        key={enquiry._id}
                                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                                    >
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                {enquiry.product?.images?.[0]?.url && (
                                                    <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                                        <Image
                                                            src={enquiry.product.images[0].url}
                                                            alt={enquiry.productName}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    </div>
                                                )}
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-slate-900 line-clamp-1">
                                                        {enquiry.productName}
                                                    </span>
                                                    <span className="text-xs text-slate-500">
                                                        ID: {enquiry._id.slice(-8)}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <HiUser className="w-4 h-4 text-slate-400" />
                                                    <span className="text-slate-900">{enquiry.customerName}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <HiPhone className="w-4 h-4 text-slate-400" />
                                                    <span className="text-xs text-slate-600">{enquiry.customerPhone}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <HiLocationMarker className="w-4 h-4 text-slate-400" />
                                                    <span className="text-xs text-slate-600">{enquiry.customerCity}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                <HiShoppingBag className="w-3 h-3" />
                                                {enquiry.quantity} Box(es)
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-2">
                                                <HiCalendar className="w-4 h-4 text-slate-400" />
                                                <span className="text-slate-600 text-sm">
                                                    {new Date(enquiry.createdAt).toLocaleDateString("en-IN", {
                                                        year: "numeric",
                                                        month: "short",
                                                        day: "numeric",
                                                    })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <select
                                                value={enquiry.status}
                                                onChange={(e) => updateStatus(enquiry._id, e.target.value)}
                                                className={`px-2.5 py-1 rounded-full text-xs font-medium border-0 cursor-pointer ${statusColors[enquiry.status]}`}
                                            >
                                                <option value="pending">Pending</option>
                                                <option value="contacted">Contacted</option>
                                                <option value="quoted">Quoted</option>
                                                <option value="converted">Converted</option>
                                                <option value="rejected">Rejected</option>
                                            </select>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            {enquiry.totalPrice > 0 ? (
                                                <div className="flex items-center justify-end gap-1">
                                                    <HiCurrencyRupee className="w-4 h-4 text-slate-600" />
                                                    <span className="font-semibold text-slate-900">
                                                        {enquiry.totalPrice.toLocaleString("en-IN", {
                                                            minimumFractionDigits: 2,
                                                            maximumFractionDigits: 2,
                                                        })}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-blue-600 font-medium">Price on Request</span>
                                            )}
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <div className="flex flex-col gap-2">
                                                {/* Status Action Buttons */}
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => updateStatus(enquiry._id, 'converted')}
                                                        className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                                                        title="Mark as Converted"
                                                    >
                                                        <HiCheckCircle className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => updateStatus(enquiry._id, 'rejected')}
                                                        className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                                                        title="Mark as Rejected"
                                                    >
                                                        <HiXCircle className="w-4 h-4" />
                                                    </button>
                                                </div>

                                                {/* Contact Buttons */}
                                                <div className="flex gap-2">
                                                    {/* WhatsApp Button */}
                                                    <a
                                                        href={`https://wa.me/919738522119?text=Hi ${enquiry.customerName}, regarding your enquiry for ${enquiry.productName} (${enquiry.quantity} boxes)`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-xs font-medium"
                                                        title="Contact via WhatsApp"
                                                    >
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                                        </svg>
                                                        WhatsApp
                                                    </a>

                                                    {/* Phone Call Button */}
                                                    <a
                                                        href="tel:+919738522119"
                                                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-xs font-medium"
                                                        title="Call Customer"
                                                    >
                                                        <HiPhone className="w-4 h-4" />
                                                        Call
                                                    </a>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
