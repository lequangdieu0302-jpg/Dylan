import { useEffect, useState } from "react"
import { ToastProvider, ToastViewport, Toast, ToastTitle, ToastDescription, ToastClose } from "./toast"
import { CheckCircle, XCircle, Info, AlertTriangle } from "lucide-react"

type ToastItem = {
  id: string
  type: "success" | "error" | "info" | "warning"
  title: string
  description?: string
}

// Simple global toast store
const listeners: Array<(toasts: ToastItem[]) => void> = []
let toasts: ToastItem[] = []

function notify(item: Omit<ToastItem, "id">) {
  const id = Math.random().toString(36).slice(2)
  toasts = [{ ...item, id }, ...toasts].slice(0, 5)
  listeners.forEach((l) => l([...toasts]))
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id)
    listeners.forEach((l) => l([...toasts]))
  }, 4000)
}

// eslint-disable-next-line react-refresh/only-export-components
export const toast = {
  success: (title: string, description?: string) => notify({ type: "success", title, description }),
  error: (title: string, description?: string) => notify({ type: "error", title, description }),
  info: (title: string, description?: string) => notify({ type: "info", title, description }),
  warning: (title: string, description?: string) => notify({ type: "warning", title, description }),
}

const icons = {
  success: <CheckCircle className="h-5 w-5 text-green-400" />,
  error: <XCircle className="h-5 w-5 text-red-400" />,
  info: <Info className="h-5 w-5 text-blue-400" />,
  warning: <AlertTriangle className="h-5 w-5 text-yellow-400" />,
}

const variantMap = {
  success: "success" as const,
  error: "destructive" as const,
  info: "default" as const,
  warning: "default" as const,
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => {
    listeners.push(setItems)
    return () => {
      const idx = listeners.indexOf(setItems)
      if (idx > -1) listeners.splice(idx, 1)
    }
  }, [])

  return (
    <ToastProvider>
      {items.map((item) => (
        <Toast key={item.id} variant={variantMap[item.type]}>
          <div className="flex items-start gap-3">
            {icons[item.type]}
            <div className="flex-1">
              <ToastTitle>{item.title}</ToastTitle>
              {item.description && <ToastDescription>{item.description}</ToastDescription>}
            </div>
          </div>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  )
}
