import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, chmod } from 'fs/promises';
import { join } from 'path';
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
    const file = formData.get('image') as File;
    
    if (!file) {
      return NextResponse.json(
        errorResponse('No image file provided', 400),
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        errorResponse('File must be an image', 400),
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        errorResponse('File size must be less than 5MB', 400),
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist (cached check)
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'posts');
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
    const fileExtension = file.name.split('.').pop() || 'jpg';
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
    const imageUrl = `/uploads/posts/${filename}`;

    return NextResponse.json({
      success: true,
      data: {
        imageUrl,
        filename,
        size: file.size,
        type: file.type
      }
    });

  } catch (error) {
    return NextResponse.json(
      errorResponse(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`, 500),
      { status: 500 }
    );
  }
}
