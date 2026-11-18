# ⚡ StockWise Pro · Smart Inventory & POS Billing ERP

[![Spring Boot 3](https://img.shields.io/badge/Spring%20Boot-3.5.6-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![Java 17](https://img.shields.io/badge/Java-17-orange.svg)](https://www.oracle.com/java/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.x-38B2AC.svg)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A modern, production-grade **Smart Inventory & POS Billing ERP web application** designed as an internship portfolio presentation project. Built with **Spring Boot 3**, **Spring Security**, **Spring Data JPA**, and a responsive **Tailwind CSS + Vanilla JavaScript (ES6+)** frontend.

---

## 🌟 Unique Internship Highlights & Advanced Features

| Feature | Description | Tech / Integration |
| :--- | :--- | :--- |
| 📷 **Live Camera Barcode Scanner** | Scan physical EAN-13 / QR barcodes using a webcam or mobile camera to automatically look up items and add to POS cart. | `html5-qrcode` & WebRTC Video Stream |
| 📱 **Dynamic UPI QR Payments** | Generates an instant, standard Indian UPI QR Code (`upi://pay?pa=...&am=...`) for payments via PhonePe, Google Pay, Paytm, or BHIM. | `QRCode.js` & NPCI UPI Specification |
| 🤖 **AI Receipt OCR Scanner** | Upload supplier bills / paper receipts: automatically extracts vendor details, invoice date, line items, prices, and imports into inventory. | Simulated Gemini Vision OCR Engine |
| 🖨️ **80mm Thermal Receipt Printing** | Instant retail thermal receipt preview with GSTIN, cashier info, CGST/SGST tax breakdown, and dedicated `@media print` CSS. | Native Browser Thermal Print Engine |
| 💬 **1-Click WhatsApp Sharing** | Automatically formats the itemized invoice summary, tax details, and total, opening a pre-filled WhatsApp chat link (`wa.me`). | WhatsApp Web Deep Linking API |
| 📄 **Server-Side PDF Invoices** | Generates official, downloadable tax invoice PDFs with itemized breakdown. | Apache `PDFBox 3.0` |
| 📊 **Financial & Profit Analytics** | Calculates wholesale cost basis vs. retail inventory valuation, displaying projected gross profit margins and real-time trends. | Chart.js Line & Doughnut Charts |
| 🔒 **Role-Based Access Control** | Dedicated session-based authentication with `ROLE_ADMIN` and `ROLE_STAFF` privileges. | Spring Security 6 & BCrypt |
| 📥 **1-Click CSV Exports** | Export full product catalog and sales audit trail to spreadsheet-ready CSV files. | Client-side Data Stream Blob API |

---

## 🛠️ Tech Stack & Architecture

- **Backend**: Java 17, Spring Boot 3.5.6, Spring Data JPA, Spring Security, Spring Validation, Apache PDFBox 3.0
- **Database**: MySQL 8.x / H2 in-memory & file database
- **Frontend**: HTML5, Tailwind CSS (via CDN), Vanilla JavaScript (ES6+), FontAwesome 6, Chart.js, QRCode.js, Html5Qrcode
- **Build Tool**: Apache Maven with Maven Wrapper (`./mvnw`)

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **JDK 17** installed and configured in your `PATH`
- **MySQL 8** running on `localhost:3306` (or switch to H2 in `application.properties`)

### 2. Database Configuration
Open `src/main/resources/application.properties`:
```properties
spring.datasource.url=jdbc:mysql://localhost:3306/inventory_billing?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Kolkata
spring.datasource.username=root
spring.datasource.password=password
```
*(The application automatically creates the `inventory_billing` database and tables upon first run!)*

### 3. Run the Application
Open a terminal in the project directory:

```bash
# On Windows
.\mvnw.cmd spring-boot:run

# On Linux / macOS
./mvnw spring-boot:run
```

Or run directly from **Eclipse / Spring Tool Suite / IntelliJ IDEA**:
Right-click `InventoryBillingApplication.java` ➔ **Run As** ➔ **Spring Boot App** (or **Java Application**).

### 4. Access the Application
Open your web browser and navigate to:
👉 **`http://localhost:8080/`**

---

## 🔑 Demo Login Credentials

The application seeds two pre-configured user accounts on initial startup:

| Role | Username | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `Admin@123` | Full access (Products CRUD, Cost Prices, Suppliers, Reports, Billing) |
| **Staff** | `staff` | `Staff@123` | Cashier terminal access (POS Billing, Product viewing, Receipts) |

*(Quick 1-click buttons are available on the login screen to auto-fill credentials for demo presentations).*

---

## 📡 REST API Matrix

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Authenticate user and initialize session | Public |
| `GET` | `/api/auth/me` | Current authenticated session user info | Admin / Staff |
| `POST` | `/api/auth/logout` | Terminate session | Authenticated |
| `GET` | `/api/products` | Retrieve all products (supports `?search=`) | Admin / Staff |
| `GET` | `/api/products/by-barcode/{code}` | Instant barcode lookup for camera scanner | Admin / Staff |
| `POST` | `/api/products` | Add new product SKU with cost price & barcode | Admin |
| `PUT` | `/api/products/{id}` | Update product details | Admin |
| `DELETE` | `/api/products/{id}` | Remove product SKU | Admin |
| `POST` | `/api/products/{id}/adjust-stock` | Manual or OCR stock increment/deduction | Admin / Staff |
| `GET` | `/api/products/low-stock` | Filter products below minimum buffer threshold | Admin / Staff |
| `POST` | `/api/bills` | Generate customer bill with items, GST, discount | Admin / Staff |
| `GET` | `/api/bills` | Audit history of past invoices | Admin / Staff |
| `GET` | `/api/bills/{id}` | Detailed single bill record | Admin / Staff |
| `GET` | `/api/bills/{id}/pdf` | Download official PDF tax invoice | Admin / Staff |
| `GET` | `/api/dashboard/summary` | Real-time KPI counters & inventory valuation | Admin / Staff |
| `GET` | `/api/dashboard/analytics` | 7-day revenue trend & category distribution | Admin / Staff |

---

## 📂 Project Directory Structure

```
smart-inventory-billing-system/
├── pom.xml                               # Maven project descriptor (Java 17, Spring Boot 3)
├── mvnw / mvnw.cmd                       # Maven wrappers
├── README.md                             # Documentation
└── src/
    └── main/
        ├── java/com/kavita/inventorybilling/
        │   ├── InventoryBillingApplication.java  # Main Spring Boot entrypoint
        │   ├── HomeController.java               # SPA routing & forwarder (prevents 404s)
        │   ├── SecurityConfig.java               # Spring Security 6 configuration
        │   ├── Entities.java                     # JPA Entities (AppUser, Product, Bill, Customer, etc.)
        │   ├── Repositories.java                 # Spring Data JPA repositories
        │   ├── ApiController.java                # REST API controllers & analytics
        │   ├── PdfController.java                # Apache PDFBox invoice generation
        │   └── DataLoader.java                   # Database seeders (mock items, bills, users)
        └── resources/
            ├── application.properties            # App & datasource configurations
            └── static/
                ├── index.html                    # Modern Tailwind CSS SPA UI
                ├── app.js                        # Client-side routing, POS, scanner & charts
                └── style.css                     # Custom styles & thermal print stylesheet
```

---

## 👩‍💻 Developed By

**Kavita Kirikiri**  
*Full Stack Java & Spring Boot Developer*  
[GitHub Profile](https://github.com/kavitakirikiri0-coder)
