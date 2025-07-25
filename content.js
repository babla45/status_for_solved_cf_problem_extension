console.log('Content script loaded, current pathname:', window.location.pathname);

// Check if this is ANY submissions page (for any user)
if (window.location.pathname.includes('/submissions/')) {
  console.log('Detected submissions page for any user');
  
  (async function () {
    // Always check solved status for b_i_b, regardless of whose submissions we're viewing
    const username = "b_i_b";
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
      console.log('Solved problems loaded for b_i_b:', solvedSet.size);
    } catch (e) {
      console.error('Error fetching solved problems:', e);
      return;
    }

    // Wait for DOM to be ready and table to load
    function waitForElements() {
      return new Promise((resolve) => {
        const check = () => {
          const table = document.querySelector('table.status-frame-datatable');
          const problemCells = table ? table.querySelectorAll('td[data-problemid]') : [];
          if (table && problemCells.length > 0) {
            console.log('Table and problem cells found:', problemCells.length);
            resolve();
          } else {
            console.log('Waiting for table and cells...');
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

    const table = document.querySelector('table.status-frame-datatable');
    if (!table) {
      console.log('No table found');
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
      // Contest: /contest/2125/problem/A
      // Gym: /gym/105242/problem/G
      const match = href && href.match(/\/(?:contest|gym)\/(\d+)\/problem\/([A-Z0-9]+)/);
      if (!match) {
        console.log('No match for href:', href);
        return;
      }
      
      const contestId = match[1];
      const problemIndex = match[2];
      const problemKey = contestId + problemIndex;
      
      console.log('Problem key:', problemKey, 'Solved by b_i_b:', solvedSet.has(problemKey));
      
      const span = document.createElement('span');
      span.className = 'cf-solved-indicator';
      span.style.fontWeight = 'bold';
      span.style.marginLeft = '5px';
      
      if (solvedSet.has(problemKey)) {
        span.textContent = '✓';
        span.style.color = 'green';
        span.title = 'Solved by b_i_b';
      } else {
        span.textContent = '✗';
        span.style.color = 'red';
        span.title = 'Not solved by b_i_b';
      }
      
      link.appendChild(span);
      console.log('Added indicator for:', problemKey);
    });
    
    console.log('Finished processing all problem cells');
  })();
}

