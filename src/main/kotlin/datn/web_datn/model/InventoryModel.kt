package datn.web_datn.model

data class InventoryLogModel(
    val id: Int? = null,
    val device_id: Int,
    val status_at_scan: String? = null,
    val inventory_at: String? = null,
    val handheld_name: String? = null,
    val devices: DeviceInfo? = null
)

data class InventoryProgressModel(
    val room_id: Int,
    val room_name: String,
    val total: Int,
    val checked: Int,
    val progress: Int
)

data class InventoryDetailModel(
    val id: Int,
    val device_name: String,
    val device_code: String? = null,
    val status: String,
    val is_checked: Boolean,
    val last_check: String? = null
)
