package datn.web_datn.controller

import datn.web_datn.model.CategoryModel
import datn.web_datn.service.CategoryService
import jakarta.servlet.http.HttpSession
import org.springframework.stereotype.Controller
import org.springframework.ui.Model
import org.springframework.web.bind.annotation.*
import org.springframework.http.ResponseEntity

@Controller
@RequestMapping("/categories")
class CategoryController(private val categoryService: CategoryService) {

    @GetMapping
    fun listCategories(model: Model, session: HttpSession): String {
        val token = session.getAttribute("token") as String?
        val role = session.getAttribute("role") as String?
        if (token == null) return "redirect:/login"
        if (role != "admin") return "redirect:/dashboard"

        val categories = categoryService.getAllCategories(token)
        model.addAttribute("categories", categories)
        model.addAttribute("view", "category_list")
        return "dashboard"
    }

    @PostMapping("/add")
    @ResponseBody
    fun addCategory(@RequestBody payload: Map<String, Any>, session: HttpSession): ResponseEntity<Any> {
        return try {
            val token = session.getAttribute("token") as String?
            if (token == null) return ResponseEntity.status(401).body(mapOf("error" to "Phiên đăng nhập hết hạn"))
            
            println(">>> CATEGORY CONTROLLER: [POST] /add - Raw Payload: $payload")
            
            // Chuyển đổi sang Model hoặc truyền trực tiếp map
            val result = categoryService.createCategoryFromMap(payload, token)
            
            if (result?.containsKey("error") == true) {
                println(">>> CATEGORY CONTROLLER: Failed - ${result["error"]}")
                return ResponseEntity.status(400).body(result)
            }
            
            println(">>> CATEGORY CONTROLLER: Success - Result: $result")
            ResponseEntity.ok(result ?: mapOf("success" to true))
        } catch (e: Exception) {
            println(">>> CATEGORY CONTROLLER: CRITICAL ERROR - ${e.message}")
            e.printStackTrace()
            ResponseEntity.status(500).body(mapOf("error" to "Lỗi máy chủ: ${e.message}"))
        }
    }

    @PutMapping("/{id}")
    @ResponseBody
    fun updateCategory(@PathVariable id: Int, @RequestBody payload: Map<String, Any>, session: HttpSession): ResponseEntity<Any> {
        return try {
            val token = session.getAttribute("token") as String?
            if (token == null) return ResponseEntity.status(401).body(mapOf("error" to "Phiên đăng nhập hết hạn"))
            
            println(">>> CATEGORY CONTROLLER: [PUT] /$id - Data: $payload")
            val result = categoryService.updateCategoryFromMap(id, payload, token)
            
            if (result?.containsKey("error") == true) {
                println(">>> CATEGORY CONTROLLER: Update Failed - ${result["error"]}")
                return ResponseEntity.status(400).body(result)
            }
            
            println(">>> CATEGORY CONTROLLER: Update Success - Result: $result")
            ResponseEntity.ok(result ?: mapOf("success" to true))
        } catch (e: Exception) {
            println(">>> CATEGORY CONTROLLER: UPDATE CRITICAL ERROR - ${e.message}")
            ResponseEntity.status(500).body(mapOf("error" to "Lỗi máy chủ: ${e.message}"))
        }
    }

    @DeleteMapping("/{id}")
    @ResponseBody
    fun deleteCategory(@PathVariable id: Int, session: HttpSession): ResponseEntity<Any> {
        return try {
            val token = session.getAttribute("token") as String?
            if (token == null) return ResponseEntity.status(401).body(mapOf("error" to "Phiên đăng nhập hết hạn"))
            
            println(">>> CATEGORY CONTROLLER: [DELETE] /$id")
            val result = categoryService.deleteCategory(id, token)
            
            if (result?.containsKey("error") == true) {
                println(">>> CATEGORY CONTROLLER: Delete Failed - ${result["error"]}")
                return ResponseEntity.status(400).body(result)
            }
            
            println(">>> CATEGORY CONTROLLER: Delete Success")
            ResponseEntity.ok(result ?: mapOf("success" to true))
        } catch (e: Exception) {
            println(">>> CATEGORY CONTROLLER: DELETE CRITICAL ERROR - ${e.message}")
            ResponseEntity.status(500).body(mapOf("error" to "Lỗi máy chủ: ${e.message}"))
        }
    }
}
