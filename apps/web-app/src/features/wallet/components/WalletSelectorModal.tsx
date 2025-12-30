"use client";

import { useState } from "react";
import { Modal, Button } from "@stellar/design-system";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
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
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [walletToDisconnect, setWalletToDisconnect] = useState<
    "evm" | "stellar" | null
  >(null);

  const handleDisconnect = async (type: "evm" | "stellar") => {
    if (type === "stellar") {
      await disconnectWallet();
    }
    // For EVM, RainbowKit handles disconnection automatically
    setShowDisconnectModal(false);
    setWalletToDisconnect(null);
    onClose();
  };

  const handleDisconnectClick = (type: "evm" | "stellar") => {
    setWalletToDisconnect(type);
    setShowDisconnectModal(true);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Main Wallet Selector Modal */}
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
            {/* EVM Wallet Section */}
            <div className="border border-gray-300 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    EVM Wallets
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Connect with MetaMask, WalletConnect, Coinbase, and more
                  </p>
                </div>
              </div>

              {isEvmConnected && evmAddress ? (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-sm font-mono text-gray-700">
                        {evmAddress.substring(0, 6)}...
                        {evmAddress.substring(evmAddress.length - 4)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDisconnectClick("evm")}
                      className="text-sm text-red-600 hover:text-red-700 font-semibold"
                    >
                      Disconnect
                    </button>
                  </div>
                  <div className="text-xs text-gray-500">
                    Use RainbowKit button below to switch wallet or network
                  </div>
                </div>
              ) : (
                <div className="mt-4">
                  <ConnectButton.Custom>
                    {({ account, chain, openConnectModal, mounted }) => {
                      const ready = mounted;
                      const connected = ready && account && chain;

                      return (
                        <button
                          onClick={openConnectModal}
                          disabled={!ready}
                          className="w-full bg-[#334EAC] hover:bg-[#081F5C] text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {connected ? "Connected" : "Connect EVM Wallet"}
                        </button>
                      );
                    }}
                  </ConnectButton.Custom>
                </div>
              )}
            </div>

            {/* Stellar Wallet Section */}
            <div className="border border-gray-300 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Stellar Wallet
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Connect with Freighter, Albedo, or other Stellar wallets
                  </p>
                </div>
              </div>

              {stellarAddress ? (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#39bfb7]"></div>
                      <span className="text-sm font-mono text-gray-700">
                        {stellarAddress.substring(0, 6)}...
                        {stellarAddress.substring(stellarAddress.length - 4)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDisconnectClick("stellar")}
                      className="text-sm text-red-600 hover:text-red-700 font-semibold"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    void connectWallet();
                    onClose();
                  }}
                  className="w-full mt-4 bg-[#081F5C] hover:bg-[#334EAC] text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200"
                >
                  Connect Stellar Wallet
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Disconnect Confirmation Modal */}
      <div id="disconnectModalContainer" className="bg-white">
        <Modal
          visible={showDisconnectModal}
          onClose={() => {
            setShowDisconnectModal(false);
            setWalletToDisconnect(null);
          }}
          parentId="disconnectModalContainer"
        >
          <div className="bg-[#081F5C] p-5 opacity-100 rounded-2xl border border-[#334EAC]">
            <Modal.Heading>
              <span className="text-[#FFF9F0]">
                {walletToDisconnect === "evm"
                  ? "Do you want to disconnect your EVM wallet?"
                  : "Do you want to disconnect your Stellar wallet?"}
              </span>
            </Modal.Heading>
            <Modal.Footer itemAlignment="stack">
              <Button
                size="md"
                variant="primary"
                onClick={() => {
                  if (walletToDisconnect) {
                    void handleDisconnect(walletToDisconnect);
                  }
                }}
              >
                Disconnect
              </Button>
              <Button
                size="md"
                variant="tertiary"
                onClick={() => {
                  setShowDisconnectModal(false);
                  setWalletToDisconnect(null);
                }}
              >
                Cancel
              </Button>
            </Modal.Footer>
          </div>
        </Modal>
      </div>
    </>
  );
};
