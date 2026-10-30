# نشر سيرفر المزامنة (ميزة 025: T023 وT024)

الخطوات دي بتعملها إنت بنفسك، لأن فيها حسابات وأسرار (الدستور 3.0.1، مبدأ I وIII). **ماتبعتش أي مفتاح أو سر في
الشات ولا في أي ملف**: كل الأسرار بتتحط في Cloudflare بس، عن طريق `wrangler secret put`.

كل الأوامر بتتشغّل من الفولدر ده (`server/`)، في terminal (PowerShell أو Git Bash):

```bash
cd E:\Claude\mizan-025\server
```

## 1. Resend (الإيميلات)

1. اعمل حساب على [resend.com](https://resend.com) **بنفس الإيميل اللي هتعمل بيه حساب المزامنة**. من غير دومين خاص،
   Resend بيبعت لإيميل صاحب الحساب بس، وده كفاية طول ما التطبيق ليك لوحدك (C4).
2. من **API Keys** اعمل مفتاح جديد بصلاحية **Sending access** بس. انسخه واحتفظ بيه لحد الخطوة 4. **ماتبعتهوش لحد.**

## 2. ادخل Cloudflare من الـ terminal

```bash
npx wrangler login
```

هيفتح المتصفح، ادخل بحساب Cloudflare بتاعك ووافق. (`npx` هنا بيشغّل النسخة المتثبّتة في `package-lock.json`،
4.149.0. لو أول مرة، شغّل `npm ci` الأول.)

## 3. قاعدة البيانات

```bash
npx wrangler d1 create mizan-sync
```

هيطبع `database_id`. ده مش سر (رقم تعريف بس): ابعتهولي أو حطه بنفسك مكان `set-locally-by-the-owner` في
`wrangler.toml`. وبعدين اعمل الجداول:

```bash
npx wrangler d1 execute mizan-sync --remote --file=schema.sql
```

## 4. النشر والأسرار

```bash
npx wrangler deploy
```

وبعدين السرّين. كل أمر هيسألك عن القيمة، اكتبها هناك بس:

```bash
npx wrangler secret put PEPPER
```

للـ `PEPPER` حط قيمة عشوائية طويلة. تقدر تعملها بالأمر ده، وتنسخ الناتج في سؤال `secret put` على طول من غير ما
تحفظه في أي مكان:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

```bash
npx wrangler secret put RESEND_KEY
```

وهنا حط مفتاح Resend من الخطوة 1.

> **مهم:** لو `PEPPER` اتغيّر بعدين، كل الحسابات هتوقف (مش هتعرف تدخل)، فاعمله مرة واحدة بس.

## 5. اتأكد إنه شغال

```bash
curl -X POST https://mizan-sync.mizan.workers.dev/prelogin -H "Content-Type: application/json" -d "{\"email\":\"check@example.com\"}"
```

لازم يرجع حاجة زي `{"salt":"..."}`. لو رجع كده، قولّي، وأنا هشيل الـ draft من PR #54 وأستنى موافقتك على الـ merge.

## 6. التجربة على الموبايل (T025)

بعد الـ merge، افتح التطبيق على الموبايل ← **الإعدادات** ← **المزامنة** ← «اعمل حساب»، واحفظ كود الاسترجاع،
وافتح لينك التأكيد من الإيميل **على الموبايل نفسه**، وادخل. وبعدين ادخل من جهاز تاني بنفس الإيميل والباسورد، واتأكد
إن بياناتك ظهرت، وإن علامة على جهاز بتبان على التاني في أقل من دقيقة.

## لو حاجة وقفت

- `npx wrangler` بيشتكي من `workerd`: ده مطلوب لـ `wrangler dev` بس، ومش محتاجينه. لو ظهر في `deploy`، قولّي.
- أي أمر طلب منك حاجة مش مكتوبة هنا، وقف وقولّي قبل ما توافق.
