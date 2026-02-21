let allMissionsData = [];
let currentMission = null;
let allFoes = [];
let currentMode = 'normal'; // 'normal' or 'hard'
let currentCampaign = ''; // Track current campaign

// Campaign-specific mission icons
const campaignIcons = {
  'prophecies': {
    'normal': 'https://wiki.guildwars.com/images/b/bc/MissionIconIncomplete.png',
    'hard': 'https://wiki.guildwars.com/images/a/ab/HardModeMissionIconIncomplete.png'
  },
  'factions': {
    'normal': 'https://wiki.guildwars.com/images/0/00/FactionsMissionIconIncomplete.png',
    'hard': 'https://wiki.guildwars.com/images/a/ab/HardModeMissionIconIncomplete.png'
  },
  'nightfall': {
    'normal': 'https://wiki.guildwars.com/images/a/ab/NightfallMissionIconIncomplete.png',
    'hard': 'https://wiki.guildwars.com/images/a/ab/HardModeMissionIconIncomplete.png'
  },
  'eye of the north': {
    'normal': 'https://wiki.guildwars.com/images/a/ad/EOTNMissionIncomplete.png',
    'hard': 'https://wiki.guildwars.com/images/e/ee/EOTNHardModeMissionIncomplete.png'
  }
};

const allEffectTypes = [
  'Knockdown',
  'Monster_Skill',
  'Resurrection',
  'Interrupt',
  'Slow_Cripple',
  'Enchantment_Removal',
  'Hex_Removal',
  'Condition_Removal',
  'IMS',
  'Elite',
  'Variant'
];

const effectColors = {
  Knockdown: '#f8f17a',
  Monster_Skill: '#d86c00',
  Resurrection: '#9bc4ff',
  Interrupt: '#ff9aff',
  Slow_Cripple: '#969664',
  Enchantment_Removal: '#cba3ff',
  Hex_Removal: '#b28aff',
  Condition_Removal: '#9966ff',
  IMS: '#8fff8f',
  Elite: '#fedd02',
  Variant: '#ff6666'
};

async function loadMissionData() {
  try {
    const response = await fetch('foe-data.json');
    if (!response.ok) {
      throw new Error(`Failed to load mission data: ${response.status}`);
    }
    allMissionsData = await response.json();
    console.log('[Mission Tool] Loaded mission data, count:', allMissionsData.length);
    populateCampaignSelector();
    
    // Try to auto-select today's Zaishen mission (with polling if data isn't available yet)
    console.log('[Mission Tool] Attempting immediate Zaishen mission apply...');
    if (!applyZaishenMission()) {
      console.log('[Mission Tool] Immediate apply failed, starting poll...');
      let attempts = 0;
      const maxAttempts = 25;
      const pollInterval = setInterval(() => {
        attempts++;
        console.log(`[Mission Tool] Poll attempt ${attempts}/${maxAttempts}`);
        if (applyZaishenMission() || attempts >= maxAttempts) {
          if (attempts >= maxAttempts) {
            console.warn('[Mission Tool] Max polling attempts reached without success');
          }
          clearInterval(pollInterval);
        }
      }, 200);
    } else {
      console.log('[Mission Tool] Immediate apply succeeded');
    }
  } catch (error) {
    console.error('Error loading mission data:', error);
    const noMissionMsg = document.getElementById('noMissionMsg');
    if (noMissionMsg) {
      noMissionMsg.innerHTML =
        `<i class="fas fa-exclamation-circle"></i> Error loading mission data: ${error.message}`;
    }
  }
}

function populateCampaignSelector() {
  const campaignSelector = document.getElementById('campaignSelect');
  const missionSelector = document.getElementById('missionSelect');
  if (!campaignSelector || !missionSelector) return;

  const campaigns = Array.from(
    new Set(allMissionsData.map(mission => (mission.campaign || '').toLowerCase()))
  ).filter(Boolean);

  campaignSelector.innerHTML = '';
  campaigns.forEach(campaign => {
    const option = document.createElement('option');
    option.value = campaign;
    option.textContent = campaign.charAt(0).toUpperCase() + campaign.slice(1);
    campaignSelector.appendChild(option);
  });

  campaignSelector.addEventListener('change', () => {
    currentCampaign = campaignSelector.value;
    populateMissionSelector();
  });

  populateMissionSelector();
}

function applyZaishenMission() {
  if (!window.todaysZaishenMission || allMissionsData.length === 0) {
    console.log('[Mission Tool] applyZaishenMission: Cannot apply -', {
      hasMission: !!window.todaysZaishenMission,
      mission: window.todaysZaishenMission,
      hasData: allMissionsData.length > 0,
      dataLength: allMissionsData.length
    });
    return false;
  }
  
  console.log('[Mission Tool] Attempting to apply Zaishen mission:', window.todaysZaishenMission);
  
  // Find the mission that matches today's Zaishen
  const missionData = allMissionsData.find(
    m => m.mission && m.mission.toLowerCase() === window.todaysZaishenMission.toLowerCase()
  );
  
  if (!missionData) {
    console.warn('[Mission Tool] Mission not found in data. Searched missions:', {
      looking: window.todaysZaishenMission,
      available: allMissionsData.map(m => m.mission).slice(0, 10)
    });
    return false;
  }
  
  console.log('[Mission Tool] Found mission data:', missionData.mission, 'Campaign:', missionData.campaign);
  
  // Select the campaign
  const campaignSelector = document.getElementById('campaignSelect');
  const missionSelector = document.getElementById('missionSelect');
  
  if (campaignSelector && missionData.campaign) {
    console.log('[Mission Tool] Setting campaign to:', missionData.campaign.toLowerCase());
    campaignSelector.value = missionData.campaign.toLowerCase();
    populateMissionSelector();
  }
  
  // Select the mission
  if (missionSelector) {
    const missionIndex = allMissionsData.findIndex(m => m.mission === missionData.mission);
    console.log('[Mission Tool] Mission index:', missionIndex);
    
    if (missionIndex !== -1) {
      missionSelector.value = missionIndex.toString();
      loadMission(missionData);
      console.log('[Mission Tool] SUCCESS: Zaishen mission applied:', missionData.mission);
      return true;
    }
  }
  
  console.warn('[Mission Tool] Failed to select mission element');
  return false;
}

function populateMissionSelector() {
  const selector = document.getElementById('missionSelect');
  const campaignSelector = document.getElementById('campaignSelect');
  if (!selector || !campaignSelector) return;

  const selectedCampaign = campaignSelector.value.toLowerCase();
  selector.innerHTML = '';

  allMissionsData.forEach((mission, index) => {
    const missionCampaign = (mission.campaign || '').toLowerCase();
    if (selectedCampaign && missionCampaign !== selectedCampaign) {
      return;
    }

    const option = document.createElement('option');
    option.value = index.toString();
    option.textContent = mission.mission;
    selector.appendChild(option);
  });

  selector.addEventListener('change', (e) => {
    const missionIndex = parseInt(e.target.value, 10);
    if (!Number.isNaN(missionIndex) && allMissionsData[missionIndex]) {
      loadMission(allMissionsData[missionIndex]);
    }
  });

  if (allMissionsData.length > 0) {
    const firstIndex = selector.options[0]?.value;
    if (firstIndex !== undefined) {
      selector.value = firstIndex;
      loadMission(allMissionsData[parseInt(firstIndex, 10)]);
    }
  }
  
  updateModeButton();
}

function loadMission(missionData) {
  currentMission = missionData;
  allFoes = missionData.foes || [];
  // Update current campaign from mission data
  if (missionData.campaign) {
    currentCampaign = missionData.campaign;
  }
  renderMission();
}

function renderMission() {
  const missionInfo = document.getElementById('missionInfo');
  const noMsg = document.getElementById('noMissionMsg');
  const container = document.getElementById('foesContainer');

  if (!missionInfo || !noMsg || !container) return;

  if (!currentMission) {
    missionInfo.style.display = 'none';
    noMsg.style.display = 'block';
    container.innerHTML = '';
    return;
  }

  missionInfo.style.display = 'block';
  noMsg.style.display = 'none';
  updateModeButton();

  document.getElementById('missionTitle').textContent = currentMission.mission;
  document.getElementById('foeCount').textContent = currentMission.foes.length;

  let filteredFoes = allFoes;

  const filterUnique = document.getElementById('filterUnique')?.checked || false;
  const filterElites = document.getElementById('filterElites')?.checked || false;

  container.innerHTML = filteredFoes
    .map(foe => {
      const skills = getFilteredSkills(foe, filterUnique, filterElites);
      if (skills.length === 0) {
        return '';
      }
      return createFoeCard(foe, skills, filterUnique, filterElites);
    })
    .filter(Boolean)
    .join('');

  updateEffectBar();

  // Re-attach filter listeners
  const filterUniqueToggle = document.getElementById('filterUnique');
  const filterElitesToggle = document.getElementById('filterElites');
  if (filterUniqueToggle) {
    filterUniqueToggle.addEventListener('change', renderMission);
  }
  if (filterElitesToggle) {
    filterElitesToggle.addEventListener('change', renderMission);
  }
}

function getFilteredSkills(foe, filterUnique, filterElites) {
  let skills = currentMode === 'hard' ? foe.builds.hard : foe.builds.normal;

  // Remove placeholder entries that indicate no skills
  skills = (skills || []).filter(skill => {
    if (!skill || !skill.name) return false;
    
    // Filter out "none" placeholders
    if (skill.name.toLowerCase() === 'none') return false;
    
    // Filter out category/group page names (not actual skills)
    const categoryNames = ['Rangers', 'Warriors', 'Monks', 'Necromancers', 'Mesmers', 'Elementalists', 
                          'Rangers', 'Assassins', 'Dervishes', 'Paragons', 'Ritualists',
                          'Humans', 'Asura', 'Charr', 'Norn', 'Sylvari',
                          'Corsairs', 'Kournans', 'Undead', 'Ghosts', 'Dragons', 'Demons',
                          'NPCs', 'Creatures', 'Animals', 'Bosses', 'Bosses', 'Elites',
                          'Chahbek Village NPCs', 'Consulate Docks NPCs', 'Gate of Desolation NPCs',
                          'Ruins of Morah NPCs', 'Domain of Anguish NPCs'];
    
    if (categoryNames.includes(skill.name)) return false;
    
    // Filter out links that point to categories or group pages
    if (skill.wiki_link && (skill.wiki_link.includes('Category:') || 
        skill.wiki_link.endsWith('NPCs') || 
        skill.skill_page_url.endsWith('NPCs'))) {
      return false;
    }
    
    return true;
  });

  if (filterUnique && skills.length) {
    skills = skills.filter(s => s.effects && s.effects.length > 0);
  }

  if (filterElites && skills.length) {
    skills = skills.filter(s => {
      if (!s.effects || s.effects.length === 0) return true;
      if (s.effects.length === 1 && s.effects[0] === 'Elite') return false;
      return true;
    });
  }

  return skills;
}

function createFoeCard(foe, skills, filterUnique, filterElites) {
  const isBoss = foe.is_boss ? ' is-boss' : '';
  const bossLabel = foe.is_boss ? '<span class="boss-badge">BOSS</span>' : '';
  
  // Build skills section
  let skillsSection = '';
  if (skills && skills.length > 0) {
    skillsSection = `
      <div class="skill-variants">
        <ul class="skill-list">
          ${skills.map(skill => createSkillItem(skill)).join('')}
        </ul>
      </div>
    `;
  } else {
    skillsSection = '<p class="text-muted">No skills' + (filterUnique || filterElites ? ' matching filters' : '') + '</p>';
  }

  return `
    <div class="foe-card${isBoss}">
      <div class="foe-header">
        <div class="foe-title">
          ${bossLabel}
          <img src="${foe.profession_icon}" alt="${foe.profession}" class="prof-icon">
          <a href="${foe.wiki_url}" target="_blank" rel="noopener noreferrer" class="foe-name-link">
            <h3>${foe.name}</h3>
          </a>
        </div>
        <div class="foe-meta">
        </div>
      </div>

      <div class="foe-content">
        <div class="skills-section">
          <h4>Skills</h4>
          ${skillsSection}
        </div>
      </div>
    </div>
  `;
}

function createSkillItem(skill) {
  const effectBadges = (skill.effects && skill.effects.length > 0) ? 
    `<div class="skill-effects">${skill.effects.map(effect => `<span class="effect-badge ${formatEffectClass(effect)}">${shortEffectName(effect)}</span>`).join('')}</div>` : '';
  
  const skillWikiUrl = skill.skill_page_url || skill.wiki_link || '#';
  const skillIcon = skill.icon ? `<a href="${skillWikiUrl}" target="_blank" rel="noopener noreferrer"><img src="${skill.icon}" alt="${skill.name}" class="skill-icon" title="${skill.name}"></a>` : '';
  
  return `
    <li class="skill-item">
      ${skillIcon}
      <span class="skill-name">${skill.name}</span>
      ${effectBadges}
    </li>
  `;
}

function updateEffectBar() {
  const container = document.getElementById('foesContainer');
  if (!container || !currentMission) return;

  let effectBar = document.getElementById('effectBar');
  if (!effectBar) {
    effectBar = document.createElement('div');
    effectBar.id = 'effectBar';
    effectBar.className = 'effect-bar';
    container.parentNode.insertBefore(effectBar, container);
  }

  const activeEffects = new Set();
  allFoes.forEach(foe => {
    const skills = currentMode === 'hard' ? foe.builds.hard : foe.builds.normal;
    if (skills && skills.length) {
      skills.forEach(skill => (skill.effects || []).forEach(effect => activeEffects.add(effect)));
    }
    if (foe.multiple_builds) {
      activeEffects.add('Variant');
    }
  });

  effectBar.innerHTML = '';
  allEffectTypes.forEach(effect => {
    const badge = document.createElement('span');
    badge.className = `effect-badge ${formatEffectClass(effect)}`;
    badge.textContent = shortEffectName(effect);
    if (activeEffects.has(effect) && effectColors[effect]) {
      badge.style.backgroundColor = effectColors[effect];
    }
    effectBar.appendChild(badge);
  });
}

function formatEffectClass(effect) {
  return effect.toLowerCase();
}

function shortEffectName(effect) {
  const map = {
    Knockdown: 'KD',
    Resurrection: 'Rez',
    Interrupt: 'Interrupt',
    Hex_Removal: 'Hex Removal',
    Condition_Removal: 'Condition Removal',
    Enchantment_Removal: 'Enchantment Strip',
    Monster_Skill: 'Monster Skill',
    Multiple_Effects: 'Multi',
    IMS: 'IMS',
    Slow_Cripple: 'Slow',
    Elite: 'Elite',
    Variant: 'Variant'
  };

  return map[effect] || effect;
}

function updateModeButton() {
  const modeIcon = document.getElementById('modeIcon');
  const modeLabel = document.getElementById('modeLabel');
  
  // Get campaign-specific icons (campaigns are stored lowercase)
  const campaignKey = currentCampaign.toLowerCase();
  const icons = campaignIcons[campaignKey] || campaignIcons['prophecies'];
  
  const iconUrl = currentMode === 'hard' ? icons.hard : icons.normal;
  modeIcon.src = iconUrl;
  modeLabel.textContent = currentMode === 'hard' ? 'Hard Mode' : 'Normal Mode';
}

function toggleMode() {
  currentMode = currentMode === 'normal' ? 'hard' : 'normal';
  updateModeButton();
  renderMission();
}

function toggleTheme() {
  const body = document.body;
  const isDark = body.classList.toggle('dark-mode');
  const icon = document.querySelector('#themeToggle i');

  if (isDark) {
    if (icon) icon.className = 'fas fa-sun';
    localStorage.setItem('theme', 'dark');
  } else {
    if (icon) icon.className = 'fas fa-moon';
    localStorage.setItem('theme', 'light');
  }
}

function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const themeToggle = document.getElementById('themeToggle');

  if (!themeToggle) return;

  const icon = themeToggle.querySelector('i');
  const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);

  if (shouldBeDark) {
    document.body.classList.add('dark-mode');
    if (icon) icon.className = 'fas fa-sun';
  } else {
    document.body.classList.remove('dark-mode');
    if (icon) icon.className = 'fas fa-moon';
  }

  themeToggle.addEventListener('click', toggleTheme);
}

function initCookieConsent() {
  const cookieBanner = document.getElementById('cookieConsent');
  const acceptBtn = document.getElementById('cookieAccept');
  const hasAccepted = localStorage.getItem('cookieConsent');

  if (!hasAccepted && cookieBanner) {
    cookieBanner.style.display = 'block';
  }

  if (acceptBtn) {
    acceptBtn.addEventListener('click', () => {
      localStorage.setItem('cookieConsent', 'accepted');
      if (cookieBanner) {
        cookieBanner.style.display = 'none';
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initCookieConsent();
  loadMissionData();

  const modeToggle = document.getElementById('modeToggle');
  if (modeToggle) {
    modeToggle.addEventListener('click', toggleMode);
  }
});
