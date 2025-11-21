import React from "react";
import GraphicHoldingCard from "./GraphicHoldingCard";
import PerformanceChart from "./PerformanceChart";

const GraphicStats: React.FC = () => {
  return (
    <div className="flex w-full gap-6 px-6 py-8">
      <PerformanceChart />

      <div className="flex-1 rounded-3xl bg-[#081F5C] p-8 border border-[#334EAC]/30">
        <h3 className="mb-6 text-xl font-semibold text-[#FFF9F0]">
          App holdings
        </h3>

        <div className="space-y-4">
          <GraphicHoldingCard
            name="Tesla"
            platform="Stellar"
            value="$1,345.67"
          />
          <GraphicHoldingCard
            name="Apple"
            platform="Stellar"
            value="$2,150.32"
          />
          <GraphicHoldingCard
            name="Microsoft"
            platform="Stellar"
            value="$1,820.45"
          />
          <GraphicHoldingCard
            name="Amazon"
            platform="Stellar"
            value="$950.89"
          />
          <GraphicHoldingCard
            name="Google"
            platform="Stellar"
            value="$1,580.23"
          />
        </div>
      </div>
    </div>
  );
};

export default GraphicStats;
