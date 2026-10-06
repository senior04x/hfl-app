import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, Switch, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import SmartImage from './SmartImage';
import { useThemeStore } from '../store/useThemeStore';
import { getHomeScreenColors } from '../constants/homeTheme';
import { getPersonalProfile, savePersonalProfile, PersonalProfile, ProfilePhoto } from '../services/personalProfileService';

export default function PersonalProfileModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
 const { t } = useTranslation(); const { isDark } = useThemeStore(); const c = getHomeScreenColors(isDark);
 const [value,setValue] = useState<PersonalProfile | null>(null); const [photo,setPhoto] = useState<ProfilePhoto>(); const [preview,setPreview] = useState<string>(); const [busy,setBusy] = useState(false);
 useEffect(() => { if (!visible) return; let disposed=false; setValue(null);setPhoto(undefined);setPreview(undefined);
  getPersonalProfile().then(p=>{if(!disposed)setValue(p);}).catch(()=>{if(!disposed){Alert.alert(t('common.error'),t('profile.save_error','Profilni yuklab bo‘lmadi. Qayta urinib ko‘ring.'));onClose();}});
  return()=>{disposed=true;};
 },[visible]);
 const pick = async()=>{try {
  const permission=await ImagePicker.requestMediaLibraryPermissionsAsync();if(!permission.granted){Alert.alert(t('common.error'),t('profile.photo_permission','Rasm tanlash uchun galereyaga ruxsat bering.'));return;}
  const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,aspect:[1,1],quality:0.7,base64:true});
  const asset=result.assets?.[0];if(result.canceled || !asset)return;
  if(!asset.base64 || asset.base64.length>4194304){Alert.alert(t('common.error'),t('profile.photo_limit','JPG, PNG yoki WebP rasm tanlang (3 MB gacha).'));return;}
  const head=atob(asset.base64.slice(0,24));
  const mimeType=head.startsWith('\xff\xd8\xff')?'image/jpeg':head.startsWith('\x89PNG')?'image/png':head.startsWith('RIFF')&&head.slice(8,12)==='WEBP'?'image/webp':'';
  if(!mimeType){Alert.alert(t('common.error'),t('profile.photo_limit'));return;}
  setPhoto({base64:asset.base64,mimeType});setPreview(asset.uri);
 }catch{Alert.alert(t('common.error'),t('profile.photo_limit','JPG, PNG yoki WebP rasm tanlang (3 MB gacha).'));}};
 const save=async()=>{if(!value||busy)return;setBusy(true);try{await savePersonalProfile(value,photo);onClose();}catch{Alert.alert(t('common.error'),t('profile.save_error','Saqlab bo‘lmadi. Ism va rasmni tekshirib, qayta urinib ko‘ring.'));}finally{setBusy(false);}};
 const input={color:c.textPrimary,backgroundColor:isDark?'#141414':'#F5F5F5',borderRadius:12,padding:14,marginBottom:20};
 return <Modal visible={visible} animationType="slide" onRequestClose={()=>{if(!busy)onClose();}}><SafeAreaView style={{flex:1,backgroundColor:c.background}}>
 <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
 <View style={{flexDirection:'row',alignItems:'center',padding:20}}><TouchableOpacity disabled={busy} onPress={onClose} style={{padding:8}}><Ionicons name="arrow-back" size={24} color={c.textPrimary}/></TouchableOpacity><Text style={{fontSize:20,fontWeight:'700',color:c.textPrimary,marginLeft:8}}>{t('profile.edit_personal','Profilni tahrirlash')}</Text></View>
 {!value?<ActivityIndicator color={c.accent}/>:<ScrollView contentContainerStyle={{padding:24}} keyboardShouldPersistTaps="handled">
 <TouchableOpacity disabled={busy} onPress={pick} style={{alignItems:'center',marginBottom:24}}>{preview||value.photo?<SmartImage uri={preview||value.photo||''} style={{width:96,height:96,borderRadius:48}} contentFit="cover" fallbackIcon="person"/>:<Ionicons name="person-circle-outline" size={96} color={c.accent}/>}<Text style={{color:c.accent,marginTop:10}}>{t('profile.change_avatar','Rasmni almashtirish')}</Text></TouchableOpacity>
 <Text style={{color:c.textSecondary,marginBottom:8}}>{t('profile.full_name','Ism-familiya')}</Text><TextInput style={input} editable={!busy} value={value.name} maxLength={120} onChangeText={name=>setValue({...value,name})}/>
 <Text style={{color:c.textSecondary,marginBottom:8}}>{t('profile.bio','O‘zingiz haqingizda')}</Text><TextInput style={[input,{minHeight:90,textAlignVertical:'top'}]} editable={!busy} value={value.bio} maxLength={280} multiline onChangeText={bio=>setValue({...value,bio})}/>
 <Text style={{color:c.textSecondary,marginBottom:8}}>{t('profile.phone_number','Telefon raqami')}</Text><Text style={{color:c.textPrimary,marginBottom:16}}>{value.phone || '—'}</Text>
 <View style={{flexDirection:'row',alignItems:'center',marginBottom:24}}><Text style={{flex:1,color:c.textPrimary}}>{t('profile.show_phone','Profilimda telefon raqamimni ko‘rsatish')}</Text><Switch disabled={busy} value={value.showPhone} onValueChange={showPhone=>setValue({...value,showPhone})} trackColor={{false:'#555555',true:c.accent}} thumbColor="#FFFFFF"/></View>
 <TouchableOpacity disabled={busy||!value.name.trim()} onPress={save} style={{backgroundColor:c.accent,borderRadius:Platform.OS==='android'?8:12,padding:16,alignItems:'center',opacity:busy?0.6:1}}>{busy?<ActivityIndicator color="#FFFFFF"/>:<Text style={{color:'#FFFFFF',fontWeight:'700'}}>{t('common.save','Saqlash')}</Text>}</TouchableOpacity>
 </ScrollView>}</KeyboardAvoidingView></SafeAreaView></Modal>;
}
