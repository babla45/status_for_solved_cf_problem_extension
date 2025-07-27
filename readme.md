# Codeforces Solved Status Extension

A Chrome extension that shows whether problems have been solved by a specific user on Codeforces submission pages and problemset pages.

## Features

- **Multi-user support**: Check solved status for any Codeforces user
- **Submissions page integration**: Works on any user's submissions page
- **Problemset page integration**: Works on the main problemset page showing all problems
- **Visual indicators**: Green ✓ for solved problems, Red ✗ for unsolved problems
- **Problem ratings**: Shows the difficulty rating of problems in submissions pages
- **User comparison**: Compare solved problems across multiple users by rating
- **Profile integration**: Add users to comparison directly from their profile pages
- **Drag & Drop reordering**: Click and drag any handle to reorder users in the comparison table
- **Handle tooltips**: Hover over any row to see the handle name in a floating tooltip
- **Loading indicators**: Visual feedback while data is being loaded
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
1. Go to any supported Codeforces page:
   - **Submissions pages**: `https://codeforces.com/submissions/username`
   - **Problemset page**: `https://codeforces.com/problemset`
   - Example: `https://codeforces.com/submissions/b_i_b`
2. The extension will automatically show indicators next to each problem:
   - **Green ✓**: Problem solved by the configured user
   - **Red ✗**: Problem not solved by the configured user
   - **Purple [Rating]**: Shows the problem's difficulty rating

### User Comparison
1. Navigate to any Codeforces user profile page (e.g., `https://codeforces.com/profile/tourist`)
2. You'll see a comparison panel with options to:
   - Include/exclude the current profile user in comparison
   - Add multiple handles via the "Add multiple handles" button
   - **Reorder users**: Click and drag the drag handle (⋮⋮) next to any username to reorder them in the table
   - View a color-coded comparison table showing solved problems by rating
   - Hover over any row to see the handle name in a tooltip
3. The comparison table shows:
   - Number of problems solved by each user, grouped by rating
   - Total solved count for each user
   - Option to remove users from comparison
   - Drag handles for reordering (except for the primary user)

### Supported Pages
- User submissions pages: `/submissions/username`
- Problemset page: `/problemset`
- Profile pages: `/profile/username` (for comparison feature)
- Works for any username, including special characters like `uf982`, `b_i_b`, etc.

## How It Works

1. **API Integration**: Uses the Codeforces API (`/api/user.status`) to fetch solved problems for the configured user
2. **DOM Analysis**: Scans submission tables for problem links and matches them against the solved problems list
3. **Visual Enhancement**: Adds colored indicators to problem links showing solved status
4. **User Comparison**: Fetches and compares problem counts across multiple users
5. **Smart Caching**: Stores solved problems data to reduce API calls and improve performance

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
1. Verify you're on a supported page:
   - Submissions page (`/submissions/username`)
   - Problemset page (`/problemset`)
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

### Version 1.3
- Added drag & drop functionality to reorder users in comparison table
- Added hover tooltips showing handle names when hovering over table rows
- Added loading indicators with progress updates during data fetching
- Enhanced user experience with visual feedback

### Version 1.2
- Added user comparison feature on profile pages
- Included problem ratings on submissions pages
- Enhanced UI for comparison table

### Version 1.1
- Added support for problemset page (`/problemset`)
- Enhanced problem detection for different page layouts

### Version 1.0
- Initial release
- Multi-user support with popup interface
- Support for submissions pages
- Contest and gym problem detection
- Caching system for performance
- Visual indicators (✓/✗) for solved status

## Support

For issues, questions, or feature requests, please create an issue in the project repository.
