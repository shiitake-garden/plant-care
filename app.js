// ===== 安心版 app.js =====

// ユーティリティ
function $(id){ return document.getElementById(id); }
function log(msg){ 
  const el = $('debugLog'); 
  if(el){ el.textContent += `[${new Date().toLocaleTimeString()}] ${msg}\n`; } 
  console.log(msg); 
}
function setStatus(msg){ const el = $('status'); if(el) el.textContent = msg; }

// CSVパーサ（RFC4180想定、二重引用対応）
function parseCSV(content){
  const rows=[]; let i=0; const len=content.length; let cur=''; let row=[]; let inQuotes=false;
  while(i<len){
    const ch=content[i];
    if(inQuotes){
      if(ch === '"'){
        if(i+1<len && content[i+1] === '"'){ cur += '"'; i++; }
        else { inQuotes = false; }
      }else{ cur += ch; }
    }else{
      if(ch === '"'){ inQuotes = true; }
      else if(ch === ','){ row.push(cur); cur=''; }
      else if(ch === '\n'){ row.push(cur); rows.push(row); row=[]; cur=''; }
      else if(ch === '\r'){ /* ignore */ }
      else { cur += ch; }
    }
    i++;
  }
  if(cur.length>0 || row.length>0){ row.push(cur); rows.push(row); }
  return rows;
}

// 期待ヘッダー（共通フォーマット）
const HEADERS = ['作物','栽培形態','月','作業','施肥_種類','N(g)','P(g)','K(g)','施肥基準','施肥_メモ','薬剤'];
let master = []; // 表示元データ（配列）

// 行配列 → オブジェクト配列
function rowsToObjects(rows){
  if(!rows || !rows.length){ return []; }
  let start = 0;
  let header = rows[0].map(v => (v||'').trim());

  // ヘッダー完全一致チェック
  const same = header.length === HEADERS.length && header.every((v,i)=> v === HEADERS[i]);
  if(!same){
    // 診断：どの列が足りない/余分か
    const missing = HEADERS.filter(h => !header.includes(h));
    const extra   = header.filter(h => !HEADERS.includes(h));
    let msg = 'CSVヘッダーが想定と異なります。\n'
      + `想定: ${HEADERS.join(',')}\n`
      + `実際: ${header.join(',')}\n`;
    if(missing.length) msg += `不足: ${missing.join(',')}\n`;
    if(extra.length)   msg += `余分: ${extra.join(',')}\n`;
    log(msg);
    alert(msg);
    // ヘッダーが違う場合でも、強制的にHEADERS順に詰め替えを試みる
  } else {
    start = 1;
  }

  // 実データ組み立て
  const out = [];
  for(let r=start; r<rows.length; r++){
    const row = rows[r];
    if(!row || row.length === 0) continue;
    const obj = {};
    for(let i=0; i<HEADERS.length; i++){
      obj[HEADERS[i]] = (row[i] ?? '').trim();
    }
    out.push(obj);
  }
  return out;
}

// 数値セルの見た目調整
function numberOrBlank(v){
  const n = Number(v);
  return Number.isFinite(n) ? n : '';
}

// テーブル描画
function renderTable(data){
  const tbody = document.querySelector('#schedule tbody');
  tbody.innerHTML = '';
  (data || []).forEach(rec=>{
    const tr = document.createElement('tr');
    HEADERS.forEach(key=>{
      const td = document.createElement('td');
      let val = rec[key] ?? '';
      if(['月','N(g)','P(g)','K(g)'].includes(key)) val = numberOrBlank(val);
      td.textContent = val;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

// ドロップダウン生成
function fillMonthOptions(){
  const sel = $('monthFilter');
  sel.innerHTML = '<option value="">（すべて）</option>';
  for(let m=1; m<=12; m++){
    const o = document.createElement('option');
    o.value = String(m);
    o.textContent = String(m);
    sel.appendChild(o);
  }
}

function unique(arr, key){ return [...new Set((arr||[]).map(a=>a[key]).filter(Boolean))]; }

function fillCropOptions(){
  const sel = $('cropFilter');
  sel.innerHTML = '<option value="">（すべて）</option>';
  unique(master, '作物').forEach(v=>{
    const o = document.createElement('option');
    o.value = v; o.textContent = v;
    sel.appendChild(o);
  });
}

// フィルタ適用
function applyFilters(){
  const crop = $('cropFilter').value.trim();
  const month = $('monthFilter').value.trim();
  const kw = $('keyword').value.trim();

  let data = [...master];
  if(crop)  data = data.filter(r => r['作物'] === crop);
  if(month) data = data.filter(r => String(r['月']) === month);
  if(kw){
    const k = kw.toLowerCase();
    const fields = ['作業','施肥_種類','施肥_メモ','薬剤'];
    data = data.filter(r => fields.some(f => String(r[f]||'').toLowerCase().includes(k)));
  }
  renderTable(data);
  setStatus(`表示件数：${data.length}（全${master.length}）`);
}

// CSVダウンロード
function downloadCSV(filename, rows){
  const headerLine = HEADERS.join(',');
  const body = (rows||[]).map(r=>HEADERS.map(h=>{
    const v = String(r[h] ?? '');
    const needsQuote = v.includes(',') || v.includes('\n') || v.includes('"');
    const vv = v.replace(/"/g, '""');
    return needsQuote ? `"${vv}"` : vv;
  }).join(',')).join('\n');
  const csv = headerLine + '\n' + body;
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// 事件（イベント）束ね
function bindEvents(){
  ['cropFilter','monthFilter'].forEach(id=>{
    $(id).addEventListener('change', applyFilters);
  });
  $('keyword').addEventListener('input', applyFilters);

  $('clearFilters').addEventListener('click', ()=>{
    $('cropFilter').value = '';
    $('monthFilter').value = '';
    $('keyword').value = '';
    renderTable(master);
    setStatus(`表示件数：${master.length}（全${master.length}）`);
  });

  $('exportCsv').addEventListener('click', ()=>{
    const crop  = $('cropFilter').value.trim();
    const month = $('monthFilter').value.trim();
    const kw    = $('keyword').value.trim();
    let data = [...master];
    if(crop)  data = data.filter(r => r['作物'] === crop);
    if(month) data = data.filter(r => String(r['月']) === month);
    if(kw){
      const k = kw.toLowerCase();
      const fields = ['作業','施肥_種類','施肥_メモ','薬剤'];
      data = data.filter(r => fields.some(f => String(r[f]||'').toLowerCase().includes(k)));
    }
    const parts = ['schedule'];
    if(crop) parts.push(crop);
    if(month) parts.push(month.padStart ? month.padStart(2,'0') : month);
    downloadCSV(parts.join('_') + '.csv', data);
  });

  // ローカルCSV読込
  $('csvFile').addEventListener('change', (e)=>{
    const file = e.target.files[0]; 
    if(!file){ return; }
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result;
      const rows = parseCSV(text);
      master = rowsToObjects(rows);
      log(`ローカルCSV読込：${master.length}件`);
      fillCropOptions();
      applyFilters();
      setStatus(`✅ CSV読込済み：${master.length}件`);
    };
    reader.readAsText(file, 'utf-8');
  });

  // サンプル読込：fetch → 失敗なら埋め込みにフォールバック
  const SAMPLE_URL = 'fruit_schedule_pot10_no_region.csv';
  const EMBEDDED = 
    '作物,栽培形態,月,作業,施肥_種類,N(g),P(g),K(g),施肥基準,施肥_メモ,薬剤\n'
  + 'レモン,鉢植え,4,春梢管理,緩効性,3,2,3,鉢(10号),少量,\n'
  + 'ブルーベリー,鉢植え,3,元肥,緩効性,3,2,2,鉢(10号),酸性用土,\n';

  $('loadSample').addEventListener('click', ()=>{
    setStatus('読込中...');
    fetch(SAMPLE_URL).then(r=>{
      if(!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.text();
    }).catch(err=>{
      log(`fetch失敗（${err}）。埋め込みサンプルに切替。`);
      return EMBEDDED;
    }).then(text=>{
      const rows = parseCSV(text);
      master = rowsToObjects(rows);
      log(`サンプル読込：${master.length}件`);
      fillCropOptions();
      applyFilters();
      setStatus(`✅ サンプル読込済み：${master.length}件`);
    }).catch(err=>{
      setStatus(`⚠ サンプル読み込みに失敗：${err}`);
      log(`サンプル読込エラー：${err}`);
    });
  });
}

// 初期化
(function init(){
  fillMonthOptions();   // 常時1〜12をセット
  fillCropOptions();    // 空（後で埋める）
  renderTable([]);      // 空表
  setStatus('🔄 CSV未読込：上の「サンプルCSVを読み込む」か「CSVを読み込む」を実行してください。');
  bindEvents();
})();
// ====== ここから自動読込追加（plant.csv を同階層から読む） ======
(function autoLoadPlantCsv(){
  const CSV_URL = 'plant.csv'; // index.html と同じフォルダに置く
  // GitHub Pages 等の http(s) であれば fetch 可。file:// の場合は失敗し得る。
  fetch(CSV_URL, { cache: 'no-store' })
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.text();
    })
    .then(text => {
      const rows = parseCSV(text);
      // 期待ヘッダーとの不一致を診断（安心版の rowsToObjects は警告も出します）
      master = rowsToObjects(rows);
      if (!master || master.length === 0) {
        setStatus('⚠ plant.csv の内容が空のようです。サンプル読込またはCSVを選択してください。');
        log('plant.csv 読込：0件');
        return;
      }
      fillCropOptions();
      applyFilters();
      setStatus(`✅ plant.csv 自動読込：${master.length}件`);
      log(`plant.csv 自動読込：${master.length}件`);
    })
    .catch(err => {
      // 自動読込に失敗しても、既存のUI（サンプル/手動読込）で続行できる
      setStatus(`ℹ plant.csv の自動読込はスキップ：${err}. 「サンプルCSVを読み込む」か「CSVを読み込む」を使ってください。`);
      log(`plant.csv 自動読込エラー：${err}`);
    });
})();

