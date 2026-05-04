package datn.web_datn.model

// Gửi đi: Phải khớp với LoginRequest trong FastAPI (username, password)
data class LoginRequest(
    val username: String,
    val password: String
)

// Nhận về: Phải khớp với return của hàm login trong FastAPI
data class LoginResponse(
    val access_token: String,
    val token_type: String,
    val role: String,
    val full_name: String
)