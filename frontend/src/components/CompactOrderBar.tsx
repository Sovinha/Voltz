'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, ShoppingBag, MessageSquare, MoreVertical, CheckCircle2, DollarSign, Globe, Edit, Bike, Eye, Trash2, MapPin } from 'lucide-react';
import { Pedido, OrdemStatus, Entregador } from '@/lib/supabase';
import { analyzeOrderItems } from '@/lib/beverageDetection';

interface CompactOrderBarProps {
  pedido: Pedido;
  onUpdateStatus: (id: string, newStatus: OrdemStatus) => Promise<void>;
  onOpenChat: (entregador: Entregador, pedidoIdExterno: string) => void;
  onColetar?: (pedidoId: string) => void;
  onEditPedido?: (pedido: Pedido) => void;
  onAlocar?: (pedido: Pedido) => void;
  onOpenDetails?: (pedido: Pedido) => void;
  onDeletePedido?: (pedidoId: string) => void;
  onSelectPedido?: (pedido: Pedido) => void;
}

export const CompactOrderBar: React.FC<CompactOrderBarProps> = ({
  pedido,
  onUpdateStatus,
  onOpenChat,
  onColetar,
  onEditPedido,
  onAlocar,
  onOpenDetails,
  onDeletePedido,
  onSelectPedido,
}) => {
  const [elapsedMinutes, setElapsedMinutes] = useState(13);
  const [coletado, setColetado] = useState(pedido.status === 'despachado' || pedido.status === 'em_rota');
  const [showOptionsDropdown, setShowOptionsDropdown] = useState(false);

  const itemAnalysis = analyzeOrderItems(pedido.itens);

  useEffect(() => {
    try {
      const created = new Date(pedido.created_at).getTime();
      const now = new Date().getTime();
      const diffMs = Math.max(0, now - created);
      setElapsedMinutes(Math.floor(diffMs / 60000) || 13);
    } catch {
      setElapsedMinutes(13);
    }
  }, [pedido.created_at]);

  const handleDarColeta = async () => {
    setColetado(true);
    if (onColetar) {
      onColetar(pedido.id);
    } else {
      await onUpdateStatus(pedido.id, 'em_rota');
    }
  };

  const isWeb = pedido.origem === 'web';
  const displayId = pedido.id_externo.replace(/[^0-9]/g, '').slice(-4) || '0106';
  const tipoPagamento = pedido.tipo_pagamento || (isWeb ? 'maquininha' : 'online');
  const ePagamentoEntrega = tipoPagamento === 'maquininha' || tipoPagamento === 'dinheiro';

  const mockMotoboy: Entregador = {
    id: pedido.entregador_id || '1',
    nome: pedido.entregador_nome || 'ENTREGADOR',
    status: 'em_rota',
    corridasConcluidas: 2,
  };

  return (
    <div 
      onClick={() => onSelectPedido && onSelectPedido(pedido)}
      className="w-full bg-slate-900 border border-slate-700/80 rounded-2xl px-3 py-2 flex items-center justify-between gap-3 shadow-lg hover:border-purple-500/60 transition-all text-slate-100 relative group"
    >
      {/* Esquerda: Ícone de Origem + ID Roxo + Circulo de Tempo + Nome do Cliente + Ícone Bebida */}
      <div className="flex items-center gap-2.5 min-w-0">
        {/* Ícone de Origem (iFood Vermelho Sorridente ou Cardápio Web Emerald) */}
        {isWeb ? (
          <div className="w-7 h-7 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-xs shrink-0 shadow" title="Pedido Web">
            🌐
          </div>
        ) : (
          <div className="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow" title="Pedido iFood">
            😁
          </div>
        )}

        {/* Badge Roxo do ID do Pedido */}
        <div className="bg-purple-600 text-white px-2.5 py-1 rounded-xl font-bold font-mono text-xs tracking-wider shrink-0 shadow-md">
          {displayId}
        </div>

        {/* Círculo Azul de Tempo Decorrido (min) */}
        <div className="w-6 h-6 rounded-full border-2 border-sky-400 text-sky-400 flex items-center justify-center font-mono font-bold text-[11px] shrink-0">
          {elapsedMinutes}
        </div>

        {/* Nome do Cliente e Badges de Bebida */}
        <span className="font-semibold text-sm text-slate-100 truncate flex items-center gap-1.5">
          <span>{pedido.nome_cliente}</span>
          {itemAnalysis.hasBeverage && <span title="Possui Bebida Gelada">🥤</span>}
          {itemAnalysis.hasDessert && <span title="Possui Sobremesa">🍰</span>}
        </span>
      </div>

      {/* Direita: Pagamento na Entrega + Botão Dar Coleta + Botão Chat + Mais Opções */}
      <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
        {/* Ícone de Forma de Pagamento */}
        <div
          className="flex items-center gap-1 text-slate-300"
          title={ePagamentoEntrega ? 'Pagamento na Entrega' : 'Pagamento Online Concluído'}
        >
          {tipoPagamento === 'maquininha' ? (
            <CreditCard className="w-4 h-4 text-sky-400" />
          ) : tipoPagamento === 'dinheiro' ? (
            <DollarSign className="w-4 h-4 text-emerald-400" />
          ) : (
            <Globe className="w-4 h-4 text-emerald-400" />
          )}
        </div>

        {/* Botão DAR COLETA (Retirada pelo Motoqueiro na Loja) */}
        <button
          onClick={handleDarColeta}
          disabled={coletado}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-extrabold text-xs transition-all shadow ${
            coletado
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 cursor-default'
              : 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/20'
          }`}
          title="Clique para dar Coleta quando o entregador pegar o pedido na loja"
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>{coletado ? 'Coletado' : 'Dar Coleta'}</span>
        </button>

        {/* Botão CHAT COM O ENTREGADOR */}
        <button
          onClick={() => onOpenChat(mockMotoboy, displayId)}
          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 transition-colors"
          title="Abrir Chat com o Entregador"
        >
          <MessageSquare className="w-4 h-4" />
        </button>

        {/* Menu 3 Pontos (Opções de Edição e Ações) */}
        <div className="relative">
          <button
            onClick={() => setShowOptionsDropdown(!showOptionsDropdown)}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Mais Opções / Editar Pedido"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {/* Dropdown de Opções */}
          {showOptionsDropdown && (
            <div 
              className="absolute right-0 top-9 z-[999] min-w-[200px] bg-slate-950 border border-slate-700 rounded-2xl shadow-2xl p-1.5 space-y-1 text-xs text-slate-200 animate-in fade-in duration-150"
              onClick={() => setShowOptionsDropdown(false)}
            >
              {onEditPedido && (
                <button
                  onClick={() => onEditPedido(pedido)}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 text-purple-300 font-extrabold flex items-center gap-2 transition"
                >
                  <Edit className="w-3.5 h-3.5 text-purple-400" />
                  <span>✏️ Editar Pedido</span>
                </button>
              )}

              {onAlocar && (
                <button
                  onClick={() => onAlocar(pedido)}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 text-sky-300 font-bold flex items-center gap-2 transition"
                >
                  <Bike className="w-3.5 h-3.5 text-sky-400" />
                  <span>🛵 Alocar Entregador</span>
                </button>
              )}

              {onOpenDetails && (
                <button
                  onClick={() => onOpenDetails(pedido)}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 text-slate-200 font-medium flex items-center gap-2 transition"
                >
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  <span>📄 Ver Comanda / Detalhes</span>
                </button>
              )}

              {onSelectPedido && (
                <button
                  onClick={() => onSelectPedido(pedido)}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 text-slate-300 font-medium flex items-center gap-2 transition"
                >
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>📍 Centralizar no Mapa</span>
                </button>
              )}

              {onDeletePedido && (
                <button
                  onClick={() => {
                    if (confirm(`Deseja cancelar/excluir o pedido #${pedido.id_externo}?`)) {
                      onDeletePedido(pedido.id);
                    }
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-red-500/20 text-red-400 font-bold flex items-center gap-2 transition border-t border-slate-800"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  <span>🗑️ Cancelar Pedido</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
