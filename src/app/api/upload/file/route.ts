import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, chmod } from 'fs/promises';
import { join, resolve } from 'path';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Cache directory existence check to avoid repeated file system operations
let uploadsDirectoryInitialized = false;

function errorResponse(message: string, statusCode: number) {
  return {
    success: false,
    reason: message,
    statusCode
  };
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        errorResponse('No token provided', 401),
        { status: 401 }
      );
    }

    let payload: any;
    let userId: number;
    
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET || 'development-jwt-secret-key-consistent-across-environments') as any;
      userId = parseInt(payload.uid || payload.userId);
    } catch (jwtError) {
      return NextResponse.json(
        errorResponse('Invalid or expired token', 401),
        { status: 401 }
      );
    }

    if (!userId || isNaN(userId)) {
      return NextResponse.json(
        errorResponse('Invalid token payload - no valid user ID', 401),
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        errorResponse('No file provided', 400),
        { status: 400 }
      );
    }

    // Validate file size (max 50MB for files)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        errorResponse('File size must be less than 50MB', 400),
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist (cached check)
    // Use relative path with ../ to work in both dev and production standalone mode
    // In standalone: process.cwd() is .next/standalone/, so ../.. goes to project root
    // In dev: process.cwd() is project root, so we check and use appropriate path
    let uploadsDir: string;
    if (process.cwd().includes('.next/standalone') || process.cwd().includes('.next\\standalone')) {
      // Production standalone mode - go up two levels
      uploadsDir = resolve(process.cwd(), '..', '..', 'public', 'uploads', 'files');
    } else {
      // Development mode - use direct path
      uploadsDir = resolve(process.cwd(), 'public', 'uploads', 'files');
    }
    if (!uploadsDirectoryInitialized) {
      try {
        await mkdir(uploadsDir, { recursive: true });
        uploadsDirectoryInitialized = true;
      } catch (error) {
        // Directory already exists, ignore error
        uploadsDirectoryInitialized = true;
      }
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substr(2, 9);
    const fileExtension = file.name.split('.').pop() || 'bin';
    const filename = `${userId}_${timestamp}_${randomString}.${fileExtension}`;
    const filepath = join(uploadsDir, filename);

    // Use streaming for better performance with large files
    // Convert File to Buffer more efficiently
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Write file asynchronously (non-blocking)
    await writeFile(filepath, buffer);
    
    // Set correct permissions so web server can read it
    await chmod(filepath, 0o644);

    // Return the public URL
    const fileUrl = `/uploads/files/${filename}`;

    return NextResponse.json({
      success: true,
      data: {
        fileUrl,
        filename: file.name, // Original filename
        storedFilename: filename, // Server stored filename
        size: file.size,
        type: file.type
      }
    });

  } catch (error) {
    return NextResponse.json(
      errorResponse(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`, 500),
      { status: 500 }
    );
  }
}

