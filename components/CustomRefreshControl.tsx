import React from 'react';
import { RefreshControl, RefreshControlProps } from 'react-native';
import Colors from '../constants/Colors';

interface CustomRefreshControlProps extends Omit<RefreshControlProps, 'refreshing' | 'onRefresh'> {
  refreshing: boolean;
  onRefresh: () => void;
}

export default function CustomRefreshControl({
  refreshing,
  onRefresh,
  ...props
}: CustomRefreshControlProps) {
  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={Colors.primary || '#00FF66'}
      colors={[Colors.primary || '#00FF66', '#00F2FE', '#3B82F6']}
      progressBackgroundColor="#1E1E32"
      {...props}
    />
  );
}
