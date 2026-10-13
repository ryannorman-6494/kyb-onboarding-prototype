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
 *   ?chrome=shell   render inside the Xplor app shell
 *   ?why=0          hide the "why we ask" panel
 *   ?link=          how the emailed link opens: returning | review | info | approved | expired | closed
 *
 * Security: nothing leaves the page. There are no network calls (the CSP in
 * index.html blocks them as well), nothing is written to storage or cookies,
 * and every value stays in memory until the tab closes. Document uploads,
 * and the registry lookup are simulated.
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
  // Prototype context (design props)
  // ---------------------------------------------------------------------------

  // How the emailed link behaves when it is opened (decisions 89 to 91). The first is a brand-new applicant.
  const LINKS = {
    returning: "Returning, in progress",
    review: "Returning, under review",
    info: "Returning, more info needed",
    approved: "Returning, approved",
    expired: "Expired link",
    closed: "Closed link"
  };
  const LINK_NEW = "New applicant";

  // Only whitelisted values are read from the URL, so query-string input
  // never reaches the markup or the state.
  function readContext() {
    const q = new URLSearchParams(location.search);
    return {
      region: q.get("region") === "ca" ? "Canada" : "United States",
      chrome: q.get("chrome") === "shell" ? "Inside app shell" : "Standalone flow",
      data: q.get("data") === "sample" ? "Sample business" : "Empty",
      showNotes: q.get("notes") === "1",
      link: Object.prototype.hasOwnProperty.call(LINKS, q.get("link")) ? LINKS[q.get("link")] : LINK_NEW
    };
  }
  function writeContext() {
    const q = new URLSearchParams();
    if (ctx.region === "Canada") q.set("region", "ca");
    if (ctx.chrome === "Inside app shell") q.set("chrome", "shell");
    if (ctx.data === "Sample business") q.set("data", "sample");
    if (ctx.showNotes) q.set("notes", "1");
    Object.keys(LINKS).forEach((k) => { if (ctx.link === LINKS[k]) q.set("link", k); });
    const qs = q.toString();
    try { history.replaceState(null, "", qs ? "?" + qs : location.pathname); } catch (e) { /* file:// can refuse; the context still applies */ }
  }
  let ctx = readContext();
  function setCtx(patch) { ctx = Object.assign({}, ctx, patch); writeContext(); schedule(); }
  const isCa = () => ctx.region === "Canada";

  const CONTEXT_OPTIONS = {
    region: ["United States", "Canada"],
    chrome: ["Standalone flow", "Inside app shell"],
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
      "t": "Give “someone else handles this” equal billing",
      "b": "In a small business the person who signs up is very often not the person with the bank details or the incorporation papers. Handing off is a first-class path from the welcome screen, not something you discover when you get stuck on step 4.",
      "by": "Claude",
      "when": "2026-09-23"
    },
    {
      "id": "save-link-scope",
      "area": "Trust",
      "where": "Save and finish later",
      "t": "Resume links are scoped, addressed and expiring",
      "b": "A resume link is a bearer token for a part-finished KYB application, so it lasts 7 days, only works for the address it was sent to, and drops the recipient into their own part of the flow rather than the whole thing.",
      "by": "Claude",
      "when": "2026-09-23"
    },
    {
      "id": "lookup-first",
      "area": "Flow",
      "where": "Step 1 · Business & address",
      "t": "Ask for the registry number before anything else",
      "b": "One EIN or business number fills in the legal name, structure, incorporation date and state. Correcting prefilled details is faster and far more accurate than composing them, and a registry match removes a document from step 6.",
      "by": "Claude",
      "when": "2026-09-23"
    },
    {
      "id": "no-mcc-picker",
      "area": "Copy",
      "where": "Step 1 · Business & address",
      "t": "Describe the business first; the category list is a checked suggestion, not a quiz",
      "b": "Almost no merchant knows their MCC, and guessing at a dropdown produces wrong classifications that surface as problems weeks later. They describe the business in their own words (optional), we suggest a category from that and fill it in, and the full merchant category code (MCC) list is one search away if the suggestion is wrong or there is no description. The category is the required field, the description only helps fill it.",
      "tradeoff": "Classification has to be right, and has to be shown, or this is worse than the dropdown. The code is a merchant category code (MCC), Ryan's call on 2026-10-06 (decision 68); whether Canada needs NAICS as well is for ops to say.",
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
      "t": "Show the ownership arithmetic rather than explain the 25% rule",
      "b": "A live bar totalling the percentages entered, with a sentence about what the unaccounted remainder means. The 25% beneficial-owner threshold is the hardest idea in KYB to explain in prose, and it stops being confusing the moment you can see it add up.",
      "by": "Claude",
      "when": "2026-09-23"
    },
    {
      "id": "sign-last",
      "area": "Trust",
      "where": "Step 2 · Owners & signatory",
      "t": "Say in step 2 that nothing is binding until step 7",
      "b": "Being asked who will sign, five steps before signing, reads as a commitment. The card says outright that the signature happens at the end and nothing before it binds anyone.",
      "by": "Claude",
      "when": "2026-09-23"
    },
    {
      "id": "underwriting-plain",
      "area": "Copy",
      "where": "Step 3 · How you take payments",
      "t": "Underwriting questions in plain English, with “best guesses are fine” said first",
      "b": "Volume questions read as a test people can fail, so they stall on them or inflate them. Stating up front that estimates are expected, that they set limits rather than rates, and that going over one changes nothing, removes the reason to stall.",
      "by": "Claude",
      "when": "2026-09-23"
    },
    {
      "id": "descriptor-preview",
      "area": "Visual",
      "where": "Step 3 · How you take payments",
      "t": "Preview the billing descriptor on a mock statement, in context",
      "b": "The descriptor is shown on a statement extract between two ordinary transactions, because the thing that matters is whether a customer recognizes it in a list, not whether it looks right on its own. The sheet's own heading carries the explanation (“How this looks on your customer's statement”), so there is no separate caption above it. Anything past the card networks' 22-character limit is struck through rather than blocked, so a paste still shows you exactly what you would lose.",
      "tradeoff": "It's a mock statement, so it implies a formatting fidelity real issuers don't all share.",
      "by": "Ryan",
      "when": "2026-09-30"
    },
    {
      "id": "payout-typed-in",
      "area": "Flow",
      "where": "Step 4 · Payout account",
      "t": "The payout account is typed in, with no bank connection",
      "b": "Step 4 asks for the account details directly: bank name, account holder, account type, and the routing and account numbers (institution, transit and account numbers in Canada). The earlier choice between connecting a bank and typing the details in is gone, along with the “30 seconds” and “+1 document” labels, the simulated bank login, and the lines on the welcome page and in step 4 that promised a faster route. Nothing proves the account on the spot any more, so the bank letter or voided check is always asked for in step 6.",
      "tradeoff": "Typing numbers is slower and easier to get wrong than a bank connection, and a mistyped digit would send money to the wrong place; the bank letter in step 6 is the check. A connection could come back later as a second route, but it is not designed here.",
      "by": "Ryan",
      "when": "2026-10-07"
    },
    {
      "id": "bank-no-debit",
      "area": "Trust",
      "where": "Step 4 · Payout account",
      "t": "Say out loud that Xplor cannot debit the account",
      "b": "Typing in account details is a sensitive moment. The card says the account can receive payouts and that Xplor has no authority to take anything out.",
      "by": "Claude",
      "when": "2026-09-23"
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
      "t": "Read each document at upload and show the read-back",
      "b": "Every file returns a line saying what was read off it and which step it matches. An unreadable scan is the classic three-day round trip, and catching it while the person is still on the page is the largest single time saving in the flow.",
      "by": "Claude",
      "when": "2026-09-23"
    },
    {
      "id": "rfi-not-restart",
      "area": "Copy",
      "where": "More info needed",
      "t": "An information request is framed as one item, not a restarted application",
      "b": "The screen leads with what still passed, names the one thing to fix, and says the checks resume where they stopped. Standard RFI emails read like a rejection and lose applicants who had nearly finished.",
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
      "b": "The merchant category callout appears only once there's a description to derive it from, the recognized-bank hint only once a routing number exists, and each review row lists the parts it actually has instead of stringing empty values together with separators. A reassurance about data nobody has entered is just noise.",
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
      "b": "A “Read these before you accept” card lists the three agreements and any files uploaded in step 6, each with a View button that opens it in a reader. The agreement, rates and privacy checkboxes also carry their own View button beside them, and a Viewed mark appears once something has been opened. Accepting is not blocked on viewing.",
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
      "b": "Found by the first persona test run. Step 1 says the registry match saves you a document, so the registration proof and EIN letter now show as “Not needed” in step 6, and the “to go” count is worked out from the list. The W-9 read-back and the submitted screen use the owners the applicant entered rather than the sample people, and the “everyone's done their bit” tile only says so when it is true. Spelling is US throughout (license, authorized, tokenized, recognize). Entrance animations were shortened and shrunk so cards settle before someone clicks.",
      "by": "Ryan",
      "when": "2026-10-05"
    },
    {
      "id": "validate-on-continue",
      "area": "Flow",
      "where": "Throughout",
      "t": "Nothing moves on until the step is complete, and every problem shows at once",
      "b": "The first persona run got to “submitted” with an empty owner form, no signature and none of the agreements ticked, which made “Everything below has already passed our checks” untrue. Pressing “Save and continue” now checks the whole step, lists every problem in place with a short fix-it message, scrolls to the first one and says how many there are by the button. Nothing shows before the first attempt, so a fresh form is not covered in red, and each message clears the moment its field is put right. Step 7 also needs the typed signature to match the signatory's name.",
      "tradeoff": "Formats are checked leniently (digit counts, not checksums) so a prototype never rejects a plausible real number.",
      "by": "Ryan",
      "when": "2026-10-05"
    },
    {
      "id": "business-type-first",
      "area": "Flow",
      "where": "Business type (page 2)",
      "t": "Ask who you are before asking anything else",
      "b": "A sole trader in the second persona test was asked for a date and state of incorporation, got a registry match for a stranger's company and had no way to say none of it applied. The page after the welcome screen, adapted from the Figma Make prototype, now asks what type of business you are (company, individual / sole trader, non-profit). The answer shapes the rest: a sole trader is asked whether they have an EIN at all, sees no incorporation fields, no ownership percentages and no owner invitations, and is not asked for registration documents; a non-profit is asked who runs the organization rather than who owns it. Changing the answer later clears what was entered, so nothing that no longer applies is left behind.",
      "tradeoff": "Back from step 1 returns here, and changing type restarts the form. That is deliberate but loses typed answers.",
      "by": "Ryan",
      "when": "2026-10-05"
    },
    {
      "id": "help-is-a-person",
      "area": "Trust",
      "where": "Throughout",
      "t": "“Get help” opens a phone number, not nothing",
      "b": "The second test persona looked for someone to call at every sensitive field and found a Get help button that did nothing, so her fallback was to leave and ring a relative. Both help buttons now open a short panel with a phone line, chat and email, the hours, and a line saying Xplor will never ask for a full SSN, password or bank login by chat, phone or text, which also covers the worry about phishing texts.",
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
      "id": "lookup-not-me",
      "area": "Trust",
      "where": "Step 1 · Business & address",
      "t": "After a lookup, ask “Is this your business?” and let them say no",
      "b": "Three testers in the second round (a baker, a food-pantry treasurer and a studio owner's earlier run) were shown a business that was not theirs and had nothing to click except overwriting every field. The match now asks to be confirmed. Saying no clears what was filled in and opens the empty form, so they can type the details themselves (the registration document is then requested at step 6) or look up a different number above, which fills the form again. Once confirmed, the “matched against records” note only shows while the details are still as the registry returned them.",
      "tradeoff": "One more click on the common path. Worth it, because a silent wrong match is worse than a click.",
      "by": "Claude",
      "when": "2026-10-05"
    },
    {
      "id": "category-editable",
      "area": "Copy",
      "where": "Step 1 · Business & address",
      "t": "Show the business category in plain words, as a suggestion they can change",
      "b": "The prototype used to announce “7997 · Membership clubs (fitness)” for every business, and four testers out of four met it. The category is now a plain-words field below the description: pre-filled with a best guess when the description matches one, left for them to choose when it does not, with a way out (“we'll confirm with you”). No code is shown. The guess is a simple keyword match standing in for a real classifier.",
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
      "b": "The W-9 row said “give it a read and sign” but its only button produced a file already “signed by” the applicant with a tax number matching step 1, though the sole-proprietor tester had given no tax number and signed nothing. The row now offers Review and sign (a form filled from the applicant's own answers, a certification tick and a typed name that must match step 2) or Upload your own. With no EIN, a company can't sign here and is told why; a sole proprietor's number is their SSN from step 2, which is not repeated on screen. Read-backs for the other documents only say “matches step N” when there is a value to match.",
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
      "id": "optional-website-refund",
      "area": "Flow",
      "where": "Step 1 and step 3",
      "t": "Website and refund-policy URL are optional",
      "b": "Two testers had no website or policy page and pasted a Facebook link or a sentence to get past the required field. Both fields are now optional and say so. A missing website may slow the business check but is not a reason to stop an application.",
      "tradeoff": "Fewer applicants will supply a policy URL, which helps with chargebacks. The underwriting team should say whether either is needed for particular business categories.",
      "by": "Ryan",
      "when": "2026-10-05"
    },
    {
      "id": "lookup-progressive",
      "area": "Flow",
      "where": "Step 1 · Lookup",
      "t": "Step 1 shows only the lookup until it has been used, with a quiet way to skip it",
      "b": "The rest of step 1 (about a dozen fields) is hidden until the applicant presses Look up or chooses Enter details manually. A bad number gets a plain hint under the box, not a red input, because pressing the button is not a mistake. A successful match shows a green toast in the top-right corner (see success-toasts) and the form appears at once. Choosing Enter details manually clears any match already filled in and asks for a registration document at step 6. For sole proprietors it is also the “I don't have an EIN” route (the separate button is gone), so their SSN or SIN is asked at step 2.",
      "tradeoff": "Anyone who wants to see the whole form before committing cannot.",
      "by": "Ryan",
      "when": "2026-10-05"
    },
    {
      "id": "success-toasts",
      "area": "Feedback",
      "where": "Step 1 and everywhere a green confirmation appeared",
      "t": "Green confirmations are toasts in the top-right corner, not blocks in the page",
      "b": "The lookup match, the “no EIN” choice and “enter details manually” used to push a green block into the page and hold the next fields back. They now appear as a toast that fades after about four and a half seconds, so the fields arrive straight away. The note at the top of step 6 is reassurance rather than a confirmation, so it is now a neutral callout that stays.",
      "tradeoff": "A toast can be missed or fade before it is read. The manual-entry toast carries the “we'll ask for a registration document” warning, which is also repeated by step 6 itself.",
      "by": "Ryan",
      "when": "2026-10-05"
    },
    {
      "id": "continue-disabled-until-complete",
      "area": "Flow",
      "where": "Every step",
      "t": "Save and continue stays disabled until the page is complete; each field flags its own problem when it is left",
      "b": "The button is disabled until every required field on the step is valid. The reason is never left to the button: a field shows its problem the moment the applicant clicks or tabs out of it, with a red border and a message under it, so a wrong date or an empty required answer is flagged where it happened. An owner whose fields have a problem carries a Needs a look badge in the header, so a collapsed owner cannot hide one.",
      "tradeoff": "A field that was never visited gives no sign it is missing until the applicant scrolls to it, and the disabled button does not point to it. If testers get stuck on a skipped field, add a count of what is left near the button.",
      "by": "Ryan",
      "when": "2026-10-05"
    },
    {
      "id": "welcome-four-cards",
      "area": "Copy",
      "where": "Welcome page",
      "t": "The “What you'll need” list is four cards, with bank and documents combined",
      "b": "Getting paid and the documents that back it up are one preparation job, so they share a card: bank numbers, and the bank letter or voided check. The line about a photo ID going up at step 6 was removed because it was unclear; the second card is titled “Details of the people who own your organization”. The page also sits closer to the top, as do all the steps.",
      "tradeoff": "The combined card is longer than the others.",
      "by": "Ryan",
      "when": "2026-10-05"
    },
    {
      "id": "card-split-single",
      "area": "Flow",
      "where": "Step 3 · Your card volumes",
      "t": "Ask for the card-present share only; card not present is whatever is left",
      "b": "Card present and card not present were two boxes that had to add up to 100, so the second could only ever repeat or contradict the first. Step 3 now asks for card present alone and its hint says online, in-app and phone sales count as the rest. The “need to add up to 100%” error went with it, because it can no longer happen.",
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
      "b": "A registry match or a sole proprietor without an EIN each removes a document. Those rows used to stay on the page greyed out with a “Not needed” pill and an explanation, which added a line for something the applicant never has to do. Step 6 now lists only the documents still to add, the note above says how many are left, and the review summary no longer counts the ones that dropped away.",
      "tradeoff": "The registry match already says it saves a document.",
      "by": "Ryan",
      "when": "2026-10-05"
    },
    {
      "id": "step2-prefill-sections",
      "area": "Flow",
      "where": "Step 2 · Owner details",
      "t": "Offer back what step 1 already collected, and break each owner into three labelled groups",
      "b": "Two testers typed their email, phone and address at step 1 and were asked for them again at step 2. The first owner's email and phone now start filled from step 1, a sole proprietor's home address from their business address, and the country of residence and ID from the region. All of it stays editable. The owner's roughly fifteen fields are grouped under About them, Their ID and Screening, so the page reads as three short jobs rather than one long form.",
      "tradeoff": "A company's step 1 email and phone are business contacts and may not be the owner's own, so they are offered, not locked. A pre-filled country can be missed by someone who holds a different nationality; nationality is deliberately left blank.",
      "by": "Claude",
      "when": "2026-10-05"
    },
    {
      "id": "welcome-phone-partner",
      "area": "Trust",
      "where": "Welcome",
      "t": "Put a phone number and the verification partner's name on the welcome page",
      "b": "The baker in the persona tests looked for someone to call before she would give an SSN, and the welcome page offered only a small privacy link that never named who checks her identity. The page now carries a line stacked just above the privacy link, “Want to talk to someone first?”, with the support number and hours, and the privacy note says identity checks are done by Trullio, our verification partner. The number and hours are the same constants the Get help panel uses, so they change in one place.",
      "tradeoff": "The number is a placeholder until ops supply the real one, and the security claims in the privacy note (tokenized, encrypted) are still unverified. A person has to read the page to reach the number; it is a line of text, not a button.",
      "by": "Claude",
      "when": "2026-10-06"
    },
    {
      "id": "info-popover-hover",
      "area": "Flow",
      "where": "Welcome",
      "t": "The privacy note shows on hover and goes when the pointer leaves",
      "b": "The “What we do with your information” note opened on hover but a click on the same link toggled it shut, so the first click appeared to do nothing. Ryan wants it to behave as a hover note, so hover shows it and leaving hides it. A click or tap now only ever opens it, never closes it, which keeps it reachable on a touch screen where there is no hover. Escape closes it. The question-mark icon replaces the padlock so the link matches the support line below it.",
      "tradeoff": "A hover note is invisible to someone who never moves the pointer over it, and on touch it stays open until Escape or a tap elsewhere is handled. Keyboard users can open it with Enter but there is no focus-to-open.",
      "by": "Ryan",
      "when": "2026-10-06"
    },
    {
      "id": "lookup-clears-refused-number",
      "area": "Flow",
      "where": "Step 1 · Lookup",
      "t": "A number that was refused is cleared when the applicant chooses to go on without it",
      "b": "A baker typed her SSN into the EIN box, was told gently it was the wrong kind of number, then chose Enter details manually. The green “No problem” toast appeared, but her SSN stayed in the box with its red message beside it, so the page contradicted itself and she wondered whether the number had been kept. Choosing Enter details manually now empties a refused number and its message. A number that was valid is left alone.",
      "tradeoff": "An applicant who mistyped one digit loses what they typed and must retype it if they change their mind and look it up after all.",
      "by": "Claude",
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
      "b": "Ryan chose merchant category codes over SIC codes: they are what the card networks use and what the application is ultimately classified by. The field is now “Merchant category code (MCC)”, searched by name or code, and the suggestion from the description points at MCCs (bakeries 5462, restaurants 5812, caterers 5811, fitness 7997, charities 8398 and so on). The SIC list is no longer loaded.",
      "tradeoff": "The list in mcc-codes.js has 221 codes written from general knowledge of the public MCC list, not checked against the Visa or Mastercard publication, and it leaves out the codes the networks restrict (gambling, adult, money transfer and similar) until ops say which Xplor accepts. Do not rely on it until ops supply the real list. Whether Canada also needs NAICS is still open.",
      "by": "Ryan",
      "when": "2026-10-06"
    },
    {
      "id": "delegate-owner-step",
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
      "where": "Step 5 PCI question, step 6",
      "t": "PCI can be answered Unsure, and step 6 loses four pieces of noise",
      "b": "The “Do you follow the card industry's data security rules (PCI DSS)?” question now has a third answer, Unsure, and the applicant can continue on it; the SAQ type and date fields only appear for Yes, and the review row says “PCI: unsure”. On step 6: the “3 to go” banner at the top is gone (the cards already show what is outstanding); the W-9 card no longer says “We've filled it in from your answers”; a document card keeps its default border once a file has been read, since the Checked badge already says so; and “I'll add this later” is gone, because step 6 is second to last and there is no later. “Text me a link to add it from my phone” stays. The phone note now says the number is the one from step 1, since step 2 no longer asks for the applicant's own number.",
      "tradeoff": "Unsure is a real answer that underwriting will see, so someone has to decide what follows from it (a call, an assisted questionnaire, a limit on card-not-present volume): ops question 21. With “later” gone, a merchant without a file has only the phone link, which is a simulated stub, or has to stop.",
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
      "b": "The Open/Collapse button on an owner card no longer has a grey background; it turns grey only on hover. The new Remove button beside it uses the same plain style and carries a trash-can icon. Remove deletes the owner and what was typed for them, and is not shown to a sole proprietor, whose only owner is themselves.",
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
      "b": "For a non-profit the step list and review rows read “Organization & address” and “Leaders & signatory” (the browser tab title too). Step 1 says organization on the legal name, phone and email labels, their placeholders, the website hint, the contact card line and the category hint. The why-we-ask notes for steps 1, 2 and 7, the identity-check hint, the number-lookup reassurance and the Canadian “organization's business number” prompt say organization, and the step 2 note says directors and trustees have to be identified instead of 25% owners. Document read-backs and the checking note say organization, the statement preview speaks of a supporter's statement, the owner-link recipient page says who runs the organization and the approved screen says people can pay themselves.",
      "tradeoff": "Deliberately left alone: the business-type page (it is where the type is chosen, so “business” is the neutral word), the welcome page (shown before the type is known), the agreement, rates and privacy sample text, which legal owns, and the W-9 (“Business name, if different” follows the IRS form). “Leaders” and “supporter” are my wording, not Ryan's or ops'. “Supporter” does not fit a non-profit selling tickets or services. The Merchant services agreement title and “merchant” in the approved screen are unchanged.",
      "by": "Claude",
      "when": "2026-10-06"
    },
    {
      "id": "disabled-button-says-whats-missing",
      "area": "Flow",
      "where": "Every step · Save and continue",
      "t": "Hovering or focusing the disabled Save and continue lists what is still needed",
      "b": "In the third persona run Maya left Phone blank on step 2, pressed a pale Save and continue twice, saw nothing happen and thought the page was broken. The button stays disabled, but hovering it, or tabbing to it, now opens a small note above it headed “Still needed to continue”, listing each missing item in the words of its field (for example “Business phone number”, “File: Government photo ID for Maya Chen”) or, for things that are not a field such as owner shares, the existing error sentence. It lists six at most and then “and N more”. Mouse-away, blur or Escape closes it. Nothing is shown on the page itself, no error appears on any field because of it and there is no count.",
      "tradeoff": "This keeps Ryan's earlier calls (the button stays disabled, no click-to-reveal errors, no count near the button) and adds only a hover note he chose on 2026-10-06 from three options. It is hidden until asked for, like the why-we-ask note, so someone who never hovers still sees a pale button that does nothing; on a touch screen there is no hover, and a tap on the disabled button does nothing. Clicking the disabled button still does not scroll to the empty field. Owner fields are prefixed with the owner's name, which reads oddly for “New owner”.",
      "by": "Ryan",
      "when": "2026-10-06"
    },
    {
      "id": "bank-letter-always",
      "area": "Flow",
      "where": "Step 6 · Bank account verification",
      "t": "The bank letter is always required",
      "b": "With no bank connection to prove the account, the bank account verification row in step 6 is always Required: a voided check or void cheque, a bank letter, or a recent statement showing the name and account. It never shows as skipped, and the review summary says “bank document still to add” until it is checked.",
      "tradeoff": "This is one more file for everyone, which the bank connection used to remove. Whether these documents are enough to prove the account, and what an applicant sees when the letter does not match step 4, is for ops and the verification partner to say. The “One thing to fix” page still shows a mismatch between the letter and the registered address.",
      "by": "Ryan",
      "when": "2026-10-07"
    },
    {
      "id": "welcome-registry-promise-softened",
      "area": "Copy",
      "where": "Welcome page · What you'll need",
      "t": "The welcome page no longer promises that the registry fills in everything",
      "b": "The registration card said “We'll pull the rest from IRS and state records, so there's a lot less for you to type.” In the third persona run a sole proprietor entered a valid EIN, was told “There's no registry record to fill in for you” and typed everything herself, so the promise did not hold. It now reads “If we find a record we'll fill in the rest, so there's less for you to type.” (and the same with the CRA business number for Canada).",
      "tradeoff": "The welcome page is shown before the applicant says what type of business they are, so it cannot be worded for sole proprietors alone; the softer line is true for everyone but sells the shortcut less strongly. The registry match is simulated (stub registry-lookup), so how often a real lookup finds a record is unknown.",
      "by": "Ryan",
      "when": "2026-10-06"
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
      "b": "Step 3 asked “Has a processor ever terminated you?” (with a “which processor, when, and why” box) and step 5 asked “Has a merchant account of yours been terminated?” (with “Processor, date and reason”). In the third persona run the tester noticed the repeat. Ryan chose to keep the step 5 declaration and remove the step 3 question and its follow-up, and with them the card note “A past termination isn't an automatic no…”, which no longer had a question to sit beside. Step 3's processing history is now whether they have accepted cards before and, if so, the prior processor and chargeback ratio.",
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
      "id": "pci-followups-optional",
      "area": "Flow",
      "where": "Step 5 · Card data security",
      "t": "The PCI follow-up questions are optional",
      "b": "Answering Yes to the PCI question still reveals “Which security questionnaire do you fill in (SAQ type)?” and “When did you last complete it?”, but both now carry the Optional tag and say to skip them if you only use Xplor Pay, because the form is filled in for you. This removes the contradiction with the note under them (“we fill it in for you”) and the invented date that a persona typed to get past a required field. A date that is typed is still checked.",
      "tradeoff": "Whether Xplor needs these answers at all is not known; this keeps the fields so nothing is lost if it does, but lets an applicant skip them. If ops confirms they are never needed, hiding them is the next step. The fields still appear after the click, so the layout still jumps (known, handover item 4).",
      "by": "Ryan",
      "when": "2026-10-07"
    },
    {
      "id": "confirmation-id-status",
      "area": "Status",
      "where": "Confirmation screen · the ID tile and the timeline note",
      "t": "The confirmation only says we're waiting on an ID when a link is outstanding",
      "b": "The tile used to say “Still waiting on one ID” and “We've nudged” a person whenever an owner was not verified or received, which included owners the applicant had added and whose ID the applicant had uploaded in step 6. A persona saw “We've nudged Maya Chen to finish” while the timeline said her ID had arrived. Now only an owner who was sent a link and has not replied counts as owed, and only they are named as nudged; the title says “Still waiting on N IDs” when there are several. When there is one owner and nobody is being chased, the tile reads “Nothing waiting on anyone else” with “Your own ID is the only one to check”, or “The only ID is in and being checked” when that owner was added rather than marked as the applicant. The timeline note follows the same rule.",
      "tradeoff": "A single owner added with the plain “Add an owner or director” button is read as the applicant's own ID in the timeline note (“Your ID arrived and is being checked”), which is wrong if the applicant is listing someone else as the only owner. That is rare, and step 6 will not continue until the file is in either way.",
      "by": "Ryan",
      "when": "2026-10-07"
    },
    {
      "id": "return-via-email-link",
      "area": "Trust",
      "where": "Save and finish later",
      "t": "Tell people how to come back: the link in their email, and a code",
      "b": "Answers save as people go, and the same emailed link reopens the last saved state after a one-time code. The save dialog says that in one line at the top, then offers the separate hand-off to someone else. The two links are different things: the applicant's own link is the one in the original email, and the hand-off link is the one this dialog sends.",
      "tradeoff": "The 7 days on the hand-off link is our own assumption. The magic link spike proposes about 30 days for the applicant's own link, still to be confirmed, and does not cover hand-off links at all, so whether they exist and how they work is a question for the team.",
      "by": "Ryan",
      "when": "2026-10-07"
    },
    {
      "id": "check-its-you",
      "area": "Trust",
      "where": "Before the welcome page",
      "t": "Ask for a one-time code before anything is shown",
      "b": "The emailed link alone does not open the application. The first screen shows a masked email address and a Send code button, then a box for the 6-digit code, with a way to send a new one, a message for a wrong code, and a pause after three wrong tries. An expired link and a closed link each get a plain page that says who to call. The country is already known when the page opens, so nobody is asked for it.",
      "tradeoff": "The code length, the lack of a wait before a new code, the number of tries and who to call on an expired link are guesses, not facts from the spike. A person sent to the wrong address by a typo can only see the masked email and call us.",
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
      "tradeoff": "Whether three months is what the risk team needs, and in what format, is not confirmed. The row is still one upload, so someone with three separate files has no way to add them as three; the real product would need to take several files. Someone who has never processed cards is not asked, because they have no statements to give.",
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
      "id": "pci-hints-trimmed",
      "area": "Step 5",
      "where": "Step 5 · Card data security",
      "t": "Two lines of PCI helper text removed",
      "b": "The PCI question’s hint no longer ends “Not sure? Choose Unsure and carry on.”, and the SAQ hint no longer opens “Only needed if you also take cards outside Xplor Pay.” The Unsure option stays on the question and the SAQ fields stay optional.",
      "tradeoff": "An applicant who is not sure has to notice the Unsure choice for themselves, and the SAQ hint now only says what to do if you use Xplor Pay alone, not who the fields are for.",
      "by": "Ryan",
      "when": "2026-10-07"
    },
    {
      "id": "autosave-tell",
      "area": "Flow",
      "where": "Left progress column · footer",
      "t": "Progress saves after every field, and the flow now says so in two places",
      "b": "Ops confirmed the real build autosaves on every field entry, with no action needed to keep it. The footer button, previously “Save and finish later”, is renamed “Finish later” since it no longer describes a save action. The “N steps to go” line in the left progress column is replaced with a live Saved / Saving… tell (check icon when saved, a small spinner while saving, text only, no badge background) that switches to “Saving…” for about a second whenever an edit is committed (a field is left with a new value, or a checkbox, radio or select changes) and then returns to “Saved”, since a real save may take around a second, so the applicant has a constant, always-visible answer to “is this saved” without opening the save dialog. “Saved” stays green; “Saving…” is the same neutral grey as the rest of the line. The “About N minutes left” estimate stays, vertically centered with the tell, with a “·” between them as before.",
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
      "id": "terminal-none",
      "area": "Flow",
      "where": "Business activity",
      "t": "Terminal list ends with “None”, not “None yet”",
      "b": "The last option in the POS / terminal list is “None” instead of “None yet”, which read as an admission to someone who simply does not want a reader.",
      "tradeoff": "“None” loses the hint that a reader can be added later.",
      "by": "Ryan",
      "when": "2026-10-12"
    },
    {
      "id": "signatory-title-fallback",
      "area": "Flow",
      "where": "Step 7 · Sign it off",
      "t": "Signatory title fills from the first owner even when added with the plain button",
      "b": "The step 7 signatory title now fills from the first owner's title when no owner is marked as the applicant, the same way the signatory name already follows the first owner. An owner added with the plain “Add an owner or director” button therefore carries their title (“Director” until edited) into step 7 instead of leaving the field empty; “Add myself” is unchanged and still gives “Owner / CEO”.",
      "tradeoff": "The default “Director” is a placeholder, not a fact: a signer who is the owner must still change it, and it is now prefilled where before it forced a deliberate entry. The field stays editable and required.",
      "by": "Ryan",
      "when": "2026-10-12"
    },
    {
      "id": "final-step-focus",
      "area": "Flow",
      "where": "Step 7 · Review and sign",
      "t": "Final step drops the rates tick and collapses “What happens next”",
      "b": "Rates and the fee schedule are already agreed before this flow starts, so the final step no longer asks for an “I accept the rates and fee schedule” tick. “What happens next” below the signature is now a collapsed bar that opens on click, so nothing competes with signing, which is the one action that matters on this step.",
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
      "id": "jumpbar-fixed-bottom",
      "area": "Status",
      "where": "Submitted · Under review · Approved",
      "t": "The \"Prototype · jump to\" bar is pinned to the bottom of the window, not sat in the page content",
      "b": "It was a card in the normal content flow, same as the real status cards above it, which blurred the line between the applicant's page and the tool for jumping between demo states. It's now a full-width bar fixed to the bottom of the viewport, separated from the content with a top border and shadow, so it reads as scaffolding around the prototype rather than part of it.",
      "tradeoff": "It now overlaps the page on short viewports instead of pushing content up; the status screens' bottom padding was increased to keep the last card clear of it, but a very small window could still see overlap.",
      "by": "Ryan",
      "when": "2026-10-08"
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
      "id": "segmented-track-fill",
      "area": "Flow",
      "where": "Yes / No answers",
      "t": "The Yes / No track uses Atlas's own segmented-control fill, one step darker than before",
      "b": "The track behind a Yes / No pair was the sunken surface colour (nearly the same as the page). Atlas 0049 gave the Segmented control its own track fill (neutral/100, #F4F4F7), so the prototype now reads `--component-segmented-control-background`, and the track is easier to tell from the page and from the raised, selected segment. Nothing else about the control changes.",
      "tradeoff": "The track is still only about 1.1:1 against the page, so the control is identified by its shape and the raised selected segment, not by the track alone. Atlas accepts this and says so in 0049.",
      "by": "Ryan",
      "when": "2026-10-13"
    }
  ];

  /* DECISIONS:END */

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
    sigSame: "", structure: "", incorporated: "", legalName: "", dba: "", stateInc: "",
    website: "", phone: "", email: "", description: "", regAddress: "",
    tradingSame: "", tradingAddress: "",
    monthlyVolume: "", avgTicket: "", maxTicket: "", cpSplit: "",
    channel: "", goods: "", recurring: "", trial: "", marketplace: "",
    international: "", countries: "", refundPolicy: "",
    prior: "", priorName: "", priorCbRatio: "",
    achVolume: "", descriptor: "", posType: "",
    // Comes from the Xplor account rather than being typed, so it's filled in
    // even on an empty run — the hint on the field says as much.
    platform: "Xplor Studio",
    velocityAck: false,
    bankName: "", accountHolder: "", accountType: "", routing: "", accountNumber: "",
    institution: "", transit: "",
    legalProceedings: "", legalProceedingsWhy: "", priorTermination: "", priorTerminationWhy: "",
    taxLiens: "", taxLiensWhy: "", msb: "",
    pci: "", saq: "", pciDate: "",
    matchConsent: false, ofacAck: false,
    acceptAgreement: false, acceptPrivacy: false, acceptEsign: false,
    signAuthority: false
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
    description: "Reformer pilates classes, 10-class passes and monthly memberships, sold in studio and through our website.",
    regAddress: "418 SE Water Ave, Suite 210, Portland, OR 97214",
    tradingSame: "yes",
    monthlyVolume: "42,000", avgTicket: "38", maxTicket: "1,200", cpSplit: "70",
    channel: "In-person and online", goods: "Services and subscriptions",
    recurring: "yes", trial: "no", marketplace: "no", international: "no",
    refundPolicy: "riversidepilates.com/refunds",
    prior: "no",
    descriptor: "RIVERSIDE PILATES",
    posType: "Xplor Pay countertop terminal",
    velocityAck: true,
    bankName: "Umpqua Bank", accountHolder: "Riverside Pilates LLC",
    accountType: "Business checking", routing: "323075880",
    accountNumber: "1234 5678 4417", institution: "003", transit: "00172",
    legalProceedings: "no", priorTermination: "no", taxLiens: "no", msb: "no",
    pci: "yes", saq: "SAQ A (payments fully outsourced)", pciDate: "02 / 03 / 2026",
    matchConsent: true, ofacAck: true
  });

  // What the registry lookup on step 1 fills in. On an empty run this is the
  // moment the form stops being blank, which is the whole reason the number is
  // asked for first — so it has to actually happen, not be pre-baked.
  const REGISTRY_RESULT = {
    legalName: "Riverside Pilates LLC",
    dba: "Riverside Pilates",
    structure: "Limited liability company (LLC)",
    incorporated: "03 / 12 / 2019",
    stateInc: "Oregon",
    regAddress: "418 SE Water Ave, Suite 210, Portland, OR 97214"
  };

  // Business category is a merchant category code (MCC). The list lives in mcc-codes.js and is searched in the
  // picker; what the applicant writes in the description suggests one. The first pattern that
  // matches is suggested, and no match suggests nothing. This is a keyword guess standing in
  // for a real classifier.
  const MCC_LIST = String(window.MCC_CODES || "").split("\n").filter(Boolean).map((l) => { const p = l.split("\t"); return { code: p[0], name: p[1], label: p[0] + " · " + p[1], hay: (p[0] + " " + p[1]).toLowerCase() }; });
  const CATEGORY_GUESSES = [
    { code: "8661", re: /church|chapel|worship|temple|mosque|synagogue/i },
    { code: "8398", re: /charit|donat|non-?profit|pantry|food bank|fundrais|volunteer|community/i },
    { code: "7221", re: /photo/i },
    { code: "7829", re: /video|film/i },
    { code: "7333", re: /design|illustrat|artist/i },
    { code: "7338", re: /print/i },
    { code: "7997", re: /pilates|yoga|gym|fitness/i },
    { code: "7911", re: /dance|ballet/i },
    { code: "7997", re: /sport|membership|club/i },
    { code: "5462", re: /bak(e|ery|ing)|cake|cupcake|pastr|confection|chocolate/i },
    { code: "5811", re: /catering|caterer/i },
    { code: "5812", re: /cafe|coffee|restaurant|takeaway|food truck/i },
    { code: "8931", re: /account|tax|bookkeep/i },
    { code: "8111", re: /legal|\blaw/i },
    { code: "7392", re: /consult|advis/i },
    { code: "1711", re: /plumb|heating|air.?condition/i },
    { code: "1731", re: /electric/i },
    { code: "7349", re: /clean|janitor/i },
    { code: "0780", re: /garden|landscap|lawn/i },
    { code: "7538", re: /mechanic|auto repair|car repair/i },
    { code: "7699", re: /repair/i },
    { code: "5999", re: /retail|shop|store|\bsell|merch/i }
  ];
  const mccByCode = (code) => MCC_LIST.filter((x) => x.code === code)[0];
  const suggestCategory = (text) => { const hit = CATEGORY_GUESSES.filter((c) => c.re.test(text || ""))[0]; const e = hit && mccByCode(hit.code); return e ? e.label : ""; };
  // Every word typed must appear in the code or title, so "bake" and "5461" both find bakeries.
  // Retail and service codes (5000s, 7000s, 8000s) are listed ahead of contractors, transport and wholesale, since that is what most applicants run.
  const mccRank = (x) => (/^[578]/.test(x.code) ? 0 : 1);
  const searchMcc = (q) => { const t = String(q || "").toLowerCase().split(/\s+/).filter(Boolean); const hits = t.length ? MCC_LIST.filter((x) => t.every((w) => x.hay.indexOf(w) > -1)) : MCC_LIST; return hits.filter((x) => mccRank(x) === 0).concat(hits.filter((x) => mccRank(x) === 1)); };

  // A returning visitor to the emailed link gets a saved business back, so that visit borrows the sample one.
  let restored = false;
  const isSample = () => ctx.data === "Sample business" || restored;
  const isSole = () => state.bizType === "individual";
  const isNonprofit = () => state.bizType === "non-profit";
  // "organization" for a non-profit, "business" for everyone else, for copy that names what is applying.
  const orgWord = () => (isNonprofit() ? "organization" : "business");
  // Step names: a non-profit has no owners and is not a business.
  const stepName = (s) => (isNonprofit() ? { 1: "Organization & address", 2: "Leaders & signatory" }[s.n] || s.label : s.label);
  const isCompany = () => !isSole() && !isNonprofit();

  function freshOwners() {
    return isSample()
      ? [
          { id: 1, name: "Dana Whitfield", initials: "DW", pct: 60, role: "Owner / CEO", status: "pending", self: true },
          { id: 2, name: "Marcus Lee", initials: "ML", pct: 30, role: "Director", status: "pending", self: false }
        ]
      : [];
  }

  // Every prototype starts at the "Check it's you" code screen, whatever state the link is in.
  function startScreen() { return "entry"; }
  function entryModeFor() { return ctx.link === LINKS.expired ? "expired" : ctx.link === LINKS.closed ? "closed" : "send"; }

  function freshState() {
    const sample = isSample();
    return {
      screen: startScreen(),
      step: 1,
      // The "Check it's you" screen: which state it is in, the code typed, any message, and wrong tries so far.
      entryMode: entryModeFor(),
      entryCode: "",
      entryErr: "",
      entryTries: 0,
      // The sample business is for demoing the later screens, so step 1 is
      // already looked up rather than making you press the button first.
      // Which kind of business the applicant is, chosen on the page after the welcome screen.
      // The sample business is a company, so its later screens stay as designed.
      bizType: sample ? "company" : "",
      noEin: false,
      // After a lookup: has the applicant said the match is theirs, said it is not, or chosen to type details themselves.
      lookupConfirmed: sample,
      lookupRejected: false,
      manualBiz: false,
      // The green success toast in the top-right corner: { id, text } or null.
      toast: null,
      // The searchable category picker: which field is open, what has been typed, and the highlighted row.
      comboOpen: "",
      comboQuery: "",
      comboIdx: 0,
      einFound: sample,
      lookupId: sample ? "93-4417208" : "",
      openOwner: 1,
      openCards: {},
      revealed: {},
      owners: freshOwners(),
      docs: {},
      // Steps where "Save and continue" has been pressed, so errors only appear after an attempt.
      tried: {},
      // Fields the applicant has been in and left. Their problems show straight away; the rest wait for a press of Save and continue.
      touched: {},
      lookupErr: "",
      lookupBlurErr: "",
      viewed: {},
      // True while someone is fixing one section from the final review. Progress
      // stays where it was and the footer collapses to a single Save.
      editing: false,
      sign: "",
      w9Name: "",
      w9Certify: false,
      w9Err: "",
      submittedAt: "",
      saveEmailErr: "",
      saveEmail: sample ? "finance@riversidepilates.com" : "",

      a: Object.assign({}, sample ? SAMPLE_ANSWERS : EMPTY_ANSWERS)
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
    nextTip: false,
    editMasked: "",
    viewDoc: "",
    delegateOpen: false,
    delegateTarget: 0,
    delegateEmail: "",
    delegateErr: "",
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
  const set = (id, v) => setState((s) => ({ a: Object.assign({}, s.a, { [id]: v }) }));
  const go = (screen, step) => setState({ screen, step: step || state.step, saveOpen: false });

  // "Check it's you" (decision 90). Nothing is emailed: any six digits open the link, except 000000, which is refused so the
  // wrong-code and too-many-tries states can be seen. Three wrong codes pause the link.
  const MASKED_EMAIL = "d•••@riversidepilates.example";
  const sendCode = (again) => { setState({ entryMode: "code", entryCode: "", entryErr: "", entryTries: 0 }); showToast(again ? "New code sent" : "Code sent"); };
  function submitCode() {
    const digits = state.entryCode.replace(/\D/g, "");
    if (digits.length !== 6) { setState({ entryErr: "Enter the 6-digit code from the email." }); return; }
    if (digits === "000000") {
      const tries = state.entryTries + 1;
      setState(tries >= 3 ? { entryMode: "locked", entryTries: tries, entryErr: "" } : { entryTries: tries, entryErr: "That code didn't work. Check the email and try again." });
      return;
    }
    openLink();
  }
  // Where the link lands once the code is right (decision 91): the welcome page for someone new, otherwise wherever the
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
    const screen = ctx.link === LINKS.info ? "rfi" : ctx.link === LINKS.approved ? "approved" : "submitted";
    setState({ screen, submittedAt: "9:12 AM" });
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
    // Wait for the render, then bring the first problem into view.
    setTimeout(() => {
      const first = document.querySelector("[data-error]");
      if (!first) return;
      first.scrollIntoView({ block: "center", behavior: "smooth" });
      const ctl = first.querySelector("input:not([type=hidden]), select, textarea, button.yn-btn");
      if (ctl) ctl.focus({ preventScroll: true });
    }, 60);
  }
  const next = () => attempt(() => (state.step >= 7 ? setState({ screen: "submitted", submittedAt: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) }) : setState({ step: state.step + 1 })));
  const editFromReview = (step) => setState({ step, editing: true, saveOpen: false });
  const saveEdit = () => attempt(() => setState({ step: 7, editing: false }));
  const back = () => (state.step <= 1 ? setState({ screen: "bizType" }) : setState({ step: state.step - 1 }));

  const BIZ_TYPES = [
    { id: "company", label: "Company", desc: "A registered business with legal entity status, such as an LLC, corporation or partnership." },
    { id: "individual", label: "Individual / Sole proprietor", desc: "You are the sole owner of an unincorporated business." },
    { id: "non-profit", label: "Non-profit organization", desc: "Charitable organizations, foundations and non-governmental organizations." }
  ];
  // Changing your mind wipes what was entered for the old type, so nothing that
  // doesn't apply to the new one is left behind.
  function chooseBizType(t) {
    if (state.bizType === t) return;
    if (state.bizType) resetData();
    setState({
      screen: "bizType",
      bizType: t,
      // Only a sole proprietor starts with a person listed (themselves). Everyone else adds the owners, since the applicant is often not one.
      owners: t === "individual" ? [{ id: 1, name: "You", initials: "?", pct: 100, role: "Owner", status: "pending", self: true }] : state.owners,
      a: Object.assign({}, state.a, t === "individual" ? { structure: "Sole proprietor" } : t === "non-profit" ? { structure: "Non-profit" } : {})
    });
  }
  const openHelp = () => setState({ helpOpen: true });
  const closeHelp = () => setState({ helpOpen: false });
  const openSave = () => setState({ saveOpen: true });
  // An owner can be sent a link to fill in their own details (decision 69). A sent owner needs only a name and share from the applicant.
  const nowTime = () => new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const openDelegate = (target) => { const o = state.owners.filter((x) => x.id === target)[0]; setState({ delegateOpen: true, delegateTarget: target, delegateEmail: (o && o.inviteEmail) || "", delegateErr: "" }); };
  const closeDelegate = () => setState({ delegateOpen: false });
  // Simulated email: nothing is sent. The real product emails a link scoped to this person's own details and this address.
  function sendDelegate() {
    const email = state.delegateEmail.trim();
    if (!SAVE_EMAIL_OK.test(email)) { setState({ delegateErr: "Enter an email like name@example.com." }); return; }
    setState({ delegateOpen: false, openOwner: state.openOwner === state.delegateTarget ? 0 : state.openOwner, owners: state.owners.map((x) => (x.id === state.delegateTarget ? Object.assign({}, x, { status: "invited", inviteEmail: email }) : x)) });
    showToast("Link sent to " + email + ". You can carry on with the rest in the meantime.");
  }
  // Deleting an owner also drops what was typed into their card and any ID file.
  function removeOwner(id) {
    const o = state.owners.filter((x) => x.id === id)[0];
    if (!o) return;
    const name = ownerInfo(o).name;
    const a = Object.assign({}, state.a);
    Object.keys(a).forEach((k) => { if (k.indexOf("o" + id + "_") === 0) delete a[k]; });
    const docs = Object.assign({}, state.docs); delete docs["id_" + id];
    setState({ owners: state.owners.filter((x) => x.id !== id), a: a, docs: docs, openOwner: state.openOwner === id ? 0 : state.openOwner });
    showToast("Removed " + name + ".");
  }
  // What the person who gets the link sees. Prototype only: the real page is the recipient's own session.
  const previewInvitee = (id) => setState({ screen: "invitee", inviteStep: 0, inviteOwner: id, openOwner: id, returnTo: { screen: state.screen, step: state.step } });
  const leaveInvitee = () => { const r = state.returnTo || { screen: "flow", step: 2 }; setState({ screen: r.screen, step: r.step, returnTo: null }); };
  const finishInvitee = () => setState({ inviteStep: 2, owners: state.owners.map((x) => (x.id === state.inviteOwner ? Object.assign({}, x, { status: "received", receivedAt: nowTime() }) : x)) });
  const closeSave = () => setState({ saveOpen: false });
  const toggleReveal = (id) => setState((s) => ({ revealed: Object.assign({}, s.revealed, { [id]: !s.revealed[id] }) }));
  function cardOpen(key, dflt) {
    const v = state.openCards[key];
    return v === undefined ? dflt : v;
  }
  const toggleCard = (key, dflt) => setState((s) => ({
    openCards: Object.assign({}, s.openCards, { [key]: !(s.openCards[key] === undefined ? dflt : s.openCards[key]) })
  }));
  const doc = (key) => state.docs[key] || { state: "idle", file: "", read: "" };
  const setDoc = (key, st, file, read) => setState((s) => ({
    docs: Object.assign({}, s.docs, { [key]: { state: st, file: file || "", read: read || "" } })
  }));
  // Simulated upload: no file picker opens and no file is read.
  function upload(key, file, read) {
    setDoc(key, "uploading");
    setTimeout(() => setDoc(key, "reading"), 900);
    setTimeout(() => setDoc(key, "done", file, read), 2000);
  }

  // ---------------------------------------------------------------------------
  // Owners
  // ---------------------------------------------------------------------------

  const OWNER_SEED = {
    self: { name: "Dana R. Whitfield", dob: "04 / 11 / 1986", home: "92 NE Bryce St, Portland, OR 97212", email: "dana@riversidepilates.com", phone: "+1 (503) 555-0148" },
    other: { name: "Marcus J. Lee", dob: "09 / 10 / 1979", home: "1408 SE Belmont St, Portland, OR 97214", email: "marcus@riversidepilates.com", phone: "+1 (503) 555-0192" }
  };
  const US_STATES = ["Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "District of Columbia", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"];
  const COUNTRIES = ["United States", "Canada", "United Kingdom", "Australia", "Other"];
  // Date order follows the region, so the placeholder is the instruction.
  const datePh = () => (isCa() ? "DD / MM / YYYY" : "MM / DD / YYYY");
  const addressPh = () => (isCa() ? "Street, city, province, postal code" : "Street, city, state, ZIP");

  // Dates are typed as digits and laid out as they go in, in the region's order, so the slashes are never the applicant's job.
  // "3/5/1990" is read as 03 / 05 / 1990 rather than as digits 351990.
  const DATE_KEYS = ["dob", "idExpiry", "incorporated", "pciDate"];
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
  // Step 1's lookup. On an empty run this is what turns a blank form into a
  // filled one, so it writes the registry result into the answers rather than
  // just revealing values that were already sitting there.
  // 18000 -> 18,000; leaves anything that is not a plain number alone.
  const fmtMoney = (s) => { const n = String(s).replace(/,/g, ""); return /^\d+(\.\d+)?$/.test(n) ? Number(n).toLocaleString("en-US") : String(s); };
  const digitsOf = (s) => String(s == null ? "" : s).replace(/\D/g, "");

  // What is wrong with a registry number, or "" if it is fine. Shared by the Look up button and by leaving the box.
  function lookupProblem(value) {
    // A registry number is nine digits, so a short or long one is caught here rather than "matching" something else.
    if (/^\s*\d{3}[- ]\d{2}[- ]\d{4}\s*$/.test(value)) {
      return "That looks like a Social Security number, which we don't need here. " + (isCa() ? "A business number" : "An EIN") + " looks like " + (isCa() ? "123456789" : "12-3456789") + ". Not sure whether you have one? Use Get help and we'll talk it through.";
    }
    if (digitsOf(value).length !== 9) {
      return "Enter all 9 digits of your " + (isCa() ? "business number" : "EIN") + ", for example " + (isCa() ? "123456789" : "12-3456789") + ". You've entered " + digitsOf(value).length + ".";
    }
    return "";
  }
  function runLookup() {
    const problem = lookupProblem(state.lookupId);
    if (problem) { setState({ lookupErr: problem }); return; }
    // A sole trader's number confirms the EIN only; there is no registry record of a company to fill in.
    const filled = isSole() ? { structure: "Sole proprietor" } : isNonprofit() ? Object.assign({}, REGISTRY_RESULT, { structure: "Non-profit" }) : REGISTRY_RESULT;
    setState((s) => ({ lookupErr: "", noEin: false, einFound: true, lookupConfirmed: isSole(), lookupRejected: false, manualBiz: false, a: Object.assign({}, s.a, filled) }));
    showToast(lookupResultText(state));
  }
  const lookupResultText = (st) => isSole() ? "Noted: your " + (isCa() ? "business number" : "EIN") + " ending " + (digitsOf(st.lookupId).slice(-4) || "—") + ". There's no registry record to fill in for you, so check the details below." : isCa() ? "Found: Riverside Pilates Inc. · BN 123456789 RC0001 · active" : "Found: Riverside Pilates LLC · EIN ending " + (digitsOf(st.lookupId).slice(-4) || "7208") + " · active in Oregon since 2019";

  // "Is this your business?" A lookup can return the wrong record, so the applicant
  // confirms it, or says it is not theirs and the filled-in details are cleared.
  const confirmLookup = () => setState({ lookupConfirmed: true });
  function rejectLookup() {
    setState((s) => ({
      einFound: false, lookupConfirmed: false, lookupRejected: true, manualBiz: true, lookupErr: "",
      a: Object.assign({}, s.a, { legalName: "", dba: "", incorporated: "", stateInc: "", regAddress: "", structure: isNonprofit() ? "Non-profit" : "" })
    }));
    showToast("Thanks for telling us. We've cleared those details. Fill them in yourself, or look up a different number above. If you type them in, we'll ask for a registration document at step 6.");
  }
  // Skips the lookup. If a match was already filled in, it is cleared so nothing from the wrong record lingers.
  function enterManually() {
    // A number that was refused (an SSN typed into the EIN box, say) goes with its message, so nothing contradicts the confirmation.
    setState(lookupProblem(state.lookupId) ? { lookupId: "", lookupErr: "", lookupBlurErr: "" } : { lookupBlurErr: "" });
    setState((s) => ({
      manualBiz: true, einFound: false, lookupConfirmed: false, lookupRejected: false, noEin: isSole(), lookupErr: "",
      a: s.einFound ? Object.assign({}, s.a, { legalName: "", dba: "", incorporated: "", stateInc: "", regAddress: "", structure: isNonprofit() ? "Non-profit" : "" }) : s.a
    }));
    // A sole proprietor with no number to look up gives their SSN/SIN at step 2 instead, so this is also the "I don't have one" route.
    showToast(isSole() ? "No problem. You'll give us your " + (isCa() ? "SIN" : "SSN") + " at step 2 instead, so there's no " + (isCa() ? "business number" : "EIN") + " letter to find." : "No problem. Fill in the details below. We'll ask for a registration document at step 6 so we can check them.");
  }
  // The rest of step 1 stays out of sight until there is something to put in it.
  const step1Open = () => state.manualBiz || (isSole() && state.noEin) || state.einFound;
  // True while the registry-filled details are exactly as the lookup returned them.
  const registryUntouched = () => state.a.legalName === REGISTRY_RESULT.legalName && state.a.regAddress === REGISTRY_RESULT.regAddress && (isCa() || state.a.stateInc === REGISTRY_RESULT.stateInc);

  // ---------------------------------------------------------------------------
  // Validation. Pure reads of state: returns { fieldId: message } for a step.
  // Format checks are deliberately lenient (digits only, no checksums) because
  // this is a prototype, but they catch the slips a real person makes.
  // Values are only ever read, never written into markup; html`` escapes them.
  // ---------------------------------------------------------------------------

  function fieldError(f) {
    if (!f.required) return "";
    const v = f.value;
    if (f.kind === "check") return v === true ? "" : "Tick this to continue.";
    if (f.kind === "yn") return v ? "" : "Choose yes or no.";
    if (f.kind === "select") return v ? "" : "Choose one.";
    if (f.kind === "combo") return v ? "" : "Choose the closest business category.";
    if (f.kind === "masked" && String(v).indexOf("•") > -1) return "";
    if (!String(v).trim()) return "This is needed to continue.";
    const key = f.id.replace(/^o\d+_/, "");
    const d = digitsOf(v);
    const ca = isCa();
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
    }
    if (f.kind === "currency" && !(parseFloat(String(v).replace(/,/g, "")) > 0)) return "Enter an amount greater than zero.";
    // The biggest single sale cannot be smaller than the average one. Only checked once both amounts are in.
    if (f.id === "maxTicket") {
      const avg = parseFloat(String(state.a.avgTicket || "").replace(/,/g, ""));
      if (avg > 0 && parseFloat(String(v).replace(/,/g, "")) < avg) return "Your biggest single sale can't be smaller than your average of $" + fmtMoney(state.a.avgTicket) + ".";
    }
    return "";
  }

  function stepErrors(step) {
    const errs = {};
    const add = (f) => { if (f) { const m = fieldError(f); if (m) errs[f.id] = m; } };
    const a = state.a;
    const owners = state.owners.map((o) => Object.assign({}, o, ownerInfo(o)));

    if (step === 1 && state.einFound && !state.lookupConfirmed) errs.lookup = "Tell us whether this is your " + (isNonprofit() ? "organization" : "business") + ", or look the number up again.";
    if (step === 1 && !state.einFound && !state.manualBiz && !(isSole() && state.noEin)) errs.lookup = isSole() ? "Look up your " + (isCa() ? "business number" : "EIN") + ", or choose “Enter details manually”." : "Look up your " + (isCa() ? "business number" : "EIN") + " first and we'll fill in the rest.";
    if (step === 2 && state.screen === "invitee") {
      // The recipient fills in their own whole card.
      state.owners.filter((o) => o.id === state.inviteOwner).forEach((o) => ownerFields(o).forEach(add));
    } else if (step === 2) {
      // Every owner has to be added. A pending owner needs everything; one who has been sent a link needs nothing from the applicant.
      state.owners.forEach((o) => { if (o.status === "pending") ownerFields(o).forEach(add); });
      const total = owners.reduce((x, o) => x + o.pct, 0);
      if (!owners.length) errs.owners = "Add the " + (isNonprofit() ? "people who run the organization" : "owners") + " before you continue.";
      else if (!isCompany()) { /* ownership percentages only apply to companies */ }
      else if (total > 100) errs.ownership = "Ownership comes to more than 100%. Check each owner's percentage.";
      else if (total <= 75 && !state.owners.some((o) => o.status === "invited")) errs.ownership = "The owners listed come to " + fmtPct(total) + "%. Add everyone who owns 25% or more.";
    }
    if (step === 6 || step === 7) {
      docListFor(owners, isCa()).forEach((d) => {
        if (!d.skip && d.requirement === "Required" && doc(d.key).state !== "done") errs["doc_" + d.key] = "Add this file to continue.";
      });
    }
    if (step === 7) {
      cardsFor(7).forEach((c) => c && c.fields.forEach(add));
      const signatory = (a.signatoryName !== undefined ? a.signatoryName : (a.sigSame === "no" ? (a.sigName || "") : (ownerVal(state.owners[0] || {}, "name") || ""))).trim();
      const title = a.signatoryTitle !== undefined ? a.signatoryTitle : (a.sigSame === "no" ? (a.sigTitle || "") : (((owners.filter((o) => o.self)[0] || state.owners[0]) || {}).role || ""));
      if (!signatory) errs.signatoryName = "Enter the signatory's full legal name.";
      if (!String(title).trim()) errs.signatoryTitle = "Enter the signatory's title.";
      if (!state.sign.trim()) errs.sign = "Type your full legal name to sign.";
      else if (signatory && state.sign.trim().replace(/\s+/g, " ").toLowerCase() !== signatory.replace(/\s+/g, " ").toLowerCase()) errs.sign = "This needs to match the signatory name above.";
    } else {
      cardsFor(step).forEach((c) => c && c.fields.forEach(add));
    }
    return errs;
  }

  // Errors on show for the current step. Empty until the first attempt, then
  // live, so each message clears the moment its field is put right.
  let ERR = {};
  const errView = (key) => ERR[key] && html`<p class="field-error" role="alert">${ERR[key]}</p>`;

  function ownerDefaults(o) {
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
    const p = o.self ? OWNER_SEED.self : OWNER_SEED.other;
    return Object.assign(base, {
      nationality: "United States", residence: "United States",
      idType: "Driver's license", idCountry: "United States",
      name: p.name, dob: p.dob, home: p.home, email: p.email, phone: p.phone,
      idNumber: "OR4471208", idExpiry: "04 / 11 / 2029", pep: "no",
      natId: isCa() ? "••• ••• 418" : "412-88-7193"
    });
  }
  function ownerVal(o, key) {
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
    return asked.every((v) => v === "no") ? "Nothing to declare" : "Declarations made";
  }

  // ---------------------------------------------------------------------------
  // Field + card models
  // ---------------------------------------------------------------------------

  function fld(id, label, kind, o) {
    o = o || {};
    const raw = state.a[id];
    return {
      id, label, kind,
      value: raw !== undefined ? raw : (o.dflt !== undefined ? o.dflt : ""),
      span: !!o.span,
      unsure: !!o.unsure,
      // No "Optional" tag: a field without the red asterisk is optional (decision 96).
      chip: "",
      // Only Optional fields are tagged. A field that appears because of an earlier answer (conditional) is required like any other, since it is only shown when it applies.
      required: !o.optional,
      hint: o.hint || "",
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
      sub("about", "About them"),
      f("name", "Full legal name", "text", { span: true, placeholder: "As printed on their ID", hint: "Exactly as it appears on the ID you'll upload." }),
      isSole() ? null : f("role", "Title / role", "select", { placeholder: "Choose a role", options: isNonprofit() ? ["Director", "Trustee", "Executive director", "Officer"] : ["Owner / CEO", "Director", "Managing partner", "Company secretary", "Officer"] }),
      isCompany() ? f("pct", "Ownership percentage", "mono", { placeholder: "e.g. 60" }) : null,
      f("dob", "Date of birth", "mono", { placeholder: datePh() }),
      f("nationality", "Nationality", "select", { placeholder: "Choose a country", options: COUNTRIES }),
      f("residence", "Country of residence", "select", { placeholder: "Choose a country", options: COUNTRIES }),
      f("home", "Home address", "text", { span: true, placeholder: addressPh() }),
      f("email", "Email address", "text", { placeholder: "name@example.com" }),
      f("phone", "Phone number", "text", { placeholder: "+1 (555) 000-0000" }),
      sub("id", "Their ID"),
      f("idType", "Government ID type", "select", { placeholder: "Choose an ID type", options: ["Driver's license", "Passport", "National ID card"] }),
      f("idNumber", "Government ID number", "masked", { sensitive: true, placeholder: "As shown on the document", hint: "Why we ask: we match this to the photo of your ID in step 6 to confirm who you are. It goes to Trullio, our verification partner." }),
      f("idExpiry", "ID expiry date", "mono", { placeholder: datePh() }),
      f("idCountry", "ID issuing country", "select", { placeholder: "Choose a country", options: COUNTRIES }),
      f("natId", ca ? "Social Insurance Number (SIN)" : "Social Security Number (SSN)", "masked", {
        sensitive: true,
        placeholder: ca ? "000 000 000" : "000-00-0000",
        hint: (ca ? "Why we ask: anti-money-laundering rules mean we have to confirm who owns and runs the " + orgWord() + ". Sent straight to Trullio, our verification partner. Never stored on Xplor systems." : "Why we ask: anti-money-laundering rules mean we have to confirm who owns and runs the " + orgWord() + ". ITIN is fine if you're a US tax resident without an SSN. Sent straight to Trullio, our verification partner, and never stored by Xplor.")
      }),
      sub("screen", "Screening"),
      f("pep", "Is this person a politically exposed person?", "yn", {
        span: true,
        hint: "A PEP holds, or has held, a senior public role: head of state, senior official, judge, senior military. Answering yes doesn't disqualify you, it just adds one extra screening step."
      })
    ];
  }

  function cardsFor(step) {
    const a = state.a;
    const ca = isCa();
    if (step === 1) {
      if (!step1Open()) return [];
      return [
        (state.einFound || state.manualBiz || (isSole() && state.noEin)) && card("s1-reg", isSole() ? "Your details" : "Registered details", isSole() ? "Check these and change anything that isn't right." : (state.einFound ? "Straight from the registry. Change anything that isn't right." : "Enter these as they appear on your registration."), [
          fld("legalName", isSole() ? "Your full legal name" : "Legal " + orgWord() + " name", "text", { span: true, placeholder: isSole() ? "As it appears on your tax records" : isNonprofit() ? "e.g. Riverside Community Foundation" : "e.g. Riverside Pilates LLC", hint: isSole() ? "" : "This needs to match your government registration exactly." }),
          fld("dba", isSole() ? "Trading name" : "Doing business as (DBA)", "text", { optional: true, placeholder: isSole() ? "If you trade under a different name" : "e.g. Riverside Pilates" }),
          isCompany() ? fld("structure", "Business type / legal structure", "select", { placeholder: "Choose a structure", options: ["Partnership", "Limited liability company (LLC)", "Corporation"] }) : null,
          isSole() ? null : fld("incorporated", isNonprofit() ? "Date registered" : "Date of incorporation", "mono", { placeholder: datePh() }),
          ca || isSole() ? null : fld("stateInc", isNonprofit() ? "State registered in" : "State of incorporation", "select", { placeholder: "Choose a state", options: US_STATES })
        ], { assurance: isSole() || !state.einFound || !state.lookupConfirmed ? "" : registryUntouched() ? "Matched against " + (ca ? "CRA and provincial registry records" : "IRS and Oregon Secretary of State records") : "You've changed some of the registry details, so we'll check your documents against what you've entered." }),
        card("s1-addr", "Addresses", "", [
          fld("regAddress", isSole() ? "Business address" : "Registered / legal address", "text", { span: true, placeholder: addressPh(), hint: isSole() ? "Where your business is based. If you work from home, this can be your home address." : "This needs to match your government registration." }),
          fld("tradingSame", "Is that also where you operate?", "yn", { span: true }),
          a.tradingSame === "no" ? fld("tradingAddress", "Trading / physical address", "text", { span: true, conditional: true, placeholder: addressPh(), hint: "Where you actually trade. We use it for your statement descriptor and to send any card machines." }) : null
        ]),
        card("s1-contact", "How we reach you", isNonprofit() ? "For account notices and questions from the people paying you. We won't add you to any marketing." : "For account notices and customer queries. We won't add you to any marketing.", [
          fld("phone", isNonprofit() ? "Organization phone number" : "Business phone number", "text", { placeholder: "+1 (555) 000-0000" }),
          fld("email", isNonprofit() ? "Organization email address" : "Business email address", "text", { placeholder: isNonprofit() ? "hello@yourorganization.org" : "hello@yourbusiness.com" }),
          fld("website", "Primary website URL", "text", { span: true, optional: true, placeholder: isNonprofit() ? "yourorganization.org" : "yourbusiness.com", hint: "We take a look at the site to check " + (isNonprofit() ? "what you do" : "what you sell") + ". A live one speeds things up a lot. Leave it blank if you don't have one." })
        ]),
        card("s1-desc", isNonprofit() ? "What the organization does" : "What the business sells", "", [
          fld("description", isNonprofit() ? "Organization description" : "Business description", "long", { span: true, optional: true, placeholder: isNonprofit() ? "In plain language, what people are paying or giving for, such as donations, tickets or memberships." : "In plain language, what a customer is paying for.", hint: "In your own words. It helps us pick your " + (isNonprofit() ? "organization's" : "business") + " category below, so you don't have to hunt for a code." })
        , fld("category", "Merchant category code (MCC)", "combo", { span: true, dflt: suggestCategory(a.description), placeholder: "Search by name or code", hint: state.a.category ? "" : suggestCategory(a.description) ? "Our best guess from your description. Change it if it isn't right." : a.description.trim() ? "We couldn't match this from your description. Search the list for the closest one." : "Describe your " + orgWord() + " above and we'll suggest one, or search the list." })
        ], { pinId: "no-mcc-picker" })
      ];
    }
    if (step === 2) {
      // A sole trader is the only owner and signs for themselves, so there is nothing to ask.
      if (isSole()) return [];
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
          fld("monthlyVolume", "Estimated monthly card volume", "currency", { placeholder: "40,000" }),
          fld("avgTicket", "Average transaction amount", "currency", { placeholder: "38" }),
          fld("maxTicket", "Maximum single transaction", "currency", { placeholder: "1,200", hint: isNonprofit() ? "Your biggest single payment or donation, even if it only happens now and then." : "Your biggest single sale, even if it only happens now and then." }),
          fld("cpSplit", "Card present %", "mono", { placeholder: "70", hint: "In person, on a card machine. Online, in-app and phone " + (isNonprofit() ? "payments" : "sales") + " count as the rest." })
        ], { pinId: "underwriting-plain", assurance: "Go over one of these and nothing breaks. We'll just have a quick word before raising your limit." }),
        card("s3-sell", isNonprofit() ? "How you take payments" : "How you sell", "", [
          fld("channel", isNonprofit() ? "Primary payment channel" : "Primary sales channel", "select", { placeholder: "Choose a channel", options: ["In-person", "Online", "In-person and online", "Mobile", "Phone / mail order (MOTO)"] }),
          fld("goods", isNonprofit() ? "What people pay or give for" : "Type of goods or services", "select", { placeholder: "Choose a type", options: isNonprofit() ? ["Donations", "Tickets and events", "Memberships and subscriptions", "Services", "Physical goods", "Mixed"] : ["Services", "Services and subscriptions", "Physical goods", "Digital goods", "Mixed"] }),
          fld("recurring", isNonprofit() ? "Recurring donations or memberships?" : "Recurring billing or subscriptions?", "yn"),
          fld("trial", "Free trial or deferred billing?", "yn"),
          fld("marketplace", isNonprofit() ? "Do you take payments on behalf of other organizations?" : "Do you take payments on behalf of other businesses?", "yn", { span: true, hint: (isNonprofit() ? "Chapters, member groups or fundraisers collecting through you, say." : "Contractors or instructors invoicing through you, say.") + " Saying yes changes who's on the hook, so we have to ask straight out." }),
          fld("international", isNonprofit() ? "Do you take payments from outside " + (ca ? "Canada" : "the US") + "?" : "Do you sell outside " + (ca ? "Canada" : "the US") + "?", "yn"),
          a.international === "yes" ? fld("countries", isNonprofit() ? "Countries payments come from" : "Countries sold to", "text", { conditional: true, placeholder: "e.g. Canada, United Kingdom" }) : null,
          fld("refundPolicy", "Refund / return policy URL", "text", { span: true, optional: true, placeholder: isNonprofit() ? "yourorganization.org/refunds" : "yourbusiness.com/refunds", hint: "A clear policy is your best defence against chargebacks. Leave it blank if you don't have one." })
        ]),
        card("s3-hist", "Processing history", "", [
          fld("prior", "Have you accepted card payments before?", "yn", { span: true }),
          a.prior === "yes" ? fld("priorName", "Prior processor name", "text", { conditional: true, placeholder: "e.g. Square, Stripe" }) : null,
          a.prior === "yes" ? fld("priorCbRatio", "Chargeback ratio at prior processor", "mono", { conditional: true, placeholder: "0.4%" }) : null,
        ]),
        card("s3-payfac", isNonprofit() ? "How you'll appear on statements" : "How you'll appear to customers", "", [
          fld("descriptor", "Billing descriptor", "descriptor", { span: true, hint: "This is what " + (isNonprofit() ? "the people paying you" : "your customers") + " will see on their statement. Use a name they'll recognize — it's the single biggest thing you can do to avoid “I don't know this charge” disputes." }),
          a.cpSplit !== "0" ? fld("posType", "POS / terminal type", "select", { conditional: true, placeholder: "Choose a terminal", options: ["Xplor Pay countertop terminal", "Xplor Pay mobile reader", "Third-party terminal", "None"] }) : null,
          // Only someone arriving from an existing Xplor account has a platform to show; a new applicant would be asked about a product they may not use.
          isSample() ? fld("platform", "Platform", "text", { optional: true, hint: "Already filled in from your Xplor account." }) : null,
          fld("velocityAck", "I've read the daily and monthly transaction limits for my volume tier", "check", { span: true, hint: "$5,000 per transaction and $60,000 per month to start. Ask us any time to raise it." })
        ]),
        ca
          ? card("s3-ach", "Bank transfer volumes", "Only if you'll also take direct debits.", [
              fld("achVolume", "Estimated monthly EFT volume", "currency", { optional: true, placeholder: "10,000" })
            ], { collapsible: true })
          : card("s3-ach", "Bank transfer volumes", "Only if you'll also take ACH payments.", [
              fld("achVolume", "Estimated monthly ACH volume", "currency", { optional: true, placeholder: "10,000" })
            ], { collapsible: true })
      ];
    }
    if (step === 4) {
      const bankFields = ca
        ? [
            fld("bankName", "Bank name", "text", { placeholder: "e.g. RBC Royal Bank" }),
            fld("accountHolder", "Account holder name", "text", { placeholder: "Exactly as it appears on the account", hint: "This needs to match your legal " + (isNonprofit() ? "organization" : "business") + " name." }),
            fld("accountType", "Account type", "select", { placeholder: "Choose an account type", options: ["Business chequing", "Business savings"] }),
            fld("institution", "Institution number", "mono", { placeholder: "3 digits" }),
            fld("transit", "Transit number", "mono", { placeholder: "5 digits" }),
            fld("accountNumber", "Account number", "masked", { sensitive: true, placeholder: "7 to 12 digits" })
          ]
        : [
            fld("bankName", "Bank name", "text", { placeholder: "e.g. Umpqua Bank" }),
            fld("accountHolder", "Account holder name", "text", { placeholder: "Exactly as it appears on the account", hint: "This needs to match your legal " + (isNonprofit() ? "organization" : "business") + " name." }),
            fld("accountType", "Account type", "select", { placeholder: "Choose an account type", options: ["Business checking", "Business savings"] }),
            fld("routing", "ABA routing number", "mono", { placeholder: "9 digits", hint: digitsOf(a.routing) === "323075880" ? "We recognize this one: Umpqua Bank, Portland OR." : "" }),
            fld("accountNumber", "Account number (up to 17 digits)", "masked", { sensitive: true, placeholder: "Up to 17 digits" })
          ];
      return [
        card("s4-manual", "Settlement account", "", bankFields, {
          pinId: "bank-no-debit",
          assurance: "Payouts in only. Xplor can pay into this account and has no authority to take anything out. You'll add a " + (ca ? "void cheque" : "voided check") + " or bank letter at step 6."
        })
      ];
    }
    if (step === 5) {
      return [
        card("s5-dec", "Declarations", "Saying yes to any of these won't stop your application — it just means someone reads it alongside the automated checks.", [
          fld("legalProceedings", "Any legal proceedings on the go?", "yn", { span: true }),
          a.legalProceedings === "yes" ? fld("legalProceedingsWhy", "Tell us a bit about it", "long", { span: true, conditional: true, placeholder: "A sentence or two is fine." }) : null,
          fld("priorTermination", "Has a merchant account of yours been terminated?", "yn", { span: true }),
          a.priorTermination === "yes" ? fld("priorTerminationWhy", "Processor, date and reason", "long", { span: true, conditional: true, placeholder: "A sentence or two is fine." }) : null,
          fld("taxLiens", "Any outstanding tax liens or judgments?", "yn", { span: true }),
          a.taxLiens === "yes" ? fld("taxLiensWhy", "Amount and current status", "long", { span: true, conditional: true, placeholder: "How much, and where it stands now." }) : null,
          ca ? null : fld("msb", "Are you a money service business?", "yn", { span: true, hint: "Check cashing, money transfer, currency exchange or crypto. Most businesses aren't." })
        ], { pinId: "yes-is-not-no" }),
        card("s5-pci", "Card data security", "", [
          fld("pci", "Do you follow the card industry's data security rules (PCI DSS)?", "yn", { span: true, unsure: true, hint: "If you only take payments through Xplor Pay, the answer is yes. We look after the card data." }),
          a.pci === "yes" ? fld("saq", "Which security questionnaire do you fill in (SAQ type)?", "select", { conditional: true, optional: true, hint: "If you only use Xplor Pay, skip this: we fill the form in for you. Not sure? Pick the first option.", placeholder: "Choose an SAQ type", options: ["SAQ A (payments fully outsourced)", "SAQ A-EP", "SAQ B", "SAQ B-IP", "SAQ C", "SAQ D"] }) : null,
          a.pci === "yes" ? fld("pciDate", "When did you last complete it?", "mono", { conditional: true, optional: true, hint: "Skip this if you only use Xplor Pay.", placeholder: datePh() }) : null
        ], { pinId: "assurance-callouts", assurance: "Card data never touches your systems, so your yearly PCI form is the shortest one going — and we fill it in for you." }),
        card("s5-consent", "Two consents we have to collect", "", [
          fld("matchConsent", "I agree to a check of the card networks' list of closed merchant accounts", "check", { span: true, hint: "Also called a MATCH or TMF check. Mastercard requires it for every merchant account." }),
          ca ? null : fld("ofacAck", "I understand we'll check your name against the US government sanctions list", "check", { span: true, hint: "Known as OFAC screening. Every US merchant goes through it." })
        ], { assurance: "These are consents, not credit checks. Neither one touches your personal credit score." })
      ];
    }
    if (step === 7) {
      return [
        card("s7-terms", "What you're agreeing to", "", [
          fld("acceptAgreement", "I accept the Xplor Pay merchant services agreement", "check", { span: true, viewKey: "agreement", hint: "No minimum term and no exit fee." }),
          fld("acceptPrivacy", "I accept the privacy policy and terms of service", "check", { span: true, viewKey: "privacy" }),
          fld("acceptEsign", "I agree to sign electronically", "check", { span: true, hint: "We need this before a typed signature counts." }),
          fld("signAuthority", isSole() ? "I confirm I'm signing for my own business" : "I confirm I'm authorized to sign for " + a.legalName, "check", { span: true, hint: "Recorded with a timestamp for the audit trail." })
        ])
      ];
    }
    return [];
  }

  function whyFor(step, ca) {
    return {
      1: { t: "Why are we asking?", b: "Your bank needs to see that the " + orgWord() + " really exists and that its name, number and address all line up. Matching the registry for you is what turns days of manual review into minutes.", p: ["Checked against " + (ca ? "CRA and provincial registries" : "IRS and Secretary of State records"), "A match is one less document to dig out", "Your description sets your merchant category for you"] },
      2: { t: "Why do you need owners?", b: isNonprofit() ? "Anti-money-laundering rules mean the people who run an organization, such as directors or trustees, have to be named and identified, along with whoever signs the agreement. There's no way around this one." : "Anti-money-laundering rules mean anyone controlling 25% or more of a business has to be named and identified, along with whoever signs the agreement. There's no way around this one.", p: [(ca ? "SIN" : "SSN") + " and ID numbers go straight to Trullio, our verification partner", "Never stored on Xplor systems, never visible to Xplor staff", "Owners can fill in their own part by link, so you're never blocked"] },
      3: { t: "Why do you need numbers?", b: "This is underwriting, not a credit check. Your answers set sensible limits and show what a normal day looks like for you, so real sales don't get held up.", p: ["Best guesses are expected, and nothing here is a commitment", "Telling us the history now is faster than us finding it later", "None of it changes the rate you pay"] },
      4: { t: "Why do you need my account details?", b: "This is the account your sales are paid into. We check it against the bank letter you add at step 6, so your payouts only ever go where they should.", p: ["Payouts in only. Xplor gets no authority to debit", "You can change this account later"] },
      5: { t: "Why ask all this?", b: "Card networks and regulators require these exact questions on every application. A yes isn't a refusal — it just sends your file to a person rather than straight through.", p: ["Consents shown here are not credit checks", "None of this affects your personal credit score", "You can explain anything in your own words"] },
      6: { t: "Why do you need files?", b: "Documents are how Trullio, our verification partner, confirms the details you've given are real. Checking them as they upload means a blurry scan gets caught now, not after a three-day wait.", p: ["Scanned for malware, stored encrypted", "Shared only with your verification partner", "Swap out or delete any file before you submit"] },
      7: { t: "What gets sent", b: "One package: your " + orgWord() + " record, the identity and sanctions checks we've already run, " + (isNonprofit() ? "who runs the organization" : "ownership") + ", bank verification, your declarations and the signed agreement.", p: ["Most decisions come back in under 2 hours", "Anything missing comes back as one clear request", "A signed copy of the agreement is emailed to you"] }
    }[step];
  }

  function docListFor(owners, ca, idOnly) {
    const a = state.a;
    const idRows = owners.map((o) => ({
      key: "id_" + o.id, title: "Government photo ID for " + o.name, requirement: "Required",
      hint: "Passport or driver's license. All four corners in shot and no glare. Why we ask: to confirm you are who you say you are. It goes only to Trullio, our verification partner.",
      file: "id-" + o.id + "-license.jpg",
      read: "Read: " + o.name + " · " + (ownerVal(o, "idType") || "photo ID") + (digitsOf(ownerVal(o, "idExpiry")).length === 8 ? " · expires " + digitsOf(ownerVal(o, "idExpiry")).slice(-4) : "") + (o.name && ownerVal(o, "idType") ? " — matches step 2" : "")
    }));
    if (idOnly) return idRows;
    // An owner who has been sent a link adds their own ID file there, so it is not asked of the applicant.
    const list = idRows.filter((r, i) => owners[i].status !== "invited");
    if (!isSole()) list.push({ key: "reg", title: isNonprofit() ? "Proof of registration or non-profit status" : "Proof of business registration", requirement: state.einFound ? "Not needed" : "Required", hint: state.einFound ? "Skipped. The registry match in step 1 already confirmed your " + (isNonprofit() ? "organization" : "business") + " is registered." : "Articles of incorporation, certificate of formation or equivalent.", file: "articles-of-organization.pdf", read: "Read: " + (a.legalName || "your " + orgWord()) + (a.incorporated ? " · formed " + a.incorporated : "") + " — matches step 1", skip: state.einFound });
    list.push({
      key: "bank", title: "Bank account verification", requirement: "Required",
      hint: (ca ? "Void cheque" : "Voided check") + ", bank letter or a recent statement showing the " + (isNonprofit() ? "organization" : "business") + " name and account.",
      file: "bank-letter.pdf", read: "Read: " + (a.accountHolder || a.legalName || "your " + orgWord()) + (digitsOf(a.accountNumber) ? " · account ending " + digitsOf(a.accountNumber).slice(-4) + " — matches step 4" : "")
    });
    if (!ca) {
      if (!(isSole() && !state.einFound)) list.push({ key: "ein", title: "EIN confirmation letter (CP-575 or 147C)", requirement: state.einFound ? "Not needed" : "Required", hint: state.einFound ? "Skipped. The IRS match in step 1 already confirmed your EIN." : "The letter the IRS sent when your EIN was issued.", file: "irs-147c-riverside.pdf", read: "Read: " + (a.legalName || "your " + orgWord()) + (digitsOf(state.lookupId) ? " · EIN ending " + digitsOf(state.lookupId).slice(-4) + " — matches step 1" : ""), skip: state.einFound });
      list.push({ key: "w9", title: "W-9 tax certification", requirement: "Required", hint: "Review it and sign here, or upload your own signed copy.", file: "w9-uploaded.pdf", read: "Read: a W-9 for " + (w9Info().name || "your " + orgWord()) + (w9Info().hasEin ? " · EIN ending " + w9Info().last4 + " — matches step 1" : "") });
    }
    if (a.prior === "yes") list.push({ key: "stmt", title: "Last 3 months of processing statements", requirement: "Required", hint: "Because you've processed cards before, we need your last 3 months of processing statements from " + (a.priorName || "your prior processor") + ". They help us judge risk.", file: "prior-processor-statement.pdf", read: "Read: 3 months, 0.2% chargeback ratio — within limits" });
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
    const isEntry = st.screen === "entry";
    const isStatus = ["submitted", "rfi", "approved"].indexOf(st.screen) > -1;
    const cur = STEPS[st.step - 1];
    const progStep = st.editing ? 7 : st.step;
    const pct = isStatus ? 100 : Math.round(((progStep - 1) / 7) * 100);
    const owners = st.owners.map((o) => Object.assign({}, o, ownerInfo(o)));
    const ownedPct = owners.reduce((x, o) => x + o.pct, 0);
    // Only an owner who was sent a link and has not replied is still owed. Everyone else's ID is in by the time the applicant reaches step 7, because step 6 will not continue without it.
    const invitedLeft = owners.filter((o) => o.status === "invited");
    const settled = owners.length - invitedLeft.length;
    // One owner and nobody being chased: the applicant's own ID, or the only person they listed, is the only one to check.
    const solo = owners.length === 1 && (owners[0].self || owners[0].status !== "invited");
    const cards = isFlow ? cardsFor(st.step).filter(Boolean) : [];
    const docList = docListFor(owners, ca);
    // The recipient's owner form (preview) is step 2 shown outside the flow, so it is checked the same way.
    const errStep = isFlow ? st.step : (st.screen === "invitee" && st.inviteStep === 1 ? 2 : 0);
    const allErrs = errStep ? stepErrors(errStep) : {};
    ERR = {};
    Object.keys(allErrs).forEach((k) => { if (st.tried[errStep] || st.touched[k]) ERR[k] = allErrs[k]; });
    // Save and continue stays disabled until every required answer on the page is valid. The reasons
    // are shown on the fields themselves, as each is left (see touched), not on the button.
    const stepComplete = !errStep || Object.keys(allErrs).length === 0;
    // What is still needed, in the applicant's own words, for the hover note on the disabled button (decision 78).
    const labelOf = { signatoryName: "Signatory name", signatoryTitle: "Signatory title", sign: "Your typed signature" };
    cards.forEach((c) => c.fields.forEach((f) => { labelOf[f.id] = f.label; }));
    if (errStep === 2) st.owners.forEach((o) => { const n = String(ownerInfo(o).name || "").trim(); ownerFields(o).forEach((f) => { labelOf[f.id] = (n && n !== "New owner" ? n : "Owner") + ": " + f.label; }); });
    docList.forEach((d) => { labelOf["doc_" + d.key] = "File: " + d.title; });
    const missing = [];
    Object.keys(allErrs).forEach((k) => { const m = labelOf[k] || allErrs[k]; if (missing.indexOf(m) < 0) missing.push(m); });
    // Step 7 signatory follows the step 2 answer unless edited on step 7.
    const selfOwner = owners.filter((o) => o.self)[0];
    const defaultSigner = a.sigSame === "no" ? (a.sigName || "") : (ownerVal(st.owners[0] || {}, "name") || "");
    const signatoryName = a.signatoryName !== undefined ? a.signatoryName : defaultSigner;
    const signatoryTitle = a.signatoryTitle !== undefined ? a.signatoryTitle : (a.sigSame === "no" ? (a.sigTitle || "") : (((selfOwner || st.owners[0]) || {}).role || ""));
    // "Signed by" is only true once the typed signature matches the signatory.
    const sigNorm = (t) => String(t).trim().replace(/\s+/g, " ").toLowerCase();
    const signedNow = !!signatoryName.trim() && sigNorm(st.sign) === sigNorm(signatoryName);

    return {
      ca, isWelcome, isBizType, isEntry, isFlow, isStatus, cur, pct, owners, cards, docList,
      isInvitee: st.screen === "invitee",
      inviteDocs: docListFor(owners, ca, true).filter((d) => d.key === "id_" + st.inviteOwner),
      invitedOwners: owners.filter((o) => o.status === "invited"),
      showShell: ctx.chrome === "Inside app shell",
      why: whyFor(st.step, ca),
      signatoryName, signatoryTitle,
      needRegistration: ca ? "Step 1 starts with your CRA business number. If we find a record we'll fill in the rest, so there's less for you to type." : "Step 1 starts with your EIN. If we find a record we'll fill in the rest, so there's less for you to type.",
      needIds: ca ? "Owners with 25% or more (or directors and trustees, for a non-profit) and whoever signs: a driver's licence or passport and a SIN. If it's easier, they can fill in their own bit." : "Owners with 25% or more (or directors and trustees, for a non-profit) and whoever signs: a driver's license or passport and an SSN. If it's easier, they can fill in their own bit.",
      needBank: ca ? "Your institution, transit and account numbers, plus a void cheque or a bank letter." : "Your routing and account numbers, plus a voided check or a bank letter.",
      shellRailNote: isStatus ? "Submitted — with Trullio" : "Step " + progStep + " of 7 · about " + Math.max(2, 17 - progStep * 2) + " min left",
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
        2: isSole() ? "As a sole proprietor you're the only owner, so this is just you. We need these details to check who you are." : isNonprofit() ? "We need to know about the people who run the organization, such as directors or trustees, plus whoever's signing. Add their details here, or send them a link and let them do their own." : "We need to know about anyone who owns 25% or more, plus whoever's signing. Add their details here, or send them a link and let them do their own.",
        3: "A few questions about your sales. Rough estimates are absolutely fine, and nothing here changes your rate.",
        4: "Add the account your payouts should go to. You'll add a " + (ca ? "void cheque" : "voided check") + " or bank letter for it in step 6.",
        5: "Every application includes these. Saying yes to one is never an automatic no — it just means someone reads your file.",
        6: "We check each file as it uploads, so if something won't do you'll know straight away.",
        7: "Look over everything you've told us. Sign, and it all goes over in one go."
      }[st.step],
      stepComplete: stepComplete,
      missing: missing,
      nextLabel: st.step === 7 ? "Submit for verification" : "Save and continue",
      submitNote: "Straight away. Trullio, our verification partner, gets one complete package.",
      saveProgressNote: isWelcome ? "You haven't started yet, so there's nothing to lose." : "Last saved on step " + st.step + ", a moment ago.",
      lookupTitle: isSole() ? (ca ? "Do you have a business number?" : "Do you have an EIN?") : ca ? "Let's start with your " + (isNonprofit() ? "organization's " : "") + "business number" : "Let's start with your EIN",
      lookupLabel: ca ? "Business Number (BN)" : "Employer Identification Number (EIN)",
      lookupPlaceholder: ca ? "123456789" : "12-3456789",
      lookupNote: isSole() ? "If you have one, we'll use it to fill in what we can. If you don't, you can carry on without it." : ca ? "We'll match it against CRA and provincial registry records and fill in the rest for you." : "We'll match it against IRS and state registry records and fill in the rest for you.",
      lookupAssurance: (ca ? "Your BN" : "Your EIN") + " is tokenized the moment you submit it. It's used once to verify the " + orgWord() + " and is never shown back to Xplor staff.",
      lookupResult: lookupResultText(st),
      ownershipTotal: fmtPct(ownedPct) + "% of 100%",
      ownedWidth: Math.max(0, Math.min(100, ownedPct)),
      ownershipNote: ownedPct > 100
        ? "That comes to more than 100%. Have another look at each owner's percentage."
        : ownedPct <= 75
          ? "Add everyone who owns 25% or more. " + fmtPct(100 - ownedPct) + "% is still unaccounted for."
        : ownedPct < 100
          ? "Every owner at 25% or more is listed. The remaining " + fmtPct(100 - ownedPct) + "% sits with smaller holders, who don't need identifying."
          : "All 100% accounted for.",
      ownersIdLabel: solo ? (owners[0].self ? "Your own ID is the only one to check" : "The only ID is in and being checked") : settled === owners.length ? "Every ID is in and being checked" : settled + " of " + owners.length + " IDs in",
      // The status screens name the owners actually entered, never the sample people.
      reviewNote: (() => { const idToCome = (o) => o.status === "invited"; return solo ? (idToCome(owners[0]) ? "Your ID is still to come" : "Your ID arrived and is being checked") : owners.map((o) => (o.self ? "Your" : o.name + "'s") + " ID " + (idToCome(o) ? "still to come" : "arrived")).join(" · "); })(),
      othersTitle: solo ? "Nothing waiting on anyone else" : settled === owners.length ? "Everyone's done their bit" : invitedLeft.length === 1 ? "Still waiting on one ID" : "Still waiting on " + invitedLeft.length + " IDs",
      othersBody: solo ? (owners[0].self ? "You're the only owner listed, so nobody else needs to send their ID." : "Only one owner is listed and their ID is in, so nobody else needs to send anything.") : settled === owners.length ? "Everyone you invited has finished their part, so nothing is waiting on a person." : "We've nudged " + invitedLeft.map((o) => o.name).join(" and ") + " to finish. Your review carries on in the meantime.",
      payoutAccountLabel: a.bankName ? a.bankName + " •••• 4417" : "Not set",
      submittedWhen: st.submittedAt ? "at " + st.submittedAt : "just now",
      checkNote: "Checking " + [st.einFound && "your " + orgWord() + " registration", "who you are", "your bank account", "sanctions lists"].filter(Boolean).join(", ").replace(/, ([^,]*)$/, " and $1"),
      receivedNote: st.submittedAt ? "Sent to Trullio, our verification partner, at " + st.submittedAt : "Sent to Trullio, our verification partner",
      summary: [
        { label: isNonprofit() ? "Organization & address" : "Business & address", parts: [a.legalName, isSole() && a.dba && "trading as " + a.dba, a.structure, ca ? (st.lookupId && "BN " + st.lookupId) : (st.einFound && "EIN ••••" + (digitsOf(st.lookupId).slice(-4) || "7208")), a.regAddress], step: 1 },
        { label: isNonprofit() ? "Leaders & signatory" : "Owners & signatory", parts: [owners.map((o) => isCompany() ? o.name + " " + fmtPct(o.pct) + "%" : o.name).join(" · "), owners.some((o) => o.status === "invited") && owners.filter((o) => o.status === "invited").length + " sent a link", signatoryName && (signedNow ? "signed by " : "signatory: ") + signatoryName], step: 2 },
        { label: "How you take payments", parts: [a.monthlyVolume && "$" + fmtMoney(a.monthlyVolume) + "/mo", a.avgTicket && "avg $" + fmtMoney(a.avgTicket), a.cpSplit && a.cpSplit + "% card present", a.goods && a.goods.toLowerCase()], step: 3 },
        { label: "Payout account", parts: [a.bankName, a.accountType && a.accountType.toLowerCase(), a.accountNumber && (doc("bank").state === "done" ? "bank document checked" : "bank document still to add")], step: 4 },
        { label: "Compliance declarations", parts: [declarationsSummary(a, ca), a.saq && "PCI " + a.saq, a.pci === "unsure" && "PCI: unsure", (a.matchConsent && (ca || a.ofacAck)) && "consents given"], step: 5 },
        { label: "Supporting documents", parts: (() => { const need = docList.filter((d) => !d.skip); return [need.length + " needed", need.filter((d) => doc(d.key).state === "done").length + " checked"]; })(), step: 6 }
      ].map((r) => {
        const done = r.parts.filter(Boolean);
        return { label: r.label, step: r.step, value: done.length ? done.join(" · ") : "Nothing filled in yet", empty: !done.length };
      }),
      statusJumps: [
        { label: "Under review", go: () => go("submitted") },
        { label: "More info needed", go: () => go("rfi") },
        { label: "Approved", go: () => go("approved") },
        { label: "Restart flow", go: () => go("welcome", 1) }
      ]
    };
  }

  // ---------------------------------------------------------------------------
  // Views
  // ---------------------------------------------------------------------------

  // Show only the last four characters of a sensitive value.
  function maskValue(s) {
    return typeof s === "string" && s.length > 4 ? s.slice(0, s.length - 4).replace(/[^ ]/g, "•") + s.slice(-4) : s;
  }

  // Card networks truncate the billing descriptor at 22 characters, so that's
  // the limit the preview shows rather than a house style choice.
  const DESCRIPTOR_MAX = 22;

  // Live mock of a customer's bank statement. The descriptor the merchant is
  // typing sits between two everyday transactions, because what matters is
  // whether it's recognizable in a list, not on its own.
  function descriptorView(f, id, onInput) {
    const typed = String(f.value || "").toUpperCase();
    const shown = typed.slice(0, DESCRIPTOR_MAX);
    const over = typed.slice(DESCRIPTOR_MAX);
    const empty = shown.trim() === "";
    const a = state.a;
    const ca = isCa();
    const neighbours = ca
      ? [["LOBLAWS #2211 TORONTO ON", "$41.65"], ["TTC PRESTO TORONTO ON", "$3.35"]]
      : [["SAFEWAY #1423 PORTLAND OR", "$64.18"], ["TRIMET TICKET PORTLAND OR", "$2.80"]];
    const amount = "$" + (a.avgTicket || "38") + ".00";
    const countCls = typed.length > DESCRIPTOR_MAX ? " is-over" : typed.length > DESCRIPTOR_MAX - 4 ? " is-near" : "";
    const countText = typed.length > DESCRIPTOR_MAX
      ? typed.length + " characters — the last " + over.length + " will be cut off"
      : typed.length + " of " + DESCRIPTOR_MAX + " characters";

    const row = (desc, amt) => html`<div class="stmt-row"><span class="stmt-desc">${desc}</span><span class="stmt-amt">${amt}</span></div>`;

    return html`<div class="span-2" data-key="${f.id}">
  <div class="field-head"><label class="field-label" for="${id}">${f.label}${f.required && REQ}</label></div>
  <input class="input mono" id="${id}" value="${f.value}" placeholder="${(a.dba || a.legalName || "Your trading name").toUpperCase()}" autocomplete="off" spellcheck="false" aria-describedby="h-${f.id}" data-input="${onInput}">
  <p class="field-hint" id="h-${f.id}">${f.hint}</p>
  <figure class="stmt">
    <div class="stmt-sheet">
      <div class="stmt-head"><span>How this looks on ${isNonprofit() ? "a supporter's" : "your customer's"} statement${pin("descriptor-preview")}</span><span>Amount</span></div>
      ${row(neighbours[0][0], neighbours[0][1])}
      <div class="stmt-row stmt-row--live">
        <span class="stmt-desc stmt-desc--live">${empty
          ? html`<span class="stmt-ghost">YOUR DESCRIPTOR</span>`
          : html`${shown}${over && html`<span class="stmt-cut">${over}</span>`}`}</span>
        <span class="stmt-amt">${amount}</span>
      </div>
      ${row(neighbours[1][0], neighbours[1][1])}
    </div>
    <p class="stmt-count${countCls}" role="status">${countText}</p>
  </figure>
</div>`;
  }

  // The asterisk is decorative; screen readers get the word.
  const REQ = html`<span class="req-star" aria-hidden="true">*</span><span class="sr-only"> (required)</span>`;

  function fieldView(f) {
    const id = "f-" + f.id;
    const wrap = f.span ? "span-2" : "";
    // Every control writes straight into state; values are escaped on the way
    // back out by html``, so typed markup is shown as text and never run.
    const onInput = on((e) => set(f.id, isDateKey(f.id) ? formatDateInput(e.target.value) : e.target.value));

    if (f.kind === "check") {
      // Read-before-accept: the View button lives inside the grey container.
      // It is interactive content, so clicking it never toggles the checkbox.
      const view = f.viewKey && html`<button type="button" class="btn btn-outline btn-xs check-view" aria-label="View ${f.label.replace(/^I accept the /, "")}" data-click="${on(() => openDoc(f.viewKey))}">${icon("eye", 14)}View</button>`;
      return html`<div class="${wrap}" data-key="${f.id}"${ERR[f.id] ? html` data-error="1"` : ""}><label class="check"><input type="checkbox" id="${id}"${attr("checked", f.value === true)} data-change="${on((e) => set(f.id, e.target.checked))}"><span><span class="check-label">${f.label}${f.required && REQ}</span>${f.hint && html`<span class="check-hint">${f.hint}</span>`}</span>${view}</label>${errView(f.id)}</div>`;
    }

    if (f.kind === "heading") return html`<h3 class="fields-sub span-2" data-key="${f.id}">${f.label}</h3>`;

    if (f.kind === "descriptor") return descriptorView(f, id, onInput);

    const hintId = f.hint ? "h-" + f.id : "";
    const described = hintId ? html` aria-describedby="${hintId}"` : "";
    let control;
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
        control = html`<div class="affix"><span class="affix-prefix" aria-hidden="true">${f.prefix}</span><input id="${id}" value="${f.value}" placeholder="${f.placeholder}" inputmode="decimal" autocomplete="off"${described} data-input="${onInput}"></div>`;
        break;
      case "masked": {
        // A sensitive value shows only its last four characters once you leave the
        // field. Clicking back into it lets you edit the real value, still shown as
        // dots until you press "Show".
        // The first time a value is typed it is plain, and an empty field has
        // nothing to hide.
        const editing = f.revealed || f.focused || f.value === "";
        const dots = f.focused && !f.revealed && state.editMasked === f.id;
        control = html`<div class="affix affix--secure">${icon("lock", 16)}<input id="${id}"${attr("class=\"masked-edit\"", dots)} value="${editing ? f.value : maskValue(f.value)}" placeholder="${f.placeholder}" autocomplete="off" spellcheck="false"${attr("readonly", !editing)}${described} data-input="${onInput}" data-focus="${on(() => { if (f.value !== "" && !state.revealed[f.id]) setState({ editMasked: f.id }); })}" data-blur="${on(() => { if (state.editMasked === f.id) setState({ editMasked: "" }); schedule(); })}">${f.value !== "" && html`<button type="button" class="btn-link" aria-controls="${id}" aria-label="${(f.revealed ? "Hide " : "Show ") + f.label}" data-click="${on(() => toggleReveal(f.id))}">${f.revealed ? "Hide" : "Show"}</button>`}</div>`;
        break;
      }
      case "long":
        control = html`<textarea class="input" id="${id}" rows="3" placeholder="${f.placeholder}"${described} data-input="${onInput}">${f.value}</textarea>`;
        break;
      case "yn":
        control = html`<div class="yn" role="group" aria-labelledby="l-${f.id}"${described}><button type="button" class="yn-btn" aria-pressed="${String(f.value === "no")}" data-click="${on(() => set(f.id, "no"))}">No</button><button type="button" class="yn-btn" aria-pressed="${String(f.value === "yes")}" data-click="${on(() => set(f.id, "yes"))}">Yes</button>${f.unsure && html`<button type="button" class="yn-btn" aria-pressed="${String(f.value === "unsure")}" data-click="${on(() => set(f.id, "unsure"))}">Unsure</button>`}</div>`;
        break;
      default:
        control = html`<input class="input" id="${id}" value="${f.value}" placeholder="${f.placeholder}"${described} data-input="${onInput}">`;
    }

    const label = f.kind === "yn"
      ? html`<span class="field-label" id="l-${f.id}">${f.label}${f.required && REQ}</span>`
      : html`<label class="field-label" for="${id}">${f.label}${f.required && REQ}</label>`;
    return html`<div class="${wrap}" data-key="${f.id}"${ERR[f.id] ? html` data-error="1"` : ""}>
  <div class="field-head">${label}${f.chip && html`<span class="chip">${f.chip}</span>`}${f.sensitive && html`<span class="chip chip--secure">${icon("lock", 10, "i-b")}Encrypted</span>`}</div>
  ${control}
  ${errView(f.id)}
  ${f.hint && html`<p class="field-hint" id="${hintId}">${f.hint}</p>`}
</div>`;
  }

  // Numbered marker for one entry in DECISIONS. Renders nothing at all unless
  // annotations are switched on, so the flow is unaffected when they're off.
  // Numbers are the entry's position in DECISIONS, so decision 13 is decision
  // 13 on whichever screen you find it.
  function pin(id) {
    if (!ctx.showNotes) return "";
    const i = decisionIndex(id);
    if (i < 0) return "";
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
      let g = groups.filter((x) => x.where === d.where)[0];
      if (!g) { g = { where: d.where, items: [] }; groups.push(g); }
      g.items.push({ d: d, n: i + 1 });
    });
    return html`<div class="backdrop" data-key="notes-list">
  <div class="dialog dialog--wide" role="dialog" aria-modal="true" aria-labelledby="notes-title">
    <div class="dialog-head">
      <div class="grow">
        <h2 class="dialog-title" id="notes-title">Design decisions</h2>
        <p class="dialog-sub">${DECISIONS.length} recorded. Numbers match the markers on the screen.</p>
      </div>
      <button type="button" class="icon-btn" aria-label="Close" data-click="${on(() => setState({ notesListOpen: false }))}">${icon("x", 18)}</button>
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
            <div class="notes-item-meta"><span class="chip">${it.d.area}</span><span>Decided by ${it.d.by} · ${it.d.when}</span></div>
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
    ${c.collapsible && html`<button type="button" class="btn btn-collapse btn-xs" aria-expanded="${String(c.isOpen)}" data-click="${on(c.toggle)}">${c.toggleLabel}${icon("chev-d", 14)}</button>`}
  </div>
  ${c.isOpen && html`<div class="fields">${c.fields.map(fieldView)}</div>`}
  ${c.assurance && callout(c.assurance, "callout--card")}
</section>`;
  }

  function shellView(v) {
    const link = (ic, label, active, badge) => html`<div class="shell-link${active ? " is-active" : ""}"${active ? html` aria-current="page"` : ""}>${icon(ic, 18)}${label}${badge && html`<span class="shell-badge">${badge}</span>`}</div>`;
    return html`<aside class="shell" data-key="shell" aria-label="Riverside Pilates">
  <div class="shell-brand">${mark(22)}<span class="shell-brand-name">Riverside Pilates</span></div>
  <nav class="shell-nav" aria-label="App">
    ${link("grid", "Dashboard")}${link("users", "Members")}${link("chart", "Reports")}${link("dollar", "Payments", true, "Setup")}${link("settings", "Settings")}
  </nav>
  <div class="shell-setup">
    <div class="shell-setup-title">Payments setup</div>
    <div class="shell-setup-note">${v.shellRailNote}</div>
    <div class="shell-meter"><span class="shell-meter-fill" data-width="${v.pct}"></span></div>
  </div>
</aside>`;
  }

  function welcomeView(v) {
    const need = (ic, title, body) => html`<div class="need"><span class="icon-tile">${icon(ic, 18)}</span><div><div class="need-title">${title}</div><div class="need-body">${body}</div></div></div>`;
    return html`<div class="welcome" data-key="welcome">
  <div class="welcome-inner">
    <span class="tag tag--purple">${icon("shield", 13)}Welcome to Xplor Pay</span><span class="tag tag--green">${icon("bolt", 13)}Faster approval</span>
    <h1 class="welcome-title">Let's get you set up to take payments${pin("step-count-7")}</h1>
    <p class="welcome-lede">We'll walk you through it in seven short steps — about 15 minutes in total. You can stop whenever you like and pick up right where you left off.${pin("welcome-length")}</p>
    <div class="need-bar">
      <h2 class="need-head">What you'll need</h2>
    </div>
    <div class="need-list">
      ${need("building", "Your registration and tax numbers", v.needRegistration)}
      ${need("users", "Details of the people who own your organization", v.needIds)}
      ${need("card", "Your bank account and a few documents", v.needBank)}
      ${need("chart", "A rough idea of what you take on card", "Monthly takings, your average sale, and whether you sell in person, online or both. A rough guess is fine.")}
    </div>
    <div class="actions">
      <button type="button" class="btn btn-outline btn-lg" data-click="${on(openSave)}">Someone else handles our finances</button>${pin("welcome-delegate")}
      <button type="button" class="btn btn-primary btn-lg" data-click="${on(() => go("bizType"))}">Let's get started${icon("arrow-r", 19)}</button>
    </div>
    <p class="welcome-help">${icon("help", 15, "i-accent")}<span><span class="welcome-help-q">Want to talk to someone first?</span> <span class="welcome-help-detail">Call <span class="mono">${SUPPORT_PHONE}</span>, ${SUPPORT_HOURS}.</span></span></p>
    <div class="info info--below" data-mouseenter="${on(() => setState({ infoOpen: true }))}" data-mouseleave="${on(() => setState({ infoOpen: false }))}">
      <button type="button" class="info-trigger" aria-expanded="${String(state.infoOpen)}" data-click="${on(() => setState({ infoOpen: true }))}">${icon("help", 15, "i-accent")}What we do with your information${icon("info", 14)}</button>
      ${state.infoOpen && html`<div class="popover" data-key="info-pop"><div class="popover-body"><ul class="popover-list">
        <li>Encrypted in transit and at rest.</li>
        <li>Tax and national ID numbers are tokenized — Xplor staff can't read them.</li>
        <li>Identity checks are done by Trullio, our verification partner.</li>
        <li>Used only to verify you, never for marketing.</li>
        <li>Progress saves automatically after every field.</li>
      </ul></div></div>`}
    </div>
  </div>
</div>`;
  }

    // Before the welcome page: the emailed link alone does not open the application (decisions 89 to 91).
    function entryView() {
      const mode = state.entryMode;
      const helpLine = (q) => html`<p class="welcome-help">${icon("help", 15, "i-accent")}<span><span class="welcome-help-q">${q}</span> <span class="welcome-help-detail">Call <span class="mono">${SUPPORT_PHONE}</span>, ${SUPPORT_HOURS}.</span></span></p>`;
      const contact = html`<ul class="help-list">
        <li><span class="help-label">Call us</span><span class="help-value mono">${SUPPORT_PHONE}</span><span class="help-note">${SUPPORT_HOURS}</span></li>
        <li><span class="help-label">Email</span><span class="help-value">support@xplorpay.example</span><span class="help-note">We reply within one business day</span></li>
      </ul>`;
      const dead = (ic, tagText, title, lede) => html`<div class="welcome" data-key="entry-${mode}">
    <div class="welcome-inner">
      <span class="tag tag--purple">${icon(ic, 13)}${tagText}</span>
      <h1 class="welcome-title">${title}${pin("check-its-you")}</h1>
      <p class="welcome-lede">${lede}</p>
      <section class="card entry-card">${contact}</section>
    </div>
  </div>`;
      if (mode === "expired") return dead("clock", "Link expired", "This link has run out", "Links stop working after a while, so only the right person can open your application. Your answers are still saved. Call us and we'll send a fresh link.");
      if (mode === "closed") return dead("lock", "Link closed", "This link has been closed", "If you weren't expecting that, call us and we'll sort it out.");
      if (mode === "locked") return dead("lock", "Paused", "Too many tries", "We've paused this link to keep your application safe. Call us and we'll get you back in.");
      const sent = mode === "code";
      return html`<div class="welcome" data-key="entry-${mode}">
    <div class="welcome-inner">
      <span class="tag tag--purple">${icon("lock", 13)}Secure link</span>
      <h1 class="welcome-title">Let's check it's you${pin("check-its-you")}</h1>
      <p class="welcome-lede">${sent ? "We've sent a one-time code to " + MASKED_EMAIL + ". It can take a minute to arrive." : "We'll send a one-time code to the email this link came to. It means anyone else who gets hold of the link can't open your application."}</p>
      ${sent ? html`<form class="card entry-card" data-submit="${on(submitCode)}"${state.entryErr ? html` data-error="1"` : ""}>
        <label class="field-label field-label--block" for="entry-code">Enter the 6-digit code</label>
        <input class="input entry-code" id="entry-code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" spellcheck="false" value="${state.entryCode}" data-input="${on((e) => setState({ entryCode: e.target.value.replace(/\D/g, "").slice(0, 6), entryErr: "" }))}">
        ${state.entryErr && html`<p class="field-error" role="alert">${state.entryErr}</p>`}
        <div class="entry-actions">
          <button type="submit" class="btn btn-primary btn-lg">Continue${icon("arrow-r", 19)}</button>
          <button type="button" class="btn btn-ghost btn-md" data-click="${on(() => sendCode(true))}">Send a new code</button>
        </div>
        <p class="small-note entry-proto">Prototype: any 6 digits work. 000000 is refused.</p>
      </form>` : html`<section class="card entry-card">
        <div class="card-head card-head--flush"><span class="icon-tile">${icon("mail", 18)}</span><div class="grow"><div class="card-title">We'll send a code to</div><div class="card-note mono">${MASKED_EMAIL}</div></div></div>
        <div class="entry-actions"><button type="button" class="btn btn-primary btn-lg" data-click="${on(() => sendCode(false))}">Send code${icon("arrow-r", 19)}</button></div>
      </section>`}
      ${helpLine(sent ? "Not getting the code?" : "Not your email address?")}
    </div>
  </div>`;
    }

  // Page 2: who you are, asked before any field so nothing that doesn't apply is shown.
  function bizTypeView() {
    return html`<div class="welcome" data-key="biztype">
  <div class="welcome-inner">
    <span class="tag tag--purple">${icon("shield", 13)}About your business</span>
    <h1 class="welcome-title">What type of business are you?${pin("business-type-first")}</h1>
    <p class="welcome-lede">Tell us how your business is structured so we can tailor the verification process. It decides which questions you see, so you only answer what applies to you.</p>
    <div class="biz-list" role="radiogroup" aria-label="Business type">
      ${BIZ_TYPES.map((t) => html`<button type="button" class="biz-card${state.bizType === t.id ? " is-selected" : ""}" role="radio" aria-checked="${String(state.bizType === t.id)}" data-key="biz-${t.id}" data-click="${on(() => chooseBizType(t.id))}">
        <span class="biz-radio" aria-hidden="true"></span>
        <span><span class="biz-label">${t.label}</span><span class="biz-desc">${t.desc}</span></span>
      </button>`)}
    </div>
    <div class="actions">
      <button type="button" class="btn btn-outline btn-lg" data-click="${on(() => go("welcome", 1))}">${icon("chev-l", 17)}Back</button>
      <button type="button" class="btn btn-primary btn-lg" ${state.bizType ? "" : "disabled"} data-click="${on(() => state.bizType && go("flow", 1))}">Continue${icon("arrow-r", 19)}</button>
    </div>
  </div>
</div>`;
  }

  function railView(v) {
    const waitingOn = state.owners.filter((o) => o.status === "invited").length;
    const waitNote = waitingOn === 0 ? "" : waitingOn === 1 ? (isNonprofit() ? "Waiting on one person's details" : "Waiting on one owner's details") : "Waiting on " + waitingOn + (isNonprofit() ? " people's details" : " owners' details");
    const items = STEPS.map((s) => {
      if (s.n < state.step || (state.editing && s.n !== state.step && s.n < 7)) {
        return html`<li><button type="button" class="step is-done" data-click="${on(() => setState({ step: s.n }))}"><span class="step-dot">${icon("check", 13, "i-b")}</span><span class="step-label">${stepName(s)}${s.n === 2 && waitNote && html`<span class="rail-sub" data-key="step2-waiting">${waitNote}</span>`}</span><span class="step-meta">Done</span></button></li>`;
      }
      if (s.n === state.step) {
        return html`<li><div class="step is-current" aria-current="step"><span class="step-dot">${s.n}</span><span class="step-label">${stepName(s)}</span><span class="step-meta">${s.time}</span></div></li>`;
      }
      return html`<li><div class="step"><span class="step-dot">${s.n}</span><span class="step-label">${stepName(s)}</span><span class="step-meta">${s.time}</span></div></li>`;
    });
    return html`<nav class="rail" data-key="rail" aria-label="Verification steps">
  <div class="brand"><img class="brand-logo" src="assets/xplor-pay-logo.png" alt="Xplor Pay" width="1354" height="295"></div>
  <div class="progress-head"><span class="progress-title" id="progress-label">Your progress</span><span class="progress-pct">${v.pct}%</span></div>
  <div class="meter" role="progressbar" aria-labelledby="progress-label" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${v.pct}"><span class="meter-fill" data-width="${v.pct}"></span></div>
  <p class="progress-note">${v.remainingLabel} · <span class="save-tell${state.saving ? " is-saving" : ""}" data-key="save-tell" role="status">${state.saving ? html`<span class="save-spinner" aria-hidden="true"></span>` : icon("check", 12)}${state.saving ? "Saving…" : "Saved"}</span></p>
  <ol class="steps">${items}</ol>
  <button type="button" class="btn btn-neutral btn-sm rail-help" data-click="${on(openHelp)}">${icon("help", 15)}Get help</button>
</nav>`;
  }

  function step1View(v) {
    return html`<section class="card" data-key="s1-lookup">
  <h2 class="card-title lookup-title">${v.lookupTitle}${pin("lookup-first")}</h2>
  <p class="lookup-note">${v.lookupNote}</p>
  <form class="lookup-row" data-submit="${on(runLookup)}"${state.lookupBlurErr ? html` data-error="1"` : ""}>
    <label class="lookup-field"><span class="field-label field-label--block">${v.lookupLabel}${isSole() ? html`<span class="chip">Optional</span>` : REQ}</span><input class="input mono" value="${state.lookupId}" placeholder="${v.lookupPlaceholder}" autocomplete="off" spellcheck="false" data-input="${on((e) => setState({ lookupId: e.target.value, lookupErr: "", lookupBlurErr: "" }))}" data-blur="${on(() => setState({ lookupBlurErr: state.lookupId.trim() ? lookupProblem(state.lookupId) : "" }))}"></label>
    <button type="submit" class="btn btn-primary btn-md btn-tight">${icon("search", 17)}Look up</button>
    <button type="button" class="btn btn-outline btn-md btn-tight" data-click="${on(enterManually)}">Enter details manually</button>
  </form>
  ${state.lookupBlurErr && html`<p class="field-error" role="alert">${state.lookupBlurErr}</p>`}
  ${state.lookupErr && !state.lookupBlurErr && html`<p class="lookup-hint" role="status">${state.lookupErr}</p>`}
  ${ERR.lookup && !state.lookupErr && html`<p class="field-error" data-error="1" role="alert">${ERR.lookup}</p>`}
  ${callout(v.lookupAssurance, "callout--lookup")}${pin("tokenized-ids")}${pin("mask-on-blur")}
</section>
${state.einFound && !isSole() && !state.lookupConfirmed && html`<section class="card rise" data-key="s1-confirm">
  <h2 class="card-title">Is this your ${isNonprofit() ? "organization" : "business"}?${pin("lookup-not-me")}</h2>
  <p class="card-note">Check the name and address below. If it belongs to someone else, say so and we'll clear it.</p>
  <div class="btn-row">
    <button type="button" class="btn btn-primary btn-md" data-click="${on(confirmLookup)}">${icon("check", 16, "i-b")}Yes, that's ${isNonprofit() ? "us" : "my business"}</button>
    <button type="button" class="btn btn-outline btn-md" data-click="${on(rejectLookup)}">No, that's not ${isNonprofit() ? "us" : "my business"}</button>
  </div>
</section>`}`;
  }

  function ownerView(o, recipient) {
    const isOpen = state.openOwner === o.id;
    const toggle = () => setState({ openOwner: state.openOwner === o.id ? 0 : o.id });
    return html`<article class="person${isOpen ? " is-open" : ""}" data-key="owner-${o.id}">
  <div class="person-head">
    <span class="avatar" aria-hidden="true">${o.initials}</span>
    <div class="grow">
      <h3 class="person-name">${o.name}</h3>
      <div class="person-meta">${o.status === "invited" && !String(ownerVal(o, "name")).trim() ? "Waiting for their details" : (o.self ? "You · " : "") + (isSole() ? "Sole owner" : isNonprofit() ? o.role : fmtPct(o.pct) + "% · " + o.role)}</div>
    </div>
    ${Object.keys(ERR).some((k) => k.indexOf("o" + o.id + "_") === 0) && html`<span class="pill pill--danger">${icon("alert", 13)}Needs a look</span>`}
    ${!recipient && o.status === "invited" && html`<span class="pill pill--warning">${icon("clock", 13)}Invited · ${o.inviteEmail || "filling in their own details"}</span>`}
    ${!recipient && o.status === "received" && html`<span class="pill pill--positive">${icon("check", 13, "i-b")}Details received${o.receivedAt ? " · " + o.receivedAt : ""}</span>`}
    ${!recipient && o.status === "pending" && !isSole() && !o.self && html`<button type="button" class="btn btn-outline btn-xs" data-click="${on(() => openDelegate(o.id))}">${icon("mail", 14)}Send them a link</button>`}
    ${!recipient && !isSole() && html`<button type="button" class="btn btn-xs person-toggle" aria-label="Remove ${o.name}" data-click="${on(() => removeOwner(o.id))}">${icon("trash", 14)}Remove</button>`}
    <button type="button" class="btn btn-xs person-toggle" aria-expanded="${String(isOpen)}" data-click="${on(toggle)}">${isOpen ? "Collapse" : "Open"}${icon("chev-d", 14)}</button>
  </div>
  ${isOpen && html`<div class="person-body" data-key="body"><div class="fields">${ownerFields(o).map(fieldView)}</div></div>`}
</article>`;
  }

  function step2View(v) {
    const addOwner = () => { const id = Date.now(); setState({
      owners: state.owners.concat([{ id: id, name: "New owner", initials: "—", pct: 10, role: "Director", status: "pending", self: false, added: true }]),
      openOwner: id
    }); };
    // "Add myself": the applicant is often the owner too. It fills in what step 1 already gave (email, phone), a sensible title, and whatever share is still unaccounted for. Nothing else is guessed, and every field stays editable.
    const addSelf = () => { const id = Date.now(); const left = Math.max(0, 100 - v.owners.reduce((x, o) => x + o.pct, 0)); setState({
      owners: state.owners.concat([{ id: id, name: "New owner", initials: "—", pct: isNonprofit() ? 10 : (left || 10), role: isNonprofit() ? "Director" : "Owner / CEO", status: "pending", self: true, added: true, me: true }]),
      openOwner: id
    }); };
    const addLabel = isNonprofit() ? (v.owners.length ? "Add another director or trustee" : "Add a director or trustee") : (v.owners.length ? "Add another owner or director" : "Add an owner or director");
    return html`${isCompany() && html`<section class="card" data-key="s2-total">
  <div class="own-head"><h2 class="card-title" id="own-label">Ownership accounted for${pin("ownership-bar")}</h2><span class="own-total">${v.ownershipTotal}</span></div>
  <div class="bar" role="progressbar" aria-labelledby="own-label" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${v.ownedWidth}"><span class="bar-fill" data-width="${v.ownedWidth}"></span></div>
  <p class="small-note">${v.ownershipNote}</p>
  <div${ERR.ownership ? html` data-error="1"` : ""}>${errView("ownership")}</div>
</section>`}
<div class="stack" data-key="s2-owners">
  ${v.owners.map((o) => ownerView(o))}
  ${!isSole() && !v.owners.some((o) => o.self) && html`<button type="button" class="add-row" data-key="add-self" data-click="${on(addSelf)}">${icon("user", 16)}${isNonprofit() ? "Add myself as a director or trustee" : "Add myself as an owner"}</button>`}
  ${!isSole() && html`<button type="button" class="add-row" data-key="add-owner" data-click="${on(addOwner)}">${icon("plus", 16)}${addLabel}</button>`}${isSole() ? "" : pin("owner-self-serve")}
</div>`;
  }

  function docView(d) {
    const s = d.skip ? "skipped" : doc(d.key).state;
    const cur = doc(d.key);
    const open = s === "idle";
    const cls = s === "done" ? " is-done" : s === "skipped" ? " is-skipped" : s === "idle" ? "" : open ? " is-later" : " is-busy";
    let action;
    if (open && d.key === "w9") action = html`<div class="doc-actions"><button type="button" class="btn btn-primary btn-sm" aria-label="Review and sign ${d.title}" data-click="${on(() => openDoc("w9"))}">${icon("pen", 15)}Review and sign</button><button type="button" class="btn btn-outline btn-sm" aria-label="Upload your own ${d.title}" data-click="${on(() => upload(d.key, d.file, d.read))}">${icon("upload", 15)}Upload your own</button></div>`;
    else if (open) action = html`<button type="button" class="btn btn-outline btn-sm" aria-label="Choose file for ${d.title}" data-click="${on(() => upload(d.key, d.file, d.read))}">${icon("upload", 15)}Choose file</button>`;
    else if (s === "done") action = html`<span class="state-pill state-pill--done">${icon("check", 14, "i-b")}Checked</span>`;
    else if (s === "skipped") action = html`<span class="state-pill state-pill--muted">Not needed</span>`;
    else action = html`<span class="state-pill state-pill--busy" role="status"><span class="spinner" aria-hidden="true"></span>${s === "uploading" ? "Uploading" : "Reading it"}</span>`;
    return html`<article class="card card--p20 doc${cls}" data-key="doc-${d.key}"${ERR["doc_" + d.key] ? html` data-error="1"` : ""}>
  <div class="doc-row">
    <span class="icon-tile icon-tile--neutral">${icon("file", 17)}</span>
    <div class="grow">
      <div class="doc-titlebar"><h3 class="doc-title">${d.title}</h3><span class="req">${d.requirement}</span></div>
      <p class="body-sm">${d.hint}</p>
      ${errView("doc_" + d.key)}
    </div>
    ${action}
  </div>
  ${s === "done" && html`<div class="doc-file"><span class="doc-file-name">${cur.file}</span><span class="doc-readback">${cur.read}</span><button type="button" class="btn-link" aria-label="Replace ${d.title}" data-click="${on(() => setDoc(d.key, "idle"))}">Replace</button></div>`}
</article>`;
  }

  function step6View(v) {
    return html`<div class="stack" data-key="s6-docs">${v.docList.filter((d) => !d.skip).map((d) => docView(d))}</div>
<div class="callout callout--lg" data-key="s6-assure">${icon("lock", 16)}<span>We scan and read every file as it uploads, so if one isn't legible you'll hear about it now rather than in three days' time. Files are stored encrypted and shared only with Trullio, our verification partner.${pin("read-on-upload")}</span></div>`;
  }

  // ---------------------------------------------------------------------------
  // Documents to read before accepting (step 7)
  // ---------------------------------------------------------------------------

  // Sample text for the prototype; the real documents come from legal.
  const AGREEMENTS = {
    agreement: {
      title: "Merchant services agreement", meta: "PDF · 12 pages · version 4.2",
      sections: [
        ["1. What we provide", "Xplor Pay processes card payments for your business and pays the proceeds out to your bank account."],
        ["2. Fees", "You pay the rates in your fee schedule and nothing else. There is no monthly fee and no setup fee."],
        ["3. Term and ending the agreement", "There is no minimum term. You can close your account at any time and there is no exit fee."],
        ["4. Disputes and chargebacks", "If a cardholder disputes a payment, we will tell you what evidence is needed and by when, and you keep control of the response."]
      ]
    },
    rates: {
      title: "Rates and fee schedule", meta: "PDF · 2 pages · effective on approval",
      sections: [
        ["Card payments", "2.6% + 30¢ for each card payment taken."],
        ["Monthly fees", "None."],
        ["Payouts", "Sent to your bank account the next business day after a sale."]
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
  const closeDoc = () => setState({ viewDoc: "", w9Err: "" });

  // What the W-9 shows comes from the applicant's own answers; nothing is invented.
  function w9Info() {
    const a = state.a;
    const owners = state.owners.map((o) => Object.assign({}, o, ownerInfo(o)));
    const signer = ((owners.filter((o) => o.self)[0] || owners[0] || {}).name || "").trim();
    const ein = digitsOf(state.lookupId);
    const hasEin = state.einFound && ein.length === 9;
    return {
      signer, hasEin, last4: ein.slice(-4),
      name: isSole() ? (a.legalName || signer) : a.legalName,
      business: a.dba, classification: a.structure, address: a.regAddress,
      tin: hasEin ? "EIN ending " + ein.slice(-4) : isSole() ? "Your SSN, as you entered it in step 2 (not shown here)" : "",
      canSign: hasEin || isSole()
    };
  }
  const SAVE_EMAIL_OK = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  function signW9() {
    const w = w9Info();
    const norm = (t) => String(t).trim().replace(/\s+/g, " ").toLowerCase();
    if (!w.signer) { setState({ w9Err: "Add your name in step 2 first, then come back to sign." }); return; }
    if (!state.w9Certify) { setState({ w9Err: "Tick the certification to sign." }); return; }
    if (norm(state.w9Name) !== norm(w.signer)) { setState({ w9Err: "Type your full legal name exactly as it appears in step 2." }); return; }
    const when = new Date().toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
    setState({ viewDoc: "", w9Err: "", w9Name: "", w9Certify: false });
    setDoc("w9", "done", "Form W-9 · signed here", "Signed electronically by " + w.signer + " on " + when + (w.hasEin ? " · EIN ending " + w.last4 : ""));
  }

  function w9DialogView() {
    const w = w9Info();
    const row = (label, value) => html`<div><h3 class="docv-h">${label}</h3><p class="docv-p">${value || "Not filled in"}</p></div>`;
    return html`<div class="backdrop" data-key="doc-view">
  <div class="dialog dialog--wide" role="dialog" aria-modal="true" aria-labelledby="docv-title">
    <div class="dialog-head">
      <span class="icon-tile icon-tile--neutral">${icon("file", 18)}</span>
      <div class="grow">
        <h2 class="dialog-title" id="docv-title">Form W-9: tax certification</h2>
        <p class="dialog-sub">Filled in from your answers. Check it, then sign.</p>
      </div>
      <button type="button" class="icon-btn" aria-label="Close" data-click="${on(closeDoc)}">${icon("x", 18)}</button>
    </div>
    <div class="docv-paper" tabindex="0" role="document" aria-label="Form W-9">
      ${row("Name", w.name)}
      ${w.business && row("Business name, if different", w.business)}
      ${row("Federal tax classification", w.classification)}
      ${row("Address", w.address)}
      ${row("Taxpayer identification number", w.tin || "Not provided yet")}
      <div><h3 class="docv-h">Certification</h3><p class="docv-p">Under penalties of perjury, I certify that the taxpayer identification number shown on this form is correct and that I am a U.S. person for tax purposes.</p></div>
    </div>
    ${w.canSign ? html`<div class="w9-sign">
      <label class="check"><input type="checkbox" id="f-w9certify"${attr("checked", state.w9Certify === true)} data-change="${on((e) => setState({ w9Certify: e.target.checked, w9Err: "" }))}"><span><span class="check-label">I've read this and certify it is correct</span></span></label>
      <div${state.w9Err && /legal name/.test(state.w9Err) ? html` data-error="1"` : ""}><label class="field-label field-label--block" for="f-w9name">Type your full legal name to sign</label>
      <input class="input sign-input" id="f-w9name" value="${state.w9Name}" placeholder="${w.signer || "Your full legal name"}" autocomplete="off" spellcheck="false" data-input="${on((e) => setState({ w9Name: e.target.value, w9Err: "" }))}" data-blur="${on(() => { const w = w9Info(); const norm = (t) => String(t).trim().replace(/\s+/g, " ").toLowerCase(); if (state.w9Name.trim() && w.signer && norm(state.w9Name) !== norm(w.signer)) setState({ w9Err: "Type your full legal name exactly as it appears in step 2." }); })}"></div>
      ${state.w9Err && html`<p class="field-error" role="alert">${state.w9Err}</p>`}
    </div>` : html`<div class="w9-sign"><p class="field-error" role="alert">A W-9 needs your EIN, and none has been given. Add it in step 1, or close this and upload your own signed copy.</p></div>`}
    <div class="docv-foot">
      <span class="small-note">Prototype preview: sample text, not the real form.</span>
      <span class="w9-actions">
        <button type="button" class="btn btn-neutral btn-md" data-click="${on(closeDoc)}">Cancel</button>
        ${w.canSign && html`<button type="button" class="btn btn-primary btn-md" data-click="${on(signW9)}">Sign</button>`}
      </span>
    </div>
  </div>
</div>`;
  }

  function docViewerView(v) {
    const key = state.viewDoc;
    if (key === "w9") return w9DialogView();
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
      <button type="button" class="icon-btn" aria-label="Close" data-click="${on(closeDoc)}">${icon("x", 18)}</button>
    </div>
    <div class="docv-paper" tabindex="0" role="document" aria-label="${title}">
      ${a.sections.map((sec) => html`<div><h3 class="docv-h">${sec[0]}</h3><p class="docv-p">${sec[1]}</p></div>`)}
    </div>
    <div class="docv-foot">
      <span class="small-note">Prototype preview: sample text, not the real document.</span>
      <button type="button" class="btn btn-primary btn-md" id="docv-close" data-click="${on(closeDoc)}">Close</button>
    </div>
  </div>
</div>`;
  }

  function reviewView(v) {
    return html`<div class="summary" data-key="s7-summary">
  ${v.summary.map((r) => html`<div class="summary-row">
    <span class="tick">${icon("check", 13, "i-b")}</span>
    <div class="grow"><div class="summary-label">${r.label}</div><div class="summary-value" title="${r.value}">${r.value}</div></div>
    <button type="button" class="btn-link btn-link--md" aria-label="Edit ${r.label}" data-click="${on(() => editFromReview(r.step))}">Edit</button>
  </div>`)}
</div>`;
  }

  function signView(v) {
    return html`<section class="card" data-key="s7-sign">
  <h2 class="card-title sign-title">Sign it off${pin("sign-last")}</h2>
  <div class="fields fields--sign">
    <div${ERR.signatoryName ? html` data-error="1"` : ""}><label class="field-label field-label--block" for="f-signatoryName">Authorized signatory name${REQ}</label><input class="input" id="f-signatoryName" value="${v.signatoryName}" placeholder="As printed on your ID" data-input="${on((e) => set("signatoryName", e.target.value))}">${errView("signatoryName")}</div>
    <div${ERR.signatoryTitle ? html` data-error="1"` : ""}><label class="field-label field-label--block" for="f-signatoryTitle">Title${REQ}</label><input class="input" id="f-signatoryTitle" value="${v.signatoryTitle}" placeholder="e.g. Owner / CEO" data-input="${on((e) => set("signatoryTitle", e.target.value))}">${errView("signatoryTitle")}</div>
  </div>
  <div${ERR.sign ? html` data-error="1"` : ""}><label class="field-label field-label--block" for="f-sign">Type your full legal name to sign${REQ}</label>
  <input class="input sign-input" id="f-sign" value="${state.sign}" placeholder="${v.signatoryName || "Your full legal name"}" autocomplete="off" spellcheck="false" data-input="${on((e) => setState({ sign: e.target.value }))}">${errView("sign")}</div>
  <div class="sign-meta">
    <span>Signed on ${new Date().toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })} · the date and time are recorded when you submit</span>
    <span class="sign-ok">${icon("shield", 13)}ESIGN Act compliant · a signed copy is emailed to you</span>
  </div>
</section>
<section class="next-panel${state.nextOpen ? " is-open" : ""}" data-key="s7-next" aria-labelledby="next-h">
  <h2 class="next-head" id="next-h"><button type="button" class="next-toggle" aria-expanded="${String(!!state.nextOpen)}" aria-controls="next-body" data-click="${on(() => setState({ nextOpen: !state.nextOpen }))}"><span>What happens next</span>${icon("chev-d", 16, "next-chev")}</button></h2>
  ${state.nextOpen && html`<ol class="next-grid" id="next-body">
    <li class="next-item is-on"><span class="next-num">1</span><div><div class="next-title">Sent to Trullio</div><div class="next-body">${v.submitNote}</div></div></li>
    <li class="next-item"><span class="next-num">2</span><div><div class="next-title">Checks run</div><div class="next-body">Usually under 2 hours. Feel free to close this window — we'll email and text you.</div></div></li>
    <li class="next-item"><span class="next-num">3</span><div><div class="next-title">Start taking payments</div><div class="next-body">Your first payout lands the next business day after your first sale.</div></div></li>
  </ol>`}
</section>`;
  }

  // A disabled button cannot be hovered or focused, so it sits in a wrapper that can. The note names what is still needed.
  function gateView(v, btn) {
    if (v.stepComplete || !v.missing.length) return btn;
    const shown = v.missing.slice(0, 6);
    const more = v.missing.length - shown.length;
    return html`<span class="gate" data-key="gate" tabindex="0" data-mouseenter="${on(() => setState({ nextTip: true }))}" data-mouseleave="${on(() => setState({ nextTip: false }))}" data-focus="${on(() => setState({ nextTip: true }))}" data-blur="${on(() => setState({ nextTip: false }))}">${btn}${state.nextTip && html`<span class="gate-pop" data-key="gate-pop" role="note"><span class="gate-pop-body"><span class="gate-head">Still needed to continue</span><ul class="gate-list">${shown.map((m) => html`<li>${m}</li>`)}${more > 0 && html`<li>and ${more} more</li>`}</ul></span></span>`}</span>`;
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
      <header data-key="head">
        <div class="step-meta-row">
          <span class="eyebrow">${v.stepCounter}</span>
          <span class="meta">${icon("clock", 13)}${v.cur.time}</span>
        </div>
        <h1 class="step-title">${v.stepTitle}${pin("no-field-count")}</h1>
        <p class="step-sub">${v.stepSubtitle}${v.stepSubtitle ? " " : ""}${whyView(v)}</p>
      </header>
      ${step === 1 && step1View(v)}
      ${step === 2 && step2View(v)}
      ${step === 6 && step6View(v)}
      ${step === 7 && reviewView(v)}
      ${v.cards.map(cardView)}
      ${step === 7 && signView(v)}
      ${Object.keys(ERR).length > 0 && html`<p class="footer-error" data-key="err-summary" role="alert">${icon("alert", 16)}${Object.keys(ERR).length === 1 ? "One thing needs a look before you can continue." : Object.keys(ERR).length + " things need a look before you can continue."}</p>`}
      <div class="footer" data-key="footer">
        ${state.editing ? html`<div class="footer-end" data-key="end">
          ${gateView(v, html`<button type="button" class="btn btn-primary btn-lg btn-next" ${v.stepComplete ? "" : "disabled"} data-click="${on(saveEdit)}">Save</button>`)}
        </div>` : html`${html`<button type="button" class="btn btn-neutral btn-lg back-btn" data-key="back" data-click="${on(back)}">${icon("chev-l", 17)}Back</button>`}
        <div class="footer-end" data-key="end">
          <button type="button" class="btn btn-ghost btn-lg" data-click="${on(openSave)}">Finish later</button>
          ${gateView(v, html`<button type="button" class="btn btn-primary btn-lg btn-next" ${v.stepComplete ? "" : "disabled"} data-click="${on(next)}">${v.nextLabel}${icon("chev-r", 18)}</button>`)}
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
      <h1 class="hero-title">${waits.length ? "Thanks, we're waiting on " + waits.join(" and ") : "That's everything, thanks"}</h1>
      <p class="hero-sub">Submitted ${v.submittedWhen} · reference <span class="mono">#XP-40718</span></p>
    </div>
  </div>
  <ol class="timeline">
    <li class="tl-item"><span class="tl-dot tl-dot--done">${icon("check", 12, "i-bb")}</span><div class="tl-body"><div class="tl-title">Application received</div><div class="tl-note">${v.receivedNote}</div></div></li>
    <li class="tl-item"><span class="tl-dot tl-dot--active"><span class="tl-spinner" aria-hidden="true"></span></span><div class="tl-body"><div class="tl-title">${waits.length ? "Checks started, waiting on the rest" : "Checks and review running"}</div><div class="tl-note">${waits.length ? "The checks can't finish until what's still owed is in · " : ""}${v.checkNote} · ${v.reviewNote}</div></div></li>
    <li class="tl-item"><span class="tl-dot tl-dot--todo"></span><div class="tl-body"><div class="tl-title tl-title--muted">Decision</div><div class="tl-note">Usually within 2 hours${waits.length ? " of the last item arriving" : ""} · we'll email and text you</div></div></li>
  </ol>
  ${waits.length ? html`<p class="hero-callout">Your decision can't be made until everything below is in. Add it whenever you're ready.</p>` : html`<p class="hero-callout">Nothing else for you to do right now. If anyone does have a question it'll turn up here as one clear request, not a start-again email.</p>`}
</section>
${v.invitedOwners.length ? html`<div class="stack" data-key="submitted-invited">${v.invitedOwners.map((o) => html`<section class="card card--p20 doc is-later" data-key="owner-wait-${o.id}">
  <div class="doc-row">
    <span class="icon-tile icon-tile--neutral">${icon("clock", 17)}</span>
    <div class="grow">
      <div class="doc-titlebar"><h3 class="doc-title">${o.name} · waiting for ${o.inviteEmail}</h3></div>
      <p class="body-sm">They fill in their own details and ID. Checks can't finish until they have.</p>
    </div>
  </div>
</section>`)}</div>` : ""}
<div class="two-up" data-key="submitted-tiles">
  <section class="card card--p20">
    <h2 class="tile-title">Something to do while you wait</h2>
    <p class="tile-body">Add your prices and plans now and you'll be able to sell the moment you're approved.</p>
    <button type="button" class="btn btn-outline btn-tile">Set up your prices</button>
  </section>
  <section class="card card--p20">
    <h2 class="tile-title">${v.othersTitle}</h2>
    <p class="tile-body">${v.othersBody}</p>
    <span class="ok-line">${icon("check", 14, "i-b")}${v.ownersIdLabel}</span>
  </section>
</div>`;
  }

  function rfiView() {
    return html`<div class="callout callout--warning" data-key="rfi-alert" role="status">
  ${icon("alert", 18)}
  <div><div class="warn-title">Just one thing to sort${pin("rfi-not-restart")}</div><div>You're not back at the start. Fix this one item and the checks carry on exactly where they left off, usually within the hour.</div></div>
</div>
<section class="card" data-key="rfi-card">
  <h1 class="rfi-title">The address on your bank verification doesn't match your registered address</h1>
  <p class="rfi-body">Your bank letter shows <span class="mono">1140 SW Alder St</span>, but Riverside Pilates LLC is registered at <span class="mono">418 SE Water Ave</span>. Send us either a letter showing the registered address, or a utility bill for the Alder St site.</p>
  <div class="btn-row">
    <button type="button" class="btn btn-primary btn-md" data-click="${on(() => setState({ screen: "submitted" }))}">${icon("upload", 17)}Upload a replacement</button>
    <button type="button" class="btn btn-neutral btn-md btn-tight">Have a chat about it</button>
  </div>
  <p class="rfi-foot">${icon("check", 14, "i-ok")}Identity, ownership, tax, processing and signature checks are all complete and stay complete.</p>
</section>`;
  }

  function approvedView(v) {
    const stat = (label, value, mono) => html`<div class="card card--p20"><div class="stat-label">${label}</div><div class="stat-value${mono ? " mono" : ""}">${value}</div></div>`;
    return html`<section class="approved" data-key="approved">
  <span class="approved-tag">${icon("check", 13, "i-b")}Approved in 1 hour 12 minutes</span>
  <h1 class="approved-title">Riverside Pilates is approved</h1>
  <p class="approved-body">Your application has been approved. Add a merchant to start taking transactions, then invite your team and order card readers.</p>
  <div class="btn-row">
    <button type="button" class="btn btn-light btn-lg">Add a merchant</button>
    <button type="button" class="btn btn-on-dark btn-lg">Open payments dashboard</button>
  </div>
</section>
<div class="stats" data-key="approved-stats">
  ${stat("Merchant ID", "XPL-4471-0092", true)}${stat("Payouts to", v.payoutAccountLabel)}${stat("Descriptor", state.a.descriptor || "Not set", true)}${stat("First payout", "Next business day")}
</div>
<section class="unlock" data-key="approved-unlock" aria-labelledby="unlock-h">
  <h2 class="unlock-title" id="unlock-h">Now that you're approved</h2>
  <p class="unlock-sub">These need a live account, so they were waiting on this.</p>
  <div class="unlock-grid">
    <article class="card card--p20">
      <div class="unlock-head"><span class="icon-tile">${icon("users", 17)}</span><h3 class="tile-title">Invite your team</h3><span class="pill pill--positive">Unlocked</span></div>
      <p class="tile-body">Add managers, bookkeepers and front-desk staff to your Xplor Pay account, and choose what each person can see and do.</p>
      <button type="button" class="btn btn-outline btn-tile">Invite people</button>
    </article>
    <article class="card card--p20">
      <div class="unlock-head"><span class="icon-tile">${icon("card", 17)}</span><h3 class="tile-title">Order card readers</h3><span class="pill pill--positive">Unlocked</span></div>
      <p class="tile-body">Get readers for the counter or for taking payments around the studio. Delivery timing is shown when you order.</p>
      <button type="button" class="btn btn-outline btn-tile">Order devices</button>
    </article>
  </div>
</section>`;
  }

  function statusView(v) {
    return html`<div class="status" data-key="status">
  <div class="status-inner">
    ${state.screen === "submitted" && submittedView(v)}
    ${state.screen === "rfi" && rfiView()}
    ${state.screen === "approved" && approvedView(v)}
  </div>
  <div class="jumpbar" data-key="jumps" role="group" aria-label="Prototype: jump to a status">
    <div class="jumpbar-inner">
      <span class="jumpbar-label">Prototype · jump to</span>
      ${v.statusJumps.map((j) => html`<button type="button" class="btn btn-soft btn-2xs btn-jump" data-click="${on(j.go)}">${j.label}</button>`)}
    </div>
  </div>
</div>`;
  }

  function saveView(v) {
    return html`<div class="backdrop" data-key="save">
  <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="save-title" aria-describedby="save-sub">
    <div class="dialog-head">
      <span class="icon-tile icon-tile--positive">${icon("check", 18, "i-b")}</span>
      <div class="grow">
        <h2 class="dialog-title" id="save-title">Don't worry, it's all saved</h2>
        <p class="dialog-sub" id="save-sub">${v.saveProgressNote}</p>
      </div>
      <button type="button" class="icon-btn" aria-label="Close" data-click="${on(closeSave)}">${icon("x", 18)}</button>
    </div>
    <p class="dialog-body">Come back any time with the link in your email. We'll send you a code to open it.${pin("return-via-email-link")}</p>
    <p class="dialog-body">Send a link to whoever should pick it up — your bookkeeper for the bank details, say, or a co-owner for their own ID. They'll land exactly where you left off and only see the parts that are theirs.</p>
    <form class="dialog-form" data-submit="${on(() => { if (!SAVE_EMAIL_OK.test(state.saveEmail.trim())) { setState({ saveEmailErr: "Enter an email like name@example.com." }); return; } closeSave(); })}"${state.saveEmailErr ? html` data-error="1"` : ""}>
      <label class="sr-only" for="save-email">Email address to send the link to</label>
      <input class="input" id="save-email" type="email" value="${state.saveEmail}" placeholder="name@example.com" autocomplete="email" spellcheck="false" data-input="${on((e) => setState({ saveEmail: e.target.value, saveEmailErr: "" }))}" data-blur="${on(() => setState({ saveEmailErr: state.saveEmail.trim() && !SAVE_EMAIL_OK.test(state.saveEmail.trim()) ? "Enter an email like name@example.com." : "" }))}">
      <button type="submit" class="btn btn-primary btn-md">Send link</button>
    </form>
    ${state.saveEmailErr && html`<p class="field-error" role="alert">${state.saveEmailErr}</p>`}
    <p class="dialog-foot">${icon("lock", 14)}The link expires in 7 days and only works for that email address.${pin("save-link-scope")}</p>
  </div>
</div>`;
  }

  function delegateView() {
    const target = state.owners.filter((o) => o.id === state.delegateTarget)[0];
    const who = target ? ownerInfo(target).name : "this person";
    return html`<div class="backdrop" data-key="delegate">
  <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="delegate-title" aria-describedby="delegate-sub">
    <div class="dialog-head">
      <span class="icon-tile">${icon("mail", 18)}</span>
      <div class="grow">
        <h2 class="dialog-title" id="delegate-title">Send ${who === "New owner" ? "them" : who} a link</h2>
        <p class="dialog-sub" id="delegate-sub">They only see their own details and photo ID.</p>
      </div>
      <button type="button" class="icon-btn" aria-label="Close" data-click="${on(closeDelegate)}">${icon("x", 18)}</button>
    </div>
    <p class="dialog-body">Enter the email of the person who will fill in these details. They won't see the rest of your application. You can carry on in the meantime, and we'll show here when they're done.</p>
    <form class="dialog-form" data-submit="${on(sendDelegate)}"${state.delegateErr ? html` data-error="1"` : ""}>
      <label class="sr-only" for="delegate-email">Email address to send the link to</label>
      <input class="input" id="delegate-email" type="email" value="${state.delegateEmail}" placeholder="name@example.com" autocomplete="off" spellcheck="false" data-input="${on((e) => setState({ delegateEmail: e.target.value, delegateErr: "" }))}" data-blur="${on(() => setState({ delegateErr: state.delegateEmail.trim() && !SAVE_EMAIL_OK.test(state.delegateEmail.trim()) ? "Enter an email like name@example.com." : "" }))}">
      <button type="submit" class="btn btn-primary btn-md">Send link</button>
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
    ${need("file", "A photo ID", "A passport or driver's license. You can take the photo on your phone.")}
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
      <button type="button" class="icon-btn" id="help-close" aria-label="Close" data-click="${on(closeHelp)}">${icon("x", 18)}</button>
    </div>
    <ul class="help-list">
      <li><span class="help-label">Call us</span><span class="help-value mono">${SUPPORT_PHONE}</span><span class="help-note">${SUPPORT_HOURS}</span></li>
      <li><span class="help-label">Chat</span><span class="help-value">Replies in about 3 minutes</span><span class="help-note">Same hours</span></li>
      <li><span class="help-label">Email</span><span class="help-value">support@xplorpay.example</span><span class="help-note">We reply within one business day</span></li>
    </ul>
    <p class="dialog-foot">${icon("lock", 14)}We will never ask for your full SSN, password or bank login over chat, phone or text.</p>
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
        if (key === "data" || key === "link") { restored = false; resetData(); }
      };
      return html`<label><span class="field-label field-label--block">${label}${pinId && pin(pinId)}</span><select class="input" data-input="${on(pick)}">${options.map((op) => html`<option${attr("selected", ctx[key] === op)}>${op}</option>`)}</select></label>`;
    };
    return html`<div class="proto" data-key="proto">
  ${state.protoOpen && html`<div class="proto-panel" id="proto-panel" data-key="panel" role="group" aria-label="Prototype options">
    <div class="proto-title">Prototype options</div>
    ${select("Region", "region")}
    ${select("Chrome", "chrome")}
    ${select("Data", "data")}
    ${select("Link opened as", "link", "check-its-you")}
    <hr class="proto-rule">
    <div class="proto-sub">Owner links</div>
    ${state.owners.some((o) => o.status === "invited") ? state.owners.filter((o) => o.status === "invited").map((o) => html`<button type="button" class="btn btn-soft btn-xs proto-list" data-click="${on(() => { setState({ protoOpen: false }); previewInvitee(o.id); })}">Preview what ${ownerInfo(o).name === "New owner" ? o.inviteEmail : ownerInfo(o).name} sees</button>`) : html`<p class="proto-note">Send an owner a link in step 2, then preview their side here.</p>`}
    <hr class="proto-rule">
    <label class="proto-check"><input type="checkbox"${attr("checked", ctx.showNotes)} data-change="${on((e) => setCtx({ showNotes: e.target.checked }))}">Design decisions</label>
    <button type="button" class="btn btn-soft btn-xs proto-list" data-click="${on(() => setState({ notesListOpen: true }))}">${icon("pen", 13)}Read all ${DECISIONS.length}</button>
  </div>`}
  <button type="button" class="proto-toggle" data-key="toggle" aria-expanded="${String(state.protoOpen)}" data-click="${on(() => setState({ protoOpen: !state.protoOpen }))}">${icon("settings", 14)}Prototype options</button>
</div>`;
  }

  function appView() {
    const v = vals();
    return html`<div class="page" data-key="page">
  <div class="frame">
    ${v.showShell && !v.isEntry && shellView(v)}
    <div class="content" data-key="content">
      ${v.isEntry && entryView()}
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

    if (state.screen !== last.screen || state.step !== last.step || state.inviteStep !== last.inviteStep) {
      if (last.screen !== null) window.scrollTo(0, 0);
      const cur = STEPS[state.step - 1];
      document.title = (state.screen === "flow" ? "Step " + state.step + " of 7 · " + stepName(cur)
        : state.screen === "entry" ? "Check it's you"
        : state.screen === "welcome" ? "Business verification"
        : state.screen === "bizType" ? "Your business type"
        : state.screen === "invitee" ? "Owner details"
        : state.screen === "approved" ? "Approved" : state.screen === "rfi" ? "One thing to fix" : "Under review") + " · Xplor Pay";
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
    if (state.screen === "entry" && state.entryMode === "code" && last.entryMode !== "code") {
      const codeField = document.getElementById("entry-code");
      if (codeField) codeField.focus();
    }
    last = { screen: state.screen, step: state.step, inviteStep: state.inviteStep, delegateOpen: state.delegateOpen, saveOpen: state.saveOpen, helpOpen: state.helpOpen, viewDoc: state.viewDoc, entryMode: state.entryMode };
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
  // Leaving a field is when its problem, if any, is shown.
  root.addEventListener("focusout", (e) => {
    const id = e.target && e.target.id;
    // A website typed without a scheme gets https:// added as the person leaves the field, with no message (decision website-https).
    if (id === "f-website") {
      const w = String(state.a.website || "").trim();
      if (w && !/^[a-z][a-z0-9+.-]*:\/\//i.test(w)) set("website", "https://" + w);
    }
    if (id && id.indexOf("f-") === 0 && !state.touched[id.slice(2)]) setState({ touched: Object.assign({}, state.touched, { [id.slice(2)]: true }) });
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (state.viewDoc) closeDoc();
    else if (state.helpOpen) closeHelp();
    else if (state.delegateOpen) closeDelegate();
    else if (state.saveOpen) setState({ saveOpen: false });
    else if (state.whyOpen) setState({ whyOpen: false });
    else if (state.nextTip) setState({ nextTip: false });
    else if (state.infoOpen) setState({ infoOpen: false });
    else if (state.protoOpen) setState({ protoOpen: false });
  });

  render();
})();
