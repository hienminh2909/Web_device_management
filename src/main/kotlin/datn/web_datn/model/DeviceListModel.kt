package datn.web_datn.model

// Khớp với RoomSchema
data class Room(
    val id: Int? = null,
    val room_name: String
)

// Khớp với CategorySchema
data class Category(
    val category_name: String
)

// Chi tiết từng thiết bị trong nhóm
data class DeviceDetail(
    val id: Int,
    val device_code: String,
    val qr_url: String?
)

// Khớp với DeviceResponse (Dữ liệu trả về từ API /api/devices)
data class DeviceResponse(
    val id: Int,
    val room_id: Int?,
    val device_name: String,
    val device_code: String,
    val status: String,
    val description: String?,
    val qr_url: String?,
    val barcode_url: String?,
    val created_at: String?,
    val updated_at: String?,
    val last_inventory_at: String?,
    val purchase_date: String?,
    val image_url: String?,
    val device_price: String?,
    val created_by: Int?,
    val rooms: Room,           // Object lồng
    val categories: Category,   // Object lồng
    val users: UserInfo?,       // Lấy tên admin
    val quantity: Int,
    val all_devices_detail: List<Map<String, Any>>? = null,
    var detailsJson: String? = null
)

data class DeviceUpdateRequest(
    val status: String? = null,
    val device_name: String? = null,
    val room_name: String? = null,
    val description: String? = null,
    val purchase_date: String? = null,
    val category: String? = null,
    val device_price: String? = null
)