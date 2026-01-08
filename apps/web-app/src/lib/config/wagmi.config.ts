import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import {
  mainnet,
  sepolia,
  polygon,
  optimism,
  arbitrum,
  base,
  bsc,
} from "wagmi/chains";
import { defineChain } from "viem";

/**
 * Wagmi configuration for EVM wallets
 */
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

if (!projectId && typeof window !== "undefined") {
  console.warn(
    "WalletConnect projectId is not configured. Please add NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID to your .env.local file. Get your projectId at https://cloud.walletconnect.com/"
  );
}

// Validate projectId
if (!projectId && typeof window !== "undefined") {
  console.warn(
    "WalletConnect projectId is not configured. EVM wallet connections may not work properly.\n" +
      "Please add NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID to your .env.local file.\n" +
      "Get your projectId at: https://cloud.walletconnect.com/"
  );
}

// As mantle is not supported by default on wagmi, defining it manually is the way to go
const mantle = defineChain({
  id: 5000,
  name: "Mantle",
  nativeCurrency: {
    decimals: 18,
    name: "Mantle",
    symbol: "MNT",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.mantle.xyz"],
    },
  },
  blockExplorers: {
    default: {
      name: "Mantle Explorer",
      url: "https://explorer.mantle.xyz",
    },
  },
});

export const wagmiConfig = getDefaultConfig({
  appName: "Neko Protocol",
  projectId: projectId || "00000000000000000000000000000000", // Temporary fallback - user should set their own
  chains: [mainnet, bsc, mantle, polygon, optimism, arbitrum, base, sepolia],
  ssr: true, // Enable SSR support for Next.js
});
