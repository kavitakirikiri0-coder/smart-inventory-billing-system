package com.kavita.inventorybilling;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class HomeController {

    @GetMapping(value = {
        "/",
        "/index",
        "/login",
        "/dashboard",
        "/billing",
        "/pos",
        "/products",
        "/customers",
        "/suppliers",
        "/sales",
        "/ai-assistant",
        "/analytics"
    })
    public String index() {
        return "forward:/index.html";
    }
}
