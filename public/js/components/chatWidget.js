export const initChatWidget = (user, parentContainer) => {
    if (user.role === 'cliente') return;

    const style = document.createElement('style');
    style.innerHTML = `
        /* ── Botão Flutuante ─────────────────────────────── */
        .chat-widget-btn {
            position: fixed;
            bottom: 28px; right: 28px;
            background: linear-gradient(135deg, var(--primary), var(--sidebar-bg));
            width: 58px; height: 58px;
            border-radius: 18px;
            border: none; cursor: pointer;
            z-index: 9999;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 8px 25px rgba(124, 58, 237, 0.5);
            transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s;
            padding: 0;
        }
        .chat-widget-btn:hover {
            transform: scale(1.12) translateY(-3px);
            box-shadow: 0 14px 35px rgba(124, 58, 237, 0.6);
        }
        
        @keyframes pulse-unread {
            0% { box-shadow: 0 0 0 0 rgba(124, 58, 237, 0.7); transform: scale(1); }
            70% { box-shadow: 0 0 0 15px rgba(124, 58, 237, 0); transform: scale(1.05); }
            100% { box-shadow: 0 0 0 0 rgba(124, 58, 237, 0); transform: scale(1); }
        }
        .chat-widget-btn.has-unread {
            animation: pulse-unread 2s infinite;
            background: linear-gradient(135deg, #7c3aed, #ef4444);
        }

        .chat-widget-btn svg { transition: transform 0.3s ease; }
        .chat-window.open ~ .chat-widget-btn svg,
        .chat-widget-btn.is-open svg { transform: rotate(90deg); }



        .chat-badge {
            position: absolute;
            top: -7px; right: -7px;
            background: linear-gradient(135deg, #ef4444, #dc2626);
            color: white;
            font-size: 11px; font-weight: 800;
            min-width: 22px; height: 22px;
            border-radius: 11px;
            padding: 0 5px;
            display: none; align-items: center; justify-content: center;
            box-shadow: 0 3px 10px rgba(239,68,68,0.5);
            border: 2px solid white;
            letter-spacing: -0.5px;
        }

        /* ── Janela do Chat ──────────────────────────────── */
        .chat-window {
            position: fixed;
            bottom: 100px; right: 28px;
            width: 360px;
            max-height: calc(100vh - 130px);
            min-height: 460px;
            background: rgba(255, 255, 255, 0.92);
            backdrop-filter: blur(30px);
            -webkit-backdrop-filter: blur(30px);
            border-radius: 24px;
            box-shadow:
                0 30px 60px -10px rgba(46, 16, 101, 0.22),
                0 10px 20px -5px rgba(0,0,0,0.08),
                inset 0 1px 0 rgba(255,255,255,0.9);
            border: 1px solid rgba(255,255,255,0.7);
            display: flex; flex-direction: column;
            z-index: 9998;
            opacity: 0; pointer-events: none;
            transform: translateY(24px) scale(0.96);
            transform-origin: bottom right;
            transition: opacity 0.3s cubic-bezier(0.4,0,0.2,1),
                        transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .chat-window.open {
            opacity: 1; pointer-events: auto;
            transform: translateY(0) scale(1);
        }

        /* ── Header ─────────────────────────────────────── */
        .chat-header {
            background: linear-gradient(135deg, var(--sidebar-bg) 0%, var(--primary) 60%, var(--primary-hover) 100%);
            color: white;
            padding: 18px 20px 16px;
            border-radius: 24px 24px 0 0;
            display: flex; justify-content: space-between; align-items: center;
            position: relative;
            overflow: hidden;
        }
        .chat-header::before {
            content: '';
            position: absolute;
            top: -30px; right: -20px;
            width: 120px; height: 120px;
            border-radius: 50%;
            background: rgba(255,255,255,0.07);
        }
        .chat-header::after {
            content: '';
            position: absolute;
            bottom: -15px; left: 30px;
            width: 80px; height: 80px;
            border-radius: 50%;
            background: rgba(255,255,255,0.05);
        }
        .chat-header-info { display: flex; align-items: center; gap: 12px; position: relative; z-index: 1; }
        .chat-header-avatar {
            width: 40px; height: 40px;
            background: rgba(255,255,255,0.2);
            border-radius: 12px;
            display: flex; align-items: center; justify-content: center;
            border: 1.5px solid rgba(255,255,255,0.3);
        }
        .chat-header-text {}
        .chat-header-title { font-weight: 800; font-size: 1rem; letter-spacing: -0.02em; }
        .chat-header-status {
            font-size: 0.72rem; opacity: 0.85; margin-top: 2px;
            display: flex; align-items: center; gap: 5px;
        }
        .chat-status-dot {
            width: 7px; height: 7px; border-radius: 50%;
            background: #4ade80;
            box-shadow: 0 0 6px #4ade80;
            animation: pulse-green 2s infinite;
        }
        @keyframes pulse-green {
            0%, 100% { box-shadow: 0 0 4px #4ade80; }
            50% { box-shadow: 0 0 10px #4ade80, 0 0 18px #4ade80; }
        }
        .chat-close-btn {
            background: rgba(255,255,255,0.15);
            border: 1px solid rgba(255,255,255,0.2);
            color: white; cursor: pointer;
            width: 34px; height: 34px;
            border-radius: 10px;
            display: flex; align-items: center; justify-content: center;
            transition: all 0.2s;
            position: relative; z-index: 1;
        }
        .chat-close-btn:hover {
            background: rgba(255,255,255,0.25);
            transform: rotate(90deg) scale(1.1);
        }

        /* ── Corpo das Mensagens ─────────────────────────── */
        .chat-body {
            flex: 1; padding: 18px 16px;
            overflow-y: auto;
            display: flex; flex-direction: column; gap: 12px;
            scroll-behavior: smooth;
            background: linear-gradient(180deg, rgba(245,243,255,0.3) 0%, transparent 100%);
        }
        .chat-body::-webkit-scrollbar { width: 4px; }
        .chat-body::-webkit-scrollbar-track { background: transparent; }
        .chat-body::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.2); border-radius: 10px; }

        /* Separador de data */
        .chat-date-divider {
            text-align: center; font-size: 0.7rem;
            color: #94a3b8; font-weight: 600;
            display: flex; align-items: center; gap: 8px;
            letter-spacing: 0.05em; text-transform: uppercase;
            margin: 4px 0;
        }
        .chat-date-divider::before, .chat-date-divider::after {
            content: ''; flex: 1; height: 1px;
            background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
        }

        /* Bolhas */
        .chat-bubble {
            max-width: 82%;
            padding: 10px 14px 8px;
            border-radius: 18px;
            font-size: 0.9rem;
            position: relative;
            line-height: 1.5;
            word-wrap: break-word;
            animation: bubbleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes bubbleIn {
            from { opacity: 0; transform: scale(0.88) translateY(8px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .chat-bubble-mine {
            background: linear-gradient(135deg, var(--primary), var(--primary-hover));
            color: white;
            align-self: flex-end;
            border-bottom-right-radius: 5px;
            box-shadow: 0 4px 14px rgba(124,58,237,0.3);
        }
        .chat-bubble-other {
            background: white;
            color: #1e293b;
            align-self: flex-start;
            border-bottom-left-radius: 5px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.8);
            border: 1px solid rgba(226,232,240,0.8);
        }
        .chat-author {
            font-size: 0.68rem; font-weight: 800;
            margin-bottom: 4px; display: block;
            opacity: 0.75; letter-spacing: 0.03em;
            text-transform: uppercase;
        }
        .chat-bubble-mine .chat-author { opacity: 0.8; color: #ddd6fe; }
        .chat-timestamp {
            font-size: 0.62rem; opacity: 0.55;
            margin-top: 5px; display: block;
            text-align: right; letter-spacing: 0.02em;
        }
        .chat-bubble-other .chat-timestamp { text-align: left; }

        .chat-bubble-wrap {
            display: flex;
            align-items: flex-end;
            justify-content: flex-start;
            align-self: flex-start;
            gap: 6px;
            position: relative;
            max-width: 100%;
        }
        .chat-bubble-wrap.mine { 
            justify-content: flex-end; 
            align-self: flex-end; 
        }
        .chat-edit-btn, .chat-delete-btn, .chat-reply-btn {
            background: none; border: none; cursor: pointer;
            opacity: 0; transition: opacity 0.2s, transform 0.2s;
            font-size: 0.8rem; color: #94a3b8;
            padding: 4px; border-radius: 6px;
            flex-shrink: 0;
            display: flex; align-items: center;
        }
        .chat-bubble-wrap:hover .chat-edit-btn,
        .chat-bubble-wrap:hover .chat-delete-btn,
        .chat-bubble-wrap:hover .chat-reply-btn { opacity: 1; }
        .chat-edit-btn:hover { color: var(--primary); transform: scale(1.2); background: #f5f3ff; }
        .chat-delete-btn:hover { color: #ef4444; transform: scale(1.2); background: #fef2f2; }
        .chat-reply-btn:hover { color: #3b82f6; transform: scale(1.2); background: #eff6ff; }

        /* ── Animação de remoção de mensagem ─────────────── */
        @keyframes bubbleOut {
            from { opacity: 1; transform: scale(1); max-height: 200px; }
            to   { opacity: 0; transform: scale(0.85); max-height: 0; margin: 0; padding: 0; }
        }
        .chat-bubble-wrap.removing {
            animation: bubbleOut 0.3s ease forwards;
            overflow: hidden;
            pointer-events: none;
        }

        /* ── Resposta a mensagens ────────────────────────── */
        .chat-reply-input-bar {
            display: none;
            padding: 8px 12px;
            background: #f8fafc;
            border-top: 1px solid #e2e8f0;
            border-left: 4px solid var(--primary);
            position: relative;
        }
        .chat-reply-input-bar.active { display: block; }
        .chat-reply-input-author { font-size: 0.8rem; font-weight: 600; color: var(--primary); margin-bottom: 2px; }
        .chat-reply-input-msg { font-size: 0.75rem; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 90%; }
        .chat-reply-cancel {
            position: absolute; right: 8px; top: 10px;
            background: none; border: none; color: #94a3b8;
            cursor: pointer; font-size: 1rem; line-height: 1; margin: 0; padding: 0 4px;
        }
        .chat-reply-cancel:hover { color: #ef4444; }

        .chat-reply-preview {
            background: rgba(0,0,0,0.05);
            border-left: 3px solid var(--primary);
            padding: 6px 8px;
            border-radius: 4px;
            margin-bottom: 6px;
            font-size: 0.8rem;
            cursor: pointer;
            transition: background 0.2s;
        }
        .chat-reply-preview:hover { background: rgba(0,0,0,0.08); }
        .chat-bubble-mine .chat-reply-preview { background: rgba(255,255,255,0.2); border-left-color: #ddd6fe; color: rgba(255,255,255,0.9); }
        .chat-bubble-mine .chat-reply-preview:hover { background: rgba(255,255,255,0.3); }
        .chat-reply-preview-author { font-weight: 600; margin-bottom: 2px; }
        .chat-reply-preview-msg { font-size: 0.75rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .chat-bubble.editing {
            padding-bottom: 4px;
            box-shadow: 0 0 0 2px var(--primary-glow);
        }
        .chat-edit-input {
            width: 100%; background: transparent; border: none; outline: none;
            font-family: inherit; font-size: 0.9rem; color: inherit;
            line-height: 1.5; resize: none; min-height: 24px;
        }
        .chat-bubble-mine .chat-edit-input { color: white; }
        .chat-bubble-other .chat-edit-input { color: #1e293b; }

        /* ── Anexos & Imagens ────────────────────────────── */
        .chat-attach-btn {
            background: none; border: none; font-size: 1.15rem; opacity: 0.6;
            cursor: pointer; transition: opacity 0.2s, color 0.2s;
            padding: 4px 6px; border-radius: 50%; outline: none;
            display: flex; align-items: center; justify-content: center;
        }
        .chat-attach-btn:hover { opacity: 1; color: var(--primary); background: #f1f5f9; }

        .chat-image-preview-wrapper {
            display: none;
            padding: 8px 12px;
            background: #f8fafc;
            border-top: 1px solid #e2e8f0;
            position: relative;
        }
        .chat-image-preview-wrapper.active { display: flex; align-items: flex-start; gap: 10px; }
        .chat-image-preview-img { width: 50px; height: 50px; object-fit: cover; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .chat-image-preview-info { flex: 1; font-size: 0.8rem; color: #475569; padding-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        
        .chat-msg-img {
            width: 100%; 
            min-width: 240px;
            max-height: 280px;
            border-radius: 16px; 
            margin: 6px 0 10px 0; 
            cursor: pointer;
            box-shadow: 0 8px 24px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.12); 
            transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            display: block;
            border: 3px solid rgba(255, 255, 255, 0.85);
            object-fit: cover;
            background: #f1f5f9;
        }
        .chat-msg-img:hover { 
            transform: scale(1.06) translateY(-4px); 
            box-shadow: 0 16px 32px rgba(0,0,0,0.25), 0 6px 16px rgba(0,0,0,0.15);
            filter: brightness(1.05) contrast(1.05);
            border-color: #fff;
            z-index: 10;
            position: relative;
        }
        .chat-edit-actions {
            display: flex; gap: 6px; justify-content: flex-end;
            margin-top: 6px; padding-top: 4px;
            border-top: 1px solid rgba(255,255,255,0.2);
        }
        .chat-bubble-other .chat-edit-actions { border-top-color: #e2e8f0; }
        .chat-edit-save, .chat-edit-cancel {
            border: none; cursor: pointer; font-size: 0.72rem; font-weight: 700;
            padding: 3px 9px; border-radius: 8px; transition: all 0.15s;
        }
        .chat-edit-save { background: white; color: var(--primary); }
        .chat-edit-save:hover { background: #ede9fe; }
        .chat-bubble-other .chat-edit-save { background: var(--primary); color: white; }
        .chat-bubble-other .chat-edit-save:hover { background: var(--primary-hover); }
        .chat-edit-cancel { background: rgba(0,0,0,0.08); color: inherit; opacity: 0.7; }
        .chat-edit-cancel:hover { opacity: 1; }
        .chat-edited-label {
            font-size: 0.58rem; opacity: 0.5; margin-left: 4px;
            font-style: italic;
        }
        /* ── Footer / Input ─────────────────────────────── */
        .chat-footer {
            padding: 12px 14px 14px;
            border-top: 1px solid rgba(0,0,0,0.06);
            background: rgba(255,255,255,0.8);
            border-radius: 0 0 24px 24px;
            display: flex; flex-direction: column; gap: 8px;
        }
        .chat-typing-row {
            min-height: 18px;
            display: flex; align-items: center;
            font-size: 0.73rem; color: var(--primary);
            font-weight: 600; letter-spacing: 0.02em;
            gap: 6px;
            padding: 0 4px;
        }
        .typing-dots { display: flex; align-items: center; gap: 3px; }
        .typing-dot {
            width: 6px; height: 6px; border-radius: 50%;
            background: var(--primary);
            animation: typingBounce 1.2s infinite ease-in-out;
        }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes typingBounce {
            0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
            40% { transform: translateY(-5px); opacity: 1; }
        }
        .chat-input-row {
            display: flex; align-items: center; gap: 8px;
            background: #f5f3ff;
            border-radius: 14px;
            border: 1.5px solid rgba(139,92,246,0.15);
            padding: 6px 6px 6px 14px;
            transition: border-color 0.2s, box-shadow 0.2s;
        }
        .chat-input-row:focus-within {
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(139,92,246,0.12);
            background: white;
        }
        .chat-input {
            flex: 1; border: none; background: transparent;
            outline: none; font-size: 0.92rem;
            color: #1e293b; line-height: 1.4;
            font-family: inherit;
            resize: none;
            min-height: 22px; max-height: 100px;
        }
        .chat-input::placeholder { color: #94a3b8; }
        .chat-send-btn {
            background: linear-gradient(135deg, var(--primary), var(--primary-hover));
            color: white; border: none;
            width: 38px; height: 38px;
            border-radius: 10px;
            display: flex; align-items: center; justify-content: center;
            cursor: pointer;
            transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
            flex-shrink: 0;
            box-shadow: 0 3px 10px rgba(124,58,237,0.35);
        }
        .chat-send-btn:hover {
            transform: scale(1.12) rotate(-10deg);
            box-shadow: 0 6px 18px rgba(124,58,237,0.5);
        }
        .chat-send-btn:active { transform: scale(0.95); }

        /* ── Emoji Picker ────────────────────────────────── */
        .chat-emoji-btn {
            background: none; border: none; cursor: pointer;
            font-size: 1.25rem; line-height: 1;
            width: 34px; height: 34px;
            border-radius: 8px;
            display: flex; align-items: center; justify-content: center;
            transition: all 0.2s;
            flex-shrink: 0;
            opacity: 0.6;
        }
        .chat-emoji-btn:hover { opacity: 1; transform: scale(1.2); background: rgba(139,92,246,0.08); }
        .chat-emoji-btn.active { opacity: 1; color: var(--primary); }

        .chat-emoji-picker {
            position: absolute;
            bottom: calc(100% + 10px);
            left: 0; right: 0;
            background: white;
            border-radius: 18px;
            box-shadow: 0 20px 50px -10px rgba(46,16,101,0.2), 0 8px 20px rgba(0,0,0,0.08);
            border: 1px solid rgba(226,232,240,0.9);
            z-index: 10001;
            overflow: hidden;
            transform-origin: bottom center;
            transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .chat-emoji-picker.hidden {
            opacity: 0; pointer-events: none;
            transform: scale(0.9) translateY(10px);
        }
        .emoji-cat-tabs {
            display: flex; border-bottom: 1px solid #f1f5f9;
            background: #fafafa; padding: 8px 8px 0;
            gap: 2px; overflow-x: auto;
        }
        .emoji-cat-tabs::-webkit-scrollbar { display: none; }
        .emoji-tab {
            flex-shrink: 0;
            background: none; border: none; cursor: pointer;
            font-size: 1.05rem; padding: 6px 9px;
            border-radius: 8px 8px 0 0; line-height: 1;
            transition: background 0.15s;
            border-bottom: 2px solid transparent;
            opacity: 0.6;
        }
        .emoji-tab:hover { background: #f1f5f9; opacity: 1; }
        .emoji-tab.active { background: white; border-bottom-color: var(--primary); opacity: 1; }
        .emoji-grid {
            display: grid;
            grid-template-columns: repeat(8, 1fr);
            gap: 2px;
            padding: 10px;
            max-height: 200px;
            overflow-y: auto;
        }
        .emoji-grid::-webkit-scrollbar { width: 4px; }
        .emoji-grid::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.2); border-radius: 4px; }
        .emoji-item {
            background: none; border: none; cursor: pointer;
            font-size: 1.3rem; padding: 6px 4px;
            border-radius: 8px; line-height: 1;
            transition: transform 0.12s, background 0.12s;
            text-align: center;
        }
        .emoji-item:hover { background: #f5f3ff; transform: scale(1.3); }
        .emoji-item:active { transform: scale(0.9); }

        /* ── Toast ───────────────────────────────────────── */
        #chat-toast-container {
            position: fixed;
            top: 20px; right: 24px;
            display: flex; flex-direction: column; gap: 10px;
            z-index: 99999;
            pointer-events: none;
        }
        .chat-toast {
            background: linear-gradient(135deg, rgba(15,23,42,0.97), rgba(30,27,75,0.97));
            color: white;
            padding: 14px 18px 14px 14px;
            border-radius: 18px;
            font-size: 0.88rem;
            display: flex; align-items: center; gap: 12px;
            box-shadow: 0 20px 50px rgba(0,0,0,0.4), 0 4px 12px rgba(124,58,237,0.3);
            backdrop-filter: blur(24px);
            -webkit-backdrop-filter: blur(24px);
            border: 1px solid rgba(139,92,246,0.35);
            max-width: 310px;
            min-width: 240px;
            pointer-events: auto;
            cursor: pointer;
            animation: toastSlideDown 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
            position: relative;
            overflow: hidden;
        }
        .chat-toast::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0;
            height: 3px;
            background: linear-gradient(90deg, var(--primary), #a855f7, #ec4899);
            border-radius: 18px 18px 0 0;
        }
        .chat-toast-avatar {
            width: 40px; height: 40px;
            background: linear-gradient(135deg, var(--primary), var(--sidebar-bg));
            border-radius: 12px;
            display: flex; align-items: center; justify-content: center;
            font-weight: 800; font-size: 1rem;
            color: white; flex-shrink: 0;
            box-shadow: 0 4px 12px rgba(124,58,237,0.4);
            border: 1.5px solid rgba(255,255,255,0.15);
        }
        .chat-toast-content { flex: 1; min-width: 0; }
        .chat-toast-header { display: flex; align-items: center; gap: 6px; margin-bottom: 3px; }
        .chat-toast-label {
            font-size: 0.62rem; font-weight: 700;
            background: rgba(139,92,246,0.35);
            color: #c4b5fd;
            padding: 2px 6px;
            border-radius: 20px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            white-space: nowrap;
        }
        .chat-toast-name { font-weight: 800; font-size: 0.85rem; color: #fff; }
        .chat-toast-msg {
            font-size: 0.83rem; color: rgba(255,255,255,0.75);
            line-height: 1.35;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            max-width: 200px;
        }
        .chat-toast-icon {
            width: 22px; height: 22px;
            background: rgba(139,92,246,0.2);
            border-radius: 6px;
            display: flex; align-items: center; justify-content: center;
            flex-shrink: 0;
        }
        .chat-toast-close {
            position: absolute;
            top: 10px; right: 10px;
            background: none; border: none;
            color: rgba(255,255,255,0.4);
            cursor: pointer;
            font-size: 0.85rem;
            padding: 0; line-height: 1;
            pointer-events: auto;
        }
        .chat-toast-close:hover { color: white; }
        .chat-toast-progress {
            position: absolute;
            bottom: 0; left: 0;
            height: 2px;
            background: rgba(139,92,246,0.5);
            border-radius: 0 0 18px 18px;
            animation: toastProgress 5s linear forwards;
        }
        @keyframes toastProgress {
            from { width: 100%; }
            to   { width: 0%; }
        }
        @keyframes toastSlideDown {
            from { transform: translateY(-30px) scale(0.95); opacity: 0; }
            to   { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes toastFadeOut {
            from { transform: translateY(0) scale(1); opacity: 1; max-height: 120px; margin-bottom: 0; }
            to   { transform: translateY(-10px) scale(0.95); opacity: 0; max-height: 0; margin-bottom: -10px; }
        }
        .chat-toast.hiding {
            animation: toastFadeOut 0.3s ease forwards;
            pointer-events: none;
        }
    `;
    document.head.appendChild(style);

    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
        <button class="chat-widget-btn" id="team-chat-btn">
            <img src="/logo.png" style="width:34px; height:34px; object-fit:contain; filter:brightness(0) invert(1);" alt="LM PASSO">
            <div class="chat-badge" id="chat-badge">0</div>
        </button>

        <div class="chat-window" id="team-chat-window">
            <div class="chat-header">
                <div class="chat-header-info">
                    <div class="chat-header-avatar">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                    </div>
                    <div class="chat-header-text">
                        <div class="chat-header-title">Chat da Equipe</div>
                        <div class="chat-header-status">
                            <span class="chat-status-dot"></span>
                            Equipe online
                        </div>
                    </div>
                </div>
                <button class="chat-close-btn" id="team-chat-close">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>

            <div class="chat-body" id="team-chat-body"></div>

            <div class="chat-footer" style="position:relative;">
                <div class="chat-emoji-picker hidden" id="chat-emoji-picker"></div>
                <div class="chat-typing-row" id="team-chat-typing"></div>
                
                <!-- Preview Resposta -->
                <div class="chat-reply-input-bar" id="chat-reply-input-bar">
                    <div class="chat-reply-input-author" id="chat-reply-input-author"></div>
                    <div class="chat-reply-input-msg" id="chat-reply-input-msg"></div>
                    <button type="button" class="chat-reply-cancel" id="chat-reply-cancel" title="Cancelar resposta">✕</button>
                </div>

                <!-- Preview Imagem Anexada -->
                <div class="chat-image-preview-wrapper" id="chat-image-preview-wrapper">
                    <img src="" class="chat-image-preview-img" id="chat-image-preview-img">
                    <div class="chat-image-preview-info" id="chat-image-preview-info">imagem.jpg</div>
                    <button type="button" class="chat-reply-cancel" id="chat-image-cancel" title="Remover anexo">✕</button>
                </div>

                <form class="chat-input-row" id="team-chat-form">
                    <input type="file" id="chat-file-input" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar" style="display:none;">
                    <button type="button" class="chat-attach-btn" id="chat-attach-btn" title="Anexar Arquivo">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                    </button>
                    <button type="button" class="chat-emoji-btn" id="chat-emoji-btn" title="Emojis">😊</button>
                    <input type="text" class="chat-input" id="team-chat-input" placeholder="Mensagem para a equipe..." autocomplete="off">
                    <button type="submit" class="chat-send-btn" title="Enviar">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13"/>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                        </svg>
                    </button>
                </form>
            </div>
        </div>
    `;
    parentContainer.appendChild(wrapper);

    // ── Referências DOM ───────────────────────────────────
    const btn         = wrapper.querySelector('#team-chat-btn');
    const badge       = wrapper.querySelector('#chat-badge');
    const windowEl    = wrapper.querySelector('#team-chat-window');
    const closeBtn    = wrapper.querySelector('#team-chat-close');
    const form        = wrapper.querySelector('#team-chat-form');
    const input       = wrapper.querySelector('#team-chat-input');
    const body        = wrapper.querySelector('#team-chat-body');
    const typingEl    = wrapper.querySelector('#team-chat-typing');
    const emojiBtn    = wrapper.querySelector('#chat-emoji-btn');
    const emojiPicker = wrapper.querySelector('#chat-emoji-picker');
    
    // Reply Bar Elements
    const chatReplyBar = wrapper.querySelector('#chat-reply-input-bar');
    const chatReplyAuthor = wrapper.querySelector('#chat-reply-input-author');
    const chatReplyMsg = wrapper.querySelector('#chat-reply-input-msg');
    const chatReplyCancelBtn = wrapper.querySelector('#chat-reply-cancel');

    // Attachment Elements
    const attachBtn = wrapper.querySelector('#chat-attach-btn');
    const fileInput = wrapper.querySelector('#chat-file-input');
    const imgPreviewWrapper = wrapper.querySelector('#chat-image-preview-wrapper');
    const imgPreviewImg = wrapper.querySelector('#chat-image-preview-img');
    const imgPreviewInfo = wrapper.querySelector('#chat-image-preview-info');
    const imgPreviewCancel = wrapper.querySelector('#chat-image-cancel');
    let selectedImageFile = null;

    attachBtn.onclick = () => fileInput.click();
    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        selectedImageFile = file;

        if (file.type.startsWith('image/')) {
            imgPreviewImg.src = URL.createObjectURL(file);
            imgPreviewImg.style.display = 'block';
        } else {
            // Document preview
            imgPreviewImg.style.display = 'none';
        }

        const isDoc = !file.type.startsWith('image/');
        imgPreviewInfo.innerHTML = isDoc ? `<span style="font-size:1.1rem; margin-right:4px;">📄</span>${file.name}` : file.name;
        
        imgPreviewWrapper.classList.add('active');
        if (!isOpen) toggleChat();
        input.focus();
    };
    const cancelAttachment = () => {
        selectedImageFile = null;
        fileInput.value = '';
        imgPreviewWrapper.classList.remove('active');
    };
    imgPreviewCancel.onclick = cancelAttachment;

    // ── Emoji Picker ──────────────────────────────────────
    const EMOJI_CATS = [
        { icon: '😀', label: 'Rostos', emojis: ['😀','😁','😂','🤣','😃','😄','😅','😆','😉','😊','😋','😎','😍','😘','🥰','😗','😙','😚','🙂','🤗','🤩','🤔','🤨','😐','😑','😶','🙄','😏','😣','😥','😮','🤐','😯','😪','😫','🥱','😴','😌','😛','😜','😝','🤤','😒','😓','😔','😕','🙃','🤑','😲','🙁','😖','😞','😟','😤','😢','😭','😦','😧','😨','😩','🤯','😬','😰','😱','🥵','🥶','😳','🤪','😵','🤠','🥳','😷','🤒','🤕','🤢','🤮','🤧','🥴','😇','🥺','🤓','🧐','😈','👿','😺','😸','😹'] },
        { icon: '👍', label: 'Gestos', emojis: ['👍','👎','👊','✊','🤛','🤜','🤞','✌️','🤟','🤘','🤙','👈','👉','👆','👇','☝️','👋','🤚','🖐️','✋','🖖','💪','🦾','🙏','🤲','👐','🫶','🤝','🤜','✍️','💅','🤳','👂','🦻','👃','🫀','🫁','🦷','🦴','👁️','👀','👅','👄'] },
        { icon: '❤️', label: 'Símbolos', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉️','✡️','🔯','🛐','⛎','♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓','🆔','⚛️','🉑','☢️','☣️','📴','📳','🈶','🈚','🈸','🈺','🈷️','✴️','🆚','🉐','💮','🈴','🚫','💯','✅','❌','❎','🔰'] },
        { icon: '🎉', label: 'Eventos', emojis: ['🎉','🎊','🎈','🎁','🎀','🎗️','🎟️','🎫','🏆','🥇','🥈','🥉','🏅','🎖️','🏵️','🎪','🤹','🎭','🎨','🎬','🎤','🎧','🎵','🎶','🎼','🎹','🥁','🎷','🎺','🎸','🎻','🎮','🕹️','🎲','🃏','🀄','🎯','🎳','🎰','🧩','🧸','🪆','🪅'] },
        { icon: '🔥', label: 'Natureza', emojis: ['🔥','💥','✨','⭐','🌟','💫','⚡','☄️','🌈','🌊','🌀','🌪️','🌧️','⛈️','🌩️','🌨️','❄️','💧','💦','🫧','🌱','🌿','🍀','🍁','🍂','🌺','🌸','🌹','🌷','🌻','🌼','🌙','☀️','🌤️','⛅','🌥️','☁️','🌦️','🌬️','🍄','🌵','🌴','🌲','🌳','🌾','🐉','🦋','🐝','🐛','🐞'] },
        { icon: '😂', label: 'Recentes', emojis: ['👍','❤️','😂','🔥','✅','⚠️','❌','😎','🙏','💯','🤔','👀','🎉','😅','💪','🚀','💀','🤝','😭','👏','😍','🥳','😱','🤣','💬','📌','✌️','🎯','💡','⭐'] }
    ];

    let activeCat = 0;
    let pickerOpen = false;

    const renderEmojiPicker = () => {
        const cat = EMOJI_CATS[activeCat];
        emojiPicker.innerHTML = `
            <div class="emoji-cat-tabs">
                ${EMOJI_CATS.map((c, i) => `
                    <button type="button" class="emoji-tab${i === activeCat ? ' active' : ''}" data-cat="${i}" title="${c.label}">${c.icon}</button>
                `).join('')}
            </div>
            <div class="emoji-grid">
                ${cat.emojis.map(e => `<button type="button" class="emoji-item" data-emoji="${e}">${e}</button>`).join('')}
            </div>
        `;
        emojiPicker.querySelectorAll('.emoji-tab').forEach(tab => {
            tab.onclick = (ev) => { ev.stopPropagation(); activeCat = parseInt(tab.dataset.cat); renderEmojiPicker(); };
        });
        emojiPicker.querySelectorAll('.emoji-item').forEach(item => {
            item.onclick = (ev) => {
                ev.stopPropagation();
                const pos = input.selectionStart ?? input.value.length;
                input.value = input.value.slice(0, pos) + item.dataset.emoji + input.value.slice(pos);
                input.focus();
                input.setSelectionRange(pos + item.dataset.emoji.length, pos + item.dataset.emoji.length);
            };
        });
    };

    const openPicker = () => {
        pickerOpen = true;
        emojiBtn.classList.add('active');
        emojiPicker.classList.remove('hidden');
        renderEmojiPicker();
    };
    const closePicker = () => {
        pickerOpen = false;
        emojiBtn.classList.remove('active');
        emojiPicker.classList.add('hidden');
    };

    emojiBtn.onclick = (e) => { e.stopPropagation(); pickerOpen ? closePicker() : openPicker(); };
    document.addEventListener('click', (e) => { if (pickerOpen && !emojiPicker.contains(e.target) && e.target !== emojiBtn) closePicker(); });

    let unreadCount = 0;
    let isOpen = false;
    let typingTimeout;
    let lastDateShown = null;
    let replyingTo = null; // { id, author, msg }

    // ── Notificações Nativas (Web Notifications API) ──────
    // Pede permissão assim que o usuário interage pela primeira vez
    const requestNotifPermission = async () => {
        if (!('Notification' in window)) return;
        if (Notification.permission === 'default') {
            await Notification.requestPermission();
        }
    };
    // Dispara pedido de permissão ao abrir o chat pela primeira vez
    btn.addEventListener('click', requestNotifPermission, { once: true });
    // Ou tenta imediatamente se já foi concedida antes
    if (Notification.permission === 'granted') {
        // já temos permissão, nada a fazer
    }

    const showNativeNotification = (name, msg, avatar) => {
        if (!('Notification' in window)) return;
        if (Notification.permission !== 'granted') return;
        // Não notifica se a aba está visível e o chat está aberto
        if (document.visibilityState === 'visible' && isOpen) return;

        const preview = (msg || '').replace(/<[^>]*>/g, '').substring(0, 80);
        
        // Se a url do avatar for relativa (/uploads/...), construímos a absoluta
        let iconUrl = '/logo.png';
        if (avatar) {
            iconUrl = avatar.startsWith('http') ? avatar : window.location.origin + avatar;
        }

        const notif = new Notification(`💬 ${name} — Chat da Equipe`, {
            body: preview || '📎 Enviou um arquivo',
            icon: iconUrl,
            badge: '/logo.png',
            tag: 'lm-chat',        // agrupa em vez de empilhar infinitamente
            renotify: true,         // toca som mesmo com a mesma tag
            silent: false,
            requireInteraction: true // <--- Garante que a notificação nativa fique até fechar manualmente
        });

        notif.onclick = () => {
            window.focus();
            notif.close();
            if (!isOpen) toggleChat();
        };
    };

    // ── Resposta a mensagens ──────────────────────────────
    const cancelReply = () => {
        replyingTo = null;
        chatReplyBar.classList.remove('active');
        input.focus();
    };
    chatReplyCancelBtn.onclick = cancelReply;

    const startReply = (id, author, msg) => {
        replyingTo = { id, author, msg: msg.substring(0, 80) + (msg.length > 80 ? '...' : '') };
        chatReplyAuthor.textContent = author;
        chatReplyMsg.textContent = replyingTo.msg;
        chatReplyBar.classList.add('active');
        if (!isOpen) toggleChat();
        input.focus();
    };

    // ── Som de Notificação (Nativo) ───────────────────────
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
            
            // Som de "ping" premium
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
            osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.15);
            
            gain.gain.setValueAtTime(0, audioCtx.currentTime);
            gain.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
            
            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.2);
        } catch (e) { console.warn('Audio play failed', e); }
    };

    // ── Helpers ───────────────────────────────────────────
    const scrollToBottom = () => { body.scrollTop = body.scrollHeight; };

    const getInitial = (name) => (name || '?').charAt(0).toUpperCase();

    const formatChatTime = (dateStr) => {
        if (!dateStr) return '';
        try {
            const d = window.parseDBDate(dateStr);
            if (isNaN(d.getTime())) return '';
            const time = d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
            const today = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
            const msgDate = d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
            return msgDate === today ? time : `${msgDate} ${time}`;
        } catch { return ''; }
    };

    const getDateLabel = (dateStr) => {
        if (!dateStr) return null;
        try {
            const d = window.parseDBDate(dateStr);
            const today = new Date();
            const isToday = d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) === today.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
            const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
            const isYesterday = d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) === yesterday.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
            if (isToday) return 'Hoje';
            if (isYesterday) return 'Ontem';
            return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: 'long' });
        } catch { return null; }
    };

    const addMessage = (msgObj) => {
        const isMine = msgObj.user_id === user.id;

        // Date divider
        const dateLabel = getDateLabel(msgObj.created_at);
        if (dateLabel && dateLabel !== lastDateShown) {
            lastDateShown = dateLabel;
            const divider = document.createElement('div');
            divider.className = 'chat-date-divider';
            divider.textContent = dateLabel;
            body.appendChild(divider);
        }

        const wrap = document.createElement('div');
        wrap.className = `chat-bubble-wrap${isMine ? ' mine' : ''}`;
        wrap.dataset.msgId = msgObj.id;

        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${isMine ? 'chat-bubble-mine' : 'chat-bubble-other'}`;

        const avatarNode = document.createElement('div');
        avatarNode.style.width = '38px';
        avatarNode.style.height = '38px';
        avatarNode.style.borderRadius = '50%';
        avatarNode.style.flexShrink = '0';
        avatarNode.style.background = 'linear-gradient(135deg, #f8fafc, #e2e8f0)';
        avatarNode.style.display = 'flex';
        avatarNode.style.alignItems = 'center';
        avatarNode.style.justifyContent = 'center';
        avatarNode.style.color = '#475569';
        avatarNode.style.fontWeight = '900';
        avatarNode.style.fontSize = '0.95rem';
        avatarNode.style.overflow = 'hidden';
        
        // Volta a utilizar o estilo via CSS (var(--primary)) para respeitar o tema
        avatarNode.style.border = isMine ? '2px solid white' : '2px solid #f8fafc';
        avatarNode.style.boxShadow = isMine ? '0 4px 10px var(--primary-glow)' : '0 3px 8px rgba(0,0,0,0.08)';
        avatarNode.style.position = 'relative';
        avatarNode.style.zIndex = '5';
        avatarNode.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';
        
        // Tighter premium margin so the avatar hugs the message bubble tails
        if (isMine) avatarNode.style.marginLeft = '-4px';
        else avatarNode.style.marginRight = '-4px';

        // Hover effect dynamically
        avatarNode.onmouseenter = () => { avatarNode.style.transform = 'scale(1.1)'; avatarNode.style.boxShadow = '0 6px 14px rgba(0,0,0,0.15)'; avatarNode.style.zIndex = '10'; };
        avatarNode.onmouseleave = () => { avatarNode.style.transform = 'scale(1)'; avatarNode.style.boxShadow = isMine ? '0 4px 10px var(--primary-glow)' : '0 3px 8px rgba(0,0,0,0.08)'; avatarNode.style.zIndex = '5'; };

        if (msgObj.author_avatar) {
            avatarNode.innerHTML = `<img src="${msgObj.author_avatar}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
        } else {
            avatarNode.innerHTML = getInitial(msgObj.user_name);
        }

        // Apply dynamic styles inline so we can use var(--primary) but keep it clean
        if (isMine) {
            bubble.style.background = 'linear-gradient(135deg, var(--primary), var(--primary-hover))';
            bubble.style.color = 'white';
            bubble.style.border = 'none';
            bubble.style.boxShadow = '0 4px 14px var(--primary-glow)';
        } else {
            bubble.style.background = 'white';
            bubble.style.color = '#1e293b';
            bubble.style.border = '1px solid rgba(226,232,240,0.8)';
            bubble.style.boxShadow = '0 2px 10px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.8)';
        }

        const authorHtml = !isMine
            ? `<span class="chat-author">${msgObj.user_name}</span>`
            : '';

        const timeStr = formatChatTime(msgObj.created_at);
        const editedLabel = msgObj.is_edited ? `<span class="chat-edited-label">editada</span>` : '';
        const timeHtml = timeStr ? `<span class="chat-timestamp">${timeStr}${editedLabel}</span>` : '';
        const msgText = (msgObj.message || '').replace(/\n/g, '<br>');

        let replyHtml = '';
        if (msgObj.reply_to_id) {
            const rAuthor = msgObj.reply_to_author || 'Alguém';
            const rMsg = msgObj.reply_to_msg || 'Mensagem exclúida';
            replyHtml = `
                <div class="chat-reply-preview" onclick="const t = document.querySelector('.chat-bubble-wrap[data-msg-id=\\'${msgObj.reply_to_id}\\']'); if(t){t.scrollIntoView({behavior:'smooth', block:'center'}); t.querySelector('.chat-bubble').style.boxShadow='0 0 0 2px var(--primary)'; setTimeout(()=>t.querySelector('.chat-bubble').style.boxShadow='', 1500);}">
                    <div class="chat-reply-preview-author">${rAuthor}</div>
                    <div class="chat-reply-preview-msg">${rMsg.replace(/\n/g, ' ')}</div>
                </div>
            `;
        }

        let attachHtml = '';
        if (msgObj.attachment_url) {
            const ext = msgObj.attachment_url.split('.').pop().toLowerCase();
            const isImg = ['jpg','jpeg','png','gif','webp'].includes(ext);
            if (isImg) {
                attachHtml = `<img src="${msgObj.attachment_url}" class="chat-msg-img" alt="Anexo" onclick="window.open('${msgObj.attachment_url}', '_blank')"><br>`;
            } else {
                attachHtml = `<a href="${msgObj.attachment_url}" target="_blank" class="chat-msg-doc-link" style="display:inline-flex; align-items:center; gap:6px; background:rgba(0,0,0,0.1); padding:8px 12px; border-radius:6px; text-decoration:none; color:inherit; margin-bottom:6px; font-size:0.85rem;"><span style="font-size:1.2rem;">📄</span> <b>Arquivo Anexado</b></a><br>`;
            }
        }

        bubble.innerHTML = `${replyHtml}${authorHtml}${attachHtml}<span class="chat-msg-text">${msgText}</span>${timeHtml}`;

        // Action Buttons wrapper
        const actionsWrap = document.createElement('div');
        actionsWrap.style.display = 'flex';
        actionsWrap.style.gap = '2px';
        actionsWrap.style.alignItems = 'center';

        const replyBtn = document.createElement('button');
        replyBtn.className = 'chat-reply-btn';
        replyBtn.title = 'Responder';
        replyBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>`;
        replyBtn.onclick = (e) => { e.stopPropagation(); startReply(msgObj.id, msgObj.user_name || 'Desconhecido', msgObj.message); };
        actionsWrap.appendChild(replyBtn);

        if (isMine) {
            const editBtn = document.createElement('button');
            editBtn.className = 'chat-edit-btn';
            editBtn.title = 'Editar';
            editBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
            editBtn.onclick = (e) => { e.stopPropagation(); startEdit(msgObj.id, bubble, msgObj.message); };
            actionsWrap.appendChild(editBtn);
        }

        // Delete button — own messages or master
        if (isMine || user.role === 'master') {
            const delBtn = document.createElement('button');
            delBtn.className = 'chat-delete-btn';
            delBtn.title = 'Excluir mensagem';
            delBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`;
            delBtn.onclick = (e) => { e.stopPropagation(); confirmDelete(msgObj.id, wrap); };
            actionsWrap.appendChild(delBtn);
        }

        if (isMine) {
            wrap.appendChild(actionsWrap);
            wrap.appendChild(bubble);
            wrap.appendChild(avatarNode);
        } else {
            wrap.appendChild(avatarNode);
            wrap.appendChild(bubble);
            wrap.appendChild(actionsWrap);
        }
        
        body.appendChild(wrap);
        scrollToBottom();
    };

    // Garante container de toasts existe
    let toastContainer = document.getElementById('chat-toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'chat-toast-container';
        document.body.appendChild(toastContainer);
    }

    const showToast = (name, role, msg, avatar) => {
        const toast = document.createElement('div');
        toast.className = 'chat-toast';
        const previewMsg = (msg || '').replace(/<[^>]*>/g, '').substring(0, 60);
        const displayMsg = previewMsg + (msg.length > 60 ? '…' : '');
        
        const avatarHtml = avatar 
            ? `<img src="${avatar}" style="width:100%; height:100%; object-fit:cover; border-radius:10px;">` 
            : getInitial(name);

        toast.innerHTML = `
            <div class="chat-toast-avatar" style="${avatar ? 'padding:0;' : ''}">${avatarHtml}</div>
            <div class="chat-toast-content">
                <div class="chat-toast-header">
                    <span class="chat-toast-label">💬 Chat da Equipe</span>
                </div>
                <div class="chat-toast-name">${name}</div>
                <div class="chat-toast-msg">${displayMsg || '📎 Arquivo anexado'}</div>
            </div>
            <button class="chat-toast-close" title="Fechar">✕</button>
        `;

        const closeBtn = toast.querySelector('.chat-toast-close');

        const dismiss = () => {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 320);
        };

        closeBtn.onclick = (e) => { e.stopPropagation(); dismiss(); };
        toast.onclick = () => { dismiss(); if (!isOpen) toggleChat(); };

        toastContainer.appendChild(toast);

        // Auto-dismiss após 6s para o toast interno
        setTimeout(dismiss, 6000);
    };

    // ── Excluir mensagem ──────────────────────────────────
    const confirmDelete = (msgId, wrapEl) => {
        if (!confirm('Excluir esta mensagem? Esta ação não pode ser desfeita.')) return;
        const params = new URLSearchParams({ user_id: user.id, user_role: user.role });
        fetch(`/api/chat/message/${msgId}?${params}`, {
            method: 'DELETE'
        })
        .then(res => res.json())
        .then(data => {
            if (data.error) alert(data.error);
            // Removal is handled by the SSE broadcast
        })
        .catch(() => alert('Erro de conexão ao excluir mensagem'));
    };

    // ── Editar mensagem ───────────────────────────────────
    const startEdit = (msgId, bubble, originalText) => {
        if (bubble.classList.contains('editing')) return;
        bubble.classList.add('editing');
        const authorEl = bubble.querySelector('.chat-author');
        const authorHtml = authorEl ? authorEl.outerHTML : '';
        const currentText = (bubble.querySelector('.chat-msg-text') || bubble).innerText.trim();
        bubble._savedHTML = bubble.innerHTML;
        bubble.innerHTML = `
            ${authorHtml}
            <textarea class="chat-edit-input" rows="1">${currentText}</textarea>
            <div class="chat-edit-actions">
                <button class="chat-edit-cancel" type="button">Cancelar</button>
                <button class="chat-edit-save" type="button">Salvar</button>
            </div>
        `;
        const textarea = bubble.querySelector('.chat-edit-input');
        const resize = () => { textarea.style.height = 'auto'; textarea.style.height = textarea.scrollHeight + 'px'; };
        textarea.addEventListener('input', resize);
        resize();
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        bubble.querySelector('.chat-edit-cancel').onclick = () => {
            bubble.innerHTML = bubble._savedHTML;
            bubble.classList.remove('editing');
        };
        bubble.querySelector('.chat-edit-save').onclick = async () => {
            const newText = textarea.value.trim();
            if (!newText) return;
            try {
                const res = await fetch(`/api/chat/message/${msgId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: newText, user_id: user.id })
                });
                if (!res.ok) { const r = await res.json(); alert(r.error || 'Erro ao editar'); return; }
                bubble.classList.remove('editing');
            } catch { alert('Erro de conexão'); }
        };
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); bubble.querySelector('.chat-edit-save').click(); }
            if (e.key === 'Escape') bubble.querySelector('.chat-edit-cancel').click();
        });
    };

    const applyEdit = (data) => {
        const wrap = body.querySelector(`.chat-bubble-wrap[data-msg-id="${data.id}"]`);
        if (!wrap) return;
        const bubble = wrap.querySelector('.chat-bubble');
        if (!bubble) return;
        bubble.classList.remove('editing');
        const authorEl = bubble.querySelector('.chat-author');
        const authorHtml = authorEl ? authorEl.outerHTML : '';
        const timeStr = formatChatTime(data.edited_at || new Date().toISOString());
        bubble.innerHTML = `
            ${authorHtml}
            <span class="chat-msg-text">${(data.message || '').replace(/\n/g, '<br>')}</span>
            <span class="chat-timestamp">${timeStr}<span class="chat-edited-label">editada</span></span>
        `;
    };

    // ── Toggle ────────────────────────────────────────────
    const toggleChat = () => {
        isOpen = !isOpen;
        btn.classList.toggle('is-open', isOpen);
        if (isOpen) {
            windowEl.classList.add('open');
            unreadCount = 0;
            badge.style.display = 'none';
            btn.classList.remove('has-unread');
            badge.textContent = '0';
            setTimeout(() => { input.focus(); scrollToBottom(); }, 150);
        } else {
            windowEl.classList.remove('open');
        }
    };

    btn.onclick = toggleChat;
    closeBtn.onclick = toggleChat;

    // ── Histórico ─────────────────────────────────────────
    fetch('/api/chat/history', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
        .then(r => r.json())
        .then(data => { (data.messages || []).forEach(addMessage); });

    // ── Enviar mensagem ───────────────────────────────────
    form.onsubmit = async (e) => {
        e.preventDefault();
        const text = input.value.trim();
        
        if (!text && !selectedImageFile) return;

        // Visual instant feedback could be complex with pictures, so we wait for server slightly
        const submitBtn = form.querySelector('.chat-send-btn');
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.5';

        try {
            let attachment_url = null;
            if (selectedImageFile) {
                const formData = new FormData();
                formData.append('image', selectedImageFile);
                const uploadRes = await fetch('/api/chat/upload', {
                    method: 'POST',
                    body: formData
                });
                const uploadData = await uploadRes.json();
                if (uploadData.url) attachment_url = uploadData.url;
                cancelAttachment();
            }

            input.value = '';
            
            fetch('/api/chat/typing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isTyping: false, user_id: user.id, user_name: user.name, user_role: user.role })
            }).catch(() => {});

            const payload = { message: text, user_id: user.id, user_name: user.name, user_role: user.role };
            if (replyingTo) {
                payload.reply_to_id = replyingTo.id;
                payload.reply_to_author = replyingTo.author;
                payload.reply_to_msg = replyingTo.msg;
                cancelReply();
            }
            if (attachment_url) {
                payload.attachment_url = attachment_url;
            }

            await fetch('/api/chat/message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
        } catch (err) { 
            console.error('Erro ao enviar mensagem:', err); 
            alert('Erro de conexão ao enviar mensagem');
        } finally {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
        }
    };

    // ── Typing ────────────────────────────────────────────
    input.addEventListener('input', () => {
        clearTimeout(typingTimeout);
        fetch('/api/chat/typing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isTyping: true, user_id: user.id, user_name: user.name, user_role: user.role })
        }).catch(() => {});
        typingTimeout = setTimeout(() => {
            fetch('/api/chat/typing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isTyping: false, user_id: user.id, user_name: user.name, user_role: user.role })
            }).catch(() => {});
        }, 1500);
    });

    // Enviar com Enter (sem shift)
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            form.requestSubmit();
        }
    });

    // ── SSE ───────────────────────────────────────────────
    let evtSource;

    const connectSSE = () => {
        if (evtSource) evtSource.close();
        
        evtSource = new EventSource('/api/chat/stream');

        evtSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'message') {
                addMessage(data);
                if (data.user_id !== user.id) {
                    if (!isOpen) {
                        unreadCount++;
                        badge.style.display = 'flex';
                        badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
                        btn.classList.add('has-unread');
                    }
                    showToast(data.user_name, data.user_role, data.message, data.author_avatar);
                    showNativeNotification(data.user_name, data.message, data.author_avatar);
                    playNotificationSound();
                }
            } else if (data.type === 'delete') {
                const wrapToRemove = body.querySelector(`.chat-bubble-wrap[data-msg-id="${data.id}"]`);
                if (wrapToRemove) {
                    wrapToRemove.classList.add('removing');
                    setTimeout(() => wrapToRemove.remove(), 320);
                }
            } else if (data.type === 'typing') {
                if (data.user_id === user.id) return;
                if (data.isTyping) {
                    typingEl.innerHTML = `
                        <span style="opacity:0.8;">${data.user_name} digitando</span>
                        <div class="typing-dots">
                            <span class="typing-dot"></span>
                            <span class="typing-dot"></span>
                            <span class="typing-dot"></span>
                        </div>`;
                } else {
                    typingEl.innerHTML = '';
                }
            } else if (data.type === 'edit') {
                applyEdit(data);
            }
        };

        evtSource.onerror = () => {
            console.warn('SSE chat: conexão interrompida, tentando reconectar em 5s...');
            evtSource.close();
            setTimeout(connectSSE, 5000);
        };
    };

    connectSSE();
};
