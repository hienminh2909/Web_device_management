package datn.web_datn.controller

import org.springframework.ui.Model
import org.springframework.web.bind.annotation.ControllerAdvice
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.client.ResourceAccessException
import org.springframework.web.client.RestClientException

@ControllerAdvice
class GlobalExceptionHandler {

    @ExceptionHandler(ResourceAccessException::class, RestClientException::class)
    fun handleConnectionError(e: Exception, model: Model): String {
        println(">>> GLOBAL ERROR HANDLER: Connection to backend failed: ${e.message}")
        model.addAttribute("errorMessage", "Không thể kết nối đến máy chủ dữ liệu. Hệ thống có thể đang bảo trì hoặc mất kết nối mạng.")
        return "error"
    }

    @ExceptionHandler(Exception::class)
    fun handleGenericError(e: Exception, model: Model): String {
        println(">>> GLOBAL ERROR HANDLER: Unexpected error: ${e.message}")
        model.addAttribute("errorMessage", "Đã xảy ra lỗi không mong muốn. Vui lòng thử lại sau.")
        return "error"
    }
}
