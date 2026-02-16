/**
 * Zaishen Vanquish fetcher for browser
 * Fetches today's Zaishen Vanquish from the Guild Wars Wiki
 */

/**
 * Get today's quest date in YY-MM-DD format
 * Quest changes at 16:00 UTC
 */
function getDateForZaishen() {
  const now = new Date();
  // Quest changes at 16:00 UTC
  if (now.getUTCHours() < 16) {
    now.setUTCDate(now.getUTCDate() - 1);
  }
  const yy = String(now.getUTCFullYear()).slice(-2);
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/**
 * Fetch today's Zaishen Vanquish from the wiki cycles table
 * Returns the quest name (area) for today, or null if not found
 */
async function getTodaysZaishenVanquish() {
  try {
    const url = 'https://wiki.guildwars.com/wiki/Zaishen_Vanquish/cycles';
    const todayDate = getDateForZaishen();
    
    console.log(`[Zaishen] Fetching cycles for ${todayDate}...`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      credentials: 'omit',
      cache: 'no-cache'
    });
    
    if (!response.ok) {
      console.error(`[Zaishen] Failed to fetch: ${response.status}`);
      return null;
    }
    
    const html = await response.text();
    
    // Parse HTML to find the cycles table
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Find all tables
    const tables = doc.querySelectorAll('table.wikitable');
    if (tables.length === 0) {
      console.error('[Zaishen] No wikitable found');
      return null;
    }
    
    // Parse the first table
    const table = tables[0];
    const rows = table.querySelectorAll('tr');
    
    let questName = null;
    
    rows.forEach(row => {
      const cells = row.querySelectorAll('td, th');
      if (cells.length >= 2) {
        const dateText = cells[0].textContent.trim();
        const areaText = cells[1].textContent.trim();
        
        // Match today's date
        if (dateText === todayDate && areaText && areaText !== 'Area') {
          questName = areaText;
        }
      }
    });
    
    if (questName) {
      console.log(`[Zaishen] ✓ Today's Vanquish: ${questName}`);
      return questName;
    } else {
      console.log(`[Zaishen] No vanquish found for ${todayDate}`);
      return null;
    }
    
  } catch (err) {
    console.error('[Zaishen] Error:', err.message);
    return null;
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getTodaysZaishenVanquish, getDateForZaishen };
}

// Run after DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Zaishen] DOM loaded, fetching today\'s vanquish...');
  await getTodaysZaishenVanquish();
});