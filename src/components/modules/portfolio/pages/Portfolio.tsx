import React from "react";
import MainStats from "../../ui/MainStats";
import AssetBreakdown from "../../ui/AssetBreakdown";
import GraphicStats from "../../ui/GraphicStats";

const Portfolio: React.FC = () => {
  return (
    <div>
      <div className="w-full px-4 py-8">
        <MainStats />
        <GraphicStats />
        <AssetBreakdown />
      </div>
    </div>
  );
};

export default Portfolio;
