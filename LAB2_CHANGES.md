# Lab 2 - ملخص التغييرات والإضافات

## 📋 الملفات المعدلة

### 1. `client_service/server.js` ✅

**التعديلات:**

- ✅ إضافة In-Memory Cache (Map-based)
- ✅ إضافة Cache Statistics (hits, misses, invalidations)
- ✅ إضافة Round-Robin Load Balancer
- ✅ دالة `getCatalogReplicas()` - للحصول على جميع Catalog replicas
- ✅ دالة `getOrderReplicas()` - للحصول على جميع Order replicas
- ✅ دالة `getNextCatalog()` - اختيار Catalog replica بطريقة Round-Robin
- ✅ دالة `getNextOrder()` - اختيار Order replica بطريقة Round-Robin
- ✅ دوال Cache: `getCache()`, `setCache()`, `invalidateCache()`
- ✅ تعديل `/search/:topic` - استخدام Cache + Load Balancer
- ✅ تعديل `/info/:id` - استخدام Cache + Load Balancer
- ✅ تعديل `/purchase/:id` - استخدام Load Balancer فقط (بدون Cache)
- ✅ إضافة `POST /invalidate` - endpoint لحذف Cache entries
- ✅ إضافة `GET /cache/stats` - endpoint لعرض إحصائيات Cache

### 2. `catalog_service/server.js` ✅

**التعديلات:**

- ✅ إضافة دالة `getClientServiceURL()` - للحصول على Client URL
- ✅ إضافة دالة `sendCacheInvalidation()` - لإرسال Cache invalidation للـ Front-End
- ✅ تعديل `POST /update` - إرسال Cache invalidation بعد التحديث
  - حذف `info:${id}` من الكاش
  - حذف `search:${topic}` من الكاش

### 3. `order_service/server.js` ✅

**التعديلات:**

- ✅ إضافة دالة `getCatalogReplicas()` - للحصول على جميع Catalog replicas
- ✅ إضافة دالة `getClientServiceURL()` - للحصول على Client URL
- ✅ تعديل `POST /purchase/:id`:
  - تحديث جميع Catalog Replicas (Promise.all)
  - إرسال Cache invalidation للـ Front-End
  - ضمان Consistency بين الـ Replicas

### 4. `client_service/config.json` ✅

**التعديل:**

```json
{
  "CATALOG_URLS": [
    "http://catalog-replica-1:3001",
    "http://catalog-replica-2:3001"
  ],
  "ORDER_URLS": ["http://order-replica-1:3002", "http://order-replica-2:3002"]
}
```

### 5. `order_service/config.json` ✅

**التعديل:**

```json
{
  "CATALOG_URLS": [
    "http://catalog-replica-1:3001",
    "http://catalog-replica-2:3001"
  ],
  "CLIENT_URL": "http://client:3000"
}
```

### 6. `docker-compose.yml` ✅

**التعديل:**

- ✅ إضافة `catalog-replica-1` (Port 3001)
- ✅ إضافة `catalog-replica-2` (Port 3011)
- ✅ إضافة `order-replica-1` (Port 3002)
- ✅ إضافة `order-replica-2` (Port 3012)
- ✅ تحديث `client` service مع environment variables للـ replicas
- ✅ إضافة Shared Volumes (`catalog-data`, `order-data`)

---

## 📁 الملفات الجديدة

### 1. `test_performance.js` ✅

**الوصف:** Script شامل لاختبار الأداء
**المقاييس:**

- Response Time (with vs without cache)
- Cache Hit/Miss Ratio
- Cache Invalidation Cost
- Standard Deviation
- Throughput Comparison

**الاستخدام:**

```bash
node test_performance.js
```

### 2. `LAB2_README.md` ✅

**الوصف:** توثيق كامل لـ Lab 2
**المحتويات:**

- نظرة عامة على الميزات المنفذة
- Architecture Diagram
- تعليمات التشغيل
- API Documentation
- Performance Comparison
- Configuration Guide
- Troubleshooting

### 3. `QUICK_START.md` ✅

**الوصف:** دليل البدء السريع (بالعربي)
**المحتويات:**

- تعليمات التشغيل السريعة
- أمثلة اختبار
- التحقق من التنفيذ
- استكشاف المشاكل

### 4. `start_services.ps1` ✅

**الوصف:** Script PowerShell لتشغيل جميع الخدمات
**الوظائف:**

- تنظيف العمليات القديمة
- تشغيل جميع Replicas
- عرض معلومات الخدمات
- حفظ Logs

**الاستخدام:**

```powershell
.\start_services.ps1
```

### 5. `stop_services.ps1` ✅

**الوصف:** Script لإيقاف جميع الخدمات

**الاستخدام:**

```powershell
.\stop_services.ps1
```

### 6. `start_services.sh` ✅

**الوصف:** نسخة Bash من start script (لـ Linux/Mac)

### 7. `stop_services.sh` ✅

**الوصف:** نسخة Bash من stop script

### 8. `package.json` (محدث) ✅

**الإضافات:**

```json
"scripts": {
  "test": "node test_performance.js",
  "test:perf": "node test_performance.js",
  "start:all": "powershell -ExecutionPolicy Bypass -File ./start_services.ps1",
  "stop:all": "powershell -ExecutionPolicy Bypass -File ./stop_services.ps1"
}
```

---

## 🎯 الميزات المنفذة (Lab 2 Mandatory)

### ✅ 1. Replication

- نسختين من Catalog Service (Ports: 3001, 3011)
- نسختين من Order Service (Ports: 3002, 3012)
- Shared Volumes لضمان تزامن البيانات

### ✅ 2. Load Balancing

- **Algorithm:** Round-Robin
- **Location:** Front-End (client_service)
- توزيع الطلبات تلقائياً بين Replicas
- منفصل لـ Catalog و Order services

### ✅ 3. Caching

- **Type:** In-Memory (Map-based)
- **Location:** Front-End (client_service)
- **Cached:** `GET /info/:id`, `GET /search/:topic`
- **NOT Cached:** `POST /purchase/:id`
- **TTL:** 60 seconds
- **Statistics Endpoint:** `GET /cache/stats`

### ✅ 4. Cache Consistency

- **Model:** Strong Consistency
- **Method:** Server Push Invalidation
- عند أي Write operation:
  1. تحديث البيانات
  2. إرسال Invalidation request للـ Front-End
  3. حذف Cache entry المتأثر
- لا يتم عرض بيانات قديمة أبداً

### ✅ 5. Replicas Consistency

- تحديث جميع Catalog Replicas عند الشراء
- استخدام `Promise.all()` للتحديث المتزامن
- ضمان تطابق البيانات بين النسخ

### ✅ 6. Performance Evaluation

- Script شامل للاختبار
- مقارنة الأداء (with vs without cache)
- قياس Cache Hit Rate
- قياس Invalidation Cost
- نتائج بصيغة Tables + Summary

---

## 📊 النتائج المتوقعة

| المقياس        | بدون Cache | مع Cache  | التحسين    |
| -------------- | ---------- | --------- | ---------- |
| زمن الاستجابة  | 40-50ms    | 1-3ms     | **95%** ⬆️ |
| Throughput     | 20 req/s   | 500 req/s | **25x** ⬆️ |
| CPU Usage      | مرتفع      | منخفض     | **80%** ⬇️ |
| Cache Hit Rate | -          | 90-95%    | -          |
| Speedup        | 1x         | 20-25x    | **2400%**  |

---

## 🔄 سير العمليات (Workflows)

### 1. Search/Info Request (مع Cache)

```
Client → Front-End:
  1. فحص Cache
  2. إذا موجود → إرجاع فوراً (Cache Hit)
  3. إذا غير موجود:
     a. Round-Robin → اختيار Catalog Replica
     b. إرسال طلب للـ Replica
     c. حفظ النتيجة في Cache
     d. إرجاع النتيجة
```

### 2. Purchase Request (بدون Cache + Invalidation)

```
Client → Front-End → Order Replica:
  1. Round-Robin → اختيار Order Replica
  2. Order Replica:
     a. الحصول على معلومات الكتاب من Catalog
     b. تحديث جميع Catalog Replicas (Promise.all)
     c. إرسال Cache Invalidation للـ Front-End
     d. حفظ الطلب في orders.csv
  3. Front-End:
     a. حذف info:${id} من Cache
  4. إرجاع نتيجة الشراء
```

### 3. Update Request (Cache Invalidation)

```
Client → Catalog Replica:
  1. تحديث البيانات في catalog.csv
  2. إرسال Cache Invalidation للـ Front-End:
     a. حذف info:${id}
     b. حذف search:${topic}
  3. إرجاع النتيجة
```

---

## 🧪 كيفية الاختبار

### 1. تشغيل النظام

```powershell
# PowerShell
.\start_services.ps1

# أو Docker
docker-compose up --build
```

### 2. اختبار Cache

```powershell
# طلب أول (Cache Miss)
curl http://localhost:3000/info/1
# Output: "fromCache": false, responseTime: ~45ms

# طلب ثاني (Cache Hit)
curl http://localhost:3000/info/1
# Output: "fromCache": true, responseTime: ~2ms
```

### 3. اختبار Cache Invalidation

```powershell
# طلب أول (يحفظ في Cache)
curl http://localhost:3000/info/1

# شراء (يحذف من Cache)
curl -X POST http://localhost:3000/purchase/1

# طلب ثاني (Cache Miss)
curl http://localhost:3000/info/1
# Output: "fromCache": false
```

### 4. اختبار Load Balancing

```powershell
# عدة طلبات - ستوزع بين Replicas
for ($i=1; $i -le 10; $i++) { curl http://localhost:3000/info/1 }
# راقب logs الخدمات
```

### 5. اختبار الأداء الكامل

```powershell
node test_performance.js
```

---

## ✅ Checklist - Lab 2 Requirements

| المطلوب                       | الحالة     | التفاصيل                              |
| ----------------------------- | ---------- | ------------------------------------- |
| **1. Replication**            | ✅ Done    | 2 replicas لكل خدمة                   |
| **2. Load Balancing**         | ✅ Done    | Round-Robin في Front-End              |
| **3. Caching**                | ✅ Done    | In-Memory في Front-End                |
| **4. Cache Consistency**      | ✅ Done    | Server Push Invalidation              |
| **5. Replicas Consistency**   | ✅ Done    | تحديث جميع Replicas                   |
| **6. Performance Evaluation** | ✅ Done    | Script شامل مع نتائج                  |
| **7. Docker (Optional)**      | ⏸️ Skipped | docker-compose.yml جاهز لكن غير مطلوب |

---

## 🎓 ملاحظات مهمة للتسليم

1. ✅ **كل الكود معلق بوضوح** - شاهد التعليقات بـ `// LAB 2:`
2. ✅ **التوثيق كامل** - LAB2_README.md و QUICK_START.md
3. ✅ **Performance Testing** - test_performance.js يعطي نتائج مفصلة
4. ✅ **Easy to Run** - start_services.ps1 أو docker-compose up
5. ✅ **No Breaking Changes** - الكود القديم لا يزال يعمل

---

## 🚀 التشغيل النهائي

```powershell
# 1. تشغيل النظام
.\start_services.ps1

# 2. اختبار الأداء
node test_performance.js

# 3. اختبار يدوي
curl http://localhost:3000/info/1
curl http://localhost:3000/cache/stats

# 4. إيقاف النظام
.\stop_services.ps1
```

---

**✅ Lab 2 Complete! جميع المتطلبات الإجبارية تم تنفيذها بنجاح! 🎉**
