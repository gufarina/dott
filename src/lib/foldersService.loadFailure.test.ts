// @vitest-environment jsdom
/** foldersService.loadFailure.test.ts - TASK-495 item 3.
 *
 * `folders_load` pode devolver Err quando o arquivo esta corrompido E a
 * quarentena falhou. Antes deste teste, `loadFolders` engolia a rejeicao e
 * devolvia `null` em silencio - o usuario nunca ficava sabendo que o app nao
 * conseguiu abrir as pastas dele (o Rust ja protege o dado, recusando
 * sobrescrever; faltava AVISAR). Prova que reprova sem o conserto: o spy em
 * `showToast` fica sem chamada nenhuma, porque o `catch` original nao
 * chamava toast nenhum.
 */
import { describe, expect, it, vi } from 'vitest'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn().mockRejectedValue(new Error('arquivo corrompido')) }))

import * as Toast from '../components/Toast'
import { loadFolders } from './foldersService'

describe('loadFolders - falha vira aviso, nunca silencio', () => {
  it('rejeicao do invoke mostra um Toast humano e preserva o comportamento de nao derrubar o app', async () => {
    const toastSpy = vi.spyOn(Toast, 'showToast')

    const result = await loadFolders()

    expect(result).toBeNull() // app segue de pe, sem sobrescrever nada
    expect(toastSpy).toHaveBeenCalledWith(
      'warn',
      'Não consegui abrir suas pastas',
      'O conteúdo original continua salvo e nada será sobrescrito.',
    )
  })
})
