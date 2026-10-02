'use client';

import React, { useState } from 'react';
import { 
  MapPin, 
  Clock, 
  AlertTriangle, 
  User, 
  DollarSign, 
  Phone, 
  ChevronRight, 
  ChevronLeft,
  Truck,
  Bike,
  Car,
  CheckCircle2,
  CheckSquare,
  Square
} from 'lucide-react';
import { ExpandedPedido, Driver } from '@/lib/mockData';

interface ExpandedOrderCardProps {
  pedido: ExpandedPedido;
  drivers: Driver[];
  onMoveStatus: (pedidoId: string, direction: 'next' | 'prev') => void;
  onAssignDriver: (pedidoId: string, driverId: string) => void;
  onSelectOrder: (pedido: ExpandedPedido) => void;
  onDeleteOrder: (pedidoId: string) => void;
  isSelected?: boolean;
  onToggleSelect?: (pedidoId: string) => void;
}

export const ExpandedOrderCard: React.FC<ExpandedOrderCardProps> = ({
  pedido,
  drivers,
  onMoveStatus,
  onAssignDriver,
  onSelectOrder,
  onDeleteOrder,
  isSelected = false,
  onToggleSelect
}) => {
  const [showDriverDropdown, setShowDriverDropdown] = useState(false);
  const isIfood = pedido.origem === 'ifood';

  return (
    <div 
      onClick={() => onSelectOrder(pedido)}
      className={`relative group bg-slate-900/90 backdrop-blur-xl rounded-2xl p-4 shadow-xl border transition-all duration-300 hover:shadow-2xl cursor-pointer ${
        isSelected
          ? 'border-cyan-400 bg-cyan-950/20 ring-2 ring-cyan-400/40 shadow-cyan-950/50'
          : pedido.isCritico 
          ? 'border-amber-500/70 shadow-amber-950/30 bg-gradient-to-b from-amber-950/20 via-slate-900/90 to-slate-900' 
          : 'border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900'
      }`}
    >
      
      {/* BADGE VISUAL SE FOR CRÍTICO (>15MIN) */}
      {pedido.isCritico && (
        <div className="mb-3 flex items-center justify-between bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-amber-500/10 border border-amber-500/40 px-3 py-1.5 rounded-xl text-amber-200 text-[11px] font-black shadow-inner">
          <span className="flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 animate-bounce" />
            <span>SLA EXCEDIDO ({pedido.tempoEsperaMin} MIN)</span>
          </span>
          <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-md uppercase tracking-wider animate-pulse">
            CRÍTICO
          </span>
        </div>
      )}

      {/* CABEÇALHO DO CARD: CHECKBOX DE SELEÇÃO EM LOTE + ORIGEM + ID + HORA */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
        
        <div className="flex items-center gap-2">
          {/* Checkbox de Seleção em Lote */}
          {onToggleSelect && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect(pedido.id);
              }}
              className="text-slate-400 hover:text-cyan-400 transition-colors p-0.5"
              title="Selecionar para ação em lote"
            >
              {isSelected ? (
                <CheckSquare className="w-4 h-4 text-cyan-400" />
              ) : (
                <Square className="w-4 h-4 text-slate-600 hover:text-slate-400" />
              )}
            </button>
          )}

          {/* Badge Origem */}
          <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-lg border shadow-sm ${
            isIfood
              ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
              : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
          }`}>
            {isIfood ? '🔴 iFood' : '🌐 Web'}
          </span>

          <span className="text-xs font-mono font-black text-cyan-400 tracking-wider">
            {pedido.id}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-slate-400 text-xs font-mono font-medium">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{pedido.horaPedido}</span>
          <span className="text-slate-600">•</span>
          <span className={`font-bold ${pedido.isCritico ? 'text-amber-400 font-mono' : 'text-slate-300'}`}>
            {pedido.tempoEsperaMin}m espera
          </span>
        </div>
      </div>

      {/* MINI DASHBOARD CLIENTE & TIPO COMIDA */}
      <div className="py-3 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-800/90 border border-slate-700/80 flex items-center justify-center text-xl shrink-0 shadow-inner group-hover:scale-105 transition-transform">
          {pedido.foodIcon}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-black text-white truncate tracking-tight group-hover:text-cyan-300 transition-colors">
            {pedido.cliente}
          </h3>

          <p className="text-xs text-slate-300 font-medium truncate mt-0.5">
            {pedido.itensResumo}
          </p>

          <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-1 truncate">
            <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
            <span className="truncate">{pedido.bairro} — {pedido.endereco}</span>
          </p>
        </div>
      </div>

      {/* VALOR DO PEDIDO + TAXA ESTIMADA DE FRETE */}
      <div className="bg-slate-950/70 rounded-xl p-2.5 border border-slate-800/80 flex items-center justify-between text-xs mb-3 font-mono">
        <div>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-sans">Valor Total</span>
          <strong className="text-white text-sm font-bold">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pedido.valorTotal)}
          </strong>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-sans">Frete Est.</span>
          <span className="text-amber-400 font-bold">
            R$ {pedido.taxaEntrega.toFixed(2)} ({pedido.distanciaKm} km)
          </span>
        </div>
      </div>

      {/* RODAPÉ DO CARD: MINI PERFIL DO ENTREGADOR DESIGNADO */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
        
        {pedido.entregadorAssinado ? (
          <div className="flex items-center gap-2 bg-slate-950/80 px-2.5 py-1.5 rounded-xl border border-slate-800/90">
            <img 
              src={pedido.entregadorAssinado.avatar} 
              alt={pedido.entregadorAssinado.nome} 
              className="w-6 h-6 rounded-full object-cover ring-1 ring-cyan-400"
            />
            <div className="leading-none">
              <span className="text-[11px] font-bold text-slate-200 block truncate max-w-[100px]">
                {pedido.entregadorAssinado.nome.split(' ')[0]}
              </span>
              <span className="text-[9px] text-cyan-400 font-medium flex items-center gap-0.5">
                {pedido.entregadorAssinado.veiculo === 'carro' ? <Car className="w-2.5 h-2.5" /> : <Bike className="w-2.5 h-2.5" />}
                Alocado
              </span>
            </div>
          </div>
        ) : (
          <div className="relative">
            <button
              onClick={() => setShowDriverDropdown(!showDriverDropdown)}
              className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-all flex items-center gap-1"
            >
              <User className="w-3 h-3 text-cyan-400" />
              <span>Atribuir Entregador</span>
            </button>

            {showDriverDropdown && (
              <div className="absolute bottom-full left-0 mb-2 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-30 p-1">
                <span className="text-[10px] text-slate-400 font-bold px-2 py-1 block">Selecionar Entregador:</span>
                {drivers.map((drv) => (
                  <button
                    key={drv.id}
                    onClick={() => {
                      onAssignDriver(pedido.id, drv.id);
                      setShowDriverDropdown(false);
                    }}
                    className="w-full text-left px-2 py-1.5 hover:bg-slate-800 rounded-lg flex items-center gap-2 text-xs text-slate-200"
                  >
                    <img src={drv.avatar} alt={drv.nome} className="w-5 h-5 rounded-full object-cover" />
                    <span className="truncate flex-1">{drv.nome}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* BOTÕES DE MOVER STATUS DO KANBAN */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onMoveStatus(pedido.id, 'prev')}
            title="Voltar Status"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={() => onMoveStatus(pedido.id, 'next')}
            title="Avançar Status"
            className="p-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-colors shadow-md"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </div>

    </div>
  );
};
