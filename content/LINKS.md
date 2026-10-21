# Links to use when posting

Every link you post carries UTM parameters. The site keeps the first source a visitor arrived from, and attaches it to any template download, sign-up, paid subscription and pack purchase. The admin report at `/admin/` then shows results per source.

Replace `SITE` with the live address once deployed (for example `https://shiftbill.yourname.workers.dev`). Keep the parameters exactly as written: lowercase, no spaces.

| Where | Link |
| --- | --- |
| TikTok bio | `SITE/ndis-invoice-template/?utm_source=tiktok&utm_medium=social&utm_campaign=bio` |
| TikTok, a specific video (if you pin a comment link) | `SITE/ndis-invoice-template/?utm_source=tiktok&utm_medium=social&utm_campaign=video&utm_content=v01` (change `v01` to the script number) |
| Reddit post 1, r/NDIS_Providers | `SITE/ndis-invoice-template/?utm_source=reddit&utm_medium=social&utm_campaign=ndis_providers` |
| Reddit post 5, r/SideProject | `SITE/?utm_source=reddit&utm_medium=social&utm_campaign=sideproject` |
| Reddit reply when someone asks (only where allowed) | `SITE/ndis-invoice-template/?utm_source=reddit&utm_medium=comment&utm_campaign=reply` |
| Facebook groups (only where the group allows) | `SITE/ndis-invoice-template/?utm_source=facebook&utm_medium=social&utm_campaign=group` |
| Template pack, any channel | `SITE/templates/?utm_source=CHANNEL&utm_medium=social&utm_campaign=pack` |
| Email signature | `SITE/?utm_source=email&utm_medium=signature&utm_campaign=sig` |

Search traffic needs no tags: it shows up as `ref:google.com` and similar in the admin report.

How to read the admin report:
1. Open `SITE/admin/` and paste the `ADMIN_TOKEN` you set in Cloudflare (see `LAUNCH_CHECKLIST.md`).
2. Columns: template PDFs made, sign-ups, checkouts started, paying now, packs sold, by source.
3. Visits per page are in the Cloudflare dashboard under Web Analytics.
