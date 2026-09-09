/* filerobotConfig.ts — tema (via token, resolvido em runtime) e traducao
 * pt-BR do Filerobot Image Editor (TASK-407, tema consertado na TASK-461).
 *
 * Tema: o Filerobot nao le CSS var (o tema e um objeto JS resolvido uma vez
 * quando o componente monta) - por isso ATE a TASK-461 os hex do tema
 * ESCURO ficavam cravados aqui, e quem abria o editor no tema CLARO levava
 * um painel escuro na cara. Conserto: `buildFilerobotTheme()` le os tokens
 * de verdade (tokens.css) via `getComputedStyle` NO MOMENTO em que o editor
 * abre - chamar de novo devolve o tema certo pro tema vigente. O mapeamento
 * chave->token e o mesmo que o objeto estatico anterior documentava:
 *   txt-primary/icons-primary-hover/btn-*-text -> --fg
 *   txt-secondary/icon-primary/icons-secondary-hover -> --fg2
 *   txt-secondary-invert -> --fg (mesma leitura clara sobre preenchimento)
 *   txt-placeholder/icons-secondary/btn-disabled-text -> --fg3
 *   bg-primary -> --surface2 · bg-primary-hover/active/bg-active/bg-hover -> --surface3
 *   bg-secondary/bg-stateless -> --surface
 *   accent-primary(-hover/-active)/accent-stateless -> --accent
 *   borders-primary/borders-strong -> --border2 · borders-secondary/borders-item -> --border
 *   error -> --danger · warning -> --warn · success -> --success
 *
 * Traducao: NUNCA usar `useBackendTranslations` (default `true` no pacote -
 * ver MEDIDO em node_modules/react-filerobot-image-editor/lib/context/
 * defaultConfig.js e lib/hooks/useLoadMainSource.js). Com ele ligado, o
 * editor faz XHR pra https://i18n.ultrafast.io e POST pra
 * https://neo.wordplex.io TODA VEZ que abre - quebra o invariante 100%
 * offline mesmo bloqueado pela CSP (connect-src nao inclui esses hosts).
 * ImageViewer.tsx passa `useBackendTranslations={false}` e usa este objeto
 * estatico local em vez disso - zero rede.
 */

function tok(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

/** Paleta minima: so as chaves que aparecem nas abas habilitadas
 *  (Ajustar/Recortar/Girar, Anotar/Desenhar/Texto/Formas, Filtros, Ajuste
 *  fino). O tipo `ThemeOverride` da lib e `Partial<...>` - nao precisa
 *  cobrir as ~130 chaves da paleta default.
 *
 *  Chamar NO PONTO onde o editor abre (nao guardar o resultado): o valor
 *  resolvido fica preso ao tema do instante da chamada. */
export function buildFilerobotTheme() {
  const fg = tok('--fg')
  const fg2 = tok('--fg2')
  const fg3 = tok('--fg3')
  const surface = tok('--surface')
  const surface2 = tok('--surface2')
  const surface3 = tok('--surface3')
  const accent = tok('--accent')
  const border = tok('--border')
  const border2 = tok('--border2')
  const danger = tok('--danger')
  const warn = tok('--warn')
  const success = tok('--success')

  return {
    palette: {
      'txt-primary': fg,
      'txt-secondary': fg2,
      'txt-secondary-invert': fg,
      'txt-placeholder': fg3,
      'bg-primary': surface2,
      'bg-primary-hover': surface3,
      'bg-primary-active': surface3,
      'bg-secondary': surface,
      'bg-stateless': surface,
      'bg-active': surface3,
      'bg-hover': surface3,
      'accent-primary': accent,
      'accent-primary-hover': accent,
      'accent-primary-active': accent,
      'accent-stateless': accent,
      'icon-primary': fg2,
      'icons-secondary': fg3,
      'icons-primary-hover': fg,
      'icons-secondary-hover': fg2,
      'borders-primary': border2,
      'borders-secondary': border,
      'borders-strong': border2,
      'borders-item': border,
      'btn-primary-text': fg,
      'btn-secondary-text': fg,
      'btn-disabled-text': fg3,
      error: danger,
      warning: warn,
      success,
    },
  }
}

/** Traducao completa das chaves de `defaultTranslations` (lib da versao
 *  5.0.1) pra pt-BR. Estatico - nunca busca do backend (ver header). */
export const FILEROBOT_PT_BR_TRANSLATIONS = {
  name: 'Nome',
  save: 'Salvar',
  saveAs: 'Salvar como',
  back: 'Voltar',
  loading: 'Carregando...',
  resetOperations: 'Repor/apagar todas as operações',
  changesLoseWarningHint: 'Se você clicar em "Repor" suas alterações serão perdidas. Deseja continuar?',
  discardChangesWarningHint: 'Se você fechar, a última alteração não será salva.',
  cancel: 'Cancelar',
  apply: 'Aplicar',
  warning: 'Aviso',
  confirm: 'Confirmar',
  discardChanges: 'Descartar alterações',
  undoTitle: 'Desfazer última operação',
  redoTitle: 'Refazer última operação',
  showImageTitle: 'Mostrar imagem original',
  zoomInTitle: 'Aproximar',
  zoomOutTitle: 'Afastar',
  toggleZoomMenuTitle: 'Alternar menu de zoom',
  adjustTab: 'Ajustar',
  finetuneTab: 'Ajuste fino',
  filtersTab: 'Filtros',
  watermarkTab: "Marca d'água",
  annotateTabLabel: 'Desenhar',
  resize: 'Redimensionar',
  resizeTab: 'Redimensionar',
  imageName: 'Nome da imagem',
  invalidImageError: 'Imagem inválida.',
  uploadImageError: 'Erro ao enviar a imagem.',
  areNotImages: 'não são imagens',
  isNotImage: 'não é imagem',
  toBeUploaded: 'para enviar',
  cropTool: 'Recortar',
  original: 'Original',
  custom: 'Personalizado',
  square: 'Quadrado',
  landscape: 'Paisagem',
  portrait: 'Retrato',
  ellipse: 'Elipse',
  classicTv: 'TV clássica',
  cinemascope: 'Cinemascópio',
  arrowTool: 'Seta',
  blurTool: 'Desfoque',
  brightnessTool: 'Brilho',
  contrastTool: 'Contraste',
  ellipseTool: 'Elipse',
  unFlipX: 'Desfazer espelhar X',
  flipX: 'Espelhar X',
  unFlipY: 'Desfazer espelhar Y',
  flipY: 'Espelhar Y',
  hsvTool: 'HSV',
  hue: 'Matiz',
  brightness: 'Brilho',
  saturation: 'Saturação',
  value: 'Valor',
  imageTool: 'Imagem',
  importing: 'Importando...',
  addImage: '+ Adicionar imagem',
  uploadImage: 'Enviar imagem',
  fromGallery: 'Da galeria',
  lineTool: 'Linha',
  penTool: 'Caneta',
  polygonTool: 'Polígono',
  sides: 'Lados',
  rectangleTool: 'Retângulo',
  cornerRadius: 'Raio do canto',
  resizeWidthTitle: 'Largura em pixels',
  resizeHeightTitle: 'Altura em pixels',
  toggleRatioLockTitle: 'Alternar trava de proporção',
  resetSize: 'Repor tamanho original',
  rotateTool: 'Girar',
  textTool: 'Texto',
  textSpacings: 'Espaçamento de texto',
  textAlignment: 'Alinhamento de texto',
  fontFamily: 'Fonte',
  size: 'Tamanho',
  letterSpacing: 'Espaçamento entre letras',
  lineHeight: 'Altura da linha',
  warmthTool: 'Temperatura',
  addWatermark: "+ Adicionar marca d'água",
  addTextWatermark: "+ Adicionar marca d'água de texto",
  addWatermarkTitle: "Escolha o tipo de marca d'água",
  uploadWatermark: "Enviar marca d'água",
  addWatermarkAsText: 'Adicionar como texto',
  padding: 'Espaçamento',
  paddings: 'Espaçamentos',
  shadow: 'Sombra',
  horizontal: 'Horizontal',
  vertical: 'Vertical',
  blur: 'Desfoque',
  opacity: 'Opacidade',
  transparency: 'Transparência',
  position: 'Posição',
  stroke: 'Contorno',
  saveAsModalTitle: 'Salvar como',
  extension: 'Extensão',
  format: 'Formato',
  nameIsRequired: 'Nome é obrigatório.',
  quality: 'Qualidade',
  imageDimensionsHoverTitle: 'Tamanho salvo (largura x altura)',
  cropSizeLowerThanResizedWarning: 'A área de recorte selecionada é menor que o redimensionamento aplicado, o que pode reduzir a qualidade.',
  actualSize: 'Tamanho real (100%)',
  fitSize: 'Ajustar tamanho',
  addImageTitle: 'Selecione a imagem para adicionar...',
  mutualizedFailedToLoadImg: 'Falha ao carregar a imagem.',
  tabsMenu: 'Menu',
  download: 'Baixar',
  width: 'Largura',
  height: 'Altura',
  plus: '+',
  cropItemNoEffect: 'Sem pré-visualização disponível para este recorte',
  px: 'px',
}
