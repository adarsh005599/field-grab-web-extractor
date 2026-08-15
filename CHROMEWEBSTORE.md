# Chrome Web Store Listing — Field Grab

## Store Listing Metadata

- **Name**: Field Grab - Structured Data Extractor
- **Summary / Short Description**: Extract structured data (JSON-LD, Open Graph, Microdata, Regex) from any webpage. Free, private, client-side, zero API keys.
- **Category**: Productivity / Developer Tools
- **Version**: 1.0.0
- **Pricing**: Free

## Permissions Justification

| Permission | Justification |
| :--- | :--- |
| `activeTab` | Required to access the DOM of the user's currently active tab when the extension action is triggered, allowing parsing of JSON-LD scripts, meta tags, and selected text regions. |
| `scripting` | Required to inject the extraction engine content script and styles into the active tab on-demand upon clicking the toolbar icon or pressing the keyboard shortcut. |
| `clipboardWrite` | Required to copy extracted structured tables as CSV or JSON data directly to the user's clipboard upon clicking "Copy as CSV" or "Copy as JSON". |
| `storage` | Required to save user preferences such as recent panel position and UI state locally in browser storage. |

## Privacy & Data Practices

- **Data Collection**: No personal data, browsing history, or user data is collected, stored remotely, or transmitted to any external server.
- **Third-Party Services**: Zero third-party SDKs, analytics, or AI services are used in Tier 1.
- **Single Purpose Description**: Field Grab extracts embedded structured data (such as JSON-LD, Open Graph, Microdata) and drag-selected text patterns locally from the active webpage into an editable table for easy export to CSV and JSON.
