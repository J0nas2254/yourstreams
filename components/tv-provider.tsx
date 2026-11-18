"use client";

import { useEffect } from "react";
import { initTvNav } from "@/lib/tv-nav";

export function TvProvider() {
  useEffect(() => initTvNav(), []);
  return null;
}
