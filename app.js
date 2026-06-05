// app.js — MpBC-Rad Score, fully static. Loads the precomputed shap_table.json
// (built by ../shap/precompute.py) and serves survival + exact SHAP by lookup.
"use strict";

const STATIC_JSON = "shap_table.json";   // produced by shap/precompute.py
const CUTOFF = 0.38;                      // 5-yr death-risk high/low cut-off (X-tile)

const CAT = ["Tstage", "Nstage", "Surgery", "Response", "Subtype"];
const LEVELS = {
  Tstage: ["T1", "T2", "T3", "T4"], Nstage: ["N0", "N1", "N2", "N3"],
  Surgery: ["BCS", "Mastectomy"], Response: ["AT", "CR", "NonCR"],
  Subtype: ["HR+/HER2-", "HER2+", "TNBC", "Unknown"],
};
const FEAT_LABEL = { Age: "Age", Tstage: "T stage", Nstage: "N stage",
  Surgery: "Surgery", Response: "Chemo group", Subtype: "Subtype" };
let HZ = 5, TABLE = null, AGES = [];

const val = (id) => document.getElementById(id).value;
const patient = () => ({
  Age: parseInt(val("Age"), 10), Tstage: val("Tstage"), Nstage: val("Nstage"),
  Surgery: val("Surgery"), Response: val("Response"), Subtype: val("Subtype"),
});
const setStatus = (m, err) => {
  const el = document.getElementById("status");
  el.textContent = m; el.className = "status" + (err ? " err" : "");
};
const keyOf = (p) => [p.Age, p.Tstage, p.Nstage, p.Surgery, p.Response, p.Subtype].join("|");
const nearestAge = (a) => AGES.reduce((b, x) => Math.abs(x - a) < Math.abs(b - a) ? x : b, AGES[0]);

function renderSurvival(surv, risk5) {
  document.getElementById("survCards").innerHTML = ["1yr", "3yr", "5yr"].map((h) =>
    `<div class="card"><span class="card-h">${h.replace("yr", "-year")}</span>
      <span class="card-v">${(surv[h] * 100).toFixed(1)}%</span>
      <span class="card-l">survival</span></div>`).join("");
  const high = risk5 >= CUTOFF;
  const box = document.getElementById("recoBox");
  box.className = "reco " + (high ? "high" : "low");
  box.innerHTML = `<span class="badge">${high ? "HIGH RISK" : "LOW RISK"}</span>
    <span class="advice">${high ? "Consider adjuvant radiotherapy" : "Radiotherapy may be omitted"}</span>
    <span class="reco-meta">5-yr death risk ${(risk5 * 100).toFixed(1)}% (cut-off ${(CUTOFF*100).toFixed(0)}%)</span>`;
}

function renderShap(contrib) {
  const entries = Object.entries(contrib).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  const maxAbs = Math.max(...entries.map((e) => Math.abs(e[1]))) || 1;
  document.getElementById("shapBars").innerHTML = entries.map(([k, v]) => {
    const w = Math.abs(v) / maxAbs * 50;
    const fill = v >= 0 ? `left:50%;width:${w}%;background:var(--orange)`
                        : `left:${50 - w}%;width:${w}%;background:var(--teal)`;
    return `<div class="bar-row"><span class="bl">${FEAT_LABEL[k] || k}</span>
      <span class="bt"><i class="zero"></i><i class="fill" style="${fill}"></i></span>
      <span class="bv ${v >= 0 ? "p" : "n"}">${v >= 0 ? "+" : ""}${v.toFixed(3)}</span></div>`;
  }).join("");
  document.getElementById("shapNote").textContent =
    `Exact SHAP for ${HZ}-year death risk (sums to the model log-odds; + = higher risk).`;
}

function update() {
  if (!TABLE) return;
  const p = patient(); const gridAge = nearestAge(p.Age);
  const rec = TABLE.get(keyOf({ ...p, Age: gridAge }));
  if (!rec) { setStatus("combination not in precomputed table", true); return; }
  renderSurvival(rec.surv, rec.risk["5yr"]);
  renderShap(rec.shap[HZ + "yr"]);
  setStatus(gridAge !== p.Age ? `age rounded to ${gridAge}` : "");
}

async function init() {
  for (const c of CAT) {
    const sel = document.getElementById(c);
    sel.innerHTML = LEVELS[c].map((v) => `<option>${v}</option>`).join("");
    sel.addEventListener("change", update);
  }
  const a = document.getElementById("Age");
  a.addEventListener("input", () => { document.getElementById("AgeVal").textContent = a.value; update(); });
  document.getElementById("horizonTabs").innerHTML =
    [1, 3, 5].map((h) => `<button data-h="${h}"${h === HZ ? ' class="active"' : ""}>${h}-yr</button>`).join("");
  document.querySelectorAll("#horizonTabs button").forEach((b) =>
    b.addEventListener("click", () => {
      HZ = parseInt(b.dataset.h, 10);
      document.querySelectorAll("#horizonTabs button").forEach((x) => x.classList.remove("active"));
      b.classList.add("active"); update();
    }));

  setStatus("loading model table…");
  try {
    const r = await fetch(STATIC_JSON); if (!r.ok) throw new Error(r.status);
    const data = await r.json();
    TABLE = new Map(data.records.map((rec) => [keyOf(rec), rec]));
    AGES = [...new Set(data.records.map((r) => r.Age))].sort((x, y) => x - y);
    setStatus(""); update();
  } catch (e) {
    setStatus("shap_table.json missing — run ../shap/precompute.py and copy it here.", true);
  }
}
init();
