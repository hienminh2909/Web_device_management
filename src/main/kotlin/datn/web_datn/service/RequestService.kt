package datn.web_datn.service

import datn.web_datn.model.RequestModel
import org.springframework.http.*
import org.springframework.stereotype.Service
import org.springframework.web.client.RestTemplate

@Service
class RequestService(private val restTemplate: RestTemplate) {
    private val apiUrl = (System.getenv("API_BASE_URL") ?: "http://127.0.0.1:8000") + "/api/requests"

    fun getAllRequests(token: String?, status: String? = null): List<RequestModel> {
        val headers = HttpHeaders()
        headers.setBearerAuth(token ?: "")
        val entity = HttpEntity<Unit>(headers)
        val url = if (status != null) "$apiUrl?status=$status" else apiUrl
        return try {
            val response = restTemplate.exchange(url, HttpMethod.GET, entity, Array<RequestModel>::class.java)
            response.body?.toList() ?: emptyList()
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun getPendingRequestsCount(token: String?): Int {
        val headers = HttpHeaders()
        headers.setBearerAuth(token ?: "")
        val entity = HttpEntity<Unit>(headers)
        return try {
            val response = restTemplate.exchange("$apiUrl/pending-count", HttpMethod.GET, entity, Map::class.java)
            val body = response.body as? Map<*, *>
            val countStr = body?.get("count")?.toString() ?: "0"
            countStr.toIntOrNull() ?: 0
        } catch (e: Exception) {
            0
        }
    }


    fun createRequest(deviceId: Int, description: String, statusDevice: String?, token: String?): RequestModel? {
        val headers = HttpHeaders()
        headers.setBearerAuth(token ?: "")
        headers.contentType = MediaType.APPLICATION_JSON
        
        val payload = mapOf(
            "device_id" to deviceId, 
            "description" to description,
            "status_device" to (statusDevice ?: "pending")
        )
        val entity = HttpEntity(payload, headers)
        
        return try {
            val response = restTemplate.postForEntity(apiUrl, entity, RequestModel::class.java)
            response.body
        } catch (e: Exception) {
            null
        }
    }

    fun createAdvancedRequest(
        deviceId: Int, 
        description: String, 
        requestType: String, 
        payload: Map<String, Any>?, 
        token: String?
    ): RequestModel? {
        val headers = HttpHeaders()
        headers.setBearerAuth(token ?: "")
        headers.contentType = MediaType.APPLICATION_JSON
        
        val body = mapOf(
            "device_id" to deviceId, 
            "description" to description,
            "request_type" to requestType,
            "update_payload" to payload
        )
        val entity = HttpEntity(body, headers)
        
        println(">>> REQUEST SERVICE: Sending to $apiUrl")
        println(">>> REQUEST SERVICE: Body: $body")
        
        return try {
            val response = restTemplate.postForEntity(apiUrl, entity, RequestModel::class.java)
            println(">>> REQUEST SERVICE: Response Status: ${response.statusCode}")
            response.body
        } catch (e: Exception) {
            println(">>> REQUEST SERVICE ERROR: ${e.message}")
            if (e is org.springframework.web.client.HttpClientErrorException) {
                println(">>> SERVER ERROR DETAIL: ${e.responseBodyAsString}")
            }
            null
        }
    }

    fun getMyRequests(token: String?): List<RequestModel> {
        val headers = HttpHeaders()
        headers.setBearerAuth(token ?: "")
        val entity = HttpEntity<Unit>(headers)
        return try {
            val response = restTemplate.exchange("$apiUrl/me", HttpMethod.GET, entity, Array<RequestModel>::class.java)
            response.body?.toList() ?: emptyList()
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun resolveRequest(id: Int, status: String, token: String?): Map<*, *>? {
        val headers = HttpHeaders()
        headers.setBearerAuth(token ?: "")
        val entity = HttpEntity<Unit>(headers)
        return try {
            val response = restTemplate.exchange("$apiUrl/$id/resolve?status=$status", HttpMethod.PUT, entity, Map::class.java)
            response.body
        } catch (e: Exception) {
            mapOf("error" to e.message)
        }
    }

    fun deleteRequest(id: Int, token: String?): Boolean {
        val headers = HttpHeaders()
        headers.setBearerAuth(token ?: "")
        val entity = HttpEntity<Unit>(headers)
        return try {
            val response = restTemplate.exchange("$apiUrl/$id", HttpMethod.DELETE, entity, Map::class.java)
            response.statusCode.is2xxSuccessful
        } catch (e: Exception) {
            false
        }
    }

    fun clearAllRequests(token: String?): Boolean {
        val headers = HttpHeaders()
        headers.setBearerAuth(token ?: "")
        val entity = HttpEntity<Unit>(headers)
        return try {
            val response = restTemplate.exchange(apiUrl, HttpMethod.DELETE, entity, Map::class.java)
            response.statusCode.is2xxSuccessful
        } catch (e: Exception) {
            false
        }
    }
}
