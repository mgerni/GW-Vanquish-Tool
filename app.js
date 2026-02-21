let data = [];

// Load JSON data
fetch("data.json")
  .then(res => res.json())
  .then(json => {
    data = json;
    initCampaigns();
  })
  .catch(err => console.error("Failed to load data.json:", err));

// Function to apply Zaishen area selection
function applyZaishenArea() {
  if (!window.todaysZaishenArea || data.length === 0) {
    return false;
  }
  
  // Find the campaign that contains this area
  const areaData = data.find(d => d.area === window.todaysZaishenArea);
  if (areaData) {
    const campaignSelect = document.getElementById("campaign");
    campaignSelect.value = areaData.campaign;
    updateAreas();
    return true;
  }
  return false;
}

// After DOM is loaded, try to apply Zaishen area (with polling)
document.addEventListener('DOMContentLoaded', () => {
  // Try immediately
  if (applyZaishenArea()) return;
  
  // If not available yet, poll for it (max 5 seconds with 200ms intervals)
  let attempts = 0;
  const maxAttempts = 25;
  const pollInterval = setInterval(() => {
    attempts++;
    if (applyZaishenArea() || attempts >= maxAttempts) {
      clearInterval(pollInterval);
    }
  }, 200);
});

// Initialize campaign dropdown
function initCampaigns() {
  const campaigns = [...new Set(data.map(d => d.campaign))];
  const campaignSelect = document.getElementById("campaign");

  campaigns.forEach(c => {
    const option = document.createElement("option");
    option.value = c;
    option.textContent = c;
    campaignSelect.appendChild(option);
  });

  campaignSelect.addEventListener("change", updateAreas);

  updateAreas();
  initTheme();
}

// Populate area dropdown based on selected campaign
function updateAreas() {
  const selectedCampaign = document.getElementById("campaign").value;
  const areas = [...new Set(data.filter(d => d.campaign === selectedCampaign).map(d => d.area))];

  const areaSelect = document.getElementById("area");
  areaSelect.innerHTML = "";

  areas.forEach(a => {
    const option = document.createElement("option");
    option.value = a;
    option.textContent = a;
    areaSelect.appendChild(option);
  });

  // If Zaishen area is available and in current campaign, select it
  if (window.todaysZaishenArea && areas.includes(window.todaysZaishenArea)) {
    areaSelect.value = window.todaysZaishenArea;
  }

  areaSelect.addEventListener("change", renderFoes);

  renderFoes();
}

function renderFoes() {
  const campaign = document.getElementById("campaign").value;
  const area = document.getElementById("area").value;
  const results = document.getElementById("results");
  
  // Save filter states before clearing
  const filterUniqueChecked = document.getElementById("filterUnique")?.checked || false;
  const filterElitesChecked = document.getElementById("filterElites")?.checked || false;
  
  results.innerHTML = "";

  const areaData = data.find(d => d.campaign === campaign && d.area === area);
  if (!areaData) return;

  // --- Insert mission-style header with filters ---
  const header = document.createElement("div");
  header.className = "mission-header";

  let foeCountHTML = '';
  if (areaData.average_foes) {
    const tooltipParts = [`Average: ${areaData.average_foes}`];
    if (areaData.min_kills) {
      tooltipParts.push(`Min: ${areaData.min_kills}`);
    }
    if (areaData.max_kills) {
      tooltipParts.push(`Max: ${areaData.max_kills}`);
    }
    const tooltip = tooltipParts.join(' | ');
    foeCountHTML = `<p class="mission-meta"><strong>Average Foes:</strong> <span title="${tooltip}">${areaData.average_foes}</span></p>`;
  }

  header.innerHTML = `
    <div class="mission-header-main">
      <h2>${area}</h2>
      ${foeCountHTML}
    </div>
    <div class="mode-filters">
      <label title="Show only skills with effects">
        <input type="checkbox" id="filterUnique" ${filterUniqueChecked ? 'checked' : ''}>
        <i class="fas fa-filter"></i>
      </label>
      <label title="Hide elite skills without effects">
        <input type="checkbox" id="filterElites" ${filterElitesChecked ? 'checked' : ''}>
        <i class="fas fa-star"></i>
      </label>
    </div>
  `;
  results.appendChild(header);

  // Re-attach event listeners for filters
  document.getElementById("filterUnique").addEventListener("change", renderFoes);
  document.getElementById("filterElites").addEventListener("change", renderFoes);

  // --- Insert effect bar ---
  const effectBar = document.createElement("div");
  effectBar.className = "effect-bar";

  // All possible effects
  const allEffects = [
    "Knockdown",
    "Monster_Skill",
    "Resurrection",
    "Interrupt",
    "Slow_Cripple",
    "Enchantment_Removal",
    "Hex_Removal",
    "Condition_Removal",
    "IMS",
    "Elite",
    "Variant"
  ];

  // Effect colors
  const effectColors = {
    Knockdown: "#f8f17a",
    Monster_Skill: "#d86c00",
    Resurrection: "#9bc4ff",
    Interrupt: "#ff9aff",
    Slow_Cripple: "#969664",
    Enchantment_Removal: "#cba3ff",
    Hex_Removal: "#b28aff",
    Condition_Removal: "#9966ff",
    IMS: "#8fff8f",
    Elite: "#fedd02",
    Variant: "#ff6666"
  };

  // Determine which effects are present in this area
  const activeEffects = new Set();
  areaData.foes.forEach(f => {
    f.skills.forEach(s => s.effects.forEach(e => activeEffects.add(normalizeEffectName(e))));
    if (f.variant) {
      activeEffects.add("Variant");
    }
  });

  // Create badges for the effect bar
  allEffects.forEach(e => {
    const badge = document.createElement("span");
    badge.className = "effect-badge";
    badge.textContent = shortEffectName(e); // optional abbreviation function
    if (activeEffects.has(e)) {
      badge.style.backgroundColor = effectColors[e];
    }
    effectBar.appendChild(badge);
  });

  results.appendChild(effectBar);

  // --- Create cards container ---
  const cardsContainer = document.createElement("div");
  cardsContainer.className = "foes-grid";
  results.appendChild(cardsContainer);

  // --- Determine if filtering for unique effects ---
  const filterUnique = document.getElementById("filterUnique").checked;
  const filterElites = document.getElementById("filterElites").checked;

  // --- Render each foe using mission-style cards ---
  areaData.foes.forEach(f => {
    const skillsToShow = getFilteredSkills(f, filterUnique, filterElites);
    if (skillsToShow.length === 0) return;

    const card = document.createElement("div");
    card.className = "foe-card";
    card.innerHTML = createFoeCard(f, skillsToShow);
    cardsContainer.appendChild(card);
  });
}

function getFilteredSkills(foe, filterUnique, filterElites) {
  let skills = foe.skills || [];

  if (filterUnique && skills.length) {
    skills = skills.filter(s => s.effects && s.effects.length > 0);
  }

  if (filterElites && skills.length) {
    skills = skills.filter(s => {
      if (!s.effects || s.effects.length === 0) return true;
      if (s.effects.length === 1 && s.effects[0] === "Elite") return false;
      return true;
    });
  }

  return skills;
}

function createFoeCard(foe, skills) {
  const profIcon = foe.profession_icon || "https://wiki.guildwars.com/images/e/e0/Cross_grey_20.png";
  const profAlt = foe.profession || "Unknown";

  const skillsSection = skills.length > 0
    ? `
      <div class="skill-variants">
        <ul class="skill-list">
          ${skills.map(skill => createSkillItem(skill)).join('')}
        </ul>
      </div>
    `
    : '<p class="text-muted">No skills</p>';

  return `
    <div class="foe-header">
      <div class="foe-title">
        <img src="${profIcon}" alt="${profAlt}" class="prof-icon">
        <a href="${foe.wiki_url}" target="_blank" rel="noopener noreferrer" class="foe-name-link">
          <h3>${foe.name}</h3>
        </a>
      </div>
    </div>
    <div class="foe-content">
      <div class="skills-section">
        <h4>Skills</h4>
        ${skillsSection}
      </div>
    </div>
  `;
}

function createSkillItem(skill) {
  const effects = skill.effects || [];
  const effectBadges = effects.length
    ? `<div class="skill-effects">${effects.map(effect => {
        const normalizedEffect = normalizeEffectName(effect);
        return `<span class="effect-badge ${formatEffectClass(normalizedEffect)}">${shortEffectName(normalizedEffect)}</span>`;
      }).join('')}</div>`
    : '';
  const iconUrl = skill.wiki_link || skill.icon;
  const skillWikiUrl = skill.skill_page_url || '#';
  const skillIcon = iconUrl
    ? `<a href="${skillWikiUrl}" target="_blank" rel="noopener noreferrer"><img src="${iconUrl}" alt="${skill.name}" class="skill-icon" title="${skill.name}"></a>`
    : '';

  return `
    <li class="skill-item">
      ${skillIcon}
      <span class="skill-name">${skill.name}</span>
      ${effectBadges}
    </li>
  `;
}


function formatEffectClass(effect) {
  return (effect || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeEffectName(effect) {
  const value = (effect || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  const canonicalMap = {
    monster_skill: "Monster_Skill",
    knockdown: "Knockdown",
    resurrection: "Resurrection",
    interrupt: "Interrupt",
    slow_cripple: "Slow_Cripple",
    enchantment_removal: "Enchantment_Removal",
    hex_removal: "Hex_Removal",
    condition_removal: "Condition_Removal",
    ims: "IMS",
    elite: "Elite",
    variant: "Variant",
    multiple_effects: "Multiple_Effects"
  };

  return canonicalMap[value] || effect;
}


function shortEffectName(effect) {
  const map = {
    Knockdown: "KD",
    Resurrection: "Rez",
    Interrupt: "Interrupt",
    Hex_Removal: "Hex Removal",
    Condition_Removal: "Condition Removal",
    Enchantment_Removal: "Enchantment Strip",
    Monster_Skill: "Monster Skill",
    Multiple_Effects: "Multi",
    IMS: "IMS",
    Slow_Cripple: "Slow",
    Elite: "Elite"
  };

  return map[effect] || effect;
}

// Theme toggle functionality
function toggleTheme() {
  const body = document.body;
  const isDark = body.classList.toggle("dark-mode");
  const icon = document.querySelector("#themeToggle i");
  
  if (isDark) {
    if (icon) icon.className = "fas fa-sun";
    localStorage.setItem("theme", "dark");
  } else {
    if (icon) icon.className = "fas fa-moon";
    localStorage.setItem("theme", "light");
  }
}

function initTheme() {
  const savedTheme = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const themeToggle = document.getElementById("themeToggle");
  
  if (!themeToggle) return; // Early return if button doesn't exist
  
  const icon = themeToggle.querySelector("i");
  
  // Use saved theme, or default to system preference, or default to dark
  const shouldBeDark = savedTheme === "dark" || (!savedTheme && prefersDark);
  
  if (shouldBeDark) {
    document.body.classList.add("dark-mode");
    if (icon) icon.className = "fas fa-sun";
  } else {
    document.body.classList.remove("dark-mode");
    if (icon) icon.className = "fas fa-moon";
  }
  
  // Attach event listener
  themeToggle.addEventListener("click", toggleTheme);
  
  // Initialize cookie consent
  initCookieConsent();
}

// Cookie consent functionality
function initCookieConsent() {
  const cookieBanner = document.getElementById("cookieConsent");
  const acceptBtn = document.getElementById("cookieAccept");
  const hasAccepted = localStorage.getItem("cookieConsent");
  
  // Show banner if user hasn't accepted yet
  if (!hasAccepted && cookieBanner) {
    cookieBanner.style.display = "block";
  }
  
  // Handle accept button click
  if (acceptBtn) {
    acceptBtn.addEventListener("click", () => {
      localStorage.setItem("cookieConsent", "accepted");
      if (cookieBanner) {
        cookieBanner.style.display = "none";
      }
    });
  }
}