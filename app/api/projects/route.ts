import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { checkRateLimit, getClientIdentifier } from '@/lib/security/rate-limit';
import { sanitizeText } from '@/lib/security/sanitize';
import { authenticateRequest } from '@/lib/auth/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const emailParam = searchParams.get('email') || undefined;

    // Authenticate caller identity
    const auth = await authenticateRequest(request, emailParam);
    if (!auth.authenticated || !auth.email) {
      return NextResponse.json({ success: false, error: auth.error || 'Authentication required' }, { status: 401 });
    }

    const email = auth.email;

    // Rate limit: 60 requests per minute
    const clientId = getClientIdentifier(request, email);
    const rateCheck = checkRateLimit(`projects:get:${clientId}`, 60, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please slow down.' },
        { status: 429, headers: { 'Retry-After': String(rateCheck.resetSeconds) } }
      );
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

    const projects = (dbProjects || []).map((p) => {
      let prompt = p.initial_prompt || '';
      let messages: any[] = [];

      if (prompt.startsWith('{') && prompt.includes('"messages"')) {
        try {
          const parsed = JSON.parse(prompt);
          prompt = parsed.text || '';
          messages = Array.isArray(parsed.messages) ? parsed.messages : [];
        } catch {
          // Fallback to raw string
        }
      }

      // If messages array is empty, reconstruct conversation turns from versions and prompt
      if (messages.length === 0 && (prompt || (Array.isArray(p.versions) && p.versions.length > 0))) {
        if (prompt) {
          messages.push({
            id: `msg-recon-init-${p.id}`,
            sender: 'user',
            content: prompt,
            timestamp: p.created_at || new Date().toISOString(),
          });
        }
        if (Array.isArray(p.versions)) {
          p.versions.forEach((v: any, idx: number) => {
            const vNum = v.versionNumber || idx + 1;
            const dur = v.generationDurationSeconds || 15;
            const cap = v.livepeerCapability || 'seedance-25-t2v';
            const pacing = v.pacing || 'moderate';
            const captions = v.captionStyle?.size || 'medium';
            const audio = v.audioStyle?.style || 'modern electronic';
            messages.push({
              id: `msg-recon-ver-${p.id}-${vNum}`,
              sender: 'agent',
              content: `I have generated Version ${vNum} (${dur}s clip on ${cap}) with ${pacing} pacing, ${captions} captions, and ${audio}.`,
              timestamp: v.createdAt || p.created_at || new Date().toISOString(),
              versionNumber: vNum,
            });
          });
        }
      }

      return {
        id: p.id,
        title: p.title,
        initialPrompt: prompt,
        currentVersionIndex: p.current_version_index || 0,
        versions: Array.isArray(p.versions) ? p.versions : [],
        messages,
        createdAt: p.created_at,
      };
    });

    return NextResponse.json({ success: true, projects });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email: emailInput, project } = body;

    // Authenticate caller identity
    const auth = await authenticateRequest(request, emailInput);
    if (!auth.authenticated || !auth.email) {
      return NextResponse.json({ success: false, error: auth.error || 'Authentication required' }, { status: 401 });
    }

    const email = auth.email;

    if (!project || !project.id) {
      return NextResponse.json({ success: false, error: 'Valid project object with id required' }, { status: 400 });
    }

    // Rate limit: 45 saves per minute
    const clientId = getClientIdentifier(request, email);
    const rateCheck = checkRateLimit(`projects:post:${clientId}`, 45, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please slow down.' },
        { status: 429, headers: { 'Retry-After': String(rateCheck.resetSeconds) } }
      );
    }

    // Sanitize title and prompt (unwrap if already a JSON payload)
    let rawText = project.initialPrompt || '';
    if (typeof rawText === 'string' && rawText.startsWith('{') && rawText.includes('"messages"')) {
      try {
        const parsed = JSON.parse(rawText);
        rawText = parsed.text || '';
      } catch {}
    }

    const titleCheck = sanitizeText(project.title || 'Untitled Project', 120, 'Project title');
    const sanitizedTitle = titleCheck.valid ? titleCheck.sanitized! : 'Untitled Project';

    const promptCheck = sanitizeText(rawText, 2500, 'Initial prompt');
    const sanitizedPrompt = promptCheck.valid ? promptCheck.sanitized! : '';

    if (!supabase) {
      return NextResponse.json({ success: true, project, fallback: true });
    }

    // Limit stored messages array to most recent 100 entries to prevent DB bloat
    const boundedMessages = Array.isArray(project.messages)
      ? project.messages.slice(-100)
      : [];

    let initialPromptPayload = sanitizedPrompt;
    if (boundedMessages.length > 0) {
      initialPromptPayload = JSON.stringify({
        text: sanitizedPrompt,
        messages: boundedMessages,
      });
    }

    const row = {
      id: String(project.id).slice(0, 100),
      user_id: email,
      title: sanitizedTitle,
      initial_prompt: initialPromptPayload,
      current_version_index: Math.max(0, Number(project.currentVersionIndex) || 0),
      versions: Array.isArray(project.versions) ? project.versions.slice(-50) : [],
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
    const emailParam = searchParams.get('email');

    // Authenticate caller identity
    const auth = await authenticateRequest(request, emailParam);
    if (!auth.authenticated || !auth.email) {
      return NextResponse.json({ success: false, error: auth.error || 'Authentication required' }, { status: 401 });
    }

    const email = auth.email;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Project ID required' }, { status: 400 });
    }

    // Rate limit: 20 deletes per minute
    const clientId = getClientIdentifier(request, email);
    const rateCheck = checkRateLimit(`projects:delete:${clientId}`, 20, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please slow down.' },
        { status: 429, headers: { 'Retry-After': String(rateCheck.resetSeconds) } }
      );
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
