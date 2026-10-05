// ---------- ตั้งค่า ----------
const ROWS = 4;
// น้ำหนักต่อชิ้นตาม Tier (Tier 4-7 = 1,000 LT)
const TIER_WEIGHT = { 1: 100, 2: 400, 3: 900, 4: 1000, 5: 1000, 6: 1000, 7: 1000 };
// เกณฑ์สถานะ: max = สัดส่วนสูงสุดของน้ำหนักเรือ (100% = น้ำหนักเรือปัจจุบัน)
const LEVELS = [
  { max: 1.0,      pct: "≤100%",   label: "ปกติ" },
  { max: 1.25,     pct: "101-125%", label: "ช้าลงเล็กน้อย" },
  { max: 1.5,      pct: "126-150%", label: "ช้าลงมาก" },
  { max: Infinity, pct: ">150%",    label: "แทบเคลื่อนที่ไม่ได้" },
];
const KEY = "ship-weight-v1";
const fmt = (n) => Number(n).toLocaleString("en-US");

// ---------- สถานะเริ่มต้น ----------
const DEFAULT = {
  capacity: 17900,
  rows: [
    { on: false, tier: 3, qty: 10, got: 3 },
    { on: false, tier: 4, qty: 4,  got: 1 },
    { on: true,  tier: 4, qty: 3,  got: 1 },
    { on: true,  tier: 7, qty: 5,  got: 3 },
  ],
};
let state;
try { state = JSON.parse(localStorage.getItem(KEY)) || structuredClone(DEFAULT); }
catch { state = structuredClone(DEFAULT); }
if (!state.rows || state.rows.length !== ROWS) state = structuredClone(DEFAULT);

const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} };
const $ = (id) => document.getElementById(id);
const options = (from, to, sel) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i)
    .map((v) => `<option value="${v}"${v === sel ? " selected" : ""}>${v}</option>`).join("");

// ---------- วาดตาราง ----------
const tbody = $("rows");
state.rows.forEach((r, i) => {
  const tr = document.createElement("tr");
  tr.dataset.i = i;
  tr.innerHTML = `
    <td class="c-use"><input type="checkbox" data-f="on" aria-label="ใช้งานแถว ${i + 1}" ${r.on ? "checked" : ""}></td>
    <td class="c-tier"><select data-f="tier" aria-label="Tier">${options(1, 7, r.tier)}</select></td>
    <td class="c-qty"><select data-f="qty" aria-label="นำขึ้นเรือ">${options(1, 30, r.qty)}</select></td>
    <td class="c-unit num" data-o="unit"></td>
    <td class="c-before num" data-o="before"></td>
    <td class="c-out"><select data-f="got" aria-label="จำนวนที่ได้">${options(1, 10, r.got)}</select></td>
    <td class="c-after num" data-o="after"></td>`;
  tbody.appendChild(tr);
});

const lv = document.querySelector("#levels tbody");
LEVELS.forEach((l, i) => {
  const lo = i === 0 ? 0 : Math.round(state.capacity * LEVELS[i - 1].max) + 1;
  const tr = document.createElement("tr");
  tr.innerHTML = `<td data-r="range"></td><td>${l.pct}</td><td>${l.label}</td>`;
  lv.appendChild(tr);
});

$("capacity").value = state.capacity;

// ---------- คำนวณ ----------
function update() {
  let sumBefore = 0, sumAfter = 0;
  state.rows.forEach((r, i) => {
    const unit = TIER_WEIGHT[r.tier] ?? 0;
    const before = r.on ? unit * r.qty : 0;   // =IF(ใช้งาน, น้ำหนักต่อชิ้น × จำนวน, 0)
    const after = before * r.got;              // น้ำหนักก่อนเทรด × จำนวนที่ได้
    sumBefore += before; sumAfter += after;
    const tr = tbody.children[i];
    tr.classList.toggle("off", !r.on);
    tr.querySelector('[data-o="unit"]').textContent = `${fmt(unit)} LT`;
    tr.querySelector('[data-o="before"]').textContent = fmt(before);
    tr.querySelector('[data-o="after"]').textContent = fmt(after);
  });
  $("sumBefore").textContent = fmt(sumBefore);
  $("sumAfter").textContent = fmt(sumAfter);

  const cap = state.capacity > 0 ? state.capacity : 0;
  const ratio = cap ? sumAfter / cap : 0;
  const excess = sumAfter - cap;
  const over = cap > 0 && excess > 0;
  const idx = LEVELS.findIndex((l) => ratio <= l.max);

  $("pct").textContent = `${Math.round(ratio * 100)}%`;
  const fill = $("fill");
  fill.style.width = `${Math.min(ratio, 1) * 100}%`;
  fill.classList.toggle("over", over);
  document.querySelector(".bar").setAttribute("aria-valuenow", Math.round(Math.min(ratio, 1) * 100));

  const msg = $("message");
  msg.className = `message ${over ? "over" : "ok"}`;
  msg.textContent = over
    ? `น้ำหนักเกินมา ${fmt(excess)} LT  สถานะเรือ : ${LEVELS[idx].label}`
    : "สถานะเรือ : น้ำหนักปกติ";

  // ไฮไลต์ตารางด้านข้างเฉพาะตอนน้ำหนักเกิน (ไม่ไฮไลต์แถว "ปกติ")
  [...lv.children].forEach((tr, i) => {
    tr.classList.toggle("hit", over && i === idx && i > 0);
    const lo = i === 0 ? 0 : Math.floor(cap * LEVELS[i - 1].max) + 1;
    const hi = LEVELS[i].max === Infinity ? null : Math.floor(cap * LEVELS[i].max);
    tr.querySelector('[data-r="range"]').textContent =
      i === 0 ? `ไม่เกิน ${fmt(hi)} LT` : hi === null ? `มากกว่า ${fmt(lo - 1)} LT` : `${fmt(lo)}-${fmt(hi)} LT`;
  });
}

// ---------- เหตุการณ์ ----------
tbody.addEventListener("input", (e) => {
  const f = e.target.dataset.f; if (!f) return;
  const r = state.rows[e.target.closest("tr").dataset.i];
  r[f] = f === "on" ? e.target.checked : Number(e.target.value);
  save(); update();
});
$("capacity").addEventListener("input", (e) => {
  state.capacity = Math.max(0, Number(e.target.value) || 0);
  save(); update();
});

update();
