// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {LendingPool} from "../LendingPool.sol";
import {PriceOracle, MockPriceOracle} from "../PriceOracle.sol";
import {OToken} from "../tokens/OToken.sol";
import {DebtToken} from "../tokens/DebtToken.sol";
import {DataTypes} from "../libraries/DataTypes.sol";
import {WadRayMath} from "../libraries/WadRayMath.sol";
import {ERC20Mock} from "./mocks/ERC20Mock.sol";

contract LendingPoolTest is Test {
    using WadRayMath for uint256;

    LendingPool public pool;
    MockPriceOracle public oracle;

    // Mock tokens
    ERC20Mock public tslaToken;  // Collateral (Ondo RWA)
    ERC20Mock public usdcToken;  // Borrowable (Stablecoin)

    // Users
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public liquidator = makeAddr("liquidator");

    // Constants
    uint256 constant TSLA_PRICE = 250e8;     // $250 per share
    uint256 constant USDC_PRICE = 1e8;       // $1 per USDC
    uint256 constant INITIAL_BALANCE = 1000e18;
    uint256 constant INITIAL_USDC = 1_000_000e6;

    function setUp() public {
        // Deploy mock oracle
        oracle = new MockPriceOracle();

        // Deploy lending pool
        pool = new LendingPool(address(oracle));

        // Deploy mock tokens
        tslaToken = new ERC20Mock("Tesla Ondo", "TSLAon", 18);
        usdcToken = new ERC20Mock("USD Coin", "USDC", 6);

        // Set prices
        oracle.setAssetPrice(address(tslaToken), TSLA_PRICE);
        oracle.setAssetPrice(address(usdcToken), USDC_PRICE);

        // Add collateral asset (TSLAon)
        pool.addCollateralAsset(
            address(tslaToken),
            5000,  // 50% LTV
            6500,  // 65% liquidation threshold
            1000   // 10% liquidation bonus
        );

        // Add borrowable asset (USDC)
        pool.addBorrowAsset(
            address(usdcToken),
            200,   // 2% base rate
            400,   // 4% slope1
            7500,  // 75% slope2
            8000   // 80% optimal utilization
        );

        // Mint tokens to users
        tslaToken.mint(alice, INITIAL_BALANCE);
        tslaToken.mint(bob, INITIAL_BALANCE);
        usdcToken.mint(alice, INITIAL_USDC);
        usdcToken.mint(bob, INITIAL_USDC);
        usdcToken.mint(liquidator, INITIAL_USDC);

        // Approve spending
        vm.startPrank(alice);
        tslaToken.approve(address(pool), type(uint256).max);
        usdcToken.approve(address(pool), type(uint256).max);
        vm.stopPrank();

        vm.startPrank(bob);
        tslaToken.approve(address(pool), type(uint256).max);
        usdcToken.approve(address(pool), type(uint256).max);
        vm.stopPrank();

        vm.startPrank(liquidator);
        usdcToken.approve(address(pool), type(uint256).max);
        vm.stopPrank();

        // Supply USDC to the pool (for borrowing)
        vm.prank(bob);
        pool.supply(address(usdcToken), 500_000e6);
    }

    // ============ Deposit Tests ============

    function test_DepositCollateral() public {
        uint256 depositAmount = 10e18; // 10 TSLAon

        vm.prank(alice);
        pool.depositCollateral(address(tslaToken), depositAmount);

        // Check collateral was deposited
        assertEq(pool.getUserCollateral(alice, address(tslaToken)), depositAmount);
        
        // Check OToken was minted
        DataTypes.CollateralConfig memory config = pool.getCollateralConfig(address(tslaToken));
        OToken oToken = OToken(config.oTokenAddress);
        assertEq(oToken.balanceOf(alice), depositAmount);
    }

    function test_WithdrawCollateral() public {
        uint256 depositAmount = 10e18;

        vm.startPrank(alice);
        pool.depositCollateral(address(tslaToken), depositAmount);
        pool.withdrawCollateral(address(tslaToken), depositAmount);
        vm.stopPrank();

        assertEq(pool.getUserCollateral(alice, address(tslaToken)), 0);
        assertEq(tslaToken.balanceOf(alice), INITIAL_BALANCE);
    }

    // ============ Borrow Tests ============

    function test_Borrow() public {
        // Deposit collateral
        vm.startPrank(alice);
        pool.depositCollateral(address(tslaToken), 10e18); // 10 TSLAon = $2,500

        // Max borrowable = $2,500 * 50% LTV = $1,250 USDC
        uint256 borrowAmount = 1000e6; // $1,000 USDC
        pool.borrow(address(usdcToken), borrowAmount);
        vm.stopPrank();

        // Check debt
        assertEq(pool.getUserDebt(alice, address(usdcToken)), borrowAmount);
        
        // Check USDC received
        assertEq(usdcToken.balanceOf(alice), INITIAL_USDC + borrowAmount);
    }

    function test_BorrowMaxAmount() public {
        vm.startPrank(alice);
        pool.depositCollateral(address(tslaToken), 10e18); // 10 TSLAon = $2,500

        uint256 maxBorrowable = pool.getMaxBorrowable(alice, address(usdcToken));
        console.log("Max borrowable:", maxBorrowable);

        // Should be ~$1,250 USDC (50% LTV of $2,500)
        assertApproxEqRel(maxBorrowable, 1250e6, 0.01e18); // 1% tolerance
        vm.stopPrank();
    }

    function test_RevertBorrowExceedsCapacity() public {
        vm.startPrank(alice);
        pool.depositCollateral(address(tslaToken), 10e18); // 10 TSLAon = $2,500

        // Try to borrow more than allowed
        vm.expectRevert();
        pool.borrow(address(usdcToken), 2000e6); // $2,000 > $1,250 max
        vm.stopPrank();
    }

    // ============ Repay Tests ============

    function test_Repay() public {
        vm.startPrank(alice);
        pool.depositCollateral(address(tslaToken), 10e18);
        pool.borrow(address(usdcToken), 1000e6);

        // Repay half
        pool.repay(address(usdcToken), 500e6);
        vm.stopPrank();

        assertApproxEqAbs(pool.getUserDebt(alice, address(usdcToken)), 500e6, 1);
    }

    function test_RepayFull() public {
        vm.startPrank(alice);
        pool.depositCollateral(address(tslaToken), 10e18);
        pool.borrow(address(usdcToken), 1000e6);

        // Repay full (use max uint256)
        pool.repay(address(usdcToken), type(uint256).max);
        vm.stopPrank();

        assertEq(pool.getUserDebt(alice, address(usdcToken)), 0);
    }

    // ============ Health Factor Tests ============

    function test_HealthFactor() public {
        vm.startPrank(alice);
        pool.depositCollateral(address(tslaToken), 10e18); // $2,500 collateral

        // No borrow = infinite health factor
        uint256 hfNoBorrow = pool.getHealthFactor(alice);
        assertEq(hfNoBorrow, type(uint256).max);

        // Borrow $1,000
        pool.borrow(address(usdcToken), 1000e6);
        vm.stopPrank();

        // HF = ($2,500 * 65%) / $1,000 = 1.625
        uint256 hf = pool.getHealthFactor(alice);
        assertApproxEqRel(hf, 1.625e18, 0.01e18);
    }

    // ============ Liquidation Tests ============

    function test_Liquidation() public {
        // Alice deposits and borrows
        vm.startPrank(alice);
        pool.depositCollateral(address(tslaToken), 10e18); // $2,500
        pool.borrow(address(usdcToken), 1000e6);           // $1,000
        vm.stopPrank();

        // Price drops - TSLA goes from $250 to $100
        oracle.setAssetPrice(address(tslaToken), 100e8);

        // New HF = ($1,000 * 65%) / $1,000 = 0.65 < 1.0 (liquidatable)
        uint256 hf = pool.getHealthFactor(alice);
        assertLt(hf, 1e18);

        // Liquidator liquidates
        uint256 debtToCover = 500e6; // Cover $500 of debt
        
        vm.prank(liquidator);
        pool.liquidate(alice, address(tslaToken), address(usdcToken), debtToCover);

        // Alice's debt should be reduced
        assertLt(pool.getUserDebt(alice, address(usdcToken)), 1000e6);

        // Liquidator should have received TSLAon
        assertGt(tslaToken.balanceOf(liquidator), 0);
    }

    function test_RevertLiquidationHealthyPosition() public {
        vm.startPrank(alice);
        pool.depositCollateral(address(tslaToken), 10e18);
        pool.borrow(address(usdcToken), 500e6); // Conservative borrow
        vm.stopPrank();

        // Position is healthy (HF > 1)
        assertGt(pool.getHealthFactor(alice), 1e18);

        // Liquidation should fail
        vm.prank(liquidator);
        vm.expectRevert();
        pool.liquidate(alice, address(tslaToken), address(usdcToken), 100e6);
    }

    // ============ Interest Accrual Tests ============

    function test_InterestAccrual() public {
        vm.startPrank(alice);
        pool.depositCollateral(address(tslaToken), 100e18);
        pool.borrow(address(usdcToken), 10000e6);
        vm.stopPrank();

        uint256 debtBefore = pool.getUserDebt(alice, address(usdcToken));

        // Fast forward 1 year
        vm.warp(block.timestamp + 365 days);

        uint256 debtAfter = pool.getUserDebt(alice, address(usdcToken));

        // Debt should have increased due to interest
        assertGt(debtAfter, debtBefore);
        console.log("Debt before:", debtBefore);
        console.log("Debt after:", debtAfter);
        console.log("Interest accrued:", debtAfter - debtBefore);
    }

    // ============ Withdraw Restriction Tests ============

    function test_RevertWithdrawMakesPositionUnhealthy() public {
        vm.startPrank(alice);
        pool.depositCollateral(address(tslaToken), 10e18);
        pool.borrow(address(usdcToken), 1000e6);

        // Try to withdraw all collateral (would make HF = 0)
        vm.expectRevert();
        pool.withdrawCollateral(address(tslaToken), 10e18);
        vm.stopPrank();
    }

    function test_PartialWithdrawAllowed() public {
        vm.startPrank(alice);
        pool.depositCollateral(address(tslaToken), 10e18); // $2,500
        pool.borrow(address(usdcToken), 500e6);            // $500 debt

        // Withdraw some collateral (but keep HF > 1)
        pool.withdrawCollateral(address(tslaToken), 2e18); // Withdraw 2 TSLAon
        vm.stopPrank();

        // Should still have healthy position
        assertGt(pool.getHealthFactor(alice), 1e18);
    }
}

