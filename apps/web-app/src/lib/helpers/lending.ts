/**
 * Lending Helper Functions
 * Wrapper around Lending Service for backward compatibility
 */

import { lendingService } from "../services";

/**
 * Approve token contract to spend tokens on behalf of the user
 */
export const approveToken = async (
  tokenContractAddress: string,
  spenderAddress: string,
  amount: string,
  decimals: number = 7,
  walletAddress: string
): Promise<string> => {
  const result = await lendingService.approveToken(
    tokenContractAddress,
    spenderAddress,
    amount,
    decimals,
    walletAddress
  );

  if (result.error) {
    throw new Error(result.error);
  }

  return result.xdr;
};

/**
 * Deposit tokens to the lending pool
 */
export const depositToPool = async (
  assetCode: string,
  amount: string,
  decimals: number = 7,
  walletAddress: string
): Promise<string> => {
  const result = await lendingService.depositToPool(
    assetCode,
    amount,
    decimals,
    walletAddress
  );

  if (result.error) {
    throw new Error(result.error);
  }

  return result.xdr;
};

/**
 * Withdraw tokens from the lending pool
 */
export const withdrawFromPool = async (
  assetCode: string,
  bTokens: string,
  decimals: number = 7,
  walletAddress: string
): Promise<string> => {
  const result = await lendingService.withdrawFromPool(
    assetCode,
    bTokens,
    decimals,
    walletAddress
  );

  if (result.error) {
    throw new Error(result.error);
  }

  return result.xdr;
};

/**
 * Get bToken balance for a user
 */
export const getBTokenBalance = async (
  assetCode: string,
  walletAddress: string,
  decimals: number = 7
): Promise<string> => {
  return lendingService.getBTokenBalance(assetCode, walletAddress, decimals);
};

/**
 * Borrow tokens from the lending pool with collateral and approve
 * Returns three separate transactions that need to be executed sequentially:
 * 1. approve
 * 2. add_collateral
 * 3. borrow
 *
 * This is necessary because Stellar/Soroban doesn't support multiple contract
 * operations in a single transaction with prepareTransaction.
 */
export const borrowWithCollateral = async (
  rwaTokenContract: string,
  collateralAmount: string,
  collateralDecimals: number,
  assetCode: string,
  borrowAmount: string,
  borrowDecimals: number = 7,
  walletAddress: string
): Promise<{
  approveXdr: string;
  addCollateralXdr: string;
  borrowXdr: string;
}> => {
  const result = await lendingService.borrowWithCollateral(
    rwaTokenContract,
    collateralAmount,
    collateralDecimals,
    assetCode,
    borrowAmount,
    borrowDecimals,
    walletAddress
  );

  if (result.error) {
    throw new Error(result.error);
  }

  return {
    approveXdr: result.approveXdr,
    addCollateralXdr: result.addCollateralXdr,
    borrowXdr: result.borrowXdr,
  };
};

/**
 * Borrow tokens from the lending pool
 * Note: Use borrowWithCollateral if you need to add collateral in the same transaction
 */
export const borrowFromPool = async (
  assetCode: string,
  amount: string,
  decimals: number = 7,
  walletAddress: string
): Promise<string> => {
  const result = await lendingService.borrowFromPool(
    assetCode,
    amount,
    decimals,
    walletAddress
  );

  if (result.error) {
    throw new Error(result.error);
  }

  return result.xdr;
};

/**
 * Get borrow limit for a user
 */
export const getBorrowLimit = async (
  walletAddress: string
): Promise<string> => {
  return lendingService.getBorrowLimit(walletAddress);
};

/**
 * Add collateral with approve - returns two separate transactions
 * This is necessary because Stellar/Soroban doesn't support multiple contract
 * operations in a single transaction with prepareTransaction.
 * Returns: { approveXdr: string, addCollateralXdr: string }
 */
export const addCollateralWithApprove = async (
  rwaTokenContract: string,
  amount: string,
  decimals: number = 7,
  walletAddress: string
): Promise<{ approveXdr: string; addCollateralXdr: string }> => {
  const result = await lendingService.addCollateralWithApprove(
    rwaTokenContract,
    amount,
    decimals,
    walletAddress
  );

  if (result.error) {
    throw new Error(result.error);
  }

  return {
    approveXdr: result.approveXdr,
    addCollateralXdr: result.addCollateralXdr,
  };
};

/**
 * Add RWA token collateral to the lending pool
 * Returns the XDR for the add_collateral transaction
 * Note: The caller must first approve the token before calling this
 * @deprecated Use addCollateralWithApprove instead for a single transaction
 */
export const buildAddCollateralTransaction = async (
  rwaTokenContract: string,
  amount: string,
  decimals: number = 7,
  walletAddress: string
): Promise<string> => {
  const result = await lendingService.addCollateral(
    rwaTokenContract,
    amount,
    decimals,
    walletAddress
  );

  if (result.error) {
    throw new Error(result.error);
  }

  return result.xdr;
};

/**
 * Get collateral balance for a user and RWA token
 */
export const getCollateral = async (
  rwaTokenContract: string,
  walletAddress: string,
  decimals: number = 7
): Promise<string> => {
  return lendingService.getCollateral(
    rwaTokenContract,
    walletAddress,
    decimals
  );
};
