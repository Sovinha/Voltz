import React from 'react';
import { Globe, ShoppingBag } from 'lucide-react';
import { OrdemOrigem } from '@/lib/supabase';

interface OriginBadgeProps {
  origem: OrdemOrigem;
  className?: string;
}

export const OriginBadge: React.FC<OriginBadgeProps> = ({ origem, className = '' }) => {
  if (origem === 'ifood') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/30 ${className}`}>
        <ShoppingBag className="w-3.5 h-3.5 text-red-400" />
        <span>iFood</span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 ${className}`}>
      <Globe className="w-3.5 h-3.5 text-emerald-400" />
      <span>Cardápio Web</span>
    </span>
  );
};
