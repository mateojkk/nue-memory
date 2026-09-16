import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email parameter required' }, { status: 400 });
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
    const { email, action, amount } = body;

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json({
        success: true,
        credit_balance: 10.0 + (action === 'topup' ? (amount || 5.0) : 0),
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
      const addAmount = Number(amount ?? 5.0);
      currentBalance = Number((currentBalance + addAmount).toFixed(2));
    } else if (action === 'deduct') {
      const deductAmount = Number(amount ?? 0.05);
      currentBalance = Math.max(0, Number((currentBalance - deductAmount).toFixed(2)));
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
