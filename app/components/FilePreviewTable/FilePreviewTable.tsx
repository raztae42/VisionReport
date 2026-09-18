"use client";

import React, { useMemo } from "react";

interface FilePreviewTableProps {
  data: Record<string, any>[];
}

export default function FilePreviewTable({ data }: FilePreviewTableProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500 text-sm">
        ยังไม่มีข้อมูลที่ upload เข้ามาในระบบ
      </div>
    );
  }

  // ดึงชื่อคอลัมน์ทั้งหมดจากข้อมูลทุกแถว เพื่อป้องกันคอลัมน์ตกหล่น
  const headers = useMemo(() => {
    const keysSet = new Set<string>();
    data.forEach((row) => {
      Object.keys(row).forEach((k) => {
        if (!k.startsWith("__EMPTY") && k.trim() !== "") {
          keysSet.add(k);
        }
      });
    });
    return Array.from(keysSet);
  }, [data]);
  const displayValue = (val: any) => {
    if (val === null || val === undefined || val === "") {
      return "-";
    }
    if (val instanceof Date) {
      return val.toLocaleDateString("en-CA");
    }

    if (typeof val === "number" && !Number.isInteger(val)) {
      return val.toFixed(2);
    }
    return String(val);
  }
  return (
    <div className="w-full mt-6 flex flex-col gap-3">
      <div className="flex justify-between items-center text-zinc-400 text-sm px-1">
        <span>
          แสดงตัวอย่างข้อมูล (ทั้งหมด {data.length.toLocaleString()} แถว)
        </span>
      </div>

      {/* กรอบตาราง รองรับ Scroll ทั้งแนวนอนและแนวตั้ง */}
      <div className="w-full max-w-full overflow-x-auto max-h-[500px] border border-white/15 rounded-xl bg-black/40">
        <table className="w-full text-left text-sm text-zinc-300">
          <thead className="sticky top-0 bg-zinc-900 border-b border-white/10 text-xs uppercase font-semibold text-zinc-400">
            <tr>
              <th className="px-4 py-3 w-14 text-center"> No. </th>
              {headers.map((header) => (
                <th key={header} className="px-4 py-3 whitespace-nowrap text-center">
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          {/* ส่วนเนื้อหาตาราง */}
          <tbody className="divide-y divide-white/10">
            {data.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-white/5 transition-colors">
                <td className="px-4 py-2.5 text-center text-zinc-500 font-mono text-xs">
                  {rowIndex + 1}
                </td>
                {headers.map((header) => (

                  <td
                    key={header}
                    className="px-4 py-2.5 whitespace-nowrap text-center text-xs"
                  >
                    {displayValue(row[header])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}