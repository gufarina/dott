import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useStore } from '../store'
import { flushNoteEditor } from '../features/editor/NoteEditor'
import { Icon } from './Icon'
import { DottMark } from './DottMark'
import { Button, Input } from './ui'
import { useSearch, SEARCH_ICONS, type SearchItem } from '../hooks/useSearch'
import { useScrollEdgeFade } from '../hooks/useScrollEdgeFade'
import s from './Titlebar.module.css'

/** Caminho UNICO de fechamento da janela principal - usado pelo botao desta
 *  barra E pelo onCloseRequested nativo (App.tsx, Alt+F4/barra de tarefas),
 *  pra nao duplicar a logica de flush (CORRIGIR item 3 desta rodada).
 *  `destroy()` (nao `close()`) fecha sem reemitir onCloseRequested - sem
 *  isso o proprio flush+close daria um loop com o listener de App.tsx.
 *  Item 1: aguarda flushNoteEditor() ANTES de fechar - o autosave (ate
 *  800ms) da nota aberta chega ao disco antes da janela sumir. */
export async function closeMainWindow() {
  await flushNoteEditor()
  await getCurrentWindow().destroy().catch(() => {})
}

/** Duracao do dropdown = --dur-base (doutrina de movimento da casa: alta
 *  frequencia, nunca o tratamento longo de gaveta). Espelha o token pra
 *  cronometrar o unmount depois do fade de saida (CSS nao dispara evento
 *  de "acabei" quando a saida e feita por classe, nao por transitionend
 *  de uma propriedade unica). */
const PANEL_EXIT_MS = 170

export function Titlebar({
  onSettings,
  searchInputRef,
}: {
  onSettings?: () => void
  searchInputRef?: RefObject<HTMLInputElement | null>
}) {
  const theme = useStore(st => st.theme)
  const toggleTheme = useStore(st => st.toggleTheme)
  const view = useStore(st => st.view)
  const setView = useStore(st => st.setView)

  const minimize = () => getCurrentWindow().minimize().catch(() => {})
  const maximize = () => getCurrentWindow().toggleMaximize().catch(() => {})
  const toggleGraph = () => setView(view === 'graph' ? 'board' : 'graph')

  // Busca DE VERDADE na titlebar (TASK-566): campo real, painel ancorado -
  // nunca mais o input falso (readOnly + role="button" abrindo modal).
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const [mounted, setMounted] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const localInputRef = useRef<HTMLInputElement>(null)
  const inputRef = searchInputRef ?? localInputRef
  const listRef = useRef<HTMLDivElement>(null)

  const { groups } = useSearch(query)
  const flat = useMemo(() => groups.flatMap(g => g.items), [groups])
  const shouldShow = focused && query.trim() !== ''

  useScrollEdgeFade(listRef, [query, flat.length])

  // Mostra/esconde com fade de saida (transform/opacity, --dur-base) sem
  // framer-motion: mantem o painel montado durante a saida e so desmonta
  // depois da duracao da transicao.
  useEffect(() => {
    if (shouldShow) { setMounted(true); return }
    if (!mounted) return
    const t = setTimeout(() => setMounted(false), PANEL_EXIT_MS)
    return () => clearTimeout(t)
  }, [shouldShow, mounted])

  useEffect(() => { setHighlighted(-1) }, [query])

  // Clicar fora fecha o painel (o campo em si so blura quando o foco vai
  // pra outro elemento focavel - clicar num `div` sem tabindex nao blura).
  useEffect(() => {
    if (!shouldShow) return
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setFocused(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [shouldShow])

  const closePanel = () => setFocused(false)

  const pick = (item: SearchItem) => {
    item.onPick()
    setQuery('')
    closePanel()
    inputRef.current?.blur()
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      if (!flat.length) return
      e.preventDefault()
      setHighlighted(i => Math.min(i + 1, flat.length - 1))
    } else if (e.key === 'ArrowUp') {
      if (!flat.length) return
      e.preventDefault()
      setHighlighted(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      if (highlighted >= 0 && flat[highlighted]) {
        e.preventDefault()
        pick(flat[highlighted])
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      if (query) { setQuery(''); return }
      closePanel()
      inputRef.current?.blur()
    }
  }

  const activeId = highlighted >= 0 ? `search-option-${highlighted}` : undefined
  let flatIndex = -1

  return (
    <div className={s.titlebar}>
      <div className={s.drag} data-tauri-drag-region>
        <DottMark size={15} className={s.mark} />
        <span className={s.logo}>Dott</span>
        <span className={s.version} title={`Dott v${__APP_VERSION__}`}>v{__APP_VERSION__}</span>
      </div>

      <div ref={wrapRef} className={s.search}>
        <Icon name="busca" size={14} />
        <Input
          ref={inputRef}
          variante="conjunto"
          className={s.searchInput}
          placeholder="Buscar notas, pastas, cards..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={shouldShow}
          aria-controls="search-listbox"
          aria-autocomplete="list"
          aria-activedescendant={activeId}
          aria-label="Buscar notas, pastas e cards"
          title="Buscar (Ctrl+K)"
        />
        <span className={s.kbd} aria-hidden="true">Ctrl+K</span>

        {mounted && (
          <div
            id="search-listbox"
            role="listbox"
            ref={listRef}
            className={`${s.panel} ${shouldShow ? s.panelEnter : s.panelExit} scrollFadeBottom`}
          >
            {!flat.length && <div className={s.empty}>Nada encontrado.</div>}
            {groups.map(g => (
              <div key={g.type}>
                <div className={s.groupLabel}>{g.label}</div>
                {g.items.map(item => {
                  flatIndex += 1
                  const idx = flatIndex
                  return (
                    <Button
                      as="span"
                      key={idx}
                      id={`search-option-${idx}`}
                      role="option"
                      aria-selected={idx === highlighted}
                      className={s.result}
                      onMouseDown={e => e.preventDefault()}
                      onMouseEnter={() => setHighlighted(idx)}
                      onClick={() => pick(item)}
                    >
                      <div className={s.icon}>{SEARCH_ICONS[item.type]}</div>
                      <div className={s.info}>
                        <div className={s.name}>{item.name}</div>
                        <div className={s.meta}>{item.meta}</div>
                      </div>
                      <span className={s.badge}>{item.badge}</span>
                    </Button>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={s.dragFill} data-tauri-drag-region />

      <div className={s.right}>
        <Button className={`${s.btn} ${view === 'graph' ? s.btnActive : ''}`} onClick={toggleGraph} aria-label="Constelação" title="Constelação (grafo de conexões)">
          <Icon name="grafo" size={14} />
        </Button>
        <Button className={s.btn} onClick={onSettings} aria-label="Configurações" title="Configurações">
          <Icon name="ajustes" size={14} />
        </Button>
        <Button className={s.btn} onClick={toggleTheme} aria-label="Trocar tema" title={theme === 'light' ? 'Mudar para tema escuro' : 'Mudar para tema claro'}>
          <Icon name="tema" size={14} />
        </Button>

        {/* Controles reais de janela (Windows), minimalistas */}
        <div className={s.winctl}>
          <Button className={s.wbtn} onClick={minimize} aria-label="Minimizar">
            <Icon name="minimizar" size={11} />
          </Button>
          <Button className={s.wbtn} onClick={maximize} aria-label="Maximizar">
            <Icon name="maximizar" size={11} />
          </Button>
          <Button className={`${s.wbtn} ${s.wclose}`} onClick={closeMainWindow} aria-label="Fechar">
            <Icon name="fechar" size={11} />
          </Button>
        </div>
      </div>
    </div>
  )
}
