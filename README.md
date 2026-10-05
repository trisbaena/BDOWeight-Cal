# คำนวณน้ำหนักบรรทุกเรือ

เว็บแอปแบบ static (HTML + CSS + JavaScript) ไม่ต้อง build ไม่ต้องติดตั้งอะไร

## ใช้งานในเครื่อง
เปิดไฟล์ `index.html` ด้วยเบราว์เซอร์ หรือรัน `npx serve .`

## อัปขึ้น GitHub
1. สร้าง repository ใหม่บน github.com
2. อัปโหลดไฟล์ทั้งหมดในโฟลเดอร์นี้ (ลากไปวางในหน้า repository ได้เลย)

## Deploy ขึ้น Vercel
1. เข้า vercel.com > Add New > Project
2. เลือก repository ที่สร้างไว้ แล้วกด Deploy
   - Framework Preset: Other, ไม่ต้องใส่ Build Command หรือ Output Directory

## ปรับแต่ง
ค่าต่างๆ อยู่ที่ต้นไฟล์ `app.js` : `TIER_WEIGHT` (น้ำหนักต่อ Tier) และ `LEVELS` (เกณฑ์ 100/125/150%)
