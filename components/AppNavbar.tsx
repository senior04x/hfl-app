import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

interface AppNavbarProps {
    title: string;
    subtitle?: string;
    showSearch?: boolean;
    searchQuery?: string;
    onSearchChange?: (text: string) => void;
    searchPlaceholder?: string;
    onBackPress?: () => void;
    rightElement?: React.ReactNode;
}

export const AppNavbar: React.FC<AppNavbarProps> = ({
    title,
    subtitle = 'AMATORA',
    showSearch = false,
    searchQuery = '',
    onSearchChange,
    searchPlaceholder = 'Qidiruv...',
    onBackPress,
    rightElement,
}) => {
    return (
        <View style={styles.navbarContainer}>
            <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={styles.navbarInner}>
                {/* Left Section: Back Button (if provided) + Title/Subtitle */}
                <View style={styles.leftSection}>
                    {onBackPress ? (
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={onBackPress}
                            activeOpacity={0.7}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                    ) : null}

                    <View style={styles.titleColumn}>
                        {subtitle ? (
                            <Text style={styles.subtitleText} numberOfLines={1}>
                                {subtitle.toUpperCase()}
                            </Text>
                        ) : null}
                        <Text style={styles.titleText} numberOfLines={1}>
                            {title.toUpperCase()}
                        </Text>
                    </View>
                </View>

                {/* Right Section: Search Input or Custom Right Element */}
                <View style={styles.rightSection}>
                    {showSearch ? (
                        <View style={styles.searchContainer}>
                            <TextInput
                                style={styles.searchInput}
                                placeholder={searchPlaceholder}
                                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                                value={searchQuery}
                                onChangeText={onSearchChange}
                                returnKeyType="search"
                                autoCorrect={false}
                                autoCapitalize="none"
                            />
                            {searchQuery ? (
                                <TouchableOpacity 
                                    onPress={() => onSearchChange && onSearchChange('')}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="close-circle" size={18} color="rgba(255, 255, 255, 0.75)" />
                                </TouchableOpacity>
                            ) : (
                                <Ionicons name="search" size={17} color="rgba(255, 255, 255, 0.6)" />
                            )}
                        </View>
                    ) : rightElement ? (
                        rightElement
                    ) : null}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    navbarContainer: {
        width: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.06)',
        overflow: 'hidden',
        zIndex: 100,
    },
    navbarInner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        minHeight: 58,
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 10,
    },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    titleColumn: {
        flexDirection: 'column',
        justifyContent: 'center',
    },
    subtitleText: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 2,
        marginBottom: 1,
    },
    titleText: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    rightSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
        paddingHorizontal: 12,
        height: 38,
        width: 145,
    },
    searchInput: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
        padding: 0,
        marginRight: 4,
    },
});

export default AppNavbar;
