// ============================================================
//  FEATURES.JS — Timetable Sharing, Push Notifications,
//                Time Picker Modal, Attendance Chart
// ============================================================

// ============================================================
//  TIMETABLE SHARING (Supabase Share Codes)
// ============================================================

async function generateShareCode() {
    try {
        showToast("Checking cloud...");
        const { data: existingData } = await supabaseClient
            .from('shared_timetables')
            .select('share_code')
            .eq('timetable_data', JSON.stringify(timetable))
            .limit(1);

        if (existingData && existingData.length > 0) {
            const code = existingData[0].share_code;
            localStorage.setItem("my_share_code", code);
            localStorage.setItem("my_full_share_code", code);
            document.getElementById('shareCodeDisplay').style.display = 'block';
            document.getElementById('shareCodeValue').innerText = code;
            showToast("Code retrieved! Share it with classmates.");
            return;
        }

        showToast("Uploading new timetable...");
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));

        const { error } = await supabaseClient
            .from('shared_timetables')
            .insert([{ share_code: code, timetable_data: timetable }]);
        if (error) throw error;

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
    const code     = document.getElementById('shareCodeValue').innerText;
    const fullCode = localStorage.getItem("my_full_share_code") || code;
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(fullCode)
            .then(() => showToast("Code copied!"))
            .catch(() => _fallbackCopy(fullCode));
    } else {
        _fallbackCopy(fullCode);
    }
}

function _fallbackCopy(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.cssText = "position:fixed;top:0;left:0;";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        if (document.execCommand('copy')) showToast("Code copied!");
        else throw new Error();
    } catch {
        showToast("Copy failed, please share manually", "error");
    }
    document.body.removeChild(textArea);
}

function openImportTTModal()  { document.getElementById('importTTModal').style.display = 'flex'; }
function closeImportTTModal() { document.getElementById('importTTModal').style.display = 'none'; }

async function importTimetableByCode() {
    const raw = document.getElementById('importCodeInput').value.trim().toUpperCase();
    if (!raw || raw.length !== 6) { showToast("Enter a valid 6-digit code", "error"); return; }

    try {
        showToast("Searching database...");
        const { data: result, error } = await supabaseClient
            .from('shared_timetables')
            .select('timetable_data')
            .eq('share_code', raw)
            .single();

        if (error || !result) throw new Error("Code not found");

        showConfirm("Import Timetable?", "This will replace your current timetable. Attendance data is kept.", () => {
            closeImportTTModal();
            const wizard = document.getElementById('onboardingWizard');
            if (wizard && wizard.style.display === 'flex') {
                finishOnboarding(result.timetable_data);
            } else {
                timetable = result.timetable_data;
                localStorage.setItem("custom_timetable", JSON.stringify(timetable));
                render();
                showToast("Timetable imported successfully!");
            }
        });

    } catch (err) {
        console.error("Fetch Error:", err);
        showToast("Code not found in cloud. Check the code and try again.", "error");
    }
}

// ============================================================
//  PUSH NOTIFICATIONS
// ============================================================

const PUBLIC_VAPID_KEY = 'BBMpy4SB8az2T4XOw7hUZouoahcyZ5OH8sqmmF-vjJ14VZh4PYheDLxTefBRXP1AFwY0yYgIgeDgMt45Q505shg';

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from(rawData, c => c.charCodeAt(0));
}

async function enablePushNotifications() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        showToast("Push not supported on this device", "error");
        return;
    }
    try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') throw new Error('Permission denied');

        const registration  = await navigator.serviceWorker.ready;
        const subscription  = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
        });

        await saveSubscriptionToCloud(subscription);
        showToast("Reminders Activated! 🔔");

        const btn = document.getElementById('settingsPushBtn');
        if (btn) {
            btn.innerHTML = "Reminders Active ✓";
            btn.disabled  = true;
            btn.style.cssText += ";opacity:0.6;background:var(--green-glow);color:var(--green);border:1px solid var(--green);";
        }
    } catch (err) {
        console.error(err);
        showToast("Failed to enable notifications", "error");
    }
}

async function saveSubscriptionToCloud(sub) {
    const { error } = await supabaseClient
        .from('push_subscriptions')
        .upsert([{ endpoint: sub.endpoint, keys: sub.toJSON().keys, last_active: new Date().toISOString() }], { onConflict: 'endpoint' });
    if (error) console.error("DB Error:", error);
}

function sendNotification(title, body) {
    if (Notification.permission !== "granted") return;
    if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then(reg => reg.showNotification(title, { body, icon: 'assets/icon.png' }));
    } else {
        new Notification(title, { body, icon: 'assets/icon.png' });
    }
}

// ============================================================
//  TIME PICKER MODAL
// ============================================================

let timePickerContext = { mode: null, day: null, index: null };
let selectedDuration  = 1;

function syncSelectUI(id, val) {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.value = val;
    const wrapper = sel.parentNode;
    if (wrapper?.classList.contains('custom-select-wrapper')) {
        const span = wrapper.querySelector('.custom-select-trigger span');
        if (span) span.innerText = val;
        wrapper.querySelectorAll('.custom-option').forEach(opt => {
            opt.classList.toggle('selected', opt.getAttribute('data-value') === val);
        });
    }
}

function openTimePicker(mode, index, day = null, currentValue = "") {
    timePickerContext = { mode, index, day };
    let hour = "09", min = "00", ampm = "AM";

    // Auto-fill: steal end time from the slot above
    if ((!currentValue || currentValue.includes("00:00") || currentValue.includes("Tap")) && index > 0) {
        let prevEndTime = null;
        if (mode === 'settings') {
            const prevInput = document.getElementById(`time_${index - 1}`);
            if (prevInput?.value.includes("-")) prevEndTime = prevInput.value.split("-")[1].trim();
        } else if (mode === 'onboarding') {
            const prevInput = document.querySelectorAll('.ob-slot-row input')[index - 1];
            if (prevInput?.value.includes("-")) prevEndTime = prevInput.value.split("-")[1].trim();
        }
        if (prevEndTime) {
            const m = prevEndTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
            if (m) { hour = m[1].padStart(2,'0'); min = m[2].padStart(2,'0'); ampm = m[3].toUpperCase(); }
        }
    }

    // Override: parse existing time value
    if (currentValue?.includes("-") && !currentValue.includes("00:00") && !currentValue.includes("Tap")) {
        const m = currentValue.split("-")[0]?.trim().match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (m) { hour = m[1].padStart(2,'0'); min = m[2].padStart(2,'0'); ampm = m[3].toUpperCase(); }
    }

    syncSelectUI('tpStartHour', hour);
    syncSelectUI('tpStartMin',  min);
    syncSelectUI('tpStartAmPm', ampm);
    selectDuration(1, document.getElementById('dur1'));
    document.getElementById('timePickerModal').style.display = 'flex';
}

function closeTimePicker() { document.getElementById('timePickerModal').style.display = 'none'; }

function selectDuration(hours, btn) {
    selectedDuration = hours;
    document.querySelectorAll('#timePickerModal .ob-chip').forEach(c => c.classList.remove('active'));
    if (btn) btn.classList.add('active');
}

function calculateEndTime(hour, min, ampm, durationHours) {
    let h = parseInt(hour), m = parseInt(min);
    if (ampm === "PM" && h !== 12) h += 12;
    if (ampm === "AM" && h === 12) h  = 0;
    const totalMinutes = (h * 60) + m + (durationHours * 60);
    let endH = Math.floor(totalMinutes / 60) % 24;
    let endM = totalMinutes % 60;
    const endAmPm = endH >= 12 ? "PM" : "AM";
    if (endH > 12) endH -= 12;
    if (endH === 0) endH = 12;
    return `${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')} ${endAmPm}`;
}

function saveTimePicker() {
    const startH    = document.getElementById('tpStartHour').value;
    const startM    = document.getElementById('tpStartMin').value;
    const startAmPm = document.getElementById('tpStartAmPm').value;
    const formatted = `${startH}:${startM} ${startAmPm} - ${calculateEndTime(startH, startM, startAmPm, selectedDuration)}`;

    if (timePickerContext.mode === 'settings') {
        const input = document.getElementById(`time_${timePickerContext.index}`);
        if (input) input.value = formatted;
        const selDay = document.getElementById("editDaySelect").value;
        if (timetable[selDay]?.[timePickerContext.index]) {
            timetable[selDay][timePickerContext.index][0] = formatted;
        }
    } else if (timePickerContext.mode === 'onboarding') {
        updateObSlot(timePickerContext.day, timePickerContext.index, 0, formatted);
        buildObTimetableUI();
    }
    closeTimePicker();
}

// ============================================================
//  ATTENDANCE CHART (Stats Tab)
// ============================================================

let chartInstance = null;

function renderChart() {
    const ctx = document.getElementById('attendanceChart');
    if (!ctx) return;
    if (chartInstance) chartInstance.destroy();

    const dates  = Object.keys(data.history).sort();
    let tempP = 0, tempT = 0;
    for (let s in data.totals) { tempP += data.totals[s].p; tempT += data.totals[s].t; }

    const chartData   = [];
    const chartLabels = [];
    if (tempT > 0) { chartData.push(Math.round((tempP / tempT) * 100)); chartLabels.push(formatDateDDMMYYYY(dateKey).slice(0,5)); }

    dates.filter(d => d !== dateKey).reverse().slice(0, 30).forEach(d => {
        data.history[d].forEach(evt => {
            if (evt.status !== "Cancelled") {
                tempT--;
                if (evt.status === "Present") tempP--;
            }
        });
        if (tempT > 0) { chartData.push(Math.round((tempP / tempT) * 100)); chartLabels.push(formatDateDDMMYYYY(d).slice(0,5)); }
    });
    chartData.reverse(); chartLabels.reverse();

    const glowPlugin = {
        id: 'glow',
        beforeDraw: (c) => { c.ctx.save(); c.ctx.shadowColor = 'rgba(59,130,246,0.4)'; c.ctx.shadowBlur = 15; },
        afterDraw:  (c) => { c.ctx.restore(); }
    };

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels:   chartLabels,
            datasets: [{ label: 'Overall %', data: chartData, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', borderWidth: 3, tension: 0.4, pointRadius: 0, pointHitRadius: 20, fill: true }]
        },
        plugins: [glowPlugin],
        options: {
            responsive: true, maintainAspectRatio: false,
            layout: { padding: { top: 10, right: 10, left: 10, bottom: 10 } },
            interaction: { mode: 'index', intersect: false },
            scales: {
                y: { beginAtZero: true, min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false }, ticks: { color: '#a1a1aa', font: { family: "'Plus Jakarta Sans', sans-serif", weight: '600' } } },
                x: { grid: { display: false, drawBorder: false }, ticks: { color: '#a1a1aa', maxTicksLimit: 6, font: { family: "'Plus Jakarta Sans', sans-serif", weight: '600' } } }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(11,15,25,0.95)', titleColor: '#f4f4f5', bodyColor: '#3b82f6',
                    titleFont: { family: "'Plus Jakarta Sans'", size: 13 }, bodyFont: { family: "'Plus Jakarta Sans'", size: 14, weight: 'bold' },
                    padding: 12, cornerRadius: 12, displayColors: false, borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1,
                    callbacks: { title: (items) => items[0]?.label || '', label: (item) => `${item.raw}% attendance` }
                }
            }
        }
    });
}
