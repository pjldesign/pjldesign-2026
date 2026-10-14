# Cutover runbook: pjl.design to the new site, then retire MODX

The only step here that can't be undone is deleting or cancelling MODX (Phase 3).
Everything before it is reversible. Don't start Phase 3 until Phase 2 is done.

## Facts (looked up 2026-10-13)

| | |
|---|---|
| DNS is hosted at | GoDaddy (`ns37/ns38.domaincontrol.com`). **Stay there.** |
| Email is hosted at | GoDaddy mail (`smtp.secureserver.net`, `mailstore1.secureserver.net`) |
| Email protection | SPF + DMARC set to **reject**: a wrong mail record bounces your mail |
| Old website | bare `pjl.design`: A records `104.19.232.38` and `104.19.233.38` (TTL 10 min); `www` is a CNAME to `pjl.design` (TTL 1 hr) |
| New site | `https://pjldesign-2026.pages.dev` (Cloudflare Pages, auto-deploys from GitHub) |
| Main address | `https://www.pjl.design` (already set as the canonical address in the site) |

**Never** move the domain's nameservers to Cloudflare and **never** edit the MX or TXT rows.
Only the `www` CNAME and the bare-domain forwarding change.

## Your GoDaddy DNS records (as of 2026-10-13, after the `www` switch)

| Row | Value | Verdict |
|---|---|---|
| CNAME `www` | `pjldesign-2026.pages.dev` | **Done.** This is the new site. |
| A `@` (two rows) | `104.19.232.38`, `104.19.233.38` | The old MODX edge. Keep for now. **Replace via Phase 1b before cancelling MODX.** (GoDaddy's own forward swaps these for `15.197.142.173` / `3.33.152.147`, which have no HTTPS. Don't use it.) |
| NS `@` (two rows) | `ns37/ns38.domaincontrol.com` | **Keep.** GoDaddy's own nameservers. |
| MX, TXT (SPF, DMARC) | `secureserver.net` mail records | **Keep.** This is your email. |
| CNAME `email` | `email.secureserver.net` | **Keep.** The GoDaddy webmail shortcut. |
| CNAME `secureserver1._domainkey`, `secureserver2._domainkey` | `…dkim…onsecureserver.net` | **Keep.** Email signing keys; DMARC is set to reject without them. |
| CNAME `_3bb19d…` | `…acm-validations.aws` | **Keep.** An AWS certificate validation record; deleting it could break a certificate's auto-renewal. Leave it unless you know exactly what it belongs to. |
| MX (two rows), TXT `@` (SPF and `D3314872`), TXT `_dmarc`, SRV `_autodiscover._tcp` | GoDaddy mail (`secureserver.net`) | **Keep all.** Your email: delivery, sender authentication and phone/Outlook setup. Confirmed present 2026-10-13. |
| CNAME `_domainconnect`, SOA | GoDaddy's own | **Keep.** GoDaddy manages these. |
| CNAME `_acme-challenge` (`…dcv.cloudflare.com`), TXT `_cf-custom-hostname` (a long ID) | Cloudflare hostname-verification records | Look like leftovers from MODX Cloud's Cloudflare setup. **Leave them.** They're harmless and not worth the risk of a wrong delete. Optional tidy-up only after MODX is gone. |
| CNAME `blog` | `pjl.design` | Dead (shows a MODX error page). Safe to delete during final cleanup. |

**Important:** the bare `pjl.design` currently works only because the old MODX server redirects it to
`www`. Once MODX is cancelled that stops. GoDaddy's forwarding can't replace it (it has no HTTPS), so
**complete Phase 1b before cancelling MODX.**

## Phase 0: Pre-flight (about 10 minutes, nothing changes yet)

- [ ] Open `https://pjldesign-2026.pages.dev` on your phone and tablet. Click around.
- [ ] Send a test message through the contact form on that site. Confirm it reaches your inbox.
- [ ] **Back up the MODX database export.** `private/modx-export.sql` exists only on this Mac and is
      deliberately not in GitHub. Copy it somewhere safe (iCloud Drive, an external drive).
- [ ] **Confirm your image bucket is yours.** In the AWS console, check that `pjl-site-media` is in
      your own AWS account (not created by or tied to the MODX Cloud account). All case-study images
      load from it. It must keep existing and stay publicly readable.

## Phase 1: Cutover (about 15 minutes)

1. **Cloudflare:** Workers & Pages > `pjldesign-2026` > **Custom domains** > **Set up a custom domain**.
   Enter `www.pjl.design`. Cloudflare shows the CNAME target (`pjldesign-2026.pages.dev`).
2. **GoDaddy DNS** (My Products > `pjl.design` > DNS): edit the **CNAME** named `www`.
   Value: `pjldesign-2026.pages.dev`. TTL: 10 minutes. Do not touch any MX or TXT row.
3. ~~GoDaddy forwarding for the bare domain~~ **Tried 2026-10-13; it does not work.** GoDaddy's
   forwarder only answers plain `http://`. It never accepted secure `https://` connections (tested
   for 5+ minutes on both of its servers), so `https://pjl.design` failed to connect. Remove the
   forward and put the old A records back (see Rollback below) until **Phase 1b** is done.
4. Wait for the Cloudflare custom domain to show **Active** (usually a few minutes).

**Verify** (ask Claude to run these, or check in a browser):
- [ ] `https://www.pjl.design` shows the new site (padlock present).
- [ ] `https://pjl.design` redirects to `https://www.pjl.design`. Try both `http://` and `https://`.
- [ ] An old link such as `https://www.pjl.design/healthline.html` lands on `/healthline`.
- [ ] Send yourself an email **to** `paul@pjl.design` and reply **from** it. Email must still work.
- [ ] Submit the contact form from the real domain.

**Rollback (if anything looks wrong):** set the `www` CNAME value back to `pjl.design`, remove the
forwarding, and re-add two A records for the bare `pjl.design`: `104.19.232.38` and `104.19.233.38`.
MODX is still running at this point, so the old site comes straight back.

## Phase 1b: Make the bare `pjl.design` work without MODX (before cancelling it)

The problem: GoDaddy DNS can't point a bare domain at Cloudflare Pages, and GoDaddy's forwarding has
no HTTPS. The clean fix is to let **Cloudflare host the domain's DNS** (free), which also gives the
bare domain a proper certificate and redirect. Email stays at GoDaddy. This is the one step that
touches email-adjacent records, so do it calmly, not in a rush:

1. In Cloudflare, add `pjl.design` as a site (free plan). Let it scan the existing records.
2. **Before changing anything at GoDaddy**, compare Cloudflare's imported list with the inventory
   above, row by row. Every MX, TXT (SPF, DMARC, `D3314872`), SRV and `_domainkey` / `email` CNAME
   must be present and set to **DNS only** (grey cloud), never proxied. Ask Claude to verify with `dig`.
3. Add the bare-domain redirect to `https://www.pjl.design` (a Cloudflare Redirect Rule) and make sure
   `www` still points to `pjldesign-2026.pages.dev`.
4. At GoDaddy, change the domain's **nameservers** to the two Cloudflare gives you.
5. Verify: the new site, `http://` and `https://` on both `pjl.design` and `www.pjl.design`, and send
   email both ways. To undo, switch the nameservers back to GoDaddy's (`ns37` / `ns38.domaincontrol.com`).

## Phase 2: Watch (48 hours)

- [ ] Leave MODX Cloud running and paid. It's the safety net.
- [ ] Next day, on your phone using mobile data (not home Wi-Fi), open the site and a few case studies.
- [ ] Confirm email still sends and receives.
- [ ] Optional: add `www.pjl.design` to Google Search Console to watch for crawl problems.

## Phase 3: Retire MODX (only after Phase 2 looks good)

1. **Final backup.** In the MODX Cloud dashboard, take or download a full snapshot/backup (files and
   database) and store it with the SQL export. After this, the old site is gone for good.
2. **Check what you are paying for.** Open both the MODX Cloud billing page and your GoDaddy
   account. Cancel the **MODX Cloud** subscription (look for cancel or delete cloud, and do it
   before your next billing date). If GoDaddy also bills you for a *hosting* or *website builder*
   plan, cancel that too.
3. **Do NOT cancel** (these are still needed):
   - the `pjl.design` **domain registration** (keep auto-renew on)
   - the GoDaddy **email** plan
   - the **S3 bucket** `pjl-site-media` (every image is served from it)
   - the Cloudflare Pages project and the GitHub repo
4. After cancelling, confirm the live site, images, and email all still work.

## Reminders

- GitHub token expires **2027-01-11**: make a new one before then or pushes will stop working.
- Domain renews yearly at GoDaddy.
- Formspree's free plan allows 50 contact messages a month.
