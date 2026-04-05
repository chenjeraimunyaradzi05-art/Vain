import { NextRequest, NextResponse } from 'next/server';

const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

// Headers that should never be forwarded to the backend
const STRIP_HEADERS = ['host', 'cookie', 'set-cookie', 'x-forwarded-for', 'x-real-ip', 'cf-connecting-ip'];

async function proxy(req: NextRequest) {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\/learning/, '');
  const target = `${API_ORIGIN}/learning${path}${url.search}`;

  const headers = new Headers(req.headers);
  for (const h of STRIP_HEADERS) {
    headers.delete(h);
  }

  const init: RequestInit = {
    method: req.method,
    headers,
  };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.text();
  }

  const response = await fetch(target, init);
  const body = await response.arrayBuffer();

  return new NextResponse(body, {
    status: response.status,
    headers: response.headers,
  });
}

export async function GET(req: NextRequest) {
  return proxy(req);
}

export async function POST(req: NextRequest) {
  return proxy(req);
}

export async function PUT(req: NextRequest) {
  return proxy(req);
}

export async function PATCH(req: NextRequest) {
  return proxy(req);
}

export async function DELETE(req: NextRequest) {
  return proxy(req);
}
