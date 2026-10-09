import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../store/useThemeStore';
import { useAuthStore } from '../store/useAuthStore';
import { useSpectatorBrowseStore } from '../store/useSpectatorBrowseStore';
import { getHomeScreenColors } from '../constants/homeTheme';
import SpectatorOrganizationPicker from '../components/SpectatorOrganizationPicker';
import { loadSpectatorMatches, invalidateSpectatorMatchPage, MatchCursor, MatchFeed } from '../services/spectatorHomeService';
import { supabase } from '../services/supabase';

export default function SpectatorHomeScreen({ navigation }: any) {
    const { t, i18n } = useTranslation();
    const { isDark } = useThemeStore();
    const colors = getHomeScreenColors(isDark);
    const user = useAuthStore(s => s.user);
    const organization = useSpectatorBrowseStore(s => s.organization);
    const focused = useIsFocused();
    const orgId = organization?.id ?? null;
    const [feed, setFeed] = useState<MatchFeed>('live');
    const [picker, setPicker] = useState(false);
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [visibleIds,setVisibleIds] = useState('');
    const onViewableItemsChanged = useRef(({viewableItems}:any) => {
        setVisibleIds(viewableItems.map((v:any)=>String(v.item.id)).sort().join(','));
    }).current;
    const cursor = useRef<MatchCursor>(null);
    const generation = useRef(0), busy = useRef(false), retryAppend = useRef(false);
    const load = useCallback(async (append = false, refresh = false) => {
        if (busy.current) return;
        busy.current = true; retryAppend.current = append;
        const token = generation.current;
        setLoading(true); setError(false);
        try {
            const result = await loadSpectatorMatches(orgId,feed,append ? cursor.current : null,refresh);
            if (generation.current !== token) return;
            setItems(previous => append ? [...previous,...result.rows.filter(row => !previous.some(old => old.id === row.id))] : result.rows);
            cursor.current = result.cursor; setHasMore(result.cursor !== null);
        } catch (_) { if (generation.current === token) setError(true); }
        finally { if (generation.current === token) { busy.current=false; setLoading(false); setRefreshing(false); } }
    },[orgId,feed]);
    useEffect(() => {
        generation.current++; busy.current=false;
        if (focused) { setItems([]); setHasMore(false); cursor.current=null; void load(); }
        return () => {generation.current++; busy.current=false;};
    },[focused,load]);
    useEffect(()=>{
        if(!focused || feed!=='live' || !visibleIds) return;
        const channel=supabase.channel(`spectator_live_${orgId ?? 'all'}`)
            .on('postgres_changes',{event:'UPDATE',schema:'public',table:'matches',filter:`id=in.(${visibleIds})`},(payload:any)=>{
                const update=payload.new;
                if(!update?.id) return;
                invalidateSpectatorMatchPage(orgId,'live');
                setItems(previous=>previous.map(match=>match.id===update.id?{...match,home_score:update.home_score,
                    away_score:update.away_score,status:update.status,match_date:update.match_date,match_time:update.match_time}:match));
            }).subscribe();
        return ()=>{void supabase.removeChannel(channel);};
    },[focused,feed,orgId,visibleIds]);

    const text={color:colors.textPrimary};
    const surface={backgroundColor:isDark ? '#141414' : '#FFFFFF',borderColor:colors.border};
    const labels:Record<MatchFeed,string>={live:t('matches.live','Jonli'),upcoming:t('home.upcoming_matches','Yaqin o‘yinlar'),results:t('home.results','Natijalar')};
    const button=(label:string,onPress:()=>void) => <Pressable accessibilityRole="button" onPress={onPress} style={[styles.button,{borderColor:colors.border}]}>
        <Text style={[styles.buttonText,text]}>{label}</Text></Pressable>;
    const team=(value:any) => <View style={styles.team}>
        {value?.logo_url ? <Image source={{uri:value.logo_url}} style={styles.logo} resizeMode="contain" /> : <Ionicons name="shield-outline" size={32} color={colors.textSecondary} />}
        <Text numberOfLines={2} style={[styles.teamName,text]}>{value?.name || t('matches.team_tbd','Jamoa aniqlanmoqda')}</Text>
    </View>;
    return <SafeAreaView edges={['top']} style={{flex:1,backgroundColor:colors.background}}>
        <FlatList data={items} keyExtractor={item=>String(item.id)} contentContainerStyle={styles.content}
            onViewableItemsChanged={onViewableItemsChanged}
            initialNumToRender={10} maxToRenderPerBatch={10} windowSize={5} refreshing={refreshing}
            onRefresh={()=>{generation.current++;busy.current=false;setRefreshing(true);void load(false,true);}}
            ListHeaderComponent={<View>
                <View style={styles.heading}><View style={{flex:1}}>
                    <Text style={[styles.brand,{color:colors.accent}]}>AMATORA</Text>
                    <Text style={[styles.title,text]}>{t('spectator.home_title','Futbol olami')}</Text>
                </View><Pressable accessibilityRole="button" accessibilityLabel={t('profile.title','Profil')} style={styles.profile}
                    onPress={()=>navigation.navigate('MainTabs',{screen:'Profil'})}>
                    <Ionicons name="person-circle-outline" size={36} color={colors.textPrimary}/>
                </Pressable></View>
                <Text style={[styles.subtitle,{color:colors.textSecondary}]}>{user?.name || t('spectator.welcome','AMATORA’ga xush kelibsiz')}</Text>
                <Pressable accessibilityRole="button" onPress={()=>setPicker(true)} style={[styles.filter,surface]}>
                    <Ionicons name="globe-outline" size={20} color={colors.accent}/>
                    <Text numberOfLines={1} style={[styles.filterText,text]}>{organization?.name || t('common.all_organizations','Barcha tashkilotlar')}</Text>
                    <Ionicons name="chevron-down" size={18} color={colors.textSecondary}/>
                </Pressable>
                {button(t('spectator.explore_tournaments','Liga va turnirlarni ko‘rish'),()=>navigation.navigate('MainTabs',{screen:'Turnirlar'}))}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
                    {(['live','upcoming','results'] as MatchFeed[]).map(value=><Pressable key={value} accessibilityRole="tab"
                        accessibilityState={{selected:feed===value}} onPress={()=>setFeed(value)}
                        style={[styles.tab,{backgroundColor:feed===value?colors.accent:surface.backgroundColor}]}>
                        <Text style={{color:feed===value?'#FFFFFF':colors.textPrimary,fontWeight:'700'}}>{labels[value]}</Text>
                    </Pressable>)}
                </ScrollView>
            </View>}
            renderItem={({item})=><Pressable accessibilityRole="button" style={[styles.card,surface]}
                android_ripple={{color:'rgba(232,80,2,0.12)'}}
                onPress={()=>navigation.navigate('MatchDetail',{matchId:item.id})}>
                <Text numberOfLines={1} style={[styles.competition,text]}>{item.competitionName}</Text>
                <Text numberOfLines={1} style={[styles.organization,{color:colors.textSecondary}]}>{item.organizationName}</Text>
                <View style={styles.scoreRow}>{team(item.homeTeam)}
                    <View style={styles.scoreColumn}><Text style={[styles.score,text]}>{feed==='upcoming'?'VS':`${item.home_score ?? 0} : ${item.away_score ?? 0}`}</Text>
                        {feed==='live' && <Text style={[styles.live,{color:colors.accent}]}>{['finished','completed','ended','tugadi'].includes(item.status)?labels.results:labels.live}</Text>}
                    </View>{team(item.awayTeam)}</View>
                <Text style={[styles.date,{color:colors.textSecondary}]}>{item.match_date && !Number.isNaN(Date.parse(item.match_date))
                    ? `${new Date(item.match_date).toLocaleDateString(i18n.language || 'uz')} · ${String(item.match_time || '').slice(0,5)}`
                    : t('matches.date_tbd','Sana aniqlanmoqda')}</Text>
            </Pressable>}
            ListEmptyComponent={!loading&&!error?<View style={styles.empty}>
                <Ionicons name="football-outline" size={40} color={colors.textSecondary}/>
                <Text style={[styles.emptyText,text]}>{feed==='live'?t('spectator.no_live','Hozir jonli o‘yin yo‘q'):t('spectator.no_matches','Bu bo‘limda o‘yin topilmadi')}</Text>
                {feed==='live' && button(labels.upcoming,()=>setFeed('upcoming'))}
            </View>:null}
            ListFooterComponent={<View>{error&&button(t('common.retry','Qayta urinish'),()=>{void load(retryAppend.current);})}
                {loading?<ActivityIndicator color={colors.accent} style={{margin:20}}/>:hasMore&&!error?button(t('common.load_more','Ko‘proq ko‘rsatish'),()=>{void load(true);}):null}
            </View>}/>
        <SpectatorOrganizationPicker visible={picker} onClose={()=>setPicker(false)}/>
    </SafeAreaView>;
}
const styles=StyleSheet.create({
    content:{padding:20,paddingBottom:130},heading:{flexDirection:'row',alignItems:'center'},
    brand:{fontSize:12,fontWeight:'800',letterSpacing:2},title:{fontSize:30,fontWeight:'800',marginTop:6},profile:{minHeight:44,minWidth:44,alignItems:'center',justifyContent:'center'},
    subtitle:{fontSize:14,marginTop:8,marginBottom:12},filter:{minHeight:52,paddingHorizontal:14,borderWidth:1,borderRadius:12,flexDirection:'row',alignItems:'center',gap:10,marginBottom:8},
    filterText:{flex:1,fontWeight:'600',fontSize:15},button:{minHeight:48,padding:14,borderWidth:1,borderRadius:Platform.OS==='ios'?12:8,marginVertical:6},buttonText:{fontSize:15,fontWeight:'600'},
    tabs:{gap:8,paddingVertical:16},tab:{minHeight:44,paddingHorizontal:16,justifyContent:'center',borderRadius:Platform.OS==='ios'?12:8},
    card:{padding:16,marginBottom:14,borderWidth:1,borderRadius:Platform.OS==='ios'?16:12,overflow:'hidden'},competition:{fontSize:15,fontWeight:'700'},organization:{fontSize:12,marginTop:4},
    scoreRow:{flexDirection:'row',alignItems:'center',marginVertical:18},team:{flex:1,alignItems:'center',gap:8},logo:{width:42,height:42},teamName:{fontSize:14,fontWeight:'600',textAlign:'center'},
    scoreColumn:{paddingHorizontal:14,alignItems:'center'},score:{fontSize:24,fontWeight:'800'},live:{fontSize:12,fontWeight:'700',marginTop:6},date:{textAlign:'center',fontSize:12},
    empty:{paddingVertical:32,alignItems:'center'},emptyText:{fontSize:15,textAlign:'center',marginVertical:14},
});
