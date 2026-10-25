import { useEffect, useRef, useState } from "react";
import { armazenamentoPersistente, exportarArquivo, importarTexto, pedirArmazenamentoPersistente, salvar, type Espaco } from "../../save/salvamento";
import { Cartao, Opcoes, Topo } from "../componentes";
import { useJogo, useLoja } from "../store";

export function Config() {
  const estado = useJogo();
  const { fechar, atualizar, avisar, sair, iniciar, abrir } = useLoja();
  const [persistente, setPersistente] = useState<boolean | null>(null);
  const arquivo = useRef<HTMLInputElement>(null);

  useEffect(() => { armazenamentoPersistente().then(setPersistente); }, []);

  const salvarEm = async (espaco: Espaco) => {
    try {
      await salvar(espaco, estado);
      avisar(`Jogo salvo no espaço ${espaco}.`);
    } catch {
      avisar("Não foi possível salvar no aparelho.");
    }
  };

  const exportar = async () => {
    try {
      const r = await exportarArquivo(estado);
      if (r === "baixado") avisar("Arquivo do save baixado.");
      if (r === "compartilhado") avisar("Save exportado.");
    } catch {
      avisar("Não foi possível exportar.");
    }
  };

  const importar = async (f: File | undefined) => {
    if (!f) return;
    try {
      const novo = importarTexto(await f.text());
      if (!confirm("Carregar este save? O jogo atual continua salvo no espaço automático só até a próxima jogada.")) return;
      iniciar(novo);
      avisar("Save importado!");
    } catch (e) {
      avisar((e as Error).message);
    }
  };

  return (
    <div className="tela-cheia">
      <Topo titulo="Configurações" aoVoltar={fechar} />
      <div className="conteudo">
        <Cartao titulo="Partida ao vivo">
          <p className="pequeno fraco" style={{ marginBottom: 8 }}>Velocidade inicial do relógio</p>
          <Opcoes
            opcoes={[{ valor: "1", rotulo: "1x" }, { valor: "2", rotulo: "2x" }]}
            valor={estado.config.velocidade === 1 ? "1" : "2"}
            aoMudar={(v) => { estado.config.velocidade = v === "1" ? 1 : 2; atualizar(); }}
          />
        </Cartao>

        <Cartao titulo="Sons da partida">
          <p className="pequeno fraco" style={{ marginBottom: 8 }}>Apito do árbitro, torcida e narrador no gol e no pênalti</p>
          <Opcoes
            opcoes={[{ valor: "ligados", rotulo: "Ligados" }, { valor: "desligados", rotulo: "Desligados" }]}
            valor={estado.config.som === false ? "desligados" : "ligados"}
            aoMudar={(v) => { estado.config.som = v === "ligados"; atualizar(); }}
          />
          <p className="mini muito-fraco" style={{ marginTop: 8 }}>No iPhone, com a chave do silencioso ligada, o apito e a torcida não tocam.</p>
        </Cartao>

        <Cartao titulo="Salvar">
          <p className="pequeno fraco" style={{ marginBottom: 8 }}>
            O jogo salva sozinho no aparelho a cada ação. Use os espaços para guardar momentos da carreira.
          </p>
          <div className="linha">
            {(["1", "2", "3"] as Espaco[]).map((e) => (
              <button key={e} className="botao pequeno cresce" onClick={() => salvarEm(e)}>Espaço {e}</button>
            ))}
          </div>
        </Cartao>

        <Cartao titulo="Backup em arquivo">
          <p className="pequeno fraco" style={{ marginBottom: 8 }}>
            Se você apagar os dados do Safari ou remover o ícone da tela inicial, o save some. Exporte de vez em quando
            (no iPhone, escolha “Salvar em Arquivos”). O arquivo também serve para levar o jogo para outro aparelho.
          </p>
          <div className="coluna">
            <button className="botao primario cheio" onClick={exportar}>Exportar save</button>
            <button className="botao cheio" onClick={() => arquivo.current?.click()}>Importar save</button>
            <input ref={arquivo} type="file" className="oculto" onChange={(e) => importar(e.target.files?.[0])} />
          </div>
        </Cartao>

        <Cartao titulo="Checagem do jogo">
          <p className="pequeno fraco" style={{ marginBottom: 8 }}>
            Confere se o jogo está guardado para abrir sem internet, se o salvamento funciona e se o save está íntegro. Funciona sem internet.
          </p>
          <button className="botao cheio" onClick={() => abrir({ tipo: "checagem" })}>Verificar o jogo</button>
        </Cartao>

        <Cartao titulo="Armazenamento">
          <p className="pequeno">
            {persistente === null ? "Verificando..." : persistente ? "O navegador garantiu que não vai apagar os dados do jogo." : "O navegador ainda pode apagar os dados se faltar espaço."}
          </p>
          {persistente === false && (
            <button className="botao pequeno" style={{ marginTop: 8 }} onClick={async () => setPersistente(await pedirArmazenamentoPersistente())}>Pedir para guardar</button>
          )}
        </Cartao>

        <button className="botao cheio" onClick={() => { sair(); }}>Voltar ao menu inicial</button>
        <p className="mini muito-fraco centro">Proffut {__VERSAO__} · semente {estado.semente}</p>
      </div>
    </div>
  );
}
