package com.kavita.inventorybilling;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/bills")
class PdfController {

    private static final int LINES_PER_PAGE = 34;
    private final BillRepository bills;

    PdfController(BillRepository bills) {
        this.bills = bills;
    }

    @GetMapping(value = "/{id}/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    @Transactional(readOnly = true)
    ResponseEntity<byte[]> pdf(@PathVariable Long id) throws Exception {
        Bill bill = bills.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bill not found"));

        List<String> lines = new ArrayList<>();
        lines.add("SMART INVENTORY - INVOICE");
        lines.add("Bill ID: " + bill.getId());
        lines.add("Date: " + bill.getCreatedAt());
        lines.add("Customer: " + safe(bill.getCustomerName()));
        lines.add("------------------------------------------------------------");
        lines.add("ITEMS");
        for (BillItem item : bill.getItems()) {
            lines.add(safe(item.getProductName()) + " | Qty: " + item.getQuantity()
                + " | Unit price: Rs. " + item.getUnitPrice()
                + " | Amount: Rs. " + item.getAmount());
        }
        lines.add("------------------------------------------------------------");
        lines.add("Subtotal: Rs. " + bill.getSubtotal());
        lines.add("Discount: Rs. " + bill.getDiscount());
        lines.add("GST (" + bill.getGstPercent() + "%): Rs. " + bill.getGstAmount());
        lines.add("TOTAL: Rs. " + bill.getTotal());
        lines.add("Thank you for your purchase!");

        try (PDDocument document = new PDDocument();
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            for (int start = 0; start < lines.size(); start += LINES_PER_PAGE) {
                PDPage page = new PDPage();
                document.addPage(page);
                try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                    int y = 750;
                    int end = Math.min(start + LINES_PER_PAGE, lines.size());
                    for (int i = start; i < end; i++) {
                        boolean heading = i == 0 || lines.get(i).startsWith("TOTAL:");
                        write(content, lines.get(i), 50, y, heading ? 14 : 10, heading);
                        y -= heading ? 28 : 20;
                    }
                }
            }
            document.save(output);
            return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=invoice-" + id + ".pdf")
                .body(output.toByteArray());
        }
    }

    private void write(PDPageContentStream content, String value, int x, int y,
                       int size, boolean bold) throws Exception {
        PDType1Font font = new PDType1Font(
            bold ? Standard14Fonts.FontName.HELVETICA_BOLD : Standard14Fonts.FontName.HELVETICA
        );
        content.beginText();
        content.setFont(font, size);
        content.newLineAtOffset(x, y);
        content.showText(safe(value));
        content.endText();
    }

    private String safe(String value) {
        if (value == null) {
            return "";
        }
        return value.replaceAll("[^\\x20-\\x7E]", "?");
    }
}
