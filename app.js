/**
 * MEDICINE DUE & MONTHLY SHEET LEDGER - APPLICATION LOGIC
 * Features:
 * - Clean Medicine & Payment Tracking without Shop field
 * - 100% Pure English Interface & Standard English Taka Currency (Tk / BDT / $)
 * - Zero Initial Values Clean State
 * - Dedicated Monthly Sheet Navigator with Previous Due Carry-Forward (Opening Balance)
 * - Formula Ribbon: [Opening Due] + [Purchases] - [Payments] = [Closing Due]
 * - Medicine Purchase Tracking (Box, Strip, Piece unit calculator)
 * - Due & Monthly Payment Settlement Engine
 * - Chronological Running Balance with Month-Wise Opening Due Row
 * - Interactive Monthly Trend Chart
 * - Search, Filter, Print Statement, JSON Backup & Restore
 */

// ==========================================
// 1. STATE & STORAGE MANAGEMENT
// ==========================================
const STORAGE_KEY = "medicine_due_monthly_ledger_v6_clean";

const defaultState = {
  purchases: [],
  payments: [],
  settings: {
    currency: "Tk ",
    theme: "light"
  }
};

class MedicineApp {
  constructor() {
    this.state = this.loadState();
    
    // Set initial active month to Current Year-Month (e.g., "2026-08")
    const now = new Date();
    this.activeYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    this.viewMode = "month"; // "month" or "all"
    
    this.activeFilterType = "all";
    this.searchQuery = "";
    this.chartInstance = null;

    this.initDOM();
    this.initEvents();
    this.applyTheme(this.state.settings.theme || "light");
    this.render();
  }

  loadState() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (!parsed.settings.currency) parsed.settings.currency = "Tk ";
        return parsed;
      }
    } catch (e) {
      console.error("Failed to load state", e);
    }
    const cleanState = JSON.parse(JSON.stringify(defaultState));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanState));
    } catch (e) {}
    return cleanState;
  }

  saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error("Failed to save state", e);
    }
  }

  getCurrencySymbol() {
    return this.state.settings.currency || "Tk ";
  }

  // ==========================================
  // 2. DOM ELEMENT REFERENCES
  // ==========================================
  initDOM() {
    // Top Nav
    this.btnToggleTheme = document.getElementById("btn-toggle-theme");
    this.themeIcon = document.getElementById("theme-icon");
    this.btnDemoData = document.getElementById("btn-demo-data");
    this.btnOpenStatement = document.getElementById("btn-open-statement");
    this.btnOpenSettings = document.getElementById("btn-open-settings");

    // Month Sheet Navigator
    this.btnPrevMonth = document.getElementById("btn-prev-month");
    this.btnNextMonth = document.getElementById("btn-next-month");
    this.activeMonthTitle = document.getElementById("active-month-title");
    this.sheetStatusTag = document.getElementById("sheet-status-tag");
    this.btnModeMonth = document.getElementById("btn-mode-month");
    this.btnModeAll = document.getElementById("btn-mode-all");
    this.jumpMonthSelect = document.getElementById("jump-month-select");

    // Monthly Calculation Ribbon
    this.monthCalcRibbon = document.getElementById("month-calc-ribbon");
    this.ribbonOpeningDue = document.getElementById("ribbon-opening-due");
    this.ribbonMonthPurchases = document.getElementById("ribbon-month-purchases");
    this.ribbonPurchaseUnits = document.getElementById("ribbon-purchase-units");
    this.ribbonMonthPayments = document.getElementById("ribbon-month-payments");
    this.ribbonPaymentCount = document.getElementById("ribbon-payment-count");
    this.ribbonClosingDue = document.getElementById("ribbon-closing-due");
    this.ribbonClosingDesc = document.getElementById("ribbon-closing-desc");

    // Action Banner & Metrics
    this.btnAddMedicine = document.getElementById("btn-add-medicine");
    this.btnAddPayment = document.getElementById("btn-add-payment");
    this.allTimeDueVal = document.getElementById("all-time-due-val");

    // Analytics
    this.btnToggleChart = document.getElementById("btn-toggle-chart");
    this.chartContainerBody = document.getElementById("chart-container-body");
    this.chartToggleIcon = document.getElementById("chart-toggle-icon");

    // Ledger Section
    this.ledgerSectionHeading = document.getElementById("ledger-section-heading");
    this.ledgerSectionSub = document.getElementById("ledger-section-sub");
    this.ledgerTotalCount = document.getElementById("ledger-total-count");
    this.tabPills = document.querySelectorAll(".tab-pill");
    this.ledgerSearchInput = document.getElementById("ledger-search-input");
    this.btnClearSearch = document.getElementById("btn-clear-search");
    this.ledgerTbody = document.getElementById("ledger-tbody");
    this.emptyStateView = document.getElementById("empty-state-view");
    this.emptyStateHeading = document.getElementById("empty-state-heading");

    // Table Footer
    this.footerSumOpening = document.getElementById("footer-sum-opening");
    this.footerSumDebit = document.getElementById("footer-sum-debit");
    this.footerSumCredit = document.getElementById("footer-sum-credit");
    this.footerSumBalance = document.getElementById("footer-sum-balance");

    // Medicine Modal
    this.modalMedicine = document.getElementById("modal-medicine");
    this.formMedicine = document.getElementById("form-medicine");
    this.medicineEditId = document.getElementById("medicine-edit-id");
    this.medNameInput = document.getElementById("med-name");
    this.medDateInput = document.getElementById("med-date");
    this.medQtyInput = document.getElementById("med-qty");
    this.medUnitPriceInput = document.getElementById("med-unit-price");
    this.medTotalPriceInput = document.getElementById("med-total-price");
    this.medNotesInput = document.getElementById("med-notes");
    this.calcFormulaText = document.getElementById("calc-formula-text");
    this.quickMedicineChips = document.getElementById("quick-medicine-chips");

    // Payment Modal
    this.modalPayment = document.getElementById("modal-payment");
    this.formPayment = document.getElementById("form-payment");
    this.paymentEditId = document.getElementById("payment-edit-id");
    this.paymentModalDueVal = document.getElementById("payment-modal-due-val");
    this.btnPayFullDue = document.getElementById("btn-pay-full-due");
    this.payAmountInput = document.getElementById("pay-amount");
    this.payDateInput = document.getElementById("pay-date");
    this.payMethodSelect = document.getElementById("pay-method");
    this.payNotesInput = document.getElementById("pay-notes");
    this.projectedDueVal = document.getElementById("projected-due-val");

    // Statement Modal
    this.modalStatement = document.getElementById("modal-statement");
    this.btnPrintStatement = document.getElementById("btn-print-statement");
    this.btnPrintStatementBottom = document.getElementById("btn-print-statement-bottom");
    this.printGeneratedDate = document.getElementById("print-generated-date");
    this.printPeriodRange = document.getElementById("print-period-range");
    this.printOpeningDue = document.getElementById("print-opening-due");
    this.printTotalPurchases = document.getElementById("print-total-purchases");
    this.printTotalPaid = document.getElementById("print-total-paid");
    this.printTotalDue = document.getElementById("print-total-due");
    this.printTableTbody = document.getElementById("print-table-tbody");

    // Settings Modal
    this.modalSettings = document.getElementById("modal-settings");
    this.settingsCurrencySelect = document.getElementById("settings-currency-select");
    this.btnSaveShopName = document.getElementById("btn-save-shop-name");
    this.btnExportBackup = document.getElementById("btn-export-backup");
    this.btnTriggerImport = document.getElementById("btn-trigger-import");
    this.inputImportBackup = document.getElementById("input-import-backup");
    this.btnClearAllData = document.getElementById("btn-clear-all-data");

    this.toastContainer = document.getElementById("toast-container");
  }

  // ==========================================
  // 3. EVENT LISTENERS
  // ==========================================
  initEvents() {
    // Theme Toggle
    this.btnToggleTheme.addEventListener("click", () => {
      const nextTheme = this.state.settings.theme === "dark" ? "light" : "dark";
      this.state.settings.theme = nextTheme;
      this.saveState();
      this.applyTheme(nextTheme);
      this.renderChart();
    });

    // Month Navigation Controls
    this.btnPrevMonth.addEventListener("click", () => this.navigateMonth(-1));
    this.btnNextMonth.addEventListener("click", () => this.navigateMonth(1));
    this.jumpMonthSelect.addEventListener("change", (e) => {
      this.activeYearMonth = e.target.value;
      this.viewMode = "month";
      this.render();
    });

    // View Mode Toggle
    this.btnModeMonth.addEventListener("click", () => {
      this.viewMode = "month";
      this.btnModeMonth.classList.add("active");
      this.btnModeAll.classList.remove("active");
      this.render();
    });

    this.btnModeAll.addEventListener("click", () => {
      this.viewMode = "all";
      this.btnModeAll.classList.add("active");
      this.btnModeMonth.classList.remove("active");
      this.render();
    });

    // Demo Data
    this.btnDemoData.addEventListener("click", () => {
      if (this.state.purchases.length > 0 || this.state.payments.length > 0) {
        if (confirm("Load sample records? This will add demonstration data to your ledger.")) {
          this.loadDemoData();
        }
      } else {
        this.loadDemoData();
      }
    });

    // Modal Triggers
    this.btnAddMedicine.addEventListener("click", () => this.openMedicineModal());
    this.btnAddPayment.addEventListener("click", () => this.openPaymentModal());
    this.btnOpenStatement.addEventListener("click", () => this.openStatementModal());
    this.btnOpenSettings.addEventListener("click", () => this.openSettingsModal());

    // Modal Close
    document.querySelectorAll("[data-close-modal]").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".modal-overlay").forEach(m => m.classList.remove("active"));
      });
    });

    document.querySelectorAll(".modal-overlay").forEach(modal => {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.classList.remove("active");
      });
    });

    // Quick Medicine Chips click
    this.quickMedicineChips.addEventListener("click", (e) => {
      if (e.target.classList.contains("chip-btn")) {
        this.medNameInput.value = e.target.getAttribute("data-name");
        this.medQtyInput.focus();
      }
    });

    // Auto calculation
    document.querySelectorAll("input[name='med-unit']").forEach(radio => {
      radio.addEventListener("change", () => this.recalcMedicineTotal());
    });
    this.medQtyInput.addEventListener("input", () => this.recalcMedicineTotal());
    this.medUnitPriceInput.addEventListener("input", () => this.recalcMedicineTotal());
    this.medTotalPriceInput.addEventListener("input", () => {
      const qty = parseFloat(this.medQtyInput.value) || 1;
      const total = parseFloat(this.medTotalPriceInput.value) || 0;
      if (qty > 0) {
        this.medUnitPriceInput.value = (total / qty).toFixed(2);
      }
      this.updateCalcFormula();
    });

    this.formMedicine.addEventListener("submit", (e) => {
      e.preventDefault();
      this.saveMedicineEntry();
    });

    // Payment auto-calculation
    this.payAmountInput.addEventListener("input", () => this.recalcPaymentProjectedDue());
    this.btnPayFullDue.addEventListener("click", () => {
      const due = this.computeTotalOutstandingDue();
      if (due > 0) {
        this.payAmountInput.value = due.toFixed(2);
        this.recalcPaymentProjectedDue();
      }
    });

    document.querySelectorAll(".preset-pill").forEach(btn => {
      btn.addEventListener("click", () => {
        this.payAmountInput.value = btn.getAttribute("data-amount");
        this.recalcPaymentProjectedDue();
      });
    });

    this.formPayment.addEventListener("submit", (e) => {
      e.preventDefault();
      this.savePaymentEntry();
    });

    // Tabs & Search
    this.tabPills.forEach(pill => {
      pill.addEventListener("click", () => {
        this.tabPills.forEach(p => p.classList.remove("active"));
        pill.classList.add("active");
        this.activeFilterType = pill.getAttribute("data-filter");
        this.renderLedgerTable();
      });
    });

    this.ledgerSearchInput.addEventListener("input", (e) => {
      this.searchQuery = e.target.value.trim().toLowerCase();
      this.btnClearSearch.classList.toggle("hidden", !this.searchQuery);
      this.renderLedgerTable();
    });

    this.btnClearSearch.addEventListener("click", () => {
      this.ledgerSearchInput.value = "";
      this.searchQuery = "";
      this.btnClearSearch.classList.add("hidden");
      this.renderLedgerTable();
    });

    // Toggle Chart
    this.btnToggleChart.addEventListener("click", () => {
      const isCollapsed = this.chartContainerBody.classList.toggle("collapsed");
      this.chartToggleIcon.className = isCollapsed ? "fa-solid fa-chevron-down" : "fa-solid fa-chevron-up";
    });

    // Print & Settings
    this.btnPrintStatement.addEventListener("click", () => window.print());
    this.btnPrintStatementBottom.addEventListener("click", () => window.print());

    this.btnSaveShopName.addEventListener("click", () => {
      const currVal = this.settingsCurrencySelect.value;
      if (currVal) this.state.settings.currency = currVal;
      
      this.saveState();
      this.modalSettings.classList.remove("active");
      this.render();
      this.showToast("Settings saved successfully!", "success");
    });

    this.btnExportBackup.addEventListener("click", () => this.exportBackupJSON());
    this.btnTriggerImport.addEventListener("click", () => this.inputImportBackup.click());
    this.inputImportBackup.addEventListener("change", (e) => this.importBackupJSON(e));
    this.btnClearAllData.addEventListener("click", () => {
      if (confirm("Are you sure you want to reset all ledger records to 0?")) {
        this.state.purchases = [];
        this.state.payments = [];
        this.saveState();
        this.modalSettings.classList.remove("active");
        this.render();
        this.showToast("All records reset to 0!", "info");
      }
    });
  }

  // ==========================================
  // 4. MONTH NAVIGATION HELPERS
  // ==========================================
  navigateMonth(offset) {
    const [y, m] = this.activeYearMonth.split("-").map(Number);
    const d = new Date(y, m - 1 + offset, 1);
    this.activeYearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    this.viewMode = "month";
    this.btnModeMonth.classList.add("active");
    this.btnModeAll.classList.remove("active");
    this.render();
  }

  getMonthFormattedName(yearMonth) {
    const [y, m] = yearMonth.split("-").map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString("en-US", { month: 'long', year: 'numeric' });
  }

  // ==========================================
  // 5. CARRY-FORWARD CALCULATION ENGINE
  // ==========================================
  computeOpeningDue(yearMonth) {
    const monthStartISO = `${yearMonth}-01T00:00:00`;

    const priorPurchases = this.state.purchases
      .filter(p => p.date && p.date < monthStartISO)
      .reduce((sum, p) => sum + (Number(p.totalPrice) || 0), 0);

    const priorPayments = this.state.payments
      .filter(pay => pay.date && pay.date < monthStartISO)
      .reduce((sum, pay) => sum + (Number(pay.amount) || 0), 0);

    return Math.max(0, priorPurchases - priorPayments);
  }

  getMonthSheetData(yearMonth) {
    const openingDue = this.computeOpeningDue(yearMonth);
    const monthItems = [];

    // Filter purchases in this month
    this.state.purchases.forEach(p => {
      if (p.date && p.date.startsWith(yearMonth)) {
        monthItems.push({
          id: p.id,
          type: "purchase",
          date: p.date,
          name: p.name,
          unitType: p.unitType || "box",
          quantity: Number(p.quantity) || 1,
          unitPrice: Number(p.unitPrice) || 0,
          amount: Number(p.totalPrice) || 0,
          note: p.note || "",
          rawItem: p
        });
      }
    });

    // Filter payments in this month
    this.state.payments.forEach(pay => {
      if (pay.date && pay.date.startsWith(yearMonth)) {
        monthItems.push({
          id: pay.id,
          type: "payment",
          date: pay.date,
          name: `Payment Deposit (${pay.method || "Cash"})`,
          unitType: null,
          quantity: null,
          unitPrice: null,
          amount: Number(pay.amount) || 0,
          method: pay.method || "Cash",
          note: pay.note || "",
          rawItem: pay
        });
      }
    });

    // Sort ascending by date
    monthItems.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate running balance starting with openingDue
    let runningBalance = openingDue;
    monthItems.forEach(item => {
      if (item.type === "purchase") {
        runningBalance += item.amount;
      } else if (item.type === "payment") {
        runningBalance -= item.amount;
      }
      item.runningBalance = runningBalance;
    });

    const monthPurchases = monthItems.filter(i => i.type === "purchase").reduce((sum, i) => sum + i.amount, 0);
    const monthPayments = monthItems.filter(i => i.type === "payment").reduce((sum, i) => sum + i.amount, 0);
    const closingDue = Math.max(0, openingDue + monthPurchases - monthPayments);

    return {
      openingDue,
      monthPurchases,
      monthPayments,
      closingDue,
      items: monthItems
    };
  }

  computeTotalOutstandingDue() {
    const totalPurchases = this.state.purchases.reduce((acc, p) => acc + (Number(p.totalPrice) || 0), 0);
    const totalPaid = this.state.payments.reduce((acc, pay) => acc + (Number(pay.amount) || 0), 0);
    return Math.max(0, totalPurchases - totalPaid);
  }

  // ==========================================
  // 6. RENDER DASHBOARD & MONTH SHEET
  // ==========================================
  render() {
    const curr = this.getCurrencySymbol();
    
    // Update currency signs across static headers
    document.querySelectorAll(".currency-sign").forEach(el => el.textContent = curr.trim());
    const prefixMed = document.getElementById("currency-prefix-med");
    if (prefixMed) prefixMed.textContent = curr.trim();
    const prefixPay = document.getElementById("currency-prefix-pay");
    if (prefixPay) prefixPay.textContent = curr.trim();
    document.querySelectorAll(".currency-prefix-inline").forEach(el => el.textContent = curr);

    this.populateJumpMonthDropdown();

    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const isCurrentMonth = this.activeYearMonth === currentYearMonth;

    // Update Month Display
    this.activeMonthTitle.textContent = this.getMonthFormattedName(this.activeYearMonth);
    this.sheetStatusTag.textContent = isCurrentMonth 
      ? "Current Month" 
      : (this.activeYearMonth < currentYearMonth ? "Past Month" : "Future Month");

    // Calculate Month Financials
    const monthData = this.getMonthSheetData(this.activeYearMonth);
    const allTimeDue = this.computeTotalOutstandingDue();

    // Update Ribbon Metrics
    this.ribbonOpeningDue.textContent = this.formatCurrency(monthData.openingDue);
    this.ribbonMonthPurchases.textContent = this.formatCurrency(monthData.monthPurchases);
    this.ribbonMonthPayments.textContent = this.formatCurrency(monthData.monthPayments);
    this.ribbonClosingDue.textContent = this.formatCurrency(monthData.closingDue);
    this.allTimeDueVal.textContent = `${curr}${this.formatCurrency(allTimeDue)}`;

    // Ribbon Breakdown Counts
    const monthPurchasesCount = this.state.purchases.filter(p => p.date && p.date.startsWith(this.activeYearMonth)).length;
    const monthPaymentsCount = this.state.payments.filter(pay => pay.date && pay.date.startsWith(this.activeYearMonth)).length;

    this.ribbonPurchaseUnits.textContent = `${monthPurchasesCount} purchases`;
    this.ribbonPaymentCount.textContent = `${monthPaymentsCount} payments made`;

    // Update Headings
    if (this.viewMode === "month") {
      this.ledgerSectionHeading.textContent = `${this.getMonthFormattedName(this.activeYearMonth)} Ledger Sheet`;
      this.ledgerSectionSub.textContent = "Itemized transactions with previous month due carry-forward";
      this.emptyStateHeading.textContent = "No records for this month!";
    } else {
      this.ledgerSectionHeading.textContent = "All-Time Full Ledger";
      this.ledgerSectionSub.textContent = "Complete transaction history since inception";
      this.emptyStateHeading.textContent = "No records found!";
    }

    this.renderLedgerTable();
    this.renderChart();
  }

  populateJumpMonthDropdown() {
    const monthsSet = new Set();
    const now = new Date();
    monthsSet.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);

    this.state.purchases.forEach(p => p.date && monthsSet.add(p.date.substring(0, 7)));
    this.state.payments.forEach(pay => p.date && monthsSet.add(p.date.substring(0, 7)));

    const sortedMonths = Array.from(monthsSet).sort().reverse();
    this.jumpMonthSelect.innerHTML = "";

    sortedMonths.forEach(mKey => {
      const option = document.createElement("option");
      option.value = mKey;
      option.textContent = this.getMonthFormattedName(mKey);
      if (mKey === this.activeYearMonth) option.selected = true;
      this.jumpMonthSelect.appendChild(option);
    });
  }

  // ==========================================
  // 7. RENDER LEDGER TABLE WITH OPENING DUE ROW
  // ==========================================
  renderLedgerTable() {
    const curr = this.getCurrencySymbol();
    let listToRender = [];
    let openingDue = 0;
    let monthPurchases = 0;
    let monthPayments = 0;
    let closingDue = 0;

    if (this.viewMode === "month") {
      const monthData = this.getMonthSheetData(this.activeYearMonth);
      openingDue = monthData.openingDue;
      monthPurchases = monthData.monthPurchases;
      monthPayments = monthData.monthPayments;
      closingDue = monthData.closingDue;
      listToRender = [...monthData.items];
    } else {
      // All-Time Unified
      const allItems = [];
      this.state.purchases.forEach(p => {
        allItems.push({
          id: p.id,
          type: "purchase",
          date: p.date,
          name: p.name,
          unitType: p.unitType || "box",
          quantity: Number(p.quantity) || 1,
          unitPrice: Number(p.unitPrice) || 0,
          amount: Number(p.totalPrice) || 0,
          note: p.note || ""
        });
      });
      this.state.payments.forEach(pay => {
        allItems.push({
          id: pay.id,
          type: "payment",
          date: pay.date,
          name: `Payment Deposit (${pay.method || "Cash"})`,
          unitType: null,
          quantity: null,
          unitPrice: null,
          amount: Number(pay.amount) || 0,
          method: pay.method || "Cash",
          note: pay.note || ""
        });
      });
      allItems.sort((a, b) => new Date(a.date) - new Date(b.date));
      let rBal = 0;
      allItems.forEach(i => {
        if (i.type === "purchase") rBal += i.amount;
        else rBal -= i.amount;
        i.runningBalance = rBal;
      });
      listToRender = allItems;
      openingDue = 0;
      monthPurchases = allItems.filter(i => i.type === "purchase").reduce((s, i) => s + i.amount, 0);
      monthPayments = allItems.filter(i => i.type === "payment").reduce((s, i) => s + i.amount, 0);
      closingDue = Math.max(0, monthPurchases - monthPayments);
    }

    // Apply Filter Type
    if (this.activeFilterType === "purchase") {
      listToRender = listToRender.filter(i => i.type === "purchase");
    } else if (this.activeFilterType === "payment") {
      listToRender = listToRender.filter(i => i.type === "payment");
    }

    // Apply Search
    if (this.searchQuery) {
      listToRender = listToRender.filter(item => {
        const nameMatch = (item.name || "").toLowerCase().includes(this.searchQuery);
        const noteMatch = (item.note || "").toLowerCase().includes(this.searchQuery);
        return nameMatch || noteMatch;
      });
    }

    this.ledgerTotalCount.textContent = listToRender.length;

    // Check if empty
    if (listToRender.length === 0 && (this.viewMode !== "month" || openingDue === 0)) {
      this.ledgerTbody.innerHTML = "";
      this.emptyStateView.classList.remove("hidden");
      this.footerSumOpening.textContent = `${curr}0.00`;
      this.footerSumDebit.textContent = `${curr}0.00`;
      this.footerSumCredit.textContent = `${curr}0.00`;
      this.footerSumBalance.textContent = `${curr}0.00`;
      return;
    }

    this.emptyStateView.classList.add("hidden");

    let tableHtml = "";

    // 1. In Monthly Sheet View, if Opening Due > 0, show Row 1
    if (this.viewMode === "month" && openingDue > 0 && (this.activeFilterType === "all" || this.activeFilterType === "purchase")) {
      const [y, m] = this.activeYearMonth.split("-");
      tableHtml += `
        <tr class="tr-opening-due">
          <td class="th-date">
            <i class="fa-solid fa-clock-rotate-left text-amber"></i> ${m}/01/${y}
          </td>
          <td class="th-type">
            <span class="badge-opening-due"><i class="fa-solid fa-backward"></i> Opening Due</span>
          </td>
          <td class="th-details">
            <div class="item-main-title text-amber">Balance Brought Forward (Previous Month Due)</div>
            <div class="item-sub-desc">Balance carried forward from prior month</div>
          </td>
          <td class="th-debit text-right">
            <strong class="text-amber">+${curr}${this.formatCurrency(openingDue)}</strong>
          </td>
          <td class="th-credit text-right text-muted">-</td>
          <td class="th-balance text-right">
            <strong class="text-amber">${curr}${this.formatCurrency(openingDue)}</strong>
          </td>
          <td class="th-action text-center text-muted"><i class="fa-solid fa-lock" title="Auto Opening Due"></i></td>
        </tr>
      `;
    }

    // 2. Render Transactions
    listToRender.forEach(item => {
      const isPurchase = item.type === "purchase";
      let typeBadge = "";
      let detailsHtml = "";

      if (isPurchase) {
        typeBadge = `<span class="badge-type purchase"><i class="fa-solid fa-cart-shopping"></i> Purchase</span>`;
        let unitText = "Box";
        if (item.unitType === "strip") unitText = "Strip";
        if (item.unitType === "piece") unitText = "Piece";

        detailsHtml = `
          <div class="item-main-title">${this.escapeHTML(item.name)}</div>
          <div class="item-sub-desc">
            <span class="item-pill-unit"><i class="fa-solid fa-box-open"></i> ${item.quantity} ${unitText}</span>
            ${item.unitPrice > 0 ? `<span>@ ${curr}${this.formatCurrency(item.unitPrice)}</span>` : ''}
          </div>
          ${item.note ? `<div class="item-notes"><i class="fa-regular fa-note-sticky"></i> ${this.escapeHTML(item.note)}</div>` : ''}
        `;
      } else {
        typeBadge = `<span class="badge-type payment"><i class="fa-solid fa-money-bill-wave"></i> Payment</span>`;
        detailsHtml = `
          <div class="item-main-title">${this.escapeHTML(item.name)}</div>
          <div class="item-sub-desc text-success">
            <span><i class="fa-regular fa-circle-check"></i> ${item.method || "Cash"}</span>
          </div>
          ${item.note ? `<div class="item-notes"><i class="fa-regular fa-note-sticky"></i> ${this.escapeHTML(item.note)}</div>` : ''}
        `;
      }

      const balanceClass = item.runningBalance > 0 ? "balance-val positive" : "balance-val settled";

      tableHtml += `
        <tr>
          <td class="th-date">
            <i class="fa-regular fa-clock text-muted"></i> ${this.formatDateString(item.date)}
          </td>
          <td class="th-type">${typeBadge}</td>
          <td class="th-details">${detailsHtml}</td>
          <td class="th-debit text-right">
            ${isPurchase ? `<span class="debit-val">+${curr}${this.formatCurrency(item.amount)}</span>` : '<span class="text-muted">-</span>'}
          </td>
          <td class="th-credit text-right">
            ${!isPurchase ? `<span class="credit-val">-${curr}${this.formatCurrency(item.amount)}</span>` : '<span class="text-muted">-</span>'}
          </td>
          <td class="th-balance text-right">
            <span class="${balanceClass}">${curr}${this.formatCurrency(item.runningBalance)}</span>
          </td>
          <td class="th-action text-center">
            <div class="action-btn-group">
              <button class="action-btn edit" onclick="app.editEntry('${item.type}', '${item.id}')" title="Edit">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button class="action-btn delete" onclick="app.deleteEntry('${item.type}', '${item.id}')" title="Delete">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    });

    this.ledgerTbody.innerHTML = tableHtml;

    // Update Footer Summary
    this.footerSumOpening.textContent = `${curr}${this.formatCurrency(openingDue)}`;
    this.footerSumDebit.textContent = `${curr}${this.formatCurrency(monthPurchases)}`;
    this.footerSumCredit.textContent = `${curr}${this.formatCurrency(monthPayments)}`;
    this.footerSumBalance.textContent = `${curr}${this.formatCurrency(closingDue)}`;
  }

  // ==========================================
  // 8. CHART.JS VISUAL TRENDS
  // ==========================================
  renderChart() {
    const canvas = document.getElementById("monthlyTrendChart");
    if (!canvas) return;

    const curr = this.getCurrencySymbol().trim();
    const monthMap = {};
    const [actY, actM] = this.activeYearMonth.split("-").map(Number);
    const centerDate = new Date(actY, actM - 1, 1);

    for (let i = 4; i >= 0; i--) {
      const d = new Date(centerDate.getFullYear(), centerDate.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString("en-US", { month: 'short', year: 'numeric' });
      monthMap[key] = { label, purchase: 0, payment: 0 };
    }

    this.state.purchases.forEach(p => {
      const k = (p.date || "").substring(0, 7);
      if (monthMap[k]) monthMap[k].purchase += Number(p.totalPrice) || 0;
    });

    this.state.payments.forEach(pay => {
      const k = (pay.date || "").substring(0, 7);
      if (monthMap[k]) monthMap[k].payment += Number(pay.amount) || 0;
    });

    const labels = Object.values(monthMap).map(m => m.label);
    const purchaseData = Object.values(monthMap).map(m => m.purchase);
    const paymentData = Object.values(monthMap).map(m => m.payment);

    const isDark = this.state.settings.theme === "dark";
    const textColor = isDark ? "#cbd5e1" : "#475569";
    const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

    if (this.chartInstance) {
      this.chartInstance.destroy();
    }

    this.chartInstance = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: `Purchases (${curr})`,
            data: purchaseData,
            backgroundColor: 'rgba(225, 29, 72, 0.75)',
            borderColor: '#e11d48',
            borderWidth: 1.5,
            borderRadius: 6
          },
          {
            label: `Payments (${curr})`,
            data: paymentData,
            backgroundColor: 'rgba(16, 185, 129, 0.75)',
            borderColor: '#10b981',
            borderWidth: 1.5,
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { color: textColor, font: { family: 'inherit', weight: 600 } }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${curr} ${ctx.parsed.y.toLocaleString()}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: textColor, font: { family: 'inherit' } }
          },
          y: {
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              callback: (val) => `${curr} ` + val.toLocaleString()
            }
          }
        }
      }
    });
  }

  // ==========================================
  // 9. MEDICINE MODAL ACTIONS
  // ==========================================
  openMedicineModal(editItem = null) {
    this.formMedicine.reset();
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(now - offset)).toISOString().slice(0, 16);

    if (editItem) {
      document.getElementById("modal-medicine-title").textContent = "Edit Medicine Entry";
      this.medicineEditId.value = editItem.id;
      this.medNameInput.value = editItem.name;
      this.medDateInput.value = editItem.date ? editItem.date.slice(0, 16) : localISOTime;
      
      const unitRadio = document.querySelector(`input[name='med-unit'][value='${editItem.unitType || "box"}']`);
      if (unitRadio) unitRadio.checked = true;

      this.medQtyInput.value = editItem.quantity || 1;
      this.medUnitPriceInput.value = editItem.unitPrice || 0;
      this.medTotalPriceInput.value = editItem.totalPrice || 0;
      this.medNotesInput.value = editItem.note || "";
    } else {
      document.getElementById("modal-medicine-title").textContent = "Add Medicine Purchase (On Credit)";
      this.medicineEditId.value = "";
      
      const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      if (this.activeYearMonth === currentYM) {
        this.medDateInput.value = localISOTime;
      } else {
        this.medDateInput.value = `${this.activeYearMonth}-15T12:00`;
      }

      this.medQtyInput.value = 1;
      this.medUnitPriceInput.value = "";
      this.medTotalPriceInput.value = "";
      const defaultRadio = document.querySelector("input[name='med-unit'][value='box']");
      if (defaultRadio) defaultRadio.checked = true;
    }

    this.updateCalcFormula();
    this.modalMedicine.classList.add("active");
    this.medNameInput.focus();
  }

  recalcMedicineTotal() {
    const qty = parseFloat(this.medQtyInput.value) || 0;
    const unitPrice = parseFloat(this.medUnitPriceInput.value) || 0;

    if (unitPrice > 0 && qty > 0) {
      const total = qty * unitPrice;
      this.medTotalPriceInput.value = total.toFixed(2);
    }
    this.updateCalcFormula();
  }

  updateCalcFormula() {
    const curr = this.getCurrencySymbol();
    const qty = parseFloat(this.medQtyInput.value) || 1;
    const unitType = (document.querySelector("input[name='med-unit']:checked") || {}).value || "box";
    const total = parseFloat(this.medTotalPriceInput.value) || 0;
    const unitPrice = parseFloat(this.medUnitPriceInput.value) || 0;

    let unitName = "Box";
    if (unitType === "strip") unitName = "Strip";
    if (unitType === "piece") unitName = "Piece";

    if (unitPrice > 0) {
      this.calcFormulaText.textContent = `Calc: ${qty} ${unitName} × ${curr}${this.formatCurrency(unitPrice)} = ${curr}${this.formatCurrency(total)}`;
    } else {
      this.calcFormulaText.textContent = `Total: ${qty} ${unitName} = ${curr}${this.formatCurrency(total)}`;
    }
  }

  saveMedicineEntry() {
    const id = this.medicineEditId.value || "med_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4);
    const name = this.medNameInput.value.trim();
    const date = this.medDateInput.value || new Date().toISOString();
    const unitType = document.querySelector("input[name='med-unit']:checked").value;
    const quantity = parseFloat(this.medQtyInput.value) || 1;
    const unitPrice = parseFloat(this.medUnitPriceInput.value) || 0;
    const totalPrice = parseFloat(this.medTotalPriceInput.value) || 0;
    const note = this.medNotesInput.value.trim();

    if (!name || totalPrice <= 0) {
      alert("Please enter a valid medicine name and price.");
      return;
    }

    const newRecord = { id, name, date, unitType, quantity, unitPrice, totalPrice, note };

    const editIndex = this.state.purchases.findIndex(p => p.id === id);
    if (editIndex >= 0) {
      this.state.purchases[editIndex] = newRecord;
      this.showToast("Entry updated successfully!", "success");
    } else {
      this.state.purchases.push(newRecord);
      this.showToast("Entry saved successfully!", "success");
    }

    this.saveState();
    this.modalMedicine.classList.remove("active");
    this.render();
  }

  // ==========================================
  // 10. PAYMENT MODAL ACTIONS
  // ==========================================
  openPaymentModal(editItem = null) {
    const curr = this.getCurrencySymbol();
    this.formPayment.reset();
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(now - offset)).toISOString().slice(0, 16);
    const monthData = this.getMonthSheetData(this.activeYearMonth);

    this.paymentModalDueVal.textContent = this.formatCurrency(monthData.closingDue > 0 ? monthData.closingDue : this.computeTotalOutstandingDue());

    if (editItem) {
      this.paymentEditId.value = editItem.id;
      this.payAmountInput.value = editItem.amount;
      this.payDateInput.value = editItem.date ? editItem.date.slice(0, 16) : localISOTime;
      this.payMethodSelect.value = editItem.method || "Cash";
      this.payNotesInput.value = editItem.note || "";
    } else {
      this.paymentEditId.value = "";
      
      const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      if (this.activeYearMonth === currentYM) {
        this.payDateInput.value = localISOTime;
      } else {
        this.payDateInput.value = `${this.activeYearMonth}-28T18:00`;
      }

      this.payAmountInput.value = "";
    }

    this.recalcPaymentProjectedDue();
    this.modalPayment.classList.add("active");
    this.payAmountInput.focus();
  }

  recalcPaymentProjectedDue() {
    const curr = this.getCurrencySymbol();
    const totalDue = this.computeTotalOutstandingDue();
    const payAmount = parseFloat(this.payAmountInput.value) || 0;
    const remaining = Math.max(0, totalDue - payAmount);
    this.projectedDueVal.textContent = `${curr}${this.formatCurrency(remaining)}`;
    this.projectedDueVal.className = remaining > 0 ? "text-danger text-bold" : "text-success text-bold";
  }

  savePaymentEntry() {
    const id = this.paymentEditId.value || "pay_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4);
    const amount = parseFloat(this.payAmountInput.value) || 0;
    const date = this.payDateInput.value || new Date().toISOString();
    const method = this.payMethodSelect.value;
    const note = this.payNotesInput.value.trim();

    if (amount <= 0) {
      alert("Please enter a valid payment amount.");
      return;
    }

    const newPayment = { id, amount, date, method, note };

    const editIndex = this.state.payments.findIndex(p => p.id === id);
    if (editIndex >= 0) {
      this.state.payments[editIndex] = newPayment;
      this.showToast("Payment updated successfully!", "success");
    } else {
      this.state.payments.push(newPayment);
      this.showToast("Payment saved successfully!", "success");
    }

    this.saveState();
    this.modalPayment.classList.remove("active");
    this.render();
  }

  // ==========================================
  // 11. EDIT & DELETE ACTIONS
  // ==========================================
  editEntry(type, id) {
    if (type === "purchase") {
      const item = this.state.purchases.find(p => p.id === id);
      if (item) this.openMedicineModal(item);
    } else if (type === "payment") {
      const item = this.state.payments.find(p => p.id === id);
      if (item) this.openPaymentModal(item);
    }
  }

  deleteEntry(type, id) {
    if (confirm("Are you sure you want to delete this record?")) {
      if (type === "purchase") {
        this.state.purchases = this.state.purchases.filter(p => p.id !== id);
      } else if (type === "payment") {
        this.state.payments = this.state.payments.filter(p => p.id !== id);
      }
      this.saveState();
      this.render();
      this.showToast("Record deleted successfully!", "info");
    }
  }

  // ==========================================
  // 12. STATEMENT & PRINT MODAL
  // ==========================================
  openStatementModal() {
    const curr = this.getCurrencySymbol();
    const monthData = this.getMonthSheetData(this.activeYearMonth);
    this.printGeneratedDate.textContent = new Date().toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' });
    this.printPeriodRange.textContent = this.getMonthFormattedName(this.activeYearMonth);

    this.printOpeningDue.textContent = `${curr}${this.formatCurrency(monthData.openingDue)}`;
    this.printTotalPurchases.textContent = `${curr}${this.formatCurrency(monthData.monthPurchases)}`;
    this.printTotalPaid.textContent = `${curr}${this.formatCurrency(monthData.monthPayments)}`;
    this.printTotalDue.textContent = `${curr}${this.formatCurrency(monthData.closingDue)}`;

    let rowsHtml = "";

    // Opening Due Row
    if (monthData.openingDue > 0) {
      const [y, m] = this.activeYearMonth.split("-");
      rowsHtml += `
        <tr style="background:#fef3c7; font-weight:bold;">
          <td>${m}/01/${y}</td>
          <td><strong>Balance Brought Forward (Previous Month Due)</strong></td>
          <td>-</td>
          <td class="text-right">${curr}${this.formatCurrency(monthData.openingDue)}</td>
          <td class="text-right">-</td>
          <td class="text-right">${curr}${this.formatCurrency(monthData.openingDue)}</td>
        </tr>
      `;
    }

    monthData.items.forEach(item => {
      const isPurchase = item.type === "purchase";
      let qtyUnit = "-";
      if (isPurchase) {
        let unitText = "Box";
        if (item.unitType === "strip") unitText = "Strip";
        if (item.unitType === "piece") unitText = "Piece";
        qtyUnit = `${item.quantity} ${unitText}`;
      }

      rowsHtml += `
        <tr>
          <td>${this.formatDateString(item.date)}</td>
          <td><strong>${this.escapeHTML(item.name)}</strong> ${item.note ? `<br><small style="color:#64748b;">${this.escapeHTML(item.note)}</small>` : ''}</td>
          <td>${qtyUnit}</td>
          <td class="text-right">${isPurchase ? curr + this.formatCurrency(item.amount) : '-'}</td>
          <td class="text-right">${!isPurchase ? curr + this.formatCurrency(item.amount) : '-'}</td>
          <td class="text-right"><strong>${curr}${this.formatCurrency(item.runningBalance)}</strong></td>
        </tr>
      `;
    });

    this.printTableTbody.innerHTML = rowsHtml;
    this.modalStatement.classList.add("active");
  }

  // ==========================================
  // 13. SETTINGS & BACKUP MODAL
  // ==========================================
  openSettingsModal() {
    if (this.settingsCurrencySelect) {
      this.settingsCurrencySelect.value = this.state.settings.currency || "Tk ";
    }
    this.modalSettings.classList.add("active");
  }

  exportBackupJSON() {
    const backupData = {
      version: "6.0",
      exportDate: new Date().toISOString(),
      state: this.state
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `medicine_monthly_ledger_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  importBackupJSON(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        if (json.state && Array.isArray(json.state.purchases) && Array.isArray(json.state.payments)) {
          this.state = json.state;
          if (!this.state.settings.currency) this.state.settings.currency = "Tk ";
          this.saveState();
          this.render();
          this.modalSettings.classList.remove("active");
          this.showToast("Backup restored successfully!", "success");
        } else {
          alert("Invalid backup file format!");
        }
      } catch (err) {
        alert("Error parsing file: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  // ==========================================
  // 14. SAMPLE / DEMO DATA GENERATOR
  // ==========================================
  loadDemoData() {
    const d = new Date();
    const curYear = d.getFullYear();
    const curMonth = d.getMonth() + 1;
    const prevMonth = curMonth === 1 ? 12 : curMonth - 1;
    const prevYear = curMonth === 1 ? curYear - 1 : curYear;

    const mPrev = String(prevMonth).padStart(2, '0');
    const mCur = String(curMonth).padStart(2, '0');

    this.state.purchases = [
      {
        id: "demo_1",
        name: "Napa Extra 500mg",
        date: `${prevYear}-${mPrev}-05T10:30`,
        unitType: "box",
        quantity: 2,
        unitPrice: 250,
        totalPrice: 500,
        note: "Fever & Headache"
      },
      {
        id: "demo_2",
        name: "Seclo 20mg (Omeprazole)",
        date: `${prevYear}-${mPrev}-12T18:15`,
        unitType: "box",
        quantity: 1,
        unitPrice: 550,
        totalPrice: 550,
        note: "Gastric care"
      },
      {
        id: "demo_3",
        name: "Ceevit 250mg Chewable",
        date: `${prevYear}-${mPrev}-20T14:00`,
        unitType: "strip",
        quantity: 4,
        unitPrice: 50,
        totalPrice: 200,
        note: "Vitamin C"
      },
      {
        id: "demo_4",
        name: "Pantonix 20mg",
        date: `${curYear}-${mCur}-03T11:20`,
        unitType: "strip",
        quantity: 3,
        unitPrice: 70,
        totalPrice: 210,
        note: "Daily gastric tablet"
      },
      {
        id: "demo_5",
        name: "Calbo-D (Calcium + Vit D3)",
        date: `${curYear}-${mCur}-15T19:40`,
        unitType: "box",
        quantity: 1,
        unitPrice: 380,
        totalPrice: 380,
        note: "Calcium supplement"
      }
    ];

    this.state.payments = [
      {
        id: "demo_pay_1",
        amount: 700,
        date: `${prevYear}-${mPrev}-28T20:00`,
        method: "Cash",
        note: "Previous month installment (Tk 550 remaining due)"
      },
      {
        id: "demo_pay_2",
        amount: 500,
        date: `${curYear}-${mCur}-20T19:00`,
        method: "bKash",
        note: "Current month payment"
      }
    ];

    this.saveState();
    this.render();
    this.showToast("Sample demo records loaded!", "success");
  }

  // ==========================================
  // 15. TOAST NOTIFICATIONS & HELPERS
  // ==========================================
  showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    const icon = type === "success" ? "fa-circle-check" : (type === "error" ? "fa-circle-xmark" : "fa-circle-info");
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(10px)";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    if (theme === "dark") {
      this.themeIcon.className = "fa-solid fa-sun";
      this.btnToggleTheme.title = "Switch to Light Mode";
    } else {
      this.themeIcon.className = "fa-solid fa-moon";
      this.btnToggleTheme.title = "Switch to Dark Mode";
    }
  }

  formatCurrency(num) {
    const val = Number(num) || 0;
    return val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatDateString(isoStr) {
    if (!isoStr) return "-";
    const date = new Date(isoStr);
    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return date.toLocaleDateString("en-US", options);
  }

  escapeHTML(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}

// Instantiate App
let app;
document.addEventListener("DOMContentLoaded", () => {
  app = new MedicineApp();
});
