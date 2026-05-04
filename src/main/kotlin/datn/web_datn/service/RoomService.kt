package datn.web_datn.service

import datn.web_datn.model.RoomModel
import org.springframework.http.*
import org.springframework.stereotype.Service
import org.springframework.web.client.RestTemplate

@Service
class RoomService(private val restTemplate: RestTemplate) {
    private val apiUrl = "http://127.0.0.1:8000/api/rooms"

    fun getAllRooms(token: String?): List<RoomModel> {
        val headers = HttpHeaders()
        if (!token.isNullOrBlank()) headers.setBearerAuth(token)
        val entity = HttpEntity<Unit>(headers)
        println(">>> ROOM SERVICE: [GET] $apiUrl")
        return try {
            val response = restTemplate.exchange(apiUrl, HttpMethod.GET, entity, Array<RoomModel>::class.java)
            response.body?.toList() ?: emptyList()
        } catch (e: Exception) {
            println(">>> ROOM SERVICE: GET ERROR - ${e.message}")
            emptyList()
        }
    }

    fun createRoomFromMap(payload: Map<String, Any>, token: String?): Map<*, *>? {
        val headers = HttpHeaders()
        headers.contentType = MediaType.APPLICATION_JSON
        if (!token.isNullOrBlank()) headers.setBearerAuth(token)
        
        val entity = HttpEntity(payload, headers)
        println(">>> ROOM SERVICE: [POST] $apiUrl - Payload: $payload")
        
        return try {
            val response = restTemplate.exchange(apiUrl, HttpMethod.POST, entity, Map::class.java)
            response.body
        } catch (e: org.springframework.web.client.HttpStatusCodeException) {
            val errorBody = e.responseBodyAsString
            println(">>> ROOM SERVICE: POST HTTP ERROR ${e.statusCode} - $errorBody")
            mapOf("error" to (errorBody.takeIf { it.isNotBlank() } ?: e.message))
        } catch (e: Exception) {
            println(">>> ROOM SERVICE: POST FATAL ERROR - ${e.message}")
            mapOf("error" to e.message)
        }
    }

    fun updateRoomFromMap(id: Int, payload: Map<String, Any>, token: String?): Map<*, *>? {
        val headers = HttpHeaders()
        headers.contentType = MediaType.APPLICATION_JSON
        if (!token.isNullOrBlank()) headers.setBearerAuth(token)
        
        val entity = HttpEntity(payload, headers)
        println(">>> ROOM SERVICE: [PUT] $apiUrl/$id - Payload: $payload")
        
        return try {
            val response = restTemplate.exchange("$apiUrl/$id", HttpMethod.PUT, entity, Map::class.java)
            response.body
        } catch (e: org.springframework.web.client.HttpStatusCodeException) {
            val errorBody = e.responseBodyAsString
            println(">>> ROOM SERVICE: PUT HTTP ERROR ${e.statusCode} - $errorBody")
            mapOf("error" to (errorBody.takeIf { it.isNotBlank() } ?: e.message))
        } catch (e: Exception) {
            println(">>> ROOM SERVICE: PUT FATAL ERROR - ${e.message}")
            mapOf("error" to e.message)
        }
    }

    fun deleteRoom(id: Int, token: String?): Map<*, *>? {
        val headers = HttpHeaders()
        if (!token.isNullOrBlank()) headers.setBearerAuth(token)
        val entity = HttpEntity<Unit>(headers)
        println(">>> ROOM SERVICE: [DELETE] $apiUrl/$id")
        
        return try {
            val response = restTemplate.exchange("$apiUrl/$id", HttpMethod.DELETE, entity, Map::class.java)
            response.body
        } catch (e: org.springframework.web.client.HttpStatusCodeException) {
            val errorBody = e.responseBodyAsString
            println(">>> ROOM SERVICE: DELETE HTTP ERROR ${e.statusCode} - $errorBody")
            mapOf("error" to (errorBody.takeIf { it.isNotBlank() } ?: e.message))
        } catch (e: Exception) {
            println(">>> ROOM SERVICE: DELETE FATAL ERROR - ${e.message}")
            mapOf("error" to e.message)
        }
    }
}
