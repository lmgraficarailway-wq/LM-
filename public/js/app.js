console.log('App.js initialized');

window.onerror = function(msg, url, line, col, error) {
    const errorMsg = `Error: ${msg}\nLine: ${line}\nURL: ${url}`;
    console.error(errorMsg);
    const app = document.getElementById('app');
    if (app) {
        app.innerHTML = `<div style="padding:2rem; background:#fee2e2; color:#b91c1c; border:2px solid #fca5a5; border-radius:12px; margin:1rem; font-family:sans-serif;">
            <h3 style="margin-top:0">🚨 Erro de Sistema</h3>
            <p>Ocorreu um erro que impediu o carregamento da tela.</p>
            <pre style="background:white; padding:1rem; border-radius:8px; overflow:auto; font-size:0.85rem;">${errorMsg}</pre>
            <button onclick="location.reload()" style="background:#b91c1c; color:white; border:none; padding:0.75rem 1.5rem; border-radius:8px; font-weight:bold; cursor:pointer; margin-top:1rem;">Recarregar Sistema</button>
        </div>`;
    }
    return false;
};

window.copyTextToClipboard = async (text) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text);
    } else {
        // Fallback for non-HTTPS local network access
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            return Promise.resolve();
        } catch (err) {
            console.error('Fallback copy errored', err);
            return Promise.reject(err);
        } finally {
            textArea.remove();
        }
    }
};

// State
const state = {
    token: null,
    user: null,
    currentView: 'kanban'
};

// Restore session from localStorage (persists across F5 / auto-refresh)
const savedToken = localStorage.getItem('token');
const savedUser  = localStorage.getItem('user');
if (savedToken && savedUser) {
    try {
        state.token = savedToken;
        state.user  = JSON.parse(savedUser);
        // Restore last visited view (or default by role)
        if (state.user.role === 'cliente') {
            state.currentView = state.user.loyalty_status ? 'client_loyalty' : 'client_financial';
        } else {
            state.currentView = localStorage.getItem('lastView') || 'kanban';
        }
    } catch (e) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    }
}

// Simple Router
const render = () => {
    const app = document.getElementById('app');
    app.innerHTML = '';

    if (!state.token) {
        console.log('Loading Login View...');
        import('./components/login.js').then(module => {
            console.log('Login View Loaded');
            app.appendChild(module.render(loginHandler));
        }).catch(err => {
            console.error('Failed to load login:', err);
            app.innerHTML = `<div style="color:red; padding: 2rem;">Error loading login module: ${err.message}</div>`;
        });
        return;
    }

    // Main Layout
    import('./components/layout.js?v=' + Date.now()).then(module => {
        const layout = module.render(state.user, logoutHandler, navigate);
        app.appendChild(layout);

        // Mark correct nav link as active (especially on page refresh)
        document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
        const activeLink = document.getElementById(`nav-${state.currentView}`);
        if (activeLink) activeLink.classList.add('active');

        // Load view into layout content
        const contentArea = document.getElementById('content-area');
        loadView(state.currentView, contentArea);
    });
};

const loadView = (view, container) => {
    container.innerHTML = 'Loading...';
    let modulePath = '';

    switch (view) {
        case 'kanban': modulePath = './components/kanban.js'; break;
        case 'clients': modulePath = './components/clients.js'; break;
        case 'products': modulePath = './components/products.js'; break;
        case 'catalogue': modulePath = './components/catalogue.js'; break;
        case 'estoque': modulePath = './components/estoque.js'; break;
        case 'financial': modulePath = './components/financial.js'; break;
        case 'fornecedores': modulePath = './components/fornecedores.js'; break;
        case 'compras': modulePath = './components/compras.js'; break;
        case 'admin': modulePath = './components/admin.js'; break;
        case 'demand': modulePath = './components/demand.js'; break;
        case 'reminders': modulePath = './components/reminders.js'; break;
        case 'budget': modulePath = './components/budget.js'; break;
        case 'chat': modulePath = './components/chatWidget.js'; break;
        case 'client_portal': modulePath = './components/client_portal.js'; break;
        case 'client_financial': modulePath = './components/client_financial.js'; break;
        case 'client_loyalty': modulePath = './components/client_loyalty.js'; break;
        case 'client_points': modulePath = './components/client_points.js'; break;
        default:
            // Unknown view — fall back to kanban and clear bad lastView
            modulePath = './components/kanban.js';
            localStorage.removeItem('lastView');
            break;
    }

    import(modulePath + '?v=99-' + Date.now()).then(module => {
        container.innerHTML = '';
        // Pass user to financial view for role-based controls
        const viewArg = ['financial', 'clients', 'budget'].includes(view) ? state.user : undefined;
        container.appendChild(module.render(viewArg));
    }).catch(err => {
        console.error("Error loading view:", err);
        container.innerHTML = `<div style="color:red">Error loading view: ${view}</div>`;
    });
};

// Handlers
const loginHandler = (data) => {
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    // Client role always goes to loyalty portal if fidelity; else financial
    if (data.user.role === 'cliente') {
        state.currentView = data.user.loyalty_status ? 'client_loyalty' : 'client_financial';
    } else {
        state.currentView = localStorage.getItem('lastView') || 'kanban';
    }
    render();
};

const logoutHandler = () => {
    state.token = null;
    state.user = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    render();
};

const navigate = (view) => {
    state.currentView = view;
    localStorage.setItem('lastView', view);
    const contentArea = document.getElementById('content-area');
    loadView(view, contentArea);

    // Update active nav link (safe — element may not exist for all roles)
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    const navEl = document.getElementById('nav-' + view);
    if (navEl) navEl.classList.add('active');
};

// Init
render();
