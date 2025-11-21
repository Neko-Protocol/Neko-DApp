import React from "react";
import AssetCard from "./AssetCard";
import { ChevronDown } from "lucide-react";

const AssetBreakdown: React.FC = () => {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-white">Asset breakdown</h2>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-full bg-[#334eac]/50 px-6 py-2">
            <svg
              className="h-5 w-5 text-[#bfe1ff]/70"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" strokeWidth="2" />
              <path d="m21 21-4.35-4.35" strokeWidth="2" />
            </svg>
            <input
              type="text"
              placeholder="Search by account or token ID"
              className="bg-transparent text-sm font-normal text-white placeholder-[#bfe1ff]/50 outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-normal text-[#bfe1ff]/70">
              Sort by
            </span>
            <div className="relative">
              <select className="appearance-none rounded-full bg-[#334eac]/50 px-6 py-2 pr-10 text-sm font-normal text-white outline-none">
                <option value="return">Return</option>
                <option value="balance">Balance</option>
                <option value="deposit">Deposit</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-4 px-6 text-sm font-normal text-[#bfe1ff]/70">
        <div className="w-38">Token</div>
        <div className="w-38">Deposit</div>
        <div className="w-30">Balance</div>
        <div className="w-32">AVL</div>
        <div className="w-38">USD Value</div>
        <div className="w-32">Net Return</div>
        <div className="w-32">Actions</div>
      </div>

      <div className="space-y-4">
        <AssetCard
          tokenName="USDC"
          deposit="13,450 USDC"
          balance="3450 USDC"
          availableBalance="3450 USDC"
          usdValue="3450 USDC"
          netReturn="1150 USDC"
          netReturnChange="+1150 USDC (2.17%)"
        />

        <AssetCard
          tokenName="XLM"
          deposit="13,450 USDC"
          balance="3450 USDC"
          availableBalance="3450 USDC"
          usdValue="3450 USDC"
          netReturn="1150 USDC"
          netReturnChange="+1150 USDC (2.17%)"
        />

        <AssetCard
          tokenName="TSLA"
          deposit="13,450 USDC"
          balance="3450 USDC"
          availableBalance="3450 USDC"
          usdValue="3450 USDC"
          netReturn="1150 USDC"
          netReturnChange="+1150 USDC (2.17%)"
        />

        <AssetCard
          tokenName="NVDA"
          deposit="13,450 USDC"
          balance="3450 USDC"
          availableBalance="3450 USDC"
          usdValue="3450 USDC"
          netReturn="1150 USDC"
          netReturnChange="+1150 USDC (2.17%)"
        />
      </div>
    </div>
  );
};

export default AssetBreakdown;
