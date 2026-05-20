const https = require('https');

const TOKEN = 'rw_Fe26.2**f9c5b8101a74566930bda92ff98f901d380118da43ccbd885b3934d6b1c08592*jUfYsxt5M3-S4Mxig8PDtA*87VTCNN8GLxX1dFi5biv47eX8bFWUiYAaxEt8AcpwX55SdKXgjRkJMXBrc-CT1yDpnO2Woj3EDTOl4Eb6YcVew*1780780108194*4851b8c5d213d4d74dbb244c22674e0ca4b84994fa5fdb1a919c4aa6f20ad81c*KhKvyfv1BbDv0GRXwI0ATVbUTynFM00Cp2rRRXbQ4Js';

function gql(query, variables = {}) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query, variables });
    const req = https.request({
      hostname: 'backboard.railway.app',
      path: '/graphql/v2',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); }
        catch { resolve({ raw: d }); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log('🔍 Buscando projetos Railway...\n');
  
  const result = await gql(`{
    me {
      name
      email
      projects {
        edges {
          node {
            id
            name
            services {
              edges {
                node {
                  id
                  name
                }
              }
            }
          }
        }
      }
    }
  }`);

  if (result.data?.me) {
    const me = result.data.me;
    console.log(`✅ Logado como: ${me.name} (${me.email})\n`);
    console.log('📋 Projetos encontrados:');
    me.projects.edges.forEach(({ node: p }) => {
      console.log(`\n  🗂  ${p.name} (${p.id})`);
      p.services.edges.forEach(({ node: s }) => {
        console.log(`     └─ Serviço: ${s.name} (${s.id})`);
      });
    });
  } else {
    console.log('Erro:', JSON.stringify(result).substring(0, 300));
  }
}

main().catch(console.error);
