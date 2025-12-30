"use client";

import { useState } from "react";
import { useWalletType } from "@/hooks/useWalletType";
import { WalletSelectorModal } from "./WalletSelectorModal";

export const WalletButton = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const {
    walletType,
    isEvmConnected,
    isStellarConnected,
    evmAddress,
    stellarAddress,
  } = useWalletType();

  // Determine button text and status
  const getButtonContent = () => {
    if (isEvmConnected && evmAddress) {
      return {
        text: `${evmAddress.substring(0, 4)}...${evmAddress.substring(evmAddress.length - 4)}`,
        indicator: "evm",
      };
    }
    if (isStellarConnected && stellarAddress) {
      return {
        text: `${stellarAddress.substring(0, 4)}...${stellarAddress.substring(stellarAddress.length - 4)}`,
        indicator: "stellar",
      };
    }
    return {
      text: "Connect Wallet",
      indicator: null,
    };
  };

  const { text, indicator } = getButtonContent();
  const isConnected = walletType !== "none";

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="bg-[#081F5C] hover:bg-[#334EAC] text-[#FFF9F0] font-bold py-4 px-6 rounded-full transition-colors duration-200 shadow-md flex items-center gap-2 border border-[#334EAC]/30"
      >
        {isConnected && indicator && (
          <div
            className={`w-2 h-2 rounded-full ${
              indicator === "evm" ? "bg-green-500" : "bg-[#39bfb7]"
            }`}
          ></div>
        )}
        <span>{text}</span>
      </button>

      <WalletSelectorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};
