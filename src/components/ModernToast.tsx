import React, { useEffect, useState, useCallback } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  X,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface ModernToastProps {
  message: string;
  title?: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
  language?: 'ar' | 'en';
}

export const ModernToast: React.FC<ModernToastProps> = ({
  message,
  title,
  type = 'info',
  duration = 3800,
  onClose,
  language = 'ar',
}) => {
  const [progress, setProgress] = useState<number>(100);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const isAr = language === 'ar';

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Handle keyboard ESC to dismiss
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleClose]);

  // Timer countdown with pause on hover
  useEffect(() => {
    if (isHovered) return;

    const intervalTime = 40;
    const step = (intervalTime / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          handleClose();
          return 0;
        }
        return prev - step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [duration, isHovered, handleClose]);

  const styleConfig = {
    success: {
      themeName: isAr ? 'نجاح العملية' : 'Success',
      ambientGlow: 'rgba(16, 185, 129, 0.22)',
      cardBorder: 'border-emerald-500/40 shadow-emerald-950/40',
      headerGlow: 'from-emerald-400 via-teal-300 to-emerald-500',
      iconBox: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-emerald-500/10',
      titleColor: 'text-emerald-300',
      progressBar: 'from-emerald-400 to-teal-300',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
      dotColor: 'bg-emerald-400',
    },
    info: {
      themeName: isAr ? 'معلومة النظام' : 'Information',
      ambientGlow: 'rgba(6, 182, 212, 0.22)',
      cardBorder: 'border-cyan-500/40 shadow-cyan-950/40',
      headerGlow: 'from-cyan-400 via-sky-300 to-blue-500',
      iconBox: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30 shadow-cyan-500/10',
      titleColor: 'text-cyan-300',
      progressBar: 'from-cyan-400 to-sky-300',
      icon: <Info className="w-5 h-5 text-cyan-400 shrink-0" />,
      dotColor: 'bg-cyan-400',
    },
    warning: {
      themeName: isAr ? 'تنبيه هام' : 'Notice',
      ambientGlow: 'rgba(245, 158, 11, 0.22)',
      cardBorder: 'border-amber-500/40 shadow-amber-950/40',
      headerGlow: 'from-amber-400 via-yellow-300 to-amber-500',
      iconBox: 'bg-amber-500/15 text-amber-400 border-amber-500/30 shadow-amber-500/10',
      titleColor: 'text-amber-300',
      progressBar: 'from-amber-400 to-yellow-300',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
      dotColor: 'bg-amber-400',
    },
    error: {
      themeName: isAr ? 'تنبيه خطأ' : 'Error',
      ambientGlow: 'rgba(244, 63, 94, 0.22)',
      cardBorder: 'border-rose-500/40 shadow-rose-950/40',
      headerGlow: 'from-rose-500 via-pink-400 to-rose-600',
      iconBox: 'bg-rose-500/15 text-rose-400 border-rose-500/30 shadow-rose-500/10',
      titleColor: 'text-rose-300',
      progressBar: 'from-rose-500 to-pink-400',
      icon: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
      dotColor: 'bg-rose-400',
    },
  };

  const current = styleConfig[type];
  const displayTitle = title || current.themeName;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center p-4 sm:p-6"
        aria-live="polite"
      >
        {/* Subtle backdrop overlay for central focus */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleClose}
          className="absolute inset-0 bg-slate-950/30 backdrop-blur-[2px] pointer-events-auto"
        />

        {/* Central Toast Card */}
        <motion.div
          role="alert"
          initial={{ opacity: 0, scale: 0.88, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -10 }}
          transition={{ 
            type: 'spring', 
            stiffness: 420, 
            damping: 28 
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="relative pointer-events-auto max-w-md w-full sm:w-[440px] select-none"
        >
          {/* Ambient Glow Aura */}
          <div 
            className="absolute -inset-1.5 rounded-3xl blur-xl opacity-75 pointer-events-none transition-opacity duration-300"
            style={{ backgroundColor: current.ambientGlow }}
          />

          <div
            className={`relative overflow-hidden rounded-2xl border bg-slate-950/92 dark:bg-slate-950/95 backdrop-blur-2xl shadow-2xl transition-all duration-200 ${current.cardBorder}`}
          >
            {/* Top Luminous Highlight Bar */}
            <div className={`h-[2px] w-full bg-gradient-to-r ${current.headerGlow}`} />

            <div className="p-4 sm:p-5 flex items-start gap-3.5">
              {/* Type-Specific Glowing Icon Container */}
              <div 
                className={`flex items-center justify-center p-2.5 rounded-xl border shrink-0 transition-transform duration-200 ${current.iconBox}`}
              >
                {current.icon}
              </div>

              {/* Text & Header Section */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${current.titleColor}`}>
                    {displayTitle}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">·</span>
                  <span className="text-[10px] text-slate-400 font-mono">TreeForge</span>
                </div>

                <p className="text-xs sm:text-sm font-medium text-slate-100 leading-relaxed break-words">
                  {message}
                </p>
              </div>

              {/* Close Button */}
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors shrink-0 focus:outline-none focus:ring-1 focus:ring-slate-700"
                title={isAr ? 'إغلاق (Esc)' : 'Dismiss (Esc)'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Footer Status Bar with Progress Countdown */}
            <div className="px-4 sm:px-5 pb-3 pt-0 flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${current.dotColor} opacity-80`} />
                <span>{isHovered ? (isAr ? 'موقوف مؤقتاً' : 'Paused on hover') : (isAr ? 'اضغط Esc للإغلاق' : 'Press Esc to dismiss')}</span>
              </span>
              <span className="opacity-60 tabular-nums">
                {Math.ceil((duration * (progress / 100)) / 1000)}s
              </span>
            </div>

            {/* Bottom Progress Countdown Bar */}
            <div className="h-[2.5px] w-full bg-slate-900 overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r transition-all duration-75 ease-linear ${current.progressBar}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
