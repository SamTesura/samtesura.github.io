/**
 * ADC Threat - Enhanced Threat Analysis v3.0
 * Patch-independent threat analysis system
 * Data sourced from wikilol (wiki.leagueoflegends.com)
 * Focus: Cooldowns and Champion Understanding
 */

// Reference patch version - updated automatically by GitHub Actions
// The actual patch used in the app is fetched dynamically from Riot's API

const CONFIG = {
  PATCH_API: 'https://ddragon.leagueoflegends.com/api/versions.json',
  CHAMPION_API: 'https://ddragon.leagueoflegends.com/cdn/{version}/data/en_US/champion.json',
  CHAMPION_DETAIL_API: 'https://ddragon.leagueoflegends.com/cdn/{version}/data/en_US/champion/{championId}.json',
  CHAMPION_IMG: 'https://ddragon.leagueoflegends.com/cdn/{version}/img/champion/{championId}.png',
  WIKILOL_CHAMPION_URL: 'https://wiki.leagueoflegends.com/en-us/{championName}'
};

let state = {
  patch: null,
  champions: {},
  championsSummary: {}, // Threat data from champions-summary.json
  selectedADC: null,
  enemies: [],
  allies: []
};

// WeakMap to store delete button references for input elements
// This avoids polluting DOM nodes and prevents naming collisions
const deleteButtonRefs = new WeakMap();

// CC Classification based on wikilol
// Reference: https://wiki.leagueoflegends.com/en-us/Types_of_Crowd_Control
// Reference: https://wiki.leagueoflegends.com/en-us/Cleanse
const CC_TYPES = {
  // Hard CC - NON-Cleansable (Cleanse cannot remove these)
  // Airborne: Disabling effect can be removed but forced movement cannot  // Nearsight: Cannot be cleansed at all
  HARD_NON_CLEANSABLE: {
    types: ['airborne', 'knock', 'pull', 'nearsight'],
    description: 'Airborne: Disabling can be removed but not forced movement. Nearsight: Cannot be cleansed.'
  },
  // Soft CC - Cleansable (Can be removed by Cleanse/QSS)
  // Includes suspension (Nami's special stun), all common stuns, roots, slows, etc.
  SOFT_CLEANSABLE: {
    types: ['stun', 'suspension', 'root', 'snare', 'slow', 'charm', 'fear', 'taunt', 'silence', 
            'blind', 'disarm', 'cripple', 'sleep', 'drowsy'],
    description: 'Can be removed by Cleanse or QSS'
  },
  // Suppression - Special case (Only QSS can remove, not Cleanse)
  SUPPRESSION: {
    types: ['suppression', 'suppress'],
    description: 'Cannot be removed by Cleanse. Only QSS can remove.'
  }
};

// Threat labels for enemy champions (ADC perspective)
const THREAT_LABELS = {
  // Mobility threats
  DASH: { label: 'Mobility', severity: 'high', icon: '🏃' },
  BLINK: { label: 'Blink', severity: 'high', icon: '⚡' },
  STEALTH: { label: 'Stealth', severity: 'high', icon: '👻' },
  
  // Damage threats
  BURST: { label: 'Burst', severity: 'high', icon: '💥' },
  DPS: { label: 'DPS', severity: 'medium', icon: '🔥' },
  POKE: { label: 'Poke', severity: 'medium', icon: '🎯' },
  
  // Utility threats
  SHIELD: { label: 'Shield', severity: 'low', icon: '🛡️' },
  HEAL: { label: 'Sustain', severity: 'low', icon: '💚' }
};

// Normalize text for search matching (removes special characters and spaces)
function normalizeForSearch(text) {
  return text.toLowerCase().replace(/['\s\-\.]/g, '');
}

// Initialize
async function init() {
  try {
    state.patch = await fetchPatch();
    state.champions = await fetchChampions(state.patch);
    state.championsSummary = await fetchChampionsSummary();
    setupPatchNotesLink();
    setupADCInput();
    createInputs();
    setupListeners();
    updateUIState();
  } catch (error) {
    console.error('Init failed:', error);
    alert('Failed to load champion data. Please refresh.');
  }
}

async function fetchPatch() {
  const res = await fetch(CONFIG.PATCH_API);
  const versions = await res.json();
  return versions[0];
}

async function fetchChampions(patch) {
  const url = CONFIG.CHAMPION_API.replace('{version}', patch);
  const res = await fetch(url);
  const data = await res.json();
  return data.data;
}

async function fetchChampionsSummary() {
  try {
    const res = await fetch('./champions-summary.json');
    const data = await res.json();
    // Create a map from champion name to champion data
    const map = {};
    const championsList = data.champions || data; // Support both old and new format
    championsList.forEach(champ => {
      map[champ.name] = champ;
      // Also map by slug for easier lookup
      map[champ.slug] = champ;
    });
    return map;
  } catch (error) {
    console.error('Failed to load champions-summary.json:', error);
    return {};
  }
}

async function fetchChampionDetail(championId) {
  const url = CONFIG.CHAMPION_DETAIL_API
    .replace('{version}', state.patch)
    .replace('{championId}', championId);
  const res = await fetch(url);
  const data = await res.json();
  return data.data[championId];
}

function setupPatchNotesLink() {
  const link = document.getElementById('patchNotesLink');
  if (link && state.patch) {
    const parts = state.patch.split('.');
    let majorVersion = parseInt(parts[0]);
    const minorVersion = parts[1];

    // Riot switched to year-based numbering in 2025
    // API returns 15.x but patch notes use 25.x (15 + 10 = 25 for year 2025)
    if (majorVersion >= 15) {
      majorVersion += 10;
    }

    const patchVersion = `${majorVersion}-${minorVersion}`;
    const patchNotesUrl = `https://www.leagueoflegends.com/en-us/news/game-updates/patch-${patchVersion}-notes/`;
    link.href = patchNotesUrl;
    link.textContent = `📋 Patch ${patchVersion} Notes`;
  }
}

function setupADCInput() {
  const input = document.getElementById('adcInput');
  
  input.addEventListener('input', (e) => handleADCInput(e.target));
  input.addEventListener('focus', (e) => handleADCInput(e.target));
  input.addEventListener('blur', () => {
    setTimeout(() => clearADCAutocomplete(), 300);
  });
}

function handleADCInput(input) {
  const query = input.value.toLowerCase().trim();
  const normalizedQuery = normalizeForSearch(query);
  
  const adcIds = ADC_LIST.getAllADCs();
  const matches = adcIds
    .map(id => state.champions[id])
    .filter(c => {
      if (!c) return false;
      if (!query) return true;
      const normalizedName = normalizeForSearch(c.name);
      return normalizedName.includes(normalizedQuery) || c.name.toLowerCase().includes(query);
    })
    .sort((a, b) => {
      if (!query) return a.name.localeCompare(b.name);
      
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      const aNormalized = normalizeForSearch(a.name);
      const bNormalized = normalizeForSearch(b.name);
      
      const aStarts = aNormalized.startsWith(normalizedQuery) || aName.startsWith(query);
      const bStarts = bNormalized.startsWith(normalizedQuery) || bName.startsWith(query);
      
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return aName.localeCompare(bName);
    });
  
  showADCAutocomplete(input, matches);
}

function showADCAutocomplete(input, champions) {
  clearADCAutocomplete();
  
  if (champions.length === 0) return;
  
  const container = document.getElementById('adcAutocomplete');
  const dropdown = document.createElement('div');
  dropdown.className = 'autocomplete';
  
  champions.forEach(champ => {
    const item = document.createElement('div');
    item.className = 'autocomplete-item';
    
    const img = document.createElement('img');
    img.src = CONFIG.CHAMPION_IMG
      .replace('{version}', state.patch)
      .replace('{championId}', champ.id);
    
    const name = document.createElement('span');
    name.textContent = champ.name;
    
    item.appendChild(img);
    item.appendChild(name);
    
    item.addEventListener('mousedown', (e) => {
      e.preventDefault();
      selectADC(champ);
      clearADCAutocomplete();
    });
    
    dropdown.appendChild(item);
  });
  
  container.appendChild(dropdown);
}

function clearADCAutocomplete() {
  const container = document.getElementById('adcAutocomplete');
  if (container) container.innerHTML = '';
}

function selectADC(champion) {
  state.selectedADC = champion;
  
  const input = document.getElementById('adcInput');
  input.value = champion.name;
  input.classList.add('selected');
  
  const selectedDiv = document.getElementById('selectedADC');
  selectedDiv.innerHTML = '';
  
  const championLink = document.createElement('a');
  championLink.href = CONFIG.WIKILOL_CHAMPION_URL.replace('{championName}', champion.name.replace(/\s+/g, '_'));
  championLink.target = '_blank';
  championLink.rel = 'noopener noreferrer';
  championLink.title = `View ${champion.name} on wikilol`;
  championLink.style.display = 'inline-flex';
  championLink.style.alignItems = 'center';
  championLink.style.gap = '8px';
  championLink.style.textDecoration = 'none';
  championLink.style.color = 'inherit';
  
  const img = document.createElement('img');
  img.src = CONFIG.CHAMPION_IMG
    .replace('{version}', state.patch)
    .replace('{championId}', champion.id);
  img.className = 'selected-champ-img';
  
  const name = document.createElement('span');
  name.textContent = champion.name;
  name.className = 'selected-champ-name';
  
  championLink.appendChild(img);
  championLink.appendChild(name);
  selectedDiv.appendChild(championLink);
  
  updateUIState();
  updateTable();
}

function updateUIState() {
  const warning = document.getElementById('adcWarning');
  const teamsContainer = document.getElementById('teamsContainer');
  const inputs = document.querySelectorAll('#enemyInputs input, #allyInputs input');
  
  if (!state.selectedADC) {
    warning.classList.remove('hidden');
    teamsContainer.classList.add('disabled');
    inputs.forEach(input => input.disabled = true);
  } else {
    warning.classList.add('hidden');
    teamsContainer.classList.remove('disabled');
    inputs.forEach(input => input.disabled = false);
  }
}

function createInputs() {
  const enemyContainer = document.getElementById('enemyInputs');
  const allyContainer = document.getElementById('allyInputs');
  
  for (let i = 0; i < 5; i++) {
    const input = createInput('enemy', i);
    enemyContainer.appendChild(input);
  }
  
  for (let i = 0; i < 4; i++) {
    const input = createInput('ally', i);
    allyContainer.appendChild(input);
  }
}

function createInput(team, index) {
  const wrapper = document.createElement('div');
  wrapper.style.position = 'relative';
  wrapper.style.display = 'flex';
  wrapper.style.alignItems = 'center';
  wrapper.style.gap = '4px';

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = `${team === 'enemy' ? 'Enemy' : 'Ally'} ${index + 1}`;
  input.dataset.team = team;
  input.dataset.index = index;
  input.disabled = true;

  // Create delete button (hidden by default)
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-champion-btn';
  deleteBtn.innerHTML = '×';
  deleteBtn.title = 'Remove champion';
  deleteBtn.setAttribute('aria-label', 'Remove champion');
  deleteBtn.addEventListener('click', () => {
    input.value = '';
    removeChampion(team, index);
    updateDeleteButtonVisibility(input);
  });

  // Store delete button reference in WeakMap for efficient lookups
  // This avoids polluting the DOM element and prevents naming collisions
  deleteButtonRefs.set(input, deleteBtn);

  input.addEventListener('input', (e) => handleInput(e.target));
  input.addEventListener('blur', () => {
    setTimeout(() => clearAutocomplete(), 300);
  });

  wrapper.appendChild(input);
  wrapper.appendChild(deleteBtn);
  return wrapper;
}

function handleInput(input) {
  const query = input.value.toLowerCase().trim();

  // Update delete button visibility
  updateDeleteButtonVisibility(input);

  // If input is cleared, remove the champion from state and update table
  if (query.length === 0) {
    clearAutocomplete();
    removeChampion(input.dataset.team, parseInt(input.dataset.index));
    return;
  }

  const normalizedQuery = normalizeForSearch(query);

  const matches = Object.values(state.champions)
    .filter(c => {
      const normalizedName = normalizeForSearch(c.name);
      return normalizedName.includes(normalizedQuery) || c.name.toLowerCase().includes(query);
    })
    .sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      const aNormalized = normalizeForSearch(a.name);
      const bNormalized = normalizeForSearch(b.name);

      const aStarts = aNormalized.startsWith(normalizedQuery) || aName.startsWith(query);
      const bStarts = bNormalized.startsWith(normalizedQuery) || bName.startsWith(query);

      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return aName.localeCompare(bName);
    })
    .slice(0, 5);

  showAutocomplete(input, matches);
}

function showAutocomplete(input, champions) {
  clearAutocomplete();
  
  if (champions.length === 0) return;
  
  const dropdown = document.createElement('div');
  dropdown.className = 'autocomplete';
  dropdown.id = 'autocomplete';
  
  champions.forEach(champ => {
    const item = document.createElement('div');
    item.className = 'autocomplete-item';
    
    const img = document.createElement('img');
    img.src = CONFIG.CHAMPION_IMG
      .replace('{version}', state.patch)
      .replace('{championId}', champ.id);
    
    const name = document.createElement('span');
    name.textContent = champ.name;
    
    item.appendChild(img);
    item.appendChild(name);
    
    item.addEventListener('mousedown', (e) => {
      e.preventDefault();
      input.value = champ.name;
      selectChampion(input.dataset.team, parseInt(input.dataset.index), champ);
      // Update delete button visibility
      updateDeleteButtonVisibility(input);
      clearAutocomplete();
    });
    
    dropdown.appendChild(item);
  });
  
  input.parentElement.appendChild(dropdown);
}

function clearAutocomplete() {
  const existing = document.getElementById('autocomplete');
  if (existing) existing.remove();
}

function updateDeleteButtonVisibility(input) {
  if (!input) return;

  // Retrieve delete button reference from WeakMap
  const deleteBtn = deleteButtonRefs.get(input);
  if (!deleteBtn) return;

  const hasValue = input.value && input.value.trim().length > 0;
  if (hasValue) {
    deleteBtn.classList.add('is-visible');
  } else {
    deleteBtn.classList.remove('is-visible');
  }
}

function selectChampion(team, index, champion) {
  if (team === 'enemy') {
    state.enemies[index] = champion;
  } else {
    state.allies[index] = champion;
  }
  updateTable();
}

function removeChampion(team, index) {
  if (team === 'enemy') {
    state.enemies[index] = undefined;
  } else {
    state.allies[index] = undefined;
  }
  updateTable();
}

function setupListeners() {
  const clearBtn = document.getElementById('clearBtn');
  clearBtn.addEventListener('click', clearAll);
}

function clearAll() {
  // Clear ADC
  state.selectedADC = null;
  const adcInput = document.getElementById('adcInput');
  adcInput.value = '';
  adcInput.classList.remove('selected');
  document.getElementById('selectedADC').innerHTML = '';

  // Clear all champion inputs
  state.enemies = [];
  state.allies = [];

  const inputs = document.querySelectorAll('#enemyInputs input, #allyInputs input');
  inputs.forEach(input => {
    input.value = '';
    input.disabled = true;
    // Hide delete buttons when clearing inputs
    updateDeleteButtonVisibility(input);
  });

  // Update UI
  updateUIState();
  updateTable();
}

async function updateTable() {
  const tbody = document.getElementById('threatBody');
  
  const allChamps = [
    ...state.enemies.filter(c => c),
    ...state.allies.filter(c => c)
  ];
  
  if (!state.selectedADC || allChamps.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty">Select your ADC and add champions to see analysis</td></tr>';
    return;
  }
  
  tbody.innerHTML = '';
  
  const enemyCount = state.enemies.filter(c => c).length;
  
  for (let i = 0; i < allChamps.length; i++) {
    const champ = allChamps[i];
    const isEnemy = i < enemyCount;
    const row = await createRow(champ, isEnemy);
    tbody.appendChild(row);
  }
}

async function createRow(champion, isEnemy) {
  const row = document.createElement('tr');
  
  // Team
  const teamCell = document.createElement('td');
  const teamBadge = document.createElement('span');
  teamBadge.className = `team-badge team-${isEnemy ? 'enemy' : 'ally'}`;
  teamBadge.textContent = isEnemy ? 'Enemy' : 'Ally';
  teamCell.appendChild(teamBadge);
  row.appendChild(teamCell);
  
  // Champion (with wikilol link)
  const champCell = document.createElement('td');
  const champLink = document.createElement('a');
  champLink.href = CONFIG.WIKILOL_CHAMPION_URL.replace('{championName}', champion.name.replace(/\s+/g, '_'));
  champLink.target = '_blank';
  champLink.rel = 'noopener noreferrer';
  champLink.className = 'champ-name';
  champLink.title = `View ${champion.name} on wikilol`;
  
  const img = document.createElement('img');
  img.src = CONFIG.CHAMPION_IMG
    .replace('{version}', state.patch)
    .replace('{championId}', champion.id);
  img.className = 'champ-img';
  
  champLink.appendChild(img);
  champLink.appendChild(document.createTextNode(champion.name));
  champCell.appendChild(champLink);
  row.appendChild(champCell);
  
  // Abilities (loading)
  const abilityCell = document.createElement('td');
  abilityCell.textContent = 'Loading...';
  row.appendChild(abilityCell);
  
  // Threats (loading)
  const threatCell = document.createElement('td');
  threatCell.textContent = 'Loading...';
  row.appendChild(threatCell);
  
  // Understanding (loading)
  const understandingCell = document.createElement('td');
  understandingCell.textContent = 'Loading...';
  row.appendChild(understandingCell);
  
  // Load detailed data asynchronously
  fetchChampionDetail(champion.id).then(detail => {
    populateAbilities(abilityCell, detail, champion);
    populateThreats(threatCell, detail, isEnemy, champion);
    populateUnderstanding(understandingCell, champion, detail, isEnemy);
  });
  
  return row;
}

/**
 * Classify an ability based on summary data and spell description
 * Returns array of classification objects or empty array if no threats found
 */
function classifyAbility(spell, summaryData, abilityIndex, allowFallbackCC = false) {
  let classifications = [];
  let hasAbilitySummary = false;

  // Get threat tags from champions-summary.json if available
  if (summaryData?.abilities?.[abilityIndex]) {
    const threatTags = summaryData.abilities[abilityIndex].threat || [];
    hasAbilitySummary = true;
    // Use manual curation for CC threats (returns array of all tags)
    classifications = classifyThreatTags(threatTags);
  }

  // If no CC threat found, check for non-CC threats from spell description
  if (classifications.length === 0) {
    const descClassification = classifyCC(spell);
    const nonCCThreats = ['Shield', 'Sustain', 'Burst', 'Poke', 'Stealth', 'Mobility'];

    if (descClassification && nonCCThreats.includes(descClassification.ccType)) {
      // Always use non-CC threats from description
      classifications = [descClassification];
    } else if (allowFallbackCC && !hasAbilitySummary) {
      // Only use CC from description if explicitly allowed and no summary data exists
      classifications = [descClassification];
    }
  }

  return classifications;
}

/**
 * Convert threat tags from champions-summary.json to classification format
 * Now uses SPECIFIC CC TYPES from wikilol
 * Returns ARRAY of all matching classifications
 */
function classifyThreatTags(threatTags) {
  if (!threatTags || threatTags.length === 0) return [];

  // Define cleansability for each CC type (from wikilol)
  const ccClassifications = {
    // Airborne - NOT cleansable (forced movement)
    'KNOCKUP': { type: 'hard', ccType: 'Knockup', cleansable: false, qssOnly: false, color: 'hard' },
    'KNOCKBACK': { type: 'hard', ccType: 'Knockback', cleansable: false, qssOnly: false, color: 'hard' },
    'PULL': { type: 'hard', ccType: 'Pull', cleansable: false, qssOnly: false, color: 'hard' },

    // Suppression - NOT cleansable by Cleanse (QSS only)
    'SUPPRESSION': { type: 'suppression', ccType: 'Suppression', cleansable: false, qssOnly: true, color: 'hard' },

    // Nearsight - NOT cleansable
    'NEARSIGHT': { type: 'hard', ccType: 'Nearsight', cleansable: false, qssOnly: false, color: 'hard' },

    // Disabling CC - Cleansable
    'STUN': { type: 'hard', ccType: 'Stun', cleansable: true, color: 'hard' },
    'ROOT': { type: 'hard', ccType: 'Root', cleansable: true, color: 'hard' },
    'SNARE': { type: 'hard', ccType: 'Root', cleansable: true, color: 'hard' },
    'SLEEP': { type: 'hard', ccType: 'Sleep', cleansable: true, color: 'hard' },
    'CHARM': { type: 'hard', ccType: 'Charm', cleansable: true, color: 'hard' },
    'FEAR': { type: 'hard', ccType: 'Fear', cleansable: true, color: 'hard' },
    'TAUNT': { type: 'hard', ccType: 'Taunt', cleansable: true, color: 'hard' },
    'POLYMORPH': { type: 'hard', ccType: 'Polymorph', cleansable: true, color: 'hard' },

    // Impairing CC - Cleansable
    'SLOW': { type: 'soft', ccType: 'Slow', cleansable: true, color: 'soft' },
    'SILENCE': { type: 'soft', ccType: 'Silence', cleansable: true, color: 'soft' },
    'BLIND': { type: 'soft', ccType: 'Blind', cleansable: true, color: 'soft' },
    'DISARM': { type: 'soft', ccType: 'Disarm', cleansable: true, color: 'soft' },
    'GROUNDED': { type: 'soft', ccType: 'Grounded', cleansable: true, color: 'soft' },
    'CRIPPLE': { type: 'soft', ccType: 'Cripple', cleansable: true, color: 'soft' },

    // Non-CC threats - High priority
    'GAP_CLOSE': { type: 'high', ccType: 'Mobility', cleansable: false, color: 'high' },
    'DASH': { type: 'high', ccType: 'Dash', cleansable: false, color: 'high' },
    'STEALTH': { type: 'high', ccType: 'Stealth', cleansable: false, color: 'high' },
    'DODGE': { type: 'high', ccType: 'Dodge', cleansable: false, color: 'high' },
    'PROJECTILE_BLOCK': { type: 'high', ccType: 'Projectile Block', cleansable: false, color: 'high' },
    'UNBREAKABLE_WALL': { type: 'high', ccType: 'Unbreakable Wall', cleansable: false, color: 'high' },
    'BURST': { type: 'high', ccType: 'Burst', cleansable: false, color: 'high' },

    // Non-CC threats - Medium priority
    'SHIELD_PEEL': { type: 'medium', ccType: 'Shield', cleansable: false, color: 'medium' },
    'SHIELD': { type: 'medium', ccType: 'Shield', cleansable: false, color: 'medium' },
    'BREAKABLE_WALL': { type: 'medium', ccType: 'Breakable Wall', cleansable: false, color: 'medium' },
    'REVEAL': { type: 'medium', ccType: 'Reveal', cleansable: false, color: 'medium' },

    // Non-CC threats - Low priority
    'SUSTAIN': { type: 'low', ccType: 'Sustain', cleansable: false, color: 'low' },
    'GHOST': { type: 'low', ccType: 'Ghost', cleansable: false, color: 'low' }
  };

  // Find all matching threats (in priority order)
  const priorityOrder = [
    'SUPPRESSION', 'NEARSIGHT',
    'KNOCKUP', 'KNOCKBACK', 'PULL',
    'STUN', 'ROOT', 'SNARE', 'CHARM', 'FEAR', 'TAUNT', 'SLEEP', 'POLYMORPH',
    'SILENCE', 'BLIND', 'DISARM', 'GROUNDED', 'CRIPPLE', 'SLOW',
    'DODGE', 'PROJECTILE_BLOCK', 'UNBREAKABLE_WALL', 'STEALTH', 'GAP_CLOSE', 'DASH',
    'BREAKABLE_WALL', 'REVEAL', 'SHIELD_PEEL', 'SHIELD',
    'SUSTAIN', 'GHOST'
  ];

  const matchedClassifications = [];
  for (const ccType of priorityOrder) {
    if (threatTags.includes(ccType)) {
      matchedClassifications.push(ccClassifications[ccType]);
    }
  }

  return matchedClassifications;
}

/**
 * Classify CC type based on wikilol standards
 * Reference: https://wiki.leagueoflegends.com/en-us/Types_of_Crowd_Control
 * Reference: https://wiki.leagueoflegends.com/en-us/Cleanse
 */
function classifyCC(spell) {
  const desc = spell.description?.toLowerCase() || '';
  const name = spell.name?.toLowerCase() || '';
  
  // Check for Suppression (special case - only QSS can remove)
  if (desc.includes('suppress') || desc.includes('suppression')) {
    return { 
      type: 'suppression', 
      ccType: 'Suppression', 
      cleansable: false,
      qssOnly: true,
      color: 'hard'
    };
  }
  
  // Check for Hard CC (non-cleansable by Cleanse)
  // Airborne: Disabling effect can be removed but not forced movement
  if (desc.includes('knock') || desc.includes('airborne') || name.includes('knock')) {
    return { 
      type: 'hard', 
      ccType: 'Airborne', 
      cleansable: false,
      color: 'hard',
      note: 'Partial - disabling can be removed, not movement'
    };
  }
  
  if (desc.includes('pull') || desc.includes('drag')) {
    return { 
      type: 'hard', 
      ccType: 'Pull', 
      cleansable: false,
      color: 'hard',
      note: 'Partial - disabling can be removed, not movement'
    };
  }
  
  if (desc.includes('nearsight') || desc.includes('blind zone')) {
    return { 
      type: 'hard', 
      ccType: 'Nearsight', 
      cleansable: false,
      color: 'hard'
    };
  }
  
  // Check for Soft CC (cleansable by Cleanse/QSS)
  if (desc.includes('stun')) {
    return { 
      type: 'soft', 
      ccType: 'Stun', 
      cleansable: true,
      color: 'soft'
    };
  }
  
  if (desc.includes('root') || desc.includes('immobilize') || desc.includes('snare')) {
    return { 
      type: 'soft', 
      ccType: 'Root', 
      cleansable: true,
      color: 'soft'
    };
  }
  
  if (desc.includes('slow')) {
    return { 
      type: 'soft', 
      ccType: 'Slow', 
      cleansable: true,
      color: 'soft'
    };
  }
  
  if (desc.includes('charm')) {
    return { 
      type: 'soft', 
      ccType: 'Charm', 
      cleansable: true,
      color: 'soft'
    };
  }
  
  if (desc.includes('fear') || desc.includes('flee')) {
    return { 
      type: 'soft', 
      ccType: 'Fear', 
      cleansable: true,
      color: 'soft'
    };
  }
  
  if (desc.includes('taunt')) {
    return { 
      type: 'soft', 
      ccType: 'Taunt', 
      cleansable: true,
      color: 'soft'
    };
  }
  
  if (desc.includes('silence')) {
    return { 
      type: 'soft', 
      ccType: 'Silence', 
      cleansable: true,
      color: 'soft'
    };
  }
  
  if (desc.includes('blind')) {
    return { 
      type: 'soft', 
      ccType: 'Blind', 
      cleansable: true,
      color: 'soft'
    };
  }
  
  if (desc.includes('disarm')) {
    return { 
      type: 'soft', 
      ccType: 'Disarm', 
      cleansable: true,
      color: 'soft'
    };
  }
  
  if (desc.includes('cripple') || (desc.includes('attack speed') && desc.includes('reduc'))) {
    return { 
      type: 'soft', 
      ccType: 'Cripple', 
      cleansable: true,
      color: 'soft'
    };
  }
  
  if (desc.includes('sleep') || desc.includes('drowsy')) {
    return { 
      type: 'soft', 
      ccType: 'Sleep', 
      cleansable: true,
      color: 'soft'
    };
  }
  
  // Check for threats (non-CC)
  if (desc.includes('dash') || desc.includes('blink') || desc.includes('leap') || 
      name.includes('dash') || name.includes('leap')) {
    return { 
      type: 'high', 
      ccType: 'Mobility', 
      cleansable: false,
      color: 'high'
    };
  }
  
  if (desc.includes('burst') || (desc.includes('damage') && desc.includes('bonus')) || desc.includes('maximum health') || desc.includes('missing health')) {
    return { 
      type: 'high', 
      ccType: 'Burst', 
      cleansable: false,
      color: 'high'
    };
  }
  
  if (desc.includes('stealth') || desc.includes('invisible') || desc.includes('camouflage')) {
    return { 
      type: 'high', 
      ccType: 'Stealth', 
      cleansable: false,
      color: 'high'
    };
  }
  
  // Check for medium threats
  if (desc.includes('shield')) {
    return { 
      type: 'medium', 
      ccType: 'Shield', 
      cleansable: false,
      color: 'medium'
    };
  }
  
  if (desc.includes('poke')) {
    return { 
      type: 'medium', 
      ccType: 'Poke', 
      cleansable: false,
      color: 'medium'
    };
  }
  
  // Check for low threats
  if (desc.includes('heal') || desc.includes('his maximum health') || desc.includes('her maximum health') || desc.includes('regenerat')) {
    return { 
      type: 'low', 
      ccType: 'Sustain', 
      cleansable: false,
      color: 'low'
    };
  }
  
  return null;
}

function populateAbilities(cell, detail, champion) {
  cell.innerHTML = '';

  if (!detail.spells) return;

  // Get threat data from champions-summary.json
  const summaryData = state.championsSummary[champion.name] || state.championsSummary[champion.id];

  const keys = ['Q', 'W', 'E', 'R'];
  detail.spells.forEach((spell, i) => {
    const div = document.createElement('div');
    div.className = 'ability';

    const key = document.createElement('span');
    key.className = 'ability-key';
    key.textContent = keys[i];
    div.appendChild(key);

    const name = document.createElement('span');

    // Classify ability using shared helper (now returns array)
    const classifications = classifyAbility(spell, summaryData, i, false);
    const cooldowns = spell.cooldown || [];

    if (cooldowns.length > 0) {
      const cdText = cooldowns.join('/');
      let cdClass = 'cd-medium';

      // Use the first (highest priority) classification for cooldown badge color
      if (classifications.length > 0) {
        cdClass = `cd-${classifications[0].color}`;
      }

      let badgeText = `${cdText}s`;
      let badgeTitle = '';

      // Add cleansability indicator based on wikilol standards (using first classification)
      if (classifications.length > 0) {
        const firstClass = classifications[0];
        if (firstClass.qssOnly) {
          badgeText += ' 🔒';
          badgeTitle = 'QSS only - Cannot be removed by Cleanse';
        } else if (firstClass.cleansable) {
          badgeText += ' ✓';
          badgeTitle = 'Cleansable - Can be removed by Cleanse/QSS';
        } else if (firstClass.ccType === 'Airborne' || firstClass.ccType === 'Pull') {
          badgeText += ' ✗';
          badgeTitle = 'NOT Fully Cleansable - Forced movement cannot be removed';
        } else if (firstClass.ccType === 'Nearsight') {
          badgeText += ' ✗';
          badgeTitle = 'NOT Cleansable - Cannot be removed by Cleanse or QSS';
        }
      }

      const badge = document.createElement('span');
      badge.className = `cd-badge ${cdClass}`;
      badge.textContent = badgeText;
      if (badgeTitle) {
        badge.title = badgeTitle;
      }

      name.innerHTML = spell.name + ' ';
      name.appendChild(badge);

      // Display all threat type badges
      if (classifications.length > 0) {
        classifications.forEach(classification => {
          const threatBadge = document.createElement('span');
          threatBadge.className = `threat-type-badge threat-${classification.color}`;
          threatBadge.textContent = classification.ccType;

          // Add cleansability tooltip
          let tooltip = classification.ccType;
          if (classification.qssOnly) {
            tooltip += ' (QSS only)';
          } else if (classification.cleansable) {
            tooltip += ' (Cleansable)';
          } else if (classification.ccType === 'Airborne' || classification.ccType === 'Pull') {
            tooltip += ' (Partial)';
          } else if (classification.ccType === 'Nearsight') {
            tooltip += ' (Not Cleansable)';
          }
          threatBadge.title = tooltip;

          name.appendChild(document.createTextNode(' '));
          name.appendChild(threatBadge);
        });
      }
    } else {
      name.textContent = spell.name;

      // Display threat type badges even without cooldown
      if (classifications.length > 0) {
        name.innerHTML = spell.name + ' ';
        classifications.forEach(classification => {
          const threatBadge = document.createElement('span');
          threatBadge.className = `threat-type-badge threat-${classification.color}`;
          threatBadge.textContent = classification.ccType;

          // Add cleansability tooltip
          let tooltip = classification.ccType;
          if (classification.qssOnly) {
            tooltip += ' (QSS only)';
          } else if (classification.cleansable) {
            tooltip += ' (Cleansable)';
          } else if (classification.ccType === 'Airborne' || classification.ccType === 'Pull') {
            tooltip += ' (Partial)';
          } else if (classification.ccType === 'Nearsight') {
            tooltip += ' (Not Cleansable)';
          }
          threatBadge.title = tooltip;

          name.appendChild(threatBadge);
          name.appendChild(document.createTextNode(' '));
        });
      }
    }

    div.appendChild(name);
    cell.appendChild(div);
  });
}

function populateThreats(cell, detail, isEnemy, champion) {
  cell.innerHTML = '';

  if (!isEnemy) {
    // For allies, show their role/capabilities
    const tags = detail.tags || [];
    tags.forEach(tag => {
      const span = document.createElement('span');
      span.className = `threat-tag tag-${tag.toLowerCase()}`;
      span.textContent = tag;
      cell.appendChild(span);
    });
    return;
  }

  // For enemies, analyze threats with cleansability info
  const threats = analyzeThreats(detail, champion);
  threats.forEach(threat => {
    const span = document.createElement('span');
    span.className = `threat-tag threat-${threat.severity}`;
    span.textContent = `${threat.icon} ${threat.label}`;
    
    if (threat.cleansable !== undefined) {
      const note = document.createElement('span');
      note.className = 'cleanse-note';
      
      if (threat.qssOnly) {
        note.textContent = '🔒 QSS only';
        note.title = 'Only QSS can remove this - Cleanse will not work';
      } else if (threat.cleansable) {
        note.textContent = '✓ Cleansable';
        note.title = 'Can be removed by Cleanse or QSS';
      } else if (threat.label === 'Airborne' || threat.label === 'Pull') {
        note.textContent = '✗ Partial';
        note.title = 'Disabling can be removed but not forced movement';
      } else if (threat.label === 'Nearsight') {
        note.textContent = '✗ Not Cleansable';
        note.title = 'Cannot be removed by Cleanse or QSS';
      }
      
      if (note.textContent) {
        span.appendChild(document.createTextNode(' '));
        span.appendChild(note);
      }
    }
    
    cell.appendChild(span);
  });
}

function analyzeThreats(detail, champion) {
  const threats = [];
  const spells = detail.spells || [];
  const seenTypes = new Set();

  // Get threat data from champions-summary.json
  const summaryData = state.championsSummary[champion.name] || state.championsSummary[champion.id];

  spells.forEach((spell, i) => {
    // Classify ability using shared helper (allow fallback CC if no summary data)
    const classifications = classifyAbility(spell, summaryData, i, true);

    // Process all classifications for this ability
    classifications.forEach(classification => {
      if (classification && !seenTypes.has(classification.ccType)) {
        const threat = {
          label: classification.ccType,
          severity: classification.type === 'hard' ? 'high' :
                   classification.type === 'suppression' ? 'high' :
                   classification.type === 'soft' ? 'medium' :
                   classification.type,
          icon: getThreatIcon(classification.ccType),
          cleansable: classification.cleansable,
          qssOnly: classification.qssOnly || false
        };
        threats.push(threat);
        seenTypes.add(classification.ccType);
      }
    });
  });

  return threats.slice(0, 10); // Increased from 6 to 10 to show more tags
}

function getThreatIcon(ccType) {
  const icons = {
    // Airborne
    'Knockup': '🌪️',
    'Knockback': '💨',
    'Pull': '🪝',
    'Suppression': '🔒',
    'Nearsight': '🌫️',
    // Disabling
    'Stun': '⚡',
    'Root': '🌿',
    'Sleep': '😴',
    'Charm': '💕',
    'Fear': '😱',
    'Taunt': '😡',
    'Polymorph': '🐑',
    // Impairing
    'Slow': '🐌',
    'Silence': '🤐',
    'Blind': '🙈',
    'Disarm': '🚫',
    'Grounded': '⚓',
    'Cripple': '🦴',
    // Non-CC - High Threat
    'Mobility': '🏃',
    'Dash': '💨',
    'Stealth': '👻',
    'Dodge': '🌀',
    'Projectile Block': '🧱',
    'Unbreakable Wall': '🗿',
    // Non-CC - Medium Threat
    'Shield': '🛡️',
    'Breakable Wall': '🧱',
    'Reveal': '👁️',
    // Non-CC - Low Threat
    'Sustain': '💚',
    'Ghost': '👤',
    // Legacy (for backwards compatibility)
    'Airborne': '🌪️',
    'Burst': '💥',
    'Poke': '🎯'
  };
  return icons[ccType] || '⚠️';
}

/**
 * Populate understanding column
 * For enemies: Threat patterns and what to watch for
 * For allies: How the champion works and synergy potential
 */
function populateUnderstanding(cell, champion, detail, isEnemy) {
  cell.innerHTML = '';
  
  if (!state.selectedADC) {
    cell.textContent = 'No ADC selected';
    return;
  }
  
  const p = document.createElement('p');
  p.className = 'understanding-text';
  
  if (isEnemy) {
    p.textContent = generateEnemyUnderstanding(champion, detail);
  } else {
    p.textContent = generateAllyUnderstanding(champion, detail);
  }
  
  cell.appendChild(p);
}

/**
 * Generate enemy understanding based on threat patterns
 */
function generateEnemyUnderstanding(champion, detail) {
  const spells = detail.spells || [];
  const ccSpells = spells.filter(s => {
    const classification = classifyCC(s);
    return classification && 
           (classification.type === 'hard' || 
            classification.type === 'soft' || 
            classification.type === 'suppression');
  });
  
  const mobilitySpells = spells.filter(s => {
    const desc = s.description?.toLowerCase() || '';
    return desc.includes('dash') || desc.includes('blink') || desc.includes('leap');
  });
  
  const burstSpells = spells.filter(s => {
    const desc = s.description?.toLowerCase() || '';
    return desc.includes('burst') || (desc.includes('damage') && desc.includes('bonus'));
  });
  
  let understanding = `${champion.name} threat analysis: `;
  
  if (ccSpells.length > 0) {
    const ccTypes = ccSpells.map(s => {
      const c = classifyCC(s);
      return c ? c.ccType : '';
    }).filter(Boolean).join(', ');
    understanding += `Watch for CC (${ccTypes}). `;
  }
  
  if (mobilitySpells.length > 0) {
    understanding += `High mobility - respect gap closers and position carefully. `;
  }
  
  if (burstSpells.length > 0) {
    understanding += `Burst damage threat - maintain safe distance. `;
  }
  
  understanding += `Track cooldowns (shown in Key Abilities) to identify safe trading windows. `;
  understanding += `Visit wikilol for full ability details and matchup strategies.`;
  
  return understanding;
}

/**
 * Generate ally understanding with detailed champion mechanics
 * Helps player understand how to work with this champion
 */
function generateAllyUnderstanding(champion, detail) {
  const tags = detail.tags || [];
  const passive = detail.passive?.description || '';
  const spells = detail.spells || [];
  
  // Analyze champion mechanics
  const hasCC = spells.some(s => {
    const classification = classifyCC(s);
    return classification && 
           (classification.type === 'hard' || 
            classification.type === 'soft' || 
            classification.type === 'suppression');
  });
  
  const hasMobility = spells.some(s => {
    const desc = s.description?.toLowerCase() || '';
    return desc.includes('dash') || desc.includes('blink') || desc.includes('leap');
  });
  
  const hasHeal = spells.some(s => {
    const desc = s.description?.toLowerCase() || '';
    return desc.includes('heal') || desc.includes('restore') && desc.includes('health');
  });
  
  const hasShield = spells.some(s => {
    const desc = s.description?.toLowerCase() || '';
    return desc.includes('shield');
  });
  
  const hasPoke = spells.some(s => {
    const desc = s.description?.toLowerCase() || '';
    return desc.includes('poke') || (desc.includes('damage') && desc.includes('range'));
  });
  
  let understanding = '';
  
  // Role-based understanding
  if (tags.includes('Support')) {
    understanding += `${champion.name} (Support): `;
    if (hasCC) {
      understanding += `Provides crowd control for peel and engage. `;
    }
    if (hasHeal || hasShield) {
      understanding += `Can protect you with heals/shields. `;
    }
    if (hasPoke) {
      understanding += `Can poke enemies in lane. `;
    }
    understanding += `Coordinate all-ins when their CC is available. Play around their vision control and roam timings.`;
  } else if (tags.includes('Tank')) {
    understanding += `${champion.name} (Tank): `;
    understanding += `Front-line champion who absorbs damage and creates space. `;
    if (hasCC) {
      understanding += `Has engage/peel tools - follow up on their crowd control. `;
    }
    if (hasMobility) {
      understanding += `Mobile engager - be ready to support their dives. `;
    }
    understanding += `They initiate fights, you clean up. Position behind them in teamfights.`;
  } else if (tags.includes('Mage')) {
    understanding += `${champion.name} (Mage): `;
    understanding += `Provides burst damage and area control. `;
    if (hasCC) {
      understanding += `Has crowd control for picks and peel. `;
    }
    if (hasPoke) {
      understanding += `Can soften enemies before fights. `;
    }
    understanding += `Let them land their abilities first, then follow up. Respect their mana and cooldown windows.`;
  } else if (tags.includes('Fighter')) {
    understanding += `${champion.name} (Fighter): `;
    understanding += `Thrives in extended fights and can duel enemies. `;
    if (hasCC) {
      understanding += `Can lock down targets for you. `;
    }
    if (hasMobility) {
      understanding += `Mobile fighter - can chase or peel effectively. `;
    }
    understanding += `They draw attention in fights - use this to position safely and deal damage. Best in prolonged skirmishes.`;
  } else if (tags.includes('Assassin')) {
    understanding += `${champion.name} (Assassin): `;
    understanding += `Specializes in quickly eliminating priority targets. `;
    if (hasMobility) {
      understanding += `Highly mobile - can dive backline. `;
    }
    understanding += `Let them engage first to draw cooldowns, then follow up. They create chaos - capitalize on it. Watch for their roams.`;
  } else {
    understanding += `${champion.name}: `;
    if (hasCC) {
      understanding += `Has crowd control tools. `;
    }
    if (hasMobility) {
      understanding += `Mobile champion. `;
    }
    if (hasHeal || hasShield) {
      understanding += `Can provide sustain/protection. `;
    }
    understanding += `Coordinate your cooldowns with theirs for maximum impact.`;
  }
  
  understanding += ` Check wikilol for detailed ability information and synergy patterns.`;
  
  return understanding;
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
