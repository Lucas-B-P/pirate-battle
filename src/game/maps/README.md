# Como criar / editar o mapa

## Onde editar

Arquivo principal:

`src/game/maps/channel.level.ts`

Altere as strings em `LEVEL_ROWS`. Cada letra é um tile 64×64.

| Char | Significado |
| --- | --- |
| `.` | Água (barcos passam) |
| `S` | Areia (bloqueia) |
| `G` | Grama (bloqueia) |
| `R` | Areia + rocha |
| `P` | Grama + palmeira |
| `T` | Areia + torre |

Tiles visuais vêm de `assets/png/default/tiles/` e do sheet em `assets/tilesheet/`.

## Fluxo

1. Edite `channel.level.ts`
2. Salve
3. `npm run dev` e abra a partida

## Editor externo (opcional)

Use [Tiled](https://www.mapeditor.org/) com grid 64×64, exporte CSV e cole as linhas em `LEVEL_ROWS` (trocando números pela legenda acima).
