// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title DataTypes
 * @notice Library containing all data structures used in the RWA Lending protocol
 */
library DataTypes {
    /// @notice Configuration for a collateral asset (Ondo RWA tokens)
    struct CollateralConfig {
        /// @notice Loan-to-Value ratio in basis points (e.g., 5000 = 50%)
        uint256 ltv;
        /// @notice Liquidation threshold in basis points (e.g., 6500 = 65%)
        uint256 liquidationThreshold;
        /// @notice Liquidation bonus in basis points (e.g., 1000 = 10%)
        uint256 liquidationBonus;
        /// @notice Number of decimals for the asset
        uint8 decimals;
        /// @notice Whether the asset is active as collateral
        bool isActive;
        /// @notice Whether the asset is frozen (no new deposits)
        bool isFrozen;
        /// @notice Address of the OToken for this collateral
        address oTokenAddress;
    }

    /// @notice Configuration for a borrowable asset (stablecoins)
    struct BorrowConfig {
        /// @notice Base interest rate in basis points per year
        uint256 baseRate;
        /// @notice Slope 1 - rate increase per utilization up to optimal
        uint256 slope1;
        /// @notice Slope 2 - rate increase per utilization above optimal
        uint256 slope2;
        /// @notice Optimal utilization in basis points
        uint256 optimalUtilization;
        /// @notice Number of decimals for the asset
        uint8 decimals;
        /// @notice Whether the asset is active for borrowing
        bool isActive;
        /// @notice Whether the asset is frozen (no new borrows)
        bool isFrozen;
        /// @notice Address of the DebtToken for this borrow asset
        address debtTokenAddress;
        /// @notice Total amount deposited (for lending)
        uint256 totalDeposits;
        /// @notice Total amount borrowed
        uint256 totalBorrows;
        /// @notice Last update timestamp for interest accrual
        uint256 lastUpdateTimestamp;
        /// @notice Accumulated borrow index (for interest calculation)
        uint256 borrowIndex;
        /// @notice Accumulated supply index (for lender interest)
        uint256 supplyIndex;
    }

    /// @notice User's collateral position
    struct UserCollateral {
        /// @notice Amount of collateral deposited
        uint256 amount;
        /// @notice Whether this collateral is enabled for borrowing against
        bool isEnabled;
    }

    /// @notice User's borrow position
    struct UserBorrow {
        /// @notice Borrow index at time of borrow (for interest calculation)
        uint256 borrowIndex;
        /// @notice Principal amount borrowed
        uint256 principal;
    }

    /// @notice Reserve data for stablecoins (lendable assets)
    struct ReserveData {
        /// @notice Configuration for this reserve
        BorrowConfig config;
        /// @notice Address of the underlying asset
        address underlyingAsset;
    }

    /// @notice Liquidation parameters
    struct LiquidationParams {
        /// @notice User being liquidated
        address user;
        /// @notice Collateral asset to seize
        address collateralAsset;
        /// @notice Debt asset to repay
        address debtAsset;
        /// @notice Amount of debt to repay
        uint256 debtToCover;
    }
}

