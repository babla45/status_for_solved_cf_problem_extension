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
  const myUser = await new Promise(r=>{ chrome.storage.sync.get(['cf_username'], d=>r(d.cf_username||'b_i_b')); });
  if (pageUser === myUser) return;

  // load stored compare list
  let compareList = await new Promise(r=>{ chrome.storage.local.get(['compare_list'], d=>r(d.compare_list||[])); });
  if (!compareList.includes(myUser)) compareList.unshift(myUser);

  // Create one wrapper for controls + table
  const wrapper = document.createElement('div');
  wrapper.style =
    'background:#ffffff; padding:12px; margin:12px 0; overflow-x:auto; ' +
    'border:1px solid #ddd; border-radius:6px; ' +
    'box-shadow:0 2px 4px rgba(0,0,0,0.05)';

  // Colors for handles - define early so it can be used throughout the code
  const handleColors = [
    '#3498db', // blue
    '#e74c3c', // red
    '#2ecc71', // green
    '#9b59b6', // purple
    '#f39c12', // orange
    '#1abc9c', // teal
    '#d35400', // dark orange
    '#8e44ad'  // violet
  ];

  // Create UI controls container first
  const ui = document.createElement('div');
  ui.style = 'margin-bottom:16px; display:flex; flex-wrap:wrap; align-items:center; gap:10px';

  // Create checkbox and label
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.id = 'cf-compare-add';
  cb.checked = compareList.includes(pageUser);
  cb.style = 'margin:0; transform:scale(1.15); cursor:pointer';
  cb.addEventListener('change', () => {
    if (cb.checked) {
      if (!compareList.includes(pageUser)) compareList.push(pageUser);
    } else {
      compareList = compareList.filter(u => u !== pageUser);
    }
    chrome.storage.local.set({compare_list: compareList}, () => location.reload());
  });

  const label = document.createElement('label');
  label.htmlFor = 'cf-compare-add';
  label.textContent = ` Include ${pageUser} in comparison`;
  label.style = 'margin-left:6px; color:green; font-weight:700; cursor:pointer';

  // Style checkbox and label as a group
  const checkboxGroup = document.createElement('div');
  checkboxGroup.style = 'display:flex; align-items:center';
  checkboxGroup.appendChild(cb);
  checkboxGroup.appendChild(label);
  ui.appendChild(checkboxGroup);

  // Toggle button to show/hide batch-add inputs
  const showBatchBtn = document.createElement('button');
  showBatchBtn.textContent = 'Add multiple handles';
  showBatchBtn.style = 
    'padding:6px 12px; font-size:13px; cursor:pointer; ' +
    'background-color:#6c5ce7; color:#fff; border:none; border-radius:4px; ' +
    'transition:all .2s; font-weight:500; box-shadow:0 2px 4px rgba(0,0,0,0.1)';
  showBatchBtn.addEventListener('mouseover', () => {
    showBatchBtn.style.backgroundColor = '#533feb';
    showBatchBtn.style.transform = 'translateY(-1px)';
    showBatchBtn.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
  });
  showBatchBtn.addEventListener('mouseout', () => {
    showBatchBtn.style.backgroundColor = '#6c5ce7';
    showBatchBtn.style.transform = 'translateY(0)';
    showBatchBtn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
  });
  ui.appendChild(showBatchBtn);

  // Batch-add area (hidden by default)
  const batchDiv = document.createElement('div');
  batchDiv.style = 
    'margin:8px 0 12px 0px; display:none; padding:12px; width:100%; ' +
    'background-color:#f8f9fa; border:1px solid #e9ecef; border-radius:6px; ' +
    'box-shadow:inset 0 1px 3px rgba(0,0,0,0.1)';

  const batchInput = document.createElement('input');
  batchInput.type = 'text';
  batchInput.placeholder = 'Enter handles (comma separated)';
  batchInput.style = 
    'width:70%; padding:8px 12px; font-size:14px; margin-right:10px; ' +
    'border:1px solid #ced4da; border-radius:4px; transition:all 0.2s';
  
  batchInput.addEventListener('focus', () => {
    batchInput.style.boxShadow = '0 0 0 3px rgba(108, 92, 231, 0.25)';
    batchInput.style.borderColor = '#6c5ce7';
  });
  
  batchInput.addEventListener('blur', () => {
    batchInput.style.boxShadow = 'none';
    batchInput.style.borderColor = '#ced4da';
  });

  const batchBtn = document.createElement('button');
  batchBtn.textContent = 'Add handles';
  batchBtn.style = 
    'padding:8px 14px; font-size:13px; cursor:pointer; ' +
    'background-color:#28a745; color:#fff; border:none; border-radius:4px; ' +
    'transition:all .2s; font-weight:500; box-shadow:0 2px 3px rgba(0,0,0,0.1)';
  
  batchBtn.addEventListener('mouseover', () => {
    batchBtn.style.backgroundColor = '#218838';
    batchBtn.style.transform = 'translateY(-1px)';
    batchBtn.style.boxShadow = '0 3px 5px rgba(0,0,0,0.15)';
  });
  
  batchBtn.addEventListener('mouseout', () => {
    batchBtn.style.backgroundColor = '#28a745';
    batchBtn.style.transform = 'translateY(0)';
    batchBtn.style.boxShadow = '0 2px 3px rgba(0,0,0,0.1)';
  });

  batchBtn.addEventListener('click', () => {
    const text = batchInput.value.trim();
    if (!text) return;
    const handles = text.split(/[\s,;]+/).map(h => h.trim()).filter(h => h);
    handles.forEach(h => { if (!compareList.includes(h)) compareList.push(h); });
    chrome.storage.local.set({ compare_list: compareList }, () => location.reload());
  });

  showBatchBtn.addEventListener('click', () => {
    batchDiv.style.display = batchDiv.style.display === 'none' ? 'block' : 'none';
  });

  batchDiv.appendChild(batchInput);
  batchDiv.appendChild(batchBtn);

  // append controls into wrapper
  wrapper.appendChild(ui);
  wrapper.appendChild(batchDiv);

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
    console.log(`Fetching data for user: ${u}`);
    try {
      const d = await getCountsWithCache(u);
      results.push(d);
      console.log(`Data loaded for ${u}:`, d.total, 'solved problems');
    } catch (err) {
      console.error(`Error loading data for ${u}:`, err);
      // Add empty result to maintain array alignment with compareList
      results.push({cnt: new Map(), total: 0});
    }
  }

  console.log('Completed loading data for all users');

  // merge ratings keys
  const allKeys = [
    ...new Set(
      results.flatMap(r => [...r.cnt.keys()])
    )
  ];
  const nums = allKeys.filter(x => typeof x === 'number').sort((a, b) => a - b);
  const ratings = allKeys.includes('Unknown') ? [...nums, 'Unknown'] : nums;

  // build table with improved styling
  const tbl = document.createElement('table');
  tbl.style = 'width:100%; border:1px solid #ccc; border-collapse:collapse; margin:1em 0; box-shadow:0 1px 3px rgba(0,0,0,0.1);';

  // header with better styling
  const hdr = document.createElement('tr');
  hdr.style.backgroundColor = '#4a69bd'; // Darker blue header
  
  // User column header
  const thUser = document.createElement('th');
  thUser.textContent = 'User';
  thUser.style = 'border:1px solid #ccc; padding:8px; text-align:left; color:white; font-weight:bold;';
  hdr.appendChild(thUser);
  
  // Rating column headers
  ratings.forEach(r => {
    const th = document.createElement('th');
    th.textContent = r.toString();
    th.style = 'border:1px solid #ccc; padding:8px; text-align:center; color:white;';
    hdr.appendChild(th);
  });
  
  // Total column header
  const thTotal = document.createElement('th');
  thTotal.textContent = 'Total';
  thTotal.style = 'border:1px solid #ccc; padding:8px; text-align:center; color:white; font-weight:bold;';
  hdr.appendChild(thTotal);
  
  // Actions column header
  const thAction = document.createElement('th');
  thAction.textContent = 'Action';
  thAction.style = 'border:1px solid #ccc; padding:8px; text-align:center; color:white;';
  hdr.appendChild(thAction);
  
  tbl.appendChild(hdr);

  // Add debugging to check if any data exists
  if (results.length === 0) {
    console.warn('No results loaded - table will be empty');
  }

  // Colors for rows - restore the previous colors
  const colors = ['#d1e7ff','#fff3cd','#d4edda','#f8d7da','#e2e3e5'];
  
  // mkRow with hover effect and better styling
  function mkRow(user, {cnt,total}, idx) {
    const bgColor = colors[idx % colors.length];
    const tr = document.createElement('tr');
    tr.style = `background-color:${bgColor}; transition:background-color 0.2s;`;
    
    // Add hover effect
    tr.addEventListener('mouseover', () => {
      tr.style.backgroundColor = '#e8f4f8';
    });
    tr.addEventListener('mouseout', () => {
      tr.style.backgroundColor = bgColor;
    });
    
    // User cell with colored username matching the title
    const td0 = document.createElement('td');
    td0.style = `border:1px solid #ccc; padding:8px; font-weight:bold; color:${handleColors[idx % handleColors.length]};`;
    td0.textContent = user;
    tr.appendChild(td0);
    
    // Data cells
    ratings.forEach(r => {
      const td = document.createElement('td');
      td.textContent = cnt.get(r) || 0;
      td.style = 'border:1px solid #ccc; padding:8px; text-align:center;';
      tr.appendChild(td);
    });
    
    // Total cell with highlighted background
    const tdTot = document.createElement('td');
    tdTot.textContent = total;
    tdTot.style = 'border:1px solid #ccc; padding:8px; text-align:center; font-weight:bold; background-color:rgba(0,0,0,0.03);';
    tr.appendChild(tdTot);
    
    // Exclude button cell
    const tdEx = document.createElement('td');
    tdEx.style = 'border:1px solid #ccc; padding:6px; text-align:center;';
    
    // Don't allow removing the primary user (first in list)
    if (idx > 0) {
      const btn = document.createElement('button');
      btn.textContent = 'Remove';
      btn.style = 
        'padding:4px 8px; font-size:12px; cursor:pointer; ' +
        'background-color:#dc3545; color:#fff; border:none; border-radius:3px; ' +
        'transition:all .15s; font-weight:500';
      
      btn.addEventListener('mouseover', () => {
        btn.style.backgroundColor = '#c82333';
        btn.style.transform = 'translateY(-1px)';
      });
      
      btn.addEventListener('mouseout', () => {
        btn.style.backgroundColor = '#dc3545';
        btn.style.transform = 'translateY(0)';
      });
      
      btn.addEventListener('click', () => {
        compareList = compareList.filter(u => u !== user);
        chrome.storage.local.set({compare_list: compareList}, () => location.reload());
      });
      tdEx.appendChild(btn);
    } else {
      tdEx.textContent = '(primary)';
      tdEx.style.color = '#6c757d';
      tdEx.style.fontSize = '12px';
    }
    
    tr.appendChild(tdEx);
    return tr;
  }

  // Append rows and log any errors
  compareList.forEach((u, i) => {
    try {
      if (i < results.length) {
        const row = mkRow(u, results[i], i);
        tbl.appendChild(row);
      } else {
        console.error(`Missing results for user ${u} at index ${i}`);
      }
    } catch (err) {
      console.error(`Error creating row for ${u}:`, err);
    }
  });

  // Add the title above table with colored handles
  const title = document.createElement('div');
  title.style = 'margin:0 0 1em; font-size:16px; font-weight:bold; display:flex; flex-wrap:wrap; align-items:center; gap:8px';
  
  const titlePrefix = document.createElement('span');
  titlePrefix.textContent = 'Solved count comparison by rating: ';
  title.appendChild(titlePrefix);
  
  // Create separate colored spans for each handle
  compareList.forEach((handle, idx) => {
    const handleSpan = document.createElement('span');
    handleSpan.textContent = handle;
    handleSpan.style.color = handleColors[idx % handleColors.length];
    handleSpan.style.fontWeight = 'bold';
    title.appendChild(handleSpan);
    
    // Add "vs" between handles (but not after the last one)
    if (idx < compareList.length - 1) {
      const vs = document.createElement('span');
      vs.textContent = 'vs';
      vs.style.color = '#666';
      vs.style.fontWeight = 'normal';
      vs.style.fontSize = '14px';
      title.appendChild(vs);
    }
  });
  
  // Apply gradient color to the title prefix
  titlePrefix.style = `
    background: linear-gradient(45deg, #3498db, #9b59b6, #e74c3c);
    background-size: 200% auto;
    color: transparent;
    -webkit-background-clip: text;
    background-clip: text;
    font-weight: bold;
    animation: textShimmer 3s linear infinite;
  `;
  
  // Add animation for gradient flow
  const styleTag = document.createElement('style');
  styleTag.textContent = `
    @keyframes textShimmer {
      to { background-position: 200% center; }
    }
  `;
  document.head.appendChild(styleTag);
  
  // Add title before table
  wrapper.appendChild(title);
  
  // Make sure table is appended to wrapper after title
  wrapper.appendChild(tbl);

  // finally insert the unified wrapper into the page
  const insertPoint = document.querySelector('#pageContent') || document.body;
  insertPoint.appendChild(wrapper);
  console.log('Comparison table injected into page');
})();

