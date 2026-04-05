// ============================================================
//  ATTENDANCE.JS — Home View, Marking, Summary & Prediction
// ============================================================

// --- HOME TAB RENDER ---
function render() {
    showWeekendMessage(day);
    document.getElementById("today").innerText = `${day}, ${formatDateDDMMYYYY(dateKey)}`;
    loadLectures();
    renderSummary();
    renderTasks();
    renderChart();

    const noExtraKey = dateKey + "_NO_EXTRA";
    if (data.locks[noExtraKey]) {
        document.getElementById("extraSubject").disabled = true;
        document.querySelectorAll(".card button").forEach(btn => {
            if (btn.innerText.includes("Present") || btn.innerText.includes("Absent") || btn.innerText.includes("Off")) {
                btn.disabled = true;
            }
        });
        document.getElementById("extraInfo").innerText = "✔ No extra lectures today";
    }
}

// --- WEEKEND / HOLIDAY MESSAGE ---
function showWeekendMessage(day) {
    const statusDiv = document.getElementById("dayStatus");
    if (getHolidayForDate(dateKey)) { statusDiv.innerHTML = ""; return; }

    if (isWeekend(day)) {
        statusDiv.innerHTML = `
        <div class="holiday-card" style="border-color:rgba(212,163,115,0.4);">
            <div class="weekend-icon">☕</div>
            <div class="weekend-title">It's the Weekend</div>
            <div style="font-size:14px;color:var(--text-muted);font-weight:500;">Take a break, no lectures today!</div>
        </div>`;
    } else {
        statusDiv.innerHTML = "";
    }
}

// --- LOAD TODAY'S LECTURES ---
function loadLectures() {
    const container  = document.getElementById("lectures");
    container.innerHTML = "";
    const emptyState = document.getElementById("emptyStateHome");
    const activeHoliday = getHolidayForDate(dateKey);

    if (activeHoliday) {
        _renderHolidayCard(container, activeHoliday);
        if (emptyState) emptyState.style.display = 'none';
        return;
    }

    const todayLectures = timetable[day] || [];
    if (todayLectures.length === 0 && !isWeekend(day)) {
        if (emptyState) emptyState.style.display = 'block';
        return;
    }
    if (emptyState) emptyState.style.display = 'none';

    todayLectures.forEach(slot => {
        const [time, subject] = slot;
        const weight  = getSlotWeight(slot);
        const lockKey = dateKey + "_" + subject + "_" + time;
        const locked  = data.locks[lockKey];

        const div = document.createElement("div");
        div.className = "card lecture-card " + (locked ? "locked" : "");

        let statusHTML = "";
        if (locked && data.history[dateKey]) {
            const entry = data.history[dateKey].find(h => h.subject === subject && h.time === time);
            if (entry) {
                if (entry.status === "Present")   div.classList.add("lecture-present");
                if (entry.status === "Absent")    div.classList.add("lecture-absent");
                if (entry.status === "Cancelled") div.classList.add("lecture-cancelled");
                const icon  = entry.status === "Present" ? ICONS.check : (entry.status === "Absent" ? ICONS.x : ICONS.close);
                const color = entry.status === "Present" ? "var(--green)" : (entry.status === "Absent" ? "var(--red)" : "var(--text-muted)");
                statusHTML  = `<div style="font-size:13px;margin-top:8px;font-weight:700;display:flex;align-items:center;gap:6px;color:${color};"><span class="icon-sm" style="color:${color}">${icon}</span> Marked ${entry.status}</div>`;
            }
        }

        const weightBadge = weight > 1 ? `<span class="credit-badge">${weight} credits</span>` : '';
        div.innerHTML = `
            <div style="display:flex;flex-direction:column;gap:4px;margin-bottom:10px;">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                    <div class="lec-subject" style="margin:0;font-size:16px;font-weight:600;line-height:1.2;">${subject}</div>
                    <button class="note-btn" onclick="event.stopPropagation();addNote('${subject}')" style="flex-shrink:0;margin-left:12px;">${ICONS.note}</button>
                </div>
                <div style="display:flex;gap:8px;align-items:center;">
                    <span class="lec-time" style="margin:0;">${time}</span>${weightBadge}
                </div>
            </div>
            ${statusHTML}
            <div class="action-row" style="display:${locked ? 'none' : 'flex'}">
                <button class="btn-pill present"   onclick="markAttendance('${subject}','${time}','Present',${weight})">Present</button>
                <button class="btn-pill absent"    onclick="markAttendance('${subject}','${time}','Absent',${weight})">Absent</button>
                <button class="btn-pill cancelled" onclick="markAttendance('${subject}','${time}','Cancelled',${weight})">Off</button>
            </div>`;
        container.appendChild(div);
    });
}

// Helper: render holiday/off/exam card in home view
function _renderHolidayCard(container, activeHoliday) {
    let svgIcon = "", colorTheme = "", subtitle = "";

    if (activeHoliday.type === 'exam') {
        colorTheme = "rgba(245,158,11,0.4)";
        subtitle   = "Good luck! No attendance tracking today.";
        svgIcon    = `<svg viewBox="0 0 100 100" style="width:80px;height:80px;margin-bottom:16px;overflow:visible;"><circle cx="50" cy="50" r="35" fill="rgba(245,158,11,0.15)"/><path d="M 30 15 L 60 15 L 75 30 L 75 85 L 30 85 Z" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/><path d="M 60 15 L 60 30 L 75 30 Z" fill="#e2e8f0"/><line x1="38" y1="35" x2="67" y2="35" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/><line x1="38" y1="45" x2="60" y2="45" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/><line x1="38" y1="55" x2="67" y2="55" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/><g><circle cx="53" cy="72" r="14" fill="rgba(239,68,68,0.15)"/><text x="53" y="78" font-family="'Plus Jakarta Sans',sans-serif" font-size="20" font-weight="900" fill="#ef4444" text-anchor="middle">A+</text></g><g class="anim-ghost"><polygon points="12,65 18,59 38,79 32,85" fill="#fbbf24"/><polygon points="12,65 18,59 14,55 8,61" fill="#fca5a5"/><polygon points="38,79 32,85 43,88" fill="#fef3c7"/><polygon points="39,83 36,86 43,88" fill="#475569"/></g></svg>`;
    } else if (activeHoliday.type === 'off') {
        colorTheme = "rgba(161,161,170,0.4)";
        subtitle   = "Mass bunk validated. Classes are officially off.";
        svgIcon    = `<svg viewBox="0 0 100 100" style="width:80px;height:80px;margin-bottom:16px;overflow:visible;"><defs><linearGradient id="ghostGrad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#cbd5e1"/></linearGradient></defs><ellipse class="anim-ghost-shadow" cx="50" cy="95" rx="22" ry="5" fill="#000000"/><g class="anim-ghost"><path d="M 25 60 C 25 10 75 10 75 60 L 75 85 C 70 80 65 90 60 85 C 55 80 50 90 45 85 C 40 80 35 90 30 85 C 25 80 25 85 25 85 Z" fill="url(#ghostGrad)" filter="drop-shadow(0px 8px 6px rgba(0,0,0,0.15))"/><rect x="30" y="40" width="18" height="10" fill="#0f172a" rx="1"/><rect x="52" y="40" width="18" height="10" fill="#0f172a" rx="1"/><rect x="32" y="42" width="4" height="4" fill="#0f172a"/><rect x="48" y="42" width="4" height="4" fill="#0f172a"/><rect x="32" y="42" width="6" height="3" fill="#ffffff" opacity="0.8"/><rect x="54" y="42" width="6" height="3" fill="#ffffff" opacity="0.8"/></g></svg>`;
    } else {
        colorTheme = "rgba(212,163,115,0.4)";
        subtitle   = "No classes today. Take a breather and enjoy!";
        svgIcon    = `<div class="weekend-icon">☕</div>`;
    }

    const div = document.createElement("div");
    div.className = "holiday-card";
    div.style.borderColor = colorTheme;
    div.innerHTML = `${svgIcon}<div class="weekend-title">${activeHoliday.name}</div><div style="font-size:14px;color:var(--text-muted);font-weight:500;">${subtitle}</div>`;
    container.appendChild(div);
}

// --- MARK ATTENDANCE ---
function markAttendance(subject, time, status, weight = 1) {
    const key = dateKey + "_" + subject + "_" + time;
    if (data.locks[key]) return;
    data.locks[key] = true;
    data.history[dateKey] ??= [];
    data.history[dateKey].push({ subject, time, status, weight });
    if (status !== "Cancelled") {
        data.totals[subject] ??= { p: 0, t: 0 };
        data.totals[subject].t += weight;
        if (status === "Present") data.totals[subject].p += weight;
    }
    save();
    render();
    showToast(`Marked ${status}`);
}

// --- MARK EXTRA CLASS ---
function markExtra(status) {
    const noExtraKey = dateKey + "_NO_EXTRA";
    if (data.locks[noExtraKey]) { showToast("Locked for today", "error"); return; }
    const subject = document.getElementById("extraSubject").value;
    if (!subject) return;
    const key = dateKey + "_EXTRA_" + subject;
    if (data.locks[key]) return showToast("Already added", "error");
    data.locks[key] = true;
    data.history[dateKey] ??= [];
    data.history[dateKey].push({ subject, time: "Extra", status });
    data.totals[subject] ??= { p: 0, t: 0 };
    data.totals[subject].t++;
    if (status === "Present") data.totals[subject].p++;
    save();
    render();
    showToast("Extra Class Added");
}

function lockNoExtra() {
    const key = dateKey + "_NO_EXTRA";
    if (data.locks[key]) return;
    data.locks[key] = true;
    save();
    render();
    showToast("Locked for today");
}

// --- UNDO ---
function toggleUndo() {
    const sec = document.getElementById("undoSection");
    sec.style.display = (sec.style.display === "none" || sec.style.display === "") ? "block" : "none";
    if (sec.style.display === "block") {
        sec.innerHTML = "";
        if (!data.history[dateKey] || data.history[dateKey].length === 0) {
            sec.innerHTML = "<div style='text-align:center;color:var(--text-muted);font-size:14px;font-weight:600;'>Nothing to undo today</div>";
            return;
        }
        data.history[dateKey].forEach((h, i) => {
            sec.innerHTML += `<div class="task-item"><span><span style="font-weight:600;">${h.subject}</span> <span style="font-size:13px;color:var(--text-muted);margin-left:6px;">(${h.status})</span></span> <button class="del-task-btn" onclick="event.stopPropagation();undo('${dateKey}',${i})">${ICONS.undo}</button></div>`;
        });
    }
}

function undo(d, i) {
    const h   = data.history[d][i];
    const key = d + "_" + h.subject + "_" + h.time;
    delete data.locks[key];
    if (h.status !== "Cancelled") {
        data.totals[h.subject].t--;
        if (h.status === "Present") data.totals[h.subject].p--;
    }
    data.history[d].splice(i, 1);
    save();
    render();
    showToast("Entry Undone");
    document.getElementById("undoSection").style.display = "none";
}

// --- INIT EXTRA SUBJECT DROPDOWN ---
function initExtra() {
    const select = document.getElementById("extraSubject");
    if (select.parentNode.classList.contains("custom-select-wrapper")) {
        const wrapper = select.parentNode;
        wrapper.parentNode.insertBefore(select, wrapper);
        wrapper.remove();
    }
    select.innerHTML = getAllSubjects().map(s => `<option>${s}</option>`).join("");
    setupCustomSelects();
}

// --- NOTES ---
let currentNoteSubject = "";
function addNote(subject) {
    currentNoteSubject = subject;
    document.getElementById('noteSubjectDisplay').innerText = subject;
    document.getElementById('noteInput').value = "";
    document.getElementById('noteModal').style.display = 'flex';
    document.getElementById('noteInput').focus();
}
function closeNoteModal() { document.getElementById('noteModal').style.display = 'none'; }

// --- TASKS ---
function renderTasks() {
    const container = document.getElementById("taskList");
    const card      = document.getElementById("taskCard");
    container.innerHTML = "";
    if (data.tasks.length === 0) { card.style.display = "none"; return; }
    card.style.display = "block";
    data.tasks.forEach((task, index) => {
        container.innerHTML += `<div class="task-item ${task.done ? 'task-done' : ''}" onclick="toggleTask(${index})"><div style="flex:1;margin-right:12px;"><div style="font-size:15px;font-weight:600;margin-bottom:4px;line-height:1.4;">${task.text}</div><div style="font-size:12px;font-weight:500;color:var(--text-muted);">${task.subject} • ${formatDateDDMMYYYY(task.date)}</div></div><button class="del-task-btn" onclick="deleteTask(event,${index})">${ICONS.trash}</button></div>`;
    });
}
function toggleTask(index)       { data.tasks[index].done = !data.tasks[index].done; save(); renderTasks(); }
function deleteTask(e, index)    { e.stopPropagation(); showConfirm("Delete Note?", "This cannot be undone.", () => { data.tasks.splice(index, 1); save(); renderTasks(); }); }

// --- CRYSTAL BALL / PREDICTION ---
let isPredictiveModeOn = false;
let predictUntilDate   = "";

function togglePredictiveMode() {
    isPredictiveModeOn = !isPredictiveModeOn;
    const btn   = document.getElementById('crystalBallBtn');
    const panel = document.getElementById('predictionPanel');
    if (isPredictiveModeOn) {
        btn.classList.add('active');
        panel.classList.add('active');
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const input = document.getElementById('predictUntilDateInput');
        input.min   = tomorrow.toISOString().split('T')[0];
        const semEnd = localStorage.getItem("sem_end_date");
        if (semEnd) input.max = semEnd;
    } else {
        btn.classList.remove('active');
        panel.classList.remove('active');
        predictUntilDate = "";
        document.getElementById('predictUntilDateInput').value = "";
        renderSummary();
    }
}

function applyPrediction() {
    const inputDate = document.getElementById('predictUntilDateInput').value;
    if (!inputDate) return showToast("Please select a date", "error");
    const todayStr = new Date().toISOString().split('T')[0];
    if (inputDate <= todayStr) return showToast("Date must be in the future", "error");
    predictUntilDate = inputDate;
    renderSummary();
    showToast("Prediction Applied", "success");
}

function getPredictedAbsences() {
    if (!isPredictiveModeOn || !predictUntilDate) return {};
    const endDate = new Date(predictUntilDate);
    const cursor  = new Date();
    cursor.setDate(cursor.getDate() + 1);
    const predicted = {};
    while (cursor <= endDate) {
        const dStr    = getStorageDateKey(cursor);
        if (!getHolidayForDate(dStr)) {
            const dayName = cursor.toLocaleDateString("en-US", { weekday: "long" });
            if (!isWeekend(dayName)) {
                (timetable[dayName] || []).forEach(slot => {
                    const sub = slot[1], w = getSlotWeight(slot);
                    predicted[sub] = (predicted[sub] || 0) + w;
                });
            }
        }
        cursor.setDate(cursor.getDate() + 1);
    }
    return predicted;
}

function getRemainingFutureSlots() {
    const semEndStr = localStorage.getItem("sem_end_date");
    if (!semEndStr) return {};
    const end    = new Date(semEndStr);
    const cursor = new Date();
    cursor.setDate(cursor.getDate() + 1);
    const subjectCounts = {};
    while (cursor <= end) {
        const dStr = getStorageDateKey(cursor);
        if (!getHolidayForDate(dStr)) {
            const dayName = cursor.toLocaleDateString("en-US", { weekday: "long" });
            if (!isWeekend(dayName)) {
                (timetable[dayName] || []).forEach(slot => {
                    const sub = slot[1], w = getSlotWeight(slot);
                    subjectCounts[sub] = (subjectCounts[sub] || 0) + w;
                });
            }
        }
        cursor.setDate(cursor.getDate() + 1);
    }
    return subjectCounts;
}

// --- STATS SUMMARY ---
function renderSummary() {
    const div = document.getElementById("summary");
    div.innerHTML = "";
    let tp = 0, tt = 0;
    const target            = MIN_ATTENDANCE / 100;
    const futureSlots       = getRemainingFutureSlots();
    const semEndDateExists  = !!localStorage.getItem("sem_end_date");
    const predictedAbsences = getPredictedAbsences();

    let totalRemaining = 0;
    Object.values(futureSlots).forEach(c => totalRemaining += c);
    let totalPredictedAbsences = 0;
    Object.values(predictedAbsences).forEach(v => totalPredictedAbsences += v);

    const allSubjectsSet = new Set([...Object.keys(data.totals), ...Object.keys(predictedAbsences)]);
    let subjectListHTML  = "";

    for (let s of allSubjectsSet) {
        const orig      = data.totals[s] || { p: 0, t: 0 };
        const predMissed = predictedAbsences[s] || 0;
        const p         = orig.p;
        const t         = orig.t + predMissed;
        const percent   = t ? Math.round((p / t) * 100) : 0;
        tp += p; tt += t;

        let gradient = "";
        if (percent >= MIN_ATTENDANCE)           gradient = "linear-gradient(90deg,#10b981 0%,#34d399 100%)";
        else if (percent >= MIN_ATTENDANCE - 15) gradient = "linear-gradient(90deg,#84cc16 0%,#a3e635 100%)";
        else if (percent >= MIN_ATTENDANCE - 25) gradient = "linear-gradient(90deg,#f97316 0%,#fb923c 100%)";
        else                                      gradient = "linear-gradient(90deg,#ef4444 0%,#f87171 100%)";

        let statusMsg = "", statusColor = "text-muted", statusIcon = "";
        let remaining = Math.max(0, (futureSlots[s] || 0) - predMissed);
        const maxPossibleP = p + remaining, maxPossibleT = t + remaining;
        const maxPossiblePercent = maxPossibleT ? (maxPossibleP / maxPossibleT) : 0;

        if (t > 0) {
            if (percent >= MIN_ATTENDANCE) {
                const bunkable = Math.floor((p / target) - t);
                if (bunkable > 0)       { statusMsg = `Safe to bunk <b>${bunkable}</b>`; statusColor = "text-green"; statusIcon = ICONS.check; }
                else if (percent === 100) { statusMsg = `Perfect record`; statusColor = "text-green"; statusIcon = ICONS.check; }
                else                      { statusMsg = `Don't miss next`; statusColor = "text-yellow"; statusIcon = ICONS.x; }
            } else {
                if (semEndDateExists && maxPossiblePercent < target) {
                    statusMsg = `<b>Impossible</b> (Max: ${Math.round(maxPossiblePercent * 100)}%)`; statusColor = "text-red"; statusIcon = ICONS.x;
                } else {
                    const needed = Math.ceil((target * t - p) / (1 - target));
                    statusMsg = `Attend next <b>${needed}</b>`; statusColor = "text-red"; statusIcon = ICONS.x;
                }
            }
        } else { statusMsg = "No data"; }

        let titleHTML = `<div style="display:flex;align-items:center;flex:1;min-width:0;margin-right:10px;"><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${s}</span>`;
        if (predMissed > 0) titleHTML += `<span class="predicted-badge" style="white-space:nowrap;flex-shrink:0;">-${predMissed}</span>`;
        titleHTML += `</div>`;

        subjectListHTML += `<div class="summary-item" onclick="openSubjectDetail('${s}')"><div class="summary-header" style="align-items:center;">${titleHTML}<span style="color:var(--text-muted);font-weight:700;flex-shrink:0;">${p}/${t} <span style="color:var(--text-main);margin-left:4px;">${percent}%</span></span></div><div class="progress-track"><div class="progress-fill" style="width:${percent}%;background:${gradient};box-shadow:0 0 10px rgba(0,0,0,0.3);"></div></div><div class="status-msg ${statusColor}"><span class="icon-sm" style="display:inline-block;vertical-align:middle;">${statusIcon}</span>${statusMsg}</div></div>`;
    }

    const overall = tt ? Math.round((tp / tt) * 100) : 0;
    let overallColor = overall < 60 ? "var(--red)" : overall < MIN_ATTENDANCE - 5 ? "var(--yellow)" : overall < MIN_ATTENDANCE ? "#84cc16" : "var(--green)";

    totalRemaining = Math.max(0, totalRemaining - totalPredictedAbsences);
    let overallMsg = "";
    if (tt > 0) {
        if (overall < MIN_ATTENDANCE) {
            const overallMaxPercent = (tp + totalRemaining) / (tt + totalRemaining) || 0;
            if (semEndDateExists && overallMaxPercent < target) {
                overallMsg = `Impossible to reach ${MIN_ATTENDANCE}% (Max: ${Math.round(overallMaxPercent * 100)}%)`;
            } else {
                overallMsg = `Attend next ${Math.ceil((target * tt - tp) / (1 - target))} classes to hit ${MIN_ATTENDANCE}%`;
            }
        } else {
            const overallBunk = Math.floor((tp / target) - tt);
            overallMsg = overallBunk > 0 ? `Can safely bunk ${overallBunk} classes` : "Don't miss any upcoming classes";
        }
    } else { overallMsg = "Start marking attendance to see insights."; }

    const predictWarning = (isPredictiveModeOn && predictUntilDate)
        ? `<div style="font-size:12px;color:#c084fc;margin-top:20px;font-weight:800;background:rgba(168,85,247,0.1);padding:10px 16px;border-radius:12px;border:1px dashed rgba(168,85,247,0.4);text-transform:uppercase;letter-spacing:1px;width:100%;text-align:center;">🔮 Predicting Future</div>`
        : "";

    const radius = 64, circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (overall / 100) * circumference;

    div.innerHTML = `
        <div class="overall-card">
            <div style="font-size:14px;color:var(--text-muted);text-transform:uppercase;letter-spacing:2px;font-weight:800;">Overall Progress</div>
            <div class="circular-progress-container">
                <svg class="circular-progress-svg" viewBox="0 0 160 160">
                    <circle class="circular-bg" cx="80" cy="80" r="${radius}"></circle>
                    <circle class="circular-fill" cx="80" cy="80" r="${radius}" style="stroke:${overallColor};stroke-dasharray:${circumference};stroke-dashoffset:${strokeDashoffset};filter:drop-shadow(0 0 8px ${overallColor}80);"></circle>
                </svg>
                <div class="circular-text-container">
                    <div class="circular-percent" style="color:${overallColor}">${overall}%</div>
                    <div class="circular-label">${tp} / ${tt}</div>
                </div>
            </div>
            <div style="font-size:15px;font-weight:600;color:var(--text-main);text-align:center;padding:0 10px;">${overallMsg}</div>
            ${predictWarning}
        </div>
        <div style="margin-top:24px;">${subjectListHTML}</div>`;
}

// --- SUBJECT DETAIL MODAL ---
function openSubjectDetail(subject) {
    document.getElementById("subjectDetailTitle").innerText = subject + " History";
    const list = document.getElementById("subjectDetailList");
    let htmlBuffer = "";
    let found = false;

    // Sort dates from newest to oldest
    const dates = Object.keys(data.history).sort((a, b) => new Date(b) - new Date(a));

    dates.forEach(d => {
        data.history[d].forEach(entry => {
            if (entry.subject === subject) {
                found = true;
                // Assign clean CSS classes instead of inline styles
                const colorClass = entry.status === 'Present' ? 'text-green' : (entry.status === 'Cancelled' ? 'text-muted' : 'text-red');
                
                htmlBuffer += `
                <div class="history-item">
                    <div>
                        <div class="history-date">${formatDateDDMMYYYY(d)}</div>
                        <div class="history-day">${getDayName(d)}</div>
                    </div>
                    <div class="history-status ${colorClass}">${entry.status}</div>
                </div>`;
            }
        });
    });

    if (!found) {
        htmlBuffer = "<div class='history-empty'>No history found.</div>";
    }

    list.innerHTML = htmlBuffer;
    document.getElementById("subjectDetailModal").style.display = "flex";
}

function closeSubjectDetail() { document.getElementById('subjectDetailModal').style.display = "none"; }

// --- BACKGROUND REMINDER CHECK ---
function startBackgroundCheck() {
    setInterval(() => {
        const now = new Date();
        if (now.getHours() === 17 && now.getMinutes() === 0) {
            const d = now.toLocaleDateString("en-US", { weekday: "long" });
            if (isWeekend(d) || getHolidayForDate(dateKey)) return;
            if (!Object.keys(data.locks).some(k => k.startsWith(dateKey))) {
                sendNotification("Attendance Reminder", "You haven't marked your attendance today!");
                document.getElementById("reminderAlert").style.display = "block";
            }
        }
    }, 60000);
}
