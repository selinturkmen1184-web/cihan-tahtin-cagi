(() => {
  const STORAGE_KEY = "cihan-tahtin-cagi-kingdom-v1";
  const numberFormat = new Intl.NumberFormat("tr-TR");

  const buildingCatalog = {
    palace: {
      name: "Cihan Sarayı",
      icon: "♜",
      description: "Şehir seviyesini ve bütün bina sınırlarını yükseltir.",
      baseCost: { wood: 1500, stone: 1800, gold: 700 },
      duration: 18,
    },
    farm: {
      name: "Sultan Çiftliği",
      icon: "◉",
      description: "Ordunun ve halkın ihtiyaç duyduğu erzağı üretir.",
      baseCost: { wood: 720, stone: 340 },
      duration: 9,
    },
    lumber: {
      name: "Kereste Ocağı",
      icon: "╱",
      description: "İnşa ve kuşatma araçları için kereste üretir.",
      baseCost: { food: 420, stone: 520 },
      duration: 10,
    },
    quarry: {
      name: "Taş Ocağı",
      icon: "◆",
      description: "Surlar ve devlet binaları için işlenmiş taş üretir.",
      baseCost: { food: 560, wood: 680 },
      duration: 11,
    },
    barracks: {
      name: "Yeniçeri Kışlası",
      icon: "⚔",
      description: "Daha yüksek kademeli birliklerin eğitimini hızlandırır.",
      baseCost: { food: 900, wood: 840, stone: 520 },
      duration: 13,
    },
    academy: {
      name: "Harp Akademisi",
      icon: "✦",
      description: "Komutan becerilerini ve ordu teknolojilerini açar.",
      baseCost: { wood: 880, stone: 920, gold: 520 },
      duration: 15,
    },
    hospital: {
      name: "Darüşşifa",
      icon: "✚",
      description: "Savaşta yaralanan askerleri yeniden orduya kazandırır.",
      baseCost: { wood: 730, stone: 680, gold: 330 },
      duration: 12,
    },
    market: {
      name: "Cihan Pazarı",
      icon: "◈",
      description: "Altın üretir, ticaret kervanlarını ve ittifak yardımını açar.",
      baseCost: { wood: 820, stone: 540, gold: 280 },
      duration: 12,
    },
  };

  const unitCatalog = {
    infantry: {
      name: "Kapıkulu Piyadesi",
      icon: "♟",
      tier: "Kademe II",
      description: "Surları ve ön hattı tutan dayanıklı kılıçlı birlik.",
      amount: 40,
      cost: { food: 620, gold: 160 },
      duration: 9,
      counter: "Süvariye karşı güçlü",
    },
    archer: {
      name: "Serhat Okçuları",
      icon: "➶",
      tier: "Kademe II",
      description: "Piyadeyi uzaktan zayıflatan menzilli destek birlikleri.",
      amount: 40,
      cost: { food: 520, wood: 380 },
      duration: 10,
      counter: "Piyadeye karşı güçlü",
    },
    cavalry: {
      name: "Sipahi Süvarileri",
      icon: "♞",
      tier: "Kademe II",
      description: "Kanatları yaran hızlı ve yüksek hasarlı atlı birlik.",
      amount: 24,
      cost: { food: 840, gold: 340 },
      duration: 12,
      counter: "Okçuya karşı güçlü",
    },
    siege: {
      name: "Şahi Topları",
      icon: "◙",
      tier: "Kademe I",
      description: "Kalelere karşı kullanılan yavaş fakat yıkıcı kuşatma aracı.",
      amount: 8,
      cost: { wood: 760, stone: 680, gold: 420 },
      duration: 15,
      counter: "Surlara karşı güçlü",
    },
  };

  const mapNodes = [
    {
      id: "capital",
      name: "Cihan Payitahtı",
      type: "capital",
      icon: "♜",
      x: 48,
      y: 57,
      power: 12840,
      description: "Devletin kalbi. Üretim, eğitim ve bütün seferler buradan yönetilir.",
      reward: "Güvenli bölge",
    },
    {
      id: "karacahisar",
      name: "Karacahisar Kalesi",
      type: "enemy",
      icon: "⚔",
      x: 74,
      y: 36,
      power: 9600,
      description: "Batı geçidini tutan isyancı kale. Ele geçirilirse ticaret yolu açılır.",
      reward: "2.400 Erzak · 900 Altın",
    },
    {
      id: "bandits",
      name: "Kızıl Oba",
      type: "enemy",
      icon: "☠",
      x: 26,
      y: 31,
      power: 7200,
      description: "Kervan yollarını yağmalayan hareketli eşkıya ordusu.",
      reward: "1.600 Erzak · Kahraman XP",
    },
    {
      id: "iron",
      name: "Demir Madeni",
      type: "resource",
      icon: "◆",
      x: 34,
      y: 75,
      power: 2400,
      description: "Taş ve altın bakımından zengin, nöbetçisiz bir kaynak noktası.",
      reward: "1.100 Taş · 350 Altın",
    },
    {
      id: "harbor",
      name: "Mavi Liman",
      type: "resource",
      icon: "≋",
      x: 76,
      y: 77,
      power: 3100,
      description: "İttifak ticaretine açılabilecek stratejik kıyı yerleşimi.",
      reward: "1.400 Kereste · 500 Altın",
    },
    {
      id: "allied-fort",
      name: "Ak Sancak Hisarı",
      type: "alliance",
      icon: "⚑",
      x: 51,
      y: 22,
      power: 15400,
      description: "Göktürkler ittifakının ortak kalesi ve takviye merkezi.",
      reward: "İttifak koruması",
    },
  ];

  const freshState = () => ({
    version: 1,
    started: false,
    currentScreen: "city",
    lastTick: Date.now(),
    resources: {
      food: 18400,
      wood: 11200,
      stone: 8600,
      gold: 5400,
    },
    buildings: {
      palace: 6,
      farm: 5,
      lumber: 5,
      quarry: 4,
      barracks: 5,
      academy: 4,
      hospital: 3,
      market: 4,
    },
    construction: null,
    training: null,
    healing: null,
    wounded: 38,
    troops: {
      infantry: 420,
      archer: 260,
      cavalry: 120,
      siege: 24,
    },
    formation: "balanced",
    heroes: [
      {
        id: "aybars",
        name: "Aybars",
        title: "Sınır Kurdu",
        level: 18,
        skill: 3,
        rarity: "Efsanevi",
        assigned: true,
        bonus: "Piyade savunması +12%",
      },
      {
        id: "nizam",
        name: "Nizam",
        title: "Sessiz Akıl",
        level: 16,
        skill: 2,
        rarity: "Destansı",
        assigned: true,
        bonus: "Okçu menzili +9%",
      },
      {
        id: "leyla",
        name: "Leyla",
        title: "Elçi Kumandan",
        level: 15,
        skill: 2,
        rarity: "Destansı",
        assigned: false,
        bonus: "İttifak takviyesi +15%",
      },
    ],
    quests: [
      {
        id: "build",
        kind: "Günlük",
        title: "Payitahtı Yükselt",
        description: "Herhangi bir binayı 1 kez geliştir.",
        progress: 0,
        target: 1,
        reward: { wood: 900, gold: 240 },
        claimed: false,
      },
      {
        id: "train",
        kind: "Günlük",
        title: "Sancakları Doldur",
        description: "En az 40 yeni asker eğit.",
        progress: 0,
        target: 40,
        reward: { food: 1200, gold: 180 },
        claimed: false,
      },
      {
        id: "scout",
        kind: "Hikâye",
        title: "Sislerin Ardındaki Tehdit",
        description: "Dünya haritasında düşman hedefini keşfet.",
        progress: 0,
        target: 1,
        reward: { food: 800, wood: 600 },
        claimed: false,
      },
      {
        id: "battle",
        kind: "Hikâye",
        title: "Batı Geçidini Tut",
        description: "Karacahisar seferini tamamlayıp başkente dön.",
        progress: 0,
        target: 1,
        reward: { stone: 1100, gold: 500 },
        claimed: false,
      },
    ],
    selectedNode: "karacahisar",
    scouted: [],
    gathered: [],
    captured: [],
    march: null,
    pendingBattleNode: null,
    pendingBattleReward: null,
    alliance: {
      name: "Göktürkler",
      level: 12,
      tech: 68,
      territory: 7,
      donation: 0,
      rally: null,
      messages: [
        {
          name: "Bozkurt Alp",
          avatar: "B",
          text: "Karacahisar önünde düşman hareketliliği var.",
          time: "21:08",
        },
        {
          name: "Asena",
          avatar: "A",
          text: "Takviye birliğim beş dakika içinde hazır.",
          time: "21:10",
        },
        {
          name: "Sultan Selim",
          avatar: "S",
          text: "Bu gece geçidi birlikte tutacağız.",
          time: "21:12",
        },
      ],
    },
    season: {
      points: 1860,
      rank: 42,
      claimed: [],
    },
    notifications: [
      {
        title: "Ambarlar dolmaya devam ediyor",
        text: "Üretim, oyunda değilken de son kaldığın zamandan devam eder.",
      },
      {
        title: "İttifak çağrısı",
        text: "Göktürkler, Karacahisar için ortak sefer hazırlıyor.",
      },
      {
        title: "Sezon görevi",
        text: "2.000 şöhret puanına ulaştığında yeni sancak açılacak.",
      },
    ],
  });

  const elements = {
    opening: document.querySelector("#openingScreen"),
    kingdom: document.querySelector("#kingdomShell"),
    battle: document.querySelector("#battleShell"),
    content: document.querySelector("#kingdomContent"),
    nav: document.querySelector("#kingdomNav"),
    modal: document.querySelector("#kingdomModal"),
    modalCard: document.querySelector("#kingdomModalCard"),
    modalScrim: document.querySelector("#modalScrim"),
    toast: document.querySelector("#gameToast"),
    toastText: document.querySelector("#toastText"),
    toastIcon: document.querySelector("#toastIcon"),
    headerMode: document.querySelector("#headerModeLabel"),
    headerLocation: document.querySelector("#headerLocationLabel"),
    restart: document.querySelector("#restartButton"),
    retry: document.querySelector("#retryBattleButton"),
    notification: document.querySelector("#notificationButton"),
    notificationCount: document.querySelector("#notificationCount"),
    questBadge: document.querySelector("#questBadge"),
    palaceLevel: document.querySelector("#palaceLevel"),
    power: document.querySelector("#kingdomPower"),
    resourceValues: {
      food: document.querySelector("#metaFood"),
      wood: document.querySelector("#metaWood"),
      stone: document.querySelector("#metaStone"),
      gold: document.querySelector("#metaGold"),
    },
  };

  const loadState = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved?.version !== 1) return freshState();
      const base = freshState();
      return {
        ...base,
        ...saved,
        resources: { ...base.resources, ...saved.resources },
        buildings: { ...base.buildings, ...saved.buildings },
        troops: { ...base.troops, ...saved.troops },
        alliance: { ...base.alliance, ...saved.alliance },
        season: { ...base.season, ...saved.season },
      };
    } catch {
      return freshState();
    }
  };

  let kingdomState = loadState();
  let toastTimer = null;
  let lastRenderSignature = "";

  const escapeHtml = (value) =>
    String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const formatNumber = (value) => numberFormat.format(Math.floor(value));

  const formatDuration = (milliseconds) => {
    const total = Math.max(0, Math.ceil(milliseconds / 1000));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  const resourceNames = {
    food: "Erzak",
    wood: "Kereste",
    stone: "Taş",
    gold: "Altın",
  };

  const save = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(kingdomState));
    } catch {
      // Oyun, kayıt alanı kapalı olsa da bu oturum boyunca çalışır.
    }
  };

  const productionRates = () => ({
    food: 0.52 * kingdomState.buildings.farm,
    wood: 0.37 * kingdomState.buildings.lumber,
    stone: 0.29 * kingdomState.buildings.quarry,
    gold: 0.13 * kingdomState.buildings.market,
  });

  const resourceCapacity = () =>
    28000 + kingdomState.buildings.palace * 4500;

  const calculatePower = () => {
    const buildingPower =
      Object.values(kingdomState.buildings).reduce(
        (sum, level) => sum + level,
        0,
      ) * 170;
    const troopPower =
      kingdomState.troops.infantry * 3 +
      kingdomState.troops.archer * 3.2 +
      kingdomState.troops.cavalry * 5.6 +
      kingdomState.troops.siege * 12;
    const heroPower = kingdomState.heroes.reduce(
      (sum, hero) => sum + hero.level * 72 + hero.skill * 180,
      0,
    );
    return Math.round(
      buildingPower +
        troopPower +
        heroPower +
        kingdomState.alliance.tech * 11,
    );
  };

  const costsForBuilding = (id) => {
    const catalog = buildingCatalog[id];
    const level = kingdomState.buildings[id];
    const multiplier = 1 + level * 0.42;
    return Object.fromEntries(
      Object.entries(catalog.baseCost).map(([resource, amount]) => [
        resource,
        Math.round(amount * multiplier / 10) * 10,
      ]),
    );
  };

  const hasResources = (cost) =>
    Object.entries(cost).every(
      ([resource, amount]) => kingdomState.resources[resource] >= amount,
    );

  const spendResources = (cost) => {
    Object.entries(cost).forEach(([resource, amount]) => {
      kingdomState.resources[resource] -= amount;
    });
  };

  const addResources = (reward) => {
    const cap = resourceCapacity();
    Object.entries(reward).forEach(([resource, amount]) => {
      kingdomState.resources[resource] = Math.min(
        cap,
        (kingdomState.resources[resource] || 0) + amount,
      );
    });
  };

  const costMarkup = (cost) =>
    Object.entries(cost)
      .map(
        ([resource, amount]) =>
          `<span>${resourceNames[resource]} <em>${formatNumber(amount)}</em></span>`,
      )
      .join(" · ");

  const rewardText = (reward) =>
    Object.entries(reward)
      .map(
        ([resource, amount]) =>
          `${formatNumber(amount)} ${resourceNames[resource]}`,
      )
      .join(" · ");

  const showToast = (text, icon = "✓") => {
    elements.toastText.textContent = text;
    elements.toastIcon.textContent = icon;
    elements.toast.hidden = false;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      elements.toast.hidden = true;
    }, 2800);
  };

  const closeModal = () => {
    elements.modal.hidden = true;
    elements.modalCard.replaceChildren();
  };

  const openModal = (markup) => {
    elements.modalCard.innerHTML = markup;
    elements.modal.hidden = false;
    elements.modalCard.querySelector("button, input")?.focus();
  };

  const progressQuest = (id, amount) => {
    const quest = kingdomState.quests.find((item) => item.id === id);
    if (!quest || quest.claimed) return;
    quest.progress = Math.min(quest.target, quest.progress + amount);
  };

  const claimableQuestCount = () =>
    kingdomState.quests.filter(
      (quest) => quest.progress >= quest.target && !quest.claimed,
    ).length;

  const navTitle = {
    city: "Payitaht",
    map: "Dünya Haritası",
    army: "Ordugâh",
    heroes: "Kahramanlar",
    quests: "Görev Divanı",
    alliance: "Göktürkler İttifakı",
    season: "Cihan Sezonu",
  };

  const updateHud = () => {
    Object.entries(kingdomState.resources).forEach(([key, value]) => {
      elements.resourceValues[key].textContent = formatNumber(value);
    });
    elements.palaceLevel.textContent = kingdomState.buildings.palace;
    elements.power.textContent = formatNumber(calculatePower());
    const count = claimableQuestCount();
    elements.questBadge.hidden = count === 0;
    elements.questBadge.textContent = count;
    elements.notificationCount.textContent =
      kingdomState.notifications.length;
    elements.notificationCount.hidden =
      kingdomState.notifications.length === 0;
  };

  const renderQueue = () => {
    const construction = kingdomState.construction;
    if (!construction) {
      return `
        <article class="game-panel queue-card">
          <span class="queue-label">İNŞA KUYRUĞU</span>
          <h3>Ustalar Hazır</h3>
          <p>Bir binayı geliştirerek şehrin üretimini ve devlet gücünü artır.</p>
          <div class="timer-bar"><i style="width: 0%"></i></div>
          <div class="queue-meta"><span>Boş sıra</span><strong>1 / 1</strong></div>
        </article>`;
    }
    const building = buildingCatalog[construction.id];
    const total = construction.endAt - construction.startAt;
    const elapsed = Date.now() - construction.startAt;
    const progress = Math.min(100, (elapsed / total) * 100);
    return `
      <article class="game-panel queue-card">
        <span class="queue-label">İNŞA DEVAM EDİYOR</span>
        <h3>${building.name}</h3>
        <p>Ustalar binayı Seviye ${kingdomState.buildings[construction.id] + 1} için hazırlıyor.</p>
        <div class="timer-bar"><i data-timer-progress="construction" style="width:${progress}%"></i></div>
        <div class="queue-meta"><span data-timer-label="construction">${formatDuration(construction.endAt - Date.now())}</span><strong>1 / 1</strong></div>
      </article>`;
  };

  const renderCity = () => {
    const rates = productionRates();
    const buildings = Object.entries(buildingCatalog)
      .map(([id, building]) => {
        const level = kingdomState.buildings[id];
        const cost = costsForBuilding(id);
        const busy = Boolean(kingdomState.construction);
        const canAfford = hasResources(cost);
        const upgrading = kingdomState.construction?.id === id;
        return `
          <article class="building-card ${upgrading ? "upgrading" : ""}">
            <header>
              <span class="building-icon">${building.icon}</span>
              <span class="building-level">Sv. ${level}</span>
            </header>
            <h3>${building.name}</h3>
            <p>${building.description}</p>
            <footer>
              <span class="cost-line">${upgrading ? "İnşa sürüyor" : costMarkup(cost)}</span>
              <button
                class="small-action"
                data-action="upgrade-building"
                data-id="${id}"
                type="button"
                ${busy || !canAfford ? "disabled" : ""}
              >${upgrading ? "İnşa" : "Geliştir"}</button>
            </footer>
          </article>`;
      })
      .join("");

    elements.content.innerHTML = `
      <div class="screen-grid">
        <section class="game-panel">
          <div class="city-banner">
            <div class="city-banner-copy">
              <span>BAŞKENT · SABAH NÖBETİ</span>
              <h2>Payitaht Uyanıyor</h2>
              <p>Atölyelerde çekiç sesleri yükselirken yeni seferin sancakları hazırlanıyor. Her emir şehrin görünüşünü ve gücünü değiştirir.</p>
              <button class="primary-action" data-action="change-screen" data-screen="map" type="button">Dünya Haritasına Çık <span>→</span></button>
            </div>
          </div>
          <div class="city-buildings">${buildings}</div>
        </section>
        <aside class="side-stack">
          ${renderQueue()}
          <article class="game-panel mission-card-meta">
            <span class="panel-kicker">ANA HİKÂYE · BÖLÜM I</span>
            <h3>Batı Geçidindeki Gölge</h3>
            <p>Karacahisar isyan bayrağını çekti. Keşif gönder, ordunu hazırla ve sınır kalesine yürü.</p>
            <button class="primary-action" data-action="change-screen" data-screen="map" type="button">Seferi İncele</button>
            <div class="mission-reward"><span>Bölüm ödülü</span><strong>900 Altın</strong></div>
          </article>
          <article class="game-panel council-card">
            <span class="panel-kicker">DEVLET ÜRETİMİ</span>
            <h3>Saatlik Gelir</h3>
            <p>Kaynaklar açık veya kapalı olduğunda üretime devam eder. Demo için zaman hızlandırılmıştır.</p>
            <div class="mini-stat-grid">
              <div><span>Erzak</span><strong>+${formatNumber(rates.food * 3600)}</strong></div>
              <div><span>Kereste</span><strong>+${formatNumber(rates.wood * 3600)}</strong></div>
              <div><span>Taş</span><strong>+${formatNumber(rates.stone * 3600)}</strong></div>
            </div>
          </article>
        </aside>
      </div>`;
  };

  const nodeClass = (node) =>
    node.type === "enemy"
      ? "enemy"
      : node.type === "resource"
        ? "resource"
        : node.type === "alliance"
          ? "alliance"
          : "";

  const renderMapDetail = (node) => {
    const scouted = kingdomState.scouted.includes(node.id);
    const gathered = kingdomState.gathered.includes(node.id);
    const captured = kingdomState.captured.includes(node.id);
    const march = kingdomState.march;
    const marchingHere = march?.nodeId === node.id;
    const marchReady = marchingHere && march.ready;
    let actions = "";

    if (node.type === "enemy") {
      actions = `
        <button class="ghost-action" data-action="scout-node" data-id="${node.id}" type="button" ${scouted ? "disabled" : ""}>${scouted ? "Keşif Tamamlandı" : "Keşif Gönder"}</button>
        ${
          marchReady
            ? `<button class="primary-action" data-action="enter-battle" data-id="${node.id}" type="button">Savaşa Gir</button>`
            : `<button class="primary-action" data-action="launch-march" data-id="${node.id}" type="button" ${march || captured ? "disabled" : ""}>${captured ? "Kale Fethedildi" : marchingHere ? "Ordu Yolda" : "Orduyu Yürüt"}</button>`
        }`;
    } else if (node.type === "resource") {
      actions = `<button class="primary-action" data-action="gather-node" data-id="${node.id}" type="button" ${gathered ? "disabled" : ""}>${gathered ? "Kaynak Toplandı" : "Kaynakları Topla"}</button>`;
    } else if (node.type === "alliance") {
      actions = `<button class="primary-action" data-action="change-screen" data-screen="alliance" type="button">İttifaka Git</button>`;
    } else {
      actions = `<button class="primary-action" data-action="change-screen" data-screen="city" type="button">Başkente Dön</button>`;
    }

    return `
      <article class="game-panel map-detail">
        <span>${node.type === "enemy" ? "DÜŞMAN BÖLGESİ" : node.type === "resource" ? "KAYNAK NOKTASI" : node.type === "alliance" ? "MÜTTEFİK TOPRAĞI" : "BAŞKENT"}</span>
        <h2>${node.name}</h2>
        <div class="threat-badge">${captured ? "TAHTIN KONTROLÜNDE" : `GÜÇ ${formatNumber(node.power)}`}</div>
        <p>${node.description}</p>
        <ul class="detail-list">
          <li><span>Durum</span><strong>${captured ? "Fethedildi" : scouted ? "Keşfedildi" : node.type === "enemy" ? "Bilinmiyor" : "Güvenli"}</strong></li>
          <li><span>Mesafe</span><strong>${node.id === "capital" ? "—" : "00:08"}</strong></li>
          <li><span>Beklenen ganimet</span><strong>${node.reward}</strong></li>
        </ul>
        ${
          marchingHere && !marchReady
            ? `<div class="timer-bar"><i data-timer-progress="march" style="width:0"></i></div><div class="march-meta"><span>Ordu ilerliyor</span><strong data-timer-label="march">${formatDuration(march.endAt - Date.now())}</strong></div>`
            : ""
        }
        <div class="action-stack">${actions}</div>
      </article>`;
  };

  const renderMap = () => {
    const selected =
      mapNodes.find((node) => node.id === kingdomState.selectedNode) ||
      mapNodes[1];
    const nodes = mapNodes
      .map(
        (node) => `
          <button
            class="map-node-button ${nodeClass(node)} ${selected.id === node.id ? "selected" : ""}"
            style="left:${node.x}%;top:${node.y}%"
            data-action="select-node"
            data-id="${node.id}"
            data-icon="${node.icon}"
            type="button"
          ><span>${node.name}</span></button>`,
      )
      .join("");

    const marchLine = kingdomState.march
      ? `<div class="march-line" style="--march-left:48%;--march-top:57%;--march-width:29%;--march-angle:-34deg"></div>`
      : "";

    elements.content.innerHTML = `
      <div class="screen-grid">
        <section class="game-panel world-map">
          <div class="map-topline">
            <div><span>BATI EYALETİ · SUNUCU 01</span><strong>Sisler Dağılırken</strong></div>
            <button class="ghost-action" data-action="center-capital" type="button">Payitahtı Bul</button>
          </div>
          ${marchLine}
          ${nodes}
        </section>
        <aside class="side-stack">
          ${renderMapDetail(selected)}
          <article class="game-panel queue-card">
            <span class="queue-label">SEFER KUVVETİ</span>
            <h3>${formatNumber(Object.values(kingdomState.troops).reduce((sum, count) => sum + count, 0))} Asker</h3>
            <p>${kingdomState.heroes.filter((hero) => hero.assigned).map((hero) => hero.name).join(" ve ")} ordunun başında. ${kingdomState.formation === "assault" ? "Hücum" : kingdomState.formation === "defense" ? "Savunma" : "Dengeli"} düzeni seçili.</p>
            <button class="ghost-action" data-action="change-screen" data-screen="army" type="button">Orduyu Düzenle</button>
          </article>
        </aside>
      </div>`;
  };

  const renderTrainingQueue = () => {
    const training = kingdomState.training;
    if (!training) {
      return `
        <article class="game-panel queue-card">
          <span class="queue-label">EĞİTİM KUYRUĞU</span>
          <h3>Kışla Emre Hazır</h3>
          <p>Dört sınıftan birini seçerek yeni bir birlik bölüğü eğit.</p>
          <div class="timer-bar"><i></i></div>
          <div class="queue-meta"><span>Boş sıra</span><strong>1 / 1</strong></div>
        </article>`;
    }
    const unit = unitCatalog[training.id];
    const total = training.endAt - training.startAt;
    const progress = Math.min(
      100,
      ((Date.now() - training.startAt) / total) * 100,
    );
    return `
      <article class="game-panel queue-card">
        <span class="queue-label">EĞİTİM DEVAM EDİYOR</span>
        <h3>${unit.name}</h3>
        <p>${unit.amount} asker yemin törenine hazırlanıyor.</p>
        <div class="timer-bar"><i data-timer-progress="training" style="width:${progress}%"></i></div>
        <div class="queue-meta"><span data-timer-label="training">${formatDuration(training.endAt - Date.now())}</span><strong>1 / 1</strong></div>
      </article>`;
  };

  const renderArmy = () => {
    const units = Object.entries(unitCatalog)
      .map(([id, unit]) => {
        const canTrain =
          !kingdomState.training && hasResources(unit.cost);
        return `
          <article class="unit-card">
            <header><span class="unit-emblem">${unit.icon}</span><span class="unit-tier">${unit.tier}</span></header>
            <h3>${unit.name}</h3>
            <p>${unit.description} ${unit.counter}.</p>
            <footer>
              <div><span class="stat-caption">MEVCUT</span><strong class="unit-count">${formatNumber(kingdomState.troops[id])}</strong></div>
              <button class="small-action" data-action="train-unit" data-id="${id}" type="button" ${canTrain ? "" : "disabled"}>+${unit.amount} Eğit</button>
            </footer>
            <div class="cost-line">${costMarkup(unit.cost)}</div>
          </article>`;
      })
      .join("");

    const healing = kingdomState.healing;
    elements.content.innerHTML = `
      <div class="screen-grid">
        <section class="game-panel">
          <div class="section-heading">
            <div><span>ORDU YÖNETİMİ</span><h2>Serdarın Ordusu</h2></div>
            <p>Birlik sınıflarını dengede tut, savaş dizilimini seç ve yaralılarını yeniden saflara döndür.</p>
          </div>
          <div class="army-grid">${units}</div>
          <div class="council-card">
            <span class="panel-kicker">SAVAŞ DİZİLİMİ</span>
            <div class="formation-buttons">
              <button data-action="set-formation" data-id="assault" class="${kingdomState.formation === "assault" ? "active" : ""}" type="button"><span>➤</span>Hücum<br>+%12 Hasar</button>
              <button data-action="set-formation" data-id="balanced" class="${kingdomState.formation === "balanced" ? "active" : ""}" type="button"><span>◆</span>Dengeli<br>+%6 Moral</button>
              <button data-action="set-formation" data-id="defense" class="${kingdomState.formation === "defense" ? "active" : ""}" type="button"><span>▣</span>Savunma<br>+%14 Direnç</button>
            </div>
            <div class="counter-chain"><span>Piyade <b>→</b> Süvari</span><span>Süvari <b>→</b> Okçu</span><span>Okçu <b>→</b> Piyade</span></div>
          </div>
        </section>
        <aside class="side-stack">
          ${renderTrainingQueue()}
          <article class="game-panel hospital-card">
            <span class="panel-kicker">DARÜŞŞİFA · SV. ${kingdomState.buildings.hospital}</span>
            <h3>${kingdomState.wounded} Yaralı Asker</h3>
            <p>${healing ? "Hekimler yaralı birliği tedavi ediyor." : "Yaralı askerler altın ve erzak karşılığında yeniden orduya katılabilir."}</p>
            ${
              healing
                ? `<div class="timer-bar"><i data-timer-progress="healing"></i></div><div class="queue-meta"><span>Tedavi</span><strong data-timer-label="healing">${formatDuration(healing.endAt - Date.now())}</strong></div>`
                : `<button class="primary-action" data-action="heal-units" type="button" ${kingdomState.wounded <= 0 ? "disabled" : ""}>Yaralıları İyileştir</button>`
            }
          </article>
          <article class="game-panel mission-card-meta">
            <span class="panel-kicker">ORDU GÜCÜ</span>
            <h3>${formatNumber(calculatePower())}</h3>
            <p>Kahramanlar, bina seviyeleri, ittifak teknolojisi ve bütün birliklerin toplam gücü.</p>
            <button class="primary-action" data-action="change-screen" data-screen="map" type="button">Sefere Çık</button>
          </article>
        </aside>
      </div>`;
  };

  const renderHeroes = () => {
    const cards = kingdomState.heroes
      .map(
        (hero, index) => `
          <article class="hero-card" data-hero-index="${index}">
            <div class="hero-art"></div>
            <div class="hero-copy">
              <header><h3>${hero.name}</h3><span class="hero-rarity">${hero.rarity}</span></header>
              <span>${hero.title} · Seviye ${hero.level}</span>
              <p>${hero.bonus}. Özel yetenek seviyesi ${hero.skill}/5.</p>
              <div class="skill-pips">${Array.from({ length: 5 }, (_, skillIndex) => `<i class="${skillIndex < hero.skill ? "filled" : ""}"></i>`).join("")}</div>
              <footer>
                <button class="ghost-action" data-action="assign-hero" data-id="${hero.id}" type="button">${hero.assigned ? "Ordudan Çıkar" : "Orduya Ata"}</button>
                <button class="small-action" data-action="upgrade-hero" data-id="${hero.id}" type="button" ${hero.skill >= 5 || kingdomState.resources.gold < 700 ? "disabled" : ""}>Yeteneği Geliştir</button>
              </footer>
            </div>
          </article>`,
      )
      .join("");

    elements.content.innerHTML = `
      <div class="screen-grid">
        <section class="game-panel">
          <div class="section-heading">
            <div><span>KOMUTAN MECLİSİ</span><h2>Tahtın Kahramanları</h2></div>
            <p>Her kahraman farklı birlik türüne ve hükümdarlık yoluna özel bonus kazandırır.</p>
          </div>
          <div class="hero-grid">${cards}</div>
        </section>
        <aside class="side-stack">
          <article class="game-panel mission-card-meta">
            <span class="panel-kicker">AKTİF SERDARLAR</span>
            <h3>${kingdomState.heroes.filter((hero) => hero.assigned).length} / 2 Komutan</h3>
            <p>${kingdomState.heroes.filter((hero) => hero.assigned).map((hero) => hero.name).join(" ve ") || "Henüz komutan atanmadı"} sefer ordusunda görevli.</p>
            <button class="primary-action" data-action="change-screen" data-screen="army" type="button">Orduyu Gör</button>
          </article>
          <article class="game-panel council-card">
            <span class="panel-kicker">YENİ KAHRAMAN</span>
            <h3>Gölgelerin Fatihi</h3>
            <p>Sezon puanı 2.500 olduğunda yeni bir destansı komutan görevi açılacak.</p>
            <div class="progress-bar"><i style="width:${Math.min(100, (kingdomState.season.points / 2500) * 100)}%"></i></div>
            <div class="queue-meta"><span>İlerleme</span><strong>${formatNumber(kingdomState.season.points)} / 2.500</strong></div>
          </article>
        </aside>
      </div>`;
  };

  const renderQuests = () => {
    const cards = kingdomState.quests
      .map((quest) => {
        const ready = quest.progress >= quest.target;
        const progress = Math.min(100, (quest.progress / quest.target) * 100);
        return `
          <article class="quest-card ${ready && !quest.claimed ? "claimable" : ""}">
            <header><h3>${quest.title}</h3><span class="quest-status ${ready && !quest.claimed ? "ready" : ""}">${quest.claimed ? "Tamamlandı" : ready ? "Ödül Hazır" : quest.kind}</span></header>
            <p>${quest.description}</p>
            <div class="progress-bar"><i style="width:${progress}%"></i></div>
            <div class="queue-meta"><span>${quest.progress} / ${quest.target}</span><strong>${rewardText(quest.reward)}</strong></div>
            <footer>
              <span class="cost-line">${quest.kind} görevi</span>
              <button class="small-action" data-action="claim-quest" data-id="${quest.id}" type="button" ${!ready || quest.claimed ? "disabled" : ""}>${quest.claimed ? "Alındı" : "Ödülü Al"}</button>
            </footer>
          </article>`;
      })
      .join("");

    elements.content.innerHTML = `
      <div class="screen-grid">
        <section class="game-panel">
          <div class="section-heading">
            <div><span>HÜKÜMDARLIK HEDEFLERİ</span><h2>Görev Divanı</h2></div>
            <p>Hikâye bölümleri yeni sistemleri açar; günlük görevler düzenli kaynak ve sezon puanı kazandırır.</p>
          </div>
          <div class="quest-tabs"><button class="ghost-action" type="button">Tüm Görevler</button><button class="ghost-action" type="button">Ana Hikâye</button></div>
          <div class="quest-grid">${cards}</div>
        </section>
        <aside class="side-stack">
          <article class="game-panel mission-card-meta">
            <span class="panel-kicker">BÖLÜM İLERLEMESİ</span>
            <h3>Batıdaki İsyan</h3>
            <p>Karacahisar seferini bitirdiğinde yeni eyalet, pazar rotası ve kuşatma teknolojisi açılacak.</p>
            <div class="progress-bar"><i style="width:${kingdomState.quests.find((quest) => quest.id === "battle").progress ? 100 : 45}%"></i></div>
            <div class="queue-meta"><span>Bölüm I</span><strong>3 / 5</strong></div>
          </article>
          <article class="game-panel council-card">
            <span class="panel-kicker">GÜNLÜK SANDIK</span>
            <h3>${kingdomState.quests.filter((quest) => quest.claimed).length} / 4 Emir</h3>
            <p>Dört görevi tamamla ve 1.800 erzak ile kahraman tecrübesi kazan.</p>
          </article>
        </aside>
      </div>`;
  };

  const renderAlliance = () => {
    const messages = kingdomState.alliance.messages
      .slice(-6)
      .map(
        (message) => `
          <article class="chat-message">
            <span class="chat-avatar">${escapeHtml(message.avatar)}</span>
            <div><strong>${escapeHtml(message.name)}</strong><p>${escapeHtml(message.text)}</p></div>
            <time>${escapeHtml(message.time)}</time>
          </article>`,
      )
      .join("");

    const rally = kingdomState.alliance.rally;
    elements.content.innerHTML = `
      <div class="screen-grid">
        <section class="game-panel">
          <div class="alliance-hero">
            <div class="alliance-crest">G</div>
            <span class="panel-kicker">İTTİFAK · SEVİYE ${kingdomState.alliance.level}</span>
            <h2>${kingdomState.alliance.name}</h2>
            <p>“Bir sancak düşerse diğeri onu kaldırır.” Sınırdaki yedi bölge ortak savunma ve ticaret ağıyla birbirine bağlı.</p>
            <div class="mini-stat-grid">
              <div><span>Üye</span><strong>47 / 50</strong></div>
              <div><span>Toprak</span><strong>${kingdomState.alliance.territory}</strong></div>
              <div><span>Sıralama</span><strong>#8</strong></div>
            </div>
          </div>
          <div class="section-heading"><div><span>ANLIK HABERLEŞME</span><h2>İttifak Sohbeti</h2></div><p>Demo mesajları ve yazdığın mesajlar bu cihazda saklanır.</p></div>
          <div class="chat-list">${messages}</div>
          <div class="chat-composer">
            <input id="allianceMessage" maxlength="120" placeholder="İttifaka mesaj yaz..." aria-label="İttifak mesajı" />
            <button class="small-action" data-action="send-alliance-message" type="button">Gönder</button>
          </div>
        </section>
        <aside class="side-stack">
          <article class="game-panel alliance-summary">
            <span class="panel-kicker">İTTİFAK TEKNOLOJİSİ</span>
            <h3>Sınır Lojistiği ${kingdomState.alliance.tech}%</h3>
            <p>Bağışlar bütün üyelerin yürüyüş hızını ve hastane kapasitesini geliştirir.</p>
            <div class="progress-bar"><i style="width:${kingdomState.alliance.tech}%"></i></div>
            <div class="queue-meta"><span>Bu hafta ${formatNumber(kingdomState.alliance.donation)}</span><strong>+%${Math.floor(kingdomState.alliance.tech / 10)} Hız</strong></div>
            <button class="primary-action" data-action="alliance-donate" type="button" ${kingdomState.resources.wood < 700 ? "disabled" : ""}>700 Kereste Bağışla</button>
          </article>
          <article class="game-panel event-card">
            <span class="panel-kicker">ORTAK SEFER</span>
            <h3>Karacahisar Rallisi</h3>
            <p>${rally ? "Müttefik ordular ortak sancak altında toplanıyor." : "Birlik çağrısı aç; simüle edilen müttefikler sefere katılsın."}</p>
            ${
              rally
                ? `<div class="timer-bar"><i data-timer-progress="rally"></i></div><div class="queue-meta"><span>Toplanıyor</span><strong data-timer-label="rally">${formatDuration(rally.endAt - Date.now())}</strong></div>`
                : `<button class="primary-action" data-action="start-rally" type="button">Ralli Başlat</button>`
            }
          </article>
          <article class="game-panel alliance-summary">
            <span class="panel-kicker">DİPLOMASİ</span>
            <h3>2 Dost · 1 Rakip</h3>
            <p>Ak Sancaklar ve Kuzey Yıldızı dost; Kızıl Hanedan sınır rakibi olarak işaretli.</p>
          </article>
        </aside>
      </div>`;
  };

  const renderSeason = () => {
    const rewardLevels = [
      { points: 500, title: "Erzak Sandığı", copy: "2.000 Erzak" },
      { points: 1200, title: "Akıncı Sancağı", copy: "Kozmetik sancak" },
      { points: 2000, title: "Serdar Sandığı", copy: "700 Altın" },
      { points: 3000, title: "Cihan Muhafızı", copy: "Şehir görünümü" },
    ];
    const rewards = rewardLevels
      .map((reward, index) => {
        const unlocked = kingdomState.season.points >= reward.points;
        const claimed = kingdomState.season.claimed.includes(index);
        return `
          <article class="season-reward ${unlocked ? "unlocked" : ""}">
            <span>${formatNumber(reward.points)} ŞÖHRET</span>
            <h3>${reward.title}</h3>
            <p>${reward.copy}</p>
            <button class="small-action" data-action="claim-season" data-id="${index}" type="button" ${!unlocked || claimed ? "disabled" : ""}>${claimed ? "Alındı" : unlocked ? "Ödülü Al" : "Kilitli"}</button>
          </article>`;
      })
      .join("");

    const leaderboard = [
      ["01", "Sultan Alparslan", "8.920"],
      ["02", "Ayşegül Han", "8.440"],
      ["03", "Bozkurt Alp", "7.980"],
      ["42", "Selin Hatun", formatNumber(kingdomState.season.points)],
    ]
      .map(
        ([rank, name, points]) => `
          <article class="leaderboard-row">
            <span class="rank-number">${rank}</span>
            <div><strong>${name}</strong><p>Batı Eyaleti · Sunucu 01</p></div>
            <span>${points} Şöhret</span>
          </article>`,
      )
      .join("");

    elements.content.innerHTML = `
      <div class="screen-grid">
        <section class="game-panel">
          <div class="season-hero">
            <span class="panel-kicker">SEZON I · KIRIK SANCAKLAR</span>
            <h2>Taht İçin İlk Yürüyüş</h2>
            <p>Kaleleri ele geçir, ittifakınla bölge tut ve sezon sonunda Cihan Muhafızı unvanını kazan.</p>
            <div class="season-clock">
              <div><strong>18</strong><span>Gün</span></div>
              <div><strong>06</strong><span>Saat</span></div>
              <div><strong>42</strong><span>Sıra</span></div>
            </div>
          </div>
          <div class="section-heading"><div><span>SEZON YOLU</span><h2>${formatNumber(kingdomState.season.points)} Şöhret</h2></div><p>Görev, sefer ve ittifak etkinlikleri sezon ilerlemesini artırır.</p></div>
          <div class="season-grid">${rewards}</div>
        </section>
        <aside class="side-stack">
          <article class="game-panel">
            <div class="section-heading"><div><span>İLK 50</span><h2>Sıralama</h2></div></div>
            <div class="leaderboard">${leaderboard}</div>
          </article>
          <article class="game-panel event-card">
            <span class="panel-kicker">SIRADAKİ ETKİNLİK</span>
            <h3>Hudut Kaleleri</h3>
            <p>İttifaklar üç sınır kalesi için mücadele edecek. Kazanan ittifak 48 saat üretim bonusu alır.</p>
            <div class="event-meta"><span>Yarın 21:00</span><strong>+800 Şöhret</strong></div>
          </article>
        </aside>
      </div>`;
  };

  const render = (force = false) => {
    const signature = `${kingdomState.currentScreen}:${kingdomState.construction?.id || "-"}:${kingdomState.training?.id || "-"}:${kingdomState.healing ? 1 : 0}:${kingdomState.march?.ready ? "ready" : kingdomState.march?.nodeId || "-"}:${kingdomState.alliance.rally ? 1 : 0}`;
    if (!force && signature === lastRenderSignature) {
      updateHud();
      return;
    }
    lastRenderSignature = signature;
    const renderers = {
      city: renderCity,
      map: renderMap,
      army: renderArmy,
      heroes: renderHeroes,
      quests: renderQuests,
      alliance: renderAlliance,
      season: renderSeason,
    };
    renderers[kingdomState.currentScreen]();
    elements.nav.querySelectorAll("button[data-screen]").forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.screen === kingdomState.currentScreen,
      );
    });
    elements.headerLocation.textContent =
      navTitle[kingdomState.currentScreen];
    updateHud();
  };

  const refreshTimers = () => {
    const timerSources = {
      construction: kingdomState.construction,
      training: kingdomState.training,
      healing: kingdomState.healing,
      march: kingdomState.march,
      rally: kingdomState.alliance.rally,
    };
    Object.entries(timerSources).forEach(([name, timer]) => {
      if (!timer || timer.ready) return;
      const label = elements.content.querySelector(
        `[data-timer-label="${name}"]`,
      );
      const progress = elements.content.querySelector(
        `[data-timer-progress="${name}"]`,
      );
      if (label) label.textContent = formatDuration(timer.endAt - Date.now());
      if (progress) {
        const total = timer.endAt - timer.startAt;
        const elapsed = Date.now() - timer.startAt;
        progress.style.width = `${Math.min(100, (elapsed / total) * 100)}%`;
      }
    });
  };

  const switchScreen = (screen) => {
    if (!navTitle[screen]) return;
    kingdomState.currentScreen = screen;
    lastRenderSignature = "";
    render(true);
    save();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const upgradeBuilding = (id) => {
    if (kingdomState.construction || !buildingCatalog[id]) return;
    const cost = costsForBuilding(id);
    if (!hasResources(cost)) {
      showToast("Bu geliştirme için yeterli kaynak yok.", "!");
      return;
    }
    spendResources(cost);
    const duration =
      buildingCatalog[id].duration +
      Math.max(0, kingdomState.buildings[id] - 3);
    kingdomState.construction = {
      id,
      startAt: Date.now(),
      endAt: Date.now() + duration * 1000,
    };
    showToast(`${buildingCatalog[id].name} geliştirilmeye başlandı.`);
    lastRenderSignature = "";
    save();
    render(true);
  };

  const trainUnit = (id) => {
    const unit = unitCatalog[id];
    if (!unit || kingdomState.training || !hasResources(unit.cost)) return;
    spendResources(unit.cost);
    kingdomState.training = {
      id,
      startAt: Date.now(),
      endAt: Date.now() + unit.duration * 1000,
    };
    showToast(`${unit.name} eğitim kuyruğuna eklendi.`);
    lastRenderSignature = "";
    save();
    render(true);
  };

  const selectNode = (id) => {
    kingdomState.selectedNode = id;
    render(true);
    save();
  };

  const scoutNode = (id) => {
    if (!kingdomState.scouted.includes(id)) {
      kingdomState.scouted.push(id);
      progressQuest("scout", 1);
      kingdomState.season.points += 60;
      showToast("Keşifçiler düşman düzenini ve ganimeti bildirdi.");
      render(true);
      save();
    }
  };

  const gatherNode = (id) => {
    if (kingdomState.gathered.includes(id)) return;
    const reward =
      id === "iron"
        ? { stone: 1100, gold: 350 }
        : { wood: 1400, gold: 500 };
    addResources(reward);
    kingdomState.gathered.push(id);
    kingdomState.season.points += 80;
    showToast(`${rewardText(reward)} başkente taşındı.`);
    render(true);
    save();
  };

  const launchMarch = (id) => {
    if (kingdomState.march || kingdomState.resources.food < 400) {
      showToast("Yürüyüş için 400 erzak ve boş sefer sırası gerekiyor.", "!");
      return;
    }
    kingdomState.resources.food -= 400;
    kingdomState.march = {
      nodeId: id,
      startAt: Date.now(),
      endAt: Date.now() + 8000,
      ready: false,
    };
    showToast("Ordu payitahttan ayrıldı. Hedefe ilerliyor.");
    lastRenderSignature = "";
    render(true);
    save();
  };

  const healUnits = () => {
    if (
      kingdomState.healing ||
      kingdomState.wounded <= 0 ||
      kingdomState.resources.food < 320 ||
      kingdomState.resources.gold < 120
    )
      return;
    kingdomState.resources.food -= 320;
    kingdomState.resources.gold -= 120;
    kingdomState.healing = {
      amount: kingdomState.wounded,
      startAt: Date.now(),
      endAt: Date.now() + 8000,
    };
    showToast("Hekimler yaralı askerleri tedavi etmeye başladı.");
    lastRenderSignature = "";
    render(true);
    save();
  };

  const upgradeHero = (id) => {
    const hero = kingdomState.heroes.find((item) => item.id === id);
    if (!hero || hero.skill >= 5 || kingdomState.resources.gold < 700) return;
    kingdomState.resources.gold -= 700;
    hero.skill += 1;
    hero.level += 1;
    showToast(`${hero.name} yeni bir komutanlık becerisi kazandı.`);
    render(true);
    save();
  };

  const assignHero = (id) => {
    const hero = kingdomState.heroes.find((item) => item.id === id);
    if (!hero) return;
    if (
      !hero.assigned &&
      kingdomState.heroes.filter((item) => item.assigned).length >= 2
    ) {
      showToast("Bir orduya en fazla iki komutan atanabilir.", "!");
      return;
    }
    hero.assigned = !hero.assigned;
    showToast(
      hero.assigned
        ? `${hero.name} sefer ordusuna atandı.`
        : `${hero.name} başkent görevine döndü.`,
    );
    render(true);
    save();
  };

  const claimQuest = (id) => {
    const quest = kingdomState.quests.find((item) => item.id === id);
    if (!quest || quest.claimed || quest.progress < quest.target) return;
    quest.claimed = true;
    addResources(quest.reward);
    kingdomState.season.points += 120;
    showToast(`${quest.title} ödülü hazineye eklendi.`);
    render(true);
    save();
  };

  const donateAlliance = () => {
    if (kingdomState.resources.wood < 700) return;
    kingdomState.resources.wood -= 700;
    kingdomState.alliance.donation += 700;
    kingdomState.alliance.tech = Math.min(
      100,
      kingdomState.alliance.tech + 4,
    );
    kingdomState.season.points += 40;
    showToast("Bağışın ittifak teknolojisini geliştirdi.");
    render(true);
    save();
  };

  const startRally = () => {
    if (kingdomState.alliance.rally) return;
    kingdomState.alliance.rally = {
      startAt: Date.now(),
      endAt: Date.now() + 10000,
    };
    showToast("İttifak üyelerine ortak sefer çağrısı gönderildi.");
    lastRenderSignature = "";
    render(true);
    save();
  };

  const sendAllianceMessage = () => {
    const input = document.querySelector("#allianceMessage");
    const text = input?.value.trim();
    if (!text) return;
    kingdomState.alliance.messages.push({
      name: "Selin Hatun",
      avatar: "S",
      text,
      time: new Date().toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
    input.value = "";
    showToast("Mesaj ittifak sohbetine gönderildi.");
    render(true);
    save();
  };

  const claimSeason = (index) => {
    const rewards = [
      { food: 2000 },
      { gold: 300 },
      { gold: 700 },
      { stone: 1200, wood: 1200 },
    ];
    if (kingdomState.season.claimed.includes(index)) return;
    const requirement = [500, 1200, 2000, 3000][index];
    if (kingdomState.season.points < requirement) return;
    kingdomState.season.claimed.push(index);
    addResources(rewards[index]);
    showToast("Sezon ödülü hükümdarlık envanterine eklendi.");
    render(true);
    save();
  };

  const showNotifications = () => {
    const list = kingdomState.notifications
      .map(
        (notification) => `
          <article class="notification-item">
            <strong>${escapeHtml(notification.title)}</strong>
            <p>${escapeHtml(notification.text)}</p>
          </article>`,
      )
      .join("");
    openModal(`
      <span class="modal-kicker">HABERCİ DEFTERİ</span>
      <h2>Bildirimler</h2>
      <p>Şehir, ittifak ve sezon olaylarının son durumu.</p>
      <div class="notification-list">${list || "<p>Yeni bildirim yok.</p>"}</div>
      <div class="modal-actions">
        <button class="ghost-action" data-action="clear-notifications" type="button">Tümünü Okundu Say</button>
        <button class="primary-action" data-action="close-modal" type="button">Kapat</button>
      </div>`);
  };

  const tick = () => {
    const now = Date.now();
    const elapsedSeconds = Math.min(
      60 * 60 * 4,
      Math.max(0, (now - kingdomState.lastTick) / 1000),
    );
    const rates = productionRates();
    const cap = resourceCapacity();
    Object.entries(rates).forEach(([resource, rate]) => {
      kingdomState.resources[resource] = Math.min(
        cap,
        kingdomState.resources[resource] + rate * elapsedSeconds,
      );
    });
    kingdomState.lastTick = now;

    let completed = false;
    if (
      kingdomState.construction &&
      now >= kingdomState.construction.endAt
    ) {
      const id = kingdomState.construction.id;
      kingdomState.buildings[id] += 1;
      kingdomState.construction = null;
      progressQuest("build", 1);
      kingdomState.season.points += 90;
      showToast(`${buildingCatalog[id].name} geliştirildi.`);
      completed = true;
    }
    if (kingdomState.training && now >= kingdomState.training.endAt) {
      const id = kingdomState.training.id;
      const amount = unitCatalog[id].amount;
      kingdomState.troops[id] += amount;
      kingdomState.training = null;
      progressQuest("train", amount);
      kingdomState.season.points += 70;
      showToast(`${amount} ${unitCatalog[id].name} orduya katıldı.`);
      completed = true;
    }
    if (kingdomState.healing && now >= kingdomState.healing.endAt) {
      const amount = kingdomState.healing.amount;
      kingdomState.troops.infantry += amount;
      kingdomState.wounded = 0;
      kingdomState.healing = null;
      showToast(`${amount} asker iyileşerek yeniden saflara döndü.`);
      completed = true;
    }
    if (
      kingdomState.march &&
      !kingdomState.march.ready &&
      now >= kingdomState.march.endAt
    ) {
      kingdomState.march.ready = true;
      showToast("Ordu hedefe ulaştı. Savaş emrini bekliyor.", "⚔");
      completed = true;
    }
    if (
      kingdomState.alliance.rally &&
      now >= kingdomState.alliance.rally.endAt
    ) {
      kingdomState.alliance.rally = null;
      kingdomState.alliance.tech = Math.min(
        100,
        kingdomState.alliance.tech + 3,
      );
      kingdomState.season.points += 120;
      showToast("İttifak rallisi tamamlandı; takviye bonusu kazanıldı.", "⚑");
      completed = true;
    }

    updateHud();
    if (completed) {
      lastRenderSignature = "";
      render(true);
    } else {
      refreshTimers();
    }
    save();
  };

  const enterKingdom = () => {
    kingdomState.started = true;
    elements.opening.hidden = true;
    elements.battle.hidden = true;
    document.querySelector("#outcomeScreen").hidden = true;
    elements.kingdom.hidden = false;
    elements.headerMode.textContent = "Yaşayan strateji demosu";
    elements.restart.textContent = "Başkente Dön";
    switchScreen(kingdomState.currentScreen || "city");
  };

  const returnToKingdom = (screen = "city") => {
    if (typeof stopBattle === "function") stopBattle();
    elements.opening.hidden = true;
    elements.battle.hidden = true;
    document.querySelector("#outcomeScreen").hidden = true;
    elements.kingdom.hidden = false;
    elements.headerMode.textContent = "Yaşayan strateji demosu";
    elements.restart.textContent = "Başkente Dön";
    switchScreen(screen);
  };

  const launchBattle = (nodeId) => {
    kingdomState.pendingBattleNode = nodeId;
    kingdomState.pendingBattleReward = null;
    save();
    elements.kingdom.hidden = true;
    elements.battle.hidden = false;
    elements.opening.hidden = true;
    elements.headerMode.textContent = "Canlı kuşatma";
    elements.headerLocation.textContent =
      mapNodes.find((node) => node.id === nodeId)?.name || "Sınır Kalesi";
    elements.restart.textContent = "Seferden Çık";
    if (typeof startGame === "function") {
      startGame({ skipToBattle: true });
    }
  };

  const recordBattle = (payload) => {
    kingdomState.pendingBattleReward = payload;
    save();
  };

  const claimBattle = () => {
    const battleReward = kingdomState.pendingBattleReward || {
      result: "held",
      score: 420,
    };
    const multiplier =
      battleReward.result === "decisive"
        ? 1.35
        : battleReward.result === "held"
          ? 1
          : 0.72;
    const reward = {
      food: Math.round(2400 * multiplier),
      stone: Math.round(700 * multiplier),
      gold: Math.round(900 * multiplier),
    };
    addResources(reward);
    kingdomState.wounded +=
      battleReward.result === "decisive"
        ? 18
        : battleReward.result === "held"
          ? 34
          : 61;
    kingdomState.troops.infantry = Math.max(
      0,
      kingdomState.troops.infantry -
        (battleReward.result === "costly" ? 50 : 24),
    );
    if (
      kingdomState.pendingBattleNode &&
      !kingdomState.captured.includes(kingdomState.pendingBattleNode)
    ) {
      kingdomState.captured.push(kingdomState.pendingBattleNode);
    }
    kingdomState.march = null;
    kingdomState.pendingBattleNode = null;
    kingdomState.pendingBattleReward = null;
    progressQuest("battle", 1);
    kingdomState.season.points += Math.round(260 * multiplier);
    save();
    returnToKingdom("city");
    showToast(`${rewardText(reward)} zafer ganimeti olarak başkente ulaştı.`, "♜");
  };

  const retryBattle = () => {
    document.querySelector("#outcomeScreen").hidden = true;
    if (typeof startGame === "function") {
      startGame({ skipToBattle: true });
    }
  };

  const getBattleLoadout = () => {
    const assigned = kingdomState.heroes.filter((hero) => hero.assigned);
    return {
      erzak: Math.min(
        95,
        58 + Math.floor(kingdomState.troops.infantry / 35),
      ),
      moral: Math.min(
        92,
        55 + assigned.reduce((sum, hero) => sum + hero.skill * 3, 0),
      ),
      hazine: Math.min(
        90,
        50 + Math.floor(kingdomState.resources.gold / 700),
      ),
      itibar: Math.min(
        90,
        46 + Math.floor(kingdomState.alliance.tech / 4),
      ),
      defenseBonus:
        kingdomState.formation === "defense"
          ? 14
          : kingdomState.formation === "balanced"
            ? 6
            : 0,
      formation: kingdomState.formation,
      heroIds: assigned.map((hero) => hero.id),
    };
  };

  elements.nav.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-screen]");
    if (button) switchScreen(button.dataset.screen);
  });

  elements.content.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button || button.disabled) return;
    const { action, id, screen } = button.dataset;
    const actions = {
      "change-screen": () => switchScreen(screen),
      "upgrade-building": () => upgradeBuilding(id),
      "train-unit": () => trainUnit(id),
      "set-formation": () => {
        kingdomState.formation = id;
        showToast(
          `${id === "assault" ? "Hücum" : id === "defense" ? "Savunma" : "Dengeli"} düzeni seçildi.`,
        );
        render(true);
        save();
      },
      "select-node": () => selectNode(id),
      "center-capital": () => selectNode("capital"),
      "scout-node": () => scoutNode(id),
      "gather-node": () => gatherNode(id),
      "launch-march": () => launchMarch(id),
      "enter-battle": () => launchBattle(id),
      "heal-units": healUnits,
      "upgrade-hero": () => upgradeHero(id),
      "assign-hero": () => assignHero(id),
      "claim-quest": () => claimQuest(id),
      "alliance-donate": donateAlliance,
      "start-rally": startRally,
      "send-alliance-message": sendAllianceMessage,
      "claim-season": () => claimSeason(Number(id)),
    };
    actions[action]?.();
  });

  elements.modalCard.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    if (button.dataset.action === "close-modal") closeModal();
    if (button.dataset.action === "clear-notifications") {
      kingdomState.notifications = [];
      closeModal();
      updateHud();
      save();
      showToast("Bütün bildirimler okundu olarak işaretlendi.");
    }
  });

  elements.modalScrim.addEventListener("click", closeModal);
  elements.notification.addEventListener("click", showNotifications);
  elements.retry.addEventListener("click", retryBattle);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !elements.modal.hidden) closeModal();
    if (
      event.key === "Enter" &&
      document.activeElement?.id === "allianceMessage"
    ) {
      sendAllianceMessage();
    }
  });

  globalThis.CihanKingdom = {
    enterKingdom,
    returnToKingdom,
    launchBattle,
    claimBattle,
    recordBattle,
    retryBattle,
    getBattleLoadout,
    reset() {
      kingdomState = freshState();
      save();
      returnToKingdom("city");
      showToast("Yeni bir hükümdarlık kuruldu.");
    },
    snapshot() {
      return JSON.parse(JSON.stringify(kingdomState));
    },
  };

  updateHud();
  window.setInterval(tick, 500);
  if (kingdomState.started) {
    elements.restart.textContent = "Başkente Dön";
  }
})();
