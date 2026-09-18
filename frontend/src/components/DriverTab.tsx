'use client';

import React, { useState, useEffect } from 'react';
import { Truck, MapPin, CheckCircle2, Navigation, ExternalLink, Clock, ShieldCheck, DollarSign, FileText, UserCheck, Coffee, X, Printer, LogOut, UserPlus, RotateCcw } from 'lucide-react';

import { supabase, isSupabaseConfigured, Pedido } from '@/lib/supabase';
import { OriginBadge } from './OriginBadge';
import { DriverLoginView } from './DriverLoginView';
import { CadastroMotoboyModal, DriverData } from './CadastroMotoboyModal';

export const DriverTab: React.FC = () => {
  const [pedidosEmRota, setPedidosEmRota] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [authenticatedDriver, setAuthenticatedDriver] = useState<DriverData | null>(null);
  const [isCadastroModalOpen, setIsCadastroModalOpen] = useState(false);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [confirmedDeliveryIds, setConfirmedDeliveryIds] = useState<string[]>([]);

  // Carrega motorista salvo na sessão
  useEffect(() => {
    const saved = localStorage.getItem('auth_driver');
    if (saved) {
      try {
        setAuthenticatedDriver(JSON.parse(saved));
      } catch {}
    }
  }, []);

  // Fila de Entregadores da Casa
  const [drivers, setDrivers] = useState<DriverData[]>([
    { id: 'd1', nome: 'ANDERSON (Moto 01)', telefone: '83999112233', placa_veiculo: 'MOP-1001', status: 'disponivel', total_entregas: 5, frete_acumulado: 42.50 },
    { id: 'd2', nome: 'ROBERTO (Moto 04)', telefone: '83999223344', placa_veiculo: 'MOP-2004', status: 'em_rota', total_entregas: 7, frete_acumulado: 58.00 },
    { id: 'd3', nome: 'CARLOS (Moto 07)', telefone: '83999334455', placa_veiculo: 'MOP-3007', status: 'disponivel', total_entregas: 4, frete_acumulado: 34.00 },
  ]);

  const activeDriver = authenticatedDriver || drivers[0];

  const fetchPedidosDriver = async () => {
    setLoading(true);
    if (isSupabaseConfigured) {
      const { data } = await supabase
        .from('pedidos')
        .select('*')
        .in('status', ['preparando', 'pronto', 'despachado', 'alocado', 'em_rota'])
        .order('created_at', { ascending: true });
      if (data) setPedidosEmRota(data as Pedido[]);
    } else {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
        const res = await fetch(`${backendUrl}/api/pedidos`);
        if (res.ok) {
          const data: Pedido[] = await res.json();
          setPedidosEmRota(data.filter((p) => ['preparando', 'pronto', 'despachado', 'alocado', 'em_rota'].includes(p.status)));
        }
      } catch (err) {
        console.error('Erro ao carregar pedidos do entregador:', err);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    if (authenticatedDriver) {
      fetchPedidosDriver();
    }
  }, [authenticatedDriver]);

  const handleLogout = () => {
    localStorage.removeItem('auth_driver');
    setAuthenticatedDriver(null);
  };

  const handleConfirmDelivery = async (id: string) => {
    setConfirmedDeliveryIds((prev) => [...prev, id]);

    // Atualiza saldo de frete (+ R$ 8.50 por entrega)
    if (authenticatedDriver) {
      const updated = {
        ...authenticatedDriver,
        total_entregas: (authenticatedDriver.total_entregas || 0) + 1,
        frete_acumulado: (authenticatedDriver.frete_acumulado || 0) + 8.50,
      };
      setAuthenticatedDriver(updated);
      localStorage.setItem('auth_driver', JSON.stringify(updated));
    }

    if (isSupabaseConfigured) {
      await supabase.from('pedidos').update({ status: 'despachado' }).eq('id', id);
    } else {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
        await fetch(`${backendUrl}/api/pedidos/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'despachado' }),
        });
      } catch {}
    }

    setTimeout(() => {
      fetchPedidosDriver();
    }, 1000);
  };

  const handleChangeStatus = (newStatus: 'disponivel' | 'em_rota' | 'pausa') => {
    if (authenticatedDriver) {
      const updated = { ...authenticatedDriver, status: newStatus };
      setAuthenticatedDriver(updated);
      localStorage.setItem('auth_driver', JSON.stringify(updated));
    }
  };

  const getGoogleMapsUrl = (endereco: string) => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`;
  };

  const getWazeUrl = (endereco: string) => {
    return `https://waze.com/ul?q=${encodeURIComponent(endereco)}&navigate=yes`;
  };

  // Se não estiver logado, exibe a Tela de Login por Telefone
  if (!authenticatedDriver) {
    return (
      <div className="space-y-6">
        <DriverLoginView
          onLoginSuccess={(driver) => setAuthenticatedDriver(driver)}
          onOpenCadastroModal={() => setIsCadastroModalOpen(true)}
        />

        <CadastroMotoboyModal
          isOpen={isCadastroModalOpen}
          onClose={() => setIsCadastroModalOpen(false)}
          onDriverRegistered={(newDriver) => {
            setDrivers((prev) => [...prev, newDriver]);
            setAuthenticatedDriver(newDriver);
            localStorage.setItem('auth_driver', JSON.stringify(newDriver));
          }}
        />
      </div>
    );
  }

  const handleResetFrota = async () => {
    if (!confirm('Deseja resetar o status de todos os motoboys para disponível e zerar entregas?')) return;
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
      const res = await fetch(`${backendUrl}/api/entregadores/reset`, { method: 'POST' });
      if (res.ok) {
        alert('Frota de motoboys resetada com sucesso!');
        fetchPedidosDriver();
      }
    } catch (e) {
      alert('Erro ao resetar frota: ' + e);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 font-sans">
      {/* Header do Portal do Entregador Autenticado */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 backdrop-blur shadow-2xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 font-extrabold shadow-lg shadow-amber-500/20">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                🛵 Olá, {activeDriver.nome}!
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Tel: {activeDriver.telefone} • Moto: {activeDriver.placa_veiculo || 'MOP-1001'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleResetFrota}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 font-bold text-xs border border-sky-500/30 transition-all flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              <span>🔄 Resetar Frota</span>
            </button>

            <button
              onClick={() => setIsCadastroModalOpen(true)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs border border-amber-500/30 transition-all flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>➕ Cadastrar Motoqueiro</span>
            </button>


            <button
              onClick={() => setIsSettlementModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg transition-all flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4" />
              <span>📄 Fechamento de Caixa</span>
            </button>

            <button
              onClick={handleLogout}
              className="px-3 py-2 rounded-xl bg-red-950/60 hover:bg-red-900/80 text-red-300 font-bold text-xs border border-red-500/40 transition-colors flex items-center gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair</span>
            </button>
          </div>
        </div>

        {/* Chave de Status na Fila */}
        <div className="flex items-center justify-between text-xs pt-1">
          <span className="text-slate-400 font-medium">Seu Status na Fila da Matriz:</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleChangeStatus('disponivel')}
              className={`px-3 py-1.5 rounded-xl font-bold border transition-all flex items-center gap-1.5 ${
                activeDriver.status === 'disponivel'
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow'
                  : 'bg-slate-950 text-slate-400 border-slate-800'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>🟢 Disponível na Loja</span>
            </button>

            <button
              onClick={() => handleChangeStatus('pausa')}
              className={`px-3 py-1.5 rounded-xl font-bold border transition-all flex items-center gap-1.5 ${
                activeDriver.status === 'pausa'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow'
                  : 'bg-slate-950 text-slate-400 border-slate-800'
              }`}
            >
              <Coffee className="w-3.5 h-3.5" />
              <span>☕ Em Pausa</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cartões de Status e Métricas do Entregador */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-2 backdrop-blur">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Sua Posição na Fila</span>
          <div className="text-xl font-black text-amber-400 font-mono">
            Fila #1 da Matriz
          </div>
          <p className="text-[10px] text-slate-500">Pronto para receber corridas</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-2 backdrop-blur">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Entregas no Turno</span>
          <div className="text-2xl font-black text-sky-400 font-mono">
            {activeDriver.total_entregas || 0} corridas
          </div>
          <p className="text-[10px] text-slate-500">Concluídas hoje</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-2 backdrop-blur">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Frete Acumulado Hoje</span>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            R$ {(activeDriver.frete_acumulado || 0).toFixed(2)}
          </div>
          <p className="text-[10px] text-emerald-500/90 font-semibold">Pronto para fechamento</p>
        </div>
      </div>

      {/* Lista Sequencial de Paradas da Rota */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Navigation className="w-4 h-4 text-sky-400" />
            Suas Paradas de Entrega Atribuídas ({pedidosEmRota.length})
          </h3>
          <button
            onClick={fetchPedidosDriver}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1.5"
          >
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span>Atualizar</span>
          </button>
        </div>

        {pedidosEmRota.length === 0 ? (
          <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl p-12 text-center space-y-3">
            <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto opacity-80" />
            <h4 className="text-sm font-semibold text-slate-200">Sem entregas pendentes no momento!</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Todas as entregas do seu lote foram concluídas. Quando a matriz alocar um novo pedido ou lote para você, ele aparecerá aqui instantaneamente.
            </p>
          </div>
        ) : (
          pedidosEmRota.map((pedido, index) => {
            const isDelivered = confirmedDeliveryIds.includes(pedido.id) || pedido.status === 'despachado';

            return (
              <div
                key={pedido.id}
                className={`bg-slate-900/80 border rounded-2xl p-5 shadow-xl transition-all space-y-4 backdrop-blur ${
                  isDelivered
                    ? 'border-emerald-500/40 bg-emerald-950/10 opacity-75'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Cabeçalho da Parada */}
                <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-sm font-bold font-mono">
                      #{index + 1}
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-100 text-sm">{pedido.nome_cliente}</h4>
                      <span className="text-[11px] font-mono text-slate-400">{pedido.id_externo}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <OriginBadge origem={pedido.origem} />
                    {isDelivered && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Entregue
                      </span>
                    )}
                  </div>
                </div>

                {/* Endereço de Entrega */}
                <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Endereço de Entrega</span>
                  <p className="text-xs text-slate-200 leading-relaxed font-mono">
                    {pedido.endereco_entrega}
                  </p>
                </div>

                {/* Resumo de Itens & Valor a Receber */}
                <div className="flex items-center justify-between text-xs text-slate-300 pt-1">
                  <div>
                    <span className="text-slate-400">Itens: </span>
                    <span className="font-semibold text-slate-200">
                      {Array.isArray(pedido.itens) ? pedido.itens.map(i => `${i.quantidade}x ${i.nome}`).join(', ') : 'Itens do pedido'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px]">Valor a Receber</span>
                    <strong className="text-emerald-400 text-sm font-mono">R$ {pedido.valor_total.toFixed(2)}</strong>
                  </div>
                </div>

                {/* Botões de Ação para Navegação Externa & Confirmação */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-800/60">
                  <a
                    href={getGoogleMapsUrl(pedido.endereco_entrega)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                    <span>Google Maps</span>
                    <ExternalLink className="w-3 h-3 text-slate-400 ml-auto" />
                  </a>

                  <a
                    href={getWazeUrl(pedido.endereco_entrega)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
                  >
                    <Navigation className="w-3.5 h-3.5 text-sky-400" />
                    <span>Navegar via Waze</span>
                    <ExternalLink className="w-3 h-3 text-slate-400 ml-auto" />
                  </a>

                  <button
                    disabled={isDelivered}
                    onClick={() => handleConfirmDelivery(pedido.id)}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all shadow-lg ${
                      isDelivered
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20 hover:scale-102'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isDelivered ? 'Entrega Confirmada' : 'Concluir Entrega'}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Cadastro de Novo Motoboy */}
      <CadastroMotoboyModal
        isOpen={isCadastroModalOpen}
        onClose={() => setIsCadastroModalOpen(false)}
        onDriverRegistered={(newDriver) => {
          setDrivers((prev) => [...prev, newDriver]);
          setAuthenticatedDriver(newDriver);
          localStorage.setItem('auth_driver', JSON.stringify(newDriver));
        }}
      />

      {/* Modal Fechamento de Caixa do Motoboy */}
      {isSettlementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-sm">
                <FileText className="w-5 h-5" />
                <span>Fechamento de Turno do Motoqueiro</span>
              </div>
              <button onClick={() => setIsSettlementModalOpen(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 font-mono text-xs">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">ENTREGADOR:</span>
                <strong className="text-slate-100 font-bold">{activeDriver.nome}</strong>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">TELEFONE:</span>
                <span className="text-slate-200">{activeDriver.telefone}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">DATA DO TURNO:</span>
                <span className="text-slate-200">{new Date().toLocaleDateString('pt-BR')}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">CORRIDAS CONCLUÍDAS:</span>
                <strong className="text-sky-400">{activeDriver.total_entregas || 0} entregas</strong>
              </div>
              <div className="flex justify-between text-sm font-black pt-1">
                <span className="text-slate-300">TOTAL DE FRETE A PAGAR:</span>
                <strong className="text-emerald-400">R$ {(activeDriver.frete_acumulado || 0).toFixed(2)}</strong>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => setIsSettlementModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  alert(`✅ Fechamento de caixa de ${activeDriver.nome} realizado com sucesso!\nValor pago: R$ ${(activeDriver.frete_acumulado || 0).toFixed(2)}`);
                  setIsSettlementModalOpen(false);
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Encerrar Turno & Imprimir Acerto</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
