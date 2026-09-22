import re
import requests
import json

def remove_accents(text):
    if not text:
        return ""
    import unicodedata
    return ''.join(
        c for c in unicodedata.normalize('NFD', text)
        if unicodedata.category(c) != 'Mn'
    )

def parse_brazilian_address(raw_address_str):
    """
    Inteligência de Parsing para Endereços do iFood / Web:
    Extrai CEP, Logradouro, Número, Bairro, Complemento e Ponto de Referência.
    Consulta o ViaCEP para validar a rua oficial e cruza com a numeração.
    """
    if not raw_address_str or not isinstance(raw_address_str, str):
        return None

    # Normaliza quebras de linha
    lines = [l.strip() for l in raw_address_str.split('\n') if l.strip()]
    full_text = " ".join(lines)

    # 1. Extrair CEP (8 dígitos com ou sem hífen)
    cep_match = re.search(r'(\d{5})[-.\s]?(\d{3})', full_text)
    cep = f"{cep_match.group(1)}-{cep_match.group(2)}" if cep_match else None

    # 2. Dados do ViaCEP (Correios Oficial)
    viacep_data = None
    if cep:
        clean_cep = cep.replace("-", "").strip()
        try:
            r = requests.get(f"https://viacep.com.br/ws/{clean_cep}/json/", timeout=3)
            if r.status_code == 200 and not r.json().get("erro"):
                viacep_data = r.json()
        except Exception:
            pass

    # 3. Extrair Número da Casa / Prédio (da 1ª linha ou do texto)
    line1 = lines[0] if lines else full_text
    num_match = re.search(r'(?:,\s*|\s+)(\d{1-[5]|\d{1,5})(?:\s*[-,]|\s|$)', line1)
    if not num_match:
        num_match = re.search(r'(?:,\s*|\s+)(\d{1,5})(?:\s*[-,]|\s|$)', full_text)
    house_number = num_match.group(1) if num_match else ""

    # 4. Extrair Nome da Rua (da 1ª linha)
    street_clean = re.sub(r',\s*\d+.*$', '', line1).strip()

    # 5. Cruzamento Inteligente: Usar Logradouro Oficial do ViaCEP se disponível
    official_street = viacep_data.get("logradouro") if viacep_data else street_clean
    official_bairro = viacep_data.get("bairro") if viacep_data else ""
    official_cidade = viacep_data.get("localidade", "João Pessoa") if viacep_data else "João Pessoa"
    official_uf = viacep_data.get("uf", "PB") if viacep_data else "PB"

    if not official_street:
        official_street = street_clean

    # 6. Separação de Complemento e Referência para exibição
    complemento_lines = []
    referencia_lines = []
    for line in lines[2:]:
        line_low = line.lower()
        if any(kw in line_low for kw in ['ap', 'apt', 'apto', 'bloco', 'casa', 'loja', 'res', 'edificio', 'condominio']):
            complemento_lines.append(line)
        elif any(kw in line_low for kw in ['proximo', 'próximo', 'ao lado', 'em frente', 'atras', 'referencia']):
            referencia_lines.append(line)
        else:
            complemento_lines.append(line)

    complemento = ", ".join(complemento_lines)
    referencia = ", ".join(referencia_lines)

    # 7. Query de Geocodificação Limpa (100% precisa sem ruídos de complemento)
    geocode_query = f"{official_street}, {house_number}, {official_bairro}, {official_cidade}, {official_uf}, Brasil".replace(" ,", "").strip()

    return {
        "raw": raw_address_str,
        "cep": cep,
        "rua_oficial": official_street,
        "numero": house_number,
        "bairro": official_bairro,
        "cidade": official_cidade,
        "uf": official_uf,
        "complemento": complemento,
        "referencia": referencia,
        "geocode_query": geocode_query
    }

# Testes com os 5 exemplos reais fornecidos pelo usuário
ex1 = """R. Placido de Azevedo Ribeiro, 155
Altiplano Cabo Branco, João Pessoa (58046-115)
Apto 200
Próximo ao Saint Michel"""

ex2 = """Av. Duarte da Silveira, 516
Centro, João Pessoa (58013-280)
Escritório Casa
JOSÉ MARIO PORTO E MAIA"""

ex3 = """Av. Eutiquiano Barreto, 340
Manaíra, João Pessoa (58038-310)
Apto 201
Condomínio residencial águas del tunari"""

ex4 = """R. Ver. Jose Alberto Barroca Falcao, 78
Miramar, João Pessoa (58032-070)
apto 203
polana Residence"""

ex5 = """Av. Bahia, 575
Estados, João Pessoa (58030-130)
Casa
Próximo a Liduina Boutique"""

if __name__ == "__main__":
    for idx, ex in enumerate([ex1, ex2, ex3, ex4, ex5], 1):
        parsed = parse_brazilian_address(ex)
        print(f"--- EXEMPLO {idx} ---")
        print("CEP:", parsed["cep"])
        print("Rua Oficial (ViaCEP):", parsed["rua_oficial"])
        print("Número:", parsed["numero"])
        print("Bairro:", parsed["bairro"])
        print("Geocode Query Limpa:", parsed["geocode_query"])
        print("Complemento:", parsed["complemento"])
        print("Referência:", parsed["referencia"])
        print()
