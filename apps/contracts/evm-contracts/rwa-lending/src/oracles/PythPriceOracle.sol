// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IPriceOracle} from "../interfaces/IPriceOracle.sol";
import {Errors} from "../libraries/Errors.sol";
import {IPyth} from "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import {PythStructs} from "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";
import {PythUtils} from "@pythnetwork/pyth-sdk-solidity/PythUtils.sol";

/**
 * @title PythPriceOracle
 * @notice Oracle contract for getting asset prices from Pyth Network
 * @dev Integrates with Pyth Network price feeds for RWA token prices
 */
contract PythPriceOracle is IPriceOracle, Ownable {
    /// @notice Pyth Network contract address
    IPyth public immutable pyth;

    /// @notice Mapping of asset addresses to their Pyth price feed IDs
    mapping(address => bytes32) private assetPriceIds;

    /// @notice Fallback oracle address
    address private fallbackOracle;

    /// @notice Maximum staleness for price feeds (1 hour)
    uint256 public constant MAX_PRICE_STALENESS = 3600; // 1 hour in seconds

    /// @notice Price decimals (8 decimals standard)
    uint256 public constant PRICE_DECIMALS = 8;

    // ============ Constructor ============

    /**
     * @notice Constructor
     * @param _pyth Address of the Pyth Network contract
     * @dev Pyth contract addresses: https://docs.pyth.network/price-feeds/contract-addresses/evm
     */
    constructor(address _pyth) Ownable(msg.sender) {
        if (_pyth == address(0)) revert Errors.ZeroAddress();
        pyth = IPyth(_pyth);
    }

    // ============ Admin Functions ============

    /**
     * @notice Set the Pyth price feed ID for a single asset
     * @param asset Address of the asset
     * @param priceId Pyth price feed ID (bytes32)
     * @dev Price feed IDs: https://pyth.network/developers/price-feed-ids
     */
    function setAssetSource(address asset, address priceId) external override onlyOwner {
        // Note: IPriceOracle interface uses address for priceFeed, but we need bytes32
        // We'll use a different function for setting Pyth price IDs
        revert("Use setAssetPriceId instead");
    }

    /**
     * @notice Set the Pyth price feed ID for a single asset
     * @param asset Address of the asset
     * @param priceId Pyth price feed ID (bytes32)
     */
    function setAssetPriceId(address asset, bytes32 priceId) external onlyOwner {
        if (asset == address(0)) revert Errors.ZeroAddress();
        if (priceId == bytes32(0)) revert Errors.InvalidInput();

        assetPriceIds[asset] = priceId;

        emit PriceFeedSet(asset, address(uint160(uint256(priceId))));
    }

    /**
     * @notice Set Pyth price feed IDs for multiple assets
     * @param assets Array of asset addresses
     * @param priceIds Array of Pyth price feed IDs
     */
    function setAssetPriceIds(
        address[] calldata assets,
        bytes32[] calldata priceIds
    ) external onlyOwner {
        require(assets.length == priceIds.length, "Arrays length mismatch");

        for (uint256 i = 0; i < assets.length; i++) {
            if (assets[i] == address(0)) revert Errors.ZeroAddress();
            if (priceIds[i] == bytes32(0)) revert Errors.InvalidInput();

            assetPriceIds[assets[i]] = priceIds[i];

            emit PriceFeedSet(assets[i], address(uint160(uint256(priceIds[i]))));
        }
    }

    /**
     * @notice Set multiple price feeds (for interface compatibility)
     * @param assets Array of asset addresses
     * @param priceFeeds Array of addresses (not used, kept for interface compatibility)
     */
    function setAssetSources(
        address[] calldata assets,
        address[] calldata priceFeeds
    ) external override onlyOwner {
        // This function is kept for interface compatibility but should not be used
        // Use setAssetPriceIds instead
        revert("Use setAssetPriceIds instead");
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
     * @dev This function reads prices that have already been updated on-chain
     *      For fresh prices, use getAssetPriceWithUpdate
     */
    function getAssetPrice(address asset) public view override returns (uint256) {
        bytes32 priceId = assetPriceIds[asset];

        if (priceId == bytes32(0)) {
            // Try fallback oracle
            if (fallbackOracle != address(0)) {
                return IPriceOracle(fallbackOracle).getAssetPrice(asset);
            }
            revert Errors.OracleNotSet();
        }

        // Get price from Pyth (must be updated within MAX_PRICE_STALENESS)
        PythStructs.Price memory price = pyth.getPriceNoOlderThan(priceId, MAX_PRICE_STALENESS);

        // Validate price
        if (price.price <= 0) revert Errors.InvalidPrice();
        if (price.publishTime == 0) revert Errors.StalePrice();

        // Convert price to 8 decimals using PythUtils
        // Pyth prices typically have negative exponents (e.g., -8 for USD prices)
        uint256 priceIn8Decimals = PythUtils.convertToUint(price.price, price.expo, uint8(PRICE_DECIMALS));

        return priceIn8Decimals;
    }

    /**
     * @notice Get the price of an asset with on-chain price update
     * @param asset Address of the asset
     * @param priceUpdateData Encoded price update data from Pyth
     * @return Price in USD with 8 decimals
     * @dev Caller must pay the update fee (returned by getUpdateFee)
     */
    function getAssetPriceWithUpdate(
        address asset,
        bytes[] calldata priceUpdateData
    ) external payable returns (uint256) {
        bytes32 priceId = assetPriceIds[asset];

        if (priceId == bytes32(0)) {
            // Try fallback oracle
            if (fallbackOracle != address(0)) {
                return IPriceOracle(fallbackOracle).getAssetPrice(asset);
            }
            revert Errors.OracleNotSet();
        }

        // Calculate and pay update fee
        uint256 updateFee = pyth.getUpdateFee(priceUpdateData);
        require(msg.value >= updateFee, "Insufficient fee");

        // Update price feeds
        pyth.updatePriceFeeds{value: updateFee}(priceUpdateData);

        // Get fresh price (within 60 seconds)
        PythStructs.Price memory price = pyth.getPriceNoOlderThan(priceId, 60);

        // Validate price
        if (price.price <= 0) revert Errors.InvalidPrice();
        if (price.publishTime == 0) revert Errors.StalePrice();

        // Convert to 8 decimals
        uint256 priceIn8Decimals = PythUtils.convertToUint(price.price, price.expo, uint8(PRICE_DECIMALS));

        // Refund excess payment
        if (msg.value > updateFee) {
            payable(msg.sender).transfer(msg.value - updateFee);
        }

        return priceIn8Decimals;
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
     * @notice Get multiple asset prices with on-chain update
     * @param assets Array of asset addresses
     * @param priceUpdateData Encoded price update data from Pyth (must include all assets)
     * @return prices Array of prices in USD with 8 decimals
     */
    function getAssetsPricesWithUpdate(
        address[] calldata assets,
        bytes[] calldata priceUpdateData
    ) external payable returns (uint256[] memory prices) {
        // Calculate and pay update fee
        uint256 updateFee = pyth.getUpdateFee(priceUpdateData);
        require(msg.value >= updateFee, "Insufficient fee");

        // Update price feeds
        pyth.updatePriceFeeds{value: updateFee}(priceUpdateData);

        // Get prices
        prices = new uint256[](assets.length);
        for (uint256 i = 0; i < assets.length; i++) {
            bytes32 priceId = assetPriceIds[assets[i]];

            if (priceId == bytes32(0)) {
                if (fallbackOracle != address(0)) {
                    prices[i] = IPriceOracle(fallbackOracle).getAssetPrice(assets[i]);
                    continue;
                }
                revert Errors.OracleNotSet();
            }

            PythStructs.Price memory price = pyth.getPriceNoOlderThan(priceId, 60);

            if (price.price <= 0) revert Errors.InvalidPrice();
            if (price.publishTime == 0) revert Errors.StalePrice();

            prices[i] = PythUtils.convertToUint(price.price, price.expo, uint8(PRICE_DECIMALS));
        }

        // Refund excess payment
        if (msg.value > updateFee) {
            payable(msg.sender).transfer(msg.value - updateFee);
        }

        return prices;
    }

    /**
     * @notice Get the Pyth price feed ID for an asset
     * @param asset Address of the asset
     * @return priceId Pyth price feed ID (bytes32)
     */
    function getPriceIdOfAsset(address asset) external view returns (bytes32) {
        return assetPriceIds[asset];
    }

    /**
     * @notice Get the price feed address for an asset (for interface compatibility)
     * @param asset Address of the asset
     * @return Address representation of the price ID (for compatibility)
     */
    function getSourceOfAsset(address asset) external view override returns (address) {
        bytes32 priceId = assetPriceIds[asset];
        if (priceId == bytes32(0)) {
            return address(0);
        }
        return address(uint160(uint256(priceId)));
    }

    /**
     * @notice Get the fallback oracle address
     * @return Address of the fallback oracle
     */
    function getFallbackOracle() external view override returns (address) {
        return fallbackOracle;
    }

    /**
     * @notice Get the update fee for price feeds
     * @param priceUpdateData Encoded price update data
     * @return Fee required to update prices
     */
    function getUpdateFee(bytes[] calldata priceUpdateData) external view returns (uint256) {
        return pyth.getUpdateFee(priceUpdateData);
    }

    /**
     * @notice Withdraw excess ETH (from overpaid update fees)
     */
    function withdrawExcess() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    receive() external payable {}
}
