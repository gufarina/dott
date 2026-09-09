// @vitest-environment jsdom
/** Prova o contrato que a troca pro Filerobot introduziu: diferente do
 * markerjs2 (que fechava o proprio popup sozinho), o Filerobot NAO fecha
 * a tela ao salvar - quem fecha e o ImageViewer, tratando o resultado de
 * `onSave` explicitamente. Este teste cobre o caminho de SUCESSO (editor
 * fecha, nota e atualizada com o markdown da imagem nova); o caminho de
 * FALHA (editor continua aberto) esta em ImageViewer.saveFailure.test.tsx.
 * Cobre tambem o botao "Voltar"/fechar do proprio editor (`onClose`), que
 * tem que fechar a tela mesmo sem salvar. */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ImageViewer } from './ImageViewer'
import { removeAttachment } from '../../lib/attachments'

const PNG_1X1_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

vi.mock('../../lib/attachments', () => ({
  removeAttachment: vi.fn().mockResolvedValue(undefined),
  saveImageFile: vi.fn().mockResolvedValue('vault://nova.png'),
  readAttachmentBlobUrl: vi.fn().mockResolvedValue('blob:mock-1'),
}))

type FilerobotProps = {
  onSave: (savedImageData: { imageBase64?: string }) => void | Promise<void>
  onClose: () => void
  onBeforeSave: (savedImageData: { imageBase64?: string }) => void | boolean
}
let captured: FilerobotProps | null = null

vi.mock('react-filerobot-image-editor', () => ({
  default: (props: FilerobotProps) => {
    captured = props
    return <div data-testid="filerobot-mock" />
  },
}))

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('ImageViewer - fecha a tela do editor', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    captured = null
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  async function openEditor(onSave = vi.fn()) {
    act(() => {
      root.render(<ImageViewer noteId="n1" title="Print" url="vault://velha.png" onSave={onSave} />)
    })
    await act(async () => { await Promise.resolve() }) // blob chega
    act(() => { (container.querySelector('button') as HTMLButtonElement).click() })
    await act(async () => { await Promise.resolve() }) // Suspense/lazy resolve
    return onSave
  }

  it('salvar com sucesso atualiza a nota com a imagem NOVA e fecha o editor', async () => {
    const onSave = await openEditor()
    expect(document.querySelector('[data-testid="filerobot-mock"]')).toBeTruthy()

    await act(async () => {
      await captured!.onSave({ imageBase64: `data:image/png;base64,${PNG_1X1_B64}` })
    })

    expect(onSave).toHaveBeenCalledWith('n1', 'Print', '![imagem](vault://nova.png)')
    // O editor some da tela - o mock (e o proprio Suspense) nao estao mais montados.
    expect(document.querySelector('[data-testid="filerobot-mock"]')).toBeNull()
    // SUBSTITUI: a imagem velha sai do vault assim que a nota passa a
    // apontar pra nova - senao cada edicao deixaria uma copia orfa pra tras.
    expect(removeAttachment).toHaveBeenCalledWith('vault://velha.png')
  })

  /** O clique em "Salvar" tem que SALVAR - nao abrir o "Salvar como"
   *  (nome do arquivo, formato, qualidade, redimensionar) que o Filerobot
   *  mostra por padrao e que o CEO leu, com razao, como "salvando fora do
   *  app". MEDIDO no fonte do pacote (SaveButton/index.js,
   *  `triggerSaveHandler`): o unico jeito de pular esse modal e `onBeforeSave`
   *  devolver `false`. Este teste trava esse contrato: se alguem tirar a prop
   *  ou fizer ela devolver outra coisa, o modal volta e a friccao volta com
   *  ele. */
  it('nao abre o modal "Salvar como": onBeforeSave devolve false', async () => {
    await openEditor()
    expect(captured!.onBeforeSave({ imageBase64: 'irrelevante' })).toBe(false)
  })

  it('onClose (botao Voltar/fechar do proprio editor) fecha a tela sem salvar', async () => {
    const onSave = await openEditor()
    expect(document.querySelector('[data-testid="filerobot-mock"]')).toBeTruthy()

    act(() => { captured!.onClose() })

    expect(onSave).not.toHaveBeenCalled()
    expect(document.querySelector('[data-testid="filerobot-mock"]')).toBeNull()
  })
})
