# Smart Inventory and Billing Management System

Beginner-friendly Spring Boot + MySQL project for the Thasmai Infotech 10-day assessment.

## Included features
- Session-based login with ADMIN and STAFF roles
- Product CRUD, product search and minimum-stock alerts
- Customer management
- Supplier management
- Billing with discount and configurable GST
- Stock deduction and stock-history entries in a database transaction
- Sales history, dashboard totals and Chart.js sales chart
- Downloadable multi-page PDF invoice
- Responsive HTML/CSS/JavaScript frontend

## Requirements
- JDK 21
- Eclipse IDE for Enterprise Java and Web Developers (or Spring Tool Suite)
- MySQL 8
- Maven (Eclipse can use the included Maven project support)

## 1. Create database / configure MySQL
The application creates the database if it does not exist. Open:
`src/main/resources/application.properties`
and replace `CHANGE_ME` with your MySQL root password. If your MySQL username differs, update that too.

## 2. Import into Eclipse
1. Extract the ZIP file.
2. Open Eclipse.
3. Choose **File > Import > Maven > Existing Maven Projects**.
4. Browse to the extracted `Smart-Inventory-Billing-System` folder.
5. Select `pom.xml`, then Finish.
6. Wait for Maven dependencies to download.
7. Right-click `InventoryBillingApplication.java` > **Run As > Java Application** (or Spring Boot App).

## 3. Open the application
Visit http://localhost:8080

Demo accounts:
- Admin: `admin` / `Admin@123`
- Staff: `staff` / `Staff@123`

Change demo passwords before any real deployment. This is an internship prototype, not a production-ready security setup.

## 4. Suggested demonstration
1. Login as admin.
2. Add a product with quantity 10 and minimum stock 3.
3. Add a customer and supplier.
4. Create a bill for 2 units of that product.
5. Verify product quantity becomes 8.
6. Download the invoice PDF.
7. Check sales history and dashboard.
8. Reduce stock to the minimum level and show the low-stock warning.

## API endpoints
| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user |
| GET/POST | `/api/products` | List / create products |
| PUT/DELETE | `/api/products/{id}` | Update / delete product |
| GET | `/api/products/low-stock` | Low-stock list |
| GET/POST | `/api/customers` | List / create customers |
| GET/POST | `/api/suppliers` | List / create suppliers |
| POST | `/api/bills` | Create bill and reduce stock |
| GET | `/api/bills` | Sales history |
| GET | `/api/bills/{id}/pdf` | Download invoice |
| GET | `/api/dashboard/summary` | Dashboard summary |

## Important implementation notes
- Hibernate `ddl-auto=update` creates/updates tables from entity classes.
- Billing is marked `@Transactional`: if validation fails during the sale, database changes are rolled back.
- GST is a configurable percentage entered on the billing screen. Confirm the applicable tax rules with your evaluator before presenting this as a real tax invoice.
- The PDF invoice uses a basic text layout, supports multiple pages, and is intended as a sample bill.
- Bill list and detail queries eagerly load bill items so sales history and invoice generation do not fail with lazy-loading errors during JSON/PDF handling.
- The login uses server-side sessions. CSRF is disabled for this local learning prototype; add CSRF protection, stronger account administration, HTTPS and secret management before production use.
- The dashboard chart uses Chart.js from a CDN, so internet access is needed for that chart.

## Suggested future improvements
- Barcode scanning with a USB scanner or browser camera library
- Supplier purchase orders and stock receiving
- Email invoice delivery
- Product expiry date alerts
- Sales returns and refund workflow
- Automated tests and deployment
