'use client';

import React from 'react';
import { Settings, Eye, EyeOff, X, Check, RotateCcw, SlidersHorizontal } from 'lucide-react';

export interface ColumnSetting {
  id: string;
  name: string;
  columnGroup: 1 | 2; // Coluna 1 ou Coluna 2 no layout da Visão Geral
  visible: boolean;   // Exibir ou ocultar no Kanban
}

export const DEFAULT_COLUMN_SETTINGS: ColumnSetting[] = [
  { id: 'pendente', name: 'Pendente', columnGroup: 1, visible: true },
  { id: 'pagamento_pendente', name: 'Pagamento pendente', columnGroup: 1, visible: false },
  { id: 'aguardando_pagamento', name: 'Aguardando pagamento', columnGroup: 1, visible: false },
  { id: 'preparando', name: 'Em preparação', columnGroup: 1, visible: true },
  { id: 'pronto', name: 'Pronto', columnGroup: 2, visible: true },
  { id: 'esperando_retirada', name: 'Esperando retirada', columnGroup: 1, visible: false },
  { id: 'saiu_entrega', name: 'Saiu para entrega', columnGroup: 2, visible: true },
  { id: 'entregue', name: 'Entregue', columnGroup: 2, visible: false },
  { id: 'agendado', name: 'Agendado', columnGroup: 1, visible: false },
  { id: 'finalizado', name: 'Concluído', columnGroup: 2, visible: true },
  { id: 'cancelando', name: 'Cancelando', columnGroup: 2, visible: false },
  { id: 'cancelamento_solicitado', name: 'Cancelamento solicitado', columnGroup: 2, visible: false },
  { id: 'cancelado', name: 'Cancelado', columnGroup: 2, visible: false }
];

interface ColumnConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnSetting[];
  onUpdateColumns: (newColumns: ColumnSetting[]) => void;
}

export const ColumnConfigModal: React.FC<ColumnConfigModalProps> = ({
  isOpen,
  onClose,
  columns,
  onUpdateColumns
}) => {
  if (!isOpen) return null;

  const handleToggleVisibility = (id: string) => {
    onUpdateColumns(
      columns.map(col => col.id === id ? { ...col, visible: !col.visible } : col)
    );
  };

  const handleSetGroup = (id: string, group: 1 | 2) => {
    onUpdateColumns(
      columns.map(col => col.id === id ? { ...col, columnGroup: group } : col)
    );
  };

  const handleResetToDefault = () => {
    onUpdateColumns(DEFAULT_COLUMN_SETTINGS);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl overflow-hidden">
        
        {/* CABEÇALHO DO MODAL */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white tracking-tight">AJUSTAR COLUNAS & LAYOUT</h2>
              <p className="text-[11px] text-slate-400">Configure visualização e agrupamento por etapas</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* LISTA DE COLUNAS BASEADA EXATAMENTE NA IMAGEM 2 */}
        <div className="mt-3 space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
          {columns.map((col) => (
            <div 
              key={col.id} 
              className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                col.visible 
                  ? 'bg-slate-950/90 border-slate-800 text-slate-100' 
                  : 'bg-slate-950/40 border-slate-800/40 text-slate-500 opacity-60'
              }`}
            >
              <span className="text-xs font-semibold">{col.name}</span>

              <div className="flex items-center gap-1.5">
                {/* BOTÕES [1] E [2] CONFORME IMAGEM 2 */}
                <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800">
                  <button
                    onClick={() => handleSetGroup(col.id, 1)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all ${
                      col.columnGroup === 1 
                        ? 'bg-slate-700 text-amber-300 shadow' 
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    1
                  </button>
                  <button
                    onClick={() => handleSetGroup(col.id, 2)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all ${
                      col.columnGroup === 2 
                        ? 'bg-slate-700 text-amber-300 shadow' 
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    2
                  </button>
                </div>

                {/* BOTÃO OLHO (OCULTAR / EXIBIR) CONFORME IMAGEM 2 */}
                <button
                  onClick={() => handleToggleVisibility(col.id)}
                  className={`p-1.5 rounded-lg border transition-all ${
                    col.visible
                      ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                      : 'bg-slate-900 text-slate-600 border-slate-800 hover:text-slate-400'
                  }`}
                  title={col.visible ? 'Visível no Kanban' : 'Oculto no Kanban'}
                >
                  {col.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* RODAPÉ DO MODAL */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 mt-3">
          <button
            onClick={handleResetToDefault}
            className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-amber-300 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Padrão</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs shadow-md"
          >
            Salvar Layout
          </button>
        </div>

      </div>
    </div>
  );
};
