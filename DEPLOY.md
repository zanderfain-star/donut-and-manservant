# Deploying Donut &amp; Manservant to donut.4bros.cc

Two halves to deployment:
1. **DNS** — point `donut.4bros.cc` at GitHub Pages
2. **Hosting** — push the built bundle to a GitHub Pages-enabled repo

---

## Part 1 — DNS (Cloudflare, zone `4bros.cc`)

GitHub Pages requires a custom domain pointed at one of these:

| Method | Record type | Target | Notes |
|--------|-------------|--------|-------|
| **A records** (recommended) | 4× A | `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` | Direct, fast |
| **CNAME** (alternate) | 1× CNAME | `<username>.github.io` | Only works as apex → apex redirects in Cloudflare |

For a subdomain like `donut.4bros.cc` you can use **either**. A records are simpler.

### How to add (Cloudflare dashboard)

1. Log into https://dash.cloudflare.com → zone `4bros.cc`
2. **DNS → Records → Add record**
3. **Type:** `A`
4. **Name:** `donut`
5. **IPv4 address:** `185.199.108.153`
6. **Proxy status:** **DNS only** (grey cloud — important, GitHub Pages needs to see your HTTPS cert work)
7. **TTL:** Auto
8. Save. Repeat for the other three GitHub IPs (`.109`, `.110`, `.111`).

### How to add (Cloudflare API)

If you'd rather script it (matches your terraform pattern), the existing
`~/lab-build-repo/terraform/cloudflare-dns/` only manages `lab.4bros.cc` subdomains.
You could either:

a) **Extend the terraform** — add a new `non_lab_hosts` variable + a separate
   `cloudflare_dns_record.github_pages` resource. (Cleanest for gitops.)

b) **One-off API call** — use the Cloudflare API directly:

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"type":"A","name":"donut","content":"185.199.108.153","ttl":1,"proxied":false}'
```

   Repeat for the other 3 IPs. The `cfut_…` token from your
   `~/lab-build-repo/terraform/cloudflare-dns/terraform.tfvars` has Zone DNS Edit
   on `4bros.cc` so it should already work.

> ⚠️ **Proxy must be OFF (grey cloud)**. GitHub Pages does its own TLS at the
> edge; if Cloudflare proxies the record, you'll get cert mismatch / loop errors.

---

## Part 2 — GitHub repo + Pages

You need a public repo. Pick a name — common conventions:

- `donut-and-manservant` (matches the local folder)
- `donut.4bros.cc` (matches the domain — clearer in the Pages UI)

### Create the repo

From your dev machine (anywhere with `gh` or browser access):

```bash
# Option A — browser: https://github.com/new
#   - Owner: hsmith
#   - Name: donut-and-manservant
#   - Public
#   - Don't init with README (we have one)

# Option B — gh CLI
gh repo create hsmith/donut-and-manservant --public --source=. --remote=origin --push
```

### Push from this machine

The local git repo is already initialized and committed. Once the remote exists:

```bash
cd ~/Projects/donut-and-manservant
git remote add origin git@github.com:hsmith/donut-and-manservant.git
git branch -M main
git push -u origin main
```

### Enable GitHub Pages

1. Repo → **Settings** → **Pages**
2. **Source:** Deploy from a branch
3. **Branch:** `gh-pages` / `/ (root)`
4. **Custom domain:** `donut.4bros.cc` → Save
5. GitHub will provision a Let's Encrypt cert. May take a few minutes.

### Deploy from this machine

```bash
cd ~/Projects/donut-and-manservant
npm run deploy
```

This builds `dist/` and pushes to `gh-pages` via the `gh-pages` package.

---

## Part 3 — Verify

After ~5 minutes:

```bash
dig donut.4bros.cc +short     # should return 185.199.108.153 (etc.)
curl -I https://donut.4bros.cc # should return 200 with GitHub Pages header
```

If the cert doesn't come up, GitHub Pages status page is the canonical truth:
https://www.githubstatus.com/

---

## Local development view (right now)

You can already view the game in browser at:

- **http://localhost:5173/** (if you have my dev server running)
- **http://10.0.0.122:5173/** (if you ssh-tunnel / expose via the host)

Once we deploy, it'll be at **https://donut.4bros.cc**.