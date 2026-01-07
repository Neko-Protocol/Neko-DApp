// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IOToken
 * @notice Interface for OToken - the deposit receipt token for collateral
 * @dev OTokens represent a user's deposit and accumulate value over time
 */
interface IOToken is IERC20 {
    // ============ Events ============

    /// @notice Emitted when OTokens are minted
    event Mint(address indexed user, uint256 amount, uint256 index);

    /// @notice Emitted when OTokens are burned
    event Burn(address indexed user, uint256 amount, uint256 index);

    // ============ Functions ============

    /**
     * @notice Mint OTokens to a user
     * @param user Address to mint to
     * @param amount Amount of underlying deposited
     * @param index Current liquidity index
     * @return Amount of OTokens minted
     */
    function mint(address user, uint256 amount, uint256 index) external returns (uint256);

    /**
     * @notice Burn OTokens from a user
     * @param user Address to burn from
     * @param amount Amount of underlying to withdraw
     * @param index Current liquidity index
     * @return Amount of OTokens burned
     */
    function burn(address user, uint256 amount, uint256 index) external returns (uint256);

    /**
     * @notice Get the underlying asset address
     * @return Address of the underlying collateral token
     */
    function UNDERLYING_ASSET() external view returns (address);

    /**
     * @notice Get the lending pool address
     * @return Address of the lending pool
     */
    function POOL() external view returns (address);

    /**
     * @notice Get user's scaled balance (balance without interest)
     * @param user Address of the user
     * @return Scaled balance
     */
    function scaledBalanceOf(address user) external view returns (uint256);

    /**
     * @notice Get total scaled supply
     * @return Total scaled supply
     */
    function scaledTotalSupply() external view returns (uint256);
}

