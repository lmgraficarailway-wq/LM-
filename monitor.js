const https = require('https');
const fs = require('fs');
const path = require('path');

const TOKEN = 'REMOVED_TOKEN';
const REPO = 'lmgraficarailway-wq/LM-';

function api(method, endpoint, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.github.com',
      path: `/repos/${REPO}${endpoint}`,
      method,
      headers: {
        'Authorization': `token ${TOKEN}`,
        'User-Agent': 'LMPasso-Deploy',
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function fileToBase64(filePath) {
  return fs.readFileSync(filePath).toString('base64');
}

async function getFileSha(filePath) {
  const res = await api('GET', `/contents/${filePath}`);
  return res.body?.sha || null;
}

async function uploadFile(localPath, repoPath) {
  const content = fileToBase64(localPath);
  const sha = await getFileSha(repoPath);
  const body = {
    message: `deploy: atualizar ${repoPath}`,
    content,
    branch: 'gh-pages'
  };
  if (sha) body.sha = sha;
  const res = await api('PUT', `/contents/${repoPath}`, body);
  return res.status;
}

async function apiGlobal(method, endpoint, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.github.com',
      path: endpoint,
      method,
      headers: {
        'Authorization': `token ${TOKEN}`,
        'User-Agent': 'LMPasso-Deploy',
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  console.log('🚀 Iniciando deploy para GitHub Pages...\n');

  // 1. Get master branch SHA
  console.log('1️⃣  Obtendo branch master...');
  const masterRef = await apiGlobal('GET', `/repos/${REPO}/git/ref/heads/master`);
  const masterSha = masterRef.body?.object?.sha;
  console.log('SHA master:', masterSha?.substring(0, 10));

  // 2. Create gh-pages branch from master (or check if exists)
  console.log('\n2️⃣  Criando branch gh-pages...');
  const createBranch = await apiGlobal('POST', `/repos/${REPO}/git/refs`, {
    ref: 'refs/heads/gh-pages',
    sha: masterSha
  });
  
  if (createBranch.status === 201) {
    console.log('✅ Branch gh-pages criada!');
  } else if (createBranch.status === 422) {
    console.log('ℹ️  Branch gh-pages já existe, continuando...');
  } else {
    console.log('Branch status:', createBranch.status, JSON.stringify(createBranch.body).substring(0, 100));
  }

  // 3. Upload index.html at root of gh-pages (redirect to arte-generator)
  console.log('\n3️⃣  Criando index.html raiz...');
  const indexRedirect = Buffer.from(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0; url=./arte-generator/index.html">
  <title>LM PASSO</title>
</head>
<body>
  <p>Redirecionando... <a href="./arte-generator/index.html">Clique aqui</a></p>
</body>
</html>`).toString('base64');

  // Get existing SHA if file exists on gh-pages
  const existingIndex = await apiGlobal('GET', `/repos/${REPO}/contents/index.html?ref=gh-pages`);
  const indexSha = existingIndex.body?.sha || null;
  
  const uploadIndex = await apiGlobal('PUT', `/repos/${REPO}/contents/index.html`, {
    message: 'deploy: adicionar index redirect',
    content: indexRedirect,
    branch: 'gh-pages',
    ...(indexSha ? { sha: indexSha } : {})
  });
  console.log('Upload index.html:', uploadIndex.status === 200 || uploadIndex.status === 201 ? '✅' : uploadIndex.status);

  // 4. Enable GitHub Pages
  console.log('\n4️⃣  Ativando GitHub Pages...');
  const pages = await apiGlobal('POST', `/repos/${REPO}/pages`, {
    source: { branch: 'gh-pages', path: '/' }
  });
  
  if (pages.status === 201) {
    console.log('✅ GitHub Pages ativado!');
    console.log('🌐 URL:', pages.body?.html_url);
  } else if (pages.status === 409) {
    console.log('ℹ️  GitHub Pages já estava ativo!');
    const pagesInfo = await apiGlobal('GET', `/repos/${REPO}/pages`);
    console.log('🌐 URL:', pagesInfo.body?.html_url);
  } else {
    console.log('Pages status:', pages.status, JSON.stringify(pages.body).substring(0, 200));
  }

  console.log('\n✅ PRONTO! Aguarde ~1 minuto e acesse a URL acima.');
}

main().catch(console.error);
