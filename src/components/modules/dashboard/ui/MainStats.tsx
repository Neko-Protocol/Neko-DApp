import React from "react";
import MainStatsCard from "./MainStatsCard";

const MainStats: React.FC = () => {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-sm font-normal text-gray-600">
              Your portfolio, Santiago(GBX...ZFD4)
            </p>
            <h1 className="text-5xl font-semibold text-gray-900">$97921.74</h1>
          </div>
        </div>
        <p className="mt-2 text-sm font-normal text-gray-600">
          Updated 2 mins ago
        </p>
      </div>

      <div className="flex gap-6">
        <MainStatsCard value="$82,345.67" label="Vaults Value" />
        <MainStatsCard value="$1,345.67" label="Return of investment : 5.45%" />
        <MainStatsCard value="$145.67" label="This week 1.45%" />
      </div>
    </div>
  );
};

export default MainStats;
