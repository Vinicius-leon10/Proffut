// Artigo do clube nos textos do jogo: "o Flamengo", mas "a Chapecoense". Quase todos os clubes são
// "o"; os desta lista são "a", como a torcida e a imprensa falam. Vale pelo id, então serve também
// para os saves antigos.
export const CLUBES_FEMININOS = [
  "chapecoense", "ponte-preta", "ferroviaria", "inter-de-limeira",
  "portuguesa", "portuguesa-rj", "tuna-luso", "aparecidense", "juazeirense",
];

const FORMAS = {
  o: ["o", "a"],
  O: ["O", "A"],
  do: ["do", "da"],
  no: ["no", "na"],
  ao: ["ao", "à"],
  pelo: ["pelo", "pela"],
} as const;

export const feminino = (clube: { id: string }) => CLUBES_FEMININOS.includes(clube.id);

/** O nome com o artigo certo: comArtigo("do", clube) dá "do Flamengo" ou "da Chapecoense". */
export function comArtigo(forma: keyof typeof FORMAS, clube: { id: string; nome: string }): string {
  return `${FORMAS[forma][feminino(clube) ? 1 : 0]} ${clube.nome}`;
}

/** A palavra que concorda com o clube: concorda(clube, "eliminado", "eliminada"). */
export function concorda(clube: { id: string }, masculino: string, femininoForma: string): string {
  return feminino(clube) ? femininoForma : masculino;
}
