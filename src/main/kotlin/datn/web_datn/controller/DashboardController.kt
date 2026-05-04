package datn.web_datn.controller

import datn.web_datn.service.DashboardService
import datn.web_datn.service.DeviceService
import datn.web_datn.service.RoomService
import datn.web_datn.service.UserService
import datn.web_datn.service.RequestService
import datn.web_datn.service.ReportService

import org.springframework.stereotype.Controller
import org.springframework.ui.Model
import org.springframework.web.bind.annotation.GetMapping
import jakarta.servlet.http.HttpSession

@Controller
class DashboardController(
    private val dashboardService: DashboardService,
    private val deviceService: DeviceService,
    private val roomService: RoomService,
    private val userService: UserService,
    private val requestService: RequestService,
    private val reportService: ReportService,
    private val categoryService: datn.web_datn.service.CategoryService
) {

    @GetMapping("/dashboard")
    fun getDashboard(model: Model, session: HttpSession): String {
        val token = session.getAttribute("token") as? String ?: return "redirect:/login"

        val stats = dashboardService.getQuickStats(token)

        model.addAttribute("totalDevices", stats["total"] ?: 0)
        model.addAttribute("availableCount", stats["available"] ?: 0)
        model.addAttribute("brokenCount", stats["broken"] ?: 0)
        model.addAttribute("needMaintainCount", stats["needMaintain"] ?: 0)
        model.addAttribute("maintainingCount", stats["maintaining"] ?: 0)
        model.addAttribute("otherCount", stats["other"] ?: 0)
        model.addAttribute("totalValue", stats["totalValue"] ?: 0L)

        val roomLabels = stats["roomLabels"] ?: emptyList<String>()
        val roomData = stats["roomData"] ?: emptyList<Int>()
        model.addAttribute("roomLabels", roomLabels)
        model.addAttribute("roomData", roomData)

        try {
            val allRooms = roomService.getAllRooms(token)
            model.addAttribute("roomCount", allRooms.size)
            model.addAttribute("rooms", allRooms.map { it.room_name }.sorted())

            val allUsers = userService.getAllUsers(token)
            model.addAttribute("userCount", allUsers.size)

            val allRequests = requestService.getAllRequests(token)
            model.addAttribute("pendingRequestCount", allRequests.count { it.status_resolve == null })
            model.addAttribute("totalRequestCount", allRequests.size)

            val allCategories = categoryService.getAllCategories(token)
            model.addAttribute("categoryCount", allCategories.size)
            model.addAttribute("categories", allCategories.map { it.category_name }.sorted())

        } catch (e: Exception) {
            model.addAttribute("roomCount", 0)
            model.addAttribute("userCount", 0)
            model.addAttribute("pendingRequestCount", 0)
            model.addAttribute("totalRequestCount", 0)
            model.addAttribute("categoryCount", 0)
            model.addAttribute("rooms", emptyList<String>())
            model.addAttribute("categories", emptyList<String>())
        }

        // Donut chart: Tốt / Hỏng / Cần bảo trì / Đang bảo trì / Khác
        model.addAttribute("chartData", listOf(
            stats["available"] ?: 0,
            stats["broken"] ?: 0,
            stats["needMaintain"] ?: 0,
            stats["maintaining"] ?: 0,
            stats["other"] ?: 0
        ))

        // Recent Activities
        val activities = dashboardService.getRecentActivity(token)
        model.addAttribute("activities", activities)

        model.addAttribute("view", null)
        return "dashboard"
    }
}