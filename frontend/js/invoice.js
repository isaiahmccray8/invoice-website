/* invoice.js — placeholder
 * Referenced by dashboard.html. This file exists so the page stops 404ing
 * and gives you a place to add real invoice logic.
 *
 * Replace the stubbed functions below with your actual behavior. Everything
 * here is written defensively so it won't throw if an element is missing.
 */

(function () {
  "use strict";

  // Simple in-memory store (swap for a real backend/localStorage later).
  const invoices = [];

  // --- Helpers ---------------------------------------------------------------
  function $(id) {
    return document.getElementById(id);
  }

  function formatCurrency(amount) {
    const n = Number(amount) || 0;
    return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
  }

  // --- Core stubs ------------------------------------------------------------
  // Rename/adjust these to match what dashboard.html actually calls.

  function addInvoice(invoice) {
    invoices.push(invoice);
    renderInvoices();
  }

  function renderInvoices() {
    const list = $("invoiceList"); // change to your real container id
    if (!list) return; // no container on this page — do nothing
    list.innerHTML = "";
    invoices.forEach((inv, i) => {
      const row = document.createElement("div");
      row.className = "invoice-row";
      row.textContent =
        `#${i + 1} — ${inv.client || "Unnamed"} — ${formatCurrency(inv.amount)}`;
      list.appendChild(row);
    });
  }

  function total() {
    return invoices.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
  }

  // --- Expose a global so inline handlers in dashboard.html can find these ---
  window.Invoice = { addInvoice, renderInvoices, total, formatCurrency };

  // --- Init ------------------------------------------------------------------
  document.addEventListener("DOMContentLoaded", function () {
    console.log("invoice.js loaded");
    renderInvoices();
  });
})();