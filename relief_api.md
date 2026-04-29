# Relief API - Frontend Usage Guide

## Mục tiêu

- Tài liệu FE cho luồng cứu trợ sau khi flow đã đổi.
- Phân biệt rõ role và kênh sử dụng:
  - `Coordinator` dùng web
  - `Team Leader` và `Volunteer` dùng mobile
- Bám theo logic đang chạy trong:
  - `src/pages/coordinator/ReliefDistributionPage.tsx`
  - `ReliefDistributionController.cs`
  - `CampaignTaskController.cs`

---

## 1. Role và kênh sử dụng

## Coordinator - Web

Trang chính:

- `src/pages/coordinator/ReliefDistributionPage.tsx`

Coordinator dùng web để:

- import households vào campaign cứu trợ
- xem, lọc, cập nhật, xoá household
- xem `plan-summary`
- tạo / sửa / xoá `distribution point`
- tạo / sửa / xoá `relief package`
- assemble package từ tồn kho
- điều phối households sang `delivery assignment`
- điều chỉnh lại delivery assignment đã tạo
- nhân bản delivery cho cùng một household nếu cần nhiều lượt phát
- hoàn tất delivery đơn lẻ hoặc theo batch
- duyệt `shortage request`
- điều phối vehicle cho team

## Team Leader - Mobile

Team Leader dùng mobile để:

- xem danh sách delivery đã được điều phối về team qua `team-worklist`
- tạo `campaign task` cho đợt đi cứu trợ của team
- chia việc cho thành viên bằng `member task`
- gán deliveries vào từng `member task`
- theo dõi tiến độ task, member task, member-task-delivery
- có thể hoàn tất delivery hoặc cập nhật trạng thái khi nghiệp vụ cho phép theo role backend
- có thể tạo shortage request khi thiếu vật tư trong lúc triển khai

## Volunteer - Mobile

Volunteer dùng mobile để:

- xem `member tasks` của chính mình
- xem danh sách deliveries đã gắn vào task của mình
- cập nhật trạng thái `member task`
- cập nhật trạng thái `member-task-delivery`
- hoàn tất giao hàng kèm proof bằng flow `complete-with-delivery`
- có thể tạo shortage request nếu thiếu vật tư khi thực hiện nhiệm vụ

---

## 2. Flow Coordinator trên web

## Bước 1 - Chọn chiến dịch cứu trợ

Nguồn FE:

- `useCampaigns(...)`
- `useCampaignTeams(campaignId)`
- `useCampaignInventoryBalance(campaignId)`

Mục đích:

- lấy campaign relief đang `Draft/Active/Suspended`
- lấy team đã được gán vào campaign
- lấy tồn kho chiến dịch

---

## Bước 2 - Import hộ dân từ địa phương

### Endpoint

`POST /api/relief/campaigns/{campaignId}/households/import`

### FE service/hook

- `reliefDistributionService.importHouseholds(...)`
- `useImportReliefHouseholds()`

### Dữ liệu FE đang hỗ trợ

- `householdCode`
- `headOfHouseholdName`
- `contactPhone`
- `address`
- `latitude`
- `longitude`
- `householdSize`
- `isIsolated`
- `floodSeverityLevel`
- `isolationSeverityLevel`
- `requiresBoat`
- `requiresLocalGuide`
- `deliveryMode`

Lưu ý:

- FE import đang tự suy ra `deliveryMode`:
  - hộ cô lập -> `DoorToDoor`
  - không cô lập -> `PickupAtPoint`

---

## Bước 3 - Xem và lọc households

### Endpoint

`GET /api/relief/campaigns/{campaignId}/households`

### FE hook

- `useReliefHouseholds(campaignId, params)`

### Filter FE đang dùng

- `search`
- `assignment`
- `deliveryMode`
- `teamId`
- `distributionPointId`
- `status`
- `isIsolated`
- `requiresBoat`
- `requiresLocalGuide`
- `minFloodSeverityLevel`
- `minIsolationSeverityLevel`
- `hasCoordinates`

### Chỗ triển khai FE

- `ReliefAdvancedFilters.tsx`
- state `filtersValue` trong `ReliefDistributionPage.tsx`

---

## Bước 4 - Xem plan summary để điều phối

### Endpoint

`GET /api/relief/campaigns/{campaignId}/plan-summary`

### FE hook

- `useReliefPlanSummary(campaignId)`

### Dùng để ra quyết định

- số hộ cô lập
- số đội gợi ý
- khu vực ưu tiên điểm phát
- khu vực ưu tiên đội cơ động
- mức cần xuồng / áo phao / nhân lực

### Trên page hiện tại

Đang được dùng để hiển thị nhanh:

- `Hộ cô lập`

Có thể mở rộng tiếp để show:

- khu vực ưu tiên
- strategy pickup vs mobile team
- số xuồng cần

---

## Bước 5A - Tạo điểm phát cho nhánh PickupAtPoint

### Endpoint

`POST /api/relief/campaigns/{campaignId}/distribution-points`

### FE hook/service

- `useCreateDistributionPoint()`
- `reliefDistributionService.createDistributionPoint(...)`

### Chỗ gọi trong page

- `handleCreatePoint()`

### Điều kiện dùng

- khi campaign có households nhận tại điểm phát
- cần có station

---

## Bước 5B - Tạo gói cứu trợ

### Endpoint

`POST /api/relief/campaigns/{campaignId}/packages`

### FE hook/service

- `useCreateReliefPackage()`
- `reliefDistributionService.createReliefPackage(...)`

### Chỗ gọi trong page

- `handleCreatePackage()`

Ngoài ra còn có:

- update package
- delete package
- assemble package
- xem khả năng assemble từ inventory/station

---

## Bước 6 - Điều phối households thành delivery assignment

Trên FE hiện tại, Coordinator chọn households trong bảng rồi gọi `handleAssignSelectedHouseholds()`.

### Logic hiện tại

FE tách households thành 2 nhánh nghiệp vụ đúng với backend:

#### A. Pickup households

Điều kiện:

- `deliveryMode === PickupAtPoint`
- household không đi theo nhánh cô lập

### Endpoint dùng

`PATCH /api/relief/campaigns/{campaignId}/households/{campaignHouseholdId}/assign`

### Dữ liệu gửi lên

- `deliveryMode = PickupAtPoint`
- `distributionPointId`
- `campaignTeamId`
- `reliefPackageDefinitionId`
- `scheduledAt`
- `notes`

### Kết quả

- tạo hoặc cập nhật một `household delivery` cho household đó
- delivery này sẽ đi vào checklist, deliveries list và team-worklist

#### B. Isolated / DoorToDoor households

Điều kiện:

- `isIsolated = true`
  hoặc
- `deliveryMode === DoorToDoor`

### Nếu chỉ có 1 hộ

Endpoint dùng:

- `PATCH /api/relief/campaigns/{campaignId}/households/{campaignHouseholdId}/assign-isolated-team`

### Nếu có nhiều hộ

Endpoint dùng:

- `PATCH /api/relief/campaigns/{campaignId}/households/isolated-team/bulk-assign`

### Dữ liệu gửi lên

- `campaignTeamId`
- `reliefPackageDefinitionId`
- `scheduledAt`
- `keepDoorToDoor = true`
- `notes`

### Kết quả

- tạo các `household delivery` thuộc nhánh door-to-door
- không ép household vào distribution point
- các delivery này sẽ là đầu vào cho mobile team xử lý tiếp

---

## Bước 7 - Chỉnh sửa và nhân bản delivery assignment

Flow mới trên web không dừng ở assign household, mà tiếp tục làm việc trực tiếp với `delivery assignment`.

### Endpoint

- `PATCH /api/relief/campaigns/{campaignId}/deliveries/{householdDeliveryId}`
- `DELETE /api/relief/campaigns/{campaignId}/deliveries/{householdDeliveryId}`
- `GET /api/relief/campaigns/{campaignId}/deliveries/{householdDeliveryId}`

### FE hook/service

- `usePatchReliefDeliveryAssignment()`
- `useDeleteReliefDeliveryAssignment()`
- `useReliefDeliveryDetail()`

### Các thao tác FE đang có

- sửa lại `deliveryMode`
- đổi `campaignTeamId`
- đổi `distributionPointId`
- đổi `reliefPackageDefinitionId`
- đổi `scheduledAt`
- sửa `notes`
- xoá một delivery assignment đã tạo

### Nhân bản delivery cho cùng household

Trong checklist, FE có flow `handleCreateAdditionalDelivery()` để tạo thêm lượt giao cho cùng một hộ.

Ý nghĩa nghiệp vụ:

- một household có thể nhận nhiều lượt giao
- sau khi nhân bản, Coordinator có thể mở form chỉnh lại package hoặc thông tin assignment cho lượt mới

---

## Bước 8 - Theo dõi checklist / deliveries / complete / shortage

### Checklist

- endpoint: `GET /api/relief/campaigns/{campaignId}/checklist`
- FE hook: `useReliefChecklist(...)`

Checklist là view điều phối trung tâm để Coordinator:

- rà lại từng delivery assignment
- mở sửa assignment
- nhân bản delivery
- mở complete delivery

### Deliveries

- endpoint: `GET /api/relief/campaigns/{campaignId}/deliveries`
- FE hook: `useReliefDeliveries(...)`

### Complete delivery đơn lẻ

- endpoint: `POST /api/relief/campaigns/{campaignId}/deliveries/{householdDeliveryId}/complete`
- FE hook: `useCompleteReliefDelivery()`

### Complete delivery theo batch

- endpoint: `POST /api/relief/campaigns/{campaignId}/deliveries/complete-batch`
- FE hook: `useCompleteReliefDeliveryBatch()`

### Shortage request

- tạo request: `POST /api/relief/campaigns/{campaignId}/shortage-requests`
- xem danh sách: `GET /api/relief/campaigns/{campaignId}/shortage-requests`
- duyệt: `PATCH /api/relief/campaigns/{campaignId}/shortage-requests/{shortageRequestId}/approve`
- từ chối: `PATCH /api/relief/campaigns/{campaignId}/shortage-requests/{shortageRequestId}/reject`

### FE hook liên quan

- `useShortageRequests(...)`
- `useApproveShortageRequest()`
- `useRejectShortageRequest()`

---

## 3. Những gì `ReliefDistributionPage.tsx` đang làm đúng hiện tại

### Đã đúng

- phân biệt `PickupAtPoint` và `DoorToDoor`
- với nhiều hộ cô lập thì dùng bulk assign
- gọi `plan-summary`
- cho phép filter households theo dữ liệu thực địa
- gắn package / lịch / team trước khi assign
- quản lý delivery assignment sau khi assign
- hỗ trợ nhân bản delivery cho cùng một household
- hỗ trợ complete delivery đơn lẻ và complete theo batch
- hỗ trợ duyệt shortage request ngay trên web

### Phần đã được cắm thay vì chỉ là gợi ý

- điều phối vehicle cho team
- chỉnh assignment trực tiếp ở cấp `delivery`
- theo dõi checklist / deliveries / shortage request

### Có thể mở rộng thêm ở UI

- render sâu hơn `planSummary.areas`
- render rõ hơn `planSummary.isolatedHouseholdItems`
- tách dashboard mobile-handoff rõ hơn giữa delivery và task

---

## 4. Flow Mobile cho Team Leader

## Mục tiêu

Mobile của Team Leader bắt đầu sau khi Coordinator đã tạo các `household delivery` cho team.

## Bước 1 - Lấy worklist của team

### Endpoint

`GET /api/relief/campaigns/{campaignId}/team-worklist`

### Ý nghĩa

Đây là entry point mobile đúng cho Team Leader để xem các deliveries mà team mình cần xử lý.

### Dữ liệu dùng cho mobile

- delivery nào thuộc team nào
- household nào đang chờ giao
- package nào cần mang theo
- delivery mode là pickup hay door-to-door
- lịch hẹn / scheduled time
- trạng thái delivery hiện tại

## Bước 2 - Tạo task chính cho đợt đi cứu trợ

### Endpoint

`POST /api/campaigns/{campaignId}/tasks`

### Role backend

- `Manager,Moderator`

### Ý nghĩa mobile

Team Leader tạo `campaign task` làm container nghiệp vụ cho một chuyến đi / một ca / một khu vực triển khai.

Ví dụ nội dung task:

- tuyến phát khu A
- nhóm pickup tại điểm phát số 1
- tổ cơ động cho cụm hộ cô lập ven sông

## Bước 3 - Xem danh sách task của campaign nếu cần

### Endpoint

`GET /api/campaigns/{campaignId}/tasks`

### Dùng khi

- Team Leader cần xem các task đã có
- cần tìm task phù hợp trước khi chia người

## Bước 4 - Gán thành viên vào task

### Endpoint

- `POST /api/campaigns/tasks/{campaignTaskId}/members`
- `POST /api/campaigns/tasks/{campaignTaskId}/members/bulk`

### Ý nghĩa

- tạo `member task` cho từng volunteer trong team
- một task có thể chia cho nhiều người

## Bước 5 - Tạo member task từ danh sách household nếu cần

### Endpoint

`POST /api/campaigns/tasks/{campaignTaskId}/members/from-households`

### Ý nghĩa

- backend hỗ trợ sinh member task dựa trên households
- phù hợp khi Team Leader muốn chia tuyến theo nhóm hộ ngay từ đầu

## Bước 6 - Gán deliveries vào từng member task

### Endpoint

- `POST /api/campaigns/tasks/{campaignTaskId}/members/batch-from-deliveries`
- `POST /api/campaigns/member-tasks/{memberTaskId}/deliveries`

### Ý nghĩa

Đây là bước nối từ `delivery assignment` sang execution trên mobile:

- Coordinator tạo delivery assignment cho team
- Team Leader lấy delivery từ `team-worklist`
- Team Leader phân delivery đó về từng member task của volunteer

## Bước 7 - Theo dõi tiến độ task và delivery của team

### Endpoint

- `GET /api/campaigns/tasks/{campaignTaskId}`
- `GET /api/campaigns/member-tasks/{memberTaskId}/deliveries`
- `PATCH /api/campaigns/member-tasks/{memberTaskId}/status`
- `PATCH /api/campaigns/member-task-deliveries/{memberTaskDeliveryId}/status`

### Ý nghĩa

Team Leader theo dõi:

- task tổng đang ở trạng thái nào
- volunteer nào đang giữ delivery nào
- delivery nào đã nhận việc, đang đi giao, đã xong, bị vướng

## Bước 8 - Khi thiếu hàng trong quá trình triển khai

### Endpoint

`POST /api/relief/campaigns/{campaignId}/shortage-requests`

### Ý nghĩa

Mobile của Team Leader có thể tạo shortage request để báo thiếu:

- gói cứu trợ
- vật tư tiêu hao
- tiền mặt hỗ trợ
- hoặc các loại supply cần cấp bổ sung

---

## 5. Flow Mobile cho Volunteer

## Bước 1 - Lấy task của chính mình

### Endpoint

`GET /api/campaigns/{campaignId}/member-tasks/me`

### Ý nghĩa

Volunteer chỉ cần nhìn danh sách việc của chính mình, không cần thấy toàn bộ campaign task.

## Bước 2 - Lấy deliveries được giao cho mình

### Endpoint

`GET /api/campaigns/{campaignId}/member-task-deliveries/me`

### Ý nghĩa

Đây là danh sách thực thi thực tế của volunteer:

- đi giao cho hộ nào
- package nào
- địa chỉ / điểm phát nào
- trạng thái hiện tại

## Bước 3 - Cập nhật trạng thái trong lúc làm việc

### Endpoint

- `PATCH /api/campaigns/member-tasks/{memberTaskId}/status`
- `PATCH /api/campaigns/member-task-deliveries/{memberTaskDeliveryId}/status`

### Ý nghĩa

Volunteer có thể báo:

- đã nhận việc
- đang thực hiện
- tạm hoãn / có sự cố
- hoàn tất bước giao ở cấp task con

## Bước 4 - Hoàn tất giao hàng kèm proof

### Endpoint mobile chính

`POST /api/campaigns/member-task-deliveries/{memberTaskDeliveryId}/complete-with-delivery`

### Ý nghĩa

Đây là flow complete đúng cho mobile hiện tại.

Khi volunteer complete ở endpoint này:

- member-task-delivery được complete
- delivery gốc của campaign cũng được complete đồng bộ theo service backend
- proof và ghi chú hoàn tất được đính kèm trong cùng action

### Khác với web Coordinator

- web Coordinator thường complete trực tiếp ở endpoint relief delivery
- mobile Volunteer complete qua endpoint `complete-with-delivery` để đồng bộ cả 2 lớp: task delivery và household delivery

## Bước 5 - Tạo shortage request nếu đang giao mà thiếu hàng

### Endpoint

`POST /api/relief/campaigns/{campaignId}/shortage-requests`

### Ý nghĩa

Volunteer có thể báo thiếu vật tư ngay tại hiện trường để Coordinator/Leader xử lý tiếp.

---

## 6. Mapping flow Web -> Mobile

### Giai đoạn 1 - Coordinator

- import household
- tạo package / point
- assign household thành `household delivery`
- chỉnh delivery assignment nếu cần

### Giai đoạn 2 - Team Leader

- lấy `team-worklist`
- gom deliveries thành `campaign task`
- chia người bằng `member task`
- gán deliveries cho từng member task

### Giai đoạn 3 - Volunteer

- lấy `member-tasks/me`
- lấy `member-task-deliveries/me`
- đi giao thực tế
- complete bằng `complete-with-delivery`

### Giai đoạn 4 - Đồng bộ tiến độ

- delivery hoàn tất sẽ phản ánh lại về danh sách deliveries/checklist của campaign
- shortage request được gửi ngược về luồng điều phối để xử lý tiếp

---

## 7. Endpoint nên ưu tiên theo từng role

## Coordinator - web

### Relief

- `POST /api/relief/campaigns/{campaignId}/households/import`
- `GET /api/relief/campaigns/{campaignId}/households`
- `GET /api/relief/campaigns/{campaignId}/plan-summary`
- `PATCH /api/relief/campaigns/{campaignId}/households/{campaignHouseholdId}/assign`
- `PATCH /api/relief/campaigns/{campaignId}/households/{campaignHouseholdId}/assign-isolated-team`
- `PATCH /api/relief/campaigns/{campaignId}/households/isolated-team/bulk-assign`
- `GET /api/relief/campaigns/{campaignId}/checklist`
- `GET /api/relief/campaigns/{campaignId}/deliveries`
- `PATCH /api/relief/campaigns/{campaignId}/deliveries/{householdDeliveryId}`
- `DELETE /api/relief/campaigns/{campaignId}/deliveries/{householdDeliveryId}`
- `POST /api/relief/campaigns/{campaignId}/deliveries/{householdDeliveryId}/complete`
- `POST /api/relief/campaigns/{campaignId}/deliveries/complete-batch`
- `GET /api/relief/campaigns/{campaignId}/shortage-requests`
- `PATCH /api/relief/campaigns/{campaignId}/shortage-requests/{shortageRequestId}/approve`
- `PATCH /api/relief/campaigns/{campaignId}/shortage-requests/{shortageRequestId}/reject`

## Team Leader - mobile

- `GET /api/relief/campaigns/{campaignId}/team-worklist`
- `POST /api/campaigns/{campaignId}/tasks`
- `GET /api/campaigns/{campaignId}/tasks`
- `GET /api/campaigns/tasks/{campaignTaskId}`
- `POST /api/campaigns/tasks/{campaignTaskId}/members`
- `POST /api/campaigns/tasks/{campaignTaskId}/members/bulk`
- `POST /api/campaigns/tasks/{campaignTaskId}/members/from-households`
- `POST /api/campaigns/tasks/{campaignTaskId}/members/batch-from-deliveries`
- `POST /api/campaigns/member-tasks/{memberTaskId}/deliveries`
- `GET /api/campaigns/member-tasks/{memberTaskId}/deliveries`
- `PATCH /api/campaigns/member-tasks/{memberTaskId}/status`
- `PATCH /api/campaigns/member-task-deliveries/{memberTaskDeliveryId}/status`
- `POST /api/relief/campaigns/{campaignId}/shortage-requests`

## Volunteer - mobile

- `GET /api/campaigns/{campaignId}/member-tasks/me`
- `GET /api/campaigns/{campaignId}/member-task-deliveries/me`
- `PATCH /api/campaigns/member-tasks/{memberTaskId}/status`
- `PATCH /api/campaigns/member-task-deliveries/{memberTaskDeliveryId}/status`
- `POST /api/campaigns/member-task-deliveries/{memberTaskDeliveryId}/complete-with-delivery`
- `POST /api/relief/campaigns/{campaignId}/shortage-requests`

---

## 8. Kết luận ngắn về flow mới

- `household` chỉ còn là dữ liệu đầu vào để Coordinator điều phối
- sau khi assign, đơn vị vận hành chính là `household delivery`
- mobile Team Leader không đi từ household nữa mà đi từ `team-worklist`
- mobile Volunteer không complete trực tiếp từ trang web Coordinator mà complete qua `member-task-delivery`
- `shortage request` là luồng chung dùng được trong lúc điều phối và cả lúc thực thi ngoài hiện trường
