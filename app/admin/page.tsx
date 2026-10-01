"use client";

import GradientText from "../components/GradientText";
import ExcelParser from "./utils/ExcelParser";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import FilePreviewTable from "../components/FilePreviewTable/FilePreviewTable";
import uploadExcelToSupabase from "@/Service/reportService";

export default function AdminPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Guard: ถ้ายังไม่ได้ผ่านรหัสผ่าน ให้กลับไปหน้าหลัก
  useEffect(() => {
    const auth = sessionStorage.getItem("admin_auth");
    if (auth === "true") {
      setIsAuthorized(true);
    } else {
      router.replace("/");
    }
  }, [router]);

  const [tableDate, setTableData] = useState<Record<string, any>[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // แสดง loading ขณะเช็ค auth
  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-500 text-sm mt-3">กำลังตรวจสอบสิทธิ์...</p>
      </div>
    );
  }

  const handleSaveData = async () => {
    if (tableDate.length === 0) {
      alert("ไม่มีข้อมูลสำหรับบันทึก");
      return;
    }

    try {
      setIsUploading(true);
      await uploadExcelToSupabase(tableDate);
      alert(`บันทึกข้อมูลเข้า Supabase สำเร็จแล้ว ${tableDate.length} แถว! 🎉`);
    } catch (err: any) {
      console.error(err);
      alert(`บันทึกไม่สำเร็จ: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const ClearData = () => {
    if (confirm("ยืนยัน เพื่อลบไฟล์ที่เลือก")) {
      setTableData([]);
    }
  }
  return (
    <div className="flex flex-col flex-1 min-h-screen bg-zinc-50 font-sans dark:bg-black px-12 pt-28 pb-12">
      <div className="max-w-4xl mx-auto w-full">
        <GradientText
          colors={["#5227FF", "#FF9FFC", "#B497CF"]}
          animationSpeed={20}
          showBorder={false}
          className="font-bold text-3xl mb-6 text-white tracking-tight"
        >
          Admin Workspace
        </GradientText>
      </div>

      <div className="container mx-auto">
        <ExcelParser onDataParsed={(data) => setTableData(data)} />
      </div>

      {tableDate.length > 0 && (
        <div className="container mx-auto flex justify-end mt-6 gap-3">
          <button
            type="button"
            onClick={handleSaveData}
            disabled={isUploading}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-600 text-white font-medium rounded-lg transition-colors cursor-pointer"
          >
            {isUploading ? "กำลังบันทึก..." : "บันทึกข้อมูลลงฐานข้อมูล"}
          </button>
          <button
            type="button"
            onClick={ClearData}
            disabled={isUploading}
            className="px-6 py-2.5 bg-red-500 hover:bg-red-800 disabled:bg-zinc-600 text-white font-medium rounded-lg transition-colors cursor-pointer">
            ล้างข้อมูล
          </button>
        </div>
      )}

      <div className="container mx-auto w-full max-w-full overflow-hidden">
        <FilePreviewTable data={tableDate} />
      </div>
    </div>
  );
}
