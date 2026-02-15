let data = [];

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
  results.innerHTML = "";

  const areaData = data.find(d => d.campaign === campaign && d.area === area);
  if (!areaData) return;

  // --- Insert area title ---
  results.insertAdjacentHTML("beforeend", `<div class="area-title">${area}</div>`);

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

  // --- Render each foe ---
  areaData.foes.forEach(f => {
    const card = document.createElement("div");
    card.className = "foe-card";

    const skillsHTML = (f.skills.length ? f.skills : [{name: "No known skills", effects: []}])
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
        <button class="toggle-btn" title="Toggle card">▼</button>
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

    cardsContainer.appendChild(card);
  });
}


function formatEffectClass(effect) {
  return effect.toLowerCase(); //
}


function shortEffectName(effect) {
  const map = {
    Knockdown: "Knockdown",
    Resurrection: "Ressurection",
    Interrupt: "Interrupt",
    Hex_Removal: "Hex Removal",
    Condition_Removal: "Condition Removal",
    Enchantment_Removal: "Enchantment Removal",
    Monster_Skill: "Monster Skill",
    Multiple_Effects: "Multi",
    IMS: "IMS",
    Slow_Cripple: "Slow"
  };

  return map[effect] || effect;
}