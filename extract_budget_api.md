# Extract Budget API Guide

## Mục tiêu

- Tài liệu hướng dẫn call API cho nghiệp vụ trích ngân sách từ campaign gây quỹ sang campaign cứu trợ.
- Bao gồm:
  - tạo giao dịch trích ngân sách
  - lấy lịch sử giao dịch
  - lấy cả lịch sử đã hủy
  - hủy giao dịch theo kiểu reverse transfer + soft delete history

---

## 1. Base route

Controller:

- `SEP490-ReliefCare-BE/ReliefManagementSystem.API/Controllers/CampaignController.cs`

Base route:

- `api/campaigns`

Nhóm endpoint liên quan:

- `POST /api/campaigns/{id}/extract-budget`
- `GET /api/campaigns/{id}/extract-budget`
- `DELETE /api/campaigns/{id}/extract-budget/{campaignBudgetTransferId}`

Trong đó:

- `{id}` là `fundraising campaign id` khi tạo giao dịch mới
- `{id}` là `campaign id` muốn xem lịch sử khi lấy danh sách
- `{id}` là `campaign id` sở hữu giao dịch khi hủy lịch sử

---

## 2. POST - Tạo giao dịch trích ngân sách

## Endpoint

`POST /api/campaigns/{id}/extract-budget`

## Ý nghĩa

Trích ngân sách từ một campaign gây quỹ sang một campaign cứu trợ.

## Rule nghiệp vụ

- campaign nguồn phải là `Fundraising`
- campaign đích phải là `Relief`
- `amount > 0`
- số tiền trích không được vượt quá ngân sách còn lại của campaign gây quỹ

## Path param

- `id`: ID của campaign gây quỹ nguồn

## Request body

```json
{
  "targetReliefCampaignId": "091ec840-54f6-4994-bf98-204a155abf6c",
  "amount": 5000000,
  "note": "Bổ sung ngân sách cứu trợ đợt 1"
}
```

## Ví dụ cURL

```bash
curl -X POST "https://staging.reliefhub.info.vn/api/campaigns/{fundraisingCampaignId}/extract-budget" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d "{\"targetReliefCampaignId\":\"091ec840-54f6-4994-bf98-204a155abf6c\",\"amount\":5000000,\"note\":\"Bổ sung ngân sách cứu trợ đợt 1\"}"
```

## Response mẫu

```json
{
  "campaignBudgetTransferId": "6f0de80f-5f5d-4b7f-9f6e-efbaf1d3a100",
  "sourceCampaignId": "7dd597d5-bbaf-4a81-b31e-9d4576f92319",
  "targetCampaignId": "091ec840-54f6-4994-bf98-204a155abf6c",
  "amount": 5000000,
  "transferredByUserId": "2c2170bf-8020-41c1-bcb1-c097f7c8ab31",
  "transferredByUserName": "Nguyen Van A",
  "transferredAt": "2026-04-29T13:25:11.000Z",
  "note": "Bổ sung ngân sách cứu trợ đợt 1",
  "isDeleted": false,
  "cancelledAt": null,
  "cancelledByUserId": null,
  "cancelledByUserName": null,
  "sourceRemainingBudget": 15000000,
  "targetRemainingBudget": 5000000
}
```

## FE cần lưu ý

- `sourceRemainingBudget`: số dư còn lại của campaign nguồn sau khi trích
- `targetRemainingBudget`: số dư của campaign đích sau khi nhận ngân sách
- `isDeleted = false`: giao dịch đang còn hiệu lực

---

## 3. GET - Lấy lịch sử giao dịch trích ngân sách

## Endpoint

`GET /api/campaigns/{id}/extract-budget`

## Ý nghĩa

Lấy lịch sử các giao dịch ngân sách liên quan tới campaign này.

Danh sách gồm cả:

- giao dịch campaign này là nguồn
- giao dịch campaign này là đích

## Query param

- `includeDeleted`:
  - `false` hoặc bỏ trống: chỉ lấy giao dịch còn hiệu lực
  - `true`: lấy cả giao dịch đã bị hủy mềm

## Ví dụ cURL

### Chỉ lấy giao dịch còn hiệu lực

```bash
curl "https://staging.reliefhub.info.vn/api/campaigns/{campaignId}/extract-budget" \
  -H "Authorization: Bearer <access_token>"
```

### Lấy cả giao dịch đã hủy

```bash
curl "https://staging.reliefhub.info.vn/api/campaigns/{campaignId}/extract-budget?includeDeleted=true" \
  -H "Authorization: Bearer <access_token>"
```

## Response mẫu

```json
[
  {
    "campaignBudgetTransferId": "6f0de80f-5f5d-4b7f-9f6e-efbaf1d3a100",
    "sourceCampaignId": "7dd597d5-bbaf-4a81-b31e-9d4576f92319",
    "targetCampaignId": "091ec840-54f6-4994-bf98-204a155abf6c",
    "amount": 5000000,
    "transferredByUserId": "2c2170bf-8020-41c1-bcb1-c097f7c8ab31",
    "transferredByUserName": "Nguyen Van A",
    "transferredAt": "2026-04-29T13:25:11.000Z",
    "note": "Bổ sung ngân sách cứu trợ đợt 1",
    "isDeleted": false,
    "cancelledAt": null,
    "cancelledByUserId": null,
    "cancelledByUserName": null,
    "sourceRemainingBudget": 15000000,
    "targetRemainingBudget": 5000000
  },
  {
    "campaignBudgetTransferId": "4cb8a960-3ad0-4c98-ae79-3ee58c8d4b31",
    "sourceCampaignId": "7dd597d5-bbaf-4a81-b31e-9d4576f92319",
    "targetCampaignId": "091ec840-54f6-4994-bf98-204a155abf6c",
    "amount": 2500000,
    "transferredByUserId": "2c2170bf-8020-41c1-bcb1-c097f7c8ab31",
    "transferredByUserName": "Nguyen Van A",
    "transferredAt": "2026-04-29T14:05:00.000Z",
    "note": "Bổ sung ngân sách cứu trợ đợt 2",
    "isDeleted": true,
    "cancelledAt": "2026-04-29T14:20:00.000Z",
    "cancelledByUserId": "9c2c11d2-df9d-4976-a938-02b4f5ad9f12",
    "cancelledByUserName": "Tran Thi B",
    "sourceRemainingBudget": 17500000,
    "targetRemainingBudget": 5000000
  }
]
```

## FE gợi ý hiển thị

- `transferredByUserName`: người tạo giao dịch
- `cancelledByUserName`: người hủy giao dịch
- `isDeleted`:
  - `false` -> giao dịch còn hiệu lực
  - `true` -> giao dịch đã hủy

---

## 4. DELETE - Hủy giao dịch trích ngân sách

## Endpoint

`DELETE /api/campaigns/{id}/extract-budget/{campaignBudgetTransferId}`

## Ý nghĩa

Không xóa cứng giao dịch.

API này sẽ:

1. reverse transfer thật sự
2. soft delete lịch sử giao dịch

## Reverse transfer hiện tại

Khi hủy:

- `source.BudgetSpent -= amount`
- `target.BudgetTotal -= amount`

Sau đó record lịch sử được đánh dấu:

- `isDeleted = true`
- `cancelledAt = now`
- `cancelledByUserId = current user`

## Path param

- `id`: campaign id có liên quan tới giao dịch
- `campaignBudgetTransferId`: id record lịch sử cần hủy

## Ví dụ cURL

```bash
curl -X DELETE "https://staging.reliefhub.info.vn/api/campaigns/{campaignId}/extract-budget/{campaignBudgetTransferId}" \
  -H "Authorization: Bearer <access_token>"
```

## Response

- `204 No Content`

## Lưu ý nghiệp vụ

- nếu giao dịch đã bị hủy trước đó -> backend sẽ báo lỗi
- nếu campaign đích không còn đủ `BudgetTotal` để reverse -> backend sẽ báo lỗi
- đây là `hủy giao dịch`, không phải xóa vĩnh viễn khỏi DB

---

## 5. Mapping field response cho FE

## Field chính

- `campaignBudgetTransferId`: id giao dịch
- `sourceCampaignId`: campaign nguồn
- `targetCampaignId`: campaign đích
- `amount`: số tiền giao dịch
- `note`: ghi chú giao dịch

## Người thao tác

- `transferredByUserId`: id người tạo giao dịch
- `transferredByUserName`: tên người tạo giao dịch
- `cancelledByUserId`: id người hủy giao dịch
- `cancelledByUserName`: tên người hủy giao dịch

## Mốc thời gian

- `transferredAt`: thời gian tạo giao dịch
- `cancelledAt`: thời gian hủy giao dịch

## Trạng thái

- `isDeleted = false`: giao dịch còn hiệu lực
- `isDeleted = true`: giao dịch đã bị hủy

## Số dư sau giao dịch

- `sourceRemainingBudget`
- `targetRemainingBudget`

---

## 6. Gợi ý FE flow

## Tạo giao dịch

1. chọn campaign gây quỹ nguồn
2. chọn campaign cứu trợ đích
3. nhập số tiền và ghi chú
4. call `POST /extract-budget`
5. reload `inventory-balance` hoặc summary campaign liên quan

## Xem lịch sử

1. mở tab lịch sử giao dịch
2. call `GET /extract-budget`
3. nếu có chế độ audit -> call thêm `?includeDeleted=true`

## Hủy giao dịch

1. chỉ cho phép hủy các record `isDeleted = false`
2. hỏi confirm trước khi hủy
3. call `DELETE /extract-budget/{campaignBudgetTransferId}`
4. reload lại lịch sử và ngân sách campaign liên quan

---

## 7. Kết luận

Hiện tại nghiệp vụ `extract-budget` đã có đủ API để FE làm các tác vụ sau:

- tạo giao dịch trích ngân sách
- xem lịch sử giao dịch
- xem cả giao dịch đã bị hủy để audit
- hủy giao dịch theo kiểu reverse transfer + soft delete history

FE không cần tự join user cho màn hình lịch sử vì response đã có sẵn:

- `transferredByUserName`
- `cancelledByUserName`
