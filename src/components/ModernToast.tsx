import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

interface ModernToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
  language?: 'ar' | 'en';
}

export const ModernToast: React.FC<ModernToastProps> = ({
  message,
  type = 'info',
  duration = 4000,
  onClose,
  language = 'ar',
}) => {
  const [progress, setProgress] = useState<number>(100);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const isAr = language === 'ar';

  useEffect(() => {
    if (isHovered) return;

    const intervalTime = 50;
    const step = (intervalTime / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [duration, isHovered, onClose]);

  const styleConfig = {
    success: {
      card: 'bg-gradient-to-r from-slate-950/95 via-emerald-950/85 to-slate-950/95 border-emerald-400/50 shadow-emerald-500/20 text-emerald-100',
      badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
      progress: 'bg-emerald-400 shadow-sm shadow-emerald-400/50',
      glow: 'from-emerald-400/0 via-emerald-400/40 to-emerald-400/0',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
      tag: isAr ? 'نجاح' : 'Success',
    },
    info: {
      card: 'bg-gradient-to-r from-slate-950/95 via-sky-950/85 to-slate-950/95 border-sky-400/50 shadow-sky-500/20 text-sky-100',
      badge: 'bg-sky-500/20 text-sky-400 border-sky-500/40',
      progress: 'bg-sky-400 shadow-sm shadow-sky-400/50',
      glow: 'from-sky-400/0 via-sky-400/40 to-sky-400/0',
      icon: <Info className="w-4 h-4 text-sky-400 shrink-0" />,
      tag: isAr ? 'معلومة' : 'Info',
    },
    warning: {
      card: 'bg-gradient-to-r from-slate-950/95 via-amber-950/85 to-slate-950/95 border-amber-400/50 shadow-amber-500/20 text-amber-100',
      badge: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
      progress: 'bg-amber-400 shadow-sm shadow-amber-400/50',
      glow: 'from-amber-400/0 via-amber-400/40 to-amber-400/0',
      icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
      tag: isAr ? 'تنبيه' : 'Warning',
    },
    error: {
      card: 'bg-gradient-to-r from-slate-950/95 via-rose-950/85 to-slate-950/95 border-rose-400/50 shadow-rose-500/20 text-rose-100',
      badge: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
      progress: 'bg-rose-400 shadow-sm shadow-rose-400/50',
      glow: 'from-rose-400/0 via-rose-400/40 to-rose-400/0',
      icon: <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />,
      tag: isAr ? 'خطأ' : 'Error',
    },
  };

  const current = styleConfig[type];

  return (
    <div
      role="alert"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="fixed top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto max-w-lg w-[92vw] sm:w-auto animate-fadeIn select-none"
    >
      <div
        className={`relative overflow-hidden rounded-2xl border backdrop-blur-xl px-4 py-3 shadow-2xl flex items-center gap-3 transition-all duration-200 hover:scale-[1.01] ${current.card}`}
      >
        {/* Top ambient highlight line */}
        <div className={`absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r ${current.glow}`} />

        {/* Status Icon with Glowing Capsule Badge */}
        <div className={`flex items-center justify-center p-2 rounded-xl border ${current.badge} shadow-inner shrink-0`}>
          {current.icon}
        </div>

        {/* Message Content */}
        <div className="flex-1 min-w-0 pr-1 rtl:pr-0 rtl:pl-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] uppercase tracking-wider font-extrabold opacity-75">
              {current.tag}
            </span>
            <span className="inline-block w-1 h-1 rounded-full bg-white/40" />
            <span className="text-[10px] font-mono opacity-50">TreeForge</span>
          </div>
          <p className="text-xs sm:text-sm font-bold tracking-tight text-white leading-snug break-words">
            {message}
          </p>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition shrink-0 focus:outline-none"
          title={isAr ? 'إغلاق التنبيه' : 'Close notification'}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Progress Bar (countdown indicator) */}
        <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-black/30 overflow-hidden">
          <div
            className={`h-full transition-all duration-75 ease-linear ${current.progress}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
