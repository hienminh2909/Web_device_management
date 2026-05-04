package datn.web_datn.controller

import datn.web_datn.service.NotificationService
import datn.web_datn.service.RequestService
import jakarta.servlet.http.HttpSession
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/dashboard")
class DashboardRestController(
    private val notificationService: NotificationService,
    private val requestService: RequestService
) {

    @GetMapping("/unread-notifications-count")
    fun getUnreadCount(session: HttpSession): Map<String, Int> {
        val token = session.getAttribute("token") as String? ?: return mapOf("count" to 0)
        return try {
            val count = notificationService.getUnreadCount(token)
            mapOf("count" to count)
        } catch (e: Exception) {
            mapOf("count" to 0)
        }
    }

    @GetMapping("/pending-requests-count")
    fun getPendingRequestsCount(session: HttpSession): Map<String, Int> {
        val token = session.getAttribute("token") as String? ?: return mapOf("count" to 0)
        val role = session.getAttribute("role")?.toString()?.lowercase() ?: ""
        
        return try {
            val requests = if (role == "admin") {
                requestService.getAllRequests(token)
            } else {
                requestService.getMyRequests(token)
            }
            val count = requests.count { it.status_resolve == null }
            mapOf("count" to count)
        } catch (e: Exception) {
            mapOf("count" to 0)
        }
    }
}
