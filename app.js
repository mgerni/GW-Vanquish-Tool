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
        const imgHTML = s.wiki_link ? (s.skill_page_url ? `<a href="${s.skill_page_url}" target="_blank"><img class="skill-image" src="${s.wiki_link}" alt="${s.name}"></a>` : `<img class="skill-image" src="${s.wiki_link}" alt="${s.name}">`) : "";
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