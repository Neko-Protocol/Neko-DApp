// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title Errors
 * @notice Library containing all custom errors for the RWA Lending protocol
 */
library Errors {
    // General errors
    error ZeroAddress();
    error ZeroAmount();
    error InvalidAmount();
    error InvalidInput();
    error Unauthorized();
    error Paused();

    // Collateral errors
    error CollateralNotActive();
    error CollateralFrozen();
    error CollateralNotEnabled();
    error InsufficientCollateral();
    error CollateralAlreadyExists();
    error CollateralNotSupported();

    // Borrow errors
    error BorrowNotActive();
    error BorrowFrozen();
    error InsufficientBorrowCapacity();
    error InsufficientLiquidity();
    error BorrowAssetNotSupported();
    error NoBorrowPosition();

    // Liquidation errors
    error PositionHealthy();
    error InvalidLiquidationAmount();
    error LiquidationNotProfitable();

    // Interest errors
    error InvalidInterestRate();
    error InterestAccrualFailed();

    // Oracle errors
    error InvalidPrice();
    error StalePrice();
    error OracleNotSet();

    // Token errors
    error TransferFailed();
    error ApprovalFailed();
    error InsufficientBalance();
    error DebtTokenNotTransferable();

    // Configuration errors
    error InvalidLTV();
    error InvalidLiquidationThreshold();
    error InvalidLiquidationBonus();
    error LTVExceedsLiquidationThreshold();
}

