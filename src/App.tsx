import { Layout } from "@stellar/design-system";
import "./App.module.css";
import { Routes, Route, Outlet } from "react-router-dom";
import Home from "./pages/Home";
import Debugger from "./pages/Debugger.tsx";
import Navbar from "./components/modules/ui/Navbar.tsx";
import Dashboard from "./components/modules/dashboard/pages/Dashboard.tsx";
import Portfolio from "./components/modules/portfolio/pages/Portfolio.tsx";
import Swap from "./components/modules/swap/pages/Swap.tsx";

const AppLayout: React.FC = () => (
  <main
    style={{
      minHeight: "100vh",
      color: "#081F5C",
    }}
  >
    {/* aqui le cambiamos el background luego */}
    <Navbar />
    <Outlet />
    <Layout.Footer>
      <span style={{ color: "#334EAC" }}>
        © {new Date().getFullYear()} My App. Licensed under the{" "}
        <a
          href="http://www.apache.org/licenses/LICENSE-2.0"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#39bfb7", fontWeight: "bold" }}
        >
          Apache License, Version 2.0
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
        <Route path="/portfolio" element={<Portfolio />} />
        <Route path="/swap" element={<Swap />} />
        <Route path="/debug" element={<Debugger />} />
        <Route path="/debug/:contractName" element={<Debugger />} />
      </Route>
    </Routes>
  );
}

export default App;
