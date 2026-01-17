/**
 * ATTENDANCE PRO - Professional Edition
 * Architecture: Modular Class-Based
 */

// --- CONFIGURATION ---
const APP_CONFIG = {
    minAttendance: parseInt(localStorage.getItem("target_percent")) || 75,
    firebase: {
        // KEEP YOUR EXISTING CONFIG HERE
        apiKey: "AIzaSyD_3PoAWTKc9yrNuW37MFBg2nhtFV3v4xM",
        authDomain: "attendancepro-f5017.firebaseapp.com",
        projectId: "attendancepro-f5017",
        storageBucket: "attendancepro-f5017.firebasestorage.app",
        messagingSenderId: "116879034772",
        appId: "1:116879034772:web:f20c9dc9dad7e7a2796781",
        measurementId: "G-Z3H01YF20Z"
    },
    defaultTimetable: {
        Monday: [ ["11:00-12:00","Introduction to Cyber Law"], ["12:00-01:00","Artificial Intelligence"], ["01:30-03:30","Operating Systems Lab"], ["03:30-04:30","Operating Systems"], ["04:30-05:30","Entrepreneurship and Start-ups"] ],
        Tuesday: [ ["11:00-12:00","Introduction to Cyber Law"], ["12:00-01:00","Theory of Computation"], ["01:30-03:30","Artificial Intelligence Lab"], ["03:30-04:30","Operating Systems"], ["04:30-05:30","Business Communication"] ],
        Wednesday: [ ["11:00-01:00","Computer Skill Lab-1"], ["01:30-02:30","Theory of Computation"], ["02:30-03:30","Introduction to Cyber Law"], ["03:30-04:30","Artificial Intelligence"], ["04:30-05:30","Business Communication"] ],
        Thursday: [ ["11:00-12:00","Software Requirement Engineering"], ["12:00-01:00","Theory of Computation"], ["01:30-02:30","Operating Systems"], ["02:30-03:30","Artificial Intelligence"], ["03:30-04:30","Entrepreneurship and Start-ups"] ],
        Friday: [ ["11:00-01:00","Software Requirement Engineering"], ["01:30-02:30","Theory of Computation"], ["02:30-04:30","Report Writing & Presentation Skill"] ]
    }
};

// --- DATA MANAGER ---
class DataManager {
    constructor() {
        this.data = JSON.parse(localStorage.getItem("attendance")) || { totals: {}, history: {}, locks: {}, tasks: [] };
        this.timetable = JSON.parse(localStorage.getItem("custom_timetable")) || APP_CONFIG.defaultTimetable;
    }

    save() {
        localStorage.setItem("attendance", JSON.stringify(this.data));
        localStorage.setItem("last_sync_time", Date.now());
        // Trigger background sync if online
        if (window.app && window.app.auth) window.app.auth.sync();
    }

    getTodayKey() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }

    markAttendance(subject, time, status, dateKey = this.getTodayKey()) {
        const lockKey = `${dateKey}_${subject}_${time}`;
        
        // Prevent double marking
        if (this.data.locks[lockKey]) return { success: false, msg: 'Already marked' };

        // Initialize structures
        this.data.history[dateKey] ??= [];
        this.data.totals[subject] ??= { p: 0, t: 0 };

        // Update Data
        this.data.history[dateKey].push({ subject, time, status });
        this.data.locks[lockKey] = true;

        if (status !== 'Cancelled') {
            this.data.totals[subject].t++;
            if (status === 'Present') this.data.totals[subject].p++;
        }

        this.save();
        return { success: true, msg: `Marked ${status}` };
    }

    getAllSubjects() {
        const subjects = new Set();
        Object.values(this.timetable).flat().forEach(slot => subjects.add(slot[1]));
        return Array.from(subjects).sort();
    }
}

// --- UI MANAGER ---
class UIManager {
    constructor(dataManager) {
        this.dm = dataManager;
        this.tabs = document.querySelectorAll('.tab-content');
        this.navs = document.querySelectorAll('.nav-item');
        this.bindEvents();
    }

    bindEvents() {
        this.navs.forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });
        
        // Global Delegate for dynamic buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-action="mark"]')) {
                const { subject, time, status } = e.target.dataset;
                const res = this.dm.markAttendance(subject, time, status);
                this.showToast(res.msg, res.success ? 'success' : 'error');
                if(res.success) this.renderHome();
            }
        });
    }

    switchTab(tabId) {
        this.tabs.forEach(t => t.classList.remove('active'));
        this.navs.forEach(n => n.classList.remove('active'));
        document.getElementById(`tab-${tabId}`).classList.add('active');
        document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
        
        if (tabId === 'home') this.renderHome();
        if (tabId === 'stats') this.renderStats();
    }

    renderHome() {
        const container = document.getElementById('lectures-list');
        const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
        const dateKey = this.dm.getTodayKey();
        
        document.getElementById('current-date').innerText = `${today}, ${new Date().toLocaleDateString()}`;

        const schedule = this.dm.timetable[today] || [];
        container.innerHTML = '';

        if (schedule.length === 0) {
            container.innerHTML = `<div class="card" style="text-align:center; padding:40px; color:var(--text-secondary)">No classes scheduled for today 😴</div>`;
            return;
        }

        schedule.forEach(([time, subject]) => {
            const lockKey = `${dateKey}_${subject}_${time}`;
            const isLocked = this.dm.data.locks[lockKey];
            
            let statusBadge = '';
            let actionButtons = `
                <div class="action-grid" style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin-top:10px;">
                    <button class="btn btn-present" data-action="mark" data-subject="${subject}" data-time="${time}" data-status="Present">Present</button>
                    <button class="btn btn-absent" data-action="mark" data-subject="${subject}" data-time="${time}" data-status="Absent">Absent</button>
                    <button class="btn btn-outline" style="background:#334155; color:#94a3b8;" data-action="mark" data-subject="${subject}" data-time="${time}" data-status="Cancelled">Off</button>
                </div>`;

            if (isLocked) {
                // Find status
                const entry = this.dm.data.history[dateKey]?.find(h => h.subject === subject && h.time === time);
                const status = entry ? entry.status : 'Unknown';
                const statusClass = status.toLowerCase();
                statusBadge = `<div class="lecture-status ${statusClass}" style="color: ${status === 'Present' ? 'var(--success)' : 'var(--danger)'}">• ${status}</div>`;
                actionButtons = '';
            }

            const html = `
                <div class="lecture-item ${isLocked ? (statusBadge.includes('Present') ? 'present' : 'absent') : ''}">
                    <div class="status-indicator"></div>
                    <div style="width:100%">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div>
                                <span class="lecture-time">${time}</span>
                                <div class="lecture-name" style="margin-top:6px;">${subject}</div>
                                ${statusBadge}
                            </div>
                        </div>
                        ${actionButtons}
                    </div>
                </div>`;
            container.insertAdjacentHTML('beforeend', html);
        });

        // Populate Extra Select
        const extraSel = document.getElementById('extraSubject');
        if (extraSel.options.length === 0) {
            extraSel.innerHTML = this.dm.getAllSubjects().map(s => `<option>${s}</option>`).join('');
        }
    }

    renderStats() {
        // Simple Stat Implementation
        const container = document.getElementById('subject-summary-list');
        container.innerHTML = '';
        const totals = this.dm.data.totals;
        
        Object.entries(totals).forEach(([subject, stats]) => {
            const percent = stats.t ? Math.round((stats.p / stats.t) * 100) : 0;
            const color = percent >= APP_CONFIG.minAttendance ? 'var(--success)' : 'var(--danger)';
            
            container.insertAdjacentHTML('beforeend', `
                <div style="margin-bottom:15px; border-bottom:1px solid var(--bg-tertiary); padding-bottom:10px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                        <span style="font-size:0.9rem;">${subject}</span>
                        <span style="font-weight:bold; color:${color}">${percent}%</span>
                    </div>
                    <div style="background:var(--bg-tertiary); height:6px; border-radius:3px; overflow:hidden;">
                        <div style="width:${percent}%; background:${color}; height:100%;"></div>
                    </div>
                    <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:4px;">
                        Attended: ${stats.p} / ${stats.t}
                    </div>
                </div>
            `);
        });
    }

    showToast(msg, type = 'success') {
        const box = document.getElementById('toast-container');
        const el = document.createElement('div');
        el.className = `toast ${type}`;
        el.innerHTML = type === 'success' ? `✅ ${msg}` : `⚠️ ${msg}`;
        box.appendChild(el);
        setTimeout(() => el.remove(), 3000);
    }
}

// --- AUTH & SYNC ---
class AuthManager {
    constructor(dataManager) {
        try {
            firebase.initializeApp(APP_CONFIG.firebase);
            this.auth = firebase.auth();
            this.db = firebase.firestore();
            this.dm = dataManager;
            this.setupListener();
        } catch (e) { console.error("Firebase Error", e); }
    }

    setupListener() {
        this.auth.onAuthStateChanged(user => {
            const ui = document.getElementById('auth-ui');
            if (user) {
                ui.innerHTML = `
                    <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
                        <img src="${user.photoURL}" style="width:30px; height:30px; border-radius:50%;">
                        <div>
                            <div style="font-size:0.9rem; font-weight:bold;">${user.displayName}</div>
                            <div style="font-size:0.7rem; color:var(--success);">• Online & Synced</div>
                        </div>
                    </div>
                    <button class="btn btn-outline" onclick="firebase.auth().signOut()">Logout</button>
                `;
                this.sync();
            } else {
                ui.innerHTML = `<button class="btn btn-primary" onclick="window.app.auth.login()">Sign in with Google</button>`;
            }
        });
    }

    login() {
        const provider = new firebase.auth.GoogleAuthProvider();
        this.auth.signInWithPopup(provider).catch(e => alert(e.message));
    }

    sync() {
        if (!this.auth.currentUser) return;
        const uid = this.auth.currentUser.uid;
        // Simple 1-way backup for now (Client -> Cloud) to prevent complexity
        // A real app would use Conflict Resolution strategies
        this.db.collection('users').doc(uid).set({
            attendance: this.dm.data,
            lastUpdated: Date.now()
        }, { merge: true });
    }
}

// --- APP BOOTSTRAP ---
class AttendanceApp {
    constructor() {
        this.dm = new DataManager();
        this.ui = new UIManager(this.dm);
        this.auth = new AuthManager(this.dm);
        
        this.init();
    }

    init() {
        // Fade out splash
        setTimeout(() => {
            document.getElementById('app-splash').style.opacity = '0';
            setTimeout(() => document.getElementById('app-splash').remove(), 500);
        }, 1000);

        this.ui.renderHome();
        
        // Service Worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js');
        }
    }
    
    exportData() {
        const blob = new Blob([JSON.stringify(this.dm.data)], {type : 'application/json'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'attendance_backup.json';
        a.click();
    }
}

// Start App
window.addEventListener('DOMContentLoaded', () => {
    window.app = new AttendanceApp();
});
