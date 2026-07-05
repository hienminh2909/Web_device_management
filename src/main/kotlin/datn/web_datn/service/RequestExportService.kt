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

        val wrapStyle = workbook.createCellStyle().apply {
            wrapText = true
            verticalAlignment = VerticalAlignment.CENTER
        }

        val headers = arrayOf(
            "Loại yêu cầu", "ID", "Ngày tạo", "Tên thiết bị", "Người tạo", "Mô tả", 
            "Trạng thái TB", "Người xử lý", "Ngày xử lý", "Trạng thái duyệt", 
            "Ghi chú", "Thay đổi (Cũ -> Mới)"
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
            
            // Loại yêu cầu
            val typeStr = when(req.request_type) {
                "UPDATE" -> "Sửa đổi"
                "DELETE" -> "Xóa TB"
                else -> "Báo cáo"
            }
            row.createCell(0).setCellValue(typeStr)
            
            // id
            row.createCell(1).setCellValue((req.id ?: 0).toDouble())
            // created_at
            row.createCell(2).setCellValue(req.created_at ?: "")
            
            // Tên thiết bị (thay cho device_id)
            val devName = req.devices?.device_name ?: (req.update_payload?.get("device_name") as? String) ?: "N/A"
            row.createCell(3).setCellValue(devName)
            
            // Người tạo (thay cho created_by)
            row.createCell(4).setCellValue(req.users?.full_name ?: "N/A")
            
            // description
            row.createCell(5).setCellValue(req.description ?: "")
            // status_device
            row.createCell(6).setCellValue(req.status_device ?: "")
            
            // Người xử lý (thay cho resolved_by)
            val resolverName = req.resolver?.full_name ?: (if (req.status_resolve != null && req.status_resolve != "pending") "Hệ thống" else "N/A")
            row.createCell(7).setCellValue(resolverName)
            
            // resolved_at
            row.createCell(8).setCellValue(req.resolved_at ?: "")
            // status_resolve
            val statusResolveStr = when(req.status_resolve) {
                "approved" -> "Đã duyệt"
                "rejected" -> "Từ chối"
                "pending" -> "Đang chờ"
                else -> req.status_resolve ?: "Đang chờ"
            }
            row.createCell(9).setCellValue(statusResolveStr)
            // note
            row.createCell(10).setCellValue(req.note ?: "")
            
            // Thay đổi cũ -> mới
            val changeReport = when (req.request_type) {
                "REPORT", null -> {
                    val oldStatus = req.devices?.status ?: "N/A"
                    val newStatus = req.status_device ?: "N/A"
                    "Trạng thái: $oldStatus -> $newStatus"
                }
                "UPDATE" -> {
                    val changes = mutableListOf<String>()
                    val keyMap = mapOf(
                        "device_name" to "Tên TB",
                        "device_code" to "Mã TB",
                        "device_price" to "Giá trị",
                        "description" to "Mô tả",
                        "status" to "Trạng thái",
                        "purchase_date" to "Ngày nhập",
                        "room_name" to "Phòng",
                        "category" to "Danh mục"
                    )

                    req.update_payload?.forEach { (k, v) ->
                        if (k == "id" || k == "image_url" || k == "device_id") return@forEach
                        
                        val oldVal = when(k) {
                            "device_name" -> req.devices?.device_name
                            "device_code" -> req.devices?.device_code
                            "device_price" -> req.devices?.device_price?.toString()
                            "description" -> req.devices?.description
                            "status" -> req.devices?.status
                            "purchase_date" -> req.devices?.purchase_date
                            "room_name" -> req.devices?.rooms?.room_name
                            "category" -> req.devices?.categories?.category_name
                            else -> "N/A"
                        }
                        
                        var oldStr = oldVal?.toString()?.trim() ?: "Trống"
                        if (oldStr.isEmpty() || oldStr == "N/A" || oldStr == "undefined") oldStr = "Trống"
                        
                        var newStr = v?.toString()?.trim() ?: "Trống"
                        if (newStr.isEmpty() || newStr == "N/A" || newStr == "undefined") newStr = "Trống"
                        
                        if (oldStr != newStr) {
                            val niceKey = keyMap[k] ?: k
                            changes.add("• $niceKey: [$oldStr] ➔ [$newStr]")
                        }
                    }
                    if (changes.isEmpty()) "Thay đổi chung (xem chi tiết trên web)" else changes.joinToString("\n")
                }
                "DELETE" -> {
                    val devNameDel = req.devices?.device_name ?: req.update_payload?.get("device_name") ?: "N/A"
                    val devCodeDel = req.devices?.device_code ?: req.update_payload?.get("device_code") ?: "N/A"
                    "Yêu cầu xóa thiết bị:\n$devNameDel (Mã: $devCodeDel)"
                }
                else -> "N/A"
            }
            
            val changeReportCell = row.createCell(11)
            changeReportCell.setCellValue(changeReport)
            changeReportCell.cellStyle = wrapStyle
        }


        for (i in headers.indices) {
            if (i != 11) {
                sheet.autoSizeColumn(i)
            }
        }
        sheet.setColumnWidth(11, 12000) // Cố định chiều rộng cột Thay đổi (Cũ -> Mới) để chữ tự xuống dòng

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
