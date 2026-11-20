// CORS für die Capacitor-APK.
//
// Die App läuft in einer WebView (Origin http://localhost) und ruft das
// HTTPS-Backend cross-origin auf. Ohne diese Header blockiert der Browser
// jede API-Antwort – die App zeigt dann fälschlich "nicht eingerichtet",
// obwohl ein Schlüssel gespeichert ist. Sobald ein Geräteschlüssel als
// Header (x-tmdb-key / x-omdb-key) mitgeschickt wird, schickt der Browser
// zusätzlich einen OPTIONS-Preflight; dafür gibt es apiOptions().
//
// Nur öffentliche GET-Proxys, keine Cookies/Credentials – daher "*" zulässig.
import { NextResponse } from "next/server";

export function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "x-tmdb-key, x-omdb-key, content-type",
    "Access-Control-Max-Age": "86400"
  };
}

export function apiJson(body: unknown, init?: { status?: number }): NextResponse {
  return NextResponse.json(body, { ...init, headers: corsHeaders() });
}

export function apiOptions(): NextResponse {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}
