const fs = require('fs');
let code = fs.readFileSync('public/js/components/kanban.js', 'utf8');

// ── 1. Stronger golden card styling for priority orders ───────────────────
const oldGoldenCard =
    '                // Golden styling for loyalty/priority orders\r\n' +
    '                if (order.is_priority) {\r\n' +
    '                    card.style.borderLeft = \'4px solid #f59e0b\';\r\n' +
    '                    card.style.background = \'linear-gradient(145deg, #fffbeb 0%, #fff 60%)\';\r\n' +
    '                    card.style.boxShadow = \'0 4px 20px rgba(245,158,11,0.25), 0 1px 4px rgba(0,0,0,0.06)\';\r\n' +
    '                    card.style.outline = \'1px solid rgba(245,158,11,0.35)\';\r\n' +
    '}';

const newGoldenCard =
    '                // Golden styling for loyalty/priority orders\r\n' +
    '                if (order.is_priority) {\r\n' +
    '                    card.style.borderLeft = \'5px solid #f59e0b\';\r\n' +
    '                    card.style.borderRight = \'2px solid rgba(245,158,11,0.4)\';\r\n' +
    '                    card.style.borderTop = \'2px solid rgba(245,158,11,0.3)\';\r\n' +
    '                    card.style.borderBottom = \'2px solid rgba(245,158,11,0.3)\';\r\n' +
    '                    card.style.background = \'linear-gradient(145deg,#fffbeb 0%,#fefce8 40%,#fff 100%)\';\r\n' +
    '                    card.style.boxShadow = \'0 6px 28px rgba(245,158,11,0.32), 0 2px 8px rgba(0,0,0,0.07)\';\r\n' +
    '                    card.style.borderRadius = \'14px\';\r\n' +
    '}';

const found1 = code.includes(oldGoldenCard);
console.log('1. Golden card target found:', found1);
if (found1) code = code.replace(oldGoldenCard, newGoldenCard);

// ── 2. Override 1D badge to gold for priority orders; keep border gold too ─
// The 1D badge sets borderLeftColor to blue — override that for priority orders
const old1DBadge =
    '                        if (dt === \'1D\' || dt.toLowerCase().includes(\'1 dia\') || dt.toLowerCase().includes(\'urgente\')) {\r\n' +
    '                            card.style.borderLeftColor = \'#3b82f6\';\r\n' +
    '                            card.style.boxShadow = \'0 0 8px rgba(59, 130, 246, 0.3)\';\r\n' +
    '                            badge = `<span class="card-badge" style="background:linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color:#fff; font-weight:bold; letter-spacing:0.5px; border:none; padding:4px 10px; border-radius:6px;">\uD83D\uDE80 MÁX PRIORIDADE (1D)</span>`;';

const new1DBadge =
    '                        if (dt === \'1D\' || dt.toLowerCase().includes(\'1 dia\') || dt.toLowerCase().includes(\'urgente\')) {\r\n' +
    '                            if (order.is_priority) {\r\n' +
    '                                // Loyalty: keep gold border, gold badge\r\n' +
    '                                badge = `<span class="card-badge" style="background:linear-gradient(135deg,#f59e0b,#d97706); color:#fff; font-weight:900; letter-spacing:0.5px; border:none; padding:4px 10px; border-radius:6px; font-size:0.78rem;">\u2B50 FIDELIDADE \u2014 1 DIA</span>`;\r\n' +
    '                            } else {\r\n' +
    '                                card.style.borderLeftColor = \'#3b82f6\';\r\n' +
    '                                card.style.boxShadow = \'0 0 8px rgba(59, 130, 246, 0.3)\';\r\n' +
    '                                badge = `<span class="card-badge" style="background:linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color:#fff; font-weight:bold; letter-spacing:0.5px; border:none; padding:4px 10px; border-radius:6px;">\uD83D\uDE80 MÁX PRIORIDADE (1D)</span>`;\r\n' +
    '                            }';

const found2 = code.includes(old1DBadge);
console.log('2. 1D badge target found:', found2);
if (found2) code = code.replace(old1DBadge, new1DBadge);

fs.writeFileSync('public/js/components/kanban.js', code, 'utf8');
console.log('\nDone! File length:', code.length);
