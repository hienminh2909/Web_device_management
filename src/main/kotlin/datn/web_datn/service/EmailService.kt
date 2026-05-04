package datn.web_datn.service

import org.springframework.mail.javamail.JavaMailSender
import org.springframework.mail.javamail.MimeMessageHelper
import org.springframework.stereotype.Service
import org.springframework.beans.factory.annotation.Value

@Service
class EmailService(private val mailSender: JavaMailSender) {

    @Value("\${spring.mail.username}")
    private lateinit var fromEmail: String

    fun sendDeviceRegistrationEmail(to: String, deviceName: String, room: String, quantity: Int) {
        val subject = "Thông báo đăng ký thiết bị mới thành công"
        val content = """
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <h2 style="color: #4f46e5;">Đăng ký thiết bị mới thành công</h2>
                <p>Xin chào,</p>
                <p>Hệ thống quản lý thiết bị thông báo rằng bạn đã đăng ký thiết bị mới thành công với các chi tiết sau:</p>
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; background: #f9f9f9;">Tên thiết bị:</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">$deviceName</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; background: #f9f9f9;">Phòng học:</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">$room</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; background: #f9f9f9;">Số lượng:</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">$quantity</td>
                    </tr>
                </table>
                <p>Vui lòng kiểm tra lại thông tin trên hệ thống nếu cần thiết.</p>
                <br>
                <p>Trân trọng,<br>Hệ thống Quản lý Thiết bị VIP Manager</p>
            </div>
        """.trimIndent()

        sendHtmlEmail(to, subject, content)
    }

    private fun sendHtmlEmail(to: String, subject: String, htmlBody: String) {
        try {
            val message = mailSender.createMimeMessage()
            val helper = MimeMessageHelper(message, true, "UTF-8")
            
            helper.setFrom(fromEmail)
            helper.setTo(to)
            helper.setSubject(subject)
            helper.setText(htmlBody, true)
            
            mailSender.send(message)
            println(">>> EMAIL SERVICE: Success - Sent email to $to")
        } catch (e: Exception) {
            println(">>> EMAIL SERVICE: ERROR - Failed to send email to $to: ${e.message}")
        }
    }
}
