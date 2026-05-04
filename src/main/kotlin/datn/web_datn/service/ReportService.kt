package datn.web_datn.service

import datn.web_datn.model.ReportModel
import org.springframework.http.*
import org.springframework.stereotype.Service
import org.springframework.web.client.RestTemplate

@Service
class ReportService(private val restTemplate: RestTemplate) {
    private val apiUrl = "http://127.0.0.1:8000/api/reports"

    fun getAllReports(token: String?): List<ReportModel> {
        val headers = HttpHeaders()
        headers.setBearerAuth(token ?: "")
        val entity = HttpEntity<Unit>(headers)
        return try {
            val response = restTemplate.exchange(apiUrl, HttpMethod.GET, entity, Array<ReportModel>::class.java)
            response.body?.toList() ?: emptyList()
        } catch (e: Exception) {
            emptyList()
        }
    }
}
