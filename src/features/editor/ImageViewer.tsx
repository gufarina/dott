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

export function ImageViewer({ noteId, title, url, onSave }: Props) {
  const imgRef = useRef<HTMLImageElement>(null)

  const openEditor = useCallback(() => {
    const img = imgRef.current
    if (!img) return

    const area = new MarkerArea(img)

    // Minimal dark-theme tinting to not clash with the app
    area.settings.defaultColorsFollowCurrentColors = true
    area.uiStyleSettings.toolbarBackgroundColor = '#141417'
    area.uiStyleSettings.toolbarBackgroundHoverColor = '#1a1a1e'
    area.uiStyleSettings.toolbarColor = '#e8e8ec'
    area.uiStyleSettings.toolboxBackgroundColor = '#141417'
    area.uiStyleSettings.toolboxColor = '#e8e8ec'
    area.uiStyleSettings.toolboxAccentColor = '#e05a38'

    area.addEventListener('render', async (event: MarkerAreaRenderEvent) => {
      const dataUrl = event.dataUrl
      // dataUrl → Blob → File
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      const file = new File([blob], 'annotation.png', { type: 'image/png' })
      const newUrl = await saveImageFile(file)
      if (newUrl) {
        onSave(noteId, title, `![imagem](${newUrl})`)
        showToast('info', 'Anotação salva', 'Imagem atualizada com as marcações.')
      } else {
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
        <button className={s.btnEdit} onClick={openEditor}>
          Editar imagem
        </button>
      </div>
    </div>
  )
}
