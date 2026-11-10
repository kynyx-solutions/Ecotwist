"""Build the Ecotwist corporate gifting catalogue from the site content files.

    python3 scripts/build-catalog.py . /tmp/catalog   # writes catalog.html + img/
    then print catalog.html to PDF (Chrome: --headless=new --print-to-pdf) into
    public/catalogue/Ecotwist-Gifting-Catalogue-2027.pdf
"""
import json, os, re, subprocess, sys, html, hashlib
REPO, OUT = sys.argv[1], sys.argv[2]
PUB, PAGES = f'{REPO}/public', f'{REPO}/src/content/pages'
IMG = os.path.join(OUT, 'img'); os.makedirs(IMG, exist_ok=True)
e = html.escape

def img(path):
    """Web-sized JPEG copy so the PDF stays small."""
    if not path: return ''
    src = PUB + path
    if not os.path.exists(src): return ''
    name = hashlib.md5(path.encode()).hexdigest()[:10] + '.jpg'
    dst = os.path.join(IMG, name)
    if not os.path.exists(dst):
        subprocess.run(['sips', '-s', 'format', 'jpeg', '-s', 'formatOptions', '72', '-Z', '760', src, '--out', dst], capture_output=True)
    return 'img/' + name

def load(n): return json.load(open(f'{PAGES}/{n}.json'))
def price_of(it):
    for k in ('price', 'sub', 'subtitle'):
        m = re.search(r'(From|Starting at) ₹[\d,]+', it.get(k, '') or '')
        if m: return m.group(0).replace('Starting at', 'From')
    return 'Price on request'

def card(title, meta, contents, price, image, tag=''):
    t = f'<span class="tag">{e(tag)}</span>' if tag else ''
    return f'''<div class="card"><div class="ph"><img src="{img(image)}">{t}</div>
      <div class="cb"><p class="meta">{e(meta)}</p><h4>{e(title)}</h4><p class="ct">{e(contents)}</p>
      <p class="pr">{e(price)}</p></div></div>'''

# ── Occasions, in calendar / business order ──
occ = []
ny = load('new-year-home')
occ.append(dict(name='New Year & Year-End', when='December – January · order by 12 December',
    intro=ny['hero']['intro'], cards=[card(k['title'], k['audience'], k['contents'], k['price'] or 'Price on request', k['image'], k['tag']) for k in ny['kits']['items']]))

for slug in ['womens-day', 'earth-day-gifting', 'christmas-gifting', 'channel-partner-gifting']:
    d = load(slug)
    occ.append(dict(name=d['_meta']['label'], when=d['hero']['when'], intro=d['hero']['intro'],
        cards=[card(k['title'], k['audience'], k['contents'], k['price'], k['image'], k['tag']) for k in d['kits']['items']]))

LEGACY = [('client-appreciation', 'Client Appreciation', 'Year-round · festive season and contract renewals'),
          ('employee-onboarding', 'Employee Onboarding', 'Year-round · peaks July–September'),
          ('festive-gifting', 'Festive Gifting', 'Diwali, Holi, Eid, Christmas and more'),
          ('events-conferences', 'Events & Conferences', 'Delegate, speaker and team kits'),
          ('employee-wellness', 'Employee Wellness', 'Wellness weeks and mental-health days'),
          ('birthday-gifting', 'Birthday Gifting', 'Every month, for every employee'),
          ('work-anniversary', 'Work Anniversary', '1, 3, 5 and 10+ year milestones'),
          ('award-recognition', 'Award & Recognition', 'Quarterly and annual awards'),
          ('product-launch', 'Product Launch', 'VIP, media and partner kits'),
          ('retirement-gifting', 'Retirement Gifting', 'Farewells and long-service honours')]
for slug, name, when in LEGACY:
    d = load(slug); sec = 'featured' if 'featured' in d else 'products'
    intro = (d.get('hero', {}).get('intro') or d.get('hero', {}).get('subtitle') or '')
    cards = []
    for it in d[sec]['items']:
        sub = it.get('subtitle') or ''
        contents = re.sub(r'^(From|Starting at) ₹[\d,]+\s*·?\s*', '', sub) if sub else ''
        if not contents or contents.startswith(('From', 'Starting')): contents = it.get('tag', '')
        cards.append(card(it['name'], it.get('tag', '') or name, contents, price_of(it), it.get('image') or it.get('img'), ''))
    occ.append(dict(name=name, when=when, intro=intro, cards=cards))

# ── Signature range: the 12 sets in four tiers ──
TIERS = [
 ('Under ₹500', 'Events, CSR drives and large teams', [
   ('Seed & Sketch Pouch', '2 seed pencils, recycled paper pen, recycled writing pad, kraft sleeve', 'From ₹199', '/kits/seed-pencils.webp'),
   ('Cork Keepsake Duo', 'Cork keyring and cork pen in a kraft box, logo on both', 'From ₹249', '/kits/cork-pens.webp'),
   ('Little Light Box', 'Soya wax candle, 2 seed pencils and a message card', 'From ₹299', '/kits/candles-4.webp')]),
 ('₹500 – 1,000', 'The everyday employee gift', [
   ('Desk Essentials Kit', 'Cork diary, cork pen and 2 seed pencils in a kraft box', 'From ₹599', '/kits/cork-diary-pen-flatlay.webp'),
   ('Cork 4-in-1 Set', 'Cork diary, cork pen, cork keyring and a seed pencil', 'From ₹649', '/kits/cork-diary-pen.webp'),
   ('Calm Candle Box', 'Set of 3 soya wax candles, recycled notepad and a card', 'From ₹699', '/kits/candles-3.webp'),
   ('Classic 2-Jar Box', 'Two jars of premium dry fruits in a keepsake box', 'From ₹699', '/kits/jar-box-2-navy.webp')]),
 ('₹1,000 – 2,000', 'Our most-ordered range', [
   ('Bamboo Workday Kit', 'Bamboo bottle with tea infuser, recycled planner, 2 paper pens, seed pencils', 'From ₹999', '/kits/bamboo-bottle-infuser.webp'),
   ('Fresh Start Onboarding Kit', 'Cork-and-denim diary, cork pen, bamboo bottle and cork keyring in a magnetic box', 'From ₹1,199', '/kits/cork-denim-diaries.webp'),
   ('Festive Light Hamper', 'Soya wax diyas, candle set and a 3-jar dry fruit box in a velvet case', 'From ₹1,299', '/kits/jar-box-3-velvet.webp')]),
 ('₹2,000 and above', 'Leadership and key clients', [
   ('Executive Cork Collection', '4-jar dry fruit box, cork-and-denim diary, cork pen, bamboo bottle, soya candle', 'From ₹2,199', '/kits/jar-box-4-navy.webp'),
   ('Grand Client Hamper', '6-jar dry fruit box, candle set, diyas, cork diary and pen in a pinewood basket', 'From ₹3,499', '/kits/pinewood-basket.webp')]),
]

def chunks(lst, n): return [lst[i:i + n] for i in range(0, len(lst), n)]

def grid(n):
    """Columns/rows that fill the page with no gaps: 9 -> 3x3, 10 -> 5x2, 8 -> 4x2, 6 -> 3x2."""
    if n <= 3: return n, 1
    best = min((c for c in (3, 4, 5) if -(-n // c) <= 3),
               key=lambda c: (-(-n // c) * c - n, abs(c - 4)))
    return best, -(-n // best)

def cards_html(cards):
    c, r = grid(len(cards))
    return f'<div class="fill" style="grid-template-columns:repeat({c},1fr);grid-template-rows:repeat({r},1fr)">{"".join(cards)}</div>'
pages = []
LOGO = img('/site/navigation/logo.png')

pages.append(f'''<section class="page cover"><div class="cv-img"><img src="{img('/new-year-home/hero-thank-you-box.webp')}"></div>
 <div class="cv-txt"><img class="logo" src="{LOGO}"><p class="eye">Corporate Gifting Catalogue · 2027</p>
 <h1>Sustainable gifts<br><em>for every occasion.</em></h1>
 <p class="lead">Plastic-free kits and hampers for employees, clients and partners: cork, bamboo, recycled paper, soya wax and premium dry fruits, branded with your logo and delivered across India and beyond.</p>
 <p class="url">ecotwist.in</p></div></section>''')

pages.append(f'''<section class="page about"><div class="col">
 <p class="eye">Why Ecotwist</p><h2>Gifting that carries<br><em>your brand and your values.</em></h2>
 <p>Ecotwist designs, brands and delivers sustainable corporate gifts from our studio in Patna. Every kit is built from natural and recycled materials and packed without single-use plastic.</p>
 <div class="stats"><div><b>100+</b><span>Corporate clients</span></div><div><b>5+</b><span>Countries served</span></div><div><b>0%</b><span>Plastic used</span></div><div><b>B-Corp</b><span>Certified</span></div></div>
 </div><div class="col grid2">
 <div class="pill"><h4>Sustainable by design</h4><p>Cork, bamboo, recycled paper, soya wax and reusable boxes.</p></div>
 <div class="pill"><h4>Branded your way</h4><p>Your logo on products, sleeves, cards and packaging.</p></div>
 <div class="pill"><h4>Any item, sourced</h4><p>Need something not in this catalogue? We source it to your brief.</p></div>
 <div class="pill"><h4>Delivered everywhere</h4><p>Pan-India and international delivery, to one office or many.</p></div>
 <div class="pill"><h4>Bulk-ready</h4><p>From 25 to 5,000+ kits, mixed tiers in one order.</p></div>
 <div class="pill"><h4>Carbon-neutral delivery</h4><p>Tracked shipping with GST invoicing on every order.</p></div>
 </div></section>''')

# Signature range: 2 tiers per page
for pair in chunks(TIERS, 2):
    body = ''
    for name, sub, items in pair:
        body += f'<div class="tier"><div class="tier-h"><h3>{e(name)}</h3><p>{e(sub)}</p></div>' + \
            cards_html([card(t, name, c, p, i) for t, c, p, i in items]) + '</div>'
    pages.append(f'<section class="page"><header class="ph-h"><p class="eye">Signature range</p><h2>Ready-made kits by budget</h2></header>{body}</section>')

pages.append('''<section class="page divider"><p class="eye">Part two</p><h2>Gifts by occasion</h2>
 <p class="lead">Kits curated for every moment in the corporate calendar. Mix and match across pages, or tell us your budget and we will build one for you.</p></section>''')

for o in occ:
    for i, group in enumerate(chunks(o['cards'], 15)):
        head = (f'<header class="occ-h"><div><p class="eye">{e(o["when"])}</p><h2>{e(o["name"])}</h2></div>'
                f'<p class="intro">{e(o["intro"])}</p></header>') if i == 0 else \
               f'<header class="occ-h small"><h2>{e(o["name"])} <span>continued</span></h2></header>'
        pages.append(f'<section class="page">{head}{cards_html(group)}</section>')

pages.append(f'''<section class="page about"><div class="col">
 <p class="eye">Personalisation</p><h2>Make every gift<br><em>unmistakably yours.</em></h2>
 <ul class="list"><li><b>Logo branding</b> — printing, debossing, laser engraving and foil stamping</li>
 <li><b>Name printing</b> — recipient names and milestone years on diaries, pens and sleeves</li>
 <li><b>Seed-paper cards</b> — a message from leadership that can be planted</li>
 <li><b>Custom packaging</b> — kraft, magnetic, velvet jar boxes or pinewood baskets</li>
 <li><b>Impact card</b> — the plastic avoided by your order, ready to share</li></ul></div>
 <div class="col"><p class="eye">How ordering works</p><ol class="steps">
 <li><b>Share your brief</b><span>Occasion, budget per gift, quantity and delivery locations.</span></li>
 <li><b>Proposal &amp; mockup</b><span>A curated shortlist shown with your branding.</span></li>
 <li><b>Approve</b><span>Confirm the selection and we start production.</span></li>
 <li><b>Delivered</b><span>Packed, quality-checked and delivered to every address.</span></li></ol>
 <p class="note">Prices are indicative starting prices per kit including standard logo branding. GST and delivery are extra. Final pricing depends on quantity, customisation and delivery locations.</p></div></section>''')

pages.append(f'''<section class="page contact"><img class="logo big" src="{LOGO}"><h2>Let's create your next gift.</h2>
 <div class="ci"><p><b>Email</b>info@ecotwist.in</p><p><b>Phone / WhatsApp</b>+91 70913 23777</p><p><b>Website</b>ecotwist.in/get-proposal</p>
 <p><b>Studio</b>5th Floor, Mauryalok Complex, A-Block, Patna 800001, Bihar</p></div>
 <p class="thanks">Thank you for choosing a more sustainable way to gift.</p></section>''')

CSS = '''@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400;0,600;1,400&display=swap');
@page { size: 297mm 210mm; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Inter, Helvetica, sans-serif; color: #1f2a17; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.page { width: 297mm; height: 210mm; padding: 12mm 16mm 11mm; page-break-after: always; overflow: hidden; position: relative; background: #FAF9F6; }
.page::after { content: "ECOTWIST · Corporate Gifting Catalogue 2027"; position: absolute; bottom: 5mm; right: 16mm; font-size: 7pt; letter-spacing: .2em; color: #9a9c8a; }
h1, h2, h3, h4 { font-family: "Playfair Display", Georgia, serif; font-weight: 400; color: #2a3517; }
em { color: #8a6f2e; }
.eye { font-size: 7.5pt; letter-spacing: .28em; text-transform: uppercase; color: #8a6f2e; font-weight: 600; }
.cover { display: grid; grid-template-columns: 1.05fr 1fr; padding: 0; background: #1a2412; color: #fff; }
.cover::after { content: none; }
.cv-img img { width: 100%; height: 210mm; object-fit: cover; }
.cv-txt { padding: 22mm 18mm; display: flex; flex-direction: column; justify-content: center; }
.cv-txt h1 { color: #fff; font-size: 34pt; line-height: 1.08; margin: 6mm 0; } .cv-txt em { color: #d9bf7c; }
.cv-txt .lead { color: rgba(255,255,255,.78); font-size: 10.5pt; line-height: 1.65; max-width: 110mm; }
.cv-txt .eye { color: #d9bf7c; } .cv-txt .url { margin-top: 10mm; color: #d9bf7c; letter-spacing: .2em; font-size: 9pt; }
.logo { width: 34mm; background: #fff; border-radius: 4mm; padding: 2mm; } .logo.big { width: 46mm; }
.about { display: grid; grid-template-columns: 1fr 1.1fr; gap: 14mm; align-items: center; }
.about h2 { font-size: 26pt; line-height: 1.15; margin: 4mm 0 6mm; } .about p { font-size: 10pt; line-height: 1.7; color: #4a5040; }
.stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4mm; margin-top: 9mm; }
.stats b { display: block; font-family: "Playfair Display", serif; font-size: 20pt; font-weight: 400; color: #4A5D23; } .stats span { font-size: 7.5pt; color: #6b705f; text-transform: uppercase; letter-spacing: .1em; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; }
.pill { background: #fff; border: 1px solid #e3dcc6; border-radius: 4mm; padding: 6mm; } .pill h4 { font-size: 12pt; margin-bottom: 2mm; } .pill p { font-size: 8.5pt; line-height: 1.55; }
.ph-h h2, .occ-h h2 { font-size: 20pt; margin-top: 1.5mm; }
.tier { margin-top: 4.5mm; } .tier-h { display: flex; align-items: baseline; gap: 5mm; margin-bottom: 3mm; border-bottom: 1px solid #e3dcc6; padding-bottom: 1.5mm; }
.tier-h h3 { font-size: 14pt; color: #4A5D23; } .tier-h p { font-size: 8.5pt; color: #6b705f; }
.row { display: grid; gap: 5mm; } .r2 { grid-template-columns: repeat(4, 1fr); } .r3 { grid-template-columns: repeat(4, 1fr); } .r4 { grid-template-columns: repeat(4, 1fr); }
.row.two { grid-template-columns: repeat(4, 1fr); gap: 4mm 4.5mm; margin-top: 4.5mm; } .row.two .ph img { aspect-ratio: 16 / 8.2; } .row.two.five { grid-template-columns: repeat(5, 1fr); gap: 4mm 3.5mm; } .row.five .ph img { aspect-ratio: 16 / 10; } .row.five .cb h4 { font-size: 10pt; } .row.two .ct { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.card { background: #fff; border-radius: 3.5mm; overflow: hidden; border: 1px solid #ece6d3; display: flex; flex-direction: column; }


.ph { position: relative; background: #f1ede2; } .ph img { width: 100%; aspect-ratio: 16 / 9.6; object-fit: cover; display: block; }
.tag { position: absolute; left: 2.5mm; top: 2.5mm; background: #4A5D23; color: #fff; font-size: 6pt; letter-spacing: .15em; text-transform: uppercase; padding: 1mm 2mm; border-radius: 3mm; }
.cb { padding: 3mm 3.5mm 3.2mm; display: flex; flex-direction: column; flex: 1; }
.meta { font-size: 6.5pt; letter-spacing: .14em; text-transform: uppercase; color: #8a6f2e; } .cb h4 { font-size: 11pt; margin: .8mm 0 1mm; }
.ct { font-size: 7.6pt; line-height: 1.45; color: #5b6050; flex: 1; } .pr { margin-top: 1.8mm; font-family: "Playfair Display", serif; font-size: 10.5pt; color: #2a3517; }
.occ-h { display: grid; grid-template-columns: 1fr 1.25fr; gap: 10mm; align-items: end; border-bottom: 1px solid #e3dcc6; padding-bottom: 3mm; }
.occ-h .intro { font-size: 8.5pt; line-height: 1.55; color: #5b6050; } .occ-h.small { display: block; } .occ-h span { font-size: 11pt; color: #9a9c8a; font-style: italic; }
.divider { background: #2a3517; color: #fff; display: flex; flex-direction: column; justify-content: center; padding: 0 30mm; }
.divider h2 { color: #fff; font-size: 40pt; margin: 4mm 0 6mm; } .divider .lead { color: rgba(255,255,255,.75); max-width: 160mm; font-size: 11pt; line-height: 1.7; } .divider .eye { color: #d9bf7c; } .divider::after { color: rgba(255,255,255,.4); }
.list { list-style: none; margin-top: 2mm; } .list li { font-size: 9.5pt; line-height: 1.5; padding: 2.4mm 0; border-bottom: 1px solid #e8e2cf; color: #4a5040; } .list b { color: #2a3517; }
.steps { list-style: none; counter-reset: s; margin: 4mm 0 6mm; } .steps li { counter-increment: s; position: relative; padding: 2.5mm 0 2.5mm 12mm; }
.steps li::before { content: counter(s); position: absolute; left: 0; top: 2.2mm; width: 8mm; height: 8mm; border-radius: 50%; background: #2a3517; color: #d9bf7c; font-family: "Playfair Display"; text-align: center; line-height: 8mm; font-size: 10pt; }
.steps b { display: block; font-size: 10.5pt; color: #2a3517; } .steps span { font-size: 8.5pt; color: #5b6050; }
.note { font-size: 7.8pt; line-height: 1.55; color: #6b705f; background: #f2eee2; padding: 4mm; border-radius: 3mm; }
.contact { background: #1a2412; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
.contact h2 { color: #fff; font-size: 30pt; margin: 8mm 0 9mm; } .contact::after { color: rgba(255,255,255,.4); }
.ci { display: grid; grid-template-columns: repeat(2, 1fr); gap: 5mm 18mm; text-align: left; } .ci p { font-size: 10.5pt; color: rgba(255,255,255,.85); } .ci b { display: block; font-size: 7pt; letter-spacing: .25em; text-transform: uppercase; color: #d9bf7c; margin-bottom: 1mm; }
.thanks { margin-top: 12mm; color: #d9bf7c; font-family: "Playfair Display"; font-style: italic; font-size: 12pt; }
.page:not(.cover):not(.about):not(.divider):not(.contact) { display: flex; flex-direction: column; padding-bottom: 13mm; }
.fill { display: grid; gap: 4mm; flex: 1; min-height: 0; margin-top: 4mm; }
.fill .card { min-height: 0; }
.fill .ph { flex: 1; min-height: 0; } .fill .ph img { width: 100%; height: 100%; aspect-ratio: auto; object-fit: cover; }
.fill .cb { flex: none; } .fill .ct { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.tier { flex: 1; display: flex; flex-direction: column; min-height: 0; margin-top: 4mm; } .tier .fill { margin-top: 0; }
.occ-h, .ph-h, .tier-h { flex: none; }
'''

open(os.path.join(OUT, 'catalog.html'), 'w').write(f'<!doctype html><html><head><meta charset="utf-8"><title>Ecotwist Corporate Gifting Catalogue 2027</title><style>{CSS}</style></head><body>{"".join(pages)}</body></html>')
print(len(pages), 'pages')
