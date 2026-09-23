'use client';

import React, { useState, useEffect } from 'react';
import { Store, Plus, MapPin, Phone, Trash2, CheckCircle2, X, Building2, Globe } from 'lucide-react';
import { getBackendUrl } from '@/lib/backend';
import { LojaConfig } from './InteractiveMap';

interface MultiStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  lojaAtiva: LojaConfig;
  onSelectLoja: (loja: LojaConfig) => void;
}

export function MultiStoreModal({ isOpen, onClose, lojaAtiva, onSelectLoja }: MultiStoreModalProps) {
  const [lojas, setLojas] = useState<LojaConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form de Nova Loja
  const [nome, setNome] = useState('');
  const [endereco, setEndereco] = useState('');
  const [telefone, setTelefone] = useState('');
  const [latitude, setLatitude] = useState<number | ''>('');
  const [longitude, setLongitude] = useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const backendUrl = getBackendUrl();

  const fetchLojas = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/lojas`);
      if (res.ok) {
        const data: LojaConfig[] = await res.json();
        setLojas(data);
      }
    } catch (err) {
      console.error('Erro ao buscar lojas:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchLojas();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreateLoja = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!nome.trim() || !endereco.trim()) {
      setErrorMsg('Nome e Endereço são obrigatórios.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        nome: nome.trim(),
        endereco: endereco.trim(),
        telefone: telefone.trim(),
      };
      if (typeof latitude === 'number') payload.latitude = latitude;
      if (typeof longitude === 'number') payload.longitude = longitude;

      const res = await fetch(`${backendUrl}/api/lojas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const result = await res.json();
        setNome('');
        setEndereco('');
        setTelefone('');
        setLatitude('');
        setLongitude('');
        setShowAddForm(false);
        await fetchLojas();
        if (result.loja) {
          onSelectLoja(result.loja);
        }
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'Erro ao cadastrar nova loja.');
      }
    } catch (err: any) {
      setErrorMsg('Falha de conexão com o servidor.');
    }
    setIsSubmitting(false);
  };

  const handleDeleteLoja = async (idLoja: string, nomeLoja: string) => {
    if (lojas.length <= 1) {
      alert('Não é possível excluir a única loja cadastrada no sistema.');
      return;
    }
    if (!confirm(`Tem certeza que deseja excluir a filial "${nomeLoja}"?`)) return;

    try {
      const res = await fetch(`${backendUrl}/api/lojas/${idLoja}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchLojas();
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao excluir loja.');
      }
    } catch (err) {
      alert('Erro de conexão ao excluir loja.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Gerenciamento Multi-Lojas</h3>
              <p className="text-xs text-slate-400">Cadastre e alterne entre suas filiais e unidades de atendimento</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6 custom-scrollbar">
          {/* Form de Nova Loja (Toggle) */}
          {showAddForm ? (
            <form onSubmit={handleCreateLoja} className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <h4 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Cadastrar Nova Filial / Loja
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancelar
                </button>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Nome da Filial *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Filipéia - Unidade Manaíra"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="(83) 99999-9999"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs text-slate-400 mb-1">Endereço Completo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Rua, número, bairro, cidade - UF"
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    O sistema buscará as coordenadas lat/long automaticamente caso não preenchidas abaixo.
                  </span>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Latitude (Opcional)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Ex: -7.1150"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value ? parseFloat(e.target.value) : '')}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Longitude (Opcional)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Ex: -34.8630"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value ? parseFloat(e.target.value) : '')}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold rounded-lg text-xs transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Cadastrando Filial...' : 'Salvar Nova Filial'}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400 font-medium">Filiais Cadastradas ({lojas.length})</span>
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Cadastrar Nova Loja</span>
              </button>
            </div>
          )}

          {/* Lista de Lojas */}
          <div className="space-y-3">
            {lojas.map((l) => {
              const isSelected = (lojaAtiva.id && l.id === lojaAtiva.id) || l.nome === lojaAtiva.nome;

              return (
                <div
                  key={l.id || l.nome}
                  className={`p-4 rounded-xl border transition flex items-start justify-between ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500/50 shadow-lg shadow-amber-500/5'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-white text-sm">{l.nome}</span>
                      {isSelected && (
                        <span className="flex items-center space-x-1 px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-bold rounded-full border border-amber-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>ATIVA NO MAPA</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{l.endereco}</span>
                    </p>
                    {l.telefone && (
                      <p className="text-xs text-slate-400 flex items-center space-x-1">
                        <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>{l.telefone}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    {!isSelected && (
                      <button
                        onClick={() => {
                          onSelectLoja(l);
                          onClose();
                        }}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition"
                      >
                        Selecionar
                      </button>
                    )}
                    {lojas.length > 1 && l.id && (
                      <button
                        onClick={() => handleDeleteLoja(l.id!, l.nome)}
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                        title="Excluir filial"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Modal */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-slate-800 bg-slate-950/50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
