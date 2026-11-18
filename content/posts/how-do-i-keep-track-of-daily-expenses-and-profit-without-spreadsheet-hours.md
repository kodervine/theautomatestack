---
title: "How do I keep track of daily business expenses and profit without spending hours on spreadsheets?"
slug: how-do-i-keep-track-of-daily-expenses-and-profit-without-spreadsheet-hours
question: "How do I keep track of daily business expenses and profit without spending hours on spreadsheets?"
summary: "Stop typing the numbers yourself. Send receipts and bank alerts to one place, let a simple setup read each one and add a row to a Google Sheet, and let one formula work out profit. You check the sheet once a week instead of building it every night. The setup does the typing, you do the checking."
date: 2026-11-18
updated: 2026-11-18
tags:
  - automation
  - ai tools
status: ready
image: /blog/images/how-do-i-keep-track-of-daily-expenses-and-profit-without-spreadsheet-hours/receipt-to-row.png
source_post: ""
medium_url: ""
publish_location: both
faqs:
  - question: "Do I need to know how to code?"
    answer: "No. Tools like Zapier, Make and n8n connect Gmail and Google Sheets with clicks, not code."
  - question: "Can AI get the numbers wrong?"
    answer: "Yes. That is why you check the sheet once a week. A setup that reads receipts still needs a human to glance at it."
---

Ten at night. You should be resting. Instead you are scrolling through bank alerts, a receipt photo and three chats, trying to remember what you spent today.

Why are you still doing this by hand? Okay oo, I know why.

The numbers come from everywhere. Bank alerts by email. Receipts on WhatsApp. A supplier's invoice as a photo. Nothing lines up, so you type it all in, one line at a time, and your evening goes.

![Three steps: a receipt or bank alert arrives, AI reads the amount and label, a row is added to your sheet.](/blog/images/how-do-i-keep-track-of-daily-expenses-and-profit-without-spreadsheet-hours/receipt-to-row.png)

## The idea: one door, one sheet

Pick one place where everything lands. A Gmail label works. A Google Drive folder works.

Then connect that place to one Google Sheet. Every time something new arrives, a small setup reads it, pulls out the amount, the date and what it was for, and adds a row.

Profit is then one formula at the top of the sheet. Money in, minus money out.

## A made-up day

Say you sell fabric. A customer pays ₦45,000 and the bank alert hits your email. You pay a rider ₦3,500 and the receipt arrives as a photo.

Both land in the same place. By the time you open the sheet, there are two new rows. One in, one out. The profit cell has already moved.

(These numbers are only to show the idea. Use your own.)

## What can go wrong

The setup will sometimes misread an amount, or file a delivery under the wrong label. That is normal. It is why you open the sheet once a week and scan it, instead of building it from nothing every night.

Test it on a week of old receipts first. If it gets those right, you can trust it with new ones. I wrote about [how to test an automation before you trust it](/blog/how-do-i-test-an-automation-before-i-trust-it/).

## The steps

1. **Pick one door.** A Gmail label or a Drive folder where receipts and alerts go.
2. **Make one sheet.** Columns: date, amount, in or out, label.
3. **Connect the two.** Use Zapier, Make or n8n to add a row for each new item.
4. **Let AI read the messy ones.** Photos and odd email formats need a reader.
5. **Add one profit formula.** Money in minus money out.
6. **Check it weekly.** Fix what it got wrong, and note why.

The Starter Kit has an Admin and money setup that does exactly this from your bank alerts. If you want it built around your own tools, [that is what a consultation is for](/services/).

Abeg, the sheet should work for you. Not the other way round.
