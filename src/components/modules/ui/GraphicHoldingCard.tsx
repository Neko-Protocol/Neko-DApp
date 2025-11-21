import React from "react";

interface GraphicHoldingCardProps {
  name: string;
  platform: string;
  value: string;
}

const GraphicHoldingCard: React.FC<GraphicHoldingCardProps> = ({
  name,
  platform,
  value,
}) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-[#334EAC]"></div>
        <div>
          <p className="text-sm font-semibold text-[#FFF9F0]">{name}</p>
          <p className="text-xs font-normal text-[#7096D1]">{platform}</p>
        </div>
      </div>
      <span className="text-lg font-semibold text-[#FFF9F0]">{value}</span>
    </div>
  );
};

export default GraphicHoldingCard;
