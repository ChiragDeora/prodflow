import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcrypt';
import { validateObject, commonSchemas } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate and sanitize input
    const validatedData = validateObject(body, {
      username: commonSchemas.username,
      email: commonSchemas.email,
      password: commonSchemas.password,
      fullName: {
        required: true,
        minLength: 2,
        maxLength: 100,
        type: 'string'
      },
      phone: commonSchemas.phone
    });

    const { username, email, password, fullName, phone } = validatedData;

    // Check email domain
    if (!email.endsWith('@polypacks.in')) {
      return NextResponse.json(
        { error: 'Only @polypacks.in email addresses are allowed' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('auth_users')
      .select('id')
      .or(`username.eq.${username},email.eq.${email}`)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username or email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user (will be in pending status by default)
    const { data: newUser, error } = await supabase
      .from('auth_users')
      .insert({
        username,
        email,
        password_hash: passwordHash,
        full_name: fullName,
        phone,
        status: 'pending', // Awaiting Yogesh's approval
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id, username, email, full_name, status')
      .single();

    if (error) {
      console.error('Signup error:', error);
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      );
    }

    // Log the signup attempt
    await supabase.from('auth_audit_logs').insert({
      user_id: newUser.id,
      action: 'signup_attempt',
      resource_type: 'auth_users',
      resource_id: newUser.id,
      details: {
        username,
        email,
        full_name: fullName,
        phone
      },
      outcome: 'success',
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      user_agent: request.headers.get('user-agent') || null
    });

    return NextResponse.json({
      message: 'Account created successfully. Please wait for admin approval.',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        fullName: newUser.full_name,
        status: newUser.status
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
