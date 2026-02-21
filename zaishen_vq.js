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
 * Fetch today's Zaishen Vanquish from the wiki cycles table via MediaWiki API
 * Returns the quest name (area) for today, or null if not found
 */
async function getTodaysZaishenVanquish() {
  try {
    const todayDate = getDateForZaishen();
    console.log('[Zaishen Vanquish] Today\'s date:', todayDate);
    
    // Use CORS proxy to bypass CORS restrictions
    const corsProxy = 'https://corsproxy.io/?';
    const apiUrl = 'https://wiki.guildwars.com/api.php';
    const params = new URLSearchParams({
      action: 'query',
      titles: 'Zaishen_Vanquish/cycles',
      prop: 'revisions',
      rvprop: 'content',
      format: 'json'
    });
    
    const fullUrl = corsProxy + encodeURIComponent(`${apiUrl}?${params}`);
    console.log('[Zaishen Vanquish] Fetching via CORS proxy...');
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error(`[Zaishen Vanquish] Failed to fetch: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    console.log('[Zaishen Vanquish] API response received');
    
    const pages = data.query?.pages;
    if (!pages) {
      console.error('[Zaishen Vanquish] Invalid API response - no pages');
      return null;
    }
    
    const pageId = Object.keys(pages)[0];
    const revisions = pages[pageId].revisions;
    
    if (!revisions || revisions.length === 0) {
      console.error('[Zaishen Vanquish] No revisions found');
      return null;
    }
    
    const pageContent = revisions[0]['*'];
    if (!pageContent) {
      console.error('[Zaishen Vanquish] No page content found');
      return null;
    }
    
    const lines = pageContent.split('\n');
    let questName = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.includes(todayDate) && line.includes('||')) {
        if (i > 0) {
          const prevLine = lines[i - 1].trim();
          
          let areaName = prevLine;
          areaName = areaName.replace(/^\|+/, '').trim();
          areaName = areaName.replace(/\[\[([^\]]*\|)?([^\]]*)\]\]/g, '$2');
          areaName = areaName.replace(/[\[\]\|]/g, '').trim();
          
          if (areaName && !areaName.includes('||')) {
            questName = areaName;
            console.log('[Zaishen Vanquish] SUCCESS:', questName);
            break;
          }
        }
      }
    }
    
    if (!questName) {
      console.log('[Zaishen Vanquish] No vanquish found for date:', todayDate);
    }
    
    return questName;
    
  } catch (err) {
    console.error('[Zaishen Vanquish] Error:', err.message);
    return null;
  }
}

/**
 * Fetch today's Zaishen Mission from the wiki page
 * Extracts mission from "The current available quest" text
 * Returns the quest name (mission) for today, or null if not found
 */
async function getTodaysZaishenMission() {
  try {
    console.log('[Zaishen Mission] Fetching from wiki via API...');
    
    // Use CORS proxy to bypass CORS restrictions
    const corsProxy = 'https://corsproxy.io/?';
    const apiUrl = 'https://wiki.guildwars.com/api.php';
    const params = new URLSearchParams({
      action: 'query',
      titles: 'Zaishen_Mission',
      prop: 'extracts',
      explaintext: true,
      format: 'json'
    });
    
    const fullUrl = corsProxy + encodeURIComponent(`${apiUrl}?${params}`);
    console.log('[Zaishen Mission] Fetching via CORS proxy...');
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error(`[Zaishen Mission] Failed to fetch: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    console.log('[Zaishen Mission] API response received');
    
    const pages = data.query?.pages;
    if (!pages) {
      console.error('[Zaishen Mission] Invalid API response - no pages');
      return null;
    }
    
    const pageId = Object.keys(pages)[0];
    const extract = pages[pageId].extract;
    
    if (!extract) {
      console.error('[Zaishen Mission] No extract found');
      return null;
    }
    
    console.log('[Zaishen Mission] Extract length:', extract.length);
    
    // Look for "The current available quest" pattern
    const match = extract.match(/The current available quest,.*?is\s+([^(]+?)\s*(?:\(Zaishen quest\)|\.)/);
    if (match) {
      const missionName = match[1].trim();
      console.log('[Zaishen Mission] SUCCESS:', missionName);
      return missionName;
    }
    
    console.warn('[Zaishen Mission] Could not find mission in extract');
    console.log('[Zaishen Mission] Extract preview:', extract.substring(0, 500));
    return null;
    
  } catch (err) {
    console.error('[Zaishen Mission] Error:', err.message);
    return null;
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getTodaysZaishenVanquish, getTodaysZaishenMission, getDateForZaishen };
}

// Start fetching immediately (don't wait for DOMContentLoaded)
(async () => {
  console.log('[Zaishen] Starting Zaishen data fetch...');
  
  const vanquishName = await getTodaysZaishenVanquish();
  if (vanquishName) {
    window.todaysZaishenArea = vanquishName;
    console.log('[Zaishen] Set vanquish area:', vanquishName);
  } else {
    console.log('[Zaishen] No vanquish area found');
  }
  
  const missionName = await getTodaysZaishenMission();
  if (missionName) {
    window.todaysZaishenMission = missionName;
    console.log('[Zaishen] Set mission:', missionName);
  } else {
    console.log('[Zaishen] No mission found - window.todaysZaishenMission will be undefined');
  }
})();