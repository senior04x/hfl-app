import React, { createContext, useContext, useState, useCallback } from 'react';

interface TabSwipeContextType {
    isSwipeDisabled: boolean;
    setSwipeDisabled: (disabled: boolean) => void;
}

const TabSwipeContext = createContext<TabSwipeContextType>({
    isSwipeDisabled: false,
    setSwipeDisabled: () => {},
});

export const TabSwipeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isSwipeDisabled, setIsSwipeDisabled] = useState(false);

    const setSwipeDisabled = useCallback((disabled: boolean) => {
        setIsSwipeDisabled(disabled);
    }, []);

    return (
        <TabSwipeContext.Provider value={{ isSwipeDisabled, setSwipeDisabled }}>
            {children}
        </TabSwipeContext.Provider>
    );
};

export const useTabSwipe = () => useContext(TabSwipeContext);
