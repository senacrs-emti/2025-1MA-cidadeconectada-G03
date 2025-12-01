const button = document.getElementById("hospitalButton");
const statusText = document.getElementById("statusText");

function setStatus(msg, show = true) {
    statusText.textContent = msg;
    statusText.style.opacity = show ? "1" : "0";
}

function disableButton(state) {
    button.disabled = state;
    button.classList.toggle("pulsing", state);
    button.textContent = state ? "BUSCANDO…" : "EMERGÊNCIA";
}

function fallbackSearch() {
    setStatus("buscando alternativa…");
    window.open("https://www.google.com/maps/search/hospital+perto+de+mim/", "_blank");
}

button.addEventListener("click", function () {
    disableButton(true);
    setStatus("Obtendo localização…");

    if (!navigator.geolocation) {
        setStatus("GPS indisponível");
        fallbackSearch();
        disableButton(false);
        return;
    }

    navigator.geolocation.getCurrentPosition(
        function (position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            setStatus("Localização obtida");
            // esconde mensagem após 2 segundos
            setTimeout(() => setStatus('', false), 2000);

            // Agora abre a ROTA exata
            const url =
                `https://www.google.com/maps/dir/?api=1&origin=${lat},${lng}&destination=hospital&travelmode=driving`;

            window.open(url, "_blank");
            disableButton(false);
        },

        function (error) {
            if (error.code === error.PERMISSION_DENIED) {
                setStatus("sem permissão");
            } else if (error.code === error.TIMEOUT) {
                setStatus("GPS lento");
            } else {
                setStatus("erro no GPS");
            }

            fallbackSearch();
            disableButton(false);
        },

        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        }
    );
});

document.querySelectorAll('.secao').forEach(sec => sec.style.display = 'none');

// Pega todos os links dos botões
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', function (event) {
    event.preventDefault();

    // Fecha todas as seções
    document.querySelectorAll('.secao').forEach(sec => sec.style.display = 'none');

    // Mostra a clicada
    const id = this.getAttribute('href').substring(1);
    const alvo = document.getElementById(id);

    if (alvo) {
      alvo.style.display = 'block';
      window.scrollTo({ top: alvo.offsetTop - 20, behavior: 'smooth' });
    }

    // se for login, foca o campo de e-mail
    if (id === 'login') {
      const input = document.querySelector('#loginForm input[name="email"]');
      if (input) input.focus();
    }
  });
});

// Form handling for atestado forms
function handleAtestadoForms() {
  const forms = document.querySelectorAll('.atestado-form');
  forms.forEach(form => {
    const msg = form.querySelector('.form-msg');
    const resetBtn = form.querySelector('.reset-btn');

    resetBtn.addEventListener('click', () => {
      form.reset();
      msg.textContent = '';
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const payload = {};
      data.forEach((v,k) => payload[k]=v);
      payload.group = form.getAttribute('data-group') || '';
      // Simulação de envio: salvar no localStorage e mostrar mensagem
      const chave = 'atestado_pedidos_v1';
      const pedidos = JSON.parse(localStorage.getItem(chave) || '[]');
      pedidos.push({payload, date: new Date().toISOString()});
      localStorage.setItem(chave, JSON.stringify(pedidos));

      msg.textContent = 'Pedido enviado. Voltaremos em breve.';
      form.reset();

      // envia para hospital próximo — apenas dentro de Porto Alegre
      if (payload.hospital) {
        const POA_CENTER = { lat: -30.0346, lng: -51.2177 };
        const MAX_KM = 50; // distância máxima aceitável (km)

        function toRad(v){ return v * Math.PI / 180; }
        function haversineKm(lat1, lon1, lat2, lon2){
          const R = 6371; // km
          const dLat = toRad(lat2 - lat1);
          const dLon = toRad(lon2 - lon1);
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                    Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          return R * c;
        }

        function openPoaSearchAt(lat, lng){
          // abre pesquisa por hospitais em Porto Alegre, centrada na posição do usuário
          const url = `https://www.google.com/maps/search/hospital+Porto+Alegre/@${lat},${lng},13z`;
          window.open(url, '_blank');
        }

        if (!navigator.geolocation) {
          // sem geolocalização, abre busca por hospital em POA usando nome escolhido
          const url = `https://www.google.com/maps/search/${encodeURIComponent(payload.hospital + ' Porto Alegre')}`;
          window.open(url, '_blank');
        } else {
          // tenta obter localização do usuário para garantir que esteja em POA
          navigator.geolocation.getCurrentPosition(function(pos){
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const dist = haversineKm(lat, lng, POA_CENTER.lat, POA_CENTER.lng);

            if (dist <= MAX_KM) {
              // usuário dentro do raio de POA: abre mapa centrado nele
              openPoaSearchAt(lat, lng);
            } else {
              // usuário fora de POA — não enviamos automaticamente para hospitais fora de POA
              msg.textContent = 'Só enviamos pedidos automáticos para hospitais em Porto Alegre. Abrindo busca em POA.';
              // abre busca centrada em Porto Alegre para o hospital escolhido
              const url = `https://www.google.com/maps/search/${encodeURIComponent(payload.hospital + ' Porto Alegre')}`;
              window.open(url, '_blank');
            }

          }, function(err){
            // erro ao obter posição: aborta e abre busca pelo hospital em POA
            const url = `https://www.google.com/maps/search/${encodeURIComponent(payload.hospital + ' Porto Alegre')}`;
            window.open(url, '_blank');
          }, { enableHighAccuracy: true, timeout: 7000 });
        }
      }
    });
  });
}

// Form handling for exames (client-side only)
function handleExameForms() {
  const forms = document.querySelectorAll('.exame-form');
  forms.forEach(form => {
    const msg = form.querySelector('.form-msg');
    const resetBtn = form.querySelector('.reset-btn');

    resetBtn.addEventListener('click', () => {
      form.reset();
      msg.textContent = '';
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const files = Array.from(form.querySelector('input[type=file]').files);
      if (files.length === 0) {
        msg.textContent = 'Selecione ao menos um arquivo.';
        return;
      }
      if (files.length > 5) {
        msg.textContent = 'Máximo 5 arquivos.';
        return;
      }

      // valida tipos e tamanhos (limite 5MB por arquivo)
      for (const f of files) {
        if (!['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'].includes(f.type) && !f.type.startsWith('image/')) {
          msg.textContent = 'Formato inválido: ' + f.name;
          return;
        }
        if (f.size > 5 * 1024 * 1024) {
          msg.textContent = 'Arquivo muito grande: ' + f.name;
          return;
        }
      }

      // Simulação: armazenar metadados dos arquivos no localStorage (não armazenamos os arquivos em si)
      const data = new FormData(form);
      const payload = {};
      data.forEach((v,k) => {
        if (k !== 'exames') payload[k] = v;
      });
      payload.group = form.getAttribute('data-group') || '';
      payload.files = files.map(f => ({name: f.name, size: f.size, type: f.type}));

      const chave = 'exames_envios_v1';
      const registros = JSON.parse(localStorage.getItem(chave) || '[]');
      registros.push({payload, date: new Date().toISOString()});
      localStorage.setItem(chave, JSON.stringify(registros));

      msg.textContent = 'Exames enviados (simulado). Seus arquivos não saem do seu navegador.';
      form.reset();
    });
  });
}

// Handling call buttons and modal
function setupCallButtons() {
  const callBtns = document.querySelectorAll('.call-btn');
  const modal = document.getElementById('callModal');
  const modalName = document.getElementById('modalHospitalName');
  const modalPhoneLink = document.getElementById('modalPhoneLink');
  const modalMapsLink = document.getElementById('modalMapsLink');
  const copyPhone = document.getElementById('copyPhone');
  const modalClose = document.querySelector('.modal-close');
  const modalCallNow = document.getElementById('modalCallNow');

  function openModal(name, phone){
    modalName.textContent = name;
    modalPhoneLink.textContent = phone;
    modalPhoneLink.href = `tel:${phone}`;
    modalMapsLink.href = `https://www.google.com/maps/search/${encodeURIComponent(name + ' Porto Alegre')}`;
    modal.setAttribute('aria-hidden', 'false');
    modal.style.display = 'block';
    // focus first actionable button
    modalCallNow.focus();
    // attach escape listener
    document.addEventListener('keydown', escHandler);
  }

  function closeModal(){
    modal.setAttribute('aria-hidden', 'true');
    modal.style.display = 'none';
    document.removeEventListener('keydown', escHandler);
  }

  function escHandler(e){ if (e.key === 'Escape') closeModal(); }

  callBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const phone = btn.getAttribute('data-phone');
      const name = btn.getAttribute('data-name');

      // em dispositivos móveis, usamos tel: direto
      if (/Mobi|Android/i.test(navigator.userAgent)) {
        window.location.href = `tel:${phone}`;
        return;
      }

      // em desktop mostramos modal com número e opção de copiar
      openModal(name, phone);
    });
  });

  // fechar ao clicar no X
  modalClose.addEventListener('click', closeModal);
  // fechar ao clicar fora do conteúdo
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  copyPhone.addEventListener('click', () => {
    const phone = modalPhoneLink.textContent;
    navigator.clipboard.writeText(phone).then(() => {
      // feedback leve
      copyPhone.textContent = 'Copiado';
      setTimeout(() => copyPhone.textContent = 'Copiar', 1500);
    }).catch(()=> alert('Não foi possível copiar.'));
  });

  // tentativa de iniciar ligação via tel: a partir do modal (pode abrir app no desktop)
  modalCallNow.addEventListener('click', () => {
    const phone = modalPhoneLink.textContent;
    try {
      window.open(`tel:${phone}`);
    } catch (e) {
      alert('Não foi possível iniciar a chamada diretamente. Copie o número.');
    }
  });
}

// sidebar interactions (updated: close on link click and focus login)
function setupSidebar() {
  const toggle = document.querySelector('.sidebar-toggle');
  const sidebar = document.getElementById('sideBar');
  const overlay = document.getElementById('sidebarOverlay');
  const closeBtn = sidebar.querySelector('.sidebar-close');

  function open() {
    sidebar.classList.add('open');
    overlay.classList.add('open');
    sidebar.setAttribute('aria-hidden', 'false');
    overlay.setAttribute('aria-hidden', 'false');
  }
  function close() {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
    sidebar.setAttribute('aria-hidden', 'true');
    overlay.setAttribute('aria-hidden', 'true');
  }

  toggle.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', close);

  // close sidebar when a sidebar link is clicked and scroll to target
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', (e) => {
      // allow normal anchor navigation to section
      close();
      const href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        const id = href.substring(1);
        const alvo = document.getElementById(id);
        if (alvo) {
          // show target section (same behavior as top links)
          document.querySelectorAll('.secao').forEach(sec => sec.style.display = 'none');
          alvo.style.display = 'block';
          window.scrollTo({ top: alvo.offsetTop - 20, behavior: 'smooth' });
          // if target is login, focus first input
          if (id === 'login') {
            const input = document.querySelector('#loginForm input[name="email"]');
            if (input) input.focus();
          }
        }
      }
    });
  });
}

// Simple login + settings + pedidos UI (updated to sync sidebar profile)
function setupUserAndSettings() {
  const loginForm = document.getElementById('loginForm');
  const loginMsg = loginForm.querySelector('.form-msg');
  const logoutBtn = document.getElementById('logoutBtn');
  const requestPasswordBtn = document.getElementById('requestPasswordBtn');

  const sidebarUserEl = document.getElementById('sidebarUser');
  const sidebarUserEmailEl = document.getElementById('sidebarUserEmail');

  const chaveUser = 'swiftly_user_v1';
  const chavePasswords = 'swiftly_passwords_v1';

  function updateSidebarProfile(user) {
    if (!sidebarUserEl || !sidebarUserEmailEl) return;
    if (user) {
      sidebarUserEl.textContent = user.email;
      sidebarUserEmailEl.textContent = user.email.includes('@') ? user.email : 'Usuário ativo';
    } else {
      sidebarUserEl.textContent = 'Convidado';
      sidebarUserEmailEl.textContent = 'Faça login para mais opções';
    }
  }

  function updateUIForUser(user) {
    if (user) {
      loginMsg.textContent = 'Logado como ' + user.email;
      logoutBtn.style.display = 'inline-block';
    } else {
      loginMsg.textContent = '';
      logoutBtn.style.display = 'none';
    }
    updateSidebarProfile(user);
  }

  // Request password by e-mail (simulado) — senha gerada uma vez e imutável por 2 minutos
  if (requestPasswordBtn) {
    requestPasswordBtn.addEventListener('click', () => {
      const email = (loginForm.elements['email'] && loginForm.elements['email'].value || '').trim();
      if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        loginMsg.textContent = 'Digite um e-mail válido.';
        return;
      }

      const map = JSON.parse(localStorage.getItem(chavePasswords) || '{}');
      const entry = map[email];
      const now = Date.now();
      const WAIT_MS = 2 * 60 * 1000; // 2 minutos

      if (entry && entry.ts && (now - entry.ts) < WAIT_MS) {
        const remaining = Math.ceil((WAIT_MS - (now - entry.ts)) / 1000);
        loginMsg.textContent = 'Senha já gerada. Aguarde ' + remaining + 's para solicitar nova senha.';
        return;
      }

      // gera senha curta aleatória (apenas para protótipo)
      const generated = Math.random().toString(36).slice(-8) + String(Math.floor(Math.random()*90+10));
      map[email] = { pw: generated, ts: now };
      try {
        localStorage.setItem(chavePasswords, JSON.stringify(map));
      } catch (e) {
        console.warn('Não foi possível salvar a senha:', e);
        loginMsg.textContent = 'Erro ao gerar senha. Tente novamente.';
        return;
      }

      // prepara e tenta abrir o cliente de e-mail (mailto) para envio real pelo usuário
      const subject = 'Swiftly — Sua senha de acesso';
      const body = `Olá,%0A%0ASua senha temporária para acessar o Swiftly é: ${generated}%0A%0AEsta senha foi gerada em ${new Date(now).toLocaleString()} e não poderá ser alterada por 2 minutos.%0A%0AAtenciosamente,%0ASwiftly`;
      const mailto = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${body}`;

      // registra tentativa de envio para rastreio local
      const logKey = 'swiftly_email_log_v1';
      try {
        const logMap = JSON.parse(localStorage.getItem(logKey) || '{}');
        logMap[email] = { lastSentTs: now, method: 'mailto' };
        localStorage.setItem(logKey, JSON.stringify(logMap));
      } catch(e){ console.warn('Não foi possível registrar envio de e-mail', e); }

      // abre o cliente de e-mail do usuário (o envio fica por conta do cliente)
      try { window.location.href = mailto; } catch(e) { console.warn('Não foi possível abrir mailto', e); }

      // melhorar experiência quando o e-mail não é enviado: copiar a senha ao clipboard (se permitido)
      (async () => {
        const resendId = 'resendMailtoBtn';
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(generated);
            loginMsg.innerHTML = 'Senha gerada. A senha foi copiada para a área de transferência. <a href="#" id="' + resendId + '">Reenviar e-mail</a> para abrir o cliente de e-mail novamente.';
          } else {
            loginMsg.innerHTML = 'Senha gerada. <a href="#" id="' + resendId + '">Enviar e-mail</a> para abrir o cliente de e-mail.';
          }
        } catch (err) {
          // clipboard pode falhar (site não seguro, permissão negada, etc.)
          console.warn('Não foi possível copiar a senha para o clipboard', err);
          loginMsg.innerHTML = 'Senha gerada. <a href="#" id="' + resendId + '">Enviar e-mail</a> para abrir o cliente de e-mail. Se não funcionar, copie a senha do log do console.';
        }

        // attach listener ao link de reenvio criado dinamicamente
        const el = loginMsg.querySelector('#' + resendId);
        if (el) {
          el.addEventListener('click', (ev) => {
            ev.preventDefault();
            try { window.location.href = mailto; } catch(e) { console.warn('Não foi possível abrir mailto', e); alert('Não foi possível abrir o cliente de e-mail. Copie a senha da área de transferência.'); }
          });
        }
      })();

      // registrar em console apenas para depuração (não mostrar na interface)
      console.debug('Swiftly: senha gerada para', email, '->', generated);
    });
  }

  // submit do login: valida senha gerada anteriormente e grava sessão simples
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = (loginForm.elements['email'] && loginForm.elements['email'].value || '').trim();
    const password = (loginForm.elements['password'] && loginForm.elements['password'].value) || '';

    if (!email || !password) { loginMsg.textContent = 'Preencha e-mail e senha.'; return; }

    const map = JSON.parse(localStorage.getItem(chavePasswords) || '{}');
    const record = map[email];
    if (!record || !record.pw) { loginMsg.textContent = 'Nenhuma senha gerada para este e-mail. Solicite primeiro.'; return; }
    if (record.pw !== password) { loginMsg.textContent = 'Senha incorreta.'; return; }

    const remember = !!(loginForm.elements['remember'] && loginForm.elements['remember'].checked);
    const user = { email, remember };
    localStorage.setItem(chaveUser, JSON.stringify(user));
    updateUIForUser(user);
  });

  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem(chaveUser);
    updateUIForUser(null);
  });

  // Meus pedidos
  const pedidosList = document.getElementById('pedidosList');
  function renderPedidos() {
    const pedidos = JSON.parse(localStorage.getItem('atestado_pedidos_v1') || '[]');
    const exames = JSON.parse(localStorage.getItem('exames_envios_v1') || '[]');
    if (pedidos.length === 0 && exames.length === 0) {
      pedidosList.textContent = 'Nenhum pedido encontrado.';
      return;
    }
    pedidosList.innerHTML = '';

    // render atestados
    if (pedidos.length) {
      const h = document.createElement('h3'); h.textContent = 'Pedidos de Atestado'; pedidosList.appendChild(h);
      pedidos.forEach((item, idx) => {
        const d = document.createElement('div');
        d.className = 'pedido-item';
        d.innerHTML = `<strong>${item.payload.group || 'Geral'}</strong> — ${new Date(item.date).toLocaleString()}<br>
          <em>Nome:</em> ${item.payload.nome || '-'}<br>
          <em>Contato:</em> ${item.payload.contato || '-'}<br>
          <em>Hospital:</em> ${item.payload.hospital || '-'}<br>
          <em>Dias:</em> ${item.payload.dias || '-'}<br>
          <div class="pedido-actions"><button data-idx="${idx}" class="remove-pedido">Remover</button></div>`;
        pedidosList.appendChild(d);
      });
    }

    // render exames
    if (exames.length) {
      const h2 = document.createElement('h3'); h2.textContent = 'Envios de Exames'; pedidosList.appendChild(h2);
      exames.forEach((item, idx) => {
        const d = document.createElement('div');
        d.className = 'pedido-item';
        const files = (item.payload.files||[]).map(f=>f.name).join(', ');
        d.innerHTML = `<strong>${item.payload.group || 'Geral'}</strong> — ${new Date(item.date).toLocaleString()}<br>
          <em>Nome:</em> ${item.payload.nome || '-'}<br>
          <em>Contato:</em> ${item.payload.contato || '-'}<br>
          <em>Arquivos:</em> ${files || '-'}<br>
          <div class="pedido-actions"><button data-idx="${idx}" class="remove-exame">Remover</button></div>`;
        pedidosList.appendChild(d);
      });
    }

    // attach remove handlers
    document.querySelectorAll('.remove-pedido').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const i = Number(e.target.getAttribute('data-idx'));
        const arr = JSON.parse(localStorage.getItem('atestado_pedidos_v1') || '[]');
        arr.splice(i,1);
        localStorage.setItem('atestado_pedidos_v1', JSON.stringify(arr));
        renderPedidos();
      });
    });
    document.querySelectorAll('.remove-exame').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const i = Number(e.target.getAttribute('data-idx'));
        const arr = JSON.parse(localStorage.getItem('exames_envios_v1') || '[]');
        arr.splice(i,1);
        localStorage.setItem('exames_envios_v1', JSON.stringify(arr));
        renderPedidos();
      });
    });
  }

  // export to CSV
  const exportBtn = document.getElementById('exportPedidos');
  if (exportBtn) exportBtn.addEventListener('click', () => {
    const pedidos = JSON.parse(localStorage.getItem('atestado_pedidos_v1') || '[]');
    const exames = JSON.parse(localStorage.getItem('exames_envios_v1') || '[]');
    const rows = [];
    rows.push(['tipo','grupo','nome','contato','hospital','dias','arquivos','data']);
    pedidos.forEach(p=> rows.push(['atestado', p.payload.group||'', p.payload.nome||'', p.payload.contato||'', p.payload.hospital||'', p.payload.dias||'', '', p.date]));
    exames.forEach(x=> rows.push(['exame', x.payload.group||'', x.payload.nome||'', x.payload.contato||'', '', '', (x.payload.files||[]).map(f=>f.name).join('|'), x.date]));
    const csv = rows.map(r=> r.map(c=> '"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\n');
    const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'pedidos_swiftly.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  });

  const clearBtn = document.getElementById('clearPedidos');
  if (clearBtn) clearBtn.addEventListener('click', () => {
    if (!confirm('Tem certeza que deseja apagar todos os pedidos e exames salvos?')) return;
    localStorage.removeItem('atestado_pedidos_v1');
    localStorage.removeItem('exames_envios_v1');
    renderPedidos();
  });

  // settings
  const settingsForm = document.getElementById('settingsForm');
  const settingsMsg = settingsForm.querySelector('.form-msg');
  const resetSettings = document.getElementById('resetSettings');
  const chaveSettings = 'swiftly_settings_v1';

  function applySettings(obj) {
    if (!obj) return;
    if (obj.theme === 'dark') document.body.classList.add('theme-dark'); else document.body.classList.remove('theme-dark');
    if (obj.accent) {
      document.documentElement.style.setProperty('--accent-color', obj.accent);
      // set data-attribute so CSS helper rules (body[data-accent]) apply darker variations
      try { document.body.setAttribute('data-accent', obj.accent); } catch(e) { /* ignore */ }
    } else {
      document.documentElement.style.removeProperty('--accent-color');
      document.body.removeAttribute('data-accent');
    }
  }

  settingsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(settingsForm);
    const s = { theme: fd.get('theme'), accent: fd.get('accent') };
    localStorage.setItem(chaveSettings, JSON.stringify(s));
    applySettings(s);
    settingsMsg.textContent = 'Configurações salvas.';
  });

  resetSettings.addEventListener('click', () => {
    localStorage.removeItem(chaveSettings);
    applySettings({ theme: 'light', accent: '#0b84ff' });
    settingsMsg.textContent = 'Restaurado.';
  });

  // carregar estado
  const savedUser = JSON.parse(localStorage.getItem(chaveUser) || 'null');
  updateUIForUser(savedUser);
  const savedSettings = JSON.parse(localStorage.getItem(chaveSettings) || 'null');
  applySettings(savedSettings || { theme: 'light', accent: '#0b84ff' });

  // sincroniza valores do formulário de configurações com o estado salvo
  if (settingsForm && savedSettings) {
    settingsForm.elements['theme'].value = savedSettings.theme || 'light';
    settingsForm.elements['accent'].value = savedSettings.accent || '#0b84ff';
  }
}

// chama depois que o DOM estiver pronto
window.addEventListener('DOMContentLoaded', () => {
  handleAtestadoForms();
  handleExameForms();
  setupCallButtons();
  setupSidebar();
  setupUserAndSettings();
});

// avatar change handling (resizes before saving, keeps sidebar visible)
(function(){
  const avatarInput = document.getElementById('avatarInput');
  const changeAvatarBtn = document.getElementById('changeAvatarBtn');
  const sidebarAvatar = document.getElementById('sidebarAvatar');
  const chaveAvatar = 'swiftly_avatar_v1';

  function setAvatarDataURL(data) {
    if (!sidebarAvatar) return;
    sidebarAvatar.src = data;
    sidebarAvatar.style.width = '56px';
    sidebarAvatar.style.height = '56px';
    sidebarAvatar.style.objectFit = 'cover';
    sidebarAvatar.style.borderRadius = '50%';
    const sideInner = document.querySelector('#sideBar .sidebar-inner');
    if (sideInner) sideInner.style.display = '';
  }

  function loadAvatar(){
    try {
      const d = localStorage.getItem(chaveAvatar);
      if (d && sidebarAvatar) setAvatarDataURL(d);
    } catch(e) { /* ignore */ }
  }

  function attach(){
    if (!changeAvatarBtn || !avatarInput || !sidebarAvatar) return;
    changeAvatarBtn.addEventListener('click', (e) => { e.preventDefault(); avatarInput.click(); });

    avatarInput.addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      if (!f.type.startsWith('image/')) { alert('Escolha uma imagem.'); avatarInput.value = ''; return; }

      const reader = new FileReader();
      reader.onload = function(ev){
        const raw = ev.target.result;
        const img = new Image();
        img.onload = function(){
          const max = 256;
          let w = img.width, h = img.height;
          if (w > max || h > max) {
            if (w > h) { h = Math.round(h * (max / w)); w = max; } else { w = Math.round(w * (max / h)); h = max; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img,0,0,w,h);
          const data = canvas.toDataURL('image/jpeg',0.8);
          try { localStorage.setItem(chaveAvatar, data); } catch(e){ console.warn('Avatar muito grande para localStorage'); }
          setAvatarDataURL(data);
          avatarInput.value = '';
        };
        img.onerror = function(){ setAvatarDataURL(raw); avatarInput.value = ''; };
        img.src = raw;
      };
      reader.readAsDataURL(f);
    });
  }

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', () => { loadAvatar(); attach(); }); } else { loadAvatar(); attach(); }
})();
