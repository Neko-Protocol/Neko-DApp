"use client";

import { useState } from "react";
import { Button, Modal } from "@stellar/design-system";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useWallet } from "@/hooks/useWallet";
import { useWalletType } from "@/hooks/useWalletType";
import { connectWallet, disconnectWallet } from "@/lib/helpers/wallet";

export const WalletButton = () => {
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const { address: stellarAddress, isPending } = useWallet();
  const { walletType, isStellarConnected } = useWalletType();
  const buttonLabel = isPending ? "Connecting..." : "Connect Wallet";

  // If EVM wallet is connected, show RainbowKit's ConnectButton
  if (walletType === "evm") {
    return <ConnectButton />;
  }

  // If Stellar wallet is connected or no wallet connected, show Stellar wallet UI
  if (!stellarAddress) {
    return (
      <div className="flex items-center gap-2">
        {/* EVM Wallet Button (RainbowKit) */}
        <ConnectButton />

        {/* Stellar Wallet Button */}
        <button
          onClick={() => void connectWallet()}
          disabled={isPending}
          className="bg-[#081F5C] hover:bg-[#334EAC] text-[#FFF9F0] font-bold py-4 px-6 rounded-full transition-colors duration-200 shadow-md flex items-center gap-2 border border-[#334EAC]/30"
        >
          {buttonLabel}
        </button>
      </div>
    );
  }

  // Stellar wallet is connected - show disconnect modal
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: "5px",
        opacity: isPending ? 0.6 : 1,
        color: "white",
      }}
    >
      <div id="modalContainer" className="bg-white">
        <Modal
          visible={showDisconnectModal}
          onClose={() => setShowDisconnectModal(false)}
          parentId="modalContainer"
        >
          <div className="bg-[#081F5C] p-5 opacity-100 rounded-2xl border border-[#334EAC]">
            <Modal.Heading>
              <span className="text-[#FFF9F0]">
                Connected as{" "}
                <code
                  className="text-[#39bfb7]"
                  style={{ lineBreak: "anywhere" }}
                >
                  {stellarAddress}
                </code>
                . Do you want to disconnect?
              </span>
            </Modal.Heading>
            <Modal.Footer itemAlignment="stack">
              <Button
                size="md"
                variant="primary"
                onClick={() => {
                  void disconnectWallet().then(() =>
                    setShowDisconnectModal(false)
                  );
                }}
              >
                Disconnect
              </Button>
              <Button
                size="md"
                variant="tertiary"
                onClick={() => {
                  setShowDisconnectModal(false);
                }}
              >
                Cancel
              </Button>
            </Modal.Footer>
          </div>
        </Modal>
      </div>

      <div className="flex items-center gap-2">
        {/* EVM Wallet Button (RainbowKit) - always available */}
        <ConnectButton />

        {/* Stellar Wallet Button */}
        <div
          className="bg-[#081F5C] hover:bg-[#334EAC] text-[#FFF9F0] px-6 py-4 rounded-full cursor-pointer transition-colors duration-200 flex items-center gap-2 border border-[#334EAC]/30"
          onClick={() => setShowDisconnectModal(true)}
        >
          <div className="w-2 h-2 rounded-full bg-[#39bfb7]"></div>
          <span className="font-mono text-sm">
            {stellarAddress.substring(0, 4)}...
            {stellarAddress.substring(stellarAddress.length - 4)}
          </span>
        </div>
      </div>
    </div>
  );
};
