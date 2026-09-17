"""
==============================================================================
SISTEMA DE GESTÃO LOGÍSTICA PARA DELIVERY - AUTOMAÇÃO IFOOD
Script de captura automática de novos pedidos no portal do iFood usando Playwright
==============================================================================
"""

import os
import sys
import asyncio
from dotenv import load_dotenv
from supabase import create_client, Client
from playwright.async_api import async_playwright

# Carrega variáveis de ambiente
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("[AVISO] SUPABASE_URL ou SUPABASE_KEY nao configurados no arquivo .env!")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

# HTML Simulado do Portal iFood para demonstração funcional offline/acadêmica
MOCK_IFOOD_HTML = """
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Portal do Gestor iFood - Notificações</title>
</head>
<body>
    <h1>Painel de Pedidos iFood</h1>
    
    <!-- Notificação de Novo Pedido -->
    <div id="novo-pedido" class="notificacao-card">
        <span id="id-pedido">IFOOD-987452</span>
        <h3 id="nome-cliente">Mariana Souza</h3>
        <p id="endereco-entrega">Av. Paulista, 1578, Ap 42 - Bela Vista, São Paulo - SP</p>
        <div id="geo" data-lat="-23.5615" data-lng="-46.6560"></div>
        <ul id="itens-pedido">
            <li class="item" data-qtd="2" data-preco="38.50">Pizza Grandes de Calabresa</li>
            <li class="item" data-qtd="1" data-preco="12.00">Guaraná Antarctica 2L</li>
        </ul>
        <span id="valor-total">89.00</span>
    </div>
</body>
</html>
"""


async def processar_notificacao_ifood(page):
    """
    Lê a notificação de 'Novo Pedido' no iFood usando seletores DOM (Playwright),
    extrai os dados, normaliza para a estrutura unificada e insere no Supabase.
    """
    print("[INFO] Procurando por notificacoes de 'Novo Pedido' (#novo-pedido)...")

    # Espera até que a notificação de novo pedido apareça na tela
    await page.wait_for_selector("#novo-pedido", timeout=10000)

    # Extração dos dados usando os seletores da página do iFood
    id_externo = await page.inner_text("#id-pedido")
    nome_cliente = await page.inner_text("#nome-cliente")
    endereco_entrega = await page.inner_text("#endereco-entrega")
    valor_total_str = await page.inner_text("#valor-total")
    valor_total = float(valor_total_str.replace("R$", "").replace(",", ".").strip())

    # Leitura das coordenadas geográficas (se disponível)
    geo_element = page.locator("#geo")
    lat = float(await geo_element.get_attribute("data-lat") or -23.5615)
    lng = float(await geo_element.get_attribute("data-lng") or -46.6560)

    # Leitura da lista de itens
    itens_elements = await page.query_selector_all("#itens-pedido .item")
    itens = []
    for item_el in itens_elements:
        nome_item = await item_el.inner_text()
        qtd = int(await item_el.get_attribute("data-qtd") or 1)
        preco = float(await item_el.get_attribute("data-preco") or 0.0)
        itens.append({
            "nome": nome_item,
            "quantidade": qtd,
            "preco_unitario": preco
        })

    print("\n[CAPTURADO] === DADOS DO PEDIDO CAPTURADO VIA PLAYWRIGHT (iFood) ===")
    print(f"ID Externo: {id_externo}")
    print(f"Cliente:    {nome_cliente}")
    print(f"Endereco:   {endereco_entrega}")
    print(f"Itens:      {itens}")
    print(f"Valor Total: R$ {valor_total:.2f}")
    print("=========================================================\n")

    # Estrutura padronizada para o banco de dados
    pedido_ifood = {
        "origem": "ifood",
        "id_externo": id_externo.strip(),
        "nome_cliente": nome_cliente.strip(),
        "endereco_entrega": endereco_entrega.strip(),
        "latitude": lat,
        "longitude": lng,
        "itens": itens,
        "valor_total": valor_total,
        "status": "pendente"
    }

    # Envio para o Supabase ou Webhook Flask Local
    if supabase:
        response = supabase.table("pedidos").insert(pedido_ifood).execute()
        if hasattr(response, "data") and response.data:
            print(f"[OK] Pedido iFood registrado com sucesso no Supabase! ID: {response.data[0]['id']}")
        else:
            print("[ERRO] Erro ao salvar pedido iFood no Supabase.")
    else:
        print("[AVISO] Supabase nao configurado. Enviando pedido para o Webhook Flask local (SQLite)...")
        try:
            import requests
            res = requests.post("http://localhost:5000/api/webhook/web", json=pedido_ifood, timeout=5)
            if res.status_code in [200, 201]:
                print("[OK] Pedido enviado com sucesso para o backend Flask local!")
            else:
                print(f"[AVISO] Servidor Flask nao respondeu no localhost:5000 ({res.status_code}). Pedido exibido apenas no console.")
        except Exception as e:
            print(f"[AVISO] Nao foi possivel conectar ao Flask em http://localhost:5000/api/webhook/web ({e}). Dados processados no console.")


async def main():
    """
    Executa a automação Playwright em modo Headless.
    """
    print("[OK] Iniciando automacao Playwright para escutar pedidos do iFood (Modo Headless)...")

    async with async_playwright() as p:
        # Lança o navegador Chromium em modo headless (sem interface gráfica visível)
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        # Para fins de demonstração e teste offline, carregamos a página simulada iFood.
        # Em produção, usaria: await page.goto("https://gestordepedidos.ifood.com.br")
        await page.set_content(MOCK_IFOOD_HTML)

        # Processa o pedido capturado no DOM
        await processar_notificacao_ifood(page)

        # Encerra o navegador
        await browser.close()
        print("[OK] Automacao Playwright concluida com sucesso.")


if __name__ == "__main__":
    asyncio.run(main())
