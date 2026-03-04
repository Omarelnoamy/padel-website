export interface Translations {
  // Navigation
  home: string;
  bookCourt: string;
  coaching: string;
  tournaments: string;
  admin: string;

  // Landing Page
  heroTitle: string;
  heroSubtitle: string;
  heroDescription: string;
  bookCoach: string;
  joinTournament: string;
  aboutUs: string;
  aboutDescription: string;
  easyBooking: string;
  easyBookingDesc: string;
  expertCoaching: string;
  expertCoachingDesc: string;
  tournamentTitle: string;
  tournamentDesc: string;
  contactInfo: string;
  connectWithUs: string;
  whatsApp: string;
  followUs: string;
  rightsReserved: string;

  // Booking Page
  bookYourCourt: string;
  selectPreferred: string;
  selectDate: string;
  availableTimes: string;
  courtSelection: string;
  available: string;
  booked: string;
  legend: string;
  bookingSummary: string;
  date: string;
  time: string;
  duration: string;
  price: string;
  confirmBooking: string;
  premiumGlass: string;
  standardCourt: string;
  selectLocation: string;
  choosePreferredLocation: string;
  courts: string;
  facilities: string;
  backToLocations: string;
  selectedDate: string;
  today: string;
  tomorrow: string;
  location: string;
  court: string;
  totalPrice: string;

  // Coaching Page
  professionalCoaching: string;
  coachingDescription: string;
  achievements: string;
  availability: string;
  bookSession: string;
  allLevels: string;
  beginnerIntermediate: string;
  intermediateAdvanced: string;
  experience: string;
  whyChooseCoaching: string;
  certifiedProfessionals: string;
  certifiedDesc: string;
  personalizedTraining: string;
  personalizedDesc: string;
  flexibleScheduling: string;
  flexibleDesc: string;

  // Tournaments Page
  summerTournament: string;
  registerNow: string;
  upcomingTournaments: string;
  featured: string;
  registrationOpen: string;
  comingSoon: string;
  participants: string;
  prizePool: string;
  level: string;
  entryFee: string;
  full: string;
  tournamentBracket: string;
  bracketPreview: string;
  liveBracket: string;
  match: string;
  bracketUpdated: string;
  tournamentRules: string;
  generalRules: string;
  whatsIncluded: string;

  // Admin Dashboard
  adminDashboard: string;
  manageBookings: string;
  totalBookings: string;
  confirmed: string;
  pending: string;
  revenue: string;
  fromConfirmed: string;
  recentBookings: string;
  filterByStatus: string;
  allStatuses: string;
  cancelled: string;
  player: string;
  type: string;
  status: string;
  amount: string;
  actions: string;
  confirm: string;
  cancel: string;
  view: string;
  courtManagement: string;
  viewCourtSchedule: string;
  maintenanceSchedule: string;
  blockTimeSlots: string;
  reports: string;
  dailyRevenue: string;
  monthlyAnalytics: string;
  customerReport: string;
  systemSettings: string;
  pricingSettings: string;
  staffManagement: string;
  notifications: string;

  // Common
  egp: string;
  hour: string;
  hours: string;
  years: string;
  perHour: string;
  requireAttention: string;
  ofTotal: string;
  fromLastWeek: string;
}

export const translations: Record<"en" | "ar", Translations> = {
  en: {
    // Navigation
    home: "Home",
    bookCourt: "Book Court",
    coaching: "Coaching",
    tournaments: "Tournaments",
    admin: "Admin",

    // Landing Page
    heroTitle: "Book Your Padel Court",
    heroSubtitle: "StarPoint Padel Club - Port Said",
    heroDescription:
      "Experience the ultimate padel experience with professional courts, expert coaching, and exciting tournaments",
    bookCoach: "Book Coach",
    joinTournament: "Join Tournament",
    aboutUs: "About StarPoint",
    aboutDescription:
      "Port Said's premier padel facility offering world-class courts, professional coaching, and an vibrant community for players of all levels.",
    easyBooking: "Easy Booking",
    easyBookingDesc:
      "Book your court in seconds with our intuitive online booking system. Choose your preferred time and court type.",
    expertCoaching: "Expert Coaching",
    expertCoachingDesc:
      "Learn from certified padel professionals who will help you improve your game and reach your full potential.",
    tournamentTitle: "Tournaments",
    tournamentDesc:
      "Join exciting tournaments and compete with players from across the region. All skill levels welcome.",
    contactInfo: "Contact Info",
    connectWithUs: "Connect With Us",
    whatsApp: "WhatsApp",
    followUs: "Follow us on social media for updates and events",
    rightsReserved: "© 2024 StarPoint Port Said. All rights reserved.",

    // Booking Page
    bookYourCourt: "Book Your Court",
    selectPreferred:
      "Select your preferred date and time to reserve a padel court",
    selectDate: "Select Date",
    availableTimes: "Available Times",
    courtSelection: "Court Selection",
    available: "Available",
    booked: "Booked",
    legend: "Legend:",
    bookingSummary: "Booking Summary",
    date: "Date",
    time: "Time",
    duration: "Duration",
    price: "Price",
    confirmBooking: "Confirm Booking",
    premiumGlass: "Premium Glass Court",
    standardCourt: "Standard Court",
    selectLocation: "Select Location",
    choosePreferredLocation:
      "Choose your preferred location to view available courts and times",
    courts: "Courts",
    facilities: "Facilities",
    backToLocations: "Back to Locations",
    selectedDate: "Selected Date",
    today: "Today",
    tomorrow: "Tomorrow",
    location: "Location",
    court: "Court",
    totalPrice: "Total Price",

    // Coaching Page
    professionalCoaching: "Professional Coaching",
    coachingDescription:
      "Learn from certified padel professionals and take your game to the next level. Our coaches offer personalized training for all skill levels.",
    achievements: "Achievements",
    availability: "Availability",
    bookSession: "Book Session",
    allLevels: "All Levels",
    beginnerIntermediate: "Beginner-Intermediate",
    intermediateAdvanced: "Intermediate-Advanced",
    experience: "experience",
    whyChooseCoaching: "Why Choose Our Coaching?",
    certifiedProfessionals: "Certified Professionals",
    certifiedDesc:
      "All our coaches are FIP certified with proven track records in competitive padel.",
    personalizedTraining: "Personalized Training",
    personalizedDesc:
      "Customized training programs tailored to your skill level and goals.",
    flexibleScheduling: "Flexible Scheduling",
    flexibleDesc:
      "Book sessions that fit your schedule with our flexible timing options.",

    // Tournaments Page
    summerTournament: "Summer Tournament",
    registerNow: "Register Now!",
    upcomingTournaments: "Upcoming Tournaments",
    featured: "Featured",
    registrationOpen: "Registration Open",
    comingSoon: "Coming Soon",
    participants: "participants",
    prizePool: "Prize Pool",
    level: "Level",
    entryFee: "entry fee",
    full: "full",
    tournamentBracket: "Tournament Bracket Preview",
    bracketPreview: "Summer Championship Bracket",
    liveBracket: "Live bracket updates during tournament",
    match: "Match",
    bracketUpdated:
      "Bracket will be updated in real-time during the tournament",
    tournamentRules: "Tournament Rules & Information",
    generalRules: "General Rules",
    whatsIncluded: "What's Included",

    // Admin Dashboard
    adminDashboard: "Admin Dashboard",
    manageBookings:
      "Manage bookings, view statistics, and monitor facility operations",
    totalBookings: "Total Bookings",
    confirmed: "Confirmed",
    pending: "Pending",
    revenue: "Revenue",
    fromConfirmed: "From confirmed bookings",
    recentBookings: "Recent Bookings",
    filterByStatus: "Filter by status",
    allStatuses: "All Statuses",
    cancelled: "Cancelled",
    player: "Player",
    type: "Type",
    status: "Status",
    amount: "Amount",
    actions: "Actions",
    confirm: "Confirm",
    cancel: "Cancel",
    view: "View",
    courtManagement: "Court Management",
    viewCourtSchedule: "View Court Schedule",
    maintenanceSchedule: "Maintenance Schedule",
    blockTimeSlots: "Block Time Slots",
    reports: "Reports",
    dailyRevenue: "Daily Revenue Report",
    monthlyAnalytics: "Monthly Analytics",
    customerReport: "Customer Report",
    systemSettings: "System Settings",
    pricingSettings: "Pricing Settings",
    staffManagement: "Staff Management",
    notifications: "Notifications",

    // Common
    egp: "EGP",
    hour: "hour",
    hours: "hours",
    years: "years",
    perHour: "/hour",
    requireAttention: "Require attention",
    ofTotal: "of total",
    fromLastWeek: "from last week",
  },

  ar: {
    // Navigation
    home: "الرئيسية",
    bookCourt: "حجز ملعب",
    coaching: "التدريب",
    tournaments: "البطولات",
    admin: "الإدارة",

    // Landing Page
    heroTitle: "احجز ملعب البادل ",
    heroSubtitle: "نادي ستاربوينت بادل - بورسعيد",
    heroDescription:
      "استمتع بتجربة البادل المثالية مع ملاعب احترافية وتدريب خبير وبطولات مثيرة",
    bookCoach: "حجز مدرب",
    joinTournament: "انضم للبطولة",
    aboutUs: "حول بادل برو",
    aboutDescription:
      "منشأة البادل الرائدة في بورسعيد التي تقدم ملاعب عالمية المستوى وتدريب احترافي ومجتمع نشط للاعبين من جميع المستويات.",
    easyBooking: "حجز سهل",
    easyBookingDesc:
      "احجز ملعبك في ثوانٍ مع نظام الحجز الإلكتروني البديهي. اختر الوقت المفضل ونوع الملعب.",
    expertCoaching: "تدريب خبير",
    expertCoachingDesc:
      "تعلم من محترفي البادل المعتمدين الذين سيساعدونك على تحسين لعبتك والوصول لإمكانياتك الكاملة.",
    tournamentTitle: "البطولات",
    tournamentDesc:
      "انضم لبطولات مثيرة وتنافس مع لاعبين من جميع أنحاء المنطقة. جميع المستويات مرحب بها.",
    contactInfo: "معلومات التواصل",
    connectWithUs: "تواصل معنا",
    whatsApp: "واتساب",
    followUs:
      "تابعنا على وسائل التواصل الاجتماعي للحصول على التحديثات والفعاليات",
    rightsReserved: "© 2024 بادل برو بورسعيد. جميع الحقوق محفوظة.",

    // Booking Page
    bookYourCourt: "احجز ملعبك",
    selectPreferred: "اختر التاريخ والوقت المفضل لحجز ملعب البادل",
    selectDate: "اختر التاريخ",
    availableTimes: "الأوقات المتاحة",
    courtSelection: "اختيار الملعب",
    available: "متاح",
    booked: "محجوز",
    legend: "المفتاح:",
    bookingSummary: "ملخص الحجز",
    date: "التاريخ",
    time: "الوقت",
    duration: "المدة",
    price: "السعر",
    confirmBooking: "تأكيد الحجز",
    premiumGlass: "ملعب زجاجي مميز",
    standardCourt: "ملعب عادي",
    selectLocation: "اختر الموقع",
    choosePreferredLocation:
      "اختر الموقع المفضل لديك لعرض الملاعب والأوقات المتاحة",
    courts: "الملاعب",
    facilities: "المرافق",
    backToLocations: "العودة للمواقع",
    selectedDate: "التاريخ المحدد",
    today: "اليوم",
    tomorrow: "غداً",
    location: "الموقع",
    court: "الملعب",
    totalPrice: "السعر الإجمالي",

    // Coaching Page
    professionalCoaching: "التدريب الاحترافي",
    coachingDescription:
      "تعلم من محترفي البادل المعتمدين وانتقل بلعبتك للمستوى التالي. يقدم مدربونا تدريب شخصي لجميع المستويات.",
    achievements: "الإنجازات",
    availability: "الأوقات المتاحة",
    bookSession: "حجز جلسة",
    allLevels: "جميع المستويات",
    beginnerIntermediate: "مبتدئ-متوسط",
    intermediateAdvanced: "متوسط-متقدم",
    experience: "خبرة",
    whyChooseCoaching: "لماذا تختار تدريبنا؟",
    certifiedProfessionals: "محترفون معتمدون",
    certifiedDesc:
      "جميع مدربينا معتمدون من FIP مع سجل حافل في البادل التنافسي.",
    personalizedTraining: "تدريب شخصي",
    personalizedDesc: "برامج تدريب مخصصة حسب مستواك وأهدافك.",
    flexibleScheduling: "جدولة مرنة",
    flexibleDesc: "احجز جلسات تناسب جدولك مع خيارات التوقيت المرنة.",

    // Tournaments Page
    summerTournament: "بطولة الصيف",
    registerNow: "سجل الآن!",
    upcomingTournaments: "البطولات القادمة",
    featured: "مميزة",
    registrationOpen: "التسجيل مفتوح",
    comingSoon: "قريباً",
    participants: "مشاركين",
    prizePool: "الجائزة الكبرى",
    level: "المستوى",
    entryFee: "رسوم الدخول",
    full: "ممتلئ",
    tournamentBracket: "معاينة جدول البطولة",
    bracketPreview: "جدول بطولة الصيف",
    liveBracket: "تحديثات الجدول المباشرة أثناء البطولة",
    match: "مباراة",
    bracketUpdated: "سيتم تحديث الجدول في الوقت الفعلي أثناء البطولة",
    tournamentRules: "قوانين ومعلومات البطولة",
    generalRules: "القوانين العامة",
    whatsIncluded: "ما هو مشمول",

    // Admin Dashboard
    adminDashboard: "لوحة الإدارة",
    manageBookings: "إدارة الحجوزات وعرض الإحصائيات ومراقبة عمليات المنشأة",
    totalBookings: "إجمالي الحجوزات",
    confirmed: "مؤكد",
    pending: "في الانتظار",
    revenue: "الإيرادات",
    fromConfirmed: "من الحجوزات المؤكدة",
    recentBookings: "الحجوزات الأخيرة",
    filterByStatus: "تصفية حسب الحالة",
    allStatuses: "جميع الحالات",
    cancelled: "ملغي",
    player: "اللاعب",
    type: "النوع",
    status: "الحالة",
    amount: "المبلغ",
    actions: "الإجراءات",
    confirm: "تأكيد",
    cancel: "إلغاء",
    view: "عرض",
    courtManagement: "إدارة الملاعب",
    viewCourtSchedule: "عرض جدول الملاعب",
    maintenanceSchedule: "جدول الصيانة",
    blockTimeSlots: "حجب الفترات الزمنية",
    reports: "التقارير",
    dailyRevenue: "تقرير الإيرادات اليومي",
    monthlyAnalytics: "التحليلات الشهرية",
    customerReport: "تقرير العملاء",
    systemSettings: "إعدادات النظام",
    pricingSettings: "إعدادات الأسعار",
    staffManagement: "إدارة الموظفين",
    notifications: "الإشعارات",

    // Common
    egp: "ج.م",
    hour: "ساعة",
    hours: "ساعات",
    years: "سنوات",
    perHour: "/ساعة",
    requireAttention: "تتطلب انتباه",
    ofTotal: "من الإجمالي",
    fromLastWeek: "من الأسبوع الماضي",
  },
};

export function useTranslations(language: "en" | "ar"): Translations {
  return translations[language];
}
