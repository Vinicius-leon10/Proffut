# Prepara as 8 imagens dos estádios (pacote do usuário, estadio-1.png ... estadio-8.png, 1024 px, fundo marfim liso)
# para public/estadios: corta a margem vazia (deixa um respiro), reduz para LARGURA px e grava em WebP. O fundo marfim
# vira branco (cada canal ganha o fator que leva a cor do fundo a 255; as cores mudam menos de 5%): na tela a imagem
# usa mix-blend-mode: multiply, e o branco some no cartão claro, sem o retângulo amarelado.
# Uso: python3 -I tools/estadios/preparar.py <pasta do pacote> public/estadios
import os, sys
from PIL import Image, ImageChops

LARGURA = 640
QUALIDADE = 82
RESPIRO = 0.03

def preparar(origem, destino):
    im = Image.open(origem).convert("RGB")
    fundo = Image.new("RGB", im.size, im.getpixel((0, 0)))
    dif = ImageChops.difference(im, fundo).convert("L").point(lambda v: 255 if v > 18 else 0)
    x0, y0, x1, y1 = dif.getbbox()
    m = int(max(x1 - x0, y1 - y0) * RESPIRO)
    im = im.crop((max(0, x0 - m), max(0, y0 - m), min(im.width, x1 + m), min(im.height, y1 + m)))
    r, g, b = im.getpixel((0, 0))
    canais = [c.point(lambda v, f=255 / ref: min(255, round(v * f))) for c, ref in zip(im.split(), (r, g, b))]
    im = Image.merge("RGB", canais)
    if im.width > LARGURA:
        im = im.resize((LARGURA, round(im.height * LARGURA / im.width)), Image.LANCZOS)
    im.save(destino, "WEBP", quality=QUALIDADE, method=6)
    return im.size

if __name__ == "__main__":
    entrada, saida = sys.argv[1], sys.argv[2]
    os.makedirs(saida, exist_ok=True)
    for n in range(1, 9):
        destino = os.path.join(saida, f"estadio-{n}.webp")
        tam = preparar(os.path.join(entrada, f"estadio-{n}.png"), destino)
        print(destino, tam, os.path.getsize(destino) // 1024, "KB")
