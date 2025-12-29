import React from "react";
import { ChevronDown } from "lucide-react";

interface AssetCardProps {
  tokenName: string;
  deposit: string;
  balance: string;
  availableBalance: string;
  usdValue: string;
  netReturn: string;
  netReturnChange: string;
}

const AssetCard: React.FC<AssetCardProps> = ({
  tokenName,
  deposit,
  balance,
  availableBalance,
  usdValue,
  netReturn,
  netReturnChange,
}) => {
  return (
    <div className="flex items-center gap-2 rounded-3xl bg-[#1e3a8a] px-6 py-6">
      <div className="flex w-32 items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-[#0f172a]"></div>
        <span className="text-sm font-semibold text-white">{tokenName}</span>
      </div>
      <div className="w-32 text-sm font-normal text-white">{deposit}</div>
      <div className="w-32 text-sm font-normal text-white">{balance}</div>
      <div className="w-32 text-sm font-normal text-white">
        {availableBalance}
      </div>
      <div className="w-32 text-sm font-normal text-white">{usdValue}</div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-white">{netReturn}</p>
        <p className="text-xs font-normal text-green-400">{netReturnChange}</p>
      </div>
      <div className="w-32">
        <button className="rounded-full bg-[#0f172a] px-6 py-2 text-sm font-normal text-white transition-colors hover:bg-[#1e40af]">
          Actions <ChevronDown className="inline-block h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default AssetCard;
