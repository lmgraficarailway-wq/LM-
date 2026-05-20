export const render = (user) => {
    const container = document.createElement('div');
    container.innerHTML = `
        <!-- Header -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 2rem; flex-wrap:wrap; gap:1rem;">
            <div style="display:flex; flex-direction:column; gap:0.2rem;">
                <h2 style="font-size: 1.8rem; font-weight: 900; background: linear-gradient(135deg, var(--primary), #4c1d95); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin:0; letter-spacing: -0.03em;">Financeiro Geral</h2>
                <p style="color: #64748b; margin: 0; font-size: 0.95rem; font-weight:500; white-space: nowrap;">Controle de pagamentos, faturamento e relatórios financeiros.</p>
            </div>
            <div>
                <button id="btn-toggle-fidelity" class="btn" style="background: linear-gradient(135deg, #f59e0b, #b45309); color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 8px; font-weight: bold; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4); display: flex; align-items: center; gap: 0.5rem; transition: all 0.2s;">
                    🏆 Contas Fidelidade
                </button>
            </div>
        </div>

        <div id="fidelity-dashboard-container" style="display:none; margin-bottom: 2rem; background: #fffbeb; padding: 1.5rem; border: 1px solid #fde68a; border-radius: 12px; box-shadow: 0 10px 25px rgba(217, 119, 6, 0.1);">
            <div style="text-align:center; padding:2rem; color:#b45309;">Carregando contas fidelidade...</div>
        </div>

        <!-- Filters -->
        <div style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-bottom:1rem; padding:0.75rem; background:white; border-radius:8px; border:1px solid var(--border);">
            <input type="text" id="filter-search" placeholder="🔍 Buscar produto, cliente..." style="flex:2; min-width:180px; padding:0.5rem 0.75rem; border:1px solid var(--border); border-radius:6px; font-size:0.9rem;">
            <select id="filter-core" style="flex:1; min-width:150px; padding:0.5rem; border:1px solid var(--border); border-radius:6px; font-size:0.9rem;">
                <option value="">Status Core: Todos</option>
                <option value="1">✅ Lançados</option>
                <option value="0">⬜ Pendentes</option>
            </select>
            <select id="filter-month" style="flex:1; min-width:130px; padding:0.5rem; border:1px solid var(--border); border-radius:6px; font-size:0.9rem;">
                <option value="">Todos os meses</option>
            </select>
            <input type="number" id="filter-min" placeholder="Valor mín" step="0.01" min="0" style="width:100px; padding:0.5rem; border:1px solid var(--border); border-radius:6px; font-size:0.9rem;">
            <input type="number" id="filter-max" placeholder="Valor máx" step="0.01" min="0" style="width:100px; padding:0.5rem; border:1px solid var(--border); border-radius:6px; font-size:0.9rem;">
            <button class="btn btn-secondary" id="btn-clear-filter" style="width:auto; padding:0.5rem 0.75rem; font-size:0.85rem;">Limpar</button>
            <div style="display:flex; align-items:center; gap:0.6rem; background:#fff7ed; padding:0.5rem 1rem; border-radius:8px; border:1px solid #fde68a; cursor:pointer;" onclick="const cb = document.getElementById('filter-fidelidade'); cb.checked = !cb.checked; cb.dispatchEvent(new Event('change'));">
                <input type="checkbox" id="filter-fidelidade" style="width:18px; height:18px; cursor:pointer; pointer-events:none;">
                <label style="margin:0; cursor:pointer; font-weight:800; color:#b45309; font-size:0.9rem; user-select:none;">Apenas Fidelidade</label>
            </div>
        </div>

        <div id="fin-monthly-container"></div>
    `;

    const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    let allData = [];
    let allReserved = [];
    let allMaterialCosts = [];
    let allDispatchCosts = [];
    
    let globals = {
        totalGeral: 0,
        totalReserved: 0,
        totalMaterial: 0,
        totalDispatch: 0
    };

    const isAdmin = user && user.role === 'master';

    const removeAccents = (str) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const applyFilters = () => {
        const search = removeAccents(container.querySelector('#filter-search').value.toLowerCase().trim());
        const coreFilter = container.querySelector('#filter-core').value;
        const monthFilter = container.querySelector('#filter-month').value;
        const minVal = parseFloat(container.querySelector('#filter-min').value) || 0;
        const maxVal = parseFloat(container.querySelector('#filter-max').value) || Infinity;

        const applyToAll = (item, getterVal, isCoreTracked = false) => {
            if (monthFilter) {
                const d = window.parseDBDate(item.created_at);
                const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
                if (key !== monthFilter) return false;
            }
            if (search) {
                const haystack = removeAccents(`${item.client_name || ''} ${item.products_summary || ''} ${item.description || ''} ${item.carrier || ''}`.toLowerCase());
                if (!haystack.includes(search)) return false;
            }
            const val = getterVal(item) || 0;
            if (val < minVal || val > maxVal) return false;

            if (coreFilter !== '') {
                if (!isCoreTracked) return false; // Hide items that don't have core status
                const isLaunched = item.launched_to_core ? '1' : '0';
                if (isLaunched !== coreFilter) return false;
            }

            return true;
        };

        const filteredSales = allData.filter(s => applyToAll(s, s => s.total_value, true));
        const filteredReserved = allReserved.filter(r => applyToAll(r, r => r.total_value, false));
        const filteredMaterials = allMaterialCosts.filter(m => applyToAll(m, m => m.cost_amount, false));
        const filteredDispatch = allDispatchCosts.filter(d => applyToAll(d, d => d.amount, true));
        renderUnifiedData(filteredSales, filteredReserved, filteredMaterials, filteredDispatch, container.querySelector('#filter-fidelidade').checked);
    };

    const renderUnifiedData = (sales, reserved, materials, dispatch, isFidelidadeView = false) => {
        let launched = 0;
        let totalDescontos = 0;
        let totalGeralFiltered = 0;

        const months = {};

        const getOrCreateMonth = (dateStr) => {
            let d = window.parseDBDate(dateStr);
            if (isNaN(d.valueOf())) d = new Date();
            const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
            if (!months[key]) {
                months[key] = {
                    key,
                    label: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
                    year: d.getFullYear(),
                    month: d.getMonth(),
                    sales: [], salesTotal: 0, salesDiscount: 0,
                    reserved: [], reservedTotal: 0,
                    aReceberTotal: 0,
                    materials: [], materialsTotal: 0,
                    dispatch: [], dispatchTotal: 0
                };
            }
            return months[key];
        };

        sales.forEach(s => {
            const m = getOrCreateMonth(s.created_at);
            m.sales.push(s);
            m.salesTotal += (s.total_value || 0);
            m.salesDiscount += (s.discount_value || 0);
            if (s.payment_method === 'A Receber') {
                m.aReceberTotal += (s.total_value || 0);
            }
            totalGeralFiltered += (s.total_value || 0);
            totalDescontos += (s.discount_value || 0);
            if (s.launched_to_core) {
                launched++;
                m.launchedCount = (m.launchedCount || 0) + 1;
            }
        });

        reserved.forEach(r => {
            const m = getOrCreateMonth(r.created_at);
            m.reserved.push(r);
            m.reservedTotal += (r.total_value || 0);
        });

        materials.forEach(c => {
            const m = getOrCreateMonth(c.created_at);
            m.materials.push(c);
            m.materialsTotal += (c.cost_amount || 0);
        });

        dispatch.forEach(d => {
            const m = getOrCreateMonth(d.created_at);
            m.dispatch.push(d);
            m.dispatchTotal += (d.amount || 0);
        });



        const sortedKeys = Object.keys(months).sort((a, b) => b.localeCompare(a));
        const monthlyContainer = container.querySelector('#fin-monthly-container');

        if (sortedKeys.length === 0) {
            monthlyContainer.innerHTML = '<p style="text-align:center; color:#94a3b8; padding:2rem;">Nenhum dado encontrado</p>';
        } else {
            monthlyContainer.innerHTML = sortedKeys.map(key => {
                const m = months[key];
                const now = new Date();
                const searchStr = container.querySelector('#filter-search').value.trim();
                const isCurrentMonth = (m.year === now.getFullYear() && m.month === now.getMonth()) || searchStr.length > 0;

                const mLaunchedCount = m.launchedCount || 0;
                const mPendingCount = m.sales.length - mLaunchedCount;
                const mResultado = m.salesTotal - m.materialsTotal - m.dispatchTotal;

                const monthCards = `
                <div class="stock-cards" style="margin-bottom:1.5rem; display:flex; gap:1rem; flex-wrap:wrap;">
                    <div class="stock-card" style="flex:1; min-width:200px;">
                        <div class="stock-card-icon" style="background:#7c3aed20; color:#7c3aed"><ion-icon name="receipt-outline"></ion-icon></div>
                        <div class="stock-card-info">
                            <div class="stock-card-value">${m.sales.length}</div>
                            <div class="stock-card-label">Total Transações</div>
                        </div>
                    </div>
                    <div class="stock-card" style="flex:1; min-width:200px;">
                        <div class="stock-card-icon" style="background:#8b5cf620; color:#8b5cf6"><ion-icon name="checkmark-done-outline"></ion-icon></div>
                        <div class="stock-card-info">
                            <div class="stock-card-value">${mLaunchedCount}</div>
                            <div class="stock-card-label">Lançados ao Core</div>
                        </div>
                    </div>
                    <div class="stock-card" style="flex:1; min-width:200px;">
                        <div class="stock-card-icon" style="background:#f59e0b20; color:#f59e0b"><ion-icon name="time-outline"></ion-icon></div>
                        <div class="stock-card-info">
                            <div class="stock-card-value">${mPendingCount}</div>
                            <div class="stock-card-label">Pendentes</div>
                        </div>
                    </div>

                    <div class="stock-card" style="flex:1; min-width:200px; border:2px solid #ef4444; background:linear-gradient(135deg,#fef2f2,#fee2e2);">
                        <div class="stock-card-icon" style="background:#ef444430; color:#b91c1c"><ion-icon name="wallet-outline"></ion-icon></div>
                        <div class="stock-card-info">
                            <div class="stock-card-value" style="color:#b91c1c">R$ ${m.aReceberTotal.toFixed(2)}</div>
                            <div class="stock-card-label">&#9888; Caixa: A Receber</div>
                        </div>
                    </div>
                    <div class="stock-card" style="flex:1; min-width:200px;">
                        <div class="stock-card-icon" style="background:#05966920; color:#059669"><ion-icon name="analytics-outline"></ion-icon></div>
                        <div class="stock-card-info">
                            <div class="stock-card-value" style="color:${mResultado >= 0 ? '#059669' : '#dc2626'}">R$ ${mResultado.toFixed(2)}</div>
                            <div class="stock-card-label">Resultado do Mês</div>
                        </div>
                    </div>
                </div>
                `;

                // 1. Sales Rows
                const salesRows = m.sales.map(s => {
                    const isLaunched = s.launched_to_core ? true : false;
                    const badgeStyle = isLaunched
                        ? 'background:#d1fae5; color:#065f46; border:1px solid #6ee7b7;'
                        : 'background:#f1f5f9; color:#64748b; border:1px solid #cbd5e1; cursor:pointer;';
                    const badgeText = isLaunched ? '✅ Lançado' : '⬜ Lançar';

                    return `
                    <tr style="${isLaunched ? '' : 'background:#fffbeb;'}">
                        <td>${window.parseDBDate(s.created_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</td>
                        <td><b>${s.client_name || '-'}</b>${s.is_internal ? ' <span style="background:#dbeafe; color:#1d4ed8; padding:1px 6px; border-radius:10px; font-size:0.7rem; font-weight:600;">🏢 Interno</span>' : ''}</td>
                        <td>${s.client_phone || '-'}</td>
                        <td style="font-size:0.85rem">
                            ${s.products_summary || '-'}
                            ${s.products_summary ? `<button type="button" onclick="window.copyTextToClipboard('LM | GRÁFICA - ${(() => { const ev = (s.event_name || '').replace(/'/g, "\\'"); const ps = (s.products_summary || '').replace(/'/g, "\\'"); return ev && !ps.startsWith(ev) ? ev + ' - ' + ps : ps; })()}')" title="Copiar para Financeiro" style="background:none; border:none; cursor:pointer; font-size:0.95rem; margin-left:4px; filter:grayscale(1) opacity(0.5); transition:all 0.2s;" onmouseover="this.style.filter='none'" onmouseout="this.style.filter='grayscale(1) opacity(0.5)'">📋</button>` : ''}
                        </td>
                        <td style="font-size:0.85rem; max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${(s.description || '').replace(/"/g, '&quot;')}">${s.description || '-'}</td>
                        <td style="font-weight:bold; color:#7c3aed">R$ ${(s.total_value || 0).toFixed(2)}</td>
                        <td style="color:${(s.discount_value || 0) > 0 ? '#dc2626' : '#94a3b8'}; font-weight:${(s.discount_value || 0) > 0 ? '600' : 'normal'}">${(s.discount_value || 0) > 0 ? `- R$ ${(s.discount_value).toFixed(2)}` : '-'}</td>
                        <td style="${s.payment_method === 'A Receber' ? 'color:#b91c1c; font-weight:bold;' : ''}">
                            ${s.payment_method || '-'}
                            ${s.payment_method === 'A Receber' ? `<br><button class="btn btn-sm btn-mark-paid" data-id="${s.id}" style="margin-top:4px; padding:2px 8px; font-size:0.75rem; background:#22c55e; color:white; border:none; border-radius:4px; cursor:pointer;" title="Registrar Pagamento">💰 PAGO</button>` : ''}
                        </td>
                        <td>
                            <button class="btn btn-sm launch-btn" data-id="${s.id}" data-launched="${isLaunched ? '1' : '0'}" style="${badgeStyle} padding:4px 10px; border-radius:20px; font-size:0.8rem; font-weight:600;">
                                ${badgeText}
                            </button>
                        </td>
                        ${isAdmin && s.is_internal ? `<td><button class="btn btn-sm btn-delete-internal" data-id="${s.id}" style="background:#fee2e2; color:#dc2626; border:1px solid #fca5a5; padding:4px 10px; border-radius:20px; font-size:0.8rem; font-weight:600;">🗑️ Apagar</button></td>` : (isAdmin ? '<td></td>' : '')}
                    </tr>`;
                }).join('');

                const salesTable = m.sales.length > 0 ? `
                    <div style="margin-top:1rem; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden;">
                        <div style="background:#f1f5f9; padding:0.6rem 1rem; font-weight:600; color:#334155; display:flex; justify-content:space-between; align-items:center;">
                            <span>✅ Transações (Fechamento)</span>
                            <span style="color:#166534; font-size:1.05rem;">R$ ${m.salesTotal.toFixed(2)}</span>
                        </div>
                        <table class="data-table" style="margin:0; border-radius:0;">
                            <thead>
                                <tr>
                                    <th>Data</th><th>Cliente</th><th>Telefone</th><th>Produtos</th><th>Descrição</th>
                                    <th>Valor Pago</th><th>Desconto</th><th>Pagamento</th><th>Core</th>${isAdmin ? '<th>Ação</th>' : ''}
                                </tr>
                            </thead>
                            <tbody>${salesRows}</tbody>
                        </table>
                    </div>
                ` : '';

                // Discounts Rows
                const discountItems = m.sales.filter(s => (s.discount_value || 0) > 0);
                const discountRows = discountItems.map(s => `
                    <tr>
                        <td>${window.parseDBDate(s.created_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</td>
                        <td><b>${s.client_name || '-'}</b></td>
                        <td style="font-size:0.85rem">${s.products_summary || '-'}</td>
                        <td>${s.payment_method || '-'}</td>
                        <td style="font-weight:bold; color:#dc2626;">- R$ ${(s.discount_value || 0).toFixed(2)}</td>
                    </tr>`).join('');

                const discountTable = discountItems.length > 0 ? `
                    <div style="margin-top:1.5rem; border:1px solid #fed7aa; border-radius:8px; overflow:hidden;">
                        <div style="background:#fff7ed; padding:0.6rem 1rem; font-weight:600; color:#c2410c; display:flex; justify-content:space-between; align-items:center;">
                            <span>✂️ Descontos Concedidos</span>
                            <span style="color:#ea580c; font-size:1.05rem;">- R$ ${m.salesDiscount.toFixed(2)}</span>
                        </div>
                        <table class="data-table" style="margin:0; border-radius:0;">
                            <thead><tr><th>Data</th><th>Cliente</th><th>Produtos</th><th>Pagamento</th><th>Valor Desconto</th></tr></thead>
                            <tbody>${discountRows}</tbody>
                        </table>
                    </div>
                ` : '';

                // 2. Reserved Rows
                const statusLabel = status => status === 'aguardando_aceite' ? '⏳ Aguardando' : '🔨 Produção';
                const reservedRows = m.reserved.map(s => `
                    <tr>
                        <td>${window.parseDBDate(s.created_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</td>
                        <td><b>${s.client_name || '-'}</b></td>
                        <td style="font-size:0.85rem">${s.products_summary || '-'}</td>
                        <td style="font-weight:bold; color:#d97706">R$ ${(s.total_value || 0).toFixed(2)}</td>
                        <td>${s.payment_method || '-'}</td>
                        <td><span style="background:${s.status === 'aguardando_aceite' ? '#fef3c7' : '#dbeafe'}; color:${s.status === 'aguardando_aceite' ? '#92400e' : '#1e40af'}; padding:2px 8px; border-radius:12px; font-size:0.75rem; font-weight:600;">${statusLabel(s.status)}</span></td>
                    </tr>`).join('');

                const reservedTable = m.reserved.length > 0 ? `
                    <div style="margin-top:1.5rem; border:1px solid #fef3c7; border-radius:8px; overflow:hidden;">
                        <div style="background:#fffbeb; padding:0.6rem 1rem; font-weight:600; color:#92400e; display:flex; justify-content:space-between; align-items:center;">
                            <span>⏳ Pedidos A Receber (Em Produção)</span>
                            <span style="color:#d97706; font-size:1.05rem;">R$ ${m.reservedTotal.toFixed(2)}</span>
                        </div>
                        <table class="data-table" style="margin:0; border-radius:0;">
                            <thead><tr><th>Data</th><th>Cliente</th><th>Produtos</th><th>Valor Reservado</th><th>Pagamento</th><th>Status</th></tr></thead>
                            <tbody>${reservedRows}</tbody>
                        </table>
                    </div>
                ` : '';

                // 3. Materials Rows
                const matRows = m.materials.map(c => `
                        <tr>
                            <td>${window.parseDBDate(c.created_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</td>
                            <td>
                                <b>${c.product_name || '-'}</b>
                                ${c.product_name ? `<button type="button" onclick="window.copyTextToClipboard('LM | GRÁFICA - ${c.product_name.replace(/'/g, "\\'")}')" title="Copiar para Financeiro" style="background:none; border:none; cursor:pointer; font-size:0.95rem; margin-left:4px; filter:grayscale(1) opacity(0.5); transition:all 0.2s;" onmouseover="this.style.filter='none'" onmouseout="this.style.filter='grayscale(1) opacity(0.5)'">📋</button>` : ''}
                            </td>
                            <td>${c.product_type || '-'}</td>
                            <td style="font-size:0.85rem;">${c.description || '-'}</td>
                            <td style="text-align:center;">${c.quantity || 1}</td>
                            <td style="font-weight:bold; color:#dc2626;">R$ ${(c.cost_amount || 0).toFixed(2)}</td>
                            ${isAdmin ? `<td style="text-align:center;"><button class="btn-del-cost" data-id="${c.id}" title="Apagar" style="background:none; border:none; cursor:pointer; color:#dc2626; font-size:1.1rem; padding:2px 6px; border-radius:4px;">🗑️</button></td>` : ''}
                        </tr>`).join('');

                const matTable = m.materials.length > 0 ? `
                    <div style="margin-top:1.5rem; border:1px solid #fecaca; border-radius:8px; overflow:hidden;">
                        <div style="background:#fef2f2; padding:0.6rem 1rem; font-weight:600; color:#991b1b; display:flex; justify-content:space-between; align-items:center;">
                            <span>📦 Custos de Materiais (Despesas)</span>
                            <span style="color:#dc2626; font-size:1.05rem;">R$ ${m.materialsTotal.toFixed(2)}</span>
                        </div>
                        <table class="data-table" style="margin:0; border-radius:0;">
                            <thead><tr><th>Data</th><th>Produto</th><th>Tipo</th><th>Descrição</th><th>Qtd</th><th>Custo</th>${isAdmin ? '<th style="width:40px"></th>' : ''}</tr></thead>
                            <tbody>${matRows}</tbody>
                        </table>
                    </div>
                ` : '';

                // 4. Dispatch Rows
                const dispRows = m.dispatch.map(d => {
                    const isDLaunched = d.launched_to_core ? true : false;
                    const dBadgeStyle = isDLaunched
                        ? 'background:#d1fae5; color:#065f46; border:1px solid #6ee7b7;'
                        : 'background:#f1f5f9; color:#64748b; border:1px solid #cbd5e1; cursor:pointer;';
                    const dBadgeText = isDLaunched ? '✅ Lançado' : '⬜ Lançar';
                    return `
                        <tr style="${isDLaunched ? '' : 'background:#fffbeb;'}">
                            <td>${window.parseDBDate(d.created_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</td>
                            <td><b>${d.carrier || '-'}</b></td>
                            <td>${d.client_name || '-'}</td>
                            <td>Pedido #${d.order_id || '-'}</td>
                            <td style="font-weight:bold; color:#dc2626;">R$ ${(d.amount || 0).toFixed(2)}</td>
                            <td>
                                <button class="btn btn-sm dispatch-launch-btn" data-id="${d.id}" data-launched="${isDLaunched ? '1' : '0'}" style="${dBadgeStyle} padding:4px 10px; border-radius:20px; font-size:0.8rem; font-weight:600;">
                                    ${dBadgeText}
                                </button>
                            </td>
                            ${isAdmin ? `<td style="text-align:center; white-space:nowrap;">
                                <button class="btn-edit-dispatch" data-id="${d.id}" data-carrier="${(d.carrier||'').replace(/"/g,'&quot;')}" data-amount="${d.amount}" title="Editar" style="background:none;border:none;cursor:pointer;color:#7c3aed;font-size:1.1rem;padding:2px 5px;border-radius:4px;">✏️</button>
                                <button class="btn-del-dispatch" data-id="${d.id}" title="Apagar" style="background:none;border:none;cursor:pointer;color:#dc2626;font-size:1.1rem;padding:2px 5px;border-radius:4px;">🗑️</button>
                            </td>` : ''}
                        </tr>`;
                }).join('');

                const dispTable = m.dispatch.length > 0 ? `
                    <div style="margin-top:1.5rem; border:1px solid #e9d5ff; border-radius:8px; overflow:hidden;">
                        <div style="background:#faf5ff; padding:0.6rem 1rem; font-weight:600; color:#6b21a8; display:flex; justify-content:space-between; align-items:center;">
                            <span>🚚 Custos de Despacho</span>
                            <span style="color:#dc2626; font-size:1.05rem;">R$ ${m.dispatchTotal.toFixed(2)}</span>
                        </div>
                        <table class="data-table" style="margin:0; border-radius:0;">
                            <thead><tr><th>Data</th><th>Transportadora</th><th>Cliente</th><th>Pedido</th><th>Valor</th><th>Core</th>${isAdmin ? '<th style="width:80px">Ações</th>' : ''}</tr></thead>
                            <tbody>${dispRows}</tbody>
                        </table>
                    </div>
                ` : '';

                return `
                <div style="margin-bottom:2rem;">
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:1rem; background:linear-gradient(135deg, #2e1065, #4c1d95); color:white; border-radius:8px; cursor:pointer; flex-wrap:wrap; gap:1rem;" onclick="const t = this.nextElementSibling; t.style.display = t.style.display === 'none' ? 'block' : 'none'">
                        
                        <div style="flex:1; min-width:200px;">
                            <h3 style="margin:0; font-size:1.2rem; font-weight:700;">📅 ${m.label}</h3>
                        </div>

                        <div style="display:flex; gap:1.5rem; flex-wrap:wrap;">
                            ${m.aReceberTotal > 0 ? `
                            <div style="display:flex; flex-direction:column; align-items:flex-end; border:1px solid #ef4444; border-radius:4px; padding:2px 8px; background:rgba(239, 68, 68, 0.1);">
                                <span style="font-size:0.75rem; text-transform:uppercase; letter-spacing:0.5px; color:#fca5a5; font-weight:bold;">⚠️ A Receber</span>
                                <span style="font-size:1.05rem; font-weight:800; color:#ef4444;">R$ ${m.aReceberTotal.toFixed(2)}</span>
                            </div>` : ''}
                            <div style="display:flex; flex-direction:column; align-items:flex-end;">
                                <span style="font-size:0.75rem; text-transform:uppercase; letter-spacing:0.5px; opacity:0.8;">Despacho</span>
                                <span style="font-size:1.05rem; font-weight:700; color:#fca5a5;">R$ ${m.dispatchTotal.toFixed(2)}</span>
                            </div>
                            <div style="display:flex; flex-direction:column; align-items:flex-end;">
                                <span style="font-size:0.75rem; text-transform:uppercase; letter-spacing:0.5px; opacity:0.8;">Despesas</span>
                                <span style="font-size:1.05rem; font-weight:700; color:#fca5a5;">R$ ${m.materialsTotal.toFixed(2)}</span>
                            </div>
                            <div style="display:flex; flex-direction:column; align-items:flex-end;">
                                <span style="font-size:0.75rem; text-transform:uppercase; letter-spacing:0.5px; opacity:0.8;">Descontos</span>
                                <span style="font-size:1.05rem; font-weight:700; color:#fdba74;">- R$ ${m.salesDiscount.toFixed(2)}</span>
                            </div>
                            <div style="display:flex; flex-direction:column; align-items:flex-end;">
                                <span style="font-size:0.75rem; text-transform:uppercase; letter-spacing:0.5px; opacity:0.8;">Fechamento Base</span>
                                <span style="font-size:1.05rem; font-weight:700; color:#4ade80;">R$ ${m.salesTotal.toFixed(2)}</span>
                            </div>
                            
                            <div style="display:flex; flex-direction:column; align-items:flex-end; border-left:1px solid rgba(255,255,255,0.2); padding-left:1.5rem;">
                                <span style="font-size:0.75rem; text-transform:uppercase; letter-spacing:0.5px; font-weight:600;">Saldo em Caixa</span>
                                <span style="font-size:1.15rem; font-weight:800; color:${(m.salesTotal - m.dispatchTotal - m.materialsTotal) >= 0 ? '#86efac' : '#fca5a5'};">
                                    R$ ${(m.salesTotal - m.dispatchTotal - m.materialsTotal).toFixed(2)}
                                </span>
                            </div>
                        </div>

                    </div>
                    <div style="padding:0.5rem; display:${isCurrentMonth ? 'block' : 'none'};">
                        ${monthCards}
                        ${salesTable}
                        ${discountTable}
                        ${reservedTable}
                        ${dispTable}
                        ${matTable}
                        ${(!salesTable && !discountTable && !reservedTable && !dispTable && !matTable) ? '<p style="color:#94a3b8; text-align:center; padding:2rem;">Nenhum detalhe disponível</p>' : ''}
                    </div>
                </div>
                `;
            }).join('');
        }

        bindLaunchAndAdminButtons();
    };

    const bindLaunchAndAdminButtons = () => {
        // Bind launch buttons
        container.querySelectorAll('.launch-btn').forEach(btn => {
            btn.onclick = async () => {
                const isCurrentlyLaunched = btn.dataset.launched === '1';
                const newState = !isCurrentlyLaunched;
                await fetch(`/api/orders/${btn.dataset.id}/launch-core`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ launched: newState })
                });
                loadFinancial();
            };
        });

        // Bind mark paid buttons
        container.querySelectorAll('.btn-mark-paid').forEach(btn => {
            btn.onclick = async () => {
                const orderId = btn.dataset.id;
                const userInput = prompt('Qual foi a via de pagamento final?\n(Digite: Pix, Cartão, Dinheiro ou Boleto)');
                if (!userInput) return;
                
                const valid = ['Pix', 'Cartão', 'Dinheiro', 'Boleto'];
                const methodToSave = valid.find(v => v.toLowerCase() === userInput.toLowerCase().trim()) || userInput.trim();

                const res = await fetch(`/api/orders/${orderId}/pay`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ payment_method: methodToSave })
                });
                if (res.ok) {
                    loadFinancial();
                } else {
                    alert('Erro ao registrar pagamento.');
                }
            };
        });

        // Bind delete buttons (internal orders - admin only)
        container.querySelectorAll('.btn-delete-internal').forEach(btn => {
            btn.onclick = async () => {
                if (!confirm('⚠️ Tem certeza que deseja APAGAR esta demanda de serviço interno?\nEsta ação também remove os lançamentos de custo de material.')) return;
                const res = await fetch(`/api/orders/${btn.dataset.id}`, { method: 'DELETE' });
                if (res.ok) {
                    loadFinancial();
                } else {
                    const json = await res.json().catch(() => ({}));
                    alert('Erro ao apagar: ' + (json.error || 'Falha desconhecida'));
                }
            };
        });

        if (isAdmin) {
             container.querySelectorAll('.btn-del-cost').forEach(btn => {
                btn.onclick = async () => {
                    if (!confirm('Apagar este lançamento de custo de material?')) return;
                    const res = await fetch(`/api/material-costs/${btn.dataset.id}`, { method: 'DELETE' });
                    if (res.ok) {
                        loadFinancial();
                    } else {
                        const json = await res.json().catch(() => ({}));
                        alert('Erro: ' + (json.error || 'Falha ao apagar'));
                    }
                };
            });

            // Bind dispatch launch buttons
            container.querySelectorAll('.dispatch-launch-btn').forEach(btn => {
                btn.onclick = async () => {
                    const isCurrentlyLaunched = btn.dataset.launched === '1';
                    const newState = !isCurrentlyLaunched;
                    await fetch(`/api/dispatch-costs/${btn.dataset.id}/launch-core`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ launched: newState })
                    });
                    loadFinancial();
                };
            });

            container.querySelectorAll('.btn-del-dispatch').forEach(btn => {
                btn.onclick = async () => {
                    if (!confirm('⚠️ Apagar este custo de despacho? Esta ação não pode ser desfeita.')) return;
                    const r = await fetch(`/api/dispatch-costs/${btn.dataset.id}`, { method: 'DELETE' });
                    if (r.ok) {
                        loadFinancial();
                    } else {
                        const j = await r.json().catch(() => ({}));
                        alert('Erro: ' + (j.error || 'Falha ao apagar'));
                    }
                };
            });

            container.querySelectorAll('.btn-edit-dispatch').forEach(btn => {
                btn.onclick = () => {
                    const id = btn.dataset.id;
                    const currentCarrier = btn.dataset.carrier;
                    const currentAmount = parseFloat(btn.dataset.amount) || 0;

                    const old = document.getElementById('dispatch-edit-modal');
                    if (old) old.remove();

                    const modal = document.createElement('div');
                    modal.id = 'dispatch-edit-modal';
                    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
                    modal.innerHTML = `
                        <div style="background:white;border-radius:12px;padding:2rem;min-width:320px;max-width:400px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
                            <h3 style="margin:0 0 1.25rem;color:#4c1d95;font-size:1.1rem;">✏️ Editar Custo de Despacho</h3>
                            <label style="display:block;margin-bottom:0.35rem;font-size:0.85rem;color:#475569;font-weight:600;">Transportadora</label>
                            <select id="edit-disp-carrier" style="width:100%;padding:0.5rem;border:1px solid #cbd5e1;border-radius:6px;margin-bottom:1rem;font-size:0.95rem;">
                                <option value="UNIDA" ${currentCarrier==='UNIDA'?'selected':''}>UNIDA</option>
                                <option value="CORREIOS" ${currentCarrier==='CORREIOS'?'selected':''}>CORREIOS</option>
                            </select>
                            <label style="display:block;margin-bottom:0.35rem;font-size:0.85rem;color:#475569;font-weight:600;">Valor (R$)</label>
                            <input id="edit-disp-amount" type="number" step="0.01" min="0.01" value="${currentAmount.toFixed(2)}"
                                style="width:100%;padding:0.5rem;border:1px solid #cbd5e1;border-radius:6px;margin-bottom:1.25rem;font-size:0.95rem;box-sizing:border-box;">
                            <div style="display:flex;gap:0.75rem;justify-content:flex-end;">
                                <button id="edit-disp-cancel" style="padding:0.5rem 1.25rem;border:1px solid #cbd5e1;background:white;border-radius:6px;cursor:pointer;font-size:0.9rem;">Cancelar</button>
                                <button id="edit-disp-save" style="padding:0.5rem 1.25rem;background:#7c3aed;color:white;border:none;border-radius:6px;cursor:pointer;font-size:0.9rem;font-weight:600;">Salvar</button>
                            </div>
                        </div>`;
                    document.body.appendChild(modal);

                    modal.querySelector('#edit-disp-cancel').onclick = () => modal.remove();
                    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

                    modal.querySelector('#edit-disp-save').onclick = async () => {
                        const carrier = modal.querySelector('#edit-disp-carrier').value;
                        const amount = parseFloat(modal.querySelector('#edit-disp-amount').value);
                        if (!carrier || isNaN(amount) || amount <= 0) {
                            alert('Preencha todos os campos corretamente.');
                            return;
                        }
                        const saveBtn = modal.querySelector('#edit-disp-save');
                        saveBtn.disabled = true; saveBtn.textContent = 'Salvando...';
                        const r = await fetch(`/api/dispatch-costs/${id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ carrier, amount })
                        });
                        if (r.ok) {
                            modal.remove();
                            loadFinancial();
                        } else {
                            const j = await r.json().catch(() => ({}));
                            alert('Erro: ' + (j.error || 'Falha ao salvar'));
                            saveBtn.disabled = false; saveBtn.textContent = 'Salvar';
                        }
                    };
                };
            });
        }
    };

    const loadFinancial = async () => {
        try {
            const [salesRes, matRes, dispRes] = await Promise.all([
                fetch('/api/reports/sales'),
                fetch('/api/reports/material-costs'),
                fetch('/api/reports/dispatch-costs')
            ]);
            
            const [salesDataObj, matDataObj, dispDataObj] = await Promise.all([
                salesRes.json(),
                matRes.json(),
                dispRes.json()
            ]);

            allData = salesDataObj.data || [];
            allReserved = salesDataObj.reserved || [];
            allMaterialCosts = matDataObj.data || [];
            allDispatchCosts = dispDataObj.data || [];

            globals.totalReserved = salesDataObj.total_reservado || 0;
            globals.totalMaterial = matDataObj.total_cost || 0;
            globals.totalDispatch = dispDataObj.total || 0;

            // Populate month filter dropdown using ONLY allData dates (Sales)
            const monthSet = new Set();
            allData.forEach(s => {
                const d = window.parseDBDate(s.created_at);
                const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
                monthSet.add(key);
            });
            const monthSelect = container.querySelector('#filter-month');
            const currentVal = monthSelect.value;
            monthSelect.innerHTML = '<option value="">Todos os meses</option>' +
                [...monthSet].sort((a, b) => b.localeCompare(a)).map(key => {
                    const [y, m] = key.split('-');
                    return `<option value="${key}" ${key === currentVal ? 'selected' : ''}>${monthNames[parseInt(m)]} ${y}</option>`;
                }).join('');

            applyFilters();
        } catch (e) {
            console.error('Erro ao carregar dados do financeiro reunificado:', e);
        }
    };

    // Filter event listeners
    container.querySelector('#filter-search').onkeydown = (e) => { if (e.key === 'Enter') applyFilters(); };
    container.querySelector('#filter-core').onchange = applyFilters;
    container.querySelector('#filter-month').onchange = applyFilters;
    container.querySelector('#filter-min').onchange = applyFilters;
    container.querySelector('#filter-max').onchange = applyFilters;
    container.querySelector('#btn-clear-filter').onclick = () => {
        container.querySelector('#filter-search').value = '';
        container.querySelector('#filter-core').value = '';
        container.querySelector('#filter-month').value = '';
        container.querySelector('#filter-min').value = '';
        container.querySelector('#filter-max').value = '';
        applyFilters();
    };

    const setupFidelityDashboard = () => {
        const btnToggle = container.querySelector('#btn-toggle-fidelity');
        const dashContainer = container.querySelector('#fidelity-dashboard-container');
        let isLoaded = false;

        btnToggle.addEventListener('click', async () => {
            const isHidden = dashContainer.style.display === 'none';
            if (isHidden) {
                dashContainer.style.display = 'block';
                btnToggle.style.opacity = '0.8';
                
                if (!isLoaded) {
                    dashContainer.innerHTML = '<div style="text-align:center; padding:2rem; color:#b45309; font-weight:bold;">Carregando contas fidelidade...</div>';
                    try {
                        const res = await fetch('/api/clients');
                        const { data } = await res.json();
                        
                        // Filter only fidelity clients
                        const fidelityClients = (data || []).filter(c => c.loyalty_status === 1);
                        
                        if (fidelityClients.length === 0) {
                            dashContainer.innerHTML = '<div style="text-align:center; padding:2rem; color:#b45309;">Nenhum cliente fidelidade encontrado.</div>';
                            isLoaded = true;
                            return;
                        }

                        let totalBalance = 0;
                        let totalDebt = 0;

                        const rows = fidelityClients.map(c => {
                            const balance = parseFloat(c.credit_balance || 0);
                            const spent = parseFloat(c.L90_spent || 0);
                            const tier = c.loyalty_tier || 'bronze';
                            
                            if (balance > 0) totalBalance += balance;
                            if (balance < 0) totalDebt += Math.abs(balance);
                            
                            let tierIcon = '🥉';
                            let tierColor = '#b45309';
                            if (tier === 'ouro') { tierIcon = '🏆'; tierColor = '#f59e0b'; }
                            else if (tier === 'prata') { tierIcon = '🥈'; tierColor = '#94a3b8'; }

                            const balanceColor = balance >= 0 ? '#16a34a' : '#dc2626';

                            return `
                                <div style="display:flex; justify-content:space-between; align-items:center; padding:1rem; border-bottom:1px solid #fde68a; flex-wrap:wrap; gap:1rem;">
                                    <div style="flex:1; min-width:200px;">
                                        <div style="font-weight:800; font-size:1.1rem; color:#78350f;">${c.name}</div>
                                        <div style="font-size:0.85rem; color:#b45309;">${c.phone || 'Sem telefone'} | Vencimento: Dia ${c.billing_date || '-'}</div>
                                    </div>
                                    <div style="display:flex; align-items:center; gap:0.5rem; background:#fef3c7; padding:0.3rem 0.8rem; border-radius:20px; border:1px solid #fcd34d;">
                                        <span style="font-size:1.2rem;">${tierIcon}</span>
                                        <span style="font-weight:700; color:${tierColor}; text-transform:uppercase; font-size:0.85rem;">${tier}</span>
                                    </div>
                                    <div style="text-align:right; min-width:120px;">
                                        <div style="font-size:0.75rem; color:#b45309; text-transform:uppercase; font-weight:600;">Saldo Atual</div>
                                        <div style="font-weight:900; font-size:1.2rem; color:${balanceColor};">R$ ${balance.toFixed(2).replace('.', ',')}</div>
                                    </div>
                                    <div style="text-align:right; min-width:120px; border-left:1px solid #fde68a; padding-left:1rem;">
                                        <div style="font-size:0.75rem; color:#b45309; text-transform:uppercase; font-weight:600;">Gasto p/ Nível</div>
                                        <div style="font-weight:800; font-size:1.1rem; color:#92400e;">R$ ${spent.toFixed(2).replace('.', ',')}</div>
                                    </div>
                                    <div style="text-align:right; min-width:60px;">
                                        <button class="btn-reset-points" data-id="${c.id}" data-name="${c.name}" title="Zerar Pontuação de Fidelidade" style="background:white; border:1px solid #f59e0b; color:#b45309; padding:0.4rem 0.6rem; border-radius:6px; cursor:pointer; font-size:1rem; transition:all 0.2s;" onmouseover="this.style.background='#f59e0b'; this.style.color='white';" onmouseout="this.style.background='white'; this.style.color='#b45309';">
                                            🔄
                                        </button>
                                    </div>
                                </div>
                            `;
                        }).join('');

                        dashContainer.innerHTML = `
                            <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:1.5rem; border-bottom:2px solid #f59e0b; padding-bottom:1rem; flex-wrap:wrap; gap:1rem;">
                                <div>
                                    <h3 style="margin:0; font-size:1.5rem; font-weight:900; color:#92400e;">Painel de Clientes Fidelidade</h3>
                                    <p style="margin:0; color:#b45309; font-size:0.9rem;">Visão financeira geral das contas fidelidade ativas.</p>
                                </div>
                                <div style="display:flex; gap:1.5rem;">
                                    <div style="text-align:right;">
                                        <div style="font-size:0.8rem; color:#b45309; font-weight:bold; text-transform:uppercase;">Crédito Positivo Total</div>
                                        <div style="font-size:1.3rem; font-weight:900; color:#16a34a;">+ R$ ${totalBalance.toFixed(2).replace('.', ',')}</div>
                                    </div>
                                    <div style="text-align:right; border-left:1px solid #fcd34d; padding-left:1.5rem;">
                                        <div style="font-size:0.8rem; color:#b45309; font-weight:bold; text-transform:uppercase;">Dívida Acumulada Total</div>
                                        <div style="font-size:1.3rem; font-weight:900; color:#dc2626;">- R$ ${totalDebt.toFixed(2).replace('.', ',')}</div>
                                    </div>
                                </div>
                            </div>
                            <div style="background:white; border-radius:8px; border:1px solid #fde68a; overflow:hidden;">
                                ${rows}
                            </div>
                        `;

                        // Bind reset buttons
                        dashContainer.querySelectorAll('.btn-reset-points').forEach(btn => {
                            btn.onclick = async (e) => {
                                e.stopPropagation();
                                const id = btn.dataset.id;
                                const name = btn.dataset.name;
                                if (!confirm(`⚠️ Deseja ZERAR a pontuação de fidelidade de "${name}"?\n\nIsso fará com que o gasto acumulado e a quantidade de pedidos voltem para ZERO para este cliente, sem afetar o saldo financeiro.`)) return;
                                
                                const res = await fetch(`/api/clients/${id}/reset-points`, { method: 'PUT' });
                                if (res.ok) {
                                    isLoaded = false;
                                    // Refresh the dashboard content without closing it
                                    dashContainer.innerHTML = '<div style="text-align:center; padding:2rem; color:#b45309; font-weight:bold;">Atualizando...</div>';
                                    btnToggle.click(); // This will HIDE it
                                    setTimeout(() => btnToggle.click(), 50); // This will RE-SHOW and TRIGGER RELOAD
                                } else {
                                    const errorData = await res.json().catch(() => ({}));
                                    alert('Erro ao zerar pontuação: ' + (errorData.error || 'Erro desconhecido no servidor'));
                                }
                            };
                        });

                        isLoaded = true;
                    } catch (err) {
                        dashContainer.innerHTML = '<div style="text-align:center; padding:2rem; color:#dc2626; font-weight:bold;">Erro ao carregar dados de fidelidade.</div>';
                    }
                }
            } else {
                dashContainer.style.display = 'none';
                btnToggle.style.opacity = '1';
            }
        });
    };

    setupFidelityDashboard();
    loadFinancial();
    return container;
};
