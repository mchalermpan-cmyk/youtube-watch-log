# Watch Log — บันทึกลิงก์ YouTube

เว็บแอป CRUD สำหรับบันทึกลิงก์ YouTube พร้อมชื่อวิดีโอ ชื่อช่อง วันที่ และสถานะการดู
(ยังไม่ได้ดู / กำลังดู / ดูจบแล้ว) เก็บข้อมูลบน Supabase เป็นไฟล์ HTML/CSS/JS ล้วน
ไม่ต้อง build จึงดีพลอยขึ้น Vercel ได้ทันที

## โครงสร้างไฟล์

```
index.html          หน้าเว็บหลัก
style.css           ดีไซน์ทั้งหมด
app.js              โค้ด CRUD + เชื่อมต่อ Supabase + ดึงข้อมูลวิดีโออัตโนมัติ
config.example.js   ตัวอย่างไฟล์ config (คัดลอกเป็น config.js)
supabase-schema.sql SQL สำหรับสร้างตารางใน Supabase
vercel.json         ตั้งค่า Vercel เล็กน้อย
```

## 1) ตั้งค่า Supabase

1. สร้างโปรเจกต์ใหม่ที่ https://supabase.com
2. ไปที่ **SQL Editor** แล้ววางเนื้อหาไฟล์ `supabase-schema.sql` ทั้งหมด กด Run
   จะได้ตาราง `youtube_videos` พร้อม Row Level Security และ policy ให้อ่าน/เขียนได้
3. ไปที่ **Project Settings > API** คัดลอกค่า:
   - `Project URL`
   - `anon public key`
4. ในโปรเจกต์นี้ คัดลอกไฟล์ `config.example.js` เป็น `config.js` แล้ววางค่าที่คัดลอกมา:

```js
export const SUPABASE_URL = "https://xxxxxxxx.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOi...";
```

`config.js` ถูกใส่ไว้ใน `.gitignore` แล้ว จะได้ไม่หลุดขึ้น GitHub โดยไม่ตั้งใจ
(อ่านหัวข้อ "ความปลอดภัย" ด้านล่างเพิ่มเติม)

## 2) รันทดสอบในเครื่อง

ไฟล์เป็น ES module จึงต้องรันผ่าน local server (เปิดเป็นไฟล์ตรง ๆ จะติด CORS):

```bash
npx serve .
# หรือ
python3 -m http.server 5500
```

แล้วเปิด http://localhost:5500 (หรือ port ที่ระบบแจ้ง)

## 3) เก็บโค้ดขึ้น GitHub

```bash
git init
git add .
git commit -m "Initial commit: YouTube watch log CRUD app"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

> ตรวจสอบว่า `config.js` (มีคีย์ Supabase) ไม่ถูก commit ขึ้นไป — ไฟล์นี้อยู่ใน `.gitignore` แล้ว

## 4) ดีพลอยขึ้น Vercel

1. เข้า https://vercel.com แล้วกด **Add New > Project**
2. เลือก import จาก repository GitHub ที่เพิ่ง push
3. Framework Preset เลือก **Other** (เป็นไฟล์ static ล้วน ไม่ต้อง build)
4. เนื่องจาก `config.js` ไม่ได้อยู่ใน git คุณมี 2 ทางเลือก:
   - **ทางเลือกง่ายที่สุด**: เพิ่มไฟล์ `config.js` เข้าไปใน repo จริง ๆ (ลบออกจาก
     `.gitignore`) เหมาะกับโปรเจกต์ส่วนตัว/เดโมที่ไม่ซีเรียสเรื่องซ่อนคีย์ เพราะ
     anon key ของ Supabase ถูกออกแบบมาให้เปิดเผยได้ฝั่ง client อยู่แล้ว (ความปลอดภัย
     จริงมาจาก Row Level Security ที่ตั้งไว้ใน schema)
   - **ทางเลือกที่ปลอดภัยกว่า**: ใช้ Vercel Build Step เล็ก ๆ เพื่อ generate
     `config.js` จาก Environment Variables ตอน build (ต้องเพิ่ม build script ซึ่ง
     นอกเหนือขอบเขตไฟล์ static ชุดนี้ — บอกได้หากต้องการให้ทำเวอร์ชันนี้เพิ่ม)
5. กด **Deploy** — เสร็จแล้วจะได้ URL เช่น `your-app.vercel.app`

## การใช้งาน

- ใส่ลิงก์ YouTube แล้วกด **"ดึงข้อมูลอัตโนมัติ"** เพื่อดึงชื่อวิดีโอและชื่อช่องมาเติมให้
  (ถ้าดึงไม่สำเร็จให้กรอกเองได้ตามปกติ)
- เลือกวันที่และสถานะ (ยังไม่ได้ดู / กำลังดู / ดูจบแล้ว) แล้วกด **"+ เพิ่มลงบันทึก"**
- คลิกป้าย stamp สถานะที่การ์ดแต่ละรายการเพื่อวนเปลี่ยนสถานะได้ทันที
- ปุ่ม ✎ แก้ไขรายการ, ปุ่ม ✕ ลบรายการ
- แถบตัวกรองด้านบนกรองตามสถานะได้

## ความปลอดภัย (สำคัญ)

Schema ที่ให้มาเปิด policy ให้ `anon key` อ่าน/เขียน/ลบได้ทุกแถว เหมาะสำหรับ
ใช้งานคนเดียวหรือทำเดโม ถ้าจะเปิดเว็บให้คนอื่นเข้าถึงด้วย ควรเพิ่มระบบ
Supabase Auth แล้วแก้ policy ให้ผูกกับ `auth.uid()` แทน `true`
