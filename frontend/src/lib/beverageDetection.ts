/**
 * Utilitário para detecção de Bebidas e Sobremesas nos pedidos do Voltz Logistics.
 * Identifica itens refrigerados/gelados para alertar motoboys e operadores na comanda e no app.
 */

export interface ItemPedido {
  nome: string;
  quantidade: number;
  preco_unitario?: number;
  observacao?: string;
  [key: string]: any;
}

const BEVERAGE_KEYWORDS = [
  'coca', 'coca-cola', 'guarana', 'guaraná', 'refrigerante', 'refri', 'suco', 'agua', 'água',
  'cerveja', 'lata', '600ml', '2l', '1.5l', '350ml', '500ml', 'bebida', 'pepsi', 'fanta',
  'sprite', 'monster', 'red bull', 'chá', 'cha', 'h2oh', 'tonica', 'tônica', 'ice tea',
  'heineken', 'stella', 'skol', 'brahma', 'amstel', 'eisenbahn', 'long neck', 'suco natural',
  'del valle', 'kapo', 'matte', 'redbull', 'soda'
];

const DESSERT_KEYWORDS = [
  'sobremesa', 'pudim', 'torta', 'sorvete', 'brownie', 'petit gateau', 'acai', 'açaí',
  'doce', 'mousse', 'cheesecake', 'brigadeiro', 'chocolat', 'churros', 'tiramisu',
  'tiramisù', 'panna cotta', 'pavê', 'pave', 'gelato', 'palha italiana', 'milkshake',
  'milk-shake', 'cupcake', 'donuts', 'donut'
];

/**
 * Verifica se um nome de item é bebida.
 */
export function isBeverageItem(nomeItem: string): boolean {
  if (!nomeItem) return false;
  const lower = nomeItem.toLowerCase();
  return BEVERAGE_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Verifica se um nome de item é sobremesa.
 */
export function isDessertItem(nomeItem: string): boolean {
  if (!nomeItem) return false;
  const lower = nomeItem.toLowerCase();
  return DESSERT_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Analisa a lista de itens de um pedido e retorna informações detalhadas.
 */
export function analyzeOrderItems(itens: ItemPedido[] | null | undefined) {
  if (!Array.isArray(itens) || itens.length === 0) {
    return {
      hasBeverage: false,
      hasDessert: false,
      beverages: [] as ItemPedido[],
      desserts: [] as ItemPedido[],
      hasSpecialItems: false,
    };
  }

  const beverages: ItemPedido[] = [];
  const desserts: ItemPedido[] = [];

  itens.forEach((item) => {
    if (isBeverageItem(item.nome)) {
      beverages.push(item);
    } else if (isDessertItem(item.nome)) {
      desserts.push(item);
    }
  });

  return {
    hasBeverage: beverages.length > 0,
    hasDessert: desserts.length > 0,
    beverages,
    desserts,
    hasSpecialItems: beverages.length > 0 || desserts.length > 0,
  };
}
