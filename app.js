let data = [];

// ===== Zaishen Vanquish Auto-selector =====

/**
 * Get today's quest date in YY-MM-DD format.
 * Quests change at 16:00 UTC daily.
 * Before 16:00 UTC: returns yesterday's date
 * After 16:00 UTC: returns today's date
 */
function getQuestDateYYMMDD() {
  const now = new Date();
  const utcHours = now.getUTCHours();
  const questChangeHour = 16;
  
  // If before 16:00 UTC, the previous day's quest is active
  let questDate = new Date(now);
  if (utcHours < questChangeHour) {
    questDate.setUTCDate(questDate.getUTCDate() - 1);
  }
  
  // Format as YY-MM-DD
  const yy = String(questDate.getUTCFullYear()).slice(-2);
  const mm = String(questDate.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(questDate.getUTCDate()).padStart(2, '0');
  
  return `${yy}-${mm}-${dd}`;
}

/**
 * Fetch and parse the Zaishen Vanquish cycles table from the wiki.
 * Returns a map of date → area name.
 * Note: This requires a CORS proxy and may not work on localhost due to browser restrictions.
 */
async function fetchZaishenVanquish() {
  try {
    const wikiUrl = "https://wiki.guildwars.com/wiki/Zaishen_Vanquish/cycles";
    
    // Try multiple CORS proxies in order
    const proxies = [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(wikiUrl)}`,
      `https://cors-anywhere.herokuapp.com/${wikiUrl}`,
    ];
    
    let html = null;
    
    for (const proxyUrl of proxies) {
      try {
        console.log(`[Zaishen] Trying proxy: ${proxyUrl.split('/')[2]}`);
        const response = await Promise.race([
          fetch(proxyUrl, { method: 'GET', cache: 'no-cache' }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000))
        ]);
        
        if (response.ok) {
          html = await response.text();
          console.log("[Zaishen] ✓ Proxy successful");
          break;
        }
      } catch (err) {
        console.log(`[Zaishen] Proxy failed: ${err.message}`);
        continue;
      }
    }
    
    if (!html) {
      console.log("[Zaishen] ℹ Cannot fetch wiki (CORS restrictions on localhost). Manual selection available.");
      return null;
    }
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Find all wikitable tables
    const tables = doc.querySelectorAll('table.wikitable');
    if (tables.length === 0) {
      console.error("[Zaishen] No wikitable found");
      return null;
    }
    
    // Parse the first table (usually contains the cycles)
    const table = tables[0];
    const rows = table.querySelectorAll('tr');
    const vanquishMap = {};
    
    console.log(`[Zaishen] Parsing ${rows.length} rows...`);
    
    rows.forEach(row => {
      const cells = row.querySelectorAll('td, th');
      if (cells.length >= 2) {
        const dateText = cells[0].textContent.trim();
        const areaText = cells[1].textContent.trim();
        
        // Check if date matches YY-MM-DD format
        if (dateText.match(/^\d{2}-\d{2}-\d{2}$/) && areaText && areaText !== "Area") {
          vanquishMap[dateText] = areaText;
        }
      }
    });
    
    if (Object.keys(vanquishMap).length > 0) {
      console.log(`[Zaishen] Extracted ${Object.keys(vanquishMap).length} entries`);
      return vanquishMap;
    } else {
      console.warn("[Zaishen] Could not parse vanquish data from table");
      return null;
    }
    
  } catch (err) {
    console.log(`[Zaishen] Fetch skipped (network/CORS restrictions)`);
    return null;
  }
}

/**
 * Auto-select today's Zaishen Vanquish in the campaign/area dropdowns.
 * Finds the area from the cycles table and auto-selects it.
 * Gracefully handles network/CORS failures (e.g., on localhost).
 */
async function autoSelectZaishenVanquish() {
  try {
    // Get today's quest date
    const questDate = getQuestDateYYMMDD();
    console.log(`[Zaishen] Today's quest date: ${questDate}`);
    
    // Fetch the vanquish cycles (may fail on localhost due to CORS)
    const vanquishMap = await fetchZaishenVanquish();
    if (!vanquishMap) {
      // Fail silently - this is expected on localhost
      return;
    }
    
    // Look up today's area
    const todayArea = vanquishMap[questDate];
    if (!todayArea) {
      console.log(`[Zaishen] No vanquish found for date ${questDate}`);
      return;
    }
    
    console.log(`[Zaishen] Today's vanquish: ${todayArea}`);
    
    // Find the campaign that contains this area
    const areaData = data.find(d => d.area === todayArea);
    if (!areaData) {
      console.log(`[Zaishen] Area "${todayArea}" not found in data`);
      return;
    }
    
    const campaign = areaData.campaign;
    console.log(`[Zaishen] Campaign: ${campaign}`);
    
    // Set campaign dropdown
    const campaignSelect = document.getElementById("campaign");
    campaignSelect.value = campaign;
    
    // Trigger updateAreas to populate area dropdown
    updateAreas();
    
    // Small delay to ensure area dropdown is populated
    setTimeout(() => {
      const areaSelect = document.getElementById("area");
      areaSelect.value = todayArea;
      
      // Trigger renderFoes to show the vanquish
      renderFoes();
      
      console.log(`[Zaishen] ✓ Auto-selected: ${campaign} > ${todayArea}`);
    }, 100);
    
  } catch (err) {
    // Fail silently on any unexpected error
    console.log("[Zaishen] Auto-select skipped");
  }
}

// ===== End Zaishen Auto-selector =====

// Load JSON data
fetch("data.json")
  .then(res => res.json())
  .then(json => {
    data = json;
    initCampaigns();
  })
  .catch(err => console.error("Failed to load data.json:", err));

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
  
  // Try to auto-select today's Zaishen Vanquish
  autoSelectZaishenVanquish();
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

  // --- Insert area title with filters ---
  const titleContainer = document.createElement("div");
  titleContainer.className = "area-title";
  titleContainer.innerHTML = `
    <span>${area}</span>
    <span class="area-filters">
      <label title="Show only skills with effects">
        <input type="checkbox" id="filterUnique" ${filterUniqueChecked ? 'checked' : ''}>
        <i class="fas fa-filter"></i>
      </label>
      <label title="Hide elite skills without effects">
        <input type="checkbox" id="filterElites" ${filterElitesChecked ? 'checked' : ''}>
        <i class="fas fa-star"></i>
      </label>
    </span>
  `;
  results.appendChild(titleContainer);

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
    f.skills.forEach(s => s.effects.forEach(e => activeEffects.add(e)));
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
  cardsContainer.className = "cards-container";
  results.appendChild(cardsContainer);

  // --- Determine if filtering for unique effects ---
  const filterUnique = document.getElementById("filterUnique").checked;
  const filterElites = document.getElementById("filterElites").checked;

  // --- Render each foe and collect cards ---
  const cardsList = [];
  
  areaData.foes.forEach(f => {
    const card = document.createElement("div");
    card.className = "foe-card";

    // Filter skills based on active filters
    let skillsToShow = f.skills;
    
    if (filterUnique && f.skills.length) {
      // Show only skills that have at least one effect (non-empty effects array)
      skillsToShow = skillsToShow.filter(s => s.effects && s.effects.length > 0);
    }
    
    if (filterElites && f.skills.length) {
      // Hide skills where "Elite" is the only effect
      skillsToShow = skillsToShow.filter(s => {
        if (!s.effects || s.effects.length === 0) return true;
        if (s.effects.length === 1 && s.effects[0] === "Elite") return false;
        return true;
      });
    }

    // Automatically minimize card if no skills remain after filtering
    const shouldMinimize = skillsToShow.length === 0;
    if (shouldMinimize) {
      card.classList.add("minimized");
    }

    const skillsHTML = (skillsToShow.length ? skillsToShow : [{name: "No skills with effects", effects: []}])
      .map(s => {
        const badgesHTML = s.effects.map(e =>
          `<span class="effect-badge ${formatEffectClass(e)}">${shortEffectName(e)}</span>`
        ).join("");
        const imgHTML = s.wiki_link ? `<img class="skill-image" src="${s.wiki_link}" alt="${s.name}">` : "";
        const effectsContainer = s.effects.length ? `<div class="skill-effects">${badgesHTML}</div>` : "";
        return `<div class="skill"><div class="skill-name" title="${s.name}">${s.name}</div>${imgHTML}${effectsContainer}</div>`;
      }).join("");

    const variantClass = f.variant ? " variant" : "";
    const variantTooltip = f.variant ? ` title="Foe may have different build (area/campaign)"` : "";

    card.innerHTML = `
      <div class="card-header">
        <button class="toggle-btn" title="Toggle card">${shouldMinimize ? "▶" : "▼"}</button>
        <h3><a href="${f.wiki_url}" target="_blank" class="foe-link${variantClass}"${variantTooltip}>${f.name}</a></h3>
      </div>
      <div class="card-content">
        <div class="skills">${skillsHTML}</div>
      </div>
    `;

    // Add toggle functionality
    const toggleBtn = card.querySelector(".toggle-btn");
    toggleBtn.addEventListener("click", () => {
      card.classList.toggle("minimized");
      toggleBtn.textContent = card.classList.contains("minimized") ? "▶" : "▼";
    });

    // Store card with its minimized status for sorting
    cardsList.push({ card, minimized: shouldMinimize });
  });

  // Sort cards: non-minimized first, minimized last
  cardsList.sort((a, b) => {
    if (a.minimized === b.minimized) return 0;
    return a.minimized ? 1 : -1;
  });

  // Append all cards in sorted order
  cardsList.forEach(item => {
    cardsContainer.appendChild(item.card);
  });
}


function formatEffectClass(effect) {
  return effect.toLowerCase(); //
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