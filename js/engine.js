(function (ns) {
const { CALORIE_TIERS, COMPLEXITY_META } = ns;

const STEP_ART = {
  prep: 'assets/images/steps/step_prep.jpg',
  steam: 'assets/images/steps/step_steam.jpg',
  broth: 'assets/images/steps/step_broth.jpg',
  sear: 'assets/images/steps/step_sear.jpg',
  roast: 'assets/images/steps/step_roast.jpg',
  sauce: 'assets/images/steps/step_sauce.jpg',
  plateBowl: 'assets/images/steps/step_plate_bowl.jpg',
  plateDish: 'assets/images/steps/step_plate_dish.jpg',
};

/**
 * Get the calorie tier object for a slider score (0..100).
 */
function getCalorieTier(score) {
  const clamped = Math.max(0, Math.min(100, Number(score) || 0));
  return (
    CALORIE_TIERS.find((t) => clamped >= t.min && clamped <= t.max) ||
    CALORIE_TIERS[1]
  );
}

/**
 * Compute smooth total calories and macros based on selected trio + calorie slider + method richness.
 */
function calculateNutrition({ carb, veggie, protein, calorieScore, methodExtraKcal = 0 }) {
  const tier = getCalorieTier(calorieScore);
  const progressInTier =
    (calorieScore - tier.min) / Math.max(1, tier.max - tier.min);

  const [minExtra, maxExtra] = tier.extraKcalRange;
  const tierExtra = minExtra + progressInTier * (maxExtra - minExtra);

  // Subtle portion scaling between Monk Mode (0.85x carb) and Deluxe (1.15x carb)
  const carbMultiplier = 0.85 + (calorieScore / 100) * 0.3;
  const baseKcal =
    carb.baseKcal * carbMultiplier + veggie.baseKcal + protein.baseKcal;

  const totalKcal = Math.round((baseKcal + tierExtra + methodExtraKcal) / 5) * 5;
  const proteinG = Math.round(carb.proteinG + veggie.proteinG + protein.proteinG);
  const carbsG = Math.round(carb.carbsG * carbMultiplier + veggie.carbsG + protein.carbsG);
  const fatG = Math.round(
    carb.fatG + veggie.fatG + protein.fatG + tier.fatAddedG + (methodExtraKcal > 0 ? 3 : 0)
  );

  return { totalKcal, proteinG, carbsG, fatG, tier };
}

/**
 * Cooking method library covering complexity 1..5 and time 10..45 min.
 * Every step uses short, simple wording + a matching kawaii step illustration.
 */
const COOKING_METHODS = [
  {
    id: 'quick_steam_bowl',
    name: 'Express Steam Bowl',
    icon: '💨',
    plateStyle: 'bowl',
    plateLabel: 'Cozy Bowl',
    idealComplexity: 1,
    idealTime: 10,
    extraKcal: 0,
    buildTitle: ({ carb, veggie, protein, tier }) => {
      const prefix =
        tier.id === 'economy'
          ? 'Clean & Light'
          : tier.id === 'deluxe'
          ? 'Loaded Instant'
          : '10-Minute';
      return `${prefix} ${protein.name} & ${veggie.name} ${carb.dishNoun}`;
    },
    buildDesc: ({ carb, veggie, protein }) =>
      `Fast, zero-stress bowl with warm ${carb.name.toLowerCase()}, tender ${veggie.name.toLowerCase()}, and ${protein.name.toLowerCase()}.`,
    buildSteps: ({ carb, veggie, protein, tier }) => [
      {
        title: `Warm ${carb.name}`,
        text: carb.quickPrep,
        art: STEP_ART.steam,
        badge: carb.image,
        plateRole: 'carb',
      },
      {
        title: `Steam ${veggie.name}`,
        text: veggie.quickCook,
        art: STEP_ART.steam,
        badge: veggie.image,
        plateRole: 'veggie',
      },
      {
        title: `Cook ${protein.name}`,
        text: tier.id === 'deluxe' ? protein.panCook : protein.quickCook,
        art: tier.id === 'deluxe' ? STEP_ART.sear : STEP_ART.steam,
        badge: protein.image,
        plateRole: 'protein',
      },
      {
        title: 'Bowl & Drizzle',
        text: `Pile into a bowl and drizzle with ${tier.shortSauce}.`,
        art: STEP_ART.plateBowl,
        badge: null,
        plateRole: 'finish',
      },
    ],
    tip: ({ tier }) =>
      tier.id === 'economy'
        ? 'Steaming keeps textures crisp with almost zero oil.'
        : 'Add sauce right before eating so flavors pop.',
  },
  {
    id: 'one_pot_poach',
    name: 'Cozy Broth Bowl',
    icon: '🥣',
    plateStyle: 'bowl',
    plateLabel: 'Broth Bowl',
    idealComplexity: 1,
    idealTime: 15,
    extraKcal: 10,
    buildTitle: ({ carb, veggie, protein, tier }) =>
      `${tier.id === 'deluxe' ? 'Rich Umami' : 'Cozy Broth'} ${protein.name}, ${veggie.name} & ${carb.name}`,
    buildDesc: ({ carb, veggie, protein }) =>
      `Everything simmers gently in one pot so ${carb.name.toLowerCase()}, ${veggie.name.toLowerCase()}, and ${protein.name.toLowerCase()} soak up warm broth.`,
    buildSteps: ({ carb, veggie, protein, tier }) => [
      {
        title: 'Simmer Broth',
        text: 'Heat 1.5 cups broth (or water + soy + garlic) to a gentle bubble.',
        art: STEP_ART.broth,
        badge: null,
        plateRole: 'sauce',
      },
      {
        title: `Add ${carb.name}`,
        text: carb.simmerPrep,
        art: STEP_ART.broth,
        badge: carb.image,
        plateRole: 'carb',
      },
      {
        title: `Cook ${veggie.name} & ${protein.name}`,
        text: `Add ${veggie.cut} (${veggie.name.toLowerCase()}) and ${lowercaseFirst(protein.quickCook)}`,
        art: STEP_ART.broth,
        badge: protein.image,
        plateRole: 'protein',
        alsoRoles: ['veggie'],
      },
      {
        title: 'Ladle & Top',
        text: `Pour into a deep bowl and finish with ${tier.shortSauce}.`,
        art: STEP_ART.plateBowl,
        badge: null,
        plateRole: 'finish',
      },
    ],
    tip: () =>
      'Keep broth at a gentle simmer so your protein stays super tender.',
  },
  {
    id: 'fast_stir_fry',
    name: 'One-Pan Stir-Fry',
    icon: '🍳',
    plateStyle: 'skillet',
    plateLabel: 'Sizzling Skillet',
    idealComplexity: 2,
    idealTime: 15,
    extraKcal: 20,
    buildTitle: ({ carb, veggie, protein, tier }) => {
      const style =
        tier.id === 'economy'
          ? 'Light Wok'
          : tier.id === 'deluxe'
          ? 'Sizzling Garlic-Butter'
          : 'Weeknight';
      return `${style} ${veggie.name} & ${protein.name} ${carb.skilletNoun}`;
    },
    buildDesc: ({ carb, veggie, protein }) =>
      `One hot pan, big aroma — crisp ${carb.name.toLowerCase()}, ${veggie.name.toLowerCase()}, and ${protein.name.toLowerCase()} in minutes.`,
    buildSteps: ({ carb, veggie, protein, tier }) => [
      {
        title: `Prep ${carb.name}`,
        text: `${carb.panPrep} Keep ${veggie.cut} ready.`,
        art: STEP_ART.prep,
        badge: carb.image,
        plateRole: 'carb',
      },
      {
        title: `Sear ${protein.name}`,
        text: `Heat pan with ${tier.shortOil}. ${tier.id === 'deluxe' ? protein.deluxeCook : protein.panCook}`,
        art: STEP_ART.sear,
        badge: protein.image,
        plateRole: 'protein',
      },
      {
        title: `Sizzle ${veggie.name}`,
        text: veggie.panCook,
        art: STEP_ART.sear,
        badge: veggie.image,
        plateRole: 'veggie',
      },
      {
        title: 'Toss & Serve',
        text: `Toss everything 1 min with ${tier.shortSauce}, then plate hot.`,
        art: STEP_ART.plateBowl,
        badge: null,
        plateRole: 'finish',
      },
    ],
    tip: () =>
      'Give food a moment of stillness in the pan for golden crispy edges.',
  },
  {
    id: 'cozy_simmer_skillet',
    name: 'Saucy One-Pan Skillet',
    icon: '🥘',
    plateStyle: 'skillet',
    plateLabel: 'Saucy Skillet',
    idealComplexity: 2,
    idealTime: 20,
    extraKcal: 25,
    buildTitle: ({ carb, veggie, protein, tier }) =>
      `${tier.id === 'economy' ? 'Light Herb' : 'Saucy Garlic'} ${protein.name} & ${veggie.name} ${carb.skilletNoun}`,
    buildDesc: ({ carb, veggie, protein }) =>
      `Cozy pan sauce coats ${carb.name.toLowerCase()}, ${veggie.name.toLowerCase()}, and ${protein.name.toLowerCase()} in one skillet.`,
    buildSteps: ({ carb, veggie, protein, tier }) => [
      {
        title: `Start ${carb.name}`,
        text: carb.quickPrep,
        art: STEP_ART.steam,
        badge: carb.image,
        plateRole: 'carb',
      },
      {
        title: `Brown ${protein.name}`,
        text: `Warm ${tier.shortOil} with garlic. ${protein.panCook}`,
        art: STEP_ART.sear,
        badge: protein.image,
        plateRole: 'protein',
      },
      {
        title: `Simmer ${veggie.name}`,
        text: `${veggie.simmerCook} Add 3 tbsp broth + ${tier.shortSauce}.`,
        art: STEP_ART.sauce,
        badge: veggie.image,
        plateRole: 'veggie',
        alsoRoles: ['sauce'],
      },
      {
        title: 'Fold & Plate',
        text: `Fold ${carb.name.toLowerCase()} into the glossy pan sauce and serve.`,
        art: STEP_ART.plateDish,
        badge: null,
        plateRole: 'finish',
      },
    ],
    tip: () =>
      'A splash of broth lifts browned bits from the pan for instant extra flavor.',
  },
  {
    id: 'sheet_pan_roast',
    name: 'Hands-Off Sheet Pan',
    icon: '🔥',
    plateStyle: 'bake',
    plateLabel: 'Roasted Plate',
    idealComplexity: 2,
    idealTime: 30,
    extraKcal: 20,
    buildTitle: ({ carb, veggie, protein, tier }) =>
      `${tier.id === 'deluxe' ? 'Golden Crispy' : 'Caramelized'} Sheet-Pan ${protein.name}, ${veggie.name} & ${carb.name}`,
    buildDesc: ({ carb, veggie, protein }) =>
      `Let the oven roast ${carb.name.toLowerCase()}, ${veggie.name.toLowerCase()}, and ${protein.name.toLowerCase()} golden on one lined tray.`,
    buildSteps: ({ carb, veggie, protein, tier }) => [
      {
        title: `Tray ${carb.name}`,
        text: `Heat oven to 425°F (220°C). ${carb.roastPrep}`,
        art: STEP_ART.roast,
        badge: carb.image,
        plateRole: 'carb',
      },
      {
        title: `Add ${veggie.name}`,
        text: `Arrange ${veggie.cut} on the tray with ${tier.shortOil}. ${veggie.roastCook}`,
        art: STEP_ART.roast,
        badge: veggie.image,
        plateRole: 'veggie',
      },
      {
        title: `Roast ${protein.name}`,
        text: `${protein.roastCook}${protein.id === 'egg' ? ' Keep yolks jammy.' : protein.id === 'shrimp' ? ' Add near the end.' : ''}`,
        art: STEP_ART.roast,
        badge: protein.image,
        plateRole: 'protein',
      },
      {
        title: 'Drizzle & Serve',
        text: `Plate straight off the tray and drizzle with ${tier.shortSauce}.`,
        art: STEP_ART.plateDish,
        badge: null,
        plateRole: 'finish',
      },
    ],
    tip: () =>
      'Give pieces breathing room on the tray so they crisp instead of steaming.',
  },
  {
    id: 'wok_glaze_toss',
    name: 'High-Heat Glazed Sear',
    icon: '🥢',
    plateStyle: 'bowl',
    plateLabel: 'Glazed Bowl',
    idealComplexity: 3,
    idealTime: 20,
    extraKcal: 30,
    buildTitle: ({ carb, veggie, protein, tier }) =>
      `${tier.id === 'economy' ? 'Citrus-Ginger' : 'Sticky Glazed'} ${protein.savoryWord} & ${veggie.flavorWord} ${carb.dishNoun}`,
    buildDesc: () =>
      'Sear each part separately for peak crunch, then coat in a bubbling glossy glaze.',
    buildSteps: ({ carb, veggie, protein, tier }) => [
      {
        title: 'Whisk the Glaze',
        text: `Mix ${tier.shortSauce} with 2 tbsp water (plus a pinch of cornstarch).`,
        art: STEP_ART.sauce,
        badge: null,
        plateRole: 'sauce',
      },
      {
        title: `Crisp ${carb.name}`,
        text: carb.panPrep,
        art: STEP_ART.sear,
        badge: carb.image,
        plateRole: 'carb',
      },
      {
        title: `Char ${veggie.name}`,
        text: `${veggie.panCook} Set aside on a warm plate.`,
        art: STEP_ART.sear,
        badge: veggie.image,
        plateRole: 'veggie',
      },
      {
        title: `Sear ${protein.name}`,
        text: tier.id === 'economy' ? protein.panCook : protein.deluxeCook,
        art: STEP_ART.sear,
        badge: protein.image,
        plateRole: 'protein',
      },
      {
        title: 'Glaze & Bowl',
        text: 'Bubble the glaze 30 sec, toss everything to coat, and serve!',
        art: STEP_ART.plateBowl,
        badge: null,
        plateRole: 'finish',
      },
    ],
    tip: () =>
      'Mixing your sauce first keeps high-heat cooking totally stress-free.',
  },
  {
    id: 'velvety_pan_emulsion',
    name: 'Velvety Pan-Sauce Toss',
    icon: '✨',
    plateStyle: 'bowl',
    plateLabel: 'Silky Bowl',
    idealComplexity: 3,
    idealTime: 25,
    extraKcal: 35,
    buildTitle: ({ carb, veggie, protein, tier }) =>
      `${tier.id === 'economy' ? 'Silky Light-Broth' : 'Creamy Garlic'} ${protein.name} & ${veggie.name} ${carb.dishNoun}`,
    buildDesc: ({ carb, veggie, protein }) =>
      `Silky pan sauce hugs ${carb.name.toLowerCase()}, ${veggie.name.toLowerCase()}, and seared ${protein.name.toLowerCase()}.`,
    buildSteps: ({ carb, veggie, protein, tier }) => [
      {
        title: `Cook ${carb.name}`,
        text: `${carb.quickPrep} Save 1/4 cup warm broth or cooking water.`,
        art: STEP_ART.steam,
        badge: carb.image,
        plateRole: 'carb',
      },
      {
        title: `Sear ${protein.name}`,
        text: `${protein.panCook} Rest on a plate.`,
        art: STEP_ART.sear,
        badge: protein.image,
        plateRole: 'protein',
      },
      {
        title: `Sauté ${veggie.name}`,
        text: `${veggie.panCook} Add sliced garlic until fragrant.`,
        art: STEP_ART.sear,
        badge: veggie.image,
        plateRole: 'veggie',
      },
      {
        title: 'Swirl Silky Sauce',
        text: `Lower heat and swirl in saved liquid + ${tier.shortSauce}.`,
        art: STEP_ART.sauce,
        badge: null,
        plateRole: 'sauce',
      },
      {
        title: 'Toss & Plate',
        text: `Fold in ${carb.name.toLowerCase()}, top with ${protein.name.toLowerCase()}, and crack black pepper.`,
        art: STEP_ART.plateBowl,
        badge: null,
        plateRole: 'finish',
      },
    ],
    tip: () =>
      'Turn heat down before swirling the sauce so it turns extra glossy.',
  },
  {
    id: 'crispy_charred_bowl',
    name: 'Crispy Texture Bowl',
    icon: '🥣',
    plateStyle: 'bowl',
    plateLabel: 'Layered Bowl',
    idealComplexity: 4,
    idealTime: 30,
    extraKcal: 35,
    buildTitle: ({ carb, veggie, protein, tier }) =>
      `${tier.id === 'deluxe' ? 'Deluxe' : 'Artisan'} Crispy ${carb.name}, ${veggie.flavorWord} & ${protein.savoryWord}`,
    buildDesc: ({ carb, veggie, protein }) =>
      `Three bold textures: crunchy ${carb.name.toLowerCase()}, smoky ${veggie.name.toLowerCase()}, and seared ${protein.name.toLowerCase()}.`,
    buildSteps: ({ carb, veggie, protein, tier }) => [
      {
        title: `Crisp ${carb.name}`,
        text: `${carb.panPrep} Press flat 2 min for crunchy golden bits.`,
        art: STEP_ART.sear,
        badge: carb.image,
        plateRole: 'carb',
      },
      {
        title: `Char ${veggie.name}`,
        text: veggie.panCook,
        art: STEP_ART.sear,
        badge: veggie.image,
        plateRole: 'veggie',
      },
      {
        title: `Sear ${protein.name}`,
        text: tier.id === 'economy' ? protein.panCook : protein.deluxeCook,
        art: STEP_ART.sear,
        badge: protein.image,
        plateRole: 'protein',
      },
      {
        title: 'Warm Aromatics',
        text: `Sizzle garlic & scallions briefly in ${tier.shortOil}.`,
        art: STEP_ART.sauce,
        badge: null,
        plateRole: 'sauce',
      },
      {
        title: 'Layer & Drizzle',
        text: `Stack crispy ${carb.name.toLowerCase()}, ${veggie.name.toLowerCase()}, and ${protein.name.toLowerCase()} with ${tier.shortSauce}.`,
        art: STEP_ART.plateBowl,
        badge: null,
        plateRole: 'finish',
      },
    ],
    tip: () =>
      'Pairing crunchy toasted bites with bright sauce makes every bite pop.',
  },
  {
    id: 'oven_gratin_bake',
    name: 'Bubbling Oven Bake',
    icon: '🧀',
    plateStyle: 'bake',
    plateLabel: 'Oven Bake',
    idealComplexity: 4,
    idealTime: 40,
    extraKcal: 40,
    buildTitle: ({ carb, veggie, protein, tier }) =>
      `${tier.id === 'economy' ? 'Light Herb-Crusted' : 'Golden Bubbling'} ${protein.name} & ${veggie.name} ${carb.bakeNoun}`,
    buildDesc: ({ carb, veggie, protein }) =>
      `Golden-crusted oven bake bringing ${carb.name.toLowerCase()}, ${veggie.name.toLowerCase()}, and ${protein.name.toLowerCase()} together.`,
    buildSteps: ({ carb, veggie, protein, tier }) => [
      {
        title: `Base ${carb.name}`,
        text: `Heat oven to 400°F (205°C). ${carb.roastPrep}`,
        art: STEP_ART.roast,
        badge: carb.image,
        plateRole: 'carb',
      },
      {
        title: `Pre-Sear ${veggie.name}`,
        text: `${veggie.panCook} Mix into the baking dish.`,
        art: STEP_ART.sear,
        badge: veggie.image,
        plateRole: 'veggie',
      },
      {
        title: 'Pour Sauce Base',
        text: `Add 1/3 cup broth and half of your ${tier.shortSauce}.`,
        art: STEP_ART.sauce,
        badge: null,
        plateRole: 'sauce',
      },
      {
        title: `Nestle ${protein.name}`,
        text: protein.roastCook,
        art: STEP_ART.roast,
        badge: protein.image,
        plateRole: 'protein',
      },
      {
        title: 'Bake Golden & Rest',
        text: 'Bake 18–20 min until bubbly (broil 2 min for crust), rest 3 min, serve!',
        art: STEP_ART.plateDish,
        badge: null,
        plateRole: 'finish',
      },
    ],
    tip: () =>
      'Rest 3 minutes out of the oven so every scoop holds together neatly.',
  },
  {
    id: 'chef_tasting_plate',
    name: "Chef's Tasting Plate",
    icon: '👨‍🍳',
    plateStyle: 'plate',
    plateLabel: 'Bistro Plate',
    idealComplexity: 5,
    idealTime: 45,
    extraKcal: 45,
    buildTitle: ({ carb, veggie, protein }) =>
      `Bistro ${protein.savoryWord} over Toasted ${carb.name} & ${veggie.flavorWord}`,
    buildDesc: ({ carb, veggie, protein }) =>
      `Restaurant plating at home with garlic chips, reduced glaze, ${carb.name.toLowerCase()}, ${veggie.name.toLowerCase()}, and ${protein.name.toLowerCase()}.`,
    buildSteps: ({ carb, veggie, protein, tier }) => [
      {
        title: 'Toast Garlic Chips',
        text: 'Crisp thin garlic slices gently until pale gold. Save the oil!',
        art: STEP_ART.prep,
        badge: null,
        plateRole: 'prep',
      },
      {
        title: `Toast ${carb.name}`,
        text: `${carb.panPrep} Finish with a drop of garlic oil.`,
        art: STEP_ART.sear,
        badge: carb.image,
        plateRole: 'carb',
      },
      {
        title: `Roast ${veggie.name}`,
        text: `${veggie.roastCook} Finish with a squeeze of lemon.`,
        art: STEP_ART.roast,
        badge: veggie.image,
        plateRole: 'veggie',
      },
      {
        title: `Master ${protein.name}`,
        text: `${tier.id === 'economy' ? protein.panCook : protein.deluxeCook} Rest 2 min.`,
        art: STEP_ART.sear,
        badge: protein.image,
        plateRole: 'protein',
      },
      {
        title: 'Reduce Pan Glaze',
        text: `Simmer 1/4 cup broth + ${tier.shortSauce} until thick and glossy.`,
        art: STEP_ART.sauce,
        badge: null,
        plateRole: 'sauce',
      },
      {
        title: 'Bistro Plate & Crown',
        text: 'Swoosh glaze, layer everything neatly, and top with crispy garlic chips.',
        art: STEP_ART.plateDish,
        badge: null,
        plateRole: 'finish',
      },
    ],
    tip: () =>
      'A tiny squeeze of lemon at the very end wakes up every flavor.',
  },
];

function lowercaseFirst(str) {
  if (!str) return '';
  return str.charAt(0).toLowerCase() + str.slice(1);
}

/**
 * Pick the best-matching cooking method for the requested complexity (1..5),
 * time (10..45 min), calorieScore (0..100), and styleOffset (for "Try another style").
 */
function generateRecipe({
  carb,
  veggie,
  protein,
  calorieScore,
  complexity,
  timeMin,
  styleOffset = 0,
}) {
  const tier = getCalorieTier(calorieScore);

  const scored = COOKING_METHODS.map((method) => {
    const compDiff = Math.abs(method.idealComplexity - complexity);
    const timeDiff = Math.abs(method.idealTime - timeMin) / 10;

    let tierBonus = 0;
    if (tier.id === 'economy' && method.extraKcal <= 20) tierBonus = -0.35;
    if (tier.id === 'deluxe' && method.extraKcal >= 25) tierBonus = -0.35;

    const score = compDiff * 2.2 + timeDiff * 1.4 + tierBonus;
    return { method, score };
  }).sort((a, b) => a.score - b.score);

  const topCandidates = scored.slice(0, 3);
  const chosen = topCandidates[styleOffset % topCandidates.length].method;

  const nutrition = calculateNutrition({
    carb,
    veggie,
    protein,
    calorieScore,
    methodExtraKcal: chosen.extraKcal,
  });

  const ctx = { carb, veggie, protein, tier, complexity, timeMin };
  const steps = chosen.buildSteps(ctx);

  // If user pushed complexity higher or time longer, add one short craft/marinate step
  if (complexity > chosen.idealComplexity && steps.length < 6) {
    steps.splice(steps.length - 1, 0, {
      title: 'Toast Crunch Topping',
      text: 'Dry-toast sesame seeds or sliced garlic 60 sec for extra crunch.',
      art: STEP_ART.sauce,
      badge: null,
      plateRole: 'sauce',
    });
  } else if (timeMin > chosen.idealTime + 8 && steps.length < 6) {
    steps.splice(0, 0, {
      title: `Quick Marinate ${protein.name}`,
      text: `Toss ${protein.name.toLowerCase()} with salt + 1 spoon of sauce for 8 min.`,
      art: STEP_ART.prep,
      badge: protein.image,
      plateRole: 'prep',
    });
  }

  return {
    methodId: chosen.id,
    methodName: chosen.name,
    methodIcon: chosen.icon,
    plateStyle: chosen.plateStyle,
    plateLabel: chosen.plateLabel,
    plateArt: chosen.plateStyle === 'bowl' ? STEP_ART.plateBowl : STEP_ART.plateDish,
    title: chosen.buildTitle(ctx),
    description: chosen.buildDesc(ctx),
    steps,
    boosters: tier.boosters,
    tip: chosen.tip(ctx),
    complexity,
    complexityLabel: COMPLEXITY_META[complexity]?.label || 'Easy',
    timeMin,
    nutrition,
  };
}

ns.getCalorieTier = getCalorieTier;
ns.calculateNutrition = calculateNutrition;
ns.generateRecipe = generateRecipe;
})(window.YumSpin);
