// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IOToken} from "../interfaces/IOToken.sol";
import {WadRayMath} from "../libraries/WadRayMath.sol";
import {Errors} from "../libraries/Errors.sol";

/**
 * @title OToken
 * @notice Token representing collateral deposits in the RWA Lending protocol
 * @dev Similar to Aave's aToken, represents a user's share of the collateral pool
 */
contract OToken is ERC20, IOToken {
    using WadRayMath for uint256;
    using SafeERC20 for IERC20;

    /// @notice Address of the underlying collateral asset
    address public immutable override UNDERLYING_ASSET;

    /// @notice Address of the lending pool
    address public immutable override POOL;

    /// @notice Mapping of user addresses to their scaled balance
    mapping(address => uint256) private _scaledBalances;

    /// @notice Total scaled supply
    uint256 private _scaledTotalSupply;

    /// @notice Number of decimals of the underlying asset
    uint8 private immutable _UNDERLYING_DECIMALS;

    // ============ Modifiers ============

    modifier onlyPool() {
        if (msg.sender != POOL) revert Errors.Unauthorized();
        _;
    }

    // ============ Constructor ============

    /**
     * @notice Constructor for OToken
     * @param pool Address of the lending pool
     * @param underlyingAsset Address of the underlying collateral token
     * @param name Name of the OToken (e.g., "Ondo TSLAon Collateral")
     * @param symbol Symbol of the OToken (e.g., "oTSLAon")
     */
    constructor(
        address pool,
        address underlyingAsset,
        string memory name,
        string memory symbol
    ) ERC20(name, symbol) {
        if (pool == address(0)) revert Errors.ZeroAddress();
        if (underlyingAsset == address(0)) revert Errors.ZeroAddress();

        POOL = pool;
        UNDERLYING_ASSET = underlyingAsset;

        // Get decimals from underlying asset
        _UNDERLYING_DECIMALS = ERC20(underlyingAsset).decimals();
    }

    // ============ External Functions ============

    /**
     * @notice Mint OTokens to a user when they deposit collateral
     * @param user Address to mint to
     * @param amount Amount of underlying deposited
     * @param index Current liquidity index (1e27 = 1.0)
     * @return Amount of OTokens minted (scaled)
     */
    function mint(
        address user,
        uint256 amount,
        uint256 index
    ) external override onlyPool returns (uint256) {
        if (amount == 0) revert Errors.ZeroAmount();

        // Calculate scaled amount (amount / index)
        uint256 scaledAmount = amount.rayDiv(index);

        _scaledBalances[user] += scaledAmount;
        _scaledTotalSupply += scaledAmount;

        // Mint the actual tokens (for ERC20 compatibility)
        _mint(user, amount);

        emit Mint(user, amount, index);

        return scaledAmount;
    }

    /**
     * @notice Burn OTokens from a user when they withdraw collateral
     * @param user Address to burn from
     * @param amount Amount of underlying to withdraw
     * @param index Current liquidity index
     * @return Amount of OTokens burned (scaled)
     */
    function burn(
        address user,
        uint256 amount,
        uint256 index
    ) external override onlyPool returns (uint256) {
        if (amount == 0) revert Errors.ZeroAmount();

        // Calculate scaled amount to burn
        uint256 scaledAmount = amount.rayDiv(index);

        uint256 userBalance = _scaledBalances[user];
        if (scaledAmount > userBalance) revert Errors.InsufficientBalance();

        _scaledBalances[user] = userBalance - scaledAmount;
        _scaledTotalSupply -= scaledAmount;

        // Burn the actual tokens
        _burn(user, amount);

        emit Burn(user, amount, index);

        return scaledAmount;
    }

    // ============ View Functions ============

    /**
     * @notice Get user's scaled balance (balance without accrued interest)
     * @param user Address of the user
     * @return Scaled balance
     */
    function scaledBalanceOf(address user) external view override returns (uint256) {
        return _scaledBalances[user];
    }

    /**
     * @notice Get total scaled supply
     * @return Total scaled supply
     */
    function scaledTotalSupply() external view override returns (uint256) {
        return _scaledTotalSupply;
    }

    /**
     * @notice Get the number of decimals
     * @return Number of decimals (same as underlying)
     */
    function decimals() public view override returns (uint8) {
        return _UNDERLYING_DECIMALS;
    }

    // ============ ERC20 Overrides ============

    /**
     * @notice Override transfer to update scaled balances
     */
    function transfer(address to, uint256 amount) public override(ERC20, IERC20) returns (bool) {
        address owner = _msgSender();
        _transferScaled(owner, to, amount);
        return super.transfer(to, amount);
    }

    /**
     * @notice Override transferFrom to update scaled balances
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override(ERC20, IERC20) returns (bool) {
        _transferScaled(from, to, amount);
        return super.transferFrom(from, to, amount);
    }

    // ============ Internal Functions ============

    /**
     * @notice Internal function to transfer scaled balances
     */
    function _transferScaled(address from, address to, uint256 amount) internal {
        // For simplicity, we transfer the same proportion of scaled balance
        uint256 fromBalance = balanceOf(from);
        if (fromBalance == 0) revert Errors.InsufficientBalance();

        uint256 scaledFrom = _scaledBalances[from];
        uint256 scaledTransfer = (scaledFrom * amount) / fromBalance;

        _scaledBalances[from] -= scaledTransfer;
        _scaledBalances[to] += scaledTransfer;
    }
}

