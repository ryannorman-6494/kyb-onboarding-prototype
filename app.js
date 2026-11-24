/*
 * KYB onboarding · Xplor Pay business verification
 * -------------------------------------------------
 * Implementation of "KYB Onboarding.dc.html" (Claude Design) as a
 * dependency-free static page. State, copy and behaviour follow the design's
 * Component logic. Views render to HTML strings that are patched into the live
 * DOM, so inputs keep focus and caret position while you type.
 *
 * Prototype context (the design's props) comes from the query string or the
 * "Prototype options" panel:
 *   ?region=ca      Canada instead of the United States
 *   ?why=0          hide the "why we ask" panel
 *   ?slice=2        slice 2 (invite owners); no parameter means slice 1 (one person, no invites)
 *   ?start=         where the flow starts: (none) new Odin user | existing (existing Odin user, new business)
 *   ?data=sample    fill the form with the sample business
 *   ?link=          how the emailed link opens: returning | review | info | approved
 *
 * Security: nothing leaves the page. There are no network calls (the CSP in
 * index.html blocks them as well), nothing is written to storage or cookies,
 * and every value stays in memory until the tab closes. Document uploads
 * are simulated.
 */
(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Markup helpers
  // ---------------------------------------------------------------------------

  // Escape-by-default templating: every value interpolated into html`` is
  // HTML-escaped unless it is itself markup built by html``. This is the XSS
  // guard for everything typed into the form.
  const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ESC[c]); }
  function Markup(s) { this.s = s; }
  function toHtml(v) {
    if (v == null || v === false || v === true) return "";
    if (v instanceof Markup) return v.s;
    if (Array.isArray(v)) return v.map(toHtml).join("");
    return esc(v);
  }
  function html(strings) {
    let out = strings[0];
    for (let i = 1; i < strings.length; i++) out += toHtml(arguments[i]) + strings[i];
    return new Markup(out);
  }
  // Boolean attribute, e.g. <input${attr("checked", isOn)}>
  function attr(name, isOn) { return new Markup(isOn ? " " + name : ""); }

  function icon(name, size, cls) {
    return html`<svg class="i${cls ? " " + cls : ""}" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#i-${name}"></use></svg>`;
  }
  function mark(size) {
    return html`<span class="mark" aria-hidden="true"><svg width="${size}" height="${size}" focusable="false"><use href="#xplor-mark"></use></svg></span>`;
  }

  // Handlers are registered during render and referenced by index from
  // data-click / data-input / … attributes. One delegated listener per event
  // type looks them up, so no inline JavaScript is ever written into markup.
  let handlers = [];
  function on(fn) { handlers.push(fn); return handlers.length - 1; }

  // ---------------------------------------------------------------------------
  // Pend reasons (decision pend-reasons-as-requests)
  // ---------------------------------------------------------------------------

  // What the underwriting team can ask an applicant for. An Ops user picks one or more; each becomes a request card on the
  // More info needed screen, and the same text goes in the email. The reasons and what resolves each one come from the Xplor
  // Underwriting Guide (Pend Reasons and Documentation Requirements); the plain-language wording is a draft for ops and
  // compliance to confirm. The guide is written for the United States.
  //   title    short heading for the request
  //   why      why we need it, in plain language
  //   lead     the line above the list of what we accept
  //   accept   the documents or answers that resolve it
  //   note     an optional extra line under the list
  //   slice    "2" when only the invite build offers the reason (Slice 1 cannot collect a second person's details; decision pend-cosigner-slice-2)
  //   person   true when the request is about one owner; {name} and {first} in the text become that person
  //   file     the made-up file name an upload shows
  // Every reason is answered the same way, with a document upload and a message box, and nothing on the card is required or checked
  // (decision more-info-one-response). What each reason asks for is said in its own wording; the answer is read by a person.
  const PEND_REASONS = [
    {
      id: "banking", name: "Banking Verification", file: "bank-verification.pdf",
      title: "Confirm your bank account",
      why: "We need to verify that the payout account you gave us belongs to your business, so we pay the right place.",
      lead: "Either of these works",
      accept: [
        "A voided check with your business name and account details printed on it. We can't take starter checks.",
        "A letter on your bank's letterhead. It shows your full account number, your bank's routing details, and your legal or DBA name, along with your contact details. A bank representative signs it and adds their phone number and email."
      ]
    },
    {
      id: "ownership", name: "Business Ownership Verification", file: "ownership-document.pdf",
      title: "Show how you're linked to the business",
      why: "We need a document that connects you to the business, so we know who owns it and who can sign for it.",
      lead: "Any one of these works. It needs to show the business's legal name and your name.",
      accept: [
        "A certificate of organization",
        "Articles of incorporation",
        "IRS Form SS-4",
        "A partnership agreement",
        "A government-issued business license"
      ]
    },
    {
      id: "financial", name: "Financial Exposure Risk", file: "financial-records.pdf",
      title: "Share your financial records",
      why: "We need to see how your business is doing financially before we can approve it.",
      lead: "Send at least one of these",
      accept: [
        "Your last 2 years of audited financial statements: profit and loss, balance sheet, cash flow, and the audit cover letter signed by your audit firm",
        "All pages of your last 2 years of business tax returns",
        "All pages of your processing statements for the last 6 to 12 months in a row"
      ],
      note: "No audited statements, or fewer than 6 months of processing? Tell us. We can accept those in some cases."
    },
    {
      id: "delivery", name: "Future Delivery Risk",
      title: "Tell us when customers get what they pay for",
      why: "When customers pay before they receive your product or service, we need to know how long that gap lasts.",
      lead: "Tell us two things",
      accept: ["How far in advance you take deposits", "How long it takes from the first payment to delivery"]
    },
    {
      id: "kyb", name: "KYB Verification", file: "business-registration.pdf",
      title: "Show that your business is registered",
      why: "We need an official document that shows your business is registered under the name you gave us.",
      lead: "Any one of these works. It needs to show your legal business name.",
      accept: ["A government-issued business license", "Your filed articles of incorporation", "Your partnership agreement"],
      note: "Other documents are accepted only in some cases, such as a utility bill with the owner's name at the business address, a bill of sale or purchase agreement, or other state or federal filings. If you don't have one of the documents above, tell us."
    },
    {
      id: "shipping", name: "Shipping & Product Validation", file: "product-evidence.pdf",
      title: "Show how you get products to customers",
      why: "We need to see that you have the products you sell and a way to deliver them.",
      lead: "Send at least one of these",
      accept: [
        "Supplier agreements",
        "Fulfillment house agreements",
        "Photos of your inventory at your business address",
        "Marketing material that shows the products you sell, such as your website, catalogs, brochures or flyers"
      ]
    },
    {
      id: "kyc", person: true, name: "KYC Verification", file: "photo-id.pdf",
      title: "Confirm {first}'s identity",
      why: "We need to check who {name} is before we can approve the application.",
      lead: "Any one of these works. The copy needs to be clear and easy to read.",
      accept: ["Their current driver's license or government-issued ID", "Their current, unexpired U.S. passport", "Their Social Security card"]
    },
    {
      id: "freeze", person: true, name: "Credit Freeze",
      title: "Remove the freeze on {first}'s credit report",
      why: "A security freeze blocks the credit check we need to run on {name} before we can approve the application.",
      lead: "What to do",
      accept: ["Remove the security freeze on {first}'s credit report at Experian, TransUnion and Equifax", "Then tell us here, and we'll carry on with the check"]
    },
    {
      id: "alert", person: true, name: "Credit Security Alert",
      title: "A quick chat with our underwriting team",
      why: "A security alert on {name}'s credit report means we need to talk with them before we can go on.",
      lead: "What happens next",
      accept: ["There's nothing for you to send", "Our underwriting team will get in touch with {first}"]
    },
    {
      id: "cosigner", slice: "2", person: true, name: "Insufficient Credit",
      title: "Add a co-signer",
      why: "The credit history we found for {name} isn't enough for us to approve the application, so we need a co-signer.",
      lead: "What we need for your co-signer",
      accept: ["Their full legal name, address, date of birth and phone number", "Their Social Security number", "Their signature on the merchant agreement"]
    },
    {
      id: "product", name: "Product/Services Description",
      title: "Tell us more about what you sell",
      why: "We need more detail about your products or services to understand your business.",
      lead: "Tell us",
      accept: ["The types of products you sell or the services you offer, in more detail than you gave us"]
    },
    {
      id: "duplicate", name: "Duplicate Account",
      title: "Tell us why you need another account",
      why: "We found an open processing account linked to you or your business.",
      lead: "Tell us",
      accept: ["Why your business needs an additional account"]
    },
    {
      id: "tin", name: "TIN Verification", file: "tax-id-document.pdf",
      title: "Confirm your tax ID",
      why: "We need one more document to confirm your tax ID number.",
      lead: "Either of these works",
      accept: ["Your IRS Form SS-4 filing", "A 1099-K from your previous processor"]
    },
    {
      id: "firearms", name: "Firearms Due Diligence", file: "firearms-documents.pdf",
      title: "Send your firearms documents",
      why: "Selling firearms means extra checks, and some documents our sporting goods policy asks for are missing or incomplete.",
      lead: "Documents we often find missing",
      accept: [
        "Your Federal Firearms License (FFL)",
        "The sporting goods addendum",
        "Confirmation of your inventory",
        "Your SOT permits",
        "Your website disclaimers, such as shipping and state laws"
      ],
      note: "These are examples. Our sporting goods policy has the full list."
    },
    {
      id: "cbd", name: "CBD Due Diligence", file: "cbd-documents.pdf",
      title: "Send your CBD documents",
      why: "Selling CBD means extra checks, and some documents our CBD policy asks for are missing or incomplete.",
      lead: "Documents we often find missing",
      accept: [
        "A certificate of analysis (COA) for each product you sell",
        "Your inventory list",
        "Proof that you've removed any non-compliant products from your site",
        "Proof that you've added CBD content to your site"
      ],
      note: "These are examples. Our CBD policy has the full list."
    },
    {
      id: "volume", name: "Avg Ticket/Volume Thresholds",
      title: "Check your sales numbers",
      why: "Your average sale, highest sale and monthly volume don't match up, so we need you to confirm them.",
      lead: "Confirm or correct your numbers, and tell us how you worked them out",
      accept: ["Your average transaction amount, your maximum single transaction and your monthly card volume", "A short note on why those numbers are right"]
    },
    {
      id: "url", name: "Missing URL (website)",
      title: "Add your website address",
      why: "We need to see your website to check what you sell.",
      lead: "Tell us",
      accept: ["The address of your website"]
    },
    {
      id: "website", name: "Incomplete Website",
      title: "Update your website",
      why: "We looked at your website and found things to fix before we can approve it.",
      lead: "Things to check",
      accept: [
        "Your privacy, shipping and return policies are all complete",
        "Your terms and conditions are complete",
        "Age checks are in place for age-restricted products",
        "Your checkout is secure and works",
        "Your products are listed with full pricing"
      ]
    },
    {
      id: "nonprofit", name: "Non-Profit Documents", file: "nonprofit-status.pdf",
      title: "Send your nonprofit paperwork",
      why: "We need proof of your nonprofit status.",
      lead: "What we need",
      accept: ["Your most recently filed 501(c)(3)"]
    }
  ];
  const PEND_IDS = PEND_REASONS.map((r) => r.id);
  // What the prototype shows when no reason is picked: one request, so the screen reads as a single thing to fix.
  const PEND_DEFAULT = ["banking"];

  // Reads the ?pend= list from the address, keeping only known reason ids, in catalogue order.
  function pendFromUrl(raw) {
    const ids = String(raw || "").split(",").filter((x) => PEND_IDS.indexOf(x) > -1);
    return ids.length ? PEND_IDS.filter((id) => ids.indexOf(id) > -1) : PEND_DEFAULT.slice();
  }

  // ---------------------------------------------------------------------------
  // Prototype context (design props)
  // ---------------------------------------------------------------------------

  // How the emailed link behaves when it is opened (decisions 89 to 91). The first is a brand-new applicant.
  const LINKS = {
    returning: "Returning, in progress",
    review: "Returning, under review",
    info: "Returning, more info needed",
    approved: "Returning, approved"
  };
  const LINK_NEW = "New applicant";
  // Which slice of the product is shown (decision slices-option). Slice 1 is the default: one person fills in everything and
  // nobody can be invited. Slice 2 is the fuller build, where an owner can be invited to fill in their own details.
  const SLICE_1 = "Slice 1: one person, no invites";
  const SLICE_2 = "Slice 2: invite owners";
  // Which Xplor division the applicant is onboarding with (decisions division-option, clubready-lease-by-division). In the real product Ops sets it in the admin portal before the form opens.
  const DIV_STANDARD = "Standard";
  const DIV_CLUBREADY = "ClubReady";
  // SIMPLE TRIAL (decision moreinfo-simple-trial): a bare More info needed screen, only uploads and notes. To undo: delete every
  // line marked SIMPLE TRIAL and the block between SIMPLE TRIAL:START and SIMPLE TRIAL:END, and the SIMPLE TRIAL rule in app.css. Nothing else depends on it.
  const MOREINFO_CARDS = "A card for each request"; // SIMPLE TRIAL
  const MOREINFO_SIMPLE = "Just uploads and notes"; // SIMPLE TRIAL
  // Business lookup on step 1 (decision business-lookup-typeahead): the applicant finds their business by country and name and the name and address are filled in,
  // or the prototype owner switches it off in Prototype options and every detail is typed in, as before.
  const LOOKUP_ON = "Find the business by name";
  const LOOKUP_OFF = "Type everything in";
  // Where the whole prototype starts (decision login-default-start): the welcome email and login for a new Odin user by default,
  // or the existing-user email and business picker. The sample business is the Fields start as option, not a start.
  const START_LOGIN = "New Odin User";
  const START_EXISTING = "Existing Odin user: New business";

  // Only whitelisted values are read from the URL, so query-string input
  // never reaches the markup or the state.
  function readContext() {
    const q = new URLSearchParams(location.search);
    return {
      slice: q.get("slice") === "2" ? SLICE_2 : SLICE_1,
      moreInfo: q.get("moreinfo") === "simple" ? MOREINFO_SIMPLE : MOREINFO_CARDS, // SIMPLE TRIAL
      division: q.get("division") === "clubready" ? DIV_CLUBREADY : DIV_STANDARD,
      region: q.get("region") === "ca" ? "Canada" : "United States",
      start: q.get("start") === "existing" ? START_EXISTING : START_LOGIN,
      lookup: q.get("lookup") === "off" ? LOOKUP_OFF : LOOKUP_ON,
      data: q.get("data") === "sample" ? "Sample business" : "Empty",
      showNotes: q.get("notes") === "1",
      link: Object.prototype.hasOwnProperty.call(LINKS, q.get("link")) ? LINKS[q.get("link")] : LINK_NEW,
      pend: pendFromUrl(q.get("pend")),
      opsOwn: q.get("opsmsg") === "1" // Ops wrote their own message (decision more-info-ops-own-message)
    };
  }
  function writeContext() {
    const q = new URLSearchParams();
    if (ctx.slice === SLICE_2) q.set("slice", "2");
    if (ctx.moreInfo === MOREINFO_SIMPLE) q.set("moreinfo", "simple"); // SIMPLE TRIAL
    if (ctx.division === DIV_CLUBREADY) q.set("division", "clubready");
    if (ctx.region === "Canada") q.set("region", "ca");
    if (ctx.start === START_EXISTING) q.set("start", "existing");
    if (ctx.lookup === LOOKUP_OFF) q.set("lookup", "off");
    if (ctx.data === "Sample business") q.set("data", "sample");
    if (ctx.showNotes) q.set("notes", "1");
    Object.keys(LINKS).forEach((k) => { if (ctx.link === LINKS[k]) q.set("link", k); });
    if (ctx.pend.join() !== PEND_DEFAULT.join()) q.set("pend", ctx.pend.join(","));
    if (ctx.opsOwn) q.set("opsmsg", "1");
    const qs = q.toString();
    try { history.replaceState(null, "", qs ? "?" + qs : location.pathname); } catch (e) { /* file:// can refuse; the context still applies */ }
  }
  let ctx = readContext();
  function setCtx(patch) { ctx = Object.assign({}, ctx, patch); writeContext(); schedule(); }
  const isCa = () => ctx.region === "Canada";
  // Canadian English spells the noun "licence"; US English spells it "license" (decision region-spelling-licence).
  const licWord = () => (isCa() ? "licence" : "license");
  // Invites, owner links and hand-offs to someone else exist in slice 2 only.
  const invitesOn = () => ctx.slice === SLICE_2;
  // A division other than Standard opens the prototype on the one step it changes (step 6) with the sample business filled in.
  const divisionOn = () => ctx.division !== DIV_STANDARD;

  const CONTEXT_OPTIONS = {
    slice: [SLICE_1, SLICE_2],
    division: [DIV_STANDARD, DIV_CLUBREADY],
    moreInfo: [MOREINFO_CARDS, MOREINFO_SIMPLE], // SIMPLE TRIAL
    start: [START_LOGIN, START_EXISTING],
    lookup: [LOOKUP_ON, LOOKUP_OFF],
    region: ["United States", "Canada"],
    data: ["Empty", "Sample business"],
    link: [LINK_NEW].concat(Object.keys(LINKS).map((k) => LINKS[k]))
  };

  // ---------------------------------------------------------------------------
  // Design decisions
  // ---------------------------------------------------------------------------

  // The register of why this prototype is the shape it is lives in decisions.js (loaded first by index.html).
  // Turn "Design decisions" on in the prototype options to pin entries to the screen.
  const DECISIONS = window.DECISIONS || [];

  // Decisions cut or folded into another item in the requirements review
  // (REQUIREMENTS-DRAFT.md, finished 2026-11-11). They stay in DECISIONS above as
  // the archive that answers "why is it like this?" (and in DESIGN-DECISIONS.md),
  // but the prototype's pins and its "Read all" list skip them, so the screen shows
  // only the decisions that remain after the slim down. A decision added later
  // shows until a review cuts it. Numbers are still each entry's place in DECISIONS,
  // so a pin matches its REQ number in the requirements draft.
  const CUT_DECISIONS = [
    "doc-done-badge",
    "business-type-change-warning",
    "welcome-delegate", "welcome-actions", "welcome-four-cards",
    "welcome-phone-partner", "info-popover-hover", "sales-intake-first",
    "login-default-start", "sales-prefill", "sales-contract-upload",
    "welcome-needs-one-card", "welcome-plain-icons", "no-mcc-picker",
    "category-editable", "category-is-mcc", "ca-no-llc-structure",
    "tax-exempt-pill-label", "mcc-no-help-link", "address-links-below-hint",
    "address-search-layout", "address-city-state-zip-one-line", "owner-self-serve",
    "ownership-bar", "sign-last", "step2-prefill-sections",
    "owner-actions-menu", "invite-email-change", "invite-owners-only",
    "invite-email-checks", "ca-sample-data-canadian", "sole-owner-title-share",
    "no-owners-summary-card", "add-row-raised-fill", "owner-share-slider",
    "owner-form-accordion", "owner-slider-removed", "pep-in-their-id",
    "owner-form-three-sections", "owner-nationality-dob-residence-row", "owner-avatar-person-icon",
    "owner-section-icons", "owner-card-header-divider", "owner-card-padding-token",
    "owner-personal-details-grouped", "owner-form-thirds", "owner-address-two-thirds",
    "section-done-buttons", "status-chip-counts-prefilled", "descriptor-preview",
    "descriptor-phone-tbd", "descriptor-placeholder-example", "ca-statement-neighbours-vancouver",
    "descriptor-count-warning-token", "layout-shift-accepted", "pos-terminal-field-removed",
    "limits-ack-in-volumes", "card-history-in-volumes", "volume-fields-reordered",
    "max-ticket-block-text-removed", "w9-review-and-sign", "step-6-and-pci-tidy",
    "club-essentials-financial-history", "required-badge-warning", "read-before-accept",
    "next-steps-panel", "status-screens-polish", "truth-tick",
    "sign-on-step-6", "terms-view-only", "success-toasts",
    "soft-card-shadows", "confirmation-id-status", "approved-says-approved",
    "approved-add-merchant", "no-jump-bar", "approved-welcome",
    "status-optical-centre", "approval-time-confirmed", "pend-reasons-as-requests",
    "pend-send-once", "pend-reasons-open", "pend-note-cards-optional-upload",
    "moreinfo-simple-trial", "more-info-ops-own-message", "countries-sold-to-multiselect", "step-rail-on-top-960", "owner-phone-middle-third", "atlas-realign-2026-11-23", "email-logo-above-card", "review-screen-email-then-respond",
    "top-nav-follows-content-column", "more-info-by-email", "tokenized-ids",
    "no-field-count", "spacing-air", "roboto",
    "nothing-claimed-early", "full-width-description", "shape-language",
    "collapse-toggle", "persona-test-fixes", "validate-on-continue",
    "continue-disabled-until-complete", "no-if-applicable-tag", "nonprofit-wording-steps-3-6",
    "nonprofit-wording-leftovers", "disabled-button-says-whats-missing", "quiet-help-and-empty-owners",
    "back-button-white", "no-optional-tag", "atlas-sync-2",
    "secondary-button-no-bevel", "input-border-neutral-300", "tone-of-voice-pass",
    "yn-common-defaults", "yes-first-defaults", "static-cards-flat",
    "concurrent-edit-notice", "rail-quiet-step-markers", "step-header-fixed",
    "nonprofit-includes-government", "step-eyebrow-subtle", "sign-in-centred",
    "ca-company-card-no-llc", "sole-proprietor-card-wording", "dialogs-close-on-outside-click",
    "help-no-chat", "step-time-in-rail-only", "save-exit-after-first-step",
    "stable-scrollbar-gutter", "checkbox-no-grey-box", "step-ring-stays-on-return",
    "step-done-tick", "checkbox-tick-centred", "tick-beside-field",
    "field-helper-text-trims", "start-as-option", "sales-form-removed",
    "sample-not-a-start", "division-option"
  ];
  const decisionShown = (id) => CUT_DECISIONS.indexOf(id) < 0;
  const shownDecisionCount = () => DECISIONS.filter((d) => decisionShown(d.id)).length;

  const decisionIndex = (id) => {
    for (let i = 0; i < DECISIONS.length; i++) if (DECISIONS[i].id === id) return i;
    return -1;
  };

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const STEPS = [
    { n: 1, label: "Business and address" },
    { n: 2, label: "Owners & signatory" },
    { n: 3, label: "How you take payments" },
    { n: 4, label: "Payout account" },
    { n: 5, label: "Compliance declarations" },
    { n: 6, label: "Supporting documents" },
    { n: 7, label: "Agreement and submit" }
  ];

  // Answers the merchant supplies. The prototype starts empty so the flow can be
  // walked the way a new applicant meets it; "Sample business" in the prototype
  // options swaps in a finished Riverside Pilates for demoing the later screens.
  const EMPTY_ANSWERS = {
    sigSame: "", structure: "", incorporated: "", legalName: "", ein: "", dba: "", stateInc: "",
    website: "", phone: "", email: "", regAddress: "",
    tradingSame: "", tradingAddress: "",
    monthlyVolume: "", avgTicket: "", maxTicket: "", cpSplit: "",
    channel: "", goods: "", recurring: "", trial: "", marketplace: "",
    international: "", countries: "", refundPolicy: "",
    prior: "", priorName: "", priorCbRatio: "",
    achVolume: "0",
    achAvg: "",
    bankName: "", bankNickname: "", accountHolder: "", accountType: "", routing: "", accountNumber: "",
    institution: "", transit: "",
    legalProceedings: "", legalProceedingsWhy: "", priorTermination: "", priorTerminationWhy: "",
    taxLiens: "", taxLiensWhy: "", msb: "",
    matchConsent: false, ofacAck: false,
  };

  // Canada's made-up business is a corporation, so its name ends Inc. rather than LLC (decision ca-no-llc-structure).
  const CA_NAME = "Riverside Pilates Inc.";
  // Invented Canadian values, so the Canada path carries no Oregon address, phone, bank or ID number (decision ca-sample-data-canadian).
  const CA_ADDRESS = "418 Water St, Suite 210, Vancouver, BC V6B 1A1";
  const CA_SAMPLE_BUSINESS = { ein: "123456789", regAddress: CA_ADDRESS, phone: "+1 (604) 555-0148", bankName: "Pacific Coast Credit Union" };
  const CA_OWNER_SEED = {
    self: { home: "92 Bryce St, Vancouver, BC V5T 2A1", phone: "+1 (604) 555-0148" },
    other: { home: "1408 Belmont Ave, Vancouver, BC V6J 3B5", phone: "+1 (604) 555-0192" }
  };

  const SAMPLE_ANSWERS = Object.assign({}, EMPTY_ANSWERS, {
    sigSame: "yes",
    structure: "Limited liability company (LLC)",
    incorporated: "03 / 12 / 2019",
    legalName: "Riverside Pilates LLC",
    dba: "Riverside Pilates",
    stateInc: "Oregon",
    website: "riversidepilates.com",
    phone: "+1 (503) 555-0148",
    email: "hello@riversidepilates.com",
    ein: "93-4417208",
    category: "7997 · Membership Clubs (Sports, Recreation, Athletic), Country Clubs, and Private Golf Courses",
    regAddress: "418 SE Water Ave, Suite 210, Portland, OR 97214",
    tradingSame: "yes",
    monthlyVolume: "42,000", avgTicket: "38", maxTicket: "1,200", cpSplit: "70",
    channel: "In-person and e-commerce", goods: "Services and subscriptions",
    recurring: "yes", trial: "no", marketplace: "no", international: "no",
    refundPolicy: "riversidepilates.com/refunds",
    prior: "no",
    bankName: "Umpqua Bank", bankNickname: "Studio operating account", accountHolder: "Riverside Pilates LLC",
    accountType: "Business checking", routing: "323075880",
    accountNumber: "1234 5678 4417", institution: "003", transit: "00172",
    legalProceedings: "no", priorTermination: "no", taxLiens: "no", msb: "no",
    matchConsent: true, ofacAck: true
  });

  // Business category is a merchant category code (MCC). The full list lives in mcc-codes.js, but the applicant only sees
  // the codes set up for their division (decision mcc-from-division). In the real product Ops builds each division in
  // Odin with its own finite list of codes, so the picker inherits it. These three lists are INVENTED stand-ins
  // (DIVISION_MCC), not Ops's lists. Standard has 32 codes and ClubReady 14, to show a longer and a shorter list.
  const MCC_LIST = String(window.MCC_CODES || "").split("\n").filter(Boolean).map((l) => { const p = l.split("\t"); return { code: p[0], name: p[1], label: p[0] + " · " + p[1], hay: (p[0] + " " + p[1]).toLowerCase() }; });
  const DIVISION_MCC = {
    [DIV_STANDARD]: ["5462", "5499", "5651", "5732", "5811", "5812", "5814", "5942", "5947", "5977", "5995", "5999", "7221", "7230", "7298", "7299", "7333", "7349", "7392", "7399", "7699", "7911", "7997", "8011", "8041", "8099", "8111", "8299", "8351", "8398", "8641", "8661"],
    [DIV_CLUBREADY]: ["5499", "5941", "5977", "7230", "7297", "7298", "7299", "7911", "7941", "7997", "7999", "8011", "8041", "8099"]
  };
  // The codes most applicants pick, most common first (decision mcc-most-common-first). The order is an INVENTED stand-in, not Xplor volume data: replace it with the real ranking when Ops or Product supply one.
  const MCC_COMMON = {
    [DIV_STANDARD]: ["5812", "5814", "7230", "5999", "7997", "8099", "7299", "5499"],
    [DIV_CLUBREADY]: ["7997", "7298", "7999", "7941", "7299", "8099", "8041", "5499"]
  };
  const divisionMccs = () => { const codes = DIVISION_MCC[ctx.division] || DIVISION_MCC[DIV_STANDARD]; return MCC_LIST.filter((x) => codes.indexOf(x.code) > -1); };
  // Every word typed must appear in the code or title, so "bake" and "5462" both find bakeries. An empty search lists the whole division list.
  // Address lookup stand-ins (fake address-lookup): a short fixed list per country. Typing three or more characters shows the addresses that contain every word typed; the real product would search a postal address service.
  const ADDRESS_STUBS = {
    "United States": ["123 Main St, Springfield, IL 62701", "123 Market St, San Francisco, CA 94105", "123 Congress Ave, Austin, TX 78701", "123 Peachtree St NE, Atlanta, GA 30303", "123 Broadway, New York, NY 10006", "1230 Pine St, Seattle, WA 98101", "418 SE Water Ave, Suite 210, Portland, OR 97214", "412 SW Alder St, Portland, OR 97204", "1200 Main St, Springfield, IL 62701", "88 Market St, San Francisco, CA 94105", "250 Elm Ave, Austin, TX 78701", "75 Lakeview Dr, Denver, CO 80202", "310 Pine St, Seattle, WA 98101", "9 Harbor Rd, Boston, MA 02110", "1500 Peachtree St NE, Atlanta, GA 30309", "4100 N Central Ave, Phoenix, AZ 85012"],
    "Canada": ["123 Main St, Vancouver, BC V6A 2S5", "123 Bay St, Toronto, ON M5K 1E7", "123 Rue Sherbrooke O, Montréal, QC H2X 1X4", "123 8 Ave SW, Calgary, AB T2P 1B3", "123 Sparks St, Ottawa, ON K1P 5E9", "1230 Granville St, Vancouver, BC V6Z 1M8", "418 Water St, Suite 210, Vancouver, BC V6B 1A1", "1055 W Georgia St, Vancouver, BC V6E 3P3", "100 King St W, Toronto, ON M5X 1A9", "1 Yonge St, Toronto, ON M5E 1W7", "800 Rue de la Gauchetière O, Montréal, QC H5A 1K6", "500 4 Ave SW, Calgary, AB T2P 2V6", "99 Bank St, Ottawa, ON K1P 6B9", "1800 Hollis St, Halifax, NS B3J 1V7", "350 Portage Ave, Winnipeg, MB R3C 0C4"]
  };
  const searchAddress = (q) => { const t = String(q || "").toLowerCase().split(/\s+/).filter(Boolean); if (String(q || "").trim().length < 3) return []; return ADDRESS_STUBS[isCa() ? "Canada" : "United States"].filter((x) => t.every((w) => x.toLowerCase().indexOf(w) > -1)); };
  // Business lookup stand-ins (fake business-lookup): a short fixed list per country, with several businesses that share a name so the duplicate case can be tried.
  // The real service ranks real registry records and says how many other businesses share a name; here that count comes from the list. Names are matched word by word, not by address.
  const BIZ_STUBS = {
    "United States": [
      { name: "Riverside Pilates LLC", address: "418 SE Water Ave, Suite 210, Portland, OR 97214" },
      { name: "Riverside Pilates LLC", address: "77 Harbor View Rd, Sacramento, CA 95814" },
      { name: "Riverside Community Foundation", address: "1200 Main St, Springfield, IL 62701" },
      { name: "Main Street Bakery LLC", address: "310 Pine St, Seattle, WA 98101" },
      { name: "Main Street Bakery LLC", address: "250 Elm Ave, Austin, TX 78701" },
      { name: "Main Street Bakery LLC", address: "75 Lakeview Dr, Denver, CO 80202" },
      { name: "Main Street Bakery LLC", address: "9 Harbor Rd, Boston, MA 02110" },
      { name: "Main Street Bakery & Cafe Inc", address: "123 Main St, Springfield, IL 62701" },
      { name: "Harbor Coffee Co", address: "88 Market St, San Francisco, CA 94105" },
      { name: "Summit Yoga Studio LLC", address: "75 Lakeview Dr, Suite 4, Denver, CO 80202" },
      { name: "Peachtree Fitness Group LLC", address: "1500 Peachtree St NE, Atlanta, GA 30309" },
      { name: "Sunrise Dental PC", address: "4100 N Central Ave, Phoenix, AZ 85012" },
      { name: "Sunrise Dental PC", address: "123 Congress Ave, Austin, TX 78701" }
    ],
    "Canada": [
      { name: "Riverside Pilates Inc.", address: "418 Water St, Suite 210, Vancouver, BC V6B 1A1" },
      { name: "Riverside Community Foundation", address: "99 Bank St, Ottawa, ON K1P 6B9" },
      { name: "Maple Leaf Bakery Inc.", address: "100 King St W, Toronto, ON M5X 1A9" },
      { name: "Maple Leaf Bakery Inc.", address: "123 Sparks St, Ottawa, ON K1P 5E9" },
      { name: "Maple Leaf Bakery Inc.", address: "500 4 Ave SW, Calgary, AB T2P 2V6" },
      { name: "Pacific Coast Yoga Ltd.", address: "1230 Granville St, Vancouver, BC V6Z 1M8" },
      { name: "Harbour Coffee Co.", address: "1800 Hollis St, Halifax, NS B3J 1V7" },
      { name: "Rue Sherbrooke Fitness Inc.", address: "123 Rue Sherbrooke O, Montréal, QC H2X 1X4" },
      { name: "Prairie Dental Corp.", address: "350 Portage Ave, Winnipeg, MB R3C 0C4" }
    ]
  };
  // Canada uses Trulioo Business Search, not KYB Prefill (decision ca-business-search). Its candidates carry a registration number, the jurisdiction of incorporation and a status, so the stand-ins do too. The numbers are made up for the prototype.
  BIZ_STUBS["Canada"].forEach((x, i) => { x.prov = (/,\s*([A-Z]{2})\s+[A-Z0-9]/.exec(x.address) || [])[1] || ""; x.reg = x.prov + (1000100 + i * 37); x.status = i === 5 ? "Out of Business" : "Active"; });
  const bizList = () => BIZ_STUBS[isCa() ? "Canada" : "United States"];
  // The country is already known before the applicant starts, so the lookup asks for the state or province instead, to narrow the search (decision business-lookup-state). "" means no state chosen. A saved choice that belongs to the other country is ignored.
  const findRegionCode = () => {
    const code = state.findState || "";
    return (isCa() ? CA_REGIONS : US_REGIONS).some((r) => r[0] === code) ? code : "";
  };
  // Choosing a state or province shows the same fake businesses for every one, with only the state or province and the ZIP or postal code of each address swapped to match, so every state has something to pick (decision business-lookup-state). The street and city are left as they were, which is fine for a prototype.
  // US ZIPs are made up from the state's place in the list and the last three digits of the original; Canadian postal codes get the province's usual first letter.
  const CA_POSTAL_LETTER = { AB: "T", BC: "V", MB: "R", NB: "E", NL: "A", NS: "B", NT: "X", NU: "X", ON: "K", PE: "C", QC: "H", SK: "S", YT: "Y" };
  const reState = (address, code) => {
    const m = /^(.*,\s*)([A-Z]{2})\s+([A-Z0-9 -]+)$/.exec(address);
    if (!m) return address;
    const postal = isCa()
      ? (CA_POSTAL_LETTER[code] || m[3][0]) + m[3].slice(1)
      : String(10000 + US_REGIONS.findIndex((r) => r[0] === code) * 1700 + Number(m[3].slice(2))).slice(0, 5);
    return m[1] + code + " " + postal;
  };
  // The businesses the search looks through: the country's list, with addresses moved to the chosen state when there is one. Same-name businesses stay same-name, so the "others share this name" warnings do not change with the state.
  const bizScope = (code) => (isCa() ? (code ? bizList().filter((x) => x.prov === code) : bizList()) : code ? bizList().map((x) => Object.assign({}, x, { address: reState(x.address, code) })) : bizList());
  const withDups = (x, scope) => Object.assign({}, x, { dups: (scope || bizList()).filter((y) => y !== x && y.name.toLowerCase() === x.name.toLowerCase()).length });
  // A few businesses shown as soon as the box is opened, before anything is typed (decision business-lookup-typeahead). The same few for every state.
  const suggestBiz = (code) => {
    const scope = bizScope(code);
    return (isCa() ? [0, 2, 5, 6, 7] : [0, 3, 8, 9, 11]).map((i) => withDups(scope[i], scope));
  };
  const searchBiz = (q, code) => {
    const t = String(q || "").toLowerCase().split(/\s+/).filter(Boolean);
    if (String(q || "").trim().length < 3) return [];
    const scope = bizScope(code);
    return scope
      .filter((x) => t.every((w) => x.name.toLowerCase().indexOf(w) > -1))
      .map((x) => withDups(x, scope))
      .sort((a, b) => (a.name.toLowerCase().indexOf(t[0]) === 0 ? 0 : 1) - (b.name.toLowerCase().indexOf(t[0]) === 0 ? 0 : 1) || b.dups - a.dups);
  };
  // The address is stored as one line, and these split it into parts and join it back (decision address-split-fields). Parsing works from the end: "state ZIP" or "province postal code" last, then the city, then the street, with anything left over as the unit.
  const US_REGIONS = "AL Alabama;AK Alaska;AZ Arizona;AR Arkansas;CA California;CO Colorado;CT Connecticut;DE Delaware;DC District of Columbia;FL Florida;GA Georgia;HI Hawaii;ID Idaho;IL Illinois;IN Indiana;IA Iowa;KS Kansas;KY Kentucky;LA Louisiana;ME Maine;MD Maryland;MA Massachusetts;MI Michigan;MN Minnesota;MS Mississippi;MO Missouri;MT Montana;NE Nebraska;NV Nevada;NH New Hampshire;NJ New Jersey;NM New Mexico;NY New York;NC North Carolina;ND North Dakota;OH Ohio;OK Oklahoma;OR Oregon;PA Pennsylvania;RI Rhode Island;SC South Carolina;SD South Dakota;TN Tennessee;TX Texas;UT Utah;VT Vermont;VA Virginia;WA Washington;WV West Virginia;WI Wisconsin;WY Wyoming".split(";").map((x) => [x.slice(0, 2), x.slice(3)]);
  const CA_REGIONS = "AB Alberta;BC British Columbia;MB Manitoba;NB New Brunswick;NL Newfoundland and Labrador;NS Nova Scotia;NT Northwest Territories;NU Nunavut;ON Ontario;PE Prince Edward Island;QC Quebec;SK Saskatchewan;YT Yukon".split(";").map((x) => [x.slice(0, 2), x.slice(3)]);
  const addrJoin = (p) => [p.l1, p.l2, p.city, [p.region, p.postal].map((x) => String(x || "").trim()).filter(Boolean).join(" ")].map((x) => String(x || "").trim()).filter(Boolean).join(", ");
  function addrParse(str) {
    const bits = String(str || "").split(",").map((x) => x.trim()).filter(Boolean);
    const out = { l1: "", l2: "", city: "", region: "", postal: "" };
    if (!bits.length) return out;
    const last = bits.pop();
    const m = last.match(/^(.*?)\s*([A-Z]\d[A-Z]\s?\d[A-Z]\d|\d{5}(?:-\d{4})?)$/i);
    out.region = m ? m[1].trim() : last;
    out.postal = m ? m[2].trim() : "";
    out.city = bits.pop() || "";
    out.l1 = bits.shift() || "";
    out.l2 = bits.join(", ");
    return out;
  }
  // The parts for an address answer: the ones being typed if they still add up to the stored line, otherwise the line itself taken apart.
  const addrOf = (id, value) => { const p = state.addrParts[id]; return p && addrJoin(p) === String(value || "") ? p : addrParse(value); };
  const searchMcc = (q) => {
    const t = String(q || "").toLowerCase().split(/\s+/).filter(Boolean);
    const hit = divisionMccs().filter((x) => !t.length || t.every((w) => x.hay.indexOf(w) > -1));
    const common = MCC_COMMON[ctx.division] || MCC_COMMON[DIV_STANDARD];
    // The common codes first, in their set order; every other code after them, A to Z by title. Typing a search keeps this order.
    const top = hit.filter((x) => common.indexOf(x.code) > -1).sort((a, b) => common.indexOf(a.code) - common.indexOf(b.code));
    const rest = hit.filter((x) => common.indexOf(x.code) < 0).sort((a, b) => a.name.localeCompare(b.name));
    return top.map((x) => Object.assign({}, x, { common: true })).concat(rest.map((x) => Object.assign({}, x, { common: false })));
  };

  // A returning visitor to the emailed link gets a saved business back, so that visit borrows the sample one.
  let restored = false;
  const isSample = () => ctx.data === "Sample business" || restored || divisionOn();
  const isSole = () => state.bizType === "individual";
  const isNonprofit = () => state.bizType === "non-profit";
  // "organization" for a non-profit, "business" for everyone else, for copy that names what is applying.
  const orgWord = () => (isNonprofit() ? "organization" : "business");
  // Step names: a non-profit has no owners and is not a business.
  // Step 2 is called Owners (Leaders for a non-profit) in Slice 1, where nobody is asked who signs; Slice 2 keeps "& signatory" (decision slice-1-no-signer-question).
  const step2Name = () => (isNonprofit() ? "Leaders" : "Owners") + (invitesOn() ? " & signatory" : "");
  const stepName = (s) => (s.n === 2 ? step2Name() : isNonprofit() && s.n === 1 ? "Organization & address" : s.label);
  const isCompany = () => !isSole() && !isNonprofit();

  function freshOwners() {
    return isSample()
      ? [
          { id: 1, name: "Dana Whitfield", initials: "DW", pct: 60, role: "Owner and CEO", status: "pending", self: true },
          { id: 2, name: "Marcus Lee", initials: "ML", pct: 30, role: "Director", status: "pending", self: false }
        ]
      : [];
  }

  // Anyone opening the link as one of the Returning options has been in before: they have already set a password (decision returning-login-only).
  const isReturning = () => [LINKS.returning, LINKS.review, LINKS.info, LINKS.approved].indexOf(ctx.link) > -1;
  function startScreen() {
    if (ctx.start === START_LOGIN && isReturning()) return "login";
    return "email";
  }

  function freshState() {
    const sample = isSample();
    return {
      screen: divisionOn() ? "flow" : startScreen(),
      step: divisionOn() ? 6 : 1,
      // The login screen (decision login-default-start): which stage ("credentials" or "change"), the typed values, and any error.
      loginStage: "credentials",
      loginEmail: "dana@riversidepilates.example", // the username the welcome email shows, so a tester need not retype it
      loginPassword: "",
      loginErr: "",
      // The existing-user business picker (decision existing-user-new-business): "new", "existing" or "" before a choice.
      pickedBiz: "",
      newPassword: "",
      confirmPassword: "",
      changeErr: "",
      // Which kind of business the applicant is, chosen on the page after the welcome screen.
      // The sample business is a company, so its later screens stay as designed.
      bizType: sample ? "company" : "",
      // The green success toast in the top-right corner: { id, text } or null.
      toast: null,
      // The searchable category picker: which field is open, what has been typed, and the highlighted row.
      comboOpen: "",
      multiOpen: "", multiQuery: "", multiIdx: 0,
      comboQuery: "",
      comboIdx: 0,
      // The Atlas-style select list: which select has its list open, and the highlighted row.
      selOpen: "",
      selIdx: 0,
      // The phone country list: which phone field has it open, what has been typed in its search row, and the highlighted row.
      phoneOpen: "",
      phoneQuery: "",
      phoneIdx: 0,
      // The address lookup: which address field has its suggestions open, and the highlighted row (-1 until the arrow keys are used).
      addrOpen: "",
      addrIdx: -1,
      addrQ: {},
      addrManual: {},
      addrParts: {},
      // The business lookup on step 1: the text typed, whether the list is open, the highlighted row, whether a search is running, the results, the business picked, and whether the applicant chose to type everything in (decision business-lookup-typeahead).
      findQ: "",
      findOpen: false,
      findIdx: 0,
      findBusy: false,
      findResults: [],
      findPicked: null,
      findManual: false,
      findRevealed: false,
      findState: "",
      findSearched: "",
      openOwner: 1,
      // The furthest step the applicant has opened. Steps up to here can be returned to from the left column; later ones cannot (decision partial-steps-allowed).
      maxStep: 1,
      // The payout account once Save and continue has saved it (decision bank-saved-as-account): { values } is a copy of the bank answers, or null while nothing is saved. bankEditing is true while the applicant is re-entering the details of a saved account.
      bankSaved: null,
      bankEditing: false,
      // Owner form sections the applicant has opened, keyed by the section's heading id. The first starts open and the rest closed until chosen (decision owner-form-accordion).
      secOpen: {},
      openCards: {},
      revealed: {},
      owners: freshOwners(),
      docs: {},
      // Prototype only: when true the next file added on step 6 fails to upload (decision upload-failure-callout).
      failNextUpload: false,
      // What the applicant has answered on the More info needed screen, keyed by pend reason id (decision pend-reasons-as-requests).
      rfi: {},
      // The owner a person-level request is about, picked by Ops in Prototype options (0 = the applicant).
      pendFor: 0,
      // Steps where "Save and continue" has been pressed, so errors only appear after an attempt.
      tried: {},
      // Fields the applicant has been in and left. Their problems show straight away; the rest wait for a press of Save and continue.
      touched: {},
      viewed: {},
      // True while someone is fixing one section from the final review. Progress
      // stays where it was and the footer collapses to a single Save.
      editing: false,
      // Signing in the Docusign window (decision docusign-sign-in-modal). signStatus is idle, loading, ready, signed, declined, cancelled, expired or error. signConfirm says whether our system has confirmed a "signed" (decision docusign-signed-only-when-confirmed): "" , "checking", "delayed" or "confirmed".
      signStatus: "idle",
      signConfirm: "",
      signModal: false,
      signLeaveAsk: false,
      signTabDone: false,
      signHold: false,
      signFor: null,
      signAt: "",
      signSay: "",
      // Mock mode switches (decision docusign-mock-mode): the next request for a signing link fails, and our system is slow to confirm a signature.
      signMockUrlFails: false,
      signMockPending: false,
      submittedAt: "",
      // True when Ops has asked for more information by email, which changes the waiting screen (decision more-info-by-email).
      askedMore: false,
      saveEmailErr: "",
      saveEmail: sample ? "finance@riversidepilates.com" : "",

      // SIMPLE TRIAL: the cards on the simple More info screen, { id, name (the file, "" for none), busy, note }. Starts with one empty card.
      rfiDocs: [], rfiNote: "",
      // A follow-up from Ops that is their own wording, not a template (decision more-info-ops-own-message). Sample wording, edited in Prototype options.
      opsMsgText: "Thanks for sending that. The bank letter has a different business name from the one on your application. Can you tell us why, and send the document that shows the name change?",
      // Extra bank accounts on step 4: just their numbers (1, 2, ...). Each one's answers live in a as x<n>_bankName and so on.
      a: Object.assign({}, sample ? SAMPLE_ANSWERS : EMPTY_ANSWERS, sample && isCa() ? Object.assign({ structure: "Private corporation", legalName: CA_NAME, accountHolder: CA_NAME }, CA_SAMPLE_BUSINESS) : {})
    };
  }

  const state = Object.assign({
    infoOpen: false,
    saveOpen: false,
    railOpen: false, // the step list under the progress bar, folded away on narrow screens (decision step-rail-collapses-narrow)
    helpOpen: false,
    protoOpen: false,
    openNote: "",
    notesListOpen: false,
    whyOpen: false,
    fieldWhy: "",
    nextTip: false,
    signTip: false,
    editMasked: "",
    viewDoc: "",
    delegateOpen: false,
    delegateTarget: 0,
    delegateEmail: "",
    delegateErr: "",
    menuOwner: 0,
    confirm: null,
    stepEdit: null,
    inviteStep: 0,
    inviteOwner: 0,
    returnTo: null,
    saving: false
  }, freshState());

  // Switching the data option starts the run over. A half-filled form crossed
  // with a different data set isn't a state anyone needs to look at.
  function resetData() { Object.assign(state, freshState()); }

  let pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    queueMicrotask(() => { pending = false; render(); });
  }
  function setState(patch) {
    Object.assign(state, typeof patch === "function" ? patch(state) : patch);
    if (state.step > state.maxStep) state.maxStep = state.step;
    schedule();
  }

  // Green confirmations are toasts, not blocks in the page, so the next fields can come into view straight away.
  let toastTimer = 0;
  // Atlas Toast (decision atlas-sweep-toast-badges): a title, an optional message under it, a severity ("success" or "info"), five seconds on screen, and a dismiss button.
  function showToast(title, message, severity) {
    clearTimeout(toastTimer);
    setState({ toast: { id: Date.now(), title: title, message: message || "", severity: severity || "success" } });
    toastTimer = setTimeout(() => setState({ toast: null }), 5000);
  }
  function dismissToast() {
    clearTimeout(toastTimer);
    setState({ toast: null });
  }
  // Flips the rail's Saved / Saving tell while a committed edit saves (decision autosave-tell). Autosave is assumed to take about a second.
  let savingTimer = 0;
  function pulseSave() {
    clearTimeout(savingTimer);
    if (!state.saving) setState({ saving: true });
    savingTimer = setTimeout(() => setState({ saving: false }), 1000);
  }
  const set = (id, v) => setState((s) => {
    const a = Object.assign({}, s.a, { [id]: v });
    // Ticking "I don't have a website" fills the website with N/A and locks it; unticking clears it again (decision website-required-with-none-box).
    if (id === "noWebsite") a.website = v === true ? NO_WEBSITE : (s.a.website === NO_WEBSITE ? "" : s.a.website);
    // Ticking "This person doesn't have an SSN" fills that owner's SSN or SIN with zeros and locks it; unticking clears it (decision no-ssn-tick). Only zeros are ever stored, never a real number.
    const ni = /^(o\d+_)noNatId$/.exec(id);
    if (ni) {
      const key = ni[1] + "natId", zeros = noNatIdValue();
      a[key] = v === true ? zeros : (s.a[key] === zeros ? "" : s.a[key]);
    }
    return { a: a };
  });
  // The value stored in the website answer when the applicant says they have no website.
  const NO_WEBSITE = "N/A";
  // The value stored in an owner's SSN or SIN answer when they have none: all zeros in the usual layout for the country.
  const noNatIdValue = () => (isCa() ? "000 000 000" : "000-00-0000");
  const go = (screen, step) => setState({ screen, step: step || state.step, saveOpen: false });

  // Where the link lands once the applicant has signed in (decision 91): the welcome page for someone new, otherwise wherever the
  // application has got to. A returning visit loads the saved sample business.
  function openLink() {
    if (ctx.link === LINK_NEW) { setState({ screen: "welcome" }); return; }
    restored = true;
    resetData();
    if (ctx.link === LINKS.returning) {
      setState({ screen: "flow", step: 4 });
      showToast("Welcome back", "Your answers are saved.");
      return;
    }
    // More info needed: in Slice 1 the applicant answers on a screen in the product; in Slice 2 Ops asks by email, so the applicant sees the waiting screen with a note to check their inbox (decisions more-info-by-email, more-info-slice-swap).
    const asked = ctx.link === LINKS.info;
    const screen = asked && (!invitesOn() || ctx.opsOwn) ? "rfi" : ctx.link === LINKS.approved ? "approved" : "submitted";
    setState({ screen, submittedAt: stampDate() + ", 9:12 AM ET", askedMore: asked && invitesOn() && !ctx.opsOwn });
  }

  // Login (decision login-default-start): a temporary password always forces a change, same as a real first sign-in
  // would. Prototype: any non-empty email and password sign in; nothing is checked against a real account.
  const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  function submitLogin() {
    const email = state.loginEmail.trim();
    if (!EMAIL_OK.test(email)) { setState({ loginErr: "Enter an email like name@example.com." }); return; }
    if (!state.loginPassword) { setState({ loginErr: isReturning() ? "Enter your password." : "Enter your temporary password." }); return; }
    // A returning user has already set their own password, so signing in goes straight in.
    if (isReturning()) { openLink(); return; }
    setState({ loginStage: "change", loginErr: "" });
  }
  function submitNewPassword() {
    const pw = state.newPassword, confirm = state.confirmPassword;
    if (pw.length < 8) { setState({ changeErr: "Use at least 8 characters." }); return; }
    if (pw !== confirm) { setState({ changeErr: "Passwords don't match." }); return; }
    openLink();
  }
  // Continue, save and submit all go through here: nothing moves on until the
  // step is complete, and a failed attempt shows every problem at once.
  function attempt(proceed) {
    const errs = stepErrors(state.step);
    if (!Object.keys(errs).length) { proceed(); return; }
    const owners = state.owners.filter((o) => Object.keys(errs).some((k) => k.indexOf("o" + o.id + "_") === 0));
    setState({
      tried: Object.assign({}, state.tried, { [state.step]: true }),
      openOwner: owners.length ? owners[0].id : state.openOwner
    });
  }
  // Steps 1 to 6 save and move on whether or not they are complete, because the applicant may be waiting on something (decision partial-steps-allowed). Only the final submit needs every step complete.
  const stepGaps = () => STEPS.filter((x) => x.n < 7 && Object.keys(stepErrors(x.n)).length > 0).map((x) => x.n);
  // Save and continue and Save & Exit do not run while a field holds a bad entry: the page scrolls to the first one instead (decision errors-only-for-bad-entries).
  // Returns true when it stopped. Missing answers never stop it.
  let pendingScroll = false;
  function blockedByProblems() {
    const errs = stepErrors(state.step, true);
    if (!Object.keys(errs).length) return false;
    const owners = state.owners.filter((o) => Object.keys(errs).some((k) => k.indexOf("o" + o.id + "_") === 0));
    pendingScroll = true;
    setState({
      tried: Object.assign({}, state.tried, { [state.step]: true }),
      openOwner: owners.length ? owners[0].id : state.openOwner
    });
    return true;
  }
  // The payout account (decision bank-saved-as-account). The back end can only store a bank account once every detail is in, so step 4 is the one step that holds Save and continue back until the form is complete, and pressing it saves the account.
  const BANK_KEYS = ["bankName", "bankNickname", "accountHolder", "accountType", "routing", "institution", "transit", "accountNumber"];
  const bankFormOn = () => !state.bankSaved || state.bankEditing;
  const bankLast4 = (raw) => String(raw || "").replace(/\D/g, "").slice(-4);
  const snapshotBank = () => { const values = {}; BANK_KEYS.forEach((k) => { values[k] = state.a[k] || ""; }); return { values }; };
  // Re-enter details clears every bank answer, because a saved account cannot be changed in part. The old account stays saved until a new one is.
  function reenterBank() {
    const a = Object.assign({}, state.a);
    const touched = Object.assign({}, state.touched);
    BANK_KEYS.forEach((k) => { a[k] = ""; delete touched[k]; });
    setState({ bankEditing: true, a, touched, tried: Object.assign({}, state.tried, { 4: false }), revealed: Object.assign({}, state.revealed, { accountNumber: false }) });
  }
  function cancelBankEdit() {
    const a = Object.assign({}, state.a, state.bankSaved ? state.bankSaved.values : {});
    const touched = Object.assign({}, state.touched);
    BANK_KEYS.forEach((k) => { delete touched[k]; });
    setState({ bankEditing: false, a, touched, tried: Object.assign({}, state.tried, { 4: false }) });
  }
  const next = () => {
    if (state.step < 7 && blockedByProblems()) return;
    if (state.step === 4 && bankFormOn()) {
      if (Object.keys(stepErrors(4, false)).length) return;
      setState({ bankSaved: snapshotBank(), bankEditing: false, step: 5 });
      showToast("Bank account saved");
      return;
    }
    if (state.step < 7) { setState({ step: state.step + 1 }); return; }
    if (stepGaps().length) return;
    attempt(() => setState({ screen: "submitted", submittedAt: stampDate() + ", " + new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZoneName: "short" }) }));
  };
  const editFromReview = (step) => setState({ step, editing: true, saveOpen: false });
  const saveEdit = () => {
    if (state.step === 4 && bankFormOn()) {
      if (Object.keys(stepErrors(4, false)).length) return;
      setState({ bankSaved: snapshotBank(), bankEditing: false, step: 7, editing: false });
      return;
    }
    setState({ step: 7, editing: false });
  };
  const back = () => (state.step <= 1 ? setState({ screen: "bizType" }) : setState({ step: state.step - 1 }));

  // Legal structure choices (decision company-structure-nine-types). Each maps to one ODIN ownership type; sole proprietor, tax-exempt and government come from the card and the pills.
  const NONPROFIT_TYPES = ["Tax-exempt", "Government body"];
  const companyStructures = () => isCa()
    ? ["Private corporation", "Public corporation (publicly traded)", "Private partnership", "Public partnership (publicly traded)", "Limited liability partnership (LLP)"]
    : ["Private corporation", "Public corporation (publicly traded)", "Private partnership", "Public partnership (publicly traded)", "Limited liability company (LLC)", "Limited liability partnership (LLP)"];
  const BIZ_TYPES = [
    { id: "company", label: "Company", desc: "A registered business, such as an LLC, corporation or partnership." },
    { id: "individual", label: "Individual or sole proprietor", desc: "You run the business yourself and haven't registered it as a company or corporation." },
    { id: "non-profit", label: "Non-profit or government", desc: "Charitable organizations, foundations, non-governmental organizations and government bodies." }
  ];
  // An LLC does not exist in Canada, so the Company card leaves it out there (decision ca-company-card-no-llc).
  const bizDesc = (t) => (t.id === "company" && isCa() ? "A registered business, such as a corporation or partnership." : t.desc);
  // Changing your mind wipes what was entered for the old type, so nothing that
  // doesn't apply to the new one is left behind.
  function chooseBizType(t) {
    if (state.bizType === t) return;
    if (state.bizType) resetData();
    setState({
      screen: "bizType",
      bizType: t,
      // Only a sole proprietor starts with a person listed (themselves). Everyone else adds the owners, since the applicant is often not one.
      owners: t === "individual" ? [{ id: 1, name: "You", initials: "?", pct: 100, role: "Owner", status: "pending", self: true }] : state.owners.map((o) => (t === "non-profit" && o.me && o.added ? Object.assign({}, o, { role: "Director", pct: 10 }) : o)),
      a: Object.assign({}, state.a, t === "individual" ? { structure: "Sole proprietor" } : t === "non-profit" ? { structure: "" } : {})
    });
  }
  const openHelp = () => setState({ helpOpen: true });
  const closeHelp = () => setState({ helpOpen: false });
  const openSave = () => { if (state.screen !== "invitee" && blockedByProblems()) return; setState({ saveOpen: true }); };
  // An owner can be sent a link to fill in their own details (decision 69). A sent owner needs only a name and share from the applicant.
  const nowTime = () => new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const openDelegate = (target) => { const o = state.owners.filter((x) => x.id === target)[0]; setState({ delegateOpen: true, delegateTarget: target, delegateEmail: (o && o.inviteEmail) || "", delegateErr: "" }); };
  const closeDelegate = () => setState({ delegateOpen: false });
  // Simulated email: nothing is sent. The real product creates a sign-in for this person and emails a temporary password.
  // What is wrong with an invite address, if anything (decision invite-email-checks). Whether the address already has an ODIN user is not something the prototype can know.
  function inviteEmailProblem(raw) {
    const email = raw.trim();
    if (!email) return "";
    if (!SAVE_EMAIL_OK.test(email)) return "Enter an email like name@example.com.";
    const same = (x) => String(x || "").trim().toLowerCase() === email.toLowerCase();
    if (state.owners.some((o) => o.self && same(ownerVal(o, "email"))) || same(state.a.email)) return "That's your own email. Use Add myself as an owner instead.";
    if (state.owners.some((o) => o.id !== state.delegateTarget && o.status === "invited" && same(o.inviteEmail))) return "That address is already invited for another owner.";
    return "";
  }
  function sendDelegate() {
    const email = state.delegateEmail.trim();
    const problem = !email ? "Enter an email like name@example.com." : inviteEmailProblem(email);
    if (problem) { setState({ delegateErr: problem }); return; }
    const t = state.owners.filter((x) => x.id === state.delegateTarget)[0];
    const changing = !!t && t.status === "invited";
    setState({ delegateOpen: false, openOwner: state.openOwner === state.delegateTarget ? 0 : state.openOwner, owners: state.owners.map((x) => (x.id === state.delegateTarget ? Object.assign({}, x, { status: "invited", inviteEmail: email, signedIn: false, received: false, revoked: false }) : x)) });
    if (changing) showToast("Invite sent to " + email + " instead", "The old one no longer works."); else showToast("Invite sent to " + email, "You can carry on with the rest in the meantime.");
  }
  // The card's actions menu (decision owner-actions-menu). Cancel invite before they have signed in, Remove access after, Remove owner at any time.
  const closeMenu = () => setState({ menuOwner: 0 });
  const ownerById = (id) => state.owners.filter((x) => x.id === id)[0];
  function resendInvite(id) {
    const o = ownerById(id);
    setState({ menuOwner: 0 });
    showToast("Invite sent again to " + (o && o.inviteEmail ? o.inviteEmail : "that address"));
  }
  function cancelInvite(id) {
    const o = ownerById(id);
    setState({ menuOwner: 0, owners: state.owners.map((x) => (x.id === id ? Object.assign({}, x, { status: "pending", inviteEmail: "", signedIn: false, received: false, revoked: false }) : x)) });
    showToast("Invite to " + (o && o.inviteEmail ? o.inviteEmail : "them") + " canceled");
  }
  const askConfirm = (kind, id) => setState({ menuOwner: 0, confirm: { kind: kind, id: id } });
  const closeConfirm = () => setState({ confirm: null });
  // Removing access keeps the card and everything typed into it (PRD FR-07); the applicant can fill in the rest.
  function revokeAccess() {
    const id = state.confirm && state.confirm.id;
    const o = ownerById(id);
    if (!o) { closeConfirm(); return; }
    setState({ confirm: null, owners: state.owners.map((x) => (x.id === id ? Object.assign({}, x, { status: "pending", revoked: true }) : x)) });
    showToast("Removed access for " + (ownerInfo(o).name === "New owner" ? "them" : ownerInfo(o).name), "What they entered stays.");
  }
  // Someone who has signed in may have typed things, so removing them asks first (decision remove-access-vs-owner).
  function removeOwnerClick(id) {
    const o = ownerById(id);
    if (o && o.signedIn) askConfirm("owner", id); else removeOwner(id);
  }
  // Deleting an owner also drops what was typed into their card and any ID file.
  function removeOwner(id) {
    const o = state.owners.filter((x) => x.id === id)[0];
    if (!o) return;
    const name = ownerInfo(o).name;
    const a = Object.assign({}, state.a);
    Object.keys(a).forEach((k) => { if (k.indexOf("o" + id + "_") === 0) delete a[k]; });
    const docs = Object.assign({}, state.docs); delete docs["id_" + id];
    setState({ owners: state.owners.filter((x) => x.id !== id), a: a, docs: docs, openOwner: state.openOwner === id ? 0 : state.openOwner, menuOwner: 0, confirm: null });
    showToast("Removed " + name);
  }
  // What the person who gets the link sees. Prototype only: the real page is the recipient's own session.
  // Prototype only: signing in as the invitee also marks them Signed in on the applicant's card.
  const previewInvitee = (id) => setState({ screen: "invitee", inviteStep: 0, inviteOwner: id, openOwner: id, returnTo: { screen: state.screen, step: state.step }, owners: state.owners.map((x) => (x.id === id ? Object.assign({}, x, { signedIn: true }) : x)) });
  // Simulated concurrent edit (prototype only): pretend the first invited person saved this step while the applicant was on it (decision concurrent-edit-notice).
  function simulateEdit() {
    const o = state.owners.filter((x) => x.status === "invited")[0];
    if (!o || state.screen !== "flow" || (state.step !== 2 && state.step !== 6)) return;
    const n = ownerInfo(o).name;
    setState({ protoOpen: false, stepEdit: { step: state.step, by: n !== "New owner" ? n : o.inviteEmail, at: nowTime() } });
  }
  const leaveInvitee = () => { const r = state.returnTo || { screen: "flow", step: 2 }; setState({ screen: r.screen, step: r.step, returnTo: null }); };
  const finishInvitee = () => setState({ inviteStep: 2, owners: state.owners.map((x) => (x.id === state.inviteOwner ? Object.assign({}, x, { received: true, receivedAt: nowTime() }) : x)) });
  const closeSave = () => setState({ saveOpen: false });
  // Save & Exit means the applicant is leaving, so the dialog's primary button signs them out: back to the sign-in screen with the password cleared. Their answers are already saved (decision save-exit-sign-out).
  const signOut = () => setState({ screen: "login", loginStage: "credentials", loginErr: "", loginPassword: "", saveOpen: false });
  const toggleReveal = (id) => setState((s) => ({ revealed: Object.assign({}, s.revealed, { [id]: !s.revealed[id] }) }));
  function cardOpen(key, dflt) {
    const v = state.openCards[key];
    return v === undefined ? dflt : v;
  }
  const toggleCard = (key, dflt) => setState((s) => ({
    openCards: Object.assign({}, s.openCards, { [key]: !(s.openCards[key] === undefined ? dflt : s.openCards[key]) })
  }));
  // A document row holds a list of files, and any number can be added (decision document-add-file-grid). A row counts as done once one file has finished uploading.
  const doc = (key) => { const d = state.docs[key]; const files = d && d.files ? d.files : []; const ready = files.filter((f) => !f.busy && !f.failed); return { files: files, state: ready.length ? "done" : files.some((f) => f.busy) ? "uploading" : files.length ? "failed" : "idle", file: ready.length ? ready[0].name : "" }; };
  const setDocFiles = (key, fn) => setState((s) => ({ docs: Object.assign({}, s.docs, { [key]: { files: fn((s.docs[key] && s.docs[key].files) || []) } }) }));
  // Simulated upload: no file picker opens and no file is read. The file shows as uploading for a moment, then as uploaded.
  function upload(key, file) {
    // A failed file has no buttons, so adding another file is the retry and clears the old failure from the row (decision upload-failure-callout).
    const have = doc(key).files.filter((f) => !f.failed).map((f) => f.name);
    let i = 1, name = file;
    while (have.indexOf(name) > -1) { i++; name = file.replace(/(\.[a-z0-9]+)?$/i, "-" + i + "$1"); }
    // With the Prototype options box ticked, this one upload fails once and the box clears itself.
    const fail = state.failNextUpload === true;
    if (fail) setState({ failNextUpload: false });
    setDocFiles(key, (fs) => fs.filter((f) => !f.failed).concat([{ name: name, busy: true }]));
    setTimeout(() => setDocFiles(key, (fs) => fs.map((f) => (f.name === name ? { name: name, busy: false, failed: fail } : f))), 1400);
  }

  // ---------------------------------------------------------------------------
  // Owners
  // ---------------------------------------------------------------------------

  const OWNER_SEED = {
    self: { name: "Dana R. Whitfield", dob: "04 / 11 / 1986", home: "92 NE Bryce St, Portland, OR 97212", email: "dana@riversidepilates.com", phone: "+1 (503) 555-0148" },
    other: { name: "Marcus J. Lee", dob: "09 / 10 / 1979", home: "1408 SE Belmont St, Portland, OR 97214", email: "marcus@riversidepilates.com", phone: "+1 (503) 555-0192" }
  };
  const US_STATES = ["Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "District of Columbia", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"];
  // The applicant's own country comes first (decision country-list-own-first).
  // Every country and territory with an ISO 3166-1 code (249), for Nationality and Country of residence (decision all-countries-no-other). No "Other". Names are the common English ones, with "and" for "&".
  const ALL_COUNTRIES = ["Afghanistan", "Albania", "Algeria", "American Samoa", "Andorra", "Angola", "Anguilla", "Antarctica", "Antigua and Barbuda", "Argentina", "Armenia", "Aruba", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bermuda", "Bhutan", "Bolivia", "Caribbean Netherlands", "Bosnia and Herzegovina", "Botswana", "Bouvet Island", "Brazil", "British Indian Ocean Territory", "British Virgin Islands", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cambodia", "Cameroon", "Canada", "Cape Verde", "Cayman Islands", "Central African Republic", "Chad", "Chile", "China", "Christmas Island", "Cocos (Keeling) Islands", "Colombia", "Comoros", "Congo (Democratic Republic)", "Congo (Republic)", "Cook Islands", "Costa Rica", "Côte d'Ivoire", "Croatia", "Cuba", "Curaçao", "Cyprus", "Czechia", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Falkland Islands", "Faroe Islands", "Fiji", "Finland", "France", "French Guiana", "French Polynesia", "French Southern Territories", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Gibraltar", "Greece", "Greenland", "Grenada", "Guadeloupe", "Guam", "Guatemala", "Guernsey", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Heard Island and McDonald Islands", "Holy See (Vatican City)", "Honduras", "Hong Kong", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Isle of Man", "Israel", "Italy", "Jamaica", "Japan", "Jersey", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kosovo", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Macao", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Martinique", "Mauritania", "Mauritius", "Mayotte", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Montserrat", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", "New Caledonia", "New Zealand", "Nicaragua", "Niger", "Nigeria", "Niue", "Norfolk Island", "North Korea", "North Macedonia", "Northern Mariana Islands", "Norway", "Oman", "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Pitcairn Islands", "Poland", "Portugal", "Puerto Rico", "Qatar", "Réunion", "Romania", "Russia", "Rwanda", "Saint Barthélemy", "Saint Helena", "Saint Kitts and Nevis", "Saint Lucia", "Saint Martin", "Saint Pierre and Miquelon", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "São Tomé and Príncipe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Sint Maarten", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Georgia and the South Sandwich Islands", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Svalbard and Jan Mayen", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tokelau", "Tonga", "Trinidad and Tobago", "Tunisia", "Türkiye", "Turkmenistan", "Turks and Caicos Islands", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "United States Minor Outlying Islands", "United States Virgin Islands", "Uruguay", "Uzbekistan", "Vanuatu", "Venezuela", "Vietnam", "Wallis and Futuna", "Western Sahara", "Yemen", "Zambia", "Zimbabwe", "Åland Islands"].sort((a, b) => a.localeCompare(b, "en"));
  // The applicant's own country first (decision country-list-own-first), then the rest A to Z.
  const allCountries = () => { const home = isCa() ? "Canada" : "United States"; return [home].concat(ALL_COUNTRIES.filter((c) => c !== home)); };
  const countries = () => (isCa() ? ["Canada", "United States", "United Kingdom", "Australia", "Other"] : ["United States", "Canada", "United Kingdom", "Australia", "Other"]);
  // Date order follows the region, so the placeholder is the instruction.
  const datePh = () => (isCa() ? "DD / MM / YYYY" : "MM / DD / YYYY");
  const addressPh = () => (isCa() ? "Street, city, province, postal code" : "Street, city, state, ZIP");

  // Dates are typed as digits and laid out as they go in, in the region's order, so the slashes are never the applicant's job.
  // "3/5/1990" is read as 03 / 05 / 1990 rather than as digits 351990.
  const DATE_KEYS = ["dob", "idExpiry", "incorporated"];
  const isDateKey = (id) => DATE_KEYS.indexOf(String(id).replace(/^o\d+_/, "")) > -1;
  function formatDateInput(raw) {
    let t = String(raw);
    const m = t.match(/^(\d{1,2})\D+(?:(\d{1,2})\D+)?(\d{0,4})$/);
    if (m && (m[2] !== undefined || /^\d\D+$/.test(t))) t = (m[1].length < 2 ? "0" + m[1] : m[1]) + (m[2] !== undefined ? (m[2].length < 2 ? "0" + m[2] : m[2]) : "") + m[3];
    const d = digitsOf(t).slice(0, 8);
    return d.slice(0, 2) + (d.length > 2 ? " / " + d.slice(2, 4) : "") + (d.length > 4 ? " / " + d.slice(4) : "");
  }
  // What is wrong with a date, or "" if it is a real date that makes sense for what it is. Month and day follow the region's order.
  function dateProblem(key, value) {
    const d = digitsOf(value);
    if (d.length !== 8) return "Enter the full date as " + datePh() + ".";
    const ca = isCa();
    const day = parseInt(ca ? d.slice(0, 2) : d.slice(2, 4), 10), month = parseInt(ca ? d.slice(2, 4) : d.slice(0, 2), 10), year = parseInt(d.slice(4), 10);
    if (month < 1 || month > 12) return "Enter a month from 01 to 12. This field uses " + datePh() + ".";
    if (day < 1 || day > new Date(year, month, 0).getDate()) return "Enter a day that exists in that month. This field uses " + datePh() + ".";
    const when = new Date(year, month - 1, day), today = new Date(); today.setHours(0, 0, 0, 0);
    if (year < 1900) return "Enter a year from 1900 onward.";
    if (key === "idExpiry" ? when < today : when > today) return key === "idExpiry" ? "This ID has expired. Use one that is still valid." : "That date is in the future.";
    return "";
  }

  // Pre-filled answers for each owner. Owners added during the session start
  // empty apart from neutral defaults.
  // 18000 -> 18,000; leaves anything that is not a plain number alone.
  const fmtMoney = (s) => { const n = String(s).replace(/,/g, ""); return /^\d+(\.\d+)?$/.test(n) ? Number(n).toLocaleString("en-US") : String(s); };
  const digitsOf = (s) => String(s == null ? "" : s).replace(/\D/g, "");
  // Phone number component (decision phone-input-component). One value per field, kept as "+code 000 000 0000" so everything that reads it carries on working.
  // The country is chosen from a list; the number box takes digits only and spaces them as the applicant types.
  const PHONE_COUNTRIES = [["US", "\u{1F1FA}\u{1F1F8}", "United States", "1"], ["CA", "\u{1F1E8}\u{1F1E6}", "Canada", "1"], ["GB", "\u{1F1EC}\u{1F1E7}", "United Kingdom", "44"], ["AU", "\u{1F1E6}\u{1F1FA}", "Australia", "61"], ["NZ", "\u{1F1F3}\u{1F1FF}", "New Zealand", "64"], ["FR", "\u{1F1EB}\u{1F1F7}", "France", "33"], ["DE", "\u{1F1E9}\u{1F1EA}", "Germany", "49"], ["IE", "\u{1F1EE}\u{1F1EA}", "Ireland", "353"], ["IT", "\u{1F1EE}\u{1F1F9}", "Italy", "39"], ["NL", "\u{1F1F3}\u{1F1F1}", "Netherlands", "31"], ["ES", "\u{1F1EA}\u{1F1F8}", "Spain", "34"], ["MX", "\u{1F1F2}\u{1F1FD}", "Mexico", "52"], ["IN", "\u{1F1EE}\u{1F1F3}", "India", "91"]];
  const phoneParts = (id, v) => {
    const s = String(v == null ? "" : v).trim();
    const m = /^\+(\d{1,3})[\s(](.*)$/.exec(s);
    const code = m ? m[1] : null;
    const home = isCa() ? "CA" : "US";
    const pick = (state.phoneIso || {})[id];
    let c = PHONE_COUNTRIES.find((x) => x[0] === pick && (!code || x[3] === code));
    if (!c && code) c = PHONE_COUNTRIES.find((x) => x[3] === code && x[0] === home) || PHONE_COUNTRIES.find((x) => x[3] === code) || ["", "\u{1F310}", "Other", code];
    if (!c) c = PHONE_COUNTRIES.find((x) => x[0] === home);
    return { iso: c[0], flag: c[1], name: c[2], code: c[3], digits: digitsOf(m ? m[2] : s) };
  };
  // Flags: the Atlas Flag artwork (assets/flags, exported from the Atlas Phone input page) for the eight countries Atlas draws, and the emoji flag for the rest until Atlas adds them (decision atlas-phone-input-one-box).
  const ATLAS_FLAGS = ["US", "GB", "AU", "NZ", "FR", "DE", "IE", "ES"];
  const flagView = (iso, emoji) => (ATLAS_FLAGS.indexOf(iso) > -1 ? html`<img class="flag" src="assets/flags/${iso.toLowerCase()}.svg" alt="" width="16" height="16">` : html`<span class="flag flag--emoji" aria-hidden="true">${emoji}</span>`);
  const phoneCap = (code) => (code === "1" ? 10 : 12);
  const phoneFmt = (code, d) => [d.slice(0, 3), d.slice(3, 6), d.slice(6)].filter(Boolean).join(" ");
  const phoneJoin = (code, d) => (d ? "+" + code + " " + phoneFmt(code, d) : "");

  // What is wrong with an EIN or business number, or "" if it is fine. Used by the field's validation (decision ein-in-registered-details).
  // A Canadian BN is often printed with a program account, such as 123456789RT0001. Only the first 9 digits are the BN, so the
  // two letters and four digits are dropped (decision ca-bn-program-account). Anything else is returned unchanged for the digit check.
  const bnCore = (value) => { const m = isCa() && /^\s*(\d{9})\s*[A-Za-z]{2}\s*\d{4}\s*$/.exec(String(value)); return m ? m[1] : value; };
  function einProblem(raw) {
    const value = bnCore(raw);
    // An EIN or business number is nine digits, so a short or long one is caught here.
    if (/^\s*\d{3}[- ]\d{2}[- ]\d{4}\s*$/.test(value)) {
      return "That looks like a Social Security number, which we don't need here. " + (isCa() ? "A business number" : "An EIN") + " looks like " + (isCa() ? "123456789" : "12-3456789") + ". Not sure whether you have one? Use Get help and we'll talk it through.";
    }
    if (digitsOf(value).length !== 9) {
      return "Enter all 9 digits of your " + (isCa() ? "business number" : "EIN") + ". You've entered " + digitsOf(value).length + ".";
    }
    return "";
  }

  // ---------------------------------------------------------------------------
  // Validation. Pure reads of state: returns { fieldId: message } for a step.
  // Format checks are deliberately lenient (digits only, no checksums) because
  // this is a prototype, but they catch the slips a real person makes.
  // Values are only ever read, never written into markup; html`` escapes them.
  // ---------------------------------------------------------------------------

  // The date shown with the submitted time (decision content-audit-should-fix), for example "Nov 13, 2026".
  const stampDate = () => new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  // A field's label as it reads inside "Enter ..." and "Choose ..." messages (decision content-audit-should-fix): the acronym if the label ends in one
  // (Social Security Number (SSN) reads "SSN"), otherwise the label with a lowercase first letter. A label that does not read cleanly that way returns "".
  const askPhrase = (f) => {
    const l = String((f && f.label) || "").replace(/\s*\((required|optional)\)\s*$/i, "").trim();
    const ac = /\(([A-Z]{2,6})\)\s*$/.exec(l);
    if (ac) return ac[1];
    if (!/^([A-Z]{2,}|[A-Z][a-z'’]*)( ([a-z'’-]+|[A-Z]{2,}))*$/.test(l)) return "";
    return /^[A-Z]{2,}\b/.test(l) ? l : l.charAt(0).toLowerCase() + l.slice(1);
  };

  function fieldError(f) {
    // The EIN or business number is checked whenever something is typed, even for a sole proprietor, where it is optional.
    if (f.id === "ein" && !f.disabled && String(f.value).trim()) { const p = einProblem(f.value); if (p) return p; }
    if (!f.required || f.disabled) return "";
    const v = f.value;
    if (f.kind === "check") return v === true ? "" : "Tick this to finish this step.";
    if (f.kind === "yn") return v ? "" : "Choose yes or no.";
    if (f.kind === "pills") return v ? "" : (askPhrase(f) ? "Choose " + askPhrase(f) + "." : "Choose one.");
    if (f.kind === "select") return v ? "" : (askPhrase(f) ? "Choose " + askPhrase(f) + "." : "Choose one.");
    if (f.kind === "combo") return v ? "" : "Choose the closest business category.";
    if (f.kind === "masked" && String(v).indexOf("•") > -1) return "";
    if (!String(v).trim()) return f.id === "ecomUrl" ? "Enter the website or app address where customers pay." : f.id === "countries" ? "Choose at least one country." : f.id === "achAvg" ? "Enter your average " + (isCa() ? "EFT" : "ACH") + " payment amount." : (askPhrase(f) ? "Enter " + askPhrase(f) + "." : "Fill this in to finish this step.");
    const key = f.id.replace(/^o\d+_/, "");
    const d = digitsOf(v);
    const ca = isCa();
    // An address is complete once it has a street, city, state or province, and ZIP or postal code (decision address-split-fields).
    if (f.kind === "address") { const p = addrOf(f.id, v); if (!p.l1.trim() || !p.city.trim() || !p.region.trim() || !p.postal.trim()) return "Fill in the street, city, " + (ca ? "province and postal code." : "state and ZIP code."); }
    if (key === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(v).trim())) return "Enter an email like name@example.com.";
    if (key === "phone") { const pp = phoneParts(f.id, v); if (pp.digits.length < (pp.code === "1" ? 10 : 6)) return "Enter the full number, including the area code."; }
    if (DATE_KEYS.indexOf(key) > -1) { const p = dateProblem(key, v); if (p) return p; }
    if (key === "natId" && d.length !== 9) return ca ? "Enter all 9 digits of your SIN." : "Enter all 9 digits of your SSN.";
    if (key === "routing" && d.length !== 9) return "Enter all 9 digits of your routing number.";
    if (key === "institution" && d.length !== 3) return "Enter all 3 digits of your institution number.";
    if (key === "transit" && d.length !== 5) return "Enter all 5 digits of your transit number.";
    if (key === "accountNumber" && (d.length < (ca ? 7 : 4) || d.length > (ca ? 12 : 17))) return ca ? "Enter your account number. It has 7 to 12 digits." : "Enter your account number. It has up to 17 digits.";
    if (key === "pct" || key === "cpSplit") {
      const n = parseFloat(v);
      if (!isFinite(n) || n < 0 || n > 100) return "Enter a number from 0 to 100.";
      // Only owners with 25% or more are listed (decision owner-share-minimum).
      // The person filling out the form has to be added whatever their share (decision self-owner-required), so their share only has to be above zero.
      const selfOwner = state.owners.some((o) => o.self && f.id.indexOf("o" + o.id + "_") === 0);
      if (key === "pct" && selfOwner && n <= 0) return "Enter the share you own, even if it's under 25%.";
      if (key === "pct" && !selfOwner && n < 25) return "Enter 25 or more. We need owners who hold 25% or more.";
    }
    if (f.kind === "currency" && !(parseFloat(String(v).replace(/,/g, "")) > 0)) return "Enter an amount greater than zero.";
    // The biggest single sale cannot be smaller than the average one. Only checked once both amounts are in.
    if (f.id === "maxTicket") {
      const avg = parseFloat(String(state.a.avgTicket || "").replace(/,/g, ""));
      if (avg > 0 && parseFloat(String(v).replace(/,/g, "")) < avg) return "Your largest payment can't be smaller than your average payment of $" + fmtMoney(state.a.avgTicket) + " " + (ca ? "CAD" : "USD") + ".";
    }
    return "";
  }

  // True when a required field has simply not been answered yet. That is not an error until the final submit (decision errors-only-for-bad-entries):
  // only an answer that is there but wrong (a bad email, a short number) is a problem the applicant has to fix before saving.
  function fieldMissing(f) {
    if (!f.required || f.disabled) return false;
    const v = f.value;
    if (f.kind === "check") return v !== true;
    if (f.kind === "yn" || f.kind === "pills" || f.kind === "select" || f.kind === "combo") return !v;
    if (f.kind === "masked" && String(v).indexOf("•") > -1) return false;
    if (f.kind === "address") { const p = addrOf(f.id, v); return !p.l1.trim() || !p.city.trim() || !p.region.trim() || !p.postal.trim(); }
    return !String(v).trim();
  }

  // With problemsOnly, answers that are missing are left out and only bad entries come back.
  function stepErrors(step, problemsOnly, tally) {
    const errs = {};
    // tally, when given, counts the answers this step needs and how many are in (decision step-percent-done).
    const unit = (needed, have) => { if (tally && needed) { tally.total++; if (have) tally.done++; } };
    const add = (f) => { if (f && f.required && !f.disabled) unit(true, !fieldError(f)); if (f) { const m = fieldError(f); if (m && !(problemsOnly && fieldMissing(f))) errs[f.id] = m; } };
    const a = state.a;
    const owners = state.owners.map((o) => Object.assign({}, o, ownerInfo(o)));

    if (step === 2 && state.screen === "invitee") {
      // The recipient fills in their own whole card.
      state.owners.filter((o) => o.id === state.inviteOwner).forEach((o) => ownerFields(o).forEach(add));
    } else if (step === 2) {
      // Every owner has to be added. A pending owner needs everything; one who has been sent a link needs nothing from the applicant.
      state.owners.forEach((o) => { if (o.status === "pending") ownerFields(o).forEach(add); });
      const total = owners.reduce((x, o) => x + o.pct, 0);
      unit(true, owners.length > 0);
      // The person filling out the form must be one of the owners, whatever their share (decision self-owner-required).
      if (!isSole() && !state.owners.some((o) => o.self)) { if (!problemsOnly) errs.owners = "Add yourself to finish this step. You're filling out this application, so we need your details" + (isNonprofit() ? "." : ", even if you own less than 25%."); }
      else if (!owners.length) { if (!problemsOnly) errs.owners = "Add the " + (isNonprofit() ? "people who run the organization" : "owners") + " to finish this step."; }
      else if (!isCompany()) { /* ownership percentages only apply to companies */ }
      else if (total > 100) errs.ownership = "Ownership comes to more than 100%. Check each owner's percentage.";
    }
    if (step === 6 || step === 7) {
      // An invited owner is not asked for at step 2 (the applicant can carry on), but their details and ID are needed before step 6 and 7 can pass (decision invite-no-exemption).
      state.owners.forEach((o) => { if (o.status === "invited") ownerFields(o).forEach(add); });
      docListFor(owners, isCa()).forEach((d) => {
        unit(!d.skip && d.requirement === "Required", doc(d.key).state === "done");
        if (!problemsOnly && !d.skip && d.requirement === "Required" && doc(d.key).state !== "done") errs["doc_" + d.key] = "Add this file to finish this step.";
      });
    }
    // Signing is the last thing on the last step (decisions sign-back-on-step-7, docusign-sign-in-modal). It only counts once our system has confirmed it. The person who was sent the application signs, so there is no name or title to fill in (decision docusign-signer-is-the-recipient).
    if (step === 7) {
      unit(true, signedConfirmed());
      if (!signedConfirmed() && !problemsOnly) errs.sign = "Sign the agreement to submit your application.";
    }
    // A saved payout account counts every one of its answers as in (decision bank-saved-as-account).
    if (step === 4 && !bankFormOn() && tally) { const n = isCa() ? 7 : 6; tally.total += n; tally.done += n; }
    // Every card counts, including the step 1 sections still hidden behind the business lookup (decision business-lookup-typeahead).
    cardsFor(step, true).forEach((c) => c && c.fields.forEach(add));
    return errs;
  }

  // How much of a step is done, as a whole percent. It is the share of the answers the step needs that are in and valid, and only reaches 100 when the step has no problems at all.
  function stepPct(step) {
    const tally = { total: 0, done: 0 };
    const errs = stepErrors(step, false, tally);
    if (!Object.keys(errs).length) return 100;
    return tally.total ? Math.min(99, Math.floor((tally.done / tally.total) * 100)) : 0;
  }

  // The same tally as stepPct, as counts: how many answers the step needs and how many are in. A step with no problems reports every answer as done (decision summary-counts-only).
  // Time left (decision minutes-left-per-field): 15 seconds for every answer still needed across all seven steps, and the figure only moves once another 6 answers are in, so it does not flicker on every keystroke.
  const SECONDS_PER_ANSWER = 15, ANSWERS_PER_TICK = 4;
  function minutesLeft() {
    let total = 0, done = 0;
    for (let n = 1; n <= 7; n++) { const c = stepCount(n); total += c.total; done += c.done; }
    const shown = Math.max(0, total - Math.floor(done / ANSWERS_PER_TICK) * ANSWERS_PER_TICK);
    return Math.max(1, Math.ceil((shown * SECONDS_PER_ANSWER) / 60));
  }
  // Minutes for a step in the list (decision time-per-field-step-list): 15 seconds for every field the step holds, at least 1 minute.
  const stepMinutes = (n) => Math.max(1, Math.round((stepCount(n).total * SECONDS_PER_ANSWER) / 60)) + " min";
  function stepCount(step) {
    const tally = { total: 0, done: 0 };
    const complete = !Object.keys(stepErrors(step, false, tally)).length;
    return { total: tally.total, done: complete ? tally.total : tally.done, complete };
  }

  // Errors on show for the current step. Empty until the first attempt, then
  // live, so each message clears the moment its field is put right.
  let ERR = {};
  // One error line for every field and screen: the Atlas helper row is an error icon plus the message (decision atlas-sweep-top-three).
  const errMsg = (text) => html`<p class="field-error" role="alert">${icon("alert", 16)}<span>${text}</span></p>`;
  const errView = (key) => ERR[key] && errMsg(ERR[key]);

  // The three name boxes start from the one name the seed data and a sole proprietor's step 1 name give: first word, last word, anything between.
  function splitName(full) {
    const t = String(full || "").trim().split(/\s+/).filter(Boolean);
    return { first: t[0] || "", middle: t.length > 2 ? t.slice(1, -1).join(" ") : "", last: t.length > 1 ? t[t.length - 1] : "" };
  }
  function ownerDefaults(o) {
    const d = ownerDefaultsBase(o);
    return Object.assign(d, splitName(d.name));
  }
  function ownerDefaultsBase(o) {
    const country = isCa() ? "Canada" : "United States";
    const base = { role: o.role, pct: o.pct ? String(o.pct) : "", nationality: "", residence: "", idType: "", idCountry: "" };
    if (o.added || !isSample()) {
      // A sole proprietor is their own owner, so their business name and address are offered back. A sole proprietor's email and phone are offered back too, since they are the owner; for anyone else they are not carried over from step 1, because the applicant is often not an owner.
      // Everything stays editable. Country of residence and of the ID follow the region, since most people hold both locally.
      const me = !!o.me || (!!o.self && !o.added);
      return Object.assign(base, {
        name: isSole() && o.self ? (state.a.legalName || "") : "", dob: "",
        home: me && isSole() ? (state.a.regAddress || "") : "",
        email: me && (isSole() || o.me) ? (state.a.email || "") : "", phone: me && (isSole() || o.me) ? (state.a.phone || "") : "",
        idNumber: "", idExpiry: "", pep: "", natId: "",
        residence: me ? country : "", idCountry: me ? country : ""
      });
    }
    const p = Object.assign({}, o.self ? OWNER_SEED.self : OWNER_SEED.other, isCa() ? (o.self ? CA_OWNER_SEED.self : CA_OWNER_SEED.other) : {});
    return Object.assign(base, {
      nationality: country, residence: country,
      idType: "Driver's " + licWord(), idCountry: country,
      name: p.name, dob: p.dob, home: p.home, email: p.email, phone: p.phone,
      idNumber: isCa() ? "4471208" : "OR4471208", idExpiry: "04 / 11 / 2029", pep: "no",
      natId: isCa() ? "••• ••• 418" : "412-88-7193"
    });
  }
  function ownerVal(o, key) {
    // The full name is built from the first, middle and last name boxes (decision owner-name-three-fields), so everything that reads "name" keeps working.
    if (key === "name") return ["first", "middle", "last"].map((k) => String(ownerVal(o, k) || "").trim()).filter(Boolean).join(" ");
    const v = state.a["o" + o.id + "_" + key];
    return v !== undefined ? v : ownerDefaults(o)[key];
  }
  function initialsOf(name) {
    const parts = name.split(/\s+/).filter(Boolean);
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
  }
  // Header details follow what's typed into the owner's fields, so the
  // ownership bar adds up the percentages actually entered.
  function ownerInfo(o) {
    const n = parseFloat(ownerVal(o, "pct"));
    const typed = ownerVal(o, "name").trim();
    return {
      pct: isFinite(n) ? n : 0,
      name: typed || o.name,
      initials: typed ? initialsOf(typed) : o.initials,
      role: ownerVal(o, "role") || o.role
    };
  }
  const fmtPct = (n) => String(Math.round(n * 100) / 100);

  // One line for the review list. Says nothing until the declarations have been
  // answered, rather than claiming a clean record nobody has given yet.
  function declarationsSummary(a, ca) {
    const asked = [a.legalProceedings, a.priorTermination, a.taxLiens].concat(ca ? [] : [a.msb]);
    if (asked.some((v) => !v)) return "";
    return asked.every((v) => v === "no") ? "All answers No" : "Declarations made";
  }

  // ---------------------------------------------------------------------------
  // Field + card models
  // ---------------------------------------------------------------------------

  function fld(id, label, kind, o) {
    o = o || {};
    const raw = state.a[id];
    return {
      id, label, kind,
      value: o.disabled ? false : (o.locked !== undefined ? o.locked : (raw !== undefined ? raw : (o.dflt !== undefined ? o.dflt : ""))),
      disabled: !!o.disabled,
      // A text box that shows a fixed value and cannot be typed in (the website box once "I don't have a website" is ticked).
      locked: o.locked !== undefined,
      span: !!o.span,
      // A field on its own row at half the width of the row (decision ecommerce-url-half-width).
      half: !!o.half,
      annual: !!o.annual, annualLabel: o.annualLabel || "",
      // An optional amount that is stored as 0 when left empty (the ACH or EFT volume; decision ach-volume-defaults-zero).
      zero: !!o.zero,
      tall: !!o.tall,
      // A tick box shown in line, to the right of the box (the website and SSN boxes; decision tick-beside-field). tickHalf gives the box half the width and the tick the other half.
      tick: o.tick || null,
      tickHalf: !!o.tickHalf,
      unsure: !!o.unsure,
      // No "Optional" tag: a field without the red asterisk is optional (decision 96).
      chip: "",
      // Only Optional fields are tagged. A field that appears because of an earlier answer (conditional) is required like any other, since it is only shown when it applies.
      required: !o.optional,
      hint: o.hint || "",
      why: o.why || "",
      viewKey: o.viewKey || "",
      placeholder: o.placeholder || "",
      sensitive: !!o.sensitive,
      maskShort: !!o.maskShort,
      prefix: o.prefix || "$",
      options: o.options || [],
      revealed: !!state.revealed[id],
      focused: document.activeElement ? document.activeElement.id === "f-" + id : false
    };
  }

  function card(key, title, note, fields, o) {
    o = o || {};
    const all = fields.filter(Boolean);
    const collapsible = !!o.collapsible;
    const open = collapsible ? cardOpen(key, !!o.openByDefault) : true;
    return {
      key, title, note: note || "",
      fields: open ? all : [],
      isOpen: open, collapsible,
      toggleLabel: open ? "Hide" : "Show " + all.length + (all.length === 1 ? " field" : " fields"),
      toggle: () => toggleCard(key, !!o.openByDefault),
      assurance: open ? (o.assurance || "") : "",
      foot: o.foot || null,
      onRemove: o.onRemove || null,
      pinId: o.pinId || ""
    };
  }

  function ownerFields(o) {
    return ownerFieldList(o).filter(Boolean);
  }
  function ownerFieldList(o) {
    const p = "o" + o.id + "_";
    const d = ownerDefaults(o);
    const ca = isCa();
    const f = (key, label, kind, opts) => fld(p + key, label, kind, Object.assign({ dflt: d[key] }, opts));
    const sub = (key, label) => ({ id: p + "hdg_" + key, label: label, kind: "heading", required: false });
    return [
      sub("personal", "Personal details"),
      // First and last name are required, the middle name is not (decision owner-name-three-fields). Together they are the name on the ID.
      f("first", "First name", "text", { placeholder: "As printed on their ID" }),
      f("middle", "Middle name", "text", { optional: true }),
      f("last", "Last name", "text", { placeholder: "As printed on their ID" }),
      // Their place in the business: title, then ownership percentage (decision owner-personal-details-grouped). Title is free text for every business type (decision owner-title-free-text); a sole proprietor starts with Owner and 100%, both editable.
      f("role", "Title or role", "text", { placeholder: "For example, Director" }),
      isNonprofit() ? null : f("pct", "Ownership percentage", "text", { placeholder: "For example, 40", hint: isSole() ? "" : (o && o.self ? "Enter your share, even if it's under 25%." : "We need owners who hold 25% or more.") }),
      // Facts about the person.
      f("dob", "Date of birth", "mono", { placeholder: datePh() }),
      f("nationality", "Nationality", "select", { placeholder: "Choose a country", options: allCountries() }),
      f("residence", "Country of residence", "select", { placeholder: "Choose a country", options: allCountries() }),
      f("home", "Home address", "address", { span: true, placeholder: addressPh() }),
      // Email and phone close Personal details; there is no separate How to reach them section (decision owner-form-two-sections).
      f("email", "Email address", "text", { placeholder: "name@example.com" }),
      f("phone", "Phone number", "phone", { placeholder: "555 123 4567" }),
      sub("id", "Identity verification"),
      f("idType", "Government ID type", "select", { placeholder: "Choose an ID type", options: ["Driver's " + licWord(), "Passport", "National ID card"] }),
      f("idNumber", "Government ID number", "masked", { sensitive: true, placeholder: "For example, D1234567" }),
      f("idExpiry", "ID expiry date", "mono", { placeholder: datePh() }),
      f("idCountry", "ID issuing country", "select", { placeholder: "Choose a country", options: countries() }),
      // Non-profits and government bodies are not asked for an SSN or SIN (decision nonprofit-no-national-id).
      // Ticking the box under it fills the number with zeros and locks it, like the website box (decision no-ssn-tick). The locked value is never real PII, only zeros.
      isNonprofit() ? null : f("natId", ca ? "Social Insurance Number (SIN)" : "Social Security Number (SSN)", "masked", {
        sensitive: true,
        locked: ownerVal(o, "noNatId") === true ? noNatIdValue() : undefined,
        // Two thirds wide, the box taking half of it and the tick the other half (decision tick-beside-field).
        span: true, tickHalf: true,
        tick: f("noNatId", ca ? "This person doesn't have a SIN" : "This person doesn't have an SSN", "check", { optional: true, dflt: false }),
        placeholder: ca ? "000 000 000" : "000-00-0000"
      }),
      // Full row, so it starts on a new line below the SSN or SIN (decision owner-form-two-sections).
      f("pep", "Is this person a politically exposed person?", "yn", {
        span: true,
        hint: "A PEP holds, or has held, a senior public role: head of state, senior official, judge, senior military."
      })
    ];
  }

  const einField = (ca) => fld("ein", ca ? "Business Number (BN)" : "Employer Identification Number (EIN)", "mono", {
    optional: isSole(),
    placeholder: ca ? "123456789" : "12-3456789",
    // No hint about the number's shape in the US, and none under the legal name or registered address (decision field-helper-text-trims).
    hint: [isSole() && "If you have one.", ca && "Enter the first 9 digits only. Leave off RT0001 or similar.", isSole() && "If you don't, you'll give your " + (ca ? "SIN" : "SSN") + " in step 2 instead."].filter(Boolean).join(" ")
  });

  // With the lookup on, the rest of step 1 stays hidden until a business is picked or the applicant chooses to enter details manually. A business whose name is already in (a returning applicant, or after Search again) keeps the sections (decision business-lookup-typeahead).
  const lookupGate = () => ctx.lookup === LOOKUP_ON && !isSole();
  // findRevealed is set once a business is picked or manual entry is chosen and never cleared, so the sections do not vanish if the name is later emptied or the search is reopened.
  const lookupDone = () => state.findRevealed || String(state.a.legalName || "").trim() !== "";
  // all: every card, even the ones still hidden, so the step's progress counts their fields.
  function cardsFor(step, all) {
    const a = state.a;
    const ca = isCa();
    if (step === 1) {
      // The lookup is optional help, not a required answer, so it never counts towards the step. A sole proprietor is a person, not a registered business, so is not offered it.
      const find = lookupGate() ? card("s1-find", "Find your business", "Search for it by name and we'll fill in the name and address. You can change anything we fill in.", [
        fld("bizFind", "Business name", "bizfind", { optional: true, span: true })
      ], { pinId: "business-lookup-typeahead" }) : null;
      if (find && !all && !lookupDone()) return [find];
      return [
        find,
        card("s1-reg", isSole() ? "Your details" : "Registered details", "Enter these as they appear on " + (isSole() ? "your tax records." : "your registration."), [
          fld("legalName", isSole() ? "Your full legal name" : "Legal " + orgWord() + " name", "text", { span: isSole() || isNonprofit(), placeholder: isSole() ? "As it appears on your tax records" : isNonprofit() ? "For example, Riverside Community Foundation" : "For example, Riverside Pilates LLC" }),
          // The EIN or business number is typed here like any other detail; nothing is looked up from it (decision ein-in-registered-details). A company or non-profit has to give one; a sole proprietor may not have one.
          // Doing business as is required for every business type, and a sole proprietor's Trading name too (decision dba-required).
          isCompany() ? fld("dba", "Doing business as (DBA)", "text", { placeholder: "For example, Riverside Pilates" }) : einField(ca),
          isCompany() ? einField(ca) : fld("dba", isSole() ? "Trading name" : "Doing business as (DBA)", "text", { placeholder: "For example, Riverside Pilates" }),
          isSole() ? null : fld("incorporated", isNonprofit() ? "Date registered" : "Date of incorporation", "mono", { placeholder: datePh() }),
          ca || isSole() ? null : fld("stateInc", isNonprofit() ? "State registered in" : "State of incorporation", "select", { placeholder: "Choose a state", options: US_STATES })
        ]),
        card("s1-addr", "Addresses", "", [
          fld("regAddress", isSole() ? "Business address" : "Registered or legal address", "address", { span: true, placeholder: addressPh(), hint: isSole() ? "Where your business is based. If you work from home, this can be your home address." : "" }),
          fld("tradingSame", "Is that also where you operate?", "yn", { span: true }),
          a.tradingSame === "no" ? fld("tradingAddress", "Trading / physical address", "address", { span: true, conditional: true, placeholder: addressPh() }) : null
        ]),
        card("s1-contact", "How we reach you", isNonprofit() ? "For account notices and questions from the people paying you. We won't add you to any marketing." : "For account notices and customer questions. We won't add you to any marketing.", [
          fld("phone", isNonprofit() ? "Organization phone number" : "Business phone number", "phone", { placeholder: "555 123 4567" }),
          fld("email", isNonprofit() ? "Organization email address" : "Business email address", "text", { placeholder: isNonprofit() ? "hello@yourorganization.org" : "hello@yourbusiness.com" }),
          // The website is required. A business with none ticks the box, which fills the box with N/A and locks it (decision website-required-with-none-box).
          fld("website", "Primary website URL", "text", { span: true, locked: a.noWebsite === true ? NO_WEBSITE : undefined, placeholder: isNonprofit() ? "yourorganization.org" : "yourbusiness.com", tick: fld("noWebsite", "I don't have a website", "check", { optional: true }) })
        ]),
        card("s1-desc", isNonprofit() ? "What the organization does" : "What the business sells", "", [
          // The list holds only the codes set up for the applicant's division (decision mcc-from-division).
          fld("category", "Merchant category code (MCC)", "combo", { span: true, placeholder: "Search by name or code", hint: html`Pick the closest match from the list. Not sure which one fits? Search by a word that describes what you sell, like "fitness" or "retail".` })
        ], { pinId: "no-mcc-picker" })
      ];
    }
    if (step === 2) {
      // A sole trader is the only owner and signs for themselves, so there is nothing to ask.
      // In Slice 1 one person fills in the whole form and signs, so nobody is asked who signs (decision slice-1-no-signer-question). Slice 2 keeps the card.
      if (isSole() || !invitesOn()) return [];
      return [
        card("s2-sig", "Who'll be signing?", isNonprofit() ? "The signatory is the person who signs the agreement for the organization." : "It doesn't have to be the biggest owner.", [
          fld("sigSame", "Will you be signing it yourself?", "yn", { span: true }),
          a.sigSame === "no" ? fld("sigName", "Authorized signatory full legal name", "text", { span: true, conditional: true, placeholder: "As printed on their ID" }) : null,
          a.sigSame === "no" ? fld("sigTitle", "Title", "text", { conditional: true, placeholder: "For example, Director" }) : null
        ], { assurance: "You'll sign at step 7, and nothing's binding until you type your name there." })
      ];
    }
    if (step === 3) {
      // The average ACH or EFT payment amount is asked only once an ACH or EFT volume above 0 has been entered (decisions ach-count-when-volume, ach-average-and-yearly).
      const achOn = parseFloat(String(a.achVolume || "").replace(/,/g, "")) > 0;
      // E-commerce channels ask for the address where customers pay (decision ecommerce-channel-url).
      const ecomOn = ["E-commerce (online)", "In-person and e-commerce"].indexOf(a.channel) > -1;
      return [
        card("s3-vol", "Your card volumes", "Best guesses are fine.", [
          fld("monthlyVolume", "Estimated monthly card volume", "currency", { placeholder: "40,000", annual: true }),
          fld("cpSplit", "Card present percentage", "mono", { placeholder: "70", tall: true, hint: "In person, on a card machine." }),
          fld("avgTicket", "Average payment amount", "currency", { placeholder: "38" }),
          fld("maxTicket", "Largest single payment", "currency", { placeholder: "1,200", hint: isNonprofit() ? "Your largest single payment or donation, even if it only happens now and then." : "Your largest single payment, even if it only happens now and then." }),
          fld("prior", "Have you accepted card payments before?", "yn", { span: true }),
          a.prior === "yes" ? fld("priorName", "Prior processor name", "text", { conditional: true, placeholder: "For example, Square, Stripe" }) : null,
          a.prior === "yes" ? fld("priorCbRatio", "Chargeback ratio at prior processor", "mono", { conditional: true, placeholder: "0.4%" }) : null
        ], { pinId: "underwriting-plain" }),
        card("s3-sell", isNonprofit() ? "How you take payments" : "How you sell", "", [
          fld("channel", isNonprofit() ? "How do people pay you?" : "How do customers pay you?", "select", { placeholder: "Choose one", options: ["In-person", "E-commerce (online)", "In-person and e-commerce", "Mobile", "Phone / mail order (MOTO)"] }),
          fld("goods", isNonprofit() ? "What people pay or give for" : "Type of goods or services", "select", { placeholder: "Choose a type", options: isNonprofit() ? ["Donations", "Tickets and events", "Memberships and subscriptions", "Services", "Physical goods", "Mixed"] : ["Services", "Services and subscriptions", "Physical goods", "Digital goods", "Mixed"] }),
          ecomOn ? fld("ecomUrl", isNonprofit() ? "Website or app where people pay" : "Website or app where customers pay", "text", { half: true, conditional: true, dflt: a.website && a.website !== NO_WEBSITE ? a.website : "", placeholder: isNonprofit() ? "yourorganization.org/donate" : "yourbusiness.com/shop" }) : null,
          fld("recurring", isNonprofit() ? "Recurring donations or memberships?" : "Recurring billing or subscriptions?", "yn"),
          fld("trial", "Free trial or deferred billing?", "yn"),
          fld("marketplace", isNonprofit() ? "Do you take payments on behalf of other organizations?" : "Do you take payments on behalf of other businesses?", "yn", { span: true, hint: (isNonprofit() ? "For example, chapters, member groups or fundraisers collecting through you." : "For example, contractors or instructors who invoice through you.") + " If you say yes, we have to ask for more details." }),
          fld("international", isNonprofit() ? "Do you take payments from outside " + (ca ? "Canada" : "the US") + "?" : "Do you sell outside " + (ca ? "Canada" : "the US") + "?", "yn"),
          a.international === "yes" ? fld("countries", isNonprofit() ? "Countries payments come from" : "Countries sold to", "multi", { conditional: true, span: true, placeholder: "Search for a country" }) : null,
          fld("refundPolicy", "Refund or return policy URL", "text", { span: true, optional: true, placeholder: isNonprofit() ? "yourorganization.org/refunds" : "yourbusiness.com/refunds", hint: "A clear policy helps if a customer disputes a payment. Leave it blank if you don't have one." })
        ]),
        ca
          ? card("s3-ach", "Bank transfer volumes", "Only if you'll also take direct debits.", [
              fld("achVolume", "Estimated monthly EFT volume", "currency", { optional: true, zero: true, placeholder: "10,000", annual: true, annualLabel: "Yearly EFT volume" }),
              achOn ? fld("achAvg", "Average EFT payment amount", "currency", { conditional: true, placeholder: "250" }) : null
            ])
          : card("s3-ach", "Bank transfer volumes", "Only if you'll also take ACH payments.", [
              fld("achVolume", "Estimated monthly ACH volume", "currency", { optional: true, zero: true, placeholder: "10,000", annual: true, annualLabel: "Yearly ACH volume" }),
              achOn ? fld("achAvg", "Average ACH payment amount", "currency", { conditional: true, placeholder: "250" }) : null
            ])
      ];
    }
    if (step === 4) {
      const bankFields = (p, main) => ca
        ? [
            fld(p + "bankName", "Bank name", "text", { placeholder: "For example, RBC Royal Bank" }),
            fld(p + "bankNickname", "Bank account nickname", "text", { placeholder: "For example, Restaurant bank account", hint: "The name for this account in Xplor Pay. It can differ from the bank’s." }),
            fld(p + "accountHolder", "Account holder name", "text", { placeholder: "Exactly as it appears on the account" }),
            fld(p + "accountType", "Account type", "select", { placeholder: "Choose an account type", options: ["Business chequing", "Business savings"] }),
            fld(p + "institution", "Institution number", "masked", { sensitive: true, maskShort: true, placeholder: "3 digits" }),
            fld(p + "transit", "Transit number", "masked", { sensitive: true, maskShort: true, placeholder: "5 digits" }),
            fld(p + "accountNumber", "Account number", "masked", { sensitive: true, placeholder: "7 to 12 digits" })
          ]
        : [
            fld(p + "bankName", "Bank name", "text", { placeholder: "For example, Umpqua Bank" }),
            fld(p + "bankNickname", "Bank account nickname", "text", { placeholder: "For example, Restaurant bank account", hint: "The name for this account in Xplor Pay. It can differ from the bank’s." }),
            fld(p + "accountHolder", "Account holder name", "text", { placeholder: "Exactly as it appears on the account" }),
            fld(p + "accountType", "Account type", "select", { placeholder: "Choose an account type", options: ["Business checking", "Business savings"] }),
            fld(p + "routing", "ABA routing number", "masked", { sensitive: true, maskShort: true, placeholder: "9 digits" }),
            fld(p + "accountNumber", "Account number (up to 17 digits)", "masked", { sensitive: true, placeholder: "Up to 17 digits" })
          ];
      // Once the account is saved the form gives way to the saved account card (bankSavedView, decision bank-saved-as-account).
      if (!bankFormOn()) return [];
      return [
        card("s4-manual", "Payout account", "", bankFields("", true), {
          pinId: "bank-no-debit",
          // The orange notice lives inside the card, below the fields, where the grey lock note used to be (decision bank-notice-inside-card).
          foot: bankNoticeView()
        })
      ];
    }
    if (step === 5) {
      return [
        card("s5-dec", "Declarations", "", [
          fld("legalProceedings", "Are there any legal proceedings involving the business right now?", "yn", { span: true }),
          a.legalProceedings === "yes" ? fld("legalProceedingsWhy", "Tell us a bit about it", "long", { span: true, conditional: true, placeholder: "A sentence or two is fine." }) : null,
          fld("priorTermination", "Has a payment provider ever ended your agreement to take card payments?", "yn", { span: true }),
          a.priorTermination === "yes" ? fld("priorTerminationWhy", "Provider, date and reason", "long", { span: true, conditional: true, placeholder: "A sentence or two is fine." }) : null,
          fld("taxLiens", ca ? "Any outstanding tax debts owed to the CRA, or court judgments?" : "Any outstanding tax liens or judgments?", "yn", { span: true }),
          a.taxLiens === "yes" ? fld("taxLiensWhy", "Amount and current status", "long", { span: true, conditional: true, placeholder: "How much, and where it stands now." }) : null,
          ca ? null : fld("msb", "Are you a money service business?", "yn", { span: true, hint: "Check cashing, money transfer, currency exchange or cryptocurrency. Most businesses aren't." })
        ], { pinId: "yes-is-not-no" }),
        card("s5-consent", ca ? "A consent we have to collect" : "Two consents we have to collect", "", [
          fld("matchConsent", "I agree to a check of the card networks' list of businesses whose card payment agreements were ended", "check", { span: true, hint: "Also called a MATCH check, or a Terminated Merchant File (TMF) check. Mastercard requires it for every merchant account." }),
          ca ? null : fld("ofacAck", "I understand we'll check your name against the US government sanctions list", "check", { span: true, hint: "Known as screening by the Office of Foreign Assets Control (OFAC). Every US merchant goes through it." })
        ], { assurance: ca ? "This is a consent, not a credit check. It doesn't touch your personal credit score." : "These are consents, not credit checks. Neither one touches your personal credit score." })
      ];
    }
    return [];
  }

  function whyFor(step, ca) {
    return {
      1: { t: "Why are we asking?", b: "We need to see that the " + orgWord() + " really exists and that its name, number and address all line up. Type these details as they appear on your registration.", p: ["We use these to confirm the " + orgWord() + " exists", "Typing them as they appear on your registration avoids questions later"] },
      2: { t: "Why are we asking?", b: isNonprofit() ? "Anti-money-laundering rules mean the people who run an organization, such as directors or trustees, have to be named and identified, along with whoever signs the agreement. We have to ask for this. We also need to know who is filling out this application, so please add yourself." : "Anti-money-laundering rules mean anyone controlling 25% or more of a business has to be named and identified, along with whoever signs the agreement. We have to ask for this. We also need to know who is filling out this application, so please add yourself, even if you own less than 25%.", p: [(isNonprofit() ? "" : (ca ? "SIN" : "SSN") + " and ") + "ID numbers go straight to Trulioo, our verification partner", "Never stored on Xplor systems, never visible to Xplor staff", "Owners can fill in their own part by link, so you're never blocked"] },
      3: { t: "Why are we asking?", b: "This isn't a credit check. Your answers help us see what a normal day looks like for you.", p: ["Best guesses are expected, and nothing here is a commitment", "Telling us the history now is faster than us finding it later", "None of it changes the rate you pay"] },
      4: { t: "Why are we asking?", b: ca ? "This is the account your payouts are paid into. We ask for proof of it in step 6, then check it after you submit." : "This is the account your payouts are paid into. Trulioo, our verification partner, checks it after you submit, so your payouts go where they should.", p: ["We may take fees, chargebacks and refunds from it", "You can change this account later", "Extra accounts are optional and can be added after approval"] },
      5: { t: "Why are we asking?", b: "Card networks and regulators require these exact questions on every application. If you answer yes to any of them, a person reviews your application.", p: ["Consents shown here are not credit checks", "None of this affects your personal credit score", "You can explain anything in your own words"] },
      6: { t: "Why are we asking?", b: "Documents are how Trulioo, our verification partner, confirms the details you've given are real. Add each file we ask for.", p: ["Stored encrypted", "Shared only with your verification partner", "Swap out or delete any file before you submit"] },
      7: { t: "What gets sent", b: "One package: your " + orgWord() + " record, the identity and sanctions checks we've already run, " + (isNonprofit() ? "who runs the organization" : "ownership") + ", bank verification, your declarations and the signed agreement.", p: ["Anything missing comes back as one clear request", "A signed copy of the agreement is emailed to you"] }
    }[step];
  }

  function docListFor(owners, ca, idOnly) {
    const a = state.a;
    // A government photo ID is asked for each person listed at step 2 (decision photo-id-asked-at-step-6, which replaces id-only-when-trulioo-cannot-match).
    const idRows = owners.map((o) => ({
      key: "id_" + o.id, title: "Government photo ID for " + o.name, requirement: "Required",
      hint: (o.status === "invited" ? "They can add this, or you can. " : "") + "Passport or driver's " + licWord() + ". Include all four corners and avoid glare.",
      file: "id-" + o.id + "-license.jpg",
    }));
    if (idOnly) return idRows;
    // An invited owner's ID row stays: they or the applicant can add it, and step 6 and 7 wait for it (decision invite-no-exemption).
    const list = idRows.slice();
    // The EIN letter (US) and the CRA business number confirmation (Canada) are no longer asked for: Trulioo validates the number (decision ein-bn-document-removed).
    // Canada only (decision ca-bank-proof-row): Trulioo does not verify Canadian bank accounts, so the applicant adds one proof of the payout account. The US account is verified without a document (decision bank-verified-by-trulioo).
    if (ca) list.push({ key: "bank", title: "Bank account verification", requirement: "Required", hint: "Any one of these: a void cheque with your " + orgWord() + " name and account details printed on it, a letter from your bank, or a recent bank statement.", file: "void-cheque.pdf" });
    if (!ca) {
      list.push({ key: "w9", title: "W-9 tax certification", requirement: "Required", hint: "Upload your signed Form W-9.", file: "w9-uploaded.pdf" });
    }
    if (a.prior === "yes") list.push({ key: "stmt", title: "Last 3 months of processing statements", requirement: "Required", hint: "Because you've processed cards before, we need your last 3 months of processing statements from " + (a.priorName || "your prior processor") + ". They help us judge risk.", file: "prior-processor-statement.pdf" });
    // Division rows (decision clubready-lease-by-division; Club Essentials and its financial history row were removed, see club-essentials-financial-history). Wording is a draft, not approved copy.
    if (ctx.division === DIV_CLUBREADY && !isNonprofit()) list.push({ key: "lease", division: DIV_CLUBREADY, title: "Signed lease, business " + licWord() + " or utility bill", requirement: "Required", hint: "Your club's signed lease. If you don't have one yet, a business " + licWord() + " or a utility bill in the " + orgWord() + " name works.", file: "club-lease.pdf" });
    return list;
  }

  // Flat view model, mirroring the design's renderVals().
  function vals() {
    const st = state;
    const a = st.a;
    const ca = isCa();
    const isFlow = st.screen === "flow";
    const isWelcome = st.screen === "welcome";
    const isBizType = st.screen === "bizType";
      const isStatus = ["submitted", "rfi", "approved"].indexOf(st.screen) > -1;
    const cur = STEPS[st.step - 1];
    const progStep = st.editing ? 7 : st.step;
    // The bar is the average of the seven steps' own percentages; a step not yet opened counts as nothing (decision step-percent-done).
    const pct = isStatus ? 100 : Math.round([1, 2, 3, 4, 5, 6, 7].reduce((x, n) => x + (n <= Math.max(st.maxStep, st.step) ? stepPct(n) : 0), 0) / 7);
    const owners = st.owners.map((o) => Object.assign({}, o, ownerInfo(o)));
    const ownedPct = owners.reduce((x, o) => x + o.pct, 0);
    // Nobody is owed after submit: step 6 and 7 do not pass until every owner's details and ID are in, including invited owners (decision invite-no-exemption).
    const invitedLeft = [];
    const settled = owners.length - invitedLeft.length;
    // One owner and nobody being chased: the applicant's own ID, or the only person they listed, is the only one to check.
    const solo = owners.length === 1 && (owners[0].self || owners[0].status !== "invited");
    const cards = isFlow ? cardsFor(st.step).filter(Boolean) : [];
    const docList = docListFor(owners, ca);
    // The recipient's owner form (preview) is step 2 shown outside the flow, so it is checked the same way.
    const errStep = isFlow ? st.step : (st.screen === "invitee" && st.inviteStep === 1 ? 2 : 0);
    const allErrs = errStep ? stepErrors(errStep) : {};
    ERR = {};
    // A field left empty shows nothing: required answers are only enforced at the final submit. A bad entry shows once the field is left or a save is attempted.
    // On the last step an attempt shows everything still needed.
    const badOnes = errStep ? stepErrors(errStep, true) : {};
    Object.keys(allErrs).forEach((k) => { if ((st.tried[errStep] && (errStep === 7 || badOnes[k])) || (st.touched[k] && badOnes[k])) ERR[k] = allErrs[k]; });
    // Steps 1 to 6 continue whether or not they are complete (decision partial-steps-allowed); only the final submit waits for every answer. The reasons
    // are shown on the fields themselves, as each is left (see touched), not on the button. Only bad entries are; missing answers are not.
    const stepComplete = !errStep || Object.keys(allErrs).length === 0;
    // What is still needed, in the applicant's own words, for the hover note on the disabled button (decision 78).
    const labelOf = { signatoryName: "Signatory name", signatoryTitle: "Signatory title", sign: "Sign the agreement" };
    cards.forEach((c) => c.fields.forEach((f) => { labelOf[f.id] = f.label; }));
    if (errStep === 2) st.owners.forEach((o) => { const n = String(ownerInfo(o).name || "").trim(); ownerFields(o).forEach((f) => { labelOf[f.id] = (n && n !== "New owner" ? n : "Owner") + ": " + f.label; }); });
    docList.forEach((d) => { labelOf["doc_" + d.key] = "File: " + d.title; });
    const missing = [];
    Object.keys(allErrs).forEach((k) => {
      let m = labelOf[k] || allErrs[k];
      // An invited owner's gaps collapse to who is being waited on, so the note can point at the card.
      const om = /^o(\d+)_/.exec(k) || /^doc_id_(\d+)$/.exec(k);
      const inv = om && st.owners.filter((x) => String(x.id) === om[1] && x.status === "invited")[0];
      if (inv && errStep !== 2) { const n = String(ownerInfo(inv).name || "").trim(); m = "Waiting on " + (n && n !== "New owner" ? n : "your invited owner") + ": " + (k.indexOf("doc_") === 0 ? "photo ID" : "their details"); }
      if (missing.indexOf(m) < 0) missing.push(m);
    });
    // On the final step, earlier steps left partly done hold the submit back and are named in the hover note.
    const gaps = isFlow && st.step === 7 ? stepGaps() : [];
    gaps.slice().reverse().forEach((n) => missing.unshift("Step " + n + ", " + stepName(STEPS[n - 1]) + ", is only partly done"));
    // Step 4 is the one step that holds Save and continue back until every field is in, because the back end only stores a complete bank account (decision bank-saved-as-account).
    const canNext = !isFlow ? stepComplete : (st.step === 7 ? stepComplete && gaps.length === 0 : st.step === 4 ? stepComplete : true);
    // The signatory follows the step 2 answer unless edited on step 7.
    const selfOwner = owners.filter((o) => o.self)[0];
    const defaultSigner = a.sigSame === "no" ? (a.sigName || "") : (ownerVal(st.owners[0] || {}, "name") || "");
    const signatoryName = a.signatoryName !== undefined ? a.signatoryName : defaultSigner;
    const signatoryTitle = a.signatoryTitle !== undefined ? a.signatoryTitle : (a.sigSame === "no" ? (a.sigTitle || "") : (((selfOwner || st.owners[0]) || {}).role || ""));
    // "Signed by" is only true once our system has confirmed the signature in the Docusign window.
    const signedNow = !!signatoryName.trim() && signedConfirmed();

    return {
      ca, isWelcome, isBizType, isFlow, isStatus, cur, pct, owners, cards, docList,
      isInvitee: st.screen === "invitee",
      inviteDocs: docListFor(owners, ca, true).filter((d) => d.key === "id_" + st.inviteOwner),
      invitedOwners: invitedLeft,
      why: whyFor(st.step, ca),
      signatoryName, signatoryTitle,
      needRegistration: (ca ? "Your CRA business number, plus the legal name, registered address and registration date as they appear on your registration." : "Your EIN, plus the legal name, registered address and incorporation details as they appear on your registration.") + " You'll also choose your merchant category from a short list.",
      needIds: "You, as the person filling out this application, and owners with 25% or more (or directors and trustees, for a non-profit)" + (invitesOn() ? " and whoever signs" : "") + ": their title, " + (ca ? "a driver's licence or passport and a SIN. For a non-profit or government body, we need each person's title, address and a driver's licence or passport." : "a driver's license or passport and an SSN. For a non-profit or government body, we need each person's title, address and a driver's license or passport.") + (invitesOn() ? " If it's easier, they can fill in their own details." : " You fill this in for everyone, so have it all ready."),
      needBank: ca ? "Your institution, transit and account numbers, plus a photo ID for each owner and proof of your bank account." : "Your routing and account numbers, plus a photo ID for each owner and a signed W-9.",
      shellRailNote: isStatus ? "Submitted to our verification partner" : "Step " + progStep + " of 7 · about " + minutesLeft() + " min left",
      remainingLabel: "About " + minutesLeft() + (minutesLeft() === 1 ? " minute" : " minutes") + " left",
      stepCounter: "Step " + st.step + " of 7",
      stepTitle: {
        1: isNonprofit() ? "Tell us about your organization" : "Tell us about your business", 2: isSole() ? "Tell us about you" : isNonprofit() ? "Who runs the organization?" : "Who owns the business?",
        3: "How you'll take payments", 4: "Where should we send your money?",
        5: "A few questions we have to ask", 6: "The documents we need to verify your details",
        7: "One last look, then you're done"
      }[st.step],
      stepSubtitle: {
        1: "",
        2: (isSole() ? "As a sole proprietor you're the only owner, so this is just you. We need these details to check who you are." : isNonprofit() ? "Add yourself first, because you're filling out this application. Then add the other people who run the organization, such as directors or trustees" + (invitesOn() ? ". You can also send them a link to fill in their own details." : ".") : "Add yourself first, because you're filling out this application, even if you own less than 25%. Then add everyone else who owns 25% or more" + (invitesOn() ? ". You can also send them a link to fill in their own details." : ".")),
        3: "A few questions about your sales. Rough estimates are absolutely fine, and nothing here changes your rate.",
        4: st.bankSaved && !st.bankEditing ? "This is the account your payouts go to. Once you're approved, you can add more accounts." : "Add the account your payouts should go to. We need every detail before we can save it. Once you're approved, you can add more accounts.",
        5: "Every application includes these. If you answer yes to any of them, a person reviews your application.",
        6: "Add each file we ask for.",
        7: "Check everything you've told us. When you sign, we send everything at once."
      }[st.step],
      stepComplete: stepComplete,
      canNext: canNext,
      missing: missing,
      // Review and sign waits until every earlier step is complete, so nobody signs off an incomplete application (decision docusign-sign-needs-complete-application).
      signHold: gaps.map((n) => "Step " + n + ", " + stepName(STEPS[n - 1]) + ", is only partly done"),
      nextLabel: st.step === 7 ? "Submit for verification" : "Save and continue",
      submitNote: "We send one complete package to Trulioo, our verification partner, when you submit.",
      saveProgressNote: isWelcome ? "You haven't started yet, so there's nothing to lose." : "Last saved on step " + st.step + ", a moment ago.",
      // The ownership card shows how many owners are listed, and All listed only once the shares pass 75% (decision ownership-no-question). Nothing asks whether anyone is missing.
      ownersOver100: ownedPct > 100,
      ownersAllListed: ownedPct > 75 && ownedPct <= 100 && owners.length > 0,
      ownershipNote: ownedPct > 100
        ? "The shares come to more than 100%. Have another look at each owner's percentage."
        : ownedPct > 75
          ? "Everyone who owns 25% or more is listed. Anyone else owns less than 25%, so we don't need them."
          : "Add yourself, then everyone else who owns 25% or more.",
      ownersIdLabel: solo ? (owners[0].self ? "Your own ID is the only one to check" : "The only ID is in and being checked") : settled === owners.length ? "Every ID is in and being checked" : settled + " of " + owners.length + " IDs in",
      // The status screens name the owners actually entered, never the sample people.
      payoutAccountLabel: st.bankSaved ? st.bankSaved.values.bankNickname + " •••• " + bankLast4(st.bankSaved.values.accountNumber) : a.bankName ? a.bankName + " •••• " + (bankLast4(a.accountNumber) || "4417") : "Not set",
      submittedWhen: st.submittedAt ? st.submittedAt : "just now",
      checkNote: "Checking " + [!isSole() && "your " + orgWord() + " details", "who you are", "your bank account", "sanctions lists"].filter(Boolean).join(", ").replace(/, ([^,]*)$/, " and $1"),
      receivedNote: st.submittedAt ? "Sent to our verification partner on " + st.submittedAt : "Sent to our verification partner",
      // Each row on the last step says only how many answers are in, "N of M done" (decision summary-counts-only).
      summary: [
        { label: isNonprofit() ? "Organization and address" : "Business and address", step: 1 },
        { label: step2Name(), step: 2 },
        { label: "How you take payments", step: 3 },
        { label: "Payout account", step: 4 },
        { label: "Compliance declarations", step: 5 },
        { label: "Supporting documents", step: 6 }
      ].map((r) => {
        const c = stepCount(r.step);
        return { label: r.label, step: r.step, value: c.done + " of " + c.total + " done", partial: !c.complete, pct: stepPct(r.step) };
      })
    };
  }

  // ---------------------------------------------------------------------------
  // Views
  // ---------------------------------------------------------------------------

  // Show only the last four characters of a sensitive value.
  // The bank numbers (decision bank-numbers-masked) hide a value of four characters or fewer completely, so the 3-digit institution number is not left in plain sight.
  function maskValue(s, all) {
    if (all && typeof s === "string" && s.length > 0 && s.length <= 4) return s.replace(/[^ ]/g, "•");
    return typeof s === "string" && s.length > 4 ? s.slice(0, s.length - 4).replace(/[^ ]/g, "•") + s.slice(-4) : s;
  }

  // The asterisk is decorative; screen readers get the word.
  const REQ = html`<span class="req-star" aria-hidden="true">*</span><span class="sr-only"> (required)</span>`;

  // Under a sensitive field: "Why we ask" (question icon) and "Encrypted" (padlock), side by side in the same style. Each opens a popover on hover or focus, same pattern as the step-level note (decisions field-why-popover, encrypted-beside-why-we-ask).
  function fieldWhyView(f) {
    const trig = (key, iconName, label, body) => {
      const open = () => setState({ fieldWhy: key });
      const close = () => { if (state.fieldWhy === key) setState({ fieldWhy: "" }); };
      return html`<span class="field-why" data-key="${key}" data-mouseenter="${on(open)}" data-mouseleave="${on(close)}"><button type="button" class="field-why-trigger" aria-expanded="${String(state.fieldWhy === key)}" data-click="${on(open)}" data-focus="${on(open)}" data-blur="${on(close)}">${icon(iconName, 14, "i-accent")}${label}</button>${state.fieldWhy === key && html`<span class="field-why-pop" role="note"><span class="field-why-body">${body}</span></span>`}</span>`;
    };
    return html`<div class="field-meta">${f.why && trig(f.id, "help", "Why we ask", f.why)}</div>`;
  }
  // Draft wording, not reviewed by security (see decision encrypted-lock-tooltip).
  const ENCRYPTED_NOTE = "We encrypt this number as it travels and while it's stored. Once you leave the field only the last four characters show, and you can choose to show or hide the rest. It goes to Trulioo, our verification partner, to check who you are.";

  // The step 1 business lookup (decision business-lookup-typeahead). The typed text goes only to the fixed list above; nothing leaves the page.
  let findTimer = 0;
  function bizFindView() {
    // The link that calls this one disappears when the search box comes back, so focus goes to the box (decision lookup-focus-after-reset).
    const reset = () => {
      setState({ findPicked: null, findManual: false, findQ: "", findSearched: "", findResults: [], findOpen: false, findBusy: false });
      setTimeout(() => { const el = document.getElementById("f-bizFind"); if (el) el.focus(); }, 60);
    };
    if (state.findPicked) {
      const x = state.findPicked;
      return html`<div class="callout callout--positive find-picked" role="status" data-key="find-picked">${icon("circle-check", 16)}<div class="callout-content"><div class="callout-text"><strong class="callout-title">${x.name}</strong><span>${x.address}.${x.reg ? " Registration number " + x.reg + "." : ""} We filled in the name and address below. Check they match your registration.</span></div><div class="callout-actions"><button type="button" class="btn btn-outline btn-small" data-click="${on(reset)}">Search again</button></div></div></div>`;
    }
    if (state.findManual) {
      return html`<p class="small-note find-manual-note" data-key="find-manual">You're entering your details yourself. <button type="button" class="btn-link" data-click="${on(reset)}">Search for my business instead</button></p>`;
    }
    const typed = state.findQ.trim().length >= 3;
    // Opening the box before typing lists a few businesses; from three characters the list is the search.
    // Canada searches when the applicant presses Search or Enter, not as they type: Trulioo's Business Search page does not describe search-as-you-type (decision ca-business-search).
    const caSearch = isCa();
    const open = state.findOpen && (!caSearch || !!state.findSearched);
    const region = findRegionCode();
    const rows = caSearch ? (state.findSearched && !state.findBusy ? state.findResults.slice(0, 5) : []) : !typed ? suggestBiz(region) : state.findBusy ? [] : state.findResults.slice(0, 5);
    const total = rows.length + 1; // the last row is always "Can't find it?"
    const idx = Math.min(state.findIdx, total - 1);
    // The search box disappears when a result is picked or the manual route is chosen, so focus is sent on to the next control (decision lookup-focus-after-pick).
    const focusLater = (find) => setTimeout(() => { const el = find(); if (el) el.focus(); }, 60);
    const manual = () => { setState({ findManual: true, findRevealed: true, findOpen: false }); focusLater(() => document.getElementById("f-legalName")); };
    const pick = (x) => {
      // Fills the legal name and the registered address and opens the address boxes so the parts can be checked. Nothing else is filled in.
      setState((s) => ({
        findPicked: x, findRevealed: true, findOpen: false, findQ: "", findSearched: "", findResults: [], findBusy: false,
        a: Object.assign({}, s.a, { legalName: x.name, regAddress: x.address }),
        addrParts: Object.assign({}, s.addrParts, { regAddress: addrParse(x.address) }),
        addrManual: Object.assign({}, s.addrManual, { regAddress: true }),
        addrQ: Object.assign({}, s.addrQ, { regAddress: "" })
      }));
      focusLater(() => document.querySelector(".find-picked button"));
    };
    // Canada: one search request per press. A new province re-runs the search that was shown.
    const runSearch = (code) => {
      const q = state.findQ.trim();
      if (q.length < 3) return;
      clearTimeout(findTimer);
      setState({ findSearched: q, findOpen: true, findIdx: 0, findBusy: true, findResults: [] });
      findTimer = setTimeout(() => setState({ findBusy: false, findResults: searchBiz(q, code !== undefined ? code : findRegionCode()) }), 350);
    };
    const onType = (e) => {
      const q = e.target.value;
      if (caSearch) { clearTimeout(findTimer); setState({ findQ: q, findSearched: "", findOpen: false, findBusy: false, findResults: [] }); return; }
      const t = q.trim().length >= 3;
      setState({ findQ: q, findOpen: true, findIdx: 0, findBusy: t, findResults: t ? state.findResults : [] });
      clearTimeout(findTimer);
      // A short wait stands in for the real search request.
      if (t) findTimer = setTimeout(() => setState({ findBusy: false, findResults: searchBiz(state.findQ, findRegionCode()) }), 350);
    };
    const keys = (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); setState({ findOpen: true, findIdx: (idx + (e.key === "ArrowDown" ? 1 : total - 1)) % total }); }
      else if (e.key === "Enter") { if (caSearch && state.findQ.trim() !== state.findSearched) { e.preventDefault(); runSearch(); } else if (open) { e.preventDefault(); if (idx < rows.length) pick(rows[idx]); else manual(); } }
      else if (e.key === "Escape") { if (open) { e.stopPropagation(); setState({ findOpen: false }); } }
    };
    // Choosing a state or province narrows the search; the country is not asked because it is already known (decision business-lookup-state).
    const onRegion = (code) => {
      const t = state.findQ.trim().length >= 3;
      clearTimeout(findTimer);
      if (caSearch) { setState({ findState: code, findIdx: 0, findOpen: false, findBusy: false, findResults: [] }); if (state.findSearched) runSearch(code); return; }
      setState({ findState: code, findIdx: 0, findOpen: false, findBusy: false, findResults: t ? searchBiz(state.findQ, code) : [] });
    };
    return html`<div class="find-row${caSearch ? " find-row--ca" : ""}" data-key="find-search">
  <div class="find-country"><div class="field-head"><label class="field-label" for="f-findRegion">${isCa() ? "Province" : "State"}</label></div>${selectView({ id: "f-findRegion", value: region, placeholder: isCa() ? "Any province" : "Any state", pick: onRegion, options: [["", isCa() ? "Any province" : "Any state"]].concat((isCa() ? CA_REGIONS : US_REGIONS).map((r) => [r[0], r[1]])) })}</div>
  <div class="find-name"><div class="field-head"><label class="field-label" for="f-bizFind">Business name</label></div>
    <div class="combo combo--lead">
      <input class="input" id="f-bizFind" role="combobox" aria-expanded="${String(open)}" aria-controls="lb-bizFind" aria-autocomplete="list" aria-busy="${String(state.findBusy)}"${open && !(typed && state.findBusy) ? html` aria-activedescendant="lb-bizFind-opt-${idx}"` : ""} value="${state.findQ}" placeholder="${caSearch ? "Your registered business name" : "Start typing your business name"}" autocomplete="off" spellcheck="false" data-click="${on(() => setState({ findOpen: true }))}" data-focus="${on(() => { if (!state.findOpen) setState({ findOpen: true, findIdx: 0 }); })}" data-input="${on(onType)}" data-keydown="${on(keys)}" data-blur="${on(() => setTimeout(() => { if (state.findOpen) setState({ findOpen: false }); }, 160))}">
      <span class="combo-chev combo-chev--lead" aria-hidden="true">${icon("search", 16)}</span>
      ${open && html`<ul class="combo-list find-list" id="lb-bizFind" role="listbox" data-key="lb-find">
        ${typed && state.findBusy ? html`<li class="combo-empty" role="status">Searching…</li>` : rows.length ? rows.map((x, i) => html`<li class="combo-opt find-opt${i === idx ? " is-active" : ""}" id="lb-bizFind-opt-${i}" role="option" aria-selected="${String(i === idx)}" data-mouseenter="${on(() => { if (state.findIdx !== i) setState({ findIdx: i }); })}" data-click="${on(() => pick(x))}"><span class="find-opt-name">${x.name}</span><span class="find-opt-addr">${x.address}</span>${x.reg && html`<span class="find-opt-addr">Registration number ${x.reg} · ${x.status}</span>`}</li>`) : html`<li class="combo-empty" role="status">${typed ? "No business found for “" + state.findQ.trim() + "”." + (caSearch ? " Try the legal name instead of a trade name, or a different province, or enter your details yourself." : " Check the spelling, or enter your details yourself.") : "No businesses to suggest here. Type the name, or enter your details yourself."}</li>`}
        ${typed && !state.findBusy && state.findResults.length > rows.length && html`<li class="combo-empty">${state.findResults.length - rows.length} more. Keep typing to narrow the list.</li>`}
        <li class="combo-opt find-manual-opt${idx === rows.length ? " is-active" : ""}" id="lb-bizFind-opt-${rows.length}" role="option" aria-selected="${String(idx === rows.length)}" data-mouseenter="${on(() => { if (state.findIdx !== rows.length) setState({ findIdx: rows.length }); })}" data-click="${on(manual)}">Can't find it? Enter details manually</li>
      </ul>`}
    </div>
  </div>
  ${caSearch && html`<div class="find-go"><button type="button" class="btn btn-outline btn-md" data-click="${on(() => runSearch())}">${icon("search", 16)}Search</button></div>`}
</div>`;
  }

  // Atlas Select (decision dropdowns-atlas-menu). The closed field is the text field with a chevron; the open list is built like the Atlas Menu:
  // raised-2 surface, shadow-sm, items at the medium control height with space/padding/item, hover and keyboard highlight on background/hover,
  // normal body weight, and the chosen item on the brand subtle fill in Control/Bold with the normal text colour. Every dropdown in the form uses it, so none falls back to the browser's own list.
  // options is a list of [value, label]; pick receives the chosen value.
  function selectView({ id, value, options, placeholder, pick, described, closedLabel }) {
    const open = state.selOpen === id;
    const cur = options.findIndex((o) => o[0] === value);
    const idx = open ? Math.min(Math.max(state.selIdx, 0), options.length - 1) : cur;
    const choose = (v) => { setState({ selOpen: "" }); pick(v); };
    const openIt = () => setState({ selOpen: id, selIdx: Math.max(cur, 0) });
    const keys = (e) => {
      const n = options.length;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); if (!open) openIt(); else setState({ selIdx: (idx + (e.key === "ArrowDown" ? 1 : n - 1)) % n }); }
      else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (open) choose(options[idx][0]); else openIt(); }
      else if (e.key === "Escape") { if (open) { e.stopPropagation(); setState({ selOpen: "" }); } }
      else if (e.key === "Home" || e.key === "End") { if (open) { e.preventDefault(); setState({ selIdx: e.key === "Home" ? 0 : n - 1 }); } }
      // Typing a letter jumps to the next item that starts with it, like the browser's own select. Some events (browser autofill, synthetic keys) arrive with no e.key, so it is checked before use (decision select-keydown-no-key).
      else if (e.key && e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey && e.key !== " ") {
        const k = e.key.toLowerCase();
        for (let step = 1; step <= n; step++) { const j = ((open ? idx : cur) + step) % n; if (String(options[j][1]).toLowerCase().indexOf(k) === 0) { setState({ selOpen: id, selIdx: j }); break; } }
      }
    };
    return html`<div class="combo combo--select">
  <button type="button" class="input select-field${value === "" ? " is-unset" : ""}" id="${id}" role="combobox" aria-haspopup="listbox" aria-expanded="${String(open)}" aria-controls="lb-${id}"${open ? html` aria-activedescendant="lb-${id}-opt-${idx}"` : ""}${described || ""} data-click="${on(() => (open ? setState({ selOpen: "" }) : openIt()))}" data-keydown="${on(keys)}" data-blur="${on(() => setTimeout(() => { if (state.selOpen === id) setState({ selOpen: "" }); }, 160))}"><span class="select-text">${closedLabel || (cur > -1 ? options[cur][1] : placeholder)}</span></button>
  <span class="combo-chev" aria-hidden="true">${icon("chev-d", 16)}</span>
  ${open && html`<ul class="combo-list select-list" id="lb-${id}" role="listbox" data-key="lb-${id}">
    ${options.map((o, i) => html`<li class="combo-opt${i === idx ? " is-active" : ""}${o[0] === value ? " is-chosen" : ""}" id="lb-${id}-opt-${i}" role="option" aria-selected="${String(o[0] === value)}" data-mouseenter="${on(() => { if (state.selIdx !== i) setState({ selIdx: i }); })}" data-click="${on(() => choose(o[0]))}">${o[1]}${o[0] === value ? icon("check", 16, "combo-opt-check") : ""}</li>`)}
  </ul>`}
</div>`;
  }

  function fieldView(f) {
    if (f.kind === "bizfind") return html`<div class="span-2" data-key="${f.id}">${bizFindView()}</div>`;
    const id = "f-" + f.id;
    // The monthly card volume sits beside a calculated yearly figure that cannot be clicked or typed in (decision yearly-volume-shown).
    // Together they fill the left half of the row, a quarter of the form each, and the average transaction amount takes the right half.
    if (f.annual) {
      const monthly = parseFloat(String(f.value).replace(/,/g, ""));
      const yearly = monthly > 0 ? fmtMoney(String(Math.round(monthly * 12 * 100) / 100)) : "";
      return html`<div class="field-pair field-pair--vol" data-key="${f.id}-pair">${fieldView(Object.assign({}, f, { annual: false }))}<div data-key="${f.id}-yearly">
  <div class="field-head"><span class="field-label" id="l-${f.id}-yearly">${f.annualLabel || "Yearly card volume"}</span></div>
  <div class="affix affix--money affix--static" role="group" aria-labelledby="l-${f.id}-yearly"><span class="affix-prefix" aria-hidden="true">$</span><span class="affix-value">${yearly}</span><span class="affix-code">${isCa() ? "CAD" : "USD"}</span></div>
</div></div>`;
    }
    const wrap = (f.span ? "span-2" : f.half ? "span-half" : "") + (f.tall ? " field--tall" : "");
    // Every control writes straight into state; values are escaped on the way
    // back out by html``, so typed markup is shown as text and never run.
    const onInput = on((e) => set(f.id, isDateKey(f.id) ? formatDateInput(e.target.value) : e.target.value));

    if (f.kind === "check") {
      // Read-before-accept: the View button lives inside the grey container.
      // It is interactive content, so clicking it never toggles the checkbox.
      const view = f.viewKey && html`<button type="button" class="btn btn-outline btn-xs check-view" aria-label="View ${f.label.replace(/^I accept the /, "")}" data-click="${on(() => openDoc(f.viewKey))}">${icon("eye", 14)}View</button>`;
      return html`<div class="${wrap}" data-key="${f.id}"${ERR[f.id] ? html` data-error="1"` : ""}><label class="check${f.disabled ? " is-disabled" : ""}"><input type="checkbox" id="${id}"${attr("checked", f.value === true)}${attr("disabled", f.disabled)}${f.disabled && f.hint ? html` aria-describedby="h-${f.id}"` : ""} data-change="${on((e) => set(f.id, e.target.checked))}"><span><span class="check-label">${f.label}${f.required && REQ}</span>${f.hint && !ERR[f.id] && html`<span class="check-hint" id="h-${f.id}">${f.hint}</span>`}</span>${view}</label>${errView(f.id)}</div>`;
    }

    if (f.kind === "heading") return html`<h3 class="fields-sub span-2" data-key="${f.id}">${f.label}</h3>`;

    const hintId = f.hint ? "h-" + f.id : "";
    const described = hintId ? html` aria-describedby="${hintId}"` : "";
    let control;
    let after = ""; // a link or button that sits below the helper text, outside the input component (decision address-links-below-hint)
    switch (f.kind) {
      case "mono":
        control = html`<input class="input mono" id="${id}" value="${f.value}" placeholder="${f.placeholder}" autocomplete="off" spellcheck="false"${described} data-input="${onInput}">`;
        break;
      case "select":
        control = selectView({ id, value: f.value, placeholder: f.placeholder || "Choose one", described, pick: (v) => set(f.id, v), options: f.options.map((op) => [op, op]) });
        break;
      case "combo": {
        // A searchable list (ARIA combobox). Picking writes the "code · title" label into the answer.
        const open = state.comboOpen === f.id;
        const matches = open ? searchMcc(state.comboQuery) : [];
        const shown = matches.slice(0, 60);
        // With nothing typed the list has two headings; once the applicant types it is one list of matches (decision mcc-most-common-first).
        const grouped = !String(state.comboQuery || "").trim();
        const idx = Math.min(state.comboIdx, Math.max(shown.length - 1, 0));
        const pickIt = (label) => { set(f.id, label); setState({ comboOpen: "", comboQuery: "" }); };
        const keys = (e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); const n = shown.length || 1; setState({ comboOpen: f.id, comboIdx: (idx + (e.key === "ArrowDown" ? 1 : n - 1)) % n }); }
          else if (e.key === "Enter") { e.preventDefault(); if (open && shown[idx]) pickIt(shown[idx].label); }
          else if (e.key === "Escape") { e.stopPropagation(); setState({ comboOpen: "", comboQuery: "" }); }
        };
        control = html`<div class="combo">
  <input class="input" id="${id}" role="combobox" aria-expanded="${String(open)}" aria-controls="lb-${f.id}" aria-autocomplete="list"${open && shown.length ? html` aria-activedescendant="lb-${f.id}-opt-${idx}"` : ""} value="${open ? state.comboQuery : f.value}" placeholder="${f.value && open ? f.value : f.placeholder}" autocomplete="off" spellcheck="false"${described} data-click="${on(() => setState({ comboOpen: f.id, comboQuery: "", comboIdx: 0 }))}" data-input="${on((e) => setState({ comboOpen: f.id, comboQuery: e.target.value, comboIdx: 0 }))}" data-keydown="${on(keys)}" data-blur="${on(() => setTimeout(() => { if (state.comboOpen === f.id) setState({ comboOpen: "", comboQuery: "" }); }, 160))}">
  <span class="combo-chev" aria-hidden="true">${icon("chev-d", 16)}</span>
  ${open && html`<ul class="combo-list" id="lb-${f.id}" role="listbox" data-key="lb">
    ${shown.length ? shown.map((x, i) => html`${grouped && i === 0 && x.common ? html`<li class="combo-group" role="presentation">Most common</li>` : ""}${grouped && x.common === false && (i === 0 || shown[i - 1].common) ? html`<li class="combo-group" role="presentation">All categories</li>` : ""}<li class="combo-opt${i === idx ? " is-active" : ""}${x.label === f.value ? " is-chosen" : ""}" id="lb-${f.id}-opt-${i}" role="option" aria-selected="${String(x.label === f.value)}" data-mouseenter="${on(() => { if (state.comboIdx !== i) setState({ comboIdx: i }); })}" data-click="${on(() => pickIt(x.label))}"><span class="combo-code">${x.code}</span>${x.name}${x.label === f.value ? icon("check", 16, "combo-opt-check") : ""}</li>`) : html`<li class="combo-empty">No match. Try a different word, or the four-digit code.</li>`}
    ${matches.length > shown.length && html`<li class="combo-empty">${matches.length - shown.length} more. Keep typing to narrow the list.</li>`}
  </ul>`}
</div>`;
        break;
      }
      case "multi": {
        // A searchable country list where any number can be picked (ARIA combobox, multiselectable). The answer is the names joined by ", ", and the picks show as removable chips under the box (decision countries-sold-to-multiselect).
        const open = state.multiOpen === f.id;
        const picked = String(f.value || "").split(", ").filter(Boolean);
        const norm = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
        const q = norm(state.multiQuery || "").trim();
        const home = isCa() ? "Canada" : "United States";
        const shown = open ? ALL_COUNTRIES.filter((c) => c !== home && (!q || norm(c).indexOf(q) > -1)) : [];
        const idx = Math.min(state.multiIdx, Math.max(shown.length - 1, 0));
        const refocus = () => setTimeout(() => { const el = document.getElementById(id); if (el) el.focus(); }, 0);
        const toggle = (c) => { set(f.id, (picked.indexOf(c) > -1 ? picked.filter((x) => x !== c) : picked.concat([c])).join(", ")); setState({ multiQuery: "" }); refocus(); };
        const keys = (e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); const n = shown.length || 1; setState({ multiOpen: f.id, multiIdx: (idx + (e.key === "ArrowDown" ? 1 : n - 1)) % n }); }
          else if (e.key === "Enter") { e.preventDefault(); if (open && shown[idx]) toggle(shown[idx]); }
          else if (e.key === "Escape") { if (open) { e.stopPropagation(); setState({ multiOpen: "", multiQuery: "" }); } }
          else if (e.key === "Backspace" && !state.multiQuery && picked.length) set(f.id, picked.slice(0, -1).join(", "));
        };
        control = html`<div class="combo">
  <input class="input" id="${id}" role="combobox" aria-expanded="${String(open)}" aria-controls="lb-${f.id}" aria-autocomplete="list"${open && shown.length ? html` aria-activedescendant="lb-${f.id}-opt-${idx}"` : ""} value="${open ? state.multiQuery : ""}" placeholder="${f.placeholder}" autocomplete="off" spellcheck="false"${described} data-click="${on(() => setState({ multiOpen: f.id, multiQuery: "", multiIdx: 0 }))}" data-input="${on((e) => setState({ multiOpen: f.id, multiQuery: e.target.value, multiIdx: 0 }))}" data-keydown="${on(keys)}" data-blur="${on(() => setTimeout(() => { const a = document.activeElement; if (state.multiOpen === f.id && !(a && a.id === id)) setState({ multiOpen: "", multiQuery: "" }); }, 160))}">
  <span class="combo-chev" aria-hidden="true">${icon("chev-d", 16)}</span>
  ${open && html`<ul class="combo-list" id="lb-${f.id}" role="listbox" aria-multiselectable="true" data-key="lb">
    ${shown.length ? shown.map((c, i) => html`<li class="combo-opt${i === idx ? " is-active" : ""}${picked.indexOf(c) > -1 ? " is-chosen" : ""}" id="lb-${f.id}-opt-${i}" role="option" aria-selected="${String(picked.indexOf(c) > -1)}" data-mouseenter="${on(() => { if (state.multiIdx !== i) setState({ multiIdx: i }); })}" data-click="${on(() => toggle(c))}">${c}${picked.indexOf(c) > -1 ? icon("check", 16, "combo-opt-check") : ""}</li>`) : html`<li class="combo-empty">No match. Try a different spelling.</li>`}
  </ul>`}
  ${picked.length > 0 && html`<ul class="multi-chips" data-key="chips">${picked.map((c) => html`<li class="chip chip--pick" data-key="chip-${c}">${c}<button type="button" class="chip-x" aria-label="Remove ${c}" data-click="${on(() => set(f.id, picked.filter((x) => x !== c).join(", ")))}">${icon("x", 12)}</button></li>`)}</ul>`}
</div>`;
        break;
      }
      case "phone": {
        // One box holding the country selector, a divider and the number, with the Atlas Phone country popup (a search row above the list) under it (decision atlas-phone-input-one-box).
        // The number is spaced as it is typed: 000 000 0000 for +1, groups of three for other countries (decision phone-input-component).
        const pp = phoneParts(f.id, f.value);
        const open = state.phoneOpen === f.id;
        const q = String(state.phoneQuery || "").trim().toLowerCase();
        const qd = q.replace(/^\+/, "");
        // The search row finds a country by name or by dial code, with or without the plus.
        const shown = open ? PHONE_COUNTRIES.filter((c) => !q || c[2].toLowerCase().indexOf(q) > -1 || (/^\d+$/.test(qd) && c[3].indexOf(qd) === 0)) : [];
        const idx = Math.min(Math.max(state.phoneIdx, 0), Math.max(shown.length - 1, 0));
        const searchId = id + "-search";
        const focusLater = (elId) => setTimeout(() => { const el = document.getElementById(elId); if (el) el.focus(); }, 0);
        const closePop = (back) => { setState({ phoneOpen: "", phoneQuery: "", phoneIdx: 0 }); if (back) focusLater(id + "-code"); };
        const openPop = () => { setState({ phoneOpen: f.id, phoneQuery: "", phoneIdx: Math.max(PHONE_COUNTRIES.findIndex((x) => x[0] === pp.iso), 0) }); focusLater(searchId); };
        const onPhone = (e) => {
          let d = digitsOf(e.target.value);
          if (pp.code === "1" && d.length === 11 && d[0] === "1") d = d.slice(1);
          d = d.slice(0, phoneCap(pp.code));
          e.target.value = phoneFmt(pp.code, d);
          set(f.id, phoneJoin(pp.code, d));
        };
        const pickCountry = (iso) => {
          const c = PHONE_COUNTRIES.find((x) => x[0] === iso);
          if (!c) return;
          setState((s) => ({ phoneIso: Object.assign({}, s.phoneIso, { [f.id]: iso }), phoneOpen: "", phoneQuery: "", phoneIdx: 0 }));
          if (pp.digits) set(f.id, phoneJoin(c[3], pp.digits.slice(0, phoneCap(c[3]))));
          focusLater(id + "-code");
        };
        // Keys in the search row: arrows move the highlight, Enter picks, Escape closes and returns to the selector, Tab leaves.
        const popKeys = (e) => {
          const n = shown.length;
          if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); if (n) setState({ phoneIdx: (idx + (e.key === "ArrowDown" ? 1 : n - 1)) % n }); }
          else if (e.key === "Enter") { e.preventDefault(); if (shown[idx]) pickCountry(shown[idx][0]); }
          else if (e.key === "Escape") { e.stopPropagation(); closePop(true); }
          else if (e.key === "Tab") { closePop(false); }
        };
        const selKeys = (e) => { if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); if (!open) openPop(); } };
        control = html`<div class="phone${open ? " is-open" : ""}">
  <button type="button" class="phone-sel" id="${id}-code" role="combobox" aria-haspopup="listbox" aria-expanded="${String(open)}" aria-controls="lb-${id}" aria-label="Country calling code, ${pp.name}, plus ${pp.code}" data-click="${on(() => (open ? closePop(true) : openPop()))}" data-keydown="${on(selKeys)}">${flagView(pp.iso, pp.flag)}<span class="phone-dial">+${pp.code}</span>${icon("chev-d", 16)}</button>
  <span class="phone-div" aria-hidden="true"></span>
  <input class="phone-num" id="${id}" type="tel" inputmode="tel" autocomplete="tel-national" value="${phoneFmt(pp.code, pp.digits)}" placeholder="${f.placeholder}"${described} data-input="${on(onPhone)}">
  ${open && html`<div class="phone-pop" data-key="pp-${f.id}">
    <div class="phone-search">${icon("search", 16)}<input class="phone-search-in" id="${searchId}" type="text" role="combobox" aria-expanded="true" aria-controls="lb-${id}" aria-autocomplete="list" aria-label="Search country or dial code"${shown[idx] ? html` aria-activedescendant="${id}-opt-${idx}"` : ""} placeholder="Search country or dial code" value="${state.phoneQuery}" autocomplete="off" spellcheck="false" data-input="${on((e) => setState({ phoneQuery: e.target.value, phoneIdx: 0 }))}" data-keydown="${on(popKeys)}" data-blur="${on(() => setTimeout(() => { if (state.phoneOpen === f.id) closePop(false); }, 160))}"></div>
    ${shown.length ? html`<ul class="phone-list" id="lb-${id}" role="listbox" aria-label="Countries">${shown.map((c, i) => html`<li class="phone-opt${i === idx ? " is-active" : ""}${c[0] === pp.iso ? " is-chosen" : ""}" id="${id}-opt-${i}" role="option" aria-selected="${String(c[0] === pp.iso)}" data-mouseenter="${on(() => { if (state.phoneIdx !== i) setState({ phoneIdx: i }); })}" data-click="${on(() => pickCountry(c[0]))}">${flagView(c[0], c[1])}<span class="phone-name">${c[2]}</span><span class="phone-dialcode">+${c[3]}</span><span class="phone-check">${c[0] === pp.iso ? icon("check", 16) : ""}</span></li>`)}</ul>` : html`<div class="phone-empty" id="lb-${id}" role="status">No results for "${state.phoneQuery}". Check the spelling</div>`}
  </div>`}
</div>`;
        break;
      }
      case "count":
        // A whole number, digits only, shown with thousands separators as it is typed (decision ach-count-when-volume).
        control = html`<input class="input" id="${id}" inputmode="numeric" autocomplete="off" value="${f.value ? Number(digitsOf(f.value)).toLocaleString("en-US") : ""}" placeholder="${f.placeholder}"${described} data-input="${on((e) => { const d = digitsOf(e.target.value).replace(/^0+(?=\d)/, "").slice(0, 7); e.target.value = d ? Number(d).toLocaleString("en-US") : ""; set(f.id, d); })}">`;
        break;
      case "currency":
        // The dollar sign alone does not say which dollar, so the currency code closes the field (decision currency-code-on-amounts).
        control = html`<div class="affix affix--money"><span class="affix-prefix" aria-hidden="true">${f.prefix}</span><input id="${id}" value="${f.value}" placeholder="${f.placeholder}" inputmode="decimal" autocomplete="off"${described} data-input="${onInput}"${f.zero ? html` data-blur="${on((e) => { if (!String(e.target.value).trim()) set(f.id, "0"); })}"` : ""}><span class="affix-code">${isCa() ? "CAD" : "USD"}</span></div>`;
        break;
      case "masked": {
        // A sensitive value shows only its last four characters once you leave the
        // field. Clicking back into it lets you edit the real value, still shown as
        // dots until you press "Show".
        // The first time a value is typed it is plain, and an empty field has
        // nothing to hide.
        // A locked value (the zeros after "doesn't have an SSN" is ticked) is shown in full, read-only, with no Show button.
        const editing = f.locked || f.revealed || f.focused || f.value === "";
        const dots = f.focused && !f.revealed && state.editMasked === f.id;
        const encKey = f.id + ":enc";
        const encOpen = () => setState({ fieldWhy: encKey });
        const encClose = () => { if (state.fieldWhy === encKey) setState({ fieldWhy: "" }); };
        // The padlock inside the field opens the Encrypted note on hover or focus (decision encrypted-lock-tooltip).
        const lock = html`<span class="lock-wrap" data-mouseenter="${on(encOpen)}" data-mouseleave="${on(encClose)}"><button type="button" class="lock-trigger" aria-label="Encrypted: what this means" aria-expanded="${String(state.fieldWhy === encKey)}" data-click="${on(encOpen)}" data-focus="${on(encOpen)}" data-blur="${on(encClose)}">${icon("lock", 16)}</button>${state.fieldWhy === encKey && html`<span class="field-why-pop lock-pop" role="note"><span class="field-why-body">${ENCRYPTED_NOTE}</span></span>`}</span>`;
        control = html`<div class="affix affix--secure${f.locked ? " is-locked" : ""}">${lock}<input id="${id}"${attr("class=\"masked-edit\"", dots)} value="${editing ? f.value : maskValue(f.value, f.maskShort)}" placeholder="${f.placeholder}" autocomplete="off" spellcheck="false"${attr("readonly", !editing)}${attr("disabled", f.locked)}${described} data-input="${onInput}" data-focus="${on(() => { if (f.value !== "" && !state.revealed[f.id]) setState({ editMasked: f.id }); })}" data-blur="${on(() => { if (state.editMasked === f.id) setState({ editMasked: "" }); schedule(); })}">${f.value !== "" && !f.locked && html`<button type="button" class="btn-link" aria-controls="${id}" aria-label="${(f.revealed ? "Hide " : "Show ") + f.label}" data-click="${on(() => toggleReveal(f.id))}">${f.revealed ? "Hide" : "Show"}</button>`}</div>`;
        break;
      }
      case "long":
        control = html`<textarea class="input" id="${id}" rows="3" placeholder="${f.placeholder}"${described} data-input="${onInput}">${f.value}</textarea>`;
        break;
      case "pills":
        // One round pill per option, the same control as Yes / No (decision nonprofit-type-pills).
        control = html`<div class="yn yn--pills" role="group" aria-labelledby="l-${f.id}"${described}>${f.options.map((opt) => html`<button type="button" class="yn-btn" aria-pressed="${String(f.value === opt)}" data-click="${on(() => set(f.id, opt))}">${opt}</button>`)}</div>`;
        break;
      case "yn":
        control = html`<div class="yn" role="group" aria-labelledby="l-${f.id}"${described}><button type="button" class="yn-btn" aria-pressed="${String(f.value === "yes")}" data-click="${on(() => set(f.id, "yes"))}">Yes</button><button type="button" class="yn-btn" aria-pressed="${String(f.value === "no")}" data-click="${on(() => set(f.id, "no"))}">No</button>${f.unsure && html`<button type="button" class="yn-btn" aria-pressed="${String(f.value === "unsure")}" data-click="${on(() => set(f.id, "unsure"))}">Unsure</button>`}</div>`;
        break;
      case "address": {
        // Address entry (decisions address-lookup, address-split-fields). A search box finds the address. Picking a result, or choosing "Enter address manually", opens one box for each part: street, unit, city, state or province, and ZIP or postal code. The whole address is still kept as one line, so everything that reads it carries on working.
        const ca = isCa();
        const cur = () => addrOf(f.id, state.a[f.id] === undefined ? f.value : state.a[f.id]);
        const parts = addrOf(f.id, f.value);
        const hasValue = String(f.value).trim() !== "";
        const showParts = state.addrManual[f.id] === true || (hasValue && state.addrManual[f.id] !== false);
        const setPart = (k, v) => { const np = Object.assign({}, cur(), { [k]: v }); setState((s) => ({ addrParts: Object.assign({}, s.addrParts, { [f.id]: np }), addrManual: Object.assign({}, s.addrManual, { [f.id]: true }) })); set(f.id, addrJoin(np)); };
        if (showParts) {
          const regions = (ca ? CA_REGIONS : US_REGIONS).slice();
          if (parts.region && !regions.some((r) => r[0] === parts.region)) regions.unshift([parts.region, parts.region]);
          const cell = (k, label, extra) => html`<div class="addr-cell${extra || ""}"><label class="field-label" for="${k === "l1" ? id : id + "-" + k}">${label}</label><input class="input" id="${k === "l1" ? id : id + "-" + k}" value="${parts[k]}" autocomplete="off"${k === "l1" ? described : ""} data-input="${on((e) => setPart(k, e.target.value))}"></div>`;
          control = html`<div class="addr" data-key="addr-${f.id}">
  <div class="addr-grid">
    ${cell("l1", "Street address 1", " addr-cell--wide")}
    ${cell("l2", "Street address 2", " addr-cell--wide")}
    ${cell("city", "City", " addr-cell--city")}
    <div class="addr-cell addr-cell--sm"><label class="field-label" for="${id}-region">${ca ? "Province" : "State"}</label>${selectView({ id: id + "-region", value: parts.region, placeholder: "Choose one", pick: (v) => setPart("region", v), options: regions.map((r) => [r[0], r[1]]) })}</div>
    ${cell("postal", ca ? "Postal code" : "ZIP code", " addr-cell--sm")}
  </div>
</div>`;
          after = html`<button type="button" class="btn-link addr-reset" data-click="${on(() => { setState((s) => ({ addrManual: Object.assign({}, s.addrManual, { [f.id]: false }), addrParts: Object.assign({}, s.addrParts, { [f.id]: null }), addrQ: Object.assign({}, s.addrQ, { [f.id]: "" }) })); set(f.id, ""); })}">Clear and search again</button>`;
        } else {
          const q = state.addrQ[f.id] || "";
          const open = state.addrOpen === f.id;
          const matches = open ? searchAddress(q) : [];
          const idx = Math.min(state.addrIdx, matches.length - 1);
          const pickIt = (label) => { setState((s) => ({ addrParts: Object.assign({}, s.addrParts, { [f.id]: addrParse(label) }), addrManual: Object.assign({}, s.addrManual, { [f.id]: true }), addrQ: Object.assign({}, s.addrQ, { [f.id]: "" }), addrOpen: "", addrIdx: -1 })); set(f.id, label); };
          const keys = (e) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") { if (!matches.length) return; e.preventDefault(); const n = matches.length; setState({ addrIdx: e.key === "ArrowDown" ? (idx + 1) % n : (idx < 1 ? n - 1 : idx - 1) }); }
            else if (e.key === "Enter") { if (open && matches[idx]) { e.preventDefault(); pickIt(matches[idx]); } }
            else if (e.key === "Escape") { if (open) { e.stopPropagation(); setState({ addrOpen: "", addrIdx: -1 }); } }
          };
          const typed = q.trim().length >= 3;
          const startManual = () => { setState((s) => ({ addrManual: Object.assign({}, s.addrManual, { [f.id]: true }), addrOpen: "", addrIdx: -1 })); setTimeout(() => { const el = document.getElementById(id); if (el) el.focus(); }, 40); };
          control = html`<div class="addr" data-key="addr-${f.id}"><div class="addr-search"><div class="combo combo--lead">
  <input class="input" id="${id}" role="combobox" aria-expanded="${String(open && typed)}" aria-controls="lb-${f.id}" aria-autocomplete="list"${open && typed && matches[idx] ? html` aria-activedescendant="lb-${f.id}-opt-${idx}"` : ""} value="${q}" placeholder="Start typing to search for the address" autocomplete="off" spellcheck="false"${described} data-click="${on(() => setState({ addrOpen: f.id, addrIdx: -1 }))}" data-input="${on((e) => setState((s) => ({ addrQ: Object.assign({}, s.addrQ, { [f.id]: e.target.value }), addrOpen: f.id, addrIdx: -1 })))}" data-keydown="${on(keys)}" data-blur="${on(() => setTimeout(() => { if (state.addrOpen === f.id) setState({ addrOpen: "", addrIdx: -1 }); }, 160))}">
  <span class="combo-chev combo-chev--lead" aria-hidden="true">${icon("search", 16)}</span>
  ${open && typed && html`<ul class="combo-list" id="lb-${f.id}" role="listbox" data-key="lb-addr">
    ${matches.length ? matches.map((x, i) => html`<li class="combo-opt${i === idx ? " is-active" : ""}" id="lb-${f.id}-opt-${i}" role="option" aria-selected="${String(i === idx)}" data-mouseenter="${on(() => { if (state.addrIdx !== i) setState({ addrIdx: i }); })}" data-click="${on(() => pickIt(x))}">${x}</li>`) : html`<li class="combo-empty">No address found. Keep typing, or enter it manually below.</li>`}
  </ul>`}
</div>
</div></div>`;
          // The manual link sits below the field, like Clear and search again (decision address-on-quarter-grid).
          after = html`<button type="button" class="btn-link addr-manual" data-click="${on(startManual)}">Enter address manually</button>`;
        }
        break;
      }
      default:
        control = html`<input class="input" id="${id}" value="${f.value}" placeholder="${f.placeholder}"${attr("disabled", f.locked)}${described} data-input="${onInput}">`;
    }

    const label = f.kind === "yn" || f.kind === "pills"
      ? html`<span class="field-label" id="l-${f.id}">${f.label}${f.required && REQ}</span>`
      : html`<label class="field-label" for="${id}">${f.label}${f.required && REQ}</label>`;
    return html`<div class="${wrap}" data-key="${f.id}"${ERR[f.id] ? html` data-error="1"` : ""}>
  <div class="field-head">${label}${f.chip && html`<span class="chip">${f.chip}</span>`}</div>
  ${f.tick ? html`<div class="control-row${f.tickHalf ? " control-row--half" : ""}">${control}${fieldView(f.tick)}</div>` : control}
  ${errView(f.id)}
  ${f.why && fieldWhyView(f)}
  ${f.hint && !ERR[f.id] && html`<p class="field-hint" id="${hintId}">${f.hint}</p>`}
  ${after}
</div>`;
  }

  // Numbered marker for one entry in DECISIONS. Renders nothing at all unless
  // annotations are switched on, so the flow is unaffected when they're off.
  // Numbers are the entry's position in DECISIONS, so decision 13 is decision
  // 13 on whichever screen you find it.
  function pin(id) {
    if (!ctx.showNotes) return "";
    const i = decisionIndex(id);
    if (i < 0 || !decisionShown(id)) return "";
    const d = DECISIONS[i];
    const isOpen = state.openNote === id;
    const toggle = () => setState({ openNote: isOpen ? "" : id });
    return html`<span class="note" data-key="note-${id}">
  <button type="button" class="note-pin" aria-expanded="${String(isOpen)}" aria-label="Design decision ${i + 1}: ${d.t}" data-click="${on(toggle)}">${i + 1}</button>
  ${isOpen && html`<span class="note-pop" data-key="pop" role="note">
    <span class="note-area">${d.area} · ${d.where}</span>
    <span class="note-t">${d.t}</span>
    <span class="note-b">${d.b}</span>
    ${d.tradeoff && html`<span class="note-trade"><b>Trade-off</b> ${d.tradeoff}</span>`}
    <span class="note-meta">Decided by ${d.by} · ${d.when}</span>
  </span>`}
</span>`;
  }

  function notesListView() {
    const groups = [];
    DECISIONS.forEach((d, i) => {
      if (!decisionShown(d.id)) return;
      let g = groups.filter((x) => x.where === d.where)[0];
      if (!g) { g = { where: d.where, items: [] }; groups.push(g); }
      g.items.push({ d: d, n: i + 1 });
    });
    return html`<div class="backdrop" data-key="notes-list">
  <div class="dialog dialog--wide" role="dialog" aria-modal="true" aria-labelledby="notes-title">
    <div class="dialog-head">
      <div class="grow">
        <h2 class="dialog-title" id="notes-title">Design decisions</h2>
        <p class="dialog-sub">${shownDecisionCount()} recorded. Numbers match the markers on the screen.</p>
      </div>
      <button type="button" class="icon-btn" aria-label="Close" data-click="${on(() => setState({ notesListOpen: false }))}">${icon("x", 16)}</button>
    </div>
    <div class="notes-scroll">
      ${groups.map((g) => html`<section class="notes-group">
        <h3 class="notes-where">${g.where}</h3>
        ${g.items.map((it) => html`<div class="notes-item">
          <span class="note-pin note-pin--static" aria-hidden="true">${it.n}</span>
          <div class="grow">
            <div class="notes-item-title">${it.d.t}</div>
            <p class="notes-item-body">${it.d.b}</p>
            ${it.d.tradeoff && html`<p class="notes-item-trade"><b>Trade-off</b> ${it.d.tradeoff}</p>`}
            <div class="notes-item-meta"><span class="chip">${it.d.area}</span>${it.d.slice && html`<span class="chip chip--secure">${it.d.slice === "2" ? "Slice 2 only" : "Slice 1 only"}</span>`}<span>Decided by ${it.d.by} · ${it.d.when}</span></div>
          </div>
        </div>`)}
      </section>`)}
    </div>
  </div>
</div>`;
  }

  // Step 4 (decision bank-saved-as-account). While the form is showing, a warning callout says plainly that every field is needed; while an account is being replaced it also offers to keep the saved one.
  function bankNoticeView() {
    if (!bankFormOn()) return "";
    const editing = state.bankEditing;
    return html`<div class="callout callout--warning callout--card bank-notice" data-key="bank-notice" role="note">${icon("alert", 16)}<div class="callout-content"><div class="callout-text"><strong class="callout-title">${editing ? "Enter your bank details again" : "Fill in every field to continue"}</strong><span>${editing ? "Your saved account stays as it is until you save a new one. Fill in every field to replace it." : "We can only save your bank account once all of its details are in. When every field is filled, Save and continue saves the account for you."}</span></div>${editing && html`<div class="callout-actions"><button type="button" class="btn btn-outline btn-small" data-click="${on(cancelBankEdit)}">Keep my saved account</button></div>`}</div></div>`;
  }
  // The saved account: the nickname and the last four digits of the account number, and nothing else, because every other bank detail is encrypted once saved (decision bank-numbers-masked).
  function bankSavedView() {
    if (bankFormOn()) return "";
    const b = state.bankSaved.values;
    return html`<section class="card" data-key="s4-saved">
  <div class="card-head card-head--flush">
    <div class="grow"><h2 class="card-title">Payout account${pin("bank-no-debit")}</h2></div>
    <span class="pill pill--positive">${icon("check", 13, "i-b")}Saved</span>
  </div>
  <div class="bank-acct">
    <span class="icon-tile" aria-hidden="true">${icon("building", 18)}</span>
    <div class="bank-acct-text">
      <div class="bank-acct-name">${b.bankNickname}</div>
      <div class="bank-acct-meta">•••• ${bankLast4(b.accountNumber)}</div>
    </div>
    <button type="button" class="btn btn-outline btn-sm" aria-label="Re-enter the details of your ${b.bankNickname} account" data-click="${on(reenterBank)}">Re-enter details</button>
  </div>
</section>`;
  }

  function callout(text, cls) {
    return html`<div class="callout${cls ? " " + cls : ""}">${icon("lock", 16)}<span>${text}</span></div>`;
  }

  function cardView(c) {
    return html`<section class="card" data-key="${c.key}">
  <div class="card-head${c.isOpen ? "" : " card-head--flush"}">
    <div class="grow">
      <h2 class="card-title">${c.title}${c.pinId && pin(c.pinId)}</h2>
      ${c.note && html`<p class="card-note">${c.note}</p>`}
    </div>
    ${c.onRemove && html`<button type="button" class="btn btn-xs person-toggle" aria-label="Remove ${c.title}" data-click="${on(c.onRemove)}">${icon("trash", 14)}Remove</button>`}
    ${c.collapsible && html`<button type="button" class="btn btn-collapse btn-xs" aria-expanded="${String(c.isOpen)}" data-click="${on(c.toggle)}">${c.toggleLabel}${icon("chev-d", 14)}</button>`}
  </div>
  ${c.isOpen && html`<div class="fields">${c.fields.map(fieldView)}</div>`}
  ${c.assurance && callout(c.assurance, "callout--card")}
  ${c.foot}
</section>`;
  }

  function welcomeView(v) {
    const need = (ic, title, body) => html`<div class="need"><span class="icon-tile">${icon(ic, 18)}</span><div><div class="need-title">${title}</div><div class="need-body">${body}</div></div></div>`;
    // "What we do with your information" sits at the end of the description, as hoverable text with a question icon, the same way "Why are we asking?" does on a step (decision welcome-help-and-info-in-header).
    const openInfo = () => setState({ infoOpen: true });
    const infoNote = html`<span class="why-wrap" data-mouseenter="${on(openInfo)}" data-mouseleave="${on(() => setState({ infoOpen: false }))}"><button type="button" class="why-trigger" aria-expanded="${String(state.infoOpen)}" data-click="${on(openInfo)}" data-blur="${on(() => setState({ infoOpen: false }))}">What we do with your information${icon("help", 15, "i-accent")}</button>${state.infoOpen && html`<span class="why-pop" data-key="info-pop" role="note"><span class="why-pop-body"><span class="why-points">${["We encrypt your information as it travels and while it's stored.", "We protect tax and national ID numbers, so Xplor staff can't read them.", "Trulioo, our verification partner, runs the identity checks.", "We only use it to verify you, never for marketing.", "We save your progress after every field."].map((t) => html`<span class="why-point">${icon("check", 14, "i-b i-ok")}<span>${t}</span></span>`)}</span></span></span>`}</span>`;
    return html`<div class="welcome" data-key="welcome">
  <div class="welcome-inner">
    <div class="welcome-title-row"><h1 class="welcome-title">Let's get you set up to take payments${pin("step-count-7")}</h1><span class="tag tag--green">${icon("bolt", 13)}Faster approval</span></div>
    <p class="welcome-lede">We'll walk you through seven steps. It takes about ${minutesLeft()} ${minutesLeft() === 1 ? "minute" : "minutes"}, and you can stop and pick up right where you left off.${pin("welcome-length")} ${infoNote}</p>
    <div class="need-bar">
      <h2 class="need-head">What you'll need</h2>
    </div>
    <div class="need-list">
      ${need("building", "Your registration and tax numbers", v.needRegistration)}
      ${need("users", "Details of the people who own your organization", v.needIds)}
      ${need("card", "Your bank account and your documents", v.needBank)}
      ${need("chart", "A rough idea of your card sales", "Your monthly total, your average payment, and whether you sell in person, online or both. A rough guess is fine.")}
    </div>
    <div class="actions">
      <button type="button" class="btn btn-neutral btn-lg btn-help" data-click="${on(openHelp)}">${icon("help", 17)}Get help</button>
      <button type="button" class="btn btn-primary btn-lg" data-click="${on(() => go("bizType"))}">Let's get started${icon("arrow-r", 19)}</button>
    </div>
  </div>
</div>`;
  }

    // The email the merchant gets before they ever see the prototype (decision welcome-email-first). It mirrors
    // email/welcome-email.html. The username and password are made-up demo values, never real credentials.
    function emailView() {
      const existing = ctx.start === START_EXISTING;
      const step = (n, t, d) => html`<li class="em-step"><span class="em-step-num">${n}</span><span><strong>${t}</strong><br>${d}</span></li>`;
      const subject = existing ? "Your Xplor Pay application is ready to start" : "Welcome to Xplor Pay: your sign-in details";
      // An existing user has no temporary password and no forced password change: Sign in goes to the business picker.
      const signIn = existing ? () => setState({ screen: "pickBusiness", pickedBiz: "" }) : () => setState({ screen: "login", loginStage: "credentials", loginErr: "" });
      return html`<div class="mailview" data-key="email${existing ? "-existing" : ""}">
  <div class="mail-bar">
    <div class="mail-subject">${subject}${pin(existing ? "existing-user-new-business" : "welcome-email-first")}</div>
    <div class="mail-meta"><span class="mail-avatar" aria-hidden="true">X</span><span><strong>Xplor Pay</strong> &lt;no-reply@xplorpay.example&gt;<br><span class="mail-to">To: dana@riversidepilates.example</span></span></div>
  </div>
  <div class="em-wrap">
    <div class="em-logo"><img src="assets/xplor-pay-logo.png" alt="Xplor Pay" width="150"></div>
    <div class="em">
      <div class="em-hero">${existing ? html`<h1>Your application is ready to start</h1><p>We've started a new Xplor Pay application for Riverside Pilates. Sign in to your existing account to pick it up.</p>` : html`<h1>Welcome to Xplor Pay</h1><p>Your account is ready. Here are your sign-in details, so you can sign in and get started.</p>`}</div>
      <div class="em-body">
        <h2>${existing ? "Your application" : "Your sign-in details"}</h2>
        <p>${existing ? "You already have an account, so there's nothing new to set up. Sign in with the same details you always use." : "Use these to sign in for the first time. Your temporary password works for 30 days, so sign in before then."}</p>
        <div class="em-creds">
          ${existing ? html`<div class="em-label">Business</div><div class="em-val">Riverside Pilates</div><div class="em-label">Your username</div><div class="em-val">dana@riversidepilates.example</div>` : html`<div class="em-label">Username</div><div class="em-val">dana@riversidepilates.example</div>
          <div class="em-label">Temporary password</div><div class="em-val em-mono">Xp-7Kd2-demo</div>`}
        </div>
        <button type="button" class="em-btn" data-click="${on(signIn)}">Sign in</button>
        <hr class="em-rule">
        <h2>What happens next</h2>
        <ol class="em-steps">
          ${existing ? html`${step(1, "Sign in", "Use your existing username and password.")}
          ${step(2, "Open your application", "You'll see it waiting for you as soon as you're in.")}
          ${step(3, "Tell us about your business", "Answer a few questions, and you'll be ready to take payments.")}` : html`${step(1, "Sign in", "Use the username and temporary password above.")}
          ${step(2, "Choose a new password", "We'll ask you to replace the temporary one straight away.")}
          ${step(3, "Start your application", "Tell us about your business, and you'll be ready to take payments.")}`}
        </ol>
        <div class="em-note"><strong>Didn't expect this email?</strong> You can ignore it, and nothing will change. If you'd like to check, contact us at support@xplorpay.example.</div>
      </div>
    </div>
    <p class="em-foot">This email was sent to dana@riversidepilates.example because ${existing ? "a new application was started on your Xplor Pay account" : "an Xplor Pay account was set up for you"}.<br>&copy; Xplor Technologies. All rights reserved.</p>
  </div>
</div>`;
    }

    // Existing user, new business (decision existing-user-new-business): after the email, one simple choice of which
    // business to sign in with. The new one goes into the normal flow; the other does nothing in the prototype.
    // Sign in confirms the choice; picking a card only selects it (decision existing-user-new-business).
    function signInToBiz() {
      if (state.pickedBiz === "new") openLink();
      else if (state.pickedBiz === "existing") showToast("Prototype only", "Harbor Yoga Studio's dashboard isn't part of this prototype.", "info");
    }

    function pickBusinessView() {
      return html`<div class="welcome" data-key="pick-business">
    <div class="welcome-inner">
      <span class="tag tag--purple">${icon("users", 13)}Your businesses</span>
      <h1 class="welcome-title">Which business do you want to sign in with?${pin("existing-user-new-business")}</h1>
      <p class="welcome-lede">You have more than one business on Xplor Pay. Pick the one you want to work on.</p>
      <div class="biz-list" role="radiogroup" aria-label="Your businesses">
        <button type="button" class="biz-card${state.pickedBiz === "new" ? " is-selected" : ""}" role="radio" aria-checked="${String(state.pickedBiz === "new")}" data-key="pick-new" data-click="${on(() => setState({ pickedBiz: "new" }))}">
          <span class="biz-radio" aria-hidden="true"></span>
          <span><span class="biz-label">Riverside Pilates <span class="chip chip--success">New application</span></span><span class="biz-desc">Application ready to start</span></span>
        </button>
        <button type="button" class="biz-card${state.pickedBiz === "existing" ? " is-selected" : ""}" role="radio" aria-checked="${String(state.pickedBiz === "existing")}" data-key="pick-existing" data-click="${on(() => setState({ pickedBiz: "existing" }))}">
          <span class="biz-radio" aria-hidden="true"></span>
          <span><span class="biz-label">Harbor Yoga Studio</span><span class="biz-desc">Active</span></span>
        </button>
      </div>
      <div class="entry-actions">
        <div class="footer-end"><button type="button" class="btn btn-primary btn-lg"${state.pickedBiz ? "" : " disabled"} data-click="${on(signInToBiz)}">Continue${icon("arrow-r", 19)}</button></div>
      </div>
    </div>
  </div>`;
    }

    // The default front door (decision login-default-start): email and a temporary password, then a forced
    // password change, same shape as a real first sign-in. Lands wherever openLink() sends it.
    function loginView() {
      if (state.loginStage === "change") {
        return html`<div class="welcome" data-key="login-change">
    <div class="welcome-inner welcome-inner--entry">
      <span class="tag tag--purple">${icon("lock", 13)}Secure sign-in</span>
      <h1 class="welcome-title">Change your password${pin("login-default-start")}</h1>
      <p class="welcome-lede">Your temporary password has to be changed before you continue.</p>
      <form class="card entry-card" data-submit="${on(submitNewPassword)}"${state.changeErr ? html` data-error="1"` : ""}>
        <div class="stack">
          <div><label class="field-label field-label--block" for="login-new-pw">New password</label>
          <input class="input" id="login-new-pw" type="password" autocomplete="new-password" value="${state.newPassword}" data-input="${on((e) => setState({ newPassword: e.target.value, changeErr: "" }))}"></div>
          <div><label class="field-label field-label--block" for="login-confirm-pw">Enter new password again</label>
          <input class="input" id="login-confirm-pw" type="password" autocomplete="new-password" value="${state.confirmPassword}" data-input="${on((e) => setState({ confirmPassword: e.target.value, changeErr: "" }))}"></div>
        </div>
        ${state.changeErr && errMsg(state.changeErr)}
        <div class="entry-actions">
          <div class="footer-end"><button type="submit" class="btn btn-primary btn-lg">Save password and sign in${icon("arrow-r", 19)}</button></div>
        </div>
      </form>
    </div>
  </div>`;
      }
      return html`<div class="welcome" data-key="login">
    <div class="welcome-inner welcome-inner--entry">
      <span class="tag tag--purple">${icon("lock", 13)}Secure sign-in</span>
      <h1 class="welcome-title">Sign in with your email and password${pin("login-default-start")}</h1>
      <p class="welcome-lede">${isReturning() ? "Sign in to pick up where you left off." : "Use the temporary password we sent you to get started."}</p>
      <form class="card entry-card" novalidate data-submit="${on(submitLogin)}"${state.loginErr ? html` data-error="1"` : ""}>
        <div class="stack">
          <div><label class="field-label field-label--block" for="login-email">Email</label>
          <input class="input" id="login-email" type="email" autocomplete="username" placeholder="name@host.com" value="${state.loginEmail}" data-input="${on((e) => setState({ loginEmail: e.target.value, loginErr: "" }))}"></div>
          <div><label class="field-label field-label--block" for="login-password">Password</label>
          <input class="input" id="login-password" type="password" autocomplete="current-password" placeholder="Password" value="${state.loginPassword}" data-input="${on((e) => setState({ loginPassword: e.target.value, loginErr: "" }))}"></div>
        </div>
        ${state.loginErr && errMsg(state.loginErr)}
        <div class="entry-actions">
          <div class="footer-end">
            <button type="button" class="btn btn-ghost btn-md" data-click="${on(() => showToast("Prototype only", "Password reset isn't simulated.", "info"))}">Send me another password</button>
            <button type="submit" class="btn btn-primary btn-lg">${isReturning() ? "Sign in" : "Continue"}${icon("arrow-r", 19)}</button>
          </div>
        </div>
      </form>
    </div>
  </div>`;
    }

  // Page 2: who you are, asked before any field so nothing that doesn't apply is shown.
  function bizTypeView() {
    return html`<div class="welcome" data-key="biztype">
  <div class="welcome-inner">
    <span class="tag tag--purple">${icon("shield", 13)}About your business</span>
    <h1 class="welcome-title">What type of business are you?${pin("business-type-first")}</h1>
    <p class="welcome-lede">Tell us how your business is set up. We'll only ask the questions that apply to you.</p>
    <div class="biz-list" role="radiogroup" aria-label="Business type">
      ${BIZ_TYPES.map((t) => {
        // The selected Company or Non-profit card opens up and holds its follow-up question inside it (decision type-asked-on-business-type-page).
        const head = (cls) => html`<button type="button" class="biz-card${state.bizType === t.id ? " is-selected" : ""}${cls}" role="radio" aria-checked="${String(state.bizType === t.id)}" data-key="biz-${t.id}" data-click="${on(() => chooseBizType(t.id))}">
        <span class="biz-radio" aria-hidden="true"></span>
        <span><span class="biz-label">${t.label}</span><span class="biz-desc">${bizDesc(t)}</span></span>
      </button>`;
        if (state.bizType === t.id && t.id === "company") return html`<div class="biz-open" data-key="biz-open-company">${head(" biz-head")}<div class="biz-sub" data-key="biz-sub-company">
        <label class="field-label field-label--block" for="f-structure-up">What kind of company is it?${REQ}</label>
        ${selectView({ id: "f-structure-up", value: state.a.structure, placeholder: "Choose a type", pick: (v) => set("structure", v), options: companyStructures().map((op) => [op, op]) })}
      </div></div>`;
        if (state.bizType === t.id && t.id === "non-profit") return html`<div class="biz-open" data-key="biz-open-nonprofit">${head(" biz-head")}<div class="biz-sub" data-key="biz-sub-nonprofit">
        <span class="field-label field-label--block" id="l-structure-up">What type of organization is it?${REQ}</span>
        <div class="yn yn--pills" role="group" aria-labelledby="l-structure-up">${NONPROFIT_TYPES.map((opt) => html`<button type="button" class="yn-btn" aria-pressed="${String(state.a.structure === opt)}" data-click="${on(() => set("structure", opt))}">${opt}</button>`)}</div>
      </div></div>`;
        return head("");
      })}
    </div>
    <div class="actions">
      <button type="button" class="btn btn-outline btn-lg" data-click="${on(() => go("welcome", 1))}">${icon("chev-l", 17)}Back</button>
      <button type="button" class="btn btn-primary btn-lg" ${state.bizType && (isSole() || state.a.structure) ? "" : "disabled"} data-click="${on(() => state.bizType && (isSole() || state.a.structure) && go("flow", 1))}">Continue${icon("arrow-r", 19)}</button>
    </div>
  </div>
</div>`;
  }

  // A small ring that fills clockwise with how much of a step is done, in the brand colour. Its fill is set through the CSSOM in applyWidths.
  const ringView = (p, big) => html`<span class="ring${big ? " ring--lg" : ""}" data-ring="${p}" aria-hidden="true"></span>`;

  function railView(v) {
    const ownerWaiting = (o) => o.status === "invited" && (ownerFields(o).some((f) => fieldError(f)) || doc("id_" + o.id).state !== "done");
    const waitingOn = state.owners.filter(ownerWaiting).length;
    const waitNote = waitingOn === 0 ? "" : waitingOn === 1 ? (isNonprofit() ? "Waiting on one person's details" : "Waiting on one owner's details") : "Waiting on " + waitingOn + (isNonprofit() ? " people's details" : " owners' details");
    // A step the applicant has opened can be returned to, and says whether it is finished or only partly done. Steps not yet opened cannot be reached (decision partial-steps-allowed).
    // A step the applicant has already moved past keeps its percentage ring when they come back to it, in place of the minutes estimate (decision step-ring-stays-on-return).
    // A finished step reads a green tick and Done in place of the ring and 100% (decision step-done-tick).
    const doneMeta = html`<span class="step-meta step-meta--done">${icon("check", 14, "i-b")}Done</span>`;
    const currentMeta = (s) => s.n < state.maxStep ? (stepPct(s.n) >= 100 ? doneMeta : html`<span class="step-meta step-meta--pct">${ringView(stepPct(s.n))}<span class="step-pct">${stepPct(s.n)}%</span></span>`) : html`<span class="step-meta">${stepMinutes(s.n)}</span>`;
    const items = STEPS.map((s) => {
      if (s.n === state.step && !state.editing) {
        return html`<li><div class="step is-current" aria-current="step"><span class="step-dot">${s.n}</span><span class="step-label">${stepName(s)}</span>${currentMeta(s)}</div></li>`;
      }
      const reachable = state.editing ? s.n < 7 : s.n <= state.maxStep;
      if (reachable && s.n !== state.step) {
        const sp = stepPct(s.n);
        const sub = s.n === 2 && waitNote && html`<span class="rail-sub" data-key="step2-waiting">${waitNote}</span>`;
        return html`<li><button type="button" class="step is-opened" data-click="${on(() => setState({ step: s.n }))}"><span class="step-dot">${s.n}</span><span class="step-label">${stepName(s)}${sub}</span>${sp >= 100 ? doneMeta : html`<span class="step-meta">${ringView(sp)}<span class="step-pct">${sp}%</span></span>`}</button></li>`;
      }
      if (s.n === state.step) {
        return html`<li><div class="step is-current" aria-current="step"><span class="step-dot">${s.n}</span><span class="step-label">${stepName(s)}</span>${currentMeta(s)}</div></li>`;
      }
      return html`<li><div class="step"><span class="step-dot">${s.n}</span><span class="step-label">${stepName(s)}</span><span class="step-meta">${stepMinutes(s.n)}</span></div></li>`;
    });
    const cur = STEPS[state.step - 1];
    return html`<nav class="rail${state.railOpen ? " is-open" : ""}" data-key="rail" aria-label="Verification steps">
  <div class="progress-head"><span class="progress-title" id="progress-label">Your progress</span><span class="progress-pct">${v.pct}%</span></div>
  <div class="meter" role="progressbar" aria-labelledby="progress-label" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${v.pct}"><span class="meter-fill" data-width="${v.pct}"></span></div>
  <p class="progress-note">${v.remainingLabel} · <span class="save-tell${state.saving ? " is-saving" : ""}" data-key="save-tell" role="status">${state.saving ? html`<span class="save-spinner" aria-hidden="true"></span>` : icon("check", 12)}${state.saving ? "Saving…" : "Saved"}</span></p>
  <div class="rail-now" data-key="rail-now"><span class="rail-now-text">${stepName(cur)}</span><button type="button" class="btn btn-neutral btn-sm" aria-expanded="${String(!!state.railOpen)}" aria-controls="rail-steps" data-click="${on(() => setState({ railOpen: !state.railOpen }))}">${state.railOpen ? "Hide steps" : "Show steps"}</button></div>
  <ol class="steps" id="rail-steps">${items}</ol>
</nav>`;
  }

  // The owner form as collapsible sections. Each starts closed (the first is open) and can be opened on its own; a section holding a problem stays open so the problem cannot be hidden (decision owner-form-accordion).
  function ownerSectionsView(o, recipient, closeOwner) {
    const secs = [];
    ownerFields(o).forEach((f) => {
      if (f.kind === "heading") secs.push({ h: f, fields: [] });
      else if (secs.length) secs[secs.length - 1].fields.push(f);
    });
    // Every owner field sits on a grid of thirds (decision owner-form-thirds). Each row holds one idea; a row with two boxes fills the first two thirds and the next row starts on a new line. The address and the yes / no question take the full width.
    const keyOf = (f) => f.id.replace(/^o\d+_/, "");
    const ROWS = [["first", "middle", "last"], ["role", "pct"], ["dob", "nationality", "residence"], ["email", "phone"], ["idType", "idNumber"], ["idExpiry", "idCountry"], ["natId"]];
    // Personal details sits on a grid of thirds (decision personal-details-one-column): the three name boxes fill one row, Title and Ownership percentage share a row, Email and Phone share a row (a third each), and every other box spans two thirds. Identity verification keeps its rows of two.
    const PAIRS = [["role", "pct"], ["email", "phone"]];
    const gridView = (fields, single) => fields.map((f) => {
      const k = keyOf(f);
      // Identity verification (decision personal-details-one-column): every box is two thirds wide on its own row.
      if (single === "id") return html`<div class="span-2" data-key="one-${f.id}">${fieldView(f)}</div>`;
      if (single) {
        if (["first", "middle", "last"].indexOf(k) > -1) return fieldView(f);
        // The home address takes the full width so its search box and street boxes are two thirds and city, state and ZIP a third each, as in owner-address-two-thirds.
        if (f.kind === "address") return html`<div class="span-3" data-key="one-${f.id}">${fieldView(f)}</div>`;
        const pr = PAIRS.filter((x) => x.indexOf(k) > -1 && x.every((n) => fields.some((y) => keyOf(y) === n)))[0];
        if (pr) return k === pr[0] ? html`<div class="fields-pair" data-key="row-${f.id}">${fieldView(f)}${fieldView(fields.filter((y) => keyOf(y) === pr[1])[0])}</div>` : "";
        return html`<div class="span-2" data-key="one-${f.id}">${fieldView(f)}</div>`;
      }
      const row = ROWS.filter((r) => r.indexOf(k) > -1)[0];
      if (row) {
        const inRow = fields.filter((x) => row.indexOf(keyOf(x)) > -1);
        return f === inRow[0] ? html`<div class="span-2 fields-row" data-key="row-${f.id}">${inRow.map(fieldView)}</div>` : "";
      }
      return fieldView(f);
    });
    return html`<div class="owner-secs" data-key="secs-${o.id}">${secs.map((sec, idx) => {
      const hasErr = sec.fields.some((x) => ERR[x.id]);
      // Until the applicant opens or closes a section it follows the default: Personal details is open, the others are closed. One holding a problem stays open.
      const chosen = state.secOpen[sec.h.id];
      const closed = (chosen === undefined ? idx !== 0 : !chosen) && !hasErr;
      const toggle = () => setState((st) => ({ secOpen: Object.assign({}, st.secOpen, { [sec.h.id]: closed }) }));
      // Where the section stands (decision section-status-chip): the required answers that are in and valid, out of all it needs. Optional boxes are not counted.
      const need = sec.fields.filter((x) => x.required && x.kind !== "heading");
      const have = need.filter((x) => !fieldError(x)).length;
      // Prefilled values count like typed ones (decision status-chip-counts-prefilled): Add myself starts partly done, and a new owner has only the 100% ownership percentage prefilled, so it reads 1 of 10 done (the percentage is the share still unaccounted for, never below 25, and 100 for the first owner).
      const status = !need.length ? "" : have === need.length ? html`<span class="pill pill--positive sec-status">${icon("check", 13, "i-b")}Done</span>` : have === 0 ? html`<span class="pill pill--warning sec-status">Not started</span>` : html`<span class="pill pill--warning sec-status">${have} of ${need.length} done</span>`;
      // Done at the foot of each section (decision section-done-buttons): on every section but the last it closes this one and opens the next; on the last it closes the whole owner card. Nothing is saved or checked, since each field is kept as it is filled in. The invited owner's own page has no card to close, so its last section has no button.
      const last = idx === secs.length - 1;
      const doneClick = () => {
        if (last) { setState((st) => ({ secOpen: Object.assign({}, st.secOpen, { [sec.h.id]: false }) })); return; }
        const nextId = secs[idx + 1].h.id;
        setState((st) => ({ secOpen: Object.assign({}, st.secOpen, { [sec.h.id]: false, [nextId]: true }) }));
      };
      return html`<section class="owner-sec${closed ? "" : " is-open"}" data-key="${sec.h.id}">
  <h3 class="sec-head"><button type="button" class="sec-toggle" aria-expanded="${String(!closed)}" data-click="${on(toggle)}"><span class="sec-label">${icon(/hdg_id$/.test(sec.h.id) ? "shield" : "user", 18, "sec-icon")}${sec.h.label}${status}</span>${icon("chev-d", 16, "sec-chev")}</button></h3>
  ${!closed && html`<div class="fields fields--3">${gridView(sec.fields, /hdg_id$/.test(sec.h.id) ? "id" : "personal")}</div>`}
  ${!closed && html`<div class="sec-actions" data-key="done-${sec.h.id}"><button type="button" class="btn btn-neutral btn-sm" data-click="${on(doneClick)}">Done</button></div>`}
</section>`;
    }) }</div>`;
  }

  function ownerView(o, recipient) {
    // The owner card no longer collapses (decision owner-card-no-accordion): it is always open, and the header holds only the name, the status and the remove icon.
    const isOpen = true;
    const closeOwner = () => {};
    const nm = ownerInfo(o).name;
    const known = !!nm && nm !== "New owner";
    const invited = o.status === "invited";
    const menuOpen = state.menuOwner === o.id;
    // Actions menu: what is on offer depends on whether the person has signed in yet (decisions owner-actions-menu, remove-access-vs-owner).
    const items = [];
    if (invited && !o.signedIn) {
      items.push({ label: "Resend invite", ic: "mail", go: () => resendInvite(o.id) });
      items.push({ label: "Change email", ic: "pen", go: () => { closeMenu(); openDelegate(o.id); } });
      items.push({ label: "Cancel invite", ic: "x", go: () => cancelInvite(o.id) });
    }
    if (invited && o.signedIn) items.push({ label: "Remove access", ic: "x", go: () => askConfirm("access", o.id) });
    if (items.length) items.push({ sep: true });
    items.push({ label: "Remove owner", ic: "trash", danger: true, go: () => removeOwnerClick(o.id) });
    return html`<article class="person${isOpen ? " is-open" : ""}${menuOpen ? " has-menu" : ""}" data-key="owner-${o.id}">
  <div class="person-head">
    <span class="avatar" aria-hidden="true">${o.initials === "—" || o.initials === "?" ? icon("user", 16) : o.initials}</span>
    <div class="grow">
      <h3 class="person-name">${o.name}</h3>
      ${invited && !String(ownerVal(o, "name")).trim() && html`<div class="person-meta">Waiting for their details</div>`}
    </div>
    ${!recipient && Object.keys(ERR).some((k) => k.indexOf("o" + o.id + "_") === 0) && html`<span class="pill pill--danger">${icon("alert", 13)}Needs a look</span>`}
    ${!recipient && invited && !o.signedIn && html`<span class="pill pill--warning">${icon("clock", 13)}Invited · ${o.inviteEmail || "filling in their own details"}</span>`}
    ${!recipient && invited && o.signedIn && !o.received && html`<span class="pill pill--neutral">${icon("user", 13)}Signed in · ${o.inviteEmail || "invited"}</span>`}
    ${!recipient && invited && o.received && html`<span class="pill pill--positive">${icon("check", 13, "i-b")}Details received${o.receivedAt ? " · " + o.receivedAt : ""}</span>`}
    ${!recipient && o.status === "pending" && o.revoked && html`<span class="pill pill--neutral">Access removed</span>`}
    ${!recipient && invitesOn() && o.status === "pending" && !isSole() && !o.self && html`<button type="button" class="btn btn-outline btn-xs" data-click="${on(() => openDelegate(o.id))}">${icon("mail", 14)}${o.revoked ? "Send a new invite" : "Send invite"}</button>`}
    ${!recipient && !isSole() && !invitesOn() && html`<button type="button" class="btn btn-xs btn-tertiary-negative btn-icon-only" aria-label="Remove ${known ? nm : "this owner"}" data-click="${on(() => removeOwnerClick(o.id))}">${icon("trash", 14)}</button>`}
    ${!recipient && !isSole() && invitesOn() && html`<span class="kebab-wrap" data-key="menu-${o.id}"><button type="button" class="btn btn-xs person-toggle kebab" aria-label="More actions for ${known ? nm : "this owner"}" aria-haspopup="menu" aria-expanded="${String(menuOpen)}" data-click="${on(() => setState({ menuOwner: menuOpen ? 0 : o.id }))}">${icon("more", 16)}</button>${menuOpen && html`<ul class="action-menu" role="menu" data-key="menu-list">${items.map((it) => it.sep ? html`<li class="action-sep" role="separator"></li>` : html`<li role="none"><button type="button" role="menuitem" class="action-opt${it.danger ? " action-opt--danger" : ""}" data-click="${on(it.go)}">${icon(it.ic, 16)}${it.label}</button></li>`)}</ul>`}</span>`}
  </div>
  ${isOpen && html`<div class="person-body" data-key="body">${!recipient && invited && html`<p class="small-note invite-note">${known ? nm + " has been invited." : "They've been invited."} Anything you add here counts toward the application.</p>`}${ownerSectionsView(o, recipient, closeOwner)}</div>`}
</article>`;
  }

  function step2View(v) {
    // Add myself starts at the share still unaccounted for, but never below 25 (decision owner-share-minimum). A plain new owner starts with the same share and nothing else (decision status-chip-counts-prefilled).
    const shareLeft = () => Math.max(25, 100 - v.owners.reduce((x, o) => x + o.pct, 0));
    const addOwner = () => { const id = Date.now(); setState({
      owners: state.owners.concat([{ id: id, name: "New owner", initials: "—", pct: isCompany() ? shareLeft() : 100, role: "", status: "pending", self: false, added: true }]),
      openOwner: id
    }); };
    // "Add myself": the applicant is often the owner too. It fills in what step 1 already gave (email, phone), a sensible title, and the share still unaccounted for (never below 25). Nothing else is guessed, and every field stays editable.
    const addSelf = () => { const id = Date.now(); setState({
      owners: state.owners.concat([{ id: id, name: "New owner", initials: "—", pct: isNonprofit() ? 10 : shareLeft(), role: isNonprofit() ? "Director" : "Owner and CEO", status: "pending", self: true, added: true, me: true }]),
      openOwner: id
    }); };
    const addLabel = isNonprofit() ? (v.owners.length ? "Add another director or trustee" : "Add a director or trustee") : (v.owners.length ? "Add another owner or director" : "Add an owner or director");
    return html`${isCompany() && v.ownersOver100 && html`<div data-key="s2-total"${ERR.ownership ? html` data-error="1"` : ""}>${errView("ownership")}</div>`}
<div class="stack" data-key="s2-owners">
  ${v.owners.map((o) => ownerView(o))}
  ${errView("owners")}
  ${!isSole() && !v.owners.some((o) => o.self) && html`<button type="button" class="add-row" data-key="add-self" data-click="${on(addSelf)}">${icon("user", 16)}${isNonprofit() ? "Add myself as a director or trustee" : "Add myself as an owner"}</button>`}
  ${!isSole() && html`<button type="button" class="add-row" data-key="add-owner" data-click="${on(addOwner)}">${icon("plus", 16)}${addLabel}</button>`}${isSole() ? "" : pin("owner-self-serve")}
</div>`;
  }

  // A file that did not upload: the error callout takes the place of the file tile, with no buttons of its own (decision upload-failure-callout). The applicant uses Add file on the row to try again.
  function failedFileView(d, f) {
    return html`<div class="callout callout--error doc-fail" role="alert" data-key="file-${f.name}">${icon("alert", 16)}<span class="doc-fail-text"><strong>${f.name}</strong> didn't upload. Check the file and try again.</span></div>`;
  }

  // The Atlas File drop zone, shared by the document cards and the More info needed screen (decisions document-drop-zone, more-info-file-drop).
  // add gets the names of any files dropped on it, or an empty list when it is clicked (the prototype then adds a canned file).
  // Upload limits agreed with the back end (decision upload-limits): each file up to 5MB and up to 5 files on any one drop zone. files is what was dropped as { name, size }, or an empty list when the zone is clicked (the prototype then adds a canned file).
  const FILE_MAX_BYTES = 5 * 1024 * 1024, FILE_MAX_COUNT = 5;
  function takeFiles(files, have, add) {
    const room = FILE_MAX_COUNT - (have || 0);
    if (room <= 0) { showToast("You can add up to " + FILE_MAX_COUNT + " files here", "Remove one if you need to add another."); return; }
    if (!files.length) { add([]); return; }
    // Only PDF, PNG and JPEG files are taken (decision upload-limits). A dropped file is judged by its extension.
    const typed = files.filter((f) => /\.(pdf|png|jpe?g)$/i.test(f.name));
    if (typed.length < files.length) {
      const bad = files.filter((f) => !/\.(pdf|png|jpe?g)$/i.test(f.name));
      showToast(bad.length === 1 ? bad[0].name + " can't be added" : bad.length + " files can't be added", "We take PDF, PNG and JPEG files.");
      files = typed;
      if (!files.length) return;
    }
    const small = files.filter((f) => f.size <= FILE_MAX_BYTES);
    const big = files.length - small.length;
    const keep = small.slice(0, room);
    if (big) showToast(big === 1 ? files.filter((f) => f.size > FILE_MAX_BYTES)[0].name + " is over 5MB" : big + " files are over 5MB", "Each file can be up to 5MB. Try a smaller one.");
    else if (small.length > keep.length) showToast("Only " + keep.length + " added", "You can add up to " + FILE_MAX_COUNT + " files here.");
    if (keep.length) add(keep.map((f) => f.name));
  }
  const dropZoneView = (label, add, have) => html`<button type="button" class="dropzone" aria-label="${label}" data-click="${on(() => takeFiles([], have, add))}" data-drop="${on((e) => takeFiles(Array.from((e.dataTransfer && e.dataTransfer.files) || []).map((f) => ({ name: String(f.name).slice(0, 120), size: f.size })), have, add))}"><span class="dz-icon" aria-hidden="true">${icon("upload", 24)}</span><span class="dz-text"><span class="dz-prompt">Drag and drop files here</span><span class="dz-drop">Drop to upload</span><span class="dz-action">or <span class="dz-link">Choose files</span></span></span><span class="dz-hint">PDF, JPG or PNG. Up to 5 MB each.</span></button><p class="dz-helper">You can upload up to 5 files</p>`;

  function docView(d) {
    const s = d.skip ? "skipped" : doc(d.key).state;
    const cur = doc(d.key);
    const cls = s === "done" ? " is-done" : s === "skipped" ? " is-skipped" : s === "idle" || s === "failed" ? "" : " is-busy";
    // The drop zone stays under the text of every card, so any number of files can be added (decision document-drop-zone).
    // Clicking it adds the canned file. Dropping real files adds one tile for each, using only the file's name: nothing is read or sent.
    const action = s === "skipped" ? html`<span class="state-pill state-pill--muted">Not needed</span>` : "";
    const zone = s === "skipped" ? "" : dropZoneView("Add a file for " + d.title, (names) => (names.length ? names : [d.file]).forEach((n) => upload(d.key, n)), cur.files.filter((f) => !f.failed).length);
    return html`<article class="card card--p20 doc${cls}${d.division ? " is-division" : ""}" data-key="doc-${d.key}"${ERR["doc_" + d.key] ? html` data-error="1"` : ""}>
  <div class="doc-row">
    <span class="icon-tile icon-tile--neutral">${icon("file", 17)}</span>
    <div class="grow">
      <div class="doc-titlebar"><h3 class="doc-title">${d.title}</h3>${s === "done" ? "" : html`<span class="req${d.requirement === "Required" ? " req--required" : ""}">${d.requirement}</span>`}${d.division && html`<span class="division-tag">${d.division} only</span>`}</div>
      <p class="body-sm">${d.hint}</p>
      ${errView("doc_" + d.key)}
    </div>
    ${action}
  </div>
  ${zone}
  ${cur.files.length > 0 && html`<div class="doc-files" data-key="files-${d.key}">${cur.files.map((f) => f.failed ? failedFileView(d, f) : html`<div class="doc-file" data-key="file-${f.name}">${!f.busy && html`<span class="doc-file-ok" aria-hidden="true">${icon("circle-check", 16)}</span>`}<span class="doc-file-name" title="${f.name}">${f.name}</span>${!f.busy && html`<span class="sr-only">Uploaded</span>`}${f.busy ? html`<span class="state-pill state-pill--busy" role="status"><span class="spinner" aria-hidden="true"></span>Uploading</span>` : html`<button type="button" class="btn-link" aria-label="Remove ${f.name}" data-click="${on(() => setDocFiles(d.key, (fs) => fs.filter((x) => x.name !== f.name)))}">Remove</button>`}</div>`)}</div>`}
</article>`;
  }

  function step6View(v) {
    return html`<div class="doc-grid" data-key="s6-docs">${v.docList.filter((d) => !d.skip).map((d) => docView(d))}</div>`;
  }

  // ---------------------------------------------------------------------------
  // Documents to read before signing (step 7)
  // ---------------------------------------------------------------------------

  // Sample text for the prototype; the real documents come from legal.
  const AGREEMENTS = {
    agreement: {
      title: "Merchant services agreement, privacy policy and terms of service", meta: "PDF · 18 pages · version 4.2",
      sections: [
        ["1. What we provide", "Xplor Pay processes card payments for your business and pays the proceeds out to your bank account."],
        ["2. Fees", "You pay the rates in your fee schedule."],
        ["3. Term and ending the agreement", "There is no minimum term. You can close your account at any time and there is no exit fee."],
        ["4. Disputes and chargebacks", "If a cardholder disputes a payment, we will tell you what evidence is needed and by when, and you keep control of the response."],
        ["5. Getting paid, and money we may need back", [
          "By accepting this agreement you authorize Xplor Pay to take the actions below. Your payout account is the account you gave us at step 4 of your application.",
          "(a) Collect fees and charges. We may collect the fees and any other amounts you owe us, or owe our affiliates or subsidiaries, by electronic debit from your payout account (ACH in the United States, EFT in Canada).",
          "(b) Recover chargebacks, refunds and returns. We may recoup, retrieve or collect funds for chargebacks, refunds and returns by electronic debit from your payout account, or from any other account of yours that has an available balance.",
          "(c) Hold a reserve. Where we reasonably consider it necessary to protect our interests, we may set up a reserve account and hold funds in it.",
          "(d) Withhold funds when the law requires it. We may withhold funds in line with any lawful order, garnishment or tax levy.",
          "(e) Move funds to settle transactions. We may transfer billed amounts to an account we hold, so that the transactions run at your place or places of business can be settled."
        ]],
        ["6. Setting up and running your account", [
          "By accepting this agreement you also authorize Xplor Pay to take the actions below.",
          "(a) Open your merchant account. We may set up a primary merchant account for you with a payment processor of our choosing.",
          "(b) Use your information to provide the service. We may access your information, including cardholder data, for the purpose of providing the payment services in this agreement.",
          "(c) Sign and act for you. We may sign documents on your behalf, or take any other action we reasonably consider necessary and consistent with the terms of this agreement.",
          "(d) Reach your payout account. We may access the account or accounts you have designated for receiving and accepting payments on settled transactions, together with any adjustments made on your behalf."
        ]],
        ["7. The authority you give us", [
          "The authority you give us in this agreement is a power of attorney. It is irrevocable and coupled with an interest."
        ]],
        ["8. What you confirm", [
          "(a) Underwriting. Your application may be rejected in underwriting. Once we accept it, this agreement is a legally binding agreement between you and Xplor Pay.",
          "(b) Documents that are part of this agreement. The terms and conditions, and any other documents this agreement refers to, are part of the agreement.",
          "(c) Fees and compliance. We provide the payment services on condition that you pay all fees and other charges, and that you follow our terms of service and privacy policy, as they may be revised from time to time."
        ]],
        ["9. Privacy policy: what we collect", "The business, ownership and identity details you give us in this application, and the documents you upload."],
        ["10. Privacy policy: how it is used", "To verify your business, meet card network and anti-money-laundering requirements, and run your account."],
        ["11. Privacy policy: who sees it", "Trulioo, our verification partner, and the card networks, where the rules require it. Files are stored encrypted."]
      ]
    }
  };

  function openDoc(key) {
    setState((s) => ({ viewDoc: key, viewed: Object.assign({}, s.viewed, { [key]: true }) }));
  }
  const closeDoc = () => setState({ viewDoc: "" });

  // Download (decision terms-download): saves the sample text as a plain text file so it can go to a legal team. The real
  // product would hand over the same versioned PDF the viewer shows.
  function downloadDoc(key) {
    const d = AGREEMENTS[key];
    if (!d) return;
    const body = d.sections.map((sec) => sec[0] + "\n" + [].concat(sec[1]).join("\n\n")).join("\n\n");
    const text = d.title + "\n" + d.meta + "\nPrototype sample text, not the real document.\n\n" + body + "\n";
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = d.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + ".txt";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("Downloaded " + d.title);
  }

  const SAVE_EMAIL_OK = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  function docViewerView(v) {
    const key = state.viewDoc;
    const a = AGREEMENTS[key];
    if (!a) return "";
    const title = a.title;
    const meta = a.meta;
    return html`<div class="backdrop" data-key="doc-view">
  <div class="dialog dialog--wide" role="dialog" aria-modal="true" aria-labelledby="docv-title">
    <div class="dialog-head">
      <span class="icon-tile icon-tile--neutral">${icon("file", 18)}</span>
      <div class="grow">
        <h2 class="dialog-title" id="docv-title">${title}</h2>
        <p class="dialog-sub">${meta}</p>
      </div>
      <button type="button" class="icon-btn" aria-label="Close" data-click="${on(closeDoc)}">${icon("x", 16)}</button>
    </div>
    <div class="docv-paper" tabindex="0" role="document" aria-label="${title}">
      ${a.sections.map((sec) => html`<div><h3 class="docv-h">${sec[0]}</h3>${[].concat(sec[1]).map((p) => html`<p class="docv-p">${p}</p>`)}</div>`)}
    </div>
    <div class="docv-foot">
      <span class="small-note">Prototype preview: sample text, not the real document.</span>
      <span class="docv-actions">
        <button type="button" class="btn btn-outline btn-md" data-click="${on(() => downloadDoc(key))}">${icon("download", 17)}Download</button>
        <button type="button" class="btn btn-primary btn-md" id="docv-close" data-click="${on(closeDoc)}">Close</button>
      </span>
    </div>
  </div>
</div>`;
  }

  function reviewView(v) {
    return html`<div class="summary" data-key="s7-summary">
  ${v.summary.map((r) => html`<div class="summary-row">
    ${r.partial ? html`<span class="ring ring--lg" data-ring="${r.pct}" role="img" aria-label="${r.pct}% done"></span>` : html`<span class="tick">${icon("check", 13, "i-b")}</span>`}
    <div class="grow"><div class="summary-label">${r.label}</div><div class="summary-value" title="${r.value}">${r.value}</div></div>
    <button type="button" class="btn-link btn-link--md" aria-label="${r.partial ? "Continue" : "Edit"} ${r.label}" data-click="${on(() => editFromReview(r.step))}">${r.partial ? "Continue" : "Edit"}</button>
  </div>`)}
</div>`;
  }

  // ---------------------------------------------------------------------------
  // Signing (decisions docusign-sign-in-modal, docusign-signed-only-when-confirmed, docusign-mock-mode).
  // The applicant signs one short agreement in a Docusign window that opens on top of the page: no redirect and no new tab. It replaces the
  // accept-the-agreement tick and the drawn signature. This prototype has no Docusign account behind it, so the window is a MOCK that looks
  // like the focused-view layout and has controls for every outcome. The words for engineers, the typed hook and the stubbed API are in docusign-signing/.
  // ---------------------------------------------------------------------------

  // Every word the signing card and window show, in one place for content review. docusign-signing/src/strings.ts holds the same words for the real build.
  const SIGN_COPY = {
    title: "Sign it off",
    intro: "Review and sign the agreement to finish your application. It includes our terms and confirms that everything you've provided is true. It opens in a window on this page.",
    docTitle: "[Agreement title]",
    badge: { checking: "Checking", signed: "Signed" },
    statement: "I confirm that everything I've provided in this onboarding is true.",
    review: "Review and sign",
    retry: "Try again",
    reviewAgain: "Review the agreement again",
    recheck: "Check again",
    close: "Close",
    opening: "Opening the agreement",
    mustSign: "Sign the agreement to submit your application.",
    holdHead: "Still needed before you can sign",
    delayedTitle: "We're still confirming your signature",
    delayedBody: "This can take a moment. You can submit once it's confirmed.",
    signedBody: (name, when) => "Signed by " + name + " on " + when + ".",
    outcome: {
      declined: { title: "You declined to sign", card: "Your application hasn't been submitted. You can review the agreement again whenever you're ready.", modal: "You declined to sign, so your application hasn't been submitted. Review the agreement again when you're ready, or close this window and contact us if you have questions." },
      cancelled: { title: "Signing wasn't finished", card: "Nothing was signed. You can start again whenever you're ready.", modal: "Nothing was signed. Start again to get a fresh agreement to review." },
      expired: { title: "The signing window timed out", card: "It was open too long, so it closed. Nothing was signed. Start again to get a fresh one.", modal: "The signing window was open too long, so it closed. Nothing was signed. Start again to get a fresh one." },
      error: { title: "We couldn't open the agreement", card: "Nothing was signed. Try again, or contact us if it keeps happening.", modal: "Nothing was signed. Try again, or contact us if it keeps happening." }
    },
    contact: () => "Call us on " + SUPPORT_PHONE + " or email support@xplorpay.example.",
    modal: { loadingTitle: "Opening your agreement", loadingSub: "The agreement will appear here when it's ready.", readySub: "Read the agreement, then sign.", closeLabel: "Close the signing window", leaveTitle: "Leave without signing?", leaveBody: "Nothing in this window is kept. You can open the agreement again at any time.", keep: "Keep signing", leave: "Leave" },
    mock: { badge: "Mock mode", note: "Prototype only. The real window is Docusign's, and these buttons stand in for what it reports back.", frameNote: "Approximates the focused-view layout.", signTab: "Sign here", signedTab: "Signed", urlFails: "The next request for a signing link fails", backendPending: "Our system is slow to confirm the signature (the first check says pending)" },
    say: { loading: "Opening the agreement.", ready: "The agreement is ready to sign.", declined: "You declined to sign.", cancelled: "Signing wasn't finished.", expired: "The signing window timed out.", error: "We couldn't open the agreement.", checking: "Signing complete. Checking your signature.", delayed: "We're still confirming your signature.", signed: "Signed. You can submit your application." }
  };
  // The Docusign window's own style options, the only ones the docs list (docusign-signing/README.md section 5). The colours are the Atlas primary button's light-mode values; Docusign does not follow our light and dark modes.
  const SIGN_STYLE = { primaryButton: { color: "#ffffff", backgroundColor: "#793ef7" }, signingNavigationButton: { finishText: "Sign and finish", position: "bottom-right" } };

  const SIGN_FAILED = ["declined", "cancelled", "expired", "error"];
  let signTimers = [];
  const signClear = () => { signTimers.forEach(clearTimeout); signTimers = []; };
  const signLater = (ms, fn) => { signTimers.push(setTimeout(fn, ms)); };
  const signedConfirmed = () => state.signStatus === "signed" && state.signConfirm === "confirmed";

  // Review & sign. The real build asks the back end for a one-time signing link now, not when the step loads, because the link works once and expires after about 5 minutes.
  function openSigning(name) {
    // Nobody signs an incomplete application: the button is off until every earlier step is complete, and this covers any other way in.
    if (stepGaps().length) return;
    signClear();
    setState({ signModal: true, signStatus: "loading", signLeaveAsk: false, signTabDone: false, signHold: false, signConfirm: "", signFor: { name: String(name || "").trim() }, signSay: SIGN_COPY.say.loading });
    signLater(700, () => {
      if (state.signStatus !== "loading") return;
      // A failed request for the signing link is the hook's error state.
      if (state.signMockUrlFails) { signEnd("exception"); return; }
      signLater(800, () => { if (state.signStatus === "loading" && !state.signHold) signReady(); });
    });
  }
  const signReady = () => setState({ signStatus: "ready", signHold: false, signLeaveAsk: false, signSay: SIGN_COPY.say.ready });

  // The mock's version of Docusign's sessionEnd event. The window is removed when it fires. Only "signing_complete" leads on, and even that is not proof: the step waits for the back end to say the envelope is completed.
  function signEnd(type) {
    signClear();
    if (type === "signing_complete") {
      setState({ signModal: false, signStatus: "signed", signLeaveAsk: false, signSay: SIGN_COPY.say.checking });
      checkSigning();
      return;
    }
    const map = { decline: "declined", cancel: "cancelled", viewing_complete: "cancelled", session_timeout: "expired", ttl_expired: "expired" };
    const status = map[type] || "error";
    setState({ signStatus: status, signLeaveAsk: false, signSay: SIGN_COPY.say[status] });
  }
  // GET signing-status in the real build. Only "completed" counts as signed.
  function checkSigning() {
    signClear();
    setState({ signConfirm: "checking" });
    signLater(900, () => {
      // Mock mode: the pending switch holds for one check only, so Check again can be tried afterwards.
      if (state.signMockPending) { setState({ signConfirm: "delayed", signMockPending: false, signSay: SIGN_COPY.say.delayed }); return; }
      setState({ signConfirm: "confirmed", signAt: new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }), signSay: SIGN_COPY.say.signed });
    });
  }
  // The close button and Escape never leave the applicant stuck: mid-signing they ask once, anywhere else they just close.
  function requestCloseSigning() {
    if (state.signStatus === "ready") { setState({ signLeaveAsk: true }); return; }
    closeSigning();
  }
  function closeSigning() {
    signClear();
    const s = state.signStatus;
    setState({ signModal: false, signLeaveAsk: false, signStatus: s === "loading" ? "idle" : s === "ready" ? "cancelled" : s, signSay: s === "ready" ? SIGN_COPY.say.cancelled : "" });
  }
  function escapeSigning() {
    if (state.signLeaveAsk) setState({ signLeaveAsk: false });
    else requestCloseSigning();
  }
  function simulateSigning(what) {
    if (what === "loading") { signClear(); setState({ signStatus: "loading", signHold: true, signTabDone: false, signLeaveAsk: false, signSay: SIGN_COPY.say.loading }); }
    else if (what === "ready") signReady();
    else signEnd(what);
  }

  // The last part of step 7, built on the shared card component like every other card (card() and cardView(), decision docusign-card-component):
  // the title and the description come from the card, and the agreement container sits in its foot. The person who was sent the application is the
  // person who signs, so there is no name, title or "change who signs" (decision docusign-signer-is-the-recipient).
  function signView(v) {
    const S = state.signStatus, C = state.signConfirm;
    const done = signedConfirmed();
    const failed = SIGN_FAILED.indexOf(S) >= 0 && !state.signModal;
    const busy = S === "loading" || S === "ready";
    const name = done && state.signFor ? state.signFor.name : String(v.signatoryName || "").trim();
    // The right-hand end of the container: the button until the applicant has signed, then a badge that says where it stands (decision docusign-button-in-document-row).
    let end;
    if (done) end = html`<span class="pill pill--positive">${icon("check", 13, "i-b")}${SIGN_COPY.badge.signed}</span>`;
    else if (S === "signed") end = html`<span class="pill pill--info">${C === "checking" && html`<span class="spinner" aria-hidden="true"></span>`}${SIGN_COPY.badge.checking}</span>`;
    else {
      const hold = v.signHold || [];
      const goBtn = html`<button type="button" class="btn btn-primary btn-md sign-go" id="sign-open"${attr("disabled", busy || hold.length > 0)} data-click="${on(() => openSigning(name))}">${busy ? html`<span class="spinner spinner--on-brand" aria-hidden="true"></span>${SIGN_COPY.opening}` : html`${icon("pen", 17)}${failed && S !== "declined" ? SIGN_COPY.retry : SIGN_COPY.review}`}</button>`;
      // Off until every earlier step is complete. A disabled button cannot be hovered, so the reason is on a wrapper that can (decision docusign-sign-needs-complete-application).
      end = gateView(v, goBtn, { missing: hold, tip: "signTip", head: SIGN_COPY.holdHead, key: "sign-gate" });
    }
    // Only what needs more than a badge gets a message under the container.
    let status = "";
    if (S === "signed" && !done && C !== "checking") {
      status = html`<div class="callout callout--warning callout--card" data-key="sign-delayed">${icon("clock", 16)}<div class="callout-content"><div class="callout-text"><strong class="callout-title">${SIGN_COPY.delayedTitle}</strong><span>${SIGN_COPY.delayedBody}</span></div><div><button type="button" class="btn btn-outline btn-sm" data-click="${on(checkSigning)}">${SIGN_COPY.recheck}</button></div></div></div>`;
    } else if (failed) {
      const o = SIGN_COPY.outcome[S];
      status = html`<div class="callout ${S === "error" ? "callout--error" : "callout--warning"} callout--card" data-key="sign-failed">${icon("alert", 16)}<div class="callout-content"><div class="callout-text"><strong class="callout-title">${o.title}</strong><span>${o.card}</span>${S === "error" && html`<span>${SIGN_COPY.contact()}</span>`}</div></div></div>`;
    }
    const foot = html`<div class="sign-doc" data-key="sign-doc" tabindex="-1">
    <span class="icon-tile icon-tile--neutral" aria-hidden="true">${icon("file", 18)}</span>
    <div class="grow"><div class="sign-doc-title">${SIGN_COPY.docTitle}</div>${done && html`<div class="sign-doc-meta">${SIGN_COPY.signedBody(name, state.signAt)}</div>`}</div>
    <span class="sign-end">${end}</span>
  </div>
  <div class="sr-only" role="status" aria-live="polite">${state.signModal ? "" : state.signSay}</div>
  ${status}
  ${ERR.sign && !busy && !done && S !== "signed" && html`<div data-error="1" data-key="sign-action">${errMsg(SIGN_COPY.mustSign)}</div>`}`;
    return card("s7-sign", SIGN_COPY.title, SIGN_COPY.intro, [], { pinId: "docusign-sign-in-modal", foot });
  }

  // The window. It holds what Docusign mounts (here, the mock), a loading state until Docusign says it is ready, and a result for every way it can end.
  function signModalView() {
    const S = state.signStatus;
    const who = state.signFor || { name: "" };
    const failed = SIGN_FAILED.indexOf(S) >= 0;
    const title = S === "loading" ? SIGN_COPY.modal.loadingTitle : failed ? SIGN_COPY.outcome[S].title : SIGN_COPY.docTitle;
    const sub = S === "loading" ? SIGN_COPY.modal.loadingSub : failed ? "" : SIGN_COPY.modal.readySub;
    const pos = SIGN_STYLE.signingNavigationButton.position.replace("bottom-", "");
    const sim = (what, label) => html`<button type="button" class="btn btn-outline btn-xs" data-click="${on(() => simulateSigning(what))}">${label}</button>`;
    let body;
    if (S === "loading") {
      body = html`<div class="sign-loading" data-key="sign-loading"><span class="spinner spinner--lg" aria-hidden="true"></span><p>${SIGN_COPY.opening}</p></div>`;
    } else if (S === "ready") {
      body = html`<div class="sign-frame" data-key="sign-frame" role="group" aria-label="Mock of the signing window. ${SIGN_COPY.mock.frameNote}">
    <div class="sign-paper" tabindex="0" role="document" aria-label="${SIGN_COPY.docTitle}">
      <h3 class="docv-h">${SIGN_COPY.docTitle}</h3>
      <p class="docv-p">[Terms for using Xplor Pay. The real window shows the agreement PDF here.]</p>
      <p class="docv-p">[More of the agreement.]</p>
      <p class="sign-statement">${SIGN_COPY.statement}</p>
      <button type="button" class="sign-tab${state.signTabDone ? " is-done" : ""}" aria-pressed="${String(!!state.signTabDone)}" data-click="${on(() => setState({ signTabDone: true }))}">${state.signTabDone ? html`<span class="sign-tab-name">${who.name}</span><span class="sign-tab-note">${SIGN_COPY.mock.signedTab}</span>` : html`${icon("pen", 15)}${SIGN_COPY.mock.signTab}`}</button>
    </div>
    <div class="sign-nav sign-nav--${pos}"><button type="button" class="btn btn-primary btn-md" style="background:${SIGN_STYLE.primaryButton.backgroundColor};color:${SIGN_STYLE.primaryButton.color}"${attr("disabled", !state.signTabDone)} data-click="${on(() => signEnd("signing_complete"))}">${SIGN_STYLE.signingNavigationButton.finishText}</button></div>
  </div>`;
    } else if (failed) {
      const o = SIGN_COPY.outcome[S];
      body = html`<div class="sign-result" data-key="sign-result">
    <span class="icon-tile ${S === "error" ? "icon-tile--neg" : "icon-tile--warn"}" aria-hidden="true">${icon(S === "declined" ? "x" : "alert", 18)}</span>
    <p class="sign-result-body">${o.modal}</p>
    ${S === "error" && html`<p class="sign-result-body">${SIGN_COPY.contact()}</p>`}
    <div class="sign-result-actions">
      <button type="button" class="btn btn-primary btn-md" id="sign-retry" data-click="${on(() => openSigning(who.name))}">${S === "declined" ? SIGN_COPY.reviewAgain : SIGN_COPY.retry}</button>
      <button type="button" class="btn btn-outline btn-md" data-click="${on(closeSigning)}">${SIGN_COPY.close}</button>
    </div>
  </div>`;
    }
    return html`<div class="backdrop backdrop--sign" data-key="sign">
  <div class="dialog dialog--sign" role="dialog" aria-modal="true" aria-labelledby="sign-title" aria-describedby="sign-sub" aria-busy="${String(S === "loading")}">
    <div class="dialog-head">
      <span class="icon-tile" aria-hidden="true">${icon("pen", 18)}</span>
      <div class="grow">
        <h2 class="dialog-title" id="sign-title" tabindex="-1">${title}</h2>
        <p class="dialog-sub" id="sign-sub">${sub}</p>
      </div>
      <button type="button" class="icon-btn" id="sign-close" aria-label="${SIGN_COPY.modal.closeLabel}" data-click="${on(requestCloseSigning)}">${icon("x", 16)}</button>
    </div>
    <div class="sr-only" role="status" aria-live="polite">${state.signSay}</div>
    <div class="sign-body">${body}</div>
    ${state.signLeaveAsk && html`<div class="sign-leave" data-key="sign-leave" role="alert">
      <div><strong>${SIGN_COPY.modal.leaveTitle}</strong><span>${SIGN_COPY.modal.leaveBody}</span></div>
      <div class="sign-leave-actions">
        <button type="button" class="btn btn-primary btn-sm" id="sign-keep" data-click="${on(() => setState({ signLeaveAsk: false }))}">${SIGN_COPY.modal.keep}</button>
        <button type="button" class="btn btn-outline btn-sm" data-click="${on(closeSigning)}">${SIGN_COPY.modal.leave}</button>
      </div>
    </div>`}
    <div class="sign-mock" data-key="sign-mock">
      <div class="sign-mock-head"><span class="pill pill--info">${SIGN_COPY.mock.badge}</span><span class="small-note">${SIGN_COPY.mock.note}</span></div>
      <div class="sign-mock-btns">${sim("loading", "Loading")}${sim("ready", "Ready")}${sim("signing_complete", "Signed")}${sim("decline", "Declined")}${sim("cancel", "Cancelled")}${sim("ttl_expired", "Link expired")}${sim("session_timeout", "Timed out")}${sim("exception", "Error")}</div>
      <div class="sign-mock-opts">
        <label class="check"><input type="checkbox"${attr("checked", !!state.signMockUrlFails)} data-change="${on((e) => setState({ signMockUrlFails: e.target.checked }))}"><span><span class="check-label">${SIGN_COPY.mock.urlFails}</span></span></label>
        <label class="check"><input type="checkbox"${attr("checked", !!state.signMockPending)} data-change="${on((e) => setState({ signMockPending: e.target.checked }))}"><span><span class="check-label">${SIGN_COPY.mock.backendPending}</span></span></label>
      </div>
    </div>
  </div>
</div>`;
  }

  // What happens after Submit, on the last step.

  function nextView(v) {
    return html`<section class="next-panel is-open" data-key="s7-next" aria-labelledby="next-h">
  <h2 class="next-head" id="next-h">What happens next</h2>
  <ol class="next-grid" id="next-body">
    <li class="next-item is-on"><span class="next-num">1</span><div><div class="next-title">Sent to Trulioo</div><div class="next-body">${v.submitNote}</div></div></li>
    <li class="next-item"><span class="next-num">2</span><div><div class="next-title">Checks run</div><div class="next-body">You can close this window, and we'll email you.</div></div></li>
    <li class="next-item"><span class="next-num">3</span><div><div class="next-title">Start taking payments</div><div class="next-body">Your first payout lands the next business day after your first sale.</div></div></li>
  </ol>
</section>`;
  }

  // A disabled button cannot be hovered or focused, so it sits in a wrapper that can. The note names what is still needed.
  // Used for Submit (the default) and for Review and sign (decision docusign-sign-needs-complete-application), which passes its own list, switch, heading and key.
  function gateView(v, btn, o) {
    o = o || {};
    const list = o.missing || v.missing;
    const tip = o.tip || "nextTip";
    if (o.missing ? !list.length : (v.canNext || !list.length)) return btn;
    const shown = list.slice(0, 6);
    const more = list.length - shown.length;
    return html`<span class="gate" data-key="${o.key || "gate"}" tabindex="0" data-mouseenter="${on(() => setState({ [tip]: true }))}" data-mouseleave="${on(() => setState({ [tip]: false }))}" data-focus="${on(() => setState({ [tip]: true }))}" data-blur="${on(() => setState({ [tip]: false }))}">${btn}${state[tip] && html`<span class="gate-pop" data-key="gate-pop" role="note"><span class="gate-pop-body"><span class="gate-head">${o.head || "Still needed to submit"}</span><ul class="gate-list">${shown.map((m) => html`<li>${m}</li>`)}${more > 0 && html`<li>and ${more} more</li>`}</ul>${list.some((m) => m.indexOf("Waiting on ") === 0) && html`<span class="gate-foot">Fill it in yourself on the Owners step, or remove their access.</span>`}</span></span>`}</span>`;
  }

  // The "why we ask" note for the step, shown as hoverable text at the end of the step's description (decision 73).
  function whyView(v) {
    const open = () => setState({ whyOpen: true });
    return html`<span class="why-wrap" data-mouseenter="${on(open)}" data-mouseleave="${on(() => setState({ whyOpen: false }))}"><button type="button" class="why-trigger" aria-expanded="${String(state.whyOpen)}" data-click="${on(open)}" data-blur="${on(() => setState({ whyOpen: false }))}">${v.why.t}${icon("help", 15, "i-accent")}</button>${state.whyOpen && html`<span class="why-pop" data-key="why-pop" role="note"><span class="why-pop-body"><span class="why-body">${v.why.b}</span><span class="why-points">${v.why.p.map((t) => html`<span class="why-point">${icon("check", 14, "i-b i-ok")}<span>${t}</span></span>`)}</span></span></span>`}</span>`;
  }

  function flowView(v) {
    const step = state.step;
    return html`<div class="flow" data-key="flow">
  <div class="flow-grid">
    ${railView(v)}
    <main class="main" data-key="main">
      <header class="step-head" data-key="head">
        <div class="step-meta-row">
          <span class="eyebrow">${v.stepCounter}</span>
        </div>
        <h1 class="step-title">${v.stepTitle}${pin("no-field-count")}</h1>
        <p class="step-sub">${v.stepSubtitle}${v.stepSubtitle ? " " : ""}${whyView(v)}</p>
      </header>
      ${state.stepEdit && state.stepEdit.step === step && html`<div class="callout edit-note" data-key="step-edit" role="status">${icon("info", 16)}<span>${state.stepEdit.by} updated their details at ${state.stepEdit.at}. You're seeing their latest answers.</span></div>`}

      ${step === 4 && bankSavedView()}
      ${step === 2 && step2View(v)}
      ${step === 6 && step6View(v)}
      ${step === 7 && reviewView(v)}
      ${v.cards.map(cardView)}
      ${step === 7 && cardView(signView(v))}
      ${step === 7 && signedConfirmed() && nextView(v)}
      ${step === 7 && Object.keys(ERR).length > 0 && html`<p class="footer-error" data-key="err-summary" role="alert">${icon("alert", 16)}${Object.keys(ERR).length === 1 ? "One thing needs a look before you can submit." : Object.keys(ERR).length + " things need a look before you can submit."}</p>`}
      <div class="footer" data-key="footer">
        ${state.editing ? html`<div class="footer-end" data-key="end">
          ${gateView(v, html`<button type="button" class="btn btn-primary btn-lg btn-next" ${v.canNext ? "" : "disabled"} data-click="${on(saveEdit)}">Save</button>`)}
        </div>` : html`${html`<button type="button" class="btn btn-neutral btn-lg back-btn" data-key="back" data-click="${on(back)}">${icon("chev-l", 17)}Back</button>`}
        <div class="footer-end" data-key="end">
          ${gateView(v, html`<button type="button" class="btn btn-primary btn-lg btn-next" ${v.canNext ? "" : "disabled"} data-click="${on(next)}">${v.nextLabel}${icon("chev-r", 18)}</button>`)}
        </div>`}
      </div>
    </main>
  </div>
</div>`;
  }

  function submittedView(v) {
    // What the application is still waiting on: the owner details sent by email, and any files not yet in.
    const waits = (v.invitedOwners.length ? [v.invitedOwners.length === 1 ? "one owner's details" : v.invitedOwners.length + " owners' details"] : []);
    return html`<section class="hero-card" data-key="submitted">
  <div class="hero-head">
    <span class="hero-icon">${icon("clock", 20)}</span>
    <div>
      <h1 class="hero-title">${state.askedMore ? "We need a little more from you" : waits.length ? "Thanks, we're waiting on " + waits.join(" and ") : "That's everything, thanks"}</h1>
      <p class="hero-sub">Submitted ${v.submittedWhen} · Reference: <span class="mono">#XP-40718</span></p>
    </div>
  </div>
  <ol class="timeline">
    <li class="tl-item"><span class="tl-dot tl-dot--done">${icon("check", 12, "i-bb")}</span><div class="tl-body"><div class="tl-title">Application received</div><div class="tl-note">${v.receivedNote}</div></div></li>
    ${state.askedMore ? html`<li class="tl-item"><span class="tl-dot tl-dot--active"><span class="tl-spinner" aria-hidden="true"></span></span><div class="tl-body"><div class="tl-title">Waiting for your reply</div><div class="tl-note">We've emailed you what we need. Reply to that email, attaching any files, and we'll carry on the checks from there.</div></div></li>` : html`<li class="tl-item"><span class="tl-dot tl-dot--active"><span class="tl-spinner" aria-hidden="true"></span></span><div class="tl-body"><div class="tl-title">${waits.length ? "Checks started, waiting on the rest" : "Checks and review running"}</div><div class="tl-note">${waits.length ? "We can finish the checks once what's still owed is in · " : ""}${v.checkNote}</div></div></li>`}
    <li class="tl-item"><span class="tl-dot tl-dot--todo"></span><div class="tl-body"><div class="tl-title tl-title--muted">Decision</div><div class="tl-note">${waits.length ? "After the last item arrives · we'll email you" : "We'll email you"}</div></div></li>
  </ol>
  ${state.askedMore ? html`<p class="hero-callout" data-key="asked-callout">We've sent you an email asking for more information. Check your inbox and reply to it to speed things up. If you can't find it, look in your spam or junk folder.</p>` : waits.length ? html`<p class="hero-callout">We can make your decision as soon as everything below is in. Add it whenever you're ready.</p>` : html`<p class="hero-callout">There's nothing else for you to do right now. If we have a question, we'll send you an email. Reply to it and we'll carry on from there.</p>`}
</section>
${v.invitedOwners.length ? html`<div class="stack" data-key="submitted-invited">${v.invitedOwners.map((o) => html`<section class="card card--p20 doc is-later" data-key="owner-wait-${o.id}">
  <div class="doc-row">
    <span class="icon-tile icon-tile--neutral">${icon("clock", 17)}</span>
    <div class="grow">
      <div class="doc-titlebar"><h3 class="doc-title">${o.name} · waiting for ${o.inviteEmail}</h3></div>
      <p class="body-sm">They'll fill in their own details and ID. We can finish the checks once they have.</p>
    </div>
  </div>
</section>`)}</div>` : ""}
`;
  }

  // ---------------------------------------------------------------------------
  // More info needed (decision pend-reasons-as-requests)
  // ---------------------------------------------------------------------------

  // The reasons Ops picked, in catalogue order. What the applicant has answered lives in state.rfi, keyed by reason id:
  // { files: [{ name, busy }], vals: { note: text } }.
  // Slice 1 does not offer the reasons marked slice "2". If Ops had only picked those, the screen falls back to the default request.
  const pendAvailable = () => PEND_REASONS.filter((r) => r.slice !== "2" || invitesOn());
  // A follow-up from Ops that is a written message, not a template: one request whose body is Ops' own words, and a reply is expected.
  // Slice 2 only (decision more-info-ops-own-message). Slice 1 has the templated requests alone; anything more goes by email.
  const ownMsgOn = () => ctx.opsOwn && invitesOn();
  const opsReason = () => ({ id: "ops-message", name: "Message from Ops", reply: true, title: "our team's message", file: "supporting-document.pdf" });
  const pendReasons = () => {
    if (ownMsgOn()) return [opsReason()];
    const picked = pendAvailable().filter((r) => ctx.pend.indexOf(r.id) > -1);
    return picked.length ? picked : PEND_REASONS.filter((r) => PEND_DEFAULT.indexOf(r.id) > -1);
  };
  const rfiOf = (id) => state.rfi[id] || { files: [], vals: {} };
  const setRfi = (id, patch) => setState((s) => ({ rfi: Object.assign({}, s.rfi, { [id]: Object.assign({ files: [], vals: {} }, s.rfi[id], patch) }) }));
  // A request has an answer when it has a file or a message. Nothing on a card is required (decision more-info-one-response).
  const pendHas = (r) => { const c = rfiOf(r.id); if (r.reply) return String(c.vals.note || "").trim() !== ""; return c.files.length > 0 || String(c.vals.note || "").trim() !== ""; };
  // Who a person-level request is about (a reason with person: true): the owner Ops picked in Prototype options, else the
  // applicant, else the first named owner. With no owner named yet (an empty run) it falls back to the sample applicant.
  function pendPerson() {
    const named = state.owners.map((o) => ({ o: o, name: ownerInfo(o).name })).filter((x) => x.name && x.name !== "New owner");
    const pick = named.find((x) => x.o.id === state.pendFor) || named.find((x) => x.o.self) || named[0];
    const name = pick ? pick.name : OWNER_SEED.self.name;
    return { id: pick ? pick.o.id : 0, name: name, first: name.split(" ")[0] };
  }
  const pendText = (r, t0) => { const t = t0.replace(/licen[cs]e/g, licWord()); if (!r.person) return t; const p = pendPerson(); return t.split("{name}").join(p.name).split("{first}").join(p.first); };
  const NUMBER_WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
  function pendTitle() { const n = pendReasons().length; return n === 1 ? "One more thing we need" : (NUMBER_WORDS[n] || String(n)) + " more things we need"; }

  // Ops picks the reasons in Prototype options. At least one stays picked.
  function togglePend(id, checked) {
    const next = PEND_IDS.filter((x) => (x === id ? checked : ctx.pend.indexOf(x) > -1));
    setCtx({ pend: next.length ? next : ctx.pend });
  }

  // Simulated upload: no picker opens and nothing is read. The file shows as uploading for a moment, then ready.
  function pendAddFile(r, dropped) {
    const have = rfiOf(r.id).files.map((f) => f.name);
    // A write-an-answer card has no file of its own; its optional document gets a generic name.
    const base = r.file || "supporting-document.pdf";
    const added = [];
    // Dropped files keep their own names (only the name is used); a click adds the canned file. A repeated name gets -2, -3 added.
    (dropped && dropped.length ? dropped : [base]).forEach((n) => {
      let i = 1, name = n;
      while (have.indexOf(name) > -1) { i++; name = n.replace(/(\.[^.]+)?$/, "-" + i + "$1"); }
      have.push(name);
      added.push(name);
    });
    setRfi(r.id, { files: rfiOf(r.id).files.concat(added.map((name) => ({ name: name, busy: true }))) });
    setTimeout(() => setState((s) => {
      const c = s.rfi[r.id];
      return c ? { rfi: Object.assign({}, s.rfi, { [r.id]: Object.assign({}, c, { files: c.files.map((f) => (added.indexOf(f.name) > -1 ? { name: f.name, busy: false } : f)) }) }) } : {};
    }), 1400);
  }
  function sendPend() {
    setState({ screen: "submitted" });
    showToast("Thanks. We've got it and the checks are running again.");
  }

  // Every reason is answered the same way: any files, and a message for the team. Neither is required, and nothing is checked.
  function pendRespondView(r) {
    const c = rfiOf(r.id);
    return html`<div class="pend-respond" data-key="resp-${r.id}">
  <div class="pend-field" data-key="file-btn-${r.id}">${dropZoneView("Add a file for " + pendText(r, r.title), (names) => pendAddFile(r, names), rfiOf(r.id).files.length)}</div>
  ${c.files.map((f) => html`<div class="doc-file" data-key="file-${f.name}">${!f.busy && html`<span class="doc-file-ok" aria-hidden="true">${icon("circle-check", 16)}</span>`}<span class="doc-file-name">${f.name}</span>${!f.busy && html`<span class="sr-only">Uploaded</span>`}${f.busy ? html`<span class="state-pill state-pill--busy" role="status"><span class="spinner" aria-hidden="true"></span>Uploading</span>` : html`<button type="button" class="btn-link" aria-label="Remove ${f.name}" data-click="${on(() => setRfi(r.id, { files: rfiOf(r.id).files.filter((x) => x.name !== f.name) }))}">Remove</button>`}</div>`)}
  <div class="pend-field" data-key="note-${r.id}"><label class="field-label field-label--block" for="pend-${r.id}-note">${r.reply ? "Your reply" : "Message for our team"}</label><textarea class="input" id="pend-${r.id}-note" rows="3" data-input="${on((e) => setRfi(r.id, { vals: Object.assign({}, rfiOf(r.id).vals, { note: e.target.value }) }))}">${c.vals.note || ""}</textarea></div>
</div>`;
  }

  // One request: a short title, why we need it, what we'll accept, then the same file and message boxes (decisions pend-reasons-as-requests, more-info-one-response).
  function pendCardView(r) {
    if (r.reply) return html`<section class="card card--p20 pend" data-key="pend-${r.id}">
  <div class="doc-row">
    <div class="grow">
      <div class="doc-titlebar"><h2 class="rfi-title">Message from our team</h2></div>
      <p class="rfi-body pend-ops-msg">${state.opsMsgText}</p>
      ${pendRespondView(r)}
    </div>
  </div>
</section>`;
    return html`<section class="card card--p20 pend" data-key="pend-${r.id}">
  <div class="doc-row">
    <div class="grow">
      <div class="doc-titlebar"><h2 class="rfi-title">${pendText(r, r.title)}</h2></div>
      <p class="rfi-body">${pendText(r, r.why)}</p>
      <div class="pend-accept">
        <h3 class="pend-h">${r.lead}</h3>
        <ul class="pend-list">${r.accept.filter((t) => !(r.id === "kyc" && (isNonprofit() || isCa()) && /Social Security/.test(t))).map((t) => html`<li>${pendText(r, r.id === "kyc" && isCa() ? t.replace("U.S. passport", "passport").replace("license", "licence") : t)}</li>`)}</ul>
        ${r.note && html`<p class="pend-note">${r.note}</p>`}
      </div>
      ${pendRespondView(r)}
    </div>
  </div>
</section>`;
  }

  /* SIMPLE TRIAL:START */
  // The whole request (what we need and why) is in the email, so this screen is only a place to send files and messages.
  // One message box and one drop zone that takes any number of files. A file or a message is needed before it can be sent.
  const simpleFile = (id, patch) => setState((s) => ({ rfiDocs: s.rfiDocs.map((d) => (d.id === id ? Object.assign({}, d, patch) : d)) }));
  // Simulated upload: no picker opens and nothing is read. Each file shows as uploading for a moment, then ready. The one drop zone stays on the page, so any number of files can be added.
  function simpleAddFiles(names) {
    const list = names && names.length ? names : [null];
    let id = state.rfiDocs.reduce((m, d) => Math.max(m, d.id), 0);
    const added = list.map((n) => { id += 1; return { id: id, name: n || "document-" + id + ".pdf", busy: true }; });
    setState((s) => ({ rfiDocs: s.rfiDocs.concat(added) }));
    added.forEach((f) => setTimeout(() => simpleFile(f.id, { busy: false }), 1400));
  }
  const simpleRemoveFile = (id) => setState((s) => ({ rfiDocs: s.rfiDocs.filter((d) => d.id !== id) }));
  function rfiSimpleView() {
    const docs = state.rfiDocs;
    const ready = docs.every((d) => !d.busy) && (docs.length > 0 || String(state.rfiNote || "").trim());
    return html`<header data-key="rfi-head">
  <h1 class="step-title">Send us what we asked for</h1>
  <p class="step-sub">The email we sent you lists everything we need. Add files, write a message, or both.</p>
</header>
<div class="stack" data-key="rfi-simple-docs">
  <section class="card card--p20 pend simple-doc" data-key="simple-doc">
    <div class="pend-field" data-key="simple-note"><label class="field-label field-label--block" for="simple-note">Message for our team</label><textarea class="input" id="simple-note" rows="3" data-input="${on((e) => setState({ rfiNote: e.target.value }))}">${state.rfiNote || ""}</textarea></div>
    <div class="pend-field" data-key="simple-files">
      ${docs.map((d) => html`<div class="doc-file" data-key="simple-file-${d.id}">${!d.busy && html`<span class="doc-file-ok" aria-hidden="true">${icon("circle-check", 16)}</span>`}<span class="doc-file-name">${d.name}</span>${!d.busy && html`<span class="sr-only">Uploaded</span>`}${d.busy ? html`<span class="state-pill state-pill--busy" role="status"><span class="spinner" aria-hidden="true"></span>Uploading</span>` : html`<button type="button" class="btn-link" aria-label="Remove ${d.name}" data-click="${on(() => simpleRemoveFile(d.id))}">Remove file</button>`}</div>`)}
      ${dropZoneView("Add a file", simpleAddFiles, docs.length)}
    </div>
  </section>
</div>
<div class="rfi-actions" data-key="rfi-actions">
  <div class="btn-row">
    <button type="button" class="btn btn-primary btn-md"${attr("disabled", !ready)} data-click="${on(sendPend)}">Send to our team</button>
  </div>
  ${!ready && html`<p class="pend-hint">Add a file or write a message to send.</p>`}
</div>`;
  }
  /* SIMPLE TRIAL:END */

  function rfiView() {
    if (ctx.moreInfo === MOREINFO_SIMPLE) return rfiSimpleView(); // SIMPLE TRIAL
    const list = pendReasons();
    const ready = list.every(pendHas) && list.every((r) => rfiOf(r.id).files.every((f) => !f.busy));
    return html`<header data-key="rfi-head">
  <h1 class="step-title">${pendTitle()}${pin("rfi-not-restart")}</h1>
  <p class="step-sub">${list[0].reply ? "Reply to our message and we'll carry on with your checks." : list.length === 1 ? "Add this item and we'll carry on with your checks." : "Add these and we'll carry on with your checks."}</p>
</header>
<div class="stack" data-key="rfi-cards">${list.map((r) => pendCardView(r))}</div>
<div class="rfi-actions" data-key="rfi-actions">
  <div class="btn-row">
    <button type="button" class="btn btn-primary btn-md"${attr("disabled", !ready)} data-click="${on(sendPend)}">Send to our team</button>
  </div>
  ${!ready && html`<p class="pend-hint">${list[0].reply ? "Write a reply to send." : "Add a file or write a message for every request to send."}</p>`}
</div>`;
  }

  function approvedView(v) {
    return html`<section class="approved" data-key="approved">
  <span class="approved-tag">${icon("check", 13, "i-b")}Riverside Pilates approved</span>
  <h1 class="approved-title">Welcome to Xplor Pay</h1>
  <p class="approved-body">${invitesOn() ? "We've approved your application. Add a merchant to start taking payments, then invite your team and order card readers." : "We've approved your application. Open your payments dashboard to add a merchant and start taking payments. You can add more users there too."}</p>
  <div class="btn-row">
    <button type="button" class="btn btn-light btn-lg">Open payments dashboard</button>
  </div>
</section>
${invitesOn() && html`<section class="unlock" data-key="approved-unlock" aria-labelledby="unlock-h">
  <h2 class="unlock-title" id="unlock-h">Now that you're approved</h2>
  <p class="unlock-sub">These need a live account, so they're ready now.</p>
  <div class="unlock-grid">
    <article class="card card--p20">
      <div class="unlock-head"><span class="icon-tile">${icon("users", 17)}</span><h3 class="tile-title">Invite your team</h3><span class="pill pill--positive">Unlocked</span></div>
      <p class="tile-body">Add managers, bookkeepers and front-desk staff to your Xplor Pay account, and choose what each person can see and do.</p>
      <button type="button" class="btn btn-outline btn-tile">Invite people</button>
    </article>
    <article class="card card--p20">
      <div class="unlock-head"><span class="icon-tile">${icon("card", 17)}</span><h3 class="tile-title">Order card readers</h3><span class="pill pill--positive">Unlocked</span></div>
      <p class="tile-body">Get readers for the counter or for taking payments around the studio. You'll see delivery timing when you order.</p>
      <button type="button" class="btn btn-outline btn-tile">Order devices</button>
    </article>
  </div>
</section>`}`;
  }

  function statusView(v) {
    return html`<div class="status" data-key="status">
  <div class="status-inner">
    ${state.screen === "submitted" && submittedView(v)}
    ${state.screen === "rfi" && rfiView()}
    ${state.screen === "approved" && approvedView(v)}
  </div>
</div>`;
  }

  function saveView(v) {
    return html`<div class="backdrop" data-key="save">
  <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="save-title" aria-describedby="save-sub">
    <div class="dialog-head">
      <span class="icon-tile icon-tile--positive">${icon("check", 18, "i-b")}</span>
      <div class="grow">
        <h2 class="dialog-title" id="save-title">Your answers are saved</h2>
        <p class="dialog-sub" id="save-sub">${v.saveProgressNote}</p>
      </div>
      <button type="button" class="icon-btn" aria-label="Close" data-click="${on(closeSave)}">${icon("x", 16)}</button>
    </div>
    <p class="dialog-body">Log back in any time with the link in your welcome email, and you'll carry on where you left off.${pin("return-by-login")}</p>
    ${invitesOn() && html`
    <p class="dialog-body">Send a link to whoever should pick it up, such as your bookkeeper for the bank details or a co-owner for their own ID. They'll land exactly where you left off and see only their part.</p>
    <form class="dialog-form" novalidate data-submit="${on(() => { if (!SAVE_EMAIL_OK.test(state.saveEmail.trim())) { setState({ saveEmailErr: "Enter an email like name@example.com." }); return; } closeSave(); })}"${state.saveEmailErr ? html` data-error="1"` : ""}>
      <label class="sr-only" for="save-email">Email address to send the link to</label>
      <input class="input" id="save-email" type="email" value="${state.saveEmail}" placeholder="name@example.com" autocomplete="email" spellcheck="false" data-input="${on((e) => setState({ saveEmail: e.target.value, saveEmailErr: "" }))}" data-blur="${on(() => setState({ saveEmailErr: state.saveEmail.trim() && !SAVE_EMAIL_OK.test(state.saveEmail.trim()) ? "Enter an email like name@example.com." : "" }))}">
      <button type="submit" class="btn btn-primary btn-md">Send link</button>
    </form>
    ${state.saveEmailErr && errMsg(state.saveEmailErr)}
    <p class="dialog-foot">${icon("lock", 14)}The link expires in 30 days and only works for that email address.${pin("save-link-scope")}</p>
    `}
    <div class="dialog-actions"><button type="button" class="btn btn-neutral btn-md" data-click="${on(closeSave)}">Close</button><button type="button" class="btn btn-primary btn-md" data-click="${on(signOut)}">Sign out</button></div>
  </div>
</div>`;
  }

  // Confirm for the two actions that cannot be undone from the card: removing someone's access and removing a person who has signed in.
  function confirmView() {
    const c = state.confirm;
    const o = ownerById(c.id);
    if (!o) return "";
    const nm = ownerInfo(o).name;
    const known = nm !== "New owner";
    const access = c.kind === "access";
    return html`<div class="backdrop" data-key="confirm">
  <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-body">
    <div class="dialog-head">
      <div class="grow"><h2 class="dialog-title" id="confirm-title">${access ? "Remove " + (known ? nm + "'s" : "their") + " access?" : "Remove " + (known ? nm : "this owner") + " and everything they entered?"}</h2></div>
      <button type="button" class="icon-btn" aria-label="Close" data-click="${on(closeConfirm)}">${icon("x", 16)}</button>
    </div>
    <p class="dialog-body" id="confirm-body">${access ? "They won't be able to sign in. What they already entered stays, and you can fill in the rest yourself." : "This takes " + (known ? nm : "them") + " off your application, ends their access and deletes what they entered. You can't undo this."}</p>
    <div class="dialog-actions">
      <button type="button" class="btn btn-outline btn-md" id="confirm-cancel" data-click="${on(closeConfirm)}">Cancel</button>
      <button type="button" class="btn btn-outline btn-md btn-critical" data-click="${on(() => (access ? revokeAccess() : removeOwner(c.id)))}">${access ? "Remove access" : "Remove " + (known ? nm : "owner")}</button>
    </div>
  </div>
</div>`;
  }

  function delegateView() {
    const target = state.owners.filter((o) => o.id === state.delegateTarget)[0];
    const who = target ? ownerInfo(target).name : "this person";
    const changing = !!target && target.status === "invited";
    return html`<div class="backdrop" data-key="delegate">
  <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="delegate-title" aria-describedby="delegate-sub">
    <div class="dialog-head">
      <span class="icon-tile">${icon("mail", 18)}</span>
      <div class="grow">
        <h2 class="dialog-title" id="delegate-title">${changing ? "Change the email for " + (who === "New owner" ? "this invite" : who) : "Send " + (who === "New owner" ? "them" : who) + " an invite"}</h2>
        <p class="dialog-sub" id="delegate-sub">They only see their own details and photo ID.</p>
      </div>
      <button type="button" class="icon-btn" aria-label="Close" data-click="${on(closeDelegate)}">${icon("x", 16)}</button>
    </div>
    <p class="dialog-body">Enter the email of the person who'll fill in these details. They won't see the rest of your application. Carry on in the meantime, and we'll show you here when they're done.</p>
    <form class="dialog-form" novalidate data-submit="${on(sendDelegate)}"${state.delegateErr ? html` data-error="1"` : ""}>
      <label class="sr-only" for="delegate-email">Email address to send the link to</label>
      <input class="input" id="delegate-email" type="email" value="${state.delegateEmail}" placeholder="name@example.com" autocomplete="off" spellcheck="false" data-input="${on((e) => setState({ delegateEmail: e.target.value, delegateErr: "" }))}" data-blur="${on(() => setState({ delegateErr: inviteEmailProblem(state.delegateEmail) }))}">
      <button type="submit" class="btn btn-primary btn-md">${changing ? "Update and resend" : "Send invite"}</button>
    </form>
    ${state.delegateErr && html`<p class="field-error" role="alert">${state.delegateErr}</p>`}
    <p class="dialog-foot">${icon("lock", 14)}The link expires in 30 days and only works for that email address.</p>
  </div>
</div>`;
  }

  // Prototype only: what the person who is sent a link sees, from the link to the thank-you.
  function inviteeView(v) {
    const owner = v.owners.filter((o) => o.id === state.inviteOwner)[0] || v.owners[0];
    if (!owner) return html`<div data-key="invitee"></div>`;
    const email = owner.inviteEmail || "the person you emailed";
    const biz = state.a.legalName || "the business";
    const banner = html`<div class="preview-banner" data-key="inv-banner">${icon("info", 16)}<span><strong>Prototype preview.</strong> This is what ${email} sees after opening the link.</span><button type="button" class="btn btn-soft btn-xs" data-click="${on(leaveInvitee)}">Back to the application</button></div>`;
    const need = (ic, title, body) => html`<div class="need"><span class="icon-tile">${icon(ic, 18)}</span><div><div class="need-title">${title}</div><div class="need-body">${body}</div></div></div>`;
    if (state.inviteStep === 0) return html`<div data-key="invitee">${banner}<div class="welcome"><div class="welcome-inner">
  <span class="tag tag--purple">${icon("shield", 13)}Your details for ${biz}</span>
  <h1 class="welcome-title">Can you add your details for ${biz}?</h1>
  <p class="welcome-lede">Someone at ${biz} is applying to take card payments with Xplor Pay and listed you as ${isNonprofit() ? "someone who runs it" : "an owner"}. They asked you to fill in your own details. It takes about 5 minutes. You only see your part, nothing about the bank account or sales.</p>
  <div class="need-bar"><h2 class="need-head">What you'll need</h2></div>
  <div class="need-list">
    ${need("user", "Your personal details", "Your name, date of birth, home address, email and phone number.")}
    ${need("file", "A photo ID", "A passport or driver's " + licWord() + ". You can take the photo on your phone.")}
    ${need("shield", "Why we ask", (isNonprofit() ? "To confirm who runs the organization. " : "To confirm who owns the business. ") + "The details go to Trulioo, our verification partner, like the rest of the application.")}
  </div>
  <div class="actions">
    <button type="button" class="btn btn-outline btn-lg" data-click="${on(() => showToast("No problem. Forward the email to the right person, or tell whoever sent it."))}">I'm not the right person</button>
    <button type="button" class="btn btn-primary btn-lg" data-click="${on(() => setState({ inviteStep: 1 }))}">Start${icon("arrow-r", 19)}</button>
  </div>
</div></div></div>`;
    if (state.inviteStep === 1) return html`<div data-key="invitee">${banner}<div class="welcome"><div class="welcome-inner">
  <span class="tag tag--purple">${icon("user", 13)}Your details for ${biz}</span>
  <h1 class="welcome-title">Your details</h1>
  <p class="welcome-lede">Only this part is yours. The rest of the application stays with whoever sent you the link.</p>
  <div class="invitee-body">
    ${ownerView(owner, true)}
    <h2 class="need-head">Photo ID</h2>
    <div class="stack" data-key="inv-docs">${v.inviteDocs.map((d) => docView(d))}</div>
  </div>
  <div class="actions">
    <button type="button" class="btn btn-outline btn-lg" data-click="${on(() => setState({ inviteStep: 0 }))}">${icon("chev-l", 17)}Back</button>
    <button type="button" class="btn btn-primary btn-lg" ${v.stepComplete ? "" : "disabled"} data-click="${on(finishInvitee)}">Send my details${icon("arrow-r", 19)}</button>
  </div>
</div></div></div>`;
    return html`<div data-key="invitee">${banner}<div class="welcome"><div class="welcome-inner">
  <section class="hero-card" data-key="inv-thanks">
    <div class="hero-head"><span class="hero-icon">${icon("check", 20)}</span><div><h1 class="hero-title">Thanks, that's your part done</h1><p class="hero-sub">Sent ${owner.receivedAt ? "at " + owner.receivedAt : "just now"}</p></div></div>
    <p class="hero-callout">We've let whoever sent you the link know. There's nothing else for you to do, and you can close this page.</p>
  </section>
  <div class="actions"><button type="button" class="btn btn-outline btn-lg" data-click="${on(leaveInvitee)}">Back to the application</button></div>
</div></div></div>`;
  }

  // Contact options. The number is a placeholder (555-01xx is reserved for fiction).
  const SUPPORT_PHONE = "1-800-555-0100";
  const SUPPORT_HOURS = "7 AM–7 PM PT, Monday to Friday";
  function helpView() {
    return html`<div class="backdrop" data-key="help">
  <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="help-title">
    <div class="dialog-head">
      <span class="icon-tile">${icon("help", 18)}</span>
      <div class="grow">
        <h2 class="dialog-title" id="help-title">Talk to a person</h2>
        <p class="dialog-sub">We can see where you are in the form, so you won't have to explain from the start.</p>
      </div>
      <button type="button" class="icon-btn" id="help-close" aria-label="Close" data-click="${on(closeHelp)}">${icon("x", 16)}</button>
    </div>
    <ul class="help-list">
      <li><span class="help-label">Call us</span><span class="help-value mono">${SUPPORT_PHONE}</span><span class="help-note">${SUPPORT_HOURS}</span></li>
      <li><span class="help-label">Email</span><span class="help-value">support@xplorpay.example</span><span class="help-note">We reply within one business day</span></li>
    </ul>
    <p class="dialog-foot">${icon("lock", 14)}We will never ask for your full SSN, password or bank login over phone or text.</p>
  </div>
</div>`;
  }

  function protoView() {
    // Options are whitelisted before they're applied (input validation on the
    // prototype controls, same as for the URL).
    const select = (label, key, pinId) => {
      const options = CONTEXT_OPTIONS[key];
      const pick = (e) => {
        setCtx({ [key]: options.indexOf(e.target.value) > -1 ? e.target.value : options[0] });
        if (key === "data" || key === "link" || key === "start" || key === "slice" || key === "division") { restored = false; resetData(); }
      };
      return html`<label><span class="field-label field-label--block">${label}${pinId && pin(pinId)}</span><select class="input" data-input="${on(pick)}">${options.map((op) => html`<option${attr("selected", ctx[key] === op)}>${op}</option>`)}</select></label>`;
    };
    return html`<div class="proto" data-key="proto">
  ${state.protoOpen && html`<div class="proto-panel" id="proto-panel" data-key="panel" role="group" aria-label="Prototype options">
    <div class="proto-title">Prototype options</div>
    ${select("Slice", "slice", "slices-option")}
    ${select("Flow starts as", "start", "start-as-option")}
    ${select("Region", "region")}
    ${select("Business lookup (step 1)", "lookup", "business-lookup-typeahead")}
    ${select("Fields start as", "data")}
    ${select("Division", "division", "division-option")}
    ${divisionOn() && html`<p class="proto-note" data-key="division-note">Shows only the step this division changes (step 6), with the sample business filled in. The dashed orange outline marks what is different.</p>`}
    ${select("Link opened as", "link")}
    ${invitesOn() && ctx.link === LINKS.info && (state.screen === "rfi" || state.screen === "submitted") && html`<hr class="proto-rule"><div class="proto-sub">More info needed: Slice 2</div>
    <label class="proto-check" data-key="ops-own"><input type="checkbox"${attr("checked", ctx.opsOwn)} data-change="${on((e) => { setCtx({ opsOwn: e.target.checked }); setState({ screen: e.target.checked ? "rfi" : "submitted", askedMore: !e.target.checked }); })}">Ops sends their own message${pin("more-info-ops-own-message")}</label>
    ${ownMsgOn() && html`<div data-key="ops-own-text"><label class="field-label field-label--block" for="f-ops-msg">Ops message</label><textarea class="input" id="f-ops-msg" rows="4" data-input="${on((e) => setState({ opsMsgText: e.target.value }))}">${state.opsMsgText}</textarea><p class="proto-note">A follow-up in Ops' own words. It replaces the picks below.</p></div>`}`}
    ${state.screen === "rfi" && html`<hr class="proto-rule">
    ${select("More info needed screen", "moreInfo", "moreinfo-simple-trial")}
    <div class="proto-sub">More info needed: Ops picks${pin("pend-reasons-as-requests")}</div>
    ${ctx.moreInfo === MOREINFO_SIMPLE && html`<p class="proto-note">The bare screen ignores Ops picks. Pick A card for each request to use them.</p>`}
    <div class="proto-pend" data-key="pend-list">${pendAvailable().map((r) => html`<label class="proto-check" data-key="pend-opt-${r.id}"><input type="checkbox"${attr("checked", ctx.pend.indexOf(r.id) > -1)} data-change="${on((e) => togglePend(r.id, e.target.checked))}">${r.name}</label>`)}</div>
    ${ctx.pend.some((id) => PEND_REASONS.some((r) => r.id === id && r.person)) && state.owners.length > 1 && html`<div data-key="pend-for"><label class="field-label field-label--block" for="f-pend-for">Request is about</label>${selectView({ id: "f-pend-for", value: String(pendPerson().id), placeholder: "", pick: (v) => setState({ pendFor: Number(v) }), options: state.owners.map((o) => [String(o.id), ownerInfo(o).name]) })}</div>`}`}
    ${invitesOn() && html`<hr class="proto-rule">
    <div class="proto-sub">Owner links</div>
    ${state.owners.some((o) => o.status === "invited") ? state.owners.filter((o) => o.status === "invited").map((o) => html`<button type="button" class="btn btn-soft btn-xs proto-list" data-click="${on(() => { setState({ protoOpen: false }); previewInvitee(o.id); })}">Sign in as ${ownerInfo(o).name === "New owner" ? o.inviteEmail : ownerInfo(o).name}</button>`) : html`<p class="proto-note">Send an owner an invite in step 2, then sign in as them here.</p>`}
    ${state.screen === "flow" && (state.step === 2 || state.step === 6) && state.owners.some((o) => o.status === "invited") && html`<button type="button" class="btn btn-soft btn-xs proto-list" data-click="${on(simulateEdit)}">Simulate: ${ownerInfo(state.owners.filter((o) => o.status === "invited")[0]).name === "New owner" ? "your invited person" : ownerInfo(state.owners.filter((o) => o.status === "invited")[0]).name} edits their details</button>`}`}
    ${state.screen === "flow" && html`<label class="proto-check" data-key="fail-upload"><input type="checkbox"${attr("checked", state.failNextUpload === true)} data-change="${on((e) => setState({ failNextUpload: e.target.checked }))}">Make the next file upload fail</label>`}
    <hr class="proto-rule">
    <label class="proto-check"><input type="checkbox"${attr("checked", ctx.showNotes)} data-change="${on((e) => setCtx({ showNotes: e.target.checked }))}">Design decisions</label>
    <button type="button" class="btn btn-soft btn-xs proto-list" data-click="${on(() => setState({ notesListOpen: true }))}">${icon("pen", 13)}Read all ${shownDecisionCount()}</button>
  </div>`}
  <button type="button" class="proto-toggle" data-key="toggle" aria-expanded="${String(state.protoOpen)}" data-click="${on(() => setState({ protoOpen: !state.protoOpen }))}">${icon("settings", 14)}Prototype options</button>
</div>`;
  }

  // The thin top bar, full width of the window, on every screen except the welcome email (decision top-nav-save-exit). Save & Exit shows only while there is an application to save: the welcome page, the business type page and the seven steps.
  function topNavView(v) {
    // Save & Exit appears once there is something to save: from the first step on, after Continue on the business type screen (decision save-exit-after-first-step).
    const canSave = v.isFlow;
    // The bar is as wide as the content column of the screen under it: 560 for sign-in, 820 for the status screens, 1220 for the flow, 720 for the rest.
    // (A class sets the width, since the page's content security policy does not allow inline styles.)
    const navW = { login: 560, flow: 1220, submitted: 820, rfi: 820, approved: 820 }[state.screen] || 720;
    return html`<header class="topnav topnav--${navW}${state.screen === "flow" ? " topnav--flow" : ""}" data-key="topnav">
  <div class="topnav-inner">
    <img class="topnav-logo" src="assets/xplor-pay-logo.png" alt="Xplor Pay" width="1354" height="295">
    ${canSave && html`<div class="topnav-actions">
      <button type="button" class="btn btn-neutral btn-md topnav-help" data-click="${on(openHelp)}">${icon("help", 16)}Get help</button>
      <button type="button" class="btn btn-neutral btn-md topnav-exit" data-click="${on(openSave)}">Save and exit</button>
    </div>`}
  </div>
</header>`;
  }

  function appView() {
    const v = vals();
    return html`${state.screen !== "email" && topNavView(v)}<div class="page" data-key="page">
  <div class="frame">
    <div class="content" data-key="content">
      ${state.screen === "email" && emailView()}
      ${state.screen === "pickBusiness" && pickBusinessView()}
      ${state.screen === "login" && loginView()}
      ${v.isWelcome && welcomeView(v)}
      ${v.isBizType && bizTypeView()}
      ${v.isFlow && flowView(v)}
      ${v.isStatus && statusView(v)}
      ${v.isInvitee && inviteeView(v)}
    </div>
  </div>
</div>
${state.toast && html`<div class="toast toast--${state.toast.severity}" data-key="toast-${state.toast.id}" role="status"><span class="toast-timer" aria-hidden="true"></span><div class="toast-body"><div class="toast-head">${icon(state.toast.severity === "info" ? "info" : "circle-check", 16)}<span>${state.toast.title}</span></div>${state.toast.message && html`<p class="toast-msg">${state.toast.message}</p>`}</div><button type="button" class="toast-close" aria-label="Dismiss" data-click="${on(dismissToast)}">${icon("x", 16)}</button></div>`}
${state.saveOpen && saveView(v)}
${state.delegateOpen && delegateView()}
${state.confirm && confirmView()}
${state.helpOpen && helpView()}
${state.notesListOpen && notesListView()}
${state.viewDoc && docViewerView(v)}
${state.signModal && signModalView()}
${protoView()}`;
  }

  // ---------------------------------------------------------------------------
  // Rendering: patch the live DOM in place
  // ---------------------------------------------------------------------------

  const keyOf = (n) => (n.nodeType === 1 ? n.getAttribute("data-key") : null);
  function sameNode(a, b) {
    return a.nodeType === b.nodeType && a.nodeName === b.nodeName && keyOf(a) === keyOf(b);
  }
  function findKeyed(parent, key, nodeName, from) {
    for (let i = from; i < parent.childNodes.length; i++) {
      const n = parent.childNodes[i];
      if (keyOf(n) === key && n.nodeName === nodeName) return n;
    }
    return null;
  }

  // Match children by position, and by data-key where blocks come and go, so
  // focused inputs keep their caret across renders.
  function morphChildren(from, to) {
    const next = Array.from(to.childNodes);
    for (let i = 0; i < next.length; i++) {
      const t = next[i];
      const f = from.childNodes[i];
      if (!f) { from.appendChild(t); continue; }
      if (sameNode(f, t)) {
        if (t.nodeType === 1) morphEl(f, t);
        else if (f.nodeValue !== t.nodeValue) f.nodeValue = t.nodeValue;
        continue;
      }
      const key = keyOf(t);
      const found = key !== null ? findKeyed(from, key, t.nodeName, i + 1) : null;
      if (found) { from.insertBefore(found, f); morphEl(found, t); continue; }
      if (key !== null || keyOf(f) !== null) { from.insertBefore(t, f); continue; }
      from.replaceChild(t, f);
    }
    while (from.childNodes.length > next.length) from.removeChild(from.lastChild);
  }

  function morphEl(f, t) {
    // "style" is owned by applyWidths() through the CSSOM, never by markup.
    for (const { name } of Array.from(f.attributes)) {
      if (name !== "style" && !t.hasAttribute(name)) f.removeAttribute(name);
    }
    for (const { name, value } of Array.from(t.attributes)) {
      if (f.getAttribute(name) !== value) f.setAttribute(name, value);
    }
    if (f.nodeName === "TEXTAREA") {
      if (f.value !== t.value) f.value = t.value;
      return;
    }
    morphChildren(f, t);
    if (f.nodeName === "INPUT") {
      if (f.type === "checkbox") {
        const want = t.hasAttribute("checked");
        if (f.checked !== want) f.checked = want;
      } else {
        const want = t.getAttribute("value") || "";
        if (f.value !== want) f.value = want;
      }
    } else if (f.nodeName === "SELECT") {
      const opt = t.querySelector("option[selected]");
      const want = opt ? opt.value : (f.options[0] ? f.options[0].value : "");
      if (f.value !== want) f.value = want;
    }
  }

  // Bar widths are set through the CSSOM so the CSP can forbid inline styles.
  function applyWidths() {
    root.querySelectorAll("[data-width]").forEach((el) => {
      const n = Math.max(0, Math.min(100, Number(el.getAttribute("data-width")) || 0));
      el.style.width = n + "%";
    });
    // Progress rings fill clockwise by a CSS variable (decision step-percent-done).
    root.querySelectorAll("[data-ring]").forEach((el) => {
      el.style.setProperty("--ring", Math.max(0, Math.min(100, Number(el.getAttribute("data-ring")) || 0)));
    });
  }

  const root = document.getElementById("app");
  let last = { screen: null, step: null, saveOpen: false };
  let opener = null;

// Focus goes to the named control when a dialog opens, or to the first control in the dialog on top when that control is not there
// (the save dialog has no email box in Slice 1), so focus is never left on the page behind it (decision dialog-focus-trap).
function focusDialog(id) {
  let el = document.getElementById(id);
  if (!el) { const d = document.querySelectorAll(".backdrop .dialog"); el = d.length ? d[d.length - 1].querySelector("button:not([disabled]), input:not([disabled]), select, textarea, a[href]") : null; }
  if (el) el.focus();
}

  function render() {
    handlers = [];
    // The folded step list closes again when the applicant moves to another step.
    if (state.railOpen && state.step !== last.step) state.railOpen = false;
    const tpl = document.createElement("template");
    tpl.innerHTML = appView().s;
    morphChildren(root, tpl.content);
    applyWidths();

    // The "someone else updated this step" note goes once the applicant leaves the step.
    if (state.stepEdit && (state.screen !== "flow" || state.step !== state.stepEdit.step)) state.stepEdit = null;
    if (state.screen !== last.screen || state.step !== last.step || state.inviteStep !== last.inviteStep || state.loginStage !== last.loginStage) {
      if (last.screen !== null) window.scrollTo(0, 0);
      const cur = STEPS[state.step - 1];
      document.title = (state.screen === "flow" ? "Step " + state.step + " of 7 · " + stepName(cur)
        : state.screen === "email" ? (ctx.start === START_EXISTING ? "Your Xplor Pay application is ready to start" : "Welcome to Xplor Pay: your sign-in details")
        : state.screen === "pickBusiness" ? "Choose a business"
        : state.screen === "login" ? (state.loginStage === "change" ? "Change your password" : "Sign in")
        : state.screen === "welcome" ? "Business verification"
        : state.screen === "bizType" ? "Your business type"
        : state.screen === "invitee" ? "Owner details"
        : state.screen === "approved" ? "Approved" : state.screen === "submitted" && state.askedMore ? "We've emailed you" : state.screen === "rfi" ? (ctx.moreInfo === MOREINFO_SIMPLE ? "Send us what we asked for" : pendTitle()) : "In review") + " · Xplor Pay";
    }
    // Move focus into the dialog when it opens and back to the opener when it closes.
    if (state.saveOpen && !last.saveOpen) {
      opener = document.activeElement;
      focusDialog("save-email");
    } else if (!state.saveOpen && last.saveOpen && opener && document.contains(opener)) {
      opener.focus();
    }
    if (state.delegateOpen && !last.delegateOpen) {
      opener = document.activeElement;
      focusDialog("delegate-email");
    } else if (!state.delegateOpen && last.delegateOpen && opener && document.contains(opener)) {
      opener.focus();
    }
    if (state.confirm && !last.confirm) {
      opener = document.activeElement;
      focusDialog("confirm-cancel");
    } else if (!state.confirm && last.confirm && opener && document.contains(opener)) {
      opener.focus();
    }
    if (state.helpOpen && !last.helpOpen) {
      opener = document.activeElement;
      focusDialog("help-close");
    } else if (!state.helpOpen && last.helpOpen && opener && document.contains(opener)) {
      opener.focus();
    }
    // The signing window takes focus when it opens and gives it back to Review & sign when it closes (decision docusign-sign-in-modal). Asking to leave moves focus to Keep signing.
    if (state.signModal && !last.signModal) {
      opener = document.activeElement;
      focusDialog("sign-title");
    } else if (!state.signModal && last.signModal) {
      // Back on Review and sign, or on the agreement row once the button has gone because the agreement is signed.
      const back = document.getElementById("sign-open") || document.querySelector("[data-key=sign-doc]");
      if (back) { if (!back.matches("button")) back.setAttribute("tabindex", "-1"); back.focus(); } else if (opener && document.contains(opener)) opener.focus();
    }
    // When Check again or the signing check finishes and the button that had focus is gone, focus goes to the status line so a keyboard user is not dropped at the top of the page.
    if (state.signConfirm !== last.signConfirm && state.signConfirm && !state.signModal && (!document.activeElement || document.activeElement === document.body)) {
      const st = document.querySelector("[data-key=sign-doc]");
      if (st) st.focus({ preventScroll: true });
    }
    if (state.signLeaveAsk && !last.signLeaveAsk) focusDialog("sign-keep");
    else if (!state.signLeaveAsk && last.signLeaveAsk && state.signModal) focusDialog("sign-close");
    if (state.signModal && last.signModal && last.signStatus !== state.signStatus && (state.signStatus === "declined" || state.signStatus === "cancelled" || state.signStatus === "expired" || state.signStatus === "error")) focusDialog("sign-retry");
    if (state.viewDoc && !last.viewDoc) {
      opener = document.activeElement;
      focusDialog("docv-close");
    } else if (!state.viewDoc && last.viewDoc && opener && document.contains(opener)) {
      opener.focus();
    }
    last = { screen: state.screen, step: state.step, inviteStep: state.inviteStep, delegateOpen: state.delegateOpen, confirm: state.confirm, saveOpen: state.saveOpen, helpOpen: state.helpOpen, viewDoc: state.viewDoc, signModal: state.signModal, signLeaveAsk: state.signLeaveAsk, signStatus: state.signStatus, signConfirm: state.signConfirm, loginStage: state.loginStage };
    // A save that was stopped by a bad entry takes the applicant to the first one (decision errors-only-for-bad-entries).
    if (pendingScroll) {
      pendingScroll = false;
      const bad = root.querySelector("[data-error=\"1\"]");
      if (bad) {
        bad.scrollIntoView({ block: "center", behavior: "smooth" });
        const input = bad.querySelector("input, select, textarea, button");
        if (input && input.focus) input.focus({ preventScroll: true });
      }
    }
    const hot = (state.comboOpen || state.phoneOpen) && document.querySelector(".combo-opt.is-active, .phone-opt.is-active");
    if (hot && hot.scrollIntoView) hot.scrollIntoView({ block: "nearest" });
    // Hand over to enhance.js (animation layer).
    document.dispatchEvent(new CustomEvent("kyb:render", { detail: { screen: state.screen, step: state.step } }));
  }

  // ---------------------------------------------------------------------------
  // Events (delegated)
  // ---------------------------------------------------------------------------

  function run(el, name, e) {
    const fn = handlers[Number(el.getAttribute(name))];
    if (fn) fn(e);
  }
  function dispatch(name, e) {
    const el = e.target.closest ? e.target.closest("[" + name + "]") : null;
    if (el && root.contains(el)) run(el, name, e);
  }
  root.addEventListener("click", (e) => dispatch("data-click", e));
  root.addEventListener("input", (e) => { if (e.target.type !== "checkbox") dispatch("data-input", e); });
  // A save starts when an edit is committed, not on each keystroke: "change" fires when a text field is left with a new value, and at once for checkboxes, radios and selects.
  root.addEventListener("change", (e) => { if (e.target.type === "checkbox") dispatch("data-change", e); if (e.target.closest && e.target.closest("input, select, textarea")) pulseSave(); });
  // Blur doesn't bubble, so it is caught on the way down.
  root.addEventListener("blur", (e) => { if (e.target.hasAttribute && e.target.hasAttribute("data-blur")) run(e.target, "data-blur", e); }, true);
  root.addEventListener("focus", (e) => { if (e.target.hasAttribute && e.target.hasAttribute("data-focus")) run(e.target, "data-focus", e); }, true);
  // Forms never submit anywhere: the default action is always cancelled.
  root.addEventListener("submit", (e) => { e.preventDefault(); dispatch("data-submit", e); });
  root.addEventListener("mouseenter", (e) => { if (e.target.hasAttribute && e.target.hasAttribute("data-mouseenter")) run(e.target, "data-mouseenter", e); }, true);
  root.addEventListener("mouseleave", (e) => { if (e.target.hasAttribute && e.target.hasAttribute("data-mouseleave")) run(e.target, "data-mouseleave", e); }, true);
  root.addEventListener("keydown", (e) => dispatch("data-keydown", e));
  // File drop zones (decision document-drop-zone). Only a zone accepts a drop; the is-over class is the highlight while a file is held over it.
  const zoneOf = (e) => (e.target && e.target.closest ? e.target.closest("[data-drop]") : null);
  root.addEventListener("dragover", (e) => { const z = zoneOf(e); if (z) { e.preventDefault(); z.classList.add("is-over"); } });
  root.addEventListener("dragleave", (e) => { const z = zoneOf(e); if (z && !(e.relatedTarget && z.contains(e.relatedTarget))) z.classList.remove("is-over"); });
  root.addEventListener("drop", (e) => { const z = zoneOf(e); if (z) { e.preventDefault(); z.classList.remove("is-over"); dispatch("data-drop", e); } });
  // A file dropped anywhere else would make the browser leave the prototype and open it, so those drops are ignored.
  window.addEventListener("dragover", (e) => { if (!zoneOf(e)) e.preventDefault(); });
  window.addEventListener("drop", (e) => { if (!zoneOf(e)) e.preventDefault(); });
  // Leaving a field is when its problem, if any, is shown.
  root.addEventListener("focusout", (e) => {
    const id = e.target && e.target.id;
    // A website typed without a scheme gets https:// added as the person leaves the field, with no message (decision website-https).
    if (id === "f-website") {
      const w = String(state.a.website || "").trim();
      if (w && w !== NO_WEBSITE && !/^[a-z][a-z0-9+.-]*:\/\//i.test(w)) set("website", "https://" + w);
    }
    // The e-commerce address gets https:// the same way (decision ecommerce-channel-url).
    if (id === "f-ecomUrl") {
      const w = String(state.a.ecomUrl || "").trim();
      if (w && !/^[a-z][a-z0-9+.-]*:\/\//i.test(w)) set("ecomUrl", "https://" + w);
    }
    // A Canadian business number pasted with its program account (123456789RT0001) is cut back to the 9 digits as the person leaves the field (decision ca-bn-program-account).
    if (id === "f-ein" && bnCore(state.a.ein || "") !== (state.a.ein || "")) set("ein", bnCore(state.a.ein));
    if (id && id.indexOf("f-") === 0 && !state.touched[id.slice(2)]) setState({ touched: Object.assign({}, state.touched, { [id.slice(2)]: true }) });
  });
  // The owner actions menu closes on a click anywhere outside it.
  document.addEventListener("click", (e) => {
    if (state.menuOwner && !(e.target.closest && e.target.closest(".kebab-wrap"))) setState({ menuOwner: 0 });
  });
  // A dialog closes on a click on the dimmed area outside it, as well as on its Close button and Escape (decision dialogs-close-on-outside-click).
  // The press has to start on the dimmed area too, so dragging to select text inside a dialog and letting go outside does not close it.
  let pressedBackdrop = false;
  document.addEventListener("mousedown", (e) => { pressedBackdrop = !!(e.target.classList && e.target.classList.contains("backdrop")); });
  document.addEventListener("click", (e) => {
    const t = e.target;
    if (!pressedBackdrop || !t.classList || !t.classList.contains("backdrop")) return;
    pressedBackdrop = false;
    const key = t.getAttribute("data-key");
    if (key === "confirm") closeConfirm();
    else if (key === "doc-view") closeDoc();
    else if (key === "sign") requestCloseSigning();
    else if (key === "help") closeHelp();
    else if (key === "delegate") closeDelegate();
    else if (key === "save") setState({ saveOpen: false });
    else if (key === "notes-list") setState({ notesListOpen: false });
  });
  // Tab stays inside the open dialog (decision dialog-focus-trap). The dialog on top is the last one in the page. With no
  // dialog open this does nothing. Focus that has somehow ended up outside the dialog is pulled back to its first or last control.
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    const dialogs = document.querySelectorAll(".backdrop .dialog");
    const dlg = dialogs[dialogs.length - 1];
    if (!dlg) return;
    const items = Array.from(dlg.querySelectorAll("a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex=\"-1\"])"))
      .filter((el) => el.offsetParent !== null);
    if (!items.length) { e.preventDefault(); return; }
    const firstEl = items[0], lastEl = items[items.length - 1], at = document.activeElement;
    if (!dlg.contains(at)) { e.preventDefault(); (e.shiftKey ? lastEl : firstEl).focus(); }
    else if (e.shiftKey && at === firstEl) { e.preventDefault(); lastEl.focus(); }
    else if (!e.shiftKey && at === lastEl) { e.preventDefault(); firstEl.focus(); }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (state.signModal) escapeSigning();
    else if (state.confirm) closeConfirm();
    else if (state.menuOwner) closeMenu();
    else if (state.viewDoc) closeDoc();
    else if (state.helpOpen) closeHelp();
    else if (state.delegateOpen) closeDelegate();
    else if (state.saveOpen) setState({ saveOpen: false });
    else if (state.whyOpen) setState({ whyOpen: false });
    else if (state.fieldWhy) setState({ fieldWhy: "" });
    else if (state.nextTip) setState({ nextTip: false });
    else if (state.signTip) setState({ signTip: false });
    else if (state.infoOpen) setState({ infoOpen: false });
    else if (state.protoOpen) setState({ protoOpen: false });
  });

  render();
})();
