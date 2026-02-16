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
    
    // Use MediaWiki API to fetch page content
    const apiUrl = 'https://wiki.guildwars.com/api.php';
    const params = new URLSearchParams({
      action: 'query',
      titles: 'Zaishen_Vanquish/cycles',
      prop: 'revisions',  // Get revisions to access page content
      rvprop: 'content',  // Get the actual content
      format: 'json',
      origin: '*'  // Enable CORS
    });
    
    const response = await fetch(`${apiUrl}?${params}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error(`[Zaishen] Failed to fetch: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    // Extract page content from API response
    const pages = data.query?.pages;
    if (!pages) {
      console.error('[Zaishen] Invalid API response - no pages found');
      return null;
    }
    
    const pageId = Object.keys(pages)[0];
    const revisions = pages[pageId].revisions;
    
    if (!revisions || revisions.length === 0) {
      console.error('[Zaishen] No revisions found');
      return null;
    }
    
    const pageContent = revisions[0]['*'];  // The '*' key contains the page content
    
    if (!pageContent) {
      console.error('[Zaishen] No page content found');
      return null;
    }
    
    // Parse the wikitext - look for table rows with multiple dates
    const lines = pageContent.split('\n');
    
    let questName = null;
    
    // In wiki markup, tables have format:
    // | AreaName1 || AreaName2
    // | date1 || date2 || date3 || ... || 26-02-16 || ...
    // Look for the line containing our date, then get area name from previous line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if this line contains the date we're looking for
      if (line.includes(todayDate) && line.includes('||')) {
        // The area name is likely on the previous line
        if (i > 0) {
          const prevLine = lines[i - 1].trim();
          
          // Extract area name from previous line
          let areaName = prevLine;
          
          // Remove leading | if present
          areaName = areaName.replace(/^\|+/, '').trim();
          // Remove wiki links [[Link|Display]] -> Display or [[Link]] -> Link
          areaName = areaName.replace(/\[\[([^\]]*\|)?([^\]]*)\]\]/g, '$2');
          // Remove any remaining brackets or pipes
          areaName = areaName.replace(/[\[\]\|]/g, '').trim();
          
          if (areaName && !areaName.includes('||')) {
            questName = areaName;
            break;
          }
        }
      }
    }
    
    if (questName) {
      return questName;
    } else {
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

// Start fetching immediately (don't wait for DOMContentLoaded)
(async () => {
  const questName = await getTodaysZaishenVanquish();
  if (questName) {
    window.todaysZaishenArea = questName;
  }
})();