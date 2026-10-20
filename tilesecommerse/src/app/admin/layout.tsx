"use client";

import { Sidebar } from "@/components/admin/Sidebar";
import { useSession } from "@/lib/auth/client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Check authentication on client side
    if (!isPending && !session?.user) {
      toast.error("Please login to access admin panel");
      router.push("/login?redirect=/admin");
      return;
    }

    // Check admin role
    if (!isPending && session?.user) {
      const userRole = (session.user as any)?.role;
      if (userRole !== "admin" && userRole !== "superadmin") {
        toast.error("You don't have permission to access admin panel");
        router.push("/");
        return;
      }
    }
  }, [session, isPending, router]);

  // Show loading while checking auth
  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated or not admin
  if (!session?.user || ((session.user as any)?.role !== "admin" && (session.user as any)?.role !== "superadmin")) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
