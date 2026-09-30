import React, { useState, useEffect } from 'react';
import { MapPin, User, ChevronDown, ChevronUp, ArrowRight, ArrowLeft, Clock, AlertTriangle, Flame, Trash2, Phone, Copy, Check } from 'lucide-react';
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
  const [copiedAddress, setCopiedAddress] = useState(false);

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
    const interval = setInterval(calcElapsed, 10000);
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

  const handleCopyAddress = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (pedido.endereco_entrega) {
      navigator.clipboard.writeText(pedido.endereco_entrega);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  // Verificação de SLA e Atraso na Cozinha
  const isPendingOrPreparing = pedido.status === 'pendente' || pedido.status === 'preparando' || pedido.status === 'preparo';
  const isDelayed = isPendingOrPreparing && elapsedMinutes >= slaThresholdMin;
  const minutesOverdue = elapsedMinutes - slaThresholdMin;

  // Format WhatsApp number
  const cleanPhone = pedido.telefone_cliente ? pedido.telefone_cliente.replace(/\D/g, '') : '';
  const waUrl = cleanPhone ? `https://wa.me/55${cleanPhone}` : null;

  return (
    <div
      className={`relative backdrop-blur-xl rounded-2xl p-4 shadow-xl transition-all duration-300 border ${
        isDelayed
          ? 'bg-gradient-to-b from-rose-950/40 to-slate-900/90 border-rose-500/80 shadow-rose-900/30 ring-2 ring-rose-500/50 hover:shadow-rose-900/50'
          : 'bg-slate-900/85 border-slate-800/90 hover:border-slate-700 hover:bg-slate-900/95 hover:shadow-2xl'
      }`}
    >
      {/* Alerta Visual Superior de SLA Excedido */}
      {isDelayed && (
        <div className="mb-3 flex items-center justify-between bg-gradient-to-r from-rose-500/25 to-red-500/25 border border-rose-500/50 px-3 py-1.5 rounded-xl text-rose-200 text-[11px] font-extrabold shadow-inner">
          <span className="flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 animate-bounce" />
            <span>SLA EXCEDIDO (+{minutesOverdue} min)</span>
          </span>
          <span className="text-[10px] bg-rose-600 text-white px-2 py-0.5 rounded-md font-mono uppercase tracking-wider font-extrabold">
            URGENTE
          </span>
        </div>
      )}

      {/* Cabeçalho do Card */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
        <OriginBadge origem={pedido.origem} />

        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="flex items-center gap-1.5 bg-slate-950/70 px-2.5 py-1 rounded-lg border border-slate-800/80">
            <Clock className={`w-3.5 h-3.5 ${isDelayed ? 'text-rose-400 animate-spin' : 'text-slate-400'}`} />
            <span className={isDelayed ? 'text-rose-400 font-extrabold' : 'text-slate-300 font-medium'}>
              ⏱️ {elapsedMinutes}m
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-white font-bold">{pedido.id_externo}</span>
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
              className="p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Deletar Pedido"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Informações do Cliente */}
      <div className="mt-3 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0">
            <div className="p-1.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0 mt-0.5">
              <User className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-sm text-white leading-tight flex items-center gap-1.5 truncate">
                <span>{pedido.nome_cliente}</span>
                {isDelayed && <Flame className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />}
              </h4>
              {pedido.entregador_nome && (
                <span className="text-[11px] font-mono text-purple-300 font-semibold block mt-0.5">
                  🛵 Motoboy: {pedido.entregador_nome}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs transition-colors"
                title="Abrir conversa no WhatsApp"
              >
                <Phone className="w-3.5 h-3.5" />
              </a>
            )}

            {pedido.codigo_confirmacao && (
              <div className="px-2 py-1 bg-amber-500/15 border border-amber-500/30 rounded-xl text-[10px] font-bold text-amber-300 flex items-center gap-1 shadow-sm">
                <span className="text-slate-400">PIN:</span>
                <strong className="text-xs font-mono font-black text-amber-200">{pedido.codigo_confirmacao}</strong>
              </div>
            )}
          </div>
        </div>

        {/* ALERTA VISUAL DE BEBIDAS E SOBREMESAS */}
        {(() => {
          const analysis = analyzeOrderItems(pedido.itens);
          if (!analysis.hasSpecialItems) return null;
          return (
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              {analysis.hasBeverage && (
                <span className="px-2.5 py-0.5 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-extrabold uppercase flex items-center gap-1 shadow-sm">
                  🥤 BEBIDA GELADA
                </span>
              )}
              {analysis.hasDessert && (
                <span className="px-2.5 py-0.5 rounded-lg bg-gradient-to-r from-pink-500/20 to-rose-500/20 text-pink-300 border border-pink-500/40 text-[10px] font-extrabold uppercase flex items-center gap-1 shadow-sm">
                  🍰 SOBREMESA
                </span>
              )}
            </div>
          );
        })()}

        {/* Endereço de Entrega */}
        <div className="relative group/addr bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
          <div className="flex items-start justify-between gap-2 text-xs text-slate-300">
            <div className="flex items-start gap-2 min-w-0">
              <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="line-clamp-2 leading-snug font-mono text-[11px] text-slate-200">
                {pedido.endereco_entrega}
              </p>
            </div>
            <button
              onClick={handleCopyAddress}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors shrink-0"
              title="Copiar Endereço"
            >
              {copiedAddress ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Itens do Pedido (Accordion) */}
      <div className="mt-3">
        <button
          onClick={() => setShowItems(!showItems)}
          className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-white py-1 px-1 rounded-lg hover:bg-slate-800/50 transition-colors"
        >
          <span className="font-semibold text-[11px]">
            {Array.isArray(pedido.itens) ? `${pedido.itens.length} item(ns) na comanda` : 'Itens do pedido'}
          </span>
          {showItems ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showItems && Array.isArray(pedido.itens) && (
          <div className="mt-1.5 bg-slate-950/80 rounded-xl p-2.5 space-y-1.5 text-xs border border-slate-800/80 shadow-inner max-h-40 overflow-y-auto">
            {pedido.itens.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-slate-300 border-b border-slate-800/40 last:border-0 pb-1 last:pb-0">
                <span className="truncate pr-2">
                  <span className="font-extrabold text-sky-400">{item.quantidade}x</span> {item.nome}
                </span>
                <span className="text-slate-400 font-mono text-[11px] shrink-0 font-medium">
                  {formatCurrency((item.preco_unitario || 0) * (item.quantidade || 1))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rodapé: Valor Total & Ações de Transição de Status */}
      <div className="mt-3.5 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
        <div>
          <span className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider block">Total</span>
          <span className="text-base font-black text-emerald-400 font-mono tracking-tight">
            {formatCurrency(pedido.valor_total)}
          </span>
        </div>

        {/* Botões de Ação Dinâmicos */}
        <div className="flex items-center gap-1.5">
          {(pedido.status === 'pendente' || pedido.status === 'preparo') && (
            <button
              disabled={loading}
              onClick={() => handleStatusChange('pronto')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-xs font-bold shadow-md transition-all disabled:opacity-50 hover:scale-102 ${
                isDelayed ? 'bg-rose-600 hover:bg-rose-500 animate-pulse' : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
              title="Marcar como Pronto para Expedição"
            >
              <span>Concluir</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {pedido.status === 'preparando' && (
            <>
              <button
                disabled={loading}
                onClick={() => handleStatusChange('pendente')}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                title="Voltar para Pendente"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <button
                disabled={loading}
                onClick={() => handleStatusChange('pronto')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-xs font-bold shadow-md transition-all disabled:opacity-50 hover:scale-102 ${
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
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                title="Voltar para Preparando"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <button
                disabled={loading}
                onClick={() => handleStatusChange('despachado')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50 hover:scale-102"
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

