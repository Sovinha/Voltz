'use client';

import React from 'react';
import { X, ShoppingBag, MapPin, DollarSign, Clock, User, Phone, CheckCircle, ArrowLeft } from 'lucide-react';
import { Pedido } from '@/lib/supabase';
import { OriginBadge } from './OriginBadge';

interface PedidoDetalhesModalProps {
  pedido: Pedido | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus?: (pedidoId: string, newStatus: any) => void;
  onOpenAlocar?: (pedido: Pedido) => void;
  onDeletePedido?: (pedidoId: string) => Promise<void>;
}

export const PedidoDetalhesModal: React.FC<PedidoDetalhesModalProps> = ({
  pedido,
  isOpen,
  onClose,
  onUpdateStatus,
  onOpenAlocar,
  onDeletePedido,
}) => {
  if (!isOpen || !pedido) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <OriginBadge origem={pedido.origem} />
            <h3 className="font-bold text-slate-100 text-base font-mono">
              Pedido {pedido.id_externo}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs text-slate-300">
          {/* Cliente e Endereço */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="font-bold text-slate-100 text-sm flex items-center gap-1.5">
                <User className="w-4 h-4 text-sky-400" />
                {pedido.nome_cliente}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px] uppercase font-bold">
                Status: {pedido.status}
              </span>
            </div>

            <p className="flex items-start gap-1.5 text-slate-400">
              <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <span>{pedido.endereco_entrega}</span>
            </p>
          </div>

          {/* Itens do Pedido */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[10px]">Itens Solicitados:</h4>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5 font-mono">
              {pedido.itens.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-slate-300">
                  <span>{item.quantidade}x {item.nome}</span>
                  <strong className="text-slate-100">R$ {(item.preco_unitario * item.quantidade).toFixed(2)}</strong>
                </div>
              ))}
              <div className="border-t border-slate-800 pt-2 mt-2 flex justify-between items-center text-sm font-bold">
                <span className="text-slate-400">Valor Total:</span>
                <span className="text-emerald-400">R$ {pedido.valor_total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Entregador Vinculado */}
          {pedido.entregador_nome && (
            <div className="p-3 bg-purple-950/30 border border-purple-500/30 rounded-xl flex items-center justify-between">
              <span className="text-purple-300 font-bold flex items-center gap-1.5">
                🛵 Motoboy Alocado:
              </span>
              <strong className="text-slate-100 font-mono">{pedido.entregador_nome}</strong>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="pt-2 grid grid-cols-3 gap-2 border-t border-slate-800">
            {pedido.status === 'pronto' ? (
              <button
                onClick={() => {
                  if (onUpdateStatus) onUpdateStatus(pedido.id, 'preparo');
                  onClose();
                }}
                className="py-2 px-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 font-bold flex items-center justify-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  if (onUpdateStatus) onUpdateStatus(pedido.id, 'pronto');
                  onClose();
                }}
                className="py-2 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-1"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Pronto</span>
              </button>
            )}

            <button
              onClick={() => {
                onClose();
                if (onOpenAlocar) onOpenAlocar(pedido);
              }}
              className="py-2 px-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center justify-center gap-1"
            >
              <span>🛵 Alocar</span>
            </button>

            {onDeletePedido && (
              <button
                onClick={async () => {
                  if (window.confirm(`Deseja realmente excluir o pedido ${pedido.id_externo} de ${pedido.nome_cliente}?`)) {
                    onClose();
                    await onDeletePedido(pedido.id);
                  }
                }}
                className="py-2 px-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/40 font-bold flex items-center justify-center gap-1"
              >
                <span>🗑️ Excluir</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
