import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import "./styles/performance.css";
import App from "./App.tsx";
import { PluginDetail } from "./components/PluginDetail.tsx";
import { AdminPanel } from "./components/AdminPanel";

import { ThemeProvider } from "./contexts/ThemeContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/plugin/:pluginId" element={<PluginDetail />} />
          <Route path="/admin-secret-panel-2024" element={<AdminPanel />} />

        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>
);
