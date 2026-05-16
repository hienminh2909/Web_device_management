package datn.web_datn.service

import datn.web_datn.model.RequestModel
import jakarta.servlet.http.HttpServletResponse
import org.apache.poi.ss.usermodel.*
import org.apache.poi.xssf.usermodel.XSSFWorkbook
import org.springframework.stereotype.Service
import java.io.ByteArrayOutputStream

@Service
class RequestExportService {

    fun exportToExcel(requests: List<RequestModel>, response: HttpServletResponse) {
        val workbook = XSSFWorkbook()
        val sheet = workbook.createSheet("Danh sách báo cáo")
        
        // Header Style
        val headerStyle = workbook.createCellStyle().apply {
            val font = workbook.createFont().apply {
                bold = true
                color = IndexedColors.WHITE.index
            }
            setFont(font)
            fillForegroundColor = IndexedColors.INDIGO.index
            fillPattern = FillPatternType.SOLID_FOREGROUND
            alignment = HorizontalAlignment.CENTER
            verticalAlignment = VerticalAlignment.CENTER
        }

        val headers = arrayOf(
            "STT", "Loại", "Mã thiết bị", "Tên thiết bị", "Phòng", 
            "Người gửi", "Ngày gửi", "Nội dung", "Trạng thái", 
            "Người phê duyệt", "Ngày phê duyệt"
        )

        val headerRow = sheet.createRow(0)
        headers.forEachIndexed { i, h ->
            headerRow.createCell(i).apply {
                setCellValue(h)
                cellStyle = headerStyle
            }
        }

        var rowIdx = 1
        for (req in requests) {
            val row = sheet.createRow(rowIdx++)
            row.createCell(0).setCellValue((rowIdx - 1).toDouble())
            
            val type = when(req.request_type) {
                "UPDATE" -> "Sửa đổi"
                "DELETE" -> "Xóa TB"
                else -> "Báo cáo"
            }
            row.createCell(1).setCellValue(type)

            // Extract device info from devices object or payload
            val devCode = req.devices?.device_code 
                ?: (req.update_payload?.get("device_code") as? String) ?: "N/A"
            val devName = req.devices?.device_name 
                ?: (req.update_payload?.get("device_name") as? String) ?: "N/A"
            val roomName = req.devices?.rooms?.room_name 
                ?: (req.update_payload?.get("room_name") as? String) ?: "N/A"

            row.createCell(2).setCellValue(devCode)
            row.createCell(3).setCellValue(devName)
            row.createCell(4).setCellValue(roomName)
            row.createCell(5).setCellValue(req.users?.full_name ?: "N/A")
            row.createCell(6).setCellValue(req.created_at?.take(10) ?: "N/A")
            row.createCell(7).setCellValue(req.description ?: "")
            
            val status = when(req.status_resolve) {
                "approved" -> "Đã duyệt"
                "rejected" -> "Từ chối"
                else -> "Đang chờ"
            }
            row.createCell(8).setCellValue(status)
            row.createCell(9).setCellValue(req.resolver?.full_name ?: (if (req.status_resolve != null && req.status_resolve != "pending") "Hệ thống" else "N/A"))
            row.createCell(10).setCellValue(req.resolved_at?.take(10) ?: "N/A")
        }

        // Auto size columns
        for (i in headers.indices) {
            sheet.autoSizeColumn(i)
        }

        val bos = ByteArrayOutputStream()
        workbook.write(bos)
        val bytes = bos.toByteArray()

        response.contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        response.setHeader("Content-Disposition", "attachment; filename=Bao_cao_thiet_bi.xlsx")
        response.setContentLength(bytes.size)
        
        response.outputStream.write(bytes)
        response.outputStream.flush()
        workbook.close()
    }
}
