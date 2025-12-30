"use client";

import { useState, useEffect, useRef } from "react";
import { ConnectButton, useAccountModal } from "@rainbow-me/rainbowkit";
import { useAccount, useDisconnect } from "wagmi";
import { useWallet } from "@/hooks/useWallet";
import { connectWallet, disconnectWallet } from "@/lib/helpers/wallet";

interface WalletSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WalletSelectorModal: React.FC<WalletSelectorModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { isConnected: isEvmConnected, address: evmAddress } = useAccount();
  const { address: stellarAddress } = useWallet();
  const { openAccountModal } = useAccountModal();
  const { disconnect: disconnectEvm } = useDisconnect();
  const [isConnectingStellar, setIsConnectingStellar] = useState(false);
  const prevEvmStateRef = useRef(isEvmConnected);
  const prevStellarStateRef = useRef(!!stellarAddress);

  // Reset tracking when modal opens
  useEffect(() => {
    if (isOpen) {
      prevEvmStateRef.current = isEvmConnected;
      prevStellarStateRef.current = !!stellarAddress;
    }
  }, [isOpen, isEvmConnected, stellarAddress]);

  // Close modal only when a NEW wallet connection is established (while modal is open)
  useEffect(() => {
    if (!isOpen) return;

    const newEvmConnection = isEvmConnected && !prevEvmStateRef.current;
    const newStellarConnection =
      !!stellarAddress && !prevStellarStateRef.current;

    if (newEvmConnection || newStellarConnection) {
      // Update previous states
      prevEvmStateRef.current = isEvmConnected;
      prevStellarStateRef.current = !!stellarAddress;

      // Small delay to show the connection state
      const timer = setTimeout(() => {
        onClose();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isEvmConnected, stellarAddress, onClose]);

  const handleConnectStellar = async () => {
    // Prevent connecting if EVM is already connected
    if (isEvmConnected) {
      alert(
        "Please disconnect your EVM wallet first before connecting a Stellar wallet."
      );
      return;
    }

    setIsConnectingStellar(true);
    try {
      await connectWallet();
    } catch (error) {
      console.error("Failed to connect Stellar wallet:", error);
      setIsConnectingStellar(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      if (isEvmConnected) {
        disconnectEvm();
      }
      if (stellarAddress) {
        await disconnectWallet();
      }
      // Close modal after successful disconnect
      onClose();
    } catch (error) {
      console.error("Error disconnecting wallet:", error);
      // Still close modal even if there's an error
      onClose();
    }
  };

  if (!isOpen) return null;

  // If a wallet is connected, show connection status
  if (isEvmConnected || stellarAddress) {
    const connectedAddress = evmAddress || stellarAddress;
    const walletType = isEvmConnected ? "EVM" : "Stellar";
    const indicatorColor = isEvmConnected ? "bg-green-500" : "bg-[#39bfb7]";

    return (
      <>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal Content */}
          <div className="relative w-full max-w-md bg-white border border-gray-300 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-300">
              <h2 className="text-xl font-bold text-gray-900">
                Wallet Connected
              </h2>
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

            {/* Connected Status */}
            <div className="p-6">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-300">
                <div className={`w-3 h-3 rounded-full ${indicatorColor}`}></div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-900">
                    {walletType} Wallet
                  </div>
                  <div className="text-xs font-mono text-gray-600 mt-1">
                    {connectedAddress}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                {isEvmConnected && openAccountModal && (
                  <button
                    onClick={() => {
                      openAccountModal();
                      onClose();
                    }}
                    className="flex-1 bg-[#334EAC] hover:bg-[#081F5C] text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 text-sm"
                  >
                    Manage Wallet
                  </button>
                )}
                <button
                  onClick={() => void handleDisconnect()}
                  className={`${
                    isEvmConnected && openAccountModal ? "flex-1" : "w-full"
                  } bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 text-sm`}
                >
                  Disconnect
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // No wallet connected - show connection options
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div
        className="relative w-full max-w-md bg-white border border-gray-300 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-300">
          <h2 className="text-xl font-bold text-gray-900">Connect Wallet</h2>
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

        {/* Wallet Options */}
        <div className="p-6 space-y-4">
          {/* EVM Wallet Option */}
          <div className="border border-gray-300 rounded-xl p-4 hover:border-[#334EAC] transition-colors">
            <div className="mb-3">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                EVM Wallets
              </h3>
              <p className="text-sm text-gray-500">
                Connect with MetaMask, WalletConnect, Coinbase, and more
              </p>
            </div>
            <ConnectButton.Custom>
              {({ account, chain, openConnectModal, mounted }) => {
                const ready = mounted;
                const isDisabled = !ready || !!stellarAddress;
                return (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openConnectModal();
                      }}
                      disabled={isDisabled}
                      className="w-full bg-[#334EAC] hover:bg-[#081F5C] text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Connect EVM Wallet
                    </button>
                    {stellarAddress && (
                      <p className="text-xs text-red-600 mt-2 text-center">
                        Please disconnect your Stellar wallet first
                      </p>
                    )}
                  </>
                );
              }}
            </ConnectButton.Custom>
          </div>

          {/* Stellar Wallet Option */}
          <div className="border border-gray-300 rounded-xl p-4 hover:border-[#334EAC] transition-colors">
            <div className="mb-3">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Stellar Wallet
              </h3>
              <p className="text-sm text-gray-500">
                Connect with Freighter, Albedo, or other Stellar wallets
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                void handleConnectStellar();
              }}
              disabled={isConnectingStellar || isEvmConnected}
              className="w-full bg-[#081F5C] hover:bg-[#334EAC] text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isConnectingStellar ? "Connecting..." : "Connect Stellar Wallet"}
            </button>
            {isEvmConnected && (
              <p className="text-xs text-red-600 mt-2 text-center">
                Please disconnect your EVM wallet first
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
