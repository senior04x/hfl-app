import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import * as Updates from 'expo-updates';

export default function AppUpdateBanner() {
 if (Platform.OS === 'web' || __DEV__ || !Updates.isEnabled) return null;
 return <SilentUpdate />;
}
function SilentUpdate() {
 const update = Updates.useUpdates(); const busy = useRef(false); const last = useRef(Date.now());
 useEffect(() => {
  if (!update.isUpdateAvailable || update.isUpdatePending || update.isDownloading || update.isStartupProcedureRunning || busy.current) return;
  busy.current=true;void Updates.fetchUpdateAsync().catch(()=>{}).finally(()=>{busy.current=false;});
 },[update.isUpdateAvailable,update.isUpdatePending,update.isDownloading,update.isStartupProcedureRunning]);
 useEffect(()=>{const sub=AppState.addEventListener('change',state=>{
  if(state!=='active'||busy.current||Date.now()-last.current<30*60*1000)return;
  last.current=Date.now();busy.current=true;void Updates.checkForUpdateAsync().then(result=>result.isAvailable?Updates.fetchUpdateAsync():undefined).catch(()=>{}).finally(()=>{busy.current=false;});
 });return()=>sub.remove();},[]);
 // expo-updates activates the downloaded bundle on the next cold start.
 return null;
}
