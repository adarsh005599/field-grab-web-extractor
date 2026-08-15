/**
 * Field Grab - Background Service Worker (Manifest V3)
 * Handles extension activation, on-demand content script injection,
 * and background API proxying for Phase 2 AI Extraction.
 */

// =============================================================================
// Extension Activation & Tab Script Injection
// =============================================================================

async function triggerFieldGrab(tab) {
  if (!tab || !tab.id) return;

  if (
    !tab.url ||
    tab.url.startsWith('chrome://') ||
    tab.url.startsWith('chrome-extension://') ||
    tab.url.startsWith('edge://') ||
    tab.url.startsWith('devtools://') ||
    tab.url.startsWith('about:') ||
    tab.url.startsWith('view-source:')
  ) {
    console.warn('[Field Grab] Cannot run on internal browser URL:', tab.url);
    return;
  }

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'fg_toggle' });
    if (response && response.status === 'ok') {
      return;
    }
  } catch (err) {
    try {
      await chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ['content.css']
      });

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });

      setTimeout(async () => {
        try {
          await chrome.tabs.sendMessage(tab.id, { action: 'fg_open' });
        } catch (e) {
          console.error('[Field Grab] Post-injection communication error:', e);
        }
      }, 80);
    } catch (injectionError) {
      console.error('[Field Grab] Failed to inject content script:', injectionError);
    }
  }
}

chrome.action.onClicked.addListener(async (tab) => {
  await triggerFieldGrab(tab);
});

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command === 'toggle-field-grab' || command === '_execute_action') {
    if (!tab) {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab) {
        await triggerFieldGrab(activeTab);
      }
    } else {
      await triggerFieldGrab(tab);
    }
  }
});

// =============================================================================
// Phase 2: AI Provider Request Handlers (Gemini, OpenAI, Claude, Groq, Ollama)
// =============================================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'fg_ai_extract') {
    handleAiExtraction(message.payload)
      .then((result) => sendResponse({ status: 'ok', data: result }))
      .catch((err) => sendResponse({ status: 'error', message: err.message || 'AI request failed' }));
    return true; // Keep message channel open for async response
  }
});

async function handleAiExtraction(payload) {
  const { provider, apiKey, model, customEndpoint, text, schemaInstruction } = payload;

  if (!text || !text.trim()) {
    throw new Error('No text provided for AI extraction.');
  }

  const systemPrompt = `You are an expert structured data extraction engine.
Your task is to analyze the provided web page text and extract all relevant structured facts into a clean JSON array.

Extraction Goal / Instructions:
${schemaInstruction || 'Extract all key entities, facts, names, roles, contact info, pricing, product specs, and key details from this text.'}

STRICT OUTPUT FORMAT RULES:
1. You MUST respond with ONLY a valid JSON array of objects.
2. Each object in the array MUST have exactly two string properties: "field" and "value".
Example:
[
  {"field": "Full Name", "value": "Jane Doe"},
  {"field": "Job Title", "value": "Lead Architect"},
  {"field": "Company", "value": "Acme Corp"}
]
3. Do NOT include markdown code blocks, introductory text, explanations, or any conversational text. Output raw JSON only.`;

  let rawResponseText = '';

  // 1. Google Gemini API
  if (provider === 'gemini') {
    if (!apiKey) throw new Error('Please configure your Google Gemini API key in Settings.');
    const targetModel = model || 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: `${systemPrompt}\n\nWeb Page Text to Extract:\n\"\"\"\n${text}\n\"\"\"` }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json'
        }
      })
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error?.message || `Gemini API Error (${res.status}): ${res.statusText}`);
    }

    const json = await res.json();
    rawResponseText = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  // 2. OpenAI API
  else if (provider === 'openai') {
    if (!apiKey) throw new Error('Please configure your OpenAI API key in Settings.');
    const targetModel = model || 'gpt-4o-mini';
    const url = 'https://api.openai.com/v1/chat/completions';

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: targetModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Web Page Text to Extract:\n\"\"\"\n${text}\n\"\"\"` }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      })
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error?.message || `OpenAI API Error (${res.status}): ${res.statusText}`);
    }

    const json = await res.json();
    rawResponseText = json.choices?.[0]?.message?.content || '';
  }

  // 3. Anthropic Claude API
  else if (provider === 'claude') {
    if (!apiKey) throw new Error('Please configure your Anthropic API key in Settings.');
    const targetModel = model || 'claude-3-5-haiku-20241022';
    const url = 'https://api.anthropic.com/v1/messages';

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'dangerously-allow-browser': 'true'
      },
      body: JSON.stringify({
        model: targetModel,
        max_tokens: 2048,
        system: systemPrompt,
        messages: [
          { role: 'user', content: `Web Page Text to Extract:\n\"\"\"\n${text}\n\"\"\"` }
        ],
        temperature: 0.1
      })
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error?.message || `Claude API Error (${res.status}): ${res.statusText}`);
    }

    const json = await res.json();
    rawResponseText = json.content?.[0]?.text || '';
  }

  // 4. Groq API
  else if (provider === 'groq') {
    if (!apiKey) throw new Error('Please configure your Groq API key in Settings.');
    const targetModel = model || 'llama-3.3-70b-versatile';
    const url = 'https://api.groq.com/openai/v1/chat/completions';

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: targetModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Web Page Text to Extract:\n\"\"\"\n${text}\n\"\"\"` }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      })
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error?.message || `Groq API Error (${res.status}): ${res.statusText}`);
    }

    const json = await res.json();
    rawResponseText = json.choices?.[0]?.message?.content || '';
  }

  // 5. Custom / Local Ollama or LM Studio Endpoint
  else if (provider === 'custom') {
    let endpoint = (customEndpoint || 'http://localhost:11434/v1').replace(/\/+$/, '');
    if (!endpoint.endsWith('/chat/completions')) {
      endpoint = `${endpoint}/chat/completions`;
    }

    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: model || 'llama3.2',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Web Page Text to Extract:\n\"\"\"\n${text}\n\"\"\"` }
        ],
        temperature: 0.1
      })
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error?.message || `Custom Endpoint Error (${res.status}): ${res.statusText}`);
    }

    const json = await res.json();
    rawResponseText = json.choices?.[0]?.message?.content || '';
  } else {
    throw new Error(`Unsupported AI provider: ${provider}`);
  }

  return parseAiStructuredOutput(rawResponseText);
}

function parseAiStructuredOutput(raw) {
  if (!raw || !raw.trim()) {
    throw new Error('AI returned an empty response.');
  }

  // Clean markdown code blocks (e.g. ```json ... ```)
  let clean = raw.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  let parsed = null;

  try {
    parsed = JSON.parse(clean);
  } catch (e) {
    // If response was wrapped in an object like {"data": [...] or {"fields": [...]} or {"items": [...]}
    try {
      const sanitized = clean.replace(/,\s*([\]}])/g, '$1');
      parsed = JSON.parse(sanitized);
    } catch (err) {
      // Regex extraction for field-value pairs as fallback
      const fieldRegex = /"field"\s*:\s*"([^"]+)"\s*,\s*"value"\s*:\s*"([^"]+)"/gi;
      const matches = [...clean.matchAll(fieldRegex)];
      if (matches.length > 0) {
        parsed = matches.map(m => ({ field: m[1], value: m[2] }));
      } else {
        throw new Error('Failed to parse AI structured response: ' + clean.slice(0, 120));
      }
    }
  }

  // Normalize parsed data into an array of { field, value, source: 'ai' }
  const results = [];

  if (Array.isArray(parsed)) {
    parsed.forEach(item => {
      if (item && typeof item === 'object') {
        const field = item.field || item.name || item.key || Object.keys(item)[0];
        const value = item.value || item.content || item.val || Object.values(item)[0];
        if (field && value) {
          results.push({ field: String(field).trim(), value: String(value).trim(), source: 'ai' });
        }
      }
    });
  } else if (typeof parsed === 'object' && parsed !== null) {
    // If wrapped in root key (e.g. { fields: [...] } or direct key-values)
    const arrayContainer = parsed.fields || parsed.data || parsed.items || parsed.extracted;
    if (Array.isArray(arrayContainer)) {
      arrayContainer.forEach(item => {
        if (item && typeof item === 'object') {
          const field = item.field || item.name || item.key || Object.keys(item)[0];
          const value = item.value || item.content || item.val || Object.values(item)[0];
          if (field && value) {
            results.push({ field: String(field).trim(), value: String(value).trim(), source: 'ai' });
          }
        }
      });
    } else {
      for (const [k, v] of Object.entries(parsed)) {
        if (v !== null && v !== undefined && typeof v !== 'object') {
          results.push({ field: String(k).trim(), value: String(v).trim(), source: 'ai' });
        } else if (Array.isArray(v)) {
          results.push({ field: String(k).trim(), value: v.join(', '), source: 'ai' });
        }
      }
    }
  }

  if (results.length === 0) {
    throw new Error('No structured fields could be extracted by AI.');
  }

  return results;
}
