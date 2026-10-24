import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./ui/App";
import { useLoja } from "./ui/store";
import { ocuparTelaInteira } from "./ui/telaInteira";
import "./ui/estilo.css";

ocuparTelaInteira();

// Service worker: guarda o jogo no aparelho para abrir sem internet e se atualiza sozinho.
registerSW({
  immediate: true,
  onOfflineReady() {
    useLoja.getState().avisar("Jogo guardado no aparelho: já dá para jogar sem internet.");
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
