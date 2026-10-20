"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/auth/client";
import { toast } from "sonner";
import {
  HiHome,
  HiShoppingBag,
  HiFolder,
  HiClipboardList,
  HiMail,
  HiNewspaper,
  HiTag,
  HiUsers,
  HiCog,
  HiLogout,
} from "react-icons/hi";

const sidebarItems = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: HiHome,
  },
  {
    title: "Products",
    href: "/admin/products",
    icon: HiShoppingBag,
  },
  {
    title: "Categories",
    href: "/admin/categories",
    icon: HiFolder,
  },
  {
    title: "Orders",
    href: "/admin/orders",
    icon: HiClipboardList,
  },
  {
    title: "Enquiries",
    href: "/admin/enquiry",
    icon: HiMail,
  },
  {
    title: "Blogs",
    href: "/admin/blogs",
    icon: HiNewspaper,
  },
  {
    title: "Coupons",
    href: "/admin/coupons",
    icon: HiTag,
  },
  {
    title: "Customers",
    href: "/admin/customers",
    icon: HiUsers,
  },
  {
    title: "Settings",
    href: "/admin/settings",
    icon: HiCog,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-slate-900 text-white border-r border-slate-800 z-40">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
            <HiShoppingBag className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg">Tiles Admin</h1>
            <p className="text-xs text-slate-400">Management Panel</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-1">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                isActive
                  ? "bg-orange-500 text-white shadow-lg"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.title}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800 space-y-2">
        <Link
          href="/"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          <span>Back to Store</span>
        </Link>
        <button
          onClick={async () => {
            await signOut();
            toast.success("Logged out successfully");
            window.location.href = "/";
          }}
          className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-red-400 hover:text-white hover:bg-red-600 transition-colors"
        >
          <HiLogout className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
