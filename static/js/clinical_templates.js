// clinical_templates.js
// Reusable clinical template picker based on KKM Best Statement documents
// Usage: ClinicalTemplates.show(fieldId, formType, category)
// formType: 'MS' | 'SPINE' | 'GERIATRIC'
// category: 'impression' | 'stg' | 'ltg' | 'treatment' | 'observation' | 'palpation'

const ClinicalTemplates = (function () {

  // ── Template data — sourced from KKM Best Statement documents ──
  const TEMPLATES = {

    MS: {
      impression: [
        'Pain, reduced ROM and muscle weakness with functional limitation.',
        'Reduced ROM and strength with pain on activity affecting ADLs.',
        'Pain and stiffness with joint swelling and functional limitation.',
        'Muscle weakness and pain with impaired gait and functional limitation.',
        'Reduced ROM, tenderness and weakness with impaired functional performance.',
      ],
      stg: [
        'Reduce pain to [x]/10 within 2 weeks. Improve ROM by 10°. Increase muscle strength to [x]/5.',
        'Reduce pain and swelling within 1–2 weeks. Improve joint ROM and functional mobility.',
        'Improve ROM and reduce pain within 2–4 weeks. Educate patient on HEP before discharge.',
        'Increase quadriceps strength to 4/5. Reduce pain to 4/10 within 2 weeks.',
        'Improve functional mobility and reduce pain within 2–4 weeks.',
      ],
      ltg: [
        'Independent walking without aid, pain-free ADLs within 3 months.',
        'Return to work/recreational activities. Achieve full functional independence within 3–6 months.',
        'Restore full ROM and strength. Return to previous level of function within 3 months.',
        'Prevent recurrence, improve quality of life, return to sport/work within 3–6 months.',
        'Achieve pain-free functional independence in ADLs and community activities.',
      ],
      treatment: [
        'Pain management (TENS/heat/cold). Mobilising exercises. Strengthening. Balance training. HEP.',
        'Manual therapy. Therapeutic exercises (strengthening, stretching). Patient education. HEP.',
        'Electrotherapy (TENS/US). ROM exercises. Progressive strengthening. Gait re-education. HEP.',
        'Joint mobilisation. Muscle strengthening. Stretching. Functional training. Home exercise program.',
        'Pain relief modalities. Active ROM exercises. Strengthening. Patient education and HEP.',
      ],
      observation: [
        'Antalgic gait noted. Guarding of affected limb. No obvious deformity.',
        'Normal gait pattern. Mild swelling at [site]. No muscle wasting observed.',
        'Reduced arm swing. Guarding right/left [joint]. Mild muscle wasting [muscle].',
        'Antalgic posture. Swelling and erythema at [site]. No scar or deformity.',
        'Normal posture. No swelling or deformity. Mild tenderness on palpation.',
      ],
      palpation: [
        'Tenderness at [site] Grade [1-3]. Mild warmth. Muscle spasm at [muscle].',
        'Joint line tenderness [medial/lateral]. No warmth or swelling. Moderate muscle tightness.',
        'Tenderness at [tendon/ligament]. Normal skin temperature. Trigger point at [muscle].',
        'Diffuse tenderness Grade 2. Warmth at [site]. Tight [muscle group].',
        'Bony tenderness at [landmark]. No soft tissue swelling. Mild muscle guarding.',
      ],
    },

    SPINE: {
      impression: [
        'Pain and reduced spinal mobility with neural involvement and functional limitation.',
        'Reduced trunk ROM and muscle weakness with postural dysfunction.',
        'Spinal pain with peripheralisation and functional limitation in ADLs.',
        'Centralising spinal pain with reduced ROM and muscle guarding.',
        'Spinal stiffness and pain with impaired movement efficiency and postural faults.',
      ],
      stg: [
        'Reduce pain within 3–5 days. Improve trunk flexion and side flexion within 1 week.',
        'Centralise symptoms within 2–3 visits. Improve trunk ROM within 1–2 weeks.',
        'Reduce pain to [x]/10 within 3 visits. Restore segmental mobility within 1 session.',
        'Improve gait pattern within 6–12 weeks. Educate on HEP before discharge.',
        'Reduce neural tension within 2 weeks. Improve lumbar flexion by 20% within 1 week.',
      ],
      ltg: [
        'Achieve functional independence in daily and work-related activities.',
        'Correct postural faults. Promote long-term spinal health and movement efficiency.',
        'Return to desk job with improved posture tolerance within 6–8 weeks.',
        'Full functional independence in ADLs. Prevent recurrence with self-management skills.',
        'Return to previous occupation and recreational activities within 2–3 months.',
      ],
      treatment: [
        'Patient education. Lumbar stabilisation exercises. Stretching. Manual therapy. HEP.',
        'Joint mobilisation (Maitland Grade [1-4]). Neural mobilisation. Core strengthening. HEP.',
        'Myofascial release. Joint mobilisation. Therapeutic exercises. Postural correction. HEP.',
        'Pain relief modalities. Active mobility exercises. Stabilisation training. Patient education.',
        'Manual therapy. Progressive trunk strengthening. Postural re-education. Work modification advice.',
      ],
      observation: [
        'Reduced lumbar lordosis. Antalgic lean to [side]. Guarded movement pattern.',
        'Flat lumbar spine. No scoliosis. Restricted spinal mobility in all planes.',
        'Increased lumbar lordosis. Forward head posture. Rounded shoulders.',
        'Antalgic posture with lateral shift to [side]. Guarded movement. No deformity.',
        'Normal spinal alignment. Restricted movement. No muscle wasting observed.',
      ],
      palpation: [
        'Tenderness at [L1-L5/C1-C7] spinous process. Paraspinal muscle spasm. Positive PA pressure.',
        'Joint line tenderness at [level]. Muscle guarding at [paraspinals]. Trigger point at [site].',
        'Tenderness over [facet joint/disc level]. Tight [erector spinae/piriformis]. No midline tenderness.',
        'Diffuse paraspinal tenderness. Warmth over [site]. Restricted PA mobility at [level].',
        'Bony tenderness at [spinous process]. Tight hip flexors. Positive trigger point [muscle].',
      ],
    },

    GERIATRIC: {
      impression: [
        'Reduced balance and mobility due to muscle weakness and impaired proprioception.',
        'Impaired mobility and high fall risk due to lower limb weakness and reduced balance.',
        'Reduced functional independence due to muscle weakness, pain and limited ROM.',
        'Poor physical performance from inactivity, reduced strength and flexibility.',
        'Impaired balance and gait with high fall risk due to neurological or musculoskeletal changes.',
      ],
      stg: [
        'Improve balance and reduce fall risk within 2 weeks. Improve bed mobility to Min A.',
        'Improve mobility and strength within 1–2 weeks. Educate on fall prevention strategies.',
        'Improve functional transfer ability within 1 week. Reduce pain to [x]/10 within 2 weeks.',
        'Improve sitting and standing balance within 2 weeks. Educate patient and carer on HEP.',
        'Increase lower limb strength by 1 MMT grade within 2–3 weeks. Improve gait pattern.',
      ],
      ltg: [
        'Achieve independence in home and community activities within 3 months.',
        'Independent ambulation with/without walking aid. Return to gardening/social activities.',
        'Improve overall quality of life. Achieve full functional independence in ADLs.',
        'Maintain independent mobility. Prevent falls. Achieve community ambulation.',
        'Return to previous level of function. Independent self-care and home management.',
      ],
      treatment: [
        'Therapeutic exercises (mobilisation, strengthening, stretching). Gait training. Fall prevention. HEP.',
        'Balance training. Functional task practice. Caregiver education. Home exercise program.',
        'Bed mobility exercises. Transfer training. Progressive strengthening. Patient and family education.',
        'Balance and coordination exercises. Gait re-education. Walking aid assessment. Home program.',
        'Pain management. Strengthening. Postural exercises. Fall prevention strategies. HEP.',
      ],
      observation: [
        'Slow and cautious gait. Use of walking aid. No obvious deformity. Mild muscle wasting.',
        'Unsteady gait pattern. Short step length. Reduced arm swing. Kyphotic posture.',
        'Independent ambulation with [aid]. Antalgic gait. Reduced balance in standing.',
        'Dependent for transfers. Reduced sitting balance. Muscle wasting [bilateral lower limbs].',
        'Normal gait with [aid]. Alert and cooperative. No obvious deformity or swelling.',
      ],
      palpation: [
        'Generalised tenderness at [site]. Reduced skin turgor. Mild muscle wasting.',
        'Tenderness at [joint line]. Normal skin temperature. Reduced muscle bulk [quadriceps].',
        'Joint tenderness Grade [1-3]. Warmth at [site]. Tight [hip flexors/hamstrings].',
        'Bony prominence at [site]. No warmth or swelling. Moderate muscle tightness.',
        'Diffuse tenderness. Reduced muscle tone. Trigger point at [muscle].',
      ],
    },
  };

  // ── Active picker state ─────────────────────────────────
  var activeField  = null;
  var pickerEl     = null;

  // ── Show picker ────────────────────────────────────────
  function show(fieldId, formType, category) {
    var field = document.getElementById(fieldId);
    if (!field) return;

    var items = (TEMPLATES[formType] || {})[category] || [];
    if (!items.length) return;

    // Remove existing picker
    hide();
    activeField = field;

    var picker = document.createElement('div');
    picker.id  = 'ct-picker';
    picker.style.cssText = [
      'position:absolute',
      'z-index:500',
      'background:var(--surface)',
      'border:1px solid var(--accent-mid)',
      'border-radius:var(--radius-lg)',
      'box-shadow:0 4px 16px rgba(0,0,0,0.15)',
      'padding:8px',
      'min-width:320px',
      'max-width:480px',
    ].join(';');

    // Header
    var hdr = document.createElement('div');
    hdr.style.cssText = 'font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;';
    hdr.innerHTML = '<span>Best Statement Templates</span><button onclick="ClinicalTemplates.hide()" style="background:none;border:none;cursor:pointer;color:var(--text-faint);font-size:16px;line-height:1;padding:0 2px;">&#x2715;</button>';
    picker.appendChild(hdr);

    // Template items
    items.forEach(function (text, i) {
      var btn = document.createElement('button');
      btn.className = 'ct-btn';
    btn.style.cssText = [
        'display:block',
        'width:100%',
        'text-align:left',
        'padding:7px 10px',
        'margin-bottom:4px',
        'border:1px solid var(--border)',
        'border-radius:var(--radius)',
        'background:var(--bg)',
        'cursor:pointer',
        'font-family:inherit',
        'font-size:12px',
        'color:var(--text)',
        'line-height:1.4',
        'transition:all 0.12s',
      ].join(';');
      btn.textContent = text;
      btn.addEventListener('mouseover', function () {
        this.style.background = 'var(--accent-light)';
        this.style.borderColor = 'var(--accent-mid)';
      });
      btn.addEventListener('mouseout', function () {
        this.style.background = 'var(--bg)';
        this.style.borderColor = 'var(--border)';
      });
      btn.addEventListener('click', function () {
        insert(text);
      });
      picker.appendChild(btn);
    });

    // Position near the field
    var rect = field.getBoundingClientRect();
    var scrollTop = window.scrollY || document.documentElement.scrollTop;
    picker.style.top  = (rect.bottom + scrollTop + 4) + 'px';
    picker.style.left = rect.left + 'px';

    document.body.appendChild(picker);
    pickerEl = picker;

    // Close on outside click
    setTimeout(function () {
      document.addEventListener('click', outsideClick);
    }, 10);
  }

  function insert(text) {
    if (!activeField) return;
    var cur = activeField.value.trim();
    activeField.value = cur ? cur + '\n' + text : text;
    // Trigger input event so progress bar and dirty tracking update
    activeField.dispatchEvent(new Event('input', { bubbles: true }));
    hide();
    activeField.focus();
  }

  function outsideClick(e) {
    if (pickerEl && !pickerEl.contains(e.target)) {
      hide();
    }
  }

  function hide() {
    if (pickerEl) {
      pickerEl.remove();
      pickerEl = null;
    }
    document.removeEventListener('click', outsideClick);
    activeField = null;
  }

  // ── Render a template button next to a field label ─────
  // Call this to inject a "Templates" button next to any field label
  // Usage: ClinicalTemplates.addButton('field-id', 'MS', 'impression')
  function addButton(fieldId, formType, category) {
    var field = document.getElementById(fieldId);
    if (!field) return;
    var label = field.closest('.field') && field.closest('.field').querySelector('label');
    if (!label) return;
    // Prevent duplicate buttons
    if (label.querySelector('.ct-btn')) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = '+ template';
    btn.style.cssText = [
      'margin-left:8px',
      'font-size:10px',
      'padding:2px 7px',
      'border-radius:10px',
      'border:1px solid var(--accent-mid)',
      'background:var(--accent-light)',
      'color:var(--accent)',
      'cursor:pointer',
      'font-family:inherit',
      'font-weight:500',
      'vertical-align:middle',
    ].join(';');
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      show(fieldId, formType, category);
    });
    label.appendChild(btn);
  }

  return { show: show, hide: hide, addButton: addButton };

})();
