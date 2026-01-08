"use client";

import { useState, useRef, useEffect } from "react";
import { useChainId, useSwitchChain } from "wagmi";
import { useWalletType } from "@/hooks/useWalletType";
import { ChevronDown } from "lucide-react";

interface Chain {
  id: number;
  name: string;
  icon?: string;
}

const SUPPORTED_CHAINS: Chain[] = [
  {
    id: 1,
    name: "Ethereum",
    icon: "/chains/ethereum-eth chain.svg",
  },
  {
    id: 56,
    name: "BNB Chain",
    icon: "/chains/BNB Chain.svg",
  },
  {
    id: 5000,
    name: "Mantle",
    icon: "/chains/Mantle Chain.svg",
  },
];

export const ChainSelector = () => {
  const { isEvmConnected } = useWalletType();
  const chainId = useChainId();
  const { switchChainAsync, isPending } = useSwitchChain();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Only show if EVM wallet is connected
  if (!isEvmConnected) {
    return null;
  }

  const currentChain = SUPPORTED_CHAINS.find((chain) => chain.id === chainId);
  const displayName = currentChain?.name || "Unknown Chain";

  const handleChainSelect = async (selectedChainId: number) => {
    if (selectedChainId === chainId) {
      setIsOpen(false);
      return;
    }

    try {
      await switchChainAsync({ chainId: selectedChainId });
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to switch chain:", error);
      // Keep dropdown open on error so user can try again
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className="bg-[#081F5C] hover:bg-[#334EAC] text-[#FFF9F0] font-bold py-4 px-6 rounded-full transition-colors duration-200 shadow-md flex items-center gap-2 border border-[#334EAC]/30 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {currentChain?.icon && (
          <img
            src={currentChain.icon}
            alt={displayName}
            className="w-5 h-5 shrink-0"
          />
        )}
        <span>{displayName}</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 bg-[#081F5C] border border-[#334EAC]/30 rounded-xl shadow-lg z-50 min-w-[200px] overflow-hidden">
          {SUPPORTED_CHAINS.map((chain) => {
            const isSelected = chain.id === chainId;
            return (
              <button
                key={chain.id}
                onClick={() => handleChainSelect(chain.id)}
                disabled={isPending || isSelected}
                className={`w-full px-4 py-3 text-left hover:bg-[#334EAC] transition-colors duration-200 flex items-center gap-3 ${
                  isSelected ? "bg-[#334EAC] cursor-default" : "cursor-pointer"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {chain.icon && (
                  <img
                    src={chain.icon}
                    alt={chain.name}
                    className="w-5 h-5 shrink-0"
                  />
                )}
                <span className="text-[#FFF9F0] font-medium">{chain.name}</span>
                {isSelected && (
                  <span className="ml-auto text-green-500 text-sm">✓</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
