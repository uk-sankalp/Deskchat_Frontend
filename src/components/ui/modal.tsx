import React from "react"
import { X } from "lucide-react"

interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  title?: string
  description?: string
}

export function Modal({ open, onOpenChange, children, title, description }: ModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={() => onOpenChange(false)}
      />
      
      {/* Modal Content - Mobile: Bottom Sheet | Desktop: Center card */}
      <div className="z-50 w-full max-w-md p-6 bg-[var(--bg-primary)] border-t sm:border border-[var(--border-color)] rounded-t-[2.5rem] sm:rounded-2xl shadow-2xl animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">
        {/* Mobile handle indicator */}
        <div className="w-12 h-1.5 bg-[var(--border-color)] rounded-full mx-auto mb-6 sm:hidden" />
        
        <div className={`flex justify-between items-start ${title || description ? "mb-4" : "absolute right-6 top-6"}`}>
          {(title || description) && (
            <div>
              {title && <h2 className="text-2xl sm:text-xl font-bold sm:font-semibold text-[var(--text-primary)] tracking-tight">{title}</h2>}
              {description && (
                <p className="text-sm text-[var(--text-secondary)] mt-1.5">{description}</p>
              )}
            </div>
          )}
          <button 
            onClick={() => onOpenChange(false)}
            className="hidden sm:flex rounded-full p-1 hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="pb-4 sm:pb-0">
          {children}
        </div>
      </div>
    </div>
  )
}
