package com.kavita.inventorybilling;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.Getter;
import lombok.Setter;
import org.springframework.http.*;
import org.springframework.security.authentication.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.*;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
class ApiController {
    private final ProductRepository products;
    private final CustomerRepository customers;
    private final SupplierRepository suppliers;
    private final BillRepository bills;
    private final StockHistoryRepository stockHistory;
    private final AuthenticationManager authManager;

    ApiController(ProductRepository p, CustomerRepository c, SupplierRepository s, BillRepository b, StockHistoryRepository h, AuthenticationManager a) {
        products = p;
        customers = c;
        suppliers = s;
        bills = b;
        stockHistory = h;
        authManager = a;
    }

    @PostMapping("/auth/login")
    Map<String, String> login(@RequestBody LoginRequest body, HttpServletRequest request, jakarta.servlet.http.HttpServletResponse response) {
        Authentication auth = authManager.authenticate(new UsernamePasswordAuthenticationToken(body.getUsername(), body.getPassword()));
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(auth);
        SecurityContextHolder.setContext(context);
        new org.springframework.security.web.context.HttpSessionSecurityContextRepository().saveContext(context, request, response);
        request.getSession(true).setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, context);
        String role = auth.getAuthorities().iterator().next().getAuthority();
        if (role.startsWith("ROLE_")) {
            role = role.substring(5);
        }
        return Map.of("username", auth.getName(), "role", role);
    }

    @GetMapping("/auth/me")
    Map<String, Object> me(Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
        String role = auth.getAuthorities().iterator().next().getAuthority();
        if (role.startsWith("ROLE_")) {
            role = role.substring(5);
        }
        return Map.of("username", auth.getName(), "role", role);
    }

    // --- Product Endpoints ---

    @GetMapping("/products")
    List<Product> allProducts(@RequestParam(required = false) String search) {
        if (search == null || search.isBlank()) {
            return products.findAll();
        }
        return products.findByNameContainingIgnoreCaseOrCategoryContainingIgnoreCase(search.trim(), search.trim());
    }

    @GetMapping("/products/by-barcode/{code}")
    Product byBarcode(@PathVariable String code) {
        return products.findAll().stream()
            .filter(p -> p.getBarcode() != null && p.getBarcode().equalsIgnoreCase(code.trim()))
            .findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product with barcode " + code + " not found"));
    }

    @PostMapping("/products")
    Product addProduct(@Valid @RequestBody Product p) {
        if (p.getPrice() < 0 || p.getQuantity() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Price and quantity cannot be negative");
        }
        Product saved = products.save(p);
        StockHistory h = new StockHistory();
        h.setProductId(saved.getId());
        h.setProductName(saved.getName());
        h.setChangeAmount(saved.getQuantity());
        h.setQuantityAfter(saved.getQuantity());
        h.setOperation("INITIAL_STOCK");
        stockHistory.save(h);
        return saved;
    }

    @PutMapping("/products/{id}")
    Product updateProduct(@PathVariable Long id, @Valid @RequestBody Product input) {
        Product p = products.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
        int oldQty = p.getQuantity();
        p.setName(input.getName());
        p.setCategory(input.getCategory());
        p.setPrice(input.getPrice());
        p.setCostPrice(input.getCostPrice());
        p.setQuantity(input.getQuantity());
        p.setMinStock(input.getMinStock());
        p.setBarcode(input.getBarcode());
        p.setSupplierName(input.getSupplierName());
        Product saved = products.save(p);

        if (saved.getQuantity() != oldQty) {
            StockHistory h = new StockHistory();
            h.setProductId(saved.getId());
            h.setProductName(saved.getName());
            h.setChangeAmount(saved.getQuantity() - oldQty);
            h.setQuantityAfter(saved.getQuantity());
            h.setOperation("MANUAL_ADJUSTMENT");
            stockHistory.save(h);
        }
        return saved;
    }

    @PostMapping("/products/{id}/adjust-stock")
    Product adjustStock(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Product p = products.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
        int delta = body.containsKey("amount") ? ((Number) body.get("amount")).intValue() : 0;
        String reason = body.containsKey("reason") ? body.get("reason").toString() : "RESTOCK";
        if (p.getQuantity() + delta < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Insufficient stock to deduct");
        }
        p.setQuantity(p.getQuantity() + delta);
        Product saved = products.save(p);

        StockHistory h = new StockHistory();
        h.setProductId(saved.getId());
        h.setProductName(saved.getName());
        h.setChangeAmount(delta);
        h.setQuantityAfter(saved.getQuantity());
        h.setOperation(reason);
        stockHistory.save(h);
        return saved;
    }

    @DeleteMapping("/products/{id}")
    ResponseEntity<Void> deleteProduct(@PathVariable Long id) {
        if (!products.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found");
        }
        products.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/products/low-stock")
    List<Product> lowStock() {
        return products.findAll().stream().filter(p -> p.getQuantity() <= p.getMinStock()).toList();
    }

    // --- Customers ---

    @GetMapping("/customers")
    List<Customer> allCustomers() {
        return customers.findAll();
    }

    @PostMapping("/customers")
    Customer addCustomer(@RequestBody Customer c) {
        return customers.save(c);
    }

    @PutMapping("/customers/{id}")
    Customer updateCustomer(@PathVariable Long id, @RequestBody Customer c) {
        Customer old = customers.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        old.setName(c.getName());
        old.setPhone(c.getPhone());
        old.setEmail(c.getEmail());
        return customers.save(old);
    }

    @DeleteMapping("/customers/{id}")
    void deleteCustomer(@PathVariable Long id) {
        customers.deleteById(id);
    }

    // --- Suppliers ---

    @GetMapping("/suppliers")
    List<Supplier> allSuppliers() {
        return suppliers.findAll();
    }

    @PostMapping("/suppliers")
    Supplier addSupplier(@RequestBody Supplier s) {
        return suppliers.save(s);
    }

    @PutMapping("/suppliers/{id}")
    Supplier updateSupplier(@PathVariable Long id, @RequestBody Supplier s) {
        Supplier old = suppliers.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        old.setName(s.getName());
        old.setPhone(s.getPhone());
        old.setEmail(s.getEmail());
        old.setAddress(s.getAddress());
        return suppliers.save(old);
    }

    @DeleteMapping("/suppliers/{id}")
    void deleteSupplier(@PathVariable Long id) {
        suppliers.deleteById(id);
    }

    // --- Billing ---

    @PostMapping("/bills")
    @Transactional
    Bill createBill(@RequestBody BillRequest request) {
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Add at least one item to generate bill");
        }
        Bill bill = new Bill();
        bill.setCustomerName(request.getCustomerName() == null || request.getCustomerName().isBlank() ? "Walk-in Customer" : request.getCustomerName().trim());
        bill.setCustomerPhone(request.getCustomerPhone());
        bill.setPaymentMethod(request.getPaymentMethod() != null ? request.getPaymentMethod() : "UPI");
        bill.setDiscount(Math.max(0, request.getDiscount()));
        bill.setGstPercent(Math.max(0, request.getGstPercent()));

        double subtotal = 0;
        for (BillLine line : request.getItems()) {
            Product p = products.findById(line.getProductId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product ID " + line.getProductId() + " not found"));
            if (line.getQuantity() <= 0 || p.getQuantity() < line.getQuantity()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Insufficient stock for " + p.getName() + " (Available: " + p.getQuantity() + ")");
            }
            p.setQuantity(p.getQuantity() - line.getQuantity());
            products.save(p);

            StockHistory h = new StockHistory();
            h.setProductId(p.getId());
            h.setProductName(p.getName());
            h.setChangeAmount(-line.getQuantity());
            h.setQuantityAfter(p.getQuantity());
            h.setOperation("SALE");
            stockHistory.save(h);

            BillItem item = new BillItem();
            item.setBill(bill);
            item.setProductId(p.getId());
            item.setProductName(p.getName());
            item.setQuantity(line.getQuantity());
            item.setUnitPrice(p.getPrice());
            item.setAmount(p.getPrice() * line.getQuantity());
            bill.getItems().add(item);
            subtotal += item.getAmount();
        }

        double discount = Math.min(bill.getDiscount(), subtotal);
        bill.setSubtotal(subtotal);
        double taxable = subtotal - discount;
        double gst = taxable * bill.getGstPercent() / 100.0;
        bill.setGstAmount(gst);
        bill.setTotal(taxable + gst);
        return bills.save(bill);
    }

    @GetMapping("/bills")
    List<Bill> allBills() {
        return bills.findAllByOrderByCreatedAtDesc();
    }

    @GetMapping("/bills/{id}")
    @Transactional(readOnly = true)
    Bill getBill(@PathVariable Long id) {
        return bills.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bill #" + id + " not found"));
    }

    // --- Dashboard & Analytics ---

    @GetMapping("/dashboard/summary")
    Map<String, Object> summary() {
        List<Bill> all = bills.findAll();
        LocalDate today = LocalDate.now();
        double todaySales = all.stream()
            .filter(b -> b.getCreatedAt().toLocalDate().equals(today))
            .mapToDouble(Bill::getTotal)
            .sum();
        double totalSales = all.stream().mapToDouble(Bill::getTotal).sum();
        long lowStockCount = products.findAll().stream().filter(p -> p.getQuantity() <= p.getMinStock()).count();

        // Calculate inventory valuations and projected profits
        List<Product> allProds = products.findAll();
        double retailValuation = allProds.stream().mapToDouble(p -> p.getPrice() * p.getQuantity()).sum();
        double costValuation = allProds.stream().mapToDouble(p -> p.getCostPrice() * p.getQuantity()).sum();
        double projectedProfit = retailValuation - costValuation;

        return Map.of(
            "productCount", allProds.size(),
            "customerCount", customers.count(),
            "supplierCount", suppliers.count(),
            "lowStockCount", lowStockCount,
            "todaySales", Math.round(todaySales * 100.0) / 100.0,
            "totalSales", Math.round(totalSales * 100.0) / 100.0,
            "billCount", all.size(),
            "retailValuation", Math.round(retailValuation * 100.0) / 100.0,
            "projectedProfit", Math.round(projectedProfit * 100.0) / 100.0
        );
    }

    @GetMapping("/dashboard/analytics")
    Map<String, Object> analytics() {
        List<Bill> all = bills.findAll();
        LocalDate today = LocalDate.now();

        // Last 7 days revenue map
        Map<String, Double> last7Days = new LinkedHashMap<>();
        for (int i = 6; i >= 0; i--) {
            LocalDate d = today.minusDays(i);
            last7Days.put(d.toString(), 0.0);
        }
        for (Bill b : all) {
            String dateStr = b.getCreatedAt().toLocalDate().toString();
            if (last7Days.containsKey(dateStr)) {
                last7Days.put(dateStr, last7Days.get(dateStr) + b.getTotal());
            }
        }

        // Category distribution
        Map<String, Long> categoryCount = products.findAll().stream()
            .collect(Collectors.groupingBy(p -> p.getCategory() == null || p.getCategory().isBlank() ? "Other" : p.getCategory(), Collectors.counting()));

        // Recent stock movements
        List<StockHistory> movements = stockHistory.findAll().stream()
            .sorted(Comparator.comparing(StockHistory::getTimestamp).reversed())
            .limit(10)
            .toList();

        return Map.of(
            "dailyRevenue", last7Days,
            "categories", categoryCount,
            "recentMovements", movements
        );
    }
}

@Getter
@Setter
class LoginRequest {
    private String username;
    private String password;
}

@Getter
@Setter
class BillRequest {
    private String customerName;
    private String customerPhone;
    private String paymentMethod;
    private double discount;
    private double gstPercent = 5;
    private List<BillLine> items;
}

@Getter
@Setter
class BillLine {
    private Long productId;
    private int quantity;
}
