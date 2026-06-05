# develop — MpBC-Rad Score web tool (static GitHub Pages)

A clinician-facing front-end for the TabPFN MpBC overall-survival model, in a Nature-style
**teal–orange (青橙)** palette (teal = protective / lower risk, orange = harmful / higher
risk). Survival, a high/low risk flag with a radiotherapy recommendation, and an **exact
SHAP** per-feature attribution all update live — fully static, no backend.

```
develop/
├── index.html        layout (inputs · survival + recommendation · SHAP)
├── style.css         Nature teal–orange theme
├── app.js            loads shap_table.json and serves predictions by lookup
└── shap_table.json   precomputed survival + exact SHAP for every input combination
```

## How it works

Everything is precomputed. `../shap/precompute.py` enumerates every input combination
(T stage × N stage × Surgery × Chemo group × Subtype × Age) and stores, per record, the
1/3/5-year survival, 5-year death risk, and the 6 exact Shapley values at each horizon.
`app.js` loads `shap_table.json` once and looks up the current inputs — survival and SHAP
update instantly with no server.

## Deploy to GitHub Pages

1. Put `shap_table.json` in this folder (the precompute step copies it here automatically).
2. Push the contents of `develop/` to your GitHub Pages branch/folder, e.g.
   ```bash
   # from a checkout of your Pages repo
   cp -r develop/* .
   git add index.html style.css app.js shap_table.json
   git commit -m "MpBC-Rad Score static site"
   git push
   ```
3. The page is served at your Pages URL — no backend required.

## Notes

* The 5-year high/low cut-off (`CUTOFF` in `app.js`) is the X-tile-style threshold from the
  evaluation notebook (default 0.38).
* SHAP contributions are exact first-order Shapley values in **log-odds** of death and sum
  to the model output. Orange bars increase risk, teal bars decrease it.
* If `shap_table.json` is large, GitHub serves the gzipped copy transparently; the plain
  `.json` is what `app.js` fetches.
* Research demonstration only — not a medical device.
