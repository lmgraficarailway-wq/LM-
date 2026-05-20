export const render = () => {
    const container = document.createElement('div');
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    const ROLES = [
        { value: 'master',     label: '🔑 Master' },
        { value: 'financeiro', label: '💰 Financeiro' },
        { value: 'producao',   label: '🏭 Produção' },
        { value: 'vendedor',   label: '🛒 Vendedor' },
        { value: 'interno',    label: '📋 Interno' },
    ];

    const roleLabel = (role) => {
        const r = ROLES.find(r => r.value === role);
        return r ? r.label : role;
    };

    const roleOptions = (selected = '') =>
        ROLES.map(r => `<option value="${r.value}" ${selected === r.value ? 'selected' : ''}>${r.label}</option>`).join('');

    container.innerHTML = `
        <!-- Header -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 2rem;">
            <div style="display:flex; flex-direction:column; gap:0.2rem;">
                <h2 style="font-size: 1.8rem; font-weight: 900; background: linear-gradient(135deg, var(--primary), #4c1d95); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin:0; letter-spacing: -0.03em;">⚙️ Configurações (Admin)</h2>
                <p style="color: #64748b; margin: 0; font-size: 0.95rem; font-weight:500; white-space: nowrap;">Gerencie perfis, usuários e as permissões do sistema.</p>
            </div>
        </div>

        <div style="max-width:700px">

            <!-- Backup Card -->
            <div style="background:linear-gradient(135deg,#1e3a5f,#1e40af); color:white; border-radius:10px; padding:1.25rem 1.5rem; margin-bottom:1.5rem; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <div style="font-size:1.05rem; font-weight:700; margin-bottom:0.25rem;">🛡️ Backup do Banco de Dados</div>
                    <div style="font-size:0.85rem; opacity:0.85;">Faça o download do arquivo SQLite com todos os dados do sistema.</div>
                </div>
                <button id="btn-backup-db" style="background:white; color:#1e40af; border:none; padding:0.55rem 1.1rem; border-radius:7px; font-weight:700; cursor:pointer; font-size:0.9rem; white-space:nowrap;">⬇️ Baixar Backup</button>
            </div>

            <!-- Restart Server Card -->
            <div style="background:linear-gradient(135deg,#7f1d1d,#991b1b); color:white; border-radius:10px; padding:1.25rem 1.5rem; margin-bottom:1.5rem; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <div style="font-size:1.05rem; font-weight:700; margin-bottom:0.25rem;">🔄 Reiniciar Servidor</div>
                    <div style="font-size:0.85rem; opacity:0.85;">Encerra e reinicia o Node.js. Útil após atualizar arquivos. Leva ~3 segundos.</div>
                </div>
                <button id="btn-restart-server" style="background:white; color:#991b1b; border:none; padding:0.55rem 1.1rem; border-radius:7px; font-weight:700; cursor:pointer; font-size:0.9rem; white-space:nowrap;">🔄 Reiniciar</button>
            </div>

            <!-- Catalogue Recovery Card -->
            <div style="background:linear-gradient(135deg,#064e3b,#065f46); color:white; border-radius:10px; padding:1.25rem 1.5rem; margin-bottom:1.5rem; display:flex; justify-content:space-between; align-items:center; gap:1rem;">
                <div>
                    <div style="font-size:1.05rem; font-weight:700; margin-bottom:0.25rem;">🖼️ Recuperar Catálogo</div>
                    <div style="font-size:0.85rem; opacity:0.85;">Importa automaticamente as imagens da pasta <code style="background:rgba(255,255,255,0.15);padding:1px 5px;border-radius:3px;">/uploads</code> para o catálogo. Use se as fotos sumiram do banco.</div>
                    <div id="import-result" style="margin-top:0.5rem;font-size:0.82rem;font-weight:600;"></div>
                </div>
                <button id="btn-import-catalogue" style="background:white; color:#065f46; border:none; padding:0.55rem 1.1rem; border-radius:7px; font-weight:700; cursor:pointer; font-size:0.9rem; white-space:nowrap; flex-shrink:0;">📥 Importar Fotos</button>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                <h3 style="margin:0; color:#334155">👥 Usuários do Sistema</h3>
                <button class="btn btn-primary" id="btn-new-user" style="width:auto;">+ Novo Usuário</button>
            </div>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Avatar</th>
                        <th>Usuário</th>
                        <th>Nome</th>
                        <th>Perfil</th>
                        <th>Senha</th>
                        <th style="text-align:right">Ações</th>
                    </tr>
                </thead>
                <tbody id="users-list">
                    <tr><td colspan="5">Carregando...</td></tr>
                </tbody>
            </table>
        </div>

        <!-- Modal: Novo Usuário -->
        <div class="modal-overlay" id="new-user-modal">
            <div class="modal" style="max-width:420px">
                <div class="modal-header">
                    <h3>Novo Usuário</h3>
                    <button class="modal-close" id="new-user-close">&times;</button>
                </div>
                <form id="new-user-form">
                    <div class="form-group">
                        <label>Nome completo</label>
                        <input type="text" id="nu-name" required placeholder="Ex: João Silva">
                    </div>
                    <div class="form-group">
                        <label>Username (login)</label>
                        <input type="text" id="nu-username" required placeholder="Ex: joao" autocomplete="off">
                    </div>
                    <div class="form-group">
                        <label>Perfil</label>
                        <select id="nu-role" style="width:100%; padding:0.5rem; border:1px solid #ccc; border-radius:4px;">
                            ${roleOptions()}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Senha</label>
                        <input type="password" id="nu-password" required minlength="4" placeholder="Mínimo 4 caracteres" autocomplete="new-password">
                    </div>
                    <div class="form-group">
                        <label>Confirmar Senha</label>
                        <input type="password" id="nu-confirm" required minlength="4" placeholder="Repita a senha">
                    </div>
                    <button type="submit" class="btn btn-primary" style="width:100%">Criar Usuário</button>
                </form>
            </div>
        </div>

        <!-- Modal: Editar Perfil -->
        <div class="modal-overlay" id="role-modal">
            <div class="modal" style="max-width:360px">
                <div class="modal-header">
                    <h3>Editar Perfil</h3>
                    <button class="modal-close" id="role-close">&times;</button>
                </div>
                <form id="role-form">
                    <input type="hidden" id="role-user-id">
                    <p style="margin-bottom:1rem" id="role-user-label"></p>
                    <div class="form-group">
                        <label>Perfil</label>
                        <select id="role-select" style="width:100%; padding:0.5rem; border:1px solid #ccc; border-radius:4px;">
                            ${roleOptions()}
                        </select>
                    </div>
                    <button type="submit" class="btn btn-primary" style="width:100%">Salvar Perfil</button>
                </form>
            </div>
        </div>

        <!-- Modal: Trocar Senha -->
        <div class="modal-overlay" id="pw-modal">
            <div class="modal" style="max-width:400px">
                <div class="modal-header">
                    <h3>Trocar Senha</h3>
                    <button class="modal-close" id="pw-close">&times;</button>
                </div>
                <form id="pw-form">
                    <input type="hidden" id="pw-user-id">
                    <p style="margin-bottom:1rem" id="pw-user-label"></p>
                    <div class="form-group">
                        <label>Nova Senha</label>
                        <input type="password" id="pw-new" required minlength="4" placeholder="Mínimo 4 caracteres">
                    </div>
                    <div class="form-group">
                        <label>Confirmar Nova Senha</label>
                        <input type="password" id="pw-confirm" required minlength="4" placeholder="Repita a senha">
                    </div>
                    <button type="submit" class="btn btn-primary" style="width:100%">Salvar Nova Senha</button>
                </form>
            </div>
        </div>
    `;

    const newUserModal = container.querySelector('#new-user-modal');
    const roleModal    = container.querySelector('#role-modal');
    const pwModal      = container.querySelector('#pw-modal');

    // ── Close Buttons ──────────────────────────────────────────────────────────
    container.querySelector('#new-user-close').onclick = () => newUserModal.classList.remove('open');
    container.querySelector('#role-close').onclick     = () => roleModal.classList.remove('open');
    container.querySelector('#pw-close').onclick       = () => pwModal.classList.remove('open');

    // ── Load Users ─────────────────────────────────────────────────────────────
    const loadUsers = async () => {
        try {
            const res = await fetch('/api/auth/users');
            const { data } = await res.json();
            const tbody = container.querySelector('#users-list');

            // Fetch passwords (master only)
            let passwordMap = {};
            try {
                const pwRes = await fetch('/api/auth/users/passwords');
                if (pwRes.ok) {
                    const pwData = await pwRes.json();
                    (pwData.data || []).forEach(u => { passwordMap[u.id] = u.plain_password || ''; });
                }
            } catch(e) {}

            tbody.innerHTML = data.map(u => {
                const pw = passwordMap[u.id] || '';
                const hasPw = pw.length > 0;
                return `
                <tr>
                    <td style="text-align:center">
                        <div style="display:flex; flex-direction:column; align-items:center; gap:0.3rem;">
                            ${u.avatar ? `<img src="${u.avatar}" style="width:40px; height:40px; border-radius:50%; object-fit:cover; border:1px solid #cbd5e1;">` : `<div style="width:40px; height:40px; border-radius:50%; background:#e2e8f0; display:flex; align-items:center; justify-content:center; color:#64748b; font-weight:bold; border:1px solid #cbd5e1;">${u.username[0].toUpperCase()}</div>`}
                            <label class="btn-sm" style="cursor:pointer; font-size:0.7rem; padding:2px 6px; background:#f1f5f9; border:1px solid #cbd5e1; border-radius:4px; color:#475569;" title="Trocar imagem">
                                Mudar foto
                                <input type="file" class="avatar-upload" data-id="${u.id}" accept="image/*" style="display:none;">
                            </label>
                        </div>
                    </td>
                    <td><b>${u.username}</b></td>
                    <td>${u.name}</td>
                    <td>${roleLabel(u.role)}</td>
                    <td>
                        <div style="display:flex; align-items:center; gap:0.35rem;">
                            <span class="pw-mask" data-id="${u.id}" style="
                                font-family:monospace;
                                font-size:0.82rem;
                                background:#f1f5f9;
                                border:1px solid #cbd5e1;
                                border-radius:5px;
                                padding:2px 8px;
                                letter-spacing:2px;
                                color:#475569;
                                min-width:60px;
                                display:inline-block;
                            ">${hasPw ? '••••••' : '—'}</span>
                            ${hasPw ? `<button class="btn-eye" data-id="${u.id}" data-pw="${pw.replace(/"/g,'&quot;')}" title="Ver senha" style="
                                background:none;
                                border:none;
                                cursor:pointer;
                                font-size:1rem;
                                padding:2px 4px;
                                color:#64748b;
                                border-radius:4px;
                                transition:color 0.2s;
                            ">👁️</button>` : ''}
                        </div>
                    </td>
                    <td style="text-align:right">
                        <div style="display:flex; gap:0.4rem; justify-content:flex-end; flex-wrap:wrap;">
                            <button class="btn btn-secondary btn-sm btn-edit-role"
                                data-id="${u.id}" data-name="${u.name}" data-username="${u.username}" data-role="${u.role}"
                                style="padding:4px 10px; font-size:0.8rem;">
                                ✏️ Perfil
                            </button>
                            <button class="btn btn-secondary btn-sm btn-change-pw"
                                data-id="${u.id}" data-name="${u.name}" data-username="${u.username}"
                                style="padding:4px 10px; font-size:0.8rem;">
                                🔒 Senha
                            </button>
                            ${u.id !== currentUser.id ? `
                            <button class="btn btn-sm btn-delete-user"
                                data-id="${u.id}" data-name="${u.name}"
                                style="padding:4px 10px; font-size:0.8rem; background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5; border-radius:6px;">
                                🗑️
                            </button>` : ''}
                        </div>
                    </td>
                </tr>
                `;
            }).join('');
            
            // Avatar uploads
            tbody.querySelectorAll('.avatar-upload').forEach(input => {
                input.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    
                    const fd = new FormData();
                    fd.append('avatar', file);
                    
                    try {
                        const label = input.parentElement;
                        const originalText = label.innerHTML;
                        label.textContent = 'Enviando...';
                        
                        const res = await fetch(`/api/auth/users/${input.dataset.id}/avatar`, {
                            method: 'POST',
                            body: fd
                        });
                        const json = await res.json();
                        if (res.ok) {
                            loadUsers();
                        } else {
                            alert('Erro: ' + (json.error || 'Falha ao mudar avatar'));
                            label.innerHTML = originalText;
                        }
                    } catch (err) {
                        alert('Erro de conexão: ' + err.message);
                    }
                };
            });

            // Eye toggle buttons
            tbody.querySelectorAll('.btn-eye').forEach(btn => {
                let visible = false;
                btn.onclick = () => {
                    visible = !visible;
                    const mask = tbody.querySelector(`.pw-mask[data-id="${btn.dataset.id}"]`);
                    if (mask) {
                        mask.textContent = visible ? btn.dataset.pw : '••••••';
                        mask.style.letterSpacing = visible ? '0' : '2px';
                        mask.style.color = visible ? '#0f172a' : '#475569';
                        mask.style.fontWeight = visible ? '700' : 'normal';
                    }
                    btn.textContent = visible ? '🙈' : '👁️';
                };
            });

            // Edit Role
            tbody.querySelectorAll('.btn-edit-role').forEach(btn => {
                btn.onclick = () => {
                    container.querySelector('#role-user-id').value = btn.dataset.id;
                    container.querySelector('#role-user-label').innerHTML = `Usuário: <b>${btn.dataset.name}</b> (${btn.dataset.username})`;
                    container.querySelector('#role-select').value = btn.dataset.role;
                    roleModal.classList.add('open');
                };
            });

            // Change Password
            tbody.querySelectorAll('.btn-change-pw').forEach(btn => {
                btn.onclick = () => {
                    container.querySelector('#pw-user-id').value = btn.dataset.id;
                    container.querySelector('#pw-user-label').innerHTML = `Usuário: <b>${btn.dataset.name}</b> (${btn.dataset.username})`;
                    container.querySelector('#pw-new').value = '';
                    container.querySelector('#pw-confirm').value = '';
                    pwModal.classList.add('open');
                };
            });

            // Delete User
            tbody.querySelectorAll('.btn-delete-user').forEach(btn => {
                btn.onclick = async () => {
                    if (!confirm(`Excluir o usuário "${btn.dataset.name}"? Esta ação não pode ser desfeita.`)) return;
                    try {
                        const res = await fetch(`/api/auth/users/${btn.dataset.id}`, { method: 'DELETE' });
                        const json = await res.json();
                        if (res.ok) {
                            alert('✅ Usuário excluído.');
                            loadUsers();
                        } else {
                            alert('Erro: ' + (json.error || 'Falha ao excluir'));
                        }
                    } catch (err) {
                        alert('Erro de conexão: ' + err.message);
                    }
                };
            });

        } catch (e) {
            console.error(e);
        }
    };

    // ── Novo Usuário ───────────────────────────────────────────────────────────
    container.querySelector('#btn-new-user').onclick = () => {
        container.querySelector('#new-user-form').reset();
        newUserModal.classList.add('open');
    };

    container.querySelector('#new-user-form').onsubmit = async (e) => {
        e.preventDefault();
        const name     = container.querySelector('#nu-name').value.trim();
        const username = container.querySelector('#nu-username').value.trim();
        const role     = container.querySelector('#nu-role').value;
        const password = container.querySelector('#nu-password').value;
        const confirm  = container.querySelector('#nu-confirm').value;

        if (password !== confirm) { alert('As senhas não coincidem!'); return; }

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, username, role, password })
            });
            const json = await res.json();
            if (res.ok) {
                alert('✅ Usuário criado com sucesso!');
                newUserModal.classList.remove('open');
                loadUsers();
            } else {
                alert('Erro: ' + (json.error || 'Falha ao criar usuário'));
            }
        } catch (err) {
            alert('Erro de conexão: ' + err.message);
        }
    };

    // ── Editar Perfil ──────────────────────────────────────────────────────────
    container.querySelector('#role-form').onsubmit = async (e) => {
        e.preventDefault();
        const id   = container.querySelector('#role-user-id').value;
        const role = container.querySelector('#role-select').value;
        try {
            const res = await fetch(`/api/auth/users/${id}/role`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role })
            });
            const json = await res.json();
            if (res.ok) {
                alert('✅ Perfil atualizado!');
                roleModal.classList.remove('open');
                loadUsers();
            } else {
                alert('Erro: ' + (json.error || 'Falha ao atualizar perfil'));
            }
        } catch (err) {
            alert('Erro de conexão: ' + err.message);
        }
    };

    // ── Trocar Senha ───────────────────────────────────────────────────────────
    container.querySelector('#pw-form').onsubmit = async (e) => {
        e.preventDefault();
        const newPw    = container.querySelector('#pw-new').value;
        const confirmPw = container.querySelector('#pw-confirm').value;

        if (newPw !== confirmPw) { alert('As senhas não coincidem!'); return; }

        const userId = container.querySelector('#pw-user-id').value;
        try {
            const res = await fetch(`/api/auth/users/${userId}/password`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ new_password: newPw })
            });
            const json = await res.json();
            if (res.ok) {
                alert('✅ Senha alterada com sucesso!');
                pwModal.classList.remove('open');
            } else {
                alert('Erro: ' + (json.error || 'Falha ao alterar senha'));
            }
        } catch (err) {
            alert('Erro de conexão: ' + err.message);
        }
    };

    // Backup Handler
    const btnBackup = container.querySelector('#btn-backup-db');
    if (btnBackup) {
        btnBackup.onclick = () => {
            const token = localStorage.getItem('token');
            if (!token) { alert('Sessão expirada. Faça login novamente.'); return; }
            const url = `/api/backup/db?token=${encodeURIComponent(token)}`;
            const a = document.createElement('a');
            a.href = url;
            a.download = '';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        };
    }

    // Restart Server Handler
    const btnRestart = container.querySelector('#btn-restart-server');
    if (btnRestart) {
        btnRestart.onclick = async () => {
            if (!confirm('⚠️ Tem certeza que deseja reiniciar o servidor?\n\nO sistema ficará offline por ~3 segundos e recarregará automaticamente.')) return;

            const token = localStorage.getItem('token');
            if (!token) { alert('Sessão expirada.'); return; }

            btnRestart.disabled = true;

            // Countdown visual
            let count = 3;
            btnRestart.textContent = `⏳ ${count}s...`;
            const interval = setInterval(() => {
                count--;
                if (count > 0) {
                    btnRestart.textContent = `⏳ ${count}s...`;
                } else {
                    clearInterval(interval);
                    btnRestart.textContent = '🔄 Reiniciando...';
                }
            }, 1000);

            try {
                await fetch('/api/admin/restart', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            } catch (_) {
                // Fetch error is expected — server is shutting down
            }

            clearInterval(interval);
            btnRestart.textContent = '⏳ Aguardando servidor...';

            // Poll until server is back online, then reload the page
            const pollReady = () => {
                fetch('/api/health')
                    .then(r => {
                        if (r.ok) {
                            btnRestart.textContent = '✅ Online! Recarregando...';
                            setTimeout(() => window.location.reload(), 800);
                        } else {
                            setTimeout(pollReady, 800);
                        }
                    })
                    .catch(() => setTimeout(pollReady, 800));
            };
            // Give server 1.5s to go down before polling
            setTimeout(pollReady, 1500);
        };
    }

    // Import Catalogue from Disk Handler
    const btnImport = container.querySelector('#btn-import-catalogue');
    const importResult = container.querySelector('#import-result');
    if (btnImport) {
        btnImport.onclick = async () => {
            if (!confirm('📥 Importar todas as imagens da pasta /uploads para o catálogo?\n\nIsso criará novos itens para cada imagem ainda não cadastrada. Você poderá editar os títulos depois.')) return;

            btnImport.disabled = true;
            btnImport.textContent = '⏳ Importando...';
            importResult.textContent = '';

            try {
                const res = await fetch('/api/catalogue/import-from-disk', { method: 'POST' });
                const json = await res.json();

                if (res.ok) {
                    importResult.style.color = '#86efac';
                    importResult.textContent = `✅ ${json.message}`;
                    btnImport.textContent = '✅ Concluído';
                } else {
                    importResult.style.color = '#fca5a5';
                    importResult.textContent = `❌ Erro: ${json.error}`;
                    btnImport.disabled = false;
                    btnImport.textContent = '📥 Importar Fotos';
                }
            } catch(err) {
                importResult.style.color = '#fca5a5';
                importResult.textContent = `❌ Erro de conexão: ${err.message}`;
                btnImport.disabled = false;
                btnImport.textContent = '📥 Importar Fotos';
            }
        };
    }

    loadUsers();
    return container;
};
