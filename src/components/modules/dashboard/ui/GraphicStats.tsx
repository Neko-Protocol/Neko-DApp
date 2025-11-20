import React from "react";

const GraphicStats: React.FC = () => {
  return (
    <div className="mx-auto flex w-full max-w-5xl gap-6 px-6 py-8">
      <div className="flex-1 rounded-3xl border border-[#334eac]/30 p-8">
        <h3 className="mb-6 text-xl font-semibold text-white">
          Volts performance
        </h3>

        <div className="mb-4 flex justify-end">
          <div className="rounded-full border border-[#334eac]/50 px-6 py-2">
            <span className="text-sm font-normal text-[#bfe1ff]/70">
              Day | Week | Month
            </span>
          </div>
        </div>

        <div className="relative h-64">
          <svg
            className="h-full w-full"
            viewBox="0 0 800 200"
            preserveAspectRatio="none"
          >
            <path
              d="M 0 150 Q 100 120, 200 110 T 400 90 T 600 100 T 800 80"
              fill="none"
              stroke="#334eac"
              strokeWidth="3"
            />
            <path
              d="M 0 180 Q 100 160, 200 150 T 400 130 T 600 80 T 800 20"
              fill="none"
              stroke="#5486c5"
              strokeWidth="3"
            />
            <path
              d="M 0 190 Q 100 180, 200 175 T 400 165 T 600 155 T 800 140"
              fill="none"
              stroke="#7a9fc9"
              strokeWidth="3"
            />
          </svg>
        </div>
      </div>

      <div className="w-96 rounded-3xl border border-[#334eac]/30 p-8">
        <h3 className="mb-6 text-xl font-semibold text-white">App holdings</h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full border-2 border-[#334eac]"></div>
              <div>
                <p className="text-sm font-semibold text-white">Tesla</p>
                <p className="text-xs font-normal text-[#bfe1ff]/70">Stellar</p>
              </div>
            </div>
            <span className="text-lg font-semibold text-white">$1,345.67</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full border-2 border-[#334eac]"></div>
              <div>
                <p className="text-sm font-semibold text-white">Tesla</p>
                <p className="text-xs font-normal text-[#bfe1ff]/70">Stellar</p>
              </div>
            </div>
            <span className="text-lg font-semibold text-white">$1,345.67</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full border-2 border-[#334eac]"></div>
              <div>
                <p className="text-sm font-semibold text-white">Tesla</p>
                <p className="text-xs font-normal text-[#bfe1ff]/70">Stellar</p>
              </div>
            </div>
            <span className="text-lg font-semibold text-white">$1,345.67</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full border-2 border-[#334eac]"></div>
              <div>
                <p className="text-sm font-semibold text-white">Tesla</p>
                <p className="text-xs font-normal text-[#bfe1ff]/70">Stellar</p>
              </div>
            </div>
            <span className="text-lg font-semibold text-white">$1,345.67</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full border-2 border-[#334eac]"></div>
              <div>
                <p className="text-sm font-semibold text-white">Tesla</p>
                <p className="text-xs font-normal text-[#bfe1ff]/70">Stellar</p>
              </div>
            </div>
            <span className="text-lg font-semibold text-white">$1,345.67</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GraphicStats;
