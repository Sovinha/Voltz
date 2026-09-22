'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, ShoppingBag, MessageSquare, MoreVertical, CheckCircle2, DollarSign, Globe, Edit, Bike, Eye, Trash2, MapPin, Check, Rocket } from 'lucide-react';
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

  // Renderiza o botão dinâmico da esteira de status: Preparo -> Pronto -> Alocar Motoboy -> Em Rota
  const renderPipelineActionButton = () => {
    const status = pedido.status;

    if (status === 'preparo' || status === 'pendente' || status === 'preparando') {
      return (
        <button
          onClick={async (e) => {
            e.stopPropagation();
            await onUpdateStatus(pedido.id, 'pronto');
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all shadow-md bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20 active:scale-95 shrink-0"
          title="Clique para marcar como PRONTO p/ entrega"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Marcar Pronto</span>
        </button>
      );
    }

    if (status === 'pronto') {
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onAlocar) {
              onAlocar(pedido);
            } else {
              onUpdateStatus(pedido.id, 'alocado');
            }
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all shadow-md bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/20 active:scale-95 shrink-0 animate-pulse"
          title="Clique para ALOCAR MOTOBOY a este pedido"
        >
          <Bike className="w-3.5 h-3.5" />
          <span>Alocar Motoboy</span>
        </button>
      );
    }

    if (status === 'alocado' || status === 'despachado') {
      return (
        <button
          onClick={async (e) => {
            e.stopPropagation();
            await onUpdateStatus(pedido.id, 'em_rota');
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all shadow-md bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/20 active:scale-95 shrink-0"
          title="Clique para DESPACHAR em rota com o motoboy"
        >
          <Rocket className="w-3.5 h-3.5" />
          <span>Despachar</span>
        </button>
      );
    }

    if (status === 'em_rota') {
      return (
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl font-bold text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
          <Bike className="w-3.5 h-3.5 text-amber-400" />
          <span>Em Rota</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl font-bold text-xs bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
        <Check className="w-3.5 h-3.5 text-emerald-400" />
        <span>Concluído</span>
      </div>
    );
  };

  return (
    <div 
      onClick={() => onSelectPedido && onSelectPedido(pedido)}
      className="w-full bg-slate-900 border border-slate-700/80 rounded-2xl px-3 py-2 flex items-center justify-between gap-3 shadow-lg hover:border-purple-500/60 transition-all text-slate-100 relative group cursor-pointer"
    >
      {/* Esquerda: Ícone de Origem + ID Roxo + Circulo de Tempo + Nome do Cliente + Ícone Bebida */}
      <div className="flex items-center gap-2 min-w-0">
        {/* Ícone de Origem (iFood Vermelho Sorridente ou Cardápio Web Emerald) */}
        {isWeb ? (
          <div className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-xs shrink-0 shadow" title="Pedido Web">
            🌐
          </div>
        ) : (
          <div className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow" title="Pedido iFood">
            😁
          </div>
        )}

        {/* Badge Roxo do ID do Pedido */}
        <div className="bg-purple-600 text-white px-2 py-0.5 rounded-lg font-bold font-mono text-xs tracking-wider shrink-0 shadow">
          {displayId}
        </div>

        {/* Círculo Azul de Tempo Decorrido (min) */}
        <div className="w-5 h-5 rounded-full border-2 border-sky-400 text-sky-400 flex items-center justify-center font-mono font-bold text-[10px] shrink-0">
          {elapsedMinutes}
        </div>

        {/* Nome do Cliente e Badges de Bebida */}
        <span className="font-semibold text-xs text-slate-100 truncate flex items-center gap-1">
          <span className="truncate">{pedido.nome_cliente}</span>
          {itemAnalysis.hasBeverage && <span title="Possui Bebida Gelada">🥤</span>}
          {itemAnalysis.hasDessert && <span title="Possui Sobremesa">🍰</span>}
        </span>
      </div>

      {/* Direita: Pagamento + Botão da Esteira (Pronto -> Alocar) + Botão Chat + Mais Opções */}
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

        {/* BOTÃO DA ESTEIRA DE STATUS: (🟢 Marcar Pronto -> 🛵 Alocar Motoboy -> 🚀 Despachar) */}
        {renderPipelineActionButton()}

        {/* Botão CHAT COM O ENTREGADOR */}
        <button
          onClick={() => onOpenChat(mockMotoboy, displayId)}
          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 transition-colors"
          title="Abrir Chat com o Entregador"
        >
          <MessageSquare className="w-3.5 h-3.5" />
        </button>

        {/* Menu 3 Pontos (Opções de Edição e Ações) */}
        <div className="relative">
          <button
            onClick={() => setShowOptionsDropdown(!showOptionsDropdown)}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Mais Opções / Editar Pedido"
          >
            <MoreVertical className="w-3.5 h-3.5" />
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
