# UI Contract: Backup and Restore

A new section in Settings, «نسخة احتياطية», placed after «استيراد ملف إعدادات». Egyptian Arabic, right to
left; dates and counts in Latin digits inside `<bdi>`; every control at least 44 px; existing tokens and
components only (`.panel`, `.btn`, `.notice`, `.field`).

## Save

- Line: «آخر نسخة: <التاريخ>» or «لسه ما عملتش نسخة احتياطية على الجهاز ده».
- Button «احفظ نسخة احتياطية» (primary). Where the device can share files, a second button «ابعتها لمكان تاني».
- Note under the buttons: «الملف فيه بياناتك الشخصية. خليه في مكان آمن ومتبعتهوش لحد.»
- After saving: «اتحفظت النسخة: mizan-backup-YYYY-MM-DD.json». If saving failed: «مقدرتش أحفظ الملف. افتح
  التطبيق في المتصفح العادي وجرّب تاني».

## Restore

- File input «اختار ملف النسخة الاحتياطية» (`accept=".json,application/json"`).
- Preview notice (nothing changed yet):
  «نسخة من <التاريخ>» · «<N> مهمة · <N> ميعاد · <N> كورس · <N> يوم فيه علامات · <N> تمرينة»,
  «فيه تمرينة مفتوحة» when there is one, and one of «فيها إعدادات» / «مفيهاش إعدادات، إعداداتك الحالية
  هتفضل» / «الإعدادات اللي فيها مش صالحة، إعداداتك الحالية هتفضل».
  Warning line: «الاسترجاع هيستبدل كل بياناتك على الجهاز ده بالنسخة دي.» and, when a synced copy is active,
  «وهيتغيّر كمان في النسخة المتزامنة».
  Buttons «استرجع» (danger) and «لأ» (focused first).
- While applying: buttons disabled, «بسترجع…». Success reloads the app. Failure: «الاسترجاع فشل ومفيش حاجة
  اتغيّرت.»

## Rejection messages

| Code | Text |
|---|---|
| `too-large` | «الملف كبير أوي على إنه نسخة احتياطية.» |
| `empty`, `not-json`, `not-backup` | «ده مش ملف نسخة احتياطية من ميزان يومي.» |
| `settings-file` | «ده ملف إعدادات. استورده من «استيراد ملف إعدادات».» |
| `too-new` | «النسخة دي معمولة بنسخة أحدث من التطبيق. حدّث التطبيق الأول.» |
| `damaged` | «الملف ده بايظ أو اتعدّل، فمش هسترجع منه حاجة.» |
| device data too new | «بيانات التمارين على الجهاز ده من نسخة أحدث من التطبيق، فمش هقدر أستبدلها.» |

## Storage status line

- kept: «المتصفح هيحتفظ ببياناتك لحد ما انت تمسحها.»
- may clear: «المتصفح ممكن يمسح البيانات لو المساحة قلت. احفظ نسخة احتياطية.» plus, on browsers that ask the user,
  the button «اطلب من المتصفح يحتفظ بالبيانات».
- unsupported: «المتصفح ده مش بيقول إذا كان هيحتفظ بالبيانات. احفظ نسخة احتياطية.»

## Guarantees (testable)

1. Nothing is sent over the network while saving, previewing or restoring.
2. Nothing on the device changes before «استرجع» is tapped.
3. A restore is all or nothing; the restored marks equal the file's marks exactly.
4. The app never triggers a permission prompt on its own.
