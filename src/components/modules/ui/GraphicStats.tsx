import React from "react";
import GraphicHoldingCard from "./GraphicHoldingCard";
import PerformanceChart from "./PerformanceChart";

const GraphicStats: React.FC = () => {
  return (
    <div className="mx-auto flex w-full max-w-5xl gap-6 px-6 py-8">
      <PerformanceChart />

      <div className="w-96 rounded-3xl bg-[#1e3a8a] p-8">
        <h3 className="mb-6 text-xl font-semibold text-white">App holdings</h3>

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
