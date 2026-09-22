'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { 
  Settings, 
  DollarSign, 
  Users, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp, 
  Save, 
  CheckSquare, 
  Square, 
  Eye, 
  Navigation,
  Sliders,
  Trash2, 
  History, 
  Database,
  AlertTriangle
} from 'lucide-react';
import { getBackendUrl } from '@/lib/backend';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { LojaConfig } from './InteractiveMap';

// Interface para as Faixas de Taxa de Entrega
export interface TaxaFaixa {
  alcanceKm: number;
  valorTaxaCliente: number;
  taxaEntregador: number;
}

// Interface para as Configurações Globais do Sistema
export interface SystemSettings {
  taxas: TaxaFaixa[];
  raioFilaMetros: number;
  raioColetaMetros: number;
  raioEntregaMetros: number;
  retirarFilaDevolucao: boolean;
  tempoLimiteColetaMin: number;
  limitarDistanciaEntrega: boolean;
  adicionalColetaBike: boolean;
  valorAdicionalColeta: number;
  // Visibilidade de Dados para o Entregador
  mostrarEndereco: boolean;
  mostrarTaxaEntrega: boolean;
  mostrarValorPedido: boolean;
  mostrarDescricaoObs: boolean;
  mostrarFormaPagamento: boolean;
  mostrarTempoPedido: boolean;
  mostrarNomeCliente: boolean;
  mostrarTelefoneCliente: boolean;
  mostrarTempoRestanteColeta: boolean;
  mostrarPedidoNoMapa: boolean;
  coletaUmClique: boolean;
  janelaHistoricoDias: number;
}

const DEFAULT_SETTINGS: SystemSettings = {
  taxas: [
    { alcanceKm: 1, valorTaxaCliente: 6.5, taxaEntregador: 6.5 },
    { alcanceKm: 1.5, valorTaxaCliente: 7.0, taxaEntregador: 7.0 },
    { alcanceKm: 2, valorTaxaCliente: 7.5, taxaEntregador: 7.5 },
    { alcanceKm: 2.5, valorTaxaCliente: 8.0, taxaEntregador: 8.0 },
    { alcanceKm: 3, valorTaxaCliente: 8.5, taxaEntregador: 8.5 },
    { alcanceKm: 3.5, valorTaxaCliente: 9.0, taxaEntregador: 9.0 },
    { alcanceKm: 4, valorTaxaCliente: 10.0, taxaEntregador: 10.0 },
    { alcanceKm: 4.5, valorTaxaCliente: 10.5, taxaEntregador: 10.5 },
    { alcanceKm: 5, valorTaxaCliente: 11.0, taxaEntregador: 11.0 },
    { alcanceKm: 6, valorTaxaCliente: 12.0, taxaEntregador: 12.0 },
    { alcanceKm: 7, valorTaxaCliente: 13.0, taxaEntregador: 13.0 },
  ],
  raioFilaMetros: 150,
  raioColetaMetros: 100,
  raioEntregaMetros: 300,
  retirarFilaDevolucao: true,
  tempoLimiteColetaMin: 5,
  limitarDistanciaEntrega: true,
  adicionalColetaBike: false,
  valorAdicionalColeta: 0,
  mostrarEndereco: true,
  mostrarTaxaEntrega: false,
  mostrarValorPedido: false,
  mostrarDescricaoObs: true,
  mostrarFormaPagamento: true,
  mostrarTempoPedido: false,
  mostrarNomeCliente: true,
  mostrarTelefoneCliente: false,
  mostrarTempoRestanteColeta: true,
  mostrarPedidoNoMapa: true,
  coletaUmClique: true,
  janelaHistoricoDias: 30,
};

export const ConfigTab: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Estados de Sanfona / Accordion das seções
  const [openSectionTaxas, setOpenSectionTaxas] = useState(true);
  const [openSectionFila, setOpenSectionFila] = useState(true);
  const [openSectionEntregadores, setOpenSectionEntregadores] = useState(true);
  const [openSectionLimpeza, setOpenSectionLimpeza] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Dados da loja para desenhar o raio no mapa
  const [loja] = useState<LojaConfig>({
    nome: 'Filipéia Trattoria Express',
    endereco: 'R. Orestes Lisboa, 124 - Pedro Gondim, João Pessoa - PB',
    latitude: -7.1155,
    longitude: -34.8601,
  });

  useEffect(() => {
    const saved = localStorage.getItem('sistema_settings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch {}
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('sistema_settings', JSON.stringify(settings));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleResetDatabase = async () => {
    if (!window.confirm('⚠️ Tem certeza que deseja ZERAR todos os pedidos do sistema para começar do zero?')) return;
    setActionLoading(true);
    try {
      const backendUrl = getBackendUrl();
      await fetch(`${backendUrl}/api/pedidos/reset`, { method: 'POST' });
      if (isSupabaseConfigured) {
        await supabase.from('pedidos').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      }
    } catch {}
    try {
      localStorage.removeItem('local_simulated_pedidos');
    } catch {}
    setActionLoading(false);
    alert('✅ Banco de dados e pedidos zerados com sucesso!');
  };

  const handleCleanOldOrders = async () => {
    setActionLoading(true);
    let msg = 'Pedidos com mais de 24h removidos.';
    try {
      const backendUrl = getBackendUrl();
      const res = await fetch(`${backendUrl}/api/pedidos/limpar-antigos?horas=24`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        msg = data.mensagem || msg;
      }
    } catch {}
    setActionLoading(false);
    alert(`✅ ${msg}`);
  };

  const updateTaxaEntregador = (index: number, val: number) => {
    const newTaxas = [...settings.taxas];
    newTaxas[index].taxaEntregador = val;
    setSettings({ ...settings, taxas: newTaxas });
  };

  const updateTaxaCliente = (index: number, val: number) => {
    const newTaxas = [...settings.taxas];
    newTaxas[index].valorTaxaCliente = val;
    setSettings({ ...settings, taxas: newTaxas });
  };

  const toggleCheckbox = (field: keyof SystemSettings) => {
    setSettings({
      ...settings,
      [field]: !settings[field],
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Cabeçalho da Aba de Configurações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 backdrop-blur shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 font-bold shadow-lg shadow-amber-500/20">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              Configurações do Sistema & Regras da Fila
            </h2>
            <p className="text-xs text-slate-400">
              Taxas por km, raios de geofencing da loja e permissões de dados visíveis ao entregador
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-amber-500/20"
        >
          <Save className="w-4 h-4" />
          <span>{savedSuccess ? '✅ Salvo com Sucesso!' : 'Salvar Alterações'}</span>
        </button>
      </div>

      {/* SEÇÃO 1: Taxas de Entrega por Alcance (Km) (Identico a Imagem 1) */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl backdrop-blur">
        <button
          onClick={() => setOpenSectionTaxas(!openSectionTaxas)}
          className="w-full flex items-center justify-between p-4 bg-slate-950/60 border-b border-slate-800/80 hover:bg-slate-950 transition-colors"
        >
          <div className="flex items-center gap-2 font-bold text-sm text-slate-200">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span>Taxas de Entrega por Alcance (Km)</span>
          </div>
          {openSectionTaxas ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {openSectionTaxas && (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {settings.taxas.map((faixa, idx) => (
                <div key={idx} className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-400 border-b border-slate-800/60 pb-1">
                    <span>Alcance:</span>
                    <strong className="text-amber-400">{faixa.alcanceKm} km</strong>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Taxa Cliente (R$)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={faixa.valorTaxaCliente}
                        onChange={(e) => updateTaxaCliente(idx, parseFloat(e.target.value) || 0)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Taxa Entregador (R$)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={faixa.taxaEntregador}
                        onChange={(e) => updateTaxaEntregador(idx, parseFloat(e.target.value) || 0)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SEÇÃO 2: Configurações da Fila de Entregadores & Geofencing (Identico a Imagem 2) */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl backdrop-blur">
        <button
          onClick={() => setOpenSectionFila(!openSectionFila)}
          className="w-full flex items-center justify-between p-4 bg-slate-950/60 border-b border-slate-800/80 hover:bg-slate-950 transition-colors"
        >
          <div className="flex items-center gap-2 font-bold text-sm text-slate-200">
            <Users className="w-4 h-4 text-amber-400" />
            <span>Configurações da Fila de Entregadores & Raio de Geofencing</span>
          </div>
          {openSectionFila ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {openSectionFila && (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Controles de Fila */}
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">
                    Raio da fila de entregadores:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={settings.raioFilaMetros}
                      onChange={(e) => setSettings({ ...settings, raioFilaMetros: Number(e.target.value) })}
                      className="w-36 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-none focus:border-amber-500"
                    />
                    <span className="text-slate-400 font-mono">metros</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Deve ser pelo menos 20 metros maior que o raio de coleta para atender às regras. Seu raio de coleta é {settings.raioColetaMetros} metros.
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <label
                    onClick={() => toggleCheckbox('retirarFilaDevolucao')}
                    className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-slate-100"
                  >
                    {settings.retirarFilaDevolucao ? <CheckSquare className="w-4 h-4 text-amber-400 shrink-0" /> : <Square className="w-4 h-4 text-slate-600 shrink-0" />}
                    <span>Retirar entregador da fila durante a pendência de devolução (Ativado)</span>
                  </label>
                  <p className="text-[11px] text-slate-500 pl-6">
                    Quando ativado, o entregador com pedido em pendência de devolução deixa de participar da fila até a pendência ser encerrada.
                  </p>
                </div>
              </div>

              {/* Mini Ilustração Visual do Raio de Geofencing da Loja Matriz */}
              <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-amber-400" />
                    Visualização Geofencing Matriz ({loja.nome})
                  </span>
                  <span className="text-[11px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                    Raio: {settings.raioFilaMetros}m
                  </span>
                </div>

                <div className="h-44 bg-slate-900 rounded-xl relative overflow-hidden flex items-center justify-center border border-slate-800">
                  {/* Círculo Roxo do Raio de Geofencing */}
                  <div className="w-36 h-36 rounded-full bg-purple-600/20 border-2 border-purple-500/60 flex items-center justify-center animate-pulse">
                    <div className="w-20 h-20 rounded-full bg-purple-500/30 border border-purple-400/80 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center shadow-lg">
                        🏠
                      </div>
                    </div>
                  </div>
                  <span className="absolute bottom-2 right-2 text-[10px] text-slate-500 font-mono">João Pessoa - PB</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SEÇÃO 3: Configurações de Entregadores & Visibilidade de Dados (Identico a Imagem 3 & 4) */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl backdrop-blur">
        <button
          onClick={() => setOpenSectionEntregadores(!openSectionEntregadores)}
          className="w-full flex items-center justify-between p-4 bg-slate-950/60 border-b border-slate-800/80 hover:bg-slate-950 transition-colors"
        >
          <div className="flex items-center gap-2 font-bold text-sm text-slate-200">
            <Eye className="w-4 h-4 text-sky-400" />
            <span>Configurações de Entregadores, Restrições & Visibilidade no App</span>
          </div>
          {openSectionEntregadores ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {openSectionEntregadores && (
          <div className="p-5 space-y-6 text-xs">
            {/* Bloco 1: Tempo limite para coleta */}
            <div className="space-y-2 border-b border-slate-800 pb-4">
              <h4 className="font-bold text-slate-200 text-xs">Tempo limite para coleta de pedidos:</h4>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={settings.tempoLimiteColetaMin}
                  onChange={(e) => setSettings({ ...settings, tempoLimiteColetaMin: Number(e.target.value) })}
                  className="w-36 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-none focus:border-amber-500"
                />
                <span className="text-slate-400 font-mono">minutos</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Tempo que o entregador terá para coletar um pedido após ser alocado (Valor mínimo de 2 minutos).
              </p>
            </div>

            {/* Bloco 2: Restrições de Coleta e Entrega */}
            <div className="space-y-3 border-b border-slate-800 pb-4">
              <h4 className="font-bold text-slate-200 text-xs">Restrições de coleta e entrega:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Proximidade máxima da loja para coleta:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={settings.raioColetaMetros}
                      onChange={(e) => setSettings({ ...settings, raioColetaMetros: Number(e.target.value) })}
                      className="w-36 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 font-mono"
                    />
                    <span className="text-slate-400 font-mono">metros</span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Proximidade máxima do cliente para marcar como entregue:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={settings.raioEntregaMetros}
                      onChange={(e) => setSettings({ ...settings, raioEntregaMetros: Number(e.target.value) })}
                      className="w-36 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 font-mono"
                    />
                    <span className="text-slate-400 font-mono">metros</span>
                  </div>
                </div>
              </div>

              <label
                onClick={() => toggleCheckbox('limitarDistanciaEntrega')}
                className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-slate-100 pt-1"
              >
                {settings.limitarDistanciaEntrega ? <CheckSquare className="w-4 h-4 text-sky-400 shrink-0" /> : <Square className="w-4 h-4 text-slate-600 shrink-0" />}
                <span>Limitar distância para marcar como entregue</span>
              </label>
            </div>

            {/* Bloco 3: Dados do Pedido Mostrados para o Entregador antes da Coleta (Checkboxes Imagem 3 & 4) */}
            <div className="space-y-3 border-b border-slate-800 pb-4">
              <h4 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-amber-400" />
                Dados do pedido mostrados para o entregador antes da coleta:
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                {[
                  { field: 'mostrarEndereco', label: 'Endereço' },
                  { field: 'mostrarTaxaEntrega', label: 'Taxa de entrega' },
                  { field: 'mostrarValorPedido', label: 'Valor do pedido' },
                  { field: 'mostrarDescricaoObs', label: 'Descrição e Observação' },
                  { field: 'mostrarFormaPagamento', label: 'Forma de pagamento' },
                  { field: 'mostrarTempoPedido', label: 'Tempo do pedido' },
                  { field: 'mostrarNomeCliente', label: 'Nome do cliente' },
                  { field: 'mostrarTelefoneCliente', label: 'Telefone do cliente' },
                  { field: 'mostrarTempoRestanteColeta', label: 'Tempo restante para coletar' },
                  { field: 'mostrarPedidoNoMapa', label: 'Mostrar pedido no mapa' },
                ].map((item) => {
                  const key = item.field as keyof SystemSettings;
                  const isChecked = Boolean(settings[key]);

                  return (
                    <label
                      key={item.field}
                      onClick={() => toggleCheckbox(key)}
                      className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 cursor-pointer text-slate-300 transition-colors"
                    >
                      {isChecked ? <CheckSquare className="w-4 h-4 text-sky-400 shrink-0" /> : <Square className="w-4 h-4 text-slate-600 shrink-0" />}
                      <span>{item.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Bloco 4: Coleta com 1 Clique & Janela de Histórico */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-bold text-slate-200 text-xs">Coleta de todos os pedidos com um click:</h4>
                <label
                  onClick={() => toggleCheckbox('coletaUmClique')}
                  className="flex items-center gap-2 cursor-pointer text-slate-300"
                >
                  {settings.coletaUmClique ? <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" /> : <Square className="w-4 h-4 text-slate-600 shrink-0" />}
                  <span>Ativado</span>
                </label>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-200 text-xs">Histórico visível ao entregador:</h4>
                <select
                  value={settings.janelaHistoricoDias}
                  onChange={(e) => setSettings({ ...settings, janelaHistoricoDias: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value={7}>7 dias</option>
                  <option value={15}>15 dias</option>
                  <option value={30}>30 dias (padrão)</option>
                  <option value={60}>60 dias</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Seção 4: Gerenciamento de Dados do Banco e Limpeza (Zerar / 24 Horas) */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden shadow-xl backdrop-blur">
        <button
          onClick={() => setOpenSectionLimpeza(!openSectionLimpeza)}
          className="w-full p-4 flex items-center justify-between bg-slate-900/80 hover:bg-slate-800/80 transition-colors text-left border-b border-slate-800/80"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm">Gerenciamento de Dados & Zerar Sistema</h3>
              <p className="text-xs text-slate-400">Limpeza de pedidos antigos, reinício do zero ou auto-expiração em 24h</p>
            </div>
          </div>
          {openSectionLimpeza ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </button>

        {openSectionLimpeza && (
          <div className="p-5 space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Opção 1: Limpar Pedidos +24h */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-amber-400 font-bold">
                  <History className="w-4 h-4" />
                  <span>Limpar Pedidos com Mais de 24 Horas</span>
                </div>
                <p className="text-slate-400">
                  Remove automaticamente todos os pedidos antigos criados há mais de 24h, mantendo a tela limpa apenas com os pedidos do dia.
                </p>
                <button
                  onClick={handleCleanOldOrders}
                  disabled={actionLoading}
                  className="w-full px-4 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-bold transition-all flex items-center justify-center gap-2"
                >
                  <History className="w-4 h-4" />
                  <span>Excluir Pedidos com +24 Horas</span>
                </button>
              </div>

              {/* Opção 2: Zerar Todos os Pedidos */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-rose-400 font-bold">
                  <Trash2 className="w-4 h-4" />
                  <span>Zerar Todos os Pedidos (Começar do Zero)</span>
                </div>
                <p className="text-slate-400">
                  Apaga 100% dos pedidos do banco de dados e da memória local, zerando o painel para iniciar um novo expediente do zero.
                </p>
                <button
                  onClick={handleResetDatabase}
                  disabled={actionLoading}
                  className="w-full px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Zerar Banco &amp; Começar do Zero</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
