package datn.web_datn.model

data class UserModel(
    val id: Int? = null,
    val full_name: String,
    val username: String,
    val role: String,
    val phone: String? = null,
    val email: String? = null,
    val room_id: Int? = null,
    val room_name: String? = null,
    val created_at: String? = null
)

data class UserCreateRequest(
    val full_name: String,
    val username: String,
    val password_hash: String,
    val role: String,
    val phone: String? = null,
    val email: String? = null,
    val room_id: Int? = null
)

data class UserUpdateRequest(
    val full_name: String? = null,
    val role: String? = null,
    val phone: String? = null,
    val email: String? = null,
    val room_id: Int? = null
)
