package datn.web_datn.controller

import datn.web_datn.service.InventoryService
import jakarta.servlet.http.HttpSession
import org.springframework.stereotype.Controller
import org.springframework.ui.Model
import org.springframework.web.bind.annotation.*

@Controller
@RequestMapping("/inventory")
class InventoryController(private val inventoryService: InventoryService) {

    @GetMapping("/logs")
    fun listLogs(model: Model, session: HttpSession): String {
        val token = session.getAttribute("token") as String?
        if (token == null) return "redirect:/login"

        val logs = inventoryService.getInventoryLogs(token)
        model.addAttribute("logs", logs)
        model.addAttribute("view", "inventory_logs")
        return "dashboard"
    }

    @GetMapping("/progress")
    fun listProgress(
        @RequestParam(required = false) month: Int?, 
        @RequestParam(required = false) year: Int?, 
        model: Model, session: HttpSession
    ): String {
        val token = session.getAttribute("token") as String?
        if (token == null) return "redirect:/login"

        val currentMonth = month ?: java.time.LocalDate.now().monthValue
        val currentYear = year ?: java.time.LocalDate.now().year

        val progress = inventoryService.getRoomsProgress(currentMonth, currentYear, token)
        
        val totalSystemDevices = progress.sumOf { it.total }
        val totalSystemChecked = progress.sumOf { it.checked }
        val systemProgressPercent = if (totalSystemDevices > 0) (totalSystemChecked * 100 / totalSystemDevices) else 0

        model.addAttribute("progress", progress)
        model.addAttribute("totalSystemDevices", totalSystemDevices)
        model.addAttribute("totalSystemChecked", totalSystemChecked)
        model.addAttribute("systemProgressPercent", systemProgressPercent)
        
        model.addAttribute("selectedMonth", currentMonth)
        model.addAttribute("selectedYear", currentYear)
        model.addAttribute("view", "inventory_progress")
        return "dashboard"
    }

    @GetMapping("/progress/{id}")
    fun listRoomDetails(
        @PathVariable id: Int, 
        @RequestParam(required=false) roomName: String?, 
        @RequestParam(required = false) month: Int?, 
        @RequestParam(required = false) year: Int?, 
        model: Model, session: HttpSession
    ): String {
        val token = session.getAttribute("token") as String?
        if (token == null) return "redirect:/login"

        val currentMonth = month ?: java.time.LocalDate.now().monthValue
        val currentYear = year ?: java.time.LocalDate.now().year

        val details = inventoryService.getRoomDetails(id, currentMonth, currentYear, token)
        model.addAttribute("details", details)
        model.addAttribute("roomName", roomName ?: "Phòng $id")
        model.addAttribute("selectedMonth", currentMonth)
        model.addAttribute("selectedYear", currentYear)
        model.addAttribute("view", "inventory_details")
        return "dashboard"
    }

    @GetMapping("/export-room/{id}")
    fun exportRoom(
        @PathVariable id: Int,
        @RequestParam roomName: String,
        @RequestParam month: Int,
        @RequestParam year: Int,
        session: HttpSession,
        response: jakarta.servlet.http.HttpServletResponse
    ) {
        val token = session.getAttribute("token") as String?
        if (token != null) {
            inventoryService.exportRoomInventory(id, roomName, month, year, token, response)
        }
    }
}
