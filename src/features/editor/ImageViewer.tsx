import { Component, lazy, Suspense, useCallback, useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { readAttachmentBlobUrl, removeAttachment, saveImageFile } from '../../lib/attachments'
import { showToast } from '../../components/Toast'
import { FILEROBOT_DARK_THEME, FILEROBOT_PT_BR_TRANSLATIONS } from './filerobotConfig'
import s from './ImageViewer.module.css'

// TASK-407: carregado SOB DEMANDA - o Filerobot (Konva + UI propria) so
// entra no bundle quando a tela de edicao de fato abre, nunca no caminho da
// captura rapida (abrir uma nota-imagem so pra VER ela nao paga esse peso).
const FilerobotImageEditor = lazy(() => import('react-filerobot-image-editor'))

interface Props {
  noteId: string
  title: string
  url: string
  onSave: (noteId: string, title: string, body: string) => void
}

/** Formato minimo do que o Filerobot devolve em `onSave` - so o campo que a
 *  gente usa. O objeto real tem mais campos (nome, extensao, dimensoes...),
 *  ver node_modules/react-filerobot-image-editor/lib/index.d.ts. */
interface FilerobotSavedImageData {
  imageBase64?: string
}

/** REGRESSAO MEDIDA (30/08/2026, build 0.2.21 - o botao "Editar imagem" nao
 *  fazia NADA, sem erro nenhum visivel): causa raiz era um defeito real do
 *  pacote `react-filerobot-image-editor@5.0.1` (3 arquivos do `lib/`
 *  compilados com `React.createElement` mas SEM `import React from 'react'`
 *  - `ReferenceError: React is not defined` na primeira montagem,
 *  consertado por patch em `patches/react-filerobot-image-editor+5.0.1.patch`
 *  via patch-package). Mesmo com a causa raiz corrigida, o clique NUNCA MAIS
 *  pode falhar mudo: esta boundary cobre (a) o import dinamico do editor
 *  rejeitando (chunk corrompido, falha de rede pontual) e (b) qualquer
 *  excecao de RENDER dentro do editor (o `Suspense` sozinho so cobre o
 *  estado de carregando, nunca erro). Sem isto, a excecao subiria ate o
 *  ErrorBoundary global (src/main.tsx) e derrubaria o app INTEIRO so por
 *  causa da tela de imagem - aqui ela morre local, com o mesmo toast que o
 *  usuario ja conhece, e devolve o controle pro pai (`onError`) pra fechar a
 *  tela e permitir tentar de novo. */
class ImageEditorErrorBoundary extends Component<{ onError: () => void; children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(error: unknown) {
    console.error('[ImageViewer] falha ao abrir o editor', error)
    showToast('warn', 'Erro', 'Não foi possível abrir o editor de imagem.')
    this.props.onError()
  }
  render() {
    if (this.state.hasError) return null
    return this.props.children
  }
}

/** Converte o `data:` URL que o editor devolve ao salvar direto em File,
 *  SEM REDE.
 *  MEDIDO (defeito anterior a 30/08/2026, so ficou visivel quando o handler
 *  global de rejeicao entrou): o codigo antigo fazia `fetch(dataUrl)`, mas
 *  `fetch()` sobre `data:` e um request de verdade e cai sob `connect-src`
 *  da CSP (src-tauri/tauri.conf.json) - a politica so libera `data:`/`blob:`
 *  em `img-src` (por isso a imagem SEMPRE apareceu normal), nunca em
 *  `connect-src`. O fetch era bloqueado, a promise rejeitava, e a anotacao
 *  nunca chegava a `saveImageFile`. Decodificar o base64 na mao (`atob`)
 *  fica fora da rede, fora do alcance da CSP - nao precisa alargar a
 *  politica pra um caso que nao precisa de rede nenhuma.
 *  Le o mime do proprio cabecalho do data URL em vez de cravar
 *  'image/png' - o editor pode devolver outro tipo (jpeg, webp) conforme a
 *  extensao escolhida no "Salvar como". */
export function dataUrlToFile(dataUrl: string, filename: string): File {
  const m = dataUrl.match(/^data:([^;,]*);base64,(.*)$/s)
  if (!m) throw new Error('data URL invalida ou nao-base64: ' + dataUrl.slice(0, 32))
  const mime = m[1] || 'image/png'
  const binary = atob(m[2])
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new File([bytes], filename, { type: mime })
}

export function ImageViewer({ noteId, title, url, onSave }: Props) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)

  // Troca a origem do <img> (e a fonte que o editor vai usar) pra um
  // `blob:` mesma-origem assim que os bytes do anexo chegam do lado nativo.
  // Ate isso resolver, mostra a URL original (evita flash em branco) - a
  // troca e rapida (leitura local) bem antes de um clique humano em
  // "Editar imagem". `cancelled`/`current` cobrem troca de nota e
  // desmontagem no meio da leitura: nunca deixa um blob sem dono vazando.
  useEffect(() => {
    let cancelled = false
    let current: string | null = null
    setBlobUrl(null)
    readAttachmentBlobUrl(url).then((b) => {
      if (cancelled) { if (b) URL.revokeObjectURL(b); return }
      current = b
      setBlobUrl(b)
    })
    return () => {
      cancelled = true
      if (current) URL.revokeObjectURL(current)
    }
  }, [url])

  // So abre com o blob pronto: o Filerobot desenha a imagem num <canvas>
  // (Konva) e depois exporta por toDataURL() - origem cruzada
  // (http://asset.localhost) sem CORS sujaria o canvas, mesmo defeito que a
  // troca acima ja resolve pro <img>. NUNCA passar `url` (asset.localhost)
  // direto pro editor.
  const openEditor = useCallback(() => {
    if (!blobUrl) return
    setIsEditorOpen(true)
  }, [blobUrl])

  const closeEditor = useCallback(() => setIsEditorOpen(false), [])

  const handleSave = useCallback(async (savedImageData: FilerobotSavedImageData) => {
    // Bloco todo com tratamento proprio: nenhuma falha aqui pode virar
    // rejeicao solta (cairia no handler global generico) - o usuario
    // sempre ve o aviso ESPECIFICO desta acao. Em falha, o editor
    // continua aberto (o usuario pode tentar salvar de novo); so fecha
    // no caminho de sucesso.
    try {
      if (!savedImageData.imageBase64) throw new Error('Filerobot nao devolveu imageBase64')
      const file = dataUrlToFile(savedImageData.imageBase64, 'annotation.png')
      const newUrl = await saveImageFile(file)
      if (newUrl) {
        onSave(noteId, title, `![imagem](${newUrl})`)
        showToast('info', 'Anotação salva', 'Imagem atualizada com as marcações.')
        setIsEditorOpen(false)
        // SUBSTITUI, nao acumula: assim que o corpo da nota aponta pra
        // imagem nova, o arquivo antigo virou orfao dentro de
        // attachments/ - ninguem mais o alcanca pela UI. Faxina
        // best-effort (removeAttachment ja engole a propria falha), DEPOIS
        // de fechar: nada aqui pode reabrir a tela nem virar aviso de erro
        // de um salvamento que ja deu certo.
        try { await removeAttachment(url) } catch { /* best-effort */ }
      } else {
        showToast('warn', 'Erro', 'Não foi possível salvar a anotação.')
      }
    } catch (err) {
      console.error('[ImageViewer] falha ao salvar anotacao', err)
      showToast('warn', 'Erro', 'Não foi possível salvar a anotação.')
    }
  }, [noteId, title, url, onSave])

  return (
    <div className={s.wrap}>
      <div className={s.imageContainer}>
        <img
          src={blobUrl ?? url}
          alt={title}
          className={s.image}
        />
      </div>
      <div className={s.toolbar}>
        <button className={`${s.btnEdit} hoverGlow`} onClick={openEditor} disabled={!blobUrl}>
          Editar imagem
        </button>
      </div>

      {/* PORTAL PRO <body> - NAO E ENFEITE, e o que faz o editor aparecer.
          REGRESSAO MEDIDA (31/08/2026, 0.2.23 na maquina do CEO): o editor
          abria "pelado" - so as dimensoes, o icone de layout e o zoom, tudo
          no meio da barra de cima. Faltavam as 6 abas, desfazer/refazer,
          Salvar e fechar. Medido dentro do binario real (DOM + rects +
          elementFromPoint): os elementos ESTAVAM todos no DOM, no lugar
          certo (.FIE_tabs_navbar 108x620 @33,98; Salvar @49,49;
          desfazer/refazer @982,49) - so nao eram PINTADOS. Este componente
          vive dentro de `.central` (App.module.css), que tem
          `mask-image: paint(squircle)`, e mascara recorta a pintura da
          subarvore inteira: `.central` media 600x696 @300,44, entao tudo do
          editor fora dessa faixa de 600px central sumia. z-index nao
          resolve - o corte acontece depois de compor. Sobrava justamente
          `.FIE_topbar-center-options` (@427,49), que cai dentro da faixa: e
          exatamente o que o CEO viu. O markerjs2 (editor anterior) nunca
          sofreu disso porque anexava a UI dele no <body> sozinho; o
          Filerobot renderiza onde a gente manda, entao o portal e nossa
          responsabilidade. Coberto por ImageViewer.portal.test.tsx. */}
      {isEditorOpen && blobUrl && createPortal(
        <div className={s.editorOverlay}>
          <div className={s.editorCard}>
            <ImageEditorErrorBoundary onError={closeEditor}>
              <Suspense fallback={<div className={s.editorLoading}>Carregando editor...</div>}>
                <FilerobotImageEditor
                  source={blobUrl}
                  onSave={handleSave}
                  onClose={closeEditor}
                  // SALVAR = SUBSTITUIR A IMAGEM DA NOTA, sem escala nenhuma
                  // pelo caminho. MEDIDO no fonte do pacote
                  // (node_modules/react-filerobot-image-editor/lib/components/
                  // buttons/SaveButton/index.js, funcao `triggerSaveHandler`):
                  // por padrao o clique em "Salvar" NAO salva - abre o modal
                  // "Salvar como" (nome do arquivo, formato, qualidade,
                  // redimensionar), que e o comportamento de EXPORTAR ARQUIVO
                  // de um editor avulso e nao tem sentido aqui: a imagem ja
                  // esta dentro do app, o destino ja e conhecido, e escolher
                  // nome/formato so cria friccao (invariante no-friction do
                  // Client). O mesmo `triggerSaveHandler` mostra a unica porta
                  // pra pular esse modal: `onBeforeSave` devolvendo `false`
                  // manda ele salvar direto. Nada aqui grava fora do vault -
                  // o Filerobot nunca baixa arquivo sozinho; quem escreve em
                  // disco e o `saveImageFile` (comando save_attachment), e ele
                  // so escreve em $APPDATA/.../attachments/.
                  onBeforeSave={() => false}
                  // Sem o modal, ninguem mais escolhe nome/extensao: crava os
                  // dois. Sem isto o formato sairia do nome da fonte, que aqui
                  // e uma `blob:` sem extensao nenhuma.
                  defaultSavedImageName="anotacao"
                  defaultSavedImageType="png"
                  theme={FILEROBOT_DARK_THEME}
                  language="pt"
                  translations={FILEROBOT_PT_BR_TRANSLATIONS}
                  useBackendTranslations={false}
                  savingPixelRatio={1}
                  previewPixelRatio={window.devicePixelRatio || 1}
                />
              </Suspense>
            </ImageEditorErrorBoundary>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
