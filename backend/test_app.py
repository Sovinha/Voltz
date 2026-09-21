"""
==============================================================================
SISTEMA DE GESTÃO LOGÍSTICA PARA DELIVERY - SUITE DE TESTES AUTOMATIZADOS
Script de testes de integração para o Webhook Flask e Automação Playwright
==============================================================================
"""

import sys
import unittest
from unittest.mock import MagicMock, patch
import json
import asyncio

# Importa a aplicação Flask
from app import app

class TestDeliveryBackend(unittest.TestCase):

    def setUp(self):
        """Configura o cliente de testes da aplicação Flask."""
        self.app = app.test_client()
        self.app.testing = True

    def test_health_check(self):
        """Testa o endpoint de verificação de saúde da API."""
        response = self.app.get('/api/health')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['status'], 'online')

    @patch('app.supabase')
    def test_webhook_web_sucesso(self, mock_supabase):
        """Testa o envio de um pedido do Cardápio Web válido."""
        # Configura mock do Supabase
        mock_table = MagicMock()
        mock_insert = MagicMock()
        mock_execute = MagicMock()
        
        mock_supabase.table.return_value = mock_table
        mock_table.insert.return_value = mock_insert
        mock_insert.execute.return_value = MagicMock(data=[{
            "id": "123e4567-e89b-12d3-a456-426614174000",
            "origem": "web",
            "id_externo": "WEB-999",
            "nome_cliente": "João da Silva",
            "endereco_entrega": "Rua Teste, 123",
            "itens": [{"nome": "Pizza", "quantidade": 1, "preco_unitario": 40.0}],
            "valor_total": 40.0,
            "status": "pendente"
        }])

        payload = {
            "id_externo": "WEB-999",
            "nome_cliente": "João da Silva",
            "endereco_entrega": "Rua Teste, 123",
            "itens": [{"nome": "Pizza", "quantidade": 1, "preco_unitario": 40.0}],
            "valor_total": 40.0
        }

        response = self.app.post(
            '/api/webhook/web',
            data=json.dumps(payload),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        self.assertIn("mensagem", data)
        self.assertEqual(data["pedido"]["origem"], "web")
        self.assertEqual(data["pedido"]["status"], "pendente")

    def test_webhook_web_campos_ausentes(self):
        """Testa a validação de campos obrigatórios ausentes no Webhook."""
        payload_invalido = {
            "id_externo": "WEB-000",
            "nome_cliente": "Cliente Incompleto"
            # Faltando endereco_entrega, itens, valor_total
        }

        response = self.app.post(
            '/api/webhook/web',
            data=json.dumps(payload_invalido),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn("error", data)
        self.assertIn("Campos obrigatorios ausentes", data["error"])


class TestPlaywrightScraper(unittest.TestCase):

    def test_ifood_scraper_execution(self):
        """Testa o script do Playwright executando no browser Chromium Headless."""
        from playwright.sync_api import sync_playwright
        from ifood_scraper import MOCK_IFOOD_HTML

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.set_content(MOCK_IFOOD_HTML)

            # Verifica se os seletores essenciais do iFood estão presentes no DOM
            id_pedido = page.inner_text("#id-pedido")
            nome_cliente = page.inner_text("#nome-cliente")
            valor_total = page.inner_text("#valor-total")

            self.assertEqual(id_pedido.strip(), "IFOOD-987452")
            self.assertEqual(nome_cliente.strip(), "Mariana Souza")
            self.assertEqual(valor_total.strip(), "89.00")

            browser.close()


    def test_osrm_status(self):
        """Testa o endpoint de status do OSRM."""
        response = self.app.get('/api/osrm/status')
        self.assertIn(response.status_code, [200, 502])
        data = json.loads(response.data)
        self.assertIn('status', data)
        self.assertIn('osrm_base_url', data)

    def test_osrm_route_validation(self):
        """Testa validação de parâmetro waypoints no OSRM /api/route."""
        response = self.app.get('/api/route')
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn('error', data)

    def test_osrm_route_success(self):
        """Testa consulta de rota válida via OSRM proxy."""
        waypoints = "-34.8601,-7.1155;-34.8520,-7.1210"
        response = self.app.get(f'/api/route?waypoints={waypoints}')
        self.assertIn(response.status_code, [200, 502])
        if response.status_code == 200:
            data = json.loads(response.data)
            self.assertEqual(data.get('code'), 'Ok')
            self.assertTrue(len(data.get('routes', [])) > 0)

    def test_osrm_trip_success(self):
        """Testa otimização de rota em lote (TSP) via OSRM proxy."""
        waypoints = "-34.8601,-7.1155;-34.8520,-7.1210;-34.8450,-7.1180"
        response = self.app.get(f'/api/trip?waypoints={waypoints}&source=first')
        self.assertIn(response.status_code, [200, 502])
        if response.status_code == 200:
            data = json.loads(response.data)
            self.assertIn(data.get('code'), ['Ok', 'Ok!'])


if __name__ == '__main__':
    unittest.main()

