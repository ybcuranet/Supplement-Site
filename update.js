let currentEmail   = null;
let pendingDocFile = null;
let currentRecord  = null;

// ── Lookup ─────────────────────────────────────────────────
async function lookup() {
  const email = document.getElementById('lookupEmail').value.trim().toLowerCase();
  if (!email) return;

  const { data, error } = await db
    .from('responses')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !data) {
    document.getElementById('lookupError').style.display = '';
    document.getElementById('lookupEmail').classList.add('input--error');
    return;
  }

  currentEmail  = email;
  currentRecord = data;

  document.getElementById('lookupError').style.display = 'none';
  document.getElementById('lookupView').style.display  = 'none';
  document.getElementById('profileView').style.display = '';

  document.getElementById('profileName').textContent =
    data.first_name || data.name || 'there';

  renderCurrentDoc(data);
  renderAnswerSummary(data);
}

// ── Medical doc display ────────────────────────────────────
function renderCurrentDoc(record) {
  const el = document.getElementById('currentDoc');
  if (record.medical_doc_name && record.medical_doc_data) {
    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:.75rem;padding:.75rem 1rem;
        background:var(--clr-brand-pale);border-radius:var(--radius-sm);margin-top:.5rem">
        <span>📄</span>
        <span style="font-size:.9rem;font-weight:500;flex:1">${record.medical_doc_name}</span>
        <a href="${record.medical_doc_data}" download="${record.medical_doc_name}"
          class="btn btn--ghost btn--sm">Download</a>
      </div>`;
  } else {
    el.innerHTML = `<p style="font-size:.9rem;color:var(--clr-muted);margin-top:.5rem">No document on file.</p>`;
  }
}

// ── Field config ───────────────────────────────────────────
const fieldConfig = {
  firstName: { label: 'Name',          type: 'text',   placeholder: 'Your name' },
  email:     { label: 'Email',         type: 'email',  placeholder: 'jane@example.com' },
  age:       { label: 'Age',           type: 'number', placeholder: 'Your age', min: 16, max: 100 },
  sex: {
    label: 'Sex', type: 'single',
    options: [
      { value: 'female',     label: 'Female' },
      { value: 'male',       label: 'Male' },
      { value: 'prefer_not', label: 'Prefer not to say' }
    ]
  },
  goals: {
    label: 'Goals', type: 'multi',
    options: [
      { value: 'fitness',   label: 'Fitness' },   { value: 'heart',    label: 'Heart' },
      { value: 'bones',     label: 'Bones' },     { value: 'brain',    label: 'Brain' },
      { value: 'digestion', label: 'Digestion' }, { value: 'immunity', label: 'Immunity' },
      { value: 'stress',    label: 'Stress' },    { value: 'sleep',    label: 'Sleep' },
      { value: 'joints',    label: 'Joints' },    { value: 'energy',   label: 'Energy' },
      { value: 'skin',      label: 'Skin' },      { value: 'hair',     label: 'Hair' }
    ]
  },
  diet: {
    label: 'Diet', type: 'single',
    options: [
      { value: 'omnivore',    label: 'I eat almost everything!' },
      { value: 'plant_based', label: 'Prefer plant-based foods' },
      { value: 'vegetarian',  label: 'Vegetarian' },
      { value: 'vegan',       label: 'Vegan' },
      { value: 'other',       label: 'Other' }
    ]
  },
  allergies: {
    label: 'Allergies', type: 'multi',
    options: [
      { value: 'none',      label: 'None' },       { value: 'fish',      label: 'Fish' },
      { value: 'gluten',    label: 'Wheat/Gluten' },{ value: 'milk',     label: 'Milk' },
      { value: 'soy',       label: 'Soy' },        { value: 'sulphites', label: 'Sulphites' },
      { value: 'yeast',     label: 'Yeast' },      { value: 'corn',      label: 'Corn/Maize' },
      { value: 'tree_nuts', label: 'Tree nuts' },  { value: 'peanuts',   label: 'Peanuts' },
      { value: 'egg',       label: 'Egg' },        { value: 'sesame',    label: 'Sesame' }
    ]
  },
  exercise_days: {
    label: 'Exercise days', type: 'single',
    options: [
      { value: 'none', label: "I don't exercise" },
      { value: '1',    label: '1' },
      { value: '2-3',  label: '2–3' },
      { value: '4+',   label: '4 or more' }
    ]
  },
  stress_level: {
    label: 'Stress level', type: 'single',
    options: [
      { value: 'very_low',  label: 'Very Low' },  { value: 'low',       label: 'Low' },
      { value: 'moderate',  label: 'Moderate' },  { value: 'above_avg', label: 'Above Average' },
      { value: 'high',      label: 'High' }
    ]
  },
  energy_level: {
    label: 'Energy level', type: 'single',
    options: [
      { value: 'very_low',  label: 'Very Low' },  { value: 'low',       label: 'Low' },
      { value: 'moderate',  label: 'Moderate' },  { value: 'above_avg', label: 'Above Average' },
      { value: 'high',      label: 'High' }
    ]
  }
};

const displayKeys = [
  'firstName','email','age','sex','goals','diet',
  'allergies','exercise_days','stress_level','energy_level'
];

// ── Answer summary ─────────────────────────────────────────
function renderAnswerSummary(record) {
  const answers = record.answers || {};

  const rows = displayKeys.map(k => {
    const cfg    = fieldConfig[k];
    const rawVal = k === 'firstName'
      ? (answers.firstName || answers.name || '')
      : (answers[k] || '');
    return `<div class="detail-row" id="row_${k}">
      <span class="detail-key">${cfg.label}</span>
      <span class="detail-val" style="flex:1">${rawVal || '—'}</span>
      <button class="btn btn--ghost btn--sm" onclick="editField('${k}')">Edit</button>
    </div>`;
  }).join('');

  document.getElementById('answerSummary').innerHTML =
    rows || '<p style="color:var(--clr-muted);font-size:.9rem">No answers recorded.</p>';
}

// ── Edit field inline ──────────────────────────────────────
function editField(key) {
  const cfg    = fieldConfig[key];
  const answers = currentRecord.answers || {};
  const rawVal  = key === 'firstName'
    ? (answers.firstName || answers.name || '')
    : (answers[key] || '');

  let inputHtml = '';
  if (cfg.type === 'text' || cfg.type === 'email') {
    inputHtml = `<input id="editInput_${key}" class="q-input" type="${cfg.type}"
      placeholder="${cfg.placeholder || ''}" value="${rawVal.replace(/"/g, '&quot;')}"
      style="max-width:300px" />`;
  } else if (cfg.type === 'number') {
    inputHtml = `<input id="editInput_${key}" class="q-input" type="number"
      placeholder="${cfg.placeholder || ''}" value="${rawVal}"
      min="${cfg.min || 0}" max="${cfg.max || 120}" style="max-width:140px" />`;
  } else if (cfg.type === 'single') {
    const opts = cfg.options.map(o =>
      `<option value="${o.value}"${rawVal === o.value ? ' selected' : ''}>${o.label}</option>`
    ).join('');
    inputHtml = `<select id="editInput_${key}" class="q-input" style="max-width:300px">${opts}</select>`;
  } else if (cfg.type === 'multi') {
    const current = typeof rawVal === 'string' && rawVal ? rawVal.split('; ') : [];
    const checks  = cfg.options.map(o =>
      `<label style="display:flex;align-items:center;gap:.4rem;font-size:.9rem;cursor:pointer">
        <input type="checkbox" name="edit_${key}" value="${o.value}"${current.includes(o.value) ? ' checked' : ''}>
        ${o.label}
      </label>`
    ).join('');
    inputHtml = `<div style="display:flex;flex-wrap:wrap;gap:.35rem .75rem">${checks}</div>`;
  }

  document.getElementById('row_' + key).innerHTML = `
    <span class="detail-key">${cfg.label}</span>
    <div style="display:flex;flex-direction:column;gap:.5rem;flex:1">
      ${inputHtml}
      <div style="display:flex;gap:.5rem;margin-top:.25rem">
        <button class="btn btn--primary btn--sm" onclick="saveField('${key}')">Save</button>
        <button class="btn btn--ghost btn--sm" onclick="renderAnswerSummary(currentRecord)">Cancel</button>
      </div>
      <p id="editErr_${key}" style="color:#ef4444;font-size:.85rem;display:none"></p>
    </div>`;
}

// ── Save individual field ──────────────────────────────────
async function saveField(key) {
  const cfg = fieldConfig[key];
  let value;

  if (cfg.type === 'text' || cfg.type === 'email' || cfg.type === 'number') {
    value = document.getElementById('editInput_' + key).value.trim();
    if (!value) return;
  } else if (cfg.type === 'single') {
    value = document.getElementById('editInput_' + key).value;
  } else if (cfg.type === 'multi') {
    const checked = Array.from(document.querySelectorAll(`input[name="edit_${key}"]:checked`));
    if (!checked.length) return;
    value = checked.map(cb => cb.value).join('; ');
  }

  const updatedAnswers = { ...(currentRecord.answers || {}), [key]: value };
  if (key === 'firstName') { updatedAnswers.firstName = value; updatedAnswers.name = value; }

  const topLevel = { answers: updatedAnswers };
  if (key === 'email')     topLevel.email      = value;
  if (key === 'age')       topLevel.age        = value;
  if (key === 'firstName') topLevel.first_name = value;

  const saveBtn = document.querySelector(`#row_${key} .btn--primary`);
  if (saveBtn) { saveBtn.textContent = 'Saving…'; saveBtn.disabled = true; }

  const { error } = await db
    .from('responses')
    .update(topLevel)
    .eq('email', currentEmail);

  if (error) {
    const errEl = document.getElementById('editErr_' + key);
    if (errEl) { errEl.textContent = 'Save failed — try again.'; errEl.style.display = ''; }
    if (saveBtn) { saveBtn.textContent = 'Save'; saveBtn.disabled = false; }
    return;
  }

  currentRecord.answers = updatedAnswers;
  if (key === 'email')     { currentRecord.email      = value; currentEmail = value; }
  if (key === 'age')         currentRecord.age        = value;
  if (key === 'firstName') {
    currentRecord.first_name = value;
    document.getElementById('profileName').textContent = value || 'there';
  }

  renderAnswerSummary(currentRecord);
}

// ── File upload ────────────────────────────────────────────
function handleDocUpload(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];

  if (file.size > 2 * 1024 * 1024) {
    alert('File must be under 2 MB.');
    input.value = '';
    return;
  }

  pendingDocFile = file;
  const nameEl = document.getElementById('newDocName');
  nameEl.textContent = `New file selected: ${file.name}`;
  nameEl.style.display = '';
  document.querySelector('.upload-zone').classList.add('upload-zone--selected');
}

// ── Save document ──────────────────────────────────────────
async function saveUpdate() {
  const saveMsg = document.getElementById('saveMsg');
  saveMsg.style.display = '';

  if (!pendingDocFile) {
    saveMsg.style.color = 'var(--clr-muted)';
    saveMsg.textContent = 'No document selected.';
    return;
  }

  const saveBtn = document.getElementById('saveBtn');
  saveBtn.textContent = 'Saving…';
  saveBtn.disabled = true;

  const reader = new FileReader();
  reader.onload = async () => {
    const { error } = await db
      .from('responses')
      .update({
        medical_doc_name: pendingDocFile.name,
        medical_doc_data: reader.result
      })
      .eq('email', currentEmail);

    if (error) {
      saveMsg.style.color = '#ef4444';
      saveMsg.textContent = 'Save failed — please try again.';
    } else {
      renderCurrentDoc({ medical_doc_name: pendingDocFile.name, medical_doc_data: reader.result });
      pendingDocFile = null;
      document.getElementById('newDocName').style.display = 'none';
      document.querySelector('.upload-zone').classList.remove('upload-zone--selected');
      saveMsg.style.color = 'var(--clr-brand)';
      saveMsg.textContent = 'Document saved.';
    }

    saveBtn.textContent = 'Save document';
    saveBtn.disabled = false;
  };
  reader.readAsDataURL(pendingDocFile);
}

// ── Cancel ─────────────────────────────────────────────────
function cancelUpdate() {
  currentEmail   = null;
  currentRecord  = null;
  pendingDocFile = null;
  document.getElementById('profileView').style.display  = 'none';
  document.getElementById('lookupView').style.display   = '';
  document.getElementById('lookupEmail').value = '';
  document.getElementById('lookupEmail').classList.remove('input--error');
}
