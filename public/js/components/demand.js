export const render = () => {
    const container = document.createElement('div');

    const MONTH_NAMES = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    container.innerHTML = `
        <!-- Header -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 2rem;">
            <div style="display:flex; flex-direction:column; gap:0.2rem;">
                <h2 style="font-size: 1.8rem; font-weight: 900; background: linear-gradient(135deg, var(--primary), #4c1d95); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin:0; letter-spacing: -0.03em;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="vertical-align:middle; margin-right:0.2rem; color:var(--primary);"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                    Demanda de Produtos
                </h2>
                <p style="color: #64748b; margin: 0; font-size: 0.95rem; font-weight:500; white-space: nowrap;">Análise de giro e popularidade dos itens vendidos.</p>
            </div>
        </div>
        <div style="max-width:960px;">

            <!-- Tab buttons -->
            <div style="display:flex; gap:0.5rem; margin-bottom:1.75rem; background:#f1f5f9; padding:0.35rem; border-radius:12px; width:fit-content;">
                <button class="dmd-tab active" data-tab="monthly"
                    style="padding:0.55rem 1.4rem; border-radius:9px; border:none; background:var(--primary); color:white; font-weight:700; font-size:0.87rem; cursor:pointer; transition:all 0.2s;">
                    📅 Mensal
                </button>
                <button class="dmd-tab" data-tab="quarterly"
                    style="padding:0.55rem 1.4rem; border-radius:9px; border:none; background:transparent; color:#64748b; font-weight:700; font-size:0.87rem; cursor:pointer; transition:all 0.2s;">
                    📊 Trimestral
                </button>
                <button class="dmd-tab" data-tab="annual"
                    style="padding:0.55rem 1.4rem; border-radius:9px; border:none; background:transparent; color:#64748b; font-weight:700; font-size:0.87rem; cursor:pointer; transition:all 0.2s;">
                    🗓️ Anual
                </button>
            </div>

            <!-- Content area -->
            <div id="dmd-content">
                <div style="text-align:center; padding:4rem; color:#94a3b8; font-size:0.95rem;">
                    <div style="font-size:2rem; margin-bottom:0.75rem;">⏳</div>
                    Carregando dados...
                </div>
            </div>
        </div>
    `;

    let demandData = null;
    let activeTab = 'monthly';
    let activeMonthIndex = new Date().getMonth(); // 0-indexed, current month

    // ───────────────────────── Helpers ─────────────────────────

    const esc = s => String(s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const fmtPeriod = (period) => {
        if (!period) return '';
        const parts = period.split('—').map(p => p.trim());
        if (parts.length < 2) return period;
        const fmt = d => {
            const dt = window.parseDBDate(d + 'T12:00:00');
            return dt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: 'short', year: 'numeric' });
        };
        return `${fmt(parts[0])} — ${fmt(parts[1])}`;
    };

    const buildRankRows = (items, isTop, limit = 5) => {
        if (!items || items.length === 0) return '';
        const maxQty = items[0].total_qty || 1;
        const accent = isTop ? '#7c3aed' : '#e11d48';
        const barGrad = isTop
            ? 'linear-gradient(90deg, #7c3aed, #a78bfa)'
            : 'linear-gradient(90deg, #e11d48, #fb7185)';

        return items.slice(0, limit).map((item, i) => {
            const pct = Math.round((item.total_qty / maxQty) * 100);
            const name = esc(item.product_name);
            return `
            <div style="display:flex; align-items:center; gap:0.75rem; padding:0.7rem 0; border-bottom:1px solid #f1f5f9;">
                <span style="font-size:0.78rem; font-weight:800; color:#94a3b8; min-width:22px; text-align:right;">#${i + 1}</span>
                <span style="flex:1.2; font-size:0.88rem; font-weight:600; color:#334155; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${name}">${name}</span>
                <div style="flex:2; height:9px; background:#e2e8f0; border-radius:999px; overflow:hidden;">
                    <div class="dmd-bar" style="height:100%; width:0%; background:${barGrad}; border-radius:999px; transition:width 0.75s cubic-bezier(0.4,0,0.2,1);" data-pct="${pct}"></div>
                </div>
                <span style="font-size:0.85rem; font-weight:800; color:${accent}; min-width:36px; text-align:right;">${item.total_qty}</span>
            </div>`;
        }).join('');
    };

    const buildCard = (title, icon, items, isTop, limit = 5) => {
        if (!items || items.length === 0) return '';
        const accent = isTop ? '#7c3aed' : '#e11d48';
        return `
        <div style="background:white; border-radius:14px; border:1px solid #e2e8f0; padding:1.4rem 1.6rem; margin-bottom:1.25rem; box-shadow:0 2px 8px rgba(0,0,0,0.05);">
            <div style="font-size:0.75rem; font-weight:800; text-transform:uppercase; letter-spacing:0.09em; color:${accent}; margin-bottom:1rem;">${icon} ${title}</div>
            ${buildRankRows(items, isTop, limit)}
        </div>`;
    };

    const animateBars = () => {
        requestAnimationFrame(() => {
            container.querySelectorAll('.dmd-bar').forEach(bar => {
                bar.style.width = bar.dataset.pct + '%';
            });
        });
    };

    // ───────────────────────── Empty state ─────────────────────────

    const emptyState = (msg = 'Nenhum dado encontrado para este período.') =>
        `<div style="text-align:center; padding:3rem; color:#94a3b8; font-size:0.95rem;">
            <div style="font-size:2.5rem; margin-bottom:0.75rem;">📭</div>
            ${msg}
        </div>`;

    // ───────────────────────── Monthly view ─────────────────────────

    const renderMonthly = () => {
        const el = container.querySelector('#dmd-content');
        if (!demandData || !demandData.months) { el.innerHTML = emptyState(); return; }

        const months = demandData.months; // array[12]
        const current = months[activeMonthIndex];

        const hasData = current && (current.top.length > 0 || current.bottom.length > 0);

        // Month nav pills
        const pillsHtml = months.map((m, i) => {
            const hasAny = m.top.length > 0 || m.bottom.length > 0;
            const isActive = i === activeMonthIndex;
            const bg = isActive ? 'var(--primary)' : (hasAny ? '#e0e7ff' : '#f1f5f9');
            const color = isActive ? 'white' : (hasAny ? '#3730a3' : '#94a3b8');
            return `<button class="dmd-month-pill" data-midx="${i}"
                style="padding:0.35rem 0.85rem; border-radius:999px; border:none; background:${bg}; color:${color}; font-size:0.8rem; font-weight:700; cursor:pointer; transition:all 0.18s; white-space:nowrap; position:relative;"
                title="${m.label}">
                ${m.label.slice(0, 3).toUpperCase()}
                ${hasAny && !isActive ? `<span style="position:absolute; top:2px; right:4px; width:5px; height:5px; border-radius:50%; background:#7c3aed;"></span>` : ''}
            </button>`;
        }).join('');

        let contentHtml = '';
        if (hasData) {
            contentHtml = buildCard('Mais Vendidos', '▲', current.top, true) +
                          buildCard('Menos Vendidos', '▼', current.bottom, false);
        } else {
            contentHtml = emptyState('Sem pedidos finalizados neste mês.');
        }

        el.innerHTML = `
            <!-- Month pills navigation -->
            <div style="margin-bottom:1.5rem;">
                <div style="display:flex; flex-wrap:wrap; gap:0.45rem; padding:1rem 1.25rem; background:white; border-radius:14px; border:1px solid #e2e8f0; box-shadow:0 1px 4px rgba(0,0,0,0.04);">
                    ${pillsHtml}
                </div>
            </div>

            <!-- Month header -->
            <div style="display:flex; align-items:center; gap:1rem; margin-bottom:1.25rem;">
                <button id="dmd-prev-month" style="width:32px; height:32px; border-radius:50%; border:2px solid #e2e8f0; background:white; cursor:pointer; font-size:1rem; display:flex; align-items:center; justify-content:center; transition:all 0.15s;">◀</button>
                <div style="flex:1; text-align:center;">
                    <div style="font-size:1.35rem; font-weight:800; color:#1e293b;">${current ? current.label : '—'}</div>
                    <div style="font-size:0.78rem; color:#94a3b8; margin-top:0.15rem;">${current ? fmtPeriod(current.period) : ''}</div>
                    ${current && current.total_qty > 0 ? `
                    <div style="display:inline-flex; gap:1.25rem; margin-top:0.5rem; background:#f8fafc; border-radius:8px; padding:0.4rem 1rem;">
                        <span style="font-size:0.8rem; color:#64748b;">📦 <b style="color:#334155;">${current.total_qty}</b> unidades</span>
                        <span style="font-size:0.8rem; color:#64748b;">📋 <b style="color:#334155;">${current.total_orders}</b> pedidos</span>
                    </div>` : ''}
                </div>
                <button id="dmd-next-month" style="width:32px; height:32px; border-radius:50%; border:2px solid #e2e8f0; background:white; cursor:pointer; font-size:1rem; display:flex; align-items:center; justify-content:center; transition:all 0.15s;">▶</button>
            </div>

            <!-- Cards -->
            ${contentHtml}
        `;

        animateBars();

        // Pill click
        el.querySelectorAll('.dmd-month-pill').forEach(btn => {
            btn.addEventListener('click', () => {
                activeMonthIndex = parseInt(btn.dataset.midx);
                renderMonthly();
            });
        });

        // Prev/next
        const prevBtn = el.querySelector('#dmd-prev-month');
        const nextBtn = el.querySelector('#dmd-next-month');
        if (prevBtn) prevBtn.addEventListener('click', () => {
            if (activeMonthIndex > 0) { activeMonthIndex--; renderMonthly(); }
        });
        if (nextBtn) nextBtn.addEventListener('click', () => {
            if (activeMonthIndex < 11) { activeMonthIndex++; renderMonthly(); }
        });
    };

    // ───────────────────────── Quarterly view ─────────────────────────

    const renderQuarterly = () => {
        const el = container.querySelector('#dmd-content');
        if (!demandData || !demandData.quarters) { el.innerHTML = emptyState(); return; }

        const quarters = demandData.quarters;
        const qColors = [
            { accent: '#0891b2', bar: 'linear-gradient(90deg,#0891b2,#67e8f9)' },
            { accent: '#7c3aed', bar: 'linear-gradient(90deg,#7c3aed,#c4b5fd)' },
            { accent: '#059669', bar: 'linear-gradient(90deg,#059669,#6ee7b7)' },
            { accent: '#d97706', bar: 'linear-gradient(90deg,#d97706,#fcd34d)' }
        ];

        const qCards = quarters.map((q, qi) => {
            const c = qColors[qi];
            const hasData = q.top.length > 0;

            const topRows = hasData ? q.top.slice(0, 5).map((item, i) => {
                const pct = Math.round((item.total_qty / (q.top[0].total_qty || 1)) * 100);
                return `
                <div style="display:flex; align-items:center; gap:0.65rem; padding:0.55rem 0; border-bottom:1px solid #f1f5f9;">
                    <span style="font-size:0.75rem; font-weight:800; color:#94a3b8; min-width:20px; text-align:right;">#${i+1}</span>
                    <span style="flex:1.4; font-size:0.85rem; font-weight:600; color:#334155; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${esc(item.product_name)}">${esc(item.product_name)}</span>
                    <div style="flex:2; height:8px; background:#e2e8f0; border-radius:999px; overflow:hidden;">
                        <div class="dmd-bar" style="height:100%; width:0%; background:${c.bar}; border-radius:999px; transition:width 0.75s cubic-bezier(0.4,0,0.2,1);" data-pct="${pct}"></div>
                    </div>
                    <span style="font-size:0.82rem; font-weight:800; color:${c.accent}; min-width:32px; text-align:right;">${item.total_qty}</span>
                </div>`;
            }).join('') : '';

            const bottomRows = q.bottom.length > 0 ? q.bottom.slice(0, 3).map((item, i) => {
                const pct = Math.round((item.total_qty / (q.bottom[0].total_qty || 1)) * 100);
                return `
                <div style="display:flex; align-items:center; gap:0.65rem; padding:0.5rem 0; border-bottom:1px solid #fef2f2;">
                    <span style="font-size:0.75rem; font-weight:800; color:#fca5a5; min-width:20px; text-align:right;">${i+1}</span>
                    <span style="flex:1.4; font-size:0.82rem; font-weight:600; color:#475569; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${esc(item.product_name)}">${esc(item.product_name)}</span>
                    <div style="flex:2; height:7px; background:#fee2e2; border-radius:999px; overflow:hidden;">
                        <div class="dmd-bar" style="height:100%; width:0%; background:linear-gradient(90deg,#e11d48,#fb7185); border-radius:999px; transition:width 0.75s cubic-bezier(0.4,0,0.2,1);" data-pct="${pct}"></div>
                    </div>
                    <span style="font-size:0.8rem; font-weight:800; color:#e11d48; min-width:32px; text-align:right;">${item.total_qty}</span>
                </div>`;
            }).join('') : '';

            return `
            <div style="background:white; border-radius:16px; border:2px solid ${hasData ? c.accent + '30' : '#e2e8f0'}; overflow:hidden; margin-bottom:1.25rem; box-shadow:0 2px 8px rgba(0,0,0,0.05);">
                <!-- Quarter header -->
                <div style="display:flex; align-items:center; justify-content:space-between; padding:1.1rem 1.5rem; background:${hasData ? c.accent + '08' : '#f8fafc'}; border-bottom:1px solid ${hasData ? c.accent + '20' : '#e2e8f0'};">
                    <div>
                        <div style="font-size:1rem; font-weight:800; color:${hasData ? c.accent : '#94a3b8'};">${q.label}</div>
                        <div style="font-size:0.75rem; color:#94a3b8; margin-top:0.1rem;">${fmtPeriod(q.period)}</div>
                    </div>
                    ${hasData ? `
                    <div style="display:flex; gap:1.5rem;">
                        <div style="text-align:center;">
                            <div style="font-size:1.3rem; font-weight:900; color:${c.accent};">${q.total_qty}</div>
                            <div style="font-size:0.7rem; color:#94a3b8; font-weight:600;">UNIDADES</div>
                        </div>
                        <div style="text-align:center;">
                            <div style="font-size:1.3rem; font-weight:900; color:#475569;">${q.total_orders}</div>
                            <div style="font-size:0.7rem; color:#94a3b8; font-weight:600;">PEDIDOS</div>
                        </div>
                    </div>` : `<span style="font-size:0.8rem; color:#cbd5e1; font-weight:600;">Sem dados</span>`}
                </div>

                ${hasData ? `
                <!-- Top produtos -->
                <div style="padding:1rem 1.5rem;">
                    <div style="font-size:0.7rem; font-weight:800; text-transform:uppercase; letter-spacing:0.08em; color:${c.accent}; margin-bottom:0.6rem;">▲ Mais Vendidos</div>
                    ${topRows}
                </div>

                ${q.bottom.length > 0 ? `
                <!-- Bottom produtos -->
                <div style="padding:0.75rem 1.5rem 1rem; background:#fff8f8; border-top:1px solid #fee2e2;">
                    <div style="font-size:0.7rem; font-weight:800; text-transform:uppercase; letter-spacing:0.08em; color:#e11d48; margin-bottom:0.6rem;">▼ Menos Vendidos</div>
                    ${bottomRows}
                </div>` : ''}
                ` : ''}
            </div>`;
        }).join('');

        el.innerHTML = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.25rem;">
                ${qCards}
            </div>
        `;

        animateBars();
    };

    // ───────────────────────── Annual view ─────────────────────────

    const renderAnnual = () => {
        const el = container.querySelector('#dmd-content');
        if (!demandData || !demandData.annual) { el.innerHTML = emptyState(); return; }

        const annual = demandData.annual;
        const months = demandData.months || [];
        const champion = annual.top && annual.top.length > 0 ? annual.top[0] : null;

        // Monthly sparkline data for the champion product
        const sparkData = months.map(m => {
            if (!champion) return 0;
            const found = m.top.find(t => t.product_name === champion.product_name) ||
                          m.bottom.find(t => t.product_name === champion.product_name);
            return found ? found.total_qty : 0;
        });
        const sparkMax = Math.max(...sparkData, 1);

        const sparkBars = sparkData.map((val, i) => {
            const h = Math.round((val / sparkMax) * 48);
            const hasOrders = val > 0;
            return `
            <div style="display:flex; flex-direction:column; align-items:center; gap:3px; flex:1;">
                <div style="font-size:0.6rem; color:${hasOrders ? '#7c3aed' : '#cbd5e1'}; font-weight:700;">${val || ''}</div>
                <div style="width:100%; height:${h}px; min-height:3px; background:${hasOrders ? 'linear-gradient(0deg,#7c3aed,#c4b5fd)' : '#e2e8f0'}; border-radius:3px; transition:height 0.6s;"></div>
                <div style="font-size:0.6rem; color:#94a3b8; font-weight:600;">${MONTH_NAMES[i].slice(0,3).toUpperCase()}</div>
            </div>`;
        }).join('');

        const topRows10 = annual.top.slice(0, 10).map((item, i) => {
            const pct = Math.round((item.total_qty / (annual.top[0].total_qty || 1)) * 100);
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`;
            return `
            <div style="display:flex; align-items:center; gap:0.75rem; padding:0.7rem 0; border-bottom:1px solid #f1f5f9;">
                <span style="font-size:${i < 3 ? '1.1' : '0.78'}rem; font-weight:800; color:#94a3b8; min-width:28px; text-align:center;">${medal}</span>
                <span style="flex:1.2; font-size:0.88rem; font-weight:600; color:#334155; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${esc(item.product_name)}">${esc(item.product_name)}</span>
                <div style="flex:2; height:10px; background:#e2e8f0; border-radius:999px; overflow:hidden;">
                    <div class="dmd-bar" style="height:100%; width:0%; background:linear-gradient(90deg,#7c3aed,#a78bfa); border-radius:999px; transition:width 0.75s cubic-bezier(0.4,0,0.2,1);" data-pct="${pct}"></div>
                </div>
                <span style="font-size:0.85rem; font-weight:800; color:#7c3aed; min-width:40px; text-align:right;">${item.total_qty}</span>
            </div>`;
        }).join('');

        const bottomRows10 = annual.bottom.slice(0, 10).map((item, i) => {
            const pct = Math.round((item.total_qty / (annual.bottom[0].total_qty || 1)) * 100);
            return `
            <div style="display:flex; align-items:center; gap:0.75rem; padding:0.7rem 0; border-bottom:1px solid #f1f5f9;">
                <span style="font-size:0.78rem; font-weight:800; color:#fca5a5; min-width:28px; text-align:center;">${i+1}</span>
                <span style="flex:1.2; font-size:0.88rem; font-weight:600; color:#334155; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${esc(item.product_name)}">${esc(item.product_name)}</span>
                <div style="flex:2; height:10px; background:#fee2e2; border-radius:999px; overflow:hidden;">
                    <div class="dmd-bar" style="height:100%; width:0%; background:linear-gradient(90deg,#e11d48,#fb7185); border-radius:999px; transition:width 0.75s cubic-bezier(0.4,0,0.2,1);" data-pct="${pct}"></div>
                </div>
                <span style="font-size:0.85rem; font-weight:800; color:#e11d48; min-width:40px; text-align:right;">${item.total_qty}</span>
            </div>`;
        }).join('');

        el.innerHTML = `
            <!-- Hero summary -->
            <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:1rem; margin-bottom:1.5rem;">
                <div style="background:linear-gradient(135deg,#7c3aed,#a78bfa); border-radius:14px; padding:1.25rem 1.5rem; color:white; box-shadow:0 4px 16px rgba(124,58,237,0.25);">
                    <div style="font-size:0.7rem; font-weight:800; text-transform:uppercase; letter-spacing:0.08em; opacity:0.85; margin-bottom:0.5rem;">📦 Total Unidades</div>
                    <div style="font-size:2rem; font-weight:900;">${annual.total_qty.toLocaleString('pt-BR')}</div>
                    <div style="font-size:0.75rem; opacity:0.75; margin-top:0.25rem;">em ${demandData.year}</div>
                </div>
                <div style="background:linear-gradient(135deg,#0891b2,#67e8f9); border-radius:14px; padding:1.25rem 1.5rem; color:white; box-shadow:0 4px 16px rgba(8,145,178,0.25);">
                    <div style="font-size:0.7rem; font-weight:800; text-transform:uppercase; letter-spacing:0.08em; opacity:0.85; margin-bottom:0.5rem;">📋 Total Pedidos</div>
                    <div style="font-size:2rem; font-weight:900;">${annual.total_orders.toLocaleString('pt-BR')}</div>
                    <div style="font-size:0.75rem; opacity:0.75; margin-top:0.25rem;">finalizados no ano</div>
                </div>
                <div style="background:linear-gradient(135deg,#059669,#6ee7b7); border-radius:14px; padding:1.25rem 1.5rem; color:white; box-shadow:0 4px 16px rgba(5,150,105,0.25);">
                    <div style="font-size:0.7rem; font-weight:800; text-transform:uppercase; letter-spacing:0.08em; opacity:0.85; margin-bottom:0.5rem;">🏆 Produto Campeão</div>
                    <div style="font-size:1rem; font-weight:800; line-height:1.3;">${champion ? esc(champion.product_name) : '—'}</div>
                    ${champion ? `<div style="font-size:0.75rem; opacity:0.8; margin-top:0.25rem;">${champion.total_qty} unidades vendidas</div>` : ''}
                </div>
            </div>

            ${champion && sparkData.some(v => v > 0) ? `
            <!-- Sparkline chart -->
            <div style="background:white; border-radius:14px; border:1px solid #e2e8f0; padding:1.4rem 1.6rem; margin-bottom:1.5rem; box-shadow:0 2px 8px rgba(0,0,0,0.05);">
                <div style="font-size:0.75rem; font-weight:800; text-transform:uppercase; letter-spacing:0.09em; color:#7c3aed; margin-bottom:1.25rem;">
                    📈 Evolução Mensal — ${esc(champion.product_name)}
                </div>
                <div style="display:flex; align-items:flex-end; gap:0.4rem; height:70px;">
                    ${sparkBars}
                </div>
            </div>` : ''}

            <!-- Top 10 e Bottom 10 lado a lado -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.25rem;">
                <div style="background:white; border-radius:14px; border:1px solid #e2e8f0; padding:1.4rem 1.6rem; box-shadow:0 2px 8px rgba(0,0,0,0.05);">
                    <div style="font-size:0.75rem; font-weight:800; text-transform:uppercase; letter-spacing:0.09em; color:#7c3aed; margin-bottom:1rem;">▲ Top 10 Mais Vendidos</div>
                    ${topRows10 || emptyState('Sem dados.')}
                </div>
                <div style="background:white; border-radius:14px; border:1px solid #e2e8f0; padding:1.4rem 1.6rem; box-shadow:0 2px 8px rgba(0,0,0,0.05);">
                    <div style="font-size:0.75rem; font-weight:800; text-transform:uppercase; letter-spacing:0.09em; color:#e11d48; margin-bottom:1rem;">▼ Top 10 Menos Vendidos</div>
                    ${bottomRows10 || emptyState('Sem dados.')}
                </div>
            </div>
        `;

        animateBars();
    };

    // ───────────────────────── Tab routing ─────────────────────────

    const renderContent = () => {
        if (activeTab === 'monthly') renderMonthly();
        else if (activeTab === 'quarterly') renderQuarterly();
        else if (activeTab === 'annual') renderAnnual();
    };

    // ───────────────────────── Load ─────────────────────────

    const load = async () => {
        try {
            const res = await fetch('/api/reports/product-demand');
            if (!res.ok) throw new Error('HTTP ' + res.status);
            demandData = await res.json();
            renderContent();
        } catch (e) {
            const el = container.querySelector('#dmd-content');
            if (el) el.innerHTML = `<div style="text-align:center; padding:2rem; color:#ef4444;">⚠️ Erro ao carregar: ${e.message}</div>`;
        }
    };

    // ───────────────────────── Tab click handlers ─────────────────────────

    container.querySelectorAll('.dmd-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.dmd-tab').forEach(b => {
                b.style.background = 'transparent';
                b.style.color = '#64748b';
                b.classList.remove('active');
            });
            btn.style.background = 'var(--primary)';
            btn.style.color = 'white';
            btn.classList.add('active');
            activeTab = btn.dataset.tab;
            if (demandData) renderContent();
        });
    });

    load();
    return container;
};
