import re
import json
import sqlite3
import os
import random

# Raw TSV dataset provided by user
raw_tsv_data = """Número do pedido	Id do pedido	Cliente	Telefone	Data de criação	Início do preparo	Pedido pronto	Pedido fechado	Produtos	Total de itens	Método de pagamento	Status	Tipo	Canal	Taxa de entrega	Taxa de serviço	Taxa adicional	Acréscimo da maquineta	Desconto	Total do pedido	Troco para	Código externo do pedido	Rua	Número	Bairro	Complemento	Cidade	Estado	CEP
1	281823462	Lucca Sousa		01/10/2026 10:46:52	01/10/2026 10:46:54	01/10/2026 11:10:01	01/10/2026 11:19:37	1.0 x         1.0 x Arroz e Fritas  	1	iFood	Concluído	Delivery	iFood	R$ 7,00	R$ 0,00	R$ 0,99	R$ 0,00	R$ 15,00	R$ 31,89	R$ 0,00	3995	R. Maria José da Conceição	93	Bairro dos Ipês	Casa	João Pessoa	PB	0
2	281823594	Marina Freire		01/10/2026 10:47:22	01/10/2026 10:47:23	01/10/2026 11:23:09	01/10/2026 11:25:35	1.0 x         1.0 x Espaguete e Purê  	1	iFood	Concluído	Delivery	iFood	R$ 12,90	R$ 0,00	R$ 0,99	R$ 0,00	R$ 10,00	R$ 47,79	R$ 0,00	6410	R. Dr. Mirocene Fernando da Cunha Lima	105	Bessa	301	João Pessoa	PB	0
3	281823595	Brenda Duarte		01/10/2026 10:47:22	01/10/2026 10:47:27	01/10/2026 11:01:53	01/10/2026 11:16:05	1.0 x         1.0 x Espaguete e Fritas  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 18,66	R$ 28,22	R$ 0,00	1037	R. José Cavalcanti Chaves	243	Expedicionários	ap 904 - ed. clara lemos	João Pessoa	PB	58041090
4	281823823	Daphne  Elisa		01/10/2026 10:48:23	01/10/2026 10:48:24	01/10/2026 11:12:26	01/10/2026 11:18:26	1.0 x Combo: Frango Baby + Coca-Cola        1.0 x Arroz e Fritas      1.0 x Refrigerante Zero Açucar Coca-Cola 220ml  	1	iFood, iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 16,99	R$ 34,89	R$ 0,00	1429	R. Juíz Ovídio Gouvêia	s/n	Pedro Gondim	autoclub honda	Joao Pessoa	PB	0
5	281824184	Afonso Ferrari		01/10/2026 10:49:53	01/10/2026 10:49:54	01/10/2026 11:01:59	01/10/2026 11:22:09	1.0 x         1.0 x Espaguete      1.0 x Enviar talher descartável  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 14,99	R$ 33,38	R$ 0,00	7593	R. Manoel Gualberto	255	Miramar		João Pessoa	PB	58043150
6	281824443	Ana Carolina Correia Gomes		01/10/2026 10:50:54	01/10/2026 10:50:55	01/10/2026 11:01:56	01/10/2026 11:13:25	1.0 x         1.0 x Espaguete e Fritas      1.0 x Coca-Cola Zero 01 L  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 2,49	R$ 0,00	R$ 0,00	R$ 189,38	R$ 0,00	9578	R. Saffa Said Abel da Cunha	89	Tambauzinho	Apt 103	João Pessoa	PB	58042220
7	281825725	Ewerton Gea		01/10/2026 10:55:26	01/10/2026 10:55:28	01/10/2026 11:14:30	01/10/2026 11:23:58	1.0 x         1.0 x Filé - Arroz e Purê      1.0 x Coca-Cola Zero Lata      1.0 x Doce de Leite com Chocolate Embalagem 90g  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 1,36	R$ 0,00	R$ 11,99	R$ 64,56	R$ 0,00	8125	Av. Acre	297	Estados	Apto 102	João Pessoa	PB	0
8	281825727	Diego Rodrigues		01/10/2026 10:55:26	01/10/2026 10:55:31	01/10/2026 11:16:00	01/10/2026 11:34:27	1.0 x Combo: Frango Baby + Coca-Cola        1.0 x Espaguete e Fritas      1.0 x Refrigerante Zero Açucar Coca-Cola 220ml  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 16,99	R$ 34,89	R$ 0,00	8246	R. Aviador Mário Vieira de Melo	1440	João Agripino	Fórum	Joao Pessoa	PB	0
9	281826128	Ana Clara Nunes Fernandes		01/10/2026 10:56:57	01/10/2026 10:56:58	01/10/2026 11:02:03	01/10/2026 11:22:27	1.0 x Combo: Frango Baby + Coca-Cola        1.0 x Espaguete e Fritas      1.0 x Refrigerante Zero Açucar Coca-Cola 220ml  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 16,99	R$ 34,89	R$ 0,00	7470	R. Manoel Gualberto	255	Miramar		João Pessoa	PB	0
10	281827979	Gabriela Samara		01/10/2026 11:02:29	01/10/2026 11:02:31	01/10/2026 11:14:27	01/10/2026 11:32:38	1.0 x         1.0 x Espaguete  1.0 x         1.0 x Arroz e Fritas  	2	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 1,24	R$ 0,00	R$ 22,99	R$ 63,04	R$ 0,00	532	R. João Câmara	224	Treze de Maio	Apto 303	João Pessoa	PB	58025100
11	281828206	Maria Eduarda  Lima		01/10/2026 11:03:00	01/10/2026 11:03:01	01/10/2026 11:05:40	01/10/2026 11:21:39	1.0 x         1.0 x Arroz e Fritas  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 14,99	R$ 31,89	R$ 0,00	1874	R. Manoel Gualberto	255	Miramar	Medway	João Pessoa	PB	58043150
12	281828646	Kaio Araújo		01/10/2026 11:04:00	01/10/2026 11:04:02	01/10/2026 11:38:04	01/10/2026 11:59:57	1.0 x         1.0 x Arroz e Salada  	1	Cartão de crédito	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 14,99	R$ 31,89	R$ 0,00	2769	Av. Carneiro da Cunha	97	Torre	Clínica Cuidar Saúde	João Pessoa	PB	0
13	281829508	TAINA COIMBRA		01/10/2026 11:06:01	01/10/2026 11:06:02	01/10/2026 11:13:34	01/10/2026 11:29:42	1.0 x         1.0 x Arroz e Fritas  	1	iFood	Concluído	Delivery	iFood	R$ 9,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 7,00	R$ 42,88	R$ 0,00	1422	Av. Pres. Getúlio Vargas	47	Centro	Dataprev	João Pessoa	PB	0
14	281829511	Ana Berenice Monteiro Ferreira		01/10/2026 11:06:01	01/10/2026 11:06:06	01/10/2026 11:12:33	01/10/2026 11:29:13	1.0 x Combo: Carne Baby + Coca-Cola        1.0 x Espaguete e Fritas      1.0 x Refrigerante Zero Açucar Coca-Cola 220ml  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 16,99	R$ 39,89	R$ 0,00	8774	Rua Helena Meira Lima	300	Tambaú	Clínica	João Pessoa	PB	58039130
15	281830248	Maria Eduarda Aragão		01/10/2026 11:07:31	01/10/2026 11:07:33	01/10/2026 11:15:54	01/10/2026 11:27:41	1.0 x         1.0 x Espaguete  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 14,99	R$ 31,89	R$ 0,00	4740	Av. Pres. Epitácio Pessoa	2930	Tambauzinho	Sala 908 - ONYE	João Pessoa	PB	58042006
16	281830734	FABIOLA MARIAH		01/10/2026 11:08:32	01/10/2026 11:08:34	01/10/2026 11:12:30	01/10/2026 11:25:21	1.0 x         1.0 x Espaguete e Purê  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 16,99	R$ 34,89	R$ 0,00	5177	R. Profa. Maria Sales	444	Tambaú	Unimama	João Pessoa	PB	58039130
17	281830735	JOÃO AZEVEDO		01/10/2026 11:08:33	01/10/2026 11:08:38	01/10/2026 11:14:32	01/10/2026 11:27:11	1.0 x Combo: Frango Baby + Coca-Cola        1.0 x Espaguete e Fritas      1.0 x Refrigerante Zero Açucar Coca-Cola 220ml  	1	Cartão de crédito	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 18,84	R$ 33,04	R$ 0,00	441	R. Profa. Margarida Medeiros	76	Bairro dos Ipês	casa	João Pessoa	PB	58028410
18	281830938	Gustavo Dantas		01/10/2026 11:09:02	01/10/2026 11:09:04	01/10/2026 11:28:55	01/10/2026 11:39:41	1.0 x Combo: Carne Baby + Coca-Cola        1.0 x Espaguete e Fritas      1.0 x Refrigerante Zero Açucar Coca-Cola 220ml  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 16,99	R$ 39,89	R$ 0,00	9025	R. Antônio Régis de Brito	15	Pedro Gondim	Foccus workplay	João Pessoa	PB	58031106
19	281830940	Alana Monteiro		01/10/2026 11:09:03	01/10/2026 11:09:08	01/10/2026 11:15:46	01/10/2026 11:22:37	1.0 x         1.0 x Espaguete  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 16,99	R$ 34,89	R$ 0,00	2993	R. Orestes Lisboa	0	Pedro Gondim	Funad	João Pessoa	PB	58031090
20	281831373	EMILLY SOARES		01/10/2026 11:10:01	01/10/2026 11:10:02	01/10/2026 11:15:57	01/10/2026 11:38:47	1.0 x Combo: Frango Baby + Coca-Cola        1.0 x Arroz e Fritas      1.0 x Refrigerante Zero Açucar Coca-Cola 220ml  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 16,99	R$ 34,89	R$ 0,00	8640	R. Catulo da Paixão Cearense	101	Brisamar	Casa	João Pessoa	PB	58033060
21	281831640	ALECIO SAMPAIO		01/10/2026 11:10:35	01/10/2026 11:10:36	01/10/2026 11:12:28	01/10/2026 11:32:33	1.0 x         1.0 x Arroz e Purê      1.0 x Coca-Cola sem Açúcar Lata 350ml  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 14,99	R$ 37,88	R$ 0,00	3162	Av. Olinda	292	Tambaú	Terreo	João Pessoa	PB	0
22	281832389	Gabriella M De Barros		01/10/2026 11:12:04	01/10/2026 11:12:06	01/10/2026 11:14:23	01/10/2026 11:21:39	1.0 x         1.0 x Espaguete e Fritas      1.0 x Coca-Cola sem Açúcar Lata 350ml  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 14,99	R$ 37,88	R$ 0,00	9745	Av. Bahia	703	Estados	Exate Soluções Contábeis	João Pessoa	PB	0
23	281832394	NATHALLYA MELO		01/10/2026 11:12:04	01/10/2026 11:12:10	01/10/2026 11:38:10	01/10/2026 12:04:01	1.0 x         1.0 x Espaguete e Purê  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 17,75	R$ 39,13	R$ 0,00	154	Av. Pres. Epitácio Pessoa	630	Torre	Loja	João Pessoa	PB	58040000
24	281832613	Gabriel Nogueira		01/10/2026 11:12:34	01/10/2026 11:12:36	01/10/2026 11:28:52	01/10/2026 11:37:01	1.0 x         1.0 x Espaguete e Purê  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 14,99	R$ 31,89	R$ 0,00	6592	R. Gustavo Torres Trocolli	67	Pedro Gondim	Empresa	João Pessoa	PB	58031144
25	281834865	Rafaela Azevedo Brasileiro		01/10/2026 11:17:06	01/10/2026 11:17:07	01/10/2026 11:41:18	01/10/2026 11:56:25	1.0 x Combo: Frango Baby + Coca-Cola        1.0 x Espaguete e Fritas      1.0 x Sprite Original 220ml  	1	iFood	Concluído	Delivery	iFood	R$ 7,00	R$ 0,00	R$ 0,99	R$ 0,00	R$ 17,00	R$ 34,89	R$ 0,00	4930	Av. Dom Pedro II	1826	Torre	Secretaria de saúde do estado da Paraíba	João Pessoa	PB	58040440
26	281835416	CADYDJA SILVA 		01/10/2026 11:18:06	01/10/2026 11:18:08	01/10/2026 11:28:59	01/10/2026 11:52:46	1.0 x         1.0 x Espaguete e Fritas  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 14,99	R$ 31,89	R$ 0,00	1224	Rod. Gov. Antonio Mariz	2051	Lot. Oceania III	Torre Norte Andar 24	João Pessoa	PB	0
27	281835672	Danuthe  Nery		01/10/2026 11:18:37	01/10/2026 11:18:38	01/10/2026 11:48:52	01/10/2026 12:01:27	2.0 x         1.0 x Espaguete e Fritas  	2	iFood	Concluído	Delivery	iFood	R$ 7,00	R$ 0,00	R$ 1,36	R$ 0,00	R$ 27,00	R$ 69,16	R$ 0,00	4183	Av. Dom Pedro II	1548	Jaguaribe	Dani do financeiro	João Pessoa	PB	58013420
28	281835675	José Lucas Cardoso		01/10/2026 11:18:37	01/10/2026 11:18:42	01/10/2026 11:39:42	01/10/2026 11:48:52	1.0 x         1.0 x Arroz e Fritas  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 16,99	R$ 34,89	R$ 0,00	8104	Av. Carlos de Barros	228	Miramar	2001	João Pessoa	PB	58043070
29	281835676	Gilberto Lobo		01/10/2026 11:18:37	01/10/2026 11:18:46	01/10/2026 11:28:49	01/10/2026 11:33:14	1.0 x Combo: Frango Baby + Coca-Cola        1.0 x Espaguete e Fritas      1.0 x Coca-Cola 220ml  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 16,99	R$ 34,89	R$ 0,00	4687	Av. Espírito Santo	883	Estados	Casa	João Pessoa	PB	0
30	281836452	Lucas Castro	83988439934	01/10/2026 11:20:07	01/10/2026 11:20:09	01/10/2026 11:38:07	01/10/2026 11:46:51	1.0 x         1.0 x Espaguete e Fritas  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 14,99	R$ 31,89	R$ 0,00	9286	Av. Júlia Freire	1200	Expedicionários	Empresarial Metropolitan 1° Andar Sala 110 - Esfera Coworking	João Pessoa	PB	0
31	281836455	TAHISA CAVALCANTI		01/10/2026 11:20:08	01/10/2026 11:20:13	01/10/2026 11:39:45	01/10/2026 11:56:07	1.0 x         1.0 x Espaguete      1.0 x Coca-Cola sem Açúcar Lata 350ml  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 14,99	R$ 37,88	R$ 0,00	2286	R. Armando Vasconcelos	19	Miramar	Centro Jean Laplanche	João Pessoa	PB	0
32	281836734	Yasmim Silva		01/10/2026 11:20:37	01/10/2026 11:20:39	01/10/2026 11:39:48	01/10/2026 11:52:23	1.0 x         1.0 x Arroz e Fritas  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 27,99	R$ 26,89	R$ 0,00	4810	R. Dr. Hermance Paiva	200	Miramar	Hospital Residencial	João Pessoa	PB	0
33	281836739	Beatriz Guedes		01/10/2026 11:20:38	01/10/2026 11:20:43	01/10/2026 11:59:57	01/10/2026 12:10:20	1.0 x         1.0 x Espaguete e Fritas  	1	iFood	Concluído	Delivery	iFood	R$ 10,90	R$ 0,00	R$ 0,99	R$ 0,00	R$ 10,00	R$ 40,79	R$ 0,00	1596	Av. Gov. Argemiro de Figueiredo	2405	Bessa	Sala 103	João Pessoa	PB	58037030
34	281836978	Isabele Santos		01/10/2026 11:21:08	01/10/2026 11:21:10	01/10/2026 11:43:21	01/10/2026 12:18:42	1.0 x Combo: Frango Baby + Coca-Cola        1.0 x Espaguete e Fritas      1.0 x Fanta Laranja 220ml  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 16,99	R$ 34,89	R$ 0,00	4300	R. Empresario Clovis Rolim	2001	Brisamar	SmartSun	João Pessoa	PB	58033454
35	281836983	Sonhar Colchoes		01/10/2026 11:21:09	01/10/2026 11:21:14	01/10/2026 11:39:39	01/10/2026 11:45:50	1.0 x         1.0 x Espaguete e Fritas  	1	iFood, iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 14,99	R$ 31,89	R$ 0,00	5886	Av. Pres. Epitácio Pessoa	2668	Tambauzinho	Loja sonhar colchões	João Pessoa	PB	58042006
36	281837253	RENATO		01/10/2026 11:21:39	01/10/2026 11:21:41	01/10/2026 11:38:15	01/10/2026 11:43:19	1.0 x         1.0 x Arroz e Purê      1.0 x Refrigerante sem Açúcar Coca-Cola 350ml      1.0 x Enviar talher descartável  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 17,37	R$ 49,99	R$ 0,00	2554	R. Amapá	63	Estados	casa branca com portão azul	João Pessoa	PB	58030290
37	281838342	Thayse Brito		01/10/2026 11:23:40	01/10/2026 11:23:41	01/10/2026 11:43:13	01/10/2026 11:49:04	1.0 x         1.0 x Espaguete e Fritas  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 14,99	R$ 31,89	R$ 0,00	1137	R. João Vieira Carneiro	645	Pedro Gondim	Ap 1701	João Pessoa	PB	58031080
38	281839730	Luana  Cavalcanti		01/10/2026 11:26:11	01/10/2026 11:26:12	01/10/2026 11:43:16	01/10/2026 12:06:48	1.0 x         1.0 x Espaguete e Fritas  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 17,49	R$ 29,39	R$ 0,00	7891	Av. Minas Gerais	323	Estados	Escola	João Pessoa	PB	0
39	281840018	Iasmin Barbalho		01/10/2026 11:26:41	01/10/2026 11:26:43	01/10/2026 11:43:19	01/10/2026 12:13:09	1.0 x Combo: Carne Baby + Coca-Cola        1.0 x Arroz e Purê      1.0 x Fanta Laranja 220ml  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 19,21	R$ 37,67	R$ 0,00	9960	Tv. Melvin Jones	123	Bairro dos Ipês	Casa	João Pessoa	PB	58027455
40	281840022	WALESKA IMPERIANO		01/10/2026 11:26:41	01/10/2026 11:26:46	01/10/2026 11:41:18	01/10/2026 12:09:06	1.0 x         1.0 x Espaguete  	1	iFood	Concluído	Delivery	iFood	R$ 16,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 12,22	R$ 54,66	R$ 0,00	9800	Av. Cruz das Armas	1280	Cruz das Armas		João Pessoa	PB	58085000
41	281840043	Jessica Morais	83996071338	01/10/2026 11:26:43	01/10/2026 11:26:50	01/10/2026 12:10:37	01/10/2026 12:11:26	1.0 x Parmegiana de Frango GRANDE    Escolha o acompanhamento:     1.0 x Espaguete e Purê  	1	Cartão de crédito online	Concluído	Delivery	Site	R$ 11,50	R$ 0,00	R$ 0,00	R$ 0,00	R$ 0,00	R$ 121,90	R$ 0,00		Rua Professora Maria Lianza	1117	Jardim Cidade Universitária	Apto 302 res antonio maia	João Pessoa	PB	58052320
42	281841188	Ana Paula Lopes		01/10/2026 11:28:42	01/10/2026 11:28:43	01/10/2026 12:09:19	01/10/2026 12:25:30	1.0 x Combo: Frango Baby + Coca-Cola        1.0 x Arroz e Purê      1.0 x Fanta Laranja 220ml  	1	iFood	Concluído	Delivery	iFood	R$ 7,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 17,99	R$ 34,89	R$ 0,00	1529	Av. João Câncio da Silva	880	Manaíra	Drogasil	João Pessoa	PB	0
43	281841190	Priscila  Rufino Gomes		01/10/2026 11:28:42	01/10/2026 11:28:47	01/10/2026 11:55:28	01/10/2026 12:01:06	1.0 x         1.0 x Arroz e Salada  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 1,12	R$ 0,00	R$ 16,87	R$ 57,14	R$ 0,00	2272	R. Prof. José Gama Prado	170	Pedro Gondim	Casa muro de pedra	João Pessoa	PB	58031060
44	281841193	Julianna Teixeira		01/10/2026 11:28:42	01/10/2026 11:28:51	01/10/2026 11:55:37	01/10/2026 12:11:07	1.0 x Combo: Frango Baby + Coca-Cola        1.0 x Espaguete e Fritas      1.0 x Coca-Cola 220ml  	1	iFood, iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 18,99	R$ 32,89	R$ 0,00	8418	R. Dep. José Mariz	465	Tambauzinho	Trads corretora	João Pessoa	PB	58043004
45	281841462	Rodrigo Silva 		01/10/2026 11:29:12	01/10/2026 11:29:14	01/10/2026 11:59:57	01/10/2026 12:10:25	1.0 x         1.0 x Espaguete  1.0 x         1.0 x Arroz e Purê  	2	iFood	Concluído	Delivery	iFood	R$ 12,90	R$ 0,00	R$ 1,74	R$ 0,00	R$ 10,76	R$ 101,68	R$ 0,00	7103	R. Silvano Domingos de Araújo	41	Jardim Oceania	802A	João Pessoa	PB	0
46	281841723	ANGELICA		01/10/2026 11:29:42	01/10/2026 11:29:44	01/10/2026 11:49:51	01/10/2026 12:05:04	1.0 x         1.0 x Arroz e Fritas  	1	iFood	Concluído	Delivery	iFood	R$ 9,90	R$ 0,00	R$ 1,12	R$ 0,00	R$ 9,88	R$ 67,04	R$ 0,00	5651	Av. Cabo Branco	3008	Cabo Branco	401 B	João Pessoa	PB	0
47	281842011	Maria Eduarda  Zumbé Gomes		01/10/2026 11:30:12	01/10/2026 11:30:14	01/10/2026 11:55:26	01/10/2026 12:03:09	1.0 x         1.0 x Arroz e Fritas  	1	iFood, iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 14,99	R$ 32,89	R$ 0,00	8189	Av. Paraíba	45	Estados		João Pessoa	PB	0
48	281842909	maria eduarda		01/10/2026 11:31:43	01/10/2026 11:31:45	01/10/2026 11:55:31	01/10/2026 12:14:09	1.0 x Combo: Frango Baby + Coca-Cola        1.0 x Espaguete e Fritas      2.0 x Enviar talher descartável      1.0 x Refrigerante Zero Açucar Coca-Cola 220ml  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 17,96	R$ 36,90	R$ 0,00	1482	Av. Sen. Ruy Carneiro	860	Miramar	memorial santa luzia	João Pessoa	PB	0
49	281844847	Luciana Claudia		01/10/2026 11:35:15	01/10/2026 11:35:16	01/10/2026 12:04:00	01/10/2026 12:16:29	1.0 x Combo: Frango Baby + Coca-Cola        1.0 x Espaguete      1.0 x Coca-Cola 220ml  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 16,99	R$ 34,89	R$ 0,00	7506	Av. Goiás	740	Estados	Clinica	João Pessoa	PB	0
50	281844850	Edilson Lima		01/10/2026 11:35:15	01/10/2026 11:35:20	01/10/2026 11:48:52	01/10/2026 12:10:37	1.0 x Combo: Carne Baby + Coca-Cola        1.0 x Espaguete e Fritas      1.0 x Refrigerante Zero Açucar Coca-Cola 220ml  	1	iFood	Concluído	Delivery	iFood	R$ 21,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 10,00	R$ 61,88	R$ 0,00	5209	R. Horácio Trajano de Oliveira	1254	Cristo Redentor	Apartamento 94	João Pessoa	PB	58071160
51	281845127	Luana Macedo		01/10/2026 11:35:45	01/10/2026 11:35:46	01/10/2026 12:03:52	01/10/2026 12:19:52	1.0 x         1.0 x Espaguete e Purê  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 18,66	R$ 28,22	R$ 0,00	5620	Av. São Paulo	1222	Estados	Colégio knox	João Pessoa	PB	58030041
52	281846264	Isabella Ferreira		01/10/2026 11:37:46	01/10/2026 11:37:48	01/10/2026 12:16:40	01/10/2026 12:18:59	1.0 x         1.0 x Espaguete e Fritas  	1	iFood	Concluído	Delivery	iFood	R$ 7,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 18,75	R$ 39,13	R$ 0,00	3712	R. Nossa Sra. dos Navegantes	415	Tambaú	Sala 203	João Pessoa	PB	58039110
53	281846269	VICTOR HUGO ATHAYDE 		01/10/2026 11:37:46	01/10/2026 11:37:52	01/10/2026 12:19:42	01/10/2026 12:21:19	1.0 x         1.0 x Espaguete e Purê      1.0 x + Salada da Casa  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 16,99	R$ 40,79	R$ 0,00	5990	Av. Nossa Sra. de Fátima	1675	Torre	Loja prime tintas	João Pessoa	PB	58040380
54	281847151	Gabriel Bessa		01/10/2026 11:39:17	01/10/2026 11:39:18	01/10/2026 12:15:23	01/10/2026 12:26:34	1.0 x         1.0 x Frango - Espaguete      1.0 x Guaraná Antarctica Lata  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 1,10	R$ 0,00	R$ 16,99	R$ 45,90	R$ 0,00	5682	R. Antônio Rabelo Júnior	161	Miramar	1610 o andar	João Pessoa	PB	58032090
55	281847736	THAISE ANDRADE		01/10/2026 11:40:18	01/10/2026 11:40:19	01/10/2026 12:04:05	01/10/2026 12:13:08	1.0 x         1.0 x Espaguete e Fritas  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 16,99	R$ 29,89	R$ 0,00	8870	R. Desportista Aurélio Rocha	655	Pedro Gondim	Clínica Anna Gabriela	João Pessoa	PB	0
56	281848331	Sami Belfekir		01/10/2026 11:41:18	01/10/2026 11:41:19	01/10/2026 12:15:35	01/10/2026 12:34:12	2.0 x         1.0 x Arroz e Fritas  	2	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 1,24	R$ 0,00	R$ 22,99	R$ 63,04	R$ 0,00	6347	R. da Aurora	274	Miramar	Apto 704	João Pessoa	PB	58043270
57	281848611	BRUNO Kleber Ferreira Machado		01/10/2026 11:41:49	01/10/2026 11:41:50	01/10/2026 12:03:49	01/10/2026 12:10:05	1.0 x         1.0 x Espaguete e Fritas  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 14,99	R$ 31,89	R$ 0,00	869	R. Antônio Régis de Brito	15	Pedro Gondim		João Pessoa	PB	0
58	281848889	Andreza Lima		01/10/2026 11:42:19	01/10/2026 11:42:20	01/10/2026 12:05:35	01/10/2026 12:27:46	1.0 x         1.0 x Espaguete e Fritas      1.0 x Coca-Cola 01 L  	1	iFood	Concluído	Delivery	iFood	R$ 16,99	R$ 0,00	R$ 2,02	R$ 0,00	R$ 10,00	R$ 109,91	R$ 0,00	6152	R. Rangel Travassos	153	Varjão	103	João Pessoa	PB	0
59	281850037	Livya Kelly Vicente		01/10/2026 11:44:20	01/10/2026 11:44:21	01/10/2026 12:18:33	01/10/2026 12:32:49	1.0 x Combo: Frango Baby + Coca-Cola        1.0 x Espaguete e Fritas      1.0 x Refrigerante Zero Açucar Coca-Cola 220ml  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 16,99	R$ 34,89	R$ 0,00	2745	R. Dep. Geraldo Mariz	890	Tambauzinho		João Pessoa	PB	58042060
60	281850614	Nathaniely  Pontes Dias 		01/10/2026 11:45:20	01/10/2026 11:45:22	01/10/2026 12:09:15	01/10/2026 12:27:26	1.0 x         1.0 x Arroz e Fritas  	1	iFood	Concluído	Delivery	iFood	R$ 7,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 18,75	R$ 39,13	R$ 0,00	92	Av. João Câncio da Silva	1155	Manaíra	Loja de colchões	João Pessoa	PB	58038341
61	281852288	Luisa Aquino		01/10/2026 11:48:21	01/10/2026 11:48:23	01/10/2026 12:18:30	01/10/2026 12:36:34	1.0 x         1.0 x Espaguete e Fritas      1.0 x Enviar talher descartável  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 14,99	R$ 33,38	R$ 0,00	8993	R. Manoel Gualberto	255	Miramar	Cursinho de esquina	João Pessoa	PB	58043150
62	281852291	Giselly Leah		01/10/2026 11:48:22	01/10/2026 11:48:27	01/10/2026 12:18:36	01/10/2026 12:29:57	1.0 x         1.0 x Espaguete e Fritas  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 14,99	R$ 31,89	R$ 0,00	2660	Av. Pres. Epitácio Pessoa	2930	Tambauzinho	Sala 1804	João Pessoa	PB	58042006
63	281852568	VICTOR DE FREITAS ROSA		01/10/2026 11:48:52	01/10/2026 11:48:53	01/10/2026 12:18:43	01/10/2026 12:30:48	1.0 x         1.0 x Arroz e Purê  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 14,99	R$ 31,89	R$ 0,00	7551	Av. Pres. Epitácio Pessoa	2930	Tambauzinho	Sala 2301	João Pessoa	PB	58042006
64	281856117	Marcela Victoria		01/10/2026 11:54:49	01/10/2026 11:54:50	01/10/2026 12:03:57	01/10/2026 12:16:50	1.0 x Combo: Frango Baby + Coca-Cola        1.0 x Arroz e Fritas      1.0 x Refrigerante Zero Açucar Coca-Cola 220ml  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 16,99	R$ 34,89	R$ 0,00	2912	Av. Goiás	740	Estados		João Pessoa	PB	58030060
65	281856736	Camila Aranha		01/10/2026 11:55:55	01/10/2026 11:55:56	01/10/2026 12:15:30	01/10/2026 12:31:13	1.0 x         1.0 x Arroz e Fritas  1.0 x         1.0 x Arroz e Salada  	2	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 1,61	R$ 0,00	R$ 10,32	R$ 89,08	R$ 0,00	9430	R. Artur Lidiano de Albuquerque	65	Miramar	Loja Todeschini - entrada pela lateral	João Pessoa	PB	58032130
66	281857872	LUCAS AROUCA		01/10/2026 11:57:56	01/10/2026 11:57:57	01/10/2026 12:09:12	01/10/2026 12:29:45	1.0 x         1.0 x Arroz e Salada  	1	iFood	Concluído	Delivery	iFood	R$ 7,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 19,96	R$ 28,92	R$ 0,00	7104	Av. Gen. Edson Ramalho	834	Manaíra	Agencia do Bradesco	João Pessoa	PB	58038102
67	281859672	Ana Beatriz Costa		01/10/2026 12:00:56	01/10/2026 12:00:59	01/10/2026 12:28:17	01/10/2026 12:33:28	1.0 x         1.0 x Espaguete e Purê  	1	iFood	Concluído	Delivery	iFood	R$ 10,90	R$ 0,00	R$ 2,49	R$ 0,00	R$ 42,22	R$ 141,57	R$ 0,00	6985	Rua Aviador Roberto Marques	339	Aeroclube		João Pessoa	PB	58036845
68	281859961	Glauco Da Silva Campos		01/10/2026 12:01:27	01/10/2026 12:01:29	01/10/2026 12:23:23	01/10/2026 12:41:45	1.0 x         1.0 x Espaguete  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 14,99	R$ 31,89	R$ 0,00	223	Av. Corálio Soares de Oliveira	S/N	Centro		João Pessoa	PB	58013260
69	281860575	ERICK MARTINS		01/10/2026 12:02:28	01/10/2026 12:02:29	01/10/2026 12:15:27	01/10/2026 12:27:13	1.0 x Combo: Frango Baby + Coca-Cola        1.0 x Arroz e Fritas      1.0 x Refrigerante Zero Açucar Coca-Cola 220ml  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 16,99	R$ 34,89	R$ 0,00	8663	R. Antônio Rabelo Júnior	161	Miramar	Sala 701	João Pessoa	PB	58032090
70	281860865	Luis Filipe Ventura Mendonça		01/10/2026 12:02:58	01/10/2026 12:02:59	01/10/2026 12:16:13	01/10/2026 12:38:59	1.0 x         1.0 x Espaguete e Purê  	1	iFood	Concluído	Retirada	iFood	R$ 0,00	R$ 0,00	R$ 0,99	R$ 0,00	R$ 10,00	R$ 40,89	R$ 0,00	7867							
71	281861780	Cecilia Costa		01/10/2026 12:04:34	01/10/2026 12:04:35	01/10/2026 12:19:42	01/10/2026 12:27:16	1.0 x         1.0 x Espaguete  	1	iFood	Concluído	Delivery	iFood	R$ 7,00	R$ 0,00	R$ 0,99	R$ 0,00	R$ 17,00	R$ 40,89	R$ 0,00	1340	R. José Mesquita	52	Treze de Maio		João Pessoa	PB	58025330
72	281862106	Rodolfo Ventura		01/10/2026 12:05:04	01/10/2026 12:05:06	01/10/2026 12:09:22	01/10/2026 12:35:20	1.0 x Combo: Carne Baby + Coca-Cola        1.0 x Arroz e Fritas      1.0 x Refrigerante Zero Açucar Coca-Cola 220ml  	1	Cartão de crédito	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 16,99	R$ 39,89	R$ 0,00	3579	R. Aline Ferreira Rufo	76	Manaíra	Apto 201	João Pessoa	PB	0
73	281862730	Davidson Marcel		01/10/2026 12:06:03	01/10/2026 12:06:04	01/10/2026 12:41:25	01/10/2026 12:57:48	1.0 x   	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 18,63	R$ 42,25	R$ 0,00	1714	Av. Nabuco de Assis	161	Expedicionários	Residencial Lívia APT 303	João Pessoa	PB	0
74	281864395	Talita Pires Figueiredo		01/10/2026 12:08:36	01/10/2026 12:08:38	01/10/2026 12:23:25	01/10/2026 12:39:23	1.0 x         1.0 x Espaguete e Fritas  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 14,99	R$ 31,89	R$ 0,00	8996	Av. Duarte da Silveira	541	Centro	UNIODONTO JOÃO PESSOA	Joao Pessoa	PB	58013280
75	281864399	Kamilla Coutinho		01/10/2026 12:08:36	01/10/2026 12:08:42	01/10/2026 12:23:31	01/10/2026 12:31:32	1.0 x         1.0 x Espaguete e Fritas      1.0 x + Salada da Casa  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 14,99	R$ 37,79	R$ 0,00	6468	Av. Santa Catarina	0	Estados	Hospital do pet veterinário	João Pessoa	PB	58030071
76	281866839	Valdemir Pinheiro		01/10/2026 12:12:36	01/10/2026 12:12:37	01/10/2026 12:23:28	01/10/2026 12:34:36	1.0 x         1.0 x Espaguete e Purê      1.0 x Coca-Cola sem Açúcar Lata 350ml  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 1,00	R$ 0,00	R$ 16,99	R$ 40,89	R$ 0,00	3993	R. Cap. Francisco Moura	46	Treze de Maio	Res Maria aparecida-ap305	João Pessoa	PB	58030071
77	281867201	Swenia Ribeiro da silva 		01/10/2026 12:13:08	01/10/2026 12:13:10	01/10/2026 12:41:46	01/10/2026 12:48:58	1.0 x         1.0 x Arroz e Salada  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 14,99	R$ 32,89	R$ 0,00	495	Av. Mato Grosso	183	Estados		João Pessoa	PB	58030080
78	281867210	Alex Almeida 		01/10/2026 12:13:09	01/10/2026 12:13:14	01/10/2026 12:43:30	01/10/2026 13:03:35	1.0 x         1.0 x Espaguete e Fritas  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 14,99	R$ 31,89	R$ 0,00	6078	Rua Nevinha Gondim de Oliveira	101	Brisamar	Apto 2102	João Pessoa	PB	58086190
79	281870412	Midyan Santos		01/10/2026 12:18:12	01/10/2026 12:18:13	01/10/2026 12:41:19	01/10/2026 12:48:47	1.0 x Combo: Frango Baby + Coca-Cola        1.0 x Arroz e Fritas      1.0 x Refrigerante Zero Açucar Coca-Cola 220ml  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 16,99	R$ 34,89	R$ 0,00	8150	R. Juíz Ovídio Gouvêia	317	Pedro Gondim	Ferraz e Maul	João Pessoa	PB	58031030
80	281870684	Sayonara Paiva		01/10/2026 12:18:41	01/10/2026 12:18:43	01/10/2026 12:43:23	01/10/2026 12:52:22	1.0 x Combo: Frango Baby + Coca-Cola        1.0 x Arroz e Fritas      1.0 x Enviar talher descartável      1.0 x Refrigerante Zero Açucar Coca-Cola 220ml  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 16,99	R$ 36,38	R$ 0,00	879	R. Antônio Régis de Brito	15	Pedro Gondim	Foccus workplace	João Pessoa	PB	58031106
81	281870689	Wellington Farias		01/10/2026 12:18:42	01/10/2026 12:18:47	01/10/2026 12:43:37	01/10/2026 13:07:55	1.0 x Combo: Frango Baby + Coca-Cola        1.0 x Arroz e Fritas      1.0 x Fanta Laranja 220ml  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 16,99	R$ 34,89	R$ 0,00	8510	Av. Sen. Ruy Carneiro	33	Brisamar	Sleephouse	João Pessoa	PB	0
82	281871304	VINICIUS LIMA		01/10/2026 12:19:42	01/10/2026 12:19:43	01/10/2026 12:52:00	01/10/2026 13:13:49	1.0 x         1.0 x Arroz e Fritas  	1	iFood	Concluído	Delivery	iFood	R$ 7,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 14,99	R$ 37,89	R$ 0,00	8500	R. Vigolvino Florentino da Costa	850	Manaíra	Apartamento 201	João Pessoa	PB	58090194
83	281872864	DANILLO DIAS		01/10/2026 12:22:14	01/10/2026 12:22:15	01/10/2026 12:41:16	01/10/2026 12:45:47	1.0 x         1.0 x Arroz e Fritas  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 18,99	R$ 32,89	R$ 0,00	5261	R. Prof. José Gama Prado	180	Pedro Gondim	casa	João Pessoa	PB	58031060
84	281873722	MARIA VITÓRIA		01/10/2026 12:23:43	01/10/2026 12:23:45	01/10/2026 12:41:43	01/10/2026 12:52:54	1.0 x         1.0 x Espaguete e Fritas  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 6,99	R$ 49,89	R$ 0,00	2446	Av. São Paulo	677	Estados	Apt 302	João Pessoa	PB	0
85	281874308	PRISCILLA		01/10/2026 12:24:44	01/10/2026 12:24:46	01/10/2026 12:52:03	01/10/2026 13:17:41	1.0 x         1.0 x Arroz e Fritas  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 14,99	R$ 31,89	R$ 0,00	3525	Av. Manoel Morais	320	Manaíra	Ap 501	João Pessoa	PB	58038230
86	281874311	Luana Maia		01/10/2026 12:24:44	01/10/2026 12:24:50	01/10/2026 12:41:22	01/10/2026 12:52:54	1.0 x         1.0 x Espaguete e Fritas  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 16,71	R$ 30,17	R$ 0,00	8401	Av. Cap. João Freire	610	Expedicionários	portao preto	João Pessoa	PB	58041060
87	281874575	Talita Silva		01/10/2026 12:25:12	01/10/2026 12:25:13	01/10/2026 12:41:40	01/10/2026 12:54:13	1.0 x         1.0 x Espaguete e Fritas  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 14,99	R$ 31,89	R$ 0,00	9524	Av. Rio Grande do Sul	721	Estados	Seinfra	João Pessoa	PB	58030020
88	281875461	Franklin Ferreira		01/10/2026 12:26:45	01/10/2026 12:26:47	01/10/2026 13:02:41	01/10/2026 13:25:37	1.0 x         1.0 x Espaguete e Fritas  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 14,99	R$ 31,89	R$ 0,00	7049	R. Manoel Gualberto	255	Miramar	Casa	João Pessoa	PB	58043150
89	281876026	Alessandra Guedes D'emery		01/10/2026 12:27:46	01/10/2026 12:27:48	01/10/2026 12:41:38	01/10/2026 12:58:23	1.0 x Combo: Frango Baby + Coca-Cola        1.0 x Arroz e Salada      1.0 x Refrigerante Zero Açucar Coca-Cola 220ml  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 16,99	R$ 34,89	R$ 0,00	5331	Avenida Presidente Epitácio Pessoa	475	Torre	Sala 401	João Pessoa	PB	58040000
90	281876290	Geneilton Justo		01/10/2026 12:28:17	01/10/2026 12:28:18	01/10/2026 12:36:21	01/10/2026 12:47:57	2.0 x         1.0 x Espaguete e Fritas  	2	iFood	Concluído	Delivery	iFood	R$ 16,99	R$ 0,00	R$ 1,56	R$ 0,00	R$ 19,45	R$ 76,90	R$ 0,00	7982	R. Isaura Silveira Lira	254	Água Fria	Apartamento 411	João Pessoa	PB	58053012
91	281876581	Kenia Medeiros	83988017174	01/10/2026 12:28:47	01/10/2026 12:28:48	01/10/2026 12:43:34	01/10/2026 13:05:58	1.0 x         1.0 x Espaguete e Fritas  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 14,99	R$ 31,89	R$ 0,00	8607	Av. Sen. Ruy Carneiro	405	Miramar	Ana  SOPHIA GUIMARÃES 2ANO A	João Pessoa	PB	0
92	281876583	Giselly Sousa de Lima		01/10/2026 12:28:47	01/10/2026 12:28:52	01/10/2026 12:51:53	01/10/2026 12:56:45	1.0 x         1.0 x Arroz e Salada  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 18,71	R$ 36,17	R$ 0,00	2273	R. João Vieira Carneiro	895	Pedro Gondim	1002	João Pessoa	PB	0
93	281877122	Edigar Palmeira		01/10/2026 12:29:45	01/10/2026 12:29:46	01/10/2026 13:02:34	01/10/2026 13:15:31	1.0 x         1.0 x Espaguete e Purê  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 14,99	R$ 31,89	R$ 0,00	5161	R. Saffa Said Abel da Cunha	89	Tambauzinho	304	João Pessoa	PB	0
94	281878818	Karol pires		01/10/2026 12:32:49	01/10/2026 12:32:51	01/10/2026 12:43:27	01/10/2026 12:59:19	1.0 x         1.0 x Espaguete e Fritas  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 1,80	R$ 0,00	R$ 13,99	R$ 84,70	R$ 0,00	3015	R. Cassimiro de Abreu	250	Brisamar	Apto 402	João Pessoa	PB	58033330
95	281879081	Ana Maciel		01/10/2026 12:33:19	01/10/2026 12:33:21	01/10/2026 12:51:56	01/10/2026 13:05:31	1.0 x Combo: Frango Baby + Coca-Cola        1.0 x Espaguete e Fritas      1.0 x Refrigerante Zero Açucar Coca-Cola 220ml  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 16,99	R$ 34,89	R$ 0,00	1426	R. Empresario Clovis Rolim	2051	Bairro dos Ipês	TORRE SUL - Andar 24	João Pessoa	PB	58028873
96	281879627	Nara gomes  Gomes 		01/10/2026 12:34:20	01/10/2026 12:34:21	01/10/2026 13:05:36	01/10/2026 13:05:55	1.0 x         1.0 x Espaguete e Fritas  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 1,12	R$ 0,00	R$ 16,87	R$ 57,14	R$ 0,00	305	Av. Presidente Tancredo Neves	775	Bairro dos Ipês		João Pessoa	PB	58028840
97	281881821	Renato Baldichia		01/10/2026 12:38:22	01/10/2026 12:38:24	01/10/2026 13:04:21	01/10/2026 13:16:10	1.0 x         1.0 x Arroz e Salada  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 14,99	R$ 31,89	R$ 0,00	4656	R. Sidney Clemente Dore	330	Tambaú	Apto 503	João Pessoa	PB	0
98	281882338	Mohana Karinna		01/10/2026 12:39:23	01/10/2026 12:39:24	01/10/2026 13:10:12	01/10/2026 13:26:02	1.0 x         1.0 x Arroz e Purê      1.0 x + Salada da Casa  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 14,99	R$ 38,79	R$ 0,00	1610	Av. Júlia Freire	139	Torre	LUX OFFICE - TRABALHO	Joao Pessoa	PB	58040040
99	281882339	Matheus Albuquerque		01/10/2026 12:39:23	01/10/2026 12:39:28	01/10/2026 13:04:27	01/10/2026 13:23:16	1.0 x         1.0 x Arroz e Purê      1.0 x Com Champignon  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 16,99	R$ 38,89	R$ 0,00	2908	Av. Antônio Lira	588	Tambaú	Apt 105	João Pessoa	PB	58039050
100	281883420	Maristela Araújo Vier		01/10/2026 12:41:23	01/10/2026 12:41:26	01/10/2026 13:04:30	01/10/2026 13:09:54	1.0 x         1.0 x Espaguete e Fritas      1.0 x + Salada da Casa  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 14,99	R$ 37,79	R$ 0,00	3076	R. Ver. Pedro Paulo de Almeida	140 -	Pedro Gondim	Apto 303	João Pessoa	PB	58031020
101	281883422	estefani ferreira		01/10/2026 12:41:23	01/10/2026 12:41:29	01/10/2026 13:10:06	01/10/2026 13:17:38	1.0 x         1.0 x Espaguete e Fritas  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 14,99	R$ 31,89	R$ 0,00	9454	Rua Conego Luiz Gonzaga de Oliveira	315	Bairro dos Ipês	Escritório	João Pessoa	PB	58030212
102	281883425	Alana do Nascimento Ferreira		01/10/2026 12:41:24	01/10/2026 12:41:33	01/10/2026 13:13:41	01/10/2026 13:26:17	1.0 x   	1	iFood	Concluído	Delivery	iFood	R$ 12,90	R$ 0,00	R$ 1,06	R$ 0,00	R$ 18,00	R$ 48,86	R$ 0,00	3710	R. Comerciante José Miranda de Araújo	130	Jardim Oceania	Apt 301 Recidence Artefato	João Pessoa	PB	58037428
103	281884467	Solange Galdino Souza		01/10/2026 12:43:24	01/10/2026 12:43:27	01/10/2026 13:20:53	01/10/2026 13:35:10	1.0 x         1.0 x Espaguete e Purê  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 14,99	R$ 31,89	R$ 0,00	9821	R. David Ferreira Luna	151 - Ap 504	Brisamar	Residencial Adriana Park	João Pessoa	PB	58033090
104	281884469	Flaviana Lustosa De Oliveira Paiva		01/10/2026 12:43:24	01/10/2026 12:43:31	01/10/2026 13:02:37	01/10/2026 13:19:40	1.0 x         1.0 x Espaguete e Purê  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 16,71	R$ 30,17	R$ 0,00	4450	Av. Pres. Epitácio Pessoa	2712	Tambauzinho		João Pessoa	PB	58030000
105	281884980	Livia Duarte		01/10/2026 12:44:25	01/10/2026 12:44:26	01/10/2026 13:20:50	01/10/2026 13:32:10	1.0 x         1.0 x Arroz e Fritas  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 16,99	R$ 34,89	R$ 0,00	4818	Rua Inácio F. Serrano	45	Brisamar	ap 2902	João Pessoa	PB	58033490
106	281884982	RAFAEL MIRANDA BIANCHI		01/10/2026 12:44:25	01/10/2026 12:44:30	01/10/2026 13:21:03	01/10/2026 13:46:55	1.0 x Combo: Carne Baby + Coca-Cola        1.0 x Espaguete e Fritas      1.0 x Coca-Cola 220ml      1.0 x Brownie recheado com Dois Amores  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 16,99	R$ 48,79	R$ 0,00	9136	R. Dr. Agrícola Montenegro	185	Miramar	1703	João Pessoa	PB	58032210
107	281884986	Rhana Bozzano		01/10/2026 12:44:25	01/10/2026 12:44:34	01/10/2026 13:25:00	01/10/2026 13:42:17	1.0 x         1.0 x Arroz e Fritas  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 14,99	R$ 31,89	R$ 0,00	1294	Rua Luiz Oliveira da Silva	81	Tambiá		João Pessoa	PB	58020840
108	281885722	ANDREIA DA SILVA SALES		01/10/2026 12:45:55	01/10/2026 12:45:57	01/10/2026 13:10:10	01/10/2026 13:33:00	1.0 x Combo: Frango Baby + Coca-Cola        1.0 x Espaguete e Fritas      1.0 x Enviar talher descartável      1.0 x Coca-Cola 220ml  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 16,99	R$ 36,38	R$ 0,00	3313	Av. Pres. Epitácio Pessoa	494	Torre	Laura Sales 7 ano B	João Pessoa	PB	58040000
109	281886480	Rayana de Oliveira		01/10/2026 12:47:26	01/10/2026 12:47:27	01/10/2026 13:03:04	01/10/2026 13:31:05	1.0 x         1.0 x Espaguete e Fritas      1.0 x + Salada da Casa  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 14,99	R$ 37,79	R$ 0,00	254	R. Rafael de Holanda	80	Castelo Branco		João Pessoa	PB	58050070
110	281886964	MARIA ALICE NASCIMENTO SOUZA		01/10/2026 12:48:27	01/10/2026 12:48:29	01/10/2026 13:25:07	01/10/2026 13:49:26	1.0 x         1.0 x Espaguete e Fritas      1.0 x Coca-Cola sem Açúcar Lata 350ml  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 17,75	R$ 45,12	R$ 0,00	9896	Av. Maximiano Figueiredo	504	Centro	Sala 206 - nome do escritório na parede	João Pessoa	PB	58013470
111	281887223	Pablo de Oliveira Lima		01/10/2026 12:48:58	01/10/2026 12:48:59	01/10/2026 13:04:23	01/10/2026 13:19:36	1.0 x         1.0 x Arroz e Purê      1.0 x Com Champignon  	1	iFood, iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 18,99	R$ 36,89	R$ 0,00	4602	R. Tab. Venâncio Santiago	170	Tambaú	Apto 502	João Pessoa	PB	0
112	281887721	Carlos Santos		01/10/2026 12:49:58	01/10/2026 12:49:59	01/10/2026 13:20:56	01/10/2026 13:39:12	1.0 x         1.0 x Espaguete e Purê      1.0 x Coca-Cola sem Açúcar Lata 350ml  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 14,99	R$ 37,88	R$ 0,00	7488	R. Pref. José Leite	106	Miramar	Nord Hotels	João Pessoa	PB	58032050
113	281888466	Evelyn Vitoria		01/10/2026 12:51:28	01/10/2026 12:51:30	01/10/2026 13:34:46	01/10/2026 14:05:03	1.0 x         1.0 x Espaguete e Purê  1.0 x         1.0 x Arroz e Fritas  	2	Cartão de crédito	Concluído	Delivery	iFood	R$ 7,99	R$ 0,00	R$ 1,62	R$ 0,00	R$ 14,57	R$ 82,84	R$ 0,00	5966	Av. Monteiro da Franca	1383	Manaíra	Residencial Emília Sarmento Ap 101	João Pessoa	PB	58038323
114	281891990	Andressa Maropo		01/10/2026 12:59:03	01/10/2026 12:59:04	01/10/2026 13:10:15	01/10/2026 13:28:41	1.0 x         1.0 x Espaguete e Fritas  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 16,99	R$ 34,89	R$ 0,00	9554	Av. Juarez Távora	522	Torre	Sala 105- Phormula&art -	João Pessoa	PB	58040020
115	281892950	Natália Fernandes Moraes Reina		01/10/2026 13:01:03	01/10/2026 13:01:05	01/10/2026 13:42:32	01/10/2026 14:16:38	1.0 x Combo: Frango Baby + Coca-Cola        1.0 x Arroz e Salada      1.0 x Refrigerante Zero Açucar Coca-Cola 220ml  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 16,99	R$ 34,89	R$ 0,00	3630	R. Silvio Almeida	510	Expedicionários	N	João Pessoa	PB	0
116	281893424	Leticia B		01/10/2026 13:02:04	01/10/2026 13:02:06	01/10/2026 13:06:31	01/10/2026 13:42:15	1.0 x Combo: Frango Baby + Coca-Cola        1.0 x Espaguete e Fritas      1.0 x Sprite Original 220ml  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 16,99	R$ 34,89	R$ 0,00	4580	R. Nôzinho Brandão	296	Conj. Pres. Castelo Branco II		João Pessoa	PB	58050450
117	281893425	Laryssa Oliveira		01/10/2026 13:02:04	01/10/2026 13:02:10	01/10/2026 13:42:28	01/10/2026 14:08:47	1.0 x         1.0 x Arroz e Fritas      1.0 x Refrigerante sem Açúcar Coca-Cola 350ml      1.0 x Enviar talher descartável  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 1,19	R$ 0,00	R$ 18,99	R$ 48,57	R$ 0,00	4775	Av. Min. José Américo de Almeida	3100	Tambauzinho	Escritório Marcelo Assunção	João Pessoa	PB	58043360
118	281893678	Rai Accioly		01/10/2026 13:02:34	01/10/2026 13:02:37	01/10/2026 13:25:04	01/10/2026 13:47:05	1.0 x Combo: Frango Baby + Coca-Cola        1.0 x Espaguete e Fritas      1.0 x + Salada da Casa      1.0 x Refrigerante Zero Açucar Coca-Cola 220ml  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 1,19	R$ 0,00	R$ 16,99	R$ 40,99	R$ 0,00	7997	Av. Alm. Barroso	600	Centro	Sala 705	João Pessoa	PB	0
119	281895023	Hellen Vitoria		01/10/2026 13:05:36	01/10/2026 13:05:38	01/10/2026 13:25:10	01/10/2026 13:38:20	1.0 x         1.0 x Arroz e Fritas      1.0 x Coca-Cola sem Açúcar Lata 350ml      1.0 x Bolo de Pote - Brigadeiro  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 14,99	R$ 49,78	R$ 0,00	2523	Av. Minas Gerais	30	Estados	Clina medicos de resultados 2 andar	João Pessoa	PB	58050719
120	281896660	Lucas Palhano		01/10/2026 13:09:07	01/10/2026 13:09:09	01/10/2026 13:21:00	01/10/2026 13:42:19	1.0 x         1.0 x Espaguete  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 14,99	R$ 31,89	R$ 0,00	7761	R. Antônio Rabelo Júnior	161	Miramar	Sala 2502 - VTEX	João Pessoa	PB	0
121	281896663	Cynthia Vieira		01/10/2026 13:09:07	01/10/2026 13:09:13	01/10/2026 13:48:44	01/10/2026 13:58:53	1.0 x Combo: Carne Baby + Coca-Cola        1.0 x Espaguete e Fritas      1.0 x Refrigerante Zero Açucar Coca-Cola 220ml  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 16,99	R$ 39,89	R$ 0,00	5745	R. Irmã Elvira Malagute	65	Estados	Casa	João Pessoa	PB	58030045
122	281896912	Joao Paulo Soares		01/10/2026 13:09:38	01/10/2026 13:09:40	01/10/2026 13:34:38	01/10/2026 13:45:25	1.0 x         1.0 x Espaguete e Fritas  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 16,99	R$ 34,89	R$ 0,00	4116	Av. Pres. Epitácio Pessoa	2639	Estados	CAOA CHANGAN AO LADO DA CHERY	João Pessoa	PB	58031003
123	281897617	Giovana Ximenes		01/10/2026 13:11:09	01/10/2026 13:11:11	01/10/2026 13:55:28	01/10/2026 14:28:43	1.0 x Combo: Carne Baby + Coca-Cola        1.0 x Espaguete e Fritas      1.0 x Sprite Original 220ml  	1	iFood	Concluído	Delivery	iFood	R$ 7,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 17,99	R$ 39,89	R$ 0,00	809	R. Ana Guedes De Vasconcelos	81	Altiplano Cabo Branco	Sala 503	João Pessoa	PB	58046092
124	281899568	TALITA ROCHA DE SALLES		01/10/2026 13:15:42	01/10/2026 13:15:43	01/10/2026 13:51:46	01/10/2026 14:13:36	1.0 x         1.0 x Arroz e Fritas  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 14,99	R$ 31,89	R$ 0,00	9539	R. José Cavalcanti Chaves	243	Expedicionários	Apto 102	João Pessoa	PB	58041090
125	281899771	DANIELA PEREIRA		01/10/2026 13:16:10	01/10/2026 13:16:12	01/10/2026 13:34:40	01/10/2026 13:54:09	1.0 x         1.0 x Arroz e Fritas      1.0 x Coca-Cola sem Açúcar Lata 350ml      1.0 x Brownie recheado com Dois Amores  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 16,99	R$ 49,78	R$ 0,00	3526	R. Infante Dom Henrique	100	Tambaú	Cond Tambaú flex home	João Pessoa	PB	58039150
126	281900210	Erika Meireles		01/10/2026 13:17:12	01/10/2026 13:17:14	01/10/2026 13:34:43	01/10/2026 13:59:59	1.0 x         1.0 x Espaguete e Fritas  	1	iFood	Concluído	Delivery	iFood	R$ 7,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 18,75	R$ 39,13	R$ 0,00	7945	Av. Gen. Edson Ramalho	834	Manaíra	Bradesco principal	João Pessoa	PB	58038102
127	281900856	Eduarda Torres		01/10/2026 13:18:43	01/10/2026 13:18:45	01/10/2026 13:30:48	01/10/2026 13:48:50	1.0 x Combo: Carne Baby + Coca-Cola        1.0 x Arroz e Fritas      1.0 x Sprite Original 220ml  	1	iFood	Concluído	Delivery	iFood	R$ 11,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 12,22	R$ 49,66	R$ 0,00	3095	Av. Cap. José Pessoa	919	Jaguaribe	Hospital nova esperança (entrada de funcionários)	João Pessoa	PB	58015345
128	281901057	bruna tavares		01/10/2026 13:19:14	01/10/2026 13:19:15	01/10/2026 13:55:30	01/10/2026 14:21:37	1.0 x         1.0 x Arroz e Salada  	1	iFood	Concluído	Delivery	iFood	R$ 7,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 19,99	R$ 27,89	R$ 0,00	3510	R. Iracema Guedes Lins	430	Altiplano Cabo Branco	303A	João Pessoa	PB	58046135
129	281902773	HELOÍSA SILVA ALVES		01/10/2026 13:23:16	01/10/2026 13:23:17	01/10/2026 13:48:49	01/10/2026 14:07:29	1.0 x         1.0 x Espaguete e Purê  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 14,99	R$ 31,89	R$ 0,00	1852	Av. Duarte da Silveira	610	Centro	Secretaria de Estado do Desenvolvimento Humano	João Pessoa	PB	58013280
130	281903375	Mônica Barros		01/10/2026 13:24:47	01/10/2026 13:24:48	01/10/2026 13:37:22	01/10/2026 13:53:58	1.0 x         1.0 x Espaguete e Fritas      1.0 x Coca-Cola sem Açúcar Lata 350ml  	1	iFood	Concluído	Delivery	iFood	R$ 7,00	R$ 0,00	R$ 0,99	R$ 0,00	R$ 15,00	R$ 37,88	R$ 0,00	9072	Av. Dom Pedro II	1826	Torre	Secretaria de Saúde do Estado vizinho ao hemocentro	João Pessoa	PB	58040440
131	281905294	AMANDA DORAND		01/10/2026 13:29:49	01/10/2026 13:29:51	01/10/2026 13:48:52	01/10/2026 14:03:42	1.0 x Combo: Carne Baby + Coca-Cola        1.0 x Arroz e Purê      1.0 x Refrigerante Zero Açucar Coca-Cola 220ml  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 16,99	R$ 39,89	R$ 0,00	3252	Av. Camilo De Holanda	555	Centro	Clinica ISOmedicina	João Pessoa	PB	58013360
132	281906452	PEDRO ANDRADE		01/10/2026 13:32:50	01/10/2026 13:32:52	01/10/2026 13:51:42	01/10/2026 14:01:55	1.0 x         1.0 x Espaguete e Fritas  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 14,99	R$ 31,89	R$ 0,00	8533	Av. Pres. Epitácio Pessoa	2737	Estados		João Pessoa	PB	58030002
133	281907944	Caroline Bezerra		01/10/2026 13:36:52	01/10/2026 13:36:53	01/10/2026 13:55:33	01/10/2026 14:26:09	1.0 x         1.0 x Espaguete e Fritas  	1	iFood	Concluído	Delivery	iFood	R$ 7,99	R$ 0,00	R$ 1,00	R$ 0,00	R$ 14,99	R$ 43,90	R$ 0,00	4014	R. Pedro Firmino do Nascimento	139	Altiplano Cabo Branco	Apto 102	João Pessoa	PB	58046120
134	281909346	Janaina Fernandes Meira		01/10/2026 13:40:53	01/10/2026 13:40:54	01/10/2026 14:04:33	01/10/2026 14:07:59	1.0 x         1.0 x Arroz e Salada  	1	iFood	Concluído	Delivery	iFood	R$ 7,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 17,71	R$ 30,17	R$ 0,00	7694	Av. Pombal	1633	Manaíra	loja bliss cookie	João Pessoa	PB	58038242
135	281912172	Dayane  Souza		01/10/2026 13:48:50	01/10/2026 13:48:53	01/10/2026 13:55:26	01/10/2026 14:15:07	1.0 x         1.0 x Espaguete e Fritas  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 14,99	R$ 31,89	R$ 0,00	6038	R. João de Pessoa	32	Miramar	Trabalho	João Pessoa	PB	58043030
136	281914623	Iago Felipe		01/10/2026 13:56:29	01/10/2026 13:56:31	01/10/2026 13:58:44	01/10/2026 14:09:15	1.0 x         1.0 x Camarão - Espaguete      1.0 x Guaraná Antarctica Zero Lata      1.0 x Doce de Leite com Chocolate Embalagem 90g  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 1,19	R$ 0,00	R$ 15,72	R$ 60,66	R$ 0,00	7079	R. João Vieira Carneiro	940	Pedro Gondim	Edifício São Paulo. Bloco B. Apto 203	João Pessoa	PB	58031080
137	281989261	Lucas Cezar		01/10/2026 18:24:35	01/10/2026 18:24:40	01/10/2026 18:48:42	01/10/2026 19:01:51	1.0 x         1.0 x Arroz e Purê  	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 16,99	R$ 34,89	R$ 0,00	7157	R. Maj. Álvaro Monteiro	1035	Bairro dos Ipês	Apto 303	João Pessoa	PB	58028270
138	281992637	ELINE ONO GALVAO		01/10/2026 18:29:41	01/10/2026 18:29:45	01/10/2026 18:48:44	01/10/2026 19:04:55	1.0 x   1.0 x         1.0 x Espaguete e Fritas      1.0 x + Salada da Casa  	2	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 1,95	R$ 0,00	R$ 18,99	R$ 87,65	R$ 0,00	2550	Av. Bahia	575	Estados	Casa	João Pessoa	PB	58030130
139	281994479	JOSÉ ANDERSON PEREIRA DE MOURA		01/10/2026 18:32:15	01/10/2026 18:32:18	01/10/2026 18:48:47	01/10/2026 19:03:00	1.0 x Espaguete e Fritas	1	iFood	Concluído	Delivery	iFood	R$ 6,99	R$ 0,00	R$ 0,99	R$ 0,00	R$ 16,99	R$ 34,89	R$ 0,00	8120	Av. Juarez Távora	2041	Torre	Apto 101	João Pessoa	PB	58040020
"""

# Neighborhood coordinate mapping for João Pessoa - PB
NEIGHBORHOOD_COORDS = {
    "bairro dos ipês": (-7.1065, -34.8580),
    "bessa": (-7.0700, -34.8350),
    "expedicionários": (-7.1230, -34.8620),
    "pedro gondim": (-7.1160, -34.8600),
    "miramar": (-7.1190, -34.8380),
    "tambauzinho": (-7.1210, -34.8480),
    "estados": (-7.1100, -34.8550),
    "treze de maio": (-7.1030, -34.8650),
    "torre": (-7.1250, -34.8680),
    "centro": (-7.1200, -34.8800),
    "tambaú": (-7.1160, -34.8250),
    "lot. oceania iii": (-7.0850, -34.8390),
    "jardim oceania": (-7.0850, -34.8390),
    "jaguaribe": (-7.1350, -34.8820),
    "cabo branco": (-7.1330, -34.8210),
    "cruz das armas": (-7.1450, -34.8900),
    "jardim cidade universitária": (-7.1480, -34.8450),
    "manaíra": (-7.1000, -34.8320),
    "cristo redentor": (-7.1550, -34.8700),
    "conj. pres. castelo branco ii": (-7.1380, -34.8500),
    "castelo branco": (-7.1380, -34.8500),
    "água fria": (-7.1600, -34.8520),
    "altiplano cabo branco": (-7.1420, -34.8150),
    "aeroclube": (-7.0800, -34.8480),
    "tambiá": (-7.1150, -34.8750),
    "varjão": (-7.1500, -34.8850),
    "joão agripino": (-7.1120, -34.8510),
    "brisamar": (-7.1140, -34.8420)
}

DEFAULT_LAT = -7.1150
DEFAULT_LON = -34.8450

def parse_currency(val):
    if not val:
        return 0.0
    val_clean = val.replace("R$", "").replace(".", "").replace(",", ".").strip()
    try:
        return float(val_clean)
    except:
        return 0.0

def clean_map_address(rua, numero, bairro, cidade, estado, cep):
    """
    Rule implementation from Gemini instructions:
    - Must build: "{Rua}, {Número} - {Bairro}, {Cidade} - {Estado}"
    - Exclude Complemento entirely (prevents pin drop failure).
    - Exclude CEP if "0" or "0.0".
    """
    r = rua.strip() if rua else ""
    num = numero.strip() if numero else "s/n"
    b = bairro.strip() if bairro else "João Pessoa"
    cid = cidade.strip() if cidade else "João Pessoa"
    est = estado.strip() if estado else "PB"
    
    clean_str = f"{r}, {num} - {b}, {cid} - {est}"
    if cep and cep.strip() not in ["0", "0.0", ""]:
        clean_str += f", CEP {cep.strip()}"
    return clean_str

def get_food_meta(produtos):
    p_lower = produtos.lower()
    if 'espaguete' in p_lower or 'massa' in p_lower:
        return ('massa', '🍝')
    elif 'arroz' in p_lower or 'filé' in p_lower or 'parmegiana' in p_lower:
        return ('salada', '🍲')
    elif 'combo' in p_lower or 'baby' in p_lower or 'frango' in p_lower or 'carne' in p_lower:
        return ('burger', '🍖')
    elif 'coca' in p_lower or 'refrigerante' in p_lower or 'guaraná' in p_lower or 'doce' in p_lower or 'brownie' in p_lower:
        return ('bebidas', '🥤')
    return ('massa', '📦')

def get_coords(bairro):
    b_key = bairro.strip().lower()
    if b_key in NEIGHBORHOOD_COORDS:
        base_lat, base_lon = NEIGHBORHOOD_COORDS[b_key]
    else:
        base_lat, base_lon = DEFAULT_LAT, DEFAULT_LON
    # add small realistic offset
    return round(base_lat + random.uniform(-0.003, 0.003), 5), round(base_lon + random.uniform(-0.003, 0.003), 5)

def process_tsv():
    lines = raw_tsv_data.strip().split('\n')
    header = lines[0].split('\t')
    
    parsed_orders = []
    
    for idx, line in enumerate(lines[1:]):
        cols = line.split('\t')
        if len(cols) < 25:
            continue
        
        num_pedido = cols[0].strip()
        id_pedido = cols[1].strip()
        cliente = cols[2].strip()
        telefone = cols[3].strip()
        data_criacao = cols[4].strip()
        inicio_preparo = cols[5].strip()
        pedido_pronto = cols[6].strip()
        pedido_fechado = cols[7].strip()
        produtos = cols[8].strip()
        total_itens = cols[9].strip()
        metodo_pagamento = cols[10].strip()
        status_orig = cols[11].strip()
        tipo = cols[12].strip()
        canal = cols[13].strip()
        taxa_entrega = parse_currency(cols[14])
        total_pedido = parse_currency(cols[19])
        cod_externo = cols[21].strip() if len(cols) > 21 else id_pedido
        rua = cols[22].strip() if len(cols) > 22 else ""
        numero = cols[23].strip() if len(cols) > 23 else "s/n"
        bairro = cols[24].strip() if len(cols) > 24 else "João Pessoa"
        complemento = cols[25].strip() if len(cols) > 25 else ""
        cidade = cols[26].strip() if len(cols) > 26 else "João Pessoa"
        estado = cols[27].strip() if len(cols) > 27 else "PB"
        cep = cols[28].strip() if len(cols) > 28 else "0"
        
        clean_addr = clean_map_address(rua, numero, bairro, cidade, estado, cep)
        tipo_comida, food_icon = get_food_meta(produtos)
        lat, lon = get_coords(bairro)
        
        # map status to system 13 columns (or active status simulation)
        # We distribute orders across realistic current states (entrada_automatica, preparando, pronto, em_rota, finalizado)
        if idx % 15 == 0:
            status_sim = 'entrada_automatica'
        elif idx % 12 == 0:
            status_sim = 'preparando'
        elif idx % 10 == 0:
            status_sim = 'pronto'
        elif idx % 7 == 0:
            status_sim = 'em_rota'
        else:
            status_sim = 'finalizado'
            
        hora_str = data_criacao.split(' ')[1][:5] if ' ' in data_criacao else '11:30'
        
        # calculate wait min
        wait_min = random.randint(3, 28)
        is_critico = wait_min > 15 and status_sim != 'finalizado'
        
        order_obj = {
            "id": f"#VOL-{num_pedido.zfill(4)}",
            "id_externo": f"{canal} #{cod_externo if cod_externo else id_pedido}",
            "cliente": cliente if cliente else f"Cliente #{num_pedido}",
            "telefone": telefone,
            "endereco": f"{rua}, {numero}" + (f" ({complemento})" if complemento else ""),
            "endereco_limpo_mapa": clean_addr,
            "bairro": bairro,
            "tipoComida": tipo_comida,
            "foodIcon": food_icon,
            "itensResumo": re.sub(r'\s+', ' ', produtos).strip(),
            "valorTotal": total_pedido,
            "taxaEntrega": taxa_entrega,
            "distanciaKm": round(random.uniform(1.2, 5.8), 1),
            "origem": "ifood" if "ifood" in canal.lower() else "web",
            "status": status_sim,
            "horaPedido": hora_str,
            "tempoEsperaMin": wait_min,
            "isCritico": is_critico,
            "latitude": lat,
            "longitude": lon,
            "created_at": data_criacao
        }
        parsed_orders.append(order_obj)
        
    return parsed_orders

if __name__ == "__main__":
    orders = process_tsv()
    print(f"[OK] Processed {len(orders)} real orders from João Pessoa dataset.")
    
    # Save as JSON for backend seed and frontend mock
    os.makedirs("backend", exist_ok=True)
    with open("backend/real_orders_joao_pessoa.json", "w", encoding="utf-8") as f:
        json.dump(orders, f, ensure_ascii=False, indent=2)
    print("[OK] Saved backend/real_orders_joao_pessoa.json")
