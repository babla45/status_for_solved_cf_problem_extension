console.log('Content script loaded, current pathname:', window.location.pathname);

// Check if this is ANY submissions page (for any user) OR problemset page
if (window.location.pathname.includes('/submissions/') || window.location.pathname.includes('/problemset')) {
  console.log('Detected submissions or problemset page');
  
  (async function () {
    // Get username from storage, default to b_i_b
    const username = await new Promise(resolve => {
      chrome.storage.sync.get(['cf_username'], function(result) {
        resolve(result.cf_username || 'b_i_b');
      });
    });
    
    console.log('Using username:', username);
    let solvedSet = new Set();
    
    try {
      console.log('Fetching solved problems for:', username);
      const resp = await fetch(`https://codeforces.com/api/user.status?handle=${encodeURIComponent(username)}&from=1&count=10000`);
      const data = await resp.json();
      if (data.status === "OK") {
        for (const sub of data.result) {
          if (sub.verdict === "OK" && sub.problem && sub.problem.contestId && sub.problem.index) {
            solvedSet.add(sub.problem.contestId + sub.problem.index);
          }
        }
      }
      console.log('Solved problems loaded for', username + ':', solvedSet.size);
    } catch (e) {
      console.error('Error fetching solved problems:', e);
      return;
    }

    // Wait for DOM to be ready and table to load
    function waitForElements() {
      return new Promise((resolve) => {
        const check = () => {
          let table, problemElements;
          
          if (window.location.pathname.includes('/problemset')) {
            // Problemset page structure - look for table.problems
            table = document.querySelector('table.problems');
            problemElements = table ? table.querySelectorAll('td.id a[href*="/problem/"]') : [];
          } else {
            // Submissions page structure
            table = document.querySelector('table.status-frame-datatable');
            problemElements = table ? table.querySelectorAll('td[data-problemid]') : [];
          }
          
          if (table && problemElements.length > 0) {
            console.log('Table and problem elements found:', problemElements.length);
            resolve();
          } else {
            console.log('Waiting for table and elements...');
            setTimeout(check, 500);
          }
        };
        
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', check);
        } else {
          check();
        }
      });
    }

    await waitForElements();

    if (window.location.pathname.includes('/problemset')) {
      // Handle problemset page
      const table = document.querySelector('table.problems');
      if (!table) {
        console.log('No problemset table found');
        return;
      }

      // Find all problem links in the ID column (td.id)
      const problemLinks = table.querySelectorAll('td.id a[href*="/problem/"]');
      console.log('Processing problemset links:', problemLinks.length);

      problemLinks.forEach(link => {
        // Check if indicator already exists
        if (link.querySelector('.cf-solved-indicator')) return;
        
        const href = link.getAttribute('href');
        console.log('Processing problemset link:', href);

        // Match either problemset or contest/gym URLs
        let match = href.match(/\/problemset\/problem\/(\d+)\/([A-Z0-9]+)/);
        let contestId, problemIndex;
        if (match) {
          contestId = match[1];
          problemIndex = match[2];
        } else {
          match = href.match(/\/(?:contest|gym)\/(\d+)\/problem\/([A-Z0-9]+)/);
          if (!match) {
            console.log('No match for href:', href);
            return;
          }
          contestId = match[1];
          problemIndex = match[2];
        }
        const problemKey = contestId + problemIndex;
        
        console.log('Problem key:', problemKey, 'Solved by', username + ':', solvedSet.has(problemKey));
        
        const span = document.createElement('span');
        span.className = 'cf-solved-indicator';
        span.style.fontWeight = 'bold';
        span.style.marginLeft = '5px';
        
        if (solvedSet.has(problemKey)) {
          span.textContent = '✓';
          span.style.color = 'green';
          span.title = `Solved by ${username}`;
        } else {
          span.textContent = '✗';
          span.style.color = 'red';
          span.title = `Not solved by ${username}`;
        }
        
        link.appendChild(span);
        console.log('Added indicator for:', problemKey);
      });
    } else {
      // Handle submissions page (existing code)
      const table = document.querySelector('table.status-frame-datatable');
      if (!table) {
        console.log('No submissions table found');
        return;
      }

      const problemCells = table.querySelectorAll('td[data-problemid]');
      console.log('Processing problem cells:', problemCells.length);

      problemCells.forEach(cell => {
        const link = cell.querySelector('a');
        if (!link) return;
        
        // Check if indicator already exists
        if (link.querySelector('.cf-solved-indicator')) return;
        
        const href = link.getAttribute('href');
        console.log('Processing link:', href);
        
        // Match both contest and gym problem URLs
        const match = href && href.match(/\/(?:contest|gym)\/(\d+)\/problem\/([A-Z0-9]+)/);
        if (!match) {
          console.log('No match for href:', href);
          return;
        }
        
        const contestId = match[1];
        const problemIndex = match[2];
        const problemKey = contestId + problemIndex;
        
        console.log('Problem key:', problemKey, 'Solved by', username + ':', solvedSet.has(problemKey));
        
        const span = document.createElement('span');
        span.className = 'cf-solved-indicator';
        span.style.fontWeight = 'bold';
        span.style.marginLeft = '5px';
        
        if (solvedSet.has(problemKey)) {
          span.textContent = '✓';
          span.style.color = 'green';
          span.title = `Solved by ${username}`;
        } else {
          span.textContent = '✗';
          span.style.color = 'red';
          span.title = `Not solved by ${username}`;
        }
        
        link.appendChild(span);
        console.log('Added indicator for:', problemKey);
      });
    }
    
    console.log('Finished processing all problem elements');
  })();
}

