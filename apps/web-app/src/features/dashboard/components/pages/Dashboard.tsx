"use client";

import React from "react";
import MainStats from "@/components/ui/MainStats";
import AssetBreakdown from "@/components/ui/AssetBreakdown";

const Dashboard: React.FC = () => {
  return (
    <div>
      <div className="w-full px-4 py-2">
        <MainStats />
        <AssetBreakdown />
      </div>
    </div>
  );
};

export default Dashboard;
