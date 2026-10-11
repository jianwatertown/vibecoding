import type {Metadata} from 'next';
import Link from 'next/link';
import './globals.css';
export const metadata:Metadata={title:'Slowcelona · Sunday Soccer',description:'Reserve a spot for Slowcelona Sunday soccer.',robots:{index:false,follow:false}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body><a className="skip" href="#main">Skip to content</a><header className="site-header"><Link href="/" className="brand"><span className="brand-ball" aria-hidden="true">⚽</span><span>SLOWCELONA<small>西雅图步行者 · SUNDAY SOCCER</small></span></Link><nav aria-label="Main navigation"><Link href="/club">Club guide</Link><Link href="/qr" className="nav-qr">QR code ↗</Link></nav></header>{children}<footer><Link href="/">SLOWCELONA</Link><span>Sunday soccer</span><Link href="/waiver">Waiver</Link></footer></body></html>}
