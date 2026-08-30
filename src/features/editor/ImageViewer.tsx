import { useCallback, useRef } from 'react'
import { MarkerArea } from 'markerjs2'
import type { MarkerAreaRenderEvent } from 'markerjs2'
import { saveImageFile } from '../../lib/attachments'
import { showToast } from '../../components/Toast'
import s from './ImageViewer.module.css'

interface Props {
  noteId: string
  title: string
  url: string
  onSave: (noteId: string, title: string, body: string) => void
}

/** Converte o `data:` URL que o markerjs devolve ao renderizar a anotacao
 *  direto em File, SEM REDE.
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
 *  'image/png' - o markerjs pode devolver outro tipo no futuro. */
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
  const imgRef = useRef<HTMLImageElement>(null)

  const openEditor = useCallback(() => {
    const img = imgRef.current
    if (!img) return

    const area = new MarkerArea(img)

    // 'inline' (o padrao da biblioteca) posiciona o coverDiv usando o
    // offsetTop/offsetLeft do <img> relativo ao PROPRIO offsetParent, mas o
    // coverDiv e anexado direto no <body> - por isso o editor nascia colado
    // no canto superior esquerdo da janela. 'popup' faz o coverDiv cobrir a
    // janela inteira (fixed, escurecido) e centraliza o cartao por margem
    // simetrica - sem essa troca nao ha centralizacao possivel so por CSS.
    area.settings.displayMode = 'popup'
    area.settings.popupMargin = 32

    // Minimal dark-theme tinting to not clash with the app
    area.settings.defaultColorsFollowCurrentColors = true
    area.uiStyleSettings.toolbarBackgroundColor = '#141417'
    area.uiStyleSettings.toolbarBackgroundHoverColor = '#1a1a1e'
    area.uiStyleSettings.toolbarColor = '#e8e8ec'
    area.uiStyleSettings.toolboxBackgroundColor = '#141417'
    area.uiStyleSettings.toolboxColor = '#e8e8ec'
    area.uiStyleSettings.toolboxAccentColor = '#e05a38'
    area.uiStyleSettings.canvasBackgroundColor = '#141417'

    area.addEventListener('render', async (event: MarkerAreaRenderEvent) => {
      // Bloco todo com tratamento proprio: nenhuma falha aqui pode virar
      // rejeicao solta (cairia no handler global generico) - o usuario
      // sempre ve o aviso ESPECIFICO desta acao.
      try {
        const file = dataUrlToFile(event.dataUrl, 'annotation.png')
        const newUrl = await saveImageFile(file)
        if (newUrl) {
          onSave(noteId, title, `![imagem](${newUrl})`)
          showToast('info', 'Anotação salva', 'Imagem atualizada com as marcações.')
        } else {
          showToast('warn', 'Erro', 'Não foi possível salvar a anotação.')
        }
      } catch (err) {
        console.error('[ImageViewer] falha ao salvar anotacao', err)
        showToast('warn', 'Erro', 'Não foi possível salvar a anotação.')
      }
    })

    area.show()
  }, [noteId, title, onSave])

  return (
    <div className={s.wrap}>
      <div className={s.imageContainer}>
        <img
          ref={imgRef}
          src={url}
          alt={title}
          className={s.image}
        />
      </div>
      <div className={s.toolbar}>
        <button className={`${s.btnEdit} hoverGlow`} onClick={openEditor}>
          Editar imagem
        </button>
      </div>
    </div>
  )
}
