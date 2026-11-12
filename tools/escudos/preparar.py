# Prepara os escudos de um pacote do usuário (pasta com <id>.png) para public/escudos, sem redesenhar: o perfil de cor
# vira sRGB, o fundo liso claro (branco ou cinza, ligado à borda) fica transparente, a margem vazia sai, o lado maior
# fica com no máximo LADO px (sem aumentar os pequenos) e, com --quantizar, a imagem fica com 256 cores (os 276 escudos
# dos times novos, nov/2026: de 18 MB para 1,3 MB, iguais na tela). Confira o resultado no fundo verde: escudo branco
# cujo branco encosta na borda perde o miolo (ponha o id em MANTER_FUNDO).
# Uso: python3 -I tools/escudos/preparar.py <pasta de entrada> <pasta de saída> [--quantizar]
import io, os, sys, glob
from collections import deque
from PIL import Image, ImageCms

LADO = 128
TOLERANCIA = 40  # diferença máxima (por canal) para a cor do fundo nos cantos
# Escudos brancos sem contorno: tirar o fundo apagaria o branco de dentro (conferido na prancha, nov/2026).
MANTER_FUNDO = {"galo-maringa", "maranguape", "sao-raimundo-pa", "croatia-zmijavci", "partick-thistle", "sesvete", "aab-fodbold", "almeria", "first-vienna", "luton-town", "marbella", "schwarz-wei-bregenz", "borac-1926", "academica", "cacereno", "lusitano", "zamora-es", "dubocica", "palermo"}

def tirar_fundo(im):
    """Fundo liso e claro nos 4 cantos: o que está ligado à borda e perto dessa cor fica transparente."""
    w, h = im.size
    px = im.load()
    cantos = [px[0, 0], px[w - 1, 0], px[0, h - 1], px[w - 1, h - 1]]
    if not all(c[3] > 200 for c in cantos):
        return False
    ref = tuple(sum(c[i] for c in cantos) // 4 for i in range(3))
    if min(ref) < 200 or max(abs(c[i] - ref[i]) for c in cantos for i in range(3)) > 12:
        return False
    perto = lambda c: c[3] > 0 and max(abs(c[i] - ref[i]) for i in range(3)) <= TOLERANCIA
    visto = bytearray(w * h)
    fila = deque()
    for x in range(w):
        fila.append((x, 0)); fila.append((x, h - 1))
    for y in range(h):
        fila.append((0, y)); fila.append((w - 1, y))
    while fila:
        x, y = fila.popleft()
        k = y * w + x
        if visto[k]:
            continue
        visto[k] = 1
        c = px[x, y]
        if not perto(c):
            continue
        px[x, y] = (c[0], c[1], c[2], 0)
        if x > 0: fila.append((x - 1, y))
        if x < w - 1: fila.append((x + 1, y))
        if y > 0: fila.append((x, y - 1))
        if y < h - 1: fila.append((x, y + 1))
    return True

def abrir_em_srgb(origem):
    """Abre em RGBA; com perfil de cor (ICC), converte para sRGB e larga o perfil (ele sozinho tinha até 100 KB)."""
    im = Image.open(origem)
    icc = im.info.get("icc_profile")
    im = im.convert("RGBA")
    if icc:
        try:
            im = ImageCms.profileToProfile(im, ImageCms.ImageCmsProfile(io.BytesIO(icc)), ImageCms.createProfile("sRGB"), outputMode="RGBA")
        except Exception as erro:  # perfil que não abre: fica com as cores como estão
            print("perfil ignorado:", os.path.basename(origem), erro)
    im.info = {}
    return im

def preparar(origem, destino, quantizar):
    im = abrir_em_srgb(origem)
    # Antes de tirar o fundo, reduz para 2x o tamanho final (mais rápido; a redução final suaviza a borda).
    if max(im.size) > 2 * LADO:
        im.thumbnail((2 * LADO, 2 * LADO), Image.LANCZOS)
    sem_fundo = os.path.basename(origem)[:-4] not in MANTER_FUNDO and tirar_fundo(im)
    caixa = im.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
    if caixa:
        x0, y0, x1, y1 = caixa
        m = max(1, round(0.02 * max(x1 - x0, y1 - y0)))
        im = im.crop((max(0, x0 - m), max(0, y0 - m), min(im.width, x1 + m), min(im.height, y1 + m)))
    if max(im.size) > LADO:
        im.thumbnail((LADO, LADO), Image.LANCZOS)
    if quantizar:
        im = im.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
    im.save(destino, optimize=True)
    return sem_fundo, im.size

entrada, saida = sys.argv[1], sys.argv[2]
quantizar = "--quantizar" in sys.argv
os.makedirs(saida, exist_ok=True)
fundos = []
for f in sorted(glob.glob(os.path.join(entrada, "*.png"))):
    nome = os.path.basename(f)
    sem_fundo, tam = preparar(f, os.path.join(saida, nome), quantizar)
    if sem_fundo:
        fundos.append(nome)
total = sum(os.path.getsize(p) for p in glob.glob(os.path.join(saida, "*.png")))
maior = max(glob.glob(os.path.join(saida, "*.png")), key=os.path.getsize)
print(f"{len(glob.glob(os.path.join(saida, '*.png')))} escudos, {total / 1e6:.2f} MB, maior {os.path.basename(maior)} {os.path.getsize(maior) // 1024} KB")
print("fundo tirado:", len(fundos), " ".join(fundos))
