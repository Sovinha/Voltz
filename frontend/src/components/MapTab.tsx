'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { 
  Store, 
  Navigation, 
  MapPin, 
  Play, 
  Zap, 
  Bot, 
  ShieldAlert, 
  Flame, 
  Eye, 
  EyeOff,
  Printer,
  Plus,
  Search,
  UserPlus,
  Bike,
  Users,
  AlertTriangle,
  RotateCcw,
  Sliders,
  Layers,
  Sparkles,
  PackageCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
  UserCheck,
  Trash2
} from 'lucide-react';
import { supabase, isSupabaseConfigured, Pedido, OrdemStatus } from '@/lib/supabase';
import { LojaConfig } from './InteractiveMap';
import { StoreFormModal } from './StoreFormModal';
import { OriginBadge } from './OriginBadge';
import { AlocarMotoboyModal } from './AlocarMotoboyModal';
import { PedidoDetalhesModal } from './PedidoDetalhesModal';
import { WebhookSimulatorModal } from './WebhookSimulatorModal';
import { PedidoExpedicaoModal } from './PedidoExpedicaoModal';
import { CadastroMotoboyModal, DriverData } from './CadastroMotoboyModal';
import { NewOrderModal } from './NewOrderModal';
import { checkIsPeakHour, analyzeFleetAndSLARisks, SLARiskAlert } from '@/lib/DispatchEngine';

const InteractiveMap = dynamic(
  () => import('./InteractiveMap').then((mod) => mod.InteractiveMap),
  { ssr: false, loading: () => <div className="w-full h-full bg-slate-900 animate-pulse rounded-2xl flex items-center justify-center text-slate-500 text-xs font-mono">Carregando Canvas do Mapa...</div> }
);

export const MapTab: React.FC = () => {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [animatingCoords, setAnimatingCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Piloto Automático (Despacho Autônomo)
  const [isAutoPilotEnabled, setIsAutoPilotEnabled] = useState(false);
  const [slaAlerts, setSlaAlerts] = useState<SLARiskAlert[]>([]);

  // Modais de Ação
  const [alocarModalPedido, setAlocarModalPedido] = useState<Pedido | null>(null);
  const [detalhesModalPedido, setDetalhesModalPedido] = useState<Pedido | null>(null);
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
  const [expedicaoPedido, setExpedicaoPedido] = useState<Pedido | null>(null);
  const [isCadastroMotoboyOpen, setIsCadastroMotoboyOpen] = useState(false);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);

  // Aba ativa do Console Lateral ('pedidos' | 'frota')
  const [activeConsoleTab, setActiveConsoleTab] = useState<'pedidos' | 'frota'>('pedidos');

  // Filtros de Busca, Origem & Status
  const [searchQuery, setSearchQuery] = useState('');
  const [origemFilter, setOrigemFilter] = useState<'todos' | 'web' | 'ifood'>('todos');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  // Parâmetros Logísticos
  const [maxDeliveriesPerRun, setMaxDeliveriesPerRun] = useState<number>(4);

  // Lista de Entregadores Cadastrados
  const [drivers, setDrivers] = useState<DriverData[]>([
    { id: '1', nome: 'ANDERSON', telefone: '83999887766', placa_veiculo: 'MOP-1020', status: 'disponivel', total_entregas: 12, frete_acumulado: 84.0 },
    { id: '2', nome: 'ROBERTO', telefone: '83988776655', placa_veiculo: 'MOP-3040', status: 'disponivel', total_entregas: 8, frete_acumulado: 56.0 },
    { id: '3', nome: 'CARLOS', telefone: '83977665544', placa_veiculo: 'MOP-5060', status: 'pausa', total_entregas: 5, frete_acumulado: 35.0 },
  ]);

  // Visibilidade de Rotas Sob Demanda
  const [showSingleRoute, setShowSingleRoute] = useState(false);
  const [showBatchRoute, setShowBatchRoute] = useState(false);
  const [showEtaBadge, setShowEtaBadge] = useState(false);

  // Modo Multi-Pedido (Batch Routing)
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [orderedBatch, setOrderedBatch] = useState<Pedido[]>([]);
  const [includeReturnLeg, setIncludeReturnLeg] = useState(true);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiReasoning, setAiReasoning] = useState<string | null>(null);
  const [batchMetrics, setBatchMetrics] = useState<{
    totalMin: number;
    deliveryMin: number;
    returnMin: number;
    totalKm: number;
    returnKm: number;
  } | null>(null);


  // Configuração da Loja Matriz
  const [loja, setLoja] = useState<LojaConfig>({
    nome: 'Filipéia Trattoria Express',
    endereco: 'R. Orestes Lisboa, 124 - Pedro Gondim, João Pessoa - PB',
    latitude: -7.1155,
    longitude: -34.8601,
  });

  const peakInfo = checkIsPeakHour();

  useEffect(() => {
    const savedLoja = localStorage.getItem('loja_matriz');
    if (savedLoja) {
      try { setLoja(JSON.parse(savedLoja)); } catch {}
    }
  }, []);

  const handleSaveLoja = (novaLoja: LojaConfig) => {
    setLoja(novaLoja);
    localStorage.setItem('loja_matriz', JSON.stringify(novaLoja));
  };

  // Buscar entregadores do backend
  const fetchDrivers = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
      const res = await fetch(`${backendUrl}/api/entregadores`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setDrivers(data);
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const getLocalOrders = (): Pedido[] => {
    try {
      const localStr = localStorage.getItem('local_simulated_pedidos');
      return localStr ? JSON.parse(localStr) : [];
    } catch {
      return [];
    }
  };

  const fetchPedidos = useCallback(async () => {
    if (isSupabaseConfigured) {
      try {
        const { data } = await supabase.from('pedidos').select('*').order('created_at', { ascending: false });
        const local = getLocalOrders();
        if (data) setPedidos([...local, ...data as Pedido[]]);
        else setPedidos(local);
      } catch {
        setPedidos(getLocalOrders());
      }
    } else {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
        const res = await fetch(`${backendUrl}/api/pedidos`);
        const local = getLocalOrders();
        if (res.ok) {
          const data = await res.json();
          const existingIds = new Set(data.map((p: Pedido) => p.id));
          const uniqueLocal = local.filter((p) => !existingIds.has(p.id));
          setPedidos([...uniqueLocal, ...data]);
        } else {
          setPedidos(local);
        }
      } catch (err) {
        setPedidos(getLocalOrders());
      }
    }
  }, []);

  useEffect(() => {
    fetchPedidos();
  }, [fetchPedidos]);

  useEffect(() => {
    if (pedidos.length > 0 && !selectedPedido) {
      setSelectedPedido(pedidos[0]);
    }
  }, [pedidos, selectedPedido]);

  // Recálculo TSP Automático e Dinâmico do Lote
  useEffect(() => {
    if (selectedBatchIds.length === 0) {
      setOrderedBatch([]);
      setShowBatchRoute(false);
      setBatchMetrics(null);
      return;
    }

    const selectedOrders = pedidos.filter((p) => selectedBatchIds.includes(p.id));
    let currentLat = loja.latitude;
    let currentLng = loja.longitude;

    const unvisited = [...selectedOrders];
    const ordered: Pedido[] = [];

    while (unvisited.length > 0) {
      let closestIdx = 0;
      let minDistance = Infinity;

      unvisited.forEach((p, idx) => {
        const targetLat = p.latitude || loja.latitude + 0.01;
        const targetLng = p.longitude || loja.longitude + 0.01;
        const dist = calcDistanceKm(currentLat, currentLng, targetLat, targetLng);
        if (dist < minDistance) {
          minDistance = dist;
          closestIdx = idx;
        }
      });

      const nextOrder = unvisited.splice(closestIdx, 1)[0];
      ordered.push(nextOrder);
      currentLat = nextOrder.latitude || loja.latitude + 0.01;
      currentLng = nextOrder.longitude || loja.longitude + 0.01;
    }

    setOrderedBatch(ordered);
    setShowBatchRoute(true);
  }, [selectedBatchIds, pedidos, loja]);

  // Algoritmo Inteligente de Roteirização com DeepSeek AI
  const handleAutoGroup = async () => {
    const readyOrPreparing = pedidos.filter((p) => ['pronto', 'preparo', 'pendente'].includes(p.status));
    if (readyOrPreparing.length === 0) {
      alert('Nenhum pedido pendente, em preparo ou pronto para agrupar!');
      return;
    }

    setIsAiLoading(true);
    setAiReasoning(null);
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

    try {
      const response = await fetch(`${backendUrl}/api/ai/roteirizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pedidos: readyOrPreparing, entregadores: drivers }),

      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success' && data.decisao_ia) {
          const aiDecision = data.decisao_ia;
          setAiReasoning(aiDecision.raciocinio_ia || 'Rota otimizada via inteligência logística DeepSeek AI.');
          
          if (aiDecision.grupos && aiDecision.grupos.length > 0) {
            const firstGroupIds = aiDecision.grupos[0].ordem_entrega || aiDecision.grupos[0].pedidos_ids || [];
            if (firstGroupIds.length > 0) {
              setIsBatchMode(true);
              setSelectedBatchIds(firstGroupIds);
              setIsAiLoading(false);
              return;
            }
          }
        }
      }
    } catch (e) {
      console.warn('[DeepSeek AI] Backend offline/erro, utilizando fallback geográfico local:', e);
    }

    // Fallback Geográfico Local se AI estiver offline
    let bestCluster: Pedido[] = [];
    let minTotalDist = Infinity;

    for (let i = 0; i < readyOrPreparing.length; i++) {
      const p1 = readyOrPreparing[i];
      const p1Lat = p1.latitude || loja.latitude + 0.01;
      const p1Lng = p1.longitude || loja.longitude + 0.01;

      const sortedByP1 = readyOrPreparing
        .filter((p) => p.id !== p1.id)
        .map((p) => {
          const lat = p.latitude || loja.latitude + 0.01;
          const lng = p.longitude || loja.longitude + 0.01;
          return { pedido: p, dist: calcDistanceKm(p1Lat, p1Lng, lat, lng) };
        })
        .sort((a, b) => a.dist - b.dist);

      const cluster = [p1, ...sortedByP1.slice(0, maxDeliveriesPerRun - 1).map(item => item.pedido)];
      let clusterDist = calcDistanceKm(loja.latitude, loja.longitude, p1Lat, p1Lng);
      for (let k = 0; k < sortedByP1.length && k < maxDeliveriesPerRun - 1; k++) {
        clusterDist += sortedByP1[k].dist;
      }

      if (clusterDist < minTotalDist) {
        minTotalDist = clusterDist;
        bestCluster = cluster;
      }
    }

    setAiReasoning('Rota agrupada por proximidade de bairros (Algoritmo Geográfico Local).');
    setIsBatchMode(true);
    setSelectedBatchIds(bestCluster.map((p) => p.id));
    setIsAiLoading(false);
  };


  // Projeção do Horário de Retorno
  const getDriverReturnTimeString = (totalMin: number) => {
    if (!totalMin) return '--:--';
    const now = new Date();
    now.setMinutes(now.getMinutes() + totalMin);
    return now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  // Helper para calcular o Horário Previsto de Entrega e o Status do SLA
  const getDeliveryETAInfo = (createdIso?: string, pLat?: number | null, pLng?: number | null) => {
    const createdDate = createdIso ? new Date(createdIso) : new Date();
    const dLat = pLat || loja.latitude + 0.015;
    const dLng = pLng || loja.longitude + 0.015;
    const distKm = calcDistanceKm(loja.latitude, loja.longitude, dLat, dLng);

    const peakFactor = peakInfo.factor;
    const totalMin = Math.round(((distKm / 20) * 60 + 15) * peakFactor);
    
    const targetDate = new Date(createdDate.getTime() + totalMin * 60000);
    const timeStr = targetDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    const elapsedMin = Math.floor((Date.now() - createdDate.getTime()) / 60000);
    const remainMin = totalMin - elapsedMin;
    
    let slaLabel = '🟢 No Prazo';
    let slaBadgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    
    if (remainMin <= 0) {
      slaLabel = '🔴 Excedido';
      slaBadgeClass = 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse';
    } else if (remainMin <= 10) {
      slaLabel = '🟡 Risco Atraso';
      slaBadgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    }

    return { timeStr, remainMin, slaLabel, slaBadgeClass, distKm };
  };

  // Monitoramento de SLA
  useEffect(() => {
    const { alerts } = analyzeFleetAndSLARisks(pedidos);
    setSlaAlerts(alerts);

    if (isAutoPilotEnabled && pedidos.length > 0) {
      const pendingOrder = pedidos.find((p) => p.status === 'pendente' && !p.entregador_nome);
      if (pendingOrder) {
        handleConfirmAlocar(pendingOrder.id, 'ANDERSON (AutoPilot)');
      }
    }
  }, [pedidos, isAutoPilotEnabled]);

  // Atualização Direta de Status
  const handleUpdateStatus = async (pedidoId: string, newStatus: OrdemStatus) => {
    setPedidos((prev) =>
      prev.map((p) => (p.id === pedidoId ? { ...p, status: newStatus } : p))
    );

    const local = getLocalOrders();
    if (local.some((p) => p.id === pedidoId)) {
      const updatedLocal = local.map((p) => (p.id === pedidoId ? { ...p, status: newStatus } : p));
      localStorage.setItem('local_simulated_pedidos', JSON.stringify(updatedLocal));
    }

    if (isSupabaseConfigured) {
      await supabase.from('pedidos').update({ status: newStatus }).eq('id', pedidoId);
    } else {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
        await fetch(`${backendUrl}/api/pedidos/${pedidoId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });
      } catch {}
    }
  };

  // Deletar pedido individual
  const handleDeletePedido = async (pedidoId: string) => {
    setPedidos((prev) => prev.filter((p) => p.id !== pedidoId && p.id_externo !== pedidoId));
    if (selectedPedido?.id === pedidoId) setSelectedPedido(null);

    const local = getLocalOrders();
    const updatedLocal = local.filter((p) => p.id !== pedidoId && p.id_externo !== pedidoId);
    localStorage.setItem('local_simulated_pedidos', JSON.stringify(updatedLocal));

    if (isSupabaseConfigured) {
      await supabase.from('pedidos').delete().eq('id', pedidoId);
    } else {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
        await fetch(`${backendUrl}/api/pedidos/${pedidoId}`, {
          method: 'DELETE',
        });
      } catch {}
    }
  };

  // Alocação Direta de Entregador
  const handleConfirmAlocar = async (pedidoId: string, entregadorNome: string) => {
    setPedidos((prev) =>
      prev.map((p) =>
        p.id === pedidoId
          ? { ...p, status: 'alocado', entregador_nome: entregadorNome }
          : p
      )
    );

    const local = getLocalOrders();
    if (local.some((p) => p.id === pedidoId)) {
      const updatedLocal = local.map((p) =>
        p.id === pedidoId ? { ...p, status: 'alocado' as const, entregador_nome: entregadorNome } : p
      );
      localStorage.setItem('local_simulated_pedidos', JSON.stringify(updatedLocal));
    }

    if (isSupabaseConfigured) {
      await supabase
        .from('pedidos')
        .update({ status: 'alocado', entregador_nome: entregadorNome })
        .eq('id', pedidoId);
    } else {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
        await fetch(`${backendUrl}/api/pedidos/${pedidoId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'alocado', entregador_nome: entregadorNome }),
        });
      } catch {}
    }
  };

  // Contagem por Status
  const countByStatus = (statusKey: string) => {
    if (statusKey === 'todos') return pedidos.length;
    return pedidos.filter((p) => p.status === statusKey).length;
  };

  // Haversine
  const calcDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const toggleBatchSelect = (id: string) => {
    if (selectedBatchIds.includes(id)) {
      setSelectedBatchIds(selectedBatchIds.filter((item) => item !== id));
    } else {
      setSelectedBatchIds([...selectedBatchIds, id]);
    }
  };

  // Métricas do Pedido Selecionado
  const destLat = selectedPedido?.latitude || loja.latitude + 0.015;
  const destLng = selectedPedido?.longitude || loja.longitude + 0.015;
  const distanciaKm = calcDistanceKm(loja.latitude, loja.longitude, destLat, destLng);
  const tempoEstimadoMin = Math.round(((distanciaKm / 20) * 60 + 5) * peakInfo.factor);
  const valorFreteEst = (5.00 + distanciaKm * 2.50).toFixed(2);

  // Simulação de deslocamento
  const handleStartSimulation = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    if (isBatchMode) {
      setShowBatchRoute(true);
    } else {
      setShowSingleRoute(true);
    }
  };

  // Filtros de Status (Chips em pílulas)
  const statusFilterPills = [
    { key: 'todos', label: 'Todos' },
    { key: 'preparo', label: '🔵 Preparo' },
    { key: 'pronto', label: '🟢 Pronto' },
    { key: 'alocado', label: '🟣 Alocado' },
    { key: 'em_rota', label: '🟡 Em rota' },
    { key: 'finalizado', label: '⚪ Finalizado' },
  ];

  // Filtragem da Lista
  const filteredPedidos = pedidos.filter((p) => {
    if (statusFilter !== 'todos' && p.status !== statusFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.nome_cliente.toLowerCase().includes(q);
      const matchExt = p.id_externo.toLowerCase().includes(q);
      const matchAddress = p.endereco_entrega.toLowerCase().includes(q);
      if (!matchName && !matchExt && !matchAddress) return false;
    }

    if (origemFilter !== 'todos' && p.origem !== origemFilter) return false;

    return true;
  });

  const driversDisponiveis = drivers.filter(d => d.status === 'disponivel');

  return (
    <div className="h-[calc(100vh-6.2rem)] min-h-[660px] flex flex-col space-y-3 overflow-hidden text-slate-100 font-sans">
      
      {/* 1. BARRA SUPERIOR DE COMANDO HUD (Top Command HUD) */}
      <div className="bg-slate-900/95 border border-slate-800/80 rounded-2xl p-2.5 shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
        
        {/* Identidade da Loja Matriz */}
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 font-black shadow-lg shadow-amber-500/20">
            <Store className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-white flex items-center gap-1.5 leading-tight">
              <span>{loja.nome}</span>
              <button
                onClick={() => setIsStoreModalOpen(true)}
                className="text-[10px] text-amber-400 hover:underline font-mono"
              >
                (Editar)
              </button>
            </h2>
            <p className="text-[10px] text-slate-400 font-mono truncate max-w-[200px] xl:max-w-[300px]">
              {loja.endereco}
            </p>
          </div>
        </div>

        {/* Central de Filtros & Busca Unificada */}
        <div className="flex-1 max-w-2xl flex items-center gap-2">
          {/* Input de Busca */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar cliente, código ou rua..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:border-amber-500 focus:outline-none placeholder:text-slate-500 font-medium"
            />
          </div>

          {/* Switcher de Origem (Todos / Web / iFood) */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs shrink-0">
            {(['todos', 'web', 'ifood'] as const).map((o) => (
              <button
                key={o}
                onClick={() => setOrigemFilter(o)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  origemFilter === o
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {o === 'todos' ? 'Todos' : o === 'web' ? '🌐 Web' : '🔴 iFood'}
              </button>
            ))}
          </div>

          {/* Status Chips Bar */}
          <div className="hidden xl:flex items-center gap-1 overflow-x-auto">
            {statusFilterPills.map((f) => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-all whitespace-nowrap ${
                  statusFilter === f.key
                    ? 'bg-purple-600 text-white border-purple-400 shadow'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {f.label} ({countByStatus(f.key)})
              </button>
            ))}
          </div>
        </div>

        {/* Chaves de Operação Logística Avançada */}
        <div className="flex items-center gap-2 shrink-0">
          <div className={`px-2.5 py-1 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${
            peakInfo.isPeak ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-slate-950 text-slate-400 border-slate-800'
          }`}>
            <Flame className={`w-3.5 h-3.5 ${peakInfo.isPeak ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`} />
            <span className="hidden sm:inline">{peakInfo.label}</span>
          </div>

          <button
            onClick={() => setIsWebhookModalOpen(true)}
            className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs transition-all flex items-center gap-1 shadow hover:scale-102"
          >
            <Zap className="w-3.5 h-3.5 fill-slate-950" />
            <span className="hidden md:inline">⚡ Webhook</span>
          </button>

          <button
            onClick={() => setIsAutoPilotEnabled(!isAutoPilotEnabled)}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-extrabold transition-all flex items-center gap-1.5 shadow ${
              isAutoPilotEnabled
                ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">{isAutoPilotEnabled ? '🤖 Autônomo ON' : '🤖 Autônomo OFF'}</span>
          </button>
        </div>
      </div>

      {/* BANNER DE ALERTA CRÍTICO DE SLA */}
      {slaAlerts.length > 0 && (
        <div className="bg-gradient-to-r from-red-950 via-rose-950 to-red-900 border border-red-500 rounded-xl p-2.5 text-white shadow-xl animate-pulse flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-red-600 text-white shadow shrink-0">
              <ShieldAlert className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h4 className="font-extrabold text-xs text-red-100 flex items-center gap-2">
                🚨 ALERTA CRÍTICO DE FROTA: Risco de Atraso em {slaAlerts.length} Pedido(s)!
              </h4>
              <p className="text-[11px] text-red-200/90">
                Motoboys da casa ocupados. Recomendado alocar entregador iFood parceiro sob demanda.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              const targetAlert = slaAlerts[0];
              if (targetAlert) {
                handleConfirmAlocar(targetAlert.pedidoId, 'iFood Parceiro (Sob Demanda)');
              }
            }}
            className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs transition-all shadow whitespace-nowrap flex items-center gap-1.5 border border-red-400"
          >
            <Zap className="w-3.5 h-3.5 fill-white" />
            <span>⚡ Chamar Entregador iFood (R$ 8,90)</span>
          </button>
        </div>
      )}

      {/* 2. ÁREA DE TRABALHO ASSIMÉTRICA: CANVAS DO MAPA + CONSOLE LATERAL */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 h-full overflow-hidden">
        
        {/* ==================== CANVAS DO MAPA CENTRAL (7 COLUNAS EM TELAS LARGAS) ==================== */}
        <div className="lg:col-span-7 xl:col-span-8 h-full relative border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl bg-slate-950 flex flex-col">
          
          {/* Overlay Flutuante do Mapa (Top Left HUD Overlay) */}
          <div className="absolute top-3 left-3 z-[400] flex items-center gap-2 pointer-events-auto">
            <div className="bg-slate-900/90 backdrop-blur border border-slate-800 px-3 py-1.5 rounded-xl text-[11px] font-bold text-slate-200 shadow-xl flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>GPS Matriz Ativo</span>
            </div>

            <div className="bg-slate-900/90 backdrop-blur border border-slate-800 px-3 py-1.5 rounded-xl text-[11px] font-mono text-slate-300 shadow-xl hidden sm:flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-sky-400" />
              <span>Frota Livre: <strong className="text-emerald-400">{driversDisponiveis.length}</strong>/{drivers.length}</span>
            </div>
          </div>

          {/* Overlay Flutuante do Mapa (Top Right Controls Overlay) */}
          <div className="absolute top-3 right-3 z-[400] flex items-center gap-1.5 pointer-events-auto">
            <button
              onClick={() => setShowSingleRoute(!showSingleRoute)}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all backdrop-blur flex items-center gap-1 shadow ${
                showSingleRoute
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/50'
                  : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              {showSingleRoute ? <Eye className="w-3.5 h-3.5 text-sky-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
              <span className="hidden sm:inline">Exibir Linha</span>
            </button>

            <button
              onClick={() => setShowEtaBadge(!showEtaBadge)}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all backdrop-blur flex items-center gap-1 shadow ${
                showEtaBadge
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <span>🛵 Tempo</span>
            </button>
          </div>

          {/* Componente Mapa Leaflet */}
          <div className="flex-1 w-full h-full relative">
            <InteractiveMap
              loja={loja}
              pedidos={pedidos}
              selectedPedido={selectedPedido}
              selectedStatusFilter={statusFilter}
              batchPedidos={orderedBatch}
              includeReturnLeg={includeReturnLeg}
              onBatchMetricsChange={(metrics) => setBatchMetrics(metrics)}
              animatingCoords={animatingCoords}
              isSimulating={isSimulating}
              onSimulationEnd={() => setIsSimulating(false)}
              showEtaBadgeExternal={showEtaBadge}
              showSingleRouteExternal={showSingleRoute}
              showBatchRouteExternal={showBatchRoute}
              onSelectPedido={(p) => {
                setSelectedPedido(p);
                setShowSingleRoute(true);
              }}
              onUpdateStatus={handleUpdateStatus}
              onOpenAlocar={(p) => setAlocarModalPedido(p)}
              onOpenDetails={(p) => setDetalhesModalPedido(p)}
            />
          </div>
        </div>

        {/* ==================== CONSOLE LATERAL DE OPERAÇÕES (5 COLUNAS EM TELAS LARGAS) ==================== */}
        <div className="lg:col-span-5 xl:col-span-4 h-full flex flex-col bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-3 shadow-2xl overflow-hidden gap-3">
          
          {/* Abas Alternadoras do Console Lateral */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
            <button
              onClick={() => setActiveConsoleTab('pedidos')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                activeConsoleTab === 'pedidos'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <PackageCheck className="w-4 h-4" />
              <span>📦 Fila & Roteirizador ({filteredPedidos.length})</span>
            </button>

            <button
              onClick={() => setActiveConsoleTab('frota')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                activeConsoleTab === 'frota'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bike className="w-4 h-4" />
              <span>🛵 Frota da Casa ({drivers.length})</span>
            </button>
          </div>

          {/* CONTEÚDO DA ABA 1: FILA DE PEDIDOS & ROTEIRIZADOR DE LOTE */}
          {activeConsoleTab === 'pedidos' && (
            <div className="flex-1 flex flex-col overflow-hidden space-y-3">
              
              {/* Botões de Ação Rápida de Expedição */}
              <div className="grid grid-cols-2 gap-2 shrink-0">
                <button
                  onClick={() => setIsNewOrderModalOpen(true)}
                  className="py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 hover:scale-102"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Novo Pedido</span>
                </button>

                <button
                  onClick={handleAutoGroup}
                  disabled={isAiLoading}
                  className="py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 hover:scale-102 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 fill-amber-300" />
                  <span>{isAiLoading ? '🤖 DeepSeek Analisando...' : '🤖 Roteirizar com IA (DeepSeek)'}</span>
                </button>
              </div>

              {/* Banner de Raciocínio da IA DeepSeek */}
              {aiReasoning && (
                <div className="bg-purple-950/40 border border-purple-500/50 rounded-xl p-2.5 text-xs text-purple-200 shrink-0 animate-in fade-in space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-purple-300 text-[11px]">
                    <Sparkles className="w-3.5 h-3.5 fill-purple-400 text-purple-400" />
                    <span>Decisão Inteligente DeepSeek AI:</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-300">{aiReasoning}</p>
                </div>
              )}

              {/* Barra de Seleção Rápida em Lote no Horário de Pico */}
              <div className="flex items-center justify-between bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800 text-[11px] shrink-0">

                <button
                  onClick={() => {
                    const prontosIds = pedidos.filter(p => p.status === 'pronto').map(p => p.id);
                    if (prontosIds.length > 0) {
                      setIsBatchMode(true);
                      setSelectedBatchIds(prontosIds);
                      const prontos = pedidos.filter(p => prontosIds.includes(p.id));
                      setOrderedBatch(prontos);
                    } else {
                      alert('Nenhum pedido com status "Pronto" no momento.');
                    }
                  }}
                  className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-lg font-bold transition flex items-center gap-1"
                >
                  <Zap className="w-3.5 h-3.5 fill-amber-400" />
                  <span>⚡ Selecionar Todos Prontos</span>
                </button>

                <span className="text-slate-400 font-mono text-[10px]">
                  {pedidos.filter(p => p.status === 'pronto').length} pronto(s)
                </span>
              </div>

              {/* Banner de Métricas do Lote (Se Batch Mode Ativo) */}
              {isBatchMode && orderedBatch.length > 0 && (
                <div className="bg-amber-950/30 border border-amber-500/40 rounded-xl p-2.5 space-y-2 shrink-0 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-400">
                    <span className="flex items-center gap-1">🏆 Lote Otimizado ({orderedBatch.length} Entregas)</span>
                    <button
                      onClick={() => {
                        setIsBatchMode(false);
                        setSelectedBatchIds([]);
                        setOrderedBatch([]);
                      }}
                      className="text-[10px] text-slate-400 hover:text-white underline font-mono"
                    >
                      Limpar Lote
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 text-center text-xs font-mono">
                    <div className="bg-slate-950 p-1.5 rounded-lg border border-amber-500/30">
                      <span className="text-[9px] text-slate-400 block font-sans">⏱️ Circuito</span>
                      <strong className="text-amber-400">{batchMetrics?.totalMin || 24} min</strong>
                    </div>

                    <div className="bg-slate-950 p-1.5 rounded-lg border border-amber-500/30">
                      <span className="text-[9px] text-slate-400 block font-sans">🕒 Retorno Loja</span>
                      <strong className="text-emerald-400">{getDriverReturnTimeString(batchMetrics?.totalMin || 24)}</strong>
                    </div>

                    <div className="bg-slate-950 p-1.5 rounded-lg border border-amber-500/30">
                      <span className="text-[9px] text-slate-400 block font-sans">📏 Distância</span>
                      <strong className="text-sky-400">{batchMetrics?.totalKm || 5.8} km</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Lista Rolável de Cards Enriquecidos de Pedidos */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {filteredPedidos.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs text-center py-8">
                    <p>Seus pedidos vão aparecer aqui.</p>
                  </div>
                ) : (
                  filteredPedidos.map((p) => {
                    const batchIndex = orderedBatch.findIndex((bp) => bp.id === p.id);
                    const isChecked = batchIndex >= 0;
                    const isSelected = selectedPedido?.id === p.id;
                    const etaInfo = getDeliveryETAInfo(p.created_at, p.latitude, p.longitude);

                    const motoboyNome = p.entregador_nome
                      ? p.entregador_nome
                      : p.status === 'alocado' || p.status === 'em_rota'
                      ? 'Anderson (Alocado)'
                      : null;

                    const waUrl = p.telefone_cliente
                      ? `https://wa.me/55${p.telefone_cliente.replace(/\D/g, '')}?text=${encodeURIComponent(
                          `Olá ${p.nome_cliente}! 🛵 Acompanhe seu pedido #${p.id_externo} em tempo real: http://localhost:3000/rastreio/${p.id} ${p.codigo_confirmacao ? `(PIN: ${p.codigo_confirmacao})` : ''}`
                        )}`
                      : null;

                    return (
                      <div
                        key={p.id}
                        className={`w-full p-3 rounded-xl border text-xs transition-all space-y-2.5 ${
                          isChecked
                            ? 'bg-amber-500/20 border-amber-500/80 text-slate-100 shadow ring-1 ring-amber-500/50'
                            : !isBatchMode && isSelected
                            ? 'bg-purple-600/20 border-purple-500/60 text-slate-100 shadow'
                            : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-amber-500/50 hover:bg-slate-900/80'
                        }`}
                      >
                        {/* Linha Superior: Nome do Cliente + ID + Origem + PIN */}
                        <div
                          onClick={() => {
                            if (isBatchMode) {
                              toggleBatchSelect(p.id);
                            } else {
                              setSelectedPedido(p);
                              setShowSingleRoute(true);
                            }
                          }}
                          className="flex items-center justify-between gap-2 cursor-pointer"
                        >
                          <div className="flex items-center gap-2 truncate pr-1">
                            {isBatchMode && (
                              <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black shrink-0 transition-colors ${
                                isChecked ? 'bg-amber-500 text-slate-950 font-black' : 'border border-slate-700 bg-slate-950 text-transparent'
                              }`}>
                                {isChecked ? `#${batchIndex + 1}` : ''}
                              </div>
                            )}

                            <div className="truncate">
                              <strong className="block text-slate-100 truncate font-extrabold text-xs">
                                {p.nome_cliente}
                              </strong>
                              <span className="text-[10px] text-slate-400 font-mono">
                                #{p.id_externo} • <span className="uppercase text-amber-400 font-bold">{p.status}</span>
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {p.codigo_confirmacao && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-[10px] font-mono font-bold text-amber-300">
                                PIN:{p.codigo_confirmacao}
                              </span>
                            )}
                            <OriginBadge origem={p.origem} />
                          </div>
                        </div>

                        {/* Linha Central: Previsão de Horário & Status SLA do Prazo */}
                        <div className="flex items-center justify-between text-[11px] font-mono bg-slate-900/90 px-2.5 py-1.5 rounded-lg border border-slate-800/80">
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>Entrega: <strong className="text-amber-400">{etaInfo.timeStr}</strong> <span className="text-slate-500">({etaInfo.remainMin > 0 ? `${etaInfo.remainMin}m` : 'Esgotado'})</span></span>
                          </div>

                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${etaInfo.slaBadgeClass}`}>
                            {etaInfo.slaLabel}
                          </span>
                        </div>

                        {/* Linha de Informações do Motoboy & Distância */}
                        <div className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5 truncate pr-2">
                            <Bike className={`w-3.5 h-3.5 shrink-0 ${motoboyNome ? 'text-purple-400 animate-pulse' : 'text-slate-600'}`} />
                            <span className="text-slate-400 font-medium">Motoboy:</span>
                            <strong className={`truncate font-bold ${motoboyNome ? 'text-purple-300' : 'text-slate-500 font-normal'}`}>
                              {motoboyNome || 'Pendente'}
                            </strong>
                          </div>

                          <span className="text-sky-400 font-mono text-[10px] font-bold shrink-0">
                            {etaInfo.distKm.toFixed(1)} km
                          </span>
                        </div>

                        {/* BARRA DE AÇÕES RÁPIDAS DE 1-CLIQUE PARA O HORÁRIO DE PICO */}
                        <div className="pt-2 border-t border-slate-800/80 grid grid-cols-4 gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setAlocarModalPedido(p);
                            }}
                            className="py-1 px-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition"
                            title="Alocar Motoboy"
                          >
                            <Bike className="w-3 h-3" />
                            <span>Alocar</span>
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpedicaoPedido(p);
                            }}
                            className="py-1 px-1.5 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition"
                            title="Imprimir Comprovante Térmico"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Térmica</span>
                          </button>

                          {waUrl ? (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="py-1 px-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition"
                              title="Enviar WhatsApp com Rastreio"
                            >
                              <span>📲 Zap</span>
                            </a>
                          ) : (
                            <button
                              disabled
                              className="py-1 px-1.5 bg-slate-900 text-slate-600 border border-slate-800 rounded-lg text-[10px] font-bold opacity-50 cursor-not-allowed"
                            >
                              📲 Zap
                            </button>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPedido(p);
                              setShowSingleRoute(true);
                              if (p.latitude && p.longitude) {
                                setAnimatingCoords({ lat: p.latitude, lng: p.longitude });
                              }
                            }}
                            className="py-1 px-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition"
                            title="Focar local no mapa"
                          >
                            <MapPin className="w-3 h-3 text-rose-400" />
                            <span>Mapa</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

            </div>
          )}

          {/* CONTEÚDO DA ABA 2: CENTRAL DA FROTA DE ENTREGADORES */}
          {activeConsoleTab === 'frota' && (
            <div className="flex-1 flex flex-col overflow-hidden space-y-3">
              
              {/* Botões de Ação na Frota */}
              <div className="grid grid-cols-2 gap-2 shrink-0">
                <button
                  onClick={() => setIsCadastroMotoboyOpen(true)}
                  className="py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ Convidar Entregador</span>
                </button>

                <button
                  onClick={() => {
                    if (pedidos.length > 0) {
                      handleConfirmAlocar(pedidos[0].id, 'iFood Parceiro (Ocorrência)');
                    } else {
                      alert('Nenhum pedido ativo no momento.');
                    }
                  }}
                  className="py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Criar Ocorrência</span>
                </button>
              </div>

              {/* Seletor de Máximo de Entregas por Corrida */}
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between shrink-0 text-xs">
                <span className="text-slate-300 font-semibold">Máx. entregas por corrida:</span>
                <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-lg border border-slate-800">
                  <button
                    onClick={() => setMaxDeliveriesPerRun(Math.max(1, maxDeliveriesPerRun - 1))}
                    className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center"
                  >
                    -
                  </button>
                  <span className="font-mono font-extrabold text-amber-400 text-xs px-1">{maxDeliveriesPerRun}</span>
                  <button
                    onClick={() => setMaxDeliveriesPerRun(Math.min(10, maxDeliveriesPerRun + 1))}
                    className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Cards de Entregadores Cadastrados */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {drivers.map((d) => {
                  const isAvailable = d.status === 'disponivel';
                  const isEmRota = d.status === 'em_rota';

                  return (
                    <div
                      key={d.id}
                      className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                            isAvailable ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                            isEmRota ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-slate-800 text-slate-400'
                          }`}>
                            <Bike className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <strong className="block text-slate-100 font-bold">{d.nome}</strong>
                            <span className="text-[10px] text-slate-500 font-mono">{d.placa_veiculo || 'SEM PLACA'}</span>
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isAvailable ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                          isEmRota ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {isAvailable ? 'Disponível' : isEmRota ? 'Em Rota' : 'Em Pausa'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono pt-0.5">
                        <span>Entregas hoje: <strong className="text-slate-200">{d.total_entregas || 0}</strong></span>
                        <span>Acumulado: <strong className="text-emerald-400">R$ {(d.frete_acumulado || 0).toFixed(2)}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}

        </div>

      </div>

      {/* 3. DOCK FLUTUANTE DE AÇÃO RÁPIDA (SLIDING DOCK FOOTER) */}
      {selectedPedido && (
        <div className="bg-slate-900/95 border border-slate-800/90 rounded-2xl p-3 shadow-2xl backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-3 shrink-0 animate-in slide-in-from-bottom duration-300">
          
          <div className="flex items-center gap-3 truncate">
            <div className="p-2 rounded-xl bg-purple-600/20 text-purple-300 border border-purple-500/30 shrink-0">
              <Navigation className="w-5 h-5" />
            </div>
            <div className="truncate">
              <h4 className="text-xs font-extrabold text-white flex items-center gap-2 truncate">
                <span>{selectedPedido.nome_cliente}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-sky-400 border border-sky-500/30">
                  {selectedPedido.id_externo}
                </span>
              </h4>
              <p className="text-[11px] text-slate-400 truncate font-mono">
                {selectedPedido.endereco_entrega}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full md:w-auto overflow-x-auto">
            {/* Pill de Métricas */}
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono">
              <span className="text-sky-400 font-bold">{distanciaKm.toFixed(1)} km</span>
              <span className="text-slate-600">•</span>
              <span className="text-amber-400 font-bold">{tempoEstimadoMin} min</span>
              <span className="text-slate-600">•</span>
              <span className="text-emerald-400 font-bold">R$ {valorFreteEst}</span>
            </div>

            <button
              disabled={isSimulating}
              onClick={handleStartSimulation}
              className="py-1.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
              <span>{isSimulating ? 'Percorrendo...' : 'Simular Rota'}</span>
            </button>

            <button
              onClick={() => setAlocarModalPedido(selectedPedido)}
              className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow whitespace-nowrap flex items-center gap-1"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Alocar Entregador</span>
            </button>

            <button
              onClick={() => setExpedicaoPedido(selectedPedido)}
              className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 font-bold text-xs transition-all flex items-center gap-1 whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Guia Térmica</span>
            </button>

            <button
              onClick={async () => {
                if (window.confirm(`Deseja realmente excluir o pedido ${selectedPedido.id_externo} de ${selectedPedido.nome_cliente}?`)) {
                  await handleDeletePedido(selectedPedido.id);
                }
              }}
              className="py-1.5 px-3 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 font-bold text-xs transition-all flex items-center gap-1 whitespace-nowrap"
              title="Excluir Pedido Selecionado"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir</span>
            </button>
          </div>

        </div>
      )}

      {/* MODAIS DO SISTEMA */}
      <AlocarMotoboyModal
        pedido={alocarModalPedido}
        isOpen={Boolean(alocarModalPedido)}
        onClose={() => setAlocarModalPedido(null)}
        onConfirmAlocar={handleConfirmAlocar}
      />

      <PedidoDetalhesModal
        pedido={detalhesModalPedido}
        isOpen={Boolean(detalhesModalPedido)}
        onClose={() => setDetalhesModalPedido(null)}
        onUpdateStatus={handleUpdateStatus}
        onOpenAlocar={(p) => setAlocarModalPedido(p)}
        onDeletePedido={handleDeletePedido}
      />

      <StoreFormModal
        isOpen={isStoreModalOpen}
        lojaAtual={loja}
        onClose={() => setIsStoreModalOpen(false)}
        onSave={handleSaveLoja}
      />

      <WebhookSimulatorModal
        isOpen={isWebhookModalOpen}
        onClose={() => setIsWebhookModalOpen(false)}
        onOrderInjected={(newOrder) => {
          setPedidos((prev) => [newOrder, ...prev]);
          setSelectedPedido(newOrder);
          setShowSingleRoute(true);
        }}
      />

      <PedidoExpedicaoModal
        pedido={expedicaoPedido}
        loja={loja}
        isOpen={Boolean(expedicaoPedido)}
        onClose={() => setExpedicaoPedido(null)}
        stopSequence={
          expedicaoPedido && orderedBatch.some((p) => p.id === expedicaoPedido.id)
            ? orderedBatch.findIndex((p) => p.id === expedicaoPedido.id) + 1
            : undefined
        }
      />

      <CadastroMotoboyModal
        isOpen={isCadastroMotoboyOpen}
        onClose={() => setIsCadastroMotoboyOpen(false)}
        onDriverRegistered={(newDriver) => {
          setDrivers((prev) => [newDriver, ...prev]);
          alert(`✅ Motoboy ${newDriver.nome} cadastrado com sucesso!`);
        }}
      />

      <NewOrderModal
        isOpen={isNewOrderModalOpen}
        onClose={() => setIsNewOrderModalOpen(false)}
        onCreated={() => {
          fetchPedidos();
        }}
      />
    </div>
  );
};
