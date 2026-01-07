import React from "react";

export type OrderType = "swap" | "limit" | "twap";

interface OrderTypeTabsProps {
  orderType: OrderType;
  onOrderTypeChange: (type: OrderType) => void;
}

export const OrderTypeTabs: React.FC<OrderTypeTabsProps> = ({
  orderType,
  onOrderTypeChange,
}) => {
  return (
    <div className="flex gap-2 mb-6">
      <button
        onClick={() => onOrderTypeChange("swap")}
        className={`px-5 py-2.5 text-base font-semibold rounded-lg transition-colors ${
          orderType === "swap"
            ? "text-white bg-[#334EAC]"
            : "text-gray-400 hover:text-gray-300"
        }`}
      >
        Swap
      </button>
      <button
        onClick={() => onOrderTypeChange("limit")}
        className={`px-5 py-2.5 text-base font-semibold rounded-lg transition-colors ${
          orderType === "limit"
            ? "text-white bg-[#334EAC]"
            : "text-gray-400 hover:text-gray-300"
        }`}
      >
        Limit
      </button>
      <button
        disabled
        className="px-5 py-2.5 font-semibold text-gray-400 rounded-lg cursor-not-allowed"
        title="TWAP orders coming soon"
      >
        TWAP
      </button>
    </div>
  );
};
