export const render = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const clientId = user.client_id;
    const container = document.createElement('div');

    container.innerHTML = `
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;900&display=swap" rel="stylesheet">
        <style>
            :root {
                --loyalty-primary: #b45309;
                --loyalty-secondary: #f59e0b;
                --loyalty-bg: #ffffff;
                --loyalty-text: #1e293b;
                --loyalty-accent: rgba(180, 83, 9, 0.1);
            }

            .loyalty-container {
                font-family: 'Outfit', sans-serif;
                animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1);
                color: var(--loyalty-text);
            }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            
            .loyalty-tab-btn {
                display: flex; align-items: center; gap: 0.5rem;
                padding: 0.85rem 1.75rem; border: none; background: transparent;
                border-radius: 50px; font-size: 0.95rem; font-weight: 800;
                color: #64748b; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); white-space: nowrap;
            }
            .loyalty-tab-btn.active {
                background: linear-gradient(135deg, #b45309, #f59e0b); color: white;
                box-shadow: 0 4px 15px rgba(180,83,9,0.3);
                transform: translateY(-2px);
            }
            .loyalty-tab-btn:hover:not(.active) { background: rgba(245,158,11,0.1); color: #92400e; transform: translateY(-1px); }
            
            .loyalty-panel { display: none; opacity: 0; transition: opacity 0.3s; }
            .loyalty-panel.active { display: block; opacity: 1; animation: slideUp 0.4s ease-out; }
            @keyframes slideUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
            
            .mov-row {
                display: flex; align-items: center; gap: 1rem;
                padding: 1.25rem 1.5rem; border-bottom: 1px solid #f1f5f9;
                transition: all 0.2s;
            }
            .mov-row:hover { background: #f8fafc; transform: scale(1.005); border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); border-bottom-color: transparent; z-index: 10; position: relative; }
            .mov-row:last-child { border-bottom: none; }
            
            .order-card {
                background: white; border-radius: 16px; border: 1px solid #f1f5f9;
                padding: 1.5rem; margin-bottom: 1rem;
                box-shadow: 0 4px 15px rgba(0,0,0,0.03);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                position: relative; overflow: hidden;
            }
            .order-card::before {
                content: ''; position: absolute; top: 0; left: 0; width: 4px; height: 100%;
                background: linear-gradient(to bottom, #f59e0b, #b45309);
                opacity: 0; transition: opacity 0.3s;
            }
            .order-card:hover { 
                box-shadow: 0 15px 35px rgba(0,0,0,0.1); 
                transform: translateY(-5px) scale(1.01);
                border-color: var(--loyalty-secondary);
            }
            .order-card:hover::before { opacity: 1; }

            .premium-stock-card {
                background: rgba(255, 255, 255, 0.8);
                backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
                border: 1px solid rgba(255,255,255,0.5);
                box-shadow: 0 10px 30px rgba(0,0,0,0.05);
                border-radius: 20px;
                padding: 1.5rem;
                transition: all 0.3s;
                position: relative;
                overflow: hidden;
            }
            .premium-stock-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 15px 35px rgba(0,0,0,0.1);
            }
            .premium-stock-card::after {
                content: ''; position: absolute; top: 0; right: 0; width: 100px; height: 100px;
                background: radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 70%);
                opacity: 0.5; border-radius: 50%; transform: translate(30%, -30%);
            }
        </style>
        <div class="loyalty-container">

        <!-- Top Header -->
        <div style="margin-bottom:2rem; position:relative;">
            <div style="display:flex; align-items:center; gap:1rem; flex-wrap:wrap;">
                <div id="cl-tier-icon" style="width:64px; height:64px; background:linear-gradient(135deg, var(--loyalty-primary), var(--loyalty-secondary)); border-radius:18px; display:flex; align-items:center; justify-content:center; font-size:2rem; box-shadow:0 8px 25px rgba(0,0,0,0.15); flex-shrink:0; transition:all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);">⭐</div>
                <div style="flex:1;">
                    <h2 id="cl-tier-title" style="font-size:2.2rem; font-weight:900; background:linear-gradient(135deg, var(--loyalty-text), var(--loyalty-primary)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; margin:0; letter-spacing:-0.04em;">Fidelidade Premium</h2>
                    <p style="color:#64748b; margin:0; font-size:1.1rem; font-weight:500; opacity:0.8;">Olá, ${user.name}. <span id="cl-tier-desc" style="font-weight:700; color:var(--loyalty-primary);"></span></p>
                </div>
            </div>
        </div>

        <!-- Animated Level-Up Modal -->
        <div id="levelup-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:9999; justify-content:center; align-items:center; flex-direction:column; text-align:center;">
            <div style="background:linear-gradient(135deg, #1e293b, #0f172a); border-radius:24px; padding:3rem; max-width:400px; width:90%; position:relative; overflow:hidden; box-shadow:0 25px 50px -12px rgba(0, 0, 0, 0.5); border:2px solid rgba(255,255,255,0.1); animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
                <style>
                    @keyframes popIn { 0% { transform:scale(0.8); opacity:0; } 100% { transform:scale(1); opacity:1; } }
                    @keyframes float { 0%, 100% { transform:translateY(0); } 50% { transform:translateY(-10px); } }
                    @keyframes glow { 0%, 100% { box-shadow:0 0 20px rgba(245, 158, 11, 0.5); } 50% { box-shadow:0 0 40px rgba(245, 158, 11, 0.8); } }
                </style>
                <div id="levelup-icon" style="font-size:5rem; animation:float 3s ease-in-out infinite;">🏆</div>
                <h1 id="levelup-title" style="color:white; font-size:2rem; font-weight:900; margin:1.5rem 0 0.5rem; letter-spacing:0.05em; background:linear-gradient(to right, #fcd34d, #f59e0b); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">VOCÊ SUBIU DE NÍVEL!</h1>
                <p id="levelup-message" style="color:#cbd5e1; font-size:1.1rem; line-height:1.5; margin-bottom:2rem;">Parabéns! Agora você é VIP Ouro e tem 15% de desconto em tudo, além de prioridade máxima!</p>
                <button id="btn-ack-levelup" style="background:linear-gradient(to right, #f59e0b, #d97706); border:none; color:white; font-size:1.1rem; font-weight:800; padding:1rem 2rem; border-radius:12px; cursor:pointer; width:100%; transition:transform 0.2s; box-shadow:0 10px 15px -3px rgba(245,158,11,0.4);" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">MUITO OBRIGADO!</button>
            </div>
            <!-- Confetti (basic CSS boxes) -->
            <div id="confetti-container" style="position:absolute; width:100%; height:100%; pointer-events:none; overflow:hidden;"></div>
        </div>

        <!-- Balance Cards -->
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:1.25rem; margin-bottom:2.5rem;">
            <div class="premium-stock-card" style="border: 2px solid #fcd34d; background: linear-gradient(135deg, rgba(255,251,235,0.9), rgba(254,243,199,0.9));">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div>
                        <div style="font-size:0.85rem; font-weight:700; color:#92400e; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.5rem;">Saldo Atual</div>
                        <div id="cl-balance" style="color:#b45309; font-size:2rem; font-weight:900; letter-spacing:-0.03em; line-height:1;">R$ 0,00</div>
                    </div>
                    <div style="width:48px; height:48px; border-radius:14px; background:rgba(245,158,11,0.2); color:#b45309; display:flex; align-items:center; justify-content:center; font-size:1.5rem; box-shadow:inset 0 2px 4px rgba(255,255,255,0.5);">
                        💰
                    </div>
                </div>
            </div>
            
            <div class="premium-stock-card">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div>
                        <div style="font-size:0.85rem; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.5rem;">Compras (mês)</div>
                        <div id="cl-total-orders" style="color:#1e293b; font-size:2rem; font-weight:900; letter-spacing:-0.03em; line-height:1;">0</div>
                    </div>
                    <div style="width:48px; height:48px; border-radius:14px; background:rgba(59,130,246,0.1); color:#3b82f6; display:flex; align-items:center; justify-content:center; font-size:1.5rem;">
                        🛍️
                    </div>
                </div>
            </div>

            <div class="premium-stock-card">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div>
                        <div style="font-size:0.85rem; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.5rem;">Total Gasto (mês)</div>
                        <div id="cl-total-debits" style="color:#10b981; font-size:2rem; font-weight:900; letter-spacing:-0.03em; line-height:1;">R$ 0,00</div>
                    </div>
                    <div style="width:48px; height:48px; border-radius:14px; background:rgba(16,185,129,0.1); color:#10b981; display:flex; align-items:center; justify-content:center; font-size:1.5rem;">
                        💳
                    </div>
                </div>
            </div>

            <div class="premium-stock-card" id="cl-billing-card" style="display:none; border:1px solid #c7d2fe; background:linear-gradient(135deg, rgba(238,242,255,0.8), rgba(224,231,255,0.8));">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div>
                        <div style="font-size:0.85rem; font-weight:700; color:#4f46e5; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.5rem;">Vencimento</div>
                        <div id="cl-billing-date" style="color:#4338ca; font-size:2rem; font-weight:900; letter-spacing:-0.03em; line-height:1;">Dia --</div>
                    </div>
                    <div style="width:48px; height:48px; border-radius:14px; background:rgba(99,102,241,0.2); color:#4f46e5; display:flex; align-items:center; justify-content:center; font-size:1.5rem;">
                        📅
                    </div>
                </div>
            </div>
        </div>

        <!-- Tabs -->
        <div style="background:rgba(241, 245, 249, 0.6); backdrop-filter:blur(8px); border:1px solid rgba(255,255,255,0.5); border-radius:50px; padding:0.4rem; display:flex; gap:0.25rem; margin-bottom:1.5rem; flex-wrap:wrap; box-shadow:inset 0 2px 4px rgba(0,0,0,0.02);">
            <button class="loyalty-tab-btn active" data-tab="orders" id="tab-btn-orders">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
                Minhas Compras
            </button>
            <button class="loyalty-tab-btn" data-tab="statement" id="tab-btn-statement">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-2m3 2v-4m3 4v-6M11 3H5a2 2 0 00-2 2v16a2 2 0 002 2h14a2 2 0 002-2v-5"/></svg>
                Extrato da Conta
            </button>
        </div>

        <!-- Month filter (shared) -->
        <div style="display:flex; align-items:center; gap:1rem; margin-bottom:1.25rem; flex-wrap:wrap;">
            <select id="cl-filter-month" style="padding:0.5rem 1rem; border:1px solid #e2e8f0; border-radius:8px; font-size:0.9rem; font-weight:600; background:white; color:#334155;">
                <option value="">Todos os meses</option>
            </select>
            <span id="cl-period-label" style="font-size:0.85rem; color:#64748b;"></span>
        </div>

        <!-- ── TAB: MINHAS COMPRAS ──────────────────────────────────────── -->
        <div class="loyalty-panel active" id="panel-orders">
            <div style="background:white; border-radius:20px; border:1px solid #e2e8f0; overflow:hidden; box-shadow:0 10px 40px rgba(0,0,0,0.06);">
                <div style="background:linear-gradient(135deg,#1e293b,#0f172a); padding:1.25rem 2rem; display:flex; justify-content:space-between; align-items:center;">
                    <span style="color:white; font-weight:800; font-size:1.1rem; display:flex; align-items:center; gap:0.75rem;"><span style="font-size:1.4rem;">🛍️</span> Histórico de Compras</span>
                    <span id="cl-orders-count" style="color:#94a3b8; font-size:0.9rem; font-weight:600; background:rgba(255,255,255,0.1); padding:0.25rem 0.75rem; border-radius:20px;"></span>
                </div>
                <div id="cl-orders-list" style="padding:1.5rem; background:#f8fafc;">
                    <div style="padding:3rem 2rem; text-align:center; display:flex; flex-direction:column; align-items:center; gap:1rem;">
                        <div style="font-size:4rem; opacity:0.3; filter:drop-shadow(0 4px 6px rgba(0,0,0,0.1));">🛍️</div>
                        <div style="font-weight:800; color:#64748b; font-size:1.2rem;">Nenhuma compra registrada</div>
                        <div style="color:#94a3b8; font-size:0.95rem; max-width:350px;">Suas compras realizadas via Conta Fidelidade aparecerão aqui.</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- ── TAB: EXTRATO ───────────────────────────────────────────── -->
        <div class="loyalty-panel" id="panel-statement">
            <div style="background:white; border-radius:20px; border:1px solid #e2e8f0; overflow:hidden; box-shadow:0 10px 40px rgba(0,0,0,0.06);">
                <div style="background:linear-gradient(135deg,#1e293b,#0f172a); padding:1.25rem 2rem; display:flex; justify-content:space-between; align-items:center;">
                    <span style="color:white; font-weight:800; font-size:1.1rem; display:flex; align-items:center; gap:0.75rem;"><span style="font-size:1.4rem;">💳</span> Extrato de Movimentações</span>
                    <span id="cl-movements-count" style="color:#94a3b8; font-size:0.9rem; font-weight:600; background:rgba(255,255,255,0.1); padding:0.25rem 0.75rem; border-radius:20px;"></span>
                </div>
                <div id="cl-movements-list" style="min-height:100px; background:#fff;">
                    <div style="padding:3rem 2rem; text-align:center; display:flex; flex-direction:column; align-items:center; gap:1rem;">
                        <div style="font-size:4rem; opacity:0.3; filter:drop-shadow(0 4px 6px rgba(0,0,0,0.1));">💳</div>
                        <div style="font-weight:800; color:#64748b; font-size:1.2rem;">Conta zerada — sem movimentações</div>
                        <div style="color:#94a3b8; font-size:0.95rem; max-width:350px;">Débitos de compras e pagamentos realizados aparecerão aqui no seu extrato.</div>
                    </div>
                </div>
            </div>
        </div>
        </div> <!-- end loyalty-container -->
    `;


    const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    let allOrders    = [];
    let allMovements = [];

    const fmt = (val) => (parseFloat(val) || 0).toFixed(2).replace('.', ',');

    const statusLabel = (s) => {
        const map = {
            'pending':    { text: 'Aguardando',   color: '#f59e0b', bg: '#fffbeb' },
            'in_progress':{ text: 'Em Produção',  color: '#3b82f6', bg: '#eff6ff' },
            'ready':      { text: 'Em Retirada',  color: '#8b5cf6', bg: '#f5f3ff' },
            'completed':  { text: 'Finalizado',   color: '#10b981', bg: '#f0fdf4' },
        };
        return map[s] || { text: s || 'Aguardando', color: '#64748b', bg: '#f1f5f9' };
    };

    // ── Tab switching ─────────────────────────────────────────────────────────
    container.querySelectorAll('.loyalty-tab-btn').forEach(btn => {
        btn.onclick = () => {
            container.querySelectorAll('.loyalty-tab-btn').forEach(b => b.classList.remove('active'));
            container.querySelectorAll('.loyalty-panel').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            container.querySelector(`#panel-${btn.dataset.tab}`).classList.add('active');
        };
    });

    // ── Render: Orders ────────────────────────────────────────────────────────
    const renderOrders = (orders) => {
        const listEl  = container.querySelector('#cl-orders-list');
        const countEl = container.querySelector('#cl-orders-count');
        countEl.textContent = `${orders.length} pedido${orders.length !== 1 ? 's' : ''}`;

        // Update card
        const monthOrders = orders.filter(o => {
            const d = window.parseDBDate(o.created_at);
            const now = new Date();
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
        container.querySelector('#cl-total-orders').textContent = monthOrders.length;
        const totalSpent = monthOrders.reduce((s, o) => s + parseFloat(o.total_value || 0), 0);
        container.querySelector('#cl-total-debits').textContent = `R$ ${fmt(totalSpent)}`;

        if (orders.length === 0) {
            listEl.innerHTML = `
                <div style="padding:3rem 2rem; text-align:center; display:flex; flex-direction:column; align-items:center; gap:1rem;">
                    <div style="font-size:3rem; opacity:0.3;">🛍️</div>
                    <div style="font-weight:700; color:#94a3b8; font-size:1rem;">Nenhuma compra registrada</div>
                    <div style="color:#cbd5e1; font-size:0.85rem; max-width:300px;">Suas compras realizadas via Conta Fidelidade aparecerão aqui.</div>
                </div>`;
            return;
        }

        listEl.innerHTML = orders.map(o => {
            const st   = statusLabel(o.status);
            const date = window.parseDBDate(o.created_at).toLocaleDateString('pt-BR');
            const items = o.items
                ? o.items.map(i => `<span style="background:#f1f5f9; padding:2px 8px; border-radius:8px; font-size:0.78rem; font-weight:600; color:#334155;">${i.product_name || i.name}</span>`).join(' ')
                : '';
            return `
            <div class="order-card">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:1rem; flex-wrap:wrap;">
                    <div style="flex:1; min-width:0;">
                        <div style="font-weight:800; color:#1e293b; font-size:1rem; margin-bottom:0.25rem;">Pedido #${o.id}</div>
                        <div style="font-size:0.8rem; color:#94a3b8; margin-bottom:0.5rem;">📅 ${date}</div>
                        ${items ? `<div style="display:flex; flex-wrap:wrap; gap:0.3rem;">${items}</div>` : ''}
                    </div>
                    <div style="text-align:right; flex-shrink:0;">
                        <span style="background:${st.bg}; color:${st.color}; padding:4px 12px; border-radius:20px; font-size:0.8rem; font-weight:700; display:block; margin-bottom:0.5rem;">${st.text}</span>
                        <div style="font-size:1.15rem; font-weight:800; color:#1e293b;">R$ ${fmt(o.total_value)}</div>
                    </div>
                </div>
            </div>`;
        }).join('');
    };

    // ── Render: Movements (Extrato) ───────────────────────────────────────────
    const renderMovements = (movements) => {
        const listEl  = container.querySelector('#cl-movements-list');
        const countEl = container.querySelector('#cl-movements-count');
        countEl.textContent = `${movements.length} movimentação${movements.length !== 1 ? 'ões' : ''}`;

        if (movements.length === 0) {
            listEl.innerHTML = `
                <div style="padding:3rem 2rem; text-align:center; display:flex; flex-direction:column; align-items:center; gap:1rem;">
                    <div style="font-size:3rem; opacity:0.4;">💳</div>
                    <div style="font-weight:700; color:#94a3b8; font-size:1rem;">Conta zerada — sem movimentações</div>
                    <div style="color:#cbd5e1; font-size:0.85rem; max-width:300px;">Débitos de compras e pagamentos realizados aparecerão aqui no seu extrato.</div>
                </div>`;
            return;
        }

        listEl.innerHTML = movements.map(m => {
            const isCredit = m.type === 'payment_credit';
            const color  = isCredit ? '#10b981' : '#ef4444';
            const icon   = isCredit ? '💰' : '🛍️';
            const label  = isCredit ? 'Pagamento / Crédito' : 'Compra via Fidelidade';
            const date   = window.parseDBDate(m.created_at).toLocaleString('pt-BR', {
                timeZone:'America/Sao_Paulo', day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'
            });
            return `
            <div class="mov-row" style="border-left:4px solid ${color};">
                <div style="width:40px; height:40px; border-radius:50%; background:${color}15; display:flex; align-items:center; justify-content:center; font-size:1.2rem; flex-shrink:0;">${icon}</div>
                <div style="flex:1; min-width:0;">
                    <div style="font-weight:700; color:#1e293b; font-size:0.92rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${m.description || label}</div>
                    <div style="font-size:0.75rem; color:#94a3b8; margin-top:2px; display:flex; gap:0.75rem; flex-wrap:wrap;">
                        <span>📅 ${date}</span>
                        <span style="background:#f1f5f9; padding:1px 8px; border-radius:10px; font-weight:600;">${label}</span>
                    </div>
                </div>
                <div style="font-size:1.1rem; font-weight:800; color:${color}; flex-shrink:0; text-align:right;">
                    ${isCredit ? '+' : '-'} R$ ${fmt(m.amount)}
                </div>
            </div>`;
        }).join('');
    };

    // ── Apply filter ──────────────────────────────────────────────────────────
    const applyFilter = () => {
        const monthVal = container.querySelector('#cl-filter-month').value;
        const label    = container.querySelector('#cl-period-label');

        const filterByMonth = (arr, dateKey) => {
            if (!monthVal) return arr;
            return arr.filter(item => {
                const d = window.parseDBDate(item[dateKey]);
                const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2,'0')}`;
                return key === monthVal;
            });
        };

        if (monthVal) {
            const [y, mo] = monthVal.split('-');
            label.textContent = `📅 ${monthNames[parseInt(mo)]} ${y}`;
        } else {
            label.textContent = 'Exibindo todos os meses';
        }

        renderOrders(filterByMonth(allOrders, 'created_at'));
        renderMovements(filterByMonth(allMovements, 'created_at'));
    };

    // ── Load data ─────────────────────────────────────────────────────────────
    const loadAll = async () => {
        if (!clientId) {
            container.querySelector('#cl-orders-list').innerHTML =
                `<div style="padding:3rem; text-align:center; color:#ef4444;">⚠️ Conta não vinculada a um cliente. Contate o administrador.</div>`;
            return;
        }

        try {
            // Fetch everything in parallel
            const [clientsRes, movRes, ordersRes] = await Promise.all([
                fetch('/api/clients').catch(e => ({ error: e })),
                fetch(`/api/clients/${clientId}/credit-movements`).catch(e => ({ error: e })),
                fetch(`/api/orders?client_id=${clientId}`).catch(e => ({ error: e }))
            ]);

            // Robust JSON parsing
            const safeJson = async (res) => {
                if (res && res.ok) return await res.json();
                return { data: [] };
            };

            const [clientsData, movData, ordersData] = await Promise.all([
                safeJson(clientsRes),
                safeJson(movRes),
                safeJson(ordersRes)
            ]);

            // Client info — balance & billing date
            // Use loose comparison == because clientId from localStorage might be string
            const clientsList = Array.isArray(clientsData.data) ? clientsData.data : [];
            const myClient = clientsList.find(c => c.id == clientId);
            
            if (myClient) {
                // Tier rendering
                const tier = (myClient.loyalty_tier || 'bronze').toLowerCase();
                const iconEl = container.querySelector('#cl-tier-icon');
                const titleEl = container.querySelector('#cl-tier-title');
                const descEl = container.querySelector('#cl-tier-desc');
                const cont = container.querySelector('.loyalty-container');
                
                if (tier === 'ouro') {
                    cont.style.setProperty('--loyalty-primary', '#fbbf24');
                    cont.style.setProperty('--loyalty-secondary', '#d97706');
                    cont.style.setProperty('--loyalty-text', '#0f172a');
                    iconEl.innerHTML = '🏆';
                    titleEl.innerHTML = 'Fidelidade Premium: VIP OURO';
                    descEl.innerHTML = 'Prioridade Máxima • 15% Desconto Fixado';
                    document.documentElement.style.setProperty('--sidebar-bg', 'linear-gradient(180deg, #92400e 0%, #b45309 100%)');
                } else if (tier === 'prata') {
                    cont.style.setProperty('--loyalty-primary', '#94a3b8');
                    cont.style.setProperty('--loyalty-secondary', '#475569');
                    cont.style.setProperty('--loyalty-text', '#1e293b');
                    iconEl.innerHTML = '🥈';
                    titleEl.innerHTML = 'Fidelidade Premium: PRATA';
                    descEl.innerHTML = 'Prazo 1 Dia • 10% Desconto Fixado';
                    document.documentElement.style.setProperty('--sidebar-bg', 'linear-gradient(180deg, #334155 0%, #475569 100%)');
                } else {
                    cont.style.setProperty('--loyalty-primary', '#b45309');
                    cont.style.setProperty('--loyalty-secondary', '#f59e0b');
                    iconEl.innerHTML = '🥉';
                    titleEl.innerHTML = 'Fidelidade Premium: BRONZE';
                    descEl.innerHTML = 'Benefício Inicial • 5% Desconto Fixado';
                    document.documentElement.style.setProperty('--sidebar-bg', 'linear-gradient(180deg, #78350f 0%, #92400e 100%)');
                }

                // Level Up Animation Trigger
                if (myClient.loyalty_tier_notified === 0) {
                    const modal = container.querySelector('#levelup-modal');
                    const msg = container.querySelector('#levelup-message');
                    const icon = container.querySelector('#levelup-icon');
                    
                    if (tier === 'ouro') {
                        icon.innerHTML = '🏆';
                        msg.innerHTML = 'Você alcançou o <b>VIP OURO</b>!<br><br>Agora você ganha <b>15% de desconto fixo</b> e <b>Prioridade Máxima</b> em qualquer pedido!';
                    } else if (tier === 'prata') {
                        icon.innerHTML = '🥈';
                        msg.innerHTML = 'Você alcançou o nível <b>PRATA</b>!<br><br>Agora você ganha <b>10% de desconto fixo</b> e prazo reduzido para <b>1 Dia</b>!';
                    }
                    
                    modal.style.display = 'flex';
                    
                    // Simple confetti
                    const cCont = container.querySelector('#confetti-container');
                    const colors = ['#f59e0b', '#3b82f6', '#ef4444', '#10b981', '#a855f7'];
                    for (let i = 0; i < 50; i++) {
                        const c = document.createElement('div');
                        c.style.position = 'absolute';
                        c.style.width = '10px';
                        c.style.height = '10px';
                        c.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                        c.style.left = Math.random() * 100 + '%';
                        c.style.top = '-10px';
                        c.style.opacity = Math.random();
                        c.style.transform = `rotate(${Math.random() * 360}deg)`;
                        c.style.transition = 'all ' + (Math.random() * 2 + 1) + 's cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                        cCont.appendChild(c);
                        
                        setTimeout(() => {
                            c.style.top = '110%';
                            c.style.transform = `rotate(${Math.random() * 720}deg)`;
                        }, 50);
                    }

                    // Acknowledge endpoint
                    container.querySelector('#btn-ack-levelup').onclick = async () => {
                        modal.style.display = 'none';
                        try {
                            await fetch(`/api/clients/${clientId}/ack-tier`, { method: 'POST' });
                        } catch(e) { console.error('Failed to ack tier', e); }
                    };
                }

                const bal = parseFloat(myClient.credit_balance || 0);
                const balEl = container.querySelector('#cl-balance');
                if (balEl) {
                    balEl.textContent = `R$ ${fmt(bal)}`;
                    balEl.style.color = bal < 0 ? '#dc2626' : bal > 0 ? '#10b981' : '#b45309';
                }

                if (myClient.billing_date) {
                    const billCard = container.querySelector('#cl-billing-card');
                    const billDate = container.querySelector('#cl-billing-date');
                    if (billCard && billDate) {
                        billCard.style.display = 'flex';
                        billDate.textContent = `Dia ${myClient.billing_date}`;
                    }
                }
            }

            // Filter orders for this client (Fidelidade payment)
            const rawOrders = Array.isArray(ordersData.data) ? ordersData.data : (Array.isArray(ordersData) ? ordersData : []);
            allOrders = rawOrders.filter(o => o.client_id == clientId);

            allMovements = Array.isArray(movData.data) ? movData.data : [];

            // Populate month filter from both datasets
            const monthSet = new Set();
            [...allOrders, ...allMovements].forEach(item => {
                if (!item.created_at) return;
                const d = window.parseDBDate(item.created_at);
                if (isNaN(d.getTime())) return;
                const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2,'0')}`;
                monthSet.add(key);
            });

            const monthSelect = container.querySelector('#cl-filter-month');
            if (monthSelect) {
                const now = new Date();
                const currentKey = `${now.getFullYear()}-${String(now.getMonth()).padStart(2,'0')}`;

                monthSelect.innerHTML = '<option value="">Todos os meses</option>' +
                    [...monthSet].sort((a, b) => b.localeCompare(a)).map(key => {
                        const [y, m] = key.split('-');
                        const monthIdx = parseInt(m);
                        return `<option value="${key}" ${key === currentKey ? 'selected' : ''}>${monthNames[monthIdx] || m} ${y}</option>`;
                    }).join('');
            }

            applyFilter();

        } catch (err) {
            console.error('Erro ao carregar portal fidelidade:', err);
            const listEl = container.querySelector('#cl-orders-list');
            if (listEl) {
                listEl.innerHTML = `<div style="padding:2rem; text-align:center; color:#ef4444;">Erro ao carregar dados. Tente recarregar a página.</div>`;
            }
        }
    };

    container.querySelector('#cl-filter-month').onchange = applyFilter;

    loadAll();
    return container;
};
