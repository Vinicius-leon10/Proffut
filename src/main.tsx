import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./ui/App";
import "./ui/estilo.css";

// Service worker: guarda o jogo no aparelho para abrir sem internet e se atualiza sozinho.
registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
