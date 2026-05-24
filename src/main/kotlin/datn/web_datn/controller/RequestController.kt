package datn.web_datn.controller

import datn.web_datn.service.RequestService
import datn.web_datn.service.RoomService
import datn.web_datn.service.ReportService
import datn.web_datn.service.RequestExportService
import datn.web_datn.model.RequestModel
import jakarta.servlet.http.HttpSession
import org.springframework.stereotype.Controller
import org.springframework.ui.Model
import org.springframework.web.bind.annotation.*
import org.springframework.http.ResponseEntity

@Controller
@RequestMapping("/requests")
class RequestController(
    private val requestService: RequestService,
    private val roomService: RoomService,
    private val reportService: ReportService,
    private val requestExportService: RequestExportService
) {

    @GetMapping("/export")
    fun exportRequests(
        @RequestParam(required = false) tab: String?,
        @RequestParam(required = false) status: String?,
        @RequestParam(required = false) search: String?,
        session: HttpSession, 
        response: jakarta.servlet.http.HttpServletResponse
    ) {
        val token = session.getAttribute("token") as String? ?: return
        val role = session.getAttribute("role")?.toString()?.lowercase() ?: ""
        
        var requests = if (role == "admin") {
            requestService.getAllRequests(token)
        } else {
            requestService.getMyRequests(token)
        }

        val mainTab = tab ?: "REPORT"
        val filterStatus = status ?: "all"
        val searchQuery = search?.lowercase() ?: ""

        requests = requests.filter { req ->
            val reqType = req.request_type ?: "REPORT"
            val reqStatus = if (req.status_resolve.isNullOrEmpty() || req.status_resolve == "pending") "pending" else req.status_resolve
            
            var show = true
            if (mainTab == "REPORT") {
                if (reqType != "REPORT") show = false
            } else {
                if (reqType == "REPORT") show = false
            }

            if (filterStatus != "all" && reqStatus != filterStatus) show = false
            
            if (searchQuery.isNotEmpty()) {
                val devName = req.devices?.device_name?.lowercase() ?: (req.update_payload?.get("device_name") as? String)?.lowercase() ?: ""
                val devCode = req.devices?.device_code?.lowercase() ?: (req.update_payload?.get("device_code") as? String)?.lowercase() ?: ""
                val roomName = req.devices?.rooms?.room_name?.lowercase() ?: (req.update_payload?.get("room_name") as? String)?.lowercase() ?: ""
                
                if (!devName.contains(searchQuery) && !devCode.contains(searchQuery) && !roomName.contains(searchQuery)) {
                    show = false
                }
            }
            show
        }
        
        requestExportService.exportToExcel(requests, response)
    }

    @GetMapping
    fun listRequests(@RequestParam(required = false) status: String?, model: Model, session: HttpSession): String {
        return "redirect:/requests/view"
    }

    @GetMapping("/view")
    fun viewRequests(model: Model, session: HttpSession): String {
        val token = session.getAttribute("token") as String?
        val role = session.getAttribute("role")?.toString()?.lowercase() ?: ""
        if (token == null) return "redirect:/login"

        val requests = if (role == "admin") {
            requestService.getAllRequests(token)
        } else {
            requestService.getMyRequests(token)
        }
        
        // Chuyển đổi payload thành JSON string để Thymeleaf không bị lỗi
        val mapper = com.fasterxml.jackson.databind.ObjectMapper()
        val processedRequests = requests.map { req ->
            val payloadJson = if (req.update_payload != null) {
                try { mapper.writeValueAsString(req.update_payload) } catch (e: Exception) { "" }
            } else ""
            req.copy(json_payload = payloadJson)
        }
        
        val rooms = roomService.getAllRooms(token)
        
        model.addAttribute("requests", processedRequests)
        model.addAttribute("rooms", rooms)
        model.addAttribute("view", "request_list")
        return "dashboard"
    }


    @PostMapping("/{id}/resolve")
    @ResponseBody
    fun resolveRequest(@PathVariable id: Int, @RequestParam status: String, session: HttpSession): ResponseEntity<Any> {
        val token = session.getAttribute("token") as String?
        if (token == null) return ResponseEntity.status(401).body("Unauthorized")

        println(">>> REQUEST CONTROLLER: Resolving Request $id to $status")
        val result = requestService.resolveRequest(id, status, token)
        return ResponseEntity.ok(result ?: mapOf("success" to true))
    }

    @PostMapping("/api/create")
    @ResponseBody
    fun createRequest(@RequestBody payload: Map<String, Any>, session: HttpSession): ResponseEntity<Any> {
        val token = session.getAttribute("token") as String?
        if (token == null) return ResponseEntity.status(401).body("Unauthorized")

        val deviceId = payload["device_id"]?.toString()?.toIntOrNull() ?: 0
        val description = payload["description"]?.toString() ?: ""
        val statusDevice = payload["status_device"]?.toString() ?: "pending"
        
        println(">>> REQUEST CONTROLLER: Create Request - Device: $deviceId, Desc: $description")
        val result = requestService.createRequest(deviceId, description, statusDevice, token)
        return if (result != null) ResponseEntity.ok(result)
        else ResponseEntity.status(400).body(mapOf("error" to "Gửi yêu cầu thất bại"))
    }

    @PostMapping("/api/advanced")
    @ResponseBody
    fun createAdvancedRequest(@RequestBody payload: Map<String, Any>, session: HttpSession): ResponseEntity<Any> {
        return try {
            val token = session.getAttribute("token") as String?
            if (token == null) return ResponseEntity.status(401).body("Unauthorized")

            println(">>> DEBUG: Received Advanced Request Payload: $payload")
            
            val deviceId = payload["device_id"]?.toString()?.toIntOrNull() ?: 0
            val description = payload["description"]?.toString() ?: ""
            val requestType = payload["request_type"]?.toString() ?: "REPORT"
            val updateData = payload["update_payload"] as? Map<String, Any>
            
            println(">>> DEBUG: Processing Type: $requestType, Device: $deviceId")
            
            val result = requestService.createAdvancedRequest(deviceId, description, requestType, updateData, token)
            
            if (result != null) {
                println(">>> DEBUG: Success creating advanced request: ${result.id}")
                ResponseEntity.ok(result)
            } else {
                println(">>> DEBUG: RequestService returned null for advanced request")
                ResponseEntity.status(400).body(mapOf("error" to "Gửi yêu cầu thất bại. Vui lòng kiểm tra lại cấu trúc dữ liệu hoặc database."))
            }
        } catch (e: Exception) {
            println(">>> DEBUG: CRITICAL ERROR in createAdvancedRequest: ${e.message}")
            e.printStackTrace()
            ResponseEntity.status(500).body(mapOf("error" to "Lỗi hệ thống: ${e.message}"))
        }
    }

    @DeleteMapping("/{id}")
    @ResponseBody
    fun deleteRequest(@PathVariable id: Int, session: HttpSession): ResponseEntity<Any> {
        val token = session.getAttribute("token") as String? ?: return ResponseEntity.status(401).body("Unauthorized")
        val role = session.getAttribute("role")?.toString()?.lowercase() ?: ""
        if (role != "admin") {
            return ResponseEntity.status(403).body(mapOf("error" to "Chỉ admin mới có quyền xóa yêu cầu"))
        }

        val success = requestService.deleteRequest(id, token)
        return if (success) {
            ResponseEntity.ok(mapOf("message" to "Xóa yêu cầu thành công"))
        } else {
            ResponseEntity.status(500).body(mapOf("error" to "Lỗi khi xóa yêu cầu"))
        }
    }

    @DeleteMapping("/clear")
    @ResponseBody
    fun clearAllRequests(session: HttpSession): ResponseEntity<Any> {
        val token = session.getAttribute("token") as String? ?: return ResponseEntity.status(401).body("Unauthorized")
        val role = session.getAttribute("role")?.toString()?.lowercase() ?: ""
        if (role != "admin") {
            return ResponseEntity.status(403).body(mapOf("error" to "Chỉ admin mới có quyền xóa yêu cầu"))
        }

        val success = requestService.clearAllRequests(token)
        return if (success) {
            ResponseEntity.ok(mapOf("message" to "Dọn dẹp toàn bộ yêu cầu thành công"))
        } else {
            ResponseEntity.status(500).body(mapOf("error" to "Lỗi khi dọn dẹp yêu cầu"))
        }
    }
}
