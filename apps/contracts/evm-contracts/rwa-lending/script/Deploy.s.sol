// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {LendingPool} from "../src/core/LendingPool.sol";
import {PriceOracle} from "../src/oracles/PriceOracle.sol";
import {Backstop} from "../src/core/Backstop.sol";

/**
 * @title Deploy
 * @notice Deployment script for RWA Lending Protocol
 * 
 * Usage:
 * ```bash
 * # Deploy to Sepolia testnet
 * forge script script/Deploy.s.sol:Deploy --rpc-url $SEPOLIA_RPC_URL --broadcast --verify
 * 
 * # Deploy to mainnet
 * forge script script/Deploy.s.sol:Deploy --rpc-url $ETH_RPC_URL --broadcast --verify
 * ```
 */
contract Deploy is Script {
    // ============ Mainnet Addresses ============
    
    // Ondo RWA Tokens (Ethereum Mainnet)
    address constant NVDA_ON = 0x2D1F7226Bd1F780AF6B9A49DCC0aE00E8Df4bDEE;
    address constant TSLA_ON = 0xf6b1117ec07684D3958caD8BEb1b302bfD21103f;
    address constant AAPL_ON = 0x14c3abF95Cb9C93a8b82C1CdCB76D72Cb87b2d4c;
    address constant MSFT_ON = 0xB812837b81a3a6b81d7CD74CfB19A7f2784555E5;
    address constant AMZN_ON = 0xbb8774FB97436d23d74C1b882E8E9A69322cFD31;
    address constant META_ON = 0x59644165402b611b350645555B50Afb581C71EB2;
    
    // Stablecoins (Ethereum Mainnet)
    address constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    
    // Chainlink Price Feeds (Ethereum Mainnet)
    // Note: These are examples - you need to find/create feeds for Ondo tokens
    address constant TSLA_USD_FEED = 0x1ceDaaB50936881B3e449e47e40A2cDAF5576A4a;
    address constant USDC_USD_FEED = 0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6;
    address constant USDT_USD_FEED = 0x3E7d1eAB13ad0104d2750B8863b489D65364e32D;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying RWA Lending Protocol...");
        console.log("Deployer:", deployer);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Price Oracle
        PriceOracle oracle = new PriceOracle();
        console.log("PriceOracle deployed at:", address(oracle));

        // 2. Deploy Backstop for emergency liquidations
        Backstop backstop = new Backstop();
        console.log("Backstop deployed at:", address(backstop));

        // 3. Set price feeds (if deploying to mainnet)
        // oracle.setAssetSource(TSLA_ON, TSLA_USD_FEED);
        // oracle.setAssetSource(USDC, USDC_USD_FEED);
        // oracle.setAssetSource(USDT, USDT_USD_FEED);

        // 3. Deploy Lending Pool
        LendingPool pool = new LendingPool(address(oracle));
        console.log("LendingPool deployed at:", address(pool));

        // 4. Add collateral assets (Ondo RWA tokens)
        // TSLAon - More volatile, lower LTV
        pool.addCollateralAsset(
            TSLA_ON,
            5000,  // 50% LTV
            6500,  // 65% liquidation threshold
            1000   // 10% liquidation bonus
        );
        console.log("Added TSLAon as collateral");

        // 5. Add borrowable assets (stablecoins)
        // USDC
        pool.addBorrowAsset(
            USDC,
            200,   // 2% base rate
            400,   // 4% slope1
            7500,  // 75% slope2
            8000   // 80% optimal utilization
        );
        console.log("Added USDC as borrowable");

        // USDT
        pool.addBorrowAsset(
            USDT,
            200,   // 2% base rate
            400,   // 4% slope1
            7500,  // 75% slope2
            8000   // 80% optimal utilization
        );
        console.log("Added USDT as borrowable");

        // 6. Configure Backstop
        pool.setBackstop(address(backstop));
        console.log("Backstop configured in LendingPool");

        // Enable USDC and USDT support in backstop
        backstop.setTokenSupport(USDC, true);
        backstop.setTokenSupport(USDT, true);
        console.log("Token support configured in Backstop");

        vm.stopBroadcast();

        console.log("\n=== Deployment Complete ===");
        console.log("PriceOracle:", address(oracle));
        console.log("Backstop:", address(backstop));
        console.log("LendingPool:", address(pool));
    }
}

/**
 * @title DeployTestnet
 * @notice Deployment script for testnet with mock tokens
 */
contract DeployTestnet is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        console.log("Deploying RWA Lending Protocol to Testnet...");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy Mock Oracle (for testing)
        // In production, use PriceOracle with real Chainlink feeds
        PriceOracle oracle = new PriceOracle();
        console.log("PriceOracle deployed at:", address(oracle));

        // Deploy Lending Pool
        LendingPool pool = new LendingPool(address(oracle));
        console.log("LendingPool deployed at:", address(pool));

        vm.stopBroadcast();

        console.log("\n=== Testnet Deployment Complete ===");
        console.log("PriceOracle:", address(oracle));
        console.log("LendingPool:", address(pool));
        console.log("\nNext steps:");
        console.log("1. Deploy mock ERC20 tokens for testing");
        console.log("2. Set mock prices in the oracle");
        console.log("3. Add collateral and borrow assets to the pool");
    }
}

