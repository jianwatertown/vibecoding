import QRCode from 'qrcode';
import PrintButton from '@/components/PrintButton';
export const dynamic='force-dynamic';
export const metadata={title:'Printable QR · Slowcelona'};
export default async function QR(){const url=process.env.SITE_URL||'https://www.slowcelona.com';const code=await QRCode.toDataURL(url,{width:1000,margin:4,errorCorrectionLevel:'M',color:{dark:'#132c23',light:'#ffffff'}});return <main id="main" className="qr-page"><div className="print-sign"><span className="eyebrow">西雅图步行者 · SUNDAY SOCCER</span><h1>SLOWCELONA</h1><p className="qr-tagline">Good people. Sunday soccer.</p><h2>RESERVE YOUR SPOT</h2><img className="qr-image" src={code} alt={`QR code opening ${url}`} width={500} height={500}/><a className="qr-url" href={url}>{new URL(url).host}</a><p>Scan with your phone camera or WeChat.</p><div className="qr-policy">Reservation = commitment to attend and pay.<br/>Reserve once. No extra check-in.</div></div><PrintButton/></main>}
