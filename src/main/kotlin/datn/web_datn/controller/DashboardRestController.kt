package datn.web_datn.controller

import datn.web_datn.service.NotificationService
import datn.web_datn.service.RequestService
import jakarta.servlet.http.HttpSession
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/dashboard")
class DashboardRestController(
    private val notificationService: NotificationService,
    private val requestService: RequestService,
    private val dashboardService: datn.web_datn.service.DashboardService
) {

    @GetMapping("/inventory-history")
    fun getInventoryHistory(
        @org.springframework.web.bind.annotation.RequestParam(required = false) months: Int?,
        @org.springframework.web.bind.annotation.RequestParam(required = false) start: String?,
        @org.springframework.web.bind.annotation.RequestParam(required = false) end: String?,
        session: HttpSession
    ): ResponseEntity<Any> {
        val token = session.getAttribute("token") as? String ?: return ResponseEntity.status(401).body("Unauthorized")
        return try {
            val startDate = start?.let { java.time.LocalDate.parse("$it-01") }
            val endDate = end?.let { java.time.LocalDate.parse("$it-01").with(java.time.temporal.TemporalAdjusters.lastDayOfMonth()) }
            
            val history = dashboardService.getInventoryProgressHistory(token, months, startDate, endDate)
            ResponseEntity.ok(history)
        } catch (e: Exception) {
            ResponseEntity.status(500).body(mapOf("error" to e.message))
        }
    }

    @GetMapping("/quick-stats")
    fun getQuickStats(session: HttpSession): ResponseEntity<Any> {
        val token = session.getAttribute("token") as? String ?: return ResponseEntity.status(401).body("Unauthorized")
        return try {
            val stats = dashboardService.getQuickStats(token)
            ResponseEntity.ok(stats)
        } catch (e: Exception) {
            ResponseEntity.status(500).body(mapOf("error" to e.message))
        }
    }

    @GetMapping("/recent-activity")
    fun getRecentActivity(session: HttpSession): ResponseEntity<Any> {
        val token = session.getAttribute("token") as? String ?: return ResponseEntity.status(401).body("Unauthorized")
        return try {
            val activities = dashboardService.getRecentActivity(token)
            ResponseEntity.ok(activities)
        } catch (e: Exception) {
            ResponseEntity.status(500).body(mapOf("error" to e.message))
        }
    }

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
            val count = requests.count { it.status_resolve == null || it.status_resolve?.lowercase() == "pending" }
            mapOf("count" to count)
        } catch (e: Exception) {
            mapOf("count" to 0)
        }
    }
}
