package datn.web_datn.controller

import datn.web_datn.model.DeviceUpdateRequest
import datn.web_datn.model.DeviceResponse
import datn.web_datn.service.DeviceService
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import jakarta.servlet.http.HttpSession
import org.springframework.http.ResponseEntity
import org.springframework.stereotype.Controller
import org.springframework.ui.Model
import org.springframework.web.bind.annotation.*
import jakarta.servlet.http.HttpServletResponse

@Controller
class DeviceController(
    private val deviceService: DeviceService,
    private val roomService: datn.web_datn.service.RoomService,
    private val categoryService: datn.web_datn.service.CategoryService
) { 

    @GetMapping("/devices/list")
    fun listPage(
        @RequestParam(required = false) categoryId: Int?,
        @RequestParam(required = false) categoryName: String?,
        @RequestParam(required = false) roomId: Int?,
        @RequestParam(required = false) roomName: String?,
        @RequestParam(required = false) openAdd: Boolean?,
        @RequestParam(required = false) search: String?,
        @RequestParam(required = false) code: String?,
        model: Model, 
        session: HttpSession
    ): String {
        println("DEBUG: Device List Page - CatID: $categoryId, RoomID: $roomId, OpenAdd: $openAdd")
        val token = session.getAttribute("token") as? String ?: return "redirect:/login"

        // Load rooms and categories fast from Cache
        val rooms = roomService.getAllRooms(token)
        val categories = categoryService.getAllCategories(token)

        model.addAttribute("devices", emptyList<Any>()) // Empty for Skeleton Load
        model.addAttribute("rooms", rooms.map { it.room_name }.sorted())
        model.addAttribute("categories", categories.map { it.category_name }.sorted())
        model.addAttribute("view", "device_list")
        model.addAttribute("status", listOf("Tốt", "Hỏng", "Cần bảo trì", "Đang bảo trì", "Mất"))
        
        // Truyền các bộ lọc ban đầu
        model.addAttribute("initialCategoryId", categoryId)
        model.addAttribute("initialCategoryName", categoryName)
        model.addAttribute("initialRoomId", roomId)
        model.addAttribute("initialRoomName", roomName)
        model.addAttribute("initialSearch", search)
        model.addAttribute("initialCode", code)
        
        model.addAttribute("openAdd", openAdd ?: false)
        return "dashboard"
    }

    @GetMapping("/devices/list/fragment")
    fun getDeviceCardsFragment(model: Model, session: HttpSession): String {
        val token = session.getAttribute("token") as? String ?: return ""
        val devices = deviceService.getAllDevices(token)
        model.addAttribute("devices", devices)
        return "device_list :: deviceListContent"
    }


    @GetMapping("/api/devices/all")
    @ResponseBody
    fun getAllDevicesJson(
        @RequestParam(required = false) roomId: Int?,
        @RequestParam(required = false) ids: String?,
        session: HttpSession
    ): ResponseEntity<Any> {
        val token = session.getAttribute("token") as? String ?: return ResponseEntity.status(401).body("Unauthorized")
        val devices = deviceService.getRawDevices(token, roomId, ids)
        return ResponseEntity.ok(devices)
    }

    @GetMapping("/api/devices/summary")
    @ResponseBody
    fun getDevicesSummaryJson(session: HttpSession): ResponseEntity<Any> {
        val token = session.getAttribute("token") as? String ?: return ResponseEntity.status(401).body("Unauthorized")
        val devices = deviceService.getAllDevices(token)
        return ResponseEntity.ok(devices)
    }

    @PutMapping("/update/{id}")
    @ResponseBody // Thêm cái này để Spring biết đây là API trả về JSON, không phải tìm file HTML
    fun updateDevice(
        @PathVariable id: Int,
        @RequestBody request: DeviceUpdateRequest,
        session: HttpSession
    ): ResponseEntity<Any> {
        val token = session.getAttribute("token") as? String
        return try {
            val result = deviceService.updateDevice(id, request, token)
            ResponseEntity.ok(result ?: mapOf("message" to "Cập nhật thành công"))
        } catch (e: Exception) {
            ResponseEntity.status(400).body(mapOf("error" to e.message))
        }
    }


    @DeleteMapping("/delete/{id}")
    @ResponseBody
    fun deleteDevice(@PathVariable id: Int, session: HttpSession): ResponseEntity<Any> {
        val token = session.getAttribute("token") as? String
        return try {
            val result = deviceService.deleteDevice(id, token)
            ResponseEntity.ok(result ?: mapOf("message" to "Xóa thành công"))
        } catch (e: Exception) {
            ResponseEntity.status(403).body(mapOf("error" to e.message))
        }
    }

    @DeleteMapping("/delete-multiple")
    @ResponseBody
    fun deleteMultipleDevices(
        @RequestBody payload: Map<String, List<Int>>,
        session: HttpSession
    ): ResponseEntity<Any> {
        val token = session.getAttribute("token") as? String
        val ids = payload["ids"] ?: return ResponseEntity.badRequest().body(mapOf("error" to "Danh sách ID trống"))

        return try {
            // Gọi service xử lý xóa hàng loạt
            val result = deviceService.deleteMultipleDevices(ids, token)
            ResponseEntity.ok(result)
        } catch (e: Exception) {
            ResponseEntity.status(403).body(mapOf("error" to e.message))
        }
    }

    @PutMapping("/update-multiple")
    @ResponseBody
    fun updateMultipleDevices(
        @RequestBody payload: Map<String, Any>,
        session: HttpSession
    ): ResponseEntity<Any> {
        val token = session.getAttribute("token") as? String
        
        val idsRaw = payload["ids"] as? List<*> ?: return ResponseEntity.badRequest().body(mapOf("error" to "Danh sách ID trống"))
        val ids = idsRaw.mapNotNull { (it as? Number)?.toInt() }
        if (ids.isEmpty()) return ResponseEntity.badRequest().body(mapOf("error" to "Danh sách ID trống"))
        
        val mapper = jacksonObjectMapper()
        val requestJson = mapper.writeValueAsString(payload["fields"] ?: emptyMap<String, Any>())
        val request = mapper.readValue(requestJson, DeviceUpdateRequest::class.java)

        return try {
            val result = deviceService.updateMultipleDevices(ids, request, token)
            ResponseEntity.ok(result)
        } catch (e: Exception) {
            ResponseEntity.status(400).body(mapOf("error" to e.message))
        }
    }


    @GetMapping("/devices/export-excel")
    fun exportExcel(
        @RequestParam(required = false) room: String?,
        @RequestParam(required = false) category: String?,
        @RequestParam(required = false) search: String?,
        @RequestParam(required = false) status: String?, // Nhận thêm status
        session: HttpSession,
        response: HttpServletResponse
    ) {
        val token = session.getAttribute("token") as? String ?: ""

        // 1. Lấy toàn bộ danh sách từ Service
        var devices = deviceService.getAllDevices(token)

        // 2. Thực hiện lọc dữ liệu ngay tại Controller
        if (!room.isNullOrBlank()) {
            devices = devices.filter { it.rooms.room_name.equals(room, ignoreCase = true) }
        }

        if (!category.isNullOrBlank()) {
            devices = devices.filter { it.categories.category_name.equals(category, ignoreCase = true) }
        }

        if (!status.isNullOrBlank()) {
            devices = devices.filter { it.status.equals(status, ignoreCase = true) }
        }

        if (!search.isNullOrBlank()) {
            val s = search.lowercase()
            devices = devices.filter {
                it.device_name.lowercase().contains(s) || it.device_code.lowercase().contains(s)
            }
        }

        // 3. Truyền danh sách ĐÃ LỌC vào Service để xuất file
        deviceService.exportToExcel(devices, response)
    }


    @GetMapping("/devices/export-by-ids")
    fun exportByIds(
        @RequestParam ids: String,
        session: HttpSession,
        response: HttpServletResponse
    ) {
        val token = session.getAttribute("token") as? String ?: return
        val idList = ids.split(",").mapNotNull { it.toIntOrNull() }
        if (idList.isNotEmpty()) {
            deviceService.exportSelectedDevices(idList, token, response)
        }
    }

    @GetMapping("/devices/download-template")
    fun downloadTemplate(response: HttpServletResponse) {
        deviceService.downloadTemplate(response)
    }
}
