import React, { useState, useEffect } from 'react';
import { MapPin, User, ChevronDown, ChevronUp, ArrowRight, ArrowLeft, Clock, AlertTriangle, Flame, Trash2 } from 'lucide-react';
import { Pedido, OrdemStatus } from '@/lib/supabase';
import { OriginBadge } from './OriginBadge';
import { analyzeOrderItems } from '@/lib/beverageDetection';

interface OrderCardProps {
  pedido: Pedido;
  onUpdateStatus: (id: string, newStatus: OrdemStatus) => Promise<void>;
  onDeletePedido?: (id: string) => Promise<void>;
  slaThresholdMin?: number;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  pedido,
  onUpdateStatus,
  onDeletePedido,
  slaThresholdMin = 15,
}) => {
  const [showItems, setShowItems] = useState(false);
  const [loading, setLoading] = useState(false);
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  // Calcula o tempo decorrido em minutos a partir de created_at
  useEffect(() => {
    const calcElapsed = () => {
      try {
        const created = new Date(pedido.created_at).getTime();
        const now = new Date().getTime();
        const diffMs = Math.max(0, now - created);
        setElapsedMinutes(Math.floor(diffMs / 60000));
      } catch {
        setElapsedMinutes(0);
      }
    };

    calcElapsed();
    const interval = setInterval(calcElapsed, 10000); // Atualiza o timer a cada 10 segundos
    return () => clearInterval(interval);
  }, [pedido.created_at]);

  const handleStatusChange = async (targetStatus: OrdemStatus) => {
    setLoading(true);
    try {
      await onUpdateStatus(pedido.id, targetStatus);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Verificação de SLA e Atraso na Cozinha
  const isPendingOrPreparing = pedido.status === 'pendente' || pedido.status === 'preparando';
  const isDelayed = isPendingOrPreparing && elapsedMinutes >= slaThresholdMin;
  const minutesOverdue = elapsedMinutes - slaThresholdMin;

  return (
    <div
      className={`relative backdrop-blur rounded-xl p-4 shadow-lg transition-all group duration-300 border ${
        isDelayed
          ? 'bg-rose-950/30 border-rose-500/80 shadow-rose-900/30 animate-pulse ring-2 ring-rose-500/50'
          : 'bg-slate-800/80 border-slate-700/80 hover:border-slate-600'
      }`}
    >
      {/* Alerta Visual Superior de SLA Excedido */}
      {isDelayed && (
        <div className="mb-2 flex items-center justify-between bg-rose-500/20 border border-rose-500/40 px-2.5 py-1 rounded-lg text-rose-300 text-[11px] font-bold animate-bounce">
          <span className="flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            ⚠️ SLA EXCEDIDO (+{minutesOverdue} min)
          </span>
          <span className="text-[10px] bg-rose-600 text-white px-1.5 py-0.5 rounded font-mono">
            PRIORIDADE ALTA
          </span>
        </div>
      )}

      {/* Cabeçalho do Card */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-700/60">
        <OriginBadge origem={pedido.origem} />

        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <Clock className={`w-3.5 h-3.5 ${isDelayed ? 'text-rose-400 animate-spin' : 'text-slate-400'}`} />
            <span className={isDelayed ? 'text-rose-400 font-bold' : 'text-slate-300'}>
              ⏱️ {elapsedMinutes} min
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-300 font-semibold">{pedido.id_externo}</span>
          </div>

          {onDeletePedido && (
            <button
              disabled={loading}
              onClick={async () => {
                if (window.confirm(`Deseja realmente excluir o pedido ${pedido.id_externo} de ${pedido.nome_cliente}?`)) {
                  setLoading(true);
                  try {
                    await onDeletePedido(pedido.id);
                  } finally {
                    setLoading(false);
                  }
                }
              }}
              className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Deletar Pedido"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Informações do Cliente */}
      <div className="mt-3 space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-2">
            <User className="w-4 h-4 text-sky-400 mt-0.5 shrink-0" />
            <div>
              <h4 className="font-semibold text-sm text-slate-100 leading-tight flex items-center gap-1.5">
                {pedido.nome_cliente}
                {isDelayed && <Flame className="w-3.5 h-3.5 text-amber-400" />}
              </h4>
              {pedido.entregador_nome && (
                <span className="text-[10px] font-mono text-purple-300 block">
                  🛵 {pedido.entregador_nome}
                </span>
              )}
            </div>
          </div>

          {pedido.codigo_confirmacao && (
            <div className="px-2 py-1 bg-amber-500/15 border border-amber-500/30 rounded-lg text-[10px] font-bold text-amber-300 flex items-center gap-1">
              <span>PIN:</span>
              <strong className="text-xs font-mono font-black text-amber-200">{pedido.codigo_confirmacao}</strong>
            </div>
          )}
        </div>

        {/* ALERTA VISUAL DE BEBIDAS E SOBREMESAS */}
        {(() => {
          const analysis = analyzeOrderItems(pedido.itens);
          if (!analysis.hasSpecialItems) return null;
          return (
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              {analysis.hasBeverage && (
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase flex items-center gap-1 shadow-sm animate-pulse">
                  🥤 INCLUI BEBIDA
                </span>
              )}
              {analysis.hasDessert && (
                <span className="px-2 py-0.5 rounded-md bg-pink-500/20 text-pink-300 border border-pink-500/40 text-[10px] font-black uppercase flex items-center gap-1 shadow-sm">
                  🍰 INCLUI SOBREMESA
                </span>
              )}
            </div>
          );
        })()}

        {/* Endereço de Entrega */}
        <div className="flex items-start gap-2 text-xs text-slate-300">
          <MapPin className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
          <p className="line-clamp-2 leading-relaxed bg-slate-900/40 p-2 rounded-lg border border-slate-800 font-mono text-[11px]">
            {pedido.endereco_entrega}
          </p>
        </div>
      </div>

      {/* Itens do Pedido (Accordion) */}
      <div className="mt-3">
        <button
          onClick={() => setShowItems(!showItems)}
          className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 py-1 transition-colors"
        >
          <span className="font-medium">
            {Array.isArray(pedido.itens) ? `${pedido.itens.length} item(ns)` : 'Itens do pedido'}
          </span>
          {showItems ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showItems && Array.isArray(pedido.itens) && (
          <div className="mt-1.5 bg-slate-900/80 rounded-lg p-2.5 space-y-1.5 text-xs border border-slate-700/50">
            {pedido.itens.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-slate-300">
                <span className="truncate pr-2">
                  <span className="font-semibold text-sky-400">{item.quantidade}x</span> {item.nome}
                </span>
                <span className="text-slate-400 font-mono text-[11px] shrink-0">
                  {formatCurrency((item.preco_unitario || 0) * (item.quantidade || 1))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rodapé: Valor Total & Ações de Transição de Status */}
      <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between gap-2">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Total</span>
          <span className="text-base font-bold text-emerald-400 font-mono">
            {formatCurrency(pedido.valor_total)}
          </span>
        </div>

        {/* Botões de Ação Dinâmicos */}
        <div className="flex items-center gap-1.5">
          {pedido.status === 'pendente' && (
            <button
              disabled={loading}
              onClick={() => handleStatusChange('preparando')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-white text-xs font-semibold shadow transition-all disabled:opacity-50 ${
                isDelayed ? 'bg-rose-600 hover:bg-rose-500 animate-bounce' : 'bg-blue-600 hover:bg-blue-500'
              }`}
              title="Iniciar Preparo do Pedido"
            >
              <span>Preparar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {pedido.status === 'preparando' && (
            <>
              <button
                disabled={loading}
                onClick={() => handleStatusChange('pendente')}
                className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs transition-colors"
                title="Voltar para Pendente"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <button
                disabled={loading}
                onClick={() => handleStatusChange('pronto')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-white text-xs font-semibold shadow transition-all disabled:opacity-50 ${
                  isDelayed ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
                title="Marcar como Pronto"
              >
                <span>Concluir</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {pedido.status === 'pronto' && (
            <>
              <button
                disabled={loading}
                onClick={() => handleStatusChange('preparando')}
                className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs transition-colors"
                title="Voltar para Preparando"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <button
                disabled={loading}
                onClick={() => handleStatusChange('despachado')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium shadow transition-all disabled:opacity-50"
                title="Despachar Pedido"
              >
                <span>Despachar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
