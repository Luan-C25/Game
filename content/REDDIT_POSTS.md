# ShiftBill v1 - Reddit posts

Written 21 October 2026. Five posts, each with one angle. Luan posts them from his own account; nothing here is ever posted automatically.

**Rules check (do this before every post).** Reddit could not be reached from the build environment, so these rules are from search results and must be confirmed on each subreddit's sidebar on the day:
- **r/NDIS**: a mod post has historically said "No advertising", with bans for breaking it. Treat it as a strict no-promotion community. Posts 2 and 3 are written for it with **no link and no product mention**. If anyone asks what you use, reply only if the rules allow, otherwise say "happy to DM".
- **r/NDIS_Providers**: described as a place where providers can post about services they offer, with a self-promotion flair. Post 1 goes here, with that flair.
- **r/AusFinance**: check the self-promotion rule; post 4 has no link.
- **r/SideProject**: allows project posts, but its spam filter removed one of Luan's posts before because of account age and karma. Post 5 goes last, only once the account has more comment karma.

**Order and spacing:** post 2 (r/NDIS, pure help) first to build karma, then post 1 three or more days later, then 3, 4 and 5 at least a few days apart. Never the same text twice. Reply to every comment in the first few hours.

**Links:** in the body only, never the title. Use the UTM links in `content/LINKS.md` so sign-ups and payments can be traced back to each subreddit.

---

## Post 1: r/NDIS_Providers (self-promotion flair)

**Angle:** a new free tool with zero users, asking providers what it gets wrong.

### Title
Made a free NDIS invoice template that runs in your phone's browser, keen for feedback from independent workers

### Body
I'm a uni student on the Gold Coast and I've spent the last while building an invoice tool for independent support workers. It's brand new, so right now it has zero users, which is why I'm here.

The free part is an NDIS invoice template. No sign-up, it makes the PDF on your phone, and your details stay in your browser. It has the participant's name and NDIS number, item numbers, one line per shift, kilometres, your ABN (it checks the check digits as you type), and PayID. GST stays off unless you say you're registered.

I built it with Claude, I'm not really a developer, so I'd really like people who do this every fortnight to tell me what's missing or wrong.

There's also a paid shift log for A$7 a month that turns logged shifts into invoice lines, but the template is free with no limit.

[NDIS_PROVIDERS link from LINKS.md]

Let me know what you think, good or bad.

### Images
1. Phone screenshot of a finished invoice PDF (`content/images/invoice-sample.png`). This is the thumbnail.
2. Phone screenshot of the template form (`content/images/template-phone.png`).
Use the example data in the images, never a real participant.

---

## Post 2: r/NDIS (no link, no product mention)

**Angle:** a plain answer to a question that comes up a lot: what plan managers need on an invoice.

### Title
For independent support workers: what plan managers actually need on your invoice (from the NDIS guide)

### Body
I've been reading through the NDIS guide to getting paid and a heap of plan manager pages, and the same few things cause most rejected invoices, so here's a short list.

To claim, the NDIS needs the participant's name, their NDIS number, the date of each support, the support item number and the price. Plan managers also need your ABN. If you don't have one they'll usually want a statement by a supplier form.

Put each shift on its own line with the date, item number, hours and rate. Keep kilometres as a separate line. If you're not registered for GST, don't add GST and don't call it a tax invoice.

The things that bounce invoices most: a wrong NDIS number, the wrong item for the time of day, a rate over the price limit for plan-managed participants, dates outside the plan, and duplicate invoice numbers.

Happy to be corrected by plan managers here if I've missed something.

### Images
None. Text only fits this community.

---

## Post 3: r/NDIS (no link, no product mention)

**Angle:** a calm routine for chasing late payments without souring the relationship.

### Title
What's a reasonable way to chase a late plan manager payment? Here's what I'd suggest, keen to hear what works for others

### Body
Waiting weeks on payment comes up a lot for independent support workers, so here's a routine that should work without burning bridges.

Day after it's due, send a short friendly email with the invoice attached again. At seven days overdue, send a second one and ask whether anything on the invoice needs fixing, because a lot of late payments are really a mismatch with the plan. At fourteen days, phone them.

Before chasing, double check the NDIS number, the item numbers, that the dates are inside the plan, and that it went to the plan manager's invoice address and not the participant.

What's worked for you? Especially keen to hear from plan managers on what makes an invoice quick to process.

### Images
None.

---

## Post 4: r/AusFinance (no link)

**Angle:** a practical question and answer about setting aside tax as a new sole trader in care work.

### Title
New sole traders in disability support: how much are you setting aside for tax from each payment?

### Body
A lot of support workers are going independent on an ABN and getting paid in full with no tax taken out. The bill turns up at tax time, or as PAYG instalments later on.

A common habit is moving a set percentage of every payment into a separate account straight away, and leaving it there. Plenty of sole traders use somewhere between 20 and 30 percent, plus all the GST if they're registered, but obviously it depends on income, deductions and whether you have another job.

For those who've done a year or two of this: what percentage did you settle on, and did it cover the bill? Did your accountant suggest anything you wish you'd known in year one?

### Images
None.

---

## Post 5: r/SideProject (later, once the account has comment karma)

**Angle:** the honest numbers after launch. Fill in the real figures from the admin report before posting.

### Title
Built an invoicing tool for disability support workers as a uni student, [X] weeks in and here's what happened

### Body
A few weeks ago I launched a small tool for independent NDIS support workers in Australia. They invoice plan managers every week or fortnight, and the dedicated apps mostly cost around $10 to $15 a month.

Mine has a free invoice template that makes the PDF in the browser with no sign-up, and a shift log for A$7 a month that turns logged shifts into invoice lines. I built it with Claude, I'm not really a developer, and it runs on Cloudflare's free tier so it costs me nothing until people pay.

Honest numbers so far: [visits] visits, [N] invoices made with the template, [N] sign-ups and [N] paying. [One sentence on what didn't work.]

[SIDEPROJECT link from LINKS.md]

Keen for feedback, especially on the landing page and whether the free and paid split makes sense.

### Images
1. Screenshot of the landing page on a phone.
2. Screenshot of the shift log with a few example shifts ticked.

---

## Notes on tone
- Keep the loose, spoken phrasing. Don't tidy it into marketing copy.
- No bullet points, bold, headers or emoji in the post bodies.
- Keep the humbling numbers in post 1 and post 5. They are why it works.
- Never knock a competitor by name.
- Never use real participant details in screenshots.

## Prepared replies

**"How is this different from [Simplo / NoteReady / Sparks Scribe / ShiftCare]?"**
Those do more than mine, especially shift notes and progress notes, so if you need those they're a better fit. Mine is mostly about getting the invoice right and getting paid, it's cheaper, and the template is free without an account.

**"Is this AI generated?"**
Yeah, I built it with Claude. I'm a uni student, not a developer. I checked the invoice fields against the NDIS guide to getting paid and the ATO tax invoice rules, but if you spot something wrong, please tell me.

**"Is my participant's data safe?"**
The free template never sends anything to a server, it all stays in your browser. If you make an account, NDIS numbers and bank details are encrypted before they're stored, and there's no health info collected at all.

**"Why would I pay when Word is free?"**
Honestly you don't have to, the template's free. The paid bit is for people who want to log shifts as they go and not rebuild the invoice every fortnight.

**"You're missing [feature]."**
Thanks, that's useful. I'll add it to the list, and I'll reply here when it's in.

**Bug report**
Thanks for letting me know. What phone and browser were you on? I'll look at it today.

**Criticism of the idea**
Fair point, thanks. I'm going to see whether people actually use it over the next couple of months, and if not I'll stop.

## After posting
Record per post: date, subreddit, removed or not, upvotes, comments, and the sign-ups and payments for that subreddit's UTM source from the admin report. Use it to decide the next angle and order.
