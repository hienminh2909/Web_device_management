package datn.web_datn.service

import org.springframework.stereotype.Service
import datn.web_datn.model.DeviceResponse
import org.springframework.web.client.RestTemplate
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpEntity
import org.springframework.http.HttpMethod
import org.springframework.http.ResponseEntity
import org.springframework.web.client.exchange
import org.springframework.core.ParameterizedTypeReference
import java.util.*
import kotlin.collections.List
@Service
class DashboardService(
    private val restTemplate: RestTemplate,
    private val roomService: RoomService
) {

    fun getQuickStats(token: String?): Map<String, Any> {
        val headers = HttpHeaders()
        headers.setBearerAuth(token ?: "")
        val entity = HttpEntity<Unit>(headers)

        return try {
            // Gọi API lấy danh sách nhóm thiết bị
            val response = restTemplate.exchange(
                "http://127.0.0.1:8000/api/devices/summary",
                HttpMethod.GET,
                entity,
                Array<DeviceResponse>::class.java
            )
            val groups = response.body?.toList() ?: emptyList()

            // LOGIC QUAN TRỌNG: Cộng dồn trường quantity
            val totalQuantity = groups.sumOf { it.quantity }

            // Lọc theo 4 trạng thái chính (Không phân biệt hoa thường)
            val goodCount = groups.filter { it.status.equals("Tốt", ignoreCase = true) }.sumOf { it.quantity }
            val brokenCount = groups.filter { it.status.equals("Hỏng", ignoreCase = true) || it.status.equals("Mất", ignoreCase = true) }.sumOf { it.quantity }
            val needMaintainCount = groups.filter { it.status.equals("Cần bảo trì", ignoreCase = true) }.sumOf { it.quantity }
            val maintainingCount = groups.filter { it.status.equals("Đang bảo trì", ignoreCase = true) || it.status.equals("Bảo trì", ignoreCase = true) }.sumOf { it.quantity }

            val otherQuantity = totalQuantity - goodCount - brokenCount - needMaintainCount - maintainingCount

            // Tính tổng tiền
            var totalAssetValue = 0L
            groups.forEach { group ->
                val priceStr = group.device_price ?: "0"
                val cleanedPrice = priceStr.replace(Regex("[^0-9]"), "")
                val price = cleanedPrice.toLongOrNull() ?: 0L
                totalAssetValue += price * group.quantity
            }

            // Phân bổ thiết bị theo phòng (Bao gồm cả các phòng trống)
            val allRooms = roomService.getAllRooms(token)
            val activeRoomStats = groups.groupBy { it.rooms.room_name }
                .mapValues { entry -> entry.value.sumOf { it.quantity } }
            
            val finalRoomStats = LinkedHashMap<String, Int>()
            allRooms.sortedBy { it.room_name }.forEach { room ->
                finalRoomStats[room.room_name] = activeRoomStats[room.room_name] ?: 0
            }

            mapOf(
                "total" to totalQuantity,
                "available" to goodCount,
                "broken" to brokenCount,
                "needMaintain" to needMaintainCount,
                "maintaining" to maintainingCount,
                "other" to otherQuantity,
                "totalValue" to totalAssetValue,
                "roomLabels" to finalRoomStats.keys.toList(),
                "roomData" to finalRoomStats.values.toList()
            )
        } catch (e: Exception) {
            println("Lỗi DashboardService: ${e.message}")
            mapOf("total" to 0, "available" to 0, "broken" to 0, "maintain" to 0, "other" to 0, "totalValue" to 0L)
        }
    }

    fun getRecentActivity(token: String?): List<Map<String, Any>> {
        val headers = HttpHeaders()
        headers.setBearerAuth(token ?: "")
        val entity = HttpEntity<Unit>(headers)
        
        return try {
            val response = restTemplate.exchange(
                "http://127.0.0.1:8000/api/dashboard/activity",
                HttpMethod.GET,
                entity,
                object : ParameterizedTypeReference<List<Map<String, Any>>>() {}
            )
            response.body ?: emptyList()
        } catch (e: Exception) {
            println(">>> DASHBOARD SERVICE ERROR: ${e.message}")
            emptyList()
        }
    }
}