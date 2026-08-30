import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const STATUS_LABEL = {
  not_watched: "ยังไม่ได้ดู",
  watching: "กำลังดู",
  watched: "ดูจบแล้ว",
};

const els = {
  configWarning: document.getElementById("configWarning"),
  tally: document.getElementById("tally"),
  form: document.getElementById("entryForm"),
  url: document.getElementById("url"),
  title: document.getElementById("title"),
  channel: document.getElementById("channel"),
  videoDate: document.getElementById("videoDate"),
  statusPicker: document.getElementById("statusPicker"),
  submitBtn: document.getElementById("submitBtn"),
  cancelEditBtn: document.getElementById("cancelEditBtn"),
  formMsg: document.getElementById("formMsg"),
  editId: document.getElementById("editId"),
  fetchInfoBtn: document.getElementById("fetchInfoBtn"),
  filters: document.getElementById("filters"),
  log: document.getElementById("log"),
};

let selectedStatus = "not_watched";
let activeFilter = "all";
let rows = [];
let supabase = null;

init();

async function init() {
  let config;
  try {
    config = await import("./config.js");
  } catch (e) {
    showConfigWarning();
    return;
  }

  if (!config.SUPABASE_URL || config.SUPABASE_URL.includes("YOUR-PROJECT-REF")) {
    showConfigWarning();
    return;
  }

  supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);

  bindEvents();
  await loadRows();
}

function showConfigWarning() {
  els.configWarning.innerHTML = `
    <div class="config-warning">
      ยังไม่ได้ตั้งค่า Supabase — คัดลอก <code>config.example.js</code> เป็น <code>config.js</code>
      แล้วใส่ค่า Project URL และ anon key จาก Supabase Dashboard &gt; Settings &gt; API
    </div>`;
  els.log.innerHTML = "";
}

function bindEvents() {
  els.statusPicker.addEventListener("click", (e) => {
    const btn = e.target.closest(".status-chip");
    if (!btn) return;
    selectedStatus = btn.dataset.status;
    [...els.statusPicker.children].forEach((c) => c.classList.toggle("active", c === btn));
  });

  els.filters.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-chip");
    if (!btn) return;
    activeFilter = btn.dataset.filter;
    [...els.filters.children].forEach((c) => c.classList.toggle("active", c === btn));
    render();
  });

  els.fetchInfoBtn.addEventListener("click", fetchVideoInfo);
  els.form.addEventListener("submit", handleSubmit);
  els.cancelEditBtn.addEventListener("click", resetForm);

  els.log.addEventListener("click", (e) => {
    const editBtn = e.target.closest("[data-edit]");
    const delBtn = e.target.closest("[data-delete]");
    const cycleBtn = e.target.closest("[data-cycle]");
    if (editBtn) startEdit(editBtn.dataset.edit);
    if (delBtn) handleDelete(delBtn.dataset.delete);
    if (cycleBtn) handleCycleStatus(cycleBtn.dataset.cycle);
  });
}

async function fetchVideoInfo() {
  const url = els.url.value.trim();
  if (!url) return;
  els.fetchInfoBtn.disabled = true;
  els.fetchInfoBtn.textContent = "กำลังดึงข้อมูล…";
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
    if (!res.ok) throw new Error("oembed failed");
    const data = await res.json();
    if (data.title) els.title.value = data.title;
    if (data.author_name) els.channel.value = data.author_name;
    setMsg("ดึงข้อมูลสำเร็จ — ตรวจสอบวันที่และสถานะแล้วกดบันทึก", "ok");
  } catch (e) {
    setMsg("ดึงข้อมูลอัตโนมัติไม่สำเร็จ กรุณากรอกชื่อวิดีโอและชื่อช่องเอง", "error");
  } finally {
    els.fetchInfoBtn.disabled = false;
    els.fetchInfoBtn.textContent = "ดึงข้อมูลอัตโนมัติ";
  }
}

async function loadRows() {
  const { data, error } = await supabase
    .from("youtube_videos")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    els.log.innerHTML = `<div class="empty-state">โหลดข้อมูลไม่สำเร็จ: ${escapeHtml(error.message)}</div>`;
    return;
  }
  rows = data;
  render();
}

function render() {
  updateTally();

  const filtered = activeFilter === "all" ? rows : rows.filter((r) => r.status === activeFilter);

  if (filtered.length === 0) {
    els.log.innerHTML = `<div class="empty-state">ยังไม่มีรายการในหมวดนี้</div>`;
    return;
  }

  els.log.innerHTML = filtered
    .map(
      (r, i) => `
    <article class="ticket" data-status="${r.status}">
      <span class="ticket-index">${String(i + 1).padStart(2, "0")}</span>
      <div class="ticket-body">
        <a class="ticket-title" href="${escapeAttr(r.youtube_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(r.title)}</a>
        <div class="ticket-meta">
          <span>${escapeHtml(r.channel)}</span>
          ${r.video_date ? `<span class="dot">${formatDate(r.video_date)}</span>` : ""}
          <button class="stamp" data-status="${r.status}" data-cycle="${r.id}" title="คลิกเพื่อเปลี่ยนสถานะ">${STATUS_LABEL[r.status]}</button>
        </div>
      </div>
      <div class="ticket-actions">
        <button class="icon-btn" data-edit="${r.id}" title="แก้ไข" aria-label="แก้ไข">✎</button>
        <button class="icon-btn danger" data-delete="${r.id}" title="ลบ" aria-label="ลบ">✕</button>
      </div>
    </article>`
    )
    .join("");
}

function updateTally() {
  const counts = { not_watched: 0, watching: 0, watched: 0 };
  rows.forEach((r) => counts[r.status]++);
  els.tally.innerHTML = `
    <span><b>${rows.length}</b> ทั้งหมด</span>
    <span><b>${counts.watching}</b> กำลังดู</span>
    <span><b>${counts.watched}</b> ดูจบแล้ว</span>
  `;
}

async function handleSubmit(e) {
  e.preventDefault();
  const payload = {
    youtube_url: els.url.value.trim(),
    title: els.title.value.trim(),
    channel: els.channel.value.trim(),
    video_date: els.videoDate.value || null,
    status: selectedStatus,
  };

  if (!payload.youtube_url || !payload.title || !payload.channel) {
    setMsg("กรุณากรอกลิงก์ ชื่อวิดีโอ และชื่อช่องให้ครบ", "error");
    return;
  }

  els.submitBtn.disabled = true;
  const editId = els.editId.value;

  const { error } = editId
    ? await supabase.from("youtube_videos").update(payload).eq("id", editId)
    : await supabase.from("youtube_videos").insert(payload);

  els.submitBtn.disabled = false;

  if (error) {
    setMsg(`บันทึกไม่สำเร็จ: ${error.message}`, "error");
    return;
  }

  setMsg(editId ? "แก้ไขรายการเรียบร้อย" : "เพิ่มรายการเรียบร้อย", "ok");
  resetForm();
  await loadRows();
}

function startEdit(id) {
  const row = rows.find((r) => r.id === id);
  if (!row) return;
  els.url.value = row.youtube_url;
  els.title.value = row.title;
  els.channel.value = row.channel;
  els.videoDate.value = row.video_date || "";
  selectedStatus = row.status;
  [...els.statusPicker.children].forEach((c) => c.classList.toggle("active", c.dataset.status === row.status));
  els.editId.value = row.id;
  els.submitBtn.textContent = "บันทึกการแก้ไข";
  els.cancelEditBtn.style.display = "inline-block";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function handleDelete(id) {
  if (!confirm("ลบรายการนี้ออกจากบันทึกใช่หรือไม่?")) return;
  const { error } = await supabase.from("youtube_videos").delete().eq("id", id);
  if (error) {
    setMsg(`ลบไม่สำเร็จ: ${error.message}`, "error");
    return;
  }
  await loadRows();
}

async function handleCycleStatus(id) {
  const order = ["not_watched", "watching", "watched"];
  const row = rows.find((r) => r.id === id);
  if (!row) return;
  const next = order[(order.indexOf(row.status) + 1) % order.length];
  const { error } = await supabase.from("youtube_videos").update({ status: next }).eq("id", id);
  if (error) return;
  await loadRows();
}

function resetForm() {
  els.form.reset();
  els.editId.value = "";
  selectedStatus = "not_watched";
  [...els.statusPicker.children].forEach((c) => c.classList.toggle("active", c.dataset.status === "not_watched"));
  els.submitBtn.textContent = "+ เพิ่มลงบันทึก";
  els.cancelEditBtn.style.display = "none";
}

function setMsg(text, kind) {
  els.formMsg.textContent = text;
  els.formMsg.className = `form-msg ${kind}`;
  setTimeout(() => {
    els.formMsg.textContent = "";
    els.formMsg.className = "form-msg";
  }, 4000);
}

function formatDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" });
}

function escapeHtml(str = "") {
  return str.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function escapeAttr(str = "") {
  return escapeHtml(str);
}
