package datn.web_datn.model

data class RoomModel(
    val id: Int? = null,
    val room_name: String,
    val description: String? = null,
    val device_count: Int = 0
)
