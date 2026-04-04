// ============================================================
//  APP.JS — Bootstrap: wires up all modules and starts the app
// ============================================================

window.onload = function () {
    // 1. Inject SVG icons into the DOM
    initIcons();

    // 2. Activate global scroll lock for modals
    initScrollLock();

    // 3. Activate pull-to-refresh on Home tab
    initPullToRefresh();

    // 4. Wire up the note save button
    document.getElementById('saveNoteBtn').onclick = function () {
        const text = document.getElementById('noteInput').value.trim();
        if (text) {
            data.tasks.push({ id: Date.now(), text, subject: currentNoteSubject, date: dateKey, done: false });
            save();
            renderTasks();
            showToast("Note Added");
            closeNoteModal();
        } else {
            showToast("Please enter text", "error");
        }
    };

    // 5. Splash screen → onboarding or main render
    const splash = document.getElementById('app-splash');
    setTimeout(() => {
        splash.style.opacity    = '0';
        splash.style.visibility = 'hidden';
        if (isFirstRun()) {
            launchOnboarding();
        } else {
            render();
        }
    }, 1500);

    // 6. Init extra subject dropdown
    initExtra();

    // 7. Start background attendance reminder check
    startBackgroundCheck();
};
