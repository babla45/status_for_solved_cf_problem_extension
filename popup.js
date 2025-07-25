document.addEventListener('DOMContentLoaded', function() {
    const usernameInput = document.getElementById('username');
    const saveBtn = document.getElementById('saveBtn');
    const statusDiv = document.getElementById('status');

    // Load saved username
    chrome.storage.sync.get(['cf_username'], function(result) {
        if (result.cf_username) {
            usernameInput.value = result.cf_username;
        }
    });

    function showStatus(message, isError = false) {
        statusDiv.textContent = message;
        statusDiv.className = `status ${isError ? 'error' : 'success'}`;
        statusDiv.style.display = 'block';
        
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 3000);
    }

    saveBtn.addEventListener('click', function() {
        const username = usernameInput.value.trim();
        
        if (!username) {
            showStatus('Please enter a username!', true);
            return;
        }

        // Save username to storage
        chrome.storage.sync.set({cf_username: username}, function() {
            showStatus(`Username saved: ${username}`);
            
            // Clear cache for the new user
            chrome.storage.local.clear(function() {
                console.log('Cache cleared for new user');
            });

            // Reload all Codeforces tabs
            chrome.tabs.query({url: '*://*.codeforces.com/*'}, function(tabs) {
                tabs.forEach(tab => {
                    chrome.tabs.reload(tab.id);
                });
            });
        });
    });

    // Save on Enter key
    usernameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            saveBtn.click();
        }
    });
});
