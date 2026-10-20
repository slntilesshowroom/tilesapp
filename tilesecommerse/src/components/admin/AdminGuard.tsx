"use client";

import { useSession } from "@/lib/auth/client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isPending && !session?.user) {
      toast.error("Please login to access admin panel");
      router.push("/login?redirect=/admin");
      return;
    }

    if (!isPending && session?.user && session.user.role !== 'admin') {
      toast.error("You don't have permission to access admin panel");
      router.push("/");
      return;
    }
  }, [session, isPending, router]);

  // Show loading state
  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Show nothing while redirecting
  if (!session?.user || session.user.role !== 'admin') {
    return null;
  }

  // User is authenticated and is admin
  return <>{children}</>;
}
