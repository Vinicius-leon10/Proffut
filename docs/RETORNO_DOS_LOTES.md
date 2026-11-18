# Retorno dos lotes

O Claude Code do Proffut confere cada lote que chega e escreve aqui o resultado. O Claude no computador lê este arquivo
**antes de cada lote novo** e refaz primeiro o que está em "Refazer".

## Padrão do LEIA (pedido do usuário, 18/nov/2026: vale para todo lote)

Os lotes do modo rápido, da Itália em diante, chegaram com menos cuidado que os primeiros. Volte ao padrão dos primeiros
lotes; lote sem ele volta sem ser conferido:

1. **"Confira" em cada clube:** a linha de cada clube no LEIA diz com o que comparar (por exemplo "listras verticais
   vermelhas e pretas, gola branca" ou "escudo com águia dourada"), para a conferência olhar o lugar certo.
2. **Aviso de fundo liso:** quando a imagem tem fundo branco, cinza ou de uma cor só (o preparo apaga o fundo e pode apagar
   junto uma camisa branca), escreva "fundo liso" na linha do clube.
3. **Motivo de verdade de quem ficou de fora:** nada de motivo genérico; diga o que aconteceu ("só achei no cabide",
   "só achei a camisa reserva", "imagem cortada", "só em miniatura", "nenhuma imagem do clube").
5. **Reserva só se não houver a titular (pedido do usuário, 18/nov/2026):** "Se não encontrar a camisa principal podemos usar
   as reservas, desde que seja atual". Sem a titular, vale a reserva (ou a terceira) **de 2025-26 ou 2026**, do clube certo;
   escreva no LEIA "reserva" e por que não achou a titular. Camisa antiga, de treino ou de aquecimento continua não valendo.
4. **Só a titular, do clube certo:** confira se a fonte é a camisa titular (home) do próprio clube, de 2022 para cá. Reserva
   (away), terceira, de aquecimento, infantil, de loja de camisas antigas ou de outro clube volta (nos lotes da Itália em
   diante vieram várias assim).

Os lotes da Inglaterra à Ucrânia foram conferidos um por um em 18/nov/2026 (nenhum tinha entrado no jogo antes): o que estava
errado está em "Refazer (camisas)".

## Refazer (prioridade)

**Escudos:** `tirol.png` (Tirol, Fortaleza-CE; o do jogo era o do Decisão) e `bala-town.png` (Bala Town, País de Gales;
o do jogo era o do Barry Town United). Os dois saíram do jogo e estão com o escudo desenhado até chegar o certo.

Lote 37: o escudo do Al-Nasr estava certo e entrou no jogo.

## Jogadores

Lotes 01 a 07 (refinados): entraram no jogo os 20 clubes da Série B, os 20 da C e os 24 da D (até 30 por clube; a força é
calculada aqui). Os 6 da D que ficaram de fora (abecat, crac, guapore, guarany-de-bage, primavera-mt, serra-branca)
continuam com elenco gerado.

## Lotes conferidos

| Lote | Tipo | Entraram no jogo | Ficaram de fora (motivo) |
|---|---|---|---|
| 01 | escudos | todos os enviados | ver "Refazer" |
| 02 | escudos | todos os enviados | ver "Refazer" |
| 03 | escudos | todos os enviados | ver "Refazer" |
| 04 | escudos | todos os enviados | ver "Refazer" |
| 05 | escudos | todos os enviados | ver "Refazer" |
| 06 | escudos | todos os enviados | ver "Refazer" |
| 07 | escudos | todos os enviados | ver "Refazer" |
| 08 | escudos | todos os enviados | ver "Refazer" |
| 09 | escudos | todos os enviados | ver "Refazer" |
| 01–09 refeito | escudos | 22 | ver "Refazer" |
| 10 | escudos | todos os enviados | ver "Refazer" |
| 11 | escudos | todos os enviados | ver "Refazer" |
| 12 | escudos | todos os enviados | ver "Refazer" |
| 13 | escudos | todos os enviados | ver "Refazer" |
| 14 | escudos | todos os enviados | ver "Refazer" |
| 15 | escudos | todos os enviados | ver "Refazer" |
| 16 | escudos | todos os enviados | ver "Refazer" |
| 17 | escudos | todos os enviados | ver "Refazer" |
| 18 refeito | escudos | 33 | kazincbarcika (só amarelo, sem fundo: some no fundo claro) |
| 19 | escudos | todos os enviados | - |
| 20 | escudos | 49 | cracovia (veio o do Wisła Kraków) |
| 21 | escudos | todos os enviados | - |
| 22 | escudos | todos os enviados | - |
| 23 | escudos | todos os enviados | - |
| 24 | escudos | todos os enviados | - |
| 25 | escudos | todos os enviados | - |
| 26 | escudos | todos os enviados | - |
| 27 | escudos | todos os enviados | - |
| 28 | escudos | todos os enviados | - |
| 29 | escudos | todos os enviados | - |
| 30 | escudos | todos os enviados | - |
| 31 | escudos | todos os enviados | - |
| 32 | escudos | todos os enviados | - |
| 33 | escudos | todos os enviados | - |
| 34 refeito | escudos | todos os enviados | - |
| jogadores 01–02 | jogadores (Série B) | os 20 clubes | - |
| jogadores 03–04 refinados | jogadores (Série C) | os 20 clubes | - |
| jogadores 05–07 refinados | jogadores (Série D) | os 24 clubes | - |
| 35 | escudos | todos os enviados | - |
| 36 refeito | escudos | todos os enviados | - |
| 37 refeito | escudos | o do Al-Nasr | - |

## Seleções (escudos e bandeiras)

Lotes `selecoes-lote-01` a `06` (12/nov/2026): conferidos um a um, todos certos. Entraram no jogo os 217 escudos e as 217
bandeiras. Nada a refazer.

## Camisas oficiais

As camisas conferidas e preparadas (sem fundo, até 128 px, 256 cores) ficam em `public/camisas/<id>.png`; a fonte de cada
uma em `docs/CAMISAS_FONTES.csv`. Já aparecem no campinho do jogo.

### Refazer (camisas)

Lotes 01 e 02 conferidos: 226 dos 260 clubes do Brasil têm a camisa oficial. As 6 do lote 01 foram refeitas certas.

- **carlos-renaux:** a foto é num manequim (busto). Só mande se achar sem manequim.
- **tirol:** obrigado pelo aviso: o escudo do Tirol no jogo era mesmo o do Decisão e saiu. Mande o **escudo** certo do
  Tirol (Fortaleza-CE) e a camisa dele.
- Os 32 de fora no lote 02: no `LEIA` ficou "ainda não olhei Instagram e site oficial". Se quiser, tente os passos 3 e 4
  (Instagram, Facebook, site e loja oficiais, fornecedor) só para eles; o que não achar fica sem camisa.
- Pode seguir para os outros países (com a seleção de cada um).
- França: refazer `reims`, `ajaccio`, `valenciennes`, `nancy` (vale também para `nancy-lorraine`) e `paris-fc`, de frente e com fundo transparente.
- Espanha: refazer `sel-ES` (a de 2026, de frente) e, com fundo transparente, `leganes`, `sevilla`, `tenerife` e `ourense`. Obs.: o escudo do `almeria` no jogo é o da antiga AD Almería; mande também o escudo da UD Almería.
- Chile: refazer `cobresal` (sem manequim).
- EUA e Canadá: refazer `detroit-city` (sem manequim), `sel-CA` (de frente) e `sel-US` (a titular de 2026).
- Suriname: refazer `sel-SR` (a camisa veio com o ombro apagado).
- El Salvador e Panamá: refazer `sel-SV` e `sel-PA` (sem cabide).
- Paraguai e Peru: refazer `sel-PE` (a titular branca com a faixa vermelha), `sel-PY` (com fundo transparente ou branco liso) e `deportivo-llacuabamba` (de frente).
- Colômbia e Equador: refazer `inter-bogota` (sem manequim) e `ldu-quito` (de frente, aberta).
- Argentina: refazer `tristan-suarez` (a titular) e `argentino-de-quilmes` (sem o círculo branco atrás).

**Lotes da Inglaterra à Ucrânia (conferidos de novo um por um, 18/nov/2026; nenhum tinha entrado no jogo antes):** 588
das 668 camisas entraram. As 80 abaixo voltam; mande cada uma de frente, sozinha (sem cabide, manequim, etiqueta, moldura,
marca do site ou contorno), com fundo transparente quando a camisa for branca ou clara, e a **titular de 2025-26** (ou de 2026):
reserva, terceira, de aquecimento, infantil e camisa antiga (antes de 2022) não servem. Conferi também a fonte de cada uma no csv:
várias eram de outro clube ou a reserva. Os clubes que o LEIA deixou de fora (fiorentina, derby-county, shelbourne...) continuam
pendentes: tente de novo, com o motivo de verdade se não achar.

- inglaterra-01: `leeds` (camisa branca em fundo branco: ao tirar o fundo a camisa sumiu (mandar com fundo transparente)); `portsmouth` (texto da loja embaixo da camisa ("Beebu Sleeve Patch")).
- inglaterra-02: `cardiff-city` (marca do site no canto de cima); `plymouth-argyle` (marca do site no canto de cima); `stockport-county` (parte branca da camisa em fundo branco: sumiu ao tirar o fundo (mandar com fundo transparente)); `swansea` (camisa branca em fundo branco: sumiu ao tirar o fundo (mandar com fundo transparente)); `west-bromwich` (listras brancas em fundo branco: sumiram ao tirar o fundo (mandar com fundo transparente)); `wigan-athletic` (listras brancas em fundo branco: as pontas sumiram ao tirar o fundo (mandar com fundo transparente)).
- irlanda-do-norte-01: `ballymena-united` (etiqueta da loja pendurada no ombro).
- israel-01: `hapoel-jerusalem` (veio uma camisa branca com riscas vermelhas; o Hapoel Jerusalém joga de vermelho e preto (mandar a titular de 2025-26)); `ashdod` (camisa antiga (2021-22)).
- italia-01: `atalanta` (foto torta, a camisa está dobrada de lado); `bari` (veio a vermelha; o Bari joga de branco e vermelho (confirmar se é a titular de 2025-26 ou mandar a branca)); `monza` (aparece o suporte do manequim na gola); `padova` (veio a vermelha; o Padova joga de branco com o escudo vermelho (confirmar se é a titular de 2025-26 ou mandar a branca)); `venezia` (a fonte é a terceira camisa de 2025-26, não a titular).
- italia-02: `catania` (marca do site no canto de cima); `dolomiti-bellunesi` (a fonte é a camisa reserva de 2025-26, não a titular).
- italia-03: `ravenna` (veio uma camisa grená; o Ravenna joga de amarelo e vermelho (confirmar se é a titular de 2025-26)).
- letonia-01: `daugavpils` (veio a mesma camisa do RFS (azul com "tonybet"), não é a do Daugavpils); `sel-LV` (marca do site no canto de cima).
- lituania-01: `suduva` (foto torta e amassada, parece a camisa de costas).
- luxemburgo-01: `sel-LU` (foto torta, de lado e amassada).
- macedonia-do-norte-01: `sel-MK` (camisa no saco plástico, com etiqueta, de lado).
- moldavia-01: `sheriff-tiraspol` (veio a preta; o Sheriff joga de amarelo e preto (confirmar se é a titular de 2025-26 ou mandar a amarela)); `spartanii-sportul` (veio a branca; o escudo é vermelho e amarelo (confirmar se é a titular de 2025-26)).
- noruega-01: `ranheim-fotball` (aparece o cabide e as listras brancas sumiram ao tirar o fundo); `start` (aparece o suporte do manequim na gola); `il-h-dd` (camisa antiga (2020)); `str-mmen` (a fonte é a camisa reserva de 2020, não a titular).
- polonia-01: `jagiellonia` (mancha branca do lado esquerdo da camisa (pedaço do fundo)); `korona-kielce` (sombra cinza embaixo da camisa); `lechia-gdansk` (aparece o manequim na gola e as listras brancas sumiram ao tirar o fundo); `legia-varsovia` (foto com a manga direita dobrada e sombra); `piast-gliwice` (fundo bege em volta da camisa que não sai); `sel-PL` (camisa branca em fundo branco: sumiu quase inteira ao tirar o fundo (mandar com fundo transparente)); `stal-mielec` (parte branca em fundo branco: as bordas sumiram ao tirar o fundo (mandar com fundo transparente)).
- portugal-01: `caldas` (veio uma camisa branca e preta; o escudo do Caldas é vermelho e azul (confirmar se é a titular de 2025-26)); `sporting-cp` (foto amassada, a barra da camisa ficou irregular); `felgueiras` (camisa antiga (2020-21)).
- romenia-01: `arges` (veio uma camisa branca; o Argeș joga de roxo (confirmar se é a titular de 2025-26)); `hermannstadt` (veio uma camisa branca; o Hermannstadt joga de vermelho e preto (confirmar se é a titular de 2025-26)); `sel-RO` (a fonte é a camisa de aquecimento (pre-match) infantil, não a de jogo).
- romenia-02: `csm-olimpia-satu-mare` (veio uma camisa roxa e de lado; o Olimpia joga de amarelo e azul).
- russia-01: `akhmat-grozny` (camisa no cabide, na frente de uma parede de tijolos); `sel-RU` (marca do site no canto de cima); `sochi` (foto torta e amassada); `zenit` (foto torta e amassada, com reflexo de luz; a barra ficou irregular); `dinamo-moscou` (a fonte é a camisa reserva de 2025-26, não a titular); `lokomotiv-moscou` (camisa antiga (foto de 2021)); `krylya-sovetov` (camisa antiga (2019-20)).
- russia-02: `fc-ufa` (veio uma camisa roxa; o escudo do Ufa é verde e azul (confirmar se é a titular de 2025-26)).
- servia-01: `cukaricki` (camisa branca lisa, sem escudo nem patrocínio (parece modelo sem personalização)); `partizan` (tem um desenho grande (círculo do escudo) atrás da camisa); `radnicki-kragujevac` (a fonte é a camisa do IMT 2025-26, não a do Radnički Kragujevac).
- servia-02: `dubocica` (a fonte é a camisa do Jedinstvo Ub (a mesma imagem do jedinstvo-ub)); `vozdovac` (foto torta, com a borda esquerda apagada ao tirar o fundo); `rfk-graficar-beograd` (a fonte é a terceira camisa de 2023-24, não a titular); `trayal-krusevac` (a fonte é a camisa reserva de 2022-23, não a titular); `vrsac` (a fonte é a camisa reserva de 2025-26, não a titular).
- suecia-01: `aik` (marca do site no canto de cima; e veio uma branca, o AIK joga de preto e amarelo (confirmar a titular de 2025-26)); `hammarby` (camisa branca em fundo branco: sumiu ao tirar o fundo (mandar com fundo transparente)).
- suecia-02: `norrkoping` (foto amassada, com pedaços do fundo do lado direito); `varnamo` (a fonte é a camisa reserva de 2022, não a titular).
- suica-01: `lugano` (veio de uma loja de camisas antigas e é amarela; o Lugano joga de preto e branco (mandar a titular de 2025-26)); `neuchatel-xamax-fcs` (veio de uma loja de camisas antigas (retro); mandar a titular de 2025-26); `vaduz` (foto torta, de lado); `young-boys` (contorno branco em volta da camisa).
- tchequia-01: `hanacka-slavia-kromeriz` (camisa antiga (2011-12)); `karvina` (a fonte é a camisa reserva de 2024-25, não a titular); `viktoria-plzen` (foto de lado e cortada (sem as mangas)).
- turquia-01: `sel-TR` (foto de lado); `samsunspor` (foto de lado, a camisa aparece torta).
- ucrania-01: `epicentr` (a fonte é a camisa reserva de 2024-25, não a titular); `metalist-1925` (camisa num manequim de corpo inteiro (com calção e meias) e com fundo); `zorya` (moldura preta em volta da camisa).
- ucrania-02: `feniks-mariupol` (camisa antiga (2018-19, ainda do FC Mariupol)); `metalurh-zaporizhzhia` (a fonte é a terceira camisa do Nyva Ternopil, não a do Metalurh); `prykarpattia-ivano-frankivsk` (camisa antiga (2021-22)); `ucsa-tarasivka` (a fonte é a camisa reserva de 2026-27, não a titular).

**Lotes `camisas-<país>-extra-01` (18/nov/2026, conferidos um por um): 43 de 77 entraram.** Voltam:

- argentina-extra-01: `atletico-tucuman` (branco da camisa sumiu ao tirar o fundo (mandar com fundo transparente)); `chaco-for-ever` (foto torta e amassada); `comunicaciones-ar` (veio a camisa do Comunicaciones da Guatemala (Banrural), não a do Comunicaciones de Buenos Aires); `temperley` (camisa vestida por uma pessoa); `tristan-suarez` (foto torta, com sombra e pedaço do fundo); `union` (sombra cinza embaixo da camisa).
- brasil-extra-01: `galo-maringa` (veio a branca e cortada nas mangas; o Galo Maringá joga de vinho); `maranguape` (duas camisas na mesma imagem); `sao-joseense` (camisa no cabide).
- chile-extra-01: `colo-colo` (camisa é de 2026-27 numa loja de revenda; conferir se é a oficial (mandar de site oficial ou do Football Kit Archive)); `coquimbo-unido` (camisa amassada, de loja de revenda); `deportes-copiapo` (camisa comemorativa com faixa de texto embaixo); `union-la-calera` (camisa no cabide).
- colombia-extra-01: `deportivo-pasto` (camisa no cabide); `independiente-valle-del-cauca` (veio a do Independiente del Valle (Equador), não a do Independiente Yumbo/Valle del Cauca); `inter-bogota` (veio a terceira camisa (dourada), não a titular).
- el-salvador-extra-01: `c-d-platense` (veio a do Platense da Argentina, não a do C.D. Platense de El Salvador); `cacahuatique` (camisa no cabide).
- equador-extra-01: `ldu-quito` (camisa de lado e com o branco apagado ao tirar o fundo); `vinotinto-ecuador` (foto torta, de lado).
- estados-unidos-extra-01: `new-york-cosmos` (foto torta, de lado); `oakland-roots` (linha do fundo embaixo da camisa).
- guatemala-extra-01: `aurora-gt` (camisa no cabide); `chimaltenango` (camisa vestida por uma pessoa).
- honduras-extra-01: `platense-hn` (branco da camisa sumiu ao tirar o fundo (mandar com fundo transparente)).
- mexico-extra-01: `cancun` (foto torta, de lado); `dorados-de-sinaloa` (camisa de treino, de costas e com cantos do fundo); `tampico-madero` (cantos do fundo que não saem).
- panama-extra-01: `tauro` (foto torta, de lado); `veraguas-united` (camisa no cabide).
- paraguai-extra-01: `independiente-de-campo-grande` (veio a do Independiente da Argentina, não a do Independiente de Campo Grande).
- peru-extra-01: `ayacucho` (pedaços do fundo em volta da camisa); `universidad-san-martin` (camisa no cabide e de lado).
- uruguai-extra-01: `danubio` (jogador no lugar da camisa).

No próximo lote: o motivo de quem ficou de fora tem que ser o de verdade, clube por clube (neste veio o mesmo texto para todos), e confira se a camisa é do clube certo: vieram Platense da Argentina no lugar do de El Salvador, Independiente da Argentina no do Paraguai, Comunicaciones da Guatemala no da Argentina.

| Lote | Entraram | Ficaram de fora (motivo) |
|---|---|---|
| camisas 01 (Brasil) | 183 de 189 | princesa-do-solimoes e manauara entraram (manequim; talvez reserva) |
| camisas 02 (Brasil) | 43 de 44 | carlos-renaux (camisa num manequim/busto) |
| camisas seleções 01 | sel-BR | - |
| camisas argentina 01–03 | 75 de 77 (com sel-AR) | tristan-suarez (parece a reserva, cinza); argentino-de-quilmes (a camisa vem sobre um círculo branco, que fica no campinho) |
| camisas bolívia 01 | 14 de 14 (com sel-BO) | - |
| camisas chile 01 | 24 de 25 (com sel-CL) | cobresal (camisa num manequim) |
| camisas estados unidos 01–02, canadá 01, costa rica 01 | 61 de 64 (com sel-CR) | detroit-city (num manequim); sel-CA (foto torta); sel-US (veio a listrada vermelha e branca; confirmar se é a titular de 2026 ou mandar a branca) |
| camisas grécia, holanda 01–02, hungria, ilhas faroé 01 | 84 de 86 (com sel-GR, NL, HU, FO) | volendam (marca do site); pas-giannina (recortada: a camisa ficou cortada nas pontas) |
| camisas estônia, finlândia, frança 01–02, geórgia, gibraltar 01 | 81 de 87 (com sel-EE, FI, FR, GE, GI) | reims (as mangas brancas sumiram); ajaccio (num manequim); valenciennes (marca 24-25 na foto); nancy e nancy-lorraine (camisa branca em fundo cinza: some ao tirar o fundo); paris-fc (marca do site no canto) |
| camisas espanha 01–02 | 66 de 71 | sel-ES (foto torta e talvez a de 2024); leganes, sevilla e tenerife (camisa branca em fundo branco: ao tirar o fundo some a camisa; mandar com fundo transparente); ourense (marca do site no canto) |
| camisas eslovênia 01 | 9 de 9 (com sel-SI) | - |
| camisas dinamarca, escócia, eslováquia 01 | 52 de 54 (com sel-DK, XS, SK) | dundee-united (manga comprida com etiqueta, de lado); ross-county (pedaços de outras imagens nos cantos) |
| camisas cazaquistão, chipre, croácia 01 e sel-BE | 43 de 44 (com sel-KZ, CY, HR, BE) | tobol (veio a branca; o Tobol joga de verde, mandar a verde) |
| camisas belarus, bélgica, bósnia, bulgária 01 | 65 de 65 (com sel-BY, BA, BG) | - |
| camisas alemanha 01–02, armênia 01, áustria 01, azerbaijão 01 | 103 de 104 (com sel-DE, sel-AT, sel-AM, sel-AZ) | noah (a foto tem o lado esquerdo apagado) |
| camisas albânia 01 e andorra 01 | 14 de 15 (com sel-AL e sel-AD) | atletic-club-d-escaldes (desenho de divulgação, não a camisa de verdade) |
| camisas belize, cuba, anguila, antígua e barbuda, trinidad e tobago 01 | 0 (não acharam camisa) | - |
| camisas suriname 01 | 0 de 1 | sel-SR (o ombro direito ficou apagado ao tirar o fundo) |
| camisas curaçao, el salvador, guatemala, guiana, haiti, honduras, jamaica, nicarágua, panamá, rep. dominicana 01 | 31 de 33 (com sel-CW, GT, GY, HN, HT, JM) | sel-SV e sel-PA (no cabide) |
| camisas méxico 01–02 | 29 de 29 (com sel-MX) | - |
| camisas uruguai 01–02 e venezuela 01 | 23 de 23 (com sel-UY e sel-VE) | - |
| camisas paraguai 01 e peru 01–02 | 36 de 39 | sel-PE (veio a camisa preta, a reserva; a titular é branca com a faixa vermelha); sel-PY (fundo cinza que não sai); deportivo-llacuabamba (foto torta, de lado) |
| camisas colômbia 01 e equador 01 | 37 de 39 (com sel-CO e sel-EC) | ldu-quito (foto de lado, dobrada); inter-bogota (num manequim) |
| camisas inglaterra 01 (conferido de novo, 18/nov) | 38 de 40 | leeds (camisa branca em fundo branco: ao tirar o fundo a camisa sumiu (mandar com fundo transparente)); portsmouth (texto da loja embaixo da camisa ("Beebu Sleeve Patch")) |
| camisas inglaterra 02 (conferido de novo, 18/nov) | 22 de 28 | cardiff-city (marca do site no canto de cima); plymouth-argyle (marca do site no canto de cima); stockport-county (parte branca da camisa em fundo branco: sumiu ao tirar o fundo (mandar com fundo transparente)); swansea (camisa branca em fundo branco: sumiu ao tirar o fundo (mandar com fundo transparente)); west-bromwich (listras brancas em fundo branco: sumiram ao tirar o fundo (mandar com fundo transparente)); wigan-athletic (listras brancas em fundo branco: as pontas sumiram ao tirar o fundo (mandar com fundo transparente)) |
| camisas irlanda 01 (conferido de novo, 18/nov) | 10 de 10 | - |
| camisas irlanda do norte 01 (conferido de novo, 18/nov) | 12 de 13 | ballymena-united (etiqueta da loja pendurada no ombro) |
| camisas islândia 01 (conferido de novo, 18/nov) | 9 de 9 | - |
| camisas israel 01 (conferido de novo, 18/nov) | 10 de 12 | hapoel-jerusalem (veio uma camisa branca com riscas vermelhas; o Hapoel Jerusalém joga de vermelho e preto (mandar a titular de 2025-26)); ashdod (camisa antiga (2021-22)) |
| camisas itália 01 (conferido de novo, 18/nov) | 35 de 40 | atalanta (foto torta, a camisa está dobrada de lado); bari (veio a vermelha; o Bari joga de branco e vermelho (confirmar se é a titular de 2025-26 ou mandar a branca)); monza (aparece o suporte do manequim na gola); padova (veio a vermelha; o Padova joga de branco com o escudo vermelho (confirmar se é a titular de 2025-26 ou mandar a branca)); venezia (a fonte é a terceira camisa de 2025-26, não a titular) |
| camisas itália 02 (conferido de novo, 18/nov) | 34 de 36 | catania (marca do site no canto de cima); dolomiti-bellunesi (a fonte é a camisa reserva de 2025-26, não a titular) |
| camisas itália 03 (conferido de novo, 18/nov) | 14 de 15 | ravenna (veio uma camisa grená; o Ravenna joga de amarelo e vermelho (confirmar se é a titular de 2025-26)) |
| camisas kosovo 01 (conferido de novo, 18/nov) | 10 de 10 | - |
| camisas letônia 01 (conferido de novo, 18/nov) | 7 de 9 | daugavpils (veio a mesma camisa do RFS (azul com "tonybet"), não é a do Daugavpils); sel-LV (marca do site no canto de cima) |
| camisas lituânia 01 (conferido de novo, 18/nov) | 9 de 10 | suduva (foto torta e amassada, parece a camisa de costas) |
| camisas luxemburgo 01 (conferido de novo, 18/nov) | 15 de 16 | sel-LU (foto torta, de lado e amassada) |
| camisas macedônia do norte 01 (conferido de novo, 18/nov) | 12 de 13 | sel-MK (camisa no saco plástico, com etiqueta, de lado) |
| camisas malta 01 (conferido de novo, 18/nov) | 12 de 12 | - |
| camisas moldávia 01 (conferido de novo, 18/nov) | 4 de 6 | sheriff-tiraspol (veio a preta; o Sheriff joga de amarelo e preto (confirmar se é a titular de 2025-26 ou mandar a amarela)); spartanii-sportul (veio a branca; o escudo é vermelho e amarelo (confirmar se é a titular de 2025-26)) |
| camisas montenegro 01 (conferido de novo, 18/nov) | 10 de 10 | - |
| camisas noruega 01 (conferido de novo, 18/nov) | 24 de 28 | ranheim-fotball (aparece o cabide e as listras brancas sumiram ao tirar o fundo); start (aparece o suporte do manequim na gola); il-h-dd (camisa antiga (2020)); str-mmen (a fonte é a camisa reserva de 2020, não a titular) |
| camisas país de gales 01 (conferido de novo, 18/nov) | 13 de 13 | - |
| camisas polônia 01 (conferido de novo, 18/nov) | 30 de 37 | jagiellonia (mancha branca do lado esquerdo da camisa (pedaço do fundo)); korona-kielce (sombra cinza embaixo da camisa); lechia-gdansk (aparece o manequim na gola e as listras brancas sumiram ao tirar o fundo); legia-varsovia (foto com a manga direita dobrada e sombra); piast-gliwice (fundo bege em volta da camisa que não sai); sel-PL (camisa branca em fundo branco: sumiu quase inteira ao tirar o fundo (mandar com fundo transparente)); stal-mielec (parte branca em fundo branco: as bordas sumiram ao tirar o fundo (mandar com fundo transparente)) |
| camisas portugal 01 (conferido de novo, 18/nov) | 34 de 37 | caldas (veio uma camisa branca e preta; o escudo do Caldas é vermelho e azul (confirmar se é a titular de 2025-26)); sporting-cp (foto amassada, a barra da camisa ficou irregular); felgueiras (camisa antiga (2020-21)) |
| camisas portugal 02 (conferido de novo, 18/nov) | 13 de 13 | - |
| camisas romênia 01 (conferido de novo, 18/nov) | 13 de 16 | arges (veio uma camisa branca; o Argeș joga de roxo (confirmar se é a titular de 2025-26)); hermannstadt (veio uma camisa branca; o Hermannstadt joga de vermelho e preto (confirmar se é a titular de 2025-26)); sel-RO (a fonte é a camisa de aquecimento (pre-match) infantil, não a de jogo) |
| camisas romênia 02 (conferido de novo, 18/nov) | 18 de 19 | csm-olimpia-satu-mare (veio uma camisa roxa e de lado; o Olimpia joga de amarelo e azul) |
| camisas rússia 01 (conferido de novo, 18/nov) | 10 de 17 | akhmat-grozny (camisa no cabide, na frente de uma parede de tijolos); sel-RU (marca do site no canto de cima); sochi (foto torta e amassada); zenit (foto torta e amassada, com reflexo de luz; a barra ficou irregular); dinamo-moscou (a fonte é a camisa reserva de 2025-26, não a titular); lokomotiv-moscou (camisa antiga (foto de 2021)); krylya-sovetov (camisa antiga (2019-20)) |
| camisas rússia 02 (conferido de novo, 18/nov) | 16 de 17 | fc-ufa (veio uma camisa roxa; o escudo do Ufa é verde e azul (confirmar se é a titular de 2025-26)) |
| camisas san marino 01 (conferido de novo, 18/nov) | 12 de 12 | - |
| camisas sérvia 01 (conferido de novo, 18/nov) | 12 de 15 | cukaricki (camisa branca lisa, sem escudo nem patrocínio (parece modelo sem personalização)); partizan (tem um desenho grande (círculo do escudo) atrás da camisa); radnicki-kragujevac (a fonte é a camisa do IMT 2025-26, não a do Radnički Kragujevac) |
| camisas sérvia 02 (conferido de novo, 18/nov) | 9 de 14 | dubocica (a fonte é a camisa do Jedinstvo Ub (a mesma imagem do jedinstvo-ub)); vozdovac (foto torta, com a borda esquerda apagada ao tirar o fundo); rfk-graficar-beograd (a fonte é a terceira camisa de 2023-24, não a titular); trayal-krusevac (a fonte é a camisa reserva de 2022-23, não a titular); vrsac (a fonte é a camisa reserva de 2025-26, não a titular) |
| camisas suécia 01 (conferido de novo, 18/nov) | 15 de 17 | aik (marca do site no canto de cima; e veio uma branca, o AIK joga de preto e amarelo (confirmar a titular de 2025-26)); hammarby (camisa branca em fundo branco: sumiu ao tirar o fundo (mandar com fundo transparente)) |
| camisas suécia 02 (conferido de novo, 18/nov) | 10 de 12 | norrkoping (foto amassada, com pedaços do fundo do lado direito); varnamo (a fonte é a camisa reserva de 2022, não a titular) |
| camisas suíça 01 (conferido de novo, 18/nov) | 18 de 22 | lugano (veio de uma loja de camisas antigas e é amarela; o Lugano joga de preto e branco (mandar a titular de 2025-26)); neuchatel-xamax-fcs (veio de uma loja de camisas antigas (retro); mandar a titular de 2025-26); vaduz (foto torta, de lado); young-boys (contorno branco em volta da camisa) |
| camisas tchéquia 01 (conferido de novo, 18/nov) | 25 de 28 | hanacka-slavia-kromeriz (camisa antiga (2011-12)); karvina (a fonte é a camisa reserva de 2024-25, não a titular); viktoria-plzen (foto de lado e cortada (sem as mangas)) |
| camisas turquia 01 (conferido de novo, 18/nov) | 17 de 19 | sel-TR (foto de lado); samsunspor (foto de lado, a camisa aparece torta) |
| camisas turquia 02 (conferido de novo, 18/nov) | 15 de 15 | - |
| camisas ucrânia 01 (conferido de novo, 18/nov) | 13 de 16 | epicentr (a fonte é a camisa reserva de 2024-25, não a titular); metalist-1925 (camisa num manequim de corpo inteiro (com calção e meias) e com fundo); zorya (moldura preta em volta da camisa) |
| camisas ucrânia 02 (conferido de novo, 18/nov) | 8 de 12 | feniks-mariupol (camisa antiga (2018-19, ainda do FC Mariupol)); metalurh-zaporizhzhia (a fonte é a terceira camisa do Nyva Ternopil, não a do Metalurh); prykarpattia-ivano-frankivsk (camisa antiga (2021-22)); ucsa-tarasivka (a fonte é a camisa reserva de 2026-27, não a titular) |
| camisas extra-01 (19 países da América) | 43 de 77 | ver "Refazer (camisas)" |
