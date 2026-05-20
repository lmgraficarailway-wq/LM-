export const render = () => {
    const container = document.createElement('div');
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const canEdit = !['vendedor'].includes(currentUser.role);

    container.innerHTML = `
        <!-- Header -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 2rem;">
            <div style="display:flex; flex-direction:column; gap:0.2rem;">
                <h2 style="font-size: 1.8rem; font-weight: 900; background: linear-gradient(135deg, var(--primary), #4c1d95); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin:0; letter-spacing: -0.03em;">Produtos</h2>
                <p style="color: #64748b; margin: 0; font-size: 0.95rem; font-weight:500; white-space: nowrap;">Gerenciamento de catálogo, valores e estoque de materiais.</p>
            </div>
            ${canEdit ? `<button class="btn btn-primary" style="padding: 0.8rem 1.5rem; border-radius: 12px; font-weight:800; text-transform:uppercase; letter-spacing:0.05em; display:flex; align-items:center; gap:0.5rem; box-shadow:0 4px 15px rgba(139, 92, 246, 0.3); transition:all 0.2s;" id="btn-new-product" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                NOVO PRODUTO
            </button>` : ''}
        </div>
        <div style="background: linear-gradient(135deg, rgba(239, 246, 255, 0.8), rgba(219, 234, 254, 0.5)); backdrop-filter: blur(10px); border:1px solid rgba(191, 219, 254, 0.8); border-radius:12px; padding:1rem; margin-bottom:1.5rem; display:flex; align-items:center; gap:0.75rem; font-size:0.95rem; color:#1e40af; box-shadow: 0 4px 15px rgba(0,0,0,0.02);">
            <span style="font-size:1.5rem;">📦</span>
            <span style="line-height:1.4;">Cadastre os produtos aqui. Controle de estoque e cores de pulseiras na aba <a href="#" id="link-estoque" style="font-weight:700; color:#2563eb; text-decoration:none; background:rgba(255,255,255,0.7); padding:2px 8px; border-radius:8px; box-shadow:0 2px 4px rgba(0,0,0,0.05); transition:all 0.2s;" onmouseover="this.style.background='#fff'; this.style.transform='translateY(-1px)';" onmouseout="this.style.background='rgba(255,255,255,0.7)'; this.style.transform='none';">Estoque</a>.</span>
        </div>
        <div style="display:flex; gap:0.75rem; flex-wrap:wrap; margin-bottom:1.5rem; padding:1.25rem; background:rgba(255,255,255,0.85); backdrop-filter:blur(12px); border-radius:16px; border:1px solid rgba(255,255,255,0.6); box-shadow:0 8px 30px rgba(0,0,0,0.04);">
            <div style="flex:2; min-width:200px; display:flex; align-items:center; background:white; border-radius:10px; border:1px solid #e2e8f0; padding:0 1rem; box-shadow:inset 0 2px 4px rgba(0,0,0,0.02); transition:all 0.2s;" onfocusin="this.style.borderColor='var(--primary)'; this.style.boxShadow='0 0 0 3px var(--primary-glow)';" onfocusout="this.style.borderColor='#e2e8f0'; this.style.boxShadow='inset 0 2px 4px rgba(0,0,0,0.02)';">
                <span style="opacity:0.6;">🔍</span>
                <input type="text" id="product-filter-search" placeholder="Buscar produto..." style="width:100%; padding:0.75rem 0.5rem; border:none; background:transparent; outline:none; font-size:0.95rem;">
            </div>
            <select id="product-filter-type" style="flex:1; min-width:140px; padding:0.75rem 1rem; border:1px solid #e2e8f0; border-radius:10px; font-size:0.95rem; background:white; outline:none; cursor:pointer; box-shadow:var(--shadow-sm); transition:all 0.2s;" onfocus="this.style.borderColor='var(--primary)';" onblur="this.style.borderColor='#e2e8f0';">
                <option value="">Tipos (Todos)</option>
            </select>
            <select id="product-filter-prazo" style="flex:1; min-width:160px; padding:0.75rem 1rem; border:1px solid #e2e8f0; border-radius:10px; font-size:0.95rem; background:white; outline:none; cursor:pointer; box-shadow:var(--shadow-sm); transition:all 0.2s;" onfocus="this.style.borderColor='var(--primary)';" onblur="this.style.borderColor='#e2e8f0';">
                <option value="">Prazos (Todos)</option>
                <option value="1d">⚡ 1 Dia (Urgente)</option>
                <option value="3d">📅 3 Dias</option>
                <option value="terc">🏭 Terceirizado</option>
            </select>
            <select id="product-filter-produto" style="flex:1; min-width:180px; padding:0.75rem 1rem; border:1px solid #e2e8f0; border-radius:10px; font-size:0.95rem; background:white; outline:none; cursor:pointer; box-shadow:var(--shadow-sm); transition:all 0.2s;" onfocus="this.style.borderColor='var(--primary)';" onblur="this.style.borderColor='#e2e8f0';">
                <option value="">Produto Específico</option>
            </select>
        </div>
        <table class="data-table">
            <thead>
                <tr>
                    <th>Produto</th>
                    <th>Tipo</th>
                    <th>Preço 3D</th>
                    <th>Preço 1D / Prazo</th>
                    <th>Estoque</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody id="products-list">
                <tr><td colspan="6">Carregando...</td></tr>
            </tbody>
        </table>

        <!-- Modal -->
        <div class="modal-overlay" id="product-modal">
            <div class="modal" style="max-width:750px; width:100%;">
                <div class="modal-header">
                    <h3 id="modal-title">Adicionar Produto</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <!-- Tabs -->
                <div id="product-tabs" style="display:none; border-bottom:2px solid #e2e8f0; margin:0 1.5rem; display:flex; gap:0;">
                    <button type="button" class="product-tab active" data-tab="dados" style="padding:0.6rem 1.2rem; border:none; background:transparent; cursor:pointer; font-weight:600; font-size:0.9rem; color:#64748b; border-bottom:2px solid transparent; margin-bottom:-2px; transition:all 0.2s;">📋 Dados</button>
                    <button type="button" class="product-tab" data-tab="custo" style="padding:0.6rem 1.2rem; border:none; background:transparent; cursor:pointer; font-weight:600; font-size:0.9rem; color:#64748b; border-bottom:2px solid transparent; margin-bottom:-2px; transition:all 0.2s;">💰 Valor de Custo</button>
                    <button type="button" class="product-tab" id="tab-btn-kits" data-tab="kits" style="display:none; padding:0.6rem 1.2rem; border:none; background:transparent; cursor:pointer; font-weight:600; font-size:0.9rem; color:#ea580c; border-bottom:2px solid transparent; margin-bottom:-2px; transition:all 0.2s;">📦 Montador do Kit</button>
                </div>
                <!-- Tab: Dados -->
                <div id="tab-dados">
                <form id="product-form">
                    <input type="hidden" name="id" id="product-id">
                    <div class="form-group">
                        <label>Nome do Produto</label>
                        <input type="text" name="name" id="product-name" placeholder="Ex: Adesivo Vinil, Banner Lona" required>
                    </div>
                    
                    <div id="kit-overview-section" style="display:none; margin-bottom:1rem; padding:1rem; background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <h4 style="font-size:0.9rem; color:#1d4ed8; margin:0; margin-bottom:0.5rem;">📦 Sub-títulos configurados</h4>
                            <button type="button" class="btn btn-sm kit-goto-btn" style="padding:0.2rem 0.5rem; font-size:0.75rem; background:#fff; border:1px solid #93c5fd; color:#2563eb;">Editar Kits</button>
                        </div>
                        <div id="kit-overview-list" style="display:flex; flex-direction:column; gap:0.4rem; font-size:0.85rem; color:#334155; margin-top:0.5rem;">
                            <!-- Injetado -->
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Tipo de Produto</label>
                        <input type="text" name="type" id="product-type" placeholder="Ex: Papelaria, Banner, Adesivo">
                    </div>
                    <div class="form-group" style="display:flex; gap:1rem">
                        <div style="flex:1">
                            <label>Valor 3 Dias (R$)</label>
                            <input type="number" step="0.01" min="0" name="price_3_days" id="product-price-3" value="0" required>
                        </div>
                        <div style="flex:1">
                            <label>Valor 1 Dia - Urgente (R$)</label>
                            <input type="number" step="0.01" min="0" name="price_1_day" id="product-price-1" value="0" required>
                        </div>
                        <div style="flex:1">
                            <label style="color:#dc2626; font-weight:600;">💰 Custo Unit. (R$)</label>
                            <input type="number" step="0.01" min="0" name="unit_cost" id="product-unit-cost" value="0" style="border-color:#fca5a5;">
                        </div>
                    </div>
                    <div class="form-group" style="display:flex; gap:1rem; align-items:end">
                        <div style="flex:1" id="stock-field">
                            <label>Quantidade em Estoque</label>
                            <input type="number" name="stock" id="product-stock" value="0" min="0" required>
                        </div>
                        <div style="flex:1">
                            <label id="time-label">Tempo de Produção (min)</label>
                            <input type="number" name="production_time" id="product-time" value="0" min="0">
                        </div>
                        <div style="display:flex; align-items:center; gap:0.4rem; padding-bottom:0.35rem;">
                            <input type="checkbox" id="product-terceirizado" name="terceirizado" value="1" style="width:18px; height:18px; cursor:pointer;">
                            <label for="product-terceirizado" style="cursor:pointer; white-space:nowrap; font-size:0.85rem;">🏭 Terceirizado</label>
                        </div>
                    </div>
                    <!-- Color variants editor (pulseiras) -->
                    <div id="color-variants-section" style="display:none; margin-top:1rem; padding-top:1rem; border-top:2px dashed #e2e8f0">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem">
                            <label style="font-weight:700; font-size:0.9rem; color:#1e293b">🎨 Cores e Quantidades em Estoque</label>
                            <button type="button" id="btn-add-color" class="btn btn-secondary btn-sm" style="width:auto">+ Adicionar Cor</button>
                        </div>
                        <div id="color-variants-list" style="display:flex; flex-direction:column; gap:0.5rem; max-height:220px; overflow-y:auto">
                            <!-- rows injected dynamically -->
                        </div>
                        <p style="font-size:0.78rem; color:#64748b; margin-top:0.4rem">O estoque total é calculado automaticamente pela soma das cores.</p>
                    </div>
                    <div style="display:flex; justify-content:flex-end; gap:0.5rem; margin-top:1rem">
                        <button type="button" class="btn btn-secondary modal-close-btn">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Salvar</button>
                    </div>
                </form>
                </div>
                <!-- Tab: Valor de Custo -->
                <div id="tab-custo" style="display:none; padding:1.5rem;">
                    <div style="text-align:center; margin-bottom:1.2rem;">
                        <div style="font-size:0.85rem; color:#64748b; margin-bottom:0.25rem;">Custo Total Acumulado</div>
                        <div id="cost-total-value" style="font-size:2rem; font-weight:800; color:#dc2626;">R$ 0,00</div>
                        <div style="font-size:0.78rem; color:#94a3b8; margin-top:0.25rem;">Soma de todos os pedidos internos que usaram este material</div>
                    </div>
                    <div style="border-top:1px solid #e2e8f0; padding-top:1rem;">
                        <h4 style="font-size:0.9rem; color:#1e293b; margin-bottom:0.5rem;">📜 Histórico de Custos</h4>
                        <div id="cost-history-list" style="max-height:250px; overflow-y:auto;">
                            <p style="color:#94a3b8; text-align:center; padding:1rem;">Nenhum custo registrado</p>
                        </div>
                    </div>
                </div>
                <!-- Tab: Montador de Kits -->
                <div id="tab-kits" style="display:none; padding:1.5rem;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem">
                        <h4 style="margin:0; font-size:1.1rem; color:#1e293b">Sub-títulos do Kit</h4>
                        <button type="button" id="btn-add-kit-template" class="btn btn-secondary btn-sm" style="background:#ea580c; color:#fff; border:none;">+ Adicionar Sub-título</button>
                    </div>
                    <div id="kit-templates-list" style="display:flex; flex-direction:column; gap:1rem; max-height:400px; overflow-y:auto; padding-right:0.5rem;">
                    </div>
                    <div style="margin-top:1rem; text-align:right;">
                        <button type="button" class="btn btn-primary" id="btn-save-kits">Salvar Kits</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    container.querySelector('#link-estoque').onclick = (e) => {
        e.preventDefault();
        document.querySelector('[data-view="estoque"]')?.click();
    };

    let allProducts = [];

    const removeAccents = (str) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const renderProducts = () => {
        const search = removeAccents(container.querySelector('#product-filter-search').value.toLowerCase().trim());
        const typeFilter = container.querySelector('#product-filter-type').value;
        const prazoFilter = container.querySelector('#product-filter-prazo').value;
        const produtoFilter = container.querySelector('#product-filter-produto').value;
        const filtered = allProducts.filter(p => {
            if (search && !removeAccents(`${p.name} ${p.type || ''}`.toLowerCase()).includes(search)) return false;
            if (typeFilter && (p.type || '') !== typeFilter) return false;
            if (prazoFilter === '1d' && (p.terceirizado || !parseFloat(p.price_1_day))) return false;
            if (prazoFilter === '3d' && (p.terceirizado || !parseFloat(p.price_3_days))) return false;
            if (prazoFilter === 'terc' && !p.terceirizado) return false;
            if (produtoFilter && String(p.id) !== produtoFilter) return false;
            return true;
        });

        const tbody = container.querySelector('#products-list');
        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#94a3b8; padding:2rem;">Nenhum produto encontrado</td></tr>';
            return;
        }

        tbody.innerHTML = filtered.map(p => {
            const isKit = isKitType(p.name);
            const stock = p.stock || 0;
            const minStock = p.min_stock || 5;
            let stockBadge = stock <= 0
                ? '<span style="background:#fee2e2; color:#b91c1c; padding:2px 8px; border-radius:10px; font-size:0.8em; font-weight:bold;">Zerado</span>'
                : stock <= minStock
                    ? '<span style="background:#fef3c7; color:#92400e; padding:2px 8px; border-radius:10px; font-size:0.8em; font-weight:bold;">Baixo</span>'
                    : '<span style="background:#d1fae5; color:#065f46; padding:2px 8px; border-radius:10px; font-size:0.8em; font-weight:bold;">OK</span>';

            let price3Html = isKit ? '<span style="color:#94a3b8; font-size:0.8rem; font-style:italic;">Variável (Kit)</span>' : `R$ ${parseFloat(p.price_3_days || p.price || 0).toFixed(2).replace('.', ',')}`;
            
            let price1Html = isKit ? '<span style="color:#94a3b8; font-size:0.8rem;">—</span>' : (p.terceirizado
                    ? (p.production_time ? `<span style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:10px; padding:2px 10px; font-size:0.8em; color:#1d4ed8; font-weight:600; display:inline-block;">📅 ${p.production_time} dia${p.production_time == 1 ? '' : 's'}</span>` : '<span style="color:#94a3b8">—</span>')
                    : `<span style="color:#dc2626; font-weight:600">R$ ${parseFloat(p.price_1_day || 0).toFixed(2).replace('.', ',')}</span>`);
                    
            let stockHtml = isKit ? '<span style="color:#94a3b8; font-size:0.8rem;">—</span>' : (p.terceirizado ? '<span style="color:#94a3b8;">—</span>' : `<b>${stock}</b> ${stockBadge}`);

            return `
            <tr>
                <td>
                    <b>${p.name}</b>
                    <button type="button" onclick="window.copyTextToClipboard('LM | GRÁFICA - ${p.name.replace(/'/g, "\\'")}')" title="Copiar nome formato Financeiro" style="background:none; border:none; cursor:pointer; font-size:0.95rem; margin-left:4px; filter:grayscale(1) opacity(0.5); transition:all 0.2s;" onmouseover="this.style.filter='none'" onmouseout="this.style.filter='grayscale(1) opacity(0.5)'">📋</button>
                    ${p.terceirizado ? ' <span style="background:#fef3c7; color:#92400e; padding:1px 6px; border-radius:8px; font-size:0.75em;">🏭 Terc.</span>' : ''}
                </td>
                <td>${p.type || '-'}</td>
                <td>${price3Html}</td>
                <td>${price1Html}</td>
                <td>${stockHtml}</td>
                <td>
                    ${canEdit ? `<button class="btn btn-secondary btn-sm edit-btn" data-id="${p.id}">Editar</button>
                    <button class="btn btn-sm delete-btn" style="background:#fee2e2; color:#b91c1c; border:none; margin-left:4px;" data-id="${p.id}">🗑️</button>` : '<span style="color:#94a3b8; font-size:0.85rem;">Somente leitura</span>'}
                </td>
            </tr>`;
        }).join('');

        const productMap = Object.fromEntries(allProducts.map(p => [p.id, p]));
        tbody.querySelectorAll('.edit-btn').forEach(btn => btn.onclick = () => openEditModal(productMap[parseInt(btn.dataset.id)]));
        tbody.querySelectorAll('.delete-btn').forEach(btn => {
            btn.onclick = async () => {
                if (!confirm('Excluir este produto?')) return;
                await fetch(`/api/products/${btn.dataset.id}`, { method: 'DELETE' });
                loadProducts();
            };
        });
    };

    const loadProducts = async () => {
        try {
            const res = await fetch('/api/products');
            const { data } = await res.json();
            allProducts = data;
            const stockByType = data.reduce((acc, p) => { if (p.type) acc[p.type] = p.stock || 0; return acc; }, {});
            const types = [...new Set(data.map(p => p.type || '').filter(t => t))].sort();
            const typeSelect = container.querySelector('#product-filter-type');
            const cur = typeSelect.value;
            typeSelect.innerHTML = '<option value="">Todos os tipos</option>' + types.map(t => `<option value="${t}" ${t === cur ? 'selected' : ''}>${t} (${stockByType[t] || 0})</option>`).join('');

            // Populate product select
            const produtoSelect = container.querySelector('#product-filter-produto');
            const curProd = produtoSelect.value;
            produtoSelect.innerHTML = '<option value="">Todos os produtos</option>' + data.map(p => `<option value="${p.id}" ${String(p.id) === curProd ? 'selected' : ''}>${p.name}${p.type ? ' (' + p.type + ')' : ''}</option>`).join('');

            renderProducts();
        } catch (e) { console.error(e); }
    };

    const modal = container.querySelector('#product-modal');
    const form = container.querySelector('#product-form');
    const closeModal = () => modal.classList.remove('open');

    const updateTerceirizadoUI = (checked) => {
        container.querySelector('#stock-field').style.display = checked ? 'none' : '';
        container.querySelector('#time-label').textContent = checked ? 'Prazo de Entrega (dias)' : 'Tempo de Produção (min)';
    };
    container.querySelector('#product-terceirizado').addEventListener('change', function () { updateTerceirizadoUI(this.checked); });

    const isBraceletType = (val) => (val || '').toLowerCase().includes('pulseira');
    const isKitType = (val) => (val || '').toUpperCase().includes('KIT');

    // Color variants state
    let colorRows = []; // [{color, quantity}]
    
    // Kit variables
    let kitTemplates = [];
    
    const renderKitTemplates = () => {
        const list = container.querySelector('#kit-templates-list');
        
        // Salva a posição do scroll atual para não pular para o topo
        const scrollNodes = [
            container.querySelector('#product-modal .modal'),
            list,
            document.documentElement
        ].filter(Boolean);
        const scrollPositions = scrollNodes.map(n => n.scrollTop || 0);

        list.innerHTML = kitTemplates.map((tpl, tIndex) => {
            let autoTotal = 0;
            if (tpl.items) {
                tpl.items.forEach(item => {
                    if (item.child_product_id) {
                        const childP = allProducts.find(p => p.id === parseInt(item.child_product_id));
                        if (childP) {
                            const pPrice = parseFloat(childP.price_3_days || childP.price || 0);
                            autoTotal += pPrice * (item.quantity || 1);
                        }
                    }
                });
            }
            if (tpl.base_price === undefined) {
                tpl.base_price = autoTotal;
            }
            return `
            <div style="border:1px solid #cbd5e1; border-radius:8px; padding:1rem; background:#f8fafc;">
                <div style="display:flex; gap:0.5rem; margin-bottom:0.75rem;">
                    <div style="flex:2">
                        <label style="font-size:0.8rem; color:#64748b; margin-bottom:0.2rem; display:block;">Nome do Sub-título</label>
                        <input type="text" class="kit-tpl-name" data-index="${tIndex}" value="${tpl.name || ''}" placeholder="Ex: Básico" style="width:100%; padding:0.4rem; border:1px solid #cbd5e1; border-radius:4px;">
                    </div>
                    <div style="flex:1">
                        <label style="font-size:0.8rem; color:#64748b; margin-bottom:0.2rem; display:block;">Valor Final (Venda)</label>
                        <div style="display:flex; align-items:center;">
                            <span style="font-weight:bold; color:#1e293b; margin-right:4px;">R$</span>
                            <input type="number" step="0.01" min="0" class="kit-tpl-price" data-index="${tIndex}" value="${parseFloat(tpl.base_price || 0).toFixed(2)}" style="width:100%; padding:0.4rem; border:1px solid #cbd5e1; border-radius:4px; font-weight:bold; color:#1d4ed8;">
                        </div>
                        <div style="font-size:0.7rem; color:#64748b; margin-top:0.2rem;">Soma Itens: R$ ${autoTotal.toFixed(2).replace('.', ',')}</div>
                    </div>
                    <div style="display:flex; align-items:flex-end">
                        <button type="button" class="btn btn-sm remove-tpl-btn" data-index="${tIndex}" style="background:#fee2e2; color:#b91c1c; border:none; height:34px;">Excluir</button>
                    </div>
                </div>
                
                <div style="background:#fff; border:1px solid #e2e8f0; border-radius:6px; padding:0.75rem;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                        <span style="font-size:0.85rem; font-weight:600; color:#334155;">Produtos Inclusos</span>
                        <button type="button" class="btn btn-secondary btn-sm add-kit-item-btn" data-index="${tIndex}" style="padding:0.2rem 0.6rem; font-size:0.8rem;">+ Item</button>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:0.4rem;">
                        ${(tpl.items || []).map((item, iIndex) => `
                            <div style="display:flex; gap:0.5rem; align-items:center;">
                                <select class="kit-item-select" data-tindex="${tIndex}" data-iindex="${iIndex}" style="flex:1; padding:0.3rem; border:1px solid #cbd5e1; border-radius:4px; font-size:0.85rem;">
                                    <option value="">Selecione um produto...</option>
                                    ${allProducts.filter(p => !isKitType(p.name)).map(p => `<option value="${p.id}" ${parseInt(item.child_product_id) === p.id ? 'selected' : ''}>${p.name} (R$ ${parseFloat(p.price_3_days||p.price||0).toFixed(2).replace('.', ',')})</option>`).join('')}
                                </select>
                                <input type="number" min="1" class="kit-item-qty" data-tindex="${tIndex}" data-iindex="${iIndex}" value="${item.quantity || 1}" style="width:70px; padding:0.3rem; border:1px solid #cbd5e1; border-radius:4px; font-size:0.85rem; text-align:center;">
                                <button type="button" class="remove-kit-item-btn" data-tindex="${tIndex}" data-iindex="${iIndex}" style="background:transparent; color:#b91c1c; border:none; cursor:pointer;" title="Remover item">&times;</button>
                            </div>
                        `).join('')}
                        ${(!tpl.items || tpl.items.length === 0) ? '<p style="font-size:0.8rem; color:#94a3b8; text-align:center; margin:0;">Nenhum produto adicionado</p>' : ''}
                    </div>
                </div>
            </div>
            `;
        }).join('');
        
        if (kitTemplates.length === 0) {
            list.innerHTML = '<p style="text-align:center; color:#94a3b8;">Nenhum sub-título criado ainda. Clique em "+ Adicionar Sub-título" para começar.</p>';
        }

        const updateKitOverviewUI = () => {
            const overview = container.querySelector('#kit-overview-list');
            if (overview) {
                if (kitTemplates.length === 0) {
                    overview.innerHTML = '<span style="color:#94a3b8; font-style:italic;">Nenhum kit configurado.</span>';
                } else {
                    overview.innerHTML = kitTemplates.map(t => 
                        `<div style="display:flex; justify-content:space-between; padding:0.3rem 0; border-bottom:1px solid #dbeafe;">
                            <span>${t.name || '<i>Sem nome</i>'}</span>
                            <strong style="color:#1d4ed8;">R$ ${(t.base_price||0).toFixed(2).replace('.',',')}</strong>
                        </div>`
                    ).join('');
                }
            }
        };

        list.querySelectorAll('.kit-tpl-name').forEach(inp => inp.oninput = (e) => {
            kitTemplates[e.target.dataset.index].name = e.target.value;
            updateKitOverviewUI();
        });
        list.querySelectorAll('.kit-tpl-price').forEach(inp => inp.oninput = (e) => {
            kitTemplates[e.target.dataset.index].base_price = parseFloat(e.target.value) || 0;
            updateKitOverviewUI();
        });
        list.querySelectorAll('.remove-tpl-btn').forEach(btn => btn.onclick = (e) => { kitTemplates.splice(e.target.dataset.index, 1); renderKitTemplates(); });
        
        list.querySelectorAll('.add-kit-item-btn').forEach(btn => btn.onclick = (e) => {
            const tIndex = e.target.dataset.index;
            if (!kitTemplates[tIndex].items) kitTemplates[tIndex].items = [];
            kitTemplates[tIndex].items.push({ child_product_id: '', quantity: 1 });
            renderKitTemplates();
        });
        
        list.querySelectorAll('.kit-item-select').forEach(sel => sel.onchange = (e) => {
            kitTemplates[e.target.dataset.tindex].items[e.target.dataset.iindex].child_product_id = e.target.value;
            renderKitTemplates();
        });
        list.querySelectorAll('.kit-item-qty').forEach(inp => inp.oninput = (e) => {
            kitTemplates[e.target.dataset.tindex].items[e.target.dataset.iindex].quantity = parseInt(e.target.value)||1;
            renderKitTemplates();
        });
        list.querySelectorAll('.remove-kit-item-btn').forEach(btn => btn.onclick = (e) => {
            kitTemplates[e.target.dataset.tindex].items.splice(e.target.dataset.iindex, 1);
            renderKitTemplates();
        });

        // Update overview once on initial render
        updateKitOverviewUI();

        // Restaura a posição do scroll
        requestAnimationFrame(() => {
            scrollNodes.forEach((n, i) => {
                if (n) n.scrollTop = scrollPositions[i];
            });
        });
    };

    container.querySelector('#btn-add-kit-template').onclick = () => {
        kitTemplates.push({ name: '', base_price: 0, items: [] });
        renderKitTemplates();
    };

    const colorSection = container.querySelector('#color-variants-section');
    const colorList = container.querySelector('#color-variants-list');

    const renderColorRows = () => {
        colorList.innerHTML = colorRows.map((row, i) => `
            <div style="display:grid; grid-template-columns:1fr 90px auto; gap:6px; align-items:center" data-row="${i}">
                <input type="text" class="color-row-name" placeholder="Nome da cor (ex: Vermelho, #FF0000)" value="${row.color}" style="padding:5px 8px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.9rem">
                <input type="number" class="color-row-qty" min="0" placeholder="Qtd" value="${row.quantity}" style="padding:5px 8px; border:1px solid #cbd5e1; border-radius:6px; text-align:center; font-size:0.9rem">
                <button type="button" class="remove-color-row" data-index="${i}" style="background:#fee2e2; color:#b91c1c; border:none; border-radius:6px; padding:4px 8px; cursor:pointer; font-size:1rem">&times;</button>
            </div>
        `).join('');

        colorList.querySelectorAll('.color-row-name').forEach((inp, i) => {
            inp.oninput = () => { colorRows[i].color = inp.value; };
        });
        colorList.querySelectorAll('.color-row-qty').forEach((inp, i) => {
            inp.oninput = () => { colorRows[i].quantity = parseInt(inp.value) || 0; };
        });
        colorList.querySelectorAll('.remove-color-row').forEach(btn => {
            btn.onclick = () => {
                colorRows.splice(parseInt(btn.dataset.index), 1);
                renderColorRows();
            };
        });
    };

    container.querySelector('#btn-add-color').onclick = () => {
        colorRows.push({ color: '', quantity: 0 });
        renderColorRows();
    };

    // Show/hide color section based on product type field
    container.querySelector('#product-type').addEventListener('input', function () {
        if (isBraceletType(this.value)) {
            colorSection.style.display = 'block';
        } else {
            colorSection.style.display = 'none';
            colorRows = [];
            renderColorRows();
        }
    });
    
    container.querySelector('.kit-goto-btn')?.addEventListener('click', () => {
        container.querySelector('#tab-btn-kits').click();
    });

    // Tab update based on name
    container.querySelector('#product-name').addEventListener('input', function () {
        const isKit = isKitType(this.value);
        container.querySelector('#tab-btn-kits').style.display = isKit ? '' : 'none';
        container.querySelector('#kit-overview-section').style.display = isKit ? 'block' : 'none';
        
        const toggleDisplay = (id, displayStyle) => {
            const el = container.querySelector(id);
            if (el && el.closest('.form-group > div')) el.closest('.form-group > div').style.display = displayStyle;
        };
        
        container.querySelector('#product-type').closest('.form-group').style.display = isKit ? 'none' : 'flex';
        toggleDisplay('#product-unit-cost', isKit ? 'none' : 'block');
        toggleDisplay('#product-stock', isKit ? 'none' : 'block');
        toggleDisplay('#product-time', isKit ? 'none' : 'block');
        toggleDisplay('#product-price-1', isKit ? 'none' : 'block');
        toggleDisplay('#product-price-3', isKit ? 'none' : 'block');
        
        const tercLabel = container.querySelector('#product-terceirizado');
        if (tercLabel && tercLabel.parentElement) tercLabel.parentElement.style.display = isKit ? 'none' : 'flex';
    });

    const openModal = () => {
        form.reset();
        container.querySelector('#product-id').value = '';
        container.querySelector('#product-stock').value = '0';
        container.querySelector('#product-terceirizado').checked = false;
        updateTerceirizadoUI(false);
        container.querySelector('#modal-title').innerText = 'Adicionar Produto';
        container.querySelector('#product-name').dispatchEvent(new Event('input'));
        colorSection.style.display = 'none';
        colorRows = [];
        renderColorRows();
        // Hide tabs and cost tab when adding new product
        container.querySelector('#product-tabs').style.display = 'none';
        container.querySelector('#tab-dados').style.display = '';
        container.querySelector('#tab-custo').style.display = 'none';
        modal.classList.add('open');
    };

    const openEditModal = async (p) => {
        container.querySelector('#product-id').value = p.id;
        container.querySelector('#product-name').value = p.name;
        container.querySelector('#product-type').value = p.type || '';
        container.querySelector('#product-price-3').value = p.price_3_days || p.price || 0;
        container.querySelector('#product-price-1').value = p.price_1_day || 0;
        container.querySelector('#product-unit-cost').value = p.unit_cost || 0;
        container.querySelector('#product-stock').value = p.stock || 0;
        container.querySelector('#product-time').value = p.production_time || 0;
        container.querySelector('#product-terceirizado').checked = !!p.terceirizado;
        updateTerceirizadoUI(!!p.terceirizado);
        container.querySelector('#modal-title').innerText = 'Editar Produto';
        
        container.querySelector('#product-name').dispatchEvent(new Event('input'));

        // Load color variants if bracelet
        colorRows = [];
        if (isBraceletType(p.type) || isBraceletType(p.name)) {
            colorSection.style.display = 'block';
            try {
                const res = await fetch(`/api/products/${p.id}/colors`);
                const { data } = await res.json();
                colorRows = data.map(v => ({ color: v.color, quantity: v.quantity }));
            } catch (e) { colorRows = []; }
        } else {
            colorSection.style.display = 'none';
        }
        renderColorRows();

        // Show tabs and load cost data
        const tabsEl = container.querySelector('#product-tabs');
        tabsEl.style.display = 'flex';
        switchTab('dados');
        loadCostHistory(p.id);
        
        if (isKitType(p.name)) {
            fetch(`/api/products/${p.id}/kits`).then(r=>r.json()).then(res => {
                kitTemplates = res.data || [];
                renderKitTemplates();
            }).catch(() => {});
        } else {
            kitTemplates = [];
            renderKitTemplates();
        }

        modal.classList.add('open');
    };

    // Tab switching logic
    const switchTab = (tabName) => {
        container.querySelectorAll('.product-tab').forEach(t => {
            const isActive = t.dataset.tab === tabName;
            t.style.color = isActive ? (tabName === 'kits' ? '#ea580c' : '#7c3aed') : '#64748b';
            t.style.borderBottomColor = isActive ? (tabName === 'kits' ? '#ea580c' : '#7c3aed') : 'transparent';
            t.classList.toggle('active', isActive);
        });
        container.querySelector('#tab-dados').style.display = tabName === 'dados' ? '' : 'none';
        container.querySelector('#tab-custo').style.display = tabName === 'custo' ? '' : 'none';
        container.querySelector('#tab-kits').style.display = tabName === 'kits' ? '' : 'none';
    };

    container.querySelectorAll('.product-tab').forEach(tab => {
        tab.onclick = () => switchTab(tab.dataset.tab);
    });
    
    container.querySelector('#btn-save-kits').onclick = async () => {
        const pId = container.querySelector('#product-id').value;
        if (!pId) return alert('Salve o produto primeiro na aba Dados!');
        
        // Remove empty templates or items without product
        const payload = kitTemplates.filter(t => t.name).map(t => ({
            name: t.name,
            base_price: t.base_price,
            items: (t.items||[]).filter(i => i.child_product_id)
        }));
        
        container.querySelector('#btn-save-kits').textContent = 'Salvando...';
        container.querySelector('#btn-save-kits').disabled = true;
        
        try {
            await fetch(`/api/products/${pId}/kits`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ templates: payload })
            });
            container.querySelector('#btn-save-kits').textContent = 'Kits Salvos!';
            setTimeout(() => {
                container.querySelector('#btn-save-kits').textContent = 'Salvar Kits';
                container.querySelector('#btn-save-kits').disabled = false;
            }, 2000);
        } catch (e) {
            alert('Erro ao salvar.');
        }
    };

    // Load cost history for a product
    const loadCostHistory = async (productId) => {
        try {
            const res = await fetch(`/api/products/${productId}/costs`);
            const { data, total_cost } = await res.json();
            container.querySelector('#cost-total-value').textContent = `R$ ${(total_cost || 0).toFixed(2).replace('.', ',')}`;

            const histList = container.querySelector('#cost-history-list');
            if (!data || data.length === 0) {
                histList.innerHTML = '<p style="color:#94a3b8; text-align:center; padding:1rem;">Nenhum custo registrado para este produto</p>';
            } else {
                histList.innerHTML = `
                    <table style="width:100%; border-collapse:collapse; font-size:0.85rem;">
                        <thead>
                            <tr style="background:#f8fafc;">
                                <th style="padding:6px 8px; text-align:left; border-bottom:1px solid #e2e8f0;">Data</th>
                                <th style="padding:6px 8px; text-align:left; border-bottom:1px solid #e2e8f0;">Descrição</th>
                                <th style="padding:6px 8px; text-align:center; border-bottom:1px solid #e2e8f0;">Qtd</th>
                                <th style="padding:6px 8px; text-align:right; border-bottom:1px solid #e2e8f0;">Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.map(c => `
                                <tr style="border-bottom:1px solid #f1f5f9;">
                                    <td style="padding:6px 8px; white-space:nowrap;">${window.parseDBDate(c.created_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</td>
                                    <td style="padding:6px 8px; color:#475569;">${c.description || '-'}</td>
                                    <td style="padding:6px 8px; text-align:center;">${c.quantity || 1}</td>
                                    <td style="padding:6px 8px; text-align:right; font-weight:600; color:#dc2626;">R$ ${(c.cost_amount || 0).toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
            }
        } catch (e) {
            console.error('Error loading cost history:', e);
        }
    };

    const newBtn = container.querySelector('#btn-new-product');
    if (newBtn) newBtn.onclick = openModal;
    container.querySelector('.modal-close').onclick = closeModal;
    container.querySelector('.modal-close-btn').onclick = closeModal;

    form.onsubmit = async (e) => {
        e.preventDefault();
        const body = Object.fromEntries(new FormData(e.target));
        body.terceirizado = container.querySelector('#product-terceirizado').checked ? 1 : 0;
        const id = body.id;
        const url = id ? `/api/products/${id}` : '/api/products';
        const method = id ? 'PUT' : 'POST';
        if (!id) delete body.id;
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const json = await res.json();

        // Save color variants if bracelet type
        const productId = id || json.id;
        const typeVal = container.querySelector('#product-type').value;
        const nameVal = container.querySelector('#product-name').value;
        if (productId && (isBraceletType(typeVal) || isBraceletType(nameVal)) && colorRows.length > 0) {
            const variants = colorRows.filter(r => r.color.trim());
            await fetch(`/api/products/${productId}/colors`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ variants })
            });
        }

        closeModal();
        loadProducts();
    };

    container.querySelector('#product-filter-search').addEventListener('input', renderProducts);
    container.querySelector('#product-filter-type').addEventListener('change', renderProducts);
    container.querySelector('#product-filter-prazo').addEventListener('change', renderProducts);
    container.querySelector('#product-filter-produto').addEventListener('change', renderProducts);
    loadProducts();
    return container;
};
