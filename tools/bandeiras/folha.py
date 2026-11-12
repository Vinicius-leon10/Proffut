# Junta as bandeiras dos países (pacote do usuário: bandeira-<código>.png, o código das seleções do jogo) numa folha só,
# public/bandeiras.png, e grava a posição de cada uma em src/ui/bandeiras.json. Uma imagem só: o service worker guarda
# junto com o app (sem internet também) e a tela não pede 217 arquivos. Cada bandeira cabe inteira numa casa de LARGURA x
# ALTURA (3:2), centrada, com o resto transparente (Suíça e Nepal não são 3:2). R124, nov/2026.
# Uso: python3 -I tools/bandeiras/folha.py <pasta com bandeira-*.png> public/bandeiras.png src/ui/bandeiras.json
import json, math, os, sys
from PIL import Image

LARGURA, ALTURA = 60, 40
COLUNAS = 16

def main(entrada, saida_png, saida_json):
    codigos = sorted(f[len("bandeira-"):-4].upper() for f in os.listdir(entrada) if f.startswith("bandeira-") and f.endswith(".png"))
    linhas = math.ceil(len(codigos) / COLUNAS)
    folha = Image.new("RGBA", (COLUNAS * LARGURA, linhas * ALTURA), (0, 0, 0, 0))
    for i, cod in enumerate(codigos):
        im = Image.open(os.path.join(entrada, f"bandeira-{cod.lower()}.png")).convert("RGBA")
        im.thumbnail((LARGURA, ALTURA), Image.LANCZOS)
        x = (i % COLUNAS) * LARGURA + (LARGURA - im.width) // 2
        y = (i // COLUNAS) * ALTURA + (ALTURA - im.height) // 2
        folha.paste(im, (x, y), im)
    folha.quantize(colors=256, method=Image.FASTOCTREE, dither=Image.NONE).save(saida_png, optimize=True)
    json.dump({"largura": LARGURA, "altura": ALTURA, "colunas": COLUNAS, "linhas": linhas, "codigos": codigos},
              open(saida_json, "w"), ensure_ascii=False)
    print(len(codigos), "bandeiras,", os.path.getsize(saida_png) // 1024, "KB")

if __name__ == "__main__":
    main(*sys.argv[1:4])
