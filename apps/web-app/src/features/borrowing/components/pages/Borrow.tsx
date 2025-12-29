"use client";

import React from "react";
import BorrowTable from "../ui/BorrowTable";

const Borrow: React.FC = () => {
  return (
    <div className="w-full">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-[#081F5C] tracking-tight mb-3">
            Borrow Assets
          </h1>
          <p className="text-[#7096D1] text-lg leading-relaxed">
            Borrow assets from liquidity pools
          </p>
        </div>

        {/* Borrow Table Component */}
        <BorrowTable />
      </div>
    </div>
  );
};

export default Borrow;
