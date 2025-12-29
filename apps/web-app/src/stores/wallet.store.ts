// Zustand store for wallet state
// Only for connected wallet information, not protocol data
import { create } from "zustand";

interface WalletState {
  address?: string;
  network?: string;
  isConnected: boolean;
  setWallet: (address?: string, network?: string) => void;
  disconnect: () => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  address: undefined,
  network: undefined,
  isConnected: false,
  setWallet: (address, network) =>
    set({ address, network, isConnected: Boolean(address) }),
  disconnect: () =>
    set({ address: undefined, network: undefined, isConnected: false }),
}));
