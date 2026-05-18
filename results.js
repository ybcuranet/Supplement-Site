// Load answers from quiz
const raw     = sessionStorage.getItem('quizAnswers');
const answers = raw ? JSON.parse(raw) : {};

// Personalise greeting
const nameEl = document.getElementById('userFirstName');
if (nameEl && answers.firstName) nameEl.textContent = answers.firstName;

// Profile chips
const profileSummary = document.getElementById('profileSummary');
// TODO: populate chips from answers once quiz questions are filled in

// ── AI Recommendation Engine ───────────────────────────────
// This function will call your backend / Claude API endpoint.
// Replace the URL and payload shape once the backend is built.
async function fetchRecommendations(userAnswers) {
  try {
    const res = await fetch('/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userAnswers)
    });
    return await res.json(); // { narrative: string, supplements: Supplement[], notNeeded: string[] }
  } catch {
    // Fallback: return mock data during development
    return getMockRecommendations();
  }
}

function getMockRecommendations() {
  return {
    narrative: 'Based on your profile, you may benefit from supporting your energy levels and immune system. Your dietary choices suggest a few targeted gaps worth addressing.',
    supplements: [
      { icon: '☀️', tag: 'Energy', name: 'Vitamin D3', why: 'Most people in Australia are still deficient, especially indoors workers.', dose: '2000 IU daily' },
      { icon: '🧠', tag: 'Focus', name: 'Omega-3 (EPA/DHA)', why: 'Supports brain health and reduces inflammation.', dose: '1g daily with food' },
      { icon: '⚡', tag: 'Energy', name: 'Magnesium Glycinate', why: 'Involved in 300+ enzymatic reactions; most adults fall short.', dose: '300mg before bed' }
    ],
    notNeeded: ['Iron', 'Calcium', 'Zinc']
  };
}

// ── Render ─────────────────────────────────────────────────
async function render() {
  const data = await fetchRecommendations(answers);

  // AI narrative
  const narrativeEl = document.getElementById('aiNarrative');
  if (narrativeEl) narrativeEl.textContent = data.narrative;

  // Supplement count
  const recCountEl = document.getElementById('recCount');
  if (recCountEl) recCountEl.textContent = data.supplements.length;

  // Supplement cards
  const grid = document.getElementById('recGrid');
  if (grid) {
    grid.innerHTML = data.supplements.map(s => `
      <article class="rec-card">
        <div class="rec-card__icon">${s.icon}</div>
        <div class="rec-card__body">
          <span class="rec-card__tag">Goal: ${s.tag}</span>
          <h3 class="rec-card__name">${s.name}</h3>
          <p class="rec-card__why">${s.why}</p>
          <span class="rec-card__dose">Suggested: ${s.dose}</span>
        </div>
        <button class="btn btn--outline btn--sm" style="margin-top:auto">Add to plan</button>
      </article>
    `).join('');
  }

  // Not needed chips
  const notNeeded = document.getElementById('notNeededList');
  if (notNeeded && data.notNeeded) {
    notNeeded.innerHTML = data.notNeeded.map(n => `<span class="chip">${n}</span>`).join('');
  }
}

render();
