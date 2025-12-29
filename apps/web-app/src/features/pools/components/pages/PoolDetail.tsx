"use client";

import React from "react";
import { use } from "react";

interface PoolDetailProps {
  params: Promise<{ contractid: string }>;
}

const PoolDetail: React.FC<PoolDetailProps> = ({ params }) => {
  const { contractid } = use(params);

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-lg border border-[#334EAC]/30 p-8">
        <h1 className="text-3xl font-bold text-[#081F5C] mb-4">Pool Details</h1>
        <p className="text-[#7096D1] mb-2">Contract ID:</p>
        <div className="bg-[#f3f4f6] text-[#334EAC] font-mono px-4 py-2 rounded-lg break-all mb-6 border border-[#334EAC]/10">
          {contractid}
        </div>
        {/* Add more pool details here as needed */}
      </div>
    </div>
  );
};

export default PoolDetail;
