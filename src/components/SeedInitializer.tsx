"use client";

import { useEffect } from "react";
import { initSeedData } from "@/lib/seed-data";

export default function SeedInitializer() {
  useEffect(() => {
    initSeedData();
  }, []);
  return null;
}
