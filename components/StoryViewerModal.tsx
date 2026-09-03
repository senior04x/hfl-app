import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Dimensions,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  PanResponder,
  StatusBar,
  Platform,
  Image,
  Easing,
  Alert,
  Share,
} from 'react-native';
import { ResizeMode, Video, AVPlaybackStatus } from 'expo-av';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import SmartImage from './SmartImage';
import { getCachedVideoUri } from '../utils/videoCache';
import { StoryGroup, StoryMediaItem } from './MatchStoriesTray';
import { useThemeStore } from '../store/useThemeStore';
import { useAuthStore } from '../store/useAuthStore';
import { getHomeScreenColors } from '../constants/homeTheme';
import { storyService } from '../services/storyService';
import { formatLocalizedRelativeTime } from '../utils/dateLocalization';
import TeamStoryReplayPickerModal from './TeamStoryReplayPickerModal';

const { width, height } = Dimensions.get('window');
const STORY_DEFAULT_DURATION = 6000; // 6 seconds for image stories

interface StoryViewerModalProps {
  visible: boolean;
  storyGroups: StoryGroup[];
  initialGroupIndex?: number;
  onClose: () => void;
  onNavigateMatch?: (matchId: string) => void;
  onStoryGroupViewed?: (groupId: string, groupIndex: number) => void;
  // O'zining jamoasi story'sini ko'rayotganda pastki qatordagi "+" tugmasi
  // bosilganda yoki story muvaffaqiyatli qo'shilganda chaqiriladi
  onAddStoryPress?: () => void;
  onStoryAdded?: () => void;
}

export default function StoryViewerModal({
  visible,
  storyGroups,
  initialGroupIndex = 0,
  onClose,
  onNavigateMatch,
  onStoryGroupViewed,
  onAddStoryPress,
  onStoryAdded,
}: StoryViewerModalProps) {
  const { t, i18n } = useTranslation();
  const { isDark } = useThemeStore();
  const homeColors = getHomeScreenColors(isDark);
  const { user, isGuest, isAuthenticated } = useAuthStore();
  const userId = user?.id || user?._id;

  const [pickerVisible, setPickerVisible] = useState(false);
  const [currentGroupIdx, setCurrentGroupIdx] = useState(initialGroupIndex);
  const [currentItemIdx, setCurrentItemIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [cachedVideoUri, setCachedVideoUri] = useState<string | null>(null);

  // Social interactions state
  const [likesCount, setLikesCount] = useState(0);
  const [viewsCount, setViewsCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const heartScale = useRef(new Animated.Value(1)).current;

  // Video/skelet "shimmer" (nur o'tib turishi) — video hali yuklanayotganda
  // (mediaLoading=true) ekran ustidan va progress-bar chizig'i ustidan
  // chapdan o'ngga uzluksiz o'tib turadigan yorug' chiziq.
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // Gestures & Transitions
  const videoRef = useRef<Video>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const panY = useRef(new Animated.Value(0)).current;
  const uiOpacity = useRef(new Animated.Value(1)).current;
  const mediaFadeAnim = useRef(new Animated.Value(1)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const currentProgressVal = useRef(0);
  const activeMediaKeyRef = useRef<string>('0-0');
  const isHoldingRef = useRef(false);
  const holdTimerRef = useRef<any>(null);
  // Team (group) o'rtasidagi 3D kub-flip animatsiyasi ketma-ket ikki marta
  // (masalan tez-tez bosilganda) bir-birining ustiga tushib ketmasligi uchun
  // himoya bayrog'i. MUHIM: bu bayroq PanResponder'ning gesture'ni "ushlash"
  // qobiliyatiga UMUMAN ta'sir qilmaydi (avval shunday edi va bu butun
  // story'ning bosilmay qolishiga sabab bo'lgan edi) — faqat
  // animateToNextTeam/animateToPrevTeam ICHIDA qayta-kirishni oldini oladi,
  // va har doim setTimeout orqali (Animated completion callback'iga
  // bog'liq bo'lmasdan) kafolatlangan tarzda qayta false'ga qaytariladi.
  const isGroupTransitioningRef = useRef(false);
  const groupTransitionTimeoutRef = useRef<any>(null);
  // Agar video biror sababdan (sekin/uzilgan tarmoq, buzuq fayl va h.k.)
  // haqiqatan PLAY bo'la olmasa, ekran abadiy "qotib" qolmasligi uchun
  // xavfsizlik taymeri — belgilangan vaqt ichida play boshlanmasa, avtomatik
  // keyingi story'ga o'tkaziladi.
  const stuckVideoTimeoutRef = useRef<any>(null);
  const STUCK_VIDEO_TIMEOUT_MS = 12000;

  // MUHIM (stale-closure bagini tuzatish): pastdagi `panResponder` faqat BIR
  // MARTA (`useRef` bilan) yaratiladi, shuning uchun uning handler
  // funksiyalari HECH QACHON yangilanmaydi — ular yopib olgan (closure)
  // funksiyalar/state'lar doim BIRINCHI render paytidagi qiymatlarga ega
  // bo'lib qolar edi. Bu aynan "orqaga qaytganda story kutilmaganda darhol
  // yopilib ketishi" va "o'ngga bosganda keyingi story'ga noto'g'ri
  // o'tishi/qotib qolishi" kabi baglarning ILDIZ sababi edi — chunki
  // goToNext/goToPrev/animateToNextTeam/animateToPrevTeam PanResponder ichida
  // chaqirilganda ular DOIM birinchi render'dagi currentGroupIdx=0,
  // currentItemIdx=0 (va h.k.) qiymatlarini "ko'rar" edi, foydalanuvchi
  // haqiqatda qayerda turganidan qat'iy nazar. Yechim: bu funksiyalar endi
  // quyidagi REF'lar orqali (har doim eng so'nggi qiymatga ega, chunki ref
  // OB'YEKTI render'lar osha bir xil qoladi) o'qiydi — state emas.
  const currentGroupIdxRef = useRef(currentGroupIdx);
  const currentItemIdxRef = useRef(currentItemIdx);
  const storyGroupsRef = useRef(storyGroups);
  const isPausedRef = useRef(isPaused);
  const cachedVideoUriRef = useRef(cachedVideoUri);

  useEffect(() => {
    currentGroupIdxRef.current = currentGroupIdx;
  }, [currentGroupIdx]);
  useEffect(() => {
    currentItemIdxRef.current = currentItemIdx;
  }, [currentItemIdx]);
  useEffect(() => {
    storyGroupsRef.current = storyGroups;
  }, [storyGroups]);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);
  useEffect(() => {
    cachedVideoUriRef.current = cachedVideoUri;
  }, [cachedVideoUri]);

  const getCurrentItemsFromRef = () => storyGroupsRef.current?.[currentGroupIdxRef.current]?.items || [];

  const currentGroup = storyGroups?.[currentGroupIdx];
  const items = currentGroup?.items || [];
  const currentItem: StoryMediaItem | undefined = items[currentItemIdx];
  const isVideo = currentItem?.mediaType === 'video' && !!cachedVideoUri;

  // Track progress value for pause/resume in image mode
  useEffect(() => {
    const listenerId = progressAnim.addListener(({ value }) => {
      currentProgressVal.current = value;
    });
    return () => progressAnim.removeListener(listenerId);
  }, [progressAnim]);

  // Sync active key ref
  useEffect(() => {
    activeMediaKeyRef.current = `${currentGroupIdx}-${currentItemIdx}`;
  }, [currentGroupIdx, currentItemIdx]);

  // Load and record likes & views on story item change
  useEffect(() => {
    if (!visible || !currentItem?.id) return;

    storyService.getStoryInteractions(currentItem.id, userId ? String(userId) : undefined).then((stats) => {
      setLikesCount(stats.likesCount);
      setViewsCount(stats.viewsCount);
      setIsLiked(stats.isLiked);
    });

    // Record view in database / persistent storage
    storyService.recordStoryView(currentItem.id, userId ? String(userId) : undefined).then((res) => {
      if (res.viewsCount) {
        setViewsCount(res.viewsCount);
      }
    });
  }, [visible, currentGroupIdx, currentItemIdx, currentItem?.id, userId]);

  useEffect(() => {
    if (visible) {
      setCurrentGroupIdx(initialGroupIndex);
      setCurrentItemIdx(0);
      // Ref'larni ham DARHOL (sinxron) yangilaymiz — mirroring useEffect
      // keyingi render'gacha kutmaydi, shu bilan modal ochilgan zahoti tez
      // bosilgan tap/svayp ham har doim to'g'ri (eng yangi) qiymatlarni ko'radi.
      currentGroupIdxRef.current = initialGroupIndex;
      currentItemIdxRef.current = 0;
      panY.setValue(0);
      uiOpacity.setValue(1);
      mediaFadeAnim.setValue(1);
      isHoldingRef.current = false;
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (groupTransitionTimeoutRef.current) clearTimeout(groupTransitionTimeoutRef.current);
      isGroupTransitioningRef.current = false;
      if (animRef.current) animRef.current.stop();
      animRef.current = null;
      progressAnim.stopAnimation();
      progressAnim.setValue(0);
      currentProgressVal.current = 0;
      activeMediaKeyRef.current = `${initialGroupIndex}-0`;
    }
  }, [visible, initialGroupIndex]);

  // Trigger viewed callback for every story group the user views/browses into
  useEffect(() => {
    if (visible && currentGroup?.id && onStoryGroupViewed) {
      onStoryGroupViewed(currentGroup.id, currentGroupIdx);
    }
  }, [visible, currentGroupIdx, currentGroup?.id]);

  // Video caching — item almashganda ESKI cachedVideoUri'ni DARHOL (sinxron)
  // tozalaymiz. Aks holda: yangi item uchun <Video key> allaqachon yangilangan
  // bo'ladi-yu, lekin `source.uri` hali eski itemning keshlangan videosini
  // ko'rsatib turadi — natijada bir lahza NOTO'G'RI video milt etib ko'rinadi
  // (xuddi "qotib qolgandek" taassurot qoldiradi). Shu oraliqda gradient/
  // spinner holatiga silliq fade orqali o'tiladi (pastdagi animateToNextTeam/
  // animateToPrevTeam va goToNext/goToPrev'dagi mediaFadeAnim bilan birga).
  useEffect(() => {
    let isMounted = true;
    if (animRef.current) animRef.current.stop();
    animRef.current = null;
    progressAnim.stopAnimation();
    progressAnim.setValue(0);
    currentProgressVal.current = 0;

    setCachedVideoUri(null);

    if (stuckVideoTimeoutRef.current) {
      clearTimeout(stuckVideoTimeoutRef.current);
      stuckVideoTimeoutRef.current = null;
    }

    if (currentItem?.mediaType === 'video' && currentItem?.mediaUrl) {
      setMediaLoading(true);
      getCachedVideoUri(currentItem.mediaUrl)
        .then((cached) => {
          if (isMounted) {
            setCachedVideoUri(cached);
          }
        })
        .catch(() => {
          if (isMounted) setCachedVideoUri(currentItem.mediaUrl);
        });

      // Xavfsizlik taymeri: shu item uchun STUCK_VIDEO_TIMEOUT_MS ichida
      // haqiqiy PLAY boshlanmasa (handlePlaybackStatusUpdate uni bekor
      // qiladi), foydalanuvchi abadiy qotib qolgan ekranga tikilib
      // qolmasligi uchun avtomatik keyingi story'ga o'tiladi.
      const keyAtSchedule = `${currentGroupIdx}-${currentItemIdx}`;
      stuckVideoTimeoutRef.current = setTimeout(() => {
        if (activeMediaKeyRef.current === keyAtSchedule) {
          goToNext();
        }
      }, STUCK_VIDEO_TIMEOUT_MS);
    } else {
      setMediaLoading(false);
    }
    return () => {
      isMounted = false;
      if (stuckVideoTimeoutRef.current) {
        clearTimeout(stuckVideoTimeoutRef.current);
        stuckVideoTimeoutRef.current = null;
      }
    };
  }, [currentGroupIdx, currentItemIdx]);

  // Shimmer sweep — faqat mediaLoading=true bo'lganda uzluksiz aylanadi.
  useEffect(() => {
    if (!mediaLoading) return;
    shimmerAnim.setValue(0);
    const loop = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [mediaLoading]);

  // Progress animation for NON-VIDEO items (video progress is driven by onPlaybackStatusUpdate)
  useEffect(() => {
    if (!visible || !currentItem) return;

    if (isVideo) {
      if (isPaused && animRef.current) {
        animRef.current.stop();
        animRef.current = null;
      }
      return;
    }

    if (isPaused) {
      if (animRef.current) {
        animRef.current.stop();
        animRef.current = null;
      }
      return;
    }

    const duration = (currentItem.durationSeconds ? currentItem.durationSeconds * 1000 : STORY_DEFAULT_DURATION);
    const remainingTime = Math.max(50, duration * (1 - currentProgressVal.current));

    if (animRef.current) animRef.current.stop();
    animRef.current = Animated.timing(progressAnim, {
      toValue: 1,
      duration: remainingTime,
      easing: Easing.linear,
      useNativeDriver: false,
    });

    animRef.current.start(({ finished }) => {
      if (finished) {
        goToNext();
      }
    });

    return () => {
      if (animRef.current) {
        animRef.current.stop();
        animRef.current = null;
      }
    };
  }, [visible, currentGroupIdx, currentItemIdx, isPaused, isVideo]);

  // Handle Video Playback Status: Synchronize timeline smoothly
  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    const itemKey = `${currentGroupIdx}-${currentItemIdx}`;
    if (activeMediaKeyRef.current !== itemKey) {
      return;
    }

    if (!status.isLoaded) {
      return;
    }

    // MUHIM: mediaLoading endi "isLoaded" (metama'lumot tayyor) bilan EMAS,
    // balki haqiqiy "isPlaying" bilan o'chiriladi — aks holda shimmer bir
    // marta o'tib ketib, video hali bufferlanayotgan/qotib turgan holatda
    // ham "yuklandi" deb ko'rsatilardi (aynan shu "skeletom bir marta
    // o'tadi, keyin video qotib turaveradi" bagining sababi edi).
    if (status.isPlaying) {
      setMediaLoading(false);
      if (stuckVideoTimeoutRef.current) {
        clearTimeout(stuckVideoTimeoutRef.current);
        stuckVideoTimeoutRef.current = null;
      }
    } else if (status.isBuffering) {
      setMediaLoading(true);
    }

    if (status.didJustFinish) {
      if (animRef.current) {
        animRef.current.stop();
        animRef.current = null;
      }
      progressAnim.setValue(1);
      currentProgressVal.current = 1;
      goToNext();
      return;
    }

    if (status.isBuffering || isPaused || !status.isPlaying) {
      if (animRef.current) {
        animRef.current.stop();
        animRef.current = null;
      }
      if (status.durationMillis && status.durationMillis > 0) {
        const prog = Math.min(1, Math.max(0, status.positionMillis / status.durationMillis));
        progressAnim.setValue(prog);
        currentProgressVal.current = prog;
      }
    } else if (status.isPlaying && status.durationMillis && status.durationMillis > 0) {
      const currentFrac = Math.min(1, Math.max(0, status.positionMillis / status.durationMillis));
      const remainingMs = Math.max(50, status.durationMillis - status.positionMillis);
      const val = currentProgressVal.current;

      if (Math.abs(val - currentFrac) > 0.05 || !animRef.current) {
        progressAnim.setValue(currentFrac);
        currentProgressVal.current = currentFrac;
        if (animRef.current) animRef.current.stop();
        animRef.current = Animated.timing(progressAnim, {
          toValue: 1,
          duration: remainingMs,
          easing: Easing.linear,
          useNativeDriver: false,
        });
        animRef.current.start();
      }
    }
  };

  // Eng oxirgi team'ning eng oxirgi story'sida "keyingisi"ga o'tishga
  // urinilganda — endi viewer YOPILMAYDI, aksincha joriy video/rasm xuddi
  // boshidan qaytadan boshlanadi (loop). Progress-bar ham 0'dan qayta ketadi.
  const restartCurrentItem = () => {
    if (animRef.current) {
      animRef.current.stop();
      animRef.current = null;
    }
    progressAnim.stopAnimation();
    progressAnim.setValue(0);
    currentProgressVal.current = 0;

    const its = getCurrentItemsFromRef();
    const item = its[currentItemIdxRef.current];
    const itemIsVideo = item?.mediaType === 'video' && !!cachedVideoUriRef.current;

    if (itemIsVideo && videoRef.current) {
      if (isPausedRef.current) setIsPaused(false);
      videoRef.current.setPositionAsync(0).catch(() => {});
      videoRef.current.playAsync().catch(() => {});
    } else if (item) {
      const duration = item.durationSeconds ? item.durationSeconds * 1000 : STORY_DEFAULT_DURATION;
      animRef.current = Animated.timing(progressAnim, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: false,
      });
      animRef.current.start(({ finished }) => {
        if (finished) goToNext();
      });
    }
  };

  // Switch to Next Team — ODDIY CROSSFADE (opacity-only).
  // AVVAL bu yerda 3D kub-flip (perspective + rotateY + scale + translateX,
  // 4 ta parallel/spring animatsiya) ishlatilardi — foydalanuvchi buni
  // "qotib qoladi, jonga tegdi" deb baholadi. Kub effekti butunlay OLIB
  // TASHLANDI — endi FAQAT `mediaFadeAnim` (opacity) animatsiya qilinadi,
  // bu GPU uchun eng yengil animatsiya turi va freeze/jank xavfi deyarli yo'q.
  // MUHIM: `isGroupTransitioningRef` qayta-kirish himoyasi hamon Animated
  // `.start(callback)`ga EMAS, oddiy `setTimeout`ga bog'langan (avvalgi
  // Bug #1'dagi saboq — chained Animated callback'lar interrupt bo'lganda
  // chaqirilmay qolishi mumkin, bayroq esa shu sabab abadiy "true"da qotib
  // qolishi mumkin edi).
  const animateToNextTeam = () => {
    if (isGroupTransitioningRef.current) return;
    const groupIdx = currentGroupIdxRef.current;
    const groups = storyGroupsRef.current || [];
    if (groupIdx < groups.length - 1) {
      isGroupTransitioningRef.current = true;

      Animated.sequence([
        Animated.timing(mediaFadeAnim, { toValue: 0.08, duration: 110, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(mediaFadeAnim, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();

      const nextGroup = groupIdx + 1;
      activeMediaKeyRef.current = `${nextGroup}-0`;
      currentGroupIdxRef.current = nextGroup;
      currentItemIdxRef.current = 0;
      setCurrentGroupIdx(nextGroup);
      setCurrentItemIdx(0);

      if (groupTransitionTimeoutRef.current) clearTimeout(groupTransitionTimeoutRef.current);
      groupTransitionTimeoutRef.current = setTimeout(() => {
        isGroupTransitioningRef.current = false;
      }, 330);
    } else {
      // Eng oxirgi team, eng oxirgi story — endi bu yerda YOPILMAYDI,
      // joriy video/rasm boshidan qaytadan boshlanadi (loop). Haptic
      // olib tashlandi (foydalanuvchi so'rovi bo'yicha).
      restartCurrentItem();
    }
  };

  // Switch to Prev Team — xuddi yuqoridagi bilan bir xil oddiy crossfade.
  const animateToPrevTeam = () => {
    if (isGroupTransitioningRef.current) return;
    const groupIdx = currentGroupIdxRef.current;
    const groups = storyGroupsRef.current || [];
    if (groupIdx > 0) {
      isGroupTransitioningRef.current = true;

      Animated.sequence([
        Animated.timing(mediaFadeAnim, { toValue: 0.08, duration: 110, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(mediaFadeAnim, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();

      const prevGroupIdx = groupIdx - 1;
      const prevGroup = groups[prevGroupIdx];
      const targetItemIdx = Math.max(0, (prevGroup?.items?.length || 1) - 1);
      activeMediaKeyRef.current = `${prevGroupIdx}-${targetItemIdx}`;
      currentGroupIdxRef.current = prevGroupIdx;
      currentItemIdxRef.current = targetItemIdx;
      setCurrentGroupIdx(prevGroupIdx);
      setCurrentItemIdx(targetItemIdx);

      if (groupTransitionTimeoutRef.current) clearTimeout(groupTransitionTimeoutRef.current);
      groupTransitionTimeoutRef.current = setTimeout(() => {
        isGroupTransitioningRef.current = false;
      }, 330);
    } else {
      // Eng birinchi team, eng birinchi story'da orqaga ketishga joy
      // qolmadi — story viewer'dan chiqib ketiladi.
      onClose();
    }
  };

  const goToNext = () => {
    if (animRef.current) {
      animRef.current.stop();
      animRef.current = null;
    }
    progressAnim.stopAnimation();
    progressAnim.setValue(0);
    currentProgressVal.current = 0;

    const its = getCurrentItemsFromRef();
    const itemIdx = currentItemIdxRef.current;

    if (itemIdx < its.length - 1) {
      // Crossfade transition to next item
      Animated.sequence([
        Animated.timing(mediaFadeAnim, { toValue: 0.1, duration: 60, useNativeDriver: true }),
        Animated.timing(mediaFadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();

      const nextIdx = itemIdx + 1;
      activeMediaKeyRef.current = `${currentGroupIdxRef.current}-${nextIdx}`;
      currentItemIdxRef.current = nextIdx;
      setCurrentItemIdx(nextIdx);
    } else {
      animateToNextTeam();
    }
  };

  const goToPrev = () => {
    if (animRef.current) {
      animRef.current.stop();
      animRef.current = null;
    }
    progressAnim.stopAnimation();
    progressAnim.setValue(0);
    currentProgressVal.current = 0;

    const itemIdx = currentItemIdxRef.current;

    if (itemIdx > 0) {
      // Crossfade transition to prev item
      Animated.sequence([
        Animated.timing(mediaFadeAnim, { toValue: 0.1, duration: 60, useNativeDriver: true }),
        Animated.timing(mediaFadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();

      const prevIdx = itemIdx - 1;
      activeMediaKeyRef.current = `${currentGroupIdxRef.current}-${prevIdx}`;
      currentItemIdxRef.current = prevIdx;
      setCurrentItemIdx(prevIdx);
    } else {
      animateToPrevTeam();
    }
  };

  // UNIFIED HIGH-PERFORMANCE 60FPS PAN RESPONDER
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });

  const panResponder = useRef(
    PanResponder.create({
      // MUHIM: bu yerda isGroupTransitioningRef TEKSHIRILMAYDI — chunki agar
      // ref biror sababdan "true"da qotib qolsa, PanResponder BUTUNLAY
      // gesture'larni ushlashni to'xtatib qo'yar edi (story umuman bosilmay
      // qolardi). Qayta-kirish himoyasi endi faqat animateToNextTeam/
      // animateToPrevTeam FUNKSIYALARI ICHIDA, setTimeout bilan kafolatlangan
      // holda amalga oshiriladi (pastga qarang).
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10;
      },
      onPanResponderGrant: (evt) => {
        touchStartRef.current = {
          x: evt.nativeEvent.pageX,
          y: evt.nativeEvent.pageY,
          time: Date.now(),
        };
        isHoldingRef.current = false;

        // Start Hold-to-Pause timer (200ms)
        if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
        holdTimerRef.current = setTimeout(() => {
          isHoldingRef.current = true;
          setIsPaused(true);
          Animated.timing(uiOpacity, {
            toValue: 0,
            duration: 140,
            useNativeDriver: true,
          }).start();
        }, 180);
      },
      onPanResponderMove: (_, gestureState) => {
        // If moved more than threshold, cancel hold timer
        if (Math.abs(gestureState.dx) > 8 || Math.abs(gestureState.dy) > 8) {
          if (holdTimerRef.current) {
            clearTimeout(holdTimerRef.current);
            holdTimerRef.current = null;
          }
        }

        // Gorizontal svayp endi barmoq bilan "jonli" kuzatilmaydi (3D kub
        // effekti olib tashlandi) — yo'nalish/masofa faqat `onPanResponderRelease`da
        // hisoblanadi, animatsiya esa oddiy crossfade (yuqoriga qarang).
        if (gestureState.dy > 0 && gestureState.dy > Math.abs(gestureState.dx)) {
          // Vertical Pull Down
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (holdTimerRef.current) {
          clearTimeout(holdTimerRef.current);
          holdTimerRef.current = null;
        }

        const elapsed = Date.now() - touchStartRef.current.time;
        const totalMove = Math.hypot(gestureState.dx, gestureState.dy);

        // Case 1: User was holding to pause -> Resume video and show UI
        if (isHoldingRef.current) {
          isHoldingRef.current = false;
          setIsPaused(false);
          Animated.timing(uiOpacity, {
            toValue: 1,
            duration: 140,
            useNativeDriver: true,
          }).start();
          return;
        }

        // Case 2: User tapped quickly without moving (< 10px move & < 250ms)
        if (totalMove < 10 && elapsed < 250) {
          const touchX = evt.nativeEvent.pageX;
          if (touchX < width * 0.33) {
            goToPrev();
          } else {
            goToNext();
          }
          return;
        }

        // Case 3: Vertical Swipe to Close (> 120px down)
        if (gestureState.dy > 100 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx)) {
          Animated.timing(panY, {
            toValue: height,
            duration: 180,
            useNativeDriver: true,
          }).start(() => onClose());
          return;
        }

        // Case 4: Horizontal Swipe (team almashtirish — endi oddiy crossfade)
        if (gestureState.dx < -50 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy)) {
          animateToNextTeam();
          return;
        }

        if (gestureState.dx > 50 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy)) {
          animateToPrevTeam();
          return;
        }

        // Case 5: Spring back to center (faqat vertikal pull-down uchun kerak)
        Animated.spring(panY, {
          toValue: 0,
          friction: 8,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const toggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  const handleGoToMatch = () => {
    if (currentItem?.matchId && onNavigateMatch) {
      onClose();
      onNavigateMatch(currentItem.matchId);
    }
  };

  const handleLikePress = async () => {
    if (isGuest || !isAuthenticated || !userId) {
      Alert.alert(
        t('auth.login_title', "Tizimga kiring"),
        t('stories.login_to_like', "Storisga layk bosish uchun avval tizimga kiring yoki ro'yxatdan o'ting."),
        [
          { text: t('common.cancel', "Bekor qilish"), style: "cancel" },
          { 
            text: t('auth.login', "Kirish"), 
            onPress: () => { 
              onClose(); 
              if (onNavigateMatch) onNavigateMatch('auth'); 
            } 
          }
        ]
      );
      return;
    }

    if (!currentItem?.id) return;

    // Optimistic UI update
    const nextLiked = !isLiked;
    const nextCount = nextLiked ? likesCount + 1 : Math.max(0, likesCount - 1);
    setIsLiked(nextLiked);
    setLikesCount(nextCount);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    Animated.sequence([
      Animated.timing(heartScale, {
        toValue: 1.35,
        duration: 110,
        useNativeDriver: true,
      }),
      Animated.spring(heartScale, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();

    // Persist to database & storage
    const res = await storyService.toggleLikeStory(currentItem.id, String(userId));
    setIsLiked(res.isLiked);
    setLikesCount(res.likesCount);
  };

  const handleSharePress = async () => {
    try {
      const matchTitle = currentItem?.homeTeam?.name && currentItem?.awayTeam?.name
        ? `${currentItem.homeTeam.name} vs ${currentItem.awayTeam.name}`
        : (currentItem?.title || currentGroup?.title || 'Amatora Stories');

      const shareMessage = `⚽ ${matchTitle}\n📲 ${t('stories.watch_on_amatora', 'Amatora ilovasida tomosha qiling!')}`;
      await Share.share({
        message: shareMessage,
        title: matchTitle,
      });
    } catch {}
  };

  if (!visible || !currentGroup || !currentItem) return null;

  const hasVideo = isVideo;
  const isPlayerStory = !hasVideo && !!(currentItem.playerName || currentItem.playerPhoto);
  const isMatchStory = !!(currentItem.homeTeam || currentItem.awayTeam || currentItem.matchScore || currentItem.matchId);
  const relativeTimeStr = formatLocalizedRelativeTime(currentItem.createdAt || currentGroup.createdAt, i18n.language);

  const SHIMMER_BAND_WIDTH = width * 0.55;
  const shimmerTranslateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-SHIMMER_BAND_WIDTH, width + SHIMMER_BAND_WIDTH],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

      <View style={{ flex: 1, backgroundColor: '#000000' }}>
        <Animated.View
          style={[
            styles.container,
            {
              backgroundColor: isDark ? '#000000' : homeColors.background,
              transform: [
                { translateY: panY },
              ],
            },
          ]}
          {...panResponder.panHandlers}
        >
          {/* VIDEO / VISUAL MEDIA PRESENTATION WITH SILKY SMOOTH CROSSFADE */}
          <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: mediaFadeAnim }]}>
            {hasVideo ? (
              <View style={[styles.mediaContainer, { backgroundColor: isDark ? '#05070A' : '#10141E' }]}>
                {/* FULL FORMAT UNCLIPPED VIDEO WITH RESIZE MODE CONTAIN */}
                <Video
                  key={`story_vid_${currentGroupIdx}_${currentItemIdx}_${currentItem?.id || cachedVideoUri}`}
                  ref={videoRef}
                  source={{ uri: cachedVideoUri! }}
                  style={styles.media}
                  resizeMode={ResizeMode.CONTAIN}
                  shouldPlay={!isPaused}
                  isLooping={false}
                  isMuted={isMuted}
                  positionMillis={0}
                  progressUpdateIntervalMillis={50}
                  onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
                  onLoad={() => {
                    setMediaLoading(false);
                    videoRef.current?.setPositionAsync(0).catch(() => {});
                  }}
                  onError={() => {
                    setMediaLoading(false);
                  }}
                />
              </View>
            ) : (
              /* Matchday Stadium Graphic Canvas (When not video) */
              <LinearGradient
                colors={isDark ? ['#04160E', '#0A2B1C', '#030E09'] : ['#E8F5E9', '#C8E6C9', '#A5D6A7']}
                style={StyleSheet.absoluteFillObject}
              >
                <View style={styles.fieldPattern}>
                  <View style={[styles.fieldCenterCircle, { borderColor: homeColors.accent }]} />
                  <View style={[styles.fieldCenterLine, { backgroundColor: homeColors.accent }]} />
                  <View style={[styles.fieldFloodlightGlow, { backgroundColor: homeColors.accent }]} />
                </View>
              </LinearGradient>
            )}

            {/* Center Graphic Showcase (Only when not playing video) */}
            {!hasVideo && isPlayerStory && (
              <View style={styles.centerCanvasContainer}>
                <View style={[styles.playerShowcaseCard, { backgroundColor: isDark ? 'rgba(5, 20, 14, 0.75)' : 'rgba(255, 255, 255, 0.92)', borderColor: homeColors.border }]}>
                  <View style={[styles.categoryPill, { backgroundColor: isDark ? 'rgba(0, 223, 130, 0.18)' : 'rgba(0, 200, 100, 0.12)', borderColor: homeColors.accent }]}>
                    <Ionicons name="sparkles" size={13} color={homeColors.accent} />
                    <Text style={[styles.categoryPillText, { color: homeColors.accent }]}>
                      {t('stories.top_scorer_leader', "TOP TO'PURAR / YETAKCHI")}
                    </Text>
                  </View>

                  <View style={styles.playerAvatarWrapper}>
                    <View style={[styles.playerHaloAura, { backgroundColor: homeColors.accent }]} />
                    {currentItem.playerPhoto ? (
                      <Image
                        source={{ uri: currentItem.playerPhoto }}
                        style={[styles.playerAvatarLarge, { borderColor: homeColors.accent }]}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.playerAvatarLarge, styles.playerAvatarPlaceholder, { borderColor: homeColors.accent }]}>
                        <FontAwesome5 name="user-alt" size={48} color={homeColors.accent} />
                      </View>
                    )}
                    <View style={styles.playerStarBadge}>
                      <Ionicons name="star" size={12} color="#050A14" />
                      <Text style={styles.playerStarText}>9.3</Text>
                    </View>
                  </View>

                  <Text style={[styles.playerMainName, { color: isDark ? '#FFFFFF' : homeColors.textPrimary }]}>
                    {(currentItem.playerName || t('teams.player_fallback', "O'YINCHI")).toUpperCase()}
                  </Text>
                  <Text style={[styles.playerSubTitle, { color: homeColors.accent }]}>
                    {currentItem.subtitle || t('stories.league_leader', 'Amatora Liga Yetakchisi')}
                  </Text>
                </View>
              </View>
            )}

            {/* Loading Spinner + Shimmer — video hali keshlanmoqda/yuklanmoqda
                paytida ekran bo'sh/qotib qolgandek ko'rinmasligi uchun
                (mediaFadeAnim ostida bo'lgani uchun bu ham silliq fade bilan
                chiqadi/kiradi). Shimmer — chapdan o'ngga uzluksiz o'tib
                turadigan yorug' chiziq ("skelet" effekti). */}
            {mediaLoading && (
              <View style={styles.loadingOverlay} pointerEvents="none">
                <View style={[StyleSheet.absoluteFillObject, { overflow: 'hidden' }]}>
                  <Animated.View
                    style={[
                      StyleSheet.absoluteFillObject,
                      { width: SHIMMER_BAND_WIDTH, transform: [{ translateX: shimmerTranslateX }] },
                    ]}
                  >
                    <LinearGradient
                      colors={['transparent', 'rgba(255, 255, 255, 0.22)', 'transparent']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={StyleSheet.absoluteFillObject}
                    />
                  </Animated.View>
                </View>
              </View>
            )}
          </Animated.View>

          {/* UI OVERLAYS (Fades out when user holds down to pause) */}
          <Animated.View
            style={[
              StyleSheet.absoluteFillObject,
              {
                opacity: uiOpacity,
                zIndex: 20,
              },
            ]}
            pointerEvents="box-none"
          >
            {/* Top Vignette Gradient */}
            <LinearGradient
              colors={isDark ? ['rgba(0, 0, 0, 0.85)', 'rgba(0, 0, 0, 0.35)', 'transparent'] : ['rgba(0, 0, 0, 0.65)', 'rgba(0, 0, 0, 0.25)', 'transparent']}
              style={styles.topGradient}
              pointerEvents="none"
            />

            {/* Bottom Vignette Gradient */}
            <LinearGradient
              colors={isDark ? ['transparent', 'rgba(0, 0, 0, 0.65)', 'rgba(0, 0, 0, 0.95)'] : ['transparent', 'rgba(0, 0, 0, 0.45)', 'rgba(0, 0, 0, 0.85)']}
              style={styles.bottomGradient}
              pointerEvents="none"
            />

            {/* Multi-Segment Progress Bars */}
            <View style={styles.progressContainer}>
              {items.map((_, idx) => {
                let widthPercent: any = '0%';
                if (idx < currentItemIdx) {
                  widthPercent = '100%';
                } else if (idx === currentItemIdx) {
                  widthPercent = progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                    extrapolate: 'clamp',
                  });
                }

                return (
                  <View key={`seg-${idx}`} style={[styles.progressBarBackground, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.4)' }]}>
                    <Animated.View
                      style={[
                        styles.progressBarActive,
                        {
                          width: widthPercent,
                          backgroundColor: '#FFFFFF',
                        },
                      ]}
                    />
                  </View>
                );
              })}

              {/* Progress bar ustidan ham xuddi shu shimmer — video hali
                  yuklanayotganini tepadagi chiziqda ham ko'rsatadi. */}
              {mediaLoading && (
                <View style={[StyleSheet.absoluteFillObject, { overflow: 'hidden' }]} pointerEvents="none">
                  <Animated.View
                    style={[
                      StyleSheet.absoluteFillObject,
                      { width: SHIMMER_BAND_WIDTH, transform: [{ translateX: shimmerTranslateX }] },
                    ]}
                  >
                    <LinearGradient
                      colors={['transparent', 'rgba(255, 255, 255, 0.7)', 'transparent']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={StyleSheet.absoluteFillObject}
                    />
                  </Animated.View>
                </View>
              )}
            </View>

            {/* Header Bar */}
            <View style={styles.headerBar}>
              <View style={styles.authorInfo}>
                <SmartImage
                  uri={currentGroup.avatarUrl}
                  style={[styles.authorAvatar, { borderColor: homeColors.accent }]}
                  contentFit="cover"
                  fallbackIcon="person-outline"
                  fallbackIconSize={20}
                />
                <View style={{ flex: 1 }}>
                  <View style={styles.titleRow}>
                    <Text style={styles.authorTitle} numberOfLines={1}>
                      {currentGroup.title}
                    </Text>
                    {relativeTimeStr ? (
                      <>
                        <Text style={styles.timeAgoDot}>•</Text>
                        <Text style={styles.timeAgoText}>{relativeTimeStr}</Text>
                      </>
                    ) : null}
                    {currentGroup.isLive && (
                      <View style={styles.headerLiveBadge}>
                        <Text style={styles.headerLiveText}>LIVE</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.authorSubtitle} numberOfLines={1}>
                    {currentItem.subtitle || currentGroup.subtitle || "Amatora Match Stories"}
                  </Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.headerActions}>
                {hasVideo && (
                  <TouchableOpacity
                    style={styles.iconCircle}
                    onPress={toggleMute}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isMuted ? 'volume-mute' : 'volume-high'}
                      size={18}
                      color="#FFFFFF"
                    />
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.iconCircle}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* BOTTOM MATCH CARD & SCORE OVERLAY WITH SOCIAL INTERACTIONS */}
            {isMatchStory && (
              <View style={styles.bottomCardContainer}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={handleGoToMatch}
                  style={[
                    styles.matchGlassCard,
                    {
                      backgroundColor: isDark ? 'rgba(12, 17, 26, 0.94)' : 'rgba(255, 255, 255, 0.96)',
                      borderColor: homeColors.border,
                    },
                  ]}
                >
                  {/* Card Top Row: Match Time / Status + Round */}
                  <View style={styles.cardTopHeader}>
                    <View style={styles.cardHeaderLeft}>
                      <Ionicons name="trophy-outline" size={13} color={homeColors.accent} />
                      <Text style={[styles.cardHeaderLeagueText, { color: homeColors.textPrimary }]} numberOfLines={1}>
                        {(currentItem.tournamentName || 'AMATORA LIGA').toUpperCase()}
                        {currentItem.round ? ` • ${t('stories.round_tour', '{{round}}-TUR', { round: currentItem.round })}` : ''}
                      </Text>
                    </View>

                    <View style={styles.cardHeaderRight}>
                      {currentGroup.isLive || currentItem.status === 'live' ? (
                        <View style={styles.cardLivePill}>
                          <View style={styles.cardLiveDot} />
                          <Text style={styles.cardLiveText}>LIVE</Text>
                        </View>
                      ) : (
                        <View style={[styles.cardTimePill, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }]}>
                          <Ionicons name="time-outline" size={11} color={homeColors.textSecondary} />
                          <Text style={[styles.cardTimeText, { color: homeColors.textSecondary }]}>
                            {currentItem.matchTime || (currentItem.matchScore ? t('stories.finished', 'YAKUNLANGAN') : '19:00')}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Card Divider */}
                  <View style={[styles.cardDivider, { backgroundColor: homeColors.border }]} />

                  {/* Teams Clash & Score Row */}
                  <View style={styles.cardClashRow}>
                    {/* Home Team */}
                    <View style={styles.cardTeamCol}>
                      <View style={[styles.cardTeamLogoBox, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)', borderColor: homeColors.border }]}>
                        {currentItem.homeTeam?.logo ? (
                          <SmartImage
                            uri={currentItem.homeTeam.logo}
                            style={styles.cardTeamLogo}
                            contentFit="contain"
                            fallbackIcon="shield-outline"
                          />
                        ) : (
                          <Ionicons name="shield-outline" size={20} color={homeColors.accent} />
                        )}
                      </View>
                      <Text style={[styles.cardTeamName, { color: homeColors.textPrimary }]} numberOfLines={1}>
                        {(currentItem.homeTeam?.name || t('matches.home_team', 'MEZBON')).toUpperCase()}
                      </Text>
                    </View>

                    {/* Center Score / VS */}
                    <View style={styles.cardScoreCenter}>
                      {currentItem.matchScore ? (
                        <View style={styles.scoreNumberBox}>
                          <Text style={[styles.scoreNumberText, { color: homeColors.textPrimary }]}>
                            {currentItem.matchScore.home} : {currentItem.matchScore.away}
                          </Text>
                          {currentItem.minute ? (
                            <View style={[styles.minuteGoalPill, { backgroundColor: isDark ? 'rgba(0, 223, 130, 0.15)' : 'rgba(0, 200, 100, 0.12)', borderColor: homeColors.accent }]}>
                              <Text style={[styles.minuteGoalText, { color: homeColors.accent }]}>
                                {currentItem.minute}&apos; {t('stories.goal', 'GOL')}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      ) : (
                        <View style={[styles.vsBox, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }]}>
                          <Text style={[styles.vsText, { color: homeColors.textSecondary }]}>VS</Text>
                        </View>
                      )}
                    </View>

                    {/* Away Team */}
                    <View style={styles.cardTeamCol}>
                      <View style={[styles.cardTeamLogoBox, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)', borderColor: homeColors.border }]}>
                        {currentItem.awayTeam?.logo ? (
                          <SmartImage
                            uri={currentItem.awayTeam.logo}
                            style={styles.cardTeamLogo}
                            contentFit="contain"
                            fallbackIcon="shield-outline"
                          />
                        ) : (
                          <Ionicons name="shield-outline" size={20} color={homeColors.accent} />
                        )}
                      </View>
                      <Text style={[styles.cardTeamName, { color: homeColors.textPrimary }]} numberOfLines={1}>
                        {(currentItem.awayTeam?.name || t('matches.away_team', 'MEHMON')).toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {/* Scorer Info if available */}
                  {currentItem.playerName && (
                    <View style={[styles.cardScorerRow, { borderTopColor: homeColors.border }]}>
                      <Ionicons name="football" size={12} color={homeColors.accent} />
                      <Text style={[styles.cardScorerText, { color: homeColors.accent }]} numberOfLines={1}>
                        {currentItem.playerName} {currentItem.minute ? `(${currentItem.minute}')` : ''}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* SOCIAL INTERACTIONS ROW (Transparent, Views on Left, Share & Like on Right - Crisp White) */}
                <View style={styles.socialBarRow}>
                  {/* Views Count (Left side, no background, always white) */}
                  <View style={styles.socialViewsGroup}>
                    <Ionicons
                      name="eye-outline"
                      size={17}
                      color="rgba(255, 255, 255, 0.9)"
                    />
                    <Text
                      style={[
                        styles.socialViewsText,
                        { color: '#FFFFFF' },
                      ]}
                    >
                      {viewsCount > 0 ? viewsCount : 1}
                    </Text>
                  </View>

                  {/* Action Buttons (Right side: Share & Like) */}
                  <View style={styles.socialActionsGroup}>
                    {/* Share Button */}
                    <TouchableOpacity
                      style={styles.socialIconBtn}
                      onPress={handleSharePress}
                      activeOpacity={0.7}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                      <Ionicons
                        name="paper-plane-outline"
                        size={21}
                        color="#FFFFFF"
                      />
                    </TouchableOpacity>

                    {/* Like Button */}
                    <TouchableOpacity
                      style={styles.socialLikeBtn}
                      onPress={handleLikePress}
                      activeOpacity={0.8}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                      <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                        <Ionicons
                          name={isLiked ? "heart" : "heart-outline"}
                          size={23}
                          color={isLiked ? "#EF4444" : "#FFFFFF"}
                        />
                      </Animated.View>
                      {likesCount > 0 && (
                        <Text
                          style={[
                            styles.socialLikeCount,
                            { color: isLiked ? '#EF4444' : '#FFFFFF' },
                            isLiked && { fontWeight: '900' },
                          ]}
                        >
                          {likesCount}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mediaContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 8,
  },
  fieldPattern: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldCenterCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1.5,
    opacity: 0.35,
  },
  fieldCenterLine: {
    position: 'absolute',
    width: '100%',
    height: 1.5,
    opacity: 0.35,
  },
  fieldFloodlightGlow: {
    position: 'absolute',
    top: '25%',
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.12,
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 140,
    zIndex: 10,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 220,
    zIndex: 10,
  },
  progressContainer: {
    flexDirection: 'row',
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : 36,
    left: 12,
    right: 12,
    gap: 4,
    zIndex: 20,
  },
  progressBarBackground: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarActive: {
    height: '100%',
    borderRadius: 2,
  },
  headerBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 64 : 48,
    left: 14,
    right: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 20,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  authorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  authorTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timeAgoDot: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
  },
  timeAgoText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 11,
    fontWeight: '600',
  },
  headerLiveBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    marginLeft: 2,
  },
  headerLiveText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  authorSubtitle: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 11,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  centerCanvasContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 5,
  },
  playerShowcaseCard: {
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  playerAvatarWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  playerHaloAura: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    opacity: 0.2,
  },
  playerAvatarLarge: {
    width: 115,
    height: 115,
    borderRadius: 58,
    borderWidth: 2.5,
  },
  playerAvatarPlaceholder: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerStarBadge: {
    position: 'absolute',
    bottom: -6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  playerStarText: {
    color: '#050A14',
    fontWeight: '900',
    fontSize: 11,
  },
  playerMainName: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.8,
    textAlign: 'center',
    marginTop: 4,
  },
  playerSubTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    marginTop: 3,
    textAlign: 'center',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4.5,
    borderRadius: 14,
    marginBottom: 8,
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },

  /* BOTTOM MATCH CARD STYLES */
  bottomCardContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 34 : 20,
    left: 14,
    right: 14,
    zIndex: 20,
  },
  matchGlassCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  cardTopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
    marginRight: 8,
  },
  cardHeaderLeagueText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardLivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: '#EF4444',
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cardLiveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#EF4444',
  },
  cardLiveText: {
    color: '#EF4444',
    fontSize: 9,
    fontWeight: '900',
  },
  cardTimePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cardTimeText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  cardDivider: {
    height: 1,
    marginVertical: 9,
  },
  cardClashRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTeamCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  cardTeamLogoBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cardTeamLogo: {
    width: 28,
    height: 28,
  },
  cardTeamName: {
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    width: '100%',
  },
  cardScoreCenter: {
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumberBox: {
    alignItems: 'center',
  },
  scoreNumberText: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  minuteGoalPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
    borderWidth: 0.5,
  },
  minuteGoalText: {
    fontSize: 8.5,
    fontWeight: '800',
  },
  vsBox: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  vsText: {
    fontSize: 12,
    fontWeight: '900',
  },
  cardScorerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
  },
  cardScorerText: {
    fontSize: 10,
    fontWeight: '700',
  },

  /* SOCIAL BAR STYLES (Clean & Transparent) */
  socialBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingHorizontal: 4,
  },
  socialViewsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  socialViewsText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  socialActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  socialIconBtn: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.6,
    shadowRadius: 3,
  },
  socialAddBtn: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.6,
    shadowRadius: 3,
  },
  socialLikeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.6,
    shadowRadius: 3,
  },
  socialLikeCount: {
    fontSize: 12.5,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});

