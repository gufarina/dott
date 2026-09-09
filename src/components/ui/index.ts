/* Biblioteca canonica de componentes base do Dott (TASK-461).

   REGRA (ver .claude/rules/design-system.md, lei 3): `<button>`, `<input>`,
   `<textarea>` e `<select>` nativos so podem existir DENTRO desta pasta. Em
   qualquer outro lugar do app, importe daqui.

   Falta uma variante? evolua o componente daqui com uma prop tipada. Nunca
   copie o elemento nativo estilizado a mao na tela que voce esta editando. */

export { Button } from './Button'
export type { ButtonProps } from './Button'
export { Input, Textarea, Select } from './Field'
export type { InputProps, TextareaProps, SelectProps } from './Field'
