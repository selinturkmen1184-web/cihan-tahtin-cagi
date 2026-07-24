const initialState = () => ({
  turn: 0,
  resources: {
    erzak: 72,
    moral: 64,
    hazine: 58,
    itibar: 46,
  },
  stats: {
    savunma: 45,
    istihbarat: 10,
    ittifak: 0,
    dusmanHasari: 0,
    merhamet: 0,
  },
  flags: new Set(),
  history: [
    {
      time: "Günbatımı",
      copy: "Düşman ordusu Karacahisar Geçidi’nde görüldü.",
    },
  ],
  battlePower: null,
  battleResult: null,
  finalChoice: null,
});

let state = initialState();
let transitionLocked = false;

const clamp = (value, min = 0, max = 100) =>
  Math.max(min, Math.min(max, Math.round(value)));

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

  renderChoices(scene.choices);
  updateResourceBoard();
  updateMap();
  updateChronicle();

  requestAnimationFrame(() => {
    elements.choiceList.querySelector("button:not(:disabled)")?.focus({
      preventScroll: true,
    });
  });
}

function renderChoices(choices) {
  elements.choiceList.replaceChildren();

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
  elements.playAgainButton.focus();
}

function startGame() {
  state = initialState();
  transitionLocked = false;
  elements.openingScreen.hidden = true;
  elements.outcomeScreen.hidden = true;
  renderScene();
}

function showOpening() {
  state = initialState();
  transitionLocked = false;
  elements.outcomeScreen.hidden = true;
  elements.openingScreen.hidden = false;
  updateResourceBoard();
  updateMap();
  updateChronicle();
  elements.startButton.focus();
}

elements.startButton.addEventListener("click", startGame);
elements.playAgainButton.addEventListener("click", startGame);
elements.restartButton.addEventListener("click", showOpening);

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
