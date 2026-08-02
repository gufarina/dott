import { useEffect, useState } from 'react'
import { appDataDir } from '@tauri-apps/api/path'
import { useStore } from '../store'
import { showToast } from './Toast'
import { backupNow, backupsList, restoreBackup, openBackupsFolder } from '../lib/backupService'
import { Icon } from './Icon'
import s from './Settings.module.css'

export function Settings({ open, onClose }: { open: boolean; onClose: () => void }) {
  const theme = useStore(st => st.theme)
  const toggleTheme = useStore(st => st.toggleTheme)
  const [dataPath, setDataPath] = useState('')
  const [backups, setBackups] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

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

  const replayOnboarding = () => { onClose(); window.dispatchEvent(new Event('dott:replay-onboarding')) }

  return (
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
            <div className={s.pathRow}>
              <div className={s.label}>Onde seus dados ficam</div>
              <code className={s.path}>{dataPath || '%APPDATA%\\com.studiofarina.dott'}</code>
            </div>
            <div className={s.foot}>Dott · 100% offline · seus dados nunca saem da máquina</div>
          </section>
        </div>
      </div>
    </div>
  )
}
