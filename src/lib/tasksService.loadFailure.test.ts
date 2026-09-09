// @vitest-environment jsdom
/** tasksService.loadFailure.test.ts - TASK-495 item 3.
 *
 * Mesmo caso de foldersService.loadFailure.test.ts, para `tasks_load`.
 * Prova que reprova sem o conserto: o spy em `showToast` fica sem chamada
 * nenhuma, porque o `catch` original de `loadTasks` so devolvia `null`.
 */
import { describe, expect, it, vi } from 'vitest'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn().mockRejectedValue(new Error('arquivo corrompido')) }))

import * as Toast from '../components/Toast'
import { loadTasks } from './tasksService'

describe('loadTasks - falha vira aviso, nunca silencio', () => {
  it('rejeicao do invoke mostra um Toast humano e preserva o comportamento de nao derrubar o app', async () => {
    const toastSpy = vi.spyOn(Toast, 'showToast')

    const result = await loadTasks()

    expect(result).toBeNull()
    expect(toastSpy).toHaveBeenCalledWith(
      'warn',
      'Não consegui abrir suas tarefas',
      'O conteúdo original continua salvo e nada será sobrescrito.',
    )
  })
})
