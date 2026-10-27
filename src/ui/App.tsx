import { useEffect } from "react";
import { lerEscudos } from "../save/escudos";
import { Aviso } from "./componentes";
import { useLoja } from "./store";
import { AoVivo } from "./telas/AoVivo";
import { Checagem } from "./telas/Checagem";
import { Config } from "./telas/Config";
import { FimTemporada } from "./telas/FimTemporada";
import { Financas } from "./telas/Financas";
import { Historico } from "./telas/Historico";
import { Inicio } from "./telas/Inicio";
import { Mensagens } from "./telas/Mensagens";
import { NovoJogo } from "./telas/NovoJogo";
import { Principal } from "./telas/Principal";
import { Resultados } from "./telas/Resultados";
import { Trofeus } from "./telas/Trofeus";

function Sobreposta() {
  const s = useLoja((x) => x.sobreposta);
  if (!s) return null;
  switch (s.tipo) {
    case "ao-vivo": return <AoVivo vivas={s.vivas} />;
    case "resultados": return <Resultados partidas={s.partidas} />;
    case "fim-temporada": return <FimTemporada />;
    case "financas": return <Financas />;
    case "historico": return <Historico />;
    case "trofeus": return <Trofeus />;
    case "config": return <Config />;
    case "checagem": return <Checagem />;
    case "mensagens": return <Mensagens />;
  }
}

export default function App() {
  const tela = useLoja((s) => s.tela);
  // Escudos importados pelo usuário, guardados no aparelho.
  useEffect(() => {
    lerEscudos().then((escudos) => useLoja.setState({ escudos }), () => undefined);
  }, []);
  return (
    <>
      {tela === "inicio" && <Inicio />}
      {tela === "novo" && <NovoJogo />}
      {tela === "jogo" && (
        <>
          <Principal />
          <Sobreposta />
        </>
      )}
      <Aviso />
    </>
  );
}
