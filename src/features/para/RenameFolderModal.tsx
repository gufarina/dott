/* RenameFolderModal.tsx - trocar o NOME de uma pasta.
 *
 * Nasce como componente proprio (e nao inline em cada tela) porque os dois
 * lugares onde a pasta aparece pedem a mesma acao: o card na grade do PARA
 * (PARAGrid) e a tela de dentro da pasta (FolderNotesView). Usa o
 * vocabulario unico de modal do app (Modal.tsx, TASK-297) - nada de um
 * terceiro jeito de perguntar uma coisa curta.
 */

import { useState } from 'react'
import { useStore } from '../../store'
import { Icon } from '../../components/Icon'
import { showToast } from '../../components/Toast'
import { Modal, ModalField, ModalInput, ModalFooter, ModalButton } from '../../components/Modal'

export function RenameFolderModal({ categoryId, folderId, nomeAtual, onClose }: {
  categoryId: string
  folderId: string
  nomeAtual: string
  onClose: () => void
}) {
  const renameFolder = useStore(st => st.renameFolder)
  const [nome, setNome] = useState(nomeAtual)

  const salvar = () => {
    const novo = nome.trim()
    // Nome vazio ou identico: fecha em silencio, sem toast de "renomeada"
    // pra nada ter mudado.
    if (!novo || novo === nomeAtual) { onClose(); return }
    renameFolder(categoryId, folderId, novo)
    showToast('info', 'Pasta renomeada', `Agora é "${novo}".`)
    onClose()
  }

  return (
    <Modal title="Renomear pasta" onClose={onClose}>
      <ModalField label="Nome da pasta">
        <ModalInput
          value={nome}
          autoFocus
          onFocus={e => e.currentTarget.select()}
          onChange={e => setNome(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') salvar() }}
        />
      </ModalField>
      <ModalFooter>
        <ModalButton variant="ghost" onClick={onClose}>Cancelar</ModalButton>
        <ModalButton variant="primary" onClick={salvar}>
          <Icon name="lapis" size={13} /> Salvar nome
        </ModalButton>
      </ModalFooter>
    </Modal>
  )
}
