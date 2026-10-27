import { useEffect, useRef, useState } from "react";
import { apagarEscudos, importarEscudos } from "../../save/escudos";
import { armazenamentoPersistente, exportarArquivo, importarTexto, pedirArmazenamentoPersistente, salvar, type Espaco } from "../../save/salvamento";
import { Cartao, Opcoes, Topo } from "../componentes";
import { useJogo, useLoja } from "../store";

export function Config() {
  const estado = useJogo();
  const { fechar, atualizar, avisar, sair, iniciar, abrir } = useLoja();
  const [persistente, setPersistente] = useState<boolean | null>(null);
  const arquivo = useRef<HTMLInputElement>(null);
  const arquivoEscudos = useRef<HTMLInputElement>(null);
  const escudos = Object.keys(useLoja((s) => s.escudos)).length;

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

  const importarPacote = async (entrada: HTMLInputElement) => {
    const f = entrada.files?.[0];
    if (!f) return;
    try {
      const r = await importarEscudos(await f.text());
      useLoja.setState({ escudos: r.escudos });
      avisar(`${r.importados} escudos importados. Eles ficam só neste aparelho.`);
    } catch (e) {
      avisar((e as Error).message);
    } finally {
      entrada.value = "";
    }
  };

  const apagarImportados = async () => {
    if (!confirm("Apagar os escudos importados e voltar aos escudos do jogo?")) return;
    await apagarEscudos();
    useLoja.setState({ escudos: {} });
    avisar("Escudos do jogo de volta.");
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
          <p className="pequeno fraco" style={{ marginBottom: 8 }}>Apito do árbitro, torcida no gol (festa ou vaia) e narrador no pênalti</p>
          <Opcoes
            opcoes={[{ valor: "ligados", rotulo: "Ligados" }, { valor: "desligados", rotulo: "Desligados" }]}
            valor={estado.config.som === false ? "desligados" : "ligados"}
            aoMudar={(v) => { estado.config.som = v === "ligados"; atualizar(); }}
          />
          <p className="mini muito-fraco" style={{ marginTop: 8 }}>No iPhone, com a chave do silencioso ligada, o apito e a torcida não tocam.</p>
        </Cartao>

        <Cartao titulo="Escudos">
          <p className="pequeno fraco" style={{ marginBottom: 8 }}>
            O jogo usa os escudos dos clubes.{escudos ? ` ${escudos} trocados por escudos importados.` : ""} Para trocar algum, importe
            um arquivo .json de escudos do Proffut: ele fica só neste aparelho.
          </p>
          <div className="coluna">
            <button className="botao cheio" onClick={() => arquivoEscudos.current?.click()}>Importar escudos</button>
            <input ref={arquivoEscudos} type="file" className="oculto" aria-label="Arquivo de escudos" onChange={(e) => importarPacote(e.currentTarget)} />
            {escudos > 0 && <button className="botao cheio" onClick={apagarImportados}>Apagar os escudos importados</button>}
          </div>
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

        <Cartao titulo="Tutorial">
          <p className="pequeno fraco" style={{ marginBottom: 8 }}>Os passos principais do jogo, os mesmos do começo de um jogo novo.</p>
          <button className="botao cheio" onClick={() => { estado.tutorial = true; atualizar(); fechar(); }}>Ver o tutorial</button>
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
