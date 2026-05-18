// ── Auth ───────────────────────────────────────────────────
async function checkPw() {
  const email    = document.getElementById('pwInput').value.trim();
  const password = document.getElementById('pwPassword').value;

  const { error } = await db.auth.signInWithPassword({ email, password });

  if (error) {
    document.getElementById('pwError').style.display = '';
    document.getElementById('pwError').textContent = error.message;
    return;
  }

  showAdmin();
}

async function signOut() {
  await db.auth.signOut();
  location.reload();
}

function showAdmin() {
  document.getElementById('authGate').style.display  = 'none';
  document.getElementById('adminMain').style.display = '';
  renderTable();
}

// ── Load responses ─────────────────────────────────────────
async function loadResponses() {
  const { data, error } = await db
    .from('responses')
    .select('*')
    .order('submitted_at', { ascending: false });

  if (error) { console.error(error.message); return []; }
  return data || [];
}

// ── Table ──────────────────────────────────────────────────
async function renderTable() {
  const q   = (document.getElementById('searchBox').value || '').toLowerCase().trim();
  const all = await loadResponses();

  const filtered = all.filter(r =>
    !q ||
    (r.first_name || r.name || '').toLowerCase().includes(q) ||
    (r.email || '').toLowerCase().includes(q)
  );

  document.getElementById('totalBadge').textContent =
    `${all.length} response${all.length !== 1 ? 's' : ''}`;

  const tbody = document.getElementById('adminTbody');
  const empty = document.getElementById('adminEmpty');

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = '';
    return;
  }
  empty.style.display = 'none';

  tbody.innerHTML = filtered.map((r, i) => {
    const name    = r.first_name || r.name || '—';
    const email   = r.email || '—';
    const age     = r.age || '—';
    const goals   = r.answers?.goals
      ? r.answers.goals.split('; ').slice(0, 3).join(', ') +
        (r.answers.goals.split('; ').length > 3 ? '…' : '')
      : '—';
    const ts  = r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : '—';
    const doc = r.medical_doc_name
      ? `<span class="badge badge--green" style="font-size:.72rem">✓ doc</span>`
      : `<span style="color:var(--clr-muted);font-size:.85rem">—</span>`;

    return `<tr>
      <td>${name}</td>
      <td>${email}</td>
      <td>${age}</td>
      <td class="admin-cell-truncate">${goals}</td>
      <td>${ts}</td>
      <td>${doc}</td>
      <td><button class="btn btn--ghost btn--sm" onclick="openDetail(${all.indexOf(r)})">View →</button></td>
    </tr>`;
  }).join('');

  // Store for detail view
  window._adminRows = all;
}

// ── Detail drawer ──────────────────────────────────────────
function openDetail(idx) {
  const r = window._adminRows?.[idx];
  if (!r) return;

  document.getElementById('drawerTitle').textContent =
    r.first_name || r.name || r.email || 'Response';

  const labelMap = {
    name: 'Nickname', first_name: 'First name', email: 'Email', age: 'Age',
    submitted_at: 'Submitted', updated_at: 'Last updated'
  };

  const skip = new Set(['id', 'medical_doc_data', 'answers', 'name']);

  const metaRows = Object.entries(r)
    .filter(([k]) => !skip.has(k))
    .map(([k, v]) => {
      const label   = labelMap[k] || k.replace(/_/g, ' ');
      const display = (k === 'submitted_at' || k === 'updated_at') && v
        ? new Date(v).toLocaleString()
        : (v || '—');
      return `<div class="detail-row">
        <span class="detail-key">${label}</span>
        <span class="detail-val">${display}</span>
      </div>`;
    }).join('');

  const docHtml = r.medical_doc_data ? `
    <div class="detail-doc-section">
      <span class="detail-key">Medical document</span>
      <a href="${r.medical_doc_data}" download="${r.medical_doc_name}"
        class="btn btn--outline btn--sm" style="align-self:flex-start">
        ↓ Download ${r.medical_doc_name}
      </a>
    </div>` : '';

  const deleteHtml = `
    <div style="margin-top:2rem;padding-top:1.5rem;border-top:1px solid var(--clr-border)">
      <button style="background:none;border:1px solid #ef4444;color:#ef4444;padding:.4rem .85rem;
        border-radius:var(--radius-sm);font-size:.85rem;cursor:pointer;font-weight:500"
        onclick="deleteResponse('${r.id}','${(r.first_name || r.name || r.email || 'this user').replace(/'/g, "\\'")}')">
        ✕ Delete this user
      </button>
    </div>`;

  window._currentDrawerRecord = r;
  document.getElementById('drawerBody').innerHTML = metaRows + buildAdminAnswerRows(r) + docHtml + deleteHtml;
  document.getElementById('detailOverlay').style.display = 'flex';
}

function closeDetail() {
  document.getElementById('detailOverlay').style.display = 'none';
}

// ── Admin answer editing ────────────────────────────────────
const adminFieldConfig = {
  firstName:    { label: 'Name',                   type: 'text',   placeholder: 'Name' },
  email:        { label: 'Email',                  type: 'email',  placeholder: 'jane@example.com' },
  age:          { label: 'Age',                    type: 'number', placeholder: 'Age', min: 16, max: 100 },
  supplement_knowledge: { label: 'Supplement knowledge', type: 'single', options: [
    { value: 'expert',  label: 'Know more than the average person' },
    { value: 'curious', label: 'Know a bit, but want to learn more' },
    { value: 'skeptic', label: 'Am not convinced yet' }
  ]},
  past_supplements: { label: 'Past supplements', type: 'single', options: [
    { value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'on_off', label: 'On and off' }
  ]},
  current_supplements: { label: 'Current supplements', type: 'single', options: [
    { value: 'none', label: 'None' }, { value: '1-4', label: '1 to 4' }, { value: '5+', label: 'More than 5' }
  ]},
  sex: { label: 'Sex', type: 'single', options: [
    { value: 'female', label: 'Female' }, { value: 'male', label: 'Male' },
    { value: 'prefer_not', label: 'Prefer not to say' }
  ]},
  pregnancy: { label: 'Pregnancy status', type: 'single', options: [
    { value: 'trying', label: 'Trying for a baby' }, { value: 'pregnant', label: 'Pregnant' },
    { value: 'breastfeeding', label: 'Breastfeeding' }, { value: 'none', label: 'None of the above' }
  ]},
  prenatal: { label: 'Prenatal interest', type: 'single', options: [
    { value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }
  ]},
  goals: { label: 'Goals', type: 'multi', options: [
    { value: 'fitness', label: 'Fitness' },   { value: 'heart',    label: 'Heart' },
    { value: 'bones',   label: 'Bones' },     { value: 'brain',    label: 'Brain' },
    { value: 'digestion',label:'Digestion' }, { value: 'immunity', label: 'Immunity' },
    { value: 'stress',  label: 'Stress' },    { value: 'sleep',    label: 'Sleep' },
    { value: 'joints',  label: 'Joints' },    { value: 'energy',   label: 'Energy' },
    { value: 'skin',    label: 'Skin' },      { value: 'hair',     label: 'Hair' }
  ]},
  digestive_concerns: { label: 'Digestive concerns', type: 'multi', options: [
    { value: 'bloating', label: 'Bloating' }, { value: 'constipation', label: 'Constipation' },
    { value: 'cramping', label: 'Cramping' }, { value: 'diarrhea',     label: 'Diarrhea' },
    { value: 'reflux',   label: 'Reflux' },   { value: 'none',         label: 'None of the above' }
  ]},
  diarrhea_frequency: { label: 'Diarrhea frequency', type: 'single', options: [
    { value: 'sometimes', label: 'Once in a while' }, { value: 'weekly', label: 'Once a week' },
    { value: 'often', label: 'More than once a week' }
  ]},
  constipation_frequency: { label: 'Constipation frequency', type: 'single', options: [
    { value: 'sometimes', label: 'Once in a while' }, { value: 'weekly', label: 'Once a week' },
    { value: 'frequently', label: 'Frequently' }
  ]},
  stress_level: { label: 'Stress level', type: 'single', options: [
    { value: 'very_low', label: 'Very Low' }, { value: 'low', label: 'Low' },
    { value: 'moderate', label: 'Moderate' }, { value: 'above_avg', label: 'Above Average' },
    { value: 'high', label: 'High' }
  ]},
  stress_frequency: { label: 'Stress frequency', type: 'single', options: [
    { value: 'rare',    label: 'Less than once a month' },
    { value: 'monthly', label: 'Once or twice a month' },
    { value: 'weekly',  label: 'About once or twice per week' },
    { value: 'daily',   label: 'Almost every day' }
  ]},
  focus_trouble: { label: 'Focus trouble',    type: 'single', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]},
  brain_fog:     { label: 'Brain fog',        type: 'single', options: [
    { value: 'daily', label: 'Almost every day' }, { value: 'weekly', label: 'Once or twice a week' }, { value: 'never', label: 'Never' }
  ]},
  memory:        { label: 'Memory support',   type: 'single', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]},
  heart_history: { label: 'Heart history',    type: 'single', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]},
  heart_concerns: { label: 'Heart concerns', type: 'multi', options: [
    { value: 'blood_pressure', label: 'High blood pressure' }, { value: 'cholesterol', label: 'High cholesterol' },
    { value: 'cardio', label: 'Cardiovascular support' },      { value: 'none', label: 'None of the above' }
  ]},
  coq10:            { label: 'CoQ10 recommended',  type: 'single', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]},
  illness_frequency:{ label: 'Illness frequency',  type: 'single', options: [
    { value: 'often', label: 'More than 4 times' }, { value: 'sometimes', label: '2–3 times' }, { value: 'rarely', label: 'Rarely' }
  ]},
  cold_sores:       { label: 'Cold sores',          type: 'single', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]},
  antibiotics:      { label: 'Antibiotics (3yr)',   type: 'single', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]},
  hair_concerns: { label: 'Hair concerns', type: 'multi', options: [
    { value: 'dryness', label: 'Dryness' }, { value: 'thinning', label: 'Thinning' },
    { value: 'loss', label: 'Hair loss' },  { value: 'slow_growth', label: 'Slow growth' }, { value: 'none', label: 'None' }
  ]},
  skin_concerns: { label: 'Skin concerns', type: 'multi', options: [
    { value: 'ageing', label: 'General ageing' }, { value: 'dryness', label: 'Dryness' },
    { value: 'elasticity', label: 'Reduced elasticity' }, { value: 'breakouts', label: 'Breakouts' }, { value: 'none', label: 'None' }
  ]},
  energy_level:    { label: 'Energy level',        type: 'single', options: [
    { value: 'very_low', label: 'Very Low' }, { value: 'low', label: 'Low' },
    { value: 'moderate', label: 'Moderate' }, { value: 'above_avg', label: 'Above Average' }, { value: 'high', label: 'High' }
  ]},
  energy_slumps:   { label: 'Energy slumps',       type: 'single', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]},
  morning_sluggish:{ label: 'Morning sluggishness', type: 'single', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]},
  bone_history:    { label: 'Bone history',         type: 'single', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]},
  joint_concerns:  { label: 'Joint concerns',       type: 'single', options: [
    { value: 'arthritis', label: 'Mild arthritis' }, { value: 'pain', label: 'Joint pain' }, { value: 'none', label: 'Neither' }
  ]},
  diet: { label: 'Diet', type: 'single', options: [
    { value: 'omnivore',    label: 'I eat almost everything!' },
    { value: 'plant_based', label: 'Prefer plant-based foods' },
    { value: 'vegetarian',  label: 'Vegetarian' },
    { value: 'vegan',       label: 'Vegan' },
    { value: 'other',       label: 'Other' }
  ]},
  meat_frequency:  { label: 'Meat frequency',  type: 'single', options: [
    { value: 'never', label: 'Never' }, { value: 'rarely', label: 'Rarely' },
    { value: '1-2pw', label: 'Once/twice per week' }, { value: '3pw+', label: 'Three+ times per week' }
  ]},
  fish_frequency:  { label: 'Fish frequency',  type: 'single', options: [
    { value: 'never', label: 'Never' }, { value: 'rarely', label: 'Rarely' },
    { value: '1pw',   label: 'Once per week' }, { value: '2pw+', label: 'Twice+ per week' }
  ]},
  dairy_frequency: { label: 'Dairy frequency', type: 'single', options: [
    { value: 'never', label: 'Never' }, { value: 'rarely', label: 'Rarely' },
    { value: '1-2pw', label: 'Once/twice per week' }, { value: '3pw+', label: 'Three+ times per week' }
  ]},
  fruit_veg:       { label: 'Fruit & veg',     type: 'single', options: [
    { value: 'almost_none', label: 'Almost none' }, { value: '1-2', label: '1–2 serves' }, { value: '3+', label: '3+ serves' }
  ]},
  sugar_cravings:  { label: 'Sugar cravings',  type: 'single', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]},
  diet_restrictions: { label: 'Diet restrictions', type: 'multi', options: [
    { value: 'limiting_dairy', label: 'Limiting dairy' }, { value: 'gluten_free', label: 'Gluten free' },
    { value: 'paleo', label: 'Paleo' }, { value: 'none', label: 'None' }
  ]},
  allergies: { label: 'Allergies', type: 'multi', options: [
    { value: 'none',      label: 'None' },       { value: 'fish',      label: 'Fish' },
    { value: 'gluten',    label: 'Wheat/Gluten'},{ value: 'milk',      label: 'Milk' },
    { value: 'soy',       label: 'Soy' },        { value: 'sulphites', label: 'Sulphites' },
    { value: 'yeast',     label: 'Yeast' },      { value: 'corn',      label: 'Corn/Maize' },
    { value: 'tree_nuts', label: 'Tree nuts' },  { value: 'peanuts',   label: 'Peanuts' },
    { value: 'egg',       label: 'Egg' },        { value: 'sesame',    label: 'Sesame' }
  ]},
  exercise_days: { label: 'Exercise days', type: 'single', options: [
    { value: 'none', label: "I don't exercise" }, { value: '1', label: '1' },
    { value: '2-3',  label: '2–3' },              { value: '4+', label: '4 or more' }
  ]},
  exercise_type: { label: 'Exercise type', type: 'multi', options: [
    { value: 'cardio',   label: 'Cardio' }, { value: 'core',    label: 'Core & stretching' },
    { value: 'walking',  label: 'Walking' },{ value: 'weights', label: 'Weightlifting' }, { value: 'other', label: 'Other' }
  ]},
  exercise_intensity: { label: 'Exercise intensity', type: 'single', options: [
    { value: 'very_low', label: 'Very Low' }, { value: 'low', label: 'Low' },
    { value: 'moderate', label: 'Moderate' }, { value: 'above_avg', label: 'Above Average' }, { value: 'high', label: 'High' }
  ]},
  exercise_goal: { label: 'Exercise goal', type: 'single', options: [
    { value: 'performance', label: 'Performance' }, { value: 'sweat',    label: 'Breaking a sweat' },
    { value: 'toning',      label: 'Muscle Toning' },{ value: 'building', label: 'Muscle Building' }
  ]},
  muscle_cramps:   { label: 'Muscle cramps',        type: 'single', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]},
  sunshine:        { label: 'Daily sunshine',        type: 'single', options: [
    { value: 'rarely', label: 'Rarely' }, { value: 'weekends', label: 'Weekends/holidays' }, { value: 'daily', label: 'Every day' }
  ]},
  alcohol:         { label: 'Alcohol (8+/wk)',       type: 'single', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]},
  smoking:         { label: 'Smoking/vaping',        type: 'single', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]},
  urinary:         { label: 'Urinary health support',type: 'single', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]},
  screen_fatigue:  { label: 'Screen fatigue',        type: 'single', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]},
  iron_recommended:{ label: 'Iron recommended',      type: 'single', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]},
  eastern_medicine:{ label: 'Eastern medicine view', type: 'single', options: [
    { value: 'believe', label: 'Believe in alternative medicines' },
    { value: 'unsure',  label: 'Unsure, want more info' },
    { value: 'skeptic', label: 'Skeptical' }
  ]},
  medical_docs: { label: 'Medical docs (filename)', type: 'text', placeholder: 'filename.pdf' }
};

function buildAdminAnswerRows(r) {
  return `<div style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--clr-border)">
    <p style="font-size:.75rem;font-weight:600;color:var(--clr-muted);text-transform:uppercase;
      letter-spacing:.06em;margin-bottom:.5rem">Answers</p>
    <div id="adminAnswerRows">${buildAdminAnswerRowsInner(r)}</div>
  </div>`;
}

function buildAdminAnswerRowsInner(r) {
  const answers  = r.answers || {};
  const coreKeys = ['firstName', 'email', 'age'];
  const answerKeys = Object.keys(answers)
    .filter(k => answers[k] && !['email', 'firstName', 'name', 'age'].includes(k));
  return [...coreKeys, ...answerKeys].map(k => {
    const cfg    = adminFieldConfig[k];
    const rawVal = k === 'firstName' ? (answers.firstName || answers.name || '') : (answers[k] || '');
    const label  = cfg ? cfg.label : k.replace(/_/g, ' ');
    return `<div class="detail-row" id="adminRow_${k}">
      <span class="detail-key">${label}</span>
      <span class="detail-val" style="flex:1">${rawVal || '—'}</span>
      <button class="btn btn--ghost btn--sm" onclick="adminEditField('${k}')">Edit</button>
    </div>`;
  }).join('');
}

function adminEditField(key) {
  const cfg     = adminFieldConfig[key];
  const answers = window._currentDrawerRecord.answers || {};
  const rawVal  = key === 'firstName' ? (answers.firstName || answers.name || '') : (answers[key] || '');
  const type    = cfg ? cfg.type : 'text';
  const label   = cfg ? cfg.label : key.replace(/_/g, ' ');

  let inputHtml = '';
  if (!cfg || type === 'text' || type === 'email') {
    inputHtml = `<input id="adminEditInput_${key}" class="q-input" type="${type}"
      placeholder="${cfg ? (cfg.placeholder || '') : ''}" value="${rawVal.replace(/"/g, '&quot;')}"
      style="max-width:300px" />`;
  } else if (type === 'number') {
    inputHtml = `<input id="adminEditInput_${key}" class="q-input" type="number"
      placeholder="${cfg.placeholder || ''}" value="${rawVal}"
      min="${cfg.min || 0}" max="${cfg.max || 120}" style="max-width:140px" />`;
  } else if (type === 'single') {
    const opts = cfg.options.map(o =>
      `<option value="${o.value}"${rawVal === o.value ? ' selected' : ''}>${o.label}</option>`
    ).join('');
    inputHtml = `<select id="adminEditInput_${key}" class="q-input" style="max-width:300px">${opts}</select>`;
  } else if (type === 'multi') {
    const current = typeof rawVal === 'string' && rawVal ? rawVal.split('; ') : [];
    const checks  = cfg.options.map(o =>
      `<label style="display:flex;align-items:center;gap:.4rem;font-size:.9rem;cursor:pointer">
        <input type="checkbox" name="adminEdit_${key}" value="${o.value}"${current.includes(o.value) ? ' checked' : ''}>
        ${o.label}
      </label>`
    ).join('');
    inputHtml = `<div style="display:flex;flex-wrap:wrap;gap:.35rem .75rem">${checks}</div>`;
  }

  document.getElementById('adminRow_' + key).innerHTML = `
    <span class="detail-key">${label}</span>
    <div style="display:flex;flex-direction:column;gap:.5rem;flex:1">
      ${inputHtml}
      <div style="display:flex;gap:.5rem;margin-top:.25rem">
        <button class="btn btn--primary btn--sm" onclick="adminSaveField('${key}')">Save</button>
        <button class="btn btn--ghost btn--sm" onclick="document.getElementById('adminAnswerRows').innerHTML=buildAdminAnswerRowsInner(window._currentDrawerRecord)">Cancel</button>
      </div>
      <p id="adminEditErr_${key}" style="color:#ef4444;font-size:.85rem;display:none"></p>
    </div>`;
}

async function adminSaveField(key) {
  const cfg = adminFieldConfig[key];
  const type = cfg ? cfg.type : 'text';
  let value;

  if (!cfg || type === 'text' || type === 'email' || type === 'number') {
    value = document.getElementById('adminEditInput_' + key).value.trim();
    if (!value) return;
  } else if (type === 'single') {
    value = document.getElementById('adminEditInput_' + key).value;
  } else if (type === 'multi') {
    const checked = Array.from(document.querySelectorAll(`input[name="adminEdit_${key}"]:checked`));
    if (!checked.length) return;
    value = checked.map(cb => cb.value).join('; ');
  }

  const r = window._currentDrawerRecord;
  const updatedAnswers = { ...(r.answers || {}), [key]: value };
  if (key === 'firstName') { updatedAnswers.firstName = value; updatedAnswers.name = value; }

  const topLevel = { answers: updatedAnswers };
  if (key === 'email')     topLevel.email      = value;
  if (key === 'age')       topLevel.age        = value;
  if (key === 'firstName') topLevel.first_name = value;

  const saveBtn = document.querySelector(`#adminRow_${key} .btn--primary`);
  if (saveBtn) { saveBtn.textContent = 'Saving…'; saveBtn.disabled = true; }

  const { error } = await db.from('responses').update(topLevel).eq('id', r.id);

  if (error) {
    const errEl = document.getElementById('adminEditErr_' + key);
    if (errEl) { errEl.textContent = 'Save failed — ' + error.message; errEl.style.display = ''; }
    if (saveBtn) { saveBtn.textContent = 'Save'; saveBtn.disabled = false; }
    return;
  }

  r.answers = updatedAnswers;
  if (key === 'email')     r.email      = value;
  if (key === 'age')       r.age        = value;
  if (key === 'firstName') r.first_name = value;

  document.getElementById('adminAnswerRows').innerHTML = buildAdminAnswerRowsInner(r);
}

// ── Delete user ────────────────────────────────────────────
async function deleteResponse(id, label) {
  if (!confirm(`Permanently delete ${label}? This cannot be undone.`)) return;
  const { error } = await db.from('responses').delete().eq('id', id);
  if (error) { alert('Delete failed — ' + error.message); return; }
  closeDetail();
  renderTable();
}

// ── Excel download ─────────────────────────────────────────
async function downloadExcel() {
  const responses = await loadResponses();
  if (responses.length === 0) { alert('No responses to download.'); return; }

  const exportData = responses.map(r => {
    const flat = { ...r.answers, email: r.email, age: r.age, submitted_at: r.submitted_at };
    delete flat.medical_doc_data;
    if (r.medical_doc_name) flat.medical_doc_name = r.medical_doc_name;
    return flat;
  });

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Responses');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob  = new Blob([wbout], { type: 'application/octet-stream' });
  const url   = URL.createObjectURL(blob);
  const a     = document.createElement('a');
  a.href      = url;
  a.download  = `supplai_responses_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Init ───────────────────────────────────────────────────
db.auth.getSession().then(({ data: { session } }) => {
  if (session) showAdmin();
});
