// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IDebtToken} from "../interfaces/IDebtToken.sol";
import {WadRayMath} from "../libraries/WadRayMath.sol";
import {Errors} from "../libraries/Errors.sol";

/**
 * @title DebtToken
 * @notice Non-transferable token representing debt in the RWA Lending protocol
 * @dev Similar to Aave's variable debt token, tracks borrowed amounts with accruing interest
 */
contract DebtToken is ERC20, IDebtToken {
    using WadRayMath for uint256;

    /// @notice Address of the underlying borrowed asset
    address public immutable override UNDERLYING_ASSET;

    /// @notice Address of the lending pool
    address public immutable override POOL;

    /// @notice Mapping of user addresses to their scaled debt balance
    mapping(address => uint256) private _scaledBalances;

    /// @notice Mapping of user addresses to their principal (original borrow amount)
    mapping(address => uint256) private _principalBalances;

    /// @notice Total scaled debt supply
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
     * @notice Constructor for DebtToken
     * @param pool Address of the lending pool
     * @param underlyingAsset Address of the underlying borrowed asset
     * @param name Name of the DebtToken (e.g., "Ondo USDC Debt")
     * @param symbol Symbol of the DebtToken (e.g., "dUSDC")
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
     * @notice Mint DebtTokens to a user when they borrow
     * @param user Address to mint to
     * @param amount Amount borrowed
     * @param index Current borrow index (1e27 = 1.0)
     * @return Amount of DebtTokens minted (scaled)
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
        _principalBalances[user] += amount;

        // Mint the actual tokens (for ERC20 compatibility in views)
        _mint(user, amount);

        emit Mint(user, amount, index);

        return scaledAmount;
    }

    /**
     * @notice Burn DebtTokens from a user when they repay
     * @param user Address to burn from
     * @param amount Amount to repay
     * @param index Current borrow index
     * @return Amount of DebtTokens burned (scaled)
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
        if (scaledAmount > userBalance) {
            // If trying to repay more than owed, cap it
            scaledAmount = userBalance;
        }

        _scaledBalances[user] = userBalance - scaledAmount;
        _scaledTotalSupply -= scaledAmount;

        // Update principal (cap at 0)
        if (amount >= _principalBalances[user]) {
            _principalBalances[user] = 0;
        } else {
            _principalBalances[user] -= amount;
        }

        // Burn the actual tokens
        uint256 burnAmount = amount > balanceOf(user) ? balanceOf(user) : amount;
        _burn(user, burnAmount);

        emit Burn(user, amount, index);

        return scaledAmount;
    }

    // ============ View Functions ============

    /**
     * @notice Get user's scaled debt balance (without interest)
     * @param user Address of the user
     * @return Scaled debt balance
     */
    function scaledBalanceOf(address user) external view override returns (uint256) {
        return _scaledBalances[user];
    }

    /**
     * @notice Get total scaled debt supply
     * @return Total scaled debt supply
     */
    function scaledTotalSupply() external view override returns (uint256) {
        return _scaledTotalSupply;
    }

    /**
     * @notice Get user's principal debt (original borrowed amount)
     * @param user Address of the user
     * @return Principal debt amount
     */
    function principalBalanceOf(address user) external view override returns (uint256) {
        return _principalBalances[user];
    }

    /**
     * @notice Get the number of decimals
     * @return Number of decimals (same as underlying)
     */
    function decimals() public view override returns (uint8) {
        return _UNDERLYING_DECIMALS;
    }

    // ============ Transfer Restrictions ============

    /**
     * @notice Debt tokens are NOT transferable
     * @dev Always reverts - debt cannot be transferred
     */
    function transfer(address, uint256) public pure override(ERC20, IERC20) returns (bool) {
        revert Errors.DebtTokenNotTransferable();
    }

    /**
     * @notice Debt tokens are NOT transferable
     * @dev Always reverts - debt cannot be transferred
     */
    function transferFrom(address, address, uint256) public pure override(ERC20, IERC20) returns (bool) {
        revert Errors.DebtTokenNotTransferable();
    }

    /**
     * @notice Approvals are disabled for debt tokens
     * @dev Always reverts - debt cannot be approved for transfer
     */
    function approve(address, uint256) public pure override(ERC20, IERC20) returns (bool) {
        revert Errors.DebtTokenNotTransferable();
    }

    /**
     * @notice Allowances always return 0
     */
    function allowance(address, address) public pure override(ERC20, IERC20) returns (uint256) {
        return 0;
    }
}

