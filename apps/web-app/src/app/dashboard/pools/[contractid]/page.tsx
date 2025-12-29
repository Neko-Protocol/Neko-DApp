"use client";

import PoolDetail from "@/features/pools/components/pages/PoolDetail";
import { use } from "react";

interface PageProps {
  params: Promise<{ contractid: string }>;
}

export default function PoolDetailPage({ params }: PageProps) {
  return <PoolDetail params={params} />;
}
