// The overlay: level card, relic pips, exposure meter, alarm banner, toasts and
// the security plan (a live minimap of walls, relics, exit, patrols and the thief).
// Everything here is DOM or 2D canvas, so the text stays crisp at any window size.

const SCREEN_IDS = ['title', 'brief', 'pause', 'caught', 'clear', 'victory'];

export function createHud() {
  const element = (id) => document.getElementById(id);
  const hud = element('hud');
  const screens = {};
  for (const name of SCREEN_IDS) screens[name] = element(`screen-${name}`);
  const pips = element('relic-pips');
  const minimap = element('minimap');
  const context = minimap.getContext('2d');
  const exposureFill = element('exposure-fill');
  const exposureState = element('exposure-state');
  const alertBanner = element('alert-banner');
  const alarmFlash = element('alarm-flash');
  const toastElement = element('toast');
  const status = element('status');
  const intelState = element('intel-state');
  const intelPercent = element('intel-percent');
  const intelVisibility = element('intel-visibility');
  const intelNoise = element('intel-noise');
  const intelAlarms = element('intel-alarms');
  const intelSentries = element('intel-sentries');
  const intelTime = element('intel-time');
  const intelHint = element('intel-hint');
  const intelGoal = element('intel-goal');
  const objectives = element('intel-objectives');
  const coverTag = element('cover-tag');
  let toastTimer = 0;
  let levelData = null;
  let currentScreen = 'title';

  const state = {
    showHud() { hud.classList.remove('hidden'); },
    hideHud() { hud.classList.add('hidden'); },
    isHudVisible() { return !hud.classList.contains('hidden'); },

    setScreen(name) {
      currentScreen = name;
      for (const key of SCREEN_IDS) screens[key].classList.toggle('visible', key === name);
      if (name === 'title' || name === 'victory' || name === 'clear' || name === 'caught') state.hideHud();
      else if (name === 'brief' || name === 'pause') state.hideHud();
      else state.showHud();
    },
    getScreen() { return currentScreen; },

    setLevel(data, index) {
      levelData = data;
      element('level-name').textContent = data.name;
      element('level-subtitle').textContent = data.subtitle;
      element('brief-kicker').textContent = `APPROACH ${String(index + 1).padStart(2, '0')}`;
      element('brief-name').textContent = data.name;
      element('brief-text').textContent = data.brief;
      element('brief-relics').textContent = String(data.relics.length);
      element('clear-name').textContent = data.name;
      pips.replaceChildren();
      for (let pip = 0; pip < data.relics.length; pip += 1) {
        const mark = document.createElement('i');
        pips.appendChild(mark);
      }
      objectives.replaceChildren();
      for (const relic of data.relics) {
        const item = document.createElement('li');
        item.textContent = relic.name;
        objectives.appendChild(item);
      }
      const exit = document.createElement('li');
      exit.textContent = 'Reach the exit';
      objectives.appendChild(exit);
      intelSentries.textContent = `${data.guards.length} · ${data.cameras.length} CAM`;
      state.setRelics(0, data.relics.length);
    },

    setRelics(taken, total) {
      const marks = pips.children;
      for (let index = 0; index < marks.length; index += 1) {
        marks[index].classList.toggle('lit', index < taken);
      }
      element('relic-label').textContent = taken >= total ? 'EXIT UNLOCKED' : `RECOVER THE PIECES · ${taken} / ${total}`;
    },

    setExposure(value, tier) {
      exposureFill.style.width = `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
      exposureState.classList.toggle('watch', tier === 'watch');
      exposureState.classList.toggle('spot', tier === 'spot');
      exposureState.textContent = tier === 'spot' ? 'SPOTTED' : tier === 'watch' ? 'WATCHED' : 'CLEAR';
      intelState.classList.toggle('watch', tier === 'watch');
      intelState.classList.toggle('spot', tier === 'spot');
      intelState.textContent = tier === 'spot' ? 'SPOTTED' : tier === 'watch' ? 'SUSPICIOUS' : 'CLEAR';
      intelPercent.textContent = `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
      intelHint.textContent = tier === 'spot' ? 'RUN · BREAK LINE OF SIGHT' : tier === 'watch' ? 'A GUARD IS LOOKING · BREAK SIGHT' : 'NO ONE HAS SEEN YOU';
      intelHint.classList.toggle('watch', tier === 'watch');
      intelHint.classList.toggle('spot', tier === 'spot');
    },

    setIntel({ concealed, moving, crouching, alarms, time, relicsTaken, total, exitUnlocked }) {
      intelGoal.textContent = exitUnlocked ? 'EXIT OPEN' : `COLLECT ${total - relicsTaken}`;
      intelGoal.classList.toggle('hidden', exitUnlocked);
      intelGoal.classList.toggle('exposed', !exitUnlocked);
      intelVisibility.textContent = concealed ? 'IN COVER' : 'OPEN FLOOR';
      intelVisibility.classList.toggle('hidden', concealed);
      intelVisibility.classList.toggle('exposed', !concealed);
      intelNoise.textContent = crouching ? 'SILENT' : moving ? 'FOOTSTEPS' : 'STILL';
      intelAlarms.textContent = String(alarms);
      intelTime.textContent = time;
      const entries = objectives.children;
      for (let index = 0; index < entries.length; index += 1) {
        if (index < total) entries[index].classList.toggle('done', index < relicsTaken);
        else entries[index].classList.toggle('done', Boolean(exitUnlocked));
      }
    },

    setCoverTag(x, y, label, kind) {
      coverTag.textContent = label;
      coverTag.style.left = `${x}px`;
      coverTag.style.top = `${y}px`;
      coverTag.classList.toggle('exposed', kind === 'exposed');
      coverTag.classList.add('visible');
    },

    hideCoverTag() {
      coverTag.classList.remove('visible');
    },

    setAlarm(on) {
      alertBanner.classList.toggle('show', on);
      alarmFlash.classList.toggle('on', on);
    },

    toast(text, seconds = 2.2) {
      toastElement.textContent = text;
      toastElement.classList.add('show');
      toastTimer = seconds;
    },

    announce(text) {
      status.textContent = text;
    },

    update(dt) {
      if (toastTimer > 0) {
        toastTimer -= dt;
        if (toastTimer <= 0) toastElement.classList.remove('show');
      }
    },

    setStats(prefix, stats) {
      element(`${prefix}-time`).textContent = stats.time;
      element(`${prefix}-relics`).textContent = `${stats.relics} / ${stats.total}`;
      element(`${prefix}-alarms`).textContent = String(stats.alarms);
      element(`${prefix}-rank`).textContent = stats.rank;
    },

    setCaughtText(text) {
      element('caught-text').textContent = text;
    },

    drawMinimap(level, player, actors, cameras, relicsTaken) {
      if (!levelData) return;
      const width = minimap.width;
      const height = minimap.height;
      const padding = 14;
      const scale = Math.min((width - padding * 2) / levelData.size.w, (height - padding * 2) / levelData.size.d);
      const offsetX = (width - levelData.size.w * scale) / 2;
      const offsetY = (height - levelData.size.d * scale) / 2;
      const mapX = (x) => offsetX + x * scale;
      const mapY = (z) => offsetY + z * scale;
      context.clearRect(0, 0, width, height);
      context.fillStyle = 'rgba(3, 9, 12, 0.92)';
      context.fillRect(0, 0, width, height);

      context.strokeStyle = 'rgba(95, 242, 227, 0.07)';
      context.lineWidth = 1;
      for (let x = 0; x <= levelData.size.w; x += 2) {
        context.beginPath();
        context.moveTo(mapX(x), offsetY);
        context.lineTo(mapX(x), offsetY + levelData.size.d * scale);
        context.stroke();
      }
      for (let z = 0; z <= levelData.size.d; z += 2) {
        context.beginPath();
        context.moveTo(offsetX, mapY(z));
        context.lineTo(offsetX + levelData.size.w * scale, mapY(z));
        context.stroke();
      }

      context.fillStyle = 'rgba(14, 34, 42, 0.9)';
      context.fillRect(mapX(0), mapY(0), levelData.size.w * scale, levelData.size.d * scale);

      for (const shadow of levelData.shadows) {
        context.fillStyle = 'rgba(0, 0, 0, 0.35)';
        context.fillRect(mapX(shadow.x - shadow.w / 2), mapY(shadow.z - shadow.d / 2), shadow.w * scale, shadow.d * scale);
      }

      context.fillStyle = 'rgba(120, 155, 166, 0.5)';
      for (const wall of levelData.walls) {
        context.fillRect(mapX(wall.x - wall.w / 2), mapY(wall.z - wall.d / 2), Math.max(2, wall.w * scale), Math.max(2, wall.d * scale));
      }
      for (const cover of levelData.covers) {
        context.fillStyle = cover.h >= 2 ? 'rgba(80, 118, 128, 0.62)' : 'rgba(70, 96, 102, 0.45)';
        context.fillRect(mapX(cover.x - cover.w / 2), mapY(cover.z - cover.d / 2), Math.max(1.5, cover.w * scale), Math.max(1.5, cover.d * scale));
      }

      for (const relic of level.relics) {
        if (relic.collected) continue;
        const x = mapX(relic.group.position.x);
        const y = mapY(relic.group.position.z);
        context.save();
        context.translate(x, y);
        context.rotate(Math.PI / 4);
        context.fillStyle = relic.main ? '#8fffe0' : '#ffcf8a';
        context.fillRect(-4, -4, 8, 8);
        context.restore();
      }

      const exit = levelData.exit;
      context.strokeStyle = relicsTaken >= levelData.relics.length ? '#68ffb0' : '#ff7788';
      context.lineWidth = 2;
      context.beginPath();
      context.arc(mapX(exit.x), mapY(exit.z), 7, 0, Math.PI * 2);
      context.stroke();

      for (const camera of cameras) {
        context.fillStyle = '#ff4d5e';
        context.beginPath();
        context.arc(mapX(camera.position.x), mapY(camera.position.z), 3.2, 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = 'rgba(255, 77, 94, 0.34)';
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(mapX(camera.position.x), mapY(camera.position.z));
        context.arc(mapX(camera.position.x), mapY(camera.position.z), camera.range * scale * 0.82, camera.facing - camera.fov / 2, camera.facing + camera.fov / 2);
        context.closePath();
        context.stroke();
      }

      for (const guard of actors) {
        const alarmed = guard.state === 'alarm' || guard.state === 'search';
        const color = alarmed ? '#ff4d5e' : guard.awareness > 0.3 ? '#ff8a3d' : '#ffb24d';
        context.strokeStyle = alarmed ? 'rgba(255, 77, 94, 0.34)' : 'rgba(255, 178, 77, 0.26)';
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(mapX(guard.position.x), mapY(guard.position.z));
        context.arc(mapX(guard.position.x), mapY(guard.position.z), guard.range * scale * 0.8, guard.facing - guard.fov / 2, guard.facing + guard.fov / 2);
        context.closePath();
        context.stroke();
        context.fillStyle = color;
        context.beginPath();
        context.arc(mapX(guard.position.x), mapY(guard.position.z), 3.4, 0, Math.PI * 2);
        context.fill();
      }

      context.fillStyle = '#5ff2e3';
      context.beginPath();
      context.arc(mapX(player.position.x), mapY(player.position.z), 4, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = 'rgba(95, 242, 227, 0.45)';
      context.beginPath();
      context.arc(mapX(player.position.x), mapY(player.position.z), 7.5 + Math.sin(performance.now() * 0.004) * 1.5, 0, Math.PI * 2);
      context.stroke();
      context.strokeStyle = '#bafff7';
      context.beginPath();
      context.moveTo(mapX(player.position.x), mapY(player.position.z));
      context.lineTo(mapX(player.position.x) + Math.cos(player.facing) * 10, mapY(player.position.z) + Math.sin(player.facing) * 10);
      context.stroke();
    },
  };
  return state;
}
