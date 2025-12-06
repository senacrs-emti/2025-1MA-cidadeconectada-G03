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
           
            setTimeout(() => setStatus('', false), 2000);

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

document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', function (event) {
    event.preventDefault();

    const id = this.getAttribute('href').substring(1);
    const alvo = document.getElementById(id);

    if (alvo && alvo.classList.contains('secao')) {
      // Se for uma seção, abre em modal
      const modal = document.getElementById('contentModal');
      const modalBody = document.getElementById('modalBody');
      const modalContent = modal ? modal.querySelector('.modal-content') : null;
      
      if (modal && modalBody) {
        modalBody.innerHTML = alvo.innerHTML;
        
        // Remove classes antigas e adiciona nova baseada no ID
        if (modalContent) {
          modalContent.className = 'modal-content modal-' + id;
        }
        
        modal.setAttribute('aria-hidden', 'false');
        modal.style.display = 'flex';
        
        // Re-aplicar event listeners nos formulários do modal
        handleAtestadoForms();
        handleExameForms();
        setupCallButtons();
      }
    } else if (alvo) {
      // Para outras seções (login, sobre, etc), exibe normalmente
      document.querySelectorAll('.secao').forEach(sec => sec.style.display = 'none');
      alvo.style.display = 'block';
      window.scrollTo({ top: alvo.offsetTop - 20, behavior: 'smooth' });
      
      if (id === 'login') {
        const input = document.querySelector('#loginForm input[name="email"]');
        if (input) input.focus();
      }
    }
  });
});

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
   
      const chave = 'atestado_pedidos_v1';
      const pedidos = JSON.parse(localStorage.getItem(chave) || '[]');
      pedidos.push({payload, date: new Date().toISOString()});
      localStorage.setItem(chave, JSON.stringify(pedidos));

      msg.textContent = 'Pedido enviado. Voltaremos em breve.';
      form.reset();

      
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
         
          const url = `https://www.google.com/maps/search/hospital+Porto+Alegre/@${lat},${lng},13z`;
          window.open(url, '_blank');
        }

        if (!navigator.geolocation) {
          
          const url = `https://www.google.com/maps/search/${encodeURIComponent(payload.hospital + ' Porto Alegre')}`;
          window.open(url, '_blank');
        } else {
         
          navigator.geolocation.getCurrentPosition(function(pos){
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const dist = haversineKm(lat, lng, POA_CENTER.lat, POA_CENTER.lng);

            if (dist <= MAX_KM) {
             
              openPoaSearchAt(lat, lng);
            } else {
             
              msg.textContent = 'Só enviamos pedidos automáticos para hospitais em Porto Alegre. Abrindo busca em POA.';
              
              const url = `https://www.google.com/maps/search/${encodeURIComponent(payload.hospital + ' Porto Alegre')}`;
              window.open(url, '_blank');
            }

          }, function(err){
            
            const url = `https://www.google.com/maps/search/${encodeURIComponent(payload.hospital + ' Porto Alegre')}`;
            window.open(url, '_blank');
          }, { enableHighAccuracy: true, timeout: 7000 });
        }
      }
    });
  });
}

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
 
    modalCallNow.focus();
   
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

      if (/Mobi|Android/i.test(navigator.userAgent)) {
        window.location.href = `tel:${phone}`;
        return;
      }

      openModal(name, phone);
    });
  });

  modalClose.addEventListener('click', closeModal);
  
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  copyPhone.addEventListener('click', () => {
    const phone = modalPhoneLink.textContent;
    navigator.clipboard.writeText(phone).then(() => {
     
      copyPhone.textContent = 'Copiado';
      setTimeout(() => copyPhone.textContent = 'Copiar', 1500);
    }).catch(()=> alert('Não foi possível copiar.'));
  });

  modalCallNow.addEventListener('click', () => {
    const phone = modalPhoneLink.textContent;
    try {
      window.open(`tel:${phone}`);
    } catch (e) {
      alert('Não foi possível iniciar a chamada diretamente. Copie o número.');
    }
  });
}

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

  
  const sidebarCallBtn = document.getElementById('sidebarCallBtn');
  if (sidebarCallBtn) {
    sidebarCallBtn.addEventListener('click', () => {
     
      close();
     
      const hospList = document.querySelector('.hosp-list');
      if (!hospList) return;
      
      const section = hospList.closest('.secao');
      if (section) {
        document.querySelectorAll('.secao').forEach(sec => sec.style.display = 'none');
        section.style.display = 'block';
        window.scrollTo({ top: section.offsetTop - 20, behavior: 'smooth' });
        
        const firstCallBtn = section.querySelector('.call-btn');
        if (firstCallBtn) {
         
          setTimeout(() => { try { firstCallBtn.click(); } catch(e){ console.warn('Falha ao acionar chamada a partir da sidebar', e); } }, 250);
        }
      }
    });
  }

  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', (e) => {
      
      close();
      const href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        const id = href.substring(1);
        const alvo = document.getElementById(id);
        if (alvo) {
         
          document.querySelectorAll('.secao').forEach(sec => sec.style.display = 'none');
          alvo.style.display = 'block';
          window.scrollTo({ top: alvo.offsetTop - 20, behavior: 'smooth' });
          
          if (id === 'login') {
            const input = document.querySelector('#loginForm input[name="email"]');
            if (input) input.focus();
          }
        }
      }
    });
  });
}

function setupUserAndSettings() {
  const loginForm = document.getElementById('loginForm');
  const loginMsg = loginForm.querySelector('.form-msg');
  const logoutBtn = document.getElementById('logoutBtn');
  const requestPasswordBtn = document.getElementById('requestPasswordBtn');

  const sidebarUserEl = document.getElementById('sidebarUser');
  const sidebarUserEmailEl = document.getElementById('sidebarUserEmail');
  const changeAvatarBtn = document.getElementById('changeAvatarBtn');
  const sidebarAvatar = document.getElementById('sidebarAvatar');

  const chaveUser = 'swiftly_user_v1';
  const chavePasswords = 'swiftly_passwords_v1';

  function updateAvatarVisibility(user) {
    if (!changeAvatarBtn) return;
    if (user) {
      changeAvatarBtn.style.display = 'block';
      if (sidebarAvatar) sidebarAvatar.style.display = 'block';
    } else {
      changeAvatarBtn.style.display = 'none';
      if (sidebarAvatar) {
        sidebarAvatar.src = 'https://i.postimg.cc/3x3Q1YkF/avatar-placeholder.png';
        sidebarAvatar.style.display = 'none';
      }
    }
  }

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
    updateAvatarVisibility(user);
  }

  if (requestPasswordBtn) {
    requestPasswordBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const email = (loginForm.elements['email'] && loginForm.elements['email'].value || '').trim();
      if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        loginMsg.textContent = 'Digite um e-mail válido.';
        return;
      }

      const generated = Math.random().toString(36).slice(-8) + String(Math.floor(Math.random()*90+10));
      const map = JSON.parse(localStorage.getItem(chavePasswords) || '{}');
      map[email] = { pw: generated };
      try {
        localStorage.setItem(chavePasswords, JSON.stringify(map));
      } catch (e) {
        console.warn('Não foi possível salvar a senha:', e);
        loginMsg.textContent = 'Erro ao gerar senha. Tente novamente.';
        return;
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(generated).then(() => {
          loginMsg.textContent = 'Senha gerada e copiada para a área de transferência!';
          console.debug('Swiftly: senha gerada para', email, '->', generated);
        }).catch(() => {
          loginMsg.textContent = 'Erro ao copiar para área de transferência. Tente novamente.';
          console.debug('Swiftly: senha gerada para', email, '->', generated);
        });
      } else {
        loginMsg.textContent = 'Navegador não suporta cópia automática.';
        console.debug('Swiftly: senha gerada para', email, '->', generated);
      }
    });
  }

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

  const pedidosList = document.getElementById('pedidosList');
  function renderPedidos() {
    const pedidos = JSON.parse(localStorage.getItem('atestado_pedidos_v1') || '[]');
    const exames = JSON.parse(localStorage.getItem('exames_envios_v1') || '[]');
    if (pedidos.length === 0 && exames.length === 0) {
      pedidosList.textContent = 'Nenhum pedido encontrado.';
      return;
    }
    pedidosList.innerHTML = '';

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

  const settingsForm = document.getElementById('settingsForm');
  const settingsMsg = settingsForm.querySelector('.form-msg');
  const resetSettings = document.getElementById('resetSettings');
  const chaveSettings = 'swiftly_settings_v1';

  function applySettings(obj) {
    if (!obj) return;
    if (obj.theme === 'dark') document.body.classList.add('theme-dark'); else document.body.classList.remove('theme-dark');
    if (obj.accent) {
      document.documentElement.style.setProperty('--accent-color', obj.accent);
      
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

  const savedUser = JSON.parse(localStorage.getItem(chaveUser) || 'null');
  updateUIForUser(savedUser);
  const savedSettings = JSON.parse(localStorage.getItem(chaveSettings) || 'null');
  applySettings(savedSettings || { theme: 'light', accent: '#0b84ff' });

  if (settingsForm && savedSettings) {
    settingsForm.elements['theme'].value = savedSettings.theme || 'light';
    settingsForm.elements['accent'].value = savedSettings.accent || '#0b84ff';
  }
}

window.addEventListener('DOMContentLoaded', () => {
  handleAtestadoForms();
  handleExameForms();
  setupCallButtons();
  setupSidebar();
  setupUserAndSettings();
  
  // Setup do modal de conteúdo
  const contentModal = document.getElementById('contentModal');
  const contentModalClose = contentModal ? contentModal.querySelector('.modal-close') : null;
  
  if (contentModalClose) {
    contentModalClose.addEventListener('click', () => {
      contentModal.setAttribute('aria-hidden', 'true');
      contentModal.style.display = 'none';
    });
  }
  
  if (contentModal) {
    contentModal.addEventListener('click', (e) => {
      if (e.target === contentModal) {
        contentModal.setAttribute('aria-hidden', 'true');
        contentModal.style.display = 'none';
      }
    });
  }
});

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




function setupUserAndSettings() {

  const chaveUser = 'swiftly_user_v1';
  const chavePasswords = 'swiftly_passwords_v1';

  function saveUser(user, remember) {
    const data = JSON.stringify(user);
    if (remember) {
      localStorage.setItem(chaveUser, data);
      sessionStorage.removeItem(chaveUser);
    } else {
      sessionStorage.setItem(chaveUser, data);
      localStorage.removeItem(chaveUser);
    }
  }
  function loadUser() {
    const s = sessionStorage.getItem(chaveUser);
    const l = localStorage.getItem(chaveUser);
    return JSON.parse(s || l || 'null');
  }
  function clearUser() {
    localStorage.removeItem(chaveUser);
    sessionStorage.removeItem(chaveUser);
  }

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
    saveUser(user, remember);
    updateUIForUser(user);
  });

  logoutBtn.addEventListener('click', () => {
    clearUser();
    updateUIForUser(null);
  });

  const savedUser = loadUser();
  updateUIForUser(savedUser);
}
// ...existing code...
function openModal(modal) {
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  const first = modal.querySelector('input, button, a');
  if (first) first.focus();
}
function closeModal(modal) {
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}
document.addEventListener('DOMContentLoaded', () => {
  const loginModal = document.getElementById('loginModal');
  const openLoginBtn = document.getElementById('openLoginBtn'); 
  if (openLoginBtn && loginModal) {
    openLoginBtn.addEventListener('click', () => openModal(loginModal));
  }
  if (loginModal) {
    const modalClose = loginModal.querySelector('.modal-close');
    modalClose && modalClose.addEventListener('click', () => closeModal(loginModal));
    loginModal.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(loginModal); });
    loginModal.addEventListener('click', (e) => { if (e.target === loginModal) closeModal(loginModal); });
  }
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = loginForm.email.value.trim();
      const password = loginForm.password.value;
      const remember = loginForm.remember.checked;
      if (!email || !password) {
        loginForm.querySelector('.form-msg').textContent = 'Preencha e-mail e senha.';
        return;
      }
      const user = { email, remember };
      if (remember) localStorage.setItem('swiftly_user_v1', JSON.stringify(user));
      else sessionStorage.setItem('swiftly_user_v1', JSON.stringify(user));
      loginForm.querySelector('.form-msg').textContent = 'Logado';
      closeModal(document.getElementById('loginModal'));
    });
  }
});