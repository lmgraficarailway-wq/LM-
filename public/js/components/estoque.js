export const render = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    const container = document.createElement('div');

    container.innerHTML = `
        <!-- Header -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 2rem;">
            <div style="display:flex; flex-direction:column; gap:0.2rem;">
                <h2 style="font-size: 1.8rem; font-weight: 900; background: linear-gradient(135deg, var(--primary), #4c1d95); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin:0; letter-spacing: -0.03em;">Controle de Estoque</h2>
                <p style="color: #64748b; margin: 0; font-size: 0.95rem; font-weight:500; white-space: nowrap;">Visão geral da disponibilidade de insumos e matérias-primas.</p>
            </div>
        </div>

        <!-- Summary Cards -->
        <div class="stock-cards" id="stock-cards">
            <div class="stock-card">
                <div class="stock-card-icon" style="background:#3b82f620; color:#3b82f6">
                    <ion-icon name="cube-outline"></ion-icon>
                </div>
                <div class="stock-card-info">
                    <div class="stock-card-value" id="card-total">-</div>
                    <div class="stock-card-label">Total Produtos</div>
                </div>
            </div>
            <div class="stock-card">
                <div class="stock-card-icon" style="background:#10b98120; color:#10b981">
                    <ion-icon name="checkmark-circle-outline"></ion-icon>
                </div>
                <div class="stock-card-info">
                    <div class="stock-card-value" id="card-ok">-</div>
                    <div class="stock-card-label">Estoque OK</div>
                </div>
            </div>
            <div class="stock-card">
                <div class="stock-card-icon" style="background:#f59e0b20; color:#f59e0b">
                    <ion-icon name="warning-outline"></ion-icon>
                </div>
                <div class="stock-card-info">
                    <div class="stock-card-value" id="card-baixo">-</div>
                    <div class="stock-card-label">Estoque Baixo</div>
                </div>
            </div>
            <div class="stock-card">
                <div class="stock-card-icon" style="background:#ef444420; color:#ef4444">
                    <ion-icon name="alert-circle-outline"></ion-icon>
                </div>
                <div class="stock-card-info">
                    <div class="stock-card-value" id="card-zerado">-</div>
                    <div class="stock-card-label">Sem Estoque</div>
                </div>
            </div>
        </div>

        <!-- Stock Table -->
        <table class="data-table">
            <thead>
                <tr>
                    <th>Produto</th>
                    <th>Tipo</th>
                    <th>Estoque Atual</th>
                    <th>Estoque Mínimo</th>
                    <th>Status</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody id="stock-list">
                <tr><td colspan="6">Carregando...</td></tr>
            </tbody>
        </table>

        <!-- Adjust Stock Modal -->
        <div class="modal-overlay" id="adjust-modal">
            <div class="modal">
                <div class="modal-header">
                    <h3 id="adjust-modal-title">Ajustar Estoque</h3>
                    <button class="modal-close" id="adjust-close">&times;</button>
                </div>
                <form id="adjust-form">
                    <input type="hidden" id="adjust-product-id">
                    <input type="hidden" id="adjust-is-pulseira" value="0">
                    <div class="form-group">
                        <label>Produto</label>
                        <input type="text" id="adjust-product-name" disabled>
                    </div>

                    <!-- Seção para produtos normais -->
                    <div id="adjust-normal-section">
                        <!-- Estoque atual -->
                        <div style="background:#f1f5f9; border:1px solid #e2e8f0; border-radius:8px; padding:0.75rem 1rem; margin-bottom:0.75rem; display:flex; align-items:center; justify-content:space-between;">
                            <span style="color:#64748b; font-size:0.9rem;">Estoque atual:</span>
                            <span id="adjust-current-stock" style="font-size:1.4rem; font-weight:800; color:#334155;">-</span>
                        </div>

                        <!-- Modo de ajuste -->
                        <div class="form-group">
                            <label>Tipo de Ajuste</label>
                            <div style="display:flex; gap:0.5rem; background:#f8fafc; padding:0.4rem; border-radius:10px; border:1px solid #e2e8f0;">
                                <label id="mode-label-entrada" style="cursor:pointer; display:flex; align-items:center; justify-content:center; gap:0.4rem; padding:0.55rem 0.75rem; flex:1; border-radius:7px; background:var(--primary); color:white; font-size:0.9rem; font-weight:700; transition:all 0.2s;">
                                    <input type="radio" name="adjust_mode" value="entrada" checked style="display:none;">
                                    ➕ Adicionar
                                </label>
                                <label id="mode-label-definir" style="cursor:pointer; display:flex; align-items:center; justify-content:center; gap:0.4rem; padding:0.55rem 0.75rem; flex:1; border-radius:7px; background:transparent; color:#475569; font-size:0.9rem; font-weight:700; transition:all 0.2s;">
                                    <input type="radio" name="adjust_mode" value="definir" style="display:none;">
                                    🎯 Definir Total
                                </label>
                            </div>
                        </div>

                        <div class="form-group">
                            <label id="adjust-qty-label">Quantidade a Adicionar</label>
                            <input type="number" id="adjust-qty" min="0" value="1"
                                style="font-size:1.3rem; font-weight:bold; text-align:center; letter-spacing:0.05em;">
                            <small id="adjust-qty-hint" style="color:#64748b; font-size:0.8rem;"></small>
                        </div>
                    </div>

                    <!-- Seção para pulseiras (cores) -->
                    <div id="adjust-colors-section" style="display:none">
                        <p style="margin:0 0 0.75rem; font-size:0.85rem; color:#64748b">Informe a quantidade atual (total) para cada cor:</p>
                        <div id="adjust-colors-list" style="display:flex; flex-direction:column; gap:0.5rem; max-height:260px; overflow-y:auto;"></div>
                    </div>

                    <div class="form-group" style="margin-top:0.75rem">
                        <label>Motivo / Justificativa</label>
                        <textarea id="adjust-reason" rows="2" placeholder="Ex: Compra de material, correção de inventário..."></textarea>
                    </div>
                    <div style="display:flex; justify-content:flex-end; gap:0.5rem; margin-top:1rem">
                        <button type="button" class="btn btn-secondary" id="adjust-cancel">Cancelar</button>
                        <button type="submit" class="btn btn-primary" style="width:auto">Confirmar</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- History Modal -->
        <div class="modal-overlay" id="history-modal">
            <div class="modal" style="max-width:650px">
                <div class="modal-header">
                    <h3 id="history-title">Histórico de Movimentações</h3>
                    <button class="modal-close" id="history-close">&times;</button>
                </div>
                <div id="history-content" style="max-height:400px; overflow-y:auto">
                    <p>Carregando...</p>
                </div>
            </div>
        </div>

        <!-- Min Stock Modal -->
        <div class="modal-overlay" id="min-modal">
            <div class="modal" style="max-width:400px">
                <div class="modal-header">
                    <h3>Definir Estoque Mínimo</h3>
                    <button class="modal-close" id="min-close">&times;</button>
                </div>
                <form id="min-form">
                    <input type="hidden" id="min-product-id">
                    <div class="form-group">
                        <label>Produto</label>
                        <input type="text" id="min-product-name" disabled>
                    </div>
                    <div class="form-group">
                        <label>Estoque Mínimo</label>
                        <input type="number" id="min-value" min="0" value="5" required>
                    </div>
                    <div style="display:flex; justify-content:flex-end; gap:0.5rem; margin-top:1rem">
                        <button type="button" class="btn btn-secondary" id="min-cancel">Cancelar</button>
                        <button type="submit" class="btn btn-primary" style="width:auto">Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // --- Data Loading ---
    const isPulseira = (p) => {
        const tipo = (p.type || '').toLowerCase();
        const nome = (p.name || '').toLowerCase();
        return tipo.includes('pulseira') || nome.includes('pulseira');
    };

    const renderColorVariants = (p) => {
        if (!isPulseira(p) || !p.color_variants || p.color_variants.length === 0) {
            // Not a bracelet or no variants: show plain stock number
            return `<span style="font-weight:600; font-size:1.1em">${p.stock || 0}</span>`;
        }

        // Build color chips
        const chips = p.color_variants.map(v => {
            const badgeColor = v.quantity <= 0 ? '#374151' : '';
            const opacity = v.quantity <= 0 ? '0.5' : '1';
            return `
                <span title="${v.color}: ${v.quantity} un" style="
                    display:inline-flex; align-items:center; gap:4px;
                    background:#1e293b; border:1px solid #334155;
                    border-radius:20px; padding:2px 8px 2px 4px;
                    font-size:0.75rem; opacity:${opacity};
                    white-space:nowrap; cursor:default;
                ">
                    <span style="
                        width:12px; height:12px; border-radius:50%;
                        background:${v.color}; border:1px solid rgba(255,255,255,0.2);
                        display:inline-block; flex-shrink:0;
                    "></span>
                    <span style="color:#cbd5e1">${v.color}</span>
                    <b style="color:#f1f5f9">${v.quantity}</b>
                </span>
            `;
        }).join('');

        const total = p.stock || 0;
        return `
            <div style="display:flex; flex-direction:column; gap:4px">
                <div style="display:flex; flex-wrap:wrap; gap:4px; align-items:center">${chips}</div>
                <span style="font-size:0.75rem; color:#94a3b8">Total: <b>${total}</b></span>
            </div>
        `;
    };

    const loadStock = async () => {
        try {
            const res = await fetch('/api/stock');
            const { data, summary } = await res.json();

            // Filtrar KITs do estoque e recalcular resumos localmente
            const isKit = (p) => (p.name || '').toUpperCase().includes('KIT');
            const filteredData = data.filter(p => !isKit(p));

            const novoSummary = { total: 0, ok: 0, baixo: 0, zerado: 0 };
            filteredData.forEach(p => {
                novoSummary.total++;
                if (p.stock_status === 'ok') novoSummary.ok++;
                else if (p.stock_status === 'baixo') novoSummary.baixo++;
                else if (p.stock_status === 'zerado') novoSummary.zerado++;
            });

            // Update cards
            container.querySelector('#card-total').textContent = novoSummary.total;
            container.querySelector('#card-ok').textContent = novoSummary.ok;
            container.querySelector('#card-baixo').textContent = novoSummary.baixo;
            container.querySelector('#card-zerado').textContent = novoSummary.zerado;

            // Update table
            const tbody = container.querySelector('#stock-list');
            if (filteredData.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#64748b">Nenhum produto cadastrado</td></tr>';
                return;
            }

            tbody.innerHTML = filteredData.map(p => {
                const statusBadge = p.stock_status === 'ok'
                    ? '<span class="stock-badge stock-badge-ok">OK</span>'
                    : p.stock_status === 'baixo'
                        ? '<span class="stock-badge stock-badge-baixo">Baixo</span>'
                        : '<span class="stock-badge stock-badge-zerado">Zerado</span>';

                return `
                    <tr class="${p.stock_status !== 'ok' ? 'stock-row-alert' : ''}">
                        <td><b>${p.name}</b></td>
                        <td>${p.type || '-'}</td>
                        <td>${renderColorVariants(p)}</td>
                        <td>${p.min_stock != null ? p.min_stock : 5}</td>
                        <td>${statusBadge}</td>
                        <td>
                            <div style="display:flex; gap:0.4rem; flex-wrap:wrap">
                                <button class="btn btn-primary btn-sm adjust-btn" data-id="${p.id}" data-name="${p.name}" data-type="${p.type || ''}" data-stock="${p.stock || 0}">Ajustar</button>
                                <button class="btn btn-secondary btn-sm history-btn" data-id="${p.id}" data-name="${p.name}">Histórico</button>
                                <button class="btn btn-secondary btn-sm min-btn" data-id="${p.id}" data-name="${p.name}" data-min="${p.min_stock != null ? p.min_stock : 5}">Mín.</button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');

            // Bind events
            tbody.querySelectorAll('.adjust-btn').forEach(btn => {
                btn.onclick = () => openAdjustModal(btn.dataset.id, btn.dataset.name, isPulseira({ type: btn.dataset.type, name: btn.dataset.name }), btn.dataset.stock);
            });
            tbody.querySelectorAll('.history-btn').forEach(btn => {
                btn.onclick = () => openHistoryModal(btn.dataset.id, btn.dataset.name);
            });
            tbody.querySelectorAll('.min-btn').forEach(btn => {
                btn.onclick = () => openMinModal(btn.dataset.id, btn.dataset.name, btn.dataset.min);
            });

        } catch (e) {
            console.error('Erro ao carregar estoque:', e);
        }
    };

    const adjustModal = container.querySelector('#adjust-modal');
    const adjustForm = container.querySelector('#adjust-form');

    // Store current color variants for pulseira adjust
    let currentColorVariants = [];
    let currentProductStock = 0;

    // Mode toggle for normal products
    const modeLabelEntrada = container.querySelector('#mode-label-entrada');
    const modeLabelDefinir = container.querySelector('#mode-label-definir');
    const adjustQtyLabel = container.querySelector('#adjust-qty-label');
    const adjustQtyHint = container.querySelector('#adjust-qty-hint');
    const adjustQtyInput = container.querySelector('#adjust-qty');

    const updateModeUI = (mode) => {
        if (mode === 'entrada') {
            modeLabelEntrada.style.background = 'var(--primary)';
            modeLabelEntrada.style.color = 'white';
            modeLabelDefinir.style.background = 'transparent';
            modeLabelDefinir.style.color = '#475569';
            if (adjustQtyLabel) adjustQtyLabel.textContent = 'Quantidade a Adicionar';
            if (adjustQtyInput) { adjustQtyInput.min = '0'; adjustQtyInput.value = 1; }
            if (adjustQtyHint) adjustQtyHint.textContent = '';
        } else {
            modeLabelDefinir.style.background = 'var(--primary)';
            modeLabelDefinir.style.color = 'white';
            modeLabelEntrada.style.background = 'transparent';
            modeLabelEntrada.style.color = '#475569';
            if (adjustQtyLabel) adjustQtyLabel.textContent = 'Novo Total de Estoque';
            if (adjustQtyInput) { adjustQtyInput.min = '0'; adjustQtyInput.value = currentProductStock; }
            if (adjustQtyHint) adjustQtyHint.textContent = `Estoque atual: ${currentProductStock}. Digite o valor final desejado.`;
        }
    };

    container.querySelectorAll('input[name="adjust_mode"]').forEach(radio => {
        radio.onchange = () => updateModeUI(radio.value);
    });

    // Also clicking the label toggles the radio
    if (modeLabelEntrada) modeLabelEntrada.onclick = () => {
        container.querySelector('input[name="adjust_mode"][value="entrada"]').checked = true;
        updateModeUI('entrada');
    };
    if (modeLabelDefinir) modeLabelDefinir.onclick = () => {
        container.querySelector('input[name="adjust_mode"][value="definir"]').checked = true;
        updateModeUI('definir');
    };

    const openAdjustModal = async (id, name, isPulseira, currentStock) => {
        currentProductStock = parseInt(currentStock) || 0;
        container.querySelector('#adjust-product-id').value = id;
        container.querySelector('#adjust-product-name').value = name;
        container.querySelector('#adjust-reason').value = '';
        container.querySelector('#adjust-is-pulseira').value = isPulseira ? '1' : '0';

        const normalSection = container.querySelector('#adjust-normal-section');
        const colorsSection = container.querySelector('#adjust-colors-section');
        const colorsList = container.querySelector('#adjust-colors-list');
        const currentStockEl = container.querySelector('#adjust-current-stock');
        if (currentStockEl) currentStockEl.textContent = currentProductStock;

        // Reset mode to 'entrada'
        const modeRadioEntrada = container.querySelector('input[name="adjust_mode"][value="entrada"]');
        if (modeRadioEntrada) { modeRadioEntrada.checked = true; }
        updateModeUI('entrada');

        if (isPulseira) {
            normalSection.style.display = 'none';
            colorsSection.style.display = 'block';
            colorsList.innerHTML = '<p style="color:#64748b">Carregando cores...</p>';

            try {
                const res = await fetch(`/api/products/${id}/colors`);
                const { data } = await res.json();
                currentColorVariants = data;

                if (data.length === 0) {
                    colorsList.innerHTML = '<p style="color:#ef4444">Nenhuma cor cadastrada para este produto. Cadastre as cores primeiro na área de Produtos.</p>';
                } else {
                    colorsList.innerHTML = data.map(v => `
                        <div style="display:grid; grid-template-columns:14px 1fr auto 90px; gap:8px; align-items:center; background:#f8fafc; padding:8px 10px; border-radius:8px; border:1px solid #e2e8f0;">
                            <span style="width:14px;height:14px;border-radius:50%;background:${v.color};border:1px solid rgba(0,0,0,0.15);display:inline-block;"></span>
                            <span style="font-weight:500">${v.color}</span>
                            <span style="font-size:0.8rem;color:#64748b">Atual: <b>${v.quantity}</b></span>
                            <input type="number" class="color-qty-input" data-variant-id="${v.id}" data-color="${v.color}" data-original="${v.quantity}" min="0" value="${v.quantity}" placeholder="0" style="width:100%;padding:4px 6px;border:1px solid #cbd5e1;border-radius:6px;text-align:center;font-weight:600;">
                        </div>
                    `).join('');
                }
            } catch (err) {
                colorsList.innerHTML = '<p style="color:red">Erro ao carregar cores</p>';
            }
        } else {
            normalSection.style.display = 'block';
            colorsSection.style.display = 'none';
            currentColorVariants = [];
        }

        adjustModal.classList.add('open');
    };

    container.querySelector('#adjust-close').onclick = () => adjustModal.classList.remove('open');
    container.querySelector('#adjust-cancel').onclick = () => adjustModal.classList.remove('open');

    adjustForm.onsubmit = async (e) => {
        e.preventDefault();
        const product_id = container.querySelector('#adjust-product-id').value;
        const isPulseira = container.querySelector('#adjust-is-pulseira').value === '1';
        const reason = container.querySelector('#adjust-reason').value;

        if (isPulseira) {
            // Lê DIRETAMENTE de cada input no DOM — valor sempre atualizado
            const inputs = container.querySelectorAll('.color-qty-input');

            if (inputs.length === 0) {
                alert('Nenhuma cor encontrada para atualizar.');
                return;
            }

            const variants = [...inputs].map(inp => ({
                color: inp.dataset.color,
                quantity: parseInt(inp.value) >= 0 ? parseInt(inp.value) : parseInt(inp.dataset.original) || 0
            })).filter(v => v.color);

            console.log('[Estoque] Salvando cores:', variants);

            try {
                const res = await fetch(`/api/products/${product_id}/colors`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ variants })
                });
                if (!res.ok) {
                    const r = await res.json();
                    alert(r.error || 'Erro ao salvar cores');
                    return;
                }
                adjustModal.classList.remove('open');
                loadStock();
            } catch (err) {
                alert('Erro de conexão');
            }

        } else {
            // Normal product adjust
            const modeChecked = container.querySelector('input[name="adjust_mode"]:checked');
            const mode = modeChecked ? modeChecked.value : 'entrada';
            const rawQty = parseInt(container.querySelector('#adjust-qty').value);

            if (isNaN(rawQty) || rawQty < 0) {
                alert('Informe uma quantidade válida (0 ou mais).');
                return;
            }

            try {
                let res, result;
                if (mode === 'definir') {
                    // Absolute set
                    res = await fetch(`/api/stock/set/${product_id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ new_stock: rawQty, reason, user_id: user.id })
                    });
                } else {
                    // Relative: entrada
                    res = await fetch('/api/stock/adjust', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ product_id, quantity_change: rawQty, type: 'entrada', reason, user_id: user.id })
                    });
                }
                result = await res.json();
                if (!res.ok) {
                    alert(result.error || 'Erro ao ajustar estoque');
                    return;
                }
                adjustModal.classList.remove('open');
                loadStock();
            } catch (err) {
                alert('Erro de conexão');
            }
        }
    };

    // --- History Modal ---
    const historyModal = container.querySelector('#history-modal');
    container.querySelector('#history-close').onclick = () => historyModal.classList.remove('open');

    const openHistoryModal = async (id, name) => {
        container.querySelector('#history-title').textContent = `Histórico — ${name}`;
        const content = container.querySelector('#history-content');
        content.innerHTML = '<p>Carregando...</p>';
        historyModal.classList.add('open');

        try {
            const res = await fetch(`/api/stock/movements?product_id=${id}`);
            const { data } = await res.json();

            if (data.length === 0) {
                content.innerHTML = '<p style="color:#64748b; text-align:center">Nenhuma movimentação registrada</p>';
                return;
            }

            content.innerHTML = `
                <table class="data-table" style="font-size:0.85rem">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Tipo</th>
                            <th>Qtd</th>
                            <th>Motivo</th>
                            <th>Usuário</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(m => {
                const date = window.parseDBDate(m.created_at).toLocaleString('pt-BR');
                const typeLabel = m.type === 'entrada' ? '📦 Entrada'
                    : m.type === 'saida_pedido' ? '📤 Saída Pedido'
                        : m.type === 'perda' ? '🚫 Perda'
                            : '🔧 Ajuste';
                const qtyClass = m.quantity_change > 0 ? 'color:#10b981' : 'color:#ef4444';
                const qtyText = m.quantity_change > 0 ? `+${m.quantity_change}` : `${m.quantity_change}`;
                return `
                                <tr>
                                    <td>${date}</td>
                                    <td>${typeLabel}</td>
                                    <td style="${qtyClass}; font-weight:600">${qtyText}</td>
                                    <td>${m.reason || '-'}</td>
                                    <td>${m.user_name || '-'}</td>
                                </tr>
                            `;
            }).join('')}
                    </tbody>
                </table>
            `;
        } catch (err) {
            content.innerHTML = '<p style="color:red">Erro ao carregar histórico</p>';
        }
    };

    // --- Min Stock Modal ---
    const minModal = container.querySelector('#min-modal');
    const minForm = container.querySelector('#min-form');
    container.querySelector('#min-close').onclick = () => minModal.classList.remove('open');
    container.querySelector('#min-cancel').onclick = () => minModal.classList.remove('open');

    const openMinModal = (id, name, currentMin) => {
        container.querySelector('#min-product-id').value = id;
        container.querySelector('#min-product-name').value = name;
        container.querySelector('#min-value').value = currentMin;
        minModal.classList.add('open');
    };

    minForm.onsubmit = async (e) => {
        e.preventDefault();
        const id = container.querySelector('#min-product-id').value;
        const min_stock = parseInt(container.querySelector('#min-value').value);

        try {
            await fetch(`/api/stock/min/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ min_stock })
            });
            minModal.classList.remove('open');
            loadStock();
        } catch (err) {
            alert('Erro ao salvar');
        }
    };

    // Initial Load
    loadStock();
    return container;
};
