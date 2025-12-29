"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useWallet } from "@/hooks/useWallet";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { useTokenPrice } from "@/hooks/useTokenPrice";
import {
  TOKENS,
  type Token,
  hasApiKey,
  getAvailableTokens,
  getQuote,
  buildTransaction,
  sendTransaction,
  type QuoteRequest,
} from "@/lib/helpers/soroswap";
import {
  formatSwapAmount,
  fromSmallestUnit,
  getExplorerUrl,
  getTokenIcon,
} from "@/lib/helpers/swapUtils";
import TokenSelectorModal from "../ui/TokenSelectorModal";
import { Tooltip, IconButton } from "@mui/material";
import {
  Info,
  Warning,
  WaterDrop,
  AttachMoney,
  TrendingDown,
} from "@mui/icons-material";

const Swap: React.FC = () => {
  const { address, network, networkPassphrase, signTransaction } = useWallet();

  // Swap state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Get available tokens for current network
  const availableTokens = getAvailableTokens();
  const tokenCodes = Object.keys(availableTokens);

  // Tokens are now strings (contract addresses) - initialize with first available tokens
  const defaultTokenIn =
    availableTokens[tokenCodes[0]]?.contract || TOKENS.XLM || "";
  const defaultTokenOut =
    availableTokens[tokenCodes[1]]?.contract || TOKENS.USDC || "";

  const [tokenIn, setTokenIn] = useState<Token | string>(defaultTokenIn);
  const [tokenOut, setTokenOut] = useState<Token | string>(defaultTokenOut);
  const [amountIn, setAmountIn] = useState<string>("");
  const [amountOut, setAmountOut] = useState<string>("0.0");
  const [isLoadingQuote, setIsLoadingQuote] = useState<boolean>(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [apiKeyConfigured, setApiKeyConfigured] = useState<boolean>(false);

  // Token selector modal state
  const [tokenSelectorOpen, setTokenSelectorOpen] = useState<boolean>(false);
  const [tokenSelectorType, setTokenSelectorType] = useState<"from" | "to">(
    "from"
  );

  // Ref for debounce timer and request cancellation
  const quoteTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Get token balance for "from" token
  const { balance: tokenInBalance, isLoading: isLoadingBalance } =
    useTokenBalance(tokenIn);

  // Get token prices in USD
  const { price: tokenInPrice, isLoading: isLoadingPrice } =
    useTokenPrice(tokenIn);
  const { price: tokenOutPrice, isLoading: isLoadingOutPrice } =
    useTokenPrice(tokenOut);

  // Calculate USD value
  const usdValue =
    amountIn && parseFloat(amountIn) > 0 && tokenInPrice > 0
      ? (parseFloat(amountIn) * tokenInPrice).toFixed(2)
      : "0.00";

  // Calculate expected output based on USD prices and compare with actual output
  const swapValueAnalysis = useMemo(() => {
    if (
      !amountIn ||
      !amountOut ||
      parseFloat(amountIn) <= 0 ||
      parseFloat(amountOut) <= 0
    ) {
      return null;
    }

    if (
      !tokenInPrice ||
      !tokenOutPrice ||
      tokenInPrice <= 0 ||
      tokenOutPrice <= 0
    ) {
      return null;
    }

    const inputAmount = parseFloat(amountIn);
    const outputAmount = parseFloat(amountOut);

    // Calculate expected output based on USD price ratio
    const inputUsdValue = inputAmount * tokenInPrice;
    const expectedOutput = inputUsdValue / tokenOutPrice;

    // Calculate the difference percentage
    const differencePercent =
      ((expectedOutput - outputAmount) / expectedOutput) * 100;

    // Consider the swap suspiciously low if output is more than 10% lower than expected
    const isSuspiciouslyLow = differencePercent > 10;

    return {
      expectedOutput,
      actualOutput: outputAmount,
      differencePercent,
      isSuspiciouslyLow,
    };
  }, [amountIn, amountOut, tokenInPrice, tokenOutPrice]);

  // Helper function to get token identifier (for comparison)
  const getTokenId = (token: Token | string): string => {
    if (typeof token === "string") {
      // Token is already a string (contract address)
      // Find which token code matches this contract address
      for (const [code, info] of Object.entries(availableTokens)) {
        if (info.contract === token) {
          return code;
        }
      }
      return token;
    }

    // Token is an object (legacy format)
    if (token.type === "native") return "XLM";
    if (token.contract) {
      // Find matching token code
      for (const [code, info] of Object.entries(availableTokens)) {
        if (info.contract === token.contract) {
          return code;
        }
      }
      return token.contract;
    }
    if (token.code) return token.code;
    return "";
  };

  // Check if API key is configured on mount
  useEffect(() => {
    setApiKeyConfigured(hasApiKey());
  }, []);

  // Function to fetch live quote with abort signal for cancellation
  const fetchLiveQuote = useCallback(async () => {
    // Better validation - check for valid number format and non-zero value
    const trimmedAmount = amountIn?.trim() || "";
    const parsedAmount = parseFloat(trimmedAmount);

    if (
      !address ||
      !trimmedAmount ||
      trimmedAmount === "0" ||
      trimmedAmount === "0." ||
      isNaN(parsedAmount) ||
      parsedAmount <= 0 ||
      !apiKeyConfigured
    ) {
      setAmountOut("0.0");
      setIsLoadingQuote(false);
      return;
    }

    // Cancel previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Store current input values to verify later
    const currentAmountIn = trimmedAmount;
    const currentTokenIn = tokenIn;
    const currentTokenOut = tokenOut;

    setIsLoadingQuote(true);
    try {
      const quoteRequest: QuoteRequest = {
        assetIn: tokenIn,
        assetOut: tokenOut,
        amount: trimmedAmount,
        tradeType: "EXACT_IN",
        protocols: ["soroswap"], // Only SOROSWAP for faster live quotes
        slippageBps: 100, // 1% slippage - reduced for faster quotes
      };

      const quote = await getQuote(quoteRequest);

      // Check if request was aborted or values changed
      if (abortController.signal.aborted) {
        return;
      }

      // Verify we're still looking at the same values (compare trimmed)
      const currentAmountTrimmed = amountIn?.trim() || "";
      const valuesMatch =
        currentAmountIn === currentAmountTrimmed &&
        currentTokenIn === tokenIn &&
        currentTokenOut === tokenOut;

      if (!valuesMatch) {
        // Values changed, don't update - new request will handle it
        return;
      }

      // Process the quote result
      if (quote && quote.amountOut) {
        try {
          const amountOutStr = quote.amountOut.toString();

          const amountOutBigInt = BigInt(amountOutStr);

          // Convert amountOut from smallest unit to human-readable format
          if (amountOutBigInt > BigInt(0)) {
            const amountOutFormatted = fromSmallestUnit(amountOutStr, 7);

            const formatted = formatSwapAmount(amountOutFormatted, 7);

            setAmountOut(formatted);
          } else {
            setAmountOut("0.0");
          }
        } catch {
          setAmountOut("0.0");
        }
      } else {
        setAmountOut("0.0");
      }
    } catch (error) {
      // Ignore aborted requests
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }

      // Handle timeout errors gracefully
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorWithCode = error as { code?: string } | null | undefined;
      const isTimeout =
        errorMessage.includes("timeout") ||
        errorMessage.includes("ECONNABORTED") ||
        errorWithCode?.code === "ECONNABORTED";

      if (isTimeout) {
        // For timeouts, keep previous amountOut if exists, otherwise show loading state
        // Don't reset to 0.0 - user can see the previous quote while waiting
        console.debug(
          "Quote request timeout - keeping previous value if available"
        );
        setIsLoadingQuote(false);
        return;
      }

      // Silently fail for other errors in live quotes
      setAmountOut("0.0");
      // Only log errors that aren't common (like no path found or timeout)
      if (
        !errorMessage.includes("No path found") &&
        !errorMessage.includes("No path") &&
        !errorMessage.includes("aborted") &&
        !errorMessage.includes("timeout")
      ) {
        console.debug("Live quote error:", error);
      }
    } finally {
      // Only reset loading if this request wasn't aborted
      if (!abortController.signal.aborted) {
        setIsLoadingQuote(false);
      }
    }
  }, [address, amountIn, tokenIn, tokenOut, apiKeyConfigured]);

  // Debounced live quote update
  useEffect(() => {
    // Clear previous timeout
    if (quoteTimeoutRef.current) {
      clearTimeout(quoteTimeoutRef.current);
      quoteTimeoutRef.current = null;
    }

    // Reset loading state when inputs change
    setIsLoadingQuote(false);

    // Validate amount - check for empty, just "0", or invalid values
    const trimmedAmount = amountIn?.trim() || "";
    const parsedAmount = parseFloat(trimmedAmount);
    const isZero =
      trimmedAmount === "0" ||
      trimmedAmount === "0." ||
      trimmedAmount === "0.0";
    const isValid =
      trimmedAmount !== "" &&
      !isZero &&
      !isNaN(parsedAmount) &&
      parsedAmount > 0;

    // If no amount or invalid, reset and don't fetch quote
    if (!isValid || !address || !apiKeyConfigured) {
      setAmountOut("0.0");
      setIsLoadingQuote(false);
      return;
    }

    // Reset amountOut when inputs change (but don't reset if we're about to fetch)
    setAmountOut("0.0");

    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Set new timeout for debounced quote fetch - reduced to 100ms for faster response
    quoteTimeoutRef.current = setTimeout(() => {
      void fetchLiveQuote();
    }, 100); // 100ms debounce - faster response

    // Cleanup on unmount or when dependencies change
    return () => {
      if (quoteTimeoutRef.current) {
        clearTimeout(quoteTimeoutRef.current);
        quoteTimeoutRef.current = null;
      }
      // Cancel any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      // Reset loading state on cleanup to prevent stuck state
      setIsLoadingQuote(false);
    };
  }, [amountIn, tokenIn, tokenOut, address, apiKeyConfigured, fetchLiveQuote]);

  const handleOpenTokenSelector = (type: "from" | "to") => {
    setTokenSelectorType(type);
    setTokenSelectorOpen(true);
  };

  const handleSelectToken = (token: Token | string) => {
    if (tokenSelectorType === "from") {
      const newTokenId = getTokenId(token);
      const currentTokenOutId = getTokenId(tokenOut);

      // If trying to select the same token as tokenOut, swap them
      if (newTokenId === currentTokenOutId) {
        setTokenOut(tokenIn);
        setTokenIn(token);
      } else {
        setTokenIn(token);
      }
    } else {
      const newTokenId = getTokenId(token);
      const currentTokenInId = getTokenId(tokenIn);

      // If trying to select the same token as tokenIn, swap them
      if (newTokenId === currentTokenInId) {
        setTokenIn(tokenOut);
        setTokenOut(token);
      } else {
        setTokenOut(token);
      }
    }
    resetSwap();
    setTxHash(null);
    setTokenSelectorOpen(false);
  };

  const handleSwapTokens = () => {
    const temp = tokenIn;
    setTokenIn(tokenOut);
    setTokenOut(temp);
    setAmountIn("");
    resetSwap();
    setTxHash(null);
  };

  // Reset swap state
  const resetSwap = useCallback(() => {
    setError(null);
    setIsLoading(false);
  }, []);

  // Complete swap flow: Get quote -> Build -> Sign -> Send
  const handleSwap = async () => {
    if (
      !amountIn ||
      parseFloat(amountIn) <= 0 ||
      !address ||
      !networkPassphrase
    ) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // Step 1: Get quote
      const quoteRequest: QuoteRequest = {
        assetIn: tokenIn,
        assetOut: tokenOut,
        amount: amountIn,
        tradeType: "EXACT_IN",
      };

      const newQuote = await getQuote(quoteRequest);

      // Step 2: Build transaction
      const buildRequest = {
        quote: newQuote,
        from: address,
        to: address,
      };

      const buildResult = await buildTransaction(buildRequest);

      // Step 3: Sign transaction
      const signedResult = await signTransaction(buildResult.xdr, {
        networkPassphrase: networkPassphrase,
        address: address,
      });

      // Extract signed XDR from result
      const signedXdrString =
        signedResult.signedTxXdr ||
        (typeof signedResult === "string"
          ? signedResult
          : JSON.stringify(signedResult));

      // Step 4: Send transaction
      const sendRequest = {
        xdr: signedXdrString,
        launchtube: false,
      };

      const sendResult = await sendTransaction(sendRequest);

      if (sendResult.txHash) {
        setTxHash(sendResult.txHash);
        // Reset swap state after successful send
        resetSwap();
        setAmountIn("");
        setAmountOut("0.0");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to complete swap";
      setError(errorMessage);
      console.error("Swap error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const canGetQuote = address && amountIn && parseFloat(amountIn) > 0;

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-8 mt-4">
      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button className="px-5 py-2.5 text-base font-semibold text-white bg-[#334EAC] rounded-lg">
          Swap
        </button>
        <button className="px-5 py-2.5 text-base font-semibold text-gray-400 hover:text-gray-300 rounded-lg">
          DCA
        </button>
        <button className="px-5 py-2.5 text-base font-semibold text-gray-400 hover:text-gray-300 rounded-lg">
          Limit
        </button>
      </div>

      {!address && (
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 mb-6">
          <p className="text-gray-300 text-center">
            Please connect your wallet to start swapping
          </p>
        </div>
      )}

      {/* Swap Interface - Dark Design */}
      <div className="bg-gray-700 border border-gray-700 rounded-2xl p-6 shadow-xl">
        {/* From Token Section */}
        <div className="-mb-5">
          <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-4 pb-0 h-32 relative">
            <label className="text-sm font-semibold text-gray-400 block mb-3">
              From
            </label>
            <div
              className="relative"
              style={{
                height: "70px",
                marginBottom: "15px",
                marginTop: "-8px",
              }}
            >
              {(!amountIn || parseFloat(amountIn) === 0) && (
                <div className="absolute pointer-events-none text-4xl font-semibold leading-tight text-gray-400 top-0 mt-2.5">
                  0
                </div>
              )}
              <input
                type="text"
                inputMode="decimal"
                value={amountIn}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9.]/g, "");
                  const parts = value.split(".");
                  const formattedValue =
                    parts.length > 2
                      ? parts[0] + "." + parts.slice(1).join("")
                      : value;
                  setAmountIn(formattedValue);
                  resetSwap();
                  setTxHash(null);
                }}
                className={`w-full bg-transparent border-none outline-none text-white focus:ring-0 p-0 m-0 leading-tight absolute ${
                  amountIn && parseFloat(amountIn) > 0
                    ? "text-6xl font-bold"
                    : "text-4xl font-semibold text-transparent"
                }`}
                style={{ height: "55px", top: "0", paddingTop: "4px" }}
                disabled={!address || isLoading}
              />
              {amountIn && parseFloat(amountIn) > 0 && (
                <p
                  className="text-sm text-gray-400 absolute left-0"
                  style={{ top: "38px" }}
                >
                  {isLoadingPrice ? "≈ $..." : `≈ $${usdValue}`}
                </p>
              )}
            </div>
            <div
              className="flex items-center justify-end absolute right-3"
              style={{ top: "25px" }}
            >
              <button
                onClick={() => handleOpenTokenSelector("from")}
                disabled={isLoading}
                className="flex items-center gap-2 bg-[#334EAC] hover:bg-[#3351aca5] text-white px-4 py-2.5 rounded-xl font-semibold transition-all duration-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {getTokenIcon(tokenIn) ? (
                  <img
                    src={getTokenIcon(tokenIn)!}
                    alt={getTokenId(tokenIn)}
                    className="w-5 h-5 rounded-full"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                    {getTokenId(tokenIn)[0]}
                  </div>
                )}
                <span>{getTokenId(tokenIn)}</span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M3 4.5L6 7.5L9 4.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
            <div
              className="text-xs text-gray-400 text-right absolute right-3"
              style={{ bottom: "25px" }}
            >
              Balance:{" "}
              {isLoadingBalance
                ? "..."
                : formatSwapAmount(tokenInBalance || "0", 7)}{" "}
              <button
                onClick={() => {
                  if (tokenInBalance && parseFloat(tokenInBalance) > 0) {
                    setAmountIn(tokenInBalance);
                  }
                }}
                disabled={
                  !tokenInBalance ||
                  parseFloat(tokenInBalance) <= 0 ||
                  isLoadingBalance
                }
                className="text-[#415ab5] hover:text-[#3351aca5] font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Max
              </button>
            </div>
          </div>
        </div>

        {/* Swap Arrow Button - Single arrow down */}
        <div className="flex justify-center my-2 relative z-10">
          <button
            onClick={handleSwapTokens}
            disabled={isLoading}
            className="bg-[#334EAC] hover:bg-[#081F5C] text-white p-2.5 rounded-lg transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Swap tokens"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 7.5l5 5 5-5" />
            </svg>
          </button>
        </div>

        {/* To Token Section */}
        <div className="-mt-4">
          <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-4 h-32">
            <label className="text-sm font-semibold text-gray-400 block mb-3">
              To
            </label>
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <div className="text-3xl font-bold text-white min-h-12 flex items-center gap-2">
                  {isLoadingQuote ? (
                    <span className="text-gray-400 text-sm animate-pulse">
                      Loading...
                    </span>
                  ) : amountOut && amountOut !== "0.0" ? (
                    <>
                      <span>{amountOut}</span>
                      {swapValueAnalysis?.isSuspiciouslyLow &&
                        !isLoadingOutPrice && (
                          <Tooltip
                            title={
                              <div className="max-w-xs p-3 bg-gray-900 border border-gray-700 rounded-lg">
                                <div className="flex items-center gap-2 mb-3">
                                  <Warning
                                    sx={{ fontSize: 18, color: "#fbbf24" }}
                                  />
                                  <p className="font-semibold text-white text-sm">
                                    Why is the value low?
                                  </p>
                                </div>
                                <div className="space-y-2.5">
                                  <div className="flex items-start gap-2">
                                    <WaterDrop
                                      sx={{
                                        fontSize: 16,
                                        color: "#60a5fa",
                                        marginTop: "2px",
                                        flexShrink: 0,
                                      }}
                                    />
                                    <div className="text-xs text-gray-300">
                                      <span className="text-blue-400 font-semibold">
                                        Limited Liquidity:
                                      </span>{" "}
                                      There may be low liquidity in this pair
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <AttachMoney
                                      sx={{
                                        fontSize: 16,
                                        color: "#f59e0b",
                                        marginTop: "2px",
                                        flexShrink: 0,
                                      }}
                                    />
                                    <div className="text-xs text-gray-300">
                                      <span className="text-amber-400 font-semibold">
                                        Protocol Fees:
                                      </span>{" "}
                                      Commissions reduce the amount received
                                    </div>
                                  </div>
                                </div>
                                {swapValueAnalysis.differencePercent > 0 && (
                                  <div className="mt-3 pt-3 border-t border-gray-700 flex items-center gap-2">
                                    <TrendingDown
                                      sx={{ fontSize: 16, color: "#ef4444" }}
                                    />
                                    <p className="text-xs text-gray-400">
                                      Expected difference:{" "}
                                      <span className="text-red-400 font-semibold">
                                        ~
                                        {swapValueAnalysis.differencePercent.toFixed(
                                          1
                                        )}
                                        %
                                      </span>
                                    </p>
                                  </div>
                                )}
                              </div>
                            }
                            arrow
                            placement="right"
                            componentsProps={{
                              tooltip: {
                                sx: {
                                  bgcolor: "transparent",
                                  padding: 0,
                                  boxShadow: "none",
                                  maxWidth: "none",
                                },
                              },
                              popper: {
                                sx: {
                                  "& .MuiTooltip-tooltip": {
                                    bgcolor: "transparent",
                                    padding: 0,
                                    boxShadow: "none",
                                  },
                                  "& .MuiTooltip-arrow": {
                                    color: "#374151",
                                  },
                                },
                              },
                            }}
                          >
                            <IconButton
                              size="small"
                              sx={{
                                padding: "2px",
                                color: "#fbbf24",
                                "&:hover": {
                                  color: "#f59e0b",
                                  backgroundColor: "rgba(251, 191, 36, 0.1)",
                                },
                              }}
                            >
                              <Info sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                    </>
                  ) : (
                    "0"
                  )}
                </div>
              </div>
              <button
                onClick={() => handleOpenTokenSelector("to")}
                disabled={isLoading}
                className="flex items-center gap-2 bg-[#334EAC] hover:bg-[#3351aca5] text-white px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ marginTop: "-10px" }}
              >
                {getTokenIcon(tokenOut) ? (
                  <img
                    src={getTokenIcon(tokenOut)!}
                    alt={getTokenId(tokenOut) || "Token"}
                    className="w-6 h-6 rounded-full"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                    {getTokenId(tokenOut)?.[0] || "?"}
                  </div>
                )}
                <span>{getTokenId(tokenOut) || "Select token"}</span>
                <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M3 4.5L6 7.5L9 4.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 mt-5 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8">
          {!address ? (
            <button
              disabled
              className="w-full bg-[#334EAC]/30 text-[#081F5C] font-bold py-4 text-base rounded-xl cursor-not-allowed"
            >
              Connect Wallet
            </button>
          ) : !canGetQuote ? (
            <button
              disabled
              className="w-full bg-[#2b46a7] text-[#ffffff] font-bold py-4 text-base rounded-xl cursor-not-allowed"
            >
              Enter Amount
            </button>
          ) : (
            <button
              onClick={() => {
                void handleSwap();
              }}
              disabled={isLoading || !!txHash || isLoadingQuote}
              className="w-full bg-[linear-gradient(to_right,#334EAC,#081F5C)] hover:bg-[linear-gradient(to_right,#081F5C,#334EAC)] text-white font-bold py-4 text-base rounded-xl transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {txHash
                ? "Swap Completed!"
                : isLoading
                  ? "Processing..."
                  : "Swap"}
            </button>
          )}
        </div>

        {/* Transaction Hash */}
        {txHash && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
            <h3 className="text-sm font-semibold text-green-700 mb-2">
              ✓ Swap Completed!
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-green-600 font-mono break-all">
                  {txHash}
                </span>
              </div>
              <a
                href={getExplorerUrl(txHash, network)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-green-700 hover:text-green-800 font-semibold"
              >
                <span>View on Stellar Expert</span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Token Selector Modal */}
      <TokenSelectorModal
        isOpen={tokenSelectorOpen}
        onClose={() => setTokenSelectorOpen(false)}
        onSelectToken={handleSelectToken}
        selectedToken={tokenSelectorType === "from" ? tokenIn : tokenOut}
      />
    </div>
  );
};

export default Swap;
