"use client";

import React from "react";
import { stellarNetwork } from "@/lib/constants/network";
import FundAccountButton from "./FundAccountButton";
import { WalletButton } from "./WalletButton";
import { ChainSelector } from "./ChainSelector";
import NetworkPill from "./NetworkPill";

const ConnectAccount: React.FC = () => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: "10px",
        verticalAlign: "middle",
      }}
    >
      <WalletButton />
      <ChainSelector />
      {stellarNetwork !== "PUBLIC" && <FundAccountButton />}
      <NetworkPill />
    </div>
  );
};

export default ConnectAccount;
