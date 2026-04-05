// ============================================================
//  UI.JS — Icons, Toast, Confirm, Custom Selects, Scroll Lock,
//          Tab Switching, Pull-to-Refresh
// ============================================================

// --- ICON LIBRARY ---
const ICONS = {
    home:     '<svg class="icon icon-lg" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>',
    stats:    '<svg class="icon icon-lg" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>',
    tools:    '<svg class="icon icon-lg" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>',
    note:     '<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>',
    check:    '<svg class="icon icon-sm" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>',
    x:        '<svg class="icon icon-sm" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
    trash:    '<svg class="icon icon-sm" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>',
    undo:     '<svg class="icon icon-sm" viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>',
    close:    '<svg class="icon icon-lg" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
    chart:    '<svg class="icon icon-lg" viewBox="0 0 24 24"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>',
    list:     '<svg class="icon icon-lg" viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>',
    graph:    '<svg class="icon icon-lg" viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>',
    calendar: '<svg class="icon icon-lg" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>',
    db:       '<svg class="icon icon-lg" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>',
    task:     '<svg class="icon icon-lg" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
    slot:     '<svg class="icon icon-lg" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>',
    gear:     '<svg class="icon icon-lg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0 .33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>',
    crystal:  '<svg class="icon icon-lg" viewBox="0 0 24 24" stroke="currentColor" fill="none"><path d="M12 2a9 9 0 1 0 0 18 9 9 0 0 0 0-18z"></path><path d="M12 6a4 4 0 0 0-4 4"></path><path d="M8 18h8"></path><path d="M10 22h4"></path></svg>',
    target:   '<svg viewBox="0 0 24 24" style="width:1em;height:1em;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>',
    book:     '<svg viewBox="0 0 24 24" style="width:1em;height:1em;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>',
    rocket:   '<svg viewBox="0 0 24 24" style="width:1em;height:1em;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path></svg>',
    archive:  '<svg viewBox="0 0 24 24" style="width:1em;height:1em;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>',
    alert:    '<svg viewBox="0 0 24 24" style="width:1em;height:1em;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
    emptybox: '<svg viewBox="0 0 24 24" style="width:1em;height:1em;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round;"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>',
    link:     '<svg viewBox="0 0 24 24" style="width:1em;height:1em;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>',
    copy:     '<svg viewBox="0 0 24 24" style="width:1em;height:1em;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>',
    import:   '<svg viewBox="0 0 24 24" style="width:1em;height:1em;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>',
    grad:     '<svg class="icon icon-lg" viewBox="0 0 24 24"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>',
    flag:     '<svg viewBox="0 0 24 24" style="width:1em;height:1em;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>',
    star:     '<svg viewBox="0 0 24 24" style="width:1em;height:1em;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>',
    coffee:   '<svg viewBox="0 0 24 24" style="width:1em;height:1em;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>',
    moon:     '<svg viewBox="0 0 24 24" style="width:1em;height:1em;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>',
    off:      '<svg viewBox="0 0 24 24" style="width:1em;height:1em;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>'
};

// --- INJECT ICONS INTO DOM ---
function initIcons() {
    document.getElementById('navHome').innerHTML   = ICONS.home;
    document.getElementById('navStats').innerHTML  = ICONS.stats;
    document.getElementById('navTools').innerHTML  = ICONS.tools;
    document.querySelectorAll('.icon-slot').forEach(e => e.innerHTML     = ICONS.slot);
    document.querySelectorAll('.icon-task').forEach(e => e.innerHTML     = ICONS.task);
    document.querySelectorAll('.icon-chart').forEach(e => e.innerHTML    = ICONS.chart);
    document.querySelectorAll('.icon-list').forEach(e => e.innerHTML     = ICONS.list);
    document.querySelectorAll('.icon-graph').forEach(e => e.innerHTML    = ICONS.graph);
    document.querySelectorAll('.icon-calendar').forEach(e => e.innerHTML = ICONS.calendar);
    document.querySelectorAll('.icon-undo').forEach(e => e.innerHTML     = ICONS.undo);
    document.querySelectorAll('.icon-db').forEach(e => e.innerHTML       = ICONS.db);
    document.querySelectorAll('.icon-close').forEach(e => e.innerHTML    = ICONS.close);
    document.querySelectorAll('.icon-gear').forEach(e => e.innerHTML     = ICONS.gear);
    document.querySelectorAll('.icon-crystal').forEach(e => e.innerHTML  = ICONS.crystal);
    document.querySelectorAll('.icon-target').forEach(e => e.innerHTML   = ICONS.target);
    document.querySelectorAll('.icon-book').forEach(e => e.innerHTML     = ICONS.book);
    document.querySelectorAll('.icon-rocket').forEach(e => e.innerHTML   = ICONS.rocket);
    document.querySelectorAll('.icon-archive').forEach(e => e.innerHTML  = ICONS.archive);
    document.querySelectorAll('.icon-alert').forEach(e => e.innerHTML    = ICONS.alert);
    document.querySelectorAll('.icon-emptybox').forEach(e => e.innerHTML = ICONS.emptybox);
    document.querySelectorAll('.icon-link').forEach(e => e.innerHTML     = ICONS.link);
    document.querySelectorAll('.icon-copy').forEach(e => e.innerHTML     = ICONS.copy);
    document.querySelectorAll('.icon-import').forEach(e => e.innerHTML   = ICONS.import);
    document.querySelectorAll('.icon-grad').forEach(e => e.innerHTML     = ICONS.grad);
    document.querySelectorAll('.icon-flag').forEach(e => e.innerHTML     = ICONS.flag);
    document.querySelectorAll('.icon-star').forEach(e => e.innerHTML     = ICONS.star);
    document.querySelectorAll('.icon-off').forEach(e => e.innerHTML      = ICONS.off);
    document.querySelectorAll('.icon-note').forEach(e => e.innerHTML     = ICONS.note);
}

// --- TOAST NOTIFICATIONS ---
function showToast(msg, type = 'success') {
    const box   = document.getElementById('toastBox');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon  = type === 'success' ? ICONS.check : ICONS.x;
    const color = type === 'success' ? 'var(--green)' : 'var(--red)';
    toast.innerHTML = `<span class="icon-sm" style="color:${color}">${icon}</span> ${msg}`;
    box.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity   = '0';
        toast.style.transform = 'translateY(-20px) scale(0.9)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- CONFIRM MODAL ---
function showConfirm(title, desc, onConfirm) {
    const modal = document.getElementById('confirmModal');
    document.getElementById('confirmTitle').innerText = title;
    document.getElementById('confirmDesc').innerText  = desc;
    modal.style.display = "flex";
    document.getElementById('confirmYesBtn').onclick = () => { onConfirm(); closeConfirm(); };
}
function closeConfirm() { document.getElementById('confirmModal').style.display = "none"; }

// --- PASSWORD MODAL ---
function closePasswordModal() { document.getElementById('passwordModal').style.display = "none"; }

// --- CUSTOM DROPDOWN ENGINE ---
function setupCustomSelects() {
    document.querySelectorAll('.custom-select-source').forEach(select => {
        if (select.parentNode.classList.contains('custom-select-wrapper')) return;
        const wrapper    = document.createElement('div');
        wrapper.className = 'custom-select-wrapper';
        const trigger    = document.createElement('div');
        trigger.className = 'custom-select-trigger';
        trigger.innerHTML = `<span>${select.options[select.selectedIndex]?.text || 'Select...'}</span>`;
        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'custom-options';

        Array.from(select.options).forEach(opt => {
            const optionDiv = document.createElement('div');
            optionDiv.className  = 'custom-option' + (opt.selected ? ' selected' : '');
            optionDiv.innerText  = opt.text;
            optionDiv.setAttribute('data-value', opt.value);
            optionDiv.addEventListener('click', function (e) {
                e.stopPropagation();
                select.value = this.getAttribute('data-value');
                trigger.innerHTML = `<span>${this.innerText}</span>`;
                wrapper.classList.remove('open');
                select.dispatchEvent(new Event('change'));
                optionsDiv.querySelectorAll('.custom-option').forEach(o => o.classList.remove('selected'));
                this.classList.add('selected');
            });
            optionsDiv.appendChild(optionDiv);
        });

        trigger.addEventListener('click', function (e) {
            e.stopPropagation();
            document.querySelectorAll('.custom-select-wrapper.open').forEach(el => {
                if (el !== wrapper) el.classList.remove('open');
            });
            wrapper.classList.toggle('open');
        });

        select.parentNode.insertBefore(wrapper, select.nextSibling);
        wrapper.appendChild(select);
        wrapper.appendChild(trigger);
        wrapper.appendChild(optionsDiv);
    });

    document.addEventListener('click', () => {
        document.querySelectorAll('.custom-select-wrapper.open').forEach(el => el.classList.remove('open'));
    });
}

// --- TAB SWITCHING ---
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-' + tabId).classList.add('active');
    const btns = document.querySelectorAll('.nav-item');
    if (tabId === 'home')  btns[0].classList.add('active');
    if (tabId === 'stats') btns[1].classList.add('active');
    if (tabId === 'tools') btns[2].classList.add('active');
    if (tabId === 'stats') renderCalendar();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- GLOBAL SCROLL LOCK (prevents background scroll when modals are open) ---
function initScrollLock() {
    const allAppModals = document.querySelectorAll('.confirm-overlay, #settingsModal, #onboardingWizard');
    const observer = new MutationObserver(() => {
        const isAnyOpen = [...allAppModals].some(
            m => m.style.display === 'flex' || m.style.display === 'block'
        );
        document.body.style.overflow            = isAnyOpen ? 'hidden' : '';
        document.documentElement.style.overflow = isAnyOpen ? 'hidden' : '';
    });
    allAppModals.forEach(m => observer.observe(m, { attributes: true, attributeFilter: ['style'] }));
}

// --- PULL-TO-REFRESH ---
function initPullToRefresh() {
    let ptrStartY   = 0;
    let ptrCurrentY = 0;
    let isPulling   = false;
    const PTR_THRESHOLD = 80;
    const ptrIndicator  = document.getElementById('ptr-indicator');
    const ptrText       = document.getElementById('ptr-text');

    document.addEventListener('touchstart', (e) => {
        if (!document.getElementById('tab-home').classList.contains('active')) return;
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal && settingsModal.style.display === 'flex') return;
        if (window.scrollY > 5) return;
        ptrStartY = e.touches[0].clientY;
        isPulling = true;
        ptrIndicator.style.transition = 'none';
        ptrIndicator.classList.remove('ptr-ready', 'ptr-spinning');
        ptrText.innerText = "Pull down to refresh";
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
        if (!isPulling) return;
        if (window.scrollY > 5) { isPulling = false; ptrIndicator.style.transform = 'translateY(-100%)'; return; }
        ptrCurrentY = e.touches[0].clientY;
        const pullDistance   = ptrCurrentY - ptrStartY;
        if (pullDistance > 0) {
            const visualDistance = Math.min(pullDistance * 0.35, 120);
            ptrIndicator.style.transform = `translateY(${visualDistance - 60}px)`;
            if (visualDistance >= PTR_THRESHOLD) {
                ptrIndicator.classList.add('ptr-ready');
                ptrText.innerText = "Release to refresh";
            } else {
                ptrIndicator.classList.remove('ptr-ready');
                ptrText.innerText = "Pull down to refresh";
            }
        }
    }, { passive: true });

    document.addEventListener('touchend', () => {
        if (!isPulling) return;
        isPulling = false;
        const pullDistance   = ptrCurrentY - ptrStartY;
        const visualDistance = pullDistance * 0.35;
        ptrIndicator.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
        if (visualDistance >= PTR_THRESHOLD) {
            ptrIndicator.classList.remove('ptr-ready');
            ptrIndicator.classList.add('ptr-spinning');
            ptrText.innerText = "Refreshing...";
            ptrIndicator.style.transform = 'translateY(25px)';
            setTimeout(() => {
                render();
                showToast("Refreshed");
                ptrIndicator.style.transform = 'translateY(-100%)';
                setTimeout(() => ptrIndicator.classList.remove('ptr-spinning'), 400);
            }, 800);
        } else {
            ptrIndicator.style.transform = 'translateY(-100%)';
        }
        ptrStartY   = 0;
        ptrCurrentY = 0;
    });
}
