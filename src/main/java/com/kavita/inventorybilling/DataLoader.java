package com.kavita.inventorybilling;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
class DataLoader {

    @Bean
    CommandLineRunner seed(UserRepository users, ProductRepository products, PasswordEncoder encoder) {
        return args -> {
            if (!users.existsByUsername("admin")) {
                AppUser admin = new AppUser();
                admin.setUsername("admin");
                admin.setPassword(encoder.encode("Admin@123"));
                admin.setRole("ROLE_ADMIN");
                users.save(admin);
            }

            if (!users.existsByUsername("staff")) {
                AppUser staff = new AppUser();
                staff.setUsername("staff");
                staff.setPassword(encoder.encode("Staff@123"));
                staff.setRole("ROLE_STAFF");
                users.save(staff);
            }

            if (products.count() == 0) {
                Product notebook = new Product();
                notebook.setName("Notebook");
                notebook.setCategory("Stationery");
                notebook.setPrice(50.0);
                notebook.setQuantity(100);
                notebook.setMinStock(10);
                products.save(notebook);

                Product pen = new Product();
                pen.setName("Pen");
                pen.setCategory("Stationery");
                pen.setPrice(10.0);
                pen.setQuantity(200);
                pen.setMinStock(20);
                products.save(pen);
            }
        };
    }
}
