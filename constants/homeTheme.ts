/**
 * AMATORA Home Screen — Lokal Rang Tokenlari (Bosqich 2)
 *
 * Bu ranglar FAQAT HomeScreen.tsx va SuperLigaTop4.tsx uchun ishlatiladi.
 * Boshqa ekranlar useThemeStore'dan eski tokenlarni ishlatishda davom etadi.
 *
 * Brief: Match kartalar va widgets uchun to'liq neytral, qora/oq asosli palitra.
 * Accent (#E85002) faqat LIVE indikator va CTA tugmalar uchun.
 */

export interface HomeScreenColors {
    background: string;      // Umumiy fon
    surface: string;         // Kartalar/widgets foni
    border: string;          // Yupqa, past opacity border
    textPrimary: string;     // Sarlavhalar, asosiy matn
    textSecondary: string;   // Sana, joy, ikkilamchi matn
    accent: string;          // LIVE, CTA faqat
}

export const homeScreenColors = {
    dark: {
        background: '#000000',                  // Qop-qora
        surface: '#333333',                     // Dark gray (bazadan bir pog'ona ochroq)
        border: 'rgba(100, 100, 100, 0.4)',    // #646464 past opacity
        textPrimary: '#F9F9F9',                // White (oq)
        textSecondary: '#A7A7A7',              // Light gray (kulrang)
        accent: '#E85002',                     // Orange (branding)
    } as HomeScreenColors,

    light: {
        background: '#FFFFFF',                 // Toza oq
        surface: '#F5F5F5',                    // Yengil kulrang
        border: 'rgba(224, 224, 224, 0.6)',   // #E0E0E0 past opacity
        textPrimary: '#000000',                // Qora
        textSecondary: '#646464',              // Gray
        accent: '#E85002',                     // Orange (o'zgarmaydi)
    } as HomeScreenColors,
};

/**
 * Hook: Joriy tema (dark/light) bo'yicha mos ranglarni qaytaradi
 * Usage:
 *   const homeColors = useHomeScreenColors();
 *   <View style={{ backgroundColor: homeColors.surface }} />
 */
export const getHomeScreenColors = (isDark: boolean): HomeScreenColors => {
    return isDark ? homeScreenColors.dark : homeScreenColors.light;
};
