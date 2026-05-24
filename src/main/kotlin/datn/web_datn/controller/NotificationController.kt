package datn.web_datn.controller

import datn.web_datn.service.NotificationService
import jakarta.servlet.http.HttpSession
import org.springframework.http.ResponseEntity
import org.springframework.stereotype.Controller
import org.springframework.ui.Model
import org.springframework.web.bind.annotation.*

@Controller
@RequestMapping
class NotificationController(private val notificationService: NotificationService) {

    @GetMapping("/notifications")
    fun notificationPage(model: Model, session: HttpSession): String {
        val token = session.getAttribute("token") as String?
        if (token == null) return "redirect:/login"
        
        model.addAttribute("view", "notification_list")
        return "dashboard"
    }

    @GetMapping("/api/notifications")
    @ResponseBody
    fun getMyNotifications(session: HttpSession): List<Map<String, Any>> {
        val token = session.getAttribute("token") as String?
        return notificationService.getMyNotifications(token)
    }

    @PostMapping("/api/notifications/{id}/read")
    @ResponseBody
    fun markAsRead(@PathVariable id: Int, session: HttpSession): ResponseEntity<Any> {
        val token = session.getAttribute("token") as String?
        val success = notificationService.markAsRead(id, token)
        return ResponseEntity.ok(mapOf("success" to success))
    }

    @PostMapping("/api/notifications/read-all")
    @ResponseBody
    fun markAllAsRead(session: HttpSession): ResponseEntity<Any> {
        val token = session.getAttribute("token") as String?
        val success = notificationService.markAllAsRead(token)
        return ResponseEntity.ok(mapOf("success" to success))
    }

    @DeleteMapping("/api/notifications/{id}")
    @ResponseBody
    fun deleteNotification(@PathVariable id: Int, session: HttpSession): ResponseEntity<Any> {
        val token = session.getAttribute("token") as String?
        val success = notificationService.deleteNotification(id, token)
        return ResponseEntity.ok(mapOf("success" to success))
    }

    @DeleteMapping("/api/notifications")
    @ResponseBody
    fun clearAllNotifications(session: HttpSession): ResponseEntity<Any> {
        val token = session.getAttribute("token") as String?
        val success = notificationService.clearAllNotifications(token)
        return ResponseEntity.ok(mapOf("success" to success))
    }
    @PostMapping("/api/notifications/test")
    @ResponseBody
    fun sendTestNotification(session: HttpSession): ResponseEntity<Any> {
        val token = session.getAttribute("token") as String?
        val headers = org.springframework.http.HttpHeaders()
        headers.setBearerAuth(token ?: "")
        val entity = org.springframework.http.HttpEntity<Unit>(headers)
        
        return try {
            val response = org.springframework.web.client.RestTemplate().exchange(
                (System.getenv("API_BASE_URL") ?: "http://127.0.0.1:8000") + "/api/notifications/test",
                org.springframework.http.HttpMethod.POST,
                entity,
                Map::class.java
            )
            ResponseEntity.ok(response.body)
        } catch (e: Exception) {
            ResponseEntity.status(500).body(mapOf("error" to e.message))
        }
    }
}
