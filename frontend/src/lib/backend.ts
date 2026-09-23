export const getBackendUrl = (): string => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `${window.location.protocol}//${host}:5000`;
    }
  }
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
};

export const getGoogleMapsUrl = (addressStr?: string | null, lat?: number | null, lng?: number | null): string => {
  // 1. Se possuir coordenadas válidas, gera rota direta no Google Maps via coordenadas (porta exata)
  if (lat && lng && Math.abs(lat) > 0 && Math.abs(lng) > 0) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }

  if (!addressStr) return 'https://www.google.com/maps';

  // 2. Limpa complementos ruidosos após o CEP (ex: ") Apto 101 Perto do McDonald's")
  let clean = addressStr.trim();

  // Procura CEP no formato (58045-020) ou 58045-020 e corta tudo que vier APÓS o CEP
  const cepMatch = clean.match(/(\(\d{5}-?\d{3}\)|\b\d{5}-?\d{3}\b)/);
  if (cepMatch && cepMatch.index !== undefined) {
    const cutoffIndex = cepMatch.index + cepMatch[0].length;
    clean = clean.substring(0, cutoffIndex).trim();
  } else {
    // Se não tiver CEP explícito, limpa termos de complemento conhecidos que confundem a busca do Google Maps
    clean = clean
      .replace(/\s*,?\s*(?:apto|apt|ap|bloco|bl|casa|próximo|proximo|perto|condomínio|condominio)\b.*$/i, '')
      .trim();
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clean)}`;
};
