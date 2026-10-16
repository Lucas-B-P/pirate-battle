/**
 * ============================================================
 *  MAPA DO JOGO — edite AQUI
 * ============================================================
 * Cada caractere = 1 tile (TILE_SIZE px; mundo bem maior que o tile clássico de 64).
 *
 * Legenda:
 *   .  água (navegável)
 *   S  areia (bloqueia)
 *   G  grama (bloqueia)
 *   R  areia + rocha
 *   P  grama + palmeira
 *   T  areia + torre do forte
 *
 * Dica: mantenha um canal de '.' largo o suficiente para os barcos.
 * Depois de salvar, recarregue o jogo (npm run dev).
 *
 * Também dá para desenhar no editor Tiled (https://www.mapeditor.org)
 * exportando CSV e colando as linhas abaixo.
 */

/** Mundo 10× o tile clássico de 64px (câmera mostra só uma fatia). */
export const TILE_SIZE = 640

/** Largura/altura do mapa em tiles (derivadas do grid abaixo). */
export const LEVEL_ROWS = [
  //              1         2         3
  //     123456789012345678901234567890
  'SSSSSS............SSSSSSSSSS......', // 0
  'SSSSSSS..........SSSSGGGGSSSS.....', // 1
  'SSSTTSS.........SSSGGGGGGGSSS.....', // 2
  'SSSSSS..........SSGGPPGGGSSS......', // 3
  'SSS..............SGGGGGGSS........', // 4
  'SS.................GGGSSS.........', // 5
  '.....................SSS..........', // 6
  '..........RR......................', // 7
  '.........SSSS.....................', // 8
  '........SSGGSS....................', // 9
  '.........SSSS.....................', // 10
  '..................................', // 11
  '..................................', // 12
  'SS.......................SSSSSS...', // 13
  'SSS.....................SSGGGGSS..', // 14
  'SSSS...................SSGGPPGGSS.', // 15
  'SSSSS.................SSSGGGGGSSS.', // 16
] as const

export type TileCode = '.' | 'S' | 'G' | 'R' | 'P' | 'T'

export function getLevelSize() {
  const rows = LEVEL_ROWS.length
  const cols = LEVEL_ROWS[0]?.length ?? 0
  return {
    cols,
    rows,
    width: cols * TILE_SIZE,
    height: rows * TILE_SIZE,
  }
}
