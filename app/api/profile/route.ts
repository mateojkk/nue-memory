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

    return NextResponse.json({
      success: true,
      profile: {
        ...profile,
        credit_balance: Number(profile.credit_balance ?? 10.0),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email: emailInput, action, amount } = body;

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

    // Validate action
    if (action !== 'topup' && action !== 'deduct') {
      return NextResponse.json({ success: false, error: 'Invalid action: must be topup or deduct' }, { status: 400 });
    }

    // Strict amount validation: must be a finite positive number
    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0 || !Number.isFinite(parsedAmount)) {
      return NextResponse.json({ success: false, error: 'Amount must be a positive finite number' }, { status: 400 });
    }

    // Security bounds: cap deduct at $1.00 per single operation, cap topup at $50.00
    if (action === 'deduct' && parsedAmount > 1.0) {
      return NextResponse.json({ success: false, error: 'Deduction exceeds maximum single unit limit ($1.00)' }, { status: 400 });
    }
    if (action === 'topup' && parsedAmount > 50.0) {
      return NextResponse.json({ success: false, error: 'Top-up exceeds maximum single grant limit ($50.00)' }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json({
        success: true,
        credit_balance: 10.0 + (action === 'topup' ? parsedAmount : -parsedAmount),
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

    if (action === 'topup') {
      currentBalance = Number((currentBalance + parsedAmount).toFixed(2));
    } else if (action === 'deduct') {
      if (currentBalance < parsedAmount) {
        return NextResponse.json(
          {
            success: false,
            error: 'Insufficient credit balance. Please top up your balance to continue generating media.',
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
