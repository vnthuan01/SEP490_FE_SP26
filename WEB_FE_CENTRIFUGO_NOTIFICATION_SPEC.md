# Web FE Spec - Notification Realtime qua Centrifugo

Tài liệu này dành cho **Web Frontend** để tích hợp luồng notification realtime hiện tại của backend.

Mục tiêu chính:

1. **User gửi Rescue Request** → **Moderator nhận notification realtime**, có kèm **link ảnh preview** nếu request có ảnh đính kèm.
2. **Moderator hoặc Team cập nhật request** → **User tạo request nhận notification realtime**.

---

## 1. Tổng quan luồng nghiệp vụ hiện tại

Backend hiện đang có các luồng notification realtime chính như sau:

### Luồng A - User tạo request

- Actor thực hiện: **User**
- Hành động: tạo rescue request
- Người nhận notification realtime: **Moderator của relief station liên quan**
- Notification type: `RescueRequestCreated`
- Có hỗ trợ metadata ảnh preview nếu request có attachment

### Luồng B - Moderator verify request

- Actor thực hiện: **Moderator / Manager / Admin**
- Hành động: verify request (approved/rejected)
- Người nhận notification realtime: **User đã tạo request**
- Notification type: `RescueRequestVerified`

### Luồng C - Moderator assign team

- Actor thực hiện: **Moderator / Manager / Admin**
- Hành động: assign team vào request
- Người nhận notification realtime:
  - **User tạo request**
  - **Team members được assign**
- Notification type: `RescueRequestAssigned`

### Luồng D - Team cập nhật operation status sang EnRoute

- Actor thực hiện: **Volunteer / Moderator / Manager / Admin**
- Hành động: cập nhật trạng thái operation sang `EnRoute`
- Người nhận notification realtime: **User tạo request**
- Notification type: `RescueRequestInProgress`

---

## 2. Endpoint backend mà Web FE cần biết

## 2.1 Endpoint lấy realtime token

FE cần gọi:

```http
GET /api/realtime/token
Authorization: Bearer <app-access-token>
```

### Response mẫu

```json
{
  "token": "<centrifugo-connection-token>",
  "endpoint": "wss://realtime-staging.reliefhub.info.vn/connection/websocket",
  "channel": "notifications:user:USER_ID",
  "expiresAt": "2026-04-17T10:15:00Z"
}
```

### Ý nghĩa

- `token`: token để connect Centrifugo
- `endpoint`: websocket URL FE phải dùng
- `channel`: channel cá nhân của user hiện tại
- `expiresAt`: thời gian hết hạn token realtime

### Ghi chú theo môi trường staging hiện tại

Theo setup deploy hiện tại:

- API staging: `https://staging.reliefhub.info.vn`
- Realtime public websocket: `wss://realtime-staging.reliefhub.info.vn/connection/websocket`
- Backend nội bộ publish sang Centrifugo qua network nội bộ bằng:
  - `Centrifugo__BaseUrl = http://centrifugo:8000`
- Nhưng FE **không dùng BaseUrl nội bộ này**
- FE luôn phải dùng chính field `endpoint` backend trả về

Khuyến nghị FE:

- gọi token từ API staging:

```http
GET https://staging.reliefhub.info.vn/api/realtime/token
```

- sau đó connect bằng `endpoint` response trả về

---

## 2.2 Các endpoint rescue request liên quan đến notification

### User tạo request

Backend API tạo rescue request nằm ở nhóm `RescueRequestController`.

Khi API create thành công:

- request được lưu DB
- moderator nhận notification realtime

### Moderator verify request

```http
POST /api/rescuerequest/{id}/verify
```

### Moderator assign team

```http
POST /api/rescuerequest/{id}/assign-team
```

### Team / Moderator cập nhật operation status

```http
PATCH /api/rescuerequest/{id}/operations/{operationId}/status
```

Chỉ khi status chuyển sang **`EnRoute`** thì backend hiện tại mới gửi notification realtime cho user ở flow update operation.

---

## 3. Web FE phải connect realtime như thế nào

## 3.1 Không dùng app JWT để connect websocket trực tiếp

Web FE **không được** dùng access token login để connect thẳng websocket.

Flow đúng là:

1. FE login và lấy app JWT
2. FE gọi `/api/realtime/token`
3. FE nhận `token`, `endpoint`, `channel`
4. FE dùng token đó để connect Centrifugo

---

## 3.2 Channel cá nhân

Mỗi user có 1 channel riêng:

```text
notifications:user:{userId}
```

FE chỉ subscribe đúng channel backend trả về.

---

## 3.3 Cấu hình domain/CORS liên quan tới staging

Theo file setup hiện tại, backend đang allow các origin sau:

- `https://staging.reliefhub.info.vn`
- `https://reliefhub.info.vn`
- `https://relief-carevn.vercel.app`
- `http://localhost:3000`
- `http://localhost:5173`
- `http://localhost:4200`

Vì vậy Web FE có thể:

- chạy trực tiếp trên staging domain
- hoặc FE local gọi lên staging API để test

Nhưng websocket realtime vẫn phải đi qua public domain:

```text
wss://realtime-staging.reliefhub.info.vn/connection/websocket
```

---

## 4. Payload notification realtime FE nhận được

Backend publish payload theo `RealtimeNotificationDto`.

### Dạng dữ liệu thực tế

```json
{
  "notificationId": "uuid",
  "recipientId": "uuid",
  "type": "RescueRequestCreated",
  "title": "Có yêu cầu cứu hộ mới",
  "message": "Rescue request mới tại trạm của bạn: 123 ABC.",
  "referenceId": "uuid-request",
  "referenceType": "RescueRequest",
  "metadataJson": "{...}",
  "metadata": {
    "schemaVersion": 1,
    "schemaName": "rescue_request_v1",
    "attachmentCount": 2,
    "thumbnailUrls": ["https://image-1", "https://image-2"]
  },
  "attachmentCount": 2,
  "thumbnailUrls": ["https://image-1", "https://image-2"],
  "isRead": false,
  "createdAt": "2026-04-17T09:40:00Z",
  "readAt": null
}
```

---

## 5. Ý nghĩa từng field FE cần dùng

- `type`: dùng để phân nhánh UI
- `title`: tiêu đề notification
- `message`: nội dung mô tả
- `referenceId`: id của rescue request để deep-link
- `referenceType`: hiện tại thường là `RescueRequest`
- `metadata.thumbnailUrls`: danh sách ảnh preview
- `attachmentCount`: số ảnh/tệp đính kèm
- `isRead`: trạng thái đọc
- `createdAt`: thời gian tạo notification

---

## 6. Case 1 - User gửi Request thì Moderator FE phải làm gì

## 6.1 Bối cảnh

User app/mobile/web vừa tạo một rescue request mới.

Backend sẽ gửi realtime notification đến các moderator thuộc relief station tương ứng.

## 6.2 Notification moderator sẽ nhận

- `type = RescueRequestCreated`
- `title = "Có yêu cầu cứu hộ mới"`
- `message = "Rescue request mới tại trạm của bạn: ..."`
- `referenceId = requestId`
- `metadata.thumbnailUrls` có thể có ảnh preview

## 6.3 Moderator Web FE cần làm gì khi nhận notification này

Khi Web FE của moderator nhận publication:

1. append notification vào notification list
2. tăng unread badge
3. show toast/banner góc màn hình
4. render preview ảnh nếu có `thumbnailUrls`
5. khi click notification, điều hướng đến trang chi tiết request bằng `referenceId`

## 6.4 UI đề xuất cho moderator notification card

Hiển thị các phần sau:

- icon cảnh báo / cứu hộ
- `title`
- `message`
- thời gian `createdAt`
- tối đa 1-3 ảnh preview từ `thumbnailUrls`
- button hoặc click action: “Xem chi tiết request”

## 6.5 Nếu không có ảnh preview

Nếu:

- `attachmentCount = 0`
  hoặc
- `thumbnailUrls` rỗng

thì FE chỉ hiển thị text notification, không cần block preview ảnh.

---

## 7. Case 2 - Moderator update request thì User FE phải làm gì

Ở đây “Moderator update request” hiện tại trong backend tương ứng rõ nhất với:

### A. verify request

- notification type: `RescueRequestVerified`

### B. assign team

- notification type: `RescueRequestAssigned`

## 7.1 Khi User nhận `RescueRequestVerified`

Web FE của user nên:

1. thêm notification vào list
2. tăng unread count
3. hiển thị toast
4. refresh hoặc invalidate query của request detail nếu user đang mở request đó
5. cập nhật badge/trạng thái request trong history page

## 7.2 Khi User nhận `RescueRequestAssigned`

Web FE của user nên:

1. thêm notification
2. hiển thị message “Đội cứu hộ đã được điều phối”
3. refresh request detail/timeline nếu đang mở
4. nếu có widget tracking trạng thái, cập nhật trạng thái sang đã assign team

---

## 8. Case 3 - Team update request thì User FE phải làm gì

Trong backend hiện tại, luồng realtime rõ ràng cho team update là:

### Team/Volunteer cập nhật operation status sang `EnRoute`

- notification type: `RescueRequestInProgress`
- title: `Đội cứu hộ đang di chuyển`
- message: `Đội cứu hộ đang trên đường đến vị trí của bạn.`

## 8.1 User Web FE cần làm gì khi nhận `RescueRequestInProgress`

1. show toast ưu tiên cao
2. cập nhật timeline trạng thái request
3. nếu đang mở detail page của request, refetch ngay
4. có thể hiển thị banner trạng thái “Đội đang trên đường”
5. nếu app có bản đồ/tracking view, chuyển UI sang trạng thái theo dõi di chuyển

---

## 9. FE không được phụ thuộc realtime để xác nhận submit thành công

Khi user submit request:

- FE phải dựa vào **response của API create request** để xác nhận submit thành công
- không chờ realtime notification để kết luận request đã tạo xong

Realtime chỉ là kênh cập nhật tức thời cho các bên liên quan.

---

## 10. Cách FE web tích hợp Centrifugo

## 10.1 Cài package

```bash
npm install centrifuge
```

## 10.2 Mẫu code

```ts
import { Centrifuge } from 'centrifuge';

const realtime = await fetch('https://staging.reliefhub.info.vn/api/realtime/token', {
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
}).then((r) => r.json());

const centrifuge = new Centrifuge(realtime.endpoint, {
  token: realtime.token,
  getToken: async () => {
    const refreshed = await fetch('/api/realtime/token', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }).then((r) => r.json());

    return refreshed.token;
  },
});

const subscription = centrifuge.newSubscription(realtime.channel);

subscription.on('publication', (ctx) => {
  const notification = ctx.data;
  console.log(notification);
});

subscription.subscribe();
centrifuge.connect();
```

### Lưu ý quan trọng

- Không hardcode `ws://localhost:8000`
- Không tự build websocket URL từ frontend
- Chỉ dùng `realtime.endpoint` backend trả về

Ví dụ response staging đúng sẽ là:

```json
{
  "endpoint": "wss://realtime-staging.reliefhub.info.vn/connection/websocket"
}
```

---

## 11. Web FE nên sync thêm qua Notification APIs

Ngoài realtime, FE vẫn nên dùng:

- `GET /api/notifications`
- `GET /api/notifications/unread-count`
- `PATCH /api/notifications/{notificationId}/read`
- `PATCH /api/notifications/read-all`

Khuyến nghị:

- app load → fetch unread count
- vào trang notifications → fetch list
- nhận realtime → update local store ngay
- reconnect sau thời gian dài → refetch list để đồng bộ

---

## 12. Checklist cho team Web FE

- [ ] Sau login, gọi `/api/realtime/token`
- [ ] Dùng `endpoint` backend trả về để connect
- [ ] Subscribe đúng `channel`
- [ ] Khi nhận `RescueRequestCreated`, render được preview ảnh từ `thumbnailUrls`
- [ ] Khi nhận `RescueRequestVerified`, cập nhật UI request của user
- [ ] Khi nhận `RescueRequestAssigned`, cập nhật timeline và trạng thái assign
- [ ] Khi nhận `RescueRequestInProgress`, hiển thị trạng thái team đang tới
- [ ] Dùng API notifications để đồng bộ unread/list/read state
