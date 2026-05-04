package datn.web_datn.controller

import datn.web_datn.service.ReportService
import jakarta.servlet.http.HttpSession
import org.springframework.stereotype.Controller
import org.springframework.ui.Model
import org.springframework.web.bind.annotation.*

@Controller
@RequestMapping("/reports")
class ReportController(private val reportService: ReportService) {

    @GetMapping
    fun listReports(model: Model, session: HttpSession): String {
        val token = session.getAttribute("token") as String?
        if (token == null) return "redirect:/login"

        val reports = reportService.getAllReports(token)
        model.addAttribute("history", reports)
        model.addAttribute("view", "report_history")
        return "dashboard"
    }
}
