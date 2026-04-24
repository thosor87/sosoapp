// Deploys firestore.rules to production via Firebase Rules REST API.
// Uses only Node.js built-ins (crypto, https, fs) — no npm installs needed.
// Called from CI: node scripts/deploy-firestore-rules.mjs
import crypto from 'crypto';
import https from 'https';
import fs from 'fs';

console.log('Node version:', process.version);
console.log('PROJECT_ID set:', !!process.env.PROJECT_ID);
console.log('FIREBASE_SA_JSON set:', !!process.env.FIREBASE_SA_JSON);

let sa;
try {
  sa = JSON.parse(process.env.FIREBASE_SA_JSON);
  console.log('SA parsed, client_email:', sa.client_email);
} catch (e) {
  console.error('Failed to parse FIREBASE_SA_JSON:', e.message);
  process.exit(1);
}
const pid = process.env.PROJECT_ID;
const rules = fs.readFileSync('firestore.rules', 'utf8');

function b64url(s) {
  return Buffer.from(s).toString('base64url');
}

function makeJwt() {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/firebase',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }));
  const sign = crypto.createSign('SHA256');
  sign.update(`${header}.${claim}`);
  const sig = sign.sign(sa.private_key, 'base64url');
  return `${header}.${claim}.${sig}`;
}

async function getToken() {
  const jwt = makeJwt();
  const body = `grant_type=urn%3Aietf%3Aparams%3Aoauth2%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Token exchange failed: ' + JSON.stringify(data));
  console.log('Access token obtained.');
  return data.access_token;
}

async function api(token, method, path, body) {
  const res = await fetch(`https://firebaserules.googleapis.com/v1/projects/${pid}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  console.log(`${method} ${path} → ${res.status}`);
  if (!res.ok) {
    console.error('Response:', JSON.stringify(data).slice(0, 500));
    throw new Error(`${method} ${path} failed with ${res.status}`);
  }
  return data;
}

const token = await getToken();

// 1. Create ruleset
const ruleset = await api(token, 'POST', '/rulesets', {
  source: { files: [{ name: 'firestore.rules', content: rules }] },
});
console.log('Ruleset created:', ruleset.name);

// 2. Update cloud.firestore release
const release = await api(token, 'PATCH', '/releases/cloud.firestore', {
  name: `projects/${pid}/releases/cloud.firestore`,
  rulesetName: ruleset.name,
});
console.log('Release updated:', release.name);
console.log('Firestore rules deployed successfully.');
