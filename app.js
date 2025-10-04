// app.js - PWA frontend completo para TimeWork
// (pegalo entero en tu archivo app.js)

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

  // localStorage keys
  const LS_API = 'tw_api_url_v1';
  const LS_TOKEN = 'tw_api_token_v1';

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

  function timeNowHHmm() {
    const d = new Date();
    return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }

  function fracToHHMM(frac) {
    if (!frac && frac !== 0) return '00:00';
    const totalMin = Math.round(frac * 24 * 60);
    const hh = Math.floor(totalMin / 60);
    const mm = totalMin % 60;
    return ('0' + hh).slice(-2) + ':' + ('0' + mm).slice(-2);
  }

  function formatDateHuman(isoDate) {
    if (!isoDate) return '';
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return isoDate;
    return d.toLocaleDateString();
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

  // ---------- Fetch month totals (GET) ----------
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
    const j = await resp.json();
    return j;
  }

  // ---------- Render helpers ----------
  function renderDailyFromMonthData(monthJson) {
    // show date
    if (d_date) d_date.textContent = (new Date()).toLocaleDateString();

    // prefer daily_summary if present
    const ds = (monthJson && monthJson.daily_summary) ? monthJson.daily_summary : null;

    function showOrDash(value, driveHint) {
      if (value === null || value === undefined || value === '') {
        return driveHint ? '— (editar en Drive)' : '—';
      }
      return value;
    }

    // entrada / salida / descanso: use daily_summary if available
    if (ds) {
      if (d_entry) d_entry.textContent = showOrDash(ds.entrada, true);
      if (d_exit) d_exit.textContent = showOrDash(ds.salida, true);
      if (d_total_break) d_total_break.textContent = showOrDash(ds.descanso_total, true);
      if (d_used_break) d_used_break.textContent = showOrDash(ds.descanso_usado, true);
      if (d_avail_break) d_avail_break.textContent = showOrDash(ds.descanso_disponible, true);
      if (d_debt) d_debt.textContent = showOrDash(ds.horas_a_deber, true);
      if (d_worked) {
        // prefer daily_summary.trabajado_total, else fallback to days array for today
        if (ds.trabajado_total) d_worked.textContent = ds.trabajado_total;
        else {
          // fallback: search today's worked_text
          const today = isoToday();
          const dayObj = (monthJson && monthJson.days) ? monthJson.days.find(x => x.date === today) : null;
          d_worked.textContent = dayObj ? (dayObj.worked_text || '00:00') : '00:00';
        }
      }
    } else {
      // no daily summary: show default/hints and worked total from month data
      if (d_entry) d_entry.textContent = '— (editar en Drive)';
      if (d_exit) d_exit.textContent = '— (editar en Drive)';
      if (d_total_break) d_total_break.textContent = '— (editar en Drive)';
      if (d_used_break) d_used_break.textContent = '— (editar en Drive)';
      if (d_avail_break) d_avail_break.textContent = '—';
      if (d_debt) d_debt.textContent = '—';
      if (d_worked) {
        const today = isoToday();
        const dayObj = (monthJson && monthJson.days) ? monthJson.days.find(x => x.date === today) : null;
        d_worked.textContent = dayObj ? (dayObj.worked_text || '00:00') : '00:00';
      }
    }
  }

  function renderWeeklyFromMonthData(monthJson) {
    if (!weeklyGrid) return;
    weeklyGrid.innerHTML = '';

    const today = new Date();
    // compute Monday of this week
    const wd = today.getDay(); // 0..6 sun..sat
    const offset = (wd === 0) ? -6 : (1 - wd); // make Monday
    const monday = new Date(today);
    monday.setDate(today.getDate() + offset);

    for (let i = 0; i < 5; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const key = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
      const dayObj = (monthJson && monthJson.days) ? monthJson.days.find(x => x.date === key) : null;
      const hours = dayObj ? (dayObj.worked_text || '00:00') : '00:00';

      const container = document.createElement('div');
      container.className = 'week-day';
      container.innerHTML = `<div class="wk-name">${d.toLocaleDateString(undefined, { weekday: 'long' })}</div>
                             <div class="wk-date">${('0' + d.getDate()).slice(-2)}/${('0' + (d.getMonth() + 1)).slice(-2)}</div>
                             <div class="wk-hours">${hours}</div>`;
      weeklyGrid.appendChild(container);
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
    const daysFromGridStartToLast = Math.round((lastOfMonth.getTime() - gridStart.getTime()) / (24 * 3600 * 1000)) + 1;
    const weeksNeeded = Math.min(6, Math.max(1, Math.ceil(daysFromGridStartToLast / 7)));

    for (let w = 0; w < weeksNeeded; w++) {
      for (let dow = 0; dow < 5; dow++) {
        const d = new Date(gridStart);
        d.setDate(gridStart.getDate() + w * 7 + dow);
        const cell = document.createElement('div');
        cell.className = 'month-cell';
        if (d.getMonth() === monthIndex) {
          const key = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
          const dayObj = (monthJson && monthJson.days) ? monthJson.days.find(x => x.date === key) : null;
          const hoursText = dayObj ? (dayObj.worked_text || '00:00') : '00:00';
          cell.innerHTML = `<div class="date">${('0' + d.getDate()).slice(-2)}/${('0' + (d.getMonth() + 1)).slice(-2)}/${d.getFullYear()}</div>
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
      // set monthLabel
      const [y, m] = monthStr.split('-');
      const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
      if (monthLabel) monthLabel.textContent = d.toLocaleString(undefined, { month: 'long', year: 'numeric' });

      const json = await fetchMonthTotals(monthStr);
      if (!json) {
        if (d_worked) d_worked.textContent = '00:00';
        if (weeklyGrid) weeklyGrid.innerHTML = '';
        if (monthlyGrid) monthlyGrid.innerHTML = '';
        return;
      }
      renderDailyFromMonthData(json);
      renderWeeklyFromMonthData(json);
      buildMonthlyGrid(json, parseInt(y, 10), parseInt(m, 10) - 1);
    } catch (err) {
      console.error('refreshAll err', err);
      // show user friendly alert but avoid spamming
      // alert('Error cargando datos: ' + err.message);
    }
  }

  // ---------- POST helper (form-urlencoded) ----------
  async function postFicha(payload) {
    const url = (apiUrlInput && apiUrlInput.value) ? apiUrlInput.value.trim() : (localStorage.getItem(LS_API) || '').trim();
    const token = (apiTokenInput && apiTokenInput.value) ? apiTokenInput.value.trim() : (localStorage.getItem(LS_TOKEN) || '').trim();
    if (!url) return alert('Configura la API URL en el engranaje');

    // build application/x-www-form-urlencoded body
    const form = new URLSearchParams();
    for (const k in payload) {
      if (Object.prototype.hasOwnProperty.call(payload, k)) {
        const v = payload[k];
        if (v !== undefined && v !== null) form.append(k, String(v));
      }
    }
    if (token) form.append('token', token);

    let resp;
    try {
      resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
        },
        body: form.toString()
      });
    } catch (err) {
      throw new Error('Failed to fetch: ' + err.message);
    }

    const text = await resp.text();
    let json;
    try { json = text ? JSON.parse(text) : {}; } catch (e) { json = { error: text }; }

    if (!resp.ok) {
      throw new Error(json && json.error ? json.error : ('HTTP ' + resp.status));
    }
    if (json && json.ok) return true;
    throw new Error(json && json.error ? json.error : 'Respuesta inesperada del servidor');
  }

  // ---------- Button handlers ----------
  async function onEntryClicked() {
    try {
      if (!confirm('Registrar ENTRADA rápida (nota: WORKING)?')) return;
      const fecha = isoToday();
      const time = timeNowHHmm();
      const payload = { fecha: fecha, entrada: time, salida: time, nota: 'WORKING' };
      await postFicha(payload);
      await refreshAll();
    } catch (err) {
      alert('Error al crear fichaje: ' + err.message);
    }
  }

  function openExitModal() {
    if (!exitModal) return;
    exitModal.classList.remove('hidden');
  }

  function closeExitModal() {
    if (!exitModal) return;
    exitModal.classList.add('hidden');
  }

  async function onExitOptionSelected(note) {
    try {
      const fecha = isoToday();
      const time = timeNowHHmm();
      const payload = { fecha: fecha, entrada: time, salida: time, nota: note };
      closeExitModal();
      await postFicha(payload);
      await refreshAll();
    } catch (err) {
      alert('Error al crear fichaje: ' + err.message);
    }
  }

  // ---------- Month navigation ----------
  function setMonthInputToCurrent() {
    if (!monthInput) return;
    monthInput.value = getMonthStr();
  }

  function shiftMonth(delta) {
    if (!monthInput) return;
    const v = monthInput.value;
    if (!v) return;
    const [y, mm] = v.split('-');
    const d = new Date(parseInt(y, 10), parseInt(mm, 10) - 1, 1);
    d.setMonth(d.getMonth() + delta);
    monthInput.value = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2);
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

    // exit option buttons (expect elements with class .exit-option and data-note attribute)
    document.querySelectorAll('.exit-option').forEach(btn => {
      btn.addEventListener('click', function (e) {
        const note = e.currentTarget.dataset.note || 'BREAK';
        onExitOptionSelected(note);
      });
    });

    if (prevMonth) prevMonth.addEventListener('click', function () { shiftMonth(-1); });
    if (nextMonth) nextMonth.addEventListener('click', function () { shiftMonth(1); });
    if (monthInput) monthInput.addEventListener('change', refreshAll);
  }

  // ---------- Initialization ----------
  document.addEventListener('DOMContentLoaded', function () {
    loadConfig();
    setMonthInputToCurrent();
    wireEvents();
    // refresh view (no alert on failure)
    refreshAll();
  });

  // ---------- Service Worker registration (PWA) ----------
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./service-worker.js')
        .then(reg => {
          console.log('ServiceWorker registrado:', reg.scope);
        })
        .catch(err => {
          console.warn('ServiceWorker NO registrado:', err);
        });
    });
  }

})(); // fin IIFE
