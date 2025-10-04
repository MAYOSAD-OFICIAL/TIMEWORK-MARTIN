// app.js - frontend PWA para TimeWork (MARTÍN)
// Guarda apiUrl & token en localStorage, GET month totals, POST fichajes (form-urlencoded),
// muestra resumen diario/semana/mes.

(function(){
  // -- selectores (asegúrate que los ids existen en tu index.html)
  const monthInput = document.getElementById('monthInput');
  const apiUrlInput = document.getElementById('apiUrl');
  const apiTokenInput = document.getElementById('apiToken');
  const configPanel = document.getElementById('configPanel');
  const gearBtn = document.getElementById('gearBtn');
  const saveConfigBtn = document.getElementById('saveConfig');
  const testConfigBtn = document.getElementById('testConfig');

  const btnEntry = document.getElementById('btnEntry');
  const btnExit = document.getElementById('btnExit');
  const exitModal = document.getElementById('exitModal');
  const exitCancel = document.getElementById('exitCancel');

  const d_date = document.getElementById('d_date');
  const d_worked = document.getElementById('d_worked');
  const d_entry = document.getElementById('d_entry');
  const d_exit = document.getElementById('d_exit');
  const d_total_break = document.getElementById('d_total_break');
  const d_used_break = document.getElementById('d_used_break');
  const d_avail_break = document.getElementById('d_avail_break');
  const d_debt = document.getElementById('d_debt');

  const weeklyGrid = document.getElementById('weeklyGrid');
  const monthlyGrid = document.getElementById('monthlyGrid');
  const monthLabel = document.getElementById('monthLabel');
  const prevMonth = document.getElementById('prevMonth');
  const nextMonth = document.getElementById('nextMonth');

  // local storage keys
  const LS_API = "tw_api_url_v1";
  const LS_TOKEN = "tw_api_token_v1";

  function $(id){ return document.getElementById(id); }

  // --- FIX: asegurar modal oculto al inicio y comportamiento de cierre ---
  if(exitModal){
    // Forzar oculto en carga (protección contra versiones anteriores que pudieron dejarlo visible)
    exitModal.classList.add('hidden');

    // Cerrar si el usuario hace click en el overlay (clic fuera del cuadro)
    exitModal.addEventListener('click', function(e){
      if(e.target === exitModal){ exitModal.classList.add('hidden'); }
    });

    // Cerrar con Escape
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape' && !exitModal.classList.contains('hidden')){
        exitModal.classList.add('hidden');
      }
    });
  }
  // --- end FIX ---

  // cargar/guardar config
  function loadConfig(){
    const url = localStorage.getItem(LS_API) || "";
    const token = localStorage.getItem(LS_TOKEN) || "";
    if(apiUrlInput) apiUrlInput.value = url;
    if(apiTokenInput) apiTokenInput.value = token;
  }

  function saveConfig(){
    if(apiUrlInput) localStorage.setItem(LS_API, apiUrlInput.value.trim());
    if(apiTokenInput) localStorage.setItem(LS_TOKEN, apiTokenInput.value.trim());
    alert("Configuración guardada.");
    refreshAll();
  }

  function toggleConfig(){
    if(!configPanel) return;
    configPanel.classList.toggle('hidden');
  }

  if(gearBtn) gearBtn.addEventListener('click', toggleConfig);
  if(saveConfigBtn) saveConfigBtn.addEventListener('click', saveConfig);
  if(testConfigBtn) testConfigBtn.addEventListener('click', async function(){
    try{
      const url = apiUrlInput.value.trim();
      const token = apiTokenInput.value.trim();
      if(!url) return alert("Introduce API URL");
      const resp = await fetch(url + '?month=' + getMonthStr() + '&token=' + encodeURIComponent(token));
      const j = await resp.json();
      alert("Respuesta recibida: " + (j.month || "OK"));
    }catch(err){ alert("Error probando API: " + err.message); }
  });

  // meses
  function getMonthStr(){
    const v = monthInput && monthInput.value;
    if(v && v.length===7 && v.indexOf("-")!==-1) return v;
    const d = new Date();
    return d.getFullYear()+"-"+("0"+(d.getMonth()+1)).slice(-2);
  }
  function initMonthInput(){
    if(!monthInput) return;
    monthInput.value = getMonthStr();
  }

  // GET month totals
  async function fetchMonthTotals(monthStr){
    const url = (apiUrlInput && apiUrlInput.value) || localStorage.getItem(LS_API) || "";
    const token = (apiTokenInput && apiTokenInput.value) || localStorage.getItem(LS_TOKEN) || "";
    if(!url) {
      console.warn("No API URL configured");
      return null;
    }
    const q = `${url}?month=${encodeURIComponent(monthStr)}${token?("&token="+encodeURIComponent(token)):""}`;
    const resp = await fetch(q);
    if(!resp.ok) throw new Error("HTTP "+resp.status);
    const j = await resp.json();
    return j;
  }

  // utilidades
  function isoToday(){
    const d = new Date();
    return d.getFullYear()+"-"+("0"+(d.getMonth()+1)).slice(-2)+"-"+("0"+d.getDate()).slice(-2);
  }

  // display daily from API (use daily_summary if present)
  function renderDailyFromMonthData(monthJson){
    if(!d_date) return;
    d_date.textContent = (new Date()).toLocaleDateString();

    if(monthJson && monthJson.daily_summary){
      const s = monthJson.daily_summary;
      // mostrar datos si existen
      d_worked.textContent = s.trabajado_total || "00:00";
      d_entry.textContent = s.entrada || "—";
      d_exit.textContent = s.salida || "—";
      d_total_break.textContent = s.descanso_total || "—";
      d_used_break.textContent = s.descanso_usado || "—";
      d_avail_break.textContent = s.descanso_disponible || "—";
      d_debt.textContent = s.horas_a_deber || "—";
      if(s.date){
        try {
          const d = new Date(s.date);
          if(!isNaN(d.getTime())) d_date.textContent = d.toLocaleDateString();
        } catch(e){}
      }
    } else {
      // fallback: buscar today in days
      const todayKey = isoToday();
      const entry = (monthJson && monthJson.days) ? monthJson.days.find(x => x.date === todayKey) : null;
      d_worked.textContent = entry ? (entry.worked_text || "00:00") : "00:00";
      d_entry.textContent = "—";
      d_exit.textContent = "—";
      d_total_break.textContent = "—";
      d_used_break.textContent = "—";
      d_avail_break.textContent = "—";
      d_debt.textContent = "—";
    }
  }

  function renderWeeklyFromMonthData(monthJson){
    if(!weeklyGrid) return;
    weeklyGrid.innerHTML = "";
    const today = new Date();
    const wd = today.getDay();
    const offset = (wd === 0) ? -6 : (1 - wd);
    const monday = new Date(today);
    monday.setDate(today.getDate() + offset);

    for(let i=0;i<5;i++){
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const key = d.getFullYear()+"-"+("0"+(d.getMonth()+1)).slice(-2)+"-"+("0"+d.getDate()).slice(-2);
      const dayObj = (monthJson && monthJson.days) ? monthJson.days.find(x => x.date === key) : null;
      const hours = dayObj ? dayObj.worked_text : "00:00";
      const container = document.createElement('div');
      container.className = 'week-day';
      container.innerHTML = `<div class="wk-name">${d.toLocaleDateString(undefined,{ weekday:'long' })}</div>
                             <div class="wk-date">${("0"+d.getDate()).slice(-2)}/${("0"+(d.getMonth()+1)).slice(-2)}</div>
                             <div class="wk-hours">${hours}</div>`;
      weeklyGrid.appendChild(container);
    }
  }

  function buildMonthlyGrid(monthJson, year, monthIndex){
    if(!monthlyGrid) return;
    monthlyGrid.innerHTML = "";
    const firstOfMonth = new Date(year, monthIndex, 1);
    const weekday = firstOfMonth.getDay();
    const offsetToMonday = (weekday === 0) ? -6 : (1 - weekday);
    const gridStart = new Date(firstOfMonth);
    gridStart.setDate(firstOfMonth.getDate() + offsetToMonday);

    const daysInMonth = new Date(year, monthIndex+1, 0).getDate();
    const lastOfMonth = new Date(year, monthIndex, daysInMonth);
    const daysFromGridStartToLast = Math.round((lastOfMonth.getTime()-gridStart.getTime())/(24*3600*1000)) + 1;
    const weeksNeeded = Math.min(6, Math.max(1, Math.ceil(daysFromGridStartToLast/7)));

    for(let w=0; w<weeksNeeded; w++){
      for(let dow=0; dow<5; dow++){
        const d = new Date(gridStart);
        d.setDate(gridStart.getDate() + w*7 + dow);
        const cell = document.createElement('div');
        cell.className = 'month-cell';
        if(d.getMonth() === monthIndex){
          const key = d.getFullYear()+"-"+("0"+(d.getMonth()+1)).slice(-2)+"-"+("0"+d.getDate()).slice(-2);
          const dayObj = (monthJson && monthJson.days) ? monthJson.days.find(x => x.date === key) : null;
          const hoursText = dayObj ? dayObj.worked_text : "00:00";
          cell.innerHTML = `<div class="date">${("0"+d.getDate()).slice(-2)}/${("0"+(d.getMonth()+1)).slice(-2)}/${d.getFullYear()}</div>
                            <div class="hours">${hoursText}</div>`;
        } else {
          cell.innerHTML = `<div class="date"></div><div class="hours"></div>`;
        }
        monthlyGrid.appendChild(cell);
      }
    }
  }

  // reload whole view
  async function refreshAll(){
    try{
      const monthStr = getMonthStr();
      const [y,m] = monthStr.split("-");
      const d = new Date(parseInt(y,10), parseInt(m,10)-1, 1);
      if(monthLabel) monthLabel.textContent = d.toLocaleString(undefined, { month:'long', year:'numeric' });
      const json = await fetchMonthTotals(monthStr);
      if(!json){
        if(d_worked) d_worked.textContent = "00:00";
        if(weeklyGrid) weeklyGrid.innerHTML = "";
        if(monthlyGrid) monthlyGrid.innerHTML = "";
        return;
      }
      renderDailyFromMonthData(json);
      renderWeeklyFromMonthData(json);
      buildMonthlyGrid(json, parseInt(y,10), parseInt(m,10)-1);
    } catch(err){
      console.error(err);
      alert("Error cargando datos: " + err.message);
    }
  }

  // POST fichaje -> usamos URLSearchParams para evitar preflight
  async function postFicha(payload){
    const url = (apiUrlInput && apiUrlInput.value) || localStorage.getItem(LS_API) || "";
    const token = (apiTokenInput && apiTokenInput.value) || localStorage.getItem(LS_TOKEN) || "";
    if(!url) return alert("Configura la API URL en el engranaje");

    // construir body x-www-form-urlencoded
    const params = new URLSearchParams();
    for(const k in payload){ if(payload[k] !== undefined && payload[k] !== null) params.append(k, payload[k]); }
    if(token) params.append('token', token);

    const resp = await fetch(url, {
      method: 'POST',
      body: params.toString(),
      // NO setear headers personalizados -> evita preflight en la mayoría de setups
      // browser sets Content-Type to application/x-www-form-urlencoded; charset=UTF-8 automatically
    });
    if(!resp.ok) {
      let txt = await resp.text();
      throw new Error("HTTP "+resp.status + " " + txt);
    }
    const j = await resp.json();
    if(j && j.ok) return true;
    throw new Error(j && j.error ? j.error : "error en servidor");
  }

  // handlers
  if(btnEntry) btnEntry.addEventListener('click', async function(){
    if(!confirm("Registrar ENTRADA rápida (nota: WORKING)?")) return;
    const fecha = isoToday();
    const time = (new Date()).toTimeString().slice(0,8);
    const payload = { fecha: fecha, entrada: time, salida: time, nota: "WORKING" };
    try{
      await postFicha(payload);
      await refreshAll();
    }catch(err){ alert("Error al crear fichaje: " + err.message); }
  });

  if(btnExit) btnExit.addEventListener('click', function(){
    if(exitModal) exitModal.classList.remove('hidden');
  });

  if(exitCancel) exitCancel.addEventListener('click', function(){
    if(exitModal) exitModal.classList.add('hidden');
  });

  document.querySelectorAll('.exit-option').forEach(btn=>{
    btn.addEventListener('click', async function(e){
      const note = e.currentTarget.dataset.note || "BREAK";
      const fecha = isoToday();
      const time = (new Date()).toTimeString().slice(0,8);
      const payload = { fecha: fecha, entrada: time, salida: time, nota: note };
      if(exitModal) exitModal.classList.add('hidden');
      try{
        await postFicha(payload);
        await refreshAll();
      }catch(err){
        alert("Error al crear fichaje: " + err.message);
      }
    });
  });

  if(prevMonth) prevMonth.addEventListener('click', function(){
    const v = monthInput.value;
    if(!v) return;
    const [y,mm] = v.split("-");
    const d = new Date(parseInt(y,10), parseInt(mm,10)-1, 1);
    d.setMonth(d.getMonth() - 1);
    monthInput.value = d.getFullYear() + "-" + ("0"+(d.getMonth()+1)).slice(-2);
    refreshAll();
  });
  if(nextMonth) nextMonth.addEventListener('click', function(){
    const v = monthInput.value;
    if(!v) return;
    const [y,mm] = v.split("-");
    const d = new Date(parseInt(y,10), parseInt(mm,10)-1, 1);
    d.setMonth(d.getMonth() + 1);
    monthInput.value = d.getFullYear() + "-" + ("0"+(d.getMonth()+1)).slice(-2);
    refreshAll();
  });

  if(monthInput) monthInput.addEventListener('change', refreshAll);

  // init
  loadConfig();
  initMonthInput();
  refreshAll();

  // save config on blur (optional)
  if(apiUrlInput) apiUrlInput.addEventListener('blur', saveConfig);
  if(apiTokenInput) apiTokenInput.addEventListener('blur', saveConfig);

  document.addEventListener('DOMContentLoaded', function(){
    loadConfig();
  });

  // registrar service worker (si existe)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('./service-worker.js')
        .then(reg => console.log('ServiceWorker registrado:', reg.scope))
        .catch(err => console.warn('ServiceWorker NO registrado:', err));
    });
  }

})();
