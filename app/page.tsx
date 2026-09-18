"use client";

import ResultChart from "./components/Charts/LineChart";
import ResultPieChart from "./components/Charts/PieCharts";
import { supabase } from "./lib/supabase";
import MoltenMetal from "./components/MoltenMetal";
import GradientText from "./components/GradientText";
import { useState, useMemo, useEffect } from "react";

export interface VisionReportItem {
  id?: number | string;
  date?: string;
  line?: string;
  model_suffix?: string;
  product_number?: string;
  color?: string;
  total?: number;
  passed?: number;
  reject?: number;
  yield?: number | string;
  actual_defect?: number;
  camera?: string;
  time?: string;
  time_of_detection?: string;
  attached_image?: string;
  image_url?: string;
  [key: string]: unknown;
}

export default function Home() {
  const [report, setReport] = useState<VisionReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 1. ดึงข้อมูลจริงจากตาราง visionReport ใน Supabase
  useEffect(() => {
    async function fetchReport() {
      try {
        setIsLoading(true);
        const PAGE_SIZE = 1000;
        let allData: VisionReportItem[] = [];
        let from = 0;
        let keepFetching = true;

        while (keepFetching) {
          const { data, error } = await supabase
            .from("visionReport")
            .select("*")
            .order("date", { ascending: true })
            .range(from, from + PAGE_SIZE - 1);

          if (error) {
            console.error("Supabase error:", error);
            keepFetching = false;
          } else if (data) {
            allData = allData.concat(data);
            if (data.length < PAGE_SIZE) {
              keepFetching = false;
            } else {
              from += PAGE_SIZE;
            }
          } else {
            keepFetching = false;
          }
        }

        setReport(allData);
      } catch (err) {
        console.error("Error fetching visionReport:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchReport();
  }, []);

  // 2. ตัวแปร State สำหรับระบบ Filter และกราฟ
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLine, setSelectedLine] = useState("ALL");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedYield, setSelectedYield] = useState<"ALL" | "<50" | "<70" | "<80" | "<90">("ALL");
  const [openFilterCol, setOpenFilterCol] = useState<string | null>(null);
  const [pieMode, setPieMode] = useState<"pass_reject" | "reject_by_model" | "actual_defect">("pass_reject");
  const [weekOffset, setWeekOffset] = useState(0); // 0 = สัปดาห์ปัจจุบัน, -1 = สัปดาห์ก่อน, ...

  // State สำหรับ Pagination และ Modal ดูรูป
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // รีเซ็ตหน้าเมื่อเปลี่ยนตัวกรอง (Pattern: Adjusting state during render หลีกเลี่ยง cascading renders)
  const [prevFilters, setPrevFilters] = useState({
    searchTerm,
    selectedLine,
    selectedDate,
    selectedYield,
  });

  if (
    prevFilters.searchTerm !== searchTerm ||
    prevFilters.selectedLine !== selectedLine ||
    prevFilters.selectedDate !== selectedDate ||
    prevFilters.selectedYield !== selectedYield
  ) {
    setPrevFilters({ searchTerm, selectedLine, selectedDate, selectedYield });
    setCurrentPage(1);
  }

  // ดึงรายการ Line ที่มีอยู่จริงในข้อมูลแบบ Dynamic
  const availableLines = useMemo(() => {
    const linesSet = new Set<string>();
    (report || []).forEach((r) => {
      if (r.line && r.line !== "-") {
        linesSet.add(r.line);
      }
    });
    return Array.from(linesSet);
  }, [report]);

  // ดึงรายการ Product No ที่มีอยู่จริงในข้อมูลแบบ Dynamic
  const availableProducts = useMemo(() => {
    const pSet = new Set<string>();
    (report || []).forEach((r) => {
      if (r.product_number && r.product_number !== "-") {
        pSet.add(r.product_number);
      }
    });
    return Array.from(pSet).sort();
  }, [report]);

  // 3. กรองข้อมูลตามเงื่อนไข (Filtered Data)
  const filteredReports = useMemo(() => {
    return (report || []).filter((row) => {
      // ค้นหา Model Suffix หรือ Product Number
      const matchSearch =
        !searchTerm.trim() ||
        row.model_suffix?.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        row.product_number?.toLowerCase().includes(searchTerm.toLowerCase().trim());

      // กรองตาม Line
      const matchLine =
        !selectedLine ||
        selectedLine.toUpperCase() === "ALL" ||
        row.line === selectedLine;

      // กรองตาม Date
      const matchDate =
        !selectedDate ||
        selectedDate.toUpperCase() === "ALL" ||
        row.date === selectedDate;

      // กรองตาม Yield (<50, <70, <80, <90)
      let matchYield = true;
      const rowYield = Number(row.yield) || 0;
      if (selectedYield === "<50") {
        matchYield = rowYield < 50;
      } else if (selectedYield === "<70") {
        matchYield = rowYield < 70;
      } else if (selectedYield === "<80") {
        matchYield = rowYield < 80;
      } else if (selectedYield === "<90") {
        matchYield = rowYield < 90;
      }

      return matchSearch && matchLine && matchDate && matchYield;
    });
  }, [report, searchTerm, selectedLine, selectedDate, selectedYield]);

  // 4. คำนวณกราฟเส้นที่ 1: สถิติรายเดือน (แสดงครบทั้งปี 12 เดือน Jan - Dec)
  const monthlyData = useMemo(() => {
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    const monthsMap: Record<number, { name: string; Good: number; Passed: number; NG: number; Reject: number }> = {};
    monthNames.forEach((name, index) => {
      monthsMap[index] = { name, Good: 0, Passed: 0, NG: 0, Reject: 0 };
    });

    const relevantReports = (report || []).filter((row) => {
      const matchSearch =
        !searchTerm.trim() ||
        row.model_suffix?.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        row.product_number?.toLowerCase().includes(searchTerm.toLowerCase().trim());
      const matchLine = !selectedLine || selectedLine.toUpperCase() === "ALL" || row.line === selectedLine;
      return matchSearch && matchLine;
    });

    relevantReports.forEach((item) => {
      if (!item.date) return;
      const parts = String(item.date).split("-");
      if (parts.length >= 2) {
        const monthIndex = parseInt(parts[1], 10) - 1;
        if (monthIndex >= 0 && monthIndex < 12) {
          const p = Number(item.passed) || 0;
          const r = Number(item.reject) || 0;
          monthsMap[monthIndex].Good += p;
          monthsMap[monthIndex].Passed += p;
          monthsMap[monthIndex].NG += r;
          monthsMap[monthIndex].Reject += r;
        }
      }
    });

    return Object.values(monthsMap);
  }, [report, searchTerm, selectedLine]);

  // 5. คำนวณกราฟเส้นที่ 2: สถิติ 7 วันของสัปดาห์ (จันทร์ - อาทิตย์ 7 วัน) รองรับเลื่อนดูย้อนหลัง
  const { weeklyData, weekRangeText } = useMemo(() => {
    // ใช้วันปัจจุบัน
    const now = new Date();

    // หาวันจันทร์ของสัปดาห์ปัจจุบัน (Mon - Sun)
    const currentDay = now.getDay(); // 0 = Sun, 1 = Mon ...
    const diffToMonday = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
    const monday = new Date(now);
    monday.setDate(diffToMonday);

    // เลื่อนสัปดาห์ตาม weekOffset (เช่น -1 = สัปดาห์ก่อน, -2 = 2 สัปดาห์ก่อน)
    monday.setDate(monday.getDate() + weekOffset * 7);

    // ล็อกโครงสร้างไว้แค่ 7 วันของสัปดาห์ที่เลือก
    const weekDays: Array<{
      fullDate: string;
      name: string;
      Good: number;
      Passed: number;
      NG: number;
      Reject: number;
    }> = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);

      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dayNum = String(d.getDate()).padStart(2, "0");
      const fullDate = `${y}-${m}-${dayNum}`;
      // แสดงเฉพาะ "วันที่" เช่น 07/09, 08/09 หรือ 07, 08
      const label = `${dayNum}/${m}`;

      weekDays.push({
        fullDate,
        name: label,
        Good: 0,
        Passed: 0,
        NG: 0,
        Reject: 0,
      });
    }

    // กรองตามการค้นหา Model/PN และ Line
    const relevantReports = (report || []).filter((row) => {
      const matchSearch =
        !searchTerm.trim() ||
        row.model_suffix?.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        row.product_number?.toLowerCase().includes(searchTerm.toLowerCase().trim());

      const matchLine =
        !selectedLine ||
        selectedLine.toUpperCase() === "ALL" ||
        row.line === selectedLine;

      return matchSearch && matchLine;
    });

    // รวมยอดเฉพาะ 7 วันในสัปดาห์ที่เลือก
    relevantReports.forEach((item) => {
      if (!item.date) return;
      const matchDay = weekDays.find((w) => w.fullDate === String(item.date).trim());
      if (matchDay) {
        const p = Number(item.passed) || 0;
        const r = Number(item.reject) || 0;
        matchDay.Good += p;
        matchDay.Passed += p;
        matchDay.NG += r;
        matchDay.Reject += r;
      }
    });

    const rangeText = `${weekDays[0]?.name} - ${weekDays[6]?.name}`;
    return { weeklyData: weekDays, weekRangeText: rangeText };
  }, [report, searchTerm, selectedLine, weekOffset]);

  // 6. คำนวณข้อมูลสำหรับ Pie Chart (ปรับปรุงให้ถูกต้อง ครบถ้วน และเลือกดูได้ 3 มุมมอง)
  const { pieData, pieCenterLabel, pieCenterSublabel, pieTitle } = useMemo(() => {
    // โหมดที่ 1: Pass vs Reject (สัดส่วนงานผ่าน vs งานเสีย - ตรงกับกราฟเส้นรายเดือน/สัปดาห์)
    if (pieMode === "pass_reject") {
      const totalPassed = (filteredReports || []).reduce((sum, r) => sum + (Number(r.passed) || 0), 0);
      const totalReject = (filteredReports || []).reduce((sum, r) => sum + (Number(r.reject) || 0), 0);
      const totalAll = totalPassed + totalReject;
      const passRate = totalAll > 0 ? ((totalPassed / totalAll) * 100).toFixed(1) : "0";

      const data = [
        { name: "Passed (ชิ้นงานผ่าน)", value: totalPassed, color: "#10b981" },
        { name: "Reject (ชิ้นงานเสีย)", value: totalReject, color: "#f43f5e" },
      ].filter((d) => d.value > 0);

      return {
        pieData: data,
        pieCenterLabel: `${passRate}%`,
        pieCenterSublabel: "Pass Rate",
        pieTitle: "Passed vs Reject Ratio",
      };
    }

    // โหมดที่ 2: Reject by Model (สัดส่วนของเสีย NG แยกตาม Model/PN)
    if (pieMode === "reject_by_model") {
      const modelRejects: Record<string, number> = {};
      let totalReject = 0;

      (filteredReports || []).forEach((r) => {
        const rawName =
          r.model_suffix && r.model_suffix.trim() !== "-" && r.model_suffix.trim() !== ""
            ? r.model_suffix.trim()
            : r.product_number && r.product_number.trim() !== "-"
              ? r.product_number.trim()
              : `Line ${r.line || "Other"}`;
        const rejectCount = Number(r.reject) || 0;
        if (rejectCount > 0) {
          totalReject += rejectCount;
          modelRejects[rawName] = (modelRejects[rawName] || 0) + rejectCount;
        }
      });

      const sorted = Object.entries(modelRejects).sort((a, b) => b[1] - a[1]);
      const top5 = sorted.slice(0, 5);
      const others = sorted.slice(5).reduce((sum, [, val]) => sum + val, 0);

      const data = top5.map(([name, value]) => ({ name, value }));
      if (others > 0) {
        data.push({ name: "Others (รุ่นอื่นๆ)", value: others });
      }

      return {
        pieData: data,
        pieCenterLabel: totalReject.toLocaleString(),
        pieCenterSublabel: "Total Rejects",
        pieTitle: "Defects / Reject (By Model)",
      };
    }

    // โหมดที่ 3: Actual Defect (Defect จริงที่ตรวจสอบยืนยัน)
    const modelActual: Record<string, number> = {};
    let totalActual = 0;

    (filteredReports || []).forEach((r) => {
      const rawName =
        r.model_suffix && r.model_suffix.trim() !== "-" && r.model_suffix.trim() !== ""
          ? r.model_suffix.trim()
          : r.product_number && r.product_number.trim() !== "-"
            ? r.product_number.trim()
            : `Line ${r.line || "Other"}`;
      const defectCount = Number(r.actual_defect) || 0;
      if (defectCount > 0) {
        totalActual += defectCount;
        modelActual[rawName] = (modelActual[rawName] || 0) + defectCount;
      }
    });

    const sorted = Object.entries(modelActual).sort((a, b) => b[1] - a[1]);
    const top5 = sorted.slice(0, 5);
    const others = sorted.slice(5).reduce((sum, [, val]) => sum + val, 0);

    const data = top5.map(([name, value]) => ({ name, value }));
    if (others > 0) {
      data.push({ name: "Others (รุ่นอื่นๆ)", value: others });
    }

    return {
      pieData: data,
      pieCenterLabel: totalActual.toLocaleString(),
      pieCenterSublabel: "Actual Defects",
      pieTitle: "Actual Defect (By Model)",
    };
  }, [filteredReports, pieMode]);

  // 7. คำนวณสถิติภาพรวมสำหรับ KPI Summary Cards
  const kpiStats = useMemo(() => {
    const totalInspected = (filteredReports || []).reduce((acc, r) => acc + (Number(r.total) || 0), 0);
    const totalPassed = (filteredReports || []).reduce((acc, r) => acc + (Number(r.passed) || 0), 0);
    const totalReject = (filteredReports || []).reduce((acc, r) => acc + (Number(r.reject) || 0), 0);
    const totalActualDefects = (filteredReports || []).reduce((acc, r) => acc + (Number(r.actual_defect) || 0), 0);
    const passRate = totalInspected > 0 ? ((totalPassed / totalInspected) * 100).toFixed(2) : "0.00";
    const rejectRate = totalInspected > 0 ? ((totalReject / totalInspected) * 100).toFixed(2) : "0.00";
    const avgYield = filteredReports && filteredReports.length > 0
      ? (filteredReports.reduce((acc, r) => acc + (Number(r.yield) || 0), 0) / filteredReports.length).toFixed(2)
      : "0.00";

    return {
      totalInspected,
      totalPassed,
      totalReject,
      totalActualDefects,
      passRate,
      rejectRate,
      avgYield,
    };
  }, [filteredReports]);

  // 8. คำนวณสถิติประจำเดือนปัจจุบัน (Current Month Stats: Total, Pass, Reject, Avg Yield)
  const currentMonthStats = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentMonthStr = String(currentMonth).padStart(2, "0");
    const currentYearMonth = `${currentYear}-${currentMonthStr}`;

    const monthNamesThai = [
      "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
      "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ];
    const monthNamesEng = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    const monthLabel = `${monthNamesThai[currentMonth - 1] || ""} ${currentYear} (${monthNamesEng[currentMonth - 1] || ""})`;

    // กรองข้อมูลเฉพาะเดือนปัจจุบัน (และเคารพการค้นหา Model/PN และ Line หากผู้ใช้เลือก)
    const monthReports = (report || []).filter((row) => {
      if (!row.date) return false;
      const dateStr = String(row.date).trim();
      const parts = dateStr.split("-");
      const isCurrentMonth =
        dateStr.startsWith(currentYearMonth) ||
        (parts.length >= 2 &&
          parseInt(parts[0], 10) === currentYear &&
          parseInt(parts[1], 10) === currentMonth);

      if (!isCurrentMonth) return false;

      const matchSearch =
        !searchTerm.trim() ||
        row.model_suffix?.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        row.product_number?.toLowerCase().includes(searchTerm.toLowerCase().trim());

      const matchLine =
        !selectedLine ||
        selectedLine.toUpperCase() === "ALL" ||
        row.line === selectedLine;

      return matchSearch && matchLine;
    });

    const totalInspected = monthReports.reduce((acc, r) => acc + (Number(r.total) || 0), 0);
    const totalPassed = monthReports.reduce((acc, r) => acc + (Number(r.passed) || 0), 0);
    const totalReject = monthReports.reduce((acc, r) => acc + (Number(r.reject) || 0), 0);
    const totalActualDefects = monthReports.reduce((acc, r) => acc + (Number(r.actual_defect) || 0), 0);
    const passRate = totalInspected > 0 ? ((totalPassed / totalInspected) * 100).toFixed(2) : "0.00";
    const rejectRate = totalInspected > 0 ? ((totalReject / totalInspected) * 100).toFixed(2) : "0.00";
    const avgYield = monthReports.length > 0
      ? (monthReports.reduce((acc, r) => acc + (Number(r.yield) || 0), 0) / monthReports.length).toFixed(2)
      : "0.00";

    return {
      monthLabel,
      totalInspected,
      totalPassed,
      totalReject,
      totalActualDefects,
      passRate,
      rejectRate,
      avgYield,
      count: monthReports.length,
    };
  }, [report, searchTerm, selectedLine]);

  // 9. แบ่งหน้าสำหรับตาราง (Pagination)
  const totalPages = Math.ceil((filteredReports?.length || 0) / pageSize) || 1;
  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return (filteredReports || []).slice(start, start + pageSize);
  }, [filteredReports, currentPage, pageSize]);

  return (
    <div className="relative min-h-screen flex flex-col flex-1 font-sans text-white">
      {/* Fullscreen Molten Metal Liquid Background */}
      <div className="fixed inset-0 z-0 w-full h-full pointer-events-none">
        <MoltenMetal
          color1="#5227FF"
          color2="#FF9FFC"
          color3="#FFFFFF"
          speed={0.35}
          scale={4}
          detail={3}
          glow={1.6}
          coreSize={0.1}
          swirl={1}
          fold={-0.2}
          blackPoint={0.05}
          brightness={1.3}
          colorMode="molten"
          grain
          grainIntensity={0.05}
          mouseInteraction
          mouseStrength={0.3}
          opacity={1}
        />
        <div className="absolute inset-0 bg-black/50" />
      </div>

      <main className="relative z-10 pt-24 pb-12 px-6 md:px-12 lg:px-16 max-w-[1600px] mx-auto w-full">
        {/* Top Navigation & Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <GradientText
                colors={["#5227FF", "#FF9FFC", "#B497CF"]}
                animationSpeed={20}
                showBorder={false}
                className="font-bold text-3xl text-white tracking-tight"
              >
                Dashboard Vision Report
              </GradientText>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Database
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              ระบบติดตามผลการตรวจสอบชิ้นงานและสถิติการผลิตแบบ Real-time
            </p>
          </div>

          {/* Quick Filter & Nav Actions */}
          <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
            {/* Quick Toggle Line D1 / D2 Buttons */}
            <div className="flex items-center bg-[#0b0a13]/80 backdrop-blur-xl p-1 rounded-xl border border-white/15 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
              <span className="text-[11px] text-zinc-400 font-medium px-2 hidden sm:inline">
                Line:
              </span>

              {/* ปุ่ม Line D1 (Toggle กดซ้ำเพื่อดูทั้งหมด) */}
              <button
                type="button"
                onClick={() => setSelectedLine((prev) => (prev === "D1" ? "ALL" : "D1"))}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${selectedLine === "D1"
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-600/40 border border-purple-400/50 scale-[1.02]"
                  : "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent"
                  }`}
                title={selectedLine === "D1" ? "คลิกอีกครั้งเพื่อปล่อย (ดูทั้งหมด)" : "คลิกเพื่อดูเฉพาะ Line D1"}
              >
                <span
                  className={`w-2 h-2 rounded-full transition-colors ${selectedLine === "D1" ? "bg-white animate-pulse" : "bg-purple-400/60"
                    }`}
                />
                <span>Line D1</span>
                {selectedLine === "D1" && (
                  <span className="text-[10px] bg-purple-700/90 px-1 py-0.2 rounded text-white/95">
                    ✓
                  </span>
                )}
              </button>

              {/* ปุ่ม Line D2 (Toggle กดซ้ำเพื่อดูทั้งหมด) */}
              <button
                type="button"
                onClick={() => setSelectedLine((prev) => (prev === "D2" ? "ALL" : "D2"))}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ml-1 ${selectedLine === "D2"
                  ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/40 border border-cyan-400/50 scale-[1.02]"
                  : "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent"
                  }`}
                title={selectedLine === "D2" ? "คลิกอีกครั้งเพื่อปล่อย (ดูทั้งหมด)" : "คลิกเพื่อดูเฉพาะ Line D2"}
              >
                <span
                  className={`w-2 h-2 rounded-full transition-colors ${selectedLine === "D2" ? "bg-white animate-pulse" : "bg-cyan-400/60"
                    }`}
                />
                <span>Line D2</span>
                {selectedLine === "D2" && (
                  <span className="text-[10px] bg-cyan-700/90 px-1 py-0.2 rounded text-white/95">
                    ✓
                  </span>
                )}
              </button>

              {/* ปุ่มปลด Toggle กลับไปดูทั้งหมด (แสดงเมื่อมีการเลือก Line) */}
              {selectedLine !== "ALL" && (
                <button
                  type="button"
                  onClick={() => setSelectedLine("ALL")}
                  className="px-2 py-1 ml-1 text-[11px] text-zinc-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-md transition cursor-pointer"
                  title="ดูทั้งหมด (ปล่อยตัวกรอง Line)"
                >
                  ✕ ดูทั้งหมด
                </button>
              )}
            </div>

          </div>
        </div>

        {/* แถวที่ 1: สรุปยอดประจำเดือนปัจจุบัน (Current Month Summary Cards) */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500"></span>
              </span>
              <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                <span>ยอดรวมประจำเดือนปัจจุบัน (Current Month Overview)</span>
                <span className="text-[11px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2.5 py-0.5 rounded-full">
                  {currentMonthStats.monthLabel}
                </span>
                {selectedLine !== "ALL" && (
                  <span className="text-[11px] font-semibold bg-purple-600/30 text-purple-200 border border-purple-400/40 px-2 py-0.5 rounded-full shadow-sm">
                    Line {selectedLine}
                  </span>
                )}
              </h2>
            </div>
            <span className="text-xs text-zinc-400 font-mono">
              พบ {currentMonthStats.count.toLocaleString()} รายการในเดือนนี้
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
            {/* Card 1: Total Inspected เดือนปัจจุบัน */}
            <div className="bg-[#0b0a13]/70 backdrop-blur-xl border border-cyan-500/30 hover:border-cyan-500/50 p-4 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] flex flex-col justify-between transition">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-cyan-200/90 font-medium">
                  ยอดตรวจเดือนนี้ (Total)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-medium">
                  Total Month
                </span>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-white tracking-tight font-mono">
                  {currentMonthStats.totalInspected.toLocaleString()}{" "}
                  <span className="text-xs font-sans font-normal text-zinc-400">ชิ้น</span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  จาก {currentMonthStats.count.toLocaleString()} รายการตรวจเดือนนี้
                </p>
              </div>
            </div>

            {/* Card 2: Total Passed เดือนปัจจุบัน */}
            <div className="bg-[#0b0a13]/70 backdrop-blur-xl border border-emerald-500/30 hover:border-emerald-500/50 p-4 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] flex flex-col justify-between transition">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-emerald-200/90 font-medium">
                  ยอดผ่านเดือนนี้ (Total Passed)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium">
                  Passed Month
                </span>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-emerald-400 tracking-tight font-mono">
                  {currentMonthStats.totalPassed.toLocaleString()}{" "}
                  <span className="text-xs font-sans font-normal text-zinc-400">ชิ้น</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-mono">
                    {currentMonthStats.passRate}%
                  </span>
                  <span className="text-[11px] text-zinc-400">อัตราผ่านเดือนนี้</span>
                </div>
              </div>
            </div>

            {/* Card 3: Total Reject เดือนปัจจุบัน */}
            <div className="bg-[#0b0a13]/70 backdrop-blur-xl border border-rose-500/30 hover:border-rose-500/50 p-4 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] flex flex-col justify-between transition">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-rose-200/90 font-medium">
                  ยอดเสียเดือนนี้ (Total Reject)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-300 border border-rose-500/30 font-medium">
                  Reject Month
                </span>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-rose-400 tracking-tight font-mono">
                  {currentMonthStats.totalReject.toLocaleString()}{" "}
                  <span className="text-xs font-sans font-normal text-zinc-400">ชิ้น</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[11px] font-semibold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 font-mono">
                    {currentMonthStats.rejectRate}%
                  </span>
                  <span className="text-[11px] text-zinc-400">อัตราเสียเดือนนี้</span>
                </div>
              </div>
            </div>

            {/* Card 4: Average Yield เดือนปัจจุบัน */}
            <div className="bg-[#0b0a13]/70 backdrop-blur-xl border border-purple-500/30 hover:border-purple-500/50 p-4 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] flex flex-col justify-between transition">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-purple-200/90 font-medium">
                  ผลผลิตเฉลี่ยเดือนนี้ (Avg Yield)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/30 font-medium">
                  Avg Month
                </span>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-white tracking-tight font-mono">
                  {currentMonthStats.avgYield}%
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span
                    className={`text-[11px] font-semibold px-1.5 py-0.5 rounded border ${Number(currentMonthStats.avgYield) > 80
                      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                      : Number(currentMonthStats.avgYield) >= 75
                        ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
                        : "text-rose-400 bg-rose-500/10 border-rose-500/20"
                      }`}
                  >
                    {Number(currentMonthStats.avgYield) > 80
                      ? "ปกติ (>80%)"
                      : Number(currentMonthStats.avgYield) >= 75
                        ? "เฝ้าระวัง (75-80%)"
                        : "ต่ำกว่าเกณฑ์ (≤70%)"}
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    Defect: {currentMonthStats.totalActualDefects.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* แถวที่ 2: สถิติสะสมภาพรวมทั้งหมด (Overall Summary Cards) */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                <span>สถิติสะสมภาพรวม (Overall All-Time Overview)</span>
                <span className="text-[11px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30 px-2.5 py-0.5 rounded-full">
                  All Time
                </span>
                {selectedLine !== "ALL" && (
                  <span className="text-[11px] font-semibold bg-blue-600/30 text-blue-200 border border-blue-400/40 px-2 py-0.5 rounded-full shadow-sm">
                    Line {selectedLine}
                  </span>
                )}
              </h2>
            </div>
            <span className="text-xs text-zinc-400 font-mono">
              ข้อมูลตามตัวกรอง ({filteredReports.length.toLocaleString()} รายการ)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
            {/* Card 1: Total Inspected */}
            <div className="bg-[#0b0a13]/70 backdrop-blur-xl border border-white/15 p-4 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] flex flex-col justify-between hover:border-blue-500/30 transition">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-400 font-medium">ยอดตรวจสอบสะสมทั้งหมด</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                  Total All
                </span>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-white tracking-tight font-mono">
                  {kpiStats.totalInspected.toLocaleString()}{" "}
                  <span className="text-xs font-sans font-normal text-zinc-400">ชิ้น</span>
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  จาก {filteredReports.length.toLocaleString()} รายการที่ตรวจ
                </p>
              </div>
            </div>

            {/* Card 2: Total Passed */}
            <div className="bg-[#0b0a13]/70 backdrop-blur-xl border border-white/15 p-4 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] flex flex-col justify-between hover:border-emerald-500/30 transition">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-400 font-medium">ชิ้นงานผ่านสะสม (Passed)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  Passed All
                </span>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-emerald-400 tracking-tight font-mono">
                  {kpiStats.totalPassed.toLocaleString()}{" "}
                  <span className="text-xs font-sans font-normal text-zinc-400">ชิ้น</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-mono">
                    {kpiStats.passRate}%
                  </span>
                  <span className="text-[11px] text-zinc-500">อัตราผ่านเฉลี่ย</span>
                </div>
              </div>
            </div>

            {/* Card 3: Total Reject */}
            <div className="bg-[#0b0a13]/70 backdrop-blur-xl border border-white/15 p-4 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] flex flex-col justify-between hover:border-rose-500/30 transition">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-400 font-medium">ชิ้นงานเสียสะสม (Reject)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium">
                  Reject All
                </span>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-rose-400 tracking-tight font-mono">
                  {kpiStats.totalReject.toLocaleString()}{" "}
                  <span className="text-xs font-sans font-normal text-zinc-400">ชิ้น</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[11px] font-semibold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 font-mono">
                    {kpiStats.rejectRate}%
                  </span>
                  <span className="text-[11px] text-zinc-500">อัตราเสียเฉลี่ย</span>
                </div>
              </div>
            </div>

            {/* Card 4: Average Yield */}
            <div className="bg-[#0b0a13]/70 backdrop-blur-xl border border-white/15 p-4 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] flex flex-col justify-between hover:border-purple-500/30 transition">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-400 font-medium">อัตราผลผลิตสะสม (Avg Yield)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 font-medium">
                  Yield All
                </span>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-white tracking-tight font-mono">
                  {kpiStats.avgYield}%
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span
                    className={`text-[11px] font-semibold px-1.5 py-0.5 rounded border ${Number(kpiStats.avgYield) > 80
                      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                      : Number(kpiStats.avgYield) >= 75
                        ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
                        : "text-rose-400 bg-rose-500/10 border-rose-500/20"
                      }`}
                  >
                    {Number(kpiStats.avgYield) > 80
                      ? "ปกติ (>80%)"
                      : Number(kpiStats.avgYield) >= 75
                        ? "เฝ้าระวัง (75-80%)"
                        : "ต่ำกว่าเกณฑ์ (≤70%)"}
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    Defect: {kpiStats.totalActualDefects.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* แถวที่ 1: กราฟเส้นภาพรวมรายเดือน (Jan - Dec) + กราฟโดนัทสรุปสัดส่วน */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* กราฟเส้นภาพรวมรายเดือน (Jan - Dec) */}
          <div className="lg:col-span-2 h-[380px] bg-[#0b0a13]/70 backdrop-blur-xl border border-white/15 p-6 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] flex flex-col">
            <div className="mb-4">
              <h2 className="font-bold text-white text-base">
                Monthly Inspection Overview (รายเดือน Jan - Dec)
              </h2>
              <p className="text-xs text-zinc-400">
                สถิติเปรียบเทียบยอด Passed และ Reject รวม 12 เดือนของปี
              </p>
            </div>
            <div className="flex-1 w-full min-h-0">
              {monthlyData.length > 0 ? (
                <ResultChart data={monthlyData} />
              ) : (
                <div className="h-full flex items-center justify-center text-zinc-500 text-sm">
                  ไม่มีข้อมูลกราฟ รายเดือน
                </div>
              )}
            </div>
          </div>

          {/* ส่วนกราฟโดนัทสรุปสัดส่วน (Inspection Result Ratio) */}
          <div className="h-[380px] bg-[#0b0a13]/70 backdrop-blur-xl border border-white/15 p-6 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="font-bold text-white text-base">
                  Inspection Result Ratio ({pieTitle})
                </h2>
                <p className="text-xs text-zinc-400">
                  สัดส่วนและเปอร์เซ็นต์ผลการตรวจสอบ
                </p>
              </div>

              {/* ปุ่มเลือกโหมด Pie Chart */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-white/5 rounded-xl border border-white/10 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setPieMode("pass_reject")}
                  className={`py-1 text-[11px] rounded-md font-medium transition text-center cursor-pointer truncate px-2 ${pieMode === "pass_reject"
                    ? "bg-purple-600 text-white shadow-sm font-semibold"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                    }`}
                >
                  Pass / Reject
                </button>
                <button
                  type="button"
                  onClick={() => setPieMode("reject_by_model")}
                  className={`py-1 text-[11px] rounded-md font-medium transition text-center cursor-pointer truncate px-2 ${pieMode === "reject_by_model"
                    ? "bg-purple-600 text-white shadow-sm font-semibold"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                    }`}
                >
                  Reject by Model
                </button>
                <button
                  type="button"
                  onClick={() => setPieMode("actual_defect")}
                  className={`py-1 text-[11px] rounded-md font-medium transition text-center cursor-pointer truncate px-2 ${pieMode === "actual_defect"
                    ? "bg-purple-600 text-white shadow-sm font-semibold"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                    }`}
                >
                  Actual Defect
                </button>
              </div>
            </div>

            <div className="flex-1 w-full min-h-0 flex items-center justify-center">
              <ResultPieChart
                data={pieData}
                centerLabel={pieCenterLabel}
                centerSublabel={pieCenterSublabel}
              />
            </div>
          </div>
        </div>

        {/* แถวที่ 2: กราฟเส้นแสดงสถิติรายสัปดาห์ (Weekly Line Chart - รองรับเลื่อนดูย้อนหลัง) */}
        <div className="w-full h-[440px] bg-[#0b0a13]/70 backdrop-blur-xl border border-white/15 p-6 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] flex flex-col mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="font-bold text-white text-base">
                Amount of Passed and Reject (Weekly{weekOffset === 0 ? " - สัปดาห์ปัจจุบัน" : ""})
              </h2>
              <p className="text-xs text-zinc-400">
                เปรียบเทียบยอดผ่านและเสีย 7 วัน ({weekRangeText})
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* ปุ่มเลื่อนสัปดาห์ย้อนหลัง */}
              <button
                type="button"
                onClick={() => setWeekOffset((prev) => prev - 1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-300 hover:text-white transition cursor-pointer text-sm"
                title="สัปดาห์ก่อนหน้า"
              >
                ◀
              </button>

              {/* Label สัปดาห์ + ปุ่มกลับสัปดาห์ปัจจุบัน */}
              {weekOffset === 0 ? (
                <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 font-medium whitespace-nowrap">
                  สัปดาห์ปัจจุบัน
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setWeekOffset(0)}
                  className="text-xs text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 px-2.5 py-1 rounded-full border border-purple-500/20 font-medium transition cursor-pointer whitespace-nowrap"
                  title="กลับไปสัปดาห์ปัจจุบัน"
                >
                  ← สัปดาห์ปัจจุบัน
                </button>
              )}

              {/* ปุ่มเลื่อนสัปดาห์ถัดไป (ไม่ให้เลื่อนเกินสัปดาห์ปัจจุบัน) */}
              <button
                type="button"
                onClick={() => setWeekOffset((prev) => Math.min(0, prev + 1))}
                disabled={weekOffset >= 0}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-300 hover:text-white transition cursor-pointer text-sm disabled:opacity-30 disabled:pointer-events-none"
                title="สัปดาห์ถัดไป"
              >
                ▶
              </button>
            </div>
          </div>
          <div className="flex-1 w-full min-h-0">
            {weeklyData.length > 0 ? (
              <ResultChart data={weeklyData} />
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-500 text-sm">
                ไม่มีข้อมูลกราฟรายสัปดาห์
              </div>
            )}
          </div>
        </div>

        {/* Daily Table Section */}
        <div className="w-full bg-[#0b0a13]/70 backdrop-blur-xl border border-white/15 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] p-6">
          {/* Header & Controls Bar */}
          <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-white text-lg">
                  Inspection Report Table (Daily)
                </h2>
                <span className="text-[11px] font-medium bg-purple-500/15 text-purple-300 border border-purple-500/25 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 16 16">
                    <path d="M1.5 1.5A.5.5 0 0 1 2 1h12a.5.5 0 0 1 .38.82L9.5 7.7V13.5a.5.5 0 0 1-.76.42l-2-1.25A.5.5 0 0 1 6.5 12.25V7.7L1.62 1.82a.5.5 0 0 1-.12-.32z" />
                  </svg>
                  Excel Autofilter
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                คลิกปุ่ม <span className="text-purple-300 font-mono bg-white/10 px-1.5 py-0.2 rounded">▾</span> บนหัวคอลัมน์ (Yield, Line, Date, Model) เพื่อกรองข้อมูลแบบ Excel
              </p>
            </div>

            {/* Quick Active Filter Badges & Pagination Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Active Filter Badges */}
              {selectedYield !== "ALL" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-600/30 text-purple-200 border border-purple-500/40 shadow-sm">
                  <span>Yield: {selectedYield}%</span>
                  <button
                    type="button"
                    onClick={() => setSelectedYield("ALL")}
                    className="hover:text-white cursor-pointer ml-0.5"
                    title="ล้างตัวกรอง Yield"
                  >
                    ✕
                  </button>
                </span>
              )}

              {selectedLine !== "ALL" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-600/30 text-indigo-200 border border-indigo-500/40 shadow-sm">
                  <span>Line: {selectedLine}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedLine("ALL")}
                    className="hover:text-white cursor-pointer ml-0.5"
                    title="ล้างตัวกรอง Line"
                  >
                    ✕
                  </button>
                </span>
              )}

              {selectedDate && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600/30 text-emerald-200 border border-emerald-500/40 shadow-sm">
                  <span>Date: {selectedDate}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedDate("")}
                    className="hover:text-white cursor-pointer ml-0.5"
                    title="ล้างตัวกรอง Date"
                  >
                    ✕
                  </button>
                </span>
              )}

              {searchTerm && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-600/30 text-blue-200 border border-blue-500/40 shadow-sm">
                  <span className="truncate max-w-[120px]">ค้นหา: {searchTerm}</span>
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="hover:text-white cursor-pointer ml-0.5"
                    title="ล้างการค้นหา"
                  >
                    ✕
                  </button>
                </span>
              )}

              {/* ปุ่มล้างตัวกรองทั้งหมด */}
              {(searchTerm || selectedLine !== "ALL" || selectedDate || selectedYield !== "ALL") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedLine("ALL");
                    setSelectedDate("");
                    setSelectedYield("ALL");
                  }}
                  className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 rounded-lg text-xs transition cursor-pointer font-medium"
                >
                  ล้างตัวกรองทั้งหมด
                </button>
              )}

              {/* เลือกจำนวนแถวต่อหน้า */}
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1 bg-neutral-900/90 border border-white/15 rounded-lg text-xs text-zinc-300 focus:outline-none focus:border-purple-500 cursor-pointer"
                title="จำนวนรายการต่อหน้า"
              >
                <option value={15}>15 แถว/หน้า</option>
                <option value={25}>25 แถว/หน้า</option>
                <option value={50}>50 แถว/หน้า</option>
                <option value={100}>100 แถว/หน้า</option>
                <option value={500}>500 แถว/หน้า</option>
              </select>

              {/* สรุปจำนวนรายการ */}
              <span className="text-xs text-zinc-400 font-mono">
                ({filteredReports.length.toLocaleString()} รายการ)
              </span>
            </div>
          </div>

          {/* Backdrop สำหรับปิด Dropdown เมื่อคลิกข้างนอก */}
          {openFilterCol && (
            <div
              className="fixed inset-0 z-20 cursor-default"
              onClick={() => setOpenFilterCol(null)}
            />
          )}

          {/* Table Container */}
          <div className="w-full min-h-[500px] max-h-[540px] overflow-auto rounded-xl border border-white/10 bg-black/40 shadow-inner scrollbar-thin scrollbar-thumb-white/15">
            <table className="w-full table-fixed border-collapse text-xs text-center min-w-[1180px]">
              <thead className="sticky top-0 z-20 bg-[#12111d] text-slate-300 uppercase text-[11px] font-semibold tracking-wider border-b border-white/10">
                <tr>
                  <th className="w-12 px-1 py-2.5 text-center">No</th>

                  {/* DATE Column with Excel Filter */}
                  <th className={`w-28 px-2 py-2 text-center relative select-none ${openFilterCol === "date" ? "z-30" : ""}`}>
                    <div className="flex items-center justify-center gap-1">
                      <span>Date</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenFilterCol((prev) => (prev === "date" ? null : "date"));
                        }}
                        className={`w-5 h-5 flex items-center justify-center rounded transition-all cursor-pointer ${selectedDate
                          ? "bg-purple-600 text-white shadow-sm ring-1 ring-purple-400"
                          : "bg-white/10 hover:bg-white/20 text-zinc-400 hover:text-white"
                          }`}
                        title="Excel Filter: กรองตามวันที่ Date"
                      >
                        {selectedDate ? (
                          <svg className="w-3 h-3 fill-current" viewBox="0 0 16 16">
                            <path d="M1.5 1.5A.5.5 0 0 1 2 1h12a.5.5 0 0 1 .38.82L9.5 7.7V13.5a.5.5 0 0 1-.76.42l-2-1.25A.5.5 0 0 1 6.5 12.25V7.7L1.62 1.82a.5.5 0 0 1-.12-.32z" />
                          </svg>
                        ) : (
                          <svg className="w-3 h-3 fill-current" viewBox="0 0 12 12">
                            <path d="M3 4.5L6 7.5L9 4.5H3Z" />
                          </svg>
                        )}
                      </button>
                    </div>

                    {/* Popover Menu Date */}
                    {openFilterCol === "date" && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute top-full left-0 mt-1.5 w-52 bg-[#181628] border border-white/20 rounded-xl shadow-[0_16px_48px_rgba(0,0,0,0.9)] z-50 p-2.5 text-left font-sans normal-case backdrop-blur-xl"
                      >
                        <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-white/10">
                          <span className="text-[11px] font-bold text-zinc-200 flex items-center gap-1">
                            <svg className="w-3 h-3 text-purple-400" viewBox="0 0 16 16" fill="currentColor">
                              <path d="M1.5 1.5A.5.5 0 0 1 2 1h12a.5.5 0 0 1 .38.82L9.5 7.7V13.5a.5.5 0 0 1-.76.42l-2-1.25A.5.5 0 0 1 6.5 12.25V7.7L1.62 1.82a.5.5 0 0 1-.12-.32z" />
                            </svg>
                            Filter: Date
                          </span>
                          {selectedDate && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDate("");
                                setOpenFilterCol(null);
                              }}
                              className="text-[10px] text-rose-400 hover:text-rose-300 font-medium cursor-pointer"
                            >
                              ล้าง
                            </button>
                          )}
                        </div>
                        <div className="space-y-2">
                          <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-neutral-900 border border-white/15 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                          />
                          <div className="flex items-center justify-between pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDate("");
                                setOpenFilterCol(null);
                              }}
                              className="text-[11px] text-zinc-400 hover:text-white px-2 py-1 rounded bg-white/5 cursor-pointer"
                            >
                              ดูทุกวัน
                            </button>
                            <button
                              type="button"
                              onClick={() => setOpenFilterCol(null)}
                              className="text-[11px] text-white font-medium px-3 py-1 rounded bg-purple-600 hover:bg-purple-500 cursor-pointer"
                            >
                              ตกลง
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </th>

                  {/* LINE Column with Excel Filter */}
                  <th className={`w-20 px-2 py-2 text-center relative select-none ${openFilterCol === "line" ? "z-30" : ""}`}>
                    <div className="flex items-center justify-center gap-1">
                      <span>Line</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenFilterCol((prev) => (prev === "line" ? null : "line"));
                        }}
                        className={`w-5 h-5 flex items-center justify-center rounded transition-all cursor-pointer ${selectedLine !== "ALL"
                          ? "bg-purple-600 text-white shadow-sm ring-1 ring-purple-400"
                          : "bg-white/10 hover:bg-white/20 text-zinc-400 hover:text-white"
                          }`}
                        title="Excel Filter: กรอง Line"
                      >
                        {selectedLine !== "ALL" ? (
                          <svg className="w-3 h-3 fill-current" viewBox="0 0 16 16">
                            <path d="M1.5 1.5A.5.5 0 0 1 2 1h12a.5.5 0 0 1 .38.82L9.5 7.7V13.5a.5.5 0 0 1-.76.42l-2-1.25A.5.5 0 0 1 6.5 12.25V7.7L1.62 1.82a.5.5 0 0 1-.12-.32z" />
                          </svg>
                        ) : (
                          <svg className="w-3 h-3 fill-current" viewBox="0 0 12 12">
                            <path d="M3 4.5L6 7.5L9 4.5H3Z" />
                          </svg>
                        )}
                      </button>
                    </div>

                    {/* Popover Menu Line */}
                    {openFilterCol === "line" && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute top-full left-0 mt-1.5 w-44 bg-[#181628] border border-white/20 rounded-xl shadow-[0_16px_48px_rgba(0,0,0,0.9)] z-50 p-2 text-left font-sans normal-case backdrop-blur-xl"
                      >
                        <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/10">
                          <span className="text-[11px] font-bold text-zinc-200 flex items-center gap-1">
                            <svg className="w-3 h-3 text-purple-400" viewBox="0 0 16 16" fill="currentColor">
                              <path d="M1.5 1.5A.5.5 0 0 1 2 1h12a.5.5 0 0 1 .38.82L9.5 7.7V13.5a.5.5 0 0 1-.76.42l-2-1.25A.5.5 0 0 1 6.5 12.25V7.7L1.62 1.82a.5.5 0 0 1-.12-.32z" />
                            </svg>
                            Filter: Line
                          </span>
                          {selectedLine !== "ALL" && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedLine("ALL");
                                setOpenFilterCol(null);
                              }}
                              className="text-[10px] text-rose-400 hover:text-rose-300 font-medium cursor-pointer"
                            >
                              ล้าง
                            </button>
                          )}
                        </div>
                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLine("ALL");
                              setOpenFilterCol(null);
                            }}
                            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer ${selectedLine === "ALL"
                              ? "bg-purple-600/30 text-purple-200 font-semibold border border-purple-500/40"
                              : "text-zinc-300 hover:bg-white/5 hover:text-white"
                              }`}
                          >
                            <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[10px] ${selectedLine === "ALL" ? "border-purple-400 bg-purple-600 text-white" : "border-zinc-500"
                              }`}>
                              {selectedLine === "ALL" && "✓"}
                            </span>
                            <span>(เลือกทั้งหมด) All Line</span>
                          </button>
                          {availableLines.map((line) => (
                            <button
                              key={line}
                              type="button"
                              onClick={() => {
                                setSelectedLine(line);
                                setOpenFilterCol(null);
                              }}
                              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer ${selectedLine === line
                                ? "bg-purple-600/30 text-purple-200 font-semibold border border-purple-500/40"
                                : "text-zinc-300 hover:bg-white/5 hover:text-white"
                                }`}
                            >
                              <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[10px] ${selectedLine === line ? "border-purple-400 bg-purple-600 text-white" : "border-zinc-500"
                                }`}>
                                {selectedLine === line && "✓"}
                              </span>
                              <span>Line {line}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </th>

                  {/* MODEL SUFFIX Column */}
                  <th className="w-52 px-3 py-2.5 text-left">Model Suffix</th>

                  {/* PRODUCT NO. Column with Excel Filter */}
                  <th className={`w-36 px-2 py-2 text-center relative select-none ${openFilterCol === "product" ? "z-30" : ""}`}>
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Product No.</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenFilterCol((prev) => (prev === "product" ? null : "product"));
                        }}
                        className={`w-5 h-5 flex items-center justify-center rounded transition-all cursor-pointer ${searchTerm
                          ? "bg-purple-600 text-white shadow-sm ring-1 ring-purple-400"
                          : "bg-white/10 hover:bg-white/20 text-zinc-400 hover:text-white"
                          }`}
                        title="Excel Filter: ค้นหา Product No."
                      >
                        {searchTerm ? (
                          <svg className="w-3 h-3 fill-current text-white" viewBox="0 0 16 16">
                            <path d="M1.5 1.5A.5.5 0 0 1 2 1h12a.5.5 0 0 1 .38.82L9.5 7.7V13.5a.5.5 0 0 1-.76.42l-2-1.25A.5.5 0 0 1 6.5 12.25V7.7L1.62 1.82a.5.5 0 0 1-.12-.32z" />
                          </svg>
                        ) : (
                          <svg className="w-3 h-3 fill-current" viewBox="0 0 12 12">
                            <path d="M3 4.5L6 7.5L9 4.5H3Z" />
                          </svg>
                        )}
                      </button>
                    </div>

                    {/* Popover Menu Product No */}
                    {openFilterCol === "product" && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 w-64 bg-[#181628] border border-white/20 rounded-xl shadow-[0_16px_48px_rgba(0,0,0,0.9)] z-50 p-2.5 text-left font-sans normal-case backdrop-blur-xl"
                      >
                        <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-white/10">
                          <span className="text-[11px] font-bold text-zinc-200 flex items-center gap-1">
                            <svg className="w-3 h-3 text-purple-400" viewBox="0 0 16 16" fill="currentColor">
                              <path d="M1.5 1.5A.5.5 0 0 1 2 1h12a.5.5 0 0 1 .38.82L9.5 7.7V13.5a.5.5 0 0 1-.76.42l-2-1.25A.5.5 0 0 1 6.5 12.25V7.7L1.62 1.82a.5.5 0 0 1-.12-.32z" />
                            </svg>
                            Filter: Product No.
                          </span>
                          {searchTerm && (
                            <button
                              type="button"
                              onClick={() => {
                                setSearchTerm("");
                                setOpenFilterCol(null);
                              }}
                              className="text-[10px] text-rose-400 hover:text-rose-300 font-medium cursor-pointer"
                            >
                              ล้าง
                            </button>
                          )}
                        </div>
                        <div className="space-y-2">
                          <input
                            type="text"
                            placeholder="พิมพ์ Product No..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                            className="w-full px-2.5 py-1.5 bg-neutral-900 border border-white/15 rounded-lg text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-purple-500"
                          />

                          {/* รายการ Product No แบบ Excel Checklist */}
                          <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                            <button
                              type="button"
                              onClick={() => {
                                setSearchTerm("");
                                setOpenFilterCol(null);
                              }}
                              className={`w-full flex items-center gap-2 px-2 py-1 rounded text-[11px] transition cursor-pointer ${!searchTerm
                                ? "bg-purple-600/30 text-purple-200 font-semibold border border-purple-500/40"
                                : "text-zinc-300 hover:bg-white/5 hover:text-white"
                                }`}
                            >
                              <span className={`w-3 h-3 rounded-full border flex items-center justify-center text-[9px] ${!searchTerm ? "border-purple-400 bg-purple-600 text-white" : "border-zinc-500"
                                }`}>
                                {!searchTerm && "✓"}
                              </span>
                              <span>(เลือกทั้งหมด) All</span>
                            </button>
                            {availableProducts
                              .filter((pn) => !searchTerm || pn.toLowerCase().includes(searchTerm.toLowerCase()))
                              .map((pn) => (
                                <button
                                  key={pn}
                                  type="button"
                                  onClick={() => {
                                    setSearchTerm(pn);
                                    setOpenFilterCol(null);
                                  }}
                                  className={`w-full flex items-center gap-2 px-2 py-1 rounded text-[11px] transition cursor-pointer text-left ${searchTerm === pn
                                    ? "bg-purple-600/30 text-purple-200 font-semibold border border-purple-500/40"
                                    : "text-zinc-300 hover:bg-white/5 hover:text-white"
                                    }`}
                                >
                                  <span className={`w-3 h-3 rounded-full border flex items-center justify-center text-[9px] shrink-0 ${searchTerm === pn ? "border-purple-400 bg-purple-600 text-white" : "border-zinc-500"
                                    }`}>
                                    {searchTerm === pn && "✓"}
                                  </span>
                                  <span className="truncate">{pn}</span>
                                </button>
                              ))}
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-white/10">
                            <button
                              type="button"
                              onClick={() => {
                                setSearchTerm("");
                                setOpenFilterCol(null);
                              }}
                              className="text-[11px] text-zinc-400 hover:text-white px-2 py-1 rounded bg-white/5 cursor-pointer"
                            >
                              ล้างค้นหา
                            </button>
                            <button
                              type="button"
                              onClick={() => setOpenFilterCol(null)}
                              className="text-[11px] text-white font-medium px-3 py-1 rounded bg-purple-600 hover:bg-purple-500 cursor-pointer"
                            >
                              ตกลง
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </th>
                  <th className="w-16 px-2 py-2.5 text-center">Color</th>
                  <th className="w-20 px-2.5 py-2.5 text-right">Total</th>
                  <th className="w-20 px-2.5 py-2.5 text-right">Passed</th>
                  <th className="w-20 px-2.5 py-2.5 text-right">Reject</th>

                  {/* YIELD Column with Excel Filter */}
                  <th className={`w-28 px-2 py-2 text-center relative select-none ${openFilterCol === "yield" ? "z-30" : ""}`}>
                    <div className="flex items-center justify-center gap-1">
                      <span>Yield</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenFilterCol((prev) => (prev === "yield" ? null : "yield"));
                        }}
                        className={`w-5 h-5 flex items-center justify-center rounded transition-all cursor-pointer ${selectedYield !== "ALL"
                          ? "bg-purple-600 text-white shadow-sm ring-1 ring-purple-400"
                          : "bg-white/10 hover:bg-white/20 text-zinc-400 hover:text-white"
                          }`}
                        title="Excel Filter: กรองค่า Yield (<50, <70, <80, <90)"
                      >
                        {selectedYield !== "ALL" ? (
                          <svg className="w-3 h-3 fill-current text-white" viewBox="0 0 16 16">
                            <path d="M1.5 1.5A.5.5 0 0 1 2 1h12a.5.5 0 0 1 .38.82L9.5 7.7V13.5a.5.5 0 0 1-.76.42l-2-1.25A.5.5 0 0 1 6.5 12.25V7.7L1.62 1.82a.5.5 0 0 1-.12-.32z" />
                          </svg>
                        ) : (
                          <svg className="w-3 h-3 fill-current" viewBox="0 0 12 12">
                            <path d="M3 4.5L6 7.5L9 4.5H3Z" />
                          </svg>
                        )}
                      </button>
                    </div>

                    {/* Popover Menu Yield */}
                    {openFilterCol === "yield" && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute top-full right-0 mt-1.5 w-48 bg-[#181628] border border-white/20 rounded-xl shadow-[0_16px_48px_rgba(0,0,0,0.9)] z-50 p-2 text-left font-sans normal-case backdrop-blur-xl"
                      >
                        <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/10">
                          <span className="text-[11px] font-bold text-zinc-200 flex items-center gap-1">
                            <svg className="w-3 h-3 text-purple-400" viewBox="0 0 16 16" fill="currentColor">
                              <path d="M1.5 1.5A.5.5 0 0 1 2 1h12a.5.5 0 0 1 .38.82L9.5 7.7V13.5a.5.5 0 0 1-.76.42l-2-1.25A.5.5 0 0 1 6.5 12.25V7.7L1.62 1.82a.5.5 0 0 1-.12-.32z" />
                            </svg>
                            Filter: Yield
                          </span>
                          {selectedYield !== "ALL" && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedYield("ALL");
                                setOpenFilterCol(null);
                              }}
                              className="text-[10px] text-rose-400 hover:text-rose-300 font-medium cursor-pointer"
                            >
                              ล้าง
                            </button>
                          )}
                        </div>

                        <div className="space-y-1">
                          {(
                            [
                              { key: "ALL", label: "(เลือกทั้งหมด) All", badge: "" },
                              { key: "<50", label: "Yield < 50%", badge: "bg-rose-500/20 text-rose-400 border border-rose-500/30" },
                              { key: "<70", label: "Yield < 70%", badge: "bg-amber-500/20 text-amber-400 border border-amber-500/30" },
                              { key: "<80", label: "Yield < 80%", badge: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30" },
                              { key: "<90", label: "Yield < 90%", badge: "bg-purple-500/20 text-purple-300 border border-purple-500/30" },
                            ] as const
                          ).map((item) => (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() => {
                                setSelectedYield(item.key);
                                setOpenFilterCol(null);
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer ${selectedYield === item.key
                                ? "bg-purple-600/30 text-purple-200 font-semibold border border-purple-500/40"
                                : "text-zinc-300 hover:bg-white/5 hover:text-white"
                                }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[10px] ${selectedYield === item.key
                                  ? "border-purple-400 bg-purple-600 text-white"
                                  : "border-zinc-500"
                                  }`}>
                                  {selectedYield === item.key && "✓"}
                                </span>
                                <span>{item.label}</span>
                              </div>
                              {item.badge && (
                                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${item.badge}`}>
                                  {item.key}%
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </th>

                  <th className="w-20 px-2 py-2.5 text-center">Defect</th>
                  <th className="w-16 px-1 py-2.5 text-center">Cam</th>
                  <th className="w-28 px-2 py-2.5 text-center">Time</th>
                  <th className="w-20 px-2.5 py-2.5 text-center">Image</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono text-slate-300 text-xs">
                {isLoading ? (
                  <tr>
                    <td colSpan={14} className="py-12 text-center text-zinc-400 font-sans">
                      กำลังโหลดข้อมูลจากฐานข้อมูล...
                    </td>
                  </tr>
                ) : paginatedReports && paginatedReports.length > 0 ? (
                  paginatedReports.map((row, index) => {
                    const rowNumber = (currentPage - 1) * pageSize + index + 1;
                    const totalVal = Number(row.total) || 0;
                    const passedVal = Number(row.passed) || 0;
                    const yVal = totalVal > 0 ? (passedVal / totalVal) * 100 : 0;

                    // เงื่อนไขสี Yield: >80 ให้เขียว, >=75 ให้เหลือง, <=70 (และต่ำกว่า 75) ให้แดง
                    const yieldBadge =
                      yVal > 80
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                        : yVal >= 75
                          ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                          : "bg-rose-500/20 text-rose-400 border-rose-500/30";

                    return (
                      <tr
                        key={row.id || index}
                        className="h-10 hover:bg-white/[0.04] transition-colors duration-150"
                      >
                        <td className="w-12 px-1 py-2 text-slate-500 font-mono text-center truncate">
                          {rowNumber}
                        </td>
                        <td className="w-24 px-2 py-2 whitespace-nowrap text-center text-zinc-300 truncate">
                          {row.date}
                        </td>
                        <td className="w-16 px-2 py-2 whitespace-nowrap font-medium text-purple-300 text-center truncate">
                          {row.line || "-"}
                        </td>
                        <td
                          className="w-56 px-3 py-2 font-sans whitespace-nowrap text-left text-white truncate"
                          title={row.model_suffix}
                        >
                          {row.model_suffix}
                        </td>
                        <td className="w-32 px-2 py-2 whitespace-nowrap text-center text-zinc-300 font-mono truncate">
                          {row.product_number}
                        </td>
                        <td className="w-16 px-2 py-2 font-sans whitespace-nowrap text-center truncate">
                          <span className="inline-block px-1.5 py-0.5 rounded bg-white/10 text-zinc-300 text-[11px] font-mono">
                            {row.color}
                          </span>
                        </td>
                        <td className="w-20 px-2.5 py-2 font-bold text-white whitespace-nowrap text-right truncate">
                          {row.total?.toLocaleString()}
                        </td>
                        <td className="w-20 px-2.5 py-2 text-emerald-400 font-bold whitespace-nowrap text-right truncate">
                          {row.passed?.toLocaleString()}
                        </td>
                        <td className="w-20 px-2.5 py-2 text-rose-400 font-bold whitespace-nowrap text-right truncate">
                          {row.reject?.toLocaleString()}
                        </td>
                        <td className="w-24 px-2.5 py-2 font-sans whitespace-nowrap text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border ${yieldBadge}`}
                          >
                            {yVal.toFixed(2)}%
                          </span>
                        </td>
                        <td className="w-20 px-2 py-2 text-amber-400 whitespace-nowrap text-center font-semibold truncate">
                          {row.actual_defect ?? 0}
                        </td>
                        <td className="w-16 px-1 py-2 font-sans whitespace-nowrap text-zinc-400 text-center text-[11px] truncate">
                          {row.camera}
                        </td>
                        <td className="w-28 px-2 py-2 text-slate-400 whitespace-nowrap text-center text-[11px] truncate">
                          {row.time_of_detection}
                        </td>
                        <td className="w-20 px-2.5 py-2 font-sans whitespace-nowrap text-center">
                          {row.attached_image && row.attached_image !== "-" ? (
                            <button
                              type="button"
                              onClick={() => setPreviewImage(row.attached_image || null)}
                              className="px-2 py-0.5 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 text-[11px] font-sans transition cursor-pointer inline-flex items-center gap-1"
                              title="คลิกเพื่อดูรูปภาพหรือรายละเอียด"
                            >
                              <span>🖼️ ดูรูป</span>
                            </button>
                          ) : (
                            <span className="text-zinc-600">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={14} className="py-12 text-center text-zinc-500 font-sans">
                      ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {filteredReports.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-3 border-t border-white/10 text-xs text-zinc-400">
              <div>
                แสดง{" "}
                <span className="text-white font-medium">
                  {(currentPage - 1) * pageSize + 1}
                </span>{" "}
                -{" "}
                <span className="text-white font-medium">
                  {Math.min(currentPage * pageSize, filteredReports.length)}
                </span>{" "}
                จากทั้งหมด{" "}
                <span className="text-white font-medium">
                  {filteredReports.length.toLocaleString()}
                </span>{" "}
                รายการ
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage <= 1}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer text-zinc-300 hover:text-white"
                >
                  « หน้าแรก
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer text-zinc-300 hover:text-white"
                >
                  ‹ ก่อนหน้า
                </button>

                <span className="px-3 py-1 bg-purple-600/20 border border-purple-500/30 rounded-lg text-white font-medium">
                  หน้า {currentPage} / {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer text-zinc-300 hover:text-white"
                >
                  ถัดไป ›
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage >= totalPages}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer text-zinc-300 hover:text-white"
                >
                  หน้าสุดท้าย »
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal: Attached Image Preview */}
        {previewImage && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
            onClick={() => setPreviewImage(null)}
          >
            <div
              className="relative max-w-2xl w-full bg-neutral-900 border border-white/20 rounded-2xl p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>🖼️</span> รายละเอียด Attached Image
                </h3>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white flex items-center justify-center transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="flex flex-col items-center justify-center p-6 bg-black/50 border border-white/10 rounded-xl min-h-[220px]">
                {previewImage.startsWith("http://") || previewImage.startsWith("https://") ? (
                  <img
                    src={previewImage}
                    alt="Inspection defect preview"
                    className="max-h-[400px] w-auto rounded-lg object-contain"
                  />
                ) : (
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto text-2xl">
                      📁
                    </div>
                    <p className="text-sm text-zinc-300 font-mono break-all max-w-md">
                      {previewImage}
                    </p>
                    <p className="text-xs text-zinc-500">
                      ชื่อไฟล์รูปภาพที่ตรวจพบจากระบบ Vision Camera
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-4">
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-medium transition cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
