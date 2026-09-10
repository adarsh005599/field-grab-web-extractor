# Field Grab — Structured Web Data & AI Extractor (Chrome Extension)

**Field Grab** is a fast, flexible Chrome Extension (Manifest V3) that extracts structured data (names, companies, emails, job roles, prices, addresses, and phone numbers) from any webpage.

It features **two complementary extraction engines**:
1. **Tier 1 (Free Local Engine)**: 100% free, zero-dependency extraction using Schema.org JSON-LD, Open Graph meta tags, HTML5 Microdata, and visual region drag-selection regex extractors.
2. **Tier 2 (AI-Powered Engine - Phase 2)**: Intelligent semantic understanding using **Chrome's Built-in Local AI (Gemini Nano)** or Bring-Your-Own-Key (BYOK) cloud LLMs (**Google Gemini**, **OpenAI**, **Anthropic Claude**, **Groq**, or local **Ollama** endpoints).

--

## Feature


### ⚡ Mode A: "Extract Page" (100% Free & Local)
Scans the active document for embedded structured metadata:
- **JSON-LD (`<script type="application/ld+json">`)**: Automatically detects, parses, and unpacks Schema.org schemas like `Person`, `JobPosting`, `Product`, `Organization`, `LocalBusiness`, `Article`, `NewsArticle`, and more.
- **Open Graph & Meta Tags**: Extracts `og:title`, `og:description`, `og:image`, `og:type`, `og:site_name`, `twitter:*`, `author`, and `keywords`.
- **HTML5 Microdata**: Discovers `itemscope`, `itemprop`, and `itemtype` trees.
- **Landmark Heuristics**: Extracts landmark profile details on platforms like LinkedIn and GitHub.

### ⛶ Mode B: "Select Region" (100% Free Visual Drag Selector)
Extracts unstructured data using a visual drag selector:
- **Visual Drag Overlay**: Click and drag a rectangular bounding box over any section of the screen (e.g., bio card, directory listing, contact footer).
- **Client-Side Regex Matching**: Automatically extracts:
  - **Profile Names** (with heading detection & pronoun stripping)
  - **Roles & Companies** (with `@ Company` separation)
  - **Projects & Startups** (`Building X`)
  - **Geographic Locations** (`Greater Delhi Area`, `Greater Noida`, etc.)
  - **Emails, Phones, URLs, Prices/Currencies, Connections, Raw Text**
- **Multi-Region Append**: Drag-select multiple items across a page to accumulate them in one table.

### 🤖 Mode C: "AI Extract" (Phase 2 Semantic Engine)
Runs AI extraction on any full page or selected region:
- **Chrome Built-in Local AI (Gemini Nano)**: Runs on-device with zero API keys and 100% privacy.
- **Bring-Your-Own-Key (BYOK)**:
  - **Google Gemini API** (`gemini-1.5-flash`, `gemini-2.5-flash`, `gemini-1.5-pro`)
  - **OpenAI API** (`gpt-4o-mini`, `gpt-4o`, `gpt-4-turbo`)
  - **Anthropic Claude API** (`claude-3-5-haiku-20241022`, `claude-3-5-sonnet-20241022`)
  - **Groq API** (`llama-3.3-70b-versatile`, `mixtral-8x7b-32768`, `gemma2-9b-it`)
  - **Local / Custom Ollama / LM Studio**: `http://localhost:11434/v1`
- **One-Click Templates**:
  - ✨ **General**: Automatic structured fact extraction.
  - 💼 **Leads**: Full Name, Job Title, Company, Work Email, Phone, Socials, Location, Bio.
  - 🛒 **E-Commerce**: Product Name, Brand, Price, Currency, Availability, Rating, Reviews, SKU.
  - 📄 **Job Post**: Job Title, Company, Location, Work Type, Salary Range, Requirements.
  - 📰 **Research**: Headline, Authors, Publication, Date, Thesis, Methodology, Findings.
- **Custom Prompts**: Add custom extraction instructions in the Settings modal.

### 📊 Results Panel & Data Export
- **Shadow DOM Isolation**: Rendered inside an encapsulated Shadow DOM root to prevent host page CSS conflicts.
- **Editable Table**: Every cell (`Field` and `Value`) is directly editable (`contenteditable`), letting you modify, correct, or clean values before exporting.
- **Source Badges**: Color-coded badges indicating `AI` (emerald/cyan), `JSON-LD` (green), `OG-Meta` (blue), `Microdata` (yellow), `Regex` (purple), or `Custom` (gray).
- **Search & Filter**: Real-time filtering across field names, values, and sources.
- **Add & Delete Rows**: Add custom fields on the fly or remove unwanted rows.
- **Copy as CSV**: Copies clean, RFC 4180-compliant CSV to clipboard.
- **Copy as JSON**: Copies raw key-value pairs formatted as clean JSON.
- **Download CSV**: 1-click download of the extracted dataset as a `.csv` file.
- **Draggable & Resizable**: Move the floating results panel and toolbar anywhere on your screen.

---

## Installation & Setup

1. Open Google Chrome and go to `chrome://extensions`.
2. Turn ON **Developer mode** in the top-right corner.
3. Click the **"Load unpacked"** button in the top-left corner.
4. Select the project folder:
   `c:\Users\happy\Downloads\code prompt structured extractor`
5. Click the puzzle piece icon in Chrome's top-right toolbar and pin **Field Grab**.

---

## Configuring AI Settings (Phase 2)

1. Click the **Field Grab icon** or press `Ctrl+Shift+F` (`Cmd+Shift+F` on Mac).
2. Click the **Settings icon (`⚙`)** on the toolbar or results panel.
3. Choose your preferred AI Provider:
   - **Google Gemini** (Recommended / Free Tier): Get a free key at [aistudio.google.com](https://aistudio.google.com) and paste it.
   - **OpenAI**: Enter your `sk-...` API key.
   - **Anthropic Claude**: Enter your Anthropic key.
   - **Groq**: Enter your Groq API key.
   - **Chrome Built-in AI**: Select this if you have Chrome Built-in AI / Gemini Nano enabled.
   - **Custom / Local**: Enter your Ollama / LM Studio endpoint (e.g. `http://localhost:11434/v1`).
4. Click **"Save Settings"**. Your keys are stored locally in your browser and never shared.

---

## Testing & Verification

1. Open [`demo.html`](file:///c:/Users/happy/Downloads/code%20prompt%20structured%20extractor/demo.html) or any live page (LinkedIn, Amazon, news article, job board).
2. Press `Ctrl + Shift + F`:
   - Click **`⚡ Extract Page`**: Free scan for JSON-LD & meta tags.
   - Click **`⛶ Select Region`**: Free drag-select regex extraction.
   - Click **`🤖 AI Extract`**: Runs semantic extraction with your configured AI model and selected template!
3. Edit any table row directly, or export via **`📋 Copy CSV`**, **`📋 Copy JSON`**, or **`⬇ CSV`**.

---

## Privacy & Security
- **Local-First**: Tier 1 extraction is 100% client-side and transmits zero data.
- **BYOK Security**: In Tier 2, API requests are made directly from your browser to your chosen AI provider using your own API key. No intermediary tracking servers.
- **Minimal Permissions**: Only uses `activeTab`, `scripting`, `clipboardWrite`, and `storage`.
