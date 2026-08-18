# נכסי בדיקה מוכנים להשקה — Smoke Test

מבוסס על שפה אמיתית שנמצאה בשטח (ראו market-research-findings.md). מוכן להעתקה ישירה ל-Meta Ads Manager / TikTok Ads Manager / Google Forms. דף הנחיתה עצמו (landing_page.html) נשלח כקובץ נפרד לצ'אט.

---

## 1. הוקים למודעות/פוסטים (Ad Hooks)

כל ההוקים מבוססים על ביטויים אמיתיים שנמצאו ויראליים בטיקטוק/פורומים ב-2026 — לא המצאה:

1. "Your nervous system doesn't know the difference between a deadline and a tiger. Reset it in 90 seconds."
2. "Dysregulated at 3pm again? There's a 90-second fix that doesn't need a meditation app."
3. "Your urgency is not my emergency — but your cortisol doesn't know that. Try this instead."
4. "No 20-minute meditation. No hospital-looking heart rate app. Just your finger, your camera, and 90 seconds."
5. "We measured 100 people's stress before and after this — here's what happened." (וידאו דמו של הלולאה)

**המלצה:** לבדוק A/B בין הוק #1 (רגשי/ויראלי) להוק #4 (הבדלת מוצר ישירה מול המתחרים) — אלו שני זוויות שונות לגמרי.

---

## 2. תסריט קצר לפוסט/סטורי "דלת מזויפת" (30–45 שניות)

**פתיחה (0-5 שניות):** "אם אתה מרגיש שהראש שלך רץ 100 קמ״ש כל היום — זה לא אתה, זו מערכת העצבים."

**גוף (5-25 שניות):** הדגמה של הלולאה בת 3 השלבים על מסך טלפון מוקאפ — מדידה (20 שניות) → נשימה מונחית (60 שניות) → תוצאה (ירידה במדד).

**CTA (25-35 שניות):** "אנחנו פותחים גישה מוקדמת למספר מצומצם של אנשים. הקישור בביו — הצטרפו לרשימת ההמתנה."

**טקסט על המסך:** "90 seconds. No meditation course. Just proof."

---

## 3. שאלון Van Westendorp — טיוטה ל-Google Forms

הקדמה לשאלון: *"We're building an app that measures your stress level via your phone camera and guides you through a 90-second breathing reset to calm your nervous system, with before/after proof. Please answer based on this concept:"*

1. באיזה מחיר חודשי המוצר הזה **יקר מדי**, כך שלא היית שוקל/ת לרכוש אותו בכלל?
2. באיזה מחיר חודשי המוצר **יקר**, אך עדיין היית שוקל/ת לרכוש אותו?
3. באיזה מחיר חודשי המוצר נחשב **עסקה טובה** (Good Value)?
4. באיזה מחיר חודשי המוצר **זול מדי**, עד כדי שהיית מפקפק/ת באיכותו?

שאלות המשך מומלצות (לא חלק מ-Van Westendorp אך שימושיות):
5. כמה פעמים בשבוע אתה מרגיש רמת סטרס/עומס שהיית רוצה "לאפס" באופן מיידי?
6. באילו אפליקציות/שיטות אתה משתמש היום כדי להתמודד עם זה (אם בכלל)?
7. כמה זמן/כסף השקעת בפתרון כלשהו לבעיה הזו ב-3 החודשים האחרונים?

---

## 4. הערה טכנית לגבי דף הנחיתה (landing_page.html)

הדף בנוי ומוכן, כולל טופס הרשמה לרשימת המתנה. **כדי שהטופס יעבוד בפועל צריך:**
1. להירשם בחינם ל-[Formspree](https://formspree.io) (או שירות דומה כמו Google Forms embed) ולקבל endpoint.
2. להחליף את `https://formspree.io/f/YOUR_FORM_ID` בשורת ה-`<form action=...>` בקוד בכתובת האמיתית שקיבלת.
3. להעלות את הקובץ ל-Vercel/Netlify/Carrd (גרירה ושחרור, חינמי) כדי לקבל כתובת אינטרנט חיה להפניית תנועה מהמודעות.

זו הפעולה היחידה שדורשת ממך להירשם לשירות חיצוני — אני יכול לבנות הכל עד לשלב הזה, אבל לא יכול ליצור עבורך חשבון תשלומים/פרסום בפועל.
