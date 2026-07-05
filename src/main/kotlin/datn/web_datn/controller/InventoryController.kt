package datn.web_datn.controller

import datn.web_datn.service.InventoryService
import jakarta.servlet.http.HttpSession
import org.springframework.http.ResponseEntity
import org.springframework.stereotype.Controller
import org.springframework.ui.Model
import org.springframework.web.bind.annotation.*

@Controller
@RequestMapping("/inventory")
class InventoryController(
    private val inventoryService: InventoryService,
    private val deviceService: datn.web_datn.service.DeviceService,
    private val roomService: datn.web_datn.service.RoomService
) {

    @GetMapping("/logs")
    fun listLogs(model: Model, session: HttpSession): String {
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


        val rawProgress = inventoryService.getRoomsProgress(currentMonth, currentYear, token)
        

        val allDevices = try {
            deviceService.getAllDevices(token)
        } catch (e: Exception) {
            emptyList()
        }

        // TỐI ƯU: Nhóm thiết bị theo phòng trước khi lặp
        val devicesByRoom = allDevices.groupBy { it.rooms.room_name }


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
            inventoryService.exportInventory(id, roomName, month, year, token, response)
        }
    }

    @GetMapping("/export-all")
    fun exportAllRooms(
        @RequestParam month: Int,
        @RequestParam year: Int,
        session: HttpSession,
        response: jakarta.servlet.http.HttpServletResponse
    ) {
        val token = session.getAttribute("token") as String?
        if (token != null) {
            inventoryService.exportInventory(null, null, month, year, token, response)
        }
    }

    @PostMapping("/scan")
    @ResponseBody
    fun scanDevice(
        @RequestBody payload: Map<String, Any>,
        session: HttpSession
    ): ResponseEntity<Any> {
        val token = session.getAttribute("token") as String? ?: return ResponseEntity.status(401).body("Unauthorized")
        
        val deviceId = when (val idVal = payload["device_id"] ?: payload["device_code"]) {
            is Number -> idVal.toInt()
            is String -> idVal.toIntOrNull()
            else -> null
        } ?: return ResponseEntity.badRequest().body(mapOf("error" to "Thiếu hoặc sai định dạng ID thiết bị"))
        
        val statusAtScan = payload["status_at_scan"] as? String ?: "Tốt"
        
        return try {
            val result = inventoryService.scanDevice(deviceId, statusAtScan, token)
            ResponseEntity.ok(result ?: mapOf("message" to "Quét kiểm kê thành công"))
        } catch (e: Exception) {
            ResponseEntity.status(400).body(mapOf("error" to e.message))
        }
    }

    @DeleteMapping("/logs/{id}")
    @ResponseBody
    fun deleteLog(
        @PathVariable id: Int,
        session: HttpSession
    ): ResponseEntity<Any> {
        val token = session.getAttribute("token") as String? ?: return ResponseEntity.status(401).body("Unauthorized")
        val role = session.getAttribute("role") as String?
        if (role != "admin") {
            return ResponseEntity.status(403).body(mapOf("error" to "Chỉ admin mới có quyền xóa nhật ký"))
        }
        
        val success = inventoryService.deleteInventoryLog(id, token)
        return if (success) {
            ResponseEntity.ok(mapOf("message" to "Xóa nhật ký thành công"))
        } else {
            ResponseEntity.status(500).body(mapOf("error" to "Lỗi khi xóa nhật ký"))
        }
    }

    @DeleteMapping("/logs/clear")
    @ResponseBody
    fun clearLogs(
        session: HttpSession
    ): ResponseEntity<Any> {
        val token = session.getAttribute("token") as String? ?: return ResponseEntity.status(401).body("Unauthorized")
        val role = session.getAttribute("role") as String?
        if (role != "admin") {
            return ResponseEntity.status(403).body(mapOf("error" to "Chỉ admin mới có quyền dọn dẹp nhật ký"))
        }
        
        val success = inventoryService.clearAllInventoryLogs(token)
        return if (success) {
            ResponseEntity.ok(mapOf("message" to "Dọn dẹp nhật ký thành công"))
        } else {
            ResponseEntity.status(500).body(mapOf("error" to "Lỗi khi dọn dẹp nhật ký"))
        }
    }
}
