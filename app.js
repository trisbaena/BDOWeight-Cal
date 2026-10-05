// ---------- ตั้งค่า ----------
const ROWS = 4;
const MAX_QTY = 10;  // ลิมิตนำขึ้นเรือ (ชิ้น)
const MAX_RATE = 3;  // ลิมิตจำนวนแลกเปลี่ยน
// น้ำหนักต่อชิ้นตาม Tier (Tier 4-7 = 1,000 LT)
const TIER_WEIGHT = { 1: 100, 2: 400, 3: 900, 4: 1000, 5: 1000, 6: 1000, 7: 1000 };
// เกณฑ์สถานะ: max = สัดส่วนสูงสุดของน้ำหนักเรือ (100% = น้ำหนักเรือปัจจุบัน)
const LEVELS = [
  { max: 1.0,      pct: "≤100%",   label: "ปกติ" },
  { max: 1.25,     pct: "101-125%", label: "ช้าลงเล็กน้อย" },
  { max: 1.5,      pct: "126-150%", label: "ช้าลงปานกลาง" },
  { max: Infinity, pct: ">150%",    label: "ช้าลงมากที่สุด" },
];
const KEY = "ship-weight-v1"; // ข้อมูลที่กรอกจะถูกเก็บใน localStorage ของเบราว์เซอร์ด้วยคีย์นี้
const fmt = (n) => Number(n).toLocaleString("en-US");

// ---------- สถานะเริ่มต้น ----------
const DEFAULT = {
  capacity: 17900,
  crew: 0,
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
state.rows.forEach((r) => { // ปรับค่าที่เคยบันทึกไว้ให้อยู่ในลิมิต
  r.qty = Math.min(Math.max(Number(r.qty) || 1, 1), MAX_QTY);
  r.got = Math.min(Math.max(Number(r.got) || 1, 1), MAX_RATE);
});
state.crew = Number(state.crew) || 0; // รองรับข้อมูลเก่าที่ยังไม่มีน้ำหนักลูกเรือ

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
    <td class="c-qty"><select data-f="qty" aria-label="นำขึ้นเรือ">${options(1, MAX_QTY, r.qty)}</select></td>
    <td class="c-unit num" data-o="unit"></td>
    <td class="c-before num" data-o="before"></td>
    <td class="c-out"><select data-f="got" aria-label="จำนวนแลกเปลี่ยน">${options(1, MAX_RATE, r.got)}</select></td>
    <td class="c-after num" data-o="after"></td>
    <td class="c-recv num" data-o="recv"></td>`;
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
$("crew").value = state.crew;

// ---------- คำนวณ ----------
function update() {
  let sumBefore = 0, sumAfter = 0, sumRecv = 0;
  state.rows.forEach((r, i) => {
    const unit = TIER_WEIGHT[r.tier] ?? 0;
    const before = r.on ? unit * r.qty : 0;   // =IF(ใช้งาน, น้ำหนักต่อชิ้น × จำนวน, 0)
    // อัตราแลกเปลี่ยน 1 : n  → นำขึ้นเรือ 10 ชิ้น, อัตรา 3 = ได้รับกลับมา 30 ชิ้น
    const recv = r.on ? r.qty * r.got : 0;
    // ของที่ได้รับกลับมาเป็น Tier ถัดไป (Tier + 1) เช่น Tier 2 → Tier 3 (900 LT)
    const unitOut = TIER_WEIGHT[r.tier + 1] ?? TIER_WEIGHT[7];
    const after = recv * unitOut;              // น้ำหนักหลังเทรด = จำนวนที่ได้รับ × น้ำหนักต่อชิ้นของ Tier ถัดไป
    sumBefore += before; sumAfter += after; sumRecv += recv;
    const tr = tbody.children[i];
    tr.classList.toggle("off", !r.on);
    tr.querySelector('[data-o="unit"]').textContent = `${fmt(unit)} LT`;
    tr.querySelector('[data-o="before"]').textContent = fmt(before);
    tr.querySelector('[data-o="after"]').textContent = fmt(after);
    tr.querySelector('[data-o="recv"]').textContent = fmt(recv);
  });
  // ยอดรวม = ผลรวมทุกแถว + น้ำหนักลูกเรือ (เหมือน E13 และ G13 ในชีต)
  sumBefore += state.crew; sumAfter += state.crew;
  $("sumBefore").textContent = fmt(sumBefore);
  $("sumAfter").textContent = fmt(sumAfter);
  $("sumRecv").textContent = fmt(sumRecv);

  const cap = state.capacity > 0 ? state.capacity : 0;
  const load = sumAfter;                     // รวมน้ำหนักลูกเรือแล้ว
  const ratio = cap ? load / cap : 0;
  const excess = load - cap;
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
$("crew").addEventListener("input", (e) => {
  state.crew = Math.max(0, Number(e.target.value) || 0);
  save(); update();
});
window.addEventListener("pagehide", save);

update();
