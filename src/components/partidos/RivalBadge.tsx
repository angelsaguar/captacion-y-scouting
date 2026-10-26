import React, { useState, useEffect } from 'react';
import { Shield, Upload, Sparkles } from 'lucide-react';
import { getRivalCrestSync, getRivalCrest, getRivalInitials, normalizeRivalKey } from '@/lib/rivalCrests';

interface RivalBadgeProps {
  rivalName: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'custom';
  showUploadOverlay?: boolean;
  onUploadClick?: () => void;
  title?: string;
  imgClassName?: string;
}

export default function RivalBadge({
  rivalName,
  className = '',
  size = 'md',
  showUploadOverlay = false,
  onUploadClick,
  title,
  imgClassName = ''
}: RivalBadgeProps) {
  const [crestUrl, setCrestUrl] = useState<string | null>(() => getRivalCrestSync(rivalName));

  useEffect(() => {
    let isMounted = true;
    const syncVal = getRivalCrestSync(rivalName);
    setCrestUrl(syncVal);

    getRivalCrest(rivalName).then((url) => {
      if (isMounted && url) {
        setCrestUrl(url);
      }
    });

    const handleUpdate = (e: any) => {
      const detail = e?.detail;
      const myKey = normalizeRivalKey(rivalName);
      if (!detail?.key || detail.key === myKey || myKey.includes(detail.key) || detail.key.includes(myKey)) {
        if (detail.escudoUrl) {
          setCrestUrl(detail.escudoUrl);
        } else {
          setCrestUrl(getRivalCrestSync(rivalName));
        }
      }
    };

    window.addEventListener('ud_lapoveda_rival_crests_updated', handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('ud_lapoveda_rival_crests_updated', handleUpdate);
    };
  }, [rivalName]);

  const sizeClasses = {
    xs: 'w-5 h-5 text-[8px]',
    sm: 'w-7 h-7 text-[9px]',
    md: 'w-10 h-10 text-xs',
    lg: 'w-14 h-14 text-sm',
    xl: 'w-20 h-20 text-base',
    custom: ''
  }[size];

  const initials = getRivalInitials(rivalName);

  return (
    <div
      className={`relative group shrink-0 rounded-2xl flex items-center justify-center select-none ${sizeClasses} ${className} ${
        onUploadClick ? 'cursor-pointer hover:ring-2 hover:ring-blue-400/60 transition-all' : ''
      }`}
      onClick={onUploadClick}
      title={title || `Escudo de ${rivalName || 'Equipo Rival'}`}
    >
      {crestUrl ? (
        <div className="w-full h-full p-0.5 rounded-2xl flex items-center justify-center overflow-hidden bg-white/95 shadow-md border border-slate-700/50">
          <img
            src={crestUrl}
            alt={`Escudo ${rivalName}`}
            className={`w-full h-full object-contain drop-shadow-xs transition-transform duration-200 group-hover:scale-105 ${imgClassName}`}
            loading="lazy"
          />
        </div>
      ) : (
        <div className="w-full h-full rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 border-2 border-slate-700/80 p-1 flex flex-col items-center justify-center shadow-md relative overflow-hidden group-hover:border-blue-500/80 transition-colors">
          <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors" />
          <Shield className="w-1/2 h-1/2 text-slate-400 group-hover:text-blue-400 transition-colors mb-0.5" />
          <span className="font-black text-slate-200 tracking-wider font-mono uppercase leading-none drop-shadow-xs scale-90">
            {initials}
          </span>
        </div>
      )}

      {/* Upload button hover overlay if enabled */}
      {(showUploadOverlay || onUploadClick) && (
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex flex-col items-center justify-center text-white backdrop-blur-[1px] z-10 p-0.5">
          <Upload className="w-3.5 h-3.5 text-cyan-300 animate-bounce" />
          <span className="text-[7.5px] font-black uppercase tracking-tight text-cyan-200 leading-none mt-0.5">
            {crestUrl ? 'Cambiar' : 'Subir'}
          </span>
        </div>
      )}
    </div>
  );
}
