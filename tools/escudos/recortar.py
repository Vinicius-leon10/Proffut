"""Recorta uma prancha de escudos (uma imagem com um cartão por clube) num pacote de escudos do Proffut.

    python3 tools/escudos/recortar.py prancha.png escudos.json [conferir.png]

A prancha segue a ordem da lista dos clubes (Séries A, B, C e D, cada uma em ordem alfabética, como no
arquivo que o jogo gera para o usuário): cartões brancos sobre fundo cinza-claro, o escudo em cima e o
nome embaixo. O pacote (.json) o usuário importa em Configurações → Escudos e fica só no aparelho dele:
nem a prancha nem o pacote entram no repositório (os escudos oficiais são dos clubes).
`conferir.png` mostra cada escudo recortado sobre o fundo do jogo, com o id do clube, para conferir.
"""
import base64
import io
import json
import sys
import unicodedata
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

RAIZ = Path(__file__).resolve().parents[2]
TAMANHO = 96  # lado máximo do escudo no pacote, em pixels
FUNDO_DO_JOGO = (0x0B, 0x14, 0x10)


def ordem_dos_clubes():
    """Ids na ordem da lista: séries A, B, C e D, cada uma em ordem alfabética do nome (sem acentos)."""
    clubes = json.loads((RAIZ / "data/brasil-2026/clubes.json").read_text())["clubes"]
    reserva = json.loads((RAIZ / "data/brasil-2026/serie-d-reserva.json").read_text())["clubes"]
    chave = lambda c: unicodedata.normalize("NFD", c["nome"]).encode("ascii", "ignore").decode().lower()
    ids = []
    for serie in "ABC":
        ids += [c["id"] for c in sorted((c for c in clubes if c["serie"] == serie), key=chave)]
    ids += [c["id"] for c in sorted(reserva, key=chave)]
    return ids


def faixas(mascara, minimo):
    """Trechos seguidos onde a máscara (1-D) é verdadeira, com pelo menos `minimo` de comprimento."""
    trechos, inicio = [], None
    for i, v in enumerate(list(mascara) + [False]):
        if v and inicio is None:
            inicio = i
        elif not v and inicio is not None:
            if i - inicio >= minimo:
                trechos.append((inicio, i))
            inicio = None
    return trechos


def cartoes(rgb):
    """Retângulos (x0, y0, x1, y1) dos cartões brancos, linha por linha."""
    branco = (rgb >= 252).all(axis=2)
    linhas = faixas(branco.sum(axis=1) > rgb.shape[1] * 0.35, 40)
    # O vão entre dois cartões tem a cor do fundo da prancha (a do canto de cima).
    fundo = (np.abs(rgb.astype(int) - rgb[2, 2].astype(int)) <= 4).all(axis=2)
    achados = []
    for y0, y1 in linhas:
        for x0, x1 in faixas(fundo[y0:y1].mean(axis=0) < 0.9, 60):
            achados.append((x0, y0, x1, y1))
    return achados


def recortar_escudo(cartao):
    """Do cartão (array RGB), o escudo: a parte com tinta acima do nome do clube."""
    tinta = (255 - cartao.min(axis=2)) > 40
    tinta[:, :4] = tinta[:, -4:] = False
    tinta[:4, :] = tinta[-4:, :] = False
    h = cartao.shape[0]
    blocos = faixas(tinta.any(axis=1), 1)
    # O nome (uma ou duas linhas) começa a uns 72% da altura do cartão; o que começa acima é do escudo
    # (há escudos com texto embaixo, como o do Maringá). Se o escudo encosta no nome, corta nos 72%.
    corte = h
    for inicio, _ in reversed(blocos):
        if inicio < h * 0.7:
            break
        corte = inicio
    if corte == h:
        corte = round(h * 0.72)
    linhas = np.where(tinta[:corte].any(axis=1))[0]
    colunas = np.where(tinta[:corte].any(axis=0))[0]
    y0, y1 = linhas.min(), linhas.max() + 1
    x0, x1 = colunas.min(), colunas.max() + 1
    return cartao[max(0, y0 - 2):y1 + 2, max(0, x0 - 2):x1 + 2]


def fundo_transparente(rgb):
    """Fundo branco ligado à borda vira transparente; a borda do escudo, semitransparente (cor recuperada)."""
    h, w, _ = rgb.shape
    claro = rgb.min(axis=2) >= 225
    fundo = np.zeros((h, w), bool)
    fila = deque((y, x) for y in range(h) for x in (0, w - 1) if claro[y, x])
    fila.extend((y, x) for x in range(w) for y in (0, h - 1) if claro[y, x])
    while fila:
        y, x = fila.popleft()
        if fundo[y, x] or not claro[y, x]:
            continue
        fundo[y, x] = True
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not fundo[ny, nx] and claro[ny, nx]:
                fila.append((ny, nx))
    # Borda: o fundo e até 2 pixels em volta dele passam por "branco vira transparência".
    borda = fundo.copy()
    for _ in range(2):
        b = borda.copy()
        b[1:, :] |= borda[:-1, :]
        b[:-1, :] |= borda[1:, :]
        b[:, 1:] |= borda[:, :-1]
        b[:, :-1] |= borda[:, 1:]
        borda = b
    c = rgb.astype(float)
    alfa = np.ones((h, w))
    a = ((255 - c) / 255).max(axis=2)
    alfa[borda] = a[borda]
    cor = c.copy()
    seguro = borda & (alfa > 0.02)
    cor[seguro] = (c[seguro] - (1 - alfa[seguro, None]) * 255) / alfa[seguro, None]
    cor[borda & ~seguro] = 0
    rgba = np.dstack([np.clip(cor, 0, 255), alfa * 255]).round().astype(np.uint8)
    return Image.fromarray(rgba, "RGBA")


def luminancia(rgb):
    c = np.asarray(rgb, float) / 255
    c = np.where(c <= 0.03928, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126 * c[..., 0] + 0.7152 * c[..., 1] + 0.0722 * c[..., 2]


def com_fundo_claro_se_preciso(imagem):
    """Escudo escuro demais para o fundo do jogo (menos de 20% dele com contraste 3:1): vai num círculo claro."""
    rgba = np.asarray(imagem).astype(float)
    opaco = rgba[..., 3] > 128
    contraste = (luminancia(rgba[..., :3]) + 0.05) / (luminancia(FUNDO_DO_JOGO) + 0.05)
    if (contraste[opaco] >= 3).mean() >= 0.2:
        return imagem
    lado = round(max(imagem.size) * 1.15)
    disco = Image.new("RGBA", (lado, lado), (0, 0, 0, 0))
    ImageDraw.Draw(disco).ellipse((0, 0, lado - 1, lado - 1), fill=(244, 246, 248, 255))
    disco.alpha_composite(imagem, ((lado - imagem.width) // 2, (lado - imagem.height) // 2))
    return disco


def quadrado(imagem):
    """Centraliza num quadrado transparente e reduz para no máximo TAMANHO pixels de lado."""
    lado = max(imagem.size)
    q = Image.new("RGBA", (lado, lado), (0, 0, 0, 0))
    q.paste(imagem, ((lado - imagem.width) // 2, (lado - imagem.height) // 2))
    return q.resize((TAMANHO, TAMANHO), Image.LANCZOS) if lado > TAMANHO else q


def main():
    prancha, saida = sys.argv[1], sys.argv[2]
    conferir = sys.argv[3] if len(sys.argv) > 3 else None
    rgb = np.asarray(Image.open(prancha).convert("RGB"))
    achados = cartoes(rgb)
    ids = ordem_dos_clubes()
    if len(achados) != len(ids):
        sys.exit(f"Achei {len(achados)} cartões na prancha, mas o jogo tem {len(ids)} clubes.")
    escudos, imagens = {}, []
    for (x0, y0, x1, y1), id_ in zip(achados, ids):
        img = quadrado(com_fundo_claro_se_preciso(fundo_transparente(recortar_escudo(rgb[y0:y1, x0:x1]))))
        buf = io.BytesIO()
        img.save(buf, "PNG", optimize=True)
        escudos[id_] = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()
        imagens.append((id_, img))
    Path(saida).write_text(json.dumps({"formato": "proffut-escudos", "versao": 1, "escudos": escudos}))
    print(f"{len(escudos)} escudos em {saida} ({Path(saida).stat().st_size / 1e6:.1f} MB)")
    if conferir:
        por_linha, cel = 12, 128
        folha = Image.new("RGB", (por_linha * cel, -(-len(imagens) // por_linha) * cel), "#0b1410")
        desenho = ImageDraw.Draw(folha)
        for i, (id_, img) in enumerate(imagens):
            x, y = (i % por_linha) * cel, (i // por_linha) * cel
            folha.paste(img, (x + (cel - img.width) // 2, y + 6), img)
            desenho.text((x + 4, y + cel - 18), id_[:20], fill="#cfd8d3")
        folha.save(conferir)
        print(f"Conferência em {conferir}")


if __name__ == "__main__":
    main()
