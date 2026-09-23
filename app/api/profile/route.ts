import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { checkRateLimit, getClientIdentifier } from '@/lib/security/rate-limit';
import { validateEmail } from '@/lib/security/sanitize';
import { authenticateRequest } from '@/lib/auth/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const emailParam = searchParams.get('email');

    // Authenticate request and validate email
    const auth = await authenticateRequest(request, emailParam);
    if (!auth.authenticated || !auth.email) {
      return NextResponse.json({ success: false, error: auth.error || 'Authentication required' }, { status: 401 });
    }

    const email = auth.email;

    // Rate limit: 30 requests per minute
    const clientId = getClientIdentifier(request, email);
    const rateCheck = checkRateLimit(`profile:get:${clientId}`, 30, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please slow down.' },
        { status: 429, headers: { 'Retry-After': String(rateCheck.resetSeconds) } }
      );
    }

    if (!supabase) {
      return NextResponse.json({
        success: true,
        profile: { email, credit_balance: 10.0, created_at: new Date().toISOString() },
        fallback: true,
      });
    }

    // Query profile for this user
    let { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      console.warn('Supabase profile query warning:', error);
    }

    // If profile does not exist yet, create initial profile with $10.00 credit grant
    if (!profile) {
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert([{ email, credit_balance: 10.00 }])
        .select('*')
        .single();

      if (insertError) {
        console.warn('Supabase profile creation fallback:', insertError);
        return NextResponse.json({
          success: true,
          profile: { email, credit_balance: 10.0, created_at: new Date().toISOString() },
        });
      }

      profile = newProfile;
    }

    // Query theme preference from memories table
    let theme: 'dark' | 'light' = 'dark';
    if (supabase) {
      const { data: themeData } = await supabase
        .from('memories')
        .select('preference')
        .eq('user_id', email)
        .eq('category', 'theme')
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (themeData?.preference === 'light' || themeData?.preference === 'dark') {
        theme = themeData.preference;
      }
    }

    // Caller Livepeer key status. The sealed value is NEVER returned; only a
    // masked tail so the UI can show what is attached.
    let hasLivepeerKey = false;
    let livepeerKeyTail: string | null = null;
    if (supabase && typeof profile?.livepeer_api_key === 'string' && profile.livepeer_api_key) {
      try {
        const { unsealCredential, maskCredentialTail } = await import('@/lib/security/credentials');
        livepeerKeyTail = maskCredentialTail(unsealCredential(profile.livepeer_api_key));
        hasLivepeerKey = true;
      } catch {
        hasLivepeerKey = true;
      }
    }

    // Strip the sealed secret before responding (defense in depth: even the
    // ciphertext must never reach clients).
    const { livepeer_api_key: _sealed, ...safeProfile } = (profile || {}) as Record<string, unknown>;

    return NextResponse.json({
      success: true,
      profile: {
        ...safeProfile,
        credit_balance: Number((profile as any)?.credit_balance ?? 10.0),
        theme,
        hasLivepeerKey,
        livepeerKeyTail,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email: emailInput, action, amount, theme } = body;

    // Authenticate request and validate email
    const auth = await authenticateRequest(request, emailInput);
    if (!auth.authenticated || !auth.email) {
      return NextResponse.json({ success: false, error: auth.error || 'Authentication required' }, { status: 401 });
    }

    const email = auth.email;

    // Rate limit: 25 updates per minute
    const clientId = getClientIdentifier(request, email);
    const rateCheck = checkRateLimit(`profile:post:${clientId}`, 25, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please slow down.' },
        { status: 429, headers: { 'Retry-After': String(rateCheck.resetSeconds) } }
      );
    }

    // Handle theme persistence
    if (action === 'set_theme') {
      const themeValue: 'dark' | 'light' = theme === 'light' ? 'light' : 'dark';
      if (supabase) {
        const { error: upsertErr } = await supabase
          .from('memories')
          .upsert({
            id: `theme_${email}`,
            user_id: email,
            category: 'theme',
            preference: themeValue,
            strength: 'high',
            is_active: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' });
        if (upsertErr) {
          console.warn('Supabase set_theme warning:', upsertErr);
        }
      }
      return NextResponse.json({ success: true, theme: themeValue });
    }

    // Validate credit action. Top-ups are disabled: there is no billing
    // pipeline, so any topup would mint free credits out of thin air.
    if (action === 'topup') {
      return NextResponse.json(
        { success: false, error: 'Credit top-ups are not available yet. Each account starts with a complimentary $10.00 grant.' },
        { status: 400 }
      );
    }
    // Handle Livepeer BYOK wiring (sealed at rest; validated before storage).
    // Separated from credit actions: keys are secrets, amounts are ledger.
    if (action === 'set_livepeer_key' || action === 'remove_livepeer_key') {
      if (!supabase) {
        return NextResponse.json({ success: false, error: 'Profile storage unavailable.' }, { status: 503 });
      }
      if (action === 'remove_livepeer_key') {
        const { error: rmErr } = await supabase
          .from('profiles')
          .upsert({ email, livepeer_api_key: null, updated_at: new Date().toISOString() }, { onConflict: 'email' });
        if (rmErr) {
          return NextResponse.json({ success: false, error: 'Could not remove the key.' }, { status: 500 });
        }
        return NextResponse.json({ success: true, hasLivepeerKey: false, livepeerKeyTail: null });
      }
      const rawKey = typeof body?.key === 'string' ? body.key.trim() : '';
      if (rawKey.length < 16 || rawKey.length > 512 || /\s/.test(rawKey)) {
        return NextResponse.json({ success: false, error: 'That key looks malformed (expect a single Livepeer token).' }, { status: 400 });
      }
      try {
        const { sealCredential, maskCredentialTail } = await import('@/lib/security/credentials');
        const sealed = sealCredential(rawKey);
        const { error: upErr } = await supabase
          .from('profiles')
          .upsert({ email, livepeer_api_key: sealed, updated_at: new Date().toISOString() }, { onConflict: 'email' });
        if (upErr) {
          return NextResponse.json({ success: false, error: 'Could not save the key.' }, { status: 500 });
        }
        return NextResponse.json({ success: true, hasLivepeerKey: true, livepeerKeyTail: maskCredentialTail(rawKey) });
      } catch (e: any) {
        return NextResponse.json({ success: false, error: e?.message || 'Could not seal the key.' }, { status: 500 });
      }
    }

    if (action !== 'deduct' && action !== 'set_theme') {
      return NextResponse.json({ success: false, error: 'Invalid action: must be deduct or set_theme' }, { status: 400 });
    }

    // Strict amount validation: must be a finite positive number
    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0 || !Number.isFinite(parsedAmount)) {
      return NextResponse.json({ success: false, error: 'Amount must be a positive finite number' }, { status: 400 });
    }

    // Security bounds: cap deduct at $1.00 per single operation.
    if (action === 'deduct' && parsedAmount > 1.0) {
      return NextResponse.json({ success: false, error: 'Deduction exceeds maximum single unit limit ($1.00)' }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json({
        success: true,
        credit_balance: 10.0 - parsedAmount,
        fallback: true,
      });
    }

    // Retrieve current profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    let currentBalance = Number(profile?.credit_balance ?? 10.0);

    if (action === 'deduct') {
      if (currentBalance < parsedAmount) {
        return NextResponse.json(
          {
            success: false,
            error: 'Insufficient credit balance. Each account starts with a complimentary $10.00 grant.',
            credit_balance: currentBalance,
          },
          { status: 402 }
        );
      }
      currentBalance = Math.max(0, Number((currentBalance - parsedAmount).toFixed(2)));
    }

    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .upsert({
        email,
        credit_balance: currentBalance,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'email' })
      .select('*')
      .single();

    if (error) {
      console.warn('Supabase balance update error:', error);
      return NextResponse.json({ success: true, credit_balance: currentBalance });
    }

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
      credit_balance: Number(updatedProfile.credit_balance),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || String(err) }, { status: 500 });
  }
}
