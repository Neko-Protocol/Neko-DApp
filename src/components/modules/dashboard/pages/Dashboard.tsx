import React from "react";
import MainStats from "../../ui/MainStats";
import AssetBreakdown from "../../ui/AssetBreakdown";

const Dashboard: React.FC = () => {
  return (
    <div>
      <div className="w-full px-4 py-2">
        <MainStats />
        <AssetBreakdown />
        {/* add borrow/lending thing */}
      </div>
    </div>
  );
};

export default Dashboard;
