import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface JuniorState {
    isJuniorMode: boolean;
    pinCode: string;
    setJuniorMode: (active: boolean) => void;
    setPinCode: (pin: string) => void;
    verifyPin: (inputPin: string) => boolean;
}

export const useJuniorStore = create<JuniorState>()(
    persist(
        (set, get) => ({
            isJuniorMode: false,
            pinCode: '1234',
            setJuniorMode: (active: boolean) => set({ isJuniorMode: active }),
            setPinCode: (pin: string) => set({ pinCode: pin }),
            verifyPin: (inputPin: string) => {
                return inputPin.trim() === (get().pinCode || '1234');
            },
        }),
        {
            name: 'hfl-junior-mode-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
