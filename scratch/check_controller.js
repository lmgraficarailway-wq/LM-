const fs = require('fs');
const content = fs.readFileSync('server/controllers/menu_orders_controller.js', 'utf8');
const idx = content.indexOf('description =');
console.log('description line:', content.substring(idx, idx+80));
const idx2 = content.indexOf("status = 'lan");
console.log('status line:', content.substring(idx2, idx2+40));
const idx3 = content.indexOf("row.status ===");
console.log('isUnlaunching:', content.substring(idx3, idx3+50));
console.log('\nVerificacao de chars na description:');
const descLine = content.substring(idx, idx+80);
for (let i = 0; i < descLine.length; i++) {
    const cp = descLine.charCodeAt(i);
    if (cp > 127) console.log(`  pos ${i}: U+${cp.toString(16).toUpperCase()} = '${descLine[i]}'`);
}
