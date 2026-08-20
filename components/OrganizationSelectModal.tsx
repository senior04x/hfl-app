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
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { supabase } from '../services/apiService';
import { useOrganizationStore } from '../store/useOrganizationStore';
import Skeleton from './Skeleton';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

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
                
                <View style={styles.modalCard}>
                    <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFill} />
                    
                    {/* Header */}
                    <View style={styles.headerRow}>
                        <View style={styles.headerTitleGroup}>
                            <View style={styles.iconCircle}>
                                <Ionicons name={isApplyMode ? "globe-outline" : "business"} size={18} color="#00FF9D" />
                            </View>
                            <Text style={styles.headerTitle}>
                                {title || (isApplyMode ? t('auth.select_org_title', 'Tashkilotni tanlang') : t('common.select_organization', 'Tashkilotni tanlang'))}
                            </Text>
                        </View>
                        <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
                            <Ionicons name="close" size={20} color="rgba(255,255,255,0.7)" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.subtitle}>
                        {subtitle || (isApplyMode 
                            ? t('auth.select_org_sub', "Ariza topshirish uchun kerakli sport tashkilotini tanlang") 
                            : t('common.select_organization_sub', 'Kerakli sport tashkilotini tanlang va uning barcha ligalarini ko\'ring'))}
                    </Text>

                    {/* Skeleton Loading or Content List */}
                    {loading ? (
                        <View style={styles.skeletonContainer}>
                            {[1, 2, 3].map((key) => (
                                <View key={key} style={styles.skeletonItem}>
                                    <Skeleton circle width={44} height={44} style={{ marginRight: 12 }} />
                                    <View style={{ flex: 1 }}>
                                        <Skeleton width="70%" height={16} borderRadius={4} style={{ marginBottom: 8 }} />
                                        <Skeleton width="40%" height={12} borderRadius={4} />
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
                                            isSelected && styles.selectedOrgItem
                                        ]}
                                        onPress={() => handleSelectOrg(org)}
                                        activeOpacity={0.8}
                                    >
                                        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                                        
                                        {/* Logo or High-Visibility Initials Badge */}
                                        <View style={[styles.orgLogoBox, isSelected && styles.selectedOrgLogoBox]}>
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
                                                        size={20} 
                                                        color={isSelected ? "#00FF9D" : "#00DF82"} 
                                                    />
                                                    <Text style={[styles.initialsText, isSelected && { color: '#00FF9D' }]}>
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
                                                    isSelected && { color: '#00FF9D', fontWeight: '900' }
                                                ]}
                                                numberOfLines={1}
                                            >
                                                {(org.name || 'TASHKILOT').toUpperCase()}
                                            </Text>
                                            <Text style={styles.orgTag}>
                                                {isApplyMode ? `amatora.uz/${orgSlug}` : (org.slug ? `@${org.slug}` : 'Rasmiy Tashkilot')}
                                            </Text>
                                        </View>

                                        {/* Browser Redirect Icon OR Selection Checkmark */}
                                        {isApplyMode ? (
                                            <View style={{ paddingHorizontal: 6 }}>
                                                <Ionicons name="open-outline" size={20} color="#00FF9D" />
                                            </View>
                                        ) : isSelected ? (
                                            <View style={styles.checkCircleActive}>
                                                <Ionicons name="checkmark" size={16} color="#000" />
                                            </View>
                                        ) : (
                                            <View style={styles.checkCircleEmpty} />
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
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    modalCard: {
        width: '100%',
        maxWidth: 400,
        maxHeight: 480,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 102, 0.25)',
        backgroundColor: 'rgba(15, 23, 42, 0.88)',
        padding: 20,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    headerTitleGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    iconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(0, 223, 130, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0, 223, 130, 0.3)',
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '900',
        letterSpacing: 0.3,
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    subtitle: {
        color: 'rgba(255, 255, 255, 0.55)',
        fontSize: 12,
        marginBottom: 16,
        lineHeight: 16,
    },
    skeletonContainer: {
        paddingVertical: 10,
    },
    skeletonItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        marginBottom: 10,
    },
    scrollList: {
        maxHeight: 320,
    },
    orgItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        marginBottom: 10,
    },
    selectedOrgItem: {
        borderColor: 'rgba(0, 223, 130, 0.5)',
        backgroundColor: 'rgba(0, 223, 130, 0.08)',
    },
    orgLogoBox: {
        width: 46,
        height: 46,
        borderRadius: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    selectedOrgLogoBox: {
        borderColor: 'rgba(0, 223, 130, 0.45)',
        backgroundColor: 'rgba(0, 223, 130, 0.12)',
    },
    orgLogoImg: {
        width: 38,
        height: 38,
    },
    initialsBox: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    initialsText: {
        color: '#FFFFFF',
        fontSize: 9,
        fontWeight: '900',
        marginTop: 1,
        letterSpacing: 0.5,
    },
    orgInfo: {
        flex: 1,
        marginLeft: 12,
    },
    orgName: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
        marginBottom: 2,
    },
    orgTag: {
        color: 'rgba(255, 255, 255, 0.45)',
        fontSize: 11,
        fontWeight: '600',
    },
    checkCircleActive: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#00FF9D',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    checkCircleEmpty: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        marginLeft: 8,
    },
});
