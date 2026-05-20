export const render = (user) => {
    const container = document.createElement('div');
    container.className = 'reminders-page';

    // ── Priority config ─────────────────────────────────────────────────────────
    const PRIORITY = {
        urgente: { label: 'Urgente', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', icon: '🔴' },
        normal:  { label: 'Normal',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: '🟡' },
        baixo:   { label: 'Baixo',   color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: '🟢' },
    };

    // ── Role/Setor labels ──────────────────────────────────────────────────────
    const ROLE_LABELS = {
        master:     { label: 'Gestão',    color: '#7c3aed', bg: 'rgba(124,58,237,0.12)' },
        financeiro: { label: 'Financeiro', color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)' },
        producao:   { label: 'Produção',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
        vendedor:   { label: 'Vendas',     color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
        interno:    { label: 'Interno',    color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
    };

    const PRINT_TYPE_LABELS = {
        frente:         { label: 'Frente',          icon: '📄' },
        frente_e_verso: { label: 'Frente e Verso',  icon: '📋' },
        plastificado:   { label: 'Plastificado',    icon: '✨' },
    };

    const roleTag = (role) => {
        const r = ROLE_LABELS[role];
        if (!r) return '';
        return `<span class="rm-role-tag" style="background:${r.bg}; color:${r.color};">${r.label}</span>`;
    };

    // ── State ───────────────────────────────────────────────────────────────────
    let reminders = [];
    let filterStatus = 'pendente';
    let editingId = null;

    let menuOrders = [];
    let menuFilter = 'pendente'; // 'pendente' | 'lançado' | 'todos'
    let editingMenuId = null;

    let activeSection = 'lembretes'; // 'lembretes' | 'cardapios'
    let clientsList = [];

    // ── Helpers ─────────────────────────────────────────────────────────────────
    const formatDate = (iso) => {
        if (!iso) return '';
        const d = window.parseDBDate(iso);
        return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const escapeHtml = (str) => {
        const d = document.createElement('div');
        d.textContent = str || '';
        return d.innerHTML;
    };

    // ── Reminder card ────────────────────────────────────────────────────────────
    const renderCard = (r) => {
        const p = PRIORITY[r.priority] || PRIORITY.normal;
        const done = r.status === 'concluido';
        return `
        <div class="reminder-card ${done ? 'reminder-done' : ''}" data-id="${r.id}"
             draggable="true" style="--pcolor:${p.color}; --pbg:${p.bg}; cursor: move;">
            <div class="reminder-card-header">
                <div class="reminder-priority-badge" style="background:${p.bg}; color:${p.color};">
                    ${p.icon} ${p.label}
                </div>
                <div class="reminder-card-actions">
                    <button class="rm-btn rm-toggle ${done ? 'rm-undo' : 'rm-done'}" data-id="${r.id}" title="${done ? 'Reabrir' : 'Concluir'}">
                        ${done
                            ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6M3 10l6-6"/></svg>'
                            : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>'
                        }
                        ${done ? 'Reabrir' : 'Concluir'}
                    </button>
                    ${!done ? `
                    <button class="rm-btn rm-edit" data-id="${r.id}" title="Editar">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    </button>` : ''}
                    <button class="rm-btn rm-delete" data-id="${r.id}" title="Excluir">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                </div>
            </div>

            <h3 class="reminder-title ${done ? 'strikethrough' : ''}">${escapeHtml(r.title)}</h3>
            ${r.description ? `<p class="reminder-desc">${escapeHtml(r.description)}</p>` : ''}

            <div class="reminder-meta">
                <span class="rm-author-row">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                    ${escapeHtml((ROLE_LABELS[r.created_by_role] && ROLE_LABELS[r.created_by_role].label) || r.created_by_name || 'Usuário')}
                    ${roleTag(r.created_by_role)}
                </span>
                <span>${formatDate(r.created_at)}</span>
                ${done && r.concluded_at ? `<span class="rm-concluded-tag">✓ Concluído em ${formatDate(r.concluded_at)}</span>` : ''}
            </div>
        </div>`;
    };

    const PRIORITY_ORDER = { urgente: 1, normal: 2, baixo: 3 };
    const sortList = (list) =>
        [...list].sort((a, b) => {
            const posA = a.position || 0;
            const posB = b.position || 0;
            if (posA !== posB) return posA - posB;
            const pa = PRIORITY_ORDER[a.priority] || 2;
            const pb = PRIORITY_ORDER[b.priority] || 2;
            if (pa !== pb) return pa - pb;
            return window.parseDBDate(b.created_at) - window.parseDBDate(a.created_at);
        });

    const filteredReminders = () => {
        const filtered = filterStatus === 'todos'
            ? reminders
            : reminders.filter(r => r.status === filterStatus);
        return sortList(filtered);
    };

    const renderList = () => {
        const list = container.querySelector('#reminders-list');
        if (!list) return;
        const filtered = filteredReminders();
        if (filtered.length === 0) {
            list.innerHTML = `
                <div class="reminders-empty">
                    <div class="empty-icon">📋</div>
                    <p>${filterStatus === 'pendente' ? 'Nenhum lembrete pendente. Tudo em dia! 🎉' :
                         filterStatus === 'concluido' ? 'Nenhum lembrete concluído ainda.' :
                         'Sem lembretes. Adicione o primeiro acima!'}</p>
                </div>`;
            return;
        }
        list.innerHTML = filtered.map(renderCard).join('');
        bindCardEvents(list);
    };

    // ── Menu Order card ──────────────────────────────────────────────────────────
    const renderMenuCard = (m) => {
        const launched = !!m.launched_to_core;
        const pt = PRINT_TYPE_LABELS[m.print_type] || { label: m.print_type, icon: '📄' };
        return `
        <div class="menu-card ${launched ? 'menu-launched' : ''}" data-id="${m.id}" draggable="true" style="cursor: move;">
            <div class="menu-card-header">
                <div class="menu-card-badges">
                    <span class="menu-qty-badge">×${m.quantity}</span>
                    <span class="menu-print-badge">${pt.icon} ${pt.label}</span>
                    ${launched
                        ? `<span class="menu-launched-badge">✅ Lançado no CORE</span>`
                        : `<span class="menu-pending-badge">⏳ Pendente</span>`}
                </div>
                <div class="reminder-card-actions">
                    <button class="rm-btn menu-launch-btn ${launched ? 'menu-launch-undo' : 'menu-launch-do'}" data-id="${m.id}" title="${launched ? 'Desfazer lançamento' : 'Lançar no CORE'}">
                        ${launched
                            ? `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6M3 10l6-6"/></svg> Desfazer`
                            : `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg> Lançar CORE`}
                    </button>
                    ${launched ? `
                    <button class="rm-btn menu-copy-btn" data-id="${m.id}" title="Copiar Descrição do Pedido">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg> Copiar
                    </button>` : ''}
                    ${!launched ? `
                    <button class="rm-btn rm-edit menu-edit-btn" data-id="${m.id}" title="Editar">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    </button>` : ''}
                    <button class="rm-btn rm-delete menu-delete-btn" data-id="${m.id}" title="Excluir">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                </div>
            </div>

            <div class="menu-card-info">
                <div class="menu-info-row">
                    <span class="menu-info-label">🎉 Evento</span>
                    <span class="menu-info-value">${escapeHtml(m.event_name)}</span>
                </div>
                <div class="menu-info-row">
                    <span class="menu-info-label">👤 Cliente</span>
                    <span class="menu-info-value">${escapeHtml(m.client_name || m.producer_name)}</span>
                </div>
                ${(() => {
                    let grossVal = (m.product_price || 0) * m.quantity;
                    let discountVal = grossVal * ((m.core_discount ? 15 : 0) / 100);
                    let finalVal = grossVal - discountVal;
                    if (launched && m.launched_total !== undefined && m.launched_total !== null) {
                        finalVal = m.launched_total;
                        discountVal = m.launched_discount || 0;
                    }
                    return `
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.6rem; padding-top:0.6rem; border-top:1px dashed #e0d4f5;">
                            <span style="font-weight:900; font-size:1.05rem; color:#7c3aed;">R$ ${finalVal.toFixed(2)}</span>
                            ${discountVal > 0 ? `<span style="font-size:0.8rem; font-weight:700; color:#ef4444; background:#fef2f2; padding:2px 8px; border-radius:12px;">-${discountVal.toFixed(2)} (Desc)</span>` : ''}
                        </div>
                    `;
                })()}
            </div>

            <div class="reminder-meta">
                <span class="rm-author-row">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                    ${escapeHtml(m.created_by_name || 'Usuário')}
                    ${roleTag(m.created_by_role)}
                </span>
                <span>${formatDate(m.created_at)}</span>
            </div>
        </div>`;
    };

    const sortMenuOrders = (list) => 
        [...list].sort((a, b) => {
            // Lançados: ordenar pelo mais recente no topo (launched_at DESC)
            if (a.launched_to_core && b.launched_to_core) {
                const la = a.launched_at ? window.parseDBDate(a.launched_at) : 0;
                const lb = b.launched_at ? window.parseDBDate(b.launched_at) : 0;
                return lb - la;
            }
            // Pendentes: respeitar position manual, depois created_at DESC
            const posA = a.position || 0;
            const posB = b.position || 0;
            if (posA !== posB) return posA - posB;
            return window.parseDBDate(b.created_at) - window.parseDBDate(a.created_at);
        });

    const filteredMenuOrders = () => {
        let list = menuOrders;
        if (menuFilter === 'lançado') list = menuOrders.filter(m => m.launched_to_core);
        else if (menuFilter === 'pendente') list = menuOrders.filter(m => !m.launched_to_core);
        return sortMenuOrders(list);
    };

    const renderMenuList = () => {
        const list = container.querySelector('#menu-orders-list');
        if (!list) return;
        const filtered = filteredMenuOrders();
        if (filtered.length === 0) {
            list.innerHTML = `
                <div class="reminders-empty">
                    <div class="empty-icon">🍽️</div>
                    <p>${menuFilter === 'pendente' ? 'Nenhum cardápio pendente. Tudo lançado! 🎉' :
                         menuFilter === 'lançado' ? 'Nenhum cardápio lançado ainda.' :
                         'Sem cardápios. Adicione o primeiro acima!'}</p>
                </div>`;
            return;
        }
        list.innerHTML = filtered.map(renderMenuCard).join('');
        bindMenuCardEvents(list);
    };

    // ── Global badge update ───────────────────────────────────────────────────────
    const updateGlobalBadge = (pendingCount) => {
        window.dispatchEvent(new CustomEvent('reminders:updated', { detail: { count: pendingCount } }));
    };

    const updateCounters = () => {
        const pendingCount = reminders.filter(r => r.status === 'pendente').length;
        const doneCount = reminders.filter(r => r.status === 'concluido').length;
        const tabPending = container.querySelector('[data-filter="pendente"] .tab-count');
        const tabDone = container.querySelector('[data-filter="concluido"] .tab-count');
        const tabAll = container.querySelector('[data-filter="todos"] .tab-count');
        if (tabPending) tabPending.textContent = pendingCount;
        if (tabDone) tabDone.textContent = doneCount;
        if (tabAll) tabAll.textContent = reminders.length;
        
        const remBadge = container.querySelector('#reminders-pending-badge');
        if (remBadge) {
            remBadge.textContent = pendingCount;
            remBadge.style.display = pendingCount > 0 ? 'flex' : 'none';
        }
        
        updateGlobalBadge(pendingCount);
    };

    const updateMenuCounters = () => {
        const pendingMenu = menuOrders.filter(m => !m.launched_to_core).length;
        const launchedMenu = menuOrders.filter(m => m.launched_to_core).length;
        const el = (s) => container.querySelector(s);
        if (el('[data-mfilter="pendente"] .tab-count')) el('[data-mfilter="pendente"] .tab-count').textContent = pendingMenu;
        if (el('[data-mfilter="lançado"] .tab-count')) el('[data-mfilter="lançado"] .tab-count').textContent = launchedMenu;
        if (el('[data-mfilter="todos"] .tab-count')) el('[data-mfilter="todos"] .tab-count').textContent = menuOrders.length;
        const menuBadge = el('#menu-pending-badge');
        if (menuBadge) {
            menuBadge.textContent = pendingMenu;
            menuBadge.style.display = pendingMenu > 0 ? 'flex' : 'none';
        }
    };

    // ── API ──────────────────────────────────────────────────────────────────────
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

    const fetchWithTimeout = (url, options = {}, ms = 10000) => {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), ms);
        return fetch(url, { ...options, signal: ctrl.signal }).finally(() => clearTimeout(tid));
    };

    const loadReminders = async () => {
        try {
            const res = await fetch('/api/reminders', { headers });
            const json = await res.json();
            reminders = json.data || [];
            updateCounters();
            renderList();
        } catch (e) { console.error('Erro ao carregar lembretes:', e); }
    };

    const createReminder = async (title, description, priority) => {
        const res = await fetchWithTimeout('/api/reminders', {
            method: 'POST', headers, body: JSON.stringify({ title, description, priority })
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Erro ao criar lembrete');
        reminders.push(json.data);
        updateCounters(); renderList();
    };

    const updateReminder = async (id, title, description, priority) => {
        const res = await fetchWithTimeout(`/api/reminders/${id}`, {
            method: 'PUT', headers, body: JSON.stringify({ title, description, priority })
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Erro ao atualizar');
        const idx = reminders.findIndex(r => r.id === id);
        if (idx !== -1) { reminders[idx].title = title; reminders[idx].description = description; reminders[idx].priority = priority; }
        updateCounters(); renderList();
    };

    const toggleReminder = async (id) => {
        const res = await fetchWithTimeout(`/api/reminders/${id}/toggle`, { method: 'PUT', headers });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        const r = reminders.find(r => r.id === id);
        if (r) { r.status = json.newStatus; r.concluded_at = json.newStatus === 'concluido' ? new Date().toISOString() : null; }
        updateCounters(); renderList();
    };

    const deleteReminder = async (id) => {
        const res = await fetchWithTimeout(`/api/reminders/${id}`, { method: 'DELETE', headers });
        if (!res.ok) { const j = await res.json(); throw new Error(j.error); }
        reminders = reminders.filter(r => r.id !== id);
        updateCounters(); renderList();
    };

    const reorderRemindersApi = async (items) => {
        try {
            await fetch('/api/reminders/reorder', { method: 'PUT', headers, body: JSON.stringify({ items }) });
        } catch (e) { console.error('Erro na reordenação:', e); }
    };

    // Menu Orders API
    const loadClients = async () => {
        try {
            const res = await fetch('/api/clients', { headers });
            const json = await res.json();
            clientsList = json.data || [];
        } catch (e) { console.error('Erro ao carregar clientes:', e); }
    };

    const loadMenuOrders = async () => {
        try {
            const res = await fetch('/api/menu-orders', { headers });
            const json = await res.json();
            menuOrders = json.data || [];
            updateMenuCounters();
            renderMenuList();
        } catch (e) { console.error('Erro ao carregar cardápios:', e); }
    };

    const createMenuOrder = async (data) => {
        const res = await fetchWithTimeout('/api/menu-orders', {
            method: 'POST', headers, body: JSON.stringify(data)
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Erro ao criar cardápio');
        menuOrders.unshift(json.data);
        updateMenuCounters(); renderMenuList();
    };

    const updateMenuOrder = async (id, data) => {
        const res = await fetchWithTimeout(`/api/menu-orders/${id}`, {
            method: 'PUT', headers, body: JSON.stringify(data)
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Erro ao atualizar cardápio');
        const idx = menuOrders.findIndex(m => m.id === id);
        if (idx !== -1) { Object.assign(menuOrders[idx], data); }
        updateMenuCounters(); renderMenuList();
    };

    const launchMenuOrder = async (id) => {
        const res = await fetchWithTimeout(`/api/menu-orders/${id}/launch-core`, { method: 'PUT', headers });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Erro ao lançar no CORE');
        const m = menuOrders.find(m => m.id === id);
        if (m) {
            m.launched_to_core = json.launched_to_core;
            m.status = json.launched_to_core ? 'lançado' : 'pendente';
            m.launched_at = json.launched_to_core ? (json.launched_at || new Date().toISOString()) : null;
        }
        updateMenuCounters(); renderMenuList();
    };

    const deleteMenuOrder = async (id) => {
        const res = await fetchWithTimeout(`/api/menu-orders/${id}`, { method: 'DELETE', headers });
        if (!res.ok) { const j = await res.json(); throw new Error(j.error); }
        menuOrders = menuOrders.filter(m => m.id !== id);
        updateMenuCounters(); renderMenuList();
    };

    const reorderMenuOrdersApi = async (items) => {
        try {
            await fetch('/api/menu-orders/reorder', { method: 'PUT', headers, body: JSON.stringify({ items }) });
        } catch (e) { console.error('Erro na reordenação:', e); }
    };

    // ── Reminder modal ────────────────────────────────────────────────────────────
    const openModal = (reminder = null) => {
        editingId = reminder ? reminder.id : null;
        const modal = container.querySelector('#reminder-modal');
        const title = container.querySelector('#modal-title-text');
        const inp = container.querySelector('#rm-inp-title');
        const desc = container.querySelector('#rm-inp-desc');
        const prio = container.querySelector('#rm-inp-priority');
        title.textContent = reminder ? 'Editar Lembrete' : 'Novo Lembrete';
        inp.value = reminder ? reminder.title : '';
        inp.style.borderColor = '';
        desc.value = reminder ? reminder.description || '' : '';
        const activePrio = reminder ? reminder.priority : 'normal';
        prio.value = activePrio;
        container.querySelectorAll('.rm-prio-btn').forEach(b => b.classList.toggle('active', b.dataset.prio === activePrio));
        modal.classList.add('open');
        setTimeout(() => inp.focus(), 80);
    };

    const closeModal = () => {
        editingId = null;
        container.querySelector('#reminder-modal').classList.remove('open');
    };

    // ── Menu Order modal ──────────────────────────────────────────────────────────
    const openMenuModal = async (menuOrder = null) => {
        editingMenuId = menuOrder ? menuOrder.id : null;
        const modal = container.querySelector('#menu-modal');
        const titleEl = container.querySelector('#menu-modal-title-text');
        titleEl.textContent = menuOrder ? 'Editar Cardápio' : 'Novo Cardápio';
        container.querySelector('#menu-inp-qty').value = menuOrder ? menuOrder.quantity : 1;
        container.querySelector('#menu-inp-event').value = menuOrder ? menuOrder.event_name : '';
        container.querySelector('#menu-inp-event').style.borderColor = '';
        
        const clientSelect = container.querySelector('#menu-inp-client');
        clientSelect.innerHTML = '<option value="">Carregando clientes...</option>';
        modal.classList.add('open');

        await loadClients();

        const renderClientOptions = (filter = '') => {
            const lowerFilter = filter.toLowerCase();
            const filtered = clientsList.filter(c => c.name.toLowerCase().includes(lowerFilter) || (c.phone && c.phone.includes(filter)));
            clientSelect.innerHTML = '<option value="">-- Selecione o Cliente --</option>' + 
                filtered.map(c => {
                    let lbl = escapeHtml(c.name);
                    let badges = [];
                    if (c.origin === 'CORE') badges.push('CORE');
                    if (c.core_discount) badges.push('15% OFF');
                    if (badges.length > 0) lbl += ` [${badges.join(' | ')}]`;
                    return `<option value="${c.id}">${lbl}</option>`;
                }).join('');
        };

        const clientSearch = container.querySelector('#menu-inp-client-search');
        if (clientSearch) {
            clientSearch.value = '';
            clientSearch.oninput = (e) => renderClientOptions(e.target.value);
        }

        renderClientOptions();
        
        clientSelect.value = menuOrder && menuOrder.client_id ? menuOrder.client_id : '';
        clientSelect.style.borderColor = '';
        
        container.querySelector('#menu-inp-print').value = menuOrder ? menuOrder.print_type : 'frente';
        modal.classList.add('open');
        setTimeout(() => container.querySelector('#menu-inp-event').focus(), 80);
    };

    const closeMenuModal = () => {
        editingMenuId = null;
        container.querySelector('#menu-modal').classList.remove('open');
    };

    // ── Card event bindings ───────────────────────────────────────────────────────
    const bindCardEvents = (list) => {
        list.querySelectorAll('.rm-toggle').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = parseInt(btn.dataset.id);
                btn.disabled = true;
                try { await toggleReminder(id); } catch(e) { alert(e.message); btn.disabled = false; }
            });
        });
        list.querySelectorAll('.rm-edit').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.id);
                const r = reminders.find(r => r.id === id);
                if (r) openModal(r);
            });
        });
        list.querySelectorAll('.rm-delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = parseInt(btn.dataset.id);
                if (!confirm('Excluir este lembrete?')) return;
                btn.disabled = true;
                try { await deleteReminder(id); } catch(e) { alert(e.message); btn.disabled = false; }
            });
        });

        // Drag and Drop
        let dragSrc = null;
        list.querySelectorAll('.reminder-card').forEach(card => {
            card.addEventListener('dragstart', function(e) {
                dragSrc = this;
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', this.dataset.id);
                this.classList.add('dragging');
            });
            card.addEventListener('dragover', function(e) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                this.classList.add('drag-over');
            });
            card.addEventListener('dragleave', function() { this.classList.remove('drag-over'); });
            card.addEventListener('dragend', function() {
                this.classList.remove('dragging');
                list.querySelectorAll('.reminder-card').forEach(c => c.classList.remove('drag-over'));
            });
            card.addEventListener('drop', function(e) {
                e.stopPropagation();
                this.classList.remove('drag-over');
                if (dragSrc && dragSrc !== this) {
                    const srcId = parseInt(dragSrc.dataset.id);
                    const tgtId = parseInt(this.dataset.id);
                    const filtered = filteredReminders();
                    const srcIdx = filtered.findIndex(r => r.id === srcId);
                    const tgtIdx = filtered.findIndex(r => r.id === tgtId);
                    
                    const [movedItem] = filtered.splice(srcIdx, 1);
                    filtered.splice(tgtIdx, 0, movedItem);

                    const reorderPayload = [];
                    filtered.forEach((item, index) => {
                        const original = reminders.find(r => r.id === item.id);
                        if (original) original.position = index;
                        reorderPayload.push({ id: item.id, position: index });
                    });
                    renderList();
                    reorderRemindersApi(reorderPayload);
                }
                return false;
            });
        });
    };

    const bindMenuCardEvents = (list) => {
        list.querySelectorAll('.menu-launch-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = parseInt(btn.dataset.id);
                btn.disabled = true;
                try { await launchMenuOrder(id); } catch(e) { alert(e.message); btn.disabled = false; }
            });
        });
        list.querySelectorAll('.menu-copy-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.id);
                const m = menuOrders.find(m => m.id === id);
                if (m) {
                    const pt = PRINT_TYPE_LABELS[m.print_type] || { label: m.print_type };
                    const desc = `LM | GRÁFICA - ${m.quantity} ${m.quantity == 1 ? 'IMPRESSÃO' : 'IMPRESSÕES'} A4 A LASER - ${pt.label.toUpperCase()} - ${(m.event_name || '').toUpperCase()}`;
                    if (navigator.clipboard) {
                        navigator.clipboard.writeText(desc).then(() => {
                            const originalHtml = btn.innerHTML;
                            btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg> Copiado';
                            setTimeout(() => btn.innerHTML = originalHtml, 2000);
                        }).catch(err => {
                            alert('Erro ao copiar: ' + err);
                        });
                    } else {
                        alert('Acesso à área de transferência negado ou não suportado.');
                    }
                }
            });
        });
        list.querySelectorAll('.menu-edit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.id);
                const m = menuOrders.find(m => m.id === id);
                if (m) openMenuModal(m);
            });
        });
        list.querySelectorAll('.menu-delete-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = parseInt(btn.dataset.id);
                if (!confirm('Excluir este cardápio?')) return;
                btn.disabled = true;
                try { await deleteMenuOrder(id); } catch(e) { alert(e.message); btn.disabled = false; }
            });
        });

        // Drag and Drop
        let dragSrcMenu = null;
        list.querySelectorAll('.menu-card').forEach(card => {
            card.addEventListener('dragstart', function(e) {
                dragSrcMenu = this;
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', this.dataset.id);
                this.classList.add('dragging');
            });
            card.addEventListener('dragover', function(e) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                this.classList.add('drag-over');
            });
            card.addEventListener('dragleave', function() { this.classList.remove('drag-over'); });
            card.addEventListener('dragend', function() {
                this.classList.remove('dragging');
                list.querySelectorAll('.menu-card').forEach(c => c.classList.remove('drag-over'));
            });
            card.addEventListener('drop', function(e) {
                e.stopPropagation();
                this.classList.remove('drag-over');
                if (dragSrcMenu && dragSrcMenu !== this) {
                    const srcId = parseInt(dragSrcMenu.dataset.id);
                    const tgtId = parseInt(this.dataset.id);
                    const filtered = filteredMenuOrders();
                    const srcIdx = filtered.findIndex(r => r.id === srcId);
                    const tgtIdx = filtered.findIndex(r => r.id === tgtId);
                    
                    const [movedItem] = filtered.splice(srcIdx, 1);
                    filtered.splice(tgtIdx, 0, movedItem);

                    const reorderPayload = [];
                    filtered.forEach((item, index) => {
                        const original = menuOrders.find(r => r.id === item.id);
                        if (original) original.position = index;
                        reorderPayload.push({ id: item.id, position: index });
                    });
                    renderMenuList();
                    reorderMenuOrdersApi(reorderPayload);
                }
                return false;
            });
        });
    };

    // ── Section switching ─────────────────────────────────────────────────────────
    const switchSection = (section) => {
        activeSection = section;
        const lembretesSec = container.querySelector('#section-lembretes');
        const cardapiosSec = container.querySelector('#section-cardapios');
        const tabLemb = container.querySelector('#main-tab-lembretes');
        const tabCard = container.querySelector('#main-tab-cardapios');

        if (section === 'lembretes') {
            lembretesSec.style.display = '';
            cardapiosSec.style.display = 'none';
            tabLemb.classList.add('main-tab-active');
            tabCard.classList.remove('main-tab-active');
        } else {
            lembretesSec.style.display = 'none';
            cardapiosSec.style.display = '';
            tabLemb.classList.remove('main-tab-active');
            tabCard.classList.add('main-tab-active');
        }
    };

    // ── HTML ─────────────────────────────────────────────────────────────────────
    container.innerHTML = `
    <div class="reminders-wrapper">
        <!-- Header -->
        <div class="reminders-header">
            <div class="reminders-title-row">
                <div class="reminders-icon-wrap">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.7">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
                    </svg>
                </div>
                <div>
                    <h1 class="reminders-title">Lembretes &amp; Cardápios</h1>
                    <p class="reminders-subtitle">Gerencie lembretes da equipe e cardápios para o CORE</p>
                </div>
            </div>
        </div>

        <!-- Main Section Tabs -->
        <div class="main-section-tabs">
            <button id="main-tab-lembretes" class="main-section-tab main-tab-active">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                Lembretes
                <span id="reminders-pending-badge" class="menu-nav-badge" style="display:none">0</span>
            </button>
            <button id="main-tab-cardapios" class="main-section-tab">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M19 11H5m0 0a7 7 0 007 7 7 7 0 007-7M5 11a7 7 0 017-7 7 7 0 017 7"/></svg>
                Cardápios
                <span id="menu-pending-badge" class="menu-nav-badge" style="display:none">0</span>
            </button>
        </div>

        <!-- Section: Lembretes -->
        <div id="section-lembretes">
            <div class="section-action-bar">
                <div class="reminders-tabs">
                    <button class="reminder-tab active" data-filter="pendente">Pendentes <span class="tab-count">0</span></button>
                    <button class="reminder-tab" data-filter="concluido">Concluídos <span class="tab-count">0</span></button>
                    <button class="reminder-tab" data-filter="todos">Todos <span class="tab-count">0</span></button>
                </div>
                <button id="btn-new-reminder" class="btn-new-reminder">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
                    Novo Lembrete
                </button>
            </div>
            <div id="reminders-list" class="reminders-list">
                <div class="reminders-loading">Carregando...</div>
            </div>
        </div>

        <!-- Section: Cardápios -->
        <div id="section-cardapios" style="display:none">
            <div class="section-action-bar">
                <div class="reminders-tabs">
                    <button class="menu-tab active" data-mfilter="pendente">Pendentes <span class="tab-count">0</span></button>
                    <button class="menu-tab" data-mfilter="lançado">Lançados <span class="tab-count">0</span></button>
                    <button class="menu-tab" data-mfilter="todos">Todos <span class="tab-count">0</span></button>
                </div>
                <button id="btn-new-menu" class="btn-new-reminder btn-menu-accent">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
                    Novo Cardápio
                </button>
            </div>
            <div id="menu-orders-list" class="reminders-list">
                <div class="reminders-loading">Carregando...</div>
            </div>
        </div>
    </div>

    <!-- Reminder Modal -->
    <div id="reminder-modal" class="rm-modal-overlay">
        <div class="rm-modal">
            <div class="rm-modal-header">
                <h2 id="modal-title-text">Novo Lembrete</h2>
                <button id="rm-modal-close" class="rm-modal-close-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>
            <div class="rm-modal-body">
                <div class="rm-field">
                    <label for="rm-inp-title">Título *</label>
                    <input id="rm-inp-title" type="text" placeholder="Ex: Comprar papel A4, Ligar para fornecedor..." maxlength="200"/>
                </div>
                <div class="rm-field">
                    <label for="rm-inp-desc">Descrição (opcional)</label>
                    <textarea id="rm-inp-desc" rows="3" placeholder="Detalhes adicionais..."></textarea>
                </div>
                <div class="rm-field">
                    <label>Prioridade</label>
                    <div class="rm-priority-select" id="rm-priority-buttons">
                        <button class="rm-prio-btn" data-prio="urgente">🔴 Urgente</button>
                        <button class="rm-prio-btn active" data-prio="normal">🟡 Normal</button>
                        <button class="rm-prio-btn" data-prio="baixo">🟢 Baixo</button>
                    </div>
                    <input type="hidden" id="rm-inp-priority" value="normal"/>
                </div>
            </div>
            <div class="rm-modal-footer">
                <button id="rm-btn-cancel" class="btn-cancel-rm">Cancelar</button>
                <button id="rm-btn-save" class="btn-save-rm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                    Salvar
                </button>
            </div>
        </div>
    </div>

    <!-- Menu Order Modal -->
    <div id="menu-modal" class="rm-modal-overlay">
        <div class="rm-modal rm-modal-wide">
            <div class="rm-modal-header rm-modal-header-menu">
                <h2 id="menu-modal-title-text">Novo Cardápio</h2>
                <button id="menu-modal-close" class="rm-modal-close-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>
            <div class="rm-modal-body">
                <div class="menu-modal-grid">
                    <div class="rm-field">
                        <label for="menu-inp-qty">Quantidade *</label>
                        <input id="menu-inp-qty" type="number" min="1" value="1" placeholder="Ex: 500"/>
                    </div>
                    <div class="rm-field">
                        <label for="menu-inp-print">Tipo de Impressão *</label>
                        <select id="menu-inp-print" class="rm-select">
                            <option value="frente">📄 Frente</option>
                            <option value="frente_e_verso">📋 Frente e Verso</option>
                            <option value="plastificado">✨ Plastificado</option>
                        </select>
                    </div>
                </div>
                <div class="rm-field">
                    <label for="menu-inp-event">Nome do Evento *</label>
                    <input id="menu-inp-event" type="text" placeholder="Ex: Casamento João e Maria, Festival de Verão..." maxlength="200"/>
                </div>
                <div class="rm-field">
                    <label for="menu-inp-client">Cliente *</label>
                    <input type="text" id="menu-inp-client-search" placeholder="🔍 Buscar cliente..." style="width: 100%; padding: 0.6rem 0.8rem; border: 1px solid #d1d5db; border-radius: 8px; font-size: 0.9rem; margin-bottom: 0.5rem; transition: border-color 0.2s; outline: none;" autocomplete="off" />
                    <select id="menu-inp-client" class="rm-select">
                        <option value="">Carregando clientes...</option>
                    </select>
                </div>
            </div>
            <div class="rm-modal-footer">
                <button id="menu-btn-cancel" class="btn-cancel-rm">Cancelar</button>
                <button id="menu-btn-save" class="btn-save-rm btn-save-menu">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                    Salvar Cardápio
                </button>
            </div>
        </div>
    </div>

    <style>
    /* ── Page Layout ────────────────────────────────────────────────────── */
    .reminders-page { min-height: 100vh; background: var(--bg-color, #f5f3ff); padding: 1.5rem 2rem; font-family: inherit; }
    .reminders-wrapper { max-width: 900px; margin: 0 auto; }

    /* ── Header ─────────────────────────────────────────────────────────── */
    .reminders-header {
        display: flex; align-items: center; justify-content: space-between;
        gap: 1rem; flex-wrap: wrap;
        background: white; border-radius: 16px; padding: 1.5rem 1.75rem;
        box-shadow: 0 2px 16px rgba(0,0,0,0.07); margin-bottom: 1rem;
        border: 1px solid var(--border, #e0d4f5);
    }
    .reminders-title-row { display: flex; align-items: center; gap: 1rem; }
    .reminders-icon-wrap {
        width: 52px; height: 52px; border-radius: 14px;
        background: linear-gradient(135deg, var(--primary, #7c3aed), var(--primary-hover, #6d28d9));
        display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0;
    }
    .reminders-title { font-size: 1.4rem; font-weight: 800; color: #1e1b4b; margin: 0 0 2px; }
    .reminders-subtitle { font-size: 0.82rem; color: #6b7280; margin: 0; }
    .reminders-global-badge {
        background: #ef4444; color: white; font-size: 0.75rem; font-weight: 700;
        min-width: 24px; height: 24px; border-radius: 999px; display: flex;
        align-items: center; justify-content: center; padding: 0 6px;
        box-shadow: 0 0 10px rgba(239,68,68,0.4);
    }

    /* ── Main Section Tabs ──────────────────────────────────────────────── */
    .main-section-tabs {
        display: flex; gap: 0.4rem; margin-bottom: 1rem;
        background: white; border-radius: 14px; padding: 0.4rem;
        border: 1px solid var(--border, #e0d4f5);
        box-shadow: 0 1px 8px rgba(0,0,0,0.05);
    }
    .main-section-tab {
        flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.5rem;
        padding: 0.65rem 1rem; border: none; border-radius: 10px;
        background: transparent; font-size: 0.9rem; font-weight: 700;
        color: #6b7280; cursor: pointer; transition: all 0.2s; position: relative;
    }
    .main-section-tab.main-tab-active {
        background: var(--primary, #7c3aed); color: white;
        box-shadow: 0 2px 10px rgba(124,58,237,0.35);
    }
    .main-section-tab:not(.main-tab-active):hover { background: #f5f3ff; color: var(--primary, #7c3aed); }
    .menu-nav-badge {
        background: #ef4444; color: white; font-size: 0.7rem; font-weight: 800;
        min-width: 18px; height: 18px; border-radius: 999px;
        display: flex; align-items: center; justify-content: center; padding: 0 4px;
    }

    /* ── Section Action Bar ─────────────────────────────────────────────── */
    .section-action-bar {
        display: flex; align-items: center; justify-content: space-between;
        gap: 1rem; flex-wrap: wrap; margin-bottom: 1rem;
    }

    /* ── New Button ─────────────────────────────────────────────────────── */
    .btn-new-reminder {
        display: flex; align-items: center; gap: 0.5rem;
        background: linear-gradient(135deg, var(--primary, #7c3aed), var(--primary-hover, #6d28d9));
        color: white; border: none; border-radius: 10px;
        padding: 0.65rem 1.25rem; font-size: 0.9rem; font-weight: 600;
        cursor: pointer; transition: all 0.2s; white-space: nowrap;
        box-shadow: 0 4px 12px rgba(124,58,237,0.3);
    }
    .btn-new-reminder:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(124,58,237,0.4); }
    .btn-new-reminder:active { transform: translateY(0); }
    .btn-menu-accent {
        background: linear-gradient(135deg, #0ea5e9, #0284c7) !important;
        box-shadow: 0 4px 12px rgba(14,165,233,0.3) !important;
    }
    .btn-menu-accent:hover { box-shadow: 0 6px 18px rgba(14,165,233,0.45) !important; }

    /* ── Filter Tabs ────────────────────────────────────────────────────── */
    .reminders-tabs {
        display: flex; gap: 0.4rem;
        background: #f9fafb; border-radius: 10px; padding: 0.3rem;
        border: 1px solid var(--border, #e0d4f5);
    }
    .reminder-tab, .menu-tab {
        flex: 1; padding: 0.45rem 0.9rem; border: none; border-radius: 7px;
        background: transparent; font-size: 0.855rem; font-weight: 600;
        color: #6b7280; cursor: pointer; transition: all 0.2s;
        display: flex; align-items: center; justify-content: center; gap: 0.4rem;
    }
    .reminder-tab.active, .menu-tab.active {
        background: var(--primary, #7c3aed); color: white;
        box-shadow: 0 2px 8px rgba(124,58,237,0.3);
    }
    .reminder-tab:not(.active):hover, .menu-tab:not(.active):hover { background: #ede9fe; color: var(--primary, #7c3aed); }
    .tab-count {
        background: rgba(255,255,255,0.25); border-radius: 999px;
        padding: 1px 7px; font-size: 0.78rem; font-weight: 700;
        min-width: 20px; text-align: center;
    }
    .reminder-tab:not(.active) .tab-count, .menu-tab:not(.active) .tab-count { background: #f3f4f6; color: #6b7280; }

    /* ── List ───────────────────────────────────────────────────────────── */
    .reminders-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .reminders-loading { text-align: center; padding: 3rem; color: #6b7280; font-size: 0.95rem; }
    .reminders-empty { text-align: center; padding: 3.5rem 2rem; }
    .empty-icon { font-size: 3rem; margin-bottom: 0.75rem; }
    .reminders-empty p { color: #6b7280; font-size: 0.95rem; }

    /* ── Reminder Cards ─────────────────────────────────────────────────── */
    .reminder-card {
        background: white; border-radius: 14px; padding: 1.1rem 1.25rem;
        border: 1px solid var(--border, #e0d4f5);
        border-left: 4px solid var(--pcolor, #7c3aed);
        box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        transition: transform 0.15s, box-shadow 0.15s;
        animation: slideIn 0.25s ease;
    }
    @keyframes slideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    .reminder-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.09); }
    .reminder-card.reminder-done { opacity: 0.65; border-left-color: #d1d5db; }
    .reminder-card.reminder-done:hover { opacity: 0.8; }
    .reminder-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.65rem; }
    .reminder-card.dragging { opacity: 0.5; }
    .reminder-card.drag-over { border-top: 3px dashed var(--pcolor, #7c3aed); }
    .menu-card.dragging { opacity: 0.5; }
    .menu-card.drag-over { border-top: 3px dashed #7c3aed; }
    .reminder-priority-badge {
        font-size: 0.72rem; font-weight: 800; padding: 4px 12px; border-radius: 999px;
        display: inline-flex; align-items: center; gap: 5px; text-transform: uppercase; letter-spacing: 0.04em;
        border: 1px solid rgba(255,255,255,0.4); box-shadow: 0 4px 10px rgba(0,0,0,0.04);
    }
    .reminder-card-actions { display: flex; align-items: center; gap: 0.4rem; }
    .rm-btn {
        display: inline-flex; align-items: center; gap: 0.4rem;
        padding: 0.4rem 0.75rem; border-radius: 10px; border: none;
        font-size: 0.75rem; font-weight: 700; cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .rm-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
    .rm-done { background: #ecfdf5; color: #10b981; }
    .rm-done:hover { background: #10b981; color: white; }
    .rm-undo { background: #f3f4f6; color: #6b7280; }
    .rm-undo:hover { background: #e5e7eb; color: #374151; }
    .rm-edit { background: #eff6ff; color: #3b82f6; }
    .rm-edit:hover { background: #3b82f6; color: white; }
    .rm-delete { background: #fef2f2; color: #ef4444; }
    .rm-delete:hover { background: #ef4444; color: white; }
    .reminder-title { margin: 0 0 0.4rem; font-size: 1.05rem; font-weight: 800; color: #1e1b4b; line-height: 1.35; letter-spacing: -0.01em; }
    .reminder-title.strikethrough { text-decoration: line-through; color: #9ca3af; }
    .reminder-desc { margin: 0 0 0.75rem; font-size: 0.88rem; color: #4B5563; line-height: 1.6; white-space: pre-wrap; font-weight: 500; }
    .reminder-meta {
        display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;
        font-size: 0.75rem; color: #9ca3af; border-top: 1px dashed var(--border, #e0d4f5); padding-top: 0.75rem; margin-top: 0.5rem;
    }
    .rm-author-row { display: flex; align-items: center; gap: 0.4rem; background: #f3f4f6; padding: 3px 10px; border-radius: 8px; color: #4B5563; font-weight: 600; }
    .rm-role-tag { font-size: 0.7rem; font-weight: 800; padding: 2px 7px; border-radius: 6px; }
    .rm-concluded-tag { background: #ecfdf5; color: #059669; padding: 2px 8px; border-radius: 999px; font-weight: 700; }

    /* ── Menu Cards ─────────────────────────────────────────────────────── */
    .menu-card {
        background: white; border-radius: 14px; padding: 1.1rem 1.25rem;
        border: 1px solid var(--border, #e0d4f5);
        border-left: 4px solid #0ea5e9;
        box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        transition: transform 0.15s, box-shadow 0.15s;
        animation: slideIn 0.25s ease;
    }
    .menu-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.09); }
    .menu-card.menu-launched { border-left-color: #10b981; opacity: 0.75; }
    .menu-card.menu-launched:hover { opacity: 0.9; }
    .menu-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.8rem; flex-wrap: wrap; gap: 0.5rem; }
    .menu-card-badges { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .menu-qty-badge {
        background: rgba(14,165,233,0.12); color: #0284c7; border: 1px solid rgba(14,165,233,0.2);
        font-size: 0.85rem; font-weight: 800; padding: 4px 12px; border-radius: 999px;
    }
    .menu-print-badge {
        background: rgba(124,58,237,0.1); color: #6d28d9; border: 1px solid rgba(124,58,237,0.2);
        font-size: 0.75rem; font-weight: 800; padding: 4px 10px; border-radius: 999px;
    }
    .menu-launched-badge {
        background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0;
        font-size: 0.75rem; font-weight: 800; padding: 4px 10px; border-radius: 999px;
    }
    .menu-pending-badge {
        background: rgba(245,158,11,0.12); color: #d97706; border: 1px solid rgba(245,158,11,0.3);
        font-size: 0.75rem; font-weight: 800; padding: 4px 10px; border-radius: 999px;
    }
    .menu-launch-do { background: #ecfdf5; color: #10b981; }
    .menu-launch-do:hover { background: #10b981; color: white; }
    .menu-launch-undo { background: #f3f4f6; color: #6b7280; }
    .menu-launch-undo:hover { background: #e5e7eb; color: #374151; }
    .menu-card-info { display: flex; flex-direction: column; gap: 0.6rem; margin-bottom: 0.5rem; background: #f8fafc; padding: 1rem; border-radius: 12px; }
    .menu-info-row { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
    .menu-info-label { font-size: 0.7rem; font-weight: 800; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
    .menu-info-value { font-size: 0.95rem; font-weight: 700; color: #1e1b4b; background: white; padding: 2px 8px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }

    /* ── Modals ─────────────────────────────────────────────────────────── */
    .rm-modal-overlay {
        position: fixed; inset: 0; background: rgba(0,0,0,0.45); backdrop-filter: blur(4px);
        z-index: 9999; display: flex; align-items: center; justify-content: center;
        opacity: 0; pointer-events: none; transition: opacity 0.2s;
    }
    .rm-modal-overlay.open { opacity: 1; pointer-events: all; }
    .rm-modal {
        background: white; border-radius: 18px; width: 100%; max-width: 500px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.2); transform: scale(0.95); transition: transform 0.2s;
        overflow: hidden;
    }
    .rm-modal-wide { max-width: 560px; }
    .rm-modal-overlay.open .rm-modal { transform: scale(1); }
    .rm-modal-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 1.2rem 1.5rem; border-bottom: 1px solid #f3f4f6;
        background: linear-gradient(135deg, #f5f3ff, white);
    }
    .rm-modal-header-menu { background: linear-gradient(135deg, #e0f2fe, white) !important; }
    .rm-modal-header h2 { margin: 0; font-size: 1.1rem; font-weight: 800; color: #1e1b4b; }
    .rm-modal-close-btn { background: none; border: none; cursor: pointer; color: #9ca3af; padding: 4px; border-radius: 6px; transition: all 0.15s; }
    .rm-modal-close-btn:hover { background: #f3f4f6; color: #374151; }
    .rm-modal-body { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.1rem; }
    .rm-field { display: flex; flex-direction: column; gap: 0.4rem; }
    .rm-field label { font-size: 0.82rem; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.04em; }
    .rm-field input, .rm-field textarea, .rm-select {
        border: 1.5px solid var(--border, #e0d4f5); border-radius: 10px;
        padding: 0.65rem 0.85rem; font-size: 0.9rem; font-family: inherit;
        outline: none; resize: vertical; transition: border-color 0.15s;
        color: #1e1b4b; background: white;
    }
    .rm-field input:focus, .rm-field textarea:focus, .rm-select:focus { border-color: var(--primary, #7c3aed); box-shadow: 0 0 0 3px rgba(124,58,237,0.1); }
    .rm-select { cursor: pointer; appearance: auto; }
    .menu-modal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .rm-priority-select { display: flex; gap: 0.5rem; }
    .rm-prio-btn {
        flex: 1; padding: 0.5rem; border: 1.5px solid var(--border, #e0d4f5);
        border-radius: 8px; background: #fafafa; font-size: 0.82rem; font-weight: 600;
        cursor: pointer; transition: all 0.15s; color: #374151;
    }
    .rm-prio-btn.active { border-color: var(--primary, #7c3aed); background: #f5f3ff; color: var(--primary, #7c3aed); }
    .rm-prio-btn[data-prio="urgente"].active { border-color: #ef4444; background: #fef2f2; color: #ef4444; }
    .rm-prio-btn[data-prio="baixo"].active { border-color: #10b981; background: #ecfdf5; color: #10b981; }
    .rm-modal-footer {
        display: flex; align-items: center; justify-content: flex-end; gap: 0.75rem;
        padding: 1rem 1.5rem; border-top: 1px solid #f3f4f6; background: #fafafa;
    }
    .btn-cancel-rm {
        padding: 0.6rem 1.1rem; border: 1.5px solid var(--border, #e0d4f5);
        border-radius: 9px; background: white; font-size: 0.875rem; font-weight: 600;
        color: #6b7280; cursor: pointer; transition: all 0.15s;
    }
    .btn-cancel-rm:hover { background: #f3f4f6; }
    .btn-save-rm {
        display: flex; align-items: center; gap: 0.4rem;
        padding: 0.6rem 1.3rem; border: none; border-radius: 9px;
        background: linear-gradient(135deg, var(--primary, #7c3aed), var(--primary-hover, #6d28d9));
        color: white; font-size: 0.875rem; font-weight: 700; cursor: pointer;
        transition: all 0.15s; box-shadow: 0 3px 10px rgba(124,58,237,0.3);
    }
    .btn-save-rm:hover { transform: translateY(-1px); box-shadow: 0 5px 16px rgba(124,58,237,0.4); }
    .btn-save-rm:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
    .btn-save-menu {
        background: linear-gradient(135deg, #0ea5e9, #0284c7) !important;
        box-shadow: 0 3px 10px rgba(14,165,233,0.3) !important;
    }
    .btn-save-menu:hover { box-shadow: 0 5px 16px rgba(14,165,233,0.45) !important; }
    </style>`;

    // ── Wire up: Main section tabs ────────────────────────────────────────────────
    container.querySelector('#main-tab-lembretes').addEventListener('click', () => switchSection('lembretes'));
    container.querySelector('#main-tab-cardapios').addEventListener('click', () => {
        switchSection('cardapios');
        if (menuOrders.length === 0) loadMenuOrders();
    });

    // ── Wire up: Reminder tabs ────────────────────────────────────────────────────
    container.querySelectorAll('.reminder-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            container.querySelectorAll('.reminder-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            filterStatus = tab.dataset.filter;
            renderList();
        });
    });

    // ── Wire up: Menu tabs ────────────────────────────────────────────────────────
    container.querySelectorAll('.menu-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            container.querySelectorAll('.menu-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            menuFilter = tab.dataset.mfilter;
            renderMenuList();
        });
    });

    // ── Wire up: New buttons ──────────────────────────────────────────────────────
    container.querySelector('#btn-new-reminder').addEventListener('click', () => openModal());
    container.querySelector('#btn-new-menu').addEventListener('click', () => openMenuModal());

    // ── Wire up: Reminder modal ───────────────────────────────────────────────────
    container.querySelector('#rm-modal-close').addEventListener('click', closeModal);
    container.querySelector('#rm-btn-cancel').addEventListener('click', closeModal);
    container.querySelector('#reminder-modal').addEventListener('click', (e) => {
        if (e.target === container.querySelector('#reminder-modal')) closeModal();
    });

    container.querySelectorAll('.rm-prio-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.rm-prio-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            container.querySelector('#rm-inp-priority').value = btn.dataset.prio;
        });
    });

    container.querySelector('#rm-btn-save').addEventListener('click', async () => {
        const title = container.querySelector('#rm-inp-title').value.trim();
        const description = container.querySelector('#rm-inp-desc').value.trim();
        const priority = container.querySelector('#rm-inp-priority').value;
        if (!title) {
            container.querySelector('#rm-inp-title').focus();
            container.querySelector('#rm-inp-title').style.borderColor = '#ef4444';
            return;
        }
        container.querySelector('#rm-inp-title').style.borderColor = '';
        const saveBtn = container.querySelector('#rm-btn-save');
        saveBtn.disabled = true; saveBtn.innerHTML = '⏳ Salvando...';
        try {
            if (editingId) { await updateReminder(editingId, title, description, priority); }
            else { await createReminder(title, description, priority); }
            closeModal();
        } catch (e) { alert(e.message || 'Erro ao salvar lembrete.'); }
        finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg> Salvar`;
        }
    });

    container.querySelector('#rm-inp-title').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') container.querySelector('#rm-btn-save').click();
    });

    // ── Wire up: Menu Order modal ─────────────────────────────────────────────────
    container.querySelector('#menu-modal-close').addEventListener('click', closeMenuModal);
    container.querySelector('#menu-btn-cancel').addEventListener('click', closeMenuModal);
    container.querySelector('#menu-modal').addEventListener('click', (e) => {
        if (e.target === container.querySelector('#menu-modal')) closeMenuModal();
    });

    container.querySelector('#menu-btn-save').addEventListener('click', async () => {
        const quantity = parseInt(container.querySelector('#menu-inp-qty').value) || 1;
        const event_name = container.querySelector('#menu-inp-event').value.trim();
        const client_id = container.querySelector('#menu-inp-client').value;
        const print_type = container.querySelector('#menu-inp-print').value;

        let valid = true;
        if (!event_name) {
            container.querySelector('#menu-inp-event').style.borderColor = '#ef4444';
            container.querySelector('#menu-inp-event').focus();
            valid = false;
        } else { container.querySelector('#menu-inp-event').style.borderColor = ''; }
        if (!client_id) {
            container.querySelector('#menu-inp-client').style.borderColor = '#ef4444';
            if (valid) container.querySelector('#menu-inp-client').focus();
            valid = false;
        } else { container.querySelector('#menu-inp-client').style.borderColor = ''; }
        if (!valid) return;

        const saveBtn = container.querySelector('#menu-btn-save');
        saveBtn.disabled = true; saveBtn.innerHTML = '⏳ Salvando...';
        try {
            const data = { quantity, event_name, client_id, print_type };
            if (editingMenuId) { await updateMenuOrder(editingMenuId, data); }
            else { await createMenuOrder(data); }
            closeMenuModal();
        } catch (e) { alert(e.message || 'Erro ao salvar cardápio.'); }
        finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg> Salvar Cardápio`;
        }
    });

    // ── Initial load ──────────────────────────────────────────────────────────────
    loadReminders();
    loadMenuOrders();
    loadClients();

    return container;
};
