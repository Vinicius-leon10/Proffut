import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./ui/App";
import { guardarEscudos } from "./ui/guardarEscudos";
import { useLoja } from "./ui/store";
import { ocuparTelaInteira } from "./ui/telaInteira";
// Letra serifada dos títulos (só o alfabeto latino, que tem os acentos do português), guardada com o app.
import "@fontsource/dm-serif-display/latin-400.css";
import "./ui/estilo.css";

ocuparTelaInteira();

// Service worker: guarda o jogo no aparelho para abrir sem internet e se atualiza sozinho.
registerSW({
  immediate: true,
  onOfflineReady() {
    useLoja.getState().avisarDepois("Jogo guardado no aparelho: já dá para jogar sem internet.");
  },
});
// Os escudos ficam fora da fila do service worker (R76): com ele pronto, ele baixa os que faltam no aparelho.
void guardarEscudos();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
