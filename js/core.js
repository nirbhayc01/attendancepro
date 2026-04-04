// ============================================================
//  CORE.JS — Global State, Storage, Constants & Utilities
// ============================================================

// --- SUPABASE INIT ---
const supabaseUrl = 'https://gahmbbudkhlyliuwaqcy.supabase.co';
const supabaseKey = 'sb_publishable_g3nHitWdObU8OMa8Fc9LjQ_VquLQE0k';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// --- CONSTANTS & LIVE STATE ---
let USER_PIN        = localStorage.getItem("user_pin") || "0000";
let MIN_ATTENDANCE  = parseInt(localStorage.getItem("target_percent")) || 75;
let WEEKEND_DAYS    = JSON.parse(localStorage.getItem("weekend_days") || '["Sunday"]');

// --- PERSISTENCE ---
let data = JSON.parse(localStorage.getItem("attendance")) || {
    totals: {}, history: {}, locks: {}, tasks: [], holidays: []
};
if (!data.tasks)    data.tasks    = [];
if (!data.holidays) data.holidays = [];

let timetable = JSON.parse(localStorage.getItem("custom_timetable")) || {};

function save() {
    localStorage.setItem("attendance", JSON.stringify(data));
}

// --- DATE HELPERS ---
const today   = new Date();
const day     = today.toLocaleDateString("en-US", { weekday: "long" });
const dateKey = getStorageDateKey(today);

function getStorageDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function formatDateDDMMYYYY(isoDate) {
    if (!isoDate) return "";
    const [y, m, d] = isoDate.split("-");
    return `${d}/${m}/${y}`;
}

function getDayName(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    return isNaN(d) ? "" : d.toLocaleDateString("en-US", { weekday: "long" });
}

// --- SUBJECT HELPERS ---
function getAllSubjects() {
    const set = new Set(Object.keys(data.totals || {}));
    Object.values(timetable).flat().forEach(x => set.add(x[1]));
    return [...set].sort();
}

function getSlotWeight(slot) {
    return (slot && slot[2]) ? parseInt(slot[2]) : 1;
}

// --- WEEKEND HELPERS ---
function isWeekend(dayName) {
    return WEEKEND_DAYS.includes(dayName);
}

// --- HOLIDAY HELPERS ---
function getHolidayForDate(dateStr) {
    if (!data.holidays) return null;
    const target = new Date(dateStr);
    return data.holidays.find(h => {
        const start = new Date(h.start);
        const end   = new Date(h.end);
        return target >= start && target <= end;
    });
}
