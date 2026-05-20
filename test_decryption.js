require('dotenv').config();
const { getServiceAccount } = require('./server/utils/firebaseAuth');
const acc = getServiceAccount();
console.log(acc ? 'SUCCESS: ' + acc.project_id : 'FAILED');
