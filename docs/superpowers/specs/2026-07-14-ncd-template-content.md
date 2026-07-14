# NCD Template Content — Re-aim Pass

**Date:** 2026-07-14
**Type:** Content-only pass. NO code structure changes. Swap `TEMPLATES.NCD` + `TEMPLATES.NCD_SOAP` string arrays in `static/js/clinical_templates.js`. Nothing else.
**Status:** Content vetted + passed by Miruya 2026-07-14 (clinical seat). Ready for CC to apply.

---

## Why this pass exists

The current `TEMPLATES.NCD` / `TEMPLATES.NCD_SOAP` content is entirely **knee-osteoarthritis** ("Pain in the right knee due to osteoarthritis", "Reduce right knee pain 7→4 on VAS", "Right knee ROM: Flexion 90°"). This is NOT a wiring bug — the wiring is intact (all 5 buttons wired in `ncd.html` lines 584–588: impression/goal/stg/ltg/treatment; picker + data chain verified). The KKM Best Statement doc (`5. NCD 2026.txt`, MOH/P/FIS/27.25(HB)-e) simply used a **knee-OA patient as its worked example** even though the NCD form's purpose (per its own CRITERIA page) is *"referral with a diagnosis of Diabetes, Hypertension, Obesity, and others."*

So the fix is **re-aim, not re-transcribe**: replace the orthopaedic exemplar content with obesity/metabolic/cardiovascular content that matches what the NCD form actually captures — vitals, bloods (FBS/HbA1c/lipids), body composition (BMI/waist/WHR/fat%), and the fitness battery (6MWT, step test, sit-and-reach, grip, sit-up/push-up, sit-to-stand, stork balance). Exercise-based management of metabolic and cardiovascular risk + deconditioning + weight.

**Template-authoring rule locked this pass (Miruya):** cap each category at **≤10 statements** (fewer is fine — the field is still free-text, the clinician can type). Applies to NCD, vestibular, and all future forms. All arrays below are ≤8. (Candidate for DESIGN_SYSTEM / BACKLOG as a general guideline.)

---

## The content (copy-ready, single-quoted JS — swap verbatim)

Replace the existing `TEMPLATES.NCD = { ... }` block:

```js
  TEMPLATES.NCD = {
    impression: [
      'Deconditioning and reduced exercise tolerance secondary to Type 2 diabetes and obesity.',
      'Elevated cardiovascular risk associated with hypertension and central adiposity (raised waist circumference / waist-hip ratio).',
      'Suboptimal glycaemic control with a sedentary lifestyle contributing to disease progression.',
      'Reduced functional capacity and muscular endurance limiting activities of daily living.',
      'Low physical activity level and impaired balance increasing long-term morbidity and fall risk.'
    ],
    goal: [
      'Lose weight and reduce waist size to feel more comfortable in daily activities.',
      'Climb stairs and walk longer distances without getting breathless.',
      'Reduce reliance on medication through lifestyle change, as advised by the doctor.',
      'Return to recreational activities and an active family life.'
    ],
    stg: [
      'Increase 6-minute walk distance by 50 metres within 4 weeks.',
      'Establish a structured aerobic routine of 150 minutes per week within 4 weeks.',
      'Reduce waist circumference by 2 cm within 6 weeks.',
      'Improve sit-to-stand by 5 repetitions within 4 weeks.',
      'Lower resting blood pressure toward target (<140/90 mmHg) with regular exercise within 6 weeks.'
    ],
    ltg: [
      'Achieve 5-10% body-weight reduction within 3-6 months.',
      'Improve HbA1c toward target (<7%) through sustained exercise, with the medical team, within 3-6 months.',
      'Independently sustain 150 minutes per week of moderate activity within 3 months.',
      'Improve cardiorespiratory fitness for unrestricted daily activities within 6 months.',
      'Maintain an active lifestyle to reduce long-term cardiovascular and metabolic risk within 12 months.'
    ],
    treatment: [
      'Patient and carer education on NCD self-management',
      'Structured aerobic / cardiovascular exercise programme',
      'Progressive resistance / strengthening exercise',
      'Weight management and lifestyle modification advice',
      'Exercise safety education (BP / glucose monitoring, warning signs)',
      'Balance and functional training',
      'Home exercise programme with activity-level goal setting',
      'Progress review and reassessment'
    ]
  };
```

Replace the existing `TEMPLATES.NCD_SOAP = { ... }` block:

```js
  TEMPLATES.NCD_SOAP = {
    subjective: [
      'Reports [improved/reduced] exercise tolerance; walks [distance] before breathlessness.',
      'Reports adherence to home programme [X sessions/week] and [dietary change].',
      'Home readings: BP [X], glucose [X]; motivation [good/low].'
    ],
    objective: [
      'Weight [X] kg, BMI [X] kg/m2, Waist [X] cm, WHR [X].',
      'Resting BP [X] mmHg, HR [X]/min, SpO2 [X]%.',
      '6-Minute Walk Test [X] m (RPE [X]/20); sit-to-stand [X] reps; hand grip [X] kg.'
    ],
    analysis: [
      'Improving - aerobic capacity and endurance progressing toward short-term goals.',
      'Weight and waist trending down; on track for target reduction.',
      'Glycaemic / lipid profile [improving/static] - continue exercise, liaise with medical team.',
      'Plateau - review exercise intensity and adherence barriers.'
    ],
    plan: [
      'Progress aerobic intensity / duration per tolerance.',
      'Advance resistance programme.',
      'Reinforce weight-management and dietary adherence with patient / carer.',
      'Reassess anthropometry and fitness battery in [X] weeks; liaise re: HbA1c / BP.'
    ]
  };
```

> **SOAP placeholder convention:** `[X]` / `[improved/reduced]` brackets are intentional per-visit fill-ins — same pattern as `TEMPLATES.FACIAL_SOAP` (`[R/L]` etc.). Keep them.

---

## Apply notes (for CC)

- **Only two blocks change.** `TEMPLATES.NCD` and `TEMPLATES.NCD_SOAP`. Do not touch keys, structure, the `addButton` wiring in ncd.html, or `tplMap` in episode.html — all already correct.
- **Keys unchanged:** `impression / goal / stg / ltg / treatment` and `subjective / objective / analysis / plan`. Same keys the buttons and `show()` already look up.
- **No apostrophes** in any string (deliberately authored that way) — safe inside single quotes. Preserve the en-dash-free `-` and `/` as written.
- **Verify after swap:** `node --check static/js/clinical_templates.js`. Then a quick click-test — open an NCD form, click each of the 5 template buttons (esp. Patient Goal) + the SOAP template picker on an NCD episode, confirm the NEW metabolic statements insert (not knee-OA). This is the exact seam the FACIAL bug hid in.
- **BACKLOG:** strike the "TEMPLATES.NCD content is generic knee-OA boilerplate" item (BACKLOG ~line 128) as DONE once merged. Update HANDOVER next-priorities (#1 was this).

---

*End. Content-only; no new files, no structure change. Merge stays human-gated.*
