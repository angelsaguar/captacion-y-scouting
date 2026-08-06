import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from './button';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onClose: () => void;
  variant?: 'danger' | 'warning' | 'info';
  isSubmitting?: boolean;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onClose,
  variant = 'danger',
  isSubmitting = false,
}: ConfirmModalProps) {
  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl z-10"
            id="confirm-modal-box"
          >
            {/* Header / Close Button */}
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="absolute top-4 right-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              id="confirm-modal-close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Content layout */}
            <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
              {/* Icon Accent */}
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full mb-4 sm:mb-0 sm:mr-4 ${
                  variant === 'danger'
                    ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                    : variant === 'warning'
                    ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                    : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                }`}
              >
                <AlertTriangle className="h-6 w-6" />
              </div>

              <div className="mt-2 sm:mt-1 w-full">
                <h3 className="text-lg font-bold tracking-tight text-white italic">
                  {title}
                </h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  {message}
                </p>
              </div>
            </div>

            {/* Actions footer */}
            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
              <Button
                variant="ghost"
                onClick={onClose}
                disabled={isSubmitting}
                className="w-full sm:w-auto h-10 border border-slate-800 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white font-bold"
                id="confirm-modal-cancel"
              >
                {cancelText}
              </Button>
              <Button
                variant={variant === 'danger' ? 'destructive' : 'default'}
                onClick={onConfirm}
                disabled={isSubmitting}
                className={`w-full sm:w-auto h-10 font-bold rounded-xl shadow-lg ${
                  variant === 'danger'
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-950/20'
                    : variant === 'warning'
                    ? 'bg-yellow-600 hover:bg-yellow-700 text-slate-900 shadow-yellow-950/20'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-950/20'
                }`}
                id="confirm-modal-submit"
              >
                {isSubmitting ? 'Procesando...' : confirmText}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
