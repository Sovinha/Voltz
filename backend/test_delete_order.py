import unittest
import json
from app import app, init_local_db, get_db_connection

class TestDeleteOrder(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True
        init_local_db()

    def test_delete_order(self):
        # 1. Cria um pedido temporário
        payload = {
            "id_externo": "DEL-TEMP-10",
            "origem": "web",
            "nome_cliente": "Cliente Para Deletar",
            "endereco_entrega": "R. Teste Delete, 100 - João Pessoa",
            "itens": [{"nome": "Pizza Teste", "quantidade": 1, "preco_unitario": 30.0}],
            "valor_total": 30.0
        }
        res_create = self.app.post("/api/webhook/web", data=json.dumps(payload), content_type="application/json")
        self.assertEqual(res_create.status_code, 201)
        pedido_id = json.loads(res_create.data)["pedido"]["id"]

        # 2. Deleta o pedido via DELETE /api/pedidos/<id>
        res_del = self.app.delete(f"/api/pedidos/{pedido_id}")
        self.assertEqual(res_del.status_code, 200)
        data_del = json.loads(res_del.data)
        self.assertEqual(data_del["status"], "success")
        print(f"[TEST PASS] Endpoint DELETE /api/pedidos/{pedido_id} executado com sucesso!")

        # 3. Verifica se o pedido foi removido da base
        conn = get_db_connection()
        row = conn.execute("SELECT * FROM pedidos WHERE id = ?", (pedido_id,)).fetchone()
        conn.close()
        self.assertIsNone(row)
        print("[TEST PASS] Confirmação de exclusão do banco de dados verificada com sucesso!")

if __name__ == "__main__":
    unittest.main()
