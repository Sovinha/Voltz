'use client';

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Globe, 
  Clock, 
  Award, 
  BarChart3, 
  MapPin, 
  Layers, 
  Users, 
  Truck, 
  CheckCircle2, 
  RefreshCw, 
  Receipt, 
  AlertTriangle, 
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Building2
} from 'lucide-react';
import { supabase, isSupabaseConfigured, Pedido } from '@/lib/supabase';
import { getBackendUrl } from '@/lib/backend';
import { DriverData } from './CadastroMotoboyModal';

export const AnalyticsTab: React.FC = () => {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [drivers, setDrivers] = useState<DriverData[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Fechamento de Entregador
  const [selectedDriverFechamento, setSelectedDriverFechamento] = useState<DriverData | null>(null);
  const [isFechamentoModalOpen, setIsFechamentoModalOpen] = useState(false);
  const [fechamentoSucesso, setFechamentoSucesso] = useState<{
    entregador_nome: string;
    valor_pago: number;
    total_entregas_periodo: number;
    data_fechamento: string;
  } | null>(null);
  const [isProcessingFechamento, setIsProcessingFechamento] = useState(false);

  const backendUrl = getBackendUrl();

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Pedidos
      if (isSupabaseConfigured) {
        const { data } = await supabase.from('pedidos').select('*');
        if (data) setPedidos(data as Pedido[]);
      } else {
        const resP = await fetch(`${backendUrl}/api/pedidos`);
        if (resP.ok) {
          const data = await resP.json();
          setPedidos(data);
        }
      }

      // 2. Entregadores
      const resD = await fetch(`${backendUrl}/api/entregadores`);
      if (resD.ok) {
        const dataDrivers = await resD.json();
        setDrivers(dataDrivers);
      }
    } catch (err) {
      console.error('Erro ao carregar dados do painel de performance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Cálculos Métricos Globais
  const totalFaturamento = pedidos.reduce((sum, p) => sum + (p.valor_total || 0), 0);
  const totalPedidos = pedidos.length;
  const ticketMedio = totalPedidos > 0 ? totalFaturamento / totalPedidos : 0;

  // Origem: Web vs iFood
  const pedidosWeb = pedidos.filter((p) => p.origem === 'web');
  const pedidosIFood = pedidos.filter((p) => p.origem === 'ifood');
  const faturamentoWeb = pedidosWeb.reduce((sum, p) => sum + (p.valor_total || 0), 0);
  const faturamentoIFood = pedidosIFood.reduce((sum, p) => sum + (p.valor_total || 0), 0);

  const pctWeb = totalFaturamento > 0 ? Math.round((faturamentoWeb / totalFaturamento) * 100) : 50;
  const pctIFood = 100 - pctWeb;

  // Cálculo de SLA (Entregas < 25 min)
  const entregasNoPrazo = pedidos.filter((p) => {
    if (!p.created_at) return true;
    const diff = (new Date().getTime() - new Date(p.created_at).getTime()) / 60000;
    return diff <= 25;
  }).length;

  const taxaPontualidadeSLA = totalPedidos > 0 ? Math.round((entregasNoPrazo / totalPedidos) * 100) : 100;

  // Total de Frete Acumulado a pagar a todos os motoboys
  const totalFreteAcumulado = drivers.reduce((sum, d) => sum + (d.frete_acumulado || 0), 0);

  // Agrupamento por Bairro de João Pessoa
  const bairrosMap: Record<string, { count: number; total: number }> = {};
  pedidos.forEach((p) => {
    let bairro = 'João Pessoa - PB';
    const end = (p.endereco_entrega || '').toLowerCase();
    if (end.includes('manaíra') || end.includes('manaira')) bairro = 'Manaíra';
    else if (end.includes('tambaú') || end.includes('tambau')) bairro = 'Tambaú';
    else if (end.includes('bessa')) bairro = 'Bessa';
    else if (end.includes('cabo branco')) bairro = 'Cabo Branco';
    else if (end.includes('pedro gondim')) bairro = 'Pedro Gondim';
    else if (end.includes('expedicionários') || end.includes('expedicionarios')) bairro = 'Expedicionários';
    else if (end.includes('altiplano')) bairro = 'Altiplano';
    else if (end.includes('intermares')) bairro = 'Intermares';

    if (!bairrosMap[bairro]) {
      bairrosMap[bairro] = { count: 0, total: 0 };
    }
    bairrosMap[bairro].count += 1;
    bairrosMap[bairro].total += p.valor_total || 0;
  });

  const bairrosList = Object.entries(bairrosMap)
    .map(([bairro, info]) => ({
      bairro,
      count: info.count,
      total: info.total,
      pct: totalFaturamento > 0 ? Math.round((info.total / totalFaturamento) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  // Ação de Fechamento de Caixa do Entregador
  const handleOpenFechamentoModal = (driver: DriverData) => {
    setSelectedDriverFechamento(driver);
    setFechamentoSucesso(null);
    setIsFechamentoModalOpen(true);
  };

  const handleConfirmarFechamento = async () => {
    if (!selectedDriverFechamento) return;
    setIsProcessingFechamento(true);

    try {
      const res = await fetch(`${backendUrl}/api/entregadores/${selectedDriverFechamento.id}/fechamento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        const data = await res.json();
        setFechamentoSucesso(data);
        fetchData(); // Recarrega os saldos zerados
      } else {
        alert('Erro ao realizar fechamento financeiro do entregador.');
      }
    } catch (err) {
      alert('Falha de conexão com o servidor.');
    } finally {
      setIsProcessingFechamento(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans text-slate-100 pb-12">
      {/* Header do Painel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 backdrop-blur shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/20">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-100 flex items-center gap-2">
              Painel de Performance Logística & DRE
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                Filipéia • João Pessoa - PB
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Desempenho da frota, controle de fretes e fechamento financeiro diário
            </p>
          </div>
        </div>

        <button
          onClick={fetchData}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition flex items-center gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Atualizar Métricas</span>
        </button>
      </div>

      {/* Cartões de KPIs Globais em Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Faturamento Total */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-2 backdrop-blur">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Faturamento</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-emerald-400 font-mono">
            R$ {totalFaturamento.toFixed(2)}
          </div>
          <p className="text-[10px] text-slate-400 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            <span>Vendas Totais</span>
          </p>
        </div>

        {/* KPI 2: Total de Pedidos */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-2 backdrop-blur">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pedidos</span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-sky-400 font-mono">
            {totalPedidos}
          </div>
          <p className="text-[10px] text-slate-400 flex items-center gap-1">
            <ShoppingBag className="w-3 h-3 text-sky-400" />
            <span>Ticket Médio: R$ {ticketMedio.toFixed(2)}</span>
          </p>
        </div>

        {/* KPI 3: Taxa de Pontualidade SLA */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-2 backdrop-blur">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pontualidade SLA</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-amber-400 font-mono">
            {taxaPontualidadeSLA}%
          </div>
          <p className="text-[10px] text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-amber-400" />
            <span>Entregas &lt; 25 min</span>
          </p>
        </div>

        {/* KPI 4: Fretes Acumulados a Pagar */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-2 backdrop-blur">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fretes a Pagar</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-purple-400 font-mono">
            R$ {totalFreteAcumulado.toFixed(2)}
          </div>
          <p className="text-[10px] text-slate-400">Saldo atual da frota</p>
        </div>

        {/* KPI 5: Origem Predominante */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-2 backdrop-blur">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Origem Web</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-emerald-400 font-mono">
            {pctWeb}%
          </div>
          <p className="text-[10px] text-slate-400">Cardápio Web vs {pctIFood}% iFood</p>
        </div>
      </div>

      {/* MÓDULO 1: TABELA DE FECHAMENTO FINANCEIRO & PERFORMANCE DE ENTREGADORES */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Fechamento Financeiro & Performance dos Entregadores</h3>
              <p className="text-xs text-slate-400">
                Controle de entregas concluídas por PIN e pagamento acumulado de fretes
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            Frota Cadastrada: <strong className="text-purple-400">{drivers.length}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3">Entregador</th>
                <th className="pb-3">Veículo / Placa</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-center">Entregas Concluídas</th>
                <th className="pb-3 text-right">Frete Acumulado (R$)</th>
                <th className="pb-3 text-right">Ação de Fechamento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {drivers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                    Nenhum entregador encontrado no banco de dados.
                  </td>
                </tr>
              ) : (
                drivers.map((d) => {
                  const frete = d.frete_acumulado || 0;
                  const entregas = d.total_entregas || 0;

                  return (
                    <tr key={d.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 font-bold text-white font-sans flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center font-black text-xs">
                          🛵
                        </div>
                        <span>{d.nome}</span>
                      </td>

                      <td className="py-3.5 text-slate-300">
                        {d.placa_veiculo || 'MOP-1000'}
                      </td>

                      <td className="py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border font-sans ${
                            d.status === 'disponivel'
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : d.status === 'em_rota'
                              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30 animate-pulse'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {d.status === 'disponivel' ? 'Na Fila' : d.status === 'em_rota' ? 'Em Rota' : 'Pausa'}
                        </span>
                      </td>

                      <td className="py-3.5 text-center font-bold text-sky-400">
                        {entregas} corrida(s)
                      </td>

                      <td className="py-3.5 text-right font-black text-emerald-400 text-sm">
                        R$ {frete.toFixed(2)}
                      </td>

                      <td className="py-3.5 text-right font-sans">
                        <button
                          onClick={() => handleOpenFechamentoModal(d)}
                          disabled={frete === 0 && entregas === 0}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white font-extrabold text-xs rounded-xl shadow transition flex items-center gap-1.5 ml-auto"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>Pagar & Fechar</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MÓDULO 2: ANÁLISE DE VENDAS & ENTREGAS POR BAIRRO DE JOÃO PESSOA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Desempenho por Bairros (8 Colunas) */}
        <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white">Vendas & Entregas por Bairro (João Pessoa)</h3>
                <p className="text-xs text-slate-400">Distribuição logística dos pedidos entregues pela Filipéia</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {bairrosList.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">Nenhum bairro registrado nos pedidos atuais.</p>
            ) : (
              bairrosList.map((b) => (
                <div key={b.bairro} className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-amber-400" />
                      {b.bairro}
                    </span>
                    <div className="font-mono text-slate-300">
                      <strong className="text-emerald-400">R$ {b.total.toFixed(2)}</strong> ({b.count} pedidos)
                    </div>
                  </div>

                  {/* Barra Visual de Progresso */}
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(b.pct, 8)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Comparativo de Canais (4 Colunas) */}
        <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Canais de Origem</h3>
              <p className="text-xs text-slate-400">Cardápio Web vs iFood</p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            {/* Canal Cardápio Web */}
            <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
                <span className="flex items-center gap-1">🌐 Cardápio Web (Próprio)</span>
                <span>{pctWeb}%</span>
              </div>
              <div className="text-lg font-black text-white font-mono">
                R$ {faturamentoWeb.toFixed(2)}
              </div>
              <span className="text-[11px] text-slate-400 font-mono block">
                {pedidosWeb.length} pedido(s) • Taxa de Frete Grátis
              </span>
            </div>

            {/* Canal iFood */}
            <div className="bg-slate-950 p-4 rounded-xl border border-rose-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-rose-400">
                <span className="flex items-center gap-1">🔴 iFood</span>
                <span>{pctIFood}%</span>
              </div>
              <div className="text-lg font-black text-white font-mono">
                R$ {faturamentoIFood.toFixed(2)}
              </div>
              <span className="text-[11px] text-slate-400 font-mono block">
                {pedidosIFood.length} pedido(s) • Marketplace
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE FECHAMENTO FINANCEIRO DO MOTOBOY */}
      {isFechamentoModalOpen && selectedDriverFechamento && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in duration-200">
            {!fechamentoSucesso ? (
              <>
                <div className="text-center space-y-1">
                  <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30 flex items-center justify-center mx-auto mb-2">
                    <Receipt className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Fechamento de Caixa de Entregador</h3>
                  <p className="text-xs text-slate-400">
                    Confirme o pagamento das diárias e fretes acumulados de <strong className="text-white">{selectedDriverFechamento.nome}</strong>.
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">ENTREGADOR:</span>
                    <strong className="text-white">{selectedDriverFechamento.nome}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">ENTREGAS NO PERÍODO:</span>
                    <span className="text-sky-400 font-bold">{selectedDriverFechamento.total_entregas || 0} corridas</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-800 text-sm">
                    <span className="text-slate-300 font-bold">TOTAL A PAGAR:</span>
                    <strong className="text-emerald-400 font-black">
                      R$ {Number(selectedDriverFechamento.frete_acumulado || 0).toFixed(2)}
                    </strong>
                  </div>
                </div>

                <div className="flex space-x-2 pt-2">
                  <button
                    onClick={() => setIsFechamentoModalOpen(false)}
                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmarFechamento}
                    disabled={isProcessingFechamento}
                    className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5"
                  >
                    {isProcessingFechamento ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <span>Confirmar Pagamento</span>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center space-y-4 py-2">
                <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/40 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Pagamento Confirmado!</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Recibo emitido em {fechamentoSucesso.data_fechamento}
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-emerald-500/30 font-mono text-xs text-left space-y-2">
                  <p className="text-emerald-400 font-bold text-center mb-2">COMPROVANTE DE RECIBO DE FRETE</p>
                  <p className="flex justify-between"><span className="text-slate-500">Nome:</span> <strong className="text-white">{fechamentoSucesso.entregador_nome}</strong></p>
                  <p className="flex justify-between"><span className="text-slate-500">Corridas:</span> <span>{fechamentoSucesso.total_entregas_periodo}</span></p>
                  <p className="flex justify-between"><span className="text-slate-500">Valor Pago:</span> <strong className="text-emerald-400">R$ {fechamentoSucesso.valor_pago.toFixed(2)}</strong></p>
                </div>

                <button
                  onClick={() => setIsFechamentoModalOpen(false)}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs rounded-xl transition"
                >
                  Fechar Recibo
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
