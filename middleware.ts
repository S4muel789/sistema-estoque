import {NextRequest,NextResponse} from 'next/server';import {verifySession,COOKIE} from './lib/auth';
export async function middleware(req:NextRequest){const token=req.cookies.get(COOKIE)?.value;const session=await verifySession(token);if(!session&&req.nextUrl.pathname!=='/login'&&!req.nextUrl.pathname.startsWith('/api/auth')){return NextResponse.redirect(new URL('/login',req.url))}return NextResponse.next()}
export const config={matcher:['/((?!_next/static|_next/image|favicon.ico).*)']};
