export const render = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const clientId = user.client_id;
    const container = document.createElement('div');

    const statusLabels = {
        'aguardando_aceite': { label: 'Aguardando Aceite', color: '#f59e0b', bg: '#fffbeb', icon: '⏳' },
        'producao': { label: 'Em Produção', color: '#3b82f6', bg: '#eff6ff', icon: '🔧' },
        'em_balcao': { label: 'Pronto p/ Retirada', color: '#10b981', bg: '#f0fdf4', icon: '📦' },
        'finalizado': { label: 'Finalizado', color: '#6b7280', bg: '#f9fafb', icon: '✅' },
        'rejeitado': { label: 'Rejeitado', color: '#ef4444', bg: '#fef2f2', icon: '❌' },
        'arquivado': { label: 'Arquivado', color: '#9ca3af', bg: '#f3f4f6', icon: '📁' }
    };

    container.innerHTML = `
        <!-- Header -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 2rem;">
            <div style="display:flex; flex-direction:column; gap:0.2rem;">
                <h2 style="font-size: 1.8rem; font-weight: 900; background: linear-gradient(135deg, var(--primary), #4c1d95); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin:0; letter-spacing: -0.03em;">📋 Meus Pedidos</h2>
                <p style="color: #64748b; margin: 0; font-size: 0.95rem; font-weight:500; white-space: nowrap;">Acompanhe o andamento dos seus pedidos em produção.</p>
            </div>
        </div>

        <!-- Summary Cards -->
        <div class="stock-cards" id="cp-cards" style="margin-bottom:1rem">
            <div class="stock-card">
                <div class="stock-card-icon" style="background:#3b82f620; color:#3b82f6">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <div class="stock-card-info">
                    <div class="stock-card-value" id="cp-total">-</div>
                    <div class="stock-card-label">Total de Pedidos</div>
                </div>
            </div>
            <div class="stock-card">
                <div class="stock-card-icon" style="background:#f59e0b20; color:#f59e0b">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div class="stock-card-info">
                    <div class="stock-card-value" id="cp-in-progress">-</div>
                    <div class="stock-card-label">Em Andamento</div>
                </div>
            </div>
            <div class="stock-card">
                <div class="stock-card-icon" style="background:#10b98120; color:#10b981">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div class="stock-card-info">
                    <div class="stock-card-value" id="cp-done">-</div>
                    <div class="stock-card-label">Finalizados</div>
                </div>
            </div>
            <div class="stock-card">
                <div class="stock-card-icon" style="background:#7c3aed20; color:#7c3aed">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                </div>
                <div class="stock-card-info">
                    <div class="stock-card-value" id="cp-total-value">R$ 0</div>
                    <div class="stock-card-label">Valor Total</div>
                </div>
            </div>
        </div>

        <div id="cp-orders-list">
            <p style="text-align:center; color:#94a3b8; padding:2rem;">Carregando pedidos...</p>
        </div>
    `;

    const loadOrders = async () => {
        if (!clientId) {
            container.querySelector('#cp-orders-list').innerHTML = '<p style="text-align:center; color:#ef4444; padding:2rem;">⚠️ Conta não vinculada a um cliente. Contate o administrador.</p>';
            return;
        }

        try {
            const res = await fetch(`/api/reports/client-orders/${clientId}`);
            const { data } = await res.json();

            // Summary
            const inProgress = data.filter(o => ['aguardando_aceite', 'producao'].includes(o.status)).length;
            const done = data.filter(o => ['em_balcao', 'finalizado', 'arquivado'].includes(o.status)).length;
            const totalValue = data.reduce((sum, o) => sum + (o.total_value || 0), 0);

            container.querySelector('#cp-total').textContent = data.length;
            container.querySelector('#cp-in-progress').textContent = inProgress;
            container.querySelector('#cp-done').textContent = done;
            container.querySelector('#cp-total-value').textContent = `R$ ${totalValue.toFixed(2)}`;

            const listEl = container.querySelector('#cp-orders-list');

            if (data.length === 0) {
                listEl.innerHTML = '<p style="text-align:center; color:#94a3b8; padding:2rem;">Nenhum pedido encontrado.</p>';
                return;
            }

            listEl.innerHTML = data.map(order => {
                const s = statusLabels[order.status] || { label: order.status, color: '#6b7280', bg: '#f9fafb', icon: '❓' };
                const createdDate = window.parseDBDate(order.created_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

                // Checklist progress
                let progressHtml = '';
                if (order.status === 'producao') {
                    const cl = order.checklist || {};
                    const items = ['arte', 'impressao', 'corte', 'embalagem'];
                    const itemLabels = { arte: 'Arte', impressao: 'Impressão', corte: 'Corte', embalagem: 'Embalagem' };
                    const doneCount = items.filter(i => cl[i]).length;
                    const pct = Math.round((doneCount / items.length) * 100);
                    const color = pct === 100 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';

                    progressHtml = `
                        <div style="margin-top:0.75rem; padding:0.5rem; background:#f8fafc; border-radius:6px; border:1px solid #e2e8f0;">
                            <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.4rem;">
                                <div style="width:32px; height:32px; border-radius:50%; background:conic-gradient(${color} ${pct * 3.6}deg, #e5e7eb ${pct * 3.6}deg); flex-shrink:0; display:flex; align-items:center; justify-content:center;">
                                    <div style="width:20px; height:20px; border-radius:50%; background:#f8fafc; display:flex; align-items:center; justify-content:center; font-size:0.6rem; font-weight:700; color:${color};">${pct}%</div>
                                </div>
                                <span style="font-size:0.85rem; font-weight:600; color:#475569;">Progresso: ${doneCount}/${items.length}</span>
                            </div>
                            <div style="display:flex; flex-wrap:wrap; gap:0.3rem;">
                                ${items.map(i => `
                                    <span style="font-size:0.75rem; padding:2px 8px; border-radius:12px; background:${cl[i] ? '#d1fae5' : '#fee2e2'}; color:${cl[i] ? '#065f46' : '#991b1b'};">
                                        ${cl[i] ? '✅' : '⏳'} ${itemLabels[i]}
                                    </span>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }

                // Deadline info
                let deadlineHtml = '';
                if (order.deadline_at && ['aguardando_aceite', 'producao'].includes(order.status)) {
                    const dl = window.parseDBDate(order.deadline_at);
                    const now = new Date();
                    const isExpired = now > dl;
                    deadlineHtml = `
                        <div style="font-size:0.8rem; margin-top:0.4rem; color:${isExpired ? '#dc2626' : '#059669'}; font-weight:600;">
                            📅 Prazo: ${dl.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })} ${isExpired ? '(Atrasado!)' : ''}
                        </div>
                    `;
                }

                return `
                    <div style="background:white; border-radius:10px; border:1px solid #e5e7eb; padding:1rem; margin-bottom:0.75rem; border-left:4px solid ${s.color};">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:0.5rem;">
                            <div style="flex:1; min-width:200px;">
                                <div style="font-size:0.8rem; color:#94a3b8; margin-bottom:0.25rem;">📅 ${createdDate}</div>
                                <div style="font-weight:700; font-size:1rem; color:#1e293b; margin-bottom:0.25rem;">${order.products_summary || 'Pedido'}</div>
                                ${order.event_name ? `<div style="font-size:0.85rem; font-weight:600; color:#8b5cf6; margin-bottom:0.2rem;">🎉 Evento: ${order.event_name}</div>` : ''}
                                ${order.description ? `<div style="font-size:0.85rem; color:#64748b; white-space:pre-wrap;">${order.description}</div>` : ''}
                                ${deadlineHtml}
                            </div>
                            <div style="text-align:right;">
                                <span style="display:inline-block; padding:4px 12px; border-radius:20px; font-size:0.8rem; font-weight:600; background:${s.bg}; color:${s.color}; border:1px solid ${s.color}30;">
                                    ${s.icon} ${s.label}
                                </span>
                                <div style="font-weight:700; font-size:1.1rem; color:#7c3aed; margin-top:0.4rem;">R$ ${(order.total_value || 0).toFixed(2)}</div>
                                ${(order.discount_value || 0) > 0 ? `<div style="font-size:0.8rem; color:#dc2626;">Desconto: -R$ ${order.discount_value.toFixed(2)}</div>` : ''}
                                <div style="font-size:0.78rem; color:#94a3b8; margin-top:0.2rem;">💳 ${order.payment_method || '-'}</div>
                            </div>
                        </div>
                        ${progressHtml}
                    </div>
                `;
            }).join('');

        } catch (e) {
            console.error(e);
            container.querySelector('#cp-orders-list').innerHTML = '<p style="text-align:center; color:#ef4444; padding:2rem;">Erro ao carregar pedidos.</p>';
        }
    };

    loadOrders();
    return container;
};
