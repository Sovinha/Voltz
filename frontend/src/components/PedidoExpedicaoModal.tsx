'use client';

import React from 'react';
import { Printer, X, QrCode, Store, Clock, MapPin, Truck, CheckCircle2 } from 'lucide-react';
import { Pedido } from '@/lib/supabase';
import { LojaConfig } from './InteractiveMap';
import { analyzeOrderItems, isBeverageItem, isDessertItem } from '@/lib/beverageDetection';

interface PedidoExpedicaoModalProps {
  pedido: Pedido | null;
  loja: LojaConfig;
  isOpen: boolean;
  onClose: () => void;
  stopSequence?: number;
}

export const PedidoExpedicaoModal: React.FC<PedidoExpedicaoModalProps> = ({
  pedido,
  loja,
  isOpen,
  onClose,
  stopSequence,
}) => {
  if (!isOpen || !pedido) return null;

  const itemAnalysis = analyzeOrderItems(pedido.itens);

  const trackingUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/tracking?id=${pedido.id_externo}`
    : `http://localhost:3000/tracking?id=${pedido.id_externo}`;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(trackingUrl)}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2 text-sky-400 font-extrabold text-sm">
            <Printer className="w-5 h-5" />
            <span>Guia de Expedição Térmica (80mm)</span>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Receipt Paper Container */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          <div className="print-receipt bg-white text-slate-950 p-6 rounded-xl font-mono text-xs shadow-2xl space-y-3 border border-slate-300 mx-auto max-w-[340px]">
            {/* Store Header */}
            <div className="text-center border-b border-dashed border-slate-400 pb-3 space-y-1">
              <h3 className="font-extrabold text-sm uppercase tracking-tight text-slate-900">{loja.nome}</h3>
              <p className="text-[10px] text-slate-600">{loja.endereco}</p>
              <div className="text-[10px] font-bold text-slate-700 pt-1">
                COMPROVANTE DE ENTREGA & EXPEDIÇÃO
              </div>
            </div>

            {/* Order & Stop Sequence */}
            <div className="flex justify-between items-center bg-slate-100 p-2 rounded border border-slate-300">
              <div>
                <span className="text-[10px] text-slate-500 block">PEDIDO</span>
                <strong className="text-base text-slate-900 font-black">#{pedido.id_externo}</strong>
              </div>

              {stopSequence ? (
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block">SEQUÊNCIA</span>
                  <span className="bg-slate-900 text-white font-extrabold px-2 py-0.5 rounded text-xs">
                    PARADA #{stopSequence}
                  </span>
                </div>
              ) : (
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block">CANAL</span>
                  <span className="font-extrabold uppercase text-slate-800">{pedido.origem}</span>
                </div>
              )}
            </div>

            {/* ALERTA DESTACADO: BEBIDAS E SOBREMESAS GELADAS */}
            {itemAnalysis.hasSpecialItems && (
              <div className="bg-amber-300 border-2 border-slate-900 p-2 rounded text-center my-2 space-y-0.5 animate-pulse">
                <span className="text-[11px] font-black text-slate-950 uppercase block tracking-tight">
                  ⚠️ ATENÇÃO MOTOBOY / EXPEDIÇÃO ⚠️
                </span>
                <strong className="text-xs font-black text-slate-950 block underline uppercase">
                  {itemAnalysis.hasBeverage && itemAnalysis.hasDessert
                    ? '🥤 INCLUI BEBIDA GELADA & SOBREMESA! 🍰'
                    : itemAnalysis.hasBeverage
                    ? '🥤 INCLUI BEBIDA GELADA (PEGAR NA GELADEIRA)!'
                    : '🍰 INCLUI SOBREMESA!'}
                </strong>
                <span className="text-[9px] font-extrabold text-slate-900 block">
                  CONFERIR ITENS NA GELADEIRA/FREEZER ANTES DE SAIR
                </span>
              </div>
            )}

            {/* Código PIN de Confirmação no Comprovante */}
            {pedido.codigo_confirmacao && (
              <div className="bg-amber-100 border border-amber-400 p-2 rounded text-center">
                <span className="text-[10px] font-bold text-amber-900 block uppercase">CÓDIGO PIN DE CONFIRMAÇÃO</span>
                <strong className="text-xl font-black text-slate-950 tracking-widest">{pedido.codigo_confirmacao}</strong>
              </div>
            )}

            {/* Customer Details */}
            <div className="space-y-1 border-b border-dashed border-slate-400 pb-3">
              <div className="flex justify-between">
                <span className="text-slate-500">CLIENTE:</span>
                <strong className="text-slate-950 font-bold">{pedido.nome_cliente}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">DATA/HORA:</span>
                <span className="text-slate-800">{new Date(pedido.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-1 border-b border-dashed border-slate-400 pb-3">
              <span className="text-slate-500 text-[10px] font-bold uppercase block">ENDEREÇO DE ENTREGA:</span>
              <p className="font-bold text-slate-950 text-xs leading-snug">
                {pedido.endereco_entrega}
              </p>
            </div>

            {/* Items Table */}
            <div className="space-y-1.5 border-b border-dashed border-slate-400 pb-3">
              <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase border-b border-slate-200 pb-1">
                <span>ITEM</span>
                <span>VALOR</span>
              </div>

              {Array.isArray(pedido.itens) && pedido.itens.length > 0 ? (
                pedido.itens.map((item, i) => {
                  const isBev = isBeverageItem(item.nome);
                  const isDes = isDessertItem(item.nome);
                  const isSpecial = isBev || isDes;

                  return (
                    <div 
                      key={i} 
                      className={`flex justify-between text-[11px] p-0.5 rounded ${
                        isSpecial ? 'bg-amber-200 font-black text-slate-950 border border-slate-900' : ''
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        {isBev && '🥤'}
                        {isDes && '🍰'}
                        <span className={isSpecial ? 'underline uppercase font-black' : ''}>
                          {item.quantidade}x {item.nome}
                        </span>
                      </span>
                      <span>R$ {((item.preco_unitario || 0) * (item.quantidade || 1)).toFixed(2)}</span>
                    </div>
                  );
                })
              ) : (
                <div className="flex justify-between text-[11px]">
                  <span>1x Pedido Trattoria Express</span>
                  <span>R$ {pedido.valor_total.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Total */}
            <div className="flex justify-between items-center text-sm font-black border-b border-dashed border-slate-400 pb-3">
              <span>TOTAL A RECEBER:</span>
              <span className="text-base text-slate-950">R$ {pedido.valor_total.toFixed(2)}</span>
            </div>

            {/* QR Code Section */}
            <div className="text-center pt-1 space-y-2">
              <span className="text-[10px] text-slate-600 block font-bold uppercase">RASTREAMENTO AO VIVO (CLIENTE/MOTOBOY)</span>
              <img
                src={qrImageUrl}
                alt="QR Code Rastreamento"
                className="w-28 h-28 mx-auto border-2 border-slate-900 rounded p-1 bg-white shadow-sm"
              />
              <span className="text-[9px] text-slate-500 block font-mono">Escanear para mapa em tempo real</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
          >
            Fechar
          </button>

          <button
            onClick={handlePrint}
            className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs shadow-lg flex items-center gap-2 transition-all hover:scale-105"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Comprovante Térmico</span>
          </button>
        </div>
      </div>
    </div>
  );
};
