import { Composition } from "remotion";
import { Episodio01, DURACAO_EP01 } from "./Episodio01";

export const Raiz = () => (
  <Composition id="Episodio01" component={Episodio01} durationInFrames={DURACAO_EP01} fps={30} width={1080} height={1920} />
);
