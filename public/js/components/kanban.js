export const render = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    const container = document.createElement('div');
    const isClient = user.role === 'cliente';
    const isProducao = user.role === 'producao';
    const isVendedor = user.role === 'vendedor';
    const clientId = user.client_id;

    let notifiedLateOrders = new Set();
    let notifiedUrgentOrders = new Set();
    let knownOrderIds = new Set();
    let isInitialLoad = true;

    // Pedir permissão de notificação assim que carregar o Kanban
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }

    let audioCtx = null;
    const playNotificationSound = async () => {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            if (!audioCtx) audioCtx = new AudioCtx();
            if (audioCtx.state === 'suspended') await audioCtx.resume();

            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            // Som premium (A5)
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.15);
            
            gain.gain.setValueAtTime(0, audioCtx.currentTime);
            gain.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
            
            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.2);
        } catch (e) { console.warn('Audio play failed', e); }
    };

    const showToastAlert = (msg, type = 'red') => {
        const toast = document.createElement('div');
        let bgStyle = 'background:linear-gradient(135deg, #ef4444 0%, #b91c1c 100%); border:1px solid #991b1b; box-shadow:0 10px 25px -5px rgba(220, 38, 38, 0.5), 0 8px 10px -6px rgba(220, 38, 38, 0.2);';
        let icon = '⏰';
        let title = 'Atenção à Produção';
        
        if (type === 'blue') {
            bgStyle = 'background:linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border:1px solid #1e40af; box-shadow:0 10px 25px -5px rgba(59, 130, 246, 0.5), 0 8px 10px -6px rgba(59, 130, 246, 0.2);';
            icon = '🚀';
            title = 'Prioridade (PZ: 1 DIA)';
        } else if (type === 'gold') {
            bgStyle = 'background:linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border:1px solid #b45309; box-shadow:0 10px 25px -5px rgba(245, 158, 11, 0.5), 0 8px 10px -6px rgba(245, 158, 11, 0.2); color: #fff;';
            icon = '⭐';
            title = 'Fidelidade (PZ: 1 DIA)';
        }

        toast.style.cssText = `position:fixed; top:24px; right:24px; color:#ffffff; padding:16px 20px; border-radius:12px; z-index:9999; width:340px; max-width:calc(100vw - 48px); font-family:system-ui, -apple-system, sans-serif; display:flex; align-items:center; gap:16px; transform:translateX(120%); transition:transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.5s ease; opacity:0; cursor:pointer; ${bgStyle}`;
        toast.innerHTML = `
            <div style="background:rgba(255,255,255,0.25); width:46px; height:46px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; box-shadow:inset 0 2px 4px rgba(255,255,255,0.2);">
                <span style="font-size:1.5rem; line-height:1;">${icon}</span>
            </div>
            <div style="flex:1;">
                <div style="font-weight:700; font-size:1.05rem; margin-bottom:4px; letter-spacing:-0.01em;">${title}</div>
                <div style="font-size:0.9rem; line-height:1.4; color:#eff6ff; font-weight:500;">${msg}</div>
            </div>
            <div style="font-size:1.2rem; color:rgba(255,255,255,0.6); padding-left:8px; line-height:1;" title="Fechar">✕</div>
        `;
        document.body.appendChild(toast);
        
        let removeTimeout;
        const removeToast = () => {
            toast.style.transform = 'translateX(120%)';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 500);
        };
        
        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(0)';
            toast.style.opacity = '1';
            removeTimeout = setTimeout(removeToast, 12000);
        });

        toast.onclick = () => {
            clearTimeout(removeTimeout);
            removeToast();
        };
    };

    container.innerHTML = `
        <!-- Header -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 2rem;">
            <div style="display:flex; flex-direction:column; gap:0.2rem;">
                <h2 style="font-size: 1.8rem; font-weight: 900; background: linear-gradient(135deg, var(--primary), #4c1d95); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin:0; letter-spacing: -0.03em;">${isClient ? '📋 Meus Pedidos' : 'Quadro de Produção'}</h2>
                <p style="color: #64748b; margin: 0; font-size: 0.95rem; font-weight:500; white-space: nowrap;">${isClient ? 'Acompanhe seus pedidos' : 'Acompanhamento e controle de status dos pedidos.'}</p>
            </div>
            ${isClient ? '' : `<div style="display:flex; gap:0.75rem; align-items:center;">
                <button class="btn" style="padding: 0.8rem 1.25rem; border-radius: 12px; font-weight:700; color:#475569; background:#fff; border:2px solid #e2e8f0; box-shadow:0 2px 8px rgba(0,0,0,0.02); transition:all 0.2s;" id="btn-archived" onmouseover="this.style.background='#f8fafc'; this.style.borderColor='#cbd5e1'" onmouseout="this.style.background='#fff'; this.style.borderColor='#e2e8f0'">📁 Pedidos Arquivados</button>
                <button class="btn btn-primary" style="padding: 0.8rem 1.5rem; border-radius: 12px; font-weight:800; text-transform:uppercase; letter-spacing:0.05em; display:flex; align-items:center; gap:0.5rem; box-shadow:0 4px 15px rgba(139, 92, 246, 0.3); transition:all 0.2s;" id="btn-new-order" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                    NOVO PEDIDO
                </button>
            </div>`}
        </div>
        <div class="kanban-board">
            ${isClient ? '' : `<div class="kanban-column" id="col-aguardando_aceite">
                <div class="column-header">
                    Aguardando Aceite
                    <span class="column-count">0</span>
                    <div class="column-stats" style="font-size: 0.8em; color: #555; margin-top: 4px; font-weight: normal;"></div>
                </div>
                <div class="column-content"></div>
            </div>`}
            <div class="kanban-column" id="col-producao">
                <div class="column-header">
                    Em Produção
                    <span class="column-count">0</span>
                    <div class="column-stats" style="font-size: 0.8em; color: #555; margin-top: 4px; font-weight: normal;"></div>
                </div>
                <div class="column-content"></div>
            </div>
             <div class="kanban-column" id="col-em_balcao">
                <div class="column-header">
                    ${isClient ? 'Retirada' : 'Em Balcão'}
                    <span class="column-count">0</span>
                </div>
                <div class="column-content"></div>
            </div>
            ${isClient ? '' : `<div class="kanban-column" id="col-finalizado">
                <div class="column-header">
                    Finalizado
                    <span class="column-count">0</span>
                </div>
                <div class="column-content"></div>
            </div>`}
        </div>

        <!-- Archived Orders Section (Hidden) -->
        <div id="archived-section" style="display:none; margin-top:1.5rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                <h3 style="margin:0; color:#64748b;">📁 Pedidos Arquivados</h3>
                <button class="btn btn-secondary btn-sm" id="btn-close-archived">✕ Fechar</button>
            </div>
            <div id="archived-list" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:1rem;"></div>
        </div>

        <!-- New Order Modal (Harmonized) -->
        <div class="modal-overlay" id="order-modal">
            <div class="modal" style="max-width: 700px; width: 95%;">
                <div class="modal-header" style="border-bottom: 1px solid #eee; padding-bottom: 1rem; margin-bottom: 1rem;">
                    <h3 style="margin:0; font-size: 1.5rem; color: #333;">Novo Pedido</h3>
                    <button class="modal-close" data-target="order-modal" style="font-size: 1.5rem;">&times;</button>
                </div>
                
                <div id="order-step-1">
                    <!-- Internal Service Toggle -->
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:1rem; margin-bottom:1.5rem; padding:1rem 1.25rem; background:rgba(139, 92, 246, 0.04); border:1px solid rgba(139, 92, 246, 0.15); border-radius:12px; cursor:pointer; transition:all 0.2s;" id="internal-toggle-container" onmouseover="this.style.background='rgba(139, 92, 246, 0.08)'" onmouseout="this.style.background='rgba(139, 92, 246, 0.04)'">
                        <div style="display:flex; flex-direction:column;">
                            <label for="internal-toggle" style="margin:0; cursor:pointer; font-weight:800; color:var(--primary); font-size:1.05rem;">🏢 Pedido Interno</label>
                            <span style="font-size:0.8rem; color:#64748b; font-weight:500;">Uso exclusivo para demandas da própria gráfica.</span>
                        </div>
                        <input type="checkbox" id="internal-toggle" style="width:24px; height:24px; cursor:pointer; accent-color:var(--primary);">
                    </div>
                    
                    <!-- Top Row: Client and Deadline -->
                    <div id="client-row" style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.25rem; margin-bottom: 1.5rem;">
                        <div class="form-group" style="margin:0; background: #fff; padding: 1.25rem; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 15px rgba(0,0,0,0.02);">
                             <label style="font-size: 0.8rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.75rem; display: block;">👤 Cliente</label>
                             <div style="display:flex; gap:0.5rem; position:relative;" id="client-autocomplete-wrap">
                                 <div style="flex:1; position:relative;">
                                     <input type="text" id="client-search" placeholder="Buscar por Nome ou Telefone..." autocomplete="off"
                                         style="width:100%; padding:0.8rem 1rem; font-size:1rem; border:2px solid #e2e8f0; border-radius:12px; box-sizing:border-box; transition:border-color 0.2s, box-shadow 0.2s;"
                                         onfocus="this.style.borderColor='var(--primary)'; this.style.boxShadow='0 0 0 4px rgba(139, 92, 246, 0.1)';"
                                         onblur="this.style.borderColor='#e2e8f0'; this.style.boxShadow='none';">
                                     <!-- Hidden field that stores the selected client ID -->
                                     <input type="hidden" id="client-select">
                                     <div id="client-suggestions" style="display:none; position:absolute; top:calc(100% + 4px); left:0; right:0; background:#fff; border:1px solid #e2e8f0; border-radius:12px; max-height:220px; overflow-y:auto; z-index:1000; box-shadow:0 10px 25px rgba(0,0,0,0.1);"></div>
                                 </div>
                                 <button class="btn btn-secondary" id="btn-quick-client" title="Novo Cliente" style="width: 48px; border-radius: 12px; padding: 0; font-size: 1.4rem; display: flex; align-items: center; justify-content: center; background:#f8fafc; border:2px solid #e2e8f0; color:var(--primary); font-weight:bold; transition:all 0.2s;" onmouseover="this.style.background='var(--primary)'; this.style.color='white'; this.style.borderColor='var(--primary)';">+</button>
                             </div>
                         </div>
                        
                        <div class="form-group" style="margin:0; background: #fff; padding: 1.25rem; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 15px rgba(0,0,0,0.02);">
                            <label style="font-size: 0.8rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.75rem; display: block;">⏳ Prazo da Produção</label>
                            <div style="display:flex; gap:0.5rem; background: #f8fafc; padding: 0.4rem; border-radius: 12px; border: 1px solid #e2e8f0;">
                                <label style="cursor:pointer; display:flex; align-items:center; justify-content:center; gap:0.4rem; padding:0.6rem; flex:1; border-radius:8px; background:#fff; font-size: 0.95rem; font-weight:600; box-shadow:0 1px 3px rgba(0,0,0,0.05); color:#334155;">
                                    <input type="radio" name="deadline_option" value="3D" checked style="accent-color:var(--primary);"> 
                                    3 Dias
                                </label>
                                <label style="cursor:pointer; display:flex; align-items:center; justify-content:center; gap:0.4rem; padding:0.6rem; flex:1; border-radius:8px; background:#fef2f2; border:1px solid #fee2e2; color:#b91c1c; font-weight:700; font-size: 0.95rem;">
                                    <input type="radio" name="deadline_option" value="1D" style="accent-color:#dc2626;"> 
                                    1 Dia
                                </label>
                            </div>
                        </div>
                    </div>

                    <!-- Cart Section -->
                    <div style="background: rgba(139, 92, 246, 0.03); border: 1px solid rgba(139, 92, 246, 0.15); border-left: 4px solid var(--primary); border-radius: 16px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 4px 20px rgba(0,0,0,0.015);">
                        <label style="font-size: 0.9rem; font-weight: 800; color: var(--primary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1rem; display: flex; align-items:center; gap:0.5rem;">📦 Lista de Produtos</label>
                        
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem; margin-bottom:1rem;">
                            <div>
                                <small style="display:block; margin-bottom:4px; font-weight:700; color:#64748b; font-size:0.75rem; text-transform:uppercase;">Filtrar por Categoria</small>
                                <select id="product-type-filter" class="form-control" style="width:100%; padding:0.6rem 1rem; font-size:0.95rem; border:1px solid #cbd5e1; border-radius:8px; background:#fff; transition:border-color 0.2s;">
                                    <option value="">Todos os tipos</option>
                                </select>
                            </div>
                            <div>
                                <small style="display:block; margin-bottom:4px; font-weight:700; color:#64748b; font-size:0.75rem; text-transform:uppercase;">Buscar por Nome</small>
                                <input type="text" id="product-name-search" placeholder="O que você procura?" style="width:100%; padding:0.6rem 1rem; font-size:0.95rem; border:1px solid #cbd5e1; border-radius:8px; background:#fff; box-sizing:border-box; transition:border-color 0.2s;">
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 3fr 1fr auto; gap: 0.75rem; align-items: end; margin-bottom:1rem; background: #fff; padding: 1rem; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 2px 10px rgba(0,0,0,0.02);">
                            <div>
                                <small style="display:block; margin-bottom:4px; font-weight:700; color:#334155;">Produto Selecionado</small>
                                <select id="product-select" class="form-control" style="width:100%; padding: 0.6rem 1rem; font-size:0.95rem; border: 2px solid #e2e8f0; border-radius: 8px; font-weight:600;"><option value="">Escolha um item...</option></select>
                            </div>
                            <div>
                                <small style="display:block; margin-bottom:4px; font-weight:700; color:#334155;">Quantidade</small>
                                <input type="number" id="item-qty" value="1" min="1" class="form-control" style="width:100%; padding: 0.6rem 1rem; font-size:1.1rem; font-weight:bold; border: 2px solid #e2e8f0; border-radius: 8px; text-align:center;">
                            </div>
                            <button class="btn" id="btn-add-item" type="button" style="height: 48px; background:linear-gradient(135deg, var(--primary), #4c1d95); color:white; border:none; border-radius:8px; padding:0 1.5rem; font-weight:800; text-transform:uppercase; letter-spacing:0.05em; box-shadow:0 4px 15px rgba(139, 92, 246, 0.3); transition:all 0.2s;">+ INCLUIR</button>
                        </div>

                        <!-- Color selector for pulseiras -->
                        <div id="color-select-container" style="display:none; margin-bottom:1rem; background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:1rem; box-shadow:0 2px 10px rgba(0,0,0,0.02);">
                            <small id="pulseira-price-label" style="display:block; margin-bottom:10px; color:#1e1b4b; font-weight:800; text-transform:uppercase; font-size:0.8rem; letter-spacing:0.05em;">🎨 Definir a Cor do Material:</small>
                            <!-- Toggle sem personalização -->
                            <label id="sem-personaliz-label" style="display:flex; align-items:center; gap:0.5rem; margin-bottom:10px; cursor:pointer; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:8px 12px; transition:all 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='#f8fafc'">
                                <input type="checkbox" id="sem-personalizacao" style="width:18px; height:18px; cursor:pointer; accent-color:var(--primary);">
                                <span style="font-size:0.9rem; font-weight:700; color:#334155;">Venda SEM Personalização — <b style="color:var(--primary)">R$ 0,20/un</b></span>
                            </label>
                            <div id="color-select-wrap">
                                <select id="color-select" class="form-control" style="width:100%; padding:0.6rem 1rem; font-size:0.95rem; border:2px solid #e2e8f0; border-radius:8px; font-weight:600;">
                                    <option value="">Carregando cores...</option>
                                </select>
                            </div>
                        </div>
                        <div id="stock-warning" style="font-size:0.85rem; font-weight:bold; color:#dc2626; margin-top:0.25rem; min-height: 1.2em;"></div>

                        <!-- Cart List -->
                        <div class="cart-list" style="margin-top:0.5rem; max-height:220px; overflow-y:auto; background: #fff; border:1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.02);">
                             <table style="width:100%; font-size:0.95rem; border-collapse:collapse;">
                                 <thead style="background:#f8fafc; border-bottom:2px solid #e2e8f0; color: #475569; position:sticky; top:0; z-index:10;">
                                     <tr>
                                         <th style="padding:12px; text-align:left; font-weight: 800; font-size:0.8rem; text-transform:uppercase; letter-spacing:0.05em;">Produto</th>
                                         <th style="padding:12px; text-align:center; font-weight: 800; font-size:0.8rem; text-transform:uppercase; letter-spacing:0.05em;">Qtd</th>
                                         <th style="padding:12px; text-align:right; font-weight: 800; font-size:0.8rem; text-transform:uppercase; letter-spacing:0.05em;">Subtotal</th>
                                         <th style="width:40px"></th>
                                     </tr>
                                 </thead>
                                 <tbody id="cart-tbody">
                                     <tr><td colspan="4" style="text-align:center; padding:2.5rem; color:#94a3b8; font-weight:500; font-size:1rem;">Nenhum produto incluído ainda.</td></tr>
                                 </tbody>
                             </table>
                        </div>
                    </div>

                    <form id="order-form">
                        <div style="display:grid; grid-template-columns: 1fr; gap:1.25rem; margin-bottom:1.5rem;">
                            <!-- Description -->
                            <div class="form-group" style="margin:0; background: #fff; padding: 1.25rem; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 15px rgba(0,0,0,0.02);">
                                <label style="font-size: 0.8rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.75rem; display: block;">📝 Descrição Geral / Observações</label>
                                <textarea name="description" rows="2" placeholder="Descreva os detalhes importantes da produção..." style="width: 100%; padding: 0.8rem 1rem; font-size:1rem; border: 2px solid #e2e8f0; border-radius: 12px; box-sizing:border-box; transition:border-color 0.2s; resize:vertical; font-family:inherit;" onfocus="this.style.borderColor='var(--primary)'" onblur="this.style.borderColor='#e2e8f0'"></textarea>
                            </div>

                            <!-- Attachments -->
                            <div class="form-group" style="margin:0; background: #fff; padding: 1.25rem; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 15px rgba(0,0,0,0.02);">
                                <label style="font-size: 0.8rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.75rem; display: block;">📎 Anexos (Imagens / PDF / CDR)</label>
                                <div style="position:relative; width:100%;">
                                    <input type="file" id="order-attachments" multiple accept="image/*,.pdf,.cdr" style="width:100%; padding: 0.8rem; background:#f8fafc; border: 2px dashed #cbd5e1; border-radius:12px; font-size:0.95rem; font-weight:600; color:#475569; cursor:pointer;" onmouseover="this.style.borderColor='var(--primary)'; this.style.backgroundColor='#faf5ff'" onmouseout="this.style.borderColor='#cbd5e1'; this.style.backgroundColor='#f8fafc'">
                                </div>
                                <div id="attachment-preview" style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-top:0.75rem;"></div>
                            </div>
                        </div>
                        
                        <!-- Financial & Core Event Info -->
                        <div style="background: rgba(139, 92, 246, 0.03); border: 1px solid rgba(139, 92, 246, 0.15); border-radius: 16px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 4px 20px rgba(0,0,0,0.015); display: flex; flex-wrap: wrap; gap: 1.5rem; align-items: stretch;">
                             <div style="display: flex; gap: 1rem; flex: 2; min-width:300px;">
                                 <div class="form-group" style="margin:0; flex: 1;">
                                    <label style="font-size: 0.75rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; display: block;">Pagamento</label>
                                    <select name="payment_method" id="order-payment-method" style="width: 100%; padding: 0.75rem 1rem; font-size:1rem; border: 2px solid #e2e8f0; border-radius: 12px; font-weight:600; color:#1e1b4b; background:#fff;">
                                        <option value="Pix">Pix</option>
                                        <option value="Cartão">Cartão</option>
                                        <option value="Dinheiro">Dinheiro</option>
                                        <option value="Boleto">Boleto</option>
                                        <option value="A Receber">A Receber</option>
                                        <option value="CORE">CORE</option>
                                        <option value="Fidelidade" style="display:none;">Fidelidade</option>
                                    </select>
                                    <div id="core-auto-info" style="display:none; margin-top:6px; font-size:0.8rem; color:var(--primary); font-weight:700;"></div>
                                 </div>
                                 <div class="form-group" style="margin:0; flex: 1;">
                                    <label style="font-size: 0.75rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; display: block;">Desconto</label>
                                    <select name="discount" id="order-discount" style="width: 100%; padding: 0.75rem 1rem; font-size:1rem; border: 2px solid #e2e8f0; border-radius: 12px; font-weight:600; color:#ef4444; background:#fff;">
                                        <option value="0">Nenhum</option>
                                        <option value="10">10%</option>
                                        <option value="15">15%</option>
                                    </select>
                                    <div id="loyalty-discount-info" style="display:none; margin-top:6px; font-size:0.8rem; font-weight:800; color:#b45309; background:#fffbeb; border:1px solid #fde68a; border-radius:6px; padding:4px 8px;">⭐ Desconto Fidelidade: 5% (calculado sobre o valor bruto)</div>
                                 </div>
                             </div>
                             
                             <!-- Event Name Field (visible only for CORE) -->
                             <div id="event-name-group" style="display:none; flex:1; min-width:200px;">
                                 <label style="font-size: 0.75rem; font-weight: 800; color: var(--primary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; display: flex; align-items:center; gap:0.3rem;">🏷️ Nome do Evento (Core)</label>
                                 <input type="text" id="order-event-name" placeholder="Ex: Festa Junina 2025" style="width:100%; padding:0.75rem 1rem; font-size:1rem; border:2px solid var(--primary); border-radius:12px; font-weight:600; color:#1e1b4b; background:#fff; box-sizing:border-box; box-shadow: 0 2px 10px rgba(139, 92, 246, 0.1);">
                             </div>
                             
                            <div style="flex:1; min-width:200px; background:linear-gradient(135deg, var(--primary), #4c1d95); padding: 1.25rem; border-radius: 12px; color:white; box-shadow:0 8px 20px rgba(139, 92, 246, 0.3); display:flex; flex-direction:column; justify-content:center;">
                                <label style="font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; opacity:0.8; margin-bottom:0.25rem; display:block;">Valor a Cobrar</label>
                                <div style="display:flex; align-items:center;">
                                    <span style="font-size:1.5rem; font-weight:800; opacity:0.7; margin-right:4px;">R$</span>
                                    <input type="number" step="0.01" min="0" id="cart-total-input" name="total_value" value="" placeholder="0.00" style="font-size:2rem; font-weight:800; color:#fff; width:100%; background:transparent; border:none; outline:none; letter-spacing:-0.02em; padding:0; cursor:not-allowed;" readonly>
                                </div>
                                <div style="font-size:0.75rem; color:rgba(255,255,255,0.7); margin-top:4px; font-weight:600;" id="cart-total-auto"></div>
                            </div>
                        </div>
                        
                        <div style="margin-top: 1.5rem;">
                            <button type="submit" class="btn" style="width:100%; padding: 1rem; font-size: 1.15rem; font-weight:800; text-transform:uppercase; letter-spacing:0.05em; background:var(--primary); color:white; border-radius:16px; border:none; box-shadow:0 8px 25px rgba(139, 92, 246, 0.4); transition:all 0.2s;" id="btn-create-order" disabled onmouseover="if(!this.disabled) this.style.transform='translateY(-2px)'" onmouseout="if(!this.disabled) this.style.transform='none'">Criar Novo Pedido</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>

        <div class="modal-overlay" id="kit-builder-modal">
            <div class="modal" style="max-width: 600px;">
                <div class="modal-header">
                    <h3 id="kit-builder-title">Configurar Kit</h3>
                    <button class="modal-close" data-target="kit-builder-modal">&times;</button>
                </div>
                <!-- Selection of Template -->
                <div id="kit-template-selection" style="margin-bottom:1rem;">
                    <label style="font-weight:600; color:#555;">Selecione o Modelo (Sub-título):</label>
                    <div id="kit-template-buttons" style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-top:0.5rem;">
                        <!-- buttons injected here -->
                    </div>
                </div>
                <!-- Kit Content Editor -->
                <div id="kit-content-editor" style="display:none; border-top:1px solid #eee; padding-top:1rem;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                        <h4 style="margin:0; font-size:1rem; color:#1e293b;">Itens do Pacote</h4>
                        <button type="button" class="btn btn-secondary btn-sm" id="btn-add-extra-kit-item">+ Produto Extra</button>
                    </div>
                    <div id="kit-items-list" style="display:flex; flex-direction:column; gap:0.5rem; max-height:250px; overflow-y:auto; margin-bottom:1rem;">
                        <!-- items injected here -->
                    </div>
                    
                    <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:0.75rem; text-align:right;">
                        <span style="font-size:0.85rem; color:#64748b;">Valor do Kit:</span>
                        <div id="kit-builder-total" style="font-size:1.4rem; font-weight:bold; color:#2563eb;">R$ 0,00</div>
                    </div>
                    
                    <button type="button" class="btn btn-primary" id="btn-finalize-kit" style="width:100%; margin-top:1rem;">Adicionar Kit ao Pedido</button>
                </div>
            </div>
        </div>

        <!-- Quick Client Modal -->
        <div class="modal-overlay" id="quick-client-modal">
            <div class="modal" style="max-width: 400px;">
                <div class="modal-header">
                    <h3>Novo Cliente Rápido</h3>
                    <button class="modal-close" data-target="quick-client-modal">&times;</button>
                </div>
                <form id="quick-client-form">
                    <div class="form-group">
                        <label>Nome</label>
                        <input type="text" name="name" required>
                    </div>
                    <div class="form-group">
                        <label>Telefone <span style="color:#ef4444">*</span></label>
                        <input type="text" name="phone" placeholder="(XX) XXXXX-XXXX" required>
                    </div>
                    <button type="submit" class="btn btn-primary" style="width:100%">Salvar Cliente</button>
                </form>
            </div>
        </div>

        <!-- Finalize Modal -->
        <div class="modal-overlay" id="finalize-modal">
             <div class="modal" style="max-width:550px">
                <div class="modal-header">
                    <h3>Enviar para Balcão</h3>
                    <button class="modal-close" data-target="finalize-modal">&times;</button>
                </div>
                <form id="finalize-form">
                    <p style="margin-bottom:1rem">Confirme o consumo de estoque para cada item:</p>
                    <div id="finalize-items-list" style="margin-bottom:1rem"></div>
                    <div class="form-group" id="loss-group" style="display:none; background:#fef2f2; border:1px solid #fca5a5; border-radius:6px; padding:0.75rem;">
                        <label style="color:#b91c1c; font-weight:bold;">⚠️ Perda detectada — Justificativa</label>
                        <textarea name="loss_justification" id="finalize-loss-justification" rows="2" placeholder="Explique por que gastou mais material..." style="margin-top:0.5rem"></textarea>
                    </div>
                    <button type="submit" class="btn btn-success" style="width:100%">Enviar para Balcão e Imprimir</button>
                </form>
             </div>
        </div>



        <!-- Detail Modal -->
        <div class="modal-overlay" id="detail-modal">
            <div class="modal">
                <div class="modal-header">
                    <h3 id="detail-title">Detalhes do Pedido</h3>
                    <button class="modal-close" data-target="detail-modal">&times;</button>
                </div>
                <div id="detail-content"></div>
                
                 <!-- Comments Section -->
                <div class="comments-section">
                    <h4>Comentários</h4>
                    <p style="font-size:0.75rem; color:#94a3b8; margin: -0.25rem 0 0.75rem 0; display:flex; align-items:center; gap:4px;">
                        🔒 Apenas a equipe interna visualiza estes comentários
                    </p>
                    <div id="comments-list" style="max-height: 150px; overflow-y: auto; margin-bottom: 1rem;"></div>
                    <form id="comment-form" style="display: flex; gap: 0.5rem;">
                        <input type="text" id="comment-input" placeholder="Escreva um comentário..." style="flex:1; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;" required>
                        <button type="submit" class="btn btn-secondary" style="width: auto;">Enviar</button>
                    </form>
                </div>
            </div>
        </div>
        </div>
    `;

    // Helper: order number = last 4 digits of client phone
    const getOrderNum = (order) => {
        if (order.client_phone) {
            const digits = order.client_phone.replace(/\D/g, '');
            return digits.slice(-4);
        }
        return String(order.id);
    };

    const printLabel = (order) => {
        // Utilizando um iframe oculto para herdar o domínio do site e obrigar o Chrome
        // a gravar as configurações de impressão (Impressora térmica, tamanho, margens).
        let printFrame = document.getElementById('print-frame');
        if (!printFrame) {
            printFrame = document.createElement('iframe');
            printFrame.id = 'print-frame';
            printFrame.style.position = 'absolute';
            printFrame.style.width = '0';
            printFrame.style.height = '0';
            printFrame.style.border = 'none';
            document.body.appendChild(printFrame);
        }

        const doc = printFrame.contentWindow.document;
        doc.open();
        doc.write(`
            <html>
                <head>
                    <style>
                        /* Forçando "size: auto" permite que os limites de "58mm" selecionados pelo usuário no driver de impressão não sejam forçados a A4 */
                        @page { margin: 0; size: auto; }
                        * { box-sizing: border-box; margin: 0; padding: 0; }
                        body { width: 100%; max-width: 58mm; margin: 0 auto; padding: 2mm; font-family: 'Arial', sans-serif; font-size: 10px; text-align: center; }
                        .header { text-align: center; margin-bottom: 2mm; }
                        .header h2 { font-size: 14px; margin: 0; }
                        .header small { font-size: 8px; color: #555; }
                        .line { border-bottom: 1px dashed #000; margin: 2mm 0; }
                        .info { text-align: center; }
                        .info p { margin: 1mm 0; font-size: 10px; line-height: 1.4; }
                        .info p b { display: inline; }
                        .products { margin: 1mm 0; font-size: 10px; white-space: pre-line; line-height: 1.4; text-align: center; }
                        .total { text-align: center; font-size: 13px; font-weight: bold; margin: 2mm 0; }
                        .signature { margin-top: 6mm; border-top: 1px solid #000; text-align: center; padding-top: 2mm; font-size: 9px; }
                        .footer { text-align: center; font-size: 8px; color: #777; margin-top: 3mm; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h2>PEDIDO #${getOrderNum(order)}</h2>
                        <small>${new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })} ${new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}</small>
                    </div>
                    <div class="line"></div>
                    <div class="info">
                        <p style="font-size:14px;"><b>Cliente:</b> ${order.client_name}</p>
                        ${order.client_phone ? `<p><b>Tel:</b> ${order.client_phone}</p>` : ''}
                    </div>
                    <div class="line"></div>
                    <div class="info">
                        <p><b>Produtos:</b></p>
                        <div class="products">${order.product_name}</div>
                    </div>
                    <div class="line"></div>
                    <div class="signature">
                        Retirado por: ___________________
                    </div>
                    <div class="footer">LM Passo</div>
                </body>
            </html>
        `);
        doc.close();

        // Intervalo curto garantindo a renderização do iframe
        setTimeout(() => {
            printFrame.contentWindow.focus();
            printFrame.contentWindow.print();
        }, 250);
    };

    // Fetch Helpers
    let loadedProducts = []; // To check stock

    const fetchSelectData = async () => {
        const [clientsRes, productsRes] = await Promise.all([
            fetch('/api/clients'),
            fetch('/api/products')
        ]);
        const clients = (await clientsRes.json()).data;
        const products = (await productsRes.json()).data;
        loadedProducts = products; // Store for valid.

        const clientSearch = container.querySelector('#client-search');
        const clientIdInput = container.querySelector('#client-select'); // hidden input
        const suggestions   = container.querySelector('#client-suggestions');

        // Auto-apply CORE / discount on client change
        const paymentSelect = container.querySelector('#order-payment-method');
        const coreInfo = container.querySelector('#core-auto-info');

        // Restrict payment options for vendedor
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        if (['vendedor', 'producao'].includes(currentUser.role)) {
            const allowed = ['Pix', 'Cartão', 'Dinheiro', 'A Receber', 'Fidelidade'];
            [...paymentSelect.options].forEach(opt => {
                if (!allowed.includes(opt.value)) opt.remove();
            });
        }

        const applyClientDefaults = (client) => {
            if (!client) return;
            const eventGroup = container.querySelector('#event-name-group');
            if (client.origin === 'CORE') {
                paymentSelect.value = 'CORE';
                paymentSelect.disabled = true;
                if (eventGroup) eventGroup.style.display = 'block';
                coreInfo.style.display = 'block';
                coreInfo.textContent = '🔒 Cliente CORE — pagamento travado em CORE' + (client.core_discount ? ' | 15% desconto aplicado' : '');
            } else {
                paymentSelect.disabled = false;
                if (paymentSelect.value === 'CORE') {
                    if (eventGroup) eventGroup.style.display = 'block';
                } else {
                    if (eventGroup) eventGroup.style.display = 'none';
                }
                if (client.core_discount) {
                    coreInfo.style.display = 'block';
                    coreInfo.textContent = '🏷️ 15% desconto aplicado automaticamente';
                } else {
                    coreInfo.style.display = 'none';
                    coreInfo.textContent = '';
                }
            }
            // Auto-select 1D deadline for loyalty clients + hide 3D option
            const deadlineRadios = container.querySelectorAll('input[name="deadline_option"]');
            const _deadline3DLabel = container.querySelector('label:has(input[name="deadline_option"][value="3D"])');
            const _deadline1DLabel = container.querySelector('label:has(input[name="deadline_option"][value="1D"])');
            if (client.loyalty_status) {
                deadlineRadios.forEach(r => { r.checked = (r.value === '1D'); r.disabled = true; });
                if (_deadline3DLabel) _deadline3DLabel.style.display = 'none';
                if (_deadline1DLabel) {
                    _deadline1DLabel.style.flex = 'unset';
                    _deadline1DLabel.style.width = '100%';
                    _deadline1DLabel.style.background = 'linear-gradient(90deg,#f59e0b,#d97706)';
                    _deadline1DLabel.style.color = '#fff';
                    _deadline1DLabel.style.borderColor = '#f59e0b';
                    _deadline1DLabel.style.fontWeight = '900';
                    _deadline1DLabel.style.cursor = 'default';
                    _deadline1DLabel.innerHTML = '<input type="radio" name="deadline_option" value="1D" checked style="display:none;"><span style="font-size:1.1rem;">⭐</span> FIDELIDADE — PRAZO: 1 DIA (Prioritário)';
                }
                renderCart();
            } else {
                // Restore deadline options for non-loyalty clients
                deadlineRadios.forEach(r => { r.disabled = false; if(r.value==='3D') r.checked=true; });
                if (_deadline3DLabel) _deadline3DLabel.style.display = '';
                if (_deadline1DLabel) {
                    _deadline1DLabel.style.flex = '';
                    _deadline1DLabel.style.width = '';
                    _deadline1DLabel.style.background = '#fef2f2';
                    _deadline1DLabel.style.color = '#b91c1c';
                    _deadline1DLabel.style.borderColor = '#fee2e2';
                    _deadline1DLabel.style.fontWeight = '700';
                    _deadline1DLabel.style.cursor = 'pointer';
                    _deadline1DLabel.innerHTML = '<input type="radio" name="deadline_option" value="1D" style="accent-color:#dc2626;"> 1 Dia';
                }
            }

            // Loyalty discount notice + payment lock
            const discountSelect = container.querySelector('#order-discount');
            const loyaltyInfo = container.querySelector('#loyalty-discount-info');
            if (client.loyalty_status) {
                // Lock payment to Fidelidade
                paymentSelect.value = 'Fidelidade';
                paymentSelect.disabled = true;
                if (discountSelect) { discountSelect.value = '0'; discountSelect.disabled = true; }
                if (loyaltyInfo) loyaltyInfo.style.display = 'block';
            } else {
                // Restore payment select if not CORE
                if (client.origin !== 'CORE') paymentSelect.disabled = false;
                if (discountSelect) discountSelect.disabled = false;
                if (loyaltyInfo) loyaltyInfo.style.display = 'none';
            }
        };
        
        const isKitType = (val) => (val || '').toUpperCase().includes('KIT');

        // (event name visibility is wired at component init, outside fetchSelectData)

        const removeAccents = (str) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        const selectClient = (client) => {
            clientIdInput.value = client.id;
            clientSearch.value = (client.loyalty_status ? '⭐ ' : '') + client.name;
            clientSearch.style.borderColor = client.loyalty_status ? '#f59e0b' : '#22c55e';
            suggestions.style.display = 'none';
            applyClientDefaults(client);
            if (typeof renderCart === 'function') renderCart(); // Recalculate total with loyalty discount
        };

        const showSuggestions = (term) => {
            const t = removeAccents(term.toLowerCase().trim());
            if (!t) { suggestions.style.display = 'none'; return; }
            const filtered = clients.filter(c => removeAccents(c.name.toLowerCase()).includes(t));
            if (!filtered.length) { suggestions.style.display = 'none'; return; }
            suggestions.innerHTML = filtered.slice(0, 12).map(c => `
                <div class="client-suggestion-item" data-id="${c.id}"
                    style="padding:0.5rem 0.75rem; cursor:pointer; font-size:0.95rem; border-bottom:1px solid #f1f5f9; ${c.loyalty_status ? 'background:#fffbeb;' : ''}"
                    onmouseover="this.style.background='${c.loyalty_status ? '#fef3c7' : '#eff6ff'}'" onmouseout="this.style.background='${c.loyalty_status ? '#fffbeb' : ''}'"
                >${c.loyalty_status ? '<span style="color:#f59e0b; font-weight:900; margin-right:4px;">⭐</span>' : ''}${c.name}${c.phone ? `<span style="color:#94a3b8; font-size:0.8rem; margin-left:0.5rem;">${c.phone}</span>` : ''}${c.loyalty_status ? '<span style="color:#b45309; font-size:0.75rem; font-weight:700; margin-left:6px; background:#fde68a; padding:1px 5px; border-radius:4px;">FIDELIDADE</span>' : ''}</div>
            `).join('');
            suggestions.style.display = 'block';
            suggestions.querySelectorAll('.client-suggestion-item').forEach(item => {
                item.onmousedown = (e) => {
                    e.preventDefault();
                    const client = clients.find(c => c.id == item.dataset.id);
                    if (client) selectClient(client);
                };
            });
        };

        clientSearch.addEventListener('input', () => {
            clientIdInput.value = '';
            clientSearch.style.borderColor = '#ccc';
            showSuggestions(clientSearch.value);
        });
        clientSearch.addEventListener('blur', () => {
            setTimeout(() => { suggestions.style.display = 'none'; }, 150);
        });
        clientSearch.addEventListener('focus', () => {
            if (clientSearch.value) showSuggestions(clientSearch.value);
        });

        // Expose for use after quick-client creation
        window._kanbanClientsRef = clients;
        window._kanbanSelectClientById = (id) => {
            const client = clients.find(c => c.id === id);
            if (client) selectClient(client);
        };

        const productSelect = container.querySelector('#product-select');
        const typeFilter = container.querySelector('#product-type-filter');
        const nameSearch = container.querySelector('#product-name-search');

        // Populate type filter
        const types = [...new Set(products.map(p => p.type || '').filter(t => t))];
        typeFilter.innerHTML = '<option value="">Todos os tipos</option>' + types.sort().map(t => `<option value="${t}">${t}</option>`).join('');


        const filterProducts = () => {
            const selectedType = typeFilter.value;
            const searchTerm = removeAccents((nameSearch ? nameSearch.value : '').toLowerCase().trim());
            const filtered = products.filter(p => {
                const matchType = !selectedType || p.type === selectedType;
                const matchName = !searchTerm || removeAccents(p.name.toLowerCase()).includes(searchTerm);
                return matchType && matchName;
            });
            productSelect.innerHTML = filtered.length
                ? '<option value="">Selecione...</option>' + filtered.map(p => `<option value="${p.id}">${p.name}</option>`).join('')
                : '<option value="">Nenhum produto encontrado</option>';
        };

        typeFilter.addEventListener('change', filterProducts);
        if (nameSearch) nameSearch.addEventListener('input', filterProducts);
        filterProducts(); // Initial load
    };

    const loadOrders = async () => {
        if (!window._kanbanClientsRef) {
            try {
                const cRes = await fetch('/api/clients?t=' + Date.now());
                const cJson = await cRes.json();
                window._kanbanClientsRef = cJson.data || [];
            } catch (e) {
                window._kanbanClientsRef = [];
            }
        }
        // Client role: fetch only their orders; others: fetch all
        const url = isClient && clientId ? `/api/reports/client-orders/${clientId}` : '/api/orders';
        const res = await fetch(url + (url.includes('?') ? '&' : '?') + 't=' + Date.now());
        const { data } = await res.json();

        let newOrderDetails = null;
        if (!isInitialLoad) {
            data.forEach(order => {
                if (!knownOrderIds.has(order.id) && ['aguardando_aceite', 'producao', 'em_balcao'].includes(order.status)) {
                    newOrderDetails = order;
                }
            });
        }
        
        data.forEach(order => knownOrderIds.add(order.id));

        if (newOrderDetails && 'Notification' in window && Notification.permission === 'granted') {
            const notif = new Notification(`📦 Novo Pedido #${newOrderDetails.id}`, {
                body: `Cliente: ${newOrderDetails.client_name || 'Desconhecido'}\nLançado no quadro Kanban.`,
                icon: '/logo.png',
                tag: 'kanban-new-order',
                renotify: true
            });
            notif.onclick = () => { window.focus(); notif.close(); };
            playNotificationSound();
        }

        isInitialLoad = false;

        // For client/producao, show only relevant columns
        const visibleStatuses = isClient ? ['producao', 'em_balcao']
            : isProducao ? ['aguardando_aceite', 'producao', 'em_balcao', 'finalizado']
            : ['aguardando_aceite', 'producao', 'em_balcao', 'finalizado'];

        // Clear Cols
        const columnTimes = { aguardando_aceite: 0, producao: 0, em_balcao: 0, finalizado: 0 };
        const columnAITimes = { aguardando_aceite: 0, producao: 0, em_balcao: 0, finalizado: 0 };

        visibleStatuses.forEach(status => {
            const col = container.querySelector(`#col-${status} .column-content`);
            if (col) col.innerHTML = '';
            const counter = container.querySelector(`#col-${status} .column-count`);
            if (counter) counter.textContent = '0';
            const stats = container.querySelector(`#col-${status} .column-stats`);
            if (stats) stats.textContent = '';
        });

        const formatDuration = (min) => {
            if (!min) return '';
            const totalMin = Math.round(min * 10) / 10; // round to 1 decimal
            const h = Math.floor(totalMin / 60);
            const m = Math.round(totalMin % 60);
            if (h > 0) return `${h}h${m > 0 ? ' ' + m + 'min' : ''}`;
            if (m > 0) return `${m}min`;
            const sec = Math.round(totalMin * 60);
            return `${sec}seg`;
        };


        data.forEach(order => {
            // Verify loyalty status directly from clients reference
            const _clientRef = (window._kanbanClientsRef || []).find(c => c.id == order.client_id);
            const isLoyalty = _clientRef ? _clientRef.loyalty_status : false;

            // Skip orders not in visible statuses for client
            if (isClient && !visibleStatuses.includes(order.status)) return;

            // Accumulate Time
            if (order.total_estimated_time && columnTimes[order.status] !== undefined) {
                columnTimes[order.status] += order.total_estimated_time;
            }
            if (order.ai_estimated_time && columnAITimes[order.status] !== undefined) {
                columnAITimes[order.status] += order.ai_estimated_time;
            }

            // Check deadline for alert
            if (order.status === 'producao' && order.deadline_at) {
                const deadlineMs = window.parseDBDate(order.deadline_at).getTime();
                const nowMs = Date.now();
                // 2 hours = 7200000 ms
                if (deadlineMs - nowMs <= 7200000 && !notifiedLateOrders.has(order.id)) {
                    notifiedLateOrders.add(order.id);
                    showToastAlert(`O pedido #${getOrderNum(order)} (${order.client_name}) deve ser enviado ao balcão em breve. O prazo expira às ${window.parseDBDate(order.deadline_at).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })} do dia ${window.parseDBDate(order.deadline_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}.`);
                }
            }

            // Check urgent 1-day deadline for production alert
            if (['aguardando_aceite', 'producao'].includes(order.status) && order.deadline_type && (order.deadline_type === '1D' || order.deadline_type.toUpperCase().includes('1 DIA'))) {
                if (!notifiedUrgentOrders.has(order.id)) {
                    notifiedUrgentOrders.add(order.id);
                    if (isLoyalty) {
                        showToastAlert(`⭐ O pedido #${getOrderNum(order)} de ${order.client_name} é de cliente fidelidade e tem prazo reduzido de 1 DIA!`, 'gold');
                    } else {
                        showToastAlert(`🚀 O pedido #${getOrderNum(order)} de ${order.client_name} tem prazo reduzido de 1 DIA! Acelere a entrega.`, 'blue');
                    }
                }
            }

            const col = container.querySelector(`#col-${order.status} .column-content`);
            if (col) {
                const card = document.createElement('div');
                card.className = `card status-${order.status}`;
                card.dataset.orderId = order.id;

                // Golden styling for loyalty orders — progressively more gold per column, EXCEPT finalizado (stays green)
                if (isLoyalty && order.status !== 'finalizado') {
                    const _goldStages = {
                        aguardando_aceite: {
                            border: '2px solid rgba(245,158,11,0.5)',
                            borderLeft: '5px solid #fbbf24',
                            bg: 'linear-gradient(150deg,#fffbeb 0%,#fefce8 100%)',
                            shadow: '0 4px 18px rgba(245,158,11,0.18), 0 1px 4px rgba(0,0,0,0.05)',
                            radius: '12px'
                        },
                        producao: {
                            border: '2px solid rgba(245,158,11,0.7)',
                            borderLeft: '6px solid #f59e0b',
                            bg: 'linear-gradient(150deg,#fef3c7 0%,#fffbeb 100%)',
                            shadow: '0 6px 24px rgba(245,158,11,0.28), 0 2px 8px rgba(0,0,0,0.06)',
                            radius: '13px'
                        },
                        em_balcao: {
                            border: '2px solid rgba(217,119,6,0.8)',
                            borderLeft: '7px solid #d97706',
                            bg: 'linear-gradient(150deg,#fde68a 0%,#fef3c7 60%,#fffbeb 100%)',
                            shadow: '0 8px 30px rgba(217,119,6,0.38), 0 2px 10px rgba(0,0,0,0.07)',
                            radius: '14px'
                        }
                    };
                    const _gs = _goldStages[order.status] || _goldStages.producao;
                    card.style.border = _gs.border;
                    card.style.borderLeft = _gs.borderLeft;
                    card.style.background = _gs.bg;
                    card.style.boxShadow = _gs.shadow;
                    card.style.borderRadius = _gs.radius;
                }


                // Enable drag-and-drop only for producao role on producao/finalizado columns
                const isDraggableCol = (order.status === 'producao' || order.status === 'finalizado');
                if (isProducao && isDraggableCol) {
                    card.draggable = true;
                    card.style.cursor = 'grab';
                    card.addEventListener('dragstart', (e) => {
                        e.dataTransfer.setData('order-id', order.id);
                        e.dataTransfer.setData('order-status', order.status);
                        card.classList.add('dragging');
                    });
                    card.addEventListener('dragend', () => {
                        card.classList.remove('dragging');
                    });
                    card.onclick = () => openDetail(order);
                } else {
                    card.onclick = () => openDetail(order);
                }

                // Formatting date and status specific UI
                let badge = '';
                if (order.status === 'aguardando_aceite') {
                    badge = `<span class="card-badge" style="background:#fefce8; color:#a16207; font-weight:700; padding:4px 8px; border-radius:6px; border:1px solid #fef08a;">⏳ Aguardando</span>`;
                } else if (order.status === 'producao' && order.deadline_at) {
                    const deadline = window.parseDBDate(order.deadline_at);
                    const now = new Date();
                    const diff = deadline - now;
                    const isUrgent = diff < 86400000; // 24h
                    if (isUrgent && diff > 0) card.classList.add('deadline-urgent');
                    if (diff < 0) {
                        card.style.borderLeftColor = 'red';
                        badge = `<span class="card-badge" style="background:#fecaca; color:#b91c1c; font-weight:700; padding:4px 8px; border-radius:6px;">🚨 Atrasado</span>`;
                    } else {
                        const _clientRef = (window._kanbanClientsRef || []).find(c => c.id == order.client_id);
                        const loyaltyTier = _clientRef ? (_clientRef.loyalty_tier || 'bronze') : 'bronze';
                        
                        const dt = order.deadline_type || '';
                        if (loyaltyTier === 'ouro') {
                            card.style.borderLeftColor = '#f59e0b';
                            card.style.boxShadow = '0 0 15px rgba(245, 158, 11, 0.5)';
                            badge = `<span class="card-badge" style="background:linear-gradient(135deg, #f59e0b 0%, #b45309 100%); color:#fff; font-weight:900; letter-spacing:0.5px; border:none; padding:4px 10px; border-radius:6px; animation: pulse 2s infinite;">🏆 PRIORIDADE MÁXIMA</span>`;
                        } else if (dt === '1D' || dt.toLowerCase().includes('1 dia') || dt.toLowerCase().includes('urgente')) {
                            if (isLoyalty) {
                                // Loyalty Prata/Bronze: keep gold border, no badge needed
                                badge = '';
                            } else {
                                card.style.borderLeftColor = '#3b82f6';
                                card.style.boxShadow = '0 0 8px rgba(59, 130, 246, 0.3)';
                                badge = `<span class="card-badge" style="background:linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color:#fff; font-weight:bold; letter-spacing:0.5px; border:none; padding:4px 10px; border-radius:6px;">🚀 MÁX PRIORIDADE (1D)</span>`;
                            }
                        } else {
                            badge = `<span class="card-badge" style="background:#eff6ff; color:#1d4ed8; font-weight:700; padding:4px 8px; border-radius:6px; border:1px solid #bfdbfe;">⏱️ ${dt}</span>`;
                        }
                    }
                } else if (order.status === 'producao') {
                    badge = `<span class="card-badge" style="background:#eff6ff; color:#1d4ed8; font-weight:700; padding:4px 8px; border-radius:6px; border:1px solid #bfdbfe;">⚙️ Em Produção</span>`;
                } else if (order.status === 'em_balcao') {
                    badge = `<span class="card-badge" style="background:#fff7ed; color:#c2410c; font-weight:700; padding:4px 8px; border-radius:6px; border:1px solid #fed7aa;">🛍️ Em Balcão</span>`;
                } else if (order.status === 'finalizado') {
                    badge = `<span class="card-badge" style="background:#f0fdf4; color:#15803d; font-weight:700; padding:4px 8px; border-radius:6px; border:1px solid #bbf7d0;">✅ Finalizado</span>`;
                }

                // Pie chart for orders with checklist data
                let pieHtml = '';
                const clData = order.checklist || {};
                const checklistItems = ['arte', 'impressao', 'corte', 'embalagem'];
                const doneItems = checklistItems.filter(i => clData[i]).length;
                if (doneItems > 0 || order.status === 'producao') {
                    const total = 4;
                    const pct = Math.round((doneItems / total) * 100);
                    const color = pct === 100 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
                    pieHtml = `<div class="card-pie-wrap" style="display:flex; align-items:center; gap:6px; margin-top:6px;">
                        <div class="card-pie-circle" style="width:28px; height:28px; border-radius:50%; background:conic-gradient(${color} ${pct * 3.6}deg, #e5e7eb ${pct * 3.6}deg); flex-shrink:0;"></div>
                        <span class="card-pie-text" style="font-size:0.78rem; font-weight:600; color:${color};">${doneItems}/${total} (${pct}%)</span>
                    </div>`;
                }

                card.innerHTML = `
                    ${isLoyalty ? `<div style="background:linear-gradient(90deg,#f59e0b,#d97706); color:#fff; font-size:0.72rem; font-weight:900; letter-spacing:0.08em; padding:4px 10px; border-radius:6px 6px 0 0; margin:-12px -12px 8px -12px; text-align:center;">⭐ FIDELIDADE — ATENDIMENTO PRIORITÁRIO</div>` : ""}
                    <div class="card-header" style="justify-content:space-between;"><span>#${getOrderNum(order)}</span> <span>Lançado: ${window.parseDBDate(order.created_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })} ${window.parseDBDate(order.created_at).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}</span></div>
                    ${order.deadline_at ? `<div style="font-size:0.8rem; color:${isLoyalty ? '#d97706' : '#059669'}; padding:2px 0 4px 0; font-weight:600; border-bottom:1px solid #eee; margin-bottom:4px;">📅 Entrega: ${window.parseDBDate(order.deadline_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })} ${window.parseDBDate(order.deadline_at).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}</div>` : ''}
                    <div class="card-title">${order.client_name || 'Cliente?'} ${order.is_internal ? '<span style="background:#dbeafe; color:#1d4ed8; padding:1px 6px; border-radius:10px; font-size:0.7rem; font-weight:600; margin-left:4px;">🏢 Interno</span>' : ''}</div>
                    <div class="card-detail" style="font-size:0.85rem; color:#555; white-space:pre-wrap;">${order.product_name || 'Produto?'}</div>
                    <div style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-top:4px;">
                        ${order.status === 'producao' && order.total_estimated_time ? (order.has_terceirizado ? `<div style="font-size:0.8rem; color:#1d4ed8; font-weight:600;">📅 ${order.total_estimated_time} dia${order.total_estimated_time == 1 ? '' : 's'} úteis</div>` : `<div style="font-size:0.8rem; color:${isLoyalty ? '#b45309' : '#7c3aed'}; font-weight:600;">⏱️ ${formatDuration(order.total_estimated_time)}</div>`) : ''}
                        ${order.ai_estimated_time ? `<div style="font-size:0.8rem; color:${isLoyalty ? '#b45309' : '#059669'}; font-weight:700; background:${isLoyalty ? '#fef3c7' : '#f0fdf4'}; padding:1px 6px; border-radius:6px; border:1px solid ${isLoyalty ? '#fde68a' : '#bbf7d0'};">⏱️ Est. Produção: ${formatDuration(order.ai_estimated_time)}</div>` : ''}
                    </div>
                    ${pieHtml}
                    <div class="card-footer">
                        <span>${order.created_by_name?.split(' ')[0]}</span>
                        ${badge}
                    </div>
                    ${order.moved_by_name ? `<div class="card-moved-by" style="font-size:0.75rem; color:#6b7280; padding:3px 6px; background:#f8fafc; border-top:1px solid #e5e7eb; border-radius:0 0 6px 6px; margin-top:2px;">📦 Movido por: <b>${order.moved_by_name.split(' ')[0]}</b></div>` : ''}
                    ${isLoyalty ? `<div style="margin:6px -12px -12px -12px; padding:5px 10px; background:linear-gradient(90deg,#f59e0b,#d97706); border-radius:0 0 12px 12px; font-size:0.72rem; font-weight:900; color:#fff; letter-spacing:0.06em; text-align:center;">⭐ PRAZO: 1 DIA — PRIORITÁRIO</div>` : ''}
                `;
                col.appendChild(card);

                // Update Count
                const counter = container.querySelector(`#col-${order.status} .column-count`);
                if (counter) counter.textContent = parseInt(counter.textContent) + 1;
            }
        });

        // Update Stats Display

        ['aguardando_aceite', 'producao'].forEach(status => {
            const statsEl = container.querySelector(`#col-${status} .column-stats`);
            const totalMin = columnTimes[status];
            const totalAIMin = columnAITimes[status];
            if (statsEl) {
                let html = '';
                if (totalMin > 0) html += `⏱️ ${formatDuration(totalMin)}`;
                if (totalAIMin > 0) html += (html ? ' | ' : '') + `⏱️ Produção: ${formatDuration(totalAIMin)}`;
                statsEl.innerHTML = html;
            }
        });
    };

    const openDetail = async (order) => {
        const modal = container.querySelector('#detail-modal');
        const content = container.querySelector('#detail-content');
        const currentUserRole = JSON.parse(localStorage.getItem('user') || '{}').role;
        const isVendedor = currentUserRole === 'vendedor';

        // Action Buttons Logic
        let actions = '';
        let checklistHtml = '';

        // Client role: show read-only view only
        if (isClient) {
            const items = ['arte', 'impressao', 'corte', 'embalagem'];
            const itemLabels = { arte: 'Arte', impressao: 'Impressão', corte: 'Corte', embalagem: 'Embalagem' };
            const checklist = order.checklist || {};
            const doneCount = items.filter(i => checklist[i]).length;
            const pctDone = Math.round((doneCount / items.length) * 100);
            const pieColor = pctDone === 100 ? '#22c55e' : pctDone >= 50 ? '#f59e0b' : '#ef4444';

            const formatCheckDate = (val) => {
                if (!val || val === true) return '';
                try {
                    const d = window.parseDBDate(val);
                    return `<span style="font-size:0.75rem; color:#6b7280; margin-left:auto;">✅ ${d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })} ${d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}</span>`;
                } catch { return ''; }
            };

            let statusBadge = '';
            if (order.status === 'em_balcao') {
                statusBadge = `<div style="text-align:center; padding:1.5rem; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px; margin-top:1rem;">
                    <div style="font-size:2rem; margin-bottom:0.5rem;">📦</div>
                    <div style="font-size:1.1rem; font-weight:700; color:#166534;">Pronto para Retirada!</div>
                    <div style="font-size:0.85rem; color:#059669; margin-top:0.25rem;">Seu pedido está disponível para retirada.</div>
                </div>`;
            }

            content.innerHTML = `
                <div style="display:grid; grid-template-columns: 1fr; gap:1.25rem;">
                    <div style="background: rgba(139, 92, 246, 0.04); border: 1px solid rgba(139, 92, 246, 0.15); border-left: 4px solid var(--primary); padding: 1.25rem; border-radius: 16px;">
                        <span style="font-size: 0.8rem; font-weight: 800; color: var(--primary); text-transform: uppercase; letter-spacing: 0.05em; display:block; margin-bottom:0.5rem;">📦 Produtos do Pedido</span>
                        <div style="white-space:pre-line; color: #1e1b4b; font-size: 1.05rem; font-weight: 600; line-height: 1.5;">${order.product_name || order.products_summary || '-'}</div>
                    </div>
                    ${order.description ? `
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 1.25rem; border-radius: 16px;">
                        <span style="font-size: 0.8rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; display:block; margin-bottom:0.5rem;">📝 Descrição / Observações</span>
                        <div style="white-space:pre-wrap; color: #334155; font-size: 0.95rem; line-height: 1.6; font-weight:500;">${order.description}</div>
                    </div>` : ''}
                    
                    <div style="display:flex; gap:1rem; flex-wrap:wrap;">
                        <div style="flex:1; background: #fff; border: 1px solid #e2e8f0; padding: 1.25rem; border-radius: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); display:flex; flex-direction:column; justify-content:center;">
                            <span style="font-size: 0.75rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Pagamento</span>
                            <div style="font-size:1.1rem; font-weight:800; color:#1d4ed8; margin-top:0.25rem;">💳 ${order.payment_method || '-'}</div>
                        </div>
                        <div style="flex:1; background: linear-gradient(135deg, #4c1d95, var(--primary)); padding: 1.25rem; border-radius: 16px; box-shadow: 0 8px 20px rgba(139, 92, 246, 0.3); color: white; display:flex; flex-direction:column; justify-content:center;">
                            <span style="font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.8;">Valor Total</span>
                            <div style="font-size:1.6rem; font-weight:800; margin-top:0.25rem; letter-spacing:-0.02em;">R$ ${(order.total_value || 0).toFixed(2)}</div>
                        </div>
                        ${order.ai_estimated_time ? `
                        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 1.25rem; border-radius: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); display:flex; flex-direction:column; justify-content:center;">
                            <span style="font-size: 0.75rem; font-weight: 800; color: #166534; text-transform: uppercase; letter-spacing: 0.05em;">⏱️ Estimativa de Produção</span>
                            <div style="font-size:1.1rem; font-weight:800; color:#15803d; margin-top:0.25rem;">${formatDuration(order.ai_estimated_time)}</div>
                            <small style="color:#166534; font-size:0.7rem; margin-top:4px; white-space:pre-line;">${order.production_notes || ''}</small>
                        </div>
                        ` : ''}
                    </div>

                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; background: #f8fafc; padding: 1.25rem; border-radius: 16px; border: 1px solid #e2e8f0;">
                        <div>
                            <span style="font-size: 0.75rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; display:block; margin-bottom:0.25rem;">📅 Lançamento</span>
                            <div style="font-weight:700; color:#334155;">${window.parseDBDate(order.created_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })} às ${window.parseDBDate(order.created_at).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                        ${order.deadline_at ? `
                        <div>
                            <span style="font-size: 0.75rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; display:block; margin-bottom:0.25rem;">🚀 Previsão (${order.deadline_type || 'Prazo'})</span>
                            <div style="font-weight:800; color:#059669;">${window.parseDBDate(order.deadline_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })} às ${window.parseDBDate(order.deadline_at).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}</div>
                        </div>` : ''}
                    </div>
                </div>
                ${order.status === 'producao' ? `
                    <div style="margin-top:1rem; padding:0.75rem; background:#f9fafb; border-radius:8px; border:1px solid #e5e7eb">
                        <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:0.75rem;">
                            <div style="width:48px; height:48px; border-radius:50%; background:conic-gradient(${pieColor} ${pctDone * 3.6}deg, #e5e7eb ${pctDone * 3.6}deg); flex-shrink:0; display:flex; align-items:center; justify-content:center;">
                                <div style="width:30px; height:30px; border-radius:50%; background:#f9fafb; display:flex; align-items:center; justify-content:center; font-size:0.7rem; font-weight:700; color:${pieColor};">${pctDone}%</div>
                            </div>
                            <div>
                                <h4 style="margin:0; font-size:14px;">Progresso da Produção</h4>
                                <small style="color:#666;">${doneCount}/${items.length} etapas concluídas</small>
                            </div>
                        </div>
                        <div style="display:flex; flex-direction:column; gap:0.4rem">
                            ${items.map(item => `
                                <div style="display:flex; align-items:center; gap:0.5rem; font-size:14px; padding:0.3rem 0.4rem; border-radius:6px; background:${checklist[item] ? '#f0fdf4' : '#fff'}; border:1px solid ${checklist[item] ? '#bbf7d0' : '#e5e7eb'};">
                                    <span style="${checklist[item] ? 'color:#22c55e;' : 'color:#d1d5db;'}">${checklist[item] ? '✅' : '⏳'}</span>
                                    <span style="${checklist[item] ? 'text-decoration:line-through; color:#6b7280;' : ''}">${itemLabels[item]}</span>
                                    ${formatCheckDate(checklist[item])}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                ${statusBadge}
            `;

            modal.classList.add('open');
            modal.querySelector('.modal-close').onclick = () => modal.classList.remove('open');
            return;
        }

        if (order.status === 'aguardando_aceite') {
            const deadlineDate = order.deadline_at ? window.parseDBDate(order.deadline_at) : null;
            const now = new Date();
            const isExpired = deadlineDate && now > deadlineDate;
            const deadlineLabel = deadlineDate ? deadlineDate.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) + ' ' + deadlineDate.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }) : 'N/A';

            if (isVendedor) {
                // Vendedor: read-only, just show status
                actions = `
                    <div style="margin-top: 1rem; border-top: 1px solid #eee; padding-top: 1rem;">
                        <div style="padding:0.75rem; border-radius:8px; background:#fefce8; border:1px solid #fde68a; text-align:center;">
                            <span style="font-size:1.2rem;">⏳</span>
                            <p style="margin:0.25rem 0 0; font-weight:600; color:#92400e;">Aguardando a produção aceitar o pedido</p>
                        </div>
                    </div>
                `;
            } else {
                actions = `
                    <div style="margin-top: 1rem; border-top: 1px solid #eee; padding-top: 1rem;">
                        <p style="margin-bottom:0.5rem; font-weight:600">Produção - Aceitar Pedido:</p>
                        <div style="margin-bottom:0.5rem; padding:0.5rem; border-radius:6px; font-size:0.9rem; ${isExpired ? 'background:#fef2f2; border:1px solid #fecaca; color:#b91c1c;' : 'background:#f0fdf4; border:1px solid #bbf7d0; color:#166534;'}">
                            📅 Prazo do vendedor: <b>${deadlineLabel}</b> (${order.deadline_type || 'N/A'})
                            ${isExpired ? '<br><span style="font-weight:700;">⚠️ PRAZO EXPIRADO — não é possível aceitar</span>' : ''}
                        </div>
                        <button class="btn btn-primary btn-accept" ${isExpired ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>✅ Aceitar Pedido</button>
                    </div>
                `;
            }
        } else if (order.status === 'producao') {
            const items = ['arte', 'impressao', 'corte', 'embalagem'];
            const itemLabels = { arte: 'Arte', impressao: 'Impressão', corte: 'Corte', embalagem: 'Embalagem' };
            const checklist = order.checklist || {};
            const allChecked = items.every(i => checklist[i]);
            const doneCount = items.filter(i => checklist[i]).length;
            const pctDone = Math.round((doneCount / items.length) * 100);
            const pieColor = pctDone === 100 ? '#22c55e' : pctDone >= 50 ? '#f59e0b' : '#ef4444';

            const formatCheckDate = (val) => {
                if (!val || val === true) return '';
                try {
                    const d = window.parseDBDate(val);
                    return `<span style="font-size:0.75rem; color:#6b7280; margin-left:auto;">✅ ${d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })} ${d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}</span>`;
                } catch { return ''; }
            };

            checklistHtml = `
               <div class="checklist-section" style="margin-top:1rem; padding:0.75rem; background:#f9fafb; border-radius:8px; border:1px solid #e5e7eb">
                   <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:0.75rem;">
                       <div id="checklist-pie" style="width:48px; height:48px; border-radius:50%; background:conic-gradient(${pieColor} ${pctDone * 3.6}deg, #e5e7eb ${pctDone * 3.6}deg); flex-shrink:0; display:flex; align-items:center; justify-content:center;">
                           <div style="width:30px; height:30px; border-radius:50%; background:#f9fafb; display:flex; align-items:center; justify-content:center; font-size:0.7rem; font-weight:700; color:${pieColor};">${pctDone}%</div>
                       </div>
                       <div>
                           <h4 style="margin:0; font-size:14px;">Checklist de Produção</h4>
                           <small style="color:#666;">${doneCount}/${items.length} etapas concluídas</small>
                       </div>
                   </div>
                   <div style="display:flex; flex-direction:column; gap:0.4rem">
                       ${items.map(item => `
                           <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer; font-size:14px; padding:0.3rem 0.4rem; border-radius:6px; background:${checklist[item] ? '#f0fdf4' : '#fff'}; border:1px solid ${checklist[item] ? '#bbf7d0' : '#e5e7eb'};">
                               <input type="checkbox" class="checklist-item" data-item="${item}" ${checklist[item] ? 'checked' : ''}>
                               <span style="${checklist[item] ? 'text-decoration:line-through; color:#6b7280;' : ''}">${itemLabels[item]}</span>
                               ${formatCheckDate(checklist[item])}
                           </label>
                       `).join('')}
                   </div>
               </div>
            `;

            if (isVendedor) {
                // Vendedor: read-only checklist progress
                actions = `
                    ${checklistHtml}
                    <div style="margin-top: 1rem; border-top: 1px solid #eee; padding-top: 1rem;">
                        <div style="padding:0.75rem; border-radius:8px; background:#eff6ff; border:1px solid #bfdbfe; text-align:center;">
                            <span style="font-size:1.2rem;">🔧</span>
                            <p style="margin:0.25rem 0 0; font-weight:600; color:#1d4ed8;">Pedido em produção</p>
                        </div>
                    </div>
                `;
            } else {
                actions = `
                    ${checklistHtml}
                    <div style="margin-top: 1rem; border-top: 1px solid #eee; padding-top: 1rem;">
                        <button class="btn btn-success btn-finalize" ${allChecked ? '' : 'disabled title="Conclua o checklist antes"'}>✅ Enviar para Balcão</button>
                    </div>
                `;
            }
        } else if (order.status === 'em_balcao') {
            const _clEb = order.checklist || {};
            const _itemsEb = ['arte', 'impressao', 'corte', 'embalagem'];
            const _itemLabelsEb = { arte: 'Arte', impressao: 'Impresso', corte: 'Corte', embalagem: 'Embalagem' };
            const dispatchHtml = `
                <div style="margin-top:0.75rem; padding:0.75rem; background:#fdfae7; border:1px solid #fde68a; border-radius:8px;">
                    <div style="font-weight:700; color:#92400e; margin-bottom:0.5rem; font-size:0.95rem;">🚚 Despacho (opcional)</div>
                    <div style="display:flex; gap:0.6rem; margin-bottom:0.5rem; flex-wrap:wrap;">
                        <label style="display:flex; align-items:center; gap:0.4rem; cursor:pointer; padding:0.4rem 0.75rem; border-radius:6px; border:2px solid #e5e7eb; background:#fff; font-weight:600; font-size:0.9rem; transition:border-color 0.2s;" id="dispatch-label-none">
                            <input type="radio" name="dispatch_carrier" value="" checked> Nenhum
                        </label>
                        <label style="display:flex; align-items:center; gap:0.4rem; cursor:pointer; padding:0.4rem 0.75rem; border-radius:6px; border:2px solid #e5e7eb; background:#fff; font-weight:600; font-size:0.9rem; transition:border-color 0.2s;" id="dispatch-label-unida">
                            <input type="radio" name="dispatch_carrier" value="UNIDA"> UNIDA
                        </label>
                        <label style="display:flex; align-items:center; gap:0.4rem; cursor:pointer; padding:0.4rem 0.75rem; border-radius:6px; border:2px solid #e5e7eb; background:#fff; font-weight:600; font-size:0.9rem; transition:border-color 0.2s;" id="dispatch-label-correios">
                            <input type="radio" name="dispatch_carrier" value="CORREIOS"> CORREIOS
                        </label>
                        <label style="display:flex; align-items:center; gap:0.4rem; cursor:pointer; padding:0.4rem 0.75rem; border-radius:6px; border:2px solid #e5e7eb; background:#fff; font-weight:600; font-size:0.9rem; transition:border-color 0.2s;" id="dispatch-label-outro">
                            <input type="radio" name="dispatch_carrier" value="OUTRO"> OUTRO
                        </label>
                    </div>
                    <div id="dispatch-options-container" style="display:none; gap:10px; flex-wrap:wrap; margin-top:0.5rem; padding-top:0.5rem; border-top:1px dashed #fcd34d;">
                        <div id="dispatch-other-name-wrapper" style="display:none; flex:1; min-width:140px; flex-direction:column;">
                            <label style="font-size:0.85rem; color:#555;">Transportadora:</label>
                            <input type="text" id="dispatch-other-name" placeholder="Ex: Jadlog" style="width:100%; padding:0.4rem 0.6rem; border:1px solid #fcd34d; border-radius:4px; font-size:0.95rem; margin-top:0.25rem;">
                        </div>
                        <div id="dispatch-amount-wrapper" style="display:none; flex:1; min-width:140px; flex-direction:column;">
                            <label style="font-size:0.85rem; color:#555;">Taxa (R$):</label>
                            <input type="number" id="dispatch-amount" step="0.01" min="0" placeholder="0,00" style="width:100%; padding:0.4rem 0.6rem; border:1px solid #fcd34d; border-radius:4px; font-size:0.95rem; margin-top:0.25rem;">
                        </div>
                    </div>
                </div>
            `;
            const _doneEb = _itemsEb.filter(i => _clEb[i]).length;
            const _pctEb = Math.round((_doneEb / _itemsEb.length) * 100);
            const _colorEb = _pctEb === 100 ? '#22c55e' : _pctEb >= 50 ? '#f59e0b' : '#ef4444';
            const _fmtEb = (val) => {
                if (!val || val === true) return '';
                try { const d = window.parseDBDate(val); return `<span style="font-size:0.75rem;color:#6b7280;margin-left:auto;">✅ ${d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })} ${d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}</span>`; } catch { return ''; }
            };
            actions = `
               <div style="margin-top:1rem; padding:0.75rem; background:#f9fafb; border-radius:8px; border:1px solid #e5e7eb">
                   <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:0.75rem;">
                       <div style="width:48px;height:48px;border-radius:50%;background:conic-gradient(${_colorEb} ${_pctEb*3.6}deg,#e5e7eb ${_pctEb*3.6}deg);flex-shrink:0;display:flex;align-items:center;justify-content:center;">
                           <div style="width:30px;height:30px;border-radius:50%;background:#f9fafb;display:flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:700;color:${_colorEb};">${_pctEb}%</div>
                       </div>
                       <div><h4 style="margin:0;font-size:14px;">Checklist de Produção</h4><small style="color:#666;">${_doneEb}/${_itemsEb.length} etapas concluídas</small></div>
                   </div>
                   <div style="display:flex;flex-direction:column;gap:0.4rem">
                       ${_itemsEb.map(item => `<label style="display:flex;align-items:center;gap:0.5rem;font-size:14px;padding:0.3rem 0.4rem;border-radius:6px;background:${_clEb[item]?'#f0fdf4':'#fff'};border:1px solid ${_clEb[item]?'#bbf7d0':'#e5e7eb'};pointer-events:none;"><input type="checkbox" ${_clEb[item]?'checked':''} disabled><span style="${_clEb[item]?'text-decoration:line-through;color:#6b7280;':''}">${_itemLabelsEb[item]}</span>${_fmtEb(_clEb[item])}</label>`).join('')}
                   </div>
               </div>
               <div style="margin-top: 1rem; border-top: 1px solid #eee; padding-top: 1rem;">
                   ${order.is_internal
                       ? `<div style="padding:0.6rem 0.75rem; background:#eff6ff; border:1px solid #bfdbfe; border-radius:6px; margin-bottom:0.75rem; font-size:0.9rem; color:#1d4ed8;">
                              🏢 Serviço interno — assinatura não necessária
                          </div>
                          <div id="conclude-form" style="display:flex; gap:0.5rem; flex-direction:column">
                               ${dispatchHtml}
                              <button type="button" id="conclude-btn" class="btn btn-success">📦 Finalizar Pedido</button>
                          </div>`
                       : `<p style="margin-bottom:0.5rem"><b>Entrega:</b> Colete a assinatura e anexe a foto.</p>
                          <div id="conclude-form" style="display:flex; gap:0.5rem; flex-direction:column">
                              <input type="file" id="pickup-photo" accept="image/*">
                               ${dispatchHtml}
                              <button type="button" id="conclude-btn" class="btn btn-success">📦 Finalizar Pedido</button>
                          </div>`
                   }
               </div>
            `;
        } else if (order.status === 'finalizado' && order.pickup_photo) {
            const _clFin = order.checklist || {};
            const _itemsFin = ['arte', 'impressao', 'corte', 'embalagem'];
            const _labelsFin = { arte: 'Arte', impressao: 'Impressão', corte: 'Corte', embalagem: 'Embalagem' };
            const _doneFin = _itemsFin.filter(i => _clFin[i]).length;
            const _pctFin = Math.round((_doneFin / _itemsFin.length) * 100);
            const _colorFin = _pctFin === 100 ? '#22c55e' : _pctFin >= 50 ? '#f59e0b' : '#ef4444';
            const _fmtFin = (val) => {
                if (!val || val === true) return '';
                try { const d = window.parseDBDate(val); return `<span style="font-size:0.75rem;color:#6b7280;margin-left:auto;">✅ ${d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })} ${d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}</span>`; } catch { return ''; }
            };
            actions = `
               <div style="margin-top:1rem; padding:0.75rem; background:#f9fafb; border-radius:8px; border:1px solid #e5e7eb">
                   <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:0.75rem;">
                       <div style="width:48px;height:48px;border-radius:50%;background:conic-gradient(${_colorFin} ${_pctFin*3.6}deg,#e5e7eb ${_pctFin*3.6}deg);flex-shrink:0;display:flex;align-items:center;justify-content:center;">
                           <div style="width:30px;height:30px;border-radius:50%;background:#f9fafb;display:flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:700;color:${_colorFin};">${_pctFin}%</div>
                       </div>
                       <div><h4 style="margin:0;font-size:14px;">Checklist de Produção</h4><small style="color:#666;">${_doneFin}/${_itemsFin.length} etapas concluídas</small></div>
                   </div>
                   <div style="display:flex;flex-direction:column;gap:0.4rem">
                       ${_itemsFin.map(item => `<label style="display:flex;align-items:center;gap:0.5rem;font-size:14px;padding:0.3rem 0.4rem;border-radius:6px;background:${_clFin[item]?'#f0fdf4':'#fff'};border:1px solid ${_clFin[item]?'#bbf7d0':'#e5e7eb'};pointer-events:none;"><input type="checkbox" ${_clFin[item]?'checked':''} disabled><span style="${_clFin[item]?'text-decoration:line-through;color:#6b7280;':''}">${_labelsFin[item]}</span>${_fmtFin(_clFin[item])}</label>`).join('')}
                   </div>
               </div>
               <div style="margin-top: 1rem; border-top: 1px solid #eee; padding-top: 1rem;">
                   <p><b>Entregue.</b> <a href="/uploads/${order.pickup_photo}" target="_blank">Ver comprovante</a></p>
                   ${currentUserRole === 'master' ? '<button class="btn btn-archive" style="margin-top:0.5rem;background:#f1f5f9;color:#475569;border:1px solid #cbd5e1;width:100%;">📁 Arquivar Pedido</button>' : ''}
               </div>
            `;
        } else if (order.status === 'finalizado') {
            const _clFin2 = order.checklist || {};
            const _itemsFin2 = ['arte', 'impressao', 'corte', 'embalagem'];
            const _labelsFin2 = { arte: 'Arte', impressao: 'Impressão', corte: 'Corte', embalagem: 'Embalagem' };
            const _doneFin2 = _itemsFin2.filter(i => _clFin2[i]).length;
            const _pctFin2 = Math.round((_doneFin2 / _itemsFin2.length) * 100);
            const _colorFin2 = _pctFin2 === 100 ? '#22c55e' : _pctFin2 >= 50 ? '#f59e0b' : '#ef4444';
            const _fmtFin2 = (val) => {
                if (!val || val === true) return '';
                try { const d = window.parseDBDate(val); return `<span style="font-size:0.75rem;color:#6b7280;margin-left:auto;">✅ ${d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })} ${d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}</span>`; } catch { return ''; }
            };
            actions = `
               <div style="margin-top:1rem; padding:0.75rem; background:#f9fafb; border-radius:8px; border:1px solid #e5e7eb">
                   <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:0.75rem;">
                       <div style="width:48px;height:48px;border-radius:50%;background:conic-gradient(${_colorFin2} ${_pctFin2*3.6}deg,#e5e7eb ${_pctFin2*3.6}deg);flex-shrink:0;display:flex;align-items:center;justify-content:center;">
                           <div style="width:30px;height:30px;border-radius:50%;background:#f9fafb;display:flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:700;color:${_colorFin2};">${_pctFin2}%</div>
                       </div>
                       <div><h4 style="margin:0;font-size:14px;">Checklist de Produção</h4><small style="color:#666;">${_doneFin2}/${_itemsFin2.length} etapas concluídas</small></div>
                   </div>
                   <div style="display:flex;flex-direction:column;gap:0.4rem">
                       ${_itemsFin2.map(item => `<label style="display:flex;align-items:center;gap:0.5rem;font-size:14px;padding:0.3rem 0.4rem;border-radius:6px;background:${_clFin2[item]?'#f0fdf4':'#fff'};border:1px solid ${_clFin2[item]?'#bbf7d0':'#e5e7eb'};pointer-events:none;"><input type="checkbox" ${_clFin2[item]?'checked':''} disabled><span style="${_clFin2[item]?'text-decoration:line-through;color:#6b7280;':''}">${_labelsFin2[item]}</span>${_fmtFin2(_clFin2[item])}</label>`).join('')}
                   </div>
               </div>
            `;
        }

        // Style modal golden border for loyalty orders
        const _detailModal = container.querySelector('#detail-modal');
        const _detailModalInner = _detailModal && _detailModal.querySelector('.modal');
        if (_detailModalInner) {
            if (order.is_priority) {
                _detailModalInner.style.borderTop = '4px solid #f59e0b';
                _detailModalInner.style.boxShadow = '0 20px 60px rgba(245,158,11,0.25), 0 4px 20px rgba(0,0,0,0.1)';
            } else {
                _detailModalInner.style.borderTop = '';
                _detailModalInner.style.boxShadow = '';
            }
        }

        content.innerHTML = `
            ${order.is_priority ? `<div style="background:linear-gradient(90deg,#f59e0b,#d97706); color:#fff; font-size:0.8rem; font-weight:900; letter-spacing:0.08em; padding:8px 16px; border-radius:8px; margin-bottom:1.25rem; display:flex; align-items:center; gap:8px;">⭐ CLIENTE FIDELIDADE — ATENDIMENTO PRIORITÁRIO — PRAZO: 1 DIA</div>` : ""}
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.5rem; gap: 1rem; flex-wrap: wrap;">
                <div style="flex:1;">
                     <div style="font-size:0.8rem; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.25rem;">👤 Cliente</div>
                     <div style="font-size:1.4rem; font-weight:800; color:var(--primary); line-height:1.2;">${order.client_name}</div>
                     ${order.client_phone ? `<div style="font-size:0.95rem; font-weight:600; color:#64748b; margin-top:0.25rem;">📞 ${order.client_phone}</div>` : ''}
                </div>
                <div style="display:flex; gap:0.5rem; flex-wrap: wrap;">
                    <button class="btn btn-secondary btn-reprint" title="Reimprimir Notinha" style="padding:0.5rem 0.85rem; border-radius:12px; background:#fff; border:1px solid #e2e8f0; color:#475569; font-size:0.85rem; font-weight:800; box-shadow:0 2px 8px rgba(0,0,0,0.03); transition:all 0.2s;">
                        🖨️ Notinha
                    </button>
                    <button class="btn btn-secondary btn-nf" title="Copiar Dados Nota Fiscal" style="padding:0.5rem 0.85rem; border-radius:12px; background:#fff; border:1px solid #e2e8f0; color:#475569; font-size:0.85rem; font-weight:800; box-shadow:0 2px 8px rgba(0,0,0,0.03); transition:all 0.2s;">
                        📄 Notas
                    </button>
                    <button class="btn btn-primary btn-whatsapp" title="Copiar para WhatsApp" style="padding:0.5rem 1rem; border-radius:12px; font-size:0.85rem; font-weight:800; box-shadow:0 4px 15px rgba(139,92,246,0.3);">
                        📱 Copiar WPP
                    </button>
                </div>
            </div>

            <div style="display:grid; grid-template-columns: 1fr; gap:1.25rem; margin-bottom:1.5rem;">
                <div style="background: rgba(139, 92, 246, 0.04); border: 1px solid rgba(139, 92, 246, 0.15); border-left: 4px solid var(--primary); padding: 1.25rem; border-radius: 16px;">
                    <span style="font-size: 0.8rem; font-weight: 800; color: var(--primary); text-transform: uppercase; letter-spacing: 0.05em; display:block; margin-bottom:0.5rem;">📦 Produtos do Pedido</span>
                    <div style="white-space:pre-line; color: #1e1b4b; font-size: 1.05rem; font-weight: 600; line-height: 1.5;">${order.product_name}</div>
                </div>
                
                ${order.description ? `
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 1.25rem; border-radius: 16px;">
                    <span style="font-size: 0.8rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; display:block; margin-bottom:0.5rem;">📝 Descrição / Observações</span>
                    <div style="white-space:pre-wrap; color: #334155; font-size: 0.95rem; line-height: 1.6; font-weight:500;">${order.description}</div>
                </div>` : ''}
            </div>

            ${order.attachments ? `<div class="form-group"><label>📎 Anexos:</label>
                <div style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-top:0.25rem;">
                    ${order.attachments.split(',').filter(f => f).map(f => {
                        const ext = f.split('.').pop().toLowerCase();
                        const isImg = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'jfif', 'avif'].includes(ext);
                        if (isImg) {
                            return `<a href="/uploads/${f}" target="_blank">
                                <img src="/uploads/${f}" 
                                     style="width:70px;height:70px;object-fit:cover;border-radius:6px;border:1px solid #ccc;cursor:pointer;" 
                                     title="${f}"
                                     onerror="this.onerror=null; this.outerHTML='<div style=\'width:70px;height:70px;background:#fee2e2;color:#b91c1c;font-size:10px;display:flex;align-items:center;justify-content:center;text-align:center;border-radius:6px;padding:4px;border:1px solid #fca5a5;\'>Erro:<br>'+this.src.split(\'/\').pop()+'</div>';">
                            </a>`;
                        } else if (ext === 'pdf') {
                            return `<a href="/uploads/${f}" target="_blank" style="background:#fee2e2;color:#b91c1c;border-radius:6px;padding:4px 10px;font-size:0.8rem;text-decoration:none;display:inline-flex;align-items:center;gap:4px;border:1px solid #fca5a5;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2z"/><path d="M4.603 12.087a.81.81 0 0 1-.438-.42c-.195-.388-.13-.776.08-1.102.166-.26.464-.453.81-.547.382-.103.882-.101 1.487-.042a22.428 22.428 0 0 0 1.25-.972c.42-.394.757-.768 1.012-1.121.284-.394.46-.782.512-1.149.057-.417-.05-.826-.35-1.134-.14-.14-.354-.236-.63-.236-.341 0-.622.18-.767.436-.145.256-.168.614-.066 1.054.102.44.34 1.01.68 1.637.13.238.254.465.373.682a20.086 20.086 0 0 0-.623 1.157c-.201.394-.413.82-.628 1.258a12.83 12.83 0 0 0-1.22 2.613c-.09.344-.145.695-.145 1.026 0 .428.188.756.495.93.18.101.402.146.64.146.42 0 .84-.188 1.096-.549.255-.362.338-.853.303-1.428a11.192 11.192 0 0 0-.156-1.572 26.155 26.155 0 0 0 1.583-2.916c.353-.7.643-1.411.83-2.112.188-.701.272-1.37.218-1.996C11.517 4.542 11.1 4 10.334 4c-.752 0-1.189.513-1.298 1.173-.105.626.044 1.343.376 2.052.28 0 .584.227.812.434.227.206.368.423.425.641.057.218.06.438.01.658-.05.22-.165.437-.341.636-.208.234-.51.464-.848.653-.339.189-.728.326-1.154.398-.246-.017-.506-.03-.78-.03-.382 0-.802.025-1.25.074a22.254 22.254 0 0 1-1.077 1.488c-.347.45-.668.857-.96 1.19-.292.333-.538.604-.737.81-.19.196-.341.34-.442.443zm3.504-2.883l-.004-.001c.145-.145.3-.284.46-.418.14-.117.288-.233.447-.35-.285.503-.54.996-.757 1.506-.002-1.34e-4-.004-.004-.006-.007a16.892 16.892 0 0 1-.14-.731z"/></svg> 
                                PDF
                            </a>`;
                        } else if (['cdr', 'eps', 'ai'].includes(ext)) {
                            return `<a href="/uploads/${f}" target="_blank" style="background:#fff7ed;color:#c2410c;border-radius:6px;padding:4px 10px;font-size:0.8rem;text-decoration:none;display:inline-flex;align-items:center;gap:4px;border:1px solid #fdba74;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg> 
                                VECTOR
                            </a>`;
                        } else {
                            return `<a href="/uploads/${f}" target="_blank" style="background:#f1f5f9;color:#475569;border-radius:6px;padding:4px 10px;font-size:0.8rem;text-decoration:none;display:inline-flex;align-items:center;gap:4px;border:1px solid #cbd5e1;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> 
                                DOC
                            </a>`;
                        }
                    }).join('')}
                </div>
            </div>` : ''}
            <div style="display:flex; gap:1rem; flex-wrap:wrap; margin-bottom:1.5rem;">
                <div style="flex:1; background: #fff; border: 1px solid #e2e8f0; padding: 1.25rem; border-radius: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); display:flex; flex-direction:column; justify-content:center;">
                    <span style="font-size: 0.75rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Pagamento</span>
                    <div style="font-size:1.1rem; font-weight:800; color:#1d4ed8; margin-top:0.25rem;">💳 ${order.payment_method}</div>
                </div>
                ${order.discount_value > 0 ? `
                <div style="flex:1; background: #fef2f2; border: 1px solid #fecaca; padding: 1.25rem; border-radius: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); display:flex; flex-direction:column; justify-content:center;">
                    <span style="font-size: 0.75rem; font-weight: 800; color: #ef4444; text-transform: uppercase; letter-spacing: 0.05em;">Desconto</span>
                    <div style="font-size:1.1rem; font-weight:800; color:#b91c1c; margin-top:0.25rem;">- R$ ${order.discount_value.toFixed(2)}</div>
                </div>` : ''}
                <div style="flex:1.5; background: linear-gradient(135deg, #4c1d95, var(--primary)); padding: 1.25rem; border-radius: 16px; box-shadow: 0 8px 20px rgba(139, 92, 246, 0.3); color: white; display:flex; flex-direction:column; justify-content:center;">
                    <span style="font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.8;">Valor Final</span>
                    <div style="font-size:1.8rem; font-weight:800; margin-top:0.25rem; letter-spacing:-0.02em;">R$ ${order.total_value}</div>
                </div>
            </div>

            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; background: #f8fafc; padding: 1.25rem; border-radius: 16px; border: 1px solid #e2e8f0;">
                <div>
                    <span style="font-size: 0.75rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; display:block; margin-bottom:0.25rem;">📅 Lançamento</span>
                    <div style="font-weight:700; color:#334155;">${window.parseDBDate(order.created_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })} às ${window.parseDBDate(order.created_at).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                ${order.deadline_at ? `
                <div>
                    <span style="font-size: 0.75rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; display:block; margin-bottom:0.25rem;">🚀 Entrega (${order.deadline_type || 'Prazo'})</span>
                    <div style="font-weight:800; color:#059669;">${window.parseDBDate(order.deadline_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })} às ${window.parseDBDate(order.deadline_at).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}</div>
                </div>` : ''}
                ${order.has_terceirizado && order.total_estimated_time ? `
                <div>
                    <span style="font-size: 0.75rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; display:block; margin-bottom:0.25rem;">🏭 Prazo Terceirizado</span>
                    <div style="font-weight:800; color:#1d4ed8; background:#eff6ff; padding:2px 8px; border-radius:6px; display:inline-block;">${order.total_estimated_time} dia${order.total_estimated_time == 1 ? '' : 's'} úteis</div>
                </div>` : ''}
            </div>
            ${actions}
            <div style="margin-top: 1rem; border-top: 1px solid #eee; padding-top: 1rem;">
                <label style="font-weight:600; color:#555; display:block; margin-bottom:0.4rem;">📂 Caminho do Pedido</label>
                <div style="display:flex; gap:0.5rem; align-items:center;">
                    <input type="text" id="order-file-path" value="${(order.file_path || '').replace(/"/g, '&quot;')}" placeholder="Ex: C:\\Clientes\\João\\Pedido123" style="flex:1; padding:0.5rem; border:1px solid #ccc; border-radius:4px; font-size:0.9rem;">
                    <button class="btn btn-secondary btn-save-path" style="width:auto; padding:0.5rem 0.75rem; font-size:0.85rem;" title="Salvar caminho">💾</button>
                    <button class="btn btn-primary btn-open-folder" style="width:auto; padding:0.5rem 0.75rem; font-size:0.85rem;" ${order.file_path ? '' : 'disabled'} title="Abrir pasta">📁 Abrir</button>
                </div>
            </div>
            ${currentUserRole === 'master' ? `<div style="margin-top: 1rem; border-top: 1px solid #eee; padding-top: 1rem;">
                <button class="btn btn-delete-order" style="background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5; padding:0.4rem 1rem; border-radius:4px; cursor:pointer; font-size:0.85rem;">🗑️ Excluir Pedido</button>
            </div>` : ''}
        `;

        // Save file path
        content.querySelector('.btn-save-path').onclick = async () => {
            const pathInput = content.querySelector('#order-file-path');
            const filePath = pathInput.value.trim();
            await fetch(`/api/orders/${order.id}/file-path`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ file_path: filePath })
            });
            order.file_path = filePath;
            content.querySelector('.btn-open-folder').disabled = !filePath;
            content.querySelector('.btn-save-path').textContent = '✅';
            setTimeout(() => content.querySelector('.btn-save-path').textContent = '💾', 1500);
        };

        // Open folder in Explorer
        content.querySelector('.btn-open-folder').onclick = async () => {
            const filePath = content.querySelector('#order-file-path').value.trim();
            if (!filePath) return;
            await fetch('/api/orders/open-folder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ file_path: filePath })
            });
        };

        // Delete Order
        const deleteBtn = content.querySelector('.btn-delete-order');
        if (deleteBtn) {
            deleteBtn.onclick = async () => {
                if (!confirm('Tem certeza que deseja excluir este pedido? Esta ação não pode ser desfeita.')) return;
                try {
                    const res = await fetch(`/api/orders/${order.id}`, { method: 'DELETE' });
                    if (res.ok) {
                        modal.classList.remove('open');
                        loadOrders();
                    } else {
                        alert('Erro ao excluir pedido');
                    }
                } catch (err) {
                    alert('Erro de conexão: ' + err.message);
                }
            };
        }

        // Reprint Notinha
        const reprintBtn = content.querySelector('.btn-reprint');
        if (reprintBtn) {
            reprintBtn.onclick = () => printLabel(order);
        }

        // Nota Fiscal Copy
        content.querySelector('.btn-nf').onclick = () => {
            const getAddressString = () => {
                const parts = [];
                if (order.client_address) parts.push(order.client_address);
                if (order.client_city) parts.push(order.client_city + (order.client_state ? ' - ' + order.client_state : ''));
                if (order.client_zip_code) parts.push('CEP: ' + order.client_zip_code);
                return parts.length > 0 ? parts.join(', ') : '';
            };
            const addr = getAddressString();
            const itemsFormatted = order.product_name.replace(/, /g, '\n- ');
            
            const text = `*DADOS PARA NOTA FISCAL*\n` +
                `*Cliente:* ${order.client_name || '-'}\n` +
                `*CPF/CNPJ:* ${order.client_cpf || ''}\n` +
                `*Endereço:* ${addr}\n` +
                `*Valor Total:* R$ ${(order.total_value || 0).toFixed(2)}\n` +
                `*Itens:*\n - ${itemsFormatted}`;

            window.copyTextToClipboard(text).then(() => {
                alert('Dados para Nota Fiscal copiados!');
            });
        };

        // WhatsApp Copy
        content.querySelector('.btn-whatsapp').onclick = () => {
            // Transform summary comma separated to new lines for whatsapp
            const itemsFormatted = order.product_name.replace(/, /g, '\n- ');

            const text = `* Pedido #${getOrderNum(order)} *\n` +
                `* Data:* ${window.parseDBDate(order.created_at).toLocaleString()}\n` +
                `* Cliente:* ${order.client_name}\n` +
                `* Itens:*\n - ${itemsFormatted}\n` +
                `* Valor:* R$ ${order.total_value}\n` +
                `* Status:* ${order.status.replace('_', ' ').toUpperCase()}\n` +
                `* Pagamento:* ${order.payment_method}`;

            window.copyTextToClipboard(text).then(() => {
                alert('Copiado para o WhatsApp!');
            });
        };

        // Attach Action Events
        if (order.status === 'aguardando_aceite') {
            const acceptBtn = content.querySelector('.btn-accept');
            if (acceptBtn && !acceptBtn.disabled) {
                acceptBtn.onclick = async () => {
                    try {
                        const res = await fetch(`/api/orders/${order.id}/accept`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({})
                        });
                        if (!res.ok) {
                            const err = await res.json();
                            alert(err.error || 'Erro ao aceitar pedido');
                            return;
                        }
                        modal.classList.remove('open');
                        loadOrders();
                    } catch (err) {
                        alert('Erro de conexão: ' + err.message);
                    }
                };
            }
        } else if (order.status === 'producao') {
            // Checklist Logic with timestamp tracking
            const checklistItems = ['arte', 'impressao', 'corte', 'embalagem'];
            const itemLabelsMap = { arte: 'Arte', impressao: 'Impressão', corte: 'Corte', embalagem: 'Embalagem' };

            if (isVendedor) {
                // Vendedor sees read-only checklist: disable all checkboxes
                content.querySelectorAll('.checklist-item').forEach(chk => {
                    chk.disabled = true;
                    chk.style.pointerEvents = 'none';
                });
            } else {
            const updatePieChart = () => {
                const cl = order.checklist || {};
                const done = checklistItems.filter(i => cl[i]).length;
                const pct = Math.round((done / checklistItems.length) * 100);
                const color = pct === 100 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
                const pie = content.querySelector('#checklist-pie');
                if (pie) {
                    pie.style.background = `conic-gradient(${color} ${pct * 3.6}deg, #e5e7eb ${pct * 3.6}deg)`;
                    pie.querySelector('div').textContent = pct + '%';
                    pie.querySelector('div').style.color = color;
                }
                const countEl = content.querySelector('.checklist-section small');
                if (countEl) countEl.textContent = `${done}/${checklistItems.length} etapas concluídas`;
            };

            content.querySelectorAll('.checklist-item').forEach(chk => {
                chk.onchange = async () => {
                    if (!order.checklist) order.checklist = {};
                    // Store timestamp when checked, false when unchecked
                    order.checklist[chk.dataset.item] = chk.checked ? new Date().toISOString() : false;

                    // Update label styling and date
                    const label = chk.closest('label');
                    const nameSpan = label.querySelector('span');
                    const existingDate = label.querySelector('.check-date');
                    if (existingDate) existingDate.remove();

                    if (chk.checked) {
                        label.style.background = '#f0fdf4';
                        label.style.borderColor = '#bbf7d0';
                        nameSpan.style.textDecoration = 'line-through';
                        nameSpan.style.color = '#6b7280';
                        const d = new Date();
                        const dateSpan = document.createElement('span');
                        dateSpan.className = 'check-date';
                        dateSpan.style.cssText = 'font-size:0.75rem; color:#6b7280; margin-left:auto;';
                        dateSpan.textContent = `✅ ${d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })} ${d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}`;
                        label.appendChild(dateSpan);
                    } else {
                        label.style.background = '#fff';
                        label.style.borderColor = '#e5e7eb';
                        nameSpan.style.textDecoration = 'none';
                        nameSpan.style.color = '';
                    }

                    // Update pie chart
                    updatePieChart();

                    // Check all
                    const allChecked = checklistItems.every(i => order.checklist[i]);
                    const btn = content.querySelector('.btn-finalize');
                    btn.disabled = !allChecked;
                    if (!allChecked) btn.title = "Conclua o checklist antes";
                    else btn.title = "";

                    await fetch(`/api/orders/${order.id}/checklist`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ checklist: order.checklist })
                    });

                    // Update pie chart on the kanban card (live, no reload)
                    const cardEl = container.querySelector(`.card[data-order-id="${order.id}"]`);
                    if (cardEl) {
                        const cl2 = order.checklist || {};
                        const done2 = checklistItems.filter(i => cl2[i]).length;
                        const pct2 = Math.round((done2 / checklistItems.length) * 100);
                        const color2 = pct2 === 100 ? '#22c55e' : pct2 >= 50 ? '#f59e0b' : '#ef4444';
                        // Find or create pie element on the card
                        let cardPieWrap = cardEl.querySelector('.card-pie-wrap');
                        if (!cardPieWrap) {
                            cardPieWrap = document.createElement('div');
                            cardPieWrap.className = 'card-pie-wrap';
                            cardPieWrap.style.cssText = 'display:flex; align-items:center; gap:6px; margin-top:6px;';
                            cardPieWrap.innerHTML = `<div class="card-pie-circle" style="width:28px;height:28px;border-radius:50%;flex-shrink:0;"></div><span class="card-pie-text" style="font-size:0.78rem;font-weight:600;"></span>`;
                            // Insert before card-footer
                            const footer = cardEl.querySelector('.card-footer');
                            if (footer) cardEl.insertBefore(cardPieWrap, footer);
                            else cardEl.appendChild(cardPieWrap);
                        }
                        const circle = cardPieWrap.querySelector('.card-pie-circle');
                        const text = cardPieWrap.querySelector('.card-pie-text');
                        circle.style.background = `conic-gradient(${color2} ${pct2 * 3.6}deg, #e5e7eb ${pct2 * 3.6}deg)`;
                        text.style.color = color2;
                        text.textContent = `${done2}/${checklistItems.length} (${pct2}%)`;
                    }
                };
            });

            content.querySelector('.btn-finalize').onclick = async () => {
                currentFinalizeOrder = order;
                modal.classList.remove('open');

                // Fetch order items
                const itemsRes = await fetch(`/api/orders/${order.id}/items`);
                const { data: items } = await itemsRes.json();

                const listDiv = container.querySelector('#finalize-items-list');
                listDiv.innerHTML = `
                    <table style="width:100%; border-collapse:collapse; font-size:0.9rem">
                        <thead style="background:#f1f5f9">
                            <tr>
                                <th style="padding:6px; text-align:left">Produto</th>
                                <th style="padding:6px; text-align:center">Qtd Pedida</th>
                                <th style="padding:6px; text-align:center">Qtd Gasta</th>
                                <th style="padding:6px; text-align:center">Perda</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map((item, i) => `
                                <tr>
                                    <td style="padding:6px"><b>${item.product_name}</b>${item.color_name ? `<br><small style="color:#92400e;background:#fef3c7;padding:1px 6px;border-radius:10px;font-size:0.75rem;">🎨 ${item.color_name}</small>` : ''}</td>
                                    <td style="padding:6px; text-align:center; background:#f0fdf4">${item.quantity}</td>
                                    <td style="padding:6px; text-align:center">
                                        <input type="number" class="finalize-used-input" data-index="${i}" data-ordered="${item.quantity}" data-product-id="${item.product_id}" data-color-variant-id="${item.color_variant_id || ''}" data-color-name="${item.color_name || ''}" value="${item.quantity}" min="0" style="width:70px; text-align:center; padding:4px; border:1px solid #ccc; border-radius:4px;">
                                    </td>
                                    <td style="padding:6px; text-align:center; font-weight:bold" class="loss-cell" data-index="${i}">0</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;

                // Bind loss detection
                const lossGroup = container.querySelector('#loss-group');
                listDiv.querySelectorAll('.finalize-used-input').forEach(input => {
                    input.oninput = () => {
                        const ordered = parseInt(input.dataset.ordered);
                        const used = input.value !== '' ? parseInt(input.value) : ordered;
                        const loss = Math.max(0, used - ordered);
                        const cell = listDiv.querySelector(`.loss-cell[data-index="${input.dataset.index}"]`);
                        cell.textContent = loss;
                        cell.style.color = loss > 0 ? '#b91c1c' : '#888';

                        // Show/hide loss justification
                        const anyLoss = [...listDiv.querySelectorAll('.finalize-used-input')].some(inp => {
                            return (parseInt(inp.value) || 0) > parseInt(inp.dataset.ordered);
                        });
                        lossGroup.style.display = anyLoss ? 'block' : 'none';
                    };
                });

                lossGroup.style.display = 'none';
                container.querySelector('#finalize-loss-justification').value = '';
                finalizeModal.classList.add('open');
            };
            } // end else (!isVendedor) for producao
        } else if (order.status === 'em_balcao') {
            // Wire dispatch radio buttons behavior
            const dispatchRadios = content.querySelectorAll('input[name="dispatch_carrier"]');
            const optionsContainer = content.querySelector('#dispatch-options-container');
            const amountWrapper = content.querySelector('#dispatch-amount-wrapper');
            const otherWrapper = content.querySelector('#dispatch-other-name-wrapper');
            const amountInput = content.querySelector('#dispatch-amount');

            dispatchRadios.forEach(r => {
                r.addEventListener('change', () => {
                    if (!r.value) {
                        if (optionsContainer) optionsContainer.style.display = 'none';
                    } else {
                        if (optionsContainer) optionsContainer.style.display = 'flex';
                        if (amountWrapper) amountWrapper.style.display = 'flex';
                        if (otherWrapper) otherWrapper.style.display = r.value === 'OUTRO' ? 'flex' : 'none';
                        if (amountInput) {
                            if (r.value === 'UNIDA') amountInput.value = '55.00';
                            else amountInput.value = '';
                        }
                    }
                    content.querySelectorAll('input[name="dispatch_carrier"]').forEach(rb => {
                        const lbl = rb.closest('label');
                        if (lbl) lbl.style.borderColor = (rb.checked && rb.value) ? '#f59e0b' : '#e5e7eb';
                    });
                });
            });

            const concludeBtn = content.querySelector('#conclude-btn');
            console.log('[CONCLUDE DEBUG] concludeBtn:', concludeBtn, 'Order:', order.id);
            if (!concludeBtn) {
                console.error('[CONCLUDE] #conclude-btn nao encontrado!');
            } else {
                concludeBtn.onclick = async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('[CONCLUDE] Clicado! Order ID:', order.id);

                    concludeBtn.disabled = true;
                    concludeBtn.textContent = '⏳ Finalizando...';

                    const selectedCarrier = content.querySelector('input[name="dispatch_carrier"]:checked');
                    const carrierName = selectedCarrier && selectedCarrier.value
                        ? (selectedCarrier.value === 'OUTRO'
                            ? (content.querySelector('#dispatch-other-name')?.value || 'OUTRO')
                            : selectedCarrier.value)
                        : null;
                    const dispatchAmt = parseFloat(content.querySelector('#dispatch-amount')?.value || '0');

                    try {
                        const res = await fetch('/api/orders/' + order.id + '/conclude-simple', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ carrier: carrierName, dispatch_amount: dispatchAmt || 0 })
                        });

                        if (!res.ok) {
                            const errText = await res.text();
                            alert('Erro ao finalizar pedido: ' + errText);
                            concludeBtn.disabled = false;
                            concludeBtn.textContent = '📦 Finalizar Pedido';
                            return;
                        }

                        const json = await res.json();
                        console.log('[CONCLUDE] Sucesso:', json);
                        modal.classList.remove('open');

                        // Atualização imediata do card no board
                        const cardEl = container.querySelector('.card[data-order-id="' + order.id + '"]');
                        if (cardEl) {
                            const targetCol = container.querySelector('#col-finalizado .column-content');
                            if (targetCol) targetCol.appendChild(cardEl);
                            cardEl.className = cardEl.className.replace(/status-\w+/, 'status-finalizado');
                            const badge = cardEl.querySelector('.card-badge');
                            if (badge) {
                                badge.textContent = 'Finalizado';
                                badge.style.background = '#f0fdf4';
                                badge.style.color = '#16a34a';
                            }
                        }

                        loadOrders();
                    } catch (err) {
                        console.error('[CONCLUDE] Erro:', err);
                        alert('Erro de conexao: ' + err.message);
                        concludeBtn.disabled = false;
                        concludeBtn.textContent = '📦 Finalizar Pedido';
                    }
                };
            }
        }

        // Archive button (for finalized orders)
        const archiveBtn = content.querySelector('.btn-archive');
        if (archiveBtn) {
            archiveBtn.onclick = async () => {
                if (!confirm('Arquivar este pedido?')) return;
                await fetch(`/api/orders/${order.id}/archive`, { method: 'PUT' });
                modal.classList.remove('open');
                loadOrders();
            };
        }

        // Load Comments
        loadComments(order.id);

        // Setup Comment Form
        const commentForm = container.querySelector('#comment-form');
        commentForm.onsubmit = async (e) => {
            e.preventDefault();
            const msg = container.querySelector('#comment-input').value;
            await fetch(`/api/orders/${order.id}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: user.id, message: msg })
            });
            container.querySelector('#comment-input').value = '';
            loadComments(order.id);
        };

        // Remove legacy (i) info icon from comments header (fix for browser cache)
        const commentsH4 = container.querySelector('.comments-section h4');
        if (commentsH4) {
            commentsH4.querySelectorAll('span').forEach(s => s.remove());
            commentsH4.textContent = 'Comentários';
        }

        modal.classList.add('open');
    };

    const loadComments = async (orderId) => {
        const res = await fetch(`/api/orders/${orderId}/comments`);
        const { data } = await res.json();
        const list = container.querySelector('#comments-list');
        list.innerHTML = data.map(c => `
            <div class="comment">
                <span class="comment-author">${c.user_name}</span>
                <span class="comment-time">${window.parseDBDate(c.created_at).toLocaleString()}</span>
                <div class="comment-text">${c.message}</div>
            </div>
        `).join('');
    };

    // CART SYSTEM — only for users who can create orders
    let cart = [];
    const cartTbody = container.querySelector('#cart-tbody');
    const totalInput = container.querySelector('#cart-total-input');
    const totalAutoLabel = container.querySelector('#cart-total-auto');
    const createBtn = container.querySelector('#btn-create-order');
    const hasOrderForm = !!cartTbody;

    const getDeadline = () => {
        const checked = container.querySelector('input[name="deadline_option"]:checked');
        return checked ? checked.value : '3D';
    };

    const isInternalMode = () => !!(container.querySelector('#internal-toggle') && container.querySelector('#internal-toggle').checked);

    const PULSEIRA_DEFAULT_PRICE = 0.20;

    const getProductPrice = (product) => {
        // Internal service: always use unit_cost
        if (isInternalMode()) return parseFloat(product.unit_cost) || 0;
        const type = getDeadline();
        const p1 = parseFloat(product.price_1_day) || 0;
        const p3 = parseFloat(product.price_3_days) || parseFloat(product.price) || 0;
        // Pulseiras: fallback de R$ 0,20 se sem preço definido
        const isPulseira = isPulseiraProd ? isPulseiraProd(product) : (product.type || '').toLowerCase().includes('pulseira');
        const p3Final = (p3 === 0 && isPulseira) ? PULSEIRA_DEFAULT_PRICE : p3;
        const finalP1 = p1 > 0 ? p1 : (p3Final * 1.5); // Fallback
        return type === '1D' ? finalP1 : p3Final;
    };

    const renderCart = () => {
        if (!hasOrderForm) return;
        const orderDeadline = getDeadline().toLowerCase();
        const tbody = container.querySelector('#cart-tbody');
        if (cart.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:1.5rem; color:#94a3b8">Nenhum item adicionado</td></tr>';
            createBtn.disabled = true;
            if (totalInput) {
                totalInput.value = '';
                totalInput.dataset.baseTotal = '0.00';
            }
            if (totalAutoLabel) totalAutoLabel.textContent = '';
            return;
        }
        createBtn.disabled = false;

        tbody.innerHTML = cart.map((item, i) => {
            let sub = 0;
            let displayRow = '';
            
            if (item.is_kit) {
                sub = item.unit_price * item.qty;
                displayRow = `
                    <tr style="border-bottom: 1px solid #f1f5f9; background:#eff6ff;">
                        <td style="padding: 8px;">
                            <b style="color:#1d4ed8;">📦 Kit: ${item.product.name} — ${item.kit_template.name}</b>
                            <div style="padding-left:10px; margin-top:4px; font-size:0.75rem; color:#475569; border-left:2px solid #93c5fd;">
                                ${(item.kit_items||[]).map(k => `${k.current_qty}x ${k.product_name}`).join('<br>')}
                            </div>
                        </td>
                        <td style="padding: 8px; text-align:center; vertical-align:top;">${item.qty}</td>
                        <td style="padding: 8px; text-align:right; vertical-align:top; font-weight:bold; color:#1d4ed8;">R$ ${sub.toFixed(2).replace('.',',')}</td>
                        <td style="text-align:center; vertical-align:top;"><button type="button" class="btn-remove-item" data-index="${i}" style="background:none; border:none; color: #ef4444; font-size: 1.2rem; cursor: pointer;" title="Remover">&times;</button></td>
                    </tr>
                `;
            } else {
                let rowP = 0;
                if (item.sem_personalizacao) rowP = PULSEIRA_DEFAULT_PRICE;
                else rowP = parseFloat(orderDeadline === '1d' && !item.product.terceirizado ? item.product.price_1_day : (item.product.price_3_days || item.product.price)) || 0;
                
                sub = rowP * item.qty;
                const tercHtml = item.product.terceirizado ? ' <span style="background:#fef3c7; color:#92400e; padding:1px 6px; border-radius:8px; font-size:0.75em;">🏭 Terc.</span>' : '';
                const isPulseira = isPulseiraProd(item.product);
                const colorHtml = isPulseira ? `<br><small style="color:#92400e;background:#fef3c7;padding:1px 6px;border-radius:10px;font-size:0.75em;">${item.color_name}</small>` : '';

                displayRow = `
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 8px;"><b>${item.product.name}</b>${colorHtml}${tercHtml}</td>
                        <td style="padding: 8px; text-align:center;">${item.qty}</td>
                        <td style="padding: 8px; text-align:right;">R$ ${sub.toFixed(2).replace('.',',')}</td>
                        <td style="text-align:center;"><button type="button" class="btn-remove-item" data-index="${i}" style="background:none; border:none; color: #ef4444; font-size: 1.2rem; cursor: pointer;" title="Remover">&times;</button></td>
                    </tr>
                `;
            }
            
            return displayRow;
        }).join('');

        tbody.querySelectorAll('.btn-remove-item').forEach(btn => {
            btn.onclick = () => {
                cart.splice(parseInt(btn.dataset.index), 1);
                renderCart();
            };
        });

        let total = cart.reduce((acc, item) => {
            if (item.is_kit) return acc + (item.unit_price * item.qty);
            if (item.sem_personalizacao) return acc + (PULSEIRA_DEFAULT_PRICE * item.qty);
            const p = parseFloat(orderDeadline === '1d' && !item.product.terceirizado ? item.product.price_1_day : (item.product.price_3_days || item.product.price)) || 0;
            return acc + (p * item.qty);
        }, 0);

        const isCostMode = isInternalMode();
        const discountSelect = container.querySelector('#order-discount');

        // Check if selected client is loyalty
        const selectedClientId = container.querySelector('#client-select') && container.querySelector('#client-select').value;
        const clientData = window._kanbanClientsRef ? window._kanbanClientsRef.find(c => c.id == selectedClientId) : null;
        const isLoyaltyClient = !!(clientData && clientData.loyalty_status);
        const loyaltyTier = clientData ? (clientData.loyalty_tier || 'bronze') : 'bronze';

        let discountPct = 0;
        let loyaltyDiscountValue = 0;
        let loyaltyPct = 0.05;
        if (loyaltyTier === 'prata') loyaltyPct = 0.10;
        if (loyaltyTier === 'ouro') loyaltyPct = 0.15;

        if (isLoyaltyClient && !isCostMode) {
            loyaltyDiscountValue = Math.round(total * loyaltyPct * 100) / 100;
        } else if (discountSelect && !isCostMode) {
            discountPct = parseFloat(discountSelect.value || 0);
        }

        const discountValue = isLoyaltyClient ? loyaltyDiscountValue : total * (discountPct / 100);
        const finalTotal = total - discountValue;

        totalInput.dataset.baseTotal = total.toFixed(2);
        totalInput.value = finalTotal.toFixed(2);

        let autoText = '';
        if (total > 0) {
            if (isCostMode) {
                autoText = `💰 Custo total: R$ ${finalTotal.toFixed(2)}`;
            } else if (isLoyaltyClient) {
                autoText = `💰 Bruto: R$ ${total.toFixed(2).replace('.',',')} - Desconto Fidelidade (${Math.round(loyaltyPct*100)}%): - R$ ${loyaltyDiscountValue.toFixed(2).replace('.',',')}`;
            } else {
                autoText = `Sugestão: R$ ${total.toFixed(2)}`;
                if (discountPct > 0) {
                    autoText += ` (- R$ ${discountValue.toFixed(2)})`;
                }
            }
        }
        totalAutoLabel.textContent = autoText;
    };

    // Deadline Toggle -> Recalculate
    container.querySelectorAll('input[name="deadline_option"]').forEach(radio => {
        radio.onchange = renderCart;
    });

    // Discount Toggle -> Recalculate
    const discountEl = container.querySelector('#order-discount');
    if (discountEl) discountEl.addEventListener('change', renderCart);

    // === COLOR SELECTOR FOR PULSEIRAS ===
    const colorSelectContainer = container.querySelector('#color-select-container');
    const colorSelect = container.querySelector('#color-select');

    const isPulseiraProd = (product) => product && (product.type || '').toLowerCase().includes('pulseira');

    const productSelectEl = container.querySelector('#product-select');
    if (productSelectEl) productSelectEl.addEventListener('change', async (e) => {
        const pid = e.target.value;
        if (!pid) {
            colorSelectContainer.style.display = 'none';
            return;
        }
        const product = loadedProducts.find(p => p.id == pid);
        if (!product || !isPulseiraProd(product)) {
            colorSelectContainer.style.display = 'none';
            return;
        }
        // It's a pulseira — load colors
        colorSelectContainer.style.display = 'block';
        // Reset the sem-personalizacao toggle
        const semPersToggle = container.querySelector('#sem-personalizacao');
        const colorSelectWrap = container.querySelector('#color-select-wrap');
        if (semPersToggle) { semPersToggle.checked = false; }
        if (colorSelectWrap) colorSelectWrap.style.display = 'block';
        // Price label for pulseira
        const basePrice = parseFloat(product.price_3_days) || parseFloat(product.price) || 0;
        const displayPrice = basePrice > 0 ? basePrice : PULSEIRA_DEFAULT_PRICE;
        const priceLabelEl = colorSelectContainer.querySelector('#pulseira-price-label');
        if (priceLabelEl) priceLabelEl.innerHTML = `🎨 Selecione a cor da pulseira: <span style="background:#d1fae5; color:#065f46; padding:1px 8px; border-radius:10px; font-size:0.8rem; font-weight:700; margin-left:6px;">R$ ${displayPrice.toFixed(2).replace('.', ',')}/un</span>`;
        // Wire toggle: sem-personalização hides color select
        if (semPersToggle) {
            semPersToggle.onchange = () => {
                if (colorSelectWrap) colorSelectWrap.style.display = semPersToggle.checked ? 'none' : 'block';
                if (priceLabelEl) {
                    priceLabelEl.innerHTML = semPersToggle.checked
                        ? `🎨 Pulseira <span style="background:#fef3c7; color:#c2410c; padding:1px 8px; border-radius:10px; font-size:0.8rem; font-weight:700; margin-left:6px;">R$ 0,20/un — Sem personalização</span>`
                        : `🎨 Selecione a cor da pulseira: <span style="background:#d1fae5; color:#065f46; padding:1px 8px; border-radius:10px; font-size:0.8rem; font-weight:700; margin-left:6px;">R$ ${displayPrice.toFixed(2).replace('.', ',')}/un</span>`;
                }
            };
        }
        colorSelect.innerHTML = '<option value="">Carregando...</option>';
        try {
            const res = await fetch(`/api/products/${pid}/colors`);
            const { data } = await res.json();
            if (data.length === 0) {
                colorSelect.innerHTML = '<option value="">Nenhuma cor cadastrada</option>';
            } else {
                colorSelect.innerHTML = data.map(v =>
                    `<option value="${v.id}" data-color="${v.color}" data-qty="${v.quantity}">${v.color} (estoque: ${v.quantity})</option>`
                ).join('');
            }
        } catch {
            colorSelect.innerHTML = '<option value="">Erro ao carregar</option>';
        }
    });

    // Add Item Logic
    const isKitTypeLocal = (val) => (val || '').toUpperCase().includes('KIT');
    const btnAddItem = container.querySelector('#btn-add-item');
    if (btnAddItem) btnAddItem.onclick = () => {
        const productSelect = container.querySelector('#product-select');
        const qtyInput = container.querySelector('#item-qty');
        const warning = container.querySelector('#stock-warning');

        const pid = productSelect.value;
        const qty = parseInt(qtyInput.value) || 1;

        if (!pid) return;

        const product = loadedProducts.find(p => p.id == pid);
        if (!product) return;

        // Internal service: require unit_cost (except for Kits which unroll their children's costs)
        if (!isKitTypeLocal(product.name) && isInternalMode() && !(parseFloat(product.unit_cost) > 0)) {
            warning.innerText = '⚠️ Este produto não tem valor de custo cadastrado. Vá em Produtos e adicione o custo antes de usar em Serviço Interno.';
            warning.style.color = '#dc2626';
            return;
        }

        let color_variant_id = null;
        let color_name = null;

        const semPersToggle = container.querySelector('#sem-personalizacao');
        const isSemPers = isPulseiraProd(product) && semPersToggle && semPersToggle.checked;

        if (isPulseiraProd(product)) {
            if (isSemPers) {
                // Sem personalização: sem cor, preço fixo R$0,20
                color_variant_id = null;
                color_name = 'Sem personalização';
            } else {
                const selectedColorOpt = colorSelect.options[colorSelect.selectedIndex];
                if (!selectedColorOpt || !selectedColorOpt.value) {
                    alert('Selecione a cor da pulseira antes de adicionar.');
                    return;
                }
                color_variant_id = parseInt(selectedColorOpt.value);
                color_name = selectedColorOpt.dataset.color;
            }
        }

        if (isKitTypeLocal(product.name)) {
            openKitBuilder(product);
            return;
        }

        cart.push({ product, qty, color_variant_id, color_name, sem_personalizacao: isSemPers });
        renderCart();

        qtyInput.value = 1;
        warning.innerText = '';
        warning.style.color = '';
    };


    const kitModal = container.querySelector('#kit-builder-modal');
    let currentKitContext = null;

    const openKitBuilder = async (product) => {
        container.querySelector('#kit-builder-title').textContent = `Configurar Kit: ${product.name}`;
        const templateBtns = container.querySelector('#kit-template-buttons');
        const editor = container.querySelector('#kit-content-editor');
        templateBtns.innerHTML = 'Carregando opções...';
        editor.style.display = 'none';
        kitModal.classList.add('open');

        try {
            const res = await fetch(`/api/products/${product.id}/kits`);
            const { data } = await res.json();
            if (!data || data.length === 0) {
                templateBtns.innerHTML = '<p style="color:#b91c1c;">Nenhum sub-título cadastrado neste Kit. Cadastre na aba Produtos.</p>';
                return;
            }

            templateBtns.innerHTML = data.map((tpl, idx) => `
                <button type="button" class="btn btn-secondary kit-tpl-btn" data-index="${idx}" style="background:#fff; border:1px solid #cbd5e1; color:#334155;">
                    ${tpl.name} <br><small style="color:#16a34a; font-weight:bold;">R$ ${(parseFloat(tpl.base_price)||0).toFixed(2).replace('.',',')}</small>
                </button>
            `).join('');

            templateBtns.querySelectorAll('.kit-tpl-btn').forEach(btn => {
                btn.onclick = () => {
                    templateBtns.querySelectorAll('.kit-tpl-btn').forEach(b => {
                        b.style.borderColor = '#cbd5e1';
                        b.style.background = '#fff';
                    });
                    btn.style.borderColor = '#2563eb';
                    btn.style.background = '#eff6ff';
                    const tData = data[btn.dataset.index];
                    
                    // Deep copy items into context
                    currentKitContext = {
                        product: product,
                        template: tData,
                        items: (tData.items || []).map(i => ({
                            child_product_id: i.child_product_id,
                            product_name: i.product_name,
                            base_qty: i.quantity,
                            current_qty: i.quantity,
                            price: parseFloat(i.current_product_price || 0)
                        }))
                    };
                    renderKitEditor();
                    editor.style.display = 'block';
                };
            });
        } catch (e) {
            templateBtns.innerHTML = 'Erro ao carregar';
        }
    };

    const renderKitEditor = () => {
        const list = container.querySelector('#kit-items-list');
        const ctx = currentKitContext;
        if (!ctx) return;

        list.innerHTML = ctx.items.map((item, idx) => `
            <div style="display:flex; justify-content:space-between; align-items:center; background:#fff; border:1px solid #e2e8f0; padding:0.5rem; border-radius:6px;">
                <div style="flex:1;">
                    <span style="font-weight:600; font-size:0.9rem;">${item.product_name}</span>
                    <div style="font-size:0.75rem; color:#64748b;">Qtd Padrão: ${item.base_qty} | Un: R$ ${item.price.toFixed(2).replace('.',',')}</div>
                </div>
                <div style="display:flex; align-items:center; gap:0.5rem;">
                    <input type="number" min="0" class="kit-ctx-qty form-control" data-index="${idx}" value="${item.current_qty}" style="width:60px; text-align:center; padding:0.3rem;">
                    <button type="button" class="kit-ctx-remove" data-index="${idx}" style="background:#fee2e2; color:#b91c1c; border:none; padding:0.3rem 0.6rem; border-radius:4px; font-weight:bold; cursor:pointer;">&times;</button>
                </div>
            </div>
        `).join('');

        if (ctx.items.length === 0) list.innerHTML = '<p style="text-align:center; color:#94a3b8; font-size:0.85rem;">Nenhum item neste pacote.</p>';

        let extraCost = 0;
        ctx.items.forEach(i => {
            const diff = i.current_qty - i.base_qty;
            extraCost += (diff * i.price);
        });
        
        const finalPrice = Math.max(0, parseFloat(ctx.template.base_price) + extraCost);
        container.querySelector('#kit-builder-total').textContent = `R$ ${finalPrice.toFixed(2).replace('.',',')}`;

        list.querySelectorAll('.kit-ctx-qty').forEach(inp => {
            inp.oninput = (e) => {
                ctx.items[e.target.dataset.index].current_qty = parseInt(e.target.value) || 0;
                renderKitEditor();
            };
        });
        list.querySelectorAll('.kit-ctx-remove').forEach(btn => {
            btn.onclick = (e) => {
                ctx.items.splice(e.target.dataset.index, 1);
                renderKitEditor();
            };
        });
    };

    container.querySelector('#btn-add-extra-kit-item').onclick = () => {
        const pIdStr = prompt('Digite a ID do produto que deseja adicionar no pacote:');
        if (!pIdStr) return;
        const p = loadedProducts.find(x => x.id == parseInt(pIdStr));
        if (!p) return alert('Produto não encontrado');
        if (isKitTypeLocal(p.name)) return alert('Não é possível adicionar um kit dentro de outro.');
        
        currentKitContext.items.push({
            child_product_id: p.id,
            product_name: p.name,
            base_qty: 0,
            current_qty: 1,
            price: parseFloat(p.price || 0)
        });
        renderKitEditor();
    };

    container.querySelector('#btn-finalize-kit').onclick = () => {
        if (!currentKitContext) return;
        
        let extraCost = 0;
        currentKitContext.items.forEach(i => {
           const diff = i.current_qty - i.base_qty;
           extraCost += (diff * i.price);
        });
        const finalPrice = Math.max(0, parseFloat(currentKitContext.template.base_price) + extraCost);

        cart.push({
            is_kit: true,
            product: currentKitContext.product,
            kit_template: currentKitContext.template,
            kit_items: currentKitContext.items.filter(i => i.current_qty > 0),
            unit_price: finalPrice,
            qty: 1
        });
        
        renderCart();
        kitModal.classList.remove('open');
    };

    const finalizeModal = container.querySelector('#finalize-modal');
    const finalizeForm = container.querySelector('#finalize-form');
    let currentFinalizeOrder = null;

    if (finalizeForm) finalizeForm.onsubmit = async (e) => {
        e.preventDefault();
        const inputs = container.querySelectorAll('.finalize-used-input');
        const items = [...inputs].map(inp => ({
            product_id: parseInt(inp.dataset.productId),
            ordered: parseInt(inp.dataset.ordered),
            used: inp.value !== '' ? parseInt(inp.value) : parseInt(inp.dataset.ordered),
            color_variant_id: inp.dataset.colorVariantId ? parseInt(inp.dataset.colorVariantId) : null,
            color_name: inp.dataset.colorName || null
        }));

        const loss_justification = container.querySelector('#finalize-loss-justification').value;

        const body = { items, loss_justification };

        try {
            const res = await fetch(`/api/orders/${currentFinalizeOrder.id}/finalize`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                alert('Erro ao enviar para balcão');
                return;
            }

            finalizeModal.classList.remove('open');
            printLabel(currentFinalizeOrder);
            
            // Optimistic Update
            const cardEl = container.querySelector(`.card[data-order-id="${currentFinalizeOrder.id}"]`);
            if (cardEl) {
                const targetCol = container.querySelector(`#col-em_balcao .column-content`);
                if (targetCol) targetCol.appendChild(cardEl);
                cardEl.className = cardEl.className.replace(/status-\w+/, 'status-em_balcao');
                cardEl.draggable = false;
                cardEl.style.cursor = 'default';
                const badge = cardEl.querySelector('.card-badge');
                if (badge) {
                     badge.textContent = 'Em Balcão';
                     badge.style.background = '#ffedd5';
                     badge.style.color = '#c2410c';
                }
            }
            
            loadOrders();
        } catch (err) {
            alert('Erro de conexão: ' + err.message);
        }
    };


    // Quick Client Logic — only for order-creating users
    const quickClientModal = container.querySelector('#quick-client-modal');
    const btnQuickClient = container.querySelector('#btn-quick-client');
    if (btnQuickClient) {
        btnQuickClient.onclick = () => {
            quickClientModal.classList.add('open');
        };
    }

    const quickClientFormEl = container.querySelector('#quick-client-form');
    if (quickClientFormEl) quickClientFormEl.onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const body = Object.fromEntries(formData);
        body.origin = 'Balcao'; // Default

        const res = await fetch('/api/clients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const json = await res.json();

        if (json.id) {
            // Success — reload client list and auto-select the new client
            await fetchSelectData();
            if (window._kanbanSelectClientById) window._kanbanSelectClientById(json.id);
            quickClientModal.classList.remove('open');
            e.target.reset();
        } else {
            alert('Erro ao criar cliente: ' + (json.error || 'Desconhecido'));
        }
    };

    // === Accumulated attachment list ===
    let attachedFiles = [];

    const renderAttachmentPreview = () => {
        const preview = container.querySelector('#attachment-preview');
        if (!preview) return;
        preview.innerHTML = '';
        attachedFiles.forEach((file, idx) => {
            const wrapper = document.createElement('div');
            wrapper.style.cssText = 'display:flex; flex-direction:column; align-items:center; gap:4px; width:90px; position:relative;';

            // Remove button
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.textContent = '✕';
            removeBtn.style.cssText = 'position:absolute; top:-6px; right:-6px; width:18px; height:18px; border-radius:50%; background:#ef4444; color:white; border:none; cursor:pointer; font-size:10px; line-height:1; display:flex; align-items:center; justify-content:center; z-index:1;';
            removeBtn.onclick = () => { attachedFiles.splice(idx, 1); renderAttachmentPreview(); };
            wrapper.appendChild(removeBtn);

            if (file.type.startsWith('image/')) {
                const img = document.createElement('img');
                img.src = URL.createObjectURL(file);
                img.style.cssText = 'width:70px; height:70px; object-fit:cover; border-radius:6px; border:1px solid #ccc;';
                wrapper.appendChild(img);
            } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
                // PDF: show real first-page preview via iframe
                const iframeWrap = document.createElement('div');
                iframeWrap.style.cssText = 'width:70px; height:70px; border-radius:6px; overflow:hidden; border:1px solid #ccc; background:#fff; position:relative;';
                const iframe = document.createElement('iframe');
                iframe.src = URL.createObjectURL(file) + '#toolbar=0&navpanes=0&scrollbar=0&page=1&zoom=35';
                iframe.style.cssText = 'width:200px; height:200px; border:none; transform:scale(0.35); transform-origin:top left; pointer-events:none;';
                iframeWrap.appendChild(iframe);
                const pdfLabel = document.createElement('div');
                pdfLabel.style.cssText = 'position:absolute; bottom:2px; left:0; right:0; text-align:center; font-size:9px; font-weight:700; color:#dc2626; background:rgba(255,255,255,0.85);';
                pdfLabel.textContent = 'PDF';
                iframeWrap.appendChild(pdfLabel);
                wrapper.appendChild(iframeWrap);
            } else if (file.name.toLowerCase().endsWith('.cdr')) {
                // CDR: CorelDRAW styled badge
                const badge = document.createElement('div');
                badge.style.cssText = 'width:70px; height:70px; background:#00b388; border-radius:6px; border:1px solid #009970; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; overflow:hidden;';
                badge.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="46" height="46">
                      <!-- CorelDRAW X ribbon logo approximation -->
                      <g fill="black">
                        <!-- Left ribbon arm -->
                        <path d="M8 10 Q20 10 28 32 Q20 54 8 54 Q14 54 20 48 Q26 42 26 32 Q26 22 20 16 Z"/>
                        <!-- Right ribbon arm -->
                        <path d="M56 10 Q44 10 36 32 Q44 54 56 54 Q50 54 44 48 Q38 42 38 32 Q38 22 44 16 Z"/>
                        <!-- Center cross piece top-left to bottom-right -->
                        <path d="M20 10 Q32 10 44 10 Q38 16 32 24 Q26 16 20 10Z"/>
                        <!-- Center cross piece top-right to bottom-left -->
                        <path d="M20 54 Q32 54 44 54 Q38 48 32 40 Q26 48 20 54Z"/>
                      </g>
                    </svg>
                    <span style="color:white; font-size:9px; font-weight:800; letter-spacing:0.5px;">CDR</span>`;
                wrapper.appendChild(badge);

            } else {
                const badge = document.createElement('div');
                const ext = file.name.split('.').pop().toUpperCase();
                badge.style.cssText = 'width:70px; height:70px; background:#eff6ff; color:#2563eb; border-radius:6px; border:1px solid #bfdbfe; display:flex; flex-direction:column; align-items:center; justify-content:center; font-size:0.75rem; font-weight:700; gap:4px;';
                badge.innerHTML = `<span style="font-size:1.5rem;">📄</span>${ext}`;
                wrapper.appendChild(badge);
            }

            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.value = file.name.replace(/\.[^/.]+$/, '');
            nameInput.placeholder = 'Nome';
            nameInput.style.cssText = 'width:90px; font-size:0.72rem; padding:2px 4px; border:1px solid #ccc; border-radius:4px; text-align:center; color:#334155;';
            wrapper.appendChild(nameInput);

            preview.appendChild(wrapper);
        });
    };

    // Events
    const orderModal = container.querySelector('#order-modal');
    const btnNewOrder = container.querySelector('#btn-new-order');

    // Wire payment method → event name field visibility at component level
    const paymentSelectEl = container.querySelector('#order-payment-method');
    const eventNameGroup = container.querySelector('#event-name-group');
    if (paymentSelectEl && eventNameGroup) {
        paymentSelectEl.addEventListener('change', (e) => {
            eventNameGroup.style.display = e.target.value === 'CORE' ? 'block' : 'none';
        });
    }

    if (btnNewOrder) {
        btnNewOrder.onclick = () => {
            fetchSelectData();
            cart = [];
            renderCart();
            // Clear attachments
            attachedFiles = [];
            const fileInput = container.querySelector('#order-attachments');
            if (fileInput) { fileInput.value = ''; }
            renderAttachmentPreview();
            // Reset event name field
            if (eventNameGroup) eventNameGroup.style.display = 'none';
            const eventNameInput = container.querySelector('#order-event-name');
            if (eventNameInput) eventNameInput.value = '';
            const internalToggle = container.querySelector('#internal-toggle');
            if (internalToggle) internalToggle.checked = false;
            // Reset discount
            const discountSelect = container.querySelector('#order-discount');
            if (discountSelect) discountSelect.value = '0';
            // Reset internal toggle UI
            const clientRow = container.querySelector('#client-row');
            if (clientRow) clientRow.style.display = '';
            orderModal.classList.add('open');
        };
    }

    // Attachment input — accumulate files
    const orderAttachments = container.querySelector('#order-attachments');
    if (orderAttachments) {
        orderAttachments.addEventListener('change', function () {
            for (const file of this.files) {
                attachedFiles.push(file);
            }
            this.value = ''; // reset so same file can be added again if needed
            renderAttachmentPreview();
        });
    }

    container.querySelectorAll('.modal-close').forEach(btn => {
        btn.onclick = () => container.querySelector(`#${btn.getAttribute('data-target')}`).classList.remove('open');
    });

    // Internal Service Toggle Logic
    const internalToggleEl = container.querySelector('#internal-toggle');
    if (internalToggleEl) {
    internalToggleEl.onchange = async function () {
        const clientRow = container.querySelector('#client-row');
        const clientIdInput = container.querySelector('#client-select'); // hidden input
        const paymentGroup = container.querySelector('#order-payment-method').closest('.form-group');
        const totalInput = container.querySelector('#cart-total-input');
        if (this.checked) {
            clientRow.style.display = 'none';
            if (paymentGroup) paymentGroup.style.display = 'none';
            totalInput.value = '0';
            totalInput.disabled = true;
            // Find or create INTERNO client
            let internoClient = (window._kanbanClientsRef || []).find(c => c.name.trim().toUpperCase() === 'INTERNO');
            if (!internoClient) {
                const res = await fetch('/api/clients', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: 'INTERNO', phone: '0000000000', origin: 'Interno' })
                });
                const json = await res.json();
                if (json.id) {
                    await fetchSelectData();
                    internoClient = (window._kanbanClientsRef || []).find(c => c.name.trim().toUpperCase() === 'INTERNO');
                }
            }
            if (internoClient) {
                clientIdInput.value = internoClient.id;
            }
        } else {
            clientRow.style.display = '';
            if (paymentGroup) paymentGroup.style.display = '';
            totalInput.disabled = false;
        }
    }; // end internalToggle.onchange
    } // end if (internalToggleEl)

    const orderFormEl = container.querySelector('#order-form');
    if (orderFormEl) orderFormEl.onsubmit = async (e) => {
        e.preventDefault();
        console.log('Submitting Order...');
        const formData = new FormData(e.target);
        const body = Object.fromEntries(formData);

        const clientSelect = container.querySelector('#client-select');
        if (!clientSelect.value || clientSelect.value === 'Carregando...') {
            alert('Selecione um cliente');
            return;
        }

        if (cart.length === 0) {
            alert('Adicione pelo menos um item.');
            return;
        }

        // Expand kits into order items array
        let items = [];
        cart.forEach(i => {
            if (i.is_kit) {
                // Header (No Stock, No unit cost on parent itself, but displays properly on order)
                items.push({
                    product_id: i.product.id,
                    name: `📦 [KIT] ${i.product.name} — ${i.kit_template.name}`,
                    quantity: i.qty,
                    price: i.unit_price,
                    unit_cost: 0, 
                    color_variant_id: null,
                    color_name: null
                });
                
                // Actual items mapping for stock deduction
                i.kit_items.forEach(ki => {
                    const childProd = loadedProducts.find(p => p.id == ki.child_product_id);
                    items.push({
                        product_id: ki.child_product_id,
                        name: `   ↳ ${ki.product_name}`,
                        quantity: ki.current_qty * i.qty,
                        price: 0, 
                        unit_cost: childProd ? (parseFloat(childProd.unit_cost) || 0) : 0,
                        color_variant_id: null,
                        color_name: null
                    });
                });
            } else {
                let itemPrice = 0;
                if (i.sem_personalizacao) itemPrice = PULSEIRA_DEFAULT_PRICE;
                else itemPrice = parseFloat(getDeadline().toLowerCase() === '1d' && !i.product.terceirizado ? i.product.price_1_day : (i.product.price_3_days || i.product.price)) || 0;
                items.push({
                    product_id: i.product.id,
                    name: i.product.name,
                    quantity: i.qty,
                    price: itemPrice,
                    unit_cost: parseFloat(i.product.unit_cost) || 0,
                    color_variant_id: i.color_variant_id || null,
                    color_name: i.color_name || null
                });
            }
        });

        const payload = {
            client_id: clientSelect.value,
            description: body.description,
            payment_method: container.querySelector('#internal-toggle').checked ? 'Interno' : container.querySelector('#order-payment-method').value,
            total_value: parseFloat(container.querySelector('#cart-total-input').value) || 0,
            created_by: user.id || 1,
            deadline_option: getDeadline(),
            items: items,
            is_internal: container.querySelector('#internal-toggle').checked ? 1 : 0,
            event_name: (container.querySelector('#internal-toggle').checked ? 'Interno' : container.querySelector('#order-payment-method').value) === 'CORE' 
                        ? container.querySelector('#order-event-name').value 
                        : ''
        };

        // Apply 15% discount se for cliente CORE ou calcula desconto manual
        const selectedClientData = (window._kanbanClientsRef || []).find(c => c.id == clientSelect.value);
        
        let finalValue = parseFloat(container.querySelector('#cart-total-input').value) || 0;
        let originalValue = parseFloat(container.querySelector('#cart-total-input').dataset.baseTotal) || finalValue;

        if (selectedClientData && selectedClientData.core_discount) {
            payload.total_value = parseFloat((originalValue * 0.85).toFixed(2));
            payload.discount_value = parseFloat((originalValue - payload.total_value).toFixed(2));
        } else {
            payload.discount_value = parseFloat((originalValue - finalValue).toFixed(2));
            if (payload.discount_value < 0) payload.discount_value = 0;
            payload.total_value = finalValue;
        }

        console.log('Order Payload:', payload);

        try {
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const json = await res.json();
            console.log('Order Response:', json);

            if (json.message) {
                // Upload accumulated attachments if any
                if (attachedFiles.length > 0) {
                    const uploadData = new FormData();
                    for (const file of attachedFiles) {
                        uploadData.append('files', file);
                    }
                    await fetch(`/api/orders/${json.group_id}/attachments`, {
                        method: 'POST',
                        body: uploadData
                    });
                    attachedFiles = [];
                }

                orderModal.classList.remove('open');
                e.target.reset();

                // Loyalty golden toast
                const _loyaltyClient = (window._kanbanClientsRef || []).find(c => c.id == (container.querySelector('#client-select') || {}).value);
                if (_loyaltyClient && _loyaltyClient.loyalty_status) {
                    const _toast = document.createElement('div');
                    _toast.style.cssText = 'position:fixed; top:24px; left:50%; transform:translateX(-50%); z-index:99999; background:linear-gradient(135deg,#f59e0b,#d97706); color:#fff; padding:16px 28px; border-radius:14px; font-size:1rem; font-weight:800; box-shadow:0 8px 32px rgba(245,158,11,0.45); display:flex; align-items:center; gap:10px; letter-spacing:0.02em; animation: fadeInDown 0.3s ease;';
                    _toast.innerHTML = '<span style="font-size:1.4rem;">⭐</span> <div><div style="font-size:1.05rem;">Pedido FIDELIDADE criado com prioridade!</div><div style="font-size:0.82rem;opacity:0.9;font-weight:600;margin-top:2px;">Atendimento prioritário — Prazo: 1 Dia — Desconto de 5% aplicado</div></div>';
                    document.body.appendChild(_toast);
                    setTimeout(() => { _toast.style.opacity = '0'; _toast.style.transition = 'opacity 0.4s'; setTimeout(() => _toast.remove(), 400); }, 5000);
                }

                // Auto Copy Summary
                const clientName = container.querySelector('#client-search')?.value || 'Cliente';
                const payment = payload.payment_method;
                const total = `R$ ${parseFloat(container.querySelector('#cart-total-input').value || 0).toFixed(2)}`;
                const deadline = payload.deadline_option === '1D' ? '1 Dia (Urgente)' : '3 Dias';

                let summary = `*NOVO PEDIDO - ${clientName}*\n` +
                    `*Prazo:* ${deadline}\n\n` +
                    `*Itens:*\n`;

                cart.forEach(i => {
                    summary += `- ${i.product.name} (${i.qty}x)\n`;
                });

                summary += `\n*Total:* ${total}\n` +
                    `*Pagamento:* ${payment}`;

                window.copyTextToClipboard(summary).then(() => {
                    alert(`Pedido criado! Resumo copiado para a área de transferência.\nID Grupo: ${json.group_id}`);
                }).catch(err => {
                    console.error('Auto-copy failed', err);
                    alert(`Pedido criado! (Cópia automática falhou: ${err})\nID Grupo: ${json.group_id}`);
                });

                cart = [];
                loadOrders();
            } else {
                console.error('Order Error:', json.error);
                alert('Erro ao criar pedido: ' + json.error);
            }
        } catch (err) {
            console.error('Network Error:', err);
            alert('Erro de conexão: ' + err.message);
        }
    };

    // --- Archived Orders ---
    const archivedSection = container.querySelector('#archived-section');
    const archivedList = container.querySelector('#archived-list');

    const btnArchived = container.querySelector('#btn-archived');
    if (btnArchived) {
        btnArchived.onclick = () => {
            archivedSection.style.display = archivedSection.style.display === 'none' ? 'block' : 'none';
            if (archivedSection.style.display === 'block') loadArchived();
        };
    }
    const btnCloseArchived = container.querySelector('#btn-close-archived');
    if (btnCloseArchived) {
        btnCloseArchived.onclick = () => {
            archivedSection.style.display = 'none';
        };
    }

    const loadArchived = async () => {
        try {
            const res = await fetch('/api/orders/archived');
            const { data } = await res.json();
            if (!data || data.length === 0) {
                archivedList.innerHTML = '<p style="color:#94a3b8; text-align:center;">Nenhum pedido arquivado.</p>';
                return;
            }
            archivedList.innerHTML = data.map(o => `
                <div class="card" style="border-left: 4px solid #94a3b8; opacity:0.85;">
                    <div class="card-header">#${getOrderNum(o)} - ${window.parseDBDate(o.created_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</div>
                    <div class="card-title">${o.client_name || 'Cliente?'}</div>
                    <div class="card-detail" style="font-size:0.85rem; color:#555;">${o.product_name || o.products_summary || '-'}</div>
                    <div class="card-footer">
                        <span>R$ ${(o.total_value || 0).toFixed(2)}</span>
                        <span class="card-badge" style="background:#f1f5f9; color:#64748b">Arquivado</span>
                    </div>
                    <button class="btn btn-delete-archived" data-id="${o.id}" style="margin-top:0.5rem; width:100%; padding:6px; background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5; border-radius:6px; cursor:pointer; font-size:0.8rem; font-weight:600;">🗑️ Excluir Pedido</button>
                </div>
            `).join('');

            archivedList.querySelectorAll('.btn-delete-archived').forEach(btn => {
                btn.onclick = async (e) => {
                    e.stopPropagation();
                    if (!confirm('Tem certeza que deseja EXCLUIR este pedido? Esta ação não pode ser desfeita.')) return;
                    try {
                        await fetch(`/api/orders/${btn.dataset.id}`, { method: 'DELETE' });
                        loadArchived();
                    } catch (err) {
                        alert('Erro: ' + err.message);
                    }
                };
            });
        } catch (e) {
            console.error(e);
        }
    };

    // === DRAG-AND-DROP SETUP (producao role only) ===
    const setupDragDrop = () => {
        if (!isProducao) return;
        const draggableColumns = ['col-producao', 'col-finalizado'];
        const statusMap = { 'col-producao': 'producao', 'col-finalizado': 'finalizado' };

        draggableColumns.forEach(colId => {
            const colEl = container.querySelector(`#${colId}`);
            if (!colEl) return;

            colEl.addEventListener('dragover', (e) => {
                e.preventDefault();
                colEl.classList.add('drag-over');
            });
            colEl.addEventListener('dragleave', () => {
                colEl.classList.remove('drag-over');
            });
            colEl.addEventListener('drop', async (e) => {
                e.preventDefault();
                colEl.classList.remove('drag-over');

                const orderId = e.dataTransfer.getData('order-id');
                const fromStatus = e.dataTransfer.getData('order-status');
                const toStatus = statusMap[colId];

                if (!orderId || fromStatus === toStatus) return;

                // Confirm move from finalizado back to producao
                if (toStatus === 'producao' && fromStatus === 'finalizado') {
                    if (!confirm('Deseja mover este pedido de volta para Produção?')) return;
                }

                try {
                    const res = await fetch(`/api/orders/${orderId}/move-status`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ new_status: toStatus, user_id: user.id })
                    });
                    if (res.ok) {
                        const data = await res.json();
                        const cardEl = container.querySelector(`.card[data-order-id="${orderId}"]`);
                        if (cardEl) {
                            // Move card to target column
                            const targetCol = container.querySelector(`#col-${toStatus} .column-content`);
                            if (targetCol) targetCol.appendChild(cardEl);

                            // Update card CSS class
                            cardEl.className = cardEl.className.replace(/status-\w+/, `status-${toStatus}`);

                            // Update draggability based on new status
                            const isDraggable = (toStatus === 'producao' || toStatus === 'finalizado');
                            cardEl.draggable = isDraggable;
                            cardEl.style.cursor = isDraggable ? 'grab' : 'default';

                            // Update card dragstart data
                            cardEl.replaceWith(cardEl); // force event listener refresh via clone
                            const newCardEl = container.querySelector(`.card[data-order-id="${orderId}"]`);
                            if (newCardEl && isDraggable) {
                                newCardEl.addEventListener('dragstart', (ev) => {
                                    ev.dataTransfer.setData('order-id', orderId);
                                    ev.dataTransfer.setData('order-status', toStatus);
                                    newCardEl.classList.add('dragging');
                                });
                                newCardEl.addEventListener('dragend', () => newCardEl.classList.remove('dragging'));
                            }

                            // Update badge in card footer
                            const badge = container.querySelector(`.card[data-order-id="${orderId}"] .card-badge`);
                            if (badge) {
                                if (toStatus === 'em_balcao') {
                                    badge.textContent = 'Em Balcão';
                                    badge.style.background = '#ffedd5';
                                    badge.style.color = '#c2410c';
                                } else if (toStatus === 'finalizado') {
                                    badge.textContent = 'Finalizado';
                                    badge.style.background = '#f0fdf4';
                                    badge.style.color = '#16a34a';
                                } else if (toStatus === 'producao') {
                                    badge.textContent = '';
                                }
                            }

                            // Update "Movido por" label
                            if (data.moved_by_name) {
                                const movedEl = container.querySelector(`.card[data-order-id="${orderId}"] .card-moved-by`);
                                const label = movedEl || document.createElement('div');
                                if (!movedEl) {
                                    label.className = 'card-moved-by';
                                    label.style.cssText = 'font-size:0.75rem; color:#6b7280; padding:3px 6px; background:#f8fafc; border-top:1px solid #e5e7eb; border-radius:0 0 6px 6px; margin-top:2px;';
                                    const finalCard = container.querySelector(`.card[data-order-id="${orderId}"]`);
                                    if (finalCard) finalCard.appendChild(label);
                                }
                                label.innerHTML = `📦 Movido por: <b>${data.moved_by_name.split(' ')[0]}</b>`;
                            }
                        }

                        // Update column counters
                        const fromCounter = container.querySelector(`#col-${fromStatus} .column-count`);
                        const toCounter = container.querySelector(`#col-${toStatus} .column-count`);
                        if (fromCounter) fromCounter.textContent = Math.max(0, parseInt(fromCounter.textContent || 0) - 1);
                        if (toCounter) toCounter.textContent = parseInt(toCounter.textContent || 0) + 1;

                    } else {
                        const err = await res.json();
                        alert('Erro ao mover pedido: ' + (err.error || 'Desconhecido'));
                    }
                } catch (err) {
                    alert('Erro de conexão: ' + err.message);
                }
            });
        });
    };

    setupDragDrop();
    loadOrders();

    // Auto-refresh: atualiza o quadro a cada 20 segundos
    // Não recarrega se houver um modal aberto (para não interromper o usuário)
    const autoRefreshInterval = setInterval(() => {
        const anyModalOpen = container.querySelector('.modal-overlay.open');
        if (!anyModalOpen) {
            loadOrders();
        }
    }, 20000);

    // Cancela o intervalo quando o container é removido do DOM (troca de tela)
    const stopObserver = new MutationObserver(() => {
        if (!document.body.contains(container)) {
            clearInterval(autoRefreshInterval);
            stopObserver.disconnect();
        }
    });
    stopObserver.observe(document.body, { childList: true, subtree: true });

    return container;
};
