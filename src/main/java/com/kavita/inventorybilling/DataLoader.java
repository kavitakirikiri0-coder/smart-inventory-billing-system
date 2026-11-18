package com.kavita.inventorybilling;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.List;

@Configuration
class DataLoader {

    @Bean
    CommandLineRunner seed(
        UserRepository users,
        ProductRepository products,
        CustomerRepository customers,
        SupplierRepository suppliers,
        BillRepository bills,
        StockHistoryRepository stockHistory,
        PasswordEncoder encoder
    ) {
        return args -> {
            // Seed Admin and Staff Users
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

            // Seed Suppliers
            if (suppliers.count() == 0) {
                suppliers.save(new Supplier("Apex Tech Distributors", "+91 98765 43210", "sales@apextech.in", "Brigade Road, Bengaluru, Karnataka"));
                suppliers.save(new Supplier("Metro Stationery & Paper Mills", "+91 98111 22334", "orders@metropaper.com", "Chawri Bazar, Delhi"));
                suppliers.save(new Supplier("DailyFresh FMCG Logistics", "+91 98450 99887", "support@dailyfresh.in", "Bandra Kurla Complex, Mumbai"));
                suppliers.save(new Supplier("Sundar Hardware & Electricals", "+91 97400 11223", "contact@sundarelec.com", "SP Road, Bengaluru, Karnataka"));
            }

            // Seed Customers
            if (customers.count() == 0) {
                customers.save(new Customer("Rahul Sharma", "+91 98765 12345", "rahul.sharma@gmail.com"));
                customers.save(new Customer("Priya Patel", "+91 98222 34567", "priya.patel@yahoo.com"));
                customers.save(new Customer("Amit Kumar", "+91 97111 56789", "amit.kumar@outlook.com"));
                customers.save(new Customer("Sneha Reddy", "+91 99000 87654", "sneha.reddy@gmail.com"));
            }

            // Seed Products
            if (products.count() == 0) {
                Product p1 = new Product();
                p1.setName("Wireless Optical Mouse");
                p1.setCategory("Electronics");
                p1.setPrice(499.0);
                p1.setCostPrice(320.0);
                p1.setQuantity(45);
                p1.setMinStock(10);
                p1.setBarcode("8901030382741");
                p1.setSupplierName("Apex Tech Distributors");
                products.save(p1);

                Product p2 = new Product();
                p2.setName("Mechanical Gaming Keyboard");
                p2.setCategory("Electronics");
                p2.setPrice(1899.0);
                p2.setCostPrice(1350.0);
                p2.setQuantity(18);
                p2.setMinStock(5);
                p2.setBarcode("8901233014125");
                p2.setSupplierName("Apex Tech Distributors");
                products.save(p2);

                Product p3 = new Product();
                p3.setName("USB-C Fast Charging Cable (1.5m)");
                p3.setCategory("Electronics");
                p3.setPrice(249.0);
                p3.setCostPrice(110.0);
                p3.setQuantity(60);
                p3.setMinStock(15);
                p3.setBarcode("8902519001432");
                p3.setSupplierName("Apex Tech Distributors");
                products.save(p3);

                Product p4 = new Product();
                p4.setName("Spiral Notebook 300 Pages (A4)");
                p4.setCategory("Stationery");
                p4.setPrice(120.0);
                p4.setCostPrice(75.0);
                p4.setQuantity(120);
                p4.setMinStock(20);
                p4.setBarcode("8901058852448");
                p4.setSupplierName("Metro Stationery & Paper Mills");
                products.save(p4);

                Product p5 = new Product();
                p5.setName("Gel Pen Smooth Flow (Pack of 5)");
                p5.setCategory("Stationery");
                p5.setPrice(50.0);
                p5.setCostPrice(28.0);
                p5.setQuantity(85);
                p5.setMinStock(25);
                p5.setBarcode("8903344556677");
                p5.setSupplierName("Metro Stationery & Paper Mills");
                products.save(p5);

                Product p6 = new Product();
                p6.setName("Organic Green Tea (25 Bags)");
                p6.setCategory("Beverages");
                p6.setPrice(220.0);
                p6.setCostPrice(140.0);
                p6.setQuantity(30);
                p6.setMinStock(8);
                p6.setBarcode("8904455667788");
                p6.setSupplierName("DailyFresh FMCG Logistics");
                products.save(p6);

                Product p7 = new Product();
                p7.setName("Instant Roasted Coffee (100g)");
                p7.setCategory("Beverages");
                p7.setPrice(295.0);
                p7.setCostPrice(190.0);
                p7.setQuantity(22);
                p7.setMinStock(6);
                p7.setBarcode("8905566778899");
                p7.setSupplierName("DailyFresh FMCG Logistics");
                products.save(p7);

                Product p8 = new Product();
                p8.setName("Ergonomic Aluminium Laptop Stand");
                p8.setCategory("Hardware");
                p8.setPrice(899.0);
                p8.setCostPrice(580.0);
                p8.setQuantity(4); // Low stock trigger!
                p8.setMinStock(10);
                p8.setBarcode("8906677889900");
                p8.setSupplierName("Sundar Hardware & Electricals");
                products.save(p8);

                Product p9 = new Product();
                p9.setName("Smart LED Desk Lamp");
                p9.setCategory("Hardware");
                p9.setPrice(749.0);
                p9.setCostPrice(480.0);
                p9.setQuantity(3); // Low stock trigger!
                p9.setMinStock(8);
                p9.setBarcode("8907788990011");
                p9.setSupplierName("Sundar Hardware & Electricals");
                products.save(p9);

                // Initial stock movement logs
                for (Product p : List.of(p1, p2, p3, p4, p5, p6, p7, p8, p9)) {
                    StockHistory h = new StockHistory();
                    h.setProductId(p.getId());
                    h.setProductName(p.getName());
                    h.setChangeAmount(p.getQuantity());
                    h.setQuantityAfter(p.getQuantity());
                    h.setOperation("INITIAL_STOCK");
                    stockHistory.save(h);
                }
            }

            // Seed Sample Past Bills so charts show trends
            if (bills.count() == 0) {
                Product mouse = products.findAll().stream().filter(p -> p.getName().contains("Mouse")).findFirst().orElse(null);
                Product notebook = products.findAll().stream().filter(p -> p.getName().contains("Notebook")).findFirst().orElse(null);
                Product pen = products.findAll().stream().filter(p -> p.getName().contains("Gel Pen")).findFirst().orElse(null);
                Product cable = products.findAll().stream().filter(p -> p.getName().contains("Cable")).findFirst().orElse(null);

                if (mouse != null && notebook != null && pen != null) {
                    // Bill 1 - 2 days ago
                    Bill b1 = new Bill();
                    b1.setCustomerName("Rahul Sharma");
                    b1.setCustomerPhone("+91 98765 12345");
                    b1.setPaymentMethod("UPI");
                    b1.setCreatedAt(LocalDateTime.now().minusDays(2));
                    b1.setSubtotal(739.0);
                    b1.setDiscount(39.0);
                    b1.setGstPercent(5.0);
                    b1.setGstAmount(35.0);
                    b1.setTotal(735.0);

                    BillItem i1 = new BillItem();
                    i1.setBill(b1);
                    i1.setProductId(mouse.getId());
                    i1.setProductName(mouse.getName());
                    i1.setQuantity(1);
                    i1.setUnitPrice(mouse.getPrice());
                    i1.setAmount(mouse.getPrice());
                    b1.getItems().add(i1);

                    BillItem i2 = new BillItem();
                    i2.setBill(b1);
                    i2.setProductId(notebook.getId());
                    i2.setProductName(notebook.getName());
                    i2.setQuantity(2);
                    i2.setUnitPrice(notebook.getPrice());
                    i2.setAmount(notebook.getPrice() * 2);
                    b1.getItems().add(i2);
                    bills.save(b1);

                    // Bill 2 - 1 day ago
                    Bill b2 = new Bill();
                    b2.setCustomerName("Priya Patel");
                    b2.setCustomerPhone("+91 98222 34567");
                    b2.setPaymentMethod("CARD");
                    b2.setCreatedAt(LocalDateTime.now().minusDays(1));
                    b2.setSubtotal(1899.0);
                    b2.setDiscount(99.0);
                    b2.setGstPercent(5.0);
                    b2.setGstAmount(90.0);
                    b2.setTotal(1890.0);

                    BillItem i3 = new BillItem();
                    i3.setBill(b2);
                    i3.setProductId(cable != null ? cable.getId() : pen.getId());
                    i3.setProductName("Mechanical Gaming Keyboard");
                    i3.setQuantity(1);
                    i3.setUnitPrice(1899.0);
                    i3.setAmount(1899.0);
                    b2.getItems().add(i3);
                    bills.save(b2);

                    // Bill 3 - Today
                    Bill b3 = new Bill();
                    b3.setCustomerName("Amit Kumar");
                    b3.setCustomerPhone("+91 97111 56789");
                    b3.setPaymentMethod("UPI");
                    b3.setCreatedAt(LocalDateTime.now());
                    b3.setSubtotal(490.0);
                    b3.setDiscount(0.0);
                    b3.setGstPercent(5.0);
                    b3.setGstAmount(24.50);
                    b3.setTotal(514.50);

                    BillItem i4 = new BillItem();
                    i4.setBill(b3);
                    i4.setProductId(notebook.getId());
                    i4.setProductName(notebook.getName());
                    i4.setQuantity(2);
                    i4.setUnitPrice(notebook.getPrice());
                    i4.setAmount(notebook.getPrice() * 2);
                    b3.getItems().add(i4);

                    BillItem i5 = new BillItem();
                    i5.setBill(b3);
                    i5.setProductId(pen.getId());
                    i5.setProductName(pen.getName());
                    i5.setQuantity(5);
                    i5.setUnitPrice(pen.getPrice());
                    i5.setAmount(pen.getPrice() * 5);
                    b3.getItems().add(i5);
                    bills.save(b3);
                }
            }
        };
    }
}
