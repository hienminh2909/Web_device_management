package datn.web_datn.controller

import datn.web_datn.model.RoomModel
import datn.web_datn.service.RoomService
import jakarta.servlet.http.HttpSession
import org.springframework.stereotype.Controller
import org.springframework.ui.Model
import org.springframework.web.bind.annotation.*
import org.springframework.http.ResponseEntity

@Controller
@RequestMapping("/rooms")
class RoomController(private val roomService: RoomService) {

    @GetMapping
    fun listRooms(model: Model, session: HttpSession): String {
        val token = session.getAttribute("token") as String?
        val role = session.getAttribute("role") as String?
        if (token == null) return "redirect:/login"
        if (role != "admin") return "redirect:/dashboard"

        val rooms = roomService.getAllRooms(token)
        model.addAttribute("rooms", rooms)
        model.addAttribute("view", "room_list")
        return "dashboard"
    }

    @PostMapping("/add")
    @ResponseBody
    fun addRoom(@RequestBody payload: Map<String, Any>, session: HttpSession): ResponseEntity<Any> {
        return try {
            val token = session.getAttribute("token") as String?
            if (token == null) return ResponseEntity.status(401).body(mapOf("error" to "Phiên đăng nhập hết hạn"))
            
            println(">>> ROOM CONTROLLER: [POST] /add - Payload: $payload")
            val result = roomService.createRoomFromMap(payload, token)
            
            if (result?.containsKey("error") == true) {
                return ResponseEntity.status(400).body(result)
            }
            ResponseEntity.ok(result ?: mapOf("success" to true))
        } catch (e: Exception) {
            ResponseEntity.status(500).body(mapOf("error" to e.message))
        }
    }

    @PutMapping("/{id}")
    @ResponseBody
    fun updateRoom(@PathVariable id: Int, @RequestBody payload: Map<String, Any>, session: HttpSession): ResponseEntity<Any> {
        return try {
            val token = session.getAttribute("token") as String?
            if (token == null) return ResponseEntity.status(401).body(mapOf("error" to "Phiên đăng nhập hết hạn"))
            
            println(">>> ROOM CONTROLLER: [PUT] /$id - Payload: $payload")
            val result = roomService.updateRoomFromMap(id, payload, token)
            
            if (result?.containsKey("error") == true) {
                return ResponseEntity.status(400).body(result)
            }
            ResponseEntity.ok(result ?: mapOf("success" to true))
        } catch (e: Exception) {
            ResponseEntity.status(500).body(mapOf("error" to e.message))
        }
    }

    @DeleteMapping("/{id}")
    @ResponseBody
    fun deleteRoom(@PathVariable id: Int, session: HttpSession): ResponseEntity<Any> {
        return try {
            val token = session.getAttribute("token") as String?
            if (token == null) return ResponseEntity.status(401).body(mapOf("error" to "Phiên đăng nhập hết hạn"))
            
            println(">>> ROOM CONTROLLER: [DELETE] /$id")
            val result = roomService.deleteRoom(id, token)
            
            if (result?.containsKey("error") == true) {
                return ResponseEntity.status(400).body(result)
            }
            ResponseEntity.ok(result ?: mapOf("success" to true))
        } catch (e: Exception) {
            ResponseEntity.status(500).body(mapOf("error" to e.message))
        }
    }
}
