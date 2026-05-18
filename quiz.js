// ── Helpers ────────────────────────────────────────────────
const hasGoal    = (a, g) => Array.isArray(a.goals) && a.goals.includes(g);
const hasConcern = (a, c) => Array.isArray(a.digestive_concerns) && a.digestive_concerns.includes(c);

// ── Storage ────────────────────────────────────────────────
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function upsertResponse(answers, medicalFile) {
  const flat = {};
  Object.entries(answers).forEach(([k, v]) => {
    flat[k] = Array.isArray(v) ? v.join('; ') : v;
  });

  const record = {
    email:      flat.email,
    name:       flat.name       || null,
    first_name: flat.firstName  || null,
    age:        flat.age        || null,
    answers:    flat
  };

  if (medicalFile) {
    if (medicalFile.size > 2 * 1024 * 1024) {
      console.warn('Medical file exceeds 2 MB — not stored');
    } else {
      record.medical_doc_name = medicalFile.name;
      record.medical_doc_data = await fileToBase64(medicalFile);
    }
  }

  const { error } = await db
    .from('responses')
    .upsert(record, { onConflict: 'email' });

  if (error) console.error('Supabase upsert error:', error.message);
}

// ── Question Definitions ───────────────────────────────────
const questions = [

  // INTRO
  {
    id: 'name',
    section: "Let's get started",
    type: 'text',
    question: 'What should we call you?',
    placeholder: 'Your name or nickname'
  },
  {
    id: 'greeting',
    section: "Let's get started",
    type: 'info',
    title: a => `Nice to meet you, ${a.name || 'there'}!`,
    body: "Let's find out which supplements are right for you. This will only take a couple of minutes."
  },
  {
    id: 'privacy',
    section: 'Your privacy',
    type: 'info',
    title: 'Your data is safe with us',
    body: 'We only use your answers to personalise your supplement recommendations. We never sell your data to third parties. Your information is encrypted and stored securely.'
  },
  {
    id: 'supplement_knowledge',
    section: 'About you',
    type: 'single',
    question: 'When it comes to vitamins and supplements, you...',
    options: [
      { value: 'expert',  label: 'Know more than the average person' },
      { value: 'curious', label: 'Know a bit, but want to learn more' },
      { value: 'skeptic', label: 'Am not convinced yet' }
    ]
  },
  {
    id: 'past_supplements',
    section: 'About you',
    type: 'single',
    question: 'Have you taken vitamins and/or supplements in the past?',
    options: [
      { value: 'yes',    label: 'Yes' },
      { value: 'no',     label: 'No' },
      { value: 'on_off', label: 'On and off' }
    ]
  },
  {
    id: 'current_supplements',
    section: 'About you',
    type: 'single',
    question: 'How many vitamins or supplements do you currently take?',
    options: [
      { value: 'none', label: 'None' },
      { value: '1-4',  label: '1 to 4' },
      { value: '5+',   label: 'More than 5' }
    ]
  },

  // BASIC
  {
    id: 'sex',
    section: 'Basic',
    type: 'single',
    question: 'What sex were you assigned at birth?',
    hint: 'We appreciate this might not align with your gender identity.',
    options: [
      { value: 'female',     label: 'Female' },
      { value: 'male',       label: 'Male' },
      { value: 'prefer_not', label: 'Prefer not to say' }
    ]
  },
  {
    id: 'pregnancy',
    section: 'Basic',
    type: 'single',
    question: 'Are you currently trying for a baby, pregnant or have you recently given birth?',
    show: a => a.sex === 'female' || a.sex === 'prefer_not',
    options: [
      { value: 'trying',        label: "I'm trying for a baby" },
      { value: 'pregnant',      label: "I'm pregnant" },
      { value: 'breastfeeding', label: "I'm breastfeeding" },
      { value: 'none',          label: 'None of the above' }
    ]
  },
  {
    id: 'prenatal',
    section: 'Basic',
    type: 'single',
    question: 'Are you interested in prenatal or postnatal health?',
    show: a => (a.sex === 'female' || a.sex === 'prefer_not') && ['trying','pregnant','breastfeeding'].includes(a.pregnancy),
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no',  label: 'No' }
    ]
  },
  {
    id: 'age',
    section: 'Basic',
    type: 'number',
    question: 'How old are you?',
    placeholder: 'Enter your age',
    min: 16, max: 100
  },

  // GOALS
  {
    id: 'goals',
    section: 'Goals',
    type: 'multi',
    maxSelect: 6,
    question: 'Which areas of your health are you looking to improve?',
    hint: "Select up to six goals that you'd like to focus on.",
    options: [
      { value: 'fitness',   label: 'Fitness' },
      { value: 'heart',     label: 'Heart' },
      { value: 'bones',     label: 'Bones' },
      { value: 'brain',     label: 'Brain' },
      { value: 'digestion', label: 'Digestion' },
      { value: 'immunity',  label: 'Immunity' },
      { value: 'stress',    label: 'Stress' },
      { value: 'sleep',     label: 'Sleep' },
      { value: 'joints',    label: 'Joints' },
      { value: 'energy',    label: 'Energy' },
      { value: 'skin',      label: 'Skin' },
      { value: 'hair',      label: 'Hair' }
    ]
  },

  // Digestion follow-ups
  {
    id: 'digestive_concerns',
    section: 'Goals — Digestion',
    type: 'multi',
    question: 'Do any of these digestive health concerns relate to you?',
    show: a => hasGoal(a, 'digestion'),
    options: [
      { value: 'bloating',     label: 'Bloating' },
      { value: 'constipation', label: 'Constipation' },
      { value: 'cramping',     label: 'Cramping' },
      { value: 'diarrhea',     label: 'Diarrhea' },
      { value: 'reflux',       label: 'Reflux' },
      { value: 'none',         label: 'None of the above' }
    ]
  },
  {
    id: 'diarrhea_frequency',
    section: 'Goals — Digestion',
    type: 'single',
    question: 'How often do you experience diarrhea?',
    show: a => hasConcern(a, 'diarrhea'),
    options: [
      { value: 'sometimes', label: 'Once in a while' },
      { value: 'weekly',    label: 'Once a week' },
      { value: 'often',     label: 'More than once a week' }
    ]
  },
  {
    id: 'constipation_frequency',
    section: 'Goals — Digestion',
    type: 'single',
    question: 'How often would you say you are constipated?',
    show: a => hasConcern(a, 'constipation'),
    options: [
      { value: 'sometimes',  label: 'Once in a while' },
      { value: 'weekly',     label: 'Once a week' },
      { value: 'frequently', label: 'Frequently' }
    ]
  },

  // Stress follow-ups
  {
    id: 'stress_level',
    section: 'Goals — Stress',
    type: 'single',
    question: 'How stressed have you been in the last month?',
    show: a => hasGoal(a, 'stress'),
    options: [
      { value: 'very_low',  label: 'Very Low' },
      { value: 'low',       label: 'Low' },
      { value: 'moderate',  label: 'Moderate' },
      { value: 'above_avg', label: 'Above Average' },
      { value: 'high',      label: 'High' }
    ]
  },
  {
    id: 'stress_frequency',
    section: 'Goals — Stress',
    type: 'single',
    question: 'How often do you feel stressed?',
    show: a => hasGoal(a, 'stress'),
    options: [
      { value: 'rare',    label: 'Less than once a month' },
      { value: 'monthly', label: 'Once or twice a month' },
      { value: 'weekly',  label: 'About once or twice per week' },
      { value: 'daily',   label: 'Almost every day' }
    ]
  },

  // Brain follow-ups
  {
    id: 'focus_trouble',
    section: 'Goals — Brain',
    type: 'single',
    question: 'Do you feel you have trouble focusing or concentrating on tasks?',
    show: a => hasGoal(a, 'brain'),
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no',  label: 'No' }
    ]
  },
  {
    id: 'brain_fog',
    section: 'Goals — Brain',
    type: 'single',
    question: 'How often do you experience brain fog?',
    show: a => hasGoal(a, 'brain'),
    options: [
      { value: 'daily',  label: 'Almost every day' },
      { value: 'weekly', label: 'Once or twice a week' },
      { value: 'never',  label: 'Never' }
    ]
  },
  {
    id: 'memory',
    section: 'Goals — Brain',
    type: 'single',
    question: 'Do you need support with your short term memory?',
    show: a => hasGoal(a, 'brain'),
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no',  label: 'No' }
    ]
  },

  // Heart follow-ups
  {
    id: 'heart_history',
    section: 'Goals — Heart',
    type: 'single',
    question: 'Do you have a family history of heart problems?',
    show: a => hasGoal(a, 'heart'),
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no',  label: 'No' }
    ]
  },
  {
    id: 'heart_concerns',
    section: 'Goals — Heart',
    type: 'multi',
    question: 'Are you concerned about any of the below?',
    show: a => hasGoal(a, 'heart'),
    options: [
      { value: 'blood_pressure', label: 'High blood pressure' },
      { value: 'cholesterol',    label: 'High cholesterol' },
      { value: 'cardio',         label: 'General cardiovascular support' },
      { value: 'none',           label: 'None of the above' }
    ]
  },
  {
    id: 'coq10',
    section: 'Goals — Heart',
    type: 'single',
    question: 'Has your doctor or pharmacist recommended that you take Co-Enzyme Q10 (CoQ10) supplements?',
    show: a => hasGoal(a, 'heart'),
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no',  label: 'No' }
    ]
  },

  // Immunity follow-ups
  {
    id: 'illness_frequency',
    section: 'Goals — Immunity',
    type: 'single',
    question: 'In relation to colds, flu and infections — how often do you feel unwell each year?',
    show: a => hasGoal(a, 'immunity'),
    options: [
      { value: 'often',     label: 'More than 4 times' },
      { value: 'sometimes', label: '2–3 times' },
      { value: 'rarely',    label: 'Rarely' }
    ]
  },
  {
    id: 'cold_sores',
    section: 'Goals — Immunity',
    type: 'single',
    question: 'Do you often get cold sores?',
    show: a => hasGoal(a, 'immunity'),
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no',  label: 'No' }
    ]
  },
  {
    id: 'antibiotics',
    section: 'Goals — Immunity',
    type: 'single',
    question: 'Have you taken antibiotics more than twice in the past 3 years?',
    hint: 'Antibiotics can cause microbiome disruption.',
    show: a => hasGoal(a, 'immunity') || hasGoal(a, 'digestion'),
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no',  label: 'No' }
    ]
  },

  // Hair follow-ups
  {
    id: 'hair_concerns',
    section: 'Goals — Hair',
    type: 'multi',
    question: 'What about your hair?',
    show: a => hasGoal(a, 'hair'),
    options: [
      { value: 'dryness',     label: 'Dryness' },
      { value: 'thinning',    label: 'Thinning' },
      { value: 'loss',        label: 'More than usual hair loss' },
      { value: 'slow_growth', label: 'Slow growth' },
      { value: 'none',        label: 'None' }
    ]
  },

  // Skin follow-ups
  {
    id: 'skin_concerns',
    section: 'Goals — Skin',
    type: 'multi',
    question: 'What about your skin?',
    show: a => hasGoal(a, 'skin'),
    options: [
      { value: 'ageing',     label: 'General ageing' },
      { value: 'dryness',    label: 'Dryness' },
      { value: 'elasticity', label: 'Reduced elasticity' },
      { value: 'breakouts',  label: 'Breakouts' },
      { value: 'none',       label: 'None' }
    ]
  },

  // Energy follow-ups
  {
    id: 'energy_level',
    section: 'Goals — Energy',
    type: 'single',
    question: 'Rate your energy levels',
    show: a => hasGoal(a, 'energy'),
    options: [
      { value: 'very_low',  label: 'Very Low' },
      { value: 'low',       label: 'Low' },
      { value: 'moderate',  label: 'Moderate' },
      { value: 'above_avg', label: 'Above Average' },
      { value: 'high',      label: 'High' }
    ]
  },
  {
    id: 'energy_slumps',
    section: 'Goals — Energy',
    type: 'single',
    question: 'Do you often experience energy slumps throughout the day?',
    show: a => hasGoal(a, 'energy'),
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no',  label: 'No' }
    ]
  },
  {
    id: 'morning_sluggish',
    section: 'Goals — Energy',
    type: 'single',
    question: 'Do you often wake up in the morning feeling sluggish?',
    show: a => hasGoal(a, 'energy'),
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no',  label: 'No' }
    ]
  },

  // Bones follow-ups
  {
    id: 'bone_history',
    section: 'Goals — Bones',
    type: 'single',
    question: 'Do you have a family history of bone issues (such as osteoporosis)?',
    show: a => hasGoal(a, 'bones'),
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no',  label: 'No' }
    ]
  },

  // Joints follow-ups
  {
    id: 'joint_concerns',
    section: 'Goals — Joints',
    type: 'single',
    question: 'Are you concerned about or do you experience any of the below?',
    show: a => hasGoal(a, 'joints'),
    options: [
      { value: 'arthritis', label: 'Mild arthritis' },
      { value: 'pain',      label: 'Joint pain' },
      { value: 'none',      label: 'Neither' }
    ]
  },

  // DIET
  {
    id: 'diet',
    section: 'Diet',
    type: 'single',
    question: 'How would you describe your diet?',
    options: [
      { value: 'omnivore',    label: 'I eat almost everything!' },
      { value: 'plant_based', label: 'Prefer plant-based foods' },
      { value: 'vegetarian',  label: 'Vegetarian' },
      { value: 'vegan',       label: 'Vegan' },
      { value: 'other',       label: 'Other' }
    ]
  },
  {
    id: 'meat_frequency',
    section: 'Diet',
    type: 'single',
    question: 'How often do you eat meat?',
    show: a => ['omnivore','plant_based','other'].includes(a.diet),
    options: [
      { value: 'never',  label: 'Never' },
      { value: 'rarely', label: 'Rarely' },
      { value: '1-2pw',  label: 'Once/twice per week' },
      { value: '3pw+',   label: 'Three times per week or more' }
    ]
  },
  {
    id: 'fish_frequency',
    section: 'Diet',
    type: 'single',
    question: 'How often do you eat fish or seafood?',
    show: a => a.diet !== 'vegan',
    options: [
      { value: 'never',  label: 'Never' },
      { value: 'rarely', label: 'Rarely' },
      { value: '1pw',    label: 'Once per week' },
      { value: '2pw+',   label: 'Twice per week or more' }
    ]
  },
  {
    id: 'dairy_frequency',
    section: 'Diet',
    type: 'single',
    question: 'How often do you eat dairy?',
    show: a => a.diet !== 'vegan',
    options: [
      { value: 'never',  label: 'Never' },
      { value: 'rarely', label: 'Rarely' },
      { value: '1-2pw',  label: 'Once/twice per week' },
      { value: '3pw+',   label: 'Three times per week or more' }
    ]
  },
  {
    id: 'fruit_veg',
    section: 'Diet',
    type: 'single',
    question: 'How many serves of fruit and vegetables do you eat daily?',
    hint: 'One serve of vegetables equals one cup of salad vegetables, or half a cup of cooked vegetables.',
    options: [
      { value: 'almost_none', label: 'Almost none' },
      { value: '1-2',         label: '1–2 serves' },
      { value: '3+',          label: '3 serves or more' }
    ]
  },
  {
    id: 'sugar_cravings',
    section: 'Diet',
    type: 'single',
    question: 'Do you need support in managing intense sugar cravings throughout the day?',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no',  label: 'No' }
    ]
  },
  {
    id: 'diet_restrictions',
    section: 'Diet',
    type: 'multi',
    question: 'Do you have any diet restrictions or preferences?',
    options: [
      { value: 'limiting_dairy', label: 'Limiting dairy' },
      { value: 'gluten_free',    label: 'Gluten free' },
      { value: 'paleo',          label: 'Paleo' },
      { value: 'none',           label: 'None' }
    ]
  },
  {
    id: 'allergies',
    section: 'Diet',
    type: 'multi',
    question: 'Are you allergic to any of the following?',
    options: [
      { value: 'none',      label: 'None' },
      { value: 'fish',      label: 'Fish' },
      { value: 'gluten',    label: 'Wheat and/or Gluten' },
      { value: 'milk',      label: 'Milk' },
      { value: 'soy',       label: 'Soy' },
      { value: 'sulphites', label: 'Sulphites' },
      { value: 'yeast',     label: 'Yeast' },
      { value: 'corn',      label: 'Corn/Maize' },
      { value: 'tree_nuts', label: 'Tree nuts' },
      { value: 'peanuts',   label: 'Peanuts' },
      { value: 'egg',       label: 'Egg' },
      { value: 'sesame',    label: 'Sesame' }
    ]
  },

  // LIFESTYLE
  {
    id: 'exercise_days',
    section: 'Lifestyle',
    type: 'single',
    question: 'How many days per week do you exercise on average?',
    options: [
      { value: 'none', label: "I don't exercise" },
      { value: '1',    label: '1' },
      { value: '2-3',  label: '2–3' },
      { value: '4+',   label: '4 or more' }
    ]
  },
  {
    id: 'exercise_type',
    section: 'Lifestyle',
    type: 'multi',
    question: 'What type of exercise do you engage in?',
    show: a => a.exercise_days && a.exercise_days !== 'none',
    options: [
      { value: 'cardio',   label: 'Cardio (running, cycling, HIIT)' },
      { value: 'core',     label: 'Core and stretching (Yoga, Pilates)' },
      { value: 'walking',  label: 'Walking, hiking' },
      { value: 'weights',  label: 'Weightlifting, strength training' },
      { value: 'other',    label: 'Other' }
    ]
  },
  {
    id: 'exercise_intensity',
    section: 'Lifestyle',
    type: 'single',
    question: 'How would you rate the intensity of the exercise you engage in?',
    show: a => a.exercise_days && a.exercise_days !== 'none',
    options: [
      { value: 'very_low',  label: 'Very Low' },
      { value: 'low',       label: 'Low' },
      { value: 'moderate',  label: 'Moderate' },
      { value: 'above_avg', label: 'Above Average' },
      { value: 'high',      label: 'High' }
    ]
  },
  {
    id: 'exercise_goal',
    section: 'Lifestyle',
    type: 'single',
    question: 'When it comes to exercise, you care most about:',
    show: a => a.exercise_days && a.exercise_days !== 'none',
    options: [
      { value: 'performance', label: 'Performance' },
      { value: 'sweat',       label: 'Breaking a sweat' },
      { value: 'toning',      label: 'Muscle Toning' },
      { value: 'building',    label: 'Muscle Building' }
    ]
  },
  {
    id: 'muscle_cramps',
    section: 'Lifestyle',
    type: 'single',
    question: 'Do you sometimes get muscle cramps, tightness, or soreness after being active or exercising?',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no',  label: 'No' }
    ]
  },
  {
    id: 'sunshine',
    section: 'Lifestyle',
    type: 'single',
    question: 'How often do you get 20 min of sunshine (at least on your face and hands, without sunscreen)?',
    options: [
      { value: 'rarely',   label: "Rarely, I don't really get in the sun" },
      { value: 'weekends', label: 'On weekends and holidays only' },
      { value: 'daily',    label: 'Every day!' }
    ]
  },
  {
    id: 'alcohol',
    section: 'Lifestyle',
    type: 'single',
    question: 'Do you often consume 8 or more alcoholic drinks in a week?',
    hint: 'Alcohol can impact nutrient absorption and energy levels.',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no',  label: 'No' }
    ]
  },
  {
    id: 'smoking',
    section: 'Lifestyle',
    type: 'single',
    question: 'Do you smoke or vape regularly?',
    hint: "Smoking and vaping can lower your body's levels of key vitamins like vitamin C and antioxidants.",
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no',  label: 'No' }
    ]
  },
  {
    id: 'urinary',
    section: 'Lifestyle',
    type: 'single',
    question: 'Do you feel you need support with your urinary tract health?',
    show: a => a.sex === 'female' || a.sex === 'prefer_not',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no',  label: 'No' }
    ]
  },
  {
    id: 'screen_fatigue',
    section: 'Lifestyle',
    type: 'single',
    question: 'Do you experience visual fatigue at the end of the day from looking at screens?',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no',  label: 'No' }
    ]
  },
  {
    id: 'iron_recommended',
    section: 'Lifestyle',
    type: 'single',
    question: 'Has your doctor recommended that you take iron?',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no',  label: 'No' }
    ]
  },
  {
    id: 'eastern_medicine',
    section: 'Lifestyle',
    type: 'single',
    question: 'In regards to traditional Eastern Medicines like Ayurveda, you:',
    options: [
      { value: 'believe', label: 'Believe that there is wisdom in alternative medicines.' },
      { value: 'unsure',  label: 'Are unsure and would like more information.' },
      { value: 'skeptic', label: "Are skeptical and don't believe in alternative medicines." }
    ]
  },

  // FINISH
  {
    id: 'medical_docs',
    section: 'Personalise further',
    type: 'upload',
    question: 'Would you like more personalised suggestions?',
    hint: 'Upload any relevant medical documents (blood tests, GP notes, etc.) for more specific recommendations. This is completely optional.'
  },
  {
    id: 'capture',
    section: 'Almost done',
    type: 'capture',
    question: "What's your email address?",
    hint: "We'll show your results instantly and optionally email a copy."
  }
];

// ── State ──────────────────────────────────────────────────
const state = { idx: 0, answers: {} };

// ── Visibility ─────────────────────────────────────────────
function visibleQuestions() {
  return questions.filter(q => !q.show || q.show(state.answers));
}

function currentQ() {
  return visibleQuestions()[state.idx];
}

// ── Progress ───────────────────────────────────────────────
function updateProgress() {
  const visible = visibleQuestions();
  const pct     = ((state.idx + 1) / visible.length) * 100;
  document.getElementById('progressFill').style.width = `${pct}%`;
  document.getElementById('progressLabel').textContent =
    `Step ${state.idx + 1} of ${visible.length}`;
}

// ── Navigation ─────────────────────────────────────────────
function navigate(dir) {
  const q = currentQ();

  if (dir === 1) {
    if (!validateCurrent(q)) return;
    if (state.idx === visibleQuestions().length - 1) { submitQuiz(); return; }
    state.idx++;
  } else {
    if (state.idx === 0) return;
    state.idx--;
  }

  render();
}

function validateCurrent(q) {
  if (q.type === 'text' || q.type === 'number') {
    const input = document.getElementById('qInput');
    if (input && !input.value.trim()) {
      input.classList.add('input--error');
      return false;
    }
    if (input) state.answers[q.id] = input.value.trim();
  }
  if (q.type === 'multi') {
    const selected = state.answers[q.id];
    if (!Array.isArray(selected) || selected.length === 0) {
      const err = document.getElementById('qError');
      if (err) err.style.display = '';
      return false;
    }
  }
  if (q.type === 'capture') {
    const email = document.getElementById('captureEmail');
    if (!email.value.trim()) {
      email.classList.add('input--error');
      return false;
    }
    state.answers.firstName = state.answers.name || '';
    state.answers.email     = email.value.trim();
  }
  return true;
}

// ── Render ─────────────────────────────────────────────────
function render() {
  const q         = currentQ();
  const container = document.getElementById('quizContainer');
  const btnBack   = document.getElementById('btnBack');
  const btnNext   = document.getElementById('btnNext');
  const isLast    = state.idx === visibleQuestions().length - 1;

  btnBack.style.visibility = state.idx === 0 ? 'hidden' : 'visible';
  btnNext.textContent      = isLast ? 'See my plan →' : 'Continue →';

  const manualAdvance = ['multi','text','number','capture','info','upload'].includes(q.type);
  btnNext.style.display = manualAdvance ? '' : 'none';

  container.innerHTML = buildQuestion(q);
  updateProgress();
  restoreSelections(q);

  const inp = document.getElementById('qInput');
  if (inp) inp.focus();
}

function buildQuestion(q) {
  if (q.type === 'info')    return buildInfo(q);
  if (q.type === 'capture') return buildCapture(q);
  if (q.type === 'upload')  return buildUpload(q);

  const hintHtml = q.hint
    ? `<p class="quiz-section__hint">${q.hint}</p>` : '';
  const maxHtml  = q.maxSelect
    ? `<p class="quiz-section__hint">Select up to ${q.maxSelect}.</p>` : '';

  let optionsHtml = '';
  if (q.type === 'text') {
    optionsHtml = `<input id="qInput" class="q-input" type="text"
      placeholder="${q.placeholder || ''}" autocomplete="off"
      onkeydown="if(event.key==='Enter') navigate(1)" />`;
  } else if (q.type === 'number') {
    optionsHtml = `<input id="qInput" class="q-input" type="number"
      placeholder="${q.placeholder || ''}"
      min="${q.min || 0}" max="${q.max || 120}"
      onkeydown="if(event.key==='Enter') navigate(1)" />`;
  } else {
    const isGrid   = q.options && q.options.length > 5;
    const gridClass = isGrid ? 'options--goal-grid' : 'options--list';
    const cards     = q.options.map(o => buildCard(q, o)).join('');
    const errorEl   = q.type === 'multi'
      ? `<p id="qError" style="color:#ef4444;font-size:.85rem;display:none;margin-top:.5rem">Please select at least one option.</p>`
      : '';
    optionsHtml = `<div class="quiz-section__options ${gridClass}">${cards}</div>${errorEl}`;
  }

  return `
    <div class="quiz-section__inner">
      <p class="quiz-section__label">${q.section}</p>
      <h2 class="quiz-section__title">${q.question}</h2>
      ${hintHtml}${maxHtml}
      ${optionsHtml}
    </div>`;
}

function buildCard(q, opt) {
  return `
    <button class="option-card${q.options.length > 5 ? ' option-card--goal' : ''}"
      data-value="${opt.value}"
      onclick="selectOption('${q.id}','${opt.value}',this,${q.type === 'multi'})">
      <span class="option-card__label">${opt.label}</span>
    </button>`;
}

function buildInfo(q) {
  const title = typeof q.title === 'function' ? q.title(state.answers) : q.title;
  return `
    <div class="quiz-section__inner">
      <p class="quiz-section__label">${q.section}</p>
      <h2 class="quiz-section__title">${title}</h2>
      <div class="info-card"><p>${q.body}</p></div>
    </div>`;
}

function buildUpload(q) {
  const saved = state.answers.medical_docs;
  const fileLabel = saved ? `<p class="upload-file-name">Selected: ${saved}</p>` : '';
  return `
    <div class="quiz-section__inner">
      <p class="quiz-section__label">${q.section}</p>
      <h2 class="quiz-section__title">${q.question}</h2>
      <p class="quiz-section__hint">${q.hint}</p>
      <label class="upload-zone" for="fileUpload">
        <div class="upload-zone__icon">↑</div>
        <p class="upload-zone__label">Click to upload or drag and drop</p>
        <p class="upload-zone__sub">PDF, JPG, PNG up to 10MB</p>
        <input id="fileUpload" type="file" accept=".pdf,.jpg,.jpeg,.png"
          style="display:none" onchange="handleFileUpload(this)" />
      </label>
      ${fileLabel}
      <button class="btn btn--ghost btn--sm" style="align-self:flex-start"
        onclick="navigate(1)">Skip this step →</button>
    </div>`;
}

function handleFileUpload(input) {
  if (input.files && input.files[0]) {
    state.answers.medical_docs = input.files[0].name;
    // Store file reference for backend upload
    state.medicalFile = input.files[0];
    const label = document.querySelector('.upload-zone__label');
    if (label) label.textContent = input.files[0].name;
    document.querySelector('.upload-zone').classList.add('upload-zone--selected');
  }
}

function buildCapture(q) {
  return `
    <div class="quiz-section__inner">
      <p class="quiz-section__label">${q.section}</p>
      <h2 class="quiz-section__title">${q.question}</h2>
      <p class="quiz-section__hint">${q.hint}</p>
      <div class="capture-form">
        <div class="form-group">
          <label for="captureEmail">Email address</label>
          <input id="captureEmail" class="q-input" type="email"
            placeholder="jane@example.com" autocomplete="email"
            value="${state.answers.email || ''}" />
        </div>
        <p class="form-disclaimer">No spam, ever. Unsubscribe any time.</p>
      </div>
    </div>`;
}

function restoreSelections(q) {
  if (!q.options) return;
  const saved = state.answers[q.id];
  if (!saved) return;
  document.querySelectorAll('.option-card[data-value]').forEach(btn => {
    const v = btn.dataset.value;
    if (Array.isArray(saved) ? saved.includes(v) : saved === v) {
      btn.classList.add('option-card--selected');
    }
  });
}

// ── Option Selection ───────────────────────────────────────
function selectOption(key, value, el, multiSelect) {
  const container = el.closest('.quiz-section__options');

  if (!multiSelect) {
    container.querySelectorAll('.option-card').forEach(c => c.classList.remove('option-card--selected'));
    el.classList.add('option-card--selected');
    state.answers[key] = value;
    setTimeout(() => navigate(1), 300);
  } else {
    const q = questions.find(q => q.id === key);
    if (!Array.isArray(state.answers[key])) state.answers[key] = [];

    if (el.classList.contains('option-card--selected')) {
      el.classList.remove('option-card--selected');
      state.answers[key] = state.answers[key].filter(v => v !== value);
    } else {
      if (q && q.maxSelect && state.answers[key].length >= q.maxSelect) return;
      el.classList.add('option-card--selected');
      state.answers[key].push(value);
    }
  }
}

// ── Submit ─────────────────────────────────────────────────
async function submitQuiz() {
  sessionStorage.setItem('quizAnswers', JSON.stringify(state.answers));
  await upsertResponse(state.answers, state.medicalFile || null);
  window.location.href = 'results.html';
}

// ── Init ───────────────────────────────────────────────────
render();
