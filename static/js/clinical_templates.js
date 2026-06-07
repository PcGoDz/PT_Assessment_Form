// clinical_templates.js
// Reusable clinical template picker based on KKM Best Statement documents
// Usage: ClinicalTemplates.show(fieldId, formType, category)
// formType: 'MS' | 'SPINE' | 'GERIATRIC' | 'CR' | 'AMPUTATION' | 'NEURO' | 'HAND' | 'BURN'
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

    NEURO: {
      impression_bsf: [
        'Reduced muscle strength (MMT grade __/5) bilateral/unilateral lower/upper limbs secondary to upper motor neuron lesion.',
        'Spastic hemiplegia with increased tone (Modified Ashworth __) in affected limbs. Reduced selective motor control.',
        'Impaired postural stability and equilibrium reactions. Decreased core activation and trunk control.',
        'Decreased exercise tolerance with exertional dyspnoea. Cardiorespiratory deconditioning secondary to prolonged immobility.',
        'Parkinson\'s Disease — bradykinesia, rigidity, postural instability. Freezing of gait present.',
        'Ataxia with impaired coordination and balance. Dysmetria noted on cerebellar testing.',
        'Peripheral neuropathy — reduced sensation and proprioception bilateral lower limbs. Steppage gait pattern.',
        'Reduced ROM and joint mobility secondary to spasticity and disuse. Soft tissue tightness noted.',
      ],
      impression_al: [
        'Difficulty maintaining sitting balance without upper limb support. Transfers requiring moderate assistance.',
        'Inability to stand independently. Sit-to-stand requiring maximum assistance of 2 persons.',
        'Gait limited to short distances with walking frame and maximal assistance. Step-through pattern not achieved.',
        'Dependence in ADLs including dressing, grooming, and personal hygiene due to hemiplegia.',
        'Unable to climb stairs. Community mobility restricted to indoor walking with supervision.',
        'Limited walking endurance — unable to sustain ambulation beyond __ metres before fatigue.',
        'Communication difficulty affecting participation in therapy and social interaction.',
      ],
      impression_pr: [
        'Unable to return to occupational duties. Vocational rehabilitation referral indicated.',
        'Dependent on caregiver for community mobility and social participation.',
        'Unable to participate in recreational and leisure activities previously enjoyed.',
        'Limited community integration — unable to use public transport or navigate outdoors independently.',
        'Caregiver strain identified — family education and respite planning required.',
        'Social isolation secondary to mobility and communication limitations.',
      ],
      stg: [
        'Achieve sitting balance without upper limb support for 60 seconds within 2 weeks.',
        'Progress sit-to-stand with minimal assistance (1 person) within 2 weeks.',
        'Ambulate 10 metres with walking frame and supervision within 2 weeks.',
        'Improve MRMI score by __ points within 4 weeks.',
        'Reduce tone in affected limb to Ashworth grade __ within 3 weeks via stretching and positioning.',
        'Achieve independent wheelchair mobility on level surface within 2 weeks.',
        'Improve TUG by __ seconds within 4 weeks.',
      ],
      ltg: [
        'Independent ambulation with/without walking aid on level surfaces within 8 weeks.',
        'Achieve MRMI score >= __ / 40 within 3 months.',
        'Return to modified independent ADLs within 3 months.',
        'Community ambulation with supervision within 3 months.',
        'Return to pre-morbid mobility level or functional independence within __ months.',
        'TUG < 13.5 seconds (Stroke) / < 11.5 seconds (PD) within 3 months.',
        'Berg Balance Scale >= 45 / 56 within 3 months.',
      ],
      plan: [
        'Task-specific training — repetitive reaching, grasp-release, stepping, sit-to-stand practice.',
        'Gait retraining — parallel bars, walking frame, progressing to quad stick or single point.',
        'Balance training — seated, standing, perturbation challenges, dual-task activities.',
        'Stretching and positioning program — anti-spasticity positioning, passive and active-assisted stretching.',
        'Strengthening — progressive resistance UL/LL, core stabilisation, functional tasks.',
        'Neuroplasticity approaches — mirror therapy, mental practice, task repetition, CIMT principles.',
        'Caregiver / family training — safe guarding, transfer technique, positioning, HEP supervision.',
        'Fatigue management — pacing strategies, rest periods, graded activity progression.',
        'HEP issued and demonstrated. Compliance and safety reviewed.',
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

    NEURO_SOAP: {
      objective: [
        'MRMI: Turn __/5  L-S __/5  SitBal __/5  S-St __/5  Stand __/5  Xfer __/5  Walk __/5  Stairs __/5  Total __/40\nTUG: __ sec  Berg: __/56  FRT: __ cm',
        'Tone: RUL __  LUL __  RLL __  LLL __ (Modified Ashworth)\nMMT: Hip flex R__/5 L__/5  Knee ext R__/5 L__/5  DF R__/5 L__/5',
        'Balance: Sit __ Stand __\nGait: pattern __  Aid __\n10MWT: __ sec (__m/s)  6MWT: __ m  Borg: __/10',
        'BP: __/__  HR: __  RR: __  SpO2: __%\nVAS pre: __/10  post: __/10',
      ],
      analysis: [
        'Motor recovery progressing — tone reducing, active movement emerging. Brunnstrom Stage __ UL / LL.',
        'Balance improving — from max A to mod A in standing. Weight-shifting increasing. Fall risk reducing.',
        'Gait pattern improved — step length increasing, less circumduction. Progressing to outdoor surfaces.',
        'Spasticity limiting functional movement. Adding stretching and positioning to management plan.',
        'Fatigue remains limiting factor. Pacing strategies reinforced. Monitoring Borg during sessions.',
        'Cognitive fatigue noted — sessions kept to 45 min max. Caregiver trained in HEP.',
        'MRMI score improved from last session. Transfer technique consolidating.',
        'TUG improving — fall risk trajectory positive. Targeting community ambulation.',
        'Plateau in motor recovery — reviewing exercise intensity and task-specific training approach.',
        'Communication barriers managed — using gesture + picture board. Family interpreter engaged.',
        "Post-stroke shoulder pain managed — rotator cuff protection, strapping applied. Patient's report of pain reducing.",
        'Parkinson — freezing episodes reducing with cueing strategies. Dual-task training introduced.',
        'Post-ICU deconditioning — endurance building with graded activity. SpO2 maintained > 95% throughout.',
      ],
      plan: [
        'Continue task-specific training — repetitive reaching, grasp-release, stepping practice.',
        'Progress balance training — reduce support, increase perturbation, introduce dual-task.',
        'Gait retraining — extend distance, introduce uneven terrain, ramps and stairs.',
        'Stretch and positioning program — continue anti-spasticity positioning, carer trained.',
        'Strengthening — progressive resistance UL/LL targeting functional tasks.',
        'Caregiver/family training — safe guarding, transfer technique, HEP supervision.',
        'Neuroplasticity exercises — mirror therapy, mental practice, task repetition.',
        'Fatigue management — pacing strategy, rest periods, energy conservation education.',
        'Reassess MRMI, TUG, Berg, FRT next session to track outcome progression.',
        'Continue current plan. Review goals next session.',
      ],
    },

    HAND_SOAP: {
      objective: [
        'Wrist flexion __° (was __°). Extension __° (was __°). Grip strength __ kg R, __ kg L. Oedema [stable/reduced].',
        'ROM unchanged from last session. Grip strength __ kg. Patient reports pain __/10 at rest, __/10 with activity.',
      ],
      analysis: [
        'ROM improving as expected. Patient tolerating exercise progression well. On track for [goal].',
        'Plateau in ROM gains. Consider [technique change/referral for further investigation]. Continue current programme.',
      ],
      plan: [
        'Progress to next stage of rehabilitation protocol. Increase resistance for strengthening. Continue HEP reinforcement.',
        'Maintain current exercise programme. Review in [timeframe]. Consider discharge planning if goals met.',
      ],
    },

    BURN_SOAP: {
      subjective: [
        'Patient reports pain VAS [x]/10 at rest, [y]/10 on movement. Dressing change [date]. Tolerating positioning.',
        'Patient reports reduced exercise tolerance. Breathless on minimal exertion. Cough [productive/non-productive].',
        'Patient complains of stiffness in [joint] with reduced ability to [function].',
      ],
      objective: [
        'Obs: SpO2 [x]% on RA/[O2 delivery]. RR [x]/min. Temp [x]°C. Breath sounds [clear/reduced/crep].',
        'ROM: [joint] active [x]°, passive [x]°. TBSA [x]%. Wound [condition]. Oedema [present/absent].',
        'Chest expansion: apical [sym/asym], middle [sym/asym], lower costal [sym/asym].',
      ],
      analysis: [
        'Progressing as expected. ROM maintained. Wound healing adequately.',
        'Reduced chest expansion persists. High risk of sputum retention. Airway clearance prioritised.',
        'Contracture risk at [joint]. Stretching and positioning protocol reinforced.',
      ],
      plan: [
        'Continue ROM exercises BD. Review in [x] days. Escalate if ROM declines.',
        'Airway clearance techniques BD. Reassess chest expansion at next session.',
        'Commence pressure garment fitting once wound healed. Refer occupational therapy for splinting.',
      ],
    },

  };

  // ── HAND form templates (registered directly for addButton compatibility) ──
  var HAND_OBS = [
    'Hand appears well-formed with no gross deformity. Skin intact, normal colour and texture. No oedema observed.',
    'Post-operative wound noted at [site] — [healing stage]. Sutures [present/removed]. No signs of infection. Moderate periarticular oedema.',
    'Diffuse oedema noted over [dorsal/palmar] aspect. [Deformity type] deformity observed at [joint]. Skin intact. No wound.',
  ];
  var HAND_PALP = [
    'Tenderness on palpation over [joint] joint — [mild/moderate/severe]. Temperature [normal/warm]. No crepitus noted.',
    'Tenderness along [tendon name] tendon sheath. Temperature [normal/warm]. Crepitus [absent/present] on AROM.',
    'Tenderness at carpal tunnel. Tinel\'s [positive/negative] at wrist. Phalen\'s [positive/negative] at 60 seconds.',
  ];
  var HAND_IMPRESSION = [
    'Pain, oedema and restricted ROM of [joint] following [fracture type] fracture managed [conservatively/surgically]. Reduced grip strength and functional hand use.',
    'Post-operative tendon repair at [tendon]. Restricted AROM within protective range. No signs of re-rupture. Oedema present.',
    'Carpal tunnel syndrome — positive Tinel\'s and Phalen\'s bilaterally. Reduced light touch [median nerve distribution]. Grip and pinch strength reduced.',
    'Radial nerve palsy — wrist drop present. MMT [0–2]/5 wrist extensors. Sensation intact over first dorsal web space. Functional grip severely limited.',
  ];
  var HAND_STG = [
    'Reduce pain score from __/10 to __/10 on NPRS within __ weeks.',
    'Reduce hand/wrist circumference at __ by __ cm within __ weeks.',
    'Improve active __ ROM from __° to __° within __ weeks.',
    'Improve passive __ ROM from __° to __° within __ weeks.',
    'Achieve grip strength of __ kg on affected side within __ weeks.',
    'Achieve pinch strength (lateral/pulp/3-point) of __ kg within __ weeks.',
    'Demonstrate independent donning/doffing of splint within __ sessions.',
    'Achieve __/5 MMT grade for __ within __ weeks.',
  ];
  var HAND_LTG = [
    'Achieve functional ROM (>50° flexion/extension) at __ joint within __ months.',
    'Achieve grip strength >__ kg or __% of unaffected side within __ months.',
    'Return to occupational tasks (__) without compensatory movement within __ months.',
    'Independent in ADLs involving affected hand within __ months.',
    'Return to work/duty (__) within __ months.',
    'Maintain ROM and strength gains with home exercise programme.',
    'Prevent recurrence/contracture through patient education and self-management.',
    'Achieve __/5 MMT grade across all relevant myotomes within __ months.',
  ];
  var HAND_PLAN = [
    'Pain management — TENS / cryotherapy / wax bath, __ minutes per session, __ sessions per week.',
    'Oedema management — elevation, retrograde massage, compression glove for __ weeks.',
    'ROM exercises — AROM/PROM for __ joint, __ reps x __ sets, __ times daily.',
    'Strengthening — graded grip/pinch exercises with putty/hand gripper, progressing from __ to __ resistance.',
    'Tendon/nerve gliding exercises — __ reps hourly during waking hours.',
    'Functional training — grasp, pinch, dexterity tasks relevant to patient\'s occupation/ADL.',
    'Scar management — silicone gel/massage starting __ weeks post-op for __ weeks.',
    'Patient education — joint protection, activity modification, sensory precautions, HEP review.',
    'Home exercise programme with written instructions and follow-up at __ weeks.',
  ];
  // Register HAND templates into TEMPLATES so show() finds them via TEMPLATES[formType][category]
  TEMPLATES.HAND = {
    observation: HAND_OBS,
    palpation:   HAND_PALP,
    impression:  HAND_IMPRESSION,
    stg:         HAND_STG,
    ltg:         HAND_LTG,
    treatment:   HAND_PLAN,
  };

  // ── BURN form templates ──────────────────────────────────────────
  TEMPLATES.BURN = {
    impression: [
      'Reduced chest expansion secondary to pain on inspiration, limiting thoracic mobility.',
      'Limited shoulder ROM secondary to scar tightness restricting overhead reach.',
      'Impaired hand function secondary to oedema and burn contracture.',
      'Decreased exercise tolerance secondary to pain and deconditioning.',
      'Risk of contracture across grafted areas secondary to reduced ROM.',
    ],
    stg: [
      'Maintain functional ROM at [joint] and prevent contracture formation within [x] weeks.',
      'Reduce pain to VAS <= 3/10 during dressing changes within [x] weeks.',
      'Improve exercise tolerance — ambulate [x] metres without dyspnoea within [x] weeks.',
      'Achieve independent airway clearance technique within [x] sessions.',
      'Reduce periarticular oedema at [joint] within [x] weeks.',
    ],
    ltg: [
      'Achieve full functional ROM at affected joints within [x] months.',
      'Return to pre-morbid ADL level with adapted technique within [x] months.',
      'Independent pressure garment application and scar management within [x] months.',
      'Return to community ambulation and social participation within [x] months.',
      'Sustain home exercise programme independently prior to discharge.',
    ],
    treatment: [
      'Positioning — anti-contracture positioning [details]. Splinting [static/dynamic] at [joint].',
      'ROM exercises — AROM/PROM [joint], [reps] x [sets], [frequency]. Scar stretching included.',
      'Airway clearance — ACBT / breathing exercises, positioning, assisted cough if required.',
      'Oedema management — elevation, compression bandaging, retrograde massage.',
      'Ambulation and exercise tolerance — graded mobilisation, [distance/duration], [frequency].',
      'Scar management — pressure therapy, silicone, massage once wound healed.',
      'Patient and carer education — contracture prevention, HEP, skin care.',
    ],
  };

  // SCI form templates
  TEMPLATES.SCI = {
    impression: [
      'Reduce sitting balance due lacks lower trunk stability.',
      'Reduce functional ability due to lacks lower trunk stability and lower limb control.',
      'Reduced cough effectiveness due to loss of abdominal muscle control.',
      'Reduced [sitting/standing] balance secondary to [level] lesion with impaired trunk control.',
      'Impaired functional mobility secondary to [complete/incomplete] [level] SCI (ASIA [A/B/C/D]).',
      'High risk for pressure ulcers secondary to impaired sensation and immobility.',
    ],
    stg: [
      'Maintain skin integrity and prevent pressure sores via education and positioning.',
      'Improve static sitting balance for __ minutes without hand support (using trunk control strategies).',
      'Educate on proper pressure relief techniques every __ minutes.',
      'Initiate breathing exercises and assisted cough techniques to improve secretion clearance.',
      'Improve __ AROM to __° within __ weeks.',
      'Achieve independent bed mobility (rolling, supine-to-sit) within __ weeks.',
    ],
    ltg: [
      'Perform independent transfers using a sliding board or assistive device.',
      'Maintain unsupported sitting balance for at least __ minutes during daily activities.',
      'Propel and navigate wheelchair safely over different surfaces.',
      'Prevent joint contractures through daily ROM exercises and correct positioning.',
      'Achieve independent [wheelchair-level / ambulatory] mobility within __ weeks.',
      'Return to modified ADLs and home/community participation within __ weeks.',
    ],
    treatment: [
      'Positioning & ROM — anti-pressure positioning, daily passive/active-assisted ROM to prevent contractures.',
      'Therapeutic exercise — progressive strengthening of preserved muscle groups, __ reps x __ sets, __ daily.',
      'Balance and trunk control — graded sitting balance retraining, reaching tasks, trunk stabilisation.',
      'Functional training — bed mobility, transfers, wheelchair skills relevant to patient\'s level.',
      'Respiratory therapy — breathing exercises, assisted cough / airway clearance, chest expansion.',
      'Spasticity management — sustained stretching, positioning, [tone-reduction technique] as indicated.',
      'Education — pressure care, skin checks, HEP, carer training, contracture prevention.',
    ],
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
