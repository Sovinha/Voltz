import unittest
import json
from app import app, get_db_connection, init_local_db

class TestNewDeliveryFeatures(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True
        init_local_db()

    def test_full_delivery_flow(self):
        # 1. Cria pedido via webhook Cardápio Web
        payload = {
            "id_externo": "WEB-TEST-99",
            "nome_cliente": "Carlos Silva",
            "telefone_cliente": "83988776655",
            "endereco_entrega": "Av. Epitácio Pessoa, 1200 - Tambaú, João Pessoa",
            "latitude": -7.1155,
            "longitude": -34.8601,
            "itens": [{"nome": "Pizza Calabresa", "quantidade": 1, "preco_unitario": 45.0}],
            "valor_total": 45.0
        }
        res_create = self.app.post("/api/webhook/web", data=json.dumps(payload), content_type="application/json")
        self.assertEqual(res_create.status_code, 201)
        data_create = json.loads(res_create.data)
        pedido_id = data_create["pedido"]["id"]

        # 2. Despacha o pedido e aloca entregador
        despacho_payload = {
            "entregador_id": "d1",
            "entregador_nome": "ANDERSON (Moto 01)",
            "telefone_cliente": "83988776655"
        }
        res_despacho = self.app.post(f"/api/pedidos/{pedido_id}/despachar", data=json.dumps(despacho_payload), content_type="application/json")
        self.assertEqual(res_despacho.status_code, 200)
        data_despacho = json.loads(res_despacho.data)
        
        self.assertIn("codigo_confirmacao", data_despacho)
        self.assertEqual(len(data_despacho["codigo_confirmacao"]), 4)
        self.assertIn("link_rastreio", data_despacho)
        self.assertIn("mensagem_whatsapp", data_despacho)
        pin_code = data_despacho["codigo_confirmacao"]
        print(f"[TEST PASS] PIN gerado com sucesso: {pin_code}")
        print(f"[TEST PASS] Link de Rastreio: {data_despacho['link_rastreio']}")

        # 3. Teste de Rastreamento de GPS do Motoboy a < 500m (Proximidade)
        # Coordenadas a ~300 metros do cliente (-7.1155, -34.8601)
        gps_payload = {
            "pedido_id": pedido_id,
            "latitude": -7.1170,
            "longitude": -34.8601
        }
        res_gps = self.app.post("/api/motoboy/localizacao", data=json.dumps(gps_payload), content_type="application/json")
        self.assertEqual(res_gps.status_code, 200)
        data_gps = json.loads(res_gps.data)
        self.assertGreater(len(data_gps["alertas_proximidade"]), 0)
        msg_prox = data_gps['alertas_proximidade'][0]['mensagem']
        print(f"[TEST PASS] Alerta de proximidade disparado com sucesso! Mensagem: {msg_prox.encode('ascii', 'ignore').decode('ascii')}")

        # 4. Confirmação por código PIN incorreto
        res_pin_fail = self.app.post(f"/api/pedidos/{pedido_id}/confirmar-pin", data=json.dumps({"codigo_pin": "0000"}), content_type="application/json")
        self.assertEqual(res_pin_fail.status_code, 400)
        print("[TEST PASS] Validação de PIN incorreto bloqueou entrega com sucesso!")

        # 5. Confirmação por código PIN correto
        res_pin_ok = self.app.post(f"/api/pedidos/{pedido_id}/confirmar-pin", data=json.dumps({"codigo_pin": pin_code}), content_type="application/json")
        self.assertEqual(res_pin_ok.status_code, 200)
        print("[TEST PASS] Validação de PIN correto finalizou entrega com sucesso!")

if __name__ == "__main__":
    unittest.main()
