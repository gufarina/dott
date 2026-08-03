/* Icon.tsx — Pacote de icones PROPRIO do Dott.
 *
 * Gramatica (o que faz ser "do Dott" e nao de biblioteca):
 *   - grade 16x16, traco 1.5, pontas arredondadas, sempre currentColor;
 *   - construido com as MESMAS primitivas do PARA: circulo, quadrado, losango, linha;
 *   - todo icone carrega um PONTO cheio (o "dott") como assinatura.
 *
 * Nao importar biblioteca de icone aqui. Se faltar um simbolo, desenhe com as
 * primitivas acima para o conjunto continuar falando a mesma lingua.
 */

export type IconName =
  | 'nota' | 'pasta' | 'mais' | 'fechar' | 'voltar' | 'enviar'
  | 'tarefa' | 'grupo' | 'prazo' | 'imagem' | 'simbolo' | 'busca'
  | 'ajustes' | 'tema' | 'grafo' | 'lixo' | 'inbox' | 'tag'
  | 'sugestao' | 'lapis' | 'backup' | 'rever'
  | 'minimizar' | 'maximizar' | 'acervo' | 'leitura'

const P: Record<IconName, React.ReactElement> = {
  // Folha com o canto dobrado + o ponto
  nota: <><path d="M4 2.5h5L12 5.5V13a.5.5 0 0 1-.5.5h-7A.5.5 0 0 1 4 13z"/><path d="M9 2.5V5a.5.5 0 0 0 .5.5H12"/><circle cx="6.6" cy="10.4" r=".95" fill="currentColor" stroke="none"/></>,
  // Pasta com aba + ponto
  pasta: <><path d="M2 4.5a1 1 0 0 1 1-1h3.2l1.3 1.6H13a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z"/><circle cx="8" cy="9" r=".95" fill="currentColor" stroke="none"/></>,
  mais: <><path d="M8 3.5v9M3.5 8h9"/></>,
  fechar: <><path d="M4.2 4.2l7.6 7.6M11.8 4.2l-7.6 7.6"/></>,
  voltar: <><path d="M9.8 3.6L5.4 8l4.4 4.4"/></>,
  // Seta para dentro da caixa (capturar)
  enviar: <><path d="M2.6 8h7.6"/><path d="M7.6 5.2L10.4 8l-2.8 2.8"/><path d="M12 3.2v9.6"/></>,
  // Quadrado com o check
  tarefa: <><rect x="2.8" y="2.8" width="10.4" height="10.4" rx="2.4"/><path d="M5.4 8.2l1.9 1.9 3.4-3.6"/></>,
  // Tres linhas (grupo/lista) com o ponto na primeira
  grupo: <><circle cx="4" cy="4.6" r=".95" fill="currentColor" stroke="none"/><path d="M7 4.6h6M3.4 8.5h9.6M3.4 12.4h9.6"/></>,
  // Circulo com ponteiro (prazo)
  prazo: <><circle cx="8" cy="8.6" r="5.1"/><path d="M8 5.8v2.8l2 1.2"/><path d="M6 1.8h4"/></>,
  // Moldura com o sol pequeno e a montanha
  imagem: <><rect x="2.2" y="3.4" width="11.6" height="9.2" rx="1.6"/><circle cx="5.6" cy="6.6" r="1" fill="currentColor" stroke="none"/><path d="M2.8 11.2l3-2.8 2 1.9 2.6-2.6 2.8 2.8"/></>,
  // Losango + ponto: o "simbolo" (marca da nota)
  simbolo: <><path d="M8 2.2l5.8 5.8L8 13.8 2.2 8z"/><circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none"/></>,
  busca: <><circle cx="7.2" cy="7.2" r="4.4"/><path d="M10.6 10.6l2.7 2.7"/></>,
  // Engrenagem simplificada: circulo + 4 hastes (mantem a gramatica geometrica)
  ajustes: <><circle cx="8" cy="8" r="2.6"/><path d="M8 1.8v2M8 12.2v2M1.8 8h2M12.2 8h2M3.6 3.6l1.4 1.4M11 11l1.4 1.4M12.4 3.6L11 5M5 11l-1.4 1.4"/></>,
  // Lua/sol: circulo com a mordida
  tema: <><path d="M13 9.4A5.6 5.6 0 0 1 6.6 3a5.6 5.6 0 1 0 6.4 6.4z"/></>,
  // Nos ligados (constelacao)
  grafo: <><circle cx="4" cy="11.6" r="1.9"/><circle cx="12" cy="10.4" r="1.5"/><circle cx="8.6" cy="4.2" r="1.9"/><path d="M5.4 10.2l2.2-4M9.9 5.6l1.7 3.5"/></>,
  lixo: <><path d="M2.8 4.4h10.4"/><path d="M6.2 4.4V3.2a.8.8 0 0 1 .8-.8h2a.8.8 0 0 1 .8.8v1.2"/><path d="M4.2 4.4l.6 8a.9.9 0 0 0 .9.8h4.6a.9.9 0 0 0 .9-.8l.6-8"/></>,
  // Bandeja com a seta descendo
  inbox: <><path d="M2.2 9.2h3l1 1.8h3.6l1-1.8h3"/><path d="M2.2 9.2l2-6.2h7.6l2 6.2v3.2a.8.8 0 0 1-.8.8H3a.8.8 0 0 1-.8-.8z"/></>,
  // Etiqueta com o furo
  tag: <><path d="M2.6 7.4V3.4a.8.8 0 0 1 .8-.8h4l6.2 6.2a.9.9 0 0 1 0 1.3l-3.7 3.7a.9.9 0 0 1-1.3 0z"/><circle cx="5.6" cy="5.6" r="1.05" fill="currentColor" stroke="none"/></>,
  // Faisca: o motor sugerindo algo
  sugestao: <><path d="M8 1.8l1.35 3.85L13.2 7l-3.85 1.35L8 12.2 6.65 8.35 2.8 7l3.85-1.35z"/><circle cx="12.4" cy="12.2" r=".95" fill="currentColor" stroke="none"/></>,
  lapis: <><path d="M11.2 2.6l2.2 2.2-8 8-2.9.7.7-2.9z"/><path d="M9.7 4.1l2.2 2.2"/></>,
  // Copias empilhadas (backup)
  backup: <><path d="M8 1.8l6 3-6 3-6-3z"/><path d="M2 8l6 3 6-3"/><path d="M2 11.4l6 3 6-3"/></>,
  // Seta em volta (rever/repetir)
  rever: <><path d="M13.4 8a5.4 5.4 0 1 1-1.95-4.15"/><path d="M13.8 2.4v3.3h-3.3"/></>,
  // Controles de janela — no pacote tambem, pra nao sobrar SVG solto no codigo
  minimizar: <><path d="M3.2 8h9.6"/></>,
  maximizar: <><rect x="3.2" y="3.2" width="9.6" height="9.6" rx="1.4"/></>,
  // Livro aberto: modo leitura
  leitura: <><path d="M8 4.4C6.8 3.4 5.1 3 2.4 3v9.4c2.7 0 4.4.4 5.6 1.4 1.2-1 2.9-1.4 5.6-1.4V3c-2.7 0-4.4.4-5.6 1.4z"/><path d="M8 4.4v9.4"/></>,
  // Folha com linhas: o acervo de notas da pasta
  acervo: <><path d="M4 2.6h5l3 3V13a.6.6 0 0 1-.6.6H4a.6.6 0 0 1-.6-.6V3.2a.6.6 0 0 1 .6-.6z"/><path d="M5.8 8.4h4M5.8 10.6h2.8"/></>,
}

export function Icon({ name, size = 15, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {P[name]}
    </svg>
  )
}
