import React, { useState } from "react";
import { Modal, Box, Typography, IconButton, TextField } from "@mui/material";

interface PoolData {
  id: string;
  name: string;
  token1: string;
  token2: string;
  fee: string;
  roi: string;
  feeApy: string;
  liquidity: string;
  isActive: boolean;
}

const Lend: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const pools: PoolData[] = [
    {
      id: "123456",
      name: "USDC / NVDA",
      token1: "USDC",
      token2: "NVDA",
      fee: "1%",
      roi: "0.07%",
      feeApy: "372.70%",
      liquidity: "$15.21k",
      isActive: true,
    },
    {
      id: "1234567",
      name: "USDC / TSLA",
      token1: "USDC",
      token2: "TSLA",
      fee: "0.01%",
      roi: "0.00%",
      feeApy: "7.20%",
      liquidity: "$719.39k",
      isActive: true,
    },
    {
      id: "1234",
      name: "USDC / GOOG",
      token1: "USDC",
      token2: "GOOG",
      fee: "0.01%",
      roi: "0.00%",
      feeApy: "7.20%",
      liquidity: "$719.39k",
      isActive: true,
    },
    {
      id: "789012",
      name: "XLM / USDC",
      token1: "XLM",
      token2: "USDC",
      fee: "0.3%",
      roi: "0.15%",
      feeApy: "45.50%",
      liquidity: "$1.2M",
      isActive: true,
    },
  ];

  const [selectedPool, setSelectedPool] = useState<PoolData>(pools[0]);

  const handleLendClick = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handlePoolSelect = (pool: PoolData) => {
    setSelectedPool(pool);
    setIsDropdownOpen(false);
  };

  return (
    <div className="w-full min-h-screen">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-[#081F5C] tracking-tight mb-3">
            Lend to Pools
          </h1>
          <p className="text-[#7096D1] text-lg leading-relaxed">
            Supply liquidity to pools and earn interest on your assets
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-[#334EAC]/30 overflow-visible">
          {/* Header with Dropdown */}
          <div className="bg-[#f3f4f6] p-6 border-b border-[#334EAC]/20 rounded-t-3xl">
            <div className="relative z-10">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full flex items-center justify-between bg-white hover:bg-gray-50 border border-[#334EAC]/30 rounded-2xl px-6 py-4 transition-all duration-200 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-6">
                    <div className="absolute left-0 w-6 h-6 rounded-full bg-[#39bfb7] border-2 border-white flex items-center justify-center text-white text-xs font-bold shadow-md">
                      {selectedPool.token1[0]}
                    </div>
                    <div className="absolute left-4 w-6 h-6 rounded-full bg-[#68f9f2] border-2 border-white flex items-center justify-center text-[#081F5C] text-xs font-bold shadow-md">
                      {selectedPool.token2[0]}
                    </div>
                  </div>
                  <div className="text-left">
                    <h2 className="text-[#081F5C] text-xl font-bold">
                      {selectedPool.name}
                    </h2>
                    <span className="inline-block bg-purple-600 text-white text-xs font-semibold px-2 py-0.5 rounded-md mt-1">
                      V2
                    </span>
                  </div>
                </div>
                <svg
                  className={`w-5 h-5 text-[#081F5C] transition-transform duration-200 ${
                    isDropdownOpen ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute top-full mt-2 w-full bg-white border border-[#334EAC]/30 rounded-2xl shadow-xl z-50 overflow-hidden">
                  {pools.map((pool) => (
                    <button
                      key={pool.id}
                      onClick={() => handlePoolSelect(pool)}
                      className="w-full flex items-center gap-3 px-6 py-4 hover:bg-[#f3f4f6] transition-colors duration-200 border-b border-[#334EAC]/10 last:border-b-0"
                    >
                      <div className="relative w-10 h-6">
                        <div className="absolute left-0 w-6 h-6 rounded-full bg-[#39bfb7] border-2 border-white flex items-center justify-center text-white text-xs font-bold shadow-md">
                          {pool.token1[0]}
                        </div>
                        <div className="absolute left-4 w-6 h-6 rounded-full bg-[#68f9f2] border-2 border-white flex items-center justify-center text-[#081F5C] text-xs font-bold shadow-md">
                          {pool.token2[0]}
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="text-[#081F5C] font-semibold">
                          {pool.name}
                        </p>
                        <span className="inline-block bg-purple-600 text-white text-xs font-semibold px-2 py-0.5 rounded-md">
                          V2
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pool Information */}
          <div className="p-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-[#f3f4f6] rounded-xl p-4 border border-[#334EAC]/20">
                <p className="text-[#7096D1] text-sm mb-2">ROI</p>
                <p className="text-[#081F5C] text-2xl font-bold">
                  {selectedPool.roi}
                </p>
              </div>
              <div className="bg-[#f3f4f6] rounded-xl p-4 border border-[#334EAC]/20">
                <p className="text-[#7096D1] text-sm mb-2">Liquidity</p>
                <p className="text-[#081F5C] text-2xl font-bold">
                  {selectedPool.liquidity}
                </p>
              </div>
              <div className="bg-[#f3f4f6] rounded-xl p-4 border border-[#334EAC]/20">
                <p className="text-[#7096D1] text-sm mb-2">Fee APY</p>
                <p className="text-[#081F5C] text-2xl font-bold">
                  {selectedPool.feeApy}
                </p>
              </div>
            </div>

            {/* Lend Button */}
            <button
              onClick={handleLendClick}
              className="w-full bg-[#081F5C] hover:bg-[#12328a] text-white px-6 py-4 rounded-2xl text-lg font-bold transition-all duration-200 shadow-lg"
            >
              Lend
            </button>
          </div>
        </div>
      </div>

      {/* Lend Modal */}
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
            p: 4,
            outline: "none",
          }}
        >
          {/* Modal Header */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 3,
            }}
          >
            <Typography variant="h5" sx={{ color: "#081F5C", fontWeight: 700 }}>
              Lend to {selectedPool?.token1} / {selectedPool?.token2}
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

          {/* Pool Information */}
          <Box sx={{ mb: 3 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                mb: 2,
                p: 2,
                backgroundColor: "#f3f4f6",
                borderRadius: "12px",
              }}
            >
              <Typography sx={{ color: "#7096D1", fontSize: "0.875rem" }}>
                Pool ID
              </Typography>
              <Typography sx={{ color: "#081F5C", fontWeight: 600 }}>
                {selectedPool?.id}
              </Typography>
            </Box>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                mb: 2,
                p: 2,
                backgroundColor: "#f3f4f6",
                borderRadius: "12px",
              }}
            >
              <Typography sx={{ color: "#7096D1", fontSize: "0.875rem" }}>
                Fee APY
              </Typography>
              <Typography sx={{ color: "#081F5C", fontWeight: 600 }}>
                {selectedPool?.feeApy}
              </Typography>
            </Box>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                mb: 2,
                p: 2,
                backgroundColor: "#f3f4f6",
                borderRadius: "12px",
              }}
            >
              <Typography sx={{ color: "#7096D1", fontSize: "0.875rem" }}>
                Total Liquidity
              </Typography>
              <Typography sx={{ color: "#081F5C", fontWeight: 600 }}>
                {selectedPool?.liquidity}
              </Typography>
            </Box>
          </Box>

          {/* Amount Input */}
          <Box sx={{ mb: 3 }}>
            <Typography
              sx={{
                color: "#081F5C",
                fontWeight: 600,
                mb: 1,
                fontSize: "0.875rem",
              }}
            >
              Amount to Lend
            </Typography>
            <TextField
              fullWidth
              type="number"
              placeholder="0.00"
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
          </Box>

          {/* Action Buttons */}
          <Box sx={{ display: "flex", gap: 2 }}>
            <button
              onClick={handleCloseModal}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-[#081F5C] px-4 py-3 rounded-xl text-sm font-bold transition-colors duration-200"
            >
              Cancel
            </button>
            <button className="flex-1 bg-[#081F5C] hover:bg-[#12328a] text-white px-4 py-3 rounded-xl text-sm font-bold transition-colors duration-200">
              Confirm Lend
            </button>
          </Box>
        </Box>
      </Modal>
    </div>
  );
};

export default Lend;
