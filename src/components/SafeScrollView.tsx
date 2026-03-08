import React from 'react';
import { ScrollView, ScrollViewProps } from 'react-native';

interface SafeScrollViewProps extends ScrollViewProps {
  children: React.ReactNode;
}

const SafeScrollView: React.FC<SafeScrollViewProps> = ({ 
  children, 
  onScroll,
  ...props 
}) => {
  // onScroll prop'ini to'g'ri formatda qaytarish
  const handleScroll = (event: any) => {
    if (onScroll) {
      if (typeof onScroll === 'function') {
        onScroll(event);
      } else if (onScroll && typeof onScroll === 'object') {
        // onScroll object bo'lsa (Animated.event dan kelgan), uni to'g'ri handle qilish
        const scrollObj = onScroll as any;
        if (scrollObj._listener && typeof scrollObj._listener === 'function') {
          scrollObj._listener(event);
        } else if (scrollObj.listener && typeof scrollObj.listener === 'function') {
          scrollObj.listener(event);
        } else {
          console.log('onScroll object detected but no valid listener:', onScroll);
        }
      }
    }
  };

  return (
    <ScrollView
      {...props}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
      bounces={false}
      removeClippedSubviews={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
};

export default SafeScrollView;
