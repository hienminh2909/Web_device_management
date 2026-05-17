package datn.web_datn.service

import datn.web_datn.model.LoginRequest
import datn.web_datn.model.LoginResponse
import org.springframework.stereotype.Service
import org.springframework.web.client.RestTemplate
import org.springframework.web.client.HttpStatusCodeException
import org.springframework.web.client.ResourceAccessException
import org.springframework.http.HttpEntity
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType

class ServerWakingUpException(message: String) : RuntimeException(message)

@Service
class AuthService {
    private val baseUrl = (System.getenv("API_BASE_URL") ?: "http://127.0.0.1:8000") + "/api/auth"

    fun authenticate(username: String, pass: String): LoginResponse? {
        val restTemplate = RestTemplate()
        val request = LoginRequest(username, pass)

        return try {
            restTemplate.postForObject("$baseUrl/login", request, LoginResponse::class.java)
        } catch (e: HttpStatusCodeException) {
            println("Lỗi HTTP login (${e.statusCode}): ${e.responseBodyAsString}")
            if (e.statusCode.value() == 401 || e.statusCode.value() == 403) {
                null // Đúng định dạng là sai tài khoản/mật khẩu
            } else {
                throw ServerWakingUpException("Hệ thống máy chủ đang kết nối lại (FastAPI đang thức giấc trên Render), vui lòng thử lại sau 10-15 giây!")
            }
        } catch (e: ResourceAccessException) {
            println("Lỗi kết nối máy chủ FastAPI: ${e.message}")
            throw ServerWakingUpException("Máy chủ đang khởi động (Render đang đánh thức dịch vụ FastAPI), vui lòng đợi khoảng 10-15 giây rồi đăng nhập lại!")
        } catch (e: Exception) {
            println("Lỗi login: ${e.message}")
            null
        }
    }

    fun forgotPassword(username: String): Map<String, Any>? {
        val restTemplate = RestTemplate()
        val headers = HttpHeaders()
        headers.contentType = MediaType.APPLICATION_JSON
        
        val body = mapOf("username" to username)
        val entity = HttpEntity(body, headers)

        return try {
            val response = restTemplate.postForEntity("$baseUrl/forgot-password", entity, Map::class.java)
            response.body as Map<String, Any>?
        } catch (e: Exception) {
            println("Lỗi forgot-password: ${e.message}")
            null
        }
    }
}

