import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

type Language = 'ar' | 'en';
type Direction = 'rtl' | 'ltr';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  dir: Direction;
}

const translations = {
  ar: {
    // App
    app_name: "مهنتي لي",

    // Login & Register
    login_title: "تسجيل الدخول",
    login_subtitle: "مرحباً بك مجدداً",
    email_label: "البريد الإلكتروني",
    password_label: "كلمة المرور",
    login_button: "دخول",
    create_new_account: "إنشاء حساب جديد",
    forgot_password: "نسيت كلمة المرور؟",
    email_placeholder: "name@example.com",
    logging_in: "جاري تسجيل الدخول...",
    
    // Register Flow
    register_title: "إنشاء حساب جديد",
    register_subtitle: "أكمل بياناتك",
    register_choose_type: "اختر نوع الحساب للمتابعة:",
    register_individual_title: "تسجيل دخول فردي",
    register_individual_desc: "حساب شخصي للمستخدمين",
    register_commercial_title: "تسجيل دخول تجاري",
    register_commercial_desc: "حساب تجاري للشركات",
    register_name_placeholder: "اسمك الكامل",
    register_company_name_placeholder: "اسم الشركة",
    confirm_password: "تأكيد كلمة المرور",
    i_agree_to: "أوافق على",
    privacy_policy_link: "سياسة الخصوصية",
    register_button: "إنشاء حساب",
    registering: "جاري الإنشاء...",
    back: "عودة",

    // Navigation
    nav_home: "الرئيسية",
    nav_jobs: "وظائف",
    nav_shorts: "شورتس",
    nav_haraj: "حراج",
    
    // Actions
    like: "أعجبني",
    liked: "أعجبني",
    comment: "تعليق",
    share: "مشاركة",
    follow: "متابعة",
    unfollow: "إلغاء المتابعة",
    following: "تتابعه",
    reply: "رد",
    delete: "حذف",
    edit: "تعديل",
    report: "إبلاغ",
    copy: "نسخ",
    copy_link: "نسخ الرابط",
    copy_text: "نسخ النص",
    download: "تنزيل",
    repost: "إعادة نشر",
    undo_repost: "إلغاء المشاركة",
    cancel: "إلغاء",
    confirm: "تأكيد",
    view_replies: "عرض الردود",
    hide_replies: "إخفاء الردود",
    send: "إرسال",
    view_all: "عرض الكل",
    views: "مشاهدة",
    follow_back: "رد المتابعة",
    mark_all_read: "تحديد الكل كمقروء",
    repost_no_comment_confirm: "هل تريد إعادة النشر بدون كتابة أي تعليق؟",
    repost_success: "تمت إعادة النشر بنجاح!",
    repost_fail: "فشل إعادة النشر",
    repost_error: "حدث خطأ أثناء إعادة النشر",
    
    // Translation
    translate_post: "ترجمة المنشور",
    show_original: "عرض الأصل",
    translating: "جاري الترجمة...",
    translation_settings: "إعدادات الترجمة",
    source_lang: "من (لغة المنشور)",
    target_lang: "إلى (لغة الترجمة)",
    lang_ar: "العربية",
    lang_en: "English",
    lang_bn: "বাংলা",
    lang_ur: "اردو",
    lang_ne: "नेपाली",
    lang_hi: "हिन्दी",
    lang_sw: "Kiswahili",
    lang_am: "አማርኛ",
    lang_so: "Soomaali",
    lang_tr: "Türkçe",
    lang_ti: "ትግርኛ",
    save: "حفظ",
    
    // Stories
    create_story: "إنشاء قصة",
    your_story: "قصتك",
    story_viewers: "المشاهدات",
    story_limit_title: "عذراً يا غالي",
    story_limit_desc: "لقد قمت بإضافة قصة بالفعل.\nحالياً النظام يسمح بقصة واحدة نشطة لكل مستخدم (حتى مدة دقيقتين) للحفاظ على جودة الخدمة.",
    story_limit_hint: "سيتم تطوير الميزة لإتاحة المزيد قريباً!",
    story_no_viewers: "لا توجد مشاهدات بعد",
    story_text_placeholder: "انقر للكتابة...",
    story_media_placeholder: "اضغط لاختيار صورة أو فيديو",
    story_font_size: "حجم",
    story_type_text: "نص",
    story_type_media: "ميديا",
    story_upload_fail: "فشل نشر القصة",
    story_upload_error: "حدث خطأ أثناء النشر",
    
    // Suggestions
    suggested_companies: "شركات مقترحة",
    suggested_people: "أشخاص قد تعرفهم",
    
    // Posts & Feed
    post_header_create: "بم تفكر يا",
    post_placeholder: "اكتب شيئاً...",
    reply_placeholder: "اكتب رداً...",
    replying_to: "الرد على",
    post_publish: "نشر",
    post_next: "التالي",
    post_location: "الموقع",
    post_category: "التصنيف",
    post_media: "صور/فيديو",
    post_settings: "إعدادات المنشور",
    post_premium: "مُميز",
    post_delete_confirm: "هل أنت متأكد من رغبتك في حذف هذا المنشور؟",
    post_hide: "إخفاء المنشور",
    post_report_success: "تم إرسال البلاغ للإدارة",
    no_posts_home: "لا توجد منشورات حالياً",
    be_first_post: "كن أول من ينشر!",
    no_more_posts: "لا توجد منشورات أخرى",
    post_add_to: "إضافة إلى منشورك",
    no_comments: "لا توجد تعليقات",
    no_replies: "لا توجد ردود",
    post_details_title: "تفاصيل المنشور",
    
    // Shorts
    shorts_for_you: "لك",
    shorts_haraj: "حراج",
    shorts_jobs: "وظائف",
    shorts_empty: "لا توجد فيديوهات قصيرة حالياً",
    
    // Profile
    profile_posts: "منشور",
    profile_followers: "متابع",
    profile_following: "يتابع",
    profile_about: "حول",
    profile_photos: "الصور",
    profile_videos: "فيديو",
    profile_edit: "تعديل الملف",
    profile_bio: "نبذة",
    profile_name: "الاسم",
    profile_phone: "الهاتف",
    profile_website: "الموقع الإلكتروني",
    profile_no_posts: "لا توجد منشورات حتى الآن",
    add_new_section: "إضافة قسم جديد",
    section_title_label: "عنوان القسم",
    section_content_label: "محتوى القسم",
    add_bio: "أضف نبذة تعريفية",
    edit_field_title: "تعديل",
    
    // Settings
    settings_title: "الإعدادات",
    settings_subscriptions: "الاشتراكات",
    settings_language: "اللغة",
    settings_dark_mode: "الوضع الليلي",
    settings_warnings: "التحذيرات",
    warning_strict_desc: "تحذيرات أمنية مشددة: سلامتك هي أولويتنا القصوى. لحماية نفسك من عمليات الاحتيال، نرجو منك الالتزام الصارم بالتعليمات التالية:\n\n1. **لا تشارك معلوماتك الشخصية أبداً:** لا تقم بمشاركة رقم الهوية، عنوان المنزل، تاريخ الميلاد، أو أي وثائق رسمية.\n\n2. **لا تشارك معلوماتك المالية:** لا ترسل أبداً معلومات حسابك البنكي، أرقام بطاقات الائتمان، أو أي كلمات مرور مالية. أي طلب لهذه المعلومات هو محاولة احتيال مؤكدة.\n\n3. **احذر من الدفع المسبق:** لا تقم بتحويل أي أموال كـ 'رسوم تأمين' أو 'عربون' خارج المنصة. تعاملاتك المالية يجب أن تتم وجهاً لوجه أو عبر قنوات آمنة عند استلام الخدمة/السلعة.\n\n4. **تحقق من الروابط الخارجية:** لا تضغط على أي روابط يتم إرسالها لك في المحادثات الخاصة، خاصة روابط الدفع أو تتبع الشحنات. قد تكون روابط تصيد لسرقة بياناتك.\n\n**إخلاء مسؤولية:** تطبيق 'مهنتي لي' هو منصة للتواصل فقط، وهو غير مسؤول عن أي اتفاقيات أو معاملات مالية تتم بين المستخدمين خارج إطار التطبيق. كن حذراً وقم بالإبلاغ عن أي مستخدم مشبوه فوراً.",
    settings_privacy: "سياسة الخصوصية",
    settings_report: "الإبلاغ عن مشكلة",
    settings_about: "حول التطبيق",
    settings_warning_notifs: "إشعارات التحذيرات",
    settings_control_panel: "قائمة التحكم",
    
    // Wallet
    wallet_balance: "الرصيد الحالي",
    wallet_currency: "عملة",
    wallet_buy: "شراء عملات",
    wallet_gold: "عملة ذهبية",
    
    // Notifications
    notif_like_post: "أعجب بمنشورك",
    notif_comment_post: "علق على منشورك",
    notif_reply_post: "رد على تعليقك",
    notif_follow: "بدأ في متابعتك",
    notif_like_short: "أعجب بالفيديو الخاص بك",
    notif_comment_short: "علق على الفيديو الخاص بك",
    notif_empty: "لا توجد إشعارات حالياً",
    notif_general: "إشعار جديد",
    notif_menu_delete: "حذف الإشعار",
    notif_menu_read: "وضع كمقروء",
    notif_delete_title: "حذف الإشعار؟",
    notif_delete_msg: "هل أنت متأكد من رغبتك في حذف هذا الإشعار؟",
    
    // General
    close: "إغلاق",
    understood: "فهمت ذلك",
    submit: "إرسال",
    sending: "جاري الإرسال...",
    // back: "عودة", // Duplicated removed
    logout: "تسجيل الخروج",
    logout_confirm: "هل أنت متأكد من رغبتك في تسجيل الخروج؟",
    yes: "نعم",
    no: "لا",
    loading: "جاري التحميل...",
    location_general: "عام",
    location_all_cities: "كل المدن",
    all_cities: "كل المدن",
    location_select_country: "اختر الدولة",
    location_select_city: "اختر المدينة",
    location_select_city_opt: "اختر المدينة (اختياري)",
    location_cities_in: "مدن",
    
    // Registration (Updated)
    // Keys already present above, keeping consistent
    
    // Report Modal
    report_post_title: "الإبلاغ عن المنشور",
    report_comment_title: "الإبلاغ عن التعليق",
    report_reply_title: "الإبلاغ عن الرد",
    report_video_title: "الإبلاغ عن الفيديو",
    report_problem_title: "الإبلاغ عن مشكلة",
    report_content_owner: "صاحب المحتوى",
    report_hint: "ساعدنا في الحفاظ على مجتمع آمن. يرجى وصف المشكلة بدقة وسيتم مراجعة البلاغ من قبل الإدارة.",
    report_reason_label: "سبب الإبلاغ",
    report_placeholder_detail: "اكتب تفاصيل المشكلة هنا...",
    report_submit_button: "إرسال البلاغ",
    
    // Report (Settings)
    report_desc: "يرجى وصف المشكلة التي تواجهها بالتفصيل.",
    report_placeholder: "اكتب هنا...",
    report_success: "تم إرسال بلاغك بنجاح.",
    
    // Warning Modal
    warning_empty_title: "لا توجد تحذيرات حاليا",
    warning_empty_desc: "سجلك نظيف تماماً.",
    
    // About
    about_desc: "مهنتي لي هي منصة اجتماعية احترافية تهدف إلى ربط المجتمعات العربية بشكل آمن وفعال. نحن ملتزمون بتوفير بيئة موثوقة لجميع مستخدمينا مع الحفاظ على خصوصيتهم.",
    about_version: "إصدار توافق المتاجر 1.0.0",
    
    // Privacy
    privacy_title: "التزامنا بحماية بياناتك",
    privacy_desc: "1. **لا نجمع بياناتك الشخصية:** نحن نؤمن بأن خصوصيتك حق أساسي. تطبيق 'مهنتي لي' مصمم على أساس عدم جمع أو تخزين أي معلومات شخصية تعريفية عنك. نحن لا نتبع نشاطك، لا نبيع بياناتك، ولا نشاركها مع أي طرف ثالث على الإطلاق.\n\n2. **ما الذي نعنيه بـ 'عدم الجمع'؟** هذا يعني أننا لا نسجل محادثاتك الخاصة، لا نحلل اهتماماتك لبيعها للمعلنين، ولا نجمع بيانات موقعك في الخلفية. المعلومات التي تخزن لدينا هي فقط بيانات حسابك الأساسية (الاسم، البريد الإلكتروني المشفر، وكلمة المرور المشفرة) اللازمة لتسجيل دخولك.\n\n3. **مسؤولية المستخدم:** المحتوى الذي تقوم بنشره بشكل عام (المنشورات، التعليقات، الفيديوهات) يكون متاحاً للآخرين حسب نطاق النشر الذي تحدده. كن حذراً بشأن المعلومات التي تشاركها في منشوراتك العامة.\n\n4. **آلية الإبلاغ:** لضمان بيئة آمنة، نعتمد على مجتمعنا. إذا لم يرد عليك صاحب عمل أو منشور بعد فترة معقولة، أو إذا لاحظت أي سلوك مشبوه أو احتيالي، يرجى استخدام خيار 'الإبلاغ' فوراً. فريقنا سيقوم بمراجعة الحساب واتخاذ الإجراءات اللازمة.\n\n5. **أمان الحساب:** يتم تشفير كلمة المرور الخاصة بك وتخزينها بشكل آمن. لا يمكن لأي شخص، بما في ذلك فريقنا، الاطلاع عليها. نوصي باستخدام كلمة مرور قوية وفريدة.\n\n6. **خصوصية الأطفال:** منصتنا مخصصة للمستخدمين فوق سن 18 عاماً. نحن لا نجمع بيانات من الأطفال عن قصد.\n\n7. **تحديثات السياسة:** قد نقوم بتحديث سياسة الخصوصية هذه من وقت لآخر. سيتم إعلامك بأي تغييرات جوهرية. استمرارك في استخدام التطبيق يعني موافقتك على السياسة المحدثة.",

    // Jobs View
    jobs_employer: "أبحث عن موظفين",
    jobs_seeker: "أبحث عن وظيفة",
    jobs_subtitle: "ابحث عن عمل أو موظفين",
    jobs_empty: "لا توجد وظائف حالياً",
    be_first_to_post: "كن أول من ينشر منشور في",

    // New Translations for Job Creation & Create Post
    job_type_title: "نوع الإعلان",
    job_type_hiring: "أبحث عن موظفين",
    job_type_seeking: "أبحث عن عمل",
    scope_visibility: "نطاق الظهور",
    scope_home_category: "الرئيسية والقسم",
    scope_home_desc: "يظهر للجميع (موصى به)",
    scope_category_only: "القسم فقط",
    scope_category_desc: "يظهر للمهتمين فقط",
    scope_label: "نطاق النشر",
    scope_global: "عالمي",
    scope_local: "محلي",
    visibility_public: "عام",
    contact_info_title: "معلومات التواصل",
    contact_phone_placeholder: "رقم الهاتف (اختياري)",
    contact_email_placeholder: "البريد الإلكتروني (اختياري)",
    contact_method_whatsapp: "واتساب",
    contact_method_call: "اتصال",
    contact_method_email: "بريد",
    premium_subtitle: "ظهور أعلى وأكثر تميزاً",

    // Haraj View
    haraj_latest_offers: "أحدث العروض المضافة",
    haraj_subtitle: "بيع وشراء بكل سهولة",
    haraj_empty: "لا توجد عروض حالياً",
    end_of_results: "نهاية النتائج في",

    // Haraj Categories
    "سيارات": "سيارات",
    "عقارات": "عقارات",
    "أجهزة منزلية": "أجهزة منزلية",
    "أثاث ومفروشات": "أثاث ومفروشات",
    "جوالات": "جوالات",
    "لابتوبات وكمبيوتر": "لابتوبات وكمبيوتر",
    "كاميرات وتصوير": "كاميرات وتصوير",
    "ألعاب فيديو": "ألعاب فيديو",
    "ملابس وموضة": "ملابس وموضة",
    "ساعات ومجوهرات": "ساعات ومجوهرات",
    "حيوانات أليفة": "حيوانات أليفة",
    "طيور": "طيور",
    "معدات ثقيلة": "معدات ثقيلة",
    "قطع غيار": "قطع غيار",
    "تحف ومقتنيات": "تحف ومقتنيات",
    "كتب ومجلات": "كتب ومجلات",
    "أدوات رياضية": "أدوات رياضية",
    "مستلزمات أطفال": "مستلزمات أطفال",
    "خيم وتخييم": "خيم وتخييم",
    "أرقام مميزة": "أرقام مميزة",
    "نقل عفش": "نقل عفش",

    // Job Categories
    "سائق خاص": "سائق خاص",
    "حارس أمن": "حارس أمن",
    "طباخ": "طباخ",
    "محاسب": "محاسب",
    "مهندس مدني": "مهندس مدني",
    "طبيب/ممرض": "طبيب/ممرض",
    "نجار": "نجار",
    "كاتب محتوى": "كاتب محتوى",
    "كهربائي": "كهربائي",
    "ميكانيكي": "ميكانيكي",
    "بائع / كاشير": "بائع / كاشير",
    "مبرمج": "مبرمج",
    "مصمم جرافيك": "مصمم جرافيك",
    "مترجم": "مترجم",
    "مدرس خصوصي": "مدرس خصوصي",
    "مدير مشاريع": "مدير مشاريع",
    "خدمة عملاء": "خدمة عملاء",
    "مقدم طعام": "مقدم طعام",
    "توصيل": "توصيل",
    "حلاق / خياط": "حلاق / خياط",
    "مزارع": "مزارع",
  },
  en: {
    // App
    app_name: "MyJob",

    // Login & Register
    login_title: "Login",
    login_subtitle: "Welcome back",
    email_label: "Email",
    password_label: "Password",
    login_button: "Login",
    create_new_account: "Create new account",
    forgot_password: "Forgot password?",
    email_placeholder: "name@example.com",
    logging_in: "Logging in...",

    // Register Flow
    register_title: "Create New Account",
    register_subtitle: "Complete your data",
    register_choose_type: "Choose account type to continue:",
    register_individual_title: "Individual Account",
    register_individual_desc: "Personal account for users",
    register_commercial_title: "Commercial Account",
    register_commercial_desc: "Business account for companies",
    register_name_placeholder: "Full Name",
    register_company_name_placeholder: "Company Name",
    confirm_password: "Confirm Password",
    i_agree_to: "I agree to",
    privacy_policy_link: "Privacy Policy",
    register_button: "Register",
    registering: "Registering...",
    back: "Back",

    // Navigation
    nav_home: "Home",
    nav_jobs: "Jobs",
    nav_shorts: "Shorts",
    nav_haraj: "Marketplace",
    
    // Actions
    like: "Like",
    liked: "Liked",
    comment: "Comment",
    share: "Share",
    follow: "Follow",
    unfollow: "Unfollow",
    following: "Following",
    reply: "Reply",
    delete: "Delete",
    edit: "Edit",
    report: "Report",
    copy: "Copy",
    copy_link: "Copy Link",
    copy_text: "Copy Text",
    download: "Download",
    repost: "Repost",
    undo_repost: "Undo Repost",
    cancel: "Cancel",
    confirm: "Confirm",
    view_replies: "View Replies",
    hide_replies: "Hide Replies",
    send: "Send",
    view_all: "View All",
    views: "Views",
    follow_back: "Follow Back",
    mark_all_read: "Mark all as read",
    repost_no_comment_confirm: "Do you want to repost without a comment?",
    repost_success: "Reposted successfully!",
    repost_fail: "Repost failed",
    repost_error: "An error occurred while reposting",
    
    // Translation
    translate_post: "Translate Post",
    show_original: "Show Original",
    translating: "Translating...",
    translation_settings: "Translation Settings",
    source_lang: "From (Post Language)",
    target_lang: "To (Target Language)",
    lang_ar: "العربية",
    lang_en: "English",
    lang_bn: "বাংলা",
    lang_ur: "اردو",
    lang_ne: "नेपाली",
    lang_hi: "हिन्दी",
    lang_sw: "Kiswahili",
    lang_am: "አማርኛ",
    lang_so: "Soomaali",
    lang_tr: "Türkçe",
    lang_ti: "ትግርኛ",
    save: "Save",
    
    // Stories
    create_story: "Create Story",
    your_story: "Your Story",
    story_viewers: "Viewers",
    story_limit_title: "Sorry Dear",
    story_limit_desc: "You have already added a story.\nCurrently, the system allows one active story per user (up to 2 minutes) to maintain service quality.",
    story_limit_hint: "This feature will be improved to allow more soon!",
    story_no_viewers: "No views yet",
    story_text_placeholder: "Tap to type...",
    story_media_placeholder: "Tap to select photo or video",
    story_font_size: "Size",
    story_type_text: "Text",
    story_type_media: "Media",
    story_upload_fail: "Failed to post story",
    story_upload_error: "Error occurred while posting",
    
    // Suggestions
    suggested_companies: "Suggested Companies",
    suggested_people: "People You May Know",
    
    // Posts & Feed
    post_header_create: "What's on your mind,",
    post_placeholder: "Type something...",
    reply_placeholder: "Write a reply...",
    replying_to: "Replying to",
    post_publish: "Post",
    post_next: "Next",
    post_location: "Location",
    post_category: "Category",
    post_media: "Photo/Video",
    post_settings: "Post Details",
    post_premium: "Premium",
    post_delete_confirm: "Are you sure you want to delete this post?",
    post_hide: "Hide Post",
    post_report_success: "Report sent to administration",
    no_posts_home: "No posts right now",
    be_first_post: "Be the first to post!",
    no_more_posts: "No more posts",
    post_add_to: "Add to your post",
    no_comments: "No comments",
    no_replies: "No replies",
    post_details_title: "Post Details",
    
    // Shorts
    shorts_for_you: "For You",
    shorts_haraj: "Haraj",
    shorts_jobs: "Jobs",
    shorts_empty: "No shorts available right now",
    
    // Profile
    profile_posts: "Posts",
    profile_followers: "Followers",
    profile_following: "Following",
    profile_about: "About",
    profile_photos: "Photos",
    profile_videos: "Videos",
    profile_edit: "Edit Profile",
    profile_bio: "Bio",
    profile_name: "Name",
    profile_phone: "Phone",
    profile_website: "Website",
    profile_no_posts: "No posts yet",
    add_new_section: "Add New Section",
    section_title_label: "Section Title",
    section_content_label: "Section Content",
    add_bio: "Add Bio",
    edit_field_title: "Edit",
    
    // Settings
    settings_title: "Settings",
    settings_subscriptions: "Subscriptions",
    settings_language: "Language",
    settings_dark_mode: "Dark Mode",
    settings_warnings: "Warnings",
    warning_strict_desc: "Strict Security Warnings: Your safety is our top priority. To protect yourself from scams, please adhere strictly to the following instructions:\n\n1. **Never Share Personal Information:** Do not share your ID number, home address, date of birth, or any official documents.\n\n2. **Never Share Financial Information:** Never send your bank account details, credit card numbers, or any financial passwords. Any request for this information is a confirmed scam attempt.\n\n3. **Beware of Advance Payments:** Do not transfer any money as 'insurance fees' or 'down payments' outside the platform. Your financial transactions should be conducted face-to-face or through secure channels upon receiving the service/product.\n\n4. **Verify External Links:** Do not click on any links sent to you in private conversations, especially payment or shipment tracking links. They could be phishing links to steal your data.\n\n**Disclaimer:** The 'MyJob' app is a communication platform only and is not responsible for any agreements or financial transactions that occur between users outside the application's framework. Be cautious and report any suspicious user immediately.",
    settings_privacy: "Privacy Policy",
    settings_report: "Report a Problem",
    settings_about: "About App",
    settings_warning_notifs: "Warning Notifications",
    settings_control_panel: "Control Panel",
    
    // Wallet
    wallet_balance: "Current Balance",
    wallet_currency: "Coins",
    wallet_buy: "Buy Coins",
    wallet_gold: "Gold Coin",
    
    // Notifications
    notif_like_post: "liked your post",
    notif_comment_post: "commented on your post",
    notif_reply_post: "replied to your comment",
    notif_follow: "started following you",
    notif_like_short: "liked your video",
    notif_comment_short: "commented on your video",
    notif_empty: "No notifications yet",
    notif_general: "New notification",
    notif_menu_delete: "Delete Notification",
    notif_menu_read: "Mark as read",
    notif_delete_title: "Delete Notification?",
    notif_delete_msg: "Are you sure you want to delete this notification?",
    
    // General
    close: "Close",
    understood: "Understood",
    submit: "Submit",
    sending: "Sending...",
    logout: "Logout",
    logout_confirm: "Are you sure you want to logout?",
    yes: "Yes",
    no: "No",
    loading: "Loading...",
    location_general: "General",
    location_all_cities: "All Cities",
    all_cities: "All Cities",
    location_select_country: "Select Country",
    location_select_city: "Select City",
    location_select_city_opt: "Select City (Optional)",
    location_cities_in: "Cities in",
    
    // Registration
    // Keys populated above
    
    // Report Modal
    report_post_title: "Report Post",
    report_comment_title: "Report Comment",
    report_reply_title: "Report Reply",
    report_video_title: "Report Video",
    report_problem_title: "Report Problem",
    report_content_owner: "Content Owner",
    report_hint: "Help us keep the community safe. Please describe the issue accurately and it will be reviewed by administration.",
    report_reason_label: "Reason for reporting",
    report_placeholder_detail: "Write details here...",
    report_submit_button: "Submit Report",
    
    // Report (Settings)
    report_desc: "Please describe the issue you are facing in detail.",
    report_placeholder: "Type here...",
    report_success: "Report sent successfully.",
    
    // Warning Modal
    warning_empty_title: "No warnings currently",
    warning_empty_desc: "Your record is perfectly clean.",
    
    // About
    about_desc: "MyJob is a professional social platform aimed at connecting Arab communities safely and effectively. We are committed to providing a reliable environment for all our users while maintaining their privacy.",
    about_version: "Store Compatible Version 1.0.0",
    
    // Privacy
    privacy_title: "Commitment to Privacy",
    privacy_desc: "1. **We Do Not Collect Your Personal Data:** We believe that your privacy is a fundamental right. The 'MyJob' app is designed on the principle of not collecting or storing any personally identifiable information about you. We do not track your activity, sell your data, or share it with any third party whatsoever.\n\n2. **What Do We Mean by 'No Collection'?** This means we do not record your private conversations, analyze your interests to sell to advertisers, or collect your background location data. The only information we store is your basic account data (name, encrypted email, and encrypted password) necessary for you to log in.\n\n3. **User Responsibility:** The content you post publicly (posts, comments, videos) is available to others according to the scope you set. Be cautious about the information you share in your public posts.\n\n4. **Reporting Mechanism:** To ensure a safe environment, we rely on our community. If a job poster or user does not respond to you after a reasonable time, or if you notice any suspicious or fraudulent behavior, please use the 'Report' option immediately. Our team will review the account and take necessary action.\n\n5. **Account Security:** Your password is encrypted and stored securely. No one, including our team, can view it. We recommend using a strong and unique password.\n\n6. **Children's Privacy:** Our platform is intended for users over the age of 18. We do not knowingly collect data from children.\n\n7. **Policy Updates:** We may update this Privacy Policy from time to time. You will be notified of any material changes. Your continued use of the app signifies your agreement to the updated policy.",

    // Jobs View
    jobs_employer: "Hiring",
    jobs_seeker: "Looking for a Job",
    jobs_subtitle: "Find work or employees",
    jobs_empty: "No jobs available right now",
    be_first_to_post: "Be the first to post in",

    // New Translations for Job Creation
    job_type_title: "Ad Type",
    job_type_hiring: "Hiring",
    job_type_seeking: "Seeking Job",
    scope_visibility: "Visibility",
    scope_home_category: "Home & Category",
    scope_home_desc: "Visible to everyone (Recommended)",
    scope_category_only: "Category Only",
    scope_category_desc: "Visible to interested users only",
    scope_label: "Scope",
    scope_global: "Global",
    scope_local: "Local",
    visibility_public: "Public",
    contact_info_title: "Contact Info",
    contact_phone_placeholder: "Phone (Optional)",
    contact_email_placeholder: "Email (Optional)",
    contact_method_whatsapp: "Whatsapp",
    contact_method_call: "Call",
    contact_method_email: "Email",
    premium_subtitle: "Higher visibility",

    // Haraj View
    haraj_latest_offers: "Latest offers added",
    haraj_subtitle: "Buy and sell easily",
    haraj_empty: "No offers available right now",
    end_of_results: "End of results in",

    // Haraj Categories
    "سيارات": "Cars",
    "عقارات": "Real Estate",
    "أجهزة منزلية": "Home Appliances",
    "أثاث ومفروشات": "Furniture",
    "جوالات": "Mobiles",
    "لابتوبات وكمبيوتر": "Laptops & PC",
    "كاميرات وتصوير": "Cameras",
    "ألعاب فيديو": "Video Games",
    "ملابس وموضة": "Fashion",
    "ساعات ومجوهرات": "Watches & Jewelry",
    "حيوانات أليفة": "Pets",
    "طيور": "Birds",
    "معدات ثقيلة": "Heavy Equipment",
    "قطع غيار": "Spare Parts",
    "تحف ومقتنيات": "Antiques",
    "كتب ومجلات": "Books",
    "أدوات رياضية": "Sports Equipment",
    "مستلزمات أطفال": "Baby Items",
    "خيم وتخييم": "Camping",
    "أرقام مميزة": "VIP Numbers",
    "نقل عفش": "Furniture Moving",

    // Job Categories
    "سائق خاص": "Private Driver",
    "حارس أمن": "Security Guard",
    "طباخ": "Chef",
    "محاسب": "Accountant",
    "مهندس مدني": "Civil Engineer",
    "طبيب/ممرض": "Doctor/Nurse",
    "نجار": "Carpenter",
    "كاتب محتوى": "Content Writer",
    "كهربائي": "Electrician",
    "ميكانيكي": "Mechanic",
    "بائع / كاشير": "Sales / Cashier",
    "مبرمج": "Developer",
    "مصمم جرافيك": "Graphic Designer",
    "مترجم": "Translator",
    "مدرس خصوصي": "Tutor",
    "مدير مشاريع": "Project Manager",
    "خدمة عملاء": "Customer Service",
    "مقدم طعام": "Waiter",
    "توصيل": "Delivery",
    "حلاق / خياط": "Barber / Tailor",
    "مزارع": "Farmer",
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    // Safer initialization
    if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem('app_language');
        if (stored === 'en' || stored === 'ar') {
            return stored as Language;
        }
    }
    return 'ar'; // Default fallback
  });

  const t = (key: string): string => {
    // @ts-ignore
    return translations[language][key] || key;
  };

  const dir: Direction = language === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    // Ensure persistence on change
    localStorage.setItem('app_language', language);
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
  }, [language, dir]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
