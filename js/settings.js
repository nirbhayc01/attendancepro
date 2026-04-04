// ============================================================
//  SETTINGS.JS — Settings Modal, Timetable Editor, Academic
//                Calendar, Subject Management, Data Export,
//                Semester Management, Factory Reset
// ============================================================

const modal = document.getElementById("settingsModal");

// ---- OPEN / CLOSE ----
function openSettings() {
    modal.style.display = "flex";
    document.getElementById("targetInput").value    = MIN_ATTENDANCE;
    document.getElementById("semStartInput").value  = localStorage.getItem("sem_start_date") || "";
    document.getElementById("semEndInput").value    = localStorage.getItem("sem_end_date")   || "";
    document.getElementById("settingStudentName").value = localStorage.getItem("student_name") || "";

    // Weekend chips
    const savedWeekends = JSON.parse(localStorage.getItem("weekend_days") || '["Sunday"]');
    ["Sunday", "Saturday", "Friday"].forEach(d => {
        const chip = document.getElementById("settingWk" + d.slice(0, 3));
        if (chip) chip.classList.toggle('active', savedWeekends.includes(d));
    });

    // Timetable editor day select — unwrap custom dropdown first
    const editDaySelect = document.getElementById("editDaySelect");
    if (editDaySelect.parentNode.classList.contains("custom-select-wrapper")) {
        const wrapper = editDaySelect.parentNode;
        wrapper.parentNode.insertBefore(editDaySelect, wrapper);
        wrapper.remove();
    }
    const allDays    = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
    const activeDays = allDays.filter(d => !savedWeekends.includes(d));
    editDaySelect.innerHTML = activeDays.map(d => `<option value="${d}">${d}</option>`).join("");

    let defaultDay = day;
    if (savedWeekends.includes(defaultDay)) defaultDay = activeDays[0] || "Monday";
    editDaySelect.value = defaultDay;

    // Subject rename dropdown — unwrap first
    const renameSelect = document.getElementById("renameOldSubject");
    if (renameSelect.parentNode.classList.contains("custom-select-wrapper")) {
        const wrapper = renameSelect.parentNode;
        wrapper.parentNode.insertBefore(renameSelect, wrapper);
        wrapper.remove();
    }
    renameSelect.innerHTML = getAllSubjects().map(s => `<option value="${s}">${s}</option>`).join("");

    renderSettingsCalendar();
    renderHolidays();
    renderEditRows();
    setupCustomSelects();
}

function closeSettings() { modal.style.display = "none"; }

// ---- SAVE PREFERENCES ----
function saveSettings() {
    const nameVal = document.getElementById("settingStudentName").value.trim();
    if (nameVal) localStorage.setItem("student_name", nameVal);

    const val = parseInt(document.getElementById("targetInput").value);
    if (!val || val < 1 || val > 100) { showToast("Target must be 1-100%", "error"); return; }
    MIN_ATTENDANCE = val;
    localStorage.setItem("target_percent", val);

    const startVal = document.getElementById("semStartInput").value;
    const endVal   = document.getElementById("semEndInput").value;
    localStorage.setItem("sem_start_date", startVal);
    localStorage.setItem("sem_end_date",   endVal);

    const newWeekends = [];
    if (document.getElementById("settingWkSun")?.classList.contains("active")) newWeekends.push("Sunday");
    if (document.getElementById("settingWkSat")?.classList.contains("active")) newWeekends.push("Saturday");
    if (document.getElementById("settingWkFri")?.classList.contains("active")) newWeekends.push("Friday");
    localStorage.setItem("weekend_days", JSON.stringify(newWeekends));
    WEEKEND_DAYS = newWeekends;

    const pastInput = document.getElementById("pastDate");
    const todayStr  = new Date().toISOString().split('T')[0];
    if (pastInput) {
        if (startVal) pastInput.min = startVal;
        pastInput.max = (endVal && endVal < todayStr) ? endVal : todayStr;
    }

    closeSettings();
    render();
    renderChart();
    showToast("Preferences Saved ✓");
}

function toggleSettingsWeekend(day, btn) { btn.classList.toggle('active'); }

// ---- TIMETABLE EDITOR ----
function syncUnsavedEdits() {
    const selectedDay     = document.getElementById("editDaySelect").value;
    const rows            = document.getElementById("editContainer").querySelectorAll(".edit-row");
    const newDaySchedule  = [];
    rows.forEach((row, index) => {
        const t = document.getElementById(`time_${index}`).value;
        let   s = document.getElementById(`sub_${index}`)?.value;
        if (!s) s = row.querySelector('.custom-select-trigger span')?.innerText || '';
        const w = parseInt(document.getElementById(`wt_${index}`)?.value) || 1;
        newDaySchedule.push([t, s, w]);
    });
    timetable[selectedDay] = newDaySchedule;
}

function renderEditRows() {
    const selectedDay      = document.getElementById("editDaySelect").value;
    const container        = document.getElementById("editContainer");
    container.innerHTML    = "";
    const existingSubjects = getAllSubjects();
    const lectures         = timetable[selectedDay] || [];

    lectures.forEach((lec, index) => {
        const weight = lec[2] || 1;
        let optionsHTML = existingSubjects.map(s => `<option value="${s}" ${s === lec[1] ? 'selected' : ''}>${s}</option>`).join("");
        if (!existingSubjects.includes(lec[1])) optionsHTML += `<option value="${lec[1]}" selected hidden>${lec[1]}</option>`;

        container.innerHTML += `
        <div class="edit-row" style="display:flex;flex-direction:column;gap:12px;margin-bottom:16px;background:rgba(255,255,255,0.02);padding:16px;border-radius:20px;border:1px solid var(--border-color);">
            <div style="display:flex;gap:10px;align-items:center;width:100%;">
                <div style="flex:1;min-width:0;">
                    <select class="custom-select-source" id="sub_${index}" style="width:100%;margin-bottom:0;">${optionsHTML}</select>
                </div>
                <button style="background:var(--red-glow);color:var(--red);border:none;border-radius:14px;width:46px;height:46px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:0.2s;padding:0;" onclick="delEditRow(${index})">${ICONS.trash}</button>
            </div>
            <div style="display:flex;gap:10px;align-items:center;width:100%;">
                <input type="text" style="flex:1;margin-bottom:0;font-size:14px;padding:12px;cursor:pointer;text-align:center;background:var(--bg-color);border:1px solid var(--border-color);border-radius:12px;color:white;" value="${lec[0]}" id="time_${index}" placeholder="Tap to set time" readonly onclick="openTimePicker('settings',${index},null,this.value)">
                <div style="display:flex;align-items:center;gap:6px;background:var(--bg-color);padding:0 12px;border-radius:12px;border:1px solid var(--border-color);height:46px;">
                    <span style="font-size:12px;font-weight:700;color:var(--text-muted);">Cr:</span>
                    <input type="number" style="width:40px;margin-bottom:0;font-size:14px;font-weight:700;padding:0;text-align:center;background:transparent;border:none;color:white;outline:none;height:100%;" value="${weight}" id="wt_${index}" min="1" max="10">
                </div>
            </div>
        </div>`;
    });
    setupCustomSelects();
}

function addEditRow() {
    syncUnsavedEdits();
    const selectedDay = document.getElementById("editDaySelect").value;
    timetable[selectedDay] ??= [];
    timetable[selectedDay].push(["00:00-00:00", getAllSubjects()[0] || "New Subject"]);
    renderEditRows();
}

function delEditRow(index) {
    syncUnsavedEdits();
    const selectedDay = document.getElementById("editDaySelect").value;
    timetable[selectedDay].splice(index, 1);
    renderEditRows();
}

function saveNewTimetable() {
    const selectedDay = document.getElementById("editDaySelect").value;
    const rows        = document.getElementById("editContainer").querySelectorAll(".edit-row");
    const newSchedule = [];
    rows.forEach((row, index) => {
        const t = document.getElementById(`time_${index}`).value;
        const s = (document.getElementById(`sub_${index}`)?.value?.trim()) || (row.querySelector('.custom-select-trigger span')?.innerText?.trim()) || '';
        const w = parseInt(document.getElementById(`wt_${index}`)?.value) || 1;
        if (t && s) newSchedule.push([t, s, w > 1 ? w : undefined].filter(x => x !== undefined));
    });
    timetable[selectedDay] = newSchedule;
    localStorage.setItem("custom_timetable", JSON.stringify(timetable));
    showToast(`Saved ${selectedDay} ✓`);
    render();
    renderEditRows();
}

// ---- SUBJECT MANAGEMENT ----
function addNewSubject() {
    const name = document.getElementById("newSettingsSubject").value.trim();
    if (!name) return showToast("Enter subject name", "error");
    if (data.totals[name]) return showToast("Subject already exists", "error");
    data.totals[name] = { p: 0, t: 0 };
    save();
    document.getElementById("newSettingsSubject").value = "";
    showToast("Subject Added");
    openSettings();
}

function renameSubject() {
    const oldName = document.getElementById("renameOldSubject").value;
    const newName = document.getElementById("renameNewName").value.trim();
    if (!oldName || !newName) return showToast("Enter new name", "error");
    if (oldName === newName) return showToast("Names are same", "error");
    showConfirm("Rename / Merge?", `This will change '${oldName}' to '${newName}' in all history and timetable.`, () => {
        if (!data.totals[newName]) data.totals[newName] = { p: 0, t: 0 };
        if (data.totals[oldName]) {
            data.totals[newName].p += data.totals[oldName].p;
            data.totals[newName].t += data.totals[oldName].t;
            delete data.totals[oldName];
        }
        Object.keys(data.history).forEach(date => {
            data.history[date].forEach(entry => { if (entry.subject === oldName) entry.subject = newName; });
            Object.keys(data.locks).forEach(lockKey => {
                if (lockKey.includes(`_${oldName}_`)) {
                    data.locks[lockKey.replace(`_${oldName}_`, `_${newName}_`)] = true;
                    delete data.locks[lockKey];
                }
            });
        });
        data.tasks.forEach(t => { if (t.subject === oldName) t.subject = newName; });
        Object.keys(timetable).forEach(d => { timetable[d].forEach(slot => { if (slot[1] === oldName) slot[1] = newName; }); });
        localStorage.setItem("custom_timetable", JSON.stringify(timetable));
        save();
        document.getElementById("renameNewName").value = "";
        showToast("Renamed successfully ✓");
        render();
        openSettings();
    });
}

// ---- SECURITY PIN ----
function setNewPin() {
    const pin = document.getElementById("newPinInput").value;
    if (pin.length !== 4 || isNaN(pin)) return showToast("Enter 4-digit PIN", "error");
    USER_PIN = pin;
    localStorage.setItem("user_pin", pin);
    document.getElementById("newPinInput").value = "";
    showToast("Security PIN Updated");
}

// ---- FACTORY RESET ----
function triggerReset() {
    const modal = document.getElementById('passwordModal');
    const input = document.getElementById('resetPasswordInput');
    const btn   = document.getElementById('submitPasswordBtn');
    input.value = "";
    modal.style.display = "flex";
    input.focus();
    btn.onclick = () => {
        if (input.value === USER_PIN) {
            closePasswordModal();
            showConfirm("Factory Reset?", "All data will be lost permanently.", () => {
                ["attendance","target_percent","user_pin","sem_start_date","sem_end_date",
                 "onboarding_done","custom_timetable","weekend_days"].forEach(k => localStorage.removeItem(k));
                location.reload();
            });
        } else {
            showToast("Wrong PIN", "error");
            input.value = "";
            input.focus();
        }
    };
}

// ---- ACADEMIC CALENDAR ----
let currentSetCalDate  = new Date();
let selectedEventDate  = "";
let selectedEventType  = "festival";
let editingHolidayId   = null;

function changeSetCalMonth(delta) {
    currentSetCalDate.setMonth(currentSetCalDate.getMonth() + delta);
    renderSettingsCalendar();
}

function renderSettingsCalendar() {
    const grid  = document.getElementById('settingsCalGrid');
    grid.innerHTML = "";
    const year  = currentSetCalDate.getFullYear();
    const month = currentSetCalDate.getMonth();
    document.getElementById('setCalMonthYear').innerText = new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' });

    const firstDay    = new Date(year, month, 1).getDay() || 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i < firstDay; i++) grid.innerHTML += `<div></div>`;

    for (let d = 1; d <= daysInMonth; d++) {
        const dStr    = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const holiday = getHolidayForDate(dStr);
        let dotClass  = "";
        if (holiday) dotClass = holiday.type === 'exam' ? "orange" : holiday.type === 'off' ? "green" : "purple";
        const dotHTML = dotClass ? `<div class="dot ${dotClass}"></div>` : '';
        grid.innerHTML += `<div class="cal-day" onclick="openEventModal('${dStr}')">${d}${dotHTML}</div>`;
    }
}

function openEventModal(dateStr) {
    selectedEventDate = dateStr;
    const holiday     = getHolidayForDate(dateStr);
    document.getElementById('eventModal').style.display = "flex";
    document.getElementById('eventStartDateInput').value = dateStr;
    editingHolidayId = null;
    if (holiday) {
        document.getElementById('eventNameInput').value  = holiday.name;
        document.getElementById('eventEndDateInput').value = holiday.end;
        setEventType(holiday.type || 'festival');
        editingHolidayId = holiday.id;
    } else {
        document.getElementById('eventNameInput').value    = "";
        document.getElementById('eventEndDateInput').value = dateStr;
        setEventType('festival');
    }
}

function setEventType(type) {
    selectedEventType = type;
    ['typeFestival','typeExam','typeOff'].forEach(id => {
        document.getElementById(id).className = 'btn-pill btn-secondary';
        document.getElementById(id).style.background = "";
        document.getElementById(id).style.color      = "";
    });
    if (type === 'festival') {
        document.getElementById('typeFestival').className  = 'btn-pill present';
        document.getElementById('typeFestival').style.background = "rgba(139,92,246,0.15)";
        document.getElementById('typeFestival').style.color      = "#a78bfa";
    } else if (type === 'exam') {
        document.getElementById('typeExam').className  = 'btn-pill absent';
        document.getElementById('typeExam').style.background = "rgba(245,158,11,0.15)";
        document.getElementById('typeExam').style.color      = "#fbbf24";
    } else if (pastHoliday.type === 'off') {
            colorTheme = "rgba(161,161,170,0.4)";
            svgIcon    = `<svg viewBox="0 0 100 100" style="width:70px;height:70px;margin-bottom:12px;overflow:visible;"><defs><linearGradient id="ghostGradPast" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#cbd5e1"/></linearGradient></defs><ellipse class="anim-ghost-shadow" cx="50" cy="95" rx="22" ry="5" fill="#000000"/><g class="anim-ghost"><path d="M 25 60 C 25 10 75 10 75 60 L 75 85 C 70 80 65 90 60 85 C 55 80 50 90 45 85 C 40 80 35 90 30 85 C 25 80 25 85 25 85 Z" fill="url(#ghostGradPast)" filter="drop-shadow(0px 8px 6px rgba(0,0,0,0.15))"/><rect x="30" y="40" width="18" height="10" fill="#0f172a" rx="1"/><rect x="52" y="40" width="18" height="10" fill="#0f172a" rx="1"/><rect x="32" y="42" width="4" height="4" fill="#0f172a"/><rect x="48" y="42" width="4" height="4" fill="#0f172a"/><rect x="32" y="42" width="6" height="3" fill="#ffffff" opacity="0.8"/><rect x="54" y="42" width="6" height="3" fill="#ffffff" opacity="0.8"/></g></svg>`;
        }
}

function closeEventModal() { document.getElementById('eventModal').style.display = "none"; }

function saveEvent() {
    const name    = document.getElementById('eventNameInput').value.trim();
    const endDate = document.getElementById('eventEndDateInput').value;
    if (!name)               return showToast("Enter Name", "error");
    if (!endDate)            return showToast("End date required", "error");
    if (endDate < selectedEventDate) return showToast("End date cannot be before start", "error");
    if (editingHolidayId) data.holidays = data.holidays.filter(h => h.id !== editingHolidayId);
    else                  data.holidays = data.holidays.filter(h => h.start !== selectedEventDate);
    data.holidays.push({ id: Date.now(), name, start: selectedEventDate, end: endDate, type: selectedEventType });
    save();
    renderSettingsCalendar();
    renderHolidays();
    closeEventModal();
    showToast("Event Saved");
}

function deleteHoliday(id) {
    data.holidays = data.holidays.filter(h => h.id !== id);
    save();
    renderSettingsCalendar();
    renderHolidays();
}

function renderHolidays() {
    const list = document.getElementById("holidayList");
    list.innerHTML = "";
    if (!data.holidays || data.holidays.length === 0) {
        list.innerHTML = "<div style='font-size:13px;color:var(--text-muted);text-align:center;'>No events added</div>";
        return;
    }
    data.holidays.sort((a, b) => new Date(a.start) - new Date(b.start)).forEach(h => {
        let typeBadge = h.type === 'exam'
            ? `<span class="badge-type badge-exam">EXAM</span>`
            : h.type === 'off'
            ? `<span class="badge-type badge-off">OFF</span>`
            : `<span class="badge-type badge-festival">HOLIDAY</span>`;
        let dateDisplay = formatDateDDMMYYYY(h.start);
        if (h.start !== h.end) dateDisplay += ` - ${formatDateDDMMYYYY(h.end)}`;
        list.innerHTML += `<div class="task-item" style="border-left:none;border-bottom:1px solid var(--border-color);border-radius:0;background:transparent;padding:12px 0;"><div style="flex:1;"><div style="font-size:14px;font-weight:700;display:flex;align-items:center;">${typeBadge} ${h.name}</div><div style="font-size:12px;color:var(--text-muted);margin-top:6px;font-weight:500;">${dateDisplay}</div></div><button class="del-task-btn" onclick="deleteHoliday(${h.id})">${ICONS.trash}</button></div>`;
    });
}

// ---- STATS TAB: CALENDAR ----
let currentCalendarDate = new Date();
function changeMonth(delta) { currentCalendarDate.setMonth(currentCalendarDate.getMonth() + delta); renderCalendar(); }

function renderCalendar() {
    const grid    = document.getElementById('calendarGrid');
    grid.innerHTML = "";
    const year  = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const firstDay   = new Date(year, month, 1);
    const totalDays  = new Date(year, month + 1, 0).getDate();
    let startDayIndex = firstDay.getDay();
    startDayIndex = (startDayIndex === 0) ? 6 : startDayIndex - 1;
    document.getElementById('calMonthYear').innerText = new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' });

    for (let i = 0; i < startDayIndex; i++) grid.appendChild(document.createElement('div'));

    const todayStr = new Date().toISOString().split('T')[0];
    for (let i = 1; i <= totalDays; i++) {
        const dateObj = new Date(year, month, i);
        const key     = getStorageDateKey(dateObj);
        const dayEl   = document.createElement('div');
        dayEl.className = 'cal-day';
        if (key === todayStr) dayEl.classList.add('today');
        dayEl.innerText = i;

        const holiday = getHolidayForDate(key);
        let dotColor  = null;
        if (holiday) {
            dotColor = holiday.type === 'exam' ? 'orange' : holiday.type === 'off' ? 'green' : 'purple';
        } else if (data.history[key]?.length > 0) {
            const history  = data.history[key];
            const anyAbsent     = history.some(h => h.status === 'Absent');
            const allCancelled  = history.every(h => h.status === 'Cancelled');
            if (anyAbsent)       dotColor = 'red';
            else if (!allCancelled) dotColor = 'green';
        }
        if (dotColor) {
            const dot = document.createElement('div');
            dot.className = `dot ${dotColor}`;
            dayEl.appendChild(dot);
        }
        dayEl.onclick = () => showCalendarDetail(key, i);
        grid.appendChild(dayEl);
    }
}

function showCalendarDetail(key, dayNum) {
    const detail = document.getElementById('calendarDetail');
    detail.style.display = 'block';
    document.querySelectorAll('.cal-day').forEach(d => { d.classList.remove('selected'); if (d.innerText == dayNum) d.classList.add('selected'); });

    let content = `<div style="font-weight:800;font-size:16px;margin-bottom:12px;color:var(--text-main);">${formatDateDDMMYYYY(key)}</div>`;
    const holiday = getHolidayForDate(key);
    if (holiday) {
        const label = holiday.type === 'exam' ? "Exam" : holiday.type === 'off' ? "Off" : "Holiday";
        const color = holiday.type === 'exam' ? "#fbbf24" : holiday.type === 'off' ? "#a1a1aa" : "#a78bfa";
        content += `<span style="color:${color};font-weight:700;background:rgba(255,255,255,0.05);padding:6px 12px;border-radius:8px;">🎉 ${label}: ${holiday.name}</span>`;
    } else if (data.history[key]) {
        data.history[key].forEach(h => {
            const color = h.status === 'Present' ? 'var(--green)' : h.status === 'Absent' ? 'var(--red)' : 'var(--text-muted)';
            content += `<div style="margin-top:8px;display:flex;justify-content:space-between;align-items:center;"><span style="font-weight:600;font-size:15px;">${h.subject}</span><span style="color:${color};font-weight:800;font-size:15px;">${h.status}</span></div>`;
        });
    } else {
        const dObj = new Date(key);
        content += `<span style="color:var(--text-muted);font-weight:600;">${(dObj.getDay() === 0 || dObj.getDay() === 6) ? "Weekend (No classes)" : "No data recorded"}</span>`;
    }
    detail.innerHTML = content;
}

// ---- DETAIL LOG VIEW (Stats Tab) ----
function renderDetailView() {
    const mode   = document.getElementById("viewMode").value;
    const filter = document.getElementById("filterArea");
    const result = document.getElementById("detailResult");
    filter.innerHTML = "";
    result.innerHTML = "";

    if (mode === "date") {
        const dates = Object.keys(data.history).sort().reverse();
        if (!dates.length) { result.innerText = "No data yet"; return; }
        filter.innerHTML = `<select id="dateSelect" class="custom-select-source" onchange="showDateWise()"><option value="">Select Date</option>${dates.map(d => `<option value="${d}">${formatDateDDMMYYYY(d)}</option>`).join("")}</select>`;
        setupCustomSelects();
    }
    if (mode === "subject") {
        const subjects = Object.keys(data.totals).sort();
        if (!subjects.length) { result.innerText = "No data yet"; return; }
        filter.innerHTML = `<select id="subjectSelect" class="custom-select-source" onchange="showSubjectWise()"><option value="">Select Subject</option>${subjects.map(s => `<option value="${s}">${s}</option>`).join("")}</select>`;
        setupCustomSelects();
    }
}

function showDateWise() {
    const d      = document.getElementById("dateSelect").value;
    if (!d || !data.history[d]) return;
    const result = document.getElementById("detailResult");
    
    let htmlBuffer = `<div style="margin-bottom:16px;font-weight:800;font-size:16px;color:var(--text-main);">${formatDateDDMMYYYY(d)} <span style="color:var(--text-muted);font-size:14px;font-weight:600;">(${getDayName(d)})</span></div>`;
    
    data.history[d].forEach(h => {
        const leftColor = h.status === 'Present' ? 'var(--green)' : h.status === 'Cancelled' ? 'var(--text-muted)' : 'var(--red)';
        const colorClass = h.status === 'Present' ? 'text-green' : h.status === 'Cancelled' ? 'text-muted' : 'text-red';
        htmlBuffer += `<div class="task-item" style="border-left:3px solid ${leftColor};border-right:none;border-top:1px solid var(--border-color);border-bottom:1px solid var(--border-color);background:transparent;padding:12px 14px;border-radius:0;margin-bottom:0;"><div style="flex:1;min-width:0;margin-right:12px;"><div style="font-weight:700;color:var(--text-main);font-size:15px;">${h.subject}</div><div style="font-size:12px;font-weight:600;color:var(--text-muted);margin-top:4px;">${h.time}</div></div><span class="${colorClass}" style="font-weight:800;flex-shrink:0;">${h.status}</span></div>`;
    });
    
    result.innerHTML = htmlBuffer; // Render once
}

function showSubjectWise() {
    const sub    = document.getElementById("subjectSelect").value;
    if (!sub) return;
    const result = document.getElementById("detailResult");
    
    let htmlBuffer = "";
    Object.keys(data.history).sort().reverse().forEach(d => {
        data.history[d].forEach(h => {
            if (h.subject === sub) {
                const leftColor  = h.status === 'Present' ? 'var(--green)' : h.status === 'Cancelled' ? 'var(--text-muted)' : 'var(--red)';
                const colorClass = h.status === 'Present' ? 'text-green' : h.status === 'Cancelled' ? 'text-muted' : 'text-red';
                htmlBuffer += `<div class="task-item" style="border-left:3px solid ${leftColor};border-right:none;border-top:1px solid var(--border-color);border-bottom:1px solid var(--border-color);background:transparent;padding:12px 14px;border-radius:0;margin-bottom:0;"><div style="flex:1;min-width:0;margin-right:12px;"><span style="font-weight:700;color:var(--text-main);font-size:15px;">${formatDateDDMMYYYY(d)}</span><div style="font-size:12px;font-weight:600;color:var(--text-muted);margin-top:4px;">${getDayName(d)}</div></div><span class="${colorClass}" style="font-weight:800;flex-shrink:0;">${h.status}</span></div>`;
            }
        });
    });
    
    result.innerHTML = htmlBuffer; // Render once
}
// ---- PAST ATTENDANCE EDITOR ----
let pastBuffer = [], pastDateKey = "", pastDay = "";

function loadPastTimetable() {
    const input    = document.getElementById("pastDate");
    const val      = input.value;
    const container = document.getElementById("pastLectures");
    const extraDiv  = document.getElementById("pastExtra");
    const semStart  = localStorage.getItem("sem_start_date");
    const semEnd    = localStorage.getItem("sem_end_date");
    const todayStr  = new Date().toISOString().split('T')[0];

    if (semStart) input.min = semStart;
    input.max = (semEnd && semEnd < todayStr) ? semEnd : todayStr;
    container.innerHTML = "";
    extraDiv.innerHTML  = "";
    pastBuffer = [];
    if (!val) return;
    if (val > input.max) { showToast("Cannot edit future / beyond semester", "error"); input.value = ""; return; }

    pastDateKey = val;
    pastDay     = new Date(val).toLocaleDateString("en-US", { weekday: "long" });

    const pastHoliday = getHolidayForDate(pastDateKey);
    if (pastHoliday) {
        let svgIcon = "", colorTheme = "";

        if (pastHoliday.type === 'exam') {
            colorTheme = "rgba(245,158,11,0.4)";
            svgIcon    = `<svg viewBox="0 0 100 100" style="width:70px;height:70px;margin-bottom:12px;overflow:visible;"><circle cx="50" cy="50" r="35" fill="rgba(245,158,11,0.15)"/><path d="M 30 15 L 60 15 L 75 30 L 75 85 L 30 85 Z" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/><path d="M 60 15 L 60 30 L 75 30 Z" fill="#e2e8f0"/><line x1="38" y1="35" x2="67" y2="35" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/><line x1="38" y1="45" x2="60" y2="45" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/><line x1="38" y1="55" x2="67" y2="55" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/><g><circle cx="53" cy="72" r="14" fill="rgba(239,68,68,0.15)"/><text x="53" y="78" font-family="'Plus Jakarta Sans',sans-serif" font-size="20" font-weight="900" fill="#ef4444" text-anchor="middle">A+</text></g><g class="anim-ghost"><polygon points="12,65 18,59 38,79 32,85" fill="#fbbf24"/><polygon points="12,65 18,59 14,55 8,61" fill="#fca5a5"/><polygon points="38,79 32,85 43,88" fill="#fef3c7"/><polygon points="39,83 36,86 43,88" fill="#475569"/></g></svg>`;
        } else if (pastHoliday.type === 'off') {
            colorTheme = "rgba(161,161,170,0.4)";
            svgIcon    = `<svg viewBox="0 0 100 100" style="width:70px;height:70px;margin-bottom:12px;overflow:visible;"><defs><linearGradient id="ghostGrad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#cbd5e1"/></linearGradient></defs><ellipse class="anim-ghost-shadow" cx="50" cy="95" rx="22" ry="5" fill="#000000"/><g class="anim-ghost"><path d="M 25 60 C 25 10 75 10 75 60 L 75 85 C 70 80 65 90 60 85 C 55 80 50 90 45 85 C 40 80 35 90 30 85 C 25 80 25 85 25 85 Z" fill="url(#ghostGrad)" filter="drop-shadow(0px 8px 6px rgba(0,0,0,0.15))"/><rect x="30" y="40" width="18" height="10" fill="#0f172a" rx="1"/><rect x="52" y="40" width="18" height="10" fill="#0f172a" rx="1"/><rect x="32" y="42" width="4" height="4" fill="#0f172a"/><rect x="48" y="42" width="4" height="4" fill="#0f172a"/><rect x="32" y="42" width="6" height="3" fill="#ffffff" opacity="0.8"/><rect x="54" y="42" width="6" height="3" fill="#ffffff" opacity="0.8"/></g></svg>`;
        } else {
            colorTheme = "rgba(212,163,115,0.4)";
            svgIcon    = `<div class="weekend-icon" style="font-size:50px; margin-bottom:10px;">☕</div>`;
        }

        container.innerHTML = `
        <div class="holiday-card" style="border-color:${colorTheme}; padding: 30px 20px;">
            ${svgIcon}
            <div class="weekend-title">${pastHoliday.name}</div>
            <div style="font-size:14px;color:var(--text-muted);font-weight:500;">Event/Holiday recorded.</div>
        </div>`;
        return;
    }

    const existingData = data.history[pastDateKey] || [];
    if (existingData.length > 0) { showToast("Editing saved record ✏️"); pastBuffer = [...existingData]; }

    const lectures = timetable[pastDay] || [];
    if (lectures.length === 0) { container.innerHTML = "<div style='text-align:center;padding:20px;font-weight:600;color:var(--text-muted);'>No lectures scheduled 😴</div>"; }

    lectures.forEach(([time, subject]) => {
        const div   = document.createElement("div");
        div.className = "card lecture-card";
        div.style.marginBottom = "12px";
        const savedState = existingData.find(h => h.subject === subject && h.time === time);
        const status = savedState ? savedState.status : "";
        div.innerHTML = `<div style="font-weight:700;font-size:16px;margin-bottom:6px;">${subject}</div><div style="font-size:13px;font-weight:600;color:var(--text-muted);margin-bottom:12px;">${time}</div><div class="action-row"><button class="btn-pill ${status === 'Present' ? 'present' : 'btn-secondary'}" onclick="pastMark('${subject}','${time}','Present',this)">Present</button><button class="btn-pill ${status === 'Absent' ? 'absent' : 'btn-secondary'}" onclick="pastMark('${subject}','${time}','Absent',this)">Absent</button><button class="btn-pill ${status === 'Cancelled' ? 'cancelled' : 'btn-secondary'}" onclick="pastMark('${subject}','${time}','Cancelled',this)">Off</button></div>`;
        container.appendChild(div);
    });

    const existingExtras = (data.history[pastDateKey] || []).filter(h => h.time === "Extra");
    let extraHTML = existingExtras.map(ex => `<div class="task-item" style="margin-bottom:8px;"><span><span style="font-weight:600;">${ex.subject}</span> <span style="font-size:12px;color:var(--text-muted);">(Extra)</span></span> <div style="display:flex;align-items:center;gap:12px;"><span class="${ex.status === 'Present' ? 'text-green' : 'text-red'}" style="font-weight:700;">${ex.status}</span><button class="del-task-btn" onclick="removePastExtra('${ex.subject}')">×</button></div></div>`).join('');

    const allSubjects = getAllSubjects();
    extraDiv.innerHTML = `<div style="height:1px;background:var(--border-color);margin:20px 0;"></div><div id="existingExtrasList">${extraHTML}</div><h4 style='margin:16px 0 12px 0;font-size:15px;font-weight:700;'>➕ Add Extra Class</h4><select id="pastExtraSubject" class="custom-select-source">${allSubjects.map(s => `<option>${s}</option>`).join("")}</select><div class="action-row"><button class="btn-pill btn-secondary" onclick="addPastExtra('Present')">Present</button><button class="btn-pill btn-secondary" onclick="addPastExtra('Absent')">Absent</button></div>`;
    setupCustomSelects();
}

function pastMark(sub, time, stat, btn) {
    pastBuffer = pastBuffer.filter(x => !(x.subject === sub && x.time === time));
    pastBuffer.push({ subject: sub, time, status: stat });
    btn.parentElement.querySelectorAll('.btn-pill').forEach(b => b.className = 'btn-pill btn-secondary');
    btn.className = `btn-pill ${stat === "Present" ? "present" : stat === "Absent" ? "absent" : "cancelled"}`;
}

function addPastExtra(status) {
    const subject = document.getElementById("pastExtraSubject").value;
    if (pastBuffer.find(x => x.subject === subject && x.time === "Extra")) { showToast("Already in list", "error"); return; }
    pastBuffer.push({ subject, time: "Extra", status });
    document.getElementById("existingExtrasList").innerHTML += `<div class="task-item" style="margin-bottom:8px;"><span><span style="font-weight:600;">${subject}</span> <span style="font-size:12px;color:var(--text-muted);">(Extra)</span></span> <span class="${status === 'Present' ? 'text-green' : 'text-red'}" style="font-weight:700;">${status}</span></div>`;
}

function removePastExtra(subject) {
    pastBuffer = pastBuffer.filter(x => !(x.subject === subject && x.time === "Extra"));
    loadPastTimetable();
}

function savePastAttendance() {
    if (!pastDateKey)          { showToast("Select a date", "error"); return; }
    if (pastBuffer.length === 0) { showToast("No data to save", "error"); return; }
    if (data.history[pastDateKey]) {
        data.history[pastDateKey].forEach(oldEntry => {
            if (oldEntry.status !== "Cancelled" && data.totals[oldEntry.subject]) {
                data.totals[oldEntry.subject].t--;
                if (oldEntry.status === "Present") data.totals[oldEntry.subject].p--;
            }
        });
    }
    data.history[pastDateKey] = pastBuffer;
    pastBuffer.forEach(h => {
        if (h.status !== "Cancelled") {
            data.totals[h.subject] ??= { p: 0, t: 0 };
            data.totals[h.subject].t++;
            if (h.status === "Present") data.totals[h.subject].p++;
        }
        data.locks[pastDateKey + "_" + h.subject + "_" + h.time] = true;
    });
    save();
    render();
    showToast("History Updated");
    document.getElementById("pastDate").value        = "";
    document.getElementById("pastLectures").innerHTML = "";
    document.getElementById("pastExtra").innerHTML    = "";
}

// ---- DATA EXPORT & IMPORT ----
function exportBackup() {
    const backup = { version: 15, timestamp: new Date().toISOString(), data };
    const blob   = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const a      = document.createElement("a");
    a.href       = URL.createObjectURL(blob);
    a.download   = `attendance_backup_${dateKey}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast("Backup Downloaded");
}

document.getElementById("importFile").addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
        try {
            const backup = JSON.parse(reader.result);
            if (!backup.data || typeof backup.data.history !== 'object' || typeof backup.data.totals !== 'object') throw new Error("Invalid file structure");
            showConfirm("Overwrite Data?", "This will replace all current data.", () => {
                data = backup.data;
                if (!data.tasks)    data.tasks    = [];
                if (!data.history)  data.history  = {};
                if (!data.totals)   data.totals   = {};
                if (!data.locks)    data.locks    = {};
                if (!data.holidays) data.holidays = [];
                save();
                render();
                showToast("Restored successfully");
            });
        } catch (err) {
            console.error(err);
            showToast("Invalid/Corrupt Backup File", "error");
        }
        e.target.value = '';
    };
    reader.readAsText(file);
});

// ---- PDF REPORT ----
async function generatePDFReport() {
    if (!window.jspdf) { showToast("PDF Library loading, try again in a second", "error"); return; }
    showToast("Generating PDF...");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(22); doc.setTextColor(15, 23, 42); doc.text("Attendance Pro - Academic Report", 14, 20);
    doc.setFontSize(11); doc.setTextColor(100);
    const savedName   = localStorage.getItem("student_name");
    const userNameText = savedName ? `Student: ${savedName}` : "User: Student Profile";
    doc.text(userNameText, 14, 30);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 36);
    doc.text(`Target Attendance: ${MIN_ATTENDANCE}%`, 14, 42);
    doc.setFontSize(14); doc.setTextColor(15, 23, 42); doc.text("Subject Summary", 14, 55);

    const summaryBody = []; let tp = 0, tt = 0;
    for (let s in data.totals) {
        const { p, t } = data.totals[s];
        const percent  = t ? Math.round((p / t) * 100) : 0;
        tp += p; tt += t;
        summaryBody.push([s, p.toString(), t.toString(), `${percent}%`, percent >= MIN_ATTENDANCE ? "Safe" : "Low"]);
    }
    const overall = tt ? Math.round((tp / tt) * 100) : 0;
    summaryBody.push(["OVERALL TOTAL", tp.toString(), tt.toString(), `${overall}%`, overall >= MIN_ATTENDANCE ? "Safe" : "Low"]);

    doc.autoTable({
        startY: 60, head: [['Subject','Present','Total','Percentage','Status']], body: summaryBody,
        theme: 'striped', headStyles: { fillColor: [15, 23, 42] }, alternateRowStyles: { fillColor: [241, 245, 249] },
        willDrawCell: function (d) {
            if (d.section === 'body' && d.column.index === 4) {
                if (d.cell.raw === 'Safe') doc.setTextColor(16, 185, 129);
                else if (d.cell.raw === 'Low') doc.setTextColor(239, 68, 68);
                doc.setFont(undefined, 'bold');
            }
            if (d.section === 'body' && d.row.index === summaryBody.length - 1) doc.setFont(undefined, 'bold');
        }
    });

    let finalY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(14); doc.setTextColor(15, 23, 42); doc.text("Detailed Attendance Log", 14, finalY);

    const logBody = [];
    Object.keys(data.history).sort((a, b) => new Date(a) - new Date(b)).forEach(d => {
        data.history[d].forEach(entry => logBody.push([formatDateDDMMYYYY(d), getDayName(d), entry.subject, entry.time, entry.status]));
    });
    if (!logBody.length) logBody.push(["No data recorded yet.", "", "", "", ""]);

    doc.autoTable({
        startY: finalY + 5, head: [['Date','Day','Subject','Time','Status']], body: logBody,
        theme: 'grid', headStyles: { fillColor: [59, 130, 246] }, styles: { fontSize: 10 },
        willDrawCell: function (d) {
            if (d.section === 'body' && d.column.index === 4) {
                if (d.cell.raw === 'Present') doc.setTextColor(16, 185, 129);
                else if (d.cell.raw === 'Absent') doc.setTextColor(239, 68, 68);
                else doc.setTextColor(148, 163, 184);
                doc.setFont(undefined, 'bold');
            }
        }
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i); doc.setFontSize(9); doc.setTextColor(150);
        doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' });
    }
    doc.save(`Attendance_Report_${dateKey}.pdf`);
    showToast("PDF Downloaded!");
}

// ---- SEMESTER MANAGEMENT ----
function endSemester() {
    const now = new Date();
    document.getElementById('endSemNameInput').value = `Semester — ${now.toLocaleString('default', { month: 'short', year: 'numeric' })}`;
    document.getElementById('endSemModal').style.display = 'flex';
}

function confirmEndSemester() {
    let semLabel = document.getElementById('endSemNameInput').value.trim() || "Unnamed Semester";
    const now    = new Date();
    const archive = {
        id: Date.now(), label: semLabel, archivedAt: now.toISOString(),
        semStart: localStorage.getItem("sem_start_date") || "",
        semEnd:   localStorage.getItem("sem_end_date")   || now.toISOString().split("T")[0],
        target: MIN_ATTENDANCE, timetable, data: JSON.parse(JSON.stringify(data))
    };
    const pastSems = JSON.parse(localStorage.getItem("past_semesters") || "[]");
    pastSems.unshift(archive);
    localStorage.setItem("past_semesters", JSON.stringify(pastSems));

    ["attendance","sem_start_date","sem_end_date","custom_timetable","onboarding_done"].forEach(k => localStorage.removeItem(k));
    document.getElementById('endSemModal').style.display = 'none';
    location.reload();
}

function openSemArchiveModal() {
    const list     = document.getElementById('semArchiveList');
    const pastSems = JSON.parse(localStorage.getItem("past_semesters") || "[]");
    if (pastSems.length === 0) {
        list.innerHTML = '<div style="text-align:center;color:var(--text-muted);font-size:14px;font-weight:600;padding:20px;">No archived semesters yet.</div>';
    } else {
        list.innerHTML = pastSems.map((sem, idx) => {
            let tp = 0, tt = 0;
            Object.values(sem.data.totals || {}).forEach(s => { tp += s.p; tt += s.t; });
            const overall = tt ? Math.round((tp / tt) * 100) : 0;
            const color   = overall >= sem.target ? 'var(--green)' : 'var(--red)';
            return `<div class="sem-archive-item"><h4>${sem.label}</h4><p>Target: ${sem.target}% &nbsp;•&nbsp; Archived: ${new Date(sem.archivedAt).toLocaleDateString()}</p><div class="sem-archive-stats"><span class="sem-stat-badge" style="color:${color}">${overall}% Overall</span><span class="sem-stat-badge">${tp}/${tt} Classes</span><span class="sem-stat-badge">${Object.keys(sem.data.totals || {}).length} Subjects</span></div><button class="btn-block btn-secondary" onclick="exportSemArchive(${idx})" style="margin-top:12px;font-size:13px;padding:10px;">📥 Export Report</button></div>`;
        }).join('');
    }
    document.getElementById('semArchiveModal').style.display = 'flex';
}

function closeSemArchiveModal() { document.getElementById('semArchiveModal').style.display = 'none'; }

function exportSemArchive(idx) {
    if (!window.jspdf) { showToast("PDF Library loading, try again", "error"); return; }
    const pastSems = JSON.parse(localStorage.getItem("past_semesters") || "[]");
    const sem      = pastSems[idx];
    if (!sem) return;

    showToast("Generating PDF Report...");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(22); doc.setTextColor(15, 23, 42); doc.text(`Archive: ${sem.label}`, 14, 20);
    doc.setFontSize(11); doc.setTextColor(100);
    const savedName = localStorage.getItem("student_name") || "Student Profile";
    doc.text(`Student: ${savedName}`, 14, 30);
    doc.text(`Archived on: ${new Date(sem.archivedAt).toLocaleDateString()}`, 14, 36);
    doc.text(`Target Attendance: ${sem.target}%`, 14, 42);
    doc.setFontSize(14); doc.setTextColor(15, 23, 42); doc.text("Subject Summary", 14, 55);

    const summaryBody = []; let tp = 0, tt = 0;
    for (let s in sem.data.totals) {
        const { p, t } = sem.data.totals[s];
        const percent  = t ? Math.round((p / t) * 100) : 0;
        tp += p; tt += t;
        summaryBody.push([s, p.toString(), t.toString(), `${percent}%`, percent >= sem.target ? "Safe" : "Low"]);
    }
    const overall = tt ? Math.round((tp / tt) * 100) : 0;
    summaryBody.push(["OVERALL TOTAL", tp.toString(), tt.toString(), `${overall}%`, overall >= sem.target ? "Safe" : "Low"]);

    doc.autoTable({
        startY: 60, head: [['Subject','Present','Total','Percentage','Status']], body: summaryBody,
        theme: 'striped', headStyles: { fillColor: [15, 23, 42] }, alternateRowStyles: { fillColor: [241, 245, 249] },
        willDrawCell: function (d) {
            if (d.section === 'body' && d.column.index === 4) {
                if (d.cell.raw === 'Safe') doc.setTextColor(16, 185, 129);
                else if (d.cell.raw === 'Low') doc.setTextColor(239, 68, 68);
                doc.setFont(undefined, 'bold');
            }
            if (d.section === 'body' && d.row.index === summaryBody.length - 1) doc.setFont(undefined, 'bold');
        }
    });

    doc.save(`Attendance_Archive_${sem.label.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
    showToast("Archive PDF Downloaded!");
}
