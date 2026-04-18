/**
 * ShopApplication — Janela principal da loja Tormenta20.
 *
 * Carrega itens de:
 *   • Itens do mundo (se habilitado)
 *   • Compêndios do sistema (se habilitado)
 *   • Compêndios configurados pelo usuário
 *   • Itens individuais por UUID
 *
 * Moedas: TC (cobre) = 0,1 TP | TP (prata, base) | TO (ouro) = 10 TP
 * Internamente tudo é convertido para cobre inteiro para evitar float.
 *   1 TC = 1 cobre | 1 TP = 10 cobre | 1 TO = 100 cobre
 */

import { MODULE_ID } from './main.js';

/* ── Mapa de tipos para labels legíveis ─────── */
const TYPE_LABELS = {
  weapon     : 'Arma',
  armor      : 'Armadura',
  equipment  : 'Equipamento',
  consumable : 'Consumível',
  consumivel : 'Consumível',
  tool       : 'Ferramenta',
  loot       : 'Espólio',
  backpack   : 'Bolsa / Contêiner',
  spell      : 'Magia',
  feat       : 'Habilidade',
  class      : 'Classe',
  subclass   : 'Subclasse',
  race       : 'Raça',
  background : 'Origem',
  arma       : 'Arma',
  armadura   : 'Armadura',
  item       : 'Item',
  poder      : 'Poder',
  magia      : 'Magia',
  tormenta20weapon : 'Arma',
};

const WEAPON_PROPERTIES = ['propriedades.ada', 'propriedades.agi', 'propriedades.alo', 'propriedades.des', 'propriedades.dupla', 'propriedades.ver', 'propriedades.hib'];
const WEAPON_PURPOSES = ['corpo-a-corpo', 'corpo-a-corpo-arremesso', 'disparo', 'arremesso'];
const WEAPON_GRIPS = ['leve', 'uma', 'duas'];
const WEAPON_PROFICIENCY = ['marcial', 'simples', 'exotica', 'fogo'];

const EQUIPMENT_TYPES = ['escudo', 'leve', 'pesada', 'acessorio', 'ferramenta', 'esoterico'];
const EQUIPMENT_USAGE = ['equipado2.hand', 'equipado2.body', 'equipado2.both'];

const CONSUMABLE_TYPES = ['ammo', 'scroll', 'alchemy', 'potion', 'material', 'food'];

function typeLabel(type) {
  return TYPE_LABELS[type] ?? type ?? 'Item';
}

function isConsumableType(type) {
  return (typeLabel(type) || '').toLowerCase() === 'consumível';
}

function normalizeCodes(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.flatMap(normalizeCodes);
  }
  if (typeof value === 'object') {
    return normalizeCodes(value.value ?? value.id ?? value.key ?? value.codigo ?? value.slug ?? '');
  }
  if (typeof value !== 'string') return [];
  return value
    .split(/[,;|]/)
    .flatMap(part => part.trim().toLowerCase().split(/\s+/))
    .map(part => part.replace(/[^a-z0-9-]/g, ''))
    .filter(Boolean);
}

function normalizeText(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.toLowerCase();
  if (typeof value === 'object') return normalizeText(value.value ?? value.label ?? value.name ?? '');
  return String(value).toLowerCase();
}

function getMainCategoryTag(itemType) {
  const label = (typeLabel(itemType) || '').toLowerCase();
  if (label === 'arma') return 'cat:arma';
  if (label === 'consumível') return 'cat:consumivel';
  if (label === 'espólio' || itemType === 'loot' || itemType === 'tesouro') return 'cat:tesouro';
  if (['equipamento', 'armadura', 'ferramenta', 'bolsa / contêiner'].includes(label)) {
    return 'cat:equipamento';
  }
  return null;
}

function mapWeaponPurpose(value) {
  const text = normalizeText(value);
  if (!text) return null;
  if (text.includes('corpo') && text.includes('arremesso')) return 'corpo-a-corpo-arremesso';
  if (text.includes('corpo')) return 'corpo-a-corpo';
  if (text.includes('disparo')) return 'disparo';
  if (text.includes('arremesso')) return 'arremesso';
  return WEAPON_PURPOSES.find(code => text.includes(code)) ?? null;
}

function mapEquipmentType(value) {
  const text = normalizeText(value);
  if (!text) return null;
  if (text.includes('escudo')) return 'escudo';
  if (text.includes('leve')) return 'leve';
  if (text.includes('pesada')) return 'pesada';
  if (text.includes('acess')) return 'acessorio';
  if (text.includes('ferrament')) return 'ferramenta';
  if (text.includes('esot')) return 'esoterico';
  return EQUIPMENT_TYPES.find(code => text.includes(code)) ?? null;
}

function buildFilterTags(doc) {
  const tags = new Set();
  const system = doc.system ?? {};
  const mainTag = getMainCategoryTag(doc.type);
  if (mainTag) tags.add(mainTag);

  if (mainTag === 'cat:arma') {
    const propsRaw = system.propriedades?.value ?? system.propriedades ?? system.properties?.value ?? system.properties ?? [];
    const propCodes = normalizeCodes(propsRaw).filter(code => WEAPON_PROPERTIES.includes(code));
    propCodes.forEach(code => tags.add(`prop:${code.split('.').pop()}`));

    if (system.propriedades && typeof system.propriedades === 'object') {
      WEAPON_PROPERTIES.forEach(code => {
        const key = code.split('.').pop();
        if (system.propriedades?.[key]) {
          tags.add(`prop:${key}`);
        }
      });
    }

    const purpose = mapWeaponPurpose(system.proposito?.value ?? system.proposito);
    if (purpose) tags.add(`purpose:${purpose}`);

    const gripCodes = normalizeCodes(system.empunhadura?.value ?? system.empunhadura).filter(code => WEAPON_GRIPS.includes(code));
    gripCodes.forEach(code => tags.add(`grip:${code}`));

    const profCodes = normalizeCodes(system.proficiencia?.value ?? system.proficiencia).filter(code => WEAPON_PROFICIENCY.includes(code));
    profCodes.forEach(code => tags.add(`prof:${code}`));
  }

  if (mainTag === 'cat:equipamento') {
    const equipType = mapEquipmentType(system.tipo?.value ?? system.tipo);
    if (equipType) tags.add(`equip:${equipType}`);

    const usageType = normalizeText(system.equipado2?.type ?? system.equipado?.type ?? system.equipado);
    if (['hand', 'body', 'both'].includes(usageType)) {
      tags.add(`usage:${usageType}`);
    } else {
      const usage = normalizeText(system.equipado2?.type ?? system.equipado2 ?? system.equipado?.value ?? system.equipado);
      const usageCode = EQUIPMENT_USAGE.find(code => usage.includes(code));
      if (usageCode) tags.add(`usage:${usageCode.split('.').pop()}`);
    }
  }

  if (mainTag === 'cat:consumivel') {
    const consumableType = normalizeText(system.tipo?.value ?? system.tipo);
    const consumableCode = CONSUMABLE_TYPES.find(code => consumableType.includes(code));
    if (consumableCode) tags.add(`cons:${consumableCode}`);
  }

  return Array.from(tags);
}

/* ── Helpers de moeda ───────────────────────── */

/** Converte (TO, TP, TC) → inteiro em cobre (base 1). */
function toCobre(to = 0, tp = 0, tc = 0) {
  return Math.round((to * 100) + (tp * 10) + tc);
}

/** Converte inteiro de cobre de volta para (TO, TP, TC). */
function fromCobre(cobre) {
  const to = Math.floor(cobre / 100);
  const remainder = cobre % 100;
  const tp = Math.floor(remainder / 10);
  const tc = remainder % 10;
  return { to, tp, tc };
}

/** Retorna texto legível para um preço em prata (TP). */
function precoDisplay(silverPrice) {
  if (silverPrice === 0) return 'Grátis';
  // Formata para ter no máximo 1 casa decimal, se necessário.
  const formattedPrice = Number(silverPrice.toFixed(1));
  return `${formattedPrice} TP`;
}

/* ─────────────────────────────────────────────────────────────
   ShopApplication
───────────────────────────────────────────────────────────── */
export class ShopApplication extends Application {
  constructor(actor, options = {}) {
    super(options);
    this.actor   = actor;
    /** @type {ShopItem[]} Todos os itens disponíveis (carregados uma vez por sessão de janela) */
    this._allItems   = [];
    /** @type {boolean} Indica se itens já foram carregados */
    this._loaded     = false;
    /** @type {boolean} Está carregando */
    this._loading    = false;
    /** Estado de filtros */
    this._search     = '';
    this._typeFilter = 'all';
    this._sortBy     = 'name';
  this._mode       = 'buy';
  this._sellPercent = 50;
  this._affordableOnly = true;
  this._filterTags = new Set();
  this._filterMatch = 'any';
  this._openFilterGroups = new Set();

    this._actorUpdateHook = Hooks.on('updateActor', (updatedActor, data) => {
      if (!this.rendered) return;
      if (updatedActor?.id !== this.actor?.id) return;
      if (!data?.system?.dinheiro) return;
      this.render();
    });
  }

  async close(options = {}) {
    if (this._actorUpdateHook) {
      Hooks.off('updateActor', this._actorUpdateHook);
      this._actorUpdateHook = null;
    }
    return super.close(options);
  }

  /* ── defaultOptions ─────────────────────────── */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id        : `t20-loja-${foundry.utils.randomID(4)}`,
      title     : 'Loja',
      template: `modules/loja-t20/templates/shop.hbs`,
      width     : 780,
      height    : 620,
      resizable : true,
      classes   : ['t20-loja-window'],
      scrollY   : ['.shop-items-list'],
    });
  }

  /* ── getData ────────────────────────────────── */
  async getData() {
    // Carrega itens na primeira vez (ou se ainda não carregou)
    if (!this._loaded && !this._loading) {
      await this._loadAllItems();
    }

  const filtered  = this._applyFilters(this._allItems);
  const sorted    = this._applySort(filtered);
    const sellItemsRaw = this._getSellItems();
    const sellFiltered = this._applyFilters(sellItemsRaw);
    const sellSorted = this._applySort(sellFiltered);
    const wealth    = this._wealthInfo();
    const totalCopper = toCobre(wealth.to, wealth.tp, wealth.tc);

    // Enriquece itens com flag "pode comprar"
    let buyItems = sorted.map(item => ({
      ...item,
      canAfford : totalCopper >= Math.round(item.preco * 10),
    }));

    if (this._affordableOnly) {
      buyItems = buyItems.filter(item => item.canAfford);
    }

    const sellItems = sellSorted.map(item => ({
      ...item,
      sellPriceDisplay: precoDisplay(item.sellPrice),
    }));

    // Coleta tipos únicos para o filtro
    const types = [...new Set(this._allItems.map(i => i.type))]
      .sort()
      .map(t => ({ value: t, label: typeLabel(t) }));

    const isSellMode = this._mode === 'sell';
    return {
      actor      : this.actor,
      items      : isSellMode ? sellItems : buyItems,
      types,
      search     : this._search,
      typeFilter : this._typeFilter,
      sortBy     : this._sortBy,
      wealth,
      loading    : this._loading,
      totalItems : isSellMode ? sellFiltered.length : filtered.length,
      mode       : this._mode,
      sellPercent: this._sellPercent,
      affordableOnly: this._affordableOnly,
      filterMatch: this._filterMatch,
    };
  }

  /* ── Carregamento de itens ──────────────────── */
  async _loadAllItems() {
    this._loading = true;
    this._loaded  = false;
    this.render(); // mostra spinner

    const items  = [];
    const seen   = new Set();   // evita duplicatas por UUID

    const addItem = (doc) => {
      if (!doc) return;
      const preco = doc.system?.preco;
      if (preco === undefined || preco === null || preco === '' || Number(preco) <= 0) return;
      const uuid = doc.uuid ?? doc.id;
      if (seen.has(uuid)) return;
      seen.add(uuid);
      items.push(this._formatItem(doc));
    };

    // 1. Itens do mundo
    if (game.settings.get(MODULE_ID, 'includeWorldItems')) {
      for (const item of game.items) addItem(item);
    }

    // 2. Compêndios do sistema
    if (game.settings.get(MODULE_ID, 'includeSystemPacks')) {
      const sysPacks = game.packs.filter(
        p => p.documentName === 'Item' &&
             (p.metadata.packageType === 'system' || p.metadata.packageName === game.system.id)
      );
      for (const pack of sysPacks) {
        try {
          const docs = await pack.getDocuments();
          for (const doc of docs) addItem(doc);
        } catch (e) {
          console.warn(`${MODULE_ID} | Erro ao carregar compêndio ${pack.collection}`, e);
        }
      }
    }

    // 3. Compêndios configurados
    const extraPacks = game.settings.get(MODULE_ID, 'extraCompendiums') || [];
    for (const packId of extraPacks) {
      const pack = game.packs.get(packId);
      if (!pack || pack.documentName !== 'Item') {
        console.warn(`${MODULE_ID} | Compêndio inválido ou não é de Itens: ${packId}`);
        continue;
      }
      try {
        const docs = await pack.getDocuments();
        for (const doc of docs) addItem(doc);
      } catch (e) {
        console.warn(`${MODULE_ID} | Erro ao carregar compêndio ${packId}`, e);
      }
    }

    // 4. Itens individuais por UUID
    const extraItems = game.settings.get(MODULE_ID, 'extraItems') || [];
    for (const uuid of extraItems) {
      try {
        const doc = await fromUuid(uuid);
        addItem(doc);
      } catch (e) {
        console.warn(`${MODULE_ID} | UUID inválido: ${uuid}`, e);
      }
    }

    this._allItems = items;
    this._loaded   = true;
    this._loading  = false;
    this.render();
  }

  /** Formata um documento Item para o formato interno da loja. */
  _formatItem(doc) {
    const preco = Number(doc.system?.preco) || 0;
    const espacosBase = Number(doc.system?.espacos) || 0;
    const qtd = Number(doc.system?.qtd) || 1;
    const espacos = espacosBase * qtd;
    const filterTags = buildFilterTags(doc);
    return {
      uuid        : doc.uuid,
      name        : doc.name,
      img         : doc.img ?? 'icons/svg/item-bag.svg',
      type        : doc.type,
      typeLabel   : typeLabel(doc.type),
      preco,
      precoDisplay: precoDisplay(preco),
      espacos,
      filterTags,
      description : doc.system?.description?.value ?? '',
      source      : doc.system?.source ?? '',
    };
  }

  _getSellItems() {
    const percent = this._sellPercent / 100;
    return this.actor.items.map(item => {
      const preco = Number(item.system?.preco) || 0;
      const qtd = Number(item.system?.qtd) || 1;
      const espacosBase = Number(item.system?.espacos) || 0;
      const espacos = espacosBase * qtd;
      const sellPrice = preco * qtd * percent;
  const filterTags = buildFilterTags(item);
      return {
        itemId     : item.id,
        uuid       : item.uuid,
        name       : item.name,
        img        : item.img ?? 'icons/svg/item-bag.svg',
        type       : item.type,
        typeLabel  : typeLabel(item.type),
        preco,
        qtd,
        sellPrice,
        espacos,
        filterTags,
        description: item.system?.description?.value ?? '',
        source     : item.system?.source ?? '',
      };
    });
  }

  async _promptQuantity({ title, unitPrice, max = 999, percent = 1, label }) {
    return new Promise(resolve => {
      const content = `
        <div class="t20-loja-qty">
          <p>${label}</p>
          <div class="qty-row">
            <label>Quantidade</label>
            <input type="number" name="qty" min="1" max="${max}" value="1" />
          </div>
          <p class="qty-preview">Total: <strong>${precoDisplay(unitPrice * percent)}</strong></p>
        </div>
      `;

      const dialog = new Dialog({
        title,
        content,
        buttons: {
          confirm: {
            icon: '<i class="fas fa-check"></i>',
            label: 'Confirmar',
            callback: html => {
              const value = Number(html.find('input[name="qty"]').val()) || 1;
              resolve(Math.min(max, Math.max(1, value)));
            },
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: 'Cancelar',
            callback: () => resolve(null),
          },
        },
        default: 'confirm',
        close: () => resolve(null),
        render: html => {
          const input = html.find('input[name="qty"]');
          const preview = html.find('.qty-preview strong');
          input.on('input', ev => {
            const value = Number(ev.currentTarget.value) || 1;
            const clamped = Math.min(max, Math.max(1, value));
            ev.currentTarget.value = clamped;
            preview.text(precoDisplay(unitPrice * clamped * percent));
          });
        },
      });

      dialog.render(true);
    });
  }

  /* ── Filtros e ordenação ────────────────────── */
  _applyFilters(items) {
    let list = items;
    if (this._search) {
      const q = this._search.toLowerCase();
      list = list.filter(i =>
        i.name.toLowerCase().includes(q) ||
        i.typeLabel.toLowerCase().includes(q)
      );
    }
    if (this._typeFilter !== 'all') {
      list = list.filter(i => i.type === this._typeFilter);
    }

    if (this._filterTags.size > 0) {
      const selected = Array.from(this._filterTags);
      const matchAll = this._filterMatch === 'all';
      list = list.filter(item => {
        const tags = item.filterTags ?? [];
        if (matchAll) {
          return selected.every(tag => tags.includes(tag));
        }
        return selected.some(tag => tags.includes(tag));
      });
    }
    return list;
  }

  _applySort(items) {
    const copy = [...items];
    switch (this._sortBy) {
      case 'price-asc'  : return copy.sort((a, b) => a.preco - b.preco);
      case 'price-desc' : return copy.sort((a, b) => b.preco - a.preco);
      case 'type'       : return copy.sort((a, b) => a.typeLabel.localeCompare(b.typeLabel) || a.name.localeCompare(b.name));
      default           : return copy.sort((a, b) => a.name.localeCompare(b.name));
    }
  }

  /* ── Riqueza do ator ─────────────────────────── */
  _wealthInfo() {
    const d = this.actor.system?.dinheiro ?? {};
    const to = Number(d.to) || 0;
    const tp = Number(d.tp) || 0;
    const tc = Number(d.tc) || 0;
    const tl = Number(d.tl) || 0;
    const totalSilver = (to * 10) + tp + (tc * 0.1);
    return { to, tp, tc, tl, totalSilver: parseFloat(totalSilver.toFixed(2)) };
  }

  /* ── Compra ──────────────────────────────────── */
  async _purchaseItem(uuid) {
    const shopItem = this._allItems.find(i => i.uuid === uuid);
    if (!shopItem) return ui.notifications.error('Item não encontrado na loja.');

    let qty = 1;
  if (isConsumableType(shopItem.type)) {
      const chosen = await this._promptQuantity({
        title: `Comprar ${shopItem.name}`,
        unitPrice: shopItem.preco,
        max: 999,
        percent: 1,
        label: 'Selecione a quantidade para compra.',
      });
      if (!chosen) return;
      qty = chosen;
    }

    const wealth      = this._wealthInfo();
    const totalCopper = toCobre(wealth.to, wealth.tp, wealth.tc);
    const costCopper  = Math.round(shopItem.preco * qty * 10);

    if (totalCopper < costCopper) {
      return ui.notifications.warn(
        `${this.actor.name} não tem moedas suficientes para comprar "${shopItem.name}"!`
      );
    }

    // Calcula novo saldo
    const remaining = totalCopper - costCopper;
    let newTo, newTp, newTc;

    // Redistribui tudo normalmente
    ({ to: newTo, tp: newTp, tc: newTc } = fromCobre(remaining));

    // Busca documento original para copiar dados
    let sourceDoc;
    try {
      sourceDoc = await fromUuid(uuid);
    } catch (e) {
      return ui.notifications.error(`Não foi possível carregar o item: ${uuid}`);
    }

    if (!sourceDoc) return ui.notifications.error('Item não encontrado no compêndio.');

    // Verifica se o ator já possui o item (mesma origem)
    const existing = this.actor.items.find(i => {
      const flag = i.getFlag(MODULE_ID, 'sourceUuid');
      return flag === uuid || i.name === sourceDoc.name;
    });

    if (existing && existing.system?.qtd !== undefined) {
      // Incrementa quantidade
      await existing.update({ 'system.qtd': (existing.system.qtd || 1) + qty });
    } else {
      // Cria novo item
      const itemData = sourceDoc.toObject();
      itemData.system.qtd = qty;
      const [created] = await this.actor.createEmbeddedDocuments('Item', [itemData]);
      // Marca a origem para futura detecção de duplicatas
      if (created) await created.setFlag(MODULE_ID, 'sourceUuid', uuid);
    }

    // Atualiza dinheiro
    await this.actor.update({
      'system.dinheiro.to': newTo,
      'system.dinheiro.tp': newTp,
      'system.dinheiro.tc': newTc,
    });

    const messageContent = `
      <div class="t20-loja-message">
        <p><strong>${this.actor.name}</strong> comprou:</p>
        <ul>
          <li><strong>Item:</strong> ${shopItem.name}</li>
          <li><strong>Quantidade:</strong> ${qty}</li>
          <li><strong>Preço:</strong> ${shopItem.precoDisplay}</li>
          <li><strong>Saldo final:</strong> ${newTo} TO | ${newTp} TP | ${newTc} TC</li>
        </ul>
      </div>
    `;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: messageContent,
    });

    this.render();
  }

  async _sellItem(itemId) {
    const item = this.actor.items.get(itemId);
    if (!item) return ui.notifications.error('Item não encontrado no inventário.');

    const preco = Number(item.system?.preco) || 0;
    const qtd = Number(item.system?.qtd) || 1;
    const percent = this._sellPercent / 100;

    let sellQty = qtd;
  if (isConsumableType(item.type)) {
      const chosen = await this._promptQuantity({
        title: `Vender ${item.name}`,
        unitPrice: preco,
        max: qtd,
        percent,
        label: 'Selecione a quantidade para venda.',
      });
      if (!chosen) return;
      sellQty = chosen;
    }

    const sellCopper = Math.round(preco * sellQty * percent * 10);

    const wealth = this._wealthInfo();
    const totalCopper = toCobre(wealth.to, wealth.tp, wealth.tc);
    const newTotal = totalCopper + sellCopper;
    const { to: newTo, tp: newTp, tc: newTc } = fromCobre(newTotal);

    if (sellQty >= qtd) {
      await item.delete();
    } else {
      await item.update({ 'system.qtd': qtd - sellQty });
    }

    await this.actor.update({
      'system.dinheiro.to': newTo,
      'system.dinheiro.tp': newTp,
      'system.dinheiro.tc': newTc,
    });

    const messageContent = `
      <div class="t20-loja-message">
        <p><strong>${this.actor.name}</strong> vendeu:</p>
        <ul>
          <li><strong>Item:</strong> ${item.name}</li>
          <li><strong>Quantidade:</strong> ${sellQty}</li>
          <li><strong>Percentual:</strong> ${Math.round(percent * 100)}%</li>
          <li><strong>Recebido:</strong> ${precoDisplay(preco * sellQty * percent)}</li>
          <li><strong>Saldo final:</strong> ${newTo} TO | ${newTp} TP | ${newTc} TC</li>
        </ul>
      </div>
    `;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: messageContent,
    });

    this.render();
  }

  /* ── Listeners ──────────────────────────────── */
  activateListeners(html) {
    super.activateListeners(html);

    // Pesquisa
    html.find('.shop-search-input').on('input', ev => {
      this._search = ev.currentTarget.value;
      this.render();
    });

    // Devolve o foco à barra de pesquisa após o render
    if (html.find('.shop-search-input').length > 0 && this._search) {
      const searchInput = html.find('.shop-search-input')[0];
      searchInput.focus();
      // Coloca o cursor no final do texto
      const val = searchInput.value;
      searchInput.value = '';
      searchInput.value = val;
    }

    // Filtro de tipo
    html.find('.shop-type-filter').on('change', ev => {
      this._typeFilter = ev.currentTarget.value;
      this.render();
    });

    // Ordenação
    html.find('.shop-sort').on('change', ev => {
      this._sortBy = ev.currentTarget.value;
      this.render();
    });

    // Botão Comprar
    html.find('.btn-buy').on('click', ev => {
      const uuid = ev.currentTarget.dataset.uuid;
      this._purchaseItem(uuid);
    });

    // Botão Vender
    html.find('.btn-sell').on('click', ev => {
      const itemId = ev.currentTarget.dataset.itemId;
      this._sellItem(itemId);
    });

    // Alternar modo
    html.find('.shop-mode-toggle button').on('click', ev => {
      const mode = ev.currentTarget.dataset.mode;
      if (!mode || mode === this._mode) return;
      this._mode = mode;
      this.render();
    });

    // Percentual de venda
    const sellRange = html.find('.shop-sell-percent');
    const sellInput = html.find('.shop-sell-percent-input');
    const applySellPercent = value => {
      const clamped = Math.min(100, Math.max(1, Number(value) || 1));
      this._sellPercent = clamped;
      sellRange.val(clamped);
      sellInput.val(clamped);
    };

    sellRange.on('input', ev => {
      applySellPercent(ev.currentTarget.value);
    });

    sellRange.on('change', () => {
      this.render();
    });

    sellInput.on('input', ev => {
      applySellPercent(ev.currentTarget.value);
    });

    sellInput.on('change', () => {
      this.render();
    });

    // Filtros avançados
    html.find('.side-filter-group').each((_, el) => {
      const key = el.dataset.group;
      if (!key) return;
      if (el.open) {
        this._openFilterGroups.add(key);
      }
    });

    html.find('.shop-filter-checkbox').each((_, el) => {
      el.checked = this._filterTags.has(el.dataset.tag);
    });

    html.find('.side-filter-group').each((_, el) => {
      const key = el.dataset.group;
      if (!key) return;
      el.open = this._openFilterGroups.has(key);
    });

    html.find(`input[name="shop-filter-match"][value="${this._filterMatch}"]`).prop('checked', true);

    html.find('.shop-filter-checkbox').on('change', ev => {
      const tag = ev.currentTarget.dataset.tag;
      if (!tag) return;
      if (ev.currentTarget.checked) {
        this._filterTags.add(tag);
      } else {
        this._filterTags.delete(tag);
      }
      this.render();
    });

    html.find('.side-filter-group').on('toggle', ev => {
      const key = ev.currentTarget.dataset.group;
      if (!key) return;
      if (ev.currentTarget.open) {
        this._openFilterGroups.add(key);
      } else {
        this._openFilterGroups.delete(key);
      }
    });

    html.find('input[name="shop-filter-match"]').on('change', ev => {
      this._filterMatch = ev.currentTarget.value;
      this.render();
    });

    // Filtro de itens acessíveis
    html.find('.shop-affordable-only').on('change', ev => {
      this._affordableOnly = ev.currentTarget.checked;
      this.render();
    });

    // Expandir/colapsar descrição do item
    html.find('.shop-item-name').on('click', async ev => {
      const uuid = ev.currentTarget.dataset.uuid;
      if (!uuid) return;
      const item = await fromUuid(uuid);
      if (item) {
        item.sheet.render(true);
      }
    });

    // Drag de item (para arrastar para fichas, cenas, etc.)
    html.find('.shop-item-img').on('dragstart', ev => {
      const uuid = ev.currentTarget.dataset.uuid;
      ev.originalEvent.dataTransfer.setData('text/plain', JSON.stringify({ type: 'Item', uuid }));
    });
  }
}
