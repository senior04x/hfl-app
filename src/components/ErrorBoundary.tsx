import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../store/useThemeStore';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ErrorFallback 
        error={this.state.error} 
        errorInfo={this.state.errorInfo} 
        onRetry={this.handleRetry} 
      />;
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error?: Error;
  errorInfo?: ErrorInfo;
  onRetry: () => void;
}

function ErrorFallback({ error, errorInfo, onRetry }: ErrorFallbackProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: colors.error + '20' }]}>
            <Ionicons name="warning" size={24} color={colors.error} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            Xatolik yuz berdi
          </Text>
        </View>
        
        <View style={styles.content}>
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            Kutilmagan xatolik yuz berdi. Iltimos, qayta urinib ko'ring.
          </Text>
          
          {__DEV__ && error && (
            <ScrollView style={[styles.errorDetails, { backgroundColor: colors.background }]}>
              <Text style={[styles.errorTitle, { color: colors.text }]}>
                Xatolik tafsilotlari:
              </Text>
              <Text style={[styles.errorText, { color: colors.error }]}>
                {error.toString()}
              </Text>
              {errorInfo?.componentStack && (
                <Text style={[styles.errorText, { color: colors.error }]}>
                  {errorInfo.componentStack}
                </Text>
              )}
            </ScrollView>
          )}
          
          <View style={styles.buttons}>
            <TouchableOpacity 
              style={[styles.retryButton, { backgroundColor: colors.primary }]}
              onPress={onRetry}
            >
              <Ionicons name="refresh" size={16} color="white" />
              <Text style={styles.buttonText}>Qayta urinish</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  content: {
    alignItems: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  errorDetails: {
    width: '100%',
    maxHeight: 200,
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
