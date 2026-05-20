export const render = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    const container = document.createElement('div');
    container.className = 'catalogue-view';

    const isAdmin = user && user.role === 'master';

    let html = `
        <!-- Header -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 2rem;">
            <div style="display:flex; flex-direction:column; gap:0.2rem;">
                <h2 style="font-size: 1.8rem; font-weight: 900; background: linear-gradient(135deg, var(--primary), #4c1d95); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin:0; letter-spacing: -0.03em;">Catálogo Digital</h2>
                <p style="color: #64748b; margin: 0; font-size: 0.95rem; font-weight:500; white-space: nowrap;">Inspirações, modelos e peças prontas para compartilhar com seus clientes.</p>
            </div>
            ${isAdmin ? `
                <button class="btn btn-primary" id="add-catalogue-btn" style="padding: 0.8rem 1.5rem; border-radius: 12px; font-weight:800; text-transform:uppercase; letter-spacing:0.05em; display:flex; align-items:center; gap:0.5rem; box-shadow:0 4px 15px rgba(139, 92, 246, 0.3); transition:all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                    NOVO ITEM
                </button>
            ` : ''}
        </div>

        <div id="catalogue-grid" class="catalogue-grid">
            <p style="color:#64748b; padding:2rem;">Carregando catálogo...</p>
        </div>

        <!-- Modal para Adicionar/Editar Item (Somente Admin) -->
        ${isAdmin ? `
        <div class="modal-overlay" id="catalogue-modal">
            <div class="modal" style="max-width: 500px">
                <div class="modal-header">
                    <h3 id="cat-modal-title">Novo Item</h3>
                    <button class="modal-close" id="cat-close">&times;</button>
                </div>
                <form id="catalogue-form">
                    <input type="hidden" id="cat-edit-id" value="">
                    
                    <div class="form-group" id="file-group">
                        <label>Upload de Arte / Foto <small>(Deixe em branco para manter a original ao editar)</small></label>
                        <input type="file" id="cat-file" accept="image/*" multiple="multiple" style="padding: 0.5rem">
                    </div>
                    <div class="form-group">
                        <label>Título / Nome Interno</label>
                        <input type="text" id="cat-title" placeholder="Ex: Copo Twister Degrade" required>
                    </div>
                    <div class="form-group">
                        <label>Descrição Promocional (Texto para Copiar)</label>
                        <textarea id="cat-desc" rows="5" placeholder="Digite o texto de venda que acompanhará a imagem..." required></textarea>
                    </div>
                    <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem;">
                        <button type="button" class="btn btn-secondary" id="cat-cancel" style="width:auto">Cancelar</button>
                        <button type="submit" class="btn btn-primary" style="width:auto">Salvar Item</button>
                    </div>
                </form>
            </div>
        </div>
        ` : ''}
    `;

    container.innerHTML = html;

    // ── URL pública para links ───────────────────────────────────────
    let shareBaseUrl = localStorage.getItem('catalogue_public_url') || window.location.origin;

    const getShareBase = () => shareBaseUrl;

    // Busca URL pública do servidor automaticamente (ngrok, Railway, etc.)
    fetch('/api/public-url').then(r => r.json()).then(data => {
        if (data.url && !data.url.includes('localhost') && !data.url.includes('127.0.0.1') && !/http:\/\/192\./.test(data.url) && !localStorage.getItem('catalogue_public_url')) {
            shareBaseUrl = data.url;
        }
    }).catch(() => {});

    let allItems = [];
    let currentPage = 1;
    const PAGE_SIZE = 14;

    const renderPage = (data, page) => {
        const grid = container.querySelector('#catalogue-grid');
        const total = data.length;
        const totalPages = Math.ceil(total / PAGE_SIZE);
        const start = (page - 1) * PAGE_SIZE;
        const pageItems = data.slice(start, start + PAGE_SIZE);

        if (pageItems.length === 0) {
            grid.innerHTML = '<p style="color:#64748b; padding:2rem; width:100%; text-align:center;">O catálogo está vazio no momento.</p>';
            return;
        }

        grid.innerHTML = pageItems.map(item => {
                const safeTitle = (item.title || '').replace(/"/g, '&quot;');
                const safeDesc = (item.description || '');
                const displayDesc = safeDesc.replace(/\\n/g, '<br>');

                // ─── URL Sanitizer ───────────────────────────────────────────
                // Ensures every image path becomes a clean /uploads/filename URL
                // regardless of how it was originally stored in the DB.
                const sanitizeUrl = (raw) => {
                    if (!raw) return '';
                    raw = raw.trim();
                    // Already a full HTTP URL — leave as-is
                    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
                    // Strip query string before extracting filename
                    const cleanRaw = raw.split('?')[0];
                    // Extract just the filename (handles: "filename.jpg", "/uploads/filename.jpg", "uploads/filename.jpg")
                    const filename = cleanRaw.split('/').pop();
                    return `/uploads/${filename}`;
                };

                const renderMediaItem = (rawUrl, title) => {
                    const url = sanitizeUrl(rawUrl);
                    const lUrl = url.toLowerCase().split('?')[0]; // ignore query strings
                    if (lUrl.endsWith('.pdf')) {
                        return `<a href="${url}" target="_blank" style="text-decoration:none;display:block;">
                            <div style="height:180px;width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#fef2f2;border-radius:8px;border:2px dashed #fca5a5;color:#dc2626;cursor:pointer;">
                                <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor"><path d="M7 2h10l5 5v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm0 2v16h13V8h-4V4H7zm4 11h2v-4h-2v4zm0-6h3c1.1 0 2 .9 2 2v2c0 1.1-.9 2-2 2h-3V9z"/></svg>
                                <span style="margin-top:0.5rem;font-weight:600;font-size:0.9rem">Arquivo PDF</span>
                                <span style="font-size:0.75rem;color:#9f1239">Clique para Abrir</span>
                            </div>
                        </a>`;
                    } else if (lUrl.endsWith('.cdr') || lUrl.endsWith('.eps') || lUrl.endsWith('.ai')) {
                        return `<a href="${url}" target="_blank" style="text-decoration:none;display:block;">
                            <div style="height:180px;width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#f0fdf4;border-radius:8px;border:2px dashed #86efac;color:#16a34a;cursor:pointer;">
                                <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor"><path d="M4 4h16v16H4V4zm2 2v12h12V6H6zm3 3h6v2H9V9zm0 4h6v2H9v-2z"/></svg>
                                <span style="margin-top:0.5rem;font-weight:600;font-size:0.9rem">Arquivo Vetor (.${lUrl.split('.').pop().toUpperCase()})</span>
                                <span style="font-size:0.75rem;color:#166534">Clique para Baixar</span>
                            </div>
                        </a>`;
                    }
                    // Image formats — including jfif (JPEG variant common on Windows)
                    const imgExts = ['jpg','jpeg','jfif','jpe','png','gif','webp','bmp','avif','tiff','tif','svg'];
                    // Strip query string before extracting extension
                    const ext = lUrl.split('?')[0].split('.').pop().toLowerCase();
                    if (!imgExts.includes(ext)) {
                        // Unknown format — show a generic download link
                        return `<a href="${url}" target="_blank" style="text-decoration:none;display:block;">
                            <div style="height:180px;width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#f8fafc;border-radius:8px;border:2px dashed #cbd5e1;color:#64748b;">
                                <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                                <span style="margin-top:0.5rem;font-weight:600;font-size:0.9rem">Arquivo .${ext.toUpperCase()}</span>
                                <span style="font-size:0.75rem">Clique para Baixar</span>
                            </div>
                        </a>`;
                    }
                    return `<img 
                        src="${url}" 
                        alt="${title}" 
                        loading="lazy"
                        decoding="async"
                        class="catalogue-image" 
                        style="min-height:180px;width:100%;object-fit:cover;border-radius:8px;background:#f1f5f9;"
                        onerror="this.outerHTML='<div style=\\'height:180px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#fef2f2;border-radius:8px;border:2px dashed #fca5a5;color:#dc2626;padding:1rem;text-align:center;font-size:0.82rem;\\'><svg viewBox=\\'0 0 24 24\\' width=\\'32\\' height=\\'32\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'2\\'><circle cx=\\'12\\' cy=\\'12\\' r=\\'10\\'/><line x1=\\'12\\' y1=\\'8\\' x2=\\'12\\' y2=\\'12\\'/><line x1=\\'12\\' y1=\\'16\\' x2=\\'12.01\\' y2=\\'16\\'/></svg><b style=\\'margin-top:0.5rem;\\'>Imagem não encontrada</b><span style=\\'font-size:0.72rem;margin-top:0.25rem;word-break:break-all;opacity:0.7;\\'>${url}</span></div>'"
                    >`;
                };

                let imagesHtml = '';
                // Build and sanitize the images array
                const rawImages = item.images && item.images.length > 0 ? item.images : (item.image_url ? [item.image_url] : []);
                const images = rawImages.map(sanitizeUrl).filter(u => u.length > 0);
                
                if (images.length > 1) {
                    imagesHtml = `
                        <div style="display: flex; overflow-x: auto; scroll-snap-type: x mandatory; gap: 0.5rem; padding-bottom: 0.5rem; scrollbar-width: thin;">
                            ${images.map(imgUrl => `
                                <a href="${imgUrl}" target="_blank" style="text-decoration:none; flex: 0 0 85%; scroll-snap-align: center;">
                                    ${renderMediaItem(imgUrl, safeTitle)}
                                </a>
                            `).join('')}
                        </div>
                    `;
                } else {
                    const singleImgUrl = images[0] || '';
                    imagesHtml = `
                        <a href="${singleImgUrl}" target="_blank" style="text-decoration:none;">
                            ${renderMediaItem(singleImgUrl, safeTitle)}
                        </a>
                    `;
                }

                return `
                <div class="catalogue-card">
                    <div class="catalogue-image-wrapper">
                        ${imagesHtml}
                        ${isAdmin ? `
                            <div style="position: absolute; top: 10px; right: 10px; display: flex; gap: 0.5rem; z-index: 10;">
                                <button class="cat-edit-btn" data-id="${item.id}" data-title="${safeTitle}" data-desc="${encodeURIComponent(safeDesc)}" title="Editar Texto" style="background: rgba(255,255,255,0.9); border: none; color: var(--primary); width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 2px 10px rgba(0,0,0,0.1); transition: all 0.2s; position: static;">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                </button>
                                <button class="cat-delete-btn" data-id="${item.id}" title="Excluir" style="background: rgba(255,255,255,0.9); border: none; color: var(--danger); width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 2px 10px rgba(0,0,0,0.1); transition: all 0.2s; position: static;">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        ` : ''}
                    </div>
                    <div class="catalogue-content">
                        <h4 class="catalogue-title">${safeTitle || 'Sem Título'}</h4>
                        <p class="catalogue-desc">${displayDesc || 'Nenhuma descrição adicionada.'}</p>
                    </div>
                    <div class="catalogue-actions">
                        <button class="btn btn-secondary cat-link-btn" data-id="${item.id}" title="Copiar Link" style="flex: 1; min-width: 40%; padding: 0.6rem;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="vertical-align:text-bottom; flex-shrink:0;"><path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg> Link
                        </button>
                        <button class="btn btn-secondary cat-copy-btn" data-img="${item.image_url}" data-desc="${encodeURIComponent(safeDesc)}" style="flex: 1; min-width: 40%; display:flex; align-items:center; gap:6px; justify-content:center; padding: 0.6rem;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="flex-shrink:0;"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                            Copiar
                        </button>
                        <button class="cat-share-btn" data-id="${item.id}" data-img="${item.image_url}" data-desc="${encodeURIComponent(safeDesc)}" title="Enviar pelo WhatsApp" style="flex: 1 1 100%; display:flex; align-items:center; gap:6px; justify-content:center; background:#25D366; color:#fff; border:none; font-weight:700; border-radius:8px; padding:0.6rem 0.5rem; cursor:pointer; font-size:0.9rem; transition: background 0.2s;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 24 24" style="flex-shrink:0;"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.136.558 4.14 1.535 5.877L.057 23.428a.75.75 0 00.917.92l5.688-1.456A11.946 11.946 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.946 0-3.773-.497-5.363-1.367l-.38-.217-3.977 1.018 1.052-3.875-.232-.388A9.944 9.944 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                            WhatsApp
                        </button>
                    </div>
                </div>
                `;
        }).join('');

        // Pagination controls
        if (totalPages > 1) {
            const paginationHtml = `
                <div style="width:100%; display:flex; justify-content:center; align-items:center; gap:0.75rem; padding:1.5rem 0; grid-column:1/-1;">
                    <button id="cat-prev-page" style="padding:0.5rem 1.2rem; border:1px solid #e2e8f0; border-radius:8px; background:white; cursor:pointer; font-weight:600; color:#475569; ${page <= 1 ? 'opacity:0.4; cursor:default;' : ''}" ${page <= 1 ? 'disabled' : ''}>← Anterior</button>
                    <span style="color:#64748b; font-size:0.9rem;">Página <b>${page}</b> de <b>${totalPages}</b> &nbsp;·&nbsp; ${total} itens</span>
                    <button id="cat-next-page" style="padding:0.5rem 1.2rem; border:1px solid #e2e8f0; border-radius:8px; background:white; cursor:pointer; font-weight:600; color:#475569; ${page >= totalPages ? 'opacity:0.4; cursor:default;' : ''}" ${page >= totalPages ? 'disabled' : ''}>Próxima →</button>
                </div>`;
            grid.insertAdjacentHTML('beforeend', paginationHtml);
            grid.querySelector('#cat-prev-page')?.addEventListener('click', () => { if (page > 1) { currentPage--; renderPage(allItems, currentPage); window.scrollTo(0,0); } });
            grid.querySelector('#cat-next-page')?.addEventListener('click', () => { if (page < totalPages) { currentPage++; renderPage(allItems, currentPage); window.scrollTo(0,0); } });
        }

        attachItemEvents();
    };

    const loadItems = async () => {
        const grid = container.querySelector('#catalogue-grid');
        try {
            const res = await fetch('/api/catalogue');
            if (!res.ok) {
                const text = await res.text();
                grid.innerHTML = `<p style="color:red; padding:2rem;">Erro ao carregar: ${text}</p>`;
                return;
            }
            const payload = await res.json();
            allItems = payload.data || [];
            currentPage = 1;
            renderPage(allItems, currentPage);
        } catch (err) {
            console.error('Erro ao carregar catálogo:', err);
            if (grid) grid.innerHTML = `<p style="color:red; padding:2rem;">Erro interno ao carregar a interface: ${err.message}</p>`;
        }
    };

    const attachItemEvents = () => {
        // Admin Delete
        if (isAdmin) {
            container.querySelectorAll('.cat-delete-btn').forEach(btn => {
                btn.onclick = async (e) => {
                    const id = e.currentTarget.dataset.id;
                    if (confirm('Tem certeza que deseja excluir esta arte do catálogo?')) {
                        try {
                            const res = await fetch(`/api/catalogue/${id}`, { method: 'DELETE' });
                            if (res.ok) {
                                loadItems();
                                if(window.showToastAlert) window.showToastAlert('Item excluído', 'green');
                            }
                        } catch (err) {
                            console.error(err);
                        }
                    }
                };
            });

            container.querySelectorAll('.cat-edit-btn').forEach(btn => {
                btn.onclick = (e) => {
                    const id = e.currentTarget.dataset.id;
                    const title = e.currentTarget.dataset.title;
                    const desc = decodeURIComponent(e.currentTarget.dataset.desc);
                    
                    container.querySelector('#cat-edit-id').value = id;
                    container.querySelector('#cat-title').value = title;
                    container.querySelector('#cat-desc').value = desc;
                    container.querySelector('#cat-modal-title').textContent = 'Editar Item do Catálogo';
                    
                    // Tornar campo de arquivo opcional em edição
                    container.querySelector('#cat-file').required = false;

                    container.querySelector('#catalogue-modal').classList.add('open');
                };
            });
        }

        // Helper function to reliably copy image + text
        const copyToClipboard = async (imgUrl, textDesc) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.src = imgUrl;

            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });

            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            const pngBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));

            if (navigator.clipboard && window.ClipboardItem) {
                const item = new ClipboardItem({
                    'image/png': pngBlob,
                    'text/plain': new Blob([textDesc], { type: 'text/plain' })
                });
                await navigator.clipboard.write([item]);
                return true;
            } else {
                throw new Error('Clipboard API avançada ausente no navegador.');
            }
        };

        // Copy Link
        container.querySelectorAll('.cat-link-btn').forEach(btn => {
            btn.onclick = async (e) => {
                const id = e.currentTarget.dataset.id;
                const link = getShareBase() + '/c/' + id;
                const originalHTML = btn.innerHTML;
                
                try {
                    await window.copyTextToClipboard(link);
                    btn.innerHTML = '<ion-icon name="checkmark-outline"></ion-icon> Link Copiado!';
                    if (window.showToastAlert) window.showToastAlert('Link exclusivo copiado! O cliente verá sua arte ao abrir.', 'green');
                } catch (err) {
                    console.error('Failed to copy link:', err);
                }
                
                setTimeout(() => { btn.innerHTML = originalHTML; }, 3000);
            };
        });

        // Copy
        container.querySelectorAll('.cat-copy-btn').forEach(btn => {
            btn.onclick = async (e) => {
                const imgUrl = e.currentTarget.dataset.img;
                const desc = decodeURIComponent(e.currentTarget.dataset.desc);
                
                // Extrair ID para montar o link
                const id = e.currentTarget.parentElement.querySelector('.cat-link-btn').dataset.id;
                const link = window.location.origin + '/c/' + id;
                const descWithLink = desc ? (desc + '\n\n' + link) : link;
                
                const originalText = btn.innerHTML;
                
                btn.innerHTML = '<ion-icon name="sync-outline"></ion-icon> Copiando...';
                
                try {
                    await copyToClipboard(imgUrl, descWithLink);
                    btn.innerHTML = '<ion-icon name="checkmark-outline"></ion-icon> Copiado!';
                    if (window.showToastAlert) window.showToastAlert('Imagem copiada! Ao colar (CTRL+V) nos chats que suportam, o texto pode ir junto.', 'green');
                } catch (err) {
                    console.warn('Fallback copy error:', err);
                    if (navigator.clipboard) window.copyTextToClipboard(descWithLink);
                    btn.innerHTML = '<ion-icon name="checkmark-outline"></ion-icon> Texto Copiado';
                    if (window.showToastAlert) window.showToastAlert('Apenas o texto + link foram copiados.', 'orange');
                }

                setTimeout(() => { btn.innerHTML = originalText; }, 3000);
            };
        });

        // Share
        container.querySelectorAll('.cat-share-btn').forEach(btn => {
            btn.onclick = async (e) => {
                const imgUrl = e.currentTarget.dataset.img;
                const desc = decodeURIComponent(e.currentTarget.dataset.desc);
                
                const id = e.currentTarget.dataset.id;
                const link = getShareBase() + '/c/' + id;

                // Web Share API if on mobile
                if (navigator.share && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
                    try {
                        const r = await fetch(imgUrl);
                        const blob = await r.blob();
                        const file = new File([blob], 'catalogo_lm_passo.png', { type: blob.type });
                        await navigator.share({
                            title: 'LM GRÁFICA',
                            text: desc + '\n\n' + link,
                            files: [file]
                        });
                        return;
                    } catch (err) {} // ignore aborts or fallback
                }

                // Abre WhatsApp com APENAS o link — assim aparece azul e com prévia do produto
                const waLink = `https://api.whatsapp.com/send?text=${encodeURIComponent(link)}`;
                window.open(waLink, '_blank');
            };
        });
    };

    // Admin Add Logic
    if (isAdmin) {
        const modal = container.querySelector('#catalogue-modal');
        const openBtn = container.querySelector('#add-catalogue-btn');
        const closeBtn = container.querySelector('#cat-close');
        const cancelBtn = container.querySelector('#cat-cancel');
        const form = container.querySelector('#catalogue-form');

        const closeModal = () => {
            modal.classList.remove('open');
            form.reset();
            container.querySelector('#cat-edit-id').value = '';
            container.querySelector('#cat-modal-title').textContent = 'Novo Item';
            container.querySelector('#cat-file').required = true;
        };

        openBtn.onclick = () => {
            closeModal();
            modal.classList.add('open');
        };
        closeBtn.onclick = closeModal;
        cancelBtn.onclick = closeModal;

        // ── Compressor de imagem no browser (Canvas API) ──────────────────────
        const compressImage = (file, maxWidth = 1200, quality = 0.80) => new Promise((resolve) => {
            // PDFs e vetores passam sem compressão
            const ext = file.name.split('.').pop().toLowerCase();
            if (['pdf','cdr','ai','eps','svg'].includes(ext)) { resolve(file); return; }

            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
                URL.revokeObjectURL(url);
                let w = img.width, h = img.height;
                if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
                const canvas = document.createElement('canvas');
                canvas.width = w; canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                canvas.toBlob(blob => {
                    resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
                }, 'image/jpeg', quality);
            };
            img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
            img.src = url;
        });

        const compressFiles = async (fileList) => {
            const compressed = [];
            for (const f of fileList) compressed.push(await compressImage(f));
            return compressed;
        };
        // ──────────────────────────────────────────────────────────────────────

        form.onsubmit = async (e) => {
            e.preventDefault();
            const submitBtn = form.querySelector('[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Comprimindo...';

            const editId = container.querySelector('#cat-edit-id').value;
            const title = container.querySelector('#cat-title').value;
            const desc = container.querySelector('#cat-desc').value;
            const fileInput = container.querySelector('#cat-file');


            try {
                if (editId) {
                    let res;
                    if (fileInput.files.length > 0) {
                        const formData = new FormData();
                        const compressed = await compressFiles(Array.from(fileInput.files));
                        submitBtn.textContent = 'Salvando...';
                        compressed.forEach(f => formData.append('images', f));
                        formData.append('title', title);
                        formData.append('description', desc);
                        
                        res = await fetch(`/api/catalogue/${editId}`, {
                            method: 'PUT',
                            body: formData
                        });
                    } else {
                        // Endpoint de Edição (Somente textos suportados atualmente, a foto se mantém)
                        res = await fetch(`/api/catalogue/${editId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ title, description: desc })
                        });
                    }
                    
                    if (res.ok) {
                        if(window.showToastAlert) window.showToastAlert('Item editado com sucesso!', 'green');
                        closeModal();
                        loadItems();
                    } else {
                        const fail = await res.json();
                        alert(fail.error || 'Erro ao editar');
                    }
                } else {
                    // Endpoint de Criação
                    if (fileInput.files.length === 0) {
                        alert('Anexe uma imagem!');
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Salvar Item';
                        return;
                    }
                    const compressedFiles = await compressFiles(Array.from(fileInput.files));
                    submitBtn.textContent = 'Enviando...';
                    const formData = new FormData();
                    compressedFiles.forEach(f => formData.append('images', f));
                    formData.append('title', title);
                    formData.append('description', desc);

                    const res = await fetch('/api/catalogue', {
                        method: 'POST',
                        body: formData
                    });
                    
                    if (res.ok) {
                        if(window.showToastAlert) window.showToastAlert('Item salvo com sucesso', 'green');
                        closeModal();
                        loadItems();
                    } else {
                        const fail = await res.json();
                        alert(fail.error || 'Erro ao enviar foto');
                    }
                }
            } catch (err) {
                console.error(err);
                alert('Erro de conexão ao salvar.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Salvar Item';
            }
        };
    }

    loadItems();

    return container;
};
