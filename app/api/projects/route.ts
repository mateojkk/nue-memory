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
      return NextResponse.json({ success: true, projects: [], fallback: true });
    }

    const { data: dbProjects, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', email)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase projects query warning:', error);
      return NextResponse.json({ success: true, projects: [] });
    }

    const projects = (dbProjects || []).map((p) => ({
      id: p.id,
      title: p.title,
      initialPrompt: p.initial_prompt || '',
      currentVersionIndex: p.current_version_index || 0,
      versions: Array.isArray(p.versions) ? p.versions : [],
      createdAt: p.created_at,
    }));

    return NextResponse.json({ success: true, projects });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, project } = body;

    if (!email || !project || !project.id) {
      return NextResponse.json({ success: false, error: 'Email and valid project required' }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json({ success: true, project, fallback: true });
    }

    const row = {
      id: project.id,
      user_id: email,
      title: project.title,
      initial_prompt: project.initialPrompt || '',
      current_version_index: project.currentVersionIndex || 0,
      versions: project.versions || [],
      updated_at: new Date().toISOString(),
    };

    const { data: saved, error } = await supabase
      .from('projects')
      .upsert(row, { onConflict: 'id' })
      .select('*')
      .single();

    if (error) {
      console.warn('Supabase save project error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, project: saved });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || String(err) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const email = searchParams.get('email');

    if (!id || !email) {
      return NextResponse.json({ success: false, error: 'ID and email required' }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json({ success: true, id, fallback: true });
    }

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('user_id', email);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, removedId: id });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || String(err) }, { status: 500 });
  }
}
