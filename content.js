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

  // load stored compare list
  let compareList = await new Promise(r=>{
    chrome.storage.local.get(['compare_list'], d=>r(d.compare_list||[]));
  });
  // ensure primary user is first
  if (!compareList.includes(myUser)) compareList.unshift(myUser);

  // render checkbox to add/remove this profile
  const ui = document.createElement('div');
  ui.style = 'margin:10px 0';
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.id = 'cf-compare-add';
  cb.checked = compareList.includes(pageUser);
  const label = document.createElement('label');
  label.htmlFor = 'cf-compare-add';
  label.textContent = ` Include ${pageUser} in comparison`;
  ui.appendChild(cb);
  ui.appendChild(label);
  (document.querySelector('#pageContent')||document.body).appendChild(ui);
  cb.addEventListener('change', () => {
    if (cb.checked) {
      compareList.push(pageUser);
    } else {
      compareList = compareList.filter(u=>u!==pageUser);
    }
    chrome.storage.local.set({compare_list: compareList});
    location.reload();
  });

  // fetch all problems → rating map
  const ratingMap = new Map();
  try {
    const all = await fetch('https://codeforces.com/api/problemset.problems').then(r=>r.json());
    all.result.problems.forEach(p=>ratingMap.set(p.contestId+p.index, p.rating));
  } catch {}

  // utility: delay ms
  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  // fetch or load cached counts
  async function getCountsWithCache(user) {
    const key = `cf_counts_${user}`;
    // read cache
    const cache = await new Promise(r => {
      chrome.storage.local.get([key], data => r(data[key]));
    });
    const now = Date.now();
    if (cache && cache.ts && now - cache.ts < 3600_000) {
      // reconstruct Map from stored entries
      const { cntEntries, total } = cache.data;
      return { cnt: new Map(cntEntries), total };
    }
    // throttle between API calls
    await sleep(300);
    // actual fetch
    const res = await fetch(
      `https://codeforces.com/api/user.status?handle=${user}&from=1&count=10000`
    ).then(r => r.json());
    const cnt = new Map(), seen = new Set();
    if (res.status === 'OK' && Array.isArray(res.result)) {
      res.result.forEach(s => {
        if (s.verdict === 'OK') {
          const keyp = s.problem.contestId + s.problem.index;
          if (seen.has(keyp)) return;
          seen.add(keyp);
          const r = ratingMap.has(keyp) ? ratingMap.get(keyp) : 'Unknown';
          cnt.set(r, (cnt.get(r) || 0) + 1);
        }
      });
    }
    const total = seen.size;
    // store entries array + total
    const storeData = { cntEntries: Array.from(cnt.entries()), total };
    chrome.storage.local.set({ [key]: { ts: now, data: storeData } });
    return { cnt, total };
  }

  // gather counts for each user in list, sequentially
  const results = [];
  for (const u of compareList) {
    const d = await getCountsWithCache(u);
    results.push(d);
  }

  // merge ratings keys
  const allKeys = [
    ...new Set(
      results.flatMap(r => [...r.cnt.keys()])
    )
  ];
  const nums = allKeys.filter(x => typeof x === 'number').sort((a, b) => a - b);
  const ratings = allKeys.includes('Unknown') ? [...nums, 'Unknown'] : nums;

  // build table
  const tbl = document.createElement('table');
  tbl.style = 'width:100%;border:1px solid #ccc;border-collapse:collapse;margin:1em 0';

  // header
  const hdr = document.createElement('tr');
  hdr.style.backgroundColor = '#adb5bd';
  hdr.appendChild((()=>{const td=document.createElement('td');td.textContent='Rating';td.style='border:1px solid #ccc;padding:4px;font-weight:bold';return td;})());
  ratings.forEach(r=>{
    const td=document.createElement('td');
    td.textContent=r.toString();
    td.style='border:1px solid #ccc;padding:4px;text-align:center';
    hdr.appendChild(td);
  });
  const tdTotHdr=document.createElement('td');
  tdTotHdr.textContent='Total';
  tdTotHdr.style='border:1px solid #ccc;padding:4px;text-align:center;font-weight:bold';
  hdr.appendChild(tdTotHdr);
  const tdExHdr = document.createElement('td');
  tdExHdr.textContent = 'Exclude';
  tdExHdr.style = 'border:1px solid #ccc;padding:4px;text-align:center;font-weight:bold';
  hdr.appendChild(tdExHdr);
  tbl.appendChild(hdr);

  // colors for rows
  const colors = ['#d1e7ff','#fff3cd','#d4edda','#f8d7da','#e2e3e5'];
  // mkRow
  function mkRow(user, {cnt,total}, bgColor){
    const tr=document.createElement('tr');
    tr.style.backgroundColor=bgColor;
    const td0=document.createElement('td');
    td0.textContent=user;
    td0.style='border:1px solid #ccc;padding:4px;font-weight:bold';
    tr.appendChild(td0);
    ratings.forEach(r=>{
      const td=document.createElement('td');
      td.textContent=cnt.get(r)||0;
      td.style='border:1px solid #ccc;padding:4px;text-align:center';
      tr.appendChild(td);
    });
    const tdTot=document.createElement('td');
    tdTot.textContent=total;
    tdTot.style='border:1px solid #ccc;padding:4px;text-align:center;font-weight:bold';
    tr.appendChild(tdTot);

    // Exclude button cell
    const tdEx = document.createElement('td');
    const btn = document.createElement('button');
    btn.textContent = 'Remove';
    btn.style = 'padding:2px 6px;font-size:12px;cursor:pointer';
    btn.addEventListener('click', () => {
      compareList = compareList.filter(u => u !== user);
      chrome.storage.local.set({compare_list: compareList});
      location.reload();
    });
    tdEx.appendChild(btn);
    tdEx.style = 'border:1px solid #ccc;padding:4px;text-align:center';
    tr.appendChild(tdEx);

    return tr;
  }

  // append rows
  compareList.forEach((u,i)=>{
    tbl.appendChild(mkRow(u, results[i], colors[i%colors.length]));
  });

  // wrap and display
  const container=document.createElement('div');
  container.style='background:#f9f9f9;padding:10px;overflow-x:auto';
  const title=document.createElement('h4');
  title.textContent=`Solved count by rating: ${compareList.join(' vs ')}`;
  title.style='margin:0 0 .5em';
  container.appendChild(title);
  tbl.style.display='block';
  tbl.style.width='max-content';
  container.appendChild(tbl);
  (document.querySelector('#pageContent')||document.body).appendChild(container);
})();

