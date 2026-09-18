import { supabase } from "@/app/lib/supabase";

export default async function uploadExcelToSupabase(rawData: Record<string, any>[]) {
  // แปลงข้อมูลให้ตรงกับ Column ใน Database (รองรับทั้งตัวพิมพ์เล็กและใหญ่)
  const payload = rawData.map((row) => ({
    date: row["Date"] ?? row["date"],
    line: row["Line"] ?? row["line"] ?? "-",
    model_suffix: row["Model Suffix"] ?? row["model_suffix"],
    product_number: row["Product number"] ?? row["product_number"],
    color: row["Color"] ?? row["color"],
    total: Number(row["TOTAL"] ?? row["Total"] ?? row["total"]) || 0,
    passed: Number(row["PASSED"] ?? row["Passed"] ?? row["passed"]) || 0,
    reject: Number(row["REJECT"] ?? row["Reject"] ?? row["reject"]) || 0,
    yield: Number(row["Yield"] ?? row["YIELD"] ?? row["yield"]) || 0,
    percent_reject: Number(row["% Reject"] ?? row["% REJECT"] ?? row["percent_reject"]) || 0,
    actual_defect: Number(row["Actual Defect"] ?? row["ACTUAL DEFECT"] ?? row["actual_defect"]) || 0,
    camera: row["Camera"] ?? row["camera"] ?? "",
    time_of_detection: row["Time of detection"] ?? row["time_of_detection"] ?? "",
    attached_image: row["Attached image"] ?? row["attached_image"] ?? "",
  }));

  const { data, error } = await supabase.from("visionReport").insert(payload);

  if (error) {
    throw error;
  }

  return data;
}