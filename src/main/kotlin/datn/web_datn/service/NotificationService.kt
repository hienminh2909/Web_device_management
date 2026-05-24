package datn.web_datn.service

import org.springframework.core.ParameterizedTypeReference
import org.springframework.http.*
import org.springframework.stereotype.Service
import org.springframework.web.client.RestTemplate

@Service
class NotificationService(private val restTemplate: RestTemplate) {
    private val apiUrl = (System.getenv("API_BASE_URL") ?: "http://127.0.0.1:8000") + "/api/notifications"

    fun getMyNotifications(token: String?): List<Map<String, Any>> {
        val headers = HttpHeaders()
        headers.setBearerAuth(token ?: "")
        val entity = HttpEntity<Unit>(headers)
        return try {
            println(">>> NOTIF SERVICE: Fetching from $apiUrl with token length: ${token?.length}")
            val response = restTemplate.exchange(
                apiUrl,
                HttpMethod.GET,
                entity,
                object : ParameterizedTypeReference<List<Map<String, Any>>>() {}
            )
            val data = response.body ?: emptyList()
            println(">>> NOTIF SERVICE: Received ${data.size} notifications")
            data
        } catch (e: Exception) {
            println(">>> NOTIF SERVICE: ERROR - ${e.message}")
            emptyList()
        }
    }

    fun markAsRead(notifId: Int, token: String?): Boolean {
        val headers = HttpHeaders()
        headers.setBearerAuth(token ?: "")
        val entity = HttpEntity<Unit>(headers)
        return try {
            restTemplate.exchange("$apiUrl/$notifId/read", HttpMethod.POST, entity, Map::class.java)
            true
        } catch (e: Exception) {
            false
        }
    }

    fun markAllAsRead(token: String?): Boolean {
        val headers = HttpHeaders()
        headers.setBearerAuth(token ?: "")
        val entity = HttpEntity<Unit>(headers)
        return try {
            restTemplate.exchange("$apiUrl/read-all", HttpMethod.POST, entity, Map::class.java)
            true
        } catch (e: Exception) {
            false
        }
    }

    fun deleteNotification(notifId: Int, token: String?): Boolean {
        val headers = HttpHeaders()
        headers.setBearerAuth(token ?: "")
        val entity = HttpEntity<Unit>(headers)
        return try {
            restTemplate.exchange("$apiUrl/$notifId", HttpMethod.DELETE, entity, Map::class.java)
            true
        } catch (e: Exception) {
            false
        }
    }

    fun clearAllNotifications(token: String?): Boolean {
        val headers = HttpHeaders()
        headers.setBearerAuth(token ?: "")
        val entity = HttpEntity<Unit>(headers)
        return try {
            restTemplate.exchange(apiUrl, HttpMethod.DELETE, entity, Map::class.java)
            true
        } catch (e: Exception) {
            false
        }
    }

    fun getUnreadCount(token: String?): Int {
        val all = getMyNotifications(token)
        return all.count { 
            val isRead = it["is_read"]
            // Kiểm tra linh hoạt nhiều kiểu dữ liệu (Boolean, Integer 0, hoặc String "false")
            isRead == false || isRead == 0 || isRead == "false"
        }
    }
}
