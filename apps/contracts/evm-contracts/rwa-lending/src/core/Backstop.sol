// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IBackstop} from "../interfaces/IBackstop.sol";

/**
 * @title Backstop
 * @notice Emergency reserve contract for liquidation protection
 * @dev Based on Aave's Collector pattern - holds protocol reserves for emergencies
 *      Only emergency admins can withdraw in critical situations
 */
contract Backstop is IBackstop, Ownable, AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Emergency admin role for emergency operations
    bytes32 public constant BACKSTOP_EMERGENCY_ROLE = keccak256("BACKSTOP_EMERGENCY_ROLE");

    /// @notice Reserve balances mapping
    mapping(address => uint256) private _reserveBalances;

    /// @notice Supported tokens mapping
    mapping(address => bool) private _supportedTokens;

    /// @notice Modifiers
    modifier onlyEmergencyAdmin() {
        require(
            hasRole(BACKSTOP_EMERGENCY_ROLE, msg.sender) || owner() == msg.sender,
            "Backstop: caller is not emergency admin"
        );
        _;
    }

    modifier tokenSupported(address token) {
        require(_supportedTokens[token], "Backstop: token not supported");
        _;
    }

    /**
     * @notice Constructor
     */
    constructor() Ownable(msg.sender) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(BACKSTOP_EMERGENCY_ROLE, msg.sender);
    }

    /**
     * @notice Get emergency role
     */
    function getEmergencyRole() external pure returns (bytes32) {
        return BACKSTOP_EMERGENCY_ROLE;
    }

    /**
     * @notice Check if address has emergency privileges
     */
    function isEmergencyAdmin(address admin) external view returns (bool) {
        return hasRole(BACKSTOP_EMERGENCY_ROLE, admin) || owner() == admin;
    }

    /**
     * @notice Get reserve balance for a token
     */
    function getReserveBalance(address token) external view returns (uint256) {
        return _reserveBalances[token];
    }

    /**
     * @notice Emergency withdrawal for liquidation protection
     * @dev Only emergency admins can call this in critical situations
     *      Requires token to be supported and includes reason for audit trail
     */
    function emergencyWithdraw(
        address token,
        address recipient,
        uint256 amount,
        string calldata reason
    ) external nonReentrant onlyEmergencyAdmin tokenSupported(token) {
        require(recipient != address(0), "Backstop: invalid recipient");
        require(amount > 0, "Backstop: invalid amount");

        uint256 currentBalance = _reserveBalances[token];
        require(currentBalance >= amount, "Backstop: insufficient reserve balance");

        _reserveBalances[token] = currentBalance - amount;

        // Transfer tokens
        if (token == address(0)) {
            // ETH transfer
            (bool success,) = payable(recipient).call{value: amount}("");
            require(success, "Backstop: ETH transfer failed");
        } else {
            IERC20(token).safeTransfer(recipient, amount);
        }

        emit EmergencyWithdrawal(token, recipient, amount, reason);
        emit ReserveWithdrawn(token, recipient, amount, _reserveBalances[token]);
    }

    /**
     * @notice Simple transfer function for normal operations (non-emergency)
     * @dev Can be called by owner or emergency admin. Does NOT require token to be supported.
     *      Use this for regular transfers, use emergencyWithdraw() for critical situations.
     *      This function does NOT update reserve balances - it transfers from contract balance.
     */
    function transfer(IERC20 token, address recipient, uint256 amount) external nonReentrant onlyEmergencyAdmin {
        require(recipient != address(0), "Backstop: invalid recipient");
        require(amount > 0, "Backstop: invalid amount");

        if (address(token) == address(0)) {
            // ETH transfer
            (bool success,) = payable(recipient).call{value: amount}("");
            require(success, "Backstop: ETH transfer failed");
        } else {
            token.safeTransfer(recipient, amount);
        }

        emit Transfer(address(token), recipient, amount);
    }

    /**
     * @notice Approve tokens for spending by another contract
     * @dev Can be called by owner or emergency admin. Useful for integrations.
     */
    function approve(IERC20 token, address spender, uint256 amount) external onlyEmergencyAdmin {
        require(spender != address(0), "Backstop: invalid spender");
        SafeERC20.forceApprove(token, spender, amount);
        emit Approval(address(token), spender, amount);
    }

    /**
     * @notice Deposit tokens to backstop reserves
     * @dev For ERC20, tokens must be approved first. This function transfers tokens from caller.
     *      Can be used when tokens are already in the contract (e.g., from LendingPool fees).
     */
    function depositReserve(address token, uint256 amount) external payable {
        require(amount > 0, "Backstop: invalid amount");

        if (token == address(0)) {
            // ETH deposit
            require(msg.value == amount, "Backstop: ETH amount mismatch");
        } else {
            // ERC20 deposit - transfer from caller if not already in contract
            require(msg.value == 0, "Backstop: no ETH should be sent for ERC20");
            uint256 balanceBefore = IERC20(token).balanceOf(address(this));
            uint256 expectedBalance = _reserveBalances[token] + amount;
            
            // If tokens not already in contract, transfer them
            if (balanceBefore < expectedBalance) {
                uint256 needed = expectedBalance - balanceBefore;
                IERC20(token).safeTransferFrom(msg.sender, address(this), needed);
            }
        }

        _reserveBalances[token] += amount;

        emit ReserveDeposited(token, msg.sender, amount, _reserveBalances[token]);
    }

    /**
     * @notice Owner can deposit tokens directly from their balance
     * @dev Only owner can call this. Transfers tokens directly from owner's wallet
     */
    function ownerDeposit(address token, uint256 amount) external payable onlyOwner tokenSupported(token) {
        require(amount > 0, "Backstop: invalid amount");

        if (token == address(0)) {
            // ETH deposit
            require(msg.value == amount, "Backstop: ETH amount mismatch");
        } else {
            // ERC20 deposit - transfer directly from owner
            require(msg.value == 0, "Backstop: no ETH should be sent for ERC20");
            IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        }

        _reserveBalances[token] += amount;

        emit ReserveDeposited(token, msg.sender, amount, _reserveBalances[token]);
    }

    /**
     * @notice Emergency admin can deposit tokens directly from their balance
     * @dev Only emergency admin can call this. Transfers tokens directly from admin's wallet
     */
    function emergencyDeposit(address token, uint256 amount) external payable onlyEmergencyAdmin tokenSupported(token) {
        require(amount > 0, "Backstop: invalid amount");

        if (token == address(0)) {
            // ETH deposit
            require(msg.value == amount, "Backstop: ETH amount mismatch");
        } else {
            // ERC20 deposit - transfer directly from emergency admin
            require(msg.value == 0, "Backstop: no ETH should be sent for ERC20");
            IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        }

        _reserveBalances[token] += amount;

        emit ReserveDeposited(token, msg.sender, amount, _reserveBalances[token]);
    }

    /**
     * @notice Withdraw from reserves (only owner for normal operations)
     * @dev Withdraws from tracked reserves and updates reserve balance
     */
    function withdrawReserve(
        address token,
        address recipient,
        uint256 amount
    ) external nonReentrant onlyOwner tokenSupported(token) {
        require(recipient != address(0), "Backstop: invalid recipient");
        require(amount > 0, "Backstop: invalid amount");

        uint256 currentBalance = _reserveBalances[token];
        require(currentBalance >= amount, "Backstop: insufficient reserve balance");

        _reserveBalances[token] = currentBalance - amount;

        // Transfer tokens
        if (token == address(0)) {
            // ETH transfer
            (bool success,) = payable(recipient).call{value: amount}("");
            require(success, "Backstop: ETH transfer failed");
        } else {
            IERC20(token).safeTransfer(recipient, amount);
        }

        emit ReserveWithdrawn(token, recipient, amount, _reserveBalances[token]);
    }

    /**
     * @notice Add or remove token support (only owner)
     */
    function setTokenSupport(address token, bool supported) external onlyOwner {
        _supportedTokens[token] = supported;
        emit TokenSupportChanged(token, supported);
    }

    /**
     * @notice Check if token is supported
     */
    function isTokenSupported(address token) external view returns (bool) {
        return _supportedTokens[token];
    }

    /**
     * @notice Receive ETH
     */
    receive() external payable {
        // Allow receiving ETH for reserves
    }
}