"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminPage = pathname.startsWith("/admin");

  if (isAdminPage) {
    return <main className="pointer-events-auto">{children}</main>;
  }

  return (
    <>
      <Navbar />
      <main className="pointer-events-auto">{children}</main>
      <Footer />
    </>
  );
}
