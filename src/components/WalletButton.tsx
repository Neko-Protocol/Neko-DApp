import { useState } from "react";
import { Button, Modal } from "@stellar/design-system";
import { useWallet } from "../hooks/useWallet";
import { connectWallet, disconnectWallet } from "../util/wallet";

export const WalletButton = () => {
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const { address, isPending, balances, isFetchingBalances } = useWallet();
  const buttonLabel = isPending ? "Connecting..." : "Connect Wallet";
  const xlmBalance = balances.xlm?.balance ?? "0";

  if (!address) {
    return (
      <button
        onClick={() => void connectWallet()}
        disabled={isPending}
        className="bg-[#081F5C] hover:bg-[#334EAC] text-[#FFF9F0] font-bold py-4 px-6 rounded-full transition-colors duration-200 shadow-md flex items-center gap-2 border border-[#334EAC]/30"
      >
        {buttonLabel}
      </button>
    );
  }

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
      {/* Show XLM balance when connected */}
      {address && (
        <div className="hidden sm:flex items-center gap-2 bg-[#334EAC]/30 px-4 py-2 rounded-full border border-[#334EAC]/50">
          {isFetchingBalances ? (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#39bfb7] rounded-full animate-pulse"></div>
              <span className="text-[#FFF9F0] text-sm font-medium">
                Loading...
              </span>
            </div>
          ) : (
            <>
              <span className="text-[#FFF9F0] text-sm font-bold">
                {xlmBalance}
              </span>
              <span className="text-[#7096D1] text-xs font-semibold">XLM</span>
            </>
          )}
        </div>
      )}

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
                  {address}
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
                    setShowDisconnectModal(false),
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

      <div
        className="bg-[#081F5C] hover:bg-[#334EAC] text-[#FFF9F0] px-6 py-4 rounded-full cursor-pointer transition-colors duration-200 flex items-center gap-2 border border-[#334EAC]/30"
        onClick={() => setShowDisconnectModal(true)}
      >
        <div className="w-2 h-2 rounded-full bg-[#39bfb7]"></div>
        <span className="font-mono text-sm">
          {address.substring(0, 4)}...{address.substring(address.length - 4)}
        </span>
      </div>
    </div>
  );
};
