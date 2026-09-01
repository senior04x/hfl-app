import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Image,
    ScrollView,
    Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { supabase } from '../services/apiService';
import { useOrganizationStore } from '../store/useOrganizationStore';
import Skeleton from './Skeleton';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../store/useThemeStore';
import { getHomeScreenColors } from '../constants/homeTheme';

const { width } = Dimensions.get('window');

interface OrganizationSelectModalProps {
    visible: boolean;
    onClose: () => void;
    onSelect?: (org: any) => void;
    isApplyMode?: boolean;
    title?: string;
    subtitle?: string;
}

export default function OrganizationSelectModal({
    visible,
    onClose,
    onSelect,
    isApplyMode = false,
    title,
    subtitle
}: OrganizationSelectModalProps) {
    const { t } = useTranslation();
    const { isDark } = useThemeStore();
    const homeColors = getHomeScreenColors(isDark);

    const { organizations, selectedOrganizationId, setSelectedOrganizationId, setOrganizations } = useOrganizationStore();
    
    // Instant cache-first state
    const [orgList, setOrgList] = useState<any[]>(organizations && organizations.length > 0 ? organizations : []);
    const [loading, setLoading] = useState(!organizations || organizations.length === 0);

    const loadOrganizations = async (isBackground = false) => {
        try {
            if (!isBackground) {
                setLoading(true);
            }
            const { data, error } = await supabase
                .from('organizations')
                .select('*')
                .order('created_at', { ascending: false });

            if (data && data.length > 0) {
                setOrgList(data);
                setOrganizations(data);
            } else if (!orgList || orgList.length === 0) {
                const fallback = [
                    { id: 1, name: 'Havas Futbol Ligasi', slug: 'hfl', logo_url: '' },
                    { id: 2, name: 'Amatora Junior Academy', slug: 'amatora-junior', logo_url: '' }
                ];
                setOrgList(fallback);
                setOrganizations(fallback);
            }
        } catch (e) {
            console.error('Error fetching organizations in modal:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (visible) {
            if (!organizations || organizations.length === 0) {
                loadOrganizations(false);
            } else {
                setOrgList(organizations);
                setLoading(false);
                // Silent background sync
                loadOrganizations(true);
            }
        }
    }, [visible]);

    const handleSelectOrg = async (org: any) => {
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch (e) {}
        if (!isApplyMode) {
            setSelectedOrganizationId(org.id);
        }
        if (onSelect) {
            onSelect(org);
        }
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={onClose}
                />
                
                <View style={[styles.modalCard, { backgroundColor: isDark ? '#161616' : '#FFFFFF', borderColor: homeColors.border }]}>
                    {/* Header */}
                    <View style={styles.headerRow}>
                        <View style={styles.headerTitleGroup}>
                            <View style={[styles.iconCircle, { backgroundColor: isDark ? '#222222' : '#F0F0F2', borderColor: homeColors.border }]}>
                                <Ionicons name={isApplyMode ? "globe-outline" : "business"} size={16} color={homeColors.textPrimary} />
                            </View>
                            <Text style={[styles.headerTitle, { color: homeColors.textPrimary }]}>
                                {title || (isApplyMode ? t('auth.select_org_title', 'Tashkilotni tanlang') : t('common.select_organization', 'Tashkilotni tanlang'))}
                            </Text>
                        </View>
                        <TouchableOpacity style={[styles.closeBtn, { backgroundColor: isDark ? '#222222' : '#F0F0F2' }]} onPress={onClose} activeOpacity={0.7}>
                            <Ionicons name="close" size={18} color={homeColors.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.subtitle, { color: homeColors.textSecondary }]}>
                        {subtitle || (isApplyMode 
                            ? t('auth.select_org_sub', "Ariza topshirish uchun kerakli sport tashkilotini tanlang") 
                            : t('common.select_organization_sub', 'Kerakli sport tashkilotini tanlang va uning barcha ligalarini ko\'ring'))}
                    </Text>

                    {/* Skeleton Loading or Content List */}
                    {loading ? (
                        <View style={styles.skeletonContainer}>
                            {[1, 2, 3].map((key) => (
                                <View key={key} style={[styles.skeletonItem, { backgroundColor: isDark ? '#1E1E1E' : '#F4F4F6' }]}>
                                    <Skeleton circle width={40} height={40} style={{ marginRight: 12 }} />
                                    <View style={{ flex: 1 }}>
                                        <Skeleton width="70%" height={15} borderRadius={4} style={{ marginBottom: 6 }} />
                                        <Skeleton width="40%" height={11} borderRadius={4} />
                                    </View>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={false}>
                            {orgList.map((org) => {
                                const isSelected = !isApplyMode && selectedOrganizationId === org.id;
                                const orgLogo = org.logo_url || org.logo || org.logoUrl;
                                const orgInitials = (org.slug || org.name || 'HFL').slice(0, 3).toUpperCase();
                                const orgSlug = org.slug || String(org.name || 'hfl').toLowerCase().replace(/\s+/g, '-');

                                return (
                                    <TouchableOpacity
                                        key={org.id}
                                        style={[
                                            styles.orgItem,
                                            { backgroundColor: isDark ? '#1E1E1E' : '#F5F5F7', borderColor: homeColors.border },
                                            isSelected && { borderColor: homeColors.textPrimary, backgroundColor: isDark ? '#262626' : '#ECECEE' }
                                        ]}
                                        onPress={() => handleSelectOrg(org)}
                                        activeOpacity={0.8}
                                    >
                                        {/* Logo or High-Visibility Initials Badge */}
                                        <View style={[styles.orgLogoBox, { backgroundColor: isDark ? '#282828' : '#E8E8EA', borderColor: homeColors.border }]}>
                                            {orgLogo && typeof orgLogo === 'string' && (orgLogo.startsWith('http') || orgLogo.length > 8) ? (
                                                <Image
                                                    source={{ uri: orgLogo }}
                                                    style={styles.orgLogoImg}
                                                    resizeMode="contain"
                                                />
                                            ) : (
                                                <View style={styles.initialsBox}>
                                                    <Ionicons 
                                                        name={isApplyMode ? "globe-outline" : "shield-checkmark"} 
                                                        size={18} 
                                                        color={homeColors.textPrimary} 
                                                    />
                                                    <Text style={[styles.initialsText, { color: homeColors.textPrimary }]}>
                                                        {orgInitials}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>

                                        {/* Info */}
                                        <View style={styles.orgInfo}>
                                            <Text
                                                style={[
                                                    styles.orgName,
                                                    { color: homeColors.textPrimary },
                                                    isSelected && { fontWeight: '800' }
                                                ]}
                                                numberOfLines={1}
                                            >
                                                {(org.name || 'TASHKILOT').toUpperCase()}
                                            </Text>
                                            <Text style={[styles.orgTag, { color: homeColors.textSecondary }]}>
                                                {isApplyMode ? `amatora.uz/${orgSlug}` : (org.slug ? `@${org.slug}` : 'Rasmiy Tashkilot')}
                                            </Text>
                                        </View>

                                        {/* Browser Redirect Icon OR Selection Checkmark */}
                                        {isApplyMode ? (
                                            <View style={{ paddingHorizontal: 6 }}>
                                                <Ionicons name="open-outline" size={18} color={homeColors.textPrimary} />
                                            </View>
                                        ) : isSelected ? (
                                            <View style={[styles.checkCircleActive, { backgroundColor: homeColors.textPrimary }]}>
                                                <Ionicons name="checkmark" size={14} color={homeColors.background} />
                                            </View>
                                        ) : (
                                            <View style={[styles.checkCircleEmpty, { borderColor: homeColors.border }]} />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    modalCard: {
        width: '100%',
        maxWidth: 380,
        maxHeight: 480,
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 1,
        padding: 18,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    headerTitleGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    iconCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    headerTitle: {
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    closeBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    subtitle: {
        fontSize: 11,
        marginBottom: 14,
        lineHeight: 15,
    },
    skeletonContainer: {
        paddingVertical: 6,
    },
    skeletonItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 12,
        marginBottom: 8,
    },
    scrollList: {
        maxHeight: 300,
    },
    orgItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 8,
    },
    orgLogoBox: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 1,
    },
    orgLogoImg: {
        width: 32,
        height: 32,
    },
    initialsBox: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    initialsText: {
        fontSize: 8,
        fontWeight: '800',
        marginTop: 1,
        letterSpacing: 0.3,
    },
    orgInfo: {
        flex: 1,
        marginLeft: 10,
    },
    orgName: {
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 2,
    },
    orgTag: {
        fontSize: 10,
        fontWeight: '500',
    },
    checkCircleActive: {
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 6,
    },
    checkCircleEmpty: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1,
        marginLeft: 6,
    },
});

