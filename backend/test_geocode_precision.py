"""
Teste de Precisão da Geocodificação Multi-Provedor do Voltz Delivery.
Testa endereços reais de João Pessoa/PB e compara com coordenadas corretas conhecidas.

Uso: python test_geocode_precision.py
"""

import sys
import os
import math

# Adiciona o diretório backend ao path para importar as funções
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import geocode_address, _extract_address_parts, sanitize_coords

def haversine_distance_meters(lat1, lon1, lat2, lon2):
    """Calcula a distância em metros entre duas coordenadas."""
    R = 6371000  # Raio da Terra em metros
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


# Endereços reais do usuário com coordenadas corretas (Google Maps / iFood)
TEST_CASES = [
    {
        "nome": "Pedido 92 - Altiplano Cabo Branco",
        "endereco": """R. Placido de Azevedo Ribeiro, 155
Altiplano Cabo Branco, João Pessoa (58046-115)
Apto 200
Próximo ao Saint Michel""",
        "lat_correto": -7.129797,
        "lng_correto": -34.829227,
        "tolerancia_m": 150,
    },
    {
        "nome": "Pedido 93 - Mandacaru (Gil Furtado 333)",
        "endereco": """R. Gil Furtado, 333
Mandacaru, João Pessoa (58030-206)
Aparentemente 202
Próximo à feira do barro dos estados""",
        "lat_correto": -7.106273,
        "lng_correto": -34.858192,
        "tolerancia_m": 250,
    },
    {
        "nome": "Av. Duarte da Silveira 516 - Centro",
        "endereco": """Av. Duarte da Silveira, 516
Centro, João Pessoa (58013-280)
Escritório Casa
JOSÉ MARIO PORTO E MAIA""",
        "lat_correto": -7.123071,
        "lng_correto": -34.870678,
        "tolerancia_m": 150,
    },
    {
        "nome": "Av. Eutiquiano Barreto 340 - Manaíra",
        "endereco": """Av. Eutiquiano Barreto, 340
Manaíra, João Pessoa (58038-310)
Apto 201
Condomínio residencial águas del tunari""",
        "lat_correto": -7.105822,
        "lng_correto": -34.836601,
        "tolerancia_m": 150,
    },
    {
        "nome": "R. Ver. Jose Alberto Barroca Falcão 78 - Miramar",
        "endereco": """R. Ver. Jose Alberto Barroca Falcao, 78
Miramar, João Pessoa (58032-070)
apto 203
polana Residence""",
        "lat_correto": -7.1140,
        "lng_correto": -34.8470,
        "tolerancia_m": 150,
    },
    {
        "nome": "Av. Bahia 575 - Estados",
        "endereco": """Av. Bahia, 575
Estados, João Pessoa (58030-130)
Casa
Próximo a Liduina Boutique""",
        "lat_correto": -7.113015,
        "lng_correto": -34.855574,
        "tolerancia_m": 150,
    },
]


def run_precision_tests():
    """Executa testes de precisão e exibe relatório."""
    print("=" * 80)
    print("🎯 TESTE DE PRECISÃO DA GEOCODIFICAÇÃO MULTI-PROVEDOR VOLTZ")
    print("=" * 80)
    print()

    resultados = []

    for i, tc in enumerate(TEST_CASES, 1):
        print(f"--- TESTE {i}: {tc['nome']} ---")
        print(f"  Endereço: {tc['endereco'].split(chr(10))[0]}")

        lat, lng = geocode_address(tc["endereco"])

        dist_m = haversine_distance_meters(lat, lng, tc["lat_correto"], tc["lng_correto"])
        ok = dist_m <= tc["tolerancia_m"]

        status = "✅ PASSOU" if ok else "❌ FALHOU"
        print(f"  Resultado:  ({lat}, {lng})")
        print(f"  Esperado:   ({tc['lat_correto']}, {tc['lng_correto']})")
        print(f"  Distância:  {dist_m:.0f}m")
        print(f"  Tolerância: {tc['tolerancia_m']}m")
        print(f"  Status:     {status}")
        print()

        resultados.append({
            "nome": tc["nome"],
            "lat": lat,
            "lng": lng,
            "dist_m": dist_m,
            "ok": ok
        })

    # Resumo
    total = len(resultados)
    passou = sum(1 for r in resultados if r["ok"])
    media_dist = sum(r["dist_m"] for r in resultados) / total if total > 0 else 0

    print("=" * 80)
    print(f"📊 RESUMO: {passou}/{total} testes passaram | Distância média: {media_dist:.0f}m")
    print("=" * 80)

    if passou == total:
        print("🏆 TODOS OS TESTES PASSARAM!")
    else:
        print("⚠️  Alguns endereços ainda precisam de ajuste manual (drag & drop no mapa).")

    return passou, total


if __name__ == "__main__":
    run_precision_tests()
