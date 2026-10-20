"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { FaPhone, FaCalculator, FaStore, FaSearch, FaUser, FaUserCircle, FaSignOutAlt, FaBox } from "react-icons/fa";
import { useSession } from "@/lib/auth/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { WishlistLink } from "./WishlistLink";
import { CartLink } from "./CartLink";
import type { Manager } from "@/hooks/useManager";

export const TopBar = ({ editProfileManager }: { editProfileManager: Manager }) => {
  const { data: session, isPending } = useSession();
  const [mounted, setMounted] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => setMounted(true), []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown]);

  const handleLogout = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1'}/logout`, {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        localStorage.removeItem("auth_token");
        toast.success("Logged out successfully");
        router.push("/login");
        router.refresh();
      }
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to logout");
    }
  };

  return (
    <div className="text-white bg-gradient-to-r from-red-600 via-red-500 to-orange-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Left Section: Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center group">
              <div className="relative w-16 h-16 mr-3 rounded-lg shadow-lg overflow-hidden transition-transform duration-300 group-hover:scale-105">
                <Image
                  src="/logo.png"
                  alt="SLN Tiles Showroom"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <div>
                <h1 className="md:text-xl text-lg leading-5 font-bold text-white ">SLN TILES SHOWROOM</h1>
                <p className="text-xs text-white">Trusted by Builders and Homeowners</p>
              </div>
            </Link>
          </div>

          {/* Center Section: Links */}
          <nav className="hidden lg:flex items-center gap-8 text-sm">
            <Link href="/" className="text-white hover:text-orange-400 transition-colors font-medium">
              Home
            </Link>
            <Link href="/blogs" className="text-white hover:text-orange-400 transition-colors">
              Blog
            </Link>
            <Link href="/Gallery" className="text-white hover:text-orange-400 transition-colors">
              Gallery
            </Link>
          </nav>

          {/* Right Section: Icons and Actions */}
          <div className="flex items-center gap-4">
            {/* Phone */}
            <Link
              href="tel:+919738522119"
              className="hidden xl:flex items-center gap-2 text-white hover:text-orange-400 transition-colors"
            >
              <FaPhone className="text-orange-400" size={16} />
              <span className="text-sm">097385 22119</span>
            </Link>

            {/* Calculator */}
            <Link
              href="/calculator"
              className="hidden lg:flex flex-col items-center justify-center text-white hover:text-orange-400 transition-colors"
              title="Tile Calculator"
            >
              <FaCalculator size={20} />
              <span className="text-xs mt-1">Calculator</span>
            </Link>

            {/* Store */}
            <Link
              href="/search"
              className="hidden lg:flex flex-col items-center justify-center text-white hover:text-orange-400 transition-colors"
              title="Store Locator"
            >
              <FaStore size={20} />
              <span className="text-xs mt-1">Store</span>
            </Link>

            {/* Search */}
            <Link
              href="/search"
              className="flex flex-col items-center justify-center text-white hover:text-orange-400 transition-colors"
              title="Search"
            >
              <FaSearch size={20} />
              <span className="text-xs mt-1 hidden md:block">Search</span>
            </Link>

            {/* Sign In / User Account Dropdown */}
            {!mounted || isPending ? (
              <div className="w-12 h-12 bg-gray-700 rounded-full animate-pulse" />
            ) : session?.user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onMouseEnter={() => setShowDropdown(true)}
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex flex-col items-center justify-center text-white hover:text-orange-400 transition-colors"
                >
                  <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                    <FaUser size={14} />
                  </div>
                  <span className="text-xs mt-1 hidden md:block">Account</span>
                </button>

                {/* Dropdown Menu - Flipkart Style */}
                {showDropdown && (
                  <div
                    onMouseLeave={() => setShowDropdown(false)}
                    className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200"
                  >
                    {/* User Info Header */}
                    <div className="bg-gradient-to-r from-orange-500 to-red-500 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                          <FaUserCircle className="text-orange-500" size={24} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold text-sm truncate">
                            {session.user.name || "User"}
                          </p>
                          <p className="text-white/80 text-xs truncate">
                            {session.user.email}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                      {/* My Profile */}
                      <Link
                        href="/profile"
                        onClick={() => setShowDropdown(false)}
                        className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-orange-50 transition-colors group"
                      >
                        <FaUserCircle className="text-slate-400 group-hover:text-orange-500 transition-colors" size={18} />
                        <span className="text-sm font-medium">My Profile</span>
                      </Link>

                      {/* My Orders */}
                      <Link
                        href="/orders"
                        onClick={() => setShowDropdown(false)}
                        className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-orange-50 transition-colors group"
                      >
                        <FaBox className="text-slate-400 group-hover:text-orange-500 transition-colors" size={18} />
                        <span className="text-sm font-medium">My Orders</span>
                      </Link>

                      {/* Divider */}
                      <div className="border-t border-slate-200 my-2"></div>

                      {/* Logout */}
                      <button
                        onClick={() => {
                          setShowDropdown(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 transition-colors group"
                      >
                        <FaSignOutAlt className="text-red-400 group-hover:text-red-600 transition-colors" size={18} />
                        <span className="text-sm font-medium">Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="flex flex-col items-center justify-center text-white hover:text-orange-400 transition-colors"
              >
                <FaUser size={20} />
                <span className="text-xs mt-1 hidden md:block">Sign In</span>
              </Link>
            )}

            {/* Wishlist */}
            <div className="flex flex-col items-center justify-center">
              <WishlistLink />
              <span className="text-xs mt-1 hidden md:block text-white">Wishlist</span>
            </div>

            {/* Cart */}
            <div className="flex flex-col items-center justify-center">
              <CartLink />
              <span className="text-xs mt-1 hidden md:block text-white">Cart</span>
            </div>


          </div>
        </div>
      </div>
    </div>
  );
};
