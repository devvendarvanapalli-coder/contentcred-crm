import { useEffect } from "react";
import HeroSection from "./sections/HeroSection";
import MarqueeSection from "./sections/MarqueeSection";
import AboutSection from "./sections/AboutSection";
import ServicesSection from "./sections/ServicesSection";
import ProjectsSection from "./sections/ProjectsSection";

export default function PortfolioPage() {
  useEffect(() => {
    const prev = document.title;
    document.title = "Jack -- 3D Creator";
    return () => { document.title = prev; };
  }, []);

  return (
    <div
      style={{
        background: "#0C0C0C",
        fontFamily: "'Kanit', sans-serif",
        overflowX: "clip",
        position: "relative",
      }}
    >
      <HeroSection />
      <MarqueeSection />
      <AboutSection />
      <ServicesSection />
      <ProjectsSection />
    </div>
  );
}
