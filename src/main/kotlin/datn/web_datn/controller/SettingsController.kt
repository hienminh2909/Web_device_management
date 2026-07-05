package datn.web_datn.controller

import datn.web_datn.service.UserService
import jakarta.servlet.http.HttpSession
import org.springframework.http.ResponseEntity
import org.springframework.stereotype.Controller
import org.springframework.ui.Model
import org.springframework.web.bind.annotation.*

@Controller
@RequestMapping("/settings")
class SettingsController(private val userService: UserService) {

    @GetMapping
    fun settingsPage(model: Model, session: HttpSession): String {
        val token = session.getAttribute("token") as String?
        if (token == null) return "redirect:/login"

        println(">>> DEBUG: Accessing Settings Page")

        val profile = userService.getMyProfile(token) ?: mapOf(
            "full_name" to "N/A",
            "username" to "N/A",
            "email" to "",
            "phone" to ""
        )
        
        println(">>> DEBUG: Profile loaded: $profile")
        model.addAttribute("profile", profile)
        model.addAttribute("view", "settings")
        return "dashboard"
    }

    @PostMapping("/profile")
    @ResponseBody
    fun updateProfile(@RequestBody payload: Map<String, Any>, session: HttpSession): ResponseEntity<Any> {
        val token = session.getAttribute("token") as String?
        if (token == null) return ResponseEntity.status(401).body("Unauthorized")

        val result = userService.updateMyProfile(payload, token)
        return ResponseEntity.ok(result ?: mapOf("success" to true))
    }

    @PostMapping("/change-password")
    @ResponseBody
    fun changePassword(@RequestBody payload: Map<String, String>, session: HttpSession): ResponseEntity<Any> {
        val token = session.getAttribute("token") as String?
        if (token == null) return ResponseEntity.status(401).body("Unauthorized")

        val result = userService.changePassword(
            payload["old_password"] ?: "",
            payload["new_password"] ?: "",
            token
        )
        return if (result?.containsKey("error") == true) {
            ResponseEntity.status(400).body(result)
        } else {
            ResponseEntity.ok(result ?: mapOf("success" to true))
        }
    }
}
