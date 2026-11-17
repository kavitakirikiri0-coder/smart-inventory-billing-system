# Step-by-step implementation guide

## Step 1 — Run the starter project
Import as an existing Maven project in Eclipse. Update `application.properties`, start MySQL, then run `InventoryBillingApplication`.

## Step 2 — Understand the package
- `Entities.java`: JPA entities mapped to MySQL tables.
- `Repositories.java`: database access interfaces.
- `ApiController.java`: REST endpoints and business logic.
- `SecurityConfig.java`: login/session and endpoint access rules.
- `PdfController.java`: PDF invoice generation.
- `src/main/resources/static`: frontend HTML, CSS and JavaScript.

## Step 3 — Test product CRUD
Login as admin. Add a product, edit it, search for it, and delete a test product. Use Postman if you want to test the REST APIs directly.

## Step 4 — Test low stock
Add a product with quantity 4 and minimum stock 5. It should appear in the low-stock dashboard list. Increase quantity above 5 and refresh.

## Step 5 — Test billing and stock deduction
Add a product with quantity 10 and price 25. Create a bill for 3 units. Confirm the bill total and check that stock becomes 7. Try selling 99 units; the API should reject the sale. The transaction protects the database from partial updates.

## Step 6 — Test PDF and sales reports
Open Sales History and click PDF. Check the dashboard totals after creating more bills.

## Step 7 — Explain the new features in viva
- Role-based access: ADMIN can manage data; STAFF can view products/dashboard and create bills.
- Supplier management: stores supplier contact details.
- Analytics: dashboard totals and a simple sales chart.
- PDF invoice: generates a downloadable sample invoice for each bill.
- Stock history: records sale-related quantity changes.
- Barcode field: product records can store a barcode value; camera scanning is a future enhancement.

## Suggested 10-day schedule
Day 1: Read requirements, sketch pages and understand tables.
Day 2: Configure Java, Eclipse, Maven and MySQL; run the project.
Day 3: Study and test Product entity, repository and CRUD APIs.
Day 4: Explore the dashboard and product UI; customize styling.
Day 5: Test low-stock alerts and stock validation.
Day 6: Test customers, suppliers, GST/discount calculations and bill transactions.
Day 7: Test PDF download and sales history.
Day 8: Test invalid inputs and role restrictions; fix bugs.
Day 9: Add screenshots and complete README/GitHub.
Day 10: Rehearse a 2–3 minute demo and viva explanation.

## If something fails
- MySQL access denied: check username/password in `application.properties`.
- Port 8080 busy: stop the other app or set `server.port=8081`.
- Maven dependencies missing: right-click project > Maven > Update Project.
- Lombok getters/setters show errors: install Lombok in Eclipse or use a Lombok-enabled IDE setup, then restart Eclipse.
- Login rejected: check the seeded demo username/password and confirm the app started without database errors.
