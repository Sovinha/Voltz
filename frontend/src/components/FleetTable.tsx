'use client';

import React, { useState } from 'react';
import { 
  Users, 
  Bike, 
  Car, 
  MapPin, 
  Star, 
  DollarSign, 
  Phone, 
  MessageCircle, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  Zap, 
  ShieldCheck, 
  ExternalLink,
  Search,
  Plus
} from 'lucide-react';
import { Driver, ExpandedPedido } from '@/lib/mockData';

interface FleetTableProps {
  drivers: Driver[];
  pedidos: ExpandedPedido[];
  onSelectDriverOnMap?: (driver: Driver) => void;
  onSendRouteToDriver?: (driver: Driver) => void;
  onRegisterDriverModal?: () => void;
}

export const FleetTable: React.FC<FleetTableProps> = ({
  drivers,
  pedidos,
  onSelectDriverOnMap,
  onSendRouteToDriver,
  onRegisterDriverModal
}) => {
  const [filterStatus, setFilterStatus] = useState<'todos' | 'online' | 'em_rota' | 'em_pausa'>('todos');
  const [fleetSearch, setFleetSearch] = useState('');

  const filteredDrivers = drivers.filter(d => {
    if (filterStatus !== 'todos' && d.status !== filterStatus) return false;
    if (fleetSearch) {
      const q = fleetSearch.toLowerCase();
      return (
        d.nome.toLowerCase().includes(q) ||
        d.modeloVeiculo.toLowerCase().includes(q) ||
        d.placa.toLowerCase().includes(q) ||
        d.telefone.includes(q)
      );
    }
    return true;
  });

  return (
    <div className="bg-slate-900/85 backdrop-blur-xl border border-slate-800/90 rounded-2xl p-4 shadow-2xl mt-4">
      
      {/* CABEÇALHO DA TABELA MINHA FROTA */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/90 mb-4">
        
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-500 text-slate-950 font-black shadow-lg shadow-amber-500/20 ring-1 ring-amber-300">
            <Users className="w-5 h-5" />
          </div>

          <div>
            <h2 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
              MINHA FROTA DE ENTREGADORES
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                {drivers.length} Cadastrados
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Gerenciamento em tempo real, frete acumulado e localização GPS
            </p>
          </div>
        </div>

        {/* FILTROS DE STATUS E BUSCA */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={fleetSearch}
              onChange={(e) => setFleetSearch(e.target.value)}
              placeholder="Buscar entregador ou placa..."
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl pl-8 pr-3 py-1.5 outline-none focus:border-amber-400/50 w-44"
            />
          </div>

          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
            <button
              onClick={() => setFilterStatus('todos')}
              className={`px-3 py-1 rounded-lg transition-all ${filterStatus === 'todos' ? 'bg-slate-800 text-amber-300 shadow' : 'text-slate-400 hover:text-white'}`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterStatus('em_rota')}
              className={`px-3 py-1 rounded-lg transition-all ${filterStatus === 'em_rota' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'}`}
            >
              Em Rota
            </button>
            <button
              onClick={() => setFilterStatus('online')}
              className={`px-3 py-1 rounded-lg transition-all ${filterStatus === 'online' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-slate-400 hover:text-white'}`}
            >
              Na Fila
            </button>
          </div>

          {onRegisterDriverModal && (
            <button
              onClick={onRegisterDriverModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Entregador</span>
            </button>
          )}

        </div>

      </div>

      {/* TABELA DE ENTREGADORES */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-950/60">
              <th className="py-3 px-4 rounded-l-xl">Entregador</th>
              <th className="py-3 px-4">Veículo</th>
              <th className="py-3 px-4">Status & GPS</th>
              <th className="py-3 px-4">Pedidos Ativos</th>
              <th className="py-3 px-4">Frete Acumulado (Dia)</th>
              <th className="py-3 px-4 text-right rounded-r-xl">Ações Rápidas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs font-medium">
            {filteredDrivers.map((driver) => {
              // Buscar pedidos ativos deste entregador
              const activeOrdersForDriver = pedidos.filter(
                p => p.entregadorAssinado?.id === driver.id && p.status !== 'finalizado'
              );

              return (
                <tr key={driver.id} className="hover:bg-slate-800/40 transition-colors group">
                  
                  {/* COLUNA 1: ENTREGADOR (FOTO + NOME + AVALIAÇÃO) */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img 
                          src={driver.avatar} 
                          alt={driver.nome} 
                          className="w-10 h-10 rounded-full object-cover ring-2 ring-amber-400/40 shadow-md group-hover:scale-105 transition-transform"
                        />
                        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${
                          driver.status === 'em_rota' ? 'bg-cyan-400 animate-pulse' :
                          driver.status === 'online' ? 'bg-emerald-400' :
                          driver.status === 'em_pausa' ? 'bg-amber-400' : 'bg-slate-500'
                        }`}></span>
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <strong className="text-white text-sm font-bold group-hover:text-amber-300 transition-colors">
                            {driver.nome}
                          </strong>
                          <span className="flex items-center gap-0.5 text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-bold">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            {driver.rating.toFixed(1)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-cyan-400" />
                          <span>{driver.telefone}</span>
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* COLUNA 2: VEÍCULO */}
                  <td className="py-3.5 px-4 font-mono">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-cyan-400">
                        {driver.veiculo === 'carro' ? <Car className="w-4 h-4" /> : <Bike className="w-4 h-4" />}
                      </div>
                      <div>
                        <span className="text-slate-200 font-bold block text-xs">
                          {driver.modeloVeiculo}
                        </span>
                        <span className="text-[10px] text-slate-400 bg-slate-950 border border-slate-800 px-1.5 py-0.2 rounded">
                          {driver.placa}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* COLUNA 3: STATUS & GPS */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-extrabold border shadow-sm ${
                        driver.status === 'em_rota'
                          ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40 shadow-cyan-950/40'
                          : driver.status === 'online'
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : driver.status === 'em_pausa'
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${
                          driver.status === 'em_rota' ? 'bg-cyan-400 animate-ping' :
                          driver.status === 'online' ? 'bg-emerald-400' :
                          driver.status === 'em_pausa' ? 'bg-amber-400' : 'bg-slate-400'
                        }`}></span>
                        <span>
                          {driver.status === 'em_rota' ? 'EM ROTA (ENTREGANDO)' :
                           driver.status === 'online' ? 'ONLINE (NA FILA)' :
                           driver.status === 'em_pausa' ? 'EM PAUSA' : 'OFFLINE'}
                        </span>
                      </span>

                      <span className="text-[10px] text-slate-400 flex items-center gap-1" title={driver.ultimaLocalizacao}>
                        <MapPin className="w-3 h-3 text-cyan-400 animate-pulse" />
                        <span className="hidden lg:inline truncate max-w-[120px]">{driver.ultimaLocalizacao}</span>
                      </span>
                    </div>
                  </td>

                  {/* COLUNA 4: PEDIDOS ATIVOS */}
                  <td className="py-3.5 px-4">
                    {activeOrdersForDriver.length > 0 ? (
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-amber-400 block">
                          {activeOrdersForDriver.length} Pedido(s) Ativo(s)
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {activeOrdersForDriver.map(p => (
                            <span key={p.id} className="text-[10px] bg-cyan-950/80 text-cyan-300 border border-cyan-800/50 px-1.5 py-0.5 rounded font-mono font-bold">
                              {p.id} ({p.bairro})
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-500 text-xs italic">Nenhum pedido no momento</span>
                    )}
                  </td>

                  {/* COLUNA 5: FRETE ACUMULADO */}
                  <td className="py-3.5 px-4 font-mono">
                    <span className="text-sm font-black text-amber-400">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(driver.freteAcumulado)}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-sans">12 corridas hoje</span>
                  </td>

                  {/* COLUNA 6: AÇÕES RÁPIDAS */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      
                      {/* Botão Enviar Rota IA */}
                      <button
                        onClick={() => onSendRouteToDriver && onSendRouteToDriver(driver)}
                        title="Enviar Rota Otimizada IA"
                        className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 text-[11px] font-black transition-all shadow-md flex items-center gap-1"
                      >
                        <Zap className="w-3.5 h-3.5 text-slate-950" />
                        <span>Enviar Rota</span>
                      </button>

                      {/* Botão Ver no Mapa */}
                      <button
                        onClick={() => onSelectDriverOnMap && onSelectDriverOnMap(driver)}
                        title="Ver no Mapa"
                        className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition-colors"
                      >
                        <MapPin className="w-4 h-4" />
                      </button>

                      {/* Botão WhatsApp */}
                      <a
                        href={`https://wa.me/55${driver.telefone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Conversar no WhatsApp"
                        className="p-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>

                    </div>
                  </td>

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
};
