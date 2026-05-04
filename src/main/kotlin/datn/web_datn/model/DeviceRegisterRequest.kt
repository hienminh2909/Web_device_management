package datn.web_datn.model

data class DeviceRegisterRequest(
    val device_name: String,
    val room_name: String,
    val category_name: String,
    val status: String,
    val description: String? = null,
    val purchase_date: String? = null,
    val device_price: String? = null,
    val quantity: Int = 1
)