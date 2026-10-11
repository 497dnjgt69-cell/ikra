import {randomUUID} from 'node:crypto';
import {hash,sameSecret,validatePreferences,validateSubscription} from './policy.js';
export function createHandler({service,origin,publicKey,adminToken,now=Date.now}){
  const limits=new Map();
  const result=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
  async function body(req){let size=0,chunks=[];for await(const c of req){size+=c.length;if(size>32768)throw Object.assign(Error('body_too_large'),{status:413});chunks.push(c);}return JSON.parse(Buffer.concat(chunks).toString()||'{}');}
  return async(req,res)=>{
    try{
      const path=new URL(req.url,'http://localhost').pathname;
      res.setHeader('X-Content-Type-Options','nosniff');
      if(req.headers.origin===origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Methods','GET,PUT,POST,DELETE,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');}
      if(path==='/health'&&req.method==='GET')return result(res,200,{ok:true});
      const bearer=req.headers.authorization?.replace(/^Bearer /,'');
      const admin=path==='/broadcast'&&sameSecret(bearer,adminToken);
      if(req.headers.origin!==origin&&!admin)return result(res,403,{error:'origin_denied'});
      if(req.method==='OPTIONS'){res.writeHead(204);return res.end();}
      const address=req.socket.remoteAddress;
      const stamp=now();let limit=limits.get(address);
      if(!limit||limit.reset<stamp){limit={count:0,reset:stamp+60000};limits.set(address,limit);}
      if(limits.size>10000)for(const [key,value] of limits)if(value.reset<stamp)limits.delete(key);
      if(++limit.count>120)return result(res,429,{error:'rate_limited'});
      if(path==='/config'&&req.method==='GET')return result(res,200,{publicKey});
      if(path==='/broadcast'&&req.method==='POST'){
        if(!admin)return result(res,401,{error:'unauthorized'});
        const b=await body(req);
        if(typeof b.title!=='string'||!b.title.trim()||b.title.length>80||typeof b.body!=='string'||!b.body.trim()||b.body.length>240)return result(res,400,{error:'invalid_message'});
        const key='announcement:'+randomUUID();let queued=0;
        for(const row of service.db.prepare('SELECT id,prefs FROM subscriptions').all())if(JSON.parse(row.prefs).announcements){service.enqueue(row.id,key,{title:b.title,body:b.body,category:'announcements',target:'home'},stamp,86400000);queued++;}
        return result(res,202,{queued});
      }
      const match=path.match(/^\/subscriptions\/([a-f0-9]{32})(\/test)?$/);
      if(!match)return result(res,404,{error:'not_found'});
      const [,id,test]=match,row=service.get(id);
      if(!/^[a-f0-9]{64}$/.test(bearer||'')||(row&&!sameSecret(hash(bearer),row.token)))return result(res,401,{error:'unauthorized'});
      if(req.method==='PUT'&&!test){
        if(!row&&service.db.prepare('SELECT count(*) AS n FROM subscriptions').get().n>=10000)return result(res,503,{error:'capacity'});
        const b=await body(req),subscription=validateSubscription(b.subscription),prefs=validatePreferences(b.preferences,stamp);
        const owner=service.db.prepare('SELECT id FROM subscriptions WHERE endpoint=?').get(subscription.endpoint);
        if(owner&&owner.id!==id)return result(res,409,{error:'subscription_conflict'});
        service.save(id,bearer,subscription,prefs);return result(res,200,{ok:true});
      }
      if(!row)return result(res,404,{error:'not_found'});
      if(req.method==='DELETE'&&!test){service.remove(id);return result(res,200,{ok:true});}
      if(req.method==='POST'&&test){
        const latest=service.db.prepare("SELECT due FROM jobs WHERE subscriber=? AND json_extract(payload,'$.category')='test' ORDER BY due DESC LIMIT 1").get(id);
        if(latest&&stamp-latest.due<30000)return result(res,429,{error:'try_later'});
        const en=JSON.parse(row.prefs).language==='en';
        service.enqueue(id,'test:'+randomUUID(),{title:'IKRA',body:en?'Notifications are ready.':'Bildirimlerin hazır.',category:'test',target:'home'});return result(res,202,{ok:true});
      }
      return result(res,405,{error:'method_not_allowed'});
    }catch(e){return result(res,e.status||400,{error:e.status===413?'body_too_large':'invalid_request'});}
  };
}
