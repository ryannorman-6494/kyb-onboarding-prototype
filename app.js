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
      why: "We need to check that the payout account you gave us belongs to your business, so we pay the right place.",
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
      title: "Prove your business is registered",
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
  // Which Xplor division the applicant is onboarding with (decisions division-option, clubready-lease-by-division,
  // club-essentials-financial-history). In the real product Ops sets it in the admin portal before the form opens.
  const DIV_STANDARD = "Standard";
  const DIV_CLUBREADY = "ClubReady";
  const DIV_CE = "Club Essentials";
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
      division: q.get("division") === "clubready" ? DIV_CLUBREADY : q.get("division") === "ce" ? DIV_CE : DIV_STANDARD,
      region: q.get("region") === "ca" ? "Canada" : "United States",
      start: q.get("start") === "existing" ? START_EXISTING : START_LOGIN,
      lookup: q.get("lookup") === "off" ? LOOKUP_OFF : LOOKUP_ON,
      data: q.get("data") === "sample" ? "Sample business" : "Empty",
      showNotes: q.get("notes") === "1",
      link: Object.prototype.hasOwnProperty.call(LINKS, q.get("link")) ? LINKS[q.get("link")] : LINK_NEW,
      pend: pendFromUrl(q.get("pend"))
    };
  }
  function writeContext() {
    const q = new URLSearchParams();
    if (ctx.slice === SLICE_2) q.set("slice", "2");
    if (ctx.moreInfo === MOREINFO_SIMPLE) q.set("moreinfo", "simple"); // SIMPLE TRIAL
    if (ctx.division === DIV_CLUBREADY) q.set("division", "clubready");
    if (ctx.division === DIV_CE) q.set("division", "ce");
    if (ctx.region === "Canada") q.set("region", "ca");
    if (ctx.start === START_EXISTING) q.set("start", "existing");
    if (ctx.lookup === LOOKUP_OFF) q.set("lookup", "off");
    if (ctx.data === "Sample business") q.set("data", "sample");
    if (ctx.showNotes) q.set("notes", "1");
    Object.keys(LINKS).forEach((k) => { if (ctx.link === LINKS[k]) q.set("link", k); });
    if (ctx.pend.join() !== PEND_DEFAULT.join()) q.set("pend", ctx.pend.join(","));
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
    division: [DIV_STANDARD, DIV_CLUBREADY, DIV_CE],
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

  // The running record of why this prototype is the shape it is. Turn
  // "Design decisions" on in the prototype options to pin these to the screen.
  //
  // Keep every object valid JSON (double-quoted keys and strings, no trailing
  // commas) between the two markers below — tools/decisions.rb reads this block
  // to regenerate DESIGN-DECISIONS.md.
  //   id       anchor referenced by pin(); omit nothing, ids must be unique
  //   area     Flow · Copy · Trust · Data · Visual · Accessibility
  //   where    the screen it shows up on, or "Throughout"
  //   b        what was decided and why
  //   tradeoff what it costs, where there is one
  //   by       who made the call
  /* DECISIONS:START */
  const DECISIONS = [
    {
      "id": "step-count-7",
      "area": "Flow",
      "where": "Throughout",
      "t": "Seven named steps, not four groups with substeps",
      "b": "The rail lists all seven steps by name with a time against each, so the remaining work is always countable. The alternative — a few broad groups that expand into substeps — hides how much is left until you are inside a group.",
      "tradeoff": "A longer rail, and seven looks like more work than four until you read the times.",
      "by": "Claude",
      "when": "2026-09-23"
    },
    {
      "id": "welcome-length",
      "area": "Flow",
      "where": "Welcome",
      "t": "Put the whole shopping list before step 1",
      "b": "Everything the merchant needs to hand is listed up front rather than discovered a step at a time. Applications stall when someone hits a document they have to go and find, and a stalled application is much harder to restart than a delayed one.",
      "tradeoff": "A heavier first screen, and some people will bounce off the list itself.",
      "by": "Claude",
      "when": "2026-09-23"
    },
    {
      "id": "welcome-delegate",
      "area": "Flow",
      "where": "Welcome",
      "t": "The welcome page no longer has a hand-off button",
      "b": "This once gave “someone else handles this” equal billing, on the reasoning that the person who signs up is often not the one with the bank details or the incorporation papers. The button is gone in both slices: the secondary button is now Get help (decision welcome-help-and-info-in-header). Handing off is still possible in Slice 2 from Save & Exit and from an owner card.",
      "by": "Claude",
      "when": "2026-09-23"
    },
    {
      "id": "save-link-scope",
      "slice": "2",
      "area": "Trust",
      "where": "Save & Exit (top bar)",
      "t": "Resume links are scoped, addressed and expiring",
      "b": "A resume link is a bearer token for a part-finished KYB application, so it lasts 7 days, only works for the address it was sent to, and drops the recipient into their own part of the flow rather than the whole thing.",
      "by": "Claude",
      "when": "2026-09-23"
    },
    {
      "id": "no-mcc-picker",
      "area": "Copy",
      "where": "Step 1 · Business & address",
      "t": "The category is picked from a short searchable list, with a plain-words hint for people who do not know their code",
      "b": "The business description box that used to suggest a category is gone. Almost no merchant knows their merchant category code (MCC), so the field is a searchable list the applicant types into, by name or by four-digit code, and the list is short because it holds only the codes set up for their division (decision mcc-from-division). Under the field a short hint tells people who are unsure to search by a word that describes what they sell (see mcc-no-help-link). Nothing is suggested or pre-filled, and the category is required.",
      "tradeoff": "With no description the applicant has no keywords to match against, so someone who does not know their code relies on the list names and the hint. The suggestion used to be a simulated keyword guess, which is no longer in the prototype. Earlier decisions here (category-editable, category-is-mcc) describe the old suggestion and have been reworded.",
      "by": "Claude",
      "when": "2026-09-23"
    },
    {
      "id": "tokenized-ids",
      "area": "Trust",
      "where": "Steps 1 and 2",
      "t": "Sensitive numbers are masked by default and stay masked while you edit them",
      "b": "Tax and national ID fields show only the last four characters when you are not in them. Clicking back into one lets you edit the real number, shown as dots until you press “Show” (it was read-only until the third persona run, when a tester clicked in, typed a digit and saw nothing happen; Ryan removed that rule on 2026-10-06). Each one carries an “Encrypted” marker and says plainly that the value goes to the verification partner and is not stored by Xplor.",
      "by": "Claude",
      "when": "2026-09-23"
    },
    {
      "id": "assurance-callouts",
      "area": "Trust",
      "where": "Throughout",
      "t": "Every card that collects something sensitive closes with what happens to it",
      "b": "The lock-icon callout at the foot of a card is a fixed slot, not decoration. If a card asks for something a person could reasonably be uneasy about, that slot says where it goes and what it removes from their remaining work.",
      "by": "Claude",
      "when": "2026-09-23"
    },
    {
      "id": "owner-self-serve",
      "slice": "2",
      "area": "Flow",
      "where": "Step 2 · Owners & signatory",
      "t": "Owners can be invited rather than transcribed",
      "b": "Chasing a co-owner for their SSN and passport is the single most common reason a KYB application sits for days. Each owner can be sent a link to complete their own section, so the applicant is never blocked on someone else's paperwork.",
      "by": "Claude",
      "when": "2026-09-23"
    },
    {
      "id": "ownership-bar",
      "area": "Visual",
      "where": "Step 2 · Owners & signatory",
      "t": "Show whether everyone with 25% or more is listed, not a percentage total",
      "b": "The step 2 ownership card used to be a bar totalling the percentages entered (2026-09-23). Since only owners with 25% or more are listed, the total no longer tells the applicant what is left to do, so on 2026-10-26 Ryan replaced it. The card now reads Owners with 25% or more, with a small tag showing how many are listed so far, then All listed (green) once everyone is accounted for. See ownership-no-question for when it shows.",
      "by": "Claude",
      "when": "2026-09-23"
    },
    {
      "id": "sign-last",
      "area": "Trust",
      "where": "Step 2 · Owners & signatory",
      "t": "Say in step 2 that nothing is binding until step 7",
      "b": "Being asked who will sign, five steps before signing, reads as a commitment. The card says outright that the signature happens at the end and nothing before it binds anyone. Update, 2026-11-11: the signature now happens at the end of step 6, not step 7 (see sign-on-step-6), so the card's line now says You'll sign at step 6. Update, 2026-11-11 (later): the Sign it off card is back at the end of step 7, as the last thing before Submit (sign-back-on-step-7); where this entry says step 6, read step 7.",
      "by": "Claude",
      "when": "2026-09-23"
    },
    {
      "id": "underwriting-plain",
      "area": "Copy",
      "where": "Step 3 · How you take payments",
      "t": "Underwriting questions in plain English, with “best guesses are fine” said first",
      "b": "Volume questions read as a test people can fail, so they stall on them or inflate them. Stating up front that estimates are expected, that they set limits rather than rates, and that going over one changes nothing, removes the reason to stall. Update, 2026-11-11 (Ryan): the line under the numbers saying that going over one of the limits breaks nothing has been removed from Your card volumes, because the maximum single transaction is now a hard block (see max-ticket-hard-block). The title, the “Best guesses are fine” line and the plain wording of the questions stay; only the promise that going over changes nothing is withdrawn.",
      "by": "Claude",
      "when": "2026-09-23"
    },
    {
      "id": "descriptor-preview",
      "area": "Visual",
      "where": "Step 3 · How you take payments",
      "t": "Preview the billing descriptor on a mock statement, in context",
      "b": "The descriptor is shown on a statement extract between two ordinary transactions, because the thing that matters is whether a customer recognizes it in a list, not whether it looks right on its own. The sheet's own heading carries the explanation (“How this looks on your customer's statement”), so there is no separate caption above it. Anything past the card networks' 22-character limit is struck through rather than blocked, so a paste still shows you exactly what you would lose. Parked on 2026-11-11: the whole How you'll appear section was taken out of step 3 (see descriptor-section-parked). Ryan wants to use it somewhere else later; its spec and code are in parked/billing-descriptor.md.",
      "tradeoff": "It's a mock statement, so it implies a formatting fidelity real issuers don't all share.",
      "by": "Ryan",
      "when": "2026-09-30"
    },
    {
      "id": "payout-typed-in",
      "area": "Flow",
      "where": "Step 4 · Payout account",
      "t": "The payout account is typed in, with no bank connection",
      "b": "Step 4 asks for the account details directly: bank name, account holder, account type, and the routing and account numbers (institution, transit and account numbers in Canada). The earlier choice between connecting a bank and typing the details in is gone, along with the “30 seconds” and “+1 document” labels, the simulated bank login, and the lines on the welcome page and in step 4 that promised a faster route. Nothing proves the account on the spot any more, so the account is checked by Trullio after submit (decision bank-verified-by-trullio); an earlier version asked for a bank letter or voided check in step 6.",
      "tradeoff": "Typing numbers is slower and easier to get wrong than a bank connection, and a mistyped digit would send money to the wrong place; the check is Trullio's, after submit. A connection could come back later as a second route, but it is not designed here.",
      "by": "Ryan",
      "when": "2026-10-07"
    },
    {
      "id": "bank-no-debit",
      "area": "Trust",
      "where": "Step 4 · Payout account",
      "t": "Say plainly that Xplor may debit the payout account for fees, chargebacks and refunds",
      "b": "Step 4 used to promise that Xplor could pay into the account but could not take anything out. Ryan decided on 2026-10-26 that this is not true: the merchant agreement lets Xplor Pay collect fees and recover chargebacks, refunds and returns by debit, so the promise is removed. The Settlement account card now says the account is where sales are paid and that Xplor may also take fees, chargebacks and refunds from it, as the agreement at step 7 sets out. The why-we-ask note says the same.",
      "tradeoff": "The comfort that was the card's main reassurance is gone, so step 4 now asks for a sensitive account with a less comforting note, and the full terms are only read at step 7. The agreement wording is a sample drafted from the debit and recovery points in a ClubReady sub-merchant form Ryan shared. Legal or compliance has not checked it, and Canadian pre-authorized debit rules need their own check.",
      "by": "Ryan",
      "when": "2026-10-26"
    },
    {
      "id": "yes-is-not-no",
      "area": "Copy",
      "where": "Step 5 · Compliance declarations",
      "t": "Lead the declarations with what a yes actually means",
      "b": "People under-declare when they think a yes is a rejection. The card says first that yes routes the file to a person rather than ending it, then asks the questions. An accurate declaration now is much cheaper than one discovered during review.",
      "by": "Claude",
      "when": "2026-09-23"
    },
    {
      "id": "read-on-upload",
      "area": "Flow",
      "where": "Step 6 · Supporting documents",
      "t": "Documents are not scanned or read at upload: a file just shows as uploaded",
      "b": "Changed from the earlier design (Ryan, 2026-11-06), which read each file at upload and showed a read-back line. The product will not be able to do that, and no document is checked at this point. Choosing Add file shows the file as uploading for a moment and then as uploaded, the badge on the row says Uploaded rather than Checked, the review step counts documents as uploaded, and nothing on the step or in the Why are we asking panel says a file is scanned, read or checked.",
      "tradeoff": "A blurry, wrong or unreadable file is no longer caught while the person is still on the page, so it can only come back later as a request for more information. Any checking of the documents happens after submission, and how and when is for Ops and the verification partner to say.",
      "by": "Ryan",
      "when": "2026-11-06"
    },
    {
      "id": "rfi-not-restart",
      "area": "Copy",
      "where": "More info needed",
      "t": "An information request is framed as one item, not a restarted application",
      "b": "The screen leads with what still passed, names the one thing to fix, and says the checks resume where they stopped. Standard RFI emails read like a rejection and lose applicants who had nearly finished. Update 2026-11-11: the line under the title no longer ends with a time estimate; it stops at “exactly where they left off”. Ryan asked for “usually within the hour” to be removed and gave no reason.",
      "by": "Claude",
      "when": "2026-09-23"
    },
    {
      "id": "no-field-count",
      "area": "Copy",
      "where": "Throughout",
      "t": "Dropped the “N fields on this step” counter",
      "b": "It advertised effort rather than progress, and because conditional fields appear as you answer, the number went up while you worked — which reads as the form growing under you. The time estimate and the step rail already carry the honest version.",
      "by": "Ryan",
      "when": "2026-09-30"
    },
    {
      "id": "spacing-air",
      "area": "Visual",
      "where": "Throughout",
      "t": "More air above the fold",
      "b": "Top padding went to 64px on the flow and 88px on the welcome screen, with wider gaps between the step header, the cards and the fields. The old layout started too close to the top edge, which made a long compliance form feel denser than it is.",
      "by": "Ryan",
      "when": "2026-09-30"
    },
    {
      "id": "roboto",
      "area": "Visual",
      "where": "Throughout",
      "t": "Roboto and Roboto Mono, self-hosted",
      "b": "Roboto is the Xplor brand face. Roboto Mono carries anything a machine will read back — tax and ID numbers, routing numbers, dates, reference codes, the billing descriptor — so digits line up and a transposed character is visible. Both are served from this folder, so the page still makes no external request.",
      "by": "Ryan",
      "when": "2026-09-30"
    },
    {
      "id": "nothing-claimed-early",
      "area": "Copy",
      "where": "Throughout",
      "t": "Nothing is asserted back before it has been given",
      "b": "The merchant category callout appears only once there's a description to derive it from, and each review row lists the parts it actually has instead of stringing empty values together with separators. A reassurance about data nobody has entered is just noise.",
      "by": "Claude",
      "when": "2026-09-30"
    },
    {
      "id": "warmer-voice",
      "area": "Copy",
      "where": "Throughout",
      "t": "Conversational by default, flat and direct on money and security",
      "b": "The everyday copy sounds like a person talking you through it — “Let's get you set up”, “Step 1 starts with your EIN”, “Don't worry, it's all saved”. Anything about credentials, debit authority, sanctions screening or what is stored drops the warmth and states the fact plainly, because hedged language there reads as evasion.",
      "tradeoff": "The register shifts between two voices, so new copy has to be written knowing which one it's in.",
      "by": "Ryan",
      "when": "2026-09-30"
    },
    {
      "id": "full-width-description",
      "area": "Visual",
      "where": "Throughout",
      "t": "The step description runs the full width of the form column",
      "b": "The 62-character measure cap on the step subtitle, and the 52-character one on the welcome lede, stopped the text well short of the cards below and read as a cut-off line rather than a deliberate measure. Both now run to the column edge.",
      "by": "Ryan",
      "when": "2026-09-30"
    },
    {
      "id": "placeholders-show-shape",
      "area": "Copy",
      "where": "Throughout",
      "t": "Placeholders show the shape of the answer, never a repeat of the label",
      "b": "Anything with a format carries the format — dates as MM / DD / YYYY or DD / MM / YYYY by region, an SSN as 000-00-0000, an address as Street, city, state, ZIP. Anything free-text carries a short worked example instead. An empty form with an empty field under a label tells you nothing you didn't already know from the label.",
      "by": "Ryan",
      "when": "2026-09-30"
    },
    {
      "id": "mask-on-blur",
      "area": "Trust",
      "where": "Steps 1, 2 and 4",
      "t": "Sensitive fields mask when you leave them, and stay dotted when you come back to edit",
      "b": "An SSN, ID number or account number is plain while it is first typed, then masks to its last four characters the moment focus leaves. Clicking back in makes it editable again with the whole number held as dots (not the last four), and “Show” makes it plain; leaving masks it again. It used to be read-only while masked, so a click did nothing and a third persona run read it as a frozen field; Ryan removed that on 2026-10-06. The real value is always what is edited, so the dots are never typed over. Masking on the first keystroke was rejected because nobody could check what they had typed.",
      "tradeoff": "The value is legible on screen while it is first being typed, which is the right call at a desk and the wrong one over someone's shoulder. Editing a dotted number blind makes a slip easy to miss, so “Show” is the check. The dots use a browser text-security style, so a browser without it would show the digits.",
      "by": "Claude",
      "when": "2026-09-30"
    },
    {
      "id": "shape-language",
      "area": "Visual",
      "where": "Throughout",
      "t": "Buttons are 8px, badges and chips are 4px and sentence case",
      "b": "Full-round pills read as buttons and badges alike. Buttons now share the 8px radius of cards and inputs, while badges, chips, tags and status pills drop to 4px so a label is visibly not a control. They are no longer capitalised, which also let the smallest ones go up a size for legibility. Circles stay for avatars, step dots and progress bars.",
      "by": "Ryan",
      "when": "2026-10-02"
    },
    {
      "id": "collapse-toggle",
      "area": "Visual",
      "where": "Steps 3 and 5",
      "t": "The collapse toggle has no resting fill",
      "b": "“Show N fields” sits in the card header as plain text with its chevron. The grey only appears on hover, over the same 32px hit area, so the control stays easy to hit without a fill competing with the card title.",
      "by": "Ryan",
      "when": "2026-10-02"
    },
    {
      "id": "read-before-accept",
      "area": "Trust",
      "where": "Step 7",
      "t": "Every document can be opened before its checkbox",
      "b": "A “Read these before you accept” card lists the three agreements and any files uploaded in step 6, each with a View button that opens it in a reader. The agreement, rates and privacy checkboxes also carry their own View button beside them, and a Viewed mark appears once something has been opened. Accepting is not blocked on viewing. Superseded in part on 2026-11-11 by sign-on-step-6 and terms-view-only: the documents are now read at the end of step 6, and the agreement and privacy checkboxes are gone, so the View buttons stand on their own rows. The Viewed mark stays. Nothing is gated on viewing. Update, 2026-11-11 (later): the two documents are opened through links in their tick boxes in the Sign it off card (terms-as-signing-checkboxes). The Viewed mark is gone. Update, 2026-11-11 (later): the Sign it off card is back at the end of step 7, as the last thing before Submit (sign-back-on-step-7); where this entry says step 6, read step 7.",
      "tradeoff": "Gating the checkboxes on having opened each document would be stronger evidence of consent, but it punishes people who already know the terms. The Viewed mark gives the audit trail without the friction.",
      "by": "Ryan",
      "when": "2026-10-02"
    },
    {
      "id": "next-steps-panel",
      "area": "Visual",
      "where": "Step 7",
      "t": "“What happens next” is three numbered steps, not three thin bars",
      "b": "The dark panel now uses the 8px card radius, more padding, larger text with better contrast and a heading in the page's own voice. Numbered markers joined by a hairline show a sequence, with step 1 marked as current. The orange all-caps eyebrow and the strips that looked like a progress bar are gone.",
      "by": "Ryan",
      "when": "2026-10-02"
    },
    {
      "id": "approved-unlocks",
      "slice": "2",
      "area": "Flow",
      "where": "Approved",
      "t": "Team invites and device orders appear once approved",
      "b": "Inviting users and ordering card readers need a live account, so they are not offered while the application is under review. The approved page now shows them as Unlocked tiles under the account summary, so the approval ends on what to do next and not just a merchant ID.",
      "by": "Ryan",
      "when": "2026-10-02"
    },
    {
      "id": "edit-from-review",
      "area": "Flow",
      "where": "Step 7",
      "t": "Editing from the review is a round trip, not a step back",
      "b": "Edit on the summary opens that section with progress held at where it was, so going back to fix one answer does not make the application look unfinished. The footer is a single Save that returns to the final review. Back and Save and finish later are removed here: nothing is half done, and the only place to go next is back to the review.",
      "by": "Ryan",
      "when": "2026-10-02"
    },
    {
      "id": "welcome-actions",
      "area": "Flow",
      "where": "Welcome",
      "t": "Welcome buttons follow the same order as every other screen",
      "b": "The primary action is far right with the secondary one to its left, and “What we do with your information” sits left-aligned underneath them. The list of things to gather now has a “What you'll need” heading so people check they have their documents and numbers before step 1, not halfway through it. The badges read “Welcome to Xplor Pay” and “Faster approval”, with “New” dropped. The second badge promises no time, because approval speed varies by business.",
      "by": "Ryan",
      "when": "2026-10-02"
    },
    {
      "id": "required-marker",
      "area": "Copy",
      "where": "Throughout",
      "t": "Required fields carry a red asterisk; optional ones keep their chip",
      "b": "Every field is required unless it is tagged Optional, and required labels now end in a red *. (There was also an “If applicable” tag; it was removed on 2026-10-06, see no-if-applicable-tag.) There is no legend: the asterisk is understood on its own. Screen readers hear “required” instead of the symbol. Marking the exception with a chip and the rule with a star means a person can see at a glance what stands between them and the next step.",
      "by": "Ryan",
      "when": "2026-10-02"
    },
    {
      "id": "persona-test-fixes",
      "area": "Copy",
      "where": "Steps 1, 6 and the submitted screen",
      "t": "Nothing contradicts itself, and the status screens only name the people entered",
      "b": "Found by the first persona test run. The “to go” count in step 6 is worked out from the list. The W-9 read-back and the submitted screen use the owners the applicant entered rather than the sample people, and the “everyone's done their bit” tile only says so when it is true. Spelling is US throughout (license, authorized, tokenized, recognize). Entrance animations were shortened and shrunk so cards settle before someone clicks.",
      "by": "Ryan",
      "when": "2026-10-05"
    },
    {
      "id": "validate-on-continue",
      "area": "Flow",
      "where": "Throughout",
      "t": "Nothing moves on until the step is complete, and every problem shows at once",
      "b": "The first persona run got to “submitted” with an empty owner form, no signature and none of the agreements ticked, which made “Everything below has already passed our checks” untrue. Pressing “Save and continue” now checks the whole step, lists every problem in place with a short fix-it message, scrolls to the first one and says how many there are by the button. Nothing shows before the first attempt, so a fresh form is not covered in red, and each message clears the moment its field is put right. Step 7 also needs the typed signature to match the signatory's name. Changed on 2026-10-22: the privacy note moved into the description and the support line was replaced by a Get help button (decision welcome-help-and-info-in-header).",
      "tradeoff": "Formats are checked leniently (digit counts, not checksums) so a prototype never rejects a plausible real number.",
      "by": "Ryan",
      "when": "2026-10-05"
    },
    {
      "id": "business-type-first",
      "area": "Flow",
      "where": "Business type (page 2)",
      "t": "Ask who you are before asking anything else",
      "b": "A sole trader in the second persona test was asked for a date and state of incorporation, got a registry match for a stranger's company and had no way to say none of it applied. The page after the welcome screen, adapted from the Figma Make prototype, now asks what type of business you are (company, individual / sole trader, non-profit). The answer shapes the rest: a sole trader gives an EIN only if they have one, sees no incorporation fields, no ownership percentages and no owner invitations, and is not asked for registration documents; a non-profit is asked who runs the organization rather than who owns it. Changing the answer later clears what was entered, so nothing that no longer applies is left behind.",
      "tradeoff": "Back from step 1 returns here, and changing type restarts the form. That is deliberate but loses typed answers.",
      "by": "Ryan",
      "when": "2026-10-05"
    },
    {
      "id": "help-is-a-person",
      "area": "Trust",
      "where": "Throughout",
      "t": "“Get help” opens a phone number, not nothing",
      "b": "The second test persona looked for someone to call at every sensitive field and found a Get help button that did nothing, so her fallback was to leave and ring a relative. Both help buttons now open a short panel with a phone line and email, the hours, and a line saying Xplor will never ask for a full SSN, password or bank login by chat, phone or text, which also covers the worry about phishing texts.",
      "tradeoff": "The number and email are placeholders and need replacing with real support details.",
      "by": "Ryan",
      "when": "2026-10-05"
    },
    {
      "id": "plain-compliance",
      "area": "Copy",
      "where": "Step 5 · Compliance declarations",
      "t": "Say what the check is, then give its acronym",
      "b": "“MATCH / TMF”, “OFAC”, “PCI DSS” and “SAQ” meant nothing to the first test persona. Each label now describes the check in everyday words (“a check of the card networks' list of closed merchant accounts”) and the hint carries the acronym for anyone who wants to look it up. The questionnaire fields say which option to pick if you are unsure.",
      "by": "Ryan",
      "when": "2026-10-05"
    },
    {
      "id": "min-type-size",
      "area": "Visual",
      "where": "Throughout",
      "t": "Nothing is set smaller than 12px",
      "b": "Every size under 12px (chips, captions, hints, tags, step times, the numbered decision markers) was raised to 12px. Small type that carries real information, like what a field is or what a badge means, should not need squinting, and one floor is easier to hold than a scale of near-identical small sizes.",
      "by": "Ryan",
      "when": "2026-10-02"
    },
    {
      "id": "category-editable",
      "area": "Copy",
      "where": "Step 1 · Business & address",
      "t": "Show the business category in plain words, as a field they can change",
      "b": "The prototype used to announce “7997 · Membership clubs (fitness)” for every business, and four testers out of four met it. The category is now a field the applicant chooses (searchable, name or code), never a code stated back to them. Reworded on 2026-11-05: it used to be pre-filled from a business description with a way out (“we'll confirm with you”); the description box and the suggestion are gone (decision no-mcc-picker).",
      "tradeoff": "The suggestion will still be wrong sometimes, which is why it is a field and not a statement.",
      "by": "Claude",
      "when": "2026-10-05"
    },
    {
      "id": "why-we-ask",
      "area": "Trust",
      "where": "Step 2, step 6 and welcome",
      "t": "Give a reason beside each sensitive request and say what documents are coming",
      "b": "A wary tester stopped at the photo ID request because the welcome page never mentioned it and the only explanation named an unnamed partner. The ID number, the SSN or SIN and the photo ID row now each start with a one-line reason, the welcome page lists the documents needed at step 6, and its “owners” card now covers people who run an organization too. The verification partner is named in every place it appears (Trullio, on Ryan's word), so there is a name to look up.",
      "tradeoff": "More words beside already dense fields. The security claims repeated here (never stored, sent straight to the partner) are existing copy and have not been verified.",
      "by": "Claude",
      "when": "2026-10-05"
    },
    {
      "id": "w9-review-and-sign",
      "area": "Trust",
      "where": "Step 6 · Supporting documents",
      "t": "The W-9 is shown to be read and signed, not marked signed",
      "b": "The W-9 row said “give it a read and sign” but its only button produced a file already “signed by” the applicant with a tax number matching step 1, though the sole-proprietor tester had given no tax number and signed nothing. The row now offers Review and sign (a form filled from the applicant's own answers, a certification tick and a typed name that must match step 2) or Upload your own. With no EIN, a company can't sign here and is told why; a sole proprietor's number is their SSN from step 2, which is not repeated on screen. Read-backs for the other documents only say “matches step N” when there is a value to match. Superseded on 2026-11-11 by w9-upload-only: the Review and sign button, the on-screen form and the typed signature are gone. The W-9 is an upload like the other documents.",
      "tradeoff": "More steps than a one-click “checked”. The form text is sample text until legal provides the real one, and the e-signature step is simulated.",
      "by": "Claude",
      "when": "2026-10-05"
    },
    {
      "id": "status-matches-state",
      "area": "Trust",
      "where": "Step 7 and confirmation",
      "t": "Summaries and the confirmation describe what has happened, and nothing more",
      "b": "Testers kept meeting claims that were not true yet: “signed by” before signing, “pending document check” beside documents marked checked, “checks cleared” seconds after submitting, registry matches for a baker with no registration, “submitted 2 minutes ago” and “0 of 1 owners verified” under a green tick. Now: the signatory row says “signatory” until the typed signature matches; the payout row follows the bank document; the documents row says needed, checked and not needed; the confirmation says the application was received at the real time, that checks are running and what they cover, and a lone applicant's own ID is “the only one to check”. A sole proprietor signs “for my own business” with the title Owner, and “sole proprietor” is used throughout.",
      "tradeoff": "The confirmation no longer shows a quick row of green ticks, which was reassuring but untrue. The decision time is still a fixed sample.",
      "by": "Claude",
      "when": "2026-10-05"
    },
    {
      "id": "optional-refund-policy",
      "area": "Flow",
      "where": "Step 3",
      "t": "The refund-policy URL is optional",
      "b": "A tester had no policy page and pasted a sentence to get past the required field. The field is now optional and says so. (The website field was optional too until 2026-11-05; see website-required-with-none-box.)",
      "tradeoff": "Fewer applicants will supply a policy URL, which helps with chargebacks. The underwriting team should say whether it is needed for particular business categories.",
      "by": "Ryan",
      "when": "2026-10-05"
    },
    {
      "id": "success-toasts",
      "area": "Feedback",
      "where": "Everywhere a green confirmation appears",
      "t": "Green confirmations are toasts in the top-right corner, not blocks in the page",
      "b": "Confirmations used to push a green block into the page and hold the next fields back. They now appear as a toast that fades after about four and a half seconds, so the fields arrive straight away. The note at the top of step 6 is reassurance rather than a confirmation, so it is now a neutral callout that stays. (Step 1's lookup, the main source of these, was removed on 2026-11-05.)",
      "tradeoff": "A toast can be missed or fade before it is read.",
      "by": "Ryan",
      "when": "2026-10-05"
    },
    {
      "id": "continue-disabled-until-complete",
      "area": "Flow",
      "where": "Every step",
      "t": "Save and continue stays disabled until the page is complete; each field flags its own problem when it is left",
      "b": "Superseded for steps 1 to 6 on 2026-11-09 by partial-steps-allowed and errors-only-for-bad-entries: those steps now save and continue even when incomplete, and a field left empty no longer shows an error when it is left; only the final Submit for verification is held back. The button is disabled until every required field on the step is valid. The reason is never left to the button: a field shows its problem the moment the applicant clicks or tabs out of it, with a red border and a message under it, so a wrong date or an empty required answer is flagged where it happened. An owner whose fields have a problem carries a Needs a look badge in the header, so a collapsed owner cannot hide one.",
      "tradeoff": "A field that was never visited gives no sign it is missing until the applicant scrolls to it, and the disabled button does not point to it. If testers get stuck on a skipped field, add a count of what is left near the button.",
      "by": "Ryan",
      "when": "2026-10-05"
    },
    {
      "id": "welcome-four-cards",
      "area": "Copy",
      "where": "Welcome page",
      "t": "The “What you'll need” list is four cards, with bank and documents combined",
      "b": "Getting paid and the documents that back it up are one preparation job, so they share a card: bank numbers, and the documents that back it up (the bank letter was removed later, decision bank-verified-by-trullio). The line about a photo ID going up at step 6 was removed because it was unclear; the second card is titled “Details of the people who own your organization”. The page also sits closer to the top, as do all the steps.",
      "tradeoff": "The combined card is longer than the others.",
      "by": "Ryan",
      "when": "2026-10-05"
    },
    {
      "id": "card-split-single",
      "area": "Flow",
      "where": "Step 3 · Your card volumes",
      "t": "Ask for the card-present share only; card not present is whatever is left",
      "b": "Card present and card not present were two boxes that had to add up to 100, so the second could only ever repeat or contradict the first. Step 3 now asks for card present alone and its hint says online, in-app and phone sales count as the rest. The “need to add up to 100%” error went with it, because it can no longer happen. Update, 2026-11-11 (Ryan): the sentence saying online, in-app and phone sales count as the rest has been removed from the hint. It now reads only In person, on a card machine. (see volume-fields-reordered).",
      "tradeoff": "If underwriting wants the card-not-present figure typed in as its own answer, it is now derived (100 minus card present) rather than entered. Ops should confirm that is acceptable.",
      "by": "Ryan",
      "when": "2026-10-05"
    },
    {
      "id": "step3-neutral-wording",
      "area": "Copy",
      "where": "Step 3 · Your card volumes and How you'll appear",
      "t": "Step 3 stops assuming a gym, and stops asking about a platform the applicant may not have",
      "b": "Two testers running a bakery and a photography studio were told their “annual membership” was an example of a big sale, and that “members” would see the billing descriptor. Both now speak to any business: the biggest-sale hint no longer names a membership, and the descriptor hint says customers. The Platform field, which read “Already filled in from your Xplor account”, only appears for someone arriving from an existing account, since a new applicant has none.",
      "tradeoff": "The example is gone, so the maximum-sale question is a little more abstract. Whether the platform is worth asking at all is a question for the Xplor Studio team.",
      "by": "Claude",
      "when": "2026-10-05"
    },
    {
      "id": "docs-only-whats-needed",
      "area": "Flow",
      "where": "Step 6 · Supporting documents",
      "t": "Documents that are no longer needed are not listed",
      "b": "A sole proprietor without an EIN has no EIN letter to add, so that row is not listed. A row like that used to stay on the page greyed out with a “Not needed” pill and an explanation, which added a line for something the applicant never has to do. Step 6 now lists only the documents still to add, the note above says how many are left, and the review summary no longer counts the ones that dropped away.",
      "tradeoff": "",
      "by": "Ryan",
      "when": "2026-10-05"
    },
    {
      "id": "step2-prefill-sections",
      "area": "Flow",
      "where": "Step 2 · Owner details",
      "t": "Offer back what step 1 already collected, and break each owner into three labelled groups",
      "b": "Two testers typed their email, phone and address at step 1 and were asked for them again at step 2. The first owner's email and phone now start filled from step 1, a sole proprietor's home address from their business address, and the country of residence and ID from the region. All of it stays editable. The owner's roughly fifteen fields are grouped under About them, Identity verification and Screening, so the page reads as three short jobs rather than one long form.",
      "tradeoff": "A company's step 1 email and phone are business contacts and may not be the owner's own, so they are offered, not locked. A pre-filled country can be missed by someone who holds a different nationality; nationality is deliberately left blank.",
      "by": "Claude",
      "when": "2026-10-05"
    },
    {
      "id": "welcome-phone-partner",
      "area": "Trust",
      "where": "Welcome",
      "t": "Put a phone number and the verification partner's name on the welcome page",
      "b": "The baker in the persona tests looked for someone to call before she would give an SSN, and the welcome page offered only a small privacy link that never named who checks her identity. The page now carries a line stacked just above the privacy link, “Want to talk to someone first?”, with the support number and hours, and the privacy note says identity checks are done by Trullio, our verification partner. The number and hours are the same constants the Get help panel uses, so they change in one place. Changed on 2026-10-22: the privacy note moved into the description and the support line was replaced by a Get help button (decision welcome-help-and-info-in-header).",
      "tradeoff": "The number is a placeholder until ops supply the real one, and the security claims in the privacy note (tokenized, encrypted) are still unverified. A person has to read the page to reach the number; it is a line of text, not a button.",
      "by": "Claude",
      "when": "2026-10-06"
    },
    {
      "id": "info-popover-hover",
      "area": "Flow",
      "where": "Welcome",
      "t": "The privacy note shows on hover and goes when the pointer leaves",
      "b": "The “What we do with your information” note opened on hover but a click on the same link toggled it shut, so the first click appeared to do nothing. Ryan wants it to behave as a hover note, so hover shows it and leaving hides it. A click or tap now only ever opens it, never closes it, which keeps it reachable on a touch screen where there is no hover. Escape closes it. The question-mark icon replaces the padlock so the link matches the support line below it. Changed on 2026-10-22: the privacy note moved into the description and the support line was replaced by a Get help button (decision welcome-help-and-info-in-header).",
      "tradeoff": "A hover note is invisible to someone who never moves the pointer over it, and on touch it stays open until Escape or a tap elsewhere is handled. Keyboard users can open it with Enter but there is no focus-to-open.",
      "by": "Ryan",
      "when": "2026-10-06"
    },
    {
      "id": "dates-format-and-check",
      "area": "Flow",
      "where": "Steps 1, 2 and 5 · Every date field",
      "t": "Dates lay themselves out as they are typed, and are checked as real dates in the region's order",
      "b": "Three testers met the same fault: a date of birth typed as digits stayed unformatted, and a Canadian typed 03/25/1990 into a day-first field without a word. Date fields (date of birth, ID expiry, date of incorporation, PCI questionnaire date) now insert the slashes as digits are typed, so 03151973 becomes 03 / 15 / 1973, and “3/5/1990” is read as 03 / 05 / 1990. When the field is left, the date has to be a real one in the region's order: a month of 01 to 12, a day that exists in that month, a year from 1900. A date of birth, incorporation or questionnaire date cannot be in the future, and an ID expiry cannot be in the past. The message says which part is wrong and shows the order the field expects.",
      "tradeoff": "An ID that has just expired is refused, which is right for verification but may stop someone who only has an old licence to hand. Typing in the middle of a date moves the cursor to the end. The sample people's dates were changed so that they read as valid in either order.",
      "by": "Claude",
      "when": "2026-10-06"
    },
    {
      "id": "add-documents-later",
      "area": "Flow",
      "where": "Step 6 and step 7",
      "t": "Every Required file has to be added in step 6, and the application cannot be submitted without them",
      "b": "Three testers reached step 6 without the file in hand (a bank letter, a void cheque, a photo ID on a phone) and had nowhere to go. A first version let them carry on and submit with files owed: an “I'll add this later” link (removed 2026-10-06) and then “Text me a link to add it from my phone”. After the third persona run, in which an application went in with an ID outstanding while the sidebar said Done, Ryan removed both on 2026-10-06. Step 6 now enables Save and continue only when every Required file is added, step 7 also checks them so a file replaced afterwards blocks submitting, and the disabled button's hover note names any file still missing. The submitted screen no longer lists files for the applicant to add; an owner who has been sent a link adds their own ID, which is not asked of the applicant.",
      "tradeoff": "Someone without a file to hand is stuck at step 6 until they find it, and the only routes are to find the file or leave and come back; Ryan accepted that because step 7 is signing and cannot honestly be done without the documents. Whether ops would take an application with a file missing is still an open question (PROGRESS.md section 7); this is the cautious answer. Nothing in the prototype lets a file arrive from a phone, so that path is gone rather than simulated.",
      "by": "Claude",
      "when": "2026-10-06"
    },
    {
      "id": "category-is-mcc",
      "area": "Flow",
      "where": "Step 1 · Merchant category code",
      "t": "The category is a merchant category code (MCC), not an SIC code",
      "b": "Ryan chose merchant category codes over SIC codes: they are what the card networks use and what the application is ultimately classified by. The field is “Merchant category code (MCC)”, searched by name or code. The full list is in mcc-codes.js; which codes an applicant sees depends on their division (decision mcc-from-division). The SIC list is no longer loaded.",
      "tradeoff": "The list in mcc-codes.js has 221 codes written from general knowledge of the public MCC list, not checked against the Visa or Mastercard publication, and it leaves out the codes the networks restrict (gambling, adult, money transfer and similar) until ops say which Xplor accepts. Do not rely on it until ops supply the real list. Whether Canada also needs NAICS is still open.",
      "by": "Ryan",
      "when": "2026-10-06"
    },
    {
      "id": "delegate-owner-step",
      "slice": "2",
      "area": "Flow",
      "where": "Step 2 · Owners, and the submitted screen",
      "t": "Each owner can be sent a link to fill in their own details",
      "b": "The person filling in the form is often not an owner, and the owners hold their own ID and personal details. Each owner card has a “Send them a link” button. It opens a dialog like the welcome page's, asking for that person's email and saying what they will and won't see. Once sent, the card reads “Invited · name@example.com”, nothing more is needed from the applicant for that owner, and their ID file leaves the applicant's step 6. The review row counts how many were sent a link, and after submitting the confirmation says it is waiting on their details and lists each person with a way to preview what they will see. The prototype shows the recipient's side: a landing page, their own card with a photo ID row, and a thank-you. Sending their details marks the owner “Details received”. The first version of this also let the whole step be sent to one person; Ryan removed that banner on 2026-10-06.",
      "tradeoff": "Assumptions that are not ops decisions: an application can be submitted while an owner's details are still with them; a sole proprietor cannot send their own card; and the signatory in step 7 is typed by the applicant. The recipient page's claims about where details go repeat existing copy and are unverified. The email is simulated: nothing is sent, and what the real link page looks like, how long it lasts and what happens when it expires are open.",
      "by": "Claude",
      "when": "2026-10-06"
    },
    {
      "id": "no-if-applicable-tag",
      "area": "Flow",
      "where": "Every field that appears after an answer, and the prior-processor statement in step 6",
      "t": "No “If applicable” tag: a field that appears is a field that is needed",
      "b": "Fields such as the prior processor's name, the countries sold to, the SAQ type or the tax lien details only appear once an earlier answer makes them relevant, so tagging them “If applicable” sent a mixed message: the applicant had just chosen the answer that made them apply. They now look and behave like every other required field (red *, must be filled before Save and continue enables). The prior processor statement row in step 6 reads “Required” for the same reason. Only Optional fields keep a tag.",
      "tradeoff": "Fields that used to be skippable once shown are now required, so some steps gate harder than before: the follow-up boxes under the history questions, the terminal type, the signatory name and title, and the SAQ type and date. If any of those should stay skippable they need the Optional tag, not a return of the old one. The statement row also now blocks continuing until it is added or deferred.",
      "by": "Ryan",
      "when": "2026-10-06"
    },
    {
      "id": "owners-added-before-continuing",
      "area": "Flow",
      "where": "Step 2 · Owners",
      "t": "No one is listed to start with, and every owner has to be added before continuing",
      "b": "The applicant is often not an owner, so step 2 no longer starts with “You” as the first owner, and email and phone number are no longer carried over from step 1 into an owner's card. A sole proprietor still starts with themselves, since they are the owner, and (from the third persona run) their step 1 email and phone are offered back, still editable. Everyone else adds each owner (or, for a non-profit, each director or trustee) and Save and continue stays disabled until at least one is added. For a company the shares listed must come to more than 75%, because anyone holding 25% or more has to be listed, and the note under the bar says how much is unaccounted for. An owner who has been sent a link needs nothing from the applicant; everyone else needs every field. The 75% check is skipped while any owner has been sent a link, since their share is not known. An owner can be removed from their card (a sole proprietor cannot remove themselves).",
      "tradeoff": "The 75% rule is how the form knows every 25% owner is listed; it can be wrong if owners hold less than 25% each (a company of five 20% owners is accepted at 100% but five 15% owners listed as four would not be). With a link sent, nothing stops the applicant listing an owner with no name or share, so the checks wait on that person's details. Removing an owner discards what was typed for them with no undo, only a toast. Whether 25% is the right threshold is for compliance to confirm, and it may differ by region.",
      "by": "Ryan",
      "when": "2026-10-06"
    },
    {
      "id": "step-6-and-pci-tidy",
      "area": "Flow",
      "where": "Step 6",
      "t": "Step 6 loses four pieces of noise",
      "b": "On step 6: the “3 to go” banner at the top is gone (the cards already show what is outstanding); the W-9 card no longer says “We've filled it in from your answers”; a document card keeps its default border once a file has been read, since the Checked badge already says so; and “I'll add this later” is gone, because step 6 is second to last and there is no later. “Text me a link to add it from my phone” stays. The phone note now says the number is the one from step 1, since step 2 no longer asks for the applicant's own number.",
      "tradeoff": "With “later” gone, a merchant without a file has only the phone link, which is a simulated stub, or has to stop.",
      "by": "Ryan",
      "when": "2026-10-06"
    },
    {
      "id": "why-as-hover-text",
      "area": "Flow",
      "where": "Every step · under the step description, and the prototype options",
      "t": "“Why we ask” is hoverable text after the step description, and the side panel is gone",
      "b": "The right-hand panel (the why note and the “Stuck on something?” card) is removed, along with its prototype option. The note's title, for example “Why do you need owners?”, now ends the step's description at the top of the page with a small question icon. Hovering it opens the note as a pop-over; moving the mouse away closes it. Keyboard focus and a tap also open it, and Escape closes it. Help is still one click away from “Get help” in the step list. The “Preview what they'll see” controls for owner links are not part of the applicant's page any more: they live in the prototype options, under Owner links. A card also closes by itself once its owner has been sent a link, so the applicant can move on to the next owner or the next step.",
      "tradeoff": "The note is now hidden until asked for, so fewer people will read it than when it sat in view; the one that carries reassurance (what gets sent) matters most. A hover note has no equivalent on a touch screen other than a tap, and it covers a line or two of the page while open. The form now uses the full width at all sizes. The “Chat with a human” card is gone, so chat is reached through Get help.",
      "by": "Ryan",
      "when": "2026-10-06"
    },
    {
      "id": "owner-card-actions-quiet",
      "area": "Flow",
      "where": "Step 2 · Owner cards",
      "t": "Owner card buttons are plain until hovered, and an owner can be removed",
      "b": "Superseded by owner-card-click-to-open for the Open/Collapse button and the Remove button's look. Still true: Remove deletes the owner and what was typed for them, and is not shown to a sole proprietor, whose only owner is themselves.",
      "tradeoff": "Plain buttons are less obviously buttons until hovered. Remove acts at once with a toast and no confirmation or undo, so a filled-in card can be lost by a misclick.",
      "by": "Ryan",
      "when": "2026-10-06"
    },
    {
      "id": "nonprofit-wording",
      "area": "Copy",
      "where": "Step 1, step 2 and the welcome page · non-profit",
      "t": "Non-profits no longer see a business-shaped step 1, and the signatory is defined",
      "b": "For a non-profit, step 1 is titled “Tell us about your organization”, the card that asked “What the business sells” says “What the organization does”, and the description box asks what people are paying or giving for, with donations, tickets and memberships as examples. The signatory card now says what a signatory is: the person who signs the agreement for the organization. The welcome page, which appears before the applicant says what type they are, lists owners with 25% or more first and then says directors and trustees are the equivalent for a non-profit.",
      "tradeoff": "Only these places were changed (steps 3 to 6 are in the next decision). A company's signatory card is still not defined. The PO box question for the registered address is still waiting on ops (Q9).",
      "by": "Claude",
      "when": "2026-10-06"
    },
    {
      "id": "nonprofit-wording-steps-3-6",
      "area": "Copy",
      "where": "Steps 3 to 6 · non-profit",
      "t": "Non-profits are asked about payments and donations, not sales and goods",
      "b": "For a non-profit, step 3 says “How you take payments”, “Primary payment channel”, “Recurring donations or memberships?”, “Do you take payments from outside the US?” and “Countries payments come from”. “Type of goods or services” becomes “What people pay or give for”, with Donations, Tickets and events, Memberships and subscriptions, Services, Physical goods and Mixed. The agent question asks about other organizations (chapters, member groups or fundraisers). The statement card is “How you'll appear on statements” and speaks of the people paying you instead of customers. The biggest-single-payment hint and the card-present hint say payment and donation. In step 4 the account holder hint, the connected-bank headline and, in step 6, the registration and bank document hints say organization. Step 5 and step 7 needed no change.",
      "tradeoff": "The Donations option and the examples are guesses at what a non-profit takes cards for, and ops may want a different list or a donation-specific question (for example whether donors get a tax receipt). Whether a non-profit should be asked about chargebacks, trials and processing history in the same words is also for ops. Left as business wording: the step list names (“Business & address”, “Owners & signatory”), step 1 placeholders and field labels such as “Business phone number”, the review labels, the W-9 and agreement text, the welcome and business-type pages, and the approved screen's “Merchant ID” and “Payouts to” labels. A non-profit has been walked through these steps only by reading the code, not in the browser.",
      "by": "Claude",
      "when": "2026-10-06"
    },
    {
      "id": "nonprofit-wording-leftovers",
      "area": "Copy",
      "where": "Whole flow · non-profit",
      "t": "The rest of the business wording is swapped for a non-profit",
      "b": "For a non-profit the step list and review rows read “Organization & address” and “Leaders & signatory” (the browser tab title too). Step 1 says organization on the legal name, phone and email labels, their placeholders, the website hint, the contact card line and the category hint. The why-we-ask notes for steps 1, 2 and 7 and the identity-check hint say organization, and the step 2 note says directors and trustees have to be identified instead of 25% owners. Document read-backs and the checking note say organization, the statement preview speaks of a supporter's statement, the owner-link recipient page says who runs the organization and the approved screen says people can pay themselves.",
      "tradeoff": "Deliberately left alone: the business-type page (it is where the type is chosen, so “business” is the neutral word), the welcome page (shown before the type is known), the agreement, rates and privacy sample text, which legal owns, and the W-9 (“Business name, if different” follows the IRS form). “Leaders” and “supporter” are my wording, not Ryan's or ops'. “Supporter” does not fit a non-profit selling tickets or services. The Merchant services agreement title and “merchant” in the approved screen are unchanged.",
      "by": "Claude",
      "when": "2026-10-06"
    },
    {
      "id": "disabled-button-says-whats-missing",
      "area": "Flow",
      "where": "Every step · Save and continue",
      "t": "Hovering or focusing the disabled Save and continue lists what is still needed",
      "b": "Superseded for steps 1 to 6 on 2026-11-09 by partial-steps-allowed: those steps now save and continue even when incomplete, and only the final Submit for verification is held back. In the third persona run Maya left Phone blank on step 2, pressed a pale Save and continue twice, saw nothing happen and thought the page was broken. The button stays disabled, but hovering it, or tabbing to it, now opens a small note above it headed “Still needed to continue”, listing each missing item in the words of its field (for example “Business phone number”, “File: Government photo ID for Maya Chen”) or, for things that are not a field such as owner shares, the existing error sentence. It lists six at most and then “and N more”. Mouse-away, blur or Escape closes it. Nothing is shown on the page itself, no error appears on any field because of it and there is no count.",
      "tradeoff": "This keeps Ryan's earlier calls (the button stays disabled, no click-to-reveal errors, no count near the button) and adds only a hover note he chose on 2026-10-06 from three options. It is hidden until asked for, like the why-we-ask note, so someone who never hovers still sees a pale button that does nothing; on a touch screen there is no hover, and a tap on the disabled button does nothing. Clicking the disabled button still does not scroll to the empty field. Owner fields are prefixed with the owner's name, which reads oddly for “New owner”.",
      "by": "Ryan",
      "when": "2026-10-06"
    },
    {
      "id": "bank-verified-by-trullio",
      "area": "Flow",
      "where": "Step 6 · Documents, and step 4 · Payout account",
      "t": "Step 6 no longer asks for proof of the bank account",
      "b": "The Bank account verification row (a voided check or void cheque, a bank letter, or a recent statement) is gone from step 6, in both regions and for every business type. Ryan says Trullio, our verification partner, verifies bank accounts for us, so the applicant only types the account in step 4. The step 4 description, the line under the fields and the Why do you need my account details? note, the welcome page's bank line and the step 7 review row no longer mention a document, and the review row shows only the bank name and account type. The Banking Verification card on the More info needed screen is unchanged: it is what Ops can still ask for after submit. Earlier versions made the bank letter always required (decision bank-letter-always, 2026-10-07). Update, 2026-11-11: Ryan says Trullio verifies bank accounts for the US but not for Canada. Step 6 still asks for no bank proof in either region, so how a Canadian account is checked is not decided.",
      "tradeoff": "That Trullio verifies bank accounts is relayed by Ryan, not from a document; Trullio or compliance should confirm it covers US and Canadian accounts and what happens when an account cannot be verified (the Banking Verification request is the likely route). A mistyped number is now caught only after submit, not by a document at step 6. Step 6 has one less file to find, which was the most common place people got stuck without the paper in hand.",
      "by": "Ryan",
      "when": "2026-11-02"
    },
    {
      "id": "max-sale-not-below-average",
      "area": "Flow",
      "where": "Step 3 · Maximum single transaction",
      "t": "The maximum single transaction cannot be smaller than the average",
      "b": "In the third persona run Maya typed an average of 28 and a maximum single transaction of 20 and carried on, and the review then read “avg $28” with a smaller maximum behind it. The maximum field now shows “Your biggest single sale can't be smaller than your average of $28.” when it is below the average, once both amounts are in. Like the other checks it appears when the field is left, clears when put right, and holds Save and continue.",
      "tradeoff": "It is a hard stop, so someone whose average is mistyped too high has to find and fix the average (the message names it). Editing the average afterwards re-checks the maximum but only shows the message once the maximum has been left. A sole outlier below the average is never legitimate, so no warning-only version was built.",
      "by": "Ryan",
      "when": "2026-10-06"
    },
    {
      "id": "rail-waiting-on-owners",
      "slice": "2",
      "area": "Flow",
      "where": "Progress panel · step 2",
      "t": "The step list says step 2 is done but still waiting on owner details",
      "b": "When step 2 is finished but one or more owners have been sent a link and have not replied, its row in the side progress panel keeps its tick and “Done” and adds a line under the name: “Waiting on one owner's details” or “Waiting on 2 owners' details” (“person's” and “people's” for a non-profit). It goes away when every owner's details have come in or the owner is removed. It is not shown when nobody was sent a link.",
      "tradeoff": "The tick still says Done, because the applicant has nothing more to do on that step; the line is the only sign that checks cannot finish. The recipient preview in Prototype options is how to see it clear. The note appears on the step list only, not in the review rows (which already say how many were sent a link).",
      "by": "Ryan",
      "when": "2026-10-06"
    },
    {
      "id": "termination-asked-once",
      "area": "Flow",
      "where": "Step 3 · Processing history, step 5 · Declarations",
      "t": "Being terminated by a processor is asked once, in step 5",
      "b": "Step 3 asked “Has a processor ever terminated you?” (with a “which processor, when, and why” box) and step 5 asked “Has a merchant account of yours been terminated?” (with “Processor, date and reason”). In the third persona run the tester noticed the repeat. Ryan chose to keep the step 5 declaration and remove the step 3 question and its follow-up, and with them the card note “A past termination isn't an automatic no…”, which no longer had a question to sit beside. Step 3's processing history is now whether they have accepted cards before and, if so, the prior processor and chargeback ratio. Update, 2026-11-11: the Processing history section no longer exists; its question about accepting cards before moved into Your card volumes (see card-history-in-volumes).",
      "tradeoff": "The step 3 note was reassurance given right where an applicant might hesitate; step 5 has its own (“Saying yes to any of these won't stop your application”), but it comes later and is about all the declarations. If ops want termination known before the statement is requested, the order would need another look.",
      "by": "Ryan",
      "when": "2026-10-06"
    },
    {
      "id": "quiet-help-and-empty-owners",
      "area": "Visual",
      "where": "Step list · Get help, every step · Why are we asking, Step 2 · Owners",
      "t": "Get help and “Why are we asking?” are quieter, and the empty owner list has no note",
      "b": "The Get help button in the step list now has the Back button's dark grey text and outline instead of purple, and keeps its white background. The “Why are we asking?” line under each step's description is in normal text colour and turns purple only on hover or keyboard focus. Its size and the purple question icon are unchanged. The “No one added yet. Add each owner…” note on step 2 is removed, for both company and non-profit wording, so an empty list shows just the add button.",
      "tradeoff": "Purple no longer hints that the why note can be opened, so it relies on its question icon and the pointer cursor. With no note, a first-time applicant gets the explanation of 25% owners and send-a-link only from the step description and the add button.",
      "by": "Ryan",
      "when": "2026-10-06"
    },
    {
      "id": "soft-card-shadows",
      "area": "Visual",
      "where": "Every step, welcome page, business-type page, confirmation",
      "t": "Cards and sections have a very soft lift shadow",
      "b": "Cards, the welcome page's “What you'll need” cards, owner cards, document cards, choice cards, the business-type cards, the review summary and the confirmation card now carry two faint layers of shadow on top of their thin outline: a tight one for contact and a wide, low one for depth, both tinted to the text colour rather than pure black. The shadow is one shared value (--lift in app.css), and the selected, open, busy and error states keep it, so a card never loses its lift when its outline changes.",
      "tradeoff": "At this strength the shadow is easy to miss on a dim screen or a projector, which is intended. Dialogs, pop-overs and the prototype panel keep their stronger shadows so they still read as sitting above the page. Inputs, buttons and the nested statement preview are left flat.",
      "by": "Ryan",
      "when": "2026-10-06"
    },
    {
      "id": "add-myself-as-owner",
      "area": "Flow",
      "where": "Step 2 · Owners",
      "t": "“Add myself” on step 2, for an applicant who is also an owner",
      "b": "When no owner is marked as the applicant, step 2 offers “Add myself as an owner” (“as a director or trustee” for a non-profit) above “Add an owner or director”. It adds a card for the applicant with their email and phone from step 1, the title “Owner / CEO” (“Director” for a non-profit) and whatever share is still unaccounted for, so a sole owner sees 100%. Nothing else is guessed: name, date of birth, address and ID stay blank, and every field can be edited. The button disappears once the applicant is added. Because the card is the applicant's own, the confirmation screen and the step 7 signatory title treat it as theirs. The persona test that prompted this had a sole owner retype their email, phone and title, and start from the defaults “Director” and “10%”. Their card has no “Send them a link” button, since they are the one filling it in.",
      "tradeoff": "Decision 69 starts owners empty because the applicant is often not an owner, and that still holds: nobody is added until they click. The 100% default is wrong for someone with partners, who must edit it, and it shows plainly in the ownership bar. The plain “Add an owner or director” button is unchanged and still starts at “Director” and 10%.",
      "by": "Ryan",
      "when": "2026-10-07"
    },
    {
      "id": "confirmation-id-status",
      "area": "Status",
      "where": "Confirmation screen · the ID tile and the timeline note",
      "t": "The confirmation only says we're waiting on an ID when a link is outstanding",
      "b": "The tile used to say “Still waiting on one ID” and “We've nudged” a person whenever an owner was not verified or received, which included owners the applicant had added and whose ID the applicant had uploaded in step 6. A persona saw “We've nudged Maya Chen to finish” while the timeline said her ID had arrived. Now only an owner who was sent a link and has not replied counts as owed, and only they are named as nudged; the title says “Still waiting on N IDs” when there are several. When there is one owner and nobody is being chased, the tile reads “Nothing waiting on anyone else” with “Your own ID is the only one to check”, or “The only ID is in and being checked” when that owner was added rather than marked as the applicant. The timeline note follows the same rule. Changed on 2026-10-22: the two cards under the confirmation, including this one, were removed (decision submitted-no-extra-cards).",
      "tradeoff": "A single owner added with the plain “Add an owner or director” button is read as the applicant's own ID in the timeline note (“Your ID arrived and is being checked”), which is wrong if the applicant is listing someone else as the only owner. That is rare, and step 6 will not continue until the file is in either way.",
      "by": "Ryan",
      "when": "2026-10-07"
    },
    {
      "id": "return-by-login",
      "area": "Trust",
      "where": "Save & Exit (top bar)",
      "t": "Tell people how to come back: log in again and carry on where they left off",
      "b": "Answers save as people go, and signing in again reopens the last saved state. The Save & Exit dialog says that in one line at the top (Log back in any time with the link in your welcome email, and you'll carry on where you left off), with no link of its own and no code. In Slice 1 it then has a Close button and a Sign out button (see save-exit-sign-out); Slice 2 also offers the separate hand-off to someone else. Rewritten 2026-10-28 (Ryan) because the one-time-code screen is gone and the Invitations PRD uses ODIN sign-in; before that the line said to come back with the link in the email and a code.",
      "tradeoff": "The line points to the link in the welcome email, which Ryan chose on 2026-11-04 although nobody has confirmed it is how returning users sign in (a bookmark or an ODIN address may be the real route). An applicant who deleted the email has no other pointer. The 7 days on the Slice 2 hand-off link is our own assumption; the magic link spike does not cover hand-off links at all, so whether they exist and how they work is a question for the team.",
      "by": "Ryan",
      "when": "2026-10-07"
    },
    {
      "id": "reopen-lands-on-status",
      "area": "Status",
      "where": "Reopened link",
      "t": "A reopened link lands wherever the application has got to",
      "b": "After the code, someone who opens the link again goes straight to where things stand: back to the step they left with a green “Welcome back. Your answers are saved.” toast, or to the page for Under review, More info needed or Approved. It never lands on a locked form, and there is no extra banner saying the application was already sent. The time on the Under review page (“usually within 2 hours”) stays, because many applications are decided quickly.",
      "tradeoff": "That time is sample copy and the spike does not cover review, so ops need to confirm it. In the prototype a returning visit loads the sample business and a made-up submission time; the real page would read the applicant's own saved answers and the current outcome.",
      "by": "Ryan",
      "when": "2026-10-07"
    },
    {
      "id": "back-button-white",
      "area": "Layout",
      "where": "Every step · Back",
      "t": "Back has a white fill",
      "b": "Back is an outlined button on a white background, like Get help, instead of a transparent one, so it reads as a button on the grey page.",
      "tradeoff": "It now has the same weight as the other outlined buttons, but the purple Save and continue is still the only filled one, so the way forward stays the most prominent.",
      "by": "Ryan",
      "when": "2026-10-07"
    },
    {
      "id": "three-months-statements",
      "area": "Step 6",
      "where": "Step 6 · Processing statements",
      "t": "Ask for the last 3 months of processing statements",
      "b": "When someone says they have processed cards before, step 6 asks for their last 3 months of processing statements from the prior processor, not one recent one. The hint says they help us judge risk. Three months gives the risk team more to go on than a single month.",
      "tradeoff": "Whether three months is what the risk team needs, and in what format, is not confirmed. The row is still one upload, so someone with three separate files has no way to add them as three; the real product would need to take several files. Someone who has never processed cards is not asked, because they have no statements to give. Update, 2026-11-11: the line about the row being a single upload is no longer true. Every document row now takes any number of files (see document-add-file-grid), so three separate statements can be added. Ryan spotted it.",
      "by": "Ryan",
      "when": "2026-10-07"
    },
    {
      "id": "approved-says-approved",
      "area": "Status",
      "where": "Approved",
      "t": "The approved page says the application is approved, not that payments are live",
      "b": "The heading and the line under it now say the application has been approved and point to what can be set up next: inviting the team and ordering card readers. They no longer say the account is live or that a card payment can be taken right now, because that is not strictly true yet.",
      "tradeoff": "The Take a test payment and Open payments dashboard buttons, the “First payout: next business day” figure and the line “These need a live account” still imply the account works. They are left until it is decided what is true at the moment of approval.",
      "by": "Ryan",
      "when": "2026-10-07"
    },
    {
      "id": "autosave-tell",
      "area": "Flow",
      "where": "Left progress column · footer",
      "t": "Progress saves after every field, and the flow now says so in two places",
      "b": "Ops confirmed the real build autosaves on every field entry, with no action needed to keep it. The footer button, previously “Save and finish later”, became “Finish later” since it no longer described a save action, and is now the Save & Exit button in the top bar (decision top-nav-save-exit). The “N steps to go” line in the left progress column is replaced with a live Saved / Saving… tell (check icon when saved, a small spinner while saving, text only, no badge background) that switches to “Saving…” for about a second whenever an edit is committed (a field is left with a new value, or a checkbox, radio or select changes) and then returns to “Saved”, since a real save may take around a second, so the applicant has a constant, always-visible answer to “is this saved” without opening the save dialog. “Saved” stays green; “Saving…” is the same neutral grey as the rest of the line. The “About N minutes left” estimate stays, vertically centered with the tell, with a “·” between them as before.",
      "tradeoff": "The step count disappears from that line; it is still readable from the left-hand step list and the “Step N of 7” eyebrow at the top of the page, so nothing is lost, but someone scanning only the progress-note line loses the step count at a glance. A first pass put “Saved” in a filled green badge; Ryan found it too bright and it was reverted to plain coloured text.",
      "by": "Ryan",
      "when": "2026-10-08"
    },
    {
      "id": "website-https",
      "area": "Flow",
      "where": "Business details",
      "t": "A website typed without https:// gets it added quietly",
      "b": "When the applicant leaves the website field, a value with no scheme (for example “riversidepilates.com”) becomes “https://riversidepilates.com” with no message. Anything already starting with a scheme is left alone, and the field stays optional. The persona test that prompted this typed a bare address and saw nothing happen.",
      "tradeoff": "The field now shows a longer string than the person typed. A site that only serves plain http would be given a link that may not open; we assume https is the safe default.",
      "by": "Ryan",
      "when": "2026-10-12"
    },
    {
      "id": "no-optional-tag",
      "area": "Flow",
      "where": "Form fields · callouts",
      "t": "No “Optional” tag on fields; callouts use the default radius",
      "b": "The small “Optional” tag beside optional field labels is gone. A required field still carries the red asterisk, so a field without one is optional, which is enough for now. Field hints that say “skip this” are unchanged. The callout corners drop from the large radius (12px) to the default radius (8px, radius/default) in the same pass.",
      "tradeoff": "Nothing now says outright that a field can be skipped, so someone scanning for the optional ones relies on noticing the missing asterisk. Atlas rule 4 gives surfaces containing other components the large radius; callouts now use default as a designer call rather than that rule.",
      "by": "Ryan",
      "when": "2026-10-13"
    },
    {
      "id": "atlas-sync-2",
      "area": "Flow",
      "where": "Whole flow",
      "t": "Atlas tweaks synced: 14px large controls, 16px button icons, lighter button bevel",
      "b": "Synced to the Atlas token repo after the designer's tweaks. Large controls now use the default control text (14px, not 16px, Atlas 0048), so a large button's label matches a medium one and only height and padding differ. Icons inside buttons are 16px at every size. The primary and secondary button bevel is lighter (inset highlight 15% white, inset shade 8% black), and the input border stays neutral/400. Values come from the regenerated tokens/atlas.css, so rerun tools/build-atlas-tokens.mjs after any Atlas change.",
      "tradeoff": "The prototype follows the Atlas repo as it stood on the branch with the shadow change, not the Figma file directly. A few Figma token renames (for example the input focus glow and the pressed colour on the primary button) may not be in the repo yet, and the prototype will need a mapping update once they are exported.",
      "by": "Ryan",
      "when": "2026-10-13"
    },
    {
      "id": "atlas-adoption",
      "area": "Flow",
      "where": "Whole flow",
      "t": "The flow is built on the Atlas design system tokens and components",
      "b": "The prototype now runs on the Atlas design system instead of its own Apollo token copy. Colour, type, radius, spacing, shadow, focus and motion come from Atlas tokens (Xplor Pay brand, light), generated into tokens/atlas.css by tools/build-atlas-tokens.mjs from the Atlas token repo. Where Atlas has a component the prototype is re-skinned to it: Button (primary, secondary, tertiary at the Atlas sizes), Text field (border and glow focus), Checkbox (16px box in a 24px target, offset focus ring), Callout (info is a calm grey, severity carried by icon and text), Badge, Toast (neutral surface, severity bar), Menu items, popovers and dialogs (radius large, Atlas elevation) and a Yes / No pair drawn as the Segmented control. Where Atlas has no component yet the existing prototype pattern stays, bound to Atlas tokens: the left progress rail, owner cards, document rows, billing statement preview and the timeline. The “What happens next” panel moved from the dark deep-space fill to a light sunken surface so it stays quiet next to the signature.",
      "tradeoff": "This is a visual match built in plain CSS, not the real MUI components, so details such as keyboard behaviour, focus handling and exact spacing can differ from Odin. Button heights follow Atlas (Large 40, Medium 32), so the old 44 and 48 pixel buttons are smaller. The dark approved-page card still uses the Xplor deep-space colour, which has no Atlas semantic token. The mock app shell, prototype controls and design-decision pins keep their own styling because they are not product UI. The Atlas Progress bar page still uses old token names, so the progress meter is Atlas-coloured but not built from that component.",
      "by": "Ryan",
      "when": "2026-10-13"
    },
    {
      "id": "signatory-title-fallback",
      "area": "Flow",
      "where": "Step 7 · Sign it off",
      "t": "Signatory title fills from the first owner even when added with the plain button",
      "b": "The step 7 signatory title now fills from the first owner's title when no owner is marked as the applicant, the same way the signatory name already follows the first owner. An owner added with the plain “Add an owner or director” button therefore carries their title (“Director” until edited) into step 7 instead of leaving the field empty; “Add myself” is unchanged and still gives “Owner / CEO”. Update, 2026-11-11: the Sign it off card is now at the end of step 6, not step 7 (sign-on-step-6). The fallback behaves the same. Update, 2026-11-11 (later): the Sign it off card is back at the end of step 7, as the last thing before Submit (sign-back-on-step-7); where this entry says step 6, read step 7.",
      "tradeoff": "The default “Director” is a placeholder, not a fact: a signer who is the owner must still change it, and it is now prefilled where before it forced a deliberate entry. The field stays editable and required.",
      "by": "Ryan",
      "when": "2026-10-12"
    },
    {
      "id": "final-step-focus",
      "area": "Flow",
      "where": "Step 7 · Review and sign",
      "t": "Final step drops the rates tick and collapses “What happens next”",
      "b": "Rates and the fee schedule are already agreed before this flow starts, so the final step no longer asks for an “I accept the rates and fee schedule” tick. “What happens next” below the signature is now a collapsed bar that opens on click, so nothing competes with signing, which is the one action that matters on this step. Update, 2026-11-11: signing moved to step 6 (sign-on-step-6). The final step is now Review and submit, with the summary and the collapsed What happens next bar. Update, 2026-11-11 (later): the Sign it off card is back at the end of step 7, as the last thing before Submit (sign-back-on-step-7); where this entry says step 6, read step 7.",
      "tradeoff": "Applicants who would have used the rates line to double-check pricing now have to find it elsewhere; the fee schedule is still reachable from the agreement link. The three-step “what happens next” reassurance is one click further away, so some may submit without reading it.",
      "by": "Ryan",
      "when": "2026-10-12"
    },
    {
      "id": "approved-add-merchant",
      "area": "Status",
      "where": "Approved",
      "t": "Approved page's main CTA is \"Add a merchant\", not \"Take a test payment\"",
      "b": "Being approved only clears the business to use Xplor Pay; it still has no merchant set up to take a transaction against, so nothing can be sold until one exists. The primary (white) button on the approved card is now “Add a merchant” and the paragraph above it says so before mentioning the team invite and card readers, since this is the step that actually unblocks transacting.",
      "tradeoff": "There's no merchant-creation flow behind the button yet (it's prototype-only, like the rest of this screen), and the “Merchant ID” stat tile a few lines down still labels the business's own id as a merchant id, which now reads oddly next to a button telling the applicant to go add one. Left as is; worth a pass once merchant creation is designed.",
      "by": "Ryan",
      "when": "2026-10-08"
    },
    {
      "id": "no-jump-bar",
      "area": "Status",
      "where": "Submitted · Under review · Approved",
      "t": "The status screens have no jump bar; the Prototype options menu is the only way to move between them",
      "b": "The \"Prototype · jump to\" bar that sat at the bottom of the under review, More info needed and approved screens is gone (it was first built in the page content, then pinned to the bottom of the window). These screens now show only the product. To reach a status screen, use Link opened as in the Prototype options menu; changing any option there restarts the flow.",
      "tradeoff": "Moving between statuses takes a trip into Prototype options and the flow restarts each time, which is slower for a demo than one click. The bar's Restart flow button is gone too; any change in Prototype options restarts the flow instead.",
      "by": "Ryan",
      "when": "2026-11-04"
    },
    {
      "id": "secondary-button-no-bevel",
      "area": "Flow",
      "where": "Whole flow · Secondary buttons",
      "t": "Secondary buttons lose the inner bevel and keep only the soft drop shadow",
      "b": "Following the designer's Atlas update, secondary (outlined) buttons such as Back, Get help, Send them a link and Look up no longer have the inset white and black bevel. They keep the one-pixel cast shadow under the border. Primary buttons keep the full bevel. The owner card Remove button also gets a trash-can icon in place of the cross.",
      "tradeoff": "The value is copied by hand into app.css (the Atlas repo clone only has the combined button shadow, not the split inner and outer tokens), so it will drift if Atlas changes the cast shadow.",
      "by": "Ryan",
      "when": "2026-10-13"
    },
    {
      "id": "no-id-verified-labels",
      "area": "Flow",
      "where": "Step 2 · Owner cards · Submitted screen",
      "t": "Nothing in the flow says an ID is verified",
      "b": "The green “ID verified” badge on an owner card is removed, along with every other place that said an owner's ID was verified: the ownership note (“N of M owners have verified their ID”), the review row, and the submitted screen's tick line. No step verifies an ID: the applicant only types the details at step 2 and adds the file at step 6, and checking happens after submitting. The submitted screen now says what is true: “Your own ID is the only one to check”, “Every ID is in and being checked”, or how many IDs are in. The sample business no longer has a pre-verified owner.",
      "tradeoff": "A returning applicant gets no sign that any check has finished. If real verification results ever come back before approval, a status like this would need to return, driven by real data.",
      "by": "Ryan",
      "when": "2026-10-13"
    },
    {
      "id": "input-border-neutral-300",
      "area": "Flow",
      "where": "Whole flow · Text fields and selects",
      "t": "Field borders are one step lighter again (neutral/300) and so is their hover, and the agreement no longer says “verified bank account”",
      "b": "The resting border of text fields and selects moves from neutral/400 to neutral/300 (#DDDDE3), at the designer's request, in Figma (`color/border/input`, Light), in the Atlas token repo (branch chore/border-input-neutral-300, not yet pushed) and in the prototype's regenerated tokens. The hover border of a field is one step lighter too: neutral/600 instead of neutral/700, through a new Atlas token `color/border/hover` that only fields use, so checkbox and radio outlines (border/strong) keep their darker colour. Dark mode hover is unchanged. In the same pass the agreement's “1. What we provide” and “Payouts” lines say “your bank account” rather than “your verified bank account”, since nothing in the flow verifies the account.",
      "tradeoff": "About 1.3:1 against white, well under the 3:1 WCAG 2.2 target for the edge of a control. Focus, error and hover still change the border, so the state is carried, but an empty field is faint on a bright screen, and the hover is a gentler nudge than before.",
      "by": "Ryan",
      "when": "2026-10-13"
    },
    {
      "id": "yn-pills",
      "area": "Flow",
      "where": "Yes / No answers",
      "t": "Yes / No answers are two separate selectable pills, not a segmented control",
      "b": "Every Yes / No question shows two round pills side by side, Yes on the left, each with a thin light border. The chosen pill gets a 2px brand-purple ring; the other stays plain. There is no shared track behind them any more. This returns to the earlier pill look and replaces the Atlas Segmented control (and its track fill, `segmented-track-fill`), which Ryan wanted gone. Which answer each question starts on is unchanged (`yn-common-defaults`). An unanswered required question shows no error on the pills (they can never be reached in an error state, since Save and continue stays off until every question is answered); the button's hover note lists what is missing.",
      "tradeoff": "The pills are a prototype pattern, not an Atlas component, so this departs from the Atlas Segmented control and its tokens. The selected state is carried by the ring alone (no fill), so it relies on the purple against a thin grey border for contrast.",
      "by": "Ryan",
      "when": "2026-10-28"
    },
    {
      "id": "tone-of-voice-pass",
      "area": "Flow",
      "where": "Whole flow · Copy",
      "t": "Copy follows Xplor's Verbal Identity Guidelines",
      "b": "A pass through every line of applicant-facing copy against the guide: active voice, we and you, contractions, everyday words, short lines, and what happens next. Jargon (tokenized, underwriting, legal entity status), idioms (takings, sort it out, on the hook, done their bit, feel free), passive sentences and negative framing (Don't worry, can't finish until) were rewritten, and unprovable claims such as “turns days of manual review into minutes” and “your best defence” were softened. The full before-and-after list is in TONE-OF-VOICE-CHANGES.html and .csv in the project folder.",
      "tradeoff": "Legal and consent text (agreement, privacy and terms, W-9 certification, ESIGN and card-network consents) was left alone because it needs a compliance check, not a style edit. Claims that need proof (“Faster approval”, “under 2 hours”, the 2.6% + 30¢ rate, security wording, “ESIGN Act compliant”) are flagged but unchanged. Button labels and step names were kept so they match the personas and earlier decisions.",
      "by": "Ryan",
      "when": "2026-10-13"
    },
    {
      "id": "sales-intake-first",
      "area": "Flow",
      "where": "Before the merchant's link",
      "t": "The flow starts with the salesperson's account request",
      "b": "Once a deal is agreed, the salesperson who agreed it fills in one internal form (parent, account, owner, point of contact, processing, fees and payouts) before the merchant gets a link. It replaces a Google Form. It uses the same fields, cards and buttons as the merchant's flow, with no progress rail, because it is an internal tool and a person fills it in once. The merchant never sees it. The submit button stays disabled until every required answer is valid, with the same hover note as the merchant's steps. Format rules that used to live only in helper text (account ID like CE-1, the account ID in brackets in the name, fees as US dollars, the descriptor at 10 characters or fewer, a date that is today or later) are now checked as each field is left. Submitting goes straight to the merchant's code screen (no interstitial page): an earlier version showed the salesperson a 'have these documents ready' checklist (LER, W-9, bank letter, owner ID, SMAA), but those are the merchant's documents, not the salesperson's, so the page was confusing and was removed (Ryan's call, 2026-10-15). Whether and where that checklist belongs is still open.",
      "tradeoff": "The 19 category codes are a stand-in, not the real dropdown. The named contact for urgent requests is not in the source, so the hint says to contact the onboarding team. LER and SMAA are shown as written in the source and not expanded. Nothing is sent: there is no DocuSign email and no link is created, so submit goes straight into the merchant's side. Fees are US dollars only, as in the source form.",
      "by": "Ryan",
      "when": "2026-10-13"
    },
    {
      "id": "start-as-option",
      "area": "Flow",
      "where": "Prototype options",
      "t": "Choose where the prototype starts",
      "b": "A Flow starts as option in Prototype options switches where the prototype opens: the merchant's login (the default, decision login-default-start), the salesperson's form, the merchant's one-time-code link, or the sample business. The existing Link opened as and Data options still work on top of it. The address takes ?start=sales, ?start=merchant or ?start=sample; no parameter means login.",
      "tradeoff": "Any saved address that relied on an earlier default (such as ?data=sample on its own, from when the sales form opened first) now opens the login screen first. Add ?start=merchant to those, including the address the usability-testing kit tests.",
      "by": "Ryan",
      "when": "2026-10-13"
    },
    {
      "id": "login-default-start",
      "area": "Flow",
      "where": "Before the welcome page",
      "t": "The prototype now opens on a password login, not the sales form",
      "b": "The merchant's first screen is now email and password sign-in with a temporary password, forcing a password change before continuing, the same shape as a first real sign-in. It replaces the sales form as the default start. Submitting the new password lands wherever the existing Link opened as option sends it (the welcome page for a new applicant, or further into the flow for a returning one), reusing the same openLink() logic as the one-time-code screen. Neither the sales form nor the one-time-code link were deleted: both are still reachable from Prototype options > Flow starts as, alongside the new login and the sample business, the same demote-don't-delete pattern already used for Link opened as. The main button names what happens next: Continue on the credentials screen, because it only moves the merchant on to the forced password change, and Sign in on the change-password screen, because that is the step that actually signs them in. The Chrome option (standalone flow or inside the app shell) was removed from Prototype options as no longer needed, so the flow always renders standalone.",
      "tradeoff": "No real account exists in the prototype, so any email and password sign in and the password-strength check is only a client-side length and match check (8+ characters, both fields the same). Whether a merchant actually receives a temporary password by email, and how, is not covered by anything built so far and needs an ops answer before this is more than a placeholder.",
      "by": "Ryan",
      "when": "2026-10-16"
    },
    {
      "id": "sales-prefill",
      "area": "Data",
      "where": "Merchant flow after the sales form",
      "t": "What the salesperson entered starts the merchant's answers",
      "b": "The owner's name, email and phone, the trading name and the category code carry over from the sales form, so the merchant checks them instead of typing them. The owner is already listed on step 2 as the applicant (the person the link went to, so they are marked as signing for themselves). The business email and phone on step 1 are not filled from the owner, because a studio's general inbox is often a different address. The code screen shows the owner's email, masked. A country of Canada switches the merchant's flow to Canada, and the United States or Puerto Rico to the United States. Everything stays editable, on the basis that nearly all of it will be right.",
      "tradeoff": "This sets aside the earlier call that owners start empty for a company, but only when a salesperson's form came first. Ownership starts at 100% for that owner, as with Add myself. Other countries (Australia, New Zealand, UK, Mexico) leave the region unchanged because the merchant flow only covers the United States and Canada. The bank depositor descriptor is not carried over because it is a different thing from the billing descriptor on step 3. For a non-profit the owner is listed as a Director at 10%, For a sole proprietor the owner card gets the same name, email and phone, and the owner's name also fills their legal name on step 1, since they are the business. Fees, MIDs, payouts and the requested date have no matching question in the merchant flow, so they are kept for ops only.",
      "by": "Ryan",
      "when": "2026-10-13"
    },
    {
      "id": "sales-contract-upload",
      "area": "Data",
      "where": "Sales form · Fees",
      "t": "Upload the contract to fill in the fees and payouts",
      "b": "At the top of the Fees card the salesperson can upload the signed contract. It is read as it uploads (uploading, then reading it, then a green Read tag), and the fee fields and the three payout settings are filled from it, with a toast and a line under the file saying what was found and what was not. Every filled field stays editable, and the usual checks still run on them. Replace puts the file back to its starting state without clearing what was filled. It reads the fees and payouts only, because that is where the contract holds terms the salesperson would otherwise retype.",
      "tradeoff": "In the prototype nothing is read: the same made-up amounts fill in every time, with Visa, Mastercard and Discover left blank to show a read that misses things. Whether a real read can get all of this, how it shows a low-confidence value, and whether it should also fill the owner, account and processing sections are not decided. A contract read after the salesperson has typed fees overwrites them.",
      "by": "Ryan",
      "when": "2026-10-13"
    },
    {
      "id": "field-why-popover",
      "area": "Fields",
      "where": "Step 2 · Government ID number and SSN / SIN, and the photo ID upload in step 6",
      "t": "Why we ask sits behind a question icon on the encrypted fields",
      "b": "The Why we ask sentence that ran as hint text under the encrypted ID number and SSN or SIN fields is now a small question icon and Why we ask label under the field. Hovering or focusing it opens a popover with the same text, the same pattern as the Why we ask note at the top of each step, but with the text at body-small size. Escape closes it. The field builder takes a why option, so any other field can use it later.",
      "tradeoff": "The reason is no longer visible without hovering, so someone who never hovers will not read it. On a touch device it opens on tap.",
      "by": "Ryan",
      "when": "2026-10-19"
    },
    {
      "id": "existing-user-new-business",
      "area": "Flow",
      "where": "Prototype options · Flow starts as; email and business picker",
      "t": "An existing user onboarding a new business skips the password and picks a business",
      "b": "A new Flow starts as option, Existing user: new business email, then choose business, covers someone who already has an account on the platform and is onboarding a separate business. They get the existing-user email (no temporary password, no forced password change), and pressing Sign in goes straight to a simple screen asking which business to sign in with. Choosing a business only selects it (a radio card, nothing is chosen at first); a Continue button, disabled until a business is selected, confirms the choice, so a stray click never signs anyone in. Riverside Pilates, marked with a green New application badge, goes into the normal onboarding flow and follows the Link opened as option like any other entry; Harbor Yoga Studio, the one they already have, shows a prototype-only toast saying its dashboard is not part of the prototype. The address takes ?start=existing.",
      "tradeoff": "Pressing Sign in on the email skips a sign-in screen entirely, on the basis that the real sign-in happens in ODIN outside the prototype; if the sign-in itself should be shown, it needs adding between the email and the picker. The business names are made up, and the existing business only shows a toast, so nobody can test what happens when someone signs in to it. The extra Continue click adds one step for the common case of one business needing work (2026-10-23, Ryan: confirm the selection instead of signing in on click; 2026-10-28, Ryan: the button reads Continue, not Sign in, and the New application badge is green). The email is the existing-user template in the email folder, drawn again in the prototype, so the two need updating together.",
      "by": "Ryan",
      "when": "2026-10-22"
    },
    {
      "id": "welcome-email-first",
      "area": "Flow",
      "where": "First screen, before sign-in",
      "t": "The prototype starts with the welcome email",
      "b": "The prototype now opens on the email a new merchant gets from Xplor Pay: Welcome to Xplor Pay, their username and a temporary password, a Sign in button and three next steps, shown inside a simple inbox frame. Pressing Sign in goes to the sign-in screen, which then asks for the password change as before. The email mirrors the real HTML template in the email folder, so the story the prototype tells is the one the merchant would live. Flow starts as now reads Merchant: welcome email, then login. The username and password in the email are made-up demo values.",
      "tradeoff": "The email is a drawing, not the real template, so the two can drift apart and need updating together. The sign-in screen does not read the username or password from the email, so any email and password still works. The email uses Roboto Bold for headings because Poppins is not loaded in the prototype, so it looks slightly different from the real template.",
      "by": "Ryan",
      "when": "2026-10-21"
    },
    {
      "id": "yn-common-defaults",
      "area": "Fields",
      "where": "Every Yes / No control; step 6 uploaded files",
      "t": "No Yes / No question starts answered, and uploads lose the green read-back",
      "b": "Every Yes / No control starts with neither pill chosen, so the applicant has to pick Yes or No on each one on purpose. This covers: is the trading address the same (step 1), will you sign yourself and is each owner a politically exposed person (step 2), recurring billing, free trial, payments on behalf of others, selling outside the country and accepted card payments before (step 3), and legal proceedings, a terminated merchant account, tax liens or judgments and money service business (step 5). Until each is answered, Save and continue stays off and the question shows Choose yes or no. once the applicant has left it. The sample business (Fields start as: Sample business) still arrives with all of them answered. The green read-back line that appeared under an uploaded file on step 6 (Read: name, matches step 2) is removed; the file name and Replace stay. History: on 2026-10-21 every question started on its most common answer; Ryan reversed that on 2026-10-28.",
      "tradeoff": "About a dozen more clicks on a first run (more with extra owners), and a person can no longer sail through on defaults. That is the point: a compliance answer such as legal proceedings, a terminated account, tax liens or money service business can no longer be passed over unread, and a wrong No is something the applicant chose. Without the read-back the applicant no longer sees what the system took from the file, so a wrong read goes unnoticed.",
      "by": "Ryan",
      "when": "2026-10-28"
    },
    {
      "id": "yes-first-defaults",
      "area": "Fields",
      "where": "Every Yes / No control; encrypted fields",
      "t": "Every Yes / No puts Yes on the left, and encrypted fields lose the purple border",
      "b": "Every Yes / No question puts Yes on the left and No on the right. (On 2026-10-21 three of them also started answered; that is superseded, see yn-common-defaults: none starts answered now.) The purple border that marked the encrypted fields (ID number, SSN or SIN, account numbers) is gone; they now have the same grey border as every other field, and the lock icon and Encrypted tag still mark them.",
      "tradeoff": "Without the purple border an encrypted field looks like any other field until the lock and tag are noticed.",
      "by": "Ryan",
      "when": "2026-10-21"
    },
    {
      "id": "sales-form-removed",
      "area": "Flow",
      "where": "Prototype options · Flow starts as",
      "t": "The internal sales form is removed from the prototype",
      "b": "The internal salesperson form is gone from the prototype: the screen, its Prototype options entry (Flow starts as no longer offers Sales person), the ?start=sales address and the code that carried the salesperson's answers into the merchant's side (owner, trading name, category, masked email on the code screen, contract upload and the sales fee fields). Flow starts as now offers the merchant login (default), the one-time-code link and the sample business. An old ?start=sales address opens the login instead. Decisions sales-intake-first, sales-prefill and sales-contract-upload stay in the register as history but no longer describe anything in the prototype.",
      "tradeoff": "Nothing in the prototype now shows how a deal reaches the merchant, so the merchant's login and the one-time-code screen start cold with no prefilled answers. The code screen's masked email is a fixed placeholder again. The deploy/ site and usability-kit-share copy only change when next deployed or re-synced.",
      "by": "Ryan",
      "when": "2026-10-21"
    },
    {
      "id": "static-cards-flat",
      "area": "Visual",
      "where": "All non-clickable cards",
      "t": "Cards that aren't clickable sit almost flat",
      "b": "Cards that can't be clicked (the main surface cards, owner cards, the review summary, the status hero card, document rows and the what-you-need panel) now carry almost no drop shadow, down from the Atlas xs elevation to a 1px faint contact line, so the 1px border does the work of separating them from the page. Anything clickable keeps its shadow and hover treatment: buttons, the business-type radio cards, the Yes / No control. The shadow is one variable, --lift-static in app.css, so it can be nudged in one place.",
      "tradeoff": "With less shadow the cards sit flatter on the page, so the page leans more on the border and the white-on-grey contrast to separate them. If that looks too flat on a bright screen, raise --lift-static a notch rather than going back to the old value.",
      "by": "Ryan",
      "when": "2026-10-21"
    },
    {
      "id": "approved-welcome",
      "area": "Status",
      "where": "Approved page",
      "t": "Approval is a welcome to Xplor Pay, with one way in: the dashboard",
      "b": "The approved page is the first thing a new business sees as a customer, so it now opens with Welcome to Xplor Pay, and the tag above it names the business and how fast it was approved. The description is unchanged. Add a merchant is gone as a button because it is the first thing they do once they are inside the dashboard, so Open payments dashboard is the single primary button. The four cards under the main card (Merchant ID, Payouts to, Descriptor, First payout) are removed. The main card's background moves from flat deep space to a gradient from deep space into the Xplor Pay purple.",
      "tradeoff": "The Merchant ID, payout account, descriptor and first payout timing no longer appear on this page, so the dashboard has to show them. Add a merchant is now only mentioned in the description, with nothing on this page to click for it. The Open payments dashboard button does nothing in the prototype.",
      "by": "Ryan",
      "when": "2026-10-19"
    },
    {
      "id": "status-screens-polish",
      "area": "Status",
      "where": "Step 7, the under-review screen and the more-info page",
      "t": "Status screens: white What happens next, no ID-arrived line, devices to order, a page heading on more info",
      "b": "The What happens next panel on step 7 is now white (the raised surface, same as cards) so it stands out from the page instead of sinking into it. On the under-review screen the checks line no longer ends with the owner ID status (Your ID arrived, or a name's ID arrived), because the owner cards below already say who the application is waiting on. The something-to-do-while-you-wait tile now suggests ordering payment devices rather than setting up prices. The more-info page used to open on a warning callout; it now opens with a heading, One thing to fix, and the reassurance that the applicant is not back at the start sits under it as the lede. The secondary button reads Email us instead of Have a chat about it. Changed on 2026-10-22: the two cards under the confirmation, including this one, were removed (decision submitted-no-extra-cards).",
      "tradeoff": "The ID status is gone from the timeline, so the only place it shows is the owner cards for people still invited. The Order your payment devices button does nothing in the prototype, and Email us only shows a prototype toast. Losing the warning colour makes the page calmer, but it no longer signals that something needs action except through the heading and the upload button.",
      "by": "Ryan",
      "when": "2026-10-19"
    },
    {
      "id": "owner-actions-menu",
      "slice": "2",
      "area": "Step 2",
      "where": "Step 2, each owner card",
      "t": "Owner card actions move into a three-dot menu",
      "b": "The owner card header was filling up with Send them a link, Remove and Open. Now the one shortcut that matters stays on show while the owner has not been invited (Send invite, or Send a new invite after access was removed), and everything else sits in a three-dot menu at the far right of the card, after Open or Collapse. What the menu offers depends on the owner: not invited, only Remove owner; invited and not yet signed in, Resend invite, Change email, Cancel invite, then Remove owner; signed in, Remove access, then Remove owner. Remove owner is last, below a divider, in red with a trash icon. Change email reopens the invite dialog with the address filled in and sends a fresh invite. Cancel invite, Resend invite and Change email act straight away with a toast. A sole proprietor has no menu, since there is no one to remove. The menu closes on a click outside, on Escape or when an item is chosen.",
      "tradeoff": "A menu hides Remove, which used to be one click away, behind a second click. A not-invited owner's menu holds only Remove owner, so for them it is a one-item menu kept for a steady layout. The dialog's body text and the seven-day note still describe a link; they are due a rewrite for the sign-in model in the PRD (Invitations and delegation, FR-05).",
      "by": "Ryan",
      "when": "2026-10-21"
    },
    {
      "id": "remove-access-vs-owner",
      "slice": "2",
      "area": "Step 2",
      "where": "Step 2, owner card menu",
      "t": "Remove access and Remove owner are different things, and the second asks first once the person has signed in",
      "b": "Following the PRD (FR-07), taking someone's access away does not delete what they entered. Remove access, offered once the invited person has signed in, opens a dialog: Remove Dana's access? They won't be able to sign in. What they already entered stays, and you can fill in the rest yourself. The card then reads Access removed, becomes an ordinary card the applicant fills in, and offers Send a new invite. Before they have signed in, the same step is called Cancel invite, needs no dialog (nothing is lost) and returns the card to not invited. Remove owner takes the person off the application, ends their access and deletes what they entered. If they have signed in it asks first (Remove Dana and everything they entered?, saying it cannot be undone); if they have not, it removes at once with a toast, as before.",
      "tradeoff": "Two removal actions with different outcomes ask the applicant to hold a distinction in their head, and the PRD does not say whether Remove owner should keep the typed data, so deleting it is our assumption. Cancel invite has no undo. The dialog is the only warning that a signed-in person's work is lost on Remove owner.",
      "by": "Ryan",
      "when": "2026-10-21"
    },
    {
      "id": "invite-states",
      "slice": "2",
      "area": "Step 2",
      "where": "Step 2, owner card and Prototype options",
      "t": "An invited owner is Invited, Signed in, Details received or Access removed",
      "b": "The PRD (FR-05) says the applicant sees who they invited and whether they have signed in. The card pill now has four states: Invited (amber, clock, with the email) until the person signs in; Signed in (grey, user icon, with the email) once they have; Details received (green, check, with the time) once they press Send my details on their own screens; and Access removed (grey) after the applicant removed their access. Signed in shows no time, to keep it from going stale. Details received was taken out for a while on the assumption that an invited person had the whole form, then brought back when invitees were kept to their own card and ID (decision invitee-own-card-only), where finishing is a real moment. Cancelling or re-sending an invite resets it. Needs a look stays on the applicant's own view of the card and is not shown to the invited person, who sees their own field errors inline. In Prototype options, Preview what Dana sees is now Sign in as Dana, which opens their side and flips the card to Signed in; finishing there flips it to Details received.",
      "tradeoff": "Details received does not mean the invited person's part passes the checks: step 6 and 7 still wait on their card and ID, so the pill can say received while the hover note still says Waiting on them. The invitee's own screens (landing, their card and ID, thank-you, and the Send my details button) still open from a link rather than a sign-in, and nothing on them sets a temporary password; they need rewording for the sign-in model. Signed in and Details received are set by prototype controls; in the product they come from a real sign-in and a real submit.",
      "by": "Ryan",
      "when": "2026-10-21"
    },
    {
      "id": "invite-no-exemption",
      "slice": "2",
      "area": "Step 2",
      "where": "Steps 2, 6 and 7, owner card",
      "t": "Inviting an owner no longer excuses their details; steps 6 and 7 wait for them",
      "b": "Until now an invited owner was exempt from every check: step 2 skipped their fields, step 6 dropped their ID row, and the 75% rule was waived, so an invite that was never answered could be submitted with an empty owner. The PRD says what an invited person enters counts toward the application and that, if they never respond, the applicant fills it in. So: step 2 still lets the applicant continue while an invited owner is incomplete (they can carry on in the meantime), but steps 6 and 7 do not pass until that owner's details are in, and their photo ID row is back in step 6, with the hint that they can add it or the applicant can. The disabled-button hover note names who is missing (Waiting on Dana: their details, photo ID) and ends with a line pointing at the card: Fill it in yourself on the Owners step, or remove their access. Opening an invited owner's card shows the line Dana has been invited. Anything you add here counts toward the application. The step list note Waiting on one owner's details shows only while an invited owner's details or ID are still missing. After submit nobody can be owed, so the confirmation's waiting-on cards and nudge wording no longer appear.",
      "tradeoff": "An unanswered invite can now hold the whole application at step 6 until the applicant fills the card in or removes access, where before it never did. This supersedes the waiting-on wording in the earlier confirmation-ID-tile decision. Two people may edit the same card; the PRD says the last save wins for a step, which the prototype does not model yet (open question).",
      "by": "Ryan",
      "when": "2026-10-21"
    },
    {
      "id": "invite-email-change",
      "slice": "2",
      "area": "Step 2",
      "where": "Step 2, owner card menu",
      "t": "A wrong invite email can be changed until the person signs in",
      "b": "The PRD only covers Ops correcting the business contact's email (FR-03); it says nothing about an invited person's address. Change email is in the card menu only while the invite is unanswered. It reopens the invite dialog with the address filled in (Update and resend) and the old invite stops working, with a toast saying so. Once the person has signed in the menu has no Change email: if the address was wrong, the applicant removes access and sends a new invite.",
      "tradeoff": "Someone who mistyped an address and was never signed in is covered, but a person who signed in with the wrong account has to be removed and invited again, which loses nothing they entered because Remove access keeps it. Whether the real product can revoke an unanswered temporary password when the address changes is for engineering to confirm.",
      "by": "Ryan",
      "when": "2026-10-21"
    },
    {
      "id": "concurrent-edit-notice",
      "slice": "2",
      "area": "Steps 2 and 6",
      "where": "Top of step 2 and step 6, under the description",
      "t": "If an invited person saved their details while the applicant is on the step, a note says so",
      "b": "The PRD (Invitations and delegation, failure cases) says that when two people edit the same step the last save wins at the step level. An invited person only sees their own owner card and photo ID (decision invitee-own-card-only), so the only place two people can collide is that card on step 2 and that ID on step 6. There a grey note sits under the step description: Marcus J. Lee updated their details at 9:12 AM. You're seeing their latest answers. It blocks nothing, asks nothing of the applicant, and goes once they leave the step. There is no live presence indicator and no keep-mine-or-theirs choice. In Prototype options, Simulate: Marcus edits their details shows the note on those two steps, since the prototype has no second person.",
      "tradeoff": "The note says an edit happened but not what changed, so an applicant who typed over the invited person's answer cannot tell which one survived. It clears once the step is left, so the prototype cannot show the realistic case of an edit made while the applicant was on another step. The note is shown to the applicant only; the invited person's own screens do not yet say when the applicant changed their card. Last save wins is the PRD's rule, not a finding that it is the right one.",
      "by": "Ryan",
      "when": "2026-10-21"
    },
    {
      "id": "invite-owners-only",
      "slice": "2",
      "area": "Step 2",
      "where": "Step 2, owner cards",
      "t": "Only owners can be invited, for now",
      "b": "The PRD (Invitations and delegation, FR-05) lets the business contact invite anyone to help fill in the form, such as a bookkeeper. The prototype keeps invites on owner cards only, as it is today. There is no separate Invite someone to help button and no helper list, so a person who is not an owner cannot be invited from the application.",
      "tradeoff": "This is narrower than the PRD. A bookkeeper or assistant can only be brought in by being listed as an owner, which would wrongly count them toward ownership and ask for their photo ID, or by sharing the applicant's own sign-in, which the PRD does not allow. The save dialog's hand-off link also stays as it is, still described as a link. Ryan chose this on 2026-10-21 to keep scope down; revisit if non-owner helpers turn out to be common.",
      "by": "Ryan",
      "when": "2026-10-21"
    },
    {
      "id": "invitee-own-card-only",
      "slice": "2",
      "area": "Step 2",
      "where": "What an invited owner sees",
      "t": "An invited owner sees only their own card and photo ID, not the whole application",
      "b": "The PRD (Invitations and delegation, FR-06) says an invited user sees the same onboarding form as the business contact. We chose not to follow that. An invited owner signs in and sees only their own owner card and their own photo ID, as the prototype's recipient screens already do: no other owner's details, no bank account, no tax number and no signing step. Because they never reach step 7, the question of who may sign and submit does not arise for them. The applicant still fills in the rest, can fill in an invited owner's card themselves (decision invite-no-exemption), and is the only person who signs and submits.",
      "tradeoff": "This departs from FR-06 and from the single onboarding-only system role the PRD assumes (create:application), so it needs raising with the PRD owner (Gaurav Pimputkar, Tachyon) and with engineering: showing one card and one document to an invited user is a finer permission than a system role gives. It does protect other owners' personal details and the business's bank and tax details from anyone who was only asked for their own ID. If the role cannot be narrowed, the choice is back to the full form, which brings the signing question with it.",
      "by": "Ryan",
      "when": "2026-10-21"
    },
    {
      "id": "approval-access-business-contact",
      "slice": "2",
      "area": "Status",
      "where": "Approved page, and what happens to invited owners",
      "t": "On approval only the business contact gets full access; invited owners lose theirs",
      "b": "The PRD (Invitations and delegation, FR-09) gives the business contact and everyone they invited full business access on approval. We chose the narrower route: only the business contact is moved to full access. An invited owner's access was only ever for their own card and photo ID (decision invitee-own-card-only), and it ends when the application is approved. Anyone who should work in the business afterwards is invited from the approved page's Invite your team, as any new person would be. The prototype shows nothing new for this: the approved page and its Invite your team tile are unchanged.",
      "tradeoff": "This departs from FR-09. An owner who helped fill in the form may expect to keep their sign-in and finds it no longer works at approval, and nothing in the prototype tells them. The business contact has to re-invite them, which asks for the same details again. The choice does keep a person who was only asked for their own ID from receiving the business's bank and tax details the moment approval lands. It needs raising with the PRD owner (Gaurav Pimputkar, Tachyon) and with engineering, together with decision invitee-own-card-only. The approved page could warn the business contact that invited owners lose access, but nothing asked for that.",
      "by": "Ryan",
      "when": "2026-10-21"
    },
    {
      "id": "invite-email-checks",
      "slice": "2",
      "area": "Step 2",
      "where": "Step 2, invite dialog",
      "t": "The invite dialog refuses the applicant's own email and an address already invited for another owner",
      "b": "Besides the format check, the invite dialog now stops two cases, on leaving the field and on Send invite. The applicant's own email (the business email from step 1, or the email on the owner marked as them) reads: That's your own email. Use Add myself as an owner instead. An address already invited for another owner reads: That address is already invited for another owner. Both checks ignore capital letters. Changing an invite's email to its own current address is allowed. A mistyped but well-formed address is not caught: Change email is the fix. Whether the address already belongs to an ODIN user at another business is not checked, because the prototype cannot know and the PRD does not say.",
      "tradeoff": "Open question for the PRD owner and engineering: when the invited address already has an ODIN user, does the onboarding-only access attach to that user, is the invite refused, or is a second user created. Until that is answered the real product's behaviour is unknown. The own-email check can only see the addresses the applicant has typed in this application, not the address they signed in with, so a different address for the same person gets through.",
      "by": "Ryan",
      "when": "2026-10-21"
    },
    {
      "id": "slices-option",
      "area": "Flow",
      "where": "Prototype options · Slice",
      "t": "The prototype has two slices, chosen in Prototype options, and Slice 1 is the default",
      "b": "A Slice option sits at the top of Prototype options (address ?slice=2 for the second; no parameter means Slice 1). Slice 1 is one person from start to finish, with no way to invite or hand over to anyone else, and it is what opens by default. Slice 2 is the build we already had, where an owner can be invited to fill in their own details, kept whole as a later release. It is one codebase, not two copies: anything that changes both slices is changed once, and anything that belongs to one slice only sits behind the slice check, so the other slice does not move. Decisions that only apply to one slice carry a Slice 1 only or Slice 2 only tag in the list of decisions (Read all). Changing the slice resets the prototype to its start.",
      "tradeoff": "Because it is one codebase, a change to a shared screen reaches both slices whether or not it was meant to, so every edit has to be placed deliberately. Persona tests run against Slice 1 unless the address ends in ?slice=2.",
      "by": "Ryan",
      "when": "2026-10-22"
    },
    {
      "id": "slice-1-single-user",
      "slice": "1",
      "area": "Flow",
      "where": "Welcome, step 2, save dialog, confirmation, Prototype options",
      "t": "In Slice 1 one person fills in everything: nobody can be invited and nothing is handed to someone else",
      "b": "Slice 1 takes out every way of sending the application to another person. Gone: the Send invite button and the invite dialog, the owner card menu (replaced by a plain Remove button with a trash icon, since the menu would hold one item), the Invited, Signed in, Details received and Access removed states, the note about a person editing at the same time, the rail note about waiting on an owner, the hand-off link in the Finish later dialog (which keeps its first line about coming back with the link in the email, and gains a Close button), the Owner links controls in Prototype options, and the wording that offers to send an owner a link on the welcome page and step 2. The applicant types in every owner's details and uploads every owner's photo ID, as steps 6 and 7 already require. The confirmation always says nothing is waiting on anyone else, and when there is more than one owner it says the applicant added every owner's details and ID.",
      "tradeoff": "The applicant has to have each owner's date of birth, home address, ID number and a photo of their ID to hand. Where an owner is not around, the applicant is stuck until they are, which is the cost of leaving invites for Slice 2. Left as they were because they are not about sending the application to another person: the approved page's Invite your team tile and wording (access to the account after approval).",
      "by": "Ryan",
      "when": "2026-10-22"
    },
    {
      "id": "slice-1-approved-card-only",
      "slice": "1",
      "area": "Flow",
      "where": "Approved page",
      "t": "In Slice 1 the approved page is the welcome card and nothing else",
      "b": "Once the application is approved, Slice 1 shows only the main card: the approved tag, Welcome to Xplor Pay, a sentence that sends the applicant to the payments dashboard to get started, and one button, Open payments dashboard. There used to be a quieter second button, Get help adding users, that opened the Talk to a person dialog; it was removed on 2026-11-04 (Ryan) because the dashboard is where users are added and the sentence already says so. The Now that you're approved section, with its Invite your team and Order card readers tiles, is left out. Inviting more people happens inside ODIN after approval, so the onboarding flow does not offer it; the sentence says users can be added from the dashboard. Slice 2 keeps the two tiles and its original sentence.",
      "tradeoff": "Someone who cannot find where to add users has no button for it on this page. The general Get help button in the page header is still there.",
      "by": "Ryan",
      "when": "2026-10-22"
    },
    {
      "id": "limits-from-entries",
      "area": "Fields",
      "where": "Step 3 · Your card volumes, the limits tick",
      "t": "The transaction limits come from the applicant's own answers, and the tick waits until they are filled in",
      "b": "The limits under the tick on step 3 (moved into Your card volumes, see limits-ack-in-volumes) are no longer fixed sample numbers. The per-transaction limit is what the applicant entered as their maximum single transaction, and the monthly limit is their estimated monthly card volume, so the hint changes as they type. The label reads I've read the transaction and monthly limits for my business, because those are the two limits shown. Until both fields are filled in, the tick is greyed out and cannot be used, and the hint under it says what to enter above and that the tick opens up afterwards. The tick does not show the usual Tick this to continue error while it is waiting, because the two fields above already show their own errors. If either limit changes after the tick was given, or a field is emptied, the tick clears, so the applicant has to read the new numbers and tick again. Retyping the same amount in a different format, such as 40000 for 40,000, does not clear it. Update, 2026-11-11: the hint under the tick now reads “We block any single transaction over $X. Your monthly limit is $Y. Both are based on what you entered above. Ask us any time to raise them.” (see max-ticket-hard-block).",
      "tradeoff": "The limits simply repeat what the applicant estimated, so a low guess becomes a low limit and Xplor still has to decide the real limits. Someone who corrects a figure has to tick again; that is deliberate, since the tick is about specific numbers.",
      "by": "Ryan",
      "when": "2026-10-22"
    },
    {
      "id": "sample-not-a-start",
      "area": "Flow",
      "where": "Prototype options · Flow starts as and Data",
      "t": "The sample business is no longer a place to start the flow, only a Data setting",
      "b": "Flow starts as no longer lists Merchant: sample business. It offered a third way to open the prototype that also filled the form, which made it unclear whether the start or the data was being chosen. Where the prototype opens is now only a Flow starts as choice (the welcome email and login, the existing-user start, or the one-time-code link). Whether the form is filled in is only the Data option, Empty or Sample business, and works with any start, so the sample business can now be reached through the welcome email and login as well. The address ?data=sample still fills the form; an old ?start=sample address now opens the default start with an empty form.",
      "tradeoff": "Choosing Sample business under Data restarts the flow, so it has to be set before walking in. Choosing the one-time-code start still switches Data back to Empty, as it did before.",
      "by": "Ryan",
      "when": "2026-10-22"
    },
    {
      "id": "welcome-help-and-info-in-header",
      "area": "Flow",
      "where": "Welcome page",
      "t": "The welcome page uses the same Get help button and the same hover note as a step",
      "b": "The secondary button on the welcome page, left of Let's get started, is now Get help with the same question-mark icon as the Get help button in the step list, in both slices. It opens the same Talk to a person dialog, with the phone number and email. That makes the line Want to talk to someone first? with the phone number at the bottom of the page redundant, so it is removed. What we do with your information moves up to the end of the description under the heading, as hoverable text with a question icon, the way Why are we asking? sits at the end of a step's description. It opens on hover, click or focus, closes when the pointer leaves, and Escape closes it. The Someone else handles our finances button is removed from Slice 2 too.",
      "tradeoff": "The support number is no longer on the page itself; a person has to press Get help to see it. Slice 2 loses its one-click hand-off from the welcome page, though Save & Exit and the owner cards still offer it.",
      "by": "Ryan",
      "when": "2026-10-22"
    },
    {
      "id": "welcome-needs-one-card",
      "area": "Visual",
      "where": "Welcome page · What you'll need",
      "t": "The four things to have ready sit in one card, split by light dividers",
      "b": "The four What you'll need items (registration and tax numbers, the people who own the organization, bank account and documents, and a rough idea of card sales) were four separate cards stacked with gaps. They are now one card with the four items inside it, separated by a thin light divider. The dividers stop at the card's inner margins, lining up with the text and icons, rather than running edge to edge. The change applies to both slices, and the page an invited owner sees in Slice 2 uses the same list, so it changes with it. On 2026-10-30 Ryan asked for more room, and the list stayed one card rather than going back to four: each row now has 28px of padding all round (it was 20px above and below and 18px at the sides), 6px between title and text, a looser line height, and the dividers line up with the new 28px margins. On 2026-11-05 Ryan found that a little too roomy, so the rows are 24px above and below with the 28px at the sides kept, and the card's corners go from 8px to 12px, the radius the other large cards use (the first version had the small one). The same day the list was updated after the refinement session with engineering: step 1's line mentions choosing the merchant category from a short list, and the people line asks for each person's title, drops whoever signs in Slice 1 (one person fills in the form and signs) and says in Slice 1 that the applicant fills it in for everyone.",
      "tradeoff": "One card reads as a single checklist, which is lighter on the page, but the items are no longer separate objects, so a later change that makes one of them clickable or expandable would need them drawn as cards again.",
      "by": "Ryan",
      "when": "2026-10-22"
    },
    {
      "id": "submitted-no-extra-cards",
      "area": "Status",
      "where": "Confirmation page (under review)",
      "t": "The confirmation is the one card, with nothing to do while waiting",
      "b": "The two cards under the main confirmation card are removed in both slices: Something to do while you wait (order your payment devices) and the card that said nothing was waiting on anyone else, with its ID line. Once an application is submitted there is nothing for the applicant to do, so the page is the status card alone: what has happened, what is running, when to expect a decision, and that there is nothing else to do right now.",
      "tradeoff": "Applicants who would have ordered card readers while waiting are no longer prompted; the approved page and the dashboard are where that happens. In Slice 2 the page also no longer says nothing is waiting on an invited owner, though owners cannot be left outstanding at submit anyway (decision invite-no-exemption).",
      "by": "Ryan",
      "when": "2026-10-22"
    },
    {
      "id": "welcome-plain-icons",
      "area": "Visual",
      "where": "Welcome page · What you'll need",
      "t": "The items to have ready use a plain purple icon beside the title, not a tinted tile",
      "b": "Each of the four What you'll need items used a light purple square with an icon inside. It is now just the purple icon, 20px, with no background, on the same line as the title and with the description beneath lined up under the title, the way the steps in the confirmation card are laid out. The icons are the same ones as before. The page an invited owner sees in Slice 2 shares the list, so it changes with it.",
      "tradeoff": "Without the tile the icons are lighter and less like buttons, which is the intent; they carry a little less visual weight against the page, so the list leans more on the titles.",
      "by": "Ryan",
      "when": "2026-10-22"
    },
    {
      "id": "status-optical-centre",
      "area": "Visual",
      "where": "Under review, More info needed and Approved pages; Welcome",
      "t": "The short status screens sit at the optical centre of the window; the welcome page stays at the top",
      "b": "The Under review, More info needed and Approved pages hold one card, so at the top of a tall window they left most of the page empty and felt high. They are now centred vertically, slightly above the true middle (roughly 45% down), because a block at the exact centre looks like it has sagged. If the content is taller than the window, the page falls back to starting at the top, so nothing is cut off. The welcome page and the seven steps stay anchored to the top: their height changes with business type and region, and centring them would move the title and the Let's get started button between variants. This follows common practice of centring short, single-purpose screens and top-anchoring long or variable ones.",
      "tradeoff": "The status pages now move with the window height, so they look different on a short laptop screen than on a tall monitor. The welcome page can still look a little high in a very tall window.",
      "by": "Ryan",
      "when": "2026-10-22"
    },
    {
      "id": "pci-outside-onboarding",
      "area": "Step 5",
      "where": "Step 5 · Card data security (removed)",
      "t": "PCI is not part of onboarding: the Card data security section is removed",
      "b": "Step 5 no longer has the Card data security card. It asked whether the business follows the card industry's data security rules (PCI DSS), then for the SAQ type and the date it last completed the form. None of that is needed to onboard: PCI validation is not mandatory to get approved, and Xplor Pay sends each merchant a separate link, outside onboarding, to register their PCI details themselves (the 90-day deadline was Ryan's first answer; the separate link is from Stacey). Many merchants are not PCI compliant yet and the section risked becoming a blocker. The questions, the Unsure answer, the SAQ and date fields, the note under the card and the PCI line on the review screen are gone, and step 5 now ends with the two consents. The merchant is never told in this flow that PCI exists.",
      "tradeoff": "The applicant hears nothing about PCI until the separate link arrives, so that email carries the whole explanation, including the deadline if there is one. The 90 days after onboarding comes from Ryan, not a document, and Stacey's confirmation of the separate link is relayed, not sourced; compliance should confirm both before launch. Underwriting no longer sees whether a business says it is compliant. The earlier decisions about PCI wording, optional fields and the Unsure answer were removed with the section.",
      "by": "Ryan",
      "when": "2026-10-27"
    },
    {
      "id": "returning-login-only",
      "area": "Flow",
      "where": "Sign-in, when Link opened as is one of the Returning options",
      "t": "A returning user just signs in: no welcome email and no forced password change",
      "b": "When Link opened as is Returning, in progress, Returning, under review, Returning, more info needed or Returning, approved, the prototype opens on the sign-in screen, not the welcome email, because that email carries a temporary password for a first sign-in. The sign-in screen asks for the email and password, its button reads Sign in instead of Continue, its description says Sign in to pick up where you left off, and an empty password says Enter your password. Signing in goes straight to wherever the link lands (step 4, Under review, More info needed or Approved); the Change your password screen is skipped, because a returning user chose their own password the first time. A new applicant and the existing-user start are unchanged.",
      "tradeoff": "Skipping the email for a returning user is an inference from the temporary password it contains: the prototype does not show how a returning user reaches the sign-in page (a bookmark, an email link or the ODIN address). Any email and password still sign in, as before.",
      "by": "Ryan",
      "when": "2026-10-23"
    },
    {
      "id": "rail-quiet-step-markers",
      "area": "Visual",
      "where": "Left progress rail, step list",
      "t": "The progress rail keeps every step's number and shows a green tick beside the word Done once a step is finished",
      "b": "The current step keeps its light purple row but has no border around it. Its number sits in a white circle with a purple ring and a purple number, not a solid purple disc. Every step's number sits in a white 22px circle with a light grey ring, whether the step is finished, current or still to do (white for all of them was added on 2026-11-05). A finished step keeps its number, and a small green check mark (12px) sits beside the word Done at the end of the row. (Until 2026-11-04 the tick replaced the number, on a pale green circle; Ryan wanted the numbers kept so the list still reads as steps one to seven.) The current step's soft pulse ring stays. The Your progress bar and its percentage are green, not purple.",
      "tradeoff": "The done and current markers now stand out less against the grey step numbers, so someone scanning the rail leans on the row tint, the bold label and the green Done to find where they are. All the circles are white, so a done step is told apart from one still to do only by the Done and green tick on the right, and the current step by its purple ring and row tint.",
      "by": "Ryan",
      "when": "2026-10-23"
    },
    {
      "id": "step-header-fixed",
      "area": "Visual",
      "where": "Every step, title block",
      "t": "The step counter, title and description stay fixed at the top while the cards scroll behind them",
      "b": "On each of the seven steps the block with the step counter and time, the title and the description is pinned to the top of the window. The forms and cards below scroll underneath it and disappear behind it, so the applicant always sees which step they are on and what it asks. The block has a solid background so nothing shows through, and it reaches down to where the first card rests, so a card starts to disappear as soon as the page scrolls. The left rail already stays in view, so now both stay put.",
      "tradeoff": "The pinned block takes about 150 to 200 pixels of height all the time, which matters on short laptop screens and on phones, where a long description leaves little room for the form. If testers complain about cramped screens, pin only the counter and title, or unpin it on narrow widths.",
      "by": "Ryan",
      "when": "2026-10-23"
    },
    {
      "id": "terms-one-document",
      "area": "Trust",
      "where": "Step 7 · What you're agreeing to",
      "t": "The acknowledgements and authorizations are written into the one merchant agreement the applicant reads at step 7",
      "b": "A sub-merchant form Ryan shared has six acknowledgement points and ten authorization points. They are terms and conditions, so they sit inside the merchant services agreement that the first tick at step 7 opens, not as extra ticks. The privacy policy and terms of service stay a separate document and tick. They are being added in three groups: (1) debit and recovery rights, done on 2026-10-26: collecting fees, recovering chargebacks, refunds and returns, a reserve, withholding funds under a lawful order, and moving billed amounts to settle; (2) authority and data, done on 2026-10-26: opening the merchant account with a processor, using your information and cardholder data to provide the service, signing and acting for you, reaching your payout account, and the power of attorney statement; (3) truth and binding terms, done on 2026-10-26: the application can be rejected in underwriting but binds once accepted, the referenced documents are part of the agreement, and the service depends on paying fees and following the terms and privacy policy. The statement that the information is true is not in the agreement but sits under the typed signature (see truth-tick). Update, 2026-11-11: the ticks are gone (see terms-view-only). The merchant services agreement is opened with its View button at step 6, and typing the name under it is the acceptance. The wording of the agreement itself is unchanged. Update, 2026-11-11 (later): the Sign it off card is back at the end of step 7, as the last thing before Submit (sign-back-on-step-7); where this entry says step 6, read step 7.",
      "tradeoff": "A long agreement behind one tick is easy to accept without reading. The wording is a sample drafted from the form's points, not legal text, and needs legal or compliance to replace it. Three clauses are marked for legal review: acting for the merchant in any other action it reasonably considers necessary, the irrevocable power of attorney (both give Xplor wide, hard-to-undo authority), and as they may be revised from time to time in section 8, which lets the terms change without a new acceptance. It is not known whether this agreement is the sub-merchant agreement itself or who the named facilitator is.",
      "by": "Ryan",
      "when": "2026-10-26"
    },
    {
      "id": "terms-download",
      "area": "Trust",
      "where": "Step 7 · document viewer",
      "t": "The agreement and privacy documents can be downloaded from the viewer",
      "b": "The document viewer has a Download button beside Close, so the applicant can send the terms to a legal team before signing. In the prototype it saves the sample text as a plain text file. The real product would give the same versioned PDF the viewer shows. Update, 2026-11-11: the viewer is now opened from the View buttons at step 6 (sign-on-step-6). The Download button is unchanged. Update, 2026-11-11 (later): the Sign it off card is back at the end of step 7, as the last thing before Submit (sign-back-on-step-7); where this entry says step 6, read step 7.",
      "tradeoff": "Nothing records that the applicant downloaded it, and the real PDF has to match the version they go on to accept.",
      "by": "Ryan",
      "when": "2026-10-26"
    },
    {
      "id": "clubready-lease-by-division",
      "area": "Flow",
      "where": "Step 6 · Documents (Division option)",
      "t": "A lease, business licence or utility bill is asked for only for the ClubReady division",
      "b": "ClubReady's request list asks for the club's signed lease, or a business licence or a utility bill in the business name until the lease exists. Ryan says this belongs to ClubReady only, which is a division, and it is not asked of a non-profit. The division is not chosen in this prototype. An Xplor Pay ops user sets it in the admin portal, outside the prototype, while entering the details of the person who will fill in the form. Saving that starts the flow by sending that person the welcome email the prototype opens on (decision welcome-email-first), so the division is already known when the form opens and decides whether step 6 shows the document row. Shown in the prototype only through the Division option in Prototype options (decision division-option): choosing ClubReady opens step 6 with this Required row added, outlined and tagged. The row is left out when the business type is a non-profit, though the sample business is a company, so that case is not visible there.",
      "tradeoff": "The admin portal itself, and what else the division changes (fees, agreement text, descriptor), are not known. The row wording is a draft, not approved copy.",
      "by": "Ryan",
      "when": "2026-10-26"
    },
    {
      "id": "one-owner-signs",
      "area": "Step 2",
      "where": "Step 7 · signing",
      "t": "One owner signs for the business; the other 25% owners do not sign",
      "b": "ClubReady's request says each owner with 25% or more must sign the sub-merchant application. Ryan has decided that only one owner needs to sign, so the prototype keeps what it already does: the person filling in the form signs once at step 7 (decision invitee-own-card-only, and Slice 1 has no invites). No change to the flow. The 75% rule still lists owners until three quarters is accounted for, which may miss a 25% owner; that is about who is listed, not who signs. Update, 2026-11-11: the one signature is now given at the end of step 6, not step 7 (sign-on-step-6). Update, 2026-11-11 (later): the Sign it off card is back at the end of step 7, as the last thing before Submit (sign-back-on-step-7); where this entry says step 6, read step 7.",
      "tradeoff": "Xplor Pay takes one signature where ClubReady's own request asks for one from every 25% owner. If compliance or the ClubReady division later says otherwise, Slice 1 (one person, no invites) cannot collect more, and step 7 would need a signature per owner, which the invite-era decisions ruled out. The answer is Ryan's; no source document.",
      "by": "Ryan",
      "when": "2026-10-27"
    },
    {
      "id": "owner-share-minimum",
      "area": "Step 2",
      "where": "Step 2 · Ownership percentage",
      "t": "Every owner with 25% or more is listed, and nobody under 25% can be",
      "b": "An ownership percentage below 25 now shows an error (Enter 25 or more. We only need owners with 25% or more.), because owners under 25% are not asked about. A new owner, including from Add myself, starts at the share still unaccounted for, and never below 25. Ryan's reason: every owner at 25% or more must be accounted for (see one-owner-signs), and anyone below that is of no interest. See ownership-no-question: the step does not ask whether everyone has been listed.",
      "tradeoff": "Starting at the share left can put a number in that is wrong for the person, so a glance at it is still needed. When 25 is the floor and the share left is lower, the new owner starts at 25 and the total goes over 100%, which then shows an error.",
      "by": "Ryan",
      "when": "2026-10-26"
    },
    {
      "id": "ownership-no-question",
      "area": "Step 2",
      "where": "Step 2 · Owners with 25% or more",
      "t": "No question about whether everyone is listed; Save and continue turns on once one owner is added",
      "b": "Superseded for steps 1 to 6 on 2026-11-09 by partial-steps-allowed: those steps now save and continue even when incomplete, and only the final Submit for verification is held back. The question Does anyone else own 25% or more? is removed (it was added on 2026-10-26 and moved under the owner cards earlier on 2026-10-27). Ryan's reason: the applicant has to add every owner with 25% or more anyway, so asking them to confirm they did adds nothing. Save and continue turns on once at least one owner is added and complete. Every owner must hold 25% or more (decision owner-share-minimum), so one owner added is one owner with 25% or more. The Owners with 25% or more card stays at the top with its N listed so far tag and the note Add everyone who owns 25% or more. It shows All listed only when the shares pass 75%, because then nobody else can hold 25% or more. A total over 100% still errors. Company only.",
      "tradeoff": "Nothing asks whether a 25% owner is missing, so an applicant can stop at one owner when two exist. The question would not have caught that either, since a No can be untrue, and the signature at step 7 says the information is true. Compliance should confirm the form may rely on the applicant listing every 25% owner.",
      "by": "Ryan",
      "when": "2026-10-27"
    },
    {
      "id": "id-types-accepted",
      "area": "Step 2",
      "where": "Step 2 · Government ID type",
      "t": "Driver's licence, passport and national ID card all stay acceptable",
      "b": "ClubReady's request list asks for each owner's driver's licence. Ryan confirmed on 2026-10-26 that other ID types are acceptable too, so the Government ID type choice stays Driver's license, Passport and National ID card, and step 6 takes a photo of whichever the owner chose.",
      "tradeoff": "If a downstream check only reads driver's licences, a passport would fail later rather than here.",
      "by": "Ryan",
      "when": "2026-10-26"
    },
    {
      "id": "approval-time-confirmed",
      "area": "Status",
      "where": "Step 7 · What happens next; the under review page",
      "t": "Usually under 2 hours stays as the approval time",
      "b": "ClubReady's request list says an account can take up to 5 business days to be approved once the agreement is signed. Ryan confirmed on 2026-10-26 that usually under 2 hours is correct for this flow, so the copy on step 7, the confirmation and the under review page stays. This settles the claim the tone-of-voice pass flagged. Superseded, 2026-11-11: Ryan says no claims on time should be in the prototype. Usually under 2 hours is removed from step 7 (What happens next), the Why we ask panel on step 7 and the under review timeline, which now reads We'll email you (After the last item arrives · we'll email you while something is outstanding), and the approved page's tag no longer says how long approval took. Ryan says the remaining time claims stay because they are necessary: the Faster approval chip, About 15 minutes on the welcome page, the About N minutes left note in the step list and About 5 minutes on the invited owner's page.",
      "tradeoff": "The two figures describe different things (usually and up to), so a slower case is not covered by the copy.",
      "by": "Ryan",
      "when": "2026-10-26"
    },
    {
      "id": "descriptor-phone-tbd",
      "area": "Step 3",
      "where": "Step 3 · Billing descriptor (undecided)",
      "t": "Whether to collect a billing descriptor phone number is TBD",
      "b": "ClubReady's request list asks for a billing descriptor phone number, the contact number shown on a customer's bank or card statement. Step 3 asks for the descriptor name only, and the step 1 phone number is for account notices. Ryan said on 2026-10-26 to leave it for now and keep it as TBD, so nothing changes. Parked on 2026-11-11: the whole How you'll appear section was taken out of step 3 (see descriptor-section-parked). Ryan wants to use it somewhere else later; its spec and code are in parked/billing-descriptor.md.",
      "tradeoff": "If it is needed later it is one more field on step 3, and the statement preview would show it.",
      "by": "Ryan",
      "when": "2026-10-26"
    },
    {
      "id": "truth-tick",
      "area": "Trust",
      "where": "Step 7 · Sign it off",
      "t": "The statement that the information is true sits under the typed signature, not in a tick",
      "b": "From the sub-merchant form's acknowledgements, the statement that all the information given is true and accurate to the best of the signer's knowledge sits in the Sign it off card, under the Type your full legal name box: By typing your name, you confirm that the information in this application is true and accurate to the best of your knowledge. That includes your declarations at step 5. Typing the name is the act that confirms it. It was first built as its own fifth tick on step 7 (2026-10-26); Ryan folded it into the signature line the same day, because five ticks was a lot and it echoed the step 5 declarations. The other acknowledgement points are agreement section 8. Update, 2026-11-11: the statement now sits under the typed signature at step 6 (sign-on-step-6) and also says the signer agrees to the documents above, agrees to sign electronically and is authorized to sign for the business, because the ticks that used to say those things were removed. Update, 2026-11-11: the signature is now drawn or uploaded, not typed (signature-draw-or-upload). The note under it now reads By signing, you agree to sign electronically, confirms authority to sign for the business and that the information is true, and no longer mentions the documents, which have their own tick boxes. Update, 2026-11-11 (later): the Sign it off card is back at the end of step 7, as the last thing before Submit (sign-back-on-step-7); where this entry says step 6, read step 7. Update, 2026-11-11 (later): the note under the signature was removed (see sign-note-removed). Nothing on the page now says the information is true.",
      "tradeoff": "It is easier to skip than a tick: the text is a small note, and the form's action is typing a name rather than agreeing to the sentence. The note must sit next to the box so it is read at the moment of signing. Whether Xplor wants the confirmation recorded as its own timestamped event is not decided.",
      "by": "Ryan",
      "when": "2026-10-26"
    },
    {
      "id": "pend-reasons-as-requests",
      "area": "Flow",
      "where": "More info needed",
      "t": "Each reason Ops picks becomes one request card",
      "b": "An Ops user picks one or more pend reasons from the underwriting guide. The More info needed screen shows one card per reason, and the email to the applicant says the same thing. Every card has the same four parts: a short title, a plain-language line on why we need it, the documents or answers we will accept, and how to respond. The response is one of four things: upload a document, write an answer (one or more fields), tell us it is done (remove a credit freeze, fix the website), or add a co-signer. Every upload card also has an optional Add a note for our team box, so the applicant can explain a missing document or say what a file shows; it is never required and does not count towards Done. Its label says (optional) outright, an exception to no-optional-tag, because on a card full of required requests an unmarked box does not read as optional. A card for a reason with nothing to send (a credit security alert, where underwriting calls the applicant) says so. The heading counts the cards (One thing to fix, Two things to fix). The reassurance that the applicant is not back at the start stays as the lede (decision rfi-not-restart). The reasons, their order of detail and what resolves each one come from the Xplor Underwriting Guide, Pend Reasons and Documentation Requirements; all 19 reasons are in the prototype and Ops picks them in Prototype options. The guide says at least one resolution document or response is needed for each reason, so a list of accepted documents reads as Any one of these works unless it says otherwise. Superseded in part, 2026-11-11: the four ways of responding (upload, write an answer, tell us when it is done, add a co-signer) are gone. Every card has the same file and message boxes and nothing on it is required (see more-info-one-response).",
      "tradeoff": "The plain-language wording is my draft from the guide, not approved copy; ops and compliance should confirm it, especially Credit Freeze, Credit Security Alert and Insufficient Credit. The guide is marked Xplor Technologies - Restricted, and this wording sits in the prototype that is published on GitHub Pages: check with Xplor before the next deploy. Ryan confirmed the guide applies to the United States and Canada alike, so the cards read the same in both regions, including the US document names (Social Security card, SS-4, 1099-K, 501(c)(3)) and routing number. The old hard-coded request (a bank letter address that did not match the registered address) is gone.",
      "by": "Ryan",
      "when": "2026-10-26"
    },
    {
      "id": "pend-send-once",
      "area": "Flow",
      "where": "More info needed",
      "t": "One Send to our team button, on once every request is answered",
      "b": "Each card marks itself Done as soon as it has what it needs: a file that finished uploading, every required field filled in, or a tap on its button. The page ends with two buttons on the right: Email us, then the primary Send to our team furthest right, which stays off until every card is done, with a short line under it saying why. Sending takes the applicant back to the under-review screen. One send means Ops gets one resubmission and the applicant sends one email, however many reasons were picked. A page with only a nothing-to-send reason has no Send button. Email us stays as the secondary button for a request the applicant cannot meet. There is no closing line under the buttons. Update 2026-11-11: Ryan removed the Email us secondary button from the More info needed screen, so the page ends with the single Send to our team button and there is no longer a button for a request the applicant cannot meet. Ryan gave no reason.",
      "tradeoff": "An applicant who can answer two of three cannot send those two now and the third later. If that matters, each card could send on its own.",
      "by": "Ryan",
      "when": "2026-10-26"
    },
    {
      "id": "pend-reasons-open",
      "area": "Flow",
      "where": "More info needed (open questions)",
      "t": "Questions still open on the More info needed screen",
      "b": "Three things are not settled. (1) The email Ops sends when picking reasons is TBD and not built. The screen no longer says what is needed or why, so the email must carry the title, why and what we need for each request, with no sensitive data in it (merchant communications FR-06). (2) What Add a co-signer does in the product: the prototype only says a form would open, and it is Slice 2 only (decision pend-cosigner-slice-2). (3) The Banking Verification card says routing number, but the Canadian step 4 asks for an institution number and a transit number, so a Canadian applicant sees two words for the same thing. Settled and no longer open: only one accepted document is required per reason; the underwriting guide is the same for the United States and Canada, so there are no Canadian variants; Credit Security Alert stays shown to the applicant; person-level requests name the person.",
      "tradeoff": "Until these are answered the screen shows a plausible version, not a settled one.",
      "by": "Ryan",
      "when": "2026-10-26"
    },
    {
      "id": "pend-cosigner-slice-2",
      "area": "Flow",
      "where": "More info needed",
      "slice": "1",
      "t": "Add a co-signer is Slice 2 only; Slice 1 does not offer Insufficient Credit",
      "b": "The Insufficient Credit reason asks for a co-signer: a second person whose full legal name, address, date of birth, phone number and Social Security number are collected, and who signs the merchant agreement. Slice 1 is one person with no way to add or invite anyone else, and Ryan does not think Slice 1 can collect another person's details. So the Add a co-signer request belongs to Slice 2 (`?slice=2`). In Slice 1 the reason is not in the Ops picks list in Prototype options, and if Ops had picked only that reason the screen shows the default request instead. In Slice 2 it works as before: the card button only marks the request done and shows a toast that a form would open (fake pend-cosigner). Update, 2026-11-11: the in-app screen is now the Slice 1 screen and Slice 2 uses the email, so the Insufficient Credit reason is not shown on the in-app screen in either slice. Its card is now the same file and message boxes as every other reason, which would mean asking for a Social Security number in a free text box, so it stays hidden until the co-signer flow is decided.",
      "tradeoff": "In Slice 1 an applicant whose credit is not enough has no way to resolve it on this screen. Risk ops need to be told this is not in Slice 1 and say what happens instead (for example underwriting contacts the applicant, or the application is declined). The co-signer flow itself (a form here or an invite to the co-signer) is still undecided for Slice 2.",
      "by": "Ryan",
      "when": "2026-10-26"
    },
    {
      "id": "club-essentials-financial-history",
      "area": "Flow",
      "where": "Step 6 · Documents (Division option)",
      "t": "Club Essentials needs two years of financial history uploaded from every applicant",
      "b": "Requirement noted. Club Essentials (CE), another Xplor division alongside ClubReady, needs two years of financial history uploaded as part of onboarding, from anyone applying through that division. Like ClubReady, the division is set by an Xplor Pay ops user in the admin portal before the form opens (decision clubready-lease-by-division), so the form could show the document row from the start. Shown in the prototype only through the Division option in Prototype options (decision division-option): choosing Club Essentials opens step 6 with a Required row, Two years of financial history, outlined and tagged. It is treated as required before submit like every other Required file, and is not skipped for non-profits; both are assumptions.",
      "tradeoff": "Not yet known: which documents count as financial history (statements, tax returns, accounts), whether a start-up with less than two years has another route, whether it applies to non-profits, and whether it is required before submit. The row wording is a draft, not approved copy. Update, 2026-11-11: Ryan is still waiting on an answer for what happens when the business is under two years old.",
      "by": "Ryan",
      "when": "2026-10-27"
    },
    {
      "id": "nonprofit-includes-government",
      "area": "Business type",
      "where": "What type of business are you?",
      "t": "The third business type covers non-profits and government bodies",
      "b": "The third option on the business type page is for non-profits and for government bodies. Its description now reads Charitable organizations, foundations, non-governmental organizations and government bodies, so a government body knows it belongs there. The option's label reads Non-profit or government (renamed 2026-11-03), and the steps still say organization, leaders and supporters, which fit both.",
      "tradeoff": "Wording such as Donations and Trustees was written with non-profits in mind and has not been checked for government bodies.",
      "by": "Ryan",
      "when": "2026-10-27"
    },
    {
      "id": "nonprofit-no-national-id",
      "area": "Step 2",
      "where": "Step 2 · Leaders & signatory (non-profit and government route)",
      "t": "Non-profit and government applicants are not asked for anyone's SSN or SIN",
      "b": "On the non-profit and government route, the leader cards at step 2 no longer ask for a Social Security Number (Social Insurance Number in Canada). It is not required for these organizations, so the field is gone and nothing waits on it. Company and sole proprietor owners are still asked for it. The Government ID number, ID type, expiry and country, and the photo ID at step 6, are still asked for everyone. On the More info needed screen, the Know your customer card does not offer a Social Security card as an accepted document on this route. The welcome page says in its list of what to have ready that a non-profit or government body does not need the SSN or SIN, and the Why do you need owners note no longer mentions it for this route.",
      "tradeoff": "The rule is Ryan's; no source document was checked. The Know your customer request on the More info needed screen no longer lists a Social Security card as an accepted document on this route (Ryan, 2026-10-27); the same card still lists it for companies and sole proprietors. Whether the identity check can work without the number is for Trullio and compliance to confirm.",
      "by": "Ryan",
      "when": "2026-10-27"
    },
    {
      "id": "division-option",
      "area": "Flow",
      "where": "Prototype options · Division",
      "t": "A Division option shows what changes for ClubReady and Club Essentials",
      "b": "Prototype options has a Division select: Standard, ClubReady or Club Essentials (address ?division=clubready or ?division=ce). It stands in for the Xplor Pay admin portal, where an Ops user sets the division before the form opens. Choosing a division other than Standard opens step 6 directly, with the sample business filled in, and shows only that step. The row that exists only for that division has a dashed orange outline and a tag (ClubReady only, Club Essentials only). ClubReady adds a Signed lease, business licence or utility bill row; Club Essentials adds a Two years of financial history row. The rest of the flow is not shown and is the same as Standard.",
      "tradeoff": "It is a stand-in, not the product: the real flow would show the whole form with the division's rows in place, and what else a division changes (fees, agreement text, descriptor) is unknown. The outline and tag are prototype-only marks and would not ship.",
      "by": "Ryan",
      "when": "2026-10-27"
    },
    {
      "id": "pend-note-cards-optional-upload",
      "area": "Flow",
      "where": "More info needed",
      "t": "Cards that ask for a written answer also offer an optional document upload",
      "b": "Five requests are answered by writing (Future Delivery Risk, Product/Services Description, Duplicate Account, Avg Ticket/Volume Thresholds, Missing URL). They stay written answers: they are Done when the written fields are filled in, and nothing else is needed. Each now also has an Add a document (optional) button, so a person can attach something that backs up what they wrote. An attached file never counts towards Done, and can be removed. This settles the open question about whether some requests should finish with a note and no file: those are exactly these cards. Requests that ask for a document (for example the bank letter or a tax document) still need the file to be Done, with the optional note.",
      "tradeoff": "A person who has no document for a document request still cannot finish that card, because only the written-answer cards finish without a file. Ryan has not said whether any upload card should accept a note alone.",
      "by": "Ryan",
      "when": "2026-10-27"
    },
    {
      "id": "moreinfo-simple-trial",
      "area": "Flow",
      "where": "More info needed (trial)",
      "t": "More info needed is only a place to send documents and notes",
      "b": "The simplest build, now the default (Ryan, after trying it). Prototype options (on the More info needed screen) has a More info needed screen select: Just uploads and notes (the default) or A card for each request (the earlier build, kept for now as a prototype option; address ?moreinfo=cards). The simple screen drops every title, reason and list of what is needed, because the email the applicant receives says what is needed and why. It shows a short heading and sentence, then a card with a Message for our team box (not marked optional, because an applicant may send only a message) above a Choose file button, so an applicant can send a message, a file, or both. An Add a document button below adds another card of the same kind, for as many documents as they have; in the real product it opens the file picker, so in the prototype the new card arrives with its file already uploaded. A card can be removed once there is more than one, with a trash icon in the top right corner of the card on the same line as the message box, which takes the rest of the width. Send to our team is on once any card has a file or a message and nothing is still uploading. The reasons Ops picks are not used. An engineer needs one component: a repeating row of a file and a note. The add button has a plus symbol, and there is no Email us button, so Send to our team is the only action. Update, 2026-11-11: the default is now A card for each request, with each reason's own wording and the same file and message boxes on every card (see more-info-one-response). Just uploads and notes remains as an option (address ?moreinfo=simple).",
      "tradeoff": "Nothing on the screen tells the applicant what to send or why, so it depends on the email being clear and to hand. A message alone is enough to send, so an applicant who has nothing to upload (for example a request to update their website, or to remove a credit freeze) can just explain. Nothing checks that the right documents were sent. The earlier card layout stays in the code for now. To remove this screen and go back to the cards, delete the lines marked SIMPLE TRIAL and the block between SIMPLE TRIAL:START and SIMPLE TRIAL:END in app.js, the SIMPLE TRIAL rule in app.css, and this decision.",
      "by": "Ryan",
      "when": "2026-10-27"
    },
    {
      "id": "step-eyebrow-subtle",
      "area": "Visual",
      "where": "Every step",
      "t": "The Step N of 7 label above the step title is grey, not brand purple",
      "b": "The small all-caps label above each step title (Step 1 of 7 and so on) uses the subtle text colour (#6a6b76) instead of the brand colour. Brand purple is the same value as the link colour, so purple text read as something to click, and the label is only a position marker. It keeps its size, all caps and letter-spacing, and uses the same grey as the card notes and the progress note.",
      "tradeoff": "The darker secondary text colour (#40404c) was the alternative, if the grey is too faint on the pinned header. The label no longer ties the header to the brand colour, so the current step in the left rail is now the main purple marker on the page.",
      "by": "Ryan",
      "when": "2026-10-27"
    },
    {
      "id": "email-logo-above-card",
      "area": "Visual",
      "where": "Emails · Welcome, existing-user and every new email",
      "t": "The logo sits centred above the email card, and the card starts with the purple hero",
      "b": "In every Xplor Pay email the logo is centred on the page background above the white card, and the card itself starts with the purple gradient hero (its top corners rounded). Before, the logo sat inside the card on a white strip above the hero, left-aligned. The prototype's email screen draws the same layout. The shared shell (logo, hero, body, security note, footer) is the same in all four templates, so a design change is made once and copied.",
      "tradeoff": "Outlook desktop ignores rounded corners, so the hero shows square corners there; everything else holds. The logo image still points at the GitHub Pages URL and must move to an Xplor domain before sending.",
      "by": "Ryan",
      "when": "2026-10-28"
    },
    {
      "id": "emails-more-info-and-ops-monitoring",
      "area": "Flow",
      "where": "Emails · More info needed, Ongoing monitoring",
      "t": "Two more emails: More info needed for the applicant, and Ongoing monitoring for Ops",
      "b": "More info needed (to the applicant) lists each request as a card: a number, the request title, why we ask and what to send, then one button to the secure page. It carries no sensitive data, and tells people not to reply with documents. Ongoing monitoring (to Ops) shows the business, merchant ID, division and detected time, then one card per change with the old and new value, who changed it and when, and a button to the Ops portal. The data points that trigger it are drafted in email/OPS-MONITORING-TRIGGERS.md (about 40 rows, my draft, unconfirmed by Risk Ops). Both templates use merge fields and repeat a marked block once per request or change; neither is wired to anything. Personal data stays out of the Ops email (Ryan, 2026-10-28): every change about a person (owner added or removed, share, signatory, PEP, screening hit, owner address, residence, ID expiry) shows Changed for both the old and new value, with no names; bank accounts and registration numbers are masked.",
      "tradeoff": "The trigger list is a guess and Ryan will get the real one confirmed. Because person-level changes show only Changed, Ops must open the Ops portal to see who, which adds a click. Who receives the email, and whether it is one email per change or a daily digest, are open (the template handles several changes in one email). The More info needed email must match what Ops picks on the More info screen; the 19 PEND_REASONS draft text is the source for its wording and nothing connects the two yet.",
      "by": "Ryan",
      "when": "2026-10-28"
    },
    {
      "id": "ca-no-llc-structure",
      "area": "Business",
      "where": "Step 1 · Business type / legal structure (Canada)",
      "t": "Canada does not offer LLC as a legal structure",
      "b": "In Canada the legal structure list leaves out the LLC, and the sample business fills in Private corporation (the list was widened on 2026-11-04, see company-structure-nine-types). The US list keeps Limited liability company (LLC). The made-up Canadian business is named Riverside Pilates Inc. so its name matches its structure. Also reworded: the legal proceedings question no longer says on the go, and the step 7 review line for all-No declarations reads All answers No, not Nothing to declare, to follow the tone of voice rule on idioms.",
      "tradeoff": "Two options is my draft. Canadian structures such as an unlimited liability company or a co-operative are not listed; compliance should say which Xplor accepts.",
      "by": "Ryan",
      "when": "2026-10-28"
    },
    {
      "id": "ops-removal-by-deleting",
      "area": "Flow",
      "where": "Ops · Deleting an application or removing someone's access",
      "t": "To delete an application or remove someone's access, Ops deletes the user or disables the business",
      "b": "There is no separate remove or delete application feature for Ops. If an Ops user wants an application gone, or wants to take a person's access away, they delete that user from the system. If they want to stop a whole business, they disable the business. The prototype has no Ops screens, so nothing is built for this, and the applicant-facing flow does not change.",
      "tradeoff": "Ops needs no new screens or states, and the applicant never sees a half-removed application. What happens to the data an applicant already entered, and whether a deleted user can be restored or re-invited, is not decided here; engineering and Ops should say.",
      "by": "Ryan",
      "when": "2026-10-29"
    },
    {
      "id": "extra-bank-accounts",
      "area": "Flow",
      "where": "Step 4 · Payout account",
      "t": "Onboarding takes one bank account; more are added after approval",
      "b": "Step 4 asks for one settlement account, the one that must match the legal name. Applicants cannot add further accounts here. The step description says that once approved they can add more accounts for their other merchants. A business such as a golf and country club can have a restaurant with its own bank account, but that is a separate merchant under the same business, set up after approval, not a second payout account on this application. A bank account held by a different legal entity is not an extra account: it needs its own application. Underwriting therefore reviews one legal entity and one verified bank account (decision bank-verified-by-trullio). This replaces the earlier optional Add another bank account link built on 2026-11-02.",
      "tradeoff": "Adding accounts and merchants after approval is only described, not built. How underwriting treats a later account (extra check, new underwriting for a different trading name or merchant category) is not decided. A business with several accounts has to wait for approval before setting them up.",
      "by": "Ryan",
      "when": "2026-11-03"
    },
    {
      "id": "sign-in-centred",
      "area": "Layout",
      "where": "Sign in and Change your password",
      "t": "The sign-in screens are one narrow column, centred on the page",
      "b": "The tag, title, description and card on both sign-in screens (Sign in, and Change your password) sit in one 560px column centred on the page, so the card no longer hangs to the left of a wider block. Every screen that shows the sign-in card uses it. The other front-door screens (Which business do you want to sign in with, and the welcome page) keep their wider layout.",
      "by": "Ryan",
      "when": "2026-11-03"
    },
    {
      "id": "region-spelling-licence",
      "area": "Copy",
      "where": "ID type, photo ID hints, ClubReady lease row, More info needed lists",
      "t": "Licence is spelled by region: license in the US, licence in Canada",
      "b": "Applicant-facing text that names a licence now uses the US spelling \"license\" in the US and the Canadian spelling \"licence\" in Canada, through one helper, licWord(). This covers the Government ID type option, the photo ID hints on the welcome page and step 6, the ClubReady lease row and the More info needed accepted-document lists. The sample owner's ID type follows the region. Proper names such as Federal Firearms License stay as written.",
      "tradeoff": "A value chosen in one region would not match the other region's option label, which is safe today because changing region resets the prototype. The register and legal wording were not changed.",
      "by": "Ryan",
      "when": "2026-11-04"
    },
    {
      "id": "ca-tax-debt-wording",
      "area": "Copy",
      "where": "Step 5, Declarations",
      "t": "Canada asks about tax debts owed to the CRA, or court judgments",
      "b": "The tax question on step 5 reads \"Any outstanding tax liens or judgments?\" in the US and \"Any outstanding tax debts owed to the CRA, or court judgments?\" in Canada, because \"tax liens\" is US wording. The answer, the Amount and current status follow-up and the check that every declaration is answered are the same in both regions.",
      "tradeoff": "The Canadian wording is my draft and has not been reviewed by Risk Ops or compliance. It may be narrower than the US question (it names only the CRA, not provincial tax authorities), so Risk Ops should confirm what the question has to catch.",
      "by": "Ryan",
      "when": "2026-11-04"
    },
    {
      "id": "fees-point-to-contract",
      "area": "Copy",
      "where": "Step 7, merchant services agreement",
      "t": "The agreement points to the contract's fee schedule and states no fees of its own",
      "b": "Rates are agreed and signed in a contract before this form, so the application states none. Section 2 of the sample agreement now reads \"You pay the rates in your fee schedule.\" The line \"and nothing else. There is no monthly fee and no setup fee.\" is gone because the contract may set fees the prototype cannot know. The unused Rates and fee schedule document (with an invented 2.6% + 30¢ rate) is deleted; nothing opened it since the tick for it was removed.",
      "tradeoff": "The agreement no longer tells the applicant there are no monthly or setup fees, so they rely on their contract for that. The agreement text is still sample wording, not legal text, and compliance should confirm how the form refers to the contract.",
      "by": "Ryan",
      "when": "2026-11-04"
    },
    {
      "id": "ca-company-card-no-llc",
      "area": "Copy",
      "where": "Business type page, Company card",
      "t": "In Canada the Company card does not mention an LLC",
      "b": "The Company card on the business type page reads \"A registered business, such as an LLC, corporation or partnership.\" in the US and \"A registered business, such as a corporation or partnership.\" in Canada, because an LLC is not a Canadian structure. This matches step 1, where Canada lists only Partnership and Corporation.",
      "tradeoff": "The Canadian wording is my draft. Other Canadian structures (for example a cooperative) are not named; the card says \"such as\", so it is a cue, not a full list.",
      "by": "Ryan",
      "when": "2026-11-04"
    },
    {
      "id": "country-list-own-first",
      "area": "Flow",
      "where": "Step 2, owner cards · Nationality, Country of residence, ID issuing country",
      "t": "The applicant's own country is first in the country lists",
      "b": "The three country selects on an owner card list the applicant's region first: Canada, United States, United Kingdom, Australia, Other in Canada, and United States, Canada, United Kingdom, Australia, Other in the US. The sample owner's nationality, residence and ID country follow the region too, so the Canada sample no longer shows a US passport country.",
      "tradeoff": "Only five countries are listed, as before, so an owner from anywhere else must choose Other. An owner card for someone else still starts with no country chosen; only the applicant's own card is prefilled.",
      "by": "Ryan",
      "when": "2026-11-04"
    },
    {
      "id": "consent-count-follows-region",
      "area": "Copy",
      "where": "Step 5, consents card",
      "t": "The consents card heading and note match the number of boxes shown",
      "b": "In the US the card shows two consents (closed merchant accounts list and OFAC screening) under \"Two consents we have to collect\". Canada shows only the first, so its heading reads \"A consent we have to collect\" and its note says \"This is a consent, not a credit check. It doesn't touch your personal credit score.\" Update, 2026-11-11: Ryan confirmed the consent ticks stay on step 5 now that Sign it off on step 7 holds the terms ticks. He gave no reason.",
      "tradeoff": "The wording is branched by region, so a third consent added later needs both versions edited. That Canada is not asked for the sanctions consent is an earlier call that no compliance document backs; if Canada gets it later, both pieces of copy go back to the US wording.",
      "by": "Ryan",
      "when": "2026-11-04"
    },
    {
      "id": "ca-bn-program-account",
      "area": "Flow",
      "where": "Step 1, Canada · Business Number field",
      "t": "The Business Number field accepts a number with its program account and keeps the first 9 digits",
      "b": "A Canadian business number is often printed with a program account, such as 123456789RT0001 or 123456789RC0001. In Canada the field now accepts nine digits followed by two letters and four digits, keeps only the first nine when the applicant leaves the box, and the note under the field says \"Just the first 9 digits. Leave off RT0001 or similar.\" Any other entry still has to be exactly nine digits. The US EIN field is unchanged.",
      "tradeoff": "The rule comes from general knowledge of the CRA format, not an Xplor document, so it should be confirmed. The program account is dropped, so Ops will not see which program the applicant typed. A mistyped suffix is accepted without a check.",
      "by": "Ryan",
      "when": "2026-11-04"
    },
    {
      "id": "ca-sample-data-canadian",
      "area": "Flow",
      "where": "Canada path · sample business, sample owners",
      "t": "The Canada path uses invented Canadian addresses, phones, bank and ID number",
      "b": "With the region set to Canada, the sample business and both sample owners use made-up Vancouver, BC details: the registered address (418 Water St, Suite 210, V6B 1A1), the 604 phone numbers, the owners' home addresses with V postal codes, a Canadian bank name and an ID number with no Oregon prefix. The US path is unchanged (Portland, OR). The Canadian sample business is a corporation.",
      "tradeoff": "All values are invented and the addresses are not checked against real streets. The sample bank's routing, institution and transit numbers were left as they were.",
      "by": "Ryan",
      "when": "2026-11-04"
    },
    {
      "id": "descriptor-placeholder-example",
      "area": "Copy",
      "where": "Step 3, Billing descriptor",
      "t": "The billing descriptor placeholder starts with \"e.g.\" so it does not read as a typed value",
      "b": "The empty billing descriptor box suggests the business name in capitals. It now reads \"e.g. RIVERSIDE PILATES\" instead of the bare name, because the placeholder grey is dark enough that the bare name looked like something the applicant had already typed. The grey is unchanged: Atlas has no placeholder token and a lighter colour would fail contrast. Parked on 2026-11-11: the whole How you'll appear section was taken out of step 3 (see descriptor-section-parked). Ryan wants to use it somewhere else later; its spec and code are in parked/billing-descriptor.md.",
      "tradeoff": "The \"e.g.\" adds four characters before the suggestion, which shortens how much of a long name shows in the box before it is cut off.",
      "by": "Ryan",
      "when": "2026-11-04"
    },
    {
      "id": "ca-statement-neighbours-vancouver",
      "area": "Flow",
      "where": "Step 3, Canada · statement preview",
      "t": "The Canada statement preview shows Vancouver transactions beside the descriptor",
      "b": "The two sample transactions above and below the billing descriptor in the statement preview are Save-On-Foods and a Compass Card top-up in Vancouver, BC when the region is Canada, because the Canada sample business is in Vancouver (decision ca-sample-data-canadian). They were Toronto shops. The US keeps Portland, OR.",
      "tradeoff": "The names are real chains used only as scenery; swap them for invented names if real brand names should not appear in the prototype.",
      "by": "Ryan",
      "when": "2026-11-04"
    },
    {
      "id": "descriptor-count-warning-token",
      "area": "Flow",
      "where": "Step 3, Billing descriptor character count",
      "t": "The descriptor character count uses the Atlas warning text colour",
      "b": "The count under the statement preview turns to the warning text colour from 19 characters, and stays that colour, bolder, past 22, when the card network cuts the rest. It used the raw orange-700 palette colour before; the semantic token has the same value, so nothing looks different. Going over cuts the text but does not block Save and continue, so it is a warning and not an error. Parked on 2026-11-11: the whole How you'll appear section was taken out of step 3 (see descriptor-section-parked). Ryan wants to use it somewhere else later; its spec and code are in parked/billing-descriptor.md.",
      "tradeoff": "Near and over share one colour, so the only signal that text is now being cut is the heavier weight and the struck-through characters in the preview.",
      "by": "Ryan",
      "when": "2026-11-04"
    },
    {
      "id": "layout-shift-accepted",
      "area": "Flow",
      "where": "Step 3, POS terminal choice · Step 6, photo ID upload",
      "t": "Content that appears or goes away moves what is below it, and the page does not reserve space",
      "b": "Choosing \"None\" for the point-of-sale terminal removes the follow-up that was under it, and uploading a photo ID replaces the upload button with a received row, so the fields below move up or down. Space is not held back to stop that. This repeats an earlier call: after the Maya test round, reserving space on steps 5 and 6 was rejected and reverted on purpose (the handover does not record why). Ryan closed these two cases the same way on 2026-11-04.",
      "tradeoff": "Someone looking at the lower part of the screen sees it shift. If a tester loses their place after a choice or an upload, revisit this.",
      "by": "Ryan",
      "when": "2026-11-04"
    },
    {
      "id": "email-only-notifications",
      "area": "Status",
      "where": "Under review screen · What happens next, and the timeline",
      "t": "Xplor sends the applicant email only, never a text",
      "b": "The under review screen and its timeline say \"we'll email you\" when a decision is ready. They used to say \"we'll email and text you\". Ryan confirmed on 2026-11-04 that Xplor will not text the applicant during onboarding, only email. Because no text is promised, the screens do not need a line about what a text will or will not ask for.",
      "tradeoff": "An applicant who does not check email gets no second prompt. The Get help dialog still says Xplor never asks for a full SSN, password or bank login over phone or text, which stays true and is general fraud advice.",
      "by": "Ryan",
      "when": "2026-11-04"
    },
    {
      "id": "sole-proprietor-card-wording",
      "area": "Copy",
      "where": "Business type page, Individual / Sole proprietor card",
      "t": "The sole proprietor card says what to check, not that you are the only owner",
      "b": "The card reads \"You run the business yourself and haven't registered it as a company or corporation.\" It used to read \"You are the sole owner of an unincorporated business.\" In the first persona test, Maya paused because \"sole owner\" also describes someone who owns an LLC alone, and \"unincorporated\" is the word least likely to be known. The new line names what to check, whether the business has been registered as a company, and it works in both the US and Canada.",
      "tradeoff": "An LLC owner who thinks of the LLC as \"just my business\" could still read the line as theirs, though \"registered as a company\" should stop them. Not re-tested with a persona.",
      "by": "Ryan",
      "when": "2026-11-04"
    },
    {
      "id": "company-structure-nine-types",
      "area": "Flow",
      "where": "Step 1 · Company · Business type / legal structure",
      "t": "The company structure dropdown covers the ODIN ownership types, with public and private spelled out",
      "b": "For a company the structure dropdown lists Private corporation, Public corporation (publicly traded), Private partnership, Public partnership (publicly traded), Limited liability company (LLC, US only) and Limited liability partnership (LLP). Sole proprietor is the second business type card, and tax-exempt and government come from the non-profit pills, so together the three business types cover the nine ODIN ownership types: PRIVATE_CORPORATION, PUBLIC_CORPORATION, PRIVATE_PARTNERSHIP, PUBLIC_PARTNERSHIP, LLC, LIMITED_LIABILITY_PARTNERSHIP, SOLE_PROPRIETORSHIP, TAX_EXEMPT and GOVERNMENT. The cards stay the first choice because they decide which questions follow.",
      "tradeoff": "Nothing in the prototype changes by structure yet: every company structure gets the same questions. Ops confirmed on 2026-11-04 that nothing differs beyond the three business type groups, so public companies and partnerships do not need different questions. \"Public\" and \"private\" add jargon to the list, and most applicants are private. LLP in Canada is from general knowledge and should be confirmed.",
      "by": "Ryan",
      "when": "2026-11-04"
    },
    {
      "id": "nonprofit-type-pills",
      "area": "Flow",
      "where": "Step 1 · Non-profit or government · Type of organization",
      "t": "Non-profit or government asks for the type of organization with two round pills, not a dropdown",
      "b": "The Non-profit or government route has a required Type of organization question with two round pills, the same control as Yes / No: Tax-exempt, and Government body. They map to TAX_EXEMPT and GOVERNMENT. Two choices are quicker to scan as pills than as a closed menu. The line under them says charities, foundations and other non-profits are tax-exempt organizations. The structure used to be filled in automatically as \"Non-profit\"; the applicant now chooses it. Save and continue stays off until one is chosen.",
      "tradeoff": "One more required answer on the non-profit route. Step wording written for non-profits (Donations, Trustees) is not yet different for a government body. The tax-exempt label is Ryan's reading of the ODIN type; whether a government body is also tax-exempt in ODIN is not known. On 2026-11-04 Ryan considered splitting Non-profit and Government into two cards (four in all) and decided to keep the pills, because both get the same questions; Ops confirmed on 2026-11-04 that there is no difference in questions beyond the three groups, so the four-card split is closed and the pills stay.",
      "by": "Ryan",
      "when": "2026-11-04"
    },
    {
      "id": "state-of-incorporation-asked",
      "area": "Flow",
      "where": "Step 1 · Registered details",
      "t": "The state of incorporation is its own required field, as well as the registered address",
      "b": "The registered details card asks for the state of incorporation (State registered in, for a non-profit or government body) as a required dropdown of the US states, in addition to the registered address, which is also required. Canada has no state field, so the Canada card is unchanged. The layout follows the field. A US company has Legal business name beside the EIN, Doing business as beside Business type / legal structure, then Date of incorporation beside State of incorporation. A non-profit or government body has the legal name across the full width, Doing business as beside the EIN, Type of organization across the full width below them, and Date registered beside State registered in. Canada has legal name beside the Business Number, Doing business as beside structure, and the date on its own. The sole proprietor card has the full-width legal name, then Trading name beside the EIN (decision ein-in-registered-details).",
      "tradeoff": "The applicant gives the state twice, once here and once inside the address text, so the two can disagree. It was removed on 2026-11-04 so it could be read from the address, and Ryan brought it back on 2026-11-05. Nothing checks that the state matches the address.",
      "by": "Ryan",
      "when": "2026-11-05"
    },
    {
      "id": "review-screen-email-then-respond",
      "area": "Flow",
      "where": "Under review page",
      "t": "The under review page says questions arrive by email and are answered on the page, and names no vendor",
      "b": "The line at the bottom of the under review card now reads \"If we have a question, we'll send you an email. Reply to it and we'll carry on from there.\" (Reworded 2026-11-09, see more-info-by-email: it used to say \"and you'll respond to us here\", when the applicant answered on the page.) It used to say the question would appear on the page as one clear request, which left out how the applicant would know there was one. The email is what brings them back and is also where they answer. The Application received line also stops naming Trullio and says it was sent to our verification partner, matching the rest of the prototype's wording for the identity check.",
      "tradeoff": "It promises an email for every question, so the More info needed email has to be sent whenever Ops asks for something (the template exists; nothing connects Ops picks to it yet). Step 7's What happens next panel and the why-we-ask notes still name Trullio; only the under review page was changed.",
      "by": "Ryan",
      "when": "2026-11-04"
    },
    {
      "id": "dialogs-close-on-outside-click",
      "area": "Flow",
      "where": "Every dialog",
      "t": "A dialog closes when you click anywhere outside it, as well as on its Close button",
      "b": "The Get help, Save & Exit, confirmation, document preview, hand-off and design notes dialogs all close on a click on the dimmed area around them, the same as pressing their Close button or Escape. The press has to start on the dimmed area too, so selecting text inside a dialog and letting go outside it does not close it. Closing this way does the same as Close: nothing is saved or sent, and a confirmation counts as cancelled.",
      "tradeoff": "A stray click outside a dialog that holds something half done, such as a hand-off with an email typed in, closes it and loses what was typed. The dimmed area gives no hint that it will do this.",
      "by": "Ryan",
      "when": "2026-11-05"
    },
    {
      "id": "help-no-chat",
      "area": "Copy",
      "where": "Get help dialog",
      "t": "The Get help dialog offers a phone number and email, with no chat",
      "b": "The Talk to a person dialog lists Call us and Email, with their hours and reply time. The Chat row (replies in about 3 minutes) is gone because Xplor has no chat service, and the warning at the bottom now reads that Xplor will never ask for a full SSN, password or bank login over phone or text.",
      "tradeoff": "Phone hours are the only live option, so someone outside those hours has only email, with a reply within one business day.",
      "by": "Ryan",
      "when": "2026-11-05"
    },
    {
      "id": "required-badge-warning",
      "area": "Visual",
      "where": "Step 6 · Supporting documents",
      "t": "The Required badge on a document is the warning colour, and turns into a green Uploaded badge once a file is in",
      "b": "On each document row the Required badge, beside the title, is the warning colour (light warning background, warning text) instead of grey, to show the file has to be added before the applicant can continue. When a file has been added, that same badge turns green and reads Checked, with a tick. Changed 2026-11-11: it has no tick and reads the number of files in, such as 1 uploaded or 2 uploaded, so the applicant can see how many files the row holds. It replaces the Checked pill that used to sit at the top right of the row, so a finished row has no badge on the right at all. While a file is uploading or being read, the busy pill still shows on the right. A document that is Not needed stays grey. Superseded in part on 2026-11-11 by no-uploaded-badge: the green Uploaded badge is gone. The Required badge simply disappears once a file is in.",
      "tradeoff": "Several orange badges at once on an empty step make the page look more urgent than it is, and the warning colour is also the one used for caution elsewhere, so it can read as a problem rather than a to-do. A finished row no longer says Required anywhere, so the badge stops telling the applicant the file was mandatory; the green tick says it is dealt with.",
      "by": "Ryan",
      "when": "2026-11-05"
    },
    {
      "id": "type-asked-on-business-type-page",
      "area": "Flow",
      "where": "Business type page and step 1 · Registered details",
      "t": "The specific type is asked on the business type page, under the chosen card, not in step 1",
      "b": "Decided by Ryan on 2026-11-09 after comparing it with asking in step 1; it replaces the Specific type asked trial (type-asked-up-trial, 2026-11-05) and the Prototype option that switched between the two is removed. On the business type page the card for Company opens up when it is chosen and holds What kind of company is it? as a dropdown of the structures, the card for Non-profit or government opens up and holds What type of organization is it? as the two pills (Tax-exempt, Government body), and Individual / Sole proprietor asks nothing more. Continue stays off until the follow-up is answered. Step 1 no longer shows the structure or the pills, so the page writes one ownership type value that maps straight to the nine ODIN types, which is what engineering's ops tool uses. Step 1's name, date and state fields close up into two columns. The address ?typeask=up no longer does anything.",
      "tradeoff": "The applicant answers the structure on the business type page, before step 1, and someone unsure whether they are an LLC or a private corporation has to decide without help; it is the same warning as the note under the list, that changing the type later loses what was entered. It is one engineering field instead of two answers that must be combined. The question for engineering, whether the real registry lookup returns the entity type, no longer matters: the lookup was removed on 2026-11-05 (decision ein-in-registered-details), so the type is chosen or typed by the applicant either way.",
      "by": "Ryan",
      "when": "2026-11-09"
    },
    {
      "id": "mcc-from-division",
      "area": "Flow",
      "where": "Step 1 · Merchant category code",
      "t": "The category list is the set of codes for the applicant's division",
      "b": "From the refinement session with engineering: the business description box is removed and the merchant category code (MCC) field is a searchable list only. The codes in it are inherited from the division the business sits in. An Ops user creates the division in Odin, so each one has a finite list of codes, perhaps 20 or 30, and the applicant never searches the whole card-network list. Typing narrows the list by name or by code, and opening an empty field shows every code in the division. The helper text under the field used to link to a country-specific website; that link was removed on 2026-11-06 (decision mcc-no-help-link).",
      "tradeoff": "The three division lists in the prototype (Standard 32 codes, ClubReady 14, Club Essentials 20) are invented stand-ins, not Ops's lists, and every MCC in them comes from mcc-codes.js, which was written from general knowledge and is unchecked. If a division list has only one code the field could be pre-filled; not designed. The division changes the list only; the prototype's Division option still opens on step 6 with the sample business filled in, so step 1 is reached by going back.",
      "by": "Ryan",
      "when": "2026-11-05"
    },
    {
      "id": "slice-1-no-signer-question",
      "area": "Flow",
      "where": "Step 2 · Owners & signatory (Slice 1)",
      "t": "Slice 1 does not ask who will be signing",
      "b": "From the refinement session with engineering: in Slice 1 only one person gets access to the form, so that person is the signer. The Who'll be signing? card (Will you be signing it yourself?, and the signatory name and title when the answer was No) is removed from step 2 in Slice 1. Step 7 still asks for the signatory name and title and the typed signature; the name starts as the first owner and the title as the applicant's own title, and both stay editable. Slice 2 (invites) keeps the card, because there the person filling in the form may not be the one who signs.",
      "tradeoff": "In Slice 1 the signer is always whoever opened the form, so a company where the owner is not the person completing the form has to change the name on step 7 by hand. In Slice 1 step 2 is called Owners (Leaders for a non-profit) in the rail, the page title and the step 7 review row; Slice 2 keeps Owners & signatory.",
      "by": "Ryan",
      "when": "2026-11-05"
    },
    {
      "id": "owner-title-free-text",
      "area": "Copy",
      "where": "Step 2 · Owner card, Title / role",
      "t": "Title is free text for every business type",
      "b": "From the refinement session with engineering: the Title / role field on the owner card is a plain text box for companies, non-profits and government bodies, not a dropdown of Owner / CEO, Director, Managing partner, Company secretary and Officer. People hold titles the list did not cover. Starting values stay as they were (Owner / CEO for Add myself on a company, Director for a plain add and for non-profits) and the applicant types over them. The title still carries into the step 7 signatory title.",
      "tradeoff": "Free text means titles will not be consistent, so anything downstream that reads the title (screening, reports) cannot rely on a fixed set of values. It is a required field.",
      "by": "Ryan",
      "when": "2026-11-05"
    },
    {
      "id": "sole-owner-title-share",
      "area": "Flow",
      "where": "Step 2 · Owner card (Individual / Sole proprietor)",
      "t": "A sole proprietor also gives a title and an ownership percentage, prefilled",
      "b": "From the refinement session with engineering: the sole proprietor's owner card now has the Title / role and Ownership percentage fields the other business types have, so every owner record carries the same data. They start as Owner and 100, and both can be edited. The card header still says Sole owner. The step 7 signatory title starts as Owner.",
      "tradeoff": "Two fields the applicant has no real choice about, shown only because engineering wants the same record for every type. The prefill keeps it to nothing to type. A sole proprietor who changes the percentage below 25 is told to enter 25 or more, the same rule as everyone else.",
      "by": "Ryan",
      "when": "2026-11-05"
    },
    {
      "id": "ein-in-registered-details",
      "area": "Flow",
      "where": "Step 1 · Registered details",
      "t": "The EIN or business number is a field in Registered details, and there is no registry lookup",
      "b": "From the refinement session with engineering. The lookup went because of what it can actually do. Trullio can only prefill an address from a lookup, it needs the business's name and country to do it, and it then returns every business that shares that name in that country. The applicant could be shown a long list of possible matches, or have the wrong business prefilled, all so that they save typing an address. That is a bad trade, so the lookup, the Look up button, Enter details manually, the Is this your business? question and the match toasts are removed, and the whole of step 1 shows from the start. The EIN (Business Number in Canada) is now an ordinary field in the Registered details card, with the legal name, Doing business as, structure, date and state. A company or a non-profit has to give one; for a sole proprietor it is optional, and the hint says that without one they give their SSN (SIN in Canada) in step 2 instead. It is checked for nine digits, an SSN-shaped number is refused with a plain message, and a Canadian number pasted with its program account (RT0001) is cut back to the nine digits as the person leaves the field. The layout puts the legal name beside the EIN for a company, and Doing business as beside it for a non-profit and a sole proprietor. Nothing is filled in from the number. The address is typed in the Addresses card. The copy that went with the lookup is changed: the welcome page's registration line now says what Step 1 asks for, the why-we-ask note says the details should match the tax documents added in step 6, the line about protecting the EIN at the lookup is gone, and the confirmation's checking line names the business details for a company or non-profit. With no registry match to waive it, the EIN letter is now always required in step 6 for a company or non-profit in the US (a sole proprietor adds it only if they gave an EIN). There is no separate proof-of-registration document: the EIN letter (in Canada, a CRA business number confirmation) and the US W-9 are the documents that back the details.",
      "tradeoff": "The applicant types more, and a typo in the name, structure, date or address is no longer caught by a match. Nothing checks the entity's existence against a registration document. Ops should confirm that the EIN letter (CRA business number confirmation in Canada) and the W-9 are enough. The earlier decisions that described the lookup are removed (lookup-first, lookup-not-me, lookup-progressive, lookup-clears-refused-number, welcome-registry-promise-softened). If Trullio can later return a single reliable match, an address prefill could come back as an option; it is not designed. The EIN is checked only for nine digits, not against any record. Update, 2026-11-11: Ryan added a Find your business search back on step 1 as a type-ahead with a Prototype option to switch it off (business-lookup-typeahead), after reading Trulioo's KYB Prefill page. The EIN is still a typed field and is not filled in from it.",
      "by": "Ryan",
      "when": "2026-11-05"
    },
    {
      "id": "ca-bn-confirmation-document",
      "area": "Flow",
      "where": "Step 6 · Supporting documents (Canada)",
      "t": "Canadian businesses add a CRA business number confirmation, the counterpart of the US EIN letter",
      "b": "In the US, a company or non-profit adds the IRS EIN letter; a Canadian one now adds a CRA business number confirmation. The row accepts any one of four documents: the CRA business registration confirmation printed from Business Registration Online, the CRA's RC145 confirmation letter, a Filing and Balance Confirmation letter downloaded from CRA My Business Account, or articles of incorporation that show the business number. It follows the same rule as the EIN letter: required for a company or non-profit, and for a sole proprietor only if they gave a business number in step 1. The US W-9 is still US only, so Canada has no tax-form row.",
      "tradeoff": "The four documents come from Ryan's notes drawn from public pages, not from an Xplor or CRA source, and the row title and wording are my draft. Ops should confirm which of them underwriting accepts, and whether Trulioo's check of the business number could make the upload unnecessary. Accepting articles of incorporation means a registration document is allowed here even though the US has no separate registration proof.",
      "by": "Ryan",
      "when": "2026-11-05"
    },
    {
      "id": "top-nav-save-exit",
      "area": "Layout",
      "where": "Every screen except the welcome email · top of the page",
      "t": "A thin top bar carries the logo and Save & Exit",
      "b": "Every screen except the welcome email has a thin bar across the full width of the window, with the Xplor Pay logo at the left and a Save & Exit button at the right, lined up with the edges of the step content below. It stays in view as the page scrolls, and the progress list and the pinned step title sit under it. Save & Exit shows only where there is an application to save: the seven steps (changed on 2026-11-09 by save-exit-after-first-step: it no longer shows on the welcome page or the business type page). The sign-in screens, the business picker, the status screens and the invited owner's screens show the logo alone. Save & Exit replaces the Finish later button in the footer, so the footer now holds only Back and Save and continue. It opens the same dialog, which says the answers are saved and how to log back in. The logo that sat above the progress list moved into the bar.",
      "tradeoff": "The way out is at the top of the page while the footer holds the way forward, so someone who has scrolled to the bottom to stop has to look up for it. Nothing is lost by leaving, because answers already save as they are entered. The invited owner's screens have no Save & Exit even though their answers save too; that is open if Slice 2 needs one.",
      "by": "Ryan",
      "when": "2026-11-05"
    },
    {
      "id": "step-time-in-rail-only",
      "area": "Copy",
      "where": "Steps 1 to 7 · step title",
      "t": "The step title shows only Step N of 7, with all timings in the progress list",
      "b": "The clock and minutes that sat beside the Step N of 7 label above each step title are gone. The time left, and the minutes for each step, are only in the progress list at the left, so the main column shows just where you are.",
      "tradeoff": "Someone who reads only the main column no longer sees how long the step will take. The progress list carries it on every step.",
      "by": "Ryan",
      "when": "2026-11-05"
    },
    {
      "id": "address-lookup",
      "area": "Flow",
      "where": "Step 1 · Registered / legal address",
      "t": "The registered address box suggests addresses as you type",
      "b": "After three characters, the registered address (the business address for a sole proprietor) shows a short list of matching addresses under the box. Picking one fills the address in, split into separate boxes (see address-split-fields). A search that finds nothing says so and points to Enter address manually. Typing 123 lists several sample addresses for the region. Arrow keys move through the list, Enter picks the highlighted address and Escape closes it. The trading address and the owners' home addresses work the same way.",
      "tradeoff": "The prototype uses a short fixed list per country, so a real address usually finds nothing. The real service and its coverage, in the US and Canada, are for engineering to name. An address picked from the list may not match the registration exactly, and nothing checks it against the registry.",
      "by": "Ryan",
      "when": "2026-11-05"
    },
        {
      "id": "address-split-fields",
      "area": "Flow",
      "where": "Step 1 · Registered / legal address and Trading address; Step 2 · Home address",
      "t": "An address is entered as separate boxes, filled by search or typed in by hand",
      "b": "Every address question starts as a search box with an Enter address manually link under it. Picking a search result, or choosing the link, opens one box for each part: Street address 1, Street address 2 (optional, for an apartment, suite or unit), city, state or province (a list), and ZIP or postal code. A picked address fills the boxes in, and every box can be edited. A Clear and search again link empties the address and goes back to the search box. The same pattern is on the registered or business address and the trading address at step 1, and on each owner's home address at step 2. Behind the scenes the address is still one line, so the review step, the W-9 and a sole proprietor's home address copy carry on as before. An address counts as complete when it has a street, city, state or province, and ZIP or postal code; Street address 2 is optional.",
      "tradeoff": "An address now takes up to five boxes where it took one, which is longer to fill in by hand than typing a single line. Splitting a one-line address back into parts guesses from the commas and a trailing state and ZIP, so an unusual address may land in the wrong box and need correcting. The state and province lists cover the 50 states, DC and the 13 provinces and territories, but not US territories or military addresses.",
      "by": "Ryan",
      "when": "2026-11-06"
    },
    {
      "id": "business-type-change-warning",
      "area": "Flow",
      "where": "What type of business are you? screen",
      "t": "A small note warns that changing the business type later loses what has been entered",
      "b": "Under the list of business types, above the Back and Continue buttons, a small line of plain caption text says: Choose carefully. If you carry on and later come back here to change your business type, anything you've entered will be lost. It has no box, icon or colour so it does not compete with the choice itself. It is true to how the prototype behaves: choosing a different type after one was already chosen clears the answers.",
      "tradeoff": "Small and quiet means some people will not read it. The alternative, asking for a confirmation each time someone changes type, would be louder and slower for the people who did choose on purpose.",
      "by": "Ryan",
      "when": "2026-11-06"
    },
    {
      "id": "document-add-file-grid",
      "area": "Visual",
      "where": "Step 6 · Supporting documents",
      "t": "Add file stays on every document, and uploaded files sit two to a row",
      "b": "The button on each document row now says Add file and stays after a file is in, so any number of files can be added to one document. Each uploaded file is a tile showing its name with a Remove link, or Uploading for a moment while it arrives. Tiles are half the width of the card, two to a row, and the next file fills the space beside the last one before starting a new row. On a phone they stack one to a row. The row counts as done once one file has uploaded, so the Required badge turns into Uploaded after the first file. The W-9 keeps Review and sign next to Add file until a file is in, and a signed W-9 shows as a file tile too. A second file with the same name gets -2 added to it. Superseded in part, 2026-11-11 (document-drop-zone): the Add file button is replaced by a drop zone under the text, and the file tiles stack one to a row below it, not two to a row.",
      "tradeoff": "The step never says how many files a document needs, so someone could add one page of a three-page statement and carry on. Uploading more than one file is not limited, and the prototype has no file size or type check.",
      "by": "Ryan",
      "when": "2026-11-06"
    },
    {
      "id": "top-nav-follows-content-column",
      "area": "Visual",
      "where": "Top bar, every screen except the emails",
      "t": "The logo and Save & Exit line up with the left and right edges of the content below",
      "b": "The top bar still runs the full width of the window, but the logo and the Save & Exit button now sit on the edges of the content column of whichever screen is showing: the full width of the step list and form on the flow screens (1220 pixels at most), the 720 pixel column on the welcome, business type and owner screens, the 560 pixel column on sign-in and change password, and the 820 pixel column on the status screens. The side padding matches the page's own, so the edges stay lined up as the window narrows.",
      "tradeoff": "The logo sits in a different place on different screens, which is the point, but it does shift a little when someone moves from the welcome screens into the flow.",
      "by": "Ryan",
      "when": "2026-11-06"
    },
    {
      "id": "tax-exempt-pill-label",
      "area": "Copy",
      "where": "Step 1 and the business type screen · Type of organization",
      "t": "The pill says Tax-exempt, and the line about charities and foundations is gone",
      "b": "The two pills on the non-profit route now read Tax-exempt and Government body. The helper line under them, Charities, foundations and other non-profits are tax-exempt organizations, is removed on both the business type screen and step 1. The answer still maps to TAX_EXEMPT.",
      "tradeoff": "Without the line, someone running a charity or foundation has to work out for themselves that Tax-exempt is the pill for them.",
      "by": "Ryan",
      "when": "2026-11-06"
    },
    {
      "id": "pos-terminal-field-removed",
      "area": "Flow",
      "where": "Step 3 · How you take payments",
      "t": "The POS / terminal type question is gone",
      "b": "Removed because it is no longer needed (Ryan, 2026-11-06). It was a dropdown (Xplor Pay countertop terminal, Xplor Pay mobile reader, third-party terminal, None) that appeared when card present was above 0%. The earlier decision to end the list with None went with it.",
      "tradeoff": "What equipment the business will use is no longer captured at application, so anything that depends on it, such as ordering readers, has to ask later.",
      "by": "Ryan",
      "when": "2026-11-06"
    },
    {
      "id": "mcc-no-help-link",
      "area": "Flow",
      "where": "Step 1 · Merchant category code (MCC) field",
      "t": "The MCC hint no longer links to a website; it tells people to search the list by a word",
      "b": "The link under the field (to a US or Canadian industry code website) is removed. The applicant can only choose from the codes set up for their division, so a code found on an outside website may not be in the list and would send them nowhere. The hint now reads: Pick the closest match from the list. Not sure which one fits? Search by a word that describes what you sell, like “fitness” or “retail”. Nothing opens in a new tab.",
      "tradeoff": "Someone who really cannot match their business to a name in the list now has no further help on the page, and the list still has no way out when no code fits. Options not built: a Contact us link in the hint, or a short note that Xplor can confirm the category later. Ops should say which is acceptable.",
      "by": "Ryan",
      "when": "2026-11-06"
    },
    {
      "id": "owner-done-button",
      "area": "Flow",
      "where": "Step 2 · Owner cards",
      "t": "Each open owner card ends with a secondary Done button that closes the card; progress is saved as the applicant goes",
      "b": "At the bottom left of every open owner card there is a Done button, in the secondary (neutral) style rather than the purple primary style, so it does not compete with Save and continue. It only closes the card, so the applicant can see that person is finished and move to the next. It does not save anything: each field is saved as it is filled in, Save and continue and Save & Exit both keep every owner, and the Why we ask note says progress is saved after every field. It does not check the card, so an incomplete owner can be closed and the problems only appear when the applicant continues. An open owner card has no purple outline, because it is not a selected card in the way a radio card is; it keeps the same plain border as a closed one. The button is not shown on the page an invited owner sees. (It was a Save button, then Save owner, until 2026-11-10; it was renamed because a save button implied the owner would be lost without it, when saving a whole step is already possible at any point.) Update 2026-11-11: this button no longer sits at the bottom of the full card; each section has its own Done (see section-done-buttons), and the one in the last section closes the card.",
      "tradeoff": "Done changes nothing in the data, so an applicant may wonder whether it saved. The page's Saved tell in the progress column covers this, but it no longer flashes on Done.",
      "by": "Ryan",
"when": "2026-11-06"
    },
    {
      "id": "address-links-below-hint",
      "area": "Visual",
      "where": "Step 1 and Step 2 · Address questions",
      "t": "Clear and search again sits below the helper text, outside the input (Enter address manually has since moved, see address-search-layout)",
      "b": "On every address question the Enter address manually link, and the Clear and search again link once the address boxes are open, now come after the helper text rather than straight under the input. The helper text belongs to the input component; a link or button like these is a separate element and sits outside it, so it follows the helper text. Where an address question has no helper text the link sits directly under the input as before.",
      "tradeoff": "The link is a little further from the search box, and where the helper text is long it is pushed down the page, so someone could read past it. Under the open address boxes the helper text now sits above Clear and search again, rather than the link being the last thing in the group.",
      "by": "Ryan",
      "when": "2026-11-06"
    },
    {
      "id": "address-search-layout",
      "area": "Visual",
      "where": "Step 1 and Step 2 · Address questions",
      "t": "The address search has its icon on the left, and Enter address manually sits to the right of the box",
      "b": "In the address search the magnifying-glass icon moves from the right end of the box to the left, beside the text the person types. The Enter address manually link moves from below the helper text to the right of the search box, on the same line, so the box and the way out of it are read together. On a narrow screen the link wraps to a line under the box. This replaces the placement in address-links-below-hint for Enter address manually only; Clear and search again, shown with the open address boxes, still follows the helper text.",
      "tradeoff": "The search box is narrower by the width of the link. The link is now further from the helper text, so someone reading top to bottom meets the way out before the guidance. Two different positions for the two address links is less consistent than one.",
      "by": "Ryan",
      "when": "2026-11-06"
    },
    {
      "id": "limits-ack-in-volumes",
      "area": "Flow",
      "where": "Step 3 · Your card volumes",
      "t": "The limits tick moves into the card volumes section, under the numbers that set the limits",
      "b": "The tick I've read the transaction and monthly limits for my business used to sit at the bottom of the How you'll appear to customers section, away from the numbers. It is now the last item in Your card volumes, directly under Estimated monthly card volume, Average transaction amount, Maximum single transaction and Card present %. It behaves as before (see limits-from-entries): greyed out until the monthly volume and maximum transaction are filled in, showing the two limits as the applicant types, and clearing if either number changes. Update, 2026-11-11: Have you accepted card payments before? and its follow-ups now sit in this section too, above the tick, so the tick is still the last item (see card-history-in-volumes).",
      "tradeoff": "The tick now follows a Card present % box that has nothing to do with the limits, so the applicant may think the percentage feeds them too. The reassurance line at the foot of the card (nothing breaks if you go over) now sits below the tick instead of the numbers.",
      "by": "Ryan",
      "when": "2026-11-06"
    },
    {
      "id": "address-city-state-zip-one-line",
      "area": "Visual",
      "where": "Step 1 and Step 2 · Address questions",
      "t": "City, state and ZIP code sit on one line, in that order",
      "b": "In the open address boxes, City, State and ZIP code now share one row, in that order, like a US address written out. Ryan structured it this way because that is how a US address is typically structured, so the form matches the applicant's mental model. City takes half the row and State and ZIP code a quarter each. In Canada the same row reads City, Province, Postal code. Street address 1 and Street address 2 keep a full row each. On a narrow screen (under 560px) all the boxes stack, one to a row.",
      "tradeoff": "The State and ZIP code boxes are narrow, so a long province or an unusual postal code has less room, and a long city name may be cut off in the City box. The state and province lists show full names, which fit at desktop width, but the longest names have little spare room.",
      "by": "Ryan",
      "when": "2026-11-06"
    },
    {
      "id": "website-required-with-none-box",
      "area": "Flow",
      "where": "Step 1 · How we reach you",
      "t": "The website is required, and a box says there is none",
      "b": "The primary website URL is now a required field. Under it, a box reads I don't have a website. Ticking it fills the website box with N/A and locks it; unticking clears it and unlocks it. This replaces the earlier optional website, where testers who had none pasted a Facebook link or other text to get on. A website typed without https:// still gets it added as the person leaves the box; N/A does not. The helper line under the box (We take a look at the site to check what you sell) was removed on 2026-11-11. A later idea, to ask first whether the business sells or advertises online and only require the website on Yes, was tried on 2026-11-06 and reverted the same week: the website is mandatory for everyone. Update, 2026-11-11 (later): the I don't have a website tick now sits in line to the right of the website box, not below it (see tick-beside-field).",
      "tradeoff": "An applicant with a Facebook page or a booking link can still paste it as the website. Underwriting gets N/A on file for a business with none, so it can tell that apart from a field left empty. Ops should say whether a missing website needs anything else from the applicant, such as a description of how they sell.",
      "by": "Ryan",
      "when": "2026-11-05"
    },
    {
      "id": "more-info-by-email",
      "area": "Flow",
      "where": "Under review screen · More info needed",
      "t": "In Slice 2 the applicant answers a request for more information by replying to the email, and the waiting screen tells them so",
      "b": "Ops asks for more information by email. The applicant replies to that email, and its text and attachments appear in the Ops person's portal, so the applicant no longer sends anything from the screen. When Ops has asked, the Under review screen changes: the heading reads We need a little more from you, the active step in the timeline reads Waiting for your reply (We've emailed you what we need. Reply to that email, attaching any files, and we'll carry on the checks from there.), and the callout reads We've sent you an email asking for more information. Check your inbox and reply to it to speed things up. If you can't find it, look in your spam or junk folder. The browser tab title reads We've emailed you. The applicant who signs in while waiting therefore sees that an email is waiting for them and what to do with it. In Prototype options the link Returning, more info needed opens this screen. The earlier in-app More info needed screen, with its uploads, notes and request cards, is kept in the code and reached with the link More info needed in-app screen (not used in Slice 1) (address ?link=infoApp), in case the product changes. The address ?link=info now opens the waiting screen, not the in-app one. Superseded in part, 2026-11-11: this is now the Slice 2 behaviour, and Slice 1 shows the in-app screen (see more-info-slice-swap). The separate in-app link (?link=infoApp) is gone; ?link=info shows whichever screen the slice calls for.",
      "tradeoff": "The screen cannot say what was asked or why, since that is in the email, so an applicant who cannot find the email has nothing here to go on beyond the spam hint. Nothing on the screen confirms the reply arrived, and the prototype does not simulate the email or the reply. The applicant can no longer upload from the page, which suits Slice 1 but is slower for anyone who finds email awkward. The earlier decisions pend-reasons-as-requests, moreinfo-simple-trial and rfi-not-restart describe the in-app screen, which is no longer the default path.",
      "by": "Ryan",
      "when": "2026-11-09"
    },
    {
      "id": "no-owners-summary-card",
      "area": "Flow",
      "where": "Step 2 · Owners",
      "t": "The Owners with 25% or more summary card is removed from the owners step",
      "b": "The card at the top of step 2 that read Owners with 25% or more, with the line Add everyone who owns 25% or more and a tag counting how many were listed so far (or All listed), is gone. Ryan's reason: it added nothing, because the owner cards below already show who has been added and the step already asks for every owner with 25% or more. The step now opens straight on the owner cards. The only part kept is the error that appears if the percentages entered add up to more than 100%, which shows in the same place without a card around it.",
      "tradeoff": "The applicant no longer gets a running count or an All listed confirmation, so nothing on the page says when they have added everyone. This replaces the card described in ownership-bar.",
      "by": "Ryan",
      "when": "2026-11-09"
    },
    {
      "id": "partial-steps-allowed",
      "area": "Flow",
      "where": "Steps 1 to 6 · Save and continue, and the left column",
      "t": "Save and continue works on any step even if it is incomplete; a step left unfinished shows as Partly done",
      "b": "Applicants may be waiting on a number, a document or a person, so steps 1 to 6 no longer hold Save and continue back until every required answer is in. The button is always on, and pressing it saves what is there and moves to the next step. The left column now says where each opened step stands: Done with a green tick when everything required is in, or a percentage done when something is missing (changed on 2026-11-09 by step-percent-done: it first said Partly done in the warning colour, with no percentage). Applicants can return to any step they have opened by choosing it in the left column or by pressing Back, and can fill the rest in then. Steps not yet opened cannot be chosen from the left column. On the last step's summary, each section shows a green tick circle only when its step is complete; a step that is only partly done shows a half-filled circle in the warning colour instead. The link at the end of that row says Continue instead of Edit, since the applicant is finishing the step and not changing it (same screen and Save button as Edit). The half circle is the whole icon, the same size as the tick circle, with nothing drawn inside it. Step names stay on one line: the left column is a little wider, and the Partly done label has no icon so it does not take up extra room. Only a bad entry is flagged before the end (decision errors-only-for-bad-entries); a field left empty shows nothing. The final step is different: Submit for verification stays off until every step is complete and the signature is typed, and its hover note lists each earlier step still only partly done as well as what is missing on the page.",
      "tradeoff": "Someone can click through all six steps with nothing filled in and only find out what is missing at the end, so the applicant is not nudged to finish a step while the details are fresh. Partly done does not say what is missing, so they have to open the step to find out. The invited owner's own page still needs everything before Send my details.",
      "by": "Ryan",
      "when": "2026-11-09"
    },
    {
      "id": "add-row-raised-fill",
      "area": "Visual",
      "where": "Step 2 · Add myself as an owner, Add an owner",
      "t": "The full-width add buttons have a white fill so they do not blend into the page",
      "b": "The full-width buttons that add an owner (and the other add rows built the same way) had no fill, only a thin outline, so on the pale grey page they looked like part of the background. They now use the surface-raised-1 background token, the same white as the cards, so they lift off the page the way a card does. The outline is dashed (added 2026-11-09), to read as a place to add something rather than a finished box. The brand-coloured label and the purple-tinted hover are unchanged.",
      "tradeoff": "The difference between white and the page grey is very small, so it is a faint lift rather than a clear button. If it still reads as flat, the next step is a stronger outline, not a coloured fill.",
      "by": "Ryan",
      "when": "2026-11-09"
    },
    {
      "id": "owner-share-slider",
      "area": "Flow",
      "where": "Step 2 · Owner cards · Ownership percentage",
      "t": "Superseded on 2026-11-09 by owner-slider-removed: ownership percentage is a plain box again. It was a slider from 25% to 100% with a small box beside it, and the owner form was split into labelled chunks",
      "b": "Superseded: the slider was removed on 2026-11-09 (decision owner-slider-removed). Ownership percentage is no longer a plain text box. It is a slider whose track runs from 0% at the left to 100% at the right, but the thumb cannot be dragged or keyed below 25%: the purple fill runs from the left end like any ordinary slider, nothing is greyed out, and the labels under it read 0%, 25% and 100%. Moving below 25 simply does nothing. and a small box to its left with a % sign. Dragging the slider fills the box, so the applicant can see exactly what the thumb is on, and typing in the box moves the slider, so a very specific value such as 33.3 can be keyed in. It is styled to look clean rather than native: a thin rounded track filled in the brand colour up to the thumb, a white round thumb with a hairline edge and soft shadow that grows slightly while dragged, and a focus ring for keyboard use. The slider stops at 25 because the product only asks for owners with 25% or more; if someone types less than 25 or more than 100 the box shows the same error as before and the slider rests at its nearest end. An owner with no percentage yet shows the slider at 25 and an empty box until one is chosen. The owner form is also split into more labelled chunks so it reads as short sections rather than one long list: About them (name and title side by side, then ownership), Personal details (date of birth, nationality, country of residence, home address, email, phone), Identity verification, and Screening. Every field is shown from the start; nothing is hidden until an earlier part is finished.",
      "tradeoff": "A slider is quick for a round number and slow for a precise one, so the box beside it carries the precision and the two must stay in step. Whole numbers are the natural stop for the slider; decimals only come from the box. The section headings make the card taller by a few lines, but each part is easier to find. Sole proprietors are shown the slider too, at 100, which is a control they have no reason to touch.",
      "by": "Ryan",
      "when": "2026-11-09"
    },
    {
      "id": "currency-code-on-amounts",
      "area": "Visual",
      "where": "Every money amount field (step 3 card volumes, EFT or ACH volume)",
      "t": "Money fields show the currency code, USD or CAD, as well as the dollar sign",
      "b": "A dollar sign does not say which dollar, and the product serves both the US and Canada, so every amount field now ends with the currency code: USD for a United States application and CAD for a Canadian one. The field reads as three parts: the dollar sign, the amount, and the code in a small separate tab at the right end with a pale grey fill and a hairline divider, the way payment forms from Stripe and similar products show it. The numbers use equal-width digits so figures line up as they are typed. The code is fixed by the application's region and cannot be changed here. It applies to the estimated monthly card volume, average transaction amount, maximum single transaction and the monthly EFT or ACH volume.",
      "tradeoff": "The code is the region's own currency only, so a business that takes payments in another currency has nowhere to say so. Amounts shown as plain text elsewhere (the limits card, the review summary) still use only the dollar sign.",
      "by": "Ryan",
      "when": "2026-11-09"
    },
    {
      "id": "owner-form-no-progressive-disclosure",
      "area": "Flow",
      "where": "Step 2 · Owner cards",
      "t": "The long owner form is chunked into labelled sections, not revealed one section at a time",
      "b": "The owner form is long by default, so we looked at breaking it up. One way was progressive disclosure: show the first section, and reveal the next only once the one before it is complete. We decided against it. Revealing sections in turn means a person has to finish one before they can see the next, which stops them filling in the details they have to hand right now and coming back to the rest later. That matters because applicants are often waiting on something, such as an ID number or a date of birth, and the flow now lets them save and continue with a step partly done (decision partial-steps-allowed). So every field stays reachable from the start, and the form is chunked with labelled sections instead: About them, Personal details, Identity verification and Screening (decisions owner-share-slider and owner-form-accordion). The ownership percentage became a slider to make that section lighter.",
      "tradeoff": "All the fields are on the page at once, so the card is still tall, and a person who would have liked to be led through it one part at a time is not. The headings and the shorter percentage control help, but they do not shorten the form. If testing shows the length puts people off, other ways to cut it down that keep every field reachable are collapsible sections that all start open, or a sticky list of sections to jump between.",
      "by": "Ryan",
      "when": "2026-11-09"
    },
    {
      "id": "owner-form-accordion",
      "area": "Flow",
      "where": "Step 2 · Owner cards",
      "t": "Each section of the owner form can be collapsed, and the contact details join Personal details",
      "b": "Superseded on 2026-11-10 by owner-form-two-sections: there are now two sections, and email and phone sit in Personal details. The owner form is split into three sections (name, title and ownership percentage now sit inside Personal details, see owner-form-three-sections; on 2026-11-09 Identity verification was put before How to reach them): Personal details, Identity verification and How to reach them (which also holds the politically exposed person question, after the SSN or SIN; the Screening section was removed on 2026-11-09). Each heading is now a button with a chevron that opens or closes that section on its own. The heading is set as a section subtitle (16px, semibold) in the normal primary text colour, not small grey capitals, so each section is clearly labelled. It no longer says how many fields the section holds (a count, such as 6 fields, was shown beside the name until 2026-11-09). A small minutes badge was beside each title from 2026-11-09 and was removed the same day. The title sits centred between the dividers above and below it, with 20px of space either side and 24px of space between the last open section's fields and the next divider; the first heading sits 24px under the always-shown fields. This is more room than the first centred version, which felt squashed. Personal details starts open and the other two start closed (changed on 2026-11-09 by owner-form-three-sections; before that every section started closed), and the applicant opens whichever they want, in any order. Closed is not locked: no section has to be finished before another can be opened, and every field is one click away (decision owner-form-no-progressive-disclosure). A section that holds a problem the applicant has been shown stays open and cannot be collapsed until it is fixed. Email address and phone number are back in their own How to reach them section, after Personal details (they were folded into Personal details from 2026-11-09 earlier the same day). Update, 2026-11-11 (later): each section heading now carries a status chip (see section-status-chip). The earlier field count and minutes badge stay removed.",
      "tradeoff": "Sections open independently, so the card can still grow as tall as before once everything is open, and this is not a strict accordion where opening one closes the rest. With most sections closed, nothing on the card shows what has been filled in there, so a person can skip a section and forget it; the step's percentage done and the final review are what catch that. Sections go back to all closed if the page is reloaded.",
      "by": "Ryan",
      "when": "2026-11-09"
    },
    {
      "id": "errors-only-for-bad-entries",
      "area": "Flow",
      "where": "Steps 1 to 6 · Save and continue, Save & Exit, and every field",
      "t": "Only a wrong entry is an error before the final submit; an empty required field shows nothing, and a wrong entry stops the save and scrolls to it",
      "b": "Required fields are only enforced at the very end, when the applicant submits, so leaving a field empty no longer shows a message when the applicant clicks into it and out again. A wrong entry still does: an answer that is there but not valid, such as an email without an at sign, a routing number that is not 9 digits, a phone number that is too short or a date in the wrong format. It shows when the field is left. Pressing Save and continue, or Save & Exit, with a wrong entry on the step does not save or move on: the page scrolls to the first field with a problem, puts the cursor in it, and the message stays until it is put right. Empty required answers never stop either button, and the step still shows as Partly done in the left column. On the final step, pressing Submit for verification still lists everything that is missing. Replaces the earlier behaviour (decision partial-steps-allowed, first version) where each empty field flagged itself when it was left.",
      "tradeoff": "Someone who skips a required field gets no warning that it is needed until the left column says Partly done or they reach the final step, so a missed field can be found late. A wrong entry blocks saving, so a person who is waiting on the correct number cannot save a half-right one and has to clear the box to move on.",
      "by": "Ryan",
      "when": "2026-11-09"
    },
    {
      "id": "step-percent-done",
      "area": "Flow",
      "where": "Left column, progress bar and the last step's summary",
      "t": "A step that is not finished shows a ring and the percentage done, in the brand colour, and the progress bar follows",
      "b": "Replaces Partly done and the warning colour. In the left column an opened step that is not finished reads, for example, a small ring and 15%; a finished one is a full ring and 100%. The ring is a thin circle that fills clockwise in green as the step fills in; the rest of the ring stays a light grey, and the percentage is in the normal primary text colour. Changed on 2026-11-09: the fill was first brand purple, and the words done and Done were dropped, so every opened step in the left column reads just a ring and its percentage, such as 15%, and a finished step is a full ring and 100%. A step's percentage is the share of the answers it needs that are in and valid: each required field, each required document, the owner list at step 2 and the three signature entries at step 7. It never shows 100 until the step has no problems at all, so a step with a wrong entry tops out at 99. Optional fields are not counted. The Your progress bar and its percentage at the top of the left column are now the average of the seven steps, where a step not yet opened counts as nothing, so the bar moves as answers go in and not only when a step is passed. Updated 2026-11-10: a finished step reads a green tick and the word Done, as it used to, instead of a full ring and 100% (see step-done-tick). On the last step's summary, a step that is not finished shows its ring in place of the green tick circle. Empty and unopened steps show no percentage until they are opened.",
      "tradeoff": "Fields count equally, so one required document and one tick box weigh the same, and a step with few fields jumps in big steps (one of five answers is 20%). The percentage changes as the applicant types, so a number can move backwards when an entry is cleared or becomes invalid. Fields that only appear after an earlier answer add to the total once they appear, so a step can drop a few points when the applicant answers Yes to a question.",
      "by": "Ryan",
      "when": "2026-11-09"
    },
    {
      "id": "save-exit-after-first-step",
      "area": "Flow",
      "where": "Top bar · Save & Exit",
      "t": "Save & Exit only appears once the applicant has pressed Continue on the business type screen",
      "b": "The button is not on the welcome page or the What type of business are you screen. It first appears on step 1, after the applicant has chosen a business type and pressed Continue, because that is the first point where anything has been entered that could be saved. From then on it stays in the top bar through step 7. The sign-in screens, status screens and the invited owner screens are unchanged, with the logo alone.",
      "tradeoff": "Someone who has only picked a business type and wants to stop has nothing to save, so they just close the page and come back through the sign-in link. Nothing on those two screens tells them their choice is kept.",
      "by": "Ryan",
      "when": "2026-11-09"
    },
    {
      "id": "stable-scrollbar-gutter",
      "area": "Visual",
      "where": "Every screen",
      "t": "The page always reserves room for its scrollbar so the layout does not shift sideways between steps",
      "b": "Choosing steps in the left column made the whole page nudge left and right, because a short step has no page scrollbar and a long one does, and the scrollbar takes about 15px of width when it appears. The page now always shows the scrollbar track (or reserves its space where scrollbars overlay), so the left column and the step content stay exactly where they are as the applicant moves between steps.",
      "tradeoff": "On a short screen with little to scroll, an empty scrollbar track shows down the right edge where there was none. Where the system uses overlay scrollbars, as macOS does by default, nothing changes visually.",
      "by": "Ryan",
      "when": "2026-11-09"
    },
    {
      "id": "checkbox-no-grey-box",
      "area": "Visual",
      "where": "Every tick box (agreements, consents, declarations)",
      "t": "Tick boxes have no grey box behind them; the whole row is still clickable",
      "b": "The light grey background that sat behind each tick box and its label is removed, so a tick box sits directly on the page like the other fields. The row keeps its padding, so the whole area (the box, the label and the space around them) still toggles the box when clicked. A tick box with a problem still gets its thin red outline, and a locked one is still dimmed.",
      "tradeoff": "Without the grey fill, a tick box row no longer reads as a distinct block, so a long run of them (such as the agreements on the last step) relies on spacing alone to look separate. The row keeps its small left inset, so the box sits a few pixels in from the edge of the fields above and below.",
      "by": "Ryan",
      "when": "2026-11-09"
    },
    {
      "id": "owner-slider-removed",
      "area": "Flow",
      "where": "Step 2 · Owner cards · Ownership percentage",
      "t": "Ownership percentage is a plain box again, and the first three owner fields sit above the sections with no heading",
      "b": "Ryan judged the slider overkill, so ownership percentage goes back to a single text box with the placeholder e.g. 40 and, for everyone except a sole proprietor, the line We only need owners with 25% or more. Typing is the only way to set it, and the checks are unchanged: a number from 0 to 100, and 25 or more for an owner. The slider, its number box, the scale labels and the 25% stop are gone. At the same time the About them heading is removed: the owner's name, title and ownership percentage are always shown at the top of the card with no accordion heading, and only the sections below are accordions, in this order: Personal details (date of birth, nationality, country of residence, home address), How to reach them (email address, phone number), Identity verification, which also holds the politically exposed person question after the SSN or SIN. All three start closed.",
      "tradeoff": "A plain box gives no visual sense of how much of the business someone owns, and nothing stops a number below 25 being typed until the error shows. Name, title and ownership are now the only fields in the always-open part of the card, so every other detail needs a click to open, including contact details that used to be a quick scan.",
      "by": "Ryan",
      "when": "2026-11-09"
    },
    {
      "id": "pep-in-their-id",
      "area": "Flow",
      "where": "Step 2 · Owner cards · Identity verification",
      "t": "The politically exposed person question sits in Identity verification, after the SSN, and the Screening section is gone",
      "b": "Changed on 2026-11-10 (owner-form-two-sections): the question now takes its own full row below the SSN or SIN, and the owner form has two sections, not three. The Screening section, which held only the question Is this person a politically exposed person?, is removed. The question now sits at the end of Identity verification, directly after the Social Security Number or SIN, in the same row of the form, in the right-hand column beside it (changed on 2026-11-09: it first took the full width on its own row). For a non-profit or government body, which is not asked for an SSN or SIN, it follows the ID issuing country. The owner form is therefore three accordions: Personal details, How to reach them and Identity verification. The line under the question now stops after the examples of a senior public role (head of state, senior official, judge, senior military); the sentences Answering yes doesn't disqualify you and It adds one extra screening step are removed. The answer, its Yes and No pills and the rule that it must be answered before the final submit are unchanged.",
      "tradeoff": "Without the reassurance, someone who reads the examples and thinks of a relative or a local councillor may answer No to be safe, or hesitate over Yes, because nothing says that Yes is not a rejection. It is also now one of six questions in a section about ID documents, so it can read as part of the ID check and not as a separate screening question.",
      "by": "Ryan",
      "when": "2026-11-09"
    },
    {
      "id": "owner-form-three-sections",
      "area": "Flow",
      "where": "Step 2 · Owner cards",
      "t": "The owner form is three accordions, and Personal details comes first, open, and holds the name, title and ownership percentage",
      "b": "Changed on 2026-11-10 (owner-form-two-sections): the owner form is now two sections, Personal details (which also holds email and phone) and Identity verification; How to reach them is gone. The always-shown fields at the top of the owner card are folded into a Personal details accordion, which is the first section and starts open. It holds, in this order: full legal name on the left, then title and ownership percentage side by side in the right-hand column, each taking half of it, then date of birth, nationality, country of residence and home address. The other two sections start closed: Identity verification (including the politically exposed person question) and then How to reach them (email address, phone number), swapped into that order on 2026-11-09. The owner form is therefore three sections, and the card has no fields outside an accordion. Owner sections still open and close on their own, and a section holding a problem stays open. For a non-profit there is no ownership percentage, so the title takes the right-hand column alone. The always-open arrangement of name, title and percentage from owner-slider-removed is replaced by this. Update, 2026-11-11: the name is now three boxes (first, middle and last) in a row of four with the title, and ownership percentage starts the second row (see owner-name-three-fields).",
      "tradeoff": "Title and percentage are each only a quarter of the width of the form, so a long title such as Chief Executive Officer may be cut off in the box and the percentage box is wider than the three or four digits it needs. Personal details is the longest section, with seven fields, so the first screen of the card is taller than before.",
      "by": "Ryan",
      "when": "2026-11-09"
    },
    {
      "id": "encrypted-lock-tooltip",
      "area": "Fields",
      "where": "Sensitive fields (ID number, SSN or SIN, account numbers) · padlock inside the field",
      "t": "The padlock inside a sensitive field opens the Encrypted note on hover; there is no Encrypted label under the field",
      "b": "A sensitive field already shows a padlock at the start of the box. That padlock is now the Encrypted marker: hovering or focusing it opens a popover, like the one Why we ask has, explaining that the number is encrypted as it travels and while it is stored, that only the last four characters show once the applicant leaves the field, and that it goes to the verification partner to check who they are. The Encrypted label under the field (briefly beside Why we ask) and the purple Encrypted tag before it are gone, so the helper area under the field holds only Why we ask where a field has one.",
      "tradeoff": "Nothing on the page says Encrypted until someone hovers the padlock, so the reassurance is easy to miss, and on a touch screen there is no hover. The popover wording is a draft that security has not reviewed.",
"by": "Ryan",
      "when": "2026-11-10"
    },
    {
      "id": "owner-nationality-dob-residence-row",
      "area": "Flow",
      "where": "Step 2 · Owner cards · Personal details",
      "t": "Nationality takes half the row, with date of birth and country of residence a quarter each",
      "b": "In Personal details the row under the name is Nationality on the left (half the width), then Date of birth and Country of residence side by side in the right-hand half (a quarter each). This is the same pattern as the row above it, where the name takes the left half and title and ownership percentage share the right half. Superseded, 2026-11-11: Personal details now runs in two rows of four equal boxes (see owner-name-three-fields). Nationality, date of birth and country of residence are a quarter each, in the second row after ownership percentage. Superseded again, 2026-11-11 (owner-personal-details-grouped): date of birth, nationality and country of residence are a row of three, in that order.",
      "tradeoff": "Country of residence is a select that holds long country names, and at a quarter of the width a long name may be cut off in the box.",
      "by": "Ryan",
      "when": "2026-11-09"
    },
    {
      "id": "owner-form-two-sections",
      "area": "Flow",
      "where": "Step 2 · Owner cards",
      "t": "The owner form is two accordions: email and phone sit in Personal details, and the politically exposed person question sits below the SSN",
      "b": "On 2026-11-10 the second section was renamed from Their ID to Identity verification, because Their ID was easy to miss as a heading and the section holds the ID details the check needs. The How to reach them accordion is removed. Email address and phone number are the last two fields of Personal details, after the home address, each taking half the width. The owner form is now two accordions: Personal details, open by default, and Identity verification. In Identity verification the politically exposed person question takes its own full row directly below the Social Security Number or SIN, which sits in the left half (for a non-profit or government body, which has no SSN or SIN, it follows the ID issuing country).",
      "tradeoff": "Personal details is now the longest section, so the first screen of the card is taller. The question sits alone on a full row, so the SSN row has an empty right half.",
      "by": "Ryan",
      "when": "2026-11-10"
    },
    {
      "id": "address-on-quarter-grid",
      "area": "Fields",
      "where": "Every address field",
      "t": "Address search and street boxes run the full width, with the manual link below; the other address boxes sit on the quarter grid",
      "b": "A card is a grid of four equal columns, so a field is a half or a quarter, with the same 16px gap everywhere. The address search box and the two street boxes run the full width. The Enter address manually link sits below the search box, left-aligned, in the same place the Clear and search again link sits once the parts are showing. The city takes two columns, with the state or province and the ZIP or postal code a quarter each.",
      "tradeoff": "A full-width search box is wide for a short address. The link under the field adds a line of height to every address field.",
      "by": "Ryan",
      "when": "2026-11-10"
    },
    {
      "id": "owner-avatar-person-icon",
      "area": "Flow",
      "where": "Step 2 · Owner cards · avatar circle",
      "t": "A new owner's avatar shows a person icon until there is a name to take initials from",
      "b": "The light purple circle at the left of an owner card shows the owner's initials once a name is typed. Until then, a newly added owner shows a person icon instead of a dash or question mark, so the circle reads as a person and not as a missing value.",
      "tradeoff": "The icon and the initials are different shapes, so the circle changes from an icon to letters as soon as the first name is typed.",
      "by": "Ryan",
      "when": "2026-11-10"
    },
    {
      "id": "owner-section-icons",
      "area": "Flow",
      "where": "Step 2 · Owner cards · accordion headings",
      "t": "Each owner accordion heading starts with an icon: a person for Personal details, a shield for Identity verification",
      "b": "The heading of each owner accordion starts with a small icon in the secondary text colour, before its name, so the two sections are easy to tell apart and the second is harder to miss. Personal details uses the person icon and Identity verification uses the shield. The chevron stays at the far right.",
      "tradeoff": "A shield may read as a promise of security rather than as a sign that ID details are asked for here.",
      "by": "Ryan",
      "when": "2026-11-10"
    },
    {
      "id": "owner-card-header-divider",
      "area": "Flow",
      "where": "Step 2 · Open owner card",
      "t": "An open owner card has a divider between its title area and the Personal details accordion",
      "b": "When an owner card is open, a thin divider in the subtle border colour sits between the title area (avatar, name, role, Remove and the chevron) and the first accordion, Personal details. It stops at the card's side padding, in line with the fields, and matches the dividers between the accordions, so the title reads as the card's header. A closed card has no divider.",
      "tradeoff": "The divider does not reach the card's edges, so it reads as a rule inside the card more than as a header border.",
      "by": "Ryan",
      "when": "2026-11-10"
    },
    {
      "id": "owner-card-padding-token",
      "area": "Flow",
      "where": "Step 2 · Owner cards",
      "t": "Every padding inside an owner card is the 24px card padding token",
      "b": "The title area, the open body, the accordion headings, the space under each section's fields and the space above the Done button all use the same 24px card padding token as the other cards, in place of the 18px and 20px values they had, so the owner cards line up with the content around them and spacing changes in one place.",
      "tradeoff": "An owner card is taller than before: each accordion heading has 24px above and below it, and the fields are 8px narrower in total, so a long country name in a quarter-width box has less room.",
      "by": "Ryan",
      "when": "2026-11-10"
    },
    {
      "id": "step-ring-stays-on-return",
      "area": "Flow",
      "where": "Progress column · step list",
      "t": "A step you have moved past keeps its percentage ring when you return to it",
      "b": "In the step list, a step shows its minutes estimate until the applicant has been past it. Once they move on to a later step, its ring and percentage stay, and they are still there when the applicant clicks back to it, instead of the minutes coming back. The ring on the step being worked on updates as they fill it in. A step the applicant is on for the first time, and steps not yet reached, still show minutes.",
      "tradeoff": "The step the applicant is currently on shows a ring on one visit and minutes on another, depending on whether they have been past it, which is a small inconsistency in the list.",
      "by": "Ryan",
      "when": "2026-11-10"
    },
    {
      "id": "owner-card-click-to-open",
      "area": "Flow",
      "where": "Step 2 · Owner cards",
      "t": "The whole owner card header opens and closes it, with a chevron only and a tertiary negative Remove",
      "b": "Clicking anywhere in an owner card's header (avatar, name, role line or empty space) opens or closes the card, and the header shows a pointer. The Open and Collapse words are gone: the toggle is a single chevron icon at the far right that turns over when the card is open, and it keeps a label (Open or Collapse, with the owner's name) for screen readers. The card's chevron is the more prominent one (20px, primary icon colour) and the chevrons on the sections inside the card are smaller and lighter (16px, secondary icon colour, primary on hover), with both centred on the same vertical line. Remove now comes before the chevron, so the chevron is the last thing on the row, and it is the Atlas tertiary negative button: no fill, error-coloured text and trash icon, and a subtle error-coloured fill on hover or press. Clicking Remove removes the owner and does not also open or close the card.",
      "tradeoff": "A clickable header makes a stray click anywhere on it open the card. Remove sits right beside the large click target and still acts at once with no confirmation or undo, so a misclick can lose a filled-in card. The chevron alone says less than the words did.",
      "by": "Ryan",
      "when": "2026-11-10"
    },
    {
      "id": "step-done-tick",
      "area": "Flow",
      "where": "Left column · step list",
      "t": "A finished step reads a green tick and Done, and the progress bar has rounded ends",
      "b": "In the step list, a step at 100% shows a green check mark and the word Done, as it did before percentages were added, in place of a full ring and 100%. Steps that are not finished still show the ring and percentage, and steps not yet reached still show minutes. The Your progress bar at the top of the left column has the same pill shape on its fill as on its empty track: both use a corner radius of half the bar's height, so the filled end is rounded rather than square.",
      "tradeoff": "Done and a percentage are two different ways of saying how far along a step is, so a list of steps now mixes ticks, rings and minutes. A step that drops below 100 (an entry cleared or made invalid) swaps its tick back to a ring.",
      "by": "Ryan",
      "when": "2026-11-10"
    },
    {
      "id": "checkbox-tick-centred",
      "area": "Visual",
      "where": "Checkboxes everywhere",
      "t": "The tick in a checked box sits in the middle of the box",
      "b": "In every checked checkbox the white tick is centred in the square, both across and up and down, instead of sitting a little high and to the left. It is placed from the centre of the box so it stays centred if the box size changes.",
      "tradeoff": "The tick is drawn with CSS borders rather than the Atlas check icon, so it is centred by eye and measurement, not by the design system; if Atlas changes the checkbox, this should follow it.",
      "by": "Ryan",
      "when": "2026-11-11"
    },
    {
      "id": "save-exit-sign-out",
      "area": "Flow",
      "where": "Save & Exit dialog",
      "t": "Save & Exit ends with a Sign out button, because pressing it means the applicant is leaving",
      "b": "The Save & Exit dialog has two buttons at the bottom. Close, in the secondary style, shuts the dialog and leaves the applicant where they were. Sign out, in the primary style, takes them to the sign-in screen with the password box cleared. Pressing Save & Exit says the applicant wants to leave the onboarding journey, so the dialog makes the leaving real instead of only confirming that answers are saved. Nothing is lost by signing out: every answer is already saved, and signing in again reopens the last saved state. The two buttons show in both slices; in Slice 2 they sit under the hand-off form.",
      "tradeoff": "Sign out is the primary button, so an applicant who only wanted to see that their answers are saved could sign themselves out by habit. Signing out ends the session but the dialog still says to log back in with the link in the welcome email, which has not been confirmed as how returning users sign in.",
      "by": "Ryan",
      "when": "2026-11-11"
    },
    {
      "id": "more-info-slice-swap",
      "area": "Flow",
      "where": "More info needed (Slice 1 and Slice 2)",
      "t": "Slice 1 answers a request for more information on a screen in the product; Slice 2 answers it by email",
      "b": "The two ways of asking for more information have swapped slices. In Slice 1 the link Returning, more info needed, and signing in while Ops is waiting on information, opens the screen in the product with a card for each request, where the applicant uploads files, writes a message and sends it to our team. In Slice 2 Ops asks by email: the applicant sees the waiting screen, which says we've emailed you, and replies to that email. The link Returning, more info needed shows whichever one the Slice option calls for, so the separate in-app link and its address (?link=infoApp) are gone. The Ops picks list and the More info needed screen layout choice in Prototype options show only while the in-app screen is open, which is Slice 1.",
      "tradeoff": "The email in Slice 2 still has to carry the detail the in-app screen shows, and nothing connects what Ops picks to the email (see more-info-by-email). Slice 1 now needs a screen that receives files and messages, which is more to build in Slice 1 than an email reply was.",
      "by": "Ryan",
      "when": "2026-11-11"
    },
    {
      "id": "more-info-one-response",
      "area": "Flow",
      "where": "More info needed",
      "t": "Every request for more information has the same file upload and message box, and nothing on it is required",
      "b": "On the in-app More info needed screen every reason keeps its own title, its line on why we need it and its list of what we accept, but all of them are answered the same way: a Choose file button (Add another file once there is one) and a Message for our team box. Cards such as the website address, check your sales numbers, tell us when customers get what they pay for, remove the credit freeze and update your website no longer have their own fields or buttons. No card shows a Required, Write an answer or Done badge, nothing is pre-filled from step 3, and nothing is checked. Send to our team is on once any card has a file or a message and nothing is still uploading. Ryan's reason: Trullio does not check this information again, a person only reviews it, so a text box is enough, even for a request such as Enter your website. The message box label has no (optional) tag any more, because nothing around it is required. Update, 2026-11-11: Ryan says applicants must reply to every request to be able to send. Send to our team now stays off until every card has a file or a message (and nothing is still uploading), and the line under it reads Add a file or write a message for every request to send. This replaces the line above saying Send is on once any card has a file or a message. Nothing on a card is marked Required, and nothing checks what the reply says.",
      "tradeoff": "An applicant can send without answering every card, and the screen will not say that a request was left unanswered, so Ops has to read the messages and files against what they asked. Typed answers are free text, so Ops cannot rely on a number or a web address arriving in a usable format. The credit freeze and website cards no longer have a button to say the job is done, so the applicant has to say so in the message. Update, 2026-11-11: an applicant with nothing to send for one request (for example, a credit freeze they have already removed) now has to write that in its message box before they can send any of the others.",
      "by": "Ryan",
      "when": "2026-11-11"
    },
    {
      "id": "card-history-in-volumes",
      "area": "Flow",
      "where": "Step 3 · Your card volumes",
      "t": "Have you accepted card payments before? moves into Your card volumes, and the callout and the Processing history section are removed",
      "b": "The line under the card volume numbers (If you go over one of these, nothing breaks. We'll have a quick word before we raise your limit.) is gone. The question Have you accepted card payments before?, with its prior processor and chargeback ratio follow-ups, moves out of its own Processing history section into Your card volumes, below Card present % and above the limits tick. The Processing history section no longer exists.",
      "tradeoff": "Your card volumes is now a longer section, and a question about history sits among questions about amounts. The note on the section title (underwriting-plain) stays, but the reassurance it described is partly withdrawn (see max-ticket-hard-block).",
      "by": "Ryan",
      "when": "2026-11-11"
    },
    {
      "id": "max-ticket-hard-block",
      "area": "Copy",
      "where": "Step 3 · Maximum single transaction",
      "t": "The maximum single transaction is a hard block, and step 3 says so",
      "b": "Ryan: any transaction over the maximum single transaction value is blocked. Two places now say it. The hint under the field reads We block any single sale above this amount (any single payment above it for a non-profit), and the hint under the limits tick reads We block any single transaction over $X. Your monthly limit is $Y. Both are based on what you entered above. Ask us any time to raise them. This is why the earlier line saying that going over a limit breaks nothing was removed (see card-history-in-volumes). Nothing is said about what happens when the monthly limit is passed, because only the single transaction value has been called a hard block. Update, 2026-11-11: Ryan removed the sentence We block any single sale above this amount. from the hint under the field, and the sentence We block any single transaction over $X. from the limits tick (see max-ticket-block-text-removed). The block itself is not changed; it is no longer said on the page.",
      "tradeoff": "An applicant who sets the maximum low to look safe will have real sales declined, so the warning may push people to enter a higher number than they need, which sits against the honest estimates the section asks for (underwriting-plain). Exactly how the block is explained to an applicant is for product and risk to confirm.",
      "by": "Ryan",
      "when": "2026-11-11"
    },
    {
      "id": "yearly-volume-shown",
      "area": "Visual",
      "where": "Step 3 · Your card volumes",
      "t": "A yearly card volume sits beside the monthly figure, calculated and not editable",
      "b": "Next to Estimated monthly card volume is a Yearly card volume box that shows the monthly amount times 12, with the currency code like every other amount. It cannot be clicked, focused or typed in, it has a grey fill to say so, and it is blank until a monthly amount is entered. The monthly and yearly boxes each take a quarter of the form's width and sit in the left half of the row, with Average transaction amount taking the right half (25 / 25 / 50). It is for demonstration, as Ryan put it: it is not stored, not sent and not reviewed. Below about 1200px wide the three labels in the row reserve two lines so the boxes line up, and on a very narrow screen the two boxes stack. Update, 2026-11-11: Average transaction amount no longer takes the right half beside the pair. The row now ends with Card present % in the right half, and Average transaction amount and Maximum single transaction share the second row (see volume-fields-reordered). Update, 2026-11-11 (later): Ryan: the yearly figure is what the back end stores, and monthly is easier for an applicant to understand, so the applicant is asked for monthly, the box displays yearly, and yearly is what gets stored. This replaces the lines above saying it is for demonstration and is not stored or sent.",
      "tradeoff": "At a quarter of the form the boxes are narrow, so an amount of seven or more digits is clipped with an ellipsis in the yearly box and scrolls in the monthly one. Because nothing carries the yearly figure forward, if it is wanted in the product, the field and who sees it need deciding. Update, 2026-11-11 (later): the yearly figure is wanted in the product and is the stored value (Ryan), so it is no longer only a display. Whether the monthly answer is kept as well is not said.",
      "by": "Ryan",
      "when": "2026-11-11"
    },
    {
      "id": "owner-name-three-fields",
      "area": "Flow",
      "where": "Step 2 · Owner cards · Personal details",
      "t": "An owner's name is three boxes, and Personal details runs in two rows of four",
      "b": "The one Full legal name box is replaced by First name, Middle name and Last name. First name and last name are required; middle name is not. The top row of Personal details is First name, Middle name, Last name and Title / role, a quarter of the form each, and the second row is Ownership percentage, Nationality, Date of birth and Country of residence. For a non-profit there is no ownership percentage, so the second row has three boxes. Everything that showed the full name (the card heading, the initials, the review list, the signatory default and the owner named on a request for more information) shows the three parts joined with spaces, so a middle name appears when one is entered. The sample owners are split the same way (Dana, R., Whitfield), and a sole proprietor's name from step 1 is split into first and last. On a screen narrower than about 900px the boxes go two across, and on a phone one across. The hint Exactly as it appears on the ID you'll upload. sits under First name. Update, 2026-11-11: the rows are regrouped (see owner-personal-details-grouped). The name is a row of three, and title no longer sits beside it. Update, 2026-11-11: Ryan asked for the hint under First name, Exactly as it appears on the ID you'll upload., to be removed. No reason was given. The placeholder As printed on their ID stays.",
      "tradeoff": "At a quarter of the form a long first or last name, or a long country name, may be cut off in its box. Splitting a single name into three guesses where the middle name starts: a sole proprietor whose step 1 name has two surnames will see the first surname in the middle box until they correct it. The hint and the 25% note under ownership percentage wrap to two or three lines in a narrow box. Whether the three parts go to the verification partner as separate fields is for engineering to confirm.",
      "by": "Ryan",
      "when": "2026-11-11"
    },
    {
      "id": "volume-fields-reordered",
      "area": "Flow",
      "where": "Step 3 · Your card volumes",
      "t": "Card present % ends the top row, and average and maximum transaction share the second row",
      "b": "Your card volumes now reads in two rows. The top row is Estimated monthly card volume, Yearly card volume and Card present %, in the 25 / 25 / 50 split. The second row is Average transaction amount on the left and Maximum single transaction on the right. The Card present % hint lost its second sentence, Online, in-app and phone sales count as the rest., and now reads In person, on a card machine.",
      "tradeoff": "With that sentence gone, nothing on the page says what happens to the share that is not in person, so an applicant may not know whether online and phone sales are meant to be left out. The remaining hint is also shorter than the others in the section.",
      "by": "Ryan",
      "when": "2026-11-11"
    },
    {
      "id": "ach-volume-defaults-zero",
      "area": "Flow",
      "where": "Step 3 · Bank transfer volumes",
      "t": "The monthly ACH or EFT volume starts at 0 and goes back to 0 if it is emptied",
      "b": "The Estimated monthly ACH volume (EFT in Canada) box is optional but starts with 0 in it, because the back end needs a valid value. If the applicant clears it and leaves the box, it fills with 0 again, so the stored answer is never empty. Typing an amount replaces it. The card stays collapsed by default, so most applicants never see the 0.",
      "tradeoff": "A 0 already in the box reads as an answer, so an applicant who does take bank transfers may leave it at 0 without noticing it is there; Ryan's reason is that the back end needs a value. The prototype does not send anything, so this only shows the behaviour.",
      "by": "Ryan",
      "when": "2026-11-11"
    },
    {
      "id": "owner-personal-details-grouped",
      "area": "Flow",
      "where": "Step 2 · Owner cards · Personal details",
      "t": "Personal details read in rows that each hold one idea: name, role, facts about the person, then contact",
      "b": "Ryan asked for the field structure to make more sense. Personal details is now: First name, Middle name and Last name in a row of three; Title / role and Ownership percentage in a row of two (title alone, at half width, for a non-profit, which has no percentage); Date of birth, Nationality and Country of residence in a row of three; Home address across the full width; then Email address and Phone number in a row of two. Before, the title sat beside the name and the percentage beside nationality, which mixed what a person does in the business with who they are. The business facts now sit together, directly under the name, matching the card heading (60% · Owner / CEO), and the identity facts sit together. Rows of two and three give wider boxes than the quarter-width boxes before, so long names, titles and country names are cut off less. Below about 560px the rows of three go one across, and below about 420px the rows of two do too. Identity verification is unchanged. Update, 2026-11-11 (Ryan): rows of two boxes at half width looked odd beside rows of three, so every row now sits on thirds. Title and ownership percentage fill the first two thirds, and so do email and phone (see owner-form-thirds).",
      "tradeoff": "The name now sits above ownership percentage, so for a sole proprietor, whose title and 100% are already filled in, the second row is two boxes nobody needs to change. The hint under First name and the 25% note under ownership percentage still make their rows a little uneven. A separate Role in the business section was considered and not built, because it would add a click for every owner.",
      "by": "Ryan",
      "when": "2026-11-11"
    },
    {
      "id": "owner-form-thirds",
      "area": "Visual",
      "where": "Step 2 · Owner cards",
      "t": "Every owner form row sits on a grid of thirds, and a row of two fills the first two thirds",
      "b": "Ryan: some rows at 50 / 50 and others at 33 / 33 / 33 looked odd, so everything is kept aligned on thirds. In Personal details: First, Middle and Last name; Title / role and Ownership percentage (first two thirds, third empty); Date of birth, Nationality and Country of residence; Home address full width, with City, State or Province and ZIP or postal code a third each; Email address and Phone number (first two thirds). In Identity verification: Government ID type, ID number and expiry date; ID issuing country and SSN or SIN (first two thirds); the politically exposed person question full width. A row that is not full leaves its last third empty and the next row starts on a new line. The left edges line up at every row. Below about 560px every box goes one across. The home address in an owner card uses thirds for city, state and ZIP; addresses elsewhere (step 1) keep their quarter lines. Update, 2026-11-11 (Ryan): the Identity verification rows changed. They are now Government ID type and ID number; then ID expiry date and ID issuing country; then Social Security Number (or SIN) on a row of its own; then the politically exposed person question. Ryan asked for this, so Identity verification on thirds is no longer an assumption (see owner-address-two-thirds for the address).",
      "tradeoff": "Empty thirds leave gaps at the end of the title and percentage row, the email and phone row, and the ID country and SSN row, which can read as something missing. Identity verification was not part of the request; it was put on thirds so the two sections of the card match, and can go back to halves if Ryan prefers. For a non-profit, with no percentage or SIN, the title and the ID issuing country sit alone in their rows.",
      "by": "Ryan",
      "when": "2026-11-11"
    },
    {
      "id": "owner-address-two-thirds",
      "area": "Visual",
      "where": "Step 2 · Owner cards · Home address",
      "t": "In an owner card the address search box and the street boxes are two thirds wide",
      "b": "Ryan: in an owner card the Home address search box is two thirds of the form wide, the width of the first two columns of thirds. Once an address is picked or entered by hand, Street address 1 and Street address 2 are two thirds wide too, and City, State or Province and ZIP or postal code stay a third each. Below about 560px they go full width. Addresses outside an owner card (step 1) keep their full-width boxes. Measured at 1280 wide: the form is 817px, the search box and the street boxes are 539px, and each of the three boxes below is 262px. Update, 2026-11-11 (later): Ryan asked for City to sit on the same row as State and ZIP, so that row spans all three thirds. The Street address 2 box had been leaving City beside it in the third column of its row, which pushed State and ZIP to the next row; City now always starts a new row.",
      "tradeoff": "The street boxes end a third short of the right edge while city, state and ZIP reach it, so the address block has a ragged right edge. The address search is also narrower than before, so a long street name in the search box has less room.",
      "by": "Ryan",
      "when": "2026-11-11"
    },
    {
      "id": "no-ssn-tick",
      "area": "Step 2",
      "where": "Step 2 · Owner cards · Identity verification",
      "t": "A tick under the SSN or SIN says the person has none, and fills the box with zeros",
      "b": "Ryan: under the Social Security Number (or SIN) box in an owner card, a tick box reads This person doesn't have an SSN (SIN for Canada). Ticking it fills the box with all zeros (000-00-0000, or 000 000 000 for a SIN) and locks it, with no Show button, the same way the website box locks to N/A when I don't have a website is ticked. Unticking clears the box and unlocks it, so the person can type a number. The tick is optional and is not shown for a non-profit or government body, which are not asked for the number (nonprofit-no-national-id). It sits above the politically exposed person question. Only zeros are ever stored in the box, never a real number. Update, 2026-11-11 (later): the tick now sits in line to the right of the box, and a locked box looks disabled like the website box (see tick-beside-field).",
      "tradeoff": "Zeros in an SSN box can look like a real answer to anything that reads the form later. The tick is kept as its own answer so the two cases can be told apart, but whether Trullio or Ops accept an owner with no SSN, and what they need instead, is not confirmed. The earlier hint about an ITIN (in the why note under the box) is still there for someone who has a different number.",
      "by": "Ryan",
      "when": "2026-11-11"
    },
    {
      "id": "sign-on-step-6",
      "area": "Flow",
      "where": "Step 6 · Documents & signature; step 7 · Review & submit",
      "t": "Signing is the end of step 6, straight after the documents are uploaded; step 7 is review and submit",
      "b": "Ryan: signing should appear on step 6, so the applicant uploads their documents and then signs it off. Step 6 now ends with a What you're agreeing to card (the documents to read) and the Sign it off card (signatory name, title and the typed signature, which has to match the signatory name). Step 6 is named Documents & signature in the left column and titled Add your documents, then sign. Step 7 is named Review & submit and holds the summary, the collapsed What happens next bar and the Submit for verification button; its summary row for step 6 reads Documents & signature and says who has signed, and the signatory line left the Owners row. A step 6 left without a signature counts as unfinished like any other step, so it holds Submit back and is named in its hover note (partial-steps-allowed); a typed name that does not match shows its error as soon as it is left. The copy elsewhere that said you'd sign at step 7 now says step 6. Update, 2026-11-11: the What you're agreeing to card is no longer separate; its two tick boxes sit inside Sign it off (terms-as-signing-checkboxes), and the typed signature is replaced by a drawn or uploaded signature (signature-draw-or-upload). Step 6 now ends with the one Sign it off card. Superseded on 2026-11-11 (later) by sign-back-on-step-7: Ryan moved signing back to step 7 the same day. Step 6 is Supporting documents again and step 7 is Agreement & submit.",
      "tradeoff": "Step 6 is now the longest step, and someone who skips a document can still sign it, so the signature no longer says the application is complete; the summary on step 7 has to carry that. The review step no longer ends with the act of signing, so the last thing the applicant does before Submit is read the summary and not commit. Whether Xplor wants the signature recorded after the review, as it was, is not decided.",
      "by": "Ryan",
      "when": "2026-11-11"
    },
    {
      "id": "terms-view-only",
      "area": "Trust",
      "where": "Step 6 · What you're agreeing to",
      "t": "The agreements can be read but there are no tick boxes; typing the name is the agreement to all of it",
      "b": "Ryan: the checkboxes are all unnecessary. The applicant can view the documents, and signing means they agree to everything. The What you're agreeing to card is two rows, the merchant services agreement (No minimum term and no exit fee.) and the privacy policy and terms of service, each with a View button and a Viewed mark once opened. The four ticks that were on step 7 (accept the agreement, accept the privacy policy and terms, agree to sign electronically, confirm authority to sign for the business) are gone. The line under the typed signature now says that by typing their name the signer agrees to the documents above and to sign electronically, confirms they are authorized to sign for the business (or are signing for their own business) and confirms the information is true and accurate to the best of their knowledge, including the step 5 declarations. Superseded on 2026-11-11 by terms-as-signing-checkboxes: Ryan changed his mind within the day. The two documents come back as tick boxes inside the Sign it off card, with the document names as links. Also superseded by sign-back-on-step-7 for where the signing card is.",
      "tradeoff": "One typed name stands in for four separate acknowledgements, so nothing records which part was read or that authority to sign was confirmed on its own. The statement is a small note and is easier to skip than a tick. Compliance and legal have not confirmed that a single typed signature is enough for the electronic signing consent and the authority confirmation, and the authority confirmation used to be recorded with a timestamp for the audit trail.",
      "by": "Ryan",
      "when": "2026-11-11"
    },
    {
      "id": "terms-as-signing-checkboxes",
      "area": "Trust",
      "where": "Step 6 · Sign it off",
      "t": "The two documents are tick boxes inside the signing card, each with the document name as a link",
      "b": "Ryan: what you're agreeing to moves into the signing section as checkboxes, with a simple hyperlink in the checkbox text to view the document. Sign it off now holds the signatory name and title, a What you're agreeing to heading with two required tick boxes (I accept the Xplor Pay merchant services agreement; I accept the privacy policy and terms of service), then the signature. The document name in each box is a link that opens the same reader as before without toggling the box. The separate What you're agreeing to card and its View buttons are gone. The e-sign tick and the authority tick stay removed: the note under the signature says that by signing the person agrees to sign electronically and confirms they are authorized to sign for the business. An untick shows Tick this to sign. when the applicant tries to submit; nothing requires the documents to have been opened. Update, 2026-11-11 (later): the Sign it off card is back at the end of step 7, as the last thing before Submit (sign-back-on-step-7); where this entry says step 6, read step 7.",
      "tradeoff": "Two ticks are back after Ryan removed them earlier the same day (terms-view-only), so there is the friction of two clicks to be able to sign. Ticking does not prove either document was read, since the link is optional. Only the two documents get a tick; whether the e-sign consent and the authority confirmation need their own ticks or are covered by the note is for compliance and legal to confirm. Update, 2026-11-11: Ryan says whether two ticks are enough is still to be decided.",
      "by": "Ryan",
      "when": "2026-11-11"
    },
    {
      "id": "signature-draw-or-upload",
      "area": "Flow",
      "where": "Step 6 · Sign it off",
      "t": "The signature is drawn in a full-width box, or uploaded as an image",
      "b": "Ryan: the Type your legal name to sign box is replaced by a signature box that works like an e-signature product: a full-width white box, four times as wide as it is tall, where the signer draws with a mouse, finger or stylus. Sign here shows inside it until something is drawn. An optional Upload image of signature button, beside a Clear link, lets them add a PNG or JPG instead; it is drawn into the same box, drawing over it replaces it, and Clear empties the box. Only a PNG or JPG under 2 MB is accepted; anything else says Choose a PNG or JPG image. or Choose an image smaller than 2 MB. The signature is required (Draw your signature, or upload an image of it.). The signatory name and title stay as typed boxes, and the old rule that the typed name had to match the signatory name is gone, because nothing is typed. The image is read in the browser and not sent anywhere. Drawn strokes are kept as relative points so the signature redraws at any box size. Update, 2026-11-11 (later): the Sign it off card is back at the end of step 7, as the last thing before Submit (sign-back-on-step-7); where this entry says step 6, read step 7.",
      "tradeoff": "The drawn box cannot be used from a keyboard, so a person who cannot draw has only the upload route. Nothing checks that the drawing is a real signature, or that it matches the signatory, as the typed name used to. An uploaded image could be anyone's signature. Legal and compliance have not confirmed that a drawn or uploaded image counts as the signature for this agreement. Update, 2026-11-11: Ryan says a drawn signature and an uploaded image both count as the signature until further notice.",
      "by": "Ryan",
      "when": "2026-11-11"
    },
    {
      "id": "sign-back-on-step-7",
      "area": "Flow",
      "where": "Step 7 · Sign it off",
      "t": "Signing is back on step 7, the last thing the applicant does before Submit",
      "b": "Ryan: the Sign it off section moves back into step 7, because it should be the last thing they do. Step 7 is the summary of every step, then Sign it off (signatory name and title, the two document tick boxes with links, the drawn or uploaded signature), then the collapsed What happens next bar and Submit for verification. Step 6 is Supporting documents again, with only the file cards, and the rail names are back to Supporting documents and Agreement & submit. The signature check is on step 7 again, so it holds Submit back directly and not through an unfinished step 6. The signatory's name shows on the Owners row of the summary again, and the copy that said you'd sign at step 6 says step 7. This undoes the placement in sign-on-step-6 (2026-11-11); the tick boxes and the drawn signature from terms-as-signing-checkboxes and signature-draw-or-upload stay.",
      "tradeoff": "The applicant signs after the summary and not before it, so the signature covers answers they have just reviewed, which is the point. Step 7 is the longest screen again. A summary row cannot show the signature as done, because the signature sits below it on the same screen.",
      "by": "Ryan",
      "when": "2026-11-11"
    },
    {
      "id": "w9-upload-only",
      "area": "Trust",
      "where": "Step 6 · Supporting documents · W-9",
      "t": "The W-9 is only an upload; there is no Review and sign button",
      "b": "Ryan: the W-9 tax certification is just an upload. The Review and sign button is gone from the row, along with the on-screen W-9 filled from the applicant's answers, its certification tick and its typed-name signature. The row has the same Add file button as every other document and its line reads Upload your signed Form W-9. The row is still required for a US company or non-profit, and a sole proprietor's rules are unchanged.",
      "tradeoff": "The applicant has to find and sign a W-9 themselves, where before the form came filled in from their answers. A W-9 that arrives unsigned or filled in wrongly is caught only after upload, if at all, since nothing here reads the file.",
      "by": "Ryan",
      "when": "2026-11-11"
    },
    {
      "id": "descriptor-section-parked",
      "area": "Step 3",
      "where": "Step 3 · Your card volumes",
      "t": "The How you'll appear section (billing descriptor and statement preview) is taken out of the flow and parked",
      "b": "Ryan: remove the How you'll appear section, but remember it, because he'd like to use it somewhere else in future. The card (billing descriptor box, live statement preview, 22-character counter, and the sample-only Platform field) is no longer on step 3, so the applicant is not asked for a descriptor in onboarding. Its spec, its code and its styles are kept in parked/billing-descriptor.md, and the four descriptor decisions stay in the register marked parked.",
      "tradeoff": "Nothing in onboarding now collects what appears on a customer's statement, so something else has to (a later settings screen, or Ops) or a default has to be used. This register does not say which. The field spreadsheets, the usability kit's fakes and the older persona findings still mention the descriptor.",
      "by": "Ryan",
      "when": "2026-11-11"
    },
    {
      "id": "sign-note-removed",
      "area": "Trust",
      "where": "Step 7 · Sign it off",
      "t": "No note under the signature",
      "b": "Ryan: the note under the signature (By signing, you agree to sign electronically. You confirm that you're authorized to sign for this business, and that the information in this application is true and accurate to the best of your knowledge. That includes your declarations at step 5.) is removed. Sign it off now ends with the signature box and its Upload image of signature and Clear buttons. Ryan gave no reason.",
      "tradeoff": "Nothing on the page now says the signer is confirming their authority to sign, that the information is true, or that they agree to sign electronically; the e-sign and authority ticks were removed earlier the same day. Compliance and legal have not said whether the two ticks for the documents are enough on their own. Update, 2026-11-11: Ryan says whether the removed note's confirmations (authority, truth, electronic signing) are needed is still to be decided.",
      "by": "Ryan",
      "when": "2026-11-11"
    },
    {
      "id": "max-ticket-block-text-removed",
      "area": "Step 3",
      "where": "Step 3 · Your card volumes",
      "t": "The page no longer says a transaction over the maximum is blocked",
      "b": "Ryan: remove the line We block any single sale above this amount. (any single payment, for a non-profit) from the hint under Maximum single transaction, and remove We block any single transaction over $X. from the text under the limits tick box. The hint under the field now stops after Your biggest single sale, even if it only happens now and then. The tick's text reads Your monthly limit is $Y, based on what you entered above. Ask us any time to raise it. Ryan gave no reason, and the box's label still says transaction and monthly limits.",
      "tradeoff": "The applicant is no longer told that a sale above their maximum single transaction is blocked, so the first they hear of it could be a declined sale. The tick still says they have read their limits, but the per-transaction limit is no longer shown anywhere on the page. I reworded the monthly sentence so it no longer says both.",
      "by": "Ryan",
      "when": "2026-11-11"
    },
    {
      "id": "no-uploaded-badge",
      "area": "Visual",
      "where": "Step 6 · Supporting documents",
      "t": "A document row shows no badge once a file is uploaded; the Required badge just goes",
      "b": "Ryan: remove the 1 uploaded badge. When something is uploaded, the Required badge is removed and nothing replaces it. The uploaded file tiles under the row, and the row's border, already say it is done. A row with no file keeps its Required or Optional badge; a row whose only file failed keeps it too.",
      "tradeoff": "A row with no badge looks the same as a row that never needed one, so the applicant reads that it is done only from the file tile below it. The count of files in the row is no longer in the badge.",
      "by": "Ryan",
      "when": "2026-11-11"
    },
    {
      "id": "upload-failure-callout",
      "area": "Step 6",
      "where": "Step 6 · Supporting documents",
      "t": "A file that fails to upload shows an error callout where the uploaded file tile would be",
      "b": "Ryan: add an error state for a file that fails to upload, using the error callout in place of the uploaded file area. In a document row the file tile is replaced by a full-width red-tinted callout with an alert icon: the file name in bold, then didn't upload. Check the file and try again., with Try again (adds the same file again) and Remove links. A failed file does not count as uploaded, so the row keeps its Required badge, step 6 is not complete and the document error still applies. Other files in the same row are unaffected, and a row with one good file and one failed file is done. In the prototype nothing really fails: a Make the next file upload fail box in Prototype options (on the steps) makes the next added file fail once, and Try again then succeeds. It applies to the document rows on step 6, not to the file box on More info needed. The callout is a new red variant of the existing callout, which until now had info, positive and warning styles. The wording is my draft. Update, 2026-11-11: Ryan removed the Try again and Remove links, so the callout shows the message only. Adding another file with Add file is the retry, and it clears the failed file from that row; the failed callout has no way to be dismissed on its own.",
      "tradeoff": "The message does not say why it failed (type, size, connection), because nothing here reads the file and the real reasons are not known; the real product would know and should say. Try again does not re-open a file chooser in the prototype, it just adds the same canned file. (Superseded 2026-11-11: there is no Try again now; Add file does it.)",
      "by": "Ryan",
      "when": "2026-11-11"
    },
    {
      "id": "tick-beside-field",
      "area": "Visual",
      "where": "Step 1 · Website; step 2 · Owner cards · SSN or SIN",
      "t": "The I don't have one tick sits in line to the right of the box, and a locked SSN looks disabled like the website box",
      "b": "Ryan: for both the website box and the SSN or SIN box, the tick box (I don't have a website; This person doesn't have an SSN) moves to the right of the box, in line with it, not below it. The website box fills the row up to the tick. In an owner card the SSN or SIN field takes two thirds of the form: the box is the first third and the tick sits in the second. Ticking the SSN tick now gives the same look as the website tick: the box greys out with the disabled text colour and its border, shows the zeros, and its padlock goes grey too; the cursor is not-allowed.",
      "tradeoff": "In an owner card the tick text can wrap to two lines on a narrower window, and on a phone the tick drops back under the box. A tick sitting beside the box is easier to miss than one under it for someone scanning down the form.",
      "by": "Ryan",
      "when": "2026-11-11"
    },
    {
      "id": "field-helper-text-trims",
      "area": "Copy",
      "where": "Step 1 · Trading address; step 2 · Owner cards · Middle name",
      "t": "No hint under the trading address and no placeholder in the middle name box",
      "b": "Ryan: remove the hint under Trading / physical address (Where you actually trade. We use it to send any card machines.) and the placeholder in the owner's Middle name box (If on their ID). Both boxes are now empty and plain. Ryan gave no reason; the first line was already trimmed earlier the same day after the statement descriptor went (descriptor-section-parked). Update, 2026-11-11 (later): Ryan also removed three more hints on step 1: the line under the EIN that said Nine digits, like 12-3456789 (a sole proprietor's hint now reads only If you have one, and what to do if they do not, and the Canadian hint about leaving off RT0001 stays), the line under the legal name that said This needs to match your government registration exactly, and the same line under the registered address for a company or non-profit (a sole proprietor's business address hint is unchanged). Ryan gave no reason.",
      "tradeoff": "Nothing now tells the applicant that a trading address is where card machines are sent, and a middle name box with no placeholder relies on its Optional state to say it can be left empty. Update, 2026-11-11 (later): with the EIN shape hint gone, nothing tells a US applicant the number is nine digits until they enter a wrong one and the error says so, and with the registration hints gone nothing asks for the name and address to match the registration exactly, which the Find your business lookup and the tax documents at step 6 now have to carry.",
      "by": "Ryan",
      "when": "2026-11-11"
    },
    {
      "id": "section-status-chip",
      "area": "Step 2",
      "where": "Step 2 · Owner cards · section headings",
      "t": "Each owner section heading shows where it stands: Not started, N of M done, then a green tick",
      "b": "Ryan: the Identity verification section is required but easy to pass by, so each section heading (Personal details and Identity verification) now shows its state beside the title, not beside the chevron (moved there on 2026-11-11 at Ryan's request, having first been at the right), whether the section is open or closed. Until the applicant has entered something in it (or nothing valid is in, on a listed owner) it reads Not started in the warning colour; starting values such as Director and 10%, or a country filled in for them, do not count as a start on an owner they added. Once some of the required answers are in it reads, for example, 3 of 6 done in the purple (brand) colour. When all are in it is replaced by a green tick circle (the same one the review summary uses), with Complete for screen readers. The count is the required answers that are filled in and valid out of the required answers in that section; optional boxes (the middle name) and the SSN tick are not counted, and a non-profit has no SSN or ownership percentage so its counts are smaller. Ryan chose this from four options and dropped the word Required from the chip. Nothing is blocked or opened for the applicant: an empty required field still shows no error (errors-only-for-bad-entries), and the sections still open and close on their own. Superseded in part, 2026-11-11: prefilled values now count, and the Not started exception for added owners is gone (see status-chip-counts-prefilled).",
      "tradeoff": "A section that holds a wrong entry counts it as not done but does not say so in the chip; the existing Needs a look pill on the owner row and the error under the field do that. A section starts in the warning colour on every empty owner card, so a new card shows two warning chips at once, which makes an empty card look more urgent than the form means it to. The earlier count and minutes badges were removed on 2026-11-09 as noise; this chip is different because it changes with progress, but it is on both headings all the time.",
      "by": "Ryan",
      "when": "2026-11-11"
    },
    {
      "id": "section-done-buttons",
      "area": "Step 2",
      "where": "Step 2 · Owner cards · sections",
      "t": "Each owner section ends with a Done button: Personal details moves on to Identity verification, and Identity verification closes the owner card",
      "b": "Ryan asked for a secondary Done button at the foot of every open section in an owner card. In Personal details it closes that section and opens Identity verification. In Identity verification it closes the whole owner card. The Done button that used to sit at the bottom of the full card is removed. Like the old one, Done saves and checks nothing: each field is kept as it is filled in, so an incomplete section can be closed and any problem only shows when the applicant continues. A section the applicant opened by hand and a section forced open by a shown error both get the button. On the page an invited owner sees there is no card to close, so the last section has no Done there; the first still moves on to the next section. Ryan gave no reason beyond the request; the flow reads as a guided walk through the form, one section at a time. Supersedes the position of the Done button in owner-done-button.",
      "tradeoff": "The card's Done is now only reachable from the last section, so an applicant who opens just Personal details has to use the card header to close it, and an applicant who opens Identity verification first sees Done close the card without ever visiting Personal details (the status chip still says Not started). Nothing in the prototype yet says the order is required.",
      "by": "Ryan",
      "when": "2026-11-11"
    },
    {
      "id": "status-chip-counts-prefilled",
      "area": "Step 2",
      "where": "Step 2 · Owner cards · section headings, owner row",
      "t": "Prefilled owner fields count in the section chip; a new owner starts with only an ownership share filled in (100 for the first owner, then what is left) and reads 1 of 10 done; the owner row's Remove button is just a trash can",
      "b": "Ryan: any field that starts prefilled is counted by the section status chip, so an owner added with Add myself starts partly done (5 of 10 done in Personal details and 1 of 6 in Identity verification) because the title, ownership percentage, email, phone and the two countries are already in. Before this, a section on any added owner read Not started until the applicant typed something, even with those values in. A new owner added with Add another owner or director has one prefilled field, an ownership percentage (it first started empty on 2026-11-11, then Ryan asked for 100, then agreed to go back to the share still unaccounted for, never below 25, so the first owner gets 100 and later ones get what is left), so its Personal details reads 1 of 10 done and Identity verification reads Not started. Title and both countries start empty, so its row reads that share with no title until one is entered. A non-profit has no ownership percentage, so its new owner still reads Not started. Add myself keeps its prefilled values (decision owner-share-minimum still sets its percentage). Also on 2026-11-11, Ryan removed the word Remove from the Remove button on an owner row: it is a trash can icon only, with the owner's name kept as its accessible label. Supersedes the added-owner exception in section-status-chip.",
      "tradeoff": "A trash can with no word is less obvious than a labelled button, and it sits beside the open and close chevron, so an applicant could press it by mistake; the confirmation dialog that follows is the safeguard. A new owner now has an empty title, so the applicant types it, where before they only edited a suggested Director. Because the share is the amount left, a company already at 100% or more gives a new owner 25, so the total can still pass 100% and the Ownership comes to more than 100% message can show when the applicant continues (Ryan's call, no reason given beyond wanting 1 of 10 at the start).",
      "by": "Ryan",
      "when": "2026-11-11"
    },
    {
      "id": "summary-counts-only",
      "area": "Flow",
      "where": "Step 7 · Summary rows",
      "t": "Each summary row on the last step says only how many answers are in, such as 10 of 10 done, and no longer repeats what was entered",
      "b": "Ryan: the supporting text under each title in the step 7 summary was lengthy, and trying to note everything entered is silly, so each row now reads just N of M done. The count is the same tally that drives the step's percentage (decision step-percent-done): the required answers that are in and valid out of the required answers the step needs, which includes each required document and the owner list. A step with no problems reads every answer as done, so a finished step reads, for example, 10 of 10 done. A step that is not finished still shows its ring and a Continue link; a finished one shows the green tick and an Edit link. The business name, owners and percentages, volumes, bank name, declarations and document counts that the rows used to list are gone from this screen.",
      "tradeoff": "The applicant can no longer check their answers at a glance on the last screen before signing; they have to open a section with Edit to see what they entered. A count such as 10 of 10 done says nothing about whether the answers are right. Optional answers are not counted, so a row can read complete while optional boxes are empty.",
      "by": "Ryan",
      "when": "2026-11-11"
    },
    {
      "id": "biz-card-selected-fill",
      "area": "Visual",
      "where": "Business type page · Radio cards",
      "t": "The selected business type card has a very faint purple fill as well as its purple outline",
      "b": "Ryan: when a radio card on the business type page is selected it gets the very faint purple background (the brand subtle colour, the same one the current step in the left column uses), in addition to the 2px brand outline and the filled radio dot it already had. Unselected cards keep the raised white fill.",
      "tradeoff": "Ryan gave no reason beyond the request. The fill is very faint, so on a low-contrast screen the outline and the dot still carry the selected state.",
      "by": "Ryan",
      "when": "2026-11-11"
    },
    {
      "id": "document-drop-zone",
      "area": "Visual",
      "where": "Step 6 · Supporting documents",
      "t": "Document rows are cards in two columns, each with a drag-or-browse drop zone under its text instead of an Add file button; uploaded files stack below the zone",
      "b": "Ryan: make the document upload cards more card shaped, in a two column grid and not stacked one per row, and replace the Add file button with a drag or upload file drop zone, creative in look, placed below the text in the card. Each card is the document's icon, title, badge, hint and Why we ask at the top, then the drop zone, then the uploaded files. The zone is about twice the height of an uploaded file's tile (112px against 56px). It is a dashed outline with a purple upload icon and the words Drag a file here or browse; holding a file over it fills it with the faint purple and lifts the icon, and it behaves the same under the pointer and the keyboard. Files an applicant adds stack one under another below the zone, each tile with its name and Remove, or Uploading for a moment. A failed file shows the red callout in the same place (upload-failure-callout). The two cards in a row share their rows, so their drop zones stay level whatever their text or files. On a phone the cards go one to a row. The zone stays on the card after a file is in, so any number of files can be added, and an error on the card turns the dashed outline red. In the prototype, pressing the zone adds the canned file as before; dropping real files adds a tile for each, named after the file, and nothing is read or sent. A file dropped anywhere else on the page is ignored so the browser does not leave the prototype.",
      "tradeoff": "Two columns make each card about half as wide, so a long document title and its hint wrap to more lines and the cards are taller than the old rows. A lone last card sits half-width with an empty space beside it. Ryan did not say which file types or sizes the real zone accepts, and the zone says nothing about them, so an applicant only learns a file is wrong after it fails. The two-to-a-row file tiles of document-add-file-grid are replaced by a single stack, because the card is now half the page wide.",
      "by": "Ryan",
      "when": "2026-11-11"
    },
    {
      "id": "business-lookup-typeahead",
      "area": "Flow",
      "where": "Step 1 · Find your business",
      "t": "Step 1 opens with a Find your business card: pick a country, type the business name, and choose it from a list to fill in the name and address; a Prototype option turns it off and everything is typed in as before",
      "b": "Ryan: Trulioo's KYB Prefill can search by country and business name and return matching businesses with their address, so step 1 has a simple country and business name search again (the registry lookup was removed in ein-in-registered-details). A Find your business card sits above Registered details, for a company or non-profit; a sole proprietor is not offered it, because they are a person and not a registered business. The country starts as the applicant's region, and changing it changes the region. After three characters the name box lists matching businesses as the applicant types, up to five, each with the registered name, its address and, when other businesses share that name, a line saying how many do and asking them to check the address is theirs. Picking one fills in the legal name and the registered address (the address boxes open so the parts can be checked) and shows a green confirmation with the name and address, a reminder to check them against the registration, and a Search again link. Nothing else is filled in: not the EIN, the date, the state of incorporation or the structure. The last row of the list is always Can't find it? Enter details manually, and no match says so in the list; either one leaves the card as a one-line note with a link back to searching. The card is optional and never counts towards the step, and every field below stays editable. A Prototype option, Business lookup (step 1), switches it off, so the card is not shown and everything is typed in, as before; the default is on. Trulioo's page says the search is made for search-as-you-type, takes optional state and city, caps the list with a limit, ranks by confidence and returns a count of other businesses with the same or similar name. In the prototype the list is a short fixed set per country with several businesses sharing a name, and a short wait stands in for the request. Update, 2026-11-11 (same day): Ryan asked for two changes. Opening the box before typing now lists five of the sample businesses so there is something to pick straight away, and from three characters the list is the search. And the rest of step 1 (Registered details, Addresses, How we reach you, What the business sells) is not shown until a business has been picked from the list or the applicant has chosen Can't find it? Enter details manually, so the lookup is the first thing they see. A business whose name is already in (a returning applicant, the sample business, or someone who pressed Search again after picking) keeps the sections showing, and once a business has been picked or manual entry chosen the sections stay shown even if the name is later cleared. The hidden fields still count towards the step's progress, so step 1 does not read as done while it is hidden. Ryan gave no reason for either change.",
      "tradeoff": "Typing more does not reliably find the business: Trulioo's own page says businesses can share a name and it returns a duplicate count (the example shows 57), so the list can hold several identical names and only the address tells them apart. The applicant could pick the wrong one, and the name and address are filled in from it. There is no state or city box, so a common name cannot be narrowed except by reading addresses. Trulioo's page does not say how well it covers small businesses, sole proprietors or Canada, whether it returns an incorporation date, structure or EIN, or what each search costs, so none of those are assumed, and whether this is better than typing everything in depends on the answers. The real search needs a call from our back end with Trulioo credentials, never from the page. This partly reverses the removal in ein-in-registered-details, which closed by saying an address prefill could come back if Trullio could return a reliable match. Hiding the sections means an applicant who already has everything to hand must still pick or press the manual link before they see a field, one extra step for them, and anyone who does not notice the manual link may think the form is only the search.",
      "by": "Ryan",
      "when": "2026-11-11"
    },
    {
      "id": "decisions-list-shows-kept-only",
      "area": "Flow",
      "where": "Prototype options",
      "t": "The Design decisions pins and Read all list show only the decisions that remain after the requirements review",
      "b": "Ryan: the design decisions still showing in the prototype should be only the remaining ones after the slim down. The 134 items cut or folded in REQUIREMENTS-DRAFT.md no longer get a pin on screen and are left out of the Read all list and its count; REQ-154 (marked Revisit) and the decisions added after the review still show. Numbers stay each entry's place in the register, so a pin matches its REQ number in the requirements draft and the numbers have gaps. The cut ones are listed in CUT_DECISIONS in app.js. A decision added later shows until a review cuts it, and it needs adding to CUT_DECISIONS if the review cuts it. Ryan gave no other reason.",
      "tradeoff": "The register in app.js and DESIGN-DECISIONS.md still hold every entry, because they are the archive that answers why it is like this, so the screen and the register no longer agree on the count. CUT_DECISIONS has to be kept in step with the review by hand.",
      "by": "Ryan",
      "when": "2026-11-11"
    }
  ];

  /* DECISIONS:END */

  // Decisions cut or folded into another item in the requirements review
  // (REQUIREMENTS-DRAFT.md, finished 2026-11-11). They stay in DECISIONS above as
  // the archive that answers "why is it like this?" (and in DESIGN-DECISIONS.md),
  // but the prototype's pins and its "Read all" list skip them, so the screen shows
  // only the decisions that remain after the slim down. A decision added later
  // shows until a review cuts it. Numbers are still each entry's place in DECISIONS,
  // so a pin matches its REQ number in the requirements draft.
  const CUT_DECISIONS = [
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
    "moreinfo-simple-trial", "email-logo-above-card", "review-screen-email-then-respond",
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
    { n: 1, label: "Business & address", time: "3 min" },
    { n: 2, label: "Owners & signatory", time: "4 min" },
    { n: 3, label: "How you take payments", time: "3 min" },
    { n: 4, label: "Payout account", time: "1 min" },
    { n: 5, label: "Compliance declarations", time: "2 min" },
    { n: 6, label: "Supporting documents", time: "2 min" },
    { n: 7, label: "Agreement & submit", time: "2 min" }
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
    velocityAck: false,
    bankName: "", accountHolder: "", accountType: "", routing: "", accountNumber: "",
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
    channel: "In-person and online", goods: "Services and subscriptions",
    recurring: "yes", trial: "no", marketplace: "no", international: "no",
    refundPolicy: "riversidepilates.com/refunds",
    prior: "no",
    velocityAck: true,
    bankName: "Umpqua Bank", accountHolder: "Riverside Pilates LLC",
    accountType: "Business checking", routing: "323075880",
    accountNumber: "1234 5678 4417", institution: "003", transit: "00172",
    legalProceedings: "no", priorTermination: "no", taxLiens: "no", msb: "no",
    matchConsent: true, ofacAck: true
  });

  // Business category is a merchant category code (MCC). The full list lives in mcc-codes.js, but the applicant only sees
  // the codes set up for their division (decision mcc-from-division). In the real product Ops builds each division in
  // Odin with its own finite list of codes, so the picker inherits it. These three lists are INVENTED stand-ins
  // (DIVISION_MCC), not Ops's lists. Standard has 32 codes, ClubReady 14 and Club Essentials 20, to show a short and a longer list.
  const MCC_LIST = String(window.MCC_CODES || "").split("\n").filter(Boolean).map((l) => { const p = l.split("\t"); return { code: p[0], name: p[1], label: p[0] + " · " + p[1], hay: (p[0] + " " + p[1]).toLowerCase() }; });
  const DIVISION_MCC = {
    [DIV_STANDARD]: ["5462", "5499", "5651", "5732", "5811", "5812", "5814", "5942", "5947", "5977", "5995", "5999", "7221", "7230", "7298", "7299", "7333", "7349", "7392", "7399", "7699", "7911", "7997", "8011", "8041", "8099", "8111", "8299", "8351", "8398", "8641", "8661"],
    [DIV_CLUBREADY]: ["5499", "5941", "5977", "7230", "7297", "7298", "7299", "7911", "7941", "7997", "7999", "8011", "8041", "8099"],
    [DIV_CE]: ["5499", "5811", "5812", "5813", "5941", "5947", "7011", "7032", "7230", "7298", "7299", "7911", "7933", "7941", "7992", "7997", "7999", "8299", "8398", "8641"]
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
  const bizList = () => BIZ_STUBS[isCa() ? "Canada" : "United States"];
  const withDups = (x) => Object.assign({}, x, { dups: bizList().filter((y) => y !== x && y.name.toLowerCase() === x.name.toLowerCase()).length });
  // A few businesses shown as soon as the box is opened, before anything is typed (decision business-lookup-typeahead).
  const suggestBiz = () => (isCa() ? [0, 2, 5, 6, 7] : [0, 3, 8, 9, 11]).map((i) => withDups(bizList()[i]));
  const searchBiz = (q) => {
    const t = String(q || "").toLowerCase().split(/\s+/).filter(Boolean);
    if (String(q || "").trim().length < 3) return [];
    return bizList()
      .filter((x) => t.every((w) => x.name.toLowerCase().indexOf(w) > -1))
      .map(withDups)
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
  const searchMcc = (q) => { const t = String(q || "").toLowerCase().split(/\s+/).filter(Boolean); const all = divisionMccs(); return t.length ? all.filter((x) => t.every((w) => x.hay.indexOf(w) > -1)) : all; };

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
          { id: 1, name: "Dana Whitfield", initials: "DW", pct: 60, role: "Owner / CEO", status: "pending", self: true },
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
      comboQuery: "",
      comboIdx: 0,
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
      openOwner: 1,
      // The furthest step the applicant has opened. Steps up to here can be returned to from the left column; later ones cannot (decision partial-steps-allowed).
      maxStep: 1,
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
      // The signature: empty, drawn in the box (strokes kept as 0 to 1 points so it redraws at any size) or an uploaded image (decision signature-draw-or-upload).
      sign: "",
      signStrokes: [],
      signImgName: "",
      signErr: "",
      submittedAt: "",
      // True when Ops has asked for more information by email, which changes the waiting screen (decision more-info-by-email).
      askedMore: false,
      saveEmailErr: "",
      saveEmail: sample ? "finance@riversidepilates.com" : "",

      // SIMPLE TRIAL: the cards on the simple More info screen, { id, name (the file, "" for none), busy, note }. Starts with one empty card.
      rfiDocs: [{ id: 1, name: "", busy: false, note: "" }],
      // Extra bank accounts on step 4: just their numbers (1, 2, ...). Each one's answers live in a as x<n>_bankName and so on.
      a: Object.assign({}, sample ? SAMPLE_ANSWERS : EMPTY_ANSWERS, sample && isCa() ? Object.assign({ structure: "Private corporation", legalName: CA_NAME, accountHolder: CA_NAME }, CA_SAMPLE_BUSINESS) : {})
    };
  }

  const state = Object.assign({
    infoOpen: false,
    saveOpen: false,
    helpOpen: false,
    protoOpen: false,
    openNote: "",
    notesListOpen: false,
    whyOpen: false,
    fieldWhy: "",
    nextTip: false,
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
    saving: false,
    nextOpen: false
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
  function showToast(text) {
    clearTimeout(toastTimer);
    setState({ toast: { id: Date.now(), text: text } });
    toastTimer = setTimeout(() => setState({ toast: null }), 4500);
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
    // The limits tick is about the numbers shown from these two answers, so it clears when either limit changes, or is emptied (decision limits-from-entries). Compared as numbers, so 40000 and 40,000 count as the same.
    if (id === "monthlyVolume" || id === "maxTicket") {
      const before = limitsFrom(s.a), after = limitsFrom(a);
      if (!after.ready || before.perTx !== after.perTx || before.monthly !== after.monthly) a.velocityAck = false;
    }
    return { a: a };
  });
  // The value stored in the website answer when the applicant says they have no website.
  const NO_WEBSITE = "N/A";
  // The value stored in an owner's SSN or SIN answer when they have none: all zeros in the usual layout for the country.
  const noNatIdValue = () => (isCa() ? "000 000 000" : "000-00-0000");
  // The transaction limits come from the step 3 answers: the biggest single sale is the per-transaction limit and the estimated monthly card volume is the monthly limit.
  function limitsFrom(a) {
    const num = (x) => parseFloat(String(x || "").replace(/,/g, ""));
    const monthly = num(a.monthlyVolume), perTx = num(a.maxTicket);
    const missing = [];
    if (!(monthly > 0)) missing.push("your estimated monthly card volume");
    if (!(perTx > 0)) missing.push("your maximum single transaction");
    return { ready: missing.length === 0, missing: missing, monthly: monthly, perTx: perTx };
  }
  const go = (screen, step) => setState({ screen, step: step || state.step, saveOpen: false });

  // Where the link lands once the applicant has signed in (decision 91): the welcome page for someone new, otherwise wherever the
  // application has got to. A returning visit loads the saved sample business.
  function openLink() {
    if (ctx.link === LINK_NEW) { setState({ screen: "welcome" }); return; }
    restored = true;
    resetData();
    if (ctx.link === LINKS.returning) {
      setState({ screen: "flow", step: 4 });
      showToast("Welcome back. Your answers are saved.");
      return;
    }
    // More info needed: in Slice 1 the applicant answers on a screen in the product; in Slice 2 Ops asks by email, so the applicant sees the waiting screen with a note to check their inbox (decisions more-info-by-email, more-info-slice-swap).
    const asked = ctx.link === LINKS.info;
    const screen = asked && !invitesOn() ? "rfi" : ctx.link === LINKS.approved ? "approved" : "submitted";
    setState({ screen, submittedAt: "9:12 AM", askedMore: asked && invitesOn() });
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
  const next = () => {
    if (state.step < 7 && blockedByProblems()) return;
    if (state.step < 7) { setState({ step: state.step + 1 }); return; }
    if (stepGaps().length) return;
    attempt(() => setState({ screen: "submitted", submittedAt: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) }));
  };
  const editFromReview = (step) => setState({ step, editing: true, saveOpen: false });
  const saveEdit = () => setState({ step: 7, editing: false });
  const back = () => (state.step <= 1 ? setState({ screen: "bizType" }) : setState({ step: state.step - 1 }));

  // Legal structure choices (decision company-structure-nine-types). Each maps to one ODIN ownership type; sole proprietor, tax-exempt and government come from the card and the pills.
  const NONPROFIT_TYPES = ["Tax-exempt", "Government body"];
  const companyStructures = () => isCa()
    ? ["Private corporation", "Public corporation (publicly traded)", "Private partnership", "Public partnership (publicly traded)", "Limited liability partnership (LLP)"]
    : ["Private corporation", "Public corporation (publicly traded)", "Private partnership", "Public partnership (publicly traded)", "Limited liability company (LLC)", "Limited liability partnership (LLP)"];
  const BIZ_TYPES = [
    { id: "company", label: "Company", desc: "A registered business, such as an LLC, corporation or partnership." },
    { id: "individual", label: "Individual / Sole proprietor", desc: "You run the business yourself and haven't registered it as a company or corporation." },
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
    showToast(changing ? "Invite sent to " + email + " instead. The old one no longer works." : "Invite sent to " + email + ". You can carry on with the rest in the meantime.");
  }
  // The card's actions menu (decision owner-actions-menu). Cancel invite before they have signed in, Remove access after, Remove owner at any time.
  const closeMenu = () => setState({ menuOwner: 0 });
  const ownerById = (id) => state.owners.filter((x) => x.id === id)[0];
  function resendInvite(id) {
    const o = ownerById(id);
    setState({ menuOwner: 0 });
    showToast("Invite sent again to " + (o && o.inviteEmail ? o.inviteEmail : "that address") + ".");
  }
  function cancelInvite(id) {
    const o = ownerById(id);
    setState({ menuOwner: 0, owners: state.owners.map((x) => (x.id === id ? Object.assign({}, x, { status: "pending", inviteEmail: "", signedIn: false, received: false, revoked: false }) : x)) });
    showToast("Cancelled the invite to " + (o && o.inviteEmail ? o.inviteEmail : "them") + ".");
  }
  const askConfirm = (kind, id) => setState({ menuOwner: 0, confirm: { kind: kind, id: id } });
  const closeConfirm = () => setState({ confirm: null });
  // Removing access keeps the card and everything typed into it (PRD FR-07); the applicant can fill in the rest.
  function revokeAccess() {
    const id = state.confirm && state.confirm.id;
    const o = ownerById(id);
    if (!o) { closeConfirm(); return; }
    setState({ confirm: null, owners: state.owners.map((x) => (x.id === id ? Object.assign({}, x, { status: "pending", revoked: true }) : x)) });
    showToast("Removed access for " + (ownerInfo(o).name === "New owner" ? "them" : ownerInfo(o).name) + ". What they entered stays.");
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
    showToast("Removed " + name + ".");
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
    if (month < 1 || month > 12) return "That month isn't right. This field goes " + datePh() + ", so the " + (ca ? "second" : "first") + " part is the month, 01 to 12.";
    if (day < 1 || day > new Date(year, month, 0).getDate()) return "That day isn't right for the month. This field goes " + datePh() + ".";
    const when = new Date(year, month - 1, day), today = new Date(); today.setHours(0, 0, 0, 0);
    if (year < 1900) return "Check the year: it can't be before 1900.";
    if (key === "idExpiry" ? when < today : when > today) return key === "idExpiry" ? "This ID has expired. Use one that is still valid." : "That date is in the future.";
    return "";
  }

  // Pre-filled answers for each owner. Owners added during the session start
  // empty apart from neutral defaults.
  // 18000 -> 18,000; leaves anything that is not a plain number alone.
  const fmtMoney = (s) => { const n = String(s).replace(/,/g, ""); return /^\d+(\.\d+)?$/.test(n) ? Number(n).toLocaleString("en-US") : String(s); };
  const digitsOf = (s) => String(s == null ? "" : s).replace(/\D/g, "");

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

  function fieldError(f) {
    // The EIN or business number is checked whenever something is typed, even for a sole proprietor, where it is optional.
    if (f.id === "ein" && !f.disabled && String(f.value).trim()) { const p = einProblem(f.value); if (p) return p; }
    if (!f.required || f.disabled) return "";
    const v = f.value;
    if (f.kind === "check") return v === true ? "" : "Tick this to finish this step.";
    if (f.kind === "yn") return v ? "" : "Choose yes or no.";
    if (f.kind === "pills") return v ? "" : "Choose one.";
    if (f.kind === "select") return v ? "" : "Choose one.";
    if (f.kind === "combo") return v ? "" : "Choose the closest business category.";
    if (f.kind === "masked" && String(v).indexOf("•") > -1) return "";
    if (!String(v).trim()) return "Fill this in to finish this step.";
    const key = f.id.replace(/^o\d+_/, "");
    const d = digitsOf(v);
    const ca = isCa();
    // An address is complete once it has a street, city, state or province, and ZIP or postal code (decision address-split-fields).
    if (f.kind === "address") { const p = addrOf(f.id, v); if (!p.l1.trim() || !p.city.trim() || !p.region.trim() || !p.postal.trim()) return "Fill in the street, city, " + (ca ? "province and postal code." : "state and ZIP code."); }
    if (key === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(v).trim())) return "Enter an email like name@example.com.";
    if (key === "phone" && (d.length < 10 || d.length > 15)) return "Enter the full number, including the area code.";
    if (DATE_KEYS.indexOf(key) > -1) { const p = dateProblem(key, v); if (p) return p; }
    if (key === "natId" && d.length !== 9) return ca ? "A SIN has 9 digits." : "An SSN has 9 digits.";
    if (key === "routing" && d.length !== 9) return "A routing number has 9 digits.";
    if (key === "institution" && d.length !== 3) return "An institution number has 3 digits.";
    if (key === "transit" && d.length !== 5) return "A transit number has 5 digits.";
    if (key === "accountNumber" && (d.length < (ca ? 7 : 4) || d.length > (ca ? 12 : 17))) return ca ? "An account number has 7 to 12 digits." : "An account number has up to 17 digits.";
    if (key === "pct" || key === "cpSplit") {
      const n = parseFloat(v);
      if (!isFinite(n) || n < 0 || n > 100) return "Enter a number from 0 to 100.";
      // Only owners with 25% or more are listed (decision owner-share-minimum).
      if (key === "pct" && n < 25) return "Enter 25 or more. We only need owners with 25% or more.";
    }
    if (f.kind === "currency" && !(parseFloat(String(v).replace(/,/g, "")) > 0)) return "Enter an amount greater than zero.";
    // The biggest single sale cannot be smaller than the average one. Only checked once both amounts are in.
    if (f.id === "maxTicket") {
      const avg = parseFloat(String(state.a.avgTicket || "").replace(/,/g, ""));
      if (avg > 0 && parseFloat(String(v).replace(/,/g, "")) < avg) return "Your biggest single sale can't be smaller than your average of $" + fmtMoney(state.a.avgTicket) + ".";
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
      if (!owners.length) { if (!problemsOnly) errs.owners = "Add the " + (isNonprofit() ? "people who run the organization" : "owners") + " to finish this step."; }
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
    // Signing is the last thing on the last step (decision sign-back-on-step-7): the signatory's name and title, the two document ticks and a signature.
    if (step === 7) {
      const signatory = (a.signatoryName !== undefined ? a.signatoryName : (a.sigSame === "no" ? (a.sigName || "") : (ownerVal(state.owners[0] || {}, "name") || ""))).trim();
      const title = a.signatoryTitle !== undefined ? a.signatoryTitle : (a.sigSame === "no" ? (a.sigTitle || "") : (((owners.filter((o) => o.self)[0] || state.owners[0]) || {}).role || ""));
      unit(true, !!signatory); unit(true, !!String(title).trim()); unit(true, state.sign !== "");
      unit(true, a.acceptAgreement === true); unit(true, a.acceptPrivacy === true);
      if (!signatory && !problemsOnly) errs.signatoryName = "Enter the signatory's full legal name.";
      if (!String(title).trim() && !problemsOnly) errs.signatoryTitle = "Enter the signatory's title.";
      if (a.acceptAgreement !== true && !problemsOnly) errs.acceptAgreement = "Tick this to sign.";
      if (a.acceptPrivacy !== true && !problemsOnly) errs.acceptPrivacy = "Tick this to sign.";
      if (state.sign === "" && !problemsOnly) errs.sign = "Draw your signature, or upload an image of it.";
    }
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
  function stepCount(step) {
    const tally = { total: 0, done: 0 };
    const complete = !Object.keys(stepErrors(step, false, tally)).length;
    return { total: tally.total, done: complete ? tally.total : tally.done, complete };
  }

  // Errors on show for the current step. Empty until the first attempt, then
  // live, so each message clears the moment its field is put right.
  let ERR = {};
  const errView = (key) => ERR[key] && html`<p class="field-error" role="alert">${ERR[key]}</p>`;

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
      annual: !!o.annual,
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
      f("role", "Title / role", "text", { placeholder: "e.g. Director" }),
      isNonprofit() ? null : f("pct", "Ownership percentage", "text", { placeholder: "e.g. 40", hint: isSole() ? "" : "We only need owners with 25% or more." }),
      // Facts about the person.
      f("dob", "Date of birth", "mono", { placeholder: datePh() }),
      f("nationality", "Nationality", "select", { placeholder: "Choose a country", options: countries() }),
      f("residence", "Country of residence", "select", { placeholder: "Choose a country", options: countries() }),
      f("home", "Home address", "address", { span: true, placeholder: addressPh() }),
      // Email and phone close Personal details; there is no separate How to reach them section (decision owner-form-two-sections).
      f("email", "Email address", "text", { placeholder: "name@example.com" }),
      f("phone", "Phone number", "text", { placeholder: "+1 (555) 000-0000" }),
      sub("id", "Identity verification"),
      f("idType", "Government ID type", "select", { placeholder: "Choose an ID type", options: ["Driver's " + licWord(), "Passport", "National ID card"] }),
      f("idNumber", "Government ID number", "masked", { sensitive: true, placeholder: "As shown on the document", why: "We match this to the photo of your ID in step 6 to confirm who you are. It goes to Trullio, our verification partner." }),
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
        placeholder: ca ? "000 000 000" : "000-00-0000",
        why: (ca ? "Anti-money-laundering rules mean we have to confirm who owns and runs the " + orgWord() + ". Sent straight to Trullio, our verification partner. Never stored on Xplor systems." : "Anti-money-laundering rules mean we have to confirm who owns and runs the " + orgWord() + ". ITIN is fine if you're a US tax resident without an SSN. Sent straight to Trullio, our verification partner, and never stored by Xplor.")
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
    hint: [isSole() && "If you have one.", ca && "Just the first 9 digits. Leave off RT0001 or similar.", isSole() && "If you don't, you'll give your " + (ca ? "SIN" : "SSN") + " in step 2 instead."].filter(Boolean).join(" ")
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
          fld("legalName", isSole() ? "Your full legal name" : "Legal " + orgWord() + " name", "text", { span: isSole() || isNonprofit(), placeholder: isSole() ? "As it appears on your tax records" : isNonprofit() ? "e.g. Riverside Community Foundation" : "e.g. Riverside Pilates LLC" }),
          // The EIN or business number is typed here like any other detail; nothing is looked up from it (decision ein-in-registered-details). A company or non-profit has to give one; a sole proprietor may not have one.
          isCompany() ? fld("dba", "Doing business as (DBA)", "text", { optional: true, placeholder: "e.g. Riverside Pilates" }) : einField(ca),
          isCompany() ? einField(ca) : fld("dba", isSole() ? "Trading name" : "Doing business as (DBA)", "text", { optional: true, placeholder: isSole() ? "If you trade under a different name" : "e.g. Riverside Pilates" }),
          isSole() ? null : fld("incorporated", isNonprofit() ? "Date registered" : "Date of incorporation", "mono", { placeholder: datePh() }),
          ca || isSole() ? null : fld("stateInc", isNonprofit() ? "State registered in" : "State of incorporation", "select", { placeholder: "Choose a state", options: US_STATES })
        ]),
        card("s1-addr", "Addresses", "", [
          fld("regAddress", isSole() ? "Business address" : "Registered / legal address", "address", { span: true, placeholder: addressPh(), hint: isSole() ? "Where your business is based. If you work from home, this can be your home address." : "" }),
          fld("tradingSame", "Is that also where you operate?", "yn", { span: true }),
          a.tradingSame === "no" ? fld("tradingAddress", "Trading / physical address", "address", { span: true, conditional: true, placeholder: addressPh() }) : null
        ]),
        card("s1-contact", "How we reach you", isNonprofit() ? "For account notices and questions from the people paying you. We won't add you to any marketing." : "For account notices and customer queries. We won't add you to any marketing.", [
          fld("phone", isNonprofit() ? "Organization phone number" : "Business phone number", "text", { placeholder: "+1 (555) 000-0000" }),
          fld("email", isNonprofit() ? "Organization email address" : "Business email address", "text", { placeholder: isNonprofit() ? "hello@yourorganization.org" : "hello@yourbusiness.com" }),
          // The website is required. A business with none ticks the box, which fills the box with N/A and locks it (decision website-required-with-none-box).
          fld("website", "Primary website URL", "text", { span: true, locked: a.noWebsite === true ? NO_WEBSITE : undefined, placeholder: isNonprofit() ? "yourorganization.org" : "yourbusiness.com", tick: fld("noWebsite", "I don't have a website", "check", { optional: true }) })
        ]),
        card("s1-desc", isNonprofit() ? "What the organization does" : "What the business sells", "", [
          // The list holds only the codes set up for the applicant's division (decision mcc-from-division).
          fld("category", "Merchant category code (MCC)", "combo", { span: true, placeholder: "Search by name or code", hint: html`Pick the closest match from the list. Not sure which one fits? Search by a word that describes what you sell, like “fitness” or “retail”.` })
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
          a.sigSame === "no" ? fld("sigTitle", "Title", "text", { conditional: true, placeholder: "e.g. Director" }) : null
        ], { assurance: "You'll sign at step 7, and nothing's binding until you type your name there." })
      ];
    }
    if (step === 3) {
      return [
        card("s3-vol", "Your card volumes", "Best guesses are fine. These set your limits, not your rate.", [
          fld("monthlyVolume", "Estimated monthly card volume", "currency", { placeholder: "40,000", annual: true }),
          fld("cpSplit", "Card present %", "mono", { placeholder: "70", tall: true, hint: "In person, on a card machine." }),
          fld("avgTicket", "Average transaction amount", "currency", { placeholder: "38" }),
          fld("maxTicket", "Maximum single transaction", "currency", { placeholder: "1,200", hint: isNonprofit() ? "Your biggest single payment or donation, even if it only happens now and then." : "Your biggest single sale, even if it only happens now and then." }),
          fld("prior", "Have you accepted card payments before?", "yn", { span: true }),
          a.prior === "yes" ? fld("priorName", "Prior processor name", "text", { conditional: true, placeholder: "e.g. Square, Stripe" }) : null,
          a.prior === "yes" ? fld("priorCbRatio", "Chargeback ratio at prior processor", "mono", { conditional: true, placeholder: "0.4%" }) : null,
          fld("velocityAck", "I've read the transaction and monthly limits for my business", "check", { span: true, disabled: !limitsFrom(a).ready, hint: limitsFrom(a).ready ? "Your monthly limit is $" + fmtMoney(limitsFrom(a).monthly) + ", based on what you entered above. Ask us any time to raise it." : "Enter " + limitsFrom(a).missing.join(" and ") + " to see your limits. You can tick this once you have." })
        ], { pinId: "underwriting-plain" }),
        card("s3-sell", isNonprofit() ? "How you take payments" : "How you sell", "", [
          fld("channel", isNonprofit() ? "Primary payment channel" : "Primary sales channel", "select", { placeholder: "Choose a channel", options: ["In-person", "Online", "In-person and online", "Mobile", "Phone / mail order (MOTO)"] }),
          fld("goods", isNonprofit() ? "What people pay or give for" : "Type of goods or services", "select", { placeholder: "Choose a type", options: isNonprofit() ? ["Donations", "Tickets and events", "Memberships and subscriptions", "Services", "Physical goods", "Mixed"] : ["Services", "Services and subscriptions", "Physical goods", "Digital goods", "Mixed"] }),
          fld("recurring", isNonprofit() ? "Recurring donations or memberships?" : "Recurring billing or subscriptions?", "yn"),
          fld("trial", "Free trial or deferred billing?", "yn"),
          fld("marketplace", isNonprofit() ? "Do you take payments on behalf of other organizations?" : "Do you take payments on behalf of other businesses?", "yn", { span: true, hint: (isNonprofit() ? "Chapters, member groups or fundraisers collecting through you, say." : "Contractors or instructors invoicing through you, say.") + " Saying yes changes who's responsible, so we have to ask directly." }),
          fld("international", isNonprofit() ? "Do you take payments from outside " + (ca ? "Canada" : "the US") + "?" : "Do you sell outside " + (ca ? "Canada" : "the US") + "?", "yn"),
          a.international === "yes" ? fld("countries", isNonprofit() ? "Countries payments come from" : "Countries sold to", "text", { conditional: true, placeholder: "e.g. Canada, United Kingdom" }) : null,
          fld("refundPolicy", "Refund / return policy URL", "text", { span: true, optional: true, placeholder: isNonprofit() ? "yourorganization.org/refunds" : "yourbusiness.com/refunds", hint: "A clear policy helps with chargebacks. Leave it blank if you don't have one." })
        ]),
        ca
          ? card("s3-ach", "Bank transfer volumes", "Only if you'll also take direct debits.", [
              fld("achVolume", "Estimated monthly EFT volume", "currency", { optional: true, zero: true, placeholder: "10,000" })
            ], { collapsible: true })
          : card("s3-ach", "Bank transfer volumes", "Only if you'll also take ACH payments.", [
              fld("achVolume", "Estimated monthly ACH volume", "currency", { optional: true, zero: true, placeholder: "10,000" })
            ], { collapsible: true })
      ];
    }
    if (step === 4) {
      const bankFields = (p, main) => ca
        ? [
            fld(p + "bankName", "Bank name", "text", { placeholder: "e.g. RBC Royal Bank" }),
            fld(p + "accountHolder", "Account holder name", "text", { placeholder: "Exactly as it appears on the account", hint: main ? "This needs to match your legal " + (isNonprofit() ? "organization" : "business") + " name." : "" }),
            fld(p + "accountType", "Account type", "select", { placeholder: "Choose an account type", options: ["Business chequing", "Business savings"] }),
            fld(p + "institution", "Institution number", "mono", { placeholder: "3 digits" }),
            fld(p + "transit", "Transit number", "mono", { placeholder: "5 digits" }),
            fld(p + "accountNumber", "Account number", "masked", { sensitive: true, placeholder: "7 to 12 digits" })
          ]
        : [
            fld(p + "bankName", "Bank name", "text", { placeholder: "e.g. Umpqua Bank" }),
            fld(p + "accountHolder", "Account holder name", "text", { placeholder: "Exactly as it appears on the account", hint: main ? "This needs to match your legal " + (isNonprofit() ? "organization" : "business") + " name." : "" }),
            fld(p + "accountType", "Account type", "select", { placeholder: "Choose an account type", options: ["Business checking", "Business savings"] }),
            fld(p + "routing", "ABA routing number", "mono", { placeholder: "9 digits" }),
            fld(p + "accountNumber", "Account number (up to 17 digits)", "masked", { sensitive: true, placeholder: "Up to 17 digits" })
          ];
      return [
        card("s4-manual", "Settlement account", "", bankFields("", true), {
          pinId: "bank-no-debit",
          assurance: "We pay your sales into this account. We may also take fees, chargebacks and refunds from it, as the agreement at step 7 explains."
        })
      ];
    }
    if (step === 5) {
      return [
        card("s5-dec", "Declarations", "Saying yes to any of these won't stop your application — it just means someone reads it alongside the automated checks.", [
          fld("legalProceedings", "Are there any legal proceedings involving the business right now?", "yn", { span: true }),
          a.legalProceedings === "yes" ? fld("legalProceedingsWhy", "Tell us a bit about it", "long", { span: true, conditional: true, placeholder: "A sentence or two is fine." }) : null,
          fld("priorTermination", "Has a merchant account of yours been terminated?", "yn", { span: true }),
          a.priorTermination === "yes" ? fld("priorTerminationWhy", "Processor, date and reason", "long", { span: true, conditional: true, placeholder: "A sentence or two is fine." }) : null,
          fld("taxLiens", ca ? "Any outstanding tax debts owed to the CRA, or court judgments?" : "Any outstanding tax liens or judgments?", "yn", { span: true }),
          a.taxLiens === "yes" ? fld("taxLiensWhy", "Amount and current status", "long", { span: true, conditional: true, placeholder: "How much, and where it stands now." }) : null,
          ca ? null : fld("msb", "Are you a money service business?", "yn", { span: true, hint: "Check cashing, money transfer, currency exchange or crypto. Most businesses aren't." })
        ], { pinId: "yes-is-not-no" }),
        card("s5-consent", ca ? "A consent we have to collect" : "Two consents we have to collect", "", [
          fld("matchConsent", "I agree to a check of the card networks' list of closed merchant accounts", "check", { span: true, hint: "Also called a MATCH or TMF check. Mastercard requires it for every merchant account." }),
          ca ? null : fld("ofacAck", "I understand we'll check your name against the US government sanctions list", "check", { span: true, hint: "Known as OFAC screening. Every US merchant goes through it." })
        ], { assurance: ca ? "This is a consent, not a credit check. It doesn't touch your personal credit score." : "These are consents, not credit checks. Neither one touches your personal credit score." })
      ];
    }
    return [];
  }

  function whyFor(step, ca) {
    return {
      1: { t: "Why are we asking?", b: "We need to see that the " + orgWord() + " really exists and that its name, number and address all line up. Type these details as they appear on your registration, so they match the tax documents you add in step 6.", p: ["Checked against the tax documents you add in step 6", "Typing them as they appear on your registration avoids questions later"] },
      2: { t: "Why do you need owners?", b: isNonprofit() ? "Anti-money-laundering rules mean the people who run an organization, such as directors or trustees, have to be named and identified, along with whoever signs the agreement. We have to ask for this." : "Anti-money-laundering rules mean anyone controlling 25% or more of a business has to be named and identified, along with whoever signs the agreement. We have to ask for this.", p: [(isNonprofit() ? "" : (ca ? "SIN" : "SSN") + " and ") + "ID numbers go straight to Trullio, our verification partner", "Never stored on Xplor systems, never visible to Xplor staff", "Owners can fill in their own part by link, so you're never blocked"] },
      3: { t: "Why do you need numbers?", b: "This isn't a credit check. Your answers help us set sensible limits and see what a normal day looks like for you, so real sales don't get held up.", p: ["Best guesses are expected, and nothing here is a commitment", "Telling us the history now is faster than us finding it later", "None of it changes the rate you pay"] },
      4: { t: "Why do you need my account details?", b: "This is the account your sales are paid into. Trullio, our verification partner, checks it after you submit, so your payouts only ever go where they should.", p: ["We may take fees, chargebacks and refunds from it", "You can change this account later", "Extra accounts are optional and can be added after approval"] },
      5: { t: "Why ask all this?", b: "Card networks and regulators require these exact questions on every application. A yes isn't a refusal. It means a person reviews your file instead of it going straight through.", p: ["Consents shown here are not credit checks", "None of this affects your personal credit score", "You can explain anything in your own words"] },
      6: { t: "Why do you need files?", b: "Documents are how Trullio, our verification partner, confirms the details you've given are real. Add each file we ask for, and as many as you need.", p: ["Stored encrypted", "Shared only with your verification partner", "Swap out or delete any file before you submit"] },
      7: { t: "What gets sent", b: "One package: your " + orgWord() + " record, the identity and sanctions checks we've already run, " + (isNonprofit() ? "who runs the organization" : "ownership") + ", bank verification, your declarations and the signed agreement.", p: ["Anything missing comes back as one clear request", "A signed copy of the agreement is emailed to you"] }
    }[step];
  }

  function docListFor(owners, ca, idOnly) {
    const a = state.a;
    const idRows = owners.map((o) => ({
      key: "id_" + o.id, title: "Government photo ID for " + o.name, requirement: "Required",
      hint: (o.status === "invited" ? "They can add this, or you can. " : "") + "Passport or driver's " + licWord() + ". All four corners in shot and no glare.",
      why: "To confirm you are who you say you are. It goes only to Trullio, our verification partner.",
      file: "id-" + o.id + "-license.jpg",
    }));
    if (idOnly) return idRows;
    // An invited owner's ID row stays: they or the applicant can add it, and step 6 and 7 wait for it (decision invite-no-exemption).
    const list = idRows.slice();
    // Canada's counterpart to the US EIN letter (decision ca-bn-confirmation-document). Any one of the CRA documents will do.
    if (ca && !(isSole() && digitsOf(a.ein).length !== 9)) list.push({ key: "bn", title: "CRA business number confirmation", requirement: "Required", hint: "Any one of these: your CRA business registration confirmation, the CRA's RC145 confirmation letter, a Filing and Balance Confirmation letter from your CRA My Business Account, or articles of incorporation showing your business number.", file: "cra-bn-confirmation.pdf" });
    if (!ca) {
      if (!(isSole() && digitsOf(a.ein).length !== 9)) list.push({ key: "ein", title: "EIN confirmation letter (CP-575 or 147C)", requirement: "Required", hint: "The letter the IRS sent when your EIN was issued.", file: "irs-147c-riverside.pdf" });
      list.push({ key: "w9", title: "W-9 tax certification", requirement: "Required", hint: "Upload your signed Form W-9.", file: "w9-uploaded.pdf" });
    }
    if (a.prior === "yes") list.push({ key: "stmt", title: "Last 3 months of processing statements", requirement: "Required", hint: "Because you've processed cards before, we need your last 3 months of processing statements from " + (a.priorName || "your prior processor") + ". They help us judge risk.", file: "prior-processor-statement.pdf" });
    // Division rows (decisions clubready-lease-by-division, club-essentials-financial-history). Wording is a draft, not approved copy.
    if (ctx.division === DIV_CLUBREADY && !isNonprofit()) list.push({ key: "lease", division: DIV_CLUBREADY, title: "Signed lease, business " + licWord() + " or utility bill", requirement: "Required", hint: "Your club's signed lease. If you don't have one yet, a business " + licWord() + " or a utility bill in the " + orgWord() + " name works.", file: "club-lease.pdf" });
    if (ctx.division === DIV_CE) list.push({ key: "finhist", division: DIV_CE, title: "Two years of financial history", requirement: "Required", hint: "Financial history for your " + orgWord() + " covering the last two years.", file: "financial-history.pdf" });
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
    const labelOf = { signatoryName: "Signatory name", signatoryTitle: "Signatory title", sign: "Your signature", acceptAgreement: "Accept the merchant services agreement", acceptPrivacy: "Accept the privacy policy and terms of service" };
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
    const canNext = !isFlow ? stepComplete : (st.step === 7 ? stepComplete && gaps.length === 0 : true);
    // The signatory follows the step 2 answer unless edited on step 7.
    const selfOwner = owners.filter((o) => o.self)[0];
    const defaultSigner = a.sigSame === "no" ? (a.sigName || "") : (ownerVal(st.owners[0] || {}, "name") || "");
    const signatoryName = a.signatoryName !== undefined ? a.signatoryName : defaultSigner;
    const signatoryTitle = a.signatoryTitle !== undefined ? a.signatoryTitle : (a.sigSame === "no" ? (a.sigTitle || "") : (((selfOwner || st.owners[0]) || {}).role || ""));
    // "Signed by" is only true once a signature has been drawn or uploaded.
    const signedNow = !!signatoryName.trim() && st.sign !== "";

    return {
      ca, isWelcome, isBizType, isFlow, isStatus, cur, pct, owners, cards, docList,
      isInvitee: st.screen === "invitee",
      inviteDocs: docListFor(owners, ca, true).filter((d) => d.key === "id_" + st.inviteOwner),
      invitedOwners: invitedLeft,
      why: whyFor(st.step, ca),
      signatoryName, signatoryTitle,
      needRegistration: (ca ? "Your CRA business number, plus the legal name, registered address and registration date as they appear on your registration." : "Your EIN, plus the legal name, registered address and incorporation details as they appear on your registration.") + " You'll also choose your merchant category from a short list.",
      needIds: "Owners with 25% or more (or directors and trustees, for a non-profit)" + (invitesOn() ? " and whoever signs" : "") + ": their title, " + (ca ? "a driver's licence or passport and a SIN (a non-profit or government body doesn't need the SIN)." : "a driver's license or passport and an SSN (a non-profit or government body doesn't need the SSN).") + (invitesOn() ? " If it's easier, they can fill in their own bit." : " You fill this in for everyone, so have it all to hand."),
      needBank: ca ? "Your institution, transit and account numbers." : "Your routing and account numbers.",
      shellRailNote: isStatus ? "Submitted — with our verification partner" : "Step " + progStep + " of 7 · about " + Math.max(2, 17 - progStep * 2) + " min left",
      remainingLabel: "About " + Math.max(2, 17 - (progStep - 1) * 2) + " minutes left",
      stepCounter: "Step " + st.step + " of 7",
      stepTitle: {
        1: isNonprofit() ? "Tell us about your organization" : "Tell us about your business", 2: isSole() ? "Tell us about you" : isNonprofit() ? "Who runs the organization?" : "Who owns the business?",
        3: "How you'll take payments", 4: "Where should we send your money?",
        5: "A few questions we have to ask", 6: "A few documents to back it up",
        7: "One last look, then you're done"
      }[st.step],
      stepSubtitle: {
        1: "",
        2: isSole() ? "As a sole proprietor you're the only owner, so this is just you. We need these details to check who you are." : isNonprofit() ? "We need to know about the people who run the organization, such as directors or trustees, plus whoever's signing. Add their details here" + (invitesOn() ? ", or send them a link and let them do their own." : ".") : "We need to know about anyone who owns 25% or more, plus whoever's signing. Add their details here" + (invitesOn() ? ", or send them a link and let them do their own." : "."),
        3: "A few questions about your sales. Rough estimates are absolutely fine, and nothing here changes your rate.",
        4: "Add the account your payouts should go to. Once you're approved, you can add more accounts for your other merchants.",
        5: "Every application includes these. Saying yes to one is never an automatic no — it just means someone reads your file.",
        6: "Add each file we ask for. You can add as many as you need to each one.",
        7: "Check everything you've told us. When you sign, we send it all in one go."
      }[st.step],
      stepComplete: stepComplete,
      canNext: canNext,
      missing: missing,
      nextLabel: st.step === 7 ? "Submit for verification" : "Save and continue",
      submitNote: "Straight away. Trullio, our verification partner, gets one complete package.",
      saveProgressNote: isWelcome ? "You haven't started yet, so there's nothing to lose." : "Last saved on step " + st.step + ", a moment ago.",
      // The ownership card shows how many owners are listed, and All listed only once the shares pass 75% (decision ownership-no-question). Nothing asks whether anyone is missing.
      ownersOver100: ownedPct > 100,
      ownersAllListed: ownedPct > 75 && ownedPct <= 100 && owners.length > 0,
      ownershipNote: ownedPct > 100
        ? "The shares come to more than 100%. Have another look at each owner's percentage."
        : ownedPct > 75
          ? "Everyone who owns 25% or more is listed. Anyone else owns less than 25%, so we don't need them."
          : "Add everyone who owns 25% or more.",
      ownersIdLabel: solo ? (owners[0].self ? "Your own ID is the only one to check" : "The only ID is in and being checked") : settled === owners.length ? "Every ID is in and being checked" : settled + " of " + owners.length + " IDs in",
      // The status screens name the owners actually entered, never the sample people.
      payoutAccountLabel: a.bankName ? a.bankName + " •••• 4417" : "Not set",
      submittedWhen: st.submittedAt ? "at " + st.submittedAt : "just now",
      checkNote: "Checking " + [!isSole() && "your " + orgWord() + " details", "who you are", "your bank account", "sanctions lists"].filter(Boolean).join(", ").replace(/, ([^,]*)$/, " and $1"),
      receivedNote: st.submittedAt ? "Sent to our verification partner at " + st.submittedAt : "Sent to our verification partner",
      // Each row on the last step says only how many answers are in, "N of M done" (decision summary-counts-only).
      summary: [
        { label: isNonprofit() ? "Organization & address" : "Business & address", step: 1 },
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
  function maskValue(s) {
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
  const ENCRYPTED_NOTE = "We encrypt this number as it travels and while it's stored. Once you leave the field only the last four characters show, and you can choose to show or hide the rest. It goes to Trullio, our verification partner, to check who you are.";

  // The step 1 business lookup (decision business-lookup-typeahead). The typed text goes only to the fixed list above; nothing leaves the page.
  let findTimer = 0;
  function bizFindView() {
    const reset = () => setState({ findPicked: null, findManual: false, findQ: "", findResults: [], findOpen: false, findBusy: false });
    if (state.findPicked) {
      const x = state.findPicked;
      return html`<div class="callout callout--positive find-picked" data-key="find-picked">${icon("check", 16)}<span class="find-picked-text"><strong>${x.name}</strong><span>${x.address}</span><span>We filled in the name and address below. Check they match your registration.</span></span><button type="button" class="btn-link" data-click="${on(reset)}">Search again</button></div>`;
    }
    if (state.findManual) {
      return html`<p class="small-note find-manual-note" data-key="find-manual">You're entering your details yourself. <button type="button" class="btn-link" data-click="${on(reset)}">Search for my business instead</button></p>`;
    }
    const typed = state.findQ.trim().length >= 3;
    // Opening the box before typing lists a few businesses; from three characters the list is the search.
    const open = state.findOpen;
    const rows = !typed ? suggestBiz() : state.findBusy ? [] : state.findResults.slice(0, 5);
    const total = rows.length + 1; // the last row is always "Can't find it?"
    const idx = Math.min(state.findIdx, total - 1);
    const manual = () => setState({ findManual: true, findRevealed: true, findOpen: false });
    const pick = (x) => {
      // Fills the legal name and the registered address and opens the address boxes so the parts can be checked. Nothing else is filled in.
      setState((s) => ({
        findPicked: x, findRevealed: true, findOpen: false, findQ: "", findResults: [], findBusy: false,
        a: Object.assign({}, s.a, { legalName: x.name, regAddress: x.address }),
        addrParts: Object.assign({}, s.addrParts, { regAddress: addrParse(x.address) }),
        addrManual: Object.assign({}, s.addrManual, { regAddress: true }),
        addrQ: Object.assign({}, s.addrQ, { regAddress: "" })
      }));
    };
    const onType = (e) => {
      const q = e.target.value;
      const t = q.trim().length >= 3;
      setState({ findQ: q, findOpen: true, findIdx: 0, findBusy: t, findResults: t ? state.findResults : [] });
      clearTimeout(findTimer);
      // A short wait stands in for the real search request.
      if (t) findTimer = setTimeout(() => setState({ findBusy: false, findResults: searchBiz(state.findQ) }), 350);
    };
    const keys = (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); setState({ findOpen: true, findIdx: (idx + (e.key === "ArrowDown" ? 1 : total - 1)) % total }); }
      else if (e.key === "Enter") { if (open) { e.preventDefault(); if (idx < rows.length) pick(rows[idx]); else manual(); } }
      else if (e.key === "Escape") { if (open) { e.stopPropagation(); setState({ findOpen: false }); } }
    };
    const onCountry = (e) => { setCtx({ region: e.target.value === "Canada" ? "Canada" : "United States" }); setState({ findQ: "", findResults: [], findBusy: false, findOpen: false }); };
    const dupText = (n) => n + " other " + (n === 1 ? "business has" : "businesses have") + " this name. Check the address is yours.";
    return html`<div class="find-row" data-key="find-search">
  <div class="find-country"><label class="field-label" for="f-findCountry">Country</label><select class="input" id="f-findCountry" data-input="${on(onCountry)}">${["United States", "Canada"].map((c) => html`<option${attr("selected", (isCa() ? "Canada" : "United States") === c)}>${c}</option>`)}</select></div>
  <div class="find-name"><label class="field-label" for="f-bizFind">Business name</label>
    <div class="combo combo--lead">
      <input class="input" id="f-bizFind" role="combobox" aria-expanded="${String(open)}" aria-controls="lb-bizFind" aria-autocomplete="list" aria-busy="${String(state.findBusy)}" value="${state.findQ}" placeholder="Start typing your business name" autocomplete="off" spellcheck="false" data-click="${on(() => setState({ findOpen: true }))}" data-focus="${on(() => { if (!state.findOpen) setState({ findOpen: true, findIdx: 0 }); })}" data-input="${on(onType)}" data-keydown="${on(keys)}" data-blur="${on(() => setTimeout(() => { if (state.findOpen) setState({ findOpen: false }); }, 160))}">
      <span class="combo-chev combo-chev--lead" aria-hidden="true">${icon("search", 16)}</span>
      ${open && html`<ul class="combo-list find-list" id="lb-bizFind" role="listbox" data-key="lb-find">
        ${typed && state.findBusy ? html`<li class="combo-empty" role="status">Searching…</li>` : rows.length ? rows.map((x, i) => html`<li class="combo-opt find-opt${i === idx ? " is-active" : ""}" role="option" aria-selected="${String(i === idx)}" data-click="${on(() => pick(x))}"><span class="find-opt-name">${x.name}</span><span class="find-opt-addr">${x.address}</span>${x.dups > 0 && html`<span class="find-opt-dup">${dupText(x.dups)}</span>`}</li>`) : html`<li class="combo-empty" role="status">No business found for “${state.findQ.trim()}”. Check the spelling, or enter your details yourself.</li>`}
        ${typed && !state.findBusy && state.findResults.length > rows.length && html`<li class="combo-empty">${state.findResults.length - rows.length} more. Keep typing to narrow the list.</li>`}
        <li class="combo-opt find-manual-opt${idx === rows.length ? " is-active" : ""}" role="option" aria-selected="${String(idx === rows.length)}" data-click="${on(manual)}">Can't find it? Enter details manually</li>
      </ul>`}
    </div>
  </div>
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
  <div class="field-head"><span class="field-label" id="l-${f.id}-yearly">Yearly card volume</span></div>
  <div class="affix affix--money affix--static" role="group" aria-labelledby="l-${f.id}-yearly"><span class="affix-prefix" aria-hidden="true">$</span><span class="affix-value">${yearly}</span><span class="affix-code">${isCa() ? "CAD" : "USD"}</span></div>
</div></div>`;
    }
    const wrap = (f.span ? "span-2" : "") + (f.tall ? " field--tall" : "");
    // Every control writes straight into state; values are escaped on the way
    // back out by html``, so typed markup is shown as text and never run.
    const onInput = on((e) => set(f.id, isDateKey(f.id) ? formatDateInput(e.target.value) : e.target.value));

    if (f.kind === "check") {
      // Read-before-accept: the View button lives inside the grey container.
      // It is interactive content, so clicking it never toggles the checkbox.
      const view = f.viewKey && html`<button type="button" class="btn btn-outline btn-xs check-view" aria-label="View ${f.label.replace(/^I accept the /, "")}" data-click="${on(() => openDoc(f.viewKey))}">${icon("eye", 14)}View</button>`;
      return html`<div class="${wrap}" data-key="${f.id}"${ERR[f.id] ? html` data-error="1"` : ""}><label class="check${f.disabled ? " is-disabled" : ""}"><input type="checkbox" id="${id}"${attr("checked", f.value === true)}${attr("disabled", f.disabled)}${f.disabled && f.hint ? html` aria-describedby="h-${f.id}"` : ""} data-change="${on((e) => set(f.id, e.target.checked))}"><span><span class="check-label">${f.label}${f.required && REQ}</span>${f.hint && html`<span class="check-hint" id="h-${f.id}">${f.hint}</span>`}</span>${view}</label>${errView(f.id)}</div>`;
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
        control = html`<select class="input${f.value === "" ? " is-unset" : ""}" id="${id}"${described} data-input="${onInput}">${f.value === "" && html`<option value="" selected>${f.placeholder || "Choose one"}</option>`}${f.options.map((op) => html`<option${attr("selected", op === f.value)}>${op}</option>`)}</select>`;
        break;
      case "combo": {
        // A searchable list (ARIA combobox). Picking writes the "code · title" label into the answer.
        const open = state.comboOpen === f.id;
        const matches = open ? searchMcc(state.comboQuery) : [];
        const shown = matches.slice(0, 60);
        const idx = Math.min(state.comboIdx, Math.max(shown.length - 1, 0));
        const pickIt = (label) => { set(f.id, label); setState({ comboOpen: "", comboQuery: "" }); };
        const keys = (e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); const n = shown.length || 1; setState({ comboOpen: f.id, comboIdx: (idx + (e.key === "ArrowDown" ? 1 : n - 1)) % n }); }
          else if (e.key === "Enter") { e.preventDefault(); if (open && shown[idx]) pickIt(shown[idx].label); }
          else if (e.key === "Escape") { e.stopPropagation(); setState({ comboOpen: "", comboQuery: "" }); }
        };
        control = html`<div class="combo">
  <input class="input" id="${id}" role="combobox" aria-expanded="${String(open)}" aria-controls="lb-${f.id}" aria-autocomplete="list" value="${open ? state.comboQuery : f.value}" placeholder="${f.value && open ? f.value : f.placeholder}" autocomplete="off" spellcheck="false"${described} data-click="${on(() => setState({ comboOpen: f.id, comboQuery: "", comboIdx: 0 }))}" data-input="${on((e) => setState({ comboOpen: f.id, comboQuery: e.target.value, comboIdx: 0 }))}" data-keydown="${on(keys)}" data-blur="${on(() => setTimeout(() => { if (state.comboOpen === f.id) setState({ comboOpen: "", comboQuery: "" }); }, 160))}">
  <span class="combo-chev" aria-hidden="true">${icon("chev-d", 16)}</span>
  ${open && html`<ul class="combo-list" id="lb-${f.id}" role="listbox" data-key="lb">
    ${shown.length ? shown.map((x, i) => html`<li class="combo-opt${i === idx ? " is-active" : ""}${x.label === f.value ? " is-chosen" : ""}" role="option" aria-selected="${String(x.label === f.value)}" data-click="${on(() => pickIt(x.label))}"><span class="combo-code">${x.code}</span>${x.name}</li>`) : html`<li class="combo-empty">No match. Try a different word, or the four-digit code.</li>`}
    ${matches.length > shown.length && html`<li class="combo-empty">${matches.length - shown.length} more. Keep typing to narrow the list.</li>`}
  </ul>`}
</div>`;
        break;
      }
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
        control = html`<div class="affix affix--secure${f.locked ? " is-locked" : ""}">${lock}<input id="${id}"${attr("class=\"masked-edit\"", dots)} value="${editing ? f.value : maskValue(f.value)}" placeholder="${f.placeholder}" autocomplete="off" spellcheck="false"${attr("readonly", !editing)}${attr("disabled", f.locked)}${described} data-input="${onInput}" data-focus="${on(() => { if (f.value !== "" && !state.revealed[f.id]) setState({ editMasked: f.id }); })}" data-blur="${on(() => { if (state.editMasked === f.id) setState({ editMasked: "" }); schedule(); })}">${f.value !== "" && !f.locked && html`<button type="button" class="btn-link" aria-controls="${id}" aria-label="${(f.revealed ? "Hide " : "Show ") + f.label}" data-click="${on(() => toggleReveal(f.id))}">${f.revealed ? "Hide" : "Show"}</button>`}</div>`;
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
    ${cell("l2", "Street address 2 (optional)", " addr-cell--wide")}
    ${cell("city", "City", " addr-cell--city")}
    <div class="addr-cell addr-cell--sm"><label class="field-label" for="${id}-region">${ca ? "Province" : "State"}</label><select class="input${parts.region === "" ? " is-unset" : ""}" id="${id}-region" data-input="${on((e) => setPart("region", e.target.value))}">${parts.region === "" && html`<option value="" selected>Choose one</option>`}${regions.map((r) => html`<option value="${r[0]}"${attr("selected", r[0] === parts.region)}>${r[1]}</option>`)}</select></div>
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
  <input class="input" id="${id}" role="combobox" aria-expanded="${String(open && typed)}" aria-controls="lb-${f.id}" aria-autocomplete="list" value="${q}" placeholder="Start typing to search for the address" autocomplete="off" spellcheck="false"${described} data-click="${on(() => setState({ addrOpen: f.id, addrIdx: -1 }))}" data-input="${on((e) => setState((s) => ({ addrQ: Object.assign({}, s.addrQ, { [f.id]: e.target.value }), addrOpen: f.id, addrIdx: -1 })))}" data-keydown="${on(keys)}" data-blur="${on(() => setTimeout(() => { if (state.addrOpen === f.id) setState({ addrOpen: "", addrIdx: -1 }); }, 160))}">
  <span class="combo-chev combo-chev--lead" aria-hidden="true">${icon("search", 16)}</span>
  ${open && typed && html`<ul class="combo-list" id="lb-${f.id}" role="listbox" data-key="lb-addr">
    ${matches.length ? matches.map((x, i) => html`<li class="combo-opt${i === idx ? " is-active" : ""}" role="option" aria-selected="${String(i === idx)}" data-click="${on(() => pickIt(x))}">${x}</li>`) : html`<li class="combo-empty">No address found. Keep typing, or enter it manually below.</li>`}
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
  ${f.hint && html`<p class="field-hint" id="${hintId}">${f.hint}</p>`}
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

  function callout(text, cls) {
    return html`<div class="callout${cls ? " " + cls : ""}">${icon("lock", 15)}<span>${text}</span></div>`;
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
    const infoNote = html`<span class="why-wrap" data-mouseenter="${on(openInfo)}" data-mouseleave="${on(() => setState({ infoOpen: false }))}"><button type="button" class="why-trigger" aria-expanded="${String(state.infoOpen)}" data-click="${on(openInfo)}" data-blur="${on(() => setState({ infoOpen: false }))}">What we do with your information${icon("help", 15, "i-accent")}</button>${state.infoOpen && html`<span class="why-pop" data-key="info-pop" role="note"><span class="why-pop-body"><span class="why-points">${["We encrypt your information as it travels and while it's stored.", "We protect tax and national ID numbers, so Xplor staff can't read them.", "Trullio, our verification partner, runs the identity checks.", "We only use it to verify you, never for marketing.", "We save your progress after every field."].map((t) => html`<span class="why-point">${icon("check", 14, "i-b i-ok")}<span>${t}</span></span>`)}</span></span></span>`}</span>`;
    return html`<div class="welcome" data-key="welcome">
  <div class="welcome-inner">
    <div class="welcome-title-row"><h1 class="welcome-title">Let's get you set up to take payments${pin("step-count-7")}</h1><span class="tag tag--green">${icon("bolt", 13)}Faster approval</span></div>
    <p class="welcome-lede">We'll walk you through seven short steps. It takes about 15 minutes, and you can stop and pick up right where you left off.${pin("welcome-length")} ${infoNote}</p>
    <div class="need-bar">
      <h2 class="need-head">What you'll need</h2>
    </div>
    <div class="need-list">
      ${need("building", "Your registration and tax numbers", v.needRegistration)}
      ${need("users", "Details of the people who own your organization", v.needIds)}
      ${need("card", "Your bank account and a few documents", v.needBank)}
      ${need("chart", "A rough idea of your card sales", "Your monthly total, your average sale, and whether you sell in person, online or both. A rough guess is fine.")}
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
        <p>${existing ? "You already have an account, so there's nothing new to set up. Sign in with the same details you always use." : "Use these to sign in for the first time. Your temporary password works for 7 days, so sign in before then."}</p>
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
      else if (state.pickedBiz === "existing") showToast("Prototype only: Harbor Yoga Studio's dashboard isn't part of this prototype.");
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
        ${state.changeErr && html`<p class="field-error" role="alert">${state.changeErr}</p>`}
        <div class="entry-actions">
          <div class="footer-end"><button type="submit" class="btn btn-primary btn-lg">Sign in${icon("arrow-r", 19)}</button></div>
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
      <form class="card entry-card" data-submit="${on(submitLogin)}"${state.loginErr ? html` data-error="1"` : ""}>
        <div class="stack">
          <div><label class="field-label field-label--block" for="login-email">Email</label>
          <input class="input" id="login-email" type="email" autocomplete="username" placeholder="name@host.com" value="${state.loginEmail}" data-input="${on((e) => setState({ loginEmail: e.target.value, loginErr: "" }))}"></div>
          <div><label class="field-label field-label--block" for="login-password">Password</label>
          <input class="input" id="login-password" type="password" autocomplete="current-password" placeholder="Password" value="${state.loginPassword}" data-input="${on((e) => setState({ loginPassword: e.target.value, loginErr: "" }))}"></div>
        </div>
        ${state.loginErr && html`<p class="field-error" role="alert">${state.loginErr}</p>`}
        <div class="entry-actions">
          <div class="footer-end">
            <button type="button" class="btn btn-ghost btn-md" data-click="${on(() => showToast("Prototype: password reset isn't simulated."))}">Send me another password</button>
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
        <select class="input${state.a.structure === "" ? " is-unset" : ""}" id="f-structure-up" data-input="${on((e) => set("structure", e.target.value))}">${state.a.structure === "" && html`<option value="" selected>Choose a type</option>`}${companyStructures().map((op) => html`<option${attr("selected", op === state.a.structure)}>${op}</option>`)}</select>
      </div></div>`;
        if (state.bizType === t.id && t.id === "non-profit") return html`<div class="biz-open" data-key="biz-open-nonprofit">${head(" biz-head")}<div class="biz-sub" data-key="biz-sub-nonprofit">
        <span class="field-label field-label--block" id="l-structure-up">What type of organization is it?${REQ}</span>
        <div class="yn yn--pills" role="group" aria-labelledby="l-structure-up">${NONPROFIT_TYPES.map((opt) => html`<button type="button" class="yn-btn" aria-pressed="${String(state.a.structure === opt)}" data-click="${on(() => set("structure", opt))}">${opt}</button>`)}</div>
      </div></div>`;
        return head("");
      })}
    </div>
    <p class="small-note biz-warn" data-key="biz-warn">Choose carefully. If you carry on and later come back here to change your business type, anything you've entered will be lost.</p>
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
    const currentMeta = (s) => s.n < state.maxStep ? (stepPct(s.n) >= 100 ? doneMeta : html`<span class="step-meta step-meta--pct">${ringView(stepPct(s.n))}<span class="step-pct">${stepPct(s.n)}%</span></span>`) : html`<span class="step-meta">${s.time}</span>`;
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
      return html`<li><div class="step"><span class="step-dot">${s.n}</span><span class="step-label">${stepName(s)}</span><span class="step-meta">${s.time}</span></div></li>`;
    });
    return html`<nav class="rail" data-key="rail" aria-label="Verification steps">
  <div class="progress-head"><span class="progress-title" id="progress-label">Your progress</span><span class="progress-pct">${v.pct}%</span></div>
  <div class="meter" role="progressbar" aria-labelledby="progress-label" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${v.pct}"><span class="meter-fill" data-width="${v.pct}"></span></div>
  <p class="progress-note">${v.remainingLabel} · <span class="save-tell${state.saving ? " is-saving" : ""}" data-key="save-tell" role="status">${state.saving ? html`<span class="save-spinner" aria-hidden="true"></span>` : icon("check", 12)}${state.saving ? "Saving…" : "Saved"}</span></p>
  <ol class="steps">${items}</ol>
  <button type="button" class="btn btn-neutral btn-sm rail-help" data-click="${on(openHelp)}">${icon("help", 15)}Get help</button>
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
    const gridView = (fields) => fields.map((f) => {
      const k = keyOf(f);
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
      const status = !need.length ? "" : have === need.length ? html`<span class="tick sec-tick">${icon("check", 13, "i-b")}<span class="sr-only">Complete</span></span>` : have === 0 ? html`<span class="pill pill--warning sec-status">Not started</span>` : html`<span class="pill pill--brand sec-status">${have} of ${need.length} done</span>`;
      // Done at the foot of each section (decision section-done-buttons): on every section but the last it closes this one and opens the next; on the last it closes the whole owner card. Nothing is saved or checked, since each field is kept as it is filled in. The invited owner's own page has no card to close, so its last section has no button.
      const last = idx === secs.length - 1;
      const doneClick = () => {
        if (last) { closeOwner(); return; }
        const nextId = secs[idx + 1].h.id;
        setState((st) => ({ secOpen: Object.assign({}, st.secOpen, { [sec.h.id]: false, [nextId]: true }) }));
      };
      return html`<section class="owner-sec${closed ? "" : " is-open"}" data-key="${sec.h.id}">
  <h3 class="sec-head"><button type="button" class="sec-toggle" aria-expanded="${String(!closed)}" data-click="${on(toggle)}"><span class="sec-label">${icon(/hdg_id$/.test(sec.h.id) ? "shield" : "user", 18, "sec-icon")}${sec.h.label}${status}</span>${icon("chev-d", 16, "sec-chev")}</button></h3>
  ${!closed && html`<div class="fields">${gridView(sec.fields)}</div>`}
  ${!closed && !(recipient && last) && html`<div class="sec-actions" data-key="done-${sec.h.id}"><button type="button" class="btn btn-neutral btn-sm" data-click="${on(doneClick)}">Done</button></div>`}
</section>`;
    }) }</div>`;
  }

  function ownerView(o, recipient) {
    const isOpen = state.openOwner === o.id;
    const toggle = () => setState({ openOwner: state.openOwner === o.id ? 0 : o.id });
    // Done (decisions owner-done-button, section-done-buttons): the owner is already kept as each field is committed, so this only closes the card.
    const closeOwner = () => setState({ openOwner: 0 });
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
  <div class="person-head" data-click="${on(toggle)}">
    <span class="avatar" aria-hidden="true">${o.initials === "—" || o.initials === "?" ? icon("user", 16) : o.initials}</span>
    <div class="grow">
      <h3 class="person-name">${o.name}</h3>
      <div class="person-meta">${invited && !String(ownerVal(o, "name")).trim() ? "Waiting for their details" : (o.self ? "You · " : "") + (isSole() ? "Sole owner" : isNonprofit() ? o.role : [o.pct > 0 ? fmtPct(o.pct) + "%" : "", o.role].filter(Boolean).join(" · "))}</div>
    </div>
    ${!recipient && Object.keys(ERR).some((k) => k.indexOf("o" + o.id + "_") === 0) && html`<span class="pill pill--danger">${icon("alert", 13)}Needs a look</span>`}
    ${!recipient && invited && !o.signedIn && html`<span class="pill pill--warning">${icon("clock", 13)}Invited · ${o.inviteEmail || "filling in their own details"}</span>`}
    ${!recipient && invited && o.signedIn && !o.received && html`<span class="pill pill--neutral">${icon("user", 13)}Signed in · ${o.inviteEmail || "invited"}</span>`}
    ${!recipient && invited && o.received && html`<span class="pill pill--positive">${icon("check", 13, "i-b")}Details received${o.receivedAt ? " · " + o.receivedAt : ""}</span>`}
    ${!recipient && o.status === "pending" && o.revoked && html`<span class="pill pill--neutral">Access removed</span>`}
    ${!recipient && invitesOn() && o.status === "pending" && !isSole() && !o.self && html`<button type="button" class="btn btn-outline btn-xs" data-click="${on(() => openDelegate(o.id))}">${icon("mail", 14)}${o.revoked ? "Send a new invite" : "Send invite"}</button>`}
    ${!recipient && !isSole() && !invitesOn() && html`<button type="button" class="btn btn-xs btn-tertiary-negative btn-icon-only" aria-label="Remove ${known ? nm : "this owner"}" data-click="${on(() => removeOwnerClick(o.id))}">${icon("trash", 14)}</button>`}
    ${!recipient && !isSole() && invitesOn() && html`<span class="kebab-wrap" data-key="menu-${o.id}"><button type="button" class="btn btn-xs person-toggle kebab" aria-label="More actions for ${known ? nm : "this owner"}" aria-haspopup="menu" aria-expanded="${String(menuOpen)}" data-click="${on(() => setState({ menuOwner: menuOpen ? 0 : o.id }))}">${icon("more", 16)}</button>${menuOpen && html`<ul class="action-menu" role="menu" data-key="menu-list">${items.map((it) => it.sep ? html`<li class="action-sep" role="separator"></li>` : html`<li role="none"><button type="button" role="menuitem" class="action-opt${it.danger ? " action-opt--danger" : ""}" data-click="${on(it.go)}">${icon(it.ic, 16)}${it.label}</button></li>`)}</ul>`}</span>`}
    <button type="button" class="icon-btn person-chev-btn" aria-expanded="${String(isOpen)}" aria-label="${isOpen ? "Collapse" : "Open"} ${known ? nm : "this owner"}" data-click="${on(toggle)}">${icon("chev-d", 20, "person-chev")}</button>
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
      owners: state.owners.concat([{ id: id, name: "New owner", initials: "—", pct: isNonprofit() ? 10 : shareLeft(), role: isNonprofit() ? "Director" : "Owner / CEO", status: "pending", self: true, added: true, me: true }]),
      openOwner: id
    }); };
    const addLabel = isNonprofit() ? (v.owners.length ? "Add another director or trustee" : "Add a director or trustee") : (v.owners.length ? "Add another owner or director" : "Add an owner or director");
    return html`${isCompany() && v.ownersOver100 && html`<div data-key="s2-total"${ERR.ownership ? html` data-error="1"` : ""}>${errView("ownership")}</div>`}
<div class="stack" data-key="s2-owners">
  ${v.owners.map((o) => ownerView(o))}
  ${!isSole() && !v.owners.some((o) => o.self) && html`<button type="button" class="add-row" data-key="add-self" data-click="${on(addSelf)}">${icon("user", 16)}${isNonprofit() ? "Add myself as a director or trustee" : "Add myself as an owner"}</button>`}
  ${!isSole() && html`<button type="button" class="add-row" data-key="add-owner" data-click="${on(addOwner)}">${icon("plus", 16)}${addLabel}</button>`}${isSole() ? "" : pin("owner-self-serve")}
</div>`;
  }

  // A file that did not upload: the error callout takes the place of the file tile, with no buttons of its own (decision upload-failure-callout). The applicant uses Add file on the row to try again.
  function failedFileView(d, f) {
    return html`<div class="callout callout--error doc-fail" role="alert" data-key="file-${f.name}">${icon("alert", 16)}<span class="doc-fail-text"><strong>${f.name}</strong> didn't upload. Check the file and try again.</span></div>`;
  }

  function docView(d) {
    const s = d.skip ? "skipped" : doc(d.key).state;
    const cur = doc(d.key);
    const cls = s === "done" ? " is-done" : s === "skipped" ? " is-skipped" : s === "idle" || s === "failed" ? "" : " is-busy";
    // The drop zone stays under the text of every card, so any number of files can be added (decision document-drop-zone).
    // Clicking it adds the canned file. Dropping real files adds one tile for each, using only the file's name: nothing is read or sent.
    const drop = (e) => {
      const names = Array.from((e.dataTransfer && e.dataTransfer.files) || []).map((f) => String(f.name).slice(0, 120));
      (names.length ? names : [d.file]).forEach((n) => upload(d.key, n));
    };
    const action = s === "skipped" ? html`<span class="state-pill state-pill--muted">Not needed</span>` : "";
    const zone = s === "skipped" ? "" : html`<button type="button" class="dropzone" aria-label="Add a file for ${d.title}" data-click="${on(() => upload(d.key, d.file))}" data-drop="${on(drop)}"><span class="dz-icon" aria-hidden="true">${icon("upload", 18)}</span><span class="dz-text">Drag a file here or <span class="dz-link">browse</span></span></button>`;
    return html`<article class="card card--p20 doc${cls}${d.division ? " is-division" : ""}" data-key="doc-${d.key}"${ERR["doc_" + d.key] ? html` data-error="1"` : ""}>
  <div class="doc-row">
    <span class="icon-tile icon-tile--neutral">${icon("file", 17)}</span>
    <div class="grow">
      <div class="doc-titlebar"><h3 class="doc-title">${d.title}</h3>${s === "done" ? "" : html`<span class="req${d.requirement === "Required" ? " req--required" : ""}">${d.requirement}</span>`}${d.division && html`<span class="division-tag">${d.division} only</span>`}</div>
      <p class="body-sm">${d.hint}</p>
      ${d.why && fieldWhyView({ id: "doc_" + d.key, why: d.why })}
      ${errView("doc_" + d.key)}
    </div>
    ${action}
  </div>
  ${zone}
  ${cur.files.length > 0 && html`<div class="doc-files" data-key="files-${d.key}">${cur.files.map((f) => f.failed ? failedFileView(d, f) : html`<div class="doc-file" data-key="file-${f.name}"><span class="doc-file-name" title="${f.name}">${f.name}</span>${f.busy ? html`<span class="state-pill state-pill--busy" role="status"><span class="spinner" aria-hidden="true"></span>Uploading</span>` : html`<button type="button" class="btn-link" aria-label="Remove ${f.name}" data-click="${on(() => setDocFiles(d.key, (fs) => fs.filter((x) => x.name !== f.name)))}">Remove</button>`}</div>`)}</div>`}
</article>`;
  }

  function step6View(v) {
    return html`<div class="doc-grid" data-key="s6-docs">${v.docList.filter((d) => !d.skip).map((d) => docView(d))}</div>
<div class="callout callout--lg" data-key="s6-assure">${icon("lock", 16)}<span>Add as many files as you like to each item. Files are stored encrypted and shared only with Trullio, our verification partner.${pin("read-on-upload")}</span></div>`;
  }

  // ---------------------------------------------------------------------------
  // Documents to read before signing (step 7)
  // ---------------------------------------------------------------------------

  // Sample text for the prototype; the real documents come from legal.
  const AGREEMENTS = {
    agreement: {
      title: "Merchant services agreement", meta: "PDF · 12 pages · version 4.2",
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
        ]]
      ]
    },
    privacy: {
      title: "Privacy policy and terms of service", meta: "PDF · 6 pages · version 3.1",
      sections: [
        ["What we collect", "The business, ownership and identity details you give us in this application, and the documents you upload."],
        ["How it is used", "To verify your business, meet card network and anti-money-laundering requirements, and run your account."],
        ["Who sees it", "Trullio, our verification partner, and the card networks, where the rules require it. Files are stored encrypted."]
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

  // The last part of step 7 (decisions sign-back-on-step-7, terms-as-signing-checkboxes, signature-draw-or-upload). The two documents are read through links in their checkboxes; the signature is drawn in the box or uploaded as an image.
  function signView(v) {
    const link = (key, text) => html`<button type="button" class="btn-link check-link" data-click="${on(() => openDoc(key))}">${text}</button>`;
    // A tick box whose text holds a link. A button inside a label is interactive content, so pressing the link opens the document and does not toggle the box.
    const tick = (id, lead, key, text) => html`<div${ERR[id] ? html` data-error="1"` : ""} data-key="${id}"><label class="check"><input type="checkbox" id="f-${id}"${attr("checked", state.a[id] === true)} data-change="${on((e) => set(id, e.target.checked))}"><span><span class="check-label">${lead}${link(key, text)}${REQ}</span></span></label>${errView(id)}</div>`;
    return html`<section class="card" data-key="s7-sign">
  <h2 class="card-title sign-title">Sign it off${pin("sign-last")}</h2>
  <div class="fields fields--sign">
    <div${ERR.signatoryName ? html` data-error="1"` : ""}><label class="field-label field-label--block" for="f-signatoryName">Authorized signatory name${REQ}</label><input class="input" id="f-signatoryName" value="${v.signatoryName}" placeholder="As printed on your ID" data-input="${on((e) => set("signatoryName", e.target.value))}">${errView("signatoryName")}</div>
    <div${ERR.signatoryTitle ? html` data-error="1"` : ""}><label class="field-label field-label--block" for="f-signatoryTitle">Title${REQ}</label><input class="input" id="f-signatoryTitle" value="${v.signatoryTitle}" placeholder="e.g. Owner / CEO" data-input="${on((e) => set("signatoryTitle", e.target.value))}">${errView("signatoryTitle")}</div>
  </div>
  <h3 class="fields-sub sign-sub">What you're agreeing to${pin("read-before-accept")}</h3>
  <div class="sign-checks">
    ${tick("acceptAgreement", "I accept the ", "agreement", "Xplor Pay merchant services agreement")}
    ${tick("acceptPrivacy", "I accept the ", "privacy", "privacy policy and terms of service")}
  </div>
  <div class="sig"${ERR.sign ? html` data-error="1"` : ""} data-key="sig">
    <span class="field-label field-label--block" id="sig-label">Your signature${REQ}</span>
    <div class="sig-pad-wrap">
      <canvas id="sig-pad" class="sig-pad" width="1200" height="300" role="img" aria-labelledby="sig-label" aria-describedby="sig-help"></canvas>
      ${state.sign === "" && html`<span class="sig-ph" aria-hidden="true">Sign here</span>`}
    </div>
    <p class="sig-help small-note" id="sig-help">Draw your signature in the box with a mouse, finger or stylus.${state.sign === "image" && state.signImgName ? " Using the image " + state.signImgName + "." : ""}</p>
    <div class="sig-actions">
      <button type="button" class="btn btn-outline btn-sm" data-click="${on(() => { const i = document.getElementById("sig-file"); if (i) i.click(); })}">${icon("upload", 15)}Upload image of signature</button>
      <input type="file" id="sig-file" class="sr-only" accept="image/png,image/jpeg" tabindex="-1" aria-label="Upload image of signature">
      ${state.sign !== "" && html`<button type="button" class="btn-link" data-click="${on(clearSignature)}">Clear</button>`}
    </div>
    ${state.signErr && html`<p class="field-error" role="alert">${state.signErr}</p>`}
    ${errView("sign")}
  </div>
</section>`;
  }

  // ---- The signature box ----
  // An uploaded image is decoded in the browser and drawn onto the same canvas; it never leaves the page.
  let sigBitmap = null;
  const SIG_MAX_BYTES = 2 * 1024 * 1024;
  function clearSignature() {
    sigBitmap = null;
    setState({ sign: "", signStrokes: [], signImgName: "", signErr: "" });
  }
  function paintSignature(c) {
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
    if (state.sign === "image" && sigBitmap) {
      // Fit the whole image inside the box, centred, without stretching it.
      const k = Math.min(c.width / sigBitmap.width, c.height / sigBitmap.height);
      const w = sigBitmap.width * k, h = sigBitmap.height * k;
      ctx.drawImage(sigBitmap, (c.width - w) / 2, (c.height - h) / 2, w, h);
      return;
    }
    state.signStrokes.forEach((st) => drawStroke(c, st));
  }
  function drawStroke(c, pts) {
    const ctx = c.getContext("2d");
    ctx.strokeStyle = getComputedStyle(c).color;
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (pts.length === 1) { ctx.beginPath(); ctx.arc(pts[0][0] * c.width, pts[0][1] * c.height, 2, 0, Math.PI * 2); ctx.fill(); return; }
    ctx.beginPath();
    pts.forEach((p, i) => { if (i) ctx.lineTo(p[0] * c.width, p[1] * c.height); else ctx.moveTo(p[0] * c.width, p[1] * c.height); });
    ctx.stroke();
  }
  // Called after every render. The canvas keeps its size attributes, so the morph keeps the element; its listeners are attached once per element.
  function initSignature() {
    const c = document.getElementById("sig-pad");
    if (!c) return;
    paintSignature(c);
    if (!c._sigInit) {
      c._sigInit = true;
      let cur = null;
      const at = (e) => { const r = c.getBoundingClientRect(); return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))]; };
      c.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        c.setPointerCapture(e.pointerId);
        // Drawing over an uploaded image replaces it.
        if (state.sign === "image") { sigBitmap = null; state.sign = ""; state.signStrokes = []; paintSignature(c); }
        cur = [at(e)];
        drawStroke(c, cur);
      });
      c.addEventListener("pointermove", (e) => {
        if (!cur) return;
        cur.push(at(e));
        drawStroke(c, cur.slice(-2));
      });
      const end = () => {
        if (!cur) return;
        const done = cur; cur = null;
        setState((st) => ({ sign: "drawn", signStrokes: st.signStrokes.concat([done]), signImgName: "", signErr: "" }));
      };
      c.addEventListener("pointerup", end);
      c.addEventListener("pointercancel", end);
    }
    const fi = document.getElementById("sig-file");
    if (fi && !fi._sigInit) {
      fi._sigInit = true;
      fi.addEventListener("change", async () => {
        const file = fi.files && fi.files[0];
        fi.value = "";
        if (!file) return;
        // Input handling: only a PNG or JPG under 2 MB is accepted, by the type the browser reports. The file is decoded locally and never sent anywhere.
        if (!/^image\/(png|jpeg)$/.test(file.type)) { setState({ signErr: "Choose a PNG or JPG image." }); return; }
        if (file.size > SIG_MAX_BYTES) { setState({ signErr: "Choose an image smaller than 2 MB." }); return; }
        try {
          sigBitmap = await createImageBitmap(file);
          setState({ sign: "image", signStrokes: [], signImgName: file.name, signErr: "" });
        } catch (err) {
          setState({ signErr: "We couldn't read that image. Try another one." });
        }
      });
    }
  }

  // What happens after Submit, on the last step.

  function nextView(v) {
    return html`<section class="next-panel${state.nextOpen ? " is-open" : ""}" data-key="s7-next" aria-labelledby="next-h">
  <h2 class="next-head" id="next-h"><button type="button" class="next-toggle" aria-expanded="${String(!!state.nextOpen)}" aria-controls="next-body" data-click="${on(() => setState({ nextOpen: !state.nextOpen }))}"><span>What happens next</span>${icon("chev-d", 16, "next-chev")}</button></h2>
  ${state.nextOpen && html`<ol class="next-grid" id="next-body">
    <li class="next-item is-on"><span class="next-num">1</span><div><div class="next-title">Sent to Trullio</div><div class="next-body">${v.submitNote}</div></div></li>
    <li class="next-item"><span class="next-num">2</span><div><div class="next-title">Checks run</div><div class="next-body">You can close this window, and we'll email you.</div></div></li>
    <li class="next-item"><span class="next-num">3</span><div><div class="next-title">Start taking payments</div><div class="next-body">Your first payout lands the next business day after your first sale.</div></div></li>
  </ol>`}
</section>`;
  }

  // A disabled button cannot be hovered or focused, so it sits in a wrapper that can. The note names what is still needed.
  function gateView(v, btn) {
    if (v.canNext || !v.missing.length) return btn;
    const shown = v.missing.slice(0, 6);
    const more = v.missing.length - shown.length;
    return html`<span class="gate" data-key="gate" tabindex="0" data-mouseenter="${on(() => setState({ nextTip: true }))}" data-mouseleave="${on(() => setState({ nextTip: false }))}" data-focus="${on(() => setState({ nextTip: true }))}" data-blur="${on(() => setState({ nextTip: false }))}">${btn}${state.nextTip && html`<span class="gate-pop" data-key="gate-pop" role="note"><span class="gate-pop-body"><span class="gate-head">Still needed to submit</span><ul class="gate-list">${shown.map((m) => html`<li>${m}</li>`)}${more > 0 && html`<li>and ${more} more</li>`}</ul>${v.missing.some((m) => m.indexOf("Waiting on ") === 0) && html`<span class="gate-foot">Fill it in yourself on the Owners step, or remove their access.</span>`}</span></span>`}</span>`;
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
      ${step === 2 && step2View(v)}
      ${step === 6 && step6View(v)}
      ${step === 7 && reviewView(v)}
      ${v.cards.map(cardView)}
      ${step === 7 && signView(v)}
      ${step === 7 && nextView(v)}
      ${step === 7 && Object.keys(ERR).length > 0 && html`<p class="footer-error" data-key="err-summary" role="alert">${icon("alert", 16)}${Object.keys(ERR).length === 1 ? "One thing needs a look before you can submit." : Object.keys(ERR).length + " things need a look before you can submit."}</p>`}
      <div class="footer" data-key="footer">
        ${state.editing ? html`<div class="footer-end" data-key="end">
          ${gateView(v, html`<button type="button" class="btn btn-primary btn-lg btn-next" data-click="${on(saveEdit)}">Save</button>`)}
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
      <p class="hero-sub">Submitted ${v.submittedWhen} · reference <span class="mono">#XP-40718</span></p>
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
  const pendReasons = () => {
    const picked = pendAvailable().filter((r) => ctx.pend.indexOf(r.id) > -1);
    return picked.length ? picked : PEND_REASONS.filter((r) => PEND_DEFAULT.indexOf(r.id) > -1);
  };
  const rfiOf = (id) => state.rfi[id] || { files: [], vals: {} };
  const setRfi = (id, patch) => setState((s) => ({ rfi: Object.assign({}, s.rfi, { [id]: Object.assign({ files: [], vals: {} }, s.rfi[id], patch) }) }));
  // A request has an answer when it has a file or a message. Nothing on a card is required (decision more-info-one-response).
  const pendHas = (r) => { const c = rfiOf(r.id); return c.files.length > 0 || String(c.vals.note || "").trim() !== ""; };
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
  function pendTitle() { const n = pendReasons().length; return n === 1 ? "One thing to fix" : (NUMBER_WORDS[n] || String(n)) + " things to fix"; }

  // Ops picks the reasons in Prototype options. At least one stays picked.
  function togglePend(id, checked) {
    const next = PEND_IDS.filter((x) => (x === id ? checked : ctx.pend.indexOf(x) > -1));
    setCtx({ pend: next.length ? next : ctx.pend });
  }

  // Simulated upload: no picker opens and nothing is read. The file shows as uploading for a moment, then ready.
  function pendAddFile(r) {
    const have = rfiOf(r.id).files.map((f) => f.name);
    // A write-an-answer card has no file of its own; its optional document gets a generic name.
    const base = r.file || "supporting-document.pdf";
    let i = 1, name = base;
    while (have.indexOf(name) > -1) { i++; name = base.replace(/\.pdf$/, "-" + i + ".pdf"); }
    setRfi(r.id, { files: rfiOf(r.id).files.concat([{ name: name, busy: true }]) });
    setTimeout(() => setState((s) => {
      const c = s.rfi[r.id];
      return c ? { rfi: Object.assign({}, s.rfi, { [r.id]: Object.assign({}, c, { files: c.files.map((f) => (f.name === name ? { name: name, busy: false } : f)) }) }) } : {};
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
  ${c.files.map((f) => html`<div class="doc-file" data-key="file-${f.name}"><span class="doc-file-name">${f.name}</span>${f.busy ? html`<span class="state-pill state-pill--busy" role="status"><span class="spinner" aria-hidden="true"></span>Uploading</span>` : html`<button type="button" class="btn-link" aria-label="Remove ${f.name}" data-click="${on(() => setRfi(r.id, { files: rfiOf(r.id).files.filter((x) => x.name !== f.name) }))}">Remove</button>`}</div>`)}
  <div class="pend-field" data-key="file-btn-${r.id}"><button type="button" class="btn btn-outline btn-sm" data-click="${on(() => pendAddFile(r))}">${icon("upload", 15)}${c.files.length ? "Add another file" : "Choose file"}</button></div>
  <div class="pend-field" data-key="note-${r.id}"><label class="field-label field-label--block" for="pend-${r.id}-note">Message for our team</label><textarea class="input" id="pend-${r.id}-note" rows="3" data-input="${on((e) => setRfi(r.id, { vals: Object.assign({}, rfiOf(r.id).vals, { note: e.target.value }) }))}">${c.vals.note || ""}</textarea></div>
</div>`;
  }

  // One request: a short title, why we need it, what we'll accept, then the same file and message boxes (decisions pend-reasons-as-requests, more-info-one-response).
  function pendCardView(r) {
    return html`<section class="card card--p20 pend" data-key="pend-${r.id}">
  <div class="doc-row">
    <div class="grow">
      <div class="doc-titlebar"><h2 class="rfi-title">${pendText(r, r.title)}</h2></div>
      <p class="rfi-body">${pendText(r, r.why)}</p>
      <div class="pend-accept">
        <h3 class="pend-h">${r.lead}</h3>
        <ul class="pend-list">${r.accept.filter((t) => !(r.id === "kyc" && isNonprofit() && /Social Security/.test(t))).map((t) => html`<li>${pendText(r, t)}</li>`)}</ul>
        ${r.note && html`<p class="pend-note">${r.note}</p>`}
      </div>
      ${pendRespondView(r)}
    </div>
  </div>
</section>`;
  }

  /* SIMPLE TRIAL:START */
  // The whole request (what we need and why) is in the email, so this screen is only a place to send files and messages.
  // Each card has an optional file and an optional message. At least one card needs a file or a message before it can be sent.
  const simpleUpdate = (id, patch) => setState((s) => ({ rfiDocs: s.rfiDocs.map((d) => (d.id === id ? Object.assign({}, d, patch) : d)) }));
  // Simulated upload: no picker opens and nothing is read. The file shows as uploading for a moment, then ready.
  function simpleChooseFile(id) {
    simpleUpdate(id, { name: "document-" + id + ".pdf", busy: true });
    setTimeout(() => simpleUpdate(id, { busy: false }), 1400);
  }
  // Add a document stands in for choosing a file: the new card arrives with its file already uploading, since the real button
  // would open the file picker.
  function simpleAddCard() {
    const id = state.rfiDocs.reduce((m, d) => Math.max(m, d.id), 0) + 1;
    setState({ rfiDocs: state.rfiDocs.concat([{ id: id, name: "", busy: false, note: "" }]) });
    simpleChooseFile(id);
  }
  const simpleRemoveCard = (id) => setState((s) => ({ rfiDocs: s.rfiDocs.filter((d) => d.id !== id) }));
  function rfiSimpleView() {
    const docs = state.rfiDocs;
    const ready = docs.every((d) => !d.busy) && docs.some((d) => d.name || d.note.trim());
    return html`<header data-key="rfi-head">
  <h1 class="step-title">Send us what we asked for</h1>
  <p class="step-sub">The email we sent you lists everything we need. Add a file, write a message, or both. If you have more than one document, add another below.</p>
</header>
<div class="stack" data-key="rfi-simple-docs">
  ${docs.map((d) => html`<section class="card card--p20 pend simple-doc${d.name && !d.busy ? " is-done" : ""}" data-key="simple-doc-${d.id}">
    <div class="simple-top">
    <div class="pend-field" data-key="simple-note-${d.id}"><label class="field-label field-label--block" for="simple-note-${d.id}">Message for our team</label><textarea class="input" id="simple-note-${d.id}" rows="3" data-input="${on((e) => simpleUpdate(d.id, { note: e.target.value }))}">${d.note}</textarea></div>
    ${docs.length > 1 && html`<button type="button" class="icon-btn" aria-label="Remove this document" data-click="${on(() => simpleRemoveCard(d.id))}">${icon("trash", 16)}</button>`}
    </div>
    <div class="pend-field" data-key="simple-file-${d.id}">${d.name
      ? html`<div class="doc-file"><span class="doc-file-name">${d.name}</span>${d.busy ? html`<span class="state-pill state-pill--busy" role="status"><span class="spinner" aria-hidden="true"></span>Uploading</span>` : html`<button type="button" class="btn-link" aria-label="Remove ${d.name}" data-click="${on(() => simpleUpdate(d.id, { name: "", busy: false }))}">Remove file</button>`}</div>`
      : html`<button type="button" class="btn btn-outline btn-sm" data-click="${on(() => simpleChooseFile(d.id))}">${icon("upload", 15)}Choose file</button>`}</div>
  </section>`)}
  <div><button type="button" class="btn btn-outline btn-sm" data-click="${on(simpleAddCard)}">${icon("plus", 15)}Add a document</button></div>
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
  <p class="step-sub">${list.length === 1 ? "You're not back at the start. Fix this item and the checks carry on exactly where they left off." : "You're not back at the start. Fix these and the checks carry on exactly where they left off."}</p>
</header>
<div class="stack" data-key="rfi-cards">${list.map((r) => pendCardView(r))}</div>
<div class="rfi-actions" data-key="rfi-actions">
  <div class="btn-row">
    <button type="button" class="btn btn-primary btn-md"${attr("disabled", !ready)} data-click="${on(sendPend)}">Send to our team</button>
  </div>
  ${!ready && html`<p class="pend-hint">Add a file or write a message for every request to send.</p>`}
</div>`;
  }

  function approvedView(v) {
    return html`<section class="approved" data-key="approved">
  <span class="approved-tag">${icon("check", 13, "i-b")}Riverside Pilates approved</span>
  <h1 class="approved-title">Welcome to Xplor Pay</h1>
  <p class="approved-body">${invitesOn() ? "We've approved your application. Add a merchant to start taking transactions, then invite your team and order card readers." : "We've approved your application. Open your payments dashboard to add a merchant and start taking transactions. You can add more users there too."}</p>
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
    <form class="dialog-form" data-submit="${on(() => { if (!SAVE_EMAIL_OK.test(state.saveEmail.trim())) { setState({ saveEmailErr: "Enter an email like name@example.com." }); return; } closeSave(); })}"${state.saveEmailErr ? html` data-error="1"` : ""}>
      <label class="sr-only" for="save-email">Email address to send the link to</label>
      <input class="input" id="save-email" type="email" value="${state.saveEmail}" placeholder="name@example.com" autocomplete="email" spellcheck="false" data-input="${on((e) => setState({ saveEmail: e.target.value, saveEmailErr: "" }))}" data-blur="${on(() => setState({ saveEmailErr: state.saveEmail.trim() && !SAVE_EMAIL_OK.test(state.saveEmail.trim()) ? "Enter an email like name@example.com." : "" }))}">
      <button type="submit" class="btn btn-primary btn-md">Send link</button>
    </form>
    ${state.saveEmailErr && html`<p class="field-error" role="alert">${state.saveEmailErr}</p>`}
    <p class="dialog-foot">${icon("lock", 14)}The link expires in 7 days and only works for that email address.${pin("save-link-scope")}</p>
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
    <form class="dialog-form" data-submit="${on(sendDelegate)}"${state.delegateErr ? html` data-error="1"` : ""}>
      <label class="sr-only" for="delegate-email">Email address to send the link to</label>
      <input class="input" id="delegate-email" type="email" value="${state.delegateEmail}" placeholder="name@example.com" autocomplete="off" spellcheck="false" data-input="${on((e) => setState({ delegateEmail: e.target.value, delegateErr: "" }))}" data-blur="${on(() => setState({ delegateErr: inviteEmailProblem(state.delegateEmail) }))}">
      <button type="submit" class="btn btn-primary btn-md">${changing ? "Update and resend" : "Send invite"}</button>
    </form>
    ${state.delegateErr && html`<p class="field-error" role="alert">${state.delegateErr}</p>`}
    <p class="dialog-foot">${icon("lock", 14)}The link expires in 7 days and only works for that email address.</p>
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
    ${need("shield", "Why we ask", (isNonprofit() ? "To confirm who runs the organization. " : "To confirm who owns the business. ") + "The details go to Trullio, our verification partner, like the rest of the application.")}
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
  const SUPPORT_HOURS = "7am–7pm PT, Monday to Friday";
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
    ${state.screen === "rfi" && html`<hr class="proto-rule">
    ${select("More info needed screen", "moreInfo", "moreinfo-simple-trial")}
    <div class="proto-sub">More info needed: Ops picks${pin("pend-reasons-as-requests")}</div>
    ${ctx.moreInfo === MOREINFO_SIMPLE && html`<p class="proto-note">The bare screen ignores Ops picks. Pick A card for each request to use them.</p>`}
    <div class="proto-pend" data-key="pend-list">${pendAvailable().map((r) => html`<label class="proto-check" data-key="pend-opt-${r.id}"><input type="checkbox"${attr("checked", ctx.pend.indexOf(r.id) > -1)} data-change="${on((e) => togglePend(r.id, e.target.checked))}">${r.name}</label>`)}</div>
    ${ctx.pend.some((id) => PEND_REASONS.some((r) => r.id === id && r.person)) && state.owners.length > 1 && html`<label data-key="pend-for"><span class="field-label field-label--block">Request is about</span><select class="input" data-input="${on((e) => setState({ pendFor: Number(e.target.value) }))}">${state.owners.map((o) => html`<option value="${o.id}"${attr("selected", pendPerson().id === o.id)}>${ownerInfo(o).name}</option>`)}</select></label>`}`}
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
    ${canSave && html`<button type="button" class="btn btn-neutral btn-md topnav-exit" data-click="${on(openSave)}">Save &amp; Exit</button>`}
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
${state.toast && html`<div class="toast" data-key="toast-${state.toast.id}" role="status">${icon("check", 16, "i-b")}<span>${state.toast.text}</span></div>`}
${state.saveOpen && saveView(v)}
${state.delegateOpen && delegateView()}
${state.confirm && confirmView()}
${state.helpOpen && helpView()}
${state.notesListOpen && notesListView()}
${state.viewDoc && docViewerView(v)}
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

  function render() {
    handlers = [];
    const tpl = document.createElement("template");
    tpl.innerHTML = appView().s;
    morphChildren(root, tpl.content);
    applyWidths();
    initSignature();

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
        : state.screen === "approved" ? "Approved" : state.screen === "submitted" && state.askedMore ? "We've emailed you" : state.screen === "rfi" ? (ctx.moreInfo === MOREINFO_SIMPLE ? "Send us what we asked for" : pendTitle()) : "Under review") + " · Xplor Pay";
    }
    // Move focus into the dialog when it opens and back to the opener when it closes.
    if (state.saveOpen && !last.saveOpen) {
      opener = document.activeElement;
      const field = document.getElementById("save-email");
      if (field) field.focus();
    } else if (!state.saveOpen && last.saveOpen && opener && document.contains(opener)) {
      opener.focus();
    }
    if (state.delegateOpen && !last.delegateOpen) {
      opener = document.activeElement;
      const field = document.getElementById("delegate-email");
      if (field) field.focus();
    } else if (!state.delegateOpen && last.delegateOpen && opener && document.contains(opener)) {
      opener.focus();
    }
    if (state.confirm && !last.confirm) {
      opener = document.activeElement;
      const cancel = document.getElementById("confirm-cancel");
      if (cancel) cancel.focus();
    } else if (!state.confirm && last.confirm && opener && document.contains(opener)) {
      opener.focus();
    }
    if (state.helpOpen && !last.helpOpen) {
      opener = document.activeElement;
      const close = document.getElementById("help-close");
      if (close) close.focus();
    } else if (!state.helpOpen && last.helpOpen && opener && document.contains(opener)) {
      opener.focus();
    }
    if (state.viewDoc && !last.viewDoc) {
      opener = document.activeElement;
      const close = document.getElementById("docv-close");
      if (close) close.focus();
    } else if (!state.viewDoc && last.viewDoc && opener && document.contains(opener)) {
      opener.focus();
    }
    last = { screen: state.screen, step: state.step, inviteStep: state.inviteStep, delegateOpen: state.delegateOpen, confirm: state.confirm, saveOpen: state.saveOpen, helpOpen: state.helpOpen, viewDoc: state.viewDoc, loginStage: state.loginStage };
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
    const hot = state.comboOpen && document.querySelector(".combo-opt.is-active");
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
    else if (key === "help") closeHelp();
    else if (key === "delegate") closeDelegate();
    else if (key === "save") setState({ saveOpen: false });
    else if (key === "notes-list") setState({ notesListOpen: false });
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (state.confirm) closeConfirm();
    else if (state.menuOwner) closeMenu();
    else if (state.viewDoc) closeDoc();
    else if (state.helpOpen) closeHelp();
    else if (state.delegateOpen) closeDelegate();
    else if (state.saveOpen) setState({ saveOpen: false });
    else if (state.whyOpen) setState({ whyOpen: false });
    else if (state.fieldWhy) setState({ fieldWhy: "" });
    else if (state.nextTip) setState({ nextTip: false });
    else if (state.infoOpen) setState({ infoOpen: false });
    else if (state.protoOpen) setState({ protoOpen: false });
  });

  render();
})();
