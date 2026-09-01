import React, { createContext, useContext, useRef, useCallback } from 'react';
import { Animated } from 'react-native';

// Scroll distance (px) needed to fully shrink the floating navbar.
// AVVAL 70 edi va "sekinroq bo'lsin" degan so'rov bo'yicha bu qiymatni
// o'zgartirmasdan alohida `Animated.timing` (260ms) bilan "kechiktirilgan"
// silliqlash qo'shilgan edi — lekin har bir scroll-hodisada (taxminan har
// 16ms'da) YANGI 260ms'lik animatsiya qayta boshlanaverishi bir-birining
// ustiga chiqib ketib, navbar "qotib qolgandek"/tebranib qolgandek
// ko'rinishga sabab bo'lgan edi. TO'G'RI YECHIM: animatsiya davomiyligini
// EMAS, balki shu MASOFANI kattalashtirish — shunda kichrayish/kattalashish
// tezligi doim aynan SCROLL tezligiga 1:1 teng bo'ladi (hech qanday alohida
// animatsiya/kechikish yo'q, demak "qotish" ham mumkin emas), faqat buning
// uchun ko'proq scroll qilish kerak bo'ladi — bu aynan "sekinroq" tuyg'usini
// beradi.
const SHRINK_SCROLL_DISTANCE = 170;
// Below this offset we always treat the screen as "at the top" and force
// the navbar back to its full size (covers iOS rubber-band overscroll too).
const SCROLL_TOP_THRESHOLD = 4;

interface NavBarScrollContextType {
    // 0 = navbar at full size, 1 = navbar fully shrunk
    shrinkProgress: Animated.Value;
    // Call from each tab screen's onScroll with a stable per-tab key
    handleScroll: (tabKey: string, event: any) => void;
    // Snap the navbar back to full size (e.g. right after switching tabs)
    resetNavBarShrink: () => void;
}

const noopValue = new Animated.Value(0);

const NavBarScrollContext = createContext<NavBarScrollContextType>({
    shrinkProgress: noopValue,
    handleScroll: () => {},
    resetNavBarShrink: () => {},
});

export const NavBarScrollProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const shrinkProgress = useRef(new Animated.Value(0)).current;
    const progressRef = useRef(0);
    const lastScrollYRef = useRef<Record<string, number>>({});

    const applyProgress = useCallback((next: number) => {
        const clamped = Math.max(0, Math.min(1, next));
        progressRef.current = clamped;
        // To'g'ridan-to'g'ri (animatsiyasiz) o'rnatiladi — shu bilan
        // kichrayish/kattalashish tezligi HAR DOIM aynan barmoq/scroll
        // tezligiga 1:1 teng bo'ladi va bir-birining ustiga chiqadigan
        // overlapping animatsiyalardan kelib chiqadigan "qotish"/tebranish
        // butunlay yo'qoladi. "Sekinlik" endi yuqoridagi
        // SHRINK_SCROLL_DISTANCE orqali ta'minlanadi.
        shrinkProgress.setValue(clamped);
    }, [shrinkProgress]);

    const handleScroll = useCallback((tabKey: string, event: any) => {
        const y = event?.nativeEvent?.contentOffset?.y ?? 0;
        
        // Standard convention: near/at the top -> navbar is always full size.
        if (y <= SCROLL_TOP_THRESHOLD) {
            lastScrollYRef.current[tabKey] = y;
            applyProgress(0);
            return;
        }

        const prevY = lastScrollYRef.current[tabKey];
        lastScrollYRef.current[tabKey] = y;

        // Shu tab uchun BIRINCHI marta scroll hodisasi kelganda baseline o'rnatiladi,
        // delta hisoblanmaydi (sakrash va qotishlarning oldini oladi).
        if (prevY === undefined) return;

        // Ignore negative overscroll bounce or micro-jitters
        if (y < 0) {
            applyProgress(0);
            return;
        }

        const dy = y - prevY;
        if (Math.abs(dy) < 2) return;

        // Scrolling down (dy > 0) shrinks the navbar, scrolling up (dy < 0)
        // grows it back — tracked 1:1 with finger movement, clamped [0,1].
        applyProgress(progressRef.current + dy / SHRINK_SCROLL_DISTANCE);
    }, [applyProgress]);

    const resetNavBarShrink = useCallback(() => {
        progressRef.current = 0;
        lastScrollYRef.current = {};
        Animated.spring(shrinkProgress, {
            toValue: 0,
            friction: 7,
            tension: 100,
            useNativeDriver: false,
        }).start();
    }, [shrinkProgress]);

    return (
        <NavBarScrollContext.Provider value={{ shrinkProgress, handleScroll, resetNavBarShrink }}>
            {children}
        </NavBarScrollContext.Provider>
    );
};

export const useNavBarScroll = () => useContext(NavBarScrollContext);
