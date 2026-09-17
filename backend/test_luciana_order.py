import unittest
import json
from app import app, init_local_db

class TestLucianaOrder(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True
        init_local_db()

    def test_luciana_order_creation(self):
        payload = {
            "id_externo": "117 (iFood #0778)",
            "origem": "ifood",
            "nome_cliente": "LUCIANA SOUZA",
            "telefone_cliente": "0800 700 3020",
            "endereco_entrega": "R. Silvino Lopes, 380, Apt 1002 - Tambaú, João Pessoa (58039-190) - Próx. Colégio Motiva Ambiental",
            "latitude": -7.1150,
            "longitude": -34.8250,
            "itens": [
                {
                    "nome": "Parmegiana de Carne Individual (Arroz e Purê)",
                    "quantidade": 1,
                    "preco_unitario": 55.90
                }
            ],
            "valor_total": 57.02,
            "codigo_confirmacao": "2775",
            "status": "pendente"
        }
        res = self.app.post("/api/webhook/web", data=json.dumps(payload), content_type="application/json")
        self.assertEqual(res.status_code, 201)
        data = json.loads(res.data)
        print(f"[SUCCESS] Pedido iFood #117 da Luciana Souza inserido com sucesso! ID: {data['pedido']['id']}")
        print(f"[SUCCESS] Nome: {data['pedido']['nome_cliente']}, Total: R$ {data['pedido']['valor_total']}, PIN: {data['pedido'].get('codigo_confirmacao', '2775')}")

if __name__ == "__main__":
    unittest.main()
