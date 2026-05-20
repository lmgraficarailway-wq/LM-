export const render = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const clientId = user.client_id;
    const container = document.createElement('div');

    container.innerHTML = `
        <style>
            .points-container { 
                animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1); 
                font-family: 'Outfit', sans-serif;
            }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            
            .premium-card {
                background: white; border-radius: 24px; border: 1px solid rgba(0,0,0,0.05);
                padding: 2rem; box-shadow: 0 10px 40px rgba(0,0,0,0.03);
                transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); position: relative; overflow: hidden;
            }
            .premium-card:hover { transform: translateY(-8px); box-shadow: 0 20px 50px rgba(0,0,0,0.1); }
            
            .premium-card.dark {
                background: linear-gradient(135deg, #1e293b, #0f172a); color: white; border: none;
            }
            .premium-card.dark::after {
                content: ''; position: absolute; top: -50%; right: -50%; width: 200%; height: 200%;
                background: radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 60%);
                opacity: 0.5; pointer-events: none;
            }
            
            .benefit-badge {
                padding: 0.5rem 1rem; border-radius: 12px; font-size: 0.85rem; font-weight: 800;
                display: flex; align-items: center; gap: 0.4rem;
            }

            .rule-row {
                display: flex; align-items: center; gap: 1.5rem; padding: 1.5rem;
                border-radius: 20px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                border: 1px solid transparent;
            }
            .rule-row:hover { transform: translateX(10px); background: white !important; border-color: rgba(0,0,0,0.05); box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
        </style>
        <div class="points-container">
        <!-- Header -->
        <div style="margin-bottom:2rem;">
            <div style="display:flex; align-items:center; gap:1rem; flex-wrap:wrap;">
                <div id="cp-header-icon" style="width:52px; height:52px; background:linear-gradient(135deg,#b45309,#f59e0b); border-radius:14px; display:flex; align-items:center; justify-content:center; font-size:1.6rem; box-shadow:0 6px 20px rgba(180,83,9,0.35); flex-shrink:0;">⭐</div>
                <div style="flex:1;">
                    <h2 style="font-size:1.75rem; font-weight:900; background:linear-gradient(135deg,#92400e,#f59e0b); -webkit-background-clip:text; -webkit-text-fill-color:transparent; margin:0; letter-spacing:-0.03em;">Minha Pontuação (Últimos 90 dias)</h2>
                    <p style="color:#64748b; margin:0; font-size:0.9rem; font-weight:500;">Acompanhe seu progresso e suba de nível para obter mais descontos e benefícios.</p>
                </div>
            </div>
        </div>

        <div id="points-loading" style="padding: 2rem; text-align: center; color: #64748b;">Carregando sua pontuação...</div>
        
        <div id="points-content" style="display:none;">
            <!-- Benefícios Atuais -->
            <div id="benefits-section" style="display:none; margin-bottom:2.5rem;">
                <div style="display:flex; gap:1rem; flex-wrap:wrap;">
                    <div class="benefit-badge" style="background:#f0fdf4; color:#16a34a;">✅ Desconto Ativo</div>
                    <div id="benefit-deadline" class="benefit-badge" style="background:#eff6ff; color:#2563eb;">⚡ Prazo Reduzido</div>
                    <div id="benefit-priority" class="benefit-badge" style="background:#fffbeb; color:#d97706;">⭐ Prioridade Alta</div>
                </div>
            </div>

            <!-- Points Card -->
            <div style="display:flex; gap:1.25rem; flex-wrap:wrap; margin-bottom:2.5rem;">
                <div class="premium-card dark" style="flex:1; min-width:250px; display:flex; flex-direction:column; justify-content:center;">
                    <div style="font-size:0.9rem; font-weight:800; color:#94a3b8; margin-bottom:0.75rem; text-transform:uppercase; letter-spacing:0.1em;">Seu Status</div>
                    <div id="cp-tier-name" style="font-size:3rem; font-weight:900; letter-spacing:-0.03em; line-height:1; background:linear-gradient(to right, #fcd34d, #f59e0b); -webkit-background-clip:text; -webkit-text-fill-color:transparent; filter:drop-shadow(0 4px 8px rgba(0,0,0,0.3));">CARREGANDO...</div>
                    <div id="cp-tier-desc" style="font-size:1rem; color:#cbd5e1; margin-top:1rem; line-height:1.5; font-weight:500;"></div>
                </div>

                <div class="premium-card" style="flex:1; min-width:220px; display:flex; flex-direction:column; justify-content:center;">
                    <div style="font-size:0.85rem; font-weight:800; color:#64748b; margin-bottom:0.75rem; text-transform:uppercase; letter-spacing:0.1em;">Total Gasto</div>
                    <div id="cp-spent" style="font-size:2.8rem; font-weight:900; color:#1e293b; letter-spacing:-0.03em; line-height:1;">R$ 0,00</div>
                    <div id="cp-spent-prog" style="margin-top:1.25rem;">
                        <div style="width:100%; height:8px; background:#f1f5f9; border-radius:10px; overflow:hidden;">
                            <div id="cp-spent-bar" style="height:100%; background:linear-gradient(to right, #f59e0b, #d97706); width:0%; transition:width 2s cubic-bezier(0.16, 1, 0.3, 1);"></div>
                        </div>
                        <div id="cp-spent-meta" style="font-size:0.85rem; color:#64748b; margin-top:0.6rem; font-weight:600;"></div>
                    </div>
                </div>

                <div class="premium-card" style="flex:1; min-width:220px; display:flex; flex-direction:column; justify-content:center;">
                    <div style="font-size:0.85rem; font-weight:800; color:#64748b; margin-bottom:0.75rem; text-transform:uppercase; letter-spacing:0.1em;">Total Pedidos</div>
                    <div id="cp-orders" style="font-size:2.8rem; font-weight:900; color:#1e293b; letter-spacing:-0.03em; line-height:1;">0</div>
                    <div id="cp-orders-prog" style="margin-top:1.25rem;">
                        <div style="width:100%; height:8px; background:#f1f5f9; border-radius:10px; overflow:hidden;">
                            <div id="cp-orders-bar" style="height:100%; background:linear-gradient(to right, #3b82f6, #2563eb); width:0%; transition:width 2s cubic-bezier(0.16, 1, 0.3, 1);"></div>
                        </div>
                        <div id="cp-orders-meta" style="font-size:0.85rem; color:#64748b; margin-top:0.6rem; font-weight:600;"></div>
                    </div>
                </div>
            </div>

            <!-- Evolução -->
            <div style="background:rgba(245,158,11,0.03); border-radius:32px; padding:3rem; border:1px solid rgba(245,158,11,0.1);">
                <h3 style="margin:0 0 2.5rem 0; font-size:1.6rem; font-weight:900; color:#92400e; display:flex; align-items:center; gap:0.8rem;"><span style="font-size:2.2rem;">🚀</span> Jornada de Benefícios</h3>
                <div style="display:flex; flex-direction:column; gap:1.25rem;">
                    <div class="rule-row" style="background:white; box-shadow:0 4px 15px rgba(0,0,0,0.02);">
                        <div style="width:56px; height:56px; background:#fff7ed; border-radius:16px; display:flex; align-items:center; justify-content:center; font-size:1.8rem; flex-shrink:0;">🥉</div>
                        <div style="flex:1;">
                            <div style="font-weight:900; color:#92400e; font-size:1.15rem;">Nível Bronze</div>
                            <div style="font-size:0.95rem; color:#b45309; font-weight:600;">Desconto de 5% em todos os pedidos.</div>
                        </div>
                        <div style="font-weight:800; color:#94a3b8; font-size:0.8rem; text-transform:uppercase; background:#f8fafc; padding:0.4rem 0.8rem; border-radius:8px;">Inicial</div>
                    </div>

                    <div class="rule-row" style="background:white; box-shadow:0 4px 15px rgba(0,0,0,0.02);">
                        <div style="width:56px; height:56px; background:#f8fafc; border-radius:16px; display:flex; align-items:center; justify-content:center; font-size:1.8rem; flex-shrink:0;">🥈</div>
                        <div style="flex:1;">
                            <div style="font-weight:900; color:#334155; font-size:1.15rem;">Nível Prata</div>
                            <div style="font-size:0.95rem; color:#475569; font-weight:600;">Desconto de 10% • Produção em 24h.</div>
                        </div>
                        <div style="text-align:right; font-weight:800; color:#64748b; font-size:0.75rem;">R$ 500 OU<br>20 PEDIDOS</div>
                    </div>

                    <div class="rule-row" style="background:white; box-shadow:0 10px 30px rgba(245,158,11,0.1); border-color:rgba(245,158,11,0.2);">
                        <div style="width:56px; height:56px; background:#fffbeb; border-radius:16px; display:flex; align-items:center; justify-content:center; font-size:1.8rem; flex-shrink:0;">🥇</div>
                        <div style="flex:1;">
                            <div style="font-weight:900; color:#b45309; font-size:1.15rem;">Nível VIP Ouro</div>
                            <div style="font-size:0.95rem; color:#d97706; font-weight:600;">Desconto de 15% • Prioridade Máxima.</div>
                        </div>
                        <div style="text-align:right; font-weight:900; color:#d97706; font-size:0.75rem;">R$ 1.000 OU<br>50 PEDIDOS</div>
                    </div>
                </div>
            </div>
        </div>
        </div>     </div> <!-- end points-container -->
    `;

    const loadData = async () => {
        if (!clientId) {
            container.querySelector('#points-loading').innerHTML = '<span style="color:#ef4444;">Erro: Cliente não identificado.</span>';
            return;
        }

        try {
            const res = await fetch('/api/clients');
            const { data } = await res.json();
            const clientsData = data || [];
            const myClient = clientsData.find(c => c.id == clientId);

            if (!myClient) throw new Error('Cliente não encontrado.');

            const spent = parseFloat(myClient.L90_spent || 0);
            const orders = parseInt(myClient.L90_orders || 0, 10);
            const tier = (myClient.loyalty_tier || 'bronze').toLowerCase();

            // Animate Values
            animateValue(container.querySelector('#cp-spent'), 0, spent, 1500, true);
            animateValue(container.querySelector('#cp-orders'), 0, orders, 1500, false);

            // Tier UI
            const tName = container.querySelector('#cp-tier-name');
            const tDesc = container.querySelector('#cp-tier-desc');
            const hIcon = container.querySelector('#cp-header-icon');
            const benefitsSec = container.querySelector('#benefits-section');
            
            benefitsSec.style.display = 'block';

            if (tier === 'ouro') {
                tName.innerHTML = 'VIP OURO';
                tDesc.innerHTML = 'Você atingiu o topo! Aproveite prioridade máxima e 15% OFF.';
                hIcon.innerHTML = '🏆';
                hIcon.style.background = 'linear-gradient(135deg, #fbbf24, #d97706)';
                container.querySelector('#benefit-deadline').style.display = 'flex';
                container.querySelector('#benefit-priority').style.display = 'flex';
            } else if (tier === 'prata') {
                tName.innerHTML = 'NÍVEL PRATA';
                tDesc.innerHTML = '10% de desconto ativado e prazo de produção de 1 dia.';
                hIcon.innerHTML = '🥈';
                hIcon.style.background = 'linear-gradient(135deg, #94a3b8, #475569)';
                container.querySelector('#benefit-deadline').style.display = 'flex';
                container.querySelector('#benefit-priority').style.display = 'none';
            } else {
                tName.innerHTML = 'NÍVEL BRONZE';
                tDesc.innerHTML = '5% de desconto ativado. Continue crescendo!';
                hIcon.innerHTML = '🥉';
                hIcon.style.background = 'linear-gradient(135deg, #b45309, #f59e0b)';
                container.querySelector('#benefit-deadline').style.display = 'none';
                container.querySelector('#benefit-priority').style.display = 'none';
            }

            // Progress logic
            let nextSpentTarget = tier === 'bronze' ? 500 : (tier === 'prata' ? 1000 : 1000);
            let nextOrdersTarget = tier === 'bronze' ? 20 : (tier === 'prata' ? 50 : 50);

            let spentPct = Math.min(100, (spent / nextSpentTarget) * 100);
            let ordersPct = Math.min(100, (orders / nextOrdersTarget) * 100);

            if (tier === 'ouro') {
                container.querySelector('#cp-spent-prog').style.display = 'none';
                container.querySelector('#cp-orders-prog').style.display = 'none';
            } else {
                setTimeout(() => {
                    container.querySelector('#cp-spent-bar').style.width = `${spentPct}%`;
                    container.querySelector('#cp-orders-bar').style.width = `${ordersPct}%`;
                }, 100);

                let diffS = Math.max(0, nextSpentTarget - spent);
                let diffO = Math.max(0, nextOrdersTarget - orders);
                container.querySelector('#cp-spent-meta').textContent = diffS > 0 ? `Faltam R$ ${diffS.toFixed(2).replace('.', ',')} para o próximo nível.` : 'Meta de gastos batida!';
                container.querySelector('#cp-orders-meta').textContent = diffO > 0 ? `Faltam ${diffO} pedidos para o próximo nível.` : 'Meta de pedidos batida!';
            }

            container.querySelector('#points-loading').style.display = 'none';
            container.querySelector('#points-content').style.display = 'block';

        } catch (e) {
            console.error(e);
            container.querySelector('#points-loading').innerHTML = '<span style="color:#ef4444;">Erro ao carregar os dados.</span>';
        }
    };

    function animateValue(obj, start, end, duration, isCurrency) {
        if (!obj) return;
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const val = progress * (end - start) + start;
            obj.innerHTML = isCurrency ? `R$ ${val.toFixed(2).replace('.', ',')}` : Math.floor(val);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    loadData();
    return container;
};
