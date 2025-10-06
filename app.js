// app.js - PWA frontend completo (modelo abrir/cerrar fila)

(function () {
  'use strict';

  // ---------- Selectores ----------
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
  const exitFinish = document.getElementById('exitFinish'); // <— NUEVO: botón FIN JORNADA

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

  // ---------- localStorage keys ----------
  const LS_API = 'tw_api_url_v1';
  const LS_TOKEN = 'tw_api_token_v1';
  const LS_ACTIVE = 'tw_active_v1'; // { note: 'WORKING'|'DESAYUNO'|'ALMUERZO'|'COMIDA'|'BREAK', ts:number }

  // ---- utilidades de fecha/tiempo ----
  function getMonthStr() {
    const d = new Date();
    const y = d.getFullYear();
    const m = ('0' + (d.getMonth() + 1)).slice(-2);
    return `${y}-${m}`;
  }
  function isoToday() {
    const d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function timeNowHHMMSS() {
    const d = new Date();
    return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + ':' + ('0' + d.getSeconds()).slice(-2);
  }

  // ---------- Config load/save ----------
  function loadConfig() {
    try {
      const url = localStorage.getItem(LS_API) || '';
      const token = localStorage.getItem(LS_TOKEN) || '';
      if (apiUrlInput) apiUrlInput.value = url;
      if (apiTokenInput) apiTokenInput.value = token;
    } catch (err) {
      console.warn('loadConfig err', err);
    }
  }
  function saveConfig() {
    try {
      if (apiUrlInput) localStorage.setItem(LS_API, apiUrlInput.value.trim());
      if (apiTokenInput) localStorage.setItem(LS_TOKEN, apiTokenInput.value.trim());
      alert('Configuración guardada.');
    } catch (err) {
      console.warn('saveConfig err', err);
    }
  }
  function toggleConfig() {
    if (!configPanel) return;
    configPanel.classList.toggle('hidden');
  }

  // ---------- Helpers activos ----------
  function getActive() {
    try {
      const raw = localStorage.getItem(LS_ACTIVE);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }
  function setActive(obj) { localStorage.setItem(LS_ACTIVE, JSON.stringify(obj)); }
  function clearActive() { localStorage.removeItem(LS_ACTIVE); }

  // ---------- GET: mes ----------
  async function fetchMonthTotals(monthStr) {
    const url = (apiUrlInput && apiUrlInput.value) ? apiUrlInput.value.trim() : (localStorage.getItem(LS_API) || '').trim();
    const token = (apiTokenInput && apiTokenInput.value) ? apiTokenInput.value.trim() : (localStorage.getItem(LS_TOKEN) || '').trim();
    if (!url) {
      console.warn('No API URL configured');
      return null;
    }
    const q = url + '?month=' + encodeURIComponent(monthStr) + (token ? ('&token=' + encodeURIComponent(token)) : '');
    const resp = await fetch(q);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    return await resp.json();
  }

  // ---------- Render ----------
  function renderDailyFromMonthData(monthJson) {
    if (d_date) d_date.textContent = (new Date()).toLocaleDateString();
    const ds = (monthJson && monthJson.daily_summary) ? monthJson.daily_summary : null;
    function showOrDash(v){ return (v===null||v===undefined||v==='') ? '—' : v; }
    if (ds) {
      if (d_entry) d_entry.textContent = showOrDash(ds.entrada);
      if (d_exit) d_exit.textContent = showOrDash(ds.salida);
      if (d_total_break) d_total_break.textContent = showOrDash(ds.descanso_total);
      if (d_used_break) d_used_break.textContent = showOrDash(ds.descanso_usado);
      if (d_avail_break) d_avail_break.textContent = showOrDash(ds.descanso_disponible);
      if (d_debt) d_debt.textContent = showOrDash(ds.horas_a_deber);
      if (d_worked) d_worked.textContent = showOrDash(ds.trabajado_total);
    } else {
      if (d_entry) d_entry.textContent = '—';
      if (d_exit) d_exit.textContent = '—';
      if (d_total_break) d_total_break.textContent = '—';
      if (d_used_break) d_used_break.textContent = '—';
      if (d_avail_break) d_avail_break.textContent = '—';
      if (d_debt) d_debt.textContent = '—';
      if (d_worked) d_worked.textContent = '00:00';
    }
  }

  function renderWeeklyFromMonthData(monthJson) {
    if (!weeklyGrid) return;
    weeklyGrid.innerHTML = '';

    const today = new Date();
    const wd = today.getDay(); // 0..6
    const offset = (wd === 0) ? -6 : (1 - wd);
    const monday = new Date(today); monday.setDate(today.getDate() + offset);

    for (let i = 0; i < 5; i++) {
      const d = new Date(monday); d.setDate(monday.getDate() + i);
      const key = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
      const dayObj = (monthJson && monthJson.days) ? monthJson.days.find(x => x.date === key) : null;
      const hours = dayObj ? (dayObj.worked_text || '00:00') : '00:00';

      const el = document.createElement('div');
      el.className = 'week-day';
      el.innerHTML = `<div class="wk-name">${d.toLocaleDateString(undefined,{weekday:'long'})}</div>
                      <div class="wk-date">${('0'+d.getDate()).slice(-2)}/${('0'+(d.getMonth()+1)).slice(-2)}</div>
                      <div class="wk-hours">${hours}</div>`;
      weeklyGrid.appendChild(el);
    }
  }

  function buildMonthlyGrid(monthJson, year, monthIndex) {
    if (!monthlyGrid) return;
    monthlyGrid.innerHTML = '';

    const firstOfMonth = new Date(year, monthIndex, 1);
    const weekday = firstOfMonth.getDay(); // 0 sun
    const offsetToMonday = (weekday === 0) ? -6 : (1 - weekday);
    const gridStart = new Date(firstOfMonth);
    gridStart.setDate(firstOfMonth.getDate() + offsetToMonday);

    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const lastOfMonth = new Date(year, monthIndex, daysInMonth);
    const daysFromGridStartToLast = Math.round((lastOfMonth.getTime() - gridStart.getTime()) / (24*3600*1000)) + 1;
    const weeksNeeded = Math.min(6, Math.max(1, Math.ceil(daysFromGridStartToLast / 7)));

    for (let w=0; w<weeksNeeded; w++){
      for (let dow=0; dow<5; dow++){
        const d = new Date(gridStart);
        d.setDate(gridStart.getDate() + w*7 + dow);
        const cell = document.createElement('div');
        cell.className = 'month-cell';
        if (d.getMonth() === monthIndex) {
          const key = d.getFullYear() + '-' + ('0'+(d.getMonth()+1)).slice(-2) + '-' + ('0'+d.getDate()).slice(-2);
          const dayObj = (monthJson && monthJson.days) ? monthJson.days.find(x => x.date === key) : null;
          const hoursText = dayObj ? (dayObj.worked_text || '00:00') : '00:00';
          cell.innerHTML = `<div class="date">${('0'+d.getDate()).slice(-2)}/${('0'+(d.getMonth()+1)).slice(-2)}/${d.getFullYear()}</div>
                            <div class="hours">${hoursText}</div>`;
        } else {
          cell.innerHTML = `<div class="date"></div><div class="hours"></div>`;
        }
        monthlyGrid.appendChild(cell);
      }
    }
  }

  // ---------- Refresh full view ----------
  async function refreshAll() {
    try {
      const monthStr = (monthInput && monthInput.value) ? monthInput.value : getMonthStr();
      const [y, m] = monthStr.split('-');
      const d = new Date(parseInt(y,10), parseInt(m,10)-1, 1);
      if (monthLabel) monthLabel.textContent = d.toLocaleString(undefined,{month:'long',year:'numeric'});

      const json = await fetchMonthTotals(monthStr);
      if (!json) { return; }
      renderDailyFromMonthData(json);
      renderWeeklyFromMonthData(json);
      buildMonthlyGrid(json, parseInt(y,10), parseInt(m,10)-1);
    } catch (err) {
      console.error('refreshAll err', err);
    }
  }

  // ---------- API open/close ----------
  function getApiCfg(){
    const url = (apiUrlInput && apiUrlInput.value) ? apiUrlInput.value.trim() : (localStorage.getItem(LS_API) || '').trim();
    const token = (apiTokenInput && apiTokenInput.value) ? apiTokenInput.value.trim() : (localStorage.getItem(LS_TOKEN) || '').trim();
    if(!url) throw new Error('Configura la API URL');
    return { url, token };
  }

  // POST sin headers usando URLSearchParams (evita preflight)
  async function apiOpen(ts, note){
    const { url, token } = getApiCfg();
    const d = new Date(ts);
    const p = new URLSearchParams();
    p.set('action','open');
    p.set('fecha', `${d.getFullYear()}-${('0'+(d.getMonth()+1)).slice(-2)}-${('0'+d.getDate()).slice(-2)}`);
    p.set('entrada_time', `${('0'+d.getHours()).slice(-2)}:${('0'+d.getMinutes()).slice(-2)}:${('0'+d.getSeconds()).slice(-2)}`);
    p.set('nota', note);
    if(token) p.set('token', token);

    const resp = await fetch(url, { method:'POST', body: p });
    let json = {};
    try { json = await resp.json(); } catch { }
    if(!resp.ok || !json.ok) throw new Error((json && json.error) || 'Error open');
    return json; // {ok:true, row:n, ...}
  }

  // POST sin headers usando URLSearchParams (evita preflight)
  async function apiClose(ts, note){
    const { url, token } = getApiCfg();
    const d = new Date(ts);
    const p = new URLSearchParams();
    p.set('action','close_last');
    p.set('fecha', `${d.getFullYear()}-${('0'+(d.getMonth()+1)).slice(-2)}-${('0'+d.getDate()).slice(-2)}`);
    p.set('salida_time', `${('0'+d.getHours()).slice(-2)}:${('0'+d.getMinutes()).slice(-2)}:${('0'+d.getSeconds()).slice(-2)}`);
    p.set('nota', note);
    if(token) p.set('token', token);

    const resp = await fetch(url, { method:'POST', body: p });
    let json = {};
    try { json = await resp.json(); } catch { }
    if(!resp.ok || !json.ok) throw new Error((json && json.error) || 'Error close_last');
    return json;
  }

  // ---------- Botones ENTRADA/SALIDA ----------
  async function onEntryClicked() {
    try {
      const active = getActive();
      const now = new Date();

      if(!active){
        const j = await apiOpen(now.getTime(), 'WORKING');
        setActive({ note:'WORKING', ts: now.getTime() });
        toast(`ENTRADA (fila ${j.row || '?'})`);
      } else if(active.note !== 'WORKING'){
        const jc = await apiClose(now.getTime(), active.note);
        const jo = await apiOpen(now.getTime(), 'WORKING');
        setActive({ note:'WORKING', ts: now.getTime() });
        toast(`Fin de ${active.note} (fila ${jc.row || '?'}) · Inicio WORKING (fila ${jo.row || '?'})`);
      } else {
        toast('Ya estás en WORKING.');
      }
      await refreshAll();
    } catch (err) {
      alert('Error ENTRADA: ' + err.message);
    }
  }

  function openExitModal() { if(exitModal) exitModal.classList.remove('hidden'); }
  function closeExitModal(){ if(exitModal) exitModal.classList.add('hidden'); }

  async function onExitOptionSelected(note){
    try{
      const active = getActive();
      const now = new Date();

      if(active && active.note === 'WORKING'){
        const jc = await apiClose(now.getTime(), 'WORKING');
        const jo = await apiOpen(now.getTime(), note);
        setActive({ note, ts: now.getTime() });
        toast(`Fin WORKING (fila ${jc.row || '?'}) · Inicio ${note} (fila ${jo.row || '?'})`);
      } else if(active && active.note !== 'WORKING'){
        const jc = await apiClose(now.getTime(), active.note);
        const jo = await apiOpen(now.getTime(), note);
        setActive({ note, ts: now.getTime() });
        toast(`Cambio ${active.note}→${note} (cerrada fila ${jc.row || '?'}, abierta fila ${jo.row || '?'})`);
      } else {
        const jo = await apiOpen(now.getTime(), note);
        setActive({ note, ts: now.getTime() });
        toast(`Inicio de ${note} (fila ${jo.row || '?'})`);
      }

      closeExitModal();
      await refreshAll();
    } catch(err){
      alert('Error SALIDA: ' + err.message);
    }
  }

  // ---------- NUEVO: Fin de jornada (cierra lo abierto y no abre nada) ----------
  async function onFinishDay(){
    try{
      const active = getActive();
      const now = new Date();

      if(!active){
        toast('No hay nada abierto. Jornada ya finalizada.');
        closeExitModal();
        return;
      }

      // Si estás en descanso, confirmamos antes de cerrar
      if(active.note !== 'WORKING'){
        const ok = confirm(`Estás en ${active.note}. ¿Cerrar este descanso y finalizar la jornada?`);
        if(!ok) return;
      }

      try {
        const jc = await apiClose(now.getTime(), active.note);
        toast(`Cerrado ${active.note} (fila ${jc.row || '?'}) · Jornada finalizada.`);
      } catch(e) {
        console.warn('No se encontró fila abierta para cerrar. Continúo:', e);
        toast('Jornada finalizada.');
      }

      clearActive();
      closeExitModal();
      await refreshAll();
    } catch(err){
      alert('Error FIN JORNADA: ' + err.message);
    }
  }

  // ---------- Month navigation ----------
  function setMonthInputToCurrent() {
    if (!monthInput) return;
    monthInput.value = getMonthStr();
  }
  function shiftMonth(delta) {
    if (!monthInput) return;
    const v = monthInput.value || getMonthStr();
    const [y, mm] = v.split('-');
    const d = new Date(parseInt(y,10), parseInt(mm,10)-1, 1);
    d.setMonth(d.getMonth()+delta);
    monthInput.value = d.getFullYear() + '-' + ('0'+(d.getMonth()+1)).slice(-2);
    refreshAll();
  }

  // ---------- Event wiring ----------
  function wireEvents() {
    if (gearBtn) gearBtn.addEventListener('click', toggleConfig);
    if (saveConfigBtn) saveConfigBtn.addEventListener('click', saveConfig);
    if (testConfigBtn) testConfigBtn.addEventListener('click', async function () {
      try {
        const url = (apiUrlInput && apiUrlInput.value) ? apiUrlInput.value.trim() : (localStorage.getItem(LS_API) || '').trim();
        const token = (apiTokenInput && apiTokenInput.value) ? apiTokenInput.value.trim() : (localStorage.getItem(LS_TOKEN) || '').trim();
        if (!url) return alert('Introduce API URL');
        const resp = await fetch(url + '?month=' + encodeURIComponent((monthInput && monthInput.value) ? monthInput.value : getMonthStr()) + (token ? ('&token=' + encodeURIComponent(token)) : ''));
        const j = await resp.json();
        alert('Respuesta recibida: ' + (j.month || 'OK'));
      } catch (err) {
        alert('Error probando API: ' + (err.message || err));
      }
    });

    if (btnEntry) btnEntry.addEventListener('click', onEntryClicked);
    if (btnExit) btnExit.addEventListener('click', openExitModal);
    if (exitCancel) exitCancel.addEventListener('click', closeExitModal);

    // Importante: solo las opciones con data-note son descansos.
    document.querySelectorAll('.exit-option[data-note]').forEach(btn => {
      btn.addEventListener('click', e => onExitOptionSelected(e.currentTarget.dataset.note));
    });

    // FIN JORNADA
    if (exitFinish) exitFinish.addEventListener('click', onFinishDay);

    if (prevMonth) prevMonth.addEventListener('click', () => shiftMonth(-1));
    if (nextMonth) nextMonth.addEventListener('click', () => shiftMonth(1));
    if (monthInput) monthInput.addEventListener('change', refreshAll);
  }

  // ---------- Init ----------
  document.addEventListener('DOMContentLoaded', function () {
    loadConfig();
    setMonthInputToCurrent();
    wireEvents();
    refreshAll();
  });

  // ---------- Service Worker ----------
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
    });
  }

  // ---------- Mini toast ----------
  let toastTimer = null;
  function toast(msg){
    let el = document.getElementById('tw-toast');
    if(!el){
      el = document.createElement('div');
      el.id = 'tw-toast';
      el.style.position = 'fixed';
      el.style.left = '50%';
      el.style.bottom = '24px';
      el.style.transform = 'translateX(-50%)';
      el.style.background = '#3aa6a4';
      el.style.color = '#fff';
      el.style.padding = '10px 14px';
      el.style.borderRadius = '10px';
      el.style.boxShadow = '0 8px 20px rgba(0,0,0,.15)';
      el.style.zIndex = '9999';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = '1';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(()=>{ el.style.opacity = '0'; }, 1800);
  }

})();
