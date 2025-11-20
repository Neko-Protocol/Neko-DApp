import React from "react";
import MainStats from "../ui/MainStats";
import GraphicStats from "../ui/GraphicStats";
import AssetBreakdown from "../ui/AssetBreakdown";

const Dashboard: React.FC = () => {
  return (
    <div>
      <div className="container mx-auto px-4 py-8">
        <MainStats />
        <GraphicStats />
        <AssetBreakdown />
      </div>
    </div>
  );
};

export default Dashboard;
