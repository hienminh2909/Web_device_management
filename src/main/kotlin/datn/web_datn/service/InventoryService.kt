package datn.web_datn.service

import datn.web_datn.model.InventoryLogModel
import datn.web_datn.model.InventoryProgressModel
import datn.web_datn.model.InventoryDetailModel
import org.springframework.http.*
import org.springframework.stereotype.Service
import org.springframework.web.client.RestTemplate

@Service
class InventoryService(private val restTemplate: RestTemplate) {
    private val apiUrl = "http://127.0.0.1:8000/api/inventory"

    fun getInventoryLogs(token: String?): List<InventoryLogModel> {
        val headers = HttpHeaders()
        headers.setBearerAuth(token ?: "")
        val entity = HttpEntity<Unit>(headers)
        return try {
            val response = restTemplate.exchange("$apiUrl/logs", HttpMethod.GET, entity, Array<InventoryLogModel>::class.java)
            response.body?.toList() ?: emptyList()
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun getRoomsProgress(month: Int?, year: Int?, token: String?): List<InventoryProgressModel> {
        val headers = HttpHeaders()
        headers.setBearerAuth(token ?: "")
        val entity = HttpEntity<Unit>(headers)
        
        var url = "$apiUrl/rooms-progress"
        val params = mutableListOf<String>()
        if (month != null) params.add("month=$month")
        if (year != null) params.add("year=$year")
        if (params.isNotEmpty()) url += "?" + params.joinToString("&")
        
        return try {
            val response = restTemplate.exchange(url, HttpMethod.GET, entity, Array<InventoryProgressModel>::class.java)
            response.body?.toList() ?: emptyList()
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun getRoomDetails(roomId: Int, month: Int, year: Int, token: String?): List<InventoryDetailModel> {
        val headers = HttpHeaders()
        headers.setBearerAuth(token ?: "")
        val entity = HttpEntity<Unit>(headers)
        return try {
            val response = restTemplate.exchange("$apiUrl/rooms/$roomId/details?month=$month&year=$year", HttpMethod.GET, entity, Array<InventoryDetailModel>::class.java)
            response.body?.toList() ?: emptyList()
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun exportRoomInventory(roomId: Int, roomName: String, month: Int, year: Int, token: String?, response: jakarta.servlet.http.HttpServletResponse) {
        val details = getRoomDetails(roomId, month, year, token)
        
        try {
            val workbook = org.apache.poi.xssf.usermodel.XSSFWorkbook()
            val sheet = workbook.createSheet("Kiem_Ke_$roomName")
            
            // Header
            val headerRow = sheet.createRow(0)
            val columns = arrayOf("ID", "Tên thiết bị", "Mã QR", "Trạng thái", "Kết quả kiểm kê", "Lần quét cuối")
            for (i in columns.indices) {
                val cell = headerRow.createCell(i)
                cell.setCellValue(columns[i])
                val style = workbook.createCellStyle()
                val font = workbook.createFont()
                font.setBold(true)
                style.setFont(font)
                cell.setCellStyle(style)
            }
            
            // Data
            var rowIdx = 1
            for (d in details) {
                val row = sheet.createRow(rowIdx++)
                row.createCell(0).setCellValue(d.id.toDouble())
                row.createCell(1).setCellValue(d.device_name)
                row.createCell(2).setCellValue(d.device_code ?: "N/A")
                row.createCell(3).setCellValue(d.status)
                row.createCell(4).setCellValue(if (d.is_checked) "Đã kiểm kê" else "Chưa kiểm kê")
                row.createCell(5).setCellValue(d.last_check?.replace("T", " ") ?: "Chưa từng quét")
            }
            
            for (i in columns.indices) {
                sheet.autoSizeColumn(i)
            }
            
            response.contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            response.setHeader("Content-Disposition", "attachment; filename=Kiem_Ke_${roomName}_T${month}_${year}.xlsx")
            
            workbook.write(response.outputStream)
            workbook.close()
        } catch (e: Exception) {
            response.sendError(500, "Lỗi xuất file: ${e.message}")
        }
    }
}
