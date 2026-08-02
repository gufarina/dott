import { useEffect, useState } from 'react'
import { Icon } from './Icon'
import s from './Toast.module.css'

/** Contador monotonico: dois avisos no mesmo milissegundo tinham o MESMO id, o
 *  React reclamava de chave repetida e o timer de um matava o outro na tela. */
let seq = 0

interface ToastItem {
  id: string
  type: 'info' | 'warn'
  title: string
  msg: string
}

let addToast: (item: Omit<ToastItem, 'id'>) => void = () => {}

export function showToast(type: 'info' | 'warn', title: string, msg: string) {
  addToast({ type, title, msg })
}

export function ToastArea() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    addToast = (item) => {
      const id = 't' + (++seq)
      setToasts(ts => [...ts, { ...item, id }])
      setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 4000)
    }
  }, [])

  return (
    <div className={s.area}>
      {toasts.map(t => (
        <div key={t.id} className={s.toast}>
          <div className={`${s.icon} ${t.type === 'warn' ? s.warn : s.info}`}>
            {t.type === 'warn' ? '!' : '·'}
          </div>
          <div className={s.body}>
            <div className={s.title}>{t.title}</div>
            <div className={s.msg}>{t.msg}</div>
          </div>
          <button className={s.close} title="Fechar aviso" onClick={() => setToasts(ts => ts.filter(x => x.id !== t.id))}>
            <Icon name="fechar" size={12} />
          </button>
        </div>
      ))}
    </div>
  )
}
