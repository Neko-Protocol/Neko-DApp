// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {DataTypes} from "../libraries/DataTypes.sol";

/**
 * @title ILendingPool
 * @notice Interface for the main RWA Lending Pool contract
 */
interface ILendingPool {
    // ============ Events ============

    /// @notice Emitted when collateral is deposited
    event CollateralDeposited(
        address indexed user,
        address indexed asset,
        uint256 amount,
        uint256 oTokensMinted
    );

    /// @notice Emitted when collateral is withdrawn
    event CollateralWithdrawn(
        address indexed user,
        address indexed asset,
        uint256 amount,
        uint256 oTokensBurned
    );

    /// @notice Emitted when stablecoins are supplied for lending
    event Supplied(
        address indexed user,
        address indexed asset,
        uint256 amount
    );

    /// @notice Emitted when a user borrows
    event Borrowed(
        address indexed user,
        address indexed asset,
        uint256 amount,
        uint256 borrowRate
    );

    /// @notice Emitted when a user repays
    event Repaid(
        address indexed user,
        address indexed asset,
        uint256 amount,
        uint256 remainingDebt
    );

    /// @notice Emitted when a position is liquidated
    event Liquidated(
        address indexed liquidator,
        address indexed user,
        address indexed collateralAsset,
        address debtAsset,
        uint256 debtRepaid,
        uint256 collateralSeized
    );

    /// @notice Emitted when emergency liquidation occurs using backstop
    event EmergencyLiquidated(
        address indexed liquidator,
        address indexed user,
        address indexed collateralAsset,
        address debtAsset,
        uint256 debtToCover,
        uint256 collateralSeized
    );

    /// @notice Emitted when interest is accrued
    event InterestAccrued(
        address indexed asset,
        uint256 newBorrowIndex,
        uint256 newSupplyIndex
    );

    // ============ Collateral Functions ============

    /**
     * @notice Deposit Ondo RWA tokens as collateral
     * @param asset Address of the collateral token (e.g., TSLAon)
     * @param amount Amount to deposit
     */
    function depositCollateral(address asset, uint256 amount) external;

    /**
     * @notice Withdraw collateral
     * @param asset Address of the collateral token
     * @param amount Amount to withdraw
     */
    function withdrawCollateral(address asset, uint256 amount) external;

    /**
     * @notice Enable/disable a collateral asset for borrowing against
     * @param asset Address of the collateral token
     * @param enabled Whether to enable or disable
     */
    function setCollateralEnabled(address asset, bool enabled) external;

    // ============ Supply Functions ============

    /**
     * @notice Supply stablecoins to earn interest
     * @param asset Address of the stablecoin (e.g., USDC)
     * @param amount Amount to supply
     */
    function supply(address asset, uint256 amount) external;

    /**
     * @notice Withdraw supplied stablecoins
     * @param asset Address of the stablecoin
     * @param amount Amount to withdraw
     */
    function withdrawSupply(address asset, uint256 amount) external;

    // ============ Borrow Functions ============

    /**
     * @notice Borrow stablecoins against collateral
     * @param asset Address of the stablecoin to borrow
     * @param amount Amount to borrow
     */
    function borrow(address asset, uint256 amount) external;

    /**
     * @notice Repay borrowed stablecoins
     * @param asset Address of the stablecoin
     * @param amount Amount to repay (use type(uint256).max for full repay)
     */
    function repay(address asset, uint256 amount) external;

    // ============ Liquidation Functions ============

    /**
     * @notice Liquidate an undercollateralized position
     * @param user Address of the user to liquidate
     * @param collateralAsset Address of the collateral to seize
     * @param debtAsset Address of the debt to repay
     * @param debtToCover Amount of debt to cover
     */
    function liquidate(
        address user,
        address collateralAsset,
        address debtAsset,
        uint256 debtToCover
    ) external;

    // ============ View Functions ============

    /**
     * @notice Get user's health factor
     * @param user Address of the user
     * @return Health factor in WAD (1e18 = 1.0, below 1.0 = liquidatable)
     */
    function getHealthFactor(address user) external view returns (uint256);

    /**
     * @notice Get user's total collateral value in USD
     * @param user Address of the user
     * @return Total collateral value in USD (8 decimals)
     */
    function getUserCollateralValue(address user) external view returns (uint256);

    /**
     * @notice Get user's total debt value in USD
     * @param user Address of the user
     * @return Total debt value in USD (8 decimals)
     */
    function getUserDebtValue(address user) external view returns (uint256);

    /**
     * @notice Get user's maximum borrowable amount for an asset
     * @param user Address of the user
     * @param asset Address of the asset to borrow
     * @return Maximum borrowable amount
     */
    function getMaxBorrowable(address user, address asset) external view returns (uint256);

    /**
     * @notice Get collateral configuration
     * @param asset Address of the collateral
     * @return CollateralConfig struct
     */
    function getCollateralConfig(address asset) external view returns (DataTypes.CollateralConfig memory);

    /**
     * @notice Get borrow configuration
     * @param asset Address of the borrowable asset
     * @return BorrowConfig struct
     */
    function getBorrowConfig(address asset) external view returns (DataTypes.BorrowConfig memory);

    /**
     * @notice Get user's collateral balance for an asset
     * @param user Address of the user
     * @param asset Address of the collateral
     * @return Amount of collateral
     */
    function getUserCollateral(address user, address asset) external view returns (uint256);

    /**
     * @notice Get user's debt balance for an asset (including interest)
     * @param user Address of the user
     * @param asset Address of the debt asset
     * @return Amount of debt including accrued interest
     */
    function getUserDebt(address user, address asset) external view returns (uint256);

    /**
     * @notice Get current borrow rate for an asset
     * @param asset Address of the borrowable asset
     * @return Current borrow rate in RAY (1e27)
     */
    function getBorrowRate(address asset) external view returns (uint256);

    /**
     * @notice Get current supply rate for an asset
     * @param asset Address of the borrowable asset
     * @return Current supply rate in RAY (1e27)
     */
    function getSupplyRate(address asset) external view returns (uint256);
}

