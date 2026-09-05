/* =========================== 市场营销刷题 =========================== */
(function(){
"use strict";
var PAPERS = window.DATA || [];

/* ---------- 存储 ---------- */
var LSKEY = 'mb_records_v1';          // key -> {sel, ok, ts}
var STATEKEY = 'mb_state_v1';         // {paperIndex, mode}
function loadRec(){
  try{ return JSON.parse(localStorage.getItem(LSKEY)) || {}; }catch(e){ return {}; }
}
function saveRec(r){
  try{ localStorage.setItem(LSKEY, JSON.stringify(r)); }catch(e){}
  return r;
}
function loadState(){
  try{ return JSON.parse(localStorage.getItem(STATEKEY)) || {}; }catch(e){ return {}; }
}
function saveState(s){
  try{ localStorage.setItem(STATEKEY, JSON.stringify(s)); }catch(e){}
}
var REC = loadRec();
var STATE = loadState();

/* ---------- 题目构建 ---------- */
function buildItems(pi){
  var p = PAPERS[pi], items = [];
  p.single.forEach(function(q,i){ items.push({sec:'单选', type:'single', q:q, key:'P'+pi+'-s'+i}); });
  p.multi.forEach(function(q,i){ items.push({sec:'多选', type:'multi', q:q, key:'P'+pi+'-m'+i}); });
  p.judge.forEach(function(q,i){ items.push({sec:'判断', type:'judge', q:q, key:'P'+pi+'-j'+i}); });
  p.cases.forEach(function(c,ci){
    c.qs.forEach(function(q,qi){ items.push({sec:'案例', type:'case', q:q, caseTxt:c.text, caseTitle:c.t, key:'P'+pi+'-c'+ci+'-'+qi}); });
  });
  return items;
}

/* 题型 -> 选项字母映射 */
function defaultOpts(type){
  if(type==='judge') return ['√','×'];
  return ['A','B','C','D'];
}
/* 解析答案字符串 -> 字母数组 */
function ansSet(a){ return (a||'').split('').sort().join(''); }

/* 判定作答是否正确 */
function isCorrect(type, q, sel){
  if(!sel) return false;
  if(type==='judge') return sel === q.a;
  if(type==='single') return sel === q.a;
  return ansSet(sel) === ansSet(q.a); // multi / case
}

/* ---------- 视图 ---------- */
var view = document.getElementById('view');
var TAB_BTN = document.querySelectorAll('nav.tabs button');
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function papersTitle(pi){ return PAPERS[pi] ? PAPERS[pi].title : ''; }

/* 当前练习会话 */
var session = null; // {pi, items, pos, mode}

/* 打乱用于随机 */
function shuffle(arr){ var a=arr.slice(); for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;} return a; }

/* 开始一个练习；fresh=true 时先把这些题的旧记录清掉，便于重新作答 */
function startPractice(pi, items, label, fresh){
  if(fresh){
    items.forEach(function(it){ delete REC[it.key]; });
    saveRec(REC);
  }
  session = { pi:pi, items:items, pos:0, mode:label };
  STATE.paperIndex = pi; saveState(STATE);
  switchTab('home');
  renderPractice();
}

/* 从记录生成错题/未做集合 */
function filterItems(pi, kind){
  var all = buildItems(pi);
  if(kind==='wrong') return all.filter(function(it){ var r=REC[it.key]; return r && !r.ok; });
  if(kind==='todo')  return all.filter(function(it){ return !REC[it.key]; });
  return all;
}

/* =========================== 首页 =========================== */
var MODES = [
  {id:'all',   name:'顺序练习', desc:'按试卷顺序逐题练习'},
  {id:'single',name:'单选专练', desc:'只刷单选题'},
  {id:'multi', name:'多选专练', desc:'只刷多选题'},
  {id:'judge', name:'判断专练', desc:'只刷判断题'},
  {id:'case',  name:'案例专练', desc:'只刷案例分析题'},
  {id:'random',name:'随机练习', desc:'打乱顺序随机抽查'},
  {id:'wrong', name:'错题重练', desc:'反复做错题'},
  {id:'todo',  name:'未做重练', desc:'只做还没做过的题'}
];

function renderHome(){
  var pi = STATE.paperIndex||0; pi=Math.min(pi, PAPERS.length-1);
  var done = countDone(pi), total = buildItems(pi).length, acc = accuracy(pi);
  var paperBtns = PAPERS.map(function(p,i){
    return '<button class="btn"'+(i===pi?' primary':'')+' data-paper="'+i+'">'+esc(p.title)+'</button>';
  }).join('');
  var modeBtns = MODES.map(function(m){
    return '<button class="btn" data-mode="'+m.id+'">'+esc(m.name)+'<div class="muted" style="font-size:11px">'+esc(m.desc)+'</div></button>';
  }).join('');

  view.innerHTML =
    '<div class="card"><h2>选择试卷</h2><div class="btnrow" style="gap:8px">'+paperBtns+'</div>'+
    '<div class="muted" style="margin-top:10px">已完成 '+done+'/'+total+' 题 · 正确率 '+acc+'%</div></div>'+
    '<div class="card"><h2>练习模式</h2><div class="grid2">'+modeBtns+'</div></div>'+
    '<div class="footer-note">每道题答完立即显示正确答案与知识点详解。做题记录保存在本机（localStorage），无需联网。</div>';

  view.querySelectorAll('[data-paper]').forEach(function(b){
    b.onclick=function(){ STATE.paperIndex=+b.getAttribute('data-paper'); saveState(STATE); renderHome(); };
  });
  view.querySelectorAll('[data-mode]').forEach(function(b){
    b.onclick=function(){ startMode(b.getAttribute('data-mode')); };
  });
}

function startMode(modeId){
  var pi = STATE.paperIndex||0;
  var all = buildItems(pi);
  var label = '', items = all, fresh = false;
  var m = MODES.filter(function(x){return x.id===modeId;})[0];
  label = m ? m.name : modeId;
  if(modeId==='single'||modeId==='multi'||modeId==='judge'||modeId==='case'){
    var secName = {single:'单选',multi:'多选',judge:'判断',case:'案例'}[modeId];
    items = all.filter(function(it){ return it.sec===secName; });
  }
  if(modeId==='random'){ items = shuffle(all); }
  if(modeId==='wrong'){ items = filterItems(pi,'wrong'); fresh=true; }
  if(modeId==='todo'){ items = filterItems(pi,'todo'); }
  if(!items.length){ view.innerHTML = '<div class="card"><div class="empty">该模式下暂无可练习的题目。</div><button class="btn primary" style="width:100%" onclick="renderHome()">返回</button></div>'; return; }
  startPractice(pi, items, label, fresh);
}
window.renderHome = renderHome;

/* =========================== 刷题视图 =========================== */
function renderPractice(){
  if(!session){ renderHome(); return; }
  var it = session.items[session.pos];
  var total = session.items.length;
  var pos = session.pos+1;

  var secChip = '<span class="chip">'+it.sec+'</span>';
  var prog = Math.round((pos-1)/total*100);

  view.innerHTML =
    '<div class="secbar"><button class="btn sm ghost" id="exitBtn">退出</button><div class="muted">'+esc(session.mode)+'</div>'+
    '<span class="muted">'+pos+'/'+total+'</span></div>'+
    '<div class="progress"><i style="width:'+prog+'%"></i></div>'+
    '<div class="card" style="margin-top:14px">'+
      '<div style="margin-bottom:8px">'+secChip+'</div>'+
      (it.caseTxt ? '<div class="caseBox"><b style="color:#c9b8ff">'+esc(it.caseTitle)+'</b>\n\n'+esc(it.caseTxt)+'</div>' : '')+
      '<div class="qtext">'+esc(it.q.q)+'</div>'+
      '<div class="opts" id="opts"></div>'+
      '<div id="fb"></div>'+
      '<button class="btn primary" id="nextBtn" style="width:100%;margin-top:16px;display:none">下一题 ›</button>'+
    '</div>';
  if(pos>1) view.querySelector('#exitBtn').textContent='←';

  var done = REC[it.key];
  if(done && done.sel){
    buildOptions(it, null, true); // read-only
    showFeedback(it, done.sel, true, false);
    var nb = view.querySelector('#nextBtn'); nb.style.display='block';
  } else {
    buildOptions(it, null, false);
  }

  view.querySelector('#exitBtn').onclick = function(){ session=null; renderHome(); };
  view.querySelector('#nextBtn').onclick = function(){ next(); };
}

/* 构建选项 */
function buildOptions(it, preselected, readonly){
  var box = view.querySelector('#opts');
  box.innerHTML='';
  var q = it.q;
  if(it.type==='judge'){
    var labels=['√','×'];
    labels.forEach(function(l){
      var o = makeOpt(l, l, null, it, readonly);
      box.appendChild(o);
    });
    return;
  }
  // single / multi / case
  var opts = q.o && q.o.length ? q.o : defaultOpts(it.type).map(function(l){return l+'.';});
  opts.forEach(function(o,i){
    var letter = String.fromCharCode(65+i);
    box.appendChild(makeOpt(letter, letter+'. '+o, o, it, readonly));
  });
}

function makeOpt(letter, label, rawText, it, readonly){
  var o = document.createElement('button');
  o.className='opt';
  o.innerHTML='<span class="mark">'+letter+'</span><span>'+esc(label)+'</span>';
  o.addEventListener('click', function(){
    if(readonly || o.disabled) return;
    selectOpt(it, letter, o);
  });
  return o;
}

var currentSelection = { key:null, sel:null, type:null };

function selectOpt(it, letter, o){
  if(it.type==='single'||it.type==='judge'){
    setSel(it, letter);
    return;
  }
  // multi / case: 允许多选
  var box=view.querySelector('#opts');
  box.querySelectorAll('.opt').forEach(function(x){
    if(!x.classList.contains('right') && !x.classList.contains('wrong')){
      x.classList.toggle('sel');
    }
  });
  var sel = box.querySelectorAll('.opt.sel');
  var letters = Array.prototype.map.call(sel, function(x){ return x.querySelector('.mark').textContent; }).sort().join('');
  currentSelection = {key:it.key, sel:letters, type:it.type};
  // 显示确认按钮
  ensureConfirmBtn(it);
}

function ensureConfirmBtn(it){
  var fb = view.querySelector('#fb');
  var nb = view.querySelector('#nextBtn');
  // 若已判分则不重复
  if(REC[it.key] && REC[it.key].sel) { nb.style.display='block'; return; }
  if(!view.querySelector('#confirmBtn')){
    var b = document.createElement('button');
    b.className='btn primary'; b.id='confirmBtn'; b.style.width='100%'; b.style.marginTop='16px';
    b.textContent='确认答案 ✓';
    b.onclick=function(){
      var sel = currentSelection.sel || '';
      if(!sel){ fb.innerHTML='<div class="muted" style="margin-top:10px">请先选择答案</div>'; return; }
      setSel(it, sel);
    };
    fb.appendChild(b);
  }
}

function setSel(it, letters){
  var ok = isCorrect(it.type, it.q, letters);
  REC[it.key] = { sel: letters, ok: ok, ts: Date.now() };
  saveRec(REC);
  currentSelection = { key:null, sel:null, type:null };
  var box = view.querySelector('#opts');
  box.querySelectorAll('.opt').forEach(function(x){ x.disabled=true; });
  buildOptions(it, null, true); // re-render readonly
  showFeedback(it, letters, ok, true);
  var nb = view.querySelector('#nextBtn'); nb.style.display='block';
  var cf = view.querySelector('#confirmBtn'); if(cf) cf.remove();
}

/* 展示：高亮正确/错误选项 + 答案 + 详解 */
function showFeedback(it, letters, ok, enableNext){
  var fb = view.querySelector('#fb');
  var q = it.q;
  var box = view.querySelector('#opts');
  // 高亮正确选项
  var correct = q.a;
  var correctArr = correct.split('');
  var selArr = (letters||'').split('');
  box.querySelectorAll('.opt').forEach(function(x){
    var letter = x.querySelector('.mark').textContent;
    var isRight = correctArr.indexOf(letter)>-1;
    var isSel = selArr.indexOf(letter)>-1;
    if(isRight) x.classList.add('right');
    else if(isSel) x.classList.add('wrong');
  });

  var ansText = ok ? '回答正确' : '回答错误';

  var correctText = it.type==='judge' ? (q.a==='√'?'√（正确）':'×（错误）') : ('正确答案：'+q.a);

  fb.innerHTML =
    '<div class="feedback '+(ok?'ok':'no')+'">'+
      '<div class="ans">'+ansText+'</div>'+
      '<div class="ans" style="font-size:14px;color:'+(ok?'var(--ok)':'var(--bad)')+'">'+correctText+'</div>'+
      (q.note ? '<div class="note"><b>知识点详解</b>　'+esc(q.note)+'</div>' : '')+
    '</div>';
}

function next(){
  if(!session) return;
  if(session.pos < session.items.length-1){
    session.pos++;
    renderPractice();
  } else {
    var wrong = session.items.filter(function(it){ var r=REC[it.key]; return r && !r.ok; }).length;
    var done = session.items.filter(function(it){ return REC[it.key]; }).length;
    view.innerHTML =
      '<div class="card" style="text-align:center;padding:30px 18px">'+
        '<h2 style="font-size:20px">本组练习完成 🎉</h2>'+
        '<div class="muted" style="margin:10px 0">共 '+session.items.length+' 题</div>'+
        '<div class="stat">'+
          '<div class="box"><div class="n">'+done+'</div><div class="t">已作答</div></div>'+
          '<div class="box"><div class="n" style="color:var(--ok)">'+(done-wrong)+'</div><div class="t">答对</div></div>'+
          '<div class="box"><div class="n" style="color:var(--bad)">'+wrong+'</div><div class="t">答错</div></div>'+
        '</div>'+
        '<div class="btnrow" style="justify-content:center;margin-top:12px">'+
          '<button class="btn" id="againBtn">再来一组</button>'+
          '<button class="btn primary" id="backBtn">返回首页</button>'+
        '</div>'+
      '</div>';
    view.querySelector('#againBtn').onclick=function(){ session=null; renderHome(); };
    view.querySelector('#backBtn').onclick=function(){ session=null; renderHome(); };
  }
}

/* =========================== 错题本 =========================== */
function renderReview(){
  var pi = STATE.paperIndex||0;
  var p = PAPERS[pi];
  var all = buildItems(pi);
  var wrong = all.filter(function(it){ var r=REC[it.key]; return r && !r.ok; });
  var parts = ['<div class="card"><h2>错题本 · '+esc(p.title)+'</h2>'];
  if(!wrong.length){
    parts.push('<div class="empty">太棒了，暂无错题！🎉</div>');
  } else {
    parts.push('<div class="muted" style="margin-bottom:12px">共 '+wrong.length+' 道错题，点击重新作答。</div>');
    wrong.forEach(function(it){
      var r = REC[it.key];
      parts.push('<div class="row" data-key="'+it.key+'">'+
        '<span class="tag">'+it.sec+'</span>'+
        '<div class="t">'+esc(it.q.q)+'</div>'+
        '<span class="mark no">✕</span>'+
      '</div>');
    });
  }
  parts.push('<div class="btnrow" style="margin-top:8px">'+
    '<button class="btn" id="retryRow">重练错题</button>'+
    '<button class="btn ghost" id="clearWrong">清空错题记录</button>'+
  '</div></div>');
  view.innerHTML = parts.join('');

  view.querySelectorAll('[data-key]').forEach(function(row){
    row.onclick=function(){ startPractice(pi, [findItem(pi, row.getAttribute('data-key'))], '错题复习', true); };
  });
  view.querySelector('#retryRow').onclick=function(){ startMode('wrong'); };
  view.querySelector('#clearWrong').onclick=function(){
    buildItems(pi).forEach(function(it){ delete REC[it.key]; });
    saveRec(REC); renderReview();
  };
}

function findItem(pi, key){
  var it = buildItems(pi).filter(function(x){return x.key===key;})[0];
  return it || {sec:'单选', type:'single', q:{q:'',o:[],a:'',note:''}, key:key};
}

/* =========================== 统计 =========================== */
function countDone(pi){ var c=0; buildItems(pi).forEach(function(it){ if(REC[it.key]) c++; }); return c; }
function accuracy(pi){
  var d=0,c=0; buildItems(pi).forEach(function(it){ var r=REC[it.key]; if(r){ d++; if(r.ok) c++; } });
  return d? Math.round(c/d*100) : 0;
}
function renderStat(){
  var pi = STATE.paperIndex||0;
  var p = PAPERS[pi];
  var all = buildItems(pi), done=[], wrong=0, right=0;
  all.forEach(function(it){ var r=REC[it.key]; if(r){ done.push(it); if(r.ok) right++; else wrong++; } });
  var acc = done.length? Math.round(right/done.length*100):0;

  var paperTabs = PAPERS.map(function(pp,i){
    return '<button class="btn sm'+(i===pi?' primary':'')+'" data-pi="'+i+'">'+(i+1)+'</button>';
  }).join('');

  view.innerHTML =
    '<div class="card"><h2>统计 · '+esc(p.title)+'</h2>'+
      '<div class="btnrow" style="gap:8px">'+paperTabs+'</div></div>'+
    '<div class="card">'+
      '<div class="stat">'+
        '<div class="box"><div class="n">'+done.length+'</div><div class="t">已做</div></div>'+
        '<div class="box"><div class="n" style="color:var(--ok)">'+right+'</div><div class="t">答对</div></div>'+
        '<div class="box"><div class="n" style="color:var(--bad)">'+wrong+'</div><div class="t">答错</div></div>'+
      '</div>'+
      '<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--sub)"><span>总体正确率</span><span>'+acc+'%</span></div>'+
      '<div class="bar"><i style="width:'+acc+'%"></i></div>'+
    '</div>'+
    '<div class="card"><h2>分题型正确率</h2>'+
      secStatHtml(all) +
    '</div>';
  view.querySelectorAll('[data-pi]').forEach(function(b){ b.onclick=function(){ STATE.paperIndex=+b.getAttribute('data-pi'); saveState(STATE); renderStat(); }; });
}

function secStatHtml(all){
  var html=''; var secs=['单选','多选','判断','案例'];
  secs.forEach(function(sec){
    var t=0,d=0,c=0;
    all.forEach(function(it){ if(it.sec===sec){ t++; var r=REC[it.key]; if(r){ d++; if(r.ok) c++; } } });
    if(t===0) return;
    var acc = d? Math.round(c/d*100):0;
    html += '<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-size:13px"><span>'+sec+'</span><span class="muted">'+c+'/'+d+' · '+acc+'%</span></div>'+
      '<div class="bar"><i style="width:'+acc+'%;background:'+(acc>=70?'#2ecc71':acc>=40?'#ffb649':'#ff5c72')+'"></i></div></div>';
  });
  return html || '<div class="empty">还没有做题记录</div>';
}

/* =========================== 更多 =========================== */
function renderMore(){
  var n = 0, wrong=0;
  PAPERS.forEach(function(p,i){ buildItems(i).forEach(function(it){ if(REC[it.key]){ n++; if(!REC[it.key].ok) wrong++; } }); });
  view.innerHTML =
    '<div class="card"><h2>关于</h2>'+
      '<div class="muted">市场营销配套刷题 · 内置 3 套试卷，含单选题、多选题、判断题与案例分析题，每题附正确答案与知识点详解。离线可用，做题记录仅保存在本机。</div>'+
      '<div class="muted" style="margin-top:10px">已记录 <b style="color:#dfe4ff">'+n+'</b> 次作答 · 错题 <b style="color:var(--bad)">'+wrong+'</b> 道</div>'+
    '</div>'+
    '<div class="card"><h2>数据</h2>'+
      '<div class="btnrow">'+
        '<button class="btn" id="exportBtn">导出记录</button>'+
        '<button class="btn ghost" id="resetBtn">清空所有记录</button>'+
      '</div>'+
      '<div class="muted" style="margin-top:10px">导出记录会复制到剪贴板，可用于备份或换设备迁移。</div>'+
    '</div>';
  view.querySelector('#exportBtn').onclick=function(){
    var txt = JSON.stringify(REC, null, 0);
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(txt).then(function(){ alert('记录已导出到剪贴板（'+txt.length+' 字符）。'); }).catch(function(){ fallbackCopy(txt); });
    } else { fallbackCopy(txt); }
  };
  view.querySelector('#resetBtn').onclick=function(){
    if(confirm('确定清空全部做题记录？该操作无法撤销。')){ REC={}; saveRec(REC); renderMore(); }
  };
}
function fallbackCopy(txt){
  var ta=document.createElement('textarea'); ta.value=txt; document.body.appendChild(ta); ta.select();
  try{ document.execCommand('copy'); alert('记录已导出到剪贴板。'); }catch(e){ alert('复制失败，请手动复制。'); }
  document.body.removeChild(ta);
}

/* =========================== Tab 切换 =========================== */
var VIEWS = { home:renderHome, review:renderReview, stat:renderStat, more:renderMore };
function switchTab(tab){
  TAB_BTN.forEach(function(b){ b.classList.toggle('on', b.getAttribute('data-tab')===tab); });
  VIEWS[tab]();
}
TAB_BTN.forEach(function(b){
  b.onclick=function(){ switchTab(b.getAttribute('data-tab')); };
});

/* =========================== 主题切换 =========================== */
var THEME_KEY = 'mb_theme';
function applyTheme(t){
  document.documentElement.setAttribute('data-theme', t);
  var b = document.getElementById('themeBtn');
  if(b) b.textContent = (t==='light') ? '☀️' : '🌙';
  try{ localStorage.setItem(THEME_KEY, t); }catch(e){}
}
function initTheme(){
  var t; try{ t = localStorage.getItem(THEME_KEY); }catch(e){}
  applyTheme(t==='light' ? 'light' : 'dark');
}
var themeBtn = document.getElementById('themeBtn');
if(themeBtn){
  themeBtn.onclick = function(){
    var cur = document.documentElement.getAttribute('data-theme')==='light' ? 'dark' : 'light';
    applyTheme(cur);
  };
}
initTheme();

/* 初始化 */
if(STATE.paperIndex===undefined) STATE.paperIndex=0;
saveState(STATE);
switchTab('home');
})();
