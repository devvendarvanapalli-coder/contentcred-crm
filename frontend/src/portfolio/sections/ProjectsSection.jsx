import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import FadeIn from "../components/FadeIn";
import LiveProjectButton from "../components/LiveProjectButton";
import ContactButton from "../components/ContactButton";

const PROJECTS = [
  {
    num: "01",
    category: "Client",
    name: "Nextlevel Studio",
    col1: [
      "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055344_5eff02e0-87a5-41ce-b64f-eb08da8f33db.png&w=1280&q=85",
      "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055431_11d841fd-8b41-46a5-82e4-b04f2407a7d8.png&w=1280&q=85",
    ],
    col2: "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055451_e317bf2d-28d4-48cc-86b0-6f72f25b6327.png&w=1280&q=85",
  },
  {
    num: "02",
    category: "Personal",
    name: "Aura Brand Identity",
    col1: [
      "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055654_911201c5-36d9-4bc6-bac7-331adfce159f.png&w=1280&q=85",
      "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055723_5ceda0b8-d9c2-4665-b2e3-83ba19ba76d1.png&w=1280&q=85",
    ],
    col2: "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055753_adc5dcbd-a8e6-49c0-b43a-9b030d835cea.png&w=1280&q=85",
  },
  {
    num: "03",
    category: "Client",
    name: "Solaris Digital",
    col1: [
      "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055759_963cfb0b-4bd1-4b0f-9d0a-09bd6cf95b2f.png&w=1280&q=85",
      "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_060108_438f781a-9846-4dcc-89ab-c4e6cb830f5b.png&w=1280&q=85",
    ],
    col2: "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055818_9d062121-ad7e-46b9-999a-1a6a692ef1ee.png&w=1280&q=85",
  },
];

const WEBSITES = [
  { name: "Space Voyage", src: "https://motionsites.ai/assets/hero-space-voyage-preview-eECLH3Yc.gif" },
  { name: "Codenest", src: "https://motionsites.ai/assets/hero-codenest-preview-Cgppc2qV.gif" },
  { name: "Vex Ventures", src: "https://motionsites.ai/assets/hero-vex-ventures-preview-BczMFIiw.gif" },
  { name: "Stellar AI v2", src: "https://motionsites.ai/assets/hero-stellar-ai-v2-preview-DjvxjG3C.gif" },
  { name: "ASME", src: "https://motionsites.ai/assets/hero-asme-preview-B_nGDnTP.gif" },
  { name: "Transform Data", src: "https://motionsites.ai/assets/hero-transform-data-preview-Cx5OU29N.gif" },
  { name: "Vitara", src: "https://motionsites.ai/assets/hero-vitara-preview-Cjz2QYyU.gif" },
  { name: "Terra", src: "https://motionsites.ai/assets/hero-terra-preview-BFjrCr7T.gif" },
  { name: "Skyelite", src: "https://motionsites.ai/assets/hero-skyelite-preview-DHaZIgUv.gif" },
  { name: "Aethera", src: "https://motionsites.ai/assets/hero-aethera-preview-DknSlcTa.gif" },
  { name: "Design Pro", src: "https://motionsites.ai/assets/hero-designpro-preview-D8c5_een.gif" },
  { name: "Stellar AI", src: "https://motionsites.ai/assets/hero-stellar-ai-preview-D3HL6bw1.gif" },
  { name: "XPortfolio", src: "https://motionsites.ai/assets/hero-xportfolio-preview-D4A8maiC.gif" },
  { name: "Orbit Web3", src: "https://motionsites.ai/assets/hero-orbit-web3-preview-BXt4OttD.gif" },
  { name: "Nexora", src: "https://motionsites.ai/assets/hero-nexora-preview-cx5HmUgo.gif" },
  { name: "EVR Ventures", src: "https://motionsites.ai/assets/hero-evr-ventures-preview-DZxeVFEX.gif" },
  { name: "Planet Orbit", src: "https://motionsites.ai/assets/hero-planet-orbit-preview-DWAP8Z1P.gif" },
  { name: "New Era", src: "https://motionsites.ai/assets/hero-new-era-preview-CocuDUm9.gif" },
  { name: "Wealth", src: "https://motionsites.ai/assets/hero-wealth-preview-B70idl_u.gif" },
  { name: "Luminex", src: "https://motionsites.ai/assets/hero-luminex-preview-CxOP7ce6.gif" },
  { name: "Celestia", src: "https://motionsites.ai/assets/hero-celestia-preview-0yO3jXO8.gif" },
];

const TOTAL = PROJECTS.length;

function ProjectCard({ project, index, totalCards }) {
  const targetScale = 1 - (totalCards - 1 - index) * 0.03;
  const cardRef = useRef(null);
  const containerRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const scale = useTransform(scrollYProgress, [0, 1], [1, targetScale]);

  const borderR = "rounded-[40px] sm:rounded-[50px] md:rounded-[60px]";

  return (
    <div ref={containerRef} className="h-[85vh]">
      <motion.div
        ref={cardRef}
        style={{
          scale,
          top: `${96 + index * 28}px`,
          willChange: "transform",
          background: "#0C0C0C",
        }}
        className={`sticky ${borderR} border-2 border-[#D7E2EA] p-4 sm:p-6 md:p-8`}
      >
        <div className={`${borderR} p-4 sm:p-6 md:p-8`} style={{ background: "#0C0C0C" }}>
          {/* Top row */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-baseline gap-4 sm:gap-6">
              <span
                className="font-black leading-none"
                style={{ fontSize: "clamp(3rem, 10vw, 140px)", color: "#D7E2EA" }}
              >
                {project.num}
              </span>
              <div className="flex flex-col">
                <span
                  className="font-light uppercase tracking-widest"
                  style={{ color: "#D7E2EA", opacity: 0.5, fontSize: "clamp(0.7rem, 1.2vw, 1rem)" }}
                >
                  {project.category}
                </span>
                <span
                  className="font-medium uppercase"
                  style={{ color: "#D7E2EA", fontSize: "clamp(1rem, 2.2vw, 2rem)" }}
                >
                  {project.name}
                </span>
              </div>
            </div>
            <LiveProjectButton />
          </div>

          {/* Image grid */}
          <div className="flex gap-3 sm:gap-4">
            {/* Left col — 40% */}
            <div className="flex flex-col gap-3 sm:gap-4" style={{ flex: "0 0 40%" }}>
              <img
                src={project.col1[0]}
                alt=""
                className={`${borderR} w-full object-cover`}
                style={{ height: "clamp(130px, 16vw, 230px)" }}
              />
              <img
                src={project.col1[1]}
                alt=""
                className={`${borderR} w-full object-cover`}
                style={{ height: "clamp(160px, 22vw, 340px)" }}
              />
            </div>
            {/* Right col — 60% */}
            <div style={{ flex: "0 0 calc(60% - 12px)" }}>
              <img
                src={project.col2}
                alt=""
                className={`${borderR} w-full object-cover`}
                style={{ height: "100%" }}
              />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function ProjectsSection() {
  return (
    <section
      id="projects"
      className="rounded-t-[40px] sm:rounded-t-[50px] md:rounded-t-[60px] -mt-10 sm:-mt-12 md:-mt-14 relative z-10 px-5 sm:px-8 md:px-10 pt-20 sm:pt-24 md:pt-32 pb-20"
      style={{ background: "#0C0C0C" }}
    >
      <FadeIn delay={0} y={40}>
        <h2
          className="hero-heading font-black uppercase leading-none tracking-tight text-center mb-16 sm:mb-20 md:mb-24"
          style={{ fontSize: "clamp(3rem, 12vw, 160px)" }}
        >
          Project
        </h2>
      </FadeIn>

      {/* Stacking cards */}
      <div className="mb-20 sm:mb-28 md:mb-32">
        {PROJECTS.map((project, i) => (
          <ProjectCard key={project.num} project={project} index={i} totalCards={TOTAL} />
        ))}
      </div>

      {/* All websites grid */}
      <FadeIn delay={0} y={30}>
        <h3
          className="font-black uppercase text-center mb-10 sm:mb-14"
          style={{ color: "#D7E2EA", fontSize: "clamp(1.5rem, 5vw, 4rem)" }}
        >
          All Websites
        </h3>
      </FadeIn>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-7xl mx-auto">
        {WEBSITES.map((site, i) => (
          <FadeIn key={site.name} delay={(i % 3) * 0.1} y={30}>
            <div className="relative group overflow-hidden rounded-2xl">
              <img
                src={site.src}
                alt={site.name}
                loading="lazy"
                className="w-full object-cover"
                style={{ height: 260 }}
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                <span
                  className="font-medium uppercase tracking-wider text-white"
                  style={{ fontSize: "clamp(0.85rem, 1.2vw, 1rem)" }}
                >
                  {site.name}
                </span>
              </div>
            </div>
          </FadeIn>
        ))}
      </div>

      {/* Contact anchor */}
      <div id="contact" className="mt-20 sm:mt-28 md:mt-32 flex flex-col items-center gap-6 sm:gap-8">
        <FadeIn delay={0} y={30}>
          <h2
            className="hero-heading font-black uppercase leading-none tracking-tight text-center"
            style={{ fontSize: "clamp(2.5rem, 10vw, 120px)" }}
          >
            Let&apos;s Work
          </h2>
        </FadeIn>
        <FadeIn delay={0.15} y={20}>
          <p
            className="font-light uppercase tracking-wide text-center"
            style={{ color: "#D7E2EA", fontSize: "clamp(0.85rem, 1.4vw, 1.2rem)", opacity: 0.6 }}
          >
            Have a project in mind? Let&apos;s build something incredible together.
          </p>
        </FadeIn>
        <FadeIn delay={0.3} y={20}>
          <a href="mailto:jack@example.com" style={{ textDecoration: "none" }}>
            <ContactButton />
          </a>
        </FadeIn>
      </div>
    </section>
  );
}
