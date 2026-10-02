'use client';

import React from 'react';
import { Keyboard, X, Zap, Search, PlusCircle, Sparkles, Layers, ArrowLeftRight } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'N', desc: 'Abrir Modal de Novo Pedido', icon: PlusCircle, color: 'text-cyan-400' },
    { key: 'R', desc: 'Disparar Roteirização com IA DeepSeek', icon: Sparkles, color: 'text-amber-400' },
    { key: 'F / /', desc: 'Focar na Barra de Pesquisa Global', icon: Search, color: 'text-teal-400' },
    { key: '1, 2, 3, 4', desc: 'Alternar entre Visão Geral, Kanban, Mapa e Frota', icon: Layers, color: 'text-slate-300' },
    { key: 'J', desc: 'Ativar / Desativar Modo Fluxo Jantar', icon: Zap, color: 'text-amber-400' },
    { key: 'ESC', desc: 'Fechar Modais Abertos', icon: X, color: 'text-rose-400' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-slate-900 border border-cyan-500/40 rounded-3xl p-6 shadow-2xl overflow-hidden">
        
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight">ATALHOS DE TECLADO RÁPIDOS</h2>
              <p className="text-xs text-slate-400">Navegação e controle em alta velocidade</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-2.5">
          {shortcuts.map((sc, idx) => {
            const Icon = sc.icon;
            return (
              <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${sc.color}`} />
                  <span className="text-xs font-semibold text-slate-200">{sc.desc}</span>
                </div>
                <kbd className="bg-slate-800 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-lg text-xs font-mono font-bold shadow-inner">
                  {sc.key}
                </kbd>
              </div>
            );
          })}
        </div>

        <div className="mt-5 text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition-all shadow-md"
          >
            Entendido (Pressione ESC para fechar)
          </button>
        </div>

      </div>
    </div>
  );
};
