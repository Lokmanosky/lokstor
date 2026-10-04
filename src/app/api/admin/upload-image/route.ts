import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.IMGBB_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'IMGBB_API_KEY is not configured' }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get('image');

    if (!file) {
      return NextResponse.json({ success: false, error: 'No image provided' }, { status: 400 });
    }

    // Prepare outbound form to ImgBB
    const imgbbForm = new FormData();
    imgbbForm.append('image', file as Blob | string);

    const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      body: imgbbForm,
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      console.error('ImgBB upload error:', data);
      return NextResponse.json({ 
        success: false, 
        error: data.error?.message || 'Failed to upload image to ImgBB' 
      }, { status: 502 });
    }

    // Return the clean direct URL
    const imageUrl = data.data.url || data.data.display_url;
    return NextResponse.json({
      success: true,
      url: imageUrl,
      thumb: data.data.thumb?.url || imageUrl,
      delete_url: data.data.delete_url,
    });
  } catch (error: any) {
    console.error('Error in /api/admin/upload-image:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
