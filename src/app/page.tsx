// src/app/page.tsx
import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  MapPin,
  Navigation,
  Route,
  Upload,
  Users,
} from "lucide-react";
import { buttonClasses } from "@/components/ui/button";

const features = [
  {
    icon: Upload,
    title: "อัพโหลดรายชื่อบ้าน",
    description:
      "นำเข้าบ้านหลายร้อยหลังจากไฟล์ CSV ได้ในไม่กี่วินาที รองรับหัวคอลัมน์ภาษาไทย",
  },
  {
    icon: Route,
    title: "จัดลำดับเส้นทางอัตโนมัติ",
    description:
      "คำนวณระยะทางจริงและเรียงลำดับจุดส่งให้สั้นที่สุด ช่วยประหยัดเวลาและน้ำมัน",
  },
  {
    icon: Navigation,
    title: "นำทางทีละหลัง",
    description:
      "กดปุ่มเดียวเปิด Google Maps นำทางไปยังบ้านถัดไป พร้อมส่งเส้นทางรวมสูงสุด 20 จุด",
  },
] as const;

const steps = [
  {
    title: "นำเข้ารายชื่อบ้าน",
    description: "เพิ่มด้วยฟอร์ม หรืออัพโหลด CSV ของพื้นที่ อ.วังเจ้า จ.ตาก",
  },
  {
    title: "จัดคิวและเรียงเส้นทาง",
    description: "ดึงบ้านเข้าคิวงานวันนี้ แล้วให้ระบบเรียงตามระยะทางจากจุดเริ่มต้น",
  },
  {
    title: "ออกเดินทางและรายงานผล",
    description: "นำทางด้วย Google Maps กดส่งแล้ว หรือรายงานปัญหาได้ทันที",
  },
] as const;

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="border-b border-slate-200 bg-linear-to-b from-white to-slate-50">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary-100 bg-primary-50 px-3.5 py-1.5 text-sm font-medium text-primary-700">
              <MapPin className="size-4" aria-hidden="true" />
              สำหรับไรเดอร์และธุรกิจขนส่งใน อ.วังเจ้า จ.ตาก
            </span>
            <h1 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
              จัดเส้นทางส่งของ
              <br />
              <span className="text-primary-600">ให้เสร็จไวขึ้นทุกวัน</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
              อัพโหลดรายชื่อบ้าน → จัดลำดับเส้นทางอัตโนมัติ → นำทางด้วย Google
              Maps ครบจบในที่เดียว ไม่ต้องเรียงมือให้เสียเวลา
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className={buttonClasses("primary", "lg", "w-full sm:w-auto")}
              >
                เริ่มใช้งานฟรี
                <ArrowRight className="size-5" aria-hidden="true" />
              </Link>
              <Link
                href="/login"
                className={buttonClasses("secondary", "lg", "w-full sm:w-auto")}
              >
                เข้าสู่ระบบ
              </Link>
            </div>

            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
              <li className="inline-flex items-center gap-1.5">
                <Users className="size-4 text-primary-500" aria-hidden="true" />
                ออกแบบมาเพื่อการใช้งานจริงของไรเดอร์
              </li>
              <li className="inline-flex items-center gap-1.5">
                <ClipboardList
                  className="size-4 text-primary-500"
                  aria-hidden="true"
                />
                จัดการคิวงานค้างข้ามวันได้
              </li>
            </ul>
          </div>

          {/* Illustration: stop list wireframe */}
          <div className="mx-auto w-full max-w-md" aria-hidden="true">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">
                  เส้นทางวันนี้
                </p>
                <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2.5 py-0.5 text-xs font-medium text-success-700">
                  <Navigation className="size-3.5" />
                  พร้อมนำทาง
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span
                      className={
                        i === 0
                          ? "size-3 shrink-0 rounded-full bg-success-500"
                          : "size-3 shrink-0 rounded-full bg-primary-300"
                      }
                    />
                    <div className="h-3 flex-1 rounded-full bg-slate-100" />
                    <div className="h-4 w-10 rounded-full bg-slate-100" />
                  </div>
                ))}
              </div>
              <div className="mt-5 flex gap-2">
                <div className="h-10 flex-1 rounded-lg bg-primary-600/90" />
                <div className="h-10 flex-1 rounded-lg bg-slate-100" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-20" id="features">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              ทำอะไรได้บ้างใน DropWay
            </h2>
            <p className="mt-3 text-slate-600">
              ฟีเจอร์หลักที่ช่วยให้การส่งของแต่ละวันเร็วขึ้น ผิดพลาดน้อยลง
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card transition-shadow hover:shadow-card-hover"
                >
                  <span className="flex size-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                    <Icon className="size-6" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-slate-200 bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              เริ่มใช้งานใน 3 ขั้นตอน
            </h2>
          </div>
          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map((step, index) => (
              <li
                key={step.title}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card"
              >
                <span className="flex size-9 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white">
                  {index + 1}
                </span>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">
                  {step.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-primary-700 px-6 py-12 text-center sm:px-12 sm:py-16">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              พร้อมเริ่มจัดเส้นทางแรกของคุณหรือยัง?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-primary-100">
              สมัครฟรี ใช้ได้ทันที นำเข้าบ้านชุดแรกแล้วออกเดินทางได้เลยวันนี้
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className={buttonClasses("inverse", "lg", "w-full sm:w-auto")}
              >
                สมัครสมาชิกฟรี
                <ArrowRight className="size-5" aria-hidden="true" />
              </Link>
              <Link
                href="/login"
                className={buttonClasses(
                  "ghost-inverse",
                  "lg",
                  "w-full sm:w-auto",
                )}
              >
                เข้าสู่ระบบ
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 text-center sm:px-6 lg:px-8">
          <span className="flex items-center gap-2 text-base font-bold text-slate-900">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary-600 text-white">
              <Route className="size-4" aria-hidden="true" />
            </span>
            DropWay
          </span>
          <p className="max-w-md text-sm text-slate-500">
            ระบบจัดเส้นทางส่งของสำหรับไรเดอร์และธุรกิจขนส่ง
            พื้นที่ให้บริการ อ.วังเจ้า จ.ตาก
          </p>
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} DropWay. สร้างขึ้นเพื่อไรเดอร์ไทย
          </p>
        </div>
      </footer>
    </div>
  );
}
