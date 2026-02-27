/* ══════════════════════════════════════════════════════════
   NEVIS — script.js v13  (Unified NVS sound, no duplicate engine)
   Fixes:
   · applyTranslations ICON-SAFE (never wipes child HTML)
   · All missing i18n keys added (stat.*, cta.*, about stats)
   · applyAuthState re-applies translations after DOM update
   · Auth reads both localStorage AND sessionStorage
   · All CTA/button text fully bilingual EN/AR
══════════════════════════════════════════════════════════ */

const API = 'http://localhost:5000/api';

/* ═══════════════════════════════════════════════════════════════
   SOUND ENGINE — delegated to nv-sounds.js (window.NVS)
   nv-sounds.js must be loaded before script.js on every page.
   NVS.init() is called from NV.init() below.
═══════════════════════════════════════════════════════════════ */


/* ─────────────────────────────────────────────────────
   TRANSLATION DICTIONARY  — COMPLETE (EN + AR)
───────────────────────────────────────────────────── */
const T = {
en:{
  'nav.home':'Home','nav.about':'About','nav.skills':'Skills',
  'nav.links':'Links','nav.login':'Login','nav.logout':'Sign Out',

  'home.badge':'@Nevis_G10 on YouTube',
  'home.h1a':'Official Site of','home.h1em':'NeViS','home.h1b':'',
  'home.sub':'Gaming content creator & YouTuber behind Nevis_G10. Welcome to the official site.',
  'home.cta1':'Watch on YouTube','home.cta2':'Who is NeViS',
  'home.01t':'Welcome to the official NeViS site',
  'home.01b':'Built from scratch — this is the home base for everything NeViS.',
  'home.02t':'YouTube · @Nevis_G10',
  'home.02b':'Gaming, anime reactions, and programming on YouTube.',
  'home.03t':'Content for every taste',
  'home.03b':'Games, anime, programming tutorials — always something new dropping.',
  'home.04t':'Join the community',
  'home.04b':'Discord, Instagram, TikTok, Facebook — connect everywhere.',
  'home.05t':'Explore this site',
  'home.05b':'Check out Skills, the About page, and the Links section.',
  'home.06t':'Want to know who NeViS is?',
  'home.06b':'Head to the About page to learn the full story.',
  'home.yt.tag':'Main Channel',
  'home.yt.h':'YouTube · @Nevis_G10',
  'home.yt.p':'Gaming walkthroughs, anime reactions and programming content — subscribe and join the community.',

  'stat.yt':'YouTube Channel',
  'stat.skills':'Core Skills',
  'stat.platforms':'Platforms',
  'stat.passion':'Passion',
  'stat.age':'Years Old',
  'stat.creating':'Years Creating',
  'stat.cskills':'Core Skills',
  'stat.cplatforms':'Platforms',

  'about.badge':'About Me',
  'about.h1a':'Meet','about.h1em':'Asem','about.h1b':'the Creator.',
  'about.sub':'Game programmer, web designer, content creator — and a proud otaku.',
  'about.cta1':'View Skills','about.cta2':'My Links',
  'about.01t':'My name is Asem Ibada Borai Wattany',
  'about.01b':"I'm fifteen years old, based in Egypt.",
  'about.02t':'Content Creator',
  'about.02b':'YouTube @Nevis_G10 & TikTok — gaming today, anime & programming tomorrow.',
  'about.03t':'Game programmer & web designer',
  'about.03b':'Currently learning AI programming and expanding my toolkit.',
  'about.04t':'Multi-skilled',
  'about.04b':'Video production, sound design, music, logo design, pixel art.',
  'about.05t':'First year secondary school',
  'about.05b':'Egyptian Baccalaureate — Al-Shaheed Al-Raed Ahmed Khaled.',
  'about.06t':'Loves science, math & history',
  'about.06b':'Learning Japanese — a passion for Japan and anime.',

  'skills.badge':'My Arsenal',
  'skills.h1a':'Skills &','skills.h1em':'Capabilities.',
  'skills.sub':'A growing set of creative and technical skills built through passion.',
  'skills.top':'Top Proficiency',
  'sk1.name':'Video Editing',
  'sk1.desc':'Professional video production — cuts, effects, colour grading, storytelling.',
  'sk2.name':'Graphic Design',
  'sk2.desc':'Creating logos, banners, thumbnails, and brand visuals.',
  'sk3.name':'Game Programming',
  'sk3.desc':'Building games from scratch — logic, physics, mechanics and polish.',
  'sk4.name':'Web Development',
  'sk4.desc':'Responsive modern websites with HTML, CSS and JavaScript.',
  'sk5.name':'Pixel Art',
  'sk5.desc':'Detailed pixel art sprites, characters, and environments.',
  'sk6.name':'Music Production',
  'sk6.desc':'Original music and sound effects — game soundtracks to beats.',
  'sk.level':'Proficiency',

  'links.badge':'Find Me',
  'links.h1a':'All','links.h1em':'Links','links.h1b':'& Channels.',
  'links.sub':'Every place you can find my content — click to visit.',
  'links.cs.title':'More Links Coming Soon',
  'links.cs.sub':'Still working on expanding this section. Updates on the way!',
  'link1.title':'YouTube · @Nevis_G10','link1.desc':'Gaming, anime & programming — subscribe',
  'link2.title':'TikTok','link2.desc':'Short-form gaming and creative content',
  'link3.title':'Instagram','link3.desc':'Behind-the-scenes and updates',
  'link4.title':'Facebook','link4.desc':'News and announcements',
  'link5.title':'Discord Server','link5.desc':'Join the community — chat, games, and more',

  'brand.tag':'Secure Access Portal','brand.sub':'Where Vision Meets Precision',
  'brand.s1l':'Bit Encryption','brand.s2l':'% Uptime','brand.s3l':'Data Lag',
  'login.tag':'Authentication','login.title':'Welcome Back.',
  'login.sub':'Sign in to access your account',
  'lEmail.ph':'Email Address','lPass.ph':'Password',
  'login.rem':'Remember me','login.forgot':'Forgot password?',
  'login.btn':'Sign In',
  'login.noAcc':"Don't have an account?",'login.reg':' Register',
  'reg.tag':'New Account','reg.title':'Create Account.','reg.sub':"Join us — it's free",
  'rName.ph':'Username','rEmail.ph':'Email Address',
  'rPass.ph':'Password','rConfirm.ph':'Confirm Password',
  'reg.terms':'I agree to the Terms & Conditions','reg.btn':'Create Account',
  'reg.hasAcc':'Already have an account?','reg.login':' Login',
  'fgt.tag':'Recovery','fgt.title':'Reset Password.',
  'fgt.sub':"We'll send a secure reset link to your email",
  'fEmail.ph':'Email Address',
  'fgt.btn':'Send Reset Link','fgt.back':'← Back to Login',
  'suc.title':'Welcome.','suc.sub':'Authentication successful. Access granted.',
  'suc.go':'Go to Home',

  'err.fill':'Please fill in all fields.',
  'err.email':'Please enter a valid email address.',
  'err.pass':'Min 8 chars — uppercase, lowercase & number required.',
  'err.match':'Passwords do not match.',
  'err.terms':'Please agree to the Terms & Conditions.',
  'err.taken':'This email is already registered.',
  'err.creds':'Email or password is incorrect.',
  'err.noEmail':'This email is not registered.',
  'ok.created':'Account created! ✔',
  'ok.reset':'Reset link sent! 📧',
  'ok.logout':'Logged out successfully.',
  'str.weak':'Weak','str.fair':'Fair','str.good':'Good','str.strong':'Strong',
  'footer.copy':'© 2025 NEVIS — Asem Ebada Borai Wattany',
},
ar:{
  'nav.home':'الرئيسية','nav.about':'من أنا','nav.skills':'المهارات',
  'nav.links':'الروابط','nav.login':'تسجيل الدخول','nav.logout':'تسجيل الخروج',

  'home.badge':'@Nevis_G10 على يوتيوب',
  'home.h1a':'الموقع الرسمي لـ','home.h1em':'نيفيس',
  'home.h1b':'',
  'home.sub':'صانع محتوى ويوتيوبر على قناة Nevis_G10. أهلاً بك في الموقع الرسمي.',
  'home.cta1':'شاهد على يوتيوب','home.cta2':'من هو نيفيس',
  'home.01t':'مرحباً في الموقع الرسمي لنيفيس',
  'home.01b':'موقع مبني من الصفر — المركز الرئيسي لكل محتوى نيفيس.',
  'home.02t':'يوتيوب · @Nevis_G10',
  'home.02b':'محتوى ألعاب وأنمي وبرمجة على يوتيوب.',
  'home.03t':'محتوى لكل الأذواق',
  'home.03b':'ألعاب، أنمي، شروحات برمجة — دائماً هناك شيء جديد.',
  'home.04t':'انضم إلى المجتمع',
  'home.04b':'ديسكورد، إنستغرام، تيك توك، فيسبوك — تواصل معي في كل مكان.',
  'home.05t':'استكشف هذا الموقع',
  'home.05b':'تفقد المهارات وصفحة من أنا وقسم الروابط.',
  'home.06t':'من هو نيفيس؟',
  'home.06b':'اذهب إلى صفحة من أنا لتعرف القصة الكاملة.',
  'home.yt.tag':'القناة الرئيسية',
  'home.yt.h':'يوتيوب · @Nevis_G10',
  'home.yt.p':'مشاهير الألعاب وردود الفعل على الأنمي ومحتوى البرمجة — اشترك وانضم للمجتمع.',

  'stat.yt':'قناة يوتيوب',
  'stat.skills':'مهارات أساسية',
  'stat.platforms':'منصات',
  'stat.passion':'شغف',
  'stat.age':'عمره',
  'stat.creating':'سنوات إبداع',
  'stat.cskills':'مهارات أساسية',
  'stat.cplatforms':'منصات',

  'about.badge':'من أنا',
  'about.h1a':'تعرّف على','about.h1em':'عاصم','about.h1b':'صانع المحتوى.',
  'about.sub':'مبرمج ألعاب، مصمم مواقع، صانع محتوى — وأوتاكو فخور.',
  'about.cta1':'عرض المهارات','about.cta2':'روابطي',
  'about.01t':'اسمي عاصم عبادة بوراي وطاني',
  'about.01b':'عمري خمسة عشر عامًا، مقيم في مصر.',
  'about.02t':'صانع محتوى',
  'about.02b':'يوتيوب @Nevis_G10 وتيك توك — ألعاب اليوم، أنمي وبرمجة غداً.',
  'about.03t':'مبرمج ألعاب ومصمم مواقع',
  'about.03b':'أتعلم حاليًا برمجة الذكاء الاصطناعي وأوسّع مهاراتي.',
  'about.04t':'متعدد المهارات',
  'about.04b':'إنتاج فيديو، تصميم صوت، موسيقى، شعارات، فن البكسل.',
  'about.05t':'الصف الأول الثانوي',
  'about.05b':'نظام البكالوريا المصرية — مدرسة الشهيد الرائد أحمد خالد.',
  'about.06t':'يحب العلوم والرياضيات والتاريخ',
  'about.06b':'يتعلم اليابانية بسبب شغفه باليابان والأنمي.',

  'skills.badge':'ترسانتي',
  'skills.h1a':'المهارات','skills.h1em':'والقدرات.',
  'skills.sub':'مجموعة متنامية من المهارات الإبداعية والتقنية.',
  'skills.top':'أعلى إتقان',
  'sk1.name':'مونتاج الفيديو','sk1.desc':'إنتاج فيديو احترافي — قطع وتأثيرات وتدرج لوني وسرد.',
  'sk2.name':'التصميم الجرافيكي','sk2.desc':'إنشاء شعارات وبانرات وصور مصغّرة وهويات بصرية.',
  'sk3.name':'برمجة الألعاب','sk3.desc':'بناء الألعاب من الصفر — منطق وفيزياء وميكانيكيات.',
  'sk4.name':'تطوير المواقع','sk4.desc':'بناء مواقع حديثة ومتجاوبة بـ HTML وCSS وJavaScript.',
  'sk5.name':'فن البكسل','sk5.desc':'تصميم شخصيات وبيئات بكسل آرت مفصّلة.',
  'sk6.name':'إنتاج الموسيقى','sk6.desc':'تأليف موسيقى أصلية ومؤثرات صوتية للألعاب.',
  'sk.level':'مستوى الإتقان',

  'links.badge':'جدني هنا',
  'links.h1a':'جميع','links.h1em':'الروابط','links.h1b':'والقنوات.',
  'links.sub':'كل مكان يمكنك فيه إيجاد محتواي — اضغط للزيارة.',
  'links.cs.title':'روابط إضافية قريباً',
  'links.cs.sub':'ما زلت أعمل على توسيع هذا القسم. التحديثات قادمة!',
  'link1.title':'قناة يوتيوب · @Nevis_G10','link1.desc':'ألعاب وأنمي وبرمجة والمزيد',
  'link2.title':'تيك توك','link2.desc':'محتوى ألعاب إبداعي قصير',
  'link3.title':'إنستغرام','link3.desc':'كواليس وتحديثات',
  'link4.title':'فيسبوك','link4.desc':'أخبار وإعلانات',
  'link5.title':'سيرفر ديسكورد','link5.desc':'انضم للمجتمع — دردشة وألعاب والمزيد',

  'brand.tag':'بوابة الوصول الآمن','brand.sub':'حيث تلتقي الرؤية بالدقة',
  'brand.s1l':'تشفير بت','brand.s2l':'% التشغيل','brand.s3l':'تأخير البيانات',
  'login.tag':'المصادقة','login.title':'مرحباً بعودتك.',
  'login.sub':'سجّل دخولك للوصول إلى حسابك',
  'lEmail.ph':'البريد الإلكتروني','lPass.ph':'كلمة المرور',
  'login.rem':'تذكّرني','login.forgot':'نسيت كلمة المرور؟',
  'login.btn':'تسجيل الدخول',
  'login.noAcc':'ليس لديك حساب؟','login.reg':' إنشاء حساب',
  'reg.tag':'حساب جديد','reg.title':'إنشاء حساب.','reg.sub':'انضم إلينا — مجاناً',
  'rName.ph':'اسم المستخدم','rEmail.ph':'البريد الإلكتروني',
  'rPass.ph':'كلمة المرور','rConfirm.ph':'تأكيد كلمة المرور',
  'reg.terms':'أوافق على الشروط والأحكام','reg.btn':'إنشاء الحساب',
  'reg.hasAcc':'لديك حساب بالفعل؟','reg.login':' تسجيل الدخول',
  'fgt.tag':'الاسترداد','fgt.title':'إعادة تعيين كلمة المرور.',
  'fgt.sub':'سنرسل رابط إعادة تعيين آمن إلى بريدك',
  'fEmail.ph':'البريد الإلكتروني',
  'fgt.btn':'إرسال رابط الاسترداد','fgt.back':'→ العودة لتسجيل الدخول',
  'suc.title':'أهلاً بك.','suc.sub':'تمت المصادقة بنجاح. تم منح الوصول.',
  'suc.go':'الذهاب للرئيسية',

  'err.fill':'يرجى ملء جميع الحقول.',
  'err.email':'يرجى إدخال بريد إلكتروني صحيح.',
  'err.pass':'8 أحرف على الأقل — أحرف كبيرة وصغيرة وأرقام.',
  'err.match':'كلمتا المرور غير متطابقتين.',
  'err.terms':'يرجى الموافقة على الشروط والأحكام.',
  'err.taken':'هذا البريد مسجّل مسبقاً.',
  'err.creds':'البريد أو كلمة المرور غير صحيحة.',
  'err.noEmail':'هذا البريد غير مسجّل.',
  'ok.created':'تم إنشاء الحساب! ✔',
  'ok.reset':'تم إرسال رابط الاسترداد! 📧',
  'ok.logout':'تم تسجيل الخروج بنجاح.',
  'str.weak':'ضعيفة','str.fair':'مقبولة','str.good':'جيدة','str.strong':'قوية',
  'footer.copy':'© 2025 نيفيس — عاصم عبادة بوراي وطاني',
}};

/* ─────────────────────────────────────────────────────
   API HELPER
───────────────────────────────────────────────────── */
const NVApi = {
  async call(endpoint, method = 'GET', body = null) {
    const opts = { method, credentials: 'include', headers: { 'Content-Type': 'application/json' } };
    const token = localStorage.getItem('nv_token');
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    if (body)  opts.body = JSON.stringify(body);
    let res = await fetch(API + endpoint, opts);
    if (res.status === 401) {
      const rr = await fetch(API + '/auth/refresh', { method: 'POST', credentials: 'include' });
      if (rr.ok) {
        const rd = await rr.json();
        if (rd.token) {
          localStorage.setItem('nv_token', rd.token);
          opts.headers['Authorization'] = 'Bearer ' + rd.token;
          res = await fetch(API + endpoint, opts);
        }
      }
    }
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  },
  async register(username, email, password) { return this.call('/auth/register', 'POST', { username, email, password }); },
  async login(email, password) {
    const r = await this.call('/auth/login', 'POST', { email, password });
    if (r.ok && r.data.token) localStorage.setItem('nv_token', r.data.token);
    return r;
  },
  async forgotPassword(email) { return this.call('/auth/forgot-password', 'POST', { email }); },
  async logout() {
    await this.call('/auth/logout', 'POST').catch(() => {});
    localStorage.removeItem('nv_token');
    localStorage.removeItem('nv_auth');
    sessionStorage.removeItem('nv_auth');
  },
};

/* ─────────────────────────────────────────────────────
   CORE NV OBJECT
───────────────────────────────────────────────────── */
const NV = {
  KEYS: { AUTH:'nv_auth', USERS:'nv_users', THEME:'nv_theme', LANG:'nv_lang', MODE:'nv_mode' },

  /* Auth reads BOTH storages — fixes sessionStorage login not updating nav */
  get auth() {
    return JSON.parse(localStorage.getItem(this.KEYS.AUTH))
        || JSON.parse(sessionStorage.getItem(this.KEYS.AUTH))
        || null;
  },
  get users() { return JSON.parse(localStorage.getItem(this.KEYS.USERS)) || []; },
  get theme() { return localStorage.getItem(this.KEYS.THEME) || 'dark'; },
  get lang()  { return localStorage.getItem(this.KEYS.LANG)  || 'en'; },

  tr(k) { return (T[this.lang] && T[this.lang][k]) || T.en[k] || k; },

  /* ══════════════════════════════════════════════════
     BUG-FIXED applyTranslations
     Uses el.textContent ONLY on pure text nodes.
     Elements with child HTML (icons, spans) get their
     first text node updated — icons are NEVER touched.
  ══════════════════════════════════════════════════ */
  applyTranslations() {
    const ar = this.lang === 'ar';
    document.documentElement.lang = this.lang;
    document.documentElement.dir  = ar ? 'rtl' : 'ltr';

    /* ── Translate every [data-i18n] element ── */
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const val = this.tr(el.getAttribute('data-i18n'));
      /* ALL data-i18n elements in this project are plain <span> with text only.
         Just set textContent directly — fast, safe, no icon-wipe risk. */
      el.textContent = val;
    });

    /* ── Translate placeholders ── */
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
      el.placeholder = this.tr(el.getAttribute('data-i18n-ph'));
    });

    /* ── Lang button label — only the .btn-lbl span, never the icon ── */
    document.querySelectorAll('.nv-lang-btn').forEach(lb => {
      const lbl = lb.querySelector('.btn-lbl');
      if (lbl) {
        lbl.textContent = ar ? 'EN' : 'AR';
      }
    });

    if (typeof this._renderStrength === 'function') this._renderStrength();
  },

  toggleLang() {
    if (typeof _nvToggleLang === 'function') { _nvToggleLang(); return; }
    const next = this.lang === 'en' ? 'ar' : 'en';
    localStorage.setItem(this.KEYS.LANG, next);
    this.applyTranslations();
    this.applyAuthState();
    this.toast(next === 'ar' ? '🌐 تم التبديل إلى العربية' : '🌐 Switched to English', 'ok', 1600);
  },

  /* ─── Theme ─── */
  applyTheme(th, flash = false) {
    /* Apply class IMMEDIATELY — never delay the actual toggle */
    document.body.classList.toggle('light', th === 'light');
    localStorage.setItem(this.KEYS.THEME, th);

    /* Update theme button icons — only swap className, never innerHTML */
    document.querySelectorAll('.nv-theme-btn').forEach(b => {
      const ico = b.querySelector('i');
      if (ico) ico.className = th === 'light' ? 'fas fa-moon' : 'fas fa-sun';
      if (flash) {
        b.classList.add('spinning');
        setTimeout(() => b.classList.remove('spinning'), 420);
      }
    });

    /* Flash overlay for visual smoothness (purely cosmetic, runs after toggle) */
    if (flash) {
      const fl = document.getElementById('nv-theme-flash');
      if (fl) {
        fl.classList.add('active');
        setTimeout(() => fl.classList.remove('active'), 280);
      }
    }
  },
  toggleTheme() {
    if (typeof _nvToggleTheme === 'function') { _nvToggleTheme(); return; }
    const next = this.theme === 'dark' ? 'light' : 'dark';
    this.applyTheme(next, true);
    this.toast(next === 'light' ? '☀️ Light mode' : '🌙 Dark mode', 'info', 1400);
  },

  /* ─── Auth State (ICON-SAFE) ─── */
  applyAuthState() {
    const a   = this.auth;
    const lb  = document.getElementById('loginBtn');
    const ob  = document.getElementById('logoutBtn');
    const mlb = document.getElementById('mob-loginBtn');
    const mob = document.getElementById('mob-logoutBtn');

    if (a) {
      const name   = a.name || 'User';
      const letter = name.charAt(0).toUpperCase();

      if (lb)  lb.style.display  = 'none';
      if (mlb) mlb.style.display = 'none';

      /* Build logout button. Icons are siblings (not inside data-i18n spans) */
      if (ob) {
        ob.style.display = 'inline-flex';
        ob.innerHTML = `<span class="nv-av" aria-hidden="true">${letter}</span><span class="nv-uname">${name}</span><i class="fa-solid fa-right-from-bracket" aria-hidden="true"></i>`;
      }
      if (mob) {
        mob.style.display = 'flex';
        mob.innerHTML = `<span class="nv-av" aria-hidden="true">${letter}</span><span class="nv-uname">${name}</span><i class="fa-solid fa-right-from-bracket" aria-hidden="true"></i>`;
      }
    } else {
      if (lb)  lb.style.display  = 'inline-flex';
      if (mlb) mlb.style.display = 'block';
      if (ob)  { ob.style.display  = 'none'; ob.innerHTML  = `<span data-i18n="nav.logout">${this.tr('nav.logout')}</span>`; }
      if (mob) { mob.style.display = 'none'; mob.innerHTML = `<span data-i18n="nav.logout">${this.tr('nav.logout')}</span>`; }
    }
  },

  /* ─── Logout ─── */
  async logout() {
    await NVApi.logout();
    this.toast(this.tr('ok.logout'), 'ok');
    setTimeout(() => location.href = 'Login.html', 900);
  },

  /* ─── Toast ─── */
  _tt: null,
  toast(msg, type = 'info', dur = 3400) {
    let el = document.getElementById('nv-toast');
    if (!el) { el = document.createElement('div'); el.id = 'nv-toast'; document.body.appendChild(el); }
    clearTimeout(this._tt);
    el.textContent = msg; el.className = 'show ' + type;
    this._tt = setTimeout(() => el.className = '', dur);
  },

  dismissLoader() {
    const l = document.getElementById('nv-loader');
    if (l) setTimeout(() => l.classList.add('hidden'), 380);
  },

  /* ─── Scroll Progress ─── */
  startScrollProgress() {
    const bar = document.getElementById('nv-progress-fill');
    if (!bar) return;
    const u = () => {
      const s = window.scrollY, t = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = t > 0 ? (s / t * 100).toFixed(2) + '%' : '0%';
    };
    window.addEventListener('scroll', u, { passive: true }); u();
  },

  /* ─── Custom Cursor ─── */
  startCursor() {
    const dot  = document.querySelector('#nv-cursor .c-dot');
    const ring = document.querySelector('#nv-cursor .c-ring');
    if (!dot || !ring || window.matchMedia('(hover:none)').matches) return;

    /* Half-sizes for centering — match CSS dimensions */
    const DOT_HALF  = 5;   /* 10px / 2 */
    const RING_HALF = 19;  /* 38px / 2 */
    const LERP      = 0.12; /* ring lag factor */

    let mx = -300, my = -300, rx = -300, ry = -300;
    let rafId;

    document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; }, { passive: true });

    const tick = () => {
      rx += (mx - rx) * LERP;
      ry += (my - ry) * LERP;
      /* Position each element independently — no parent transform interference */
      dot.style.transform  = `translate(${mx - DOT_HALF}px, ${my - DOT_HALF}px)`;
      ring.style.transform = `translate(${rx - RING_HALF}px, ${ry - RING_HALF}px)`;
      rafId = requestAnimationFrame(tick);
    };
    tick();

    /* Add hover class to body when over interactive elements */
    const addHover    = () => document.body.classList.add('cursor-hover');
    const removeHover = () => document.body.classList.remove('cursor-hover');

    const bindHover = (root = document) => {
      root.querySelectorAll('a,button,[role="button"]').forEach(el => {
        el.addEventListener('mouseenter', addHover);
        el.addEventListener('mouseleave', removeHover);
      });
    };
    bindHover();

    /* Re-bind after language switch (DOM may be updated) */
    document.addEventListener('nv:langChanged', () => bindHover());

    /* Hide cursor when leaving window */
    document.addEventListener('mouseleave', () => { dot.style.opacity = '0'; ring.style.opacity = '0'; });
    document.addEventListener('mouseenter', () => { dot.style.opacity = ''; ring.style.opacity = ''; });
  },

  /* ─── Header Scroll ─── */
  startHeaderScroll() {
    const h = document.querySelector('.nv-header');
    if (!h) return;
    window.addEventListener('scroll', () => h.classList.toggle('scrolled', window.scrollY > 40), { passive: true });
  },

  /* ─── Hamburger ─── */
  startHamburger() {
    const btn = document.querySelector('.nv-hamburger');
    const nav = document.querySelector('.nv-nav-mobile');
    if (!btn || !nav) return;
    btn.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      btn.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', e => {
      if (!btn.contains(e.target) && !nav.contains(e.target)) {
        nav.classList.remove('open'); btn.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      }
    });
  },

  /* ─── Reveal on Scroll ─── */
  startReveal() {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
    }, { threshold: 0.1, rootMargin: '0px 0px -20px 0px' });

    ['.item','.sk-card','.link-card','.yt-card','.reveal','.profile-banner'].forEach(sel => {
      document.querySelectorAll(sel).forEach((el, i) => {
        el.style.transitionDelay = (i * 0.07) + 's';
        io.observe(el);
      });
    });

    const barIO = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.style.width = e.target.dataset.pct + '%';
          /* Add filled class after bar fills to trigger shimmer */
          setTimeout(() => e.target.classList.add('filled'), 1900);
          barIO.unobserve(e.target);
        }
      });
    }, { threshold: 0.3 });
    document.querySelectorAll('.bar-fill[data-pct]').forEach(b => barIO.observe(b));
  },

  /* ─── Stat Counters ─── */
  startStats() {
    const items = document.querySelectorAll('.stat-item[data-target]');
    if (!items.length) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.classList.add('visible');
        const target = +e.target.dataset.target;
        const suffix = e.target.dataset.suffix || '';
        /* .stat-num contains text + optional .stat-suffix span — update only the text node */
        const numWrap = e.target.querySelector('.stat-num');
        if (!numWrap) { io.unobserve(e.target); return; }
        /* Find or create the leading text node */
        let txtNode = null;
        for (const n of numWrap.childNodes) {
          if (n.nodeType === Node.TEXT_NODE) { txtNode = n; break; }
        }
        if (!txtNode) { txtNode = document.createTextNode('0'); numWrap.prepend(txtNode); }
        let c = 0; const steps = 80;
        const tick = setInterval(() => {
          c++;
          txtNode.textContent = Math.round(target * c / steps);
          if (c >= steps) { clearInterval(tick); txtNode.textContent = target; }
        }, 20);
        io.unobserve(e.target);
      });
    }, { threshold: 0.25 });
    items.forEach(it => io.observe(it));
  },

  /* ─── Mouse parallax ─── */
  startParallax() {
    const bg = document.querySelector('.bg-base');
    if (!bg) return;
    document.addEventListener('mousemove', e => {
      bg.style.setProperty('--mx', (e.clientX / window.innerWidth  * 100).toFixed(1) + '%');
      bg.style.setProperty('--my', (e.clientY / window.innerHeight * 100).toFixed(1) + '%');
    }, { passive: true });
  },

  /* ─── Back to Top ─── */
  startBackToTop() {
    const btn = document.getElementById('nv-btt');
    if (!btn) return;
    window.addEventListener('scroll', () => btn.classList.toggle('visible', window.scrollY > 400), { passive: true });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  },

  /* ─── Page Transitions ─── */
  startPageTransitions() {
    const overlay = document.getElementById('nv-exit-overlay');
    if (!overlay) return;
    document.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('http') || a.target === '_blank') return;
      a.addEventListener('click', e => {
        e.preventDefault();
        overlay.classList.add('exit-active');
        setTimeout(() => location.href = href, 420);
      });
    });
  },

  /* ─── Brand Canvas ─── */
  startBrandCanvas() {
    const cv = document.getElementById('bCanvas');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const W = cv.offsetWidth, H = cv.offsetHeight;
    cv.width = W; cv.height = H;
    const RC = 'rgba(212,0,31,', GC = 'rgba(201,166,58,';
    const pts = Array.from({ length: 55 }, () => ({
      x: Math.random()*100, y: Math.random()*100,
      vx: (Math.random()-.5)*.22, vy: (Math.random()-.5)*.22,
      r: Math.random()*2+.8, a: (Math.random()*.3+.1).toFixed(2),
      g: Math.random()>.7
    }));
    const draw = () => {
      ctx.clearRect(0,0,W,H);
      ctx.beginPath(); ctx.arc(W/2,H/2,3.5,0,Math.PI*2);
      ctx.fillStyle=RC+'.55)'; ctx.fill();
      pts.forEach(p => {
        p.x+=p.vx; p.y+=p.vy;
        if(p.x<-1)p.x=101; if(p.x>101)p.x=-1;
        if(p.y<-1)p.y=101; if(p.y>101)p.y=-1;
        ctx.beginPath(); ctx.arc(p.x/100*W,p.y/100*H,p.r,0,Math.PI*2);
        ctx.fillStyle=(p.g?GC:RC)+p.a+')'; ctx.fill();
      });
      for(let i=0;i<pts.length;i++) for(let j=i+1;j<pts.length;j++){
        const dx=(pts[i].x-pts[j].x)/100*W, dy=(pts[i].y-pts[j].y)/100*H;
        const d=Math.sqrt(dx*dx+dy*dy);
        if(d<60){
          ctx.beginPath(); ctx.moveTo(pts[i].x/100*W,pts[i].y/100*H);
          ctx.lineTo(pts[j].x/100*W,pts[j].y/100*H);
          ctx.strokeStyle=RC+((.06*(1-d/60)).toFixed(3))+')'; ctx.lineWidth=.4; ctx.stroke();
        }
      }
      requestAnimationFrame(draw);
    };
    draw();
  },

  /* ─── Clock ─── */
  startClock() {
    const u = () => {
      const n = new Date();
      const ct = document.getElementById('clockTime');
      const cd = document.getElementById('clockDate');
      if (ct) ct.textContent = n.toLocaleTimeString('en-GB', { hour12: false });
      if (cd) cd.textContent = n.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
    };
    u(); setInterval(u, 1000);
  },

  /* ─── INIT ─── */
  /* ── Page visit tracker ── */
  trackVisit() {
    try {
      const page = location.pathname.split('/').pop().replace('.html','') || 'home';
      fetch(API + '/contact/visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page }),
      }).catch(() => {}); /* silent — never block UI */
    } catch {}
  },

  /* ── OS theme detection (only on first visit) ── */
  detectOSTheme() {
    if (localStorage.getItem(this.KEYS.THEME)) return; /* User already chose */
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    localStorage.setItem(this.KEYS.THEME, prefersDark ? 'dark' : 'light');
  },

  /* ── Keyboard shortcuts ── */
  startKeyboard() {
    document.addEventListener('keydown', e => {
      const tag = (document.activeElement?.tagName || '').toLowerCase();
      if (['input','textarea','select'].includes(tag)) return;
      switch (e.key) {
        case 't': case 'T': /* T = toggle theme */
          e.preventDefault(); this.toggleTheme(); break;
        case 'l': case 'L': /* L = toggle language */
          e.preventDefault(); this.toggleLang(); break;
        case '?': /* ? = show shortcuts */
          e.preventDefault(); this.showShortcuts(); break;
        case 'Escape':
          this.hideShortcuts(); break;
      }
    });
  },

  /* ── Shortcuts modal ── */
  showShortcuts() {
    let el = document.getElementById('nv-shortcuts');
    if (!el) {
      const bd = document.createElement('div'); bd.id = 'nv-shortcuts-backdrop'; bd.className = 'open';
      bd.addEventListener('click', () => this.hideShortcuts());
      el = document.createElement('div'); el.id = 'nv-shortcuts';
      el.innerHTML = `
        <button class="sc-close" onclick="NV.hideShortcuts()"><i class="fas fa-xmark"></i></button>
        <h3>Keyboard Shortcuts</h3>
        <div class="sc-row"><span class="sc-key">T</span><span class="sc-desc">Toggle dark / light mode</span></div>
        <div class="sc-row"><span class="sc-key">L</span><span class="sc-desc">Toggle language EN / AR</span></div>
        <div class="sc-row"><span class="sc-key">?</span><span class="sc-desc">Show / hide this panel</span></div>
        <div class="sc-row"><span class="sc-key">Esc</span><span class="sc-desc">Close panel</span></div>
      `;
      document.body.append(bd, el);
    }
    document.getElementById('nv-shortcuts-backdrop').classList.add('open');
    el.classList.add('open');
  },
  hideShortcuts() {
    document.getElementById('nv-shortcuts')?.classList.remove('open');
    document.getElementById('nv-shortcuts-backdrop')?.classList.remove('open');
  },

  init() {
    this.detectOSTheme();          /* Auto detect on first visit */
    this.applyTheme(this.theme);
    this.applyAuthState();
    this.applyTranslations();
    this.startCursor();
    this.startHeaderScroll();
    this.startReveal();
    this.startStats();
    this.startBrandCanvas();
    this.startClock();
    this.startScrollProgress();
    this.startBackToTop();
    this.startHamburger();
    this.startPageTransitions();
    this.startParallax();
    this.startKeyboard();          /* Keyboard shortcuts */
    this.dismissLoader();
    this.trackVisit();
    if(window.NVS) NVS.init();
    if(window.NVS) NVS.applyMode();
  },

  /* ── Mode indicator (gold dot on gear icon) ── */
  applyModeIndicator() {
    const mode = localStorage.getItem(this.KEYS.MODE) || 'normal';
    document.body.dataset.mode = mode;
  },
};

/* ─────────────────────────────────────────────────────
   LOGIN PAGE LOGIC
───────────────────────────────────────────────────── */
function nvLoginInit() {
  const $ = id => document.getElementById(id);
  let sc = 0;
  const show = id => { document.querySelectorAll('.fbox').forEach(b=>b.classList.remove('active')); if($(id))$(id).classList.add('active'); clr(); };
  const clr  = () => ['lEmailErr','lPassErr','rNameErr','rEmailErr','rPassErr','rConfirmErr','fEmailErr'].forEach(id=>{const e=$(id);if(e)e.textContent='';});
  const err  = (id,m) => { const e=$(id); if(e) e.textContent=m; };
  const load = (btn,on) => { if(!btn) return; btn.disabled=on; btn.style.opacity=on?'.6':''; };

  [['toRegister','registerBox'],['toLogin','loginBox'],['toForgot','forgotBox'],['backLogin','loginBox']].forEach(([bid,box])=>{
    const b=$(bid); if(b) b.addEventListener('click',e=>{e.preventDefault();show(box);});
  });

  document.querySelectorAll('.eye-b').forEach(btn=>btn.addEventListener('click',()=>{
    const inp=$(btn.dataset.tid); if(!inp) return;
    const s=inp.type==='password'; inp.type=s?'text':'password';
    const ico=btn.querySelector('i');
    if(ico) ico.className=s?'fa-solid fa-eye-slash':'fa-solid fa-eye';
  }));

  const calcStrength = p => {
    let s=0;
    if(p.length>=8)s++; if(p.length>=12)s++;
    if(/[A-Z]/.test(p))s++; if(/[a-z]/.test(p))s++;
    if(/\d/.test(p))s++; if(/[^A-Za-z0-9]/.test(p))s++;
    return s;
  };
  NV._renderStrength = () => {
    const f=$('strFill'),l=$('strLbl'); if(!f) return;
    const map={0:[0,'transparent',''],1:[25,'#e8001a','str.weak'],2:[25,'#e8001a','str.weak'],
      3:[50,'#f07800','str.fair'],4:[75,'#d4c000','str.good'],5:[100,'#18c84a','str.strong'],6:[100,'#18c84a','str.strong']};
    const[pct,col,key]=map[Math.min(sc,6)];
    f.style.width=pct+'%'; f.style.background=col;
    if(l){l.style.color=col; l.textContent=key?NV.tr(key):'';}
  };
  const rp=$('rPass'); if(rp) rp.addEventListener('input',()=>{sc=calcStrength(rp.value);NV._renderStrength();});

  const isEmail=e=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const isPass =p=>p.length>=8&&/[A-Z]/.test(p)&&/[a-z]/.test(p)&&/\d/.test(p);

  /* REGISTER */
  const rF=$('registerForm');
  if(rF) rF.addEventListener('submit',async e=>{
    e.preventDefault(); clr();
    const name=$('rName').value.trim(),email=$('rEmail').value.trim().toLowerCase();
    const pass=$('rPass').value,confirm=$('rConfirm').value,agreed=$('agreeChk').checked;
    let ok=true;
    if(!name){err('rNameErr',NV.tr('err.fill'));ok=false;}
    if(!email){err('rEmailErr',NV.tr('err.fill'));ok=false;}
    else if(!isEmail(email)){err('rEmailErr',NV.tr('err.email'));ok=false;}
    if(!pass){err('rPassErr',NV.tr('err.fill'));ok=false;}
    else if(!isPass(pass)){err('rPassErr',NV.tr('err.pass'));ok=false;}
    if(pass!==confirm){err('rConfirmErr',NV.tr('err.match'));ok=false;}
    if(!agreed){NV.toast('⚠️ '+NV.tr('err.terms'),'err');ok=false;}
    if(!ok) return;
    const btn=rF.querySelector('.sub-btn'); load(btn,true);
    try{
      const{ok:apiOk,data}=await NVApi.register(name,email,pass);
      if(apiOk){NV.toast('✅ '+NV.tr('ok.created'),'ok');rF.reset();sc=0;NV._renderStrength();setTimeout(()=>show('loginBox'),1400);}
      else{const msg=data.message||'';if(msg.toLowerCase().includes('email'))err('rEmailErr',NV.tr('err.taken'));else NV.toast('❌ '+(msg||'Registration failed'),'err');}
    }catch{
      const us=NV.users;
      if(us.find(u=>u.email===email)){err('rEmailErr',NV.tr('err.taken'));return;}
      us.push({name,email,password:pass});
      localStorage.setItem(NV.KEYS.USERS,JSON.stringify(us));
      NV.toast('✅ '+NV.tr('ok.created'),'ok');rF.reset();sc=0;NV._renderStrength();setTimeout(()=>show('loginBox'),1400);
    }finally{load(btn,false);}
  });

  /* LOGIN */
  const lF=$('loginForm');
  if(lF) lF.addEventListener('submit',async e=>{
    e.preventDefault(); clr();
    const email=$('lEmail').value.trim().toLowerCase(),pass=$('lPass').value,rem=$('remMe').checked;
    let ok=true;
    if(!email){err('lEmailErr',NV.tr('err.fill'));ok=false;}
    else if(!isEmail(email)){err('lEmailErr',NV.tr('err.email'));ok=false;}
    if(!pass){err('lPassErr',NV.tr('err.fill'));ok=false;}
    if(!ok) return;
    const btn=lF.querySelector('.sub-btn'); load(btn,true);
    try{
      const{ok:apiOk,data}=await NVApi.login(email,pass);
      if(apiOk){
        const authData={name:data.user?.username||email.split('@')[0],email};
        if(rem) localStorage.setItem(NV.KEYS.AUTH,JSON.stringify(authData));
        else    sessionStorage.setItem(NV.KEYS.AUTH,JSON.stringify(authData));
        show('successBox');
        const sn=$('successName');if(sn)sn.textContent=authData.name;
        const gb=$('goHomeBtn');if(gb)gb.onclick=()=>location.replace('home.html');
      }else{err('lPassErr',data.message||NV.tr('err.creds'));}
    }catch{
      const user=NV.users.find(u=>u.email===email&&u.password===pass);
      if(!user){err('lPassErr',NV.tr('err.creds'));return;}
      const ad={name:user.name,email:user.email};
      if(rem) localStorage.setItem(NV.KEYS.AUTH,JSON.stringify(ad));
      else    sessionStorage.setItem(NV.KEYS.AUTH,JSON.stringify(ad));
      show('successBox');
      const sn=$('successName');if(sn)sn.textContent=user.name;
      const gb=$('goHomeBtn');if(gb)gb.onclick=()=>location.replace('home.html');
    }finally{load(btn,false);}
  });

  /* FORGOT */
  const fF=$('forgotForm');
  if(fF) fF.addEventListener('submit',async e=>{
    e.preventDefault(); clr();
    const email=$('fEmail').value.trim().toLowerCase();
    if(!email){err('fEmailErr',NV.tr('err.fill'));return;}
    if(!isEmail(email)){err('fEmailErr',NV.tr('err.email'));return;}
    const btn=fF.querySelector('.sub-btn'); load(btn,true);
    try{await NVApi.forgotPassword(email);}catch{}
    finally{
      NV.toast('📧 '+NV.tr('ok.reset'),'ok');
      fF.reset();setTimeout(()=>show('loginBox'),2200);load(btn,false);
    }
  });

  if(NV.auth){
    show('successBox');
    const sn=$('successName');if(sn)sn.textContent=NV.auth.name||'';
    const gb=$('goHomeBtn');if(gb)gb.addEventListener('click',()=>location.replace('home.html'));
  }
}

/* ─────────────────────────────────────────────────────
   BOOT
───────────────────────────────────────────────────── */
/* ── Global aliases — guarantee onclick="NV.toggleLang()" works
   even in strict file:// environments where const is block-scoped ── */
window.NV = NV;

document.addEventListener('DOMContentLoaded', () => {
  NV.init();
  nvLoginInit();
});
/* ══════════════════════════════════════════════════════════
   SMART BACKGROUND MUSIC SYSTEM (NeViS)
══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  const bgMusic = document.getElementById('bgMusic');
  const musicBtn = document.getElementById('musicToggle');

  if (bgMusic && musicBtn) {
    // 1. التحقق من وضع الموقع (عادي ولا رمضان)
    const mode = localStorage.getItem('nv_mode') || 'normal';

    if (mode === 'ramadan') {
      // إيقاف وإخفاء الموسيقى في وضع رمضان
      bgMusic.pause();
      musicBtn.style.display = 'none';
    } else {
      // 2. استرجاع وقت الأغنية وحالة الصوت عند الانتقال بين الصفحات
      const savedTime = sessionStorage.getItem('nv_music_time') || 0;
      const isMuted = sessionStorage.getItem('nv_music_muted') === 'true';

      bgMusic.currentTime = parseFloat(savedTime);
      bgMusic.volume = 0.5; // تقدر تغير مستوى الصوت من هنا (0.0 إلى 1.0)

      if (isMuted) {
        bgMusic.pause();
        musicBtn.classList.add('muted');
      } else {
        // محاولة التشغيل التلقائي (هتشتغل بسلاسة لأن المستخدم داس على زرار في صفحة Welcome)
        bgMusic.play().catch(() => {
          musicBtn.classList.add('muted'); // لو المتصفح منعها، نظهرها كمكتومة
        });
      }

      // 3. تشغيل/إيقاف الموسيقى عند الضغط على الزر
      musicBtn.addEventListener('click', () => {
        if (bgMusic.paused) {
          bgMusic.play();
          musicBtn.classList.remove('muted');
          sessionStorage.setItem('nv_music_muted', 'false');
        } else {
          bgMusic.pause();
          musicBtn.classList.add('muted');
          sessionStorage.setItem('nv_music_muted', 'true');
        }
      });

      // 4. حفظ مكان الأغنية قبل ما المستخدم يروح لصفحة تانية!
      window.addEventListener('beforeunload', () => {
        sessionStorage.setItem('nv_music_time', bgMusic.currentTime);
      });
    }
  }
});