/** Dott Online — escolha de onde as notas moram + lista de espera.
 *
 * Regra de arquitetura: o Dott NAO fala com a internet. Nenhum cliente HTTP
 * entra aqui. Quem envia o e-mail e o NAVEGADOR do usuario, aberto pelo
 * sistema — o app so passa o link. A intencao fica registrada no disco dele.
 */
import { openUrl } from '@tauri-apps/plugin-opener'

const MODE_KEY = 'dott:storage-mode'
const WL_KEY = 'dott:online-waitlist'

/** Formulario da lista de espera. `{email}` e trocado pelo e-mail digitado.
 *  Vazio = a intencao fica so na maquina do usuario (nada sai daqui). */
export const WAITLIST_URL: string = ''

export type StorageMode = 'local' | 'cloud'

export function getStorageMode(): StorageMode {
  try { return localStorage.getItem(MODE_KEY) === 'cloud' ? 'cloud' : 'local' } catch { return 'local' }
}

export function setStorageMode(mode: StorageMode) {
  try { localStorage.setItem(MODE_KEY, mode) } catch { /* ignora */ }
}

/** E-mail ja inscrito na lista, ou '' se o usuario nunca pediu. */
export function waitlistEmail(): string {
  try { return JSON.parse(localStorage.getItem(WL_KEY) || '{}').email || '' } catch { return '' }
}

export function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())
}

/** Registra o pedido no disco e abre o formulario no navegador (se houver). */
export async function joinWaitlist(email: string): Promise<void> {
  const clean = email.trim()
  try { localStorage.setItem(WL_KEY, JSON.stringify({ email: clean, ts: Date.now() })) } catch { /* ignora */ }
  if (!WAITLIST_URL) return
  try { await openUrl(WAITLIST_URL.replace('{email}', encodeURIComponent(clean))) } catch { /* fila fica local */ }
}
