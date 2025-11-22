import { Layout } from "@stellar/design-system";
import "./App.module.css";
import { Routes, Route, Outlet } from "react-router-dom";
import Home from "./pages/Home";
import Debugger from "./pages/Debugger.tsx";
import Navbar from "./components/modules/ui/Navbar.tsx";
import Dashboard from "./components/modules/dashboard/pages/Dashboard";
import Borrow from "./components/modules/borrow/pages/Borrow";
import Lend from "./components/modules/lend/pages/Lend";
import Pools from "./components/modules/pools/pages/Pools";
import PoolDetail from "./components/modules/pools/pages/PoolDetail";
import Swap from "./components/modules/swap/pages/Swap";
import Oracle from "./components/modules/oracle/pages/Oracle";
import AssetDetail from "./components/modules/oracle/pages/AssetDetail";

const AppLayout: React.FC = () => (
  <main
    style={{
      minHeight: "100vh",
      color: "#081F5C",
      overflowX: "hidden",
    }}
  >
    <Navbar />
    <Outlet />
    <Layout.Footer>
      <span style={{ color: "#334EAC" }}>
        © {new Date().getFullYear()} Neko Protocol. Licensed under the{" "}
        <a
          href="https://opensource.org/license/mit"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#0325cbff", fontWeight: "bold" }}
        >
          MIT License
        </a>
        .
      </span>
    </Layout.Footer>
  </main>
);

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/swap" element={<Swap />} />
        <Route path="/lend" element={<Lend />} />
        <Route path="/borrow" element={<Borrow />} />
        <Route path="/pools" element={<Pools />} />
        <Route path="/pools/:contractid" element={<PoolDetail />} />
        <Route path="/oracle" element={<Oracle />} />
        <Route path="/asset/:symbol" element={<AssetDetail />} />
        <Route path="/debug" element={<Debugger />} />
        <Route path="/debug/:contractName" element={<Debugger />} />
      </Route>
    </Routes>
  );
}

export default App;
