// No modo app do iPhone (aberto pelo ícone na tela inicial), o Safari informa a altura da tela
// sem a barra de status, e o jogo ficava com uma faixa vazia embaixo (teste R18). Nesse modo o
// app sempre ocupa a tela inteira, então a altura certa é a da própria tela do aparelho.
// O CSS usa --altura-app quando a página tem a classe "app-iphone".

export function ocuparTelaInteira() {
  const modoApp = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  // Só no iPhone: no iPad o app pode dividir a tela com outro.
  if (!modoApp || !/iPhone|iPod/.test(navigator.userAgent)) return;

  const raiz = document.documentElement;
  const medir = () => {
    const lados = [screen.width, screen.height];
    const retrato = window.matchMedia("(orientation: portrait)").matches;
    const tela = retrato ? Math.max(...lados) : Math.min(...lados);
    raiz.style.setProperty("--altura-app", `${Math.max(tela, window.innerHeight)}px`);
  };
  medir();
  raiz.classList.add("app-iphone");
  window.addEventListener("resize", medir);
  window.addEventListener("orientationchange", medir);
}
