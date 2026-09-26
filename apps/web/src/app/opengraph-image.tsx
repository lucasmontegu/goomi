import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { getCopy } from "@/landing/i18n";

export const alt = getCopy().meta.ogAlt;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const root = process.cwd();
  const [extraBold, medium, balsamiq, wave, icon] = await Promise.all([
    readFile(join(root, "assets/og-fonts/PlusJakartaSans_800ExtraBold.ttf")),
    readFile(join(root, "assets/og-fonts/PlusJakartaSans_500Medium.ttf")),
    readFile(join(root, "assets/og-fonts/BalsamiqSans_700Bold.ttf")),
    readFile(join(root, "public/goomi/poses/wave.png"), "base64"),
    readFile(join(root, "public/goomi/app-icon.png"), "base64"),
  ]);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#FAFAF8", fontFamily: "Jakarta" }}>
        <div style={{ position: "absolute", right: -160, top: -120, width: 760, height: 760, borderRadius: 999, background: "#D9FF6B", opacity: 0.55 }} />
        <div style={{ position: "absolute", right: 120, bottom: -220, width: 420, height: 420, borderRadius: 999, background: "#C8B6FF", opacity: 0.45 }} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 0 64px 72px", width: 660 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <img src={`data:image/png;base64,${icon}`} width={64} height={64} style={{ borderRadius: 16 }} alt="" />
            <span style={{ fontSize: 42, fontWeight: 800, letterSpacing: -2, color: "#0F0F10" }}>goomi</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontFamily: "Balsamiq", fontSize: 30, color: "#5F6358", transform: "rotate(-2deg)", marginBottom: 14 }}>learn while you scroll</span>
            <span style={{ fontSize: 88, fontWeight: 800, lineHeight: 0.95, letterSpacing: -5, color: "#0F0F10" }}>Make your screen time</span>
            <span style={{ display: "flex", marginTop: 6 }}>
              <span
                style={{
                  fontSize: 88,
                  fontWeight: 800,
                  lineHeight: 1.05,
                  letterSpacing: -5,
                  color: "#0F0F10",
                  borderBottom: "14px solid #D9FF6B",
                  paddingBottom: 2,
                }}
              >
                add up.
              </span>
            </span>
          </div>
          <span style={{ fontSize: 28, fontWeight: 500, color: "#5F6358" }}>For iPhone · goomi.app</span>
        </div>
        <img
          src={`data:image/png;base64,${wave}`}
          width={560}
          height={560}
          style={{ position: "absolute", right: 10, bottom: 18 }}
          alt=""
        />
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Jakarta", data: extraBold, weight: 800, style: "normal" },
        { name: "Jakarta", data: medium, weight: 500, style: "normal" },
        { name: "Balsamiq", data: balsamiq, weight: 700, style: "normal" },
      ],
    },
  );
}
