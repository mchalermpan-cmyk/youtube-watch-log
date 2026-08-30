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
let appConfig = null;

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

  appConfig = config;
  supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);

  bindEvents();
  await loadRows();
}

function extractVideoId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    if (u.searchParams.get("v")) return u.searchParams.get("v");
    const match = u.pathname.match(/\/(shorts|embed)\/([^/?]+)/);
    if (match) return match[2];
  } catch (e) {
    /* invalid URL, fall through */
  }
  return null;
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
    let gotDate = false;

    if (appConfig?.YOUTUBE_API_KEY) {
      const videoId = extractVideoId(url);
      if (videoId) {
        const apiRes = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${appConfig.YOUTUBE_API_KEY}`
        );
        if (apiRes.ok) {
          const apiData = await apiRes.json();
          const item = apiData.items && apiData.items[0];
          if (item) {
            els.title.value = item.snippet.title;
            els.channel.value = item.snippet.channelTitle;
            if (item.snippet.publishedAt) {
              els.videoDate.value = item.snippet.publishedAt.slice(0, 10);
              gotDate = true;
            }
          }
        }
      }
    }

    if (!els.title.value || !els.channel.value) {
      const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
      if (!res.ok) throw new Error("oembed failed");
      const data = await res.json();
      if (data.title) els.title.value = data.title;
      if (data.author_name) els.channel.value = data.author_name;
    }

    setMsg(
      gotDate
        ? "ดึงข้อมูลและวันที่เผยแพร่สำเร็จ — ตรวจสอบสถานะแล้วกดบันทึก"
        : "ดึงชื่อวิดีโอ/ชื่อช่องสำเร็จ
