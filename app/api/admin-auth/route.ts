import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      return NextResponse.json(
        { success: false, message: "ยังไม่ได้ตั้งค่ารหัสผ่าน Admin ในระบบ" },
        { status: 500 }
      );
    }

    if (password === adminPassword) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, message: "รหัสผ่านไม่ถูกต้อง" },
      { status: 401 }
    );
  } catch {
    return NextResponse.json(
      { success: false, message: "เกิดข้อผิดพลาด" },
      { status: 400 }
    );
  }
}
