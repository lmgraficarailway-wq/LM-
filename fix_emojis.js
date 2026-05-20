const fs = require('fs');
let c = fs.readFileSync('public/js/components/reminders.js', 'utf8');

const replacements = [
  ['ðŸ”´', '🔴'],
  ['ðŸŸ¡', '🟡'],
  ['ðŸŸ¢', '🟢'],
  ['ðŸ“„', '📄'],
  ['ðŸ“‹', '📋'],
  ['ðŸŽ‰', '🎉'],
  ['ðŸ‘¤', '👤'],
  ['ðŸ ½ï¸ ', '🍽️'],
  ['ðŸ” ', '🔍']
];

let replaced = 0;
for (const [bad, good] of replacements) {
    if(c.includes(bad)) {
        c = c.split(bad).join(good);
        replaced++;
    }
}

fs.writeFileSync('public/js/components/reminders.js', c, 'utf8');
console.log('Replaced ' + replaced + ' emoji patterns.');
