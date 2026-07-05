package datn.web_datn.model

data class CategoryModel(
    val id: Int? = null,
    val category_name: String,
    val category_code: String,
    val description: String? = null,
    val device_count: Int = 0,
    val created_at: String? = null,
    val updated_at: String? = null
)
