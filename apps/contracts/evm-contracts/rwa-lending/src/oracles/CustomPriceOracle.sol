// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IPriceOracle} from "../interfaces/IPriceOracle.sol";
import {Errors} from "../libraries/Errors.sol";

/**
 * @title AggregatorV3Interface
 * @notice Chainlink price feed interface
 */
interface AggregatorV3Interface {
    function decimals() external view returns (uint8);
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
 * @title CustomPriceOracle
 * @notice Hybrid oracle that supports both Chainlink feeds and manual price updates
 * @dev For tokens without Chainlink feeds, prices can be updated by authorized keepers
 */
contract CustomPriceOracle is IPriceOracle, Ownable {
    /// @notice Mapping of asset addresses to their Chainlink price feed addresses
    mapping(address => address) private chainlinkSources;

    /// @notice Mapping of asset addresses to their manual prices (for tokens without Chainlink)
    mapping(address => uint256) private manualPrices;

    /// @notice Mapping of asset addresses to their last update timestamp
    mapping(address => uint256) private lastUpdated;

    /// @notice Authorized price updaters (keepers)
    mapping(address => bool) public keepers;

    /// @notice Maximum staleness for Chainlink feeds (1 hour)
    uint256 public constant CHAINLINK_STALENESS = 1 hours;

    /// @notice Maximum staleness for manual prices (15 minutes)
    uint256 public constant MANUAL_STALENESS = 15 minutes;

    /// @notice Price decimals (8 decimals like Chainlink)
    uint256 public constant PRICE_DECIMALS = 8;

    // ============ Events ============

    event KeeperUpdated(address indexed keeper, bool authorized);
    event ManualPriceUpdated(address indexed asset, uint256 price, uint256 timestamp);

    // ============ Modifiers ============

    modifier onlyKeeper() {
        require(keepers[msg.sender] || msg.sender == owner(), "Not authorized keeper");
        _;
    }

    // ============ Constructor ============

    constructor() Ownable(msg.sender) {
        // Owner is automatically a keeper
        keepers[msg.sender] = true;
    }

    // ============ Admin Functions ============

    /**
     * @notice Add or remove a keeper
     * @param keeper Address of the keeper
     * @param authorized Whether to authorize or revoke
     */
    function setKeeper(address keeper, bool authorized) external onlyOwner {
        keepers[keeper] = authorized;
        emit KeeperUpdated(keeper, authorized);
    }

    /**
     * @notice Set Chainlink price feed for an asset
     */
    function setAssetSource(address asset, address priceFeed) external override onlyOwner {
        if (asset == address(0)) revert Errors.ZeroAddress();
        chainlinkSources[asset] = priceFeed;
        emit PriceFeedSet(asset, priceFeed);
    }

    /**
     * @notice Set multiple Chainlink price feeds
     */
    function setAssetSources(
        address[] calldata assets,
        address[] calldata priceFeeds
    ) external override onlyOwner {
        require(assets.length == priceFeeds.length, "Arrays length mismatch");
        for (uint256 i = 0; i < assets.length; i++) {
            if (assets[i] == address(0)) revert Errors.ZeroAddress();
            chainlinkSources[assets[i]] = priceFeeds[i];
            emit PriceFeedSet(assets[i], priceFeeds[i]);
        }
    }

    /**
     * @notice Set the fallback oracle (not used in this implementation)
     */
    function setFallbackOracle(address) external override onlyOwner {
        // Not implemented - we use manual prices instead
    }

    // ============ Keeper Functions ============

    /**
     * @notice Update price for an asset manually (for tokens without Chainlink)
     * @param asset Address of the asset
     * @param price Price in USD with 8 decimals
     */
    function updatePrice(address asset, uint256 price) external onlyKeeper {
        if (price == 0) revert Errors.InvalidPrice();
        
        manualPrices[asset] = price;
        lastUpdated[asset] = block.timestamp;

        emit ManualPriceUpdated(asset, price, block.timestamp);
    }

    /**
     * @notice Update prices for multiple assets
     * @param assets Array of asset addresses
     * @param prices Array of prices in USD with 8 decimals
     */
    function updatePrices(
        address[] calldata assets,
        uint256[] calldata prices
    ) external onlyKeeper {
        require(assets.length == prices.length, "Arrays length mismatch");

        for (uint256 i = 0; i < assets.length; i++) {
            if (prices[i] == 0) revert Errors.InvalidPrice();
            
            manualPrices[assets[i]] = prices[i];
            lastUpdated[assets[i]] = block.timestamp;

            emit ManualPriceUpdated(assets[i], prices[i], block.timestamp);
        }
    }

    // ============ View Functions ============

    /**
     * @notice Get the price of an asset in USD
     * @param asset Address of the asset
     * @return Price in USD with 8 decimals
     */
    function getAssetPrice(address asset) public view override returns (uint256) {
        // First, try Chainlink
        address chainlinkSource = chainlinkSources[asset];
        if (chainlinkSource != address(0)) {
            return _getChainlinkPrice(chainlinkSource);
        }

        // Fallback to manual price
        uint256 manualPrice = manualPrices[asset];
        if (manualPrice == 0) revert Errors.OracleNotSet();

        // Check staleness for manual prices
        uint256 lastUpdate = lastUpdated[asset];
        if (block.timestamp - lastUpdate > MANUAL_STALENESS) {
            revert Errors.StalePrice();
        }

        return manualPrice;
    }

    /**
     * @notice Get multiple asset prices at once
     */
    function getAssetsPrices(address[] calldata assets) external view override returns (uint256[] memory prices) {
        prices = new uint256[](assets.length);
        for (uint256 i = 0; i < assets.length; i++) {
            prices[i] = getAssetPrice(assets[i]);
        }
        return prices;
    }

    /**
     * @notice Get the Chainlink price feed address for an asset
     */
    function getSourceOfAsset(address asset) external view override returns (address) {
        return chainlinkSources[asset];
    }

    /**
     * @notice Get the fallback oracle address (not used)
     */
    function getFallbackOracle() external pure override returns (address) {
        return address(0);
    }

    /**
     * @notice Check if an asset uses Chainlink or manual pricing
     */
    function isChainlinkAsset(address asset) external view returns (bool) {
        return chainlinkSources[asset] != address(0);
    }

    /**
     * @notice Get manual price info for an asset
     */
    function getManualPriceInfo(address asset) external view returns (uint256 price, uint256 timestamp) {
        return (manualPrices[asset], lastUpdated[asset]);
    }

    // ============ Internal Functions ============

    function _getChainlinkPrice(address source) internal view returns (uint256) {
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
        if (block.timestamp - updatedAt > CHAINLINK_STALENESS) revert Errors.StalePrice();
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
}

