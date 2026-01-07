// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IPriceOracle
 * @notice Interface for the price oracle used to get asset prices
 * @dev Integrates with Chainlink price feeds for RWA token prices
 */
interface IPriceOracle {
    // ============ Events ============

    /// @notice Emitted when a price feed is set for an asset
    event PriceFeedSet(address indexed asset, address indexed priceFeed);

    /// @notice Emitted when the fallback oracle is set
    event FallbackOracleSet(address indexed fallbackOracle);

    // ============ Functions ============

    /**
     * @notice Get the price of an asset in USD
     * @param asset Address of the asset
     * @return Price in USD with 8 decimals (Chainlink standard)
     */
    function getAssetPrice(address asset) external view returns (uint256);

    /**
     * @notice Get multiple asset prices at once
     * @param assets Array of asset addresses
     * @return Array of prices in USD with 8 decimals
     */
    function getAssetsPrices(address[] calldata assets) external view returns (uint256[] memory);

    /**
     * @notice Get the price feed address for an asset
     * @param asset Address of the asset
     * @return Address of the Chainlink price feed
     */
    function getSourceOfAsset(address asset) external view returns (address);

    /**
     * @notice Get the fallback oracle address
     * @return Address of the fallback oracle
     */
    function getFallbackOracle() external view returns (address);

    /**
     * @notice Set the price feed for an asset (admin only)
     * @param asset Address of the asset
     * @param priceFeed Address of the Chainlink price feed
     */
    function setAssetSource(address asset, address priceFeed) external;

    /**
     * @notice Set multiple price feeds at once (admin only)
     * @param assets Array of asset addresses
     * @param priceFeeds Array of Chainlink price feed addresses
     */
    function setAssetSources(address[] calldata assets, address[] calldata priceFeeds) external;

    /**
     * @notice Set the fallback oracle (admin only)
     * @param fallbackOracle Address of the fallback oracle
     */
    function setFallbackOracle(address fallbackOracle) external;
}

