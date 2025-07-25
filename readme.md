# Codeforces Solved Status Extension

A Chrome extension that shows whether problems have been solved by a specific user on Codeforces submission pages.

## Features

- **Multi-user support**: Check solved status for any Codeforces user
- **Submissions page integration**: Works on any user's submissions page
- **Visual indicators**: Green ✓ for solved problems, Red ✗ for unsolved problems
- **Contest and Gym support**: Shows status for both contest and gym problems (gym status may be limited due to API restrictions)
- **Configurable username**: Easy-to-use popup interface for changing the target user
- **Performance optimized**: Uses caching to minimize API calls

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension folder
5. The extension icon should appear in your Chrome toolbar

## Usage

### Setting Up Username
1. Click the extension icon in your Chrome toolbar
2. Enter any Codeforces username in the input field (defaults to "b_i_b")
3. Click "Save & Update"
4. All Codeforces tabs will automatically reload with the new user settings

### Viewing Status
1. Go to any user's submissions page on Codeforces:
   - `https://codeforces.com/submissions/username`
   - Example: `https://codeforces.com/submissions/b_i_b`
2. The extension will automatically show indicators next to each problem:
   - **Green ✓**: Problem solved by the configured user
   - **Red ✗**: Problem not solved by the configured user
   - **Orange ?**: Gym problem (status may be unknown due to API limitations)

### Supported Pages
- User submissions pages: `/submissions/username`
- Works for any username, including special characters like `uf982`, `b_i_b`, etc.

## How It Works

1. **API Integration**: Uses the Codeforces API (`/api/user.status`) to fetch solved problems for the configured user
2. **DOM Analysis**: Scans submission tables for problem links and matches them against the solved problems list
3. **Visual Enhancement**: Adds colored indicators to problem links showing solved status
4. **Smart Caching**: Stores solved problems data to reduce API calls and improve performance

## Technical Details

### Files Structure
```
cf_problem_solved_or_not/
├── manifest.json          # Extension configuration
├── content.js            # Main script that runs on Codeforces pages
├── popup.html           # User interface for settings
├── popup.js            # Settings functionality
├── background.js       # Background script (minimal)
└── icons/             # Extension icons
```

### API Limitations
- **Contest problems**: Full support with accurate solved/unsolved status
- **Gym problems**: Limited support due to Codeforces API restrictions
- **Rate limiting**: The extension respects Codeforces API rate limits

### Browser Compatibility
- Chrome (Manifest V3)
- Other Chromium-based browsers (Edge, Brave, etc.)

## Configuration

The extension stores the following data:
- **Username**: Stored in `chrome.storage.sync` for cross-device synchronization
- **Solved problems cache**: Stored in `chrome.storage.local` for performance

## Troubleshooting

### Extension Not Working
1. Check if the extension is enabled in `chrome://extensions/`
2. Refresh the Codeforces page
3. Check browser console for error messages

### No Indicators Showing
1. Verify you're on a submissions page (`/submissions/username`)
2. Check if the configured username exists and has solved problems
3. Ensure you have internet connection for API calls

### Wrong Status Showing
1. The extension shows status for the **configured user**, not the page owner
2. Check the configured username in the extension popup
3. Gym problems may show incorrect status due to API limitations

## Privacy & Security

- **No personal data collection**: The extension only uses usernames you explicitly provide
- **Local storage only**: All data is stored locally in your browser
- **Open source**: All code is visible and can be audited
- **Minimal permissions**: Only requests necessary permissions for Codeforces integration

## Contributing

Feel free to contribute to this project by:
1. Reporting bugs or issues
2. Suggesting new features
3. Submitting pull requests
4. Improving documentation

## License

This project is open source and available under the MIT License.

## Changelog

### Version 1.0
- Initial release
- Multi-user support with popup interface
- Support for submissions pages
- Contest and gym problem detection
- Caching system for performance
- Visual indicators (✓/✗) for solved status

## Support

For issues, questions, or feature requests, please create an issue in the project repository.
