import { useEffect, useState } from 'react'
import { appDataDir } from '@tauri-apps/api/path'
import { useStore } from '../store'
import { showToast } from './Toast'
import { backupNow, backupsList, restoreBackup, openBackupsFolder } from '../lib/backupService'
import { Icon } from './Icon'
import { waitlistEmail } from '../lib/online'
import { Modal, ModalHint, ModalFooter, ModalButton } from './Modal'
import type { ExamplePlan } from '../lib/exampleContent'
import s from './Settings.module.css'

export function Settings({ open, onClose }: { open: boolean; onClose: () => void }) {
  const theme = useStore(st => st.theme)
  const toggleTheme = useStore(st => st.toggleTheme)
  const previewExampleCleanup = useStore(st => st.previewExampleCleanup)
  const clearExamples = useStore(st => st.clearExamples)
  const [dataPath, setDataPath] = useState('')
  const [backups, setBackups] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  /** Plano de limpeza calculado no clique do botao - a confirmacao mostra a
   *  contagem exata ANTES de apagar qualquer coisa (TASK-367-2). */
  const [examplePlan, setExamplePlan] = useState<ExamplePlan | null>(null)

  useEffect(() => {
    if (!open) return
    appDataDir().then(setDataPath).catch(() => {})
    backupsList().then(setBackups)
  }, [open])

  if (!open) return null

  const doBackup = async () => {
    setBusy(true)
    const path = await backupNow()
    setBusy(false)
    if (path) {
      showToast('info', 'Backup feito', 'Cópia completa salva em Documentos › Dott Backups.')
      backupsList().then(setBackups)
    } else {
      showToast('warn', 'Falha no backup', 'Não consegui criar a cópia. Tente de novo.')
    }
  }

  const doRestore = async (name: string) => {
    if (!confirm(`Restaurar o backup "${name}"?\n\nIsso vai SOBRESCREVER suas notas, pastas, tarefas e imagens atuais. O app vai reabrir.`)) return
    setBusy(true)
    const ok = await restoreBackup(name)
    setBusy(false)
    if (ok) { showToast('info', 'Restaurado', 'Reabrindo o Dott…'); setTimeout(() => window.location.reload(), 700) }
    else showToast('warn', 'Falha ao restaurar', 'Não consegui restaurar esse backup.')
  }

  const openClearExamples = () => {
    const plan = previewExampleCleanup()
    const total = plan.noteIds.length + plan.folders.length + plan.taskIds.length + plan.inboxIds.length
    if (total === 0) {
      showToast('info', 'Nada para limpar', 'Não sobrou exemplo, ou você já editou tudo. O que é seu fica onde está.')
      return
    }
    setExamplePlan(plan)
  }

  const confirmClearExamples = () => {
    clearExamples()
    setExamplePlan(null)
    showToast('info', 'Exemplos removidos', 'O que era seu continua intacto.')
  }

  const replayOnboarding = () => { onClose(); window.dispatchEvent(new Event('dott:replay-onboarding')) }
  const openOnline = () => { onClose(); window.dispatchEvent(new Event('dott:open-online')) }

  return (
    <>
    <div className={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={s.modal}>
        <div className={s.header}>
          <span className={s.title}>Configurações</span>
          <button className={s.close} onClick={onClose} aria-label="Fechar" title="Fechar">
            <Icon name="fechar" size={13} />
          </button>
        </div>

        <div className={s.body}>
          <section className={s.section}>
            <div className={s.sectionTitle}>Aparência</div>
            <div className={s.row}>
              <div><div className={s.label}>Tema</div><div className={s.hint}>Claro ou escuro</div></div>
              <button className={s.btn} onClick={toggleTheme}>
                <Icon name="tema" size={13} /> {theme === 'dark' ? 'Escuro' : 'Claro'}
              </button>
            </div>
          </section>

          <section className={s.section}>
            <div className={s.sectionTitle}>Seus dados</div>
            <div className={s.row}>
              <div><div className={s.label}>Backup completo</div><div className={s.hint}>Cópia de tudo (notas, pastas, tarefas, imagens) em Documentos.</div></div>
              <button className={`${s.btn} ${s.primary}`} onClick={doBackup} disabled={busy}>
                <Icon name="backup" size={13} /> Fazer backup agora
              </button>
            </div>
            <div className={s.row}>
              <div><div className={s.label}>Pasta de backups</div><div className={s.hint}>Abrir no explorador de arquivos.</div></div>
              <button className={s.btn} onClick={openBackupsFolder}>
                <Icon name="pasta" size={13} /> Abrir pasta
              </button>
            </div>
            {backups.length > 0 && (
              <div className={s.restoreBox}>
                <div className={s.hint} style={{ marginBottom: 6 }}>Restaurar um backup (sobrescreve o estado atual):</div>
                {backups.slice(0, 6).map(b => (
                  <button key={b} className={s.restoreItem} onClick={() => doRestore(b)} disabled={busy}>
                    <span>{b.replace(/^dott-backup\s*/, '')}</span><span className={s.restoreAction}>restaurar</span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className={s.section}>
            <div className={s.sectionTitle}>Conteúdo de exemplo</div>
            <div className={s.row}>
              <div><div className={s.label}>Notas, pastas e tarefas de exemplo</div><div className={s.hint}>Remove o que veio pronto pra você aprender. O que você escreveu fica.</div></div>
              <button className={s.btn} onClick={openClearExamples}>
                <Icon name="lixo" size={13} /> Limpar exemplos
              </button>
            </div>
          </section>

          <section className={s.section}>
            <div className={s.sectionTitle}>Sobre</div>
            <div className={s.row}>
              <div><div className={s.label}>Captura rápida</div><div className={s.hint}>Atalho global em qualquer app</div></div>
              <kbd className={s.kbd}>Ctrl+Shift+Space</kbd>
            </div>
            <div className={s.row}>
              <div><div className={s.label}>Rever introdução</div><div className={s.hint}>Mostrar o tour de boas-vindas de novo</div></div>
              <button className={s.btn} onClick={replayOnboarding}>
                <Icon name="rever" size={13} /> Rever
              </button>
            </div>
            <div className={s.row}>
              <div><div className={s.label}>Dott Online</div><div className={s.hint}>Suas notas em todos os aparelhos. Ainda não está pronto.</div></div>
              <button className={s.btn} onClick={openOnline}>
                <Icon name="rever" size={13} /> {waitlistEmail() ? 'Você está na lista' : 'Quero saber'}
              </button>
            </div>
            <div className={s.pathRow}>
              <div className={s.label}>Onde seus dados ficam</div>
              <code className={s.path}>{dataPath || '%APPDATA%\\com.studiofarina.dott'}</code>
            </div>
            <div className={s.foot}>Dott · suas notas são arquivos de texto seus, hoje e daqui a dez anos</div>
          </section>
        </div>
      </div>
    </div>

    {examplePlan && (
      <Modal title="Limpar exemplos" onClose={() => setExamplePlan(null)}>
        <ModalHint>Isso remove o que veio pronto com o Dott, pra você aprender:</ModalHint>

        <div>
          <div className={s.row}>
            <div className={s.label}>Notas</div>
            <div className={s.label}>{examplePlan.noteIds.length}</div>
          </div>
          <div className={s.row}>
            <div className={s.label}>Pastas</div>
            <div className={s.label}>{examplePlan.folders.length}</div>
          </div>
          <div className={s.row}>
            <div className={s.label}>Tarefas</div>
            <div className={s.label}>{examplePlan.taskIds.length}</div>
          </div>
          <div className={s.row}>
            <div className={s.label}>Itens da caixa de entrada</div>
            <div className={s.label}>{examplePlan.inboxIds.length}</div>
          </div>
        </div>

        <div className={s.label}>O que você escreveu ou mudou fica exatamente onde está.</div>

        <ModalHint>Quer uma cópia de segurança antes? Feche este aviso e use "Fazer backup agora", ali em cima.</ModalHint>

        <ModalFooter>
          <ModalButton variant="primary" onClick={() => setExamplePlan(null)}>Cancelar</ModalButton>
          <ModalButton variant="ghost" onClick={confirmClearExamples}>
            <Icon name="lixo" size={13} /> Limpar exemplos
          </ModalButton>
        </ModalFooter>
      </Modal>
    )}
    </>
  )
}
