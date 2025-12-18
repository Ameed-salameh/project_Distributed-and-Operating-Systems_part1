# Lab 2 - دليل البدء السريع (Quick Start Guide)

## 🚀 التشغيل السريع

### الطريقة 1: استخدام Docker Compose (موصى به)

```powershell
# بناء وتشغيل جميع الخدمات
docker-compose up --build

# للإيقاف
docker-compose down
```

### الطريقة 2: تشغيل يدوي (للاختبار)

```powershell
# Windows PowerShell
.\start_services.ps1

# للإيقاف
.\stop_services.ps1
```

---

## 🧪 اختبار النظام

### 1. اختبار البحث (مع Cache)

```powershell
# الطلب الأول (Cache Miss)
curl http://localhost:3000/search/distributed%20systems

# الطلب الثاني (Cache Hit - أسرع!)
curl http://localhost:3000/search/distributed%20systems
```

### 2. اختبار معلومات الكتاب (مع Cache)

```powershell
# الطلب الأول (Cache Miss)
curl http://localhost:3000/info/1

# الطلب الثاني (Cache Hit - أسرع!)
curl http://localhost:3000/info/1
```

### 3. اختبار الشراء (بدون Cache + Cache Invalidation)

```powershell
# شراء كتاب
curl -X POST http://localhost:3000/purchase/1

# الطلب التالي سيكون Cache Miss لأن الكاش تم حذفه
curl http://localhost:3000/info/1
```

### 4. عرض إحصائيات الكاش

```powershell
curl http://localhost:3000/cache/stats
```

النتيجة المتوقعة:

```json
{
  "hits": 50,
  "misses": 5,
  "invalidations": 2,
  "total": 55,
  "hitRate": "90.91%",
  "cacheSize": 8
}
```

---

## 📊 اختبار الأداء الكامل

```powershell
# تأكد أن جميع الخدمات تعمل أولاً
node test_performance.js
```

سيعرض لك:

- ✅ زمن الاستجابة بدون Cache
- ✅ زمن الاستجابة مع Cache
- ✅ نسبة التحسين (Speedup)
- ✅ معدل نجاح الكاش (Hit Rate)
- ✅ تكلفة حذف الكاش (Invalidation Cost)

---

## 🔍 اختبار Load Balancing

```powershell
# تشغيل عدة طلبات - سيتم توزيعها بين Replicas
for ($i=1; $i -le 10; $i++) {
    curl http://localhost:3000/info/1
}
```

تحقق من logs الخدمات لرؤية توزيع الطلبات بين Replica 1 و Replica 2.

---

## 📁 الخدمات والمنافذ

| الخدمة            | المنفذ | الوصف                                    |
| ----------------- | ------ | ---------------------------------------- |
| Client            | 3000   | الواجهة الأمامية + Cache + Load Balancer |
| Catalog Replica 1 | 3001   | نسخة أولى من خدمة الكتالوج               |
| Catalog Replica 2 | 3011   | نسخة ثانية من خدمة الكتالوج              |
| Order Replica 1   | 3002   | نسخة أولى من خدمة الطلبات                |
| Order Replica 2   | 3012   | نسخة ثانية من خدمة الطلبات               |

---

## 🐛 استكشاف المشاكل

### المشكلة: الخدمات لا تعمل

**الحل:**

```powershell
# أوقف جميع الخدمات
.\stop_services.ps1

# انتظر 2 ثانية
Start-Sleep -Seconds 2

# أعد التشغيل
.\start_services.ps1
```

### المشكلة: Cache لا يعمل

**الحل:**

```powershell
# تحقق من إحصائيات الكاش
curl http://localhost:3000/cache/stats

# تحقق من أن الطلب يأتي من الكاش
curl http://localhost:3000/info/1
# ابحث عن "fromCache": true في النتيجة
```

### المشكلة: Replicas غير متزامنة

**الحل:**

- تأكد من أن `CATALOG_URLS` محددة بشكل صحيح في Order Service
- تحقق من logs الخدمات
- في Docker: تأكد من تفعيل Shared Volumes

---

## ✅ التحقق من التنفيذ الصحيح

### 1. تحقق من Replication

```powershell
# يجب أن تستجيب جميع الخدمات
curl http://localhost:3001  # Catalog 1
curl http://localhost:3011  # Catalog 2
curl http://localhost:3002  # Order 1
curl http://localhost:3012  # Order 2
```

### 2. تحقق من Cache

```powershell
# أول طلب (cache miss)
curl http://localhost:3000/info/1 -Verbose
# الرد يجب أن يحتوي على "fromCache": false

# ثاني طلب (cache hit)
curl http://localhost:3000/info/1 -Verbose
# الرد يجب أن يحتوي على "fromCache": true
```

### 3. تحقق من Cache Invalidation

```powershell
# طلب أول (يحفظ في الكاش)
curl http://localhost:3000/info/1

# شراء الكتاب (يحذف من الكاش)
curl -X POST http://localhost:3000/purchase/1

# طلب ثاني (cache miss لأن الكاش تم حذفه)
curl http://localhost:3000/info/1
# الرد يجب أن يحتوي على "fromCache": false
```

### 4. تحقق من Load Balancing

```powershell
# راقب logs الخدمات أثناء تشغيل هذا الأمر
for ($i=1; $i -le 10; $i++) {
    curl http://localhost:3000/info/1
    Start-Sleep -Milliseconds 100
}
# يجب أن ترى الطلبات موزعة بين Replica 1 و 2
```

---

## 📈 النتائج المتوقعة

| المقياس        | بدون Cache | مع Cache   | التحسين  |
| -------------- | ---------- | ---------- | -------- |
| زمن الاستجابة  | ~40-50ms   | ~1-3ms     | **95%**  |
| Throughput     | ~20 req/s  | ~500 req/s | **25x**  |
| CPU Usage      | مرتفع      | منخفض      | **-80%** |
| Cache Hit Rate | -          | ~90-95%    | -        |

---

## 📝 ملاحظات مهمة

1. ✅ **Cache** يعمل فقط على `GET /info` و `GET /search`
2. ✅ **Purchase** لا يستخدم الكاش (Write Operation)
3. ✅ **Cache Invalidation** يحدث تلقائياً عند الشراء أو التحديث
4. ✅ **Load Balancing** يستخدم Round-Robin
5. ✅ **جميع Replicas** تحدث عند أي Write operation

---

## 🎯 الميزات المنفذة (Lab 2)

- [x] ✅ Replication (2 replicas لكل خدمة)
- [x] ✅ Load Balancing (Round-Robin)
- [x] ✅ In-Memory Cache (في Front-End)
- [x] ✅ Cache Consistency (Server Push Invalidation)
- [x] ✅ Replicas Consistency (تزامن البيانات)
- [x] ✅ Performance Evaluation (اختبارات الأداء)

---

**لمزيد من التفاصيل، راجع [LAB2_README.md](LAB2_README.md)**
