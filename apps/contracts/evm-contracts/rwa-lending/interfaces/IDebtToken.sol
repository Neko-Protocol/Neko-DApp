// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IDebtToken
 * @notice Interface for DebtToken - non-transferable token representing debt
 * @dev DebtTokens track borrowed amounts and accrue interest over time
 */
interface IDebtToken is IERC20 {
    // ============ Events ============

    /// @notice Emitted when DebtTokens are minted (user borrows)
    event Mint(address indexed user, uint256 amount, uint256 index);

    /// @notice Emitted when DebtTokens are burned (user repays)
    event Burn(address indexed user, uint256 amount, uint256 index);

    // ============ Functions ============

    /**
     * @notice Mint DebtTokens to a user (called when borrowing)
     * @param user Address to mint to
     * @param amount Amount borrowed
     * @param index Current borrow index
     * @return Amount of DebtTokens minted
     */
    function mint(address user, uint256 amount, uint256 index) external returns (uint256);

    /**
     * @notice Burn DebtTokens from a user (called when repaying)
     * @param user Address to burn from
     * @param amount Amount to repay
     * @param index Current borrow index
     * @return Amount of DebtTokens burned
     */
    function burn(address user, uint256 amount, uint256 index) external returns (uint256);

    /**
     * @notice Get the underlying borrowed asset address
     * @return Address of the underlying asset
     */
    function UNDERLYING_ASSET() external view returns (address);

    /**
     * @notice Get the lending pool address
     * @return Address of the lending pool
     */
    function POOL() external view returns (address);

    /**
     * @notice Get user's scaled debt balance (without interest)
     * @param user Address of the user
     * @return Scaled debt balance
     */
    function scaledBalanceOf(address user) external view returns (uint256);

    /**
     * @notice Get total scaled debt
     * @return Total scaled debt supply
     */
    function scaledTotalSupply() external view returns (uint256);

    /**
     * @notice Get user's principal debt (original borrowed amount)
     * @param user Address of the user
     * @return Principal debt amount
     */
    function principalBalanceOf(address user) external view returns (uint256);
}

