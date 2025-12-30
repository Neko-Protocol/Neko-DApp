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
import { useEVMTokenPrice } from "@/hooks/useEVMTokenPrice";
import { useWalletType } from "@/hooks/useWalletType";
import {
  useAccount,
  usePublicClient,
  useWalletClient,
  useChainId,
} from "wagmi";
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
import {
  getUniswapQuote,
  executeUniswapSwap,
  ensureTokenApproval,
  EVM_TOKENS,
  type UniswapQuoteRequest,
  type UniswapSwapRequest,
} from "@/lib/helpers/uniswap";
import TokenSelectorModal from "../ui/TokenSelectorModal";
import { Tooltip, IconButton } from "@mui/material";
import {
  Info,
  Warning,
  WaterDrop,
  AttachMoney,
  TrendingDown,
} from "@mui/icons-material";
import { Token as UniswapToken } from "@uniswap/sdk-core";

const Swap: React.FC = () => {
  // Wallet detection
  const {
    walletType,
    isEvmConnected,
    isStellarConnected,
    evmAddress,
    stellarAddress,
  } = useWalletType();
  const {
    address: stellarWalletAddress,
    network,
    networkPassphrase,
    signTransaction,
  } = useWallet();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();

  // Use the appropriate address based on wallet type
  const address = walletType === "evm" ? evmAddress : stellarWalletAddress;

  // Swap state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [swapMode, setSwapMode] = useState<"evm" | "stellar">("stellar"); // Default to Stellar

  // Get available tokens for current network (Stellar only)
  const availableTokens = getAvailableTokens();
  const tokenCodes = Object.keys(availableTokens);

  // Tokens are now strings (contract addresses) - initialize with first available tokens
  const defaultTokenIn =
    availableTokens[tokenCodes[0]]?.contract || TOKENS.XLM || "";
  const defaultTokenOut =
    availableTokens[tokenCodes[1]]?.contract || TOKENS.USDC || "";

  // For EVM, use Uniswap tokens
  const [tokenIn, setTokenIn] = useState<Token | string | UniswapToken>(
    defaultTokenIn
  );
  const [tokenOut, setTokenOut] = useState<Token | string | UniswapToken>(
    defaultTokenOut
  );

  // Update swap mode based on connected wallet
  useEffect(() => {
    if (walletType === "evm") {
      setSwapMode("evm");
      // Set default EVM tokens
      setTokenIn("ETH");
      setTokenOut("USDC");
    } else if (walletType === "stellar") {
      setSwapMode("stellar");
      // Set default Stellar tokens
      setTokenIn(defaultTokenIn);
      setTokenOut(defaultTokenOut);
    }
  }, [walletType, defaultTokenIn, defaultTokenOut]);
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

  // Get token balance for "from" token (Stellar only for now)
  const { balance: tokenInBalance, isLoading: isLoadingBalance } =
    useTokenBalance(
      swapMode === "stellar"
        ? (tokenIn as Token | string | undefined)
        : undefined
    );

  // Get token prices in USD (Stellar or EVM based on swap mode)
  const { price: stellarTokenInPrice, isLoading: isLoadingStellarPrice } =
    useTokenPrice(
      swapMode === "stellar"
        ? (tokenIn as Token | string | undefined)
        : undefined
    );
  const { price: stellarTokenOutPrice, isLoading: isLoadingStellarOutPrice } =
    useTokenPrice(
      swapMode === "stellar"
        ? (tokenOut as Token | string | undefined)
        : undefined
    );

  // Get EVM token prices
  const { price: evmTokenInPrice, isLoading: isLoadingEvmPrice } =
    useEVMTokenPrice(
      swapMode === "evm"
        ? (tokenIn as UniswapToken | string | undefined)
        : undefined
    );
  const { price: evmTokenOutPrice, isLoading: isLoadingEvmOutPrice } =
    useEVMTokenPrice(
      swapMode === "evm"
        ? (tokenOut as UniswapToken | string | undefined)
        : undefined
    );

  // Use the appropriate price based on swap mode
  const tokenInPrice =
    swapMode === "evm" ? evmTokenInPrice : stellarTokenInPrice;
  const tokenOutPrice =
    swapMode === "evm" ? evmTokenOutPrice : stellarTokenOutPrice;
  const isLoadingPrice =
    swapMode === "evm" ? isLoadingEvmPrice : isLoadingStellarPrice;
  const isLoadingOutPrice =
    swapMode === "evm" ? isLoadingEvmOutPrice : isLoadingStellarOutPrice;

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
  const getTokenId = (token: Token | string | UniswapToken): string => {
    // Handle Uniswap Token
    if (
      token instanceof UniswapToken ||
      (typeof token === "object" && "symbol" in token && "address" in token)
    ) {
      return (token as UniswapToken).symbol || "";
    }

    if (typeof token === "string") {
      // Check if it's an EVM token symbol
      if (EVM_TOKENS[token]) {
        return token;
      }
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

  // Helper function to get token icon (works for both EVM and Stellar)
  const getTokenIconUrl = (
    token: Token | string | UniswapToken
  ): string | null => {
    // getTokenIcon now handles both Stellar and EVM tokens
    return getTokenIcon(token as Token | string | UniswapToken);
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
      parsedAmount <= 0
    ) {
      setAmountOut("0.0");
      setIsLoadingQuote(false);
      return;
    }

    // EVM swap quote
    if (swapMode === "evm" && publicClient && chainId) {
      try {
        const tokenInSymbol: string =
          typeof tokenIn === "string"
            ? tokenIn
            : tokenIn instanceof UniswapToken
              ? tokenIn.symbol || "ETH"
              : "ETH";
        const tokenOutSymbol: string =
          typeof tokenOut === "string"
            ? tokenOut
            : tokenOut instanceof UniswapToken
              ? tokenOut.symbol || "USDC"
              : "USDC";
        const quoteRequest: UniswapQuoteRequest = {
          tokenIn: tokenInSymbol,
          tokenOut: tokenOutSymbol,
          amountIn: trimmedAmount,
        };

        const quote = await getUniswapQuote(
          quoteRequest,
          chainId,
          publicClient
        );
        setAmountOut(quote.amountOut || "0.0");
        setError(null);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        if (
          errorMessage.includes("No liquidity pool") ||
          errorMessage.includes("Pool not found") ||
          errorMessage.includes("No pool") ||
          errorMessage.includes("pool may not exist")
        ) {
          setError(errorMessage);
        }

        setAmountOut("0.0");
      } finally {
        setIsLoadingQuote(false);
      }
      return;
    }

    // Stellar swap quote
    if (swapMode === "stellar" && !apiKeyConfigured) {
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
        assetIn: tokenIn as Token | string,
        assetOut: tokenOut as Token | string,
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
  }, [
    address,
    amountIn,
    tokenIn,
    tokenOut,
    apiKeyConfigured,
    swapMode,
    publicClient,
    chainId,
  ]);

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
    if (!isValid || !address) {
      setAmountOut("0.0");
      setIsLoadingQuote(false);
      return;
    }

    // For Stellar, also check API key
    if (swapMode === "stellar" && !apiKeyConfigured) {
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
  }, [
    amountIn,
    tokenIn,
    tokenOut,
    address,
    apiKeyConfigured,
    fetchLiveQuote,
    swapMode,
  ]);

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
    if (!amountIn || parseFloat(amountIn) <= 0 || !address) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // EVM swap flow
      if (
        swapMode === "evm" &&
        walletClient &&
        publicClient &&
        chainId &&
        evmAddress
      ) {
        // Step 1: Get quote
        const tokenInSymbol: string =
          typeof tokenIn === "string"
            ? tokenIn
            : tokenIn instanceof UniswapToken
              ? (tokenIn.symbol ?? "ETH")
              : "ETH";
        const tokenOutSymbol: string =
          typeof tokenOut === "string"
            ? tokenOut
            : tokenOut instanceof UniswapToken
              ? (tokenOut.symbol ?? "USDC")
              : "USDC";

        const quoteRequest: UniswapQuoteRequest = {
          tokenIn: tokenInSymbol,
          tokenOut: tokenOutSymbol,
          amountIn: amountIn,
        };

        let quote;
        try {
          quote = await getUniswapQuote(quoteRequest, chainId, publicClient);
        } catch (quoteError) {
          const errorMessage =
            quoteError instanceof Error
              ? quoteError.message
              : String(quoteError);
          setError(errorMessage);
          setIsLoading(false);
          return;
        }

        if (tokenInSymbol && tokenInSymbol !== "ETH") {
          const tokenInObj = EVM_TOKENS[tokenInSymbol];
          if (tokenInObj) {
            await ensureTokenApproval(
              tokenInObj.address as `0x${string}`,
              amountIn,
              tokenInObj.decimals,
              chainId,
              walletClient,
              publicClient
            );
          }
        }

        const swapRequest: UniswapSwapRequest = {
          tokenIn: tokenInSymbol,
          tokenOut: tokenOutSymbol,
          amountIn: amountIn,
          amountOutMinimum: quote.amountOutMinimum,
          recipient: evmAddress,
        };

        const swapResult = await executeUniswapSwap(
          swapRequest,
          chainId,
          walletClient
        );

        if (swapResult.txHash) {
          setTxHash(swapResult.txHash);
          resetSwap();
          setAmountIn("");
          setAmountOut("0.0");
        }
        return;
      }

      if (swapMode === "stellar" && networkPassphrase) {
        // Step 1: Get quote
        const quoteRequest: QuoteRequest = {
          assetIn: tokenIn as Token | string,
          assetOut: tokenOut as Token | string,
          amount: amountIn,
          tradeType: "EXACT_IN",
        };

        const newQuote = await getQuote(quoteRequest);

        const buildRequest = {
          quote: newQuote,
          from: address,
          to: address,
        };

        const buildResult = await buildTransaction(buildRequest);

        let signedResult;
        try {
          signedResult = await signTransaction(buildResult.xdr, {
            networkPassphrase: networkPassphrase,
            address: address,
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          const errorString = errorMessage.toLowerCase();
          if (
            errorString.includes("user denied") ||
            errorString.includes("user rejected") ||
            errorString.includes("user cancelled") ||
            errorString.includes("user canceled") ||
            errorString.includes("cancelled") ||
            errorString.includes("canceled")
          ) {
            throw new Error("USER_REJECTED");
          }
          throw error;
        }

        const signedXdrString =
          signedResult.signedTxXdr ||
          (typeof signedResult === "string"
            ? signedResult
            : JSON.stringify(signedResult));

        const sendRequest = {
          xdr: signedXdrString,
          launchtube: false,
        };

        const sendResult = await sendTransaction(sendRequest);

        if (sendResult.txHash) {
          setTxHash(sendResult.txHash);
          resetSwap();
          setAmountIn("");
          setAmountOut("0.0");
        }
        return;
      }

      throw new Error("Wallet not connected or invalid swap mode");
    } catch (error) {
      if (error instanceof Error && error.message === "USER_REJECTED") {
        setIsLoading(false);
        return;
      }

      const errorMessage =
        error instanceof Error ? error.message : "Failed to complete swap";
      setError(errorMessage);
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

      {/* Wallet Type Selector - Only show if both wallet types are available */}
      {(isEvmConnected || isStellarConnected) && (
        <div className="flex gap-2 mb-4 p-1 bg-gray-800 rounded-lg">
          <button
            onClick={() => setSwapMode("stellar")}
            disabled={!isStellarConnected}
            className={`flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              swapMode === "stellar"
                ? "bg-[#334EAC] text-white"
                : "text-gray-400 hover:text-gray-300"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Stellar
          </button>
          <button
            onClick={() => setSwapMode("evm")}
            disabled={!isEvmConnected}
            className={`flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              swapMode === "evm"
                ? "bg-[#334EAC] text-white"
                : "text-gray-400 hover:text-gray-300"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            EVM
          </button>
        </div>
      )}

      {!address && (
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 mb-6">
          <p className="text-gray-300 text-center">
            Please connect your wallet to start swapping
          </p>
        </div>
      )}

      {address && swapMode === "evm" && !walletClient && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 mb-6">
          <p className="text-yellow-800 text-center text-sm">
            Wallet client not available. Please ensure your EVM wallet is
            properly connected.
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
              className="relative overflow-hidden"
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
                    ? "text-5xl sm:text-6xl font-bold"
                    : "text-4xl font-semibold text-transparent"
                }`}
                style={{
                  height: "55px",
                  top: "0",
                  paddingTop: "4px",
                  maxWidth: "calc(100% - 140px)", // Leave space for token selector button
                  fontSize:
                    amountIn && amountIn.length > 12
                      ? "clamp(1.5rem, 4vw, 3rem)" // Responsive font size for long numbers
                      : undefined,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
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
                {getTokenIconUrl(tokenIn) ? (
                  <img
                    src={getTokenIconUrl(tokenIn)!}
                    alt={getTokenId(tokenIn)}
                    className="w-5 h-5 rounded-full object-contain"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                    {getTokenId(tokenIn)[0] || "?"}
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
              <div className="flex-1 min-w-0 overflow-hidden">
                <div className="text-3xl font-bold text-white min-h-12 flex items-center gap-2">
                  {isLoadingQuote ? (
                    <span className="text-gray-400 text-sm animate-pulse">
                      Loading...
                    </span>
                  ) : amountOut && amountOut !== "0.0" ? (
                    <>
                      <span className="truncate">{amountOut}</span>
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
                {getTokenIconUrl(tokenOut) ? (
                  <img
                    src={getTokenIconUrl(tokenOut)!}
                    alt={getTokenId(tokenOut) || "Token"}
                    className="w-6 h-6 rounded-full object-contain"
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
                href={
                  swapMode === "evm"
                    ? `https://etherscan.io/tx/${txHash}`
                    : getExplorerUrl(txHash, network)
                }
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-green-700 hover:text-green-800 font-semibold"
              >
                <span>
                  {swapMode === "evm"
                    ? "View on Etherscan"
                    : "View on Stellar Expert"}
                </span>
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
        selectedToken={
          (tokenSelectorType === "from" ? tokenIn : tokenOut) as Token | string
        }
        swapMode={swapMode}
      />
    </div>
  );
};

export default Swap;
