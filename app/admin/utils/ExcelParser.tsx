"use client";
import * as XLSX from "xlsx";
import { useRef, ChangeEvent } from "react";

interface ExcelParserProps {
  onDataParsed?: (data: Record<string, any>[]) => void;
}

export default function ExcelParser({ onDataParsed }: ExcelParserProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // อ่านข้อมูลจากชีต โดยให้เซลล์ว่างเป็นค่าว่าง ""
    const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
      defval: "",
    });

    // ทำความสะอาดชื่อคอลัมน์ และแปลงวันที่ให้ถูกต้อง
    const cleanedData = jsonData.map((row) => {
      const newRow: Record<string, any> = {};

      Object.keys(row).forEach((key) => {
        // แทนที่การเคาะขึ้นบรรทัดใหม่ด้วย 1 วรรค และตัดช่องว่างส่วนเกิน
        const cleanKey = key.replace(/[\r\n]+/g, " ").trim();
        let value = row[key];
        if (typeof value === "number" && !Number.isInteger(value)) {
          value = Number(value.toFixed(2));
        }
        // แปลงเฉพาะคอลัมน์ที่เป็น Date ให้ตรงกับไฟล์ Excel 100%
        if (cleanKey.toLowerCase() === "date" || cleanKey.toLowerCase().includes("date")) {
          // ถ้าเป็น Date object
          if (value instanceof Date) {
            // บวกเวลาไป 12 ชั่วโมง เพื่อให้อยู่เที่ยงวัน ป้องกันการลดลงไป 1 วันจาก Timezone
            const safeDate = new Date(value.getTime() + 12 * 60 * 60 * 1000);
            const y = safeDate.getUTCFullYear();
            const m = String(safeDate.getUTCMonth() + 1).padStart(2, "0");
            const d = String(safeDate.getUTCDate()).padStart(2, "0");
            value = `${y}-${m}-${d}`;
          }
          // ถ้าเป็นตัวเลข Serial ของ Excel เช่น 46215
          else if (typeof value === "number" && value > 1000) {
            const excelEpoch = new Date(Date.UTC(1899, 11, 30));
            const safeDate = new Date(excelEpoch.getTime() + value * 86400000 + 12 * 60 * 60 * 1000);
            const y = safeDate.getUTCFullYear();
            const m = String(safeDate.getUTCMonth() + 1).padStart(2, "0");
            const d = String(safeDate.getUTCDate()).padStart(2, "0");
            value = `${y}-${m}-${d}`;
          }
        }

        // เก็บข้อมูลทุกคอลัมน์ลงใน newRow
        newRow[cleanKey] = value;
      });

      return newRow;
    });

    if (onDataParsed) {
      onDataParsed(cleanedData);
    }

    e.target.value = "";
  };

  return (
    <div className="w-full items-center">
      <div className="w-full mx-auto rounded-2xl p-6 flex flex-col items-center justify-center">
        <h1 className="font-bold text-lg text-white dark:text-white">File Upload</h1>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept=".xlsx, .xls, .csv"
        />

        <button
          type="button"
          onClick={handleButtonClick}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg w-50 mt-6 cursor-pointer transition-colors"
        >
          เลือกไฟล์ Excel
        </button>
      </div>
    </div>
  );
}