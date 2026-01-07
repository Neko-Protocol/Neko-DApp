// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ILendingPool} from "./interfaces/ILendingPool.sol";
import {IOToken} from "./interfaces/IOToken.sol";
import {IDebtToken} from "./interfaces/IDebtToken.sol";
import {IPriceOracle} from "./interfaces/IPriceOracle.sol";
import {IBackstop} from "./interfaces/IBackstop.sol";
import {DataTypes} from "./libraries/DataTypes.sol";
import {WadRayMath} from "./libraries/WadRayMath.sol";
import {Errors} from "./libraries/Errors.sol";
import {OToken} from "./tokens/OToken.sol";
import {DebtToken} from "./tokens/DebtToken.sol";

/**
 * @title LendingPool
 * @notice Main contract for the RWA Lending protocol
 * @dev Allows users to deposit Ondo RWA tokens as collateral and borrow stablecoins
 */
contract LendingPool is ILendingPool, ReentrancyGuard, Ownable {
    using WadRayMath for uint256;
    using SafeERC20 for IERC20;

    // ============ Constants ============

    /// @notice Basis points denominator (100%)
    uint256 public constant BASIS_POINTS = 10000;

    /// @notice Seconds per year for interest calculations
    uint256 public constant SECONDS_PER_YEAR = 365 days;

    /// @notice Initial index value (1.0 in RAY)
    uint256 public constant INITIAL_INDEX = WadRayMath.RAY;

    /// @notice Health factor threshold for liquidation (1.0 in WAD)
    uint256 public constant HEALTH_FACTOR_LIQUIDATION_THRESHOLD = 1e18;

    /// @notice Maximum liquidation close factor (50%)
    uint256 public constant MAX_LIQUIDATION_CLOSE_FACTOR = 5000;

    // ============ State Variables ============

    /// @notice Price oracle for asset valuation
    IPriceOracle public priceOracle;

    /// @notice Backstop contract for emergency liquidations
    IBackstop public backstop;

    /// @notice Whether the protocol is paused
    bool public paused;

    /// @notice List of supported collateral assets (Ondo RWA tokens)
    address[] public collateralAssets;

    /// @notice List of supported borrow assets (stablecoins)
    address[] public borrowAssets;

    /// @notice Collateral configurations by asset address
    mapping(address => DataTypes.CollateralConfig) public collateralConfigs;

    /// @notice Borrow configurations by asset address
    mapping(address => DataTypes.BorrowConfig) public borrowConfigs;

    /// @notice User collateral positions: user => asset => UserCollateral
    mapping(address => mapping(address => DataTypes.UserCollateral)) public userCollaterals;

    /// @notice User borrow positions: user => asset => UserBorrow
    mapping(address => mapping(address => DataTypes.UserBorrow)) public userBorrows;

    /// @notice User's list of collateral assets
    mapping(address => address[]) public userCollateralAssets;

    /// @notice User's list of borrowed assets
    mapping(address => address[]) public userBorrowAssets;

    // ============ Modifiers ============

    modifier whenNotPaused() {
        if (paused) revert Errors.Paused();
        _;
    }

    modifier onlyOwnerOrEmergencyAdmin() {
        require(
            msg.sender == owner() || 
            (address(backstop) != address(0) && backstop.isEmergencyAdmin(msg.sender)),
            "LendingPool: caller is not owner or emergency admin"
        );
        _;
    }

    // ============ Constructor ============

    /**
     * @notice Constructor
     * @param _priceOracle Address of the price oracle
     */
    constructor(address _priceOracle) Ownable() {
        if (_priceOracle == address(0)) revert Errors.ZeroAddress();
        priceOracle = IPriceOracle(_priceOracle);
    }

    // ============ Admin Functions ============

    /**
     * @notice Set the price oracle
     * @param _priceOracle New price oracle address
     */
    function setPriceOracle(address _priceOracle) external onlyOwner {
        if (_priceOracle == address(0)) revert Errors.ZeroAddress();
        priceOracle = IPriceOracle(_priceOracle);
    }

    /**
     * @notice Pause/unpause the protocol
     * @param _paused Whether to pause
     */
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }

    /**
     * @notice Set the backstop contract for emergency liquidations
     * @param _backstop Address of the backstop contract
     */
    function setBackstop(address _backstop) external onlyOwner {
        if (_backstop == address(0)) revert Errors.ZeroAddress();
        backstop = IBackstop(_backstop);
    }

    /**
     * @notice Add a new collateral asset (Ondo RWA token)
     * @param asset Address of the Ondo token
     * @param ltv Loan-to-value ratio in basis points
     * @param liquidationThreshold Liquidation threshold in basis points
     * @param liquidationBonus Liquidation bonus in basis points
     */
    function addCollateralAsset(
        address asset,
        uint256 ltv,
        uint256 liquidationThreshold,
        uint256 liquidationBonus
    ) external onlyOwner {
        if (asset == address(0)) revert Errors.ZeroAddress();
        if (collateralConfigs[asset].isActive) revert Errors.CollateralAlreadyExists();
        if (ltv > liquidationThreshold) revert Errors.LTVExceedsLiquidationThreshold();
        if (ltv > BASIS_POINTS) revert Errors.InvalidLTV();
        if (liquidationThreshold > BASIS_POINTS) revert Errors.InvalidLiquidationThreshold();

        // Deploy OToken for this collateral
        string memory name = string(abi.encodePacked("Ondo ", IERC20Metadata(asset).name(), " Collateral"));
        string memory symbol = string(abi.encodePacked("o", IERC20Metadata(asset).symbol()));

        OToken oToken = new OToken(address(this), asset, name, symbol);

        collateralConfigs[asset] = DataTypes.CollateralConfig({
            ltv: ltv,
            liquidationThreshold: liquidationThreshold,
            liquidationBonus: liquidationBonus,
            decimals: IERC20Metadata(asset).decimals(),
            isActive: true,
            isFrozen: false,
            oTokenAddress: address(oToken)
        });

        collateralAssets.push(asset);
    }

    /**
     * @notice Add a new borrowable asset (stablecoin)
     * @param asset Address of the stablecoin
     * @param baseRate Base interest rate in basis points per year
     * @param slope1 Interest rate slope 1
     * @param slope2 Interest rate slope 2
     * @param optimalUtilization Optimal utilization in basis points
     */
    function addBorrowAsset(
        address asset,
        uint256 baseRate,
        uint256 slope1,
        uint256 slope2,
        uint256 optimalUtilization
    ) external onlyOwner {
        if (asset == address(0)) revert Errors.ZeroAddress();
        if (borrowConfigs[asset].isActive) revert Errors.BorrowAssetNotSupported();

        // Deploy DebtToken for this asset
        string memory name = string(abi.encodePacked("Ondo ", IERC20Metadata(asset).name(), " Debt"));
        string memory symbol = string(abi.encodePacked("d", IERC20Metadata(asset).symbol()));

        DebtToken debtToken = new DebtToken(address(this), asset, name, symbol);

        borrowConfigs[asset] = DataTypes.BorrowConfig({
            baseRate: baseRate,
            slope1: slope1,
            slope2: slope2,
            optimalUtilization: optimalUtilization,
            decimals: IERC20Metadata(asset).decimals(),
            isActive: true,
            isFrozen: false,
            debtTokenAddress: address(debtToken),
            totalDeposits: 0,
            totalBorrows: 0,
            lastUpdateTimestamp: block.timestamp,
            borrowIndex: INITIAL_INDEX,
            supplyIndex: INITIAL_INDEX
        });

        borrowAssets.push(asset);
    }

    // ============ Collateral Functions ============

    /**
     * @notice Deposit Ondo RWA tokens as collateral
     * @param asset Address of the collateral token
     * @param amount Amount to deposit
     */
    function depositCollateral(address asset, uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert Errors.ZeroAmount();

        DataTypes.CollateralConfig storage config = collateralConfigs[asset];
        if (!config.isActive) revert Errors.CollateralNotActive();
        if (config.isFrozen) revert Errors.CollateralFrozen();

        // Transfer collateral from user
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);

        // Mint OTokens to user
        IOToken(config.oTokenAddress).mint(msg.sender, amount, INITIAL_INDEX);

        // Update user's collateral position
        DataTypes.UserCollateral storage userCollateral = userCollaterals[msg.sender][asset];
        if (userCollateral.amount == 0) {
            // First deposit of this asset
            userCollateralAssets[msg.sender].push(asset);
            userCollateral.isEnabled = true;
        }
        userCollateral.amount += amount;

        emit CollateralDeposited(msg.sender, asset, amount, amount);
    }

    /**
     * @notice Withdraw collateral
     * @param asset Address of the collateral token
     * @param amount Amount to withdraw
     */
    function withdrawCollateral(address asset, uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert Errors.ZeroAmount();

        DataTypes.CollateralConfig storage config = collateralConfigs[asset];
        if (!config.isActive) revert Errors.CollateralNotActive();

        DataTypes.UserCollateral storage userCollateral = userCollaterals[msg.sender][asset];
        if (amount > userCollateral.amount) revert Errors.InsufficientCollateral();

        // Check if withdrawal would make position unhealthy
        uint256 newHealthFactor = _calculateHealthFactorAfterWithdraw(msg.sender, asset, amount);
        if (newHealthFactor < HEALTH_FACTOR_LIQUIDATION_THRESHOLD) {
            revert Errors.InsufficientCollateral();
        }

        // Burn OTokens
        IOToken(config.oTokenAddress).burn(msg.sender, amount, INITIAL_INDEX);

        // Update user's collateral position
        userCollateral.amount -= amount;

        // Transfer collateral to user
        IERC20(asset).safeTransfer(msg.sender, amount);

        emit CollateralWithdrawn(msg.sender, asset, amount, amount);
    }

    /**
     * @notice Enable/disable a collateral asset for borrowing against
     * @param asset Address of the collateral token
     * @param enabled Whether to enable or disable
     */
    function setCollateralEnabled(address asset, bool enabled) external {
        DataTypes.UserCollateral storage userCollateral = userCollaterals[msg.sender][asset];
        if (userCollateral.amount == 0) revert Errors.InsufficientCollateral();

        // If disabling, check health factor
        if (!enabled) {
            uint256 healthFactor = _calculateHealthFactorWithoutCollateral(msg.sender, asset);
            if (healthFactor < HEALTH_FACTOR_LIQUIDATION_THRESHOLD) {
                revert Errors.InsufficientCollateral();
            }
        }

        userCollateral.isEnabled = enabled;
    }

    // ============ Supply Functions ============

    /**
     * @notice Supply stablecoins to earn interest
     * @param asset Address of the stablecoin
     * @param amount Amount to supply
     */
    function supply(address asset, uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert Errors.ZeroAmount();

        DataTypes.BorrowConfig storage config = borrowConfigs[asset];
        if (!config.isActive) revert Errors.BorrowNotActive();
        if (config.isFrozen) revert Errors.BorrowFrozen();

        // Accrue interest first
        _accrueInterest(asset);

        // Transfer stablecoins from user
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);

        // Update total deposits
        config.totalDeposits += amount;

        emit Supplied(msg.sender, asset, amount);
    }

    /**
     * @notice Withdraw supplied stablecoins
     * @param asset Address of the stablecoin
     * @param amount Amount to withdraw
     */
    function withdrawSupply(address asset, uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert Errors.ZeroAmount();

        DataTypes.BorrowConfig storage config = borrowConfigs[asset];
        if (!config.isActive) revert Errors.BorrowNotActive();

        // Accrue interest first
        _accrueInterest(asset);

        // Check available liquidity
        uint256 availableLiquidity = config.totalDeposits - config.totalBorrows;
        if (amount > availableLiquidity) revert Errors.InsufficientLiquidity();

        // Update total deposits
        config.totalDeposits -= amount;

        // Transfer stablecoins to user
        IERC20(asset).safeTransfer(msg.sender, amount);
    }

    // ============ Borrow Functions ============

    /**
     * @notice Borrow stablecoins against collateral
     * @param asset Address of the stablecoin to borrow
     * @param amount Amount to borrow
     */
    function borrow(address asset, uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert Errors.ZeroAmount();

        DataTypes.BorrowConfig storage config = borrowConfigs[asset];
        if (!config.isActive) revert Errors.BorrowNotActive();
        if (config.isFrozen) revert Errors.BorrowFrozen();

        // Accrue interest first
        _accrueInterest(asset);

        // Check if user can borrow this amount
        uint256 maxBorrowable = getMaxBorrowable(msg.sender, asset);
        if (amount > maxBorrowable) revert Errors.InsufficientBorrowCapacity();

        // Check liquidity
        uint256 availableLiquidity = config.totalDeposits - config.totalBorrows;
        if (amount > availableLiquidity) revert Errors.InsufficientLiquidity();

        // Mint debt tokens
        IDebtToken(config.debtTokenAddress).mint(msg.sender, amount, config.borrowIndex);

        // Update user borrow position
        DataTypes.UserBorrow storage userBorrow = userBorrows[msg.sender][asset];
        if (userBorrow.principal == 0) {
            userBorrowAssets[msg.sender].push(asset);
        }
        userBorrow.principal += amount;
        userBorrow.borrowIndex = config.borrowIndex;

        // Update total borrows
        config.totalBorrows += amount;

        // Transfer stablecoins to user
        IERC20(asset).safeTransfer(msg.sender, amount);

        uint256 borrowRate = _calculateBorrowRate(asset);
        emit Borrowed(msg.sender, asset, amount, borrowRate);
    }

    /**
     * @notice Repay borrowed stablecoins
     * @param asset Address of the stablecoin
     * @param amount Amount to repay (use type(uint256).max for full repay)
     */
    function repay(address asset, uint256 amount) external nonReentrant whenNotPaused {
        DataTypes.BorrowConfig storage config = borrowConfigs[asset];
        if (!config.isActive) revert Errors.BorrowNotActive();

        // Accrue interest first
        _accrueInterest(asset);

        // Get user's current debt
        uint256 currentDebt = getUserDebt(msg.sender, asset);
        if (currentDebt == 0) revert Errors.NoBorrowPosition();

        // If repaying max, use current debt
        uint256 repayAmount = amount == type(uint256).max ? currentDebt : amount;
        if (repayAmount > currentDebt) {
            repayAmount = currentDebt;
        }

        // Transfer stablecoins from user
        IERC20(asset).safeTransferFrom(msg.sender, address(this), repayAmount);

        // Burn debt tokens
        IDebtToken(config.debtTokenAddress).burn(msg.sender, repayAmount, config.borrowIndex);

        // Update user borrow position
        DataTypes.UserBorrow storage userBorrow = userBorrows[msg.sender][asset];
        if (repayAmount >= currentDebt) {
            userBorrow.principal = 0;
        } else {
            // Calculate new principal based on repayment
            uint256 principalRepaid = repayAmount.rayDiv(config.borrowIndex).rayMul(userBorrow.borrowIndex);
            if (principalRepaid > userBorrow.principal) {
                userBorrow.principal = 0;
            } else {
                userBorrow.principal -= principalRepaid;
            }
        }
        userBorrow.borrowIndex = config.borrowIndex;

        // Update total borrows
        config.totalBorrows -= repayAmount;

        emit Repaid(msg.sender, asset, repayAmount, currentDebt - repayAmount);
    }

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
    ) external nonReentrant whenNotPaused {
        if (debtToCover == 0) revert Errors.ZeroAmount();

        // Check if position is liquidatable
        if (getHealthFactor(user) >= HEALTH_FACTOR_LIQUIDATION_THRESHOLD) {
            revert Errors.PositionHealthy();
        }

        // Accrue interest
        _accrueInterest(debtAsset);

        // Limit debt to cover
        debtToCover = _limitDebtToCover(user, debtAsset, debtToCover);

        // Calculate and execute liquidation
        uint256 collateralToSeize = _calculateCollateralToSeize(
            collateralAsset, 
            debtAsset, 
            debtToCover
        );

        // Execute the liquidation transfers
        _executeLiquidation(user, collateralAsset, debtAsset, debtToCover, collateralToSeize);

        emit Liquidated(msg.sender, user, collateralAsset, debtAsset, debtToCover, collateralToSeize);
    }

    /**
     * @notice Limit debt to cover based on close factor
     */
    function _limitDebtToCover(
        address user,
        address debtAsset,
        uint256 debtToCover
    ) internal view returns (uint256) {
        uint256 userDebt = getUserDebt(user, debtAsset);
        uint256 maxLiquidatable = userDebt.percentMul(MAX_LIQUIDATION_CLOSE_FACTOR);
        return debtToCover > maxLiquidatable ? maxLiquidatable : debtToCover;
    }

    /**
     * @notice Calculate collateral to seize during liquidation
     */
    function _calculateCollateralToSeize(
        address collateralAsset,
        address debtAsset,
        uint256 debtToCover
    ) internal view returns (uint256) {
        uint256 debtAssetPrice = priceOracle.getAssetPrice(debtAsset);
        uint256 collateralPrice = priceOracle.getAssetPrice(collateralAsset);
        uint256 bonus = collateralConfigs[collateralAsset].liquidationBonus;

        uint256 collateralToSeize = (debtToCover * debtAssetPrice * (BASIS_POINTS + bonus)) 
            / (collateralPrice * BASIS_POINTS);

        // Adjust for decimals
        uint8 debtDecimals = borrowConfigs[debtAsset].decimals;
        uint8 collateralDecimals = collateralConfigs[collateralAsset].decimals;
        
        if (debtDecimals > collateralDecimals) {
            collateralToSeize = collateralToSeize / (10 ** (debtDecimals - collateralDecimals));
        } else if (collateralDecimals > debtDecimals) {
            collateralToSeize = collateralToSeize * (10 ** (collateralDecimals - debtDecimals));
        }

        return collateralToSeize;
    }

    /**
     * @notice Execute the liquidation transfers
     */
    function _executeLiquidation(
        address user,
        address collateralAsset,
        address debtAsset,
        uint256 debtToCover,
        uint256 collateralToSeize
    ) internal {
        // Cap collateral to seize at user's balance
        DataTypes.UserCollateral storage userCollateral = userCollaterals[user][collateralAsset];
        if (collateralToSeize > userCollateral.amount) {
            collateralToSeize = userCollateral.amount;
        }

        // Transfer debt from liquidator
        IERC20(debtAsset).safeTransferFrom(msg.sender, address(this), debtToCover);

        // Burn debt tokens and update state
        _updateDebtOnLiquidation(user, debtAsset, debtToCover);

        // Burn collateral tokens and update state
        _updateCollateralOnLiquidation(user, collateralAsset, collateralToSeize);

        // Transfer collateral to liquidator
        IERC20(collateralAsset).safeTransfer(msg.sender, collateralToSeize);
    }

    /**
     * @notice Update debt state during liquidation
     */
    function _updateDebtOnLiquidation(
        address user,
        address debtAsset,
        uint256 debtToCover
    ) internal {
        DataTypes.BorrowConfig storage borrowConfig = borrowConfigs[debtAsset];
        IDebtToken(borrowConfig.debtTokenAddress).burn(user, debtToCover, borrowConfig.borrowIndex);

        DataTypes.UserBorrow storage userBorrow = userBorrows[user][debtAsset];
        userBorrow.principal = userBorrow.principal > debtToCover ? userBorrow.principal - debtToCover : 0;

        borrowConfig.totalBorrows -= debtToCover;
    }

    /**
     * @notice Update collateral state during liquidation
     */
    function _updateCollateralOnLiquidation(
        address user,
        address collateralAsset,
        uint256 collateralToSeize
    ) internal {
        DataTypes.CollateralConfig storage collateralConfig = collateralConfigs[collateralAsset];
        IOToken(collateralConfig.oTokenAddress).burn(user, collateralToSeize, INITIAL_INDEX);

        userCollaterals[user][collateralAsset].amount -= collateralToSeize;
    }

    // ============ View Functions ============

    /**
     * @notice Get user's health factor
     * @param user Address of the user
     * @return Health factor in WAD (1e18 = 1.0)
     */
    function getHealthFactor(address user) public view override returns (uint256) {
        uint256 totalCollateralValueUsd = 0;
        uint256 totalBorrowValueUsd = 0;

        // Calculate total collateral value with liquidation threshold
        address[] memory userCollateralList = userCollateralAssets[user];
        for (uint256 i = 0; i < userCollateralList.length; i++) {
            address asset = userCollateralList[i];
            DataTypes.UserCollateral storage userCollateral = userCollaterals[user][asset];
            
            if (userCollateral.isEnabled && userCollateral.amount > 0) {
                DataTypes.CollateralConfig storage config = collateralConfigs[asset];
                uint256 price = priceOracle.getAssetPrice(asset);
                
                // Value in USD = amount * price / 10^decimals
                uint256 valueUsd = (userCollateral.amount * price) / (10 ** config.decimals);
                
                // Apply liquidation threshold
                totalCollateralValueUsd += valueUsd.percentMul(config.liquidationThreshold);
            }
        }

        // Calculate total borrow value
        address[] memory userBorrowList = userBorrowAssets[user];
        for (uint256 i = 0; i < userBorrowList.length; i++) {
            address asset = userBorrowList[i];
            uint256 debt = getUserDebt(user, asset);
            
            if (debt > 0) {
                DataTypes.BorrowConfig storage config = borrowConfigs[asset];
                uint256 price = priceOracle.getAssetPrice(asset);
                
                // Value in USD = debt * price / 10^decimals
                totalBorrowValueUsd += (debt * price) / (10 ** config.decimals);
            }
        }

        // If no borrows, health factor is infinite
        if (totalBorrowValueUsd == 0) {
            return type(uint256).max;
        }

        // Health Factor = totalCollateral / totalBorrow
        return totalCollateralValueUsd.wadDiv(totalBorrowValueUsd);
    }

    /**
     * @notice Get user's total collateral value in USD
     * @param user Address of the user
     * @return Total collateral value in USD (8 decimals - Chainlink standard)
     */
    function getUserCollateralValue(address user) external view override returns (uint256) {
        uint256 totalValue = 0;

        address[] memory userCollateralList = userCollateralAssets[user];
        for (uint256 i = 0; i < userCollateralList.length; i++) {
            address asset = userCollateralList[i];
            DataTypes.UserCollateral storage userCollateral = userCollaterals[user][asset];
            
            if (userCollateral.amount > 0) {
                DataTypes.CollateralConfig storage config = collateralConfigs[asset];
                uint256 price = priceOracle.getAssetPrice(asset);
                
                totalValue += (userCollateral.amount * price) / (10 ** config.decimals);
            }
        }

        return totalValue;
    }

    /**
     * @notice Get user's total debt value in USD
     * @param user Address of the user
     * @return Total debt value in USD (8 decimals)
     */
    function getUserDebtValue(address user) external view override returns (uint256) {
        uint256 totalValue = 0;

        address[] memory userBorrowList = userBorrowAssets[user];
        for (uint256 i = 0; i < userBorrowList.length; i++) {
            address asset = userBorrowList[i];
            uint256 debt = getUserDebt(user, asset);
            
            if (debt > 0) {
                DataTypes.BorrowConfig storage config = borrowConfigs[asset];
                uint256 price = priceOracle.getAssetPrice(asset);
                
                totalValue += (debt * price) / (10 ** config.decimals);
            }
        }

        return totalValue;
    }

    /**
     * @notice Get user's maximum borrowable amount for an asset
     * @param user Address of the user
     * @param asset Address of the asset to borrow
     * @return Maximum borrowable amount
     */
    function getMaxBorrowable(address user, address asset) public view override returns (uint256) {
        uint256 totalCollateralValueUsd = 0;
        uint256 totalBorrowValueUsd = 0;

        // Calculate total collateral value with LTV
        address[] memory userCollateralList = userCollateralAssets[user];
        for (uint256 i = 0; i < userCollateralList.length; i++) {
            address collateralAsset = userCollateralList[i];
            DataTypes.UserCollateral storage userCollateral = userCollaterals[user][collateralAsset];
            
            if (userCollateral.isEnabled && userCollateral.amount > 0) {
                DataTypes.CollateralConfig storage config = collateralConfigs[collateralAsset];
                uint256 price = priceOracle.getAssetPrice(collateralAsset);
                
                uint256 valueUsd = (userCollateral.amount * price) / (10 ** config.decimals);
                totalCollateralValueUsd += valueUsd.percentMul(config.ltv);
            }
        }

        // Calculate current borrow value
        address[] memory userBorrowList = userBorrowAssets[user];
        for (uint256 i = 0; i < userBorrowList.length; i++) {
            address borrowAsset = userBorrowList[i];
            uint256 debt = getUserDebt(user, borrowAsset);
            
            if (debt > 0) {
                DataTypes.BorrowConfig storage config = borrowConfigs[borrowAsset];
                uint256 price = priceOracle.getAssetPrice(borrowAsset);
                
                totalBorrowValueUsd += (debt * price) / (10 ** config.decimals);
            }
        }

        // Available to borrow in USD
        if (totalCollateralValueUsd <= totalBorrowValueUsd) {
            return 0;
        }
        uint256 availableUsd = totalCollateralValueUsd - totalBorrowValueUsd;

        // Convert to asset amount
        DataTypes.BorrowConfig storage borrowConfig = borrowConfigs[asset];
        uint256 assetPrice = priceOracle.getAssetPrice(asset);
        
        return (availableUsd * (10 ** borrowConfig.decimals)) / assetPrice;
    }

    /**
     * @notice Get collateral configuration
     */
    function getCollateralConfig(address asset) external view override returns (DataTypes.CollateralConfig memory) {
        return collateralConfigs[asset];
    }

    /**
     * @notice Get borrow configuration
     */
    function getBorrowConfig(address asset) external view override returns (DataTypes.BorrowConfig memory) {
        return borrowConfigs[asset];
    }

    /**
     * @notice Get user's collateral balance for an asset
     */
    function getUserCollateral(address user, address asset) external view override returns (uint256) {
        return userCollaterals[user][asset].amount;
    }

    /**
     * @notice Get user's debt balance for an asset (including interest)
     */
    function getUserDebt(address user, address asset) public view override returns (uint256) {
        DataTypes.UserBorrow storage userBorrow = userBorrows[user][asset];
        if (userBorrow.principal == 0) {
            return 0;
        }

        // Calculate current index
        uint256 currentIndex = _calculateCurrentBorrowIndex(asset);
        
        // Debt = principal * currentIndex / borrowIndex at time of borrow
        return userBorrow.principal.rayMul(currentIndex).rayDiv(userBorrow.borrowIndex);
    }

    /**
     * @notice Get current borrow rate for an asset
     */
    function getBorrowRate(address asset) external view override returns (uint256) {
        return _calculateBorrowRate(asset);
    }

    /**
     * @notice Get current supply rate for an asset
     */
    function getSupplyRate(address asset) external view override returns (uint256) {
        uint256 borrowRate = _calculateBorrowRate(asset);
        uint256 utilization = _calculateUtilization(asset);
        
        // Supply rate = borrow rate * utilization * (1 - reserve factor)
        // For simplicity, no reserve factor
        return borrowRate.rayMul(utilization);
    }

    // ============ Internal Functions ============

    /**
     * @notice Accrue interest for a borrowable asset
     */
    function _accrueInterest(address asset) internal {
        DataTypes.BorrowConfig storage config = borrowConfigs[asset];
        
        uint256 timeDelta = block.timestamp - config.lastUpdateTimestamp;
        if (timeDelta == 0) {
            return;
        }

        uint256 borrowRate = _calculateBorrowRate(asset);
        
        // Calculate interest factor: 1 + (rate * timeDelta / SECONDS_PER_YEAR)
        uint256 interestFactor = WadRayMath.RAY + (borrowRate * timeDelta / SECONDS_PER_YEAR);
        
        // Update borrow index
        config.borrowIndex = config.borrowIndex.rayMul(interestFactor);
        
        // Update supply index (proportional to utilization)
        uint256 utilization = _calculateUtilization(asset);
        uint256 supplyInterestFactor = WadRayMath.RAY + (borrowRate.rayMul(utilization) * timeDelta / SECONDS_PER_YEAR);
        config.supplyIndex = config.supplyIndex.rayMul(supplyInterestFactor);
        
        config.lastUpdateTimestamp = block.timestamp;

        emit InterestAccrued(asset, config.borrowIndex, config.supplyIndex);
    }

    /**
     * @notice Calculate current borrow index without updating state
     */
    function _calculateCurrentBorrowIndex(address asset) internal view returns (uint256) {
        DataTypes.BorrowConfig storage config = borrowConfigs[asset];
        
        uint256 timeDelta = block.timestamp - config.lastUpdateTimestamp;
        if (timeDelta == 0) {
            return config.borrowIndex;
        }

        uint256 borrowRate = _calculateBorrowRate(asset);
        uint256 interestFactor = WadRayMath.RAY + (borrowRate * timeDelta / SECONDS_PER_YEAR);
        
        return config.borrowIndex.rayMul(interestFactor);
    }

    /**
     * @notice Calculate utilization rate
     */
    function _calculateUtilization(address asset) internal view returns (uint256) {
        DataTypes.BorrowConfig storage config = borrowConfigs[asset];
        
        if (config.totalDeposits == 0) {
            return 0;
        }
        
        // Utilization in RAY
        return config.totalBorrows.rayDiv(config.totalDeposits);
    }

    /**
     * @notice Calculate borrow rate based on utilization
     */
    function _calculateBorrowRate(address asset) internal view returns (uint256) {
        DataTypes.BorrowConfig storage config = borrowConfigs[asset];
        
        uint256 utilization = _calculateUtilization(asset);
        uint256 optimalUtilizationRay = config.optimalUtilization * WadRayMath.RAY / BASIS_POINTS;
        
        if (utilization <= optimalUtilizationRay) {
            // Below optimal: base + slope1 * (utilization / optimal)
            return config.baseRate * WadRayMath.RAY / BASIS_POINTS 
                + config.slope1 * WadRayMath.RAY / BASIS_POINTS * utilization / optimalUtilizationRay;
        } else {
            // Above optimal: base + slope1 + slope2 * (utilization - optimal) / (1 - optimal)
            uint256 excessUtilization = utilization - optimalUtilizationRay;
            uint256 maxExcess = WadRayMath.RAY - optimalUtilizationRay;
            
            return config.baseRate * WadRayMath.RAY / BASIS_POINTS
                + config.slope1 * WadRayMath.RAY / BASIS_POINTS
                + config.slope2 * WadRayMath.RAY / BASIS_POINTS * excessUtilization / maxExcess;
        }
    }

    /**
     * @notice Calculate health factor after withdrawing collateral
     */
    function _calculateHealthFactorAfterWithdraw(
        address user,
        address asset,
        uint256 withdrawAmount
    ) internal view returns (uint256) {
        uint256 totalCollateralValueUsd = 0;
        uint256 totalBorrowValueUsd = 0;

        // Calculate collateral value, subtracting the withdrawal
        address[] memory userCollateralList = userCollateralAssets[user];
        for (uint256 i = 0; i < userCollateralList.length; i++) {
            address collateralAsset = userCollateralList[i];
            DataTypes.UserCollateral storage userCollateral = userCollaterals[user][collateralAsset];
            
            if (userCollateral.isEnabled && userCollateral.amount > 0) {
                DataTypes.CollateralConfig storage config = collateralConfigs[collateralAsset];
                uint256 price = priceOracle.getAssetPrice(collateralAsset);
                
                uint256 amount = userCollateral.amount;
                if (collateralAsset == asset) {
                    amount = amount > withdrawAmount ? amount - withdrawAmount : 0;
                }
                
                uint256 valueUsd = (amount * price) / (10 ** config.decimals);
                totalCollateralValueUsd += valueUsd.percentMul(config.liquidationThreshold);
            }
        }

        // Calculate borrow value
        address[] memory userBorrowList = userBorrowAssets[user];
        for (uint256 i = 0; i < userBorrowList.length; i++) {
            address borrowAsset = userBorrowList[i];
            uint256 debt = getUserDebt(user, borrowAsset);
            
            if (debt > 0) {
                DataTypes.BorrowConfig storage config = borrowConfigs[borrowAsset];
                uint256 price = priceOracle.getAssetPrice(borrowAsset);
                
                totalBorrowValueUsd += (debt * price) / (10 ** config.decimals);
            }
        }

        if (totalBorrowValueUsd == 0) {
            return type(uint256).max;
        }

        return totalCollateralValueUsd.wadDiv(totalBorrowValueUsd);
    }

    /**
     * @notice Calculate health factor without a specific collateral
     */
    function _calculateHealthFactorWithoutCollateral(
        address user,
        address excludeAsset
    ) internal view returns (uint256) {
        uint256 totalCollateralValueUsd = 0;
        uint256 totalBorrowValueUsd = 0;

        address[] memory userCollateralList = userCollateralAssets[user];
        for (uint256 i = 0; i < userCollateralList.length; i++) {
            address asset = userCollateralList[i];
            if (asset == excludeAsset) continue;
            
            DataTypes.UserCollateral storage userCollateral = userCollaterals[user][asset];
            
            if (userCollateral.isEnabled && userCollateral.amount > 0) {
                DataTypes.CollateralConfig storage config = collateralConfigs[asset];
                uint256 price = priceOracle.getAssetPrice(asset);
                
                uint256 valueUsd = (userCollateral.amount * price) / (10 ** config.decimals);
                totalCollateralValueUsd += valueUsd.percentMul(config.liquidationThreshold);
            }
        }

        address[] memory userBorrowList = userBorrowAssets[user];
        for (uint256 i = 0; i < userBorrowList.length; i++) {
            address asset = userBorrowList[i];
            uint256 debt = getUserDebt(user, asset);
            
            if (debt > 0) {
                DataTypes.BorrowConfig storage config = borrowConfigs[asset];
                uint256 price = priceOracle.getAssetPrice(asset);
                
                totalBorrowValueUsd += (debt * price) / (10 ** config.decimals);
            }
        }

        if (totalBorrowValueUsd == 0) {
            return type(uint256).max;
        }

        return totalCollateralValueUsd.wadDiv(totalBorrowValueUsd);
    }

    // ============ Helper View Functions ============

    /**
     * @notice Get list of user's collateral assets
     */
    function getUserCollateralAssets(address user) external view returns (address[] memory) {
        return userCollateralAssets[user];
    }

    /**
     * @notice Get list of user's borrowed assets
     */
    function getUserBorrowAssets(address user) external view returns (address[] memory) {
        return userBorrowAssets[user];
    }

    /**
     * @notice Get all supported collateral assets
     */
    function getCollateralAssets() external view returns (address[] memory) {
        return collateralAssets;
    }

    /**
     * @notice Get all supported borrow assets
     */
    function getBorrowAssets() external view returns (address[] memory) {
        return borrowAssets;
    }

    // ============ Backstop Functions ============

    /**
     * @notice Deposit protocol fees to backstop reserves
     * @param token Token address to deposit
     * @param amount Amount to deposit
     */
    function depositToBackstop(address token, uint256 amount) external onlyOwner {
        if (address(backstop) == address(0)) revert Errors.ZeroAddress();
        require(amount > 0, "LendingPool: invalid amount");

        uint256 contractBalance = IERC20(token).balanceOf(address(this));
        require(contractBalance >= amount, "LendingPool: insufficient balance");

        // Transfer tokens from this contract to backstop
        IERC20(token).safeTransfer(address(backstop), amount);

        // Notify backstop of the deposit (tokens are already there)
        backstop.depositReserve(token, amount);
    }

    /**
     * @notice Emergency liquidation using backstop funds
     * @dev Only callable when normal liquidation fails and backstop has funds
     * @param user User to liquidate
     * @param collateralAsset Collateral asset address
     * @param debtAsset Debt asset address
     * @param debtToCover Amount of debt to cover
     */
    function emergencyLiquidateWithBackstop(
        address user,
        address collateralAsset,
        address debtAsset,
        uint256 debtToCover
    ) external onlyOwnerOrEmergencyAdmin whenNotPaused {
        if (address(backstop) == address(0)) revert Errors.ZeroAddress();

        // Check if position needs liquidation
        if (getHealthFactor(user) >= HEALTH_FACTOR_LIQUIDATION_THRESHOLD) {
            revert Errors.PositionHealthy();
        }

        // Check if backstop has sufficient reserves
        uint256 backstopBalance = backstop.getReserveBalance(debtAsset);
        if (backstopBalance < debtToCover) {
            revert Errors.InsufficientBalance();
        }

        // Accrue interest
        _accrueInterest(debtAsset);

        // Limit debt to cover
        debtToCover = _limitDebtToCover(user, debtAsset, debtToCover);

        // Calculate collateral to seize
        uint256 collateralToSeize = _calculateCollateralToSeize(
            collateralAsset,
            debtAsset,
            debtToCover
        );

        // Execute emergency liquidation using backstop funds
        _executeEmergencyLiquidation(user, collateralAsset, debtAsset, debtToCover, collateralToSeize);

        emit EmergencyLiquidated(msg.sender, user, collateralAsset, debtAsset, debtToCover, collateralToSeize);
    }

    /**
     * @notice Execute emergency liquidation transfers using backstop
     */
    function _executeEmergencyLiquidation(
        address user,
        address collateralAsset,
        address debtAsset,
        uint256 debtToCover,
        uint256 collateralToSeize
    ) internal {
        // Use backstop funds to pay for the debt
        backstop.emergencyWithdraw(
            debtAsset,
            address(this),
            debtToCover,
            "Emergency liquidation protection"
        );

        // Burn debt tokens and update state
        _updateDebtOnLiquidation(user, debtAsset, debtToCover);

        // Burn collateral tokens and update state
        _updateCollateralOnLiquidation(user, collateralAsset, collateralToSeize);

        // Transfer collateral to backstop (protocol keeps it as reserve)
        IERC20(collateralAsset).safeTransfer(address(backstop), collateralToSeize);

        // Deposit collateral to backstop reserves
        backstop.depositReserve(collateralAsset, collateralToSeize);
    }

    /**
     * @notice Get backstop reserve balance for a token
     */
    function getBackstopBalance(address token) external view returns (uint256) {
        if (address(backstop) == address(0)) return 0;
        return backstop.getReserveBalance(token);
    }

}
