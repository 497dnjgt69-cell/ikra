import { normalizeAnki } from '../core/anki.js';

export function createAnkiConnect({ fetcher = globalThis.fetch } = {}) {
  async function call(action, params = {}, key = '') {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), action === 'requestPermission' ? 120000 : 30000);
    try {
      const response = await fetcher('http://127.0.0.1:8765', {
        method:'POST', headers:{'Content-Type':'text/plain'},
        body:JSON.stringify({action,version:6,params,...(key ? {key} : {})}), signal:controller.signal,
      });
      if (!response.ok) throw Error('connection');
      const data = await response.json();
      if (!data || data.error || !Object.hasOwn(data, 'result')) throw Error('api');
      return data.result;
    } finally { clearTimeout(timeout); }
  }
  return {
    async sync({key = '', onProgress = () => {}} = {}) {
      const permission = await call('requestPermission');
      if (permission?.permission !== 'granted') throw Error('permission');
      if (permission.requireApiKey && !key) throw Error('key');
      const profile = await call('getActiveProfile', {}, key);
      const cards = await call('findCards', {query:''}, key);
      if (!Array.isArray(cards)) throw Error('api');
      const reviews = [];
      for (let offset=0; offset<cards.length; offset+=250) {
        const ids = cards.slice(offset, offset+250);
        const result = await call('getReviewsOfCards', {cards:ids}, key);
        if (!result || typeof result !== 'object' || Array.isArray(result)) throw Error('api');
        for (const card of ids) {
          if (!Array.isArray(result[card])) throw Error('api');
          for (const row of result[card]) {
            // ease=0 denotes manual rescheduling, not an answered review.
            if (row.ease === 0) continue;
            reviews.push({id:row.id,card:Number(card),seconds:row.time/1000,ease:row.ease});
          }
        }
        onProgress(Math.min(offset+250,cards.length),cards.length);
      }
      if (profile !== await call('getActiveProfile', {}, key)) throw Error('profile');
      return normalizeAnki({profile,syncedAt:new Date().toISOString(),reviews});
    },
  };
}
