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
    if (onScroll && typeof onScroll === 'function') {
      onScroll(event);
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
