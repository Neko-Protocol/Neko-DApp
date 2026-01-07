import React from "react";

interface TWAPOrderFormProps {
  twapParts: string;
  onTwapPartsChange: (parts: string) => void;
  twapFrequency: string;
  onTwapFrequencyChange: (frequency: string) => void;
}

export const TWAPOrderForm: React.FC<TWAPOrderFormProps> = ({
  twapParts,
  onTwapPartsChange,
  twapFrequency,
  onTwapFrequencyChange,
}) => {
  return (
    <div className="mt-4 space-y-3">
      <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-4">
        <label className="text-sm font-semibold text-gray-400 block mb-3">
          Number of Parts
        </label>
        <input
          type="number"
          min="2"
          max="100"
          value={twapParts}
          onChange={(e) => onTwapPartsChange(e.target.value)}
          className="w-full bg-transparent text-white text-2xl font-bold outline-none"
        />
        <div className="text-xs text-gray-400 mt-2">
          How many parts to split your order into (2-100)
        </div>
      </div>

      <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-4">
        <label className="text-sm font-semibold text-gray-400 block mb-3">
          Time Between Parts
        </label>
        <select
          value={twapFrequency}
          onChange={(e) => onTwapFrequencyChange(e.target.value)}
          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white outline-none"
        >
          <option value="900">15 minutes</option>
          <option value="1800">30 minutes</option>
          <option value="3600">1 hour</option>
          <option value="7200">2 hours</option>
          <option value="21600">6 hours</option>
          <option value="43200">12 hours</option>
          <option value="86400">1 day</option>
        </select>
        <div className="text-xs text-gray-400 mt-2">
          How often each part of your order executes
        </div>
      </div>
    </div>
  );
};
