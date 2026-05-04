package datn.web_datn.service

import datn.web_datn.model.LoginRequest
import datn.web_datn.model.LoginResponse
import org.springframework.stereotype.Service
import org.springframework.web.client.RestTemplate
import org.springframework.http.HttpEntity
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType

@Service
class AuthService {
    private val baseUrl = "http://127.0.0.1:8000/api/auth"

    fun authenticate(username: String, pass: String): LoginResponse? {
        val restTemplate = RestTemplate()
        val request = LoginRequest(username, pass)

        return try {
            restTemplate.postForObject("$baseUrl/login", request, LoginResponse::class.java)
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