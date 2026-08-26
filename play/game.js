(() => {
  "use strict";

  const W = 1024;
  const H = 1536;
  const FORTRESS_Y = 405;
  const MAX_TIME = 96;
  const canvas = document.querySelector("#battlefield");
  const ctx = canvas.getContext("2d", { alpha: false });
  const background = new Image();
  const atlas = new Image();
  background.src = "../cihan-battlefield-v28.png";
  atlas.src = "./unit-atlas-v29.png";

  const ui = {
    campaign: document.querySelector("#campaign"), battle: document.querySelector("#battle-ui"), result: document.querySelector("#result"),
    friendlyCount: document.querySelector("#friendly-count"), enemyCount: document.querySelector("#enemy-count"),
    friendlyMorale: document.querySelector("#friendly-morale"), enemyMorale: document.querySelector("#enemy-morale"),
    fortressFill: document.querySelector("#fortress-fill"), fortressPercent: document.querySelector("#fortress-percent"),
    phase: document.querySelector("#phase-label"), time: document.querySelector("#battle-time"), message: document.querySelector("#battle-message")
  };

  let mode = "campaign";
  let chosenPlot = "scout";
  let formation = "crescent";
  let selectedKind = "infantry";
  let battleSpeed = 1;
  let paused = false;
  let soundOn = true;
  let audio = null;
  let last = performance.now();
  let elapsed = 0;
  let fortress = 1000;
  let fortressMax = 1000;
  let friendlyMorale = 92;
  let enemyMorale = 84;
  let friendlyLosses = 0;
  let enemyLosses = 0;
  let commandRevision = 0;
  let screenShake = 0;
  let messageTimer = 0;
  let nextEnemyOrder = 8;
  let nextUiUpdate = 0;
  let nextFortressFeedback = 0;
  let unitSerial = 0;
  let units = [];
  let unitById = new Map();
  let projectiles = [];
  let particles = [];
  let floatingText = [];
  let cooldowns = { charge: 0, volley: 0, cannon: 0, rally: 0 };

  const rowFor = { infantry: 0, archer: 1, cavalry: 2, siege: 3, commander: 4 };
  const unitLabels = { infantry: "Piyade", archer: "Okçu", cavalry: "Süvari", siege: "Şahi", commander: "Paşa" };
  const stats = {
    infantry: { hp: 116, damage: 17, speed: 45, range: 50, rate: 1.05, size: 86 },
    archer: { hp: 82, damage: 13, speed: 39, range: 238, rate: 1.7, size: 83 },
    cavalry: { hp: 150, damage: 26, speed: 72, range: 62, rate: 1.3, size: 120 },
    siege: { hp: 185, damage: 72, speed: 23, range: 365, rate: 4.8, size: 145 },
    commander: { hp: 280, damage: 29, speed: 42, range: 58, rate: 1.1, size: 105 }
  };

  function showScreen(name) {
    [ui.campaign, ui.battle, ui.result].forEach((el) => el.classList.remove("active"));
    if (name === "campaign") ui.campaign.classList.add("active");
    if (name === "battle") ui.battle.classList.add("active");
    if (name === "result") ui.result.classList.add("active");
    mode = name;
  }

  function setupAudio() {
    if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === "suspended") audio.resume();
  }

  function tone(freq, duration = .12, type = "triangle", gain = .07, slide = 0) {
    if (!soundOn) return;
    setupAudio();
    const osc = audio.createOscillator();
    const volume = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audio.currentTime);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), audio.currentTime + duration);
    volume.gain.setValueAtTime(gain, audio.currentTime);
    volume.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration);
    osc.connect(volume).connect(audio.destination);
    osc.start(); osc.stop(audio.currentTime + duration);
  }

  function noise(duration = .4, gain = .11) {
    if (!soundOn) return;
    setupAudio();
    const length = Math.floor(audio.sampleRate * duration);
    const buffer = audio.createBuffer(1, length, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const src = audio.createBufferSource();
    const filter = audio.createBiquadFilter();
    const volume = audio.createGain();
    filter.type = "lowpass"; filter.frequency.value = 420;
    volume.gain.value = gain;
    src.buffer = buffer; src.connect(filter).connect(volume).connect(audio.destination); src.start();
  }

  function announce(text, seconds = 2.2) {
    ui.message.textContent = text;
    ui.message.classList.add("show");
    messageTimer = seconds;
  }

  function formationPoint(index, count, team, kind) {
    const row = index % 6;
    const rank = Math.floor(index / 6);
    const side = team === "friendly" ? 1 : -1;
    let y = team === "friendly" ? 1180 + rank * 62 : 640 - rank * 54;
    let x = 180 + row * 132;
    if (formation === "crescent") y += Math.abs(row - 2.5) * 24 * side;
    if (formation === "wedge") y += Math.abs(row - 2.5) * -34 * side;
    if (kind === "siege") y += 155 * side;
    if (kind === "archer") y += 72 * side;
    return { x, y };
  }

  function makeUnit(team, kind, index, count) {
    const s = stats[kind];
    const p = formationPoint(index, count, team, kind);
    const enemyScale = team === "enemy" ? 1.03 : 1;
    return {
      id: ++unitSerial, team, kind, x: p.x + (Math.random() - .5) * 18, y: p.y + (Math.random() - .5) * 14,
      targetX: p.x, targetY: p.y, hp: s.hp * enemyScale, maxHp: s.hp * enemyScale, cooldown: Math.random() * s.rate,
      state: "idle", stateTime: 0, hit: 0, dead: false, fall: 0, selected: false, facing: team === "friendly" ? -1 : 1,
      bonus: 1, order: "hold", lane: index % 3, targetId: null, stagger: 0
    };
  }

  function addArmy(team, config) {
    Object.entries(config).forEach(([kind, count]) => {
      for (let i = 0; i < count; i++) {
        const unit = makeUnit(team, kind, i, count);
        units.push(unit);
        unitById.set(unit.id, unit);
      }
    });
  }

  function startBattle() {
    setupAudio();
    units = []; unitById = new Map(); projectiles = []; particles = []; floatingText = [];
    elapsed = 0; friendlyLosses = 0; enemyLosses = 0; friendlyMorale = 92; enemyMorale = 84;
    fortressMax = 1000; fortress = 1000; nextEnemyOrder = 7; nextUiUpdate = 0; nextFortressFeedback = 0; paused = false; battleSpeed = 1;
    cooldowns = { charge: 0, volley: 0, cannon: 0, rally: 0 };

    let enemyConfig = { infantry: 12, archer: 7, cavalry: 5, siege: 1, commander: 1 };
    if (chosenPlot === "sabotage") { fortress = 820; enemyMorale -= 12; }
    if (chosenPlot === "bribe") { enemyConfig.infantry -= 3; enemyConfig.archer -= 1; }
    addArmy("friendly", { infantry: 12, archer: 6, cavalry: 8, siege: 3, commander: 1 });
    addArmy("enemy", enemyConfig);
    if (chosenPlot === "scout") units.filter(u => u.team === "friendly").forEach(u => u.bonus = 1.08);
    selectedKind = "infantry";
    commandRevision++;
    showScreen("battle");
    document.querySelectorAll(".speed").forEach(b => b.classList.toggle("selected", b.dataset.speed === "1"));
    document.querySelectorAll(".unit-card").forEach(b => b.classList.toggle("selected", b.dataset.unit === selectedKind));
    announce("Konuşlan! Birlik seç ve savaş alanına dokun.", 3.2);
    tone(196, .4, "sawtooth", .08, 95); tone(131, .65, "triangle", .06, 70);
  }

  function nearestEnemy(unit) {
    let best = null; let bestD = Infinity;
    for (const other of units) {
      if (other.dead || other.team === unit.team) continue;
      const dx = other.x - unit.x, dy = other.y - unit.y;
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = other; }
    }
    return { unit: best, distance: Math.sqrt(bestD) };
  }

  function combatTarget(unit) {
    const locked = unitById.get(unit.targetId);
    if (locked && !locked.dead && locked.team !== unit.team) {
      return { unit: locked, distance: Math.hypot(locked.x - unit.x, locked.y - unit.y) };
    }
    const nearest = nearestEnemy(unit);
    unit.targetId = nearest.unit ? nearest.unit.id : null;
    return nearest;
  }

  function fortressPost(unit, fortressOpen) {
    const column = (unit.id - 1) % 8;
    const rank = Math.floor(((unit.id - 1) % 32) / 8);
    const x = 210 + column * 86;
    if (fortressOpen) return { x, y: 315 + rank * 46 };
    if (unit.kind === "siege") return { x, y: 735 + rank * 30 };
    if (unit.kind === "archer") return { x, y: 635 + rank * 36 };
    return { x, y: 482 + rank * 48 };
  }

  function projectile(from, to, kind, damage, team) {
    const duration = kind === "cannon" ? .7 : .38;
    projectiles.push({ kind, team, sourceId: from.id, fromX: from.x, fromY: from.y - 32, x: from.x, y: from.y - 32, tx: to.x, ty: to.y - 24, target: to, damage, t: 0, duration });
  }

  function hit(target, damage, sourceTeam, heavy = false, source = null) {
    if (!target || target.dead) return;
    const morale = sourceTeam === "friendly" ? friendlyMorale : enemyMorale;
    const finalDamage = damage * (.82 + morale / 480) * (.9 + Math.random() * .22);
    target.hp -= finalDamage; target.hit = .3; target.state = "hit"; target.stateTime = 0;
    if (source && source.kind === "cavalry" && source.order === "charge" && target.kind !== "siege") {
      let dx = target.x - source.x, dy = target.y - source.y;
      let distance = Math.hypot(dx, dy);
      if (distance < .001) { dx = source.team === "friendly" ? 1 : -1; dy = 0; distance = 1; }
      target.x += dx / distance * 26;
      target.y += dy / distance * 14;
      target.stagger = Math.max(target.stagger, .24);
      burst(target.x, target.y - 15, 9, "#dfbd78");
    }
    floatingText.push({ x: target.x, y: target.y - 64, text: `-${Math.round(finalDamage)}`, color: heavy ? "#ffc96b" : "#fff1c4", life: .75 });
    burst(target.x, target.y - 18, heavy ? 16 : 5, heavy ? "#e6a743" : "#cfbf92");
    if (target.hp <= 0) {
      target.hp = 0; target.dead = true; target.state = "dead"; target.fall = 0;
      if (target.team === "friendly") { friendlyLosses++; friendlyMorale = Math.max(15, friendlyMorale - 1.35); }
      else { enemyLosses++; enemyMorale = Math.max(8, enemyMorale - 1.6); }
      if (target.kind === "commander") {
        if (target.team === "enemy") enemyMorale = Math.max(5, enemyMorale - 18);
        else friendlyMorale = Math.max(10, friendlyMorale - 18);
        announce(target.team === "enemy" ? "Düşman komutanı düştü! Savunma çözülüyor." : "Paşa düştü! Sancağın çevresinde toplan!", 3);
      }
    }
  }

  function burst(x, y, count, color) {
    for (let i = 0; i < count; i++) particles.push({ x, y, vx: (Math.random() - .5) * 160, vy: (Math.random() - .7) * 150, life: .45 + Math.random() * .6, max: 1, size: 2 + Math.random() * 8, color });
  }

  function damageFortress(amount, atX = 512) {
    if (fortress <= 0) return;
    fortress = Math.max(0, fortress - amount);
    if (elapsed >= nextFortressFeedback || fortress === 0) {
      nextFortressFeedback = elapsed + .22;
      floatingText.push({ x: atX, y: FORTRESS_Y + 20, text: `SUR -${Math.round(amount)}`, color: "#ffd16d", life: 1.1 });
      burst(atX, FORTRESS_Y + 40, 18, "#bc8b51");
      screenShake = Math.max(screenShake, 10);
    }
    if (fortress === 0) {
      announce("SUR YARILDI! Son hücum!", 4);
      tone(110, .8, "sawtooth", .12, 180); noise(.8, .17);
    }
  }

  function attack(attacker, target) {
    const s = stats[attacker.kind];
    attacker.cooldown = s.rate * (.88 + Math.random() * .25);
    attacker.state = "attack"; attacker.stateTime = 0;
    attacker.facing = target.x >= attacker.x ? 1 : -1;
    const damage = s.damage * attacker.bonus;
    if (attacker.kind === "archer") projectile(attacker, target, "arrow", damage, attacker.team);
    else if (attacker.kind === "siege") {
      projectile(attacker, target, "cannon", damage, attacker.team);
      if (attacker.team === "friendly") damageFortress(13 + Math.random() * 8, target.x);
      noise(.28, .08); screenShake = 5;
    } else {
      hit(target, damage, attacker.team, attacker.kind === "cavalry", attacker);
      if (Math.random() < .18) tone(80 + Math.random() * 70, .07, "square", .018, -40);
    }
  }

  function updateUnit(unit, dt) {
    if (unit.dead) { unit.fall = Math.min(1, unit.fall + dt * 2.4); return; }
    unit.cooldown -= dt; unit.hit = Math.max(0, unit.hit - dt); unit.stateTime += dt;
    unit.stagger = Math.max(0, unit.stagger - dt);
    if (unit.stagger > 0) { unit.state = "hit"; return; }
    const s = stats[unit.kind];
    const near = combatTarget(unit);
    const fortressOpen = fortress <= 0;
    let tx = unit.targetX, ty = unit.targetY;
    const orderDistance = Math.hypot(unit.targetX - unit.x, unit.targetY - unit.y);
    const obeyingMoveOrder = unit.order === "move" && orderDistance > 22;

    if (unit.team === "friendly" && !near.unit) {
      const post = fortressPost(unit, fortressOpen);
      tx = post.x; ty = post.y;
    }
    if (unit.team === "enemy" && !near.unit) { tx = unit.x; ty = unit.y; }
    if (near.unit && !obeyingMoveOrder && (unit.order === "charge" || near.distance < s.range + 150 || elapsed > 13)) { tx = near.unit.x; ty = near.unit.y; }

    const dx = tx - unit.x, dy = ty - unit.y;
    const dist = Math.hypot(dx, dy);
    const attackRange = s.range + (near.unit ? stats[near.unit.kind].size * .16 : 0);
    if (near.unit && !obeyingMoveOrder && near.distance <= attackRange) {
      if (unit.cooldown <= 0) attack(unit, near.unit);
      if (unit.hit <= 0 && unit.stateTime > .32) unit.state = "idle";
      return;
    }

    const fortressAttackLine = unit.kind === "siege" ? 770 : unit.kind === "archer" ? 670 : 590;
    if (unit.team === "friendly" && !near.unit && unit.y <= fortressAttackLine && fortress > 0) {
      if (unit.cooldown <= 0) {
        unit.cooldown = Math.max(.65, s.rate);
        unit.state = "attack"; unit.stateTime = 0;
        damageFortress(s.damage * (unit.kind === "siege" ? 1.5 : .35), unit.x);
      }
      return;
    }

    if (dist > 8) {
      const moraleSpeed = unit.team === "friendly" ? .72 + friendlyMorale / 330 : .72 + enemyMorale / 330;
      const speed = s.speed * moraleSpeed * (unit.order === "charge" ? 1.25 : 1);
      unit.x += dx / dist * speed * dt; unit.y += dy / dist * speed * dt;
      unit.x = Math.max(52, Math.min(W - 52, unit.x)); unit.y = Math.max(300, Math.min(H - 210, unit.y));
      unit.facing = dx >= 0 ? 1 : -1;
      if (unit.hit <= 0) unit.state = "walk";
    } else {
      if (unit.order === "move") unit.order = "hold";
      if (unit.hit <= 0 && unit.state !== "attack") unit.state = "idle";
    }
  }

  function resolveUnitSpacing(dt) {
    const cellSize = 128;
    const buckets = new Map();
    for (const unit of units) {
      if (unit.dead) continue;
      const cellX = Math.floor(unit.x / cellSize), cellY = Math.floor(unit.y / cellSize);
      const key = `${cellX}:${cellY}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(unit);
    }

    const response = Math.min(1, dt * 16);
    for (const unit of units) {
      if (unit.dead) continue;
      const cellX = Math.floor(unit.x / cellSize), cellY = Math.floor(unit.y / cellSize);
      for (let offsetX = -1; offsetX <= 1; offsetX++) {
        for (let offsetY = -1; offsetY <= 1; offsetY++) {
          const nearby = buckets.get(`${cellX + offsetX}:${cellY + offsetY}`);
          if (!nearby) continue;
          for (const other of nearby) {
            if (other.dead || other.id <= unit.id) continue;
            const sameTeam = other.team === unit.team;
            const baseDistance = (stats[unit.kind].size + stats[other.kind].size) * .38;
            const minimumDistance = sameTeam ? baseDistance : baseDistance * .72;
            let dx = unit.x - other.x, dy = unit.y - other.y;
            let distance = Math.hypot(dx, dy);
            if (distance >= minimumDistance) continue;
            if (distance < .001) {
              const angle = ((unit.id * 37 + other.id * 17) % 360) * Math.PI / 180;
              dx = Math.cos(angle); dy = Math.sin(angle); distance = 1;
            }
            const correction = (minimumDistance - distance) * response * (sameTeam ? .52 : .38);
            const pushX = dx / distance * correction, pushY = dy / distance * correction;
            unit.x = Math.max(52, Math.min(W - 52, unit.x + pushX));
            unit.y = Math.max(300, Math.min(H - 210, unit.y + pushY));
            other.x = Math.max(52, Math.min(W - 52, other.x - pushX));
            other.y = Math.max(300, Math.min(H - 210, other.y - pushY));
          }
        }
      }
    }
  }

  function updateProjectiles(dt) {
    for (const p of projectiles) {
      p.t += dt; const q = Math.min(1, p.t / p.duration); const arc = Math.sin(q * Math.PI) * (p.kind === "cannon" ? 135 : 70);
      p.x = p.fromX + (p.tx - p.fromX) * q; p.y = p.fromY + (p.ty - p.fromY) * q - arc;
      if (q >= 1 && !p.done) {
        p.done = true;
        if (p.target && !p.target.dead) hit(p.target, p.damage, p.team, p.kind === "cannon", unitById.get(p.sourceId));
        if (p.kind === "cannon") { burst(p.tx, p.ty, 24, "#d3944d"); screenShake = 9; noise(.35, .11); }
      }
    }
    projectiles = projectiles.filter(p => !p.done);
  }

  function enemyAI() {
    const alive = units.filter(u => u.team === "enemy" && !u.dead);
    const friends = units.filter(u => u.team === "friendly" && !u.dead);
    if (!alive.length || !friends.length) return;
    alive.forEach((u, i) => {
      u.order = "charge";
      const target = friends[(i * 5 + commandRevision) % friends.length];
      u.targetX = target.x; u.targetY = target.y; u.targetId = target.id;
    });
    if (Math.random() < .55) {
      const archers = alive.filter(u => u.kind === "archer");
      const candidates = friends.filter(u => u.y > 760);
      archers.slice(0, 5).forEach((a, i) => candidates.length && projectile(a, candidates[i % candidates.length], "arrow", stats.archer.damage * .9, "enemy"));
      announce("Düşman okçuları salvo atıyor!", 2);
    } else announce("Düşman safları karşı hücuma geçti!", 2);
  }

  function update(dt) {
    if (mode !== "battle" || paused) return;
    dt = Math.min(.035, dt) * battleSpeed;
    elapsed += dt;
    messageTimer -= dt;
    if (messageTimer <= 0) ui.message.classList.remove("show");
    Object.keys(cooldowns).forEach(k => cooldowns[k] = Math.max(0, cooldowns[k] - dt));
    units.forEach(u => updateUnit(u, dt));
    resolveUnitSpacing(dt);
    updateProjectiles(dt);
    particles.forEach(p => { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 150 * dt; p.vx *= .985; });
    particles = particles.filter(p => p.life > 0);
    floatingText.forEach(f => { f.life -= dt; f.y -= 28 * dt; }); floatingText = floatingText.filter(f => f.life > 0);
    screenShake *= .88;

    if (elapsed >= nextEnemyOrder) { nextEnemyOrder += 10 + Math.random() * 7; enemyAI(); }
    const friendlyAlive = units.filter(u => u.team === "friendly" && !u.dead).length;
    const enemyAlive = units.filter(u => u.team === "enemy" && !u.dead).length;
    if (friendlyAlive === 0) finish(false);
    else if (enemyAlive === 0 && fortress <= 0) finish(true);
    else if (elapsed >= MAX_TIME) finish(enemyAlive === 0 && fortress <= 0);
    if (elapsed >= nextUiUpdate) {
      nextUiUpdate = elapsed + .08;
      updateUI(friendlyAlive, enemyAlive);
    }
  }

  function phaseName(enemyAlive) {
    if (elapsed < 5) return "KONUŞLANMA";
    if (elapsed < 13) return "İLERLEYİŞ";
    if (fortress <= 0) return "SON HÜCUM";
    if (enemyAlive <= 7 || fortress < fortressMax * .52) return "SUR YARMA";
    return "MEYDAN SAVAŞI";
  }

  function updateUI(friendlyAlive, enemyAlive) {
    ui.friendlyCount.textContent = friendlyAlive; ui.enemyCount.textContent = enemyAlive;
    ui.friendlyMorale.textContent = `Moral ${Math.round(friendlyMorale)}`;
    ui.enemyMorale.textContent = `Moral ${Math.round(enemyMorale)}`;
    const ratio = fortress / fortressMax;
    ui.fortressFill.style.width = `${ratio * 100}%`; ui.fortressPercent.textContent = `${Math.round(ratio * 100)}%`;
    ui.phase.textContent = phaseName(enemyAlive);
    const remain = Math.max(0, Math.ceil(MAX_TIME - elapsed)); ui.time.textContent = `0${Math.floor(remain / 60)}:${String(remain % 60).padStart(2, "0")}`;
    Object.entries(rowFor).forEach(([kind]) => {
      const el = document.querySelector(`#${kind}-count`); if (el) el.textContent = units.filter(u => u.team === "friendly" && u.kind === kind && !u.dead).length;
    });
    document.querySelectorAll(".command").forEach(btn => {
      const left = cooldowns[btn.dataset.command] || 0; const max = { charge: 11, volley: 13, cannon: 17, rally: 18 }[btn.dataset.command];
      btn.classList.toggle("cooling", left > 0); btn.querySelector(".cooldown").style.height = `${left / max * 100}%`;
    });
  }

  function frameFor(unit) {
    if (unit.dead) return 4;
    if (unit.hit > 0) return 3;
    if (unit.state === "attack" && unit.stateTime < .36) return 2;
    if (unit.state === "walk") return Math.floor(unit.stateTime * 6) % 2;
    return 0;
  }

  function drawUnit(unit) {
    const s = stats[unit.kind];
    const depth = .68 + unit.y / H * .52;
    const size = s.size * depth;
    if (!atlas.naturalWidth) {
      ctx.fillStyle = unit.team === "friendly" ? "#2d78a8" : "#a6383c";
      ctx.beginPath(); ctx.arc(unit.x, unit.y - size * .35, size * .22, 0, Math.PI * 2); ctx.fill();
      return;
    }
    const col = frameFor(unit); const row = rowFor[unit.kind];
    const sw = atlas.width / 5, sh = atlas.height / 5;
    ctx.save();
    ctx.translate(unit.x, unit.y);
    if (unit.selected && !unit.dead) {
      ctx.strokeStyle = "#ffd26e"; ctx.lineWidth = 3; ctx.globalAlpha = .88;
      ctx.beginPath(); ctx.ellipse(0, 8, size * .38, size * .13, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = unit.dead ? .68 : 1;
    if (unit.team === "enemy") { ctx.shadowColor = "#c72f35"; ctx.shadowBlur = 12; }
    else { ctx.shadowColor = "#2d82bd"; ctx.shadowBlur = unit.selected ? 18 : 5; }
    if (unit.facing < 0) ctx.scale(-1, 1);
    const fallScale = unit.dead ? .96 : 1;
    ctx.drawImage(atlas, col * sw, row * sh, sw, sh, -size * .58, -size * 1.02, size * 1.16 * fallScale, size * 1.16);
    ctx.restore();

    if (!unit.dead && (unit.hit > 0 || unit.selected || unit.hp < unit.maxHp * .72)) {
      const bw = size * .68; const x = unit.x - bw / 2, y = unit.y - size * .94;
      ctx.fillStyle = "#120b09"; ctx.fillRect(x - 1, y - 1, bw + 2, 5);
      ctx.fillStyle = unit.team === "friendly" ? "#57a8d2" : "#cc4b4d"; ctx.fillRect(x, y, bw * Math.max(0, unit.hp / unit.maxHp), 3);
    }
  }

  function drawFlag(x, y, team, phase) {
    const wave = Math.sin(phase * 3 + x) * 7;
    ctx.strokeStyle = "#30251a"; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x, y + 55); ctx.lineTo(x, y - 82); ctx.stroke();
    ctx.fillStyle = team === "friendly" ? "#173a65" : "#7e1f27";
    ctx.beginPath(); ctx.moveTo(x, y - 80); ctx.lineTo(x + 73 + wave, y - 68); ctx.lineTo(x + 59, y - 19); ctx.lineTo(x, y - 31); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#dfb75c"; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = "#e8c86f"; ctx.font = "38px Georgia"; ctx.fillText("☾", x + 16, y - 37);
  }

  function draw() {
    ctx.save();
    const shakeX = (Math.random() - .5) * screenShake, shakeY = (Math.random() - .5) * screenShake;
    ctx.translate(shakeX, shakeY);
    if (background.naturalWidth) ctx.drawImage(background, 0, 0, W, H); else { ctx.fillStyle = "#273942"; ctx.fillRect(0, 0, W, H); }

    if (mode !== "campaign") {
      ctx.fillStyle = "rgba(9,15,18,.11)"; ctx.fillRect(0, 0, W, H);
      if (fortress <= 0) {
        ctx.fillStyle = "rgba(30,23,18,.72)"; ctx.fillRect(438, 345, 148, 145);
        ctx.fillStyle = "rgba(8,7,6,.85)"; ctx.beginPath(); ctx.moveTo(455, 475); ctx.lineTo(500, 385); ctx.lineTo(547, 475); ctx.closePath(); ctx.fill();
      }
      drawFlag(90, 1255, "friendly", elapsed); drawFlag(867, 595, "enemy", elapsed);
      const sorted = [...units].sort((a, b) => a.y - b.y);
      sorted.forEach(drawUnit);
      for (const p of projectiles) {
        if (p.kind === "arrow") {
          ctx.strokeStyle = p.team === "friendly" ? "#f2db9d" : "#ff9e88"; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(p.x - 15, p.y + 9); ctx.lineTo(p.x + 8, p.y - 5); ctx.stroke();
        } else {
          ctx.fillStyle = "#191511"; ctx.shadowColor = "#ffb34f"; ctx.shadowBlur = 18;
          ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        }
      }
      for (const p of particles) { ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.size, p.size); }
      ctx.globalAlpha = 1;
      for (const f of floatingText) { ctx.globalAlpha = Math.min(1, f.life * 2); ctx.fillStyle = f.color; ctx.font = "bold 21px ui-sans-serif"; ctx.textAlign = "center"; ctx.fillText(f.text, f.x, f.y); }
      ctx.globalAlpha = 1; ctx.textAlign = "left";
    }
    ctx.restore();
  }

  function finish(victory) {
    if (mode !== "battle") return;
    paused = true;
    const score = Math.max(0, Math.round((victory ? 7000 : 1800) + enemyLosses * 95 + (MAX_TIME - elapsed) * 28 - friendlyLosses * 70));
    document.querySelector("#result-kicker").textContent = victory ? "ŞEHİR DÜŞTÜ" : "SEFER KIRILDI";
    document.querySelector("#result-title").textContent = victory ? "Fetih Tamamlandı" : "Ordu Geri Çekildi";
    document.querySelector("#result-copy").textContent = victory ? "Surlar yarıldı, muhafızlar dağıldı. Konstantiniyye artık CİHAN sancağı altında." : "Sur kırılamadı. Divanı yeniden topla, başka bir entrika ve düzenle tekrar saldır.";
    document.querySelector("#result-time").textContent = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(Math.floor(elapsed % 60)).padStart(2, "0")}`;
    document.querySelector("#result-losses").textContent = friendlyLosses;
    document.querySelector("#result-score").textContent = score.toLocaleString("tr-TR");
    document.querySelector(".result-seal").textContent = victory ? "☾" : "×";
    showScreen("result");
    if (victory) { tone(196, .35, "triangle", .07, 110); setTimeout(() => tone(262, .5, "triangle", .08, 130), 320); }
    else tone(105, .8, "sawtooth", .07, -50);
  }

  function issueCommand(command) {
    if (mode !== "battle" || cooldowns[command] > 0) return;
    setupAudio(); commandRevision++;
    const friends = units.filter(u => u.team === "friendly" && !u.dead);
    const enemies = units.filter(u => u.team === "enemy" && !u.dead);
    if (command === "charge") {
      cooldowns.charge = 11; friends.forEach((u, i) => { u.order = "charge"; u.bonus = Math.max(u.bonus, 1.16); if (enemies.length) { const t = enemies[(i * 3) % enemies.length]; u.targetX = t.x; u.targetY = t.y; u.targetId = t.id; } });
      friendlyMorale = Math.min(100, friendlyMorale + 5); announce("Cihan için hücum! Bütün hatlar ileri!", 2.5); tone(180, .42, "sawtooth", .09, 120);
    }
    if (command === "volley") {
      cooldowns.volley = 13; const archers = friends.filter(u => u.kind === "archer"); const targets = enemies.sort(() => Math.random() - .5).slice(0, Math.max(1, archers.length));
      archers.forEach((a, i) => targets.length && projectile(a, targets[i % targets.length], "arrow", stats.archer.damage * 2.1, "friendly"));
      announce("Göğü karart! Ok yağmuru!", 2); tone(320, .18, "triangle", .04, 250);
    }
    if (command === "cannon") {
      cooldowns.cannon = 17; const cannons = friends.filter(u => u.kind === "siege");
      cannons.forEach((c, i) => { const t = enemies[i % Math.max(1, enemies.length)] || { x: 430 + i * 85, y: FORTRESS_Y }; projectile(c, t, "cannon", stats.siege.damage * 1.5, "friendly"); });
      damageFortress(115 + cannons.length * 22, 512); announce("Şahi bataryası ateş! Surları parçala!", 2.7); noise(.65, .16);
    }
    if (command === "rally") {
      cooldowns.rally = 18; friendlyMorale = Math.min(100, friendlyMorale + 14); friends.forEach(u => { u.hp = Math.min(u.maxHp, u.hp + u.maxHp * .08); u.bonus = Math.max(u.bonus, 1.1); });
      announce("Sancağa! Safları sıklaştır, morali yükselt!", 2.6); tone(146, .35, "triangle", .07, 80); tone(220, .55, "triangle", .05, 100);
    }
  }

  function battlefieldPoint(event) {
    const rect = canvas.getBoundingClientRect(); return { x: (event.clientX - rect.left) / rect.width * W, y: (event.clientY - rect.top) / rect.height * H };
  }

  canvas.addEventListener("pointerdown", (event) => {
    if (mode !== "battle" || paused) return;
    const p = battlefieldPoint(event);
    if (p.y < 250 || p.y > H - 170) return;
    const group = units.filter(u => u.team === "friendly" && !u.dead && u.kind === selectedKind);
    group.forEach((u, i) => {
      const cols = Math.ceil(Math.sqrt(group.length)); const col = i % cols, row = Math.floor(i / cols);
      u.targetX = Math.max(55, Math.min(W - 55, p.x + (col - (cols - 1) / 2) * 58));
      u.targetY = Math.max(300, Math.min(H - 230, p.y + row * 43));
      u.order = p.y < u.y - 100 ? "charge" : "move"; u.targetId = null; u.selected = true;
    });
    units.filter(u => u.team === "friendly" && u.kind !== selectedKind).forEach(u => u.selected = false);
    burst(p.x, p.y, 9, "#f2c96e"); announce(`${unitLabels[selectedKind]} birliğine yürüyüş emri verildi.`, 1.4); tone(260, .08, "triangle", .025, 50);
  });

  document.querySelectorAll(".plot").forEach(btn => btn.addEventListener("click", () => {
    chosenPlot = btn.dataset.plot; document.querySelectorAll(".plot").forEach(b => b.classList.toggle("selected", b === btn)); tone(280, .08, "triangle", .025, 70);
  }));
  document.querySelectorAll(".formation").forEach(btn => btn.addEventListener("click", () => {
    formation = btn.dataset.formation; document.querySelectorAll(".formation").forEach(b => b.classList.toggle("selected", b === btn)); tone(220, .08, "triangle", .025, 40);
  }));
  document.querySelector("#start-battle").addEventListener("click", startBattle);
  document.querySelector("#replay-button").addEventListener("click", () => showScreen("campaign"));
  document.querySelectorAll(".unit-card").forEach(btn => btn.addEventListener("click", () => {
    selectedKind = btn.dataset.unit; document.querySelectorAll(".unit-card").forEach(b => b.classList.toggle("selected", b === btn));
    units.forEach(u => u.selected = u.team === "friendly" && !u.dead && u.kind === selectedKind); tone(230, .06, "triangle", .02, 35);
  }));
  document.querySelectorAll(".command").forEach(btn => btn.addEventListener("click", () => issueCommand(btn.dataset.command)));
  document.querySelectorAll(".speed").forEach(btn => btn.addEventListener("click", () => {
    battleSpeed = Number(btn.dataset.speed); paused = false; document.querySelector("#pause-button").classList.remove("selected");
    document.querySelectorAll(".speed").forEach(b => b.classList.toggle("selected", b === btn));
  }));
  document.querySelector("#pause-button").addEventListener("click", (event) => { paused = !paused; event.currentTarget.classList.toggle("selected", paused); announce(paused ? "Savaş duraklatıldı." : "Savaş devam ediyor.", 1.4); });
  document.querySelector("#sound-button").addEventListener("click", (event) => { soundOn = !soundOn; event.currentTarget.textContent = soundOn ? "♪" : "×"; if (soundOn) tone(240, .08); });

  function loop(now) {
    const dt = (now - last) / 1000; last = now;
    update(dt); draw(); requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
