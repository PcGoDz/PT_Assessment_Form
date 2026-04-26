// clinical_templates.js
// Reusable clinical template picker based on KKM Best Statement documents
// Usage: ClinicalTemplates.show(fieldId, formType, category)
// formType: 'MS' | 'SPINE' | 'GERIATRIC' | 'CR'
// category: 'impression' | 'stg' | 'ltg' | 'treatment' | 'observation' | 'palpation'

const ClinicalTemplates = (function () {

  // ── Template data ───────────────────────────────────────────────
  const TEMPLATES = {
    MS: {
      observation: [
        'Patient ambulant with walking frame. Antalgic gait noted. Guarding of affected limb.',
        'Patient in wheelchair. Alert and cooperative. Mild distress noted due to pain.',
        'Standing posture: lateral trunk shift to right. Reduced lumbar lordosis.',
        'Patient ambulant independently. Mild limp noted. Using single-point walking stick.',
        'Swelling and erythema noted over affected joint. Skin intact.',
        'Patient bed-bound. Position of comfort maintained. Alert and oriented.',
      ],
      palpation: [
        'Tenderness grade 2/3 over affected region. Muscle spasm present.',
        'Mild warmth and soft tissue swelling. No bony deformity.',
        'Trigger points palpable over upper trapezius bilaterally.',
        'Joint line tenderness present. No effusion palpable.',
        'Diffuse tenderness. Reduced muscle tone. Trigger point at [muscle].',
      ],
      impression: [
        'Patient presents with pain and functional limitation secondary to diagnosis. Goals set to reduce pain and improve mobility.',
        'Reduced ROM and muscle strength affecting ADL performance. Rehabilitation indicated.',
        'Post-surgical patient with pain, reduced strength and ROM. Physiotherapy to optimise recovery.',
        'Chronic pain pattern with postural dysfunction. Multifactorial approach required.',
        'Acute inflammatory phase. Pain management and protection prioritised.',
      ],
      stg: [
        'Reduce pain to VAS <= 3/10 within 2 weeks.',
        'Improve ROM by 20 degrees within 2 weeks.',
        'Achieve independent ambulation with aid within 2 weeks.',
        'Reduce swelling and improve functional mobility within 1 week.',
        'Independent with home exercise program within 2 weeks.',
      ],
      ltg: [
        'Return to pre-morbid functional level within 4-6 weeks.',
        'Full weight bearing and independent ambulation without aid within 6 weeks.',
        'Return to work / recreational activities within 8 weeks.',
        'Achieve full pain-free ROM within 6 weeks.',
        'Independent with ADLs and home program within 4 weeks.',
      ],
      treatment: [
        'TENS, heat therapy, ultrasound for pain relief. Strengthening and ROM exercises. HEP.',
        'Manual therapy, joint mobilisation, soft tissue massage. Progressive strengthening.',
        'Gait re-education, balance training, proprioceptive exercises.',
        'Postural correction, ergonomic advice, core stabilisation exercises.',
        'Hydrotherapy, graded exercise program, patient education.',
      ],
    },

    SPINE: {
      impression: [
        'Patient presents with mechanical low back pain with movement limitation. Neurological screen negative.',
        'Cervical radiculopathy pattern. Dermatomal symptoms present. Neural tension signs positive.',
        'Lumbar disc pathology with referred leg pain. Centralisation response noted with extension.',
        'Postural dysfunction with chronic pain sensitisation. Biopsychosocial approach required.',
        'Post-surgical spine — wound healing adequate. Rehab to commence per protocol.',
      ],
      stg: [
        'Centralise symptoms and reduce leg pain within 1 week.',
        'Reduce pain to VAS <= 3/10 and improve lumbar flexion within 2 weeks.',
        'Improve sitting and standing tolerance to 30 minutes within 2 weeks.',
        'Independent with spinal exercises and posture correction within 2 weeks.',
      ],
      ltg: [
        'Full return to work and recreational activities within 6-8 weeks.',
        'Independent pain management strategies. Prevent recurrence.',
        'Achieve functional ROM and strength for full ADL independence within 8 weeks.',
      ],
      treatment: [
        'Spinal mobilisation, neural mobilisation, McKenzie exercises. HEP.',
        'Lumbar stabilisation, core strengthening, postural re-education.',
        'Traction, manual therapy, progressive loading program.',
        'Ergonomic advice, activity modification, graded return to activity.',
      ],
    },

    GERIATRIC: {
      impression: [
        'Elderly patient with reduced mobility and functional decline. Falls risk assessment completed.',
        'Post-fall with reduced confidence and activity limitation. Multifactorial falls risk identified.',
        'Frailty syndrome with generalised deconditioning. Comprehensive rehabilitation required.',
        'Cognitive impairment affecting rehab participation. Adapted program required.',
      ],
      stg: [
        'Improve sit-to-stand transfers independently within 2 weeks.',
        'Ambulate 10 metres with appropriate aid within 2 weeks.',
        'Reduce falls risk score within 4 weeks.',
        'Independent with basic ADLs within 2 weeks.',
      ],
      ltg: [
        'Safe community ambulation with or without aid within 6 weeks.',
        'Return to prior living situation with appropriate support within 8 weeks.',
        'Independent home exercise maintenance program within 4 weeks.',
      ],
      treatment: [
        'Balance training, strength exercises, gait re-education. Falls prevention education.',
        'Functional task training, transfer practice, bed mobility exercises.',
        'Progressive resistance training, walking program, carer education.',
        'Cognitive-motor dual-task training, environmental modification advice.',
      ],
    },

    CR: {
      impression: [
        'Retained secretions bilateral bases. Reduced chest expansion. Ineffective cough.',
        'Reduced air entry right lower zone. Consolidation noted on CXR. SOB on minimal exertion.',
        'Post-operative — reduced lung volumes, atelectasis risk. Pain limiting deep breathing.',
        'COPD exacerbation — hyperinflation, accessory muscle use, SpO2 borderline on RA.',
        'Productive cough with thick secretions. Asymmetrical chest expansion. Tachypnoea at rest.',
        'Reduced exercise tolerance — 6MWT below predicted. Dyspnoea MRC Grade 3.',
      ],
      stg: [
        'Improve airway clearance within 3 days. Expectorate secretions effectively.',
        'Reduce shortness of breath at rest within 2 days. SpO2 > 95% on RA.',
        'Improve chest expansion symmetry within 1 week.',
        'Improve cough effectiveness within 1 week. Independent with ACBT.',
        'Increase exercise tolerance — 6MWT by 30m within 2 weeks.',
        'Wean O2 requirement within 5 days. Maintain SpO2 > 94% on RA.',
      ],
      ltg: [
        'Regain optimum functional activity within 1 month based on individual needs.',
        'Independent with home breathing exercise program within 2 weeks.',
        'Return to pre-morbid activity level within 4 weeks.',
        'Achieve MRC dyspnoea grade <= 2 within 4 weeks.',
        'Complete pulmonary rehabilitation program. Maintain exercise independently.',
      ],
      treatment: [
        'Chest physiotherapy — ACBT, percussion, vibration. Postural drainage as tolerated.',
        'Breathing exercises — diaphragmatic, pursed lip, segmental. Relaxation positioning.',
        'Early mobilisation — sitting to standing, ambulation with monitoring.',
        'Airway clearance — huffing, effective cough technique, suction PRN.',
        'Incentive spirometry — 10 reps/hour. PEFR monitoring.',
        'Cardiorespiratory endurance training — graded walking program, cycle ergometer.',
        'Patient education — breathing control, energy conservation, HEP, smoking cessation advice.',
      ],
    },

    MS_SOAP: {
      analysis: [
        'Pain reduced, ROM improving, progressing well towards goals.',
        'Minimal progress noted. Reassessing treatment approach and patient compliance.',
        'Good functional improvement. Patient achieving short-term goals within timeframe.',
        'Plateau noted in progress. Modifying treatment plan — increasing exercise intensity.',
        'Pain controlled. Strength improving. Nearing discharge criteria.',
        'Patient reporting increased pain. Review aggravating factors and modify plan.',
        'Functionally independent with HEP. Discharge planning initiated.',
      ],
      plan: [
        'Continue pain management (TENS/heat). Mobilising exercises. Strengthening. HEP.',
        'Progress strengthening program. Reduce modality use. Increase functional training.',
        'Modify HEP — increase difficulty. Review compliance. Reinforce home program.',
        'Discharge planning initiated. Ensure independent with HEP before discharge.',
        'Refer back to doctor — limited progress. Reassess medical management.',
        'Continue current plan. Review in next session. Monitor response.',
        'Add balance and functional training. Progress towards discharge goals.',
      ],
    },

    CR_SOAP: {
      analysis: [
        'Secretion clearance improving. Cough more effective. SpO2 stable on RA.',
        'SOB reducing. Breathing pattern improving. Patient tolerating activity better.',
        'Chest expansion improving symmetrically. Air entry improving bilaterally.',
        'Minimal progress in secretion clearance. Reviewing technique and positioning.',
        'Exercise tolerance improving — 6MWT distance increased from baseline.',
        'Patient desaturating on exertion. Reducing exercise intensity. Monitor SpO2.',
        'Ventilator weaning progressing. FiO2 reduced. Patient tolerating spontaneous breathing.',
        'Good response to chest PT. Secretions mobilised. Plan to progress mobilisation.',
      ],
      plan: [
        'Continue chest PT — ACBT, percussion, postural drainage. Review tomorrow.',
        'Progress ambulation — increase distance and reduce rest intervals.',
        'Commence incentive spirometry. Target volume to increase by next session.',
        'Wean O2 — trial on room air with SpO2 monitoring. HEP reinforced.',
        'Refer for pulmonary rehab program on discharge. HEP given.',
        'Discharge planning initiated. Independent with HEP and breathing exercises.',
        'Continue current plan. Reassess in 2 days. Monitor SpO2 and exercise tolerance.',
        'Add inspiratory muscle training. Progress breathing control exercises.',
      ],
    },

    SPINE_SOAP: {
      analysis: [
        'Symptoms centralising. Peripheral symptoms reducing. Progressing well with McKenzie.',
        'Pain reducing with activity. Lumbar ROM improving. Neural tension signs easing.',
        'Good response to manual therapy. Muscle spasm reducing. Posture improving.',
        'Minimal progress noted. Reviewing loading strategy — considering directional preference.',
        'Radicular symptoms unchanged. Monitoring closely. Referral back to doctor if no progress.',
        'Patient achieving centralisation consistently. Ready to progress loading.',
        'Functional tolerance improving — sitting/standing duration increased. On track for goals.',
        'Plateau noted. Adding motor control exercises. Reviewed ergonomic advice.',
      ],
      plan: [
        'Continue McKenzie extension exercises. Progress repetitions. HEP reinforced.',
        'Progress from passive mobilisation to active stabilisation exercises.',
        'Lumbar stabilisation program commenced — transversus abdominis activation, dead bug.',
        'Neural mobilisation added — sciatic/femoral sliders. Educate on nerve sensitivity.',
        'Ergonomic review completed. Activity modification advice given. HEP updated.',
        'Gait re-education. Core strengthening progression. Reduce frequency of sessions.',
        'Discharge planning — independent with HEP. Return to work plan discussed.',
        'Refer back to doctor — no improvement after 6 sessions. Review imaging.',
      ],
    },

    GERIATRIC_SOAP: {
      analysis: [
        'Balance improving — Berg Balance Scale score increased. Falls risk reducing.',
        'Functional mobility improving — sit-to-stand now requires Min A (was Mod A).',
        'Gait improving — increased step length and gait speed. TUG time reduced.',
        'Lower limb strength improving — chair rising test time improved.',
        'Patient ambulant with walking frame independently on level surface.',
        'Falls risk remains high. TUG > 13.5 sec. Continuing intensive balance training.',
        'Plateau in progress. Reviewing exercise intensity and patient compliance with HEP.',
        'Patient deconditioned after hospital admission. Restarting from basic bed mobility.',
        'Functional independence improving — patient now independent with ADLs.',
      ],
      plan: [
        'Continue balance training — Berg exercises, single leg stance, stepping.',
        'Progress gait training — increase distance, introduce outdoor walking.',
        'Strengthen lower limbs — sit-to-stand x30, SLR x30, bridging x30 (3x/day).',
        'Falls prevention education reinforced — environment hazards, footwear, medication review.',
        'Caregiver education — safe transfer technique, guarding during ambulation.',
        'HEP reviewed and updated. Encourage daily walking program.',
        'Discharge planning — independent with HEP. Community exercise referral discussed.',
        'Continue current plan. Reassess Berg and TUG next session to track progress.',
      ],
    },

    AMPUTATION: {
      observation: [
        'Stump conical, well-healed scar, no signs of infection or skin breakdown.',
        'Stump oedematous, figure-of-8 bandaging applied. Skin intact.',
        'Stump cylindrical, mature. Prosthetic fitting assessment completed.',
        'Residual limb — mild redness at distal end. Socket fit reviewed.',
        'Stump wound healing well. Sutures intact. No discharge. Temperature normal.',
        'Wound dehiscence noted distally. Referred to surgical team for review.',
      ],
      palpation: [
        'No excessive warmth. Mild tenderness at distal stump on direct pressure.',
        'Moderate tenderness at scar. No warmth or crepitus. Soft tissue mobility intact.',
        'Warmth present — monitor for infection. No fluctuance. Referred for review.',
        'Stump soft, non-tender. Good tissue pliability. Ready for prosthetic fitting.',
      ],
      impression: [
        'Patient with transtibial amputation, stump well-healed. Fair mobility with walking aid. Requires strengthening and gait training with prosthesis.',
        'Patient with transfemoral amputation, good stump condition. Limited endurance. Pre-prosthetic rehabilitation phase commenced.',
        'Patient ambulant with prosthesis, gait deviations noted. Requires gait re-education and prosthetic socket review.',
        'Post-amputation — pre-prosthetic phase. Stump oedema management and strengthening in progress.',
        'Prosthetic rehabilitation progressing. Patient achieving short-term mobility goals. Independence improving.',
      ],
      stg: [
        'Reduce stump oedema within 2 weeks — independent with bandaging technique.',
        'Improve hip extensor/abductor strength to 4/5 within 4 weeks.',
        'Ambulate 20m with walker safely within 2 weeks.',
        'Independent with prosthetic don/doff within 2 weeks.',
        'Reduce phantom limb pain to < 3/10 within 2 weeks.',
        'Achieve sitting balance Grade 3 (unsupported, dynamic) within 1 week.',
        'Transfer independently bed to chair within 1 week.',
      ],
      ltg: [
        'Independent ambulation with prosthesis > 100m within 8 weeks.',
        'Safe stair climbing with prosthesis within 12 weeks.',
        'Return to ADLs independently within 8 weeks.',
        'Community ambulation with prosthesis within 12 weeks.',
        'Return to occupational / recreational activities within 3 months.',
        'Independent with HEP and home walking program at discharge.',
      ],
      treatment: [
        'Stump care — bandaging, skin inspection, scar management. Positioning to prevent contracture.',
        'Strengthening — hip extensors, abductors, core stability, upper limb for aid use.',
        'Gait training — parallel bars to walker to crutches. Focus on symmetry and safety.',
        'Prosthetic training — weight shift, balance, don/doff, socket skin inspection.',
        'Endurance training — progressive walking distance targets based on 2MWT.',
        'Functional retraining — transfers, stair practice, ADL simulation.',
        'Pain management — desensitisation, soft tissue mobilisation, cryotherapy.',
        'Education — stump care, bandaging technique, skin monitoring, HEP.',
        'Discharge planning — HEP issued, safety advice, community follow-up arranged.',
      ],
    },

    AMPUTATION_SOAP: {
      objective: [
        'MRMI: Turning over __/5  Lying-sitting __/5  Sit balance __/5  Sit-stand __/5  Standing __/5  Transfer __/5  Walking __/5  Stairs __/5  Total __/40\nTUG: __ sec  Aid: __\n2MWT: __ m  Aid: __',
        'Stump: Shape __  Skin intact Y/N  Redness __  Oedema __\nBandaging: __  Gait: __\nVAS PRE: __/10  POST: __/10',
        'ROM: Hip flex __  Hip ext __  Hip abd __  Knee ext __\nMMT: Hip flex __/5  Hip ext __/5  Hip abd __/5  Knee ext __/5',
      ],
      analysis: [
        'Stump oedema reducing. Bandaging technique improving. Progressing to prosthetic phase.',
        'Gait deviations noted — lateral trunk bending, vaulting. Targeting hip abductor strengthening.',
        'Prosthetic walking distance increasing. Endurance improving. On track for community ambulation.',
        'Phantom limb pain reducing with desensitisation. Sleep quality improving.',
        'MRMI score improved from last session. Functional mobility gains noted.',
        'TUG time reduced — fall risk improving. Patient gaining confidence with prosthesis.',
        'Hip flexion contracture risk — reinforcing prone lying and stretching program.',
        'Socket fit issues reported — skin redness at proximal brim. Orthotist referral arranged.',
        'Plateau noted in walking distance. Reviewing prosthetic alignment and exercise progression.',
        'Nearing discharge criteria — independent with prosthesis on level surface and stairs.',
      ],
      plan: [
        'Continue stump care — bandaging, skin check, scar massage. Monitor wound.',
        'Progress hip strengthening — increase resistance, add closed chain exercises.',
        'Gait training — extend distance, introduce uneven terrain, outdoor walking.',
        'Prosthetic training — step-over-step stairs, ramps, curbs.',
        'Balance training — single leg stance, perturbation training, parallel bar work.',
        'Endurance training — 2MWT progression, increase target distance.',
        'Desensitisation techniques — tapping, rubbing, mirror therapy for phantom pain.',
        'HEP reviewed and progressed. Reinforce compliance and home walking program.',
        'Discharge planning in progress — ensure independence with HEP and safety.',
        'Continue current plan. Reassess MRMI and TUG next session.',
      ],
    },
  };

  // ── State ───────────────────────────────────────────────────────
  var activeField = null;
  var pickerEl    = null;

  // ── Show — centred modal ────────────────────────────────────────
  function show(fieldId, formType, category) {
    var field = document.getElementById(fieldId);
    if (!field) return;

    var items = (TEMPLATES[formType] || {})[category] || [];
    if (!items.length) return;

    hide();
    activeField = field;

    // Backdrop
    var backdrop = document.createElement('div');
    backdrop.id = 'ct-backdrop';
    backdrop.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:1200',
      'background:rgba(0,0,0,0.35)',
      'display:flex', 'align-items:center', 'justify-content:center',
    ].join(';');

    // Modal
    var modal = document.createElement('div');
    modal.style.cssText = [
      'background:var(--surface)',
      'border:1px solid var(--accent-mid)',
      'border-radius:var(--radius-lg)',
      'box-shadow:0 8px 32px rgba(0,0,0,0.22)',
      'padding:14px',
      'width:min(520px, 90vw)',
      'max-height:80vh',
      'overflow-y:auto',
      'position:relative',
    ].join(';');

    // Header
    var hdr = document.createElement('div');
    hdr.style.cssText = 'font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;';
    hdr.innerHTML = '<span>&#128203; Best Statement Templates</span><button onclick="ClinicalTemplates.hide()" style="background:none;border:none;cursor:pointer;color:var(--text-faint);font-size:18px;line-height:1;padding:0 4px;">&#x2715;</button>';
    modal.appendChild(hdr);

    // Template items
    items.forEach(function (text) {
      var btn = document.createElement('button');
      btn.style.cssText = [
        'display:block', 'width:100%', 'text-align:left',
        'padding:8px 12px', 'margin-bottom:5px',
        'border:1px solid var(--border)',
        'border-radius:var(--radius)',
        'background:var(--bg)',
        'cursor:pointer', 'font-family:inherit',
        'font-size:12px', 'color:var(--text)', 'line-height:1.45',
        'transition:all 0.12s',
      ].join(';');
      btn.textContent = text;
      btn.addEventListener('mouseover', function () {
        this.style.background  = 'var(--accent-light)';
        this.style.borderColor = 'var(--accent-mid)';
      });
      btn.addEventListener('mouseout', function () {
        this.style.background  = 'var(--bg)';
        this.style.borderColor = 'var(--border)';
      });
      btn.addEventListener('click', function () { insert(text); });
      modal.appendChild(btn);
    });

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    pickerEl = backdrop;

    // Close on backdrop click
    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop) hide();
    });

    // Close on Escape
    document.addEventListener('keydown', escClose);
  }

  function escClose(e) {
    if (e.key === 'Escape') hide();
  }

  function insert(text) {
    if (!activeField) return;
    var cur = activeField.value.trim();
    activeField.value = cur ? cur + '\n' + text : text;
    activeField.dispatchEvent(new Event('input', { bubbles: true }));
    var field = activeField;  // save ref before hide() nulls activeField
    hide();
    if (field) field.focus();
  }

  function hide() {
    if (pickerEl) {
      pickerEl.remove();
      pickerEl = null;
    }
    document.removeEventListener('keydown', escClose);
    activeField = null;
  }

  // ── Add template button next to a field label ───────────────────
  function addButton(fieldId, formType, category) {
    var field = document.getElementById(fieldId);
    if (!field) return;
    var label = field.closest('.field') && field.closest('.field').querySelector('label');
    if (!label) return;
    if (label.querySelector('.ct-trigger')) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ct-trigger';
    btn.textContent = '+ template';
    btn.style.cssText = [
      'margin-left:8px', 'font-size:10px', 'padding:2px 7px',
      'border-radius:10px', 'border:1px solid var(--accent-mid)',
      'background:var(--accent-light)', 'color:var(--accent)',
      'cursor:pointer', 'font-family:inherit',
      'font-weight:500', 'vertical-align:middle',
    ].join(';');
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      show(fieldId, formType, category);
    });
    label.appendChild(btn);
  }

  return { show: show, hide: hide, addButton: addButton };

})();
