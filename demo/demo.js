const initialState = () => {
  const loadout = globalThis.CihanKingdom?.getBattleLoadout?.() ?? {};
  const flags = new Set();
  if (loadout.formation === "defense") flags.add("reinforced");
  if (loadout.formation === "assault") flags.add("commander-force");
  if (loadout.heroIds?.includes("nizam")) flags.add("scouts");
  if (loadout.heroIds?.includes("leyla")) flags.add("commander-diplomat");

  return {
    turn: 0,
    resources: {
      erzak: loadout.erzak ?? 72,
      moral: loadout.moral ?? 64,
      hazine: loadout.hazine ?? 58,
      itibar: loadout.itibar ?? 46,
    },
    stats: {
      savunma: 45 + (loadout.defenseBonus ?? 0),
      istihbarat: loadout.heroIds?.includes("nizam") ? 18 : 10,
      ittifak: loadout.heroIds?.includes("leyla") ? 12 : 0,
      dusmanHasari: 0,
      merhamet: 0,
    },
    flags,
    history: [
      {
        time: "Günbatımı",
        copy: "Düşman ordusu Karacahisar Geçidi’nde görüldü.",
      },
    ],
    battlePower: null,
    battleResult: null,
    battlePlayed: false,
    finalChoice: null,
  };
};

let state = initialState();
let transitionLocked = false;
let battle = null;
let battleLoading = false;
const unitSpriteSheet =
  typeof Image === "undefined" ? null : new Image();
if (unitSpriteSheet) {
  unitSpriteSheet.decoding = "async";
  unitSpriteSheet.src = "./assets/unit-sprites.png?v=20260724-4";
}

function ensureUnitSpritesReady() {
  if (globalThis.__CIHAN_TEST__) return Promise.resolve(true);
  if (
    unitSpriteSheet?.complete &&
    unitSpriteSheet.naturalWidth > 0
  ) {
    return Promise.resolve(true);
  }
  if (!unitSpriteSheet) return Promise.resolve(false);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (ready) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      resolve(ready);
    };
    const timeout = window.setTimeout(() => {
      finish(
        unitSpriteSheet.complete &&
          unitSpriteSheet.naturalWidth > 0,
      );
    }, 6000);

    unitSpriteSheet.onload = () => finish(true);
    unitSpriteSheet.onerror = () => {
      unitSpriteSheet.src = `./assets/unit-sprites.png?v=20260724-4&retry=${Date.now()}`;
    };
  });
}

const clamp = (value, min = 0, max = 100) =>
  Math.max(min, Math.min(max, Math.round(value)));

const clampFloat = (value, min = 0, max = 1) =>
  Math.max(min, Math.min(max, value));

const changeResource = (name, amount) => {
  state.resources[name] = clamp(state.resources[name] + amount);
};

const changeStat = (name, amount) => {
  state.stats[name] = clamp(state.stats[name] + amount, 0, 120);
};

const scenes = [
  {
    chapter: "BÖLÜM 01 · ALARM",
    time: "GÜNBATIMI",
    eyebrow: "ALARM ÇANLARI",
    title: "İlk emrin ne olacak?",
    narrative:
      "Gözcüler üç düşman kolunun geçide yaklaştığını bildiriyor. Gece çökmeden tek bir hazırlığa zaman var.",
    advisor: {
      letter: "N",
      name: "NİZAM · BAŞVEKİL",
      text: "“Hünkârım, ilk emriniz yalnız kaleyi değil, askerlerin size duyduğu güveni de şekillendirecek.”",
    },
    location: "BATI SINIRI · KARACAHİSAR GEÇİDİ",
    world:
      "Düşman sancakları ufukta belirdi. Kale, yardım gelene kadar dayanmak zorunda.",
    choices: [
      {
        title: "Duvarları Güçlendir",
        description:
          "Ustaları ve muhafızları surlara gönder; hücum başlamadan gedikleri kapat.",
        effectLabel: "−12 Hazine · +18 Savunma",
        result:
          "Gece boyunca taş ve kereste surlara taşındı. Askerler, duvarların sabaha dayanacağına inanıyor.",
        apply: () => {
          changeResource("hazine", -12);
          changeResource("moral", 4);
          changeStat("savunma", 18);
          state.flags.add("reinforced");
        },
      },
      {
        title: "Gece Keşfi Gönder",
        description:
          "Hafif süvariler düşman kamplarını, erzak yollarını ve kuşatma araçlarını saysın.",
        effectLabel: "−8 Erzak · +25 İstihbarat",
        result:
          "Keşifçiler üç kuşatma kulesi ve korunmasız bir erzak hattı tespit etti.",
        apply: () => {
          changeResource("erzak", -8);
          changeResource("moral", 2);
          changeStat("istihbarat", 25);
          state.flags.add("scouts");
        },
      },
      {
        title: "Sıkı Tayın Emri",
        description:
          "Şehir ambarlarını mühürle; bugünün huzursuzluğunu yarının direnişine çevir.",
        effectLabel: "+18 Erzak · −8 Moral",
        result:
          "Ambarlar koruma altına alındı. Halk homurdansa da kale uzun bir geceye hazır.",
        apply: () => {
          changeResource("erzak", 18);
          changeResource("moral", -8);
          changeStat("savunma", 4);
          state.flags.add("rationed");
        },
      },
    ],
  },
  {
    chapter: "BÖLÜM 02 · DİVAN",
    time: "İLK NÖBET",
    eyebrow: "KOMUTAN SEÇİMİ",
    title: "Sancağı kime vereceksin?",
    narrative:
      "Üç isim aynı masada. Her biri kaleyi koruyabilir; fakat sabaha giden yolu başka türlü çizer.",
    advisor: {
      letter: "D",
      name: "DİVAN KÂTİBİ",
      text: "“Bir komutan yalnız orduyu yönetmez, hükümdarın niyetini de bütün ülkeye ilan eder.”",
    },
    location: "SINIR KALESİ · HARP DİVANI",
    world:
      "Meşaleler yanıyor. Surların gölgesinde kuvvet, akıl ve diplomasi aynı masaya oturdu.",
    choices: [
      {
        title: "Aybars · Sınır Kurdu",
        description:
          "Cesur bir karşı hücum ve yüksek asker morali. Bedeli, daha sert bir savunma düzeni.",
        effectLabel: "+12 Moral · +8 Savunma",
        result:
          "Aybars kılıcını masaya bıraktı: “Şafakta onların değil, bizim borumuz ötecek.”",
        apply: () => {
          changeResource("moral", 12);
          changeResource("hazine", -5);
          changeStat("savunma", 8);
          state.flags.add("commander-force");
        },
      },
      {
        title: "Nizam · Sessiz Akıl",
        description:
          "Düşmanın düzenini oku, zayıf halkayı bul ve az kaynakla doğru noktaya vur.",
        effectLabel: "+15 İstihbarat · +6 Erzak",
        result:
          "Nizam haritanın tek bir noktasını işaretledi: “Ordular güçlüdür; ikmal yolları değil.”",
        apply: () => {
          changeResource("erzak", 6);
          changeStat("istihbarat", 15);
          changeStat("savunma", 4);
          state.flags.add("commander-mind");
        },
      },
      {
        title: "Leyla · Elçi Kumandan",
        description:
          "Komşu beylerin desteğini savaş başlamadan kazan; düşmanı yalnızlaştır.",
        effectLabel: "+16 İtibar · +10 İttifak",
        result:
          "Leyla mühürlü mektupları atlılara verdi. Gece bitmeden bütün sınır kimin tarafını seçeceğini bilecek.",
        apply: () => {
          changeResource("itibar", 16);
          changeStat("ittifak", 10);
          state.flags.add("commander-diplomat");
        },
      },
    ],
  },
  {
    chapter: "BÖLÜM 03 · ÇAĞRI",
    time: "GECE YARISI",
    eyebrow: "İTTİFAK SINAVI",
    title: "Yardımı nasıl çağıracaksın?",
    narrative:
      "Düşmanın kamp ateşleri çoğalıyor. Komşu sancakların orduları yakın; fakat hiçbiri karşılıksız yürümeyecek.",
    advisor: {
      letter: "L",
      name: "LEYLA · SINIR ELÇİSİ",
      text: "“Bazen bir ittifakı altın kurar, bazen itibar. En kalıcı olanı ise ortak korkudur.”",
    },
    location: "KUZEY YOLU · İTTİFAK HABERCİLERİ",
    world:
      "Atlı haberciler karanlığa karıştı. Vereceğin teklif, şafakta yanında kaç sancak olacağını belirleyecek.",
    choices: [
      {
        title: "Savaş Sandığını Aç",
        description:
          "Komşu beylere peşin ödeme gönder; en hızlı ve güvenilir takviyeyi satın al.",
        effectLabel: "−18 Hazine · +28 İttifak",
        available: () => state.resources.hazine >= 18,
        locked: "18 hazine gerekiyor",
        result:
          "Altın keseleri kuzeye ulaştı. İki sancak, borularını çalarak yola çıktı.",
        apply: () => {
          changeResource("hazine", -18);
          changeResource("moral", 5);
          changeStat("ittifak", 28);
          state.flags.add("paid-alliance");
        },
      },
      {
        title: "Tahtın İtibarını Kullan",
        description:
          "Eski yeminleri hatırlat; yardım etmeyenin yarın divanda yalnız kalacağını bildir.",
        effectLabel: "−10 İtibar · +34 İttifak",
        available: () => state.resources.itibar >= 50,
        locked: "50 itibar gerekiyor",
        result:
          "Mühürlü ferman etkisini gösterdi. Sınır beyleri, sözlerinin ağırlığını taşımak için yürüdü.",
        apply: () => {
          changeResource("itibar", -10);
          changeStat("ittifak", 34);
          state.flags.add("honor-alliance");
        },
      },
      {
        title: "Düşman Kampına Fitne Sok",
        description:
          "Keşif bilgisini kullan; düşman paralı askerlerine sahte geri çekilme emri ulaştır.",
        effectLabel: "+18 Hasar · +12 İttifak",
        available: () => state.stats.istihbarat >= 25,
        locked: "25 istihbarat gerekiyor",
        result:
          "Sahte emirler kampı karıştırdı. Bir paralı asker bölüğü gece yarısı mevziyi terk etti.",
        apply: () => {
          changeStat("dusmanHasari", 18);
          changeStat("ittifak", 12);
          state.flags.add("sabotage");
        },
      },
      {
        title: "Kendi Gücüne Güven",
        description:
          "Kapıları kapat ve bütün kuvveti surlarda topla. Yardım gelmeyecek; emir de bölünmeyecek.",
        effectLabel: "+14 Savunma · −5 Moral",
        result:
          "Sancak kapının üzerine çekildi. Kale, kaderini kendi duvarlarına bağladı.",
        apply: () => {
          changeResource("moral", -5);
          changeStat("savunma", 14);
          state.flags.add("stand-alone");
        },
      },
    ],
  },
  {
    chapter: "BÖLÜM 04 · KUŞATMA",
    time: "ŞAFAK ÖNCESİ",
    eyebrow: "SON HAMLE",
    title: "Düşman duvarlara dayandı.",
    narrative:
      "Kuşatma kuleleri ilerliyor. Şimdiye dek yaptığın hazırlıklar tek bir savaş emrinde birleşecek.",
    advisor: {
      letter: "A",
      name: "AYBARS · SERDAR",
      text: "“Bu geceyi planlar kazandırdı. Son nefesi ise doğru anda verilen tek bir emir kazandıracak.”",
    },
    location: "KARACAHİSAR · KUŞATMA HATTI",
    world:
      "Oklar göğü kapladı, kapılar sarsılıyor. Savaşın bütün ağırlığı artık tek bir hamlede.",
    choices: [
      {
        title: "Kapıları Aç · Süvari Çıkışı",
        description:
          "Düşmanın odağı surlardayken seçkin süvarilerle kuşatma araçlarına vur.",
        effectLabel: "−16 Erzak · +32 Hasar",
        available: () => state.resources.erzak >= 16,
        locked: "16 erzak gerekiyor",
        result:
          "Kapılar bir anlığına açıldı. Süvariler kuşatma kulelerini ateşe verip dumanın içinde geri döndü.",
        apply: () => {
          changeResource("erzak", -16);
          changeResource("moral", 7);
          changeStat("savunma", -6);
          changeStat("dusmanHasari", 32);
          state.flags.add("sortie");
        },
      },
      {
        title: "Ateş Çemberi Kur",
        description:
          "Keşif haritasındaki dar boğazı yağ ve oklarla kapat; kalabalığı kendi ağırlığıyla durdur.",
        effectLabel: "−10 Erzak · +28 Hasar",
        available: () => state.stats.istihbarat >= 30,
        locked: "30 istihbarat gerekiyor",
        result:
          "Düşman dar geçide dolduğu anda ateş yükseldi. Hücum kolları birbirinin yolunu kapattı.",
        apply: () => {
          changeResource("erzak", -10);
          changeStat("savunma", 12);
          changeStat("dusmanHasari", 28);
          state.flags.add("fire-trap");
        },
      },
      {
        title: "Birleşik Taarruz Emri",
        description:
          "Takviye sancaklarıyla aynı anda vur; kuşatan orduyu iki ateş arasında bırak.",
        effectLabel: "−10 Hazine · +40 Hasar",
        available: () =>
          state.stats.ittifak >= 20 && state.resources.hazine >= 10,
        locked: "20 ittifak ve 10 hazine gerekiyor",
        result:
          "Kuzey sırtlarında dost sancaklar göründü. Kale kapıları açılırken düşmanın arka hattı çöktü.",
        apply: () => {
          changeResource("hazine", -10);
          changeResource("moral", 6);
          changeStat("ittifak", 8);
          changeStat("dusmanHasari", 40);
          state.flags.add("combined-attack");
        },
      },
      {
        title: "Duvarlarda Sonuna Kadar Bekle",
        description:
          "Bütün birlikleri surlarda tut; düşmanın yorulmasını ve kulelerin menzile girmesini bekle.",
        effectLabel: "+18 Savunma · +15 Hasar",
        result:
          "İlk dalga geri püskürtüldü. Duvarlar çatladı ama hat bozulmadı.",
        apply: () => {
          changeResource("moral", -5);
          changeStat("savunma", 18);
          changeStat("dusmanHasari", 15);
          state.flags.add("hold-walls");
        },
      },
    ],
  },
  {
    chapter: "BÖLÜM 05 · HÜKÜM",
    time: "ŞAFAK",
    eyebrow: "ZAFERİN BEDELİ",
    title: "Sınırın kaderini belirle.",
    narrative: () => battleNarrative(),
    advisor: {
      letter: "N",
      name: "NİZAM · BAŞVEKİL",
      text: "“Savaşı kazanmak bir an sürer. Zaferden sonra kuracağınız düzen ise nesiller boyunca hatırlanır.”",
    },
    location: "KARACAHİSAR · ŞAFAK MEYDANI",
    world: () => battleWorldText(),
    onEnter: () => calculateBattle(),
    choices: [
      {
        title: "Toprağı Doğrudan Tahta Bağla",
        description:
          "Kalıcı garnizon kur, vergi düzenini değiştir ve geçidi merkezî yönetime al.",
        effectLabel: "−8 Hazine · +10 İtibar",
        result:
          "Karacahisar artık doğrudan tahta bağlı bir sınır eyaleti. Düzen güçlü; sorumluluk ağır.",
        apply: () => {
          changeResource("hazine", -8);
          changeResource("itibar", 10);
          changeStat("savunma", 6);
          state.flags.add("legacy-crown");
          state.finalChoice = "crown";
        },
      },
      {
        title: "Yerel Beyi Yeminle Bağışla",
        description:
          "Kılıcını teslim eden beye toprağını geri ver; sadakatini rehin ve yeminle güvenceye al.",
        effectLabel: "+18 İtibar · +12 Merhamet",
        result:
          "Diz çöken bey affedildi. Sınır halkı, tahtın yalnız güçlü değil ölçülü olduğunu da gördü.",
        apply: () => {
          changeResource("itibar", 18);
          changeStat("ittifak", 7);
          changeStat("merhamet", 12);
          state.flags.add("legacy-vassal");
          state.finalChoice = "vassal";
        },
      },
      {
        title: "Erzağı Halka Dağıt",
        description:
          "Savaş ambarlarını aç; önce yaralıları, çocukları ve kuşatma altında kalan mahalleleri doyur.",
        effectLabel: "−18 Erzak · +16 Moral",
        available: () => state.resources.erzak >= 18,
        locked: "18 erzak gerekiyor",
        result:
          "Kale meydanında kazanlar kaynadı. Halk, bu zaferi bir hükümdarın değil kendi hikâyesi olarak anlatacak.",
        apply: () => {
          changeResource("erzak", -18);
          changeResource("moral", 16);
          changeResource("itibar", 8);
          changeStat("merhamet", 22);
          state.flags.add("legacy-people");
          state.finalChoice = "people";
        },
      },
    ],
  },
];

const elements = {
  openingScreen: document.querySelector("#openingScreen"),
  outcomeScreen: document.querySelector("#outcomeScreen"),
  startButton: document.querySelector("#startButton"),
  restartButton: document.querySelector("#restartButton"),
  playAgainButton: document.querySelector("#playAgainButton"),
  chapterLabel: document.querySelector("#chapterLabel"),
  campaignTitle: document.querySelector("#campaignTitle"),
  turnCounter: document.querySelector("#turnCounter"),
  timeLabel: document.querySelector("#timeLabel"),
  turnPips: [...document.querySelectorAll("#turnPips li")],
  sceneEyebrow: document.querySelector("#sceneEyebrow"),
  decisionTitle: document.querySelector("#decisionTitle"),
  sceneNarrative: document.querySelector("#sceneNarrative"),
  advisorPortrait: document.querySelector("#advisorPortrait span"),
  advisorName: document.querySelector("#advisorName"),
  advisorText: document.querySelector("#advisorText"),
  choiceList: document.querySelector("#choiceList"),
  lastResult: document.querySelector("#lastResult"),
  lastResultText: document.querySelector("#lastResultText"),
  locationLabel: document.querySelector("#locationLabel"),
  worldCaption: document.querySelector("#worldCaption"),
  battleStage: document.querySelector("#battleStage"),
  battleCanvas: document.querySelector("#battleCanvas"),
  battleFortressValue: document.querySelector("#battleFortressValue"),
  battleFortressMeter: document.querySelector("#battleFortressMeter"),
  battleEnemyValue: document.querySelector("#battleEnemyValue"),
  battleEnemyMeter: document.querySelector("#battleEnemyMeter"),
  battleTimer: document.querySelector("#battleTimer"),
  battleMessage: document.querySelector("#battleMessage"),
  battleCountdown: document.querySelector("#battleCountdown"),
  battleCountdownValue: document.querySelector("#battleCountdownValue"),
  scoutMarker: document.querySelector("#scoutMarker"),
  allyMarker: document.querySelector("#allyMarker"),
  enemyStrength: document.querySelector("#enemyStrength"),
  enemyBar: document.querySelector("#enemyBar"),
  fortressStrength: document.querySelector("#fortressStrength"),
  fortressBar: document.querySelector("#fortressBar"),
  strategyLabel: document.querySelector("#strategyLabel"),
  chronicleList: document.querySelector("#chronicleList"),
  outcomeEyebrow: document.querySelector("#outcomeEyebrow"),
  outcomeTitle: document.querySelector("#outcomeTitle"),
  outcomeCopy: document.querySelector("#outcomeCopy"),
  legacyScore: document.querySelector("#legacyScore"),
  outcomeStats: document.querySelector("#outcomeStats"),
  legacyQuote: document.querySelector("#legacyQuote"),
  resourceValues: {
    erzak: document.querySelector("#resourceErzak"),
    moral: document.querySelector("#resourceMoral"),
    hazine: document.querySelector("#resourceHazine"),
    itibar: document.querySelector("#resourceItibar"),
  },
  resourceBars: {
    erzak: document.querySelector("#barErzak"),
    moral: document.querySelector("#barMoral"),
    hazine: document.querySelector("#barHazine"),
    itibar: document.querySelector("#barItibar"),
  },
};

const unitTypes = {
  infantry: {
    hp: 62,
    speed: 47,
    range: 20,
    damage: 12,
    attackDelay: 0.72,
    radius: 9,
  },
  archer: {
    hp: 38,
    speed: 35,
    range: 145,
    damage: 10,
    attackDelay: 1.18,
    radius: 8,
    ranged: true,
  },
  cavalry: {
    hp: 88,
    speed: 82,
    range: 24,
    damage: 19,
    attackDelay: 0.78,
    radius: 12,
    cavalry: true,
  },
  ally: {
    hp: 68,
    speed: 54,
    range: 22,
    damage: 14,
    attackDelay: 0.76,
    radius: 9,
    ally: true,
  },
  enemyInfantry: {
    hp: 48,
    speed: 39,
    range: 19,
    damage: 9,
    attackDelay: 0.82,
    radius: 9,
  },
  enemyArcher: {
    hp: 34,
    speed: 31,
    range: 138,
    damage: 7,
    attackDelay: 1.3,
    radius: 8,
    ranged: true,
  },
  ram: {
    hp: 145,
    speed: 21,
    range: 34,
    damage: 18,
    attackDelay: 1.55,
    radius: 15,
    ram: true,
  },
};

const spriteFrames = {
  infantry: { x: 0, y: 0, width: 420, height: 458, drawWidth: 50, drawHeight: 66 },
  archer: { x: 420, y: 0, width: 400, height: 458, drawWidth: 52, drawHeight: 68 },
  cavalry: { x: 790, y: 0, width: 550, height: 458, drawWidth: 86, drawHeight: 70 },
  ally: { x: 1320, y: 0, width: 397, height: 458, drawWidth: 53, drawHeight: 68 },
  enemyInfantry: {
    x: 0,
    y: 458,
    width: 420,
    height: 458,
    drawWidth: 50,
    drawHeight: 66,
  },
  enemyArcher: {
    x: 420,
    y: 458,
    width: 400,
    height: 458,
    drawWidth: 52,
    drawHeight: 68,
  },
  ram: { x: 740, y: 458, width: 580, height: 458, drawWidth: 94, drawHeight: 62 },
  heavyEnemy: {
    x: 1290,
    y: 458,
    width: 427,
    height: 458,
    drawWidth: 54,
    drawHeight: 70,
  },
};

const battleOrders = [
  {
    id: "infantry",
    title: "Piyade Bölüğü",
    description: "Beş kılıçlı askeri seçtiğin hücum hattına çıkar.",
    effectLabel: "8 Erzak · 4 sn",
    resource: "erzak",
    cost: 8,
    cooldown: 4,
    deploy: () =>
      spawnGroup("friendly", "infantry", 5, 145, battle.rally.y, 38),
  },
  {
    id: "archer",
    title: "Okçu Birliği",
    description: "Üç okçu sur gerisinden düşmanı menzile alır.",
    effectLabel: "6 Hazine · 6 sn",
    resource: "hazine",
    cost: 6,
    cooldown: 6,
    deploy: () =>
      spawnGroup("friendly", "archer", 3, 120, battle.rally.y, 42),
  },
  {
    id: "cavalry",
    title: "Süvari Hücumu",
    description: "Dört atlı düşman hattını yararak en yakın hedefe saldırır.",
    effectLabel: "10 Moral · 8 sn",
    resource: "moral",
    cost: 10,
    cooldown: 8,
    deploy: () =>
      spawnGroup("friendly", "cavalry", 4, 118, battle.rally.y, 46),
  },
  {
    id: "allies",
    title: "Müttefik Sancağı",
    description: "İttifak kuvvetlerini kuzey hattından savaşa çağır.",
    effectLabel: "8 İtibar · 10 sn",
    resource: "itibar",
    cost: 8,
    cooldown: 10,
    requirement: () => state.stats.ittifak >= 20,
    locked: "20 ittifak gerekiyor",
    deploy: () =>
      spawnGroup("friendly", "ally", 5, 155, battle.rally.y - 80, 54),
  },
];

function renderBattleOrders() {
  elements.choiceList.replaceChildren();
  elements.choiceList.classList.add("battle-orders");

  battleOrders.forEach((order, index) => {
    const requirementMet = order.requirement ? order.requirement() : true;
    const resourceMet = state.resources[order.resource] >= order.cost;
    const remaining = battle?.cooldowns?.[order.id] ?? 0;
    const battleActive = Boolean(battle?.active);
    const available =
      requirementMet && resourceMet && remaining <= 0 && battleActive;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice-button battle-order";
    button.classList.toggle("ready", available);
    button.classList.toggle("cooldown", remaining > 0);
    button.disabled = !available;

    const number = document.createElement("span");
    number.className = "choice-index";
    number.textContent = String(index + 1).padStart(2, "0");

    const copy = document.createElement("span");
    copy.className = "choice-copy";
    const title = document.createElement("strong");
    title.textContent = order.title;
    const description = document.createElement("small");
    description.textContent = order.description;
    copy.append(title, description);

    const effect = document.createElement("span");
    effect.className = "choice-effect";
    effect.textContent = !requirementMet
      ? order.locked
      : remaining > 0
        ? `${Math.ceil(remaining)} sn bekle`
        : !resourceMet
          ? `${order.cost} ${order.resource} gerekiyor`
          : order.effectLabel;

    button.append(number, copy, effect);
    button.addEventListener("click", () => deployBattleOrder(order));
    elements.choiceList.append(button);
  });

  const progress = document.createElement("div");
  progress.className = "battle-progress-copy";
  const heading = document.createElement("strong");
  heading.textContent = battle?.active
    ? "SAVAŞ DEVAM EDİYOR"
    : "BİRLİKLER HAZIRLANIYOR";
  const copy = document.createElement("span");
  copy.textContent = battle?.active
    ? "Haritaya dokunarak hücum hattını değiştir. 1–4 tuşlarıyla birlik çıkarabilirsin."
    : "Borular çaldığında birlik emirleri açılacak.";
  progress.append(heading, copy);
  elements.choiceList.append(progress);
}

function deployBattleOrder(order) {
  if (!battle?.active) return;
  const remaining = battle.cooldowns[order.id] ?? 0;
  if (remaining > 0) return;
  if (order.requirement && !order.requirement()) return;
  if (state.resources[order.resource] < order.cost) return;

  changeResource(order.resource, -order.cost);
  order.deploy();
  battle.cooldowns[order.id] = order.cooldown;
  battle.message = `${order.title} savaş alanına girdi.`;
  battle.messageTimer = 2.4;
  updateResourceBoard();
  renderBattleOrders();
}

function createUnit(team, type, x, y) {
  const config = unitTypes[type];
  return {
    id: battle.nextUnitId++,
    team,
    type,
    x,
    y,
    hp: config.hp,
    maxHp: config.hp,
    speed: config.speed,
    range: config.range,
    damage: config.damage,
    attackDelay: config.attackDelay,
    attackTimer: Math.random() * 0.4,
    radius: config.radius,
    ranged: Boolean(config.ranged),
    cavalry: Boolean(config.cavalry),
    ram: Boolean(config.ram),
    ally: Boolean(config.ally),
    dead: false,
    attackFlash: 0,
    facing: team === "friendly" ? 1 : -1,
  };
}

function spawnGroup(team, type, count, originX, originY, spread = 42) {
  if (!battle) return;
  for (let index = 0; index < count; index += 1) {
    const row = Math.floor(index / 3);
    const column = index % 3;
    const direction = team === "friendly" ? -1 : 1;
    const x =
      originX +
      direction * row * 16 +
      (Math.random() - 0.5) * spread * 0.45;
    const y =
      originY +
      (column - 1) * 18 +
      (Math.random() - 0.5) * spread * 0.55;
    battle.units.push(
      createUnit(team, type, clamp(x, 55, 950), clamp(y, 88, 500)),
    );
    if (team === "enemy") battle.totalEnemies += 1;
  }
}

function spawnEnemyWave(waveNumber) {
  if (!battle) return;
  const laneA = 160 + Math.random() * 120;
  const laneB = 345 + Math.random() * 100;

  if (waveNumber === 1) {
    spawnGroup("enemy", "enemyInfantry", 7, 920, laneA, 78);
    spawnGroup("enemy", "enemyArcher", 2, 950, laneB, 54);
  } else if (waveNumber === 2) {
    spawnGroup("enemy", "enemyInfantry", 8, 935, laneB, 90);
    spawnGroup("enemy", "enemyArcher", 3, 965, laneA, 70);
  } else if (waveNumber === 3) {
    spawnGroup("enemy", "ram", 1, 955, 280, 10);
    spawnGroup("enemy", "enemyInfantry", 9, 930, laneA, 105);
    spawnGroup("enemy", "enemyArcher", 3, 970, laneB, 70);
  } else {
    spawnGroup("enemy", "enemyInfantry", 10, 925, laneB, 115);
    spawnGroup("enemy", "enemyArcher", 4, 970, laneA, 85);
    spawnGroup("enemy", "ram", 1, 975, 330, 10);
  }

  battle.wave = waveNumber;
  battle.message = `${waveNumber}. düşman dalgası savaş alanına girdi!`;
  battle.messageTimer = 2.8;
}

async function startBattle() {
  if (battle?.active || state.battlePlayed || battleLoading) return;
  battleLoading = true;
  stopBattle();

  elements.battleStage.hidden = false;
  elements.battleCountdown.hidden = false;
  elements.battleCountdownValue.textContent = "…";
  elements.battleMessage.textContent = "Zırhlı birlikler savaş alanına hazırlanıyor.";
  const spritesReady = await ensureUnitSpritesReady();
  battleLoading = false;

  if (!spritesReady) {
    elements.battleCountdownValue.textContent = "↻";
    elements.battleMessage.textContent =
      "Birlik görselleri yüklenemedi. Sayfayı yenileyerek tekrar dene.";
    return;
  }
  if (state.turn !== 3 || state.battlePlayed) {
    stopBattle();
    return;
  }

  const context = elements.battleCanvas.getContext("2d");
  battle = {
    context,
    active: false,
    elapsed: 0,
    duration: 45,
    lastTimestamp: null,
    frameId: null,
    units: [],
    projectiles: [],
    particles: [],
    nextUnitId: 1,
    wave: 0,
    totalEnemies: 0,
    kills: 0,
    fortressHp: clamp(88 + state.stats.savunma * 0.18, 88, 112),
    rally: { x: 500, y: 285 },
    cooldowns: Object.fromEntries(battleOrders.map((order) => [order.id, 0])),
    orderRefreshTimer: 0,
    message: "Düşman öncüleri geçide giriyor.",
    messageTimer: 3,
  };

  elements.battleCountdownValue.textContent = "3";

  spawnGroup("friendly", "infantry", 7, 165, 285, 100);
  spawnGroup("friendly", "archer", 3, 115, 315, 75);

  if (state.flags.has("commander-force")) {
    spawnGroup("friendly", "cavalry", 2, 110, 210, 38);
  }
  if (state.flags.has("commander-mind")) {
    spawnGroup("friendly", "archer", 2, 105, 380, 34);
  }
  if (
    state.flags.has("commander-diplomat") &&
    state.stats.ittifak >= 10
  ) {
    spawnGroup("friendly", "ally", 3, 130, 160, 48);
  }

  spawnEnemyWave(1);
  drawBattle();
  renderBattleOrders();

  const currentBattle = battle;
  [2, 1, 0].forEach((value, index) => {
    window.setTimeout(
      () => {
        if (battle !== currentBattle) return;
        if (value > 0) {
          elements.battleCountdownValue.textContent = String(value);
          return;
        }
        elements.battleCountdown.hidden = true;
        battle.active = true;
        battle.lastTimestamp = performance.now();
        renderBattleOrders();
        battle.frameId = requestAnimationFrame(battleLoop);
      },
      (index + 1) * 750,
    );
  });
}

function stopBattle() {
  if (battle?.frameId) cancelAnimationFrame(battle.frameId);
  if (battle) battle.active = false;
  battle = null;
  elements.battleStage.hidden = true;
  elements.battleCountdown.hidden = true;
  elements.choiceList.classList.remove("battle-orders");
}

function battleLoop(timestamp) {
  if (!battle?.active) return;
  const delta = Math.min(
    0.034,
    Math.max(0.001, (timestamp - battle.lastTimestamp) / 1000),
  );
  battle.lastTimestamp = timestamp;
  battle.elapsed += delta;

  const nextWaveTimes = [0, 10, 22, 34];
  if (
    battle.wave < 4 &&
    battle.elapsed >= nextWaveTimes[battle.wave]
  ) {
    spawnEnemyWave(battle.wave + 1);
  }

  const aliveEnemies = battle.units.filter(
    (unit) => !unit.dead && unit.team === "enemy",
  ).length;
  if (
    aliveEnemies === 0 &&
    battle.wave < 4 &&
    battle.elapsed > 3
  ) {
    spawnEnemyWave(battle.wave + 1);
  }

  updateBattle(delta);
  drawBattle();
  updateBattleHud();

  const remainingEnemies = battle.units.filter(
    (unit) => !unit.dead && unit.team === "enemy",
  ).length;
  const allWavesDefeated = battle.wave === 4 && remainingEnemies === 0;
  const timeExpired = battle.elapsed >= battle.duration;
  const fortressFallen = battle.fortressHp <= 0;

  if (allWavesDefeated || timeExpired || fortressFallen) {
    finishBattle(!fortressFallen);
    return;
  }

  battle.frameId = requestAnimationFrame(battleLoop);
}

function updateBattle(delta) {
  battle.messageTimer -= delta;
  Object.keys(battle.cooldowns).forEach((key) => {
    battle.cooldowns[key] = Math.max(0, battle.cooldowns[key] - delta);
  });

  battle.units.forEach((unit) => {
    if (!unit.dead) updateUnit(unit, delta);
  });
  applyUnitSeparation();
  updateProjectiles(delta);
  updateParticles(delta);

  battle.units = battle.units.filter(
    (unit) => !unit.dead || unit.deathTimer > 0,
  );

  battle.orderRefreshTimer -= delta;
  if (battle.orderRefreshTimer <= 0) {
    battle.orderRefreshTimer = 0.5;
    renderBattleOrders();
  }
}

function updateUnit(unit, delta) {
  unit.attackTimer -= delta;
  unit.attackFlash = Math.max(0, unit.attackFlash - delta);

  if (unit.ram) {
    moveEnemyTowardFortress(unit, delta);
    return;
  }

  const opponents = battle.units.filter(
    (candidate) => !candidate.dead && candidate.team !== unit.team,
  );
  const acquisition = unit.ranged ? 270 : unit.cavalry ? 250 : 205;
  const target = nearestUnit(unit, opponents, acquisition);

  if (target) {
    const dx = target.x - unit.x;
    const dy = target.y - unit.y;
    const distance = Math.hypot(dx, dy) || 1;
    unit.facing = Math.sign(dx) || unit.facing;

    if (distance > unit.range + target.radius) {
      moveUnit(unit, dx / distance, dy / distance, delta);
    } else if (unit.attackTimer <= 0) {
      attackUnit(unit, target);
    }
    return;
  }

  if (unit.team === "friendly") {
    const dx = battle.rally.x - unit.x;
    const dy = battle.rally.y - unit.y;
    const distance = Math.hypot(dx, dy);
    if (distance > 32) {
      moveUnit(unit, dx / distance, dy / distance, delta, 0.72);
    }
  } else {
    moveEnemyTowardFortress(unit, delta);
  }
}

function moveEnemyTowardFortress(unit, delta) {
  const gate = { x: 104, y: clamp(unit.y, 190, 370) };
  const dx = gate.x - unit.x;
  const dy = gate.y - unit.y;
  const distance = Math.hypot(dx, dy) || 1;
  unit.facing = -1;

  if (distance > unit.range + 20) {
    moveUnit(unit, dx / distance, dy / distance, delta);
    return;
  }

  if (unit.attackTimer <= 0) {
    unit.attackTimer = unit.attackDelay;
    unit.attackFlash = 0.16;
    battle.fortressHp = Math.max(0, battle.fortressHp - unit.damage);
    createImpact(110, unit.y, "enemy", unit.ram ? 14 : 8);
    elements.battleStage.classList.add("castle-hit");
    window.setTimeout(
      () => elements.battleStage.classList.remove("castle-hit"),
      220,
    );
  }
}

function moveUnit(unit, directionX, directionY, delta, factor = 1) {
  unit.x = clamp(
    unit.x + directionX * unit.speed * factor * delta,
    45,
    965,
  );
  unit.y = clamp(
    unit.y + directionY * unit.speed * factor * delta,
    78,
    510,
  );
}

function nearestUnit(origin, candidates, maxDistance) {
  let nearest = null;
  let nearestDistance = maxDistance;
  candidates.forEach((candidate) => {
    const distance = Math.hypot(
      candidate.x - origin.x,
      candidate.y - origin.y,
    );
    if (distance < nearestDistance) {
      nearest = candidate;
      nearestDistance = distance;
    }
  });
  return nearest;
}

function attackUnit(attacker, target) {
  attacker.attackTimer = attacker.attackDelay;
  attacker.attackFlash = 0.14;

  if (attacker.ranged) {
    const distance = Math.hypot(target.x - attacker.x, target.y - attacker.y);
    battle.projectiles.push({
      x: attacker.x,
      y: attacker.y - 8,
      target,
      team: attacker.team,
      damage: attacker.damage,
      speed: 340,
      ttl: Math.max(0.25, distance / 300 + 0.15),
    });
    return;
  }

  damageUnit(target, attacker.damage, attacker.team);
  createImpact(target.x, target.y, attacker.team, attacker.cavalry ? 10 : 6);
}

function damageUnit(target, amount, sourceTeam) {
  if (target.dead) return;
  target.hp -= amount;
  if (target.hp > 0) return;

  target.dead = true;
  target.deathTimer = 0.45;
  if (target.team === "enemy" && sourceTeam === "friendly") {
    battle.kills += 1;
  }
  createImpact(target.x, target.y, sourceTeam, 14);
}

function updateProjectiles(delta) {
  battle.projectiles.forEach((projectile) => {
    if (projectile.target.dead) {
      projectile.ttl = 0;
      return;
    }
    const dx = projectile.target.x - projectile.x;
    const dy = projectile.target.y - projectile.y;
    const distance = Math.hypot(dx, dy) || 1;
    const travel = projectile.speed * delta;
    if (distance <= travel + projectile.target.radius) {
      damageUnit(projectile.target, projectile.damage, projectile.team);
      createImpact(
        projectile.target.x,
        projectile.target.y,
        projectile.team,
        5,
      );
      projectile.ttl = 0;
      return;
    }
    projectile.x += (dx / distance) * travel;
    projectile.y += (dy / distance) * travel;
    projectile.ttl -= delta;
  });
  battle.projectiles = battle.projectiles.filter(
    (projectile) => projectile.ttl > 0,
  );
}

function applyUnitSeparation() {
  const aliveUnits = battle.units.filter((unit) => !unit.dead);
  for (let leftIndex = 0; leftIndex < aliveUnits.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < aliveUnits.length;
      rightIndex += 1
    ) {
      const left = aliveUnits[leftIndex];
      const right = aliveUnits[rightIndex];
      const dx = right.x - left.x;
      const dy = right.y - left.y;
      const distance = Math.hypot(dx, dy) || 0.1;
      const minimum = (left.radius + right.radius) * 0.75;
      if (distance >= minimum) continue;
      const push = (minimum - distance) * 0.16;
      const nx = dx / distance;
      const ny = dy / distance;
      left.x -= nx * push;
      left.y -= ny * push;
      right.x += nx * push;
      right.y += ny * push;
    }
  }
}

function createImpact(x, y, team, amount) {
  for (let index = 0; index < amount; index += 1) {
    battle.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 80,
      vy: (Math.random() - 0.5) * 80 - 15,
      life: 0.25 + Math.random() * 0.35,
      maxLife: 0.6,
      team,
    });
  }
}

function updateParticles(delta) {
  battle.particles.forEach((particle) => {
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    particle.vy += 60 * delta;
    particle.life -= delta;
  });
  battle.particles = battle.particles.filter(
    (particle) => particle.life > 0,
  );
  battle.units.forEach((unit) => {
    if (unit.dead) unit.deathTimer -= delta;
  });
}

function drawBattle() {
  if (!battle?.context) return;
  const context = battle.context;
  const width = elements.battleCanvas.width;
  const height = elements.battleCanvas.height;
  context.clearRect(0, 0, width, height);

  drawBattleGround(context, width, height);
  battle.units
    .filter((unit) => !unit.dead)
    .sort((left, right) => left.y - right.y)
    .forEach((unit) => drawUnit(context, unit));
  battle.projectiles.forEach((projectile) =>
    drawProjectile(context, projectile),
  );
  battle.particles.forEach((particle) => drawParticle(context, particle));
}

function drawBattleGround(context, width, height) {
  context.save();
  context.fillStyle = "rgba(3, 6, 8, 0.13)";
  context.fillRect(0, 0, width, height);

  context.strokeStyle = "rgba(216, 173, 84, 0.11)";
  context.lineWidth = 1;
  [170, 280, 390].forEach((y) => {
    context.beginPath();
    context.moveTo(115, y);
    context.bezierCurveTo(380, y - 35, 670, y + 35, 970, y);
    context.stroke();
  });

  context.fillStyle = "rgba(8, 19, 20, 0.82)";
  context.fillRect(42, 124, 74, 318);
  context.fillStyle = "rgba(101, 196, 179, 0.22)";
  for (let y = 132; y < 430; y += 34) {
    context.fillRect(36, y, 88, 7);
  }
  context.fillStyle = "rgba(242, 217, 149, 0.75)";
  context.fillRect(104, 248, 8, 76);

  const pulse = 16 + Math.sin(battle.elapsed * 4) * 4;
  context.strokeStyle = "rgba(242, 217, 149, 0.82)";
  context.lineWidth = 2;
  context.beginPath();
  context.arc(battle.rally.x, battle.rally.y, pulse, 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.moveTo(battle.rally.x - 23, battle.rally.y);
  context.lineTo(battle.rally.x + 23, battle.rally.y);
  context.moveTo(battle.rally.x, battle.rally.y - 23);
  context.lineTo(battle.rally.x, battle.rally.y + 23);
  context.stroke();
  context.restore();
}

function drawUnit(context, unit) {
  context.save();
  context.translate(unit.x, unit.y);
  if (unit.dead) {
    context.globalAlpha = clampFloat(unit.deathTimer / 0.45);
  }

  const friendly = unit.team === "friendly";
  const spriteReady =
    unitSpriteSheet?.complete && unitSpriteSheet.naturalWidth > 0;
  const frameKey =
    unit.type === "enemyInfantry" && unit.id % 4 === 0
      ? "heavyEnemy"
      : unit.type;
  const frame = spriteFrames[frameKey];
  const visualRadius = spriteReady
    ? Math.max(15, (frame?.drawWidth ?? 42) * 0.32)
    : unit.radius * 1.35;

  context.fillStyle = "rgba(0, 0, 0, 0.48)";
  context.beginPath();
  context.ellipse(0, 9, visualRadius, 6, 0, 0, Math.PI * 2);
  context.fill();

  if (unit.attackFlash > 0) {
    context.globalAlpha = 0.2 + unit.attackFlash * 1.8;
    context.fillStyle = friendly ? "#f2d995" : "#d25d4d";
    context.beginPath();
    context.arc(0, -9, visualRadius * 1.3, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1;
  }

  context.save();
  context.scale(unit.facing, 1);
  const bob = Math.sin(battle.elapsed * 8 + unit.id * 0.91) * 1.4;
  const lunge = unit.attackFlash * (unit.cavalry ? 70 : 42);
  context.translate(lunge, bob);

  if (spriteReady && frame) {
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(
      unitSpriteSheet,
      frame.x,
      frame.y,
      frame.width,
      frame.height,
      -frame.drawWidth / 2,
      -frame.drawHeight + 13,
      frame.drawWidth,
      frame.drawHeight,
    );
  } else {
    drawFallbackUnit(context, unit, friendly);
  }
  context.restore();

  if (unit.hp < unit.maxHp) {
    const barWidth = unit.ram ? 38 : unit.cavalry ? 32 : 26;
    const barY = spriteReady && frame ? -frame.drawHeight + 7 : -23;
    context.fillStyle = "rgba(0,0,0,0.65)";
    context.fillRect(-barWidth / 2, barY, barWidth, 4);
    context.fillStyle = friendly ? "#65c4b3" : "#d25d4d";
    context.fillRect(
      -barWidth / 2,
      barY,
      barWidth * clampFloat(unit.hp / unit.maxHp),
      4,
    );
  }
  context.restore();
}

function drawFallbackUnit(context, unit, friendly) {
  const bodyColor = unit.ally
    ? "#c5dbea"
    : friendly
      ? "#65c4b3"
      : "#d25d4d";
  const metalColor = friendly ? "#f2d995" : "#e2b0a8";

  if (unit.ram) {
    context.fillStyle = "#6d4a2f";
    context.fillRect(-18, -8, 36, 16);
    context.fillStyle = "#a78356";
    context.fillRect(-21, -4, 42, 5);
    context.fillStyle = "#2d241d";
    [-13, 13].forEach((x) => {
      context.beginPath();
      context.arc(x, 10, 5, 0, Math.PI * 2);
      context.fill();
    });
    return;
  }

  if (unit.cavalry) {
    context.fillStyle = "#594432";
    context.beginPath();
    context.ellipse(0, 1, 14, 7, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = bodyColor;
    context.fillRect(-2, -12, 5, 12);
    context.beginPath();
    context.arc(0, -15, 4, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = metalColor;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(4, -9);
    context.lineTo(18, -16 - unit.attackFlash * 22);
    context.stroke();
    return;
  }

  context.strokeStyle = bodyColor;
  context.fillStyle = bodyColor;
  context.lineWidth = 3.2;
  context.beginPath();
  context.moveTo(0, -7);
  context.lineTo(0, 6);
  context.moveTo(0, 4);
  context.lineTo(-5, 12);
  context.moveTo(0, 4);
  context.lineTo(5, 12);
  context.stroke();
  context.beginPath();
  context.arc(0, -11, 4.5, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = metalColor;
  context.lineWidth = 2;
  if (unit.ranged) {
    context.beginPath();
    context.arc(5, -2, 7, -1.2, 1.2);
    context.stroke();
    context.beginPath();
    context.moveTo(2, -8);
    context.lineTo(9, 5);
    context.stroke();
  } else {
    context.beginPath();
    context.moveTo(1, -2);
    context.lineTo(11 + unit.attackFlash * 24, -8);
    context.stroke();
  }
}

function drawProjectile(context, projectile) {
  context.save();
  const angle = Math.atan2(
    projectile.target.y - projectile.y,
    projectile.target.x - projectile.x,
  );
  context.translate(projectile.x, projectile.y);
  context.rotate(angle);
  context.strokeStyle =
    projectile.team === "friendly" ? "#f2d995" : "#f0b5aa";
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(-8, 0);
  context.lineTo(7, 0);
  context.stroke();
  context.restore();
}

function drawParticle(context, particle) {
  context.save();
  context.globalAlpha = clampFloat(particle.life / particle.maxLife);
  context.fillStyle =
    particle.team === "friendly" ? "#f2d995" : "#d25d4d";
  context.fillRect(particle.x, particle.y, 2.4, 2.4);
  context.restore();
}

function updateBattleHud() {
  const aliveEnemies = battle.units.filter(
    (unit) => !unit.dead && unit.team === "enemy",
  ).length;
  const remaining = Math.max(0, battle.duration - battle.elapsed);
  const minutes = Math.floor(remaining / 60);
  const seconds = Math.ceil(remaining % 60);

  elements.battleFortressValue.textContent = Math.round(battle.fortressHp);
  elements.battleFortressMeter.style.width = `${clamp(battle.fortressHp)}%`;
  elements.battleEnemyValue.textContent = aliveEnemies;
  elements.battleEnemyMeter.style.width = `${clamp(
    (aliveEnemies / 15) * 100,
  )}%`;
  elements.battleTimer.textContent = `${String(minutes).padStart(2, "0")}:${String(
    seconds,
  ).padStart(2, "0")}`;
  elements.battleMessage.textContent =
    battle.messageTimer > 0
      ? battle.message
      : "Haritaya dokunarak hücum hattını değiştir.";
}

function finishBattle(survived) {
  if (!battle) return;
  battle.active = false;
  if (battle.frameId) cancelAnimationFrame(battle.frameId);

  const fortressHp = Math.round(battle.fortressHp);
  const kills = battle.kills;
  const totalEnemies = Math.max(1, battle.totalEnemies);
  const killRatio = kills / totalEnemies;
  const result =
    survived && fortressHp >= 68 && killRatio >= 0.72
      ? "decisive"
      : survived && fortressHp > 22
        ? "held"
        : "costly";

  state.battlePlayed = true;
  state.battleResult = result;
  state.battlePower = Math.round(
    94 + fortressHp * 0.62 + killRatio * 72 + state.stats.ittifak * 0.2,
  );
  changeStat("dusmanHasari", Math.round(killRatio * 72));
  changeStat(
    "savunma",
    Math.round((fortressHp - 65) * 0.18),
  );
  changeResource("moral", result === "decisive" ? 12 : result === "held" ? 5 : -8);

  const copy = {
    decisive: `Dört düşman dalgası dağıldı. ${kills} asker etkisiz hâle getirildi; kale neredeyse yara almadan ayakta.`,
    held: `Kale şafağa ulaştı. ${kills} düşman askeri durduruldu; duvarlar ${fortressHp} dayanıklılıkla ayakta.`,
    costly: `İç kale son anda tutuldu. ${kills} düşman askeri durduruldu, fakat savunmanın bedeli ağır oldu.`,
  }[result];

  state.history.push({ time: "Şafak Öncesi", copy });
  elements.lastResultText.textContent = copy;
  elements.lastResult.hidden = false;
  elements.battleMessage.textContent =
    result === "decisive"
      ? "KESİN ZAFER · Düşman hatları çözüldü."
      : result === "held"
        ? "KALE TUTULDU · Şafak boruları çalıyor."
        : "AĞIR BEDEL · İç kale hâlâ ayakta.";
  updateResourceBoard();
  updateMap();
  updateChronicle();

  const completedBattle = battle;
  window.setTimeout(() => {
    if (battle !== completedBattle) return;
    stopBattle();
    state.turn = 4;
    renderScene();
  }, 1800);
}

function resolveBattleForTest(result = "held") {
  if (!globalThis.__CIHAN_TEST__) return;
  state.battlePlayed = true;
  state.battleResult = result;
  state.battlePower = result === "decisive" ? 166 : result === "held" ? 132 : 98;
  changeStat("dusmanHasari", result === "decisive" ? 70 : 46);
  changeResource("moral", result === "costly" ? -8 : 8);
  state.history.push({
    time: "Şafak Öncesi",
    copy: "Otomatik savaş testi tamamlandı.",
  });
  state.turn = 4;
  renderScene();
}

function setBattleRally(event) {
  if (!battle?.active) return;
  const bounds = elements.battleCanvas.getBoundingClientRect();
  const x =
    ((event.clientX - bounds.left) / bounds.width) *
    elements.battleCanvas.width;
  const y =
    ((event.clientY - bounds.top) / bounds.height) *
    elements.battleCanvas.height;
  battle.rally.x = clamp(x, 220, 760);
  battle.rally.y = clamp(y, 105, 480);
  battle.message = "Yeni hücum hattı belirlendi.";
  battle.messageTimer = 1.6;
}

function calculateBattle() {
  if (state.battlePower !== null) return;

  const power =
    state.stats.savunma * 0.65 +
    state.resources.moral * 0.45 +
    state.stats.istihbarat * 0.35 +
    state.stats.ittifak * 0.55 +
    state.stats.dusmanHasari +
    state.resources.erzak * 0.12;

  state.battlePower = Math.round(power);
  state.battleResult =
    power >= 132 ? "decisive" : power >= 104 ? "held" : "costly";

  const resultCopy = {
    decisive:
      "Düşman ordusu şafaktan önce çözüldü. Kaçış yolları açık, sancakları meydanda kaldı.",
    held:
      "Kale ağır bir gece geçirdi fakat duvarlar ayakta. Düşman geri çekilirken sınır yeniden nefes alıyor.",
    costly:
      "Dış sur düştü; iç kale son anda tutuldu. Zafer senin, fakat bedeli bütün şehir taşıyor.",
  };

  state.history.push({
    time: "Şafak",
    copy: resultCopy[state.battleResult],
  });
}

function battleNarrative() {
  const copy = {
    decisive:
      "Düşman bozguna uğradı. Şimdi zaferin hızına kapılmadan, ele geçirilen geçidin nasıl yönetileceğine karar vermelisin.",
    held:
      "Kale dayandı ve düşman çekildi. Sınırda oluşan güç boşluğunu hangi düzenin dolduracağı sana bağlı.",
    costly:
      "İç kale ayakta; dış mahalleler yaralı. Vereceğin hüküm, halkın bu geceyi zafer mi yoksa kayıp mı sayacağını belirleyecek.",
  };
  return copy[state.battleResult];
}

function battleWorldText() {
  const copy = {
    decisive:
      "Düşman sancakları indirildi. Şafak, Karacahisar’ın üzerinde tahtın renkleriyle doğuyor.",
    held:
      "Kırık kulelerin ardından gün ışığı yükseliyor. Geçit tutuldu; şimdi düzen kurulmalı.",
    costly:
      "Duman dağılırken yaralılar meydana taşınıyor. Kale ayakta, fakat her taş gecenin bedelini taşıyor.",
  };
  return copy[state.battleResult];
}

function currentScene() {
  return scenes[state.turn];
}

function renderScene() {
  transitionLocked = false;
  const scene = currentScene();

  if (scene.onEnter) scene.onEnter();

  elements.chapterLabel.textContent = scene.chapter;
  elements.turnCounter.textContent = `KARAR ${state.turn + 1} / ${scenes.length}`;
  elements.timeLabel.textContent = scene.time;
  elements.sceneEyebrow.textContent = scene.eyebrow;
  elements.decisionTitle.textContent = scene.title;
  elements.sceneNarrative.textContent =
    typeof scene.narrative === "function"
      ? scene.narrative()
      : scene.narrative;
  elements.advisorPortrait.textContent = scene.advisor.letter;
  elements.advisorName.textContent = scene.advisor.name;
  elements.advisorText.textContent = scene.advisor.text;
  elements.locationLabel.textContent = scene.location;
  elements.worldCaption.textContent =
    typeof scene.world === "function" ? scene.world() : scene.world;
  elements.lastResult.hidden = true;

  elements.turnPips.forEach((pip, index) => {
    pip.classList.toggle("active", index === state.turn);
    pip.classList.toggle("complete", index < state.turn);
  });

  if (state.turn === 3 && !state.battlePlayed) {
    renderBattleOrders();
    if (!globalThis.__CIHAN_TEST__) {
      window.setTimeout(() => {
        if (state.turn === 3 && !state.battlePlayed) startBattle();
      }, 450);
    }
  } else {
    renderChoices(scene.choices);
  }
  updateResourceBoard();
  updateMap();
  updateChronicle();

  requestAnimationFrame(() => {
    if (state.turn !== 3 || state.battlePlayed) {
      elements.choiceList.querySelector("button:not(:disabled)")?.focus({
        preventScroll: true,
      });
    }
  });
}

function renderChoices(choices) {
  elements.choiceList.replaceChildren();
  elements.choiceList.classList.remove("battle-orders");

  choices.forEach((choice, index) => {
    const available = choice.available ? choice.available() : true;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice-button";
    button.disabled = !available;
    button.setAttribute(
      "aria-label",
      `${choice.title}. ${choice.description}. ${
        available ? choice.effectLabel : choice.locked
      }`,
    );

    const number = document.createElement("span");
    number.className = "choice-index";
    number.textContent = String(index + 1).padStart(2, "0");

    const copy = document.createElement("span");
    copy.className = "choice-copy";
    const title = document.createElement("strong");
    title.textContent = choice.title;
    const description = document.createElement("small");
    description.textContent = choice.description;
    copy.append(title, description);

    const effect = document.createElement("span");
    effect.className = "choice-effect";
    effect.textContent = available ? choice.effectLabel : choice.locked;

    button.append(number, copy, effect);
    button.addEventListener("click", () => selectChoice(choice));
    elements.choiceList.append(button);
  });
}

function selectChoice(choice) {
  if (transitionLocked) return;
  transitionLocked = true;

  const previousResources = { ...state.resources };
  [...elements.choiceList.querySelectorAll("button")].forEach((button) => {
    button.disabled = true;
  });

  choice.apply();

  Object.keys(state.resources).forEach((name) => {
    state.resources[name] = clamp(state.resources[name]);
  });
  Object.keys(state.stats).forEach((name) => {
    state.stats[name] = clamp(state.stats[name], 0, 120);
  });

  const scene = currentScene();
  state.history.push({
    time: scene.time,
    copy: choice.result,
  });

  elements.lastResultText.textContent = choice.result;
  elements.lastResult.hidden = false;
  updateResourceBoard(previousResources);
  updateMap();
  updateChronicle();

  if (state.turn === scenes.length - 1) {
    window.setTimeout(() => completeGame(), 700);
    return;
  }

  state.turn += 1;
  window.setTimeout(renderScene, 750);
}

function updateResourceBoard(previous = null) {
  Object.entries(state.resources).forEach(([name, value]) => {
    elements.resourceValues[name].textContent = value;
    elements.resourceBars[name].style.width = `${clamp(value)}%`;

    const card = document.querySelector(`[data-resource="${name}"]`);
    const changed = previous && previous[name] !== value;
    card.classList.toggle("changed", Boolean(changed));
    if (changed) {
      window.setTimeout(() => card.classList.remove("changed"), 700);
    }
  });
}

function updateMap() {
  const fortress = clamp(state.stats.savunma);
  const enemy = clamp(100 - state.stats.dusmanHasari);
  elements.fortressStrength.textContent = `${fortress}%`;
  elements.fortressBar.style.width = `${fortress}%`;
  elements.enemyStrength.textContent = `${enemy}%`;
  elements.enemyBar.style.width = `${enemy}%`;
  elements.scoutMarker.classList.toggle(
    "visible",
    state.flags.has("scouts") ||
      state.flags.has("commander-mind") ||
      state.flags.has("sabotage"),
  );
  elements.allyMarker.classList.toggle(
    "visible",
    state.stats.ittifak >= 20,
  );

  let strategy = "Dengeli hükümdarlık";
  if (state.flags.has("commander-force")) strategy = "Kuvvet yolu";
  if (state.flags.has("commander-mind")) strategy = "Akıl yolu";
  if (state.flags.has("commander-diplomat")) strategy = "Diplomasi yolu";
  elements.strategyLabel.textContent = strategy;
}

function updateChronicle() {
  elements.chronicleList.replaceChildren();
  state.history.slice(-5).forEach((entry) => {
    const item = document.createElement("li");
    const time = document.createElement("time");
    const copy = document.createElement("p");
    time.textContent = entry.time;
    copy.textContent = entry.copy;
    item.append(time, copy);
    elements.chronicleList.append(item);
  });
}

function completeGame() {
  calculateBattle();

  const resourceTotal = Object.values(state.resources).reduce(
    (sum, value) => sum + value,
    0,
  );
  const legacyBonus =
    state.finalChoice === "people"
      ? state.stats.merhamet * 1.8
      : state.finalChoice === "vassal"
        ? state.resources.itibar * 0.7
        : state.stats.savunma * 0.6;
  const score = Math.round(
    state.battlePower * 2.4 + resourceTotal * 0.55 + legacyBonus,
  );

  const outcome = {
    decisive: {
      eyebrow: "KESİN ZAFER",
      title: "Şafak Seninle Doğdu",
      copy: "Karacahisar yalnız kurtulmadı; bütün sınır için yeni bir güç merkezi hâline geldi.",
    },
    held: {
      eyebrow: "SINIR TUTULDU",
      title: "Kale Ayakta",
      copy: "Düşman çekildi. Bu gece kurduğun denge, yeni bir sınır düzeninin temelini attı.",
    },
    costly: {
      eyebrow: "BEDELİ AĞIR ZAFER",
      title: "Taşlar Hatırlar",
      copy: "Kale kurtuldu ama kayıplar derin. Bundan sonraki hükümdarlığın, bu yarayı nasıl kapattığınla ölçülecek.",
    },
  }[state.battleResult];

  const quote = {
    crown:
      "“Sınırlar çizgiyle değil, orada kurulan düzenin gücüyle korunur.”",
    vassal:
      "“Bağışlanan bir düşman, bazen satın alınmış bin askerden daha sadık olur.”",
    people:
      "“Halkın hatırladığı zafer, kendisine sofrada yer açan zaferdir.”",
  }[state.finalChoice];

  elements.outcomeEyebrow.textContent = outcome.eyebrow;
  elements.outcomeTitle.textContent = outcome.title;
  elements.outcomeCopy.textContent = outcome.copy;
  elements.legacyScore.textContent = score;
  elements.legacyQuote.textContent = quote;
  elements.outcomeStats.replaceChildren();

  [
    ["SAVUNMA", state.stats.savunma],
    ["İSTİHBARAT", state.stats.istihbarat],
    ["İTTİFAK", state.stats.ittifak],
    ["DÜŞMAN GÜCÜ", `${clamp(100 - state.stats.dusmanHasari)}%`],
  ].forEach(([label, value]) => {
    const stat = document.createElement("div");
    stat.className = "outcome-stat";
    const statLabel = document.createElement("span");
    const statValue = document.createElement("strong");
    statLabel.textContent = label;
    statValue.textContent = value;
    stat.append(statLabel, statValue);
    elements.outcomeStats.append(stat);
  });

  elements.outcomeScreen.hidden = false;
  globalThis.CihanKingdom?.recordBattle?.({
    result: state.battleResult,
    score,
    battlePower: state.battlePower,
    defense: state.stats.savunma,
  });
  elements.playAgainButton.focus();
}

function startGame() {
  stopBattle();
  state = initialState();
  transitionLocked = false;
  elements.openingScreen.hidden = true;
  elements.outcomeScreen.hidden = true;
  renderScene();
}

function showOpening() {
  stopBattle();
  state = initialState();
  transitionLocked = false;
  elements.outcomeScreen.hidden = true;
  elements.openingScreen.hidden = false;
  updateResourceBoard();
  updateMap();
  updateChronicle();
  elements.startButton.focus();
}

elements.startButton.addEventListener("click", () => {
  if (globalThis.CihanKingdom) {
    globalThis.CihanKingdom.enterKingdom();
    return;
  }
  startGame();
});
elements.playAgainButton.addEventListener("click", () => {
  if (globalThis.CihanKingdom) {
    globalThis.CihanKingdom.claimBattle();
    return;
  }
  startGame();
});
elements.restartButton.addEventListener("click", () => {
  if (globalThis.CihanKingdom && elements.openingScreen.hidden) {
    globalThis.CihanKingdom.returnToKingdom("city");
    return;
  }
  showOpening();
});
elements.battleCanvas.addEventListener("pointerdown", setBattleRally);

document.addEventListener("keydown", (event) => {
  if (
    event.key >= "1" &&
    event.key <= "4" &&
    elements.openingScreen.hidden &&
    elements.outcomeScreen.hidden
  ) {
    const button = elements.choiceList.querySelectorAll("button")[
      Number(event.key) - 1
    ];
    if (button && !button.disabled) button.click();
  }
});

updateResourceBoard();
updateMap();
updateChronicle();
