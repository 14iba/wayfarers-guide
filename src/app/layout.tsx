import type { Metadata, Viewport } from "next";
import { Alegreya, Courier_Prime, Uncial_Antiqua } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.css";
import "./globals.css";
import { AppRoot } from "@/components/AppRoot";

const display = Uncial_Antiqua({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
});

const body = Alegreya({
  variable: "--font-body",
  subsets: ["latin", "vietnamese"],
  style: ["normal", "italic"],
});

const ascii = Courier_Prime({
  variable: "--font-ascii",
  weight: ["400", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "A Wayfarer's Guide",
  description:
    "A tiny, whimsical map of where our friend group can eat well, wherever we wander.",
};

export const viewport: Viewport = {
  themeColor: "#E6D7AE",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="day"
      className={`${display.variable} ${body.variable} ${ascii.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        {/* Apply day/night before first paint so night mode doesn't flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var d=JSON.parse(localStorage.getItem("wayfarer:device")||"null")||JSON.parse(localStorage.getItem("wayfarer:v1")||"null");if(d&&d.night)document.documentElement.dataset.theme="night"}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full">
        <AppRoot>{children}</AppRoot>
      </body>
    </html>
  );
}
