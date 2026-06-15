export const render = (user) => {
    const container = document.createElement('div');
    container.innerHTML = `
        <!-- Header Premium -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 2rem; flex-wrap:wrap; gap:1rem;">
            <div style="display:flex; flex-direction:column; gap:0.4rem;">
                <div style="display:flex; align-items:center; gap:0.75rem;">
                    <div style="width:42px; height:42px; background:linear-gradient(135deg,#7c3aed,#4c1d95); border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:1.3rem; box-shadow:0 4px 12px rgba(124,58,237,0.35);">💰</div>
                    <h2 style="font-size: 1.9rem; font-weight: 900; background: linear-gradient(135deg, #7c3aed, #4c1d95, #2e1065); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin:0; letter-spacing: -0.04em;">Financeiro Geral</h2>
                </div>
                <p style="color: #94a3b8; margin: 0; font-size: 0.88rem; font-weight:500; padding-left:3.5rem;">Controle de pagamentos, faturamento e relatórios financeiros.</p>
            </div>
            <div>
                <button id="btn-toggle-fidelity" class="btn" style="background: linear-gradient(135deg, #f59e0b, #d97706, #b45309); color: white; border: none; padding: 0.65rem 1.4rem; border-radius: 10px; font-weight: 700; box-shadow: 0 4px 20px rgba(245, 158, 11, 0.45); display: flex; align-items: center; gap: 0.5rem; transition: all 0.25s; font-size:0.92rem; letter-spacing:0.01em;">
                    🏆 Contas Fidelidade
                </button>
            </div>
        </div>

        <div id="fidelity-dashboard-container" style="display:none; margin-bottom: 2rem; background: linear-gradient(135deg,#fffbeb,#fef3c7); padding: 1.5rem; border: 1px solid #fde68a; border-radius: 14px; box-shadow: 0 10px 30px rgba(217, 119, 6, 0.12);">
            <div style="text-align:center; padding:2rem; color:#b45309;">Carregando contas fidelidade...</div>
        </div>

        <!-- Filters Premium -->
        <div style="display:flex; gap:0.6rem; flex-wrap:wrap; margin-bottom:1.5rem; padding:1rem 1.2rem; background:white; border-radius:14px; border:1px solid #e2e8f0; box-shadow:0 2px 12px rgba(0,0,0,0.05);">
            <input type="text" id="filter-search" placeholder="🔍 Buscar cliente, produto ou #ID do pedido..." style="flex:2; min-width:200px; padding:0.6rem 0.9rem; border:1.5px solid #e2e8f0; border-radius:9px; font-size:0.9rem; transition:border 0.2s; outline:none;" onfocus="this.style.border='1.5px solid #7c3aed'" onblur="this.style.border='1.5px solid #e2e8f0'">
            <select id="filter-core" style="flex:1; min-width:190px; padding:0.6rem 0.75rem; border:1.5px solid #e2e8f0; border-radius:9px; font-size:0.9rem; background:white; outline:none;">
                <option value="">Status: Todos</option>
                <optgroup label="🔵 WARLEN">
                    <option value="warlen-1">✅ WARLEN — Lançados</option>
                    <option value="warlen-0">⬜ WARLEN — Pendentes</option>
                </optgroup>
                <optgroup label="🟣 EMANUEL">
                    <option value="emanuel-1">✅ EMANUEL — Lançados</option>
                    <option value="emanuel-0">⬜ EMANUEL — Pendentes</option>
                </optgroup>
                <optgroup label="📋 Ambos">
                    <option value="both-1">✅ Ambos Lançados</option>
                    <option value="both-0">⬜ Ambos Pendentes</option>
                </optgroup>
            </select>
            <select id="filter-month" style="flex:1; min-width:140px; padding:0.6rem 0.75rem; border:1.5px solid #e2e8f0; border-radius:9px; font-size:0.9rem; background:white; outline:none;">
                <option value="">Todos os meses</option>
            </select>
            <input type="number" id="filter-min" placeholder="Valor mín" step="0.01" min="0" style="width:105px; padding:0.6rem 0.75rem; border:1.5px solid #e2e8f0; border-radius:9px; font-size:0.9rem; outline:none;">
            <input type="number" id="filter-max" placeholder="Valor máx" step="0.01" min="0" style="width:105px; padding:0.6rem 0.75rem; border:1.5px solid #e2e8f0; border-radius:9px; font-size:0.9rem; outline:none;">
            <button class="btn btn-secondary" id="btn-clear-filter" style="width:auto; padding:0.6rem 1rem; font-size:0.85rem; border-radius:9px;">↺ Limpar</button>
            <div style="display:flex; align-items:center; gap:0.6rem; background:linear-gradient(135deg,#fff7ed,#fef3c7); padding:0.55rem 1.1rem; border-radius:9px; border:1.5px solid #fcd34d; cursor:pointer; transition:all 0.2s;" onclick="const cb = document.getElementById('filter-fidelidade'); cb.checked = !cb.checked; cb.dispatchEvent(new Event('change'));">
                <input type="checkbox" id="filter-fidelidade" style="width:17px; height:17px; cursor:pointer; pointer-events:none; accent-color:#f59e0b;">
                <label style="margin:0; cursor:pointer; font-weight:800; color:#b45309; font-size:0.88rem; user-select:none;">🏅 Apenas Fidelidade</label>
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

    // Tracks which month sections are currently expanded by the user
    const openMonthKeys = new Set();
    // Expose to onclick handlers in the HTML template
    window._finOpenMonths = openMonthKeys;
    
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
                // Se a busca começa com '#' ou é puramente numérica → match exato no ID do pedido
                const searchClean = search.startsWith('#') ? search.slice(1) : search;
                const isIdSearch = /^\d+$/.test(searchClean);
                if (isIdSearch) {
                    if (String(item.id) !== searchClean) return false;
                } else {
                    // Busca textual: haystack sem o ID (evita falsos positivos numéricos)
                    const haystack = removeAccents(`${item.client_name || ''} ${item.products_summary || ''} ${item.description || ''} ${item.carrier || ''}`.toLowerCase());
                    if (!haystack.includes(search)) return false;
                }
            }
            const val = getterVal(item) || 0;
            if (val < minVal || val > maxVal) return false;

            if (coreFilter !== '') {
                if (!isCoreTracked) return false; // Ocultar itens que não têm status de lançamento
                const wLaunched = item.launched_to_warlen ? 1 : 0;
                const eLaunched = item.launched_to_emanuel ? 1 : 0;
                if (coreFilter === 'warlen-1' && wLaunched !== 1) return false;
                if (coreFilter === 'warlen-0' && wLaunched !== 0) return false;
                if (coreFilter === 'emanuel-1' && eLaunched !== 1) return false;
                if (coreFilter === 'emanuel-0' && eLaunched !== 0) return false;
                if (coreFilter === 'both-1' && (wLaunched !== 1 || eLaunched !== 1)) return false;
                if (coreFilter === 'both-0' && (wLaunched !== 0 || eLaunched !== 0)) return false;
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
        // ── Preserve open state ─────────────────────────────────────────
        // Before re-rendering, read which months are currently open/closed
        // from the live DOM and sync them into openMonthKeys.
        container.querySelectorAll('#fin-monthly-container [data-month-key]').forEach(header => {
            const key = header.dataset.monthKey;
            const content = header.nextElementSibling;
            if (!content) return;
            if (content.style.display !== 'none') {
                openMonthKeys.add(key);
            } else {
                openMonthKeys.delete(key);
            }
        });
        // ────────────────────────────────────────────────────────────────

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
            monthlyContainer.innerHTML = `
                <div style="text-align:center; padding:4rem 2rem; background:white; border-radius:20px; border:1.5px dashed #e2e8f0; box-shadow:0 4px 20px rgba(0,0,0,0.04);">
                    <div style="font-size:3rem; margin-bottom:1rem; opacity:0.3;">📊</div>
                    <p style="color:#94a3b8; font-size:1rem; font-weight:600; margin:0;">Nenhum dado encontrado</p>
                    <p style="color:#cbd5e1; font-size:0.85rem; margin-top:0.4rem;">Tente ajustar os filtros acima</p>
                </div>`;
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
                <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:1rem; margin-bottom:1.5rem;">
                    <div style="background:linear-gradient(135deg,#f5f3ff,#ede9fe); border:1.5px solid #ddd6fe; border-radius:14px; padding:1.1rem 1.25rem; display:flex; align-items:center; gap:0.9rem; box-shadow:0 2px 8px rgba(124,58,237,0.08); transition:transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
                        <div style="width:40px; height:40px; border-radius:10px; background:linear-gradient(135deg,#7c3aed,#6d28d9); display:flex; align-items:center; justify-content:center; color:white; font-size:1.1rem; flex-shrink:0; box-shadow:0 3px 10px rgba(124,58,237,0.3);">🧾</div>
                        <div>
                            <div style="font-size:1.5rem; font-weight:900; color:#4c1d95; line-height:1;">${m.sales.length}</div>
                            <div style="font-size:0.75rem; color:#6d28d9; font-weight:600; text-transform:uppercase; letter-spacing:0.04em; margin-top:2px;">Transações</div>
                        </div>
                    </div>
                    <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7); border:1.5px solid #bbf7d0; border-radius:14px; padding:1.1rem 1.25rem; display:flex; align-items:center; gap:0.9rem; box-shadow:0 2px 8px rgba(5,150,105,0.08); transition:transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
                        <div style="width:40px; height:40px; border-radius:10px; background:linear-gradient(135deg,#059669,#047857); display:flex; align-items:center; justify-content:center; color:white; font-size:1.1rem; flex-shrink:0; box-shadow:0 3px 10px rgba(5,150,105,0.3);">✅</div>
                        <div>
                            <div style="font-size:1.5rem; font-weight:900; color:#065f46; line-height:1;">${mLaunchedCount}</div>
                            <div style="font-size:0.75rem; color:#047857; font-weight:600; text-transform:uppercase; letter-spacing:0.04em; margin-top:2px;">Lançados Core</div>
                        </div>
                    </div>
                    <div style="background:linear-gradient(135deg,#fffbeb,#fef3c7); border:1.5px solid #fde68a; border-radius:14px; padding:1.1rem 1.25rem; display:flex; align-items:center; gap:0.9rem; box-shadow:0 2px 8px rgba(245,158,11,0.08); transition:transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
                        <div style="width:40px; height:40px; border-radius:10px; background:linear-gradient(135deg,#f59e0b,#d97706); display:flex; align-items:center; justify-content:center; color:white; font-size:1.1rem; flex-shrink:0; box-shadow:0 3px 10px rgba(245,158,11,0.3);">⏳</div>
                        <div>
                            <div style="font-size:1.5rem; font-weight:900; color:#92400e; line-height:1;">${mPendingCount}</div>
                            <div style="font-size:0.75rem; color:#b45309; font-weight:600; text-transform:uppercase; letter-spacing:0.04em; margin-top:2px;">Pendentes</div>
                        </div>
                    </div>
                    <div style="background:linear-gradient(135deg,#fef2f2,#fee2e2); border:2px solid #fca5a5; border-radius:14px; padding:1.1rem 1.25rem; display:flex; align-items:center; gap:0.9rem; box-shadow:0 2px 8px rgba(239,68,68,0.1); transition:transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
                        <div style="width:40px; height:40px; border-radius:10px; background:linear-gradient(135deg,#ef4444,#dc2626); display:flex; align-items:center; justify-content:center; color:white; font-size:1.1rem; flex-shrink:0; box-shadow:0 3px 10px rgba(239,68,68,0.3);">👛</div>
                        <div>
                            <div style="font-size:1.2rem; font-weight:900; color:#b91c1c; line-height:1;">R$&nbsp;${m.aReceberTotal.toFixed(2)}</div>
                            <div style="font-size:0.75rem; color:#dc2626; font-weight:600; text-transform:uppercase; letter-spacing:0.04em; margin-top:2px;">⚠️ A Receber</div>
                        </div>
                    </div>
                    <div style="background:linear-gradient(135deg,${mResultado>=0?'#f0fdf4,#dcfce7':'#fef2f2,#fee2e2'}); border:1.5px solid ${mResultado>=0?'#86efac':'#fca5a5'}; border-radius:14px; padding:1.1rem 1.25rem; display:flex; align-items:center; gap:0.9rem; box-shadow:0 2px 8px rgba(0,0,0,0.06); transition:transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
                        <div style="width:40px; height:40px; border-radius:10px; background:linear-gradient(135deg,${mResultado>=0?'#059669,#047857':'#ef4444,#dc2626'}); display:flex; align-items:center; justify-content:center; color:white; font-size:1.1rem; flex-shrink:0; box-shadow:0 3px 10px rgba(0,0,0,0.18);">${mResultado>=0?'📈':'📉'}</div>
                        <div>
                            <div style="font-size:1.2rem; font-weight:900; color:${mResultado>=0?'#065f46':'#b91c1c'}; line-height:1;">R$&nbsp;${mResultado.toFixed(2)}</div>
                            <div style="font-size:0.75rem; color:${mResultado>=0?'#047857':'#dc2626'}; font-weight:600; text-transform:uppercase; letter-spacing:0.04em; margin-top:2px;">Resultado Mês</div>
                        </div>
                    </div>
                </div>
                `;

                // 1. Sales Rows
                const salesRows = m.sales.map(s => {
                    // WARLEN: lançar apenas pedidos que são CORE (payment_method CORE ou pedido interno)
                    const isCore = s.payment_method === 'CORE' || s.is_internal;
                    const isWLaunched = s.launched_to_warlen ? true : false;
                    const wBadgeStyle = isWLaunched
                        ? 'background:#d1fae5; color:#065f46; border:1px solid #6ee7b7;'
                        : (isCore ? 'background:#eff6ff; color:#1d4ed8; border:1px solid #93c5fd; cursor:pointer;' : 'background:#f1f5f9; color:#94a3b8; border:1px solid #e2e8f0;');
                    const wBadgeText = isWLaunched ? '✅ Lançado' : (isCore ? '⬜ Lançar' : '—');

                    // EMANUEL: lançar em todos os pedidos
                    const isELaunched = s.launched_to_emanuel ? true : false;
                    const eBadgeStyle = isELaunched
                        ? 'background:#d1fae5; color:#065f46; border:1px solid #6ee7b7;'
                        : 'background:#fdf4ff; color:#7e22ce; border:1px solid #d8b4fe; cursor:pointer;';
                    const eBadgeText = isELaunched ? '✅ Lançado' : '⬜ Lançar';

                    const pmColors = {
                        'Pix':       { bg:'#f0fdf4', color:'#15803d', border:'#86efac' },
                        'Cartão':    { bg:'#eff6ff', color:'#1d4ed8', border:'#93c5fd' },
                        'Dinheiro':  { bg:'#fefce8', color:'#a16207', border:'#fde047' },
                        'Boleto':    { bg:'#f5f3ff', color:'#6d28d9', border:'#c4b5fd' },
                        'CORE':      { bg:'#f0f9ff', color:'#0369a1', border:'#7dd3fc' },
                        'Fidelidade':{ bg:'#fff7ed', color:'#c2410c', border:'#fdba74' },
                        'Crédito':   { bg:'#faf5ff', color:'#7e22ce', border:'#d8b4fe' },
                        'A Receber': { bg:'#fef2f2', color:'#b91c1c', border:'#fca5a5' },
                    };
                    const pm = s.payment_method || '';
                    const pmStyle = pmColors[pm] || { bg:'#f8fafc', color:'#475569', border:'#e2e8f0' };

                    return `
                    <tr style="transition:background 0.15s; ${!isWLaunched || !isELaunched ? 'background:linear-gradient(90deg,#fffbeb,#fff);' : ''}" onmouseover="this.style.background='#f8faff'" onmouseout="this.style.background='${!isWLaunched || !isELaunched ? 'linear-gradient(90deg,#fffbeb,#fff)' : ''}' ">
                        <td style="text-align:center; padding:0.8rem 0.6rem;">
                            <span title="ID do Pedido #${s.id}" style="
                                display:inline-block;
                                background:linear-gradient(135deg,#f1f5f9,#e2e8f0);
                                color:#475569; border:1px solid #cbd5e1;
                                border-radius:8px; padding:3px 8px;
                                font-size:0.75rem; font-weight:800;
                                letter-spacing:0.04em;
                            ">#${s.id}</span>
                        </td>
                        <td style="padding:0.8rem 0.75rem; font-size:0.85rem; color:#64748b; white-space:nowrap;">
                            ${window.parseDBDate(s.created_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                        </td>
                        <td style="padding:0.8rem 0.75rem;">
                            <div style="font-weight:700; color:#1e293b; font-size:0.9rem;">${s.client_name || '—'}</div>
                            ${s.is_internal ? '<span style="background:#dbeafe; color:#1d4ed8; padding:1px 7px; border-radius:10px; font-size:0.68rem; font-weight:700; display:inline-block; margin-top:2px;">🏢 Interno</span>' : ''}
                        </td>
                        <td style="padding:0.8rem 0.75rem; font-size:0.82rem; color:#64748b;">${s.client_phone || '—'}</td>
                        <td style="padding:0.8rem 0.75rem; font-size:0.83rem; max-width:180px; color:#374151;">
                            <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${(s.products_summary||'').replace(/"/g,'&quot;')}">${s.products_summary || '—'}</div>
                            ${s.products_summary ? `<button type="button" onclick="window.copyTextToClipboard('LM | GRÁFICA - ${(() => { const ev = (s.event_name || '').replace(/'/g, "\\''"); const ps = (s.products_summary || '').replace(/'/g, "\\''"); return ev && !ps.startsWith(ev) ? ev + ' - ' + ps : ps; })()}')" title="Copiar" style="background:none;border:none;cursor:pointer;font-size:0.85rem;opacity:0.4;transition:opacity 0.15s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.4'">📋</button>` : ''}
                        </td>
                        <td style="padding:0.8rem 0.75rem; font-size:0.82rem; max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#64748b;" title="${(s.description || '').replace(/"/g, '&quot;')}">${s.description || '—'}</td>
                        <td style="padding:0.8rem 0.75rem; white-space:nowrap;">
                            <span style="font-weight:800; color:#5b21b6; font-size:0.92rem;">R$ ${(s.total_value || 0).toFixed(2)}</span>
                        </td>
                        <td style="padding:0.8rem 0.75rem; text-align:center;">
                            ${(s.discount_value || 0) > 0
                                ? `<span style="background:#fef2f2; color:#dc2626; border:1px solid #fca5a5; border-radius:8px; padding:2px 8px; font-size:0.78rem; font-weight:700; white-space:nowrap;">−R$ ${(s.discount_value).toFixed(2)}</span>`
                                : `<span style="color:#cbd5e1; font-size:0.85rem;">—</span>`}
                        </td>
                        <td style="padding:0.8rem 0.75rem; text-align:center;">
                            <span style="background:${pmStyle.bg}; color:${pmStyle.color}; border:1px solid ${pmStyle.border}; border-radius:8px; padding:3px 9px; font-size:0.78rem; font-weight:700; white-space:nowrap; display:inline-block;">${pm || '—'}</span>
                            ${pm === 'A Receber' ? `<br><button class="btn btn-sm btn-mark-paid" data-id="${s.id}" style="margin-top:5px; padding:3px 9px; font-size:0.72rem; background:linear-gradient(135deg,#22c55e,#16a34a); color:white; border:none; border-radius:6px; cursor:pointer; box-shadow:0 2px 6px rgba(34,197,94,0.35); font-weight:700;">💰 PAGO</button>` : ''}
                        </td>
                        <td style="text-align:center; padding:0.8rem 0.5rem;">
                            ${isCore
                                ? `<button class="btn btn-sm warlen-btn" data-id="${s.id}" data-launched="${isWLaunched ? '1' : '0'}" style="${wBadgeStyle} padding:4px 10px; border-radius:20px; font-size:0.78rem; font-weight:700; white-space:nowrap;">${wBadgeText}</button>`
                                : `<span style="color:#e2e8f0; font-size:1rem;">—</span>`
                            }
                        </td>
                        <td style="text-align:center; padding:0.8rem 0.5rem;">
                            <button class="btn btn-sm emanuel-btn" data-id="${s.id}" data-launched="${isELaunched ? '1' : '0'}" style="${eBadgeStyle} padding:4px 10px; border-radius:20px; font-size:0.78rem; font-weight:700; white-space:nowrap;">${eBadgeText}</button>
                        </td>
                        <td style="text-align:center; padding:0.8rem 0.5rem;">
                            <button class="btn btn-sm fin-edit-btn"
                                data-id="${s.id}"
                                data-products="${(s.products_summary || '').replace(/"/g,'&quot;')}"
                                data-value="${s.total_value || 0}"
                                data-discount="${s.discount_value || 0}"
                                data-payment="${(s.payment_method || '').replace(/"/g,'&quot;')}"
                                data-description="${(s.description || '').replace(/"/g,'&quot;')}"
                                title="Editar pedido"
                                style="background:linear-gradient(135deg,#f0fdf4,#dcfce7); color:#15803d; border:1px solid #86efac; padding:4px 11px; border-radius:20px; font-size:0.78rem; font-weight:700; cursor:pointer; white-space:nowrap; transition:all 0.15s;"
                                onmouseover="this.style.background='linear-gradient(135deg,#059669,#047857)';this.style.color='white'"
                                onmouseout="this.style.background='linear-gradient(135deg,#f0fdf4,#dcfce7)';this.style.color='#15803d'">
                                ✏️ Editar
                            </button>
                        </td>
                    </tr>`;
                }).join('');

                const salesTable = m.sales.length > 0 ? `
                    <div style="margin-top:1.25rem; border:1.5px solid #e2e8f0; border-radius:12px; overflow:hidden; box-shadow:0 2px 10px rgba(0,0,0,0.04);">
                        <div style="background:linear-gradient(135deg,#f8fafc,#f1f5f9); padding:0.75rem 1.25rem; font-weight:700; color:#1e293b; display:flex; justify-content:space-between; align-items:center; border-bottom:1.5px solid #e2e8f0;">
                            <span style="display:flex; align-items:center; gap:0.5rem; font-size:0.95rem;"><span style="background:#059669; color:white; border-radius:6px; padding:2px 8px; font-size:0.8rem;">✅</span> Transações — Fechamento</span>
                            <span style="background:linear-gradient(135deg,#059669,#047857); -webkit-background-clip:text; -webkit-text-fill-color:transparent; font-size:1.1rem; font-weight:900;">R$ ${m.salesTotal.toFixed(2)}</span>
                        </div>
                        <table class="data-table" style="margin:0; border-radius:0;">
                            <thead>
                                <tr>
                                    <th style="background:linear-gradient(135deg,#f8fafc,#f1f5f9); color:#64748b; min-width:60px; text-align:center; font-weight:700;">Pedido</th>
                                    <th style="background:linear-gradient(135deg,#f8fafc,#f1f5f9); color:#64748b; font-weight:700;">Data</th>
                                    <th style="background:linear-gradient(135deg,#f8fafc,#f1f5f9); color:#64748b; font-weight:700;">Cliente</th>
                                    <th style="background:linear-gradient(135deg,#f8fafc,#f1f5f9); color:#64748b; font-weight:700;">Telefone</th>
                                    <th style="background:linear-gradient(135deg,#f8fafc,#f1f5f9); color:#64748b; font-weight:700;">Produtos</th>
                                    <th style="background:linear-gradient(135deg,#f8fafc,#f1f5f9); color:#64748b; font-weight:700;">Descrição</th>
                                    <th style="background:linear-gradient(135deg,#f8fafc,#f1f5f9); color:#059669; font-weight:700;">Valor Pago</th>
                                    <th style="background:linear-gradient(135deg,#f8fafc,#f1f5f9); color:#dc2626; font-weight:700;">Desconto</th>
                                    <th style="background:linear-gradient(135deg,#f8fafc,#f1f5f9); color:#64748b; font-weight:700;">Pagamento</th>
                                    <th style="background:linear-gradient(135deg,#dbeafe,#bfdbfe); color:#1e40af; min-width:90px; font-weight:700;">WARLEN</th>
                                    <th style="background:linear-gradient(135deg,#faf5ff,#ede9fe); color:#6b21a8; min-width:90px; font-weight:700;">EMANUEL</th>
                                    <th style="background:linear-gradient(135deg,#f0fdf4,#dcfce7); color:#166534; min-width:80px; font-weight:700;">Editar</th>
                                </tr>
                            </thead>
                            <tbody>${salesRows}</tbody>
                        </table>
                    </div>
                ` : '';

                // Discounts Rows
                const discountItems = m.sales.filter(s => (s.discount_value || 0) > 0);
                const discountRows = discountItems.map(s => `
                    <tr onmouseover="this.style.background='#fff7ed'" onmouseout="this.style.background=''" style="transition:background 0.15s;">
                        <td style="padding:0.75rem; font-size:0.83rem; color:#64748b; white-space:nowrap;">${window.parseDBDate(s.created_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</td>
                        <td style="padding:0.75rem; font-weight:700; color:#1e293b;">${s.client_name || '—'}</td>
                        <td style="padding:0.75rem; font-size:0.83rem; color:#374151; max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${s.products_summary || '—'}</td>
                        <td style="padding:0.75rem; text-align:center;"><span style="background:#f8fafc; color:#475569; border:1px solid #e2e8f0; border-radius:8px; padding:2px 8px; font-size:0.78rem; font-weight:600;">${s.payment_method || '—'}</span></td>
                        <td style="padding:0.75rem; text-align:right;"><span style="background:#fef2f2; color:#dc2626; border:1px solid #fca5a5; border-radius:8px; padding:3px 10px; font-size:0.85rem; font-weight:800;">−R$ ${(s.discount_value || 0).toFixed(2)}</span></td>
                    </tr>`).join('');

                const discountTable = discountItems.length > 0 ? `
                    <div style="margin-top:1.25rem; border:1.5px solid #fed7aa; border-radius:12px; overflow:hidden; box-shadow:0 2px 10px rgba(194,65,12,0.06);">
                        <div style="background:linear-gradient(135deg,#fff7ed,#ffedd5); padding:0.75rem 1.25rem; display:flex; justify-content:space-between; align-items:center; border-bottom:1.5px solid #fed7aa;">
                            <span style="display:flex; align-items:center; gap:0.5rem; font-weight:700; color:#c2410c; font-size:0.9rem;"><span style="background:#ea580c; color:white; border-radius:6px; padding:2px 8px; font-size:0.78rem;">✂️</span> Descontos Concedidos</span>
                            <span style="background:linear-gradient(135deg,#ea580c,#c2410c); -webkit-background-clip:text; -webkit-text-fill-color:transparent; font-size:1.05rem; font-weight:900;">−R$ ${m.salesDiscount.toFixed(2)}</span>
                        </div>
                        <table class="data-table" style="margin:0; border-radius:0;">
                            <thead><tr>
                                <th style="font-size:0.78rem; padding:0.6rem 0.75rem; background:#fff7ed; color:#c2410c;">Data</th>
                                <th style="font-size:0.78rem; padding:0.6rem 0.75rem; background:#fff7ed; color:#c2410c;">Cliente</th>
                                <th style="font-size:0.78rem; padding:0.6rem 0.75rem; background:#fff7ed; color:#c2410c;">Produtos</th>
                                <th style="font-size:0.78rem; padding:0.6rem 0.75rem; background:#fff7ed; color:#c2410c; text-align:center;">Pagamento</th>
                                <th style="font-size:0.78rem; padding:0.6rem 0.75rem; background:#fff7ed; color:#c2410c; text-align:right;">Valor Desconto</th>
                            </tr></thead>
                            <tbody>${discountRows}</tbody>
                        </table>
                    </div>
                ` : '';

                // 2. Reserved Rows
                const statusLabel = status => status === 'aguardando_aceite' ? '⏳ Aguardando' : '🔨 Produção';
                const reservedRows = m.reserved.map(s => `
                    <tr onmouseover="this.style.background='#fffbeb'" onmouseout="this.style.background=''" style="transition:background 0.15s;">
                        <td style="padding:0.75rem; font-size:0.83rem; color:#64748b; white-space:nowrap;">${window.parseDBDate(s.created_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</td>
                        <td style="padding:0.75rem; font-weight:700; color:#1e293b;">${s.client_name || '—'}</td>
                        <td style="padding:0.75rem; font-size:0.83rem; color:#374151; max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${s.products_summary || '—'}</td>
                        <td style="padding:0.75rem;"><span style="background:#fef3c7; color:#92400e; border:1px solid #fde68a; border-radius:8px; padding:3px 10px; font-size:0.85rem; font-weight:800;">R$ ${(s.total_value || 0).toFixed(2)}</span></td>
                        <td style="padding:0.75rem; text-align:center;"><span style="background:#f8fafc; color:#475569; border:1px solid #e2e8f0; border-radius:8px; padding:2px 8px; font-size:0.78rem; font-weight:600;">${s.payment_method || '—'}</span></td>
                        <td style="padding:0.75rem; text-align:center;"><span style="background:${s.status === 'aguardando_aceite' ? '#fef3c7' : '#dbeafe'}; color:${s.status === 'aguardando_aceite' ? '#92400e' : '#1e40af'}; border:1px solid ${s.status === 'aguardando_aceite' ? '#fde68a' : '#93c5fd'}; padding:3px 10px; border-radius:20px; font-size:0.75rem; font-weight:700;">${statusLabel(s.status)}</span></td>
                    </tr>`).join('');

                const reservedTable = m.reserved.length > 0 ? `
                    <div style="margin-top:1.25rem; border:1.5px solid #fde68a; border-radius:12px; overflow:hidden; box-shadow:0 2px 10px rgba(146,64,14,0.06);">
                        <div style="background:linear-gradient(135deg,#fffbeb,#fef3c7); padding:0.75rem 1.25rem; display:flex; justify-content:space-between; align-items:center; border-bottom:1.5px solid #fde68a;">
                            <span style="display:flex; align-items:center; gap:0.5rem; font-weight:700; color:#92400e; font-size:0.9rem;"><span style="background:#d97706; color:white; border-radius:6px; padding:2px 8px; font-size:0.78rem;">⏳</span> Pedidos A Receber (Em Produção)</span>
                            <span style="background:linear-gradient(135deg,#d97706,#b45309); -webkit-background-clip:text; -webkit-text-fill-color:transparent; font-size:1.05rem; font-weight:900;">R$ ${m.reservedTotal.toFixed(2)}</span>
                        </div>
                        <table class="data-table" style="margin:0; border-radius:0;">
                            <thead><tr>
                                <th style="font-size:0.78rem; padding:0.6rem 0.75rem; background:#fffbeb; color:#92400e;">Data</th>
                                <th style="font-size:0.78rem; padding:0.6rem 0.75rem; background:#fffbeb; color:#92400e;">Cliente</th>
                                <th style="font-size:0.78rem; padding:0.6rem 0.75rem; background:#fffbeb; color:#92400e;">Produtos</th>
                                <th style="font-size:0.78rem; padding:0.6rem 0.75rem; background:#fffbeb; color:#92400e;">Valor</th>
                                <th style="font-size:0.78rem; padding:0.6rem 0.75rem; background:#fffbeb; color:#92400e; text-align:center;">Pagamento</th>
                                <th style="font-size:0.78rem; padding:0.6rem 0.75rem; background:#fffbeb; color:#92400e; text-align:center;">Status</th>
                            </tr></thead>
                            <tbody>${reservedRows}</tbody>
                        </table>
                    </div>
                ` : '';

                // 3. Materials Rows
                const matRows = m.materials.map(c => `
                    <tr onmouseover="this.style.background='#fef2f2'" onmouseout="this.style.background=''" style="transition:background 0.15s;">
                        <td style="padding:0.75rem; font-size:0.83rem; color:#64748b; white-space:nowrap;">${window.parseDBDate(c.created_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</td>
                        <td style="padding:0.75rem;">
                            <span style="font-weight:700; color:#1e293b;">${c.product_name || '—'}</span>
                            ${c.product_name ? `<button type="button" onclick="window.copyTextToClipboard('LM | GRÁFICA - ${c.product_name.replace(/'/g, "\\'")}')"
title="Copiar" style="background:none;border:none;cursor:pointer;font-size:0.85rem;opacity:0.4;transition:opacity 0.15s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.4'">📋</button>` : ''}
                        </td>
                        <td style="padding:0.75rem;"><span style="background:#f5f3ff; color:#6d28d9; border:1px solid #ddd6fe; border-radius:6px; padding:2px 7px; font-size:0.75rem; font-weight:600;">${c.product_type || '—'}</span></td>
                        <td style="padding:0.75rem; font-size:0.82rem; color:#64748b; max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${c.description || '—'}</td>
                        <td style="padding:0.75rem; text-align:center;"><span style="background:#f1f5f9; color:#475569; border-radius:6px; padding:2px 8px; font-size:0.82rem; font-weight:700;">${c.quantity || 1}</span></td>
                        <td style="padding:0.75rem; text-align:right;"><span style="background:#fef2f2; color:#dc2626; border:1px solid #fca5a5; border-radius:8px; padding:3px 10px; font-size:0.85rem; font-weight:800;">R$ ${(c.cost_amount || 0).toFixed(2)}</span></td>
                        ${isAdmin ? `<td style="padding:0.75rem; text-align:center;"><button class="btn-del-cost" data-id="${c.id}" title="Apagar" style="background:#fef2f2; border:1px solid #fca5a5; color:#dc2626; width:30px; height:30px; border-radius:8px; cursor:pointer; font-size:0.9rem; display:inline-flex; align-items:center; justify-content:center; transition:all 0.15s;" onmouseover="this.style.background='#dc2626';this.style.color='white'" onmouseout="this.style.background='#fef2f2';this.style.color='#dc2626'">🗑️</button></td>` : ''}
                    </tr>`).join('');

                const matTable = m.materials.length > 0 ? `
                    <div style="margin-top:1.25rem; border:1.5px solid #fecaca; border-radius:12px; overflow:hidden; box-shadow:0 2px 10px rgba(220,38,38,0.06);">
                        <div style="background:linear-gradient(135deg,#fef2f2,#fee2e2); padding:0.75rem 1.25rem; display:flex; justify-content:space-between; align-items:center; border-bottom:1.5px solid #fecaca;">
                            <span style="display:flex; align-items:center; gap:0.5rem; font-weight:700; color:#991b1b; font-size:0.9rem;"><span style="background:#dc2626; color:white; border-radius:6px; padding:2px 8px; font-size:0.78rem;">📦</span> Custos de Materiais (Despesas)</span>
                            <span style="background:linear-gradient(135deg,#dc2626,#b91c1c); -webkit-background-clip:text; -webkit-text-fill-color:transparent; font-size:1.05rem; font-weight:900;">R$ ${m.materialsTotal.toFixed(2)}</span>
                        </div>
                        <table class="data-table" style="margin:0; border-radius:0;">
                            <thead><tr>
                                <th style="font-size:0.78rem; padding:0.6rem 0.75rem; background:#fef2f2; color:#991b1b;">Data</th>
                                <th style="font-size:0.78rem; padding:0.6rem 0.75rem; background:#fef2f2; color:#991b1b;">Produto</th>
                                <th style="font-size:0.78rem; padding:0.6rem 0.75rem; background:#fef2f2; color:#991b1b;">Tipo</th>
                                <th style="font-size:0.78rem; padding:0.6rem 0.75rem; background:#fef2f2; color:#991b1b;">Descrição</th>
                                <th style="font-size:0.78rem; padding:0.6rem 0.75rem; background:#fef2f2; color:#991b1b; text-align:center;">Qtd</th>
                                <th style="font-size:0.78rem; padding:0.6rem 0.75rem; background:#fef2f2; color:#991b1b; text-align:right;">Custo</th>
                                ${isAdmin ? '<th style="width:50px; background:#fef2f2;"></th>' : ''}
                            </tr></thead>
                            <tbody>${matRows}</tbody>
                        </table>
                    </div>
                ` : '';

                // 4. Dispatch Rows
                const dispRows = m.dispatch.map(d => {
                    const isDLaunched = d.launched_to_core ? true : false;
                    const dBadgeStyle = isDLaunched
                        ? 'background:#d1fae5; color:#065f46; border:1px solid #6ee7b7;'
                        : 'background:#f5f3ff; color:#6d28d9; border:1px solid #c4b5fd; cursor:pointer;';
                    const dBadgeText = isDLaunched ? '✅ Lançado' : '⬜ Lançar';
                    return `
                        <tr onmouseover="this.style.background='#faf5ff'" onmouseout="this.style.background='${isDLaunched ? '' : 'linear-gradient(90deg,#faf5ff,#fff)'}'" style="transition:background 0.15s; ${isDLaunched ? '' : 'background:linear-gradient(90deg,#faf5ff,#fff);'}">
                            <td style="padding:0.75rem; font-size:0.83rem; color:#64748b; white-space:nowrap;">${window.parseDBDate(d.created_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</td>
                            <td style="padding:0.75rem;"><span style="font-weight:700; color:#4c1d95;">${d.carrier || '—'}</span></td>
                            <td style="padding:0.75rem; font-size:0.85rem; color:#374151;">${d.client_name || '—'}</td>
                            <td style="padding:0.75rem;"><span style="background:#f5f3ff; color:#6d28d9; border:1px solid #ddd6fe; border-radius:6px; padding:2px 7px; font-size:0.75rem; font-weight:600;">#${d.order_id || '—'}</span></td>
                            <td style="padding:0.75rem; text-align:right;"><span style="background:#fef2f2; color:#dc2626; border:1px solid #fca5a5; border-radius:8px; padding:3px 10px; font-size:0.85rem; font-weight:800;">R$ ${(d.amount || 0).toFixed(2)}</span></td>
                            <td style="padding:0.75rem; text-align:center;">
                                <button class="btn btn-sm dispatch-launch-btn" data-id="${d.id}" data-launched="${isDLaunched ? '1' : '0'}" style="${dBadgeStyle} padding:4px 11px; border-radius:20px; font-size:0.78rem; font-weight:700; white-space:nowrap;">
                                    ${dBadgeText}
                                </button>
                            </td>
                            ${isAdmin ? `<td style="padding:0.75rem; text-align:center; white-space:nowrap;">
                                <button class="btn-edit-dispatch" data-id="${d.id}" data-carrier="${(d.carrier||'').replace(/"/g,'&quot;')}" data-amount="${d.amount}" title="Editar" style="background:#f5f3ff;border:1px solid #ddd6fe;color:#7c3aed;width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:0.85rem;display:inline-flex;align-items:center;justify-content:center;transition:all 0.15s;" onmouseover="this.style.background='#7c3aed';this.style.color='white'" onmouseout="this.style.background='#f5f3ff';this.style.color='#7c3aed'">✏️</button>
                                <button class="btn-del-dispatch" data-id="${d.id}" title="Apagar" style="background:#fef2f2;border:1px solid #fca5a5;color:#dc2626;width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:0.85rem;display:inline-flex;align-items:center;justify-content:center;transition:all 0.15s; margin-left:4px;" onmouseover="this.style.background='#dc2626';this.style.color='white'" onmouseout="this.style.background='#fef2f2';this.style.color='#dc2626'">🗑️</button>
                            </td>` : ''}
                        </tr>`;
                }).join('');

                const dispTable = m.dispatch.length > 0 ? `
                    <div style="margin-top:1.25rem; border:1.5px solid #e9d5ff; border-radius:12px; overflow:hidden; box-shadow:0 2px 10px rgba(107,33,168,0.06);">
                        <div style="background:linear-gradient(135deg,#faf5ff,#ede9fe); padding:0.75rem 1.25rem; display:flex; justify-content:space-between; align-items:center; border-bottom:1.5px solid #e9d5ff;">
                            <span style="display:flex; align-items:center; gap:0.5rem; font-weight:700; color:#6b21a8; font-size:0.9rem;"><span style="background:#7c3aed; color:white; border-radius:6px; padding:2px 8px; font-size:0.78rem;">🚚</span> Custos de Despacho</span>
                            <span style="background:linear-gradient(135deg,#7c3aed,#6d28d9); -webkit-background-clip:text; -webkit-text-fill-color:transparent; font-size:1.05rem; font-weight:900;">R$ ${m.dispatchTotal.toFixed(2)}</span>
                        </div>
                        <table class="data-table" style="margin:0; border-radius:0;">
                            <thead><tr>
                                <th style="font-size:0.78rem; padding:0.6rem 0.75rem; background:#faf5ff; color:#6b21a8;">Data</th>
                                <th style="font-size:0.78rem; padding:0.6rem 0.75rem; background:#faf5ff; color:#6b21a8;">Transportadora</th>
                                <th style="font-size:0.78rem; padding:0.6rem 0.75rem; background:#faf5ff; color:#6b21a8;">Cliente</th>
                                <th style="font-size:0.78rem; padding:0.6rem 0.75rem; background:#faf5ff; color:#6b21a8;">Pedido</th>
                                <th style="font-size:0.78rem; padding:0.6rem 0.75rem; background:#faf5ff; color:#6b21a8; text-align:right;">Valor</th>
                                <th style="font-size:0.78rem; padding:0.6rem 0.75rem; background:#faf5ff; color:#6b21a8; text-align:center;">Core</th>
                                ${isAdmin ? '<th style="font-size:0.78rem; padding:0.6rem 0.75rem; background:#faf5ff; width:80px; text-align:center;">Ações</th>' : ''}
                            </tr></thead>
                            <tbody>${dispRows}</tbody>
                        </table>
                    </div>
                ` : '';

                const isOpen = isCurrentMonth || openMonthKeys.has(key);
                const saldo = m.salesTotal - m.dispatchTotal - m.materialsTotal;
                return `
                <div style="margin-bottom:1.75rem; border-radius:16px; overflow:hidden; box-shadow:0 4px 20px rgba(46,16,101,0.15);">
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:1.1rem 1.5rem; background:linear-gradient(135deg, #1e1048, #2e1065, #4c1d95); color:white; cursor:pointer; flex-wrap:wrap; gap:1rem; user-select:none; transition:filter 0.2s;" data-month-key="${key}" onclick="const t = this.nextElementSibling; const willOpen = t.style.display === 'none'; t.style.display = willOpen ? 'block' : 'none'; if(willOpen) window._finOpenMonths.add('${key}'); else window._finOpenMonths.delete('${key}');" onmouseover="this.style.filter='brightness(1.08)'" onmouseout="this.style.filter='none'">
                        
                        <div style="display:flex; align-items:center; gap:0.85rem; flex:1; min-width:200px;">
                            <div style="width:38px; height:38px; background:rgba(255,255,255,0.15); border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:1.15rem; backdrop-filter:blur(4px);">📅</div>
                            <div>
                                <h3 style="margin:0; font-size:1.15rem; font-weight:800; letter-spacing:-0.02em;">${m.label}</h3>
                                <span style="font-size:0.75rem; color:rgba(255,255,255,0.6); font-weight:500;">${m.sales.length} transaç${m.sales.length===1?'ão':'ões'} &nbsp;•&nbsp; clique para ${isOpen?'fechar':'expandir'}</span>
                            </div>
                        </div>

                        <div style="display:flex; gap:1.25rem; flex-wrap:wrap; align-items:center;">
                            ${m.aReceberTotal > 0 ? `
                            <div style="display:flex; flex-direction:column; align-items:flex-end; border:1px solid rgba(239,68,68,0.5); border-radius:8px; padding:4px 10px; background:rgba(239,68,68,0.15);">
                                <span style="font-size:0.7rem; text-transform:uppercase; letter-spacing:0.5px; color:#fca5a5; font-weight:700;">⚠️ A Receber</span>
                                <span style="font-size:1rem; font-weight:800; color:#fca5a5;">R$ ${m.aReceberTotal.toFixed(2)}</span>
                            </div>` : ''}
                            <div style="display:flex; flex-direction:column; align-items:flex-end;">
                                <span style="font-size:0.7rem; text-transform:uppercase; letter-spacing:0.5px; color:rgba(255,255,255,0.55); font-weight:600;">Despacho</span>
                                <span style="font-size:0.95rem; font-weight:700; color:#fca5a5;">R$ ${m.dispatchTotal.toFixed(2)}</span>
                            </div>
                            <div style="display:flex; flex-direction:column; align-items:flex-end;">
                                <span style="font-size:0.7rem; text-transform:uppercase; letter-spacing:0.5px; color:rgba(255,255,255,0.55); font-weight:600;">Despesas</span>
                                <span style="font-size:0.95rem; font-weight:700; color:#fca5a5;">R$ ${m.materialsTotal.toFixed(2)}</span>
                            </div>
                            <div style="display:flex; flex-direction:column; align-items:flex-end;">
                                <span style="font-size:0.7rem; text-transform:uppercase; letter-spacing:0.5px; color:rgba(255,255,255,0.55); font-weight:600;">Descontos</span>
                                <span style="font-size:0.95rem; font-weight:700; color:#fdba74;">− R$ ${m.salesDiscount.toFixed(2)}</span>
                            </div>
                            <div style="display:flex; flex-direction:column; align-items:flex-end;">
                                <span style="font-size:0.7rem; text-transform:uppercase; letter-spacing:0.5px; color:rgba(255,255,255,0.55); font-weight:600;">Fechamento</span>
                                <span style="font-size:0.95rem; font-weight:700; color:#86efac;">R$ ${m.salesTotal.toFixed(2)}</span>
                            </div>
                            <div style="display:flex; flex-direction:column; align-items:flex-end; border-left:1.5px solid rgba(255,255,255,0.18); padding-left:1.25rem;">
                                <span style="font-size:0.7rem; text-transform:uppercase; letter-spacing:0.5px; color:rgba(255,255,255,0.75); font-weight:700;">Saldo em Caixa</span>
                                <span style="font-size:1.15rem; font-weight:900; color:${saldo >= 0 ? '#4ade80' : '#f87171'};">
                                    R$ ${saldo.toFixed(2)}
                                </span>
                            </div>
                        </div>

                    </div>
                    <div style="padding:1.25rem 1rem 1rem; background:linear-gradient(180deg,#f8f9ff,#ffffff); display:${isOpen ? 'block' : 'none'};">
                        ${monthCards}
                        ${salesTable}
                        ${discountTable}
                        ${reservedTable}
                        ${dispTable}
                        ${matTable}
                        ${(!salesTable && !discountTable && !reservedTable && !dispTable && !matTable) ? `
                            <div style="text-align:center; padding:3rem 2rem; background:white; border-radius:14px; border:1.5px dashed #e2e8f0;">
                                <div style="font-size:2.5rem; opacity:0.2; margin-bottom:0.75rem;">📋</div>
                                <p style="color:#94a3b8; font-weight:600; margin:0;">Nenhum detalhe disponível</p>
                            </div>` : ''}
                    </div>
                </div>
                `;
            }).join('');
        }

        bindLaunchAndAdminButtons();
    };

    const bindLaunchAndAdminButtons = () => {
        // Bind WARLEN launch buttons (apenas pedidos core)
        container.querySelectorAll('.warlen-btn').forEach(btn => {
            btn.onclick = async () => {
                const isCurrentlyLaunched = btn.dataset.launched === '1';
                const newState = !isCurrentlyLaunched;
                await fetch(`/api/orders/${btn.dataset.id}/launch-warlen`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ launched: newState })
                });
                loadFinancial();
            };
        });

        // Bind EMANUEL launch buttons (todos os pedidos)
        container.querySelectorAll('.emanuel-btn').forEach(btn => {
            btn.onclick = async () => {
                const isCurrentlyLaunched = btn.dataset.launched === '1';
                const newState = !isCurrentlyLaunched;
                await fetch(`/api/orders/${btn.dataset.id}/launch-emanuel`, {
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

        // ── Bind editar pedido buttons ────────────────────────────────────
        container.querySelectorAll('.fin-edit-btn').forEach(btn => {
            btn.onclick = () => {
                const id          = btn.dataset.id;
                const products    = btn.dataset.products || '';
                const value       = btn.dataset.value || '0';
                const discount    = btn.dataset.discount || '0';
                const payment     = btn.dataset.payment || '';
                const description = btn.dataset.description || '';

                // Remove modal anterior se existir
                document.getElementById('fin-edit-modal')?.remove();

                const paymentOptions = ['Pix','Cartão','Dinheiro','Boleto','CORE','A Receber','Fidelidade','Crédito','Outro'];
                const optionsHtml = paymentOptions.map(p =>
                    `<option value="${p}" ${p === payment ? 'selected' : ''}>${p}</option>`
                ).join('');

                const modal = document.createElement('div');
                modal.id = 'fin-edit-modal';
                modal.style.cssText = `
                    position:fixed; inset:0; background:rgba(15,23,42,0.7); z-index:9999;
                    display:flex; align-items:center; justify-content:center;
                    backdrop-filter:blur(4px); animation:fadeIn 0.2s ease;
                `;
                modal.innerHTML = `
                    <div style="
                        background:white; border-radius:16px; padding:2rem; width:95%; max-width:520px;
                        box-shadow:0 25px 60px rgba(0,0,0,0.3); animation:slideUp 0.25s ease;
                        border-top:4px solid #7c3aed;
                    ">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
                            <div>
                                <h3 style="margin:0; font-size:1.2rem; font-weight:800; color:#1e293b;">✏️ Editar Pedido <span style="color:#7c3aed;">#${id}</span></h3>
                                <p style="margin:0.25rem 0 0; font-size:0.85rem; color:#64748b;">Corrija os dados sem precisar relançar o pedido</p>
                            </div>
                            <button id="fin-edit-close" style="background:none; border:none; font-size:1.5rem; cursor:pointer; color:#94a3b8; line-height:1;">✕</button>
                        </div>

                        <div style="display:flex; flex-direction:column; gap:1rem;">
                            <div>
                                <label style="display:block; font-size:0.82rem; font-weight:700; color:#374151; margin-bottom:0.3rem; text-transform:uppercase; letter-spacing:0.04em;">Produto / Serviço</label>
                                <textarea id="fin-edit-products" rows="2" style="width:100%; padding:0.6rem 0.75rem; border:1.5px solid #e2e8f0; border-radius:8px; font-size:0.95rem; resize:vertical; font-family:inherit; box-sizing:border-box; transition:border 0.2s;" onfocus="this.style.border='1.5px solid #7c3aed'" onblur="this.style.border='1.5px solid #e2e8f0'">${products}</textarea>
                            </div>
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
                                <div>
                                    <label style="display:block; font-size:0.82rem; font-weight:700; color:#374151; margin-bottom:0.3rem; text-transform:uppercase; letter-spacing:0.04em;">Valor Total (R$)</label>
                                    <input type="number" id="fin-edit-value" step="0.01" min="0" value="${value}"
                                        style="width:100%; padding:0.6rem 0.75rem; border:1.5px solid #e2e8f0; border-radius:8px; font-size:0.95rem; box-sizing:border-box; transition:border 0.2s;"
                                        onfocus="this.style.border='1.5px solid #7c3aed'" onblur="this.style.border='1.5px solid #e2e8f0'">
                                </div>
                                <div>
                                    <label style="display:block; font-size:0.82rem; font-weight:700; color:#374151; margin-bottom:0.3rem; text-transform:uppercase; letter-spacing:0.04em;">Desconto (R$)</label>
                                    <input type="number" id="fin-edit-discount" step="0.01" min="0" value="${discount}"
                                        style="width:100%; padding:0.6rem 0.75rem; border:1.5px solid #e2e8f0; border-radius:8px; font-size:0.95rem; box-sizing:border-box; transition:border 0.2s;"
                                        onfocus="this.style.border='1.5px solid #7c3aed'" onblur="this.style.border='1.5px solid #e2e8f0'">
                                </div>
                            </div>
                            <div>
                                <label style="display:block; font-size:0.82rem; font-weight:700; color:#374151; margin-bottom:0.3rem; text-transform:uppercase; letter-spacing:0.04em;">Forma de Pagamento</label>
                                <select id="fin-edit-payment" style="width:100%; padding:0.6rem 0.75rem; border:1.5px solid #e2e8f0; border-radius:8px; font-size:0.95rem; box-sizing:border-box; transition:border 0.2s;" onfocus="this.style.border='1.5px solid #7c3aed'" onblur="this.style.border='1.5px solid #e2e8f0'">
                                    ${optionsHtml}
                                    <option value="${payment}" ${!paymentOptions.includes(payment) && payment ? 'selected' : ''} style="display:${!paymentOptions.includes(payment) && payment ? 'block' : 'none'}">${payment}</option>
                                </select>
                            </div>
                            <div>
                                <label style="display:block; font-size:0.82rem; font-weight:700; color:#374151; margin-bottom:0.3rem; text-transform:uppercase; letter-spacing:0.04em;">Descrição / Observação</label>
                                <input type="text" id="fin-edit-description" value="${description}"
                                    style="width:100%; padding:0.6rem 0.75rem; border:1.5px solid #e2e8f0; border-radius:8px; font-size:0.95rem; box-sizing:border-box; transition:border 0.2s;"
                                    onfocus="this.style.border='1.5px solid #7c3aed'" onblur="this.style.border='1.5px solid #e2e8f0'">
                            </div>
                        </div>

                        <div style="display:flex; gap:0.75rem; margin-top:1.5rem; justify-content:flex-end;">
                            <button id="fin-edit-cancel" style="padding:0.6rem 1.2rem; border:1.5px solid #e2e8f0; border-radius:8px; background:white; color:#64748b; font-weight:600; cursor:pointer; font-size:0.95rem;">Cancelar</button>
                            <button id="fin-edit-save" style="padding:0.6rem 1.5rem; border:none; border-radius:8px; background:linear-gradient(135deg,#7c3aed,#6d28d9); color:white; font-weight:700; cursor:pointer; font-size:0.95rem; box-shadow:0 4px 12px rgba(124,58,237,0.35);">
                                💾 Salvar Alterações
                            </button>
                        </div>
                    </div>
                `;

                document.body.appendChild(modal);

                const close = () => modal.remove();
                document.getElementById('fin-edit-close').onclick = close;
                document.getElementById('fin-edit-cancel').onclick = close;
                modal.addEventListener('click', e => { if (e.target === modal) close(); });

                document.getElementById('fin-edit-save').onclick = async () => {
                    const saveBtn = document.getElementById('fin-edit-save');
                    saveBtn.disabled = true;
                    saveBtn.textContent = 'Salvando...';

                    const body = {
                        products_summary: document.getElementById('fin-edit-products').value.trim(),
                        total_value:      parseFloat(document.getElementById('fin-edit-value').value) || 0,
                        discount_value:   parseFloat(document.getElementById('fin-edit-discount').value) || 0,
                        payment_method:   document.getElementById('fin-edit-payment').value,
                        description:      document.getElementById('fin-edit-description').value.trim(),
                    };

                    const res = await fetch(`/api/orders/${id}/financial-edit`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body)
                    });

                    if (res.ok) {
                        close();
                        loadFinancial();
                    } else {
                        const err = await res.json().catch(() => ({}));
                        alert('Erro ao salvar: ' + (err.error || 'Falha desconhecida'));
                        saveBtn.disabled = false;
                        saveBtn.textContent = '💾 Salvar Alterações';
                    }
                };
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
