const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const generateInvoicePDF = (invoice, business) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4' });
      const filename = `invoice-${invoice.invoiceNumber}.pdf`;
      const filepath = path.join(__dirname, '../pdfs', filename);

      // Ensure pdfs directory exists
      if (!fs.existsSync(path.join(__dirname, '../pdfs'))) {
        fs.mkdirSync(path.join(__dirname, '../pdfs'), { recursive: true });
      }

      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      // Header with business info
      doc
        .fontSize(24)
        .font('Helvetica-Bold')
        .text(business.businessName, { align: 'left' })
        .fontSize(10)
        .font('Helvetica')
        .text(business.businessEmail, 50, 40)
        .text('Invoice', 450, 50, { align: 'right' })
        .fontSize(12)
        .font('Helvetica-Bold');

      // Invoice details
      let yPosition = 100;
      doc.fontSize(10).font('Helvetica');
      doc.text(`Invoice #: ${invoice.invoiceNumber}`, 50, yPosition);
      doc.text(`Date: ${new Date(invoice.issueDate).toLocaleDateString()}`, 50, yPosition + 20);
      doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, 50, yPosition + 40);

      // Client info
      yPosition = 100;
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Bill To:', 300, yPosition)
        .font('Helvetica')
        .text(invoice.clientName, 300, yPosition + 20)
        .text(invoice.clientEmail, 300, yPosition + 40);

      // Items table
      yPosition = 200;
      const tableTop = yPosition;
      const col1 = 50;
      const col2 = 250;
      const col3 = 350;
      const col4 = 450;

      // Table header
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Description', col1, tableTop)
        .text('Qty', col2, tableTop)
        .text('Rate', col3, tableTop)
        .text('Amount', col4, tableTop);

      // Horizontal line
      doc
        .moveTo(col1, tableTop + 15)
        .lineTo(550, tableTop + 15)
        .stroke();

      // Items
      let itemY = tableTop + 25;
      let subtotal = 0;

      invoice.items.forEach((item) => {
        doc
          .fontSize(9)
          .font('Helvetica')
          .text(item.description, col1, itemY, { width: 200 })
          .text(item.quantity, col2, itemY)
          .text(`$${item.rate.toFixed(2)}`, col3, itemY)
          .text(`$${item.amount.toFixed(2)}`, col4, itemY);

        subtotal += item.amount;
        itemY += 25;
      });

      // Summary
      const summaryY = itemY + 20;
      doc
        .moveTo(col1, summaryY)
        .lineTo(550, summaryY)
        .stroke();

      doc
        .fontSize(10)
        .font('Helvetica')
        .text(`Subtotal:`, 350, summaryY + 10)
        .text(`$${invoice.subtotal.toFixed(2)}`, 450, summaryY + 10);

      if (invoice.tax > 0) {
        doc
          .text(`Tax:`, 350, summaryY + 30)
          .text(`$${invoice.tax.toFixed(2)}`, 450, summaryY + 30);
      }

      doc
        .text(`Payment Fee (3%):`, 350, summaryY + 50)
        .text(`$${invoice.paymentFee.toFixed(2)}`, 450, summaryY + 50);

      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(`Total:`, 350, summaryY + 70)
        .text(`$${invoice.totalWithFee.toFixed(2)}`, 450, summaryY + 70);

      // Notes
      if (invoice.notes) {
        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('Notes:', 50, summaryY + 120)
          .font('Helvetica')
          .text(invoice.notes, 50, summaryY + 140, { width: 500 });
      }

      // Footer
      doc
        .fontSize(8)
        .text('Thank you for your business!', 50, 750, { align: 'center' });

      // Finalize PDF
      doc.end();

      stream.on('finish', () => {
        resolve(filepath);
      });

      stream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { generateInvoicePDF };
