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



    @PostMapping("/import-excel")
    fun importExcel(
        @RequestParam("file") file: MultipartFile,
        session: HttpSession
    ): ResponseEntity<Any> {
        val token = session.getAttribute("token") as? String
        val result = registerService.executeImportExcel(file, token)
        return ResponseEntity.ok(result ?: mapOf("message" to "Nhập kho thành công"))
    }


    @PostMapping("/import-check")
    fun importCheck(@RequestParam("file") file: MultipartFile, session: HttpSession): ResponseEntity<Any> {
        val token = session.getAttribute("token") as? String
        val result = registerService.validateExcel(file, token)
        return ResponseEntity.ok(result ?: mapOf("message" to "Kiểm tra hoàn tất"))
    }

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


    @GetMapping("/qr/{code}")
    fun getQrCode(@PathVariable code: String): ResponseEntity<ByteArray> {
        return try {
            val imageBytes = registerService.getDynamicImage("qr", code)
            ResponseEntity.ok().header("Content-Type", "image/png").body(imageBytes)
        } catch (e: Exception) {
            ResponseEntity.status(404).build()
        }
    }


    @GetMapping("/barcode/{code}")
    fun getBarcode(@PathVariable code: String): ResponseEntity<ByteArray> {
        return try {
            val imageBytes = registerService.getDynamicImage("barcode", code)
            ResponseEntity.ok().header("Content-Type", "image/png").body(imageBytes)
        } catch (e: Exception) {
            ResponseEntity.status(404).build()
        }
    }
}
