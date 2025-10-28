document.addEventListener("DOMContentLoaded", () => {
    const $ = (s) => document.querySelector(s);
    const pad = (n) => String(n).padStart(2, "0");
    const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

    const listEl = $("#list");
    const clockEl = $(".clock");
    const statusSummaryEl = $("#status-summary");
    const newBtn = $("#new-mission");
    const composer = $("#composer");
    const composerContent = $("#composer-content");

    const STORAGE_KEY = "missions.v1";
    let missions = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    let composerOpen = false;
    let pending = { title: "", importance: "" };

    const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(missions));

    function updateStatusSummary() {
        if (!statusSummaryEl) return;
        const c = missions.reduce((a, m) => {
            const k = (m.priority || "Standard").toLowerCase();
            a[k] = (a[k] || 0) + 1;
            return a;
        }, { standard: 0, low: 0, critical: 0 });
        statusSummaryEl.innerHTML = `
      <span><strong>${plural(c.standard, "Standard task")}</strong></span>
      <span><strong>${plural(c.low, "Low task")}</strong></span>
      <span><strong>${plural(c.critical, "Critical task")}</strong></span>`;
    }

    function updateSystemStatus() {
        const sysEl = document.querySelector(".sys");
        if (!sysEl) return;
        if (missions.length === 0) {
            sysEl.textContent = "[STANDBY]";
            sysEl.classList.remove("online");
            sysEl.classList.add("standby");
        } else {
            sysEl.textContent = "[ONLINE]";
            sysEl.classList.remove("standby");
            sysEl.classList.add("online");
        }
    }

    function render() {
        if (!listEl) return;
        listEl.innerHTML = "";
        missions.forEach((m) => {
            const li = document.createElement("li");
            li.innerHTML = `
        <label>
          <input type="checkbox" data-id="${m.id}" ${m.done ? "checked" : ""}>
          <strong class="${m.done ? "done" : ""}">${m.title}</strong>
          — <em>${m.priority}</em>
        </label>
        <div class="actions">
          <button type="button" data-edit="${m.id}" title="Edit Mission">✎</button>
          <button type="button" data-del="${m.id}" title="Delete Mission">✕</button>
        </div>
      `;
            listEl.appendChild(li);
        });
        updateSystemStatus();
        updateStatusSummary();
    }

    function tick() {
        if (!clockEl) return;
        const d = new Date();
        clockEl.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }
    tick();
    setInterval(tick, 1000);

    if (listEl) {
        listEl.addEventListener("change", (e) => {
            const cb = e.target.closest("input[type='checkbox'][data-id]");
            if (!cb) return;
            const id = cb.dataset.id;
            const m = missions.find((x) => x.id === id);
            if (!m) return;
            m.done = cb.checked;
            save();
            render();
        });

        listEl.addEventListener("click", (e) => {
            const editBtn = e.target.closest("button[data-edit]");
            if (editBtn) {
                const id = editBtn.dataset.edit;
                openEdit(id);
                return;
            }

            const delBtn = e.target.closest("button[data-del]");
            if (delBtn) {
                const id = delBtn.dataset.del;
                missions = missions.filter((x) => x.id !== id);
                save();
                render();
                return;
            }
        });
    }

    function openComposer(step = "title") {
        if (composerOpen) return;
        composerOpen = true;
        composer.hidden = false;
        pending = { title: "", importance: "" };
        (step === "title" ? renderTitleStep : renderImportanceStep)();
        sfx("open");
    }

    function closeComposer() {
        if (!composerOpen) return;
        composerOpen = false;
        sfx("close");
        composerContent.innerHTML = "";
        composer.hidden = true;
    }

    function renderTitleStep() {
        composerContent.innerHTML = `
      <label style="display:block;margin-bottom:6px;color:#9fb0c9;font-size:12px;letter-spacing:.08em">Mission title</label>
      <input id="composer-title" type="text" placeholder="Create your new mission task here...">
      <button id="composer-next" style="margin-top:8px">Next →</button>`;
        const input = $("#composer-title");
        const next = $("#composer-next");
        const go = () => {
            const val = input.value.trim();
            if (!val) return;
            pending.title = val;
            renderImportanceStep();
        };
        input.focus();
        next.addEventListener("click", go, { once: true });
        input.addEventListener("keydown", (e) => e.key === "Enter" && go(), { once: true });
    }

    function renderImportanceStep() {
        composerContent.innerHTML = `
      <label style="display:block;margin-bottom:6px;color:#9fb0c9;font-size:12px;letter-spacing:.08em">Importance</label>
      <select id="composer-imp"
        style="width:100%;background:#0f1b2f;color:#e6f3ff;border:1px solid #284068;border-radius:10px;padding:10px 12px;">
        <option value="Standard" selected>Standard</option>
        <option value="Critical">Critical</option>
        <option value="Low">Low</option>
      </select>
      <button id="composer-add" style="margin-top:8px">Add →</button>`;
        const sel = $("#composer-imp");
        const add = $("#composer-add");
        const addNow = () => {
            pending.importance = sel.value || "Standard";
            addMission();
        };
        sel.focus();
        add.addEventListener("click", addNow, { once: true });
        sel.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                addNow();
            }
        }, { once: true });
    }

    function addMission() {
        const id = crypto?.randomUUID?.() ?? `m-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        missions.push({
            id,
            title: (pending.title || "Untitled Mission").trim(),
            priority: pending.importance || "Standard",
            done: false
        });
        save();
        render();
        sfx("confirm");
        closeComposer();
    }

    function openEdit(id) {
        const m = missions.find(x => x.id === id);
        if (!m) return;

        composerOpen = true;
        composer.hidden = false;

        composerContent.innerHTML = `
      <label style="display:block;margin-bottom:6px;color:#9fb0c9;font-size:12px;letter-spacing:.08em">Edit Mission Title</label>
      <input id="composer-edit-title" type="text">
      <label style="display:block;margin:10px 0 6px;color:#9fb0c9;font-size:12px;letter-spacing:.08em">Importance</label>
      <select id="composer-edit-priority"
        style="width:100%;background:#0f1b2f;color:#e6f3ff;border:1px solid #284068;border-radius:10px;padding:10px 12px;">
        <option value="Standard">Standard</option>
        <option value="Critical">Critical</option>
        <option value="Low">Low</option>
      </select>
      <button id="composer-save-edit" style="margin-top:10px">Save Changes</button>
    `;

        const titleInput = $("#composer-edit-title");
        const prioSelect = $("#composer-edit-priority");
        const saveBtn = $("#composer-save-edit");

        titleInput.value = m.title;
        prioSelect.value = m.priority || "Standard";
        titleInput.focus();

        const saveChanges = () => {
            const newTitle = titleInput.value.trim();
            if (!newTitle) return;
            m.title = newTitle;
            m.priority = prioSelect.value || "Standard";
            save();
            render();
            sfx("confirm");
            closeComposer();
        };

        saveBtn.addEventListener("click", saveChanges, { once: true });
        titleInput.addEventListener("keydown", (e) => e.key === "Enter" && saveChanges());
    }

    composer.addEventListener("click", (e) => {
        if (e.target === composer && composerOpen) closeComposer();
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && composerOpen) closeComposer();
    });

    // ---- SFX ----
    let audioCtx = null;
    function ensureAudio() {
        if (!audioCtx) {
            try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch { }
        }
        if (audioCtx && audioCtx.state === "suspended") {
            audioCtx.resume().catch(() => { });
        }
    }
    function sfx(kind = "open") {
        try {
            if (!audioCtx || audioCtx.state !== "running") return;
            const now = audioCtx.currentTime;
            const o = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            o.connect(g);
            g.connect(audioCtx.destination);
            g.gain.setValueAtTime(0.0001, now);
            g.gain.exponentialRampToValueAtTime(0.1, now + 0.25);
            g.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
            o.start(now);

            if (kind === "open") {
                o.type = "triangle";
                o.frequency.setValueAtTime(200, now);
                o.frequency.linearRampToValueAtTime(600, now + 0.12);
                o.stop(now + 0.25);
            } else if (kind === "confirm") {
                o.type = "square";
                o.frequency.setValueAtTime(450, now);
                o.frequency.linearRampToValueAtTime(850, now + 0.1);
                o.stop(now + 0.25);
            } else if (kind === "close") {
                o.type = "sine";
                o.frequency.setValueAtTime(300, now);
                o.frequency.linearRampToValueAtTime(180, now + 0.1);
                o.stop(now + 0.25);
            }
        } catch (err) {
            console.warn("sfx error:", err);
        }
    }
    const initAudioOnce = () => {
        ensureAudio();
        document.removeEventListener("pointerdown", initAudioOnce);
        document.removeEventListener("keydown", initAudioOnce);
    };
    document.addEventListener("pointerdown", initAudioOnce, { once: true });
    document.addEventListener("keydown", initAudioOnce, { once: true });

    newBtn.addEventListener("click", (e) => {
        e.preventDefault();
        ensureAudio();
        openComposer("title");
    });

    document.querySelector("#clear-completed")?.addEventListener("click", () => {
        missions = missions.filter(m => !m.done);
        save();
        render();
        sfx("close");
    });

    render();
});
