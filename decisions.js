/*
 * Design decisions register for the KYB onboarding prototype.
 * Loaded before app.js by index.html; app.js reads it as window.DECISIONS.
 * It lives in its own file so app.js stays small: this block is about 450KB.
 * Search it with DESIGN-DECISIONS-INDEX.md and `ruby tools/decision.rb <id>`, not by reading the file.
 */

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
window.DECISIONS = [
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
    "b": "The business description box that used to suggest a category is gone. Almost no merchant knows their merchant category code (MCC), so the field is a searchable list the applicant types into, by name or by four-digit code, and the list is short because it holds only the codes set up for their division (decision mcc-from-division). Under the field a short hint tells people who are unsure to search by a word that describes what they sell (see mcc-no-help-link). Nothing is suggested or pre-filled, and the category is required. Update, 2026-11-13: Ryan changed the link expiry from 7 days to 30 days, in the Save and exit dialog and for the temporary password in the welcome email (content-audit-should-fix). Not confirmed with Security.",
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
    "b": "Volume questions read as a test people can fail, so they stall on them or inflate them. Stating up front that estimates are expected, that they set limits rather than rates, and that going over one changes nothing, removes the reason to stall. Update, 2026-11-11 (Ryan): the line under the numbers saying that going over one of the limits breaks nothing has been removed from Your card volumes, because the maximum single transaction is now a hard block (see max-ticket-hard-block). The title, the “Best guesses are fine” line and the plain wording of the questions stay; only the promise that going over changes nothing is withdrawn. Update, 2026-11-17 (Ryan): the line These set your limits, not your rate. is gone, because applicants are not to be told their answers set their limits (see limits-never-mentioned).",
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
    "b": "Step 4 asks for the account details directly: bank name, account holder, account type, and the routing and account numbers (institution, transit and account numbers in Canada). The earlier choice between connecting a bank and typing the details in is gone, along with the “30 seconds” and “+1 document” labels, the simulated bank login, and the lines on the welcome page and in step 4 that promised a faster route. Nothing proves the account on the spot any more, so the account is checked by Trulioo after submit (decision bank-verified-by-trulioo); an earlier version asked for a bank letter or voided check in step 6. Update, 2026-11-17: the typed account is saved when Save and continue is pressed with every field in, and shows as a saved account card afterwards (see bank-saved-as-account).",
    "tradeoff": "Typing numbers is slower and easier to get wrong than a bank connection, and a mistyped digit would send money to the wrong place; the check is Trulioo's, after submit. A connection could come back later as a second route, but it is not designed here.",
    "by": "Ryan",
    "when": "2026-10-07"
  },
  {
    "id": "bank-no-debit",
    "area": "Trust",
    "where": "Step 4 · Payout account",
    "t": "Say plainly that Xplor may debit the payout account for fees, chargebacks and refunds",
    "b": "Step 4 used to promise that Xplor could pay into the account but could not take anything out. Ryan decided on 2026-10-26 that this is not true: the merchant agreement lets Xplor Pay collect fees and recover chargebacks, refunds and returns by debit, so the promise is removed. The Settlement account card now says the account is where sales are paid and that Xplor may also take fees, chargebacks and refunds from it, as the agreement at step 7 sets out. The why-we-ask note says the same. Update, 2026-11-17 (Ryan): the grey callout carrying this line is removed from step 4, both on the form and on the saved account card, so step 4 no longer says the account may be debited for fees, chargebacks and refunds. Ryan gave no reason. The statement is still in the merchant services agreement at step 7, and nothing else on the form says it now.",
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
    "b": "The everyday copy sounds like a person talking you through it — “Let's get you set up”, “Step 1 starts with your EIN”, “Don't worry, it's all saved”. Anything about credentials, debit authority, sanctions screening or what is stored drops the warmth and states the fact plainly, because hedged language there reads as evasion. Update, 2026-11-13: in the secure number and money fields the Roboto Mono text is set to the Atlas code size (13px) instead of the 14px body size, so it reads the same size as normal text (mono-fields-match-text-size).",
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
    "b": "A wary tester stopped at the photo ID request because the welcome page never mentioned it and the only explanation named an unnamed partner. The ID number, the SSN or SIN and the photo ID row now each start with a one-line reason, the welcome page lists the documents needed at step 6, and its “owners” card now covers people who run an organization too. The verification partner is named in every place it appears (Trulioo, on Ryan's word), so there is a name to look up.",
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
    "b": "Getting paid and the documents that back it up are one preparation job, so they share a card: bank numbers, and the documents that back it up (the bank letter was removed later, decision bank-verified-by-trulioo). The line about a photo ID going up at step 6 was removed because it was unclear; the second card is titled “Details of the people who own your organization”. The page also sits closer to the top, as do all the steps.",
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
    "b": "A sole proprietor without an EIN has no EIN letter to add, so that row is not listed. A row like that used to stay on the page greyed out with a “Not needed” pill and an explanation, which added a line for something the applicant never has to do. Step 6 now lists only the documents still to add, the note above says how many are left, and the review summary no longer counts the ones that dropped away. Update, 2026-11-12: the EIN row no longer exists for anyone, so this case no longer arises (ein-bn-document-removed).",
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
    "b": "The baker in the persona tests looked for someone to call before she would give an SSN, and the welcome page offered only a small privacy link that never named who checks her identity. The page now carries a line stacked just above the privacy link, “Want to talk to someone first?”, with the support number and hours, and the privacy note says identity checks are done by Trulioo, our verification partner. The number and hours are the same constants the Get help panel uses, so they change in one place. Changed on 2026-10-22: the privacy note moved into the description and the support line was replaced by a Get help button (decision welcome-help-and-info-in-header).",
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
    "id": "bank-verified-by-trulioo",
    "area": "Flow",
    "where": "Step 6 · Documents, and step 4 · Payout account",
    "t": "Step 6 no longer asks for proof of the bank account",
    "b": "The Bank account verification row (a voided check or void cheque, a bank letter, or a recent statement) is gone from step 6, in both regions and for every business type. Ryan says Trulioo, our verification partner, verifies bank accounts for us, so the applicant only types the account in step 4. The step 4 description, the line under the fields and the Why do you need my account details? note, the welcome page's bank line and the step 7 review row no longer mention a document, and the review row shows only the bank name and account type. The Banking Verification card on the More info needed screen is unchanged: it is what Ops can still ask for after submit. Earlier versions made the bank letter always required (decision bank-letter-always, 2026-10-07). Update, 2026-11-11: Ryan says Trulioo verifies bank accounts for the US but not for Canada. Step 6 still asks for no bank proof in either region, so how a Canadian account is checked is not decided. Update, 2026-11-13: for Canada only, a Bank account verification row is back on step 6 (ca-bank-proof-row), because Trulioo cannot verify Canadian bank accounts. The US still asks for no bank proof.",
    "tradeoff": "That Trulioo verifies bank accounts is relayed by Ryan, not from a document; Trulioo or compliance should confirm it covers US and Canadian accounts and what happens when an account cannot be verified (the Banking Verification request is the likely route). A mistyped number is now caught only after submit, not by a document at step 6. Step 6 has one less file to find, which was the most common place people got stuck without the paper in hand.",
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
    "b": "The Get help button in the step list now has the Back button's dark grey text and outline instead of purple, and keeps its white background. The “Why are we asking?” line under each step's description is in normal text colour and turns purple only on hover or keyboard focus. Its size and the purple question icon are unchanged. The “No one added yet. Add each owner…” note on step 2 is removed, for both company and non-profit wording, so an empty list shows just the add button. Update, 2026-11-17 (Ryan): Get help moved into the top bar beside Save and exit, and is no longer under the step list (see get-help-in-top-nav).",
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
    "b": "Cards that can't be clicked (the main surface cards, owner cards, the review summary, the status hero card, document rows and the what-you-need panel) now carry almost no drop shadow, down from the Atlas xs elevation to a 1px faint contact line, so the 1px border does the work of separating them from the page. Anything clickable keeps its shadow and hover treatment: buttons, the business-type radio cards, the Yes / No control. The shadow is one variable, --lift-static in app.css, so it can be nudged in one place. Update, 2026-11-17: --lift-static is removed and the cards carry no shadow at all (see foundations-raw-values-sweep).",
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
    "b": "The limits under the tick on step 3 (moved into Your card volumes, see limits-ack-in-volumes) are no longer fixed sample numbers. The per-transaction limit is what the applicant entered as their maximum single transaction, and the monthly limit is their estimated monthly card volume, so the hint changes as they type. The label reads I've read the transaction and monthly limits for my business, because those are the two limits shown. Until both fields are filled in, the tick is greyed out and cannot be used, and the hint under it says what to enter above and that the tick opens up afterwards. The tick does not show the usual Tick this to continue error while it is waiting, because the two fields above already show their own errors. If either limit changes after the tick was given, or a field is emptied, the tick clears, so the applicant has to read the new numbers and tick again. Retyping the same amount in a different format, such as 40000 for 40,000, does not clear it. Update, 2026-11-11: the hint under the tick now reads “We block any single transaction over $X. Your monthly limit is $Y. Both are based on what you entered above. Ask us any time to raise them.” (see max-ticket-hard-block). Update, 2026-11-17: the tick was removed (see limits-tick-removed).",
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
    "b": "The document viewer has a Download button beside Close, so the applicant can send the terms to a legal team before signing. In the prototype it saves the sample text as a plain text file. The real product would give the same versioned PDF the viewer shows. Update, 2026-11-11: the viewer is now opened from the View buttons at step 6 (sign-on-step-6). The Download button is unchanged. Update, 2026-11-11 (later): the Sign it off card is back at the end of step 7, as the last thing before Submit (sign-back-on-step-7); where this entry says step 6, read step 7. Update, 2026-11-12: there is now one combined document, so one Download (agreement-and-privacy-one-document).",
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
    "tradeoff": "Not yet known: which documents count as financial history (statements, tax returns, accounts), whether a start-up with less than two years has another route, whether it applies to non-profits, and whether it is required before submit. The row wording is a draft, not approved copy. Update, 2026-11-11: Ryan is still waiting on an answer for what happens when the business is under two years old. Update, 2026-11-12: Ryan says the two years of financial history are no longer needed for the division-specific prototype option, so the Two years of financial history row is gone from step 6 and Club Essentials adds no document. Club Essentials still changes the merchant category list (14 codes for ClubReady, 20 for Club Essentials, 32 for Standard). Ryan gave no reason; the open question about businesses under two years old no longer applies. Update, 2026-11-12: Ryan removed the Club Essentials option because, with the financial history row gone, it no longer differs from the normal flow (club-essentials-option-removed).",
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
    "tradeoff": "The rule is Ryan's; no source document was checked. The Know your customer request on the More info needed screen no longer lists a Social Security card as an accepted document on this route (Ryan, 2026-10-27); the same card still lists it for companies and sole proprietors. Whether the identity check can work without the number is for Trulioo and compliance to confirm.",
    "by": "Ryan",
    "when": "2026-10-27"
  },
  {
    "id": "division-option",
    "area": "Flow",
    "where": "Prototype options · Division",
    "t": "A Division option shows what changes for ClubReady and Club Essentials",
    "b": "Prototype options has a Division select: Standard, ClubReady or Club Essentials (address ?division=clubready or ?division=ce). It stands in for the Xplor Pay admin portal, where an Ops user sets the division before the form opens. Choosing a division other than Standard opens step 6 directly, with the sample business filled in, and shows only that step. The row that exists only for that division has a dashed orange outline and a tag (ClubReady only, Club Essentials only). ClubReady adds a Signed lease, business licence or utility bill row; Club Essentials adds a Two years of financial history row. The rest of the flow is not shown and is the same as Standard. Update, 2026-11-12: Club Essentials no longer adds a Two years of financial history row (club-essentials-financial-history), so only ClubReady changes step 6; Club Essentials still changes the merchant category list on step 1. Update, 2026-11-12: the Division select now offers only Standard and ClubReady; Club Essentials was removed (club-essentials-option-removed), so only ClubReady changes step 6.",
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
    "b": "Step 4 asks for one settlement account, the one that must match the legal name. Applicants cannot add further accounts here. The step description says that once approved they can add more accounts for their other merchants. A business such as a golf and country club can have a restaurant with its own bank account, but that is a separate merchant under the same business, set up after approval, not a second payout account on this application. A bank account held by a different legal entity is not an extra account: it needs its own application. Underwriting therefore reviews one legal entity and one verified bank account (decision bank-verified-by-trulioo). This replaces the earlier optional Add another bank account link built on 2026-11-02. Update, 2026-11-17 (Ryan): the step 4 subtitle now ends Once you're approved, you can add more accounts. with no for your other merchants. Ryan gave no reason; it no longer explains what the other accounts are for.",
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
    "b": "The line at the bottom of the under review card now reads \"If we have a question, we'll send you an email. Reply to it and we'll carry on from there.\" (Reworded 2026-11-09, see more-info-by-email: it used to say \"and you'll respond to us here\", when the applicant answered on the page.) It used to say the question would appear on the page as one clear request, which left out how the applicant would know there was one. The email is what brings them back and is also where they answer. The Application received line also stops naming Trulioo and says it was sent to our verification partner, matching the rest of the prototype's wording for the identity check.",
    "tradeoff": "It promises an email for every question, so the More info needed email has to be sent whenever Ops asks for something (the template exists; nothing connects Ops picks to it yet). Step 7's What happens next panel and the why-we-ask notes still name Trulioo; only the under review page was changed.",
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
    "tradeoff": "The three division lists in the prototype (Standard 32 codes, ClubReady 14, Club Essentials 20) are invented stand-ins, not Ops's lists, and every MCC in them comes from mcc-codes.js, which was written from general knowledge and is unchecked. If a division list has only one code the field could be pre-filled; not designed. The division changes the list only; the prototype's Division option still opens on step 6 with the sample business filled in, so step 1 is reached by going back. Update, 2026-11-12: Club Essentials and its 20-code list are gone, so the prototype has two division lists, Standard 32 codes and ClubReady 14 (club-essentials-option-removed).",
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
    "b": "From the refinement session with engineering. The lookup went because of what it can actually do. Trulioo can only prefill an address from a lookup, it needs the business's name and country to do it, and it then returns every business that shares that name in that country. The applicant could be shown a long list of possible matches, or have the wrong business prefilled, all so that they save typing an address. That is a bad trade, so the lookup, the Look up button, Enter details manually, the Is this your business? question and the match toasts are removed, and the whole of step 1 shows from the start. The EIN (Business Number in Canada) is now an ordinary field in the Registered details card, with the legal name, Doing business as, structure, date and state. A company or a non-profit has to give one; for a sole proprietor it is optional, and the hint says that without one they give their SSN (SIN in Canada) in step 2 instead. It is checked for nine digits, an SSN-shaped number is refused with a plain message, and a Canadian number pasted with its program account (RT0001) is cut back to the nine digits as the person leaves the field. The layout puts the legal name beside the EIN for a company, and Doing business as beside it for a non-profit and a sole proprietor. Nothing is filled in from the number. The address is typed in the Addresses card. The copy that went with the lookup is changed: the welcome page's registration line now says what Step 1 asks for, the why-we-ask note says the details should match the tax documents added in step 6, the line about protecting the EIN at the lookup is gone, and the confirmation's checking line names the business details for a company or non-profit. With no registry match to waive it, the EIN letter is now always required in step 6 for a company or non-profit in the US (a sole proprietor adds it only if they gave an EIN). There is no separate proof-of-registration document: the EIN letter (in Canada, a CRA business number confirmation) and the US W-9 are the documents that back the details.",
    "tradeoff": "The applicant types more, and a typo in the name, structure, date or address is no longer caught by a match. Nothing checks the entity's existence against a registration document. Ops should confirm that the EIN letter (CRA business number confirmation in Canada) and the W-9 are enough. The earlier decisions that described the lookup are removed (lookup-first, lookup-not-me, lookup-progressive, lookup-clears-refused-number, welcome-registry-promise-softened). If Trulioo can later return a single reliable match, an address prefill could come back as an option; it is not designed. The EIN is checked only for nine digits, not against any record. Update, 2026-11-11: Ryan added a Find your business search back on step 1 as a type-ahead with a Prototype option to switch it off (business-lookup-typeahead), after reading Trulioo's KYB Prefill page. The EIN is still a typed field and is not filled in from it. Update, 2026-11-12: step 6 no longer asks for the EIN letter or the CRA confirmation (ein-bn-document-removed), so Ops's question about whether the EIN letter is enough no longer applies; Ryan says Trulioo validates the number.",
    "by": "Ryan",
    "when": "2026-11-05"
  },
  {
    "id": "ca-bn-confirmation-document",
    "area": "Flow",
    "where": "Step 6 · Supporting documents (Canada)",
    "t": "Canadian businesses add a CRA business number confirmation, the counterpart of the US EIN letter",
    "b": "In the US, a company or non-profit adds the IRS EIN letter; a Canadian one now adds a CRA business number confirmation. The row accepts any one of four documents: the CRA business registration confirmation printed from Business Registration Online, the CRA's RC145 confirmation letter, a Filing and Balance Confirmation letter downloaded from CRA My Business Account, or articles of incorporation that show the business number. It follows the same rule as the EIN letter: required for a company or non-profit, and for a sole proprietor only if they gave a business number in step 1. The US W-9 is still US only, so Canada has no tax-form row. Update, 2026-11-12: the Canadian CRA business number confirmation row is gone. Ryan says Trulioo will validate the number, so the document is not needed to evidence it (ein-bn-document-removed).",
    "tradeoff": "The four documents come from Ryan's notes drawn from public pages, not from an Xplor or CRA source, and the row title and wording are my draft. Ops should confirm which of them underwriting accepts, and whether Trulioo's check of the business number could make the upload unnecessary. Accepting articles of incorporation means a registration document is allowed here even though the US has no separate registration proof.",
    "by": "Ryan",
    "when": "2026-11-05"
  },
  {
    "id": "top-nav-save-exit",
    "area": "Layout",
    "where": "Every screen except the welcome email · top of the page",
    "t": "A thin top bar carries the logo and Save & Exit",
    "b": "Every screen except the welcome email has a thin bar across the full width of the window, with the Xplor Pay logo at the left and a Save & Exit button at the right, lined up with the edges of the step content below. It stays in view as the page scrolls, and the progress list and the pinned step title sit under it. Save & Exit shows only where there is an application to save: the seven steps (changed on 2026-11-09 by save-exit-after-first-step: it no longer shows on the welcome page or the business type page). The sign-in screens, the business picker, the status screens and the invited owner's screens show the logo alone. Save & Exit replaces the Finish later button in the footer, so the footer now holds only Back and Save and continue. It opens the same dialog, which says the answers are saved and how to log back in. The logo that sat above the progress list moved into the bar. Update, 2026-11-17 (Ryan): Get help moved into the top bar beside Save and exit, and is no longer under the step list (see get-help-in-top-nav).",
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
    "b": "Under the list of business types, above the Back and Continue buttons, a small line of plain caption text says: Choose carefully. If you carry on and later come back here to change your business type, anything you've entered will be lost. It has no box, icon or colour so it does not compete with the choice itself. It is true to how the prototype behaves: choosing a different type after one was already chosen clears the answers. Update, 2026-11-12, Ryan: the note is removed. The screen now goes straight from the list of business types to Back and Continue. Changing the type after choosing one still clears the answers; the screen just no longer says so.",
    "tradeoff": "Small and quiet means some people will not read it. The alternative, asking for a confirmation each time someone changes type, would be louder and slower for the people who did choose on purpose. With the note gone, an applicant who comes back to change the type loses what they entered without having been told.",
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
    "b": "The tick I've read the transaction and monthly limits for my business used to sit at the bottom of the How you'll appear to customers section, away from the numbers. It is now the last item in Your card volumes, directly under Estimated monthly card volume, Average transaction amount, Maximum single transaction and Card present %. It behaves as before (see limits-from-entries): greyed out until the monthly volume and maximum transaction are filled in, showing the two limits as the applicant types, and clearing if either number changes. Update, 2026-11-11: Have you accepted card payments before? and its follow-ups now sit in this section too, above the tick, so the tick is still the last item (see card-history-in-volumes). Update, 2026-11-17: the tick was removed (see limits-tick-removed).",
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
    "b": "Applicants may be waiting on a number, a document or a person, so steps 1 to 6 no longer hold Save and continue back until every required answer is in. The button is always on, and pressing it saves what is there and moves to the next step. The left column now says where each opened step stands: Done with a green tick when everything required is in, or a percentage done when something is missing (changed on 2026-11-09 by step-percent-done: it first said Partly done in the warning colour, with no percentage). Applicants can return to any step they have opened by choosing it in the left column or by pressing Back, and can fill the rest in then. Steps not yet opened cannot be chosen from the left column. On the last step's summary, each section shows a green tick circle only when its step is complete; a step that is only partly done shows a half-filled circle in the warning colour instead. The link at the end of that row says Continue instead of Edit, since the applicant is finishing the step and not changing it (same screen and Save button as Edit). The half circle is the whole icon, the same size as the tick circle, with nothing drawn inside it. Step names stay on one line: the left column is a little wider, and the Partly done label has no icon so it does not take up extra room. Only a bad entry is flagged before the end (decision errors-only-for-bad-entries); a field left empty shows nothing. The final step is different: Submit for verification stays off until every step is complete and the signature is typed, and its hover note lists each earlier step still only partly done as well as what is missing on the page. Update, 2026-11-17: step 4 is now the exception; Save and continue stays off there until every bank field is in, and it saves the bank account (see bank-saved-as-account).",
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
    "b": "A dollar sign does not say which dollar, and the product serves both the US and Canada, so every amount field now ends with the currency code: USD for a United States application and CAD for a Canadian one. The field reads as three parts: the dollar sign, the amount, and the code in a small separate tab at the right end with a pale grey fill and a hairline divider, the way payment forms from Stripe and similar products show it. The numbers use equal-width digits so figures line up as they are typed. The code is fixed by the application's region and cannot be changed here. It applies to the estimated monthly card volume, average transaction amount, maximum single transaction and the monthly EFT or ACH volume. Update, 2026-11-16: the code is now plain Amount/Small text inside the same box rather than its own shaded cell (see atlas-currency-input).",
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
    "b": "Required fields are only enforced at the very end, when the applicant submits, so leaving a field empty no longer shows a message when the applicant clicks into it and out again. A wrong entry still does: an answer that is there but not valid, such as an email without an at sign, a routing number that is not 9 digits, a phone number that is too short or a date in the wrong format. It shows when the field is left. Pressing Save and continue, or Save & Exit, with a wrong entry on the step does not save or move on: the page scrolls to the first field with a problem, puts the cursor in it, and the message stays until it is put right. Empty required answers never stop either button, and the step still shows as Partly done in the left column. On the final step, pressing Submit for verification still lists everything that is missing. Replaces the earlier behaviour (decision partial-steps-allowed, first version) where each empty field flagged itself when it was left. Update, 2026-11-17: on step 4 an empty required field does stop Save and continue, because the back end only stores a complete bank account (see bank-saved-as-account).",
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
    "b": "Clicking anywhere in an owner card's header (avatar, name, role line or empty space) opens or closes the card, and the header shows a pointer. The Open and Collapse words are gone: the toggle is a single chevron icon at the far right that turns over when the card is open, and it keeps a label (Open or Collapse, with the owner's name) for screen readers. The card's chevron is the more prominent one (20px, primary icon colour) and the chevrons on the sections inside the card are smaller and lighter (16px, secondary icon colour, primary on hover), with both centred on the same vertical line. Remove now comes before the chevron, so the chevron is the last thing on the row, and it is the Atlas tertiary negative button: no fill, error-coloured text and trash icon, and a subtle error-coloured fill on hover or press. Clicking Remove removes the owner and does not also open or close the card. Update, 2026-11-13: the section chevrons now point down when closed and turn up when open, like the card's (accordion-chevrons-match); they no longer start turned 90 degrees.",
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
    "b": "On the in-app More info needed screen every reason keeps its own title, its line on why we need it and its list of what we accept, but all of them are answered the same way: a Choose file button (Add another file once there is one) and a Message for our team box. Cards such as the website address, check your sales numbers, tell us when customers get what they pay for, remove the credit freeze and update your website no longer have their own fields or buttons. No card shows a Required, Write an answer or Done badge, nothing is pre-filled from step 3, and nothing is checked. Send to our team is on once any card has a file or a message and nothing is still uploading. Ryan's reason: Trulioo does not check this information again, a person only reviews it, so a text box is enough, even for a request such as Enter your website. The message box label has no (optional) tag any more, because nothing around it is required. Update, 2026-11-11: Ryan says applicants must reply to every request to be able to send. Send to our team now stays off until every card has a file or a message (and nothing is still uploading), and the line under it reads Add a file or write a message for every request to send. This replaces the line above saying Send is on once any card has a file or a message. Nothing on a card is marked Required, and nothing checks what the reply says. Update, 2026-11-16: the Choose file and Add another file buttons are replaced by the File drop zone (see more-info-file-drop).",
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
    "b": "The Estimated monthly ACH volume (EFT in Canada) box is optional but starts with 0 in it, because the back end needs a valid value. If the applicant clears it and leaves the box, it fills with 0 again, so the stored answer is never empty. Typing an amount replaces it. The card stays collapsed by default, so most applicants never see the 0. Update, 2026-11-13: the card is no longer collapsed by default; it is always shown (ach-field-always-shown), so the 0 is visible.",
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
    "tradeoff": "Zeros in an SSN box can look like a real answer to anything that reads the form later. The tick is kept as its own answer so the two cases can be told apart, but whether Trulioo or Ops accept an owner with no SSN, and what they need instead, is not confirmed. The earlier hint about an ITIN (in the why note under the box) is still there for someone who has a different number.",
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
    "b": "Ryan: what you're agreeing to moves into the signing section as checkboxes, with a simple hyperlink in the checkbox text to view the document. Sign it off now holds the signatory name and title, a What you're agreeing to heading with two required tick boxes (I accept the Xplor Pay merchant services agreement; I accept the privacy policy and terms of service), then the signature. The document name in each box is a link that opens the same reader as before without toggling the box. The separate What you're agreeing to card and its View buttons are gone. The e-sign tick and the authority tick stay removed: the note under the signature says that by signing the person agrees to sign electronically and confirms they are authorized to sign for the business. An untick shows Tick this to sign. when the applicant tries to submit; nothing requires the documents to have been opened. Update, 2026-11-11 (later): the Sign it off card is back at the end of step 7, as the last thing before Submit (sign-back-on-step-7); where this entry says step 6, read step 7. Update, 2026-11-12: the privacy tick and document are merged into the agreement (agreement-and-privacy-one-document), so there is one tick and one link.",
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
    "b": "Ryan: remove the 1 uploaded badge. When something is uploaded, the Required badge is removed and nothing replaces it. The uploaded file tiles under the row, and the row's border, already say it is done. A row with no file keeps its Required or Optional badge; a row whose only file failed keeps it too. Update 2026-11-12: a Done badge was tried on finished document cards (doc-done-badge) and then reversed at Ryan's word, so this decision stands as written: no badge once a file is in.",
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
    "b": "Ryan: the Identity verification section is required but easy to pass by, so each section heading (Personal details and Identity verification) now shows its state beside the title, not beside the chevron (moved there on 2026-11-11 at Ryan's request, having first been at the right), whether the section is open or closed. Until the applicant has entered something in it (or nothing valid is in, on a listed owner) it reads Not started in the warning colour; starting values such as Director and 10%, or a country filled in for them, do not count as a start on an owner they added. Once some of the required answers are in it reads, for example, 3 of 6 done in the purple (brand) colour. When all are in it is replaced by a green tick circle (the same one the review summary uses), with Complete for screen readers. The count is the required answers that are filled in and valid out of the required answers in that section; optional boxes (the middle name) and the SSN tick are not counted, and a non-profit has no SSN or ownership percentage so its counts are smaller. Ryan chose this from four options and dropped the word Required from the chip. Nothing is blocked or opened for the applicant: an empty required field still shows no error (errors-only-for-bad-entries), and the sections still open and close on their own. Superseded in part, 2026-11-11: prefilled values now count, and the Not started exception for added owners is gone (see status-chip-counts-prefilled). Update 2026-11-12: a finished section no longer shows the round green tick; it shows a green Done badge with a tick (pill--positive) beside the section title. Ryan asked for this on the owner sections; the same badge on the document upload cards was a misreading and was reversed (doc-done-badge). Ryan gave no other reason. Update, 2026-11-12, Ryan: the partly done chip (N of M done) uses the Atlas info badge colours instead of the brand ones, so the three states read as Done (green), N of M done (info grey) and Not started (orange), and purple is kept for actions and selection. Update, 2026-11-13: a partly done section (N of M done) now uses the warning (orange) badge, the same as Not started, until it is complete, and turns green with Done only when finished (section-chip-warning-until-done). This replaces the grey info badge from 2026-11-12.",
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
    "b": "Ryan: Trulioo's KYB Prefill can search by country and business name and return matching businesses with their address, so step 1 has a simple country and business name search again (the registry lookup was removed in ein-in-registered-details). A Find your business card sits above Registered details, for a company or non-profit; a sole proprietor is not offered it, because they are a person and not a registered business. The country starts as the applicant's region, and changing it changes the region. After three characters the name box lists matching businesses as the applicant types, up to five, each with the registered name, its address and, when other businesses share that name, a line saying how many do and asking them to check the address is theirs. Picking one fills in the legal name and the registered address (the address boxes open so the parts can be checked) and shows a green confirmation with the name and address, a reminder to check them against the registration, and a Search again link. Nothing else is filled in: not the EIN, the date, the state of incorporation or the structure. The last row of the list is always Can't find it? Enter details manually, and no match says so in the list; either one leaves the card as a one-line note with a link back to searching. The card is optional and never counts towards the step, and every field below stays editable. A Prototype option, Business lookup (step 1), switches it off, so the card is not shown and everything is typed in, as before; the default is on. Trulioo's page says the search is made for search-as-you-type, takes optional state and city, caps the list with a limit, ranks by confidence and returns a count of other businesses with the same or similar name. In the prototype the list is a short fixed set per country with several businesses sharing a name, and a short wait stands in for the request. Update, 2026-11-11 (same day): Ryan asked for two changes. Opening the box before typing now lists five of the sample businesses so there is something to pick straight away, and from three characters the list is the search. And the rest of step 1 (Registered details, Addresses, How we reach you, What the business sells) is not shown until a business has been picked from the list or the applicant has chosen Can't find it? Enter details manually, so the lookup is the first thing they see. A business whose name is already in (a returning applicant, the sample business, or someone who pressed Search again after picking) keeps the sections showing, and once a business has been picked or manual entry chosen the sections stay shown even if the name is later cleared. The hidden fields still count towards the step's progress, so step 1 does not read as done while it is hidden. Ryan gave no reason for either change. Update 2026-11-12: the Country select is replaced by a State select (Province in Canada); see business-lookup-state. Update, 2026-11-12, Ryan: the line under a result saying how many other businesses share its name and asking the applicant to check the address is theirs is removed, so each row is only the name and address. The same-name samples stay in the list and are still ranked first; they just carry no warning. The Can't find it? Enter details manually row is now pinned to the bottom of the open list: the results scroll above it and it stays in view without scrolling.",
    "tradeoff": "Typing more does not reliably find the business: Trulioo's own page says businesses can share a name and it returns a duplicate count (the example shows 57), so the list can hold several identical names and only the address tells them apart. The applicant could pick the wrong one, and the name and address are filled in from it. There is no state or city box, so a common name cannot be narrowed except by reading addresses. Trulioo's page does not say how well it covers small businesses, sole proprietors or Canada, whether it returns an incorporation date, structure or EIN, or what each search costs, so none of those are assumed, and whether this is better than typing everything in depends on the answers. The real search needs a call from our back end with Trulioo credentials, never from the page. This partly reverses the removal in ein-in-registered-details, which closed by saying an address prefill could come back if Trulioo could return a reliable match. Hiding the sections means an applicant who already has everything to hand must still pick or press the manual link before they see a field, one extra step for them, and anyone who does not notice the manual link may think the form is only the search. Removing the same-name line means nothing now tells the applicant that a name is shared, so the wrong business is easier to pick; the only cue left is reading the addresses, and the manual row is the way out.",
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
  },
  {
    "id": "doc-why-we-ask-removed",
    "area": "Copy",
    "where": "Step 6 · Supporting documents",
    "t": "Document cards have no Why we ask helper text",
    "b": "Ryan: remove the Why we ask helper text on the document upload cards, because the why is already covered in the description's tooltip. The small Why we ask link under each card's description is gone, and the sentence behind it (the government ID card's \"To confirm you are who you say you are. It goes only to Trulioo, our verification partner.\") is deleted with it.",
    "tradeoff": "The reason for asking now lives only in the description tooltip, so an applicant who does not open it sees no explanation on the card. The Trulioo sharing line also stays on the step 6 callout (Files are stored encrypted and shared only with Trulioo), not on the ID card.",
    "by": "Ryan",
    "when": "2026-11-12"
  },
  {
    "id": "doc-done-badge",
    "area": "Visual",
    "where": "Step 6 · Supporting documents",
    "t": "A document card with what it needs shows a green tick Done badge",
    "b": "Ryan: he likes that the owner card shows a check mark when a section is done, and wants it kept in badge form, a green status badge reading a tick icon and Done. On a document card the badge sits in the title row beside the title once a file is in, in the place of the Required tag, in the success colours (pill--positive). It replaces the old state where a finished card showed no badge (no-uploaded-badge). The badge is not shown on a card marked Not needed, which keeps its muted pill. Read as applying to the document cards; the owner section keeps its round green tick, as before. Ryan gave no other reason. Superseded 2026-11-12, the same day: Ryan said this was a misreading. The badges on the document upload cards were fine as they were, and the request was about the owner sections, so the document card is back to showing no badge once a file is in (no-uploaded-badge stands). The owner sections got the green tick Done badge instead (section-status-chip).",
    "tradeoff": "The owner section's done signal is a round tick and the document card's is a badge with a word, so the two differ. A card with a failed upload and no good file shows no badge.",
    "by": "Ryan",
    "when": "2026-11-12"
  },
  {
    "id": "business-lookup-state",
    "area": "Flow",
    "where": "Step 1 · Find your business",
    "t": "The business lookup asks for a state or province, not a country",
    "b": "Ryan: the business's country is already known before the applicant enters the onboarding flow, so the lookup swaps its Country dropdown for a State dropdown (Province in Canada). This narrows the search, and the back end already knows the country. The select starts on Any state (Any province), so choosing one is optional. Update 2026-11-12, Ryan: make sure there are sample businesses in the lookup for whatever state is selected, using the same business names for every state and changing only the state and ZIP code in the address. So the opening list and the typed search show the same fake businesses for every state, with the state or province and the ZIP or postal code of each address swapped to the chosen one (street and city are left as they were, so a Seattle street can show a Texas ZIP; that is fine for a prototype). The same-name warnings therefore do not change with the state. The country comes from the prototype's Region setting. Ryan also asked that the lookup fields use the same label and field spacing as every other field: each label now sits in the standard field-head wrapper (6px under the label, as on the other step 1 fields) instead of directly against the box.",
    "tradeoff": "In the prototype the state does not really narrow anything: every state lists the same businesses, so it cannot show how a real state filter would cut down the same-name duplicates, and the made-up ZIPs are not real. With the real lookup a business outside the chosen state would not be found, which the Can't find it? row covers. The real lookup still needs Trulioo to confirm that a state filter is supported (the KYB Prefill page lists optional state and city).",
    "by": "Ryan",
    "when": "2026-11-12"
  },
  {
    "id": "dropdowns-atlas-menu",
    "area": "Flow",
    "where": "Every dropdown in the form: the business lookup State box, State of incorporation, address State or Province, the company type list, and the searchable lists (merchant category, address, business name)",
    "t": "All dropdowns share one Atlas Select and Menu look, with hover, keyboard highlight and a marked chosen item",
    "b": "Ryan: the lookup dropdown had no hover state, all dropdowns should be aligned in style, and they should use the Atlas design system wherever Atlas has a component for the case. Atlas has a Select (the closed field) and a Menu (the open list) but no autocomplete, so the searchable lists use the Menu look under a text field. Before this, the closed fields were Atlas-styled but the open list of a plain dropdown was the browser's own, which cannot be styled and looks different on every system, while the searchable lists had their own look with no hover. Now one component, selectView in app.js, draws every plain dropdown: the closed field is the same 40px text field with a chevron, and the open list is the Atlas Menu from the token repo. It sits on the raised-2 surface with the sm shadow (Atlas 0018: Menu and Select use shadow sm), has a 200px minimum width and 320px maximum height (component/menu tokens), items at the medium control height (32px) with the item padding, and normal body weight (400), and the highlight on background/hover (Atlas 0068), which is used for both mouse hover and the keyboard arrows. Moving the mouse moves the highlight, so only one row is ever highlighted. The chosen item is on the brand subtle fill in Control/Bold, with the normal text colour (Atlas 0071). Update, 2026-11-12, Ryan: the list text looked too thick, so standard dropdowns use normal body weight (400) and only lists that carry a heading line per row, the business lookup, are slightly heavier (Control/Default, 500, on the business name, with the address in the caption size below it and the Can't find it? row in the same weight). Update, 2026-11-12 (later), Ryan: three fixes. (1) An open list no longer floats over the sticky top bar and step heading when the page is scrolled: the list sits below them (z-index 5 against 10 and 20), so it slides under as the page moves. (2) Picking a state in the business lookup no longer opens the business name list; it only sets the state, and the list opens when the applicant clicks or types in the name box. (3) The chosen item is not purple: it keeps the normal text colour and is semi-bold (Control/Bold), as Atlas 0071 says, on the brand subtle fill; the purple text was my own addition and is removed, and the earlier weight of 500 for the chosen item is replaced by semi-bold. The keyboard works as in a native select: Enter, Space or an arrow opens it, arrows move, Enter picks, Escape closes, Home and End jump, and typing a letter jumps to the next item starting with it. The searchable lists (business name lookup, merchant category, address suggestions) share the same list look and the same hover. The only native select left is in the Prototype options panel, which is a tool for us and not part of the form.",
    "tradeoff": "A custom list is more code than the browser's own select and has to be kept accessible by hand: it has the combobox and listbox roles and keyboard handling but is not tested with a screen reader, and on a phone it gives up the native picker wheel that many people prefer. Atlas has no Select option, group or autocomplete tokens, so item height, padding and the highlight reuse the control and padding tokens and background/hover, per Atlas 0068 and 0084; if the designer adds dedicated tokens this should follow. The chosen item uses the fill and semi-bold weight but not a checkmark. An open list that stays open while the page is scrolled slides under the sticky headers rather than closing, so it can be half hidden until the applicant scrolls back. Long lists such as the 52 states scroll inside the 320px cap, so a state far down the list needs scrolling or typing its first letter.",
    "by": "Ryan",
    "when": "2026-11-12"
  },
  {
    "id": "lookup-confirmation-atlas-callout",
    "area": "Flow",
    "where": "Step 1 · Find your business, after a business is picked",
    "t": "The green confirmation after picking a business is the Atlas success Callout",
    "b": "Ryan: the green confirmation shown once a business is picked is a good idea but was not built from the Atlas component; it should be the Atlas success callout. It now follows the Atlas Callout in the Atlas Figma file, severity success: a flat block with no border or shadow on the success wash (background/success/subtle), radius/large (12px, where the old one used the 8px default radius), space/padding/surface padding, and a 16px circle-check icon in icon/success in a 20px-high slot. Beside the icon is the content: a text block with a Title in Body/Bold and the description in Body/Default, both in text/success, 4px apart (space/gap/pair), then the actions 8px below (space/gap/related). The title is the business name, the description is its address followed by We filled in the name and address below. Check they match your registration., and the one action, Search again, is now a secondary small Button (24px high, white fill, Atlas size/control/small and small padding) in place of the small text link, as Atlas says actions in a callout are secondary buttons. The shared .callout rule now uses the Atlas 12px radius for every callout in the prototype (the lock assurances, the edit note and the failed upload), and the Atlas structure classes are callout-content, callout-text, callout-title and callout-actions. The sprite has a new circle-check icon, which Atlas names as the success glyph; the other severities still show the info and alert glyphs the prototype already had. Update, 2026-11-13: the hero callouts are now 12px too (card-radius-all-large).",
    "tradeoff": "Not every Atlas Callout part is built: there is no dismiss button (Atlas has an optional one, and it is discouraged where the callout is the only record of a choice) and no show or hide title option. The hero callouts on the waiting and sent screens are a separate class and still have the 8px radius, so two callout radii remain until they are brought across. A success callout carries the business name as its title, so the name appears here and again in the Legal business name field below it.",
    "by": "Ryan",
    "when": "2026-11-12"
  },
  {
    "id": "agreement-and-privacy-one-document",
    "area": "Trust",
    "where": "Step 7 · Sign it off",
    "t": "The merchant services agreement and the privacy policy are one document, with one tick and one link",
    "b": "Ryan: the sub-merchant application and agreement (SMAA) and the privacy policy are one document, and he attached the ClubReady version as the example. So Sign it off now has one required tick, I accept the Xplor Pay merchant services agreement, privacy policy and terms of service, and the whole phrase is a single link that opens one reader. The reader holds one document: the agreement sections followed by the privacy sections (numbered 9 to 11), one title, one Download. The second tick (acceptPrivacy), the second document and its Tick this to sign. error are gone, and the step 7 count and the what-is-missing hover note count one acceptance instead of two. Ryan also said not to show the attached PDF in the prototype, so none of its text is used; the sample wording is still the prototype's own and legal owns the real text. The attached PDF is a filled-in application that holds a real person's personal and bank details, so none of that was copied anywhere.",
    "tradeoff": "One tick is less friction, but a single tick now stands for the agreement and the privacy policy together, so whether that is enough consent is for compliance and legal to confirm (it adds to the open question in terms-as-signing-checkboxes). The attached ClubReady terms differ from the prototype sample (for example they carry an early termination fee and a personal guarantee, where the sample says no minimum term and no exit fee), so the real Xplor document and its page count need Legal to supply them. The 18 pages and version 4.2 are placeholder figures.",
    "by": "Ryan",
    "when": "2026-11-12"
  },
  {
    "id": "ein-bn-document-removed",
    "area": "Flow",
    "where": "Step 6 · Documents",
    "t": "No EIN letter or CRA business number confirmation upload, because Trulioo validates the number",
    "b": "Ryan: Trulioo will validate the EIN, so the applicant does not need to upload a document that evidences it, and the same goes for Canada. The EIN confirmation letter (CP-575 or 147C) row is gone for the US and the CRA business number confirmation row is gone for Canada, for company, non-profit and sole proprietor alike. Step 6 now asks for the government photo ID of each person listed, the W-9 (US only), the last three months of processing statements (only if the business has processed cards before), and, for ClubReady, the signed lease. A Canadian business with no prior processing and no ClubReady division now uploads only photo IDs.",
    "tradeoff": "The prototype does not check the number against any record (it only checks for nine digits), so this rests on the real Trulioo integration doing the validation. Whether Trulioo covers small businesses, sole proprietors and Canadian business numbers is still one of the questions to put to Trulioo, and what happens when validation fails or finds no match is not designed. Without the letter, Ops has nothing on file to see how the number was issued. Ryan said he is happy for this to go; whether risk, compliance or the sponsor bank still want the document is for them to confirm.",
    "by": "Ryan",
    "when": "2026-11-12"
  },
  {
    "id": "club-essentials-option-removed",
    "area": "Flow",
    "where": "Prototype options · Division",
    "t": "The Club Essentials Division option is removed",
    "b": "Ryan: with the two years of financial history gone (club-essentials-financial-history), Club Essentials no longer differs from the normal flow, so its Division option is removed. Prototype options now offers Standard and ClubReady only, and ?division=ce no longer does anything (it opens the standard flow). Ryan asked to be corrected if wrong; the one remaining difference was Club Essentials' own 20-code merchant category list on step 1, and he chose to remove the option anyway. That list was an invented stand-in, so nothing real is lost: in the product an Ops user sets each division's codes in Odin (mcc-from-division).",
    "tradeoff": "ClubReady is now the only division the prototype can show, so it no longer demonstrates that different divisions can have different category lists on top of different documents; Standard (32 codes) against ClubReady (14) still shows a different list per division. If Club Essentials rejoins the flow with real differences, its row, its list and its option would need rebuilding. Ryan gave no other reason.",
    "by": "Ryan",
    "when": "2026-11-12"
  },
  {
    "id": "ca-bank-proof-row",
    "area": "Flow",
    "where": "Step 6 · Documents (Canada)",
    "t": "Canadian applicants add proof of their bank account on step 6, because Trulioo cannot verify Canadian accounts",
    "b": "Ryan asked whether Canada still asks for evidence of the bank account given that Trulioo cannot validate Canadian bank accounts, and said yes when offered the row back. For a Canadian business (company, non-profit or sole proprietor) step 6 now has a required Bank account verification card: any one of a void cheque with the business name and account details printed on it, a letter from the bank, or a recent bank statement. The US still has no bank row, because Trulioo verifies US accounts (bank-verified-by-trulioo). The card works like every other document card: drop zone, any number of files, the red outline and Add this file to finish this step. when it is missing. A Canadian business now uploads at least the photo IDs and the bank proof.",
    "tradeoff": "That Trulioo verifies US but not Canadian bank accounts is relayed by Ryan, not from a document; Trulioo or compliance should confirm it. This is a prototype row, and the wording is a draft. The Banking Verification card on More info needed is still what Ops can ask for after submit; this row asks for the proof up front instead of after. Whether the sponsor bank accepts a bank statement as well as a void cheque or letter is not known. Step 4 and the step 7 review do not mention the document, as before.",
    "by": "Ryan",
    "when": "2026-11-13"
  },
  {
    "id": "accordion-chevrons-match",
    "area": "Flow",
    "where": "Step 2 · Owner card and its sections",
    "t": "The sections inside an owner card use the same chevron pattern as the card",
    "b": "Ryan: in the owner form the owner card's chevron points down and turns up when open, but the sections inside it (Personal details, Identity verification) started pointing right (turned 90 degrees) and swapped to down when opened, which was confusing. They now match the card: a section's chevron points down when it is closed and turns up when it is open, with the same 160ms turn. The section chevrons keep their smaller size and lighter colour from owner-card-click-to-open. Only the closed rotation and the open rotation changed in app.css (.owner-sec.is-open .sec-chev).",
    "tradeoff": "A down chevron on a closed section reads as open me, the same as on the card, but a right-pointing chevron usually says there is more nested inside, so the two levels are now told apart only by size and colour. Ryan gave no other reason. The invited owner's page uses the same section accordions and gets the same change.",
    "by": "Ryan",
    "when": "2026-11-13"
  },
  {
    "id": "owner-card-radius-matches",
    "area": "Flow",
    "where": "Step 2 · Owner card",
    "t": "The owner card has the same corner radius as the other cards",
    "b": "Ryan: the owner card in the owners form did not match the border radius of the other cards. The .card class (the step cards, document cards, the Sign it off card and others) uses the large radius (radius/large, 12px), but .person used the default radius (8px). .person now uses radius/large too, so the owner cards have the same rounded corners as every other card. Nothing else about the owner card changed: its border, shadow, surface and clipping are as before.",
    "tradeoff": "The card clips its content to the corners (overflow hidden, except while its actions menu is open), so with the bigger radius the open header and section rows sit slightly further from the corners. Ryan gave no other reason. Other card-like pieces (the hero callouts on the waiting and sent screens, still 8px) were not changed here; they are listed in lookup-confirmation-atlas-callout.",
    "by": "Ryan",
    "when": "2026-11-13"
  },
  {
    "id": "card-radius-all-large",
    "area": "Flow",
    "where": "Step 7 review list, business type cards, waiting and sent screens",
    "t": "The review list, the business type cards and the hero callouts use the large card radius too",
    "b": "Ryan: after the owner card was matched to the other cards (owner-card-radius-matches), match the other card-like pieces still at the default 8px as well. They now use radius/large (12px), the same as .card: the step 7 review list (.summary), the business type cards (.biz-card, and the opened Company and Non-profit wrapper .biz-open with its header's top corners), and the hero callouts on the waiting and sent screens (.hero-callout). This also closes the leftover noted in lookup-confirmation-atlas-callout, where the hero callouts were the one callout still at 8px.",
    "tradeoff": "Other raised, bordered blocks are still at the default 8px and were not touched because Ryan did not list them: the What you'll need card on the welcome page (.need), the Help list rows (.help-list li), the document viewer paper (.docv-paper), the Prototype options panel and similar small controls. Whether they count as cards is for Ryan to say. Ryan gave no other reason.",
    "by": "Ryan",
    "when": "2026-11-13"
  },
  {
    "id": "section-chip-warning-until-done",
    "area": "Flow",
    "where": "Step 2 · Owner sections",
    "t": "An owner section that is partly done keeps the warning badge until it is complete",
    "b": "Ryan: the grey badge on an owner section (for example 2 of 10 done) should stay orange while the section is in progress, so it shows as a warning until complete. A section now reads Not started or N of M done in the warning badge (orange), and only a finished section shows the green Done badge. The grey info badge from 2026-11-12 is gone from the sections; .pill--info is no longer used there.",
    "tradeoff": "Orange on a section the applicant has already started can read as something is wrong, rather than as work still to do. Ryan gave no other reason.",
    "by": "Ryan",
    "when": "2026-11-13"
  },
  {
    "id": "id-number-placeholder-example",
    "area": "Copy",
    "where": "Step 2 · Owner · Identity verification",
    "t": "The Government ID number placeholder is an example number",
    "b": "Ryan: the Government ID number placeholder should be an example number, not the wording As shown on the document. It now reads e.g. D1234567. It is one example for every ID type (driver's licence, passport, national ID card) and is a made-up format, not a real number.",
    "tradeoff": "A single example looks like a driver's licence number even when the applicant chose a passport or national ID card; a placeholder that changes with the ID type is not designed. Real formats differ by state, province and country. Ryan gave no other reason.",
    "by": "Ryan",
    "when": "2026-11-13"
  },
  {
    "id": "mono-fields-match-text-size",
    "area": "Flow",
    "where": "Secure number fields and currency fields",
    "t": "Text in the encrypted number and currency fields is the same size as normal text",
    "b": "Ryan: the font in the encrypted number fields and the currency fields should be the same size as normal text; it can be a different font style but should not look larger. The boxes use Roboto Mono, which is wider than Roboto at the same pixel size, so at 14px the entered numbers looked larger than the text in other boxes. They now use the Atlas code size (type-code-default-size, 13px) instead of the 14px body size, which gives digits about the same width as the 14px body text. This covers the encrypted boxes (SSN or SIN, ID number, account number), the money boxes (card volumes, ACH or EFT volume) and the read-only yearly volume. The font style stays Roboto Mono.",
    "tradeoff": "13px is the Atlas code token, but it is matched by eye and by digit width, not by an Atlas rule that says mono and body text should be the same size; a one pixel difference in height remains. The date, EIN and other plain mono boxes were already Roboto at 14px (the .mono class loses to the .input font rule), so they did not change. Ryan gave no other reason.",
    "by": "Ryan",
    "when": "2026-11-13"
  },
  {
    "id": "ach-field-always-shown",
    "area": "Flow",
    "where": "Step 3 · Bank transfer volumes",
    "t": "The ACH or EFT volume field is shown by default",
    "b": "Ryan: do not hide the ACH field by default; it is only small and already defaults to zero, so it is easier to just show it. The Bank transfer volumes card on step 3 (Estimated monthly ACH volume, EFT in Canada) is no longer collapsible: it is always open, with no Show 1 field button, and the 0 is visible in the box. The card keeps its heading and the line Only if you'll also take ACH payments (direct debits in Canada). The collapse mechanism in the card code is still there, unused.",
    "tradeoff": "The applicant who takes no bank transfers sees a box they can ignore, and a 0 that reads as an answer (see ach-volume-defaults-zero). Ryan's reason: the field is small and defaults to 0. The card still says Only if you'll also take ACH payments.",
    "by": "Ryan",
    "when": "2026-11-13"
  },
  {
    "id": "content-audit-must-fix",
    "area": "Copy",
    "where": "Step 1, step 4 and step 5 notes and descriptions",
    "t": "Three accuracy fixes from the content audit: stale step 6 reference, Canada bank check, and no statement about how a yes is decided",
    "b": "Ryan ran the Xplor Pay content guidelines over the journey (CONTENT-AUDIT-2026-11-13.md) and asked for the must fix items to be applied except the ones he is happy with (Faster approval, Secure sign-in, the security and privacy lines on steps 2 and 6, the pricing and credit-check lines on step 3, and the credit score line on step 5). Three were applied. (1) The step 1 note said the details are checked against the tax documents the applicant adds in step 6, which stopped being true when the EIN letter and CRA confirmation were removed (ein-bn-document-removed); it now says to type the details as they appear on the registration, and the first pill reads We use these to confirm the business exists. (2) The step 4 note said Trulioo checks the bank account so payouts only ever go where they should. The absolute promise is gone, and Canada now reads We ask for proof of it in step 6, then check it after you submit, because Trulioo does not verify Canadian accounts and step 6 asks for bank proof there (ca-bank-proof-row). The US wording keeps the Trulioo check without the word only. The note also says payouts, not sales. (3) Three lines said a yes on the declarations is never an automatic no, is not a refusal, or won't stop the application. They are replaced by one neutral statement in all three places: If you answer yes to any of these, a person reviews your application.",
    "tradeoff": "The new step 5 line is still a statement about process, so Compliance should confirm it before it ships; no locked wording was written. The step 5 note and the step 6 notes still say things Ryan chose to keep (None of this affects your personal credit score, Stored encrypted). The Canada step 4 line assumes the bank proof stays on step 6 for Canada. The partner name is still spelled Trulioo in the UI; the audit asked Ryan which spelling is right.",
    "by": "Ryan",
    "when": "2026-11-13"
  },
  {
    "id": "content-audit-should-fix",
    "area": "Copy",
    "where": "Whole journey",
    "t": "The should fix and polish findings from the content audit are applied, with four left as they were and three altered",
    "b": "Ryan ran the Xplor Pay content guidelines over the journey (CONTENT-AUDIT-2026-11-13.md) and said to fix everything in the should fix and polish groups except four items he left as they were (1.3 the welcome email reassurance, 5.2 the Merchant category code (MCC) label because MCC is correct, 8.5 the step 4 line about adding more accounts, and 13.3 the under review timing and nothing-else-to-do lines) and three he altered (1.1 and 12.3: the temporary password and the resume link now work for 30 days, not 7; and 14.2: the digit messages drop You've entered [n]). Applied: the Change your password button reads Save password and sign in; the welcome page says seven steps, have it all ready, splits the owners sentence, lists documents on the bank card, and says average payment; slashes became or (Individual or sole proprietor, Registered or legal address, Title or role, Refund or return policy URL, Owner and CEO); queries became questions; Just the first 9 digits became Enter the first 9 digits only; We only need owners with 25% or more became We need owners who hold 25% or more; every step note asks Why are we asking?; transaction, sale and chargeback became payment and dispute (Average payment amount, Largest single payment, the limits tick, the limit and its error with the currency code, and no above); the Card present % label is Card present percentage; the step 4 card is Payout account and says We send your payouts to this account; the MATCH and OFAC hints expand their acronyms and crypto is cryptocurrency; the step 5 Declarations card no longer repeats the sentence already in the subtitle; step 6 is titled The documents we need to verify your details, its callout no longer repeats the subtitle, and the photo hint reads Include all four corners and avoid glare; the ampersands in Business and address, Organization and address, Agreement and submit and Save and exit are gone; When you sign, we send everything at once; the submit note and the rail note no longer say Straight away or use a dash; support hours read 7 AM–7 PM PT; the cancel toast reads Invite to [email] canceled; the status title is In review; the submitted line reads Submitted [date, time and zone] · Reference: [ID]; the approved page says payments; More info needed reads One more thing we need, Add this item and we'll carry on with your checks, Show that your business is registered, and verify in the bank card; placeholders say For example, instead of e.g.; the fitness and retail example uses straight quotes; the optional marker is gone from Street address 2. Validation messages: empty required answers say Enter [field] or Choose [field] where the label reads cleanly (the acronym alone for labels that end in one, such as SSN), the routing, SSN, SIN, institution and transit messages say Enter all [n] digits of your [thing], the account number says Enter your account number and how many digits it has, the date messages say what to enter, the maximum-payment error uses payment and the currency code, and the signing tick says Accept the agreement to sign.",
    "tradeoff": "Not done: a copy button for the reference (13.2), because it needs a design (icon, toast); the Checking line on the under review screen (13.4), which is still accurate; the Continue buttons (2.4); the PEP acronym (6.4); the ACH label in shared copy (7.9). The red asterisk stays (required-marker is an earlier decision of Ryan's) and only the stray (optional) was removed. The second sentence on step 4 (We may also take fees, chargebacks and refunds from it) was not reworded because it describes fee and debit authority, which Legal owns, and the Mastercard and Every US merchant claims in the step 5 hints were kept with their acronyms expanded; both still need sourcing. The 30 days figure is Ryan's and not confirmed with Engineering or Security. The submitted time shows the viewer's own zone on a real submit and a fixed ET on the sample. The generic empty-answer messages only show where an empty required answer is flagged (the final submit), so they were checked on the label logic, not on screen.",
    "by": "Ryan",
    "when": "2026-11-13"
  },
  {
    "id": "atlas-sweep-top-three",
    "area": "Atlas",
    "where": "Every field, every error message, document drop zones",
    "t": "Field errors carry an icon, labels sit 8px above the field, focus uses the Atlas border and 2px glow, and the drop zone follows the Atlas File drop",
    "b": "Ryan asked for the top three wins from the Atlas conformity sweep (ATLAS-SWEEP-2026-11-13.md), which compared the prototype with the Atlas Figma pages. (1) Every error message is the Atlas helper row: a 16px error icon, a 4px gap, then the message in Caption/Default regular weight (it was weight 500) in the error text colour, 8px below the field. Label to field spacing is now 8px (space/gap/related) instead of 6px. One errMsg helper draws every error line, including the sign in, change password, sign off and save-and-return emails. (2) Focus on text fields, the dropdown button and the money and secure boxes uses the focus border colour (color/border/focus) and a 2px glow (border/focus/width) instead of the brand border colour and a 3px glow. (3) The document drop zone is the Atlas File drop: 12px radius, 1px dashed border on the raised surface, 24px padding, a plain 24px brand upload icon instead of the round tinted bubble, a bold prompt (Drag a file here) with an or browse link line in the Atlas link colour. Hover keeps the brand tint. Dragging a file over shows a solid 2px brand border and the prompt Drop to upload, with no movement (the old icon bounce is gone). A zone in error takes the error wash and a dashed error border.",
    "tradeoff": "The zone is now about 124px tall against the 112px minimum set by document-drop-zone (twice a 56px file tile), because Atlas padding is 24px. Error text now shows an icon everywhere, so a very long message wraps under the icon line. A field in error that is also focused still shows the focus look, because the global focus rule is more specific than the error outline; Atlas draws no glow on error, so this may need a follow-up. The Atlas upload-ready glyph for drag-over does not exist as an icon here, so the upload icon stays. Not changed from the sweep: the label gap in the few places that do not use field-head, the toast, badges, the list check mark and the card and owner header paddings.",
    "by": "Ryan",
    "when": "2026-11-13"
  },
  {
    "id": "atlas-sweep-toast-badges",
    "area": "Atlas",
    "where": "Toasts and badges across the flow",
    "t": "Toasts follow the Atlas Toast (title, message, dismiss, draining timer bar, success wash) and grey badges use the Atlas info colours",
    "b": "Ryan asked for the toast and badge items from the Atlas conformity sweep (ATLAS-SWEEP-2026-11-13.md, sections 3 and 4). Toast: 400px wide with 16px padding on every side (the extra left padding is gone because the bar overlays it), a header row of a 16px circle-check icon and a Title in Body/Bold in the success text colour, the message under it in Body/Default, a 24px Dismiss button, and a 6px bar on the left edge that drains downward over the 5 seconds the toast stays (it was 4.5). Success toasts sit on the success wash instead of the neutral raised surface. showToast now takes a title, an optional message and a severity. Existing two-sentence toasts were split at the full stop with no new wording (Welcome back / Your answers are saved.); single-sentence ones show a title only. The two prototype-only notices (Harbor Yoga Studio's dashboard, password reset) are now info toasts with the info icon and neutral surface, because they are notices and not successes. Badges: Atlas has no neutral badge, so the grey labels (the Optional tag on documents, field chips, the Signed in and Access removed pills, Uploading and Not needed) use the Atlas info subtle fill with the info text colour; the info pill itself now uses the subtle fill with its text colour, not the solid fill. State pills on document tiles are 24px high with the badge padding, like every other badge, instead of 32px.",
    "tradeoff": "The info colours are grey in Atlas, so the labels look almost the same as before, only slightly lighter. Titles lose their full stop; the message keeps its own. There is no pause on hover and no stacking of several toasts (a new toast replaces the old one). The decisions panel's area chip also turned info grey. The division-tag (ClubReady only marker) still uses raw colours because it is a prototype annotation. Not changed from the sweep: the list check mark, card and owner header paddings, button hover tint.",
    "by": "Ryan",
    "when": "2026-11-13"
  },
  {
    "id": "atlas-sweep-shadow-error-focus",
    "area": "Atlas",
    "where": "Secondary buttons, pressed buttons, focused fields in error",
    "t": "Secondary buttons use the full Atlas button shadow, pressed buttons have none, and a focused field in error keeps its red border with no purple halo",
    "b": "Ryan asked to verify the focus glow and the secondary Button shadow after the sweep. The Figma connection returned errors, so both were checked against the Atlas token repo (last commit 2026-11-09), not Figma. Decision 0040 says primary and secondary buttons both use the single effect style Shadow/button/contained (inset white bevel, inset dark bevel, 0/1 blur 3 cast) at rest, hover and focus, and that pressed, disabled and tertiary buttons take none. The prototype gave secondary buttons the cast shadow only and primary kept its shadow while pressed. Secondary now uses the same --shadow-button-contained as primary, and primary and secondary lose the shadow while pressed. Decision 0072 says the text field focus halo is a 2px glow in brand subtle outside a 1px border, which the prototype already matched, and that an error field gets no halo because a brand tint around a red border mixes two meanings. The global focus rule was winning over the error rule, so a focused field in error lost its red border and showed the glow. A higher-specificity rule now keeps the red 1px border and no halo on focus for inputs, selects, textareas, the prefix/suffix wrapper and the select button.",
    "tradeoff": "Both values come from the token repo and its decision records, not from reading the Figma effect style, so they are only as current as the repo. The old 0024 note (secondary has the cast shadow only) is superseded by 0040, but the prototype comment still said so until now. A focused error field shows only the red border, so focus is carried by the red border alone, as in Atlas. Still unverified in Figma: the disabled button border and the exact effect style values. Tertiary hover tint is still open. Update, 2026-11-16: the Figma values were read and the secondary half of this decision was wrong; see button-secondary-shadow-from-figma.",
    "by": "Ryan",
    "when": "2026-11-13"
  },
  {
    "id": "phone-input-component",
    "area": "Fields",
    "where": "Business phone number (step 1) and the owner Phone number (step 2)",
    "t": "Both phone fields are one component: a country list with flag and code, then a number box spaced as it is typed",
    "b": "Ryan's manager asked for the phone fields to be refined before the build, with the country code separated out and the digits spaced, for example [+1] 000 000 0000. Both fields used to be plain text boxes with a +1 (555) 000-0000 placeholder and no separate code. They now share one component (phoneParts, phoneFmt and phoneJoin in app.js, the phone case in fieldView): a country list on the left that shows a flag and the code (for example +1), and a number box on the right that takes digits only and spaces them 3, 3 and 4 for a +1 number (10 digits, so the area code is included) and the same three groups with the rest in the last group for other countries. The list holds the United States, Canada, the United Kingdom, Australia, New Zealand, France, Germany, Ireland, Italy, the Netherlands, Spain, Mexico and India, and opens as the standard Atlas Select menu. The code starts as +1 in both the US and Canada, with the flag of the region. Pasting a number that begins with 1 and has 11 digits drops the leading 1. The value is still stored as one line, +1 503 555 0148, so the owner prefill from step 1, the review screen and the saved data keep working; numbers already stored in the older +1 (503) 555-0148 shape show correctly spaced. The error is the same sentence, Enter the full number, including the area code., shown when a +1 number has fewer than 10 digits or another country has fewer than 6. The country list does not turn red on an error, only the number box. In the owner form the phone box spans two of the three columns (it was one third, too narrow for the list and the number). Ryan chose a country list over a fixed prefix or a typed code, and the 000 000 0000 spacing. Update, 2026-11-16: the two boxes became one Atlas Phone input box with a search row in the country list (see atlas-phone-input-one-box); the digit spacing and validation described here are unchanged.",
    "tradeoff": "Flags are emoji, which Windows browsers draw as two letters (for example US) instead of a flag, so the closed list reads as US +1 there. The list of 13 countries is a guess at Xplor's markets plus a few near ones, not a full country list or a rule from Product. Digit counts for non-US numbers are loose (6 to 12), so a wrong number can pass. The component is built, not checked against an Atlas Phone input: Atlas Figma was not read for this (the Figma connection was down last session), and the sweep has no Phone input entry.",
    "by": "Ryan",
    "when": "2026-11-16"
  },
  {
    "id": "done-button-brand-text",
    "area": "Owner form",
    "where": "Done button at the foot of each owner section",
    "t": "The Done button at the foot of an owner section has purple text; its fill, border and shadow are unchanged",
    "b": "Ryan's manager felt the outlined Done button looked like another input field rather than the button that closes the section, and suggested a subtle colour fill such as light purple. Ryan chose to make the text purple only for now and to sort the Atlas side of it separately. So .owner-sec .sec-actions .btn uses --color-text-brand (the brand text colour) in place of the secondary grey. Nothing else changed: the button is still the white secondary button with the grey border and shadow, small size, and still closes the section without saving or checking anything (see section-done-buttons).",
    "tradeoff": "The button keeps its white fill and grey border, so it may still read a little like a field next to the inputs above it; purple text is a lighter signal than the subtle fill the manager suggested. The light purple fill was offered and not chosen. Ryan will review the button against Atlas separately. Update, 2026-11-16 (Ryan): reverted. The Done button is the plain Atlas secondary button again (text/secondary grey label, white fill, border/default), until the Atlas side is sorted. Ryan gave no further reason; the purple-text rule is removed from app.css.",
    "by": "Ryan",
    "when": "2026-11-16"
  },
  {
    "id": "limits-tick-confirm-wording",
    "area": "Copy",
    "where": "Step 3, tick under Your card volumes",
    "t": "The limits tick reads I confirm the limits above are correct for my business",
    "b": "Ryan's manager found I've read the payment and monthly limits for my business confusing and suggested something like I confirm the above payment and monthly limits for my business are correct. Ryan chose the shorter wording, I confirm the limits above are correct for my business. The hint under the tick is unchanged (it still shows the monthly limit and says to ask Xplor to raise it, or says what to enter first while the tick is greyed out), and the behaviour is unchanged (see limits-from-entries and limits-ack-in-volumes): greyed out until the monthly volume and maximum transaction are filled in, cleared if either number changes. Update, 2026-11-17: the tick was removed (see limits-tick-removed).",
    "tradeoff": "The shorter label no longer names payment or monthly limits, so it relies on the hint under the tick to say which limits are meant, and the hint names only the monthly limit. The label says the limits are correct, but the limits come from what the applicant entered, so a reader could wonder what they are confirming. Legal may want the confirmation worded as an acceptance.",
    "by": "Ryan",
    "when": "2026-11-16"
  },
  {
    "id": "terminated-question-plain-wording",
    "area": "Copy",
    "where": "Step 5 · Declarations, and the MATCH consent tick under it",
    "t": "The termination question says a payment provider ended your agreement to take card payments, not a merchant account being terminated",
    "b": "Ryan's manager found Has a merchant account of yours been terminated? confusing and asked what merchant means to the applicant: a bank account, a merchant account inside Odin, or the business itself, and whether it is Xplor terminology. Merchant account is processor and card-network wording; an applicant thinks of their business and of whoever lets them take cards. Ryan chose the plain version. The question now reads Has a payment provider ever ended your agreement to take card payments?, and the follow-up box after a Yes reads Provider, date and reason (it was Processor, date and reason). Ryan also agreed to change the consent tick under it the same way: it now reads I agree to a check of the card networks' list of businesses whose card payment agreements were ended (it was a list of closed merchant accounts). The hint under that tick is unchanged, so it still says Also called a MATCH check, or a Terminated Merchant File (TMF) check and that Mastercard requires it for every merchant account. The answers are still stored under priorTermination and matchConsent, so nothing downstream changed. See termination-asked-once for why this is asked only in step 5.",
    "tradeoff": "The new question is wider than a terminated merchant account: a provider that ended an agreement for any reason, including one the applicant ended themselves, could be read as a Yes. Compliance may want the question to match what the MATCH list actually records. The consent tick wording is Compliance's to confirm, and its hint still says merchant account. The question does not say how far back to look.",
    "by": "Ryan",
    "when": "2026-11-16"
  },
  {
    "id": "mcc-most-common-first",
    "area": "Fields",
    "where": "Step 1 · Merchant category code (MCC) list",
    "t": "The business category list opens with the most common categories first, then the rest A to Z",
    "b": "Ryan's manager suggested listing the most common MCCs first so most applicants can see and click theirs at once, or else listing alphabetically or by number. Ryan chose the most common first. With nothing typed, the list now has two headings: Most common (eight categories, in a set order) and All categories (every other code for the division, A to Z by title). When the applicant types, the list is the matches only, with the common ones first and the rest A to Z, and no headings. Each division has its own common set (MCC_COMMON in app.js): Standard has eating places, fast food, beauty and barber shops, miscellaneous retail, membership clubs, medical and health practitioners, miscellaneous personal services and miscellaneous food stores; ClubReady has membership clubs, health and beauty spas, recreation services, commercial sports, miscellaneous personal services, medical and health practitioners, chiropractors and miscellaneous food stores. Only codes already in the division's list can appear. The picker still shows only the division's codes (see mcc-from-division).",
    "tradeoff": "The order of the common eight is invented for the prototype, not taken from Xplor merchant data, and it has not been checked with Ops or Product; a real build needs a ranking by how many applicants choose each code. The common set cannot show someone whose code is not in it that a better match is a long way down; search is the fallback. With the sample data the chosen code, 7997, is in the common group for both divisions.",
    "by": "Ryan",
    "when": "2026-11-16"
  },
  {
    "id": "what-happens-next-always-visible",
    "area": "Step 7",
    "where": "Step 7 · What happens next",
    "t": "What happens next is always shown on step 7, not folded away",
    "b": "Ryan's manager liked What happens next for setting clear expectations and steps, and suggested it be visible on the page rather than an expandable accordion. The heading is now plain text, the toggle button and chevron are gone, and the three steps (Sent to Trulioo, Checks run, Start taking payments) always show. It stays where it was, after Sign it off and above Back and Submit; Ryan chose to keep that place. The wording of the three steps is unchanged. The unused nextOpen state is removed. See next-steps-panel for how the panel is drawn.",
    "tradeoff": "The panel adds about 150 pixels of height at the bottom of the longest page, below the signature, so some applicants may not reach it before they submit; it was just as far down before, but now it is visible without a click. The wording was not touched, including Your first payout lands the next business day after your first sale, which is a claim that has no sign-off.",
    "by": "Ryan",
    "when": "2026-11-16"
  },
  {
    "id": "need-card-nonprofit-id-line",
    "area": "Copy",
    "where": "Welcome page · What you'll need · Details of the people who own your organization",
    "t": "The What you'll need card no longer says a non-profit or government body doesn't need the SSN or SIN",
    "b": "Rosh, from risk operations, asked for this line to go. His reason: some other businesses try the government or non-profit route to avoid giving the social security number and other details for all their owners, because they see it is not needed on that path. The sentence A non-profit or government body doesn't need the SSN (SIN in Canada) is replaced with For a non-profit or government body, we need each person's title, address and a driver's license or passport (licence in Canada). Ryan chose copy only. The form itself is unchanged: a non-profit's leader cards still have no SSN or SIN box, so the route Rosh describes still avoids the number; only the card no longer advertises it.",
    "tradeoff": "This hides the gap rather than closing it. A business that chooses non-profit in order to skip the SSN still can, and Rosh's worry is about behaviour, not wording. Closing it would mean asking for the SSN or SIN on non-profit and government leader cards (Ryan did not choose that), or verifying the organisation type some other way, which is a risk and Compliance decision. The card now says address for everyone but only lists it for non-profit and government, although every owner card asks for a home address.",
    "by": "Ryan",
    "when": "2026-11-16"
  },
  {
    "id": "ach-count-when-volume",
    "area": "Fields",
    "where": "Step 3 · Bank transfer volumes",
    "t": "Once an ACH (EFT in Canada) volume above 0 is entered, a required box asks for the number of payments a month",
    "b": "Rosh, from risk operations, asked for a question such as the number of ACH transactions in a month. Ryan chose: required once the volume is above 0, and shown only when a number above 0 has been entered in the volume box. So the Estimated monthly ACH volume box (EFT in Canada) stays optional and starts at 0 (see ach-volume-defaults-zero), and a second box, Estimated monthly number of ACH payments (EFT payments in Canada), appears beside it as soon as the volume is above 0. It is required: empty gives Enter how many ACH payments you expect each month, and 0 gives Enter a number above 0. It takes digits only and shows thousands separators as it is typed. If the volume goes back to 0 the box disappears and nothing is asked. The new answer is stored as achCount.",
    "tradeoff": "The box appears after the applicant types in the volume, so it can push the page down while they are still typing. A count and a volume that do not fit together (for example 1 payment of $50,000) are not checked against each other or against the average payment amount. The ACH average amount is not asked.",
    "by": "Ryan",
    "when": "2026-11-16"
  },
  {
    "id": "ecommerce-channel-url",
    "area": "Fields",
    "where": "Step 3 · How you sell (How you take payments for a non-profit)",
    "t": "The channel question is How do customers pay you?, Online is E-commerce, and an e-commerce answer asks for a required website or app address",
    "b": "Rosh, from risk operations, pointed out that in the payments world sales channel means direct sales, ISV, ISO and the like, and asked whether in-person and online is how Club businesses word it; he also asked for Online to be E-commerce, because that is how the card brands categorise it, and for a required URL box when e-commerce is picked. Ryan chose a new label and the card-brand term. The label Primary sales channel (Primary payment channel for a non-profit) is now How do customers pay you? (How do people pay you?). The options are In-person, E-commerce (online), In-person and e-commerce, Mobile and Phone / mail order (MOTO). Picking E-commerce (online) or In-person and e-commerce shows a required box, Website or app where customers pay (people, for a non-profit), under the two pickers. It starts filled with the website from step 1 unless step 1 says there is no website, can be changed, and gets https:// added as the applicant leaves it, like the step 1 website. Empty gives Enter the website or app address where customers pay, and it blocks the step like any required box. The sample business is In-person and e-commerce. Update, 2026-11-16 (Ryan): the box does not block Continue, only the final Submit, like every other required box (see errors-only-for-bad-entries); Rosh had asked for it to be required to progress to the next page, and Ryan chose to keep the prototype consistent. Ryan gave no further reason. I could not say how Club businesses word the channel; that stays Ryan's to confirm. Update, 2026-11-17 (Ryan): the helper text under the address box is removed and the box is half width on its own row (see ecommerce-url-half-width).",
    "tradeoff": "E-commerce (online) keeps online in brackets so an applicant who does not know the card-brand term can still pick it; Rosh asked for the card-brand name alone. The box is not checked for being a real address, only for being filled in. Because it starts from the step 1 website, an applicant may accept it without checking it. The What you'll need card still says in person, online or both. The usability kit and field spreadsheet still hold the old label and options.",
    "by": "Ryan",
    "when": "2026-11-16"
  },
  {
    "id": "atlas-choice-chip-yes-no",
    "area": "Atlas",
    "where": "Every Yes / No question, and the non-profit structure pills",
    "t": "The Yes / No pills follow the Atlas Choice chip: no fill at rest, grey fill on hover, pale purple fill when chosen, and they hug their label",
    "b": "Found in the Atlas audit of 2026-11-16 (ATLAS-AUDIT-2026-11-16.md, section 2), read from the Choice chip variant layers in the Atlas Figma file. The round shape was already right; the fills and border colours were not. Now (large chip, 40px high): rest has no fill and a 1px border/default ring; hover has a bg/hover fill and a border/strong ring; pressed has a bg/neutral/active fill; chosen has a bg/brand/subtle fill and a 2px border/brand ring. The 76px minimum width is gone, so Yes is about 63px wide and No is narrower, as in Atlas. Ryan chose to hug the label like Atlas rather than keep the pair even. This supersedes the rest border of the old pills (border/input).",
    "tradeoff": "Yes and No are no longer the same width, and the longer non-profit structure labels hug too, so the pair can look uneven. Atlas has no hover style for a chosen chip, so a chosen chip keeps its purple fill on hover and press. The Atlas Choice chip page is the only source for these values; I read it in Figma and did not check it against the Atlas React component.",
    "by": "Ryan",
    "when": "2026-11-16"
  },
  {
    "id": "atlas-progress-bar-step-meter",
    "area": "Atlas",
    "where": "Step list on the left · Your progress",
    "t": "The progress bar is the Atlas medium size, 8px high with a full radius, and its label is Label/Default",
    "b": "Found in the Atlas audit of 2026-11-16 (section 4). The bar was 5px high with a 2.5px radius, a grey track and 6px gaps. It is now 8px high (Atlas medium, chosen by Ryan over the 4px small size), fully rounded, on the bg/surface/track grey, with 8px gaps above and below. The label Your progress is Label/Default (12px, weight 500) in text/secondary. It was 12px bold in text/primary; Atlas has no 12px bold style, and Ryan chose Label/Default rather than keep the bold. The percentage stays green (text/success), which Ryan chose to keep; Atlas shows the value in text/subtle. It is now Caption/Default (weight 400) rather than bold. The green fill is unchanged and matches Atlas.",
    "tradeoff": "The bar is thicker, so the rail looks heavier, and the label is lighter than before, so Your progress is less prominent. The green percentage is a known difference from Atlas, which uses text/subtle. The circular step rings are not an Atlas component and are unchanged. The fill still animates over 240ms, which Atlas does not specify.",
    "by": "Ryan",
    "when": "2026-11-16"
  },
  {
    "id": "atlas-combobox-popup",
    "area": "Atlas",
    "where": "Business category, select lists, address and business lookups",
    "t": "The list popups follow the Atlas Combobox popup: rows run edge to edge, the chosen row has a check mark, the group headings and the status rows use Atlas styles",
    "b": "Found in the Atlas audit of 2026-11-16 (section 5), read from the Combobox popup set in Figma. The 4px inset around the rows is now the 1px frame, and the rows are square so they run edge to edge inside the rounded frame. The chosen row, still pale purple and bold, now ends with a 16px check in icon/brand (category list and select lists). The Most common / All categories headings (see mcc-most-common-first) are Label/Default in text/secondary with 12px side and 8px top and bottom padding, and a 1px border/subtle line between groups. Before they were small bold grey text with a border/default line. The No match, Searching and N more rows have 12px side and 8px top and bottom padding, Body/Default text (14px, was 13px) and a 36px minimum height. Ryan chose to restyle the headings to Atlas rather than drop them. This supersedes the padding and type of the old combo-list, combo-group and combo-empty rules.",
    "tradeoff": "The status rows have no icon slot, so there is no spinner or error icon on Searching or on an error, which Atlas has. The gap between a row's text and its code stays 4px, where Atlas uses 8px for a row with a check. The address list has no chosen row, so it shows no check. The Manual entry row at the foot of the business lookup is now square too.",
    "by": "Ryan",
    "when": "2026-11-16"
  },
  {
    "id": "atlas-spacing-by-role",
    "area": "Atlas",
    "where": "Product screens, app.css",
    "t": "Off-grid spacing (14, 18, 10, 6, 7, 9, 11, 22 and 3 pixels) moved onto the Atlas spacing roles, chosen by what the space is for",
    "b": "Found in the Atlas audit of 2026-11-16 (section 1: about 80 product rules used values that are not on the 4 and 8 pixel grid). Ryan asked that each value be chosen from the meaning of the Atlas semantic spacing tokens, not by rounding. Rules used, from the token descriptions in the Atlas-tokens repo (space.json): (1) a leading icon, avatar, dot or radio and its text is gap/related 8 (card, person, document, summary, next-step, hero, timeline and business type heads, was 14); (2) a title and its one-line subtitle or meta is gap/pair 4 (was 2 or 3); (3) a title and the paragraph or controls under it, a label above an input, and controls side by side is gap/related 8 (was 6, 7, 9, 10, 11); (4) one field and the next, a block and the next, a head and its body, is gap/group 16 (field row gap 18 to 16, card head margin 18 to 16, was 14, 18 or 22); (5) a container that holds other components, such as the popovers, the pending-accept box, the add row, the empty note and the business type card, is padding/surface 16 (was 14 or 18); (6) a list item is padding/item 12 and a dense nav row is padding/cell 8 (rail step rows, was 9 and 8); (7) a status tick and its text is gap/pair 4 (was 3); (8) bullet indents are 16 (was 18) and the business type sub-panel left padding is 42 so it still lines up with the label (16 card padding, 18 radio, 8 gap). Left as they were: 20px values (no role, on the grid), and 1 to 3 pixel optical nudges that line an icon, star or radio up with a text baseline (callout icon, why-point icon, check label, required star, help label, business type radio, later-note icon), the screen-reader-only rule, the affix-code inset, the combobox 1 pixel frame and the division tag. Prototype scaffolding (.proto, .note, .em, .mail) was not touched (Ryan chose product UI only).",
    "tradeoff": "Heads that had 14 pixels between the icon and the text now have 8, so the icon sits closer to its title (the person head, hero head, timeline and next-step columns); this follows the Atlas test for related things but it is a visible change and may feel tight beside the 40 pixel hero icon. Page height changes are small: step 1 is 16 pixels shorter, step 3 24 shorter. Atlas has no token for a bullet indent or for 20 pixels, so those stay as plain pixels. Textarea vertical padding went from 10 to 8 pixels and the business type cards, dialogs, why popover, Canada, slice 2 and phone width were not checked by eye.",
    "by": "Ryan",
    "when": "2026-11-16"
  },
  {
    "id": "button-secondary-shadow-from-figma",
    "area": "Atlas",
    "where": "Every secondary button (Back, Done, Get help, Choose file and the rest)",
    "t": "Secondary buttons take the shadow drawn in the Atlas Figma file: a white inner bevel and the cast shadow, without the dark inner bevel",
    "b": "Ryan said the buttons did not seem to use the Atlas shadows accurately. I read the Button component set in Figma (page 2132:480, variants with Sentiment default, medium) instead of the token repo. Primary, at rest, hover and focus, has all three layers of Shadow/button/contained: inner white 2/2 blur 2 at 15%, inner black minus 2/minus 2 blur 2 at 8%, and a drop shadow 0/1 blur 3 at 8%. Secondary, at rest, hover and focus, has only two: the inner white 2/2 blur 2 at 15% and the drop shadow 0/1 blur 3 at 8%; there is no dark inner layer and the surface is not linked to an effect style. Pressed and disabled have no shadow on either; tertiary has none. The prototype had given secondary all three layers, following decision 0040 in the token repo (see atlas-sweep-shadow-error-focus), so it showed a dark inner edge Figma does not have. app.css now has --shadow-button-secondary with the two layers and secondary buttons use it; primary is unchanged. The secondary label colour in Figma is text/secondary, which is also why the Done button goes back to grey (see done-button-brand-text).",
    "tradeoff": "The two-layer shadow lives only in app.css, because the Atlas-tokens repo has no token for it: decision 0040 says secondary uses the full three-layer style, and the Figma file disagrees. This needs to be raised with whoever owns Atlas so repo and Figma match; I followed Figma because the variant layers are what the designer drew. Not changed: the disabled secondary button still has a transparent border and a grey fill, where Figma keeps the border/default border with no fill (audit item 2.4).",
    "by": "Ryan",
    "when": "2026-11-16"
  },
  {
    "id": "button-disabled-per-emphasis",
    "area": "Atlas",
    "where": "Every disabled button (secondary and tertiary change; primary is unchanged)",
    "t": "A disabled secondary button keeps its grey border with no fill, and a disabled tertiary button has no fill, as in Atlas",
    "b": "Audit item 2.4 and Ryan's go-ahead on 2026-11-16. I read all 18 disabled Button variants in the Atlas Figma file (page 2132:480): primary, at every size and for default and negative, has the bg/disabled fill (#f4f4f7), no border and no shadow; secondary has no fill, a 1px border/default stroke inside the edge and no shadow; tertiary has no fill, no border and no shadow; the label is text/disabled (#c9cad1) on all of them. The prototype gave every disabled button the bg/disabled fill and a transparent border. Now primary is unchanged, disabled secondary buttons (.btn-outline, .btn-quiet, .btn-neutral, .btn-soft) have a transparent fill and a border/default border, and disabled tertiary buttons (.btn-ghost, .btn-tertiary-negative) have a transparent fill and no border. The rules are written with raised specificity so the white fills some secondary buttons carry (Back, Get help) cannot show through. Ryan gave no further reason.",
    "tradeoff": "In the product today only primary buttons are ever disabled (Submit for verification, the gated Continue), so the secondary and tertiary change cannot be seen on the real screens; it was checked by disabling a button in the page. A disabled secondary now sits on the page with only its border showing, so it reads fainter than before on the grey page background. The icon colour of a disabled button was not compared with icon/disabled.",
    "by": "Ryan",
    "when": "2026-11-16"
  },
  {
    "id": "atlas-batch2-button-input-tag",
    "area": "Atlas",
    "where": "Tertiary and negative buttons, small buttons, disabled and required fields, tags",
    "t": "Button hover tints, the required star, the disabled field border and the tag gap follow the Atlas Figma file",
    "b": "Second fix batch of the Atlas audit of 2026-11-16 (ATLAS-AUDIT-2026-11-16-batch2.md), values read from the Figma variant layers. (1) Tertiary buttons (.btn-ghost) hover and press to the pale purple bg/brand/subtle fill, not the grey bg/hover; the label stays text/brand. (2) The secondary negative button (.btn-critical, the owner Remove buttons) hovers and presses to bg/error/subtle with its border unchanged. (3) The tertiary negative button (the owner bin icon) keeps its red label when pressed instead of changing colour. (4) Small buttons (.btn-small, 24px, the lookup callout actions) use the 12px weight 500 label. (5) The required star is weight 500 (Label/Default) and sits 4px (gap/pair) from its label, was 600 and 2px. (6) A disabled field keeps the border/input ring (was border/default). (7) .tag has a 4px gap (was 8), and the unused .pill--lg rule is deleted. Ryan asked to leave the File drop hover alone: Atlas shows a white fill with a brand border on hover, the prototype keeps the pale purple fill, and Ryan will fix it in Atlas (he said the pale purple tint should be there). Not changed either: the read-only field fill and the upload hint line, which Ryan was not asked about yet.",
    "tradeoff": "The File drop hover now differs from the Atlas Figma file on purpose until Ryan updates Atlas. The disabled field border change cannot be seen on a real screen because no field is disabled in the product. The 12px small label also applies to every .btn-small, which today is only the lookup callout actions. Tertiary pressed uses the same pale purple as hover, as in Figma.",
    "by": "Ryan",
    "when": "2026-11-16"
  },
  {
    "id": "atlas-batch3-radio-search",
    "area": "Atlas",
    "where": "Step 1 business type cards, business and address search boxes",
    "t": "The business type radio circle and the search box text start follow the Atlas Radio and Search input",
    "b": "Third fix batch of the Atlas audit of 2026-11-16 (ATLAS-AUDIT-2026-11-16-batch3.md), values read from the Figma variant layers. (1) The radio circle in the business type cards is 16px (was 18), with a 1px border/strong ring at rest (was a 2px, much paler border/default ring), a 1px border/brand ring on hover and when chosen (was 2px), and the same 8px brand dot; it is centred on the first label line (19px high) with a 2px top margin. The cards themselves, with their padding, shadow and pale purple selected state, are unchanged because Atlas has no selectable card component. (2) The lookup and address search boxes start their text 36px in (12 padding, 16px icon, 8px gap), was 38px, as in Atlas Search input. Ryan asked on 2026-11-16 to ignore the Accordion component because it is still work in progress in Atlas, so the owner card header, chevron, shadow and section toggle findings are not acted on and the deliberate owner card choices (owner-card-click-to-open, static-cards-flat) stand. Ryan also said to fix anything remaining; the read-only field fill and the upload hint line were never answered, so they are left as they are.",
    "tradeoff": "The unchosen radio circle is now much darker than before, so the three cards read as more clearly choosable and slightly busier. The 2px top margin is an optical centring, not an Atlas value. The search box padding was read from the CSS source and the Atlas spec; the lookup and address boxes were not on a screen in this run, so the 2px shift was not seen on screen.",
    "by": "Ryan",
    "when": "2026-11-16"
  },
  {
    "id": "atlas-batch3-callout-checkbox",
    "area": "Atlas",
    "where": "Callouts (warning and error titles, the lock note), the disabled checkbox",
    "t": "Warning and error callout titles take the severity colour, the lock note icon is 16px, and a disabled checkbox uses the Atlas disabled colours",
    "b": "Remaining findings of the first Atlas audit report (ATLAS-AUDIT-2026-11-16.md, sections 3 and 6), built when Ryan said to fix anything remaining on 2026-11-16. (1) In a warning or error callout the title is text/warning or text/error and the description stays text/primary, as in the Atlas Callout variants; before the whole box was text/primary. No warning callout has a title and the one error callout (the failed upload line) has none, so nothing changes on screen today. (2) The lock note on the sign-in and secure fields uses a 16px icon (was 15). (3) A disabled checkbox has the bg/disabled fill (was neutral 200), a text/disabled label (was text/subtle) and an icon/disabled tick when ticked; it is used by the limits confirmation tick on step 3 until the limits are ready. Not changed: the padded row around each checkbox (padding 8, radius 8), which Atlas does not have and which Ryan has not been asked about, and the disabled checkbox border, whose Atlas value was not re-read.",
    "tradeoff": "The disabled checkbox border is still border/default; I did not re-read the Atlas disabled border, so it may differ by a shade. The disabled tick colour was taken from the first report, not seen on screen next to the Figma variant. Ryan also told me to ignore the Accordion component for now (work in progress in Atlas), so none of its findings were acted on.",
    "by": "Ryan",
    "when": "2026-11-16"
  },
  {
    "id": "atlas-file-drop-hint-line",
    "area": "Atlas",
    "where": "Step 6 document cards, the drop zone",
    "t": "The drop zone has no hint line; each document's guidance stays above it, as before",
    "b": "Atlas File drop has a hint line (Caption, text/subtle) under the prompt (ATLAS-AUDIT-2026-11-16-batch2.md, finding 4.6). Ryan chose to use it, and I first moved each document's own guidance (for example Include all four corners and avoid glare) into the zone as the hint. Ryan then said the hint should be exactly as Atlas writes it and the guidance should go back where it was, so it did. The guidance stays as body text under the document title, above the drop zone, and the zone shows only the icon, Drag a file here and or browse. The prototype has no file type or size rules to put in an Atlas hint line.",
    "tradeoff": "The zone is 126px high at rest (measured) where Atlas draws 148px with its hint line. If the product has real file type and size rules, they would go in the hint line as Atlas shows it, and the height would then match.",
    "by": "Ryan",
    "when": "2026-11-16"
  },
  {
    "id": "masked-field-not-read-only",
    "area": "Atlas",
    "where": "Encrypted or hidden value fields (account number, SSN)",
    "t": "The masked field keeps the white editable fill: it is not an Atlas read-only field",
    "b": "Atlas Input has a state=read-only variant (Input box in Figma): fill color/background/surface/sunken (#fafafc), 1px border/input, radius 8, value text unchanged. The Atlas page calls it a proposed state. On 2026-11-16 Ryan first chose to keep white, then asked for the sunken fill, then said the masked field should not use read-only at all: the box is editable (Show reveals and edits the value), so a read-only look would confuse. The masked value is a kind of field Atlas does not have yet, and Ryan will define it in Atlas separately. Until then it keeps the normal white Input look. The sunken fill I had added to it is removed. The input is marked readonly in code only so the dots cannot be typed into. Values that really are read-only, such as the yearly card volume (.affix--static), already use the sunken fill.",
    "tradeoff": "The masked field is a custom field with no Atlas component behind it, so its look (padlock, monospace text, Show link) is not checked against Atlas and will need redoing once Atlas has the field.",
    "by": "Ryan",
    "when": "2026-11-16"
  },
  {
    "id": "atlas-checkbox-row-flush",
    "area": "Atlas",
    "where": "Checkbox rows (step 3 limits tick, step 5 consents, step 7 agreement)",
    "t": "The checkbox row is flush like Atlas: no row padding or radius, 8px between label and hint, disabled hint in text/disabled",
    "b": "From the first Atlas audit report (ATLAS-AUDIT-2026-11-16.md, finding 3.3), answered by Ryan on 2026-11-16. Atlas Checkbox (Figma, read from the variant layers) is a 24px target holding a 16px box, 8px gap to the label, no padding or radius on the row. The prototype row had padding 8/16/8/8 and radius 8, which is removed, so the 24px target now sits flush with the text and the box is inset 4px as in Atlas. The hint line under the label is 8px below it (gap/related), as Atlas builds its Content frame, instead of the 4px I had set in the spacing sweep. The disabled hint is text/disabled like the disabled label. The disabled box border was re-read in Figma and is border/default, which the prototype already used. The red ring that was drawn around the whole row in error is removed: Atlas marks an error checkbox with a border/error box and error text only, and the prototype's box already does that.",
    "tradeoff": "Rows sit 16px closer to the card edge on the right and 8px higher and lower than before, so stacked checkboxes are tighter and the click area is the label and box only, not a padded row. The 8px hint gap overrides the 4px title-plus-subtitle rule of atlas-spacing-by-role for checkboxes, following the component. The error state now relies on the box border and the error message, with no ring around the row.",
    "by": "Ryan",
    "when": "2026-11-16"
  },
  {
    "id": "atlas-currency-input",
    "area": "Atlas",
    "where": "Money fields (step 3 card volumes, average and largest payment) and the yearly volume box",
    "t": "Money fields follow the new Atlas Currency input: Amount/Small text and a plain currency code inside the box",
    "b": "Atlas added a Currency input component (Figma page Currency input). From its variant layers: the symbol, the typed value and the ISO code are all Amount/Small (Roboto 14/500); the symbol is text/secondary, the value text/primary and the code text/subtle; the box is 40px high with padding 0/12 and an 8px gap; the placeholder stays Body/Default in text/subtle. The prototype had the value and symbol in Roboto Mono 13/400 and the currency code in its own shaded cell (sunken fill, left rule, 12/600 caption). Ryan asked on 2026-11-16 for the amount field to match Atlas, so the mono face is gone, the code is plain text in the same box, and the narrow-column box no longer tightens its gap to 4px. The yearly card volume box (read-only) keeps the Atlas read-only fill and takes the same text. The reason for showing the code at all is unchanged (see currency-code-on-amounts).",
    "tradeoff": "Digits are no longer in a monospaced face, so amounts rely on Roboto's tabular figures (font-variant-numeric: tabular-nums is kept) to stay aligned. The quarter-width boxes in the volume row are about 192px wide at 1280px, which fits a six-figure amount with the code; I checked that width only, not narrower laptop widths. Update, 2026-11-17: Atlas changed the component again, so the Amount/Small text and the plain suffix are replaced (see atlas-currency-input-code-cell).",
    "by": "Ryan",
    "when": "2026-11-16"
  },
  {
    "id": "atlas-phone-input-one-box",
    "area": "Atlas",
    "where": "Every phone number field (step 1 business phone, step 2 owner phones, the invite flow)",
    "t": "The phone field is one box with a country selector, a divider and the number, with the Atlas Phone country popup",
    "b": "Atlas added a Phone input (with a Phone country popup and a Flag set). The prototype had two separate boxes, a 124px select with an emoji flag and a number input. It is now one 40px box (fill raised-1, 1px border/input, radius 8, padding 0/12, gap 8) holding the selector (24px high, radius 8, padding 0/8: a 24x16 flag, the dial code in Body/Default text/primary, a 16px chevron in icon/secondary), a 1px border/divider rule and the number. Hover is border/hover; focus or an open list is border/focus with the focus glow; error colours the whole box. The list is the Atlas Phone country popup: raised-2, 1px border, radius 12, a search row on top (Search country or dial code) in the focus ring, then 40px rows with the flag, country name, dial code and a check on the chosen row, and an empty row No results for typed text. Check the spelling. Ryan chose to add the search row. The search finds a country by name or by dial code with or without the plus. Keyboard: Arrow Down or Up on the selector opens the list and moves focus into the search; arrows move the highlight, Enter picks, Escape closes and returns focus to the selector. The flags for the eight countries Atlas draws (US, GB, AU, NZ, FR, DE, IE, ES) are the Atlas artwork exported to assets/flags; Canada and the other four countries (IT, NL, MX, IN) keep the emoji flag until Atlas adds them (Ryan chose that on 2026-11-16). The value format, digit spacing and validation are unchanged (see phone-input-component).",
    "tradeoff": "Two kinds of flag sit side by side in the list (artwork and emoji), and Canada, one of our two home countries, is an emoji until Atlas draws it. The emoji flags can render differently across operating systems. The search row makes the list longer to build than the plain select it replaces. Focus is moved by a short timer after the list opens, so a very slow device could show the list for a moment before the cursor is in the search box.",
    "by": "Ryan",
    "when": "2026-11-16"
  },
  {
    "id": "atlas-dialog-status-spacing",
    "area": "Atlas",
    "where": "All dialogs (save, confirm, invite, help, document viewer), the in-review timeline spinner, the more-info accepted-documents heading",
    "t": "Dialogs use the Atlas spacing ladder, and two status screen details use tokens",
    "b": "From the fourth Atlas audit report (ATLAS-AUDIT-2026-11-16-batch4.md, findings 4.1, 4.2, 3.2 and 3.5), answered by Ryan on 2026-11-16. Dialog padding was 28px, which is not on the ladder; it is now padding/hero (24px). The gap between the header icon and the title was 12px and the space under the header 8px; both are now gap/related (8px), the icon-plus-text rule from atlas-spacing-by-role. The in-review timeline spinner used raw white (#fff and rgba(255,255,255,.4)); it now uses icon/on-brand, with the faint ring made by mixing it at 40%. The Either of these works heading on the more-info screen was Label/Default in text/primary; it is now text/secondary like every other Atlas label, with its 8px margin as gap/related. Atlas has no Dialog component, so the dialog radius (12), width (460) and shadow are the product's own and unchanged.",
    "tradeoff": "The dialog is 4px less padded on each side, so its content is a little tighter and 8px of width is gained for the invite email box. The icon in a dialog header now sits closer to its title than it did. The document viewer paper inside the wide dialog keeps its own 28/32 padding (the paper is a document, not dialog chrome).",
    "by": "Ryan",
    "when": "2026-11-16"
  },
  {
    "id": "account-holder-no-helper",
    "area": "Payout account",
    "where": "Step 4, Account holder name (United States and Canada)",
    "t": "The helper line under Account holder name is removed",
    "b": "The line This needs to match your legal business name. (organization for a non-profit) under the Account holder name box on the main payout account is removed, for both the United States and Canada versions. Ryan asked for it on 2026-11-16 and gave no reason. The box keeps its placeholder, Exactly as it appears on the account, and its label. The agreement and the checks at step 7 are unchanged. A usability test run before this (sam-okafor) had flagged this line as a minor problem for sole proprietors, whose account may be in their own name; that note is in usability-testing/results/sam-okafor.",
    "tradeoff": "Nothing now tells the applicant that the account name should match the legal business name, so someone may type a personal or trading name; whether that causes bank verification to fail is for ops to say. The placeholder still says to type the name exactly as the account shows it.",
    "by": "Ryan",
    "when": "2026-11-16"
  },
  {
    "id": "more-info-file-drop",
    "area": "Atlas",
    "where": "More info needed screen (the card for each request, and the bare Just uploads and notes option)",
    "t": "The More info needed screen uses the File drop zone, not a small Choose file button",
    "b": "From the fourth Atlas audit report (ATLAS-AUDIT-2026-11-16-batch4.md, finding 3.4), answered by Ryan on 2026-11-16. Every request card, and every card on the bare screen, used a small outline Choose file button (Add another file once there was one) while step 6 uses the Atlas File drop zone. Both now use the same zone: dashed border, upload icon, Drag a file here, or browse, hover tint and the drop-to-upload state. Clicking it adds the canned file as before; dropping real files adds one entry for each, using only the file name, and a repeated name gets -2, -3 added. On the request cards the zone stays under the text after a file is in, with the uploaded files listed below it, so any number of files can be added (the Add another file button is gone). On the bare screen each card still holds one file, so the zone is replaced by the file name and Remove file once a file is in. The zone has no hint line, as in atlas-file-drop-hint-line, because the prototype has no real file type or size rules. It is built once (dropZoneView) and the document cards use the same function. Ryan gave no reason beyond matching the rest of the product.",
    "tradeoff": "The zone is about 126px tall, so each request card is taller than with a button, and a card for a request that only wants a short message now shows a large upload area. The bare screen's card now has a zone only until a file is in, so its layout shifts when a file arrives.",
    "by": "Ryan",
    "when": "2026-11-16"
  },
  {
    "id": "approved-screen-atlas-type",
    "area": "Atlas",
    "where": "Approved screen",
    "t": "The approved card uses the Atlas page title and the 24px card padding",
    "b": "From the fourth Atlas audit report (finding 3.8), answered by Ryan on 2026-11-16. The title Welcome to Xplor Pay was 34px bold with a 1.14 line height and a raw -0.02em letter spacing, and the card padding was 36px, which is not on the spacing ladder. The title now uses the Atlas page-title style (Roboto 600, 30px on a 36px line, -0.3px letter spacing, the same as every other page title) and the card padding is padding/hero (24px). Not changed: the dark gradient card, its raw white and rgba colours and the light buttons on it, which stay in the foundations raw-values list for a later call.",
    "tradeoff": "The approved moment is a little less prominent than at 34px, and on a wide screen 24px padding makes the dark card feel tighter around the text and button.",
    "by": "Ryan",
    "when": "2026-11-16"
  },
  {
    "id": "dialog-focus-trap",
    "area": "Atlas",
    "where": "All dialogs (save, confirm, invite, help, document viewer)",
    "t": "Tab stays inside an open dialog, and focus always moves into it when it opens",
    "b": "From the fourth Atlas audit report (finding 4.5), answered by Ryan on 2026-11-16 (test all five dialogs and fix the gaps). Checked in the Browser pane: Escape and focus returning to the control that opened the dialog already worked. Two gaps were found and fixed. First, nothing kept Tab inside a dialog, so a keyboard user could tab to the page behind the dimmed area. Tab now wraps from the last control to the first and Shift+Tab from the first to the last, and focus that has ended up outside the dialog is pulled back in. Second, the save dialog moved focus to its email box only in Slice 2; in Slice 1 it has no email box, so focus stayed on the Save and exit button behind the dialog. Every dialog now moves focus to its named control and falls back to the first control in the dialog on top (the Close button for the save dialog in Slice 1). Checked on the save and help dialogs. The confirm, invite and document viewer dialogs use the same code and were not opened by eye.",
    "tradeoff": "The trap looks only at the dialog on top and at buttons, links and fields that are visible, so a control added to a dialog later is covered, but anything not focusable by those rules is not. The help dialog has one control (Close), so Tab never leaves it.",
    "by": "Ryan",
    "when": "2026-11-16"
  },
  {
    "id": "hero-icon-pulse-kept",
    "area": "Atlas",
    "where": "Under review screen, the hero icon",
    "t": "The hero icon on the under review screen keeps its slow pulse",
    "b": "From the fourth Atlas audit report (finding 3.3), answered by Ryan on 2026-11-16: keep it. The brand-colour ring pulses without end (xpulse, 2.4 seconds) around the hero icon, as it does on the current step dot. It is not an Atlas pattern, since Atlas defines no pulse. A global rule at the top of the stylesheet turns it off for people who ask their device for reduced motion. Ryan gave no reason beyond keeping it.",
    "tradeoff": "A pulse that never ends can distract on a screen the applicant may leave open for hours, and it is a motion Atlas does not define.",
    "by": "Ryan",
    "when": "2026-11-16"
  },
  {
    "id": "foundations-raw-values-sweep",
    "area": "Atlas",
    "where": "Static cards, the typed-signature box (unused), the welcome title on phones",
    "t": "Three raw foundation values from the first audit report are gone",
    "b": "From the first Atlas audit report (ATLAS-AUDIT-2026-11-16.md, section 1), answered by Ryan on 2026-11-17. (1) The --lift-static shadow (0 1px 1px, 2% black) is removed from every static card, the document rows, the what-you-need panels, the person and summary cards and the hero card; the 1px border/default now does all the separating, which is what static-cards-flat intended. Atlas shadow-xs was not used. (2) The .sign-input rule (typed signature box, 22px italic, 52px high) now takes the Atlas control height and padding from .input and the section-title size (20px), keeping the italic. Nothing in the prototype uses that class any more, because the signature is drawn or uploaded (signature-draw-or-upload), so it only matters if a typed signature comes back. (3) The phone-width override that made the welcome title 32px, larger than the 30px desktop page title, is deleted, so the title is the Atlas page-title style at every width.",
    "tradeoff": "Cards sit completely flat, a hair flatter than the 2% shadow they had, so on a very bright screen the white-on-grey contrast and the border carry everything. A typed-signature box at 20px is smaller than the old 22px.",
    "by": "Ryan",
    "when": "2026-11-17"
  },
  {
    "id": "approved-on-dark-deviation",
    "area": "Atlas",
    "where": "Approved screen: the dark card and its buttons",
    "t": "The dark approved card is kept, with Atlas tokens where Atlas has them",
    "b": "From the first Atlas audit report, answered by Ryan on 2026-11-17: keep the dark gradient card and tokenise what exists. Text is now text/on-brand (white); the body text, the green tag fill and the outline button border are mixes of those tokens (a percentage of the token over transparent) instead of rgba values; the light button uses the white primitive with neutral-1200 text; the outline buttons use the white-a10 and white-a30 primitives. The gradient already used deep space, purple-900 and purple-700. What stays a deviation: Atlas has no on-dark surface and no on-dark Button, so .btn-light, .btn-light-outline and .btn-on-dark are the product's own and are the first things to replace if Atlas adds them. .btn-on-dark uses white-a30 for its border and .btn-light-outline uses white-a10 for its hover fill, which match the old values; the 45% border and 70% hover border of .btn-light-outline are token mixes with no Atlas equivalent.",
    "tradeoff": "Anyone changing the white primitive changes this card too. The percentages (16, 45, 70) are still the prototype's own numbers, not Atlas ones.",
    "by": "Ryan",
    "when": "2026-11-17"
  },
  {
    "id": "division-marker-atlas-tokens",
    "area": "Atlas",
    "where": "Step 6, documents that only one division asks for",
    "t": "The division-only document marker uses Atlas colours, not orange",
    "b": "From the first Atlas audit report, answered by Ryan on 2026-11-17. A document that only one division asks for (for example ClubReady only) had a dashed orange outline (#e8590c) and an orange tag (#b4440a on #fff1e6), none of them Atlas colours. The tag is now the Atlas badge look: bg/brand/subtle fill, text/brand, label style, 24px tall with cell padding, radius small. The dashed outline stays, 2px (border/thick), in border/brand. Decisions division-option and clubready-lease-by-division are unchanged.",
    "tradeoff": "The marker now shares its colour with the brand-purple tags and the selected look elsewhere, so it no longer stands out as a special case the way orange did; the dashed outline is what still sets those cards apart. Atlas Badge has no variant of exactly this look, so the tag is styled by hand to match.",
    "by": "Ryan",
    "when": "2026-11-17"
  },
  {
    "id": "ring-progress-deviation",
    "area": "Atlas",
    "where": "Step rail and document status, the small circular progress ring",
    "t": "The circular progress ring stays; Atlas has no circular progress",
    "b": "From the first Atlas audit report, answered by Ryan on 2026-11-17: keep it and record it. The ring (.ring, 14px, and .ring--lg, 22px, a conic gradient cut by a mask) shows a share done where a tick would otherwise go. Its colours are tokens (background/success/default and border/default); its sizes and the 2.5px and 3.5px ring thickness are the product's own, because Atlas Progress bar is a straight bar only. If Atlas adds a circular progress, this is the thing to replace.",
    "tradeoff": "A third progress look next to the straight Progress bar and the percentage text; the sizes are not on any Atlas scale.",
    "by": "Ryan",
    "when": "2026-11-17"
  },
  {
    "id": "listbox-active-descendant",
    "area": "Accessibility",
    "where": "Every select, search box and combobox with a pop-up list (province, country, MCC, address search, business lookup)",
    "t": "The highlighted option in a pop-up list is announced to screen readers",
    "b": "From the fifth Atlas audit report (ATLAS-AUDIT-2026-11-16-batch5.md, finding 5.1), answered by Ryan on 2026-11-17 (fix 5.1 to 5.3). The lists marked the highlighted row only with a class, so someone using a screen reader heard nothing change as they pressed Arrow Down. Every option now has an id (lb-<field id>-opt-<number>), and the field carries aria-activedescendant pointing at the highlighted option while the list is open. This covers the Select, the MCC combobox, the address search and the business lookup (including its Can't find it row); the phone country pop-up already did this. Checked in the Browser pane on the Province select, the MCC box and the business lookup: the attribute names the same row that carries the highlight. Atlas describes none of this, so the pattern is the standard combobox one, not an Atlas rule.",
    "tradeoff": "Not tested with a real screen reader, only by reading the attribute against the highlighted row. The lists that show no highlight yet (the lookup before the first arrow press shows the first row as active) announce that first row as soon as the list opens.",
    "by": "Ryan",
    "when": "2026-11-17"
  },
  {
    "id": "lookup-focus-after-pick",
    "area": "Accessibility",
    "where": "Step 1, Find your business",
    "t": "After a keyboard pick in the business lookup, focus moves to the next control",
    "b": "From the fifth Atlas audit report (finding 5.2), answered by Ryan on 2026-11-17. Picking a business replaces the search box with a green callout, which dropped focus to the page body, so a keyboard user had to tab from the top. Focus now goes to the Search again button in the callout (the control that undoes the choice). Choosing Can't find it? Enter details manually moves focus to the Legal name box, the first thing to type. The move runs 60 milliseconds after the pick so the new content has been drawn. Checked on the pick (the active element is Search again); the manual route was not driven by eye.",
    "tradeoff": "A mouse user who clicks a result also gets focus on Search again, so a focus ring may appear on that button after a click. If the page draws very slowly the 60ms wait could be too short and focus would stay on the page body.",
    "by": "Ryan",
    "when": "2026-11-17"
  },
  {
    "id": "biz-card-type-tokens",
    "area": "Atlas",
    "where": "What type of business are you? cards",
    "t": "The business type cards use the Atlas Body fonts and a computed indent",
    "b": "From the fifth Atlas audit report (finding 5.3), answered by Ryan on 2026-11-17. The card label was 16px with no set line height (about 19px); it now uses the Body/Large font (16px on 24px) with the bold weight. The description had a 1.45 line height (18.85px); it now uses Body/Small (13px on 20px). The question that opens under a card (the kind of company) was indented 42px; it is now the card padding plus the radio size plus the related gap (16 + 16 + 8 = 40px), which puts its left edge exactly under the label (checked: both start at the same x), and its bottom padding is the card padding (16px) instead of 20. Not changed: the 8px radio dot and its 2px top margin (Atlas Radio was not re-read), and the cards themselves, which stay the product's own because Atlas has no selectable card.",
    "tradeoff": "Each card is about 5px taller for the label and 1px taller for the description, so the page is slightly longer. The open card has 4px less space under its question.",
    "by": "Ryan",
    "when": "2026-11-17"
  },
  {
    "id": "volume-boxes-widen-narrow",
    "area": "Atlas",
    "where": "Step 3, the monthly and yearly card volume boxes",
    "t": "Below a 1100px page the volume boxes take the whole row so large amounts fit",
    "b": "From the fifth Atlas audit report (ATLAS-AUDIT-2026-11-16-batch5.md, finding 5.4), answered by Ryan on 2026-11-17: break the row sooner. At a 1024px window the monthly volume box was a quarter of the form, 130px, which left 56px for the digits, so 1,000,000 or more was cut off (99,999,999 needs 74px). Now, when the page container is 1099px or narrower, the monthly and yearly pair takes the whole row, half each: the boxes are 277px wide at 1024px and 99,999,999 fits with room to spare (202px for the digits). The labels fit on one line there, so the two-line label height that kept the row aligned is dropped at that width, for the pair and for Card present percentage. Above 1100px nothing changes (at 1280px the box is 192px). At 420px and narrower the two boxes already stacked. This builds on yearly-volume-shown.",
    "tradeoff": "Below 1100px the row order reads monthly and yearly, then Card present percentage and Average payment amount side by side, then Largest single payment with an empty space beside it, so the step is one row longer than before. Between 1100px and about 1200px the quarter-width boxes still wrap the monthly label to two lines, as before.",
    "by": "Ryan",
    "when": "2026-11-17"
  },
  {
    "id": "step-rail-collapses-narrow",
    "area": "Flow",
    "where": "The step list beside the form, on tablet and phone widths",
    "t": "On narrow screens the step list is folded away behind a Show steps button",
    "b": "From the fifth Atlas audit report (finding 5.5), answered by Ryan on 2026-11-17: collapse it with a toggle. Below a 760px page the seven-row step list used to run full width, 414px tall, so the first question started about 750px down a tablet screen (and the same on a phone). Now the progress bar and the saved note stay, and under them one row shows the current step's name with a small Show steps button (Hide steps once open; aria-expanded and aria-controls are set). The list and Get help button are hidden until the button is pressed, and the list closes again whenever the applicant moves to another step. The rail grows from about 414px to 116px tall, and the first question moves up by about 200px at 768px wide. At and above 760px the row is never shown and the rail is exactly as before (checked at 1280px). The step number and total are not repeated in the row because the Step 3 of 7 line above the title already says them.",
    "tradeoff": "The other steps and their minutes or Done marks are one tap away instead of always visible, so an applicant on a phone cannot see their overall route at a glance. The folded state is a prototype decision; Atlas has no stepper to follow.",
    "by": "Ryan",
    "when": "2026-11-17"
  },
  {
    "id": "add-row-control-height",
    "area": "Atlas",
    "where": "Step 2, the Add another owner or director and Add myself rows",
    "t": "The add rows are 40px tall like every other control",
    "b": "From the fifth Atlas audit report (finding 5.6), answered by Ryan on 2026-11-17. The dashed add rows were 50px tall (16px padding top and bottom around a line height of normal). They now have a 40px minimum height, side padding of 16px (padding/surface) and the Control/Default font (14px, weight 500, 20px line); computed height is 40px. The dashed border, radius, brand-coloured text and hover tint are unchanged. Atlas has no add row, so the shape is still the product's own.",
    "tradeoff": "The row is a little less prominent next to the large owner cards above it, and the dashed shape now matches the control height rather than the card padding.",
    "by": "Ryan",
    "when": "2026-11-17"
  },
  {
    "id": "atlas-currency-input-code-cell",
    "area": "Atlas",
    "where": "Money fields (step 3 card volumes, average and largest payment) and the yearly volume box",
    "t": "Money fields follow the updated Atlas Currency input: Body/Default text and the currency code in its own cell",
    "b": "Ryan said on 2026-11-17 that the Currency input had changed in Atlas. Read again from the Figma variant layers (set 3587:167, 12 variants, medium and large): the symbol, the typed value and the ISO code are now all Body/Default (Roboto 14/400 on a 20px line), because the designer decided Amount styles are for amounts outside an input. The symbol is text/secondary, the typed value text/primary, the placeholder text/subtle. The ISO code is back in its own cell at the right end of the box: surface/sunken fill, a 1px border/divider rule on its left, text/secondary, padding-x (12px at large) on both sides, and the box has no right padding, so the cell sits inside the 1px border and the border and focus glow wrap it. In the prototype the symbol, value and code use the Body/Default font; .affix-code is the cell (stretches the box height, inset by the border width on top, right and bottom, radius 0 and 7px on its right corners, border-left in border/divider, sunken fill, text/secondary, 12px side padding); the box has padding-right 0. The yearly volume box (read-only) keeps its sunken fill, so only the divider separates it from its cell, as in the Atlas read-only variant. Checked in the Browser pane: box 40px, cell 38px high and 52px wide, 1px inset on top and right, all text 14/400/20, and a nine-digit amount still fits at 1200px and at 1100px (where the volume pair already takes the full row, see volume-boxes-widen-narrow). Tokens were rebuilt from the Atlas-tokens repo and had not changed. This replaces the plain-suffix and Amount/Small parts of atlas-currency-input.",
    "tradeoff": "The cell takes about 52px of each money box, so the digits have less room than with a plain suffix; 99,999,999 still fits at 1200px with about 10px to spare, but a longer number in the quarter-width boxes just above 1100px would be tight. Atlas notes the read-only box and cell share one fill, so the divider alone separates them, and leaves that open for the designer. Checked afterwards (2026-11-17): the error look (red 1px ring wrapping the cell, message with icon), the focus look (brand ring and glow wrapping the cell) and the phone layout at 375px (boxes stack, 287px wide, 199px for digits, no sideways scroll) all read correctly.",
    "by": "Ryan",
    "when": "2026-11-17"
  },
  {
    "id": "email-forms-novalidate",
    "area": "Atlas",
    "where": "The sign-in form, the save-and-exit dialog and the invite dialog (every email box in the flow)",
    "t": "The three email forms turn off the browser's own validation so the app's error text shows",
    "b": "Found on 2026-11-17 while checking the invite dialog at 375px. All three forms have an email box with type=\"email\" and no novalidate attribute, so pressing Send invite (or Save, or Sign in) with an entry like not-an-email showed the browser's own speech bubble (\"Please include an '@'\") and the app never ran its own check. The app already has its own wording and its own error place for this (\"Enter an email like name@example.com.\", the field-error line under the box, role alert), written to the content rules and to errors-only-for-bad-entries, and the browser bubble bypassed all of it and reads differently in every browser and language. Each form now has novalidate, so the submit reaches the app, which shows its own message. Checked in the Browser pane on the invite dialog (real Return key with a bad entry shows the app's red line and no bubble); the login form reports noValidate true. The save dialog has the same attribute and runs the same kind of check, but was not driven with a bad entry by eye.",
    "tradeoff": "novalidate also switches off the browser's other checks on these forms (required, pattern), so the app's own checks are the only ones. That is the intent here, and each of the three forms already checks its email itself, but any new field added to these forms must be checked by the app too. The type=\"email\" attribute stays, so phones still show the email keyboard.",
    "by": "Ryan",
    "when": "2026-11-17"
  },
  {
    "id": "lookup-focus-after-reset",
    "area": "Atlas",
    "where": "Step 1 business lookup, the \"Search for my business instead\" link and the change link on the picked-business callout",
    "t": "Focus goes to the search box when the business search comes back",
    "b": "Found on 2026-11-17 in the check of the unchecked items. lookup-focus-after-pick sends focus on after a pick or after the manual route, but going the other way (\"Search for my business instead\", or the change link on the green callout) removed the link that had focus and left focus on the page body, so a keyboard user had to tab in again from the top of the page. The reset handler in bizFindView now focuses the search box (f-bizFind) 60ms after the state change, the same short wait the other two paths use, so the new box is on the page. Checked in the Browser pane with the real keys: manual route puts focus in Legal name, then the link puts focus in the search box (activeElement f-bizFind).",
    "tradeoff": "The search box opens its suggestion list when it gets focus, so the list is open straight after the reset. That matches what happens when anyone tabs into the box, and Escape closes it. The change link on the picked callout was not driven by eye, only the manual-route link, though both call the same handler.",
    "by": "Ryan",
    "when": "2026-11-17"
  },
  {
    "id": "limits-tick-removed",
    "area": "Flow",
    "where": "Step 3 · Your card volumes, the limits tick (state key velocityAck)",
    "t": "The limits tick is removed from step 3",
    "b": "Ryan asked on 2026-11-17 to remove the tick I confirm the limits above are correct for my business, after asking why it was there. The register had no reason for adding it (limits-from-entries, limits-ack-in-volumes and limits-tick-confirm-wording record only how it behaves and where it sits), and Ryan gave no reason for removing it either beyond not being able to work out why it was needed. What the project does record: PRD-DESIGN-GAP-INVENTORY.md item 5.9 lists it as in the design but not in the PRDs, because Provisioning FR-01 places the daily and monthly limit acknowledgement at merchant creation, after approval, not inside the application form. Removed with the tick: its hint (Your monthly limit is $Y, based on the monthly volume you entered. Ask us any time to raise it., or the Enter ... to see your limits text while it waited), the code that cleared it when the monthly volume or largest payment changed, the limitsFrom helper, the velocityAck answer and its sample value, and the row in tools/build-field-spec-v2.py. Your card volumes now ends with Have you accepted card payments before? and its follow-ups. Step 3 saves and continues without it. The step 3 progress count is worked out from the fields on the page, so it needs no change.",
    "tradeoff": "The applicant is no longer told anywhere what their limits are or that they can ask to raise them, and nothing records that they saw them. If Legal or Compliance wanted that confirmation, it now has to happen after approval at merchant creation, as the Provisioning PRD has it. Onboarding-field-specification-v2.xlsx still lists the row until it is rebuilt from the Python builder (there is no Python on this machine, so it was not rebuilt). REQ-121, REQ-200 and the other requirement entries about the tick in REQUIREMENTS-DRAFT.md are left as they are, since the register is the archive.",
    "by": "Ryan",
    "when": "2026-11-17"
  },
  {
    "id": "select-keydown-no-key",
    "area": "Fields",
    "where": "Every dropdown (selectView), the keyboard handler",
    "t": "The dropdown's keyboard handler no longer throws when a key event arrives with no key",
    "b": "Found on 2026-11-17 in the Browser console while checking the lookup and dialogs: Cannot read properties of undefined (reading 'length') from the dropdown's keydown handler. The type-a-letter-to-jump branch read e.key.length and e.key.toLowerCase() without checking that e.key exists. Some events reach a handler with no key at all (a browser autofill choice, a synthetic or automated key event), so the handler threw and, for those events, the rest of the handler did nothing. The branch now starts with e.key && ... so a key-less event is ignored. Checked in the Browser pane on the step 3 channel dropdown: a key-less keydown dispatched at it gives no error, the real ArrowDown still opens the list, and a real m still moves the highlight to Mobile. The other keydown handlers in the app only compare e.key with fixed names (===), which is safe when it is missing, so none of them needed a change.",
    "tradeoff": "A key-less event does nothing, which is the right result for an event with no key, but if a real device ever sends letter input this way the type-ahead would not work for it. Nothing about this was reproduced with a real autofill, only with a synthetic event, so the exact trigger Ryan's browser had is not confirmed.",
    "by": "Ryan",
    "when": "2026-11-17"
  },
  {
    "id": "limits-never-mentioned",
    "area": "Copy",
    "where": "Step 3 · Your card volumes subtitle, and the Why are we asking? popover for step 3",
    "t": "Nothing on the form tells the applicant that their answers set their limits",
    "b": "Ryan, 2026-11-17: remove the line These set your limits, not your rate. We don't want applicants to know these set their limits, so any mention of it must go. The subtitle under Your card volumes now reads only Best guesses are fine. In the step 3 Why are we asking? popover, the sentence Your answers help us set sensible limits and see what a normal day looks like for you, so real payments don't get held up. now reads Your answers help us see what a normal day looks like for you. The held-up clause went with it because it points at limits too. A search of app.js for the word limit finds nothing else in applicant-facing copy (only Limited liability company and partnership in the structure lists, and the register text). This follows the removal of the limits tick the same day (limits-tick-removed). Ryan's reason is recorded as he gave it; the register does not say why applicants should not know.",
    "tradeoff": "The line existed to calm people who might stall on the volume questions (see underwriting-plain), so the reassurance that these numbers are not about the rate is gone from the card; the popover still says None of it changes the rate you pay, which is a statement about pricing and is locked wording that needs Legal and Compliance (CONTENT-AUDIT-2026-11-13.md 7.1). Applicants may now wonder what the volume answers are for, and may inflate or stall on them. The popover's reason is thinner too: it says only that the answers show what a normal day looks like. The historical files CONTENT-AUDIT-2026-11-13.md and TONE-OF-VOICE-CHANGES.csv still quote the old lines and were left as a record.",
    "by": "Ryan",
    "when": "2026-11-17"
  },
  {
    "id": "get-help-in-top-nav",
    "area": "Layout",
    "where": "Top bar on the seven steps, and the step list on the left",
    "t": "Get help moves from the step list into the top bar, left of Save and exit, the same size",
    "b": "Ryan, 2026-11-17: move the Get help button into the top nav at the top right, just to the left of Save and exit, and make sure they are the same size. Ryan gave no other reason. Get help now sits in a group with Save and exit at the right end of the bar, with the question-mark icon at 16px. Both are the same Atlas neutral Button at the prototype's medium size (40px high, 14px medium-weight label, 20px side padding), with an 8px gap, and the group is two equal columns, so they are also the same width (125.25px each on a desktop window), the Get help box being widened to match the longer label. Get help has a raised-1 white fill and the hover fill, like the Get help it replaces. The button that sat under the step list is removed, along with its styles, and the folded step list on a narrow screen no longer has it. It opens the same Talk to a person dialog and focus returns to the button when the dialog closes (checked with Escape). It shows wherever Save and exit shows, which is the seven steps. At 480px or narrower the logo drops from 24px to 20px, the bar's side padding matches the 20px page gutter, and the two buttons take the Atlas medium side padding (12px) so they fit on one line at 375px (109.25px each, no horizontal scroll). The Get help button on the welcome page, left of Let's get started, is unchanged.",
    "tradeoff": "On a phone the buttons have 12px side padding where the rest of the prototype's medium buttons have 20px, and the logo is smaller, which are small departures to make two equal buttons fit beside the logo. The two buttons are the same width because of equal columns, not because the labels are the same length, so a longer label in another language would widen both. Get help is now in view all the time on the steps, including on a phone where it used to be inside the folded step list, so it is easier to find and takes top-bar room. The welcome page and the business type page still have no Get help in the bar (the welcome page has its own button in the page; the business type page has none, as before).",
    "by": "Ryan",
    "when": "2026-11-17"
  },
  {
    "id": "uploaded-file-check-icon",
    "area": "Documents",
    "where": "Uploaded file tile on step 6 document cards, More info needed request cards, and the simple More info needed screen",
    "t": "An uploaded file shows a green check-circle icon beside its name",
    "b": "Ryan, 2026-11-17: add a check circle icon within the file uploaded component, next to the file name, as a signifier that the file has uploaded successfully. Every uploaded file tile (doc-file) now starts with the Atlas circle-check icon, 16px, in icon/success, before the file name. It appears only once the upload has finished: while the file is Uploading the tile shows the spinner pill and no icon, and a failed file keeps its red callout. The icon is decorative; a screen-reader-only Uploaded word follows the name so the state is not carried by colour or shape alone. Ryan gave no other reason.",
    "tradeoff": "The tile now says uploaded three ways at once: the icon, the Remove link replacing the Uploading pill, and the card losing its Required badge (no-uploaded-badge). That is more signal than strictly needed, but Ryan asked for the icon. Nothing is read or checked at upload (documents-not-scanned), so the icon means the file arrived, not that it is valid.",
    "by": "Ryan",
    "when": "2026-11-17"
  },
  {
    "id": "dba-required",
    "area": "Business",
    "where": "Step 1, Registered details, Doing business as (DBA) box (Trading name for a sole proprietor)",
    "t": "Doing business as (DBA) is required for every business type, including a sole proprietor's Trading name",
    "b": "Ryan, 2026-11-17: make the doing business as field mandatory, and when asked whether a sole proprietor's Trading name should stay optional, said make it required. The box now carries the red asterisk for every business type, and counts towards step 1, so a step 1 with it empty shows as unfinished (90% in the sample business) and holds Submit back, like any other required field (partial-steps-allowed). Ryan gave no reason. The sole proprietor box used to carry the hint If you trade under a different name; that hint was written for an optional box, so it now shows the same example as the others (For example, Riverside Pilates), which is my wording.",
    "tradeoff": "A business or person that trades only under their own legal name now has to type something, and nothing says whether repeating the legal name is acceptable. The Riverside Pilates example is a business name, which is odd for a sole proprietor using their own name. The prototype's sample business already has a DBA, so the rule only shows when it is cleared.",
    "by": "Ryan",
    "when": "2026-11-17"
  },
  {
    "id": "bank-saved-as-account",
    "area": "Payout account",
    "where": "Step 4, Payout account: the form, Save and continue, and a saved account card",
    "t": "Step 4 must be complete before Save and continue, which saves the bank account; coming back shows a saved account card with Re-enter details",
    "b": "Ryan, 2026-11-17: the back end can only store the bank account once everything is entered, so step 4 has to be filled in completely before Save and continue. Pressing it saves the details as a bank account, and if the applicant goes back to step 4 they see a saved account card with a button to change it. Changing it clears every field (Ryan chose Everything when asked which fields to clear, and noted that this is really adding a new account again, which is fine because they are limited to one), so the button is Re-enter details. How it works: (1) While the form shows, Save and continue is off until every field is in and valid, and its hover note lists what is missing. This is the one step that holds the button back; every other step still works while incomplete (partial-steps-allowed, errors-only-for-bad-entries). (2) A warning callout above the form says Fill in every field to continue, and We can only save your bank account once all of its details are in. When every field is filled, Save and continue saves the account for you. The step subtitle says We need every detail before we can save it. (3) Save and continue saves the account, shows a Bank account saved toast and moves to step 5. (4) On return, the form is replaced by a Payout account card with a green Saved badge, the bank name, the account type with the last four digits (for example Business checking · •••• 4417), the account holder, and a Re-enter details button; the fuller number is never shown again. Save and continue is on, and the left column shows step 4 as Done. (5) Re-enter details clears every bank answer and shows the form with a callout, Enter your bank details again, that says the saved account stays as it is until a new one is saved, with a Keep my saved account button that puts the card back. Until the new details are all in, the step shows a percentage and Save and continue is off. (6) Ryan chose: details typed but not yet saved are kept in the browser only, so nothing counts as saved until Save and continue; and if the applicant starts re-entering and does not finish, the old account stays saved. (7) Editing step 4 from the review page works the same way, and its Save button is off until the form is complete. The prototype's sample business starts with the form filled in and not yet saved, so the first Save and continue is what saves it. The callout wording, the Saved badge, the button names Re-enter details (Ryan's suggestion) and Keep my saved account, and the toast are mine. Update, 2026-11-17 (Ryan): the grey callout under the form, and under the saved account card, is removed, leaving the orange callout at the top as the only notice on the step. The subtitle also drops for your other merchants (see extra-bank-accounts). Ryan gave no reason for either. Update, 2026-11-17 (Ryan, later): the orange callout was first built above the Payout account card; Ryan said it should sit inside the card, at the bottom of the form, where the grey lock note used to be. It now does, in both the first-time form and the Re-enter details form (the Keep my saved account button comes with it). The saved account card has no callout. Update, 2026-11-17 (Ryan): the form gains a required Bank account nickname after Bank name, and the saved account card leads with that nickname instead of the bank name. See bank-nickname-field.",
    "tradeoff": "An applicant who is waiting on a bank number cannot move past step 4 and has no way to park it except Save and exit, which keeps what they typed only in the browser, so they may lose a half-filled form on another device. Re-enter details throws away the bank name, holder and type as well as the numbers, so fixing one wrong digit means typing everything again. The warning callout and the disabled button say the same thing twice. How the real back end handles a saved account that is replaced, and what the saved card should show for a Canadian account (institution and transit numbers), is not decided; the card shows only the type and last four digits in both regions.",
    "by": "Ryan",
    "when": "2026-11-17"
  },
  {
    "id": "ecommerce-url-half-width",
    "area": "Step 3",
    "where": "Step 3, How you sell, the Website or app where customers pay box",
    "t": "The e-commerce address box has no helper text and takes half the row, on its own row",
    "b": "Ryan, 2026-11-17: remove the helper text under the Website or app where customers pay box (The page or app where customers pay you online. It starts with your website from step 1, and you can change it.), and make the box 50% wide instead of full width. The box is now half the width of the row, the same as the two boxes above it. Left as a half-width box in the grid it would have shared a row with Recurring billing and left Free trial alone on the next row, so it sits on its own row with the right half empty, and Recurring billing and Free trial stay paired below it. It still starts filled with the website from step 1 (ecommerce-channel-url), only now nothing says so. Below 560px the page is one column and the box fills it, as every box does. Ryan gave no reason.",
    "tradeoff": "Nothing now tells the applicant the box was filled in for them or that it can be changed, so someone may not notice it holds their step 1 website, and may not know a different page or app is allowed. The empty right half of the row is deliberate, to keep the pairs below it level.",
    "by": "Ryan",
    "when": "2026-11-17"
  },
  {
    "id": "bank-nickname-field",
    "area": "Payout account",
    "where": "Step 4, Payout account: the Bank account nickname field, and the saved account card",
    "t": "Step 4 asks for a Bank account nickname, which is the name the account has in Xplor Pay",
    "b": "Ryan, 2026-11-17: step 4 needs a bank nickname field. It is how the bank account is named inside ODIN, and it makes the account easy to find, for example Restaurant Bank Account rather than the name of the bank it is with. How it works: (1) The field sits straight after Bank name, in both the US and Canada forms, with the placeholder For example, Restaurant bank account and the helper line: The name you will see for this account in Xplor Pay, so it is easy to find. It can be different from the bank's name. (2) It is required like every other step 4 field, so Save and continue stays off until it is filled, and it counts in the step's progress (six answers in the US, seven in Canada). (3) The saved account card now leads with the nickname as the account's name, with the bank name, account type and last four digits on the line below, and the Re-enter details button names the account by its nickname. (4) Re-enter details clears it with the rest. (5) The helper text says Xplor Pay, not ODIN, because that is the product name the applicant sees everywhere else in the prototype. (6) The sample data uses Studio operating account. Update, 2026-11-17 (Ryan): helper line changed to: The name for this account in Xplor Pay. It can differ from the bank’s. (replaces the longer line quoted in point 1, which also said so it is easy to find).",
    "tradeoff": "Required, not optional: Ryan did not say which, and required matches the rule that the back end only stores a complete bank account, but it is one more thing to type before an applicant can leave step 4. The prototype puts no limit on length or characters, because no limit was given; the real ODIN field may have one. The helper text names Xplor Pay while Ryan's words said ODIN; if the applicant-facing name in ODIN is different, the line needs changing.",
    "by": "Ryan",
    "when": "2026-11-17"
  }
];

/* DECISIONS:END */
