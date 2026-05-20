const fs = require('fs');
const https = require('https');

const query = `
  query IntrospectionQuery {
    __schema {
      mutationType {
        fields {
          name
          args {
            name
            type {
              name
              kind
              ofType {
                name
                kind
              }
            }
          }
        }
      }
    }
  }
`;

const data = JSON.stringify({ query });

const options = {
  hostname: 'backboard.railway.app',
  port: 443,
  path: '/graphql/v2',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer rw_Fe26.2**f9c5b8101a74566930bda92ff98f901d380118da43ccbd885b3934d6b1c08592*jUfYsxt5M3-S4Mxig8PDtA*87VTCNN8GLxX1dFi5biv47eX8bFWUiYAaxEt8AcpwX55SdKXgjRkJMXBrc-CT1yDpnO2Woj3EDTOl4Eb6YcVew*1780780108194*4851b8c5d213d4d74dbb244c22674e0ca4b84994fa5fdb1a919c4aa6f20ad81c*KhKvyfv1BbDv0GRXwI0ATVbUTynFM00Cp2rRRXbQ4Js'
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (d) => body += d);
  res.on('end', () => {
    const json = JSON.parse(body);
    const f = json.data.__schema.mutationType.fields.find(f => f.name === 'serviceDisconnect');
    console.log(JSON.stringify(f, null, 2));
    
    const projectMutations = json.data.__schema.mutationType.fields.filter(f => f.name.includes('projectApply') || f.name.includes('projectCommit'));
    console.log("Project Mutations:", JSON.stringify(projectMutations, null, 2));
  });
});

req.on('error', (e) => console.error(e));
req.write(data);
req.end();
