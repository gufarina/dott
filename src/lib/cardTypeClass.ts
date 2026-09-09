/* cardTypeClass.ts — mapa UNICO CardType -> sufixo de classe CSS de tipo.
 *
 * TASK-343: extraido daqui pra nao duplicar o mesmo mapa em dois lugares
 * (InboxPanel.tsx, que ainda usa pros badges da lista e do modal de
 * processar, e CaptureBox.tsx, novo dono da caixa de captura). A casa ja
 * tropecou 3x em fragmentacao de mecanica (TASK-314, TASK-327, TASK-338) -
 * o mapa nasce uma vez so, os dois consumidores importam daqui.
 *
 * As CORES de cada `.type-*` continuam declaradas em CSS (uma vez em
 * InboxPanel.module.css, espelhadas em CaptureBox.module.css - mesma
 * convencao ja usada em Widget.module.css, que roda numa janela separada e
 * por isso nao pode importar CSS Module nenhum).
 */
import type { CardType } from '../store'

export const TYPE_CLASS: Record<CardType, string> = {
  NOTA: 'nota', CODIGO: 'codigo', SHELL: 'shell', URL: 'url', IDEIA: 'ideia',
  AUDIO: 'audio', VIDEO: 'video', IMAGEM: 'imagem', ARQUIVO: 'arquivo', LINK: 'link',
  PROMPT: 'prompt', TAREFA: 'tarefa', CONTATO: 'contato',
}

/** Correcao de acento pra quando o CardType (id de maquina, sempre ASCII) e
 *  usado como TEXTO DE TELA (badge, rotulo). So os 3 tipos cuja grafia correta
 *  em portugues exige acento entram aqui - os demais tipos ja sao identicos
 *  escritos ou nao (ex: SHELL, URL, TAREFA). Nunca acentua o id, so oferece o
 *  texto certo pra quem for exibi-lo. */
export const TYPE_ACCENT_FIX: Partial<Record<CardType, string>> = {
  CODIGO: 'Código', AUDIO: 'Áudio', VIDEO: 'Vídeo',
}
