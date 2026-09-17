'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, ShoppingBag, MessageSquare, MoreVertical, CheckCircle2, DollarSign, Globe, UserCheck, ShieldAlert } from 'lucide-react';
import { Pedido, OrdemStatus, Entregador } from '@/lib/supabase';

interface CompactOrderBarProps {
  pedido: Pedido;
  onUpdateStatus: (id: string, newStatus: OrdemStatus) => Promise<void>;
  onOpenChat: (entregador: Entregador, pedidoIdExterno: string) => void;
  onColetar?: (pedidoId: string) => void;
}

export const CompactOrderBar: React.FC<CompactOrderBarProps> = ({
  pedido,
  onUpdateStatus,
  onOpenChat,
  onColetar,
}) => {
  const [elapsedMinutes, setElapsedMinutes] = useState(13);
  const [coletado, setColetado] = useState(pedido.status === 'despachado');

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
      await onUpdateStatus(pedido.id, 'despachado');
    }
  };

  const isWeb = pedido.origem === 'web';
  const displayId = pedido.id_externo.replace(/[^0-9]/g, '').slice(-4) || '0106';
  const tipoPagamento = pedido.tipo_pagamento || (isWeb ? 'maquininha' : 'online');
  const ePagamentoEntrega = tipoPagamento === 'maquininha' || tipoPagamento === 'dinheiro';

  const mockMotoboy: Entregador = {
    id: '1',
    nome: 'ANDERSON',
    status: 'em_rota',
    corridasConcluidas: 2,
  };

  return (
    <div className="w-full bg-slate-900 border border-slate-700/80 rounded-2xl px-3 py-2 flex items-center justify-between gap-3 shadow-lg hover:border-slate-600 transition-all text-slate-100">
      {/* Esquerda: Ícone de Origem + ID Roxo + Circulo de Tempo + Nome do Cliente */}
      <div className="flex items-center gap-2.5 min-w-0">
        {/* Ícone de Origem (iFood Vermelho Sorridente ou Cardápio Web Emerald) */}
        {isWeb ? (
          <div className="w-7 h-7 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-xs shrink-0 shadow">
            🌐
          </div>
        ) : (
          <div className="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow">
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

        {/* Nome do Cliente */}
        <span className="font-semibold text-sm text-slate-100 truncate">
          {pedido.nome_cliente}
        </span>
      </div>

      {/* Direita: Pagamento na Entrega + Botão Dar Coleta + Botão Chat + Mais Opções */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Ícone de Forma de Pagamento (Maquininha na Entrega vs Online) */}
        <div
          className="flex items-center gap-1 text-slate-300"
          title={ePagamentoEntrega ? 'Pagamento na Entrega (Maquininha)' : 'Pagamento Online Concluído'}
        >
          {tipoPagamento === 'maquininha' ? (
            <CreditCard className="w-5 h-5 text-sky-400" />
          ) : tipoPagamento === 'dinheiro' ? (
            <DollarSign className="w-5 h-5 text-emerald-400" />
          ) : (
            <Globe className="w-5 h-5 text-emerald-400" />
          )}
        </div>

        {/* Botão DAR COLETA (Retirada pelo Motoqueiro na Loja) */}
        <button
          onClick={handleDarColeta}
          disabled={coletado}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all shadow ${
            coletado
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 cursor-default'
              : 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/20'
          }`}
          title="Clique para dar Coleta quando o entregador pegar o pedido na loja"
        >
          <ShoppingBag className="w-4 h-4" />
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

        {/* Menu 3 Pontos */}
        <button className="p-1 rounded text-slate-400 hover:text-slate-200">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
