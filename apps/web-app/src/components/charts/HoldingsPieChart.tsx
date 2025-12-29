import React, { useState } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartEvent,
  ActiveElement,
} from "chart.js";
import { Pie } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

interface Holding {
  name: string;
  platform: string;
  value: number;
  color: string;
}

const HoldingsPieChart: React.FC = () => {
  const holdings: Holding[] = [
    {
      name: "Tesla",
      platform: "Stellar",
      value: 1345.67,
      color: "#334eac",
    },
    {
      name: "Apple",
      platform: "Stellar",
      value: 2150.32,
      color: "#5486c5",
    },
    {
      name: "Microsoft",
      platform: "Stellar",
      value: 1820.45,
      color: "#7a9fc9",
    },
    {
      name: "Amazon",
      platform: "Stellar",
      value: 950.89,
      color: "#9ab8db",
    },
    {
      name: "Google",
      platform: "Stellar",
      value: 1580.23,
      color: "#b8d1ed",
    },
  ];

  const [selectedHolding, setSelectedHolding] = useState<number | null>(null);

  const totalValue = holdings.reduce((sum, holding) => sum + holding.value, 0);

  const data = {
    labels: holdings.map((h) => h.name),
    datasets: [
      {
        data: holdings.map((h) => h.value),
        backgroundColor: holdings.map((h) =>
          selectedHolding !== null && holdings[selectedHolding].name !== h.name
            ? `${h.color}40`
            : h.color
        ),
        borderColor: "#1e3a8a",
        borderWidth: 3,
        hoverOffset: 15,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "#0f172a",
        titleColor: "#bfe1ff",
        bodyColor: "#bfe1ff",
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

  return (
    <div className="w-full rounded-3xl bg-[#1e3a8a] p-8">
      <h3 className="mb-6 text-xl font-semibold text-white">App holdings</h3>

      <div className="mb-6 h-64">
        <Pie data={data} options={options} />
      </div>

      <div className="mb-4 text-center">
        <p className="text-sm text-[#bfe1ff]/70">Total Portfolio Value</p>
        <p className="text-2xl font-bold text-white">
          ${totalValue.toFixed(2)}
        </p>
      </div>

      <div className="space-y-3">
        {holdings.map((holding, index) => (
          <div
            key={holding.name}
            onClick={() =>
              setSelectedHolding(selectedHolding === index ? null : index)
            }
            className={`cursor-pointer rounded-xl p-3 transition-all ${
              selectedHolding === index
                ? "bg-[#0f172a] shadow-lg"
                : "hover:bg-[#0f172a]/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="h-4 w-4 rounded-full"
                  style={{ backgroundColor: holding.color }}
                ></div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {holding.name}
                  </p>
                  <p className="text-xs text-[#bfe1ff]/70">
                    {holding.platform} •{" "}
                    {((holding.value / totalValue) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
              <span className="text-base font-semibold text-white">
                ${holding.value.toFixed(2)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HoldingsPieChart;
