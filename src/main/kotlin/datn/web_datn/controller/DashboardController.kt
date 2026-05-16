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
        model.addAttribute("view", null)
        return "dashboard"
    }

    @GetMapping("/")
    fun getRoot(): String {
        return "redirect:/dashboard"
    }
}
