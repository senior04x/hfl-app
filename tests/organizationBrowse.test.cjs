const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),ts=require('typescript');
function load(file,deps={}) {
    const exports={};
    new Function('exports','require',ts.transpileModule(fs.readFileSync(file,'utf8'),{
        compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}
    }).outputText)(exports,name=>deps[name]);
    return exports;
}
test('viewer content selection is separate from sports profile organization',()=>{
    const {contentOrganizationId,isPublicViewer}=load('utils/contentOrganization.ts');
    const viewer={role:'user',appUserId:'uuid',organizationId:1};
    assert.throws(()=>contentOrganizationId(viewer,1), /selection required/);
    assert.equal(contentOrganizationId(viewer,1,false,20),20);
    assert.equal(contentOrganizationId({role:'player',organizationId:1},20),1);
    assert.equal(contentOrganizationId({role:'manager',organization:{id:11}},20),11);
    assert.equal(contentOrganizationId(null,20,true),20);
    assert.equal(isPublicViewer({role:'player',appUserId:'uuid'}),false);
});
test('bounded organization and competition pages preserve exact scope and exclude inactive data',async()=>{
    const calls=[];
    const records={organizations:Array.from({length:45},(_,i)=>({id:i+1})),
        leagues:Array.from({length:46},(_,i)=>({id:i+1,organization_id:i===45?20:1,is_active:i!==44})),
        tournaments:[{id:1,organization_id:1,status:'active'},{id:2,organization_id:1,status:'archived'},{id:3,organization_id:20,status:null}],
        teams:[{id:1,organization_id:1},{id:2,organization_id:20}]};
    const supabase={from(table){
        let rows=records[table],start=0,end=Infinity,head=false;
        const q={select(columns,options){head=options?.head;calls.push({table,columns});return q;},
            eq(k,v){rows=rows.filter(r=>r[k]===v);return q;},
            or(){rows=rows.filter(r=>table==='leagues'?r.is_active!==false:!['archived','inactive'].includes(r.status));return q;},
            order(){rows=[...rows].sort((a,b)=>a.id-b.id);return q;},
            range(a,b){start=a;end=b;assert.ok(b-a<=20);return q;},
            then(resolve){return Promise.resolve({data:head?null:rows.slice(start,end+1),count:rows.length,error:null}).then(resolve);}};
        return q;
    }};
    const service=load('services/organizationBrowse.ts',{'./supabase':{supabase}});
    const first=await service.organizationPage(),second=await service.organizationPage(1),last=await service.organizationPage(2);
    assert.equal(first.rows.length,20);assert.equal(first.more,true);assert.equal(last.rows.length,5);assert.equal(last.more,false);
    assert.equal(new Set([...first.rows,...second.rows,...last.rows].map(r=>r.id)).size,45);
    const pages=await Promise.all([0,1,2].map(page=>service.organizationCompetitions(1,page)));
    const all=pages.flatMap(p=>p.rows);
    assert.equal(all.length,45);assert.equal(new Set(all.map(r=>`${r.is_tournament}:${r.id}`)).size,45);
    assert.ok(all.every(r=>r.organization_id===1));assert.equal(pages[0].total,45);assert.equal(pages[0].teams,1);
    assert.equal(pages[0].more,true);assert.equal(pages[2].more,false);
    assert.ok(calls.every(c=>!c.columns.includes('*')));
});
test('query errors are surfaced instead of inventing fallback organizations',async()=>{
    const supabase={from(){const q={select(){return q;},order(){return q;},range(){return q;},then(resolve){return Promise.resolve({error:new Error('offline')}).then(resolve);}};return q;}};
    await assert.rejects(load('services/organizationBrowse.ts',{'./supabase':{supabase}}).organizationPage(),/offline/);
});
test('news cache and match queries follow viewer organization without changing sports scope',async()=>{
    let selectedOrganizationId=1;
    let publicChoiceId=1;
    let user={role:'user',appUserId:'uuid',organizationId:11};
    const calls=[];
    const supabase={from(table){
        const call={table,org:null};calls.push(call);
        const q={select(){return q;},eq(k,v){if(k==='organization_id')call.org=v;return q;},
            order(){return q;},range(){return q;},or(){return q;},
            then(resolve){return Promise.resolve({data:table==='news'?[{id:call.org,title:`Org ${call.org}`}]:[],error:null}).then(resolve);}};
        return q;
    }};
    const scope=load('utils/contentOrganization.ts');
    const {apiService}=load('services/apiService.ts',{
        '../store/usePublicOrganizationStore': {
            usePublicOrganizationStore: {getState:()=>({})},
            publicOrganizationForUser: ()=>publicChoiceId ? ({ id: publicChoiceId }) : null,
        },
        '../utils/contentOrganization':scope,'./supabase':{supabase},
        axios:{__esModule:true,default:{create:()=>({})}},
        '../store/useOrganizationStore':{useOrganizationStore:{getState:()=>({selectedOrganizationId})}},
        '../store/useAuthStore':{useAuthStore:{getState:()=>({user,isGuest:false})}},
        '../store/useJuniorStore':{useJuniorStore:{getState:()=>({isJuniorMode:false})}},
        './matchCompetitionMetadata':{loadMatchCompetitionMetadata:async()=>new Map()},
    });
    assert.equal((await apiService.getNews())[0].id,1);
    await apiService.getMatches();
    publicChoiceId=20;
    assert.equal((await apiService.getNews())[0].id,20);
    await apiService.getMatches();
    publicChoiceId=1;
    assert.equal((await apiService.getNews())[0].id,1);
    assert.equal(calls.filter(c=>c.table==='news').length,2);
    assert.deepEqual(calls.filter(c=>c.table==='matches').map(c=>c.org),[1,20]);
    publicChoiceId=null;
    const previousCalls=calls.length;
    await assert.rejects(apiService.getNews(),/selection required/);
    assert.equal(calls.length,previousCalls);
    user={role:'player',organizationId:11};
    assert.equal((await apiService.getNews())[0].id,11);
});
