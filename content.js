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

    // Fetch all problems once to build a rating map
    let ratingMap = new Map();
    try {
        const respAll = await fetch('https://codeforces.com/api/problemset.problems');
        const dataAll = await respAll.json();
        if (dataAll.status === 'OK') {
            for (const p of dataAll.result.problems) {
                ratingMap.set(p.contestId + p.index, p.rating);
            }
        }
    } catch (e) {
        console.error('Error fetching problem list:', e);
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
      // Handle submissions page
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
        
        // Match problemset or contest/gym URLs
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
        // add rating display
        const rating = ratingMap.get(problemKey);
        if (rating) {
            const rspan = document.createElement('span');
            rspan.className = 'cf-solved-rating';
            rspan.style.marginLeft = '5px';
            rspan.style.color = 'purple'; // Changed to purple for better visibility
            rspan.textContent = `[${rating}]`;
            link.appendChild(rspan);
        }
        console.log('Added indicator for:', problemKey);
      });
    }
    
    console.log('Finished processing all problem elements');
  })();
}

// Inject comparison table on profile pages
(async function(){
  const m = location.pathname.match(/^\/profile\/([^\/]+)/);
  if (!m) return;
  const pageUser = m[1];
  const myUser = await new Promise(r=>{
    chrome.storage.sync.get(['cf_username'], d=>r(d.cf_username||'b_i_b'));
  });
  if (pageUser === myUser) return;

  // fetch all problems → rating map
  const ratingMap = new Map();
  try {
    const all = await fetch('https://codeforces.com/api/problemset.problems').then(r=>r.json());
    all.result.problems.forEach(p=>ratingMap.set(p.contestId+p.index, p.rating));
  } catch {}

  // count solves by rating, dedupe each problem, return map + total
  async function counts(user){
    const cnt = new Map();
    const seen = new Set();
    const res = await fetch(
      `https://codeforces.com/api/user.status?handle=${user}&from=1&count=10000`
    ).then(r=>r.json());
    res.result.forEach(s=>{
      if (s.verdict==='OK'){
        const key = s.problem.contestId + s.problem.index;
        if (seen.has(key)) return;
        seen.add(key);
        const r = ratingMap.has(key) ? ratingMap.get(key) : 'Unknown';
        cnt.set(r,(cnt.get(r)||0)+1);
      }
    });
    return { cnt, total: seen.size };
  }

  const [res1, res2] = await Promise.all([counts(pageUser), counts(myUser)]);
  const c1 = res1.cnt, c2 = res2.cnt;
  const total1 = res1.total, total2 = res2.total;

  // merge ratings, sorting numeric and appending "Unknown" last
  const allKeys = [...new Set([...c1.keys(), ...c2.keys()])];
  const nums = allKeys.filter(x=>typeof x==='number').sort((a,b)=>a-b);
  const ratings = allKeys.includes('Unknown') ? [...nums,'Unknown'] : nums;

  // build table
  const tbl = document.createElement('table');
  tbl.style = 'width:100%;border:1px solid #ccc;border-collapse:collapse;margin:1em 0';

  // mkRow now takes a total parameter
  function mkRow(label, map, total, bgColor){
    const tr = document.createElement('tr');
    tr.style.backgroundColor = bgColor;
    const td0 = document.createElement('td');
    td0.textContent = label;
    td0.style = 'border:1px solid #ccc;padding:4px;font-weight:bold';
    tr.appendChild(td0);
    ratings.forEach(r=>{
      const td = document.createElement('td');
      td.textContent = map.get(r) || 0;
      td.style = 'border:1px solid #ccc;padding:4px;text-align:center';
      tr.appendChild(td);
    });
    // use total from seen.size
    const tdTotal = document.createElement('td');
    tdTotal.textContent = total;
    tdTotal.style = 'border:1px solid #ccc;padding:4px;text-align:center;font-weight:bold';
    tr.appendChild(tdTotal);
    return tr;
  }

  // header row of ratings + Total
  const hdr = document.createElement('tr');
  hdr.style.backgroundColor = '#adb5bd';  // darker gray
  hdr.appendChild((()=>{
    const td=document.createElement('td');
    td.textContent='Rating';
    td.style='border:1px solid #ccc;padding:4px;font-weight:bold';
    return td;
  })());
  ratings.forEach(r=>{
    const td = document.createElement('td');
    td.textContent = r.toString();
    td.style = 'border:1px solid #ccc;padding:4px;text-align:center';
    hdr.appendChild(td);
  });
  // add Total header
  const tdTotHdr = document.createElement('td');
  tdTotHdr.textContent = 'Total';
  tdTotHdr.style = 'border:1px solid #ccc;padding:4px;text-align:center;font-weight:bold';
  hdr.appendChild(tdTotHdr);

  // append rows
  tbl.appendChild(mkRow(pageUser, c1, total1, '#d1e7ff'));
  tbl.appendChild(mkRow(myUser, c2, total2, '#fff3cd'));
  tbl.appendChild(hdr);

  // append below main content
  const container = document.createElement('div');
  // allow horizontal scroll if table is too wide
  container.style = 'background:#f9f9f9;padding:10px;overflow-x:auto;';

  const title = document.createElement('h4');
  title.textContent = `Solved count by rating: ${pageUser} vs ${myUser}`;
  title.style = 'margin:0 0 .5em';
  container.appendChild(title);
  // wrap table in a block so overflow-x works
  tbl.style.display = 'block';
  tbl.style.width = 'max-content';
  container.appendChild(tbl);
  (document.querySelector('#pageContent')||document.body).appendChild(container);
})();

