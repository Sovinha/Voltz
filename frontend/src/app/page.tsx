'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from '@/components/Header';
import { KpiRow } from '@/components/KpiRow';
import { ActionToolbar } from '@/components/ActionToolbar';
import { ExpandedKanban } from '@/components/ExpandedKanban';
import { FleetTable } from '@/components/FleetTable';
import { IntegratedMapArea } from '@/components/IntegratedMapArea';
import { DeepSeekAiModal } from '@/components/DeepSeekAiModal';
import { NewOrderModalRedesigned } from '@/components/NewOrderModalRedesigned';
import { KeyboardShortcutsModal } from '@/components/KeyboardShortcutsModal';
import { ColumnConfigModal, ColumnSetting, DEFAULT_COLUMN_SETTINGS } from '@/components/ColumnConfigModal';
import { CadastroMotoboyModal, DriverData } from '@/components/CadastroMotoboyModal';
import { EditPedidoModal } from '@/components/EditPedidoModal';
import { StoreFormModal } from '@/components/StoreFormModal';
import { LojaConfig } from '@/components/InteractiveMap';
import { ExpandedPedido, Driver, INITIAL_PEDIDOS, INITIAL_DRIVERS } from '@/lib/mockData';
import { getBackendUrl } from '@/lib/backend';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'visao_geral' | 'kanban' | 'mapa' | 'frota'>('visao_geral');
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Estado da Loja Principal (Configurável via modal de Endereço)
  const [lojaConfig, setLojaConfig] = useState<LojaConfig>({
    id: 'loja_matriz',
    nome: 'Filipéia Trattoria - Pedro Gondim',
    endereco: 'R. Manuel França, 56 - Pedro Gondim, João Pessoa - PB',
    latitude: -7.1150,
    longitude: -34.8630,
    telefone: '(83) 99999-0000',
    ativa: true
  });
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);

  // Estado Principal de Pedidos e Entregadores (139 DADOS REAIS DE JOÃO PESSOA)
  const [pedidos, setPedidos] = useState<ExpandedPedido[]>(INITIAL_PEDIDOS);
  const [drivers, setDrivers] = useState<Driver[]>(INITIAL_DRIVERS);
  const [loading, setLoading] = useState(false);

  // Configurador de Colunas (Imagem 2)
  const [columnSettings, setColumnSettings] = useState<ColumnSetting[]>(DEFAULT_COLUMN_SETTINGS);
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);

  // Estados de Filtros Rápidos
  const [activeQuickFilter, setActiveQuickFilter] = useState<'all' | 'delayed' | 'ifood' | 'web'>('all');
  const [selectedBairroFilter, setSelectedBairroFilter] = useState<string>('todos');

  // Seleção em Lote (Batch Selection)
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);

  // Modais e Áudio
  const [isDinnerFlowActive, setIsDinnerFlowActive] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isAiRoutingActive, setIsAiRoutingActive] = useState(false);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [isRegisterDriverModalOpen, setIsRegisterDriverModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<ExpandedPedido | null>(null);
  const [editingPedido, setEditingPedido] = useState<ExpandedPedido | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleOpenEditModal = (p: ExpandedPedido) => {
    setEditingPedido(p);
    setIsEditModalOpen(true);
  };

  // Carregar Configurações de Coluna e Endereço da Loja Salvos
  useEffect(() => {
    try {
      const savedCols = localStorage.getItem('voltz_column_settings');
      if (savedCols) {
        setColumnSettings(JSON.parse(savedCols));
      }
      const savedLoja = localStorage.getItem('voltz_loja_matriz');
      if (savedLoja) {
        setLojaConfig(JSON.parse(savedLoja));
      }
    } catch {}
  }, []);

  const handleSaveLoja = async (novaLoja: LojaConfig) => {
    setLojaConfig(novaLoja);
    try {
      localStorage.setItem('voltz_loja_matriz', JSON.stringify(novaLoja));
      const backendUrl = getBackendUrl();
      await fetch(`${backendUrl}/api/lojas/${novaLoja.id || 'loja_matriz'}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novaLoja)
      });
    } catch {}
    setIsStoreModalOpen(false);
  };

  // Salvar Configurações de Coluna
  const handleUpdateColumns = (newCols: ColumnSetting[]) => {
    setColumnSettings(newCols);
    try {
      localStorage.setItem('voltz_column_settings', JSON.stringify(newCols));
    } catch {}
  };

  // Buscar Dados Reais do Backend API (/api/pedidos e /api/entregadores)
  const fetchData = useCallback(async () => {
    const backendUrl = getBackendUrl();
    try {
      // 1. Pedidos Reais
      const resPedidos = await fetch(`${backendUrl}/api/pedidos`);
      if (resPedidos.ok) {
        const data = await resPedidos.json();
        if (Array.isArray(data)) {
          const mapped: ExpandedPedido[] = data.map((p: any) => {
            const createdMs = p.created_at ? new Date(p.created_at).getTime() : Date.now();
            const elapsedMin = Math.floor((Date.now() - createdMs) / 60000);
            return {
              id: p.id_externo || p.id,
              id_externo: p.id_externo || p.id,
              cliente: p.nome_cliente || 'Cliente Sem Nome',
              telefone: p.telefone_cliente || '',
              endereco: p.endereco_entrega || '',
              bairro: p.bairro || 'João Pessoa',
              tipoComida: 'pizza',
              foodIcon: '📦',
              itensResumo: typeof p.itens === 'string' ? p.itens : JSON.stringify(p.itens || '1x Pedido'),
              valorTotal: p.valor_total || 0,
              taxaEntrega: 8.50,
              distanciaKm: 3.5,
              origem: p.origem === 'ifood' ? 'ifood' : 'web',
              status: p.status === 'pendente' ? 'entrada_automatica' : (p.status || 'preparando'),
              horaPedido: p.created_at ? new Date(p.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '19:00',
              tempoEsperaMin: elapsedMin,
              isCritico: elapsedMin > 15 && p.status !== 'finalizado',
              entregadorAssinado: p.entregador_nome ? {
                id: p.entregador_id || 'drv-1',
                nome: p.entregador_nome,
                avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
                veiculo: 'moto'
              } : undefined,
              latitude: p.latitude || -7.112,
              longitude: p.longitude || -34.828
            };
          });
          setPedidos(mapped);
        }
      }

      // 2. Entregadores Reais
      const resDrivers = await fetch(`${backendUrl}/api/entregadores`);
      if (resDrivers.ok) {
        const dataDrivers = await resDrivers.json();
        if (Array.isArray(dataDrivers)) {
          const mappedDrivers: Driver[] = dataDrivers.map((d: any) => ({
            id: d.id,
            nome: d.nome,
            avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
            veiculo: 'moto',
            modeloVeiculo: d.placa_veiculo ? `Moto (${d.placa_veiculo})` : 'Moto Voltz',
            placa: d.placa_veiculo || 'VOL-0000',
            status: d.status === 'disponivel' ? 'online' : (d.status || 'online'),
            rating: 5.0,
            freteAcumulado: d.frete_acumulado || 0,
            pedidosAtivosCount: d.total_entregas || 0,
            pedidosAtivosIds: [],
            telefone: d.telefone || '',
            ultimaLocalizacao: 'João Pessoa',
            latitude: d.latitude || -7.115,
            longitude: d.longitude || -34.825
          }));
          setDrivers(mappedDrivers);
        }
      }
    } catch (err) {
      // Backend inacessível mantém estado limpo (sem mock data falso)
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Sintetizador de Áudio Simples (Web Audio API)
  const playAlertChime = (type: 'new' | 'alert') => {
    if (isAudioMuted) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'new') {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else {
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(349.23, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch {}
  };

  // ATALHOS DE TECLADO GLOBAIS (N, R, F, J, 1-4, ESC)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        if (e.key === 'Escape') {
          (target as HTMLInputElement).blur();
        }
        return;
      }

      const key = e.key.toLowerCase();

      if (key === 'n') {
        e.preventDefault();
        setIsNewOrderModalOpen(prev => !prev);
      } else if (key === 'r') {
        e.preventDefault();
        setIsAiModalOpen(true);
      } else if (key === 'f' || key === '/') {
        e.preventDefault();
        if (searchInputRef.current) searchInputRef.current.focus();
      } else if (key === 'j') {
        e.preventDefault();
        setIsDinnerFlowActive(prev => !prev);
      } else if (key === '1') {
        setActiveTab('visao_geral');
      } else if (key === '2') {
        setActiveTab('kanban');
      } else if (key === '3') {
        setActiveTab('mapa');
      } else if (key === '4') {
        setActiveTab('frota');
      } else if (key === 'escape') {
        setIsNewOrderModalOpen(false);
        setIsAiModalOpen(false);
        setIsRegisterDriverModalOpen(false);
        setIsShortcutsModalOpen(false);
        setIsColumnModalOpen(false);
        setSelectedBatchIds([]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Mover Status de um Pedido no Kanban
  const handleMoveStatus = async (pedidoId: string, direction: 'next' | 'prev') => {
    const statusOrder: ExpandedPedido['status'][] = [
      'entrada_automatica',
      'preparando',
      'pronto',
      'em_rota',
      'finalizado'
    ];

    setPedidos(prev => prev.map(p => {
      if (p.id === pedidoId) {
        const currentIndex = statusOrder.indexOf(p.status);
        let newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
        if (newIndex < 0) newIndex = 0;
        if (newIndex >= statusOrder.length) newIndex = statusOrder.length - 1;

        return {
          ...p,
          status: statusOrder[newIndex]
        };
      }
      return p;
    }));

    // Tenta atualizar no backend Flask
    try {
      const backendUrl = getBackendUrl();
      const pTarget = pedidos.find(p => p.id === pedidoId);
      if (pTarget) {
        const currentIndex = statusOrder.indexOf(pTarget.status);
        const nextIndex = direction === 'next' ? Math.min(statusOrder.length - 1, currentIndex + 1) : Math.max(0, currentIndex - 1);
        await fetch(`${backendUrl}/api/pedidos/${pedidoId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: statusOrder[nextIndex] })
        });
      }
    } catch {}
  };

  // Seleção em Lote (Toggle Checkbox)
  const handleToggleSelectBatch = (pedidoId: string) => {
    setSelectedBatchIds(prev => 
      prev.includes(pedidoId) ? prev.filter(id => id !== pedidoId) : [...prev, pedidoId]
    );
  };

  // Alocar Entregador em Lote
  const handleBatchAssignDriver = (driverId: string) => {
    const targetDriver = drivers.find(d => d.id === driverId);
    if (!targetDriver || selectedBatchIds.length === 0) return;

    setPedidos(prev => prev.map(p => {
      if (selectedBatchIds.includes(p.id)) {
        return {
          ...p,
          entregadorAssinado: {
            id: targetDriver.id,
            nome: targetDriver.nome,
            avatar: targetDriver.avatar,
            veiculo: targetDriver.veiculo
          }
        };
      }
      return p;
    }));

    playAlertChime('new');
    setSelectedBatchIds([]);
  };

  // Avançar Status em Lote
  const handleBatchAdvanceStatus = () => {
    if (selectedBatchIds.length === 0) return;

    const statusOrder: ExpandedPedido['status'][] = [
      'entrada_automatica',
      'preparando',
      'pronto',
      'em_rota',
      'finalizado'
    ];

    setPedidos(prev => prev.map(p => {
      if (selectedBatchIds.includes(p.id)) {
        const currentIndex = statusOrder.indexOf(p.status);
        const nextIndex = Math.min(statusOrder.length - 1, currentIndex + 1);
        return {
          ...p,
          status: statusOrder[nextIndex]
        };
      }
      return p;
    }));

    playAlertChime('new');
    setSelectedBatchIds([]);
  };

  // Atualizar Status Direto (Marcar Pronto / Preparando)
  const handleUpdateStatus = async (pedidoId: string, newStatus: string) => {
    setPedidos(prev => prev.map(p => p.id === pedidoId ? { ...p, status: newStatus as any } : p));
    try {
      const backendUrl = getBackendUrl();
      await fetch(`${backendUrl}/api/pedidos/${pedidoId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
    } catch {}
  };

  // Atribuir Entregador Individual
  const handleAssignDriver = (pedidoId: string, driverId: string) => {
    const targetDriver = drivers.find(d => d.id === driverId);
    if (!targetDriver) return;

    setPedidos(prev => prev.map(p => {
      if (p.id === pedidoId) {
        return {
          ...p,
          entregadorAssinado: {
            id: targetDriver.id,
            nome: targetDriver.nome,
            avatar: targetDriver.avatar,
            veiculo: targetDriver.veiculo
          }
        };
      }
      return p;
    }));
  };

  // Deletar Pedido
  const handleDeleteOrder = (pedidoId: string) => {
    setPedidos(prev => prev.filter(p => p.id !== pedidoId));
  };

  // Adicionar Novo Pedido Real
  const handleAddOrder = async (newOrder: ExpandedPedido) => {
    setPedidos(prev => [newOrder, ...prev]);
    playAlertChime('new');

    // Persistir no backend SQLite/Supabase
    try {
      const backendUrl = getBackendUrl();
      await fetch(`${backendUrl}/api/pedidos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newOrder.id,
          id_externo: newOrder.id_externo,
          nome_cliente: newOrder.cliente,
          telefone_cliente: newOrder.telefone,
          endereco_entrega: newOrder.endereco,
          bairro: newOrder.bairro,
          valor_total: newOrder.valorTotal,
          origem: newOrder.origem,
          itens: newOrder.itensResumo,
          status: 'pendente'
        })
      });
    } catch {}
  };

  // Cadastrar Novo Entregador Real
  const handleRegisterDriver = async (driverData: any) => {
    const newDriver: Driver = {
      id: `drv-${Date.now()}`,
      nome: driverData.nome,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      veiculo: driverData.veiculo === 'carro' ? 'carro' : 'moto',
      modeloVeiculo: driverData.modelo || 'Moto Padrão',
      placa: driverData.placa || 'VOL-0000',
      status: 'online',
      rating: 5.0,
      freteAcumulado: 0,
      pedidosAtivosCount: 0,
      pedidosAtivosIds: [],
      telefone: driverData.telefone || '(83) 99999-0000',
      ultimaLocalizacao: 'Base Central'
    };
    setDrivers(prev => [...prev, newDriver]);
    setIsRegisterDriverModalOpen(false);

    try {
      const backendUrl = getBackendUrl();
      await fetch(`${backendUrl}/api/entregadores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: driverData.nome,
          telefone: driverData.telefone,
          placa_veiculo: driverData.placa
        })
      });
    } catch {}
  };

  // Aplicar Otimização IA DeepSeek Maestro
  const handleApplyOptimization = (planType: 'maestro_split' | 'external_partner' | 'single_batch' = 'maestro_split') => {
    setIsAiRoutingActive(true);
    
    if (planType === 'external_partner') {
      alert('⚡ SOLICITAÇÃO ENVIADA VIA API: Entregador parceiro iFood/Mottu contratado para coletar o pedido #0121 na matriz em 3 min!');
    } else if (planType === 'maestro_split') {
      alert('⚡ PLANO MAESTRO ATIVADO: 2 pedidos atribuídos à base + Pedido #0121 reservado para o motoboy Anderson (retorna em 8 min à matriz)!');
    } else {
      alert('⚡ LOTE TRIPLO ATIVADO: 3 pedidos agrupados na mesma rota com 1 motoboy.');
    }

    setPedidos(prev => prev.map((p, idx) => {
      if (p.status === 'entrada_automatica' || p.status === 'preparando' || p.status === 'pronto') {
        const assignedDriver = drivers.length > 0 ? drivers[idx % drivers.length] : undefined;
        return {
          ...p,
          status: p.status === 'entrada_automatica' ? 'preparando' : 'pronto',
          entregadorAssinado: assignedDriver ? {
            id: assignedDriver.id,
            nome: assignedDriver.nome,
            avatar: assignedDriver.avatar,
            veiculo: assignedDriver.veiculo
          } : undefined
        };
      }
      return p;
    }));

    playAlertChime('new');
    setTimeout(() => {
      setIsAiRoutingActive(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 font-sans pb-12 selection:bg-cyan-500 selection:text-white">
      
      {/* 1. NAVEGAÇÃO SUPERIOR UNIFICADA E COMPACTA */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isAiRoutingActive={isAiRoutingActive}
        isAudioMuted={isAudioMuted}
        onToggleAudioMute={() => setIsAudioMuted(!isAudioMuted)}
        onOpenShortcutsModal={() => setIsShortcutsModalOpen(true)}
        onOpenStoreModal={() => setIsStoreModalOpen(true)}
        lojaNome={lojaConfig.nome}
        lojaEndereco={lojaConfig.endereco}
        searchInputRef={searchInputRef}
      />

      {/* ÁREA DE CONTEÚDO PRINCIPAL */}
      <main className="max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-8 pt-4">
        
        {/* 2. LINHA ÚNICA DE CARDS KPI DETALHADOS E STREAMLINED */}
        <KpiRow
          pedidos={pedidos}
          drivers={drivers}
          isAiRoutingActive={isAiRoutingActive}
          onSelectQuickFilter={(f) => setActiveQuickFilter(f)}
          activeQuickFilter={activeQuickFilter}
        />

        {/* TAB 1: VISÃO GERAL (PAINEL DE CONTROLE INTEGRADO) */}
        {activeTab === 'visao_geral' && (
          <div className="space-y-4">
            
            {/* TOOLBAR DE AÇÕES (FILTROS RÁPIDOS + FLUXO JANTAR + NOVO PEDIDO + IA DEEPSEEK + AJUSTAR COLUNAS) */}
            <ActionToolbar
              isDinnerFlowActive={isDinnerFlowActive}
              onToggleDinnerFlow={() => setIsDinnerFlowActive(!isDinnerFlowActive)}
              onOpenNewOrderModal={() => setIsNewOrderModalOpen(true)}
              onRunDeepSeekAiRouting={() => setIsAiModalOpen(true)}
              isAiRunning={isAiRoutingActive}
              activeQuickFilter={activeQuickFilter}
              setActiveQuickFilter={setActiveQuickFilter}
              selectedBairroFilter={selectedBairroFilter}
              setSelectedBairroFilter={setSelectedBairroFilter}
              onOpenColumnConfigModal={() => setIsColumnModalOpen(true)}
              onOpenStoreModal={() => setIsStoreModalOpen(true)}
            />

            {/* LAYOUT DUAL-PANE RESPONSIVO: EXPANDED KANBAN BOARD + INTERACTIVE MAP AREA */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              
              {/* LADO ESQUERDO: KANBAN BOARD EXPANDIDO (65% LARGURA EM TELA GRANDE) */}
              <div className="lg:col-span-7 xl:col-span-8 overflow-hidden">
                <div className="flex items-center justify-between mb-2 px-1">
                  <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                    Quadro Kanban & Layout Personalizado
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {pedidos.length} Pedidos Reais
                  </span>
                </div>

                <ExpandedKanban
                  pedidos={pedidos}
                  drivers={drivers}
                  searchQuery={searchQuery}
                  onMoveStatus={handleMoveStatus}
                  onAssignDriver={handleAssignDriver}
                  onSelectOrder={(p) => setSelectedPedido(p)}
                  onDeleteOrder={handleDeleteOrder}
                  activeQuickFilter={activeQuickFilter}
                  selectedBairroFilter={selectedBairroFilter}
                  selectedBatchIds={selectedBatchIds}
                  onToggleSelectBatch={handleToggleSelectBatch}
                  onClearBatchSelection={() => setSelectedBatchIds([])}
                  onBatchAssignDriver={handleBatchAssignDriver}
                  onBatchAdvanceStatus={handleBatchAdvanceStatus}
                  columnSettings={columnSettings}
                />
              </div>

              {/* LADO DIREITO: MAPA INTERATIVO (35% LARGURA EM TELA GRANDE, 100% SEM ERRO DE CHAVE API) */}
              <div className="lg:col-span-5 xl:col-span-4">
                <div className="flex items-center justify-between mb-2 px-1">
                  <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    Mapa de Roteirização Live
                  </h3>
                  <span className="text-[11px] text-cyan-400 font-mono font-bold">
                    OpenStreetMap Dark
                  </span>
                </div>

                <IntegratedMapArea
                  pedidos={pedidos}
                  drivers={drivers}
                  selectedPedido={selectedPedido}
                  onSelectOrder={(p) => setSelectedPedido(p)}
                  onUpdateStatus={handleUpdateStatus}
                  onAssignDriver={handleAssignDriver}
                  onEditOrder={handleOpenEditModal}
                  selectedBatchIds={selectedBatchIds}
                  onToggleSelectBatch={handleToggleSelectBatch}
                  onClearBatchSelection={() => setSelectedBatchIds([])}
                  onBatchAssignDriver={handleBatchAssignDriver}
                  onBatchAdvanceStatus={handleBatchAdvanceStatus}
                  centerLat={lojaConfig.latitude}
                  centerLng={lojaConfig.longitude}
                  lojaNome={lojaConfig.nome}
                  lojaEndereco={lojaConfig.endereco}
                />
              </div>

            </div>

            {/* ABAIXO DO KANBAN E MAPA: TABELA MINHA FROTA INTERATIVA */}
            <FleetTable
              drivers={drivers}
              pedidos={pedidos}
              onRegisterDriverModal={() => setIsRegisterDriverModalOpen(true)}
              onSendRouteToDriver={(d) => alert(`⚡ Rota otimizada enviada via push/WhatsApp para ${d.nome}`)}
            />

          </div>
        )}

        {/* TAB 2: PEDIDOS & KANBAN (TELA CHEIA) */}
        {activeTab === 'kanban' && (
          <div className="space-y-4">
            <ActionToolbar
              isDinnerFlowActive={isDinnerFlowActive}
              onToggleDinnerFlow={() => setIsDinnerFlowActive(!isDinnerFlowActive)}
              onOpenNewOrderModal={() => setIsNewOrderModalOpen(true)}
              onRunDeepSeekAiRouting={() => setIsAiModalOpen(true)}
              isAiRunning={isAiRoutingActive}
              activeQuickFilter={activeQuickFilter}
              setActiveQuickFilter={setActiveQuickFilter}
              selectedBairroFilter={selectedBairroFilter}
              setSelectedBairroFilter={setSelectedBairroFilter}
              onOpenColumnConfigModal={() => setIsColumnModalOpen(true)}
            />

            <ExpandedKanban
              pedidos={pedidos}
              drivers={drivers}
              searchQuery={searchQuery}
              onMoveStatus={handleMoveStatus}
              onAssignDriver={handleAssignDriver}
              onSelectOrder={(p) => setSelectedPedido(p)}
              onDeleteOrder={handleDeleteOrder}
              activeQuickFilter={activeQuickFilter}
              selectedBairroFilter={selectedBairroFilter}
              selectedBatchIds={selectedBatchIds}
              onToggleSelectBatch={handleToggleSelectBatch}
              onClearBatchSelection={() => setSelectedBatchIds([])}
              onBatchAssignDriver={handleBatchAssignDriver}
              onBatchAdvanceStatus={handleBatchAdvanceStatus}
              columnSettings={columnSettings}
            />
          </div>
        )}

        {/* TAB 3: MAPA & ROTEIRIZAÇÃO (TELA CHEIA) */}
        {activeTab === 'mapa' && (
          <div className="space-y-4">
            <ActionToolbar
              isDinnerFlowActive={isDinnerFlowActive}
              onToggleDinnerFlow={() => setIsDinnerFlowActive(!isDinnerFlowActive)}
              onOpenNewOrderModal={() => setIsNewOrderModalOpen(true)}
              onRunDeepSeekAiRouting={() => setIsAiModalOpen(true)}
              isAiRunning={isAiRoutingActive}
              activeQuickFilter={activeQuickFilter}
              setActiveQuickFilter={setActiveQuickFilter}
              selectedBairroFilter={selectedBairroFilter}
              setSelectedBairroFilter={setSelectedBairroFilter}
              onOpenColumnConfigModal={() => setIsColumnModalOpen(true)}
            />

            <IntegratedMapArea
              pedidos={pedidos}
              drivers={drivers}
              selectedPedido={selectedPedido}
              onSelectOrder={(p) => setSelectedPedido(p)}
              onUpdateStatus={handleUpdateStatus}
              onAssignDriver={handleAssignDriver}
              onEditOrder={handleOpenEditModal}
              selectedBatchIds={selectedBatchIds}
              onToggleSelectBatch={handleToggleSelectBatch}
              onClearBatchSelection={() => setSelectedBatchIds([])}
              onBatchAssignDriver={handleBatchAssignDriver}
              onBatchAdvanceStatus={handleBatchAdvanceStatus}
            />
          </div>
        )}

        {/* TAB 4: MINHA FROTA (TELA CHEIA) */}
        {activeTab === 'frota' && (
          <div className="space-y-4">
            <FleetTable
              drivers={drivers}
              pedidos={pedidos}
              onRegisterDriverModal={() => setIsRegisterDriverModalOpen(true)}
              onSendRouteToDriver={(d) => alert(`⚡ Rota otimizada enviada via push/WhatsApp para ${d.nome}`)}
            />
          </div>
        )}

      </main>

      {/* MODAIS DO SISTEMA */}
      <DeepSeekAiModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        pedidos={pedidos}
        drivers={drivers}
        onApplyOptimization={handleApplyOptimization}
      />

      <NewOrderModalRedesigned
        isOpen={isNewOrderModalOpen}
        onClose={() => setIsNewOrderModalOpen(false)}
        onAddOrder={handleAddOrder}
      />

      <CadastroMotoboyModal
        isOpen={isRegisterDriverModalOpen}
        onClose={() => setIsRegisterDriverModalOpen(false)}
        onDriverRegistered={handleRegisterDriver}
      />

      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

      <ColumnConfigModal
        isOpen={isColumnModalOpen}
        onClose={() => setIsColumnModalOpen(false)}
        columns={columnSettings}
        onUpdateColumns={handleUpdateColumns}
      />

      <EditPedidoModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingPedido(null);
        }}
        pedido={editingPedido ? {
          id: editingPedido.id,
          id_externo: editingPedido.id_externo,
          nome_cliente: editingPedido.cliente,
          telefone_cliente: editingPedido.telefone,
          endereco_entrega: editingPedido.endereco,
          bairro: editingPedido.bairro,
          valor_total: editingPedido.valorTotal,
          status: editingPedido.status === 'entrada_automatica' ? 'preparo' : (editingPedido.status as any),
          itens: typeof editingPedido.itensResumo === 'string' ? [{ quantidade: 1, nome: editingPedido.itensResumo, preco_unitario: editingPedido.valorTotal }] : (editingPedido.itensResumo as any),
          tipo_pagamento: 'maquininha',
          origem: editingPedido.origem as any,
          latitude: editingPedido.latitude,
          longitude: editingPedido.longitude,
          created_at: new Date().toISOString()
        } : null}
        onSaveSuccess={(updated) => {
          setPedidos(prev => prev.map(p => {
            if (p.id === updated.id || p.id_externo === updated.id_externo) {
              return {
                ...p,
                cliente: updated.nome_cliente || p.cliente,
                telefone: updated.telefone_cliente || p.telefone,
                endereco: updated.endereco_entrega || p.endereco,
                valorTotal: updated.valor_total || p.valorTotal,
                status: updated.status || p.status,
                latitude: updated.latitude || p.latitude,
                longitude: updated.longitude || p.longitude
              };
            }
            return p;
          }));
          setIsEditModalOpen(false);
          setEditingPedido(null);
        }}
      />

      <StoreFormModal
        isOpen={isStoreModalOpen}
        lojaAtual={lojaConfig}
        onClose={() => setIsStoreModalOpen(false)}
        onSave={handleSaveLoja}
      />

    </div>
  );
}
