import React from "react";
import { Tooltip, IconButton } from "@mui/material";
import {
  Info,
  Warning,
  WaterDrop,
  AttachMoney,
  TrendingDown,
} from "@mui/icons-material";

interface SwapValueAnalysis {
  expectedOutput: number;
  actualOutput: number;
  differencePercent: number;
  isSuspiciouslyLow: boolean;
}

interface SwapValueWarningProps {
  analysis: SwapValueAnalysis;
  isLoadingPrice: boolean;
}

export const SwapValueWarning: React.FC<SwapValueWarningProps> = ({
  analysis,
  isLoadingPrice,
}) => {
  if (!analysis.isSuspiciouslyLow || isLoadingPrice) {
    return null;
  }

  return (
    <Tooltip
      title={
        <div className="max-w-xs p-3 bg-gray-900 border border-gray-700 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Warning sx={{ fontSize: 18, color: "#fbbf24" }} />
            <p className="font-semibold text-white text-sm">
              Why is the value low?
            </p>
          </div>
          <div className="space-y-2.5">
            <div className="flex items-start gap-2">
              <WaterDrop
                sx={{
                  fontSize: 16,
                  color: "#60a5fa",
                  marginTop: "2px",
                  flexShrink: 0,
                }}
              />
              <div className="text-xs text-gray-300">
                <span className="text-blue-400 font-semibold">
                  Limited Liquidity:
                </span>{" "}
                There may be low liquidity in this pair
              </div>
            </div>
            <div className="flex items-start gap-2">
              <AttachMoney
                sx={{
                  fontSize: 16,
                  color: "#f59e0b",
                  marginTop: "2px",
                  flexShrink: 0,
                }}
              />
              <div className="text-xs text-gray-300">
                <span className="text-amber-400 font-semibold">
                  Protocol Fees:
                </span>{" "}
                Commissions reduce the amount received
              </div>
            </div>
          </div>
          {analysis.differencePercent > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-700 flex items-center gap-2">
              <TrendingDown
                sx={{
                  fontSize: 16,
                  color: "#ef4444",
                }}
              />
              <p className="text-xs text-gray-400">
                Expected difference:{" "}
                <span className="text-red-400 font-semibold">
                  ~{analysis.differencePercent.toFixed(1)}%
                </span>
              </p>
            </div>
          )}
        </div>
      }
      arrow
      placement="right"
      componentsProps={{
        tooltip: {
          sx: {
            bgcolor: "transparent",
            padding: 0,
            boxShadow: "none",
            maxWidth: "none",
          },
        },
        popper: {
          sx: {
            "& .MuiTooltip-tooltip": {
              bgcolor: "transparent",
              padding: 0,
              boxShadow: "none",
            },
            "& .MuiTooltip-arrow": {
              color: "#374151",
            },
          },
        },
      }}
    >
      <IconButton
        size="small"
        sx={{
          padding: "2px",
          color: "#fbbf24",
          "&:hover": {
            color: "#f59e0b",
            backgroundColor: "rgba(251, 191, 36, 0.1)",
          },
        }}
      >
        <Info sx={{ fontSize: 18 }} />
      </IconButton>
    </Tooltip>
  );
};
