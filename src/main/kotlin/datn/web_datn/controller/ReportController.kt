package datn.web_datn.controller

import datn.web_datn.service.InventoryService
import jakarta.servlet.http.HttpSession
import org.springframework.stereotype.Controller
import org.springframework.ui.Model
import org.springframework.web.bind.annotation.*

@Controller
@RequestMapping("/reports")
class ReportController(
    private val inventoryService: InventoryService,
    private val roomService: datn.web_datn.service.RoomService
) {

    @GetMapping
    fun listReports(model: Model, session: HttpSession): String {
        val token = session.getAttribute("token") as String?
        if (token == null) return "redirect:/login"

        val logs = inventoryService.getInventoryLogs(token)
        val rooms = try {
            roomService.getAllRooms(token).map { it.room_name }.sorted()
        } catch (e: Exception) {
            emptyList<String>()
        }

        model.addAttribute("logs", logs)
        model.addAttribute("rooms", rooms)
        model.addAttribute("isAdmin", session.getAttribute("role") == "admin")
        model.addAttribute("view", "inventory_logs")
        return "dashboard"
    }
}

