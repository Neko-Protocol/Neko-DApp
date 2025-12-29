"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement,
  ChartEvent,
  ActiveElement,
} from "chart.js";
import { Line, Pie } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
);

type TimeFilter = "day" | "week" | "month";

interface Holding {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

const PerformanceChart: React.FC = () => {
  const pathname = usePathname();
  const isPortfolioPage = pathname === "/portfolio";
  const isDashboardPage = pathname === "/dashboard";
  const [activeFilter, setActiveFilter] = useState<TimeFilter>("month");
  const [visibleLines, setVisibleLines] = useState({
    line1: true,
    line2: true,
    line3: true,
  });
  const [selectedHolding, setSelectedHolding] = useState<number | null>(null);

  // Holdings data for pie chart
  const holdings: Holding[] = [
    { name: "Tesla", value: 1345.67, color: "#334EAC", percentage: 15.2 },
    { name: "Apple", value: 2150.32, color: "#7096D1", percentage: 24.3 },
    { name: "Microsoft", value: 1820.45, color: "#334EAC", percentage: 20.6 },
    { name: "Amazon", value: 950.89, color: "#7096D1", percentage: 10.8 },
    { name: "Google", value: 1580.23, color: "#334EAC", percentage: 17.9 },
    { name: "Others", value: 1000.0, color: "#7096D1", percentage: 11.2 },
  ];

  const totalValue = holdings.reduce((sum, holding) => sum + holding.value, 0);

  const toggleLine = (line: keyof typeof visibleLines) => {
    setVisibleLines((prev) => ({
      ...prev,
      [line]: !prev[line],
    }));
  };

  const generateData = (filter: TimeFilter) => {
    const labels =
      filter === "day"
        ? ["0h", "4h", "8h", "12h", "16h", "20h", "24h"]
        : filter === "week"
          ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
          : [
              "Jan",
              "Feb",
              "Mar",
              "Apr",
              "May",
              "Jun",
              "Jul",
              "Aug",
              "Sep",
              "Oct",
              "Nov",
              "Dec",
            ];

    const datasets = [
      {
        label: "Portfolio Value",
        data:
          filter === "day"
            ? [150, 120, 110, 90, 100, 80, 75]
            : filter === "week"
              ? [150, 130, 115, 95, 105, 85, 80]
              : [150, 140, 130, 110, 105, 95, 90, 85, 80, 75, 70, 65],
        borderColor: "#334eac",
        backgroundColor: "rgba(51, 78, 172, 0.1)",
        tension: 0.4,
        hidden: !visibleLines.line1,
      },
      {
        label: "Trading Volume",
        data:
          filter === "day"
            ? [180, 160, 150, 130, 80, 20, 10]
            : filter === "week"
              ? [180, 165, 155, 135, 90, 40, 20]
              : [190, 185, 180, 175, 165, 150, 130, 115, 100, 80, 60, 40],
        borderColor: "#5486c5",
        backgroundColor: "rgba(84, 134, 197, 0.1)",
        tension: 0.4,
        hidden: !visibleLines.line2,
      },
      {
        label: "Market Average",
        data:
          filter === "day"
            ? [190, 180, 175, 165, 155, 140, 135]
            : filter === "week"
              ? [190, 185, 180, 170, 160, 145, 140]
              : [200, 195, 190, 185, 180, 175, 170, 165, 160, 155, 150, 145],
        borderColor: "#7a9fc9",
        backgroundColor: "rgba(122, 159, 201, 0.1)",
        tension: 0.4,
        hidden: !visibleLines.line3,
      },
    ];

    return { labels, datasets };
  };

  // Pie chart data
  const pieData = {
    labels: holdings.map((h) => h.name),
    datasets: [
      {
        data: holdings.map((h) => h.value),
        backgroundColor: holdings.map((h) =>
          selectedHolding !== null && holdings[selectedHolding].name !== h.name
            ? `${h.color}40`
            : h.color
        ),
        borderColor: "#081F5C",
        borderWidth: 3,
        hoverOffset: 15,
      },
    ],
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: "bottom" as const,
        labels: {
          color: "#7096D1",
          padding: 15,
          font: {
            size: 12,
          },
          usePointStyle: true,
          pointStyle: "circle",
        },
      },
      tooltip: {
        backgroundColor: "#081F5C",
        titleColor: "#FFF9F0",
        bodyColor: "#7096D1",
        borderColor: "#334eac",
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: function (context: { parsed: number }) {
            const value = context.parsed;
            const percentage = ((value / totalValue) * 100).toFixed(1);
            return `$${value.toFixed(2)} (${percentage}%)`;
          },
        },
      },
    },
    onHover: (event: ChartEvent, elements: ActiveElement[]) => {
      const target = event.native?.target as HTMLElement | undefined;
      if (target?.style) {
        target.style.cursor = elements.length ? "pointer" : "default";
      }
    },
    onClick: (_event: ChartEvent, elements: ActiveElement[]) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        setSelectedHolding(selectedHolding === index ? null : index);
      } else {
        setSelectedHolding(null);
      }
    },
  };

  const data = generateData(activeFilter);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: "bottom" as const,
        labels: {
          color: "#7096D1",
          padding: 20,
          font: {
            size: 12,
          },
          usePointStyle: true,
          pointStyle: "circle",
        },
      },
      tooltip: {
        backgroundColor: "#081F5C",
        titleColor: "#FFF9F0",
        bodyColor: "#7096D1",
        borderColor: "#334eac",
        borderWidth: 1,
        padding: 12,
        displayColors: true,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: "#7096D1",
        },
      },
      y: {
        grid: {
          color: "#334EAC30",
        },
        ticks: {
          color: "#7096D1",
        },
      },
    },
  };

  return (
    <div className="flex-1 rounded-3xl bg-[#081F5C] p-8 border border-[#334EAC]/30">
      <h3 className="mb-6 text-xl font-semibold text-[#FFF9F0]">
        {isPortfolioPage ? "Portfolio Distribution" : "Volts performance"}
      </h3>

      {isDashboardPage && (
        <>
          <div className="mb-6 flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => toggleLine("line1")}
                className={`rounded-full px-4 py-2 text-sm transition-all ${
                  visibleLines.line1
                    ? "bg-[#334EAC] text-[#FFF9F0]"
                    : "bg-[#334EAC]/20 text-[#7096D1]"
                }`}
              >
                Portfolio
              </button>
              <button
                onClick={() => toggleLine("line2")}
                className={`rounded-full px-4 py-2 text-sm transition-all ${
                  visibleLines.line2
                    ? "bg-[#7096D1] text-[#FFF9F0]"
                    : "bg-[#334EAC]/20 text-[#7096D1]"
                }`}
              >
                Volume
              </button>
              <button
                onClick={() => toggleLine("line3")}
                className={`rounded-full px-4 py-2 text-sm transition-all ${
                  visibleLines.line3
                    ? "bg-[#334EAC] text-[#FFF9F0]"
                    : "bg-[#334EAC]/20 text-[#7096D1]"
                }`}
              >
                Market
              </button>
            </div>

            <div className="rounded-full bg-[#334EAC]/20 px-6 py-2">
              <button
                onClick={() => setActiveFilter("day")}
                className={`text-sm font-normal transition-colors ${
                  activeFilter === "day"
                    ? "text-[#FFF9F0]"
                    : "text-[#7096D1] hover:text-[#FFF9F0]"
                }`}
              >
                Day
              </button>
              <span className="mx-2 text-[#7096D1]">|</span>
              <button
                onClick={() => setActiveFilter("week")}
                className={`text-sm font-normal transition-colors ${
                  activeFilter === "week"
                    ? "text-[#FFF9F0]"
                    : "text-[#7096D1] hover:text-[#FFF9F0]"
                }`}
              >
                Week
              </button>
              <span className="mx-2 text-[#7096D1]">|</span>
              <button
                onClick={() => setActiveFilter("month")}
                className={`text-sm font-normal transition-colors ${
                  activeFilter === "month"
                    ? "text-[#FFF9F0]"
                    : "text-[#7096D1] hover:text-[#FFF9F0]"
                }`}
              >
                Month
              </button>
            </div>
          </div>

          <div className="relative h-64">
            <Line data={data} options={options} />
          </div>
        </>
      )}

      {isPortfolioPage && (
        <>
          <div className="mb-4 text-center">
            <p className="text-sm text-[#7096D1]">Total Portfolio Value</p>
            <p className="text-3xl font-bold text-[#FFF9F0]">
              $
              {totalValue.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>

          <div className="relative h-80 mb-4">
            <Pie data={pieData} options={pieOptions} />
          </div>
        </>
      )}
    </div>
  );
};

export default PerformanceChart;
