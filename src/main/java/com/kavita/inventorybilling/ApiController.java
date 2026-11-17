package com.kavita.inventorybilling;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.authentication.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.*;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;
import java.util.*;

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
    Map<String, String> login(@RequestBody LoginRequest body, HttpServletRequest request) {
        Authentication auth = authManager.authenticate(new UsernamePasswordAuthenticationToken(body.getUsername(), body.getPassword()));
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(auth);
        SecurityContextHolder.setContext(context);
        request.getSession(true).setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, context);
        String role = auth.getAuthorities().iterator().next().getAuthority();
        if (role.startsWith("ROLE_")) {
            role = role.substring(5);
        }
        return Map.of("username", auth.getName(), "role", role);
    }

    @GetMapping("/auth/me")
    Map<String, Object> me(Authentication auth) {
        String role = auth.getAuthorities().iterator().next().getAuthority();
        if (role.startsWith("ROLE_")) {
            role = role.substring(5);
        }
        return Map.of("username", auth.getName(), "role", role);
    }

    @GetMapping("/products")
    List<Product> allProducts(@RequestParam(required = false) String search) {
        return (search == null || search.isBlank())
            ? products.findAll()
            : products.findByNameContainingIgnoreCaseOrCategoryContainingIgnoreCase(search, search);
    }

    @PostMapping("/products")
    Product addProduct(@Valid @RequestBody Product p) {
        if (p.getPrice() < 0 || p.getQuantity() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Price and quantity cannot be negative");
        }
        return products.save(p);
    }

    @PutMapping("/products/{id}")
    Product updateProduct(@PathVariable Long id, @Valid @RequestBody Product input) {
        Product p = products.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
        p.setName(input.getName());
        p.setCategory(input.getCategory());
        p.setPrice(input.getPrice());
        p.setQuantity(input.getQuantity());
        p.setMinStock(input.getMinStock());
        p.setBarcode(input.getBarcode());
        p.setSupplierName(input.getSupplierName());
        return products.save(p);
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

    @PostMapping("/bills")
    @Transactional
    Bill createBill(@RequestBody BillRequest request) {
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Add at least one item");
        }
        Bill bill = new Bill();
        bill.setCustomerName(request.getCustomerName() == null ? "Walk-in Customer" : request.getCustomerName());
        bill.setDiscount(Math.max(0, request.getDiscount()));
        bill.setGstPercent(Math.max(0, request.getGstPercent()));
        double subtotal = 0;
        for (BillLine line : request.getItems()) {
            Product p = products.findById(line.getProductId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
            if (line.getQuantity() <= 0 || p.getQuantity() < line.getQuantity()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Insufficient stock for " + p.getName());
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
        return bills.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    @GetMapping("/dashboard/summary")
    Map<String, Object> summary() {
        List<Bill> all = bills.findAll();
        double today = all.stream()
            .filter(b -> b.getCreatedAt().toLocalDate().equals(LocalDateTime.now().toLocalDate()))
            .mapToDouble(Bill::getTotal)
            .sum();
        double total = all.stream().mapToDouble(Bill::getTotal).sum();
        return Map.of(
            "productCount", products.count(),
            "customerCount", customers.count(),
            "supplierCount", suppliers.count(),
            "lowStockCount", products.findAll().stream().filter(p -> p.getQuantity() <= p.getMinStock()).count(),
            "todaySales", today,
            "totalSales", total,
            "billCount", all.size()
        );
    }
}

class LoginRequest {
    private String username;
    private String password;

    public LoginRequest() {}

    public LoginRequest(String username, String password) {
        this.username = username;
        this.password = password;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}

class BillRequest {
    private String customerName;
    private double discount;
    private double gstPercent = 5;
    private List<BillLine> items = new ArrayList<>();

    public BillRequest() {}

    public String getCustomerName() {
        return customerName;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }

    public double getDiscount() {
        return discount;
    }

    public void setDiscount(double discount) {
        this.discount = discount;
    }

    public double getGstPercent() {
        return gstPercent;
    }

    public void setGstPercent(double gstPercent) {
        this.gstPercent = gstPercent;
    }

    public List<BillLine> getItems() {
        return items;
    }

    public void setItems(List<BillLine> items) {
        this.items = items;
    }
}

class BillLine {
    private Long productId;
    private int quantity;

    public BillLine() {}

    public BillLine(Long productId, int quantity) {
        this.productId = productId;
        this.quantity = quantity;
    }

    public Long getProductId() {
        return productId;
    }

    public void setProductId(Long productId) {
        this.productId = productId;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }
}
