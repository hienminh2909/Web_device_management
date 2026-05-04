package datn.web_datn.model

data class RequestModel(
    val id: Int? = null,
    val device_id: Int? = null,
    val created_by: Int? = null,
    val description: String? = null,
    val status_device: String? = null,
    val status_resolve: String? = null,
    val resolved_by: Int? = null,
    val created_at: String? = null,
    val resolved_at: String? = null,
    val request_type: String? = "REPORT",
    val update_payload: Map<String, Any>? = null,
    val json_payload: String? = "",
    val devices: DeviceInfo? = null,
    val users: UserInfo? = null,
    val resolver: UserInfo? = null
)

data class UserInfo(
    val full_name: String? = null
)

data class DeviceInfo(
    val device_name: String? = null,
    val device_code: String? = null,
    val room_id: Int? = null,
    val rooms: RoomInfo? = null
)

data class RoomInfo(
    val room_name: String? = null
)
