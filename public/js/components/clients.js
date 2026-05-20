export const render = () => {
    const container = document.createElement('div');
    container.innerHTML = `
        <!-- Header -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1.5rem;">
            <div style="display:flex; flex-direction:column; gap:0.2rem;">
                <h2 style="font-size: 1.8rem; font-weight: 900; background: linear-gradient(135deg, var(--primary), #4c1d95); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin:0; letter-spacing: -0.03em;">Clientes</h2>
                <p style="color: #64748b; margin: 0; font-size: 0.95rem; font-weight:500; white-space: nowrap;">Gerenciamento do banco de dados e acessos financeiros.</p>
            </div>
            <button class="btn btn-primary" style="width: auto; padding: 0.8rem 1.5rem; border-radius: 12px; font-weight:800; text-transform:uppercase; letter-spacing:0.05em; display:flex; align-items:center; gap:0.5rem; box-shadow:0 4px 15px rgba(139, 92, 246, 0.3); transition:all 0.2s;" id="btn-new-client" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                NOVO CLIENTE
            </button>
        </div>

        <!-- Filters -->
        <div style="display:flex; gap:1rem; align-items:center; margin-bottom: 2rem; background:rgba(255,255,255,0.6); padding:1rem; border-radius:12px; border:1px solid rgba(139, 92, 246, 0.2);">
            <div style="flex:1; position:relative;">
                <input type="text" id="client-search" placeholder="Buscar por nome, telefone ou CPF/CNPJ..." style="width:100%; padding:0.75rem 1rem 0.75rem 2.8rem; border-radius:8px; border:1px solid #cbd5e1; font-size:0.95rem; outline:none; transition:border-color 0.2s;">
                <span style="position:absolute; left:12px; top:50%; transform:translateY(-50%); font-size:1.2rem; opacity:0.6;">🔍</span>
            </div>
            <div style="display:flex; align-items:center; gap:0.6rem; background:#f1f5f9; padding:0.6rem 1rem; border-radius:8px; cursor:pointer;" onclick="const cb = document.getElementById('client-core-filter'); cb.checked = !cb.checked; cb.dispatchEvent(new Event('change'));">
                <input type="checkbox" id="client-core-filter" style="width:18px; height:18px; cursor:pointer; pointer-events:none;">
                <label style="margin:0; cursor:pointer; font-weight:700; color:#475569; user-select:none; font-size:0.9rem;">Apenas CORE</label>
            </div>
        </div>

        <!-- Table -->
        <table class="data-table">
            <thead>
                <tr>
                    <th>Nome</th>
                    <th>Telefone</th>
                    <th>Origem</th>
                    <th>Desconto</th>
                    <th>Acesso</th>
                    <th style="text-align:right;">Ações</th>
                </tr>
            </thead>
            <tbody id="clients-list">
                <tr><td colspan="6" style="padding: 4rem; text-align: center; color: #94a3b8; font-weight: 500; font-size:1.1rem;">Carregando banco de clientes...</td></tr>
            </tbody>
        </table>

        <!-- Modal -->
        <div class="modal-overlay" id="client-modal">
            <div class="modal" style="max-width: 650px; width: 95%;">
                <div class="modal-header">
                    <h3 id="client-modal-title" style="font-size: 1.5rem; font-weight: 900; color: #1e293b;">Novo Cliente</h3>
                    <button class="modal-close" style="background:none; border:none; font-size:1.5rem; cursor:pointer; color:#94a3b8;">&times;</button>
                </div>
                <form id="client-form" style="padding: 1rem 0;">
                    <input type="hidden" name="id" id="client-id">
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                        <div class="form-group">
                            <label style="font-weight: 700; color: #475569; font-size: 0.85rem;">Nome Completo</label>
                            <input type="text" name="name" id="client-name" required style="width:100%; padding:0.6rem; border:1.5px solid #e2e8f0; border-radius:10px;">
                        </div>
                        <div class="form-group">
                            <label style="font-weight: 700; color: #475569; font-size: 0.85rem;">Telefone / WhatsApp</label>
                            <input type="text" name="phone" id="client-phone" placeholder="(XX) XXXXX-XXXX" required style="width:100%; padding:0.6rem; border:1.5px solid #e2e8f0; border-radius:10px;">
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                        <div class="form-group">
                            <label style="font-weight: 700; color: #475569; font-size: 0.85rem;">Origem do Cliente</label>
                            <select name="origin" id="client-origin" style="width:100%; padding:0.6rem; border:1.5px solid #e2e8f0; border-radius:10px;">
                                <option value="Site">Site</option>
                                <option value="Whatsapp">Whatsapp</option>
                                <option value="Balcão">Balcão</option>
                                <option value="Indicação">Indicação</option>
                                <option value="CORE">CORE</option>
                            </select>
                        </div>
                        <div class="form-group" style="display:flex; align-items:center; gap:0.75rem; padding:0.5rem 1rem; background:#f5f3ff; border-radius:10px; border:1.5px solid #e0d4f5; margin-top:1.3rem;">
                            <input type="checkbox" id="client-discount" name="core_discount" style="width:18px; height:18px; cursor:pointer;">
                            <label for="client-discount" style="margin:0; cursor:pointer; font-weight:700; color:#7c3aed; font-size:0.85rem;">🏷️ Desconto CORE 15%</label>
                        </div>
                    </div>

                    <div style="margin-bottom: 1.5rem;">
                        <div style="display:flex; align-items:center; gap:0.75rem; padding:0.6rem 1rem; background:#eff6ff; border-radius:10px; border:1.5px solid #bfdbfe; cursor:pointer;" onclick="const cb = document.getElementById('client-extended-toggle'); cb.checked = !cb.checked; cb.dispatchEvent(new Event('change'));">
                            <input type="checkbox" id="client-extended-toggle" style="width:18px; height:18px; cursor:pointer; pointer-events:none;">
                            <label style="margin:0; cursor:pointer; font-weight:700; color:#1d4ed8; font-size:0.85rem;">📋 Dados Completos (CPF, Endereço, etc.)</label>
                        </div>
                        
                        <div id="client-extended-fields" style="display:none; margin-top:0.75rem; padding:1.25rem; background:#f8fafc; border:1.5px solid #e2e8f0; border-radius:12px;">
                            <div style="display:grid; grid-template-columns: 1fr 1.5fr; gap:1rem; margin-bottom:1rem;">
                                <div class="form-group">
                                    <label style="font-weight:700; font-size:0.8rem; color:#64748b;">CPF / CNPJ</label>
                                    <input type="text" name="cpf" id="client-cpf" placeholder="000.000.000-00" style="width:100%; padding:0.5rem; border:1px solid #cbd5e1; border-radius:8px;">
                                </div>
                                <div class="form-group">
                                    <label style="font-weight:700; font-size:0.8rem; color:#64748b;">CEP (Busca Automática)</label>
                                    <input type="text" name="zip_code" id="client-zip" placeholder="00000-000" style="width:100%; padding:0.5rem; border:1px solid #cbd5e1; border-radius:8px;">
                                </div>
                            </div>
                            <div class="form-group" style="margin-bottom:1rem;">
                                <label style="font-weight:700; font-size:0.8rem; color:#64748b;">Endereço</label>
                                <input type="text" name="address" id="client-address" style="width:100%; padding:0.5rem; border:1px solid #cbd5e1; border-radius:8px;">
                            </div>
                            <div style="display:grid; grid-template-columns: 2fr 1fr; gap:1rem;">
                                <div class="form-group">
                                    <label style="font-weight:700; font-size:0.8rem; color:#64748b;">Cidade</label>
                                    <input type="text" name="city" id="client-city" style="width:100%; padding:0.5rem; border:1px solid #cbd5e1; border-radius:8px;">
                                </div>
                                <div class="form-group">
                                    <label style="font-weight:700; font-size:0.8rem; color:#64748b;">Estado</label>
                                    <input type="text" name="state" id="client-state" maxlength="2" style="width:100%; padding:0.5rem; border:1px solid #cbd5e1; border-radius:8px; text-transform:uppercase;">
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Financial & Loyalty Section -->
                    <div style="background:#fffbeb; border:2px solid #fcd34d; border-radius:14px; padding:1.25rem; margin-bottom:1.5rem;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                            <div style="display:flex; align-items:center; gap:0.75rem;">
                                <input type="checkbox" id="client-loyalty-toggle" name="loyalty_status" style="width:20px; height:20px; cursor:pointer;">
                                <label for="client-loyalty-toggle" style="margin:0; cursor:pointer; font-weight:900; color:#92400e; font-size:1rem;">⭐ CONTA FIDELIDADE</label>
                            </div>
                            <div id="loyalty-tier-badge" style="display:none; padding:4px 12px; border-radius:20px; font-weight:900; font-size:0.7rem; border:2px solid;"></div>
                        </div>

                        <div id="client-loyalty-fields" style="display:none; border-top:1px solid #fde68a; padding-top:1rem;">
                            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1.25rem; margin-bottom:1.25rem;">
                                <div class="form-group">
                                    <label style="font-weight:800; color:#b45309; font-size:0.85rem; display:block; margin-bottom:0.4rem;">💰 Saldo Atual (R$)</label>
                                    <input type="number" name="credit_balance" id="client-credit-balance-input" step="0.01" style="width:100%; padding:0.75rem; border:2px solid #fcd34d; border-radius:10px; font-weight:900; font-size:1.1rem; color:#92400e; background:white;">
                                    <button type="button" id="btn-delete-loyalty" style="background:none; border:none; color:#ef4444; font-size:0.75rem; font-weight:800; cursor:pointer; padding:0.5rem 0; text-decoration:underline;" onmouseover="this.style.color='#b91c1c'" onmouseout="this.style.color='#ef4444'">🗑️ APAGAR CONTA FIDELIDADE</button>
                                </div>
                                <div class="form-group">
                                    <label style="font-weight:800; color:#b45309; font-size:0.85rem; display:block; margin-bottom:0.4rem;">💳 Limite / Faturamento</label>
                                    <div style="display:flex; gap:0.5rem;">
                                        <input type="number" id="client-credit-limit" name="credit_limit" placeholder="Limite" style="flex:1.5; padding:0.6rem; border:1px solid #fde68a; border-radius:8px;">
                                        <input type="number" id="client-billing-date" name="billing_date" placeholder="Dia" min="1" max="31" style="flex:1; padding:0.6rem; border:1px solid #fde68a; border-radius:8px;">
                                    </div>
                                </div>
                            </div>

                            <div id="loyalty-statement-section" style="display:none; background:white; border:1px solid #fde68a; border-radius:12px; overflow:hidden; margin-bottom:1.25rem;">
                                <div style="background:#fef3c7; padding:0.6rem 1rem; font-weight:900; color:#92400e; font-size:0.75rem; display:flex; justify-content:space-between;">
                                    <span>HISTÓRICO RECENTE</span>
                                    <span id="client-credit-balance-display">R$ 0,00</span>
                                </div>
                                <div id="credit-movements-list" style="max-height:180px; overflow-y:auto;"></div>
                            </div>

                            <!-- Credenciais dentro da Conta Fidelidade -->
                            <div id="access-info" style="display:none; padding:1rem; background:#f0fdf4; border:1.5px solid #bbf7d0; border-radius:12px; display:flex; justify-content:space-between; align-items:center;">
                                <div style="display:flex; gap:2rem;">
                                    <div>
                                        <div style="font-size:0.75rem; color:#065f46; font-weight:800; text-transform:uppercase;">Usuário Ativo</div>
                                        <div id="access-username-display" style="font-weight:900; color:#1e293b;">-</div>
                                    </div>
                                    <div id="access-password-container" style="display:none;">
                                        <div style="font-size:0.75rem; color:#065f46; font-weight:800; text-transform:uppercase;">Senha</div>
                                        <div id="access-password-display" style="font-weight:900; color:#1e293b; font-family:monospace;">-</div>
                                    </div>
                                </div>
                                <button type="button" id="btn-reset-access" style="background:white; color:#16a34a; border:1.5px solid #16a34a; padding:0.4rem 0.8rem; border-radius:8px; font-size:0.75rem; font-weight:800; cursor:pointer;">🔁 RESETAR SENHA</button>
                            </div>

                        </div>
                    </div>

                    <!-- Portal Access Toggle (apenas botão de ligar/desligar) -->
                    <div id="access-section" style="display:none; margin-bottom:1.5rem;">
                        <div style="display:flex; align-items:center; gap:0.75rem; padding:0.6rem 1rem; background:#f0fdf4; border-radius:10px; border:1.5px solid #86efac; cursor:pointer;" onclick="const cb = document.getElementById('client-access-toggle'); cb.checked = !cb.checked; cb.dispatchEvent(new Event('change'));">
                            <input type="checkbox" id="client-access-toggle" style="width:18px; height:18px; cursor:pointer; pointer-events:none;">
                            <label style="margin:0; cursor:pointer; font-weight:700; color:#065f46; font-size:0.85rem;">🔐 Acesso ao Portal (Financeiro Cliente)</label>
                        </div>
                    </div>

                    <!-- Portal Access Toggle -->
                    <div id="access-section" style="display:none; margin-bottom:1.5rem;">
                        <div style="display:flex; align-items:center; gap:0.75rem; padding:0.6rem 1rem; background:#f0fdf4; border-radius:10px; border:1.5px solid #86efac; cursor:pointer;" onclick="const cb = document.getElementById('client-access-toggle'); cb.checked = !cb.checked; cb.dispatchEvent(new Event('change'));">
                            <input type="checkbox" id="client-access-toggle" style="width:18px; height:18px; cursor:pointer; pointer-events:none;">
                            <label style="margin:0; cursor:pointer; font-weight:700; color:#065f46; font-size:0.85rem;">🔐 Acesso ao Portal (Financeiro Cliente)</label>
                        </div>

                    </div>

                    <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #e2e8f0; padding-top:1.5rem; margin-top:0.5rem;">
                        <button type="button" class="btn" id="btn-delete-client" style="background:#fee2e2; color:#b91c1c; border:1.5px solid #fca5a5; font-weight:800; display:none; padding:0.7rem 1.2rem; border-radius:10px;">🗑️ EXCLUIR CLIENTE</button>
                        <div style="display:flex; gap:0.75rem; margin-left:auto;">
                            <button type="button" class="btn btn-secondary modal-close-btn" style="padding:0.7rem 1.5rem; border-radius:10px; font-weight:700;">Cancelar</button>
                            <button type="submit" class="btn btn-primary" style="padding:0.7rem 2rem; border-radius:10px; font-weight:800; background:linear-gradient(135deg, var(--primary), #4c1d95); border:none; box-shadow:0 4px 12px rgba(139, 92, 246, 0.3);">SALVAR ALTERAÇÕES</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>

        <!-- Credentials Modal -->
        <div class="modal-overlay" id="credentials-modal">
            <div class="modal" style="max-width:450px">
                <div class="modal-header">
                    <h3>🔐 Acesso do Cliente Criado!</h3>
                    <button class="modal-close" id="cred-close">&times;</button>
                </div>
                <div style="padding:0.5rem 0;">
                    <p style="font-size:0.9rem; color:#475569; margin-bottom:1rem;">Anote as credenciais abaixo. A senha poderá ser consultada posteriormente por gerentes ou supervisores.</p>
                    <div style="background:#f0fdf4; border:2px solid #86efac; border-radius:10px; padding:1rem; margin-bottom:1rem;">
                        <div style="margin-bottom:0.75rem;">
                            <div style="font-size:0.8rem; color:#6b7280; margin-bottom:2px;">👤 Login</div>
                            <div style="font-size:1.1rem; font-weight:700; color:#065f46; font-family:monospace; background:white; padding:0.4rem 0.6rem; border-radius:6px; border:1px solid #d1fae5;" id="cred-username">-</div>
                        </div>
                        <div style="margin-bottom:0.75rem;">
                            <div style="font-size:0.8rem; color:#6b7280; margin-bottom:2px;">🔑 Senha</div>
                            <div style="font-size:1.1rem; font-weight:700; color:#065f46; font-family:monospace; background:white; padding:0.4rem 0.6rem; border-radius:6px; border:1px solid #d1fae5;" id="cred-password">-</div>
                        </div>
                        <div>
                            <div style="font-size:0.8rem; color:#6b7280; margin-bottom:2px;">🔗 Link de Acesso</div>
                            <div style="font-size:0.95rem; font-weight:600; color:#1d4ed8; font-family:monospace; background:white; padding:0.4rem 0.6rem; border-radius:6px; border:1px solid #dbeafe; word-break:break-all;" id="cred-link">-</div>
                        </div>
                    </div>
                    <button class="btn btn-primary" id="btn-copy-creds" style="width:100%;">📋 Copiar Dados</button>
                </div>
            </div>
        </div>
    `;

    let currentEditClient = null;
    let clientsData = [];

    const renderClientsList = () => {
        const searchInput = container.querySelector('#client-search');
        const coreFilter = container.querySelector('#client-core-filter');
        
        const term = searchInput ? searchInput.value.toLowerCase() : '';
        const isCoreOnly = coreFilter ? coreFilter.checked : false;

        const filtered = clientsData.filter(c => {
            const matchSearch = c.name.toLowerCase().includes(term) || 
                               (c.phone && c.phone.toLowerCase().includes(term)) ||
                               (c.cpf && c.cpf.toLowerCase().includes(term));
            const matchCore = isCoreOnly ? c.origin === 'CORE' : true;
            return matchSearch && matchCore;
        }).sort((a, b) => {
            if (a.loyalty_status && !b.loyalty_status) return -1;
            if (!a.loyalty_status && b.loyalty_status) return 1;
            return a.name.localeCompare(b.name);
        });

        const tbody = container.querySelector('#clients-list');
        if (!tbody) return;

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="padding: 4rem; text-align: center; color: #94a3b8; font-weight: 500; font-size:1.1rem;">Nenhum cliente encontrado.</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map(c => {
            const isPremium = c.loyalty_status ? true : false;
            const rowStyle = isPremium ? 'background: linear-gradient(to right, #fffbeb, #ffffff); border-left: 4px solid #f59e0b; box-shadow: 0 2px 8px rgba(245, 158, 11, 0.15); position: relative; z-index: 1;' : '';
            return `
            <tr style="${rowStyle}">
                <td>
                    <div style="font-weight: 800; color: #1e1b4b; font-size: 1.05rem;">${c.name}</div>
                </td>
                <td style="color: #475569; font-weight: 600; font-size: 0.95rem;">${c.phone || '-'}</td>
                <td>
                    <span style="background: ${c.origin === 'CORE' ? 'rgba(139, 92, 246, 0.1)' : '#f1f5f9'}; color: ${c.origin === 'CORE' ? 'var(--primary)' : '#475569'}; padding: 6px 12px; border-radius: 8px; font-size: 0.8rem; font-weight: 800; letter-spacing:0.05em; text-transform:uppercase;">
                        ${c.origin || '-'}
                    </span>
                </td>
                <td>${c.core_discount ? '<span style="background:#fef2f2; color:#ef4444; padding:6px 12px; border-radius:8px; font-size:0.8rem; font-weight:800; border:1px solid #fecaca; box-shadow:0 2px 5px rgba(239, 68, 68, 0.1);">🤑 15% OFF</span>' : ''}
                    ${(() => {
                        if (!c.loyalty_status) return '';
                        const tier = c.loyalty_tier || 'bronze';
                        if (tier === 'ouro') return '<span style="background:linear-gradient(135deg, #f59e0b, #b45309); color:white; padding:4px 8px; border-radius:8px; font-size:0.7rem; font-weight:900; display:block; margin-top:4px;">🏆 VIP OURO</span>';
                        if (tier === 'prata') return '<span style="background:linear-gradient(135deg, #94a3b8, #64748b); color:white; padding:4px 8px; border-radius:8px; font-size:0.7rem; font-weight:900; display:block; margin-top:4px;">🥈 PRATA</span>';
                        return '<span style="background:#fff7ed; color:#b45309; border:1px solid #fde68a; padding:4px 8px; border-radius:8px; font-size:0.7rem; font-weight:900; display:block; margin-top:4px;">🥉 BRONZE</span>';
                    })()}
                </td>
                <td>${c.has_access
                    ? '<span style="background:#f0fdf4; color:#16a34a; padding:6px 12px; border-radius:8px; font-size:0.8rem; font-weight:800; border:1px solid #bbf7d0; box-shadow:0 2px 5px rgba(22, 163, 74, 0.1);">🔐 ATIVO</span>'
                    : '<span style="color:#cbd5e1; font-weight:bold;">—</span>'
                }</td>
                <td style="text-align:right;">
                    <button class="btn btn-sm edit-btn" data-json='${JSON.stringify(c).replace(/'/g, "&#39;")}' style="background:#fff; color:var(--primary); font-weight:800; border:2px solid #e2e8f0; border-radius:8px; padding:0.5rem 1rem; cursor:pointer; transition:all 0.2s; box-shadow:0 2px 4px rgba(0,0,0,0.02);" onmouseover="this.style.background='var(--primary)'; this.style.color='white'; this.style.borderColor='var(--primary)'" onmouseout="this.style.background='#fff'; this.style.color='var(--primary)'; this.style.borderColor='#e2e8f0'">Editar</button>
                </td>
            </tr>
            `;
        }).join('');

        tbody.querySelectorAll('.edit-btn').forEach(btn => {
            btn.onclick = () => openEditModal(JSON.parse(btn.dataset.json));
        });
    };

    const loadClients = async () => {
        try {
            const res = await fetch('/api/clients');
            const { data } = await res.json();
            clientsData = data || [];
            renderClientsList();
        } catch (e) {
            console.error(e);
        }
    };

    // Bind Search & Filter Events
    setTimeout(() => {
        const searchInput = container.querySelector('#client-search');
        const coreFilter = container.querySelector('#client-core-filter');
        if (searchInput) searchInput.addEventListener('input', renderClientsList);
        if (coreFilter) coreFilter.addEventListener('change', renderClientsList);
        
        // Focus state styling for search input
        if (searchInput) {
            searchInput.addEventListener('focus', () => searchInput.style.borderColor = 'var(--primary)');
            searchInput.addEventListener('blur', () => searchInput.style.borderColor = '#cbd5e1');
        }
    }, 0);

    const modal = container.querySelector('#client-modal');
    const form = container.querySelector('#client-form');
    const deleteBtn = container.querySelector('#btn-delete-client');
    const credModal = container.querySelector('#credentials-modal');

    // Extended fields toggle
    const extendedToggle = container.querySelector('#client-extended-toggle');
    const extendedFields = container.querySelector('#client-extended-fields');
    extendedToggle.onchange = () => {
        extendedFields.style.display = extendedToggle.checked ? 'block' : 'none';
    };

    // Loyalty toggle
    const loyaltyToggle = container.querySelector('#client-loyalty-toggle');
    const loyaltyFields = container.querySelector('#client-loyalty-fields');
    loyaltyToggle.onchange = () => {
        loyaltyFields.style.display = loyaltyToggle.checked ? 'block' : 'none';
    };

    const loadCreditStatement = async (clientId) => {
        const listEl = container.querySelector('#credit-movements-list');
        listEl.innerHTML = '<div style="padding:1rem; text-align:center; color:#94a3b8; font-size:0.85rem;">Carregando...</div>';
        try {
            const res = await fetch(`/api/clients/${clientId}/credit-movements`);
            const { data } = await res.json();
            if (!data || data.length === 0) {
                listEl.innerHTML = '<div style="padding:1rem; text-align:center; color:#94a3b8;">Nenhuma compra registrada.</div>';
                return;
            }
            listEl.innerHTML = data.map(m => {
                const isCredit = m.type === 'payment_credit';
                const color = isCredit ? '#10b981' : '#ef4444';
                const sign  = isCredit ? '+' : '-';
                const date  = new Date(m.created_at).toLocaleDateString('pt-BR');
                return `
                    <div style="padding:0.75rem; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center;">
                        <div style="display:flex; flex-direction:column; gap:0.2rem;">
                            <span style="font-weight:700; color:#334155; font-size:0.85rem;">${m.description || 'Lançamento'}</span>
                            <span style="font-size:0.7rem; color:#94a3b8; font-weight:600;">${date}</span>
                        </div>
                        <div style="display:flex; align-items:center; gap:0.75rem;">
                            <span style="font-weight:900; color:${color}; font-size:0.9rem;">${sign} R$ ${parseFloat(m.amount).toFixed(2).replace('.', ',')}</span>
                            <button class="btn-delete-movement" data-id="${m.id}" style="background:none; border:none; color:#cbd5e1; cursor:pointer; padding:0.2rem; font-size:0.9rem;" title="Apagar transação" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#cbd5e1'">🗑️</button>
                        </div>
                    </div>
                `;
            }).join('');

            listEl.querySelectorAll('.btn-delete-movement').forEach(btn => {
                btn.onclick = async () => {
                    if (!confirm('Deseja realmente apagar este lançamento? O saldo será recalculado.')) return;
                    try {
                        const res = await fetch(`/api/clients/movements/${btn.dataset.id}`, { method: 'DELETE' });
                        if (res.ok) {
                            loadCreditStatement(clientId);
                            // Refresh balance display
                            const clientRes = await fetch('/api/clients');
                            const { data: clients } = await clientRes.json();
                            const updatedClient = clients.find(c => c.id == clientId);
                            if (updatedClient) {
                                container.querySelector('#client-credit-balance-display').textContent = `R$ ${parseFloat(updatedClient.credit_balance || 0).toFixed(2).replace('.', ',')}`;
                                container.querySelector('#client-credit-balance-input').value = updatedClient.credit_balance;
                            }
                        }
                    } catch (e) { alert('Erro ao apagar: ' + e.message); }
                };
            });
        } catch (e) { console.error(e); }
    };

    // ── CEP auto-fill via ViaCEP ──────────────────────────────────────────
    const zipInput     = container.querySelector('#client-zip');
    const addressInput = container.querySelector('#client-address');
    const cityInput    = container.querySelector('#client-city');
    const stateInput   = container.querySelector('#client-state');

    const fetchCep = async (cep) => {
        const digits = cep.replace(/\D/g, '');
        if (digits.length !== 8) return;

        zipInput.style.borderColor = '#f59e0b';
        zipInput.title = 'Buscando...';

        try {
            const res  = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
            const data = await res.json();

            if (data.erro) {
                zipInput.style.borderColor = '#dc2626';
                zipInput.title = 'CEP não encontrado';
                return;
            }

            // Auto-open extended fields if not already open
            if (!extendedToggle.checked) {
                extendedToggle.checked = true;
                extendedFields.style.display = 'block';
            }

            // Fill fields — preserve number/complement if address already typed
            const currentAddr = addressInput.value.trim();
            addressInput.value = data.logradouro
                ? (currentAddr && !currentAddr.startsWith(data.logradouro) ? data.logradouro : data.logradouro)
                : currentAddr;

            // Bairro goes into address as suffix if logradouro exists, else standalone
            if (data.bairro && !addressInput.value.includes(data.bairro)) {
                addressInput.value = addressInput.value
                    ? `${addressInput.value}, ${data.bairro}`
                    : data.bairro;
            }

            cityInput.value  = data.localidade || '';
            stateInput.value = data.uf || '';

            zipInput.style.borderColor = '#22c55e';
            zipInput.title = `${data.localidade} - ${data.uf}`;
        } catch {
            zipInput.style.borderColor = '#dc2626';
            zipInput.title = 'Erro ao buscar CEP';
        }
    };

    zipInput.addEventListener('blur', () => fetchCep(zipInput.value));
    zipInput.addEventListener('input', () => {
        const digits = zipInput.value.replace(/\D/g, '');
        // Auto-format: 00000-000
        if (digits.length <= 8) {
            zipInput.value = digits.length > 5
                ? digits.slice(0,5) + '-' + digits.slice(5)
                : digits;
        }
        if (digits.length === 8) fetchCep(digits);
    });


    // Access toggle handler
    const accessToggle = container.querySelector('#client-access-toggle');
    accessToggle.onchange = async () => {
        if (!currentEditClient) return;

        if (accessToggle.checked) {
            // Enable access
            try {
                const res = await fetch(`/api/clients/${currentEditClient.id}/toggle-access`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ enable: true })
                });
                const json = await res.json();
                if (res.ok) {
                    // Show credentials modal
                    container.querySelector('#cred-username').textContent = json.username;
                    container.querySelector('#cred-password').textContent = json.password;
                    container.querySelector('#cred-link').textContent = json.link;
                    credModal.classList.add('open');

                    // Update access info
                    container.querySelector('#access-info').style.display = 'flex';
                    container.querySelector('#access-username-display').textContent = json.username;
                    currentEditClient.has_access = true;
                    currentEditClient.access_username = json.username;
                    currentEditClient.access_password = json.password; // update local data

                    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                    const canSeePassword = ['master', 'gerente', 'supervisor'].includes(currentUser.role);
                    const pwdContainer = container.querySelector('#access-password-container');
                    if (pwdContainer) {
                        if (canSeePassword) {
                            pwdContainer.style.display = 'block';
                            container.querySelector('#access-password-display').textContent = json.password;
                        }
                    }
                } else {
                    alert('Erro: ' + (json.error || 'Falha ao criar acesso'));
                    accessToggle.checked = false;
                }
            } catch (e) {
                alert('Erro de conexão: ' + e.message);
                accessToggle.checked = false;
            }
        } else {
            // Disable access
            if (!confirm('Tem certeza que deseja remover o acesso financeiro deste cliente?')) {
                accessToggle.checked = true;
                return;
            }
            try {
                const res = await fetch(`/api/clients/${currentEditClient.id}/toggle-access`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ enable: false })
                });
                if (res.ok) {
                    container.querySelector('#access-info').style.display = 'none';
                    currentEditClient.has_access = false;
                    currentEditClient.access_username = null;
                } else {
                    accessToggle.checked = true;
                }
            } catch (e) {
                accessToggle.checked = true;
            }
        }
    };

    // Copy credentials button
    container.querySelector('#btn-copy-creds').onclick = () => {
        const username = container.querySelector('#cred-username').textContent;
        const password = container.querySelector('#cred-password').textContent;
        const link = container.querySelector('#cred-link').textContent;
        const text = `Login: ${username}\nSenha: ${password}\nLink: ${link}`;
        window.copyTextToClipboard(text).then(() => {
            container.querySelector('#btn-copy-creds').textContent = '✅ Copiado!';
            setTimeout(() => {
                container.querySelector('#btn-copy-creds').textContent = '📋 Copiar Dados';
            }, 2000);
        });
    };

    container.querySelector('#cred-close').onclick = () => credModal.classList.remove('open');

    // Helper to show credentials modal
    const showCredentials = (data) => {
        container.querySelector('#cred-username').textContent = data.username;
        container.querySelector('#cred-password').textContent = data.password;
        container.querySelector('#cred-link').textContent = data.link;
        credModal.classList.add('open');
    };

    // Reset access button inside access-info
    container.querySelector('#btn-reset-access').onclick = async () => {
        if (!currentEditClient) return;
        if (!confirm(`Isso vai gerar uma NOVA senha para o cliente "${currentEditClient.name}". A senha antiga será invalidada. Continuar?`)) return;
        try {
            const res  = await fetch(`/api/clients/${currentEditClient.id}/reset-access`, { method: 'POST' });
            const json = await res.json();
            if (res.ok) {
                showCredentials(json);
                currentEditClient.access_password = json.password;
                container.querySelector('#access-password-display').textContent = json.password;
            } else {
                alert('Erro: ' + (json.error || 'Falha ao resetar acesso'));
            }
        } catch (e) {
            alert('Erro de conexão: ' + e.message);
        }
    };

    const openNewModal = () => {
        form.reset();
        currentEditClient = null;
        container.querySelector('#client-id').value = '';
        container.querySelector('#client-discount').checked = false;
        extendedToggle.checked = false;
        extendedFields.style.display = 'none';
        container.querySelector('#access-section').style.display = 'none';
        container.querySelector('#client-modal-title').textContent = 'Novo Cliente';
        loyaltyToggle.checked = false;
        loyaltyFields.style.display = 'none';
        container.querySelector('#loyalty-tier-badge').style.display = 'none';
        container.querySelector('#loyalty-statement-section').style.display = 'none';
        deleteBtn.style.display = 'none';
        modal.classList.add('open');
    };

    const openEditModal = (client) => {
        currentEditClient = client;
        container.querySelector('#client-id').value = client.id;
        container.querySelector('#client-name').value = client.name;
        container.querySelector('#client-phone').value = client.phone || '';
        container.querySelector('#client-origin').value = client.origin || 'Balcão';
        container.querySelector('#client-discount').checked = client.core_discount ? true : false;
        // Extended fields
        const hasExtended = !!(client.cpf || client.address || client.city || client.state || client.zip_code);
        extendedToggle.checked = hasExtended;
        extendedFields.style.display = hasExtended ? 'block' : 'none';
        container.querySelector('#client-cpf').value = client.cpf || '';
        container.querySelector('#client-address').value = client.address || '';
        container.querySelector('#client-city').value = client.city || '';
        container.querySelector('#client-state').value = client.state || '';
        container.querySelector('#client-zip').value = client.zip_code || '';

        // Access section (only for edit)
        const accessSection = container.querySelector('#access-section');
        accessSection.style.display = 'block';
        accessToggle.checked = client.has_access ? true : false;
        const accessInfo = container.querySelector('#access-info');
        if (client.has_access) {
            accessInfo.style.display = 'flex';
            container.querySelector('#access-username-display').textContent = client.access_username || '-';
            
            const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
            const canSeePassword = ['master', 'gerente', 'supervisor'].includes(currentUser.role);
            const pwdContainer = container.querySelector('#access-password-container');
            if (pwdContainer) {
                if (canSeePassword) {
                    pwdContainer.style.display = 'block';
                    container.querySelector('#access-password-display').textContent = client.access_password || '******';
                } else {
                    pwdContainer.style.display = 'none';
                }
            }
        } else {
            accessInfo.style.display = 'none';
        }

        // Loyalty setup
        loyaltyToggle.checked = !!client.loyalty_status;
        loyaltyFields.style.display = client.loyalty_status ? 'block' : 'none';
        container.querySelector('#client-credit-limit').value = client.credit_limit || 0;
        container.querySelector('#client-billing-date').value = client.billing_date || 1;
        container.querySelector('#client-credit-balance-input').value = client.credit_balance || 0;

        const tierBadge = container.querySelector('#loyalty-tier-badge');
        const statementSection = container.querySelector('#loyalty-statement-section');
        
        if (client.loyalty_status) {
            statementSection.style.display = 'block';
            container.querySelector('#client-credit-balance-display').textContent = `R$ ${parseFloat(client.credit_balance || 0).toFixed(2).replace('.', ',')}`;
            loadCreditStatement(client.id);

            const tier = client.loyalty_tier || 'bronze';
            tierBadge.style.display = 'block';
            if (tier === 'ouro') {
                tierBadge.innerHTML = '🏆 PARCEIRO VIP OURO (15% OFF)';
                tierBadge.style.borderColor = '#f59e0b';
                tierBadge.style.color = '#b45309';
            } else if (tier === 'prata') {
                tierBadge.innerHTML = '🥈 CLIENTE PRATA (10% OFF)';
                tierBadge.style.borderColor = '#94a3b8';
                tierBadge.style.color = '#475569';
            } else {
                tierBadge.innerHTML = '🥉 CLIENTE BRONZE (5% OFF)';
                tierBadge.style.borderColor = '#d97706';
                tierBadge.style.color = '#92400e';
            }
        } else {
            tierBadge.style.display = 'none';
            statementSection.style.display = 'none';
        }

        container.querySelector('#client-modal-title').textContent = 'Editar Cliente';
        deleteBtn.style.display = 'inline-block';
        deleteBtn.dataset.id = client.id;
        modal.classList.add('open');
    };

    const closeModal = () => modal.classList.remove('open');

    container.querySelector('#btn-new-client').onclick = openNewModal;
    container.querySelector('.modal-close').onclick = closeModal;
    container.querySelector('.modal-close-btn').onclick = closeModal;

    const deleteLoyaltyBtn = container.querySelector('#btn-delete-loyalty');
    deleteLoyaltyBtn.onclick = async () => {
        if (!currentEditClient) return;
        if (!confirm('Deseja apagar a conta fidelidade? O saldo será zerado e o acesso revogado.')) return;
        try {
            const res = await fetch(`/api/clients/${currentEditClient.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    loyalty_status: 0,
                    loyalty_tier: 'bronze',
                    credit_balance: 0,
                    credit_limit: 0,
                    has_access: 0,
                    access_username: null
                })
            });
            if (res.ok) { closeModal(); loadClients(); }
        } catch (e) { alert('Erro: ' + e.message); }
    };

    // Delete client
    deleteBtn.onclick = async () => {
        if (!confirm('Tem certeza que deseja excluir este cliente?')) return;
        await fetch(`/api/clients/${deleteBtn.dataset.id}`, { method: 'DELETE' });
        closeModal();
        loadClients();
    };

    // Save (create or update)
    form.onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const body = Object.fromEntries(formData);
        body.core_discount = container.querySelector('#client-discount').checked ? 1 : 0;
        const id = body.id;

        const url = id
            ? `/api/clients/${id}`
            : '/api/clients';
        const method = id ? 'PUT' : 'POST';

        if (!id) delete body.id;

        await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        closeModal();
        loadClients();
    };

    loadClients();
    return container;
};
