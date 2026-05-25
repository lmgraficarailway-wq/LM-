const fs = require('fs');

// ── Fix order_controller.js ───────────────────────────────────────────────────
let f = 'server/controllers/order_controller.js';
let c = fs.readFileSync(f, 'utf8');

// Remove all broken checklist expressions
while (c.includes('parseChecklist(r.checklist)') === false && 
       (c.includes("typeof r.checklist==='object'") || c.includes("JSON.parse(r.checklist)"))) {
    // Simple strategy: replace the entire checklist line
    c = c.replace(
        /checklist: [^\n]+JSON\.parse\(r\.checklist\)[^\n]+/g,
        'checklist: parseChecklist(r.checklist)'
    );
}

// Add helper function if not already present
if (!c.includes('function parseChecklist')) {
    const helper = `\n// Helper para parsear checklist (SQLite=string JSON, Firestore=objeto)\nfunction parseChecklist(v) {\n    if (!v) return { arte: false, impressao: false, corte: false, embalagem: false };\n    if (typeof v === 'object') return v;\n    try { return JSON.parse(v); } catch(e) { return { arte: false, impressao: false, corte: false, embalagem: false }; }\n}\n\n`;
    c = helper + c;
}

fs.writeFileSync(f, c, 'utf8');
console.log('order_controller.js fixed');

// ── Fix catalogue_controller.js ───────────────────────────────────────────────
f = 'server/controllers/catalogue_controller.js';
c = fs.readFileSync(f, 'utf8');

// Replace broken image_url expressions
c = c.replace(/images = [^\n]+JSON\.parse\(row\.image_url\)[^\n]+/g, 'images = parseImageUrl(row.image_url)');
c = c.replace(/oldImages = [^\n]+JSON\.parse\(row\.image_url\)[^\n]+/g, 'oldImages = parseImageUrl(row.image_url)');

if (!c.includes('function parseImageUrl')) {
    const helper = `\n// Helper para parsear image_url (SQLite=JSON string, Firestore=array)\nfunction parseImageUrl(v) {\n    if (!v) return [];\n    if (Array.isArray(v)) return v;\n    try { return JSON.parse(v); } catch(e) { return []; }\n}\n\n`;
    c = helper + c;
}

fs.writeFileSync(f, c, 'utf8');
console.log('catalogue_controller.js fixed');

// ── Syntax check both files ───────────────────────────────────────────────────
const { execSync } = require('child_process');
try {
    execSync('node --check server/controllers/order_controller.js', { cwd: 'c:/Users/T.i/Desktop/aplicativo', stdio: 'pipe' });
    console.log('order_controller.js: OK syntax');
} catch(e) { console.error('order_controller.js SYNTAX ERROR:', e.stderr.toString().substring(0, 300)); }

try {
    execSync('node --check server/controllers/catalogue_controller.js', { cwd: 'c:/Users/T.i/Desktop/aplicativo', stdio: 'pipe' });
    console.log('catalogue_controller.js: OK syntax');
} catch(e) { console.error('catalogue_controller.js SYNTAX ERROR:', e.stderr.toString().substring(0, 300)); }
