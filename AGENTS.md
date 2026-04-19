# Guia para usar agentes de código (loja-t20)

Este documento descreve o projeto, tudo o que foi implementado até aqui e como manter cada parte com eficiência usando agentes de código.

## Visão geral do projeto

**loja-t20** é um módulo de FoundryVTT para Tormenta20 que fornece uma loja para comprar e vender itens diretamente na ficha do ator. O módulo também inclui um painel de configurações para controlar fontes de itens (compêndios/UUIDs) e várias opções avançadas (monitoramento de moedas, mensagens no chat, etc.).

Principais objetivos:
- Exibir itens de diferentes fontes (mundo, compêndios e UUIDs).
- Comprar e vender itens com conversão automática de moedas.
- Exibir interface de filtros avançados para encontrar itens rapidamente.
- Oferecer opções no painel de configurações do módulo.

## Estrutura do projeto

```
module.json
lang/
  pt-BR.json
scripts/
  main.js
  settings-app.js
  shop-app.js
styles/
  shop.css
templates/
  shop-settings.hbs
  shop.hbs
```

### Onde mexer em cada área

- **UI da loja**: `templates/shop.hbs`
- **UI das configurações**: `templates/shop-settings.hbs`
- **Estilos**: `styles/shop.css`
- **Regras de compra/venda, filtros e hooks**: `scripts/shop-app.js`
- **Configurações do módulo e hooks globais**: `scripts/main.js`
- **Strings/labels**: `lang/pt-BR.json`

## Funcionalidades implementadas

### Loja (compra e venda)

- Compra com desconto de moedas (TO/TP/TC) e atualização automática.
- Venda com porcentagem configurável (1–100%).
- Mensagens no chat com item, quantidade, preço e saldo final.
- Mensagens podem ser silenciadas por configuração.
- Mensagens podem ser enviadas como whisper para o mestre.
- Venda de consumíveis com seleção de quantidade.
- Compra de consumíveis com seleção de quantidade.

**Manutenção:**
- `ShopApplication._purchaseItem` e `ShopApplication._sellItem` em `scripts/shop-app.js`.

### Filtros avançados

- Painel lateral com categorias principais: **Armas**, **Equipamento**, **Tesouro**, **Consumíveis**.
- Subcategorias (ex.: propriedades, propósito, empunhadura, etc.).
- Modo de combinação: **qualquer filtro** (ANY) ou **todos os filtros** (ALL).
- Filtros persistem abertos após render.

**Manutenção:**
- Mapeamento dos filtros: `buildFilterTags` em `scripts/shop-app.js`.
- UI dos filtros: `templates/shop.hbs`.
- Estilos do painel lateral: `styles/shop.css`.

### Categorias e mapeamento

- **Armas**: propriedades via `system.propriedades.*` (boolean), propósito, empunhadura, proficiência.
- **Equipamento**: tipo por `system.tipo` e uso por `system.equipado2.type` (hand/body/both).
- **Tesouro**: `item.type` pode ser `loot` ou `tesouro`.
- **Consumíveis**: `system.tipo` com valores como `ammo`, `scroll`, `alchemy`, etc.

**Manutenção:**
- Ver constantes no topo de `scripts/shop-app.js`:
  - `WEAPON_PROPERTIES`, `WEAPON_PURPOSES`, `WEAPON_GRIPS`, `WEAPON_PROFICIENCY`
  - `EQUIPMENT_TYPES`, `EQUIPMENT_USAGE`
  - `CONSUMABLE_TYPES`

### Configurações do módulo

- Compêndios do sistema e itens do mundo.
- Configuração avançada de compêndios e itens por UUID.
- Mensagens no chat (on/off).
- Mensagens para mestre (whisper).
- Monitoramento de mudanças nas moedas (jogadores ou todos).

**Manutenção:**
- Registros em `scripts/main.js`.
- UI do menu de configurações em `templates/shop-settings.hbs`.

### Monitoramento de moedas

- Detecta alteração de moedas e envia mensagem ao mestre.
- Dois modos: somente jogadores ou todos.

**Manutenção:**
- Hooks `preUpdateActor` e `updateActor` em `scripts/main.js`.

## Como usar agentes de código com eficiência

### 1) Sempre indique o arquivo alvo
Exemplo: “Ajuste o layout em `templates/shop.hbs`”.

### 2) Diga o comportamento esperado
Exemplo: “Quero filtrar itens que tenham **todas** as propriedades selecionadas”.

### 3) Indique dados reais do sistema
Exemplo: “O campo correto é `system.equipado2.type`”.

### 4) Peça commits quando necessário
Exemplo: “Faça commit com mensagem X e faça push”.

### 5) Ao testar, sempre descreva o resultado
Exemplo: “A janela abre, mas o checkbox não marca”.

## Rotina de manutenção recomendada

### Ajustes visuais
- Edite **somente** `templates/*.hbs` e `styles/shop.css`.
- Evite mudar lógica em `shop-app.js` se não for necessário.

### Alteração de regras de compra/venda
- Usar `ShopApplication._purchaseItem` e `_sellItem`.
- Atualize mensagens no chat se alterar campos.

### Novas categorias ou filtros
1. Atualize constantes no topo do `shop-app.js`.
2. Atualize o `buildFilterTags`.
3. Atualize a UI em `shop.hbs`.
4. Ajuste estilo em `shop.css`.

### Novas configurações do módulo
1. Registre em `scripts/main.js`.
2. Ajuste `lang/pt-BR.json` (nomes/hints).
3. Use a setting onde necessário.

## Próximos passos (opcionais)

- Adicionar botão **“Limpar filtros”**.
- Salvar filtros por usuário (persistência local).
- Criar README.md com instruções para jogadores.

---
Se quiser atualizar este documento, avise o ponto exato que deseja expandir.