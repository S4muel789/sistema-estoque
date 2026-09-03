import {NextRequest,NextResponse} from 'next/server';import {verifySession,COOKIE} from './lib/auth';
export async function middleware(req:NextRequest){
  if(req.nextUrl.pathname.startsWith('/api/')&&!['GET','HEAD','OPTIONS'].includes(req.method)){
    const origin=req.headers.get('origin'),site=req.headers.get('sec-fetch-site');
    if((origin&&new URL(origin).host!==req.nextUrl.host)||site==='cross-site')return NextResponse.json({ok:false,message:'Origem da requisição não permitida.'},{status:403});
  }
  const token=req.cookies.get(COOKIE)?.value;const session=await verifySession(token);if(!session&&req.nextUrl.pathname!=='/login'&&!req.nextUrl.pathname.startsWith('/api/auth')){return NextResponse.redirect(new URL('/login',req.url))}return NextResponse.next()}
export const config={matcher:['/((?!_next/static|_next/image|favicon.ico).*)']};
