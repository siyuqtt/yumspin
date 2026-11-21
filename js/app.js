(function (ns) {
const { INGREDIENTS, TIME_STEPS, COMPLEXITY_META, generateRecipe, audio } = ns;

const CATEGORIES = ['carb', 'veggie', 'protein'];

const state = {
  screen: 1,
  indices: {
    carb: 0,    // Rice
    veggie: 0,  // Broccoli
    protein: 0, // Egg
  },
  locked: {
    carb: false,
    veggie: false,
    protein: false,
  },
  openPicker: null,     // 'carb' | 'veggie' | 'protein' | null
  calorieScore: 35,     // 0 (Monk Mode) -> 100 (Deluxe)
  complexity: 2,        // 1..5
  timeStepIndex: 2,     // TIME_STEPS[2] = 20 min
  styleOffset: 0,
  completedSteps: new Set(),
};

// DOM Elements
const els = {
  headerSubtitle: document.getElementById('headerSubtitle'),
  stepPill1: document.getElementById('stepPill1'),
  stepPill2: document.getElementById('stepPill2'),
  screenPick: document.getElementById('screenPick'),
  screenCook: document.getElementById('screenCook'),

  btnReshuffle: document.getElementById('btnReshuffle'),
  shuffleIcon: document.getElementById('shuffleIcon'),
  btnCookThis: document.getElementById('btnCookThis'),
  btnBackToPick: document.getElementById('btnBackToPick'),

  trioMiniList: document.getElementById('trioMiniList'),
  calorieSlider: document.getElementById('calorieSlider'),
  btnSnapEconomy: document.getElementById('btnSnapEconomy'),
  btnSnapDeluxe: document.getElementById('btnSnapDeluxe'),
  tierBadge: document.getElementById('tierBadge'),
  tierVibe: document.getElementById('tierVibe'),
  kcalNumber: document.getElementById('kcalNumber'),

  complexityLabel: document.getElementById('complexityLabel'),
  complexityDots: document.getElementById('complexityDots'),
  complexityValue: document.getElementById('complexityValue'),
  btnComplexityMinus: document.getElementById('btnComplexityMinus'),
  btnComplexityPlus: document.getElementById('btnComplexityPlus'),

  timeLabel: document.getElementById('timeLabel'),
  timeValue: document.getElementById('timeValue'),
  btnTimeMinus: document.getElementById('btnTimeMinus'),
  btnTimePlus: document.getElementById('btnTimePlus'),

  recipeCard: document.getElementById('recipeCard'),
  methodPill: document.getElementById('methodPill'),
  btnAltStyle: document.getElementById('btnAltStyle'),
  recipeTitle: document.getElementById('recipeTitle'),
  recipeDesc: document.getElementById('recipeDesc'),
  recipeMacros: document.getElementById('recipeMacros'),
  boostersList: document.getElementById('boostersList'),
  stepsProgress: document.getElementById('stepsProgress'),
  platePreview: document.getElementById('platePreview'),
  stepsList: document.getElementById('stepsList'),
  chefTip: document.getElementById('chefTip'),

  installBar: document.getElementById('installBar'),
  installBarText: document.getElementById('installBarText'),
  btnInstallApp: document.getElementById('btnInstallApp'),
  btnDismissInstall: document.getElementById('btnDismissInstall'),

  btnToggleMusic: document.getElementById('btnToggleMusic'),
  btnToggleSfx: document.getElementById('btnToggleSfx'),
  musicMoodBar: document.getElementById('musicMoodBar'),
  musicMoodText: document.getElementById('musicMoodText'),
  musicMoodAction: document.getElementById('musicMoodAction'),
};

function getSelectedTrio() {
  return {
    carb: INGREDIENTS.carb[state.indices.carb],
    veggie: INGREDIENTS.veggie[state.indices.veggie],
    protein: INGREDIENTS.protein[state.indices.protein],
  };
}

function getTimeDescription(minutes) {
  if (minutes <= 10) return 'Super fast';
  if (minutes <= 15) return 'Express meal';
  if (minutes <= 20) return 'Quick weeknight';
  if (minutes <= 25) return 'Balanced pace';
  if (minutes <= 30) return 'Unrushed cook';
  if (minutes <= 40) return 'Oven / slow flavor';
  return 'Full weekend cook';
}

/* ==================== SCREEN 1: INGREDIENT DECKS ==================== */

function renderCategory(category, animClass = '') {
  const list = INGREDIENTS[category];
  const idx = state.indices[category];
  const item = list[idx];

  const track = document.querySelector(`[data-track="${category}"]`);
  const dotsWrap = document.querySelector(`[data-dots="${category}"]`);
  const countEl = document.querySelector(`[data-count="${category}"]`);
  const pickerToggle = document.querySelector(`[data-picker-toggle="${category}"]`);
  const pickerEl = document.querySelector(`[data-picker="${category}"]`);
  const card = document.querySelector(`.category-card[data-category="${category}"]`);
  const lockBtn = document.querySelector(`[data-lock="${category}"]`);

  // Render slide
  track.innerHTML = `
    <div class="ingredient-slide ${animClass}">
      <div class="food-art-wrap">
        <img
          class="food-art"
          src="${item.image}"
          alt="${item.name}"
          draggable="false"
          onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
        />
        <span class="food-art-fallback" aria-hidden="true">${item.emoji}</span>
      </div>
      <div class="food-info">
        <h2 class="food-name">${item.name}</h2>
        <p class="food-tagline">${item.tagline}</p>
        <div class="food-meta-row">
          <span class="food-chip">~${item.baseKcal} kcal</span>
          <span class="food-chip">${item.proteinG}g protein</span>
        </div>
      </div>
    </div>
  `;

  // Update count badge & quick picker drawer
  if (countEl) {
    countEl.textContent = `${idx + 1} / ${list.length}`;
  }
  const isPickerOpen = state.openPicker === category;
  if (pickerToggle) {
    pickerToggle.setAttribute('aria-expanded', String(isPickerOpen));
  }
  if (pickerEl) {
    pickerEl.hidden = !isPickerOpen;
    if (isPickerOpen) {
      pickerEl.innerHTML = list
        .map(
          (opt, i) => `
          <button
            type="button"
            class="quick-pick-item ${i === idx ? 'active' : ''}"
            data-pick-idx="${i}"
            aria-label="Choose ${opt.name}"
            aria-pressed="${i === idx}"
          >
            <img src="${opt.image}" alt="" loading="lazy" onerror="this.style.display='none'" />
            <span>${opt.name}</span>
          </button>
        `
        )
        .join('');
    }
  }

  // Render clickable dots
  dotsWrap.innerHTML = list
    .map(
      (opt, i) =>
        `<button
          type="button"
          class="deck-dot ${i === idx ? 'active' : ''}"
          data-dot-idx="${i}"
          role="tab"
          aria-selected="${i === idx}"
          aria-label="Select ${opt.name}"
          title="${opt.name}"
        ></button>`
    )
    .join('');

  // Lock state
  const isLocked = state.locked[category];
  card.classList.toggle('is-locked', isLocked);
  lockBtn.classList.toggle('locked', isLocked);
  lockBtn.querySelector('.lock-icon').textContent = isLocked ? '🔒' : '🔓';
  lockBtn.setAttribute(
    'aria-label',
    isLocked ? `Unlock ${category}` : `Lock ${category}`
  );
}

function selectCategoryIndex(category, targetIdx) {
  const list = INGREDIENTS[category];
  const prevIdx = state.indices[category];
  const next = ((targetIdx % list.length) + list.length) % list.length;
  if (next === prevIdx) return;
  const anim = next > prevIdx ? 'anim-left' : 'anim-right';
  state.indices[category] = next;
  state.styleOffset = 0;
  if (audio) audio.playSwipe(next > prevIdx ? 1 : -1);
  renderCategory(category, anim);
}

function stepCategory(category, delta) {
  const list = INGREDIENTS[category];
  const next = (state.indices[category] + delta + list.length) % list.length;
  state.indices[category] = next;
  state.styleOffset = 0;
  if (audio) audio.playSwipe(delta);
  renderCategory(category, delta > 0 ? 'anim-left' : 'anim-right');
}

function setupSwipeHandlers() {
  CATEGORIES.forEach((category) => {
    const track = document.querySelector(`[data-track="${category}"]`);
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let dx = 0;
    let isHorizontalSwipe = null;

    track.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      pointerId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      startTime = Date.now();
      dx = 0;
      isHorizontalSwipe = null;
      track.setPointerCapture(pointerId);
      track.classList.add('dragging');
    });

    track.addEventListener('pointermove', (e) => {
      if (pointerId === null || e.pointerId !== pointerId) return;
      const moveX = e.clientX - startX;
      const moveY = e.clientY - startY;

      if (isHorizontalSwipe === null) {
        if (Math.abs(moveX) > 6 || Math.abs(moveY) > 6) {
          isHorizontalSwipe = Math.abs(moveX) >= Math.abs(moveY);
        }
      }

      if (!isHorizontalSwipe) return;

      dx = moveX;
      const slide = track.querySelector('.ingredient-slide');
      if (slide) {
        const damped = dx * 0.72;
        const rot = Math.max(-4, Math.min(4, damped * 0.03));
        const opacity = Math.max(0.45, 1 - Math.abs(damped) / 260);
        slide.style.transform = `translateX(${damped}px) rotate(${rot}deg)`;
        slide.style.opacity = String(opacity);
      }
    });

    const finishDrag = (e) => {
      if (pointerId === null || e.pointerId !== pointerId) return;
      track.classList.remove('dragging');
      if (track.hasPointerCapture(pointerId)) {
        track.releasePointerCapture(pointerId);
      }
      pointerId = null;

      const elapsed = Math.max(1, Date.now() - startTime);
      const velocity = Math.abs(dx) / elapsed;
      const shouldSwitch =
        isHorizontalSwipe && (Math.abs(dx) > 42 || (Math.abs(dx) > 18 && velocity > 0.35));

      if (shouldSwitch) {
        // Swipe left (dx < 0) -> next item; swipe right (dx > 0) -> previous item
        stepCategory(category, dx < 0 ? 1 : -1);
      } else {
        const slide = track.querySelector('.ingredient-slide');
        if (slide) {
          slide.style.transform = '';
          slide.style.opacity = '';
        }
      }
      dx = 0;
      isHorizontalSwipe = null;
    };

    track.addEventListener('pointerup', finishDrag);
    track.addEventListener('pointercancel', finishDrag);

    // Arrow buttons
    document
      .querySelector(`[data-prev="${category}"]`)
      .addEventListener('click', () => stepCategory(category, -1));
    document
      .querySelector(`[data-next="${category}"]`)
      .addEventListener('click', () => stepCategory(category, 1));

    // Lock button
    document
      .querySelector(`[data-lock="${category}"]`)
      .addEventListener('click', () => {
        state.locked[category] = !state.locked[category];
        if (audio) audio.playLock(state.locked[category]);
        renderCategory(category);
      });

    // Clickable deck dots
    document
      .querySelector(`[data-dots="${category}"]`)
      .addEventListener('click', (e) => {
        const dot = e.target.closest('[data-dot-idx]');
        if (!dot) return;
        selectCategoryIndex(category, Number(dot.dataset.dotIdx));
      });

    // Quick picker toggle & item click
    const pickerToggle = document.querySelector(`[data-picker-toggle="${category}"]`);
    if (pickerToggle) {
      pickerToggle.addEventListener('click', () => {
        state.openPicker = state.openPicker === category ? null : category;
        if (audio) audio.playPickerToggle(state.openPicker === category);
        CATEGORIES.forEach((c) => renderCategory(c));
      });
    }

    const pickerEl = document.querySelector(`[data-picker="${category}"]`);
    if (pickerEl) {
      pickerEl.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-pick-idx]');
        if (!btn) return;
        const targetIdx = Number(btn.dataset.pickIdx);
        state.openPicker = null;
        if (targetIdx === state.indices[category]) {
          renderCategory(category);
        } else {
          selectCategoryIndex(category, targetIdx);
        }
      });
    }
  });
}

function reshuffleTrio() {
  // Close any open quick-picker tray during reshuffle
  if (state.openPicker) {
    state.openPicker = null;
    CATEGORIES.forEach((c) => renderCategory(c));
  }

  // If all 3 are locked, unlock them so reshuffle always works cleanly
  const allLocked = CATEGORIES.every((c) => state.locked[c]);
  if (allLocked) {
    CATEGORIES.forEach((c) => {
      state.locked[c] = false;
    });
  }

  // Spin dice icon
  els.shuffleIcon.classList.remove('spin-dice');
  void els.shuffleIcon.offsetWidth;
  els.shuffleIcon.classList.add('spin-dice');
  if (audio) audio.playReshuffle();

  const unlocked = CATEGORIES.filter((c) => !state.locked[c]);
  const newIndices = {};
  unlocked.forEach((c) => {
    const len = INGREDIENTS[c].length;
    const prev = state.indices[c];
    if (len > 1) {
      let pick = Math.floor(Math.random() * (len - 1));
      if (pick >= prev) pick += 1;
      newIndices[c] = pick;
    } else {
      newIndices[c] = 0;
    }
  });

  unlocked.forEach((c, i) => {
    state.indices[c] = newIndices[c];
    setTimeout(() => {
      renderCategory(c, 'anim-spin');
    }, i * 75);
  });

  state.styleOffset = 0;
}

/* ==================== SCREEN 2: HOW TO COOK ==================== */

function renderTrioSummary() {
  const { carb, veggie, protein } = getSelectedTrio();
  const items = [carb, veggie, protein];

  els.trioMiniList.innerHTML = items
    .map(
      (item) => `
      <span class="trio-mini-pill">
        <img src="${item.image}" alt="${item.name}" onerror="this.style.display='none'" />
        <span>${item.name}</span>
      </span>
    `
    )
    .join('');
}

function renderCookingStudio({ animateCard = false } = {}) {
  const { carb, veggie, protein } = getSelectedTrio();
  const timeMin = TIME_STEPS[state.timeStepIndex];

  const recipe = generateRecipe({
    carb,
    veggie,
    protein,
    calorieScore: state.calorieScore,
    complexity: state.complexity,
    timeMin,
    styleOffset: state.styleOffset,
  });

  const { nutrition } = recipe;
  const { tier } = nutrition;

  // Update Adaptive Cozy Music Mood
  syncAudioMood(tier.id);

  // Update Calorie Card
  els.tierBadge.textContent = tier.name;
  els.tierBadge.style.color = tier.badgeColor;
  els.tierBadge.style.background = tier.badgeBg;
  els.tierVibe.textContent = tier.vibe;
  els.kcalNumber.textContent = nutrition.totalKcal;
  els.calorieSlider.value = String(state.calorieScore);

  // Update Complexity Stepper UI
  const compMeta = COMPLEXITY_META[state.complexity];
  els.complexityLabel.textContent = compMeta.label;
  els.complexityValue.textContent = `${state.complexity} / 5`;
  els.complexityDots.innerHTML = [1, 2, 3, 4, 5]
    .map((n) => `<span class="c-dot ${n <= state.complexity ? 'filled' : ''}"></span>`)
    .join('');
  els.btnComplexityMinus.disabled = state.complexity <= 1;
  els.btnComplexityPlus.disabled = state.complexity >= 5;

  // Update Time Stepper UI
  els.timeLabel.textContent = getTimeDescription(timeMin);
  els.timeValue.textContent = `${timeMin} min`;
  els.btnTimeMinus.disabled = state.timeStepIndex <= 0;
  els.btnTimePlus.disabled = state.timeStepIndex >= TIME_STEPS.length - 1;

  // Reset checked steps when recipe signature changes
  const signature = `${carb.id}-${veggie.id}-${protein.id}-${recipe.methodId}-${tier.id}-${state.complexity}-${timeMin}`;
  if (els.recipeCard.dataset.sig !== signature) {
    state.completedSteps.clear();
    els.recipeCard.dataset.sig = signature;
  }

  // Update Recipe Card
  els.methodPill.textContent = `${recipe.methodIcon} ${recipe.methodName}`;
  els.recipeTitle.textContent = recipe.title;
  els.recipeDesc.textContent = recipe.description;

  els.recipeMacros.innerHTML = `
    <span class="macro-chip">${nutrition.totalKcal} <span>kcal</span></span>
    <span class="macro-chip">${nutrition.proteinG}g <span>protein</span></span>
    <span class="macro-chip">${nutrition.carbsG}g <span>carbs</span></span>
    <span class="macro-chip">${nutrition.fatG}g <span>fat</span></span>
  `;

  els.boostersList.innerHTML = recipe.boosters
    .map((b) => `<span class="booster-tag">${b}</span>`)
    .join('');

  renderSteps(recipe, { carb, veggie, protein });

  els.chefTip.innerHTML = `<strong>💡 Tip:</strong> ${recipe.tip}`;

  if (animateCard) {
    els.recipeCard.classList.remove('pulse');
    void els.recipeCard.offsetWidth;
    els.recipeCard.classList.add('pulse');
  }
}

function renderPlatePreview(recipe, trio) {
  if (!els.platePreview) return;

  const { steps } = recipe;
  const completedCount = state.completedSteps.size;
  const allDone = steps.length > 0 && completedCount === steps.length;

  // Determine which plate roles have been completed so far
  const platedRoles = new Set();
  steps.forEach((step, idx) => {
    if (!state.completedSteps.has(idx)) return;
    if (step.plateRole) platedRoles.add(step.plateRole);
    if (Array.isArray(step.alsoRoles)) {
      step.alsoRoles.forEach((r) => platedRoles.add(r));
    }
  });

  if (allDone || platedRoles.has('finish')) {
    platedRoles.add('carb');
    platedRoles.add('veggie');
    platedRoles.add('protein');
    platedRoles.add('sauce');
  }

  const carbPlated = platedRoles.has('carb');
  const veggiePlated = platedRoles.has('veggie');
  const proteinPlated = platedRoles.has('protein');
  const hasSauce = platedRoles.has('sauce') || platedRoles.has('finish');

  els.platePreview.classList.toggle('is-ready', allDone);
  els.platePreview.classList.toggle('has-sauce', hasSauce);

  const statusMsg = allDone
    ? 'All plated & ready to eat!'
    : completedCount === 0
    ? 'Tap each step below to build your dish'
    : `${completedCount} of ${steps.length} done · Looking yummy!`;

  els.platePreview.innerHTML = `
    <div class="plate-stage" aria-hidden="true">
      <div class="plate-vessel style-${recipe.plateStyle || 'bowl'}">
        <div class="plate-item role-carb ${carbPlated ? 'plated' : ''}">
          <img src="${trio.carb.image}" alt="" />
        </div>
        <div class="plate-item role-veggie ${veggiePlated ? 'plated' : ''}">
          <img src="${trio.veggie.image}" alt="" />
        </div>
        <div class="plate-item role-protein ${proteinPlated ? 'plated' : ''}">
          <img src="${trio.protein.image}" alt="" />
        </div>
      </div>
      <span class="plate-sparkle">${allDone ? '✨' : '💫'}</span>
    </div>
    <div class="plate-info">
      <div class="plate-heading-row">
        <span class="plate-title">${allDone ? '🍽️ Ready!' : `Final Plate · ${recipe.plateLabel}`}</span>
      </div>
      <p class="plate-status">${statusMsg}</p>
      <div class="plate-chips">
        <span class="plate-chip ${carbPlated ? 'plated' : ''}">${carbPlated ? '✓ ' : ''}${trio.carb.name}</span>
        <span class="plate-chip ${veggiePlated ? 'plated' : ''}">${veggiePlated ? '✓ ' : ''}${trio.veggie.name}</span>
        <span class="plate-chip ${proteinPlated ? 'plated' : ''}">${proteinPlated ? '✓ ' : ''}${trio.protein.name}</span>
      </div>
    </div>
  `;
}

function renderSteps(recipe, trio) {
  const { steps } = recipe;
  els.stepsProgress.textContent = `${state.completedSteps.size} / ${steps.length} done`;
  renderPlatePreview(recipe, trio);

  els.stepsList.innerHTML = steps
    .map((step, idx) => {
      const done = state.completedSteps.has(idx);
      const artHtml = step.art
        ? `
          <div class="step-art-wrap" aria-hidden="true">
            <img class="step-art" src="${step.art}" alt="" loading="lazy" onerror="this.parentElement.style.display='none'" />
            ${step.badge ? `<img class="step-ing-badge" src="${step.badge}" alt="" loading="lazy" onerror="this.style.display='none'" />` : ''}
          </div>
        `
        : '';

      return `
        <li class="step-item ${done ? 'done' : ''}" data-step-idx="${idx}" role="checkbox" aria-checked="${done}" tabindex="0">
          <span class="step-check">${done ? '✓' : idx + 1}</span>
          <div class="step-body">
            <span class="step-title">${step.title}</span>
            <span class="step-text">${step.text}</span>
          </div>
          ${artHtml}
        </li>
      `;
    })
    .join('');

  els.stepsList.querySelectorAll('.step-item').forEach((item) => {
    const toggle = () => {
      const idx = Number(item.dataset.stepIdx);
      let checkedNow = false;
      if (state.completedSteps.has(idx)) {
        state.completedSteps.delete(idx);
      } else {
        state.completedSteps.add(idx);
        checkedNow = true;
      }
      const allDoneNow = checkedNow && state.completedSteps.size === steps.length;
      if (audio) audio.playStepCheck(checkedNow, allDoneNow);
      renderSteps(recipe, trio);
    };
    item.addEventListener('click', toggle);
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    });
  });
}

/* ==================== AUDIO SYNC & CONTROLS ==================== */

function syncAudioMood(tierId) {
  if (!audio) return;
  const timeMin = TIME_STEPS[state.timeStepIndex];
  audio.setMood({
    screen: state.screen,
    tierId: tierId || undefined,
    complexity: state.complexity,
    timeMin,
  });
  renderAudioUI();
}

function renderAudioUI() {
  if (!audio) return;
  const info = audio.getMoodSummary();

  if (els.btnToggleMusic) {
    els.btnToggleMusic.classList.toggle('is-off', !info.musicEnabled);
    els.btnToggleMusic.setAttribute('aria-pressed', String(info.musicEnabled));
    els.btnToggleMusic.title = info.musicEnabled ? 'Mute background music' : 'Play cozy music';
  }

  if (els.btnToggleSfx) {
    els.btnToggleSfx.classList.toggle('is-off', !info.sfxEnabled);
    els.btnToggleSfx.setAttribute('aria-pressed', String(info.sfxEnabled));
    els.btnToggleSfx.querySelector('.audio-icon').textContent = info.sfxEnabled ? '🔊' : '🔇';
    els.btnToggleSfx.title = info.sfxEnabled ? 'Mute sound effects' : 'Enable sound effects';
  }

  if (els.musicMoodBar) {
    els.musicMoodBar.classList.toggle('is-muted', !info.musicEnabled);
    els.musicMoodBar.classList.toggle('is-playing', info.playing);

    if (!info.musicEnabled) {
      els.musicMoodText.textContent = `${info.emoji} ${info.name} · ${info.bpm} BPM · ${info.ensemble}`;
      els.musicMoodAction.textContent = 'Paused';
    } else if (!info.playing) {
      els.musicMoodText.textContent = `${info.emoji} ${info.name} · ${info.bpm} BPM · ${info.ensemble}`;
      els.musicMoodAction.textContent = 'Tap to play';
    } else {
      els.musicMoodText.textContent = `${info.emoji} ${info.name} · ${info.bpm} BPM · ${info.ensemble}`;
      els.musicMoodAction.textContent = 'Playing';
    }
  }
}

/* ==================== NAVIGATION & EVENTS ==================== */

function goToScreen(step) {
  const changed = state.screen !== step;
  state.screen = step;
  const isPick = step === 1;

  els.screenPick.hidden = !isPick;
  els.screenCook.hidden = isPick;

  els.stepPill1.classList.toggle('active', isPick);
  els.stepPill1.setAttribute('aria-selected', String(isPick));
  els.stepPill2.classList.toggle('active', !isPick);
  els.stepPill2.setAttribute('aria-selected', String(!isPick));

  els.headerSubtitle.textContent = isPick
    ? 'Swipe to pick your meal trio'
    : 'Tune flavor, complexity & time';

  if (changed && audio) {
    audio.playScreenSwitch(!isPick);
  }

  if (!isPick) {
    renderTrioSummary();
    renderCookingStudio({ animateCard: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    syncAudioMood();
  }
}

function init() {
  // Initial Render of Screen 1
  CATEGORIES.forEach((c) => renderCategory(c));
  setupSwipeHandlers();

  // Unlock Web Audio cleanly on the first user gesture (excluding audio toggle buttons)
  const unlockOnce = (e) => {
    if (!audio || audio.unlocked) return;
    if (e.target && e.target.closest && e.target.closest('#musicMoodBar, #btnToggleMusic, #btnToggleSfx')) {
      return;
    }
    audio.unlock();
    renderAudioUI();
    document.removeEventListener('pointerdown', unlockOnce, true);
    document.removeEventListener('keydown', unlockOnce, true);
  };
  document.addEventListener('pointerdown', unlockOnce, true);
  document.addEventListener('keydown', unlockOnce, true);

  // Header & mood bar audio controls
  if (els.btnToggleMusic) {
    els.btnToggleMusic.addEventListener('click', () => {
      if (audio) {
        audio.toggleMusic();
        renderAudioUI();
      }
    });
  }
  if (els.btnToggleSfx) {
    els.btnToggleSfx.addEventListener('click', () => {
      if (audio) {
        audio.toggleSfx();
        renderAudioUI();
      }
    });
  }
  if (els.musicMoodBar) {
    els.musicMoodBar.addEventListener('click', () => {
      if (audio) {
        if (!audio.unlocked && audio.musicEnabled) {
          audio.unlock();
        } else {
          audio.toggleMusic();
        }
        renderAudioUI();
      }
    });
  }

  // Reshuffle & Navigation
  els.btnReshuffle.addEventListener('click', reshuffleTrio);
  els.btnCookThis.addEventListener('click', () => goToScreen(2));
  els.btnBackToPick.addEventListener('click', () => goToScreen(1));
  els.stepPill1.addEventListener('click', () => goToScreen(1));
  els.stepPill2.addEventListener('click', () => goToScreen(2));

  // Guilt-o-Meter Slider (Monk Mode <-> Deluxe)
  els.calorieSlider.addEventListener('input', (e) => {
    state.calorieScore = Number(e.target.value);
    if (audio) audio.playSliderTick(state.calorieScore);
    renderCookingStudio();
  });

  els.btnSnapEconomy.addEventListener('click', () => {
    state.calorieScore = 8;
    if (audio) audio.playStepper(-1, 0.1);
    renderCookingStudio({ animateCard: true });
  });

  els.btnSnapDeluxe.addEventListener('click', () => {
    state.calorieScore = 95;
    if (audio) audio.playStepper(1, 0.95);
    renderCookingStudio({ animateCard: true });
  });

  // Complexity - / + buttons
  els.btnComplexityMinus.addEventListener('click', () => {
    if (state.complexity > 1) {
      state.complexity -= 1;
      state.styleOffset = 0;
      if (audio) audio.playStepper(-1, (state.complexity - 1) / 4);
      renderCookingStudio({ animateCard: true });
    }
  });

  els.btnComplexityPlus.addEventListener('click', () => {
    if (state.complexity < 5) {
      state.complexity += 1;
      state.styleOffset = 0;
      if (audio) audio.playStepper(1, (state.complexity - 1) / 4);
      renderCookingStudio({ animateCard: true });
    }
  });

  // Time - / + buttons
  els.btnTimeMinus.addEventListener('click', () => {
    if (state.timeStepIndex > 0) {
      state.timeStepIndex -= 1;
      state.styleOffset = 0;
      if (audio) audio.playStepper(-1, state.timeStepIndex / (TIME_STEPS.length - 1));
      renderCookingStudio({ animateCard: true });
    }
  });

  els.btnTimePlus.addEventListener('click', () => {
    if (state.timeStepIndex < TIME_STEPS.length - 1) {
      state.timeStepIndex += 1;
      state.styleOffset = 0;
      if (audio) audio.playStepper(1, state.timeStepIndex / (TIME_STEPS.length - 1));
      renderCookingStudio({ animateCard: true });
    }
  });

  // Try another cooking style for current settings
  els.btnAltStyle.addEventListener('click', () => {
    state.styleOffset += 1;
    if (audio) audio.playAltStyle();
    renderCookingStudio({ animateCard: true });
  });

  syncAudioMood();
  setupMobilePWA();
  setupAndroidBackButton();
}

function setupAndroidBackButton() {
  const capApp =
    window.Capacitor &&
    window.Capacitor.Plugins &&
    window.Capacitor.Plugins.App;

  if (!capApp || typeof capApp.addListener !== 'function') return;

  capApp.addListener('backButton', () => {
    if (state.openPicker) {
      state.openPicker = null;
      CATEGORIES.forEach((c) => renderCategory(c));
      return;
    }
    if (state.screen === 2) {
      goToScreen(1);
      return;
    }
    if (typeof capApp.exitApp === 'function') {
      capApp.exitApp();
    }
  });
}

function setupMobilePWA() {
  const isCapacitor = Boolean(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  const isStandalone =
    isCapacitor ||
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  // Register offline Service Worker on HTTPS or localhost (never inside Capacitor/file://)
  const canUseSW =
    !isCapacitor &&
    'serviceWorker' in navigator &&
    (location.protocol === 'https:' ||
      location.hostname === 'localhost' ||
      location.hostname === '127.0.0.1');

  if (canUseSW) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }

  if (isStandalone || !els.installBar) return;

  let dismissed = false;
  try {
    dismissed = sessionStorage.getItem('yumspin_install_dismissed') === '1';
  } catch (_) {}
  if (dismissed) return;

  let deferredPrompt = null;

  els.btnDismissInstall.addEventListener('click', () => {
    els.installBar.hidden = true;
    try {
      sessionStorage.setItem('yumspin_install_dismissed', '1');
    } catch (_) {}
  });

  // Android / Chrome install prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    els.installBarText.textContent = 'Install YumSpin on your phone for offline use';
    els.btnInstallApp.hidden = false;
    els.installBar.hidden = false;
  });

  els.btnInstallApp.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    els.installBar.hidden = true;
  });

  window.addEventListener('appinstalled', () => {
    els.installBar.hidden = true;
  });

  // iOS Safari Add-to-Home-Screen tip
  const ua = navigator.userAgent || '';
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
  if (isIOS && isSafari) {
    els.installBarText.textContent = 'Install on iPhone: tap Share ⬆ then "Add to Home Screen"';
    els.btnInstallApp.hidden = true;
    els.installBar.hidden = false;
  }
}

init();
})(window.YumSpin);
