"use client";

import React from "react";
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
} from "@mui/material";
import { Info } from "@mui/icons-material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { useRouter } from "next/navigation";

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

const AssetBreakdown: React.FC = () => {
  const router = useRouter();

  const assets: AssetData[] = [
    {
      id: "123456",
      pool: { token1: "USDC", token2: "NVDA", fee: "1%" },
      roi: "0.07%",
      feeApy: "372.70%",
      liquidity: "$15.21k",
      isActive: true,
    },
    {
      id: "1234567",
      pool: { token1: "USDC", token2: "TSLA", fee: "0.01%" },
      roi: "0.00%",
      feeApy: "7.20%",
      liquidity: "$719.39k",
      isActive: true,
    },
    {
      id: "1234",
      pool: { token1: "USDC", token2: "GOOG", fee: "0.01%" },
      roi: "0.00%",
      feeApy: "7.20%",
      liquidity: "$719.39k",
      isActive: true,
    },
  ];

  return (
    <ThemeProvider theme={lightTheme}>
      <Box sx={{ width: "100%", px: 3, pt: 4 }}>
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
              </TableRow>
            </TableHead>
            <TableBody>
              {assets.map((asset) => (
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
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box sx={{ position: "relative", width: 40, height: 24 }}>
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
                        <Typography sx={{ color: "#081F5C", fontWeight: 500 }}>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
          <Button
            onClick={() => {
              router.push("/dashboard/pools");
            }}
            variant="contained"
            sx={{
              backgroundColor: "#081F5C",
              color: "#ffffff",
              borderRadius: "12px",
              px: 4,
              py: 1.5,
              textTransform: "none",
              fontSize: "1rem",
              fontWeight: 600,
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              "&:hover": {
                backgroundColor: "#334EAC",
              },
            }}
          >
            Checkout all Pools
          </Button>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default AssetBreakdown;
