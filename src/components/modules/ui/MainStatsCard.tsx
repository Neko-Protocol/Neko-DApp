import React from "react";

interface MainStatsCardProps {
  value: string;
  label: string;
}

const MainStatsCard: React.FC<MainStatsCardProps> = ({ value, label }) => {
  return (
    <div className="flex flex-col justify-center rounded-3xl bg-[#ffffff] px-8 py-6">
      <h2 className="text-3xl font-semibold text-white">{value}</h2>
      <p className="text-sm font-normal text-[#bfe1ff]/70">{label}</p>
    </div>
  );
};

export default MainStatsCard;
