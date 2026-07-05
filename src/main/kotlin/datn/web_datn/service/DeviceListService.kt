package datn.web_datn.service

import datn.web_datn.model.DeviceResponse
import datn.web_datn.model.DeviceUpdateRequest
import org.springframework.http.*
import org.springframework.stereotype.Service
import org.springframework.web.client.RestTemplate
import org.springframework.core.ParameterizedTypeReference

import org.apache.poi.ss.usermodel.*
import org.apache.poi.xssf.usermodel.XSSFWorkbook
import org.apache.poi.util.IOUtils

import jakarta.servlet.http.HttpServletResponse
import jakarta.servlet.http.HttpSession
@Service
class DeviceService(private val restTemplate: RestTemplate) {
    private val apiUrl = (System.getenv("API_BASE_URL") ?: "http://127.0.0.1:8000") + "/api/devices/summary"
    private val fastApiUpdateUrl = (System.getenv("API_BASE_URL") ?: "http://127.0.0.1:8000") + "/api/devices/"
    
    private fun normalizeName(name: String?): String {
        if (name.isNullOrBlank()) return ""
        return name.trim().split(" ")
            .filter { it.isNotBlank() }
            .joinToString(" ") { it.lowercase().replaceFirstChar { char -> char.uppercase() } }
    }


    fun getAllDevices(token: String): List<DeviceResponse> {
        val headers = HttpHeaders()
        headers.setBearerAuth(token)
        val entity = HttpEntity<Unit>(headers)

        val mapper = com.fasterxml.jackson.module.kotlin.jacksonObjectMapper()

        return try {
            val response = restTemplate.exchange(apiUrl, HttpMethod.GET, entity, Array<DeviceResponse>::class.java)
            val devices = response.body?.toList() ?: emptyList()

            // TỰ ĐỘNG XỬ LÝ JSON TẠI ĐÂY
            devices.forEach { device ->
                device.detailsJson = mapper.writeValueAsString(device.all_devices_detail ?: emptyList<Any>())
            }
            devices
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun updateDevice(deviceId: Int, request: DeviceUpdateRequest, token: String?): Map<*, *>? {
        val headers = HttpHeaders()
        // Import MediaType.APPLICATION_JSON để hết lỗi đỏ
        headers.contentType = MediaType.APPLICATION_JSON
        if (token != null) {
            headers.setBearerAuth(token)
        }

        val normalizedRequest = request.copy(
            device_name = request.device_name?.let { normalizeName(it) }
        )
        val entity = HttpEntity(normalizedRequest, headers)

        return try {
            val response = restTemplate.exchange(
                "$fastApiUpdateUrl$deviceId",
                HttpMethod.PUT,
                entity,
                Map::class.java
            )
            response.body
        } catch (e: Exception) {
            // Ném lỗi ra để Controller xử lý và hiển thị cho người dùng
            throw Exception("Lỗi cập nhật thiết bị: ${e.message}")
        }
    }


    fun deleteDevice(deviceId: Int, token: String?): Map<*, *>? {
        val headers = HttpHeaders()
        headers.setBearerAuth(token ?: "")
        val entity = HttpEntity<Unit>(headers)

        return try {
            // Sử dụng HttpMethod.DELETE
            val response = restTemplate.exchange(
                (System.getenv("API_BASE_URL") ?: "http://127.0.0.1:8000") + "/api/devices/$deviceId",
                HttpMethod.DELETE,
                entity,
                Map::class.java
            )
            response.body
        } catch (e: Exception) {
            throw Exception("Lỗi khi xóa: ${e.message}")
        }
    }

    fun deleteMultipleDevices(ids: List<Int>, token: String?): Map<String, Any> {
        val headers = HttpHeaders()
        headers.setBearerAuth(token ?: "")
        val entity = HttpEntity<Unit>(headers)
        var successCount = 0

        ids.forEach { id ->
            try {
                restTemplate.exchange(
                    (System.getenv("API_BASE_URL") ?: "http://127.0.0.1:8000") + "/api/devices/$id",
                    HttpMethod.DELETE,
                    entity,
                    Map::class.java
                )
                successCount++
            } catch (e: Exception) {
                // Có thể log lỗi ở đây nếu một ID nào đó xóa thất bại
            }
        }

        return mapOf(
            "message" to "Đã xóa thành công $successCount/${ids.size} thiết bị",
            "count" to successCount
        )
    }

    fun updateMultipleDevices(ids: List<Int>, request: DeviceUpdateRequest, token: String?): Map<String, Any> {
        var successCount = 0
        ids.forEach { id ->
            try {
                updateDevice(id, request, token)
                successCount++
            } catch (e: Exception) {
                println("ERROR: updateMultipleDevices failed for ID $id: ${e.message}")
            }
        }
        return mapOf(
            "message" to "Đã cập nhật thành công $successCount/${ids.size} thiết bị",
            "count" to successCount
        )
    }

    // Trong DeviceService.kt
    fun exportToExcel(devices: List<DeviceResponse>, response: HttpServletResponse) {
        val workbook = XSSFWorkbook()
        val sheet = workbook.createSheet("Danh sách thực tế")
        val drawing = sheet.createDrawingPatriarch()

// --- BẮT ĐẦU ĐOẠN SỬA TIÊU ĐỀ ---
        val headerRow = sheet.createRow(0)
        val cols = arrayOf("STT", "Mã QR", "Mã máy lẻ", "Tên thiết bị", "Loại thiết bị", "Mô tả", "Phòng", "Trạng thái", "Giá tiền", "Ngày mua", "Ngày kiểm kê", "Người tạo", "Ngày tạo", "Ngày cập nhật")

        // Tạo Style cho Header (Chữ đậm, nền xám nhẹ)
        val headerStyle = workbook.createCellStyle()
        val font = workbook.createFont()
        font.bold = true
        headerStyle.setFont(font)
        headerStyle.alignment = HorizontalAlignment.CENTER
        headerStyle.verticalAlignment = VerticalAlignment.CENTER
        headerStyle.fillForegroundColor = IndexedColors.GREY_25_PERCENT.index
        headerStyle.fillPattern = FillPatternType.SOLID_FOREGROUND

        // Lặp qua mảng cols để tạo từng ô tiêu đề
        for (i in cols.indices) {
            val cell = headerRow.createCell(i)
            cell.setCellValue(cols[i])
            cell.cellStyle = headerStyle
        }
        // Cố định dòng tiêu đề để khi cuộn xuống không bị mất
        sheet.createFreezePane(0, 1)
        // --- KẾT THÚC ĐOẠN SỬA TIÊU ĐỀ ---
        
        val wrapStyle = workbook.createCellStyle()
        wrapStyle.wrapText = true
        wrapStyle.verticalAlignment = VerticalAlignment.CENTER

        var rowIdx = 1

        // DUYỆT TỪNG NHÓM (CARD)
        for (group in devices) {
            // Lấy danh sách máy lẻ thực tế
            val details = group.all_devices_detail ?: emptyList()

            // DUYỆT TỪNG MÁY LẺ TRONG NHÓM ĐỂ BUNG RA DÒNG RIÊNG
            for (item in details) {
                val row = sheet.createRow(rowIdx)
                row.heightInPoints = 90f // Cao để vừa mã QR

                // Điền thông tin
                row.createCell(0).setCellValue(rowIdx.toDouble()) // STT chạy liên tục
                row.createCell(2).setCellValue(item["device_code"]?.toString() ?: "N/A")
                row.createCell(3).setCellValue(group.device_name)
                row.createCell(4).setCellValue(group.categories.category_name)
                
                val descCell = row.createCell(5)
                descCell.setCellValue(group.description)
                descCell.cellStyle = wrapStyle
                
                row.createCell(6).setCellValue(group.rooms.room_name)
                row.createCell(7).setCellValue(group.status)
                row.createCell(8).setCellValue(group.device_price ?: "N/A")
                row.createCell(9).setCellValue(group.purchase_date)
                row.createCell(10).setCellValue(group.last_inventory_at ?: "N/A")
                row.createCell(11).setCellValue(group.users?.full_name ?: "N/A")
                row.createCell(12).setCellValue(item["created_at"]?.toString() ?: "N/A")
                row.createCell(13).setCellValue(item["updated_at"]?.toString() ?: "N/A")                // Xử lý chèn ảnh QR cho máy lẻ
                val qrUrl = item["qr_url"]?.toString()
                if (!qrUrl.isNullOrBlank()) {
                    try {
                        val baseUrl = System.getenv("API_BASE_URL") ?: "http://127.0.0.1:8000"
                        // Cần đổi "/api/web/devices" thành "/api/devices" vì Spring Boot gọi trực tiếp sang FastAPI
                        val adjustedQrUrl = qrUrl.replace("/api/web/devices/", "/api/devices/")
                        val fullUrl = if (adjustedQrUrl.startsWith("http")) adjustedQrUrl else baseUrl + adjustedQrUrl
                        val encodedUrl = fullUrl.replace(" ", "%20")
                        val url = java.net.URI(encodedUrl).toURL()
                        val connection = url.openConnection() as java.net.HttpURLConnection
                        connection.setRequestProperty("User-Agent", "Mozilla/5.0")
                        connection.connectTimeout = 5000
                        connection.readTimeout = 5000
                        
                        if (connection.responseCode == 200) {
                            connection.inputStream.use { stream ->
                                val bytes = IOUtils.toByteArray(stream)
                                val pictureIdx = workbook.addPicture(bytes, Workbook.PICTURE_TYPE_PNG)
                                val helper = workbook.creationHelper
                                val anchor = helper.createClientAnchor().apply {
                                    setCol1(1)
                                    row1 = rowIdx
                                    setCol2(2)
                                    row2 = rowIdx + 1
                                    
                                    // Thêm padding khoảng 5 pixels (1 pixel = 9525 EMUs)
                                    dx1 = 5 * 9525
                                    dy1 = 5 * 9525
                                    dx2 = -5 * 9525
                                    dy2 = -5 * 9525
                                }
                                drawing.createPicture(anchor, pictureIdx)
                                // Không dùng resize() để hình ảnh vừa khít với ô lưới
                            }
                        } else {
                            row.createCell(1).setCellValue("Lỗi HTTP ${connection.responseCode}")
                        }
                    } catch (e: Exception) {
                        row.createCell(1).setCellValue("Lỗi tải ảnh: ${e.message}")
                    }
                }
                rowIdx++ // Tăng STT cho máy lẻ tiếp theo
            }
        }
        // Tự động giãn cột cho đẹp
        for (i in 0..13) {
            if (i != 1 && i != 5) sheet.autoSizeColumn(i)
        }
        sheet.setColumnWidth(1, 4400) // Đặt kích thước cột 1 vuông vức với chiều cao dòng (90f)
        sheet.setColumnWidth(5, 12000) // Cố định chiều rộng cột Mô tả để tự xuống dòng

        // 1. Ghi workbook ra một mảng Byte trước để tính kích thước
        val bos = java.io.ByteArrayOutputStream()
        workbook.write(bos)
        val bytes = bos.toByteArray()

        // 2. Thiết lập Header
        response.contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        response.setHeader("Content-Disposition", "attachment; filename=Report.xlsx")
        // QUAN TRỌNG: Gửi độ dài file để phía Frontend tính % tiến độ
        response.setContentLength(bytes.size)

        // 3. Đẩy dữ liệu ra luồng response
        val out = response.outputStream
        out.write(bytes)
        out.flush()
        workbook.close()
    }

    fun getRawDevices(token: String, roomId: Int? = null, ids: String? = null): List<Map<String, Any>> {
        val headers = HttpHeaders()
        headers.setBearerAuth(token)
        val entity = HttpEntity<Unit>(headers)
        
        var url = (System.getenv("API_BASE_URL") ?: "http://127.0.0.1:8000") + "/api/devices"
        val params = mutableListOf<String>()
        if (roomId != null) {
            params.add("room_id=$roomId")
        }
        if (!ids.isNullOrBlank()) {
            params.add("ids=$ids")
        }
        if (params.isNotEmpty()) {
            url += "?" + params.joinToString("&")
        }
        
        return try {
            val responseType = object : ParameterizedTypeReference<List<Map<String, Any>>>() {}
            val response = restTemplate.exchange(url, HttpMethod.GET, entity, responseType)
            response.body ?: emptyList()
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun downloadTemplate(response: HttpServletResponse) {
        val url = (System.getenv("API_BASE_URL") ?: "http://127.0.0.1:8000") + "/api/devices/template"
        try {
            // Goi FastAPI lay bytes file
            val bytes = restTemplate.getForObject(url, ByteArray::class.java)
                ?: throw Exception("Không nhận được dữ liệu từ máy chủ")

            response.contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            response.setHeader("Content-Disposition", "attachment; filename=Mau_Nhap_Thiet_Bi_Moi.xlsx")
            response.setContentLength(bytes.size)
            
            response.outputStream.use { out ->
                out.write(bytes)
                out.flush()
            }
        } catch (e: Exception) {
            println("DEBUG: Loi download template: ${e.message}")
            // Neu loi, tra ve status 500
            response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Lỗi tải file mẫu: ${e.message}")
        }
    }

    fun exportSelectedDevices(ids: List<Int>, token: String, response: HttpServletResponse) {
        val headers = HttpHeaders()
        headers.setBearerAuth(token)
        val entity = HttpEntity<Unit>(headers)
        
        val idString = ids.joinToString(",")
        val url = "$apiUrl?ids=$idString"
        
        try {
            val res = restTemplate.exchange(url, HttpMethod.GET, entity, Array<DeviceResponse>::class.java)
            val devices = res.body?.toList() ?: emptyList()
            
            // Xử lý JSON detail
            val mapper = com.fasterxml.jackson.module.kotlin.jacksonObjectMapper()
            devices.forEach { device ->
                device.detailsJson = mapper.writeValueAsString(device.all_devices_detail ?: emptyList<Any>())
            }
            
            this.exportToExcel(devices, response)
        } catch (e: Exception) {
            println("ERROR: exportSelectedDevices - ${e.message}")
            response.sendError(500, "Lỗi khi trích xuất dữ liệu thiết bị: ${e.message}")
        }
    }
}



