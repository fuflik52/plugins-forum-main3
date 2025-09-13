import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import "./styles/performance.css";
import App from "./App.tsx";
import { PluginDetail } from "./components/PluginDetail.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/plugin/:pluginId" element={<PluginDetail />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
