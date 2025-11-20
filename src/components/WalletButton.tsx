import { useState } from "react";
import { Button, Modal, Profile } from "@stellar/design-system";
import { useWallet } from "../hooks/useWallet";
import { connectWallet, disconnectWallet } from "../util/wallet";

export const WalletButton = () => {
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const { address, isPending } = useWallet();
  const buttonLabel = isPending ? "Loading..." : "Connect";

  if (!address) {
    return (
      <Button variant="primary" size="md" onClick={() => void connectWallet()}>
        {buttonLabel}
      </Button>
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
      <div id="modalContainer" className="bg-white">
        <Modal
          visible={showDisconnectModal}
          onClose={() => setShowDisconnectModal(false)}
          parentId="modalContainer"
        >
          <div className="bg-[#334eac] p-5 opacity-90 rounded-2xl">
            <Modal.Heading>
              Connected as{" "}
              <code style={{ lineBreak: "anywhere" }}>{address}</code>. Do you
              want to disconnect?
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

      <Profile
        publicAddress={address}
        size="md"
        isShort
        onClick={() => setShowDisconnectModal(true)}
      />
    </div>
  );
};
