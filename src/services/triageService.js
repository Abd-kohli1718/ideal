const { TRIAGE_SYSTEM_PROMPT } = require('./triagePrompt');
const { getServiceClient } = require('./supabase');

const MAX_OUTPUT_TOKENS = 300;
function geminiModel() {
  return process.env.GEMINI_MODEL || 'gemini-2.0-flash';
}

function parseTriageJson(text) {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();
  const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonStr = codeBlock ? codeBlock[1].trim() : trimmed;
  try {
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

function normalizeResult(parsed) {
  const allowedSeverity = new Set(['high', 'medium', 'low']);
  const allowedResponse = new Set(['ambulance', 'fire', 'police', 'rescue', 'unknown']);
  const severity = allowedSeverity.has(parsed?.severity) ? parsed.severity : 'low';
  const response_type = allowedResponse.has(parsed?.response_type)
    ? parsed.response_type
    : 'unknown';
  const is_duplicate = Boolean(parsed?.is_duplicate);
  const extracted_location =
    typeof parsed?.extracted_location === 'string' ? parsed.extracted_location : null;
  return { severity, response_type, is_duplicate, extracted_location };
}

/**
 * No paid LLM: keyword + recent-alert overlap heuristics (prototype-safe).
 */
function runKeywordTriage(message, type, contextAlerts, alertId) {
  const m = (message || '').toLowerCase();
  let response_type = 'unknown';
  let severity = 'low';

  const fireWords = ['fire', 'smoke', 'burn', 'explosion', 'blaze', 'gas smell', 'spark'];
  const medWords = [
    'medical',
    'ambulance',
    'injured',
    'collapsed',
    'blood',
    'breathing',
    'unconscious',
    'not breathing',
    'heart',
  ];
  const policeWords = ['police', 'fight', 'violence', 'threat', 'robbery', 'crime', 'disturbance', 'missing'];
  const rescueWords = ['flood', 'stuck', 'trapped', 'rescue', 'tree fallen', 'underpass', 'power lines'];

  if (fireWords.some((w) => m.includes(w))) {
    response_type = 'fire';
    severity = m.includes('explosion') ? 'high' : 'medium';
  } else if (medWords.some((w) => m.includes(w))) {
    response_type = 'ambulance';
    severity = 'high';
  } else if (policeWords.some((w) => m.includes(w))) {
    response_type = 'police';
    severity = m.includes('violence') || m.includes('threat') ? 'high' : 'medium';
  } else if (rescueWords.some((w) => m.includes(w))) {
    response_type = 'rescue';
    severity = 'medium';
  } else if (type === 'sos_button') {
    response_type = 'unknown';
    severity = 'high';
  }

  const norm = (s) =>
    (s || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 100);
  const nm = norm(message);
  let is_duplicate = false;
  for (const a of contextAlerts) {
    if (!a || a.id === alertId) continue;
    const o = norm(a.message);
    if (nm.length > 25 && o.length > 25 && (nm === o || nm.includes(o) || o.includes(nm))) {
      is_duplicate = true;
      break;
    }
  }

  return {
    severity,
    response_type,
    is_duplicate,
    extracted_location: null,
    raw_ai_output: '[rules-based triage — set GEMINI_API_KEY for Google AI Studio LLM]',
  };
}

/**
 * Google Gemini (free tier via https://aistudio.google.com/apikey — often no paid billing).
 */
async function callGemini(systemPrompt, userText) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel()}:generateContent?key=${encodeURIComponent(key)}`;
  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userText }] }],
    generationConfig: {
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      temperature: 0.2,
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`Gemini HTTP ${res.status}: ${raw.slice(0, 500)}`);
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('Gemini: invalid JSON response');
  }

  const part = data.candidates?.[0]?.content?.parts?.[0];
  const text = typeof part?.text === 'string' ? part.text : '';
  if (!text && data.promptFeedback?.blockReason) {
    throw new Error(`Gemini blocked: ${data.promptFeedback.blockReason}`);
  }
  return text;
}

/**
 * @param {string} alertId
 * @param {string} message
 * @param {string} type
 * @param {number} latitude
 * @param {number} longitude
 */
async function callInferenceServer(payload) {
  try {
    const res = await fetch('http://localhost:5000/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`Inference server HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return null;
  }
}

async function runTriage(alertId, message, type, latitude, longitude) {
  const supabase = getServiceClient();
  const defaults = {
    severity: 'low',
    response_type: 'unknown',
    is_duplicate: false,
    extracted_location: null,
    raw_ai_output: null,
  };

  const { data: recent, error: recentErr } = await supabase
    .from('alerts')
    .select('id, message, type, latitude, longitude, created_at, severity, response_type')
    .order('created_at', { ascending: false })
    .limit(10);

  if (recentErr) {
    console.error('triageService: failed to load recent alerts', recentErr);
  }

  const contextAlerts = (recent || []).filter((a) => a.id !== alertId).slice(0, 10);

  const userPayload = {
    new_alert: { id: alertId, message, type, latitude, longitude },
    recent_alerts: contextAlerts,
  };

  const userText = `Analyze and return JSON only.\n\n${JSON.stringify(userPayload)}`;

  let rawText = '';
  /** @type {{ severity: string, response_type: string, is_duplicate: boolean, extracted_location: string | null } | null} */
  let normalized = null;

  try {
    // 1. Try PyTorch / ML inference server first!
    const mlResult = await callInferenceServer({
      message: message || '',
      type: type || 'manual_form',
      latitude: latitude,
      longitude: longitude
    });

    if (mlResult && mlResult.severity) {
      normalized = {
        severity: mlResult.severity,
        response_type: mlResult.response_type || 'unknown',
        is_duplicate: mlResult.is_duplicate || false,
        extracted_location: mlResult.extracted_location || null,
      };
      rawText = `[ML Inference Server]\nSeverity: ${mlResult.severity} (${(mlResult.severity_confidence || 0).toFixed(2)})\nResponse: ${mlResult.response_type} (${(mlResult.response_confidence || 0).toFixed(2)})\nImage Severity: ${mlResult.image_severity || 'none'}`;
    }

    // 2. Try Gemini if ML server failed
    if (!normalized && process.env.GEMINI_API_KEY) {
      try {
        rawText = (await callGemini(TRIAGE_SYSTEM_PROMPT, userText)) || '';
        const parsed = parseTriageJson(rawText);
        if (parsed) normalized = normalizeResult(parsed);
      } catch (gemErr) {
        console.error('triageService: Gemini request failed', gemErr);
        rawText = gemErr?.message || String(gemErr);
      }
    }

    // 3. Fallback to Keyword Triage
    if (!normalized) {
      const kw = runKeywordTriage(message, type, contextAlerts, alertId);
      normalized = {
        severity: kw.severity,
        response_type: kw.response_type,
        is_duplicate: kw.is_duplicate,
        extracted_location: kw.extracted_location,
      };
      if (!rawText) rawText = kw.raw_ai_output || '';
      else rawText = `${rawText}\n\n(rules fallback applied)`;
    }

    const final = {
      ...defaults,
      ...normalized,
      raw_ai_output: rawText || null,
    };

    const { error: updErr } = await supabase
      .from('alerts')
      .update({
        severity: final.severity,
        response_type: final.response_type,
      })
      .eq('id', alertId);

    if (updErr) {
      console.error('triageService: failed to update alert', updErr);
    }

    const { error: insErr } = await supabase.from('triage_results').insert({
      alert_id: alertId,
      severity: final.severity,
      response_type: final.response_type,
      extracted_location: final.extracted_location,
      is_duplicate: final.is_duplicate,
      raw_ai_output: final.raw_ai_output,
    });

    if (insErr) {
      console.error('triageService: failed to insert triage_results', insErr);
    }

    return { severity: final.severity, response_type: final.response_type };
  } catch (err) {
    console.error('triageService: triage failed', err);
    const kw = runKeywordTriage(message, type, contextAlerts, alertId);
    const final = {
      ...defaults,
      ...normalizeResult(kw),
      raw_ai_output: err?.message || String(err),
    };
    await persistFallback(supabase, alertId, final, 'triage error');
    return { severity: final.severity, response_type: final.response_type };
  }
}

async function persistFallback(supabase, alertId, final, reason) {
  const { error: updErr } = await supabase
    .from('alerts')
    .update({
      severity: final.severity,
      response_type: final.response_type,
    })
    .eq('id', alertId);

  if (updErr) {
    console.error('triageService: fallback update failed', updErr);
  }

  const { error: insErr } = await supabase.from('triage_results').insert({
    alert_id: alertId,
    severity: final.severity,
    response_type: final.response_type,
    extracted_location: final.extracted_location,
    is_duplicate: final.is_duplicate,
    raw_ai_output: final.raw_ai_output || reason,
  });

  if (insErr) {
    console.error('triageService: fallback triage_results insert failed', insErr);
  }
}

module.exports = { runTriage };
