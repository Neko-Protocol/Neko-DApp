import React from "react";
import { Link } from "react-router-dom";
import { WalletButton } from "../../../../components/WalletButton";
import Neko from "/Neko.svg";

const Navbar: React.FC = () => {
  return (
    <header className="sticky top-0 z-40 mx-auto w-full max-w-7xl px-8 py-4 mt-5 bg-[#334eac] text-[#bfe1ff] shadow-[0_0_20px_rgba(51,78,172,0.4)] rounded-2xl">
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div className="flex flex-wrap items-center gap-10">
          <Link to="/">
            <img src={Neko} alt="Neko Logo" className="h-10 w-auto" />
          </Link>

          <div className="flex items-center gap-6">
            <Link
              to="/dashboard"
              className="text-m font-semibold text-white/80 hover:text-white"
            >
              Dashboard
            </Link>
            <Link
              to="/portfolio"
              className="text-m font-semibold text-white/80 hover:text-white"
            >
              Portfolio
            </Link>
            <Link
              to="/swap"
              className="text-m font-semibold text-white/80 hover:text-white"
            >
              Swap
            </Link>
          </div>
        </div>

        <WalletButton />
      </div>
    </header>
  );
};

export default Navbar;
