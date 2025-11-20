import React from "react";
import { Link } from "react-router-dom";
import { WalletButton } from "../../../../components/WalletButton";
import Neko from "/Neko.svg";

const Navbar: React.FC = () => {
  return (
    <header className="sticky top-4 z-40 mx-auto w-full max-w-5xl rounded-[999px] px-6 py-4 bg-[#334eac] text-[#bfe1ff] sm:px-8">
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
