'use client';
import {useRef,useState} from 'react';
import {wechatAnnouncement} from '@/lib/wechat';
export default function WeChatAnnouncement({game}:{game:{date:string;time?:string;location?:string}}){
 const text=wechatAnnouncement(game),area=useRef<HTMLTextAreaElement>(null),[status,setStatus]=useState('');
 async function copy(){try{await navigator.clipboard.writeText(text);setStatus('已复制，可粘贴到微信。')}catch{area.current?.focus();area.current?.select();setStatus('请长按或使用复制快捷键，复制已选中的文字。')}}
 return <section className="wechat-share" lang="zh-CN" aria-labelledby="wechat-heading"><h3 id="wechat-heading">微信群通知</h3><p className="small muted">根据当前场次自动生成</p><textarea ref={area} aria-label="微信群通知内容" readOnly value={text} rows={12}/><button className="secondary" type="button" onClick={copy}>复制到微信</button><p className="small" role="status">{status}</p></section>
}
