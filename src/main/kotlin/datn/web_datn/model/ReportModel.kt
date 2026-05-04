package datn.web_datn.model

data class ReportModel(
    val id: Int? = null,
    val device_id: Int,
    val status: String,
    val note: String? = null,
    val description: String? = null,
    val handheld_name: String? = null,
    val reported_at: String? = null,
    val devices: DeviceInfo? = null,
    val users: UserInfo? = null,
    val resolver: UserInfo? = null
)
