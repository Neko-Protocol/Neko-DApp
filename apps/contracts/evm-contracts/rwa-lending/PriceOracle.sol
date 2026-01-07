// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IPriceOracle} from "./interfaces/IPriceOracle.sol";
import {Errors} from "./libraries/Errors.sol";

/**
 * @title AggregatorV3Interface
 * @notice Chainlink price feed interface
 */
interface AggregatorV3Interface {
    function decimals() external view returns (uint8);
    function description() external view returns (string memory);
    function version() external view returns (uint256);

    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
}

/**
 * @title PriceOracle
 * @notice Oracle contract for getting asset prices from Chainlink
 * @dev Integrates with Chainlink price feeds for RWA token prices
 */
contract PriceOracle is IPriceOracle, Ownable {
    /// @notice Mapping of asset addresses to their Chainlink price feed addresses
    mapping(address => address) private assetSources;

    /// @notice Fallback oracle address
    address private fallbackOracle;

    /// @notice Maximum staleness for price feeds (1 hour)
    uint256 public constant MAX_PRICE_STALENESS = 1 hours;

    /// @notice Price decimals (Chainlink standard is 8)
    uint256 public constant PRICE_DECIMALS = 8;

    // ============ Constructor ============

    constructor() Ownable() {}

    // ============ Admin Functions ============

    /**
     * @notice Set the price feed for a single asset
     * @param asset Address of the asset
     * @param priceFeed Address of the Chainlink price feed
     */
    function setAssetSource(address asset, address priceFeed) external override onlyOwner {
        if (asset == address(0)) revert Errors.ZeroAddress();
        if (priceFeed == address(0)) revert Errors.ZeroAddress();

        assetSources[asset] = priceFeed;

        emit PriceFeedSet(asset, priceFeed);
    }

    /**
     * @notice Set price feeds for multiple assets
     * @param assets Array of asset addresses
     * @param priceFeeds Array of Chainlink price feed addresses
     */
    function setAssetSources(
        address[] calldata assets,
        address[] calldata priceFeeds
    ) external override onlyOwner {
        require(assets.length == priceFeeds.length, "Arrays length mismatch");

        for (uint256 i = 0; i < assets.length; i++) {
            if (assets[i] == address(0)) revert Errors.ZeroAddress();
            if (priceFeeds[i] == address(0)) revert Errors.ZeroAddress();

            assetSources[assets[i]] = priceFeeds[i];

            emit PriceFeedSet(assets[i], priceFeeds[i]);
        }
    }

    /**
     * @notice Set the fallback oracle
     * @param _fallbackOracle Address of the fallback oracle
     */
    function setFallbackOracle(address _fallbackOracle) external override onlyOwner {
        fallbackOracle = _fallbackOracle;

        emit FallbackOracleSet(_fallbackOracle);
    }

    // ============ View Functions ============

    /**
     * @notice Get the price of an asset in USD
     * @param asset Address of the asset
     * @return Price in USD with 8 decimals
     */
    function getAssetPrice(address asset) public view override returns (uint256) {
        address source = assetSources[asset];

        if (source == address(0)) {
            // Try fallback oracle
            if (fallbackOracle != address(0)) {
                return IPriceOracle(fallbackOracle).getAssetPrice(asset);
            }
            revert Errors.OracleNotSet();
        }

        (
            uint80 roundId,
            int256 answer,
            ,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = AggregatorV3Interface(source).latestRoundData();

        // Validate price
        if (answer <= 0) revert Errors.InvalidPrice();
        if (updatedAt == 0) revert Errors.StalePrice();
        if (block.timestamp - updatedAt > MAX_PRICE_STALENESS) revert Errors.StalePrice();
        if (answeredInRound < roundId) revert Errors.StalePrice();

        // Normalize to 8 decimals if needed
        uint8 feedDecimals = AggregatorV3Interface(source).decimals();
        if (feedDecimals == 8) {
            return uint256(answer);
        } else if (feedDecimals < 8) {
            return uint256(answer) * (10 ** (8 - feedDecimals));
        } else {
            return uint256(answer) / (10 ** (feedDecimals - 8));
        }
    }

    /**
     * @notice Get multiple asset prices at once
     * @param assets Array of asset addresses
     * @return prices Array of prices in USD with 8 decimals
     */
    function getAssetsPrices(address[] calldata assets) external view override returns (uint256[] memory prices) {
        prices = new uint256[](assets.length);

        for (uint256 i = 0; i < assets.length; i++) {
            prices[i] = getAssetPrice(assets[i]);
        }

        return prices;
    }

    /**
     * @notice Get the price feed address for an asset
     * @param asset Address of the asset
     * @return Address of the Chainlink price feed
     */
    function getSourceOfAsset(address asset) external view override returns (address) {
        return assetSources[asset];
    }

    /**
     * @notice Get the fallback oracle address
     * @return Address of the fallback oracle
     */
    function getFallbackOracle() external view override returns (address) {
        return fallbackOracle;
    }
}

/**
 * @title MockPriceOracle
 * @notice Mock oracle for testing - allows setting arbitrary prices
 * @dev DO NOT USE IN PRODUCTION
 */
contract MockPriceOracle is IPriceOracle, Ownable {
    /// @notice Mapping of asset addresses to their prices (8 decimals)
    mapping(address => uint256) private assetPrices;

    constructor() Ownable() {}

    /**
     * @notice Set the price for an asset (for testing)
     * @param asset Address of the asset
     * @param price Price in USD with 8 decimals
     */
    function setAssetPrice(address asset, uint256 price) external onlyOwner {
        assetPrices[asset] = price;
    }

    /**
     * @notice Set prices for multiple assets (for testing)
     * @param assets Array of asset addresses
     * @param prices Array of prices in USD with 8 decimals
     */
    function setAssetPrices(address[] calldata assets, uint256[] calldata prices) external onlyOwner {
        require(assets.length == prices.length, "Arrays length mismatch");

        for (uint256 i = 0; i < assets.length; i++) {
            assetPrices[assets[i]] = prices[i];
        }
    }

    function getAssetPrice(address asset) external view override returns (uint256) {
        uint256 price = assetPrices[asset];
        if (price == 0) revert Errors.InvalidPrice();
        return price;
    }

    function getAssetsPrices(address[] calldata assets) external view override returns (uint256[] memory prices) {
        prices = new uint256[](assets.length);
        for (uint256 i = 0; i < assets.length; i++) {
            prices[i] = assetPrices[assets[i]];
        }
        return prices;
    }

    function getSourceOfAsset(address) external pure override returns (address) {
        return address(0);
    }

    function getFallbackOracle() external pure override returns (address) {
        return address(0);
    }

    function setAssetSource(address asset, address) external override {
        // No-op for mock
    }

    function setAssetSources(address[] calldata, address[] calldata) external override {
        // No-op for mock
    }

    function setFallbackOracle(address) external override {
        // No-op for mock
    }
}

