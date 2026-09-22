'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured, Pedido, OrdemStatus, Entregador } from '@/lib/supabase';
import { getBackendUrl } from '@/lib/backend';
import { OrderCard } from './OrderCard';
import { CompactOrderBar } from './CompactOrderBar';
import { MotoboySidebar } from './MotoboySidebar';
import { MotoboyChatModal } from './MotoboyChatModal';
import { NewOrderModal } from './NewOrderModal';
import { 
  Clock, 
  ChefHat, 
  CheckCircle2, 
  Plus, 
  Search, 
  RefreshCw, 
  Truck,
  Filter,
  Layers,
  AlertTriangle,
  Flame,
  Timer,
  LayoutList,
  Grid,
  Trash2,
  History,
  Sparkles,
  Calendar
} from 'lucide-react';

export const KanbanBoard: React.FC = () => {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [origemFilter, setOrigemFilter] = useState<'all' | 'web' | 'ifood'>('all');
  const [timeFilter, setTimeFilter] = useState<'24h' | 'all'>('24h');
  const [onlyDelayedFilter, setOnlyDelayedFilter] = useState(false);
  const [slaThresholdMin, setSlaThresholdMin] = useState(15);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  // Estado do Chat com Entregador
  const [chatEntregador, setChatEntregador] = useState<Entregador | null>(null);
  const [chatPedidoId, setChatPedidoId] = useState<string | undefined>(undefined);

  // Modo de exibição: 'compact' (estilo barras enxutas da imagem) vs 'cards' (detalhado)
  const [viewStyle, setViewStyle] = useState<'compact' | 'cards'>('cards');

  // Zerar TODOS os pedidos (Começar do zero)
  const handleResetDatabase = async () => {
    if (!window.confirm('⚠️ ATENÇÃO: Deseja ZERAR TODOS os pedidos e começar do zero? Todos os pedidos da tela e do banco serão apagados.')) {
      return;
    }
    setLoading(true);
    try {
      const backendUrl = getBackendUrl();
      await fetch(`${backendUrl}/api/pedidos/reset`, { method: 'POST' });
      if (isSupabaseConfigured) {
        await supabase.from('pedidos').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      }
    } catch (e) {
      console.warn('[AVISO] Falha ao zerar no backend Flask:', e);
    }
    try {
      localStorage.removeItem('local_simulated_pedidos');
    } catch {}
    setPedidos([]);
    setLoading(false);
    alert('✅ Sistema zerado com sucesso! Prontinho para começar do zero.');
  };

  // Limpar pedidos com mais de 24 horas
  const handleCleanOldOrders = async () => {
    setLoading(true);
    let msg = 'Pedidos com mais de 24h removidos.';
    try {
      const backendUrl = getBackendUrl();
      const res = await fetch(`${backendUrl}/api/pedidos/limpar-antigos?horas=24`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        msg = data.mensagem || msg;
      }
    } catch (e) {
      console.warn('[AVISO] Falha ao limpar pedidos antigos no backend:', e);
    }

    try {
      const localStr = localStorage.getItem('local_simulated_pedidos');
      if (localStr) {
        const local = JSON.parse(localStr);
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const filtered = local.filter((p: Pedido) => p.created_at >= cutoff);
        localStorage.setItem('local_simulated_pedidos', JSON.stringify(filtered));
      }
    } catch {}

    await fetchPedidos();
    setLoading(false);
    alert(`✅ ${msg}`);
  };

  // Busca inicial e periódica dos pedidos
  const fetchPedidos = useCallback(async () => {
    setLoading(true);

    const getLocalOrders = (): Pedido[] => {
      try {
        const localStr = localStorage.getItem('local_simulated_pedidos');
        return localStr ? JSON.parse(localStr) : [];
      } catch {
        return [];
      }
    };

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('pedidos')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Erro ao buscar pedidos no Supabase:', error.message);
          setPedidos(getLocalOrders());
        } else if (data) {
          const local = getLocalOrders();
          setPedidos([...local, ...data as Pedido[]]);
        }
      } catch (err) {
        console.error('Erro na requisição ao Supabase:', err);
        setPedidos(getLocalOrders());
      } finally {
        setLoading(false);
      }
    } else {
      try {
        const backendUrl = getBackendUrl();
        const res = await fetch(`${backendUrl}/api/pedidos`);

        if (res.ok) {
          const data = await res.json();
          setPedidos(data);
        } else {
          setPedidos(getLocalOrders());
        }
      } catch (err) {
        console.error('Erro ao buscar pedidos do Flask local:', err);
        setPedidos(getLocalOrders());
      } finally {
        setLoading(false);
      }
    }
  }, []);

  // Assinatura em Tempo Real
  useEffect(() => {
    fetchPedidos();

    if (isSupabaseConfigured) {
      const channel = supabase
        .channel('pedidos_realtime_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'pedidos' },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const newOrder = payload.new as Pedido;
              setPedidos((prev) => [newOrder, ...prev.filter((p) => p.id !== newOrder.id)]);
            } else if (payload.eventType === 'UPDATE') {
              const updatedOrder = payload.new as Pedido;
              setPedidos((prev) =>
                prev.map((p) => (p.id === updatedOrder.id ? updatedOrder : p))
              );
            } else if (payload.eventType === 'DELETE') {
              const deletedOrder = payload.old as { id: string };
              setPedidos((prev) => prev.filter((p) => p.id !== deletedOrder.id));
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setRealtimeConnected(true);
          }
        });

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      const interval = setInterval(fetchPedidos, 3000);
      setRealtimeConnected(true);
      return () => clearInterval(interval);
    }
  }, [fetchPedidos]);

  // Atualiza o status do pedido
  const handleUpdateStatus = async (id: string, newStatus: OrdemStatus) => {
    setPedidos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p))
    );

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('pedidos')
          .update({ status: newStatus })
          .eq('id', id);

        if (error) {
          console.error('Erro ao atualizar status no Supabase:', error.message);
          fetchPedidos();
        }
      } catch (err) {
        console.error('Erro ao conectar com Supabase:', err);
        fetchPedidos();
      }
    } else {
      try {
        const backendUrl = getBackendUrl();
        await fetch(`${backendUrl}/api/pedidos/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        });
      } catch (err) {
        console.error('Erro ao atualizar no Flask local:', err);
        fetchPedidos();
      }
    }
  };

  // Função para deletar pedido
  const handleDeletePedido = async (id: string) => {
    setPedidos((prev) => prev.filter((p) => p.id !== id && p.id_externo !== id));

    try {
      const localOrdersStr = localStorage.getItem('local_simulated_pedidos');
      if (localOrdersStr) {
        const localOrders: Pedido[] = JSON.parse(localOrdersStr);
        const filtered = localOrders.filter((p) => p.id !== id && p.id_externo !== id);
        localStorage.setItem('local_simulated_pedidos', JSON.stringify(filtered));
      }
    } catch {}

    if (isSupabaseConfigured) {
      try {
        await supabase.from('pedidos').delete().eq('id', id);
      } catch (err) {
        console.error('Erro ao deletar no Supabase:', err);
      }
    } else {
      try {
        const backendUrl = getBackendUrl();
        await fetch(`${backendUrl}/api/pedidos/${id}`, {
          method: 'DELETE',
        });
      } catch (err) {
        console.error('Erro ao deletar via Flask local:', err);
      }
    }
  };

  // Função para dar coleta no pedido (Motoqueiro pegou na loja)
  const handleColetar = async (id: string) => {
    await handleUpdateStatus(id, 'despachado');
  };

  // Função para verificar se o pedido está atrasado
  const isOrderDelayed = useCallback((pedido: Pedido) => {
    if (pedido.status !== 'pendente' && pedido.status !== 'preparando') return false;
    try {
      const created = new Date(pedido.created_at).getTime();
      const now = new Date().getTime();
      const diffMin = Math.floor(Math.max(0, now - created) / 60000);
      return diffMin >= slaThresholdMin;
    } catch {
      return false;
    }
  }, [slaThresholdMin]);

  const delayedOrdersCount = pedidos.filter(isOrderDelayed).length;

  // Filtragem dos pedidos (Pesquisa, Origem, SLA Atrasados e Período 24h)
  const cutoff24hMs = Date.now() - 24 * 60 * 60 * 1000;
  const filteredPedidos = pedidos.filter((p) => {
    const matchesQuery =
      p.nome_cliente.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id_externo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.endereco_entrega.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesOrigem = origemFilter === 'all' || p.origem === origemFilter;
    const matchesDelayed = !onlyDelayedFilter || isOrderDelayed(p);

    let matchesTime = true;
    if (timeFilter === '24h' && p.created_at) {
      try {
        matchesTime = new Date(p.created_at).getTime() >= cutoff24hMs;
      } catch {
        matchesTime = true;
      }
    }

    return matchesQuery && matchesOrigem && matchesDelayed && matchesTime;
  });

  const colPendente = filteredPedidos.filter((p) => p.status === 'pendente');
  const colPreparando = filteredPedidos.filter((p) => p.status === 'preparando');
  const colPronto = filteredPedidos.filter((p) => p.status === 'pronto');
  const colDespachado = filteredPedidos.filter((p) => p.status === 'despachado');

  const handleOpenChat = (entregador: Entregador, pedidoIdExterno?: string) => {
    setChatEntregador(entregador);
    setChatPedidoId(pedidoIdExterno);
  };

  return (
    <div className="space-y-6">
      {/* Banner de Alerta Crítico */}
      {delayedOrdersCount > 0 && (
        <div className="bg-rose-500/15 border-2 border-rose-500/80 rounded-2xl p-4 flex items-center justify-between gap-4 animate-pulse shadow-xl backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-600 text-white shadow-lg">
              <AlertTriangle className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                ALERTA DE PRIORIDADE NA COZINHA
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-600 text-white font-mono font-bold">
                  {delayedOrdersCount} PEDIDO(S) CRÍTICO(S)
                </span>
              </h3>
              <p className="text-xs text-rose-300">
                Pedidos ultrapassaram a tolerância de {slaThresholdMin} minutos. Priorize a produção imediatamente!
              </p>
            </div>
          </div>

          <button
            onClick={() => setOnlyDelayedFilter(!onlyDelayedFilter)}
            className={`px-4 py-2 rounded-xl font-bold text-xs transition-all shrink-0 shadow-lg ${
              onlyDelayedFilter
                ? 'bg-rose-500 text-white'
                : 'bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 border border-rose-500/40'
            }`}
          >
            {onlyDelayedFilter ? 'Mostrar Todos' : 'Ver Apenas Atrasados'}
          </button>
        </div>
      )}

      {/* Barra de Ferramentas e Estilos de Exibição */}
      <div className="flex flex-col md:flex-row flex-wrap items-stretch md:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800 backdrop-blur">
        {/* Campo de Pesquisa */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por cliente, id ou endereço..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700/70 text-slate-100 text-sm focus:outline-none focus:border-sky-500 transition-colors"
          />
        </div>

        {/* Filtro de Janela de Tempo (24h vs Todas) */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setTimeFilter('24h')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              timeFilter === '24h'
                ? 'bg-amber-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Exibir apenas pedidos recebidos nas últimas 24 horas"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Últimas 24h</span>
          </button>
          <button
            onClick={() => setTimeFilter('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              timeFilter === 'all'
                ? 'bg-slate-700 text-slate-100 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Exibir todo o histórico de pedidos"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Todas as Datas</span>
          </button>
        </div>

        {/* Alternador de Estilo Visual (Compacto da Imagem vs Cards Detalhados) */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setViewStyle('cards')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewStyle === 'cards'
                ? 'bg-sky-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Cards Detalhados</span>
          </button>
          <button
            onClick={() => setViewStyle('compact')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewStyle === 'compact'
                ? 'bg-purple-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutList className="w-3.5 h-3.5" />
            <span>Enxuto (Estilo Imagem)</span>
          </button>
        </div>

        {/* Filtros de Origem */}
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setOrigemFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              origemFilter === 'all'
                ? 'bg-slate-700 text-slate-100 shadow'
                : 'bg-slate-800/50 text-slate-400 hover:text-slate-200'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setOrigemFilter('web')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              origemFilter === 'web'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-slate-800/50 text-slate-400 hover:text-slate-200'
            }`}
          >
            Cardápio Web
          </button>
          <button
            onClick={() => setOrigemFilter('ifood')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              origemFilter === 'ifood'
                ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                : 'bg-slate-800/50 text-slate-400 hover:text-slate-200'
            }`}
          >
            iFood
          </button>
        </div>

        {/* Ações de Limpeza e Novo Pedido */}
        <div className="flex items-center gap-2">
          {/* Botão de Limpar Antigos (+24h) */}
          <button
            onClick={handleCleanOldOrders}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-amber-400 border border-amber-500/30 text-xs font-medium transition-all"
            title="Apagar pedidos com mais de 24 horas"
          >
            <History className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Limpar +24h</span>
          </button>

          {/* Botão de Zerar Pedidos (Começar do Zero) */}
          <button
            onClick={handleResetDatabase}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all shadow-sm"
            title="Apagar TODOS os pedidos da tela e do banco para começar do zero"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Zerar Pedidos</span>
          </button>

          <button
            onClick={fetchPedidos}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
            title="Recarregar Pedidos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-400' : ''}`} />
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs shadow-lg shadow-sky-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Simular Pedido</span>
          </button>
        </div>
      </div>

      {/* Layout Principal em Grade (Kanban + Painel Lateral de Motoboys da Casa) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Painel Lateral do Controle de Motoboys da Casa (Imagem 1) */}
        <div>
          <MotoboySidebar
            onOpenChat={(m) => handleOpenChat(m)}
          />
        </div>

        {/* Quadro Kanban (Colunas de Status) */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* Coluna 1: PENDENTE */}
          <div className="bg-slate-900/40 rounded-2xl border border-slate-800/80 p-4 space-y-4 min-h-[500px]">
            <div className="flex items-center justify-between pb-3 border-b border-amber-500/20">
              <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <Clock className="w-4 h-4" />
                </div>
                <h3>Pendentes</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {colPendente.length}
              </span>
            </div>

            <div className="space-y-3">
              {colPendente.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
                  <p className="text-xs text-slate-500">Nenhum pedido pendente</p>
                </div>
              ) : (
                colPendente.map((pedido) =>
                  viewStyle === 'compact' ? (
                    <CompactOrderBar
                      key={pedido.id}
                      pedido={pedido}
                      onUpdateStatus={handleUpdateStatus}
                      onOpenChat={(m, pid) => handleOpenChat(m, pid)}
                      onColetar={handleColetar}
                    />
                  ) : (
                    <OrderCard
                      key={pedido.id}
                      pedido={pedido}
                      onUpdateStatus={handleUpdateStatus}
                      onDeletePedido={handleDeletePedido}
                      slaThresholdMin={slaThresholdMin}
                    />
                  )
                )
              )}
            </div>
          </div>

          {/* Coluna 2: EM PREPARO */}
          <div className="bg-slate-900/40 rounded-2xl border border-slate-800/80 p-4 space-y-4 min-h-[500px]">
            <div className="flex items-center justify-between pb-3 border-b border-blue-500/20">
              <div className="flex items-center gap-2 text-blue-400 font-semibold text-sm">
                <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <ChefHat className="w-4 h-4" />
                </div>
                <h3>Em Preparo</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {colPreparando.length}
              </span>
            </div>

            <div className="space-y-3">
              {colPreparando.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
                  <p className="text-xs text-slate-500">Nenhum pedido em preparo</p>
                </div>
              ) : (
                colPreparando.map((pedido) =>
                  viewStyle === 'compact' ? (
                    <CompactOrderBar
                      key={pedido.id}
                      pedido={pedido}
                      onUpdateStatus={handleUpdateStatus}
                      onOpenChat={(m, pid) => handleOpenChat(m, pid)}
                      onColetar={handleColetar}
                    />
                  ) : (
                    <OrderCard
                      key={pedido.id}
                      pedido={pedido}
                      onUpdateStatus={handleUpdateStatus}
                      onDeletePedido={handleDeletePedido}
                      slaThresholdMin={slaThresholdMin}
                    />
                  )
                )
              )}
            </div>
          </div>

          {/* Coluna 3: PRONTO PARA EXPEDIÇÃO */}
          <div className="bg-slate-900/40 rounded-2xl border border-slate-800/80 p-4 space-y-4 min-h-[500px]">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <h3>Prontos para Expedição</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {colPronto.length}
              </span>
            </div>

            <div className="space-y-3">
              {colPronto.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
                  <p className="text-xs text-slate-500">Nenhum pedido pronto</p>
                </div>
              ) : (
                colPronto.map((pedido) =>
                  viewStyle === 'compact' ? (
                    <CompactOrderBar
                      key={pedido.id}
                      pedido={pedido}
                      onUpdateStatus={handleUpdateStatus}
                      onOpenChat={(m, pid) => handleOpenChat(m, pid)}
                      onColetar={handleColetar}
                    />
                  ) : (
                    <OrderCard
                      key={pedido.id}
                      pedido={pedido}
                      onUpdateStatus={handleUpdateStatus}
                      onDeletePedido={handleDeletePedido}
                      slaThresholdMin={slaThresholdMin}
                    />
                  )
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Chat com Entregador (Foto, Áudio, Texto) */}
      <MotoboyChatModal
        isOpen={Boolean(chatEntregador)}
        entregador={chatEntregador}
        pedidoIdExterno={chatPedidoId}
        onClose={() => setChatEntregador(null)}
      />

      {/* Modal para Adicionar Novo Pedido Simulado */}
      <NewOrderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={fetchPedidos}
      />
    </div>
  );
};
