/** localDate.ts — data local (sem hora), formato YYYY-MM-DD.
 *
 * O prazo de uma tarefa e uma DATA, nao um instante (ver TaskItem.deadline
 * em store.ts). NUNCA usar `Date.toISOString()` aqui: ela converte pra UTC
 * antes de fatiar, e perto da meia-noite isso joga a data pro dia errado
 * dependendo do fuso da maquina. Aqui sempre lemos os componentes locais
 * (getFullYear/getMonth/getDate), o mesmo jeito ja usado em backupService.ts. */

export function toLocalISODate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Prazo "hoje", no fuso local. */
export function hojeISO(): string {
  return toLocalISODate(new Date())
}

/** Prazo "amanha", no fuso local (vira mes/ano sozinho via Date). */
export function amanhaISO(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return toLocalISODate(d)
}
