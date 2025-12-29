"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useWallet } from "@/hooks/useWallet";
import { getAvailableTokens, type Token } from "@/lib/helpers/soroswap";
import { getTokenIcon } from "@/lib/helpers/swapUtils";

interface TokenSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectToken: (token: Token | string) => void;
  selectedToken?: Token | string;
}

const TokenSelectorModal: React.FC<TokenSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectToken,
  selectedToken,
}) => {
  const { balances } = useWallet();
  const availableTokens = getAvailableTokens();
  const tokenCodes = Object.keys(availableTokens);
  const [searchQuery, setSearchQuery] = useState("");

  // Get token identifier for comparison
  const getTokenId = (token: Token | string): string => {
    if (typeof token === "string") {
      for (const [code, info] of Object.entries(availableTokens)) {
        if (info.contract === token) {
          return code;
        }
      }
      return token;
    }
    if (token.type === "native") return "XLM";
    if (token.contract) {
      for (const [code, info] of Object.entries(availableTokens)) {
        if (info.contract === token.contract) {
          return code;
        }
      }
      return token.contract;
    }
    return token.code || "";
  };

  // Filter tokens based on search query
  const filteredTokens = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return tokenCodes.filter((code) => {
      const token = availableTokens[code];
      return (
        code.toLowerCase().includes(query) ||
        token.name.toLowerCase().includes(query)
      );
    });
  }, [searchQuery, availableTokens, tokenCodes]);

  // Get token balance from wallet balances
  const getTokenBalance = useCallback(
    (code: string): { balance: string; usdValue: string } => {
      // For XLM (native)
      if (code === "XLM" && balances.xlm) {
        const balance = parseFloat(
          balances.xlm.balance?.replace(/,/g, "") || "0"
        );
        // Simplified USD value calculation (should fetch real price)
        const usdValue = balance * 0.1; // Placeholder conversion rate
        return {
          balance: balance.toString(),
          usdValue: usdValue.toFixed(2),
        };
      }

      // For other tokens, check if they exist in balances
      // Note: Contract tokens might need special handling
      // For now, return 0 but this should be implemented based on your token contract structure

      return { balance: "0", usdValue: "0" };
    },
    [balances]
  );

  // Get user's tokens (tokens with balance > 0, including excluded token so it can be selected for swap)
  const userTokens = useMemo(() => {
    return filteredTokens.filter((code) => {
      const { balance } = getTokenBalance(code);
      return parseFloat(balance) > 0;
    });
  }, [filteredTokens, getTokenBalance]);

  // Get popular tokens (excluding user tokens, but including excluded token so it can be selected for swap)
  const popularTokens = useMemo(() => {
    return filteredTokens.filter((code) => {
      const { balance } = getTokenBalance(code);
      const isUserToken = parseFloat(balance) > 0;
      // Don't exclude the token - allow it to be selected for swapping
      return !isUserToken;
    });
  }, [filteredTokens, getTokenBalance]);

  const handleTokenClick = (tokenCode: string) => {
    const token = availableTokens[tokenCode].contract;
    onSelectToken(token);
    setSearchQuery(""); // Reset search on selection
    onClose();
  };

  const formatBalance = (balance: string): string => {
    const num = parseFloat(balance);
    if (num === 0) return "0";
    if (num < 0.000001) return num.toExponential(2);
    if (num < 0.001) return num.toFixed(6);
    if (num < 1) return num.toFixed(4);
    if (num < 1000) return num.toFixed(2);
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  // Reset search when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
    }
  }, [isOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal - Gray theme */}
      <div className="relative w-full max-w-md bg-gray-100 border border-gray-300 rounded-2xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-300">
          <h2 className="text-xl font-bold text-gray-900">Select a token</h2>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900 transition-colors p-1.5 rounded-lg hover:bg-gray-200"
            aria-label="Close"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 5L5 15M5 5l10 10" />
            </svg>
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-300">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="8" cy="8" r="5.5" />
              <path d="M13.5 13.5l-3-3" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tokens"
              className="w-full pl-10 pr-4 py-3 bg-white border-2 border-gray-300 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#334EAC] transition-colors"
              autoFocus
            />
          </div>
        </div>

        {/* Token List */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Your Tokens Section */}
          {userTokens.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-500 mb-3 px-2 uppercase tracking-wider">
                Your tokens
              </h3>
              <div className="space-y-1">
                {userTokens.map((code) => {
                  const token = availableTokens[code];
                  const isSelected = selectedToken
                    ? getTokenId(selectedToken) === code
                    : false;
                  const { balance, usdValue } = getTokenBalance(code);

                  return (
                    <button
                      key={code}
                      onClick={() => handleTokenClick(code)}
                      disabled={isSelected}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                        isSelected
                          ? "bg-[#334EAC]/20 cursor-not-allowed border border-[#334EAC]/30"
                          : "bg-white hover:bg-gray-50 border border-transparent hover:border-gray-300"
                      }`}
                    >
                      {/* Token Icon */}
                      {getTokenIcon(token.contract) ? (
                        <img
                          src={getTokenIcon(token.contract)!}
                          alt={code}
                          className="w-10 h-10 rounded-full shrink-0 shadow-md object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-linear-to-br from-[#334EAC] to-[#081F5C] flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-md">
                          {code[0]}
                        </div>
                      )}

                      {/* Token Info */}
                      <div className="flex-1 text-left min-w-0">
                        <div className="font-semibold text-gray-900 truncate text-sm">
                          {token.name}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {code}
                        </div>
                      </div>

                      {/* Balance */}
                      <div className="text-right shrink-0">
                        <div className="font-semibold text-gray-900 text-sm">
                          ${usdValue}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {formatBalance(balance)}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Popular Tokens Section */}
          {popularTokens.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 mb-3 px-2 uppercase tracking-wider">
                Popular tokens
              </h3>
              <div className="flex flex-col gap-3">
                {popularTokens.map((code) => {
                  const token = availableTokens[code];
                  const isSelected = selectedToken
                    ? getTokenId(selectedToken) === code
                    : false;

                  return (
                    <button
                      key={code}
                      onClick={() => handleTokenClick(code)}
                      disabled={isSelected}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                        isSelected
                          ? "bg-[#334EAC]/20 cursor-not-allowed border border-[#334EAC]/30"
                          : "bg-white hover:bg-gray-50 border border-transparent hover:border-gray-300"
                      }`}
                    >
                      {/* Token Icon */}
                      {getTokenIcon(token.contract) ? (
                        <img
                          src={getTokenIcon(token.contract)!}
                          alt={code}
                          className="w-10 h-10 rounded-full shrink-0 shadow-md object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-linear-to-br from-[#334EAC] to-[#081F5C] flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-md">
                          {code[0]}
                        </div>
                      )}

                      {/* Token Info */}
                      <div className="flex-1 text-left">
                        <div className="font-semibold text-gray-900 text-sm">
                          {token.name}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {code}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* No Results */}
          {filteredTokens.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-sm">No tokens found</p>
              <p className="text-gray-400 text-xs mt-2">
                Try searching with a different term
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TokenSelectorModal;
