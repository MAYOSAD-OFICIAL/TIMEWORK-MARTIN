// Small PWA frontend for TIMEWORK (client)
// - stores apiUrl & token in localStorage
// - GET month totals from API (doGet)
// - POST quick fichajes (doPost) for entry/exit
// - renders daily, weekly, monthly views (uses doGet response: month -> days[])

(function(){
  // -- selectors
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

  // init
  function $(id){ return document.getElementById(id); }

  function loadConfig(){
    const url = localStorage.getItem(LS_API) || "";
    const token = localStorage.getItem(LS_TOKEN) || "";
    apiUrlInput.value = url;
    apiTokenInput.value = token;
  }

  function saveConfig(){
    localStorage.setItem(LS_API, apiUrlInput.value.trim());
    localStorage.setItem(LS_TOKEN, apiTokenInput.value.trim());
    alert("Configuración guardada.");
  }

  function toggleConfig(){
    configPanel.classList.toggle('hidden');
  }

  gearBtn.addEventListener('click', toggleConfig);
  saveConfigBtn.addEventListener('click', saveConfig);
  testConfigBtn.addEventListener('click', async function(){
    try{
      const url = apiUrlInput.value.trim();
      const token = apiTokenInput.value.trim();
      if(!url) return alert("Introduce API URL");
      const resp = await fetch(url + '?month=' + getMonthStr() + '&token=' + encodeURIComponent(token));
      const j = await resp.json();
      alert("Respuesta recibida: " + (j.month || "OK"));
    }catch(err){ alert("Error probando API: " + err.message); }
  });

  // month utilities
  function getMonthStrFromInput(){
    // monthInput.value is "YYYY-MM"
    return monthInput.value || getMonthStr();
  }
  function getMonthStr(){
    const d = new Date();
    const y = d.getFullYear();
    const m = ("0"+(d.getMonth()+1)).slice(-2);
    return `${y}-${m}`;
  }

  // init month input to current month
  function initMonthInput(){
    const cur = getMonthStr();
    monthInput.value = cur;
  }

  // fetch totals for selected month
  async function fetchMonthTotals(monthStr){
    const url = (apiUrlInput.value || localStorage.getItem(LS_API) || "").trim();
    const token = (apiTokenInput.value || localStorage.getItem(LS_TOKEN) || "").trim();
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

  // format utilities
  function fracToHHMM(frac){
    if(!frac) return "00:00";
    const totalMin = Math.round(frac * 24 * 60);
    const hh = Math.floor(totalMin/60);
    const mm = totalMin % 60;
    return ("0"+hh).slice(-2)+":"+("0"+mm).slice(-2);
  }
  function formatDateHuman(isoDate){
    const d = new Date(isoDate);
    return d.toLocaleDateString();
  }
  function isoToday(){
    const d = new Date();
    return d.getFullYear()+"-"+("0"+(d.getMonth()+1)).slice(-2)+"-"+("0"+d.getDate()).slice(-2);
  }
  function timeNowHHmm(){
    const d = new Date();
    return ("0"+d.getHours()).slice(-2)+":"+("0"+d.getMinutes()).slice(-2);
  }

  // render routines
  function renderDailyFromMonthData(monthJson){
    const todayKey = isoToday();
    d_date.textContent = (new Date()).toLocaleDateString();
    // find today in monthJson.days
    let entry = (monthJson && monthJson.days) ? monthJson.days.find(x => x.date === todayKey) : null;
    if(entry){
      d_worked.textContent = entry.worked_text || "00:00";
    } else {
      d_worked.textContent = "00:00";
    }
    // the rest of "Entrada/Salida/Descanso..." are calculated in the sheet; for now we show hint:
    d_entry.textContent = "— (editar en Drive)";
    d_exit.textContent = "— (editar en Drive)";
    d_total_break.textContent = "— (editar en Drive)";
    d_used_break.textContent = "— (editar en Drive)";
    d_avail_break.textContent = "—";
    d_debt.textContent = "—";
  }

  function renderWeeklyFromMonthData(monthJson){
    weeklyGrid.innerHTML = "";
    // compute week that contains today (Mon..Fri)
    const today = new Date();
    const monday = new Date(today);
    const wd = today.getDay(); // 0..6
    const offset = (wd === 0) ? -6 : (1 - wd);
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
    monthlyGrid.innerHTML = "";
    // monthJson.days gives each day
    // compute first monday before first of month
    const firstOfMonth = new Date(year, monthIndex, 1);
    const weekday = firstOfMonth.getDay(); // 0 sun
    const offsetToMonday = (weekday === 0) ? -6 : (1 - weekday);
    const gridStart = new Date(firstOfMonth);
    gridStart.setDate(firstOfMonth.getDate() + offsetToMonday);

    // we display up to 6 weeks (pairs of rows) but grid is mon-fri per week -> only days Mon..Fri
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

  // load & render full view for current selected month
  async function refreshAll(){
    try{
      const monthStr = getMonthStrFromInput(); // "YYYY-MM"
      // set month label
      const [y,m] = monthStr.split("-");
      const d = new Date(parseInt(y,10), parseInt(m,10)-1, 1);
      monthLabel.textContent = d.toLocaleString(undefined, { month:'long', year:'numeric' });
      // fetch
      const json = await fetchMonthTotals(monthStr);
      if(!json) {
        // clear
        d_worked.textContent = "00:00";
        weeklyGrid.innerHTML = "";
        monthlyGrid.innerHTML = "";
        return;
      }
      renderDailyFromMonthData(json);
      renderWeeklyFromMonthData(json);
      buildMonthlyGrid(json, parseInt(y,10), parseInt(m,10)-1);
    }catch(err){
      console.error(err);
      alert("Error cargando datos: " + err.message);
    }
  }

  // POST helper to add ficha
  async function postFicha(payload){
    const url = (apiUrlInput.value || localStorage.getItem(LS_API) || "").trim();
    const token = (apiTokenInput.value || localStorage.getItem(LS_TOKEN) || "").trim();
    if(!url) return alert("Configura la API URL en el engranaje");
    const p = Object.assign({}, payload);
    if(token) p.token = token;
    const resp = await fetch(url, {
      method:'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(p)
    });
    const j = await resp.json();
    if(j && j.ok) return true;
    throw new Error(j && j.error ? j.error : "error en servidor");
  }

  // button handlers
  btnEntry.addEventListener('click', async function(){
    if(!confirm("Registrar ENTRADA rápida (nota: WORKING)?")) return;
    const fecha = isoToday();
    const time = timeNowHHmm();
    const payload = { fecha: fecha, entrada: time, salida: time, nota: "WORKING" };
    try{
      await postFicha(payload);
      await refreshAll();
    }catch(err){ alert("Error al crear fichaje: " + err.message); }
  });

  btnExit.addEventListener('click', function(){
    exitModal.classList.remove('hidden');
  });

  exitCancel.addEventListener('click', function(){
    exitModal.classList.add('hidden');
  });

  // exit options
  document.querySelectorAll('.exit-option').forEach(btn=>{
    btn.addEventListener('click', async function(e){
      const note = e.currentTarget.dataset.note || "BREAK";
      const fecha = isoToday();
      const time = timeNowHHmm();
      // create a quick record for the break
      const payload = { fecha: fecha, entrada: time, salida: time, nota: note };
      exitModal.classList.add('hidden');
      try{
        await postFicha(payload);
        await refreshAll();
      }catch(err){
        alert("Error al crear fichaje: " + err.message);
      }
    });
  });

  // month nav
  prevMonth.addEventListener('click', function(){
    const v = monthInput.value;
    if(!v) return;
    const [y,mm] = v.split("-");
    const d = new Date(parseInt(y,10), parseInt(mm,10)-1, 1);
    d.setMonth(d.getMonth() - 1);
    monthInput.value = d.getFullYear() + "-" + ("0"+(d.getMonth()+1)).slice(-2);
    refreshAll();
  });
  nextMonth.addEventListener('click', function(){
    const v = monthInput.value;
    if(!v) return;
    const [y,mm] = v.split("-");
    const d = new Date(parseInt(y,10), parseInt(mm,10)-1, 1);
    d.setMonth(d.getMonth() + 1);
    monthInput.value = d.getFullYear() + "-" + ("0"+(d.getMonth()+1)).slice(-2);
    refreshAll();
  });

  monthInput.addEventListener('change', refreshAll);

  // initialization
  loadConfig();
  initMonthInput();
  refreshAll();

  // copy config from inputs to localStorage if saved earlier
  apiUrlInput.addEventListener('blur', ()=>{});
  apiTokenInput.addEventListener('blur', ()=>{});

  // save on load if user previously had values
  document.addEventListener('DOMContentLoaded', function(){
    loadConfig();
  });

})();
