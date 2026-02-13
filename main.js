import './style.css';

// ==========================================
// CONSTANTS & DATA
// ==========================================
let syllablesData = {};
let cucMeanings = {};
let cucScores = {};
let cucDetails = {};
let dataLoaded = false;

// Map for removing diacritics (lookup normalization)
// Maps Đ -> D
const DIACRITIC_MAP = {
    'À': 'A', 'Á': 'A', 'Ả': 'A', 'Ã': 'A', 'Ạ': 'A',
    'Ă': 'A', 'Ằ': 'A', 'Ắ': 'A', 'Ẳ': 'A', 'Ẵ': 'A', 'Ặ': 'A',
    'Â': 'A', 'Ầ': 'A', 'Ấ': 'A', 'Ẩ': 'A', 'Ẫ': 'A', 'Ậ': 'A',
    'Đ': 'D',
    'È': 'E', 'É': 'E', 'Ẻ': 'E', 'Ẽ': 'E', 'Ẹ': 'E',
    'Ê': 'E', 'Ề': 'E', 'Ế': 'E', 'Ể': 'E', 'Ễ': 'E', 'Ệ': 'E',
    'Ì': 'I', 'Í': 'I', 'Ỉ': 'I', 'Ĩ': 'I', 'Ị': 'I',
    'Ò': 'O', 'Ó': 'O', 'Ỏ': 'O', 'Õ': 'O', 'Ọ': 'O',
    'Ô': 'O', 'Ồ': 'O', 'Ố': 'O', 'Ổ': 'O', 'Ỗ': 'O', 'Ộ': 'O',
    'Ơ': 'O', 'Ờ': 'O', 'Ớ': 'O', 'Ở': 'O', 'Ỡ': 'O', 'Ợ': 'O',
    'Ù': 'U', 'Ú': 'U', 'Ủ': 'U', 'Ũ': 'U', 'Ụ': 'U',
    'Ư': 'U', 'Ừ': 'U', 'Ứ': 'U', 'Ử': 'U', 'Ữ': 'U', 'Ự': 'U',
    'Ỳ': 'Y', 'Ý': 'Y', 'Ỷ': 'Y', 'Ỹ': 'Y', 'Ỵ': 'Y'
};

// Letter Stroke Table (Cao Từ Linh System)
const LETTER_STROKES = {
    'A': 1, 'B': 2, 'C': 3, 'D': 4,
    'Đ': 5, // Important distinction
    'E': 6, 'G': 7, 'H': 8, 'I': 9,
    'K': 10, 'L': 11, 'M': 12, 'N': 13,
    'O': 14, 'P': 15, 'Q': 16, 'R': 17,
    'S': 18, 'T': 19, 'U': 20, 'V': 21,
    'X': 22, 'Y': 23,
    'F': 24, 'J': 25, 'W': 26, 'Z': 27
};

// Element UI Helpers
const ELEMENT_ICONS = { 'Kim': '⚔️', 'Mộc': '🌿', 'Thủy': '💧', 'Hỏa': '🔥', 'Thổ': '🏔️' };
const ELEMENT_CSS_MAP = { 'Kim': 'kim', 'Mộc': 'moc', 'Thủy': 'thuy', 'Hỏa': 'hoa', 'Thổ': 'tho' };

// ==========================================
// HELPERS
// ==========================================

function normalizeForLookup(str) {
    return str.toUpperCase().split('').map(c => DIACRITIC_MAP[c] || c).join('').replace(/[^A-Z]/g, '');
}

function normalizeForCalc(str) {
    let s = str.replace(/Đ/g, '§').replace(/đ/g, '§');
    s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, "");
    s = s.replace(/§/g, 'Đ');
    return s.toUpperCase();
}

function getLetterStroke(char) {
    const norm = normalizeForCalc(char);
    return LETTER_STROKES[norm] || 0;
}

function getFirstCharStroke(syllable) {
    const norm = normalizeForCalc(syllable);
    if (!norm) return 0;
    return getLetterStroke(norm.charAt(0));
}

function getLastCharStroke(syllable) {
    const norm = normalizeForCalc(syllable);
    if (!norm) return 0;
    return getLetterStroke(norm.charAt(norm.length - 1));
}

// ==========================================
// DATA LOADING
// ==========================================
async function loadData() {
    try {
        const [syllRes, cucMRes, cucSRes, cucDRes] = await Promise.all([
            fetch('/data/syllables.json'),
            fetch('/data/cuc_meanings.json'),
            fetch('/data/cuc_scores.json'),
            fetch('/data/cuc_details.json')
        ]);

        syllablesData = await syllRes.json();
        cucMeanings = await cucMRes.json();
        cucScores = await cucSRes.json();
        cucDetails = await cucDRes.json();
        dataLoaded = true;
        console.log(`✅ Data loaded: ${Object.keys(syllablesData).length} syllables`);
    } catch (err) {
        console.error('Failed to load data:', err);
        alert('Lỗi tải dữ liệu. Vui lòng thử lại.');
    }
}

// ==========================================
// LOGIC
// ==========================================

function lookupSyllable(rawSyllable) {
    const key = normalizeForLookup(rawSyllable);
    if (!key) return null;

    if (syllablesData[key]) {
        return { ...syllablesData[key], original: rawSyllable.trim() };
    }
    const upperOriginal = rawSyllable.trim().toUpperCase();
    if (syllablesData[upperOriginal]) {
        return { ...syllablesData[upperOriginal], original: rawSyllable.trim() };
    }
    return null;
}

function calculateCuc(val) {
    let cuc = val;
    while (cuc > 81) {
        cuc -= 80;
    }
    if (cuc <= 0) cuc = 1;
    return cuc;
}

function analyzeFullName(ho, dem, ten, gender) {
    const parts = [];

    const processPart = (text, type) => {
        const tokens = text.trim().split(/\s+/).filter(Boolean);
        tokens.forEach(t => {
            const lookup = lookupSyllable(t);
            if (lookup) {
                parts.push({ ...lookup, type });
            } else {
                parts.push({ original: t, name: t, strokes: 0, element: '', type, notFound: true });
            }
        });
    };

    processPart(ho, 'Họ');
    processPart(dem, 'Đệm');
    processPart(ten, 'Tên');

    const pHo = parts.filter(p => p.type === 'Họ');
    const pDem = parts.filter(p => p.type === 'Đệm');
    const pTen = parts.filter(p => p.type === 'Tên');

    // Helper Total Strokes (use JSON values for full syllables)
    const totalHo = pHo.reduce((sum, p) => sum + (p.strokes || 0), 0);
    const totalDem = pDem.reduce((sum, p) => sum + (p.strokes || 0), 0);
    const totalTen = pTen.reduce((sum, p) => sum + (p.strokes || 0), 0);
    const totalStrokes = totalHo + totalDem + totalTen;

    // Helper Letter Strokes
    const lastHo = pHo.reduce((sum, p) => sum + getLastCharStroke(p.original || p.name), 0);
    const lastDem = pDem.reduce((sum, p) => sum + getLastCharStroke(p.original || p.name), 0);
    const lastTen = pTen.reduce((sum, p) => sum + getLastCharStroke(p.original || p.name), 0);

    const firstHo = pHo.reduce((sum, p) => sum + getFirstCharStroke(p.original || p.name), 0);
    const firstDem = pDem.reduce((sum, p) => sum + getFirstCharStroke(p.original || p.name), 0);

    const tinhCuc = calculateCuc(totalStrokes);

    const dongVal = lastHo + lastDem + totalTen; // +1 logic removed as verified
    const dongCuc = calculateCuc(dongVal);

    const tienVal = lastTen + lastDem + totalHo;
    const tienVan = calculateCuc(tienVal);

    const hauVal = lastDem + totalTen + totalHo;
    const hauVan = calculateCuc(hauVal);

    const phucVal = lastHo + lastTen + totalDem;
    const phucDuc = calculateCuc(phucVal);

    const genderMod = (gender === 'male') ? 1 : -1;
    const tuVal = firstHo + firstDem + totalTen + genderMod;
    const tuTuc = calculateCuc(tuVal);

    // Score Calculation
    const score = (
        (cucScores[tinhCuc]?.score || 0) +
        (cucScores[dongCuc]?.score || 0) +
        (cucScores[tienVan]?.score || 0) +
        (cucScores[hauVan]?.score || 0) +
        (cucScores[phucDuc]?.score || 0) +
        (cucScores[tuTuc]?.score || 0)
    );

    return {
        parts,
        elementParts: parts,
        fullName: [ho, dem, ten].filter(Boolean).join(' ').toUpperCase(),
        tinhCuc, dongCuc, tienVan, hauVan, phucDuc, tuTuc,
        totalScore: score
    };
}

function getGrading(score) {
    // Grading scale from Excel analysis
    if (score > 49) return { text: 'Xuất Sắc (10/10)', class: 'xuat-sac' };
    if (score > 39) return { text: 'Tốt (8/10)', class: 'tot' };
    if (score > 29) return { text: 'Khá (6/10)', class: 'kha' };
    return { text: 'Trung Bình (5/10)', class: 'tb' };
}

function generateAdvice(analysis) {
    let advice = [];

    // Total Score Verdict
    const grade = getGrading(analysis.totalScore);
    advice.push(`<p class="advice-item"><strong>Tổng Điểm:</strong> ${analysis.totalScore}/60 - Đánh giá: <span class="${grade.class}">${grade.text}</span>.</p>`);

    // Missing Elements
    const foundElements = new Set(analysis.elementParts.map(p => p.element ? p.element.split(' ')[0] : '').filter(Boolean));
    const allElements = ['Kim', 'Mộc', 'Thủy', 'Hỏa', 'Thổ'];
    const missing = allElements.filter(e => !foundElements.has(e));
    if (missing.length > 0) {
        advice.push(`<p class="advice-item advice-warning"><strong>Ngũ Hành Thiếu Khuyết:</strong> Bạn đang thiếu hành <strong>${missing.join(', ')}</strong>. Nên cân nhắc bổ sung bằng màu sắc, hướng nhà hoặc vật phẩm phong thủy liên quan.</p>`);
    } else {
        advice.push(`<p class="advice-item"><strong>Ngũ Hành:</strong> Tên đầy đủ các hành, giúp cân bằng bản mệnh tốt.</p>`);
    }

    // Hung Cuc Warnings
    const checkCuc = (name, val) => {
        const score = cucScores[val]?.score || 0;
        const meaning = cucMeanings[val]?.luck || '';
        if (score <= 3 || meaning.toLowerCase().includes('hung')) {
            advice.push(`<p class="advice-item advice-warning"><strong>${name} (Cục ${val}):</strong> ${meaning}. Cần lưu ý tu nhân tích đức để cải thiện vận số.</p>`);
        }
    };

    checkCuc("Tĩnh Cục (Bản Mệnh)", analysis.tinhCuc);
    checkCuc("Tiền Vận", analysis.tienVan);
    checkCuc("Hậu Vận", analysis.hauVan);
    checkCuc("Phúc Đức", analysis.phucDuc);

    // Encouragement
    if (analysis.totalScore >= 40) {
        advice.push(`<p class="advice-item"><strong>Kết Luận:</strong> Đây là một cái tên rất đẹp, mang lại nhiều may mắn và thuận lợi.</p>`);
    }

    return advice.join('');
}

// ==========================================
// UI RENDERING
// ==========================================

function getLuckText(luck) {
    if (!luck) return '---';
    const l = luck.toLowerCase();
    if (l.includes('đại cát')) return 'ĐẠI CÁT';
    if (l.includes('cát') && !l.includes('hung')) return 'CÁT';
    if (l.includes('hung') && !l.includes('cát')) return 'HUNG';
    return 'BÌNH';
}

function getLuckClass(luck) {
    if (!luck) return 'mixed';
    const l = luck.toLowerCase();
    if (l.includes('cát') && !l.includes('hung')) return 'cat';
    if (l.includes('hung') && !l.includes('cát')) return 'hung';
    return 'mixed';
}

function renderCucCard(idPrefix, cucVal) {
    const meaning = cucMeanings[cucVal] || {};
    const score = cucScores[cucVal] || { score: 0 };
    const details = cucDetails[cucVal] || {};
    const luckText = getLuckText(meaning.luck);
    const luckClass = getLuckClass(meaning.luck);

    document.getElementById(`${idPrefix}Number`).textContent = cucVal;
    document.getElementById(`${idPrefix}Score`).className = `score-circle ${luckClass}`;
    document.querySelector(`#${idPrefix}Score .score-label`).textContent = luckText;
    document.getElementById(`${idPrefix}Name`).textContent = meaning.name || `Cục ${cucVal}`;
    document.getElementById(`${idPrefix}Alias`).textContent = meaning.alias || '';
    document.getElementById(`${idPrefix}Meaning`).textContent = details.description || meaning.meaning || '';
}

let currentAnalysis = {};

function renderInterpretation(type) {
    const cucVal = currentAnalysis[type];
    const details = cucDetails[cucVal] || {};
    const container = document.getElementById('interpretationContent');

    if (!details.cuc_name) {
        container.innerHTML = `<p>Chưa có dữ liệu cho Cục ${cucVal}</p>`;
        return;
    }
    container.innerHTML = `
    <h4 style="color:var(--primary-gold); margin-bottom:1rem;">${details.cuc_name} - ${details.alias}</h4>
    <p><strong>Tổng Quan:</strong> ${details.description}</p>
    <div style="margin-top:1rem; display:grid; gap:0.8rem;">
      <p><strong>🏢 Công Danh:</strong> ${details.career || details.meaning}</p>
      <p><strong>🏠 Gia Đạo:</strong> ${details.family || details.phuc_duc}</p>
      <p><strong>🏥 Sức Khỏe:</strong> ${details.health || 'Bình thường'}</p>
    </div>
  `;
}

async function initApp() {
    await loadData();

    ['ho', 'dem', 'ten'].forEach(id => {
        document.getElementById(id + 'Input').addEventListener('input', (e) => {
            const val = e.target.value.trim();
            const hintDiv = document.getElementById(id + 'Hint');
            if (!val) { hintDiv.textContent = ''; return; }

            const lastWord = val.split(/\s+/).pop();
            const lookup = lookupSyllable(lastWord);
            if (lookup) {
                const icon = ELEMENT_ICONS[lookup.element.split(' ')[0]] || '';
                hintDiv.innerHTML = `${icon} ${lookup.element} | ${lookup.strokes} nét`;
                hintDiv.style.color = 'var(--text-dim)';
            } else {
                hintDiv.textContent = '❓ Không tìm thấy';
                hintDiv.style.color = 'var(--hung-color)';
            }
        });
    });

    document.getElementById('analyzeBtn').addEventListener('click', () => {
        if (!dataLoaded) return;
        const ho = document.getElementById('hoInput').value;
        const dem = document.getElementById('demInput').value;
        const ten = document.getElementById('tenInput').value;
        const gender = document.querySelector('input[name="gender"]:checked').value;

        if (!ho || !ten) { alert('Vui lòng nhập Họ Tên!'); return; }

        const analysis = analyzeFullName(ho, dem, ten, gender);
        currentAnalysis = analysis;

        document.getElementById('resultsSection').classList.remove('hidden');
        document.getElementById('fullNameText').textContent = analysis.fullName;

        // Total Score
        document.getElementById('totalScoreNumber').textContent = analysis.totalScore;
        const grade = getGrading(analysis.totalScore);
        const verdictEl = document.getElementById('totalScoreVerdict');
        verdictEl.textContent = grade.text;
        verdictEl.className = 'total-score-verdict ' + grade.class;

        // Advice
        document.getElementById('adviceSection').classList.remove('hidden');
        document.getElementById('adviceContent').innerHTML = generateAdvice(analysis);

        const grid = document.getElementById('syllableGrid');
        grid.innerHTML = analysis.parts.map((p, i) => {
            const mainElem = p.element ? p.element.split(' ')[0] : '';
            const elemClass = ELEMENT_CSS_MAP[mainElem] || 'kim';
            const icon = ELEMENT_ICONS[mainElem] || '';
            return `
        <div class="syllable-item bg-${elemClass}" style="animation-delay: ${i * 0.1}s">
          <div class="syllable-name">${p.original || p.name}</div>
          <div class="syllable-type">${p.type}</div>
          <div class="syllable-strokes">${p.strokes || '?'}</div>
          <div class="syllable-strokes-label">Số Nét</div>
          <div class="syllable-element element-${elemClass}">${icon} ${p.element || 'Unknown'}</div>
        </div>
      `;
        }).join('');

        renderCucCard('tinhCuc', analysis.tinhCuc);
        renderCucCard('dongCuc', analysis.dongCuc);
        renderCucCard('tienVan', analysis.tienVan);
        renderCucCard('hauVan', analysis.hauVan);
        renderCucCard('phucDuc', analysis.phucDuc);
        renderCucCard('tuTuc', analysis.tuTuc);

        document.querySelector('.tab-btn.active')?.classList.remove('active');
        document.querySelector('.tab-btn[data-tab="tinh"]').classList.add('active');
        renderInterpretation('tinhCuc');
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            const map = { 'tinh': 'tinhCuc', 'dong': 'dongCuc', 'tien': 'tienVan', 'hau': 'hauVan', 'phuc': 'phucDuc', 'tu': 'tuTuc' };
            renderInterpretation(map[e.target.dataset.tab]);
        });
    });

    document.getElementById('resetBtn').addEventListener('click', () => {
        document.getElementById('hoInput').value = '';
        document.getElementById('demInput').value = '';
        document.getElementById('tenInput').value = '';
        document.getElementById('resultsSection').classList.add('hidden');
    });

    // Simple Suggestion Logic
    document.querySelectorAll('.element-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.element-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            const elem = e.target.dataset.element;
            const matches = Object.values(syllablesData).filter(s => s.element && s.element.includes(elem)).slice(0, 20);
            document.getElementById('suggestionResults').innerHTML = matches.map(s => `
        <div class="suggestion-item"><div class="s-name">${s.name}</div><div class="s-strokes">${s.strokes} nét</div></div>
      `).join('');
        });
    });
}

// Particle BG
const canvas = document.getElementById('bgCanvas');
const ctx = canvas.getContext('2d');
let particles = [];
function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.addEventListener('resize', resize); resize();
class Particle { constructor() { this.x = Math.random() * canvas.width; this.y = Math.random() * canvas.height; this.size = Math.random() * 2; this.speedX = Math.random() * 0.5 - 0.25; this.speedY = Math.random() * 0.5 - 0.25; this.color = `rgba(212,175,55,${Math.random() * 0.5})`; } update() { this.x += this.speedX; this.y += this.speedY; if (this.x > canvas.width) this.x = 0; if (this.x < 0) this.x = canvas.width; if (this.y > canvas.height) this.y = 0; if (this.y < 0) this.y = canvas.height; } draw() { ctx.fillStyle = this.color; ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill(); } }
function init() { for (let i = 0; i < 50; i++)particles.push(new Particle()); }
function animate() { ctx.clearRect(0, 0, canvas.width, canvas.height); particles.forEach(p => { p.update(); p.draw(); }); requestAnimationFrame(animate); }
init(); animate();

initApp();
