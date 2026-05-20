const https = require('https');

const TOKEN = 'REMOVED_TOKEN';

function apiGet(path) {
  return new Promise((resolve) => {
    const req = https.get({
      hostname: 'api.github.com',
      path,
      headers: {
        'Authorization': `token ${TOKEN}`,
        'User-Agent': 'LMPasso-Monitor',
        'Accept': 'application/vnd.github.v3+json'
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(data); } });
    });
    req.on('error', () => resolve(null));
  });
}

function checkUrl(url) {
  return new Promise((resolve) => {
    const req = https.get(url, { timeout: 12000 }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body: body.substring(0, 150) }));
    });
    req.on('error', (e) => resolve({ status: 0, body: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, body: 'timeout' }); });
  });
}

async function main() {
  // Check latest deployments on GitHub
  const deploys = await apiGet('/repos/lmgraficarailway-wq/lm-passo/deployments?per_page=3');
  if (Array.isArray(deploys)) {
    console.log('Últimos deployments GitHub:');
    for (const d of deploys) {
      console.log(` - ${d.environment} | ${d.created_at} | sha: ${d.sha?.substring(0,7)}`);
      const statuses = await apiGet(`/repos/lmgraficarailway-wq/lm-passo/deployments/${d.id}/statuses`);
      if (Array.isArray(statuses) && statuses.length > 0) {
        console.log(`   estado: ${statuses[0].state} | ${statuses[0].description || ''}`);
      }
    }
  }

  // Try root URL and other paths
  const urls = [
    'https://lm-passo-production.up.railway.app',
    'https://lm-passo-production.up.railway.app/api/health',
    'https://lm-passo-production.up.railway.app/api/auth',
  ];
  console.log('\nTestando URLs:');
  for (const url of urls) {
    const r = await checkUrl(url);
    console.log(` ${r.status > 0 ? r.status : '❌'} ${url} → ${r.body.substring(0, 80)}`);
  }
}

main().catch(console.error);
