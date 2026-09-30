# Jamoa transferlari — birinchi bosqich

## Ekran oqimi

- Kirish: «Mening jamoam» ichida «Transferlar». Futbolchining «Arizalar» ekranida shaxsiy so‘rov holati saqlanadi; karyera tarixi olib tashlanmaydi.
- Jamoa sahifasi: «Kiruvchi», «Chiquvchi», «Tarix». Holatlar: kutilmoqda, tasdiqlangan, rad etilgan. Ro‘yxatlar sahifalab olinadi.
- «O‘yinchi olish»: tashkilot ichida jamoa va futbolchi qidirish, tanlangan futbolchi va eski/yangi jamoani tekshirish, sabab yozish, bitta ariza yuborish.
- Tafsilot: futbolchi, eski va yangi jamoa, ariza sanasi, sabab, qaror va qaror sanasi. Mavjud bo‘lmagan ma’lumot uchun soxta qiymat ko‘rsatilmaydi.
- Transfer oynasi yopilganda yuborish o‘chiriladi; mavjud so‘rovlarni ko‘rish davom etadi.
- Internet uzilib, yuborish natijasi noma’lum bo‘lsa, avtomatik qayta yuborish o‘rniga arizalar ro‘yxati tekshiriladi.

## Dizayn

Mavjud homeTheme ranglari, AMATORA to‘q sariq urg‘usi, qorong‘i/yorug‘ rejim. Androidda oddiy qattiq sirtlar; iOSda mavjud karta uslubi. Har bir holat rang bilan birga matn orqali ham ko‘rsatiladi. Qidiruv debounce bilan, yuklash va xato holatlari ekranning o‘zida ko‘rsatiladi.

## Kodda mavjud kontraktlar

Quyidagilar mahalliy manba kodidan tekshirildi; productionda barcha migrationlar qo‘llangani hali tasdiqlanmadi.

- `amatora-organization/client/js/transfer-api.mjs`: sardor uchun alohida tekshirilgan sessiya, ro‘yxat va so‘rov endpointlari. Mobil foydalanuvchi IDsi ushbu sessiyani almashtirmaydi.
- `amatora-organization/supabase/functions/_shared/team-transfer-http.mjs`: request-transfer, team-transfer-page; sessiya va kiritilgan ma’lumotlar serverda tekshiriladi.
- `20260927000100_atomic_admin_transfer.sql`: administrator qarori, a’zolik va karyera tarixini bitta tranzaksiyada o‘zgartirish. Jamoa o‘zi transferni tasdiqlay olmaydi.
- `20260925000100_transfer_notifications.sql`: mavjud outbox faqat futbolchi uchun; to‘rt tomon yetkazilishi hali mavjud emas.
- `services/apiService.ts`: futbolchiga tegishli transferlarni ko‘rish mavjud. Bu metod jamoaning barcha kiruvchi/chiquvchi arizalarini boshqarish uchun yetarli emas.

## Tasdiqlangan tomonlar

Foydalanuvchi to‘rt tomonni tasdiqladi: futbolchi, eski jamoa sardori, yangi jamoa sardori, tashkilot administratori. Administrator mavjud amatora-organization/admin va amatora-admin-app orqali ko‘radi va tasdiqlaydi; unga Telegram yetkazilishi qo‘shilmaydi. Qolgan uch tomon uchun Telegram ishlatiladi. Futbolchi yoki eski jamoa roziligi yangi majburiy bosqich sifatida o‘zicha kiritilmaydi.

Botdagi 4571c03 commit futbolchi va ikki jamoa uchun qabul qiluvchini aniqlashni tayyorladi; 46 offline test o‘tdi. Yangi queue qatorlari va sardorlarga mos xabar matnlari hali ulanmagan; o‘zgarish productionga joylanmagan.

## Keyingi implementatsiya chegarasi

Avval jamoa transfer ekranini mavjud server kontraktiga ulang. Sessiyani xavfsiz tekshirish yo‘li aniqlanmaguncha mobil anonim mijozdan transfer yozmang. So‘ng tasdiqlangan to‘rt tomon uchun mavjud transactional outboxni kengaytiring. Sinovlar mock orqali: haqiqiy OTP, Telegram yoki push yuborilmaydi.

## Video muqovasi

`components/ReplayPlayer.tsx`da faol bo‘lmagan video hozir qora sirt ko‘rsatadi. Ko‘rilgan `amatora-organization/obs-replay-uploader.js` MP4 yuklaydi, JPEG muqova yaratmaydi. Muqova videoni yuklash paytida server/uploaderda yaratilishi, kichik rasm sifatida saqlanishi va kartaga uzatilishi kerak. Har bir kartada videoni oldindan ochib kadr olish ishlatilmaydi. Eski videolarga chegaralangan backfill kerak; mavjud mobil buildga yangi native thumbnail kutubxonasi qo‘shish OTA bilan yetib bormaydi.

Gol videolarining birinchidan oxirigacha tartibi alohida `68e7026` commitida tayyor; relizga ushbu commit ham qo‘shiladi.
