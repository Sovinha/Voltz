'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Cpu, 
  MapPin, 
  CheckCircle2, 
  Zap, 
  TrendingUp, 
  Clock, 
  Truck, 
  X, 
  Share2, 
  RotateCcw,
  Navigation,
  Bike,
  AlertTriangle,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { ExpandedPedido, Driver } from '@/lib/mockData';

interface DeepSeekAiModalProps {
  isOpen: boolean;
  onClose: () => void;
  pedidos: ExpandedPedido[];
  drivers: Driver[];
  onApplyOptimization: (planType?: 'maestro_split' | 'external_partner' | 'single_batch') => void;
}

export const DeepSeekAiModal: React.FC<DeepSeekAiModalProps> = ({
  isOpen,
  onClose,
  pedidos,
  drivers,
  onApplyOptimization
}) => {
  const [isProcessing, setIsProcessing] = useState(true);
  const [step, setStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState<'maestro_split' | 'external_partner' | 'single_batch'>('maestro_split');

  // Cálculos Inteligentes do Maestro Logistics Engine
  const pendingOrders = pedidos.filter(p => p.status !== 'finalizado');
  const availableDrivers = drivers.filter(d => d.status === 'online');
  const inRouteDrivers = drivers.filter(d => d.status === 'em_rota');

  // Simulação de tempo de retorno do motoboy em rota (ex: Anderson chega em 8 min)
  const returningDriver = inRouteDrivers[0] || drivers[0] || { nome: 'Anderson', placa: 'VOL-8822' };
  const estimatedReturnMin = 8; // 4 min finalizando entrega + 4 min volta à loja

  useEffect(() => {
    if (isOpen) {
      setIsProcessing(true);
      setStep(1);

      const t1 = setTimeout(() => setStep(2), 900);
      const t2 = setTimeout(() => setStep(3), 1800);
      const t3 = setTimeout(() => {
        setIsProcessing(false);
      }, 2600);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-cyan-500/50 rounded-3xl p-6 shadow-2xl glow-turquoise overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar">
        
        {/* EFEITOS VISUAIS DE ILUMINAÇÃO NEON DEEPSEEK */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* CABEÇALHO DO MAESTRO DEEPSEEK */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-cyan-500 via-teal-400 to-amber-400 text-slate-950 font-black shadow-lg shadow-cyan-500/30 ring-1 ring-white/20">
              <Sparkles className="w-6 h-6 animate-spin" style={{ animationDuration: '5s' }} />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                  DEEPSEEK MAESTRO LOGÍSTICO
                </h2>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 uppercase">
                  Predictive R1 Core
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Simulação preditiva de retorno de motoboys, SLA de entregas e decisão de frota externa
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTEÚDO DURANTE PROCESSAMENTO OU RESULTADO */}
        {isProcessing ? (
          <div className="py-12 text-center space-y-6">
            <div className="relative inline-flex items-center justify-center">
              <div className="w-20 h-20 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 border-r-amber-400 animate-spin"></div>
              <Cpu className="w-8 h-8 text-cyan-300 absolute animate-pulse" />
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-bold text-white tracking-wide">
                {step === 1 && 'Simulando tempo de retorno dos motoboys em rota (ETR)...'}
                {step === 2 && 'Cruza dados de tempo de preparo + distâncias em ruas reais...'}
                {step === 3 && 'Gerando opções para evitar atraso crítico em 100% dos pedidos...'}
              </h3>
              <p className="text-xs text-cyan-400 font-mono">
                Analisando {pendingOrders.length} pedidos pendentes • {availableDrivers.length} motoboy(s) na base • {inRouteDrivers.length} em rota
              </p>
            </div>
          </div>
        ) : (
          <div className="py-4 space-y-5">
            
            {/* PAINEL DE DIAGNÓSTICO DO MAESTRO */}
            <div className="bg-slate-950/90 rounded-2xl p-4 border border-cyan-500/30 space-y-3 shadow-inner">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Diagnóstico da Operação em Tempo Real:
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  Calculado às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                
                <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold block">Motoboy na Base</span>
                  <span className="text-sm font-black text-emerald-400 flex items-center gap-1 mt-0.5">
                    <Bike className="w-4 h-4 text-emerald-400" />
                    {availableDrivers[0]?.nome || 'Lucas'} (Disponível)
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Pronto para levar 2 pedidos</span>
                </div>

                <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold block">Motoboy Retornando à Loja</span>
                  <span className="text-sm font-black text-amber-400 flex items-center gap-1 mt-0.5">
                    <Clock className="w-4 h-4 text-amber-400" />
                    {returningDriver.nome} (Retorna em ~{estimatedReturnMin}m)
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">4m entrega + 4m trajeto volta</span>
                </div>

                <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold block">Gargalo Identificado</span>
                  <span className="text-sm font-black text-rose-400 flex items-center gap-1 mt-0.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    1 Pedido em Risco SLA
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Se 1 motoboy levar os 3 pedidos</span>
                </div>

              </div>
            </div>

            {/* SELEÇÃO DAS 3 OPÇÕES INTELIGENTES DO MAESTRO */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center justify-between">
                <span>Escolha o Plano de Ação Recomendado pelo Maestro:</span>
                <span className="text-[10px] text-cyan-400 font-mono">3 Opções Disponíveis</span>
              </h4>

              {/* OPÇÃO A (RECOMENDADA DO MAESTRO) */}
              <div 
                onClick={() => setSelectedPlan('maestro_split')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                  selectedPlan === 'maestro_split'
                    ? 'bg-gradient-to-r from-cyan-950/60 to-slate-900 border-cyan-400 ring-2 ring-cyan-500/30 shadow-xl'
                    : 'bg-slate-950/70 border-slate-800 hover:border-cyan-500/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 font-black text-[10px] uppercase border border-cyan-500/40">
                      ★ OPÇÃO A (RECOMENDADA MAESTRO)
                    </span>
                    <strong className="text-sm text-white font-extrabold">Divisão de Frota + Aguardar Retorno</strong>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400">Salva 2 Pedidos • SLA 98%</span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  • <strong>Lucas (Base):</strong> Leva 2 entregas contíguas no mesmo corredor (<strong className="text-cyan-300">#0123 Tambaú + #0122 Cabo Branco</strong>).<br/>
                  • <strong>{returningDriver.nome} (Retorna em 8m):</strong> Assume o pedido <strong className="text-amber-300">#0121 (Bairro dos Ipês)</strong> assim que encostar na matriz.<br/>
                  <span className="text-[11px] text-emerald-400 font-bold block mt-1">✓ Resultado: Nenhuma contratação extra necessária. Pedido #0121 sai em 8m com atraso mínimo aceitável (~2 min).</span>
                </p>
              </div>

              {/* OPÇÃO B (ZERO ATRASO COM MOTO EXTERNA IFOOD/MOTTU) */}
              <div 
                onClick={() => setSelectedPlan('external_partner')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                  selectedPlan === 'external_partner'
                    ? 'bg-gradient-to-r from-emerald-950/60 to-slate-900 border-emerald-400 ring-2 ring-emerald-500/30 shadow-xl'
                    : 'bg-slate-950/70 border-slate-800 hover:border-emerald-500/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-black text-[10px] uppercase border border-emerald-500/40">
                      OPÇÃO B (ZERO ATRASO)
                    </span>
                    <strong className="text-sm text-white font-extrabold">Chamar Entregador Parceiro iFood / Mottu Extra</strong>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-300">SLA 100% Perfeito</span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  • <strong>Lucas (Base):</strong> Leva 2 entregas (<strong className="text-cyan-300">#0123 + #0122</strong>).<br/>
                  • <strong>Moto Externa (iFood/Mottu):</strong> Solicitada via API para coletar <strong className="text-emerald-300">#0121 em 3 min</strong> na loja.<br/>
                  <span className="text-[11px] text-cyan-300 font-bold block mt-1">✓ Resultado: ZERA 100% dos atrasos da noite. Custo extra da corrida externa: R$ 8,50.</span>
                </p>
              </div>

              {/* OPÇÃO C (LOTE TRIPLO NA MESMA MOTO) */}
              <div 
                onClick={() => setSelectedPlan('single_batch')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                  selectedPlan === 'single_batch'
                    ? 'bg-gradient-to-r from-amber-950/60 to-slate-900 border-amber-400 ring-2 ring-amber-500/30 shadow-xl'
                    : 'bg-slate-950/70 border-slate-800 hover:border-amber-500/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-black text-[10px] uppercase border border-amber-500/40">
                      OPÇÃO C (LOTE TRIPLO)
                    </span>
                    <strong className="text-sm text-white font-extrabold">Enviar 3 Pedidos na Mesma Moto (Lucas)</strong>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-400">1 Motoboy Apenas</span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  • <strong>Lucas (Base):</strong> Leva os 3 pedidos em sequência otimizada OSRM (<strong className="text-cyan-300">#0123 ➔ #0122 ➔ #0121</strong>).<br/>
                  <span className="text-[11px] text-amber-300 font-bold block mt-1">⚠️ Resultado: Pedido #0121 sofrerá atraso estimado de ~14 min no final da rota.</span>
                </p>
              </div>

            </div>

            {/* AÇÕES DE EXECUÇÃO DIRETA DO MAESTRO */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
              >
                Cancelar
              </button>

              <button
                onClick={() => {
                  onApplyOptimization(selectedPlan);
                  onClose();
                }}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 via-teal-300 to-amber-400 hover:from-cyan-300 hover:to-amber-300 text-slate-950 font-black text-xs shadow-xl shadow-cyan-500/25 transition-all cursor-pointer active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4 text-slate-950" />
                <span>Aplicar Decisão Maestro ({selectedPlan === 'maestro_split' ? 'Plano A' : selectedPlan === 'external_partner' ? 'Plano B (iFood Extra)' : 'Plano C'})</span>
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
