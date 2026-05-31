package datn.web_datn.controller

import datn.web_datn.model.UserCreateRequest
import datn.web_datn.model.UserUpdateRequest
import datn.web_datn.service.UserService
import datn.web_datn.service.RoomService
import jakarta.servlet.http.HttpSession
import org.springframework.stereotype.Controller
import org.springframework.ui.Model
import org.springframework.web.bind.annotation.*
import org.springframework.http.ResponseEntity

@Controller
@RequestMapping("/users")
class UserController(
    private val userService: UserService,
    private val roomService: RoomService
) {

    @GetMapping
    fun listUsers(model: Model, session: HttpSession): String {
        val token = session.getAttribute("token") as String?
        val role = session.getAttribute("role") as String?
        if (token == null) return "redirect:/login"
        if (role != "admin") return "redirect:/dashboard"

        val users = userService.getAllUsers(token)
        val rooms = roomService.getAllRooms(token)
        
        model.addAttribute("users", users)
        model.addAttribute("rooms", rooms)
        model.addAttribute("view", "user_list")
        return "dashboard"
    }

    @GetMapping("/api-list")
    @ResponseBody
    fun getApiUsers(session: HttpSession): ResponseEntity<Any> {
        val token = session.getAttribute("token") as String?
        if (token == null) return ResponseEntity.status(401).body("Unauthorized")
        return ResponseEntity.ok(userService.getAllUsers(token))
    }

    @PostMapping("/add")
    @ResponseBody
    fun addUser(@RequestBody user: UserCreateRequest, session: HttpSession): ResponseEntity<Any> {
        println("DEBUG: Nhận yêu cầu thêm mới user: $user")
        val token = session.getAttribute("token") as String?
        if (token == null) {
            println("DEBUG: Lỗi - Token null")
            return ResponseEntity.status(401).body("Unauthorized")
        }

        val result = userService.createUser(user, token)
        println("DEBUG: Kết quả từ UserService: $result")
        
        if (result?.containsKey("error") == true) {
            return ResponseEntity.status(400).body(result["error"])
        }
        return ResponseEntity.ok(result ?: mapOf("success" to true))
    }

    @PutMapping("/{id}")
    @ResponseBody
    fun updateUser(@PathVariable id: Int, @RequestBody user: UserUpdateRequest, session: HttpSession): ResponseEntity<Any> {
        println("DEBUG: Nhận yêu cầu cập nhật user ID $id: $user")
        val token = session.getAttribute("token") as String?
        if (token == null) {
            println("DEBUG: Lỗi - Token null")
            return ResponseEntity.status(401).body("Unauthorized")
        }

        val result = userService.updateUser(id, user, token)
        println("DEBUG: Kết quả từ UserService: $result")

        if (result?.containsKey("error") == true) {
            return ResponseEntity.status(400).body(result["error"])
        }
        return ResponseEntity.ok(result ?: mapOf("success" to true))
    }

    @DeleteMapping("/{id}")
    @ResponseBody
    fun deleteUser(@PathVariable id: Int, session: HttpSession): ResponseEntity<Any> {
        val token = session.getAttribute("token") as String?
        if (token == null) return ResponseEntity.status(401).body("Unauthorized")

        val result = userService.deleteUser(id, token)
        if (result?.containsKey("error") == true) {
            return ResponseEntity.status(400).body(result["error"])
        }
        return ResponseEntity.ok(result ?: mapOf("success" to true))
    }

    @PostMapping("/{id}/reset-password")
    @ResponseBody
    fun resetPassword(@PathVariable id: String, session: HttpSession): ResponseEntity<Any> {
        val token = session.getAttribute("token") as String?
        if (token == null) return ResponseEntity.status(401).body("Unauthorized")

        val result = userService.resetPassword(id, token)
        return if (result?.containsKey("error") == true) {
            ResponseEntity.status(400).body(result["error"])
        } else {
            ResponseEntity.ok(result ?: mapOf("message" to "Success"))
        }
    }

    @GetMapping("/export")
    fun exportUsers(session: HttpSession, response: jakarta.servlet.http.HttpServletResponse) {
        val token = session.getAttribute("token") as String?
        if (token != null) {
            userService.exportUsersToExcel(token, response)
        }
    }
}
