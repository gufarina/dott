/* CaptureBox.tsx — a caixa de captura, MOVIDA do topo do InboxPanel pra
 * dentro do painel do PARA (TASK-343, proposta aprovada em
 * preview/captura-conversacional.html).
 *
 * A MECANICA e a mesma de sempre (nada reescrito, so mudou de lugar e de
 * roupa - pedido explicito do CEO): acao de capturar, contador 4/10,
 * insercao de imagem (botao, arrastar, colar), "Enter envia / Shift+Enter
 * quebra linha", tipo detectado em tempo real (detectType.ts) e o palpite
 * de pasta-destino (interpret.ts). Este componente e o UNICO dono dessa
 * logica agora - antes vivia amarrada dentro de InboxPanel.tsx.
 */
import { useEffect, useRef, useState } from 'react'
import { useStore, CardType } from '../../store'
import { showToast } from '../../components/Toast'
import { imageFromEvent, saveImageFile } from '../../lib/attachments'
import { detectType } from '../../lib/detectType'
import { suggestFolder } from '../../lib/interpret'
import { TYPE_CLASS } from '../../lib/cardTypeClass'
import { Icon } from '../../components/Icon'
import { CardTypeIcon } from '../../components/CardTypeIcon'
import s from './CaptureBox.module.css'

export function CaptureBox() {
  const inbox = useStore(st => st.inbox)
  const para = useStore(st => st.para)
  const notes = useStore(st => st.notes)
  const captureCard = useStore(st => st.captureCard)

  const [text, setText] = useState('')
  const [capturaAtiva, setCapturaAtiva] = useState(false)
  const [arrastandoArquivo, setArrastandoArquivo] = useState(false)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const imgRef = useRef<HTMLInputElement>(null)

  const isFull = inbox.length >= 10
  const detection = text.trim() ? detectType(text) : null

  /** Onde isso costuma morar — palpite do motor local, ANTES de capturar.
   *  So aparece com texto que da pra ler (abaixo disso o palpite e chute). */
  const palpiteDestino = text.trim().length >= 12 && detection
    ? suggestFolder(text, detection.type as CardType, para, notes)
    : null

  /** A caixa cresce com o texto — mesmo mecanismo do InboxPanel de origem
   *  (teto de 150px pra captura nao virar editor). */
  useEffect(() => {
    const el = taRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 150) + 'px'
  }, [text])

  /** Todo caminho de imagem (botao, arrastar, colar) cai aqui. */
  const capturarImagem = async (file: File) => {
    if (isFull) { showToast('warn', 'Inbox cheio (10/10)', 'Processe alguns cards antes.'); return }
    const url = await saveImageFile(file)
    if (!url) { showToast('warn', 'Erro', 'Não consegui salvar a imagem.'); return }
    captureCard(url)
    showToast('info', 'Imagem capturada', 'No inbox como acervo visual.')
  }

  const aoSoltarArquivo = async (e: React.DragEvent) => {
    setArrastandoArquivo(false)
    const file = [...(e.dataTransfer?.files ?? [])].find(f => f.type.startsWith('image/'))
    if (!file) return
    e.preventDefault()
    await capturarImagem(file)
  }

  const capture = () => {
    if (isFull) return
    const val = text.trim()
    if (!val) return
    captureCard(val)
    setText('')
    showToast('info', 'Card capturado', 'Movido para o inbox.')
  }

  return (
    <div className={s.convoWrap}>
      <div
        className={`${s.convoBox} hoverZoom ${arrastandoArquivo ? s.convoSoltando : ''}`}
        onDragOver={e => { e.preventDefault(); if (!isFull) setArrastandoArquivo(true) }}
        onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setArrastandoArquivo(false) }}
        onDrop={aoSoltarArquivo}
      >
        <div className={s.convoMeta}>
          {detection ? (
            <span className={`${s.convoChip} ${s['type-' + TYPE_CLASS[detection.type as CardType]]}`}>
              <CardTypeIcon type={detection.type as CardType} size={9} />
              {detection.label}
            </span>
          ) : (
            <span className={s.convoChipNeutral}>
              <CardTypeIcon type="NOTA" size={9} />
              Nota
            </span>
          )}
          <span className={`${s.convoCounter} ${isFull ? s.convoCounterFull : ''}`}>
            {inbox.length}/10
          </span>
        </div>

        <textarea
          ref={taRef}
          className={s.convoInput}
          placeholder={isFull ? 'Inbox cheio — processe alguns cards' : 'O que está na sua mente?'}
          rows={1}
          value={text}
          disabled={isFull}
          onChange={e => setText(e.target.value)}
          onFocus={() => setCapturaAtiva(true)}
          onBlur={() => setCapturaAtiva(false)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); capture() } }}
          onPaste={async e => {
            const file = imageFromEvent(e.nativeEvent)
            if (!file) return
            e.preventDefault()
            const url = await saveImageFile(file)
            if (url) { captureCard(url); showToast('info', 'Imagem capturada', 'No inbox como acervo visual.') }
          }}
        />

        {/* Palpite de destino ANTES de capturar: o motor ja sabe ler o texto,
            entao ele adianta onde isso costuma morar. So palpite, sem acao. */}
        {palpiteDestino && (
          <div className={s.convoPalpite}>
            <Icon name="sugestao" size={12} />
            <span>
              costuma virar nota em <b>{palpiteDestino.folderName}</b>
              <span className={s.convoPalpiteQuad}> · {palpiteDestino.categoryLabel}</span>
            </span>
          </div>
        )}

        {/* Rodape da caixa: acoes a esquerda, enviar a direita */}
        <div className={s.convoFooter}>
          <button
            className={`${s.convoIconBtn} hoverZoom`}
            onClick={() => imgRef.current?.click()}
            disabled={isFull}
            title="Imagem do computador"
            aria-label="Inserir imagem do computador"
          >
            <Icon name="imagem" size={14} />
          </button>

          {/* A dica so aparece com a caixa em uso — nao polui o repouso. */}
          <span className={`${s.convoDica} ${capturaAtiva && text ? s.convoDicaVisivel : ''}`}>
            Enter envia · Shift+Enter quebra linha
          </span>

          <button
            className={`${s.convoSend} hoverZoom hoverGlow ${isFull ? s.convoSendFull : ''}`}
            onClick={capture}
            disabled={isFull || !text.trim()}
            title={isFull ? 'Inbox cheio — processe alguns cards primeiro' : 'Capturar (Enter)'}
          >
            {isFull ? 'Cheio' : <>Capturar<Icon name="enviar" size={13} /></>}
          </button>
        </div>

        <input
          ref={imgRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={async e => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) await capturarImagem(file)
          }}
        />

        {arrastandoArquivo && (
          <div className={s.convoSolte}>
            <Icon name="imagem" size={16} /> Solte a imagem aqui
          </div>
        )}
      </div>
    </div>
  )
}
