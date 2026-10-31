// Lift Log: Shortcuts, in-app dialogs and the toast note.
// Classic script: index.html loads the js/ files in order and they share one scope (see docs/DECISIONS.md).

const $ = s => document.querySelector(s);

// ---------- in-app dialogs (browser pop-ups are blocked inside the Claude app) ----------
function dialog({message, ok="OK", cancel="Cancel", danger=false, input=null}){
  return new Promise(resolve=>{
    const back = document.getElementById("dlg"), inp = document.getElementById("dlg-input");
    const okB = document.getElementById("dlg-ok"), noB = document.getElementById("dlg-cancel");
    const prev = document.activeElement;
    document.getElementById("dlg-msg").textContent = message;
    okB.textContent = ok; okB.classList.toggle("danger-btn", !!danger);
    noB.hidden = cancel==null; noB.textContent = cancel || "";
    inp.hidden = input==null; inp.value = ""; inp.placeholder = input || "";
    back.hidden = false;
    const done = v => { back.hidden = true; okB.onclick = noB.onclick = back.onclick = inp.onkeydown = null; document.removeEventListener("keydown", onKey); if(prev && prev.focus) prev.focus(); resolve(v); };
    const yes = () => done(input!=null ? inp.value.trim() : true), no = () => done(input!=null ? null : false);
    const onKey = e => { if(e.key==="Escape"){ e.preventDefault(); no(); } };
    okB.onclick = yes; noB.onclick = no;
    back.onclick = e => { if(e.target===back) no(); };
    inp.onkeydown = e => { if(e.key==="Enter"){ e.preventDefault(); yes(); } };
    document.addEventListener("keydown", onKey);
    (input!=null ? inp : okB).focus();
  });
}
const askConfirm = (message, ok="OK", danger=false) => dialog({message, ok, danger});
const notify = message => dialog({message, ok:"OK", cancel:null});

// ---------- toast: a short note with one action, just above the tab bar ----------
function toast(message, action, onAction, ms){
  const b = $("#toast-act");
  $("#toast-msg").textContent = message;
  b.hidden = !action; b.textContent = action || "";
  b.onclick = ()=>{ hideToast(); if(onAction) onAction(); };
  $("#toast").hidden = false; clearTimeout(toast.t);
  if(ms) toast.t = setTimeout(hideToast, ms);
}
function hideToast(){ clearTimeout(toast.t); $("#toast").hidden = true; }
$("#toast-x").onclick = hideToast;
const LS_KEY = "liftlog.entries.v1", PREF_KEY = "liftlog.prefs.v1";
const KG_PER_LB = 0.45359237;
