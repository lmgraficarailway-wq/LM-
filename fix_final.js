/**
 * fix_final.js - Versão 3 definitiva
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const targetFile = path.join(__dirname, 'public/js/components/reminders.js');

// 1. Obter versão limpa do git (401d1de = commit com cardápios mas encoding correto)
const rawBuf = execSync('git show 401d1de:public/js/components/reminders.js', {
    encoding: 'buffer', maxBuffer: 10 * 1024 * 1024
});

let text;
if (rawBuf[0] === 0xFF && rawBuf[1] === 0xFE) {
    text = rawBuf.slice(2).toString('utf16le');
} else {
    text = rawBuf.toString('utf8');
}

// O arquivo deve começar com 'export const render'
if (!text.trimStart().startsWith('export const render')) {
    console.error('ERRO: arquivo base não começa com export const render');
    process.exit(1);
}

console.log('✅ Base OK. Gestão=' + text.includes('Gestão') + ' Lançado=' + text.includes('Lançado'));

// 2. No arquivo base, o campo de desconto já existe MAS com emoji e texto errado.
//    Substituir o bloco inteiro via regex precisa de cuidado.
//    Vamos usar uma abordagem de split por marcador único.

// Encontrar o campo exato no base: começa com '<div class="rm-field"' que contém 'menu-inp-discount-close'
// e termina no </div> correspondente
const fieldRegex = /<div class="rm-field"[^>]*>[\s\S]*?menu-inp-discount-close[\s\S]*?<\/div>\s*<\/div>/;
const match = fieldRegex.exec(text);
if (match) {
    console.log('Campo antigo encontrado, substituindo...');
    const correctBlock = `<div class="rm-field" style="margin-top:0.5rem;">
                    <label for="menu-inp-discount-close" style="display:flex; align-items:flex-start; gap:0.75rem; cursor:pointer; user-select:none;">
                        <input id="menu-inp-discount-close" type="checkbox" style="width:16px; height:16px; accent-color:#7c3aed; cursor:pointer; flex-shrink:0; margin-top:2px;"/>
                        <div>
                            <span style="font-weight:600; color:#374151; font-size:0.9rem;">Descontar no Fechamento do Evento</span>
                            <small style="display:block; color:#6b7280; font-size:0.78rem; margin-top:2px;">Marque se o valor deste card\u00e1pio deve ser descontado no fechamento do evento. A informa\u00e7\u00e3o aparecer\u00e1 no financeiro.</small>
                        </div>
                    </label>
                </div>`;
    text = text.replace(match[0], correctBlock);
    console.log('✅ Campo substituído via regex');
} else {
    console.log('Campo não encontrado via regex, tentando abordagem de linhas...');

    const lines = text.split('\n');
    const checkboxIdx = lines.findIndex(l => l.includes('menu-inp-discount-close'));
    
    if (checkboxIdx === -1) {
        console.log('Checkbox não encontrado no base — adicionando novo campo após preço');
        // Adicionar após campo de preço
        const priceIdx = lines.findIndex(l => l.includes('id="menu-inp-price"'));
        if (priceIdx === -1) { console.error('Campo preço não encontrado'); process.exit(1); }
        let closeIdx = priceIdx;
        while (closeIdx < lines.length && lines[closeIdx].trim() !== '</div>') closeIdx++;
        
        const block = [
            '                <div class="rm-field" style="margin-top:0.5rem;">',
            '                    <label for="menu-inp-discount-close" style="display:flex; align-items:flex-start; gap:0.75rem; cursor:pointer; user-select:none;">',
            '                        <input id="menu-inp-discount-close" type="checkbox" style="width:16px; height:16px; accent-color:#7c3aed; cursor:pointer; flex-shrink:0; margin-top:2px;"/>',
            '                        <div>',
            '                            <span style="font-weight:600; color:#374151; font-size:0.9rem;">Descontar no Fechamento do Evento</span>',
            '                            <small style="display:block; color:#6b7280; font-size:0.78rem; margin-top:2px;">Marque se o valor deste card\u00e1pio deve ser descontado no fechamento do evento. A informa\u00e7\u00e3o aparecer\u00e1 no financeiro.</small>',
            '                        </div>',
            '                    </label>',
            '                </div>',
        ];
        lines.splice(closeIdx + 1, 0, ...block);
        text = lines.join('\n');
        console.log('✅ Campo adicionado após preço');
    }
}

// 3. Verificar texto final
const checks = {
    'Arquivo começa com export': text.trimStart().startsWith('export const render'),
    'Gestão': text.includes('Gestão'),
    'Produção': text.includes('Produção'),
    'Lançado no CORE': text.includes('Lançado no CORE'),
    'cardápio (correto)': text.includes('card\u00e1pio'),
    'informação (correto)': text.includes('informa\u00e7\u00e3o'),
    'aparecerá (correto)': text.includes('aparecer\u00e1'),
    'menu-inp-discount-close': text.includes('menu-inp-discount-close'),
    'menu-discount-close-badge': text.includes('menu-discount-close-badge'),
    'discount_on_close': text.includes('discount_on_close'),
};

console.log('\n=== VERIFICAÇÕES ===');
let allOk = true;
Object.entries(checks).forEach(([k, v]) => {
    console.log((v ? '✅' : '❌') + ' ' + k);
    if (!v) allOk = false;
});

if (!allOk) { process.exit(1); }

// 4. Salvar
fs.writeFileSync(targetFile, text, { encoding: 'utf8' });
console.log('\n✅ SALVO:', targetFile, Buffer.byteLength(text, 'utf8'), 'bytes');

// Mostrar área do campo de desconto para confirmar
const savedLines = text.split('\n');
const di = savedLines.findIndex(l => l.includes('menu-inp-discount-close'));
console.log('\nCampo de desconto (linhas', di-1, '-', di+8, '):');
for (let i = Math.max(0, di-2); i < Math.min(savedLines.length, di+9); i++) {
    console.log(i+1 + ': ' + savedLines[i]);
}

// Limpar scripts temporários
['fix_reminders_encoding.js', 'patch_reminders.js', 'reminders_clean.js', 'reminders_clean_utf8.js', 'fix_menu_orders_types.js'].forEach(f => {
    try { fs.unlinkSync(path.join(__dirname, f)); } catch(e) {}
});
