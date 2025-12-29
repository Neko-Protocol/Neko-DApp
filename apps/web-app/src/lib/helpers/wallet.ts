import storage from "./storage";
import {
  ISupportedWallet,
  StellarWalletsKit,
  WalletNetwork,
  sep43Modules,
} from "@creit.tech/stellar-wallets-kit";
import { Horizon } from "@stellar/stellar-sdk";
import {
  networkPassphrase,
  stellarNetwork,
  horizonUrl,
} from "../constants/network";

const kit: StellarWalletsKit = new StellarWalletsKit({
  network: networkPassphrase as WalletNetwork,
  modules: sep43Modules(),
});

export const connectWallet = async () => {
  await kit.openModal({
    modalTitle: "Connect to your wallet",
    onWalletSelected: (option: ISupportedWallet) => {
      const selectedId = option.id;
      kit.setWallet(selectedId);

      // Now open selected wallet's login flow by calling `getAddress` --
      // Yes, it's strange that a getter has a side effect of opening a modal
      void kit.getAddress().then((address) => {
        // Once `getAddress` returns successfully, we know they actually
        // connected the selected wallet, and we set our localStorage
        if (address.address) {
          storage.setItem("walletId", selectedId);
          storage.setItem("walletAddress", address.address);
        } else {
          storage.setItem("walletId", "");
          storage.setItem("walletAddress", "");
        }
      });
      if (selectedId == "freighter" || selectedId == "hot-wallet") {
        void kit.getNetwork().then((network) => {
          if (network.network && network.networkPassphrase) {
            storage.setItem("walletNetwork", network.network);
            storage.setItem("networkPassphrase", network.networkPassphrase);
          } else {
            storage.setItem("walletNetwork", "");
            storage.setItem("networkPassphrase", "");
          }
        });
      }
    },
  });
};

export const disconnectWallet = async () => {
  await kit.disconnect();
  storage.removeItem("walletId");
};

// Create Horizon server instance lazily (only when needed and in browser)
// This prevents issues during SSR and ensures we use the correct URL
const getHorizon = (): Horizon.Server | null => {
  if (typeof window === "undefined") {
    // Return null during SSR
    console.log("getHorizon: SSR environment, returning null");
    return null;
  }

  if (!horizonUrl) {
    console.error("Horizon URL is not configured. Current value:", horizonUrl);
    return null;
  }

  try {
    console.log(
      "Creating Horizon server with URL:",
      horizonUrl,
      "Network:",
      stellarNetwork
    );
    return new Horizon.Server(horizonUrl, {
      allowHttp: stellarNetwork === "LOCAL",
    });
  } catch (error) {
    console.error("Failed to create Horizon server:", error);
    return null;
  }
};

const formatter = new Intl.NumberFormat();

export type MappedBalances = Record<string, Horizon.HorizonApi.BalanceLine>;

export const fetchBalances = async (address: string) => {
  // Only fetch balances in the browser (client-side)
  if (typeof window === "undefined") {
    return {};
  }

  const horizonInstance = getHorizon();
  if (!horizonInstance) {
    console.warn("Horizon server not available, cannot fetch balances");
    return {};
  }

  try {
    console.log("Fetching balances for address:", address);
    console.log("Using Horizon URL:", horizonUrl);
    const { balances } = await horizonInstance
      .accounts()
      .accountId(address)
      .call();
    console.log("Raw balances from Horizon:", balances);
    const mapped = balances.reduce((acc, b) => {
      // Format the balance with commas for display
      const formattedBalance = formatter.format(Number(b.balance));
      // Create a new object to avoid mutating the original
      const balanceEntry = {
        ...b,
        balance: formattedBalance,
      };
      const key =
        b.asset_type === "native"
          ? "xlm"
          : b.asset_type === "liquidity_pool_shares"
            ? b.liquidity_pool_id
            : `${b.asset_code}:${b.asset_issuer}`;
      acc[key] = balanceEntry;
      return acc;
    }, {} as MappedBalances);
    console.log("Mapped balances:", mapped);
    return mapped;
  } catch (err) {
    // `not found` is sort of expected, indicating an unfunded wallet, which
    // the consumer of `balances` can understand via the lack of `xlm` key.
    // Network errors are also common (e.g., Horizon server not available)
    if (err instanceof Error) {
      const isNotFound = err.message.match(/not found/i);
      const isNetworkError = err.message.match(
        /network|fetch|connection|failed/i
      );

      if (!isNotFound && !isNetworkError) {
        console.error("Error fetching balances:", err);
      } else if (isNetworkError) {
        console.warn(
          "Network error fetching balances (Horizon may be unavailable):",
          err.message
        );
      }
    } else {
      console.error("Unknown error fetching balances:", err);
    }
    return {};
  }
};

export const wallet = kit;
