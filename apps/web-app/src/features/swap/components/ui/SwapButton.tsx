import React from "react";
import { Warning } from "@mui/icons-material";

export type OrderType = "swap" | "limit" | "twap";

interface SwapButtonProps {
  address: string | undefined;
  canGetQuote: boolean;
  swapMode: "evm" | "stellar";
  hasEnoughGas: boolean;
  isLoadingGas: boolean;
  gasSymbol: string;
  isLoading: boolean;
  txHash: string | null;
  isLoadingQuote: boolean;
  orderType: OrderType;
  onClick: () => void;
}

export const SwapButton: React.FC<SwapButtonProps> = ({
  address,
  canGetQuote,
  swapMode,
  hasEnoughGas,
  isLoadingGas,
  gasSymbol,
  isLoading,
  txHash,
  isLoadingQuote,
  orderType,
  onClick,
}) => {
  if (!address) {
    return (
      <button
        disabled
        className="w-full bg-[#334EAC]/30 text-[#081F5C] font-bold py-4 text-base rounded-xl cursor-not-allowed"
      >
        Connect Wallet
      </button>
    );
  }

  if (!canGetQuote) {
    return (
      <button
        disabled
        className="w-full bg-[#2b46a7] text-[#ffffff] font-bold py-4 text-base rounded-xl cursor-not-allowed"
      >
        Enter Amount
      </button>
    );
  }

  if (swapMode === "evm" && !hasEnoughGas && !isLoadingGas) {
    return (
      <button
        disabled
        className="w-full bg-[#dc2626] text-white font-bold py-4 text-base rounded-xl cursor-not-allowed flex items-center justify-center gap-2"
      >
        <Warning className="w-5 h-5" />
        Insufficient {gasSymbol} for Gas
      </button>
    );
  }

  const getButtonText = () => {
    if (txHash) {
      return `${orderType === "swap" ? "Swap" : "Limit Order"} Completed!`;
    }
    if (isLoading) {
      return "Processing...";
    }
    if (orderType === "swap") {
      return "Swap";
    }
    return "Place Limit Order";
  };

  return (
    <button
      onClick={onClick}
      disabled={isLoading || !!txHash || isLoadingQuote}
      className="w-full bg-[linear-gradient(to_right,#334EAC,#081F5C)] hover:bg-[linear-gradient(to_right,#081F5C,#334EAC)] text-white font-bold py-4 text-base rounded-xl transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {getButtonText()}
    </button>
  );
};
