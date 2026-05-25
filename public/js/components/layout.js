export const render = (user, onLogout, onNavigate) => {
    const container = document.createElement('div');
    container.className = 'layout';

    // Apply role-based theme
    const isArena = user.username === 'cliente_arena' || (user.name && user.name.toLowerCase().includes('arena')) || user.client_id === 7;

    if (isArena) {
        document.documentElement.style.setProperty('--sidebar-bg', '#ea580c');
        document.documentElement.style.setProperty('--primary', '#f97316');
        document.documentElement.style.setProperty('--primary-hover', '#fb923c');
        document.documentElement.style.setProperty('--bg-color', '#fff7ed');
        document.documentElement.style.setProperty('--border', 'rgba(234,88,12,0.2)');
    } else if (user.role === 'producao') {
        document.documentElement.style.setProperty('--sidebar-bg', '#1e3a5f');
        document.documentElement.style.setProperty('--primary', '#3b82f6');
        document.documentElement.style.setProperty('--primary-hover', '#2563eb');
        document.documentElement.style.setProperty('--bg-color', '#f0f4f8');
        document.documentElement.style.setProperty('--border', '#c7d8e8');
    } else if (user.role === 'vendedor') {
        document.documentElement.style.setProperty('--sidebar-bg', '#7c3aed');
        document.documentElement.style.setProperty('--primary', '#a78bfa');
        document.documentElement.style.setProperty('--primary-hover', '#8b5cf6');
        document.documentElement.style.setProperty('--bg-color', '#faf5ff');
        document.documentElement.style.setProperty('--border', '#ddd6fe');
    } else if (user.role === 'cliente') {
        document.documentElement.style.setProperty('--sidebar-bg', '#065f46');
        document.documentElement.style.setProperty('--primary', '#10b981');
        document.documentElement.style.setProperty('--primary-hover', '#059669');
        document.documentElement.style.setProperty('--bg-color', '#f0fdf4');
        document.documentElement.style.setProperty('--border', '#a7f3d0');
    } else if (user.username === 'gerente') {
        document.documentElement.style.setProperty('--sidebar-bg', '#4a044e');
        document.documentElement.style.setProperty('--primary', '#d946ef');
        document.documentElement.style.setProperty('--primary-hover', '#c026d3');
        document.documentElement.style.setProperty('--bg-color', '#fdf4ff');
        document.documentElement.style.setProperty('--border', '#f5d0fe');
    } else {
        document.documentElement.style.setProperty('--sidebar-bg', '#2e1065');
        document.documentElement.style.setProperty('--primary', '#7c3aed');
        document.documentElement.style.setProperty('--primary-hover', '#6d28d9');
        document.documentElement.style.setProperty('--bg-color', '#f5f3ff');
        document.documentElement.style.setProperty('--border', '#e0d4f5');
    }

    // Determine Menu Items based on Role
    const canSeeFinance = ['master', 'financeiro'].includes(user.role);

    // Inline SVG icons — no external dependency, always visible
    const icons = {        kanban: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>`,
        clients: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path stroke-linecap="round" stroke-linejoin="round" d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>`,
        products: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
        catalogue: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path stroke-linecap="round" stroke-linejoin="round" d="M14 17.5h7M17.5 14v7"/></svg>`,
        estoque: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
        compras: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path stroke-linecap="round" stroke-linejoin="round" d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>`,
        financial: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><line x1="12" y1="1" x2="12" y2="23"/><path stroke-linecap="round" stroke-linejoin="round" d="M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6"/></svg>`,
        demand: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
        fornecedores: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><rect x="1" y="3" width="15" height="13" rx="1"/><path stroke-linecap="round" stroke-linejoin="round" d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
        admin: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path stroke-linecap="round" stroke-linejoin="round" d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>`,
        reminders: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>`,
        logout: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>`,
        cash: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><line x1="12" y1="1" x2="12" y2="23"/><path stroke-linecap="round" stroke-linejoin="round" d="M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6"/></svg>`,
        star: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
        budget: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>`,
    };


    let menuItems = '';

    if (user.role === 'cliente') {
        if (user.loyalty_status) {
            // Loyalty clients: CONTA FIDELIDADE + PONTUAÇÃO
            menuItems = `
                <li class="nav-item">
                    <a class="nav-link active" id="nav-client_loyalty" data-view="client_loyalty" title="CONTA FIDELIDADE">
                        ${icons.star} <span class="nav-text" translate="no">CONTA FIDELIDADE</span>
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" id="nav-client_points" data-view="client_points" title="PONTUAÇÃO">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><ellipse cx="12" cy="8" rx="8" ry="3"/><path stroke-linecap="round" stroke-linejoin="round" d="M4 8v4c0 1.66 3.58 3 8 3s8-1.34 8-3V8"/><path stroke-linecap="round" stroke-linejoin="round" d="M4 12v4c0 1.66 3.58 3 8 3s8-1.34 8-3v-4"/></svg>
                        <span class="nav-text" translate="no">PONTUAÇÃO</span>
                    </a>
                </li>
            `;
        } else {
            // Regular clients: only show MEU FINANCEIRO
            menuItems = `
                <li class="nav-item">
                    <a class="nav-link active" id="nav-client_financial" data-view="client_financial" title="MEU FINANCEIRO">
                        ${icons.cash} <span class="nav-text" translate="no">MEU FINANCEIRO</span>
                    </a>
                </li>
            `;
        }
    } else if (user.role === 'producao') {
        menuItems = `
            <li class="nav-item">
                <a class="nav-link active" id="nav-kanban" data-view="kanban" title="QUADRO">
                    ${icons.kanban} <span class="nav-text" translate="no">QUADRO</span>
                </a>
            </li>
            <li class="nav-item">
                <a class="nav-link" id="nav-clients" data-view="clients" title="CLIENTES">
                    ${icons.clients} <span class="nav-text" translate="no">CLIENTES</span>
                </a>
            </li>
            <li class="nav-item">
                <a class="nav-link" id="nav-products" data-view="products" title="PRODUTOS">
                    ${icons.products} <span class="nav-text" translate="no">PRODUTOS</span>
                </a>
            </li>
            <li class="nav-item">
                <a class="nav-link" id="nav-catalogue" data-view="catalogue" title="CATÁLOGO">
                    ${icons.catalogue} <span class="nav-text" translate="no">CATÁLOGO</span>
                </a>
            </li>
            <li class="nav-item">
                <a class="nav-link" id="nav-reminders" data-view="reminders" title="LEMBRETES" style="position:relative;">
                    ${icons.reminders} <span class="nav-text" translate="no">LEMBRETES</span>
                    <span id="reminders-alert-badge" style="display:none; position:absolute; top:10px; right:10px; background:#ef4444; color:white; font-size:10px; font-weight:bold; padding:2px 6px; border-radius:10px; box-shadow:0 0 8px rgba(239,68,68,0.8);"></span>
                </a>
            </li>
            <li class="nav-item">
                <a class="nav-link" id="nav-budget" data-view="budget" title="ORÇAMENTOS">
                    ${icons.budget} <span class="nav-text" translate="no">ORÇAMENTOS</span>
                </a>
            </li>
        `;
    } else {
        menuItems = `
            <li class="nav-item">
                <a class="nav-link active" id="nav-kanban" data-view="kanban" title="QUADRO">
                    ${icons.kanban} <span class="nav-text" translate="no">QUADRO</span>
                </a>
            </li>
            <li class="nav-item">
                <a class="nav-link" id="nav-clients" data-view="clients" title="CLIENTES">
                    ${icons.clients} <span class="nav-text" translate="no">CLIENTES</span>
                </a>
            </li>
            <li class="nav-item">
                <a class="nav-link" id="nav-products" data-view="products" title="PRODUTOS">
                    ${icons.products} <span class="nav-text" translate="no">PRODUTOS</span>
                </a>
            </li>
            <li class="nav-item">
                <a class="nav-link" id="nav-catalogue" data-view="catalogue" title="CATÁLOGO">
                    ${icons.catalogue} <span class="nav-text" translate="no">CATÁLOGO</span>
                </a>
            </li>
            <li class="nav-item">
                <a class="nav-link" id="nav-reminders" data-view="reminders" title="LEMBRETES" style="position:relative;">
                    ${icons.reminders} <span class="nav-text" translate="no">LEMBRETES</span>
                    <span id="reminders-alert-badge" style="display:none; position:absolute; top:10px; right:10px; background:#ef4444; color:white; font-size:10px; font-weight:bold; padding:2px 6px; border-radius:10px; box-shadow:0 0 8px rgba(239,68,68,0.8);"></span>
                </a>
            </li>
            <li class="nav-item">
                <a class="nav-link" id="nav-budget" data-view="budget" title="ORÇAMENTOS">
                    ${icons.budget} <span class="nav-text" translate="no">ORÇAMENTOS</span>
                </a>
            </li>
        `;
    }

    const canSeeStock = ['master', 'producao'].includes(user.role);

    if (canSeeStock) {
        menuItems += `
        <li class="nav-item">
            <a class="nav-link" id="nav-estoque" data-view="estoque" title="ESTOQUE" style="position:relative;">
                ${icons.estoque} <span class="nav-text" translate="no">ESTOQUE</span>
                <span id="stock-alert-badge" style="display:none; position:absolute; top:10px; right:10px; background:#ef4444; color:white; font-size:10px; font-weight:bold; padding:2px 6px; border-radius:10px; box-shadow:0 0 8px rgba(239, 68, 68, 0.8);"></span>
            </a>
        </li>
        <li class="nav-item">
            <a class="nav-link" id="nav-compras" data-view="compras" title="COMPRAS">
                ${icons.compras} <span class="nav-text" translate="no">COMPRAS</span>
            </a>
        </li>
        `;
    }

    if (canSeeFinance) {
        menuItems += `
        <li class="nav-item">
            <a class="nav-link" id="nav-financial" data-view="financial" title="FINANCEIRO">
                ${icons.financial} <span class="nav-text" translate="no">FINANCEIRO</span>
            </a>
        </li>
        <li class="nav-item">
            <a class="nav-link" id="nav-demand" data-view="demand" title="DEMANDA DE PRODUTOS">
                ${icons.demand} <span class="nav-text" translate="no">DEMANDA</span>
            </a>
        </li>
        `;
    }

    if (user.role === 'master') {
        menuItems += `
        <li class="nav-item">
            <a class="nav-link" id="nav-fornecedores" data-view="fornecedores" title="FORNECEDORES">
                ${icons.fornecedores} <span class="nav-text" translate="no">FORNECEDORES</span>
            </a>
        </li>
        <li class="nav-item">
            <a class="nav-link" id="nav-admin" data-view="admin" title="ADMIN">
                ${icons.admin} <span class="nav-text" translate="no">ADMIN</span>
            </a>
        </li>
        `;
    }

    container.innerHTML = `
        <div class="sidebar" id="sidebar">
            <div class="sidebar-header" style="display:flex; flex-direction:column; align-items:center; margin-bottom:1.5rem; padding-bottom:1rem; border-bottom:1px solid rgba(255,255,255,0.1);">
                <div style="display:flex; align-items:center; justify-content:center; width:100%;">
                    <img src="/logo.png?v=2" alt="Logo" style="width:32px; height:32px; border-radius:6px; object-fit:contain; flex-shrink:0;">
                    <span class="header-logo-text" translate="no">LM | PASSO</span>
                </div>
                <div class="sidebar-clock" id="sidebar-clock">
                    <div class="clock-date-top" id="clock-date-top">--/--</div>
                    <div class="clock-time" id="clock-time">
                        <span id="clock-h">--</span><span class="clock-sep">:</span><span id="clock-m">--</span>
                    </div>
                    <div class="clock-day" id="clock-day">------</div>
                </div>
            </div>
            <ul class="nav-links">
                ${menuItems}
            </ul>
            <div class="user-info" style="margin-top:auto;">
                <div class="nav-text" style="margin-bottom:0.5rem; font-size:0.72rem; color:#94a3b8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Olá, ${user.name}</div>
                <a class="nav-link" id="logout-btn" title="Sair" style="color:#ef4444; height: 42px; padding: 0.5rem 1.15rem;">
                    ${icons.logout} <span class="nav-text" translate="no">Sair</span>
                </a>
            </div>
        </div>
        <div class="main-content" id="content-area"></div>
    `;

    // Navigation Events
    container.querySelectorAll('[data-view]').forEach(link => {
        link.addEventListener('click', (e) => {
            // e.preventDefault();
            const view = link.getAttribute('data-view');
            onNavigate(view);
        });
    });

    container.querySelector('#logout-btn').addEventListener('click', onLogout);

    // ── Live Clock ─────────────────────────────────────────────────────────────────
    const DAYS_PT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
    const MONTHS_PT = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
    const updateClock = () => {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        const day = now.getDate();
        const mon = MONTHS_PT[now.getMonth()];
        const wday = DAYS_PT[now.getDay()];

        const hEl    = container.querySelector('#clock-h');
        const mEl    = container.querySelector('#clock-m');
        const dateTop = container.querySelector('#clock-date-top');
        const dayEl  = container.querySelector('#clock-day');

        if (hEl)     hEl.textContent = h;
        if (mEl)     mEl.textContent = m;
        if (dateTop) dateTop.textContent = `${mon}.${String(day).padStart(2,'0')}`;
        if (dayEl)   dayEl.textContent = wday;
    };
    updateClock();
    setInterval(updateClock, 1000);

    // Sidebar Toggle Logic removed (now handled by CSS hover)

    // Check low stock and alert visually
    if (canSeeStock) {
        setTimeout(async () => {
            try {
                const res = await fetch('/api/stock');
                const { data } = await res.json();
                const isKit = (p) => (p.name || '').toUpperCase().includes('KIT');
                const filtered = data.filter(p => !isKit(p));
                
                let lowCount = 0;
                filtered.forEach(p => {
                    if (p.stock_status === 'baixo' || p.stock_status === 'zerado') lowCount++;
                });

                if (lowCount > 0) {
                    const badge = container.querySelector('#stock-alert-badge');
                    if (badge) {
                        badge.style.display = 'inline-block';
                        badge.textContent = lowCount > 99 ? '+99' : lowCount;
                    }
                }
            } catch (err) {
                console.error('Stock alert check failed:', err);
            }
        }, 800);
    }


    // Check pending reminders and show badge
    if (user.role !== 'cliente') {
        // Função reutilizável para atualizar o badge da sidebar
        const applyReminderBadge = (count) => {
            const badge = container.querySelector('#reminders-alert-badge');
            if (!badge) return;
            if (count > 0) {
                badge.style.display = 'inline-block';
                badge.textContent = count > 99 ? '+99' : count;
            } else {
                badge.style.display = 'none';
                badge.textContent = '';
            }
        };

        // Carga inicial ao abrir o app
        setTimeout(async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch('/api/reminders/pending-count', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const { count } = await res.json();
                applyReminderBadge(count);
            } catch (err) {
                console.error('Reminders badge check failed:', err);
            }
        }, 1000);

        // Atualização em tempo real: ouve evento disparado pelo reminders.js
        window.addEventListener('reminders:updated', (e) => {
            applyReminderBadge(e.detail.count);
        });
    }

    // Initialize Global Team Chat
    import('./chatWidget.js?v=' + Date.now()).then(module => {
        module.initChatWidget(user, container);
    }).catch(err => console.error('Failed to load chat widget:', err));

    return container;
};
// trigger rebuild
