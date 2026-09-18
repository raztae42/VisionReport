"use client";

function formatCellValue(value: unknown, header?: string): string {
  if (value === null || value === undefined) return "-";
  if (value instanceof Date) {
    return value.toLocaleDateString("en-CA");
  }
  return String(value);
}

interface PreviewTableProps {
  fileName: string | null;
  headers: string[];
  rows: Record<string, unknown>[];
  onClear: () => void;
  onRemoveRow: (index: number) => void;
  onConfirm: () => void;
  confirmLabel?: string;
}

export default function PreviewTable({
  fileName,
  headers,
  rows,
  onClear,
  onRemoveRow,
  onConfirm,
  confirmLabel = "Confirm Upload",
}: PreviewTableProps) {
  if (rows.length === 0) {
    return (
      <p className="text-slate-500 text-sm">
        ยังไม่มีไฟล์ — กรุณาวางไฟล์ CSV/Excel ที่กรอบด้านบนก่อน
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-slate-500 font-mono bg-white/5 px-2 py-0.5 rounded-md">
          {fileName} — {rows.length} rows
        </span>
        <button
          onClick={onClear}
          className="text-xs text-rose-400 hover:text-rose-300 transition cursor-pointer"
        >
          Clear Preview
        </button>
      </div>

      <div className="overflow-auto max-h-80 rounded-xl border border-white/10">
        <table className="w-full text-sm text-left">
          <thead className="sticky top-0 z-10">
            <tr className="bg-white/10 backdrop-blur-sm">
              <th className="px-3 py-2 text-slate-400 font-medium text-xs w-10">#</th>
              {headers.map((h) => (
                <th key={h} className="px-3 py-2 text-slate-300 font-semibold text-xs whitespace-nowrap">
                  {h}
                </th>
              ))}
              <th className="px-3 py-2 w-10" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                <td className="px-3 py-2 text-slate-500 font-mono text-xs">{idx + 1}</td>
                {headers.map((h) => (
                  <td key={h} className="px-3 py-2 text-slate-300 text-xs whitespace-nowrap max-w-[200px] truncate">
                    {formatCellValue(row[h], h)}
                  </td>
                ))}
                <td className="px-3 py-2">
                  <button
                    onClick={() => onRemoveRow(idx)}
                    className="text-slate-500 hover:text-rose-400 transition text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end mt-4">
        <button
          onClick={onConfirm}
          className="px-5 py-2 rounded-xl font-medium text-sm bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20 transition cursor-pointer"
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}
