import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

type DialogSize = 'sm' | 'md' | 'lg' | 'xl';

const sizeClasses: Record<DialogSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl'
};

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: DialogSize;
}

export default function Dialog({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md'
}: DialogProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className={`relative bg-white rounded-xl shadow-2xl w-full ${sizeClasses[size]} mx-4 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
          <h2 className="text-lg font-bold text-stone-800">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
        {footer && (
          <div className="px-6 py-4 border-t border-stone-200 bg-stone-50 rounded-b-xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
