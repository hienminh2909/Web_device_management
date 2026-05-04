package datn.web_datn.service

import datn.web_datn.model.CategoryModel
import org.springframework.http.*
import org.springframework.stereotype.Service
import org.springframework.web.client.RestTemplate

@Service
class CategoryService(private val restTemplate: RestTemplate) {
    private val apiUrl = "http://127.0.0.1:8000/api/categories"

    fun getAllCategories(token: String?): List<CategoryModel> {
        val headers = HttpHeaders()
        headers.setBearerAuth(token ?: "")
        val entity = HttpEntity<Unit>(headers)
        return try {
            val response = restTemplate.exchange(apiUrl, HttpMethod.GET, entity, Array<CategoryModel>::class.java)
            response.body?.toList() ?: emptyList()
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun createCategoryFromMap(payload: Map<String, Any>, token: String?): Map<*, *>? {
        val headers = HttpHeaders()
        headers.contentType = MediaType.APPLICATION_JSON
        if (!token.isNullOrBlank()) {
            headers.setBearerAuth(token)
        }
        
        val entity = HttpEntity(payload, headers)
        println(">>> CATEGORY SERVICE: [POST FROM MAP] $apiUrl")
        println(">>> CATEGORY SERVICE: Payload: $payload")
        
        return try {
            val response = restTemplate.exchange(apiUrl, HttpMethod.POST, entity, Map::class.java)
            println(">>> CATEGORY SERVICE: Response Status: ${response.statusCode}")
            response.body
        } catch (e: org.springframework.web.client.HttpStatusCodeException) {
            val errorBody = e.responseBodyAsString
            println(">>> CATEGORY SERVICE: HTTP ERROR ${e.statusCode} - $errorBody")
            mapOf("error" to (errorBody.takeIf { it.isNotBlank() } ?: e.message))
        } catch (e: Exception) {
            println(">>> CATEGORY SERVICE: FATAL ERROR - ${e.message}")
            mapOf("error" to e.message)
        }
    }

    fun createCategory(category: CategoryModel, token: String?): Map<*, *>? {
        val payload = mapOf(
            "category_name" to category.category_name,
            "category_code" to category.category_code,
            "description" to category.description?.takeIf { it.isNotBlank() }
        )
        return createCategoryFromMap(payload as Map<String, Any>, token)
    }

    fun updateCategoryFromMap(id: Int, payload: Map<String, Any>, token: String?): Map<*, *>? {
        val headers = HttpHeaders()
        headers.contentType = MediaType.APPLICATION_JSON
        if (!token.isNullOrBlank()) {
            headers.setBearerAuth(token)
        }
        
        val entity = HttpEntity(payload, headers)
        println(">>> CATEGORY SERVICE: [PUT] $apiUrl/$id - Payload: $payload")
        
        return try {
            val response = restTemplate.exchange("$apiUrl/$id", HttpMethod.PUT, entity, Map::class.java)
            println(">>> CATEGORY SERVICE: Update Response Status: ${response.statusCode}")
            response.body
        } catch (e: org.springframework.web.client.HttpStatusCodeException) {
            val errorBody = e.responseBodyAsString
            println(">>> CATEGORY SERVICE: UPDATE HTTP ERROR ${e.statusCode} - $errorBody")
            mapOf("error" to (errorBody.takeIf { it.isNotBlank() } ?: e.message))
        } catch (e: Exception) {
            println(">>> CATEGORY SERVICE: UPDATE FATAL ERROR - ${e.message}")
            mapOf("error" to e.message)
        }
    }

    fun updateCategory(id: Int, category: CategoryModel, token: String?): Map<*, *>? {
        val payload = mapOf(
            "category_name" to category.category_name,
            "category_code" to category.category_code,
            "description" to category.description?.takeIf { it.isNotBlank() }
        )
        return updateCategoryFromMap(id, payload as Map<String, Any>, token)
    }

    fun deleteCategory(id: Int, token: String?): Map<*, *>? {
        val headers = HttpHeaders()
        if (!token.isNullOrBlank()) {
            headers.setBearerAuth(token)
        }
        
        val entity = HttpEntity<Unit>(headers)
        println(">>> CATEGORY SERVICE: [DELETE] $apiUrl/$id")
        
        return try {
            val response = restTemplate.exchange("$apiUrl/$id", HttpMethod.DELETE, entity, Map::class.java)
            println(">>> CATEGORY SERVICE: Delete Response Status: ${response.statusCode}")
            response.body
        } catch (e: org.springframework.web.client.HttpStatusCodeException) {
            val errorBody = e.responseBodyAsString
            println(">>> CATEGORY SERVICE: DELETE HTTP ERROR ${e.statusCode} - $errorBody")
            mapOf("error" to (errorBody.takeIf { it.isNotBlank() } ?: e.message))
        } catch (e: Exception) {
            println(">>> CATEGORY SERVICE: DELETE FATAL ERROR - ${e.message}")
            mapOf("error" to e.message)
        }
    }
}
