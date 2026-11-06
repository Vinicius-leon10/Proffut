import { Composition } from "remotion";
import { Episodio01, DURACAO_EP01 } from "./Episodio01";
import { Episodio02, DURACAO_EP02 } from "./Episodio02";

export const Raiz = () => (
  <>
    <Composition id="Episodio01" component={Episodio01} durationInFrames={DURACAO_EP01} fps={30} width={1080} height={1920} />
    <Composition id="Episodio02" component={Episodio02} durationInFrames={DURACAO_EP02} fps={30} width={1080} height={1920} />
  </>
);
