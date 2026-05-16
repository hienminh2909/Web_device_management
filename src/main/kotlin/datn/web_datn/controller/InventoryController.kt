package datn.web_datn.controller

import datn.web_datn.service.InventoryService
import jakarta.servlet.http.HttpSession
import org.springframework.stereotype.Controller
import org.springframework.ui.Model
import org.springframework.web.bind.annotation.*

@Controller
@RequestMapping("/inventory")
class InventoryController(
    private val inventoryService: InventoryService,
    private val deviceService: datn.web_datn.service.DeviceService
) {

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
        
        val lastDayOfMonth = java.time.YearMonth.of(currentYear, currentMonth).atEndOfMonth()

        // 1. Lấy dữ liệu cơ bản từ API Kiểm kê (Chứa số lượng Checked)
        val rawProgress = inventoryService.getRoomsProgress(currentMonth, currentYear, token)
        
        // 2. Lấy toàn bộ thiết bị để tính toán Tổng thiết bị lịch sử (Historical Total)
        val allDevices = try {
            deviceService.getAllDevices(token)
        } catch (e: Exception) {
            emptyList()
        }

        // TỐI ƯU: Nhóm thiết bị theo phòng trước khi lặp
        val devicesByRoom = allDevices.groupBy { it.rooms.room_name }

        // 3. Cập nhật lại trường 'total' cho từng phòng dựa trên ngày mua
        val progress = rawProgress.map { p ->
            val roomDevices = devicesByRoom[p.room_name] ?: emptyList()
            val historicalTotal = roomDevices.filter { device ->
                try {
                    val purchaseStr = device.purchase_date
                    if (purchaseStr.isNullOrBlank()) true
                    else {
                        val purchaseDate = java.time.LocalDate.parse(purchaseStr.substring(0, 10))
                        !purchaseDate.isAfter(lastDayOfMonth)
                    }
                } catch (e: Exception) { true }
            }.sumOf { it.quantity }
            
            p.copy(total = historicalTotal)
        }
        
        val totalSystemDevices = progress.sumOf { it.total }
        val totalSystemChecked = progress.sumOf { it.checked }
        val systemProgressPercent = if (totalSystemDevices > 0) (totalSystemChecked * 100 / totalSystemDevices) else 0

        val now = java.time.LocalDate.now()
        val isPastPeriod = if (currentYear < now.year) true 
                           else if (currentYear == now.year && currentMonth < now.monthValue) true
                           else false

        model.addAttribute("progress", progress)
        model.addAttribute("totalSystemDevices", totalSystemDevices)
        model.addAttribute("totalSystemChecked", totalSystemChecked)
        model.addAttribute("systemProgressPercent", systemProgressPercent)
        model.addAttribute("isPastPeriod", isPastPeriod)
        
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
