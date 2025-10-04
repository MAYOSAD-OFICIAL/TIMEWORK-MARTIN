// Simple PWA front-end to call your Apps Script API and render results.
// Default API URL and Token already set. You can change them in the UI.

const inpApi = document.getElementById('inpApi');
const inpToken = document.getElementById('inpToken');
const inpMonth = document.getElementById('inpMonth');
const btnSave = document.getElementById('btnSave');
const btnLoad = document.getElementById('btnLoad');
const calendarRoot = document.getElementById('calendarRoot');
const rawJson = document.getElementById('rawJson');

const STORAGE_KEY = 'timework_config_v1';

function loadConfigToUI(){
  const cfg = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  if(cfg.api) inpApi.value = cfg.api;
  if(cfg.token) inpToken.value = cfg.token;
  if(cfg.month) inpMonth.value = cfg.month;
  // if no month, default to current month
  if(!inpMonth.value){
    const now = new Date();
    inpMonth.value = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  }
}
function saveConfigFromUI(){
  const cfg = { api: inpApi.value.trim(), token: inpToken.value.trim(), month: inpMonth.value };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  alert('Configuración guardada localmente.');
}
function isoMonthFromInput(m){
  // month input format is YYYY-MM, we use the same
  return m;
}

async function loadTotals(){
  calendarRoot.innerHTML = 'Cargando...';
  rawJson.style.display = 'none';
  const api = inpApi.value.trim();
  const token = inpToken.value.trim();
  const month = isoMonthFromInput(inpMonth.value);
  if(!api || !token || !month){ alert('Rellena API URL, Token y Mes.'); calendarRoot.innerHTML=''; return; }

  const q = `${api}?month=${encodeURIComponent(month)}&token=${encodeURIComponent(token)}`;
  try{
    const resp = await fetch(q);
    if(!resp.ok){
      const txt = await resp.text();
      calendarRoot.innerHTML = `Error HTTP ${resp.status}: ${txt}`;
      return;
    }
    const json = await resp.json();
    rawJson.textContent = JSON.stringify(json,null,2);
    rawJson.style.display = 'block';
    renderCalendar(json);
  }catch(err){
    calendarRoot.innerHTML = 'Error de conexión: ' + err.message;
  }
}

function renderCalendar(json){
  // json.days => [{date, worked_days_fraction, worked_text}, ...]
  const days = json.days || [];
  // create grid of 5 columns (LUNES..VIERNES), order by date
  const container = document.createElement('div');
  container.className = 'calendar';
  // find first weekday of month and layout like earlier script (grid Monday..Friday)
  // We'll simply render each actual day as a cell in order, grouping by weeks of 5 days.
  // Simpler: show rows of 5 from the list — visually ok for PWA.
  for(let i=0;i<days.length;i++){
    const d = days[i];
    const div = document.createElement('div');
    div.className = 'cell';
    const dt = document.createElement('div');
    dt.className = 'date';
    dt.textContent = d.date;
    const hr = document.createElement('div');
    hr.className = 'hours';
    hr.textContent = d.worked_text || '00:00';
    div.appendChild(dt);
    div.appendChild(hr);
    container.appendChild(div);
  }
  calendarRoot.innerHTML = '';
  calendarRoot.appendChild(container);
}

btnSave.addEventListener('click', saveConfigFromUI);
btnLoad.addEventListener('click', loadTotals);

// init
loadConfigToUI();
