const https = require('https');

const url = 'https://lm-passo.onrender.com/api/health';

function check() {
  return new Promise((resolve) => {
    const req = https.get(url, { timeout: 15000 }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body: body.substring(0, 100) }));
    });
    req.on('error', () => resolve({ status: 0 }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0 }); });
  });
}

async function main() {
  const r = await check();
  console.log('RENDER_STATUS:' + r.status + ':' + r.body);
}

main();
