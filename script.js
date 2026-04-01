// ============================================================
//  FEATURE 1: ZERO-STATE ONBOARDING WIZARD
// ============================================================
let obSubjects = [];
let obWeekends = JSON.parse(localStorage.getItem("weekend_days") || '["Sunday"]');
let obTimetable = {}; // built during onboarding step 3
let obTarget = 75;

// Initialize Supabase
const supabaseUrl = 'https://gahmbbudkhlyliuwaqcy.supabase.co'; 
const supabaseKey = 'sb_publishable_g3nHitWdObU8OMa8Fc9LjQ_VquLQE0k';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

function isFirstRun() {
    return !localStorage.getItem("onboarding_done");
}

function launchOnboarding() {
    const wiz = document.getElementById("onboardingWizard");
    wiz.style.display = "flex";
    // Pre-check default weekend
    obWeekends.forEach(d => {
        const el = document.getElementById("wk" + d.replace("day",""));
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
    const name = input.value.trim();
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
        ? '<div style="font-size:13px; color:var(--text-muted); margin-bottom:12px;">No subjects yet. Add one above.</div>'
        : obSubjects.map(s => `<span class="ob-subject-tag">${s}<button onclick="removeObSubject('${s.replace(/'/g, "\\'")}')">×</button></span>`).join('');
}

function buildObTimetableUI() {
    const container = document.getElementById('obTimetableBuilder');
    container.innerHTML = '';
    const allDays = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
    const activeDays = allDays.filter(d => !obWeekends.includes(d));
    
    activeDays.forEach(day => {
        const slots = obTimetable[day] || [];
        
        // UPDATE: Added flex-box styling and the "custom-select-source" class
        let slotsHTML = slots.map((s, i) => `
            <div class="ob-slot-row">
                <input type="text" placeholder="Tap to set time" value="${s[0]}" readonly onclick="openTimePicker('onboarding', ${i}, '${day}', this.value)" style="cursor:pointer; font-size:13px; flex: 1; min-width: 0;">
                
                <div style="flex: 1.5; min-width: 0;">
                    <select class="custom-select-source" onchange="updateObSlot('${day}',${i},1,this.value)" style="margin-bottom:0;">
                        ${obSubjects.map(sub => `<option value="${sub}" ${s[1]===sub?'selected':''}>${sub}</option>`).join('')}
                    </select>
                </div>

                <button class="ob-del-btn" onclick="removeObSlot('${day}',${i})">×</button>
            </div>`).join('');
            
        container.innerHTML += `
            <div class="ob-day-block">
                <div class="ob-day-header"><span>${day}</span><span style="font-size:13px; color:var(--text-muted);">${slots.length} slot${slots.length!==1?'s':''}</span></div>
                ${slotsHTML}
                <button class="ob-add-slot-btn" onclick="addObSlot('${day}')">+ Add Slot for ${day}</button>
            </div>`;
    });

    // NEW: Fire the custom dropdown engine after the HTML is injected
    setupCustomSelects();
}
function addObSlot(day) {
    if (!obTimetable[day]) obTimetable[day] = [];
    const sub = obSubjects[0] || '';
    obTimetable[day].push(['00:00-00:00', sub]); 
    buildObTimetableUI();
}

function removeObSlot(day, idx) {
    obTimetable[day].splice(idx, 1);
    buildObTimetableUI();
}

function updateObSlot(day, idx, field, val) {
    if (!obTimetable[day]) obTimetable[day] = [];
    if (!obTimetable[day][idx]) obTimetable[day][idx] = ['',''];
    obTimetable[day][idx][field] = val;
}

function obNext(step) {
    // Validate current step before advancing
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
    // Update dots
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
    // Save Step 1 Profile Data
    const nameVal = document.getElementById('obStudentName').value.trim();
    if (nameVal) localStorage.setItem("student_name", nameVal);
    
    localStorage.setItem("target_percent", obTarget);
    MIN_ATTENDANCE = obTarget;
    localStorage.setItem("weekend_days", JSON.stringify(obWeekends));
    WEEKEND_DAYS = obWeekends;

    const startVal = document.getElementById('obSemStart').value;
    const endVal = document.getElementById('obSemEnd').value;
    if (startVal) localStorage.setItem("sem_start_date", startVal);
    if (endVal) localStorage.setItem("sem_end_date", endVal);

    // If a timetable was imported via code, use it. Otherwise, use the manually built one.
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
    // Save timetable and finish
    localStorage.setItem("custom_timetable", JSON.stringify(timetable));
    localStorage.setItem("onboarding_done", "1");

    document.getElementById('onboardingWizard').style.display = 'none';
    render();
    
    // DELAY THE PROMPT SLIGHTLY SO IT FEELS SMOOTH
    setTimeout(() => {
        document.getElementById('pushPromptModal').style.display = 'flex';
    }, 600);
}

// ============================================================
//  FEATURE 2: TIMETABLE SHARING (SHARE CODES)
// ============================================================
// Codes are stored in localStorage as a simple lookup.
// In production this would be a cloud DB, but for offline-first we encode the timetable into the code itself.

// --- NOTIFICATION SOFT PROMPT LOGIC ---
function closePushPrompt() {
    document.getElementById('pushPromptModal').style.display = 'none';
    showToast("Welcome! Your profile is ready 🚀");
}

function acceptPushPrompt() {
    document.getElementById('pushPromptModal').style.display = 'none';
    showToast("Welcome! Your profile is ready 🚀");
    enablePushNotifications(); // This triggers the browser's native permission request
}

async function generateShareCode() {
    try {
        showToast("Checking cloud...");

        // 1. SEARCH: Check if this exact timetable already exists in the database
        const { data: existingData, error: searchError } = await supabaseClient
            .from('shared_timetables')
            .select('share_code')
            .eq('timetable_data', JSON.stringify(timetable))
            .limit(1);

        // 2. IF FOUND: Reuse the existing code
        if (existingData && existingData.length > 0) {
            const existingCode = existingData[0].share_code;
            
            localStorage.setItem("my_share_code", existingCode);
            localStorage.setItem("my_full_share_code", existingCode);

            document.getElementById('shareCodeDisplay').style.display = 'block';
            document.getElementById('shareCodeValue').innerText = existingCode;
            showToast("Code retrieved! Share it with classmates.");
            return; // Stop the function here so we don't insert a duplicate
        }

        // 3. IF NOT FOUND: Generate a brand new code and upload it
        showToast("Uploading new timetable...");
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        const { error: insertError } = await supabaseClient
            .from('shared_timetables')
            .insert([{ share_code: code, timetable_data: timetable }]);

        if (insertError) throw insertError;

        // Save locally for the UI
        localStorage.setItem("my_share_code", code);
        localStorage.setItem("my_full_share_code", code);

        document.getElementById('shareCodeDisplay').style.display = 'block';
        document.getElementById('shareCodeValue').innerText = code;
        showToast("New code generated! Share it.");

    } catch (err) {
        console.error("Supabase Error:", err);
        showToast("Failed to connect to cloud. Try again.", "error");
    }
}
function copyShareCode() {
    const code = document.getElementById('shareCodeValue').innerText;
    const fullCode = localStorage.getItem("my_full_share_code") || code;
    
    // Check if modern API is available and in a secure context
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(fullCode)
            .then(() => showToast("Code copied!"))
            .catch(() => fallbackCopy(fullCode));
    } else {
        fallbackCopy(fullCode);
    }
}

// Fallback for older devices or HTTP contexts
function fallbackCopy(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    // Keep it out of view to avoid layout jumps
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showToast("Code copied!");
        } else {
            throw new Error('Copy failed');
        }
    } catch (err) {
        showToast("Copy failed, please share manually", "error");
    }
    document.body.removeChild(textArea);
}

function openImportTTModal() { document.getElementById('importTTModal').style.display = 'flex'; }
function closeImportTTModal() { document.getElementById('importTTModal').style.display = 'none'; }

async function importTimetableByCode() {
    const raw = document.getElementById('importCodeInput').value.trim().toUpperCase();
    
    if (!raw || raw.length !== 6) { 
        showToast("Enter a valid 6-digit code", "error"); 
        return; 
    }

    try {
        showToast("Searching database...");

        // Pull the timetable matching the code from Supabase
        const { data, error } = await supabaseClient
            .from('shared_timetables')
            .select('timetable_data')
            .eq('share_code', raw)
            .single();

        // If it can't find the code, throw an error
        if (error || !data) throw new Error("Code not found");

        const importedTT = data.timetable_data;

        // Ask the user to confirm, just like before
        showConfirm("Import Timetable?", "This will replace your current timetable with the imported one. Attendance data is kept.", () => {
            closeImportTTModal();
            
            // Check if we are currently inside the Onboarding Wizard
            const wizard = document.getElementById('onboardingWizard');
            if (wizard && wizard.style.display === 'flex') {
                // We are in onboarding! Route the data through the finish function
                finishOnboarding(importedTT);
            } else {
                // We are just in the normal app settings. Do a standard replace.
                timetable = importedTT;
                localStorage.setItem("custom_timetable", JSON.stringify(timetable));
                render();
                showToast("Timetable imported successfully! 🎉");
            }
        });

    } catch (err) {
        console.error("Fetch Error:", err);
        showToast("Code not found in cloud. Check the code and try again.", "error");
    }
}

// ============================================================
//  FEATURE 3: CUSTOM WEEK DAYS (already integrated above)
//  CREDIT WEIGHT (via timetable slot 3rd element)
// ============================================================
// Timetable slot format: [time, subject, creditWeight?]
// creditWeight defaults to 1 if not set.
function getSlotWeight(slot) {
    return (slot && slot[2]) ? parseInt(slot[2]) : 1;
}

// ============================================================
//  FEATURE 4: SEMESTER LIFECYCLE MANAGEMENT
// ============================================================
function endSemester() {
    showConfirm("End Semester?", "Your data will be archived to 'Past Semesters' and the app will reset for a new term.", () => {
        const now = new Date();
        const semLabel = `Semester — ${now.toLocaleString('default', { month: 'long', year: 'numeric' })}`;
        const archive = {
            id: Date.now(),
            label: semLabel,
            archivedAt: now.toISOString(),
            semStart: localStorage.getItem("sem_start_date") || "",
            semEnd: localStorage.getItem("sem_end_date") || now.toISOString().split("T")[0],
            target: MIN_ATTENDANCE,
            timetable: timetable,
            data: JSON.parse(JSON.stringify(data))
        };
        const pastSems = JSON.parse(localStorage.getItem("past_semesters") || "[]");
        pastSems.unshift(archive);
        localStorage.setItem("past_semesters", JSON.stringify(pastSems));
        // Reset current data
        localStorage.removeItem("attendance");
        localStorage.removeItem("sem_start_date");
        localStorage.removeItem("sem_end_date");
        localStorage.setItem("last_sync_time", "0");
        data = { totals:{}, history:{}, locks:{}, tasks:[], holidays:[] };
        save(false);
        render();
        showToast("Semester archived! Fresh start 🎓");
    });
}

function openSemArchiveModal() {
    const list = document.getElementById('semArchiveList');
    const pastSems = JSON.parse(localStorage.getItem("past_semesters") || "[]");
    if (pastSems.length === 0) {
        list.innerHTML = '<div style="text-align:center; color:var(--text-muted); font-size:14px; font-weight:600; padding:20px;">No archived semesters yet.</div>';
    } else {
        list.innerHTML = pastSems.map((sem, idx) => {
            let tp = 0, tt = 0;
            Object.values(sem.data.totals || {}).forEach(s => { tp += s.p; tt += s.t; });
            const overall = tt ? Math.round((tp/tt)*100) : 0;
            const color = overall >= sem.target ? 'var(--green)' : 'var(--red)';
            return `<div class="sem-archive-item">
                <h4>${sem.label}</h4>
                <p>Target: ${sem.target}% &nbsp;•&nbsp; Archived: ${new Date(sem.archivedAt).toLocaleDateString()}</p>
                <div class="sem-archive-stats">
                    <span class="sem-stat-badge" style="color:${color}">${overall}% Overall</span>
                    <span class="sem-stat-badge">${tp}/${tt} Classes</span>
                    <span class="sem-stat-badge">${Object.keys(sem.data.totals||{}).length} Subjects</span>
                </div>
                <button class="btn-block btn-secondary" onclick="exportSemArchive(${idx})" style="margin-top:12px; font-size:13px; padding:10px;">📥 Export Report</button>
            </div>`;
        }).join('');
    }
    document.getElementById('semArchiveModal').style.display = 'flex';
}

function closeSemArchiveModal() { document.getElementById('semArchiveModal').style.display = 'none'; }

function exportSemArchive(idx) {
    const pastSems = JSON.parse(localStorage.getItem("past_semesters") || "[]");
    const sem = pastSems[idx];
    if (!sem) return;
    const blob = new Blob([JSON.stringify({ version:15, timestamp:sem.archivedAt, data:sem.data }, null, 2)], { type:"application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `semester_archive_${sem.id}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast("Archive Exported");
}

// Weekend days helpers
let WEEKEND_DAYS = JSON.parse(localStorage.getItem("weekend_days") || '["Sunday"]');

function isWeekend(dayName) {
    return WEEKEND_DAYS.includes(dayName);
}

function toggleSettingsWeekend(day, btn) {
    btn.classList.toggle('active');
}

// ============================================================
// ICON LIBRARY (SVG) ---
const ICONS = {
    home: '<svg class="icon icon-lg" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>',
    stats: '<svg class="icon icon-lg" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>',
    tools: '<svg class="icon icon-lg" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>',
    note: '<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>',
    check: '<svg class="icon icon-sm" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>',
    x: '<svg class="icon icon-sm" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
    trash: '<svg class="icon icon-sm" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>',
    undo: '<svg class="icon icon-sm" viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>',
    close: '<svg class="icon icon-lg" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
    chart: '<svg class="icon icon-lg" viewBox="0 0 24 24"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>',
    list: '<svg class="icon icon-lg" viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>',
    graph: '<svg class="icon icon-lg" viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>',
    calendar: '<svg class="icon icon-lg" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>',
    db: '<svg class="icon icon-lg" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>',
    task: '<svg class="icon icon-lg" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
    slot: '<svg class="icon icon-lg" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>',
    gear: '<svg class="icon icon-lg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0 .33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>',
    crystal: '<svg class="icon icon-lg" viewBox="0 0 24 24" stroke="currentColor" fill="none"><path d="M12 2a9 9 0 1 0 0 18 9 9 0 0 0 0-18z"></path><path d="M12 6a4 4 0 0 0-4 4"></path><path d="M8 18h8"></path><path d="M10 22h4"></path></svg>',
    target: '<svg viewBox="0 0 24 24" style="width:1em; height:1em; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round;"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>',
    book: '<svg viewBox="0 0 24 24" style="width:1em; height:1em; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round;"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>',
    rocket: '<svg viewBox="0 0 24 24" style="width:1em; height:1em; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round;"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path></svg>',
    archive: '<svg viewBox="0 0 24 24" style="width:1em; height:1em; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round;"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>',
    alert: '<svg viewBox="0 0 24 24" style="width:1em; height:1em; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
    emptybox: '<svg viewBox="0 0 24 24" style="width:1em; height:1em; fill:none; stroke:currentColor; stroke-width:1.5; stroke-linecap:round; stroke-linejoin:round;"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>',
    link: '<svg viewBox="0 0 24 24" style="width:1em; height:1em; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>',
    copy: '<svg viewBox="0 0 24 24" style="width:1em; height:1em; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round;"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>',
    import: '<svg viewBox="0 0 24 24" style="width:1em; height:1em; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>',
    grad: '<svg viewBox="0 0 24 24" style="width:1em; height:1em; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round;"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>',
    flag: '<svg viewBox="0 0 24 24" style="width:1em; height:1em; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round;"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>',
    star: '<svg viewBox="0 0 24 24" style="width:1em; height:1em; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>',
    coffee: '<svg viewBox="0 0 24 24" style="width:1em; height:1em; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round;"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>',
    moon: '<svg viewBox="0 0 24 24" style="width:1em; height:1em; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round;"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>',
    off: '<svg viewBox="0 0 24 24" style="width:1em; height:1em; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round;"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>'
};

document.getElementById('navHome').innerHTML = ICONS.home;
document.getElementById('navStats').innerHTML = ICONS.stats;
document.getElementById('navTools').innerHTML = ICONS.tools;
document.querySelectorAll('.icon-slot').forEach(e => e.innerHTML = ICONS.slot);
document.querySelectorAll('.icon-task').forEach(e => e.innerHTML = ICONS.task);
document.querySelectorAll('.icon-chart').forEach(e => e.innerHTML = ICONS.chart);
document.querySelectorAll('.icon-list').forEach(e => e.innerHTML = ICONS.list);
document.querySelectorAll('.icon-graph').forEach(e => e.innerHTML = ICONS.graph);
document.querySelectorAll('.icon-calendar').forEach(e => e.innerHTML = ICONS.calendar);
document.querySelectorAll('.icon-undo').forEach(e => e.innerHTML = ICONS.undo);
document.querySelectorAll('.icon-db').forEach(e => e.innerHTML = ICONS.db);
document.querySelectorAll('.icon-close').forEach(e => e.innerHTML = ICONS.close);
document.querySelectorAll('.icon-gear').forEach(e => e.innerHTML = ICONS.gear);
document.querySelectorAll('.icon-crystal').forEach(e => e.innerHTML = ICONS.crystal);
document.querySelectorAll('.icon-target').forEach(e => e.innerHTML = ICONS.target);
document.querySelectorAll('.icon-book').forEach(e => e.innerHTML = ICONS.book);
document.querySelectorAll('.icon-rocket').forEach(e => e.innerHTML = ICONS.rocket);
document.querySelectorAll('.icon-archive').forEach(e => e.innerHTML = ICONS.archive);
document.querySelectorAll('.icon-alert').forEach(e => e.innerHTML = ICONS.alert);
document.querySelectorAll('.icon-emptybox').forEach(e => e.innerHTML = ICONS.emptybox);
document.querySelectorAll('.icon-link').forEach(e => e.innerHTML = ICONS.link);
document.querySelectorAll('.icon-copy').forEach(e => e.innerHTML = ICONS.copy);
document.querySelectorAll('.icon-import').forEach(e => e.innerHTML = ICONS.import);
document.querySelectorAll('.icon-grad').forEach(e => e.innerHTML = ICONS.grad);
document.querySelectorAll('.icon-flag').forEach(e => e.innerHTML = ICONS.flag);
document.querySelectorAll('.icon-star').forEach(e => e.innerHTML = ICONS.star);
document.querySelectorAll('.icon-off').forEach(e => e.innerHTML = ICONS.off);

// --- CUSTOM DROPDOWN ENGINE ---
function setupCustomSelects() {
    document.querySelectorAll('.custom-select-source').forEach(select => {
        if (select.parentNode.classList.contains('custom-select-wrapper')) return;
        const wrapper = document.createElement('div'); wrapper.className = 'custom-select-wrapper';
        const trigger = document.createElement('div'); trigger.className = 'custom-select-trigger'; trigger.innerHTML = `<span>${select.options[select.selectedIndex]?.text || 'Select...'}</span>`;
        const optionsDiv = document.createElement('div'); optionsDiv.className = 'custom-options';
        Array.from(select.options).forEach(opt => {
            const optionDiv = document.createElement('div'); optionDiv.className = 'custom-option' + (opt.selected ? ' selected' : ''); optionDiv.innerText = opt.text; optionDiv.setAttribute('data-value', opt.value);
            optionDiv.addEventListener('click', function(e) { e.stopPropagation(); select.value = this.getAttribute('data-value'); trigger.innerHTML = `<span>${this.innerText}</span>`; wrapper.classList.remove('open'); select.dispatchEvent(new Event('change')); optionsDiv.querySelectorAll('.custom-option').forEach(o => o.classList.remove('selected')); this.classList.add('selected'); });
            optionsDiv.appendChild(optionDiv);
        });
        trigger.addEventListener('click', function(e) { e.stopPropagation(); document.querySelectorAll('.custom-select-wrapper.open').forEach(el => { if(el !== wrapper) el.classList.remove('open'); }); wrapper.classList.toggle('open'); });
        select.parentNode.insertBefore(wrapper, select.nextSibling); wrapper.appendChild(select); wrapper.appendChild(trigger); wrapper.appendChild(optionsDiv);
    });
    document.addEventListener('click', function() { document.querySelectorAll('.custom-select-wrapper.open').forEach(el => el.classList.remove('open')); });
}

// --- UI UTILS ---
function showToast(msg, type = 'success') { const box = document.getElementById('toastBox'); const toast = document.createElement('div'); toast.className = `toast ${type}`; const icon = type === 'success' ? ICONS.check : ICONS.x; toast.innerHTML = `<span class="icon-sm" style="color: ${type === 'success' ? 'var(--green)' : 'var(--red)'}">${icon}</span> ${msg}`; box.appendChild(toast); setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateY(-20px) scale(0.9)'; setTimeout(() => toast.remove(), 300); }, 3000); }
function showConfirm(title, desc, onConfirm) { const modal = document.getElementById('confirmModal'); document.getElementById('confirmTitle').innerText = title; document.getElementById('confirmDesc').innerText = desc; modal.style.display = "flex"; const confirmBtn = document.getElementById('confirmYesBtn'); confirmBtn.onclick = () => { onConfirm(); closeConfirm(); }; }
function closeConfirm() { document.getElementById('confirmModal').style.display = "none"; }
function closePasswordModal() { document.getElementById('passwordModal').style.display = "none"; }

// --- LOGIC ---
let USER_PIN = localStorage.getItem("user_pin") || "0000";
let MIN_ATTENDANCE = parseInt(localStorage.getItem("target_percent")) || 75;
const defaultTimetable = {}; // Empty — users set up via onboarding or timetable editor
if ("serviceWorker" in navigator) { navigator.serviceWorker.register("./sw.js").then(reg => { reg.addEventListener('updatefound', () => { const newWorker = reg.installing; newWorker.addEventListener('statechange', () => { if (newWorker.state === 'installed' && navigator.serviceWorker.controller) { showConfirm("Update Available", "A new version of the app is ready.", () => window.location.reload()); } }); }); }); }

function getStorageDateKey(date) { const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, '0'); const d = String(date.getDate()).padStart(2, '0'); return `${y}-${m}-${d}`; }
const today = new Date();
const day = today.toLocaleDateString("en-US",{ weekday:"long" });
const dateKey = getStorageDateKey(today);

let data = JSON.parse(localStorage.getItem("attendance")) || { totals:{}, history:{}, locks:{}, tasks:[], holidays:[] };
if(!data.tasks) data.tasks = [];
if(!data.holidays) data.holidays = [];
let timetable = JSON.parse(localStorage.getItem("custom_timetable")) || JSON.parse(JSON.stringify(defaultTimetable));

function save(){ localStorage.setItem("attendance",JSON.stringify(data)); }

function switchTab(tabId) { document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active')); document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active')); document.getElementById('tab-' + tabId).classList.add('active'); const btns = document.querySelectorAll('.nav-item'); if(tabId === 'home') btns[0].classList.add('active'); if(tabId === 'stats') btns[1].classList.add('active'); if(tabId === 'tools') btns[2].classList.add('active'); if(tabId === 'stats') renderCalendar(); window.scrollTo({top: 0, behavior: 'smooth'}); }
// Your VAPID Public Key from Step 2
const PUBLIC_VAPID_KEY = 'BBMpy4SB8az2T4XOw7hUZouoahcyZ5OH8sqmmF-vjJ14VZh4PYheDLxTefBRXP1AFwY0yYgIgeDgMt45Q505shg'; 

// Helper to convert key format
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) { outputArray[i] = rawData.charCodeAt(i); }
    return outputArray;
}

async function enablePushNotifications() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        showToast("Push not supported on this device", "error");
        return;
    }

    try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') throw new Error('Permission denied');

        const registration = await navigator.serviceWorker.ready;
        
        // Subscribe the device
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
        });

        // Save this subscription object to Supabase
        await saveSubscriptionToCloud(subscription);
        
        showToast("Reminders Activated! 🔔");
        
        // UPDATE THE SETTINGS BUTTON VISUALLY
        const btn = document.getElementById('settingsPushBtn');
        if (btn) {
            btn.innerHTML = "Reminders Active ✓";
            btn.disabled = true;
            btn.style.opacity = '0.6';
            btn.style.background = 'var(--green-glow)';
            btn.style.color = 'var(--green)';
            btn.style.border = '1px solid var(--green)';
        }
    } catch (err) {
        console.error(err);
        showToast("Failed to enable notifications", "error");
    }
}
    
async function saveSubscriptionToCloud(sub) {
    // We send the subscription to your Supabase database
    const { data, error } = await supabaseClient
        .from('push_subscriptions')
        .upsert([{ 
            endpoint: sub.endpoint, 
            keys: sub.toJSON().keys,
            last_active: new Date().toISOString()
        }], { onConflict: 'endpoint' });

    if (error) console.error("DB Error:", error);
}
function sendNotification(title, body) { if (Notification.permission === "granted") { if(navigator.serviceWorker.controller){ navigator.serviceWorker.ready.then(reg => reg.showNotification(title, { body: body, icon: 'icon.png' })); } else { new Notification(title, { body: body, icon: 'icon.png' }); } } }
function startBackgroundCheck() { setInterval(() => { const now = new Date(); if(now.getHours() === 17 && now.getMinutes() === 0) { const d = now.toLocaleDateString("en-US",{ weekday:"long" }); if(isWeekend(d)) return; if(getHolidayForDate(dateKey)) return; const todaysLocks = Object.keys(data.locks).some(k => k.startsWith(dateKey)); if(!todaysLocks) { sendNotification("Attendance Reminder", "You haven't marked your attendance today!"); document.getElementById("reminderAlert").style.display = "block"; } } }, 60000); }
startBackgroundCheck();

// --- HOLIDAY LOGIC UPGRADED ---
function getHolidayForDate(dateStr) {
    if(!data.holidays) return null;
    const target = new Date(dateStr);
    return data.holidays.find(h => {
        const start = new Date(h.start);
        const end = new Date(h.end);
        return target >= start && target <= end;
    });
}

let currentSetCalDate = new Date();
let selectedEventDate = "";
let selectedEventType = "festival";
let editingHolidayId = null; 

function changeSetCalMonth(delta) { currentSetCalDate.setMonth(currentSetCalDate.getMonth() + delta); renderSettingsCalendar(); }
function renderSettingsCalendar() {
    const grid = document.getElementById('settingsCalGrid'); grid.innerHTML = ""; const year = currentSetCalDate.getFullYear(); const month = currentSetCalDate.getMonth();
    document.getElementById('setCalMonthYear').innerText = new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' });
    const firstDay = new Date(year, month, 1).getDay() || 7; const daysInMonth = new Date(year, month + 1, 0).getDate();
    for(let i=1; i<firstDay; i++) grid.innerHTML += `<div></div>`;
    for(let d=1; d<=daysInMonth; d++) {
        const dStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; const holiday = getHolidayForDate(dStr); let dotClass = "";
        if(holiday) { if(holiday.type === 'exam') dotClass = "orange"; else if(holiday.type === 'off') dotClass = "green"; else dotClass = "purple"; }
        const dotHTML = dotClass ? `<div class="dot ${dotClass}"></div>` : ''; grid.innerHTML += `<div class="cal-day" onclick="openEventModal('${dStr}')">${d}${dotHTML}</div>`;
    }
}

function openEventModal(dateStr) {
    selectedEventDate = dateStr; const holiday = getHolidayForDate(dateStr); document.getElementById('eventModal').style.display = "flex";
    const startDateInput = document.getElementById('eventStartDateInput'); const endDateInput = document.getElementById('eventEndDateInput');
    startDateInput.value = dateStr; editingHolidayId = null;
    if(holiday) { document.getElementById('eventNameInput').value = holiday.name; endDateInput.value = holiday.end; setEventType(holiday.type || 'festival'); editingHolidayId = holiday.id; } 
    else { document.getElementById('eventNameInput').value = ""; endDateInput.value = dateStr; setEventType('festival'); }
}
function setEventType(type) {
    selectedEventType = type;
    document.getElementById('typeFestival').className = 'btn-pill btn-secondary'; document.getElementById('typeExam').className = 'btn-pill btn-secondary'; document.getElementById('typeOff').className = 'btn-pill btn-secondary';
    document.getElementById('typeFestival').style.background = ""; document.getElementById('typeFestival').style.color = "";
    document.getElementById('typeExam').style.background = ""; document.getElementById('typeExam').style.color = "";
    if(type === 'festival') { document.getElementById('typeFestival').className = 'btn-pill present'; document.getElementById('typeFestival').style.background = "rgba(139, 92, 246, 0.15)"; document.getElementById('typeFestival').style.color = "#a78bfa"; }
    if(type === 'exam') { document.getElementById('typeExam').className = 'btn-pill absent'; document.getElementById('typeExam').style.background = "rgba(245, 158, 11, 0.15)"; document.getElementById('typeExam').style.color = "#fbbf24"; }
    if(type === 'off') { document.getElementById('typeOff').className = 'btn-pill cancelled'; }
}
function closeEventModal() { document.getElementById('eventModal').style.display = "none"; }
function saveEvent() {
    const name = document.getElementById('eventNameInput').value.trim(); const endDate = document.getElementById('eventEndDateInput').value;
    if(!name) return showToast("Enter Name", "error"); if(!endDate) return showToast("End date required", "error"); if(endDate < selectedEventDate) return showToast("End date cannot be before start", "error");
    if(editingHolidayId) { data.holidays = data.holidays.filter(h => h.id !== editingHolidayId); } else { data.holidays = data.holidays.filter(h => h.start !== selectedEventDate); }
    data.holidays.push({ id: Date.now(), name: name, start: selectedEventDate, end: endDate, type: selectedEventType });
    save(); renderSettingsCalendar(); renderHolidays(); closeEventModal(); showToast("Event Saved");
}
function deleteHoliday(id) { data.holidays = data.holidays.filter(h => h.id !== id); save(); renderSettingsCalendar(); renderHolidays(); }
function renderHolidays() {
    const list = document.getElementById("holidayList"); list.innerHTML = "";
    if(!data.holidays || data.holidays.length === 0) { list.innerHTML = "<div style='font-size:13px; color:var(--text-muted); text-align:center;'>No events added</div>"; return; }
    data.holidays.sort((a,b) => new Date(a.start) - new Date(b.start)).forEach(h => {
        let typeBadge = "";
        if(h.type === 'exam') typeBadge = `<span class="badge-type badge-exam">EXAM</span>`; else if(h.type === 'off') typeBadge = `<span class="badge-type badge-off">OFF</span>`; else typeBadge = `<span class="badge-type badge-festival">HOLIDAY</span>`;
        let dateDisplay = formatDateDDMMYYYY(h.start); if(h.start !== h.end) { dateDisplay += ` - ${formatDateDDMMYYYY(h.end)}`; }
        list.innerHTML += `<div class="task-item" style="border-left: none; border-bottom: 1px solid var(--border-color); border-radius: 0; background: transparent; padding: 12px 0;"><div style="flex:1;"><div style="font-size:14px; font-weight:700; display:flex; align-items:center;">${typeBadge} ${h.name}</div><div style="font-size:12px; color:var(--text-muted); margin-top:6px; font-weight:500;">${dateDisplay}</div></div><button class="del-task-btn" onclick="deleteHoliday(${h.id})">${ICONS.trash}</button></div>`;
    });
}

function loadLectures(){
  const container = document.getElementById("lectures"); 
  container.innerHTML = "";
  const emptyState = document.getElementById("emptyStateHome");
  const activeHoliday = getHolidayForDate(dateKey);

  if (activeHoliday) {
      let svgIcon = "";
      let colorTheme = "";
      let subtitle = "";

      // --- 1. EXAM CARD (Static A+ / Floating Pencil) ---
      if (activeHoliday.type === 'exam') {
          colorTheme = "rgba(245, 158, 11, 0.4)"; // Amber theme
          subtitle = "Good luck! No attendance tracking today.";
          svgIcon = `
            <svg viewBox="0 0 100 100" style="width: 80px; height: 80px; margin-bottom: 16px; overflow: visible;">
                <circle cx="50" cy="50" r="35" fill="rgba(245, 158, 11, 0.15)"/>
                <path d="M 30 15 L 60 15 L 75 30 L 75 85 L 30 85 Z" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>
                <path d="M 60 15 L 60 30 L 75 30 Z" fill="#e2e8f0"/>
                <line x1="38" y1="35" x2="67" y2="35" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/>
                <line x1="38" y1="45" x2="60" y2="45" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/>
                <line x1="38" y1="55" x2="67" y2="55" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/>
                <g>
                    <circle cx="53" cy="72" r="14" fill="rgba(239, 68, 68, 0.15)"/>
                    <text x="53" y="78" font-family="'Plus Jakarta Sans', sans-serif" font-size="20" font-weight="900" fill="#ef4444" text-anchor="middle">A+</text>
                </g>
                <g class="anim-ghost">
                    <polygon points="12,65 18,59 38,79 32,85" fill="#fbbf24"/>
                    <line x1="16" y1="63" x2="36" y2="83" stroke="#f59e0b" stroke-width="1.5"/>
                    <polygon points="12,65 18,59 14,55 8,61" fill="#fca5a5"/>
                    <line x1="12" y1="65" x2="18" y2="59" stroke="#94a3b8" stroke-width="2"/>
                    <polygon points="38,79 32,85 43,88" fill="#fef3c7"/>
                    <polygon points="39,83 36,86 43,88" fill="#475569"/>
                </g>
            </svg>`;
      } 
      // --- 2. OFF / MASS BUNK CARD (Animated Ghost) ---
      else if (activeHoliday.type === 'off') {
          colorTheme = "rgba(161, 161, 170, 0.4)"; // Slate theme
          subtitle = "Mass bunk validated. Classes are officially off.";
          svgIcon = `
            <svg viewBox="0 0 100 100" style="width: 80px; height: 80px; margin-bottom: 16px; overflow: visible;">
                <defs>
                    <linearGradient id="ghostGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stop-color="#ffffff"/>
                        <stop offset="100%" stop-color="#cbd5e1"/>
                    </linearGradient>
                </defs>
                <ellipse class="anim-ghost-shadow" cx="50" cy="95" rx="22" ry="5" fill="#000000"/>
                <g class="anim-ghost">
                    <path d="M 25 60 C 25 10 75 10 75 60 L 75 85 C 70 80 65 90 60 85 C 55 80 50 90 45 85 C 40 80 35 90 30 85 C 25 80 25 85 25 85 Z" fill="url(#ghostGrad)" filter="drop-shadow(0px 8px 6px rgba(0,0,0,0.15))"/>
                    <rect x="30" y="40" width="18" height="10" fill="#0f172a" rx="1"/>
                    <rect x="52" y="40" width="18" height="10" fill="#0f172a" rx="1"/>
                    <rect x="48" y="42" width="4" height="4" fill="#0f172a"/>
                    <rect x="32" y="42" width="6" height="3" fill="#ffffff" opacity="0.8"/>
                    <rect x="54" y="42" width="6" height="3" fill="#ffffff" opacity="0.8"/>
                </g>
            </svg>`;
      } 
      // --- 3. HOLIDAY / FESTIVAL CARD (Clean Cozy Cup) ---
      else {
          colorTheme = "rgba(212, 163, 115, 0.4)"; // Warm Caramel theme
          subtitle = "No classes today. Take a breather and enjoy!";
          svgIcon = `
            <svg viewBox="0 0 100 100" style="width: 80px; height: 80px; margin-bottom: 16px; overflow: visible;">
              <defs>
                <linearGradient id="cupBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#f5d9a8"/>
                  <stop offset="100%" stop-color="#c8894a"/>
                </linearGradient>
                <linearGradient id="liquidGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="#6b2f0a"/>
                  <stop offset="100%" stop-color="#3b1505"/>
                </linearGradient>
                <linearGradient id="saucerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="#c8894a"/>
                  <stop offset="100%" stop-color="#7a4c1e"/>
                </linearGradient>
              </defs>
              <style>
                @keyframes cupFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
                @keyframes steamUp { 0%{opacity:0;transform:translateY(0) scaleX(1)} 40%{opacity:0.7} 100%{opacity:0;transform:translateY(-18px) scaleX(1.3)} }
                .cup-float { animation: cupFloat 3.5s ease-in-out infinite; }
                .s1 { animation: steamUp 2.2s ease-in-out infinite; }
                .s2 { animation: steamUp 2.2s ease-in-out infinite 0.7s; }
                .s3 { animation: steamUp 2.2s ease-in-out infinite 1.4s; }
              </style>

              <!-- Saucer -->
              <ellipse cx="50" cy="80" rx="28" ry="7" fill="url(#saucerGrad)" opacity="0.9"/>
              <ellipse cx="50" cy="78" rx="20" ry="4" fill="#5a3010" opacity="0.6"/>

              <g class="cup-float">
                <!-- Cup body -->
                <path d="M28 48 Q27 72 50 74 Q73 72 72 48 Z" fill="url(#cupBodyGrad)"/>
                <!-- Cup rim ellipse -->
                <ellipse cx="50" cy="48" rx="22" ry="6" fill="#e8b87a"/>
                <!-- Liquid surface -->
                <ellipse cx="50" cy="48" rx="19" ry="5" fill="url(#liquidGrad)"/>
                <!-- Liquid shine -->
                <ellipse cx="44" cy="47" rx="6" ry="2" fill="white" opacity="0.12" transform="rotate(-10 44 47)"/>
                <!-- Handle -->
                <path d="M72 54 Q88 54 88 63 Q88 72 72 68" fill="none" stroke="url(#cupBodyGrad)" stroke-width="7" stroke-linecap="round"/>
                <path d="M72 54 Q85 55 85 63 Q85 71 72 68" fill="none" stroke="#e8b87a" stroke-width="2.5" stroke-linecap="round" opacity="0.5"/>
                <!-- Cup highlight stripe -->
                <path d="M33 52 Q32 66 38 71" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" opacity="0.18"/>

                <!-- Steam wisps -->
                <path class="s1" d="M42 44 Q39 38 42 32" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" opacity="0.5"/>
                <path class="s2" d="M50 43 Q47 36 50 29" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" opacity="0.55"/>
                <path class="s3" d="M58 44 Q61 37 58 31" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" opacity="0.5"/>
              </g>
            </svg>`;
      }

     div.innerHTML = `
        <div class="lec-top" style="align-items: flex-start;">
            <div style="display: flex; flex-direction: column; gap: 8px; flex: 1; margin-right: 12px;">
                <div class="lec-subject" style="margin-right: 0; font-size: 17px;">${subject} ${weightBadge}</div>
                <div style="text-align: left;"><span class="lec-time" style="display: inline-block;">${time}</span></div>
            </div>
            <button class="note-btn" onclick="event.stopPropagation(); addNote('${subject}')" style="flex-shrink: 0;">${ICONS.note}</button>
        </div>
        ${statusHTML}
        <div class="action-row" style="display:${locked ? 'none' : 'flex'}">
            <button class="btn-pill present" onclick="markAttendance('${subject}', '${time}', 'Present', ${weight})">Present</button>
            <button class="btn-pill absent" onclick="markAttendance('${subject}', '${time}', 'Absent', ${weight})">Absent</button>
            <button class="btn-pill cancelled" onclick="markAttendance('${subject}', '${time}', 'Cancelled', ${weight})">Off</button>
        </div>
    `;
          
      if(emptyState) emptyState.style.display = 'none';
      return;
  }

  const todayLectures = timetable[day] || [];
  if (todayLectures.length === 0 && !isWeekend(day)) {
      if(emptyState) emptyState.style.display = 'block';
      return;
  }
  if(emptyState) emptyState.style.display = 'none';
  
  todayLectures.forEach((slot)=>{
    const [time, subject] = slot; 
    const weight = getSlotWeight(slot);
    const lockKey = dateKey+"_"+subject+"_"+time; 
    const locked = data.locks[lockKey]; 
    const div = document.createElement("div"); 
    div.className = "card lecture-card "+(locked?"locked":"");
    let statusHTML = "";
    if(locked && data.history[dateKey]){
      const entry = data.history[dateKey].find(h => h.subject === subject && h.time === time);
      if(entry){
        if(entry.status === "Present") div.classList.add("lecture-present"); 
        if(entry.status === "Absent") div.classList.add("lecture-absent"); 
        if(entry.status === "Cancelled") div.classList.add("lecture-cancelled");
        let icon = entry.status === "Present" ? ICONS.check : (entry.status === "Absent" ? ICONS.x : ICONS.close); 
        let color = entry.status === "Present" ? "var(--green)" : (entry.status === "Absent" ? "var(--red)" : "var(--text-muted)");
        statusHTML = `<div style="font-size:13px; margin-top:8px; font-weight:700; display:flex; align-items:center; gap:6px; color:${color};"><span class="icon-sm" style="color:${color}">${icon}</span> Marked ${entry.status}</div>`;
      }
    }
    const weightBadge = weight > 1 ? `<span class="credit-badge">${weight} credits</span>` : '';
    div.innerHTML = `<div style="display:flex; flex-direction:column; gap:4px; margin-bottom:10px;"><div style="display:flex; justify-content:space-between; align-items:flex-start;"><div class="lec-subject" style="margin:0; font-size:16px; font-weight:600; line-height:1.2;">${subject}</div><button class="note-btn" onclick="event.stopPropagation(); addNote('${subject}')" style="flex-shrink:0; margin-left:12px;">${ICONS.note}</button></div><div style="display:flex; gap:8px; align-items:center;"><span class="lec-time" style="margin:0;">${time}</span>${weightBadge}</div></div>${statusHTML}<div class="action-row" style="display:${locked ? 'none' : 'flex'}"><button class="btn-pill present" onclick="markAttendance('${subject}', '${time}', 'Present', ${weight})">Present</button><button class="btn-pill absent" onclick="markAttendance('${subject}', '${time}', 'Absent', ${weight})">Absent</button><button class="btn-pill cancelled" onclick="markAttendance('${subject}', '${time}', 'Cancelled', ${weight})">Off</button></div>`;
    container.appendChild(div);
  });
}

let currentNoteSubject = "";
function addNote(subject) { currentNoteSubject = subject; document.getElementById('noteSubjectDisplay').innerText = subject; document.getElementById('noteInput').value = ""; document.getElementById('noteModal').style.display = 'flex'; document.getElementById('noteInput').focus(); }
function closeNoteModal() { document.getElementById('noteModal').style.display = 'none'; }
document.getElementById('saveNoteBtn').onclick = function() { const text = document.getElementById('noteInput').value.trim(); if(text) { data.tasks.push({ id: Date.now(), text: text, subject: currentNoteSubject, date: dateKey, done: false }); save(); renderTasks(); showToast("Note Added"); closeNoteModal(); } else { showToast("Please enter text", "error"); } };

function renderTasks() {
    const container = document.getElementById("taskList"); const card = document.getElementById("taskCard"); container.innerHTML = ""; const activeTasks = data.tasks; 
    if(activeTasks.length === 0) { card.style.display = "none"; return; }
    card.style.display = "block";
    activeTasks.forEach((task, index) => { container.innerHTML += `<div class="task-item ${task.done ? 'task-done' : ''}" onclick="toggleTask(${index})"><div style="flex:1; margin-right:12px;"><div style="font-size:15px; font-weight:600; margin-bottom:4px; line-height:1.4;">${task.text}</div><div style="font-size:12px; font-weight:500; color:var(--text-muted);">${task.subject} • ${formatDateDDMMYYYY(task.date)}</div></div><button class="del-task-btn" onclick="deleteTask(event, ${index})">${ICONS.trash}</button></div>`; });
}
function toggleTask(index) { data.tasks[index].done = !data.tasks[index].done; save(); renderTasks(); }
function deleteTask(e, index) { e.stopPropagation(); showConfirm("Delete Note?", "This cannot be undone.", () => { data.tasks.splice(index, 1); save(); renderTasks(); }); }

function markAttendance(subject,time,status,weight=1){ const key = dateKey+"_"+subject+"_"+time; if(data.locks[key]) return; data.locks[key] = true; data.history[dateKey] ??= []; data.history[dateKey].push({subject,time,status,weight}); if(status !== "Cancelled"){ data.totals[subject] ??= {p:0,t:0}; data.totals[subject].t += weight; if(status==="Present") data.totals[subject].p += weight; } save(); render(); showToast(`Marked ${status}`); }
function markExtra(status){ const noExtraKey = dateKey + "_NO_EXTRA"; if(data.locks[noExtraKey]){ showToast("Locked for today", "error"); return; } const subject = document.getElementById("extraSubject").value; if(!subject) return; const key = dateKey+"_EXTRA_"+subject; if(data.locks[key]) return showToast("Already added", "error"); data.locks[key]=true; data.history[dateKey] ??= []; data.history[dateKey].push({subject,time:"Extra",status}); data.totals[subject] ??= {p:0,t:0}; data.totals[subject].t++; if(status==="Present") data.totals[subject].p++; save(); render(); showToast("Extra Class Added"); }

// --- CRYSTAL BALL LOGIC ---
let isPredictiveModeOn = false; let predictUntilDate = "";
function togglePredictiveMode() {
    isPredictiveModeOn = !isPredictiveModeOn; const btn = document.getElementById('crystalBallBtn'); const panel = document.getElementById('predictionPanel');
    if (isPredictiveModeOn) { btn.classList.add('active'); panel.classList.add('active'); const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); const input = document.getElementById('predictUntilDateInput'); input.min = tomorrow.toISOString().split('T')[0]; const semEnd = localStorage.getItem("sem_end_date"); if (semEnd) input.max = semEnd; } 
    else { btn.classList.remove('active'); panel.classList.remove('active'); predictUntilDate = ""; document.getElementById('predictUntilDateInput').value = ""; renderSummary(); }
}
function applyPrediction() {
    const inputDate = document.getElementById('predictUntilDateInput').value; if (!inputDate) return showToast("Please select a date", "error"); const todayStr = new Date().toISOString().split('T')[0]; if (inputDate <= todayStr) return showToast("Date must be in the future", "error");
    predictUntilDate = inputDate; renderSummary(); showToast("Prediction Applied", "success");
}
function getPredictedAbsences() {
    if (!isPredictiveModeOn || !predictUntilDate) return {}; const endDate = new Date(predictUntilDate); const cursor = new Date(); cursor.setDate(cursor.getDate() + 1); const predicted = {};
    while (cursor <= endDate) { const dStr = getStorageDateKey(cursor); if (!getHolidayForDate(dStr)) { const dayName = cursor.toLocaleDateString("en-US", { weekday: "long" }); if (!isWeekend(dayName)) { const lectures = timetable[dayName] || []; lectures.forEach(slot => { const sub = slot[1]; const w = getSlotWeight(slot); predicted[sub] = (predicted[sub] || 0) + w; }); } } cursor.setDate(cursor.getDate() + 1); }
    return predicted;
}
function getRemainingFutureSlots() {
    const semEndStr = localStorage.getItem("sem_end_date"); if (!semEndStr) return {}; const end = new Date(semEndStr); const cursor = new Date(); cursor.setDate(cursor.getDate() + 1); const subjectCounts = {};
    while (cursor <= end) { const dStr = getStorageDateKey(cursor); if (!getHolidayForDate(dStr)) { const dayName = cursor.toLocaleDateString("en-US", { weekday: "long" }); if (!isWeekend(dayName)) { const lectures = timetable[dayName] || []; lectures.forEach(slot => { const sub = slot[1]; const w = getSlotWeight(slot); if(!subjectCounts[sub]) subjectCounts[sub] = 0; subjectCounts[sub] += w; }); } } cursor.setDate(cursor.getDate() + 1); }
    return subjectCounts;
}

function renderSummary(){
  const div = document.getElementById("summary"); div.innerHTML = "";
  let tp = 0, tt = 0; const target = MIN_ATTENDANCE / 100; const futureSlots = getRemainingFutureSlots(); let totalRemaining = 0; Object.values(futureSlots).forEach(count => totalRemaining += count); const semEndDateExists = !!localStorage.getItem("sem_end_date");
  
  const predictedAbsences = getPredictedAbsences(); let totalPredictedAbsences = 0; Object.values(predictedAbsences).forEach(v => totalPredictedAbsences += v); const allSubjectsSet = new Set([...Object.keys(data.totals), ...Object.keys(predictedAbsences)]);

  let subjectListHTML = "";

  for(let s of allSubjectsSet){
    const orig = data.totals[s] || {p:0, t:0}; const predMissed = predictedAbsences[s] || 0; const p = orig.p; const t = orig.t + predMissed; 
    const percent = t ? Math.round((p / t) * 100) : 0; tp += p; tt += t;
    
    let gradient = "";
    if(percent >= MIN_ATTENDANCE) { gradient = "linear-gradient(90deg, #10b981 0%, #34d399 100%)"; } else if (percent >= (MIN_ATTENDANCE - 15)) { gradient = "linear-gradient(90deg, #84cc16 0%, #a3e635 100%)"; } else if (percent >= (MIN_ATTENDANCE - 25)) { gradient = "linear-gradient(90deg, #f97316 0%, #fb923c 100%)"; } else { gradient = "linear-gradient(90deg, #ef4444 0%, #f87171 100%)"; }
    
    let statusMsg = "", statusColor = "text-muted", statusIcon = "";
    let remaining = futureSlots[s] || 0; remaining = Math.max(0, remaining - predMissed);
    const maxPossibleP = p + remaining; const maxPossibleT = t + remaining; const maxPossiblePercent = maxPossibleT ? (maxPossibleP / maxPossibleT) : 0;
    
    if (t > 0) {
        if (percent >= MIN_ATTENDANCE) { const bunkable = Math.floor((p / target) - t); if(bunkable > 0){ statusMsg = `Safe to bunk <b>${bunkable}</b>`; statusColor = "text-green"; statusIcon = ICONS.check; } else { if(percent === 100){ statusMsg = `Perfect record`; statusColor = "text-green"; statusIcon = ICONS.check; } else { statusMsg = `Don't miss next`; statusColor = "text-yellow"; statusIcon = ICONS.x; } } } else { if (semEndDateExists && maxPossiblePercent < target) { statusMsg = `<b>Impossible</b> (Max: ${Math.round(maxPossiblePercent * 100)}%)`; statusColor = "text-red"; statusIcon = ICONS.x; } else { const needed = Math.ceil( (target * t - p) / (1 - target) ); statusMsg = `Attend next <b>${needed}</b>`; statusColor = "text-red"; statusIcon = ICONS.x; } }
    } else { statusMsg = "No data"; }

    let titleHTML = `<div style="display:flex; align-items:center; flex:1; min-width:0; margin-right:10px;"><span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${s}</span>`;
    if (predMissed > 0) { titleHTML += `<span class="predicted-badge" style="white-space:nowrap; flex-shrink:0;">-${predMissed}</span>`; }
    titleHTML += `</div>`;
    
    subjectListHTML += `<div class="summary-item" onclick="openSubjectDetail('${s}')"><div class="summary-header" style="align-items:center;">${titleHTML}<span style="color:var(--text-muted); font-weight:700; flex-shrink:0;">${p}/${t} <span style="color:var(--text-main); margin-left:4px;">${percent}%</span></span></div><div class="progress-track"><div class="progress-fill" style="width:${percent}%; background:${gradient}; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div></div><div class="status-msg ${statusColor}"><span class="icon-sm" style="display:inline-block; vertical-align:middle;">${statusIcon}</span>${statusMsg}</div></div>`;
  }
  
  const overall = tt ? Math.round((tp / tt) * 100) : 0; 
  let overallColor = "var(--green)";
  if (overall < 60) {
      overallColor = "var(--red)"; // Below 60: Danger
  } else if (overall < MIN_ATTENDANCE - 5) {
      overallColor = "var(--yellow)"; // e.g., 60 to 69: Warning (Orange/Yellow)
  } else if (overall < MIN_ATTENDANCE) {
      overallColor = "#84cc16"; // e.g., 70 to 74: Almost there (Yellow-Green)
  } else {
      overallColor = "var(--green)"; // Target hit: Safe
  }
  let overallMsg = ""; totalRemaining = Math.max(0, totalRemaining - totalPredictedAbsences);

  if(tt > 0) { if (overall < MIN_ATTENDANCE) { const overallMaxPossibleP = tp + totalRemaining; const overallMaxPossibleT = tt + totalRemaining; const overallMaxPercent = overallMaxPossibleT ? (overallMaxPossibleP / overallMaxPossibleT) : 0; if(semEndDateExists && overallMaxPercent < target) { overallMsg = `Impossible to reach ${MIN_ATTENDANCE}% (Max: ${Math.round(overallMaxPercent * 100)}%)`; } else { const overallNeeded = Math.ceil( (target * tt - tp) / (1 - target) ); overallMsg = `Attend next ${overallNeeded} classes to hit ${MIN_ATTENDANCE}%`; } } else { const overallBunk = Math.floor((tp / target) - tt); if(overallBunk > 0) overallMsg = `Can safely bunk ${overallBunk} classes`; else overallMsg = "Don't miss any upcoming classes"; } }
  else { overallMsg = "Start marking attendance to see insights."; }
  
  let predictWarning = (isPredictiveModeOn && predictUntilDate) ? `<div style="font-size:12px; color:#c084fc; margin-top:20px; font-weight:800; background: rgba(168, 85, 247, 0.1); padding: 10px 16px; border-radius: 12px; border: 1px dashed rgba(168, 85, 247, 0.4); text-transform:uppercase; letter-spacing:1px; width:100%; text-align:center;">🔮 Predicting Future</div>` : "";
  
  const radius = 64; const circumference = 2 * Math.PI * radius; const strokeDashoffset = circumference - (overall / 100) * circumference;

  const heroHTML = `
    <div class="overall-card">
        <div style="font-size:14px; color:var(--text-muted); text-transform:uppercase; letter-spacing:2px; font-weight:800;">Overall Progress</div>
        <div class="circular-progress-container">
            <svg class="circular-progress-svg" viewBox="0 0 160 160">
                <circle class="circular-bg" cx="80" cy="80" r="${radius}"></circle>
                <circle class="circular-fill" cx="80" cy="80" r="${radius}" style="stroke: ${overallColor}; stroke-dasharray: ${circumference}; stroke-dashoffset: ${strokeDashoffset}; filter: drop-shadow(0 0 8px ${overallColor}80);"></circle>
            </svg>
            <div class="circular-text-container"><div class="circular-percent" style="color:${overallColor}">${overall}%</div><div class="circular-label">${tp} / ${tt}</div></div>
        </div>
        <div style="font-size:15px; font-weight:600; color:var(--text-main); text-align:center; padding:0 10px;">${overallMsg}</div>
        ${predictWarning}
    </div>`;
  
  div.innerHTML = heroHTML + `<div style="margin-top:24px;">${subjectListHTML}</div>`;
}

function openSubjectDetail(subject) { const modal = document.getElementById('subjectDetailModal'); const title = document.getElementById('subjectDetailTitle'); const list = document.getElementById('subjectDetailList'); title.innerText = subject; list.innerHTML = ""; const dates = Object.keys(data.history).sort().reverse(); let found = false; dates.forEach(d => { data.history[d].forEach(entry => { if(entry.subject === subject) { found = true; let colorClass = entry.status === 'Present' ? 'text-green' : (entry.status === 'Cancelled' ? 'text-muted' : 'text-red'); list.innerHTML += `<div style="display:flex; justify-content:space-between; padding:16px 0; border-bottom:1px solid var(--border-color);"><div><div style="font-size:15px; font-weight:700;">${formatDateDDMMYYYY(d)}</div><div style="font-size:13px; font-weight:500; color:var(--text-muted); margin-top:4px;">${getDayName(d)}</div></div><div class="${colorClass}" style="font-weight:800; font-size:15px; display:flex; align-items:center;">${entry.status}</div></div>`; } }); }); if(!found) list.innerHTML = "<div style='text-align:center; color:var(--text-muted); font-weight:600; margin-top:30px;'>No history found.</div>"; modal.style.display = "flex"; }
function closeSubjectDetail() { document.getElementById('subjectDetailModal').style.display = "none"; }
function undo(d,i){ const h = data.history[d][i]; const key = d+"_"+h.subject+"_"+h.time; delete data.locks[key]; if(h.status!=="Cancelled"){ data.totals[h.subject].t--; if(h.status==="Present") data.totals[h.subject].p--; } data.history[d].splice(i,1); save(); render(); showToast("Entry Undone"); toggleUndo(); toggleUndo(); document.getElementById("undoSection").style.display="none"; }
function triggerReset(){ const modal = document.getElementById('passwordModal'); const input = document.getElementById('resetPasswordInput'); const btn = document.getElementById('submitPasswordBtn'); input.value = ""; modal.style.display = "flex"; input.focus(); btn.onclick = () => { if(input.value === USER_PIN) { closePasswordModal(); showConfirm("Factory Reset?", "All data will be lost permanently.", () => { localStorage.removeItem("attendance"); localStorage.removeItem("target_percent"); localStorage.removeItem("user_pin"); localStorage.removeItem("sem_start_date"); localStorage.removeItem("sem_end_date"); localStorage.removeItem("onboarding_done"); localStorage.removeItem("custom_timetable"); localStorage.removeItem("weekend_days"); location.reload(); }); } else { showToast("Wrong PIN", "error"); input.value = ""; input.focus(); } }; }
function getAllSubjects() { 
    const set = new Set(Object.keys(data.totals || {})); 
    Object.values(timetable).flat().forEach(x => set.add(x[1])); 
    return [...set].sort(); 
}
function addNewSubject() {
    const name = document.getElementById("newSettingsSubject").value.trim();
    if(!name) return showToast("Enter subject name", "error");
    if(data.totals[name]) return showToast("Subject already exists", "error");
    
    data.totals[name] = { p:0, t:0 };
    save();
    document.getElementById("newSettingsSubject").value = "";
    showToast("Subject Added");
    openSettings(); // Refresh all dropdowns automatically
}
function initExtra(){ const select = document.getElementById("extraSubject"); if (select.parentNode.classList.contains("custom-select-wrapper")) { const wrapper = select.parentNode; wrapper.parentNode.insertBefore(select, wrapper); wrapper.remove(); } select.innerHTML = getAllSubjects().map(s=>`<option>${s}</option>`).join(""); setupCustomSelects(); }

let pastBuffer = [], pastDateKey = "", pastDay = "";
function loadPastTimetable(){ const input = document.getElementById("pastDate"); const val = input.value; const container = document.getElementById("pastLectures"); const extraDiv = document.getElementById("pastExtra"); const semStart = localStorage.getItem("sem_start_date"); const semEnd = localStorage.getItem("sem_end_date"); const todayStr = new Date().toISOString().split('T')[0]; if(semStart) input.min = semStart; let maxDate = todayStr; if(semEnd && semEnd < todayStr) maxDate = semEnd; input.max = maxDate; container.innerHTML = ""; extraDiv.innerHTML = ""; pastBuffer = []; if(!val) return; if (val > maxDate) { showToast("Cannot edit future / beyond semester", "error"); input.value = ""; return; } pastDateKey = val; const selectedDate = new Date(val); pastDay = selectedDate.toLocaleDateString("en-US",{weekday:"long"}); const pastHoliday = getHolidayForDate(pastDateKey); if(pastHoliday) { container.innerHTML = `<div class="holiday-card"><div class="weekend-icon" style="color:#a78bfa;">${ICONS.star}</div><div class="weekend-title">${pastHoliday.name}</div><div style="font-size:14px; color:var(--text-muted);">Event/Holiday detected.</div></div>`; } else { let existingData = data.history[pastDateKey] || []; let isEditMode = existingData.length > 0; if(isEditMode) { showToast("Editing saved record ✏️"); pastBuffer = [...existingData]; } const lectures = timetable[pastDay] || []; if(lectures.length === 0){ container.innerHTML = "<div style='text-align:center; padding:20px; font-weight:600; color:var(--text-muted);'>No lectures scheduled 😴</div>"; } lectures.forEach(([time,subject])=>{ const div = document.createElement("div"); div.className = "card lecture-card"; div.style.marginBottom = "12px"; const savedState = existingData.find(h => h.subject === subject && h.time === time); const status = savedState ? savedState.status : ""; div.innerHTML = `<div style="font-weight:700; font-size:16px; margin-bottom:6px;">${subject}</div><div style="font-size:13px; font-weight:600; color:var(--text-muted); margin-bottom:12px;">${time}</div><div class="action-row" id="btns_${subject.replace(/\s/g,'')}"><button class="btn-pill ${status==='Present'?'present':'btn-secondary'}" onclick="pastMark('${subject}', '${time}', 'Present', this)">Present</button><button class="btn-pill ${status==='Absent'?'absent':'btn-secondary'}" onclick="pastMark('${subject}', '${time}', 'Absent', this)">Absent</button><button class="btn-pill ${status==='Cancelled'?'cancelled':'btn-secondary'}" onclick="pastMark('${subject}', '${time}', 'Cancelled', this)">Off</button></div>`; container.appendChild(div); }); } const existingExtras = (data.history[pastDateKey] || []).filter(h => h.time === "Extra"); let extraHTML = ""; if(existingExtras.length > 0) { existingExtras.forEach(ex => { extraHTML += `<div class="task-item" style="margin-bottom:8px;"><span><span style="font-weight:600;">${ex.subject}</span> <span style="font-size:12px; color:var(--text-muted);">(Extra)</span></span> <div style="display:flex; align-items:center; gap:12px;"><span class="${ex.status==='Present'?'text-green':'text-red'}" style="font-weight:700;">${ex.status}</span><button class="del-task-btn" onclick="removePastExtra('${ex.subject}')">×</button></div></div>`; }); } const allSubjects = getAllSubjects(); extraDiv.innerHTML = `<div style="height:1px; background:var(--border-color); margin:20px 0;"></div><div id="existingExtrasList">${extraHTML}</div><h4 style='margin:16px 0 12px 0; font-size:15px; font-weight:700;'>➕ Add Extra Class</h4><select id="pastExtraSubject" class="custom-select-source">${allSubjects.map(s=>`<option>${s}</option>`).join("")}</select><div class="action-row"><button class="btn-pill btn-secondary" onclick="addPastExtra('Present')">Present</button><button class="btn-pill btn-secondary" onclick="addPastExtra('Absent')">Absent</button></div>`; setupCustomSelects(); }
function pastMark(sub, time, stat, btn){ pastBuffer = pastBuffer.filter(x => !(x.subject === sub && x.time === time)); pastBuffer.push({ subject: sub, time: time, status: stat }); const parent = btn.parentElement; parent.querySelectorAll('.btn-pill').forEach(b => { b.className = 'btn-pill btn-secondary'; }); let activeClass = stat === "Present" ? "present" : (stat === "Absent" ? "absent" : "cancelled"); btn.className = `btn-pill ${activeClass}`; }
function addPastExtra(status){ const subject = document.getElementById("pastExtraSubject").value; if(pastBuffer.find(x=>x.subject===subject && x.time==="Extra")){ showToast("Already in list", "error"); return; } pastBuffer.push({subject, time:"Extra", status}); const list = document.getElementById("existingExtrasList"); list.innerHTML += `<div class="task-item" style="margin-bottom:8px;"><span><span style="font-weight:600;">${subject}</span> <span style="font-size:12px; color:var(--text-muted);">(Extra)</span></span> <span class="${status==='Present'?'text-green':'text-red'}" style="font-weight:700;">${status}</span></div>`; }
function removePastExtra(subject){ pastBuffer = pastBuffer.filter(x => !(x.subject === subject && x.time === "Extra")); loadPastTimetable(); }
function savePastAttendance(){ if(!pastDateKey){ showToast("Select a date", "error"); return; } if(pastBuffer.length === 0){ showToast("No data to save", "error"); return; } if(data.history[pastDateKey]) { data.history[pastDateKey].forEach(oldEntry => { if(oldEntry.status !== "Cancelled" && data.totals[oldEntry.subject]){ data.totals[oldEntry.subject].t--; if(oldEntry.status === "Present") data.totals[oldEntry.subject].p--; } }); } data.history[pastDateKey] = pastBuffer; pastBuffer.forEach(h => { if(h.status !== "Cancelled"){ data.totals[h.subject] ??= {p:0,t:0}; data.totals[h.subject].t++; if(h.status === "Present") data.totals[h.subject].p++; } const lockKey = pastDateKey + "_" + h.subject + "_" + h.time; data.locks[lockKey] = true; }); save(); render(); showToast("History Updated ✅"); document.getElementById("pastDate").value = ""; document.getElementById("pastLectures").innerHTML = ""; document.getElementById("pastExtra").innerHTML = ""; }

function toggleUndo(){ const sec = document.getElementById("undoSection"); sec.style.display = (sec.style.display === "none" || sec.style.display === "") ? "block" : "none"; if(sec.style.display === "block"){ sec.innerHTML = ""; if(!data.history[dateKey] || data.history[dateKey].length === 0){ sec.innerHTML = "<div style='text-align:center; color:var(--text-muted); font-size:14px; font-weight:600;'>Nothing to undo today 😴</div>"; return; } data.history[dateKey].forEach((h,i)=>{ sec.innerHTML += `<div class="task-item"><span><span style="font-weight:600;">${h.subject}</span> <span style="font-size:13px; color:var(--text-muted); margin-left:6px;">(${h.status})</span></span> <button class="del-task-btn" onclick="event.stopPropagation(); undo('${dateKey}',${i})">${ICONS.undo}</button></div>`; }); } }
function lockNoExtra(){ const key = dateKey + "_NO_EXTRA"; if(data.locks[key]) return; data.locks[key] = true; save(); render(); showToast("Locked for today"); }
function getDayName(dateStr){ const d = new Date(dateStr + "T00:00:00"); return isNaN(d) ? "" : d.toLocaleDateString("en-US", { weekday: "long" }); }
function formatDateDDMMYYYY(isoDate){ if(!isoDate) return ""; const [y, m, d] = isoDate.split("-"); return `${d}/${m}/${y}`; }
function showWeekendMessage(day){ 
    const statusDiv = document.getElementById("dayStatus"); 
    
    // If there's a holiday, we don't show the weekend message (holiday overrides it)
    if (getHolidayForDate(dateKey)) { 
        statusDiv.innerHTML = ""; 
        return; 
    } 
    
    // If it's a weekend, show the beautiful new breathing cup!
    if(isWeekend(day)){ 
        statusDiv.innerHTML = `
        <div class="holiday-card" style="border-color: rgba(212, 163, 115, 0.4);">
            <svg viewBox="0 0 100 100" style="width: 80px; height: 80px; margin-bottom: 16px; overflow: visible;">
              <defs>
                <linearGradient id="cupBodyGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#f5d9a8"/><stop offset="100%" stop-color="#c8894a"/>
                </linearGradient>
                <linearGradient id="liquidGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="#6b2f0a"/><stop offset="100%" stop-color="#3b1505"/>
                </linearGradient>
                <linearGradient id="saucerGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="#c8894a"/><stop offset="100%" stop-color="#7a4c1e"/>
                </linearGradient>
              </defs>
              <style>
                @keyframes cupFloat2{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
                @keyframes steamUp2{0%{opacity:0;transform:translateY(0)}40%{opacity:0.7}100%{opacity:0;transform:translateY(-18px)}}
                .cup-float2{animation:cupFloat2 3.5s ease-in-out infinite}
                .ws1{animation:steamUp2 2.2s ease-in-out infinite}
                .ws2{animation:steamUp2 2.2s ease-in-out infinite 0.7s}
                .ws3{animation:steamUp2 2.2s ease-in-out infinite 1.4s}
              </style>
              <ellipse cx="50" cy="80" rx="28" ry="7" fill="url(#saucerGrad2)" opacity="0.9"/>
              <ellipse cx="50" cy="78" rx="20" ry="4" fill="#5a3010" opacity="0.6"/>
              <g class="cup-float2">
                <path d="M28 48 Q27 72 50 74 Q73 72 72 48 Z" fill="url(#cupBodyGrad2)"/>
                <ellipse cx="50" cy="48" rx="22" ry="6" fill="#e8b87a"/>
                <ellipse cx="50" cy="48" rx="19" ry="5" fill="url(#liquidGrad2)"/>
                <ellipse cx="44" cy="47" rx="6" ry="2" fill="white" opacity="0.12" transform="rotate(-10 44 47)"/>
                <path d="M72 54 Q88 54 88 63 Q88 72 72 68" fill="none" stroke="url(#cupBodyGrad2)" stroke-width="7" stroke-linecap="round"/>
                <path d="M72 54 Q85 55 85 63 Q85 71 72 68" fill="none" stroke="#e8b87a" stroke-width="2.5" stroke-linecap="round" opacity="0.5"/>
                <path d="M33 52 Q32 66 38 71" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" opacity="0.18"/>
                <path class="ws1" d="M42 44 Q39 38 42 32" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" opacity="0.5"/>
                <path class="ws2" d="M50 43 Q47 36 50 29" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" opacity="0.55"/>
                <path class="ws3" d="M58 44 Q61 37 58 31" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" opacity="0.5"/>
              </g>
            </svg>
            <div class="weekend-title">It's the Weekend</div>
            <div style="font-size:14px; color:var(--text-muted); font-weight:500;">Take a break, no lectures today!</div>
        </div>`; 
    } else { 
        statusDiv.innerHTML = ""; 
    } 
}

function renderDetailView(){ const mode = document.getElementById("viewMode").value; const filter = document.getElementById("filterArea"); const result = document.getElementById("detailResult"); filter.innerHTML = ""; result.innerHTML = ""; if(mode === "date"){ const dates = Object.keys(data.history).sort().reverse(); if(!dates.length){ result.innerText = "No data yet"; return; } filter.innerHTML = `<select id="dateSelect" class="custom-select-source" onchange="showDateWise()"><option value="">Select Date</option>${dates.map(d=>`<option value="${d}">${formatDateDDMMYYYY(d)}</option>`).join("")}</select>`; setupCustomSelects(); } if(mode === "subject"){ const subjects = Object.keys(data.totals).sort(); if(!subjects.length){ result.innerText = "No data yet"; return; } filter.innerHTML = `<select id="subjectSelect" class="custom-select-source" onchange="showSubjectWise()"><option value="">Select Subject</option>${subjects.map(s=>`<option value="${s}">${s}</option>`).join("")}</select>`; setupCustomSelects(); } }
function showDateWise(){ const d = document.getElementById("dateSelect").value; if(!d || !data.history[d]) return; const result = document.getElementById("detailResult"); result.innerHTML = `<div style="margin-bottom:16px; font-weight:800; font-size:16px; color:var(--text-main);">${formatDateDDMMYYYY(d)} <span style="color:var(--text-muted); font-size:14px; font-weight:600;">(${getDayName(d)})</span></div>`; data.history[d].forEach(h=>{ let colorClass = h.status === 'Present' ? 'text-green' : (h.status === 'Cancelled' ? 'text-muted' : 'text-red'); let leftColor = h.status === 'Present' ? 'var(--green)' : (h.status === 'Cancelled' ? 'var(--text-muted)' : 'var(--red)'); result.innerHTML += `<div class="task-item" style="border-left:3px solid ${leftColor}; border-right:none; border-top:1px solid var(--border-color); border-bottom:1px solid var(--border-color); background:transparent; padding:12px 14px; border-radius:0; margin-bottom:0;"><div style="flex:1; min-width:0; margin-right:12px;"><div style="font-weight:700; color:var(--text-main); font-size:15px;">${h.subject}</div><div style="font-size:12px; font-weight:600; color:var(--text-muted); margin-top:4px;">${h.time}</div></div><span class="${colorClass}" style="font-weight:800; flex-shrink:0;">${h.status}</span></div>`; }); }
function showSubjectWise(){ const sub = document.getElementById("subjectSelect").value; if(!sub) return; const result = document.getElementById("detailResult"); result.innerHTML = ""; Object.keys(data.history).sort().reverse().forEach(d=>{ data.history[d].forEach(h=>{ if(h.subject === sub){ let colorClass = h.status === 'Present' ? 'text-green' : (h.status === 'Cancelled' ? 'text-muted' : 'text-red'); let leftColor = h.status === 'Present' ? 'var(--green)' : (h.status === 'Cancelled' ? 'var(--text-muted)' : 'var(--red)'); result.innerHTML += `<div class="task-item" style="border-left:3px solid ${leftColor}; border-right:none; border-top:1px solid var(--border-color); border-bottom:1px solid var(--border-color); background:transparent; padding:12px 14px; border-radius:0; margin-bottom:0;"><div style="flex:1; min-width:0; margin-right:12px;"><span style="font-weight:700; color:var(--text-main); font-size:15px;">${formatDateDDMMYYYY(d)}</span><div style="font-size:12px; font-weight:600; color:var(--text-muted); margin-top:4px;">${getDayName(d)}</div></div><span class="${colorClass}" style="font-weight:800; flex-shrink:0;">${h.status}</span></div>`; } }); }); }
function exportBackup(){ const backup = { version: 15, timestamp: new Date().toISOString(), data: data }; const blob = new Blob([JSON.stringify(backup, null, 2)],{ type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `attendance_backup_${dateKey}.json`; a.click(); URL.revokeObjectURL(a.href); showToast("Backup Downloaded"); }
document.getElementById("importFile").addEventListener("change", function(e){ const file = e.target.files[0]; if(!file) return; const reader = new FileReader(); reader.onload = function(){ try { const backup = JSON.parse(reader.result); if (!backup.data || typeof backup.data.history !== 'object' || typeof backup.data.totals !== 'object') { throw new Error("Invalid file structure"); } showConfirm("Overwrite Data?", "This will replace all current data.", () => { data = backup.data; if(!data.tasks) data.tasks = []; if(!data.history) data.history = {}; if(!data.totals) data.totals = {}; if(!data.locks) data.locks = {}; if(!data.holidays) data.holidays = []; save(); render(); showToast("Restored successfully"); }); } catch(err) { console.error(err); showToast("Invalid/Corrupt Backup File", "error"); } e.target.value = ''; }; reader.readAsText(file); });

const modal = document.getElementById("settingsModal");
function saveSettings() {
    const nameVal = document.getElementById("settingStudentName").value.trim();
    if(nameVal) localStorage.setItem("student_name", nameVal);
    const input = document.getElementById("targetInput"); const val = parseInt(input.value); if (!val || val < 1 || val > 100) { showToast("Target must be 1-100%", "error"); return; } MIN_ATTENDANCE = val; localStorage.setItem("target_percent", val);
    const startVal = document.getElementById("semStartInput").value; localStorage.setItem("sem_start_date", startVal); const endVal = document.getElementById("semEndInput").value; localStorage.setItem("sem_end_date", endVal);
    // Save weekend days from chips
    const newWeekends = [];
    if(document.getElementById("settingWkSun") && document.getElementById("settingWkSun").classList.contains("active")) newWeekends.push("Sunday");
    if(document.getElementById("settingWkSat") && document.getElementById("settingWkSat").classList.contains("active")) newWeekends.push("Saturday");
    if(document.getElementById("settingWkFri") && document.getElementById("settingWkFri").classList.contains("active")) newWeekends.push("Friday");
    localStorage.setItem("weekend_days", JSON.stringify(newWeekends));
    WEEKEND_DAYS = newWeekends;
    const pastInput = document.getElementById("pastDate"); const todayStr = new Date().toISOString().split('T')[0]; if(pastInput) { if(startVal) pastInput.min = startVal; let maxDate = todayStr; if(endVal && endVal < todayStr) maxDate = endVal; pastInput.max = maxDate; }
    // BUG 5 FIX: Apply instantly — no reload needed
    closeSettings();
    render();
    renderChart();
    showToast("Preferences Saved ✓");
}
function openSettings() { 
    modal.style.display = "flex"; document.getElementById("targetInput").value = MIN_ATTENDANCE; document.getElementById("semStartInput").value = localStorage.getItem("sem_start_date") || ""; document.getElementById("semEndInput").value = localStorage.getItem("sem_end_date") || ""; document.getElementById("editDaySelect").value = day; 
    // Load weekend chips
    document.getElementById("settingStudentName").value = localStorage.getItem("student_name") || "";
    const savedWeekends = JSON.parse(localStorage.getItem("weekend_days") || '["Sunday"]');
    ["Sunday","Saturday","Friday"].forEach(d => {
        const chip = document.getElementById("settingWk" + d.slice(0,3));
        if(chip) chip.classList.toggle('active', savedWeekends.includes(d));
    });
    const renameSelect = document.getElementById("renameOldSubject"); if (renameSelect.parentNode.classList.contains("custom-select-wrapper")) { const wrapper = renameSelect.parentNode; wrapper.parentNode.insertBefore(renameSelect, wrapper); wrapper.remove(); } const subjectList = getAllSubjects(); renameSelect.innerHTML = subjectList.map(s => `<option value="${s}">${s}</option>`).join("");
    renderSettingsCalendar(); renderHolidays(); renderEditRows(); setupCustomSelects(); 
}
function closeSettings() { modal.style.display = "none"; }
function renameSubject() { const oldName = document.getElementById("renameOldSubject").value; const newName = document.getElementById("renameNewName").value.trim(); if(!oldName || !newName) return showToast("Enter new name", "error"); if(oldName === newName) return showToast("Names are same", "error"); showConfirm("Rename / Merge?", `This will change '${oldName}' to '${newName}' in all history and timetable.`, () => { if(!data.totals[newName]) data.totals[newName] = { p:0, t:0 }; if(data.totals[oldName]) { data.totals[newName].p += data.totals[oldName].p; data.totals[newName].t += data.totals[oldName].t; delete data.totals[oldName]; } Object.keys(data.history).forEach(date => { data.history[date].forEach(entry => { if(entry.subject === oldName) entry.subject = newName; }); Object.keys(data.locks).forEach(lockKey => { if(lockKey.includes(`_${oldName}_`)) { data.locks[lockKey.replace(`_${oldName}_`, `_${newName}_`)] = true; delete data.locks[lockKey]; } }); }); data.tasks.forEach(t => { if(t.subject === oldName) t.subject = newName; }); Object.keys(timetable).forEach(d => { timetable[d].forEach(slot => { if(slot[1] === oldName) slot[1] = newName; }); }); localStorage.setItem("custom_timetable", JSON.stringify(timetable)); save(); document.getElementById("renameNewName").value = ""; showToast("Renamed successfully ✓"); render(); openSettings(); }); }
function setNewPin() { const pin = document.getElementById("newPinInput").value; if(pin.length !== 4 || isNaN(pin)) return showToast("Enter 4-digit PIN", "error"); USER_PIN = pin; localStorage.setItem("user_pin", pin); document.getElementById("newPinInput").value = ""; showToast("Security PIN Updated"); }
function renderEditRows() { 
    const selectedDay = document.getElementById("editDaySelect").value; 
    const container = document.getElementById("editContainer"); 
    container.innerHTML = ""; 
    const existingSubjects = getAllSubjects(); 
    const lectures = timetable[selectedDay] || []; 
    
    lectures.forEach((lec, index) => { 
        const weight = lec[2] || 1; 
        
        // Build dropdown options dynamically
        let optionsHTML = existingSubjects.map(s => `<option value="${s}" ${s === lec[1] ? 'selected' : ''}>${s}</option>`).join("");
        if (!existingSubjects.includes(lec[1])) {
            optionsHTML += `<option value="${lec[1]}" selected hidden>${lec[1]}</option>`;
        }

        container.innerHTML += `
        <div class="edit-row" style="display:flex; flex-direction:column; gap:12px; margin-bottom:16px; background: rgba(255,255,255,0.02); padding: 16px; border-radius: 20px; border: 1px solid var(--border-color);">
            
            <div style="display:flex; gap:10px; align-items: center; width: 100%;">
                <div style="flex:1; min-width:0;"> <select class="custom-select-source" id="sub_${index}" style="width: 100%; margin-bottom: 0;">
                        ${optionsHTML}
                    </select>
                </div>
                <button style="background:var(--red-glow); color:var(--red); border:none; border-radius:14px; width:46px; height:46px; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:0.2s; padding:0;" onclick="delEditRow(${index})">${ICONS.trash}</button>
            </div>

            <div style="display:flex; gap:10px; align-items: center; width: 100%;">
               <input type="text" style="flex:1; margin-bottom:0; font-size:14px; padding: 12px; cursor: pointer; text-align: center; background: var(--bg-color); border: 1px solid var(--border-color); border-radius: 12px; color: white;" value="${lec[0]}" id="time_${index}" placeholder="Tap to set time" readonly onclick="openTimePicker('settings', ${index}, null, this.value)">
               
               <div style="display:flex; align-items:center; gap:6px; background: var(--bg-color); padding: 0 12px; border-radius: 12px; border: 1px solid var(--border-color); height: 46px;">
                    <span style="font-size:12px; font-weight:700; color:var(--text-muted);">Cr:</span>
                    <input type="number" style="width:40px; margin-bottom:0; font-size:14px; font-weight:700; padding:0; text-align:center; background:transparent; border:none; color:white; outline:none; height: 100%;" value="${weight}" id="wt_${index}" min="1" max="10">
               </div>
            </div>

        </div>`; 
    });
    
    // Re-initialize the custom dropdowns for the new rows
    setupCustomSelects();
}
function addEditRow() { 
    const selectedDay = document.getElementById("editDaySelect").value; 
    timetable[selectedDay] ??= []; 
    const defaultSub = getAllSubjects()[0] || "New Subject";
    timetable[selectedDay].push(["00:00-00:00", defaultSub]); 
    renderEditRows(); 
}
function delEditRow(index) { const selectedDay = document.getElementById("editDaySelect").value; timetable[selectedDay].splice(index, 1); renderEditRows(); }
function saveNewTimetable() { const selectedDay = document.getElementById("editDaySelect").value; const container = document.getElementById("editContainer"); const rows = container.querySelectorAll(".edit-row"); const newDaySchedule = []; rows.forEach((row, index) => { const t = document.getElementById(`time_${index}`).value; const s = document.getElementById(`sub_${index}`)?.value?.trim() || (row.querySelector('.custom-select-trigger span')?.innerText?.trim()) || ''; const w = parseInt(document.getElementById(`wt_${index}`)?.value) || 1; if(t && s) newDaySchedule.push([t, s, w > 1 ? w : undefined].filter(x => x !== undefined)); }); timetable[selectedDay] = newDaySchedule; localStorage.setItem("custom_timetable", JSON.stringify(timetable)); showToast(`Saved ${selectedDay} ✓`); render(); renderEditRows(); }

let chartInstance = null;
function renderChart() {
  const dates = Object.keys(data.history).sort(); let currentP = 0, currentT = 0; for(let s in data.totals){ currentP += data.totals[s].p; currentT += data.totals[s].t; } const chartData = []; const chartLabels = []; let tempP = currentP; let tempT = currentT; if(tempT > 0) { chartData.push(Math.round((tempP/tempT)*100)); chartLabels.push(formatDateDDMMYYYY(dateKey).slice(0,5)); } const relevantDates = dates.filter(d => d !== dateKey).reverse().slice(0, 30); relevantDates.forEach(d => { const dayEvents = data.history[d]; dayEvents.forEach(evt => { if(evt.status !== "Cancelled"){ tempT--; if(evt.status === "Present") tempP--; } }); if(tempT > 0) { chartData.push(Math.round((tempP/tempT)*100)); chartLabels.push(formatDateDDMMYYYY(d).slice(0,5)); } }); chartData.reverse(); chartLabels.reverse();
  const ctx = document.getElementById('attendanceChart'); if(!ctx) return; if(chartInstance) chartInstance.destroy();
  const glowPlugin = { id: 'glow', beforeDraw: (chart) => { const ctx = chart.ctx; ctx.save(); ctx.shadowColor = 'rgba(59, 130, 246, 0.4)'; ctx.shadowBlur = 15; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 4; }, afterDraw: (chart) => { chart.ctx.restore(); } };
  chartInstance = new Chart(ctx, { type: 'line', data: { labels: chartLabels, datasets: [{ label: 'Overall %', data: chartData, borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderWidth: 3, tension: 0.4, pointRadius: 0, pointHitRadius: 20, fill: true }] }, plugins: [glowPlugin], options: { responsive: true, maintainAspectRatio: false, layout: { padding: { top: 10, right: 10, left: 10, bottom: 10 } }, interaction: { mode: 'index', intersect: false }, scales: { y: { beginAtZero: true, min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false }, ticks: { color: '#a1a1aa', font: { family: "'Plus Jakarta Sans', sans-serif", weight: '600' } } }, x: { grid: { display: false, drawBorder: false }, ticks: { color: '#a1a1aa', maxTicksLimit: 6, font: { family: "'Plus Jakarta Sans', sans-serif", weight: '600' } } } }, plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(11, 15, 25, 0.95)', titleColor: '#f4f4f5', bodyColor: '#3b82f6', titleFont: { family: "'Plus Jakarta Sans'", size: 13 }, bodyFont: { family: "'Plus Jakarta Sans'", size: 14, weight: 'bold' }, padding: 12, cornerRadius: 12, displayColors: false, borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, callbacks: { title: (items) => items[0]?.label || '', label: (item) => `${item.raw}% attendance` } } } } });
}

let currentCalendarDate = new Date();
function changeMonth(delta) { currentCalendarDate.setMonth(currentCalendarDate.getMonth() + delta); renderCalendar(); }
function renderCalendar() {
    const grid = document.getElementById('calendarGrid'); grid.innerHTML = ""; const year = currentCalendarDate.getFullYear(); const month = currentCalendarDate.getMonth(); const firstDay = new Date(year, month, 1); const lastDay = new Date(year, month + 1, 0); const totalDays = lastDay.getDate(); let startDayIndex = firstDay.getDay(); startDayIndex = (startDayIndex === 0) ? 6 : startDayIndex - 1; 
    document.getElementById('calMonthYear').innerText = `${new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' })}`;
    for(let i=0; i<startDayIndex; i++) { const empty = document.createElement('div'); grid.appendChild(empty); }
    const todayStr = new Date().toISOString().split('T')[0];
    for(let i=1; i<=totalDays; i++) {
        const dateObj = new Date(year, month, i); const yStr = dateObj.getFullYear(); const mStr = String(dateObj.getMonth() + 1).padStart(2,'0'); const dStr = String(dateObj.getDate()).padStart(2,'0'); const key = `${yStr}-${mStr}-${dStr}`;
        const dayEl = document.createElement('div'); dayEl.className = 'cal-day'; if(key === todayStr) dayEl.classList.add('today'); dayEl.innerText = i;
        const holiday = getHolidayForDate(key);
        let dotColor = null;
        if (holiday) { if(holiday.type === 'exam') dotColor = 'orange'; else if(holiday.type === 'off') dotColor = 'green'; else dotColor = 'purple';
        } else if (data.history[key] && data.history[key].length > 0) { const history = data.history[key]; const anyAbsent = history.some(h => h.status === 'Absent'); const allCancelled = history.every(h => h.status === 'Cancelled'); if (anyAbsent) dotColor = 'red'; else if (!allCancelled) dotColor = 'green'; }
        if(dotColor) { const dot = document.createElement('div'); dot.className = `dot ${dotColor}`; dayEl.appendChild(dot); }
        dayEl.onclick = () => showCalendarDetail(key, i); grid.appendChild(dayEl);
    }
}

function showCalendarDetail(key, dayNum) {
    const detail = document.getElementById('calendarDetail'); detail.style.display = 'block';
    document.querySelectorAll('.cal-day').forEach(d => { d.classList.remove('selected'); if(d.innerText == dayNum) d.classList.add('selected'); });
    let content = `<div style="font-weight:800; font-size:16px; margin-bottom:12px; color:var(--text-main);">${formatDateDDMMYYYY(key)}</div>`;
    const holiday = getHolidayForDate(key);
    if(holiday) {
        let label = "Holiday"; let color = "#a78bfa";
        if(holiday.type === 'exam') { label = "Exam"; color = "#fbbf24"; }
        if(holiday.type === 'off') { label = "Off"; color = "#a1a1aa"; }
        content += `<span style="color:${color}; font-weight:700; background:rgba(255,255,255,0.05); padding:6px 12px; border-radius:8px;">🎉 ${label}: ${holiday.name}</span>`;
    } else if (data.history[key]) {
        data.history[key].forEach(h => { let color = h.status === 'Present' ? 'var(--green)' : (h.status === 'Absent' ? 'var(--red)' : 'var(--text-muted)'); content += `<div style="margin-top:8px; display:flex; justify-content:space-between; align-items:center;"><span style="font-weight:600; font-size:15px;">${h.subject}</span><span style="color:${color}; font-weight:800; font-size:15px;">${h.status}</span></div>`; });
    } else { const dObj = new Date(key); if(dObj.getDay() === 0 || dObj.getDay() === 6) content += `<span style="color:var(--text-muted); font-weight:600;">Weekend (No classes)</span>`; else content += `<span style="color:var(--text-muted); font-weight:600;">No data recorded</span>`; }
    detail.innerHTML = content;
}

// --- PDF GENERATION LOGIC ---
async function generatePDFReport() {
    if (!window.jspdf) { showToast("PDF Library loading, try again in a second", "error"); return; }
    showToast("Generating PDF...");
    const { jsPDF } = window.jspdf; const doc = new jsPDF();

    doc.setFontSize(22); doc.setTextColor(15, 23, 42); doc.text("Attendance Pro - Academic Report", 14, 20);
    doc.setFontSize(11); doc.setTextColor(100); const generatedDate = new Date().toLocaleDateString(); let savedName = localStorage.getItem("student_name"); let userNameText = "User: Student Profile"; if (savedName) {
    // Priority 1: Use the custom name they typed in Onboarding/Settings
    userNameText = `Student: ${savedName}`;
} else if (typeof currentUser !== 'undefined' && currentUser && currentUser.displayName) { 
    // Priority 2: Use their Google Cloud Sync name
    userNameText = `User: ${currentUser.displayName}`; 
}
    
    doc.text(userNameText, 14, 30); doc.text(`Generated on: ${generatedDate}`, 14, 36); doc.text(`Target Attendance: ${MIN_ATTENDANCE}%`, 14, 42);
    doc.setFontSize(14); doc.setTextColor(15, 23, 42); doc.text("Subject Summary", 14, 55);

    const summaryBody = []; let tp = 0, tt = 0;
    for (let s in data.totals) { const { p, t } = data.totals[s]; const percent = t ? Math.round((p / t) * 100) : 0; tp += p; tt += t; let status = percent >= MIN_ATTENDANCE ? "Safe" : "Low"; summaryBody.push([s, p.toString(), t.toString(), `${percent}%`, status]); }
    const overall = tt ? Math.round((tp / tt) * 100) : 0; summaryBody.push(["OVERALL TOTAL", tp.toString(), tt.toString(), `${overall}%`, overall >= MIN_ATTENDANCE ? "Safe" : "Low"]);

    doc.autoTable({ startY: 60, head: [['Subject', 'Present', 'Total', 'Percentage', 'Status']], body: summaryBody, theme: 'striped', headStyles: { fillColor: [15, 23, 42] }, alternateRowStyles: { fillColor: [241, 245, 249] }, willDrawCell: function (data) { if (data.section === 'body' && data.column.index === 4) { if (data.cell.raw === 'Safe') doc.setTextColor(16, 185, 129); else if (data.cell.raw === 'Low') doc.setTextColor(239, 68, 68); doc.setFont(undefined, 'bold'); } if (data.section === 'body' && data.row.index === summaryBody.length - 1) { doc.setFont(undefined, 'bold'); } } });

    let finalY = doc.lastAutoTable.finalY + 15; doc.setFontSize(14); doc.setTextColor(15, 23, 42); doc.text("Detailed Attendance Log", 14, finalY);

    const logBody = []; const dates = Object.keys(data.history).sort((a, b) => new Date(a) - new Date(b));
    dates.forEach(d => { const dayName = getDayName(d); const dateStr = formatDateDDMMYYYY(d); data.history[d].forEach(entry => { logBody.push([dateStr, dayName, entry.subject, entry.time, entry.status]); }); });
    if (logBody.length === 0) { logBody.push(["No data recorded yet.", "", "", "", ""]); }

    doc.autoTable({ startY: finalY + 5, head: [['Date', 'Day', 'Subject', 'Time', 'Status']], body: logBody, theme: 'grid', headStyles: { fillColor: [59, 130, 246] }, styles: { fontSize: 10 }, willDrawCell: function (data) { if (data.section === 'body' && data.column.index === 4) { if (data.cell.raw === 'Present') doc.setTextColor(16, 185, 129); else if (data.cell.raw === 'Absent') doc.setTextColor(239, 68, 68); else doc.setTextColor(148, 163, 184); doc.setFont(undefined, 'bold'); } } });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) { doc.setPage(i); doc.setFontSize(9); doc.setTextColor(150); doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' }); }
    doc.save(`Attendance_Report_${dateKey}.pdf`); showToast("PDF Downloaded!");
}

function render(){ showWeekendMessage(day); document.getElementById("today").innerText = `${day}, ${formatDateDDMMYYYY(dateKey)}`; loadLectures(); renderSummary(); renderTasks(); renderChart(); const noExtraKey = dateKey + "_NO_EXTRA"; if(data.locks[noExtraKey]){ document.getElementById("extraSubject").disabled = true; document.querySelectorAll(".card button").forEach(btn=>{ if(btn.innerText.includes("Present") || btn.innerText.includes("Absent") || btn.innerText.includes("Off")){ btn.disabled = true; } }); document.getElementById("extraInfo").innerText = "✔ No extra lectures today"; } }
window.onload = function() { const splash = document.getElementById('app-splash'); setTimeout(() => { splash.style.opacity = '0'; splash.style.visibility = 'hidden'; if (isFirstRun()) { launchOnboarding(); } else { render(); } }, 1500); initExtra(); };

// ============================================================
// TIME PICKER POPUP LOGIC
// ============================================================
let timePickerContext = { mode: null, day: null, index: null }; // Tracks where the time is being edited

function openTimePicker(mode, index, day = null, currentValue = "") {
    timePickerContext = { mode, index, day };
    
    let start = "09:00";
    let end = "10:00";
    
    if (currentValue && currentValue.includes("-")) {
        const parts = currentValue.split("-");
        if (parts[0]) start = parts[0].trim();
        if (parts[1]) end = parts[1].trim();
    }

    document.getElementById('tpStartTime').value = start;
    document.getElementById('tpEndTime').value = end;
    document.getElementById('timePickerModal').style.display = 'flex';
}

function closeTimePicker() {
    document.getElementById('timePickerModal').style.display = 'none';
}

function saveTimePicker() {
    const start = document.getElementById('tpStartTime').value;
    const end = document.getElementById('tpEndTime').value;
    const formattedTime = `${start}-${end}`;

    if (timePickerContext.mode === 'settings') {
        // Update Timetable Editor UI
        const input = document.getElementById(`time_${timePickerContext.index}`);
        if(input) input.value = formattedTime;
    } else if (timePickerContext.mode === 'onboarding') {
        // Update Onboarding State and Re-render
        updateObSlot(timePickerContext.day, timePickerContext.index, 0, formattedTime);
        buildObTimetableUI();
    }
    closeTimePicker(); 
}