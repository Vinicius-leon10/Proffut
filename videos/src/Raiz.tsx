import { Composition } from "remotion";
import { Episodio01, DURACAO_EP01 } from "./Episodio01";
import { Episodio02, DURACAO_EP02 } from "./Episodio02";
import { CarreiraEp01, DURACAO_CAR01 } from "./carreira/CarreiraEp01";
import { DURACAO } from "./variantes/comum";
import { VersaoCompleta } from "./variantes/VersaoCompleta";
import { VersaoFlutuante } from "./variantes/VersaoFlutuante";
import { VersaoLegendas } from "./variantes/VersaoLegendas";
import { VersaoMural } from "./variantes/VersaoMural";

const tela = { fps: 30, width: 1080, height: 1920 };

export const Raiz = () => (
  <>
    <Composition id="Episodio01" component={Episodio01} durationInFrames={DURACAO_EP01} {...tela} />
    <Composition id="Episodio02" component={Episodio02} durationInFrames={DURACAO_EP02} {...tela} />
    <Composition id="Ep01-A-Mural" component={VersaoMural} durationInFrames={DURACAO} {...tela} />
    <Composition id="Ep01-B-Legendas" component={VersaoLegendas} durationInFrames={DURACAO} {...tela} />
    <Composition id="Ep01-D-Completo" component={VersaoCompleta} durationInFrames={DURACAO} {...tela} />
    <Composition id="Ep01-C-Flutuante" component={VersaoFlutuante} durationInFrames={DURACAO} {...tela} />
    <Composition id="Carreira-Ep01" component={CarreiraEp01} durationInFrames={DURACAO_CAR01} {...tela} />
  </>
);
