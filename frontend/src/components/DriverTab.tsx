'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Truck, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  DollarSign, 
  FileText, 
  UserCheck, 
  Coffee, 
  X, 
  Printer, 
  UserPlus, 
  RotateCcw, 
  Trash2, 
  Edit, 
  AlertTriangle, 
  RefreshCw, 
  Search, 
  Phone, 
  Check,
  Zap,
  Sparkles,
  Users
} from 'lucide-react';

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { getBackendUrl } from '@/lib/backend';
import { CadastroMotoboyModal, DriverData } from './CadastroMotoboyModal';

export const DriverTab: React.FC = () => {
  const [drivers, setDrivers] = useState<DriverData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  // Modais
  const [isCadastroModalOpen, setIsCadastroModalOpen] = useState(false);
  const [settlementDriver, setSettlementDriver] = useState<DriverData | null>(null);
  const [settlementReceipt, setSettlementReceipt] = useState<any | null>(null);
  const [isResetTotalModalOpen, setIsResetTotalModalOpen] = useState(false);
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);

  // Busca lista de entregadores cadastrados
  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    const backendUrl = getBackendUrl();
    try {
      const res = await fetch(`${backendUrl}/api/entregadores`);
      if (res.ok) {
        const data = await res.json();
        setDrivers(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.warn('Falha ao buscar entregadores:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDrivers();
    const interval = setInterval(fetchDrivers, 2500); // Polling ultra-dinâmico de 2.5s
    return () => clearInterval(interval);
  }, [fetchDrivers]);

  // Alterar Status do Entregador
  const handleUpdateStatus = async (driverId: string, newStatus: string) => {
    const backendUrl = getBackendUrl();
    try {
      const res = await fetch(`${backendUrl}/api/entregadores/${driverId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchDrivers();
      }
    } catch (err) {
      alert('Erro ao atualizar status do entregador');
    }
  };

  // Deletar Entregador
  const handleDeleteDriver = async (driver: DriverData) => {
    if (!confirm(`Tem certeza que deseja remover o entregador "${driver.nome}" da frota?`)) return;
    const backendUrl = getBackendUrl();
    try {
      const res = await fetch(`${backendUrl}/api/entregadores/${driver.id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchDrivers();
      }
    } catch (err) {
      alert('Erro ao excluir entregador: ' + err);
    }
  };

  // Realizar Fechamento Financeiro / Quitação de Fretes
  const handleConfirmSettlement = async () => {
    if (!settlementDriver) return;
    const backendUrl = getBackendUrl();
    try {
      const res = await fetch(`${backendUrl}/api/entregadores/${settlementDriver.id}/fechamento`, { method: 'POST' });
      if (res.ok) {
        const receiptData = await res.json();
        setSettlementReceipt(receiptData);
        fetchDrivers();
      } else {
        alert('Erro ao processar fechamento financeiro');
      }
    } catch (err) {
      alert('Erro de comunicação com o servidor: ' + err);
    }
  };

  // Limpeza Total do Banco de Dados para Testes Reais
  const handleResetTotalSistema = async () => {
    setIsSubmittingReset(true);
    const backendUrl = getBackendUrl();
    try {
      localStorage.removeItem('local_simulated_pedidos');
      const res = await fetch(`${backendUrl}/api/sistema/reset-total`, { method: 'POST' });
      if (res.ok) {
        alert('🎉 Banco de dados zerado com sucesso! Prontos para testes com pedidos e entregadores reais.');
        setIsResetTotalModalOpen(false);
        fetchDrivers();
      } else {
        alert('Erro ao zerar o banco de dados.');
      }
    } catch (err) {
      alert('Falha ao comunicar com o backend: ' + err);
    }
    setIsSubmittingReset(false);
  };

  // Filtro de Entregadores
  const filteredDrivers = drivers.filter((d) => {
    const matchesSearch = 
      d.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.telefone.includes(searchQuery) ||
      (d.placa_veiculo && d.placa_veiculo.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'todos' || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Métricas da Frota
  const totalDrivers = drivers.length;
  const onlineDrivers = drivers.filter((d) => d.status === 'disponivel' || d.status === 'em_rota').length;
  const onRouteDrivers = drivers.filter((d) => d.status === 'em_rota').length;
  const totalDeliveriesToday = drivers.reduce((acc, curr) => acc + (curr.total_entregas || 0), 0);
  const totalFeesToPay = drivers.reduce((acc, curr) => acc + (curr.frete_acumulado || 0), 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-sans pb-10">
      
      {/* CAMEÇALHO & CARDS DE KPIS FINANCEIROS E DE FROTA */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* KPI 1: Frota Total */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Frota de Entregadores</span>
            <div className="text-xl font-black text-white flex items-center gap-2">
              <span>{totalDrivers} Cadastrado(s)</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                {onlineDrivers} Online
              </span>
            </div>
          </div>
        </div>

        {/* KPI 2: Em Rota */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center shrink-0">
            <Truck className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Motoboys em Rota</span>
            <div className="text-xl font-black text-sky-300">
              {onRouteDrivers} Entregando
            </div>
          </div>
        </div>

        {/* KPI 3: Entregas Realizadas */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Total de Entregas Hoje</span>
            <div className="text-xl font-black text-purple-300">
              {totalDeliveriesToday} Corrida(s)
            </div>
          </div>
        </div>

        {/* KPI 4: Fretes Acumulados a Pagar */}
        <div className="bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/40 rounded-2xl p-4 flex items-center gap-3.5 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 font-black shadow-lg">
            <DollarSign className="w-7 h-7" />
          </div>
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold">Total Fretes a Pagar</span>
            <div className="text-2xl font-black text-emerald-300">
              R$ {totalFeesToPay.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* BARRA DE AÇÕES DO GESTOR & FILTROS DE BUSCA */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 backdrop-blur shadow-2xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500 text-slate-950 font-black">
              🛵
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">Painel de Controle da Frota & Caixa</h2>
              <p className="text-xs text-slate-400">Gerencie motoristas, acompanhe o saldo de fretes e realize o fechamento de diária.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Botão Novo Entregador */}
            <button
              onClick={() => setIsCadastroModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg transition-all flex items-center gap-1.5 active:scale-98"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Novo Entregador</span>
            </button>

            {/* Botão Atualizar */}
            <button
              onClick={fetchDrivers}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition"
              title="Atualizar Lista"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Botão Limpeza Total Banco para Testes Reais */}
            <button
              onClick={() => setIsResetTotalModalOpen(true)}
              className="px-3 py-2.5 rounded-xl bg-red-950/60 hover:bg-red-900/80 text-red-300 font-bold text-xs border border-red-500/40 transition flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5 text-red-400" />
              <span>🧹 Reset Total (Testes Reais)</span>
            </button>
          </div>
        </div>

        {/* PESQUISA E FILTRO DE STATUS */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-slate-800/80">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome, telefone ou placa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl pl-10 pr-4 py-2 text-xs text-white outline-none"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs w-full sm:w-auto">
            {['todos', 'disponivel', 'em_rota', 'pausa', 'offline'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg font-bold capitalize transition text-[11px] ${
                  statusFilter === st
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {st === 'disponivel' ? '🟢 Disponível' : st === 'em_rota' ? '🛵 Em Rota' : st === 'pausa' ? '🟡 Pausa' : st === 'offline' ? '⚪ Offline' : 'Todos'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* TABELA DE GERENCIAMENTO DE ENTREGADORES */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Entregador</th>
                <th className="py-3.5 px-4">Contato / Placa</th>
                <th className="py-3.5 px-4">Status Ao Vivo</th>
                <th className="py-3.5 px-4 text-center">Entregas</th>
                <th className="py-3.5 px-4 text-right">Frete Acumulado</th>
                <th className="py-3.5 px-4 text-center">Ações Financeiras</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60 text-xs">
              {filteredDrivers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center space-y-2 text-slate-500">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                      🛵
                    </div>
                    <p className="font-bold text-slate-300">Nenhum motoboy localizado</p>
                    <p className="text-xs">Cadastre um novo entregador clicando no botão acima para iniciar os testes.</p>
                  </td>
                </tr>
              ) : (
                filteredDrivers.map((driver) => {
                  const telClean = driver.telefone ? driver.telefone.replace(/\D/g, '') : '';
                  const waUrl = telClean ? `https://wa.me/55${telClean}` : null;
                  const acumulado = driver.frete_acumulado || 0.0;

                  return (
                    <tr key={driver.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Entregador */}
                      <td className="py-4 px-4 font-bold text-white flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-black shrink-0">
                          {driver.nome.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-extrabold text-slate-100">{driver.nome}</div>
                          <span className="text-[10px] text-slate-500 font-mono">ID: {driver.id.substring(0, 8)}</span>
                        </div>
                      </td>

                      {/* Contato / Placa */}
                      <td className="py-4 px-4 space-y-1">
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-mono text-slate-300">{driver.telefone}</span>
                          {waUrl && (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-1.5 py-0.5 rounded font-bold transition"
                            >
                              💬 WA
                            </a>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-amber-400/90 font-semibold">
                          Placa: {driver.placa_veiculo || 'MOP-1001'}
                        </div>
                      </td>

                      {/* Status Ao Vivo */}
                      <td className="py-4 px-4">
                        <select
                          value={driver.status || 'disponivel'}
                          onChange={(e) => handleUpdateStatus(driver.id, e.target.value)}
                          className={`px-2.5 py-1 rounded-xl text-xs font-black border outline-none cursor-pointer ${
                            driver.status === 'disponivel'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : driver.status === 'em_rota'
                              ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                              : driver.status === 'pausa'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          <option value="disponivel" className="bg-slate-900 text-emerald-400">🟢 Disponível</option>
                          <option value="em_rota" className="bg-slate-900 text-sky-400">🛵 Em Rota</option>
                          <option value="pausa" className="bg-slate-900 text-amber-400">🟡 Pausa</option>
                          <option value="offline" className="bg-slate-900 text-slate-400">⚪ Offline</option>
                        </select>
                      </td>

                      {/* Entregas */}
                      <td className="py-4 px-4 text-center font-bold text-purple-300 font-mono text-sm">
                        {driver.total_entregas || 0}
                      </td>

                      {/* Frete Acumulado */}
                      <td className="py-4 px-4 text-right font-black text-emerald-400 font-mono text-sm">
                        R$ {acumulado.toFixed(2)}
                      </td>

                      {/* Ações */}
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setSettlementDriver(driver);
                              setSettlementReceipt(null);
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-1 active:scale-95"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>Fechar Diária</span>
                          </button>

                          <button
                            onClick={() => handleDeleteDriver(driver)}
                            className="p-1.5 bg-slate-800 hover:bg-red-950 hover:text-red-400 text-slate-400 rounded-lg transition"
                            title="Remover Entregador"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE CADASTRO DE MOTOBOY */}
      <CadastroMotoboyModal
        isOpen={isCadastroModalOpen}
        onClose={() => setIsCadastroModalOpen(false)}
        onDriverRegistered={(newDriver) => {
          setDrivers((prev) => [...prev, newDriver]);
          fetchDrivers();
        }}
      />

      {/* MODAL DE FECHAMENTO DE DIÁRIA E PRESTAÇÃO DE CONTAS */}
      {settlementDriver && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-emerald-400 font-black text-sm">
                <FileText className="w-5 h-5 text-emerald-400" />
                <span>Fechamento Financeiro / Prestação de Contas</span>
              </div>
              <button onClick={() => setSettlementDriver(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!settlementReceipt ? (
              <div className="space-y-4">
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Entregador:</span>
                    <strong className="text-slate-100">{settlementDriver.nome}</strong>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Placa do Veículo:</span>
                    <strong className="text-amber-400 font-mono">{settlementDriver.placa_veiculo || 'MOP-1001'}</strong>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Total de Corridas Realizadas:</span>
                    <strong className="text-purple-300 font-mono">{settlementDriver.total_entregas || 0} entregas</strong>
                  </div>
                  <div className="border-t border-slate-800 pt-2 flex justify-between text-sm font-bold text-slate-200">
                    <span>Valor Total a Pagar ao Entregador:</span>
                    <span className="text-xl font-black text-emerald-400 font-mono">
                      R$ {(settlementDriver.frete_acumulado || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Ao confirmar, o saldo acumulado será quitado e a contagem de entregas deste motorista voltará a zero.</span>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => setSettlementDriver(null)}
                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmSettlement}
                    className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs shadow-lg flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar Pagamento</span>
                  </button>
                </div>
              </div>
            ) : (
              /* RECIBO EMITIDO COM SUCESSO */
              <div className="space-y-4 animate-in zoom-in-95 duration-200">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/40 rounded-2xl text-center space-y-1">
                  <div className="w-10 h-10 bg-emerald-500 text-slate-950 rounded-full flex items-center justify-center mx-auto font-black text-lg">
                    ✓
                  </div>
                  <h3 className="font-black text-sm text-emerald-400">Pagamento Quitado com Sucesso!</h3>
                  <p className="text-xs text-slate-400">Comprovante de acerto de fretes gerado pelo sistema.</p>
                </div>

                <div className="bg-slate-950 p-4 border border-slate-800 rounded-2xl font-mono text-xs space-y-2 text-slate-300">
                  <div className="text-center font-bold text-amber-400 border-b border-slate-800 pb-2">
                    --- COMPROVANTE DE FECHAMENTO ---
                  </div>
                  <div className="flex justify-between">
                    <span>Entregador:</span>
                    <span>{settlementReceipt.entregador_nome}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Data/Hora:</span>
                    <span>{settlementReceipt.data_fechamento}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Entregas Quitadas:</span>
                    <span>{settlementReceipt.total_entregas_periodo}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-emerald-400 pt-2 border-t border-slate-800">
                    <span>Valor Quitado:</span>
                    <span>R$ {parseFloat(settlementReceipt.valor_pago || 0).toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => window.print()}
                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Imprimir Recibo</span>
                  </button>
                  <button
                    onClick={() => {
                      setSettlementDriver(null);
                      setSettlementReceipt(null);
                    }}
                    className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs"
                  >
                    Concluir
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE RESET TOTAL PARA TESTES REAIS */}
      {isResetTotalModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-red-500/40 rounded-3xl p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 bg-red-500/20 text-red-400 border border-red-500/40 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-extrabold text-base text-white">Resetar Banco para Testes Reais?</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Esta ação apagará <strong>todos os pedidos e entregadores simulados</strong> do banco de dados local. A loja ficará 100% zerada para início das operações reais.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setIsResetTotalModalOpen(false)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={handleResetTotalSistema}
                disabled={isSubmittingReset}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-extrabold rounded-xl text-xs shadow-lg flex items-center justify-center gap-1"
              >
                {isSubmittingReset ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <span>Sim, Zerar Tudo</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
