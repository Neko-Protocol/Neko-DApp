"use client";

import AssetDetail from "@/features/stocks/components/pages/AssetDetail";
import { use } from "react";

interface PageProps {
  params: Promise<{ symbol: string }>;
}

export default function StockDetailPage({ params }: PageProps) {
  const { symbol } = use(params);
  return <AssetDetail symbol={symbol} />;
}
