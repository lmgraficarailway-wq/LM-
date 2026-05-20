export const render = () => {
    const container = document.createElement('div');
    container.innerHTML = `
        <!-- Header -->
        <!-- Header -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 2rem;">
            <div style="display:flex; flex-direction:column; gap:0.2rem;">
                <h2 style="font-size: 1.8rem; font-weight: 900; background: linear-gradient(135deg, var(--primary), #4c1d95); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin:0; letter-spacing: -0.03em;">🏭 Fornecedores</h2>
                <p style="color: #64748b; margin: 0; font-size: 0.95rem; font-weight:500; white-space: nowrap;">Gerencie os fornecedores e parceiros da empresa.</p>
            </div>
            <button class="btn btn-primary" id="btn-new-supplier" style="padding: 0.8rem 1.5rem; border-radius: 12px; font-weight:800; text-transform:uppercase; letter-spacing:0.05em; display:flex; align-items:center; gap:0.5rem; box-shadow:0 4px 15px rgba(139, 92, 246, 0.3); transition:all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
                <span style="font-size:1.2rem; line-height:1;">＋</span> NOVO FORNECEDOR
            </button>
        </div>

        <!-- Search bar -->
        <div style="max-width:380px; margin-bottom:1.5rem; position:relative;">
            <span style="position:absolute; left:0.75rem; top:50%; transform:translateY(-50%); color:#94a3b8; font-size:1rem">🔍</span>
            <input type="text" id="supplier-search" placeholder="Buscar fornecedor..." style="width:100%; padding:0.55rem 0.75rem 0.55rem 2.2rem; border:1px solid var(--border); border-radius:8px; font-size:0.9rem; background:#fff; color:#334155; box-sizing:border-box;">
        </div>

        <!-- Cards Grid -->
        <div id="suppliers-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(290px, 1fr)); gap:1rem; padding-bottom:2rem;">
            <div style="grid-column:1/-1; text-align:center; color:#94a3b8; padding:3rem 0">Carregando...</div>
        </div>

        <!-- Modal -->
        <div class="modal-overlay" id="supplier-modal">
            <div class="modal" style="max-width:500px; border-radius:14px; overflow:hidden; padding:0;">

                <!-- Modal Header Band -->
                <div style="background:linear-gradient(135deg, var(--primary), var(--primary-hover)); padding:1.25rem 1.5rem; display:flex; justify-content:space-between; align-items:center;">
                    <h3 id="supplier-modal-title" style="margin:0; color:#fff; font-size:1.1rem; font-weight:700">🏭 Novo Fornecedor</h3>
                    <button id="supplier-modal-close" style="background:rgba(255,255,255,0.2); border:none; color:#fff; border-radius:50%; width:30px; height:30px; cursor:pointer; font-size:1.1rem; display:flex; align-items:center; justify-content:center;">&times;</button>
                </div>

                <form id="supplier-form" style="padding:1.5rem; display:flex; flex-direction:column; gap:1rem;">
                    <input type="hidden" id="supplier-id">

                    <div>
                        <label style="display:block; font-size:0.8rem; font-weight:600; color:#64748b; margin-bottom:0.3rem; text-transform:uppercase; letter-spacing:0.05em">Nome da Empresa *</label>
                        <input type="text" id="supplier-name" required placeholder="Ex: Gráfica ABC Ltda"
                            style="width:100%; padding:0.6rem 0.85rem; border:1.5px solid var(--border); border-radius:8px; font-size:0.95rem; color:#334155; box-sizing:border-box; transition:border-color 0.2s;"
                            onfocus="this.style.borderColor='var(--primary)'" onblur="this.style.borderColor='var(--border)'">
                    </div>

                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.8rem;">
                        <div>
                            <label style="display:block; font-size:0.8rem; font-weight:600; color:#64748b; margin-bottom:0.3rem; text-transform:uppercase; letter-spacing:0.05em">Telefone</label>
                            <input type="text" id="supplier-phone" placeholder="(11) 99999-9999"
                                style="width:100%; padding:0.6rem 0.85rem; border:1.5px solid var(--border); border-radius:8px; font-size:0.95rem; color:#334155; box-sizing:border-box; transition:border-color 0.2s;"
                                onfocus="this.style.borderColor='var(--primary)'" onblur="this.style.borderColor='var(--border)'">
                        </div>
                        <div>
                            <label style="display:block; font-size:0.8rem; font-weight:600; color:#64748b; margin-bottom:0.3rem; text-transform:uppercase; letter-spacing:0.05em">Site</label>
                            <input type="text" id="supplier-website" placeholder="www.exemplo.com.br"
                                style="width:100%; padding:0.6rem 0.85rem; border:1.5px solid var(--border); border-radius:8px; font-size:0.95rem; color:#334155; box-sizing:border-box; transition:border-color 0.2s;"
                                onfocus="this.style.borderColor='var(--primary)'" onblur="this.style.borderColor='var(--border)'">
                        </div>
                    </div>

                    <div>
                        <label style="display:block; font-size:0.8rem; font-weight:600; color:#64748b; margin-bottom:0.3rem; text-transform:uppercase; letter-spacing:0.05em">Descrição / Ramo de Atividade</label>
                        <textarea id="supplier-description" rows="3" placeholder="Ex: Fornecedor de papel couché, impressão offset, acabamentos..."
                            style="width:100%; padding:0.6rem 0.85rem; border:1.5px solid var(--border); border-radius:8px; font-size:0.95rem; color:#334155; box-sizing:border-box; resize:vertical; transition:border-color 0.2s; font-family:inherit;"
                            onfocus="this.style.borderColor='var(--primary)'" onblur="this.style.borderColor='var(--border)'"></textarea>
                    </div>

                    <button type="submit" class="btn btn-primary" style="width:100%; padding:0.75rem; font-size:1rem; font-weight:600; border-radius:8px; margin-top:0.25rem; box-shadow:0 2px 8px rgba(124,58,237,0.3);">
                        💾 Salvar Fornecedor
                    </button>
                </form>
            </div>
        </div>
    `;

    const modal = container.querySelector('#supplier-modal');
    const form = container.querySelector('#supplier-form');
    let allSuppliers = [];

    // ── Helpers ──────────────────────────────────────────────────────────
    const avatarColor = (name) => {
        const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#ef4444', '#10b981', '#3b82f6'];
        let h = 0;
        for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % colors.length;
        return colors[h];
    };

    const initials = (name) => name.trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

    const formatDate = (iso) => iso ? window.parseDBDate(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—';

    const openModal = (supplier = null) => {
        const title = container.querySelector('#supplier-modal-title');
        if (supplier) {
            title.textContent = '✏️ Editar Fornecedor';
            container.querySelector('#supplier-id').value = supplier.id;
            container.querySelector('#supplier-name').value = supplier.name || '';
            container.querySelector('#supplier-phone').value = supplier.phone || '';
            container.querySelector('#supplier-website').value = supplier.website || '';
            container.querySelector('#supplier-description').value = supplier.description || '';
        } else {
            title.textContent = '🏭 Novo Fornecedor';
            container.querySelector('#supplier-id').value = '';
            form.reset();
        }
        modal.classList.add('open');
    };

    const closeModal = () => modal.classList.remove('open');

    // ── Render Cards ─────────────────────────────────────────────────────
    const renderCards = (list) => {
        const grid = container.querySelector('#suppliers-grid');

        if (!list || list.length === 0) {
            grid.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; padding:4rem 1rem;">
                    <div style="font-size:3rem; margin-bottom:0.75rem">🏭</div>
                    <p style="color:#94a3b8; font-size:1rem; margin:0">Nenhum fornecedor cadastrado ainda.</p>
                    <p style="color:#cbd5e1; font-size:0.85rem; margin:0.25rem 0 0">Clique em <b>+ Novo Fornecedor</b> para começar.</p>
                </div>`;
            return;
        }

        grid.innerHTML = list.map(s => {
            const color = avatarColor(s.name);
            const abbr = initials(s.name);
            const websiteUrl = s.website ? (s.website.startsWith('http') ? s.website : 'https://' + s.website) : null;
            return `
            <div class="supplier-card" data-id="${s.id}"
                style="background:#fff; border:1px solid var(--border); border-radius:12px; padding:1.25rem; display:flex; flex-direction:column; gap:0.75rem; box-shadow:0 1px 4px rgba(0,0,0,0.06); transition:box-shadow 0.2s, transform 0.15s; cursor:default;"
                onmouseenter="this.style.boxShadow='0 4px 20px rgba(0,0,0,0.1)'; this.style.transform='translateY(-2px)'"
                onmouseleave="this.style.boxShadow='0 1px 4px rgba(0,0,0,0.06)'; this.style.transform='translateY(0)'">

                <!-- Top row: avatar + name + actions -->
                <div style="display:flex; align-items:flex-start; gap:0.85rem;">
                    <div style="width:46px; height:46px; border-radius:12px; background:${color}; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:1rem; flex-shrink:0;">
                        ${abbr}
                    </div>
                    <div style="flex:1; min-width:0;">
                        <div style="font-weight:700; font-size:1rem; color:#1e293b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${s.name}</div>
                        <div style="font-size:0.78rem; color:#94a3b8; margin-top:1px;">Cadastrado em ${formatDate(s.created_at)}</div>
                    </div>
                    <div style="display:flex; gap:0.3rem; flex-shrink:0;">
                        <button class="edit-btn" title="Editar"
                            data-id="${s.id}" data-name="${s.name}" data-phone="${s.phone || ''}" data-website="${s.website || ''}" data-description="${(s.description || '').replace(/"/g, '&quot;')}"
                            style="background:#f1f5f9; border:none; border-radius:7px; width:30px; height:30px; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:0.9rem; transition:background 0.15s;"
                            onmouseenter="this.style.background='#e2e8f0'" onmouseleave="this.style.background='#f1f5f9'">✏️</button>
                        <button class="delete-btn" title="Excluir"
                            data-id="${s.id}" data-name="${s.name}"
                            style="background:#fef2f2; border:none; border-radius:7px; width:30px; height:30px; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:0.9rem; transition:background 0.15s;"
                            onmouseenter="this.style.background='#fee2e2'" onmouseleave="this.style.background='#fef2f2'">🗑️</button>
                    </div>
                </div>

                <!-- Description tag -->
                ${s.description ? `
                <div style="background:linear-gradient(135deg,#f8fafc,#f1f5f9); border:1px solid #e2e8f0; border-radius:8px; padding:0.5rem 0.75rem; font-size:0.85rem; color:#475569; line-height:1.4;">
                    ${s.description}
                </div>` : ''}

                <!-- Info chips -->
                <div style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-top:auto;">
                    ${s.phone ? (() => {
                    const digits = s.phone.replace(/\D/g, '');
                    const waNum = digits.startsWith('55') ? digits : '55' + digits;
                    return `<a href="#" onclick="fetch('/api/open-edge',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:'https://web.whatsapp.com/send?phone=${waNum}'})}).catch(()=>{}); return false;" title="Abrir no WhatsApp Web (Edge)"
                            style="display:inline-flex; align-items:center; gap:0.3rem; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:20px; padding:3px 10px; font-size:0.8rem; color:#166534; text-decoration:none; cursor:pointer; transition:background 0.15s;"
                            onmouseenter="this.style.background='#dcfce7'" onmouseleave="this.style.background='#f0fdf4'">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" style="width:13px;height:13px;vertical-align:middle;" onerror="this.style.display='none'"> ${s.phone}
                        </a>`;
                })() : ''}
                    ${websiteUrl ? `<a href="${websiteUrl}" target="_blank" style="display:inline-flex; align-items:center; gap:0.3rem; background:#eff6ff; border:1px solid #bfdbfe; border-radius:20px; padding:3px 10px; font-size:0.8rem; color:#1d4ed8; text-decoration:none;">🔗 ${s.website}</a>` : ''}
                    ${!s.phone && !websiteUrl ? `<span style="font-size:0.8rem; color:#cbd5e1; font-style:italic;">Sem contato cadastrado</span>` : ''}
                </div>
            </div>`;
        }).join('');

        // Bind buttons
        grid.querySelectorAll('.edit-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                openModal({
                    id: btn.dataset.id, name: btn.dataset.name,
                    phone: btn.dataset.phone, website: btn.dataset.website,
                    description: btn.dataset.description
                });
            };
        });

        grid.querySelectorAll('.delete-btn').forEach(btn => {
            btn.onclick = async (e) => {
                e.stopPropagation();
                if (!confirm(`Excluir o fornecedor "${btn.dataset.name}"?`)) return;
                try {
                    const r = await fetch(`/api/suppliers/${btn.dataset.id}`, { method: 'DELETE' });
                    const json = await r.json();
                    if (r.ok) loadSuppliers();
                    else alert('Erro: ' + (json.error || 'Falha ao excluir'));
                } catch (e) { alert('Erro de conexão: ' + e.message); }
            };
        });
    };

    // ── Load Data ────────────────────────────────────────────────────────
    const loadSuppliers = async () => {
        const grid = container.querySelector('#suppliers-grid');
        grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:#94a3b8; padding:3rem 0">Carregando...</div>`;
        try {
            const res = await fetch('/api/suppliers');
            const { data } = await res.json();
            allSuppliers = data || [];
            renderCards(allSuppliers);
        } catch (e) {
            grid.innerHTML = `<div style="grid-column:1/-1; color:red; text-align:center">Erro: ${e.message}</div>`;
        }
    };

    // ── Events ───────────────────────────────────────────────────────────
    container.querySelector('#btn-new-supplier').onclick = () => openModal();
    container.querySelector('#supplier-modal-close').onclick = closeModal;
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    const removeAccents = (str) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    container.querySelector('#supplier-search').oninput = (e) => {
        const q = removeAccents(e.target.value.toLowerCase().trim());
        renderCards(!q ? allSuppliers : allSuppliers.filter(s =>
            removeAccents(s.name.toLowerCase()).includes(q) ||
            removeAccents((s.description || '').toLowerCase()).includes(q) ||
            (s.phone || '').includes(q)
        ));
    };

    form.onsubmit = async (e) => {
        e.preventDefault();
        const id = container.querySelector('#supplier-id').value;
        const payload = {
            name: container.querySelector('#supplier-name').value.trim(),
            phone: container.querySelector('#supplier-phone').value.trim(),
            website: container.querySelector('#supplier-website').value.trim(),
            description: container.querySelector('#supplier-description').value.trim()
        };
        try {
            const isEdit = !!id;
            const res = await fetch(isEdit ? `/api/suppliers/${id}` : '/api/suppliers', {
                method: isEdit ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const json = await res.json();
            if (res.ok) { closeModal(); loadSuppliers(); }
            else alert('Erro: ' + (json.error || 'Falha ao salvar'));
        } catch (err) { alert('Erro de conexão: ' + err.message); }
    };

    loadSuppliers();
    return container;
};
