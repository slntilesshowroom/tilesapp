"use client";

import CategoryManagement from "@/components/admin/settings/CategoryManagement";

export default function AdminCategoriesPage() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Categories</h1>
                <p className="text-slate-600 mt-1">Manage your product categories (3 levels: Category → Subcategory → Sub-subcategory)</p>
            </div>

            {/* Category Management Component */}
            <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6">
                <CategoryManagement />
            </div>
        </div>
    );
}
