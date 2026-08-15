/**
 * Field Grab — Content Script (Manifest V3)
 * Phase 2: Hybrid Structured Data & AI-Powered Extraction Engine.
 * Encapsulated inside Shadow DOM with zero host-page style leakage.
 */

(function () {
  if (window.__FIELD_GRAB_INSTANCE__) {
    window.__FIELD_GRAB_INSTANCE__.toggleToolbar();
    return;
  }

  class FieldGrab {
    constructor() {
      this.extractedData = [];
      this.searchQuery = '';
      this.activeMode = null; // 'mode-a' | 'mode-b' | 'mode-ai'
      this.isDraggingPanel = false;
      this.panelPos = { x: null, y: null };
      this.isLoadingAi = false;
      this.showSettings = false;
      this.selectedTemplate = 'general';

      // Default AI Settings
      this.aiSettings = {
        provider: 'gemini', // 'gemini' | 'openai' | 'claude' | 'groq' | 'chrome-builtin' | 'custom'
        apiKey: '',
        model: 'gemini-1.5-flash',
        customEndpoint: 'http://localhost:11434/v1',
        customPrompt: ''
      };

      this.loadSettings();
      this.initHost();
      this.bindMessages();
    }

    // =========================================================================
    // Settings & Storage Management
    // =========================================================================

    async loadSettings() {
      try {
        const result = await chrome.storage.local.get(['fg_ai_settings', 'fg_template']);
        if (result.fg_ai_settings) {
          this.aiSettings = { ...this.aiSettings, ...result.fg_ai_settings };
        }
        if (result.fg_template) {
          this.selectedTemplate = result.fg_template;
        }
      } catch (e) {
        console.debug('[Field Grab] Could not read settings from storage:', e);
      }
    }

    async saveSettings(newSettings) {
      this.aiSettings = { ...this.aiSettings, ...newSettings };
      try {
        await chrome.storage.local.set({
          fg_ai_settings: this.aiSettings,
          fg_template: this.selectedTemplate
        });
        this.showToast('✓ Settings saved!');
      } catch (e) {
        console.error('[Field Grab] Failed to save settings:', e);
      }
    }

    // =========================================================================
    // Initialization & Shadow DOM Host
    // =========================================================================

    initHost() {
      const oldRoot = document.getElementById('field-grab-root');
      if (oldRoot) oldRoot.remove();

      this.host = document.createElement('div');
      this.host.id = 'field-grab-root';
      this.host.style.position = 'fixed';
      this.host.style.top = '0';
      this.host.style.left = '0';
      this.host.style.width = '0';
      this.host.style.height = '0';
      this.host.style.zIndex = '2147483647';
      this.host.style.pointerEvents = 'none';

      this.shadow = this.host.attachShadow({ mode: 'open' });

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = chrome.runtime.getURL('content.css');
      this.shadow.appendChild(link);

      document.documentElement.appendChild(this.host);

      this.renderToolbar();
    }

    bindMessages() {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'fg_toggle') {
          this.toggleToolbar();
          sendResponse({ status: 'ok' });
        } else if (message.action === 'fg_open') {
          this.showToolbar();
          sendResponse({ status: 'ok' });
        }
        return true;
      });
    }

    // =========================================================================
    // Floating Toolbar (Top-Right Dock)
    // =========================================================================

    renderToolbar() {
      let toolbar = this.shadow.querySelector('.fg-toolbar');
      if (!toolbar) {
        toolbar = document.createElement('div');
        toolbar.className = 'fg-toolbar';
        toolbar.style.pointerEvents = 'auto';
        this.shadow.appendChild(toolbar);
      }

      toolbar.innerHTML = `
        <div class="fg-brand" title="Drag to move toolbar">
          <div class="fg-logo-icon">FG</div>
          <span>Field Grab</span>
        </div>
        <div class="fg-toolbar-body" style="display: flex; align-items: center; gap: 6px;">
          <button class="fg-btn fg-btn-primary" id="fg-btn-mode-a" title="Extract JSON-LD, Open Graph, & Microdata (Free)">
            <span>⚡</span>
            <span>Extract Page</span>
          </button>
          <button class="fg-btn fg-btn-secondary" id="fg-btn-mode-b" title="Drag-select region to extract text & regex (Free)">
            <span>⛶</span>
            <span>Select Region</span>
          </button>
          <button class="fg-btn fg-btn-ai" id="fg-btn-mode-ai" title="AI-powered semantic extraction (Phase 2)">
            <span>🤖</span>
            <span>AI Extract</span>
          </button>
        </div>
        <div style="display: flex; align-items: center; gap: 4px; padding-left: 4px; border-left: 1px solid #334155;">
          <button class="fg-btn-icon" id="fg-btn-open-settings" title="AI Provider & API Key Settings">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </button>
          <button class="fg-btn-icon" id="fg-btn-close-toolbar" title="Close Field Grab">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      `;

      toolbar.querySelector('#fg-btn-mode-a').addEventListener('click', () => this.runModeA());
      toolbar.querySelector('#fg-btn-mode-b').addEventListener('click', () => this.startModeB());
      toolbar.querySelector('#fg-btn-mode-ai').addEventListener('click', () => this.runAiExtractFullPage());
      toolbar.querySelector('#fg-btn-open-settings').addEventListener('click', (e) => {
        e.stopPropagation();
        this.openSettingsModal();
      });
      toolbar.querySelector('#fg-btn-close-toolbar').addEventListener('click', () => this.hideAll());

      this.makeDraggable(toolbar, toolbar.querySelector('.fg-brand'));
    }

    showToolbar() {
      let toolbar = this.shadow.querySelector('.fg-toolbar');
      if (!toolbar) {
        this.renderToolbar();
        toolbar = this.shadow.querySelector('.fg-toolbar');
      }
      toolbar.style.display = 'flex';
    }

    toggleToolbar() {
      const toolbar = this.shadow.querySelector('.fg-toolbar');
      const panel = this.shadow.querySelector('.fg-panel');
      if ((toolbar && toolbar.style.display !== 'none') || (panel && panel.style.display !== 'none')) {
        this.hideAll();
      } else {
        this.showToolbar();
      }
    }

    hideAll() {
      const toolbar = this.shadow.querySelector('.fg-toolbar');
      if (toolbar) toolbar.style.display = 'none';
      const panel = this.shadow.querySelector('.fg-panel');
      if (panel) panel.style.display = 'none';
      this.cancelSelectionOverlay();
      this.closeSettingsModal();
    }

    // =========================================================================
    // MODE A: Full Page Structured Data Extraction
    // =========================================================================

    runModeA() {
      this.activeMode = 'mode-a';
      const results = [];

      const jsonLdFields = this.extractJsonLd();
      results.push(...jsonLdFields);

      const metaFields = this.extractMetaTags();
      results.push(...metaFields);

      const microdataFields = this.extractMicrodata();
      results.push(...microdataFields);

      const domFields = this.extractDomLandmarks();
      results.push(...domFields);

      this.extractedData = this.deduplicateAndSort(results);
      this.searchQuery = '';
      this.renderResultsPanel();
    }

    extractJsonLd() {
      const fields = [];
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');

      scripts.forEach((script) => {
        try {
          const raw = script.textContent.trim();
          if (!raw) return;
          const parsed = JSON.parse(raw);
          this.parseJsonLdItem(parsed, fields);
        } catch (e) {
          try {
            const sanitized = script.textContent
              .replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, '')
              .replace(/,\s*([\]}])/g, '$1')
              .trim();
            const parsed = JSON.parse(sanitized);
            this.parseJsonLdItem(parsed, fields);
          } catch (err) {
            console.debug('[Field Grab] Could not parse JSON-LD script:', err);
          }
        }
      });

      return fields;
    }

    parseJsonLdItem(item, fields) {
      if (!item) return;

      if (Array.isArray(item)) {
        item.forEach(sub => this.parseJsonLdItem(sub, fields));
        return;
      }

      if (item['@graph'] && Array.isArray(item['@graph'])) {
        item['@graph'].forEach(sub => this.parseJsonLdItem(sub, fields));
        return;
      }

      const type = item['@type'] || 'Object';
      const typeLabel = Array.isArray(type) ? type.join('/') : type;

      if (this.isType(type, 'JobPosting')) {
        this.addIf(fields, 'Job Title', item.title || item.name, 'json-ld');
        this.addIf(fields, 'Company', this.deepGet(item, 'hiringOrganization.name') || item.hiringOrganization, 'json-ld');
        this.addIf(fields, 'Employment Type', item.employmentType, 'json-ld');
        this.addIf(fields, 'Location', this.formatAddress(item.jobLocation), 'json-ld');
        this.addIf(fields, 'Salary / Compensation', this.formatSalary(item.baseSalary || item.estimatedSalary), 'json-ld');
        this.addIf(fields, 'Date Posted', item.datePosted, 'json-ld');
        this.addIf(fields, 'Valid Through', item.validThrough, 'json-ld');
        this.addIf(fields, 'Description', this.cleanHtml(item.description), 'json-ld');
        return;
      }

      if (this.isType(type, 'Person')) {
        this.addIf(fields, 'Full Name', item.name || `${item.givenName || ''} ${item.familyName || ''}`.trim(), 'json-ld');
        this.addIf(fields, 'Job Title / Role', item.jobTitle, 'json-ld');
        this.addIf(fields, 'Company / Organization', this.deepGet(item, 'worksFor.name') || item.worksFor || this.deepGet(item, 'affiliation.name'), 'json-ld');
        this.addIf(fields, 'Email', item.email, 'json-ld');
        this.addIf(fields, 'Telephone', item.telephone, 'json-ld');
        this.addIf(fields, 'Location', this.formatAddress(item.address || item.homeLocation), 'json-ld');
        this.addIf(fields, 'Alumni / Education', this.deepGet(item, 'alumniOf.name') || item.alumniOf, 'json-ld');
        this.addIf(fields, 'Profile URL', item.url || item.sameAs, 'json-ld');
        this.addIf(fields, 'Description / Bio', this.cleanHtml(item.description), 'json-ld');
        return;
      }

      if (this.isType(type, 'Product')) {
        this.addIf(fields, 'Product Name', item.name, 'json-ld');
        this.addIf(fields, 'Brand', this.deepGet(item, 'brand.name') || item.brand, 'json-ld');
        const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
        if (offer) {
          const price = offer.price || offer.lowPrice || offer.highPrice;
          const currency = offer.priceCurrency || '';
          this.addIf(fields, 'Price', price ? `${currency} ${price}`.trim() : null, 'json-ld');
          this.addIf(fields, 'Availability', this.cleanAvailability(offer.availability), 'json-ld');
        }
        this.addIf(fields, 'SKU / ID', item.sku || item.gtin13 || item.mpn, 'json-ld');
        const rating = this.deepGet(item, 'aggregateRating.ratingValue');
        const reviewCount = this.deepGet(item, 'aggregateRating.reviewCount');
        if (rating) {
          this.addIf(fields, 'Rating', `${rating} ★ (${reviewCount || 0} reviews)`, 'json-ld');
        }
        this.addIf(fields, 'Description', this.cleanHtml(item.description), 'json-ld');
        return;
      }

      if (this.isType(type, 'Organization') || this.isType(type, 'LocalBusiness') || this.isType(type, 'Corporation')) {
        this.addIf(fields, 'Company Name', item.name || item.legalName, 'json-ld');
        this.addIf(fields, 'Phone', item.telephone, 'json-ld');
        this.addIf(fields, 'Email', item.email, 'json-ld');
        this.addIf(fields, 'Address', this.formatAddress(item.address), 'json-ld');
        this.addIf(fields, 'Website', item.url, 'json-ld');
        this.addIf(fields, 'Description', this.cleanHtml(item.description), 'json-ld');
        return;
      }

      if (this.isType(type, 'Article') || this.isType(type, 'NewsArticle') || this.isType(type, 'BlogPosting')) {
        this.addIf(fields, 'Headline', item.headline || item.name, 'json-ld');
        this.addIf(fields, 'Author', this.deepGet(item, 'author.name') || (Array.isArray(item.author) ? item.author.map(a => a.name || a).join(', ') : item.author), 'json-ld');
        this.addIf(fields, 'Publisher', this.deepGet(item, 'publisher.name') || item.publisher, 'json-ld');
        this.addIf(fields, 'Published Date', item.datePublished, 'json-ld');
        this.addIf(fields, 'Modified Date', item.dateModified, 'json-ld');
        this.addIf(fields, 'Description', this.cleanHtml(item.description), 'json-ld');
        return;
      }

      this.flattenGenericObject(item, fields, '', typeLabel);
    }

    flattenGenericObject(obj, fields, prefix = '', typeLabel = '') {
      if (!obj || typeof obj !== 'object') return;

      for (const [key, val] of Object.entries(obj)) {
        if (key.startsWith('@context') || key.startsWith('@id')) continue;
        if (val === null || val === undefined || val === '') continue;

        const currentKey = prefix ? `${prefix}.${key}` : key;

        if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
          const formattedLabel = this.formatFieldLabel(currentKey, typeLabel);
          this.addIf(fields, formattedLabel, String(val), 'json-ld');
        } else if (Array.isArray(val)) {
          if (val.length > 0 && typeof val[0] === 'object') {
            val.slice(0, 3).forEach((sub, i) => this.flattenGenericObject(sub, fields, `${currentKey}[${i}]`, typeLabel));
          } else {
            const joined = val.filter(Boolean).join(', ');
            if (joined) {
              this.addIf(fields, this.formatFieldLabel(currentKey, typeLabel), joined, 'json-ld');
            }
          }
        } else if (typeof val === 'object') {
          this.flattenGenericObject(val, fields, currentKey, typeLabel);
        }
      }
    }

    extractMetaTags() {
      const fields = [];
      const metaTags = document.querySelectorAll('meta[property], meta[name]');

      metaTags.forEach((meta) => {
        const prop = (meta.getAttribute('property') || meta.getAttribute('name') || '').toLowerCase();
        const content = (meta.getAttribute('content') || '').trim();

        if (!prop || !content) return;

        if (prop === 'og:title') {
          if (content.includes('| LinkedIn') || content.includes('- LinkedIn')) {
            const cleanTitle = content.replace(/\s*\|\s*LinkedIn$/i, '').replace(/\s*-\s*LinkedIn$/i, '');
            const parts = cleanTitle.split(/\s+-\s+/);
            if (parts.length >= 2) {
              this.addIf(fields, 'Full Name', parts[0].trim(), 'og-meta');
              this.addIf(fields, 'Job Title / Headline', parts[1].trim(), 'og-meta');
              if (parts[2]) {
                this.addIf(fields, 'Company / Organization', parts[2].trim(), 'og-meta');
              }
            }
          }
          this.addIf(fields, 'Title (OG)', content, 'og-meta');
          return;
        }

        if (prop.startsWith('og:')) {
          const ogKeyMap = {
            'og:description': 'Description (OG)',
            'og:image': 'Image URL (OG)',
            'og:url': 'Page URL (OG)',
            'og:type': 'Type (OG)',
            'og:site_name': 'Site Name (OG)',
            'og:price:amount': 'Price (OG)',
            'og:price:currency': 'Currency (OG)'
          };
          const label = ogKeyMap[prop] || `OG: ${prop.replace(/^og:/, '')}`;
          this.addIf(fields, label, content, 'og-meta');
          return;
        }

        if (prop.startsWith('twitter:')) {
          const twitterKeyMap = {
            'twitter:title': 'Twitter Title',
            'twitter:description': 'Twitter Description',
            'twitter:image': 'Twitter Image',
            'twitter:creator': 'Twitter Creator',
            'twitter:site': 'Twitter Site'
          };
          const label = twitterKeyMap[prop] || `Twitter: ${prop.replace(/^twitter:/, '')}`;
          this.addIf(fields, label, content, 'og-meta');
          return;
        }

        if (['author', 'description', 'keywords', 'pubdate', 'publishdate'].includes(prop)) {
          const label = prop.charAt(0).toUpperCase() + prop.slice(1);
          this.addIf(fields, `${label} (Meta)`, content, 'og-meta');
        }
      });

      const docTitle = document.title ? document.title.trim() : '';
      if (docTitle && !fields.some(f => f.field.includes('Title') || f.field.includes('Full Name'))) {
        this.addIf(fields, 'Page Title (HTML)', docTitle, 'og-meta');
      }

      return fields;
    }

    extractMicrodata() {
      const fields = [];
      const scopes = document.querySelectorAll('[itemscope]');

      scopes.forEach((scope) => {
        const itemType = scope.getAttribute('itemtype') || '';
        const cleanType = itemType ? itemType.split('/').pop() : '';
        const props = scope.querySelectorAll('[itemprop]');

        props.forEach((propEl) => {
          if (propEl.closest('[itemscope]') !== scope) return;

          const propName = propEl.getAttribute('itemprop');
          let val = '';

          const tag = propEl.tagName.toLowerCase();
          if (tag === 'meta') {
            val = propEl.getAttribute('content');
          } else if (tag === 'a' || tag === 'link') {
            val = propEl.getAttribute('href');
          } else if (tag === 'img' || tag === 'video' || tag === 'audio' || tag === 'source') {
            val = propEl.getAttribute('src');
          } else if (tag === 'time') {
            val = propEl.getAttribute('datetime') || propEl.textContent;
          } else {
            val = propEl.textContent;
          }

          if (val && val.trim()) {
            const label = cleanType ? `${propName} (${cleanType})` : propName;
            this.addIf(fields, label, val.trim(), 'microdata');
          }
        });
      });

      return fields;
    }

    extractDomLandmarks() {
      const fields = [];

      if (window.location.hostname.includes('linkedin.com')) {
        const h1 = document.querySelector('h1.inline, h1.text-heading-xlarge, main h1');
        if (h1 && h1.textContent.trim()) {
          const rawName = h1.textContent.trim().replace(/\s+(?:He\/Him|She\/Her|They\/Them|\(He\/Him\)|\(She\/Her\))$/i, '');
          this.addIf(fields, 'Full Name', rawName, 'microdata');
        }

        const headlineEl = document.querySelector('.text-body-medium.break-words, .pv-text-details__left-panel div.text-body-medium');
        if (headlineEl && headlineEl.textContent.trim()) {
          this.addIf(fields, 'Headline / Role', headlineEl.textContent.trim(), 'microdata');
        }

        const locationEl = document.querySelector('.text-body-small.inline.t-black--light.break-words, span.text-body-small');
        if (locationEl && locationEl.textContent.trim()) {
          const loc = locationEl.textContent.trim().replace(/\s*Contact info.*$/i, '');
          if (loc && loc.length < 50 && !loc.includes('connections')) {
            this.addIf(fields, 'Location', loc, 'microdata');
          }
        }
      }

      if (window.location.hostname.includes('github.com')) {
        const nameEl = document.querySelector('.vcard-fullname, span.p-name');
        const loginEl = document.querySelector('.vcard-username, span.p-nickname');
        const bioEl = document.querySelector('.user-profile-bio, div.p-note');
        if (nameEl && nameEl.textContent.trim()) this.addIf(fields, 'Full Name', nameEl.textContent.trim(), 'microdata');
        if (loginEl && loginEl.textContent.trim()) this.addIf(fields, 'Username', loginEl.textContent.trim(), 'microdata');
        if (bioEl && bioEl.textContent.trim()) this.addIf(fields, 'Bio', bioEl.textContent.trim(), 'microdata');
      }

      return fields;
    }

    // =========================================================================
    // MODE B: Region Drag Selection & Regex Pattern Extractor
    // =========================================================================

    startModeB(append = false) {
      this.activeMode = 'mode-b';
      this._appendMode = append;

      const toolbar = this.shadow.querySelector('.fg-toolbar');
      if (toolbar) toolbar.style.display = 'none';
      const panel = this.shadow.querySelector('.fg-panel');
      if (panel) panel.style.display = 'none';

      this.createSelectionOverlay();
    }

    createSelectionOverlay() {
      this.cancelSelectionOverlay();

      const overlay = document.createElement('div');
      overlay.className = 'fg-selection-overlay';
      overlay.style.pointerEvents = 'auto';

      overlay.innerHTML = `
        <div class="fg-selection-banner">
          <span>⛶ <strong>Drag-select a region</strong> on the page to extract profile names, roles, emails, phones & data</span>
          <span style="opacity: 0.6; font-size: 11px;">[Press Esc to Cancel]</span>
        </div>
        <div class="fg-selection-box" style="display: none;">
          <div class="fg-selection-coords">0 × 0</div>
        </div>
      `;

      this.shadow.appendChild(overlay);

      const box = overlay.querySelector('.fg-selection-box');
      const coords = overlay.querySelector('.fg-selection-coords');
      let startX = 0, startY = 0, isSelecting = false;

      const onMouseDown = (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        startX = e.clientX;
        startY = e.clientY;
        isSelecting = true;

        box.style.left = `${startX}px`;
        box.style.top = `${startY}px`;
        box.style.width = '0px';
        box.style.height = '0px';
        box.style.display = 'block';
      };

      const onMouseMove = (e) => {
        if (!isSelecting) return;
        const currentX = e.clientX;
        const currentY = e.clientY;

        const left = Math.min(startX, currentX);
        const top = Math.min(startY, currentY);
        const width = Math.abs(currentX - startX);
        const height = Math.abs(currentY - startY);

        box.style.left = `${left}px`;
        box.style.top = `${top}px`;
        box.style.width = `${width}px`;
        box.style.height = `${height}px`;
        coords.textContent = `${Math.round(width)} × ${Math.round(height)}`;
      };

      const onMouseUp = (e) => {
        if (!isSelecting) return;
        isSelecting = false;

        const currentX = e.clientX;
        const currentY = e.clientY;

        const left = Math.min(startX, currentX);
        const top = Math.min(startY, currentY);
        const width = Math.abs(currentX - startX);
        const height = Math.abs(currentY - startY);

        this.cancelSelectionOverlay();
        this.showToolbar();

        if (width > 15 && height > 15) {
          this.processSelectedRegion({ left, top, right: left + width, bottom: top + height, width, height });
        }
      };

      const onKeyDown = (e) => {
        if (e.key === 'Escape') {
          this.cancelSelectionOverlay();
          this.showToolbar();
        }
      };

      overlay.addEventListener('mousedown', onMouseDown);
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp, { once: true });
      window.addEventListener('keydown', onKeyDown, { once: true });

      this._overlayCleanup = () => {
        overlay.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        window.removeEventListener('keydown', onKeyDown);
        overlay.remove();
      };
    }

    cancelSelectionOverlay() {
      if (this._overlayCleanup) {
        this._overlayCleanup();
        this._overlayCleanup = null;
      }
      const overlay = this.shadow.querySelector('.fg-selection-overlay');
      if (overlay) overlay.remove();
    }

    processSelectedRegion(rect) {
      const { text, headings } = this.getTextAndHeadingsInRect(rect);
      const fields = this.runRegexExtraction(text, headings);

      if (this._appendMode && this.extractedData.length > 0) {
        this.extractedData.push(...fields);
      } else {
        this.extractedData = fields;
      }
      this._appendMode = false;

      this.searchQuery = '';
      this.renderResultsPanel();
    }

    getTextAndHeadingsInRect(rect) {
      const textPieces = [];
      const headings = [];

      const headingElements = document.body.querySelectorAll('h1, h2, h3');
      headingElements.forEach(h => {
        if (h.closest('#field-grab-root')) return;
        const hRect = h.getBoundingClientRect();
        const intersects = !(
          hRect.right < rect.left ||
          hRect.left > rect.right ||
          hRect.bottom < rect.top ||
          hRect.top > rect.bottom
        );
        if (intersects) {
          const cleanHeading = h.textContent.trim().replace(/\s+(?:He\/Him|She\/Her|They\/Them|\(He\/Him\)|\(She\/Her\))$/i, '');
          if (cleanHeading && cleanHeading.length < 80) {
            headings.push({ tag: h.tagName.toLowerCase(), text: cleanHeading });
          }
        }
      });

      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            if (parent.closest('#field-grab-root')) return NodeFilter.FILTER_REJECT;
            const tag = parent.tagName.toLowerCase();
            if (['script', 'style', 'noscript', 'template', 'svg'].includes(tag)) return NodeFilter.FILTER_REJECT;

            const text = node.textContent.trim();
            if (!text) return NodeFilter.FILTER_REJECT;

            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );

      let node;
      while ((node = walker.nextNode())) {
        const range = document.createRange();
        range.selectNodeContents(node);
        const nodeRect = range.getBoundingClientRect();

        const intersects = !(
          nodeRect.right < rect.left ||
          nodeRect.left > rect.right ||
          nodeRect.bottom < rect.top ||
          nodeRect.top > rect.bottom
        );

        if (intersects && (nodeRect.width > 0 || nodeRect.height > 0)) {
          textPieces.push(node.textContent.trim());
        }
      }

      if (textPieces.length === 0) {
        const elements = document.body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, td, th, div, span, a');
        elements.forEach(el => {
          if (el.closest('#field-grab-root')) return;
          const elRect = el.getBoundingClientRect();
          const intersects = !(
            elRect.right < rect.left ||
            elRect.left > rect.right ||
            elRect.bottom < rect.top ||
            elRect.top > rect.bottom
          );
          if (intersects && el.children.length === 0) {
            const txt = el.textContent.trim();
            if (txt) textPieces.push(txt);
          }
        });
      }

      let combined = textPieces.join('\n');
      const userSelection = window.getSelection().toString().trim();
      if (!combined && userSelection) {
        combined = userSelection;
      }

      return { text: combined, headings };
    }

    runRegexExtraction(text, headings = []) {
      const fields = [];
      if (!text || !text.trim()) {
        return fields;
      }

      const singleLine = text.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
      const lines = text.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);

      // Profile Name from Heading or Pronoun Prefix
      const h1 = headings.find(h => h.tag === 'h1');
      if (h1 && h1.text) {
        this.addIf(fields, 'Full Name', h1.text, 'regex');
      } else {
        const pronounMatch = text.match(/^([A-Z][a-zA-Z]+(?:\s+[a-zA-Z]+){1,3})\s+(?:He\/Him|She\/Her|They\/Them|\(He\/Him\)|\(She\/Her\))/im);
        if (pronounMatch && pronounMatch[1]) {
          this.addIf(fields, 'Full Name', pronounMatch[1].trim(), 'regex');
        }
      }

      // Project / Startup
      const buildingMatch = text.match(/\bBuilding\s+([A-Z0-9_\s-]{2,30}?)(?=\s*[\|•\n]|\s*Founder|\s*Associate|\s*Developer|$)/i);
      if (buildingMatch && buildingMatch[1]) {
        this.addIf(fields, 'Project / Startup', `Building ${buildingMatch[1].trim()}`, 'regex');
      }

      // Role @ Company
      const roleAtCompanyMatch = text.match(/([A-Za-z'\s-]{3,40}?)\s*@\s*([A-Za-z0-9\s-]{2,30})/);
      if (roleAtCompanyMatch) {
        this.addIf(fields, 'Current Role', roleAtCompanyMatch[1].trim(), 'regex');
        this.addIf(fields, 'Company', roleAtCompanyMatch[2].trim(), 'regex');
      }

      // Standalone Role
      const roleRegex = /\b(?:Senior|Junior|Lead|Principal|Staff|Chief|Head of|VP of|Director of|Manager|Full-Stack Developer|Backend Developer|Frontend Developer|Software Engineer|Developer|Product Manager|Designer|Analyst|Consultant|Architect|Founder|Co-Founder|Executive|Coordinator|Specialist|Officer)\b[^\n,;•\|]{0,35}/gi;
      const roles = [...new Set((text.match(roleRegex) || []).map(r => r.trim()))];
      roles.slice(0, 3).forEach((role, i) => {
        if (roleAtCompanyMatch && roleAtCompanyMatch[0].includes(role)) return;
        const label = roles.length === 1 ? 'Role / Specialization' : `Role / Skill (${i + 1})`;
        this.addIf(fields, label, role, 'regex');
      });

      // Geographic Locations
      const locationKeywords = /delhi|noida|mumbai|bangalore|bengaluru|hyderabad|pune|chennai|gurgaon|gurugram|california|texas|seattle|san francisco|london|berlin|toronto|singapore|area|city|region|greater\s+[a-z]+/i;
      const locationRegex = /\b(?:Greater\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z][a-z]+|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+Area)\b/g;
      const rawLocations = text.match(locationRegex) || [];
      const validLocations = [...new Set(
        rawLocations
          .map(loc => loc.replace(/\s*Contact info.*$/i, '').trim())
          .filter(loc => locationKeywords.test(loc) && loc.length < 45)
      )];
      validLocations.slice(0, 2).forEach((loc, i) => {
        const label = validLocations.length === 1 ? 'Location' : `Location (${i + 1})`;
        this.addIf(fields, label, loc, 'regex');
      });

      // Connections
      const connectionsMatch = text.match(/(\d+\+?\s+connections)/i);
      if (connectionsMatch) {
        this.addIf(fields, 'Connections', connectionsMatch[1], 'regex');
      }

      // Emails
      const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
      const emails = [...new Set(text.match(emailRegex) || [])];
      emails.forEach((email, i) => {
        const label = emails.length === 1 ? 'Email' : `Email (${i + 1})`;
        this.addIf(fields, label, email, 'regex');
      });

      // Phones
      const phoneRegex = /(?:\+?\d{1,4}[-.\s]?)?(?:\(?\d{2,5}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}\b/g;
      const rawPhones = text.match(phoneRegex) || [];
      const validPhones = [...new Set(
        rawPhones
          .map(p => p.trim())
          .filter(p => {
            const digits = p.replace(/\D/g, '');
            if (digits.length < 7 || digits.length > 15) return false;
            if (/^(19|20)\d{2}$/.test(digits)) return false;
            return true;
          })
      )];
      validPhones.forEach((phone, i) => {
        const label = validPhones.length === 1 ? 'Phone Number' : `Phone Number (${i + 1})`;
        this.addIf(fields, label, phone, 'regex');
      });

      // URLs
      const urlRegex = /\bhttps?:\/\/[^\s<>"]+|\bwww\.[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s<>"]*)?/gi;
      const urls = [...new Set(text.match(urlRegex) || [])];
      urls.forEach((url, i) => {
        const label = urls.length === 1 ? 'URL / Link' : `URL (${i + 1})`;
        this.addIf(fields, label, url, 'regex');
      });

      // Prices & Currency
      const priceRegex = /(?:[\$\€\£\¥\₹]|USD|EUR|GBP|INR|CAD|AUD|Rs\.?)\s?\d+(?:,\d{3})*(?:\.\d{1,2})?\b|\b\d+(?:,\d{3})*(?:\.\d{1,2})?\s?(?:USD|EUR|GBP|INR|Rupees|dollars?|cents?)\b/gi;
      const prices = [...new Set(text.match(priceRegex) || [])];
      prices.forEach((price, i) => {
        const label = prices.length === 1 ? 'Price / Amount' : `Price (${i + 1})`;
        this.addIf(fields, label, price, 'regex');
      });

      // Entities & Brands
      const nameRegex = /\b(?:(?:Dr|Mr|Mrs|Ms|Prof)\.?\s+)?[A-Z][a-z]{1,20}(?:\s+[A-Za-z]{1,20}){1,3}\b/g;
      const stopWords = new Set([
        'The Page', 'Click Here', 'Learn More', 'Sign In', 'Log In', 'Contact Us',
        'Privacy Policy', 'Terms Of Service', 'All Rights Reserved', 'United States',
        'Read More', 'View Profile', 'See More', 'Follow Us', 'Send Message',
        'Explore More', 'Built In India', 'Most Loved', 'Trending Deals', 'Open To Work',
        'Show Details', 'Add Section', 'Enhance Profile', 'Recruiters Only'
      ]);

      const brandKeywords = /amazon|shop|store|brands?|launchpad|karigar|crafts?|ventures|labs?|technologies|solutions|services|ltd|inc|corp|co\b/i;

      const foundEntities = [];
      lines.forEach(line => {
        const matches = line.match(nameRegex) || [];
        matches.forEach(m => {
          const trimmed = m.trim();
          if (
            !stopWords.has(trimmed) &&
            !validLocations.includes(trimmed) &&
            !roles.some(r => r.includes(trimmed)) &&
            trimmed.split(' ').length >= 2
          ) {
            foundEntities.push(trimmed);
          }
        });
      });

      const uniqueEntities = [...new Set(foundEntities)];
      let brandCount = 0;
      let entityCount = 0;

      uniqueEntities.slice(0, 4).forEach((entity) => {
        if (brandKeywords.test(entity)) {
          brandCount++;
          const label = brandCount === 1 ? 'Brand / Entity' : `Brand / Entity (${brandCount})`;
          this.addIf(fields, label, entity, 'regex');
        } else {
          entityCount++;
          const label = entityCount === 1 ? 'Entity / Organization' : `Entity (${entityCount})`;
          this.addIf(fields, label, entity, 'regex');
        }
      });

      if (singleLine.length > 0) {
        this.addIf(fields, 'Raw Selected Text', singleLine, 'regex');
      }

      return fields;
    }

    // =========================================================================
    // PHASE 2: AI-Powered Semantic Extraction
    // =========================================================================

    async runAiExtractFullPage(templateOverride = null) {
      if (templateOverride) {
        this.selectedTemplate = templateOverride;
        chrome.storage.local.set({ fg_template: this.selectedTemplate });
      }

      const distilledText = this.getDistilledPageText();
      await this.executeAiExtraction(distilledText);
    }

    getDistilledPageText() {
      // Collect visible text directly from the active DOM
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            if (parent.closest('#field-grab-root')) return NodeFilter.FILTER_REJECT;
            const tag = parent.tagName.toLowerCase();
            if (['script', 'style', 'noscript', 'template', 'svg'].includes(tag)) return NodeFilter.FILTER_REJECT;

            const text = node.textContent.trim();
            if (!text) return NodeFilter.FILTER_REJECT;

            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );

      const pieces = [];
      let node;
      let totalLength = 0;
      while ((node = walker.nextNode()) && totalLength < 25000) {
        const txt = node.textContent.trim();
        pieces.push(txt);
        totalLength += txt.length;
      }

      if (pieces.length === 0) {
        return document.body.innerText ? document.body.innerText.slice(0, 25000) : (document.body.textContent || '').slice(0, 25000);
      }

      return pieces.join('\n').slice(0, 25000);
    }

    getTemplateInstruction() {
      const templates = {
        general: 'Extract all important facts, entities, contact details, dates, pricing, and key attributes from the page.',
        leads: 'Extract Lead Profile Information: Full Name, Job Title, Company/Organization, Work Email, Phone Number, Social Profiles (LinkedIn, Twitter, GitHub), Location, and Bio/Summary.',
        ecommerce: 'Extract Product Information: Product Name, Brand/Manufacturer, Current Price, Original/List Price, Currency, In-Stock Availability, Rating, Total Review Count, SKU/ID, and Key Features.',
        job: 'Extract Job Listing Details: Job Title, Hiring Company, Location/Cities, Work Arrangement (Remote/Hybrid/Onsite), Experience Required (years), Salary/Compensation Range, Employment Type (Full-time/Part-time/Internship), Required Education/Degrees, Key Skills Required, Number of Openings, and Application Deadline.',
        research: 'Extract Article / Research Data: Headline/Title, Author(s), Publication/Source, Published Date, Core Thesis/Summary, Methodology, Key Findings, and Key Statistics.'
      };

      let base = templates[this.selectedTemplate] || templates.general;
      if (this.aiSettings.customPrompt && this.aiSettings.customPrompt.trim()) {
        base += `\nAdditional Custom User Instructions: ${this.aiSettings.customPrompt.trim()}`;
      }
      return base;
    }

    async executeAiExtraction(text) {
      if (!text || !text.trim()) {
        this.showToast('No text available for AI extraction', true);
        return;
      }

      if (this.aiSettings.provider !== 'chrome-builtin' && this.aiSettings.provider !== 'custom' && !this.aiSettings.apiKey) {
        this.showToast('Please set your API key in Settings (⚙) first.', true);
        this.openSettingsModal();
        return;
      }

      this.activeMode = 'mode-ai';
      this.isLoadingAi = true;
      this.renderResultsPanel();

      const schemaInstruction = this.getTemplateInstruction();

      try {
        let aiResults = [];

        if (this.aiSettings.provider === 'chrome-builtin') {
          aiResults = await this.runChromeBuiltinAi(text, schemaInstruction);
        } else {
          const response = await chrome.runtime.sendMessage({
            action: 'fg_ai_extract',
            payload: {
              provider: this.aiSettings.provider,
              apiKey: this.aiSettings.apiKey,
              model: this.aiSettings.model,
              customEndpoint: this.aiSettings.customEndpoint,
              schemaInstruction: schemaInstruction,
              text: text
            }
          });

          if (!response || response.status !== 'ok') {
            throw new Error(response?.message || 'AI request failed');
          }
          aiResults = response.data;
        }

        if (!Array.isArray(aiResults) || aiResults.length === 0) {
          throw new Error('AI completed but found no matching fields for this template.');
        }

        this.extractedData = aiResults;
        this.searchQuery = '';
        this.showToast(`✓ AI extracted ${aiResults.length} fields!`);
      } catch (err) {
        console.error('[Field Grab] AI Extraction Error:', err);
        this.showToast(err.message || 'AI extraction failed', true);
      } finally {
        this.isLoadingAi = false;
        this.renderResultsPanel();
      }
    }

    async runChromeBuiltinAi(text, schemaInstruction) {
      const aiObj = window.ai || window.model;
      if (!aiObj?.languageModel?.create && !window.LanguageModel?.create) {
        throw new Error('Chrome Built-in AI (Gemini Nano) is not enabled on this browser. Try Google Gemini or OpenAI in Settings.');
      }

      const createSession = window.LanguageModel?.create || aiObj.languageModel.create;
      const session = await createSession({
        systemPrompt: 'You are a structured data extractor. You must reply ONLY with a valid JSON array of objects with "field" and "value" keys.'
      });

      const prompt = `${schemaInstruction}\n\nWeb Page Text:\n"""\n${text}\n"""\n\nReturn JSON array only:`;
      const resultText = await session.prompt(prompt);

      const clean = resultText.replace(/^```json/i, '').replace(/```$/i, '').trim();
      const parsed = JSON.parse(clean);
      return Array.isArray(parsed) ? parsed.map(p => ({ field: p.field, value: p.value, source: 'ai' })) : [];
    }

    // =========================================================================
    // Settings Modal (Fixed Centered Viewport)
    // =========================================================================

    openSettingsModal() {
      this.showSettings = true;
      const oldModal = this.shadow.querySelector('.fg-modal-backdrop');
      if (oldModal) oldModal.remove();

      const modal = document.createElement('div');
      modal.className = 'fg-modal-backdrop';
      modal.style.position = 'fixed';
      modal.style.inset = '0';
      modal.style.width = '100vw';
      modal.style.height = '100vh';
      modal.style.display = 'flex';
      modal.style.alignItems = 'center';
      modal.style.justifyContent = 'center';
      modal.style.zIndex = '2147483647';
      modal.style.pointerEvents = 'auto';
      modal.style.background = 'rgba(15, 23, 42, 0.85)';
      modal.style.backdropFilter = 'blur(6px)';

      this.shadow.appendChild(modal);

      const providerModels = {
        gemini: ['gemini-1.5-flash', 'gemini-2.5-flash', 'gemini-1.5-pro'],
        openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'],
        claude: ['claude-3-5-haiku-20241022', 'claude-3-5-sonnet-20241022'],
        groq: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
        'chrome-builtin': ['Gemini Nano (On-Device Local)'],
        custom: ['llama3.2', 'mistral', 'custom-model']
      };

      const currentModels = providerModels[this.aiSettings.provider] || ['default'];
      const modelOptions = currentModels.map(m => `<option value="${m}" ${m === this.aiSettings.model ? 'selected' : ''}>${m}</option>`).join('');

      modal.innerHTML = `
        <div class="fg-settings-modal" style="pointer-events: auto; position: relative; z-index: 2147483647;">
          <div class="fg-modal-header">
            <div class="fg-modal-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              <span>Field Grab AI Settings (Phase 2)</span>
            </div>
            <button class="fg-btn-icon" id="fg-modal-btn-close" title="Close Settings">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="fg-modal-body">
            <div class="fg-form-group">
              <label class="fg-form-label">AI Engine / Provider</label>
              <select class="fg-form-select" id="fg-select-provider">
                <option value="gemini" ${this.aiSettings.provider === 'gemini' ? 'selected' : ''}>Google Gemini (Recommended / Free Tier)</option>
                <option value="openai" ${this.aiSettings.provider === 'openai' ? 'selected' : ''}>OpenAI (GPT-4o, GPT-4o-mini)</option>
                <option value="claude" ${this.aiSettings.provider === 'claude' ? 'selected' : ''}>Anthropic Claude (Claude 3.5 Sonnet / Haiku)</option>
                <option value="groq" ${this.aiSettings.provider === 'groq' ? 'selected' : ''}>Groq (Ultra-fast Llama 3.3)</option>
                <option value="chrome-builtin" ${this.aiSettings.provider === 'chrome-builtin' ? 'selected' : ''}>Chrome Built-in AI (Gemini Nano Local - No Key)</option>
                <option value="custom" ${this.aiSettings.provider === 'custom' ? 'selected' : ''}>Custom / Local Endpoint (Ollama, LM Studio)</option>
              </select>
            </div>

            <div class="fg-form-group" id="fg-group-apikey" style="${this.aiSettings.provider === 'chrome-builtin' ? 'display:none;' : ''}">
              <label class="fg-form-label">API Key</label>
              <div class="fg-input-password-wrapper">
                <input type="password" class="fg-form-input" id="fg-input-apikey" placeholder="Enter your API key..." value="${this.escapeHtml(this.aiSettings.apiKey)}">
                <button type="button" class="fg-btn-eye" id="fg-toggle-key-visibility" title="Toggle visibility">👁</button>
              </div>
              <span class="fg-form-help">Stored locally in your browser memory. Never shared or sent to any server except the chosen AI provider.</span>
            </div>

            <div class="fg-form-group" id="fg-group-model">
              <label class="fg-form-label">Model Selection</label>
              <select class="fg-form-select" id="fg-select-model">
                ${modelOptions}
              </select>
            </div>

            <div class="fg-form-group" id="fg-group-endpoint" style="${this.aiSettings.provider === 'custom' ? '' : 'display:none;'}">
              <label class="fg-form-label">Custom Base URL</label>
              <input type="text" class="fg-form-input" id="fg-input-endpoint" placeholder="http://localhost:11434/v1" value="${this.escapeHtml(this.aiSettings.customEndpoint)}">
            </div>

            <div class="fg-form-group">
              <label class="fg-form-label">Custom Extraction Instructions (Optional)</label>
              <textarea class="fg-form-textarea" id="fg-input-prompt" rows="2" placeholder="e.g. Focus on pricing, discount codes, technical specs, and founder background...">${this.escapeHtml(this.aiSettings.customPrompt)}</textarea>
            </div>
          </div>
          <div class="fg-modal-footer">
            <button class="fg-btn fg-btn-secondary" id="fg-modal-btn-cancel">Cancel</button>
            <button class="fg-btn fg-btn-primary" id="fg-modal-btn-save">Save Settings</button>
          </div>
        </div>
      `;

      // Click outside to close
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeSettingsModal();
        }
      });

      const onEsc = (e) => {
        if (e.key === 'Escape') {
          this.closeSettingsModal();
          window.removeEventListener('keydown', onEsc);
        }
      };
      window.addEventListener('keydown', onEsc);

      modal.querySelector('#fg-modal-btn-close').addEventListener('click', () => this.closeSettingsModal());
      modal.querySelector('#fg-modal-btn-cancel').addEventListener('click', () => this.closeSettingsModal());

      const providerSelect = modal.querySelector('#fg-select-provider');
      providerSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        const models = providerModels[val] || ['default'];
        const modelSelect = modal.querySelector('#fg-select-model');
        modelSelect.innerHTML = models.map(m => `<option value="${m}">${m}</option>`).join('');

        modal.querySelector('#fg-group-apikey').style.display = (val === 'chrome-builtin') ? 'none' : 'flex';
        modal.querySelector('#fg-group-endpoint').style.display = (val === 'custom') ? 'flex' : 'none';
      });

      const eyeBtn = modal.querySelector('#fg-toggle-key-visibility');
      const keyInput = modal.querySelector('#fg-input-apikey');
      eyeBtn.addEventListener('click', () => {
        if (keyInput.type === 'password') {
          keyInput.type = 'text';
          eyeBtn.textContent = '🔒';
        } else {
          keyInput.type = 'password';
          eyeBtn.textContent = '👁';
        }
      });

      modal.querySelector('#fg-modal-btn-save').addEventListener('click', () => {
        this.saveSettings({
          provider: modal.querySelector('#fg-select-provider').value,
          apiKey: modal.querySelector('#fg-input-apikey').value.trim(),
          model: modal.querySelector('#fg-select-model').value,
          customEndpoint: modal.querySelector('#fg-input-endpoint').value.trim(),
          customPrompt: modal.querySelector('#fg-input-prompt').value.trim()
        });
        this.closeSettingsModal();
      });
    }

    closeSettingsModal() {
      this.showSettings = false;
      const modal = this.shadow.querySelector('.fg-modal-backdrop');
      if (modal) modal.remove();
    }

    // =========================================================================
    // Results Panel UI & Table Rendering
    // =========================================================================

    renderResultsPanel() {
      let panel = this.shadow.querySelector('.fg-panel');
      if (!panel) {
        panel = document.createElement('div');
        panel.className = 'fg-panel';
        panel.style.pointerEvents = 'auto';
        this.shadow.appendChild(panel);
        this.makeDraggable(panel, panel);
      }

      panel.style.display = 'flex';

      if (this.panelPos.x !== null && this.panelPos.y !== null) {
        panel.style.left = `${this.panelPos.x}px`;
        panel.style.top = `${this.panelPos.y}px`;
        panel.style.right = 'auto';
      }

      this.updatePanelContent();
    }

    updatePanelContent() {
      const panel = this.shadow.querySelector('.fg-panel');
      if (!panel) return;

      const filtered = this.extractedData.filter(item => {
        if (!this.searchQuery) return true;
        const q = this.searchQuery.toLowerCase();
        return item.field.toLowerCase().includes(q) || item.value.toLowerCase().includes(q) || item.source.toLowerCase().includes(q);
      });

      const totalCount = this.extractedData.length;
      const countDisplay = `${totalCount} field${totalCount === 1 ? '' : 's'} found`;

      const templateLabels = {
        general: 'General Facts',
        leads: 'Lead Profile',
        ecommerce: 'E-Commerce Product',
        job: 'Job Post Details',
        research: 'Research & Article'
      };

      panel.innerHTML = `
        <!-- Panel Header -->
        <div class="fg-panel-header">
          <div class="fg-panel-title-area">
            <div class="fg-logo-icon">FG</div>
            <div class="fg-panel-title">
              <span>Field Grab</span>
              <span class="fg-badge-count">${countDisplay}</span>
            </div>
          </div>
          <div class="fg-panel-controls">
            <button class="fg-btn fg-btn-secondary" id="fg-panel-btn-rescan" title="Re-scan full page for JSON-LD & meta tags" style="padding: 4px 8px; font-size: 11px;">
              <span>⚡ Free Scan</span>
            </button>
            <button class="fg-btn fg-btn-secondary" id="fg-panel-btn-region" title="Select another region to append" style="padding: 4px 8px; font-size: 11px;">
              <span>⛶ Region</span>
            </button>
            <button class="fg-btn fg-btn-ai" id="fg-panel-btn-ai" title="Extract via AI" style="padding: 4px 8px; font-size: 11px;">
              <span>🤖 AI Extract</span>
            </button>
            <button class="fg-btn-icon" id="fg-panel-btn-settings" title="Settings">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </button>
            <button class="fg-btn-icon" id="fg-panel-btn-close" title="Close Panel">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        <!-- Template Selector Bar -->
        <div style="padding: 6px 16px; background: #131b2e; border-bottom: 1px solid #1e293b; display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase;">AI Template:</span>
          <div class="fg-template-bar">
            <button class="fg-template-pill ${this.selectedTemplate === 'general' ? 'fg-active' : ''}" data-template="general" title="Extract all general facts">✨ General</button>
            <button class="fg-template-pill ${this.selectedTemplate === 'leads' ? 'fg-active' : ''}" data-template="leads" title="Extract name, role, email, socials, company">💼 Leads</button>
            <button class="fg-template-pill ${this.selectedTemplate === 'ecommerce' ? 'fg-active' : ''}" data-template="ecommerce" title="Extract product, price, specs, stock">🛒 E-Commerce</button>
            <button class="fg-template-pill ${this.selectedTemplate === 'job' ? 'fg-active' : ''}" data-template="job" title="Extract job title, company, salary, skills, education">📄 Job Post</button>
            <button class="fg-template-pill ${this.selectedTemplate === 'research' ? 'fg-active' : ''}" data-template="research" title="Extract headline, author, methodology, stats">📰 Research</button>
          </div>
        </div>

        <!-- Action Bar / Toolbar -->
        <div class="fg-panel-actions">
          <div class="fg-search-box">
            <svg class="fg-search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input type="text" class="fg-input-search" id="fg-search-input" placeholder="Search fields or values..." value="${this.escapeHtml(this.searchQuery)}">
          </div>
          <div class="fg-button-group">
            <button class="fg-btn fg-btn-secondary" id="fg-btn-add-row" title="Add a custom row">
              <span>➕ Add</span>
            </button>
            <button class="fg-btn fg-btn-primary" id="fg-btn-copy-csv" title="Copy table as CSV to clipboard">
              <span>📋 Copy CSV</span>
            </button>
            <button class="fg-btn fg-btn-secondary" id="fg-btn-copy-json" title="Copy raw object as JSON to clipboard">
              <span>📋 Copy JSON</span>
            </button>
            <button class="fg-btn fg-btn-secondary" id="fg-btn-download-csv" title="Download as CSV file">
              <span>⬇ CSV</span>
            </button>
          </div>
        </div>

        <!-- Table or Loading / Empty State -->
        <div class="fg-table-container">
          ${this.isLoadingAi ? this.renderAiLoadingHTML() : (filtered.length > 0 ? this.renderTableHTML(filtered) : this.renderEmptyStateHTML())}
        </div>

        <!-- Footer -->
        <div class="fg-panel-footer">
          <div class="fg-footer-stats">
            <span>Template: <strong>${templateLabels[this.selectedTemplate] || this.selectedTemplate}</strong></span>
            <span>•</span>
            <span>Provider: <strong>${this.aiSettings.provider.toUpperCase()}</strong> (${this.aiSettings.model})</span>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="fg-btn-icon" id="fg-btn-clear-all" title="Clear all fields" style="font-size: 11px; padding: 2px 6px;">
              🗑 Clear All
            </button>
          </div>
        </div>
      `;

      this.bindPanelEvents(panel);
    }

    renderAiLoadingHTML() {
      const templateNames = {
        general: 'General Facts',
        leads: 'Lead Profile (Name, Role, Email, Socials)',
        ecommerce: 'Product Details (Price, SKU, Specs)',
        job: 'Job Listing Details (Title, Salary, Skills, Education)',
        research: 'Article & Research Findings'
      };

      return `
        <div class="fg-ai-loading-container">
          <div class="fg-ai-spinner"></div>
          <div class="fg-ai-loading-title">Extracting ${templateNames[this.selectedTemplate] || 'structured data'} with AI...</div>
          <div class="fg-ai-loading-subtitle">
            Running <strong>${this.escapeHtml(this.aiSettings.provider.toUpperCase())}</strong> (${this.escapeHtml(this.aiSettings.model)}) on the page content.
          </div>
        </div>
      `;
    }

    renderTableHTML(rows) {
      const rowsHtml = rows.map((row, index) => {
        const badgeClass = `fg-badge-${row.source.replace(/[^a-z0-9-]/gi, '')}`;
        return `
          <tr data-index="${index}">
            <td class="fg-cell-field">
              <div class="fg-editable" contenteditable="true" data-field="field">${this.escapeHtml(row.field)}</div>
            </td>
            <td class="fg-cell-value">
              <div class="fg-editable" contenteditable="true" data-field="value">${this.escapeHtml(row.value)}</div>
            </td>
            <td class="fg-cell-source">
              <span class="fg-badge ${badgeClass}">${this.escapeHtml(row.source)}</span>
            </td>
            <td class="fg-cell-actions">
              <button class="fg-action-btn fg-copy-row-btn" data-index="${index}" title="Copy value to clipboard">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
              <button class="fg-action-btn fg-delete-btn" data-index="${index}" title="Delete row">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </td>
          </tr>
        `;
      }).join('');

      return `
        <table class="fg-table">
          <thead>
            <tr>
              <th style="width: 28%;">Field</th>
              <th style="width: 48%;">Value</th>
              <th style="width: 16%;">Source</th>
              <th style="width: 8%; text-align: right;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      `;
    }

    renderEmptyStateHTML() {
      return `
        <div class="fg-empty-state">
          <div class="fg-empty-icon">🔍</div>
          <div class="fg-empty-title">No structured fields found</div>
          <div class="fg-empty-desc">
            ${this.searchQuery
              ? `No fields match "${this.escapeHtml(this.searchQuery)}". Try clearing your search.`
              : `Try <strong>🤖 AI Extract</strong> for intelligent semantic understanding, or <strong>⛶ Select Region</strong> to drag-select any text block.`
            }
          </div>
          ${!this.searchQuery ? `
            <div style="display: flex; gap: 8px; margin-top: 8px;">
              <button class="fg-btn fg-btn-ai" id="fg-empty-btn-ai">
                <span>🤖 AI Extract</span>
              </button>
              <button class="fg-btn fg-btn-secondary" id="fg-empty-btn-mode-b">
                <span>⛶ Drag-Select Region</span>
              </button>
            </div>
          ` : ''}
        </div>
      `;
    }

    bindPanelEvents(panel) {
      panel.querySelector('#fg-panel-btn-close').addEventListener('click', () => {
        panel.style.display = 'none';
      });

      panel.querySelector('#fg-panel-btn-rescan').addEventListener('click', () => {
        this.runModeA();
      });

      panel.querySelector('#fg-panel-btn-region').addEventListener('click', () => {
        this.startModeB(true);
      });

      panel.querySelector('#fg-panel-btn-ai').addEventListener('click', () => {
        this.runAiExtractFullPage();
      });

      panel.querySelector('#fg-panel-btn-settings').addEventListener('click', (e) => {
        e.stopPropagation();
        this.openSettingsModal();
      });

      // Template pills: Clicking immediately switches template AND triggers AI extraction!
      panel.querySelectorAll('.fg-template-pill').forEach(pill => {
        pill.addEventListener('click', (e) => {
          const tmpl = e.currentTarget.getAttribute('data-template');
          this.runAiExtractFullPage(tmpl);
        });
      });

      const emptyBtnAi = panel.querySelector('#fg-empty-btn-ai');
      if (emptyBtnAi) {
        emptyBtnAi.addEventListener('click', () => this.runAiExtractFullPage());
      }

      const emptyBtnModeB = panel.querySelector('#fg-empty-btn-mode-b');
      if (emptyBtnModeB) {
        emptyBtnModeB.addEventListener('click', () => this.startModeB());
      }

      const searchInput = panel.querySelector('#fg-search-input');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          this.searchQuery = e.target.value;
          this.updatePanelContent();
          const newSearch = this.shadow.querySelector('#fg-search-input');
          if (newSearch) {
            newSearch.focus();
            newSearch.setSelectionRange(newSearch.value.length, newSearch.value.length);
          }
        });
      }

      panel.querySelector('#fg-btn-add-row').addEventListener('click', () => {
        this.extractedData.unshift({
          field: 'Custom Field',
          value: 'New Value',
          source: 'custom'
        });
        this.updatePanelContent();
      });

      panel.querySelector('#fg-btn-clear-all').addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all extracted fields?')) {
          this.extractedData = [];
          this.updatePanelContent();
        }
      });

      panel.querySelector('#fg-btn-copy-csv').addEventListener('click', () => {
        this.copyAsCSV();
      });

      panel.querySelector('#fg-btn-copy-json').addEventListener('click', () => {
        this.copyAsJSON();
      });

      panel.querySelector('#fg-btn-download-csv').addEventListener('click', () => {
        this.downloadCSV();
      });

      panel.querySelectorAll('.fg-editable').forEach(cell => {
        cell.addEventListener('blur', (e) => {
          const rowEl = e.target.closest('tr');
          if (!rowEl) return;
          const index = parseInt(rowEl.getAttribute('data-index'), 10);
          const fieldType = e.target.getAttribute('data-field');
          const val = e.target.textContent.trim();

          if (this.extractedData[index]) {
            this.extractedData[index][fieldType] = val;
          }
        });
      });

      panel.querySelectorAll('.fg-delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const index = parseInt(btn.getAttribute('data-index'), 10);
          this.extractedData.splice(index, 1);
          this.updatePanelContent();
        });
      });

      panel.querySelectorAll('.fg-copy-row-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const index = parseInt(btn.getAttribute('data-index'), 10);
          const item = this.extractedData[index];
          if (item) {
            await navigator.clipboard.writeText(item.value);
            this.showToast(`Copied "${item.field}" to clipboard!`);
          }
        });
      });

      this.makeDraggable(panel, panel.querySelector('.fg-panel-header'));
    }

    // =========================================================================
    // Export & Clipboard Helpers
    // =========================================================================

    async copyAsCSV() {
      if (this.extractedData.length === 0) {
        this.showToast('No fields to copy', true);
        return;
      }

      const csvContent = this.generateCSVString();

      try {
        await navigator.clipboard.writeText(csvContent);
        this.showToast(`✓ Copied ${this.extractedData.length} fields as CSV!`);
      } catch (err) {
        console.error('[Field Grab] Clipboard error:', err);
        this.fallbackCopy(csvContent);
      }
    }

    async copyAsJSON() {
      if (this.extractedData.length === 0) {
        this.showToast('No fields to copy', true);
        return;
      }

      const exportObject = {};
      this.extractedData.forEach(item => {
        exportObject[item.field] = item.value;
      });

      const jsonString = JSON.stringify(exportObject, null, 2);

      try {
        await navigator.clipboard.writeText(jsonString);
        this.showToast(`✓ Copied ${this.extractedData.length} fields as JSON!`);
      } catch (err) {
        console.error('[Field Grab] Clipboard error:', err);
        this.fallbackCopy(jsonString);
      }
    }

    generateCSVString() {
      const escapeCSV = (str) => {
        const text = String(str || '').replace(/"/g, '""');
        return `"${text}"`;
      };

      const header = '"Field","Value","Source"';
      const lines = this.extractedData.map(item => `${escapeCSV(item.field)},${escapeCSV(item.value)},${escapeCSV(item.source)}`);
      return [header, ...lines].join('\r\n');
    }

    downloadCSV() {
      if (this.extractedData.length === 0) {
        this.showToast('No fields to download', true);
        return;
      }

      const csv = this.generateCSVString();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `field-grab-export-${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      this.showToast('✓ CSV file downloaded!');
    }

    fallbackCopy(text) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        this.showToast('✓ Copied to clipboard!');
      } catch (e) {
        alert('Failed to copy to clipboard automatically.');
      }
      textarea.remove();
    }

    showToast(message, isError = false) {
      const existingToast = this.shadow.querySelector('.fg-toast');
      if (existingToast) existingToast.remove();

      const toast = document.createElement('div');
      toast.className = 'fg-toast';
      if (isError) toast.style.background = '#dc2626';
      toast.textContent = message;

      this.shadow.appendChild(toast);

      setTimeout(() => {
        toast.style.transition = 'opacity 0.3s ease';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
      }, 2200);
    }

    // =========================================================================
    // Utility & Parsing Helpers
    // =========================================================================

    addIf(array, field, value, source) {
      if (!value) return;
      const strVal = String(value).trim();
      if (!strVal || strVal === 'undefined' || strVal === 'null') return;

      array.push({
        field: String(field).trim(),
        value: strVal,
        source: source
      });
    }

    deduplicateAndSort(fields) {
      const seen = new Set();
      const unique = [];

      for (const item of fields) {
        const key = `${item.field.toLowerCase()}:::${item.value.toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(item);
        }
      }

      const priorityOrder = [
        'full name', 'person name', 'headline', 'current role', 'job title', 'company',
        'project / startup', 'specialization', 'location', 'connections', 'brand',
        'product name', 'price', 'salary', 'email', 'phone',
        'address', 'employment type', 'page title', 'title (og)', 'description', 'url'
      ];

      return unique.sort((a, b) => {
        const aIndex = priorityOrder.findIndex(p => a.field.toLowerCase().includes(p));
        const bIndex = priorityOrder.findIndex(p => b.field.toLowerCase().includes(p));

        const aScore = aIndex === -1 ? 999 : aIndex;
        const bScore = bIndex === -1 ? 999 : bIndex;

        return aScore - bScore;
      });
    }

    isType(type, expected) {
      if (!type) return false;
      if (Array.isArray(type)) return type.some(t => String(t).toLowerCase().includes(expected.toLowerCase()));
      return String(type).toLowerCase().includes(expected.toLowerCase());
    }

    deepGet(obj, path) {
      return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj);
    }

    formatAddress(addr) {
      if (!addr) return null;
      if (typeof addr === 'string') return addr;
      if (typeof addr === 'object') {
        const parts = [
          addr.streetAddress,
          addr.addressLocality,
          addr.addressRegion,
          addr.postalCode,
          addr.addressCountry
        ].filter(Boolean);
        return parts.length > 0 ? parts.join(', ') : null;
      }
      return null;
    }

    formatSalary(salary) {
      if (!salary) return null;
      if (typeof salary === 'string' || typeof salary === 'number') return String(salary);
      if (typeof salary === 'object') {
        const val = salary.value || salary.minValue || salary;
        const currency = salary.currency || salary.priceCurrency || '';
        const unit = salary.unitText ? ` / ${salary.unitText}` : '';
        if (typeof val === 'object') {
          const min = val.minValue || val.value;
          const max = val.maxValue;
          if (min && max) return `${currency} ${min} - ${max}${unit}`.trim();
          if (min) return `${currency} ${min}${unit}`.trim();
        }
        return `${currency} ${val}${unit}`.trim();
      }
      return null;
    }

    cleanAvailability(avail) {
      if (!avail) return null;
      return String(avail).replace(/^https?:\/\/schema\.org\//i, '').replace(/([A-Z])/g, ' $1').trim();
    }

    cleanHtml(html) {
      if (!html) return '';
      const tmp = document.createElement('div');
      tmp.innerHTML = html;
      return tmp.textContent.trim().replace(/\s+/g, ' ');
    }

    formatFieldLabel(key, typeLabel) {
      const parts = key.split('.').map(k => k.replace(/\[\d+\]/g, ''));
      const last = parts[parts.length - 1];
      const titleCased = last.replace(/([A-Z])/g, ' $1').replace(/^[a-z]/, c => c.toUpperCase()).trim();
      return typeLabel ? `${titleCased} (${typeLabel})` : titleCased;
    }

    escapeHtml(str) {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    makeDraggable(element, handle) {
      let isDragging = false;
      let startX, startY, initialLeft, initialTop;

      handle.addEventListener('mousedown', (e) => {
        if (e.button !== 0 || e.target.closest('button, input, select, textarea, [contenteditable="true"]')) return;
        isDragging = true;

        const rect = element.getBoundingClientRect();
        startX = e.clientX;
        startY = e.clientY;
        initialLeft = rect.left;
        initialTop = rect.top;

        element.style.right = 'auto';
        element.style.left = `${initialLeft}px`;
        element.style.top = `${initialTop}px`;

        const onMouseMove = (moveEvent) => {
          if (!isDragging) return;
          const dx = moveEvent.clientX - startX;
          const dy = moveEvent.clientY - startY;

          const newLeft = Math.max(10, Math.min(window.innerWidth - element.offsetWidth - 10, initialLeft + dx));
          const newTop = Math.max(10, Math.min(window.innerHeight - element.offsetHeight - 10, initialTop + dy));

          element.style.left = `${newLeft}px`;
          element.style.top = `${newTop}px`;

          if (element.classList.contains('fg-panel')) {
            this.panelPos = { x: newLeft, y: newTop };
          }
        };

        const onMouseUp = () => {
          isDragging = false;
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      });
    }
  }

  window.__FIELD_GRAB_INSTANCE__ = new FieldGrab();
})();
