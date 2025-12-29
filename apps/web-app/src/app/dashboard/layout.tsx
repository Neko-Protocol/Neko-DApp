"use client";

import { ReactNode } from "react";
import { Layout } from "@stellar/design-system";
import Navbar from "@/components/navigation/Navbar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <main
      style={{
        minHeight: "100vh",
        color: "#081F5C",
        overflowX: "hidden",
      }}
    >
      <Navbar />
      {children}
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
}
