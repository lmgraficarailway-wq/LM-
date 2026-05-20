const fs = require('fs');
let c = fs.readFileSync('public/js/components/kanban.js', 'utf8');

c = c.replace(
  "const isProducao = user.role === 'producao';",
  "const isProducao = user.role === 'producao';\n    const isVendedor = user.role === 'vendedor';"
);

c = c.replace(
  "// Enable drag-and-drop only for producao role on producao/finalizado columns\n                const isDraggableCol = (order.status === 'producao' || order.status === 'finalizado');\n                if (isProducao && isDraggableCol) {",
  "// Enable drag-and-drop for producao and vendedor roles across all valid columns\n                const isDraggableCol = true;\n                if ((isProducao || isVendedor) && isDraggableCol) {"
);

c = c.replace(
  "// === DRAG-AND-DROP SETUP (producao role only) ===\n    const setupDragDrop = () => {\n        if (!isProducao) return;\n        const draggableColumns = ['col-producao', 'col-finalizado'];\n        const statusMap = { 'col-producao': 'producao', 'col-finalizado': 'finalizado' };",
  "// === DRAG-AND-DROP SETUP (producao and vendedor roles) ===\n    const setupDragDrop = () => {\n        if (!isProducao && !isVendedor) return;\n        const draggableColumns = ['col-aguardando_aceite', 'col-producao', 'col-em_balcao', 'col-finalizado'];\n        const statusMap = { 'col-aguardando_aceite': 'aguardando_aceite', 'col-producao': 'producao', 'col-em_balcao': 'em_balcao', 'col-finalizado': 'finalizado' };"
);

c = c.replace(
  "// Update draggability based on new status\n                            const isDraggable = (toStatus === 'producao' || toStatus === 'finalizado');",
  "// Update draggability based on new status\n                            const isDraggable = true;"
);

fs.writeFileSync('public/js/components/kanban.js', c, 'utf8');
console.log('Fixed kanban drag and drop restrictions.');
