export const render = () => {
    const container = document.createElement('div');
    container.className = 'budget-view';

    // ── LM Gráfica dados fixos ──────────────────────────────────────────────
    const LM = {
        cnpj: '28.947.845/0001-08',
        endereco: 'Praça do Rosário, nº 3, Loja 7 – Centro – Viçosa/MG'
    };

    container.innerHTML = `
    <style>
        .budget-view { padding: 2rem; max-width: 960px; margin: 0 auto; font-family: 'Inter', sans-serif; animation: bud-in 0.4s cubic-bezier(0.16,1,0.3,1) both; }
        @keyframes bud-in { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        .budget-title-bar { display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem; }
        .budget-title-bar h1 { font-size:1.8rem; font-weight:900; background:linear-gradient(135deg, var(--primary,#8b5cf6), #4c1d95); -webkit-background-clip:text; -webkit-text-fill-color:transparent; margin:0; letter-spacing:-0.03em; }
        .budget-subtitle { color:#64748b; margin:0.2rem 0 0; font-size:0.9rem; font-weight:500; }
        .budget-card { background:rgba(255,255,255,0.85); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); border-radius:20px; padding:1.5rem; box-shadow:0 8px 30px rgba(124,58,237,0.07); margin-bottom:1.5rem; border:1px solid rgba(255,255,255,0.6); transition:box-shadow 0.3s; }
        .budget-card:hover { box-shadow:0 12px 36px rgba(124,58,237,0.12); }
        .budget-section-title { font-size:0.72rem; font-weight:800; text-transform:uppercase; letter-spacing:0.12em; color:var(--primary,#8b5cf6); margin-bottom:1rem; display:flex; align-items:center; gap:0.5rem; }
        .budget-section-title::after { content:''; flex:1; height:1px; background:linear-gradient(90deg, rgba(139,92,246,0.2), transparent); }
        .budget-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
        .budget-grid-3 { display:grid; grid-template-columns:2fr 1fr 1fr auto; gap:0.75rem; align-items:end; }
        .budget-field label { display:block; font-size:0.72rem; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:0.35rem; }
        .budget-field input { width:100%; padding:0.65rem 0.95rem; border:1.5px solid rgba(139,92,246,0.2); border-radius:10px; font-size:0.95rem; font-family:inherit; transition:all 0.25s cubic-bezier(0.4,0,0.2,1); box-sizing:border-box; background:rgba(255,255,255,0.8); color:#1e1b4b; }
        .budget-field input:focus { outline:none; border-color:var(--primary,#8b5cf6); box-shadow:0 0 0 4px rgba(139,92,246,0.15); background:#fff; transform:translateY(-1px); }
        .budget-field input::placeholder { color:#94a3b8; }
        .btn-add { background:linear-gradient(135deg, var(--primary,#8b5cf6), #6d28d9); color:#fff; border:none; border-radius:10px; width:44px; height:44px; font-size:1.5rem; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.25s; flex-shrink:0; box-shadow:0 4px 12px rgba(139,92,246,0.35); }
        .btn-add:hover { transform:translateY(-2px) scale(1.05); box-shadow:0 8px 20px rgba(139,92,246,0.5); }
        .budget-table { width:100%; border-collapse:collapse; margin-top:0.5rem; }
        .budget-table thead tr { background:linear-gradient(135deg, #6d28d9, var(--primary,#8b5cf6)); }
        .budget-table th { color:#fff; font-size:0.72rem; font-weight:800; text-transform:uppercase; letter-spacing:0.08em; padding:0.85rem 1rem; text-align:left; }
        .budget-table th:last-child { text-align:right; }
        .budget-table td { padding:0.7rem 1rem; font-size:0.9rem; border-bottom:1px solid rgba(139,92,246,0.08); color:#334155; transition:background 0.15s; }
        .budget-table tbody tr:hover td { background:rgba(139,92,246,0.04); box-shadow:inset 4px 0 0 var(--primary,#8b5cf6); }
        .btn-remove { background:none; border:none; color:#cbd5e1; cursor:pointer; font-size:1rem; padding:3px 7px; border-radius:6px; transition:all 0.2s; }
        .btn-remove:hover { background:#fee2e2; color:#ef4444; }
        .budget-total-row { display:flex; justify-content:flex-end; align-items:center; gap:1rem; margin-top:1.2rem; padding-top:1rem; border-top:2px solid rgba(139,92,246,0.12); }
        .budget-total-label { font-size:1rem; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.06em; }
        .budget-total-value { font-size:1.6rem; font-weight:900; background:linear-gradient(135deg, var(--primary,#8b5cf6), #4c1d95); -webkit-background-clip:text; -webkit-text-fill-color:transparent; min-width:160px; text-align:right; }
        .pay-option { display:flex; align-items:center; gap:0.5rem; padding:0.6rem 1rem; background:rgba(139,92,246,0.06); border:1.5px solid rgba(139,92,246,0.15); border-radius:10px; cursor:pointer; transition:all 0.2s; font-size:0.88rem; font-weight:600; color:#374151; text-transform:none; letter-spacing:0; }
        .pay-option:has(input:checked) { background:rgba(139,92,246,0.12); border-color:var(--primary,#8b5cf6); color:#4c1d95; }
        .pay-option input { width:16px; height:16px; accent-color:var(--primary,#8b5cf6); cursor:pointer; }
        .btn-pdf { display:inline-flex; align-items:center; gap:0.6rem; background:linear-gradient(135deg, var(--primary,#8b5cf6), #6d28d9); color:#fff; border:none; border-radius:12px; padding:0.85rem 1.8rem; font-size:0.95rem; font-weight:800; cursor:pointer; transition:all 0.25s cubic-bezier(0.4,0,0.2,1); box-shadow:0 4px 15px rgba(139,92,246,0.4); letter-spacing:0.03em; text-transform:uppercase; position:relative; overflow:hidden; }
        .btn-pdf::after { content:''; position:absolute; top:0; left:-150%; width:60%; height:100%; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent); transform:skewX(-20deg); transition:none; }
        .btn-pdf:hover { transform:translateY(-2px); box-shadow:0 8px 25px rgba(139,92,246,0.55); }
        .btn-pdf:hover::after { left:200%; transition:left 0.6s; }
        .budget-empty { text-align:center; color:#94a3b8; font-size:0.9rem; padding:2rem; font-style:italic; }
        /* ── Tab switcher ── */
        .bud-tabs { display:flex; gap:0.5rem; background:rgba(255,255,255,0.6); backdrop-filter:blur(8px); border:1px solid rgba(139,92,246,0.15); border-radius:14px; padding:5px; margin-bottom:1.75rem; width:fit-content; }
        .bud-tab { padding:0.55rem 1.4rem; border:none; border-radius:10px; font-size:0.85rem; font-weight:700; cursor:pointer; transition:all 0.25s; background:transparent; color:#64748b; letter-spacing:0.03em; }
        .bud-tab.active { background:linear-gradient(135deg, var(--primary,#8b5cf6), #6d28d9); color:#fff; box-shadow:0 4px 12px rgba(139,92,246,0.35); }
        .btn-copy-data { display:flex; align-items:center; gap:0.4rem; background:rgba(139,92,246,0.1); color:var(--primary,#8b5cf6); border:1px solid rgba(139,92,246,0.2); border-radius:8px; padding:0.4rem 0.8rem; font-size:0.75rem; font-weight:700; cursor:pointer; transition:all 0.2s; text-transform:uppercase; letter-spacing:0.05em; }
        .btn-copy-data:hover { background:var(--primary,#8b5cf6); color:#fff; }
        /* ── Nota fields ── */
        .nota-desc { width:100%; padding:0.75rem 0.95rem; border:1.5px solid rgba(139,92,246,0.2); border-radius:10px; font-size:0.95rem; font-family:inherit; resize:vertical; min-height:100px; background:rgba(255,255,255,0.8); color:#1e1b4b; transition:all 0.25s; box-sizing:border-box; }
        .nota-desc:focus { outline:none; border-color:var(--primary,#8b5cf6); box-shadow:0 0 0 4px rgba(139,92,246,0.15); background:#fff; }
    </style>

    <div class="budget-title-bar">
        <div>
            <h1>Orçamentos</h1>
            <p class="budget-subtitle">Monte o orçamento e gere o PDF para enviar ao cliente.</p>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="url(#bud-grad)" stroke-width="1.3" style="opacity:0.4;flex-shrink:0;"><defs><linearGradient id="bud-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#8b5cf6"/><stop offset="100%" stop-color="#4c1d95"/></linearGradient></defs><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
    </div>

    <!-- Tab switcher -->
    <div class="bud-tabs">
        <button class="bud-tab active" id="bud-tab-orc">📄 Orçamento</button>
        <button class="bud-tab" id="bud-tab-nota">🧾 Nota Simples</button>
    </div>

    <!-- SEÇÃO: Orçamento -->
    <div id="bud-section-orc">
    <div class="budget-card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
            <div class="budget-section-title" style="margin-bottom:0;">Dados do Cliente</div>
            <button class="btn-copy-data" id="bud-btn-copy-client" title="Copiar modelo para enviar ao cliente">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                Copiar
            </button>
        </div>
        <div class="budget-grid-2" style="margin-bottom:1rem;">
            <div class="budget-field">
                <label>Nome / Razão Social</label>
                <input type="text" id="bud-client-name" placeholder="Nome do cliente">
            </div>
            <div class="budget-field">
                <label>CNPJ / CPF do Cliente</label>
                <input type="text" id="bud-client-cnpj" placeholder="00.000.000/0001-00">
            </div>
        </div>
        <!-- CEP + logradouro -->
        <div style="display:grid; grid-template-columns:160px 1fr 100px; gap:0.75rem; margin-bottom:0.75rem;">
            <div class="budget-field">
                <label>CEP <span id="bud-cep-status" style="font-weight:400; color:#94a3b8; font-size:0.68rem; text-transform:none; letter-spacing:0;"></span></label>
                <input type="text" id="bud-client-cep" placeholder="00000-000" maxlength="9">
            </div>
            <div class="budget-field">
                <label>Logradouro</label>
                <input type="text" id="bud-client-street" placeholder="Rua / Avenida">
            </div>
            <div class="budget-field">
                <label>Número</label>
                <input type="text" id="bud-client-num" placeholder="Nº">
            </div>
        </div>
        <!-- bairro + cidade + uf -->
        <div style="display:grid; grid-template-columns:1fr 1fr 80px; gap:0.75rem;">
            <div class="budget-field">
                <label>Bairro</label>
                <input type="text" id="bud-client-bairro" placeholder="Bairro">
            </div>
            <div class="budget-field">
                <label>Cidade</label>
                <input type="text" id="bud-client-city" placeholder="Cidade">
            </div>
            <div class="budget-field">
                <label>UF</label>
                <input type="text" id="bud-client-uf" placeholder="MG" maxlength="2">
            </div>
        </div>
    </div>

    <!-- Adicionar itens -->
    <div class="budget-card">
        <div class="budget-section-title">Adicionar Produto / Serviço</div>
        <div class="budget-grid-3">
            <div class="budget-field">
                <label>Descrição</label>
                <input type="text" id="bud-item-desc" placeholder="Nome do produto ou serviço">
            </div>
            <div class="budget-field">
                <label>Quantidade</label>
                <input type="number" id="bud-item-qty" placeholder="1" min="1" value="1">
            </div>
            <div class="budget-field">
                <label>Preço Unit. (R$)</label>
                <input type="number" id="bud-item-price" placeholder="0,00" min="0" step="0.01">
            </div>
            <button class="btn-add" id="bud-btn-add" title="Adicionar item">+</button>
        </div>
    </div>

    <!-- Tabela de itens -->
    <div class="budget-card">
        <div class="budget-section-title">Itens do Orçamento</div>
        <table class="budget-table">
            <thead>
                <tr>
                    <th style="width:45%">Descrição</th>
                    <th style="width:15%; text-align:center;">Qtd</th>
                    <th style="width:18%; text-align:right;">Preço Unit.</th>
                    <th style="width:18%; text-align:right;">Subtotal</th>
                    <th style="width:4%"></th>
                </tr>
            </thead>
            <tbody id="bud-tbody">
                <tr id="bud-empty-row">
                    <td colspan="5" class="budget-empty">Nenhum item adicionado ainda.</td>
                </tr>
            </tbody>
        </table>
        <div class="budget-total-row">
            <span class="budget-total-label">TOTAL:</span>
            <span class="budget-total-value" id="bud-total">R$ 0,00</span>
        </div>
    </div>

    <!-- Condições comerciais -->
    <div class="budget-card">
        <div class="budget-section-title">Condições Comerciais</div>
        <div class="budget-grid-2" style="margin-bottom:1rem;">
            <div class="budget-field">
                <label>Prazo de Entrega</label>
                <input type="text" id="bud-delivery" placeholder="Ex: 5 dias úteis após aprovação">
            </div>
            <div class="budget-field">
                <label>Forma de Pagamento</label>
                <input type="text" id="bud-payment" placeholder="Ex: 50% entrada + 50% na entrega">
            </div>
        </div>
        <div class="budget-field">
            <label style="margin-bottom:0.6rem;">Tipo de Pagamento</label>
            <div style="display:flex; gap:0.75rem; flex-wrap:wrap; align-items:center;">
                <label class="pay-option">
                    <input type="checkbox" id="bud-pay-card"> 💳 Cartão
                </label>
                <!-- parcelas — aparece só quando cartão está marcado -->
                <div id="bud-installments-wrap" style="display:none; align-items:center; gap:0.5rem;">
                    <select id="bud-installments" style="padding:0.55rem 0.75rem; border:1.5px solid rgba(139,92,246,0.3); border-radius:10px; font-size:0.88rem; font-weight:700; color:#4c1d95; background:#f5f3ff; cursor:pointer; outline:none;">
                        <option value="1">1x à vista</option>
                        <option value="2">2x</option>
                        <option value="3">3x</option>
                        <option value="4">4x</option>
                        <option value="5">5x</option>
                        <option value="6">6x</option>
                        <option value="7">7x</option>
                        <option value="8">8x</option>
                        <option value="9">9x</option>
                        <option value="10">10x</option>
                        <option value="11">11x</option>
                        <option value="12">12x</option>
                    </select>
                    <span style="font-size:0.8rem; color:#64748b; font-weight:600;">parcelas</span>
                </div>
                <label class="pay-option">
                    <input type="checkbox" id="bud-pay-pix"> ⚡ PIX
                </label>
                <label class="pay-option">
                    <input type="checkbox" id="bud-pay-cash"> 💵 Dinheiro
                </label>
            </div>
        </div>
    </div>

    <!-- Ações -->
    <div style="display:flex; justify-content:flex-end;">
        <button class="btn-pdf" id="bud-btn-pdf">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            Gerar PDF
        </button>
    </div>

    </div> <!-- /bud-section-orc -->




    <!-- SEÇÃO: Nota Simples -->
    <div id="bud-section-nota" style="display:none;">

        <!-- Dados do cliente nota -->
        <div class="budget-card">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                <div class="budget-section-title" style="margin-bottom:0;">Dados do Cliente</div>
                <button class="btn-copy-data" id="nota-btn-copy-client" title="Copiar modelo para enviar ao cliente">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                    Copiar
                </button>
            </div>
            <div class="budget-grid-2" style="margin-bottom:1rem;">
                <div class="budget-field">
                    <label>Nome / Razão Social</label>
                    <input type="text" id="nota-client-name" placeholder="Nome do cliente">
                </div>
                <div class="budget-field">
                    <label>CNPJ / CPF do Cliente</label>
                    <input type="text" id="nota-client-cnpj" placeholder="00.000.000/0001-00">
                </div>
            </div>
            <div style="display:grid; grid-template-columns:160px 1fr 100px; gap:0.75rem; margin-bottom:0.75rem;">
                <div class="budget-field">
                    <label>CEP <span id="nota-cep-status" style="font-weight:400;color:#94a3b8;font-size:0.68rem;text-transform:none;letter-spacing:0;"></span></label>
                    <input type="text" id="nota-client-cep" placeholder="00000-000" maxlength="9">
                </div>
                <div class="budget-field">
                    <label>Logradouro</label>
                    <input type="text" id="nota-client-street" placeholder="Rua / Avenida">
                </div>
                <div class="budget-field">
                    <label>Número</label>
                    <input type="text" id="nota-client-num" placeholder="Nº">
                </div>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr 80px; gap:0.75rem;">
                <div class="budget-field"><label>Bairro</label><input type="text" id="nota-client-bairro" placeholder="Bairro"></div>
                <div class="budget-field"><label>Cidade</label><input type="text" id="nota-client-city" placeholder="Cidade"></div>
                <div class="budget-field"><label>UF</label><input type="text" id="nota-client-uf" placeholder="MG" maxlength="2"></div>
            </div>
        </div>

        <!-- Serviço -->
        <div class="budget-card">
            <div class="budget-section-title">Serviço / Produto</div>
            <div class="budget-field" style="margin-bottom:1rem;">
                <label>Descrição do Serviço</label>
                <textarea class="nota-desc" id="nota-desc" placeholder="Descreva o serviço ou produto fornecido..."></textarea>
            </div>
            <div class="budget-grid-2">
                <div class="budget-field">
                    <label>Valor do Serviço (R$)</label>
                    <input type="number" id="nota-value" placeholder="0,00" min="0" step="0.01">
                </div>
                <div class="budget-field">
                    <label>Data</label>
                    <input type="date" id="nota-date">
                </div>
            </div>
        </div>

        <!-- Ação -->
        <div style="display:flex; justify-content:flex-end;">
            <button class="btn-pdf" id="nota-btn-pdf">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                Gerar Nota PDF (A5)
            </button>
        </div>

    </div> <!-- /bud-section-nota -->
    `;

    // ── Persistência localStorage ────────────────────────────────────────────
    const STORAGE_KEY = 'lm_budget_draft';

    const saveState = () => {
        const state = {
            tab: container.querySelector('#bud-tab-orc').classList.contains('active') ? 'orc' : 'nota',
            orc: {
                name:    container.querySelector('#bud-client-name').value,
                cnpj:    container.querySelector('#bud-client-cnpj').value,
                cep:     container.querySelector('#bud-client-cep').value,
                street:  container.querySelector('#bud-client-street').value,
                num:     container.querySelector('#bud-client-num').value,
                bairro:  container.querySelector('#bud-client-bairro').value,
                city:    container.querySelector('#bud-client-city').value,
                uf:      container.querySelector('#bud-client-uf').value,
                delivery:container.querySelector('#bud-delivery').value,
                payment: container.querySelector('#bud-payment').value,
                payCard: container.querySelector('#bud-pay-card').checked,
                payPix:  container.querySelector('#bud-pay-pix').checked,
                payCash: container.querySelector('#bud-pay-cash').checked,
                installments: container.querySelector('#bud-installments').value,
            },
            nota: {
                name:   container.querySelector('#nota-client-name').value,
                cnpj:   container.querySelector('#nota-client-cnpj').value,
                cep:    container.querySelector('#nota-client-cep').value,
                street: container.querySelector('#nota-client-street').value,
                num:    container.querySelector('#nota-client-num').value,
                bairro: container.querySelector('#nota-client-bairro').value,
                city:   container.querySelector('#nota-client-city').value,
                uf:     container.querySelector('#nota-client-uf').value,
                desc:   container.querySelector('#nota-desc').value,
                value:  container.querySelector('#nota-value').value,
                date:   container.querySelector('#nota-date').value,
            },
            items: [...items],
        };
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e) {}
    };

    const clearState = () => { try { localStorage.removeItem(STORAGE_KEY); } catch(e) {} };

    // ── Estado ──────────────────────────────────────────────────────────────
    const items = [];

    // ── Tab switcher ────────────────────────────────────────────────────────
    const tabOrc  = container.querySelector('#bud-tab-orc');
    const tabNota = container.querySelector('#bud-tab-nota');
    const secOrc  = container.querySelector('#bud-section-orc');
    const secNota = container.querySelector('#bud-section-nota');
    tabOrc.addEventListener('click', () => {
        tabOrc.classList.add('active'); tabNota.classList.remove('active');
        secOrc.style.display = ''; secNota.style.display = 'none';
        saveState();
    });
    tabNota.addEventListener('click', () => {
        tabNota.classList.add('active'); tabOrc.classList.remove('active');
        secNota.style.display = ''; secOrc.style.display = 'none';
        saveState();
    });

    // ── Cartao: mostrar/ocultar parcelas ──────────────────────────────────
    const cardCheckbox       = container.querySelector('#bud-pay-card');
    const installmentsWrap   = container.querySelector('#bud-installments-wrap');
    cardCheckbox.addEventListener('change', () => {
        installmentsWrap.style.display = cardCheckbox.checked ? 'flex' : 'none';
        saveState();
    });

    const fmt = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const updateTotal = () => {
        const total = items.reduce((s, i) => s + i.qty * i.price, 0);
        container.querySelector('#bud-total').textContent = fmt(total);
    };

    const rebuildTable = () => {
        const tbody = container.querySelector('#bud-tbody');
        tbody.innerHTML = '';
        if (items.length === 0) {
            tbody.innerHTML = '<tr id="bud-empty-row"><td colspan="5" class="budget-empty">Nenhum item adicionado ainda.</td></tr>';
        } else {
            items.forEach((item, idx) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${item.desc}</td>
                    <td style="text-align:center;">${item.qty}</td>
                    <td style="text-align:right;">${fmt(item.price)}</td>
                    <td style="text-align:right;font-weight:700;">${fmt(item.qty * item.price)}</td>
                    <td><button class="btn-remove" data-idx="${idx}" title="Remover">✕</button></td>
                `;
                tbody.appendChild(tr);
            });
        }
        tbody.querySelectorAll('.btn-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                items.splice(parseInt(btn.dataset.idx), 1);
                rebuildTable();
                updateTotal();
                saveState();
            });
        });
        updateTotal();
    };

    // ── CEP auto-fill via ViaCEP ──────────────────────────────────────────
    const cepInput  = container.querySelector('#bud-client-cep');
    const cepStatus = container.querySelector('#bud-cep-status');

    const applyCepMask = (v) => v.replace(/\D/g,'').replace(/^(\d{5})(\d)/,'$1-$2').slice(0,9);

    cepInput.addEventListener('input', () => {
        cepInput.value = applyCepMask(cepInput.value);
        const raw = cepInput.value.replace(/\D/g,'');
        if (raw.length === 8) fetchCep(raw);
    });

    const fetchCep = async (cep) => {
        cepStatus.textContent = 'buscando…';
        cepStatus.style.color = '#94a3b8';
        try {
            const res  = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await res.json();
            if (data.erro) {
                cepStatus.textContent = 'CEP não encontrado';
                cepStatus.style.color = '#ef4444';
                return;
            }
            container.querySelector('#bud-client-street').value = data.logradouro || '';
            container.querySelector('#bud-client-bairro').value = data.bairro     || '';
            container.querySelector('#bud-client-city').value   = data.localidade || '';
            container.querySelector('#bud-client-uf').value     = data.uf         || '';
            cepStatus.textContent = '✓ preenchido';
            cepStatus.style.color = '#10b981';
            // foca no número para o usuário completar
            container.querySelector('#bud-client-num').focus();
        } catch {
            cepStatus.textContent = 'erro na busca';
            cepStatus.style.color = '#ef4444';
        }
    };

    // Adicionar item

    container.querySelector('#bud-btn-add').addEventListener('click', () => {
        const desc  = container.querySelector('#bud-item-desc').value.trim();
        const qty   = parseFloat(container.querySelector('#bud-item-qty').value) || 1;
        const price = parseFloat(container.querySelector('#bud-item-price').value) || 0;
        if (!desc) { container.querySelector('#bud-item-desc').focus(); return; }
        items.push({ desc, qty, price });
        rebuildTable();
        saveState();
        container.querySelector('#bud-item-desc').value = '';
        container.querySelector('#bud-item-qty').value = '1';
        container.querySelector('#bud-item-price').value = '';
        container.querySelector('#bud-item-desc').focus();
    });

    // Enter no campo de preço também adiciona
    container.querySelector('#bud-item-price').addEventListener('keydown', e => {
        if (e.key === 'Enter') container.querySelector('#bud-btn-add').click();
    });

    // Auto-salva ao digitar em qualquer campo do formulário
    container.addEventListener('input', saveState);
    container.addEventListener('change', saveState);

    // ── Gerar PDF ───────────────────────────────────────────────────────────
    container.querySelector('#bud-btn-pdf').addEventListener('click', () => {
        const clientName    = container.querySelector('#bud-client-name').value.trim()   || '—';
        const clientCnpj    = container.querySelector('#bud-client-cnpj').value.trim()   || '—';
        const street  = container.querySelector('#bud-client-street').value.trim();
        const num     = container.querySelector('#bud-client-num').value.trim();
        const bairro  = container.querySelector('#bud-client-bairro').value.trim();
        const city    = container.querySelector('#bud-client-city').value.trim();
        const uf      = container.querySelector('#bud-client-uf').value.trim();
        const cep     = container.querySelector('#bud-client-cep').value.trim();
        const clientAddress = [
            street + (num ? ', ' + num : ''),
            bairro,
            city + (uf ? '/' + uf : ''),
            cep ? 'CEP ' + cep : ''
        ].filter(Boolean).join(' – ') || '—';
        const delivery      = container.querySelector('#bud-delivery').value.trim() || '—';
        const payment       = container.querySelector('#bud-payment').value.trim()  || '—';
        const payTypes = [];
        if (container.querySelector('#bud-pay-card').checked) {
            const inst = container.querySelector('#bud-installments').value;
            payTypes.push(inst === '1' ? 'Cartão à vista' : `Cartão ${inst}x`);
        }
        if (container.querySelector('#bud-pay-pix').checked)   payTypes.push('PIX');
        if (container.querySelector('#bud-pay-cash').checked)  payTypes.push('Dinheiro');
        const payTypesStr = payTypes.length ? payTypes.join(' · ') : '—';

        const today = new Date();
        const due   = new Date(today); due.setDate(due.getDate() + 30);
        const fmtDate = (d) => d.toLocaleDateString('pt-BR');
        const numOrc = `ORC-${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}-${String(Math.floor(Math.random()*9000)+1000)}`;

        const totalVal = items.reduce((s, i) => s + i.qty * i.price, 0);

        // Linhas da tabela (garante mínimo de linhas para layout)
        const MIN_ROWS = 12;
        let rowsHtml = items.map(item => `
            <tr>
                <td style="padding:7px 10px; border-bottom:1px solid #e5e7eb;">${item.desc}</td>
                <td style="padding:7px 10px; border-bottom:1px solid #e5e7eb; text-align:center;">${item.qty}</td>
                <td style="padding:7px 10px; border-bottom:1px solid #e5e7eb; text-align:right;">${fmt(item.price)}</td>
                <td style="padding:7px 10px; border-bottom:1px solid #e5e7eb; text-align:right; font-weight:700;">${fmt(item.qty * item.price)}</td>
            </tr>`).join('');

        const emptyRows = Math.max(0, MIN_ROWS - items.length);
        for (let i = 0; i < emptyRows; i++) {
            rowsHtml += `<tr><td style="padding:7px 10px; border-bottom:1px solid #e5e7eb;">&nbsp;</td><td style="padding:7px 10px; border-bottom:1px solid #e5e7eb;"></td><td style="padding:7px 10px; border-bottom:1px solid #e5e7eb;"></td><td style="padding:7px 10px; border-bottom:1px solid #e5e7eb;"></td></tr>`;
        }

        const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Inter',Arial,sans-serif; background:#fff; color:#1e1b4b; width:210mm; min-height:297mm; position:relative; }
  .page { width:210mm; min-height:297mm; background:#fff; display:flex; flex-direction:column; overflow:hidden; }

  /* HEADER */
  .header { display:flex; align-items:center; padding:28px 36px 16px; gap:24px; }
  .header-logo { width:80px; filter: brightness(0) saturate(100%) invert(27%) sepia(90%) saturate(1600%) hue-rotate(248deg) brightness(0.92); }
  .header-title { font-size:48px; font-weight:900; color:#6d28d9; letter-spacing:-1px; text-transform:uppercase; font-style:italic; flex:1; text-align:center; padding-right:80px; }

  /* INFO STRIP */
  .info-strip { display:flex; justify-content:space-between; padding:6px 36px 10px; font-size:10px; color:#6b7280; border-bottom:2px solid #7c3aed; margin:0 36px; }
  .info-strip strong { color:#4c1d95; }

  /* LM / CLIENTE */
  .parties { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin:14px 36px; }
  .party-box { background:#f5f3ff; border-radius:8px; padding:10px 14px; font-size:10px; }
  .party-box .party-label { font-size:9px; font-weight:800; text-transform:uppercase; letter-spacing:0.08em; color:#7c3aed; margin-bottom:4px; }
  .party-box .party-name { font-size:12px; font-weight:700; color:#1e1b4b; margin-bottom:2px; }

  /* TABELA */
  .table-wrap { margin:4px 36px 0; flex:1; }
  table { width:100%; border-collapse:collapse; }
  thead th { background:#6d28d9; color:#fff; font-size:9px; font-weight:800; text-transform:uppercase; letter-spacing:0.08em; padding:8px 10px; }
  thead th:nth-child(2) { text-align:center; }
  thead th:nth-child(3), thead th:nth-child(4) { text-align:right; }
  tfoot td { font-size:11px; font-weight:900; color:#6d28d9; padding:8px 10px; border-top:2px solid #6d28d9; }

  /* FOOTER decorativo */
  .footer-wave { position:relative; margin-top:auto; height:110px; overflow:hidden; }
  .footer-wave svg { position:absolute; bottom:0; width:100%; }
</style>
</head>
<body>
<div class="page">

  <!-- CABEÇALHO -->
  <div class="header">
    <img class="header-logo" src="/logo.png" alt="LM Gráfica">
    <div class="header-title">ORÇAMENTO</div>
  </div>

  <!-- STRIP: número / datas -->
  <div class="info-strip">
    <span><strong>Nº:</strong> ${numOrc}</span>
    <span><strong>Emissão:</strong> ${fmtDate(today)}</span>
    <span><strong>Validade:</strong> ${fmtDate(due)}</span>
  </div>

  <!-- FORNECEDOR / CLIENTE -->
  <div class="parties">
    <div class="party-box">
      <div class="party-label">Emitido por</div>
      <div class="party-name">LM GRÁFICA</div>
      <div><strong>CNPJ:</strong> ${LM.cnpj}</div>
      <div><strong>End.:</strong> ${LM.endereco}</div>
    </div>
    <div class="party-box">
      <div class="party-label">Cliente</div>
      <div class="party-name">${clientName}</div>
      <div><strong>CNPJ/CPF:</strong> ${clientCnpj}</div>
      <div><strong>End.:</strong> ${clientAddress}</div>
    </div>
  </div>

  <!-- TABELA DE ITENS -->
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th style="width:48%; text-align:left;">Descrição</th>
          <th style="width:10%;">Qtd</th>
          <th style="width:20%;">Preço Unit.</th>
          <th style="width:22%;">Valor</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
      <tfoot>
        <tr>
          <td colspan="3" style="text-align:right; letter-spacing:0.05em;">TOTAL:</td>
          <td style="text-align:right;">${fmt(totalVal)}</td>
        </tr>
      </tfoot>
    </table>
  </div>

  <!-- CONDIÇÕES COMERCIAIS -->
  <div style="margin:12px 36px 0; display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px;">
    <div style="background:#f5f3ff; border-radius:8px; padding:10px 14px; font-size:10px;">
      <div style="font-size:9px; font-weight:800; text-transform:uppercase; letter-spacing:0.08em; color:#7c3aed; margin-bottom:4px;">Prazo de Entrega</div>
      <div style="color:#1e1b4b; font-weight:600;">${delivery}</div>
    </div>
    <div style="background:#f5f3ff; border-radius:8px; padding:10px 14px; font-size:10px;">
      <div style="font-size:9px; font-weight:800; text-transform:uppercase; letter-spacing:0.08em; color:#7c3aed; margin-bottom:4px;">Forma de Pagamento</div>
      <div style="color:#1e1b4b; font-weight:600;">${payment}</div>
    </div>
    <div style="background:#f5f3ff; border-radius:8px; padding:10px 14px; font-size:10px;">
      <div style="font-size:9px; font-weight:800; text-transform:uppercase; letter-spacing:0.08em; color:#7c3aed; margin-bottom:4px;">Tipo de Pagamento</div>
      <div style="color:#1e1b4b; font-weight:600;">${payTypesStr}</div>
    </div>
  </div>

  <!-- FOOTER decorativo (ondas roxas como na imagem) -->
  <div class="footer-wave">
    <svg viewBox="0 0 794 110" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
      <!-- blob esquerdo -->
      <ellipse cx="120" cy="110" rx="130" ry="80" fill="#7c3aed" opacity="0.85"/>
      <ellipse cx="80" cy="120" rx="90" ry="60" fill="#5b21b6"/>
      <!-- blob centro-esq -->
      <ellipse cx="320" cy="115" rx="110" ry="70" fill="#6d28d9" opacity="0.9"/>
      <ellipse cx="290" cy="130" rx="80" ry="55" fill="#4c1d95"/>
      <!-- blob direito -->
      <ellipse cx="650" cy="108" rx="160" ry="85" fill="#7c3aed" opacity="0.85"/>
      <ellipse cx="700" cy="125" rx="110" ry="60" fill="#5b21b6"/>
      <!-- blob centro-dir -->
      <ellipse cx="490" cy="120" rx="80" ry="50" fill="#6d28d9" opacity="0.7"/>
    </svg>
  </div>

</div>
</body>
</html>`;

        // Limpa o rascunho salvo ao concluir e abre o PDF
        clearState();
        const win = window.open('', '_blank');
        win.document.write(html);
        win.document.close();
        win.onload = () => {
            setTimeout(() => {
                win.focus();
                win.print();
            }, 600);
        };
    });

    // ── CEP Nota Simples ─────────────────────────────────────────────────────
    const notaCepInput  = container.querySelector('#nota-client-cep');
    const notaCepStatus = container.querySelector('#nota-cep-status');
    notaCepInput.addEventListener('input', () => {
        notaCepInput.value = notaCepInput.value.replace(/\D/g,'').replace(/^(\d{5})(\d)/,'$1-$2').slice(0,9);
        const raw = notaCepInput.value.replace(/\D/g,'');
        if (raw.length === 8) fetchNotaCep(raw);
    });
    const fetchNotaCep = async (cep) => {
        notaCepStatus.textContent = 'buscando…'; notaCepStatus.style.color = '#94a3b8';
        try {
            const data = await (await fetch(`https://viacep.com.br/ws/${cep}/json/`)).json();
            if (data.erro) { notaCepStatus.textContent = 'não encontrado'; notaCepStatus.style.color = '#ef4444'; return; }
            container.querySelector('#nota-client-street').value = data.logradouro || '';
            container.querySelector('#nota-client-bairro').value = data.bairro     || '';
            container.querySelector('#nota-client-city').value   = data.localidade || '';
            container.querySelector('#nota-client-uf').value     = data.uf         || '';
            notaCepStatus.textContent = '✓'; notaCepStatus.style.color = '#10b981';
            container.querySelector('#nota-client-num').focus();
        } catch { notaCepStatus.textContent = 'erro'; notaCepStatus.style.color = '#ef4444'; }
    };

    // Preenche data de hoje por padrão
    const notaDateInput = container.querySelector('#nota-date');
    notaDateInput.value = new Date().toISOString().slice(0,10);

    // ── Gerar Nota Simples PDF (A5) ──────────────────────────────────────────
    container.querySelector('#nota-btn-pdf').addEventListener('click', () => {
        const cName   = container.querySelector('#nota-client-name').value.trim()   || '—';
        const cCnpj   = container.querySelector('#nota-client-cnpj').value.trim()   || '—';
        const nStreet = container.querySelector('#nota-client-street').value.trim();
        const nNum    = container.querySelector('#nota-client-num').value.trim();
        const nBairro = container.querySelector('#nota-client-bairro').value.trim();
        const nCity   = container.querySelector('#nota-client-city').value.trim();
        const nUf     = container.querySelector('#nota-client-uf').value.trim();
        const nCep    = container.querySelector('#nota-client-cep').value.trim();
        const cAddr   = [nStreet+(nNum?', '+nNum:''), nBairro, nCity+(nUf?'/'+nUf:''), nCep?'CEP '+nCep:''].filter(Boolean).join(' – ') || '—';
        const desc    = container.querySelector('#nota-desc').value.trim() || '—';
        const value   = parseFloat(container.querySelector('#nota-value').value) || 0;
        const dateRaw = container.querySelector('#nota-date').value;
        const dateStr = dateRaw ? new Date(dateRaw+'T12:00:00').toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');
        const numNota = `NS-${Date.now().toString().slice(-8)}`;

        const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
  @page { size: A5; margin: 0; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Inter',Arial,sans-serif; width:148mm; min-height:210mm; background:#fff; color:#1e1b4b; }
  .page { width:148mm; min-height:210mm; display:flex; flex-direction:column; }

  /* HEADER */
  .header { display:flex; align-items:center; padding:18px 24px 12px; gap:14px; border-bottom:3px solid #6d28d9; }
  .header img { width:55px; filter:brightness(0) saturate(100%) invert(27%) sepia(90%) saturate(1600%) hue-rotate(248deg) brightness(0.92); }
  .header-right { flex:1; }
  .header-title { font-size:22px; font-weight:900; color:#6d28d9; text-transform:uppercase; letter-spacing:-0.5px; }
  .header-sub { font-size:9px; color:#94a3b8; font-weight:600; margin-top:1px; }

  /* META */
  .meta { display:flex; justify-content:space-between; padding:8px 24px; background:#f5f3ff; font-size:9px; color:#6b7280; }
  .meta strong { color:#4c1d95; }

  /* PARTIES */
  .parties { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin:12px 24px 0; }
  .party { background:#fff; border:1px solid #e8e3f7; border-radius:8px; padding:10px 12px; font-size:9.5px; }
  .party-label { font-size:8px; font-weight:800; text-transform:uppercase; letter-spacing:0.1em; color:#7c3aed; margin-bottom:4px; }
  .party-name { font-size:12px; font-weight:800; color:#1e1b4b; margin-bottom:3px; }

  /* DIVIDER */
  .divider { margin:14px 24px 0; height:2px; background:linear-gradient(90deg,#6d28d9,#a78bfa,transparent); border-radius:2px; }

  /* SERVIÇO */
  .service-section { margin:14px 24px 0; flex:1; }
  .section-label { font-size:8px; font-weight:800; text-transform:uppercase; letter-spacing:0.1em; color:#7c3aed; margin-bottom:8px; }
  .service-box { background:#faf5ff; border:1px solid #e8e3f7; border-radius:10px; padding:14px 16px; font-size:11px; line-height:1.6; color:#334155; min-height:80px; }

  /* VALOR */
  .value-row { margin:12px 24px 0; display:flex; justify-content:flex-end; }
  .value-box { background:linear-gradient(135deg,#6d28d9,#8b5cf6); color:#fff; border-radius:10px; padding:12px 20px; text-align:right; }
  .value-label { font-size:8px; font-weight:800; text-transform:uppercase; letter-spacing:0.1em; opacity:0.75; }
  .value-amount { font-size:22px; font-weight:900; margin-top:2px; }

  /* FOOTER */
  .footer { margin:16px 24px 0; padding-top:10px; border-top:1px dashed #d8b4fe; font-size:8px; color:#94a3b8; text-align:center; line-height:1.6; }
  .footer-wave { margin-top:auto; height:50px; overflow:hidden; }
  .footer-wave svg { width:100%; display:block; }
</style>
</head>
<body>
<div class="page">

  <div class="header">
    <img src="/logo.png" alt="LM Ingressos">
    <div class="header-right">
      <div class="header-title">Nota Simples</div>
      <div class="header-sub">LM INGRESSOS / GRÁFICA</div>
    </div>
  </div>

  <div class="meta">
    <span><strong>Nº:</strong> ${numNota}</span>
    <span><strong>Data:</strong> ${dateStr}</span>
    <span><strong>CNPJ:</strong> ${LM.cnpj}</span>
  </div>

  <div class="parties">
    <div class="party">
      <div class="party-label">Emitido por</div>
      <div class="party-name">LM INGRESSOS</div>
      <div><strong>CNPJ:</strong> ${LM.cnpj}</div>
      <div><strong>End.:</strong> ${LM.endereco}</div>
    </div>
    <div class="party">
      <div class="party-label">Cliente</div>
      <div class="party-name">${cName}</div>
      <div><strong>CNPJ/CPF:</strong> ${cCnpj}</div>
      <div><strong>End.:</strong> ${cAddr}</div>
    </div>
  </div>

  <div class="divider"></div>

  <div class="service-section">
    <div class="section-label">Descrição do Serviço / Produto</div>
    <div class="service-box">${desc.replace(/\n/g,'<br>')}</div>
  </div>

  <div class="value-row">
    <div class="value-box">
      <div class="value-label">Valor Total</div>
      <div class="value-amount">${fmt(value)}</div>
    </div>
  </div>

  <div class="footer">
    Este documento é uma nota simples e não substitui documentos fiscais oficiais.<br>
    LM INGRESSOS · CNPJ ${LM.cnpj} · ${LM.endereco}
  </div>

  <div class="footer-wave">
    <svg viewBox="0 0 420 50" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
      <ellipse cx="80" cy="55" rx="100" ry="50" fill="#7c3aed" opacity="0.8"/>
      <ellipse cx="55" cy="65" rx="70" ry="40" fill="#5b21b6"/>
      <ellipse cx="220" cy="58" rx="90" ry="48" fill="#6d28d9" opacity="0.85"/>
      <ellipse cx="195" cy="70" rx="65" ry="38" fill="#4c1d95"/>
      <ellipse cx="360" cy="54" rx="90" ry="50" fill="#7c3aed" opacity="0.8"/>
      <ellipse cx="390" cy="68" rx="70" ry="38" fill="#5b21b6"/>
    </svg>
  </div>

</div>
</body>
</html>`;

        clearState();
        const win = window.open('', '_blank');
        win.document.write(html);
        win.document.close();
        win.onload = () => setTimeout(() => { win.focus(); win.print(); }, 500);
    });

    // ── Botões de Copiar Dados do Cliente ────────────────────────────────────
    const copyClientDataTemplate = (btn) => {
        const template = `Olá! Para gerarmos o seu documento, por favor nos envie os seguintes dados:

Nome / Razão Social: 
CNPJ / CPF: 
CEP: 
Logradouro: 
Número: 
Bairro: 
Cidade: 
UF: `;
        navigator.clipboard.writeText(template).then(() => {
            const originalText = btn.innerHTML;
            btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg> Copiado!`;
            setTimeout(() => { btn.innerHTML = originalText; }, 2000);
        }).catch(err => console.error('Erro ao copiar', err));
    };

    container.querySelector('#bud-btn-copy-client').addEventListener('click', (e) => copyClientDataTemplate(e.currentTarget));
    container.querySelector('#nota-btn-copy-client').addEventListener('click', (e) => copyClientDataTemplate(e.currentTarget));

    // ── Restaurar rascunho salvo do localStorage ─────────────────────────────
    const restoreState = () => {
        let saved;
        try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch(e) {}
        if (!saved) return;

        // Restaurar aba ativa
        if (saved.tab === 'nota') {
            tabNota.classList.add('active'); tabOrc.classList.remove('active');
            secNota.style.display = ''; secOrc.style.display = 'none';
        }

        // Restaurar campos do Orçamento
        if (saved.orc) {
            const o = saved.orc;
            const set = (id, val) => { const el = container.querySelector(id); if (el && val !== undefined) el.value = val; };
            set('#bud-client-name',    o.name);
            set('#bud-client-cnpj',    o.cnpj);
            set('#bud-client-cep',     o.cep);
            set('#bud-client-street',  o.street);
            set('#bud-client-num',     o.num);
            set('#bud-client-bairro',  o.bairro);
            set('#bud-client-city',    o.city);
            set('#bud-client-uf',      o.uf);
            set('#bud-delivery',       o.delivery);
            set('#bud-payment',        o.payment);
            set('#bud-installments',   o.installments);
            if (o.payCard) { cardCheckbox.checked = true; installmentsWrap.style.display = 'flex'; }
            if (o.payPix)  container.querySelector('#bud-pay-pix').checked  = true;
            if (o.payCash) container.querySelector('#bud-pay-cash').checked = true;
        }

        // Restaurar campos da Nota
        if (saved.nota) {
            const n = saved.nota;
            const set = (id, val) => { const el = container.querySelector(id); if (el && val !== undefined) el.value = val; };
            set('#nota-client-name',   n.name);
            set('#nota-client-cnpj',   n.cnpj);
            set('#nota-client-cep',    n.cep);
            set('#nota-client-street', n.street);
            set('#nota-client-num',    n.num);
            set('#nota-client-bairro', n.bairro);
            set('#nota-client-city',   n.city);
            set('#nota-client-uf',     n.uf);
            set('#nota-desc',          n.desc);
            set('#nota-value',         n.value);
            if (n.date) set('#nota-date', n.date);
        }

        // Restaurar itens do Orçamento
        if (Array.isArray(saved.items) && saved.items.length > 0) {
            saved.items.forEach(item => items.push(item));
            rebuildTable();
        }
    };

    restoreState();

    return container;
};
