package datn.web_datn.service

import datn.web_datn.model.DeviceRegisterRequest
import org.apache.poi.xssf.usermodel.XSSFWorkbook
import org.springframework.http.HttpEntity
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.stereotype.Service
import org.springframework.web.client.RestTemplate
import org.springframework.web.multipart.MultipartFile
import org.springframework.util.LinkedMultiValueMap
import org.springframework.util.MultiValueMap
@Service
class DeviceRegisterService(
    private val restTemplate: RestTemplate,
    private val userService: UserService,
    private val emailService: EmailService
) {
    private fun normalizeName(name: String?): String {
        if (name.isNullOrBlank()) return ""
        return name.trim().split(" ")
            .filter { it.isNotBlank() }
            .joinToString(" ") { it.lowercase().replaceFirstChar { char -> char.uppercase() } }
    }

    private val fastApiUrl = (System.getenv("API_BASE_URL") ?: "http://127.0.0.1:8000") + "/api/devices"

    // --- CHỨC NĂNG 1: ĐĂNG KÝ LẺ ---
    fun registerInFastApi(request: DeviceRegisterRequest, token: String?): Map<*, *>? {
        println(">>> DEVICE REGISTER SERVICE: Registering device: ${request.device_name} (Qty: ${request.quantity})")
        
        val headers = HttpHeaders()
        headers.contentType = MediaType.APPLICATION_JSON

        if (token != null) {
            val formattedToken = if (token.startsWith("Bearer ", ignoreCase = true)) token else "Bearer $token"
            headers.set("Authorization", formattedToken)
        }

        val normalizedRequest = request.copy(
            device_name = normalizeName(request.device_name)
        )
        val entity = HttpEntity(normalizedRequest, headers)
        return try {
            val response = restTemplate.postForEntity(fastApiUrl, entity, Map::class.java)
            println(">>> DEVICE REGISTER SERVICE: Success - HTTP ${response.statusCode}")
            val body = response.body
            
            // --- GỬI EMAIL THÔNG BÁO ---
            if (response.statusCode.is2xxSuccessful) {
                try {
                    // 1. Lấy thông tin người đăng ký
                    val myProfile = userService.getMyProfile(token)
                    val registrantEmail = myProfile?.get("email") as? String
                    
                    // 2. Lấy thông tin Admin
                    val allUsers = userService.getAllUsers(token)
                    val adminEmails = allUsers.filter { it.role?.lowercase() == "admin" }.mapNotNull { it.email }

                    // 3. Gửi cho người đăng ký
                    if (!registrantEmail.isNullOrBlank()) {
                        emailService.sendDeviceRegistrationEmail(registrantEmail, request.device_name, request.room_name, request.quantity)
                    }

                    // 4. Gửi cho các Admin
                    adminEmails.forEach { adminEmail ->
                        if (adminEmail != registrantEmail) { // Tránh gửi trùng nếu registrant là admin
                            emailService.sendDeviceRegistrationEmail(adminEmail, request.device_name, request.room_name, request.quantity)
                        }
                    }
                } catch (e: Exception) {
                    println(">>> DEVICE REGISTER SERVICE: Warning - Could not send notification emails: ${e.message}")
                }
            }
            
            body
        } catch (e: org.springframework.web.client.HttpStatusCodeException) {
            val body = e.responseBodyAsString
            println(">>> DEVICE REGISTER SERVICE: HTTP Error ${e.statusCode} - $body")
            mapOf("status" to "error", "message" to (if (body.isNullOrBlank()) "Lỗi API (${e.statusCode})" else body))
        } catch (e: Exception) {
            println(">>> DEVICE REGISTER SERVICE: Exception - ${e.message}")
            throw Exception("Lỗi hệ thống khi đăng ký thiết bị: ${e.message}")
        }
    }

    // --- CHỨC NĂNG 2: NHẬP EXCEL (Gộp chung) ---
    // Hàm phụ trợ để đọc dữ liệu an toàn (Cho vào trong Class Service)
    private fun getCellValueAsString(cell: org.apache.poi.ss.usermodel.Cell?): String {
        if (cell == null) return ""
        return when (cell.cellType) {
            org.apache.poi.ss.usermodel.CellType.STRING -> cell.stringCellValue
            org.apache.poi.ss.usermodel.CellType.NUMERIC -> {
                // Nếu là số, chuyển về String (xử lý cả trường hợp số nguyên)
                val value = cell.numericCellValue
                if (value == value.toLong().toDouble()) value.toLong().toString() else value.toString()
            }

            org.apache.poi.ss.usermodel.CellType.BOOLEAN -> cell.booleanCellValue.toString()
            else -> ""
        }
    }

    // Sửa lại đoạn đọc hàng trong hàm importFromExcel
    fun importFromExcel(file: MultipartFile, token: String?): Map<String, Any> {
        val workbook = XSSFWorkbook(file.inputStream)
        val sheet = workbook.getSheetAt(0)
        var successCount = 0

        try {
            for (i in 1..sheet.lastRowNum) {
                val row = sheet.getRow(i) ?: continue

                // SỬ DỤNG HÀM getCellValueAsString Ở ĐÂY
                val deviceRequest = DeviceRegisterRequest(
                    device_name = normalizeName(getCellValueAsString(row.getCell(0))),
                    room_name = getCellValueAsString(row.getCell(1)),
                    category_name = getCellValueAsString(row.getCell(2)),
                    status = getCellValueAsString(row.getCell(3)),
                    quantity = try {
                        row.getCell(4).numericCellValue.toInt()
                    } catch (e: Exception) {
                        getCellValueAsString(row.getCell(4)).toIntOrNull() ?: 1
                    }
                )

                this.registerInFastApi(deviceRequest, token)
                successCount++
            }
        } finally {
            workbook.close()
        }
        return mapOf("message" to "Đã nhập thành công $successCount thiết bị")
    }

    // Giai đoạn 1: Kiểm tra dữ liệu (Validate)
    fun validateExcel(file: MultipartFile, token: String?): Any? {
        val url = (System.getenv("API_BASE_URL") ?: "http://127.0.0.1:8000") + "/api/devices/validate"
        val normalizedFile = normalizeExcelFile(file)
        return forwardMultipartRequest(url, normalizedFile, token, null)
    }

    // Giai đoạn 2: Thực thi nhập kho (Execute)
    fun executeImportExcel(file: MultipartFile, token: String?): Any? {
        val url = (System.getenv("API_BASE_URL") ?: "http://127.0.0.1:8000") + "/api/devices/import"
        val normalizedFile = normalizeExcelFile(file)
        return forwardMultipartRequest(url, normalizedFile, token, null)
    }

    private fun normalizeExcelFile(file: MultipartFile): MultipartFile {
        return try {
            val workbook = XSSFWorkbook(file.inputStream)
            val sheet = workbook.getSheetAt(0)
            
            // Normalize column 0 (Device Name) for all data rows
            for (i in 1..sheet.lastRowNum) {
                val row = sheet.getRow(i) ?: continue
                val cell = row.getCell(0) ?: continue
                val originalName = getCellValueAsString(cell)
                if (originalName.isNotBlank()) {
                    cell.setCellValue(normalizeName(originalName))
                }
            }
            
            val bos = java.io.ByteArrayOutputStream()
            workbook.write(bos)
            val bytes = bos.toByteArray()
            workbook.close()
            
            // Return a wrapper that acts like a MultipartFile
            object : MultipartFile {
                override fun getName(): String = file.name
                override fun getOriginalFilename(): String? = file.originalFilename
                override fun getContentType(): String? = file.contentType
                override fun isEmpty(): Boolean = bytes.isEmpty()
                override fun getSize(): Long = bytes.size.toLong()
                override fun getBytes(): ByteArray = bytes
                override fun getInputStream(): java.io.InputStream = java.io.ByteArrayInputStream(bytes)
                override fun transferTo(dest: java.io.File) = java.nio.file.Files.write(dest.toPath(), bytes).let { }
            }
        } catch (e: Exception) {
            println(">>> ERROR normalizing Excel: ${e.message}")
            file // Fallback to original if error
        }
    }

    // Hàm dùng chung để forward file tới FastAPI
    private fun forwardMultipartRequest(url: String, file: MultipartFile, token: String?, additionalParams: Map<String, String>?): Any? {
        val headers = HttpHeaders()
        token?.let {
            val formattedToken = if (it.startsWith("Bearer ")) it else "Bearer $it"
            headers.set("Authorization", formattedToken)
        }

        val body: MultiValueMap<String, Any> = LinkedMultiValueMap()
        
        // Gửi file dưới dạng Resource để RestTemplate xử lý Stream/Multipart đúng chuẩn
        val fileHeaders = HttpHeaders()
        fileHeaders.setContentDispositionFormData("file", file.originalFilename)
        val fileEntity = HttpEntity(file.bytes, fileHeaders)
        body.add("file", fileEntity)

        additionalParams?.forEach { (key, value) -> body.add(key, value) }

        val requestEntity = HttpEntity(body, headers)

        return try {
            val response = restTemplate.postForEntity(url, requestEntity, Map::class.java)
            response.body
        } catch (e: Exception) {
            println("Lỗi gọi FastAPI ($url): ${e.message}")
            mapOf("status" to "error", "message" to e.message)
        }
    }

    // --- CHỨC NĂNG 4: UPLOAD ẢNH THIẾT BỊ ---
    fun uploadDeviceImage(file: MultipartFile, deviceIds: String?, deviceName: String?, token: String?): Any? {
        val url = (System.getenv("API_BASE_URL") ?: "http://127.0.0.1:8000") + "/api/devices/upload-image"

        val headers = HttpHeaders()
        // Để RestTemplate tự động thiết lập Content-Type với Boundary
        token?.let {
            val formattedToken = if (it.startsWith("Bearer ")) it else "Bearer $it"
            headers.set("Authorization", formattedToken)
        }

        val body: MultiValueMap<String, Any> = LinkedMultiValueMap()
        
        // Tạo HttpHeaders cho file part
        val fileHeaders = HttpHeaders()
        fileHeaders.contentType = MediaType.parseMediaType(file.contentType ?: "image/png")
        fileHeaders.setContentDispositionFormData("file", file.originalFilename)
        
        val fileEntity = HttpEntity(file.bytes, fileHeaders)
        
        body.add("file", fileEntity)
        if (!deviceIds.isNullOrBlank()) body.add("device_ids", deviceIds)
        if (!deviceName.isNullOrBlank()) body.add("device_name", deviceName)

        val requestEntity = HttpEntity(body, headers)

        return try {
            val response = restTemplate.postForEntity(url, requestEntity, Map::class.java)
            response.body
        } catch (e: Exception) {
            throw Exception("Lỗi upload ảnh: ${e.message}")
        }
    }

    fun downloadTemplate(): ByteArray? {
        val url = (System.getenv("API_BASE_URL") ?: "http://127.0.0.1:8000") + "/api/devices/template"
        val headers = HttpHeaders()
        headers.setAccept(listOf(MediaType.APPLICATION_OCTET_STREAM, MediaType.ALL))
        
        val entity = HttpEntity<Unit>(headers)
        println("DEBUG: Dang goi FastAPI de tai file mau tai URL: $url")
        return try {
            val response = restTemplate.exchange(url, org.springframework.http.HttpMethod.GET, entity, ByteArray::class.java)
            println("DEBUG: Ket qua tai file mau: ${response.statusCode}")
            response.body
        } catch (e: Exception) {
            println("DEBUG: LOI tai file mau: ${e.message}")
            throw Exception("Lỗi khi tải file mẫu từ FastAPI: ${e.message}")
        }
    }
}
