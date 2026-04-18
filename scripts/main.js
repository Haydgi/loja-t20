/**
 * t20-loja — Módulo de Loja para Tormenta20 no FoundryVTT
 * Ponto de entrada principal.
 */

import { ShopApplication } from './shop-app.js';
import { ShopSettingsApplication } from './settings-app.js';

export const MODULE_ID = 'loja-t20';

/* ─────────────────────────────────────────────
   INIT — Registro de configurações
───────────────────────────────────────────── */
Hooks.once('init', () => {
  console.log(`${MODULE_ID} | Inicializando módulo Tormenta20 Loja`);

  // Lista de IDs de compêndios extras (ex: "world.meu-compendio")
  game.settings.register(MODULE_ID, 'extraCompendiums', {
    name: 'Compêndios Adicionais',
    hint: 'Compêndios de itens adicionais que aparecerão na loja.',
    scope: 'world',
    config: false,
    type: Array,
    default: []
  });

  // Lista de UUIDs de itens individuais extras
  game.settings.register(MODULE_ID, 'extraItems', {
    name: 'Itens Individuais',
    hint: 'UUIDs de itens individuais que aparecerão na loja.',
    scope: 'world',
    config: false,
    type: Array,
    default: []
  });

  // Se deve incluir compêndios do sistema automaticamente
  game.settings.register(MODULE_ID, 'includeSystemPacks', {
    name: 'Incluir Compêndios do Sistema',
    hint: 'Inclui automaticamente todos os compêndios de itens do sistema Tormenta20.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  });

  // Se deve incluir itens do mundo (World Items)
  game.settings.register(MODULE_ID, 'includeWorldItems', {
    name: 'Incluir Itens do Mundo',
    hint: 'Inclui os itens cadastrados diretamente no mundo (aba Itens do sidebar).',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  });

  // Moeda preferida para troco (ao redistribuir após compra)
  game.settings.register(MODULE_ID, 'keepChange', {
    name: 'Manter Troco em Prata',
    hint: 'Ao comprar, mantém o troco em moedas de prata em vez de converter para cobre.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  });

  // Menu de configurações avançadas (compêndios e itens individuais)
  game.settings.registerMenu(MODULE_ID, 'shopSettingsMenu', {
    name: 'Configurar Fontes da Loja',
    label: 'Abrir Configurações',
    hint: 'Configure quais compêndios e itens individuais aparecem na loja.',
    icon: 'fas fa-boxes',
    type: ShopSettingsApplication,
    restricted: true
  });
});

/* ─────────────────────────────────────────────
   READY — Injeta botão nas fichas de personagem
───────────────────────────────────────────── */
Hooks.on('renderActorSheet', (app, html, _data) => {
  const actor = app.actor;

  // Só adiciona para atores com sistema de dinheiro (personagens jogáveis)
  if (!actor?.system?.dinheiro) return;

  // Evita duplicar o botão em re-renders
  const existingBtn = html.closest('.app').find('.t20-loja-btn');
  if (existingBtn.length > 0) return;

  const btn = $(`
    <a class="t20-loja-btn header-button control" title="Abrir Loja">
      <i class="fas fa-store"></i>
      <span>Loja</span>
    </a>
  `);

  btn.on('click', ev => {
    ev.preventDefault();
    ev.stopPropagation();
    // Reutiliza janela existente se já aberta para este ator
    const existing = Object.values(ui.windows).find(
      w => w instanceof ShopApplication && w.actor.id === actor.id
    );
    if (existing) {
      existing.bringToTop();
    } else {
      new ShopApplication(actor).render(true);
    }
  });

  // Insere antes do botão de fechar
  html.closest('.app').find('.window-header .close').before(btn);
});
