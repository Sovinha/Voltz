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
  if (!addressStr || !addressStr.trim()) {
    if (lat && lng && Math.abs(lat) > 0 && Math.abs(lng) > 0) {
      return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    }
    return 'https://www.google.com/maps';
  }

  const raw = addressStr.trim();
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  const line1 = lines[0] || raw;

  // Extrai CEP (ex: 58050-690 ou (58050-690))
  const cepMatch = raw.match(/(\(\d{5}-?\d{3}\)|\b\d{5}-?\d{3}\b)/);
  const cep = cepMatch ? cepMatch[0].replace(/[()]/g, '').trim() : '';

  // Extrai Bairro se presente em linha separada
  let bairro = '';
  if (lines.length > 1) {
    const line2Clean = lines[1].replace(/(\(\d{5}-?\d{3}\)|\b\d{5}-?\d{3}\b)/g, '').trim();
    const parts = line2Clean.split(/[,|-]/);
    if (parts.length > 0 && parts[0].trim()) {
      bairro = parts[0].trim();
    }
  }

  // Remove ruídos e complementos da linha 1 ("Ao lado da...", "Apto 101", "Próximo ao...")
  // Mantém estritamente o Nome da Rua e Número Exato (ex: "R. Cônego Francisco Lima, 336")
  const cleanLine1 = line1
    .replace(/\s*,?\s*(?:apto|apt|ap|bloco|bl|casa|próximo|proximo|perto|ao lado|condomínio|condominio)\b.*$/i, '')
    .trim();

  // Constrói a consulta limpa focada em Rua + Número Exato + Bairro + João Pessoa - PB + CEP
  const queryParts: string[] = [cleanLine1];

  if (bairro && !cleanLine1.toLowerCase().includes(bairro.toLowerCase())) {
    queryParts.push(bairro);
  }

  if (!queryParts.some(p => p.toLowerCase().includes('joão pessoa') || p.toLowerCase().includes('joao pessoa'))) {
    queryParts.push('João Pessoa - PB');
  }

  if (cep && !queryParts.some(p => p.includes(cep))) {
    queryParts.push(`(${cep})`);
  }

  const cleanQuery = queryParts.join(', ');

  // Abre em modo Directions oficial do Google Maps apontando para o número textual exato
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(cleanQuery)}`;
};
