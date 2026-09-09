/** FolderHintChip.tsx — o ajudante de pasta (TASK-325/326, item 4).
 * Widget quieto abaixo do titulo: nunca modal, nunca acima do texto, nunca
 * move a nota sozinho. A regra de QUANDO mostrar (nao-piscar) mora em
 * folderHint.ts — este componente so desenha o que ja foi decidido. */
import { Icon } from '../../components/Icon'
import { Button } from '../../components/ui'
import type { FolderSuggestion } from '../../lib/interpret'
import s from './FolderHintChip.module.css'

export function FolderHintChip({
  suggestion,
  onAccept,
  onDismiss,
}: {
  suggestion: FolderSuggestion
  onAccept: () => void
  onDismiss: () => void
}) {
  return (
    <div className={s.hint}>
      <Icon name="sugestao" size={14} />
      <span className={s.txt}>
        Parece <b>{suggestion.folderName}</b>: {suggestion.reason}
      </span>
      <span className={s.actions}>
        <Button className={s.aceitar} onClick={onAccept}>Mover</Button>
        <Button className={s.ignorar} onClick={onDismiss}>Agora não</Button>
      </span>
    </div>
  )
}
