package datn.web_datn.service

import datn.web_datn.model.UserModel
import datn.web_datn.model.UserCreateRequest
import datn.web_datn.model.UserUpdateRequest
import org.springframework.http.*
import org.springframework.stereotype.Service
import org.springframework.web.client.RestTemplate

@Service
class UserService(private val restTemplate: RestTemplate) {
    private val apiUrl = "http://127.0.0.1:8000/api/users"

    fun getAllUsers(token: String?): List<UserModel> {
        val headers = HttpHeaders()
        headers.setBearerAuth(token ?: "")
        val entity = HttpEntity<Unit>(headers)
        return try {
            val response = restTemplate.exchange(apiUrl, HttpMethod.GET, entity, Array<UserModel>::class.java)
            response.body?.toList() ?: emptyList()
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun createUser(user: UserCreateRequest, token: String?): Map<*, *>? {
        val headers = HttpHeaders()
        headers.contentType = MediaType.APPLICATION_JSON
        headers.setBearerAuth(token ?: "")
        val entity = HttpEntity(user, headers)
        return try {
            restTemplate.postForObject(apiUrl, entity, Map::class.java)
        } catch (e: org.springframework.web.client.HttpClientErrorException) {
            mapOf("error" to (e.responseBodyAsString.takeIf { it.isNotBlank() } ?: e.message))
        } catch (e: Exception) {
            mapOf("error" to e.message)
        }
    }

    fun updateUser(id: Int, user: UserUpdateRequest, token: String?): Map<*, *>? {
        val headers = HttpHeaders()
        headers.contentType = MediaType.APPLICATION_JSON
        headers.setBearerAuth(token ?: "")
        val entity = HttpEntity(user, headers)
        return try {
            val response = restTemplate.exchange("$apiUrl/$id", HttpMethod.PUT, entity, Map::class.java)
            response.body
        } catch (e: org.springframework.web.client.HttpClientErrorException) {
            mapOf("error" to (e.responseBodyAsString.takeIf { it.isNotBlank() } ?: e.message))
        } catch (e: Exception) {
            mapOf("error" to e.message)
        }
    }

    fun deleteUser(id: Int, token: String?): Map<*, *>? {
        val headers = HttpHeaders()
        headers.setBearerAuth(token ?: "")
        val entity = HttpEntity<Unit>(headers)
        return try {
            val response = restTemplate.exchange("$apiUrl/$id", HttpMethod.DELETE, entity, Map::class.java)
            response.body
        } catch (e: org.springframework.web.client.HttpClientErrorException) {
            mapOf("error" to (e.responseBodyAsString.takeIf { it.isNotBlank() } ?: e.message))
        } catch (e: Exception) {
            mapOf("error" to e.message)
        }
    }

    fun exportUsersToExcel(token: String?, response: jakarta.servlet.http.HttpServletResponse) {
        val users = getAllUsers(token)
        
        try {
            val workbook = org.apache.poi.xssf.usermodel.XSSFWorkbook()
            val sheet = workbook.createSheet("Danh_Sach_Nguoi_Dung")
            
            // Header
            val headerRow = sheet.createRow(0)
            val columns = arrayOf("ID", "Họ và Tên", "Tên đăng nhập", "Chức vụ", "Điện thoại", "Email", "Phòng phụ trách", "Ngày tạo")
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
            for (u in users) {
                val row = sheet.createRow(rowIdx++)
                row.createCell(0).setCellValue((u.id ?: 0).toDouble())
                row.createCell(1).setCellValue(u.full_name)
                row.createCell(2).setCellValue(u.username)
                row.createCell(3).setCellValue(u.role)
                row.createCell(4).setCellValue(u.phone ?: "N/A")
                row.createCell(5).setCellValue(u.email ?: "N/A")
                row.createCell(6).setCellValue(u.room_id?.toString() ?: "Tất cả")
                row.createCell(7).setCellValue(u.created_at ?: "N/A")
            }
            
            for (i in columns.indices) {
                sheet.autoSizeColumn(i)
            }
            
            response.contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            response.setHeader("Content-Disposition", "attachment; filename=Danh_Sach_Nguoi_Dung.xlsx")
            
            workbook.write(response.outputStream)
            workbook.close()
        } catch (e: Exception) {
            response.sendError(500, "Lỗi xuất file: ${e.message}")
        }
    }

    fun getMyProfile(token: String?): Map<*, *>? {
        val headers = HttpHeaders()
        headers.setBearerAuth(token ?: "")
        val entity = HttpEntity<Unit>(headers)
        return try {
            val response = restTemplate.exchange("$apiUrl/me", HttpMethod.GET, entity, Map::class.java)
            response.body
        } catch (e: Exception) {
            null
        }
    }

    fun updateMyProfile(data: Map<String, Any>, token: String?): Map<*, *>? {
        val headers = HttpHeaders()
        headers.contentType = MediaType.APPLICATION_JSON
        headers.setBearerAuth(token ?: "")
        val entity = HttpEntity(data, headers)
        return try {
            val response = restTemplate.exchange("$apiUrl/me/update", HttpMethod.PUT, entity, Map::class.java)
            response.body
        } catch (e: Exception) {
            mapOf("error" to e.message)
        }
    }

    fun changePassword(oldPass: String, newPass: String, token: String?): Map<*, *>? {
        val headers = HttpHeaders()
        headers.contentType = MediaType.APPLICATION_JSON
        headers.setBearerAuth(token ?: "")
        val body = mapOf("old_password" to oldPass, "new_password" to newPass)
        val entity = HttpEntity(body, headers)
        return try {
            val response = restTemplate.postForObject("$apiUrl/me/change-password", entity, Map::class.java)
            response
        } catch (e: org.springframework.web.client.HttpClientErrorException) {
            mapOf("error" to (e.responseBodyAsString.takeIf { it.isNotBlank() } ?: "Mật khẩu cũ không chính xác"))
        } catch (e: Exception) {
            mapOf("error" to e.message)
        }
    }

    fun resetPassword(id: String, token: String?): Map<*, *>? {
        val headers = HttpHeaders()
        headers.setBearerAuth(token ?: "")
        val entity = HttpEntity<Unit>(headers)
        return try {
            val response = restTemplate.postForObject("$apiUrl/$id/reset-password", entity, Map::class.java)
            response
        } catch (e: Exception) {
            mapOf("error" to e.message)
        }
    }
}
