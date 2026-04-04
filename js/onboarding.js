// ============================================================
//  ONBOARDING.JS — Zero-State Onboarding Wizard (3 Steps)
// ============================================================

let obSubjects = [];
let obWeekends = JSON.parse(localStorage.getItem("weekend_days") || '["Sunday"]');
let obTimetable = {};
let obTarget    = 75;

function isFirstRun() {
    return !localStorage.getItem("onboarding_done");
}

function launchOnboarding() {
    const wiz = document.getElementById("onboardingWizard");
    wiz.style.display = "flex";

    // Pre-fill name
    const savedName = localStorage.getItem("student_name");
    if (savedName) document.getElementById('obStudentName').value = savedName;

    // Pre-fill target %
    const savedTarget = localStorage.getItem("target_percent");
    if (savedTarget) {
        obTarget = parseInt(savedTarget);
        let chipFound = false;
        document.querySelectorAll('#obStep1 .ob-chip').forEach(c => {
            if (c.innerText.includes(savedTarget + "%")) {
                document.querySelectorAll('#obStep1 .ob-chip').forEach(ch => ch.classList.remove('active'));
                c.classList.add('active');
                chipFound = true;
            }
        });
        if (!chipFound) document.getElementById('obTargetCustom').value = savedTarget;
    }

    // Pre-fill weekends
    document.querySelectorAll('#obStep1 .ob-chip[id^="wk"]').forEach(el => el.classList.remove('active'));
    obWeekends.forEach(d => {
        const el = document.getElementById("wk" + d.slice(0, 3));
        if (el) el.classList.add("active");
    });
}

function selectTarget(btn, val) {
    document.querySelectorAll('#obStep1 .ob-chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    obTarget = val;
    document.getElementById('obTargetCustom').value = '';
}

function toggleWeekend(day, btn) {
    btn.classList.toggle('active');
    if (obWeekends.includes(day)) {
        obWeekends = obWeekends.filter(d => d !== day);
    } else {
        obWeekends.push(day);
    }
}

function addObSubject() {
    const input = document.getElementById('obSubjectInput');
    const name  = input.value.trim();
    if (!name) return;
    if (obSubjects.includes(name)) { input.value = ''; return; }
    obSubjects.push(name);
    input.value = '';
    renderObSubjects();
}

function removeObSubject(name) {
    obSubjects = obSubjects.filter(s => s !== name);
    renderObSubjects();
}

function renderObSubjects() {
    const container = document.getElementById('obSubjectList');
    container.innerHTML = obSubjects.length === 0
        ? '<div style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">No subjects yet. Add one above.</div>'
        : obSubjects.map(s =>
            `<span class="ob-subject-tag">${s}<button onclick="removeObSubject('${s.replace(/'/g, "\\'")}')">×</button></span>`
          ).join('');
}

function buildObTimetableUI() {
    const container = document.getElementById('obTimetableBuilder');
    container.innerHTML = '';
    const allDays    = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
    const activeDays = allDays.filter(d => !obWeekends.includes(d));

    activeDays.forEach(day => {
        const slots = obTimetable[day] || [];
        let slotsHTML = slots.map((s, i) => `
            <div class="ob-slot-row">
                <input type="text" placeholder="Tap to set time" value="${s[0]}" readonly
                    onclick="openTimePicker('onboarding', ${i}, '${day}', this.value)"
                    style="cursor:pointer;font-size:13px;flex:1;min-width:0;">
                <div style="flex:1.5;min-width:0;">
                    <select class="custom-select-source" onchange="updateObSlot('${day}',${i},1,this.value)" style="margin-bottom:0;">
                        ${obSubjects.map(sub => `<option value="${sub}" ${s[1] === sub ? 'selected' : ''}>${sub}</option>`).join('')}
                    </select>
                </div>
                <button class="ob-del-btn" onclick="removeObSlot('${day}',${i})">×</button>
            </div>`).join('');

        container.innerHTML += `
            <div class="ob-day-block">
                <div class="ob-day-header">
                    <span>${day}</span>
                    <span style="font-size:13px;color:var(--text-muted);">${slots.length} slot${slots.length !== 1 ? 's' : ''}</span>
                </div>
                ${slotsHTML}
                <button class="ob-add-slot-btn" onclick="addObSlot('${day}')">+ Add Slot for ${day}</button>
            </div>`;
    });

    setupCustomSelects();
}

function addObSlot(day) {
    if (!obTimetable[day]) obTimetable[day] = [];
    obTimetable[day].push(['00:00-00:00', obSubjects[0] || '']);
    buildObTimetableUI();
}

function removeObSlot(day, idx) {
    obTimetable[day].splice(idx, 1);
    buildObTimetableUI();
}

function updateObSlot(day, idx, field, val) {
    if (!obTimetable[day]) obTimetable[day] = [];
    if (!obTimetable[day][idx]) obTimetable[day][idx] = ['', ''];
    obTimetable[day][idx][field] = val;
}

function obNext(step) {
    if (step === 2) {
        const customVal = parseInt(document.getElementById('obTargetCustom').value);
        if (!isNaN(customVal) && customVal >= 1 && customVal <= 100) obTarget = customVal;
        if (!obTarget || obTarget < 1) { showToast("Please set a target %", "error"); return; }
    }
    if (step === 3) {
        if (obSubjects.length === 0) { showToast("Add at least one subject", "error"); return; }
        buildObTimetableUI();
    }
    document.querySelectorAll('.ob-step').forEach(el => el.style.display = 'none');
    document.getElementById('obStep' + step).style.display = 'block';

    for (let i = 1; i <= 3; i++) {
        const dot = document.getElementById('obDot' + i);
        dot.className = 'ob-step-dot' + (i === step ? ' active' : (i < step ? ' done' : ''));
    }
    for (let i = 1; i <= 2; i++) {
        const line = document.getElementById('obLine' + i);
        line.className = 'ob-step-line' + (i < step ? ' done' : '');
    }
    document.getElementById('onboardingWizard').scrollTop = 0;
}

function finishOnboarding(importedData = null) {
    const nameVal = document.getElementById('obStudentName').value.trim();
    if (nameVal) localStorage.setItem("student_name", nameVal);

    localStorage.setItem("target_percent", obTarget);
    MIN_ATTENDANCE = obTarget;
    localStorage.setItem("weekend_days", JSON.stringify(obWeekends));
    WEEKEND_DAYS = obWeekends;

    const startVal = document.getElementById('obSemStart').value;
    const endVal   = document.getElementById('obSemEnd').value;
    if (startVal) localStorage.setItem("sem_start_date", startVal);
    if (endVal)   localStorage.setItem("sem_end_date", endVal);

    if (importedData) {
        timetable = importedData;
    } else {
        const cleanTT = {};
        Object.keys(obTimetable).forEach(day => {
            const slots = obTimetable[day].filter(s => s[0] && s[1]);
            if (slots.length > 0) cleanTT[day] = slots;
        });
        timetable = cleanTT;
    }

    obSubjects.forEach(sub => {
        if (!data.totals[sub]) data.totals[sub] = { p: 0, t: 0 };
    });
    save();
    localStorage.setItem("custom_timetable", JSON.stringify(timetable));
    localStorage.setItem("onboarding_done", "1");

    document.getElementById('onboardingWizard').style.display = 'none';
    render();

    setTimeout(() => {
        document.getElementById('pushPromptModal').style.display = 'flex';
    }, 600);
}

// Push prompt handlers (belong with onboarding flow)
function closePushPrompt() {
    document.getElementById('pushPromptModal').style.display = 'none';
    showToast("Welcome! Your profile is ready 🚀");
}

function acceptPushPrompt() {
    document.getElementById('pushPromptModal').style.display = 'none';
    showToast("Welcome! Your profile is ready 🚀");
    enablePushNotifications();
}
