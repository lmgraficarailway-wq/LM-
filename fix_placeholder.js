const fs = require('fs');
let c = fs.readFileSync('public/js/components/reminders.js', 'utf8');

// The placeholder is currently corrupted, something like 'ðŸ”  Buscar cliente...'
// We replace the placeholder containing 'Buscar cliente' with the correct text.
const regex = /placeholder="[^"]*Buscar cliente\.\.\."/;
c = c.replace(regex, 'placeholder="🔍 Buscar cliente..."');

fs.writeFileSync('public/js/components/reminders.js', c, 'utf8');
console.log('Fixed placeholder');
