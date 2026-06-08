const fs = require('fs');
const text = fs.readFileSync('./public/js/components/reminders.js', 'utf8');
const lines = text.split('\n');

// Find the HTML checkbox input in the modal
const htmlCheckbox = lines.findIndex(l => l.includes('type="checkbox"') && l.includes('discount-close'));
console.log('HTML checkbox at line:', htmlCheckbox + 1);
if (htmlCheckbox !== -1) {
    for (let i = Math.max(0, htmlCheckbox - 3); i < Math.min(lines.length, htmlCheckbox + 10); i++) {
        console.log(i + 1 + ': ' + lines[i]);
    }
}

// First and last lines
console.log('\nLine 1:', lines[0].substring(0, 80));
console.log('Total lines:', lines.length);

// Check for any remaining corruption
const badPatterns = ['card?pio', 'informa??o', 'aparecer?', 'Lan?ado', 'Desfaz'];
badPatterns.forEach(p => {
    const idx = lines.findIndex(l => l.includes(p));
    if (idx !== -1) console.log('BAD PATTERN "' + p + '" at line ' + (idx+1) + ': ' + lines[idx].trim().substring(0, 60));
});
console.log('Bad pattern check done.');
