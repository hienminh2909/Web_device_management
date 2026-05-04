# Kế hoạch Cấu trúc API & Danh sách Endpoints

Dựa trên yêu cầu của bạn, tôi đã cập nhật lại kế hoạch:
- **Tạm thời bỏ qua** các cải tiến về bảo mật (Vẫn giữ nguyên khóa cấu hình cứng, mật khẩu plaintext, thời gian JWT là 1 ngày).
- **Giữ nguyên logic** tạo QR Code/Barcode đồng bộ như hiện tại.
- **Tập trung** vào việc tổ chức lại cấu trúc mã nguồn theo mô hình MVC (Routes, Controllers/Services, Models) và chuẩn hóa lại các endpoint.

Dưới đây là Danh sách tất cả các API Endpoints và chức năng tương ứng mà hệ thống sẽ có sau khi cấu trúc lại. Xin vui lòng xem xét.

## User Review Required
> [!IMPORTANT]
> Dưới đây là danh sách các API Endpoints tôi đề xuất dựa trên code cũ và các bảng trong Database. Bạn vui lòng xem qua các HTTP Method, URL và chức năng xem đã phù hợp và đầy đủ với nhu cầu của bạn chưa nhé. 

## Danh sách API Endpoints dự kiến

### 1. Xác thực (Auth) - `api/routers/auth.py`
| Method | Endpoint | Quyền | Chức năng |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Đăng nhập hệ thống (trả về JWT Token) |
| PUT | `/api/auth/password` | User (Token) | Đổi mật khẩu của user đang đăng nhập |

### 2. Quản lý Thiết bị (Devices) - `api/routers/devices.py`
| Method | Endpoint | Quyền | Chức năng |
|---|---|---|---|
| GET | `/api/devices` | User/Admin | Lấy danh sách chi tiết thiết bị (Hỗ trợ lọc theo phòng, danh mục, trạng thái, tìm kiếm, có phân trang) |
| GET | `/api/devices/summary` | User/Admin | Lấy danh sách thiết bị dạng gom nhóm (Giống API GET `/api/devices` cũ của bạn) |
| POST | `/api/devices` | Admin | Đăng ký thiết bị mới (Thay thế cho `/register` cũ, vẫn gọi tạo QR/Barcode) |
| POST | `/api/devices/import` | Admin | Import thiết bị từ file Excel (Thay thế cho `/import-and-register` cũ) |
| PUT | `/api/devices/{id}` | Admin | Cập nhật thông tin thiết bị (Trạng thái, Tên, Phòng, Danh mục...) |
| DELETE | `/api/devices/{id}` | Admin | Xóa thiết bị khỏi hệ thống |

### 3. Kiểm kê (Inventory) - `api/routers/inventory.py`
| Method | Endpoint | Quyền | Chức năng |
|---|---|---|---|
| GET | `/api/inventory/rooms-progress` | User/Admin | Lấy tiến độ kiểm kê của các phòng trong tháng |
| GET | `/api/inventory/rooms/{room_id}/details` | User/Admin | Lấy danh sách các thiết bị trong 1 phòng và trạng thái đã kiểm kê hay chưa |
| POST | `/api/inventory/scan` | User/Admin | Ghi nhận quét kiểm kê cho 1 thiết bị (Cập nhật `last_inventory_at` và thêm log vào `inventory_logs`) |

### 4. Quản lý Phòng (Rooms) - `api/routers/rooms.py`
| Method | Endpoint | Quyền | Chức năng |
|---|---|---|---|
| GET | `/api/rooms` | User/Admin | Lấy danh sách phòng |
| POST | `/api/rooms` | Admin | Tạo phòng mới |
| PUT | `/api/rooms/{id}` | Admin | Cập nhật thông tin phòng |
| DELETE | `/api/rooms/{id}` | Admin | Xóa phòng |

### 5. Quản lý Danh mục (Categories) - `api/routers/categories.py`
| Method | Endpoint | Quyền | Chức năng |
|---|---|---|---|
| GET | `/api/categories` | User/Admin | Lấy danh sách các loại thiết bị |
| POST | `/api/categories` | Admin | Tạo loại thiết bị mới |
| PUT | `/api/categories/{id}` | Admin | Cập nhật loại thiết bị |
| DELETE | `/api/categories/{id}` | Admin | Xóa loại thiết bị |

### 6. Quản lý Người dùng (Users) - `api/routers/users.py`
| Method | Endpoint | Quyền | Chức năng |
|---|---|---|---|
| GET | `/api/users` | Admin | Lấy danh sách người dùng trong hệ thống |
| POST | `/api/users` | Admin | Tạo người dùng mới (Giáo viên / Admin) |
| PUT | `/api/users/{id}` | Admin | Sửa thông tin người dùng |
| DELETE | `/api/users/{id}` | Admin | Xóa người dùng |

*(Các bảng như `report_logs`, `requests` hiện chưa thấy API trong code cũ, nếu bạn muốn làm luôn tính năng báo hỏng/sửa chữa thì tôi sẽ bổ sung thêm các Endpoint cho chúng).

## Các thay đổi chính về code
- Loại bỏ hoàn toàn sự phụ thuộc các logic chung trong 1 file `test_login_device_app.py`.
- Tối ưu truy vấn bằng `GROUP BY` đối với hàm đếm thiết bị của API `rooms-progress` để giảm tình trạng truy vấn lặp (N+1 query).
- Các models truyền nhận dữ liệu (`dict`) sẽ được chuyển hoàn toàn sang Pydantic Model.
