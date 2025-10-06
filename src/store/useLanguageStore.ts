import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Language = 'uz' | 'en' | 'ru';

interface LanguageState {
  language: Language;
  setLanguage: (language: Language) => void;
  getText: (key: string) => string;
}

const translations = {
  uz: {
    // Navigation
    home: 'Bosh sahifa',
    matches: 'O\'yinlar',
    teams: 'Jamoalar',
    standings: 'Reyting',
    account: 'Hisob',
    settings: 'Sozlamalar',
    
    // Settings
    appearance: 'Ko\'rinish',
    darkMode: 'Qorong\'u rejim',
    darkModeSubtitle: 'Yorug\' yoki qorong\'u mavzu',
    language: 'Til',
    selectLanguage: 'Til tanlash',
    settingsSubtitle: 'Ilova sozlamalarini boshqaring',
    notifications: 'Bildirishnomalar',
    pushNotifications: 'Push bildirishnomalar',
    autoUpdate: 'Avtomatik yangilanish',
    data: 'Ma\'lumotlar',
    clearCache: 'Cache tozalash',
    downloadData: 'Ma\'lumotlarni yuklab olish',
    about: 'Dastur haqida',
    version: 'Versiya',
    help: 'Yordam',
    privacy: 'Maxfiylik siyosati',
    logout: 'Chiqish',
    logoutSubtitle: 'Hisobingizdan chiqing',
    logoutConfirm: 'Hisobingizdan chiqishni xohlaysizmi?',
    player: 'O\'yinchi',
    
    // Common
    cancel: 'Bekor qilish',
    confirm: 'Tasdiqlash',
    save: 'Saqlash',
    loading: 'Yuklanmoqda...',
    error: 'Xatolik',
    success: 'Muvaffaqiyat',
    
    // Theme
    lightTheme: 'Yorug\' mavzu',
    darkTheme: 'Qorong\'u mavzu',
    
    // Language names
    uzbek: 'O\'zbek',
    english: 'English',
    russian: 'Русский',
    
    // Home Screen
    welcomeToHFL: 'HFL ga xush kelibsiz',
    havasFootballLeague: 'Havas Football League',
    upcomingMatches: 'Kutilayotgan o\'yinlar',
    liveMatches: 'Jonli o\'yinlar',
    noUpcomingMatches: 'Kutilayotgan o\'yinlar yo\'q',
    viewAllMatches: 'Barcha o\'yinlarni ko\'rish',
    
    // Account Screen
    manageAccount: 'Hisobingizni boshqaring',
    transferRequest: 'Transfer arizasi',
    apply: 'Ariza berish',
    submitTransferRequest: 'Transfer ariza berish',
    transferRequestSubtitle: 'Boshqa jamoaga o\'tish uchun ariza',
    applySubtitle: 'O\'yinchi, jamoa yoki liga sifatida ro\'yxatdan o\'ting',
    playerPanel: 'O\'yinchi paneli',
    playerPanelSubtitle: 'Statistikalar va ma\'lumotlar',
    playerLogin: 'O\'yinchi kirish',
    playerLoginSubtitle: 'Mavjud o\'yinchi hisobiga kiring',
    appSettings: 'Ilova sozlamalari',
    aboutSubtitle: 'Ilova versiyasi va ma\'lumotlar',
    playerApplication: 'O\'yinchi Ariza',
    playerApplicationMessage: 'O\'yinchi sifatida ariza berishni xohlaysizmi?',
    teamApplication: 'Jamoa Ariza',
    teamApplicationMessage: 'Jamoa sifatida ariza berishni xohlaysizmi?',
    leagueApplication: 'Liga Ariza',
    leagueApplicationMessage: 'Liga sifatida ariza berishni xohlaysizmi?',
    transferRequestMessage: 'Qanday transfer ariza berishni xohlaysiz?',
    playerTransfer: 'O\'yinchi transfer',
    teamTransfer: 'Jamoa transfer',
    yesContinue: 'Ha, davom etish',
    logoutSuccess: 'Hisobingizdan chiqdingiz',
    logoutError: 'Chiqishda xatolik yuz berdi',
    appVersion: 'HFL Mobile App v1.0.0',
    
    // Application Type Modal
    applicationType: 'Ariza Turi',
    applicationTypeMessage: 'Qanday ariza berishni xohlaysiz?',
    
    // Player Login Screen
    phoneStepSubtitle: 'Telefon raqamingizni kiriting va tasdiqlash kodi oling',
    otpStepSubtitle: 'Telefoningizga yuborilgan tasdiqlash kodini kiriting',
    phoneNumber: 'Telefon raqam',
    sendingCode: 'Kod yuborilmoqda...',
    sendVerificationCode: 'Tasdiqlash kodi yuborish',
    verificationCode: 'Tasdiqlash kodi',
    sentTo: 'raqamiga yuborildi',
    verifying: 'Tekshirilmoqda...',
    verify: 'Tasdiqlash',
    resend: 'Qayta yuborish',
    changePhoneNumber: 'Telefon raqamni o\'zgartirish',
    enterPhoneNumber: 'Telefon raqamini kiriting',
    invalidPhoneFormat: 'Telefon raqami noto\'g\'ri formatda. +998 90 123 45 67 ko\'rinishida kiriting',
    otpSent: 'Tasdiqlash kodi yuborildi',
    otpSendError: 'Kod yuborishda xatolik',
    serverTimeout: 'Server bilan bog\'lanishda timeout. Qayta urinib ko\'ring.',
    serverDown: 'Server ishlamayapti. Iltimos, keyinroq urinib ko\'ring.',
    enterOtpCode: 'Tasdiqlash kodini kiriting',
    otpCodeLength: 'Tasdiqlash kodi 4 xonali bo\'lishi kerak',
    blocked: 'Bloklangan',
    tooManyAttempts: 'Juda ko\'p noto\'g\'ri urinish. 15 daqiqa kutib turing',
    wrongCode: 'Noto\'g\'ri kod',
    otpVerifyError: 'Kod tekshirishda xatolik yuz berdi. Qayta urinib ko\'ring.',
    wait: 'Kuting',
    secondsWait: 'soniya kutib turing',
    goBack: 'Orqaga qaytish',
    
    // Navigation
    matchDetails: 'O\'yin tafsilotlari',
    teamDetails: 'Jamoa tafsilotlari',
    
    // Add Match Screen
    addMatch: 'Yangi o\'yin qo\'shish',
    homeTeam: 'Uy jamoasi',
    awayTeam: 'Mehmon jamoasi',
    venue: 'Maydon',
    league: 'Liga',
    date: 'Sana',
    time: 'Vaqt',
    enterHomeTeam: 'Uy jamoasi nomini kiriting',
    enterAwayTeam: 'Mehmon jamoasi nomini kiriting',
    enterVenue: 'Maydon nomini kiriting',
    enterLeague: 'Liga nomini kiriting',
    adding: 'Qo\'shilmoqda...',
    fillAllFields: 'Barcha maydonlarni to\'ldiring',
    matchAddedSuccessfully: 'O\'yin muvaffaqiyatli qo\'shildi',
    errorAddingMatch: 'O\'yin qo\'shishda xatolik',
  },
  en: {
    // Navigation
    home: 'Home',
    matches: 'Matches',
    teams: 'Teams',
    standings: 'Standings',
    account: 'Account',
    settings: 'Settings',
    
    // Settings
    appearance: 'Appearance',
    darkMode: 'Dark Mode',
    darkModeSubtitle: 'Light or dark theme',
    language: 'Language',
    selectLanguage: 'Select Language',
    settingsSubtitle: 'Manage app settings',
    notifications: 'Notifications',
    pushNotifications: 'Push Notifications',
    autoUpdate: 'Auto Update',
    data: 'Data',
    clearCache: 'Clear Cache',
    downloadData: 'Download Data',
    about: 'About',
    version: 'Version',
    help: 'Help',
    privacy: 'Privacy Policy',
    logout: 'Logout',
    logoutSubtitle: 'Sign out of your account',
    logoutConfirm: 'Are you sure you want to sign out?',
    player: 'Player',
    
    // Common
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    
    // Theme
    lightTheme: 'Light Theme',
    darkTheme: 'Dark Theme',
    
    // Language names
    uzbek: 'O\'zbek',
    english: 'English',
    russian: 'Русский',
    
    // Home Screen
    welcomeToHFL: 'Welcome to HFL',
    havasFootballLeague: 'Havas Football League',
    upcomingMatches: 'Upcoming Matches',
    liveMatches: 'Live Matches',
    noUpcomingMatches: 'No upcoming matches',
    viewAllMatches: 'View All Matches',
    
    // Account Screen
    manageAccount: 'Manage your account',
    transferRequest: 'Transfer Request',
    apply: 'Apply',
    submitTransferRequest: 'Submit Transfer Request',
    transferRequestSubtitle: 'Request to transfer to another team',
    applySubtitle: 'Register as player, team or league',
    playerPanel: 'Player Panel',
    playerPanelSubtitle: 'Statistics and information',
    playerLogin: 'Player Login',
    playerLoginSubtitle: 'Sign in to existing player account',
    appSettings: 'App settings',
    aboutSubtitle: 'App version and information',
    playerApplication: 'Player Application',
    playerApplicationMessage: 'Do you want to apply as a player?',
    teamApplication: 'Team Application',
    teamApplicationMessage: 'Do you want to apply as a team?',
    leagueApplication: 'League Application',
    leagueApplicationMessage: 'Do you want to apply as a league?',
    transferRequestMessage: 'What type of transfer request do you want to make?',
    playerTransfer: 'Player Transfer',
    teamTransfer: 'Team Transfer',
    yesContinue: 'Yes, Continue',
    logoutSuccess: 'You have been logged out',
    logoutError: 'Error occurred during logout',
    appVersion: 'HFL Mobile App v1.0.0',
    
    // Application Type Modal
    applicationType: 'Application Type',
    applicationTypeMessage: 'What type of application do you want to submit?',
    
    // Player Login Screen
    phoneStepSubtitle: 'Enter your phone number and get a verification code',
    otpStepSubtitle: 'Enter the verification code sent to your phone',
    phoneNumber: 'Phone Number',
    sendingCode: 'Sending code...',
    sendVerificationCode: 'Send Verification Code',
    verificationCode: 'Verification Code',
    sentTo: 'sent to',
    verifying: 'Verifying...',
    verify: 'Verify',
    resend: 'Resend',
    changePhoneNumber: 'Change Phone Number',
    enterPhoneNumber: 'Enter phone number',
    invalidPhoneFormat: 'Invalid phone format. Enter in +998 90 123 45 67 format',
    otpSent: 'Verification code sent',
    otpSendError: 'Error sending code',
    serverTimeout: 'Server connection timeout. Please try again.',
    serverDown: 'Server is down. Please try again later.',
    enterOtpCode: 'Enter verification code',
    otpCodeLength: 'Verification code must be 4 digits',
    blocked: 'Blocked',
    tooManyAttempts: 'Too many wrong attempts. Wait 15 minutes',
    wrongCode: 'Wrong code',
    otpVerifyError: 'Error verifying code. Please try again.',
    wait: 'Wait',
    secondsWait: 'seconds wait',
    goBack: 'Go Back',
    
    // Navigation
    matchDetails: 'Match Details',
    teamDetails: 'Team Details',
    
    // Add Match Screen
    addMatch: 'Add New Match',
    homeTeam: 'Home Team',
    awayTeam: 'Away Team',
    venue: 'Venue',
    league: 'League',
    date: 'Date',
    time: 'Time',
    enterHomeTeam: 'Enter home team name',
    enterAwayTeam: 'Enter away team name',
    enterVenue: 'Enter venue name',
    enterLeague: 'Enter league name',
    adding: 'Adding...',
    fillAllFields: 'Please fill all fields',
    matchAddedSuccessfully: 'Match added successfully',
    errorAddingMatch: 'Error adding match',
  },
  ru: {
    // Navigation
    home: 'Главная',
    matches: 'Матчи',
    teams: 'Команды',
    standings: 'Рейтинг',
    account: 'Аккаунт',
    settings: 'Настройки',
    
    // Settings
    appearance: 'Внешний вид',
    darkMode: 'Темная тема',
    darkModeSubtitle: 'Светлая или темная тема',
    language: 'Язык',
    selectLanguage: 'Выберите язык',
    settingsSubtitle: 'Управление настройками приложения',
    notifications: 'Уведомления',
    pushNotifications: 'Push уведомления',
    autoUpdate: 'Автообновление',
    data: 'Данные',
    clearCache: 'Очистить кэш',
    downloadData: 'Скачать данные',
    about: 'О программе',
    version: 'Версия',
    help: 'Помощь',
    privacy: 'Политика конфиденциальности',
    logout: 'Выйти',
    logoutSubtitle: 'Выйти из аккаунта',
    logoutConfirm: 'Вы уверены, что хотите выйти?',
    player: 'Игрок',
    
    // Common
    cancel: 'Отмена',
    confirm: 'Подтвердить',
    save: 'Сохранить',
    loading: 'Загрузка...',
    error: 'Ошибка',
    success: 'Успешно',
    
    // Theme
    lightTheme: 'Светлая тема',
    darkTheme: 'Темная тема',
    
    // Language names
    uzbek: 'O\'zbek',
    english: 'English',
    russian: 'Русский',
    
    // Home Screen
    welcomeToHFL: 'Добро пожаловать в HFL',
    havasFootballLeague: 'Havas Football League',
    upcomingMatches: 'Предстоящие матчи',
    liveMatches: 'Прямые матчи',
    noUpcomingMatches: 'Нет предстоящих матчей',
    viewAllMatches: 'Посмотреть все матчи',
    
    // Account Screen
    manageAccount: 'Управляйте своим аккаунтом',
    transferRequest: 'Запрос на перевод',
    apply: 'Подать заявку',
    submitTransferRequest: 'Подать запрос на перевод',
    transferRequestSubtitle: 'Запрос на перевод в другую команду',
    applySubtitle: 'Зарегистрироваться как игрок, команда или лига',
    playerPanel: 'Панель игрока',
    playerPanelSubtitle: 'Статистика и информация',
    playerLogin: 'Вход игрока',
    playerLoginSubtitle: 'Войти в существующий аккаунт игрока',
    appSettings: 'Настройки приложения',
    aboutSubtitle: 'Версия приложения и информация',
    playerApplication: 'Заявка игрока',
    playerApplicationMessage: 'Хотите подать заявку как игрок?',
    teamApplication: 'Заявка команды',
    teamApplicationMessage: 'Хотите подать заявку как команда?',
    leagueApplication: 'Заявка лиги',
    leagueApplicationMessage: 'Хотите подать заявку как лига?',
    transferRequestMessage: 'Какой тип запроса на перевод вы хотите сделать?',
    playerTransfer: 'Перевод игрока',
    teamTransfer: 'Перевод команды',
    yesContinue: 'Да, продолжить',
    logoutSuccess: 'Вы вышли из системы',
    logoutError: 'Произошла ошибка при выходе',
    appVersion: 'HFL Mobile App v1.0.0',
    
    // Application Type Modal
    applicationType: 'Тип заявки',
    applicationTypeMessage: 'Какой тип заявки вы хотите подать?',
    
    // Player Login Screen
    phoneStepSubtitle: 'Введите номер телефона и получите код подтверждения',
    otpStepSubtitle: 'Введите код подтверждения, отправленный на ваш телефон',
    phoneNumber: 'Номер телефона',
    sendingCode: 'Отправка кода...',
    sendVerificationCode: 'Отправить код подтверждения',
    verificationCode: 'Код подтверждения',
    sentTo: 'отправлен на',
    verifying: 'Проверка...',
    verify: 'Подтвердить',
    resend: 'Отправить повторно',
    changePhoneNumber: 'Изменить номер телефона',
    enterPhoneNumber: 'Введите номер телефона',
    invalidPhoneFormat: 'Неверный формат телефона. Введите в формате +998 90 123 45 67',
    otpSent: 'Код подтверждения отправлен',
    otpSendError: 'Ошибка отправки кода',
    serverTimeout: 'Таймаут соединения с сервером. Попробуйте снова.',
    serverDown: 'Сервер не работает. Попробуйте позже.',
    enterOtpCode: 'Введите код подтверждения',
    otpCodeLength: 'Код подтверждения должен быть 4-значным',
    blocked: 'Заблокирован',
    tooManyAttempts: 'Слишком много неправильных попыток. Подождите 15 минут',
    wrongCode: 'Неверный код',
    otpVerifyError: 'Ошибка проверки кода. Попробуйте снова.',
    wait: 'Подождите',
    secondsWait: 'секунд подождите',
    goBack: 'Назад',
    
    // Navigation
    matchDetails: 'Детали матча',
    teamDetails: 'Детали команды',
    
    // Add Match Screen
    addMatch: 'Добавить новый матч',
    homeTeam: 'Домашняя команда',
    awayTeam: 'Гостевая команда',
    venue: 'Стадион',
    league: 'Лига',
    date: 'Дата',
    time: 'Время',
    enterHomeTeam: 'Введите название домашней команды',
    enterAwayTeam: 'Введите название гостевой команды',
    enterVenue: 'Введите название стадиона',
    enterLeague: 'Введите название лиги',
    adding: 'Добавление...',
    fillAllFields: 'Заполните все поля',
    matchAddedSuccessfully: 'Матч успешно добавлен',
    errorAddingMatch: 'Ошибка добавления матча',
  },
};

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      language: 'uz',
      setLanguage: (language) => set({ language }),
      getText: (key: string) => {
        const currentLanguage = get().language;
        return translations[currentLanguage][key] || key;
      },
    }),
    {
      name: 'language-storage',
    }
  )
);

export const useLanguage = () => {
  const { language, setLanguage, getText } = useLanguageStore();
  return { language, setLanguage, getText };
};
