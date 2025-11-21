import React from "react";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

const MainStats: React.FC = () => {
  const holdings = [
    { name: "Tesla", value: 1345.67 },
    { name: "Apple", value: 2150.32 },
    { name: "Microsoft", value: 1820.45 },
    { name: "Amazon", value: 950.89 },
    { name: "Google", value: 1580.23 },
  ];

  const totalValue = holdings.reduce((sum, holding) => sum + holding.value, 0);

  const chartData = {
    labels: holdings.map((h) => h.name),
    datasets: [
      {
        data: holdings.map((h) => h.value),
        backgroundColor: [
          "#68f9f2ff", // Planetary
          "#31c1c6ff", // Slightly lighter Planetary
          "#1dd1b3ff", // Darker Planetary
          "#1daca9ff", // Planetary
          "#2bb8d7ff", // Slightly lighter Planetary
        ],
        borderWidth: 3,
        borderColor: "#294cab",
        hoverOffset: 8,
        hoverBorderWidth: 4,
        hoverBorderColor: "#FFF9F0",
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right" as const,
        labels: {
          color: "#BAD6EB",
          usePointStyle: true,
          pointStyle: "circle",
          padding: 20,
          font: {
            size: 12,
            family: "Inter",
          },
        },
      },
      tooltip: {
        backgroundColor: "rgba(8, 31, 92, 0.95)",
        titleColor: "#FFF9F0",
        bodyColor: "#BAD6EB",
        borderColor: "#7096D1",
        borderWidth: 2,
        padding: 16,
        cornerRadius: 8,
        callbacks: {
          label: function (context: { parsed: number }) {
            const value = context.parsed;
            return ` $${value.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`;
          },
        },
      },
    },
    cutout: "70%",
  };

  return (
    <div className="w-full px-6 py-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Card: Portfolio Stats */}
        <div className="md:col-span-2 rounded-3xl bg-[#294cab] p-8 shadow-lg border border-[#334EAC]/90 relative overflow-hidden flex flex-col justify-between min-h-[320px]">
          {/* Neko Thumbs Up Background Image */}
          <img
            src="/Neko_Thumbs_Up.png"
            alt="Neko Thumbs Up"
            className="absolute right-5 bottom-3 h-85 w-auto object-contain opacity-30 pointer-events-none"
          />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-xl font-bold text-[#FFF9F0] tracking-wide">
                Portfolio
              </h2>
            </div>

            <div className="mb-8">
              <p className="text-[#7096D1] text-xs font-bold uppercase tracking-widest mb-2 opacity-80">
                Total Balance
              </p>
              <h1 className="text-5xl font-bold text-[#FFF9F0] tracking-tight">
                $
                {totalValue.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </h1>
              <div className="flex items-center gap-2 mt-3">
                <div className="flex items-center bg-[#39bfb7]/10 px-2 py-1 rounded-lg">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-[#39bfb7] mr-1"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-[#39bfb7] font-bold text-sm">
                    +2.5%
                  </span>
                </div>
                <span className="text-[#7096D1] text-sm font-medium">
                  past 24h
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-[#13389c]/90 rounded-2xl p-4 text-center border border-[#334EAC]/20 backdrop-blur-sm">
                <p className="text-[#FFF9F0] font-bold text-lg mb-1">
                  +$120.28
                </p>
                <p className="text-[#7096D1] text-[10px] font-bold uppercase tracking-wider opacity-70">
                  Returns last week
                </p>
              </div>
              <div className="bg-[#13389c]/90 rounded-2xl p-4 text-center border border-[#334EAC]/20 backdrop-blur-sm">
                <p className="text-[#FFF9F0] font-bold text-lg mb-1">7.8%</p>
                <p className="text-[#7096D1] text-[10px] font-bold uppercase tracking-wider opacity-70">
                  Avg. Pool Performance
                </p>
              </div>
            </div>
          </div>

          {/* Decorative background element */}
          <div className="absolute -right-10 -top-10 w-64 h-64 bg-[#334EAC]/20 rounded-full blur-3xl pointer-events-none"></div>
        </div>

        {/* Right Card: App Holdings Graph */}
        <div className="rounded-3xl bg-[#294cab] p-8 shadow-lg border border-[#334EAC]/50 relative overflow-hidden flex flex-col min-h-[320px]">
          <div className="relative z-10 flex-1 flex flex-col">
            <h2 className="text-xl font-bold text-[#FFF9F0] mb-6 tracking-wide">
              App Holdings
            </h2>
            <div className="flex-1 relative min-h-[200px]">
              <Doughnut data={chartData} options={chartOptions} />
              {/* Center Text Overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pr-[100px]">
                {/* pr-[100px] to offset the legend on the right */}
                <span className="text-[#BAD6EB] text-xs font-medium uppercase tracking-wide">
                  Total
                </span>
                <span className="text-[#FFF9F0] text-2xl font-bold mt-1">
                  $
                  {totalValue.toLocaleString("en-US", {
                    notation: "compact",
                    maximumFractionDigits: 1,
                  })}
                </span>
              </div>
            </div>
          </div>
          {/* Decorative background element */}
          <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-[#334EAC]/10 rounded-full blur-2xl pointer-events-none"></div>
        </div>
      </div>
    </div>
  );
};

export default MainStats;
