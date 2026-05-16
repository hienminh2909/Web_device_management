package datn.web_datn.controller

import datn.web_datn.service.AuthService
import jakarta.servlet.http.HttpSession
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.stereotype.Controller
import org.springframework.ui.Model
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.servlet.mvc.support.RedirectAttributes

@Controller
class LoginController {

    @Autowired
    lateinit var authService: AuthService

    @GetMapping("/login")
    fun loginPage(): String = "login"

    @PostMapping("/do-login")
    fun doLogin(
        @RequestParam user: String,
        @RequestParam pass: String,
        session: HttpSession,
        redirectAttributes: RedirectAttributes
    ): String {
        val response = authService.authenticate(user, pass)

        return if (response != null) {
            session.setAttribute("token", response.access_token)
            session.setAttribute("role", response.role)
            session.setAttribute("name", response.full_name)

            "redirect:/dashboard"
        } else {
            redirectAttributes.addFlashAttribute("error", "Tài khoản hoặc mật khẩu không đúng!")
            "redirect:/login"
        }
    }

    @GetMapping("/forgot-password")
    fun forgotPasswordPage(): String = "forgot-password"

    @PostMapping("/api/auth/forgot-password")
    @org.springframework.web.bind.annotation.ResponseBody
    fun handleForgotPassword(@org.springframework.web.bind.annotation.RequestBody body: Map<String, String>): org.springframework.http.ResponseEntity<Any> {
        val username = body["username"] ?: return org.springframework.http.ResponseEntity.badRequest().body(mapOf("detail" to "Thiếu tên đăng nhập"))
        
        val res = authService.forgotPassword(username)
        return if (res != null) {
            org.springframework.http.ResponseEntity.ok(res)
        } else {
            org.springframework.http.ResponseEntity.status(404).body(mapOf("detail" to "Không tìm thấy người dùng hoặc lỗi hệ thống"))
        }
    }

    @GetMapping("/reset-password")
    fun resetPasswordPage(@RequestParam token: String, model: Model): String {
        model.addAttribute("token", token)
        return "reset-password"
    }
}
