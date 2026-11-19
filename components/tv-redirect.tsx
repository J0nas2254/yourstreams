"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isProbablyTV } from "@/lib/api";

// In der Android-Hülle ohne Touchscreen (Fire TV) direkt ins TV-Layout.
export default function TvRedirect() {
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (pathname === "/" && isProbablyTV()) {
      router.replace("/tv");
    }
  }, [pathname, router]);
  return null;
}
