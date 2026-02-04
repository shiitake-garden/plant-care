// --- Utility: CSV parse ---
function parseCSV(content){
  const rows=[]; let i=0; const len=content.length; let cur=''; let row=[]; let inQuotes=false;
  while(i<len){
    const ch=content[i];
    if(inQuotes){
      if(ch==='"'){
        if(i+1<len && content[i+1]==='"'){cur+='"'; i++;}
        else{inQuotes=false;}
      }else{cur+=ch}
    }else{
      if(ch==='"'){inQuotes=true}
      else if(ch===','){row.push(cur);cur=''}
      else if(ch==='\n'){row.push(cur);rows.push(row);row=[];cur=''}
      else if(ch==='\r'){/* ignore */}
      else{cur+=ch}
    }
    i++;
  }
  if(cur.length>0 || row.length>0){row.push(cur); rows.push(row)}
  return rows;
}

const headers = ['作物','栽培形態','月','作業','施肥_種類','N(g)','P(g)','K(g)','施肥基準','施肥_メモ','薬剤'];
let master=[]; // array of objects

function rowsToObjects(rows){
  // If first row equals headers, use it; else assume our fixed headers
  let start=0; let h=headers;
  if(rows.length && rows[0].length===headers.length && rows[0].every((v,i)=>v.trim()===headers[i])){
    h = rows[0]; start=1;
  }
  const out=[];
  for(let r=start;r<rows.length;r++){
    const row=rows[r]; if(!row.length) continue;
    const obj={};
    for(let i=0;i<h.length;i++) obj[h[i]] = (row[i]??'').trim();
    out.push(obj);
  }
  return out;
}

function numberOrBlank(v){const n=Number(v); return Number.isFinite(n)?n:''}

function renderTable(data){
  const tbody=document.querySelector('#schedule tbody');
  tbody.innerHTML='';
  data.forEach(rec=>{
    const tr=document.createElement('tr');
    headers.forEach(key=>{
      const td=document.createElement('td');
      let val = rec[key]??'';
      if(['N(g)','P(g)','K(g)','月'].includes(key)){
        const n = Number(val); val = Number.isFinite(n)?n:'';
      }
      td.textContent = val;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

function unique(arr, key){return [...new Set(arr.map(a=>a[key]).filter(Boolean))]}

function fillMonthOptions(){
  const monthSel=document.getElementById('monthFilter');
  monthSel.innerHTML='<option value="">（すべて）</option>';
  for(let m=1;m<=12;m++){
    const o=document.createElement('option'); o.value=String(m); o.textContent=String(m); monthSel.appendChild(o);
  }
}

function fillCropOptions(){
  const cropSel=document.getElementById('cropFilter');
  cropSel.innerHTML='<option value="">（すべて）</option>';
  unique(master,'作物').forEach(v=>{
    const o=document.createElement('option'); o.value=v; o.textContent=v; cropSel.appendChild(o);
  });
}

function applyFilters(){
  const crop=document.getElementById('cropFilter').value.trim();
  const month=document.getElementById('monthFilter').value.trim();
  const kw=document.getElementById('keyword').value.trim();
  let data=[...master];
  if(crop) data=data.filter(r=>r['作物']===crop);
  if(month) data=data.filter(r=>String(r['月'])===month);
  if(kw){
    const k=kw.toLowerCase();
    data=data.filter(r=>['作業','施肥_種類','施肥_メモ','薬剤'].some(f=>String(r[f]||'').toLowerCase().includes(k)));
  }
  renderTable(data);
}

function setStatus(msg){
  const el=document.getElementById('status'); if(el) el.textContent=msg;
}

// Events
['cropFilter','monthFilter'].forEach(id=>{
  document.getElementById(id).addEventListener('change', applyFilters);
});

document.getElementById('keyword').addEventListener('input', applyFilters);

document.getElementById('clearFilters').addEventListener('click',()=>{
  document.getElementById('cropFilter').value='';
  document.getElementById('monthFilter').value='';
  document.getElementById('keyword').value='';
  renderTable(master);
});

function downloadCSV(filename, rows){
  const headerLine = headers.join(',');
  const body = rows.map(r=>headers.map(h=>{
    const v=String(r[h]??'');
    const needsQuote = v.includes(',')||v.includes('\n')||v.includes('"');
    const vv = v.replace(/"/g,'""');
    return needsQuote?`"${vv}"`:vv;
  }).join(',')).join('\n');
  const csv = headerLine+'\n'+body;
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=filename; a.click();
  URL.revokeObjectURL(url);
}

document.getElementById('exportCsv').addEventListener('click',()=>{
  const crop=document.getElementById('cropFilter').value.trim();
  const month=document.getElementById('monthFilter').value.trim();
  const kw=document.getElementById('keyword').value.trim();
  let data=[...master];
  if(crop) data=data.filter(r=>r['作物']===crop);
  if(month) data=data.filter(r=>String(r['月'])===month);
  if(kw){
    const k=kw.toLowerCase();
    data=data.filter(r=>['作業','施肥_種類','施肥_メモ','薬剤'].some(f=>String(r[f]||'').toLowerCase().includes(k)));
  }
  const nameParts=['schedule'];
  if(crop) nameParts.push(crop);
  if(month) nameParts.push(month.padStart?month.padStart(2,'0'):month);
  downloadCSV(nameParts.join('_')+'.csv', data);
});

// File input load
const fileInput=document.getElementById('csvFile');
fileInput.addEventListener('change', (e)=>{
  const file=e.target.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=()=>{
    const rows=parseCSV(reader.result);
    master = rowsToObjects(rows);
    fillCropOptions();
    applyFilters();
    setStatus('✅ CSV読込済み：'+(master.length)+'件');
  };
  reader.readAsText(file, 'utf-8');
});

// Sample CSV (embedded fallback to avoid file:// fetch CORS)
const EMBEDDED_SAMPLE = `作物,栽培形態,月,作業,施肥_種類,N(g),P(g),K(g),施肥基準,施肥_メモ,薬剤\nレモン,鉢植え,4,春梢管理,緩効性,3,2,3,鉢(10号),少量,\nブルーベリー,鉢植え,3,元肥,緩効性,3,2,2,鉢(10号),酸性用土,\n`;

const SAMPLE_CSV_URL = 'fruit_schedule_pot10_no_region.csv';

document.getElementById('loadSample').addEventListener('click',()=>{
  // Try fetch first (if same-folder hosting), else fallback to embedded
  fetch(SAMPLE_CSV_URL).then(r=>{
    if(!r.ok) throw new Error('HTTP '+r.status);
    return r.text();
  }).catch(()=> EMBEDDED_SAMPLE).then(text=>{
    const rows=parseCSV(text);
    master=rowsToObjects(rows);
    fillCropOptions();
    applyFilters();
    setStatus('✅ サンプル読込済み：'+(master.length)+'件');
  }).catch(err=>{
    setStatus('⚠ サンプル読み込みに失敗：'+err);
  })
});

// Initialize
fillMonthOptions();
fillCropOptions(); // empty at first
renderTable([]);
setStatus('🔄 CSV未読込：上の「サンプルCSVを読み込む」か「CSVを読み込む」を実行してください。');
