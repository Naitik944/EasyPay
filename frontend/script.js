const API_BASE = window.EASYPAY_API_BASE || "http://127.0.0.1:8000";

let supabaseClient;
let publicConfig;
let currentUser = null;
let currentSession = null;
let realtimeChannel = null;
let refreshTimer = null;
let fallbackRefreshTimer = null;
let lastAccount = null;
let currentLang = "en";

const translations = {
    en: {
        "auth.signin_title": "Welcome to EasyPay",
        "auth.signin_subtitle": "Sign in to manage your wallet securely.",
        "auth.email": "Email address",
        "auth.password": "Password",
        "auth.signin_btn": "Sign In",
        "auth.new_user": "New to EasyPay?",
        "auth.create_account": "Create an account",
        "auth.signup_title": "Create your account",
        "auth.signup_subtitle": "Use an email address and a strong password.",
        "auth.name": "Full name",
        "auth.signup_btn": "Create Account",
        "auth.already_user": "Already have an account?",
        "auth.signin": "Sign in",
        "nav.brand": "EasyPay",
        "nav.main": "Main",
        "nav.dashboard": "Dashboard",
        "nav.recharge": "Recharge",
        "nav.vendor": "Pay Vendor",
        "nav.history": "History",
        "nav.account": "Account",
        "nav.settings": "Settings",
        "top.eyebrow": "Personal wallet",
        "top.refresh": "Refresh",
        "top.ai_voice": "AI Voice",
        "dash.subtitle": "Here is your wallet activity in real time.",
        "dash.realtime_connecting": "Connecting live updates…",
        "dash.balance_label": "Available balance",
        "dash.balance_desc": "Ready to spend from your EasyPay wallet",
        "dash.income_label": "Monthly recharges",
        "dash.income_desc": "Funds added this month",
        "dash.expense_label": "Monthly wallet payments",
        "dash.expense_desc": "Wallet debits this month",
        "dash.tx_title": "Recent transactions",
        "dash.tx_subtitle": "New activity appears automatically.",
        "dash.view_all": "View all",
        "ai.title": "EasyPay AI",
        "ai.subtitle": "Powered locally by Qwen3:8B",
        "ai.welcome": "Ask for a spending insight, say “recharge ₹50”, or “pay ₹25 to a vendor”. I will always ask before opening Razorpay or debiting your wallet.",
        "ai.placeholder": "Ask EasyPay AI…",
        "recharge.title": "Recharge wallet",
        "recharge.subtitle": "Add money securely with Razorpay.",
        "recharge.checkout_title": "Razorpay checkout",
        "recharge.checkout_desc": "Your payment is verified on the server before the wallet balance changes.",
        "recharge.label_amount": "Amount",
        "recharge.btn": "Continue to Razorpay",
        "vendor.title": "Pay vendor",
        "vendor.subtitle": "Record a wallet payment to a merchant or UPI recipient.",
        "vendor.payment_title": "Wallet payment",
        "vendor.payment_desc": "This prototype records a verified EasyPay wallet debit. It does not yet send a real UPI payout to the recipient.",
        "vendor.label_name": "Vendor or recipient name",
        "vendor.label_upi": "UPI ID",
        "vendor.label_amount": "Amount",
        "vendor.label_note": "Payment note",
        "vendor.btn": "Confirm wallet payment",
        "vendor.recent_title": "Recent Vendors",
        "vendor.recent_subtitle": "Quickly pay frequent recipients.",
        "history.title": "Transaction history",
        "history.subtitle": "Wallet credits, debits, and the model/source used for each record.",
        "settings.title": "Settings",
        "settings.subtitle": "Your account and connection details.",
        "settings.pref_title": "Preferences",
        "settings.lang_label": "Interface & AI Language",
        "settings.auth_title": "Email-only sign-in",
        "settings.auth_desc": "Signed in as",
        "settings.realtime_label": "Live Supabase updates:",
        "settings.refresh": "Refresh wallet data",
        "modal.title": "Confirm Payment",
        "modal.body": "Are you sure you want to send this amount from your wallet?",
        "modal.recipient": "Recipient:",
        "modal.amount": "Amount:",
        "modal.source": "Source:",
        "modal.source_val": "EasyPay Wallet",
        "modal.cancel": "Cancel",
        "modal.confirm": "Yes, Send Money",
        "common.optional": "(optional reference)"
    },
    hi: {
        "auth.signin_title": "EasyPay में आपका स्वागत है",
        "auth.signin_subtitle": "अपने वॉलेट को सुरक्षित रूप से प्रबंधित करने के लिए साइन इन करें।",
        "auth.email": "ईमेल पता",
        "auth.password": "पासवर्ड",
        "auth.signin_btn": "साइन इन करें",
        "auth.new_user": "EasyPay में नए हैं?",
        "auth.create_account": "खाता बनाएं",
        "auth.signup_title": "अपना खाता बनाएं",
        "auth.signup_subtitle": "ईमेल पते और एक मजबूत पासवर्ड का उपयोग करें।",
        "auth.name": "पूरा नाम",
        "auth.signup_btn": "खाता बनाएं",
        "auth.already_user": "पहले से खाता है?",
        "auth.signin": "साइन इन करें",
        "nav.brand": "EasyPay",
        "nav.main": "मुख्य",
        "nav.dashboard": "डैशबोर्ड",
        "nav.recharge": "रिचार्ज",
        "nav.vendor": "वेंडर को भुगतान करें",
        "nav.history": "इतिहास",
        "nav.account": "खाता",
        "nav.settings": "सेटिंग्स",
        "top.eyebrow": "व्यक्तिगत वॉलेट",
        "top.refresh": "रिफ्रेश",
        "top.ai_voice": "AI आवाज़",
        "dash.subtitle": "यहाँ आपकी वॉलेट गतिविधि वास्तविक समय में है।",
        "dash.realtime_connecting": "लाइव अपडेट कनेक्ट हो रहे हैं…",
        "dash.balance_label": "उपलब्ध शेष",
        "dash.balance_desc": "आपके EasyPay वॉलेट से खर्च करने के लिए तैयार",
        "dash.income_label": "मासिक रिचार्ज",
        "dash.income_desc": "इस महीने जोड़े गए फंड",
        "dash.expense_label": "मासिक वॉलेट भुगतान",
        "dash.expense_desc": "इस महीने वॉलेट डेबिट",
        "dash.tx_title": "हाल के लेनदेन",
        "dash.tx_subtitle": "नई गतिविधि अपने आप दिखाई देती है।",
        "dash.view_all": "सभी देखें",
        "ai.title": "EasyPay AI",
        "ai.subtitle": "Qwen3:8B द्वारा स्थानीय रूप से संचालित",
        "ai.welcome": "खर्च की जानकारी के लिए पूछें, “₹50 रिचार्ज करें”, या “एक वेंडर को ₹25 का भुगतान करें” कहें। मैं Razorpay खोलने या आपके वॉलेट से पैसे काटने से पहले हमेशा पूछूँगा।",
        "ai.placeholder": "EasyPay AI से पूछें…",
        "recharge.title": "वॉलेट रिचार्ज करें",
        "recharge.subtitle": "Razorpay के साथ सुरक्षित रूप से पैसे जोड़ें।",
        "recharge.checkout_title": "Razorpay चेकआउट",
        "recharge.checkout_desc": "वॉलेट बैलेंस बदलने से पहले सर्वर पर आपके भुगतान का सत्यापन किया जाता है।",
        "recharge.label_amount": "राशि",
        "recharge.btn": "Razorpay पर आगे बढ़ें",
        "vendor.title": "वेंडर को भुगतान करें",
        "vendor.subtitle": "एक मर्चेंट या UPI प्राप्तकर्ता को वॉलेट भुगतान रिकॉर्ड करें।",
        "vendor.payment_title": "वॉलेट भुगतान",
        "vendor.payment_desc": "यह प्रोटोटाइप एक सत्यापित EasyPay वॉलेट डेबिट रिकॉर्ड करता है। यह अभी तक प्राप्तकर्ता को वास्तविक UPI भुगतान नहीं भेजता है।",
        "vendor.label_name": "वेंडर या प्राप्तकर्ता का नाम",
        "vendor.label_upi": "UPI ID",
        "vendor.label_amount": "राशि",
        "vendor.label_note": "भुगतान नोट",
        "vendor.btn": "वॉलेट भुगतान की पुष्टि करें",
        "vendor.recent_title": "हाल के वेंडर",
        "vendor.recent_subtitle": "बार-बार भुगतान किए जाने वाले प्राप्तकर्ताओं को जल्दी भुगतान करें।",
        "history.title": "लेनदेन का इतिहास",
        "history.subtitle": "वॉलेट क्रेडिट, डेबिट और प्रत्येक रिकॉर्ड के लिए उपयोग किए गए मॉडल/स्रोत।",
        "settings.title": "सेटिंग्स",
        "settings.subtitle": "आपका खाता और कनेक्शन विवरण।",
        "settings.pref_title": "प्राथमिकताएं",
        "settings.lang_label": "इंटरफेस और AI भाषा",
        "settings.auth_title": "ईमेल-ओनली साइन-इन",
        "settings.auth_desc": "के रूप में साइन इन",
        "settings.realtime_label": "लाइव Supabase अपडेट:",
        "settings.refresh": "वॉलेट डेटा रिफ्रेश करें",
        "modal.title": "भुगतान की पुष्टि करें",
        "modal.body": "क्या आप सुनिश्चित हैं कि आप अपने वॉलेट से यह राशि भेजना चाहते हैं?",
        "modal.recipient": "प्राप्तकर्ता:",
        "modal.amount": "राशि:",
        "modal.source": "स्रोत:",
        "modal.source_val": "EasyPay वॉलेट",
        "modal.cancel": "रद्द करें",
        "modal.confirm": "हाँ, पैसे भेजें",
        "common.optional": "(वैकल्पिक संदर्भ)"
    },
    ta: {
        "auth.signin_title": "EasyPay-க்கு வரவேற்கிறோம்",
        "auth.signin_subtitle": "உங்கள் வாலட்டைப் பாதுகாப்பாக நிர்வகிக்க உள்நுழையுங்கள்.",
        "auth.email": "மின்னஞ்சல் முகவரி",
        "auth.password": "கடவுச்சொல்",
        "auth.signin_btn": "உள்நுழை",
        "auth.new_user": "EasyPay-க்கு புதியவரா?",
        "auth.create_account": "கணக்கை உருவாக்குங்கள்",
        "auth.signup_title": "உங்கள் கணக்கை உருவாக்குங்கள்",
        "auth.signup_subtitle": "மின்னஞ்சல் முகவரி மற்றும் வலுவான கடவுச்சொல்லைப் பயன்படுத்தவும்.",
        "auth.name": "முழு பெயர்",
        "auth.signup_btn": "கணக்கை உருவாக்கு",
        "auth.already_user": "ஏற்கனவே கணக்கு உள்ளதா?",
        "auth.signin": "உள்நுழை",
        "nav.brand": "EasyPay",
        "nav.main": "முக்கிய",
        "nav.dashboard": "டாஷ்போர்டு",
        "nav.recharge": "ரீசார்ஜ்",
        "nav.vendor": "விற்பனையாளருக்கு செலுத்து",
        "nav.history": "வரலாறு",
        "nav.account": "கணக்கு",
        "nav.settings": "அமைப்புகள்",
        "top.eyebrow": "தனிப்பட்ட வாலட்",
        "top.refresh": "புதுப்பி",
        "top.ai_voice": "AI குரல்",
        "dash.subtitle": "உங்கள் வாலட் செயல்பாடுகள் நிகழ்நேரத்தில் இங்கே உள்ளன.",
        "dash.realtime_connecting": "நேரடி புதுப்பிப்புகள் இணைக்கப்படுகின்றன…",
        "dash.balance_label": "கிடைக்கக்கூடிய இருப்பு",
        "dash.balance_desc": "உங்கள் EasyPay வாலட்டில் இருந்து செலவு செய்யத் தயார்",
        "dash.income_label": "மாதாந்திர ரீசார்ஜ்",
        "dash.income_desc": "இந்த மாதம் சேர்க்கப்பட்ட நிதி",
        "dash.expense_label": "மாதாந்திர வாலட் கொடுப்பனவுகள்",
        "dash.expense_desc": "இந்த மாத வாலட் தொகைகள்",
        "dash.tx_title": "சமீபத்திய பரிவர்த்தனைகள்",
        "dash.tx_subtitle": "புதிய செயல்பாடுகள் தானாகவே தோன்றும்.",
        "dash.view_all": "அனைத்தையும் காண்",
        "ai.title": "EasyPay AI",
        "ai.subtitle": "Qwen3:8B மூலம் உள்ளூரில் இயக்கப்படுகிறது",
        "ai.welcome": "செலவு பற்றிய தகவல்களைக் கேட்கவும், “₹50 ரீசார்ஜ் செய்” அல்லது “விற்பனையாளருக்கு ₹25 செலுத்து” என்று சொல்லுங்கள். Razorpay-ஐத் தொடங்கும் முன் நான் எப்போதும் அனுமதி கேட்பேன்.",
        "ai.placeholder": "EasyPay AI-யிடம் கேளுங்கள்…",
        "recharge.title": "வாலட்டை ரீசார்ஜ் செய்",
        "recharge.subtitle": "Razorpay மூலம் பாதுகாப்பாகப் பணத்தைச் சேர்க்கவும்.",
        "recharge.checkout_title": "Razorpay செக்அவுட்",
        "recharge.checkout_desc": "வாலட் இருப்பு மாறுவதற்கு முன் உங்கள் கொடுப்பனவு சர்வரில் சரிபார்க்கப்படும்.",
        "recharge.label_amount": "தொகை",
        "recharge.btn": "Razorpay-க்குச் செல்லவும்",
        "vendor.title": "விற்பனையாளருக்குச் செலுத்து",
        "vendor.subtitle": "ஒரு வணிகர் அல்லது UPI பெறுநருக்கு வாலட் கொடுப்பனவைப் பதிவு செய்யவும்.",
        "vendor.payment_title": "வாலட் கொடுப்பனவு",
        "vendor.payment_desc": "இந்த முன்மாதிரி சரிபார்க்கப்பட்ட EasyPay வாலட் தொகையைப் பதிவு செய்கிறது. இது இன்னும் உண்மையான UPI கொடுப்பனவை அனுப்பாது.",
        "vendor.label_name": "விற்பனையாளர் அல்லது பெறுநரின் பெயர்",
        "vendor.label_upi": "UPI ID",
        "vendor.label_amount": "தொகை",
        "vendor.label_note": "கொடுப்பனவு குறிப்பு",
        "vendor.btn": "வாலட் கொடுப்பனவை உறுதிப்படுத்து",
        "vendor.recent_title": "சமீபத்திய விற்பனையாளர்கள்",
        "vendor.recent_subtitle": "அடிக்கடி பணம் செலுத்தும் நபர்களுக்கு விரைவாகச் செலுத்தவும்.",
        "history.title": "பரிவர்த்தனை வரலாறு",
        "history.subtitle": "வாலட் வரவுகள், தொகைகள் மற்றும் ஒவ்வொரு பதிவிற்கும் பயன்படுத்தப்பட்ட மாதிரி/மூலம்.",
        "settings.title": "அமைப்புகள்",
        "settings.subtitle": "உங்கள் கணக்கு மற்றும் இணைப்பு விவரங்கள்.",
        "settings.pref_title": "விருப்பத்தேர்வுகள்",
        "settings.lang_label": "இடைமுகம் மற்றும் AI மொழி",
        "settings.auth_title": "மின்னஞ்சல் மட்டுமே உள்நுழைவு",
        "settings.auth_desc": "உள்நுழைந்துள்ளார்",
        "settings.realtime_label": "நேரடி Supabase புதுப்பிப்புகள்:",
        "settings.refresh": "வாலட் தரவைப் புதுப்பி",
        "modal.title": "கொடுப்பனவை உறுதிப்படுத்து",
        "modal.body": "உங்கள் வாலட்டில் இருந்து இந்தத் தொகையை அனுப்ப விரும்புகிறீர்களா?",
        "modal.recipient": "பெறுநர்:",
        "modal.amount": "தொகை:",
        "modal.source": "மூலம்:",
        "modal.source_val": "EasyPay வாலட்",
        "modal.cancel": "ரத்து செய்",
        "modal.confirm": "ஆம், பணத்தை அனுப்பு",
        "common.optional": "(விருப்பத் தொடர்பு)"
    },
    te: {
        "auth.signin_title": "EasyPay కు స్వాగతం",
        "auth.signin_subtitle": "మీ వాలెట్‌ను సురక్షితంగా నిర్వహించడానికి సైన్ ఇన్ చేయండి.",
        "auth.email": "ఈమెయిల్ చిరునామా",
        "auth.password": "పాస్‌వర్డ్",
        "auth.signin_btn": "సైన్ ఇన్",
        "auth.new_user": "EasyPay కి కొత్తవారా?",
        "auth.create_account": "ఖాతాను సృష్టించండి",
        "auth.signup_title": "మీ ఖాతాను సృష్టించండి",
        "auth.signup_subtitle": "ఈమెయిల్ చిరునామా మరియు బలమైన పాస్‌వర్డ్‌ని ఉపయోగించండి.",
        "auth.name": "పూర్తి పేరు",
        "auth.signup_btn": "ఖాతాను సృష్టించు",
        "auth.already_user": "ఇప్పటికే ఖాతా ఉందా?",
        "auth.signin": "సైన్ ఇన్ చేయండి",
        "nav.brand": "EasyPay",
        "nav.main": "ప్రధానం",
        "nav.dashboard": "డ్యాష్‌బోర్డ్",
        "nav.recharge": "రీఛార్జ్",
        "nav.vendor": "వెండర్‌కు చెల్లించండి",
        "nav.history": "చరిత్ర",
        "nav.account": "ఖాతా",
        "nav.settings": "సెట్టింగులు",
        "top.eyebrow": "వ్యక్తిగత వాలెట్",
        "top.refresh": "రిఫ్రెష్",
        "top.ai_voice": "AI వాయిస్",
        "dash.subtitle": "మీ వాలెట్ కార్యకలాపాలు ఇక్కడ నిజ సమయంలో ఉన్నాయి.",
        "dash.realtime_connecting": "లైవ్ అప్‌డేట్స్ కనెక్ట్ అవుతున్నాయి…",
        "dash.balance_label": "అందుబాటులో ఉన్న బ్యాలెన్స్",
        "dash.balance_desc": "మీ EasyPay వాలెట్ నుండి ఖర్చు చేయడానికి సిద్ధంగా ఉంది",
        "dash.income_label": "నెలవారీ రీఛార్జ్‌లు",
        "dash.income_desc": "ఈ నెలలో జోడించిన నిధులు",
        "dash.expense_label": "నెలవారీ వాలెట్ చెల్లింపులు",
        "dash.expense_desc": "ఈ నెల వాలెట్ డెబిట్లు",
        "dash.tx_title": "ఇటీవలి లావాదేవీలు",
        "dash.tx_subtitle": "కొత్త కార్యకలాపాలు స్వయంచాలకంగా కనిపిస్తాయి.",
        "dash.view_all": "అన్నీ చూడండి",
        "ai.title": "EasyPay AI",
        "ai.subtitle": "Qwen3:8B ద్వారా లోకల్‌గా పనిచేస్తుంది",
        "ai.welcome": "ఖర్చుల గురించి అడగండి, “₹50 రీఛార్జ్ చేయి” లేదా “వెండర్‌కు ₹25 చెల్లించు” అని చెప్పండి. నేను Razorpay ఓపెన్ చేసే ముందు లేదా మీ వాలెట్ నుండి డబ్బు తీసే ముందు ఎల్లప్పుడూ అడుగుతాను.",
        "ai.placeholder": "EasyPay AIని అడగండి…",
        "recharge.title": "వాలెట్‌ను రీఛార్జ్ చేయి",
        "recharge.subtitle": "Razorpay ద్వారా సురక్షితంగా డబ్బును జోడించండి.",
        "recharge.checkout_title": "Razorpay చెకౌట్",
        "recharge.checkout_desc": "వాలెట్ బ్యాలెన్స్ మారే ముందు మీ చెల్లింపు సర్వర్‌లో ధృవీకరించబడుతుంది.",
        "recharge.label_amount": "మొత్తం",
        "recharge.btn": "Razorpay కి కొనసాగించండి",
        "vendor.title": "వెండర్‌కు చెల్లించండి",
        "vendor.subtitle": "ఒక మర్చంట్ లేదా UPI రిసిపియంట్‌కు వాలెట్ చెల్లింపును రికార్డ్ చేయండి.",
        "vendor.payment_title": "వాలెట్ చెల్లింపు",
        "vendor.payment_desc": "ఈ ప్రోటోటైప్ ధృవీకరించబడిన EasyPay వాలెట్ డెబిట్‌ను రికార్డ్ చేస్తుంది. ఇది ఇంకా నిజమైన UPI చెల్లింపును పంపదు.",
        "vendor.label_name": "వెండర్ లేదా రిసిపియంట్ పేరు",
        "vendor.label_upi": "UPI ID",
        "vendor.label_amount": "మొత్తం",
        "vendor.label_note": "చెల్లింపు గమనిక",
        "vendor.btn": "వాలెట్ చెల్లింపును ధృవీకరించు",
        "vendor.recent_title": "ఇటీవలి వెండర్లు",
        "vendor.recent_subtitle": "తరచుగా చెల్లించే వారికి త్వరగా చెల్లించండి.",
        "history.title": "లావాదేవీల చరిత్ర",
        "history.subtitle": "వాలెట్ క్రెడిట్లు, డెబిట్లు మరియు ప్రతి రికార్డుకు ఉపయోగించిన మోడల్/మూలం.",
        "settings.title": "సెట్టింగులు",
        "settings.subtitle": "మీ ఖాతా మరియు కనెక్షన్ వివరాలు.",
        "settings.pref_title": "ప్రాధాన్యతలు",
        "settings.lang_label": "ఇంటర్‌ఫేస్ & AI భాష",
        "settings.auth_title": "ఈమెయిల్-ఓన్లీ సైన్-ఇన్",
        "settings.auth_desc": "సైన్ ఇన్ అయి ఉన్నారు",
        "settings.realtime_label": "లైవ్ Supabase అప్‌డేట్స్:",
        "settings.refresh": "వాలెట్ డేటాను రిఫ్రెష్ చేయి",
        "modal.title": "చెల్లింపును ధృవీకరించు",
        "modal.body": "మీ వాలెట్ నుండి ఈ మొత్తాన్ని పంపాలని మీరు ఖచ్చితంగా అనుకుంటున్నారా?",
        "modal.recipient": "రిసిపియంట్:",
        "modal.amount": "మొత్తం:",
        "modal.source": "మూలం:",
        "modal.source_val": "EasyPay వాలెట్",
        "modal.cancel": "రద్దు చేయి",
        "modal.confirm": "అవును, డబ్బు పంపండి",
        "common.optional": "(ఐచ్ఛిక రిఫరెన్స్)"
    },
    bn: {
        "auth.signin_title": "EasyPay-এ আপনাকে স্বাগতম",
        "auth.signin_subtitle": "আপনার ওয়ালেট সুরক্ষিতভাবে পরিচালনা করতে সাইন ইন করুন।",
        "auth.email": "ইমেল ঠিকানা",
        "auth.password": "পাসওয়ার্ড",
        "auth.signin_btn": "সাইন ইন করুন",
        "auth.new_user": "EasyPay-তে নতুন?",
        "auth.create_account": "একটি অ্যাকাউন্ট তৈরি করুন",
        "auth.signup_title": "আপনার অ্যাকাউন্ট তৈরি করুন",
        "auth.signup_subtitle": "একটি ইমেল ঠিকানা এবং একটি শক্তিশালী পাসওয়ার্ড ব্যবহার করুন।",
        "auth.name": "পুরো নাম",
        "auth.signup_btn": "অ্যাকাউন্ট তৈরি করুন",
        "auth.already_user": "ইতিমধ্যে অ্যাকাউন্ট আছে?",
        "auth.signin": "সাইন ইন করুন",
        "nav.brand": "EasyPay",
        "nav.main": "মূল",
        "nav.dashboard": "ড্যাশবোর্ড",
        "nav.recharge": "রিচার্জ",
        "nav.vendor": "ভেন্ডরকে পেমেন্ট করুন",
        "nav.history": "ইতিহাস",
        "nav.account": "অ্যাকাউন্ট",
        "nav.settings": "সেটিংস",
        "top.eyebrow": "ব্যক্তিগত ওয়ালেট",
        "top.refresh": "রিফ্রেশ",
        "top.ai_voice": "AI ভয়েস",
        "dash.subtitle": "আপনার ওয়ালেটের কার্যক্রম রিয়েল টাইমে এখানে দেখুন।",
        "dash.realtime_connecting": "লাইভ আপডেট কানেক্ট হচ্ছে…",
        "dash.balance_label": "উপলব্ধ ব্যালেন্স",
        "dash.balance_desc": "আপনার EasyPay ওয়ালেট থেকে খরচ করার জন্য প্রস্তুত",
        "dash.income_label": "মাসিক রিচার্জ",
        "dash.income_desc": "এই মাসে যুক্ত করা ফান্ড",
        "dash.expense_label": "মাসিক ওয়ালেট পেমেন্ট",
        "dash.expense_desc": "এই মাসের ওয়ালেট ডেবিট",
        "dash.tx_title": "সাম্প্রতিক লেনদেন",
        "dash.tx_subtitle": "নতুন কার্যক্রম স্বয়ংক্রিয়ভাবে দেখা যাবে।",
        "dash.view_all": "সব দেখুন",
        "ai.title": "EasyPay AI",
        "ai.subtitle": "স্থানীয়ভাবে Qwen3:8B দ্বারা চালিত",
        "ai.welcome": "খরচের অন্তর্দৃষ্টি জানতে জিজ্ঞাসা করুন, “₹৫০ রিচার্জ করুন”, অথবা “ভেন্ডরকে ₹২৫ পেমেন্ট করুন” বলুন। Razorpay খোলার আগে বা আপনার ওয়ালেট থেকে টাকা কাটার আগে আমি সর্বদা অনুমতি চাইব।",
        "ai.placeholder": "EasyPay AI-কে জিজ্ঞাসা করুন…",
        "recharge.title": "ওয়ালেট রিচার্জ করুন",
        "recharge.subtitle": "Razorpay-এর মাধ্যমে সুরক্ষিতভাবে টাকা যোগ করুন।",
        "recharge.checkout_title": "Razorpay চেকআউট",
        "recharge.checkout_desc": "ওয়ালেট ব্যালেন্স পরিবর্তনের আগে সার্ভারে আপনার পেমেন্ট যাচাই করা হবে।",
        "recharge.label_amount": "পরিমাণ",
        "recharge.btn": "Razorpay-তে যান",
        "vendor.title": "ভেন্ডরকে পেমেন্ট করুন",
        "vendor.subtitle": "একজন মার্চেন্ট বা UPI প্রাপককে ওয়ালেট পেমেন্ট রেকর্ড করুন।",
        "vendor.payment_title": "ওয়ালেট পেমেন্ট",
        "vendor.payment_desc": "এই প্রোটোটাইপটি একটি যাচাইকৃত EasyPay ওয়ালেট ডেবিট রেকর্ড করে। এটি এখনও প্রকৃত UPI পেমেন্ট পাঠায় না।",
        "vendor.label_name": "ভেন্ডর বা প্রাপকের নাম",
        "vendor.label_upi": "UPI ID",
        "vendor.label_amount": "পরিমাণ",
        "vendor.label_note": "পেমেন্ট নোট",
        "vendor.btn": "ওয়ালেট পেমেন্ট নিশ্চিত করুন",
        "vendor.recent_title": "সাম্প্রতিক ভেন্ডর",
        "vendor.recent_subtitle": "প্রায়শই পেমেন্ট করা প্রাপকদের দ্রুত পেমেন্ট করুন।",
        "history.title": "লেনদেনের ইতিহাস",
        "history.subtitle": "ওয়ালেট ক্রেডিট, ডেবিট এবং প্রতিটি রেকর্ডের জন্য ব্যবহৃত মডেল/উৎস।",
        "settings.title": "সেটিংস",
        "settings.subtitle": "আপনার অ্যাকাউন্ট এবং সংযোগ বিবরণ।",
        "settings.pref_title": "পছন্দসমূহ",
        "settings.lang_label": "ইন্টারফেস এবং AI ভাষা",
        "settings.auth_title": "শুধুমাত্র ইমেল সাইন-ইন",
        "settings.auth_desc": "সাইন ইন করা হিসেবে",
        "settings.realtime_label": "লাইভ Supabase আপডেট:",
        "settings.refresh": "ওয়ালেট ডেটা রিফ্রেশ করুন",
        "modal.title": "পেমেন্ট নিশ্চিত করুন",
        "modal.body": "আপনি কি নিশ্চিত যে আপনার ওয়ালেট থেকে এই পরিমাণ টাকা পাঠাতে চান?",
        "modal.recipient": "প্রাপক:",
        "modal.amount": "পরিমাণ:",
        "modal.source": "উৎস:",
        "modal.source_val": "EasyPay ওয়ালেট",
        "modal.cancel": "বাতিল করুন",
        "modal.confirm": "হ্যাঁ, টাকা পাঠান",
        "common.optional": "(ঐচ্ছিক রেফারেন্স)"
    },
    mr: {
        "auth.signin_title": "EasyPay मध्ये आपले स्वागत आहे",
        "auth.signin_subtitle": "तुमच्या वॉलेटचे सुरक्षितपणे व्यवस्थापन करण्यासाठी साइन इन करा.",
        "auth.email": "ईमेल पत्ता",
        "auth.password": "पासवर्ड",
        "auth.signin_btn": "साइन इन करा",
        "auth.new_user": "EasyPay मध्ये नवीन आहात?",
        "auth.create_account": "खाते तयार करा",
        "auth.signup_title": "तुमचे खाते तयार करा",
        "auth.signup_subtitle": "ईमेल पत्ता आणि मजबूत पासवर्ड वापरा.",
        "auth.name": "पूर्ण नाव",
        "auth.signup_btn": "खाते तयार करा",
        "auth.already_user": "आधीच खाते आहे?",
        "auth.signin": "साइन इन करा",
        "nav.brand": "EasyPay",
        "nav.main": "मुख्य",
        "nav.dashboard": "डॅशबोर्ड",
        "nav.recharge": "रिचार्ज",
        "nav.vendor": "वेंडरला पैसे द्या",
        "nav.history": "इतिहास",
        "nav.account": "खाते",
        "nav.settings": "सेटिंग्ज",
        "top.eyebrow": "वैयक्तिक वॉलेट",
        "top.refresh": "रिफ्रेश",
        "top.ai_voice": "AI आवाज",
        "dash.subtitle": "तुमच्या वॉलेटची हालचाल रिअल टाइममध्ये येथे आहे.",
        "dash.realtime_connecting": "लाइव्ह अपडेट्स कनेक्ट होत आहेत…",
        "dash.balance_label": "उपलब्ध शिल्लक",
        "dash.balance_desc": "तुमच्या EasyPay वॉलेटमधून खर्च करण्यासाठी तयार",
        "dash.income_label": "मासिक रिचार्ज",
        "dash.income_desc": "या महिन्यात जोडलेले फंड",
        "dash.expense_label": "मासिक वॉलेट पेमेंट्स",
        "dash.expense_desc": "या महिन्यातील वॉलेट डेबिट",
        "dash.tx_title": "अलीकडील व्यवहार",
        "dash.tx_subtitle": "नवीन हालचाली आपोआप दिसतात.",
        "dash.view_all": "सर्व पहा",
        "ai.title": "EasyPay AI",
        "ai.subtitle": "Qwen3:8B द्वारे स्थानिकरित्या संचालित",
        "ai.welcome": "खर्चाबद्दल माहिती विचारा, “₹५० रिचार्ज करा”, किंवा “वेंडरला ₹२५ द्या” असे सांगा. Razorpay उघडण्यापूर्वी किंवा तुमच्या वॉलेटमधून पैसे कापण्यापूर्वी मी नेहमी विचारेन.",
        "ai.placeholder": "EasyPay AI ला विचारा…",
        "recharge.title": "वॉलेट रिचार्ज करा",
        "recharge.subtitle": "Razorpay सह सुरक्षितपणे पैसे जोडा.",
        "recharge.checkout_title": "Razorpay चेकआउट",
        "recharge.checkout_desc": "वॉलेट शिल्लक बदलण्यापूर्वी तुमचे पेमेंट सर्व्हरवर सत्यापित केले जाते.",
        "recharge.label_amount": "रक्कम",
        "recharge.btn": "Razorpay कडे जा",
        "vendor.title": "वेंडरला पैसे द्या",
        "vendor.subtitle": "व्यापारी किंवा UPI प्राप्तकर्त्याला वॉलेट पेमेंट नोंदवा.",
        "vendor.payment_title": "वॉलेट पेमेंट",
        "vendor.payment_desc": "हा प्रोटोटाइप सत्यापित EasyPay वॉलेट डेबिट नोंदवतो. हा अजून खरोखर UPI पेमेंट पाठवत नाही.",
        "vendor.label_name": "वेंडर किंवा प्राप्तकर्त्याचे नाव",
        "vendor.label_upi": "UPI ID",
        "vendor.label_amount": "रक्कम",
        "vendor.label_note": "पेमेंट नोट",
        "vendor.btn": "वॉलेट पेमेंटची पुष्टी करा",
        "vendor.recent_title": "अलीकडील वेंडर्स",
        "vendor.recent_subtitle": "वारंवार पेमेंट केलेल्या प्राप्तकर्त्यांना त्वरित पैसे द्या.",
        "history.title": "व्यवहारांचा इतिहास",
        "history.subtitle": "वॉलेट क्रेडिट, डेबिट आणि प्रत्येक रेकॉर्डसाठी वापरलेले मॉडेल/स्रोत.",
        "settings.title": "सेटिंग्ज",
        "settings.subtitle": "तुमच्या खात्याची आणि कनेक्शनची माहिती.",
        "settings.pref_title": "पसंती",
        "settings.lang_label": "इंटरफेस आणि AI भाषा",
        "settings.auth_title": "केवळ ईमेल साइन-इन",
        "settings.auth_desc": "साइन इन झाले आहे",
        "settings.realtime_label": "लाइव्ह Supabase अपडेट्स:",
        "settings.refresh": "वॉलेट डेटा रिफ्रेश करा",
        "modal.title": "पेमेंटची पुष्टी करा",
        "modal.body": "तुम्हाला खात्री आहे की तुम्हाला तुमच्या वॉलेटमधून ही रक्कम पाठवायची आहे?",
        "modal.recipient": "प्राप्तकर्ता:",
        "modal.amount": "रक्कम:",
        "modal.source": "स्रोत:",
        "modal.source_val": "EasyPay वॉलेट",
        "modal.cancel": "रद्द करा",
        "modal.confirm": "हो, पैसे पाठवा",
        "common.optional": "(पर्यायी संदर्भ)"
    },
    gu: {
        "auth.signin_title": "EasyPay માં આપનું સ્વાગત છે",
        "auth.signin_subtitle": "તમારા વોલેટનું સુરક્ષિત રીતે સંચાલન કરવા માટે સાઇન ઇન કરો.",
        "auth.email": "ઇમેઇલ સરનામું",
        "auth.password": "પાસવર્ડ",
        "auth.signin_btn": "સાઇન ઇન કરો",
        "auth.new_user": "EasyPay માં નવા છો?",
        "auth.create_account": "એકાઉન્ટ બનાવો",
        "auth.signup_title": "તમારું એકાઉન્ટ બનાવો",
        "auth.signup_subtitle": "ઇમેઇલ સરનામું અને મજબૂત પાસવર્ડનો ઉપયોગ કરો.",
        "auth.name": "આખું નામ",
        "auth.signup_btn": "એકાઉન્ટ બનાવો",
        "auth.already_user": "પહેલેથી એકાઉન્ટ છે?",
        "auth.signin": "સાઇન ઇન કરો",
        "nav.brand": "EasyPay",
        "nav.main": "મુખ્ય",
        "nav.dashboard": "ડેશબોર્ડ",
        "nav.recharge": "રિચાર્જ",
        "nav.vendor": "વેન્ડરને ચૂકવણી કરો",
        "nav.history": "ઇતિહાસ",
        "nav.account": "એકાઉન્ટ",
        "nav.settings": "સેટિંગ્સ",
        "top.eyebrow": "વ્યક્તિગત વોલેટ",
        "top.refresh": "રિફ્રેશ",
        "top.ai_voice": "AI અવાજ",
        "dash.subtitle": "તમારી વોલેટ પ્રવૃત્તિ રીઅલ ટાઇમમાં અહીં છે.",
        "dash.realtime_connecting": "લાઇવ અપડેટ્સ કનેક્ટ થઈ રહ્યા છે…",
        "dash.balance_label": "ઉપલબ્ધ બેલેન્સ",
        "dash.balance_desc": "તમારા EasyPay વોલેટમાંથી ખર્ચ કરવા માટે તૈયાર",
        "dash.income_label": "માસિક રિચાર્જ",
        "dash.income_desc": "આ મહિને ઉમેરેલ ભંડોળ",
        "dash.expense_label": "માસિક વોલેટ પેમેન્ટ્સ",
        "dash.expense_desc": "આ મહિનાના વોલેટ ડેબિટ",
        "dash.tx_title": "તાજેતરના વ્યવહારો",
        "dash.tx_subtitle": "નવી પ્રવૃત્તિઓ આપમેળે દેખાય છે.",
        "dash.view_all": "બધું જુઓ",
        "ai.title": "EasyPay AI",
        "ai.subtitle": "સ્થાનિક રીતે Qwen3:8B દ્વારા સંચાલિત",
        "ai.welcome": "ખર્ચ વિશે માહિતી પૂછો, “₹૫૦ રિચાર્જ કરો”, અથવા “વેન્ડરને ₹૨૫ ચૂકવો” એમ કહો. Razorpay ખોલતા પહેલા અથવા તમારા વોલેટમાંથી પૈસા કાપતા પહેલા હું હંમેશા પૂછીશ.",
        "ai.placeholder": "EasyPay AI ને પૂછો…",
        "recharge.title": "વોલેટ રિચાર્જ કરો",
        "recharge.subtitle": "Razorpay દ્વારા સુરક્ષિત રીતે પૈસા ઉમેરો.",
        "recharge.checkout_title": "Razorpay ચેકઆઉટ",
        "recharge.checkout_desc": "વોલેટ બેલેન્સ બદલાતા પહેલા સર્વર પર તમારી ચુકવણીની ચકાસણી કરવામાં આવે છે.",
        "recharge.label_amount": "રકમ",
        "recharge.btn": "Razorpay પર આગળ વધો",
        "vendor.title": "વેન્ડરને ચૂકવણી કરો",
        "vendor.subtitle": "વેપારી અથવા UPI પ્રાપ્તકર્તાને વોલેટ પેમેન્ટ રેકોર્ડ કરો.",
        "vendor.payment_title": "વોલેટ પેમેન્ટ",
        "vendor.payment_desc": "આ પ્રોટોટાઇપ વેરિફાઇડ EasyPay વોલેટ ડેબિટ રેકોર્ડ કરે છે. તે હજુ સુધી વાસ્તવિક UPI પેમેન્ટ મોકલતું નથી.",
        "vendor.label_name": "વેન્ડર અથવા પ્રાપ્તકર્તાનું નામ",
        "vendor.label_upi": "UPI ID",
        "vendor.label_amount": "રકમ",
        "vendor.label_note": "પેમેન્ટ નોંધ",
        "vendor.btn": "વોલેટ પેમેન્ટ કન્ફર્મ કરો",
        "vendor.recent_title": "તાજેતરના વેન્ડર્સ",
        "vendor.recent_subtitle": "વારંવાર પેમેન્ટ કરેલા પ્રાપ્તકર્તાઓને ઝડપથી ચૂકવણી કરો.",
        "history.title": "વ્યવહારનો ઇતિહાસ",
        "history.subtitle": "વોલેટ ક્રેડિટ, ડેબિટ અને દરેક રેકોર્ડ માટે વપરાયેલ મોડલ/સોર્સ.",
        "settings.title": "સેટિંગ્સ",
        "settings.subtitle": "તમારા એકાઉન્ટ અને કનેક્શનની વિગતો.",
        "settings.pref_title": "પસંદગીઓ",
        "settings.lang_label": "ઇન્ટરફેસ અને AI ભાષા",
        "settings.auth_title": "માત્ર ઇમેઇલ સાઇન-ઇન",
        "settings.auth_desc": "સાઇન ઇન થયેલ",
        "settings.realtime_label": "લાઇવ Supabase અપડેટ્સ:",
        "settings.refresh": "વોલેટ ડેટા રિફ્રેશ કરો",
        "modal.title": "પેમેન્ટ કન્ફર્મ કરો",
        "modal.body": "શું તમે ખરેખર તમારા વોલેટમાંથી આ રકમ મોકલવા માંગો છો?",
        "modal.recipient": "પ્રાપ્તકર્તા:",
        "modal.amount": "રકમ:",
        "modal.source": "સોર્સ:",
        "modal.source_val": "EasyPay વોલેટ",
        "modal.cancel": "રદ કરો",
        "modal.confirm": "હા, પૈસા મોકલો",
        "common.optional": "(વૈકલ્પિક સંદર્ભ)"
    },
    kn: {
        "auth.signin_title": "EasyPay ಗೆ ಸ್ವಾಗತ",
        "auth.signin_subtitle": "ನಿಮ್ಮ ವಾಲೆಟ್ ಅನ್ನು ಸುರಕ್ಷಿತವಾಗಿ ನಿರ್ವಹಿಸಲು ಸೈನ್ ಇನ್ ಮಾಡಿ.",
        "auth.email": "ಇಮೇಲ್ ವಿಳಾಸ",
        "auth.password": "ಪಾಸ್‌ವರ್ಡ್",
        "auth.signin_btn": "ಸೈನ್ ಇನ್",
        "auth.new_user": "EasyPay ಗೆ ಹೊಸಬರೇ?",
        "auth.create_account": "ಖಾತೆಯನ್ನು ರಚಿಸಿ",
        "auth.signup_title": "ನಿಮ್ಮ ಖಾತೆಯನ್ನು ರಚಿಸಿ",
        "auth.signup_subtitle": "ಇಮೇಲ್ ವಿಳಾಸ ಮತ್ತು ಬಲವಾದ ಪಾಸ್‌ವರ್ಡ್ ಬಳಸಿ.",
        "auth.name": "ಪೂರ್ಣ ಹೆಸರು",
        "auth.signup_btn": "ಖಾತೆಯನ್ನು ರಚಿಸು",
        "auth.already_user": "ಈಗಾಗಲೇ ಖಾತೆ ಇದೆಯೇ?",
        "auth.signin": "ಸೈನ್ ಇನ್ ಮಾಡಿ",
        "nav.brand": "EasyPay",
        "nav.main": "ಮುಖ್ಯ",
        "nav.dashboard": "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
        "nav.recharge": "ರೀಚಾರ್ಜ್",
        "nav.vendor": "ವೆಂಡರ್‌ಗೆ ಪಾವತಿಸಿ",
        "nav.history": "ಇತಿಹಾಸ",
        "nav.account": "ಖಾತೆ",
        "nav.settings": "ಸೆಟ್ಟಿಂಗ್‌ಗಳು",
        "top.eyebrow": "ವೈಯಕ್ತಿಕ ವಾಲೆಟ್",
        "top.refresh": "ರಿಫ್ರೆಶ್",
        "top.ai_voice": "AI ಧ್ವನಿ",
        "dash.subtitle": "ನಿಮ್ಮ ವಾಲೆಟ್ ಚಟುವಟಿಕೆಗಳು ಇಲ್ಲಿ ನೈಜ ಸಮಯದಲ್ಲಿವೆ.",
        "dash.realtime_connecting": "ಲೈವ್ ಅಪ್‌ಡೇಟ್ಸ್ ಕನೆಕ್ಟ್ ಆಗುತ್ತಿವೆ…",
        "dash.balance_label": "ಲಭ್ಯವಿರುವ ಬ್ಯಾಲೆನ್ಸ್",
        "dash.balance_desc": "ನಿಮ್ಮ EasyPay ವಾಲೆಟ್‌ನಿಂದ ಖર્ચ ಮಾಡಲು ಸಿದ್ಧವಾಗಿದೆ",
        "dash.income_label": "ಮಾಸಿಕ ರೀಚಾರ್ಜ್‌ಗಳು",
        "dash.income_desc": "ಈ ತಿಂಗಳು ಸೇರಿಸಲಾದ ನಿಧಿ",
        "dash.expense_label": "ಮಾಸಿಕ ವಾಲೆಟ್ ಪಾವತಿಗಳು",
        "dash.expense_desc": "ಈ ತಿಂಗಳ ವಾಲೆಟ್ ಡೆಬಿಟ್‌ಗಳು",
        "dash.tx_title": "ಇತ್ತೀಚಿನ ವಹಿವಾಟುಗಳು",
        "dash.tx_subtitle": "ಹೊಸ ಚಟುವಟಿಕೆಗಳು ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಕಾಣಿಸಿಕೊಳ್ಳುತ್ತವೆ.",
        "dash.view_all": "ಎಲ್ಲವನ್ನೂ ನೋಡಿ",
        "ai.title": "EasyPay AI",
        "ai.subtitle": "Qwen3:8B ಮೂಲಕ ಸ್ಥಳೀಯವಾಗಿ ಚಾಲಿತ",
        "ai.welcome": "ಖರ್ಚುಗಳ ಬಗ್ಗೆ ಮಾಹಿತಿ ಕೇಳಿ, “₹೫೦ ರೀಚಾರ್ಜ್ ಮಾಡಿ”, ಅಥವಾ “ವೆಂಡರ್‌ಗೆ ₹೨೫ ಪಾವತಿಸಿ” ಎಂದು ಹೇಳಿ. Razorpay ಅನ್ನು ತೆರೆಯುವ ಮೊದಲು ಅಥವಾ ನಿಮ್ಮ ವಾಲೆಟ್‌ನಿಂದ ಹಣ ಕಡಿತಗೊಳಿಸುವ ಮೊದಲು ನಾನು ಯಾವಾಗಲೂ ಕೇಳುತ್ತೇನೆ.",
        "ai.placeholder": "EasyPay AI ಅನ್ನು ಕೇಳಿ…",
        "recharge.title": "ವಾಲೆಟ್ ರೀಚಾರ್ಜ್ ಮಾಡಿ",
        "recharge.subtitle": "Razorpay ಮೂಲಕ ಸುರಕ್ಷಿತವಾಗಿ ಹಣವನ್ನು జోಡಿಸಿ.",
        "recharge.checkout_title": "Razorpay ಚೆಕ್‌ಔಟ್",
        "recharge.checkout_desc": "ವಾಲೆಟ್ ಬ್ಯಾಲೆನ್ಸ್ ಬದಲಾಗುವ ಮೊದಲು ನಿಮ್ಮ ಪಾವತಿಯನ್ನು ಸರ್ವರ್‌ನಲ್ಲಿ ಪರಿಶೀಲಿಸಲಾಗುತ್ತದೆ.",
        "recharge.label_amount": "ಮೊತ್ತ",
        "recharge.btn": "Razorpay ಗೆ ಮುಂದುವರಿಯಿರಿ",
        "vendor.title": "ವೆಂಡರ್‌ಗೆ ಪಾವತಿಸಿ",
        "vendor.subtitle": "ವ್ಯಾಪಾರಿ ಅಥವಾ UPI ಸ್ವೀಕರಿಸುವವರಿಗೆ ವಾಲೆಟ್ ಪಾವತಿಯನ್ನು ದಾಖಲಿಸಿ.",
        "vendor.payment_title": "ವಾಲೆಟ್ ಪಾವತಿ",
        "vendor.payment_desc": "ಈ ಪ್ರೊಟೊಟೈಪ್ ಪರಿಶೀಲಿಸಿದ EasyPay ವಾಲೆಟ್ ಡೆಬಿಟ್ ಅನ್ನು ದಾಖಲಿಸುತ್ತದೆ. ಇದು ಇನ್ನೂ ನಿಜವಾದ UPI ಪಾವತಿಯನ್ನು ಕಳುಹಿಸುವುದಿಲ್ಲ.",
        "vendor.label_name": "ವೆಂಡರ್ ಅಥವಾ ಸ್ವೀಕರಿಸುವವರ ಹೆಸರು",
        "vendor.label_upi": "UPI ID",
        "vendor.label_amount": "ಮೊತ್ತ",
        "vendor.label_note": "ಪಾವತಿ ಟಿಪ್ಪಣಿ",
        "vendor.btn": "ವಾಲೆಟ್ ಪಾವತಿಯನ್ನು ಖಚಿತಪಡಿಸಿ",
        "vendor.recent_title": "ಇತ್ತೀಚಿನ ವೆಂಡರ್‌ಗಳು",
        "vendor.recent_subtitle": "ತರಚು ಪಾವತಿಸುವ ಸ್ವೀಕರಿಸುವವರಿಗೆ விரைவாக ಪಾವತಿಸಿ.",
        "history.title": "ವಹಿವಾಟಿನ ಇತಿಹಾಸ",
        "history.subtitle": "ವಾಲೆಟ್ ಕ್ರೆಡಿಟ್‌ಗಳು, ಡೆಬಿಟ್‌ಗಳು ಮತ್ತು ಪ್ರತಿ ದಾಖಲೆಗೆ ಬಳಸಿದ ಮಾಡೆಲ್/ಮೂಲ.",
        "settings.title": "ಸೆಟ್ಟಿಂಗ್‌ಗಳು",
        "settings.subtitle": "ನಿಮ್ಮ ಖಾತೆ ಮತ್ತು ಸಂಪರ್ಕ ವಿವರಗಳು.",
        "settings.pref_title": "ಆದ್ಯತೆಗಳು",
        "settings.lang_label": "ಇಂಟರ್ಫೇಸ್ ಮತ್ತು AI ಭಾಷೆ",
        "settings.auth_title": "ಇಮೇಲ್-ಮಾತ್ರದ ಸೈನ್-ಇನ್",
        "settings.auth_desc": "ಸೈನ್ ಇನ್ ಆಗಿದ್ದೀರಿ",
        "settings.realtime_label": "ಲೈವ್ Supabase ಅಪ್‌ಡೇಟ್ಸ್:",
        "settings.refresh": "ವಾಲೆಟ್ ಡೇಟಾವನ್ನು ರಿಫ್ರೆಶ್ ಮಾಡಿ",
        "modal.title": "ಪಾವತಿಯನ್ನು ಖಚಿತಪಡಿಸಿ",
        "modal.body": "ನಿಮ್ಮ ವಾಲೆಟ್‌ನಿಂದ ಈ ಮೊತ್ತವನ್ನು ಕಳುಹಿಸಲು ನೀವು ಖಚಿತంగా ಇದ್ದೀರಾ?",
        "modal.recipient": "ಸ್ವೀಕರಿಸುವವರು:",
        "modal.amount": "ಮೊತ್ತ:",
        "modal.source": "ಮೂಲ:",
        "modal.source_val": "EasyPay ವಾಲೆಟ್",
        "modal.cancel": "ರದ್ದುಮಾಡಿ",
        "modal.confirm": "ಹೌದು, ಹಣವನ್ನು ಕಳುಹಿಸಿ",
        "common.optional": "(ಐచ్ఛಿಕ ಉಲ್ಲೇಖ)"
    },
    ml: {
        "auth.signin_title": "EasyPay-ലേക്ക് സ്വാഗതം",
        "auth.signin_subtitle": "നിങ്ങളുടെ വാലറ്റ് സുരക്ഷിതമായി നിയന്ത്രിക്കാൻ സൈൻ ഇൻ ചെയ്യുക.",
        "auth.email": "ഇമെയിൽ വിലാസം",
        "auth.password": "പാസ്‌വേഡ്",
        "auth.signin_btn": "സൈൻ ഇൻ ചെയ്യുക",
        "auth.new_user": "EasyPay-ൽ പുതിയതാണോ?",
        "auth.create_account": "ഒരു അക്കൗണ്ട് സൃഷ്ടിക്കുക",
        "auth.signup_title": "നിങ്ങളുടെ അക്കൗണ്ട് സൃഷ്ടിക്കുക",
        "auth.signup_subtitle": "ഒരു ഇമെയിൽ വിലാസവും ശക്തമായ പാസ്‌വേഡും ഉപയോഗിക്കുക.",
        "auth.name": "പൂർണ്ണ നാമം",
        "auth.signup_btn": "അക്കൗണ്ട് സൃഷ്ടിക്കുക",
        "auth.already_user": "അക്കൗണ്ട് ഉണ്ടോ?",
        "auth.signin": "സൈൻ ഇൻ ചെയ്യുക",
        "nav.brand": "EasyPay",
        "nav.main": "പ്രധാന",
        "nav.dashboard": "ഡാഷ്‌ബോർഡ്",
        "nav.recharge": "റീചാർജ്",
        "nav.vendor": "വെൻഡർക്ക് പണമടയ്ക്കുക",
        "nav.history": "ചരിത്രം",
        "nav.account": "അക്കൗണ്ട്",
        "nav.settings": "ക്രമീകരണങ്ങൾ",
        "top.eyebrow": "വ്യക്തിഗത വാലറ്റ്",
        "top.refresh": "പുതുക്കുക",
        "top.ai_voice": "AI വോയിസ്",
        "dash.subtitle": "നിങ്ങളുടെ വാലറ്റ് പ്രവർത്തനങ്ങൾ തത്സമയമായി ഇവിടെ കാണാം.",
        "dash.realtime_connecting": "ലൈവ് അപ്‌ഡേറ്റുകൾ കണക്ട് ചെയ്യുന്നു…",
        "dash.balance_label": "ലഭ്യമായ ബാലൻസ്",
        "dash.balance_desc": "നിങ്ങളുടെ EasyPay വാലറ്റിൽ നിന്ന് ചിലവഴിക്കാൻ തയ്യാറാണ്",
        "dash.income_label": "പ്രതിമാസ റീചാർജുകൾ",
        "dash.income_desc": "ഈ മാസം ചേർത്ത തുക",
        "dash.expense_label": "പ്രതിമാസ വാലറ്റ് പേയ്‌മെന്റുകൾ",
        "dash.expense_desc": "ഈ മാസത്തെ വാലറ്റ് ഡെബിറ്റുകൾ",
        "dash.tx_title": "സമീപകാല ഇടപാടുകൾ",
        "dash.tx_subtitle": "പുതിയ പ്രവർത്തനങ്ങൾ തനിയെ ദൃശ്യമാകും.",
        "dash.view_all": "എല്ലാം കാണുക",
        "ai.title": "EasyPay AI",
        "ai.subtitle": "Qwen3:8B ഉപയോഗിച്ച് ലോക്കലായി പ്രവർത്തിക്കുന്നു",
        "ai.welcome": "ചെലവുകളെക്കുറിച്ച് ചോദിക്കുക, “₹50 റീചാർജ് ചെയ്യുക” അല്ലെങ്കിൽ “വെൻഡർക്ക് ₹25 നൽകുക” എന്ന് പറയുക. Razorpay തുറക്കുന്നതിന് മുൻപോ വാലറ്റിൽ നിന്ന് തുക കുറയ്ക്കുന്നതിന് മുൻപോ ഞാൻ നിങ്ങളോട് ചോദിക്കും.",
        "ai.placeholder": "EasyPay AI-യോട് ചോദിക്കൂ…",
        "recharge.title": "വാലറ്റ് റീചാർജ് ചെയ്യുക",
        "recharge.subtitle": "Razorpay ഉപയോഗിച്ച് സുരക്ഷിതമായി പണം ചേർക്കുക.",
        "recharge.checkout_title": "Razorpay ചെക്കൗട്ട്",
        "recharge.checkout_desc": "വാലറ്റ് ബാലൻസ് മാറുന്നതിന് മുൻപ് നിങ്ങളുടെ പേയ്‌മെന്റ് സെർവറിൽ പരിശോധിക്കും.",
        "recharge.label_amount": "തുക",
        "recharge.btn": "Razorpay-ലേക്ക് പോകുക",
        "vendor.title": "വെൻഡർക്ക് പണമടയ്ക്കുക",
        "vendor.subtitle": "ഒരു വ്യാപാരിക്ക് അല്ലെങ്കിൽ UPI സ്വീകർത്താവിന് വാലറ്റ് പേയ്‌മെന്റ് രേഖപ്പെടുത്തുക.",
        "vendor.payment_title": "വാലറ്റ് പേയ്‌മെന്റ്",
        "vendor.payment_desc": "ഈ പ്രോട്ടോടൈപ്പ് ധൃవీകരിച്ച EasyPay വാലറ്റ് ഡെബിറ്റ് രേഖപ്പെടുത്തുന്നു. ഇത് യഥാർത്ഥ UPI പേയ്‌മെന്റ് അയക്കുന്നില്ല.",
        "vendor.label_name": "വെൻഡർ അല്ലെങ്കിൽ സ്വീകർത്താവിന്റെ പേര്",
        "vendor.label_upi": "UPI ID",
        "vendor.label_amount": "തുക",
        "vendor.label_note": "പേയ്‌മെന്റ് നോട്ട്",
        "vendor.btn": "വാലറ്റ് പേയ്‌മെന്റ് സ്ഥിരീകരിക്കുക",
        "vendor.recent_title": "സമീപകാല വെൻഡർമാർ",
        "vendor.recent_subtitle": "తరచు xuyênമായി പണമടയ്ക്കുന്നവർക്ക് വേഗത്തിൽ പണമടയ്ക്കുക.",
        "history.title": "ഇടപാട് ചരിത്രം",
        "history.subtitle": "വാലറ്റ് ക്രെഡിറ്റുകൾ, ഡെബിറ്റുകൾ, ഓരോ രേഖയ്ക്കും ഉപയോഗിച്ച മോഡൽ/സ്രോതസ്സ്.",
        "settings.title": "ക്രമീകരണങ്ങൾ",
        "settings.subtitle": "നിങ്ങളുടെ അക്കൗണ്ടും കണക്ഷൻ വിവരങ്ങളും.",
        "settings.pref_title": "മുൻഗണനകൾ",
        "settings.lang_label": "ഇന്റർഫേസ് & AI ഭാഷ",
        "settings.auth_title": "ഇമെയിൽ-മാത്ര സൈൻ-ഇൻ",
        "settings.auth_desc": "സൈൻ ഇൻ ചെയ്തിരിക്കുന്നു",
        "settings.realtime_label": "ലൈവ് Supabase അപ്‌ഡേറ്റുകൾ:",
        "settings.refresh": "വാലറ്റ് ഡാറ്റ പുതുക്കുക",
        "modal.title": "പേയ്‌മെന്റ് സ്ഥിരീകരിക്കുക",
        "modal.body": "നിങ്ങളുടെ വാലറ്റിൽ നിന്ന് ഈ തുക അയക്കാൻ നിങ്ങൾ ഉറപ്പാണോ?",
        "modal.recipient": "സ്വീകർത്താവ്:",
        "modal.amount": "തുക:",
        "modal.source": "സ്രോതസ്സ്:",
        "modal.source_val": "EasyPay വാലറ്റ്",
        "modal.cancel": "റദ്ദാക്കുക",
        "modal.confirm": "അതെ, പണം അയക്കുക",
        "common.optional": "(ഓപ്ഷണൽ റെഫറൻസ്)"
    }
};

const byId = (id) => document.getElementById(id);

function applyTranslations() {
    const langData = translations[currentLang] || translations.en;
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.dataset.i18n;
        if (langData[key]) el.textContent = langData[key];
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
        const key = el.dataset.i18nPlaceholder;
        if (langData[key]) el.placeholder = langData[key];
    });
}

function setAuthMessage(message = "", isError = false) {
    const target = byId("auth-message");
    target.textContent = message;
    target.classList.toggle("error", isError);
}

function showToast(message, isError = false) {
    const toast = byId("toast");
    toast.textContent = message;
    toast.classList.toggle("error", isError);
    toast.classList.add("visible");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove("visible"), 4200);
}

function setButtonBusy(button, busy, text = "Working…") {
    if (!button) return;
    if (busy) {
        button.dataset.originalText = button.innerHTML;
        button.disabled = true;
        button.textContent = text;
        return;
    }
    button.disabled = false;
    if (button.dataset.originalText) button.innerHTML = button.dataset.originalText;
}

function displayName(user = currentUser) {
    const metadata = user?.user_metadata || {};
    return metadata.full_name || metadata.name || user?.email?.split("@")[0] || "EasyPay user";
}

function initials(name) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "EP";
}

function formatMoney(value) {
    const amount = Number(value || 0);
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}

function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function apiErrorMessage(error) {
    return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

async function getAccessToken() {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error || !data.session) throw new Error("Your session has expired. Please sign in again.");
    currentSession = data.session;
    return data.session.access_token;
}

async function api(path, options = {}) {
    const token = await getAccessToken();
    const headers = new Headers(options.headers || {});
    headers.set("Authorization", `Bearer ${token}`);
    if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
        if (response.status === 401) await signOut();
        throw new Error(body.detail || "The request could not be completed.");
    }
    return body;
}

async function initialize() {
    try {
        const response = await fetch(`${API_BASE}/public-config`);
        const config = await response.json();
        if (!response.ok) throw new Error(config.detail || "The EasyPay backend is not ready.");
        if (!window.supabase) throw new Error("The Supabase browser library did not load.");

        publicConfig = config;
        supabaseClient = window.supabase.createClient(config.supabase_url, config.supabase_anon_key);
        bindEvents();
        supabaseClient.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                void enterApp(session);
            } else if (currentUser) {
                leaveApp();
            }
        });

        const { data } = await supabaseClient.auth.getSession();
        if (data.session?.user) await enterApp(data.session);
        
        applyTranslations();
    } catch (error) {
        setAuthMessage(apiErrorMessage(error), true);
    }
}

function bindEvents() {
    byId("show-signup").addEventListener("click", () => showAuthPanel("signup"));
    byId("show-signin").addEventListener("click", () => showAuthPanel("signin"));
    byId("signin-form").addEventListener("submit", signIn);
    byId("signup-form").addEventListener("submit", signUp);
    byId("logout-btn").addEventListener("click", signOut);
    byId("refresh-btn").addEventListener("click", () => void loadDashboard(true));
    byId("settings-refresh").addEventListener("click", () => void loadDashboard(true));
    byId("recharge-form").addEventListener("submit", startRecharge);
    byId("vendor-form").addEventListener("submit", payVendor);
    byId("ai-form").addEventListener("submit", submitAiForm);
    byId("ai-voice-btn").addEventListener("click", startVoiceAssistant);
    
    byId("confirm-pay-btn").addEventListener("click", handleConfirmPay);
    byId("confirm-cancel-btn").addEventListener("click", () => showConfirmModal(false));

    document.querySelectorAll(".nav-item").forEach((button) => {
        button.addEventListener("click", () => showPage(button.dataset.page));
    });
    document.querySelectorAll("[data-open-page]").forEach((button) => {
        button.addEventListener("click", () => showPage(button.dataset.openPage));
    });

    // Settings Language Change
    byId("app-lang").addEventListener("change", (e) => {
        currentLang = e.target.value;
        applyTranslations();
        showToast(`Language changed to ${e.target.options[e.target.selectedIndex].text}`);
    });

    // Mock QR scan
    document.querySelectorAll(".icon-input-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            showToast("Scanning QR code... (Simulation)");
            window.setTimeout(() => {
                byId("vendor-name").value = "Sample Merchant";
                byId("vendor-upi").value = "merchant@upi";
                showToast("Vendor identified successfully!");
            }, 1500);
        });
    });
}

function showAuthPanel(panel) {
    byId("signin-panel").classList.toggle("hidden", panel !== "signin");
    byId("signup-panel").classList.toggle("hidden", panel !== "signup");
    setAuthMessage("");
}

async function signIn(event) {
    event.preventDefault();
    const email = byId("signin-email").value.trim();
    const password = byId("signin-password").value;
    if (!email || !password) return setAuthMessage("Enter your email address and password.", true);

    const button = byId("signin-btn");
    setButtonBusy(button, true, "Signing in…");
    setAuthMessage("");
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (!data.session) throw new Error("Supabase did not create a sign-in session.");
        await enterApp(data.session);
    } catch (error) {
        setAuthMessage(apiErrorMessage(error), true);
    } finally {
        setButtonBusy(button, false);
    }
}

async function signUp(event) {
    event.preventDefault();
    const fullName = byId("signup-name").value.trim();
    const email = byId("signup-email").value.trim();
    const password = byId("signup-password").value;
    if (!fullName || !email || !password) return setAuthMessage("Complete every field to create an account.", true);
    if (password.length < 8) return setAuthMessage("Use a password with at least 8 characters.", true);

    const button = byId("signup-btn");
    setButtonBusy(button, true, "Creating account…");
    setAuthMessage("");
    try {
        const options = { data: { full_name: fullName } };
        if (window.location.origin !== "null") options.emailRedirectTo = `${window.location.origin}${window.location.pathname}`;
        const { data, error } = await supabaseClient.auth.signUp({ email, password, options });
        if (error) throw error;
        if (data.session) {
            await enterApp(data.session);
            return;
        }
        showAuthPanel("signin");
        setAuthMessage("Account created. Check your email, confirm the address, then sign in.");
    } catch (error) {
        setAuthMessage(apiErrorMessage(error), true);
    } finally {
        setButtonBusy(button, false);
    }
}

async function enterApp(session) {
    if (!session?.user) return;
    currentSession = session;
    currentUser = session.user;
    const name = displayName();
    byId("auth-screen").classList.add("hidden");
    byId("app-shell").classList.remove("hidden");
    byId("sidebar-name").textContent = name;
    byId("sidebar-email").textContent = currentUser.email || "Signed in";
    byId("header-name").textContent = name;
    byId("settings-email").textContent = currentUser.email || "—";
    byId("user-initials").textContent = initials(name);
    byId("welcome-title").textContent = `Welcome back, ${name.split(" ")[0]} 👋`;
    await setupRealtime();
    await loadDashboard(true);
}

function leaveApp() {
    if (realtimeChannel && supabaseClient) void supabaseClient.removeChannel(realtimeChannel);
    realtimeChannel = null;
    currentUser = null;
    currentSession = null;
    lastAccount = null;
    window.clearInterval(fallbackRefreshTimer);
    byId("app-shell").classList.add("hidden");
    byId("auth-screen").classList.remove("hidden");
    showAuthPanel("signin");
    setRealtimeStatus("Signed out", false);
}

async function signOut() {
    if (supabaseClient) await supabaseClient.auth.signOut();
    leaveApp();
}

function setRealtimeStatus(text, connected) {
    const dashboardStatus = byId("realtime-status");
    dashboardStatus.textContent = text;
    dashboardStatus.classList.toggle("connected", Boolean(connected));
    byId("settings-realtime").textContent = text;
}

async function setupRealtime() {
    if (!supabaseClient || !currentUser) return;
    if (realtimeChannel) await supabaseClient.removeChannel(realtimeChannel);
    setRealtimeStatus("Connecting live updates…", false);
    realtimeChannel = supabaseClient
        .channel(`easypay-wallet-${currentUser.id}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "profiles", filter: `id=eq.${currentUser.id}` }, scheduleDashboardRefresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "transactions", filter: `user_id=eq.${currentUser.id}` }, scheduleDashboardRefresh)
        .subscribe((status) => {
            if (status === "SUBSCRIBED") setRealtimeStatus("Live updates connected", true);
            if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) setRealtimeStatus("Live updates unavailable — refreshing periodically", false);
        });

    window.clearInterval(fallbackRefreshTimer);
    fallbackRefreshTimer = window.setInterval(() => void loadDashboard(false), 45000);
}

function scheduleDashboardRefresh() {
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => void loadDashboard(false), 180);
}

async function loadDashboard(withInsight = false) {
    if (!currentUser) return;
    try {
        const data = await api("/account");
        lastAccount = data;
        renderAccount(data);
        if (withInsight) void loadInsight();
    } catch (error) {
        showToast(apiErrorMessage(error), true);
    }
}

function renderAccount(data) {
    const profile = data.profile || {};
    byId("balance-value").textContent = formatMoney(profile.balance);
    byId("income-value").textContent = formatMoney(data.stats?.income);
    byId("expense-value").textContent = formatMoney(data.stats?.expenses);
    renderTransactions(byId("recent-transactions"), (data.transactions || []).slice(0, 6));
    renderTransactions(byId("history-transactions"), data.transactions || []);
}

function renderTransactions(target, transactions) {
    target.replaceChildren();
    if (!transactions.length) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 5;
        cell.className = "empty-cell";
        cell.textContent = "No wallet transactions yet.";
        row.appendChild(cell);
        target.appendChild(row);
        return;
    }
    transactions.forEach((transaction) => {
        const row = document.createElement("tr");
        const description = document.createElement("td");
        description.className = "transaction-description";
        const icon = document.createElement("span");
        icon.className = Number(transaction.amount) >= 0 ? "transaction-icon credit" : "transaction-icon debit";
        icon.innerHTML = Number(transaction.amount) >= 0 ? '<i class="fa-solid fa-arrow-down"></i>' : '<i class="fa-solid fa-arrow-up"></i>';
        const text = document.createElement("span");
        text.textContent = transaction.description || "Wallet transaction";
        description.append(icon, text);
        row.appendChild(description);
        [transaction.category || "—", transaction.ai_model || "Manual", formatDate(transaction.created_at)].forEach((value) => {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });
        const amount = document.createElement("td");
        amount.className = `right amount ${Number(transaction.amount) >= 0 ? "credit" : "debit"}`;
        amount.textContent = `${Number(transaction.amount) >= 0 ? "+" : "−"}${formatMoney(Math.abs(Number(transaction.amount || 0)))}`;
        row.appendChild(amount);
        target.appendChild(row);
    });
}

async function loadInsight() {
    try {
        const data = await api("/insight");
        appendMessage("assistant", data.answer);
    } catch (_) {
        // The dashboard remains usable even if Ollama is stopped or still loading.
    }
}

function appendMessage(role, message) {
    const container = byId("ai-messages");
    const item = document.createElement("div");
    item.className = `message ${role}`;
    item.textContent = message;
    container.appendChild(item);
    container.scrollTop = container.scrollHeight;
}

async function submitAiForm(event) {
    event.preventDefault();
    const input = byId("ai-input");
    const prompt = input.value.trim();
    if (!prompt) return;
    input.value = "";
    await submitAiPrompt(prompt, false);
}

async function submitAiPrompt(prompt, fromVoice) {
    appendMessage("user", prompt);
    try {
        const data = await api("/ask", { 
            method: "POST", 
            body: JSON.stringify({ 
                prompt,
                lang: currentLang 
            }) 
        });
        appendMessage("assistant", data.answer || "I am ready to help.");
        if (fromVoice) speak(data.answer || "I am ready to help.");
        if (data.type === "action") await handleAiAction(data.action, fromVoice);
    } catch (error) {
        const message = apiErrorMessage(error);
        appendMessage("assistant", message);
        if (fromVoice) speak(message);
    }
}

async function handleAiAction(action, fromVoice) {
    if (action.name === "recharge") {
        showPage("recharge");
        byId("recharge-amount").value = action.amount;
        const question = `Open Razorpay to recharge ${formatMoney(action.amount)}?`;
        if (fromVoice) speak(question);
        if (window.confirm(question)) await startRecharge();
        return;
    }
    if (action.name === "vendor_payment") {
        showPage("vendor");
        byId("vendor-name").value = action.vendor;
        byId("vendor-amount").value = action.amount;
        const question = `Confirm a wallet payment of ${formatMoney(action.amount)} to ${action.vendor}?`;
        if (fromVoice) speak(question);
        if (window.confirm(question)) {
            // Bypass the modal for voice confirmation to make it "smooth"
            await executeVendorPayment(action.vendor, action.amount);
        }
    }
}

async function startRecharge(event) {
    event?.preventDefault();
    const amount = Number(byId("recharge-amount").value);
    if (!Number.isFinite(amount) || amount <= 0) return showToast("Enter a valid recharge amount.", true);
    if (!window.Razorpay) return showToast("Razorpay checkout did not load. Check your internet connection.", true);

    const button = byId("recharge-btn");
    setButtonBusy(button, true, "Preparing checkout…");
    try {
        const order = await api("/recharge/create-order", { method: "POST", body: JSON.stringify({ amount }) });
        if (!publicConfig.razorpay_key_id) throw new Error("Razorpay is not configured in backend/.env.");
        const checkout = new window.Razorpay({
            key: publicConfig.razorpay_key_id,
            amount: order.amount_paise,
            currency: order.currency,
            name: "EasyPay",
            description: "Wallet recharge",
            order_id: order.order_id,
            prefill: { name: displayName(), email: currentUser?.email || "" },
            theme: { color: "#2563eb" },
            handler: async (payment) => {
                try {
                    await api("/recharge/verify", {
                        method: "POST",
                        body: JSON.stringify({
                            razorpay_order_id: payment.razorpay_order_id,
                            razorpay_payment_id: payment.razorpay_payment_id,
                            razorpay_signature: payment.razorpay_signature,
                        }),
                    });
                    byId("recharge-amount").value = "";
                    showToast("Recharge verified. Your wallet is updated.");
                    await loadDashboard(true);
                    showPage("dashboard");
                } catch (error) {
                    showToast(`Payment succeeded, but wallet verification needs attention: ${apiErrorMessage(error)}`, true);
                }
            },
        });
        checkout.open();
    } catch (error) {
        showToast(apiErrorMessage(error), true);
    } finally {
        setButtonBusy(button, false);
    }
}

async function payVendor(event) {
    event?.preventDefault();
    const vendorName = byId("vendor-name").value.trim();
    const upiId = byId("vendor-upi").value.trim();
    const amount = Number(byId("vendor-amount").value);

    if (!vendorName || !Number.isFinite(amount) || amount <= 0) {
        return showToast("Enter a vendor name and valid amount.", true);
    }

    if (!lastAccount || lastAccount.profile.balance < amount) {
        return showToast(`Insufficient balance. Your current balance is ${formatMoney(lastAccount?.profile?.balance)}.`, true);
    }

    byId("confirm-vendor").textContent = vendorName;
    byId("confirm-amount").textContent = formatMoney(amount);
    showConfirmModal(true);
}

async function executeVendorPayment(vendorName, amount, upiId = null) {
    const button = byId("confirm-pay-btn");
    setButtonBusy(button, true, "Processing…");
    try {
        const data = await api("/vendor/pay", {
            method: "POST",
            body: JSON.stringify({
                vendor_name: vendorName,
                upi_id: upiId || null,
                amount,
            }),
        });
        byId("vendor-form").reset();
        showToast(data.message || "Wallet payment recorded.");
        await loadDashboard(true);
        showPage("dashboard");
    } catch (error) {
        showToast(apiErrorMessage(error), true);
    } finally {
        setButtonBusy(button, false);
    }
}

async function handleConfirmPay() {
    const vendorName = byId("vendor-name").value.trim();
    const upiId = byId("vendor-upi").value.trim();
    const amount = Number(byId("vendor-amount").value);

    showConfirmModal(false);
    await executeVendorPayment(vendorName, amount, upiId);
}

async function loadRecentVendors() {
    const container = byId("recent-vendors-list");
    try {
        const vendors = await api("/vendors/recent");
        container.replaceChildren();
        if (!vendors.length) {
            container.innerHTML = '<p class="empty-text">No recent vendors found.</p>';
            return;
        }
        vendors.forEach((name) => {
            const chip = document.createElement("button");
            chip.className = "vendor-chip";
            chip.textContent = name;
            chip.onclick = () => {
                byId("vendor-name").value = name;
                byId("vendor-amount").focus();
            };
            container.appendChild(chip);
        });
    } catch (error) {
        console.error("Failed to load recent vendors:", error);
    }
}

function showConfirmModal(show) {
    byId("confirm-modal").classList.toggle("hidden", !show);
}

function showPage(page) {
    document.querySelectorAll(".page").forEach((section) => {
        section.classList.toggle("active", section.id === `page-${page}`);
    });
    if (page === "vendor") void loadRecentVendors();

    document.querySelectorAll(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.page === page));
    if (page === "history" && lastAccount) renderTransactions(byId("history-transactions"), lastAccount.transactions || []);
}

function setVoiceBubble(text, visible = true) {
    byId("voice-status").textContent = text;
    byId("voice-bubble").classList.toggle("visible", visible);
}

function speak(text) {
    return new Promise((resolve) => {
        if (!window.speechSynthesis || !text) return resolve();
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis.getVoices();
        
        // Map currentLang to a voice. Default to English if not found.
        const langMap = {
            en: "en-US",
            hi: "hi-IN",
            ta: "ta-IN",
            te: "te-IN",
            bn: "bn-IN",
            mr: "mr-IN",
            gu: "gu-IN",
            kn: "kn-IN",
            ml: "ml-IN"
        };
        const targetLang = langMap[currentLang] || "en-US";
        utterance.voice = voices.find((voice) => voice.lang.startsWith(targetLang)) || voices.find((voice) => voice.lang.startsWith(currentLang)) || null;
        
        utterance.rate = 0.95;
        utterance.onend = resolve;
        utterance.onerror = resolve;
        window.speechSynthesis.speak(utterance);
    });
}

function captureVoiceOnce() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return Promise.reject(new Error("Voice recognition is not supported in this browser. Try Chrome."));
    return new Promise((resolve, reject) => {
        const recognition = new Recognition();
        let settled = false;
        
        // Map currentLang to SpeechRecognition lang code
        const langMap = {
            en: "en-IN",
            hi: "hi-IN",
            ta: "ta-IN",
            te: "te-IN",
            bn: "bn-IN",
            mr: "mr-IN",
            gu: "gu-IN",
            kn: "kn-IN",
            ml: "ml-IN"
        };
        recognition.lang = langMap[currentLang] || "en-IN";
        
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognition.onresult = (event) => {
            settled = true;
            resolve(event.results[0][0].transcript);
        };
        recognition.onerror = (event) => {
            if (!settled) reject(new Error(`Voice input failed: ${event.error}`));
        };
        recognition.onend = () => {
            if (!settled) reject(new Error("I did not hear anything. Please try again."));
        };
        recognition.start();
    });
}

async function startVoiceAssistant() {
    const button = byId("ai-voice-btn");
    setButtonBusy(button, true, "Listening…");
    try {
        setVoiceBubble("EasyPay AI is ready — tell me what you need.");
        await speak("Hello. You can ask for a wallet recharge, a vendor payment, or financial guidance. What would you like to do?");
        setVoiceBubble("Listening…");
        const transcript = await captureVoiceOnce();
        setVoiceBubble(`Heard: ${transcript}`);
        await submitAiPrompt(transcript, true);
        window.setTimeout(() => setVoiceBubble("", false), 2500);
    } catch (error) {
        const message = apiErrorMessage(error);
        setVoiceBubble(message);
        showToast(message, true);
        window.setTimeout(() => setVoiceBubble("", false), 3500);
    } finally {
        setButtonBusy(button, false);
    }
}

document.addEventListener("DOMContentLoaded", initialize);
