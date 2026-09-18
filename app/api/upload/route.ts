import { supabase } from "@/app/lib/supabase";
import { NextResponse } from "next/server";
import * as xlsx from "xlsx";

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // 1. อ่านไฟล์เป็น Buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // 2. ใช้ xlsx อ่านไฟล์
        const workbook = xlsx.read(buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0]; // อ่าน sheet แรก
        const sheet = workbook.Sheets[sheetName];

        // 3. แปลง sheet เป็น Array of Object (JSON)
        const jsonData = xlsx.utils.sheet_to_json(sheet);

        // 4. บันทึกลง Database (เช่น Prisma / SQLite / MySQL / PostgreSQL / )
        const { error: dbError } = await supabase.from("inspection_report").insert(jsonData);

        if (dbError) {
            console.error("supabase error:", dbError);
            return NextResponse.json({ error: dbError.message }, { status: 500 });
        }
        // ตัวอย่าง: await db.report.createMany({ data: JsonData })

        return NextResponse.json({ success: true, const: jsonData.length });
    } catch (error) {
        return NextResponse.json({ error: "Failed to process file" }, { status: 500 });
    }

}