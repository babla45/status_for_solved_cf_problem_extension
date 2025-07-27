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

  // load stored compare list
  let compareList = await new Promise(r=>{ chrome.storage.local.get(['compare_list'], d=>r(d.compare_list||[])); });
  if (!compareList.includes(myUser)) compareList.unshift(myUser);

  // Add spinner animation style first
  const spinnerStyle = document.createElement('style');
  spinnerStyle.textContent = `
    @keyframes cf-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .cf-loading-spinner {
      display: inline-block;
      width: 40px;
      height: 40px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #3498db;
      border-radius: 50%;
      animation: cf-spin 1s linear infinite;
      margin-bottom: 16px;
    }
  `;
  document.head.appendChild(spinnerStyle);

  // Create loading indicator immediately
  const loadingWrapper = document.createElement('div');
  loadingWrapper.id = 'cf-loading-indicator';
  loadingWrapper.style = 
    'background:#ffffff; padding:40px; margin:12px 0; text-align:center; ' +
    'border:1px solid #ddd; border-radius:6px; ' +
    'box-shadow:0 2px 4px rgba(0,0,0,0.05)';
  
  const loadingSpinner = document.createElement('div');
  loadingSpinner.className = 'cf-loading-spinner';
  
  const loadingText = document.createElement('div');
  loadingText.id = 'cf-loading-text';
  loadingText.textContent = 'Loading comparison data...';
  loadingText.style = 'color:#666; font-size:16px; font-weight:500;';
  
  loadingWrapper.appendChild(loadingSpinner);
  loadingWrapper.appendChild(loadingText);
  
  // Insert loading indicator immediately where the table will be
  const insertPoint = document.querySelector('#pageContent') || document.body;
  insertPoint.appendChild(loadingWrapper);

  // Create one wrapper for controls + table (but don't show it yet)
  const wrapper = document.createElement('div');
  wrapper.style =
    'background:#ffffff; padding:12px; margin:12px 0; overflow-x:auto; ' +
    'border:1px solid #ddd; border-radius:6px; ' +
    'box-shadow:0 2px 4px rgba(0,0,0,0.05); display:none;';

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
    // Update loading text to show current progress
    const progressText = document.getElementById('cf-loading-text');
    if (progressText) {
      progressText.textContent = `Loading data for ${u}... (${results.length + 1}/${compareList.length})`;
    }
    
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
  
  // Update loading text for final step
  const progressText = document.getElementById('cf-loading-text');
  if (progressText) {
    progressText.textContent = 'Building comparison table...';
  }

  // merge ratings keys
  const allKeys = [
    ...new Set(
      results.flatMap(r => [...r.cnt.keys()])
    )
  ];
  const nums = allKeys.filter(x => typeof x === 'number').sort((a, b) => a - b);
  const ratings = allKeys.includes('Unknown') ? [...nums, 'Unknown'] : nums;

  // build table with improved styling and sticky first column
  const tbl = document.createElement('table');
  tbl.style = `
    width: 100%;
    border-collapse: collapse;
    margin: 1em 0;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    position: relative;
  `;

  // Add style for sticky first column with improved positioning
  const styleTag = document.createElement('style');
  styleTag.textContent = `
    @keyframes textShimmer {
      to { background-position: 200% center; }
    }
    
    .sticky-column {
      position: sticky;
      left: 0;
      z-index: 2;
      /* Add subtle shadow to indicate stickiness */
      box-shadow: 2px 0 5px rgba(0,0,0,0.1);
    }
    
    /* Add a container for the table with proper overflow handling */
    .cf-compare-table-container {
      width: 100%;
      overflow-x: auto;
      position: relative;
      border-radius: 4px;
    }
  `;
  document.head.appendChild(styleTag);

  // Create a dedicated container for the table to control scroll behavior
  const tableContainer = document.createElement('div');
  tableContainer.className = 'cf-compare-table-container';

  // header with better styling
  const hdr = document.createElement('tr');
  hdr.style.backgroundColor = '#4a69bd'; // Darker blue header
  
  // User column header - make sticky
  const thUser = document.createElement('th');
  thUser.textContent = 'Users ⬇';
  thUser.className = 'sticky-column';
  thUser.style = `
    border: 1px solid #ccc;
    padding: 8px;
    text-align: left;
    color: white;
    font-weight: bold;
    background-color: #4a69bd; /* Match header color */
  `;
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
  
  // Drag and drop event handlers - define these functions first
  let draggedElement = null;
  let draggedIndex = null;

  function handleDragStart(e) {
    console.log('Drag start triggered, target:', e.target);
    console.log('Event clientX:', e.clientX, 'clientY:', e.clientY);
    
    // Check if the drag is starting from the sticky column area
    const stickyColumn = this.querySelector('.sticky-column');
    if (!stickyColumn) {
      console.log('No sticky column found in this row');
      e.preventDefault();
      return false;
    }
    
    // Get the bounds of the sticky column
    const rect = stickyColumn.getBoundingClientRect();
    const isDragFromStickyColumn = e.clientX >= rect.left && e.clientX <= rect.right &&
                                   e.clientY >= rect.top && e.clientY <= rect.bottom;
    
    console.log('Sticky column bounds:', rect);
    console.log('Is drag from sticky column:', isDragFromStickyColumn);
    
    // Only allow drag if the mouse is over the sticky column
    if (!isDragFromStickyColumn) {
      console.log('Preventing drag - not from sticky column area');
      e.preventDefault();
      return false;
    }
    
    console.log('Drag allowed, starting drag for row:', this.dataset.userIndex);
    draggedElement = this;
    draggedIndex = parseInt(this.dataset.userIndex);
    this.classList.add('cf-dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.outerHTML);
  }

  function handleDragOver(e) {
    if (e.preventDefault) {
      e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
  }

  function handleDragEnter(e) {
    console.log('Drag enter on row:', this.dataset.userIndex);
    if (this !== draggedElement) {
      this.classList.add('cf-drag-over');
    }
  }

  function handleDragLeave(e) {
    this.classList.remove('cf-drag-over');
  }

  function handleDrop(e) {
    console.log('Drop event triggered');
    if (e.stopPropagation) {
      e.stopPropagation();
    }

    if (this !== draggedElement) {
      const dropIndex = parseInt(this.dataset.userIndex);
      console.log('Dropping at index:', dropIndex, 'from index:', draggedIndex);
      
      // Don't allow moving to or from index 0 (primary user)
      if (draggedIndex === 0 || dropIndex === 0) {
        console.log('Cannot move primary user');
        return false;
      }
      
      // Reorder the compareList array
      const draggedUser = compareList[draggedIndex];
      console.log('Moving user:', draggedUser);
      compareList.splice(draggedIndex, 1);
      compareList.splice(dropIndex, 0, draggedUser);
      
      // Save the new order and reload
      chrome.storage.local.set({compare_list: compareList}, () => {
        console.log('Saved new order, reloading...');
        location.reload();
      });
    }

    return false;
  }

  function handleDragEnd(e) {
    // Clean up drag styles
    const rows = document.querySelectorAll('.cf-draggable-row');
    rows.forEach(row => {
      row.classList.remove('cf-dragging', 'cf-drag-over');
    });
    draggedElement = null;
    draggedIndex = null;
  }

  // mkRow with improved hover effect and better styling
  function mkRow(user, {cnt,total}, idx) {
    const bgColor = colors[idx % colors.length];
    const tr = document.createElement('tr');
    tr.className = 'cf-draggable-row';
    tr.draggable = true;
    tr.dataset.userIndex = idx;
    tr.style = `
      background-color:${bgColor}; 
      transition: all 0.2s ease-in-out;
    `;
    
    // Add drag event listeners only to the row
    tr.addEventListener('dragstart', handleDragStart);
    tr.addEventListener('dragover', handleDragOver);
    tr.addEventListener('drop', handleDrop);
    tr.addEventListener('dragend', handleDragEnd);
    tr.addEventListener('dragenter', handleDragEnter);
    tr.addEventListener('dragleave', handleDragLeave);
    
    // Add improved hover effect with more subtle highlight
    tr.addEventListener('mouseover', () => {
      // Slightly darken the existing background color rather than replacing it
      tr.style.backgroundColor = adjustColor(bgColor, -15);
      tr.style.boxShadow = 'inset 0 0 0 1px rgba(0,0,0,0.1)';
      
      // Also update sticky cell background on hover to match
      if (td0) {
        td0.style.backgroundColor = adjustColor(bgColor, -15);
        td0.style.boxShadow = '2px 0 5px rgba(0,0,0,0.15)';
      }
    });
    
    tr.addEventListener('mouseout', () => {
      tr.style.backgroundColor = bgColor;
      tr.style.boxShadow = 'none';
      
      // Reset sticky cell background on mouseout
      if (td0) {
        td0.style.backgroundColor = bgColor;
        td0.style.boxShadow = '2px 0 5px rgba(0,0,0,0.1)';
      }
    });
    
    // User cell with colored username - make sticky
    const td0 = document.createElement('td');
    td0.className = 'sticky-column';
    td0.style = `
      border: 1px solid #ccc;
      padding: 8px;
      font-weight: bold;
      color: ${handleColors[idx % handleColors.length]};
      background-color: ${bgColor}; /* Match row color */
    `;
    
    // Only add the username text, no drag handle icon
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
  
  // Helper function to darken or lighten a color
  function adjustColor(color, amount) {
    // Convert hex to RGB first if needed
    if (color.startsWith('#')) {
      let hex = color.slice(1);
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return adjustRgbColor(r, g, b, amount);
    }
    
    // Handle rgb/rgba format
    const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1], 10);
      const g = parseInt(rgbMatch[2], 10);
      const b = parseInt(rgbMatch[3], 10);
      return adjustRgbColor(r, g, b, amount);
    }
    
    return color; // Return original if format not recognized
  }
  
  function adjustRgbColor(r, g, b, amount) {
    // Adjust each component and clamp to valid range
    const adjustComponent = c => Math.max(0, Math.min(255, c + amount));
    return `rgb(${adjustComponent(r)}, ${adjustComponent(g)}, ${adjustComponent(b)})`;
  }

  // Update the table style to ensure consistent hover timing
  const styleTag3 = document.createElement('style');
  styleTag3.textContent = `
    .cf-compare-table-container tr,
    .cf-compare-table-container td,
    .cf-compare-table-container .sticky-column {
      transition: all 0.2s ease-in-out;
    }
  `;
  document.head.appendChild(styleTag3);

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
  title.style = 'margin:0 0 1em; font-size:16px; font-weight:bold; display:flex; flex-wrap:wrap; align-items:center;';
  
  // Create container for the gradient text
  const gradientContainer = document.createElement('div');
  gradientContainer.style = `
    background: linear-gradient(45deg, #1d99ecff, #0cf465ff, #6e0779ff, #3c09f4ff, #ff0000ff);
    background-size: 200% auto;
    color: transparent;
    -webkit-background-clip: text;
    background-clip: text;
    animation: textShimmer 7s linear infinite;
    font-weight: bold;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  `;
  
  const titlePrefix = document.createElement('span');
  titlePrefix.textContent = 'Solved count comparison by rating: ';
  gradientContainer.appendChild(titlePrefix);
  
  // Create separate spans for each handle
  compareList.forEach((handle, idx) => {
    const handleSpan = document.createElement('span');
    handleSpan.textContent = handle;
    handleSpan.style.fontWeight = 'bold';
    gradientContainer.appendChild(handleSpan);
    
    // Add "vs" between handles (but not after the last one)
    if (idx < compareList.length - 1) {
      const vs = document.createElement('span');
      vs.textContent = 'vs';
      vs.style.fontWeight = 'normal';
      vs.style.fontSize = '14px';
      gradientContainer.appendChild(vs);
    }
  });
  
  // Add the gradient container to title
  title.appendChild(gradientContainer);
  
  // Add animation for gradient flow (we can use the existing one)
  const styleTag2 = document.createElement('style');
  styleTag2.textContent = `
    @keyframes textShimmer {
      to { background-position: 200% center; }
    }
  `;
  document.head.appendChild(styleTag2);
  
  // Add title before table
  wrapper.appendChild(title);
  
  // Make sure table is appended to wrapper after title
  tableContainer.appendChild(tbl);
  wrapper.appendChild(tableContainer);

  // Add style for drag and drop functionality
  const dragDropStyle = document.createElement('style');
  dragDropStyle.textContent = `
    .cf-draggable-row {
      user-select: none;
    }
    
    .cf-draggable-row .sticky-column {
      cursor: move !important;
    }
    
    .cf-draggable-row .sticky-column:hover {
      background-color: rgba(108, 92, 231, 0.15) !important;
    }
    
    .cf-dragging {
      opacity: 0.5 !important;
      transform: rotate(5deg) !important;
      z-index: 1000 !important;
      position: relative !important;
    }
    
    .cf-drag-over {
      border-top: 3px solid #6c5ce7 !important;
    }
  `;
  document.head.appendChild(dragDropStyle);

  // Add tooltip functionality
  const tooltipStyle = document.createElement('style');
  tooltipStyle.textContent = `
    .cf-handle-tooltip {
      position: fixed;
      background: linear-gradient(45deg, #3498db, #9b59b6);
      color: white;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: bold;
      box-shadow: 0 4px 10px rgba(0,0,0,0.4);
      z-index: 10000;
      pointer-events: none;
      font-size: 16px;
      text-shadow: 0 1px 2px rgba(0,0,0,0.3);
      white-space: nowrap;
      display: none;
    }
  `;
  document.head.appendChild(tooltipStyle);
  
  // Create tooltip element
  const tooltip = document.createElement('div');
  tooltip.className = 'cf-handle-tooltip';
  document.body.appendChild(tooltip);
  
  // Add data attributes to existing rows for tooltip
  const rows = tbl.querySelectorAll('tr');
  rows.forEach((row, i) => {
    if (i > 0 && i-1 < compareList.length) { // Skip header row
      const user = compareList[i-1];
      const color = handleColors[(i-1) % handleColors.length];
      row.dataset.handle = user;
      row.dataset.color = color;
    }
  });

  // Add tooltip event handlers
  tableContainer.addEventListener('mouseover', function(e) {
    const row = e.target.closest('tr');
    if (row && row.dataset && row.dataset.handle) {
      const handle = row.dataset.handle;
      const color = row.dataset.color || '#3498db';
      
      tooltip.textContent = handle;
      tooltip.style.background = `linear-gradient(45deg, ${color}, ${adjustColor(color, 30)})`;
      tooltip.style.display = 'block';
      
      tooltip.style.left = `${e.clientX + 20}px`;
      tooltip.style.top = `${e.clientY - 10}px`;
    }
  });
  
  tableContainer.addEventListener('mousemove', function(e) {
    if (tooltip.style.display === 'block') {
      tooltip.style.left = `${e.clientX + 20}px`;
      tooltip.style.top = `${e.clientY - 10}px`;
    }
  });
  
  tableContainer.addEventListener('mouseout', function(e) {
    if (!tableContainer.contains(e.relatedTarget)) {
      tooltip.style.display = 'none';
    }
  });

  // Hide loading indicator and show the actual table
  const loadingIndicator = document.getElementById('cf-loading-indicator');
  if (loadingIndicator) {
    loadingIndicator.remove();
  }
  wrapper.style.display = 'block';
  insertPoint.appendChild(wrapper);
  console.log('Comparison table injected into page with drag & drop support');
})();

