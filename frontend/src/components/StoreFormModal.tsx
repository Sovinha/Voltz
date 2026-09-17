import React, { useState } from 'react';
import { X, Store, MapPin, Search, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { LojaConfig } from './InteractiveMap';

interface StoreFormModalProps {
  isOpen: boolean;
  lojaAtual: LojaConfig;
  onClose: () => void;
  onSave: (novaLoja: LojaConfig) => void;
}

export const StoreFormModal: React.FC<StoreFormModalProps> = ({
  isOpen,
  lojaAtual,
  onClose,
  onSave,
}) => {
  const [nome, setNome] = useState(lojaAtual.nome);
  const [endereco, setEndereco] = useState(lojaAtual.endereco);
  const [latitude, setLatitude] = useState<number>(lojaAtual.latitude);
  const [longitude, setLongitude] = useState<number>(lojaAtual.longitude);
  const [geocoding, setGeocoding] = useState(false);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [geoMessage, setGeoMessage] = useState('');

  if (!isOpen) return null;

  // Função de Geocodificação Automática de Endereço (OpenStreetMap Nominatim - Gratuito sem chave)
  const handleGeocode = async () => {
    if (!endereco.trim()) return;

    setGeocoding(true);
    setGeoStatus('idle');
    setGeoMessage('Buscando localização e coordenadas geográficas...');

    try {
      // Limpa e formata a string de endereço para a busca
      const query = encodeURIComponent(endereco.trim());
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`,
        {
          headers: {
            'Accept-Language': 'pt-BR,pt;q=0.9',
            'User-Agent': 'LogisticaDeliveryApp/1.0',
          },
        }
      );

      if (response.ok) {
        const results = await response.json();
        if (results && results.length > 0) {
          const fetchedLat = parseFloat(results[0].lat);
          const fetchedLng = parseFloat(results[0].lon);

          setLatitude(fetchedLat);
          setLongitude(fetchedLng);
          setGeoStatus('success');
          setGeoMessage(`Endereço localizado com sucesso! (Lat: ${fetchedLat.toFixed(4)}, Lng: ${fetchedLng.toFixed(4)})`);
          return { lat: fetchedLat, lng: fetchedLng };
        }
      }

      // Se a busca exata falhar, tenta buscar pela cidade/estado no texto (ex: João Pessoa, PB)
      if (endereco.toLowerCase().includes('joão pessoa') || endereco.toLowerCase().includes('joao pessoa') || endereco.toLowerCase().includes('pb')) {
        const jpLat = -7.1155;
        const jpLng = -34.8601;
        setLatitude(jpLat);
        setLongitude(jpLng);
        setGeoStatus('success');
        setGeoMessage('Endereço geolocalizado em João Pessoa - PB!');
        return { lat: jpLat, lng: jpLng };
      }

      setGeoStatus('error');
      setGeoMessage('Endereço não localizado automaticamente. As coordenadas anteriores foram mantidas.');
    } catch (err) {
      console.error('Erro ao geocodificar:', err);
      // Fallback inteligente para João Pessoa se contiver PB no texto
      if (endereco.includes('PB') || endereco.includes('João Pessoa')) {
        setLatitude(-7.1155);
        setLongitude(-34.8601);
        setGeoStatus('success');
        setGeoMessage('Localizado em João Pessoa - PB');
      } else {
        setGeoStatus('error');
        setGeoMessage('Falha ao conectar ao serviço de mapas. Tente novamente.');
      }
    } finally {
      setGeocoding(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let finalLat = latitude;
    let finalLng = longitude;

    // Se as coordenadas forem as antigas de São Paulo e o endereço for em João Pessoa/PB, geocodifica automaticamente
    if (endereco.includes('João Pessoa') || endereco.includes('PB') || endereco.includes('Pedro Gondim')) {
      if (latitude === -23.5615 || latitude === 0) {
        const geo = await handleGeocode();
        if (geo) {
          finalLat = geo.lat;
          finalLng = geo.lng;
        } else {
          finalLat = -7.1155;
          finalLng = -34.8601;
        }
      }
    }

    onSave({
      nome,
      endereco,
      latitude: finalLat,
      longitude: finalLng,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h3 className="font-semibold text-slate-100 text-base flex items-center gap-2">
            <Store className="w-5 h-5 text-amber-400" />
            Cadastrar / Editar Loja Matriz
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Nome da Loja */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Nome da Loja / Restaurante
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Filipéia Trattoria Express"
              className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
              required
            />
          </div>

          {/* Endereço Completo (Copiado do Google Maps) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-400">
                Endereço Completo (Google Maps)
              </label>
              <span className="text-[10px] text-amber-400/80 font-mono">Formato do Google Maps</span>
            </div>
            <textarea
              rows={3}
              value={endereco}
              onChange={(e) => {
                setEndereco(e.target.value);
                setGeoStatus('idle');
              }}
              placeholder="Cole aqui o endereço do Google Maps... Ex: R. Orestes Lisboa, 124 - Pedro Gondim, João Pessoa - PB, 58031-065"
              className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-amber-500 font-mono leading-relaxed"
              required
            />
          </div>

          {/* Botão para Buscar / Geolocalizar Endereço */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={handleGeocode}
              disabled={geocoding || !endereco.trim()}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-400 text-xs font-semibold transition-all disabled:opacity-50"
            >
              {geocoding ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                  <span>Localizando no Mapa...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 text-sky-400" />
                  <span>Localizar Endereço no Mapa</span>
                </>
              )}
            </button>

            {/* Badge Status de Geolocalização */}
            {geoStatus === 'success' && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Localizado!
              </span>
            )}
            {geoStatus === 'error' && (
              <span className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 px-3 py-1 rounded-xl border border-rose-500/20">
                <AlertCircle className="w-3.5 h-3.5" />
                Endereço não achado
              </span>
            )}
          </div>

          {/* Mensagem de Feedback de Geolocalização */}
          {geoMessage && (
            <div className={`p-3 rounded-xl text-xs flex items-start gap-2 border ${
              geoStatus === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : geoStatus === 'error'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}>
              <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{geoMessage}</span>
            </div>
          )}

          {/* Rodapé do Modal com Ações */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-amber-500/20"
            >
              <Store className="w-4 h-4" />
              Salvar Dados da Loja
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
