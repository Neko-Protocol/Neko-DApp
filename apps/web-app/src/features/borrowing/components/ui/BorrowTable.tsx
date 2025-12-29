"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  Chip,
  IconButton,
  Tooltip,
  Box,
  Typography,
  Button,
  Modal,
  TextField,
} from "@mui/material";
import { Info } from "@mui/icons-material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { useBorrowPools } from "../../hooks/useBorrowPools";
import { useWallet } from "@/hooks/useWallet";
import {
  borrowFromPool,
  getBorrowLimit,
  getCollateral,
  addCollateralWithApprove,
} from "@/features/lending/utils/lending";
import { getAvailableTokens } from "@/lib/helpers/soroswap";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { TransactionBuilder, Networks } from "@stellar/stellar-sdk";
import { rpcUrl } from "@/lib/constants/network";
import { rpc } from "@stellar/stellar-sdk";

interface AssetData {
  id: string;
  pool: {
    token1: string;
    token2: string;
    fee: string;
  };
  roi: string;
  feeApy: string;
  liquidity: string;
  isActive: boolean;
  assetCode: string;
  collateralTokenCode: string;
  collateralFactor: number;
}

const lightTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#083dffff",
    },
    background: {
      default: "#ffffff",
      paper: "#f9fafb",
    },
    text: {
      primary: "#081F5C",
      secondary: "#7096D1",
    },
  },
});

const BorrowTable: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetData | null>(null);
  const [amount, setAmount] = useState("");
  const [collateralToAdd, setCollateralToAdd] = useState(""); // Optional collateral to add when borrowing
  const [isLoading, setIsLoading] = useState(false);
  const [borrowLimit, setBorrowLimit] = useState<string | null>(null);
  const [currentCollateral, setCurrentCollateral] = useState<string | null>(
    null
  );

  const { address, signTransaction, networkPassphrase } = useWallet();

  // Get wallet balance for the RWA token (collateral token)
  const walletBalance = useTokenBalance(
    selectedAsset?.collateralTokenCode
      ? {
          type: "contract",
          contract:
            getAvailableTokens()[selectedAsset.collateralTokenCode]?.contract,
        }
      : undefined
  );

  // Get real borrow pools from contract
  const {
    data: borrowPools = [],
    isLoading: isLoadingPools,
    error: poolsError,
  } = useBorrowPools();

  console.log("BorrowTable component - borrowPools:", borrowPools);
  console.log("BorrowTable component - isLoadingPools:", isLoadingPools);
  console.log("BorrowTable component - poolsError:", poolsError);

  // Convert borrow pools to AssetData format
  const assets: AssetData[] = useMemo(() => {
    return borrowPools.map((pool, index) => {
      // Format liquidity - pool balance is in the native token (USDC, XLM, etc.)
      // This comes directly from the contract's get_pool_balance()
      const balanceNum = parseFloat(pool.poolBalance);
      let liquidity: string;

      if (balanceNum >= 1000000) {
        liquidity = `${(balanceNum / 1000000).toFixed(2)}M ${pool.assetCode}`;
      } else if (balanceNum >= 1000) {
        liquidity = `${(balanceNum / 1000).toFixed(2)}k ${pool.assetCode}`;
      } else {
        liquidity = `${balanceNum.toFixed(2)} ${pool.assetCode}`;
      }

      return {
        id: `borrow-${index}`,
        pool: {
          token1: pool.assetCode,
          token2: pool.collateralTokenCode,
          fee: `${pool.collateralFactor}%`, // Collateral factor as fee display
        },
        roi: `${pool.interestRate.toFixed(2)}%`,
        feeApy: `${pool.interestRate.toFixed(2)}%`, // Borrow interest rate as APY
        liquidity,
        isActive: pool.isActive,
        assetCode: pool.assetCode,
        collateralTokenCode: pool.collateralTokenCode,
        collateralFactor: pool.collateralFactor,
      };
    });
  }, [borrowPools]);

  const handleBorrowClick = (asset: AssetData) => {
    setSelectedAsset(asset);
    setAmount("");
    setCollateralToAdd("");
    setBorrowLimit(null);
    setCurrentCollateral(null);
    setIsModalOpen(true);
    // Load borrow limit and collateral if wallet is connected
    if (address) {
      void loadBorrowLimit();
      void loadCurrentCollateral(asset);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedAsset(null);
    setAmount("");
    setCollateralToAdd("");
    setBorrowLimit(null);
    setCurrentCollateral(null);
  };

  const loadBorrowLimit = useCallback(async () => {
    if (!address) return;

    try {
      const limit = await getBorrowLimit(address);
      setBorrowLimit(limit);
    } catch (error) {
      console.error("Error loading borrow limit:", error);
      setBorrowLimit("0");
    }
  }, [address]);

  const loadCurrentCollateral = useCallback(
    async (asset: AssetData) => {
      if (!address || !asset) return;

      try {
        const availableTokens = getAvailableTokens();
        const rwaToken = availableTokens[asset.collateralTokenCode];
        if (!rwaToken?.contract) {
          setCurrentCollateral("0");
          return;
        }

        // Get decimals from token info, default to 7 if not specified
        const decimals = rwaToken.decimals || 7;
        const collateral = await getCollateral(
          rwaToken.contract,
          address,
          decimals
        );
        setCurrentCollateral(collateral);
      } catch (error) {
        console.error("Error loading collateral:", error);
        setCurrentCollateral("0");
      }
    },
    [address]
  );

  // Load borrow limit when address changes
  useEffect(() => {
    if (address && isModalOpen && selectedAsset) {
      void loadBorrowLimit();
      void loadCurrentCollateral(selectedAsset);
    } else {
      setBorrowLimit(null);
      setCurrentCollateral(null);
    }
  }, [
    address,
    isModalOpen,
    selectedAsset,
    loadBorrowLimit,
    loadCurrentCollateral,
  ]);

  const handleConfirm = async () => {
    console.log("handleConfirm called", { selectedAsset, address, amount });

    if (!selectedAsset) {
      console.error("No asset selected");
      return;
    }

    if (!address) {
      console.error("No wallet address");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      console.error("Invalid amount:", amount);
      return;
    }

    setIsLoading(true);

    try {
      const availableTokens = getAvailableTokens();
      const token = availableTokens[selectedAsset.assetCode];
      if (!token?.contract) {
        throw new Error(`Token ${selectedAsset.assetCode} not found`);
      }

      const rwaToken = availableTokens[selectedAsset.collateralTokenCode];
      if (!rwaToken?.contract) {
        throw new Error(
          `RWA Token ${selectedAsset.collateralTokenCode} not found`
        );
      }

      const decimals = token.decimals || 7;
      const rwaDecimals = rwaToken.decimals || 7;
      const sorobanServer = new rpc.Server(rpcUrl);

      // If no sufficient collateral, user must add collateral
      if (borrowLimit !== null && parseFloat(borrowLimit) === 0) {
        if (!collateralToAdd || parseFloat(collateralToAdd) <= 0) {
          throw new Error("You must add collateral to borrow");
        }
      }

      // If collateral is provided, execute three separate transactions:
      // 1. approve
      // 2. add_collateral
      // 3. borrow
      if (collateralToAdd && parseFloat(collateralToAdd) > 0) {
        console.log(
          "Borrowing with collateral in three separate transactions:",
          {
            collateralAmount: collateralToAdd,
            borrowAmount: amount,
          }
        );

        // Build transactions: approve and add_collateral
        const { approveXdr, addCollateralXdr } = await addCollateralWithApprove(
          rwaToken.contract,
          collateralToAdd,
          rwaDecimals,
          address
        );

        // Step 1/3: Sign and submit approve transaction
        console.log("Step 1/3: Signing approve transaction...");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
        const signedApprove = await signTransaction(approveXdr as any, {
          networkPassphrase: networkPassphrase || Networks.TESTNET,
          address: address,
        });

        const approveTx = TransactionBuilder.fromXDR(
          signedApprove.signedTxXdr,
          networkPassphrase || Networks.TESTNET
        );
        const approveResult = await sorobanServer.sendTransaction(approveTx);
        console.log("Approve transaction submitted:", approveResult);

        // Wait for approve to be processed
        console.log("Waiting for approve transaction to be processed...");
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Step 2/3: Sign and submit add_collateral transaction
        console.log("Step 2/3: Signing add_collateral transaction...");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
        const signedAddCollateral = await signTransaction(
          addCollateralXdr as any,
          {
            networkPassphrase: networkPassphrase || Networks.TESTNET,
            address: address,
          }
        );

        const addCollateralTx = TransactionBuilder.fromXDR(
          signedAddCollateral.signedTxXdr,
          networkPassphrase || Networks.TESTNET
        );
        const addCollateralResult =
          await sorobanServer.sendTransaction(addCollateralTx);
        console.log(
          "Add collateral transaction submitted:",
          addCollateralResult
        );

        // Wait for add_collateral to be processed
        console.log(
          "Waiting for add_collateral transaction to be processed..."
        );
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Step 3/3: Build and submit borrow transaction
        console.log("Step 3/3: Building borrow transaction...");
        const borrowXdr = await borrowFromPool(
          selectedAsset.assetCode,
          amount,
          decimals,
          address
        );

        // Sign and submit borrow transaction
        console.log("Step 3/3: Signing borrow transaction...");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
        const signedBorrow = await signTransaction(borrowXdr as any, {
          networkPassphrase: networkPassphrase || Networks.TESTNET,
          address: address,
        });

        const borrowTx = TransactionBuilder.fromXDR(
          signedBorrow.signedTxXdr,
          networkPassphrase || Networks.TESTNET
        );
        const borrowResult = await sorobanServer.sendTransaction(borrowTx);
        console.log("Borrow transaction submitted:", borrowResult);
      } else {
        // Just borrow (user already has sufficient collateral)
        console.log("Borrowing without adding collateral");
        const borrowXdr = await borrowFromPool(
          selectedAsset.assetCode,
          amount,
          decimals,
          address
        );

        // Sign and submit borrow transaction
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
        const signedBorrow = await signTransaction(borrowXdr as any, {
          networkPassphrase: networkPassphrase || Networks.TESTNET,
          address: address,
        });

        const borrowTx = TransactionBuilder.fromXDR(
          signedBorrow.signedTxXdr,
          networkPassphrase || Networks.TESTNET
        );
        const borrowResult = await sorobanServer.sendTransaction(borrowTx);
        console.log("Borrow transaction submitted:", borrowResult);
      }

      handleCloseModal();
    } catch (error) {
      console.error("Transaction error:", error);
      // You might want to show an error notification here
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemeProvider theme={lightTheme}>
      <Box sx={{ width: "100%", px: 3 }}>
        <TableContainer
          component={Paper}
          sx={{
            backgroundColor: "#ffffff",
            borderRadius: "24px",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
            border: "1px solid rgba(51, 78, 172, 0.2)",
          }}
        >
          <Table sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow
                sx={{
                  "& th": {
                    backgroundColor: "#f3f4f6",
                    color: "#081F5C",
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    borderBottom: "1px solid rgba(51, 78, 172, 0.2)",
                    py: 2,
                  },
                }}
              >
                <TableCell>ID</TableCell>
                <TableCell>POOL</TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    ROI
                    <Tooltip title="Return on Investment">
                      <IconButton size="small" sx={{ p: 0 }}>
                        <Info sx={{ fontSize: 16, color: "#081F5C" }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    FEE APY
                    <Tooltip title="Annual Percentage Yield from fees">
                      <IconButton size="small" sx={{ p: 0 }}>
                        <Info sx={{ fontSize: 16, color: "#081F5C" }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    LIQUIDITY
                    <Tooltip title="Total liquidity in pool">
                      <IconButton size="small" sx={{ p: 0 }}>
                        <Info sx={{ fontSize: 16, color: "#081F5C" }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
                <TableCell>ACTIONS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoadingPools ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography sx={{ color: "#7096D1" }}>
                      Loading borrow pools...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : poolsError ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography sx={{ color: "#dc2626" }}>
                      Error loading borrow pools: {String(poolsError)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : assets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography sx={{ color: "#7096D1" }}>
                      No active borrow pools available
                    </Typography>
                    <Typography
                      sx={{ color: "#7096D1", fontSize: "0.875rem", mt: 1 }}
                    >
                      {borrowPools.length === 0
                        ? "No pools found in contract"
                        : `${borrowPools.length} pool(s) found but filtered out`}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                assets.map((asset) => (
                  <TableRow
                    key={asset.id}
                    sx={{
                      "&:hover": {
                        backgroundColor: "rgba(51, 78, 172, 0.1)",
                      },
                      "& td": {
                        borderBottom: "1px solid rgba(51, 78, 172, 0.2)",
                        py: 2.5,
                      },
                    }}
                  >
                    <TableCell>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            backgroundColor: asset.isActive
                              ? "#028733ff"
                              : "#6b7280",
                          }}
                        />
                        <Typography
                          sx={{
                            color: asset.isActive ? "#028733ff" : "#7096D1",
                            fontWeight: 500,
                          }}
                        >
                          {asset.id}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Box
                          sx={{ position: "relative", width: 40, height: 24 }}
                        >
                          <Avatar
                            sx={{
                              width: 24,
                              height: 24,
                              position: "absolute",
                              left: 0,
                              border: "2px solid #ffffff",
                              backgroundColor: "#334EAC",
                            }}
                          />
                          <Avatar
                            sx={{
                              width: 24,
                              height: 24,
                              position: "absolute",
                              left: 16,
                              border: "2px solid #ffffff",
                              backgroundColor: "#7096D1",
                            }}
                          />
                        </Box>
                        <Box>
                          <Typography
                            sx={{ color: "#081F5C", fontWeight: 500 }}
                          >
                            {asset.pool.token1} / {asset.pool.token2}
                          </Typography>
                          <Chip
                            label={asset.pool.fee}
                            size="small"
                            sx={{
                              backgroundColor: "rgba(51, 78, 172, 0.1)",
                              color: "#081F5C",
                              fontWeight: 600,
                              height: 20,
                              fontSize: "0.7rem",
                            }}
                          />
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ color: "#081F5C" }}>
                        {asset.roi}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ color: "#081F5C" }}>
                        {asset.feeApy}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ color: "#081F5C" }}>
                        {asset.liquidity}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Button
                        onClick={() => handleBorrowClick(asset)}
                        variant="contained"
                        sx={{
                          backgroundColor: "#081F5C",
                          color: "#ffffff",
                          borderRadius: "12px",
                          px: 3,
                          py: 1,
                          textTransform: "none",
                          fontSize: "0.875rem",
                          fontWeight: 600,
                          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                          "&:hover": {
                            backgroundColor: "#334EAC",
                          },
                        }}
                      >
                        Borrow
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Modal */}
        <Modal
          open={isModalOpen}
          onClose={handleCloseModal}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Box
            sx={{
              backgroundColor: "#ffffff",
              borderRadius: "24px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
              maxWidth: "500px",
              width: "90%",
              maxHeight: "90vh",
              p: 3,
              outline: "none",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Modal Header */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 2,
                flexShrink: 0,
              }}
            >
              <Typography
                variant="h5"
                sx={{ color: "#081F5C", fontWeight: 700 }}
              >
                Borrow {selectedAsset?.pool.token1} /{" "}
                {selectedAsset?.pool.token2}
              </Typography>
              <IconButton
                onClick={handleCloseModal}
                sx={{
                  color: "#7096D1",
                  "&:hover": {
                    color: "#081F5C",
                    backgroundColor: "rgba(51, 78, 172, 0.1)",
                  },
                }}
              >
                <Typography sx={{ fontSize: "1.5rem", fontWeight: 700 }}>
                  ×
                </Typography>
              </IconButton>
            </Box>

            {/* Pool Information - Scrollable */}
            <Box
              sx={{
                mb: 2,
                overflowY: "auto",
                flex: 1,
                pr: 1,
                "&::-webkit-scrollbar": {
                  width: "6px",
                },
                "&::-webkit-scrollbar-track": {
                  background: "#f1f1f1",
                  borderRadius: "10px",
                },
                "&::-webkit-scrollbar-thumb": {
                  background: "#888",
                  borderRadius: "10px",
                },
              }}
            >
              {/* Pool stats in grid */}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: 1.5,
                  mb: 2,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    p: 1.5,
                    backgroundColor: "#f3f4f6",
                    borderRadius: "12px",
                  }}
                >
                  <Typography
                    sx={{ color: "#7096D1", fontSize: "0.75rem", mb: 0.5 }}
                  >
                    Interest Rate
                  </Typography>
                  <Typography
                    sx={{
                      color: "#081F5C",
                      fontWeight: 600,
                      fontSize: "0.875rem",
                    }}
                  >
                    {selectedAsset?.feeApy}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    p: 1.5,
                    backgroundColor: "#f3f4f6",
                    borderRadius: "12px",
                  }}
                >
                  <Typography
                    sx={{ color: "#7096D1", fontSize: "0.75rem", mb: 0.5 }}
                  >
                    Collateral Factor
                  </Typography>
                  <Typography
                    sx={{
                      color: "#081F5C",
                      fontWeight: 600,
                      fontSize: "0.875rem",
                    }}
                  >
                    {selectedAsset?.collateralFactor}%
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    p: 1.5,
                    backgroundColor: "#f3f4f6",
                    borderRadius: "12px",
                    gridColumn: "span 2",
                  }}
                >
                  <Typography
                    sx={{ color: "#7096D1", fontSize: "0.75rem", mb: 0.5 }}
                  >
                    Available Liquidity
                  </Typography>
                  <Typography
                    sx={{
                      color: "#081F5C",
                      fontWeight: 600,
                      fontSize: "0.875rem",
                    }}
                  >
                    {selectedAsset?.liquidity}
                  </Typography>
                </Box>
              </Box>
              {address && (
                <>
                  {/* User stats in grid */}
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, 1fr)",
                      gap: 1.5,
                      mb: 2,
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        p: 1.5,
                        backgroundColor: "#f3f4f6",
                        borderRadius: "12px",
                      }}
                    >
                      <Typography
                        sx={{ color: "#7096D1", fontSize: "0.75rem", mb: 0.5 }}
                      >
                        Current Collateral
                      </Typography>
                      <Typography
                        sx={{
                          color: "#081F5C",
                          fontWeight: 600,
                          fontSize: "0.875rem",
                        }}
                      >
                        {currentCollateral !== null
                          ? currentCollateral
                          : "Loading..."}
                      </Typography>
                      <Typography
                        sx={{ color: "#7096D1", fontSize: "0.7rem", mt: 0.5 }}
                      >
                        {selectedAsset?.collateralTokenCode}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        p: 1.5,
                        backgroundColor: "#e8f4f8",
                        borderRadius: "12px",
                      }}
                    >
                      <Typography
                        sx={{ color: "#7096D1", fontSize: "0.75rem", mb: 0.5 }}
                      >
                        Wallet Balance
                      </Typography>
                      <Typography
                        sx={{
                          color: "#081F5C",
                          fontWeight: 600,
                          fontSize: "0.875rem",
                        }}
                      >
                        {walletBalance.balance || "0"}
                      </Typography>
                      <Typography
                        sx={{ color: "#7096D1", fontSize: "0.7rem", mt: 0.5 }}
                      >
                        {selectedAsset?.collateralTokenCode}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        p: 1.5,
                        backgroundColor:
                          borrowLimit && parseFloat(borrowLimit) > 0
                            ? "rgba(2, 135, 51, 0.1)"
                            : "rgba(220, 38, 38, 0.1)",
                        borderRadius: "12px",
                        gridColumn: "span 2",
                        border: `1px solid ${
                          borrowLimit && parseFloat(borrowLimit) > 0
                            ? "rgba(2, 135, 51, 0.3)"
                            : "rgba(220, 38, 38, 0.3)"
                        }`,
                      }}
                    >
                      <Typography
                        sx={{ color: "#7096D1", fontSize: "0.75rem", mb: 0.5 }}
                      >
                        Your Borrow Limit
                      </Typography>
                      <Typography
                        sx={{
                          color:
                            borrowLimit && parseFloat(borrowLimit) > 0
                              ? "#028733"
                              : "#dc2626",
                          fontWeight: 600,
                          fontSize: "0.875rem",
                        }}
                      >
                        ${borrowLimit !== null ? borrowLimit : "Loading..."}
                      </Typography>
                    </Box>
                  </Box>
                </>
              )}
            </Box>

            {/* Collateral Input - Required if no sufficient collateral */}
            {address && (
              <Box sx={{ mb: 2, flexShrink: 0 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Typography
                    sx={{
                      color: "#081F5C",
                      fontWeight: 600,
                      fontSize: "0.875rem",
                    }}
                  >
                    Add Collateral ({selectedAsset?.collateralTokenCode})
                    {borrowLimit && parseFloat(borrowLimit) === 0 && (
                      <span style={{ color: "#dc2626" }}> *</span>
                    )}
                  </Typography>
                  {currentCollateral !== null && (
                    <Typography
                      sx={{
                        color: "#7096D1",
                        fontSize: "0.75rem",
                      }}
                    ></Typography>
                  )}
                </Box>
                <TextField
                  fullWidth
                  type="number"
                  placeholder={
                    borrowLimit && parseFloat(borrowLimit) === 0
                      ? "0.00 (required)"
                      : "0.00 (optional)"
                  }
                  value={collateralToAdd}
                  onChange={(e) => setCollateralToAdd(e.target.value)}
                  disabled={isLoading}
                  required={
                    borrowLimit !== null && parseFloat(borrowLimit) === 0
                  }
                  error={
                    borrowLimit !== null &&
                    parseFloat(borrowLimit) === 0 &&
                    (!collateralToAdd || parseFloat(collateralToAdd) <= 0)
                  }
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "12px",
                      backgroundColor: "#f3f4f6",
                      "& fieldset": {
                        borderColor: "rgba(51, 78, 172, 0.2)",
                      },
                      "&:hover fieldset": {
                        borderColor: "#334EAC",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#081F5C",
                      },
                    },
                  }}
                />
                {borrowLimit &&
                  parseFloat(borrowLimit) === 0 &&
                  (!collateralToAdd || parseFloat(collateralToAdd) <= 0) && (
                    <Typography
                      sx={{
                        color: "#dc2626",
                        fontSize: "0.75rem",
                        mt: 1,
                      }}
                    >
                      You must add collateral to borrow
                    </Typography>
                  )}
                {collateralToAdd && parseFloat(collateralToAdd) > 0 && (
                  <Typography
                    sx={{
                      color: "#7096D1",
                      fontSize: "0.75rem",
                      mt: 1,
                      fontStyle: "italic",
                    }}
                  >
                    You will need to sign 3 transactions: approve, add
                    collateral, then borrow
                  </Typography>
                )}
              </Box>
            )}

            {/* Amount Input */}
            <Box sx={{ mb: 2, flexShrink: 0 }}>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
              >
                <Typography
                  sx={{
                    color: "#081F5C",
                    fontWeight: 600,
                    fontSize: "0.875rem",
                  }}
                >
                  Amount to Borrow
                </Typography>
                {borrowLimit && parseFloat(borrowLimit) > 0 && (
                  <Typography
                    sx={{
                      color: "#7096D1",
                      fontSize: "0.875rem",
                    }}
                  >
                    Limit: ${borrowLimit}
                  </Typography>
                )}
              </Box>
              <TextField
                fullWidth
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isLoading}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "12px",
                    backgroundColor: "#f3f4f6",
                    "& fieldset": {
                      borderColor: "rgba(51, 78, 172, 0.2)",
                    },
                    "&:hover fieldset": {
                      borderColor: "#334EAC",
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: "#081F5C",
                    },
                  },
                }}
              />
              {!address && (
                <Typography
                  sx={{
                    color: "#dc2626",
                    fontSize: "0.75rem",
                    mt: 1,
                  }}
                >
                  Please connect your wallet to borrow
                </Typography>
              )}
            </Box>

            {/* Action Buttons */}
            <Box sx={{ display: "flex", gap: 2, flexShrink: 0, mt: "auto" }}>
              <button
                onClick={handleCloseModal}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-[#081F5C] px-4 py-3 rounded-xl text-sm font-bold transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  void handleConfirm();
                }}
                disabled={
                  isLoading ||
                  !amount ||
                  parseFloat(amount) <= 0 ||
                  !address ||
                  (borrowLimit !== null &&
                    parseFloat(borrowLimit) === 0 &&
                    (!collateralToAdd || parseFloat(collateralToAdd) <= 0))
                }
                className="flex-1 bg-[#081F5C] hover:bg-[#12328a] disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-3 rounded-xl text-sm font-bold transition-colors duration-200"
              >
                {isLoading ? "Processing..." : "Confirm Borrow"}
              </button>
            </Box>
          </Box>
        </Modal>
      </Box>
    </ThemeProvider>
  );
};

export default BorrowTable;
