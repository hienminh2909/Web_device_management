package datn.web_datn.controller

import datn.web_datn.model.DeviceRegisterRequest
import datn.web_datn.service.DeviceRegisterService
import jakarta.servlet.http.HttpSession
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.multipart.MultipartFile
import org.springframework.util.LinkedMultiValueMap
import org.springframework.util.MultiValueMap
@RestController
@RequestMapping("/api/web/devices")
class DeviceRegisterController(private val registerService: DeviceRegisterService) {

    // API Đăng ký lẻ
    @PostMapping("/register")
    fun register(@RequestBody request: DeviceRegisterRequest, session: HttpSession): ResponseEntity<Any> {
        val token = session.getAttribute("token") as? String
        return try {
            val result = registerService.registerInFastApi(request, token)
            ResponseEntity.ok(result)
        } catch (e: Exception) {
            ResponseEntity.status(400).body(mapOf("error" to e.message))
        }
    }


    // API Nhập Excel (Execute)
    @PostMapping("/import-excel")
    fun importExcel(
        @RequestParam("file") file: MultipartFile,
        session: HttpSession
    ): ResponseEntity<Any> {
        val token = session.getAttribute("token") as? String
        val result = registerService.executeImportExcel(file, token)
        return ResponseEntity.ok(result ?: mapOf("message" to "Nhập kho thành công"))
    }

    // API Kiểm tra Excel (Validate)
    @PostMapping("/import-check")
    fun importCheck(@RequestParam("file") file: MultipartFile, session: HttpSession): ResponseEntity<Any> {
        val token = session.getAttribute("token") as? String
        val result = registerService.validateExcel(file, token)
        return ResponseEntity.ok(result ?: mapOf("message" to "Kiểm tra hoàn tất"))
    }

    // Upload ảnh thiết bị lên Supabase Storage
    @PostMapping("/upload-image")
    fun uploadImage(
        @RequestParam("file") file: MultipartFile,
        @RequestParam(value = "device_ids", required = false) deviceIds: String?,
        @RequestParam(value = "device_name", required = false) deviceName: String?,
        session: HttpSession
    ): ResponseEntity<Any> {
        val token = session.getAttribute("token") as? String
        return try {
            val result = registerService.uploadDeviceImage(file, deviceIds, deviceName, token)
            ResponseEntity.ok(result ?: mapOf("message" to "Upload thành công"))
        } catch (e: Exception) {
            ResponseEntity.status(400).body(mapOf("error" to e.message))
        }
    }
}