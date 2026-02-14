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

// Render foes for selected campaign + area
function renderFoes() {
  const campaign = document.getElementById("campaign").value;
  const area = document.getElementById("area").value;

  const results = document.getElementById("results");
  results.innerHTML = "";

  const areaData = data.find(d => d.campaign === campaign && d.area === area);
  if (!areaData) return;

  areaData.foes.forEach(f => {
    const card = document.createElement("div");
    card.className = "foe";

    const skillList = f.skills
      .map(s => {
        if (s.effects.length)
          return `<li>${s.name} <span class="effect-badge">${s.effects.join(", ")}</span></li>`;
        else
          return `<li>${s.name}</li>`;
      })
      .join("");

    card.innerHTML = `
      <h3><a href="${f.wiki}" target="_blank">${f.name}</a></h3>
      <ul>${skillList}</ul>
    `;

    results.appendChild(card);
  });
}
