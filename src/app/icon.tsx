import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1f7a4d",
          color: "#ffffff",
          fontSize: 300,
          fontWeight: 900,
          fontFamily: "sans-serif",
          borderRadius: 96,
        }}
      >
        G
      </div>
    ),
    size,
  );
}
