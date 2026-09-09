import { useStore, SEM_PASTA_ID } from '../store'
import { Icon } from './Icon'
import { Button } from './ui'
import s from './Breadcrumb.module.css'

export function Breadcrumb() {
  const view = useStore(st => st.view)
  const category = useStore(st => st.category)
  const folder = useStore(st => st.folder)
  const para = useStore(st => st.para)
  const navigateBack = useStore(st => st.navigateBack)
  const setView = useStore(st => st.setView)
  const taskId = useStore(st => st.task)
  const tasks = useStore(st => st.tasks)

  if (view === 'board') return null

  const quad = category ? para[category] : null
  const folderObj = folder && quad ? quad.folders.find(f => f.id === folder) : null
  /** Balde virtual "Sem pasta" (SEM_PASTA_ID, PARAGrid.tsx): nunca tem
   *  categoria real, entao nao passa por `quad`/`folderObj` acima. */
  const semPasta = folder === SEM_PASTA_ID
  /** Na tela da tarefa o caminho termina nela, com o titulo encurtado. */
  const tarefa = view === 'task' ? tasks.find(t => t.id === taskId) : null
  const tituloCurto = tarefa
    ? (tarefa.text.length > 42 ? tarefa.text.slice(0, 40).trim() + '…' : tarefa.text)
    : null

  return (
    <div className={s.breadcrumb}>
      <Button className={s.back} onClick={navigateBack} title="Voltar" aria-label="Voltar">
        <Icon name="voltar" size={14} />
      </Button>
      <Button as="span" className={s.item} onClick={() => setView('board', {})}>PARA</Button>
      {quad && (
        <>
          <span className={s.sep}>›</span>
          {/* Sobe UM nivel (a categoria), nao ate o board: o caminho tem que
              andar degrau por degrau. "PARA" e quem volta pro board. */}
          <Button
            as="span"
            className={`${s.item} ${!folder ? s.active : ''}`}
            aria-current={!folder ? 'page' : undefined}
            title={`Ver todas as pastas de ${quad.label}`}
            onClick={() => setView('canvas', { category: category!, folder: '' })}
          >
            {quad.label}
          </Button>
        </>
      )}
      {semPasta && (
        <>
          <span className={s.sep}>›</span>
          <span className={`${s.item} ${tarefa ? '' : s.active}`}>Sem pasta</span>
        </>
      )}
      {folderObj && (
        <>
          <span className={s.sep}>›</span>
          <Button
            as="span"
            className={`${s.item} ${tarefa ? '' : s.active}`}
            /* Sem tarefa aberta, esta e a POSICAO ATUAL da trilha, nao um
               destino: nao tem pra onde levar. `disabled` mantem isso fora da
               ordem de tabulacao - do contrario a migracao pro componente
               canonico teria adicionado uma parada de teclado que nao faz nada. */
            disabled={!tarefa}
            onClick={tarefa ? () => setView('canvas', { category: category!, folder: folder! }) : undefined}
            title={tarefa ? `Voltar para ${folderObj.name}` : undefined}
            aria-current={tarefa ? undefined : 'page'}
          >
            {folderObj.name}
          </Button>
        </>
      )}
      {tituloCurto && (
        <>
          <span className={s.sep}>›</span>
          <span className={`${s.item} ${s.active}`} title={tarefa!.text}>{tituloCurto}</span>
        </>
      )}
    </div>
  )
}
