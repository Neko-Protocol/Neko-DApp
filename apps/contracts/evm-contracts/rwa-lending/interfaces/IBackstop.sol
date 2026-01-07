// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IBackstop
 * @notice Interface for the Backstop contract that holds emergency reserves
 * @dev Based on Aave's Collector pattern - stores protocol reserves for emergencies
 */
interface IBackstop {
    /// @notice Emergency reserve withdrawal event
    event EmergencyWithdrawal(
        address indexed token,
        address indexed recipient,
        uint256 amount,
        string reason
    );

    /// @notice Reserve deposited event
    event ReserveDeposited(address indexed token, address indexed depositor, uint256 amount, uint256 newBalance);

    /// @notice Reserve withdrawn event
    event ReserveWithdrawn(address indexed token, address indexed recipient, uint256 amount, uint256 newBalance);

    /// @notice Token support changed event
    event TokenSupportChanged(address indexed token, bool supported);

    /// @notice Transfer event (for simple transfers, not from reserves)
    event Transfer(address indexed token, address indexed recipient, uint256 amount);

    /// @notice Approval event (for token approvals)
    event Approval(address indexed token, address indexed spender, uint256 amount);

    /// @notice Emergency role for emergency operations
    function getEmergencyRole() external view returns (bytes32);

    /// @notice Checks if address has emergency privileges
    function isEmergencyAdmin(address admin) external view returns (bool);

    /// @notice Get reserve balance for a token
    function getReserveBalance(address token) external view returns (uint256);

    /// @notice Emergency withdrawal for liquidation protection
    function emergencyWithdraw(
        address token,
        address recipient,
        uint256 amount,
        string calldata reason
    ) external;

    /// @notice Deposit tokens to backstop reserves
    function depositReserve(address token, uint256 amount) external payable;

    /// @notice Owner can deposit tokens directly from their balance
    function ownerDeposit(address token, uint256 amount) external payable;

    /// @notice Emergency admin can deposit tokens directly from their balance
    function emergencyDeposit(address token, uint256 amount) external payable;

    /// @notice Withdraw from reserves (only owner)
    function withdrawReserve(address token, address recipient, uint256 amount) external;

    /// @notice Check if token is supported
    function isTokenSupported(address token) external view returns (bool);

    /// @notice Set token support (only owner)
    function setTokenSupport(address token, bool supported) external;

    /// @notice Simple transfer function for normal operations (non-emergency)
    /// @dev Transfers from contract balance, does NOT update reserve balances
    /// @param token Token to transfer (address(0) for ETH)
    /// @param recipient Recipient address
    /// @param amount Amount to transfer
    function transfer(IERC20 token, address recipient, uint256 amount) external;

    /// @notice Approve tokens for spending by another contract
    /// @param token Token to approve
    /// @param spender Address to approve
    /// @param amount Amount to approve
    function approve(IERC20 token, address spender, uint256 amount) external;
}
