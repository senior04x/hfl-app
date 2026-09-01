import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../store/useThemeStore';
import { getHomeScreenColors } from '../constants/homeTheme';

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
    searchPlaceholder,
    onBackPress,
    rightElement,
}) => {
    const { t } = useTranslation();
    const { isDark } = useThemeStore();
    const homeColors = getHomeScreenColors(isDark);
    const resolvedPlaceholder = searchPlaceholder || t('common.search', 'Qidiruv...');

    return (
        <View style={[styles.navbarContainer, { backgroundColor: homeColors.background }]}>
            <View style={styles.navbarInner}>
                {/* Left Section: Back Button (if provided) + Title/Subtitle */}
                <View style={styles.leftSection}>
                    {onBackPress ? (
                        <TouchableOpacity
                            style={[
                                styles.backButton,
                                {
                                    backgroundColor: isDark ? '#181818' : '#F2F2F4',
                                    borderColor: homeColors.border,
                                }
                            ]}
                            onPress={onBackPress}
                            activeOpacity={0.7}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Ionicons name="chevron-back" size={20} color={homeColors.textPrimary} />
                        </TouchableOpacity>
                    ) : null}

                    <View style={styles.titleColumn}>
                        {subtitle ? (
                            <Text style={[styles.subtitleText, { color: homeColors.textSecondary }]} numberOfLines={1}>
                                {subtitle.toUpperCase()}
                            </Text>
                        ) : null}
                        <Text style={[styles.titleText, { color: homeColors.textPrimary }]} numberOfLines={1}>
                            {title.toUpperCase()}
                        </Text>
                    </View>
                </View>

                {/* Right Section: Search Input or Custom Right Element */}
                <View style={styles.rightSection}>
                    {showSearch ? (
                        <View style={[
                            styles.searchContainer,
                            {
                                backgroundColor: isDark ? '#181818' : '#F2F2F4',
                                borderColor: homeColors.border,
                            }
                        ]}>
                            <TextInput
                                style={[styles.searchInput, { color: homeColors.textPrimary }]}
                                placeholder={resolvedPlaceholder}
                                placeholderTextColor={homeColors.textSecondary}
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
                                    <Ionicons name="close-circle" size={18} color={homeColors.textSecondary} />
                                </TouchableOpacity>
                            ) : (
                                <Ionicons name="search" size={17} color={homeColors.textSecondary} />
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
        borderBottomWidth: 0,
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
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    titleColumn: {
        flexDirection: 'column',
        justifyContent: 'center',
    },
    subtitleText: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 2,
        marginBottom: 1,
    },
    titleText: {
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
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 12,
        height: 38,
        width: 145,
    },
    searchInput: {
        flex: 1,
        fontSize: 12,
        fontWeight: '600',
        padding: 0,
        marginRight: 4,
    },
});

export default AppNavbar;

